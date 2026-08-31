/**
 * Typed terminal completion.
 *
 * A controller proposes; the Harness establishes. The result is validated against the schema
 * declared by the definition the Execution *pinned*, and an invalid proposal cannot produce a
 * COMPLETED record by any route - it fails the Activation instead.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { TerminalResultSchema } from "@agent-sdk/core/execution";
import { createTestHarness, scriptedAgentDefinition, scriptedWorkflowDefinition } from "@agent-sdk/core/testing";

const REPORT_SCHEMA: TerminalResultSchema = {
  schemaId: "research.report",
  schemaVersion: 2,
  schema: {
    kind: "object",
    fields: {
      headline: { required: true, schema: { kind: "string", minLength: 1 } },
      sources: { required: true, schema: { kind: "string_array" } },
      confidence: { required: false, schema: { kind: "number", min: 0, max: 1 } },
    },
  },
};

describe("typed terminal results", () => {
  test("a valid result commits atomically with COMPLETED", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "reporter",
        terminalResult: REPORT_SCHEMA,
        program: [
          { do: "emit", text: "working" },
          { do: "complete", result: { headline: "Revenue up 12%", sources: ["a", "b"], confidence: 0.8 } },
        ],
      }),
    );

    const handle = await harness.createExecution({ definition: ref });
    const records = await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.deepEqual(context?.terminalResult?.schema, { schemaId: "research.report", schemaVersion: 2 });
    assert.deepEqual(context?.terminalResult?.value, { headline: "Revenue up 12%", sources: ["a", "b"], confidence: 0.8 });
    assert.ok(context?.terminalResult?.valueDigest, "the committed value carries a digest");
    assert.equal(
      context?.terminalResult?.completedByActivationId,
      records.at(-1)?.activationId,
      "completion is attributed to the Activation that produced it",
    );
    assert.equal(context?.failure, null);
  });

  test("an invalid result does not produce a COMPLETED Execution", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "bad-reporter",
        terminalResult: REPORT_SCHEMA,
        program: [{ do: "complete", result: { headline: "", sources: "not-a-list" } }],
      }),
    );

    const handle = await harness.createExecution({ definition: ref });
    const records = await harness.runUntilIdle();
    assert.equal(records.at(-1)?.result, "failed");

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.terminalResult, null, "a rejected proposal leaves no terminal result behind");
    assert.equal(context?.failure?.code, "invalid_terminal_result:schema_violation");

    const transitions = await harness.transitionsOf(handle.executionId);
    assert.equal(
      transitions.filter((t) => t.to === "COMPLETED").length,
      0,
      "no COMPLETED transition was ever recorded",
    );
  });

  test("a declared schema makes a result mandatory", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "forgetful", terminalResult: REPORT_SCHEMA, program: [{ do: "complete" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_terminal_result:missing_result");
  });

  test("an undeclared result cannot be smuggled into completion", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "oversharer", program: [{ do: "complete", result: { anything: true } }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_terminal_result:unexpected_result");
  });

  test("a definition with no declared result completes without one", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(scriptedWorkflowDefinition({ id: "silent", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(context?.terminalResult?.schema, null, "completing without a declared result is a real outcome");
    assert.equal(context?.terminalResult?.value, null);
  });

  test("Execution result typing is independent of any text-or-none Stage rule", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedWorkflowDefinition({
        id: "structured-workflow",
        terminalResult: {
          schemaId: "pipeline.outcome",
          schemaVersion: 1,
          schema: {
            kind: "object",
            fields: {
              rows: { required: true, schema: { kind: "number", integer: true } },
              status: { required: true, schema: { kind: "enum", choices: ["ok", "partial"] } },
            },
          },
        },
        program: [{ do: "complete", result: { rows: 42, status: "ok" } }],
      }),
    );

    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.deepEqual(context?.terminalResult?.value, { rows: 42, status: "ok" });
  });

  test("a controller-reported failure is a terminal state, not a rejected proposal", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "gives-up",
        program: [{ do: "fail", code: "no_viable_strategy", message: "every approach was exhausted" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "no_viable_strategy");
    assert.equal(context?.terminalResult, null);
  });
});
