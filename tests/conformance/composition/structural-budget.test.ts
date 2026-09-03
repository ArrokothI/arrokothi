/**
 * The lineage/root-scoped structural spawn budget (Slice E.0).
 *
 * A per-Execution child limit cannot bound recursion. So autonomous child creation spends a finite
 * budget that belongs to the whole lineage, keyed by its root. Descendants may consume it; they can
 * never enlarge it.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spawnBudgetRemaining } from "@arrokothi/core/execution";
import { agent, executionCount, rig } from "./fixtures.ts";

describe("structural spawn budget", () => {
  test("a recursive Definition consumes a finite root budget, then further spawns are refused", async () => {
    const { harness, definitions, store } = rig();
    // R spawns R spawns R ... - a recursive Definition, legal, bounded only by the budget.
    const ref = await definitions.save(
      agent("recur", [
        { do: "spawn", definitionId: "recur", definitionVersion: 1, requestKey: "descend", await: false },
        { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "descend" },
        { do: "complete" },
      ]),
    );
    const N = 4;
    const root = await harness.createExecution({ definition: ref, structuralSpawnBudget: N });
    await harness.runUntilIdle();

    // root + exactly N descendants, and no more.
    assert.equal(await executionCount(store), N + 1, `root plus exactly ${N} descendants`);

    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.capacity, N);
    assert.equal(budget?.consumed, N, "the whole lineage spent exactly its capacity");
    assert.equal(spawnBudgetRemaining(budget!), 0);

    // The deepest descendant's spawn was refused, and it saw the refusal rather than hanging.
    const all = await store.listExecutions();
    for (const ctx of all) {
      assert.notEqual(ctx.lifecycle, "WAITING", "no descendant is stuck waiting on a child that was never created");
    }
    // Find the descendant whose spawn was refused: it observed effect.rejected.
    const journals = await Promise.all(all.map((ctx) => harness.effectJournalOf(ctx.executionId)));
    const refusals = journals.flat().filter((entry) => entry.phase === "rejected");
    assert.ok(
      refusals.some((entry) => String(entry.detail["code"]).includes("structural_spawn_budget_exhausted")),
      "the spawn past the budget was refused as budget-exhausted",
    );
  });

  test("exhaustion refuses creation and no new capacity appears anywhere in the lineage", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(agent("greedy-child", [
      { do: "spawn", definitionId: "leaf", definitionVersion: 1, requestKey: "more", await: false },
      { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "more" },
      { do: "complete" },
    ]));
    await definitions.save(agent("leaf", [{ do: "complete" }]));
    const rootRef = await definitions.save(
      agent("root", [
        { do: "spawn", definitionId: "greedy-child", definitionVersion: 1, await: false },
        { do: "complete" },
      ]),
    );

    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    // root -> greedy-child consumed the 1 credit; greedy-child's own spawn of leaf is refused.
    assert.equal(await executionCount(store), 2, "the child was created; the grandchild was not");
    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.consumed, 1);
    assert.equal(budget?.capacity, 1, "capacity is unchanged - a descendant cannot mint more");
    // There is exactly one budget record, keyed by the root, for the whole lineage.
    const children = await harness.childExecutionLinksOf(root.executionId);
    for (const link of children) {
      assert.equal(await harness.lineageSpawnBudgetOf(link.childExecutionId), undefined, "a descendant has no budget of its own");
    }
  });

  test("an Execution created with no structural budget can spawn nothing", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(agent("child", [{ do: "complete" }]));
    const ref = await definitions.save(
      agent("no-budget", [
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "s", await: false },
        { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "s" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    assert.equal(await executionCount(store), 1, "no child - an absent budget is not an unlimited one");
    const journal = await harness.effectJournalOf(root.executionId);
    assert.equal(journal.find((entry) => entry.phase === "rejected")?.detail["code"], "no_structural_spawn_budget");
  });

  test("two descendant paths cannot both spend the same last credit", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(agent("leaf", [{ do: "complete" }]));
    // The parent spawns two children in one Activation; both attempt to spawn a leaf; the budget is 3
    // (two children + one leaf). Exactly one of the two leaf spawns succeeds.
    await definitions.save(agent("racer", [
      { do: "spawn", definitionId: "leaf", definitionVersion: 1, requestKey: "leaf", await: false },
      { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "leaf" },
      { do: "complete" },
    ]));
    const rootRef = await definitions.save(
      agent("root", [
        { do: "spawn", definitionId: "racer", definitionVersion: 1, requestKey: "r1", await: false },
        { do: "spawn", definitionId: "racer", definitionVersion: 1, requestKey: "r2", await: false },
        { do: "complete" },
      ]),
    );

    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();

    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.consumed, 3, "consumed never exceeds capacity");
    assert.ok(budget!.consumed <= budget!.capacity, "the counter never over-spends");
    // root + 2 racers + exactly 1 leaf.
    assert.equal(await executionCount(store), 4, "only one of the two racers won the last credit");
  });
});
