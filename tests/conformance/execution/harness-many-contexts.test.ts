/**
 * One logical Harness, many Executions.
 *
 * Not one Harness per definition, per Agent, or per request. A single instance supervises
 * heterogeneous Executions concurrently, each with its own identity, mailbox, controller progress,
 * and lifecycle.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition, scriptedWorkflowDefinition } from "@agent-sdk/core/testing";

describe("one Harness, many ExecutionContexts", () => {
  test("a single Harness advances an Agent and a Workflow Execution independently", async () => {
    const { harness, definitions, store } = createTestHarness();

    const agentRef = await definitions.save(
      scriptedAgentDefinition({
        id: "assistant",
        program: [{ do: "remember", key: "who", value: "agent" }, { do: "emit", text: "agent output" }, { do: "complete" }],
      }),
    );
    const workflowRef = await definitions.save(
      scriptedWorkflowDefinition({
        id: "report",
        program: [{ do: "remember", key: "who", value: "workflow" }, { do: "emit", text: "workflow output" }, { do: "complete" }],
      }),
    );

    const agent = await harness.createExecution({ definition: agentRef });
    const workflow = await harness.createExecution({ definition: workflowRef });

    assert.notEqual(agent.executionId, workflow.executionId, "each Execution gets its own identity");

    const activations = await harness.runUntilIdle();
    assert.ok(activations.length >= 6, "both Executions were advanced across several Activations");

    const agentContext = await harness.inspect(agent.executionId);
    const workflowContext = await harness.inspect(workflow.executionId);

    assert.equal(agentContext?.lifecycle, "COMPLETED");
    assert.equal(workflowContext?.lifecycle, "COMPLETED");
    assert.equal(agentContext?.control.kind, "agent");
    assert.equal(workflowContext?.control.kind, "workflow");
    assert.equal(readScriptedProgress(agentContext!.control.progress).notes["who"], "agent");
    assert.equal(readScriptedProgress(workflowContext!.control.progress).notes["who"], "workflow");

    assert.notEqual(
      agentContext?.mailbox.mailboxId,
      workflowContext?.mailbox.mailboxId,
      "Executions do not share a mailbox",
    );

    const stored = await store.listExecutions();
    assert.equal(stored.length, 2, "one Harness holds both ExecutionContexts");

    assert.deepEqual(
      (await harness.emissionsOf(agent.executionId)).map((e) => (e.body.kind === "text" ? e.body.text : null)),
      ["agent output"],
      "emissions belong to the Execution that produced them",
    );
    assert.deepEqual(
      (await harness.emissionsOf(workflow.executionId)).map((e) => (e.body.kind === "text" ? e.body.text : null)),
      ["workflow output"],
    );
  });

  test("Activations interleave across Executions without leaking progress", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "counter",
        program: [{ do: "continue" }, { do: "continue" }, { do: "complete" }],
      }),
    );

    const first = await harness.createExecution({ definition: ref });
    const second = await harness.createExecution({ definition: ref });

    const records = await harness.runUntilIdle();
    const order = records.map((record) => record.executionId);
    assert.ok(order.includes(first.executionId) && order.includes(second.executionId));
    assert.ok(
      order.indexOf(second.executionId) < order.lastIndexOf(first.executionId),
      "the scheduler interleaves rather than draining one Execution to completion first",
    );

    for (const handle of [first, second]) {
      const context = await harness.inspect(handle.executionId);
      assert.equal(context?.lifecycle, "COMPLETED");
      assert.equal(readScriptedProgress(context!.control.progress).step, 3, "each Execution kept its own step cursor");
    }
  });

  test("two Executions from one definition are separately identified and rooted", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "twin", program: [{ do: "complete" }] }));

    const a = await harness.createExecution({ definition: ref });
    const b = await harness.createExecution({ definition: ref });

    assert.notEqual(a.executionId, b.executionId);
    assert.equal(a.rootExecutionId, a.executionId);
    assert.equal(b.rootExecutionId, b.executionId);
    assert.deepEqual(a.definition, b.definition, "they share a pinned definition without sharing runtime identity");
  });
});
