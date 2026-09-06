/**
 * Recursive Definition composition is legal.
 *
 * A Definition appearing earlier in its own ownership ancestry is not a runtime error. The runtime
 * adds no static cycle rejection; expansion is bounded by the finite lineage structural budget
 * instead.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateDefinition } from "@arrokothi/core/execution";
import { agent, executionCount, rig } from "./fixtures.ts";

describe("recursive Definition composition", () => {
  test("a Definition that spawns its own id is accepted, not rejected as a cycle", async () => {
    const { harness, definitions, store } = rig();
    const self = agent("self", [
      { do: "spawn", definitionId: "self", definitionVersion: 1, requestKey: "d", await: false },
      { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "d" },
      { do: "complete" },
    ]);
    // Authoring/validation does not reject a self-referential Definition.
    assert.equal(validateDefinition(self).ok, true, "a recursive Definition validates");

    const ref = await definitions.save(self);
    const root = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();

    assert.equal(await executionCount(store), 4, "root + 3 self-recursive descendants, bounded by the budget");
    // Every Execution reached a terminal state; none was refused for being recursive.
    for (const ctx of await store.listExecutions()) {
      assert.ok(["COMPLETED"].includes(ctx.lifecycle), `${ctx.executionId} completed`);
    }
  });

  test("mutually recursive Definitions A -> B -> A are legal, bounded only by the budget", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(
      agent("mutual-a", [
        { do: "spawn", definitionId: "mutual-b", definitionVersion: 1, requestKey: "d", await: false },
        { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "d" },
        { do: "complete" },
      ]),
    );
    await definitions.save(
      agent("mutual-b", [
        { do: "spawn", definitionId: "mutual-a", definitionVersion: 1, requestKey: "d", await: false },
        { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "d" },
        { do: "complete" },
      ]),
    );
    const rootRef = await definitions.save(
      agent("root", [
        { do: "spawn", definitionId: "mutual-a", definitionVersion: 1, requestKey: "d", await: false },
        { do: "await", eventKinds: ["child.spawned", "effect.rejected"], correlationId: "d" },
        { do: "complete" },
      ]),
    );

    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal(await executionCount(store), 6, "root + 5 descendants alternating A/B, then budget-bounded");
    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.consumed, 5);
  });

  test("no Definition-cycle rejection exists in validation", () => {
    const recursive = agent("r", [{ do: "call", definitionId: "r", definitionVersion: 1 }, { do: "complete" }]);
    const result = validateDefinition(recursive);
    assert.equal(result.ok, true, "runtime safety comes from the budget, not from banning recursion");
  });
});
