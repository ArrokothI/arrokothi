/**
 * Workflow Stage: one Workflow Stage boundary implemented by a child Workflow `call` (Slice E.2).
 *
 * Structurally identical to an Agent Stage - the only difference is the child Definition kind. From
 * the parent graph's perspective the child Workflow remains one Stage boundary; its topology is
 * never flattened into the parent. Recursive Workflow composition is legal.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow } from "@arrokothi/core/execution";
import type { WorkflowSpecInput } from "@arrokothi/core/execution";
import { createAllowListAuthorizer, createFunctionStageRegistry } from "@arrokothi/core/reference";
import { createWorkflowTestHarness } from "@arrokothi/core/testing";

const STRING = { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } } as const;

function rig(seen: (string | null)[] = []) {
  return createWorkflowTestHarness({
    functions: createFunctionStageRegistry({
      passthrough: (ctx) => ({ status: "completed", result: ctx.input }),
      record: (ctx) => {
        seen.push(ctx.input);
        return { status: "completed", result: ctx.input };
      },
    }),
    authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
  });
}

/** A leaf child Workflow: one Function Stage, then complete with a fixed string. */
function leafWorkflow(id: string, value: string): Parameters<typeof defineWorkflow>[0] {
  return {
    id,
    terminalResult: STRING,
    spec: {
      entryStage: "work",
      stages: [
        { id: "work", kind: "function", implementationRef: "passthrough", transitions: { kind: "always", next: { to: "complete", terminal: { kind: "value", value } } } },
      ],
    } as WorkflowSpecInput,
  };
}

/** A parent whose entry Stage is a Workflow Stage calling `childId`, then a `record` Function Stage. */
function parentWorkflow(id: string, childId: string, childVersion = 1): Parameters<typeof defineWorkflow>[0] {
  return {
    id,
    spec: {
      entryStage: "delegate",
      stages: [
        { id: "delegate", kind: "workflow", child: { definitionId: childId, definitionVersion: childVersion }, transitions: { kind: "always", next: { to: "stage", stage: "after" } } },
        { id: "after", kind: "function", implementationRef: "record", transitions: { kind: "always", next: { to: "complete", terminal: { kind: "none" } } } },
      ],
    } as WorkflowSpecInput,
  };
}

describe("Workflow Stage", () => {
  test("calls a child Workflow once and hands its terminal result to the next Stage", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions, store } = rig(seen);
    await definitions.save(defineWorkflow(leafWorkflow("child-workflow", "child workflow result")));
    const ref = await definitions.save(defineWorkflow(parentWorkflow("parent-workflow", "child-workflow")));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(seen, ["child workflow result"], "the child's terminal result is the Stage's text result");

    const executions = await store.listExecutions();
    assert.equal(executions.length, 2, "parent + one child Workflow; the Stage is not an Execution");
    const child = executions.find((e) => e.executionId !== parent.executionId)!;
    assert.equal(child.kind, "workflow");
    assert.equal(child.ownerExecutionId, parent.executionId);
    assert.equal(child.rootExecutionId, parent.executionId);

    const links = await harness.childExecutionLinksOf(parent.executionId);
    assert.equal(links.length, 1);
    assert.equal(links[0]!.state, "settled");
  });

  test("recursive nested Workflow composition: parent -> Workflow Stage -> child -> Workflow Stage -> grandchild", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions, store } = rig(seen);
    await definitions.save(defineWorkflow(leafWorkflow("grandchild", "deep result")));
    // The child's entry Stage is itself a Workflow Stage calling the grandchild.
    await definitions.save(
      defineWorkflow({
        id: "child",
        terminalResult: STRING,
        spec: {
          entryStage: "sub",
          stages: [
            { id: "sub", kind: "workflow", child: { definitionId: "grandchild", definitionVersion: 1 }, transitions: { kind: "always", next: { to: "complete", terminal: { kind: "value", value: "child wrapped grandchild" } } } },
          ],
        } as WorkflowSpecInput,
      }),
    );
    const ref = await definitions.save(defineWorkflow(parentWorkflow("root", "child")));
    const root = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(root.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(seen, ["child wrapped grandchild"]);

    const executions = await store.listExecutions();
    assert.equal(executions.length, 3, "three independent Executions, one per Workflow");
    for (const execution of executions) {
      assert.equal(execution.rootExecutionId, root.executionId, "the whole lineage shares one root");
      assert.equal((await harness.inspect(execution.executionId))?.lifecycle, "COMPLETED");
    }
    // Each has its own mailbox.
    const mailboxes = new Set(executions.map((e) => e.mailbox.mailboxId));
    assert.equal(mailboxes.size, 3);

    // The parent graph never flattened the child topology: the parent has exactly one child link.
    assert.equal((await harness.childExecutionLinksOf(root.executionId)).length, 1);
    const child = executions.find((e) => e.ownerExecutionId === root.executionId)!;
    assert.equal((await harness.childExecutionLinksOf(child.executionId)).length, 1, "the child owns the grandchild link, not the root");
  });

  test("a child Workflow failure fails the parent Stage explicitly", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        boom: () => ({ status: "failed", code: "sub_pipeline_broke", message: "the nested pipeline failed" }),
        record: (ctx) => ({ status: "completed", result: ctx.input }),
      }),
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
    });
    await definitions.save(
      defineWorkflow({
        id: "failing-child",
        spec: { entryStage: "w", stages: [{ id: "w", kind: "function", implementationRef: "boom", transitions: { kind: "always", next: { to: "complete" } } }] } as WorkflowSpecInput,
      }),
    );
    const ref = await definitions.save(defineWorkflow(parentWorkflow("parent-of-failing", "failing-child")));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    const context = await harness.inspect(parent.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "workflow_stage_child_failed");
  });
});
