/**
 * Cross-feature composition.
 *
 * These prove the features compose: a child Execution behind one Workflow Stage boundary runs
 * its own user-input and mechanical-confirmation cycles, and the parent Stage resumes normally on
 * the child's terminal result. The parent Workflow never learns the child's internal cycles.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow } from "@arrokothi/core/execution";
import type { WorkflowSpecInput } from "@arrokothi/core/execution";
import {
  createAllowListAuthorizer,
  createCapabilityConfirmationPolicy,
  createFunctionStageRegistry,
  createScriptedCapabilityExecutor,
} from "@arrokothi/core/reference";
import {
  createScriptedAgentController,
  createWorkflowTestHarness,
  scriptedAgentDefinition,
} from "@arrokothi/core/testing";

const STRING = { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } } as const;

function agentStageParent(childId: string): WorkflowSpecInput {
  return {
    entryStage: "delegate",
    stages: [
      { id: "delegate", kind: "agent", child: { definitionId: childId, definitionVersion: 1 }, requestedOperations: [{ capability: "world.trade", operation: "execute" }], transitions: { kind: "always", next: { to: "stage", stage: "after" } } },
      { id: "after", kind: "function", implementationRef: "record", transitions: { kind: "always", next: { to: "complete", terminal: { kind: "none" } } } },
    ],
  };
}

describe("a child Stage runs its own user-input cycle", () => {
  test("child waits for user input, the user responds, the child completes, and the parent Stage resumes", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions, store } = createWorkflowTestHarness({
      extraControllers: [createScriptedAgentController()],
      functions: createFunctionStageRegistry({ record: (ctx) => { seen.push(ctx.input); return { status: "completed", result: ctx.input }; } }),
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true, userInput: true }),
    });
    await definitions.save(
      scriptedAgentDefinition({
        id: "asker-child",
        program: [{ do: "request_user_input", prompt: "Which environment?", requestKey: "env" }, { do: "complete", result: "ran in production" }],
        terminalResult: STRING,
      }),
    );
    const ref = await definitions.save(defineWorkflow({ id: "parent-of-asker", spec: agentStageParent("asker-child") }));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5, operationAuthority: { operations: [{ capability: "world.trade", operation: "execute" }] } });
    await harness.runUntilIdle();

    // The parent Stage is waiting on the child's terminal result; the child is waiting on the user.
    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "WAITING");
    const child = (await store.listExecutions()).find((e) => e.executionId !== parent.executionId)!;
    assert.equal((await harness.inspect(child.executionId))?.lifecycle, "WAITING");
    const [request] = await harness.userInputRequestsOf(child.executionId);
    assert.ok(request, "the child - not the parent - owns the open user-input request");
    assert.deepEqual(await harness.userInputRequestsOf(parent.executionId), []);

    await harness.submitUserInput({ requestId: request!.requestId, value: "production" });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(child.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(seen, ["ran in production"], "the parent Stage resumed on the child's terminal result");
  });
});

describe("a child Stage runs its own confirmation cycle", () => {
  test("a gated child Effect pauses, approval dispatches it, the child continues, and the parent child-call settles normally", async () => {
    const seen: (string | null)[] = [];
    const executor = createScriptedCapabilityExecutor({
      handlers: { "world.trade:execute": (r) => ({ status: "success", observation: { filled: r.input } }) },
    });
    const { harness, definitions, store } = createWorkflowTestHarness({
      extraControllers: [createScriptedAgentController()],
      functions: createFunctionStageRegistry({ record: (ctx) => { seen.push(ctx.input); return { status: "completed", result: ctx.input }; } }),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "world.trade", operations: ["execute"], forceConsequential: true }], spawn: true }),
      confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: "world.trade", operations: ["execute"] }] }),
      capabilities: executor,
    });
    await definitions.save(
      scriptedAgentDefinition({
        id: "trader-child",
        program: [
          { do: "use_capability", capability: "world.trade", operation: "execute", input: { asset: "BTC", qty: 1 }, requestKey: "t" },
          { do: "complete", result: "trade settled" },
        ],
        terminalResult: STRING,
      }),
    );
    const ref = await definitions.save(defineWorkflow({ id: "parent-of-trader", spec: agentStageParent("trader-child") }));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5, operationAuthority: { operations: [{ capability: "world.trade", operation: "execute" }] } });
    await harness.runUntilIdle();

    const child = (await store.listExecutions()).find((e) => e.executionId !== parent.executionId)!;
    assert.equal(executor.callCount, 0, "the child's trade is gated on confirmation");
    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "WAITING", "the parent Stage waits on the child");

    const [confirmation] = await harness.confirmationRequestsOf(child.executionId);
    assert.ok(confirmation, "the child owns the confirmation");
    await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1, "the approval dispatched the child's exact stored payload");
    assert.equal((await harness.inspect(child.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(seen, ["trade settled"], "the parent child-call settled normally");
  });
});
