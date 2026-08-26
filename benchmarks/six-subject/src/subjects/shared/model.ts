import type { ModelPolicy } from "@agent-sdk/core";
import { geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";

export const BENCHMARK_TEMPERATURE = 0.35;
export const BENCHMARK_MAX_OUTPUT_TOKENS = 700;

export interface LiveModelEnvironment {
  apiKey: string;
  requestedModel: string;
  policy: ModelPolicy;
  thinking: null;
}

/** Live benchmark subjects require an explicit model; there is no silent model fallback. */
export function liveModelEnvironment(
  env: Record<string, string | undefined> = process.env,
): LiveModelEnvironment {
  const apiKey = geminiApiKeyFromEnv(env)?.trim();
  const requestedModel = env["GEMINI_MODEL"]?.trim();
  if (!apiKey) throw new Error("the six-subject benchmark requires GEMINI_API_KEY");
  if (!requestedModel) throw new Error("the six-subject benchmark requires GEMINI_MODEL; model fallback is disabled");
  return {
    apiKey,
    requestedModel,
    policy: {
      providerId: "gemini",
      model: requestedModel,
      temperature: BENCHMARK_TEMPERATURE,
      maxOutputTokens: BENCHMARK_MAX_OUTPUT_TOKENS,
    },
    thinking: null,
  };
}
