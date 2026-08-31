/**
 * WAIT / Event / wake / resume - the semantic spine.
 *
 * Every claim in this file is about *who decides*. The controller reports a dependency; the Harness
 * derives WAITING. An Event arriving - not a save, not a poll, not a timer - makes the Execution
 * READY. The Activation that follows belongs to the same Execution identity and continues from the
 * controller progress the previous Activation left behind.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { ActivationOutcome, ExecutionController } from "@agent-sdk/core/ports";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const longLived = () =>
  scriptedAgentDefinition({
    id: "long-lived",
    program: [
      { do: "remember", key: "topic", value: "quarterly report" },
      { do: "emit", text: "what should I focus on?" },
      { do: "await", eventKinds: ["user.message"], note: "needs the user's answer" },
      { do: "emit", text: "understood" },
      { do: "complete" },
    ],
  });

describe("wait, wake, and resume", () => {
  test("the Harness derives WAITING and records the dependency the controller reported", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(longLived());
    const handle = await harness.createExecution({ definition: ref });

    const records = await harness.runUntilIdle();
    assert.equal(records.at(-1)?.result, "waiting");

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "WAITING");
    assert.deepEqual(context?.waitingFor?.eventKinds, ["user.message"]);
    assert.equal(context?.waitingFor?.description, "needs the user's answer");
    assert.equal(context?.terminalResult, null, "waiting is not completing");
  });

  test("an Event addressed elsewhere does not wake this Execution", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(longLived());
    const waiting = await harness.createExecution({ definition: ref });
    const other = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const before = await harness.inspect(waiting.executionId);
    await harness.deliverEvent({ destination: other.executionId, kind: "user.message", body: { text: "for the other one" } });

    const after = await harness.inspect(waiting.executionId);
    assert.equal(after?.lifecycle, "WAITING");
    assert.equal(after?.revision, before?.revision, "delivery is destination-checked; the wrong mailbox was never touched");

    const unknown = await harness.deliverEvent({ destination: "exe_does_not_exist" as never, kind: "user.message" });
    assert.equal(unknown.status, "rejected");
    if (unknown.status === "rejected") assert.equal(unknown.reason, "unknown_destination");
  });

  test("an Event that does not satisfy the wake condition is queued but does not wake", async () => {
    const { harness, definitions, store } = createTestHarness();
    const ref = await definitions.save(longLived());
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const receipt = await harness.deliverEvent({ destination: handle.executionId, kind: "system.heartbeat" });
    assert.equal(receipt.status, "delivered");
    if (receipt.status === "delivered") assert.equal(receipt.wokeExecution, false);

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "WAITING", "an unrelated observation is not the dependency being waited on");
    assert.equal((await store.peekMailbox(context!.mailbox.mailboxId)).length, 1, "it is retained for the next Activation");
    assert.equal(await harness.runOnce(), null, "and no Activation was scheduled");
  });

  test("a matching Event makes the Execution READY and the next Activation resumes the same identity", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(longLived());
    const handle = await harness.createExecution({ definition: ref });
    const beforeWait = await harness.runUntilIdle();
    const activationsBeforeWait = beforeWait.length;

    await harness.deliverEvent({ destination: handle.executionId, kind: "system.heartbeat" });
    const receipt = await harness.deliverEvent({
      destination: handle.executionId,
      kind: "user.message",
      body: { text: "focus on revenue" },
      correlationId: "corr-1",
    });
    assert.equal(receipt.status, "delivered");
    if (receipt.status === "delivered") assert.equal(receipt.wokeExecution, true);

    const woken = await harness.inspect(handle.executionId);
    assert.equal(woken?.lifecycle, "READY", "the Event, not persistence, made it runnable again");
    assert.equal(woken?.waitingFor, null, "the satisfied dependency was cleared");

    const after = await harness.runUntilIdle();
    assert.ok(after.length > 0, "waking produced further Activations");
    assert.ok(
      after.every((record) => record.executionId === handle.executionId),
      "the resumed Activations belong to the same Execution identity",
    );
    assert.ok(after[0]!.activationId !== beforeWait[activationsBeforeWait - 1]!.activationId, "a new Activation, same Execution");

    const final = await harness.inspect(handle.executionId);
    assert.equal(final?.lifecycle, "COMPLETED");

    const progress = readScriptedProgress(final!.control.progress);
    assert.equal(progress.notes["topic"], "quarterly report", "controller progress from before the wait survived");
    assert.equal(progress.seenEvents.length, 2, "both queued Events were delivered in the resuming Activation");
    assert.equal(progress.step, 5, "the controller continued from where it stopped");

    const transitions = await harness.transitionsOf(handle.executionId);
    assert.ok(
      transitions.some((t) => t.from === "RUNNING" && t.to === "WAITING"),
      "the Harness recorded deriving WAITING",
    );
    assert.ok(
      transitions.some((t) => t.from === "WAITING" && t.to === "READY" && t.activationId === null),
      "waking is caused by an Event, outside any Activation",
    );
  });

  test("an Event that arrives during the Activation is runnable work, so WAITING is not derived", async () => {
    // The controller reports its dependency while an Event satisfying it is already sitting in the
    // mailbox, delivered after the Activation consumed its inbox. WAITING would strand it, so the
    // Harness checks for runnable work before deriving that state.
    const gate = deferred();
    const entered = deferred();
    let activations = 0;

    const slowController: ExecutionController = {
      kind: "agent",
      async activate(): Promise<ActivationOutcome> {
        activations += 1;
        if (activations === 1) {
          entered.resolve();
          await gate.promise;
          return {
            control: { kind: "agent", progress: { asked: true } },
            next: { status: "await_event", wake: { eventKinds: ["late.answer"], correlationId: null } },
          };
        }
        return { control: { kind: "agent", progress: { answered: true } }, next: { status: "complete" } };
      },
    };

    const { harness, definitions } = createTestHarness({ controllers: [slowController] });
    const ref = await definitions.save(longLived());
    const handle = await harness.createExecution({ definition: ref });

    const running = harness.runOnce();
    await entered.promise;
    await harness.deliverEvent({ destination: handle.executionId, kind: "late.answer", body: { text: "early" } });
    gate.resolve();

    const record = await running;
    assert.equal(record?.result, "continued", "the dependency was already satisfied, so WAITING would have been wrong");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    assert.equal((await harness.inspect(handle.executionId))?.waitingFor, null);

    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("re-delivering the same Event envelope is not a second observation", async () => {
    const { harness, definitions, store } = createTestHarness();
    const ref = await definitions.save(longLived());
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    const envelope = {
      eventId: "evt_fixed" as never,
      destination: { executionId: handle.executionId },
      kind: "user.message",
      body: { text: "hello" },
      correlationId: null,
      causationId: null,
      occurredAt: "2026-01-01T00:10:00.000Z",
    };

    const first = await harness.deliverEnvelope(envelope);
    assert.equal(first.status, "delivered");
    const second = await harness.deliverEnvelope(envelope);
    assert.equal(second.status, "duplicate");

    assert.equal((await store.peekMailbox(context!.mailbox.mailboxId)).length, 1);
  });
});
