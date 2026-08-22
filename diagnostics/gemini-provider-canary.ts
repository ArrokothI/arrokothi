import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ModelProviderError,
  ToolRegistry,
  createDeterministicIds,
  createFixedClock,
  defineAgent,
  parseTurnPlan,
  turnPlanSchema,
  validateObject,
  type ObjectSchema,
} from "@agent-sdk/core";
import { GeminiProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";

type CheckStatus = "passed" | "failed";

interface CheckResult {
  name: string;
  status: CheckStatus;
  durationMs: number;
  requestedModel: string;
  providerReportedModel?: string;
  failureCategory?: string;
  message?: string;
  detail?: Record<string, unknown>;
}

class CanaryFailure extends Error {
  readonly category: string;

  constructor(category: string, message: string) {
    super(message);
    this.name = "CanaryFailure";
    this.category = category;
  }
}

const requestedModel = process.env["GEMINI_MODEL"] ?? "gemini-3.5-flash-lite";
const apiKey = geminiApiKeyFromEnv();
const timestamp = new Date().toISOString();

if (!apiKey) {
  console.log(JSON.stringify({
    status: "skipped",
    failureCategory: "missing_credentials",
    message: "No Gemini API key found. Set GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.",
    requestedModel,
    timestamp,
    checks: [],
  }, null, 2));
  process.exit(0);
}

const provider = new GeminiProvider({ apiKey, model: requestedModel, maxRetries: 0 });
const checks: CheckResult[] = [];

await runCheck("structured_output_nested_object_map", async () => {
  const schema: ObjectSchema = {
    kind: "object",
    fields: {
      item: {
        required: true,
        schema: {
          kind: "object",
          additionalProperties: true,
          fields: {
            id: { required: true, schema: { kind: "string" } },
            metrics: {
              required: true,
              schema: {
                kind: "object",
                additionalProperties: true,
                fields: {
                  score: { required: true, schema: { kind: "number" } },
                  flags: { required: true, schema: { kind: "object", additionalProperties: true, fields: {} } },
                },
              },
            },
          },
        },
      },
    },
  };
  const response = await provider.generate({
    system: "Return only JSON matching the requested schema.",
    messages: [{
      role: "user",
      content: "Return item.id canary-1, item.metrics.score 3, and item.metrics.flags.alpha true.",
    }],
    responseSchema: schema,
    model: requestedModel,
    temperature: 0,
    maxOutputTokens: 512,
    purpose: "canary:structured_output",
  });
  const validation = validateObject(schema, response.json, { coerce: false });
  if (!validation.ok) {
    throw new CanaryFailure("model_output_validation", "structured output did not validate against the nested object/map schema");
  }
  return { providerReportedModel: response.model };
});

await runCheck("record_filter_comparand_projection", async () => {
  const response = await provider.generate({
    system: "Return only JSON matching the requested turn-plan schema.",
    messages: [{
      role: "user",
      content: [
        "Return one record_query retrieval request for source_id synthetic_records.",
        "Use filters: active eq true, threshold gte 42, and tag in [\"alpha\",\"beta\"].",
        "The filter value field is JSON text on the provider wire when needed.",
      ].join(" "),
    }],
    responseSchema: turnPlanSchema(3),
    model: requestedModel,
    temperature: 0,
    maxOutputTokens: 512,
    purpose: "canary:record_filter_projection",
  });
  const parsed = parseTurnPlan(response.json, 3);
  if (!parsed.ok) throw new CanaryFailure("model_output_validation", `turn plan rejected after Gemini normalization: ${parsed.message}`);
  const request = parsed.plan.retrievalRequests.find((candidate) => candidate.kind === "record_query");
  if (!request) throw new CanaryFailure("model_output_validation", "Gemini did not return a record_query retrieval request");
  const filters = request.filters ?? [];
  if (!filters.some((filter) => filter.field === "active" && filter.op === "eq" && filter.value === true)) {
    throw new CanaryFailure("model_output_validation", "boolean record-filter value did not normalize to core-compatible true");
  }
  if (!filters.some((filter) => filter.field === "threshold" && filter.op === "gte" && filter.value === 42)) {
    throw new CanaryFailure("model_output_validation", "number record-filter value did not normalize to core-compatible 42");
  }
  if (!filters.some((filter) => filter.field === "tag" && filter.op === "in" && Array.isArray(filter.value) && filter.value.join(",") === "alpha,beta")) {
    throw new CanaryFailure("model_output_validation", "array record-filter value did not normalize to core-compatible primitives");
  }
  return { providerReportedModel: response.model };
});

await runCheck("function_call", async () => {
  const response = await provider.generate({
    system: "Call the provided function exactly once. Do not answer directly.",
    messages: [{ role: "user", content: "Call lookup_canary with key alpha." }],
    tools: [{
      name: "lookup_canary",
      description: "Return a synthetic canary value.",
      input: {
        kind: "object",
        fields: {
          key: { required: true, schema: { kind: "enum", choices: ["alpha"] } },
        },
      },
    }],
    model: requestedModel,
    temperature: 0,
    maxOutputTokens: 512,
    purpose: "canary:function_call",
  });
  const call = response.toolCalls?.[0];
  if (!call || call.name !== "lookup_canary" || call.args["key"] !== "alpha") {
    throw new CanaryFailure("model_output_validation", "Gemini did not return the expected lookup_canary function call");
  }
  return { providerReportedModel: response.model };
});

await runCheck("tool_observation_continuation", async () => {
  const response = await provider.generate({
    system: "Answer from the supplied tool observation. Include the number 17.",
    messages: [
      { role: "user", content: "Use the lookup_canary result." },
      { role: "tool", toolName: "lookup_canary", content: JSON.stringify({ key: "alpha", value: 17 }) },
    ],
    model: requestedModel,
    temperature: 0,
    maxOutputTokens: 512,
    purpose: "canary:tool_observation",
  });
  if (!response.text || !/\b17\b/.test(response.text)) {
    throw new CanaryFailure("model_output_validation", "Gemini did not continue from the tool observation with the expected value");
  }
  return { providerReportedModel: response.model };
});

await runCheck("workflow_structured_record_query_planning", async () => {
  const definition = defineAgent({
    id: "gemini-workflow-canary",
    name: "Gemini Workflow Canary",
    goal: "Use deterministic synthetic record evidence to answer inventory questions.",
    model: { providerId: "gemini", model: requestedModel, temperature: 0 },
    planning: { mode: "llm", extractWorkingNotes: false },
    globalRules: ["Use runtime record query results when exact synthetic inventory filters are needed."],
    memorySchema: { fields: [] },
    hostContextSchema: { fields: [] },
    knowledge: [{
      source: {
        id: "synthetic_records",
        kind: "record_set",
        title: "Synthetic records",
        description: "Neutral synthetic records for provider canary checks.",
        fields: {
          item_code: { schema: { kind: "string" }, description: "Synthetic item code.", examples: ["A-1"] },
          active: { schema: { kind: "boolean" }, description: "Whether the item is active.", examples: [true] },
          threshold: { schema: { kind: "number" }, description: "Synthetic threshold score.", examples: [42] },
        },
        records: [
          { item_code: "A-1", active: true, threshold: 42 },
          { item_code: "B-2", active: false, threshold: 7 },
        ],
      },
    }],
    tools: [],
    policies: { maxSteps: 2, maxRetrievalRequests: 2, maxKnowledgeCallsPerTurn: 2, maxToolCallsPerTurn: 0 },
  });
  const runtime = new AgentRuntime({
    definition,
    sessions: new InMemorySessionStore(),
    model: provider,
    planningModel: provider,
    tools: new ToolRegistry(),
    knowledge: new KnowledgeIndex(definition.knowledge),
    harness: new AgentHarness({ strategy: "workflow" }),
    ids: createDeterministicIds(),
    clock: createFixedClock(),
  });
  const sessionId = await runtime.createSession("gemini-workflow-canary");
  const result = await runtime.runTurn({
    sessionId,
    message: "Use a record query to find active synthetic records with threshold at least 40.",
  });
  const planCall = result.events.find((event) => event.type === "ModelCallCompleted" && event.payload.purpose === "plan");
  if (!planCall || planCall.type !== "ModelCallCompleted") {
    throw new CanaryFailure("workflow_structured_output", "workflow did not execute the structured-output planning model call");
  }
  const planningError = result.events.find((event) =>
    event.type === "RuntimeError"
    && ["planning_failed", "invalid_turn_plan"].includes(event.payload.code),
  );
  if (planningError?.type === "RuntimeError") {
    throw new CanaryFailure("workflow_structured_output", `workflow planning failed: ${planningError.payload.code}: ${planningError.payload.message}`);
  }
  const planContext = result.contexts.find((entry) => entry.purpose === "plan");
  if (!planContext || !/synthetic_records/.test(planContext.context.system)) {
    throw new CanaryFailure("workflow_structured_output", "workflow planner context did not include the record-query catalog");
  }
  const recordQuery = result.events.find((event) => event.type === "KnowledgeRetrieved" && event.payload.request.kind === "record_query");
  if (!recordQuery) {
    throw new CanaryFailure("workflow_structured_output", "workflow did not execute a planned record_query retrieval");
  }
  return {
    providerReportedModel: planCall.payload.model,
    detail: {
      stopReason: result.stopReason,
      runtimeErrors: result.events.filter((event) => event.type === "RuntimeError").length,
      knowledgeExecutions: result.events.filter((event) => event.type === "KnowledgeRetrieved").length,
    },
  };
});

const failed = checks.filter((check) => check.status === "failed");
console.log(JSON.stringify({
  status: failed.length ? "failed" : "passed",
  requestedModel,
  providerReportedModels: [...new Set(checks.map((check) => check.providerReportedModel).filter((model): model is string => !!model))],
  timestamp,
  checks,
}, null, 2));
if (failed.length) process.exitCode = 1;

async function runCheck(
  name: string,
  fn: () => Promise<Pick<CheckResult, "providerReportedModel" | "detail">>,
): Promise<void> {
  const started = Date.now();
  try {
    const result = await fn();
    checks.push({
      name,
      status: "passed",
      durationMs: Date.now() - started,
      requestedModel,
      providerReportedModel: result.providerReportedModel,
      detail: result.detail,
    });
  } catch (error) {
    checks.push({
      name,
      status: "failed",
      durationMs: Date.now() - started,
      requestedModel,
      failureCategory: classifyFailure(error),
      message: sanitizeError(error),
    });
  }
}

function classifyFailure(error: unknown): string {
  if (error instanceof CanaryFailure) return error.category;
  if (error instanceof ModelProviderError) {
    if (error.code === "PROVIDER_AUTH_FAILED") return "provider_auth";
    if (error.code === "HTTP_429_RATE_LIMIT") return "provider_rate_limit";
    if (/INVALID_ARGUMENT|PROVIDER_HTTP_400/i.test(`${error.code} ${error.message}`)) return "provider_schema_compatibility";
    if (/NETWORK|TIMEOUT|DNS|CANCELLED/.test(error.code)) return "provider_transport";
    return "provider_failure";
  }
  return "unexpected_failure";
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(apiKey ?? "", "[redacted]").slice(0, 300);
}
