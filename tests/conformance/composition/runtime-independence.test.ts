/**
 * Runtime independence of a spawned child.
 *
 * A child is not an in-process function call between controllers. It has its own controller state,
 * its own mailbox, and its own lifecycle, and it runs while its parent waits.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agent, resultAgent, rig } from "./fixtures.ts";

describe("runtime independence", () => {
  test("parent and child have separate controller state, mailbox, and lifecycle", async () => {
    const { harness, definitions } = rig();
    await definitions.save(
      agent("child", [
        { do: "remember", key: "who", value: "child" },
        { do: "await", eventKinds: ["external.input"], correlationId: "to-child" },
        { do: "complete" },
      ]),
    );
    const rootRef = await definitions.save(
      agent("parent", [
        { do: "remember", key: "who", value: "parent" },
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "s" },
        { do: "await", eventKinds: ["external.input"], correlationId: "to-parent" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    const childId = link!.childExecutionId;

    const parentCtx = await harness.inspect(root.executionId);
    const childCtx = await harness.inspect(childId);
    assert.notEqual(parentCtx?.mailbox.mailboxId, childCtx?.mailbox.mailboxId);
    assert.equal((parentCtx?.control.progress as { notes: { who: string } }).notes.who, "parent");
    assert.equal((childCtx?.control.progress as { notes: { who: string } }).notes.who, "child");

    // An Event addressed to the child moves only the child.
    await harness.deliverExternalInput({ destination: childId, label: "go", correlationId: "to-child" });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(childId))?.lifecycle, "COMPLETED", "the child advanced");
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "WAITING", "the parent did not");
  });

  test("a called child runs its own Activations while the parent is WAITING", async () => {
    const { harness, definitions } = rig();
    // The child takes two Activations before it terminates.
    await definitions.save(
      agent("two-step-child", [{ do: "emit", text: "step 1" }, { do: "emit", text: "step 2" }, { do: "complete" }]),
    );
    const rootRef = await definitions.save(
      agent("caller", [{ do: "call", definitionId: "two-step-child", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });

    await harness.runOnce(); // parent's first Activation: spawns, then WAITING
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "WAITING");
    const [link] = await harness.childExecutionLinksOf(root.executionId);

    // Drive the child forward one Activation at a time; the parent stays WAITING throughout.
    for (let i = 0; i < 2; i++) {
      await harness.runOnce();
      assert.equal((await harness.inspect(root.executionId))?.lifecycle, "WAITING", "parent still waiting while child works");
    }
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "COMPLETED");
    assert.ok((await harness.emissionsOf(link!.childExecutionId)).length >= 2, "the child produced its own emissions");
  });

  test("a spawned child is always a real Execution kind, never a Stage", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(resultAgent("child", "x"));
    const rootRef = await definitions.save(
      agent("parent", [{ do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    for (const ctx of await store.listExecutions()) {
      assert.ok(ctx.kind === "agent" || ctx.kind === "workflow", "every Execution is an Agent or Workflow, never a Stage");
    }
  });
});
