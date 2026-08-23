import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { P01_SCENARIOS } from "../scenario-v2/p01/scenarios.ts";
import { P02_SCENARIOS } from "../scenario-v2/p02/scenarios.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../..");
const RESULT_ROOT = path.join(REPO_ROOT, "benchmarks/results/v2-six-subject-run-1");
const RAW_DIR = path.join(RESULT_ROOT, "raw");
const OUT_ROOT = path.join(RESULT_ROOT, "conversation-review/arrokothai");

interface ConversationTurn {
  turn: number;
  user: string;
  assistant: string;
}

interface RawRun {
  applicationId: string;
  implementationId: string;
  scenarioId: string;
  repeatId: string;
  conversation: ConversationTurn[];
  modelCallCount?: number;
  tokenUsage?: {
    available?: boolean;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  stopReason?: string;
  runtimeErrors?: unknown[];
}

const scenarios = [...P01_SCENARIOS, ...P02_SCENARIOS];
const scenarioById = new Map(scenarios.map((scenario) => [scenario.id, scenario]));

function blockquote(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function renderRun(run: RawRun): string {
  const lines: string[] = [];
  lines.push(`## Repeat ${run.repeatId}`);
  lines.push("");
  lines.push(`- Model calls: ${run.modelCallCount ?? "unknown"}`);
  if (run.tokenUsage?.available) {
    lines.push(`- Input tokens: ${run.tokenUsage.inputTokens ?? "unknown"}`);
    lines.push(`- Output tokens: ${run.tokenUsage.outputTokens ?? "unknown"}`);
    lines.push(`- Total tokens: ${run.tokenUsage.totalTokens ?? "unknown"}`);
  } else {
    lines.push("- Token usage: unavailable");
  }
  lines.push(`- Stop reason: ${run.stopReason ?? "unknown"}`);
  lines.push(`- Runtime errors: ${run.runtimeErrors?.length ?? 0}`);
  lines.push("");

  for (const turn of run.conversation) {
    lines.push(`### Turn ${turn.turn}`);
    lines.push("");
    lines.push("**User**");
    lines.push("");
    lines.push(blockquote(turn.user));
    lines.push("");
    lines.push("**Arrokothai**");
    lines.push("");
    lines.push(blockquote(turn.assistant));
    lines.push("");
  }

  return lines.join("\n");
}

function renderScenario(scenarioId: string, runs: RawRun[]): string {
  const scenario = scenarioById.get(scenarioId);
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);

  const lines: string[] = [];
  lines.push(`# ${scenario.id} — ${scenario.title}`);
  lines.push("");
  lines.push(`**Application:** ${scenario.applicationId.toUpperCase()}`);
  lines.push("");
  lines.push(`**Purpose:** ${scenario.purpose}`);
  lines.push("");
  lines.push(`**Requirement IDs:** ${scenario.requirementIds.join(", ")}`);
  lines.push("");
  if (scenario.applicability) {
    lines.push(`**Applicability:** ${scenario.applicability}`);
    lines.push("");
  }
  lines.push("## Frozen scenario turns");
  lines.push("");
  for (let i = 0; i < scenario.turns.length; i += 1) {
    lines.push(`**User ${i + 1}:** ${scenario.turns[i]!.content}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(runs.sort((a, b) => a.repeatId.localeCompare(b.repeatId)).map(renderRun).join("\n---\n\n"));
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("Derived review view generated from frozen raw benchmark artifacts. The source of truth remains `../../raw/`. This file is for manual inspection only and is not part of benchmark scoring or frozen evaluator inputs.");
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const filenames = await readdir(RAW_DIR);
  const arrokFiles = filenames
    .filter((name) => name.endsWith(".json") && name.includes("-arrokothai-"))
    .sort();

  const grouped = new Map<string, RawRun[]>();
  for (const filename of arrokFiles) {
    const raw = JSON.parse(await readFile(path.join(RAW_DIR, filename), "utf8")) as RawRun;
    if (raw.implementationId !== "p01-arrokothai" && raw.implementationId !== "p02-arrokothai") continue;
    const bucket = grouped.get(raw.scenarioId) ?? [];
    bucket.push(raw);
    grouped.set(raw.scenarioId, bucket);
  }

  await mkdir(OUT_ROOT, { recursive: true });
  await mkdir(path.join(OUT_ROOT, "p01"), { recursive: true });
  await mkdir(path.join(OUT_ROOT, "p02"), { recursive: true });

  const index: string[] = [
    "# Arrokothai conversation review",
    "",
    "Human-readable, Arrokothai-only views derived from the frozen P01/P02 raw benchmark corpus.",
    "",
    "Inspect one scenario at a time. Each scenario file contains every repeat for that scenario, with the exact frozen user/assistant transcript plus call/token metadata where available.",
    "",
    "These files are **derived inspection artifacts only**. Benchmark truth remains in `../../raw/` and the frozen analysis artifacts.",
    "",
    "## P01",
    "",
  ];

  for (const scenario of P01_SCENARIOS) {
    const runs = grouped.get(scenario.id);
    if (!runs?.length) throw new Error(`No Arrokothai raw runs found for ${scenario.id}`);
    const relative = `p01/${scenario.id}.md`;
    await writeFile(path.join(OUT_ROOT, relative), renderScenario(scenario.id, runs), "utf8");
    index.push(`- [${scenario.id} — ${scenario.title}](${relative}) — ${runs.length} repeat(s)`);
  }

  index.push("", "## P02", "");
  for (const scenario of P02_SCENARIOS) {
    const runs = grouped.get(scenario.id);
    if (!runs?.length) throw new Error(`No Arrokothai raw runs found for ${scenario.id}`);
    const relative = `p02/${scenario.id}.md`;
    await writeFile(path.join(OUT_ROOT, relative), renderScenario(scenario.id, runs), "utf8");
    index.push(`- [${scenario.id} — ${scenario.title}](${relative}) — ${runs.length} repeat(s)`);
  }

  index.push("", `Generated ${grouped.size} scenario review files from ${arrokFiles.length} Arrokothai raw runs.`, "");
  await writeFile(path.join(OUT_ROOT, "README.md"), index.join("\n"), "utf8");

  console.log(`Wrote ${grouped.size} scenario review files to ${path.relative(REPO_ROOT, OUT_ROOT)}`);
}

await main();
