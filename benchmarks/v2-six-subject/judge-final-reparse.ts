// FINAL OFFLINE PROTOCOL-NORMALIZATION AUDIT (2026-08-23): offline, read-only reparse of the
// COMPLETE judge evidence set (original 738-request batch + retry-attempt-2's 11-request batch)
// against the frozen, now-extended normalization stack in judge-plan.ts.
//
// This script makes ZERO network/API calls. It only reads already-committed evidence files and
// re-runs the same pure `validateAndParseResponseItem` used by the real collectors.
//
// Final-selection rule per request key (never content/score/verdict-based):
//   1. Use attempt 1 (the original batch response) if it validates after the approved
//      normalization stack.
//   2. Otherwise, IF this key was one of the 11 keys re-requested in retry attempt 2, use
//      attempt 2's response if IT validates after the SAME normalization stack.
//   3. Otherwise the key remains invalid.
// Neither original provider response is ever modified or overwritten by this script.
//
// If (and only if) all 738 keys select to a valid attempt, this script also writes a
// judge-selection/freeze provenance artifact (NOT aggregate scores) recording, per key: selected
// attempt number, selected batch job id, original provider response location, whether
// normalization applied, which normalization steps, provider-reported modelVersion,
// promptVersion, and the request key itself.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  extractInlineResponses,
  resolveResponseKey,
  validateAndParseResponseItem,
  type JudgeBatchPlan,
  type JudgeRequest,
} from "./judge-plan.ts";

const RESULTS = join(import.meta.dirname, "..", "results", "v2-six-subject-run-1");
const JUDGE_BATCH = join(RESULTS, "judge-batch");

const MASTER_PLAN_PATH = join(JUDGE_BATCH, "plan.json");
const MASTER_JOBS_PATH = join(JUDGE_BATCH, "jobs.json");
const MASTER_STATUS_PATH = join(JUDGE_BATCH, "batches_l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5-status.json");
const RETRY_PLAN_PATH = join(JUDGE_BATCH, "retry-attempt-2-plan.json");
const RETRY_JOBS_PATH = join(JUDGE_BATCH, "retry-attempt-2-jobs.json");
const RETRY_STATUS_PATH = join(JUDGE_BATCH, "retry-attempt-2-batches_0sd4bk4zmdisjxk8omdk1z9ca026jjbp2s8m-status.json");
const EXPECTED_MASTER_PLAN_SHA256 = "860d7f750b9855a904f602191daeb321d34f968620962e6541e2fd1dc7a7004a";
const OUTPUT_REPORT_PATH = join(JUDGE_BATCH, "judge-final-reparse-report.json");
const PROVENANCE_PATH = join(JUDGE_BATCH, "judge-selection-provenance.json");

interface AttemptOutcome {
  attempt: 1 | 2;
  batchJobId: string;
  providerResponseLocation: string;
  key: string;
  kind: "semantic" | "pairwise";
  valid: boolean;
  error?: string;
  normalizationApplied?: boolean;
  normalizationSteps?: string[];
  reportedModelVersion?: string;
  promptVersion?: string;
}

function tryValidate(
  item: Record<string, any>,
  request: JudgeRequest,
  requestedJudgeModel: string,
  judgeCommonFields: { provider: string; requestedModel: string; temperature: number; timestamp: string },
  usedPositionalFallback: boolean,
): { ok: true; result: ReturnType<typeof validateAndParseResponseItem> } | { ok: false; error: string } {
  try {
    const result = validateAndParseResponseItem(item, request, requestedJudgeModel, judgeCommonFields, usedPositionalFallback);
    return { ok: true, result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  // --- Step 1: load all evidence, read-only. Verify the master plan hash before trusting it. ---
  const masterPlanRaw = await readFile(MASTER_PLAN_PATH, "utf8");
  const masterPlanSha256 = createHash("sha256").update(masterPlanRaw).digest("hex");
  if (masterPlanSha256 !== EXPECTED_MASTER_PLAN_SHA256) {
    throw new Error(`Master plan.json SHA-256 mismatch: expected ${EXPECTED_MASTER_PLAN_SHA256}, got ${masterPlanSha256}. Refusing to reparse against a drifted plan.`);
  }
  const masterPlan: JudgeBatchPlan = JSON.parse(masterPlanRaw);
  const masterJobs = JSON.parse(await readFile(MASTER_JOBS_PATH, "utf8"));
  const masterStatus = JSON.parse(await readFile(MASTER_STATUS_PATH, "utf8"));
  const retryPlan: JudgeBatchPlan = JSON.parse(await readFile(RETRY_PLAN_PATH, "utf8"));
  const retryJobs = JSON.parse(await readFile(RETRY_JOBS_PATH, "utf8"));
  const retryStatus = JSON.parse(await readFile(RETRY_STATUS_PATH, "utf8"));

  const masterJob = masterJobs.jobs[0];
  const retryJob = retryJobs.jobs[0];
  const requestedJudgeModel: string = masterPlan.requestedJudgeModel;
  const judgeCommonFields = {
    provider: "gemini",
    requestedModel: requestedJudgeModel,
    temperature: masterPlan.temperature,
    timestamp: new Date().toISOString(), // not part of judged content; not compared
  };

  const masterRequestByKey = new Map<string, JudgeRequest>(masterPlan.requests.map((r) => [r.key, r]));
  const retryRequestByKey = new Map<string, JudgeRequest>(retryPlan.requests.map((r) => [r.key, r]));

  // --- Attempt 1: validate every one of the 738 master responses. ---
  const masterResponses = extractInlineResponses(masterStatus);
  const attempt1ByKey = new Map<string, AttemptOutcome>();
  for (let i = 0; i < masterResponses.length; i++) {
    const item = masterResponses[i];
    const resolved = resolveResponseKey(item, i, masterJob.requestKeys);
    const request = masterRequestByKey.get(resolved.key);
    if (!request) throw new Error(`Master response key "${resolved.key}" has no matching request in the frozen master plan.`);
    const outcome = tryValidate(item, request, requestedJudgeModel, judgeCommonFields, resolved.usedPositionalFallback);
    if (outcome.ok) {
      attempt1ByKey.set(resolved.key, {
        attempt: 1,
        batchJobId: masterJob.batchJobId,
        providerResponseLocation: MASTER_STATUS_PATH,
        key: resolved.key,
        kind: request.kind,
        valid: true,
        normalizationApplied: outcome.result.normalizationApplied,
        normalizationSteps: outcome.result.normalizationSteps,
        reportedModelVersion: outcome.result.reportedModelVersion,
        promptVersion: request.promptVersion,
      });
    } else {
      attempt1ByKey.set(resolved.key, {
        attempt: 1,
        batchJobId: masterJob.batchJobId,
        providerResponseLocation: MASTER_STATUS_PATH,
        key: resolved.key,
        kind: request.kind,
        valid: false,
        error: outcome.error,
      });
    }
  }
  if (attempt1ByKey.size !== 738) throw new Error(`Expected 738 attempt-1 responses, got ${attempt1ByKey.size}.`);
  if (masterPlan.requests.length !== 738) throw new Error(`Expected 738 master plan requests, got ${masterPlan.requests.length}.`);

  // --- Attempt 2: validate every one of the 11 retry responses. ---
  const retryResponses = extractInlineResponses(retryStatus);
  const attempt2ByKey = new Map<string, AttemptOutcome>();
  for (let i = 0; i < retryResponses.length; i++) {
    const item = retryResponses[i];
    const resolved = resolveResponseKey(item, i, retryJob.requestKeys);
    const request = retryRequestByKey.get(resolved.key);
    if (!request) throw new Error(`Retry response key "${resolved.key}" has no matching request in the retry plan.`);
    const outcome = tryValidate(item, request, requestedJudgeModel, judgeCommonFields, resolved.usedPositionalFallback);
    if (outcome.ok) {
      attempt2ByKey.set(resolved.key, {
        attempt: 2,
        batchJobId: retryJob.batchJobId,
        providerResponseLocation: RETRY_STATUS_PATH,
        key: resolved.key,
        kind: request.kind,
        valid: true,
        normalizationApplied: outcome.result.normalizationApplied,
        normalizationSteps: outcome.result.normalizationSteps,
        reportedModelVersion: outcome.result.reportedModelVersion,
        promptVersion: request.promptVersion,
      });
    } else {
      attempt2ByKey.set(resolved.key, {
        attempt: 2,
        batchJobId: retryJob.batchJobId,
        providerResponseLocation: RETRY_STATUS_PATH,
        key: resolved.key,
        kind: request.kind,
        valid: false,
        error: outcome.error,
      });
    }
  }
  if (attempt2ByKey.size !== 11) throw new Error(`Expected 11 attempt-2 responses, got ${attempt2ByKey.size}.`);

  // --- Final-selection rule: attempt 1 if valid, else attempt 2 if valid (and only if retried), else invalid. Never content-based. ---
  const selections: AttemptOutcome[] = [];
  const stillInvalid: { key: string; kind: string; attempt1Error?: string; attempt2Error?: string }[] = [];
  for (const key of masterRequestByKey.keys()) {
    const a1 = attempt1ByKey.get(key)!;
    if (a1.valid) {
      selections.push(a1);
      continue;
    }
    const a2 = attempt2ByKey.get(key);
    if (a2 && a2.valid) {
      selections.push(a2);
      continue;
    }
    stillInvalid.push({ key, kind: a1.kind, attempt1Error: a1.error, attempt2Error: a2?.error });
  }

  const attempt1SelectedCount = selections.filter((s) => s.attempt === 1).length;
  const attempt2SelectedCount = selections.filter((s) => s.attempt === 2).length;
  const semanticSelected = selections.filter((s) => s.kind === "semantic").length;
  const pairwiseSelected = selections.filter((s) => s.kind === "pairwise").length;

  const normalizationCountsByRule: Record<string, number> = {};
  for (const s of selections) {
    for (const step of s.normalizationSteps ?? []) {
      normalizationCountsByRule[step] = (normalizationCountsByRule[step] ?? 0) + 1;
    }
  }

  const report = {
    schemaVersion: "v2-six-subject-judge-final-reparse-report-v1",
    observedAt: new Date().toISOString(),
    frozenPlanSha256: masterPlanSha256,
    apiCallsMade: 0,
    totals: {
      validOutOf738: selections.length,
      semanticValidOutOf369: semanticSelected,
      pairwiseValidOutOf369: pairwiseSelected,
      attempt1SelectedCount,
      attempt2SelectedCount,
      stillInvalidCount: stillInvalid.length,
    },
    normalizationCountsByRule,
    stillInvalidKeys: stillInvalid,
  };
  await writeFile(OUTPUT_REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report, null, 2));

  // --- If and only if all 738 are valid: two-pass validate-then-write the provenance artifact. ---
  if (stillInvalid.length === 0) {
    // Pass 1 (validation) is exactly the loop above -- every one of the 738 selections is already
    // a confirmed-valid ValidatedResponseItem. Pass 2 (write) happens only now, all at once.
    const provenance = {
      schemaVersion: "v2-six-subject-judge-selection-provenance-v1",
      observedAt: new Date().toISOString(),
      frozenPlanSha256: masterPlanSha256,
      note: "Selection provenance only -- this artifact does NOT aggregate or report judge scores/verdicts. It records, per request key, which attempt's provider response was selected as authoritative and why (never content-based).",
      apiCallsMade: 0,
      masterBatchJobId: masterJob.batchJobId,
      retryBatchJobId: retryJob.batchJobId,
      totals: {
        validOutOf738: selections.length,
        attempt1SelectedCount,
        attempt2SelectedCount,
      },
      selections: selections
        .slice()
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((s) => ({
          key: s.key,
          kind: s.kind,
          selectedAttempt: s.attempt,
          selectedBatchJobId: s.batchJobId,
          originalProviderResponseLocation: s.providerResponseLocation,
          normalizationApplied: s.normalizationApplied ?? false,
          normalizationSteps: s.normalizationSteps ?? [],
          providerReportedModelVersion: s.reportedModelVersion,
          promptVersion: s.promptVersion,
        })),
    };
    await writeFile(PROVENANCE_PATH, JSON.stringify(provenance, null, 2) + "\n", "utf8");
    console.log(`\nWrote provenance artifact: ${PROVENANCE_PATH}`);
  } else {
    console.log(`\n${stillInvalid.length} key(s) remain invalid -- provenance artifact NOT written, semantic/pairwise/judge-metadata NOT materialized.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
