/**
 * Child terminal-result correlation.
 *
 * A child reaching a terminal state settles the exact `PendingOperation` its `call` parent
 * registered, through the ordinary correlated-Event path. No result is delivered to the wrong
 * Execution, a duplicate cannot deliver twice, and none of this uses a `ControllerResumption`.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { agent, resultAgent, rig } from "./fixtures.ts";

function progressOf(control: Record<string, unknown>): { seenKinds: string[]; observations: unknown[] } {
  return {
    seenKinds: (control["seenKinds"] as string[]) ?? [],
    observations: (control["observations"] as unknown[]) ?? [],
  };
}

describe("child terminal-result correlation", () => {
  test("a child terminal result settles the exact parent PendingOperation through a correlated Event", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "R"));
    const rootRef = await definitions.save(
      agent("caller", [{ do: "call", definitionId: "child", definitionVersion: 1, requestKey: "job-1" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });

    // After the first Activation the parent is WAITING on the child, with a pending operation open.
    await harness.runOnce();
    const waiting = await harness.inspect(root.executionId);
    assert.equal(waiting?.lifecycle, "WAITING");
    assert.equal(waiting?.waitingFor?.kind, "event", "the parent waits on an Event, not a controller resumption");
    const [pendingBefore] = await harness.pendingOperationsOf(root.executionId);
    assert.equal(pendingBefore?.effectKind, "spawn_execution");
    assert.equal(pendingBefore?.status, "pending");
    assert.equal(pendingBefore?.correlationId, "job-1");
    assert.equal((await harness.controllerResumptionsOf(root.executionId)).length, 0, "no ControllerResumption exists for child waiting");

    await harness.runUntilIdle();

    const [pendingAfter] = await harness.pendingOperationsOf(root.executionId);
    assert.equal(pendingAfter?.status, "settled");
    assert.equal(pendingAfter?.outcome, "success");

    const journal = await harness.effectJournalOf(root.executionId);
    assert.deepEqual(
      journal.map((e) => e.phase),
      ["requested", "authorized", "dispatch_started", "completed"],
      "the spawn Effect's history ends in one completed phase",
    );
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "COMPLETED");
  });

  test("a result reaches the calling parent and no other Execution", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child-a", "A"));
    await definitions.save(resultAgent("child-b", "B"));
    const aRef = await definitions.save(
      agent("caller-a", [
        { do: "call", definitionId: "child-a", definitionVersion: 1, requestKey: "shared" },
        { do: "await", eventKinds: ["external.input"], correlationId: "hold" },
        { do: "complete" },
      ]),
    );
    const bRef = await definitions.save(
      agent("caller-b", [
        { do: "call", definitionId: "child-b", definitionVersion: 1, requestKey: "shared" },
        { do: "await", eventKinds: ["external.input"], correlationId: "hold" },
        { do: "complete" },
      ]),
    );
    const a = await harness.createExecution({ definition: aRef, structuralSpawnBudget: 1 });
    const b = await harness.createExecution({ definition: bRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    // Both callers used the request key "shared"; only Execution identity separates them.
    const pa = progressOf((await harness.inspect(a.executionId))!.control.progress);
    const pb = progressOf((await harness.inspect(b.executionId))!.control.progress);
    assert.equal((pa.observations[0] as { terminalResult: { value: string } }).terminalResult.value, "A");
    assert.equal((pb.observations[0] as { terminalResult: { value: string } }).terminalResult.value, "B");
    assert.equal((pa.observations[0] as { childExecutionId: string }).childExecutionId,
      (await harness.childExecutionLinksOf(a.executionId))[0]!.childExecutionId, "A got its own child's result");
  });

  test("a child failure is delivered as child.failed, distinct from success", async () => {
    const { harness, definitions } = rig();
    await definitions.save(agent("doomed", [{ do: "fail", code: "child_gave_up", message: "no" }]));
    const rootRef = await definitions.save(
      agent("caller", [{ do: "call", definitionId: "doomed", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const p = progressOf((await harness.inspect(root.executionId))!.control.progress);
    assert.deepEqual(p.seenKinds, ["child.failed"], "the caller learned the child failed, not that it succeeded");
    assert.equal((p.observations[0] as { failure: { code: string } }).failure.code, "child_gave_up");
    const [pending] = await harness.pendingOperationsOf(root.executionId);
    assert.equal(pending?.outcome, "failure");
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "COMPLETED", "the parent handled the child failure and finished");
  });

  test("a child the Harness itself fails still settles the parent's call dependency", async () => {
    const { harness, definitions } = rig();
    // `misreport` makes the controller return an outcome the Harness refuses to trust -> the child
    // reaches FAILED through failActivation, not through a fail outcome.
    await definitions.save(agent("untrusted", [{ do: "misreport", as: "wrong_kind" }]));
    const rootRef = await definitions.save(
      agent("caller", [{ do: "call", definitionId: "untrusted", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const [link] = await harness.childExecutionLinksOf(root.executionId);
    assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "FAILED");
    const p = progressOf((await harness.inspect(root.executionId))!.control.progress);
    assert.deepEqual(p.seenKinds, ["child.failed"], "the caller was told its child failed");
    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "COMPLETED");
  });

  test("the terminal result is delivered exactly once", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "R"));
    const rootRef = await definitions.save(
      agent("caller", [
        { do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" },
        { do: "await", eventKinds: ["external.input"], correlationId: "hold" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();
    // Extra scheduler turns must not re-deliver.
    await harness.runUntilIdle();

    const p = progressOf((await harness.inspect(root.executionId))!.control.progress);
    assert.equal(p.seenKinds.filter((k) => k === "child.completed").length, 1);
    const journal = await harness.effectJournalOf(root.executionId);
    assert.equal(journal.filter((e) => e.phase === "completed").length, 1);
    const [link] = await harness.childExecutionLinksOf(root.executionId);
    assert.equal(link?.state, "settled", "the link records the result was delivered");
  });

  test("the parent does not become terminal merely because the child did", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "R"));
    const rootRef = await definitions.save(
      agent("long-parent", [
        { do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" },
        { do: "await", eventKinds: ["external.input"], correlationId: "more-work" },
        { do: "complete" },
      ]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runUntilIdle();

    const ctx = await harness.inspect(root.executionId);
    assert.equal(ctx?.lifecycle, "WAITING", "the parent consumed the child result and is still alive, waiting for its own next work");
    const [link] = await harness.childExecutionLinksOf(root.executionId);
    assert.equal((await harness.inspect(link!.childExecutionId))?.lifecycle, "COMPLETED");
  });

  test("child waiting introduces no ControllerResumption and no protocol vocabulary", async () => {
    const { harness, definitions } = rig();
    await definitions.save(resultAgent("child", "R"));
    const rootRef = await definitions.save(
      agent("caller", [{ do: "call", definitionId: "child", definitionVersion: 1, requestKey: "c" }, { do: "complete" }]),
    );
    const root = await harness.createExecution({ definition: rootRef, structuralSpawnBudget: 1 });
    await harness.runOnce();

    assert.equal((await harness.controllerResumptionsOf(root.executionId)).length, 0);
    const [pending] = await harness.pendingOperationsOf(root.executionId);
    assert.equal(pending?.effectKind, "spawn_execution", "the dependency is a PendingOperation");
    const journal = await harness.effectJournalOf(root.executionId);
    for (const entry of journal) {
      assert.ok(!/mcp|a2a|tools\//i.test(JSON.stringify(entry.detail)), "no protocol-specific vocabulary in the journal");
    }
  });
});
