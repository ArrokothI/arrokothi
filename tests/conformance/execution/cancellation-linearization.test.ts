/** Deterministic RUNNING-cancellation and Effect-dispatch linearization (Slice E.1.1). */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  send,
  spawnExecution,
  useCapability,
} from "@agent-sdk/core/execution";
import type { ActivationOutcome, ExecutionController, InlineWaitBudget } from "@agent-sdk/core/ports";
import { createAllowListAuthorizer, createScriptedCapabilityExecutor } from "@agent-sdk/core/reference";
import { createTestHarness, scriptedAgentDefinition } from "@agent-sdk/core/testing";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function blockedController(outcome: ActivationOutcome) {
  const entered = deferred();
  const release = deferred();
  const controller: ExecutionController = {
    kind: "agent",
    async activate(): Promise<ActivationOutcome> {
      entered.resolve();
      await release.promise;
      return outcome;
    },
  };
  return { controller, entered: entered.promise, release: release.resolve };
}

async function assertCancellationWins(outcome: ActivationOutcome): Promise<void> {
  const blocked = blockedController(outcome);
  const { harness, definitions } = createTestHarness({ controllers: [blocked.controller] });
  const ref = await definitions.save(scriptedAgentDefinition({ id: "cancel-outcome", program: [{ do: "complete" }] }));
  const handle = await harness.createExecution({ definition: ref });
  const running = harness.runOnce();
  await blocked.entered;
  assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "RUNNING");
  assert.equal((await harness.cancelExecution({ executionId: handle.executionId })).status, "cancellation_pending");
  blocked.release();
  await running;
  assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "CANCELLED");
  assert.equal((await harness.cancellationRequestOf(handle.executionId))?.state, "applied");
  assert.equal((await harness.emissionsOf(handle.executionId)).length, 0);
  assert.equal(await harness.runOnce(), null, "no future Activation runs");
}

describe("RUNNING cancellation safe-boundary ordering", () => {
  test("a committed cancellation wins over continue, wait, complete, fail, and emissions", async (t) => {
    const cases: Array<{ name: string; outcome: ActivationOutcome }> = [
      { name: "continue", outcome: { control: { kind: "agent", progress: {} }, next: { status: "continue" } } },
      {
        name: "wait",
        outcome: {
          control: { kind: "agent", progress: {} },
          next: { status: "await_event", wake: { eventKinds: ["external.input"], correlationId: null } },
        },
      },
      { name: "complete", outcome: { control: { kind: "agent", progress: {} }, next: { status: "complete" } } },
      {
        name: "fail",
        outcome: {
          control: { kind: "agent", progress: {} },
          next: { status: "fail", failure: { code: "later_failure", message: "must lose" } },
        },
      },
      {
        name: "emission",
        outcome: {
          control: { kind: "agent", progress: {} },
          emissions: [{ body: { kind: "text", text: "must not publish" } }],
          next: { status: "continue" },
        },
      },
    ];
    for (const entry of cases) {
      await t.test(entry.name, () => assertCancellationWins(entry.outcome));
    }
  });
});

describe("cancellation before Effect dispatch", () => {
  test("UseCapability is abandoned before executor invocation", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "x:run": () => ({ status: "success", observation: { ok: true } }) },
    });
    const blocked = blockedController({
      control: { kind: "agent", progress: {} },
      effects: [useCapability({ capability: "x", operation: "run", requestKey: "x1" })],
      next: { status: "continue" },
    });
    const { harness, definitions } = createTestHarness({
      controllers: [blocked.controller],
      capabilities: executor,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "x", operations: ["run"] }] }),
    });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "cancel-capability", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({
      definition: ref,
      operationAuthority: { operations: [{ capability: "x", operation: "run" }] },
    });
    const running = harness.runOnce();
    await blocked.entered;
    await harness.cancelExecution({ executionId: handle.executionId });
    blocked.release();
    await running;
    assert.equal(executor.callCount, 0);
    assert.equal((await harness.effectJournalOf(handle.executionId)).at(-1)?.phase, "abandoned");
    assert.equal((await harness.cancellationRequestOf(handle.executionId))?.state, "applied");
  });

  test("SpawnExecution is abandoned before child creation", async () => {
    const blocked = blockedController({
      control: { kind: "agent", progress: {} },
      effects: [spawnExecution({ definitionId: "child", definitionVersion: 1, requestKey: "s1" })],
      next: { status: "continue" },
    });
    const { harness, definitions, store } = createTestHarness({
      controllers: [blocked.controller],
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
    });
    await definitions.save(scriptedAgentDefinition({ id: "child", program: [{ do: "complete" }] }));
    const ref = await definitions.save(scriptedAgentDefinition({ id: "cancel-spawn", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref, structuralSpawnBudget: 1 });
    const running = harness.runOnce();
    await blocked.entered;
    await harness.cancelExecution({ executionId: handle.executionId });
    blocked.release();
    await running;
    assert.equal((await store.listExecutions()).length, 1, "no child exists");
    assert.deepEqual(await harness.childExecutionLinksOf(handle.executionId), []);
  });

  test("SendMessage is abandoned before peer delivery or link creation", async () => {
    const entered = deferred();
    const release = deferred();
    let recipientId = "";
    const controller: ExecutionController = {
      kind: "agent",
      async activate(input): Promise<ActivationOutcome> {
        if (input.definition.id === "recipient") {
          return {
            control: { kind: "agent", progress: {} },
            next: { status: "await_event", wake: { eventKinds: ["external.input"], correlationId: "never" } },
          };
        }
        entered.resolve();
        await release.promise;
        return {
          control: { kind: "agent", progress: {} },
          effects: [send({ to: recipientId, body: { hi: true }, requestKey: "m1" })],
          next: { status: "continue" },
        };
      },
    };
    const { harness, definitions, store } = createTestHarness({
      controllers: [controller],
      authorizer: createAllowListAuthorizer({ grants: [], message: true }),
    });
    const recipientRef = await definitions.save(scriptedAgentDefinition({ id: "recipient", program: [{ do: "complete" }] }));
    const recipient = await harness.createExecution({ definition: recipientRef });
    recipientId = recipient.executionId;
    await harness.runOnce();
    const senderRef = await definitions.save(scriptedAgentDefinition({ id: "sender", program: [{ do: "complete" }] }));
    const sender = await harness.createExecution({ definition: senderRef });
    const running = harness.runOnce();
    await entered.promise;
    await harness.cancelExecution({ executionId: sender.executionId });
    release.resolve();
    await running;
    assert.deepEqual(await harness.peerRequestLinksOf(sender.executionId), []);
    const recipientContext = await harness.inspect(recipient.executionId);
    assert.equal((await store.peekMailbox(recipientContext!.mailbox.mailboxId)).length, 0, "no peer Event delivered");
  });
});

test("dispatch_started wins first: cancellation does not claim rollback and late settlement cannot wake", async () => {
  const executorEntered = deferred();
  const executorRelease = deferred();
  const budgetRelease = deferred();
  let executorCalls = 0;
  const executor = createScriptedCapabilityExecutor({
    handlers: {
      "x:run": async () => {
        executorCalls += 1;
        executorEntered.resolve();
        await executorRelease.promise;
        return { status: "success", observation: { done: true } };
      },
    },
  });
  const inlineWait: InlineWaitBudget = {
    async race<T>(_work: Promise<T>) {
      await budgetRelease.promise;
      return { settled: false };
    },
  };
  const controller: ExecutionController = {
    kind: "agent",
    activate(): ActivationOutcome {
      return {
        control: { kind: "agent", progress: {} },
        effects: [useCapability({ capability: "x", operation: "run", requestKey: "x1" })],
        next: { status: "await_event", wake: { eventKinds: ["capability.completed"], correlationId: "x1" } },
      };
    },
  };
  const { harness, definitions, store } = createTestHarness({
    controllers: [controller],
    capabilities: executor,
    inlineWait,
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "x", operations: ["run"] }] }),
  });
  const ref = await definitions.save(scriptedAgentDefinition({ id: "dispatch-first", program: [{ do: "complete" }] }));
  const handle = await harness.createExecution({
    definition: ref,
    operationAuthority: { operations: [{ capability: "x", operation: "run" }] },
  });

  const running = harness.runOnce();
  await executorEntered.promise;
  assert.equal((await harness.effectJournalOf(handle.executionId)).at(-1)?.phase, "dispatch_started");
  assert.equal((await harness.cancelExecution({ executionId: handle.executionId })).status, "cancellation_pending");
  budgetRelease.resolve();
  await running;
  assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "CANCELLED");
  executorRelease.resolve();
  await harness.drainEffects();

  assert.equal(executorCalls, 1, "the already-dispatched action was not rolled back");
  const pending = (await harness.pendingOperationsOf(handle.executionId))[0]!;
  assert.equal(pending.dispatch, "dispatched");
  assert.equal(pending.status, "abandoned");
  assert.equal(pending.outcome, "success", "outcome certainty remains recorded even though no Event is deliverable");
  assert.deepEqual((await harness.effectJournalOf(handle.executionId)).map((entry) => entry.phase), [
    "requested",
    "authorized",
    "dispatch_started",
    "abandoned",
  ]);
  const context = await harness.inspect(handle.executionId);
  assert.equal((await store.peekMailbox(context!.mailbox.mailboxId)).length, 0, "late settlement delivered no Event");
  assert.equal(await harness.runOnce(), null);
});
