import { GeminiProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const requestedModel = "gemini-3.5-flash-lite";
const apiKey = geminiApiKeyFromEnv();
if (!apiKey) throw new Error("A Gemini API key is required for the paid-project canary");

const startedAt = new Date().toISOString();
const response = await new GeminiProvider({ apiKey, model: requestedModel, maxRetries: 0 }).generate({
  messages: [{ role: "user", content: "Reply with exactly: canary-ok" }],
  model: requestedModel,
  temperature: 0,
  maxOutputTokens: 16,
  purpose: "v2-six-subject-run-1:paid-project-model-canary",
});
const completedAt = new Date().toISOString();
const providerReportedModel = response.model;
const status = providerReportedModel === requestedModel ? "passed" : "failed";

const result = {
  status,
  requestedModel,
  providerReportedModel,
  usage: response.usage,
  startedAt,
  completedAt,
  apiModelCallCount: 1,
};
const rendered = `${JSON.stringify(result, null, 2)}\n`;
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
if (outputArg) {
  const output = resolve(outputArg);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, rendered, "utf8");
}
console.log(rendered.trimEnd());

if (status !== "passed") process.exitCode = 2;
