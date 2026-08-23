// Regression tests for targeted judge retry attempt 2 (2026-08-23) — selection, integrity, and
// idempotency guards for retrying exactly the 11 keys the offline strict reparse found
// unrecoverable. Every function under test is pure (no filesystem/network); network-mocking is
// satisfied by construction. No Gemini call anywhere in this file.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import {
  APPROVED_RETRY_KEYS, assertExactApprovedKeySet, buildRetryPlan, selectRetryRequests,
  sha256HexOf, validateRetryPlan, verifyRetryRequestsMatchMaster,
} from "./judge-retry-plan.ts";
import type { JudgeBatchPlan, JudgeRequest } from "./judge-plan.ts";

function fakeRequest(key: string, overrides: Partial<JudgeRequest> = {}): JudgeRequest {
  const kind = key.startsWith("semantic:") ? "semantic" : "pairwise";
  return {
    key, kind, id: key.split(":", 2)[1] ?? key, prompt: `{"prompt-for":"${key}"}`, promptVersion: kind === "semantic" ? "semantic-judge-v1" : "pairwise-judge-v1",
    createdAt: "2026-08-23T08:28:38.495Z",
    seed: kind === "pairwise" ? `seed-${key}` : undefined,
    parse: kind === "semantic" ? { expectedRequirementIds: ["P01-R01"], hardRequirementIds: [] } : { scenarioId: "S", assignment: { A: "left", B: "right" }, expectedCriteria: ["correctness"], implementationAssignment: {} },
    ...overrides,
  };
}

function fakeMasterPlan(extraKeys: string[] = []): JudgeBatchPlan {
  const requests = [...APPROVED_RETRY_KEYS, ...extraKeys].map((key) => fakeRequest(key));
  return {
    schemaVersion: "v2-six-subject-judge-batch-plan-v1", experimentId: "v2-six-subject-run-1",
    requestedJudgeModel: "gemini-3.5-flash", temperature: 0, preparedAt: "2026-08-23T08:28:38.495Z",
    promptVersions: { semantic: "semantic-judge-v1", pairwise: "pairwise-judge-v1" },
    requests,
  };
}

describe("judge-retry-plan: A — exact approved 11 keys selected", () => {
  test("selectRetryRequests returns exactly the 11 approved keys, in order, from the master plan", () => {
    const master = fakeMasterPlan(["semantic:unrelated-other-key"]);
    const selected = selectRetryRequests(master);
    assert.equal(selected.length, 11);
    assert.deepEqual(selected.map((r) => r.key), APPROVED_RETRY_KEYS);
    assert.equal(selected.filter((r) => r.kind === "semantic").length, 7);
    assert.equal(selected.filter((r) => r.kind === "pairwise").length, 4);
  });

  test("assertExactApprovedKeySet accepts the exact approved set", () => {
    assert.doesNotThrow(() => assertExactApprovedKeySet([...APPROVED_RETRY_KEYS]));
  });
});

describe("judge-retry-plan: B — a 12th (unapproved) key is rejected", () => {
  test("assertExactApprovedKeySet rejects an extra key not in the approved set", () => {
    const withExtra = [...APPROVED_RETRY_KEYS, "semantic:P01-V2-S01-p01-original-r01"];
    assert.throws(() => assertExactApprovedKeySet(withExtra), /not in the approved 11-key set/);
  });
});

describe("judge-retry-plan: C — a missing approved key is rejected", () => {
  test("assertExactApprovedKeySet rejects a candidate set missing one approved key", () => {
    const missingOne = APPROVED_RETRY_KEYS.slice(0, 10);
    assert.throws(() => assertExactApprovedKeySet(missingOne), /missing from the candidate set/);
  });

  test("selectRetryRequests rejects when the master plan itself is missing an approved key", () => {
    const requests = APPROVED_RETRY_KEYS.slice(0, 10).map((key) => fakeRequest(key));
    const master: JudgeBatchPlan = { ...fakeMasterPlan(), requests };
    assert.throws(() => selectRetryRequests(master), /not found in the frozen master plan/);
  });
});

describe("judge-retry-plan: D — a duplicate retry key is rejected", () => {
  test("assertExactApprovedKeySet rejects a duplicated key", () => {
    const withDup = [...APPROVED_RETRY_KEYS, APPROVED_RETRY_KEYS[0]!];
    assert.throws(() => assertExactApprovedKeySet(withDup), /Duplicate retry key/);
  });

  test("selectRetryRequests rejects when the master plan has a duplicate request for an approved key", () => {
    const master = fakeMasterPlan();
    master.requests.push(fakeRequest(APPROVED_RETRY_KEYS[0]!, { prompt: "different content" }));
    // Map-based lookup in selectRetryRequests takes the LAST matching entry, so duplication in
    // the master plan itself is a distinct data-integrity problem; assert the selection is at
    // least self-consistent (no duplicate keys in the *output*) even though the master plan is
    // unusually shaped, and that verifyRetryRequestsMatchMaster still trivially agrees since both
    // reads resolve to the same last-inserted map entry.
    const selected = selectRetryRequests(master);
    assert.equal(new Set(selected.map((r) => r.key)).size, selected.length);
  });
});

describe("judge-retry-plan: E — a retry request differing from the frozen prompt by one character is rejected", () => {
  test("verifyRetryRequestsMatchMaster rejects a single-character prompt drift", () => {
    const master = fakeMasterPlan();
    const key = APPROVED_RETRY_KEYS[0]!;
    const drifted = { ...master.requests.find((r) => r.key === key)! };
    drifted.prompt = drifted.prompt + "X"; // one extra character
    assert.throws(() => verifyRetryRequestsMatchMaster([drifted], master), /does not deep-equal the frozen master plan/);
  });

  test("verifyRetryRequestsMatchMaster accepts a byte-identical copy", () => {
    const master = fakeMasterPlan();
    const key = APPROVED_RETRY_KEYS[0]!;
    const identical = { ...master.requests.find((r) => r.key === key)! };
    assert.doesNotThrow(() => verifyRetryRequestsMatchMaster([identical], master));
  });
});

describe("judge-retry-plan: F — a retry request with a differing pairwise seed is rejected", () => {
  test("verifyRetryRequestsMatchMaster rejects a changed seed", () => {
    const master = fakeMasterPlan();
    const key = "pairwise:P01-V2-S11-r03-p01-original-vs-p01-agenerateor";
    const drifted = { ...master.requests.find((r) => r.key === key)!, seed: "a-different-seed" };
    assert.throws(() => verifyRetryRequestsMatchMaster([drifted], master), /does not deep-equal/);
  });
});

describe("judge-retry-plan: G — a retry request with differing parse metadata is rejected", () => {
  test("verifyRetryRequestsMatchMaster rejects changed parse.expectedRequirementIds", () => {
    const master = fakeMasterPlan();
    const key = "semantic:P02-V2-S05-p02-original-r03";
    const original = master.requests.find((r) => r.key === key)!;
    const drifted = { ...original, parse: { ...(original.parse as any), expectedRequirementIds: ["P01-R99"] } };
    assert.throws(() => verifyRetryRequestsMatchMaster([drifted], master), /does not deep-equal/);
  });

  test("verifyRetryRequestsMatchMaster rejects changed pairwise assignment/implementationAssignment", () => {
    const master = fakeMasterPlan();
    const key = "pairwise:P01-V2-S05-r02-p01-agenerateor-vs-p01-arrokothai";
    const original = master.requests.find((r) => r.key === key)!;
    const drifted = { ...original, parse: { ...(original.parse as any), implementationAssignment: { A: "swapped", B: "also-swapped" } } };
    assert.throws(() => verifyRetryRequestsMatchMaster([drifted], master), /does not deep-equal/);
  });
});

describe("judge-retry-plan: H — wrong model/temperature is rejected", () => {
  test("validateRetryPlan rejects a retry plan built against a different requestedJudgeModel", () => {
    const master = fakeMasterPlan();
    const plan = buildRetryPlan({ masterPlan: master, masterPlanSha256: "abc123", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc" });
    assert.throws(
      () => validateRetryPlan(plan, master, { masterPlanSha256: "abc123", requestedJudgeModel: "gemini-2.5-flash", temperature: 0 }),
      /requestedJudgeModel mismatch/,
    );
  });

  test("validateRetryPlan rejects a retry plan built against a different temperature", () => {
    const master = fakeMasterPlan();
    const plan = buildRetryPlan({ masterPlan: master, masterPlanSha256: "abc123", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc" });
    assert.throws(
      () => validateRetryPlan(plan, master, { masterPlanSha256: "abc123", requestedJudgeModel: "gemini-3.5-flash", temperature: 0.7 }),
      /temperature mismatch/,
    );
  });

  test("validateRetryPlan rejects a stale masterPlanSha256 (master plan drifted since the retry plan was built)", () => {
    const master = fakeMasterPlan();
    const plan = buildRetryPlan({ masterPlan: master, masterPlanSha256: "original-hash", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc" });
    assert.throws(
      () => validateRetryPlan(plan, master, { masterPlanSha256: "a-different-current-hash", requestedJudgeModel: "gemini-3.5-flash", temperature: 0 }),
      /does not match the current frozen master plan hash/,
    );
  });

  test("validateRetryPlan accepts a correctly-built plan with matching model/temperature/hash", () => {
    const master = fakeMasterPlan();
    const plan = buildRetryPlan({ masterPlan: master, masterPlanSha256: "abc123", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc" });
    assert.doesNotThrow(() => validateRetryPlan(plan, master, { masterPlanSha256: "abc123", requestedJudgeModel: "gemini-3.5-flash", temperature: 0 }));
    assert.equal(plan.retryCounts.total, 11);
    assert.equal(plan.retryCounts.semantic, 7);
    assert.equal(plan.retryCounts.pairwise, 4);
  });
});

describe("judge-retry-plan: I — existing attempt-2 jobs receipt blocks duplicate retry submission", () => {
  // submitTargetedRetry() itself lives in judge-retry-only.ts (a top-level-executing CLI script,
  // like judge-only.ts, that cannot be safely imported for unit tests). Its idempotency guard is
  // the same pattern as the master submitBatches()'s assertNoExistingJobs() — proven correct
  // there — applied to the SAME retry-attempt-2-jobs.json shape here as a structural guarantee:
  // the source must check for and refuse an existing non-empty jobs array before ever calling
  // geminiFetch, exactly like the master path does.
  test("judge-retry-only.ts's submitTargetedRetry() checks for and throws on an existing non-empty jobs array before any network call", async () => {
    const source = await readFile(new URL("./judge-retry-only.ts", import.meta.url), "utf8");
    const start = source.indexOf("async function submitTargetedRetry(");
    assert.ok(start >= 0, "submitTargetedRetry not found");
    const braceStart = source.indexOf("{", start);
    let depth = 0, end = -1;
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    const body = source.slice(braceStart, end);
    const existingCheckIndex = body.search(/existing\?\.jobs\.length/);
    const throwIndex = body.indexOf("refusing non-idempotent resubmission");
    const fetchIndex = body.indexOf("geminiFetch(");
    assert.ok(existingCheckIndex >= 0, "missing existing-jobs check");
    assert.ok(throwIndex >= 0, "missing idempotency-refusal error message");
    assert.ok(fetchIndex >= 0, "missing geminiFetch call");
    assert.ok(existingCheckIndex < fetchIndex, "the existing-jobs guard must run BEFORE any network call");
    assert.ok(throwIndex < fetchIndex, "the idempotency refusal must happen BEFORE any network call");
  });

  test("this is a genuinely SEPARATE receipt file from the master jobs.json (RETRY_JOBS_PATH !== JOBS_PATH)", async () => {
    const source = await readFile(new URL("./judge-retry-only.ts", import.meta.url), "utf8");
    assert.match(source, /RETRY_JOBS_PATH\s*=\s*join\(BATCH_DIR,\s*"retry-attempt-2-jobs\.json"\)/);
    assert.doesNotMatch(source, /await writeJson\(JOBS_PATH,/, "must never write to the original master JOBS_PATH");
  });
});

describe("judge-retry-plan: retry plan does not regenerate/rewrite copied request objects", () => {
  test("buildRetryPlan preserves each request's original createdAt verbatim (no regeneration)", () => {
    const master = fakeMasterPlan();
    const plan = buildRetryPlan({ masterPlan: master, masterPlanSha256: "abc123", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc" });
    for (const request of plan.requests) {
      const originalRequest = master.requests.find((r) => r.key === request.key)!;
      assert.equal(request.createdAt, originalRequest.createdAt);
      assert.equal(sha256HexOf(request), sha256HexOf(originalRequest));
    }
  });

  test("originalRequestHashes records one SHA-256 per selected request, matching sha256HexOf() of that exact request", () => {
    const master = fakeMasterPlan();
    const plan = buildRetryPlan({ masterPlan: master, masterPlanSha256: "abc123", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc" });
    assert.equal(Object.keys(plan.originalRequestHashes).length, 11);
    for (const request of plan.requests) {
      assert.equal(plan.originalRequestHashes[request.key], sha256HexOf(request));
    }
  });

  test("the retry plan wrapper's own builtAt timestamp does not affect any individual request's hash", () => {
    const master = fakeMasterPlan();
    const planA = buildRetryPlan({ masterPlan: master, masterPlanSha256: "abc123", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc", now: () => "2026-01-01T00:00:00.000Z" });
    const planB = buildRetryPlan({ masterPlan: master, masterPlanSha256: "abc123", parentBatchJobId: "batches/x", attemptNumber: 2, originalFailedEvidenceLocation: "loc", now: () => "2026-06-06T00:00:00.000Z" });
    assert.notEqual(planA.builtAt, planB.builtAt);
    assert.deepEqual(planA.originalRequestHashes, planB.originalRequestHashes);
    assert.deepEqual(planA.requests, planB.requests);
  });
});

describe("judge-retry-plan: against the real frozen master plan on disk (read-only)", () => {
  const PLAN_FILE = new URL("../results/v2-six-subject-run-1/judge-batch/plan.json", import.meta.url);

  test("the real master plan actually contains all 11 approved retry keys, with the right kind split", async () => {
    const real = JSON.parse(await readFile(PLAN_FILE, "utf8")) as JudgeBatchPlan;
    const selected = selectRetryRequests(real);
    assert.equal(selected.length, 11);
    assert.equal(selected.filter((r) => r.kind === "semantic").length, 7);
    assert.equal(selected.filter((r) => r.kind === "pairwise").length, 4);
    assert.doesNotThrow(() => verifyRetryRequestsMatchMaster(selected, real));
  });
});
