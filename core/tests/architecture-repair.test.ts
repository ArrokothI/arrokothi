import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AgentHarness,
  KnowledgeIndex,
  type ToolDefinition,
  type WebSearchProvider,
  ReferenceLoopEngine,
  buildCapabilityCatalog,
  defineAgent,
  knowledgeCapabilityName,
} from "../src/index.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { RecordingExecutor } from "../src/testing/fake-executors.ts";
import { buildRuntime } from "./helpers.ts";

describe("generic architecture repair", () => {
  it("returns retrieved document evidence to the same agent loop", async () => {
    const capability = knowledgeCapabilityName("document_search", "operations_manual");
    const model = new ScriptedModelProvider([
      { purpose: "agent_loop", toolCalls: [{ name: capability, args: { query: "calibration interval" } }] },
      { purpose: "agent_loop", text: "The interval is thirty days." },
    ]);
    const definition = defineAgent({
      id: "evidence-observation",
      name: "Evidence Observation",
      goal: "Answer from explicitly retrieved operational evidence.",
      model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [{
        source: {
          id: "operations_manual",
          kind: "document",
          title: "Operations manual",
          text: "Calibration must be performed every thirty days.",
        },
      }],
      tools: [],
      planning: { mode: "deterministic", extractWorkingNotes: false },
      policies: { maxAgentIterations: 3, maxKnowledgeCallsPerTurn: 3 },
    });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
    });
    const sessionId = await built.runtime.createSession("evidence-observation");

    await built.runtime.runTurn({ sessionId, message: "What is the calibration interval?" });

    const secondLoopRequest = model.requests.filter((request) => request.purpose === "agent_loop")[1];
    assert.ok(secondLoopRequest);
    const toolObservation = secondLoopRequest.messages.find((message) => message.role === "tool");
    assert.ok(toolObservation);
    const observation = JSON.parse(toolObservation.content) as Record<string, unknown>;
    assert.equal(observation["kind"], "document_search");
    assert.equal(observation["sourceId"], "operations_manual");
    assert.equal(observation["sourceTitle"], "Operations manual");
    assert.equal(observation["query"], "calibration interval");
    assert.match(JSON.stringify(observation["chunks"]), /every thirty days/);
  });

  it("returns the normalized zero-result record query without runtime strategy advice", async () => {
    const capability = knowledgeCapabilityName("record_query", "inventory");
    const model = new ScriptedModelProvider([
      {
        purpose: "agent_loop",
        toolCalls: [{ name: capability, args: { filters: [{ field: "warehouse_code", op: "eq", value: "W-9" }] } }],
      },
      { purpose: "agent_loop", text: "No row matched that exact query." },
    ]);
    const definition = defineAgent({
      id: "zero-result-observation",
      name: "Zero Result Observation",
      goal: "Inspect deterministic inventory queries.",
      model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [{
        source: {
          id: "inventory",
          kind: "record_set",
          title: "Inventory",
          fields: {
            warehouse_code: {
              schema: { kind: "string" },
              description: "Stable code assigned to the storage facility.",
            },
            scientific_category: { kind: "string" },
          },
          records: [{ warehouse_code: "W-1", scientific_category: "mineral" }],
        },
      }],
      tools: [],
      planning: { mode: "deterministic", extractWorkingNotes: false },
      policies: { maxAgentIterations: 3, maxKnowledgeCallsPerTurn: 3 },
    });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
    });
    const sessionId = await built.runtime.createSession("zero-result-observation");

    await built.runtime.runTurn({ sessionId, message: "Check facility W-9." });

    const secondLoopRequest = model.requests.filter((request) => request.purpose === "agent_loop")[1]!;
    const toolObservation = secondLoopRequest.messages.find((message) => message.role === "tool")!;
    const observation = JSON.parse(toolObservation.content) as Record<string, unknown>;
    assert.deepEqual(observation, {
      kind: "record_query",
      sourceId: "inventory",
      sourceTitle: "Inventory",
      query: { filters: [{ field: "warehouse_code", op: "eq", value: "W-9" }], sort: [], limit: 20 },
      matches: [],
      totalMatched: 0,
      totalRecords: 1,
    });
    assert.doesNotMatch(toolObservation.content, /paraphras|broaden|relax|another field|ask the user/i);
  });

  it("returns web titles, URLs, snippets, and publication metadata to the same loop", async () => {
    const capability = knowledgeCapabilityName("web_search", "publications");
    const model = new ScriptedModelProvider([
      { purpose: "agent_loop", toolCalls: [{ name: capability, args: { query: "instrument update" } }] },
      { purpose: "agent_loop", text: "The update was published." },
    ]);
    const definition = defineAgent({
      id: "web-evidence-observation",
      name: "Web Evidence Observation",
      goal: "Answer from explicitly retrieved publication evidence.",
      model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [{ source: { id: "publications", kind: "web_search", title: "Publications", allowedDomains: ["example.test"], maxResults: 2 } }],
      tools: [],
      planning: { mode: "deterministic", extractWorkingNotes: false },
      policies: { maxAgentIterations: 3, maxKnowledgeCallsPerTurn: 3 },
    });
    const webSearch: WebSearchProvider = {
      async search(request) {
        return {
          query: request.query,
          results: [{
            title: "Instrument update",
            url: "https://example.test/instrument-update",
            snippet: "The revised instrument procedure is now available.",
            publishedAt: "2026-07-01T00:00:00.000Z",
          }],
        };
      },
    };
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
      webSearch,
    });
    const sessionId = await built.runtime.createSession("web-evidence-observation");
    const turn = await built.runtime.runTurn({ sessionId, message: "Find the instrument update." });

    const secondLoopRequest = model.requests.filter((request) => request.purpose === "agent_loop")[1]!;
    const observation = JSON.parse(secondLoopRequest.messages.find((message) => message.role === "tool")!.content);
    assert.deepEqual(observation, {
      kind: "web_search",
      sourceId: "publications",
      sourceTitle: "Publications",
      query: "instrument update",
      allowedDomains: ["example.test"],
      results: [{
        title: "Instrument update",
        url: "https://example.test/instrument-update",
        snippet: "The revised instrument procedure is now available.",
        publishedAt: "2026-07-01T00:00:00.000Z",
      }],
    });
    const durable = turn.events.find((event) => event.type === "KnowledgeRetrieved");
    assert.deepEqual(durable?.type === "KnowledgeRetrieved" ? durable.payload.result : undefined, observation);
  });

  it("projects authored record field semantics into catalog, capability, and planner context", async () => {
    const definition = defineAgent({
      id: "field-semantics",
      name: "Field Semantics",
      goal: "Query supplier records.",
      model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [{
        source: {
          id: "suppliers",
          kind: "record_set",
          title: "Suppliers",
          fields: {
            supplier_region: {
              schema: { kind: "string" },
              description: "Contractual service region assigned by the supplier registry.",
            },
            active: { kind: "boolean" },
          },
          records: [{ supplier_region: "north-sector", active: true }],
        },
      }],
      tools: [],
      planning: { mode: "llm", extractWorkingNotes: false },
      policies: {},
    });
    const knowledge = new KnowledgeIndex(definition.knowledge);
    const catalog = knowledge.catalog();
    assert.deepEqual(catalog[0]?.type === "record_set" ? catalog[0].fields : undefined, [
      {
        name: "supplier_region",
        type: "string",
        description: "Contractual service region assigned by the supplier registry.",
      },
      { name: "active", type: "boolean" },
    ]);
    const capabilities = buildCapabilityCatalog({
      definition,
      tools: buildRuntime(new ScriptedModelProvider([]), { definition }).tools,
      knowledge,
      phaseId: null,
    });
    const recordCapability = capabilities.capabilities.find((candidate) => candidate.implementation.kind === "knowledge")!;
    assert.match(recordCapability.modelSpec.description, /Contractual service region assigned by the supplier registry/);
    assert.match(JSON.stringify(recordCapability.modelSpec.input), /supplier_region/);

    const model = new ScriptedModelProvider([
      { purpose: "plan", json: { memory_writes: {}, working_notes: [], signals: [], retrieval_requests: [] } },
      { purpose: "respond", text: "Done." },
    ]);
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ strategy: "workflow" }),
    });
    const sessionId = await built.runtime.createSession("field-semantics");
    await built.runtime.runTurn({ sessionId, message: "Inspect the supplier registry." });
    assert.match(model.requests.find((request) => request.purpose === "plan")!.system, /supplier_region \(string\) - Contractual service region/);
  });

  it("does not implicitly dispatch a confirmed external action twice after definite failure", async () => {
    const action: ToolDefinition = {
      name: "publish_manifest",
      label: "publish this manifest",
      description: "Publish an externally visible manifest.",
      effect: "external_side_effect",
      confirmation: "required",
      idempotency: "per_input",
      argumentPolicies: { manifest_id: { kind: "model_composed" } },
      input: { kind: "object", fields: { manifest_id: { required: true, schema: { kind: "string" } } } },
      output: { kind: "object", additionalProperties: true, fields: {} },
    };
    const model = new ScriptedModelProvider([
      { purpose: "agent_loop", toolCalls: [{ name: action.name, args: { manifest_id: "M-17" } }] },
      { purpose: "agent_loop", toolCalls: [{ name: action.name, args: { manifest_id: "M-17" } }] },
      { purpose: "agent_loop", text: "The publication failed." },
    ]);
    const executor = new RecordingExecutor(() => ({
      ok: false,
      error: { code: "rejected_by_remote", message: "The remote service rejected the manifest." },
      retryable: true,
    }));
    const definition = defineAgent({
      id: "external-failure-safety",
      name: "External Failure Safety",
      goal: "Publish authorized manifests safely.",
      model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [],
      tools: [{ definition: action }],
      planning: { mode: "deterministic", extractWorkingNotes: false },
      policies: { maxAgentIterations: 4, maxActionRequestsPerTurn: 4, maxToolCallsPerTurn: 4 },
    });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
      registerTools: (tools) => tools.register(action.name, executor),
    });
    const sessionId = await built.runtime.createSession("external-failure-safety");
    const pending = await built.runtime.runTurn({ sessionId, message: "Publish manifest M-17." });
    assert.equal(pending.stopReason, "awaiting_confirmation");

    await built.runtime.runTurn({ sessionId, message: "Yes, publish that exact manifest." });

    assert.equal(executor.callCount, 1);
    const started = (await built.sessions.readEvents(sessionId)).find((event) => event.type === "ToolExecutionStarted");
    assert.equal(started?.type === "ToolExecutionStarted" ? started.payload.idempotencyKey : undefined, executor.calls[0]?.context.idempotencyKey);
  });

  it("records an ambiguous external outcome and never retries it automatically", async () => {
    const action: ToolDefinition = {
      name: "commit_batch",
      label: "commit this batch",
      description: "Commit a batch to an external system.",
      effect: "external_side_effect",
      confirmation: "required",
      idempotency: "per_input",
      argumentPolicies: { batch_id: { kind: "model_composed" } },
      input: { kind: "object", fields: { batch_id: { required: true, schema: { kind: "string" } } } },
      output: { kind: "object", additionalProperties: true, fields: {} },
    };
    const model = new ScriptedModelProvider([
      { purpose: "agent_loop", toolCalls: [{ name: action.name, args: { batch_id: "B-4" } }] },
      { purpose: "agent_loop", toolCalls: [{ name: action.name, args: { batch_id: "B-4" } }] },
      { purpose: "agent_loop", text: "The commit outcome is unknown." },
      { purpose: "agent_loop", toolCalls: [{ name: action.name, args: { batch_id: "B-4" } }] },
      { purpose: "agent_loop", text: "The runtime refused an automatic retry." },
    ]);
    const executor = new RecordingExecutor(() => ({
      ok: false,
      outcome: "outcome_unknown",
      error: { code: "response_lost", message: "No response arrived after dispatch." },
    }));
    const definition = defineAgent({
      id: "external-unknown-safety",
      name: "External Unknown Safety",
      goal: "Commit authorized batches safely.",
      model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [],
      tools: [{ definition: action }],
      planning: { mode: "deterministic", extractWorkingNotes: false },
      policies: { maxAgentIterations: 4, maxActionRequestsPerTurn: 4, maxToolCallsPerTurn: 4 },
    });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
      registerTools: (tools) => tools.register(action.name, executor),
    });
    const sessionId = await built.runtime.createSession("external-unknown-safety");
    await built.runtime.runTurn({ sessionId, message: "Commit batch B-4." });
    const uncertain = await built.runtime.runTurn({ sessionId, message: "Yes, commit that exact batch." });
    assert.equal(executor.callCount, 1);
    assert.ok(uncertain.events.some((event) => event.type === "ToolExecutionOutcomeUnknown"));
    assert.equal(uncertain.state.allToolResults.at(-1)?.outcome, "outcome_unknown");

    const later = await built.runtime.runTurn({ sessionId, message: "Try committing B-4 again." });
    assert.equal(executor.callCount, 1);
    assert.ok(later.events.some((event) => event.type === "ToolCallRejected" && event.payload.reason === "external_outcome_unknown"));
  });

  it("allows a definite external failure only through a fresh later confirmation", async () => {
    const action: ToolDefinition = {
      name: "submit_release",
      label: "submit this release",
      description: "Submit a release to an external registry.",
      effect: "external_side_effect",
      confirmation: "required",
      idempotency: "per_input",
      argumentPolicies: { release_id: { kind: "model_composed" } },
      input: { kind: "object", fields: { release_id: { required: true, schema: { kind: "string" } } } },
      output: { kind: "object", additionalProperties: true, fields: {} },
    };
    const model = new ScriptedModelProvider([
      { purpose: "agent_loop", toolCalls: [{ name: action.name, args: { release_id: "R-8" } }] },
      { purpose: "agent_loop", text: "The registry rejected the release." },
      { purpose: "agent_loop", toolCalls: [{ name: action.name, args: { release_id: "R-8" } }] },
      { purpose: "agent_loop", text: "The release was submitted." },
    ]);
    const executor = new RecordingExecutor((_args, call) => call === 1
      ? { ok: false, outcome: "definite_failure", error: { code: "validation_rejected", message: "Rejected before commit." } }
      : { ok: true, output: { accepted: true } });
    const definition = defineAgent({
      id: "external-explicit-retry",
      name: "External Explicit Retry",
      goal: "Submit authorized releases safely.",
      model: { providerId: "scripted", model: "scripted-model", temperature: 0 },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [],
      tools: [{ definition: action }],
      planning: { mode: "deterministic", extractWorkingNotes: false },
      policies: { maxAgentIterations: 3, maxActionRequestsPerTurn: 3, maxToolCallsPerTurn: 3 },
    });
    const built = buildRuntime(model, {
      definition,
      harness: new AgentHarness({ engine: new ReferenceLoopEngine() }),
      registerTools: (tools) => tools.register(action.name, executor),
    });
    const sessionId = await built.runtime.createSession("external-explicit-retry");
    await built.runtime.runTurn({ sessionId, message: "Submit release R-8." });
    await built.runtime.runTurn({ sessionId, message: "Yes, submit R-8." });
    assert.equal(executor.callCount, 1);

    const retryPending = await built.runtime.runTurn({ sessionId, message: "Retry release R-8." });
    assert.equal(retryPending.stopReason, "awaiting_confirmation");
    assert.equal(executor.callCount, 1);
    await built.runtime.runTurn({ sessionId, message: "Yes, retry that exact release." });
    assert.equal(executor.callCount, 2);
    assert.equal(executor.calls[0]?.context.idempotencyKey, executor.calls[1]?.context.idempotencyKey);
  });
});
