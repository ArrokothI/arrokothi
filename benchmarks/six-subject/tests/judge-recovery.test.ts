// Regression tests for offline judge-output recovery normalization (2026-08-23).
//
// Both normalizers under test here were derived from auditing the ACTUAL 98 malformed responses
// in the real, already-captured batch batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5 (see
// the original batch recovery audit) — every test fixture below reproduces an
// exact pattern observed in that real data, not a hypothetical. No network, no Gemini call.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import {
  extractLeadingJsonValue,
  injectMissingPairwiseFixedMetadata,
  normalizeHardSemanticViolations,
  normalizePairwiseJudgeSerialization,
  normalizeSemanticJudgeSerialization,
  unwrapPairwiseSchemaEcho,
  validateAndParseResponseItem,
  type JudgeRequest,
} from "../src/judge/plan.ts";

const judgeFields = { provider: "gemini", requestedModel: "gemini-3.5-flash", temperature: 0, timestamp: "t" };

function semanticRequest(expectedIds: string[]): JudgeRequest {
  return {
    key: "semantic:x", kind: "semantic", id: "x", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t",
    parse: { expectedRequirementIds: expectedIds, hardRequirementIds: [] },
  };
}

function semanticRequestWithHard(expectedIds: string[], hardIds: string[]): JudgeRequest {
  return {
    key: "semantic:x", kind: "semantic", id: "x", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t",
    parse: { expectedRequirementIds: expectedIds, hardRequirementIds: hardIds },
  };
}

function pairwiseRequestFor(...expectedCriteria: string[]): JudgeRequest {
  return {
    key: "pairwise:x", kind: "pairwise", id: "x", prompt: "{}", promptVersion: "pairwise-judge-v1", createdAt: "t", seed: "s",
    parse: { scenarioId: "S", assignment: { A: "l", B: "r" }, expectedCriteria, implementationAssignment: { A: "l", B: "r" } },
  };
}

function respondingWith(text: string) {
  return { response: { modelVersion: "gemini-3.5-flash", candidates: [{ content: { parts: [{ text }] } }] } };
}

function semanticText(requirementResults: unknown[], overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: "semantic-judge-output-v1", promptVersion: "semantic-judge-v1",
    requirementResults, hardSemanticViolations: [], ...overrides,
  });
}

describe("judge-recovery: normalizeSemanticJudgeSerialization — the narrow score-string normalizer", () => {
  test("A: numeric score 0/1/2 is left unchanged (applied: false)", () => {
    const raw = semanticText([{ requirementId: "P01-R01", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] }]);
    const result = normalizeSemanticJudgeSerialization(raw);
    assert.equal(result.applied, false);
    assert.equal(result.normalizedText, raw);
  });

  test("B: string \"0\"/\"1\"/\"2\" is normalized to the number and then parses successfully end to end", () => {
    for (const [stringScore, numericScore] of [["0", 0], ["1", 1], ["2", 2]] as const) {
      const raw = semanticText([{ requirementId: "P01-R01", score: stringScore, confidence: 0.9, reason: "ok", citedTurns: [1] }]);
      const normalized = normalizeSemanticJudgeSerialization(raw);
      assert.equal(normalized.applied, true, `score "${stringScore}" should be normalized`);
      const item = validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01"]), "gemini-3.5-flash", judgeFields, false);
      assert.equal(item.normalizationApplied, true);
      assert.deepEqual(item.normalizationSteps, ["score_string_to_number"]);
      assert.equal(item.rawProviderText, raw, "original raw text must be preserved unchanged alongside the normalized parse");
      assert.equal((item.parsedOutput as any).requirementResults[0].score, numericScore);
    }
  });

  test("C: \"2.0\" is NOT coerced -- still rejected by the strict parser", () => {
    const raw = semanticText([{ requirementId: "P01-R01", score: "2.0", confidence: 0.9, reason: "ok", citedTurns: [1] }]);
    assert.equal(normalizeSemanticJudgeSerialization(raw).applied, false);
    assert.throws(() => validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01"]), "gemini-3.5-flash", judgeFields, false), /score must be 0, 1, or 2/);
  });

  test("D: \"two\" is NOT coerced -- still rejected", () => {
    const raw = semanticText([{ requirementId: "P01-R01", score: "two", confidence: 0.9, reason: "ok", citedTurns: [1] }]);
    assert.equal(normalizeSemanticJudgeSerialization(raw).applied, false);
    assert.throws(() => validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01"]), "gemini-3.5-flash", judgeFields, false), /score must be 0, 1, or 2/);
  });

  test("E: \"3\" (out of range, even as a plausible-looking digit) is NOT coerced -- still rejected", () => {
    const raw = semanticText([{ requirementId: "P01-R01", score: "3", confidence: 0.9, reason: "ok", citedTurns: [1] }]);
    assert.equal(normalizeSemanticJudgeSerialization(raw).applied, false);
    assert.throws(() => validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01"]), "gemini-3.5-flash", judgeFields, false), /score must be 0, 1, or 2/);
  });

  test("F: null score is NOT coerced -- still rejected", () => {
    const raw = semanticText([{ requirementId: "P01-R01", score: null, confidence: 0.9, reason: "ok", citedTurns: [1] }]);
    assert.equal(normalizeSemanticJudgeSerialization(raw).applied, false);
    assert.throws(() => validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01"]), "gemini-3.5-flash", judgeFields, false), /score must be 0, 1, or 2/);
  });

  test("G: unrelated fields (confidence, reason, citedTurns, requirementId, hardSemanticViolations, schemaVersion, promptVersion) are untouched byte-for-byte", () => {
    const raw = semanticText(
      [{ requirementId: "P01-R01", score: "2", confidence: 0.87654321, reason: "a very specific reason string", citedTurns: [1, 3, 5] }],
      { hardSemanticViolations: ["P01-R09"] },
    );
    const normalized = normalizeSemanticJudgeSerialization(raw);
    const parsed = JSON.parse(normalized.normalizedText);
    assert.equal(parsed.requirementResults[0].confidence, 0.87654321);
    assert.equal(parsed.requirementResults[0].reason, "a very specific reason string");
    assert.deepEqual(parsed.requirementResults[0].citedTurns, [1, 3, 5]);
    assert.equal(parsed.requirementResults[0].requirementId, "P01-R01");
    assert.deepEqual(parsed.hardSemanticViolations, ["P01-R09"]);
    assert.equal(parsed.schemaVersion, "semantic-judge-output-v1");
    assert.equal(parsed.promptVersion, "semantic-judge-v1");
  });

  test("H: a normalized-score response that is otherwise missing an expected requirement result is still rejected (completeness check unaffected)", () => {
    const raw = semanticText([{ requirementId: "P01-R01", score: "2", confidence: 0.9, reason: "ok", citedTurns: [1] }]);
    assert.throws(
      () => validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01", "P01-R02"]), "gemini-3.5-flash", judgeFields, false),
      /missing semantic requirement result/,
    );
  });

  test("I: a normalized-score response with an unknown requirement id is still rejected", () => {
    const raw = semanticText([
      { requirementId: "P01-R01", score: "2", confidence: 0.9, reason: "ok", citedTurns: [1] },
      { requirementId: "P99-R99", score: "2", confidence: 0.9, reason: "unexpected", citedTurns: [1] },
    ]);
    assert.throws(() => validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01"]), "gemini-3.5-flash", judgeFields, false), /unknown semantic requirement/);
  });

  test("J: a normalized-score response with a duplicate requirement id is still rejected", () => {
    const raw = semanticText([
      { requirementId: "P01-R01", score: "2", confidence: 0.9, reason: "ok", citedTurns: [1] },
      { requirementId: "P01-R01", score: "1", confidence: 0.9, reason: "dupe", citedTurns: [1] },
    ]);
    assert.throws(() => validateAndParseResponseItem(respondingWith(raw), semanticRequest(["P01-R01"]), "gemini-3.5-flash", judgeFields, false), /duplicate semantic requirement/);
  });

  test("malformed (non-JSON) semantic text is passed through unchanged, not silently repaired", () => {
    const raw = "{not json";
    const result = normalizeSemanticJudgeSerialization(raw);
    assert.deepEqual(result, { normalizedText: raw, applied: false, steps: [] });
  });
});

describe("judge-recovery: extractLeadingJsonValue — trailing stray-delimiter trim", () => {
  test("a complete object followed only by an extra closing brace is recovered", () => {
    const text = '{"a":1}\n}';
    assert.equal(extractLeadingJsonValue(text), '{"a":1}');
  });

  test("a complete object followed only by whitespace is recovered unchanged", () => {
    const text = '{"a":1}\n\n  ';
    assert.equal(extractLeadingJsonValue(text), '{"a":1}');
  });

  test("PASS (fenced-JSON-shaped adversarial case is out of scope, no fence support needed/added): a plain complete object with no trailing content parses via the normal path, not this function", () => {
    assert.equal(extractLeadingJsonValue('{"a":1}'), '{"a":1}'); // still returns it; caller only invokes this on parse failure
  });

  test("FAIL: two competing top-level JSON objects -- refuses, does not pick either", () => {
    const text = '{"a":1}\n{"a":2}';
    assert.equal(extractLeadingJsonValue(text), null);
  });

  test("FAIL: prose after the object -- refuses (only stray whitespace/delimiters are accepted, not arbitrary trailing content)", () => {
    const text = '{"a":1}\nThe assistant chose option A because...';
    assert.equal(extractLeadingJsonValue(text), null);
  });

  test("FAIL: genuinely truncated JSON (never returns to depth 0) -- refuses, does not guess a brace count", () => {
    const text = '{"a":1,"b":{"c":2';
    assert.equal(extractLeadingJsonValue(text), null);
  });

  test("FAIL: empty or non-JSON-looking text returns null", () => {
    assert.equal(extractLeadingJsonValue(""), null);
    assert.equal(extractLeadingJsonValue("just some prose"), null);
  });

  test("string content containing brace-like characters does not confuse the depth counter", () => {
    const text = '{"reason":"uses a brace like this: } inside a string"}\n}';
    assert.equal(extractLeadingJsonValue(text), '{"reason":"uses a brace like this: } inside a string"}');
  });
});

describe("judge-recovery: unwrapPairwiseSchemaEcho — outputSchema-wrapper unwrap", () => {
  const complete = { schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "B", criteria: [{ criterion: "correctness", preference: "B", reason: "r" }], reason: "overall" };

  test("an already-complete top-level shape is returned unchanged (applied: false)", () => {
    const result = unwrapPairwiseSchemaEcho(complete);
    assert.equal(result.applied, false);
    assert.deepEqual(result.value, complete);
  });

  test("a wrapper with a complete nested outputSchema is unwrapped", () => {
    const wrapped = { promptVersion: "pairwise-judge-v1", instruction: "...", outputSchema: complete };
    const result = unwrapPairwiseSchemaEcho(wrapped);
    assert.equal(result.applied, true);
    assert.deepEqual(result.value, complete);
  });

  test("a wrapper whose outputSchema is INCOMPLETE (missing verdict) is left unchanged -- never inferred", () => {
    const incomplete = { schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", criteria: [], reason: "overall" };
    const wrapped = { promptVersion: "pairwise-judge-v1", outputSchema: incomplete };
    const result = unwrapPairwiseSchemaEcho(wrapped);
    assert.equal(result.applied, false);
    assert.deepEqual(result.value, wrapped);
  });

  test("no outputSchema at all and not already complete -- left unchanged", () => {
    const nothing = { verdict: "B" }; // missing schemaVersion/criteria/reason, no outputSchema either
    const result = unwrapPairwiseSchemaEcho(nothing);
    assert.equal(result.applied, false);
  });
});

describe("judge-recovery: normalizePairwiseJudgeSerialization + validateAndParseResponseItem — end to end on the REAL 8 failed responses", () => {
  async function fixture(name: string): Promise<{ key: string; text: string }[]> {
    return JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
  }

  // Each real captured response only carries the criteria subset criteriaFor() actually asked
  // for in that scenario's own prompt (not always all six) — matched here per key from what the
  // real fixture data itself contains, so these tests assert against the real prompt's contract
  // rather than an arbitrary superset.
  const EXPECTED_CRITERIA_BY_KEY: Record<string, string[]> = {
    "pairwise:P01-V2-S09-r01-p01-original-vs-p01-arrokothai": ["correctness", "correction_handling", "usefulness", "conversational_coherence"],
    "pairwise:P01-V2-S12-r01-p01-agenerateor-vs-p01-arrokothai": ["correctness", "truthfulness", "usefulness", "conversational_coherence"],
    "pairwise:P01-V2-S12-r03-p01-original-vs-p01-agenerateor": ["correctness", "truthfulness", "usefulness", "conversational_coherence"],
    "pairwise:P01-V2-S18-r02-p01-agenerateor-vs-p01-arrokothai": ["correctness", "grounding", "correction_handling", "truthfulness", "usefulness", "conversational_coherence"],
    "pairwise:P01-V2-S12-r03-p01-original-vs-p01-arrokothai": ["correctness", "truthfulness", "usefulness", "conversational_coherence"],
    "pairwise:P02-V2-S16-r04-p02-original-vs-p02-agenerateor": ["correctness", "truthfulness", "usefulness", "conversational_coherence"],
    "pairwise:P02-V2-S07-r02-p02-original-vs-p02-arrokothai": ["correctness", "correction_handling", "usefulness", "conversational_coherence"],
  };

  const pairwiseRequest = (key: string): JudgeRequest => ({
    key, kind: "pairwise", id: key.replace(/^pairwise:/, ""), prompt: "{}", promptVersion: "pairwise-judge-v1", createdAt: "t", seed: "s",
    parse: {
      scenarioId: "P01-V2-S01", assignment: { A: "left", B: "right" },
      expectedCriteria: EXPECTED_CRITERIA_BY_KEY[key] ?? ["correctness", "grounding", "correction_handling", "truthfulness", "usefulness", "conversational_coherence"],
      implementationAssignment: { A: "left", B: "right" },
    },
  });

  test("category A (4x outputSchema-echo, complete): P01-V2-S09-r01, P01-V2-S12-r01, P01-V2-S12-r03(orig-vs-agen), P01-V2-S18-r02 all recover via unwrap alone", async () => {
    const cases = await fixture("pairwise-category-a-schema-echo.json");
    assert.equal(cases.length, 4);
    for (const { key, text } of cases) {
      const normalized = normalizePairwiseJudgeSerialization(text, "pairwise-judge-v1");
      assert.equal(normalized.applied, true, key);
      assert.deepEqual(normalized.steps, ["unwrapped_outputSchema_echo"], key);
      const item = validateAndParseResponseItem(respondingWith(text), pairwiseRequest(key), "gemini-3.5-flash", judgeFields, false);
      assert.equal(item.normalizationApplied, true);
      assert.equal(item.rawProviderText, text);
      assert.ok(["A", "B", "tie", "both_bad"].includes((item.parsedOutput as any).verdict));
    }
  });

  test("category A (2x trailing stray brace, complete once trimmed): P01-V2-S12-r03(orig-vs-arrok), P02-V2-S16-r04 recover via trim alone", async () => {
    const cases = await fixture("pairwise-category-a-trailing-brace.json");
    assert.equal(cases.length, 2);
    for (const { key, text } of cases) {
      const normalized = normalizePairwiseJudgeSerialization(text, "pairwise-judge-v1");
      assert.equal(normalized.applied, true, key);
      assert.deepEqual(normalized.steps, ["trimmed_trailing_stray_delimiters"], key);
      const item = validateAndParseResponseItem(respondingWith(text), pairwiseRequest(key), "gemini-3.5-flash", judgeFields, false);
      assert.equal(item.normalizationApplied, true);
      assert.ok(["A", "B", "tie", "both_bad"].includes((item.parsedOutput as any).verdict));
    }
  });

  test("category B (genuinely truncated JSON, P01-V2-S11-r03): NOT recovered -- remains rejected, not guessed at", async () => {
    const cases = await fixture("pairwise-category-b-truncated.json");
    const { key, text } = cases[0]!;
    const normalized = normalizePairwiseJudgeSerialization(text, "pairwise-judge-v1");
    assert.equal(normalized.applied, false, key);
    assert.throws(() => validateAndParseResponseItem(respondingWith(text), pairwiseRequest(key), "gemini-3.5-flash", judgeFields, false));
  });

  test("category B (trailing brace trims clean, and the recovered object is missing only the fixed schemaVersion/promptVersion metadata, P02-V2-S07-r02): recovered end to end via trim + fixed-metadata injection", async () => {
    const cases = await fixture("pairwise-category-b-missing-schema-fields.json");
    const { key, text } = cases[0]!;
    // The trailing-delimiter trim succeeds structurally (there IS a complete top-level object once
    // the stray brace is trimmed), and the only thing missing from that object is the fixed
    // schemaVersion/promptVersion metadata -- both protocol constants whose correct values are
    // never in doubt (schemaVersion is always "pairwise-judge-output-v1"; promptVersion is always
    // the request's own frozen promptVersion). verdict/criteria/preference/reasons are left
    // completely untouched. This is the approved, narrow fixed-metadata injection rule -- it does
    // not infer or repair any actual judgment content, only completes known-constant identity
    // fields that the strict parser would otherwise reject on.
    const normalized = normalizePairwiseJudgeSerialization(text, "pairwise-judge-v1");
    assert.equal(normalized.applied, true, key);
    assert.deepEqual(normalized.steps, ["trimmed_trailing_stray_delimiters", "injected_missing_schema_version", "injected_missing_prompt_version"], key);
    const item = validateAndParseResponseItem(respondingWith(text), pairwiseRequest(key), "gemini-3.5-flash", judgeFields, false);
    assert.equal(item.normalizationApplied, true);
    assert.equal(item.rawProviderText, text, "original raw text must be preserved unchanged alongside the normalized parse");
    assert.equal((item.parsedOutput as any).verdict, "B");
  });
});

describe("judge-recovery: adversarial -- ambiguous malformed pairwise responses stay rejected", () => {
  test("two competing top-level JSON objects: refuses to pick a winner", () => {
    const text = JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "A", criteria: [], reason: "first" })
      + "\n"
      + JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "B", criteria: [], reason: "second" });
    const normalized = normalizePairwiseJudgeSerialization(text, "pairwise-judge-v1");
    assert.equal(normalized.applied, false);
    assert.throws(() => validateAndParseResponseItem(respondingWith(text), { key: "pairwise:x", kind: "pairwise", id: "x", prompt: "{}", promptVersion: "pairwise-judge-v1", createdAt: "t", seed: "s", parse: { scenarioId: "S", assignment: { A: "l", B: "r" }, expectedCriteria: [], implementationAssignment: {} } }, "gemini-3.5-flash", judgeFields, false));
  });

  test("verdict missing entirely, with prose explaining a preference: never inferred from prose", () => {
    const text = JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", criteria: [], reason: "Candidate A is clearly better because..." });
    const normalized = normalizePairwiseJudgeSerialization(text, "pairwise-judge-v1");
    assert.equal(normalized.applied, false);
  });

  test("a verdict value outside the closed enum (case variant with ambiguous intent) is not coerced -- no case-normalization rule was introduced since none was needed by the actual evidence", () => {
    const text = JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "left", criteria: [{ criterion: "correctness", preference: "A", reason: "r" }], reason: "overall" });
    const normalized = normalizePairwiseJudgeSerialization(text, "pairwise-judge-v1");
    assert.equal(normalized.applied, false);
  });
});

// FINAL OFFLINE PROTOCOL-NORMALIZATION AUDIT (2026-08-23): the two rules below were derived from
// auditing the exact remaining 5 semantic + 2 pairwise still-invalid keys after retry attempt 2
// (see the preserved attempt-2 validation report). Both rules are purely mechanical
// domain-exclusion / known-constant completion -- neither infers, reinterprets, or repairs actual
// judgment content (scores, reasons, verdicts, preferences are never touched).
describe("judge-recovery: normalizeHardSemanticViolations -- narrow expected-but-non-hard id removal", () => {
  test("PASS: an id that is expected but NOT hard-capable for this rubric is removed", () => {
    const result = normalizeHardSemanticViolations(["P02-R05"], ["P02-R05", "P02-R09"], []);
    assert.equal(result.applied, true);
    assert.deepEqual(result.violations, []);
  });

  test("PASS: a valid hard-capable id (present in hardRequirementIds) is left in place", () => {
    const result = normalizeHardSemanticViolations(["P02-R09"], ["P02-R05", "P02-R09"], ["P02-R09"]);
    assert.equal(result.applied, false);
    assert.deepEqual(result.violations, ["P02-R09"]);
  });

  test("FAIL: an id that is not even in expectedRequirementIds (truly unknown) is NOT removed -- left for the strict parser to reject on its own", () => {
    const result = normalizeHardSemanticViolations(["P99-R99"], ["P02-R05", "P02-R09"], ["P02-R09"]);
    assert.equal(result.applied, false);
    assert.deepEqual(result.violations, ["P99-R99"]);
    const raw = semanticText([{ requirementId: "P02-R05", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] }], { hardSemanticViolations: ["P99-R99"] });
    assert.throws(
      () => validateAndParseResponseItem(respondingWith(raw), semanticRequestWithHard(["P02-R05"], ["P02-R09"]), "gemini-3.5-flash", judgeFields, false),
      /non-hard or unknown requirement id/,
    );
  });

  test("FAIL: a duplicate hard-violation id is still rejected end to end -- normalization does not dedupe", () => {
    const raw = semanticText([{ requirementId: "P02-R09", score: 0, confidence: 0.9, reason: "ok", citedTurns: [1] }], { hardSemanticViolations: ["P02-R09", "P02-R09"] });
    assert.throws(
      () => validateAndParseResponseItem(respondingWith(raw), semanticRequestWithHard(["P02-R09"], ["P02-R09"]), "gemini-3.5-flash", judgeFields, false),
      /duplicate hardSemanticViolations/,
    );
  });

  test("mixed: one valid hard id + one expected-but-non-hard id -- only the valid hard id is kept, and the response is recovered end to end", () => {
    const result = normalizeHardSemanticViolations(["P02-R09", "P02-R05"], ["P02-R05", "P02-R09"], ["P02-R09"]);
    assert.equal(result.applied, true);
    assert.deepEqual(result.violations, ["P02-R09"]);

    const raw = semanticText(
      [
        { requirementId: "P02-R05", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] },
        { requirementId: "P02-R09", score: 0, confidence: 0.9, reason: "hard fail", citedTurns: [2] },
      ],
      { hardSemanticViolations: ["P02-R09", "P02-R05"] },
    );
    const item = validateAndParseResponseItem(respondingWith(raw), semanticRequestWithHard(["P02-R05", "P02-R09"], ["P02-R09"]), "gemini-3.5-flash", judgeFields, false);
    assert.equal(item.normalizationApplied, true);
    assert.deepEqual(item.normalizationSteps, ["removed_non_hard_semantic_violation_annotation"]);
    assert.equal(item.rawProviderText, raw, "original raw text must be preserved unchanged alongside the normalized parse");
    assert.deepEqual((item.parsedOutput as any).hardSemanticViolations, ["P02-R09"]);
  });
});

describe("judge-recovery: injectMissingPairwiseFixedMetadata -- narrow fixed-metadata completion", () => {
  const validJudgment = { verdict: "B", criteria: [{ criterion: "correctness", preference: "B", reason: "r" }], reason: "overall" };

  test("PASS: only schemaVersion missing -- injected, promptVersion left as-is", () => {
    const parsed = { ...validJudgment, promptVersion: "pairwise-judge-v1" };
    const result = injectMissingPairwiseFixedMetadata(parsed, "pairwise-judge-v1");
    assert.equal(result.applied, true);
    assert.deepEqual(result.steps, ["injected_missing_schema_version"]);
    assert.equal((result.value as any).schemaVersion, "pairwise-judge-output-v1");
    assert.equal((result.value as any).promptVersion, "pairwise-judge-v1");
  });

  test("PASS: only promptVersion missing -- injected, schemaVersion left as-is", () => {
    const parsed = { ...validJudgment, schemaVersion: "pairwise-judge-output-v1" };
    const result = injectMissingPairwiseFixedMetadata(parsed, "pairwise-judge-v1");
    assert.equal(result.applied, true);
    assert.deepEqual(result.steps, ["injected_missing_prompt_version"]);
    assert.equal((result.value as any).promptVersion, "pairwise-judge-v1");
  });

  test("PASS: both missing, judgment content otherwise valid -- both injected", () => {
    const result = injectMissingPairwiseFixedMetadata(validJudgment, "pairwise-judge-v1");
    assert.equal(result.applied, true);
    assert.deepEqual(result.steps, ["injected_missing_schema_version", "injected_missing_prompt_version"]);
    assert.equal((result.value as any).schemaVersion, "pairwise-judge-output-v1");
    assert.equal((result.value as any).promptVersion, "pairwise-judge-v1");
    assert.deepEqual((result.value as any).verdict, "B");
    assert.deepEqual((result.value as any).criteria, validJudgment.criteria);
    assert.equal((result.value as any).reason, "overall");
  });

  test("FAIL: schemaVersion present but WRONG -- not touched, not treated as missing", () => {
    const parsed = { ...validJudgment, schemaVersion: "pairwise-judge-output-v0", promptVersion: "pairwise-judge-v1" };
    const result = injectMissingPairwiseFixedMetadata(parsed, "pairwise-judge-v1");
    assert.equal(result.applied, false);
    assert.deepEqual(result.value, parsed);
  });

  test("FAIL: promptVersion present but WRONG -- not touched, not treated as missing", () => {
    const parsed = { ...validJudgment, schemaVersion: "pairwise-judge-output-v1", promptVersion: "some-other-version" };
    const result = injectMissingPairwiseFixedMetadata(parsed, "pairwise-judge-v1");
    assert.equal(result.applied, false);
    assert.deepEqual(result.value, parsed);
  });

  test("FAIL: verdict missing -- metadata injection alone cannot complete the shape, refuses", () => {
    const parsed = { criteria: [{ criterion: "correctness", preference: "B", reason: "r" }], reason: "overall" };
    const result = injectMissingPairwiseFixedMetadata(parsed, "pairwise-judge-v1");
    assert.equal(result.applied, false);
    assert.deepEqual(result.value, parsed);
  });

  test("FAIL: a criterion the request expects is missing entirely -- metadata gets completed (structurally valid, just incomplete relative to what THIS request expected), but validateAndParseResponseItem still rejects it for the missing expected criterion; judgment content is never invented to paper over it", () => {
    const text = JSON.stringify({ verdict: "B", criteria: [], reason: "overall" }); // schemaVersion/promptVersion both absent too
    assert.throws(
      () => validateAndParseResponseItem(respondingWith(text), pairwiseRequestFor("correctness"), "gemini-3.5-flash", judgeFields, false),
      /missing pairwise criteri/i,
    );
  });

  test("FAIL: duplicate/unknown criteria still rejected end to end even after metadata injection", () => {
    const text = JSON.stringify({
      verdict: "B",
      criteria: [
        { criterion: "correctness", preference: "B", reason: "r1" },
        { criterion: "correctness", preference: "A", reason: "r2 (duplicate criterion)" },
      ],
      reason: "overall",
    });
    assert.throws(
      () => validateAndParseResponseItem(respondingWith(text), pairwiseRequestFor("correctness"), "gemini-3.5-flash", judgeFields, false),
      /duplicate|unexpected|unknown/i,
    );
  });

  test("end to end: schemaVersion + promptVersion both missing, judgment otherwise complete -- recovered via validateAndParseResponseItem", () => {
    const text = JSON.stringify(validJudgment);
    const item = validateAndParseResponseItem(respondingWith(text), pairwiseRequestFor("correctness"), "gemini-3.5-flash", judgeFields, false);
    assert.equal(item.normalizationApplied, true);
    assert.deepEqual(item.normalizationSteps, ["injected_missing_schema_version", "injected_missing_prompt_version"]);
    assert.equal(item.rawProviderText, text, "original raw text must be preserved unchanged alongside the normalized parse");
    assert.equal((item.parsedOutput as any).verdict, "B");
  });

  test("end to end: schemaVersion present but WRONG -- rejected, never silently corrected", () => {
    const text = JSON.stringify({ ...validJudgment, schemaVersion: "pairwise-judge-output-v0", promptVersion: "pairwise-judge-v1" });
    assert.throws(() => validateAndParseResponseItem(respondingWith(text), pairwiseRequestFor("correctness"), "gemini-3.5-flash", judgeFields, false), /schemaVersion/);
  });

  test("end to end: promptVersion present but WRONG -- rejected, never silently corrected", () => {
    const text = JSON.stringify({ ...validJudgment, schemaVersion: "pairwise-judge-output-v1", promptVersion: "some-other-version" });
    assert.throws(() => validateAndParseResponseItem(respondingWith(text), pairwiseRequestFor("correctness"), "gemini-3.5-flash", judgeFields, false), /promptVersion/);
  });
});
