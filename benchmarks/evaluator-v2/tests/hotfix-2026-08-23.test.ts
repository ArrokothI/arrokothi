// Regression tests for evaluator-v2-hotfix.1 (2026-08-23), an evaluation-only mechanical fix.
//
// Frozen raw subject artifacts under benchmarks/results/v2-six-subject-run-1/raw/ are NOT
// touched, executed, or read by these tests. The fixtures below reproduce the exact
// actionRequests/exactActionPayload/confirmationRequests shape recorded by the real
// p02-arrokothai raw artifacts (actionName "send_lead_to_team", payload field
// "best_contact_time") purely as literal test data, so the fixes can be verified against the
// P02_SCENARIOS assertion specs without regenerating or reading any raw run.
//
// Covers three rounds of the same hotfix:
//   round 1 — send_lead_to_team / best_contact_time canonical naming (regressions A-E)
//   round 2, issue 1 — confirmation_payload_matches_action_payload (regressions A2-F2)
//   round 2, issue 2 — best_contact_time removed from the deterministic hard subset check,
//                       covered by a semantic rubric item instead (regressions A3-C3)
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { P02_SCENARIOS } from "../../scenario-v2/index.ts";
import { evaluateDeterministic, evaluateDeterministicAssertion } from "../deterministic/assertions.ts";
import type { DeterministicAssertionResult, DeterministicAssertionSpec, NeutralRawRunV2 } from "../schema.ts";

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

describe("evaluator-v2-hotfix.1 round 1 — P02 send_lead_to_team / best_contact_time naming", () => {
  test("A: an arrokothai-shaped P02-S13 trace with the real canonical action/field names passes action, payload, confirmation, and outcome assertions", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 },
      // Confirms MORE than the narrow scenario literal ever specified (intent, target_location) —
      // this must not fail now that confirmation is checked against the dispatched payload, not
      // a hardcoded literal.
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
    assert.equal(outcomeOf(evaluation.results, "confirmation_matches_dispatched_payload"), "pass");
    assert.equal(outcomeOf(evaluation.results, "definite_failure"), "pass");
    assert.equal(evaluation.hardFailures, 0);
  });

  test("B1: S15 success trace passes regardless of best_contact_time's exact wording", () => {
    const s15 = scenario("P02-V2-S15");
    const run = baseRun({
      scenarioId: "P02-V2-S15",
      canonicalFinalState: { email: undefined },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "anytime after 10am", intent: "buy", target_location: "Malibu", budget: 13_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "anytime after 10am", intent: "buy", target_location: "Malibu", budget: 13_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "success",
    });
    const evaluation = evaluateDeterministic(s15.id, s15.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "email_absent"), "pass");
    assert.equal(outcomeOf(evaluation.results, "handoff_requested"), "pass");
    assert.equal(outcomeOf(evaluation.results, "single_dispatch"), "pass");
    assert.equal(outcomeOf(evaluation.results, "payload_success"), "pass");
    assert.equal(outcomeOf(evaluation.results, "success"), "pass");
    assert.equal(evaluation.hardFailures, 0);
  });

  test("B2: S17 outcome_unknown trace passes regardless of best_contact_time's exact wording", () => {
    const s17 = scenario("P02-V2-S17");
    const run = baseRun({
      scenarioId: "P02-V2-S17",
      actionRequests: [
        { turn: 3, actionName: "send_lead_to_team", args: { contact_name: "Priya Shah", phone: "555-0144", contact_preference: "text", best_contact_time: "sometime tomorrow morning", intent: "buy", target_location: "Upper West Side", budget: 19_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Priya Shah", phone: "555-0144", contact_preference: "text", best_contact_time: "sometime tomorrow morning", intent: "buy", target_location: "Upper West Side", budget: 19_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "outcome_unknown",
    });
    const evaluation = evaluateDeterministic(s17.id, s17.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "handoff_requested"), "pass");
    assert.equal(outcomeOf(evaluation.results, "single_dispatch_unknown"), "pass");
    assert.equal(outcomeOf(evaluation.results, "payload_unknown"), "pass");
    assert.equal(outcomeOf(evaluation.results, "unknown_outcome"), "pass");
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
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "9am tomorrow", intent: "buy", target_location: "TriBeCa", budget: 12_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "9am tomorrow", intent: "buy", target_location: "TriBeCa", budget: 12_000_000 },
      // Confirmed a DIFFERENT budget than what was actually dispatched.
      confirmationRequests: [
        { turn: 3, actionName: "send_lead_to_team", payload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "9am tomorrow", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, resolved: "accepted" },
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
    // action_requested filters actionRequests by exact actionName; "send_email" is no longer the
    // canonical name, so it must not be treated as if send_lead_to_team was requested.
    assert.equal(outcomeOf(evaluation.results, "handoff_requested"), "hard_fail");
  });
});

describe("evaluator-v2-hotfix.1 round 2, issue 1 — confirmation_payload_matches_action_payload", () => {
  const dispatchAssertion: DeterministicAssertionSpec = {
    id: "confirmation_matches",
    requirementId: "P02-R12",
    type: "confirmation_payload_matches_action_payload",
    severity: "hard",
    description: "the payload the user confirmed is exactly the payload subsequently dispatched",
  };

  test("A2: confirmation and dispatched payload identical -> PASS", () => {
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 16_000_000, contact_name: "Jordan Lee" } }],
      exactActionPayload: { budget: 16_000_000, contact_name: "Jordan Lee" },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, run).outcome, "pass");
  });

  test("B2: same fields in different object-key order -> PASS", () => {
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 16_000_000, contact_name: "Jordan Lee", phone: "555-0111" } }],
      exactActionPayload: { phone: "555-0111", contact_name: "Jordan Lee", budget: 16_000_000 },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, run).outcome, "pass");
  });

  test("C2: dispatched payload contains an extra field not confirmed -> HARD FAIL", () => {
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 16_000_000, contact_name: "Jordan Lee" } }],
      exactActionPayload: { budget: 16_000_000, contact_name: "Jordan Lee", selected_property: "Skyline Penthouse" },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, run).outcome, "hard_fail");
  });

  test("D2: confirmed payload contains an extra field omitted at dispatch -> HARD FAIL", () => {
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 16_000_000, contact_name: "Jordan Lee", contact_preference: "text" } }],
      exactActionPayload: { budget: 16_000_000, contact_name: "Jordan Lee" },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, run).outcome, "hard_fail");
  });

  test("E2: one value changes after confirmation -> HARD FAIL", () => {
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 12_000_000, contact_name: "Jordan Lee" } }],
      exactActionPayload: { budget: 16_000_000, contact_name: "Jordan Lee" },
    });
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, run).outcome, "hard_fail");
  });

  test("F2: missing-trace semantics are explicit and honor onMissing", () => {
    const both = baseRun();
    const confirmationOnly = baseRun({ confirmationRequests: [{ actionName: "send_lead_to_team", payload: { budget: 1 } }] });
    const dispatchOnly = baseRun({ exactActionPayload: { budget: 1 } });

    const defaultOnMissing = evaluateDeterministicAssertion(dispatchAssertion, both);
    assert.equal(defaultOnMissing.outcome, "inconclusive");
    assert.match(defaultOnMissing.detail, /both missing/);
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, confirmationOnly).outcome, "inconclusive");
    assert.match(evaluateDeterministicAssertion(dispatchAssertion, confirmationOnly).detail, /dispatched action payload is missing/);
    assert.equal(evaluateDeterministicAssertion(dispatchAssertion, dispatchOnly).outcome, "inconclusive");
    assert.match(evaluateDeterministicAssertion(dispatchAssertion, dispatchOnly).detail, /confirmation payload is missing/);

    // Scenario-authored assertions (see scenarios.ts confirmationMatchesDispatchedPayload())
    // explicitly opt into onMissing: "not_applicable" for original bespoke apps that never
    // instrument a confirmation step at all — the same missing-data case, an explicit contract.
    const notApplicableAssertion: DeterministicAssertionSpec = { ...dispatchAssertion, onMissing: "not_applicable" };
    assert.equal(evaluateDeterministicAssertion(notApplicableAssertion, both).outcome, "not_applicable");
  });

  test("S13's scenario-authored assertion uses confirmation_payload_matches_action_payload with the send_lead_to_team action name", () => {
    const s13 = scenario("P02-V2-S13");
    const found = s13.expectedDeterministicAssertions.find((item) => item.id === "confirmation_matches_dispatched_payload");
    assert.ok(found);
    assert.equal(found?.type, "confirmation_payload_matches_action_payload");
    assert.equal((found as { actionName?: string }).actionName, "send_lead_to_team");
    assert.equal(found?.onMissing, "not_applicable");
  });
});

describe("evaluator-v2-hotfix.1 round 2, issue 2 — best_contact_time free text", () => {
  test("A3: best_contact_time is not part of any P02-V2-S13/S15/S17 deterministic hard payload assertion", () => {
    for (const id of ["P02-V2-S13", "P02-V2-S15", "P02-V2-S17"]) {
      const found = scenario(id);
      for (const assertion of found.expectedDeterministicAssertions) {
        if (assertion.type === "action_args_subset") {
          assert.ok(!("best_contact_time" in assertion.expectedSubset), `${id}/${assertion.id} must not deterministically require an exact best_contact_time string`);
        }
      }
    }
  });

  test("B3: contact_time_preserved semantic rubric item exists for P02-V2-S13/S15/S17 and is a hard-severity requirement", () => {
    for (const id of ["P02-V2-S13", "P02-V2-S15", "P02-V2-S17"]) {
      const found = scenario(id);
      const item = found.semanticRubric.find((rubricItem) => rubricItem.id === "contact_time_preserved");
      assert.ok(item, `${id} is missing a contact_time_preserved semantic rubric item`);
      assert.equal(item?.requirementId, "P02-R13");
      assert.ok(item?.hardFailureWhen, `${id}/contact_time_preserved should be a hard-failure-capable rubric item`);
      assert.ok(found.severity.hard.includes("P02-R13"), `${id} must keep P02-R13 as hard severity`);
    }
  });

  test("C3: a genuinely different best_contact_time no longer trips the deterministic payload assertion, but unrelated fields (e.g. budget) still fail exactly as before", () => {
    const s15 = scenario("P02-V2-S15");
    const wrongTimeRightEverythingElse = baseRun({
      scenarioId: "P02-V2-S15",
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "next Tuesday at noon", intent: "buy", target_location: "Malibu", budget: 13_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "next Tuesday at noon", intent: "buy", target_location: "Malibu", budget: 13_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "success",
    });
    const evaluation = evaluateDeterministic(s15.id, s15.expectedDeterministicAssertions, wrongTimeRightEverythingElse);
    assert.equal(outcomeOf(evaluation.results, "payload_success"), "pass");

    const alsoWrongBudget = baseRun({
      scenarioId: "P02-V2-S15",
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "next Tuesday at noon", intent: "buy", target_location: "Malibu", budget: 9_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "next Tuesday at noon", intent: "buy", target_location: "Malibu", budget: 9_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "success",
    });
    const evaluationWrongBudget = evaluateDeterministic(s15.id, s15.expectedDeterministicAssertions, alsoWrongBudget);
    assert.equal(outcomeOf(evaluationWrongBudget.results, "payload_success"), "hard_fail");
  });
});
