/**
 * K0.2-C7(b): the oracle is proven in both directions.
 *
 * 012's deterministic-execution method requires including "a plausible broken behavior that the oracle
 * would reject". A fixture that rejects everything is as useless as one that passes everything, so both
 * are ruled out here: a conforming transcript must PASS, and every violating transcript must FAIL at the
 * exact step, naming the exact observation field whose forbidden mutation it represents.
 *
 * The conforming transcript is derived from the scenarios' own expectations and therefore proves only
 * that the runner can report PASS. The discriminating evidence is entirely on the violating side.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { conformingCandidate, VIOLATIONS, violatingCandidate } from "./candidate.ts";
import { createOperationSink } from "./operation-sink.ts";
import { runScenario } from "./fixture.ts";
import { ALL_SCENARIOS, UNSAFE_CONTROLS } from "./scenarios.ts";

function scenarioById(id: string) {
  const scenario = ALL_SCENARIOS.find((candidate) => candidate.id === id);
  assert.ok(scenario, `violation names unknown scenario ${id}`);
  return scenario;
}

describe("K0 public fixture: the oracle passes a conforming transcript", () => {
  for (const scenario of ALL_SCENARIOS) {
    test(`${scenario.id} passes`, () => {
      const { sink, ledger } = createOperationSink();
      const result = runScenario(conformingCandidate, scenario, { sink, ledgerCount: () => ledger.count() });
      assert.equal(
        result.outcome,
        "PASS",
        result.outcome === "FAIL" ? result.failures.map((failure) => `${failure.label}: ${failure.detail}`).join(" | ") : "",
      );
    });
  }
});

describe("K0 public fixture: the oracle rejects every plausible wrong implementation", () => {
  for (const violation of VIOLATIONS) {
    test(`${violation.id} is caught`, () => {
      const scenario = scenarioById(violation.scenarioId);
      const { sink, ledger } = createOperationSink();
      const result = runScenario(violatingCandidate(violation), scenario, { sink, ledgerCount: () => ledger.count() });

      assert.equal(result.outcome, "FAIL", `the oracle accepted a known-bad trace: ${violation.plausibleBug}`);
      if (result.outcome !== "FAIL") return;

      const atStep = result.failures.filter((failure) => failure.stepIndex === violation.stepIndex);
      assert.ok(
        atStep.length > 0,
        `expected a failure at step ${violation.stepIndex}, got steps ${result.failures.map((failure) => failure.stepIndex).join(",")}`,
      );

      // Failing for an unrelated reason would be an accident, not discrimination.
      const detail = atStep.map((failure) => failure.detail).join(" | ");
      for (const field of violation.mustNameFields) {
        assert.match(detail, new RegExp(field), `failure at step ${violation.stepIndex} did not name ${field}: ${detail}`);
      }
    });
  }

  test("each of Decision M-1's four controls has at least one violating transcript", () => {
    for (const control of UNSAFE_CONTROLS) {
      const covering = VIOLATIONS.filter((violation) => violation.scenarioId === control.id);
      assert.ok(covering.length > 0, `unsafe control ${control.id} ships no plausible wrong implementation`);
    }
  });

  test("the variant Decision M-1 names explicitly is present and rejected", () => {
    // "Suppressing only next state while installing losing progress is a failing control, not a
    // conforming variant." The transcript below reports the correct CANCELLED headline state and is
    // wrong about everything underneath it, which is exactly why the headline cannot be the assertion.
    const violation = VIOLATIONS.find((entry) => entry.id === "control-cancel/losing-progress-installed-with-next-state-suppressed");
    assert.ok(violation, "M-1's named failing variant is missing from the violation set");

    const scenario = scenarioById(violation.scenarioId);
    const mutated = violation.mutate(scenario.steps[violation.stepIndex]!.expect.observation);
    assert.equal(mutated.state, "CANCELLED", "the variant must keep the correct headline state, or it proves nothing");

    const { sink } = createOperationSink();
    const result = runScenario(violatingCandidate(violation), scenario, { sink });
    assert.equal(result.outcome, "FAIL");
  });

  test("a violation that only the independent ledger can see is still caught", () => {
    // The observation is left conforming; only the sink's own record contradicts the claimed refusal.
    const violation = VIOLATIONS.find((entry) => entry.id === "effect-refusal/refusal-claimed-while-the-sink-was-called");
    assert.ok(violation, "the ledger-attribution violation is missing");
    assert.equal(violation.mustNameFields.length, 0, "this violation must not be catchable from the observation alone");

    const scenario = scenarioById(violation.scenarioId);
    const { sink, ledger } = createOperationSink();
    const result = runScenario(violatingCandidate(violation), scenario, { sink, ledgerCount: () => ledger.count() });

    assert.equal(result.outcome, "FAIL");
    if (result.outcome !== "FAIL") return;
    assert.ok(
      result.failures.some((failure) => /independent sink ledger/.test(failure.label)),
      "the failure must be attributed to the independent ledger, not to the candidate's self-report",
    );
    assert.equal(ledger.count(), 1, "the ledger must have recorded the attempt the candidate denied making");
  });
});
