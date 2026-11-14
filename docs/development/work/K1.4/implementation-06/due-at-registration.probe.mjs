/**
 * K1.4 round 6 (brief 06, owner choice 07): evidence for the corrected quick start sentence and the
 * humanWaitDeadlineMs doc comment. Not a maintained test. Run from the repository root with Node v26.10.0:
 *   node --test --experimental-strip-types docs/development/work/K1.4/implementation-06/due-at-registration.probe.mjs
 *
 * Both cases park a chat on a human pause with a 100 ms deadline, then send a stray input that wakes the
 * Kernel wait but not the native pause (as B-DEADLINE-STRAY does), so the next Outcome re-declares the pause
 * with its stored deadline. Every ExecutionCoordinator.fireTimer answer is recorded.
 * - due at registration: the clock passes the deadline before that Outcome is accepted. The wait expires
 *   inside the accepting decision (waits.md step 3): no fireTimer call answers "expired".
 * - control: the clock passes the deadline only after the pause is re-declared. The expiry then needs a
 *   host fire: exactly one fireTimer call answers "expired".
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createApplication } from "@arrokothi/sdk";
import { ExecutionCoordinator } from "@arrokothi/kernel";
import { ScriptedModelProvider } from "@arrokothi/core/reference";
import { chatAgent, manualClock, models } from "../../../../../packages/sdk/tests/bridge-fixtures.ts";

const fires = [];
const original = ExecutionCoordinator.prototype.fireTimer;
ExecutionCoordinator.prototype.fireTimer = function (key) {
  const answer = original.call(this, key);
  fires.push({ kind: key.kind, result: answer.result });
  return answer;
};

const failureCode = value => value?.code;

async function parkThenStray(advanceBeforeRun, advanceAfterRun) {
  fires.length = 0;
  const clock = manualClock();
  const provider = new ScriptedModelProvider({ id: "chat", steps: [{ output: { text: "One" } }, { output: { text: "Two" } }] });
  const app = createApplication({ models: models(provider), runtime: { clock: clock.clock }, humanWaitDeadlineMs: 100 });
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
  const parked = await app.runUntilBlocked(executionId);
  const deadline = parked.kernel.wait?.deadline;
  assert.equal(deadline, clock.now + 100);
  clock.advance(30);
  await app.input(executionId, { label: "user", payload: "elsewhere", destination: "exe_elsewhere" });
  clock.advance(advanceBeforeRun);
  const after = await app.runUntilBlocked(executionId);
  let final = after;
  if (advanceAfterRun > 0) {
    clock.advance(advanceAfterRun);
    final = await app.runUntilBlocked(executionId);
  }
  return { deadline, now: clock.now, after, final, fires: [...fires], modelCalls: provider.requests.length };
}

test("due at registration: a pause whose stored deadline passed before its Outcome expires with no host fire", async () => {
  const run = await parkThenStray(80, 0);
  console.log(JSON.stringify({ case: "due-at-registration", deadline: run.deadline, now: run.now, state: run.final.kernel.state, code: failureCode(run.final.kernel.result?.value), fires: run.fires, modelCalls: run.modelCalls }));
  assert.ok(run.now > run.deadline, "the clock is past the stored deadline before the re-declaring Outcome");
  assert.equal(failureCode(run.final.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.equal(run.fires.filter(fire => fire.result === "expired").length, 0, "no host fire expired the wait");
  assert.equal(run.modelCalls, 1, "the stray input reached no model call");
});

test("control: a pause whose deadline passes after it is re-declared expires only through a host fire", async () => {
  const run = await parkThenStray(0, 80);
  console.log(JSON.stringify({ case: "control", deadline: run.deadline, now: run.now, between: { state: run.after.kernel.state, reason: run.after.reason }, state: run.final.kernel.state, code: failureCode(run.final.kernel.result?.value), fires: run.fires, modelCalls: run.modelCalls }));
  assert.equal(run.after.reason, "input_required", "the re-declared pause waits first");
  assert.equal(run.after.kernel.wait?.deadline, run.deadline, "with the same absolute deadline");
  assert.equal(failureCode(run.final.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.deepEqual(run.fires.filter(fire => fire.result === "expired"), [{ kind: "wait_deadline", result: "expired" }], "one host fire expired the wait");
});
