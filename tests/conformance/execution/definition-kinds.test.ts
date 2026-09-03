/**
 * Definition kinds and pinning.
 *
 * `Definition != Execution` and "Agent and Workflow are the Execution kinds" are the two invariants
 * everything else rests on. If a Stage, a function, or an LLM call could become an Execution, the
 * runtime would owe every one of them identity, a mailbox, authority, and a lifecycle.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateDefinition } from "@arrokothi/core/execution";
import { createTestHarness, scriptedAgentDefinition, scriptedWorkflowDefinition } from "@arrokothi/core/testing";

describe("definition kinds", () => {
  test("an AgentDefinition creates an Agent Execution advanced by the Agent controller", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "researcher", program: [{ do: "complete" }] }));

    const handle = await harness.createExecution({ definition: ref });
    assert.equal(handle.kind, "agent");

    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.kind, "agent");
    assert.equal(context?.control.kind, "agent", "controller progress is tagged with the kind that owns it");
  });

  test("a WorkflowDefinition creates a Workflow Execution advanced by the Workflow controller", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(scriptedWorkflowDefinition({ id: "pipeline", program: [{ do: "complete" }] }));

    const handle = await harness.createExecution({ definition: ref });
    assert.equal(handle.kind, "workflow");

    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.kind, "workflow");
    assert.equal(context?.control.kind, "workflow");
  });

  test("no other computation kind is an Execution definition", () => {
    for (const kind of ["function", "llm", "stage", "adapter", "capability"]) {
      const result = validateDefinition({ id: "x", version: 1, kind, spec: {} });
      assert.equal(result.ok, false, `${kind} must not validate as an ExecutionDefinition`);
      if (!result.ok) {
        assert.ok(
          result.issues.some((issue) => issue.code === "invalid_kind"),
          `${kind} is rejected for being the wrong kind, not incidentally`,
        );
      }
    }
  });

  test("an Execution runs the definition version it pinned, not the latest one", async () => {
    const { harness, definitions } = createTestHarness();
    const v1 = await definitions.save(
      scriptedAgentDefinition({ id: "pinned", version: 1, program: [{ do: "emit", text: "v1 behaviour" }, { do: "complete" }] }),
    );

    const handle = await harness.createExecution({ definition: v1 });

    // A newer version is published while the Execution is mid-flight.
    await definitions.save(
      scriptedAgentDefinition({ id: "pinned", version: 2, program: [{ do: "emit", text: "v2 behaviour" }, { do: "complete" }] }),
    );

    await harness.runUntilIdle();
    const emissions = await harness.emissionsOf(handle.executionId);
    assert.deepEqual(
      emissions.map((e) => (e.body.kind === "text" ? e.body.text : null)),
      ["v1 behaviour"],
      "publishing v2 does not change what an Execution pinned to v1 does",
    );

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.definition.version, 1);
    assert.equal(context?.definition.integrity, v1.integrity, "the pinned ref carries the exact content digest");
  });

  test("a definition ref is immutable content, not a live handle", async () => {
    const { definitions } = createTestHarness();
    const definition = scriptedAgentDefinition({ id: "immutable", program: [{ do: "complete" }] });
    const ref = await definitions.save(definition);

    const loaded = await definitions.get(ref);
    assert.notEqual(loaded, definition, "the store returns its own copy");
    (loaded as { name?: string }).name = "mutated";

    const reloaded = await definitions.get(ref);
    assert.equal((reloaded as { name?: string }).name, undefined, "mutating a loaded copy cannot change stored content");
  });
});
