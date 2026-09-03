/**
 * Basic child cancellation (Slice E.1).
 *
 * Cancellation is trusted runtime control - `harness.cancelExecution(...)` - not a model action and
 * not a sixth Effect. A `call` parent's exact PendingOperation settles as `cancelled` (never
 * `failure`) with one correlated `child.cancelled` Event, and the child never later becomes
 * COMPLETED or FAILED. Cancellation does not propagate to the parent, siblings, or descendants.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ControllerRegistry, Harness } from "@arrokothi/core/execution";
import type { ActivationOutcome, ExecutionController } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createDeterministicIds,
  createFixedClock,
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
} from "@arrokothi/core/reference";
import { readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";
import { agent, resultAgent, rig } from "./fixtures.ts";

describe("child cancellation - parent settlement", () => {
  test("cancelling a READY child settles the call parent's exact PendingOperation as cancelled", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "would have finished"));
    const rootRef = await definitions.save(
      agent("parent", [{ do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });

    // Run only the parent's first Activation: it dispatches the `call`, the child is created READY.
    await harness.runOnce();
    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const child = link!.childExecutionId;
    assert.equal((await harness.inspect(child))?.lifecycle, "READY", "the child has not run yet");

    const receipt = await harness.cancelExecution({ executionId: child, reason: "no longer needed" });
    assert.equal(receipt.status, "cancelled");
    assert.equal((await harness.inspect(child))?.lifecycle, "CANCELLED");

    await harness.runUntilIdle();

    const parentCtx = await harness.inspect(root.executionId);
    assert.equal(parentCtx?.lifecycle, "COMPLETED", "the parent was not itself cancelled");
    const progress = readScriptedProgress(parentCtx!.control.progress);
    assert.deepEqual(progress.seenKinds, ["child.cancelled"], "one correlated cancellation Event, distinct from child.failed");
    const observed = progress.observations[0] as { reason: string; childExecutionId: string };
    assert.equal(observed.reason, "no longer needed");
    assert.equal(observed.childExecutionId, child);

    const pending = (await harness.pendingOperationsOf(root.executionId)).find((p) => p.effectKind === "spawn_execution")!;
    assert.equal(pending.status, "settled");
    assert.equal(pending.outcome, "cancelled", "cancelled, not failure");

    assert.equal((await harness.childExecutionLink(child))?.state, "settled");
    // The child never later becomes COMPLETED/FAILED.
    assert.equal((await harness.inspect(child))?.lifecycle, "CANCELLED");
  });

  test("cancelling a WAITING child settles the parent and the child stops progressing", async () => {
    const { harness, definitions } = rig();
    await definitions.save(
      agent("waiter", [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }]),
    );
    const rootRef = await definitions.save(
      agent("parent", [{ do: "call", definitionId: "waiter", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const child = link!.childExecutionId;
    assert.equal((await harness.inspect(child))?.lifecycle, "WAITING");

    await harness.cancelExecution({ executionId: child });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(child))?.lifecycle, "CANCELLED");
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "COMPLETED");
    const pending = (await harness.pendingOperationsOf(root.executionId)).find((p) => p.effectKind === "spawn_execution")!;
    assert.equal(pending.outcome, "cancelled");

    // A late Event for the cancelled child does not wake it.
    const late = await harness.deliverExternalInput({ destination: child, label: "wake" });
    assert.equal(late.status, "rejected", "a terminal Execution refuses delivery");
  });

  test("repeated cancellation is idempotent and delivers exactly one child.cancelled", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "x"));
    const rootRef = await definitions.save(
      agent("parent", [{ do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runOnce();
    const child = (await harness.childExecutionLinksOf(root.executionId))[0]!.childExecutionId;

    assert.equal((await harness.cancelExecution({ executionId: child })).status, "cancelled");
    assert.equal((await harness.cancelExecution({ executionId: child })).status, "already_terminal");
    assert.equal((await harness.cancelExecution({ executionId: child })).status, "already_terminal");

    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(root.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["child.cancelled"], "exactly one");
  });
});

describe("child cancellation - RUNNING child reaches a safe boundary", () => {
  test("a RUNNING child records a pending request, keeps running its Activation, then becomes CANCELLED", async () => {
    let entered!: () => void;
    const controllerEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let release: (() => void) | null = null;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let calls = 0;
    const hanging: ExecutionController = {
      kind: "agent",
      async activate(): Promise<ActivationOutcome> {
        calls += 1;
        if (calls === 1) {
          entered();
          await gate;
        }
        return { control: { kind: "agent", progress: { calls } }, next: { status: "continue" } } as ActivationOutcome;
      },
    };
    const store = new InMemoryRuntimeStore();
    const definitions = new InMemoryDefinitionStore();
    const harness = new Harness({
      definitions,
      store,
      scheduler: new FifoScheduler(),
      controllers: new ControllerRegistry([hanging]),
      clock: createFixedClock(),
      ids: createDeterministicIds(),
      authorizer: createAllowListAuthorizer({ grants: [] }),
    });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "loops", program: [{ do: "continue" }] }));
    const handle = await harness.createExecution({ definition: ref });

    const running = harness.runOnce();
    await controllerEntered;
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "RUNNING");

    const receipt = await harness.cancelExecution({ executionId: handle.executionId, reason: "halt" });
    assert.equal(receipt.status, "cancellation_pending", "a RUNNING Execution cannot be cancelled instantly");
    assert.equal((await harness.cancellationRequestOf(handle.executionId))?.state, "pending");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "RUNNING", "still finishing its current Activation");

    release!();
    await running;

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "CANCELLED", "the non-terminal report was overridden");
    assert.equal((await harness.cancellationRequestOf(handle.executionId))?.state, "applied");
    // No future Activation begins after cancellation is established.
    assert.equal(await harness.runOnce(), null);
    assert.equal(calls, 1, "the controller ran exactly once");
  });
});

describe("child cancellation - no propagation", () => {
  test("cancelling a detached spawned child fabricates no terminal result for the parent", async () => {
    const { harness, definitions } = rig();
    await definitions.save(
      agent("bg", [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }]),
    );
    const rootRef = await definitions.save(
      agent("spawner", [
        { do: "spawn", definitionId: "bg", definitionVersion: 1, requestKey: "s" },
        { do: "await", eventKinds: ["external.input"], correlationId: "hold" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();
    const child = (await harness.childExecutionLinksOf(root.executionId))[0]!.childExecutionId;

    await harness.cancelExecution({ executionId: child });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(child))?.lifecycle, "CANCELLED");
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "WAITING", "the detached parent is untouched");
    const progress = readScriptedProgress((await harness.inspect(root.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["child.spawned"], "no child.cancelled was delivered - there was no dependency");
  });

  test("cancelling one child does not cancel a sibling", async () => {
    const { harness, definitions } = rig();
    await definitions.save(
      agent("kid", [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }]),
    );
    const rootRef = await definitions.save(
      agent("parent", [
        { do: "spawn", definitionId: "kid", definitionVersion: 1, requestKey: "s1" },
        { do: "spawn", definitionId: "kid", definitionVersion: 1, requestKey: "s2" },
        { do: "await", eventKinds: ["external.input"], correlationId: "hold" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 2 });
    await harness.runUntilIdle();
    const [l1, l2] = await harness.childExecutionLinksOf(root.executionId);

    await harness.cancelExecution({ executionId: l1!.childExecutionId });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(l1!.childExecutionId))?.lifecycle, "CANCELLED");
    assert.equal((await harness.inspect(l2!.childExecutionId))?.lifecycle, "WAITING", "the sibling is unaffected");
  });
});
