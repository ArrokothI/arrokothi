// Regression tests for the Gemini Batch API state-enum fix and two-pass collection validation
// (2026-08-23). Root cause: the collector previously checked JOB_STATE_* (an unrelated enum);
// the actual Gemini GenerateContent Batch API returns BATCH_STATE_* (confirmed directly by our
// own submission's create response: "state": "BATCH_STATE_PENDING"). A batch would never be
// recognized as SUCCEEDED, and the code would either poll forever or (worse, if a looser guard
// were used) mis-handle an in-progress job.
//
// Every function under test here is pure — no filesystem, no network — so "mock all network
// responses" is satisfied by construction: these tests hand-build the exact JSON shapes the real
// Gemini Batch API returns and never touch `fetch`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  classifyBatchState,
  extractInlineResponses,
  isCompatibleModelIdentity,
  resolveResponseKey,
  validateAndParseResponseItem,
  validateBatchEnvelope,
  type JudgeRequest,
} from "./judge-plan.ts";

describe("judge-collect: classifyBatchState (A-G) — the BATCH_STATE_* enum fix", () => {
  test("A: BATCH_STATE_PENDING -> pending, no result parsing", () => {
    assert.deepEqual(classifyBatchState("BATCH_STATE_PENDING"), { kind: "pending", state: "BATCH_STATE_PENDING" });
  });

  test("B: BATCH_STATE_RUNNING -> pending, no result parsing", () => {
    assert.deepEqual(classifyBatchState("BATCH_STATE_RUNNING"), { kind: "pending", state: "BATCH_STATE_RUNNING" });
  });

  test("C: BATCH_STATE_SUCCEEDED -> succeeded (collection path executes)", () => {
    assert.deepEqual(classifyBatchState("BATCH_STATE_SUCCEEDED"), { kind: "succeeded", state: "BATCH_STATE_SUCCEEDED" });
  });

  test("D: BATCH_STATE_FAILED -> terminal failure", () => {
    assert.deepEqual(classifyBatchState("BATCH_STATE_FAILED"), { kind: "terminal_failure", state: "BATCH_STATE_FAILED" });
  });

  test("E: BATCH_STATE_CANCELLED -> terminal failure", () => {
    assert.deepEqual(classifyBatchState("BATCH_STATE_CANCELLED"), { kind: "terminal_failure", state: "BATCH_STATE_CANCELLED" });
  });

  test("F: BATCH_STATE_EXPIRED -> terminal failure", () => {
    assert.deepEqual(classifyBatchState("BATCH_STATE_EXPIRED"), { kind: "terminal_failure", state: "BATCH_STATE_EXPIRED" });
  });

  test("G: unknown/missing/unspecified state never counts as success", () => {
    for (const state of ["BATCH_STATE_UNSPECIFIED", undefined, null, "", "SOME_FUTURE_STATE", 42]) {
      const result = classifyBatchState(state);
      assert.notEqual(result.kind, "succeeded", `state ${JSON.stringify(state)} must not classify as succeeded`);
      assert.equal(result.kind, "unknown", `state ${JSON.stringify(state)} should classify as unknown, got ${result.kind}`);
    }
  });

  test("legacy JOB_STATE_* values are NOT treated as an alias for BATCH_STATE_* (no backward-compat guessing without evidence)", () => {
    assert.equal(classifyBatchState("JOB_STATE_SUCCEEDED").kind, "unknown");
    assert.equal(classifyBatchState("JOB_STATE_FAILED").kind, "unknown");
    assert.equal(classifyBatchState("JOB_STATE_PENDING").kind, "unknown");
  });
});

describe("judge-collect: validateBatchEnvelope", () => {
  test("matching requestCount and zero pendingRequestCount passes", () => {
    const status = { metadata: { batchStats: { requestCount: "738", pendingRequestCount: "0" } } };
    const result = validateBatchEnvelope(status, { batchJobId: "batches/x", expectedRequestCount: 738 });
    assert.deepEqual(result, { requestCount: 738, pendingRequestCount: 0 });
  });

  test("requestCount mismatch is rejected", () => {
    const status = { metadata: { batchStats: { requestCount: "700", pendingRequestCount: "0" } } };
    assert.throws(() => validateBatchEnvelope(status, { batchJobId: "batches/x", expectedRequestCount: 738 }), /requestCount 700 does not match/);
  });

  test("nonzero pendingRequestCount on a SUCCEEDED batch is rejected as self-contradictory", () => {
    const status = { metadata: { batchStats: { requestCount: "738", pendingRequestCount: "3" } } };
    assert.throws(() => validateBatchEnvelope(status, { batchJobId: "batches/x", expectedRequestCount: 738 }), /self-contradictory/);
  });

  test("also reads a top-level batchStats (not only metadata.batchStats)", () => {
    const status = { batchStats: { requestCount: 5, pendingRequestCount: 0 } };
    assert.deepEqual(validateBatchEnvelope(status, { batchJobId: "batches/x", expectedRequestCount: 5 }), { requestCount: 5, pendingRequestCount: 0 });
  });
});

describe("judge-collect: extractInlineResponses", () => {
  test("reads dest.inlinedResponses.inlinedResponses", () => {
    const status = { dest: { inlinedResponses: { inlinedResponses: [{ a: 1 }] } } };
    assert.deepEqual(extractInlineResponses(status), [{ a: 1 }]);
  });
  test("falls back to [] when nothing matches", () => {
    assert.deepEqual(extractInlineResponses({}), []);
  });
});

describe("judge-collect: resolveResponseKey — metadata.key vs positional fallback", () => {
  const keys = ["semantic:a", "semantic:b", "pairwise:c"];

  test("prefers metadata.key when present and it agrees with the expected positional key", () => {
    const result = resolveResponseKey({ metadata: { key: "semantic:b" } }, 1, keys);
    assert.deepEqual(result, { key: "semantic:b", usedPositionalFallback: false });
  });

  test("falls back to the positional key when metadata.key is absent (documented order-preservation contract)", () => {
    const result = resolveResponseKey({}, 2, keys);
    assert.deepEqual(result, { key: "pairwise:c", usedPositionalFallback: true });
  });

  test("a metadata.key that disagrees with the expected positional key STOPS rather than silently remapping", () => {
    assert.throws(() => resolveResponseKey({ metadata: { key: "semantic:a" } }, 1, keys), /disagrees with the expected positional key "semantic:b"/);
  });

  test("an out-of-range index is rejected rather than resolving to undefined", () => {
    assert.throws(() => resolveResponseKey({}, 99, keys), /out of range/);
  });
});

describe("judge-collect: isCompatibleModelIdentity", () => {
  test("exact match is compatible", () => {
    assert.equal(isCompatibleModelIdentity("gemini-3.5-flash", "gemini-3.5-flash"), true);
  });
  test("models/ prefix is compatible", () => {
    assert.equal(isCompatibleModelIdentity("models/gemini-3.5-flash", "gemini-3.5-flash"), true);
  });
  test("a pinned version suffix is compatible", () => {
    assert.equal(isCompatibleModelIdentity("gemini-3.5-flash-002", "gemini-3.5-flash"), true);
    assert.equal(isCompatibleModelIdentity("models/gemini-3.5-flash-002", "gemini-3.5-flash"), true);
  });
  test("an unrelated model is NOT compatible", () => {
    assert.equal(isCompatibleModelIdentity("gemini-2.5-flash", "gemini-3.5-flash"), false);
    assert.equal(isCompatibleModelIdentity("gemini-3.5-flash-lite", "gemini-3.5-flash"), false);
  });
  test("missing modelVersion is not compatible", () => {
    assert.equal(isCompatibleModelIdentity(undefined, "gemini-3.5-flash"), false);
  });
});

describe("judge-collect: validateAndParseResponseItem — individual response validation", () => {
  const semanticRequest: JudgeRequest = {
    key: "semantic:x", kind: "semantic", id: "x", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t",
    parse: { expectedRequirementIds: ["P01-R01"], hardRequirementIds: [] },
  };
  const judgeFields = { provider: "gemini", requestedModel: "gemini-3.5-flash", temperature: 0, timestamp: "t" };
  const validSemanticText = JSON.stringify({
    schemaVersion: "semantic-judge-output-v1", promptVersion: "semantic-judge-v1",
    requirementResults: [{ requirementId: "P01-R01", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] }],
    hardSemanticViolations: [],
  });

  function itemWith(text: string, overrides: Record<string, any> = {}) {
    return { response: { modelVersion: "models/gemini-3.5-flash", candidates: [{ content: { parts: [{ text }] } }] }, ...overrides };
  }

  test("a well-formed semantic response validates and parses", () => {
    const result = validateAndParseResponseItem(itemWith(validSemanticText), semanticRequest, "gemini-3.5-flash", judgeFields, false);
    assert.equal(result.key, "semantic:x");
    assert.equal(result.reportedModelVersion, "models/gemini-3.5-flash");
    assert.equal((result.parsedOutput as any).requirementResults[0].requirementId, "P01-R01");
  });

  test("an item-level API error is rejected, not silently skipped", () => {
    assert.throws(() => validateAndParseResponseItem({ error: { code: 500, message: "boom" } }, semanticRequest, "gemini-3.5-flash", judgeFields, false), /item-level API error/);
  });

  test("a missing/empty GenerateContentResponse is rejected", () => {
    assert.throws(() => validateAndParseResponseItem({}, semanticRequest, "gemini-3.5-flash", judgeFields, false), /no GenerateContentResponse/);
  });

  test("a missing modelVersion is rejected", () => {
    const item = { response: { candidates: [{ content: { parts: [{ text: validSemanticText }] } }] } };
    assert.throws(() => validateAndParseResponseItem(item, semanticRequest, "gemini-3.5-flash", judgeFields, false), /missing modelVersion/);
  });

  test("an incompatible reported model identity is rejected", () => {
    const item = { response: { modelVersion: "gemini-2.5-flash", candidates: [{ content: { parts: [{ text: validSemanticText }] } }] } };
    assert.throws(() => validateAndParseResponseItem(item, semanticRequest, "gemini-3.5-flash", judgeFields, false), /incompatible with requested/);
  });

  test("empty output text is rejected", () => {
    assert.throws(() => validateAndParseResponseItem(itemWith(""), semanticRequest, "gemini-3.5-flash", judgeFields, false), /empty output text/);
  });

  test("malformed judge output is rejected, not manually repaired (delegates to parseSemanticJudgeOutput's own completeness checks)", () => {
    const malformed = JSON.stringify({ schemaVersion: "semantic-judge-output-v1", promptVersion: "semantic-judge-v1", requirementResults: [], hardSemanticViolations: [] });
    assert.throws(() => validateAndParseResponseItem(itemWith(malformed), semanticRequest, "gemini-3.5-flash", judgeFields, false), /missing semantic requirement result/);
  });

  test("a duplicate semantic requirement result is rejected", () => {
    const dup = JSON.stringify({
      schemaVersion: "semantic-judge-output-v1", promptVersion: "semantic-judge-v1",
      requirementResults: [
        { requirementId: "P01-R01", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] },
        { requirementId: "P01-R01", score: 1, confidence: 0.9, reason: "dupe", citedTurns: [1] },
      ],
      hardSemanticViolations: [],
    });
    assert.throws(() => validateAndParseResponseItem(itemWith(dup), semanticRequest, "gemini-3.5-flash", judgeFields, false), /duplicate semantic requirement/);
  });

  test("an unknown semantic requirement result is rejected", () => {
    const unknown = JSON.stringify({
      schemaVersion: "semantic-judge-output-v1", promptVersion: "semantic-judge-v1",
      requirementResults: [
        { requirementId: "P01-R01", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] },
        { requirementId: "P99-R99", score: 2, confidence: 0.9, reason: "unexpected", citedTurns: [1] },
      ],
      hardSemanticViolations: [],
    });
    assert.throws(() => validateAndParseResponseItem(itemWith(unknown), semanticRequest, "gemini-3.5-flash", judgeFields, false), /unknown semantic requirement/);
  });

  test("carries usedPositionalFallback through from the caller-supplied flag", () => {
    const result = validateAndParseResponseItem(itemWith(validSemanticText), semanticRequest, "gemini-3.5-flash", judgeFields, true);
    assert.equal(result.usedPositionalFallback, true);
  });

  test("none of this validation logic references fetch/network", () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error -- deliberately removing fetch to prove no code path here could reach it
    delete globalThis.fetch;
    try {
      assert.doesNotThrow(() => validateAndParseResponseItem(itemWith(validSemanticText), semanticRequest, "gemini-3.5-flash", judgeFields, false));
      assert.throws(() => validateAndParseResponseItem({}, semanticRequest, "gemini-3.5-flash", judgeFields, false));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("judge-collect: H — no submit call is reachable from collection", () => {
  const SOURCE = readFileSync(new URL("./judge-only.ts", import.meta.url), "utf8");

  function branchBody(condition: string, source: string): string {
    const start = source.indexOf(condition);
    assert.ok(start >= 0, `could not find ${JSON.stringify(condition)}`);
    const braceStart = source.indexOf("{", start);
    let depth = 0;
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") { depth--; if (depth === 0) return source.slice(braceStart, i + 1); }
    }
    throw new Error("unbalanced braces");
  }

  test("collectBatches() never calls submitBatches()", () => {
    const body = branchBody("async function collectBatches(plan: JudgeBatchPlan) {", SOURCE);
    assert.doesNotMatch(body, /submitBatches\(/);
  });

  test("the --collect-batch dispatch branch never calls submitBatches()", () => {
    const body = branchBody("} else if (collect) {", SOURCE);
    assert.doesNotMatch(body, /submitBatches\(/);
  });
});

describe("judge-collect: two-pass structure prevents partial writes (structural + logic proof)", () => {
  const SOURCE = readFileSync(new URL("./judge-only.ts", import.meta.url), "utf8");

  test("collectBatches() returns early with nothing written when any job is still pending", () => {
    assert.match(SOURCE, /if \(pendingJobs\.length\) \{\s*\n\s*return \{ pending: pendingJobs\.length,.*written: 0/s);
  });

  test("all writeJson(pathFor(\"semantic\"/\"pairwise\", ...)) calls happen only in the pass-2 loop, after pass 1's validation loop over jobs has fully completed", () => {
    const body = branchBody("async function collectBatches(plan: JudgeBatchPlan) {", SOURCE);
    const pass1End = body.indexOf("PASS 2");
    assert.ok(pass1End > 0, "expected a PASS 2 marker");
    const pass1 = body.slice(0, pass1End);
    assert.doesNotMatch(pass1, /writeJson\(pathFor\("semantic"/);
    assert.doesNotMatch(pass1, /writeJson\(pathFor\("pairwise"/);
    const pass2 = body.slice(pass1End);
    assert.match(pass2, /writeJson\(pathFor\("semantic"|writeJson\(pathFor\(`judge-metadata/);
  });

  function branchBody(condition: string, source: string): string {
    const start = source.indexOf(condition);
    const braceStart = source.indexOf("{", start);
    let depth = 0;
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") { depth--; if (depth === 0) return source.slice(braceStart, i + 1); }
    }
    throw new Error("unbalanced braces");
  }
});
