/**
 * Executable entrypoint for the P02 benchmark subject.
 *
 *   node --experimental-strip-types examples/benchmark/p02/main.ts --check
 *   printf '%s' '{"protocolVersion":"1","turns":[{"message":"..."}]}' \
 *     | node --experimental-strip-types examples/benchmark/p02/main.ts
 *
 * stdout carries exactly one JSON object. All diagnostics go to stderr so the response stays
 * parseable. Live execution needs GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment. The lead
 * handoff is a dry-run fake in every mode — no real message is sent and no credential is used.
 */

import { validateDefinition } from "@arrokothi/core/execution";
import { createGeminiModelProviderFromEnv } from "@arrokothi/provider-gemini";
import { P02_OPERATIONS, createP02AgentDefinition } from "./agent.ts";
import { createP02App } from "./app.ts";
import { benchmarkRpmFromEnv, createPacedFetch } from "./pace.ts";
import { formatP02Response, parseP02CliRequest } from "./protocol.ts";
import { runP02Session } from "./subject.ts";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

async function readStdin(): Promise<string> {
  process.stdin.setEncoding("utf8");
  const chunks: string[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return chunks.join("");
}

if (process.argv.includes("--check")) {
  const definition = createP02AgentDefinition();
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        subject: "p02",
        agentId: definition.id,
        model: definition.spec.model,
        limits: definition.spec.limits ?? {},
        operations: P02_OPERATIONS,
        memoryKeys: {
          read: definition.spec.structuredMemory?.read?.keys ?? [],
          write: definition.spec.structuredMemory?.write?.keys ?? [],
        },
        issues: validateDefinition(definition),
      },
      null,
      2,
    ) + "\n",
  );
} else {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      throw new Error("P02 expects one JSON request on stdin. Use --check for startup validation.");
    }
    const request = parseP02CliRequest(JSON.parse(raw) as unknown);
    const modelName = request.generation?.model ?? process.env["GEMINI_MODEL"] ?? DEFAULT_MODEL;
    // Benchmark deployment plumbing: when the runner supplies an RPM budget, pace every outgoing
    // Gemini HTTP request (retries included) and hand retry responsibility to the outer runner,
    // which already has bounded retry, backoff, and resumable checkpointing. No effect on request
    // content, responses, prompts, or any application decision. Unset outside the benchmark.
    const benchmarkRpm = benchmarkRpmFromEnv();
    const provider = createGeminiModelProviderFromEnv({
      id: "gemini",
      ...(benchmarkRpm > 0
        ? { fetchImpl: createPacedFetch({ rpm: benchmarkRpm }), maxRetries: 0 }
        : {}),
      ...(request.generation?.temperature !== undefined
        ? { temperature: request.generation.temperature }
        : {}),
      ...(request.generation?.maxOutputTokens !== undefined
        ? { maxOutputTokens: request.generation.maxOutputTokens }
        : {}),
    });
    const app = createP02App({ model: provider, providerId: "gemini", modelName });
    const result = await runP02Session(app, request.turns, request.sessionId ?? "p02-session");
    process.stdout.write(JSON.stringify(formatP02Response(result)) + "\n");
  } catch (error) {
    process.stderr.write(
      `P02 failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
    process.stdout.write(
      JSON.stringify({
        protocolVersion: "1",
        subject: "p02",
        error: error instanceof Error ? error.message : String(error),
      }) + "\n",
    );
    process.exitCode = 1;
  }
}
