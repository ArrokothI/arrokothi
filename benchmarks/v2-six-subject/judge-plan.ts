// EVAL-HOTFIX-2026-08-23 (judge-run submission-infrastructure fix): the previous submit/collect
// paths always called preparePlan() before submitting or collecting, which rewrites plan.json's
// preparedAt/createdAt timestamps on every invocation — so a whole-file SHA-256 pinned at freeze
// time could never match again, even though every prompt/request byte was otherwise identical.
// This module separates "build a plan" from "load and verify an already-frozen plan," so submit
// and collect consume the exact frozen bytes on disk and never regenerate them.
//
// `validateFrozenJudgePlan` is pure (no filesystem/network access) so it can be unit-tested with
// in-memory strings and mocked expectations, with no live API calls anywhere in the failure path.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OUTPUT, readJson } from "./orchestration.ts";

export interface JudgeRequest {
  key: string;
  kind: "semantic" | "pairwise";
  id: string;
  prompt: string;
  promptVersion: string;
  seed?: string;
  createdAt: string;
  parse: Record<string, unknown>;
}

export interface JudgeBatchPlan {
  schemaVersion: string;
  experimentId: string;
  requestedJudgeModel: string;
  temperature: number;
  preparedAt: string;
  promptVersions: { semantic: string; pairwise: string };
  requests: JudgeRequest[];
}

export interface FrozenJudgePlanExpectations {
  sha256: string;
  schemaVersion: string;
  experimentId: string;
  requestedJudgeModel: string;
  temperature: number;
  totalRequests: number;
  semanticRequests: number;
  pairwiseRequests: number;
  promptVersions: { semantic: string; pairwise: string };
}

export interface FrozenJudgePlanMetadata {
  schemaVersion: string;
  experimentId: string;
  judgePlan: {
    path: string;
    sha256: string;
    requestCounts: { total: number; semantic: number; pairwise: number };
    judgeModel: string;
    temperature: number;
    promptVersions: { semantic: string; pairwise: string };
  };
}

export const BATCH_DIR = join(OUTPUT, "judge-batch");
export const PLAN_PATH = join(BATCH_DIR, "plan.json");
export const JOBS_PATH = join(BATCH_DIR, "jobs.json");
export const FREEZE_METADATA_PATH = join(BATCH_DIR, "judge-plan-freeze.v1.json");

export function sha256Hex(rawText: string): string {
  return createHash("sha256").update(rawText, "utf8").digest("hex");
}

export function expectationsFromFreezeMetadata(meta: FrozenJudgePlanMetadata): FrozenJudgePlanExpectations {
  return {
    sha256: meta.judgePlan.sha256,
    schemaVersion: "v2-six-subject-judge-batch-plan-v1",
    experimentId: meta.experimentId,
    requestedJudgeModel: meta.judgePlan.judgeModel,
    temperature: meta.judgePlan.temperature,
    totalRequests: meta.judgePlan.requestCounts.total,
    semanticRequests: meta.judgePlan.requestCounts.semantic,
    pairwiseRequests: meta.judgePlan.requestCounts.pairwise,
    promptVersions: meta.judgePlan.promptVersions,
  };
}

/**
 * Validates a raw plan.json text against frozen expectations. Pure — no I/O, no network. Throws
 * with a specific message per failed check; never returns a partially-valid plan.
 */
export function validateFrozenJudgePlan(rawText: string, expectations: FrozenJudgePlanExpectations): JudgeBatchPlan {
  const actualSha256 = sha256Hex(rawText);
  if (actualSha256 !== expectations.sha256) {
    throw new Error(`Frozen judge plan hash mismatch: expected ${expectations.sha256}, got ${actualSha256}. Refusing to submit/collect an unfrozen or drifted plan.`);
  }

  let plan: JudgeBatchPlan;
  try {
    plan = JSON.parse(rawText) as JudgeBatchPlan;
  } catch (error) {
    throw new Error(`Frozen judge plan is not valid JSON: ${(error as Error).message}`);
  }

  if (plan.schemaVersion !== expectations.schemaVersion) {
    throw new Error(`Frozen judge plan schemaVersion mismatch: expected ${expectations.schemaVersion}, got ${String(plan.schemaVersion)}`);
  }
  if (plan.experimentId !== expectations.experimentId) {
    throw new Error(`Frozen judge plan experimentId mismatch: expected ${expectations.experimentId}, got ${String(plan.experimentId)}`);
  }
  if (plan.requestedJudgeModel !== expectations.requestedJudgeModel) {
    throw new Error(`Frozen judge plan requestedJudgeModel mismatch: expected ${expectations.requestedJudgeModel}, got ${String(plan.requestedJudgeModel)}. Refusing to silently substitute a different judge model.`);
  }
  if (plan.temperature !== expectations.temperature) {
    throw new Error(`Frozen judge plan temperature mismatch: expected ${expectations.temperature}, got ${String(plan.temperature)}`);
  }
  if (!Array.isArray(plan.requests) || plan.requests.length !== expectations.totalRequests) {
    throw new Error(`Frozen judge plan total request count mismatch: expected ${expectations.totalRequests}, got ${Array.isArray(plan.requests) ? plan.requests.length : "not an array"}`);
  }

  const semanticCount = plan.requests.filter((request) => request.kind === "semantic").length;
  if (semanticCount !== expectations.semanticRequests) {
    throw new Error(`Frozen judge plan semantic request count mismatch: expected ${expectations.semanticRequests}, got ${semanticCount}`);
  }
  const pairwiseCount = plan.requests.filter((request) => request.kind === "pairwise").length;
  if (pairwiseCount !== expectations.pairwiseRequests) {
    throw new Error(`Frozen judge plan pairwise request count mismatch: expected ${expectations.pairwiseRequests}, got ${pairwiseCount}`);
  }

  const keys = plan.requests.map((request) => request.key);
  const uniqueKeys = new Set(keys);
  if (uniqueKeys.size !== keys.length) {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    }
    throw new Error(`Frozen judge plan contains ${keys.length - uniqueKeys.size} duplicate request key(s): ${[...duplicates].slice(0, 10).join(", ")}`);
  }

  if (plan.promptVersions?.semantic !== expectations.promptVersions.semantic) {
    throw new Error(`Frozen judge plan semantic prompt version mismatch: expected ${expectations.promptVersions.semantic}, got ${String(plan.promptVersions?.semantic)}`);
  }
  if (plan.promptVersions?.pairwise !== expectations.promptVersions.pairwise) {
    throw new Error(`Frozen judge plan pairwise prompt version mismatch: expected ${expectations.promptVersions.pairwise}, got ${String(plan.promptVersions?.pairwise)}`);
  }

  return plan;
}

/**
 * Loads plan.json from disk EXACTLY AS WRITTEN — never regenerates or rewrites it — and validates
 * it against the frozen expectations recorded in judge-plan-freeze.v1.json. Used by submit and
 * collect modes; prepare mode does not use this function.
 */
export async function loadFrozenJudgePlan(): Promise<JudgeBatchPlan> {
  const meta = await readJson<FrozenJudgePlanMetadata>(FREEZE_METADATA_PATH);
  if (!meta) throw new Error(`Missing frozen judge plan provenance metadata at ${FREEZE_METADATA_PATH}. Refusing to submit/collect without a recorded freeze to verify against.`);
  const rawText = await readFile(PLAN_PATH, "utf8");
  return validateFrozenJudgePlan(rawText, expectationsFromFreezeMetadata(meta));
}

/**
 * Pure idempotency guard: refuses to proceed if a prior submission already recorded jobs. Kept
 * separate from submitBatches()'s I/O so the guard condition itself is directly unit-testable
 * without touching disk or network.
 */
export function assertNoExistingJobs(existing: { jobs: unknown[] } | undefined): void {
  if (existing?.jobs.length) {
    throw new Error(`Batch jobs already recorded (${existing.jobs.length}); refusing non-idempotent resubmission.`);
  }
}
