/**
 * Child identity and lineage.
 *
 * A spawned child is an independently managed Execution: its own `ExecutionId`, its own mailbox, its
 * own lifecycle. Its owner is its immediate parent; its root is the top of the ownership tree, not
 * the direct owner and not re-derived at query time. No Definition id, Effect id, or other identity
 * substitutes for Execution identity.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agent, rig } from "./fixtures.ts";

describe("child identity and lineage", () => {
  test("root R -> child A -> child B: owner is the immediate parent, root stays R", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(agent("B", [{ do: "complete" }]));
    await definitions.save(agent("A", [{ do: "spawn", definitionId: "B", definitionVersion: 1, await: false }, { do: "complete" }]));
    const rootRef = await definitions.save(
      agent("R", [{ do: "spawn", definitionId: "A", definitionVersion: 1, await: false }, { do: "complete" }]),
    );

    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    const [linkToA] = await harness.childExecutionLinksOf(root.executionId);
    assert.ok(linkToA, "R spawned A");
    const a = linkToA.childExecutionId;
    const [linkToB] = await harness.childExecutionLinksOf(a);
    assert.ok(linkToB, "A spawned B");
    const b = linkToB.childExecutionId;

    const rootCtx = await harness.inspect(root.executionId);
    const aCtx = await harness.inspect(a);
    const bCtx = await harness.inspect(b);

    assert.equal(rootCtx?.ownerExecutionId, null, "R owns nothing above it");
    assert.equal(rootCtx?.rootExecutionId, root.executionId, "and is its own root");

    assert.equal(aCtx?.ownerExecutionId, root.executionId, "A.owner == R");
    assert.equal(aCtx?.rootExecutionId, root.executionId, "A.root == R");

    assert.equal(bCtx?.ownerExecutionId, a, "B.owner == A, its immediate parent");
    assert.equal(bCtx?.rootExecutionId, root.executionId, "B.root == R, the top of the tree, not its direct owner");

    // Independent identity and independent mailboxes.
    assert.equal(new Set([root.executionId, a, b]).size, 3, "three distinct ExecutionIds");
    assert.equal(
      new Set([rootCtx?.mailbox.mailboxId, aCtx?.mailbox.mailboxId, bCtx?.mailbox.mailboxId]).size,
      3,
      "each has its own mailbox",
    );

    // The link is not the child.
    assert.notEqual(linkToA.effectId, a, "the spawning Effect id is not the child's Execution id");
    assert.equal(linkToA.rootExecutionId, root.executionId);
    assert.equal(bCtx?.kind, "agent", "a spawned child keeps the kind of its own Definition");
  });

  test("every spawned child gets a unique ExecutionId even from the same Definition", async () => {
    const { harness, definitions } = rig();
    await definitions.save(agent("leaf", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("fanout", [
        { do: "spawn", definitionId: "leaf", definitionVersion: 1, await: false },
        { do: "spawn", definitionId: "leaf", definitionVersion: 1, await: false },
        { do: "spawn", definitionId: "leaf", definitionVersion: 1, await: false },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();

    const links = await harness.childExecutionLinksOf(root.executionId);
    assert.equal(links.length, 3);
    const ids = links.map((link) => link.childExecutionId);
    assert.equal(new Set(ids).size, 3, "three children, three identities, one Definition");
    for (const id of ids) {
      const ctx = await harness.inspect(id);
      assert.equal(ctx?.ownerExecutionId, root.executionId);
      assert.equal(ctx?.rootExecutionId, root.executionId);
    }
  });

  test("the child link records the wait-for edge; a plain spawn records no dependency", async () => {
    const { harness, definitions } = rig();
    await definitions.save(agent("child", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("parent", [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    assert.equal(link?.parentExecutionId, root.executionId);
    assert.equal(link?.pendingOperationId, null, "a plain spawn registered no terminal-result dependency");
  });
});
