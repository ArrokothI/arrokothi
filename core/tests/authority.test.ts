import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { ToolDefinition } from "../src/tools/types.ts";
import type { StructuredMemoryField } from "../src/memory/types.ts";
import { authorityFor, validateProposal } from "../src/memory/structured.ts";
import { compileContext } from "../src/compiler/context-compiler.ts";
import { findPhase } from "../src/flow/evaluate.ts";
import { initialState } from "../src/session/state.ts";
import { validateDefinition } from "../src/definition/definition.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { RecordingExecutor, emailDryRun } from "../src/testing/fake-executors.ts";
import { buildRuntime, callTool, plan, reply, testDefinition } from "./helpers.ts";

describe("effective rule precedence", () => {
  const definition = testDefinition({
    globalRules: [
      { id: "truthful-actions", text: "Never claim a failed action succeeded.", kind: "invariant" },
      { id: "concise", text: "Keep responses concise.", kind: "default" },
    ],
    flow: {
      initialPhaseId: "explain",
      phases: [{ id: "explain", objective: "Explain the issue in detail.", overrideRuleIds: ["concise"], terminal: true }],
    },
  });

  test("a phase may explicitly override a global default and compiler emits one effective set", () => {
    assert.deepEqual(validateDefinition(definition).filter((issue) => issue.severity === "error"), []);
    const state = initialState({
      sessionId: "rules",
      agentId: definition.id,
      agentVersion: definition.version,
      initialPhaseId: "explain",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const compiled = compileContext({ definition, state, now: new Date(state.createdAt) });
    assert.deepEqual(compiled.effectiveRules.map((rule) => rule.id), ["truthful-actions"]);
    assert.equal(compiled.system.includes("Keep responses concise"), false);
    assert.equal(compiled.sections.filter((section) => section.id === "effective_rules").length, 1);
    assert.equal(findPhase(definition.flow!, state.phaseId)?.objective, "Explain the issue in detail.");
  });

  test("unknown and invariant overrides are definition errors", () => {
    const invalid = testDefinition({
      globalRules: [{ id: "safety", text: "Never fabricate success.", kind: "invariant" }],
      flow: {
        initialPhaseId: "bad",
        phases: [{ id: "bad", objective: "Bad override", overrideRuleIds: ["safety", "missing"], terminal: true }],
      },
    });
    const messages = validateDefinition(invalid).filter((issue) => issue.severity === "error").map((issue) => issue.message);
    assert.ok(messages.some((message) => /cannot override invariant/.test(message)));
    assert.ok(messages.some((message) => /unknown rule/.test(message)));
  });
});

describe("memory provenance", () => {
  test("planner-extracted user facts cite the exact UserMessageReceived event", async () => {
    const model = new ScriptedModelProvider([plan({ memory_writes: { contact_name: "Alex Rivera" } }), reply("Noted.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("provenance-user");
    const result = await runtime.runTurn({ sessionId, message: "I'm Alex Rivera." });
    const userEvent = result.events.find((event) => event.type === "UserMessageReceived")!;
    const memory = result.state.memory["contact_name"]!;
    assert.equal(memory.writeMechanism, "planner_proposal");
    assert.equal(memory.provenance.kind, "user_claimed");
    assert.deepEqual(memory.provenance.sourceEventIds, [userEvent.id]);
  });

  test("tool-written facts cite the authoritative ToolExecutionSucceeded event", async () => {
    const model = new ScriptedModelProvider([plan(), callTool("lookup_status", { code: "A" }), reply("Verified.")]);
    const lookup = new RecordingExecutor(() => ({
      ok: true,
      output: { verified: true },
      facts: [{ key: "cash_buyer", value: true, writeToMemory: true }],
    }));
    const { runtime } = buildRuntime(model, { registerTools: (registry) => registry.register("lookup_status", lookup) });
    const sessionId = await runtime.createSession("provenance-tool");
    const result = await runtime.runTurn({ sessionId, message: "Check A." });
    const toolEvent = result.events.find((event) => event.type === "ToolExecutionSucceeded")!;
    const memory = result.state.memory["cash_buyer"]!;
    assert.equal(memory.writeMechanism, "runtime_observation");
    assert.equal(memory.provenance.kind, "tool_verified");
    assert.deepEqual(memory.provenance.sourceEventIds, [toolEvent.id]);
  });

  test("accepted host facts cite the HostContextObserved event", async () => {
    const model = new ScriptedModelProvider([plan(), reply("Locale noted.")]);
    const { runtime } = buildRuntime(model);
    const sessionId = await runtime.createSession("provenance-host");
    const result = await runtime.runTurn({ sessionId, message: "Hello.", hostContext: { locale: "en-TW" } });
    const hostEvent = result.events.find((event) => event.type === "HostContextObserved")!;

    assert.equal(result.state.hostContext["locale"]?.sourceEventId, hostEvent.id);
    const field: StructuredMemoryField = { key: "locale", schema: { kind: "string" }, writableBy: ["host_provided"] };
    const validation = validateProposal({ fields: [field] }, { key: "locale", value: "en-TW" }, "host_provided");
    assert.ok(validation.ok);
    assert.equal(authorityFor(validation.field, "host_provided"), "authoritative");
  });

  test("model inference is advisory unless a field explicitly permits authority", () => {
    const field: StructuredMemoryField = { key: "hunch", schema: { kind: "string" }, writableBy: ["model_inferred"] };
    const schema = { fields: [field] };
    const validation = validateProposal(schema, { key: "hunch", value: "maybe" }, "model_inferred");
    assert.ok(validation.ok);
    assert.equal(authorityFor(validation.field, "model_inferred"), "advisory");
    assert.equal(authorityFor({ ...validation.field, allowModelInferredAuthority: true }, "model_inferred"), "authoritative");
  });
});

describe("typed consequential-argument authority", () => {
  test("substring coincidence cannot authorize an identifying string", async () => {
    const email = emailDryRun("success");
    const model = new ScriptedModelProvider([
      plan({ memory_writes: { contact_name: "Annabelle Jones", phone: "555-0100" } }),
      callTool("send_email", { contact_name: "Anna", phone: "555-0100" }),
      reply("I need the exact name before sending."),
    ]);
    const { runtime } = buildRuntime(model, { registerTools: (registry) => registry.register("send_email", email) });
    const sessionId = await runtime.createSession("authority-substring");
    const result = await runtime.runTurn({ sessionId, message: "I'm Annabelle Jones, phone 555-0100." });
    assert.equal(email.callCount, 0);
    const rejection = result.events.find((event) => event.type === "ToolCallRejected");
    assert.equal(rejection?.type === "ToolCallRejected" && rejection.payload.reason, "non_authoritative_argument_source");
  });

  test("numbers, booleans, and arrays use typed structural equality", async () => {
    const typedTool: ToolDefinition = {
      name: "submit_typed",
      description: "Submit already-established typed values.",
      effect: "external_side_effect",
      confirmation: "none",
      idempotency: "per_input",
      argumentPolicies: {
        count: { kind: "authoritative_value", sources: ["memory.count"] },
        enabled: { kind: "authoritative_value", sources: ["memory.enabled"] },
        tags: { kind: "authoritative_value", sources: ["memory.tags"] },
      },
      input: {
        kind: "object",
        fields: {
          count: { required: true, schema: { kind: "number" } },
          enabled: { required: true, schema: { kind: "boolean" } },
          tags: { required: true, schema: { kind: "string_array" } },
        },
      },
      output: { kind: "object", additionalProperties: true, fields: {} },
    };
    const definition = testDefinition({
      memorySchema: {
        fields: [
          { key: "count", schema: { kind: "number" } },
          { key: "enabled", schema: { kind: "boolean" } },
          { key: "tags", schema: { kind: "string_array" } },
        ],
      },
      tools: [{ definition: typedTool }],
    });
    const executor = new RecordingExecutor(() => ({ ok: true, output: { accepted: true } }));
    const model = new ScriptedModelProvider([
      plan({ memory_writes: { count: 7, enabled: true, tags: ["a", "b"] } }),
      callTool("submit_typed", { count: 7, enabled: true, tags: ["b", "a"] }),
      reply("The mismatched array was refused."),
    ]);
    const { runtime } = buildRuntime(model, { definition, registerTools: (registry) => registry.register("submit_typed", executor) });
    const sessionId = await runtime.createSession("authority-typed");
    const result = await runtime.runTurn({ sessionId, message: "Count 7, enabled, tags a then b." });
    assert.equal(executor.callCount, 0);
    assert.ok(result.events.some((event) => event.type === "ToolCallRejected" && event.payload.reason === "non_authoritative_argument_source"));
  });

  test("external side-effect definitions require an explicit policy for every argument", () => {
    const broken = structuredClone(testDefinition());
    delete broken.tools[0]!.definition.argumentPolicies;
    const issues = validateDefinition(broken);
    assert.ok(issues.some((issue) => issue.severity === "error" && /explicit authoritative_value or model_composed/.test(issue.message)));
  });
});
