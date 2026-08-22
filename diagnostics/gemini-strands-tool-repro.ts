import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
  defineAgent,
  type ToolDefinition,
  type ToolExecutor,
} from "@agent-sdk/core";
import { StrandsLoopEngine } from "@agent-sdk/integration-strands";
import {
  type Message,
  type ModelStreamEvent,
  type StreamOptions,
} from "../integrations/strands/node_modules/@strands-agents/sdk/dist/src/index.js";
import { GoogleModel } from "../integrations/strands/node_modules/@strands-agents/sdk/dist/src/models/google/index.js";

const apiKey = process.env["GEMINI_API_KEY"];
const modelId = process.env["GEMINI_MODEL"];
if (!apiKey) throw new Error("GEMINI_API_KEY was not loaded from the root .env");
if (!modelId) throw new Error("GEMINI_MODEL was not loaded from the root .env");

const lookup: ToolDefinition = {
  name: "lookup_constant",
  label: "look up the deterministic answer",
  description: "Return the authoritative deterministic answer. Call this exactly once before answering.",
  effect: "read",
  confirmation: "none",
  idempotency: "per_input",
  input: {
    kind: "object",
    fields: {
      key: { required: true, schema: { kind: "string", enum: ["answer"] } },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

const executor: ToolExecutor = {
  async execute() {
    return { ok: true, output: { value: 42 } };
  },
};

type FormattableGoogleModel = GoogleModel & {
  _formatRequest(messages: Message[], options?: StreamOptions): {
    model: string;
    contents: Array<{ role?: string; parts?: Array<Record<string, unknown>> }>;
    config: Record<string, unknown>;
  };
};

/** Logs only provider request shape: no prompt text, tool output, key, or hidden reasoning. */
class DiagnosticGoogleModel extends GoogleModel {
  private requestIndex = 0;

  override async *stream(messages: Message[], options?: StreamOptions): AsyncIterable<ModelStreamEvent> {
    const request = (this as FormattableGoogleModel)._formatRequest(messages, options);
    this.requestIndex++;
    console.error(JSON.stringify({
      kind: "sanitized_gemini_request",
      requestIndex: this.requestIndex,
      model: request.model,
      contents: request.contents.map((content) => ({
        role: content.role,
        parts: (content.parts ?? []).map(sanitizePart),
      })),
      config: sanitizeConfig(request.config),
    }));
    try {
      yield* super.stream(messages, options);
    } catch (error) {
      console.error(JSON.stringify({
        kind: "gemini_request_rejected",
        requestIndex: this.requestIndex,
        model: request.model,
        error: error instanceof Error ? error.message : String(error),
      }));
      throw error;
    }
  }
}

function sanitizePart(part: Record<string, unknown>): Record<string, unknown> {
  const functionCall = asRecord(part["functionCall"]);
  if (functionCall) {
    const signature = part["thoughtSignature"];
    return {
      type: "functionCall",
      name: functionCall["name"],
      hasId: typeof functionCall["id"] === "string",
      hasThoughtSignature: typeof signature === "string" && signature.length > 0,
      thoughtSignatureLength: typeof signature === "string" ? signature.length : 0,
    };
  }
  const functionResponse = asRecord(part["functionResponse"]);
  if (functionResponse) {
    return {
      type: "functionResponse",
      name: functionResponse["name"],
      hasId: typeof functionResponse["id"] === "string",
      responseKeys: Object.keys(asRecord(functionResponse["response"]) ?? {}).sort(),
    };
  }
  if (part["thought"] === true) {
    const signature = part["thoughtSignature"];
    return {
      type: "thought",
      hasThoughtSignature: typeof signature === "string" && signature.length > 0,
      thoughtSignatureLength: typeof signature === "string" ? signature.length : 0,
    };
  }
  if (typeof part["text"] === "string") return { type: "text" };
  return { type: "other", keys: Object.keys(part).sort() };
}

function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const tools = Array.isArray(config["tools"]) ? config["tools"] : [];
  return {
    hasSystemInstruction: config["systemInstruction"] !== undefined,
    generationKeys: Object.keys(config).filter((key) => !["tools", "systemInstruction"].includes(key)).sort(),
    tools: tools.map((tool) => {
      const record = asRecord(tool) ?? {};
      const declarations = Array.isArray(record["functionDeclarations"])
        ? record["functionDeclarations"] as Array<Record<string, unknown>>
        : [];
      return {
        type: declarations.length > 0 ? "functionDeclarations" : "builtIn",
        functions: declarations.map((declaration) => ({
          name: declaration["name"],
          schemaKeys: Object.keys(asRecord(declaration["parametersJsonSchema"]) ?? {}).sort(),
        })),
      };
    }),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

const definition = defineAgent({
  id: "gemini-strands-tool-repro",
  version: 35,
  name: "Gemini Strands Tool Reproducer",
  goal: "Use one deterministic runtime tool and report its result.",
  model: { providerId: "gemini", model: modelId, temperature: 0 },
  planning: { mode: "deterministic" },
  execution: { harness: "agentic", executionContextPolicy: "fresh_each_turn" },
  globalRules: [
    "Call lookup_constant exactly once with key=answer before answering.",
    "After the tool result, answer only: The answer is 42.",
  ],
  memorySchema: { fields: [] },
  hostContextSchema: { fields: [] },
  knowledge: [],
  tools: [{ definition: lookup }],
  policies: { maxAgentIterations: 3, maxToolCallsPerTurn: 1 },
});

const tools = new ToolRegistry(definition.tools);
tools.register(lookup.name, executor);
const runtime = new AgentRuntime({
  definition,
  sessions: new InMemorySessionStore(),
  model: {
    id: "unused-deterministic-planner",
    async generate() {
      throw new Error("deterministic planning must not call the planning model");
    },
  },
  tools,
  knowledge: new KnowledgeIndex(),
  harness: new AgentHarness({
    engine: new StrandsLoopEngine({
      model: new DiagnosticGoogleModel({ apiKey, modelId }),
    }),
  }),
  ids: createDeterministicIds(),
  clock: createFixedClock(),
});

console.log(JSON.stringify({ envLoaded: true, configuredModel: modelId }));
const sessionId = await runtime.createSession("gemini-strands-tool-repro");
const result = await runtime.runTurn({
  sessionId,
  message: "Use the required tool and give me the authoritative answer.",
});
console.log(JSON.stringify({
  reply: result.reply,
  runtimeErrors: result.events
    .filter((event) => event.type === "RuntimeError")
    .map((event) => event.payload),
  toolRequests: result.events.filter((event) => event.type === "ToolRequested").length,
  toolResults: result.events.filter((event) => event.type === "ToolExecutionSucceeded").length,
  metrics: result.metrics,
}));
