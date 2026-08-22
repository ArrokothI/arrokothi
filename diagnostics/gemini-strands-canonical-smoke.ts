import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createRandomIds,
  createSystemClock,
  recordQueryTools,
} from "@agent-sdk/core";
import { emailDryRun } from "@agent-sdk/core/testing";
import { StrandsLoopEngine } from "@agent-sdk/integration-strands";
import { GeminiProvider } from "@agent-sdk/provider-gemini";
import {
  type Message,
  type ModelStreamEvent,
  type StreamOptions,
} from "../integrations/strands/node_modules/@strands-agents/sdk/dist/src/index.js";
import { GoogleModel } from "../integrations/strands/node_modules/@strands-agents/sdk/dist/src/models/google/index.js";
import {
  computeWallVolume,
  computeWallVolumeExecutor,
  craigAgent,
} from "../examples/p01-craig/agent.ts";
import { estateAgent, sendEstateLead } from "../examples/p02-estate/agent.ts";

const apiKey = process.env["GEMINI_API_KEY"];
const modelId = process.env["GEMINI_MODEL"];
if (!apiKey) throw new Error("GEMINI_API_KEY was not loaded from the root .env");
if (!modelId) throw new Error("GEMINI_MODEL was not loaded from the root .env");

const project = process.argv.includes("--p02") ? "p02" : "p01";
const definition = project === "p01" ? craigAgent : estateAgent;
const prompt = project === "p01"
  ? "I'm planning a backyard office. I have about 420 sq. ft. of exterior wall area, want 10-inch walls, and I care more about speed than hands-on mixing."
  : "I'm buying in Manhattan. Budget is around $20M and I'd like to move within six months. I'm paying cash.";

type RequestShape = {
  model: string;
  contents: Array<{ role?: string; parts?: Array<Record<string, unknown>> }>;
  config: Record<string, unknown>;
};

class DiagnosticGoogleModel extends GoogleModel {
  private requestIndex = 0;

  override async *stream(messages: Message[], options?: StreamOptions): AsyncIterable<ModelStreamEvent> {
    const request = (this as unknown as { _formatRequest(messages: Message[], options?: StreamOptions): RequestShape })
      ._formatRequest(messages, options);
    this.requestIndex++;
    console.error(JSON.stringify({
      kind: "sanitized_gemini_request",
      project,
      requestIndex: this.requestIndex,
      model: request.model,
      contents: request.contents.map((content) => ({
        role: content.role,
        parts: (content.parts ?? []).map(sanitizePart),
      })),
      functionNames: functionNames(request.config),
    }));
    try {
      yield* super.stream(messages, options);
    } catch (error) {
      console.error(JSON.stringify({
        kind: "gemini_request_rejected",
        project,
        requestIndex: this.requestIndex,
        model: request.model,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }
}

function sanitizePart(part: Record<string, unknown>): Record<string, unknown> {
  const call = asRecord(part["functionCall"]);
  if (call) {
    const signature = part["thoughtSignature"];
    return {
      type: "functionCall",
      name: call["name"],
      id: typeof call["id"] === "string" ? "present" : "missing",
      thoughtSignature: typeof signature === "string" && signature.length > 0
        ? { present: true, length: signature.length }
        : { present: false, length: 0 },
    };
  }
  const response = asRecord(part["functionResponse"]);
  if (response) {
    return {
      type: "functionResponse",
      name: response["name"],
      id: typeof response["id"] === "string" ? "present" : "missing",
      responseKeys: Object.keys(asRecord(response["response"]) ?? {}).sort(),
    };
  }
  if (part["thought"] === true) {
    const signature = part["thoughtSignature"];
    return {
      type: "thought",
      thoughtSignature: typeof signature === "string" && signature.length > 0
        ? { present: true, length: signature.length }
        : { present: false, length: 0 },
    };
  }
  return typeof part["text"] === "string" ? { type: "text" } : { type: "other", keys: Object.keys(part).sort() };
}

function functionNames(config: Record<string, unknown>): unknown[] {
  const tools = Array.isArray(config["tools"]) ? config["tools"] : [];
  return tools.flatMap((tool) => {
    const declarations = asRecord(tool)?.["functionDeclarations"];
    return Array.isArray(declarations)
      ? declarations.map((declaration) => asRecord(declaration)?.["name"])
      : [];
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

const knowledge = new KnowledgeIndex(definition.knowledge);
const tools = new ToolRegistry(definition.tools);
for (const pair of recordQueryTools(knowledge)) tools.add(pair.definition, pair.executor);
if (project === "p01") tools.register(computeWallVolume.name, computeWallVolumeExecutor);
if (project === "p02") tools.register(sendEstateLead.name, emailDryRun("success"));

const provider = new GeminiProvider({ apiKey, model: modelId, maxRetries: 0 });
const runtime = new AgentRuntime({
  definition,
  sessions: new InMemorySessionStore(),
  knowledge,
  tools,
  model: provider,
  planningModel: provider,
  harness: new AgentHarness({
    strategy: "agentic",
    engine: new StrandsLoopEngine({
      model: new DiagnosticGoogleModel({ apiKey, modelId }),
    }),
  }),
  ids: createRandomIds(),
  clock: createSystemClock(),
});

console.log(JSON.stringify({ envLoaded: true, configuredModel: modelId, project }));
const sessionId = await runtime.createSession(undefined, `${project}-canonical-smoke`);
const result = await runtime.runTurn({
  sessionId,
  message: prompt,
  hostContext: project === "p01"
    ? { locale: "en-US" }
    : { locale: "en-US", handoff_transport_token: "diagnostic-dry-run", lead_score_band: "unscored" },
});
console.log(JSON.stringify({
  project,
  stopReason: result.stopReason,
  reply: result.reply,
  runtimeErrors: result.events.filter((event) => event.type === "RuntimeError").map((event) => event.payload),
  modelCalls: result.events.filter((event) => event.type === "ModelCallCompleted").map((event) => event.payload),
  toolEvents: result.events
    .filter((event) => ["ToolRequested", "ToolExecutionSucceeded", "KnowledgeRetrieved"].includes(event.type))
    .map((event) => ({ type: event.type, payload: event.payload })),
  metrics: result.metrics,
}));
