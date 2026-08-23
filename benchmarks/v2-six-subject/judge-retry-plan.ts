// EVAL-HOTFIX-2026-08-23 (judge-run targeted retry, attempt 2): pure, offline-testable logic for
// selecting and validating a NARROW retry of exactly the 11 request keys the offline strict
// reparse (judge-batch/collection-attempt-3-offline-reparse-report.json) found genuinely
// unrecoverable from batch batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5. This module never
// reconstructs a prompt from scenario/evaluator code — every retry request is copied verbatim,
// by reference to its exact JudgeRequest object, from the already-frozen master plan.json.
//
// No filesystem/network access anywhere in this module; every function is a pure transform over
// already-loaded plan/JSON data, so retry selection and integrity checks are fully unit-testable
// without touching disk or the network.
import { createHash } from "node:crypto";
import type { JudgeBatchPlan, JudgeRequest } from "./judge-plan.ts";

// The reviewed, approved set of keys for targeted retry attempt 2. Hardcoded deliberately: this
// is a one-time, explicitly-approved list from an offline audit, not something to (re)derive from
// evaluator logic — deriving it dynamically would risk silently drifting the retry scope if the
// evaluator or scenario code ever changes.
export const APPROVED_RETRY_KEYS: readonly string[] = [
  "semantic:P02-V2-S05-p02-original-r03",
  "semantic:P02-V2-S05-p02-agenerateor-r02",
  "semantic:P02-V2-S05-p02-agenerateor-r03",
  "semantic:P02-V2-S05-p02-arrokothai-r02",
  "semantic:P02-V2-S14-p02-agenerateor-r02",
  "semantic:P02-V2-S14-p02-agenerateor-r03",
  "semantic:P02-V2-S14-p02-agenerateor-r05",
  "pairwise:P01-V2-S05-r02-p01-agenerateor-vs-p01-arrokothai",
  "pairwise:P01-V2-S11-r03-p01-original-vs-p01-agenerateor",
  "pairwise:P01-V2-S12-r02-p01-agenerateor-vs-p01-arrokothai",
  "pairwise:P02-V2-S07-r02-p02-original-vs-p02-arrokothai",
];

export function sha256HexOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

/**
 * Selects the exact approved retry requests from the master plan, by key, preserving each
 * request object exactly as frozen (no field is added, removed, or regenerated — including
 * `createdAt`, which stays whatever the master plan already recorded). Throws on any deviation
 * from the approved set: an unapproved key present, an approved key missing, or a duplicate.
 */
export function selectRetryRequests(masterPlan: JudgeBatchPlan, approvedKeys: readonly string[] = APPROVED_RETRY_KEYS): JudgeRequest[] {
  const approvedSet = new Set(approvedKeys);
  if (approvedSet.size !== approvedKeys.length) {
    throw new Error("APPROVED_RETRY_KEYS itself contains duplicates — refusing to build a retry plan from an ambiguous approved set.");
  }

  const byKey = new Map(masterPlan.requests.map((request) => [request.key, request]));
  const missing = approvedKeys.filter((key) => !byKey.has(key));
  if (missing.length) {
    throw new Error(`Approved retry key(s) not found in the frozen master plan: ${missing.join(", ")}`);
  }

  const selected = approvedKeys.map((key) => byKey.get(key)!);
  const selectedKeySet = new Set(selected.map((request) => request.key));
  if (selectedKeySet.size !== selected.length) {
    throw new Error("Duplicate key(s) among selected retry requests.");
  }
  return selected;
}

/**
 * Validates a caller-supplied set of retry keys against the approved set: rejects anything not
 * in the approved set (a "12th key"), rejects a missing approved key, and rejects duplicates.
 * Exists separately from selectRetryRequests() so both "extra key" and "missing key" rejection
 * paths are independently testable without needing a full master plan fixture for every case.
 */
export function assertExactApprovedKeySet(candidateKeys: readonly string[], approvedKeys: readonly string[] = APPROVED_RETRY_KEYS): void {
  const approvedSet = new Set(approvedKeys);
  const candidateSet = new Set(candidateKeys);
  if (candidateSet.size !== candidateKeys.length) {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const key of candidateKeys) { if (seen.has(key)) dupes.add(key); seen.add(key); }
    throw new Error(`Duplicate retry key(s): ${[...dupes].join(", ")}`);
  }
  const unapproved = candidateKeys.filter((key) => !approvedSet.has(key));
  if (unapproved.length) {
    throw new Error(`Retry key(s) not in the approved 11-key set: ${unapproved.join(", ")}`);
  }
  const missing = approvedKeys.filter((key) => !candidateSet.has(key));
  if (missing.length) {
    throw new Error(`Approved retry key(s) missing from the candidate set: ${missing.join(", ")}`);
  }
}

/**
 * Deep-equality proof that every selected retry request is byte-identical (via stable JSON
 * comparison) to the corresponding request in the frozen master plan — catches any drift,
 * including a single-character prompt difference, a changed seed, or altered parse metadata.
 */
export function verifyRetryRequestsMatchMaster(retryRequests: readonly JudgeRequest[], masterPlan: JudgeBatchPlan): void {
  const byKey = new Map(masterPlan.requests.map((request) => [request.key, request]));
  for (const retryRequest of retryRequests) {
    const masterRequest = byKey.get(retryRequest.key);
    if (!masterRequest) {
      throw new Error(`Retry request key ${retryRequest.key} does not exist in the frozen master plan.`);
    }
    const retryHash = sha256HexOf(retryRequest);
    const masterHash = sha256HexOf(masterRequest);
    if (retryHash !== masterHash) {
      throw new Error(`Retry request ${retryRequest.key} does not deep-equal the frozen master plan's request (hash ${retryHash} vs ${masterHash}). Refusing to submit a drifted request.`);
    }
  }
}

export interface RetryPlan {
  schemaVersion: "v2-six-subject-judge-retry-plan-v1";
  attemptNumber: number;
  parentBatchJobId: string;
  masterPlanSha256: string;
  requestedJudgeModel: string;
  temperature: number;
  promptVersions: { semantic: string; pairwise: string };
  responseMimeType: "application/json";
  retryKeys: string[];
  retryCounts: { total: number; semantic: number; pairwise: number };
  originalFailedEvidenceLocation: string;
  originalRequestHashes: Record<string, string>;
  requests: JudgeRequest[];
  builtAt: string;
}

/**
 * Builds the full, auditable attempt-2 retry plan object. `requests` are the exact, unmodified
 * request objects selected from the master plan (see selectRetryRequests()) — nothing here
 * regenerates or rewrites any field on them. `builtAt` is wrapper-level metadata only; it is
 * never used as part of any request's own identity/hash.
 */
export function buildRetryPlan(input: {
  masterPlan: JudgeBatchPlan;
  masterPlanSha256: string;
  parentBatchJobId: string;
  attemptNumber: number;
  approvedKeys?: readonly string[];
  originalFailedEvidenceLocation: string;
  now?: () => string;
}): RetryPlan {
  const approvedKeys = input.approvedKeys ?? APPROVED_RETRY_KEYS;
  const requests = selectRetryRequests(input.masterPlan, approvedKeys);
  verifyRetryRequestsMatchMaster(requests, input.masterPlan);

  const originalRequestHashes: Record<string, string> = {};
  for (const request of requests) originalRequestHashes[request.key] = sha256HexOf(request);

  return {
    schemaVersion: "v2-six-subject-judge-retry-plan-v1",
    attemptNumber: input.attemptNumber,
    parentBatchJobId: input.parentBatchJobId,
    masterPlanSha256: input.masterPlanSha256,
    requestedJudgeModel: input.masterPlan.requestedJudgeModel,
    temperature: input.masterPlan.temperature,
    promptVersions: input.masterPlan.promptVersions,
    responseMimeType: "application/json",
    retryKeys: requests.map((request) => request.key),
    retryCounts: {
      total: requests.length,
      semantic: requests.filter((request) => request.kind === "semantic").length,
      pairwise: requests.filter((request) => request.kind === "pairwise").length,
    },
    originalFailedEvidenceLocation: input.originalFailedEvidenceLocation,
    originalRequestHashes,
    requests,
    builtAt: (input.now ?? (() => new Date().toISOString()))(),
  };
}

export interface RetryPlanValidationExpectations {
  masterPlanSha256: string;
  requestedJudgeModel: string;
  temperature: number;
  approvedKeys?: readonly string[];
}

/**
 * Full offline pre-submission validation of a built RetryPlan: exact counts (11 total / 7
 * semantic / 4 pairwise), zero duplicate keys, the retry key set exactly equal to the approved
 * set, every request deep-equal to its master-plan counterpart, and matching
 * model/temperature/master-plan-hash. Throws with a specific message on the first violation
 * found; never partially validates.
 */
export function validateRetryPlan(plan: RetryPlan, masterPlan: JudgeBatchPlan, expectations: RetryPlanValidationExpectations): void {
  const approvedKeys = expectations.approvedKeys ?? APPROVED_RETRY_KEYS;
  if (plan.masterPlanSha256 !== expectations.masterPlanSha256) {
    throw new Error(`Retry plan's recorded masterPlanSha256 (${plan.masterPlanSha256}) does not match the current frozen master plan hash (${expectations.masterPlanSha256}).`);
  }
  if (plan.requestedJudgeModel !== expectations.requestedJudgeModel) {
    throw new Error(`Retry plan requestedJudgeModel mismatch: expected ${expectations.requestedJudgeModel}, got ${plan.requestedJudgeModel}.`);
  }
  if (plan.temperature !== expectations.temperature) {
    throw new Error(`Retry plan temperature mismatch: expected ${expectations.temperature}, got ${plan.temperature}.`);
  }
  if (plan.retryCounts.total !== 11 || plan.requests.length !== 11) {
    throw new Error(`Retry plan must contain exactly 11 requests, found ${plan.requests.length}.`);
  }
  if (plan.retryCounts.semantic !== 7) {
    throw new Error(`Retry plan must contain exactly 7 semantic requests, found ${plan.retryCounts.semantic}.`);
  }
  if (plan.retryCounts.pairwise !== 4) {
    throw new Error(`Retry plan must contain exactly 4 pairwise requests, found ${plan.retryCounts.pairwise}.`);
  }
  assertExactApprovedKeySet(plan.retryKeys, approvedKeys);
  verifyRetryRequestsMatchMaster(plan.requests, masterPlan);
}
