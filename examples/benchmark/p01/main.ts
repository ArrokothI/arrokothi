/**
 * Executable entrypoint for the P01 benchmark subject.
 *
 *   node --experimental-strip-types examples/benchmark/p01/main.ts --check
 *   printf '%s' '{"protocolVersion":"1","turns":[{"message":"..."}]}' \
 *     | node --experimental-strip-types examples/benchmark/p01/main.ts
 *
 * stdout carries exactly one JSON object. All diagnostics go to stderr so the response stays
 * parseable. Live execution needs GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment.
 */

import { validateDefinition } from "@arrokothi/core/execution";
import { createGeminiModelProviderFromEnv } from "@arrokothi/provider-gemini";
import { createP01AgentDefinition } from "./agent.ts";
import { createP01App } from "./app.ts";
import { formatP01Response, parseP01CliRequest } from "./protocol.ts";
import { runP01Session } from "./subject.ts";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

async function readStdin(): Promise<string> {
  process.stdin.setEncoding("utf8");
  const chunks: string[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return chunks.join("");
}

if (process.argv.includes("--check")) {
  const definition = createP01AgentDefinition();
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        subject: "p01",
        agentId: definition.id,
        model: definition.spec.model,
        operations: definition.spec.operations?.refs ?? [],
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
      throw new Error("P01 expects one JSON request on stdin. Use --check for startup validation.");
    }
    const request = parseP01CliRequest(JSON.parse(raw) as unknown);
    const modelName = request.generation?.model ?? process.env["GEMINI_MODEL"] ?? DEFAULT_MODEL;
    const provider = createGeminiModelProviderFromEnv({
      id: "gemini",
      ...(request.generation?.temperature !== undefined
        ? { temperature: request.generation.temperature }
        : {}),
      ...(request.generation?.maxOutputTokens !== undefined
        ? { maxOutputTokens: request.generation.maxOutputTokens }
        : {}),
    });
    const app = createP01App({ model: provider, providerId: "gemini", modelName });
    const result = await runP01Session(app, request.turns, request.sessionId ?? "p01-session");
    process.stdout.write(JSON.stringify(formatP01Response(result)) + "\n");
  } catch (error) {
    process.stderr.write(
      `P01 failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
    process.stdout.write(
      JSON.stringify({
        protocolVersion: "1",
        subject: "p01",
        error: error instanceof Error ? error.message : String(error),
      }) + "\n",
    );
    process.exitCode = 1;
  }
}
