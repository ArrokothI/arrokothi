/**
 * K0.2-C1: the 001 K0 trace is present as a deterministic scenario, with the assertions W-8 requires.
 *
 * 001's K0 deliverable names one trace: "accept input → delayed fake Runtime → typed output → input
 * wait → completion". W-8 then works that exact trace through six cases and fixes what each must
 * observe. This file checks the scenario against both, so the trace cannot lose a phase or an
 * assertion in a later edit. It judges the *fixture*, not a Kernel.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkWaitWellFormed } from "./protocol-vocabulary.ts";
import { k0Trace, subscriptionWaitDeadline } from "./scenarios.ts";

const labels = k0Trace.steps.map((step) => step.expect.label).join(" \n ");
const forbids = k0Trace.steps.flatMap((step) => step.expect.forbids ?? []).join(" \n ");

describe("K0 trace: the five phases of 001's deliverable appear in order", () => {
  test("accept input", () => {
    const create = k0Trace.steps[0];
    assert.equal(create?.command.kind, "create");
    assert.equal(create?.expect.observation.state, "READY", "creation atomically makes the Execution READY");
    assert.deepEqual(create?.expect.observation.queued, ["in-1"], "the initial input is an accepted, unacknowledged Event");
  });

  test("delayed fake Runtime: the Activation is unresolved while another Event arrives", () => {
    const dispatch = k0Trace.steps[2];
    const during = k0Trace.steps[3];
    assert.equal(dispatch?.expect.observation.state, "RUNNING");
    assert.equal(during?.command.kind, "accept_event");
    assert.equal(during?.expect.observation.state, "RUNNING", "the Runtime has not answered yet");
    assert.deepEqual(
      during?.expect.observation.dispatchedBatch,
      dispatch?.expect.observation.dispatchedBatch,
      "an arrival during RUNNING must not alter the pinned batch",
    );
  });

  test("typed output", () => {
    const submitted = k0Trace.steps[4];
    assert.deepEqual(submitted?.expect.observation.emissions, ["em-1"]);
    assert.equal(
      submitted?.command.kind === "submit_outcome" ? submitted.command.outcome.emissions[0]?.emissionId : null,
      "em-1",
      "the emission is carried by the Outcome, not invented by the Kernel",
    );
  });

  test("input wait", () => {
    const submitted = k0Trace.steps[4];
    assert.equal(submitted?.expect.observation.state, "WAITING");
    assert.equal(submitted?.expect.observation.liveWaitGeneration, "g1");
  });

  test("completion", () => {
    const completed = k0Trace.steps.at(-1);
    assert.equal(completed?.expect.observation.state, "COMPLETED");
    assert.equal(
      completed?.command.kind === "submit_outcome" ? completed.command.outcome.next.step : null,
      "complete",
    );
  });
});

describe("K0 trace: W-8's cases are each represented", () => {
  test("the wait is the subscription-only record W-8 describes, and it is well formed", () => {
    const wait = k0Trace.waits?.subscriptionOnlyWait;
    assert.ok(wait, "the scenario must expose the wait it registers");
    assert.deepEqual(wait.dependencies, [], "W-8's dependency-alternatives list is legitimately empty");
    assert.deepEqual(wait.subscriptions, [{ subscriptionClass: "continue" }]);
    assert.equal(checkWaitWellFormed(wait).wellFormed, true, "one subscription satisfies structural non-emptiness");
  });

  test("case 2: unrelated input is accepted, inert and retained", () => {
    const unrelated = k0Trace.steps[5];
    assert.equal(unrelated?.expect.observation.state, "WAITING", "no wake");
    assert.equal(unrelated?.expect.observation.liveWaitGeneration, "g1", "nothing retired");
    assert.ok(unrelated?.expect.observation.queued.includes("bq-2"), "not dropped");
    assert.deepEqual(unrelated?.expect.observation.acknowledged, ["in-1"], "not acknowledged");
  });

  test("case 3: the subscribed input retires the wait and its generation", () => {
    const woken = k0Trace.steps[6];
    assert.equal(woken?.expect.observation.state, "READY");
    assert.equal(woken?.expect.observation.liveWaitGeneration, null);
    assert.deepEqual(woken?.expect.observation.acknowledged, ["in-1"], "waking is not acknowledging");
  });

  test("case 4: the bound is exactly 1, and the wake wins", () => {
    const dispatch = k0Trace.steps[7];
    assert.equal(dispatch?.command.kind === "dispatch" ? dispatch.command.bound : null, 1, "the case is only sharp at bound 1");
    assert.deepEqual(dispatch?.expect.observation.dispatchedBatch, ["cont-1"]);
    assert.deepEqual(
      dispatch?.expect.observation.queued,
      ["bq-1", "bq-2", "cont-1"],
      "the displaced backlog stays queued rather than being consumed or dropped",
    );
  });

  test("case 5: completion disposes the backlog explicitly instead of acknowledging it", () => {
    const completed = k0Trace.steps[8];
    assert.deepEqual(completed?.expect.observation.acknowledged, ["in-1", "cont-1"]);
    assert.deepEqual(completed?.expect.observation.terminalDispositions, ["bq-1", "bq-2"]);
    assert.deepEqual(completed?.expect.observation.queued, []);
  });

  test("case 6 lives in its own control, on a wait that is deliberately deadline-free here", () => {
    // Round-1 review finding K02-R1-01 rejected the earlier reasoning at this spot, which claimed the
    // stale-timer control already covered case 6. It did not: that control's waits carry dependency
    // alternatives, and case 6 is sharp precisely because a subscription-only wait has none, so the
    // timeout cannot be reached by matching at all. `control-subscription-wait-deadline` now carries
    // it. This wait stays deadline-free so the two shapes remain distinct rather than merged.
    assert.equal(k0Trace.waits?.subscriptionOnlyWait?.deadline, undefined);

    const caseSix = subscriptionWaitDeadline.waits?.subscriptionWaitWithDeadline;
    assert.ok(caseSix, "W-8 case 6 must exist as its own wait record");
    assert.deepEqual(caseSix.dependencies, [], "case 6 requires an empty dependency list, or it proves nothing");
    assert.equal(typeof caseSix.deadline, "number", "case 6 requires a deadline");
  });
});

describe("K0 trace: identity and forbidden mutations", () => {
  test("a retried create returns the original Execution and receipt", () => {
    const first = k0Trace.steps[0];
    const retry = k0Trace.steps[1];
    assert.equal(retry?.command.kind, "create_retry");
    assert.equal(
      retry?.command.kind === "create_retry" ? retry.command.requestKey : null,
      first?.command.kind === "create" ? first.command.requestKey : undefined,
      "the retry must use the same caller-scoped request key",
    );
    assert.deepEqual(retry?.expect.observation, first?.expect.observation, "a retry changes nothing at all");
  });

  test("the trace states forbidden mutations, not only eventual states", () => {
    assert.ok(k0Trace.steps.filter((step) => (step.expect.forbids ?? []).length > 0).length >= 5);
    assert.match(forbids, /must not be dropped|retained, not dropped/);
    assert.match(forbids, /not be acknowledged/);
    assert.match(forbids, /not candidates at any bound/);
    assert.match(forbids, /explicit recorded terminal disposition/);
  });

  test("every step is labelled, so a failure names the obligation it violated", () => {
    for (const [index, step] of k0Trace.steps.entries()) {
      assert.ok(step.expect.label.length > 10, `step ${index} has no substantive label`);
    }
    assert.match(labels, /accept input|creation binds/i);
  });

  test("the scenario is not marked an unsafe control: it is the positive trace", () => {
    assert.equal(k0Trace.isUnsafeControl, false);
    // Row 1's create-identity obligations moved to `identity-create-and-activation` under round-1
    // review finding K02-R1-01; the retry step below still exists, but the map's row-1 evidence is
    // that scenario's, and attribution has to say so.
    assert.deepEqual(k0Trace.k0BoundaryRows, [2, 5, 6, 8]);
  });
});
