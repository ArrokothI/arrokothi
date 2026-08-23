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
import { parsePairwiseJudgeOutput, parseSemanticJudgeOutput, type PairwiseJudgeOutput, type SemanticJudgeOutput } from "../evaluator-v2/index.ts";
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

// =====================================================================================
// Collection: Gemini GenerateContent Batch API state handling and response validation.
//
// The Batch API's documented state enum is BATCH_STATE_* (UNSPECIFIED/PENDING/RUNNING/
// SUCCEEDED/FAILED/CANCELLED/EXPIRED). An earlier version of this collector checked the
// unrelated JOB_STATE_* enum, which never matches — so a job would never be recognized as
// SUCCEEDED even after Google's API reported it, and would poll forever as "pending" (or, if a
// looser guard were used, mis-parse an in-progress job's absent responses as a genuine failure).
// This section is fixed against BATCH_STATE_* only; JOB_STATE_* aliases are not preserved since
// there is no evidence the current API version ever emits them.
//
// All functions below are pure (no filesystem/network access), so their exact behavior for every
// state and every malformed-response shape is directly unit-testable without mocking fetch.
// =====================================================================================

export type BatchStateClassification =
  | { kind: "pending"; state: string }
  | { kind: "succeeded"; state: string }
  | { kind: "terminal_failure"; state: string }
  | { kind: "unknown"; state: unknown };

/**
 * Classifies a Gemini Batch API `state` value. PENDING/RUNNING -> pending (no result parsing
 * yet, not a failure). SUCCEEDED -> succeeded (safe to proceed to collection). FAILED/CANCELLED/
 * EXPIRED -> terminal_failure (must STOP, never silently continue). Anything else — including
 * BATCH_STATE_UNSPECIFIED, `undefined`, `null`, or an unrecognized future value — is "unknown":
 * this NEVER counts as success, and the caller must not guess; it should fail safely rather than
 * silently treat an unrecognized state as either pending or done.
 */
export function classifyBatchState(state: unknown): BatchStateClassification {
  if (state === "BATCH_STATE_PENDING" || state === "BATCH_STATE_RUNNING") return { kind: "pending", state };
  if (state === "BATCH_STATE_SUCCEEDED") return { kind: "succeeded", state };
  if (state === "BATCH_STATE_FAILED" || state === "BATCH_STATE_CANCELLED" || state === "BATCH_STATE_EXPIRED") return { kind: "terminal_failure", state };
  return { kind: "unknown", state };
}

export interface BatchEnvelopeExpectation {
  batchJobId: string;
  expectedRequestCount: number;
}

/**
 * Validates the batch-level envelope of a SUCCEEDED status response before touching any
 * individual item: requestCount must match what was actually submitted for this job, and
 * pendingRequestCount must be exactly 0 (a SUCCEEDED state with pending items left would be a
 * self-contradictory response from the API and must not be trusted).
 */
export function validateBatchEnvelope(status: Record<string, any>, expectation: BatchEnvelopeExpectation): { requestCount: number; pendingRequestCount: number } {
  const batchStats = status.metadata?.batchStats ?? status.batchStats ?? {};
  const requestCount = Number(batchStats.requestCount);
  const pendingRequestCount = Number(batchStats.pendingRequestCount ?? 0);
  if (!Number.isFinite(requestCount) || requestCount !== expectation.expectedRequestCount) {
    throw new Error(`Judge batch ${expectation.batchJobId}: batchStats.requestCount ${String(batchStats.requestCount)} does not match the ${expectation.expectedRequestCount} requests actually submitted for this job.`);
  }
  if (pendingRequestCount !== 0) {
    throw new Error(`Judge batch ${expectation.batchJobId}: reported SUCCEEDED but batchStats.pendingRequestCount is ${pendingRequestCount}, not 0. Refusing to trust a self-contradictory status.`);
  }
  return { requestCount, pendingRequestCount };
}

export function extractInlineResponses(status: Record<string, any>): any[] {
  return status.dest?.inlinedResponses?.inlinedResponses
    ?? status.output?.inlinedResponses?.inlinedResponses
    ?? status.response?.output?.inlinedResponses?.inlinedResponses
    ?? [];
}

export interface ResolvedResponseKey {
  key: string;
  usedPositionalFallback: boolean;
}

/**
 * Resolves the request key for one inline response item. Google documents that inline responses
 * are returned in input order, so a positional fallback (using the job's request key at the same
 * index) is defensible when `metadata.key` is absent. But when `metadata.key` IS present, it must
 * agree with the expected positional key — a disagreement means either the API reordered
 * responses or something else is wrong, and the safe response is to STOP, never to silently
 * remap to whichever key the metadata claims.
 */
export function resolveResponseKey(item: Record<string, any>, index: number, jobRequestKeys: readonly string[]): ResolvedResponseKey {
  const positionalKey = jobRequestKeys[index];
  if (positionalKey === undefined) throw new Error(`Response index ${index} is out of range for this job's ${jobRequestKeys.length} submitted request keys.`);
  const metadataKey: string | undefined = item.metadata?.key;
  if (metadataKey === undefined || metadataKey === null || metadataKey === "") {
    return { key: positionalKey, usedPositionalFallback: true };
  }
  if (metadataKey !== positionalKey) {
    throw new Error(`Response at index ${index} has metadata.key "${metadataKey}" which disagrees with the expected positional key "${positionalKey}". Refusing to silently remap; response order may not match request order.`);
  }
  return { key: metadataKey, usedPositionalFallback: false };
}

/**
 * A narrow, explicit compatibility check for provider-reported model identity: exact match, or a
 * `models/` prefix, or a pinned NUMERIC version/build suffix (e.g. "gemini-3.5-flash-002" or
 * "gemini-3.5-flash-20250115") of the requested model. The suffix must be digits only —
 * "gemini-3.5-flash-lite" is a genuinely different model variant, not a version of
 * "gemini-3.5-flash", and must NOT be accepted as compatible. This is a compatibility allowance
 * for provider version-pinning conventions only, not a loosened identity check.
 */
export function isCompatibleModelIdentity(reported: string | undefined, requested: string): boolean {
  if (!reported) return false;
  const normalized = reported.startsWith("models/") ? reported.slice("models/".length) : reported;
  if (normalized === requested) return true;
  const suffix = normalized.startsWith(`${requested}-`) ? normalized.slice(requested.length + 1) : undefined;
  return suffix !== undefined && /^\d+$/.test(suffix);
}

export interface ValidatedResponseItem {
  key: string;
  kind: "semantic" | "pairwise";
  usedPositionalFallback: boolean;
  reportedModelVersion: string;
  usageMetadata: Record<string, unknown> | null;
  parsedOutput: SemanticJudgeOutput | PairwiseJudgeOutput;
}

/**
 * Validates and parses ONE inline response item against its matching frozen-plan request. Throws
 * on: item-level API error, empty/missing GenerateContentResponse, missing modelVersion,
 * incompatible model identity, empty output text, or a parse/completeness failure from
 * parseSemanticJudgeOutput()/parsePairwiseJudgeOutput() (which themselves already enforce exact
 * expected-requirement/criterion completeness — no duplicates, no unknowns, no missing entries).
 * Never repairs a malformed output; a bad response is a thrown error, not a silently-patched one.
 */
export function validateAndParseResponseItem(
  item: Record<string, any>,
  request: JudgeRequest,
  requestedJudgeModel: string,
  judgeCommonFields: { provider: string; requestedModel: string; temperature: number; timestamp: string; evaluatorGitCommit?: string },
  usedPositionalFallback: boolean,
): ValidatedResponseItem {
  if (item.error) {
    throw new Error(`Judge batch item ${request.key} returned an item-level API error: ${JSON.stringify(item.error)}`);
  }
  const response = item.response ?? item.output?.response;
  if (!response || typeof response !== "object") {
    throw new Error(`Judge batch item ${request.key} has no GenerateContentResponse.`);
  }
  const reportedModelVersion: string | undefined = response.modelVersion;
  if (!reportedModelVersion) {
    throw new Error(`Judge batch item ${request.key} response is missing modelVersion.`);
  }
  if (!isCompatibleModelIdentity(reportedModelVersion, requestedJudgeModel)) {
    throw new Error(`Judge batch item ${request.key} reported model "${reportedModelVersion}", incompatible with requested "${requestedJudgeModel}".`);
  }
  const text: string = (response.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text)
    .filter(Boolean)
    .join("")
    .trim();
  if (!text) {
    throw new Error(`Judge batch item ${request.key} returned empty output text.`);
  }

  const judge = { ...judgeCommonFields, providerReportedModel: reportedModelVersion };
  let parsedOutput: SemanticJudgeOutput | PairwiseJudgeOutput;
  if (request.kind === "semantic") {
    parsedOutput = parseSemanticJudgeOutput(text, judge, request.parse as any);
  } else {
    parsedOutput = parsePairwiseJudgeOutput(
      text,
      { ...judge, randomizationSeed: request.seed! },
      (request.parse as any).scenarioId,
      (request.parse as any).assignment,
      (request.parse as any).expectedCriteria,
      (request.parse as any).implementationAssignment,
    );
  }

  return {
    key: request.key,
    kind: request.kind,
    usedPositionalFallback,
    reportedModelVersion,
    usageMetadata: (response.usageMetadata as Record<string, unknown>) ?? null,
    parsedOutput,
  };
}
