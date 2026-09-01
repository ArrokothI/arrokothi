/**
 * Event delivery, and the four states people collapse into one.
 *
 *   accepted/routed        the Harness admitted the Event for this destination
 *   persisted in mailbox   it is durable and will be offered to a future Activation
 *   consumed by Activation an Activation took it out and handed it to a controller
 *   semantically handled   the controller decided what it meant
 *
 * A delivery receipt is evidence of the first two. Nothing in the API may be read as a claim about
 * the last two, and the difference is load-bearing for the wake rules: an Event *still pending* in
 * the mailbox is runnable work, while an Event *already consumed* is a question the controller has
 * already answered.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { ActivationOutcome, ExecutionController } from "@agent-sdk/core/ports";
import { createAllowListAuthorizer, createDeferredCapabilityExecutor } from "@agent-sdk/core/reference";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";

/**
 * What this Execution is permitted to use at all.
 *
 * The runtime-owned ceiling, supplied when the Execution is created. It is checked again at dispatch
 * from current state, so an Execution created without one can reach no capability implementation
 * whatever a controller proposes and whatever policy would have said.
 */
const AUTHORITY = { operations: [{ capability: "knowledge.query", operation: "search" }] };

function deferred(): { readonly promise: Promise<void>; readonly resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const waiter = () =>
  scriptedAgentDefinition({
    id: "waiter",
    program: [{ do: "await", eventKinds: ["external.input"], correlationId: "answer" }, { do: "complete" }],
  });

describe("event delivery semantics", () => {
  test("a delivery receipt says the Event was accepted, not that a controller observed it", async () => {
    const { harness, definitions, store } = createTestHarness();
    const ref = await definitions.save(waiter());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const receipt = await harness.deliverExternalInput({
      destination: handle.executionId,
      label: "user.message",
      payload: { text: "here" },
      correlationId: "answer",
    });
    assert.equal(receipt.status, "delivered");
    assert.equal(receipt.status === "delivered" && receipt.wokeExecution, true, "it was accepted and it woke the Execution");

    // Accepted and persisted - and still entirely unobserved.
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "READY", "runnable, not run");
    assert.equal((await store.peekMailbox(context!.mailbox.mailboxId)).length, 1, "still in the mailbox, unconsumed");
    assert.deepEqual(readScriptedProgress(context!.control.progress).seenEvents, [], "no controller has seen it");

    await harness.runUntilIdle();
    assert.equal(
      readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress).seenEvents.length,
      1,
      "consumption happens in an Activation, which is a separate thing from delivery",
    );
  });

  test("an Event already consumed does not satisfy a newly reported dependency", async () => {
    // The controller is handed an observation, decides it was not enough, and reports that it still
    // needs one. Reinterpreting the Event it just consumed as satisfying that new dependency would
    // take the judgement away from the controller and spin the Execution instead.
    let activations = 0;
    const unsatisfied: ExecutionController = {
      kind: "agent",
      activate(input): ActivationOutcome {
        activations += 1;
        return {
          control: { kind: "agent", progress: { activations, consumed: input.events.length } },
          next: { status: "await_event", wake: { eventKinds: ["external.input"], correlationId: "answer" } },
        };
      },
    };

    const { harness, definitions } = createTestHarness({ controllers: [unsatisfied] });
    const ref = await definitions.save(waiter());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    await harness.deliverExternalInput({
      destination: handle.executionId,
      label: "user.message",
      correlationId: "answer",
    });
    const records = await harness.runUntilIdle();

    assert.equal(records.length, 1, "the Event produced exactly one Activation");
    assert.equal(records[0]!.deliveredEventIds.length, 1, "which consumed it");
    const context = await harness.inspect(handle.executionId);
    assert.equal(
      context?.lifecycle,
      "WAITING",
      "the consumed Event answered the previous dependency; the newly reported one is prospective",
    );
    assert.equal(await harness.runOnce(), null, "and no further work was scheduled from an already-answered observation");
  });

  test("an Event still pending after an Activation prevents WAITING", async () => {
    // The mirror image. This Event was delivered while the controller was running, so it was never
    // offered to it. It is runnable work, and stranding the Execution in WAITING would be wrong.
    const gate = deferred();
    const entered = deferred();
    let activations = 0;

    const slow: ExecutionController = {
      kind: "agent",
      async activate(): Promise<ActivationOutcome> {
        activations += 1;
        if (activations === 1) {
          entered.resolve();
          await gate.promise;
          return {
            control: { kind: "agent", progress: { asked: true } },
            next: { status: "await_event", wake: { eventKinds: ["external.input"], correlationId: "answer" } },
          };
        }
        return { control: { kind: "agent", progress: { answered: true } }, next: { status: "complete" } };
      },
    };

    const { harness, definitions } = createTestHarness({ controllers: [slow] });
    const ref = await definitions.save(waiter());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });

    const running = harness.runOnce();
    await entered.promise;
    await harness.deliverExternalInput({ destination: handle.executionId, label: "early", correlationId: "answer" });
    gate.resolve();

    const record = await running;
    assert.equal(record?.result, "continued", "the dependency was already satisfiable, so WAITING would have stranded it");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("an Effect result that lands during the Activation prevents WAITING the same way", async () => {
    // Same rule, reached through the gateway rather than through an application Event: the result
    // was routed into the mailbox before the Harness derived the next state.
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.query" }] }),
      capabilities: executor,
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "asks-then-hears-immediately",
        program: [
          { do: "use_capability", capability: "knowledge.query", operation: "search", requestKey: "q1", await: false },
          { do: "await", eventKinds: ["capability.completed"], correlationId: "q1" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });

    // Activation 1 proposes without awaiting. The result is still outstanding.
    await harness.runOnce();
    assert.equal(executor.outstanding.length, 1);

    // It answers before the Activation that will report the dependency ever starts.
    executor.completeAll({ hits: [] });
    await harness.drainEffects();

    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED", "the pending result was runnable work, not a reason to wait");
    assert.deepEqual(readScriptedProgress(context!.control.progress).seenKinds, ["capability.completed"]);
  });

  test("a wake condition naming an unknown Event kind is refused", async () => {
    const inventor: ExecutionController = {
      kind: "agent",
      activate(): ActivationOutcome {
        return {
          control: { kind: "agent", progress: {} },
          next: { status: "await_event", wake: { eventKinds: ["capability.maybe" as never], correlationId: null } },
        };
      },
    };
    const { harness, definitions } = createTestHarness({ controllers: [inventor] });
    const ref = await definitions.save(waiter());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED", "the Event vocabulary is closed, so a controller cannot invent one");
    assert.equal(context?.failure?.code, "invalid_controller_outcome:invalid_wake");
  });

  test("a malformed envelope is refused rather than routed", async () => {
    const { harness, definitions, store } = createTestHarness();
    const ref = await definitions.save(waiter());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);

    const receipt = await harness.deliverEnvelope({
      eventId: "evt_bad" as never,
      destination: { executionId: handle.executionId },
      kind: "external.input",
      // External input has to say what kind of input it is. This one says nothing.
      body: { payload: { text: "hello" } } as never,
      correlationId: "answer",
      causationId: null,
      occurredAt: "2026-01-01T00:10:00.000Z",
    });

    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.reason, "malformed_event");
    assert.equal((await store.peekMailbox(context!.mailbox.mailboxId)).length, 0, "nothing was written");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");
  });

  test("an outside caller cannot mint an Event describing something the runtime never established", async () => {
    const { harness, definitions, store } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "waiting-for-a-real-result",
        program: [
          { do: "await", eventKinds: ["capability.completed"], correlationId: "send-1" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);

    // A well-formed lie: the Execution is waiting for exactly this, and nothing was ever dispatched.
    const receipt = await harness.deliverEnvelope({
      eventId: "evt_forged" as never,
      destination: { executionId: handle.executionId },
      kind: "capability.completed",
      body: {
        effectId: "eff_invented" as never,
        effectKind: "use_capability",
        pendingOperationId: "pop_invented" as never,
        capability: "mail.send" as never,
        operation: "send" as never,
        observation: { delivered: true },
        replayed: false,
      },
      correlationId: "send-1",
      causationId: null,
      occurredAt: "2026-01-01T00:10:00.000Z",
    });

    assert.equal(receipt.status, "rejected");
    assert.equal(
      receipt.status === "rejected" && receipt.reason,
      "kind_not_deliverable",
      "only the runtime says a capability succeeded, because only the runtime dispatched one",
    );
    assert.equal((await store.peekMailbox(context!.mailbox.mailboxId)).length, 0);
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "still waiting for a real answer");
  });
});
