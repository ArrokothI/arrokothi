import type { ModelProvider } from "@agent-sdk/core";
import { validateDefinition } from "@agent-sdk/core";
import { createGeminiProviderFromEnv } from "@agent-sdk/provider-gemini";
import { createP02Definition } from "./agent.ts";
import { parseP02CliRequest } from "./protocol.ts";
import { createP02Subject, runP02Batch } from "./subject.ts";

const startupCheckModel: ModelProvider = {
  id: "startup-check",
  async generate() {
    throw new Error("startup check does not invoke the model");
  },
};

if (process.argv.includes("--check")) {
  const definition = createP02Definition();
  const subject = createP02Subject({ definition, model: startupCheckModel });
  console.log(JSON.stringify({
    ok: true,
    subject: "p02",
    agentId: definition.id,
    model: definition.model,
    tools: ["query_properties", "send_email"].map((name) => subject.tools.getDefinition(name)),
    missingExecutors: subject.tools.missingExecutors(),
    knowledgeSources: definition.knowledge.map((binding) => ({
      id: binding.source.id,
      kind: binding.source.kind,
      title: binding.source.title,
    })),
    issues: validateDefinition(definition),
  }, null, 2));
} else {
  try {
    const raw = await readStdin();
    if (!raw.trim()) throw new Error("P02 expects one JSON request on stdin. Use --check for startup validation.");
    const request = parseP02CliRequest(JSON.parse(raw) as unknown);
    const definition = createP02Definition({
      model: request.generation?.model ?? process.env["GEMINI_MODEL"],
      temperature: request.generation?.temperature,
      maxOutputTokens: request.generation?.maxOutputTokens,
    });
    const model = createGeminiProviderFromEnv({ model: definition.model.model });
    const subject = createP02Subject({ definition, model });
    const result = await runP02Batch(subject, request.turns, request.sessionId);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      subject: "p02",
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
