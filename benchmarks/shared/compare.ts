import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BenchmarkRun, Outcome } from "./types.ts";
import { RESULTS_DIR } from "./runner.ts";

/**
 * Compares an SDK run against the stored authoritative P01/P02 results.
 *
 * Two rules keep this honest:
 *
 *  1. A `harness_selfcheck` run is NEVER compared. It contains no measurement, so aligning it
 *     against a real result would manufacture a finding out of nothing.
 *  2. Only assertions judged on BOTH sides are counted. An assertion one side structurally cannot
 *     have is not a win for the other.
 *
 * The stored artifacts are read READ-ONLY from wherever the caller points this script. Nothing is
 * written back to them.
 */

export interface StoredAssertion {
  id: string;
  label?: string;
  severity?: "hard" | "soft";
  applicable?: boolean;
  passed?: boolean | null;
}

export interface StoredScenario {
  id: string;
  agenerateor?: { outcome?: string; assertions?: StoredAssertion[] };
  samples?: { agenerateor?: { outcome?: string; assertions?: StoredAssertion[] } }[];
}

export interface StoredRun {
  runId?: string;
  label?: string;
  results?: StoredScenario[];
}

export type Verdict = "sdk_better" | "baseline_better" | "tie" | "tie_both_fail" | "mixed" | "inconclusive";

export interface ScenarioComparison {
  id: string;
  sdkOutcome: Outcome | "missing";
  baselineOutcome: string;
  verdict: Verdict;
  shared: { id: string; severity: string; sdk: boolean | null; baseline: boolean | null }[];
  sdkWins: string[];
  baselineWins: string[];
  bothFail: string[];
  reason?: string;
}

/** The stored Craig format nests each run under `samples[]`; Estate stores it flat. */
function storedAssertions(scenario: StoredScenario): { outcome: string; assertions: StoredAssertion[] } {
  const flat = scenario.agenerateor;
  const sampled = scenario.samples?.[0]?.agenerateor;
  const source = flat ?? sampled;
  return { outcome: source?.outcome ?? "missing", assertions: source?.assertions ?? [] };
}

export function compareRuns(sdk: BenchmarkRun, baseline: StoredRun): ScenarioComparison[] {
  const storedById = new Map((baseline.results ?? []).map((r) => [r.id, r]));
  const comparisons: ScenarioComparison[] = [];

  for (const result of sdk.results) {
    const stored = storedById.get(result.id);
    if (!stored) {
      comparisons.push({
        id: result.id,
        sdkOutcome: result.outcome,
        baselineOutcome: "missing",
        verdict: "inconclusive",
        shared: [],
        sdkWins: [],
        baselineWins: [],
        bothFail: [],
        reason: "no scenario with this id in the stored authoritative run",
      });
      continue;
    }

    const { outcome: baselineOutcome, assertions } = storedAssertions(stored);
    const baselineById = new Map(assertions.map((a) => [a.id, a]));

    if (result.outcome === "inconclusive" || baselineOutcome === "inconclusive") {
      comparisons.push({
        id: result.id,
        sdkOutcome: result.outcome,
        baselineOutcome,
        verdict: "inconclusive",
        shared: [],
        sdkWins: [],
        baselineWins: [],
        bothFail: [],
        reason: "one or both sides are inconclusive",
      });
      continue;
    }

    // Only assertions BOTH sides actually judged.
    const shared = result.assertions
      .filter((a) => a.applicable && baselineById.get(a.id)?.applicable === true)
      .map((a) => ({
        id: a.id,
        severity: a.severity,
        sdk: a.passed,
        baseline: baselineById.get(a.id)?.passed ?? null,
      }));

    if (!shared.length) {
      comparisons.push({
        id: result.id,
        sdkOutcome: result.outcome,
        baselineOutcome,
        verdict: "inconclusive",
        shared,
        sdkWins: [],
        baselineWins: [],
        bothFail: [],
        reason: "no assertion was judgeable on both sides",
      });
      continue;
    }

    const sdkWins = shared.filter((s) => s.sdk === true && s.baseline === false).map((s) => s.id);
    const baselineWins = shared.filter((s) => s.sdk === false && s.baseline === true).map((s) => s.id);
    const bothFail = shared.filter((s) => s.sdk === false && s.baseline === false).map((s) => s.id);

    let verdict: Verdict = "tie";
    if (sdkWins.length && !baselineWins.length) verdict = "sdk_better";
    else if (baselineWins.length && !sdkWins.length) verdict = "baseline_better";
    else if (sdkWins.length && baselineWins.length) verdict = "mixed";
    else if (bothFail.length) verdict = "tie_both_fail";

    comparisons.push({ id: result.id, sdkOutcome: result.outcome, baselineOutcome, verdict, shared, sdkWins, baselineWins, bothFail });
  }

  return comparisons;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

if (process.argv.includes("--help") || process.argv.length < 3) {
  console.log(
    [
      "usage: node benchmarks/shared/compare.ts --sdk=<file> --baseline=<path>",
      "",
      "  --sdk=       an SDK result file in benchmarks/results (name or full path).",
      "  --baseline=  path to the stored authoritative result JSON. Read-only.",
      "",
      "A harness_selfcheck run is refused: it contains no measurement to compare.",
    ].join("\n"),
  );
  process.exit(0);
}

const sdkArg = arg("sdk");
const baselineArg = arg("baseline");
if (!sdkArg || !baselineArg) {
  console.error("both --sdk= and --baseline= are required (see --help)");
  process.exit(1);
}

const sdkPath = existsSync(sdkArg) ? sdkArg : join(RESULTS_DIR, sdkArg);
if (!existsSync(sdkPath)) {
  console.error(`SDK result not found: ${sdkPath}`);
  process.exit(1);
}
if (!existsSync(baselineArg)) {
  console.error(`baseline result not found: ${baselineArg}`);
  process.exit(1);
}

const sdkRun = JSON.parse(readFileSync(sdkPath, "utf8")) as BenchmarkRun;

if (sdkRun.mode !== "live") {
  console.error(
    `\nRefusing to compare: "${sdkPath}" has mode "${sdkRun.mode}".\n` +
      "A self-check contains no measurement, so comparing it would manufacture a finding out of nothing.\n" +
      "Produce a live run first:  node benchmarks/p0X-.../run.ts --live\n",
  );
  process.exit(2);
}

const baselineRun = JSON.parse(readFileSync(baselineArg, "utf8")) as StoredRun;
const comparisons = compareRuns(sdkRun, baselineRun);

const tally: Record<Verdict, number> = { sdk_better: 0, baseline_better: 0, tie: 0, tie_both_fail: 0, mixed: 0, inconclusive: 0 };
for (const c of comparisons) tally[c.verdict]++;

console.log(`\n${sdkRun.project}  SDK "${sdkRun.label}"  vs  baseline "${baselineRun.label ?? baselineArg}"\n`);
for (const c of comparisons) {
  const detail =
    c.reason ?? `${c.shared.length} shared assertions` + (c.sdkWins.length ? `; sdk+: ${c.sdkWins.join(",")}` : "") + (c.baselineWins.length ? `; baseline+: ${c.baselineWins.join(",")}` : "");
  console.log(`  ${c.id.padEnd(14)} ${c.verdict.padEnd(16)} sdk=${String(c.sdkOutcome).padEnd(12)} baseline=${c.baselineOutcome.padEnd(12)} ${detail}`);
}
console.log(`\n  ${JSON.stringify(tally)}\n`);

const outPath = join(RESULTS_DIR, `comparison-${sdkRun.project.toLowerCase()}.json`);
writeFileSync(
  outPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sdkRun: { runId: sdkRun.runId, label: sdkRun.label, mode: sdkRun.mode, provider: sdkRun.provider },
      baseline: { path: baselineArg, runId: baselineRun.runId, label: baselineRun.label },
      tally,
      comparisons,
      caveat:
        "Only assertions judged on BOTH sides are counted. Detector semantics were ported from the " +
        "canonical artifacts; any divergence between the two harnesses is a threat to comparability " +
        "and must be inspected manually before a headline claim is made.",
    },
    null,
    2,
  )}\n`,
);
console.log(`  written: ${outPath}\n`);
