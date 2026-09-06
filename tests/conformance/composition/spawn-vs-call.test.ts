/**
 * `spawn` vs `call`.
 *
 * `call` is `spawn` plus one thing: a required dependency on the child's terminal result. The child
 * is the same independently managed Execution either way. And "the child was created" is never the
 * same observation as "the child finished".
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agent, resultAgent, rig } from "./fixtures.ts";

describe("spawn vs call", () => {
  test("spawn creates an independent child; the parent does not wait for its terminal result", async () => {
    const { harness, definitions } = rig();
    // The child waits forever - it never terminates on its own.
    await definitions.save(agent("long-lived", [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }]));
    const rootRef = await definitions.save(
      agent("parent", [
        { do: "spawn", definitionId: "long-lived", definitionVersion: 1, requestKey: "s" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const parentCtx = await harness.inspect(root.executionId);
    assert.equal(parentCtx?.lifecycle, "COMPLETED", "the parent finished without the child finishing");

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const childCtx = await harness.inspect(link!.childExecutionId);
    assert.equal(childCtx?.lifecycle, "WAITING", "the child is alive and running independently");

    const progress = readProgress(parentCtx!.control.progress);
    assert.deepEqual(progress.seenKinds, ["child.spawned"], "the parent observed only the creation acknowledgement");
    assert.equal(link!.pendingOperationId, null, "and registered no dependency on the child's completion");
  });

  test("call waits for the child's terminal result, then continues", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "the answer"));
    const rootRef = await definitions.save(
      agent("caller", [{ do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const parentCtx = await harness.inspect(root.executionId);
    assert.equal(parentCtx?.lifecycle, "COMPLETED");
    const [link] = await harness.childExecutionLinksOf(root.executionId);
    assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "COMPLETED");

    const progress = readProgress(parentCtx!.control.progress);
    assert.deepEqual(progress.seenKinds, ["child.completed"], "the caller was woken by the terminal result");
    const observed = progress.observations[0] as { terminalResult: { value: unknown }; childExecutionId: string };
    assert.equal(observed.terminalResult.value, "the answer", "and received the child's terminal result");
    assert.equal(observed.childExecutionId, link!.childExecutionId);
  });

  test("child result is a different Event kind from child creation acknowledgement", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "done"));
    const callRef = await definitions.save(
      agent("via-call", [{ do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const spawnRef = await definitions.save(
      agent("via-spawn", [{ do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "s" }, { do: "complete" }]),
    );

    const caller = await harness.createExecution({ definition: callRef, structuralSpawnBudget: 1 });
    const spawner = await harness.createExecution({ definition: spawnRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    assert.deepEqual(readProgress((await harness.inspect(caller.executionId))!.control.progress).seenKinds, ["child.completed"]);
    assert.deepEqual(readProgress((await harness.inspect(spawner.executionId))!.control.progress).seenKinds, ["child.spawned"]);
  });

  test("a plain spawn whose child later completes never delivers a terminal result to the parent", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "done"));
    const rootRef = await definitions.save(
      agent("spawner", [
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "s" },
        // Keep the parent alive so a stray terminal Event would have somewhere to land.
        { do: "await", eventKinds: ["external.input"], correlationId: "hold" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "COMPLETED", "the child terminated");

    const progress = readProgress((await harness.inspect(root.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["child.spawned"], "the parent that only spawned observed nothing terminal");

    // The spawn's PendingOperation settled as the creation ack, not as a terminal result.
    const [pending] = await harness.pendingOperationsOf(root.executionId);
    assert.equal(pending?.effectKind, "spawn_execution");
    assert.equal(pending?.status, "settled");
  });
});

interface Progress {
  seenKinds: string[];
  observations: unknown[];
}
function readProgress(progress: Record<string, unknown>): Progress {
  return {
    seenKinds: (progress["seenKinds"] as string[]) ?? [],
    observations: (progress["observations"] as unknown[]) ?? [],
  };
}
