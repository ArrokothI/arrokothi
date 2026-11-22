/**
 * K1.4-candidate KC-3: the real-Kernel candidate's verdict on every fixture scenario, pinned exactly.
 *
 * Each scenario runs through the fixture's unmodified `runScenario` with a fresh independent operation
 * sink. Owner choice 02 fixes the contract: the 12 schedules the K1 Kernel has a surface for PASS, and
 * the 3 that need a trusted non-timeout Event source are REFUSED by command capability. A REFUSED
 * scenario is not a pass, and nothing here lets one read as a pass: the expected verdict of every
 * scenario is written out, and a scenario this file does not name fails.
 *
 * This is the candidate's own report. It is not an E1 result: the K1/E1 gate is K1.4-gate's and is
 * decided by the benchmark's independent capture.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { runScenario } from "../k0/fixture.ts";
import { createOperationSink } from "../k0/operation-sink.ts";
import { ALL_SCENARIOS } from "../k0/scenarios.ts";
import { kernelCandidate } from "./kernel-candidate.ts";

/** Step counts are pinned too, so a PASS cannot come from a schedule that lost steps. */
const EXPECTED_PASS: Readonly<Record<string, number>> = {
  "k0-trace": 9,
  "redelivery-acceptance": 4,
  "delayed-runtime-non-blocking": 7,
  "identity-create-and-activation": 10,
  "identity-producer-scope": 12,
  "control-whole-envelope-validation": 10,
  "control-duplicate-conflicting-outcome": 5,
  "control-subscription-wait-deadline": 7,
  "control-cancel-versus-complete": 12,
  "control-completion-obligations": 5,
  "control-missing-checkpoint-code": 6,
  "effect-refusal-and-sink-attribution": 4,
};

/** The first step whose command has no K1 Kernel surface, per refused scenario (design check 01 D01-CHK-01). */
const EXPECTED_REFUSED: Readonly<Record<string, number>> = {
  "control-stale-timer-and-lost-wake": 2,
  "wait-structure-not-satisfiability": 4,
  "cited-decision-edges": 2,
};

describe("K1.4-candidate KC-3: the Kernel candidate's verdict on each fixture scenario", () => {
  test("the pinned verdict table names every fixture scenario exactly once", () => {
    assert.deepEqual(
      ALL_SCENARIOS.map((scenario) => scenario.id).sort(),
      [...Object.keys(EXPECTED_PASS), ...Object.keys(EXPECTED_REFUSED)].sort(),
    );
    assert.equal(Object.keys(EXPECTED_PASS).length, 12);
    assert.equal(Object.keys(EXPECTED_REFUSED).length, 3);
  });

  for (const scenario of ALL_SCENARIOS) {
    const passSteps = EXPECTED_PASS[scenario.id];
    if (passSteps !== undefined) {
      test(`${scenario.id}: PASS through the unmodified runner`, () => {
        const result = runScenario(kernelCandidate, scenario, createOperationSink());
        assert.deepEqual(result, { outcome: "PASS", scenarioId: scenario.id, candidate: kernelCandidate.name, steps: passSteps });
      });
      continue;
    }
    test(`${scenario.id}: REFUSED before any command, by command capability`, () => {
      const bundle = createOperationSink();
      const result = runScenario(kernelCandidate, scenario, bundle);
      assert.equal(result.outcome, "REFUSED");
      assert.equal(result.scenarioId, scenario.id);
      const reason = (result as { readonly reason: string }).reason;
      const step = EXPECTED_REFUSED[scenario.id];
      assert.ok(step !== undefined, `${scenario.id} has no pinned verdict`);
      assert.match(reason, new RegExp(`refuses scenario ${scenario.id} before any command runs: step ${step} is not supported`));
      assert.match(reason, /accept_event carries an Event of category kernel_event/);
      assert.match(reason, /017-known-limitations\.md L-21/);
      assert.equal(bundle.ledger.count(), 0);
    });
  }

  test("the refused schedules hold 51 of the fixture's 142 steps", () => {
    const steps = (ids: readonly string[]): number =>
      ALL_SCENARIOS.filter((scenario) => ids.includes(scenario.id)).reduce((total, scenario) => total + scenario.steps.length, 0);
    assert.equal(steps(Object.keys(EXPECTED_REFUSED)), 51);
    assert.equal(steps(Object.keys(EXPECTED_PASS)), 91);
  });
});
