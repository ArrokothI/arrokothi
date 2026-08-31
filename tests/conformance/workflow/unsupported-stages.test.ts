/**
 * Agent and Workflow Stages are definition-valid and runtime-unsupported until Slice E.
 *
 * The temptation each of these guards against is a different way of pretending child composition
 * exists: creating a child Execution, fabricating a child result, flattening the child's topology
 * into the parent graph, running the child definition as if it were a local function, or proposing
 * the `SpawnExecution` Effect that nothing can currently dispatch.
 *
 * What happens instead is an explicit, inspectable unsupported failure that names the Stage, its
 * kind, the child definition it *would* have called, and the slice that will implement it.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow } from "@agent-sdk/core/execution";
import type { WorkflowSpecInput } from "@agent-sdk/core/execution";
import { createAllowListAuthorizer, createFunctionStageRegistry, createScriptedCapabilityExecutor } from "@agent-sdk/core/reference";
import { createWorkflowTestHarness } from "@agent-sdk/core/testing";

const functions = createFunctionStageRegistry({ echo: (context) => ({ status: "completed", result: context.input }) });

function childStageWorkflow(kind: "agent" | "workflow"): WorkflowSpecInput {
  return {
    entryStage: "delegate",
    stages: [
      {
        id: "delegate",
        kind,
        child: { definitionId: "some-child", definitionVersion: 2 },
        childInput: { depth: "shallow" },
        transitions: { kind: "always", next: { to: "stage", stage: "after" } },
      },
      { id: "after", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "complete" } } },
    ],
  };
}

describe("Agent and Workflow Stages before Slice E", () => {
  for (const kind of ["agent", "workflow"] as const) {
    test(`a ${kind} Stage authors and validates`, () => {
      const definition = defineWorkflow({ id: `${kind}-stage`, spec: childStageWorkflow(kind) });
      const stage = definition.spec.stages[0]!;
      assert.equal(stage.kind, kind);
      assert.equal(JSON.parse(JSON.stringify(definition)).spec.stages[0].child.definitionId, "some-child");
    });

    test(`executing a ${kind} Stage reports an explicit unsupported result and creates no child`, async () => {
      const { harness, definitions, store, trace } = createWorkflowTestHarness({
        functions,
        // Permissive policy and a live executor, so nothing about this failure can be attributed to
        // policy or to a missing backend.
        authorizer: createAllowListAuthorizer({ grants: [{ capability: "anything" }] }),
        capabilities: createScriptedCapabilityExecutor({ fallback: () => ({ status: "success", observation: "ran" }) }),
      });
      const ref = await definitions.save(defineWorkflow({ id: `${kind}-stage`, spec: childStageWorkflow(kind) }));
      const handle = await harness.createExecution({ definition: ref });
      await harness.runUntilIdle();

      const context = await harness.inspect(handle.executionId);
      assert.equal(context?.lifecycle, "FAILED");
      assert.equal(context?.failure?.code, "stage_kind_unsupported");
      assert.deepEqual(context?.failure?.details, {
        stageId: "delegate",
        stageKind: kind,
        childDefinitionId: "some-child",
        childDefinitionVersion: 2,
        supportedFrom: "slice-e",
      });

      // No child Execution exists, no Effect was proposed, and the Workflow did not flatten the
      // child away by continuing to the next Stage.
      const everyExecution = await store.listExecutions();
      assert.deepEqual(everyExecution.map((execution) => execution.executionId), [handle.executionId]);
      assert.equal(everyExecution[0]?.ownerExecutionId, null);
      assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
      assert.deepEqual(trace.transitions, [], "an unsupported Stage does not transition");
    });
  }
});
