/**
 * Failure atomicity of child creation.
 *
 * A refused spawn - unknown Definition, exhausted budget, denied by policy, malformed request -
 * leaves no partial child: no Execution record, no authority record, no spent budget credit, no
 * link. The parent is told, through an ordinary Effect-result Event.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agent, executionCount, noSpawn, resultAgent, rig } from "./fixtures.ts";

async function refusalCode(harness: Rig["harness"], executionId: string): Promise<string | undefined> {
  const journal = await harness.effectJournalOf(executionId as never);
  const denied = journal.find((e) => e.phase === "denied" || e.phase === "rejected");
  return denied ? String(denied.detail["code"]) : undefined;
}

type Rig = ReturnType<typeof rig>;

describe("failure atomicity of child creation", () => {
  test("an unknown child Definition is refused and no Execution is created", async () => {
    const { harness, definitions, store } = rig();
    const ref = await definitions.save(
      agent("parent", [
        { do: "spawn", definitionId: "does-not-exist", definitionVersion: 1, requestKey: "s" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal(await executionCount(store), 1, "no child, not even a partial one");
    assert.equal(await refusalCode(harness, root.executionId), "spawn_definition_not_found");
    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.consumed, 0, "no credit was spent");
    assert.equal((await harness.childExecutionLinksOf(root.executionId)).length, 0, "no link");
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "COMPLETED", "the parent was told and continued");
  });

  test("a budget-exhausted spawn creates no partial child", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(resultAgent("child", "x"));
    const ref = await definitions.save(
      agent("parent", [
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "s1" },
        { do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "s2" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: ref, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    assert.equal(await executionCount(store), 2, "one child from the first spawn; the second created nothing");
    assert.equal(await refusalCode(harness, root.executionId), "structural_spawn_budget_exhausted");
    const budget = await harness.lineageSpawnBudgetOf(root.executionId);
    assert.equal(budget?.consumed, 1, "consumed never exceeds capacity");
  });

  test("a denied spawn creates no over-authorized child and spends no budget", async () => {
    const { harness, definitions, store } = rig(noSpawn());
    await definitions.save(resultAgent("child", "x"));
    const ref = await definitions.save(
      agent("parent", [{ do: "spawn", definitionId: "child", definitionVersion: 1, requestKey: "s" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal(await executionCount(store), 1, "policy denied it; nothing was created");
    assert.equal(await refusalCode(harness, root.executionId), "spawn_not_authorized");
    assert.equal((await harness.lineageSpawnBudgetOf(root.executionId))?.consumed, 0);
  });

  test("a structurally malformed spawn proposal fails the Activation without partial runtime state", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(resultAgent("child", "x"));
    const ref = await definitions.save(
      agent("parent", [
        {
          do: "propose_effect",
          effect: {
            kind: "spawn_execution",
            definitionId: "child",
            definitionVersion: 1,
            requestedOperations: ["not-a-ref"] as never,
          },
          await: true,
        },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal(await executionCount(store), 1, "no child");
    const ctx = await harness.inspect(root.executionId);
    assert.equal(ctx?.lifecycle, "FAILED", "a malformed proposal fails the Activation - it is data, not a policy decision");
    assert.match(ctx?.failure?.code ?? "", /invalid_controller_outcome|invalid_effect/);
    assert.equal((await harness.effectJournalOf(root.executionId)).length, 0, "nothing was journaled");
    assert.equal((await harness.lineageSpawnBudgetOf(root.executionId))?.consumed, 0, "no credit spent");
  });
});
