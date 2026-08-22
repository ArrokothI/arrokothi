import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import type {
  AgentLoopInput,
  AgentLoopTraceEvent,
  CapabilityDefinition,
  CompiledContext,
} from "@agent-sdk/core";
import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
  defineAgent,
} from "@agent-sdk/core";
import {
  Model,
  type BaseModelConfig,
  type Message,
  type ModelStreamEvent,
  type StreamOptions,
} from "@strands-agents/sdk";
import { ScriptedModelProvider } from "@agent-sdk/core/testing";
import { StrandsLoopEngine } from "../src/index.ts";

type ScriptStep =
  | { kind: "text"; text: string }
  | { kind: "tool"; name: string; input: Record<string, unknown>; id?: string }
  | { kind: "error"; message: string };

class ScriptedStrandsModel extends Model<BaseModelConfig> {
  private config: BaseModelConfig;
  readonly calls: { messages: Message[]; options?: StreamOptions }[] = [];
  readonly steps: ScriptStep[];

  constructor(steps: ScriptStep[], contextWindowLimit = 10_000) {
    super();
    this.steps = [...steps];
    this.config = { modelId: "strands-test", contextWindowLimit };
  }

  override updateConfig(config: BaseModelConfig): void {
    this.config = { ...this.config, ...config };
  }

  override getConfig(): BaseModelConfig {
    return { ...this.config };
  }

  override async *stream(messages: Message[], options?: StreamOptions): AsyncIterable<ModelStreamEvent> {
    this.calls.push({ messages: messages.map((message) => message.clone()), options });
    const step = this.steps.shift();
    if (!step) throw new Error("script exhausted");
    if (step.kind === "error") throw new Error(step.message);
    yield { type: "modelMessageStartEvent", role: "assistant" };
    if (step.kind === "text") {
      yield { type: "modelContentBlockStartEvent" };
      yield { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: step.text } };
      yield { type: "modelContentBlockStopEvent" };
      yield { type: "modelMetadataEvent", usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 }, metrics: { latencyMs: 1 } };
      yield { type: "modelMessageStopEvent", stopReason: "endTurn" };
      return;
    }
    yield {
      type: "modelContentBlockStartEvent",
      start: { type: "toolUseStart", name: step.name, toolUseId: step.id ?? `tool-${this.calls.length}` },
    };
    yield { type: "modelContentBlockDeltaEvent", delta: { type: "toolUseInputDelta", input: JSON.stringify(step.input) } };
    yield { type: "modelContentBlockStopEvent" };
    yield { type: "modelMetadataEvent", usage: { inputTokens: 10, outputTokens: 2, totalTokens: 12 }, metrics: { latencyMs: 1 } };
    yield { type: "modelMessageStopEvent", stopReason: "toolUse" };
  }
}

const lookup: CapabilityDefinition = {
  name: "lookup",
  category: "knowledge",
  readOnly: true,
  modelSpec: {
    name: "lookup",
    description: "Look up an item.",
    input: { kind: "object", fields: { query: { required: true, schema: { kind: "string" } } } },
  },
  implementation: { kind: "tool", toolName: "lookup", effect: "read" },
};

function context(messages: CompiledContext["messages"] = [{ role: "user", content: "Find it" }]): CompiledContext {
  return {
    agentId: "test",
    agentVersion: 1,
    phaseId: null,
    sections: [],
    system: "Safe system prompt.",
    messages,
    knowledgeUsed: [],
    effectiveRules: [],
    withheldContextKeys: [{ key: "customer_id", visibility: "runtime_only" }],
    approxChars: 19,
  };
}

function loopInput(
  model: ScriptedStrandsModel,
  overrides: Partial<AgentLoopInput> = {},
): { engine: StrandsLoopEngine; input: AgentLoopInput; traces: AgentLoopTraceEvent[] } {
  const traces: AgentLoopTraceEvent[] = [];
  const input: AgentLoopInput = {
    context: context(),
    modelPolicy: { providerId: "test", model: "strands-test" },
    capabilities: () => ({ phaseId: null, capabilities: [lookup] }),
    requestCapability: async () => ({ decision: { kind: "proceed" }, observation: { ok: true } }),
    executionContext: {
      sessionId: "session-1",
      turn: 1,
      requestId: "request-1",
      traceId: "trace-1",
      invocationHostContext: {
        customer_id: {
          key: "customer_id",
          value: "cust-secret-42",
          lifecycle: "session",
          visibility: "runtime_only",
          trust: "trusted_host",
          turn: 1,
          at: "2026-01-01T00:00:00.000Z",
        },
      },
    },
    limits: { maxIterations: 6, maxGuideRetries: 2 },
    onTrace: (event) => traces.push(event),
    ...overrides,
  };
  return { engine: new StrandsLoopEngine({ model }), input, traces };
}

describe("StrandsLoopEngine", () => {
  it("keeps one InvocationState across model/tool cycles without leaking runtime context", async () => {
    const model = new ScriptedStrandsModel([
      { kind: "tool", name: "lookup", input: { query: "safe" }, id: "lookup-1" },
      { kind: "text", text: "Found it." },
    ]);
    let gatewayCalls = 0;
    const built = loopInput(model, {
      requestCapability: async (request) => {
        gatewayCalls++;
        assert.deepEqual(request.input, { query: "safe" });
        return { decision: { kind: "proceed" }, observation: { ok: true, title: "Result" } };
      },
    });
    const result = await built.engine.run(built.input);

    assert.equal(result.replyText, "Found it.");
    assert.equal(gatewayCalls, 1);
    assert.equal(result.metrics.modelCalls, 2);
    assert.equal(result.metrics.toolRequests, 1);
    const serializedModelInput = JSON.stringify(model.calls);
    assert.doesNotMatch(serializedModelInput, /cust-secret-42|customer_id/);
    const afterTool = built.traces.find((event) => event.kind === "lifecycle" && event.event === "after_tool");
    assert.deepEqual(afterTool?.kind === "lifecycle" ? afterTool.detail?.["runtimeContextKeysRead"] : undefined, ["customer_id"]);
    assert.ok(Number(afterTool?.kind === "lifecycle" ? afterTool.detail?.["mutationVersion"] : 0) >= 3);
  });

  it("maps deterministic Guide feedback into the existing loop and accounts for its retry", async () => {
    const model = new ScriptedStrandsModel([
      { kind: "tool", name: "lookup", input: { query: "public web" } },
      { kind: "tool", name: "lookup", input: { query: "company source" } },
      { kind: "text", text: "Used the company source." },
    ]);
    const requested: string[] = [];
    const built = loopInput(model, {
      evaluateCapability: (request) => request.input["query"] === "public web"
        ? { kind: "guide", code: "first_party_first", feedback: "Use the configured first-party company knowledge first." }
        : { kind: "proceed" },
      requestCapability: async (request) => {
        requested.push(String(request.input["query"]));
        return { decision: { kind: "proceed" }, observation: { ok: true } };
      },
    });
    const result = await built.engine.run(built.input);

    assert.equal(result.replyText, "Used the company source.");
    assert.deepEqual(requested, ["company source"]);
    assert.equal(result.metrics.guideRetryCalls, 1);
    assert.equal(result.metrics.modelCalls, 3);
  });

  it("transforms before Gateway validation and pauses on Agent_SDK confirmation truth", async () => {
    const model = new ScriptedStrandsModel([{ kind: "tool", name: "lookup", input: { query: "raw" }, id: "confirm-1" }]);
    let gatewayInput: Record<string, unknown> | undefined;
    const built = loopInput(model, {
      evaluateCapability: () => ({
        kind: "transform",
        reason: "normalize",
        input: { query: "normalized" },
        requiresFreshConfirmation: true,
      }),
      requestCapability: async (request) => {
        gatewayInput = request.input;
        return { decision: { kind: "confirm", requestId: "pending-1", promptText: "Approve normalized lookup?" } };
      },
    });
    const result = await built.engine.run(built.input);

    assert.deepEqual(gatewayInput, { query: "normalized" });
    assert.equal(result.stopReason, "awaiting_confirmation");
    assert.equal(result.replyText, "Approve normalized lookup?");
  });

  it("persists PendingAction across fresh Strands invocations and executes only the frozen payload", async () => {
    const action = {
      name: "send_notice",
      label: "send the exact notice",
      description: "Send one externally visible notice after exact confirmation.",
      effect: "external_side_effect" as const,
      confirmation: "required" as const,
      idempotency: "once_per_session" as const,
      input: {
        kind: "object" as const,
        fields: { message: { required: true, schema: { kind: "string" as const, minLength: 5 } } },
      },
      output: { kind: "object" as const, additionalProperties: true, fields: {} },
      argumentPolicies: { message: { kind: "model_composed" as const } },
    };
    const definition = defineAgent({
      id: "strands-pending-regression",
      version: 35,
      name: "Strands PendingAction regression",
      goal: "Send a notice only after exact runtime confirmation.",
      model: { providerId: "test", model: "strands-test" },
      planning: { mode: "llm", extractWorkingNotes: false },
      execution: { harness: "agentic", executionContextPolicy: "fresh_each_turn" },
      globalRules: [],
      memorySchema: { fields: [] },
      hostContextSchema: { fields: [] },
      knowledge: [],
      tools: [{ definition: action }],
    });
    const strandsModel = new ScriptedStrandsModel([
      { kind: "tool", name: action.name, input: { message: "x" }, id: "notice-1" },
      { kind: "text", text: "The confirmed frozen notice was sent." },
    ]);
    const executed: Record<string, unknown>[] = [];
    const tools = new ToolRegistry(definition.tools);
    tools.register(action.name, {
      async execute(args) {
        executed.push(structuredClone(args));
        return { ok: true, output: { delivered: true } };
      },
    });
    const sessions = new InMemorySessionStore();
    const runtime = new AgentRuntime({
      definition,
      sessions,
      model: new ScriptedModelProvider([]),
      tools,
      knowledge: new KnowledgeIndex([]),
      harness: new AgentHarness({
        engine: new StrandsLoopEngine({ model: strandsModel }),
        evaluateCapability: (request) => request.input["message"] === "x"
          ? {
              kind: "transform",
              reason: "normalize the notice before validation",
              input: { message: "the frozen normalized notice" },
              requiresFreshConfirmation: true,
            }
          : { kind: "proceed" },
      }),
      ids: createDeterministicIds(),
      clock: createFixedClock(),
    });
    const sessionId = await runtime.createSession("strands-pending");

    const requested = await runtime.runTurn({ sessionId, message: "Send the notice." });
    assert.equal(requested.stopReason, "awaiting_confirmation");
    assert.equal(executed.length, 0);
    assert.deepEqual(requested.state.pendingAction?.args, { message: "the frozen normalized notice" });

    const confirmed = await runtime.runTurn({ sessionId, message: "Yes, send exactly that notice." });
    assert.equal(confirmed.stopReason, "completed");
    assert.deepEqual(executed, [{ message: "the frozen normalized notice" }]);
    assert.equal(confirmed.state.pendingAction, null);
    assert.ok(confirmed.events.some((event) => event.type === "ConfirmationResolved" && event.payload.decision === "confirm"));
    assert.ok(confirmed.events.some((event) => event.type === "ToolExecutionSucceeded"));
  });

  it("does not proactively summarize an ordinary short run", async () => {
    const model = new ScriptedStrandsModel([{ kind: "text", text: "Short." }]);
    const built = loopInput(model);
    const result = await built.engine.run(built.input);
    assert.equal(result.metrics.conversationSummaryCalls, 0);
    assert.ok(!built.traces.some((event) => event.kind === "conversation_compacted"));
  });

  it("preserves the provider error when Strands invocation throws", async () => {
    const model = new ScriptedStrandsModel([{ kind: "error", message: "429 request quota reached" }]);
    const built = loopInput(model);
    const result = await built.engine.run(built.input);
    assert.equal(result.stopReason, "error");
    assert.equal(result.providerStopReason, "429 request quota reached");
    assert.ok(built.traces.some((event) =>
      event.kind === "lifecycle"
      && event.event === "execution_error"
      && event.detail?.["providerStopReason"] === "429 request quota reached"));
  });

  it("uses the actual SummarizingConversationManager when forced over its configured threshold", async () => {
    const model = new ScriptedStrandsModel([
      { kind: "text", text: "- concise execution summary" },
      { kind: "text", text: "Reduced safely." },
    ], 120);
    const longMessages = Array.from({ length: 14 }, (_, index) => ({
      role: index % 2 ? "assistant" as const : "user" as const,
      content: `message ${index} ${"x".repeat(80)}`,
    }));
    longMessages.push({ role: "user", content: "final request" });
    const traces: AgentLoopTraceEvent[] = [];
    const input = loopInput(model, { context: context(longMessages), onTrace: (event) => traces.push(event) }).input;
    const engine = new StrandsLoopEngine({
      model,
      conversation: { proactiveCompression: true, preserveRecentMessages: 2, pinFirst: 1, summaryRatio: 0.5 },
    });
    const result = await engine.run(input);

    assert.equal(result.replyText, "Reduced safely.");
    assert.equal(result.metrics.conversationSummaryCalls, 1);
    assert.ok(traces.some((event) => event.kind === "conversation_compacted" && event.summaryModelCalls === 1));
  });
});

describe("Strands dependency containment", () => {
  it("keeps @strands-agents/sdk imports outside core", async () => {
    const root = path.join(process.cwd(), "core", "src");
    const files = await allFiles(root);
    for (const file of files.filter((candidate) => candidate.endsWith(".ts"))) {
      assert.doesNotMatch(await readFile(file, "utf8"), /@strands-agents\/sdk/, file);
    }
  });
});

async function allFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? allFiles(target) : [target];
  }));
  return nested.flat();
}
