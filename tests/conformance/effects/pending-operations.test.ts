/**
 * Pending operations: deadlines, correlation, duplicates, and reconstruction.
 *
 * A pending operation is the runtime's record that an Execution is still owed a result. The claims
 * here are the ones that go wrong quietly in real systems:
 *
 *   an Activation yielding is not an operation timing out
 *   a result carries the identity of the request it answers, and is checked against it
 *   a second copy of a result is not a second thing that happened
 *   an operation that outlives the process that dispatched it is still that operation
 *   nothing dispatched-but-unresolved is automatically tried again
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { EffectId, ExecutionContext, PendingOperationId, WakeCondition } from "@agent-sdk/core/execution";
import { createPendingOperation, isExpired, isUnresolved, isUnresolvedDispatch } from "@agent-sdk/core/execution";
import { ControllerRegistry, Harness } from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createDeterministicIds,
  createFixedClock,
  createScriptedCapabilityExecutor,
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
} from "@agent-sdk/core/reference";
import {
  createScriptedAgentController,
  createTestHarness,
  readScriptedProgress,
  scriptedAgentDefinition,
} from "@agent-sdk/core/testing";

/**
 * What this Execution is permitted to use at all.
 *
 * The runtime-owned ceiling, supplied when the Execution is created. It is checked again at dispatch
 * from current state, so an Execution created without one can reach no capability implementation
 * whatever a controller proposes and whatever policy would have said.
 */
const AUTHORITY = { operations: [{ capability: "knowledge.query", operation: "search" }, { capability: "mail.send", operation: "send" }] };

const policy = () =>
  createAllowListAuthorizer({ grants: [{ capability: "mail.send", operations: ["send"] }] });

const readPolicy = () =>
  createAllowListAuthorizer({ grants: [{ capability: "knowledge.query", operations: ["search"] }] });

const sender = (deadlineMs?: number) =>
  scriptedAgentDefinition({
    id: "sender",
    program: [
      {
        do: "use_capability",
        capability: "mail.send",
        operation: "send",
        input: { to: "team@example.com" },
        requestKey: "send-1",
        ...(deadlineMs !== undefined ? { deadlineMs } : {}),
      },
      { do: "complete" },
    ],
  });

/** The Event arm of a wait dependency, or null when the Execution is waiting on something else. */
function eventWakeOf(context: ExecutionContext | undefined): WakeCondition | null {
  return context?.waitingFor?.kind === "event" ? context.waitingFor.wake : null;
}

describe("pending operations", () => {
  test("a null deadline never expires; a real deadline still expires by the same rule (E.0.1)", () => {
    const noDeadline = createPendingOperation({
      pendingOperationId: "pop_1" as PendingOperationId,
      executionId: "exe_1" as never,
      effectId: "eff_1" as EffectId,
      effectKind: "spawn_execution",
      correlationId: "c",
      causationId: null,
      idempotencyKey: "spawn:eff_1" as never,
      createdAt: "2026-01-01T00:00:00.000Z",
      deadline: null,
    });
    // Arbitrarily far in the future: a null deadline is "no configured deadline", not merely a
    // deadline nobody has reached yet.
    assert.equal(isExpired(noDeadline, "2999-01-01T00:00:00.000Z"), false, "no configured deadline never expires");

    const withDeadline = createPendingOperation({
      pendingOperationId: "pop_2" as PendingOperationId,
      executionId: "exe_1" as never,
      effectId: "eff_2" as EffectId,
      effectKind: "use_capability",
      correlationId: "c2",
      causationId: null,
      idempotencyKey: "cap:eff_2" as never,
      createdAt: "2026-01-01T00:00:00.000Z",
      deadline: "2026-01-01T00:00:30.000Z",
    });
    assert.equal(isExpired(withDeadline, "2026-01-01T00:00:00.000Z"), false, "not yet reached");
    assert.equal(isExpired(withDeadline, "2026-01-01T00:00:30.000Z"), true, "reached: the same existing rule still applies");
    assert.equal(isExpired(withDeadline, "2026-01-01T01:00:00.000Z"), true, "and stays expired afterwards");
  });

  test("the Activation's inline wait budget is not the Effect's deadline", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions, clock } = createTestHarness({
      authorizer: policy(),
      capabilities: executor,
      // A short budget for the Activation, a long life for the operation. The whole point is that
      // these are different numbers about different things.
      defaultEffectDeadlineMs: 30_000,
    });
    const ref = await definitions.save(sender());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "WAITING", "the Activation yielded");

    const [operation] = await harness.pendingOperationsOf(handle.executionId);
    assert.ok(operation);
    assert.equal(operation.status, "pending", "yielding did not resolve the operation");
    assert.equal(operation.outcome, null, "and did not decide what happened");
    assert.equal(operation.dispatch, "dispatched");

    const dispatchedAt = new Date(operation.dispatchedAt!).getTime();
    assert.ok(operation.deadline, "a capability Effect always carries a real deadline");
    assert.equal(
      new Date(operation.deadline).getTime() - dispatchedAt,
      30_000,
      "the operation kept its own full deadline; the Activation's decision to stop waiting is not its clock",
    );
    assert.ok(isUnresolved(operation), "the Execution is still owed a result");
    assert.equal(
      isExpired(operation, clock.now().toISOString()),
      false,
      "and the operation has not expired, because an Activation yielding is not a clock running out",
    );

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(
      journal.map((entry) => entry.phase),
      ["requested", "authorized", "dispatch_started"],
      "nothing recorded a failure, a timeout, or a cancellation",
    );

    // And it completes normally afterwards, well inside its own deadline.
    executor.completeAll({ delivered: true });
    await harness.drainEffects();
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("a proposal's deadline is honoured and policy may only shorten it", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({
        grants: [{ capability: "mail.send", operations: ["send"], maxDeadlineMs: 5_000 }],
      }),
      capabilities: executor,
    });
    const ref = await definitions.save(sender(60_000));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const [operation] = await harness.pendingOperationsOf(handle.executionId);
    const window = new Date(operation!.deadline!).getTime() - new Date(operation!.dispatchedAt!).getTime();
    assert.equal(window, 5_000, "policy narrowed the requested deadline; a requester cannot extend its own");
  });

  test("a pending operation survives a reference-runtime reconstruction and settles afterwards", async () => {
    // One store, two Harness instances. The second knows nothing about the first's in-flight
    // promise; everything it acts on comes out of persisted runtime state.
    const definitions = new InMemoryDefinitionStore();
    const store = new InMemoryRuntimeStore();
    const scheduler = new FifoScheduler();
    const executor = createDeferredCapabilityExecutor();

    const first = new Harness({
      definitions,
      store,
      scheduler,
      controllers: new ControllerRegistry([createScriptedAgentController()]),
      clock: createFixedClock(),
      ids: createDeterministicIds(),
      authorizer: policy(),
      capabilities: executor,
    });

    const ref = await definitions.save(sender());
    const handle = await first.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await first.runUntilIdle();
    assert.equal((await first.inspect(handle.executionId))?.lifecycle, "WAITING");

    const [before] = await first.pendingOperationsOf(handle.executionId);
    assert.ok(before && isUnresolvedDispatch(before), "the crash-sensitive state is what survives");

    // The process is gone. A fresh runtime over the same store.
    const revived = new Harness({
      definitions,
      store,
      scheduler,
      controllers: new ControllerRegistry([createScriptedAgentController()]),
      clock: createFixedClock("2026-02-01T00:00:00.000Z"),
      ids: createDeterministicIds(500),
      authorizer: policy(),
      capabilities: executor,
    });

    const [after] = await revived.pendingOperationsOf(handle.executionId);
    assert.ok(after);
    assert.equal(after.pendingOperationId, before.pendingOperationId, "the same operation identity");
    assert.equal(after.effectId, before.effectId);
    assert.equal(after.correlationId, "send-1", "its correlation survived");
    assert.equal(after.deadline, before.deadline, "and its original deadline, unshortened by the restart");
    assert.equal(after.status, "pending");

    // Nothing was redispatched merely because a new runtime found unresolved work.
    assert.equal(executor.callCount, 1, "reconstruction is not redispatch");

    const receipt = await revived.settleEffect({
      pendingOperationId: after.pendingOperationId,
      effectId: after.effectId,
      outcome: { status: "success", observation: { delivered: true } },
    });
    assert.equal(receipt.status, "settled");
    assert.equal(receipt.status === "settled" && receipt.wokeExecution, true, "the correlated result woke it");

    await revived.runUntilIdle();
    const context = await revived.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    const progress = readScriptedProgress(context!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed"]);
    const observed = progress.observations[0] as {
      capability: string;
      operation: string;
      effectId: string;
      pendingOperationId: string;
      replayed: boolean;
      observation: { delivered: boolean };
    };
    // The recovered settlement produced the Event body the inline path would have, because every
    // fact in it came out of the store rather than out of the dispatching process's memory.
    assert.equal(observed.capability, "mail.send");
    assert.equal(observed.operation, "send");
    assert.equal(observed.effectId, after.effectId);
    assert.equal(observed.pendingOperationId, after.pendingOperationId);
    assert.equal(observed.replayed, false);
    assert.deepEqual(observed.observation, { delivered: true });
  });

  test("a duplicate result is not a second observation", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({ authorizer: policy(), capabilities: executor });
    const ref = await definitions.save(sender());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const [operation] = await harness.pendingOperationsOf(handle.executionId);
    const settlement = {
      pendingOperationId: operation!.pendingOperationId,
      effectId: operation!.effectId,
      outcome: { status: "success", observation: { delivered: true } },
    } as const;

    const first = await harness.settleEffect(settlement);
    assert.equal(first.status, "settled");
    const second = await harness.settleEffect(settlement);
    assert.equal(second.status, "already_settled", "the same result arriving twice is one thing that happened");

    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.equal(progress.seenKinds.length, 1, "the controller observed the result once");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((entry) => entry.phase === "completed").length, 1, "and it was recorded once");
  });

  test("a result carrying the wrong Effect cannot settle a pending operation", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({ authorizer: policy(), capabilities: executor });
    const ref = await definitions.save(sender());
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const [operation] = await harness.pendingOperationsOf(handle.executionId);
    const wrong = await harness.settleEffect({
      pendingOperationId: operation!.pendingOperationId,
      effectId: "eff_someone_else" as EffectId,
      outcome: { status: "success", observation: { delivered: true } },
    });
    assert.equal(wrong.status, "rejected");
    assert.equal(wrong.status === "rejected" && wrong.reason, "effect_mismatch");

    const unknown = await harness.settleEffect({
      pendingOperationId: "pop_nonexistent" as PendingOperationId,
      effectId: operation!.effectId,
      outcome: { status: "success", observation: {} },
    });
    assert.equal(unknown.status, "rejected");
    assert.equal(unknown.status === "rejected" && unknown.reason, "unknown_pending_operation");

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "still waiting for its real answer");
    assert.equal((await harness.pendingOperationsOf(handle.executionId))[0]?.status, "pending");
  });

  test("a result for one Execution cannot wake another waiting on the same correlation", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({ authorizer: policy(), capabilities: executor });
    const ref = await definitions.save(sender());
    const alice = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    const bob = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    // Both are waiting, both on the correlation "send-1". Only identity distinguishes them.
    assert.equal(eventWakeOf(await harness.inspect(alice.executionId))?.correlationId, "send-1");
    assert.equal(eventWakeOf(await harness.inspect(bob.executionId))?.correlationId, "send-1");

    const [alicesOperation] = await harness.pendingOperationsOf(alice.executionId);
    const receipt = await harness.settleEffect({
      pendingOperationId: alicesOperation!.pendingOperationId,
      effectId: alicesOperation!.effectId,
      outcome: { status: "success", observation: { delivered: true } },
    });
    assert.equal(receipt.status === "settled" && receipt.executionId, alice.executionId);

    assert.equal((await harness.inspect(alice.executionId))?.lifecycle, "READY");
    assert.equal((await harness.inspect(bob.executionId))?.lifecycle, "WAITING", "a shared correlation is not a shared mailbox");
    assert.equal((await harness.pendingOperationsOf(bob.executionId))[0]?.status, "pending");
  });

  test("a result arriving after the Execution is terminal is recorded, not delivered", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({ authorizer: policy(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "gives-up",
        program: [
          { do: "use_capability", capability: "mail.send", operation: "send", requestKey: "send-1", await: false },
          { do: "fail", code: "abandoned", message: "the operator cancelled this work" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "FAILED");

    const [operation] = await harness.pendingOperationsOf(handle.executionId);
    const receipt = await harness.settleEffect({
      pendingOperationId: operation!.pendingOperationId,
      effectId: operation!.effectId,
      outcome: { status: "success", observation: { delivered: true } },
    });
    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.reason, "execution_terminal", "terminal Executions do not resume");

    assert.equal((await harness.pendingOperationsOf(handle.executionId))[0]?.status, "abandoned");
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.ok(
      journal.some((entry) => entry.phase === "abandoned"),
      "the outcome is still auditable even though nobody could observe it",
    );
  });

  test("a repeated consequential request is not silently performed twice", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "mail.send:send": () => ({ status: "success", observation: { messageId: "msg-1" } }) },
    });
    const { harness, definitions } = createTestHarness({ authorizer: policy(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "asks-twice",
        program: [
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "send-1",
            idempotency: "per_input",
          },
          {
            do: "use_capability",
            capability: "mail.send",
            operation: "send",
            input: { to: "team@example.com" },
            requestKey: "send-2",
            idempotency: "per_input",
          },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1, "the same logical operation ran once");

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed", "capability.completed"]);
    const [original, repeat] = progress.observations as { observation: unknown; replayed: boolean }[];
    assert.deepEqual(repeat!.observation, original!.observation, "and reported the same account of what happened");
    assert.equal(original!.replayed, false);
    assert.equal(repeat!.replayed, true, "the replay is visible as a replay, not disguised as a fresh result");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((entry) => entry.phase === "dispatch_started").length, 1);
    assert.equal(journal.filter((entry) => entry.phase === "replayed").length, 1);
  });

  test("a read-only capability with no declared idempotency is dispatched every time", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "knowledge.query:search": () => ({ status: "success", observation: { hits: [] } }) },
    });
    const { harness, definitions } = createTestHarness({ authorizer: readPolicy(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "searches-twice",
        program: [
          { do: "use_capability", capability: "knowledge.query", operation: "search", input: { q: "x" }, requestKey: "q1" },
          { do: "use_capability", capability: "knowledge.query", operation: "search", input: { q: "x" }, requestKey: "q2" },
          { do: "complete" },
        ],
      }),
    );
    await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 2, "duplicate suppression is opt-in, not an accidental cache");
  });

  test("two live Effects cannot share a request key", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({ authorizer: policy(), capabilities: executor });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "reuses-a-key",
        program: [
          { do: "use_capability", capability: "mail.send", operation: "send", requestKey: "send-1", await: false },
          { do: "use_capability", capability: "mail.send", operation: "send", requestKey: "send-1" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1, "the second request never reached an executor");
    const journal = await harness.effectJournalOf(handle.executionId);
    const rejected = journal.find((entry) => entry.phase === "rejected");
    assert.equal(rejected?.detail["code"], "duplicate_request_key");
  });
});
