import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
  defineAgent,
  knowledgeCapabilityName,
} from "@agent-sdk/core";
import { ScriptedModelProvider } from "@agent-sdk/core/testing";
import { StrandsLoopEngine, createStrandsGeminiEngine } from "@agent-sdk/integration-strands";
import { GeminiProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import {
  Model,
  type BaseModelConfig,
  type Message,
  type ModelStreamEvent,
  type StreamOptions,
} from "@strands-agents/sdk";

/** Two-cycle Strands model used by the automated/offline example; it performs no network I/O. */
class OfflineStrandsModel extends Model<BaseModelConfig> {
  private config: BaseModelConfig = { modelId: "offline-strands-gemini", contextWindowLimit: 8_192 };
  private calls = 0;
  private readonly capabilityName: string;

  constructor(capabilityName: string) {
    super();
    this.capabilityName = capabilityName;
  }

  override updateConfig(config: BaseModelConfig): void {
    this.config = { ...this.config, ...config };
  }

  override getConfig(): BaseModelConfig {
    return { ...this.config };
  }

  override async *stream(_messages: Message[], _options?: StreamOptions): AsyncIterable<ModelStreamEvent> {
    this.calls++;
    yield { type: "modelMessageStartEvent", role: "assistant" };
    if (this.calls === 1) {
      yield { type: "modelContentBlockStartEvent", start: { type: "toolUseStart", name: this.capabilityName, toolUseId: "policy-lookup" } };
      yield { type: "modelContentBlockDeltaEvent", delta: { type: "toolUseInputDelta", input: JSON.stringify({ query: "Team plan active project limit" }) } };
      yield { type: "modelContentBlockStopEvent" };
      yield { type: "modelMetadataEvent", usage: { inputTokens: 12, outputTokens: 3, totalTokens: 15 }, metrics: { latencyMs: 1 } };
      yield { type: "modelMessageStopEvent", stopReason: "toolUse" };
      return;
    }
    yield { type: "modelContentBlockStartEvent" };
    yield { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text: "The Acme Team plan supports up to five active projects." } };
    yield { type: "modelContentBlockStopEvent" };
    yield { type: "modelMetadataEvent", usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 }, metrics: { latencyMs: 1 } };
    yield { type: "modelMessageStopEvent", stopReason: "endTurn" };
  }
}

const definition = defineAgent({
  id: "strands-gemini-example",
  version: 35,
  name: "Strands Gemini Product Guide",
  goal: "Answer product-limit questions only from runtime-controlled evidence.",
  model: { providerId: "gemini", model: process.env["GEMINI_MODEL"] ?? "gemini-3.5-flash-lite", temperature: 0.1 },
  planning: { mode: "llm", extractWorkingNotes: true },
  execution: { harness: "agentic", executionContextPolicy: "fresh_each_turn" },
  globalRules: [
    { id: "plan-source", kind: "invariant", scope: "planner", text: "Call the configured product-policy Knowledge capability exactly once before answering a product-limit question. After its result, answer without calling it again." },
    { id: "answer-source", kind: "invariant", scope: "response", text: "State only limits supported by a runtime observation." },
  ],
  memorySchema: {
    fields: [{ key: "active_topic", schema: { kind: "string" }, description: "The product topic currently being discussed." }],
  },
  hostContextSchema: { fields: [] },
  knowledge: [{
    source: {
      id: "product_policy",
      kind: "document",
      title: "Product policy",
      description: "Authoritative product limits.",
      text: "The Acme Team plan supports up to five active projects.",
    },
  }],
  tools: [],
  policies: { maxAgentIterations: 5, maxKnowledgeCallsPerTurn: 1, maxToolCallsPerTurn: 1 },
});

const live = process.argv.includes("--live");
const apiKey = geminiApiKeyFromEnv();
if (live && !apiKey) {
  throw new Error("The live example requires GEMINI_API_KEY (or GOOGLE_API_KEY).");
}

const capability = knowledgeCapabilityName("document_search", "product_policy");
const planningModel = live
  ? new GeminiProvider({ apiKey: apiKey!, model: definition.model.model })
  : new ScriptedModelProvider([{
      purpose: "plan",
      json: { memory_writes: { active_topic: "Team plan project limit" } },
    }], { id: "gemini", model: "offline-preflight" });
const engine = live
  ? createStrandsGeminiEngine({ apiKey })
  : new StrandsLoopEngine({ model: new OfflineStrandsModel(capability) });

const sessions = new InMemorySessionStore();
const runtime = new AgentRuntime({
  definition,
  sessions,
  model: planningModel,
  tools: new ToolRegistry(),
  knowledge: new KnowledgeIndex(definition.knowledge),
  harness: new AgentHarness({
    engine,
    validateTerminalResponse: (text) => /\b(?:five|5)\b/i.test(text) && !/\b50\b/.test(text)
      ? { kind: "proceed" }
      : {
          kind: "guide",
          code: "grounding_mismatch",
          feedback: "Use the authoritative Knowledge result: the Team plan supports five active projects. Answer without another tool call.",
        },
  }),
  ids: createDeterministicIds(),
  clock: createFixedClock(),
});

const sessionId = await runtime.createSession(live ? "strands-gemini-live" : "strands-gemini-offline");
const result = await runtime.runTurn({ sessionId, message: "How many active projects does the Team plan support?" });
const runtimeErrors = result.events.filter((event) => event.type === "RuntimeError");
const knowledgeCalls = result.events.filter((event) => event.type === "KnowledgeRetrieved").length;
if (
  result.stopReason !== "completed"
  || runtimeErrors.length > 0
  || knowledgeCalls !== 1
  || !/\b(?:five|5)\b/i.test(result.reply)
  || /\b50\b/.test(result.reply)
) {
  throw new Error(`Strands example failed verification: stopReason=${result.stopReason}; runtimeErrors=${runtimeErrors.length}; knowledgeCalls=${knowledgeCalls}`);
}

console.log(result.reply);
console.log(`mode=${live ? "live" : "offline"}`);
console.log(`model_calls=${result.metrics.totalModelCalls} (preflight=${result.metrics.preflightModelCalls}, loop=${result.metrics.agentLoopModelCalls}, summaries=${result.metrics.conversationSummaryModelCalls})`);
console.log(`knowledge_calls=${knowledgeCalls}`);
