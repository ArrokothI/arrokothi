/**
 * Agent Stage: one Workflow Stage boundary implemented by a child Agent `call` (Slice E.2).
 *
 *   the Stage gets no ExecutionId / lifecycle / mailbox / authority - the child gets all of them
 *   exactly one child call, never re-spawned when the Workflow controller re-enters after WAITING
 *   the child's string terminal result becomes the Stage's `text` result and flows to the next Stage
 *   child authority = requestedOperations ∩ the parent's CURRENT effective operation authority
 *   child failure / cancellation fail the Stage explicitly (cancellation is not relabelled failure)
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow } from "@agent-sdk/core/execution";
import { createAllowListAuthorizer, createFunctionStageRegistry } from "@agent-sdk/core/reference";
import {
  createScriptedAgentController,
  createWorkflowTestHarness,
  scriptedAgentDefinition,
} from "@agent-sdk/core/testing";

const STRING = { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } } as const;
const KNOW = { capability: "knowledge.query", operation: "search" } as const;

function rig(seen: (string | null)[]) {
  return createWorkflowTestHarness({
    extraControllers: [createScriptedAgentController()],
    functions: createFunctionStageRegistry({
      record: (ctx) => {
        seen.push(ctx.input);
        return { status: "completed", result: ctx.input };
      },
    }),
    authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
  });
}

const PARENT_SPEC = {
  entryStage: "delegate",
  stages: [
    {
      id: "delegate",
      kind: "agent" as const,
      child: { definitionId: "researcher", definitionVersion: 1 },
      requestedOperations: [KNOW],
      transitions: { kind: "always" as const, next: { to: "stage" as const, stage: "after" } },
    },
    { id: "after", kind: "function" as const, implementationRef: "record", transitions: { kind: "always" as const, next: { to: "complete" as const, terminal: { kind: "none" as const } } } },
  ],
};

describe("Agent Stage", () => {
  test("calls a child Agent once, has no identity of its own, and hands the child's text to the next Stage", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions, store } = rig(seen);
    await definitions.save(
      scriptedAgentDefinition({ id: "researcher", program: [{ do: "complete", result: "evidence collected" }], terminalResult: STRING }),
    );
    const ref = await definitions.save(defineWorkflow({ id: "delegating-workflow", spec: PARENT_SPEC }));
    const parent = await harness.createExecution({
      definition: ref,
      structuralSpawnBudget: 5,
      operationAuthority: { operations: [KNOW, { capability: "mail.send", operation: "send" }] },
    });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "COMPLETED", "parent Workflow completed");

    // Exactly two Executions: the parent Workflow and the child Agent. The Stage is not one.
    const executions = await store.listExecutions();
    assert.equal(executions.length, 2);
    const child = executions.find((e) => e.executionId !== parent.executionId)!;
    assert.equal(child.kind, "agent");
    assert.equal(child.ownerExecutionId, parent.executionId);
    assert.equal((await harness.inspect(child.executionId))?.lifecycle, "COMPLETED");

    // The child has an independent identity, lifecycle, mailbox, and authority.
    assert.notEqual(child.mailbox.mailboxId, (await harness.inspect(parent.executionId))!.mailbox.mailboxId);
    const childAuthority = await harness.effectiveOperationAuthorityOf(child.executionId);
    assert.deepEqual(childAuthority?.operations, [KNOW], "child authority = requested ∩ parent current");
    assert.equal(childAuthority?.source, "delegated");

    // Exactly one child call, and it settled.
    const links = await harness.childExecutionLinksOf(parent.executionId);
    assert.equal(links.length, 1, "one child call, never re-spawned on re-entry");
    assert.equal(links[0]!.state, "settled");
    assert.notEqual(links[0]!.pendingOperationId, null, "a call, not a detached spawn");

    // The child's string terminal result reached the next Stage as the Stage's `text` result.
    assert.deepEqual(seen, ["evidence collected"]);
  });

  test("a child failure fails the Stage explicitly", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions } = rig(seen);
    await definitions.save(scriptedAgentDefinition({ id: "researcher", program: [{ do: "fail", code: "no_sources", message: "nothing to cite" }] }));
    const ref = await definitions.save(defineWorkflow({ id: "wf-fail", spec: PARENT_SPEC }));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5, operationAuthority: { operations: [KNOW] } });
    await harness.runUntilIdle();

    const context = await harness.inspect(parent.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_stage_child_failed");
    assert.match(context?.failure?.message ?? "", /no_sources/);
    assert.deepEqual(seen, [], "the next Stage never ran");
  });

  test("a child cancellation fails the Stage with a cancellation-specific reason, not as ordinary failure", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions, store } = rig(seen);
    // A child that holds forever, so the test can cancel it while the parent Stage waits.
    await definitions.save(
      scriptedAgentDefinition({ id: "researcher", program: [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete", result: "x" }], terminalResult: STRING }),
    );
    const ref = await definitions.save(defineWorkflow({ id: "wf-cancel", spec: PARENT_SPEC }));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5, operationAuthority: { operations: [KNOW] } });
    await harness.runUntilIdle();

    const child = (await store.listExecutions()).find((e) => e.executionId !== parent.executionId)!;
    assert.equal((await harness.inspect(child.executionId))?.lifecycle, "WAITING");
    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "WAITING", "the parent Stage is waiting on the child");

    await harness.cancelExecution({ executionId: child.executionId, reason: "budget cut" });
    await harness.runUntilIdle();

    const context = await harness.inspect(parent.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "agent_stage_child_cancelled", "cancellation is its own reason");
    assert.match(context?.failure?.message ?? "", /budget cut/);
  });

  test("a child that returns no value gives the Stage a `none` result", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions } = rig(seen);
    await definitions.save(scriptedAgentDefinition({ id: "researcher", program: [{ do: "complete" }] })); // no terminalResult schema -> null
    const ref = await definitions.save(defineWorkflow({ id: "wf-none", spec: PARENT_SPEC }));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5, operationAuthority: { operations: [KNOW] } });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(seen, [null], "the child produced no value; the Stage result is `none`");
  });

  test("absent requestedOperations means the child receives no operation authority", async () => {
    const seen: (string | null)[] = [];
    const { harness, definitions, store } = rig(seen);
    await definitions.save(scriptedAgentDefinition({ id: "researcher", program: [{ do: "complete", result: "ok" }], terminalResult: STRING }));
    const ref = await definitions.save(
      defineWorkflow({
        id: "wf-no-ops",
        spec: {
          entryStage: "delegate",
          stages: [
            { id: "delegate", kind: "agent", child: { definitionId: "researcher", definitionVersion: 1 }, transitions: { kind: "always", next: { to: "complete", terminal: { kind: "none" } } } },
          ],
        },
      }),
    );
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5, operationAuthority: { operations: [KNOW] } });
    await harness.runUntilIdle();
    const child = (await store.listExecutions()).find((e) => e.executionId !== parent.executionId)!;
    assert.deepEqual((await harness.effectiveOperationAuthorityOf(child.executionId))?.operations, [], "never 'inherit everything'");
  });
});
