import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NativeAgentHarness,
  knowledgeCapabilityName,
  type KnowledgeRetriever,
  type ToolDefinition,
  type WebSearchProvider,
} from "../src/index.ts";
import { ScriptedModelProvider } from "../src/testing/scripted-provider.ts";
import { RecordingExecutor } from "../src/testing/fake-executors.ts";
import { buildRuntime, testDefinition } from "./helpers.ts";
import { GeminiProvider } from "../../providers/gemini/src/index.ts";

const PET_DOC = {
  source: {
    id: "pet_policies",
    kind: "document" as const,
    title: "Pet policies",
    description: "Dog rules for listed homes.",
    text: "Azure Vista allows dogs. The TriBeCa Loft does not allow dogs.",
  },
};

describe("NativeAgentHarness", () => {
  it("iterates over evidence that was not predicted by the PreflightPlan", async () => {
    const records = knowledgeCapabilityName("record_query", "listings");
    const pets = knowledgeCapabilityName("document_search", "pet_policies");
    const model = new ScriptedModelProvider([
      { purpose: "agent", toolCalls: [{ name: records, args: { filters: [{ field: "price", op: "lte", value: 13_000_000 }] } }] },
      { purpose: "agent", toolCalls: [{ name: pets, args: { query: "dog policy Azure Vista" } }] },
      { purpose: "agent", text: "Azure Vista is within budget and allows dogs." },
    ]);
    const definition = testDefinition({
      planning: { mode: "deterministic" },
      knowledge: [...testDefinition().knowledge, PET_DOC],
      policies: { ...testDefinition().policies, maxAgentIterations: 5 },
    });
    const { runtime } = buildRuntime(model, { definition, harness: new NativeAgentHarness() });
    const sessionId = await runtime.createSession("native-iterative");
    const result = await runtime.runTurn({ sessionId, message: "Find a dog-friendly option in my budget." });

    assert.equal(result.reply, "Azure Vista is within budget and allows dogs.");
    assert.deepEqual(result.state.turnPlan?.retrievalRequests, []);
    assert.equal(result.events.filter((event) => event.type === "KnowledgeRetrieved").length, 2);
    assert.equal(result.events.filter((event) => event.type === "AgentIterationStarted").length, 3);
    assert.equal(model.requests.filter((request) => request.purpose === "agent").length, 3);
  });

  it("starts multiple safe document reads concurrently and preserves bounded batches", async () => {
    const sources = ["doc_a", "doc_b"].map((id) => ({
      source: { id, kind: "document" as const, title: id, description: `${id} evidence`, text: `${id} placeholder` },
    }));
    const model = new ScriptedModelProvider([
      {
        purpose: "agent",
        toolCalls: sources.map(({ source }) => ({ name: knowledgeCapabilityName("document_search", source.id), args: { query: source.id } })),
      },
      { purpose: "agent", text: "Both reads completed." },
    ]);
    const definition = testDefinition({ planning: { mode: "deterministic" }, knowledge: sources, policies: { ...testDefinition().policies, maxParallelReadCalls: 2 } });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness() });
    let active = 0;
    let maxActive = 0;
    const makeRetriever = (sourceId: string): KnowledgeRetriever => ({
      sourceId,
      kind: "document",
      title: sourceId,
      async retrieve() {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 20));
        active--;
        return [{ sourceId, sourceTitle: sourceId, chunkId: `${sourceId}#0`, text: sourceId, score: 1, rank: 1 }];
      },
    });
    for (const { source } of sources) built.knowledge.setRetriever(source.id, makeRetriever(source.id));
    const sessionId = await built.runtime.createSession("parallel-reads");
    await built.runtime.runTurn({ sessionId, message: "Read both sources." });
    assert.equal(maxActive, 2);
  });

  it("keeps side effects sequential even when one iteration requests several", async () => {
    const action = (name: string): ToolDefinition => ({
      name,
      description: name,
      effect: "external_side_effect",
      confirmation: "none",
      idempotency: "none",
      argumentPolicies: { value: { kind: "model_composed" } },
      input: { kind: "object", fields: { value: { required: true, schema: { kind: "string" } } } },
      output: { kind: "object", additionalProperties: true, fields: {} },
    });
    const actions = [action("action_one"), action("action_two")];
    const model = new ScriptedModelProvider([
      { purpose: "agent", toolCalls: actions.map((tool) => ({ name: tool.name, args: { value: tool.name } })) },
      { purpose: "agent", text: "Both completed." },
    ]);
    let active = 0;
    let maxActive = 0;
    const executor = new RecordingExecutor(() => ({ ok: true, output: {} }));
    executor.execute = async function(args, context) {
      this.calls.push({ args, context, at: Date.now() });
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active--;
      return { ok: true, output: {} };
    };
    const definition = testDefinition({
      planning: { mode: "deterministic" },
      tools: actions.map((definition) => ({ definition })),
      policies: { ...testDefinition().policies, allowUnconfirmedSideEffects: true, maxActionRequestsPerTurn: 4 },
    });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness(), registerTools: (tools) => actions.forEach((tool) => tools.register(tool.name, executor)) });
    const sessionId = await built.runtime.createSession("sequential-actions");
    await built.runtime.runTurn({ sessionId, message: "Do both." });
    assert.equal(executor.callCount, 2);
    assert.equal(maxActive, 1);
  });

  it("enforces Knowledge and Action scope on every current-Phase request", async () => {
    const blockedSource = { source: { id: "blocked_doc", kind: "document" as const, title: "Blocked", description: "Blocked", text: "secret evidence" } };
    const blockedTool: ToolDefinition = {
      name: "blocked_action",
      description: "Blocked action",
      effect: "write",
      confirmation: "none",
      idempotency: "none",
      input: { kind: "object", fields: {} },
      output: { kind: "object", fields: {} },
    };
    const model = new ScriptedModelProvider([
      {
        purpose: "agent",
        toolCalls: [
          { name: knowledgeCapabilityName("document_search", "blocked_doc"), args: { query: "secret" } },
          { name: "blocked_action", args: {} },
        ],
      },
      { purpose: "agent", text: "The runtime refused both." },
    ]);
    const executor = new RecordingExecutor();
    const definition = testDefinition({
      planning: { mode: "deterministic" },
      knowledge: [PET_DOC, blockedSource],
      tools: [{ definition: blockedTool }],
      flow: {
        initialPhaseId: "research",
        phases: [{ id: "research", objective: "Research only", knowledgeSourceIds: ["pet_policies"], toolNames: [] }],
      },
    });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness(), registerTools: (tools) => tools.register(blockedTool.name, executor) });
    const sessionId = await built.runtime.createSession("phase-scope");
    const result = await built.runtime.runTurn({ sessionId, message: "Try blocked things." });
    assert.equal(executor.callCount, 0);
    assert.equal(result.events.filter((event) => event.type === "DelegationRejected").length, 2);
    const offered = model.requests.find((request) => request.purpose === "agent")!.tools!.map((tool) => tool.name);
    assert.ok(!offered.includes("blocked_action"));
    assert.ok(!offered.includes(knowledgeCapabilityName("document_search", "blocked_doc")));
  });

  it("rebuilds the capability envelope after an action-result Phase transition", async () => {
    const advance: ToolDefinition = {
      name: "advance_phase",
      description: "Advance the phase.",
      effect: "write",
      confirmation: "none",
      idempotency: "per_input",
      input: { kind: "object", fields: {} },
      output: { kind: "object", additionalProperties: true, fields: {} },
    };
    const model = new ScriptedModelProvider([
      { purpose: "agent", toolCalls: [{ name: advance.name, args: {} }] },
      { purpose: "agent", toolCalls: [{ name: advance.name, args: {} }] },
      { purpose: "agent", text: "The second request was outside the new phase." },
    ]);
    const executor = new RecordingExecutor(() => ({ ok: true, output: {} }));
    const definition = testDefinition({
      planning: { mode: "deterministic" },
      knowledge: [],
      tools: [{ definition: advance }],
      flow: {
        initialPhaseId: "research",
        phases: [
          {
            id: "research",
            objective: "One action is available.",
            toolNames: [advance.name],
            transitions: [{ to: "done", on: "action_result", when: { kind: "tool_succeeded", tool: advance.name } }],
          },
          { id: "done", objective: "No actions are available.", toolNames: [], terminal: true },
        ],
      },
    });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness(), registerTools: (tools) => tools.register(advance.name, executor) });
    const sessionId = await built.runtime.createSession("phase-per-iteration");
    const result = await built.runtime.runTurn({ sessionId, message: "Advance twice." });
    assert.equal(executor.callCount, 1);
    assert.equal(result.state.phaseId, "done");
    assert.ok(result.events.some((event) => event.type === "DelegationRejected" && event.payload.capabilityName === advance.name));
    const agentRequests = model.requests.filter((request) => request.purpose === "agent");
    assert.ok(agentRequests[0]?.tools?.some((tool) => tool.name === advance.name));
    assert.ok(!agentRequests[1]?.tools?.some((tool) => tool.name === advance.name));
  });

  it("persists PendingAction, then executes the frozen payload after confirmation", async () => {
    const notify: ToolDefinition = {
      name: "notify",
      description: "Send a notification.",
      effect: "external_side_effect",
      confirmation: "required",
      idempotency: "per_input",
      argumentPolicies: { message: { kind: "model_composed" } },
      input: { kind: "object", fields: { message: { required: true, schema: { kind: "string" } } } },
      output: { kind: "object", additionalProperties: true, fields: {} },
    };
    const model = new ScriptedModelProvider([
      { purpose: "agent", toolCalls: [{ name: notify.name, args: { message: "Frozen message" } }] },
      { purpose: "agent", text: "The frozen notification was sent." },
    ]);
    const executor = new RecordingExecutor(() => ({ ok: true, output: { sent: true } }));
    const definition = testDefinition({ planning: { mode: "deterministic" }, knowledge: [], tools: [{ definition: notify }] });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness(), registerTools: (tools) => tools.register(notify.name, executor) });
    const sessionId = await built.runtime.createSession("native-confirm");
    const pending = await built.runtime.runTurn({ sessionId, message: "Notify them." });
    assert.equal(pending.stopReason, "awaiting_confirmation");
    assert.equal(executor.callCount, 0);
    assert.deepEqual(pending.state.pendingAction?.args, { message: "Frozen message" });

    const confirmed = await built.runtime.runTurn({ sessionId, message: "Yes." });
    assert.equal(executor.callCount, 1);
    assert.deepEqual(executor.lastArgs, { message: "Frozen message" });
    assert.equal(confirmed.state.pendingAction, null);
  });

  it("injects provider-neutral Web Search and fixes company-site domains at the source", async () => {
    const requests: Parameters<WebSearchProvider["search"]>[0][] = [];
    const webSearch: WebSearchProvider = {
      async search(request) {
        requests.push(request);
        return { query: request.query, results: [{ title: "Official", url: "https://example.com/pets", snippet: "Dogs allowed" }] };
      },
    };
    const web = { source: { id: "company", kind: "web_search" as const, title: "Company site", description: "Official site", allowedDomains: ["example.com"], maxResults: 3 } };
    const capability = knowledgeCapabilityName("web_search", "company");
    const model = new ScriptedModelProvider([
      { purpose: "agent", toolCalls: [{ name: capability, args: { query: "pet policy", max_results: 2 } }] },
      { purpose: "agent", text: "The official site says dogs are allowed." },
    ]);
    const definition = testDefinition({ planning: { mode: "deterministic" }, knowledge: [web] });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness(), webSearch });
    const sessionId = await built.runtime.createSession("web-search");
    const result = await built.runtime.runTurn({ sessionId, message: "Check the company site." });
    assert.equal(result.reply, "The official site says dogs are allowed.");
    assert.deepEqual(requests[0]?.allowedDomains, ["example.com"]);
    assert.equal(requests[0]?.maxResults, 2);
  });

  it("fails a configured Web Search explicitly when no provider is injected", async () => {
    const web = { source: { id: "public_web", kind: "web_search" as const, title: "Web", description: "Current web" } };
    const model = new ScriptedModelProvider([
      { purpose: "agent", toolCalls: [{ name: knowledgeCapabilityName("web_search", "public_web"), args: { query: "today" } }] },
      { purpose: "agent", text: "Web Search is unavailable in this runtime." },
    ]);
    const definition = testDefinition({ planning: { mode: "deterministic" }, knowledge: [web] });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness() });
    const sessionId = await built.runtime.createSession("missing-web");
    const result = await built.runtime.runTurn({ sessionId, message: "Search." });
    const rejection = result.events.find((event) => event.type === "DelegationRejected");
    assert.equal(rejection?.type === "DelegationRejected" ? rejection.payload.code : undefined, "web_search_unavailable");
  });

  it("stops safely at maxAgentIterations", async () => {
    const capability = knowledgeCapabilityName("document_search", "pet_policies");
    const model = new ScriptedModelProvider([
      { purpose: "agent", toolCalls: [{ name: capability, args: { query: "dogs" } }] },
      { purpose: "agent", toolCalls: [{ name: capability, args: { query: "dogs again" } }] },
    ]);
    const definition = testDefinition({ planning: { mode: "deterministic" }, knowledge: [PET_DOC], policies: { ...testDefinition().policies, maxAgentIterations: 2 } });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness() });
    const sessionId = await built.runtime.createSession("iteration-limit");
    const result = await built.runtime.runTurn({ sessionId, message: "Keep searching." });
    assert.equal(result.stopReason, "max_iterations");
    assert.ok(result.events.some((event) => event.type === "RuntimeError" && event.payload.code === "max_agent_iterations_exceeded"));
  });

  it("runs GeminiProvider through the iterative native path", async () => {
    const capability = knowledgeCapabilityName("document_search", "pet_policies");
    const payloads = [
      { candidates: [{ content: { parts: [{ functionCall: { name: capability, args: { query: "dogs" } } }] }, finishReason: "STOP" }], modelVersion: "gemini-test" },
      { candidates: [{ content: { parts: [{ text: "Gemini completed the native loop." }] }, finishReason: "STOP" }], modelVersion: "gemini-test" },
    ];
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify(payloads.shift()), { status: 200, headers: { "content-type": "application/json" } });
    const gemini = new GeminiProvider({ apiKey: "test", model: "gemini-test", fetchImpl, maxRetries: 0 });
    const definition = testDefinition({ model: { providerId: "gemini", model: "gemini-test" }, planning: { mode: "deterministic" }, knowledge: [PET_DOC] });
    const built = buildRuntime(gemini, { definition, harness: new NativeAgentHarness() });
    const sessionId = await built.runtime.createSession("gemini-native");
    const result = await built.runtime.runTurn({ sessionId, message: "Research dogs." });
    assert.equal(result.reply, "Gemini completed the native loop.");
    assert.equal(result.events.filter((event) => event.type === "ModelCallCompleted" && event.payload.purpose.startsWith("agent:")).length, 2);
  });
});

describe("out-of-band Host Context", () => {
  it("updates durable state without invoking a model and reaches the next turn safely", async () => {
    const model = new ScriptedModelProvider([{ purpose: "agent", text: "I can see the selected page." }]);
    const definition = testDefinition({ planning: { mode: "deterministic" }, knowledge: [] });
    const built = buildRuntime(model, { definition, harness: new NativeAgentHarness() });
    const sessionId = await built.runtime.createSession("host-observe");
    const observed = await built.runtime.observeHostContext({
      sessionId,
      hostContext: { page_url: "/products/b", crm_api_key: "never-show", internal_risk_tier: "high" },
    });
    assert.equal(model.requests.length, 0);
    assert.equal(observed.events.length, 1);
    assert.equal(observed.events[0]?.type, "HostContextObserved");
    assert.equal(observed.state.hostContext["page_url"]?.value, "/products/b");

    const turn = await built.runtime.runTurn({ sessionId, message: "How much is this one?" });
    const prompts = turn.contexts.map(({ context }) => context.system).join("\n");
    assert.match(prompts, /\/products\/b/);
    assert.doesNotMatch(prompts, /never-show|internal_risk_tier|high/);
    assert.deepEqual(await built.runtime.replay(sessionId), turn.state);
  });
});
