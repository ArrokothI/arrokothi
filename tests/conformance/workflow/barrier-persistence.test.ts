/**
 * The barrier lives in persisted semantic records, not in process memory.
 *
 * A Workflow that is waiting on required operations must be reconstructable from what the runtime
 * durably knows: the Execution's controller progress plus the authoritative mailbox and
 * pending-operation records. Nothing about the barrier may depend on a Promise, a closure, or an
 * executor that happened to be alive in the process that dispatched it.
 *
 * This is a *reference-runtime* reconstruction, not a crash-recovery claim. Real durability -
 * restart, an idempotent dispatch boundary, recovering an Execution that was mid-Activation - is
 * Slice I. What is proved here is narrower and still worth proving: a second Harness with a fresh
 * WorkflowController, reading the same persisted records, resumes into exactly the Stage state the
 * first one left behind rather than inventing a different one.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ControllerRegistry,
  Harness,
  createWorkflowController,
  defineWorkflow,
  readWorkflowControlState,
} from "@agent-sdk/core/execution";
import type { FunctionStageOutcome, StageExecutionContext } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createFunctionStageRegistry,
} from "@agent-sdk/core/reference";
import { createWorkflowTestHarness } from "@agent-sdk/core/testing";

function gather(context: StageExecutionContext): FunctionStageOutcome {
  if (context.progress["requested"] !== true) {
    return {
      status: "awaitEffects",
      progress: { requested: true, note: "asked for evidence" },
      effects: [{ key: "evidence", capability: "knowledge.retrieval", operation: "search", input: { q: "x" } }],
    };
  }
  return { status: "completed", result: `${context.observations[0]?.outcome ?? "none"}/${context.progress["note"]}` };
}

const functions = () => createFunctionStageRegistry({ gather, echo: (context) => ({ status: "completed", result: context.input }) });

const workflow = defineWorkflow({
  id: "persisted-barrier",
  spec: {
    entryStage: "gather",
    stages: [
      { id: "gather", kind: "function", implementationRef: "gather", transitions: { kind: "always", next: { to: "stage", stage: "report" } } },
      { id: "report", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "complete" } } },
    ],
  },
});

describe("Workflow barrier persistence", () => {
  test("controller progress is plain data that survives a JSON round trip", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      functions: functions(),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities: executor,
    });
    const ref = await definitions.save(workflow);
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const progress = (await harness.inspect(handle.executionId))!.control.progress;
    assert.deepEqual(JSON.parse(JSON.stringify(progress)), progress, "no promise, signal, executor, or closure is in here");

    const state = readWorkflowControlState(progress)!;
    assert.equal(state.currentStage, "gather");
    assert.equal(state.visit, 1);
    assert.deepEqual(state.stageProgress, { requested: true, note: "asked for evidence" });
    assert.deepEqual(state.barrier, [
      {
        key: "evidence",
        correlationId: "wf/gather#1/evidence",
        kind: "effect",
        capability: "knowledge.retrieval",
        operation: "search",
        settled: false,
        outcome: null,
        observation: null,
        error: null,
      },
    ]);
  });

  test("a second Harness reconstructed from the persisted records resumes the same Stage state", async () => {
    const executor = createDeferredCapabilityExecutor();
    const first = createWorkflowTestHarness({
      functions: functions(),
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities: executor,
    });
    const ref = await first.definitions.save(workflow);
    const handle = await first.harness.createExecution({ definition: ref });
    await first.harness.runUntilIdle();
    assert.equal((await first.harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    const beforeState = readWorkflowControlState((await first.harness.inspect(handle.executionId))!.control.progress)!;
    const pending = (await first.harness.pendingOperationsOf(handle.executionId))[0]!;

    // A different Harness, a brand-new WorkflowController, over the same persisted records. The
    // deferred executor that dispatched the operation is deliberately not carried across: the
    // result arrives through the trusted settlement ingress, as it would from any out-of-band
    // transport after a restart.
    const rebuilt = new Harness({
      definitions: first.definitions,
      store: first.store,
      scheduler: first.scheduler,
      controllers: new ControllerRegistry([createWorkflowController({ functions: functions() })]),
      clock: first.clock,
      ids: first.ids,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
    });

    const resumedState = readWorkflowControlState((await rebuilt.inspect(handle.executionId))!.control.progress)!;
    assert.deepEqual(resumedState, beforeState, "the reconstructed runtime does not invent a different Stage state");

    const receipt = await rebuilt.settleEffect({
      pendingOperationId: pending.pendingOperationId,
      effectId: pending.effectId,
      outcome: { status: "success", observation: { found: true } },
    });
    assert.equal(receipt.status, "settled", receipt.status === "rejected" ? receipt.detail : "");
    await rebuilt.runUntilIdle();

    const context = await rebuilt.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    const finalState = readWorkflowControlState(context!.control.progress)!;
    assert.equal(finalState.currentStage, "report");
    assert.equal(
      finalState.provisionalResult,
      "completed/asked for evidence",
      "Stage-local progress and the settled observation both survived the reconstruction",
    );
  });
});
