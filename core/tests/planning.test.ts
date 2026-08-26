import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { AgentHarness } from "../src/harness/agent-harness.ts";
import { compileContext } from "../src/compiler/context-compiler.ts";
import { initialState } from "../src/session/state.ts";
import { buildRuntime, plan, reply, testDefinition } from "./helpers.ts";

const POLICY_TEXT = [
  "Sunset Residence allows cats but not dogs.",
  "Harbor View permits one dog under 20 kilograms with written registration.",
  "Central Tower does not permit pets.",
].join("\n\n");

function planningDefinition(overrides = {}) {
  return testDefinition({
    knowledge: [
      {
        source: {
          id: "property_documents",
          kind: "document",
          title: "Property documents",
          description: "Building rules, pet policies, amenities, and property-specific reference material.",
          text: POLICY_TEXT,
          chunking: { chunkSize: 80, chunkOverlap: 20 },
        },
      },
      testDefinition().knowledge[0]!,
    ],
    ...overrides,
  });
}

describe("semantic preflight", () => {
  test("records a structured preflight plan and permits zero retrieval operations", async () => {
    const model = new ScriptedModelProvider([plan({ memory_writes: { intent: "buy" } }), reply("Hello.")]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-zero");
    const result = await runtime.runTurn({ sessionId, message: "I want to buy, but I'm just saying hello." });

    const event = result.events.find((candidate) => candidate.type === "TurnPlanCreated");
    assert.ok(event?.type === "TurnPlanCreated");
    assert.equal(event.payload.resolvedBy, "llm");
    assert.equal(event.payload.plan.memoryProposals[0]?.key, "intent");
    assert.deepEqual(event.payload.plan.retrievalRequests, []);
    assert.equal(result.events.some((candidate) => candidate.type === "KnowledgeRetrieved"), false);
  });

  test("planner rewrites a reference into a standalone query and selects the logical document source", async () => {
    const rewritten = "Harbor View pet policy dogs restrictions";
    const model = new ScriptedModelProvider([
      plan(), reply("1. Sunset Residence\n2. Harbor View\n3. Central Tower"),
      plan({ retrieval_requests: [{ kind: "document_search", source_id: "property_documents", query: rewritten, top_k: 2 }] }),
      reply("Harbor View permits one registered dog under 20kg."),
    ]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-rewrite");
    await runtime.runTurn({ sessionId, message: "Show me the buildings." });
    const result = await runtime.runTurn({ sessionId, message: "What about the second one? Can I have a dog?" });

    const planned = result.events.find((event) => event.type === "TurnPlanCreated");
    assert.ok(planned?.type === "TurnPlanCreated");
    assert.deepEqual(planned.payload.plan.retrievalRequests[0], {
      kind: "document_search",
      sourceId: "property_documents",
      query: rewritten,
      topK: 2,
    });
    const retrieved = result.events.find((event) => event.type === "KnowledgeRetrieved");
    assert.ok(retrieved?.type === "KnowledgeRetrieved");
    assert.equal(retrieved.payload.sourceId, "property_documents");
    assert.ok(retrieved.payload.resultIds.length > 0);
    assert.match(result.contexts.at(-1)!.context.system, /Harbor View permits one dog/);
  });

  test("one plan can retrieve documents and exact records from separate engines", async () => {
    const model = new ScriptedModelProvider([
      plan({
        retrieval_requests: [
          { kind: "document_search", source_id: "property_documents", query: "Harbor View dog pet policy" },
          { kind: "record_query", source_id: "listings", filters: [{ field: "price", op: "lte", value: 10_000_000 }], sort: [{ field: "price", direction: "asc" }] },
        ],
      }),
      reply("I found the policy and one matching listing."),
    ]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-multi");
    const result = await runtime.runTurn({ sessionId, message: "Can I have a dog there, and what is under $10M?" });

    const retrievals = result.events.filter((event) => event.type === "KnowledgeRetrieved");
    assert.equal(retrievals.length, 2);
    assert.deepEqual(retrievals.map((event) => event.payload.sourceId), ["property_documents", "listings"]);
    const system = result.contexts.at(-1)!.context.system;
    assert.match(system, /DETERMINISTIC RECORD QUERY matched 1 of 6/);
    assert.match(system, /price: 7250000/);
  });

  test("unknown source IDs and invalid record fields are rejected rather than treated as empty", async () => {
    const model = new ScriptedModelProvider([
      plan({
        retrieval_requests: [
          { kind: "document_search", source_id: "secret_database", query: "everything" },
          { kind: "record_query", source_id: "listings", filters: [{ field: "imaginary", op: "eq", value: true }] },
        ],
      }),
      reply("I could not use those retrieval requests."),
    ]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-invalid-source");
    const result = await runtime.runTurn({ sessionId, message: "Search it." });

    const rejected = result.events.filter((event) => event.type === "RetrievalRequestRejected");
    assert.equal(rejected.length, 2);
    assert.equal(rejected[0]?.payload.error.code, "unknown_source");
    assert.equal(rejected[1]?.payload.error.code, "invalid_record_query");
    assert.equal(result.events.some((event) => event.type === "KnowledgeRetrieved"), false);
  });

  test("planner context contains catalog metadata but no source text or non-model secrets", async () => {
    const model = new ScriptedModelProvider([plan(), reply("Ok.")]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-context");
    await runtime.runTurn({
      sessionId,
      message: "What can you help with?",
      hostContext: { crm_api_key: "SECRET-TOOLS-ONLY", internal_risk_tier: "SECRET-RUNTIME-ONLY", locale: "en-US" },
    });

    const request = model.requests.find((candidate) => candidate.purpose === "plan")!;
    assert.match(request.system, /property_documents: Property documents/);
    assert.match(request.system, /fields: id \(string\).*price \(number\)/s);
    assert.equal(request.system.includes("Sunset Residence allows cats"), false);
    assert.equal(request.system.includes("SECRET-TOOLS-ONLY"), false);
    assert.equal(request.system.includes("SECRET-RUNTIME-ONLY"), false);
  });

  test("a separately injected cheaper planner model is honored and traced", async () => {
    const definition = planningDefinition({ planning: { mode: "llm", model: { providerId: "cheap", model: "cheap-plan-v1" } } });
    const planner = new ScriptedModelProvider([plan()], { id: "cheap", model: "cheap-plan-v1" });
    const response = new ScriptedModelProvider([reply("Done.")], { id: "strong", model: "strong-response-v2" });
    const { runtime } = buildRuntime(response, { definition, planningModel: planner });
    const sessionId = await runtime.createSession("plan-model");
    const result = await runtime.runTurn({ sessionId, message: "Hello" });

    assert.equal(planner.requests[0]?.model, "cheap-plan-v1");
    assert.equal(response.requests[0]?.model, definition.model.model);
    const calls = result.events.filter((event) => event.type === "ModelCallCompleted");
    assert.deepEqual(calls.map((event) => event.payload.purpose), ["plan", "respond"]);
    assert.equal(calls[0]?.payload.providerId, "cheap");
    assert.equal(calls[0]?.payload.model, "cheap-plan-v1");
  });

  test("malformed planner output fails safely with no memory or retrieval side effects", async () => {
    const model = new ScriptedModelProvider([
      { purpose: "plan", json: { memory_writes: { budget: 10_000_000 }, retrieval_requests: "not-an-array" } },
      reply("I can still answer conversationally."),
    ]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-malformed");
    const result = await runtime.runTurn({ sessionId, message: "Under $10M" });

    assert.equal(result.state.memory["budget"], undefined);
    assert.equal(result.events.some((event) => event.type === "KnowledgeRetrieved"), false);
    assert.ok(result.events.some((event) => event.type === "RuntimeError" && event.payload.code === "invalid_turn_plan"));
    const planned = result.events.find((event) => event.type === "TurnPlanCreated");
    assert.equal(planned?.type === "TurnPlanCreated" && planned.payload.resolvedBy, "safe_empty");
  });

  test("a retrieval request cannot mix document and record-query fields", async () => {
    const model = new ScriptedModelProvider([
      plan({
        retrieval_requests: [{
          kind: "document_search",
          source_id: "property_documents",
          query: "Harbor View pet policy",
          filters: [{ field: "price", op: "lte", value: 10_000_000 }],
        }],
      }),
      reply("I continued without using the malformed request."),
    ]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-mixed-request");
    const result = await runtime.runTurn({ sessionId, message: "Look that up." });

    assert.equal(result.events.some((event) => event.type === "KnowledgeRetrieved"), false);
    assert.ok(result.events.some((event) =>
      event.type === "RuntimeError"
      && event.payload.code === "invalid_turn_plan"
      && event.payload.message.includes("mixes record-query fields"),
    ));
  });

  test("arbitrary SQL is not a valid record-query field", async () => {
    const model = new ScriptedModelProvider([
      plan({ retrieval_requests: [{ kind: "record_query", source_id: "listings", sql: "DROP TABLE listings" }] }),
      reply("I continued without executing arbitrary SQL."),
    ]);
    const { runtime } = buildRuntime(model, { definition: planningDefinition() });
    const sessionId = await runtime.createSession("plan-no-sql");
    const result = await runtime.runTurn({ sessionId, message: "Run this SQL." });

    assert.equal(result.events.some((event) => event.type === "KnowledgeRetrieved"), false);
    assert.ok(result.events.some((event) =>
      event.type === "RuntimeError"
      && event.payload.code === "invalid_turn_plan"
      && event.payload.message.includes('unknown field "sql"'),
    ));
  });

  test("deterministic mode may return unknown safely; hybrid falls back to one planner call", async () => {
    const deterministicDefinition = planningDefinition({ planning: { mode: "deterministic" } });
    const deterministicModel = new ScriptedModelProvider([reply("No retrieval was attempted.")]);
    const deterministicRuntime = buildRuntime(deterministicModel, { definition: deterministicDefinition }).runtime;
    const deterministicSession = await deterministicRuntime.createSession("plan-deterministic");
    const deterministic = await deterministicRuntime.runTurn({ sessionId: deterministicSession, message: "Find houses" });
    assert.equal(deterministicModel.requests.filter((request) => request.purpose === "plan").length, 0);
    const deterministicPlan = deterministic.events.find((event) => event.type === "TurnPlanCreated");
    assert.equal(deterministicPlan?.type === "TurnPlanCreated" && deterministicPlan.payload.resolvedBy, "safe_empty");

    const hybridDefinition = planningDefinition({ planning: { mode: "hybrid" } });
    const hybridModel = new ScriptedModelProvider([plan(), reply("Hybrid fallback complete.")]);
    const hybridRuntime = buildRuntime(hybridModel, {
      definition: hybridDefinition,
      harness: new AgentHarness({
        strategy: "workflow",
        preflight: { deterministicPlanner: { plan: () => ({ kind: "unknown", reason: "not machine-checkable" }) } },
      }),
    }).runtime;
    const hybridSession = await hybridRuntime.createSession("plan-hybrid");
    const hybrid = await hybridRuntime.runTurn({ sessionId: hybridSession, message: "Find houses" });
    assert.equal(hybridModel.requests.filter((request) => request.purpose === "plan").length, 1);
    const hybridPlan = hybrid.events.find((event) => event.type === "TurnPlanCreated");
    assert.equal(hybridPlan?.type === "TurnPlanCreated" && hybridPlan.payload.resolvedBy, "llm");
  });

  test("ContextCompiler cannot perform hidden retrieval", () => {
    const definition = planningDefinition();
    const state = initialState({ sessionId: "pure", agentId: definition.id, agentVersion: definition.version, createdAt: "2026-01-01T00:00:00.000Z" });
    state.transcript.push({ role: "user", text: "Harbor View dog policy", turn: 1, at: state.createdAt });
    const compiled = compileContext({ definition, state, now: new Date(state.createdAt) });
    assert.equal(compiled.sections.some((section) => section.id === "knowledge"), false);
    assert.deepEqual(compiled.knowledgeUsed, []);
  });

  test("a truncated evidence chunk remains visible in the compiler audit", () => {
    const definition = planningDefinition();
    definition.policies.maxKnowledgeChars = 80;
    const state = initialState({ sessionId: "budget", agentId: definition.id, agentVersion: definition.version, createdAt: "2026-01-01T00:00:00.000Z" });
    const compiled = compileContext({
      definition,
      state,
      now: new Date(state.createdAt),
      retrievedKnowledge: [{
        kind: "document_search",
        sourceId: "property_documents",
        sourceTitle: "Property documents",
        query: "pet policy",
        chunks: [{
          sourceId: "property_documents",
          sourceTitle: "Property documents",
          chunkId: "property_documents#0",
          text: "Harbor View pet policy ".repeat(20),
          score: 1.5,
          rank: 1,
        }],
      }],
    });

    assert.match(compiled.system, /\[truncated\]/);
    assert.equal(compiled.knowledgeUsed[0]?.chunkId, "property_documents#0");
  });
});
