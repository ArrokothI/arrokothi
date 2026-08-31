/**
 * Ownership and root identity.
 *
 * Ownership answers "who created this and where does its ancestry start". It is not communication
 * permission, not inspection rights, and not something an ExecutionId confers. Slice A only assigns
 * the relation; delegated authority and child-completion Events are Slice E's work.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as executionApi from "@agent-sdk/core/execution";
import { createTestHarness, scriptedAgentDefinition, scriptedWorkflowDefinition } from "@agent-sdk/core/testing";

describe("ownership and root identity", () => {
  test("a root Execution owns nothing above it and is its own root", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "root-agent", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });

    assert.equal(handle.ownerExecutionId, null);
    assert.equal(handle.rootExecutionId, handle.executionId);

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.ownerExecutionId, null);
    assert.equal(context?.rootExecutionId, handle.executionId);
  });

  test("an owned Execution keeps its own identity and inherits the root", async () => {
    const { harness, definitions } = createTestHarness();
    const workflowRef = await definitions.save(scriptedWorkflowDefinition({ id: "parent-flow", program: [{ do: "complete" }] }));
    const agentRef = await definitions.save(scriptedAgentDefinition({ id: "child-agent", program: [{ do: "complete" }] }));

    const parent = await harness.createExecution({ definition: workflowRef });
    const child = await harness.createExecution({ definition: agentRef, ownerExecutionId: parent.executionId });
    const grandchild = await harness.createExecution({ definition: agentRef, ownerExecutionId: child.executionId });

    assert.equal(child.ownerExecutionId, parent.executionId);
    assert.equal(child.rootExecutionId, parent.executionId);
    assert.equal(grandchild.ownerExecutionId, child.executionId);
    assert.equal(grandchild.rootExecutionId, parent.executionId, "root is the top of the ownership tree, not the direct owner");

    assert.notEqual(child.executionId, parent.executionId);
    const childContext = await harness.inspect(child.executionId);
    const parentContext = await harness.inspect(parent.executionId);
    assert.notEqual(childContext?.mailbox.mailboxId, parentContext?.mailbox.mailboxId, "a child has its own mailbox");
    assert.equal(childContext?.kind, "agent", "an owned Execution keeps the kind of its own definition");
  });

  test("creating an owned Execution under an unknown owner is refused", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "orphan", program: [{ do: "complete" }] }));
    await assert.rejects(
      () => harness.createExecution({ definition: ref, ownerExecutionId: "exe_nobody" as never }),
      /unknown execution/,
    );
  });

  test("knowing an ExecutionId grants no authority over it", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "private", program: [{ do: "await", eventKinds: ["owner.only"] }, { do: "complete" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    // The public surface offers observation and addressed Events. It offers no way to transition an
    // Execution, write its progress, or reach its store, however well known its id is.
    const surface = Object.keys(executionApi);
    for (const forbidden of ["transitionContext", "withControllerProgress", "createExecutionContext", "assertTransition"]) {
      assert.ok(!surface.includes(forbidden), `${forbidden} must not be part of the application surface`);
    }

    const snapshot = await harness.inspect(handle.executionId);
    assert.ok(snapshot);
    (snapshot as { lifecycle: string }).lifecycle = "COMPLETED";
    assert.equal(
      (await harness.inspect(handle.executionId))?.lifecycle,
      "WAITING",
      "an observation is a copy; writing to it changes nothing",
    );

    // An Event is the only thing an id lets you send, and it is still checked.
    const receipt = await harness.deliverEvent({ destination: handle.executionId, kind: "attacker.command" });
    assert.equal(receipt.status, "delivered");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "an unrelated Event grants nothing");
  });
});
