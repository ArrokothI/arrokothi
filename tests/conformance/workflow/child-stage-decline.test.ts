/**
 * Declining the exact-payload confirmation for an Agent Stage / Workflow Stage child call (E.2.1).
 *
 * E.2 made mechanical confirmation generic over `spawn_execution`, so a child-Stage call can be
 * gated. When the human declines:
 *
 *   no child Execution is created
 *   the SAME spawn PendingOperation settles `declined` (not failure / denied / rejected)
 *   the child barrier settles `spawn_declined` (distinct from `spawn_denied` / `spawn_rejected`)
 *   the parent Stage terminates explicitly with a decline-specific failure code
 *   the parent Workflow does not remain WAITING on the old correlation
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow } from "@arrokothi/core/execution";
import type { WorkflowSpecInput } from "@arrokothi/core/execution";
import { createAllowListAuthorizer } from "@arrokothi/core/reference";
import type { ConfirmationPolicy } from "@arrokothi/core/ports";
import { createScriptedAgentController, createWorkflowTestHarness, scriptedAgentDefinition } from "@arrokothi/core/testing";

const STRING_RESULT = { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } } as const;

const gateSpawn: ConfirmationPolicy = {
  requires: (r) => (r.effectKind === "spawn_execution" ? { required: true, reason: "review this delegation" } : { required: false }),
};

function childStageWorkflow(kind: "agent" | "workflow"): WorkflowSpecInput {
  return {
    entryStage: "delegate",
    stages: [
      {
        id: "delegate",
        kind,
        child: { definitionId: "child", definitionVersion: 1 },
        transitions: { kind: "always", next: { to: "complete", terminal: { kind: "none" } } },
      },
    ],
  };
}

function rig() {
  return createWorkflowTestHarness({
    extraControllers: [createScriptedAgentController()],
    authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
    confirmationPolicy: gateSpawn,
  });
}

async function proveDeclined(kind: "agent" | "workflow") {
  const { harness, definitions, store } = rig();
  if (kind === "agent") {
    await definitions.save(scriptedAgentDefinition({ id: "child", program: [{ do: "complete", result: "done" }], terminalResult: STRING_RESULT }));
  } else {
    await definitions.save(
      defineWorkflow({
        id: "child",
        terminalResult: STRING_RESULT,
        spec: {
          entryStage: "s",
          stages: [{ id: "s", kind: "function", implementationRef: "noop", transitions: { kind: "always", next: { to: "complete", terminal: { kind: "value", value: "done" } } } }],
        },
      }),
    );
  }
  const ref = await definitions.save(defineWorkflow({ id: `${kind}-stage-decline`, spec: childStageWorkflow(kind) }));
  const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
  await harness.runUntilIdle();

  assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "WAITING", `${kind}: gated on the child-call confirmation`);
  const [confirmation] = await harness.confirmationRequestsOf(parent.executionId);
  assert.ok(confirmation, `${kind}: the SpawnExecution was gated`);
  assert.equal(confirmation!.effectKind, "spawn_execution");
  const gatedPendingId = confirmation!.pendingOperationId;
  assert.equal((await store.listExecutions()).length, 1, `${kind}: no child Execution while the confirmation is pending`);

  const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "decline" });
  assert.equal(receipt.status, "declined");

  await harness.runUntilIdle();

  // No child Execution was ever created.
  assert.deepEqual(
    (await store.listExecutions()).map((e) => e.executionId),
    [parent.executionId],
    `${kind}: no child Execution exists`,
  );
  assert.equal((await harness.childExecutionLinksOf(parent.executionId)).length, 0, `${kind}: no child link`);

  // The SAME spawn PendingOperation settled `declined`.
  const record = (await harness.pendingOperationsOf(parent.executionId)).find((p) => p.pendingOperationId === gatedPendingId);
  assert.ok(record, `${kind}: the gated PendingOperation still exists`);
  assert.equal(record!.status, "settled");
  assert.equal(record!.outcome, "declined", `${kind}: declined, not denied / rejected / failure`);
  assert.equal(record!.dispatch, "not_dispatched");

  // The parent Stage terminated explicitly with a decline-specific code - not hung, not "child
  // failed", not "policy denied".
  const context = await harness.inspect(parent.executionId);
  assert.equal(context?.lifecycle, "FAILED", `${kind}: the parent Workflow terminated, it did not remain WAITING`);
  assert.equal(context?.failure?.code, `${kind}_stage_spawn_declined`, `${kind}: a decline-specific failure code`);
  assert.ok(!/denied|rejected|child_failed/.test(context?.failure?.code ?? ""), `${kind}: not relabelled`);

  return context;
}

describe("child Stage confirmation decline", () => {
  test("an Agent Stage whose child call is declined fails the Stage with agent_stage_spawn_declined", async () => {
    await proveDeclined("agent");
  });

  test("a Workflow Stage whose child call is declined fails the Stage with workflow_stage_spawn_declined", async () => {
    await proveDeclined("workflow");
  });
});
