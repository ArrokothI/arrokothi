/**
 * Public records are data.
 *
 * Definitions and Execution records get persisted, replayed, shipped between workers, and read by
 * humans. A provider client, a store handle, a closure, or a class instance hiding in one of them
 * would make the whole runtime non-portable, so the check is structural rather than by convention.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateDefinition } from "@agent-sdk/core/execution";
import { createTestHarness, scriptedAgentDefinition, scriptedWorkflowDefinition } from "@agent-sdk/core/testing";

function nonDataPaths(value: unknown, path: string, found: string[], seen = new Set<object>()): void {
  if (value === null) return;
  const type = typeof value;
  if (type === "function" || type === "symbol" || type === "bigint" || type === "undefined") {
    found.push(`${path}: ${type}`);
    return;
  }
  if (type !== "object") return;
  const object = value as object;
  if (seen.has(object)) return;
  seen.add(object);
  if (!Array.isArray(object) && Object.getPrototypeOf(object) !== Object.prototype && Object.getPrototypeOf(object) !== null) {
    found.push(`${path}: ${object.constructor?.name ?? "instance"}`);
    return;
  }
  for (const [key, child] of Object.entries(object as Record<string, unknown>)) {
    nonDataPaths(child, `${path}.${key}`, found, seen);
  }
}

describe("serialization", () => {
  test("definitions survive a JSON round trip unchanged", async () => {
    const definition = scriptedAgentDefinition({
      id: "portable",
      name: "Portable agent",
      terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
      program: [{ do: "emit", text: "hi" }, { do: "complete", result: "done" }],
    });

    assert.deepEqual(JSON.parse(JSON.stringify(definition)), definition);

    const issues: string[] = [];
    nonDataPaths(definition, "definition", issues);
    assert.deepEqual(issues, [], "a definition carries no clients, functions, or class instances");
  });

  test("a definition carrying an implementation object is rejected", () => {
    class FakeProviderClient {
      readonly apiKey = "sk-secret";
    }

    for (const [label, spec] of [
      ["a closure", { run: () => "nope" }],
      ["a client instance", { client: new FakeProviderClient() }],
      ["a Date", { since: new Date() }],
      ["a Map", { cache: new Map() }],
    ] as const) {
      const result = validateDefinition({ id: "leaky", version: 1, kind: "agent", spec });
      assert.equal(result.ok, false, `${label} must not validate`);
    }
  });

  test("Execution records, emissions, and audit records are all plain data", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedWorkflowDefinition({
        id: "observable",
        terminalResult: { schemaId: "outcome", schemaVersion: 1, schema: { kind: "string" } },
        program: [{ do: "emit", text: "step one" }, { do: "complete", result: "finished" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    const records = await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    const emissions = await harness.emissionsOf(handle.executionId);
    const transitions = await harness.transitionsOf(handle.executionId);

    for (const [label, value] of [
      ["ExecutionContext", context],
      ["emissions", emissions],
      ["transitions", transitions],
      ["activation records", records],
      ["definition ref", context?.definition],
      ["terminal result", context?.terminalResult],
    ] as const) {
      const issues: string[] = [];
      nonDataPaths(value, label, issues);
      assert.deepEqual(issues, [], `${label} must be serializable data`);
      assert.deepEqual(JSON.parse(JSON.stringify(value)), value, `${label} survives a JSON round trip`);
    }
  });

  test("deferred slots are inert references, not embedded subsystems", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(scriptedAgentDefinition({ id: "slots", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });

    const context = await harness.inspect(handle.executionId);
    assert.deepEqual(context?.slots, {
      authority: null,
      memoryView: null,
      workingNotes: null,
      policy: null,
      resources: [],
      pending: [],
    });
  });
});
