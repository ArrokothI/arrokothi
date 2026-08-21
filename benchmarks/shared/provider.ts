import type { ModelProvider } from "@agent-sdk/core";
import { StaticModelProvider } from "@agent-sdk/core/testing";
import { GeminiProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import type { BenchmarkRun } from "./types.ts";

/**
 * Provider selection for a benchmark run.
 *
 * The `live` path requires a real key and refuses to silently degrade. The `harness_selfcheck` path
 * uses a provider that answers nothing useful ON PURPOSE - it exists to prove the adapter plumbing
 * works, and its results are written with a disclaimer rather than presented as a measurement.
 */

export interface ProviderChoice {
  make: () => ModelProvider;
  mode: BenchmarkRun["mode"];
  label: string;
  paceMs: number;
}

export function chooseProvider(argv: string[]): ProviderChoice {
  const wantsLive = argv.includes("--live");
  const modelArg = argv.find((a) => a.startsWith("--model="))?.split("=")[1];
  const paceArg = argv.find((a) => a.startsWith("--pace="))?.split("=")[1];

  if (!wantsLive) {
    return {
      make: () => new StaticModelProvider("[harness self-check] no model was consulted for this reply"),
      mode: "harness_selfcheck",
      label: "harness self-check (no model consulted)",
      paceMs: 0,
    };
  }

  const apiKey = geminiApiKeyFromEnv();
  if (!apiKey) {
    // Refusing beats quietly producing a "live" result that no model actually answered.
    throw new Error(
      "--live requires a Gemini API key. Set GEMINI_API_KEY in this shell (the benchmark reads it at the app boundary; core never does).",
    );
  }

  const model = modelArg ?? "gemini-3.5-flash-lite";
  // Pacing is applied BETWEEN TURNS, but the two-pass harness issues at least two model calls per
  // turn back-to-back (plan + respond), plus one more per tool round trip - roughly 2.3 calls
  // per turn in practice. To stay under the protocol's conservative ~10 successful-calls/minute
  // ceiling, the gap must be sized per TURN, not per call: 15s x ~2.3 calls is about 9 calls/min.
  // A 7s gap would be ~20/min and would start drawing 429s.
  const paceMs = paceArg ? Number(paceArg) : 15_000;

  return {
    make: () => new GeminiProvider({ apiKey, model, maxRetries: 2 }),
    mode: "live",
    label: `live: gemini / ${model}`,
    paceMs,
  };
}

export function describeUsage(script: string): string {
  return [
    `usage: node ${script} [--live] [--model=<id>] [--pace=<ms>]`,
    "",
    "  (default)   harness self-check. Exercises the adapter with no model. NOT a measurement.",
    "  --live      run every turn against a real provider. Requires GEMINI_API_KEY.",
    "  --model=    override the model id (default gemini-3.5-flash-lite).",
    "  --pace=     milliseconds between TURNS (default 15000 on --live; each turn is ~2.3 model calls).",
  ].join("\n");
}
