import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { NeutralRawRunV2, PairwiseCriterion } from "./evaluator/index.ts";
import { P01_REQUIREMENTS, P01_SCENARIOS, P02_REQUIREMENTS, P02_SCENARIOS, type ScenarioV2 } from "./scenarios/index.ts";

export const ROOT = resolve(import.meta.dirname, "../../..");
export const AGENT_ROOT = ROOT;
export const AGENERATEOR_ROOT = resolve(ROOT, "../Agenerateor");
export const CRAIG_ROOT = resolve(ROOT, "../Craig-Hempcrete-DemoSitee");
export const ESTATE_ROOT = resolve(ROOT, "../EstatePro");
export const SUBJECT_MODEL = "gemini-3.5-flash-lite";
export const JUDGE_MODEL = "gemini-3.5-flash";
export const EXPERIMENT_ID = "v2-six-subject-run-1";
export const OUTPUT = resolve(process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ?? `benchmarks/runs/${EXPERIMENT_ID}`);
export const requirements = new Map([...P01_REQUIREMENTS, ...P02_REQUIREMENTS].map((item) => [item.id, item]));
export const scenarios = [...P01_SCENARIOS, ...P02_SCENARIOS];
export const implementations = {
  p01: ["p01-original", "p01-agenerateor", "p01-arrokothai"],
  p02: ["p02-original", "p02-agenerateor", "p02-arrokothai"],
} as const;
export const consequential = new Set(["P02-V2-S08", "P02-V2-S13", "P02-V2-S14", "P02-V2-S15", "P02-V2-S16", "P02-V2-S17"]);

export interface ExpectedUnit {
  id: string;
  scenario: ScenarioV2;
  implementationId: string;
  repeatId: string;
  rawPath: string;
}

export function expectedUnits(): ExpectedUnit[] {
  const units: ExpectedUnit[] = [];
  for (const scenario of scenarios) {
    const repeats = consequential.has(scenario.id) ? 5 : 3;
    for (const implementationId of implementations[scenario.applicationId]) {
      for (let repeat = 1; repeat <= repeats; repeat++) {
        const repeatId = `r${String(repeat).padStart(2, "0")}`;
        const id = `${scenario.id}-${implementationId}-${repeatId}`;
        units.push({ id, scenario, implementationId, repeatId, rawPath: pathFor("raw", id) });
      }
    }
  }
  return units;
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJson<T>(path: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(path, "utf8")) as T; } catch { return undefined; }
}

export function safe(value: string) { return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_"); }
export function runKey(run: NeutralRawRunV2) { return `${run.scenarioId}:${run.repeatId}:${run.implementationId ?? ""}`; }
export function pathFor(layer: string, id: string) { return join(OUTPUT, layer, `${safe(id)}.json`); }
export function gitCommit(repo: string) { return execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); }
export function gitCommitTimestamp(repo: string) { return execFileSync("git", ["-C", repo, "show", "-s", "--format=%cI", "HEAD"], { encoding: "utf8" }).trim(); }

export async function treeHash(path: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(current: string) {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const next = join(current, entry.name);
      if (entry.isDirectory()) await visit(next);
      else { hash.update(next.slice(path.length)); hash.update(await readFile(next)); }
    }
  }
  await visit(path);
  return hash.digest("hex");
}

export function criteriaFor(scenario: ScenarioV2): PairwiseCriterion[] {
  const criteria: PairwiseCriterion[] = ["correctness"];
  if (scenario.requirementIds.some((id) => requirements.get(id)?.type === "grounding")) criteria.push("grounding");
  if (scenario.turns.length > 1 && /correction|actually|instead|forget|remeasured/i.test(scenario.turns.map((turn) => turn.content).join(" "))) criteria.push("correction_handling");
  if (scenario.requirementIds.some((id) => requirements.get(id)?.type === "safety_truthfulness")) criteria.push("truthfulness");
  criteria.push("usefulness", "conversational_coherence");
  return [...new Set(criteria)];
}

export function authoritativeFacts(scenario: ScenarioV2) {
  return scenario.requirementIds.map((id) => requirements.get(id)?.statement).filter((item): item is string => Boolean(item));
}

export function artifactId(path: string) { return basename(path, ".json"); }
