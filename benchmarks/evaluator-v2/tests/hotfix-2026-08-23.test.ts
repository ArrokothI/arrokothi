// Regression tests for evaluator-v2-hotfix.1 (2026-08-23), an evaluation-only mechanical fix.
//
// Frozen raw subject artifacts under benchmarks/results/v2-six-subject-run-1/raw/ are NOT
// touched, executed, or read by these tests. The fixtures below reproduce the exact
// actionRequests/exactActionPayload/confirmationRequests shape recorded by the real
// p02-arrokothai raw artifacts for P02-V2-S13/S15/S17 (actionName "send_lead_to_team",
// payload field "best_contact_time") purely as literal test data, so the fix can be verified
// against the P02_SCENARIOS assertion specs without regenerating or reading any raw run.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { P02_SCENARIOS } from "../../scenario-v2/index.ts";
import { evaluateDeterministic } from "../deterministic/assertions.ts";
import type { DeterministicAssertionResult, NeutralRawRunV2 } from "../schema.ts";

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

describe("evaluator-v2-hotfix.1 — P02 send_lead_to_team / best_contact_time normalization", () => {
  test("A: an arrokothai-shaped P02-S13 trace with the real canonical action/field names passes action, payload, and outcome assertions", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", intent: "buy", target_location: "TriBeCa", budget: 16_000_000 },
      // confirmation_payload_exact is a literal deep-equality check against the scenario's
      // expected object (see confirmationPayload() in scenarios.ts), so this fixture's
      // confirmation payload intentionally carries only those same fields. Note: the real frozen
      // p02-arrokothai raw artifacts additionally include intent/target_location in
      // confirmationRequests[].payload, which this exact-equality assertion type does hard-fail
      // on. That is a separate, pre-existing evaluator characteristic outside this hotfix's
      // 4 documented issues — see the hotfix report's "remaining systematic issues" section.
      confirmationRequests: [
        { turn: 3, actionName: "send_lead_to_team", payload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "3pm today", budget: 16_000_000 }, resolved: "accepted" },
      ],
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "budget_corrected_16m"), "pass");
    assert.equal(outcomeOf(evaluation.results, "handoff_requested"), "pass");
    assert.equal(outcomeOf(evaluation.results, "single_dispatch"), "pass");
    assert.equal(outcomeOf(evaluation.results, "payload_corrected_budget"), "pass");
    assert.equal(outcomeOf(evaluation.results, "confirmation_payload_exact"), "pass");
    assert.equal(outcomeOf(evaluation.results, "definite_failure"), "pass");
    assert.equal(evaluation.hardFailures, 0);
  });

  test("B1: S15 success trace with best_contact_time evaluates the payload/outcome assertions correctly", () => {
    const s15 = scenario("P02-V2-S15");
    const run = baseRun({
      scenarioId: "P02-V2-S15",
      canonicalFinalState: { email: undefined },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "after 10am", intent: "buy", target_location: "Malibu", budget: 13_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Taylor Kim", phone: "555-0133", contact_preference: "text", best_contact_time: "after 10am", intent: "buy", target_location: "Malibu", budget: 13_000_000 },
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

  test("B2: S17 outcome_unknown trace with best_contact_time evaluates the payload/outcome assertions correctly", () => {
    const s17 = scenario("P02-V2-S17");
    const run = baseRun({
      scenarioId: "P02-V2-S17",
      actionRequests: [
        { turn: 3, actionName: "send_lead_to_team", args: { contact_name: "Priya Shah", phone: "555-0144", contact_preference: "text", best_contact_time: "tomorrow morning", intent: "buy", target_location: "Upper West Side", budget: 19_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Priya Shah", phone: "555-0144", contact_preference: "text", best_contact_time: "tomorrow morning", intent: "buy", target_location: "Upper West Side", budget: 19_000_000 },
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

  test("D: a genuinely wrong payload (stale budget / wrong best_contact_time) still fails action_args_subset and confirmation_payload_exact", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "9am tomorrow", intent: "buy", target_location: "TriBeCa", budget: 12_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "9am tomorrow", intent: "buy", target_location: "TriBeCa", budget: 12_000_000 },
      confirmationRequests: [
        { turn: 3, actionName: "send_lead_to_team", payload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_contact_time: "9am tomorrow", intent: "buy", target_location: "TriBeCa", budget: 12_000_000 }, resolved: "accepted" },
      ],
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    assert.equal(outcomeOf(evaluation.results, "payload_corrected_budget"), "hard_fail");
    assert.equal(outcomeOf(evaluation.results, "confirmation_payload_exact"), "hard_fail");
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

  test("E2: the fix does not silently accept the old alias payload field (\"best_time\") as a match for best_contact_time", () => {
    const s13 = scenario("P02-V2-S13");
    const run = baseRun({
      canonicalFinalState: { budget: 16_000_000 },
      actionRequests: [
        { turn: 4, actionName: "send_lead_to_team", args: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_time: "3pm today", budget: 16_000_000 }, effect: "external_side_effect", dispatched: true },
      ],
      exactActionPayload: { contact_name: "Jordan Lee", phone: "555-0111", contact_preference: "text", best_time: "3pm today", budget: 16_000_000 },
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    });
    const evaluation = evaluateDeterministic(s13.id, s13.expectedDeterministicAssertions, run);
    // action_args_subset requires expectedSubset.best_contact_time to equal actual.best_contact_time;
    // a payload that only has the old "best_time" key must not satisfy that subset check.
    assert.equal(outcomeOf(evaluation.results, "payload_corrected_budget"), "hard_fail");
  });
});
