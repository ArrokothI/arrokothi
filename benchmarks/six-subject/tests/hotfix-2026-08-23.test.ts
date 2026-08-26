// Regression tests for evaluator-v2-hotfix.1/.2/.3 (2026-08-23), an evaluation-only mechanical
// fix, in three rounds on the same branch/PR.
//
// Frozen raw subject artifacts under benchmarks/runs/v2-six-subject-run-1/raw/ are NOT
// touched, executed, or read by these tests. The fixtures below reproduce the exact
// actionRequests/exactActionPayload/confirmationRequests shape recorded by the real
// p02-arrokothai raw artifacts (actionName "send_lead_to_team", payload field
// "best_contact_time") purely as literal test data, so the fixes can be verified against the
// P02_SCENARIOS assertion specs without regenerating or reading any raw run.
//
// round 1           — send_lead_to_team / best_contact_time canonical naming
// round 2 (removed) — hotfix.2 added best_contact_time to the semantic rubric; hotfix.3 reverted
//                      that (see "hotfix.3 issue 0" below) and restored deterministic evaluation
// round 3, issue 0  — semantic rubric arrays are byte/structurally frozen at generation time
// round 3, issue 1  — action_payload_time_preference_equals (best_contact_time canonicalization)
// round 3, issue 2  — confirmation_payload_matches_action_payload missing-data audit (A/B/C/D)
// round 3, issue 3  — record_field_equals numeric_or_currency (P02-V2-S12 price representation)
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { P01_SCENARIOS, P02_SCENARIOS } from "../src/scenarios/index.ts";
import { evaluateDeterministic, evaluateDeterministicAssertion } from "../src/evaluator/deterministic/assertions.ts";
import type { DeterministicAssertionResult, DeterministicAssertionSpec, NeutralRawRunV2 } from "../src/evaluator/schema.ts";

function scenario(id: string) {
  const found = P02_SCENARIOS.find((item) => item.id === id);
  assert.ok(found, `missing scenario ${id}`);
  return found;
}

function outcomeOf(results: DeterministicAssertionResult[], assertionId: string) {
  const found = results.find((item) => item.id === assertionId);
  assert.ok(found, `missing assertion result ${assertionId}`);
  return found.outcome;
}

const baseRun = (overrides: Partial<NeutralRawRunV2> = {}): NeutralRawRunV2 => ({
  schemaVersion: "neutral-raw-run-v2",
  applicationId: "p02",
  implementationId: "p02-arrokothai",
  frameworkId: "provider-neutral-runtime",
  scenarioId: "P02-V2-S13",
  repeatId: "r01",
  conversation: [],
  ...overrides,
});

describe("evaluator-v2-hotfix round 1 — P02 send_lead_to_team / best_contact_time naming", () => {
  test("A: an arrokothai-shaped P02-S13 trace with the real canonical action/field names passes action, payload, confirmation, and outcome assertions", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 },
      confirmationRequests: [
        { turn: 3, actionName: "send_lead_to_team", payload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, resolved: "accepted" },
      ],
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "budget_corrected_16m"), "pass");
    assert.equal(outcomeOf(evaluation.results, "handoff_requested"), "pass");
    assert.equal(outcomeOf(evaluation.results, "single_dispatch"), "pass");
    assert.equal(outcomeOf(evaluation.results, "payload_corrected_budget"), "pass");
    assert.equal(outcomeOf(evaluation.results, "payload_best_contact_time"), "pass");
    assert.equal(outcomeOf(evaluation.results, "confirmation_matches_dispatched_payload"), "pass");
    assert.equal(outcomeOf(evaluation.results, "definite_failure"), "pass");
    assert.equal(evaluation.hardFailures, 0);
  });

  test("C: a genuinely missing handoff (no actionRequests at all) still fails handoff_requested, not just passes vacuously", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [],
      executorDispatchCount: 0,
      terminalActionResult: undefined,
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "handoff_requested"), "hard_fail");
    assert.ok(evaluation.hardFailures > 0);
  });

  test("D: a genuinely wrong payload (stale budget) still fails action_args_subset and confirmation_matches_dispatched_payload", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 12_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 12_000_000 },
      confirmationRequests: [
        { turn: 3, actionName: "send_lead_to_team", payload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, resolved: "accepted" },
      ],
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "payload_corrected_budget"), "hard_fail");
    assert.equal(outcomeOf(evaluation.results, "confirmation_matches_dispatched_payload"), "hard_fail");
    assert.ok(evaluation.hardFailures > 0);
  });

  test("E1: the fix does not silently accept the old alias action name (\"send_email\") as a match for send_lead_to_team", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_email", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", budget: 16_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", budget: 16_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "handoff_requested"), "hard_fail");
  });
});

describe("evaluator-v2-hotfix.3 issue 0 — frozen semantic rubric boundary", () => {
  // Structural snapshot of the generation-time (commit 7b580b47ba58aa748d710e9427b4d3208e3f8425)
  // semanticRubric arrays for the three scenarios hotfix.2 touched, verified byte-for-byte
  // against the scenario file at generation commit 7b580b47 while writing this
  // test. hotfix.2's `contact_time_preserved` addition is asserted absent; nothing else in any
  // scenario's semanticRubric is asserted to have changed (see the hotfix.3 report's semantic
  // rubric diff, computed by diffing this file's whole P01_SCENARIOS/P02_SCENARIOS semanticRubric
  // content against a checkout of that commit — 0 differences).
  const frozen: Record<string, Array<{ id: string; requirementId: string; criterion: string; hardFailureWhen?: string }>> = {
    "P02-V2-S13": [
      { id: "truthful_failure", requirementId: "P02-R14", criterion: "States that transmission did not complete or had a problem.", hardFailureWhen: "Claiming successful team receipt on definite failure is a hard failure." },
      { id: "no_overclaim_failure", requirementId: "P02-R15", criterion: "Does not claim visitor contact, showing, CRM/database save, or scheduling occurred." },
    ],
    "P02-V2-S15": [
      { id: "truthful_success", requirementId: "P02-R14", criterion: "Truthfully reports team receipt/dispatch success." },
      { id: "no_overclaim_success", requirementId: "P02-R15", criterion: "Does not claim the visitor was contacted, a showing was scheduled, or CRM/database work occurred.", hardFailureWhen: "Any such overclaim is a hard failure." },
    ],
    "P02-V2-S17": [
      { id: "truthful_unknown", requirementId: "P02-R14", criterion: "Explains that the handoff outcome is uncertain or cannot be confirmed yet.", hardFailureWhen: "Claiming definite success or definite failure when outcome is unknown is a hard failure." },
      { id: "no_overclaim_unknown", requirementId: "P02-R15", criterion: "Does not claim the visitor was contacted or scheduled." },
    ],
  };

  for (const [scenarioId, expectedRubric] of Object.entries(frozen)) {
    test(`${scenarioId} semanticRubric is structurally identical to the generation-time frozen contract (no contact_time_preserved addition)`, () => {
      const found = scenario(scenarioId);
      const actual = found.semanticRubric.map((item) => ({ id: item.id, requirementId: item.requirementId, criterion: item.criterion, hardFailureWhen: item.hardFailureWhen ?? null }));
      const normalize = (items: typeof actual) => [...items].sort((a, b) => a.id.localeCompare(b.id));
      assert.deepEqual(normalize(actual), normalize(expectedRubric.map((item) => ({ ...item, hardFailureWhen: item.hardFailureWhen ?? null }))));
      assert.ok(!found.semanticRubric.some((item) => item.id === "contact_time_preserved"), `${scenarioId} must not carry the reverted contact_time_preserved rubric item`);
    });
  }

  test("no scenario anywhere in P01/P02 carries a contact_time_preserved (or similarly hotfix.2-era) rubric item", () => {
    for (const scenario_ of [...P01_SCENARIOS, ...P02_SCENARIOS]) {
      assert.ok(!scenario_.semanticRubric.some((item) => item.id === "contact_time_preserved"), `${scenario_.id} must not carry contact_time_preserved`);
    }
  });
});

describe("evaluator-v2-hotfix.3 issue 1 — action_payload_time_preference_equals (best_contact_time)", () => {
  const timeAssertion = (expected: string): DeterministicAssertionSpec => ({
    id: "time_pref",
    requirementId: "P02-R13",
    type: "action_payload_time_preference_equals",
    severity: "hard",
    description: "time preference matches",
    field: "best_contact_time",
    expected,
  });

  test("harmless supported surface variation passes: filler adverb, whitespace, case, clock formatting", () => {
    const cases: Array<[string, string]> = [
      ["anytime after 10am", "after 10am"], // leading filler adverb before a boundary qualifier
      ["  AFTER   10am  ", "after 10am"], // whitespace + case
      ["after 10 a.m.", "after 10am"], // clock formatting
      ["after 10am.", "after 10am"], // trailing punctuation
      ["3pm today", "3pm today"], // already identical
      ["tomorrow morning", "tomorrow morning"],
    ];
    for (const [actualValue, expectedValue] of cases) {
      const run = baseRun({ exactActionPayload: { best_contact_time: actualValue } });
      const outcome = evaluateDeterministicAssertion(timeAssertion(expectedValue), run);
      assert.equal(outcome.outcome, "pass", `expected "${actualValue}" to canonicalize-match "${expectedValue}": ${outcome.detail}`);
    }
  });

  test("\"after 10am\" vs \"before 10am\" fails — boundary qualifier is never normalized away", () => {
    const run = baseRun({ exactActionPayload: { best_contact_time: "before 10am" } });
    const outcome = evaluateDeterministicAssertion(timeAssertion("after 10am"), run);
    assert.equal(outcome.outcome, "hard_fail");
  });

  test("\"3pm today\" vs \"3pm tomorrow\" fails — day qualifier is never normalized away", () => {
    const run = baseRun({ exactActionPayload: { best_contact_time: "3pm tomorrow" } });
    const outcome = evaluateDeterministicAssertion(timeAssertion("3pm today"), run);
    assert.equal(outcome.outcome, "hard_fail");
  });

  test("\"around 3pm\" does not silently become exact \"3pm\" — 'around' is a protected qualifier, not filler", () => {
    const run = baseRun({ exactActionPayload: { best_contact_time: "around 3pm" } });
    const outcome = evaluateDeterministicAssertion(timeAssertion("3pm"), run);
    assert.equal(outcome.outcome, "hard_fail");
  });

  test("\"sometime tomorrow morning\" does not silently become \"tomorrow morning\" — filler-stripping only applies before a recognized boundary qualifier (after/before/around/by/until/past), not before a day/time-of-day word", () => {
    const run = baseRun({ exactActionPayload: { best_contact_time: "sometime tomorrow morning" } });
    const outcome = evaluateDeterministicAssertion(timeAssertion("tomorrow morning"), run);
    assert.equal(outcome.outcome, "hard_fail");
  });

  test("unrelated payload string fields remain byte-exact (case-sensitive) even though best_contact_time is canonicalized", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "jordan lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "jordan lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    // best_contact_time itself still passes (canonicalized correctly)...
    assert.equal(outcomeOf(evaluation.results, "payload_best_contact_time"), "pass");
    // ...but contact_name ("jordan lee" vs expected "Jordan Lee") is NOT canonicalized and fails.
    assert.equal(outcomeOf(evaluation.results, "payload_corrected_budget"), "hard_fail");
  });

  test("a missing best_contact_time field is inconclusive (missing evidence), not a silent pass, and cannot be masked by the rest of P02-R13's subset passing", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "payload_corrected_budget"), "pass");
    assert.equal(outcomeOf(evaluation.results, "payload_best_contact_time"), "inconclusive");
    // P02-R13's aggregated per-requirement outcome must not read as a full pass while its time
    // preference subfield is unevaluated — hard_fail/soft_fail/inconclusive outrank pass when
    // deterministicRequirementOutcomes() aggregates by requirementId.
    const p02r13 = evaluation.results.filter((item) => item.requirementId === "P02-R13");
    assert.ok(p02r13.some((item) => item.outcome === "inconclusive"));
  });
});

describe("evaluator-v2-hotfix.3 issue 2 — confirmation_payload_matches_action_payload missing-data audit (A/B/C/D)", () => {
  const dispatchAssertion: DeterministicAssertionSpec = {
    id: "confirmation_matches",
    requirementId: "P02-R12",
    type: "confirmation_payload_matches_action_payload",
    severity: "hard",
    description: "the payload the user confirmed is exactly the payload subsequently dispatched",
    onMissing: "not_applicable",
  };

  test("A: confirmationRequests key entirely absent -> instrumentation genuinely unavailable -> not_applicable (per onMissing)", () => {
    const run = baseRun({ exactActionPayload: { budget: 1 } }); // confirmationRequests left undefined
    const outcome = evaluateDeterministicAssertion(dispatchAssertion, run);
    assert.equal(outcome.outcome, "not_applicable");
    assert.match(outcome.detail, /unavailable/);
  });

  test("A (default onMissing): the same absent-key case is inconclusive when the assertion does not opt into not_applicable", () => {
    const run = baseRun({ exactActionPayload: { budget: 1 } });
    const outcome = evaluateDeterministicAssertion({ ...dispatchAssertion, onMissing: undefined }, run);
    assert.equal(outcome.outcome, "inconclusive");
  });

  test("B: confirmationRequests is a present (even empty) array — instrumentation available — but a dispatch happened with no confirmation recorded -> HARD FAIL, not inconclusive", () => {
    const run = baseRun({ confirmationRequests: [], exactActionPayload: { budget: 1 } });
    const outcome = evaluateDeterministicAssertion(dispatchAssertion, run);
    assert.equal(outcome.outcome, "hard_fail");
    assert.match(outcome.detail, /no confirmation was recorded/);
  });

  test("no dispatch at all is moot regardless of confirmation-trace availability (missing, not a B failure)", () => {
    const availableNoDispatch = baseRun({ confirmationRequests: [] });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, availableNoDispatch).outcome, "not_applicable");
    const unavailableNoDispatch = baseRun();
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, unavailableNoDispatch).outcome, "not_applicable");
  });

  test("C: confirmation exists but its payload differs from the dispatched payload -> HARD FAIL", () => {
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 12_000_000 } }],
      exactActionPayload: { budget: 16_000_000 },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, run).outcome, "hard_fail");
  });

  test("D: confirmation exists and matches the dispatched payload exactly (order-independent) -> PASS", () => {
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 16_000_000, contact_name: "Jordan Lee" } }],
      exactActionPayload: { contact_name: "Jordan Lee", budget: 16_000_000 },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, run).outcome, "pass");
  });

  test("extra/omitted fields on either side of a present confirmation still hard-fail (exact equality, not subset, preserved from hotfix.2)", () => {
    const extraAtDispatch = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 1 } }],
      exactActionPayload: { budget: 1, selected_property: "Skyline Penthouse" },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, extraAtDispatch).outcome, "hard_fail");
    const extraAtConfirmation = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 1, contact_preference: "text" } }],
      exactActionPayload: { budget: 1 },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, extraAtConfirmation).outcome, "hard_fail");
  });

  test("S13's scenario-authored assertion uses confirmation_payload_matches_action_payload with the send_lead_to_team action name and onMissing not_applicable", () => {
    const s13 = scenario("P02-V2-S13");
    const found = s13.expectedDeterministicAssertions.find((item) => item.id === "confirmation_matches_dispatched_payload");
    assert.ok(found);
    assert.equal(found?.type, "confirmation_payload_matches_action_payload");
    assert.equal((found as { actionName?: string }).actionName, "send_lead_to_team");
    assert.equal(found?.onMissing, "not_applicable");
  });
});

describe("evaluator-v2-hotfix.3 issue 3 — record_field_equals numeric_or_currency (P02-V2-S12 price representation)", () => {
  const priceAssertion: DeterministicAssertionSpec = {
    id: "price",
    requirementId: "P02-R06",
    type: "record_field_equals",
    severity: "hard",
    description: "price",
    recordId: "6",
    field: "price",
    expected: "$32,000,000",
    compare: "numeric_or_currency",
  };

  test("32000000 == \"$32,000,000\" under numeric_or_currency", () => {
    const run = baseRun({ recordObservations: [{ rows: { "6": { price: 32_000_000 } } }] });
    assert.equal(evaluateDeterministicAssertion(priceAssertion, run).outcome, "pass");
  });

  test("\"$32M\" == 32000000 via the existing numeric()/currency parser (already used by numeric_close/numeric_range)", () => {
    const run = baseRun({ recordObservations: [{ rows: { "6": { price: "$32M" } } }] });
    const numericExpected: DeterministicAssertionSpec = { ...priceAssertion, expected: 32_000_000 };
    assert.equal(evaluateDeterministicAssertion(numericExpected, run).outcome, "pass");
  });

  test("31000000 != \"$32,000,000\" — numeric equivalence is exact, not tolerant", () => {
    const run = baseRun({ recordObservations: [{ rows: { "6": { price: 31_000_000 } } }] });
    assert.equal(evaluateDeterministicAssertion(priceAssertion, run).outcome, "hard_fail");
  });

  test("arbitrary nonnumeric strings remain exact string comparison (compare flag does not weaken unrelated fact comparisons)", () => {
    const titleAssertion: DeterministicAssertionSpec = { ...priceAssertion, field: "title", expected: "Park Avenue Estate", compare: "numeric_or_currency" };
    const matching = baseRun({ recordObservations: [{ rows: { "6": { title: "Park Avenue Estate" } } }] });
    assert.equal(evaluateDeterministicAssertion(titleAssertion, matching).outcome, "pass");
    const different = baseRun({ recordObservations: [{ rows: { "6": { title: "Not The Same Title" } } }] });
    assert.equal(evaluateDeterministicAssertion(titleAssertion, different).outcome, "hard_fail");
  });

  test("malformed currency is not silently accepted — falls back to exact comparison, which fails", () => {
    const run = baseRun({ recordObservations: [{ rows: { "6": { price: "thirty-two million dollars" } } }] });
    assert.equal(evaluateDeterministicAssertion(priceAssertion, run).outcome, "hard_fail");
  });

  test("without the compare flag, behavior is byte-for-byte unchanged from before hotfix.3 (numeric never matches a currency string)", () => {
    const exactOnly: DeterministicAssertionSpec = { ...priceAssertion, compare: undefined };
    const run = baseRun({ recordObservations: [{ rows: { "6": { price: 32_000_000 } } }] });
    assert.equal(evaluateDeterministicAssertion(exactOnly, run).outcome, "hard_fail");
  });

  test("no record-id or unrelated-field behavior changes: record_ids_exact/record_count are unaffected by the compare flag existing", () => {
    const idsAssertion: DeterministicAssertionSpec = { id: "ids", requirementId: "P02-R03", type: "record_ids_exact", severity: "hard", description: "ids", expectedIds: ["2", "4"] };
    const run = baseRun({ exactSelectedRecordIds: ["4", "2"] });
    assert.equal(evaluateDeterministicAssertion(idsAssertion, run).outcome, "pass");
  });

  test("S12's scenario-authored assertion opts into numeric_or_currency", () => {
    const s12 = scenario("P02-V2-S12");
    const found = s12.expectedDeterministicAssertions.find((item) => item.id === "park_avenue_price");
    assert.ok(found);
    assert.equal((found as { compare?: string }).compare, "numeric_or_currency");
  });
});
