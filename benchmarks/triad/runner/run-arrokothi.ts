import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createRandomIds,
  createSystemClock,
  recordQueryTools,
} from "@agent-sdk/core";
import { emailDryRun } from "@agent-sdk/core/testing";
import { createStrandsGeminiEngine } from "@agent-sdk/integration-strands";
import { GeminiProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import { computeWallVolume, computeWallVolumeExecutor, craigAgent } from "../../../examples/p01-craig/agent.ts";
import { estateAgent, sendEstateLead } from "../../../examples/p02-estate/agent.ts";
import { projectCraigFields } from "../../p01-craig/agent.ts";
import { projectEstateFields } from "../../p02-estate/agent.ts";

const here = dirname(fileURLToPath(import.meta.url));
const triadRoot = resolve(here, "..");
const repoRoot = resolve(triadRoot, "../..");
const outputRoot = join(triadRoot, "results/arrokothi-v0351");
const baselineRoot = join(triadRoot, "results/baseline-2026-08-22");
const model = "gemini-3.5-flash-lite";
const minIntervalMs = Math.max(0, Number(process.env["BENCHMARK_MIN_CALL_INTERVAL_MS"] ?? 15_000));
let previousUserTurnStartedAt = 0;

type ProjectId = "p01" | "p02";
type Outcome = "pass" | "soft_fail" | "hard_fail" | "inconclusive";

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path: string, value: unknown) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

async function paceUserTurn() {
  const remaining = minIntervalMs - (Date.now() - previousUserTurnStartedAt);
  if (previousUserTurnStartedAt && remaining > 0) await sleep(remaining);
  previousUserTurnStartedAt = Date.now();
}

function repoState(root: string) {
  const run = (args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const commit = run(["rev-parse", "HEAD"]);
  const status = run(["status", "--short"]);
  if (commit.status !== 0 || status.status !== 0) throw new Error(`Unable to record git provenance for ${root}`);
  return {
    root,
    commit: commit.stdout.trim(),
    statusShort: status.stdout.split(/\r?\n/).filter(Boolean),
  };
}

function packageVersion(path: string) {
  return String(readJson(path).version);
}

function percentile(values: number[], proportion: number) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.max(0, Math.ceil(proportion * ordered.length) - 1))] ?? null;
}

function efficiency(records: any[]) {
  const callsPerTurn: number[] = [];
  const turnLatency: number[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let tokenCoverageCalls = 0;
  for (const record of records) {
    for (let turnIndex = 0; turnIndex < record.turns.length; turnIndex++) {
      const calls = record.run.calls.filter((call: any) => call.turnIndex === turnIndex);
      callsPerTurn.push(calls.length);
      const latencies = calls.map((call: any) => call.latencyMs).filter((value: unknown) => typeof value === "number");
      if (latencies.length) turnLatency.push(latencies.reduce((sum: number, value: number) => sum + value, 0));
      for (const call of calls) {
        if (call.inputTokens !== null || call.outputTokens !== null) {
          inputTokens += call.inputTokens ?? 0;
          outputTokens += call.outputTokens ?? 0;
          tokenCoverageCalls++;
        }
      }
    }
  }
  const histogram: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3": 0, "4+": 0 };
  for (const count of callsPerTurn) {
    const key = count >= 4 ? "4+" : String(count);
    histogram[key] = (histogram[key] ?? 0) + 1;
  }
  const total = callsPerTurn.reduce((sum, count) => sum + count, 0);
  return {
    attemptedUserTurns: callsPerTurn.length,
    totalLogicalModelCalls: total,
    meanLogicalCallsPerAttemptedTurn: callsPerTurn.length ? total / callsPerTurn.length : null,
    medianLogicalCallsPerAttemptedTurn: percentile(callsPerTurn, 0.5),
    minLogicalCallsPerAttemptedTurn: callsPerTurn.length ? Math.min(...callsPerTurn) : null,
    maxLogicalCallsPerAttemptedTurn: callsPerTurn.length ? Math.max(...callsPerTurn) : null,
    callsPerTurnHistogram: histogram,
    physicalAttempts: null,
    physicalAttemptCoverage: "Strands SDK does not expose transport attempts",
    totalInputTokens: tokenCoverageCalls ? inputTokens : null,
    totalOutputTokens: tokenCoverageCalls ? outputTokens : null,
    tokenCoverageCalls,
    p50ObservedTurnLatencyMs: percentile(turnLatency, 0.5),
    p95ObservedTurnLatencyMs: percentile(turnLatency, 0.95),
    latencyCoverageTurns: turnLatency.length,
  };
}

function outcomeCounts(records: any[], select: (record: any) => Outcome) {
  const counts: Record<Outcome, number> = { pass: 0, soft_fail: 0, hard_fail: 0, inconclusive: 0 };
  for (const record of records) counts[select(record)]++;
  return counts;
}

function compare(leftId: string, left: any, rightId: string, right: any) {
  if (left.outcome === "inconclusive" || right.outcome === "inconclusive") {
    return { left: leftId, right: rightId, verdict: "inconclusive", shared: [] };
  }
  const rightById = Object.fromEntries((right.assertions ?? []).map((assertion: any) => [assertion.id, assertion]));
  const shared = (left.assertions ?? [])
    .filter((assertion: any) => assertion.applicable && rightById[assertion.id]?.applicable)
    .map((assertion: any) => ({
      id: assertion.id,
      severity: assertion.severity,
      left: assertion.passed,
      right: rightById[assertion.id].passed,
    }));
  if (!shared.length) return { left: leftId, right: rightId, verdict: "inconclusive", shared };
  const leftWins = shared.filter((item: any) => item.left && !item.right).map((item: any) => item.id);
  const rightWins = shared.filter((item: any) => !item.left && item.right).map((item: any) => item.id);
  const bothFail = shared.filter((item: any) => !item.left && !item.right).map((item: any) => item.id);
  const verdict = leftWins.length && rightWins.length
    ? "mixed"
    : leftWins.length
      ? `${leftId}_better`
      : rightWins.length
        ? `${rightId}_better`
        : bothFail.length
          ? "tie_both_fail"
          : "tie";
  return { left: leftId, right: rightId, verdict, shared, leftWins, rightWins, bothFail };
}

function comparisonCounts(records: any[], key: string) {
  const counts: Record<string, number> = {};
  for (const record of records) {
    const verdict = record.comparisons[key].verdict;
    counts[verdict] = (counts[verdict] ?? 0) + 1;
  }
  return counts;
}

function callEvents(turn: any, project: ProjectId, scenarioId: string, turnIndex: number) {
  return turn.events
    .filter((event: any) => event.type === "ModelCallCompleted")
    .map((event: any) => {
      if (event.payload.model !== model) {
        throw new Error(`MODEL_MISMATCH ${project}/${scenarioId} turn ${turnIndex}: ${event.payload.model}`);
      }
      return {
        system: "arrokothi",
        project,
        scenarioId,
        turnIndex,
        purpose: event.payload.purpose,
        providerId: event.payload.providerId,
        requestedModel: model,
        reportedModel: event.payload.model,
        successful: true,
        latencyMs: event.payload.durationMs ?? null,
        inputTokens: event.payload.usage?.inputTokens ?? null,
        outputTokens: event.payload.usage?.outputTokens ?? null,
        totalTokens: event.payload.usage
          ? (event.payload.usage.inputTokens ?? 0) + (event.payload.usage.outputTokens ?? 0)
          : null,
      };
    });
}

async function runScenario(project: ProjectId, scenario: any, apiKey: string) {
  const definition = project === "p01" ? craigAgent : estateAgent;
  const sessions = new InMemorySessionStore();
  const knowledge = new KnowledgeIndex(definition.knowledge);
  const tools = new ToolRegistry(definition.tools);
  for (const pair of recordQueryTools(knowledge)) tools.add(pair.definition, pair.executor);
  if (project === "p01") tools.register(computeWallVolume.name, computeWallVolumeExecutor);
  const transport = project === "p02"
    ? emailDryRun(scenario.mockTransportMode === "fail" ? "fail" : "success")
    : null;
  if (transport) tools.register(sendEstateLead.name, transport);

  const runtime = new AgentRuntime({
    definition,
    sessions,
    knowledge,
    tools,
    model: new GeminiProvider({ apiKey, model, maxRetries: 0 }),
    planningModel: new GeminiProvider({ apiKey, model, maxRetries: 0 }),
    harness: new AgentHarness({
      strategy: "agentic",
      engine: createStrandsGeminiEngine({ apiKey }),
    }),
    ids: createRandomIds(),
    clock: createSystemClock(),
  });

  const sessionId = await runtime.createSession(undefined, `${project}-${scenario.id}`);
  const replies: string[] = [];
  const turnProviders: string[] = [];
  const calls: any[] = [];
  const toolEvents: any[] = [];
  let finalState: any = { memory: {}, phaseId: null };
  const metrics = {
    preflightModelCalls: 0,
    agentLoopModelCalls: 0,
    conversationSummaryModelCalls: 0,
    guideRetryModelCalls: 0,
    totalModelCalls: 0,
  };

  for (const [turnIndex, message] of scenario.turns.entries()) {
    await paceUserTurn();
    const turn = await runtime.runTurn({
      sessionId,
      message,
      hostContext: project === "p01"
        ? { locale: "en-US" }
        : {
            locale: "en-US",
            handoff_transport_token: "benchmark-dry-run",
            lead_score_band: "unscored",
          },
    });
    const runtimeErrors = turn.events.filter((event: any) => event.type === "RuntimeError");
    if (runtimeErrors.length) {
      throw new Error(`RUNTIME_FAILURE ${project}/${scenario.id} turn ${turnIndex}: ${JSON.stringify(runtimeErrors)}`);
    }
    const perTurnCalls = callEvents(turn, project, scenario.id, turnIndex);
    if (!perTurnCalls.length) throw new Error(`NO_MODEL_CALL ${project}/${scenario.id} turn ${turnIndex}`);
    if (perTurnCalls.some((call: any) => !String(call.providerId).includes("gemini"))) {
      throw new Error(`PROVIDER_MISMATCH ${project}/${scenario.id} turn ${turnIndex}`);
    }
    calls.push(...perTurnCalls);
    replies.push(turn.reply);
    turnProviders.push("gemini");
    finalState = turn.state;
    for (const key of Object.keys(metrics) as Array<keyof typeof metrics>) metrics[key] += turn.metrics[key];
    for (const event of turn.events) {
      if ([
        "ToolRequested",
        "ToolExecutionSucceeded",
        "ToolExecutionFailed",
        "ConfirmationRequested",
        "DelegationCompleted",
        "DelegationRejected",
      ].includes(event.type)) toolEvents.push({ turnIndex, type: event.type, payload: event.payload });
    }
  }

  const actionsAttempted = transport ? transport.calls.map(() => "send_email") : [];
  const actionSuccess = transport?.callCount ? scenario.mockTransportMode !== "fail" : null;
  return {
    replies,
    fields: project === "p01" ? projectCraigFields(finalState) : projectEstateFields(finalState),
    stageId: finalState.phaseId ?? null,
    actions: actionsAttempted,
    actionsAttempted,
    actionSuccess,
    actionResults: transport?.calls.map((call) => ({
      tool: "send_to_team",
      payload: call.args,
      success: actionSuccess,
      transport: "dry-run",
    })) ?? [],
    toolEvents,
    turnProviders,
    model,
    harnessError: null,
    runtimeErrors: [],
    callMetrics: {
      ...metrics,
      logicalModelCalls: calls.length,
      physicalAttempts: null,
      physicalAttemptNote: "Strands SDK does not expose transport attempts; GeminiProvider retries are disabled.",
    },
    calls,
  };
}

function writeCalls(project: ProjectId, records: any[]) {
  const lines = records.flatMap((record) => record.run.calls).map((call) => JSON.stringify(call));
  writeFileSync(join(outputRoot, `calls-${project}.jsonl`), `${lines.join("\n")}\n`);
}

function writeComparison(projectRecords: Record<ProjectId, any[]>, baseline: Record<ProjectId, any>) {
  const lines = [
    "# Agent_SDK v0.35.1 controlled triad comparison",
    "",
    "**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**",
    "",
    "Bespoke and Agenerateor columns are stored outputs from the 2026-08-22 baseline; only Arrokothi was rerun. The v0.35 framework-blocked run is reliability evidence and is excluded from semantic winner counts.",
    "",
  ];
  const summary: Record<string, unknown> = {};
  for (const project of ["p01", "p02"] as const) {
    const current = projectRecords[project];
    const oldById = Object.fromEntries(baseline[project].records.map((record: any) => [record.scenarioId, record]));
    const merged = current.map((record: any) => {
      const old = oldById[record.scenarioId];
      return {
        ...record,
        systems: { ...old.systems, arrokothi: record.run },
        comparisons: {
          agenerateor_vs_bespoke: old.comparisons.agenerateor_vs_bespoke,
          arrokothi_vs_bespoke: compare("arrokothi", record.run, "bespoke", old.systems.bespoke),
          arrokothi_vs_agenerateor: compare("arrokothi", record.run, "agenerateor", old.systems.agenerateor),
        },
      };
    });
    const counts = {
      absolute: {
        bespoke: outcomeCounts(merged, (record) => record.systems.bespoke.outcome),
        agenerateor: outcomeCounts(merged, (record) => record.systems.agenerateor.outcome),
        arrokothi: outcomeCounts(merged, (record) => record.systems.arrokothi.outcome),
      },
      pairwise: {
        arrokothi_vs_bespoke: comparisonCounts(merged, "arrokothi_vs_bespoke"),
        arrokothi_vs_agenerateor: comparisonCounts(merged, "arrokothi_vs_agenerateor"),
        agenerateor_vs_bespoke: comparisonCounts(merged, "agenerateor_vs_bespoke"),
      },
    };
    summary[project] = counts;
    lines.push(`## ${project.toUpperCase()}`, "", "| Scenario | Bespoke (stored) | Agenerateor (stored) | Arrokothi v0.35.1 |", "|---|---:|---:|---:|");
    for (const record of merged) {
      lines.push(`| ${record.scenarioId} | ${record.systems.bespoke.outcome} | ${record.systems.agenerateor.outcome} | ${record.systems.arrokothi.outcome} |`);
    }
    lines.push("", "### Counts", "", "```json", JSON.stringify(counts, null, 2), "```", "");
  }
  lines.push(
    "## Interpretation",
    "",
    "Semantic pass/soft-fail/hard-fail outcomes above come from the frozen canonical graders. Runtime reliability is a separate axis: this v0.35.1 rerun completed every requested turn without RuntimeError, fallback, or model mismatch. Efficiency is reported in `efficiency.json` and is not folded into semantic outcomes.",
    "",
  );
  writeFileSync(join(outputRoot, "comparison.md"), `${lines.join("\n")}\n`);
  return summary;
}

async function main() {
  const apiKey = geminiApiKeyFromEnv();
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing from Agent_SDK's root .env");
  if (process.env["GEMINI_MODEL"] !== model) {
    throw new Error(`GEMINI_MODEL must be ${model}; observed ${process.env["GEMINI_MODEL"] ?? "unset"}`);
  }
  mkdirSync(outputRoot, { recursive: true });
  const packageJson = readJson(join(repoRoot, "package.json"));
  if (packageJson.version !== "0.35.1") throw new Error(`Expected subject version 0.35.1, observed ${packageJson.version}`);
  const canonicalPaths = {
    p01Scenarios: join(triadRoot, "canonical/p01/scenarios.ts"),
    p01Grading: join(triadRoot, "canonical/p01/grading.mjs"),
    p02Scenarios: join(triadRoot, "canonical/p02/scenarios.ts"),
    p02Grading: join(triadRoot, "canonical/p02/grading.mjs"),
  };
  const modules = {
    p01Scenarios: await import(pathToFileURL(canonicalPaths.p01Scenarios).href),
    p01Grading: await import(pathToFileURL(canonicalPaths.p01Grading).href),
    p02Scenarios: await import(pathToFileURL(canonicalPaths.p02Scenarios).href),
    p02Grading: await import(pathToFileURL(canonicalPaths.p02Grading).href),
  };
  const projects = [
    { id: "p01" as const, scenarios: modules.p01Scenarios.EXECUTABLE_SCENARIOS, grading: modules.p01Grading },
    { id: "p02" as const, scenarios: modules.p02Scenarios.EXECUTABLE_SCENARIOS, grading: modules.p02Grading },
  ];
  const projectRecords: Record<ProjectId, any[]> = { p01: [], p02: [] };
  const startedAt = new Date().toISOString();
  const manifest: any = {
    runId: "arrokothi-v0351",
    evidenceType: "fresh-subject-only-rerun",
    utcStart: startedAt,
    utcEnd: null,
    datasetRole: "retrospective-development",
    subjectVersion: packageJson.version,
    requestedModel: model,
    modelMismatchCount: 0,
    fallbackCount: 0,
    runtimeErrorCount: 0,
    pacing: { minCallIntervalMs: minIntervalMs },
    sideEffects: "emailDryRun only; no external side effects",
    baselineReuse: "results/baseline-2026-08-22",
    agentDefinitionHashes: {
      p01: sha256(readFileSync(join(repoRoot, "examples/p01-craig/agent.ts"))),
      p02: sha256(readFileSync(join(repoRoot, "examples/p02-estate/agent.ts"))),
    },
    canonicalSources: Object.entries(canonicalPaths).map(([id, path]) => ({
      id,
      relativePath: path.slice(repoRoot.length + 1),
      sha256: sha256(readFileSync(path)),
    })),
    repairSourceHashes: Object.fromEntries([
      "core/src/harness/two-pass.ts",
      "core/src/planning/turn-plan.ts",
      "core/src/schema/value-schema.ts",
      "providers/gemini/src/index.ts",
      "integrations/strands/src/index.ts",
    ].map((relativePath) => [relativePath, sha256(readFileSync(join(repoRoot, relativePath)))])),
    dependencies: {
      "@strands-agents/sdk": packageVersion(join(repoRoot, "integrations/strands/node_modules/@strands-agents/sdk/package.json")),
      "@google/genai": packageVersion(join(repoRoot, "node_modules/@google/genai/package.json")),
    },
    sourceRepositories: {
      agentSdk: repoState(repoRoot),
      craig: repoState(resolve(repoRoot, "../Craig-Hempcrete-DemoSitee")),
      estatePro: repoState(resolve(repoRoot, "../EstatePro")),
      agenerateor: repoState(resolve(repoRoot, "../Agenerateor")),
    },
  };
  writeJson(join(outputRoot, "manifest.json"), manifest);

  try {
    for (const project of projects) {
      for (const scenario of project.scenarios) {
        process.stderr.write(`[${project.id.toUpperCase()} ${scenario.id}] ${scenario.turns.length} turn(s)\n`);
        const run = await runScenario(project.id, scenario, apiKey);
        const grade = project.id === "p01"
          ? project.grading.grade(scenario, run, false)
          : project.grading.grade(scenario, run, new Set());
        Object.assign(run, {
          outcome: grade.outcome,
          reason: grade.reason,
          assertions: grade.assertions,
        });
        projectRecords[project.id].push({
          scenarioId: scenario.id,
          specId: scenario.specId,
          title: scenario.title,
          evidence: scenario.evidence,
          requirement: scenario.requirement,
          stresses: scenario.stresses,
          note: scenario.note ?? null,
          turns: scenario.turns,
          run,
        });
        writeJson(join(outputRoot, `${project.id}.json`), {
          project: project.id,
          subject: "arrokothi-v0351",
          records: projectRecords[project.id],
        });
        writeCalls(project.id, projectRecords[project.id]);
        process.stderr.write(`  outcome=${grade.outcome} calls=${run.calls.length}\n`);
      }
    }
  } catch (error) {
    manifest.aborted = true;
    manifest.abortReason = error instanceof Error ? error.message : String(error);
    manifest.utcEnd = new Date().toISOString();
    writeJson(join(outputRoot, "manifest.json"), manifest);
    throw error;
  }

  const baseline = {
    p01: readJson(join(baselineRoot, "p01.json")),
    p02: readJson(join(baselineRoot, "p02.json")),
  };
  const efficiencyResult = {
    p01: {
      ...readJson(join(baselineRoot, "efficiency.json")).p01,
      arrokothi: efficiency(projectRecords.p01),
    },
    p02: {
      ...readJson(join(baselineRoot, "efficiency.json")).p02,
      arrokothi: efficiency(projectRecords.p02),
    },
  };
  writeJson(join(outputRoot, "efficiency.json"), efficiencyResult);
  manifest.semanticComparison = writeComparison(projectRecords, baseline);
  manifest.utcEnd = new Date().toISOString();
  manifest.aborted = false;
  manifest.completedScenarios = { p01: projectRecords.p01.length, p02: projectRecords.p02.length };
  manifest.completedUserTurns = {
    p01: projectRecords.p01.reduce((sum, record) => sum + record.turns.length, 0),
    p02: projectRecords.p02.reduce((sum, record) => sum + record.turns.length, 0),
  };
  writeJson(join(outputRoot, "manifest.json"), manifest);
  process.stdout.write(`${outputRoot}\n`);
}

await main();
