/**
 * K1.4-candidate KC-2: the oracle stays blind.
 *
 * `begin(scenario, sink)` is handed the whole scenario, expected observations included. The candidate
 * may read its `id` and each step's `command` (the capability preflight, addendum §A2). These tests
 * show it reads nothing else, and that what it returns does not depend on the expectations:
 *
 * 1. **Tripwire.** `begin` gets a scenario on which every other member throws when read, while the
 *    runner keeps the real one. Verdicts and returned observations must equal the plain run's.
 * 2. **Altered expectations.** The runner gets expectations that are wrong in every field it does not
 *    need to adapt commands. The observations the candidate returns must not change.
 * 3. **Capability, not identity.** Renaming a scenario changes nothing, and what `begin` saw is not
 *    replayed in place of the commands `apply` is handed.
 *
 * **What these cannot show.** Two conventions were fixed at design time from reading the corpus and
 * adopted by the owner (owner choice 02): the `to-<generation>` label and the `rejection` episode rule.
 * No run-time check can tell a convention chosen that way from one read at run time; the candidate's
 * README and 017 say so.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { runScenario } from "../k0/fixture.ts";
import type { Observation, Scenario, ScenarioStep } from "../k0/fixture.ts";
import { createOperationSink } from "../k0/operation-sink.ts";
import { ALL_SCENARIOS } from "../k0/scenarios.ts";
import { kernelCandidate } from "./kernel-candidate.ts";
import { newRecording, recordingCandidate, tripwire } from "./support.ts";

const scenarioById = (id: string): Scenario => {
  const found = ALL_SCENARIOS.find((scenario) => scenario.id === id);
  assert.ok(found, `fixture scenario ${id} exists`);
  return found;
};

/** The plain run: what the candidate returns when it is handed the real scenario. */
function baseline(scenario: Scenario) {
  const recording = newRecording();
  const result = runScenario(recordingCandidate(kernelCandidate, recording), scenario, createOperationSink());
  return { recording, result };
}

/**
 * The same schedule with every expectation made wrong, except the two names the runner needs to adapt
 * a submitted Outcome into the candidate's namespace (`activationId` and `writerEpoch`).
 */
function withAlteredExpectations(scenario: Scenario): Scenario {
  const steps: ScenarioStep[] = scenario.steps.map((step) => {
    const expected = step.expect.observation;
    const altered: Observation = {
      executionId: `not-${expected.executionId}`,
      state: expected.state === "FAILED" ? "COMPLETED" : "FAILED",
      progressRevision: expected.progressRevision + 1000,
      progress: { altered: true },
      emissions: ["altered-emission"],
      acknowledged: ["altered-ack"],
      queued: ["altered-queued"],
      terminalDispositions: ["altered-disposed"],
      liveWaitGeneration: "altered-generation",
      waitEndedReadiness: [{ generation: "altered-generation", species: "deadline" }],
      acceptedDeadline: 123_456,
      dispatchedBatch: ["altered-batch"],
      activationId: expected.activationId,
      ingressRefused: "altered-ingress",
      receipt: expected.receipt === null ? "altered-receipt" : null,
      rejection: { classification: "duplicate_conflict", reason: "altered" },
      writerEpoch: expected.writerEpoch,
      recoveryHold: { reason: "altered" },
      effectIntents: ["altered-intent"],
    };
    return { command: step.command, expect: { label: "altered", observation: altered } };
  });
  return { ...scenario, title: "altered", sources: [], k0BoundaryRows: [], isUnsafeControl: !scenario.isUnsafeControl, steps };
}

describe("K1.4-candidate KC-2: the candidate reads the scenario's id and commands, never its expectations", () => {
  for (const scenario of ALL_SCENARIOS) {
    test(`${scenario.id}: a scenario whose expectations throw when read gives the same run`, () => {
      const plain = baseline(scenario);
      const recording = newRecording();
      const guarded = recordingCandidate(kernelCandidate, recording, (seen) => tripwire(seen, recording));
      const result = runScenario(guarded, scenario, createOperationSink());
      assert.deepEqual(recording.forbiddenReads, []);
      assert.deepEqual(result, plain.result);
      assert.deepEqual(recording.observations, plain.recording.observations);
      assert.equal(recording.refusal, plain.recording.refusal);
    });
  }

  test("the tripwire itself fires: a candidate that reads an expectation is caught", () => {
    const recording = newRecording();
    const scenario = tripwire(scenarioById("k0-trace"), recording);
    assert.throws(() => scenario.steps[0]?.expect, /may not/);
    assert.throws(() => scenario.title, /may not/);
    assert.throws(() => scenario.waits, /may not/);
    assert.throws(() => Object.keys(scenario), /may not/);
    assert.equal(scenario.id, "k0-trace");
    assert.equal(scenario.steps[0]?.command.kind, "create");
    assert.equal(recording.forbiddenReads.length, 4);
  });

  for (const scenario of ALL_SCENARIOS) {
    test(`${scenario.id}: altering every expectation the runner does not adapt with changes no returned observation`, () => {
      const plain = baseline(scenario);
      const recording = newRecording();
      const result = runScenario(recordingCandidate(kernelCandidate, recording), withAlteredExpectations(scenario), createOperationSink());
      assert.deepEqual(recording.observations, plain.recording.observations);
      assert.equal(recording.refusal, plain.recording.refusal);
      // The altered oracle must actually disagree, or this run compared nothing.
      if (plain.result.outcome === "PASS") assert.equal(result.outcome, "FAIL");
      else assert.equal(result.outcome, "REFUSED");
    });
  }
});

describe("K1.4-candidate KC-2: the preflight decides by command capability, not by scenario identity", () => {
  for (const scenario of ALL_SCENARIOS) {
    test(`${scenario.id}: renamed, it gets the same verdict and the same observations`, () => {
      const plain = baseline(scenario);
      const recording = newRecording();
      const renamed: Scenario = { ...scenario, id: "renamed-schedule" };
      const result = runScenario(recordingCandidate(kernelCandidate, recording), renamed, createOperationSink());
      assert.equal(result.outcome, plain.result.outcome);
      assert.deepEqual(recording.observations, plain.recording.observations);
      if (plain.recording.refusal !== null) {
        assert.equal(recording.refusal, plain.recording.refusal.replace(`scenario ${scenario.id} `, "scenario renamed-schedule "));
      }
    });
  }

  test("a supported schedule becomes refused when one command needs a trusted non-timeout Event", () => {
    const supported = scenarioById("k0-trace");
    const withResult: Scenario = {
      ...supported,
      steps: [
        ...supported.steps.slice(0, 3),
        {
          command: { kind: "accept_event", event: { eventId: "res-x", destination: "exec-x", kind: "effect.result", category: "kernel_event", correlation: "c" } },
          expect: supported.steps[3]!.expect,
        },
        ...supported.steps.slice(3),
      ],
    };
    const bundle = createOperationSink();
    const result = runScenario(kernelCandidate, withResult, bundle);
    assert.equal(result.outcome, "REFUSED");
    assert.match((result as { readonly reason: string }).reason, /step 3 is not supported, because accept_event carries an Event of category kernel_event/);
  });

  test("a timeout Event offered as ingress is refused too: the Kernel mints those itself", () => {
    const supported = scenarioById("k0-trace");
    const withTimeout: Scenario = {
      ...supported,
      steps: [
        supported.steps[0]!,
        {
          command: { kind: "accept_event", event: { eventId: "to-x", destination: "exec-x", kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: "g1" } },
          expect: supported.steps[0]!.expect,
        },
      ],
    };
    const result = runScenario(kernelCandidate, withTimeout, createOperationSink());
    assert.equal(result.outcome, "REFUSED");
    assert.match((result as { readonly reason: string }).reason, /step 1 is not supported, because accept_event carries an Event of category kernel_timeout/);
  });

  test("what begin saw is not replayed: apply follows the commands it is handed", () => {
    // `begin` is shown one supported schedule while the runner drives another. A candidate that had
    // kept a transcript from the preflight would answer for the wrong schedule.
    const shown = scenarioById("k0-trace");
    const driven = scenarioById("control-duplicate-conflicting-outcome");
    const plain = baseline(driven);
    const recording = newRecording();
    const result = runScenario(recordingCandidate(kernelCandidate, recording, () => shown), driven, createOperationSink());
    assert.deepEqual(result, plain.result);
    assert.equal(result.outcome, "PASS");
    assert.deepEqual(recording.observations, plain.recording.observations);
  });
});
