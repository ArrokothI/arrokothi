// EVAL-HOTFIX-2026-08-23 (judge-run targeted retry, attempt 2): a DEDICATED submission/collection
// path for exactly the 11 request keys judge-batch/collection-attempt-3-offline-reparse-report.json
// found genuinely unrecoverable from the original batch (batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5).
// This script never calls the original full-batch submission path (judge-only.ts's submitBatches())
// and never touches the original plan.json/jobs.json — it has its own plan/jobs files under the
// same judge-batch/ directory (retry-attempt-2-plan.json / retry-attempt-2-jobs.json).
//
// Modes (mutually exclusive):
//   (no flag)        --build-retry-plan: build + write the offline retry plan from the frozen
//                     master plan.json. No network call.
//   --submit-retry    load the already-built retry plan from disk, re-validate it against the
//                     current master plan, and submit EXACTLY those 11 requests. Never
//                     regenerates the retry plan first (mirrors the master-plan submit fix).
//   --collect-retry   fetch each retry job's status once, validate + strictly parse all 11
//                     responses using the SAME normalization/parsing logic as the master
//                     collector. Writes a validation report only — does NOT write final
//                     semantic/pairwise/judge-metadata output (that "final materialization" step
//                     is explicitly deferred to a separate, later task).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JUDGE_MODEL, gitCommit, AGENT_ROOT, readJson, writeJson } from "./orchestration.ts";
import {
  BATCH_DIR, FREEZE_METADATA_PATH, JOBS_PATH, PLAN_PATH, classifyBatchState, expectationsFromFreezeMetadata,
  extractInlineResponses, loadFrozenJudgePlan, resolveResponseKey, sha256Hex, validateAndParseResponseItem, validateBatchEnvelope, validateFrozenJudgePlan,
  type FrozenJudgePlanMetadata, type JudgeBatchPlan,
} from "./judge-plan.ts";
import { APPROVED_RETRY_KEYS, buildRetryPlan, sha256HexOf, validateRetryPlan, type RetryPlan } from "./judge-retry-plan.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY is required");
if (process.env.BENCHMARK_JUDGE_MODEL?.trim() !== JUDGE_MODEL) throw new Error(`BENCHMARK_JUDGE_MODEL must be ${JUDGE_MODEL}`);
const submitRetry = process.argv.includes("--submit-retry");
const collectRetry = process.argv.includes("--collect-retry");
if (submitRetry && collectRetry) throw new Error("Use --submit-retry and --collect-retry in separate invocations");

const RETRY_PLAN_PATH = join(BATCH_DIR, "retry-attempt-2-plan.json");
const RETRY_JOBS_PATH = join(BATCH_DIR, "retry-attempt-2-jobs.json");
const RETRY_VALIDATION_REPORT_PATH = join(BATCH_DIR, "retry-attempt-2-validation-report.json");
const PARENT_BATCH_JOB_ID = "batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5";
const ORIGINAL_EVIDENCE_LOCATION = "benchmarks/results/v2-six-subject-run-1/judge-batch/collection-attempt-3-offline-reparse-report.json";

interface RetryBatchJob {
  batchJobId: string;
  requestedJudgeModel: string;
  submittedAt: string;
  requestKeys: string[];
  providerCreateResponse: unknown;
}

async function currentMasterPlanAndHash(): Promise<{ plan: JudgeBatchPlan; sha256: string; meta: FrozenJudgePlanMetadata }> {
  const meta = await readJson<FrozenJudgePlanMetadata>(FREEZE_METADATA_PATH);
  if (!meta) throw new Error(`Missing frozen plan provenance metadata at ${FREEZE_METADATA_PATH}`);
  const rawText = await readFile(PLAN_PATH, "utf8");
  const plan = validateFrozenJudgePlan(rawText, expectationsFromFreezeMetadata(meta));
  return { plan, sha256: sha256Hex(rawText), meta };
}

async function buildAndWriteRetryPlan(): Promise<RetryPlan> {
  const { plan, sha256 } = await currentMasterPlanAndHash();
  const retryPlan = buildRetryPlan({
    masterPlan: plan,
    masterPlanSha256: sha256,
    parentBatchJobId: PARENT_BATCH_JOB_ID,
    attemptNumber: 2,
    originalFailedEvidenceLocation: ORIGINAL_EVIDENCE_LOCATION,
  });
  validateRetryPlan(retryPlan, plan, { masterPlanSha256: sha256, requestedJudgeModel: JUDGE_MODEL, temperature: 0 });
  await writeJson(RETRY_PLAN_PATH, retryPlan);
  return retryPlan;
}

async function loadAndRevalidateRetryPlan(): Promise<RetryPlan> {
  const retryPlan = await readJson<RetryPlan>(RETRY_PLAN_PATH);
  if (!retryPlan) throw new Error(`Missing retry plan at ${RETRY_PLAN_PATH}. Run in build mode (no flag) first.`);
  const { plan, sha256 } = await currentMasterPlanAndHash();
  validateRetryPlan(retryPlan, plan, { masterPlanSha256: sha256, requestedJudgeModel: JUDGE_MODEL, temperature: 0 });
  return retryPlan;
}

async function geminiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey!, ...(init?.headers ?? {}) },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Gemini Batch API failed: ${response.status} ${body.slice(0, 1000)}`);
  return JSON.parse(body) as Record<string, any>;
}

async function submitTargetedRetry(retryPlan: RetryPlan): Promise<RetryBatchJob[]> {
  const existing = await readJson<{ jobs: RetryBatchJob[] }>(RETRY_JOBS_PATH);
  if (existing?.jobs.length) {
    throw new Error(`Retry attempt-2 jobs already recorded (${existing.jobs.length}); refusing non-idempotent resubmission.`);
  }
  const submittedAt = new Date().toISOString();
  const response = await geminiFetch(`models/${JUDGE_MODEL}:batchGenerateContent`, {
    method: "POST",
    body: JSON.stringify({
      batch: {
        display_name: "v2-six-subject-run-1-judge-retry-attempt-2",
        input_config: {
          requests: {
            requests: retryPlan.requests.map((request) => ({
              request: { contents: [{ role: "user", parts: [{ text: request.prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } },
              metadata: { key: request.key, promptVersion: request.promptVersion, seed: request.seed ?? "" },
            })),
          },
        },
      },
    }),
  });
  if (typeof response.name !== "string") throw new Error("Gemini Batch API create response omitted the batch job id");
  const job: RetryBatchJob = { batchJobId: response.name, requestedJudgeModel: JUDGE_MODEL, submittedAt, requestKeys: retryPlan.requests.map((r) => r.key), providerCreateResponse: response };
  // Single chunk expected (11 requests is far under the 8MB inline limit), but persist
  // immediately and support more than one job defensively, matching the master submitBatches()
  // partial-submission-safety pattern: if a second chunk's creation ever failed here, the first
  // job would already be persisted rather than lost.
  const jobs = [job];
  await writeJson(RETRY_JOBS_PATH, { schemaVersion: "v2-six-subject-judge-retry-jobs-v1", attemptNumber: 2, parentBatchJobId: PARENT_BATCH_JOB_ID, masterPlanSha256: retryPlan.masterPlanSha256, retryPlanSha256: sha256HexOf(retryPlan), jobs, updatedAt: new Date().toISOString() });
  return jobs;
}

async function collectTargetedRetryOnce(retryPlan: RetryPlan) {
  const stored = await readJson<{ jobs: RetryBatchJob[] }>(RETRY_JOBS_PATH);
  if (!stored?.jobs.length) throw new Error("No submitted retry batch jobs were recorded");
  const byKey = new Map(retryPlan.requests.map((request) => [request.key, request]));

  const results: Array<{ key: string; kind: "semantic" | "pairwise"; valid: boolean; error?: string; normalizationApplied?: boolean; normalizationSteps?: string[]; reportedModelVersion?: string }> = [];
  let pending = false;
  let pendingState: unknown;

  for (const job of stored.jobs) {
    const status = await geminiFetch(job.batchJobId);
    const state = status.metadata?.state ?? status.state;
    await writeJson(join(BATCH_DIR, `retry-attempt-2-${job.batchJobId.replaceAll("/", "_")}-status.json`), status);

    const classification = classifyBatchState(state);
    if (classification.kind === "pending") { pending = true; pendingState = state; continue; }
    if (classification.kind === "terminal_failure") throw new Error(`Retry batch ${job.batchJobId} ended in terminal failure state ${classification.state}.`);
    if (classification.kind === "unknown") throw new Error(`Retry batch ${job.batchJobId} returned an unrecognized/unspecified state (${JSON.stringify(classification.state)}); refusing to guess.`);

    validateBatchEnvelope(status, { batchJobId: job.batchJobId, expectedRequestCount: job.requestKeys.length });
    const responses = extractInlineResponses(status);
    if (responses.length !== job.requestKeys.length) throw new Error(`Retry batch ${job.batchJobId} returned ${responses.length}/${job.requestKeys.length} inline responses.`);

    const seenKeys = new Set<string>();
    for (let index = 0; index < responses.length; index++) {
      const item = responses[index];
      const resolved = resolveResponseKey(item, index, job.requestKeys);
      if (seenKeys.has(resolved.key)) throw new Error(`Retry batch ${job.batchJobId}: duplicate response key ${resolved.key}.`);
      seenKeys.add(resolved.key);
      const request = byKey.get(resolved.key);
      if (!request) throw new Error(`Retry batch ${job.batchJobId}: unknown response key ${resolved.key} is not part of the approved retry set.`);

      try {
        const validated = validateAndParseResponseItem(
          item, request, JUDGE_MODEL,
          { provider: "gemini", requestedModel: JUDGE_MODEL, temperature: 0, timestamp: new Date().toISOString(), evaluatorGitCommit: gitCommit(AGENT_ROOT) },
          resolved.usedPositionalFallback,
        );
        results.push({ key: resolved.key, kind: request.kind, valid: true, normalizationApplied: validated.normalizationApplied, normalizationSteps: validated.normalizationSteps, reportedModelVersion: validated.reportedModelVersion });
      } catch (error) {
        results.push({ key: resolved.key, kind: request.kind, valid: false, error: (error as Error).message });
      }
    }
    const missingKeys = job.requestKeys.filter((key) => !seenKeys.has(key));
    if (missingKeys.length) throw new Error(`Retry batch ${job.batchJobId}: missing response(s) for key(s): ${missingKeys.join(", ")}`);
  }

  if (pending) {
    const report = { schemaVersion: "v2-six-subject-judge-retry-validation-report-v1", attemptNumber: 2, status: "pending", observedState: pendingState, observedAt: new Date().toISOString() };
    await writeJson(RETRY_VALIDATION_REPORT_PATH, report);
    return report;
  }

  const semanticResults = results.filter((r) => r.kind === "semantic");
  const pairwiseResults = results.filter((r) => r.kind === "pairwise");
  const report = {
    schemaVersion: "v2-six-subject-judge-retry-validation-report-v1",
    attemptNumber: 2,
    status: "collected",
    observedAt: new Date().toISOString(),
    counts: {
      total: results.length,
      semanticTotal: semanticResults.length, semanticValid: semanticResults.filter((r) => r.valid).length,
      pairwiseTotal: pairwiseResults.length, pairwiseValid: pairwiseResults.filter((r) => r.valid).length,
    },
    stillInvalidKeys: results.filter((r) => !r.valid).map((r) => ({ key: r.key, error: r.error })),
    results,
    note: "This report validates and strictly parses all retry responses but does NOT write final semantic/, pairwise/, or judge-metadata/ output -- that final materialization is a separate, later step even if all 11 responses validate here.",
  };
  await writeJson(RETRY_VALIDATION_REPORT_PATH, report);
  return report;
}

if (submitRetry) {
  const retryPlan = await loadAndRevalidateRetryPlan();
  const jobs = await submitTargetedRetry(retryPlan);
  process.stdout.write(`${JSON.stringify({ status: "submitted", attemptNumber: 2, requests: retryPlan.requests.length, jobs: jobs.map((job) => job.batchJobId) }, null, 2)}\n`);
} else if (collectRetry) {
  const retryPlan = await loadAndRevalidateRetryPlan();
  const report = await collectTargetedRetryOnce(retryPlan);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  const retryPlan = await buildAndWriteRetryPlan();
  process.stdout.write(`${JSON.stringify({ status: "retry-plan-built", attemptNumber: 2, path: RETRY_PLAN_PATH, retryKeys: retryPlan.retryKeys, counts: retryPlan.retryCounts }, null, 2)}\n`);
}
