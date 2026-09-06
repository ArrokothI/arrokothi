/** Optional live canary for the resolver/provider boundary. Never part of the CI suite. */

import { ModelInvocationError, type ModelProviderRequest, type ModelRequirements } from "@arrokothi/core/ports";
import { StaticModelResolver, portableModelFeatures } from "@arrokothi/core/reference";
import { GeminiModelProvider, geminiApiKeyFromEnv } from "@arrokothi/provider-gemini";

type CheckStatus = "passed" | "failed";

interface CheckResult {
  name: string;
  status: CheckStatus;
  durationMs: number;
  requestedModel: string;
  providerReportedModel?: string;
  failureCategory?: string;
  message?: string;
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

const resolver = new StaticModelResolver({
  primary: {
    provider: "gemini",
    model: requestedModel,
    portableFeatures: portableModelFeatures({
      capabilityCalls: true,
      structuredOutput: true,
      cancellation: true,
      usageMetadata: true,
    }),
  },
});
const provider = new GeminiModelProvider({ apiKey, maxRetries: 0 });
const checks: CheckResult[] = [];

async function invoke(
  requirements: ModelRequirements,
  request: Omit<ModelProviderRequest, "model" | "requirements">,
) {
  const model = await resolver.resolve({ logicalRef: "primary", requirements });
  return provider.generate({ ...request, model, requirements });
}

await runCheck("text_generation", async () => {
  const response = await invoke({ text: true, usageMetadata: "required" }, {
    system: "Answer with exactly: canary-ok",
    messages: [{ role: "user", content: "Run the text canary." }],
  });
  if (!response.output.text || !/canary-ok/i.test(response.output.text)) {
    throw new CanaryFailure("model_output_validation", "Gemini did not return the expected text marker");
  }
  return response.metadata.model;
});

await runCheck("structured_output_nested_object", async () => {
  const response = await invoke({ text: true, structuredOutput: "required" }, {
    system: "Return only JSON matching the requested schema.",
    messages: [{ role: "user", content: "Return item.id canary-1 and item.metrics.score 3." }],
    structuredOutput: {
      schema: {
        kind: "object",
        fields: {
          item: {
            required: true,
            schema: {
              kind: "object",
              fields: {
                id: { required: true, schema: { kind: "string" } },
                metrics: {
                  required: true,
                  schema: {
                    kind: "object",
                    fields: { score: { required: true, schema: { kind: "number" } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const item = response.output.structured?.["item"] as Record<string, unknown> | undefined;
  const metrics = item?.["metrics"] as Record<string, unknown> | undefined;
  if (item?.["id"] !== "canary-1" || metrics?.["score"] !== 3) {
    throw new CanaryFailure("model_output_validation", "structured output did not preserve the expected nested values");
  }
  return response.metadata.model;
});

await runCheck("capability_call", async () => {
  const response = await invoke({ text: true, capabilityCalls: "required" }, {
    system: "Request the provided capability exactly once. Do not answer directly.",
    messages: [{ role: "user", content: "Request lookup_canary with key alpha." }],
    capabilities: [{
      name: "lookup_canary",
      description: "Return a synthetic canary value.",
      input: {
        kind: "object",
        fields: { key: { required: true, schema: { kind: "enum", choices: ["alpha"] } } },
      },
    }],
  });
  const call = response.output.capabilityCalls?.[0];
  if (!call || call.capability !== "lookup_canary" || call.input["key"] !== "alpha") {
    throw new CanaryFailure("model_output_validation", "Gemini did not return the expected capability-call data");
  }
  return response.metadata.model;
});

await runCheck("capability_observation_continuation", async () => {
  const response = await invoke({ text: true }, {
    system: "Answer from the supplied capability observation. Include the number 17.",
    messages: [
      { role: "user", content: "Use the lookup_canary result." },
      { role: "capability", capability: "lookup_canary", content: JSON.stringify({ key: "alpha", value: 17 }) },
    ],
  });
  if (!response.output.text || !/\b17\b/.test(response.output.text)) {
    throw new CanaryFailure("model_output_validation", "Gemini did not continue from the capability observation");
  }
  return response.metadata.model;
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

async function runCheck(name: string, fn: () => Promise<string>): Promise<void> {
  const started = Date.now();
  try {
    const providerReportedModel = await fn();
    checks.push({ name, status: "passed", durationMs: Date.now() - started, requestedModel, providerReportedModel });
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
  if (error instanceof ModelInvocationError) return `provider_${error.code}`;
  return "unexpected_failure";
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(apiKey ?? "", "[redacted]").slice(0, 300);
}
