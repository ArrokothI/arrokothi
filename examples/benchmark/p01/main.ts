import type { ModelProvider } from "@arrokothi/core";
import { validateDefinition } from "@arrokothi/core";
import { createGeminiProviderFromEnv } from "@arrokothi/provider-gemini";
import { createP01Definition } from "./agent.ts";
import { parseP01CliRequest } from "./protocol.ts";
import { createP01Subject, runP01Batch } from "./subject.ts";

const startupCheckModel: ModelProvider = {
  id: "startup-check",
  async generate() {
    throw new Error("startup check does not invoke the model");
  },
};

if (process.argv.includes("--check")) {
  const definition = createP01Definition();
  const subject = createP01Subject({ definition, model: startupCheckModel });
  console.log(JSON.stringify({
    ok: true,
    subject: "p01",
    agentId: definition.id,
    model: definition.model,
    tools: definition.tools.map((binding) => binding.definition),
    missingExecutors: subject.tools.missingExecutors(),
    issues: validateDefinition(definition),
  }, null, 2));
} else {
  try {
    const raw = await readStdin();
    if (!raw.trim()) throw new Error("P01 expects one JSON request on stdin. Use --check for startup validation.");
    const request = parseP01CliRequest(JSON.parse(raw) as unknown);
    const definition = createP01Definition({
      model: request.generation?.model ?? process.env["GEMINI_MODEL"],
      temperature: request.generation?.temperature,
      maxOutputTokens: request.generation?.maxOutputTokens,
    });
    const model = createGeminiProviderFromEnv({ model: definition.model.model });
    const subject = createP01Subject({ definition, model });
    const result = await runP01Batch(subject, request.turns, request.sessionId);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      subject: "p01",
      error: error instanceof Error ? error.message : String(error),
    }));
    process.exitCode = 1;
  }
}

async function readStdin(): Promise<string> {
  process.stdin.setEncoding("utf8");
  const chunks: string[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return chunks.join("");
}
