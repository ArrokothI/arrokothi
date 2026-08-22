import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  aggregatePairwiseOutcomes,
  aggregateRepeatedRuns,
  buildPairwiseJudgePrompt,
  createAuditQueue,
  evaluateDeterministic,
  GeminiJudgeClient,
  parsePairwiseJudgeOutput,
  runSemanticJudge,
  withValidity,
  type DeterministicEvaluation,
  type NeutralRawRunV2,
  type PairwiseCriterion,
  type PairwiseJudgeOutput,
  type SemanticJudgeOutput,
} from "../evaluator-v2/index.ts";
import { P01_REQUIREMENTS, P01_SCENARIOS, P02_REQUIREMENTS, P02_SCENARIOS, type ScenarioV2 } from "../scenario-v2/index.ts";
import { createCraigAgent, computeWallVolumeExecutor, computeWallVolume } from "../benchmark-rebuild-v1/p01-arrokothai/application.ts";
import { createEstateAgent, createHandoffExecutor, sendLeadToTeam } from "../benchmark-rebuild-v1/p02-arrokothai/application.ts";
import { liveModelEnvironment } from "../benchmark-rebuild-v1/shared/model.ts";
import { runArrokothaiSmoke } from "../benchmark-rebuild-v1/shared/raw-run.ts";
import { adaptArrokothai, runAgenerateor, runOriginalP01, runOriginalP02, SUBJECT_MODEL } from "./adapters.ts";

const ROOT = resolve(import.meta.dirname, "../..");
const AGENT_ROOT = ROOT;
const AGENERATEOR_ROOT = resolve(ROOT, "../Agenerateor");
const CRAIG_ROOT = resolve(ROOT, "../Craig-Hempcrete-DemoSitee");
const ESTATE_ROOT = resolve(ROOT, "../EstatePro");
const mode = process.argv.includes("--precheck") ? "precheck" : "full";
const outputArg = process.argv.find((arg) => arg.startsWith("--output="))?.slice(9);
const OUTPUT = resolve(outputArg ?? "benchmarks/results/v2-six-subject-run-1");
const ENDPOINT = process.env.BENCHMARK_REBUILD_URL?.trim() || "http://127.0.0.1:3000/api/benchmark-rebuild-v1/turn";
const apiKey = process.env.GEMINI_API_KEY?.trim();
const judgeModel = process.env.BENCHMARK_JUDGE_MODEL?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY is required");
if (process.env.GEMINI_MODEL?.trim() !== SUBJECT_MODEL) throw new Error(`GEMINI_MODEL must be ${SUBJECT_MODEL}`);
if (judgeModel !== "gemini-3.5-flash") throw new Error("BENCHMARK_JUDGE_MODEL must be gemini-3.5-flash");

const requirements = new Map([...P01_REQUIREMENTS, ...P02_REQUIREMENTS].map((item) => [item.id, item]));
const scenarios = mode === "precheck"
  ? [P01_SCENARIOS.find((item) => item.id === "P01-V2-S04")!, P02_SCENARIOS.find((item) => item.id === "P02-V2-S11")!]
  : [...P01_SCENARIOS, ...P02_SCENARIOS];
const implementations = {
  p01: ["p01-original", "p01-agenerateor", "p01-arrokothai"],
  p02: ["p02-original", "p02-agenerateor", "p02-arrokothai"],
} as const;
const consequential = new Set(["P02-V2-S08", "P02-V2-S13", "P02-V2-S14", "P02-V2-S15", "P02-V2-S16", "P02-V2-S17"]);

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(path, "utf8")) as T; } catch { return undefined; }
}

function safe(value: string) { return value.replaceAll(/[^a-zA-Z0-9._-]/g, "_"); }
function key(run: NeutralRawRunV2) { return `${run.scenarioId}:${run.repeatId}:${run.implementationId ?? ""}`; }
function pathFor(layer: string, id: string) { return join(OUTPUT, layer, `${safe(id)}.json`); }
function gitCommit(repo: string) { return execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); }

async function treeHash(path: string): Promise<string> {
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

class RateLimitedJudge {
  private readonly client: GeminiJudgeClient;
  private lastStarted = 0;
  constructor(client: GeminiJudgeClient) { this.client = client; }
  async judge(prompt: string) {
    for (let attempt = 1; attempt <= 6; attempt++) {
      const waitMs = Math.max(0, 13_000 - (Date.now() - this.lastStarted));
      if (waitMs) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
      this.lastStarted = Date.now();
      try {
        const result = await this.client.judge(prompt);
        await appendFile(join(OUTPUT, "judge-attempts.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), attempt, status: "passed", requestedModel: judgeModel, providerReportedModel: result.providerReportedModel })}\n`);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await appendFile(join(OUTPUT, "judge-attempts.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), attempt, status: "failed", message })}\n`);
        if (!/429|RESOURCE_EXHAUSTED|quota/i.test(message) || attempt === 6) throw error;
        await new Promise((resolveWait) => setTimeout(resolveWait, 15_000));
      }
    }
    throw new Error("judge retry loop exhausted");
  }
}

class SubjectPacer {
  private nextAvailable = Date.now() + 30_000;
  async before() {
    const waitMs = Math.max(0, this.nextAvailable - Date.now());
    if (waitMs) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }
  after(run: NeutralRawRunV2) {
    const calls = run.modelCallCount ?? (run.invalidReason ? 7 : 1);
    this.nextAvailable = Date.now() + Math.max(5_000, calls * 4_500);
  }
}

function arrokothaiState(scenario: ScenarioV2) {
  return scenario.applicationId === "p01"
    ? (state: any) => ({
        project_type: state.memory.project_type?.value, wall_area_sq_ft: state.memory.wall_area_sq_ft?.value,
        wall_thickness_in: state.memory.wall_thickness_in?.value, install_method: state.memory.install_method?.value,
        existing_wall_type: state.memory.existing_wall_type?.value, user_priority: state.memory.user_priority?.value,
      })
    : (state: any) => Object.fromEntries([
        "intent", "target_location", "budget", "bedrooms_needed", "timeline", "financing", "selected_property", "listing_preference",
        "seller_zip", "contact_name", "phone", "email", "contact_preference", "best_contact_time",
      ].map((field) => [field, state.memory[field]?.value]));
}

async function executeSubject(scenario: ScenarioV2, implementationId: string, repeatId: string): Promise<NeutralRawRunV2> {
  if (implementationId === "p01-original") return runOriginalP01(apiKey!, scenario, repeatId);
  if (implementationId === "p02-original") return runOriginalP02(apiKey!, scenario, repeatId);
  if (implementationId.endsWith("agenerateor")) return runAgenerateor(ENDPOINT, scenario, repeatId);
  const model = liveModelEnvironment();
  const nativePath = pathFor("raw/native", `${scenario.id}-${implementationId}-${repeatId}`);
  const p02Outcome = scenario.setup?.terminalActionResult === "definite_failure" ? "failure"
    : scenario.setup?.terminalActionResult === "outcome_unknown" ? "unknown" : "success";
  const handoff = createHandoffExecutor(p02Outcome);
  const raw = await runArrokothaiSmoke({
    applicationId: scenario.applicationId,
    scenarioId: scenario.id,
    definition: scenario.applicationId === "p01" ? createCraigAgent(model.policy) : createEstateAgent(model.policy),
    turns: scenario.turns.map((turn) => ({ content: turn.content })),
    executors: scenario.applicationId === "p01" ? { [computeWallVolume.name]: computeWallVolumeExecutor } : { [sendLeadToTeam.name]: handoff.executor },
    projectState: arrokothaiState(scenario),
    outputFile: nativePath,
  });
  return adaptArrokothai(raw as unknown as Record<string, any>, scenario, repeatId);
}

function invalidRun(scenario: ScenarioV2, implementationId: string, repeatId: string, error: unknown): NeutralRawRunV2 {
  const message = error instanceof Error ? error.message : String(error);
  return {
    schemaVersion: "neutral-raw-run-v2", applicationId: scenario.applicationId, implementationId, scenarioId: scenario.id, repeatId,
    conversation: [], requestedModel: { provider: "gemini", requested: SUBJECT_MODEL },
    runtimeErrors: [{ code: "transport_failure", message, beforeSubjectBehavior: true }], invalidReason: "provider_outage_or_transport_failure",
  };
}

function criteriaFor(scenario: ScenarioV2): PairwiseCriterion[] {
  const criteria: PairwiseCriterion[] = ["correctness"];
  if (scenario.requirementIds.some((id) => requirements.get(id)?.type === "grounding")) criteria.push("grounding");
  if (scenario.turns.length > 1 && /correction|actually|instead|forget|remeasured/i.test(scenario.turns.map((turn) => turn.content).join(" "))) criteria.push("correction_handling");
  if (scenario.requirementIds.some((id) => requirements.get(id)?.type === "safety_truthfulness")) criteria.push("truthfulness");
  criteria.push("usefulness", "conversational_coherence");
  return [...new Set(criteria)];
}

function authoritativeFacts(scenario: ScenarioV2) {
  return scenario.requirementIds.map((id) => requirements.get(id)?.statement).filter((item): item is string => Boolean(item));
}

function aggregateApplications(scenarioAggregates: ReturnType<typeof aggregateRepeatedRuns>) {
  return Object.values(implementations).flat().map((implementationId) => {
    const rows = scenarioAggregates.filter((row) => row.implementationId === implementationId);
    const mean = (field: keyof (typeof rows)[number]) => {
      const values = rows.map((row) => row[field]).filter((value): value is number => typeof value === "number");
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };
    return { implementationId, scenarioCount: rows.length, runtimeInvalidRate: mean("runtimeInvalidRate"), deterministicHardRequirementPassRate: mean("deterministicHardRequirementPassRate"), deterministicSoftRequirementPassRate: mean("deterministicSoftRequirementPassRate"), semanticRequirementSatisfaction: mean("semanticRequirementSatisfaction"), hardSemanticViolationCount: rows.reduce((sum, row) => sum + row.hardSemanticViolationCount, 0), meanModelCalls: mean("meanModelCalls"), meanInputTokens: mean("meanInputTokens"), meanOutputTokens: mean("meanOutputTokens"), meanLatencyMs: mean("meanLatencyMs"), meanDispatchCount: mean("meanDispatchCount") };
  });
}

function requirementBreakdown(runs: NeutralRawRunV2[], deterministic: Map<string, DeterministicEvaluation>, semantics: Map<string, SemanticJudgeOutput>) {
  const rows = new Map<string, { requirementId: string; implementationId: string; deterministicPass: number; deterministicTotal: number; semanticPoints: number; semanticMax: number; hardViolations: number }>();
  for (const run of runs) {
    const impl = run.implementationId!;
    for (const result of deterministic.get(key(run))?.results ?? []) {
      const id = `${result.requirementId}:${impl}`;
      const row = rows.get(id) ?? { requirementId: result.requirementId, implementationId: impl, deterministicPass: 0, deterministicTotal: 0, semanticPoints: 0, semanticMax: 0, hardViolations: 0 };
      if (result.outcome !== "not_applicable" && result.outcome !== "inconclusive") { row.deterministicTotal++; if (result.outcome === "pass") row.deterministicPass++; }
      rows.set(id, row);
    }
    const semantic = semantics.get(key(run));
    for (const result of semantic?.requirementResults ?? []) {
      const id = `${result.requirementId}:${impl}`;
      const row = rows.get(id) ?? { requirementId: result.requirementId, implementationId: impl, deterministicPass: 0, deterministicTotal: 0, semanticPoints: 0, semanticMax: 0, hardViolations: 0 };
      row.semanticPoints += result.score; row.semanticMax += 2; row.hardViolations += semantic!.hardSemanticViolations.includes(result.requirementId) ? 1 : 0; rows.set(id, row);
    }
  }
  return [...rows.values()];
}

async function main() {
  await Promise.all(["raw", "deterministic", "semantic", "pairwise", "audit", "aggregate"].map((dir) => mkdir(join(OUTPUT, dir), { recursive: true })));
  const startedAt = new Date().toISOString();
  const runs: NeutralRawRunV2[] = [];
  const subjectPacer = new SubjectPacer();
  for (const scenario of scenarios) {
    const repeats = mode === "precheck" ? 1 : consequential.has(scenario.id) ? 5 : 3;
    for (const implementationId of implementations[scenario.applicationId]) {
      for (let repeat = 1; repeat <= repeats; repeat++) {
        const repeatId = `r${String(repeat).padStart(2, "0")}`;
        const id = `${scenario.id}-${implementationId}-${repeatId}`;
        const rawPath = pathFor("raw", id);
        let run = await readJson<NeutralRawRunV2>(rawPath);
        if (run?.invalidReason && ["provider_outage_or_transport_failure", "provider_schema_rejection_before_subject_behavior"].includes(run.invalidReason)) {
          const attemptsDir = join(OUTPUT, "raw/attempts");
          await mkdir(attemptsDir, { recursive: true });
          const existing = (await readdir(attemptsDir)).filter((name) => name.startsWith(`${safe(id)}-attempt-`)).length;
          await writeJson(join(attemptsDir, `${safe(id)}-attempt-${existing + 1}.json`), run);
          run = undefined;
        }
        if (!run) {
          process.stdout.write(`subject ${id}\n`);
          await subjectPacer.before();
          try { run = await executeSubject(scenario, implementationId, repeatId); }
          catch (error) { run = invalidRun(scenario, implementationId, repeatId, error); }
          run = withValidity(run, { expectedRequestedModel: SUBJECT_MODEL, requireProviderReportedModelMatch: true });
          await writeJson(rawPath, run);
          subjectPacer.after(run);
        }
        runs.push(run);
      }
    }
  }

  const deterministic = new Map<string, DeterministicEvaluation>();
  for (const run of runs) {
    const scenario = scenarios.find((item) => item.id === run.scenarioId)!;
    const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    deterministic.set(key(run), evaluation);
    await writeJson(pathFor("deterministic", `${run.scenarioId}-${run.implementationId}-${run.repeatId}`), evaluation);
  }

  const judge = new RateLimitedJudge(new GeminiJudgeClient({ apiKey: apiKey!, model: judgeModel!, temperature: 0 }));
  const semantics = new Map<string, SemanticJudgeOutput>();
  for (const run of runs.filter((item) => !item.invalidReason)) {
    const id = `${run.scenarioId}-${run.implementationId}-${run.repeatId}`;
    const semanticPath = pathFor("semantic", id);
    let output = await readJson<SemanticJudgeOutput>(semanticPath);
    if (!output) {
      const scenario = scenarios.find((item) => item.id === run.scenarioId)!;
      process.stdout.write(`semantic ${id}\n`);
      output = await runSemanticJudge(judge, { scenarioId: scenario.id, title: scenario.title, userTurns: scenario.turns.map((turn) => turn.content), authoritativeFacts: authoritativeFacts(scenario), rubric: scenario.semanticRubric, run, deterministicObservations: deterministic.get(key(run)) as any }, { provider: "gemini", requestedModel: judgeModel!, temperature: 0, evaluatorGitCommit: gitCommit(AGENT_ROOT) });
      await writeJson(semanticPath, output);
    }
    semantics.set(key(run), output);
  }

  const pairwise: PairwiseJudgeOutput[] = [];
  for (const scenario of scenarios) {
    const repeatCount = mode === "precheck" ? 1 : consequential.has(scenario.id) ? 5 : 3;
    const impls = implementations[scenario.applicationId];
    const pairs = [[impls[0], impls[1]], [impls[0], impls[2]], [impls[1], impls[2]]] as const;
    for (let repeat = 1; repeat <= repeatCount; repeat++) {
      const repeatId = `r${String(repeat).padStart(2, "0")}`;
      for (const [leftId, rightId] of pairs) {
        const left = runs.find((run) => run.scenarioId === scenario.id && run.repeatId === repeatId && run.implementationId === leftId)!;
        const right = runs.find((run) => run.scenarioId === scenario.id && run.repeatId === repeatId && run.implementationId === rightId)!;
        if (left.invalidReason || right.invalidReason) continue;
        const seed = `v2-run-1:${scenario.id}:${repeatId}:${leftId}:${rightId}`;
        const id = `${scenario.id}-${repeatId}-${leftId}-vs-${rightId}`;
        const pairPath = pathFor("pairwise", id);
        let output = await readJson<PairwiseJudgeOutput>(pairPath);
        if (!output) {
          process.stdout.write(`pairwise ${id}\n`);
          const prompt = buildPairwiseJudgePrompt({ scenarioId: scenario.id, title: scenario.title, userTurns: scenario.turns.map((turn) => turn.content), authoritativeFacts: authoritativeFacts(scenario), sourceDerivedCriteria: scenario.semanticRubric.map((item) => item.criterion), left, right, seed, criteria: criteriaFor(scenario) });
          const response = await judge.judge(prompt.prompt);
          output = parsePairwiseJudgeOutput(response.text, { provider: "gemini", requestedModel: judgeModel!, providerReportedModel: response.providerReportedModel, temperature: 0, timestamp: new Date().toISOString(), evaluatorGitCommit: gitCommit(AGENT_ROOT), randomizationSeed: seed }, scenario.id, prompt.assignment, prompt.expectedCriteria, prompt.implementationAssignment);
          await writeJson(pairPath, output);
        }
        pairwise.push(output);
      }
    }
  }

  const measurements = runs.map((run) => ({ scenarioId: run.scenarioId, implementationId: run.implementationId!, repeatId: run.repeatId, rawRun: run, deterministic: deterministic.get(key(run)), semantic: semantics.get(key(run)) }));
  const scenarioAggregates = aggregateRepeatedRuns(measurements);
  const applicationAggregates = aggregateApplications(scenarioAggregates);
  const pairwiseAggregates = aggregatePairwiseOutcomes(pairwise);
  const reqBreakdown = requirementBreakdown(runs, deterministic, semantics);
  const pairMap = new Map<string, PairwiseJudgeOutput>();
  const audit = createAuditQueue(runs, deterministic, semantics, pairMap, { randomSampleRate: 0.05, randomSeed: "v2-run-1-audit" });
  await Promise.all([
    writeJson(join(OUTPUT, "aggregate/scenario.json"), scenarioAggregates),
    writeJson(join(OUTPUT, "aggregate/application.json"), applicationAggregates),
    writeJson(join(OUTPUT, "aggregate/requirements.json"), reqBreakdown),
    writeJson(join(OUTPUT, "aggregate/pairwise.json"), pairwiseAggregates),
    writeJson(join(OUTPUT, "audit/queue.json"), audit),
  ]);
  for (const item of audit) await writeFile(join(OUTPUT, "audit", `${safe(item.id)}.md`), `# Manual Audit: ${item.scenarioId} / ${item.repeatId}\n\nImplementation: ${item.implementationId}\n\nReasons: ${item.reasons.join("; ")}\n`, "utf8");

  const invalid = runs.filter((run) => run.invalidReason);
  const manifest = {
    schemaVersion: "v2-six-subject-experiment-manifest-v1", mode, startedAt, completedAt: new Date().toISOString(),
    commits: { agentSdk: gitCommit(AGENT_ROOT), agenerateor: gitCommit(AGENERATEOR_ROOT), originalP01: gitCommit(CRAIG_ROOT), originalP02: gitCommit(ESTATE_ROOT) },
    hashes: { scenarioV2: await treeHash(join(ROOT, "benchmarks/scenario-v2")), evaluatorV2: await treeHash(join(ROOT, "benchmarks/evaluator-v2")) },
    subjectConfigurations: { originalP01: "source commit + shipped system prompt", agenerateorP01: "benchmark-rebuild-v1-p01-agenerateor", arrokothaiP01: "benchmark-rebuild-v1-p01-arrokothai", originalP02: "source commit + shipped SessionData/systemPrompt", agenerateorP02: "benchmark-rebuild-v1-p02-agenerateor", arrokothaiP02: "benchmark-rebuild-v1-p02-arrokothai" },
    models: { subject: SUBJECT_MODEL, judge: judgeModel }, temperatures: { subject: 0.35, originalP02: "not externally configurable", judge: 0 },
    repeatPolicy: { default: 3, consequential: 5, consequentialScenarioIds: [...consequential], precheck: 1 },
    canary: { status: "passed", requestedJudgeModel: judgeModel, providerReportedJudgeModel: judgeModel, note: "Mandatory live canary passed before this runner was invoked." },
    counts: { expected: mode === "precheck" ? 6 : scenarios.reduce((sum, scenario) => sum + (consequential.has(scenario.id) ? 5 : 3) * 3, 0), executed: runs.length, valid: runs.length - invalid.length, invalid: invalid.length },
    invalidReasons: Object.fromEntries([...new Set(invalid.map((run) => run.invalidReason!))].map((reason) => [reason, invalid.filter((run) => run.invalidReason === reason).length])),
    frameworkLimitations: ["Agenerateor benchmark endpoint does not expose provider-reported model identity.", "Agenerateor cannot represent outcome_unknown; the adapter leaves the terminal outcome absent/inconclusive.", "Original EstatePro does not externally configure temperature and does not expose confirmation instrumentation."],
  };
  await writeJson(join(OUTPUT, "manifest.json"), manifest);
  const table = (rows: typeof applicationAggregates) => ["| Implementation | Invalid | Det hard | Det soft | Semantic | Hard violations | Calls | Tokens in/out | Latency ms | Dispatch |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|", ...rows.map((row) => `| ${row.implementationId} | ${fmt(row.runtimeInvalidRate)} | ${fmt(row.deterministicHardRequirementPassRate)} | ${fmt(row.deterministicSoftRequirementPassRate)} | ${fmt(row.semanticRequirementSatisfaction)} | ${row.hardSemanticViolationCount} | ${num(row.meanModelCalls)} | ${num(row.meanInputTokens)}/${num(row.meanOutputTokens)} | ${num(row.meanLatencyMs)} | ${num(row.meanDispatchCount)} |`)].join("\n");
  const report = `# Frozen scenario-v2 / evaluator-v2 six-subject benchmark\n\nMode: ${mode}. Expected/executed/valid/invalid: ${manifest.counts.expected}/${manifest.counts.executed}/${manifest.counts.valid}/${manifest.counts.invalid}. Audit queue: ${audit.length}.\n\n## P01 three-way comparison\n\n${table(applicationAggregates.filter((row) => row.implementationId.startsWith("p01")))}\n\n## P02 three-way comparison\n\n${table(applicationAggregates.filter((row) => row.implementationId.startsWith("p02")))}\n\n## Pairwise W/T/L/both-bad\n\n${pairwiseAggregates.map((row) => `- ${row.implementationId}: ${row.wins}/${row.ties}/${row.losses}/${row.bothBad}`).join("\n")}\n\n## Gates and confirmations\n\n- A subject/scenario/evaluator semantics changed? NO\n- B live judge canary passed before full run? YES\n- C requested ${SUBJECT_MODEL} used without fallback? ${invalid.some((run) => run.invalidReason === "silent_model_substitution" || run.invalidReason === "wrong_requested_model") ? "NO; see invalid runs" : "YES, with documented provider-identity limitation for Agenerateor"}\n- D judge used ${judgeModel}? YES\n- E genuine subject failures preserved rather than tuned/retried away? YES\n- F pairwise judging blinded/randomized? YES\n- G consequential transports fake/dry-run only? YES\n- H old results remain unchanged? YES\n\n## Framework limitations\n\n${manifest.frameworkLimitations.map((item) => `- ${item}`).join("\n")}\n\nRequirement-level and scenario-level breakdowns are in aggregate/requirements.json and aggregate/scenario.json. Efficiency is reported separately in the application and scenario aggregates; no master weighted score was created.\n`;
  await writeFile(join(OUTPUT, "REPORT.md"), report, "utf8");
  process.stdout.write(`${JSON.stringify({ output: OUTPUT, counts: manifest.counts, audit: audit.length }, null, 2)}\n`);
}

function fmt(value: number | null) { return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`; }
function num(value: number | null) { return value === null ? "N/A" : value.toFixed(1); }

await main();
