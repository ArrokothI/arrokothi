/**
 * K0.2-C2: the delay is real, scheduled, and does not block another Execution.
 *
 * 001 K0 asks for a *delayed* fake Runtime, and 001 K1 turns that into an obligation: "One delayed
 * Runtime must not prevent the same coordinator loop dispatching another Execution." The interesting
 * part is what the delay must *not* be mistaken for. W-4 is explicit that an Activation with only
 * Runtime-local work outstanding creates no `waitingFor` record at all and simply stays `RUNNING`;
 * reporting it as `WAITING` would invent a Kernel-visible dependency that does not exist.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { delayedRuntimeNonBlocking } from "./scenarios.ts";

const steps = delayedRuntimeNonBlocking.steps;
const observationsOf = (executionId: string) =>
  steps.filter((step) => step.expect.observation.executionId === executionId).map((step) => step.expect.observation);

describe("delayed Runtime: the delay is scheduled, not a timing race", () => {
  test("no step depends on wall-clock timing, only on command order", () => {
    // Every command is an explicit laboratory action. There is no sleep, no deadline and no timer in
    // this scenario, so there is nothing to tune and nothing to flake.
    const kinds = new Set(steps.map((step) => step.command.kind));
    assert.ok(!kinds.has("deliver_timer"), "a delay must not be simulated with a timer");
    assert.deepEqual([...kinds].sort(), ["create", "dispatch", "inspect", "submit_outcome"]);
  });

  test("X is dispatched and never answers before Y is dispatched", () => {
    const xDispatch = steps.findIndex((step) => step.command.kind === "dispatch" && step.command.executionId === "exec-x");
    const yDispatch = steps.findIndex((step) => step.command.kind === "dispatch" && step.command.executionId === "exec-y");
    const xOutcome = steps.findIndex((step) => step.command.kind === "submit_outcome" && step.command.outcome.executionId === "exec-x");

    assert.ok(xDispatch >= 0 && yDispatch > xDispatch, "Y must be dispatched after X is already in flight");
    assert.equal(xOutcome, -1, "X must never submit an Outcome: that is what makes it the delayed one");
  });
});

describe("delayed Runtime: it does not block the coordinator", () => {
  test("Y reaches RUNNING while X's Activation is unresolved", () => {
    const yDispatch = steps.find((step) => step.command.kind === "dispatch" && step.command.executionId === "exec-y");
    assert.equal(yDispatch?.expect.observation.state, "RUNNING");
    assert.deepEqual(yDispatch?.expect.observation.dispatchedBatch, ["in-y1"]);
  });

  test("Y runs all the way to COMPLETED while X is still unresolved", () => {
    const yStates = observationsOf("exec-y").map((observation) => observation.state);
    assert.deepEqual(yStates, ["READY", "RUNNING", "COMPLETED"]);

    const xAfter = observationsOf("exec-x").at(-1);
    assert.equal(xAfter?.state, "RUNNING", "X is still waiting on its Runtime after Y finished");
  });
});

describe("delayed Runtime: an unresolved Activation is not a Kernel-visible wait", () => {
  test("X never reports WAITING and never holds a live wait generation", () => {
    for (const observation of observationsOf("exec-x")) {
      assert.notEqual(observation.state, "WAITING", "a slow Activation is unresolved, not a declared dependency");
      assert.equal(observation.liveWaitGeneration, null, "W-4: no waitingFor record is created for Runtime-local work");
    }
  });

  test("X is inspected after Y's activity and is byte-identical to before", () => {
    const inspections = steps.filter((step) => step.command.kind === "inspect");
    assert.ok(inspections.length >= 2, "X must be re-read after Y acts, or non-interference is not observed");
    assert.deepEqual(
      inspections[0]?.expect.observation,
      inspections.at(-1)?.expect.observation,
      "every field of X must be unchanged by unrelated Execution activity",
    );
  });

  test("the forbidden mutations are stated, not merely implied", () => {
    const forbids = steps.flatMap((step) => step.expect.forbids ?? []).join(" \n ");
    assert.match(forbids, /may not hold the coordinator's dispatch loop/);
    assert.match(forbids, /Runtime-local work creates no waitingFor record/);
    assert.match(forbids, /unrelated Executions compute independently/);
  });

  test("the scenario's §11 attribution is row 5(g), W-4's no-waitingFor rule", () => {
    // The non-blocking half is a 001 K0/K1 deliverable rather than a §11 obligation, so it is carried
    // by contract criterion C2 and the assertions above, not by the boundary map.
    assert.deepEqual(delayedRuntimeNonBlocking.k0BoundaryRows, [5]);
    assert.equal(delayedRuntimeNonBlocking.isUnsafeControl, false);
  });
});
