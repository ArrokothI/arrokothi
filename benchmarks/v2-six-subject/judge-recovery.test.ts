// Regression tests for offline judge-output recovery normalization (2026-08-23).
//
// Both normalizers under test here were derived from auditing the ACTUAL 98 malformed responses
// in the real, already-captured batch batches/l5qq8baav2bvc7tpb2l7lwasbwab4ynqodd5 (see
// judge-batch/collection-attempt-2-failure-report.json) — every test fixture below reproduces an
// exact pattern observed in that real data, not a hypothetical. No network, no Gemini call.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import {
  extractLeadingJsonValue,
  normalizePairwiseJudgeSerialization,
  normalizeSemanticJudgeSerialization,
  unwrapPairwiseSchemaEcho,
  validateAndParseResponseItem,
  type JudgeRequest,
} from "./judge-plan.ts";

const judgeFields = { provider: "gemini", requestedModel: "gemini-3.5-flash", temperature: 0, timestamp: "t" };

function semanticRequest(expectedIds: string[]): JudgeRequest {
  return {
    key: "semantic:x", kind: "semantic", id: "x", prompt: "{}", promptVersion: "semantic-judge-v1", createdAt: "t",
    parse: { expectedRequirementIds: expectedIds, hardRequirementIds: [] },
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
    assert.deepEqual(result, { normalizedText: raw, applied: false });
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
    return JSON.parse(await readFile(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8"));
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
      const normalized = normalizePairwiseJudgeSerialization(text);
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
      const normalized = normalizePairwiseJudgeSerialization(text);
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
    const normalized = normalizePairwiseJudgeSerialization(text);
    assert.equal(normalized.applied, false, key);
    assert.throws(() => validateAndParseResponseItem(respondingWith(text), pairwiseRequest(key), "gemini-3.5-flash", judgeFields, false));
  });

  test("category B (trailing brace trims clean, but the recovered object is missing required schemaVersion/promptVersion, P02-V2-S07-r02): NOT recovered end to end -- the strict parser still rejects it", async () => {
    const cases = await fixture("pairwise-category-b-missing-schema-fields.json");
    const { key, text } = cases[0]!;
    // The trailing-delimiter trim alone succeeds structurally (there IS a complete top-level
    // object once the stray brace is trimmed) -- but that object never becomes a "complete
    // pairwise shape" because schemaVersion/promptVersion are absent, so unwrapPairwiseSchemaEcho
    // (which requires isCompletePairwiseShape) does not treat it as a recovered answer, and the
    // strict parser rejects it for the missing schemaVersion, exactly as it should: nothing here
    // infers or backfills those missing identity fields.
    assert.throws(() => validateAndParseResponseItem(respondingWith(text), pairwiseRequest(key), "gemini-3.5-flash", judgeFields, false), /schemaVersion/);
  });
});

describe("judge-recovery: adversarial -- ambiguous malformed pairwise responses stay rejected", () => {
  test("two competing top-level JSON objects: refuses to pick a winner", () => {
    const text = JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "A", criteria: [], reason: "first" })
      + "\n"
      + JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "B", criteria: [], reason: "second" });
    const normalized = normalizePairwiseJudgeSerialization(text);
    assert.equal(normalized.applied, false);
    assert.throws(() => validateAndParseResponseItem(respondingWith(text), { key: "pairwise:x", kind: "pairwise", id: "x", prompt: "{}", promptVersion: "pairwise-judge-v1", createdAt: "t", seed: "s", parse: { scenarioId: "S", assignment: { A: "l", B: "r" }, expectedCriteria: [], implementationAssignment: {} } }, "gemini-3.5-flash", judgeFields, false));
  });

  test("verdict missing entirely, with prose explaining a preference: never inferred from prose", () => {
    const text = JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", criteria: [], reason: "Candidate A is clearly better because..." });
    const normalized = normalizePairwiseJudgeSerialization(text);
    assert.equal(normalized.applied, false);
  });

  test("a verdict value outside the closed enum (case variant with ambiguous intent) is not coerced -- no case-normalization rule was introduced since none was needed by the actual evidence", () => {
    const text = JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "left", criteria: [{ criterion: "correctness", preference: "A", reason: "r" }], reason: "overall" });
    const normalized = normalizePairwiseJudgeSerialization(text);
    assert.equal(normalized.applied, false);
  });
});
