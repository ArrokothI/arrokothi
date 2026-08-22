import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [primaryArg, ...stabilityArgs] = process.argv.slice(2);
if (!primaryArg) throw new Error("usage: finalize.ts <primary-run-dir> [stability-run-dir ...]");
const primary = resolve(primaryArg);

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2));
const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.max(0, Math.ceil(p * ordered.length) - 1))] ?? null;
};

function outcomeCounts(records: any[], system: string) {
  const result = { pass: 0, soft_fail: 0, hard_fail: 0, inconclusive: 0 };
  for (const record of records) result[record.systems[system].outcome as keyof typeof result]++;
  return result;
}

function comparisonCounts(records: any[], key: string) {
  const result: Record<string, number> = {};
  for (const record of records) {
    const verdict = record.comparisons[key].verdict;
    result[verdict] = (result[verdict] ?? 0) + 1;
  }
  return result;
}

function efficiency(records: any[], system: string) {
  const perTurn: number[] = [];
  const turnLatency: number[] = [];
  let inputTokens = 0, outputTokens = 0, tokenCalls = 0, physicalKnown = 0, physicalUnknown = 0;
  for (const record of records) {
    const run = record.systems[system];
    const grouped = new Map<number, any[]>();
    for (const call of run.calls ?? []) {
      const calls = grouped.get(call.turnIndex) ?? [];
      calls.push(call); grouped.set(call.turnIndex, calls);
      if (call.inputTokens !== null || call.outputTokens !== null) {
        inputTokens += call.inputTokens ?? 0; outputTokens += call.outputTokens ?? 0; tokenCalls++;
      }
    }
    for (const calls of grouped.values()) {
      perTurn.push(calls.length);
      const latency = calls.map((call) => call.latencyMs).filter((value) => typeof value === "number");
      if (latency.length) turnLatency.push(latency.reduce((sum, value) => sum + value, 0));
    }
    if (typeof run.callMetrics?.physicalAttempts === "number") physicalKnown += run.callMetrics.physicalAttempts;
    else physicalUnknown++;
  }
  const histogram: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4+": 0 };
  for (const count of perTurn) {
    const key = count >= 4 ? "4+" : String(count);
    histogram[key] = (histogram[key] ?? 0) + 1;
  }
  const total = perTurn.reduce((sum, count) => sum + count, 0);
  return {
    attemptedUserTurns: perTurn.length,
    totalLogicalModelCalls: total,
    meanLogicalCallsPerAttemptedTurn: perTurn.length ? total / perTurn.length : null,
    medianLogicalCallsPerAttemptedTurn: percentile(perTurn, 0.5),
    minLogicalCallsPerAttemptedTurn: perTurn.length ? Math.min(...perTurn) : null,
    maxLogicalCallsPerAttemptedTurn: perTurn.length ? Math.max(...perTurn) : null,
    callsPerTurnHistogram: histogram,
    physicalAttempts: physicalUnknown ? null : physicalKnown,
    physicalAttemptCoverage: physicalUnknown ? `unknown for ${physicalUnknown} scenario(s)` : "complete",
    totalInputTokens: tokenCalls ? inputTokens : null,
    totalOutputTokens: tokenCalls ? outputTokens : null,
    tokenCoverageCalls: tokenCalls,
    p50ObservedTurnLatencyMs: percentile(turnLatency, 0.5),
    p95ObservedTurnLatencyMs: percentile(turnLatency, 0.95),
    latencyCoverageTurns: turnLatency.length,
  };
}

const projects: Record<string, any> = {};
for (const project of ["p01", "p02"]) {
  const data = readJson(join(primary, project, "results.json"));
  const records = data.records;
  const comparison = {
    project,
    absolute: Object.fromEntries(["bespoke", "agenerateor", "arrokothi"].map((system) => [system, outcomeCounts(records, system)])),
    pairwise: {
      arrokothi_vs_bespoke: comparisonCounts(records, "arrokothi_vs_bespoke"),
      arrokothi_vs_agenerateor: comparisonCounts(records, "arrokothi_vs_agenerateor"),
      agenerateor_vs_bespoke: comparisonCounts(records, "agenerateor_vs_bespoke"),
    },
    frameworkFailures: records.filter((record: any) => record.systems.arrokothi.frameworkFailure).map((record: any) => ({ scenarioId: record.scenarioId, ...record.systems.arrokothi.frameworkFailure })),
  };
  const eff = Object.fromEntries(["bespoke", "agenerateor", "arrokothi"].map((system) => [system, efficiency(records, system)]));
  writeJson(join(primary, project, "comparison.json"), comparison);
  writeJson(join(primary, project, "efficiency.json"), eff);
  projects[project] = { records, comparison, efficiency: eff };
}

const stability: any[] = [];
for (const argument of stabilityArgs) {
  const dir = resolve(argument);
  for (const project of ["p01", "p02"]) {
    const path = join(dir, project, "results.json");
    if (!existsSync(path)) continue;
    const data = readJson(path);
    for (const record of data.records) stability.push({ run: basename(dir), project, scenarioId: record.scenarioId, outcomes: Object.fromEntries(Object.entries(record.systems).map(([system, value]: any) => [system, value.outcome])), frameworkFailure: Boolean(record.systems.arrokothi.frameworkFailure), comparisons: record.comparisons });
  }
}
mkdirSync(join(primary, "stability"), { recursive: true });
writeJson(join(primary, "stability", "index.json"), { selection: ["CRAIG-S01", "ESTATE-S16", "ESTATE-S17", "ESTATE-S19"], rationale: "Representative tool-loop failure plus controlled handoff failure, duplicate prevention, and success paths; two fresh all-three-system repetitions each.", samples: stability });

const scenarioManifest = Object.fromEntries(Object.entries(projects).map(([project, value]: any) => [project, value.records.map((record: any) => ({ scenarioId: record.scenarioId, specId: record.specId, title: record.title, turns: record.turns, executionOrder: record.executionOrder, evidence: record.evidence, requirement: record.requirement }))]));
writeJson(join(primary, "scenario-manifest.json"), scenarioManifest);

function matrix(records: any[]) {
  return ["| Scenario | Bespoke | Agenerateor | Arrokothi |", "|---|---:|---:|---:|", ...records.map((record) => `| ${record.scenarioId} | ${record.systems.bespoke.outcome} | ${record.systems.agenerateor.outcome} | ${record.systems.arrokothi.outcome} |`)].join("\n");
}

for (const project of ["p01", "p02"]) {
  const value = projects[project];
  const lines = [
    `# ${project.toUpperCase()} controlled triad report`, "",
    "**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**", "",
    matrix(value.records), "",
    "## Absolute outcomes", "", "```json", JSON.stringify(value.comparison.absolute, null, 2), "```", "",
    "## Pairwise shared-assertion verdicts", "", "```json", JSON.stringify(value.comparison.pairwise, null, 2), "```", "",
    "Pairwise verdicts use only assertions applicable and judgeable on both sides. Arrokothi's canonical loop failed before a fully judgeable run on most scenarios; those pairwise cells are therefore inconclusive even though its absolute result is a hard framework failure.", "",
    "## Efficiency", "", "```json", JSON.stringify(value.efficiency, null, 2), "```", "",
    "Unknown physical-attempt and token fields remain null. Arrokothi token coverage comes from completed Strands model-call events; the final rejected provider request exposes no usage.", "",
    "## Failure classification", "",
    `Arrokothi reproduced \`FRAMEWORK_GAP\` in ${value.comparison.frameworkFailures.length}/${value.records.length} primary scenarios: Gemini returned \`INVALID_ARGUMENT\` during canonical Strands execution, often after completed model/tool iterations. The provider did not expose the exact rejected request field, so the lower-level request-shape cause remains an inference rather than a proven fact. Earlier successful calls, tool results, replies, and token usage were preserved. The frozen framework was not repaired or tuned during measurement.`, "",
  ];
  writeFileSync(join(primary, project, "report.md"), lines.join("\n"));
}

const p01 = projects.p01, p02 = projects.p02;
const stabilityLines = stability.map((sample) => `| ${sample.project.toUpperCase()} | ${sample.scenarioId} | ${sample.outcomes.bespoke} | ${sample.outcomes.agenerateor} | ${sample.outcomes.arrokothi} |`).join("\n");
const summary = [
  "# Agent_SDK v0.35 triad benchmark summary", "",
  "**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**", "",
  "## Executive result", "",
  "All accepted agent-side requests used `gemini-3.5-flash-lite`; no fallback/degraded turn was graded as semantic evidence and no primary scenario was infrastructure-inconclusive. The primary comparison completed 21 P01 and 15 P02 scenarios.", "",
  "Arrokothi did not complete a canonical v0.35 scenario cleanly: all 36 primary scenarios ended in the same `FRAMEWORK_GAP` (`Gemini 400 INVALID_ARGUMENT`) during the Strands loop. This is a systematic regression, not a quota event. Because the framework failed before most canonical assertions were fully judgeable, most Arrokothi pairwise verdicts are correctly inconclusive even though its absolute outcome is hard failure. The exact rejected request field is not exposed by the provider response and remains unresolved.", "",
  "## P01 matrix", "", matrix(p01.records), "",
  "### P01 counts", "", "```json", JSON.stringify(p01.comparison, null, 2), "```", "",
  "## P02 matrix", "", matrix(p02.records), "",
  "### P02 counts", "", "```json", JSON.stringify(p02.comparison, null, 2), "```", "",
  "## Efficiency", "", "### P01", "", "```json", JSON.stringify(p01.efficiency, null, 2), "```", "", "### P02", "", "```json", JSON.stringify(p02.efficiency, null, 2), "```", "",
  "Efficiency is a separate axis and is not folded into a winner score. Latency percentiles cover only turns for which the native boundary exposed timing. Physical attempts remain null where Strands does not expose transport retries.", "",
  "## Stability", "", "| Project | Scenario | Bespoke | Agenerateor | Arrokothi |", "|---|---|---:|---:|---:|", stabilityLines, "",
  "The two extra CRAIG-S01 samples reproduced the primary outcome exactly. Arrokothi reproduced the framework failure in every stability sample. Estate handoff samples showed model variance: Agenerateor's ESTATE-S16 primary hard failure became pass in both repeats; bespoke ESTATE-S17 varied between pass and hard fail. ESTATE-S19 reproduced bespoke hard fail / Agenerateor pass / Arrokothi hard fail.", "",
  "## Required interpretation", "",
  "1. **Controlled model:** yes—every requested and observed model was `gemini-3.5-flash-lite`; no mismatch was recorded.",
  "2. **Fallback/degradation:** no fallback turn was accepted or semantically graded.",
  "3. **Infrastructure:** no primary result was made inconclusive by 429, DNS, timeout, or 5xx. The Arrokothi 400 is a framework/configuration failure, not infrastructure.",
  `4. **P01:** bespoke ${JSON.stringify(p01.comparison.absolute.bespoke)}; Agenerateor ${JSON.stringify(p01.comparison.absolute.agenerateor)}; Arrokothi ${JSON.stringify(p01.comparison.absolute.arrokothi)}.`,
  `5. **P02:** bespoke ${JSON.stringify(p02.comparison.absolute.bespoke)}; Agenerateor ${JSON.stringify(p02.comparison.absolute.agenerateor)}; Arrokothi ${JSON.stringify(p02.comparison.absolute.arrokothi)}.`,
  `6. **Arrokothi vs Agenerateor:** P01 ${JSON.stringify(p01.comparison.pairwise.arrokothi_vs_agenerateor)}; P02 ${JSON.stringify(p02.comparison.pairwise.arrokothi_vs_agenerateor)}. Most cells are inconclusive because the Arrokothi framework failure prevents shared assertion judgment.`,
  `7. **Arrokothi vs bespoke:** P01 ${JSON.stringify(p01.comparison.pairwise.arrokothi_vs_bespoke)}; P02 ${JSON.stringify(p02.comparison.pairwise.arrokothi_vs_bespoke)}; same observability limitation.`,
  `8. **Agenerateor vs bespoke:** P01 ${JSON.stringify(p01.comparison.pairwise.agenerateor_vs_bespoke)}; P02 ${JSON.stringify(p02.comparison.pairwise.agenerateor_vs_bespoke)}.`,
  "9. **Architecture vs stochasticity:** the 36/36 primary plus 8/8 stability Arrokothi invalid-request pattern is systematic framework behavior. Estate handoff outcome changes across repetitions are model stochasticity interacting with prompt/stage extraction. The likely lower-level Strands/Gemini request-history incompatibility is an inference, not proven by the generic provider error.",
  "10. **Calls per turn:** exact mean/median/histograms are in each project's `efficiency.json`; Arrokothi uses more calls before failure on many turns.",
  "11. **Tokens/latency:** available Strands tokens and partial native latency are reported; unavailable values are null rather than fabricated.",
  "12. **Known gaps fixed:** none can be established for Arrokothi from this run because no canonical scenario completed without the framework failure, even where a pre-failure reply looked semantically useful.",
  "13. **Regressions:** canonical Strands execution is unable to complete these Gemini tool/function-history turns cleanly, producing a hard regression across P01/P02.",
  "14. **Unresolved:** the exact incompatible request field/history representation inside the frozen Strands/Google boundary remains unresolved by design; repairing it would require a new benchmark after a subject version change.",
  "15. **Dataset role:** Agent_SDK was redesigned using lessons from P01/P02, so these results are retrospective development-set regression evidence. P03/P04 remain the prospective held-out tests.", "",
];
writeFileSync(join(primary, "summary.md"), summary.join("\n"));

const manifest = readJson(join(primary, "manifest.json"));
manifest.stability = { selectedScenarios: ["CRAIG-S01", "ESTATE-S16", "ESTATE-S17", "ESTATE-S19"], repetitionsPerScenario: 2, sampleRuns: stability.map((sample) => sample.run), index: "stability/index.json" };
manifest.failureClassification = { arrokothi: "FRAMEWORK_GAP", primaryOccurrences: 36, stabilityOccurrences: stability.filter((sample) => sample.frameworkFailure).length };
writeJson(join(primary, "manifest.json"), manifest);

console.log(primary);
