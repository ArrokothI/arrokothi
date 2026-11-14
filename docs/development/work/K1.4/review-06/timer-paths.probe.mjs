/**
 * Independent review 06 of K1.4 (brief 06, owner choice 07): SDK-level observations for the corrected
 * timer sentences in execution-cycle.md, quick-start.md and the host.ts/types.ts doc comments.
 * Review evidence, not a maintained test and not product code. Run from the repository root:
 *   node --test --experimental-strip-types --test-reporter=spec docs/development/work/K1.4/review-06/timer-paths.probe.mjs
 *
 * What is recorded: every ExecutionCoordinator.fireTimer answer (a "host fire") and the `wait` field of
 * every accepted Outcome ("waiting" | "woken" | "expired"). A step is held at the Driver's own
 * "submit.before" observation point, after it has declared its wait and before the Kernel sees the
 * Outcome, so the cases can act "during the step".
 *
 * Each case first parks a chat on a human pause with a 100 ms deadline T, then sends a stray input that
 * wakes the Kernel wait but not the native pause, so the next step re-declares the pause with stored T.
 *   A  T passes during the step, nothing eligible queued, and no host call is in flight or follows:
 *      the wait expires as the Outcome is accepted. Zero host fires.
 *   B  as A, but an `input` is made during the step: the queued Event wakes the wait first. No timeout.
 *   C  as A, but a `resolveConfirmation` is made during the step while only an input pause is declared:
 *      it does not qualify, so the wait still expires at acceptance.
 *   D  control: T still ahead at acceptance. The wait is live, survives T with no host call, and
 *      expires at the next host call through exactly one host fire.
 *   E  an Execution deadline already due at creation does nothing until a host call fires it.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createApplication } from "@arrokothi/sdk";
import { ExecutionCoordinator } from "@arrokothi/kernel";
import { ScriptedModelProvider } from "@arrokothi/core/reference";
import { LegacyDriver } from "../../../../../packages/sdk/src/legacy-bridge/driver.ts";
import { chatAgent, deferred, manualClock, models } from "../../../../../packages/sdk/tests/bridge-fixtures.ts";

const fires = [];
const outcomes = [];
const originalFire = ExecutionCoordinator.prototype.fireTimer;
ExecutionCoordinator.prototype.fireTimer = function (key) {
  const answer = originalFire.call(this, key);
  fires.push({ kind: key.kind, result: answer.result });
  return answer;
};
const originalSubmit = ExecutionCoordinator.prototype.submitOutcome;
ExecutionCoordinator.prototype.submitOutcome = function (...args) {
  const answer = originalSubmit.apply(this, args);
  outcomes.push(answer.ok ? { nextState: answer.value.nextState, wait: answer.value.wait } : { refused: answer.error.classification });
  return answer;
};

const failureCode = value => value?.code;
const DEADLINE_MS = 100;

/** Holds E's next Outcome at the Driver's "submit.before" point until `release()`. */
function holdNextSubmission(executionId) {
  const reached = deferred();
  const released = deferred();
  const submitted = deferred();
  let armed = true;
  let pending = false;
  const original = LegacyDriver.prototype.gate;
  LegacyDriver.prototype.gate = function (point, id) {
    if (id !== executionId) return undefined;
    if (point === "submit.before" && armed) {
      armed = false;
      pending = true;
      reached.resolve();
      return released.promise;
    }
    if (point === "submit.after" && pending) {
      pending = false;
      submitted.resolve();
    }
    return undefined;
  };
  return {
    reached: reached.promise,
    submitted: submitted.promise,
    release: () => released.resolve(),
    restore: () => { LegacyDriver.prototype.gate = original; },
  };
}

/** A chat parked on a human pause with deadline T, then woken (Kernel READY) by a stray input at T-70. */
async function parkedThenWoken() {
  fires.length = 0;
  outcomes.length = 0;
  const clock = manualClock();
  const provider = new ScriptedModelProvider({ id: "chat", steps: [{ output: { text: "One" } }, { output: { text: "Two" } }] });
  const app = createApplication({ models: models(provider), runtime: { clock: clock.clock }, humanWaitDeadlineMs: DEADLINE_MS });
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
  const first = await app.runUntilBlocked(executionId);
  assert.equal(first.reason, "input_required");
  const deadline = first.kernel.wait?.deadline;
  assert.equal(deadline, clock.now + DEADLINE_MS);
  assert.deepEqual(outcomes.at(-1)?.wait && { generation: outcomes.at(-1).wait.generation, result: outcomes.at(-1).wait.result }, { generation: 1, result: "waiting" });
  clock.advance(30);
  await app.input(executionId, { label: "user", payload: "elsewhere", destination: "exe_elsewhere" });
  assert.equal(app.inspect(executionId).state, "READY", "the stray input woke the Kernel wait");
  return { app, clock, provider, executionId, deadline };
}

/**
 * Runs the re-declaring step up to its held submission, returns from the host run call, lets `during`
 * act, then releases the Outcome with no host call in flight. Returns the Kernel view read right after.
 */
async function heldStep(during) {
  const scene = await parkedThenWoken();
  const { app, executionId } = scene;
  const hold = holdNextSubmission(executionId);
  try {
    const abort = new AbortController();
    const running = app.runUntilBlocked(executionId, { signal: abort.signal });
    await hold.reached;
    abort.abort();
    assert.equal((await running).reason, "aborted", "the host run call has returned while the step is held");
    assert.equal(app.inspect(executionId).state, "RUNNING");
    await during(scene);
    const firesBeforeAcceptance = fires.length;
    hold.release();
    await hold.submitted;
    // `inspect` is a read: it does not pump timers (application.ts) and no host call follows the release.
    const view = app.inspect(executionId);
    return { ...scene, view, firesBeforeAcceptance, accepted: outcomes.at(-1) };
  } finally {
    hold.restore();
  }
}

const brief = view => ({
  state: view.state,
  wait: view.wait,
  readiness: view.waitEndedReadiness && { species: view.waitEndedReadiness.species, generation: view.waitEndedReadiness.generation, timeoutEventId: view.waitEndedReadiness.timeoutEventId },
  lastRetired: view.retiredWaits.at(-1) && { generation: view.retiredWaits.at(-1).generation, retiredBy: view.retiredWaits.at(-1).retiredBy, deadline: view.retiredWaits.at(-1).deadline },
  timerFires: view.timerFires.length,
});

test("A: a pause whose stored deadline passed during the step expires as its Outcome is accepted, with no host call", async () => {
  const run = await heldStep(async ({ clock }) => { clock.advance(80); });
  console.log(JSON.stringify({ case: "A", deadline: run.deadline, now: run.clock.now, accepted: run.accepted, view: brief(run.view), fires: [...fires] }));
  assert.ok(run.clock.now > run.deadline);
  assert.equal(run.accepted.wait.result, "expired");
  assert.equal(run.accepted.wait.generation, 2);
  assert.notEqual(run.accepted.wait.timeoutEventId, null);
  assert.equal(run.accepted.nextState, "READY");
  assert.equal(run.view.state, "READY");
  assert.equal(run.view.wait, null);
  assert.equal(run.view.waitEndedReadiness?.species, "deadline");
  assert.equal(run.view.retiredWaits.at(-1)?.retiredBy, "deadline");
  assert.equal(run.view.timerFires.length, 0, "the Kernel recorded no timer fire");
  assert.deepEqual(fires, [], "fireTimer was never called");
  const final = await run.app.runUntilBlocked(run.executionId);
  assert.equal(failureCode(final.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.deepEqual(fires.filter(fire => fire.result === "expired"), [], "the later run call fired nothing either");
  assert.equal(run.provider.requests.length, 1);
});

test("B: an input made during that step wakes the wait first; no timeout is minted", async () => {
  let queued;
  const run = await heldStep(async ({ app, clock, executionId }) => {
    clock.advance(80);
    queued = await app.input(executionId, { label: "user", payload: "a real answer" });
  });
  console.log(JSON.stringify({ case: "B", deadline: run.deadline, now: run.clock.now, queued: queued.disposition.kind, accepted: run.accepted, view: brief(run.view), fires: [...fires] }));
  assert.ok(run.clock.now > run.deadline);
  assert.equal(queued.disposition.kind, "queued");
  assert.equal(run.accepted.wait.result, "woken");
  assert.equal(run.accepted.wait.timeoutEventId, null);
  assert.equal(run.view.state, "READY");
  assert.equal(run.view.waitEndedReadiness?.species, "event");
  assert.equal(run.view.retiredWaits.at(-1)?.retiredBy, "event");
  assert.deepEqual(fires, []);
  const final = await run.app.runUntilBlocked(run.executionId);
  console.log(JSON.stringify({ case: "B-after", reason: final.reason, state: final.kernel.state, wait: final.kernel.wait && { generation: final.kernel.wait.generation, deadline: final.kernel.wait.deadline }, now: run.clock.now, modelCalls: run.provider.requests.length, fires: [...fires] }));
  assert.equal(final.reason, "input_required", "the answer reached the chat, which paused again");
  assert.equal(final.kernel.result, null);
  assert.equal(run.provider.requests.length, 2);
  assert.equal(final.kernel.wait?.deadline, run.clock.now + DEADLINE_MS, "the new pause is anchored when first observed");
  assert.deepEqual(fires, []);
});

test("C: a confirmation answer made during that step does not qualify for an input pause; the wait still expires at acceptance", async () => {
  let queued;
  const run = await heldStep(async ({ app, clock, executionId }) => {
    clock.advance(80);
    queued = await app.resolveConfirmation(executionId, { confirmationId: "no-such-confirmation", decision: "approve" });
  });
  console.log(JSON.stringify({ case: "C", deadline: run.deadline, now: run.clock.now, queued: queued.disposition.kind, accepted: run.accepted, view: brief(run.view), fires: [...fires] }));
  assert.equal(queued.disposition.kind, "queued");
  assert.equal(run.accepted.wait.result, "expired");
  assert.equal(run.view.waitEndedReadiness?.species, "deadline");
  assert.deepEqual(fires, []);
  const final = await run.app.runUntilBlocked(run.executionId);
  assert.equal(failureCode(final.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.deepEqual(fires.filter(fire => fire.result === "expired"), []);
});

test("D (control): a deadline still ahead at acceptance leaves a live wait that only a host call expires", async () => {
  const { app, clock, executionId, deadline } = await parkedThenWoken();
  const again = await app.runUntilBlocked(executionId);
  assert.equal(again.reason, "input_required");
  assert.equal(outcomes.at(-1).wait.result, "waiting");
  assert.equal(again.kernel.wait?.deadline, deadline, "the re-declared pause keeps its absolute deadline");
  clock.advance(80);
  const untouched = app.inspect(executionId);
  assert.ok(clock.now > deadline);
  assert.equal(untouched.state, "WAITING", "past its deadline, with no host call, the live wait has not expired");
  assert.deepEqual(fires, []);
  const final = await app.runUntilBlocked(executionId);
  console.log(JSON.stringify({ case: "D", deadline, now: clock.now, between: { state: untouched.state, timerFires: untouched.timerFires.length }, state: final.kernel.state, code: failureCode(final.kernel.result?.value), fires: [...fires] }));
  assert.equal(failureCode(final.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.deepEqual(fires.filter(fire => fire.result === "expired"), [{ kind: "wait_deadline", result: "expired" }]);
});

test("E: an Execution deadline already due at creation takes effect only at the next host call", async () => {
  fires.length = 0;
  outcomes.length = 0;
  const clock = manualClock();
  const provider = new ScriptedModelProvider({ id: "chat", steps: [{ output: { text: "One" } }] });
  const app = createApplication({ models: models(provider), runtime: { clock: clock.clock } });
  const { executionId } = await app.start({
    definition: chatAgent(), input: { label: "user", payload: "hi" }, executionDeadline: new Date(clock.now - 1),
  });
  const created = app.inspect(executionId);
  assert.equal(created.executionDeadline, clock.now - 1);
  assert.equal(created.state, "READY", "creation read no clock: the due Execution deadline has cancelled nothing");
  assert.equal(created.cancellation, null);
  assert.deepEqual(fires, []);
  const final = await app.runUntilBlocked(executionId);
  console.log(JSON.stringify({ case: "E", executionDeadline: created.executionDeadline, now: clock.now, created: created.state, reason: final.reason, state: final.kernel.state, fires: [...fires], modelCalls: provider.requests.length }));
  assert.equal(final.reason, "cancelled");
  assert.deepEqual(fires, [{ kind: "execution_deadline", result: "cancelled" }]);
  assert.equal(provider.requests.length, 0);
});
