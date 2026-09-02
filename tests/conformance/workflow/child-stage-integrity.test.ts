/**
 * Agent Stage / Workflow Stage definition-kind integrity and refused-spawn handling (Slice E.2).
 *
 * A Stage is one Workflow Stage boundary implemented by a child `call`. The controller proposes the
 * spawn; the Harness owns existence/kind truth:
 *
 *   Agent Stage    -> child Definition must resolve to kind "agent"
 *   Workflow Stage -> child Definition must resolve to kind "workflow"
 *   a mismatch, a missing Definition, a denied spawn -> the Stage fails explicitly, no child exists
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineAgent, defineWorkflow } from "@agent-sdk/core/execution";
import type { WorkflowSpecInput } from "@agent-sdk/core/execution";
import { createAllowListAuthorizer } from "@agent-sdk/core/reference";
import { createScriptedAgentController, createWorkflowTestHarness, scriptedAgentDefinition } from "@agent-sdk/core/testing";

const STRING_RESULT = { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } } as const;

function childStageWorkflow(kind: "agent" | "workflow", child = { definitionId: "child", definitionVersion: 1 }): WorkflowSpecInput {
  return {
    entryStage: "delegate",
    stages: [
      { id: "delegate", kind, child, transitions: { kind: "always", next: { to: "complete", terminal: { kind: "none" } } } },
    ],
  };
}

function rig() {
  return createWorkflowTestHarness({
    extraControllers: [createScriptedAgentController()],
    authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
  });
}

describe("child-kind integrity", () => {
  test("an Agent Stage pointed at a Workflow Definition fails with a kind mismatch and creates no child", async () => {
    const { harness, definitions, store } = rig();
    await definitions.save(defineWorkflow({ id: "child", spec: { entryStage: "s", stages: [{ id: "s", kind: "function", implementationRef: "noop", transitions: { kind: "always", next: { to: "complete" } } }] } }));
    const ref = await definitions.save(defineWorkflow({ id: "agent-stage-mismatch", spec: childStageWorkflow("agent") }));
    const handle = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_stage_spawn_rejected");
    assert.match(context?.failure?.message ?? "", /spawn_definition_kind_mismatch|workflow definition/);
    assert.deepEqual((await store.listExecutions()).map((e) => e.executionId), [handle.executionId], "no child Execution");
  });

  test("a Workflow Stage pointed at an Agent Definition fails with a kind mismatch", async () => {
    const { harness, definitions } = rig();
    await definitions.save(scriptedAgentDefinition({ id: "child", program: [{ do: "complete" }] }));
    const ref = await definitions.save(defineWorkflow({ id: "workflow-stage-mismatch", spec: childStageWorkflow("workflow") }));
    const handle = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "workflow_stage_spawn_rejected");
  });

  test("a missing child Definition fails the Stage explicitly and creates no child", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(
      defineWorkflow({ id: "missing-child", spec: childStageWorkflow("agent", { definitionId: "nope", definitionVersion: 9 }) }),
    );
    const handle = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_stage_spawn_rejected");
  });

  test("a denied spawn fails the Stage explicitly (effect.denied, no child)", async () => {
    const { harness, definitions, store } = createWorkflowTestHarness({
      extraControllers: [createScriptedAgentController()],
      authorizer: createAllowListAuthorizer({ grants: [] }), // spawn denied by default
    });
    await definitions.save(scriptedAgentDefinition({ id: "child", program: [{ do: "complete" }] }));
    const ref = await definitions.save(defineWorkflow({ id: "denied-delegation", spec: childStageWorkflow("agent") }));
    const handle = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_stage_spawn_denied");
    assert.deepEqual((await store.listExecutions()).map((e) => e.executionId), [handle.executionId]);
  });

  test("childInput is rejected at authoring - the adapted StageResult is the child's input", () => {
    assert.throws(
      () =>
        defineWorkflow({
          id: "with-child-input",
          spec: {
            entryStage: "d",
            stages: [
              {
                id: "d",
                kind: "agent",
                child: { definitionId: "c", definitionVersion: 1 },
                // @ts-expect-error childInput was removed in Slice E.2
                childInput: { depth: "shallow" },
                transitions: { kind: "always", next: { to: "complete" } },
              },
            ],
          },
        }),
      /childInput was removed/,
    );
  });

  test("a structured child terminal result fails the Stage rather than being stringified through the edge", async () => {
    const { harness, definitions } = rig();
    await definitions.save(
      // A scripted Agent whose terminal result is an object, not a string.
      scriptedAgentDefinition({
        id: "child",
        program: [{ do: "complete", result: { structured: true } }],
        terminalResult: { schemaId: "obj", schemaVersion: 1, schema: { kind: "object", fields: { structured: { schema: { kind: "boolean" } } } } },
      }),
    );
    const ref = await definitions.save(defineWorkflow({ id: "structured-child", spec: childStageWorkflow("agent") }));
    const handle = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_stage_child_failed");
    assert.match(context?.failure?.message ?? "", /child_structured_terminal_result/);
    void STRING_RESULT;
    void defineAgent;
  });
});
