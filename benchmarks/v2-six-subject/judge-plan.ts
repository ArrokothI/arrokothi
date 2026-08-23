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
  // The real API observed (batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5) reports
  // successfulRequestCount instead of/alongside pendingRequestCount on a SUCCEEDED batch, with no
  // pendingRequestCount field at all. When present, it must also agree with the expected count.
  if (batchStats.successfulRequestCount !== undefined) {
    const successfulRequestCount = Number(batchStats.successfulRequestCount);
    if (!Number.isFinite(successfulRequestCount) || successfulRequestCount !== expectation.expectedRequestCount) {
      throw new Error(`Judge batch ${expectation.batchJobId}: batchStats.successfulRequestCount ${String(batchStats.successfulRequestCount)} does not match the ${expectation.expectedRequestCount} requests actually submitted for this job.`);
    }
  }
  return { requestCount, pendingRequestCount };
}

// EVAL-HOTFIX-2026-08-23 (judge-run collection fix, discovered live against the real batch
// batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5): the actual Gemini GenerateContent Batch API
// nests inline responses at `metadata.output.inlinedResponses.inlinedResponses` (matching the
// "type.googleapis.com/google.ai.generativelanguage.v1main.GenerateContentBatch" status shape —
// `metadata.state`, `metadata.batchStats`, and `metadata.output` are all siblings). The
// pre-existing candidate paths below (dest.*, top-level output.*, response.output.*) were never
// observed against a real response and are kept only as defensive fallbacks for possible API
// shape variants; `metadata.output.*` is checked first because it is the path with direct
// evidence.
export function extractInlineResponses(status: Record<string, any>): any[] {
  return status.metadata?.output?.inlinedResponses?.inlinedResponses
    ?? status.dest?.inlinedResponses?.inlinedResponses
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
  rawProviderText: string;
  normalizationApplied: boolean;
  normalizationSteps: string[];
}

// =====================================================================================
// Offline recovery: narrow, evidence-driven serialization normalizers.
//
// The original Gemini batch request used responseMimeType: "application/json" but did NOT
// provide a provider-level responseSchema — the prompt described the expected shape in prose/
// JSON-example form, but the API never mechanically constrained field types. That explains (but
// does not justify guessing around) the serialization deviations normalized here. Both
// normalizers below were derived from auditing the ACTUAL 98 malformed responses returned by
// batch batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5 (see
// judge-batch/collection-attempt-2-failure-report.json) — they are not speculative, and neither
// infers or guesses content; each only recognizes one exact, general, mechanical serialization
// pattern and passes everything else through unchanged for the strict parser to reject.
// =====================================================================================

// =====================================================================================
// FROZEN NORMALIZATION STACK (v2-six-subject-run-1, decided 2026-08-23 in the FINAL OFFLINE
// PROTOCOL-NORMALIZATION AUDIT). No new normalization rule may be added to this experiment after
// this point. The complete, frozen set is exactly:
//
//   SEMANTIC (applied in order):
//     1. score_string_to_number — requirementResults[].score given as the exact JSON string
//        "0"/"1"/"2" is replaced with the corresponding number.
//     2. removed_non_hard_semantic_violation_annotation — hardSemanticViolations entries that are
//        a genuinely expected requirement id but not in this rubric's hard-capable set are
//        removed (see normalizeHardSemanticViolations below).
//
//   PAIRWISE (applied in order):
//     1. trimmed_trailing_stray_delimiters — a complete top-level JSON value followed only by
//        stray trailing delimiters/whitespace is recovered (extractLeadingJsonValue).
//     2. unwrapped_outputSchema_echo — a complete pairwise shape echoed under an `outputSchema`
//        wrapper key is unwrapped (unwrapPairwiseSchemaEcho).
//     3. injected_missing_schema_version / injected_missing_prompt_version — the fixed protocol
//        constants schemaVersion="pairwise-judge-output-v1" and promptVersion=<the request's own
//        frozen promptVersion> are injected ONLY when entirely absent and only when doing so makes
//        the object a complete pairwise shape (injectMissingPairwiseFixedMetadata).
//
// Nothing else. In particular: no case-normalization of verdict/preference values, no
// score/verdict inference from prose, no deduplication, no repair of genuinely truncated JSON,
// and no correction of a present-but-wrong field (schemaVersion, promptVersion, or otherwise) —
// all of those remain hard rejections, exactly as before this audit.
// =====================================================================================

const SEMANTIC_SCORE_STRING_TO_NUMBER: Record<string, 0 | 1 | 2> = { "0": 0, "1": 1, "2": 2 };

/**
 * ONLY transformation: requirementResults[].score given as the exact JSON string "0", "1", or
 * "2" is replaced with the corresponding number. Every other field (requirementId, confidence,
 * reason, citedTurns, hardSemanticViolations, schemaVersion, promptVersion) is left byte-for-byte
 * untouched. A score of any other string ("2.0", "two", "", "3", etc.), or null, or any other
 * type, is left as-is — the strict parser will (correctly) still reject it. Malformed/non-JSON
 * input is passed through unchanged (returns applied: false); the strict parser reports the
 * original parse error, unmodified.
 */
/**
 * ONLY transformation: `hardSemanticViolations` entries are filtered against the request's own
 * frozen `expectedRequirementIds`/`hardRequirementIds` sets — NOT invented, NOT looked up
 * elsewhere. An id is removed if and only if it is (a) a genuinely expected requirement id for
 * this request AND (b) not among the ids the frozen rubric ever marked hard-capable
 * (`hardFailureWhen` set). This is a purely mechanical fact: the field's frozen domain excludes
 * that id, so its presence is an invalid use of a valid id, not a judgment call about whether the
 * violation "really was hard." An id that is not even in expectedRequirementIds (genuinely
 * unknown) is left untouched so the strict parser's existing unknown-id rejection still fires.
 * Duplicate ids are also left untouched — deduplication is not part of this rule and stays
 * rejected exactly as before. requirementResults (score/confidence/reason/citedTurns) is never
 * touched by this function.
 */
export function normalizeHardSemanticViolations(
  violations: readonly unknown[],
  expectedRequirementIds: readonly string[],
  hardRequirementIds: readonly string[],
): { violations: unknown[]; applied: boolean } {
  let applied = false;
  const kept = violations.filter((entry) => {
    if (typeof entry !== "string") return true; // not our concern; leave for the strict parser's own type check
    if (hardRequirementIds.includes(entry)) return true; // valid hard id -> keep
    if (expectedRequirementIds.includes(entry)) {
      applied = true;
      return false; // expected-but-non-hard -> omit the invalid annotation
    }
    return true; // truly unknown id -> keep, so the strict parser still rejects it
  });
  return { violations: kept, applied };
}

export function normalizeSemanticJudgeSerialization(
  raw: string,
  expectedRequirementIds: readonly string[] = [],
  hardRequirementIds: readonly string[] = [],
): { normalizedText: string; applied: boolean; steps: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { normalizedText: raw, applied: false, steps: [] };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { normalizedText: raw, applied: false, steps: [] };
  const record = parsed as Record<string, unknown>;

  const steps: string[] = [];
  let next: Record<string, unknown> = record;

  if (Array.isArray(record.requirementResults)) {
    let scoreApplied = false;
    const normalizedResults = record.requirementResults.map((entry) => {
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const item = entry as Record<string, unknown>;
        if (typeof item.score === "string" && Object.prototype.hasOwnProperty.call(SEMANTIC_SCORE_STRING_TO_NUMBER, item.score)) {
          scoreApplied = true;
          return { ...item, score: SEMANTIC_SCORE_STRING_TO_NUMBER[item.score] };
        }
      }
      return entry;
    });
    if (scoreApplied) {
      next = { ...next, requirementResults: normalizedResults };
      steps.push("score_string_to_number");
    }
  }

  if (Array.isArray(record.hardSemanticViolations)) {
    const filtered = normalizeHardSemanticViolations(record.hardSemanticViolations, expectedRequirementIds, hardRequirementIds);
    if (filtered.applied) {
      next = { ...next, hardSemanticViolations: filtered.violations };
      steps.push("removed_non_hard_semantic_violation_annotation");
    }
  }

  if (steps.length === 0) return { normalizedText: raw, applied: false, steps: [] };
  return { normalizedText: JSON.stringify(next), applied: true, steps };
}

/**
 * Scans for the end of the first complete top-level JSON value (object or array) starting at
 * index 0, tracking string/escape state so braces inside string literals are never miscounted.
 * Returns the index one past the closing delimiter, or null if the text never returns to depth 0
 * (i.e. it is genuinely incomplete/truncated — never guessed at).
 */
function findLeadingJsonValueEnd(text: string): number | null {
  const trimmed = text;
  let i = 0;
  while (i < trimmed.length && /\s/.test(trimmed[i]!)) i++;
  if (i >= trimmed.length || (trimmed[i] !== "{" && trimmed[i] !== "[")) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return null; // never closed -> genuinely incomplete; do not guess
}

/**
 * Recovers a JSON value followed ONLY by stray trailing whitespace and/or extra closing
 * delimiters (`}`/`]`) — the exact shape observed (e.g. a duplicated closing brace appended after
 * an otherwise-complete, valid object). Deliberately does NOT accept trailing content that is
 * anything else (a second competing object, prose, etc.) — that case is left unrecovered and
 * falls through to the strict parser's normal rejection.
 */
export function extractLeadingJsonValue(text: string): string | null {
  const end = findLeadingJsonValueEnd(text);
  if (end === null) return null;
  const leading = text.slice(0, end);
  const trailing = text.slice(end);
  if (!/^[\s}\]]*$/.test(trailing)) return null; // trailing content is more than stray delimiters/whitespace -> do not touch
  try {
    JSON.parse(leading);
  } catch {
    return null;
  }
  return leading;
}

function isCompletePairwiseShape(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.schemaVersion === "pairwise-judge-output-v1" &&
    typeof record.promptVersion === "string" &&
    typeof record.verdict === "string" &&
    Array.isArray(record.criteria) &&
    typeof record.reason === "string"
  );
}

/**
 * ONLY transformation: if the top-level object is NOT itself a complete pairwise-judge-output-v1
 * shape, but it has an `outputSchema` property that IS a complete one (schemaVersion,
 * promptVersion, verdict, criteria, reason all present and correctly typed), unwrap it — the
 * model echoed the prompt's own `outputSchema` template key instead of returning only an
 * instance of it. Nothing is inferred: every field of the recovered object came verbatim from the
 * model's own response. If the top-level object is already a complete shape, or `outputSchema` is
 * absent/incomplete, this returns the input unchanged and the strict parser judges it as-is.
 */
export function unwrapPairwiseSchemaEcho(parsed: unknown): { value: unknown; applied: boolean } {
  if (isCompletePairwiseShape(parsed)) return { value: parsed, applied: false };
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const outputSchema = (parsed as Record<string, unknown>).outputSchema;
    if (isCompletePairwiseShape(outputSchema)) return { value: outputSchema, applied: true };
  }
  return { value: parsed, applied: false };
}

/**
 * `schemaVersion` ("pairwise-judge-output-v1") and `promptVersion` (the request's own frozen
 * `promptVersion`) are protocol constants fixed before judging — their correct values are never
 * in doubt. This injects EITHER field ONLY when it is entirely ABSENT from the object (not when
 * present-but-wrong — a wrong value is a different, unsafe-to-normalize problem and is left for
 * the strict parser to reject on its own terms). It also only actually applies the injection if
 * doing so makes the object a complete pairwise shape — i.e. verdict/criteria/reason were already
 * present and valid. If the object is incomplete for some OTHER reason (missing verdict, no
 * criteria array, etc.), injecting metadata alone would not make it complete, so this refuses and
 * returns the object unchanged, leaving the strict parser to report the real, underlying problem.
 */
export function injectMissingPairwiseFixedMetadata(parsed: unknown, expectedPromptVersion: string): { value: unknown; applied: boolean; steps: string[] } {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { value: parsed, applied: false, steps: [] };
  if (isCompletePairwiseShape(parsed)) return { value: parsed, applied: false, steps: [] }; // nothing missing

  const record = parsed as Record<string, unknown>;
  const steps: string[] = [];
  const next: Record<string, unknown> = { ...record };
  if (!("schemaVersion" in record)) {
    next.schemaVersion = "pairwise-judge-output-v1";
    steps.push("injected_missing_schema_version");
  }
  if (!("promptVersion" in record)) {
    next.promptVersion = expectedPromptVersion;
    steps.push("injected_missing_prompt_version");
  }
  if (steps.length === 0) return { value: parsed, applied: false, steps: [] }; // both present -> incomplete for some other, unsafe-to-touch reason

  if (!isCompletePairwiseShape(next)) return { value: parsed, applied: false, steps: [] }; // injecting metadata alone didn't complete the shape -> refuse, let the strict parser report the real problem (e.g. missing verdict)
  return { value: next, applied: true, steps };
}

/**
 * Composes all three approved pairwise recovery steps, in order: (1) trim stray trailing
 * delimiters if direct parsing fails, (2) unwrap an echoed `outputSchema` wrapper if the
 * (possibly trimmed) top level isn't already a complete shape, (3) inject missing
 * schemaVersion/promptVersion metadata if the (possibly unwrapped) object is otherwise complete
 * but lacks one or both of those fields. Any, all, or none may apply; `steps` records exactly
 * which. Malformed input none of these three steps can resolve is returned unchanged (steps: [])
 * for the strict parser to reject with its own error — this function never throws and never
 * guesses. This is the frozen, complete pairwise normalization stack for this experiment; no
 * further rule may be added without a fresh, evidence-driven audit.
 */
export function normalizePairwiseJudgeSerialization(raw: string, expectedPromptVersion: string): { normalizedText: string; applied: boolean; steps: string[] } {
  const steps: string[] = [];
  let workingText = raw;

  let parsed: unknown;
  try {
    parsed = JSON.parse(workingText);
  } catch {
    const recovered = extractLeadingJsonValue(raw);
    if (recovered === null) return { normalizedText: raw, applied: false, steps: [] };
    workingText = recovered;
    steps.push("trimmed_trailing_stray_delimiters");
    try {
      parsed = JSON.parse(workingText);
    } catch {
      return { normalizedText: raw, applied: false, steps: [] };
    }
  }

  const unwrapped = unwrapPairwiseSchemaEcho(parsed);
  if (unwrapped.applied) steps.push("unwrapped_outputSchema_echo");
  let value = unwrapped.value;

  const metadataInjected = injectMissingPairwiseFixedMetadata(value, expectedPromptVersion);
  if (metadataInjected.applied) {
    steps.push(...metadataInjected.steps);
    value = metadataInjected.value;
  }

  if (steps.length === 0) return { normalizedText: raw, applied: false, steps: [] };
  return { normalizedText: JSON.stringify(value), applied: true, steps };
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

  // Narrow, evidence-driven normalization BEFORE strict parsing (see the normalizers' own doc
  // comments above). The original raw provider text is always preserved in the returned record
  // (rawProviderText) alongside whether/what normalization was applied — the original is never
  // replaced in place, only used to derive the text handed to the strict parser below, which
  // still fully re-validates the result and rejects anything outside the narrow allowed cases.
  let workingText = text;
  let normalizationApplied = false;
  const normalizationSteps: string[] = [];
  if (request.kind === "semantic") {
    const expectedRequirementIds = ((request.parse as any).expectedRequirementIds ?? []) as readonly string[];
    const hardRequirementIds = ((request.parse as any).hardRequirementIds ?? []) as readonly string[];
    const normalized = normalizeSemanticJudgeSerialization(text, expectedRequirementIds, hardRequirementIds);
    if (normalized.applied) {
      workingText = normalized.normalizedText;
      normalizationApplied = true;
      normalizationSteps.push(...normalized.steps);
    }
  } else {
    const normalized = normalizePairwiseJudgeSerialization(text, request.promptVersion);
    if (normalized.applied) {
      workingText = normalized.normalizedText;
      normalizationApplied = true;
      normalizationSteps.push(...normalized.steps);
    }
  }

  const judge = { ...judgeCommonFields, providerReportedModel: reportedModelVersion };
  let parsedOutput: SemanticJudgeOutput | PairwiseJudgeOutput;
  if (request.kind === "semantic") {
    parsedOutput = parseSemanticJudgeOutput(workingText, judge, request.parse as any);
  } else {
    parsedOutput = parsePairwiseJudgeOutput(
      workingText,
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
    rawProviderText: text,
    normalizationApplied,
    normalizationSteps,
  };
}
