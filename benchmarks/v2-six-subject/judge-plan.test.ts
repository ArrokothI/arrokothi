// Regression tests for the judge-run submission-infrastructure fix (2026-08-23).
//
// Root cause fixed: judge-only.ts's --submit-batch/--collect-batch paths always called
// preparePlan(), which rewrites plan.json's preparedAt/createdAt timestamps on every invocation
// — so a whole-file SHA-256 pinned at freeze time could never match again on submission, even
// though every prompt/request byte was otherwise identical. The fix separates "build a plan"
// (judge-plan.ts's validateFrozenJudgePlan()/loadFrozenJudgePlan()) from "load and verify an
// already-frozen plan," and judge-only.ts's submit/collect branches now call
// loadFrozenJudgePlan() instead of preparePlan().
//
// validateFrozenJudgePlan() and assertNoExistingJobs() are pure (no filesystem, no network), so
// every validation-failure test here proves — by construction, not by mocking — that no API call
// is reachable on that path: neither function ever references `fetch`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  assertNoExistingJobs,
  expectationsFromFreezeMetadata,
  sha256Hex,
  validateFrozenJudgePlan,
  type FrozenJudgePlanExpectations,
  type FrozenJudgePlanMetadata,
  type JudgeBatchPlan,
} from "./judge-plan.ts";

function samplePlan(overrides: Partial<JudgeBatchPlan> = {}): JudgeBatchPlan {
  return {
    schemaVersion: "v2-six-subject-judge-batch-plan-v1",
    experimentId: "v2-six-subject-run-1",
    requestedJudgeModel: "gemini-3.5-flash",
    temperature: 0,
    preparedAt: "2026-08-23T08:28:38.495Z",
    promptVersions: { semantic: "semantic-judge-v1", pairwise: "pairwise-judge-v1" },
    requests: [
      { key: "semantic:a", kind: "semantic", id: "a", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "2026-08-23T08:28:38.495Z", parse: {} },
      { key: "pairwise:b", kind: "pairwise", id: "b", prompt: "{}", promptVersion: "pairwise-judge-v1", createdAt: "2026-08-23T08:28:38.495Z", seed: "s", parse: {} },
    ],
    ...overrides,
  };
}

function expectationsFor(plan: JudgeBatchPlan, rawText: string): FrozenJudgePlanExpectations {
  return {
    sha256: sha256Hex(rawText),
    schemaVersion: plan.schemaVersion,
    experimentId: plan.experimentId,
    requestedJudgeModel: plan.requestedJudgeModel,
    temperature: plan.temperature,
    totalRequests: plan.requests.length,
    semanticRequests: plan.requests.filter((r) => r.kind === "semantic").length,
    pairwiseRequests: plan.requests.filter((r) => r.kind === "pairwise").length,
    promptVersions: plan.promptVersions,
  };
}

describe("judge-plan: validateFrozenJudgePlan — happy path and hash pinning", () => {
  test("a plan matching its own expectations validates and is returned intact", () => {
    const plan = samplePlan();
    const rawText = JSON.stringify(plan);
    const validated = validateFrozenJudgePlan(rawText, expectationsFor(plan, rawText));
    assert.deepEqual(validated, plan);
  });

  test("D: submit refuses if plan SHA differs from frozen metadata (e.g. re-timestamped regeneration)", () => {
    const plan = samplePlan();
    const rawText = JSON.stringify(plan);
    const expectations = expectationsFor(plan, rawText);
    // Simulate exactly the bug this fix closes: preparePlan() re-stamps timestamps, producing
    // different bytes (and therefore a different hash) with otherwise-identical content.
    const retimestamped = samplePlan({ preparedAt: "2026-08-23T09:06:45.854Z" });
    const retimestampedText = JSON.stringify(retimestamped);
    assert.throws(() => validateFrozenJudgePlan(retimestampedText, expectations), /hash mismatch/);
  });

  test("does not accidentally accept a byte-different-but-hash-coincidence plan: hash check runs first, before content checks", () => {
    const plan = samplePlan();
    const rawText = JSON.stringify(plan);
    const expectations = expectationsFor(plan, rawText);
    const tamperedButWrongHash = JSON.stringify(samplePlan({ requestedJudgeModel: "gemini-2.5-flash" }));
    assert.throws(() => validateFrozenJudgePlan(tamperedButWrongHash, expectations), /hash mismatch/);
  });
});

describe("judge-plan: validateFrozenJudgePlan — content checks (all require a matching hash first)", () => {
  function expectationsWithMatchingHashBut(overrides: Partial<FrozenJudgePlanExpectations>, plan: JudgeBatchPlan = samplePlan()) {
    const rawText = JSON.stringify(plan);
    return { rawText, expectations: { ...expectationsFor(plan, rawText), ...overrides } };
  }

  test("schemaVersion mismatch is rejected", () => {
    const { rawText, expectations } = expectationsWithMatchingHashBut({ schemaVersion: "some-other-schema-v2" });
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /schemaVersion mismatch/);
  });

  test("experimentId mismatch is rejected", () => {
    const { rawText, expectations } = expectationsWithMatchingHashBut({ experimentId: "some-other-experiment" });
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /experimentId mismatch/);
  });

  test("E: submit refuses wrong judge model — no silent substitution", () => {
    const { rawText, expectations } = expectationsWithMatchingHashBut({ requestedJudgeModel: "gemini-2.5-flash" });
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /requestedJudgeModel mismatch.*Refusing to silently substitute/);
  });

  test("temperature mismatch is rejected", () => {
    const { rawText, expectations } = expectationsWithMatchingHashBut({ temperature: 0.7 });
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /temperature mismatch/);
  });

  test("F: submit refuses wrong total request count", () => {
    const { rawText, expectations } = expectationsWithMatchingHashBut({ totalRequests: 738 });
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /total request count mismatch: expected 738, got 2/);
  });

  test("submit refuses wrong semantic or pairwise request count even when total matches", () => {
    const plan = samplePlan({
      requests: [
        { key: "semantic:a", kind: "semantic", id: "a", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t", parse: {} },
        { key: "semantic:b", kind: "semantic", id: "b", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t", parse: {} },
      ],
    });
    const rawText = JSON.stringify(plan);
    const expectations = { ...expectationsFor(plan, rawText), semanticRequests: 1, pairwiseRequests: 1 };
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /semantic request count mismatch/);
  });

  test("G: submit refuses duplicate request keys", () => {
    const plan = samplePlan({
      requests: [
        { key: "semantic:dup", kind: "semantic", id: "a", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t", parse: {} },
        { key: "semantic:dup", kind: "semantic", id: "b", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t", parse: {} },
      ],
    });
    const rawText = JSON.stringify(plan);
    const expectations = { ...expectationsFor(plan, rawText), semanticRequests: 2, pairwiseRequests: 0 };
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /1 duplicate request key.*semantic:dup/);
  });

  test("prompt version mismatches (semantic and pairwise) are each rejected", () => {
    const plan = samplePlan();
    const rawText = JSON.stringify(plan);
    const semanticMismatch = { ...expectationsFor(plan, rawText), promptVersions: { semantic: "semantic-judge-v2", pairwise: "pairwise-judge-v1" } };
    assert.throws(() => validateFrozenJudgePlan(rawText, semanticMismatch), /semantic prompt version mismatch/);
    const pairwiseMismatch = { ...expectationsFor(plan, rawText), promptVersions: { semantic: "semantic-judge-v1", pairwise: "pairwise-judge-v2" } };
    assert.throws(() => validateFrozenJudgePlan(rawText, pairwiseMismatch), /pairwise prompt version mismatch/);
  });

  test("malformed JSON is rejected with a clear error, not a crash", () => {
    const rawText = "{not valid json";
    const expectations: FrozenJudgePlanExpectations = {
      sha256: sha256Hex(rawText), schemaVersion: "x", experimentId: "x", requestedJudgeModel: "x",
      temperature: 0, totalRequests: 0, semanticRequests: 0, pairwiseRequests: 0,
      promptVersions: { semantic: "x", pairwise: "x" },
    };
    assert.throws(() => validateFrozenJudgePlan(rawText, expectations), /not valid JSON/);
  });
});

describe("judge-plan: I — no API call is reachable on any validation failure path", () => {
  test("validateFrozenJudgePlan never references the network, even with global fetch removed", () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error -- deliberately removing fetch to prove no code path here could reach it
    delete globalThis.fetch;
    try {
      const plan = samplePlan();
      const rawText = JSON.stringify(plan);
      // A successful validation call:
      assert.doesNotThrow(() => validateFrozenJudgePlan(rawText, expectationsFor(plan, rawText)));
      // And a failing one:
      assert.throws(() => validateFrozenJudgePlan("{}", expectationsFor(plan, rawText)));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("validateFrozenJudgePlan is synchronous (returns a value, not a Promise) — cannot itself await a network call", () => {
    const plan = samplePlan();
    const rawText = JSON.stringify(plan);
    const result = validateFrozenJudgePlan(rawText, expectationsFor(plan, rawText));
    assert.equal(result instanceof Promise, false);
  });
});

describe("judge-plan: H — existing jobs.json still blocks duplicate submission (idempotency guard)", () => {
  test("no prior jobs recorded (file absent) does not throw", () => {
    assert.doesNotThrow(() => assertNoExistingJobs(undefined));
  });

  test("prior jobs file with an empty jobs array does not throw", () => {
    assert.doesNotThrow(() => assertNoExistingJobs({ jobs: [] }));
  });

  test("any recorded job refuses resubmission", () => {
    assert.throws(() => assertNoExistingJobs({ jobs: [{ batchJobId: "batches/123" }] }), /already recorded \(1\).*refusing non-idempotent resubmission/);
  });

  test("this guard never references fetch/network either", () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error -- deliberately removing fetch
    delete globalThis.fetch;
    try {
      assert.throws(() => assertNoExistingJobs({ jobs: [{}] }));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("judge-plan: expectationsFromFreezeMetadata — bridges the on-disk freeze record to validator expectations", () => {
  test("maps every freeze-metadata field to the corresponding expectation", () => {
    const meta: FrozenJudgePlanMetadata = {
      schemaVersion: "v2-six-subject-judge-plan-freeze-v1",
      experimentId: "v2-six-subject-run-1",
      judgePlan: {
        path: "benchmarks/results/v2-six-subject-run-1/judge-batch/plan.json",
        sha256: "860d7f750b9855a904f602191daeb321d34f968620962e6541e2fd1dc7a7004a",
        requestCounts: { total: 738, semantic: 369, pairwise: 369 },
        judgeModel: "gemini-3.5-flash",
        temperature: 0,
        promptVersions: { semantic: "semantic-judge-v1", pairwise: "pairwise-judge-v1" },
      },
    };
    const expectations = expectationsFromFreezeMetadata(meta);
    assert.deepEqual(expectations, {
      sha256: "860d7f750b9855a904f602191daeb321d34f968620962e6541e2fd1dc7a7004a",
      schemaVersion: "v2-six-subject-judge-batch-plan-v1",
      experimentId: "v2-six-subject-run-1",
      requestedJudgeModel: "gemini-3.5-flash",
      temperature: 0,
      totalRequests: 738,
      semanticRequests: 369,
      pairwiseRequests: 369,
      promptVersions: { semantic: "semantic-judge-v1", pairwise: "pairwise-judge-v1" },
    });
  });
});

describe("judge-plan: against the real frozen plan on disk (read-only, proves the fix against the actual artifact)", () => {
  const PLAN_FILE = new URL("../results/v2-six-subject-run-1/judge-batch/plan.json", import.meta.url);
  const FREEZE_FILE = new URL("../results/v2-six-subject-run-1/judge-batch/judge-plan-freeze.v1.json", import.meta.url);

  test("the real frozen plan.json validates cleanly against the real judge-plan-freeze.v1.json", () => {
    const rawText = readFileSync(PLAN_FILE, "utf8");
    const meta = JSON.parse(readFileSync(FREEZE_FILE, "utf8")) as FrozenJudgePlanMetadata;
    const plan = validateFrozenJudgePlan(rawText, expectationsFromFreezeMetadata(meta));
    assert.equal(plan.requests.length, 738);
    assert.equal(plan.requests.filter((r) => r.kind === "semantic").length, 369);
    assert.equal(plan.requests.filter((r) => r.kind === "pairwise").length, 369);
    assert.equal(sha256Hex(rawText), "860d7f750b9855a904f602191daeb321d34f968620962e6541e2fd1dc7a7004a");
  });
});

describe("judge-plan: A/B/C — mode separation is structurally enforced in judge-only.ts", () => {
  // Full runtime mocking of judge-only.ts's top-level script execution (which reads 369 real raw
  // artifacts and requires GEMINI_API_KEY/BENCHMARK_JUDGE_MODEL just to import) is impractical
  // without a much larger refactor of an intentionally simple CLI script. Instead this proves the
  // exact invariant the fix is for, directly against the source: the submit and collect branches
  // must call loadFrozenJudgePlan() and must NOT call preparePlan(); the plain-prepare branch must
  // still call preparePlan(). This mechanically fails if the regression this task fixes is ever
  // reintroduced, e.g. by someone restoring a shared `const plan = await preparePlan(runs)` above
  // the mode dispatch.
  const SOURCE = readFileSync(new URL("./judge-only.ts", import.meta.url), "utf8");

  function branchBody(condition: string, source: string, fromLast = false): string {
    const start = fromLast ? source.lastIndexOf(condition) : source.indexOf(condition);
    assert.ok(start >= 0, `could not find branch starting with ${JSON.stringify(condition)}`);
    const braceStart = source.indexOf("{", start);
    let depth = 0;
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        depth--;
        if (depth === 0) return source.slice(braceStart, i + 1);
      }
    }
    throw new Error("unbalanced braces");
  }

  test("B: the --submit-batch branch calls loadFrozenJudgePlan() and does not call preparePlan()", () => {
    const body = branchBody("if (submit) {", SOURCE);
    assert.match(body, /loadFrozenJudgePlan\(\)/);
    assert.doesNotMatch(body, /preparePlan\(/);
  });

  test("C: the --collect-batch branch calls loadFrozenJudgePlan() and does not call preparePlan()", () => {
    const body = branchBody("} else if (collect) {", SOURCE);
    assert.match(body, /loadFrozenJudgePlan\(\)/);
    assert.doesNotMatch(body, /preparePlan\(/);
  });

  test("A: the plain-prepare branch (neither flag) still calls preparePlan(), which is free to write a newly timestamped plan", () => {
    const body = branchBody("} else {", SOURCE, /* fromLast */ true);
    assert.match(body, /preparePlan\(runs\)/);
  });

  test("preparePlan() itself is unchanged in its intent: it still writes PLAN_PATH", () => {
    const body = branchBody("async function preparePlan(runs: NeutralRawRunV2[]) {", SOURCE);
    assert.match(body, /writeJson\(PLAN_PATH, plan\)/);
  });
});
