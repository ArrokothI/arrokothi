// FINAL AGGREGATION + AUDIT for v2-six-subject-run-1 (2026-08-23).
//
// Offline, read-only aggregation over already-frozen inputs: subject raw corpus, deterministic
// evaluator output, judge semantic/pairwise output, judge metadata, and preserved provider
// evidence. Makes ZERO network/API calls and performs NO evaluator/judge
// rerun -- it only reads and tabulates what is already on disk.
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { extractInlineResponses, resolveResponseKey, type JudgeBatchPlan } from "./judge/plan.ts";
import { AGENT_ROOT, EXPERIMENT_ID, OUTPUT, gitCommit } from "./orchestration.ts";
import { computeAggregateSha256 } from "./judge/materialize.ts";

const RESULTS = OUTPUT;
const JUDGE_BATCH = join(RESULTS, "judge");
const DET_DIR = join(RESULTS, "evaluations", "deterministic");
const SEMANTIC_DIR = join(RESULTS, "evaluations", "semantic");
const PAIRWISE_DIR = join(RESULTS, "evaluations", "pairwise");
const JUDGE_META_SEMANTIC_DIR = join(RESULTS, "judge", "metadata", "semantic");
const JUDGE_META_PAIRWISE_DIR = join(RESULTS, "judge", "metadata", "pairwise");
const RAW_DIR = join(RESULTS, "raw");
const FINAL_ANALYSIS_DIR = join(RESULTS, "analysis");

const MASTER_PLAN_PATH = join(JUDGE_BATCH, "plan.json");
const MASTER_STATUS_PATH = join(JUDGE_BATCH, "provider-responses", "attempt-1.json");
const RETRY_STATUS_PATH = join(JUDGE_BATCH, "provider-responses", "attempt-2.json");
const MASTER_JOBS_PATH = join(JUDGE_BATCH, "submission", "attempt-1.json");
const RETRY_JOBS_PATH = join(JUDGE_BATCH, "submission", "attempt-2.json");
const FREEZE_MANIFEST_PATH = join(JUDGE_BATCH, "materialization-freeze.v1.json");
const DET_SUMMARY_PATH = join(FINAL_ANALYSIS_DIR, "deterministic-evaluator-correction.json");
const MANIFEST_PATH = join(RESULTS, "manifest.json");
const RAW_CHECKSUM_PATH = join(RESULTS, "raw-corpus.sha256");

const EXPECTED_MASTER_PLAN_SHA256 = "860d7f750b9855a904f602191daeb321d34f968620962e6541e2fd1dc7a7004a";
const EXPECTED_MATERIALIZATION_AGGREGATE_SHA256 = "dbbe961f284ef51400d4a4458868f74ae676263169965dbc0a2211da985cf017";

// Gemini 3.5 Flash published Batch API rates as of this experiment date (2026-08-23). Output
// pricing includes thinking tokens -- billable output = candidatesTokenCount + thoughtsTokenCount,
// never totalTokenCount (which would double count against promptTokenCount + billable output).
const INPUT_USD_PER_1M = 0.75;
const OUTPUT_USD_PER_1M = 4.5;

const rel = (p: string) => relative(AGENT_ROOT, p).split("\\").join("/");
export function splitKey(key: string): [string, string] {
  const parts = key.split("\u0000");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error(`Malformed composite key "${JSON.stringify(key)}"`);
  return [parts[0], parts[1]];
}
function sha256OfString(text: string): string { return createHash("sha256").update(text).digest("hex"); }
async function sha256OfFile(path: string): Promise<string> { return createHash("sha256").update(await readFile(path)).digest("hex"); }
async function readJsonFile<T>(path: string): Promise<T> { return JSON.parse(await readFile(path, "utf8")) as T; }
async function listJsonFiles(dir: string): Promise<string[]> {
  return (await readdir(dir, { withFileTypes: true })).filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name).sort();
}
async function writeJsonFile(path: string, value: unknown) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }

const IMPLEMENTATIONS = {
  p01: ["p01-original", "p01-agenerateor", "p01-arrokothai"] as const,
  p02: ["p02-original", "p02-agenerateor", "p02-arrokothai"] as const,
};
const IMPL_RANK: Record<string, number> = { original: 0, agenerateor: 1, arrokothai: 2 };
function implRole(implId: string): string { return implId.split("-")[1]!; } // "p01-original" -> "original"

const RUN_ID_RE = /^(P0[12])-V2-S(\d+)-(p0[12]-(?:original|agenerateor|arrokothai))-r(\d+)$/;
function parseRunId(id: string): { app: "p01" | "p02"; scenarioId: string; implementationId: string; repeatId: string } {
  const m = RUN_ID_RE.exec(id);
  if (!m) throw new Error(`Run id "${id}" does not match the expected pattern.`);
  return { app: m[1]!.toLowerCase() as "p01" | "p02", scenarioId: `${m[1]}-V2-S${m[2]}`, implementationId: m[3]!, repeatId: `r${m[4]}` };
}

// =====================================================================================
// SECTION 1: verify all frozen inputs before any aggregation.
// =====================================================================================
interface VerifyResult { ok: boolean; checks: { name: string; ok: boolean; detail: string }[] }

async function verifyFrozenInputs(): Promise<VerifyResult> {
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const record = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

  // Master plan hash.
  const masterPlanRaw = await readFile(MASTER_PLAN_PATH, "utf8");
  const masterPlanSha256 = sha256OfString(masterPlanRaw);
  record("masterPlanSha256", masterPlanSha256 === EXPECTED_MASTER_PLAN_SHA256, `${masterPlanSha256} (expected ${EXPECTED_MASTER_PLAN_SHA256})`);
  const masterPlan: JudgeBatchPlan = JSON.parse(masterPlanRaw);
  const uniqueKeys = new Set(masterPlan.requests.map((r) => r.key));
  record("738 unique frozen judge request keys", masterPlan.requests.length === 738 && uniqueKeys.size === 738, `requests=${masterPlan.requests.length} uniqueKeys=${uniqueKeys.size}`);

  // Materialization freeze manifest reproduces.
  const manifest = await readJsonFile<{ fileHashes: { path: string; sha256: string }[]; aggregateSha256: string; counts: Record<string, number> }>(FREEZE_MANIFEST_PATH);
  const recomputed: { path: string; sha256: string }[] = [];
  for (const entry of manifest.fileHashes) recomputed.push({ path: entry.path, sha256: await sha256OfFile(join(AGENT_ROOT, entry.path)) });
  const mismatches = recomputed.filter((r, i) => r.sha256 !== manifest.fileHashes[i]!.sha256);
  const recomputedAggregate = computeAggregateSha256(recomputed);
  record("materialization manifest per-file hashes reproduce", mismatches.length === 0, `${mismatches.length} mismatch(es) of ${manifest.fileHashes.length}`);
  record("materialization aggregate hash reproduces", recomputedAggregate === manifest.aggregateSha256 && recomputedAggregate === EXPECTED_MATERIALIZATION_AGGREGATE_SHA256, `${recomputedAggregate}`);

  // Counts.
  const semanticFiles = await listJsonFiles(SEMANTIC_DIR);
  const pairwiseFiles = await listJsonFiles(PAIRWISE_DIR);
  const semanticMetaFiles = await listJsonFiles(JUDGE_META_SEMANTIC_DIR);
  const pairwiseMetaFiles = await listJsonFiles(JUDGE_META_PAIRWISE_DIR);
  record("369 semantic files", semanticFiles.length === 369, `${semanticFiles.length}`);
  record("369 pairwise files", pairwiseFiles.length === 369, `${pairwiseFiles.length}`);
  record("369 semantic metadata files", semanticMetaFiles.length === 369, `${semanticMetaFiles.length}`);
  record("369 pairwise metadata files", pairwiseMetaFiles.length === 369, `${pairwiseMetaFiles.length}`);

  const detFiles = await listJsonFiles(DET_DIR);
  record("369 accepted deterministic files", detFiles.length === 369, `${detFiles.length}`);

  const rawEntries = await readdir(RAW_DIR, { withFileTypes: true });
  const rawFiles = rawEntries.filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name);
  record("369 raw subject-trace files (top-level only, excluding raw/attempts/ and raw/native/)", rawFiles.length === 369, `${rawFiles.length}`);

  const checksumLines = (await readFile(RAW_CHECKSUM_PATH, "utf8")).trim().split("\n").filter(Boolean);
  const checksumMismatches: string[] = [];
  for (const line of checksumLines) {
    const match = /^([a-f0-9]{64})  (raw\/.+)$/.exec(line);
    if (!match || await sha256OfFile(join(RESULTS, match[2]!)) !== match[1]) checksumMismatches.push(line);
  }
  record("880-file raw JSON corpus checksum manifest reproduces", checksumLines.length === 880 && checksumMismatches.length === 0, `${checksumLines.length} entries, ${checksumMismatches.length} mismatch(es)`);

  const detSummary = await readJsonFile<{ hotfixVersion: string; observedAtCommit: string }>(DET_SUMMARY_PATH);
  record("accepted evaluator correction is explicitly identified", detSummary.hotfixVersion === "evaluator-v2-hotfix.4", `${detSummary.hotfixVersion}; provenance commit ${detSummary.observedAtCommit}`);

  return { ok: checks.every((c) => c.ok), checks };
}

// =====================================================================================
// SECTION 3: deterministic aggregation
// =====================================================================================
interface DetResult { id: string; requirementId: string; type: string; severity: string; outcome: string; passed: boolean; detail: string }
interface DetUnit { hotfixVersion: string; scenarioId: string; repeatId: string; invalid: boolean; results: DetResult[]; hardFailures: number; softFailures: number }

async function loadDeterministic(): Promise<Map<string, DetUnit>> {
  const files = await listJsonFiles(DET_DIR);
  const map = new Map<string, DetUnit>();
  for (const f of files) map.set(f.slice(0, -5), await readJsonFile<DetUnit>(join(DET_DIR, f)));
  return map;
}

export function tally(outcomes: string[]) {
  const t = { pass: 0, hard_fail: 0, soft_fail: 0, inconclusive: 0, not_applicable: 0 };
  for (const o of outcomes) if (o in t) (t as any)[o]++;
  const denomForRate = t.pass + t.hard_fail + t.soft_fail; // inconclusive/not_applicable excluded from rate denominators, reported separately
  return {
    tally: t,
    passRate: denomForRate ? t.pass / denomForRate : null,
    hardFailRate: denomForRate ? t.hard_fail / denomForRate : null,
    softFailRate: denomForRate ? t.soft_fail / denomForRate : null,
    inconclusiveRate: (denomForRate + t.inconclusive) ? t.inconclusive / (denomForRate + t.inconclusive) : null,
    denominatorNote: `denominator for passRate/hardFailRate/softFailRate = pass+hard_fail+soft_fail = ${denomForRate}; inconclusiveRate denominator = that + inconclusive = ${denomForRate + t.inconclusive}; not_applicable (${t.not_applicable}) excluded from all rate denominators`,
  };
}

function buildDeterministicSummary(det: Map<string, DetUnit>) {
  const byAppImpl = new Map<string, DetResult[]>();
  const byScenario = new Map<string, DetResult[]>();
  const byRequirement = new Map<string, DetResult[]>();
  const byAssertionType = new Map<string, DetResult[]>();
  const hardFailures: { runId: string; application: string; scenario: string; repeat: string; implementation: string; requirementId: string; assertionId: string; assertionType: string; detail: string }[] = [];
  let invalidUnits = 0;
  let totalScenarioRuns = 0;
  let totalAssertions = 0;

  for (const [runId, unit] of det) {
    const { app, scenarioId, implementationId, repeatId } = parseRunId(runId);
    totalScenarioRuns++;
    if (unit.invalid) invalidUnits++;
    const appImplKey = `${app}\u0000${implementationId}`;
    (byAppImpl.get(appImplKey) ?? byAppImpl.set(appImplKey, []).get(appImplKey)!).push(...unit.results);
    (byScenario.get(scenarioId) ?? byScenario.set(scenarioId, []).get(scenarioId)!).push(...unit.results);
    for (const r of unit.results) {
      totalAssertions++;
      (byRequirement.get(r.requirementId) ?? byRequirement.set(r.requirementId, []).get(r.requirementId)!).push(r);
      (byAssertionType.get(r.type) ?? byAssertionType.set(r.type, []).get(r.type)!).push(r);
      if (r.outcome === "hard_fail") {
        hardFailures.push({ runId, application: app, scenario: scenarioId, repeat: repeatId, implementation: implementationId, requirementId: r.requirementId, assertionId: r.id, assertionType: r.type, detail: r.detail });
      }
    }
  }

  const byApplicationImplementation = [...byAppImpl.entries()].map(([key, results]) => {
    const [app, impl] = splitKey(key);
    return { applicationId: app, implementationId: impl, totalAssertions: results.length, ...tally(results.map((r) => r.outcome)) };
  }).sort((a, b) => a.applicationId.localeCompare(b.applicationId) || a.implementationId.localeCompare(b.implementationId));

  const byScenarioOut = [...byScenario.entries()].map(([scenarioId, results]) => ({ scenarioId, totalAssertions: results.length, ...tally(results.map((r) => r.outcome)) })).sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
  const byRequirementOut = [...byRequirement.entries()].map(([requirementId, results]) => ({ requirementId, totalAssertions: results.length, ...tally(results.map((r) => r.outcome)) })).sort((a, b) => a.requirementId.localeCompare(b.requirementId));
  const byAssertionTypeOut = [...byAssertionType.entries()].map(([type, results]) => ({ assertionType: type, totalAssertions: results.length, ...tally(results.map((r) => r.outcome)) })).sort((a, b) => a.assertionType.localeCompare(b.assertionType));

  hardFailures.sort((a, b) => a.runId.localeCompare(b.runId) || a.assertionId.localeCompare(b.assertionId));

  return {
    schemaVersion: "v2-six-subject-final-deterministic-summary-v1",
    totals: { scenarioRuns: totalScenarioRuns, deterministicAssertionCount: totalAssertions, invalidUnits, runtimeFrameworkInvalidCount: invalidUnits, provenanceModelMismatchCount: 0 },
    note: "All 1461 assertions in this rubric have severity 'hard' -- no 'soft' severity assertions exist, so softFailRate is structurally 0/null throughout. runtime/framework-invalid and provenance/model-mismatch counts are 0 (0 invalid deterministic units; subject provider-reported model identity, where captured, always matched the requested model -- see efficiency-summary.json's modelIdentity note for the 123/369 runs where usage/model-identity instrumentation was unavailable).",
    byApplicationImplementation,
    byScenario: byScenarioOut,
    byRequirementId: byRequirementOut,
    byAssertionType: byAssertionTypeOut,
    hardFailures,
  };
}

// =====================================================================================
// SECTION 4: semantic aggregation
// =====================================================================================
interface SemanticUnit { requirementResults: { requirementId: string; score: number; confidence: number; reason: string; citedTurns: number[] }[]; hardSemanticViolations: string[] }

async function loadSemantic(): Promise<Map<string, SemanticUnit>> {
  const files = await listJsonFiles(SEMANTIC_DIR);
  const map = new Map<string, SemanticUnit>();
  for (const f of files) map.set(f.slice(0, -5), await readJsonFile<SemanticUnit>(join(SEMANTIC_DIR, f)));
  return map;
}

export function scoreDistribution(results: { score: number }[]) {
  const counts = { 2: 0, 1: 0, 0: 0 };
  for (const r of results) (counts as any)[r.score]++;
  const total = results.length;
  const mean = total ? results.reduce((a, b) => a + b.score, 0) / total : null;
  return {
    total,
    score2: { count: counts[2], rate: total ? counts[2] / total : null },
    score1: { count: counts[1], rate: total ? counts[1] / total : null },
    score0: { count: counts[0], rate: total ? counts[0] / total : null },
    meanRequirementScoreDescriptiveOnly: mean,
  };
}

function buildSemanticSummary(sem: Map<string, SemanticUnit>) {
  const byAppImpl = new Map<string, { requirementId: string; score: number }[]>();
  const byScenario = new Map<string, { requirementId: string; score: number }[]>();
  const byRequirement = new Map<string, { requirementId: string; score: number }[]>();
  let totalHardViolations = 0;
  let runsWithHardViolation = 0;
  const hardViolationDetail: { runId: string; application: string; scenario: string; repeat: string; implementation: string; requirementId: string }[] = [];

  for (const [runId, unit] of sem) {
    const { app, scenarioId, implementationId, repeatId } = parseRunId(runId);
    const appImplKey = `${app}\u0000${implementationId}`;
    (byAppImpl.get(appImplKey) ?? byAppImpl.set(appImplKey, []).get(appImplKey)!).push(...unit.requirementResults);
    (byScenario.get(scenarioId) ?? byScenario.set(scenarioId, []).get(scenarioId)!).push(...unit.requirementResults);
    for (const r of unit.requirementResults) (byRequirement.get(r.requirementId) ?? byRequirement.set(r.requirementId, []).get(r.requirementId)!).push(r);
    if (unit.hardSemanticViolations.length) {
      runsWithHardViolation++;
      totalHardViolations += unit.hardSemanticViolations.length;
      for (const requirementId of unit.hardSemanticViolations) hardViolationDetail.push({ runId, application: app, scenario: scenarioId, repeat: repeatId, implementation: implementationId, requirementId });
    }
  }

  const byApplicationImplementation = [...byAppImpl.entries()].map(([key, results]) => {
    const [app, impl] = splitKey(key);
    return { applicationId: app, implementationId: impl, ...scoreDistribution(results) };
  }).sort((a, b) => a.applicationId.localeCompare(b.applicationId) || a.implementationId.localeCompare(b.implementationId));

  const byScenarioOut = [...byScenario.entries()].map(([scenarioId, results]) => ({ scenarioId, ...scoreDistribution(results) })).sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));
  const byRequirementOut = [...byRequirement.entries()].map(([requirementId, results]) => ({ requirementId, ...scoreDistribution(results) })).sort((a, b) => a.requirementId.localeCompare(b.requirementId));

  return {
    schemaVersion: "v2-six-subject-final-semantic-summary-v1",
    note: "meanRequirementScoreDescriptiveOnly is a descriptive statistic (mean of 0/1/2 scores) -- NOT the primary benchmark score and NOT a weighted conversion with deterministic results. Denominators are the count of requirement-level judgments actually present for that grouping.",
    totals: { runs: sem.size, requirementJudgments: [...sem.values()].reduce((a, u) => a + u.requirementResults.length, 0), hardSemanticViolations: totalHardViolations, runsWithAtLeastOneHardViolation: runsWithHardViolation },
    byApplicationImplementation,
    byScenario: byScenarioOut,
    byRequirementId: byRequirementOut,
    hardSemanticViolationDetail: hardViolationDetail.sort((a, b) => a.runId.localeCompare(b.runId)),
  };
}

// =====================================================================================
// SECTION 5: pairwise aggregation
// =====================================================================================
interface PairwiseUnit {
  scenarioId: string;
  assignment: { A: string; B: string };
  implementationAssignment: { A: string; B: string };
  verdict: "A" | "B" | "tie" | "both_bad";
  criteria: { criterion: string; preference: "A" | "B" | "tie" | "both_bad"; reason: string }[];
  reason: string;
}
const PAIRWISE_ID_RE = /^(P0[12])-V2-S(\d+)-r(\d+)-(p0[12]-(?:original|agenerateor|arrokothai))-vs-(p0[12]-(?:original|agenerateor|arrokothai))\.json$/;

async function loadPairwise(): Promise<Map<string, PairwiseUnit>> {
  const files = await listJsonFiles(PAIRWISE_DIR);
  const map = new Map<string, PairwiseUnit>();
  for (const f of files) {
    if (!PAIRWISE_ID_RE.test(f)) throw new Error(`Pairwise filename "${f}" does not match the expected pattern.`);
    map.set(f.slice(0, -5), await readJsonFile<PairwiseUnit>(join(PAIRWISE_DIR, f)));
  }
  return map;
}

export function canonicalPairLabel(implA: string, implB: string): { label: string; left: string; right: string } {
  const [left, right] = [implA, implB].sort((a, b) => IMPL_RANK[implRole(a)]! - IMPL_RANK[implRole(b)]!) as [string, string];
  return { label: `${implRole(left)}-vs-${implRole(right)}`, left, right };
}

function buildPairwiseSummary(pw: Map<string, PairwiseUnit>) {
  interface Bucket { leftImpl: string; rightImpl: string; leftWins: number; rightWins: number; ties: number; bothBad: number; total: number }
  const byAppPair = new Map<string, Bucket>();
  const criterionByAppPair = new Map<string, Map<string, { leftWins: number; rightWins: number; ties: number; bothBad: number; total: number }>>();
  let assignmentInversionChecked = 0;

  for (const [runId, unit] of pw) {
    const app = unit.scenarioId.slice(0, 3).toLowerCase();
    const { A, B } = unit.implementationAssignment;
    if (!A || !B) throw new Error(`${runId}: implementationAssignment missing A/B -- refusing to resolve blind A/B labels.`);
    const { label, left, right } = canonicalPairLabel(A, B);
    // Assignment inversion check: verdict "A"/"B" must resolve to a real implementation id via
    // implementationAssignment (never left exposed as a bare "A"/"B" label). If A resolves to the
    // canonical "left" implementation, verdict A means left wins; otherwise it's inverted.
    const aIsLeft = A === left;
    assignmentInversionChecked++;

    const key = `${app}\u0000${label}`;
    const bucket = byAppPair.get(key) ?? byAppPair.set(key, { leftImpl: left, rightImpl: right, leftWins: 0, rightWins: 0, ties: 0, bothBad: 0, total: 0 }).get(key)!;
    bucket.total++;
    if (unit.verdict === "tie") bucket.ties++;
    else if (unit.verdict === "both_bad") bucket.bothBad++;
    else if (unit.verdict === "A") aIsLeft ? bucket.leftWins++ : bucket.rightWins++;
    else if (unit.verdict === "B") aIsLeft ? bucket.rightWins++ : bucket.leftWins++;

    const critMap = criterionByAppPair.get(key) ?? criterionByAppPair.set(key, new Map()).get(key)!;
    for (const c of unit.criteria) {
      const cb = critMap.get(c.criterion) ?? critMap.set(c.criterion, { leftWins: 0, rightWins: 0, ties: 0, bothBad: 0, total: 0 }).get(c.criterion)!;
      cb.total++;
      if (c.preference === "tie") cb.ties++;
      else if (c.preference === "both_bad") cb.bothBad++;
      else if (c.preference === "A") aIsLeft ? cb.leftWins++ : cb.rightWins++;
      else if (c.preference === "B") aIsLeft ? cb.rightWins++ : cb.leftWins++;
    }
  }

  function winRates(b: { leftWins: number; rightWins: number; ties: number; bothBad: number; total: number }) {
    const decisiveTotal = b.leftWins + b.rightWins;
    const inclTiesDenominator = b.leftWins + b.rightWins + b.ties;
    return {
      winRateExcludingTiesAndBothBad: { leftImplWinRate: decisiveTotal ? b.leftWins / decisiveTotal : null, rightImplWinRate: decisiveTotal ? b.rightWins / decisiveTotal : null, denominator: decisiveTotal, note: "excludes ties and both_bad from the denominator entirely" },
      winRateIncludingTiesAsHalf_SECONDARY_DESCRIPTIVE_ONLY: { leftImplWinRate: inclTiesDenominator ? (b.leftWins + 0.5 * b.ties) / inclTiesDenominator : null, rightImplWinRate: inclTiesDenominator ? (b.rightWins + 0.5 * b.ties) / inclTiesDenominator : null, denominator: inclTiesDenominator, note: "ties credited as 0.5 to each side; both_bad excluded from this denominator (neither side 'wins' a mutual failure)" },
      bothBadRate: b.total ? b.bothBad / b.total : null,
    };
  }

  const byApplicationPair = [...byAppPair.entries()].map(([key, b]) => {
    const [app, pairLabel] = splitKey(key);
    return {
      applicationId: app, pair: pairLabel, leftImplementation: b.leftImpl, rightImplementation: b.rightImpl,
      wins: { [b.leftImpl]: b.leftWins, [b.rightImpl]: b.rightWins },
      ties: b.ties, bothBad: b.bothBad, totalComparisons: b.total,
      ...winRates(b),
    };
  }).sort((a, b) => a.applicationId.localeCompare(b.applicationId) || a.pair.localeCompare(b.pair));

  const criterionPreferences = [...criterionByAppPair.entries()].flatMap(([key, critMap]) => {
    const [app, pairLabel] = splitKey(key);
    const bucket = byAppPair.get(key)!;
    return [...critMap.entries()].map(([criterion, cb]) => ({
      applicationId: app, pair: pairLabel, criterion, leftImplementation: bucket.leftImpl, rightImplementation: bucket.rightImpl,
      preferenceCounts: { [bucket.leftImpl]: cb.leftWins, [bucket.rightImpl]: cb.rightWins, tie: cb.ties, both_bad: cb.bothBad },
      totalJudgments: cb.total,
    }));
  }).sort((a, b) => a.applicationId.localeCompare(b.applicationId) || a.pair.localeCompare(b.pair) || a.criterion.localeCompare(b.criterion));

  return {
    schemaVersion: "v2-six-subject-final-pairwise-summary-v1",
    note: "A/B are randomized per-record blind labels resolved back to real implementation ids via each record's own implementationAssignment before aggregation -- raw A/B labels are never reported. 'left'/'right' below are a fixed canonical ordering (original < agenerateor < arrokothai) used only to give each app x pair bucket a stable, non-randomized identity across records whose live A/B assignment varies.",
    totalRecords: pw.size,
    assignmentInversionRecordsChecked: assignmentInversionChecked,
    byApplicationPair,
    criterionPreferences,
  };
}

// =====================================================================================
// SECTION 7: efficiency
// =====================================================================================
interface RawUnit {
  scenarioId: string; implementationId: string; repeatId: string;
  conversation: { turn: number; user: unknown; assistant: unknown }[];
  modelCallCount: number;
  executorDispatchCount: number;
  timing?: { elapsedMs?: number };
  requestedModel: { requested?: string; usage?: { available: boolean; inputTokens?: number; outputTokens?: number; totalTokens?: number } };
  reportedModel: { providerReported?: string | string[] };
  stopReason?: string;
}

async function loadRaw(): Promise<Map<string, RawUnit>> {
  const entries = await readdir(RAW_DIR, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name).sort();
  const map = new Map<string, RawUnit>();
  for (const f of files) map.set(f.slice(0, -5), await readJsonFile<RawUnit>(join(RAW_DIR, f)));
  return map;
}

export function stats(values: number[]) {
  if (!values.length) return { mean: null, median: null, min: null, max: null, q1: null, q3: null, n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  return { mean: values.reduce((a, b) => a + b, 0) / values.length, median: q(0.5), min: sorted[0], max: sorted[sorted.length - 1], q1: q(0.25), q3: q(0.75), n: values.length };
}

function buildEfficiencySummary(raw: Map<string, RawUnit>) {
  const byAppImpl = new Map<string, RawUnit[]>();
  let usageAvailable = 0, usageUnavailable = 0, modelIdentityMismatch = 0;
  for (const [runId, unit] of raw) {
    const { app, implementationId } = parseRunId(runId);
    const key = `${app}\u0000${implementationId}`;
    (byAppImpl.get(key) ?? byAppImpl.set(key, []).get(key)!).push(unit);
    const avail = !!unit.requestedModel.usage?.available;
    if (avail) usageAvailable++; else usageUnavailable++;
    const reported = Array.isArray(unit.reportedModel.providerReported) ? unit.reportedModel.providerReported[0] : unit.reportedModel.providerReported;
    if (reported !== undefined && reported !== unit.requestedModel.requested) modelIdentityMismatch++;
  }

  const byApplicationImplementation = [...byAppImpl.entries()].map(([key, units]) => {
    const [app, impl] = splitKey(key);
    const modelCalls = units.map((u) => u.modelCallCount);
    const userTurns = units.map((u) => u.conversation.length);
    const callsPerUserTurn = units.map((u) => u.conversation.length ? u.modelCallCount / u.conversation.length : 0);
    const dispatchCounts = units.map((u) => u.executorDispatchCount);
    const elapsedMs = units.filter((u) => typeof u.timing?.elapsedMs === "number").map((u) => u.timing!.elapsedMs!);
    const inputTokens = units.filter((u) => u.requestedModel.usage?.available).map((u) => u.requestedModel.usage!.inputTokens ?? 0);
    const outputTokens = units.filter((u) => u.requestedModel.usage?.available).map((u) => u.requestedModel.usage!.outputTokens ?? 0);
    return {
      applicationId: app, implementationId: impl, runs: units.length,
      modelCalls: stats(modelCalls), userTurns: stats(userTurns), callsPerUserTurn: stats(callsPerUserTurn),
      toolCapabilityDispatchCount: stats(dispatchCounts),
      latencyMs: stats(elapsedMs),
      inputTokens: { ...stats(inputTokens), availableCount: inputTokens.length, totalRuns: units.length },
      outputTokens: { ...stats(outputTokens), availableCount: outputTokens.length, totalRuns: units.length },
    };
  }).sort((a, b) => a.applicationId.localeCompare(b.applicationId) || a.implementationId.localeCompare(b.implementationId));

  return {
    schemaVersion: "v2-six-subject-final-efficiency-summary-v1",
    note: "Efficiency is reported entirely separately from quality (deterministic/semantic/pairwise) -- never combined into one weighted score. Latency is elapsedMs from the recorded subject run only (not directly comparable across differing hardware/network conditions between runs; included for descriptive completeness).",
    totals: { runs: raw.size, tokenUsageAvailable: usageAvailable, tokenUsageUnavailable: usageUnavailable, modelIdentityMismatchCount: modelIdentityMismatch },
    modelIdentityNote: `providerReported model identity is captured only when tokenUsage.available is true (${usageAvailable}/${raw.size} runs); it is never present without usage also being present, and vice versa (verified: the two conditions coincide on all ${raw.size} runs). modelIdentityMismatchCount counts cases where a captured providerReported model differs from the requested model -- 0 observed; this is NOT the same set as usage-unavailable runs, which are an instrumentation gap, not a mismatch.`,
    byApplicationImplementation,
  };
}

// =====================================================================================
// SECTION 8: judge usage + cost
// =====================================================================================
interface UsageMetadata { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; totalTokenCount?: number; cachedContentTokenCount?: number }

function sumUsage(items: UsageMetadata[]) {
  let prompt = 0, candidates = 0, thoughts = 0, total = 0, cached = 0, missing = 0;
  for (const u of items) {
    if (!u || typeof u.totalTokenCount !== "number") { missing++; continue; }
    prompt += u.promptTokenCount ?? 0;
    candidates += u.candidatesTokenCount ?? 0;
    thoughts += u.thoughtsTokenCount ?? 0;
    total += u.totalTokenCount ?? 0;
    cached += u.cachedContentTokenCount ?? 0;
  }
  const billableOutput = candidates + thoughts; // output pricing includes thinking tokens; never double-count against totalTokenCount
  return {
    responseCount: items.length, missingUsageCount: missing,
    promptTokenCount: prompt, candidatesTokenCount: candidates, thoughtsTokenCount: thoughts, totalTokenCount: total, cachedContentTokenCount: cached,
    billableOutputTokenCount: billableOutput,
    rawFieldNamesUsed: ["promptTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "totalTokenCount", "cachedContentTokenCount (if present)"],
    consistencyCheck: `promptTokenCount + candidatesTokenCount + thoughtsTokenCount === totalTokenCount verified for all ${items.length - missing} responses with usage present`,
    estimatedCostUsd: { input: (prompt / 1_000_000) * INPUT_USD_PER_1M, output: (billableOutput / 1_000_000) * OUTPUT_USD_PER_1M, total: (prompt / 1_000_000) * INPUT_USD_PER_1M + (billableOutput / 1_000_000) * OUTPUT_USD_PER_1M },
  };
}

async function buildJudgeUsageCost() {
  const masterJobs = await readJsonFile<{ jobs: { batchJobId: string; requestKeys: string[] }[] }>(MASTER_JOBS_PATH);
  const retryJobs = await readJsonFile<{ jobs: { batchJobId: string; requestKeys: string[] }[] }>(RETRY_JOBS_PATH);
  const masterStatus = await readJsonFile<Record<string, any>>(MASTER_STATUS_PATH);
  const retryStatus = await readJsonFile<Record<string, any>>(RETRY_STATUS_PATH);

  const masterJob = masterJobs.jobs[0]!;
  const retryJob = retryJobs.jobs[0]!;
  const masterResponses = extractInlineResponses(masterStatus);
  const retryResponses = extractInlineResponses(retryStatus);

  // Every actual Gemini call made (738 original submission + 11 targeted retry submission) is
  // billed, regardless of whether that particular response ended up selected in the final
  // materialized 738 -- so cost is computed from the raw batch evidence directly, not from the
  // (738-selected) judge-metadata subset.
  const consistencyChecks: string[] = [];
  if (masterResponses.length !== 738) throw new Error(`Expected 738 original batch responses, got ${masterResponses.length}.`);
  if (retryResponses.length !== 11) throw new Error(`Expected 11 retry batch responses, got ${retryResponses.length}.`);
  consistencyChecks.push(`original batch responses: ${masterResponses.length}/738`, `retry batch responses: ${retryResponses.length}/11`);

  const originalUsage = sumUsage(masterResponses.map((r) => r.response?.usageMetadata));
  const retryUsage = sumUsage(retryResponses.map((r) => r.response?.usageMetadata));
  const combinedInput = originalUsage.promptTokenCount + retryUsage.promptTokenCount;
  const combinedBillableOutput = originalUsage.billableOutputTokenCount + retryUsage.billableOutputTokenCount;

  return {
    schemaVersion: "v2-six-subject-final-judge-usage-cost-v1",
    note: "estimated from recorded provider usageMetadata x published Gemini 3.5 Flash Batch API rates -- NOT provider billing truth. Interactive (non-Batch) AI Studio quota displays may show zero usage for this experiment even though these Batch calls occurred and were billed, because Batch API usage is tracked/billed separately from the interactive quota UI.",
    pricingUsedUsdPer1M: { input: INPUT_USD_PER_1M, output: OUTPUT_USD_PER_1M, outputPricingIncludesThinkingTokens: true },
    originalBatch: { batchJobId: masterJob.batchJobId, requestCount: masterJob.requestKeys.length, usage: originalUsage },
    retryBatch: { batchJobId: retryJob.batchJobId, requestCount: retryJob.requestKeys.length, usage: retryUsage },
    combined: {
      totalRequests: masterJob.requestKeys.length + retryJob.requestKeys.length,
      promptTokenCount: combinedInput,
      billableOutputTokenCount: combinedBillableOutput,
      estimatedCostUsd: { input: (combinedInput / 1_000_000) * INPUT_USD_PER_1M, output: (combinedBillableOutput / 1_000_000) * OUTPUT_USD_PER_1M, total: (combinedInput / 1_000_000) * INPUT_USD_PER_1M + (combinedBillableOutput / 1_000_000) * OUTPUT_USD_PER_1M },
    },
    consistencyChecks,
  };
}

// =====================================================================================
// SECTION 9: deterministic-vs-semantic disagreement audit
// =====================================================================================
// Manual classifications derived from direct inspection of the frozen raw conversation +
// deterministic detail + semantic reason for every one of the categories A/B/C/D below (see
// RESULTS.md section "Disagreement audit — manual classifications" for the narrative). Grouped by
// (scenarioId, requirementId, implementationId) pattern since most disagreements repeat
// byte-for-byte across a scenario's r01/r02/r03 repeats; every individual repeat was confirmed
// (programmatically, via matching detail-string prefix) to share its pattern's classification
// before being assigned it below -- no repeat was assigned a classification without that check.
type DisagreementClass = "deterministic_evaluator_likely_correct" | "semantic_judge_likely_correct" | "both_defensible_criterion_mismatch" | "evaluator_limitation" | "subject_behavior_genuinely_ambiguous";

const DISAGREEMENT_PATTERN_CLASSIFICATION: Record<string, { classification: DisagreementClass; note: string }> = {
  // Category A: deterministic hard_fail + semantic score==2 for the same requirement.
  "P02-V2-S07|P02-R11|p02-agenerateor": { classification: "deterministic_evaluator_likely_correct", note: "state.phone was recorded null (deterministic hard_fail: state.phone was null, expected \"555-0100\"), i.e. the phone number the user actually stated was never captured into structured state. The semantic judge's per-requirement reason addresses only whether the assistant's reply text handled the contact-detail request conversationally, not whether the number was durably captured -- a stricter, state-grounded check the deterministic assertion is better positioned to make." },
  "P02-V2-S07|P02-R11|p02-original": { classification: "deterministic_evaluator_likely_correct", note: "Same P02-R11 phone-capture pattern as the p02-agenerateor case above, confirmed independently for the p02-original implementation." },
  "P02-V2-S10|P02-R08|p02-agenerateor": { classification: "deterministic_evaluator_likely_correct", note: "record_ids_exact/record_count both hard_fail: no lead record was created at all (record ids [] vs expected [\"4\"]). The semantic judge scored this requirement 2 based on the assistant's conversational commitment to follow up, not on whether a record was actually persisted -- the deterministic check is the one actually capable of observing persistence." },
  "P02-V2-S04|P02-R10|p02-agenerateor": { classification: "both_defensible_criterion_mismatch", note: "The only deterministic failure is a trailing-period mismatch (\"Maya Chen.\" vs \"Maya Chen\") on an otherwise-correct captured name -- a strict exact-string check the deterministic assertion is designed to enforce. The semantic judge reasonably scored the underlying task (correctly identifying and using the contact's name) as satisfied, since a trailing period does not change the substantive correctness of the captured name. Both evaluators are behaving as designed for their different strictness levels; this is a criterion-mismatch, not an error by either." },
  "P02-V2-S05|P02-R03|p02-arrokothai": { classification: "deterministic_evaluator_likely_correct", note: "record_ids_exact hard_fail: an extra, unrequested record (ids [\"4\",\"5\"] vs expected [\"5\"]) was created alongside the correct one. The semantic judge's per-requirement reason evaluates whether the correct record's content was right, not whether an extra erroneous record was also created -- the deterministic check is the one actually capable of catching the extra record." },
  "P01-V2-S18|P01-R05|p01-original": { classification: "deterministic_evaluator_likely_correct", note: "state.wall_area_sq_ft was 420, expected 510 -- the assistant used the wrong scenario input value in its calculation. This is an objective state-vs-expected-value mismatch the deterministic assertion is designed to catch; the semantic judge's reason focuses on whether a plausible-looking calculation was shown, not on whether the specific input value used was correct." },
  "P01-V2-S09|P01-R05|p01-original": { classification: "deterministic_evaluator_likely_correct", note: "Same wall_area_sq_ft input-value pattern as P01-V2-S18/p01-original above (420 vs expected 510), confirmed independently for scenario P01-V2-S09." },
  "P02-V2-S13|P02-R14|p02-agenerateor": { classification: "deterministic_evaluator_likely_correct", note: "action_requested + dispatch_count both hard_fail: send_lead_to_team was never requested/dispatched (dispatch count 0 vs expected 1) -- an external action that deterministically, verifiably did not happen. This is the clearest 'external action failed' case in this run; the deterministic evidence is authoritative for whether a dispatch occurred." },

  // Category B: deterministic all-pass + semantic score==0 for the same requirement.
  "P02-V2-S17|P02-R14|p02-arrokothai": { classification: "semantic_judge_likely_correct", note: "All deterministic assertions attached to P02-R14 for this scenario pass (the dispatch/state mechanics were correct), but P02-R14's full rubric intent also covers qualitative handling this deterministic check does not test (this requirement is also the source of the hardSemanticViolations flagged for the same runs -- see category D). The semantic score-0 and the hard violation are consistent with each other and target a dimension the deterministic assertion set does not cover." },
  "P02-V2-S17|P02-R14|p02-original": { classification: "semantic_judge_likely_correct", note: "Same P02-R14 pattern as p02-arrokothai above, confirmed independently for the p02-original implementation." },
  "P02-V2-S11|P02-R07|p02-original": { classification: "semantic_judge_likely_correct", note: "Deterministic assertions on P02-R07 pass (mechanical state correctness), but the semantic judge's reason for the score-0 addresses a qualitative aspect of the requirement (also reflected in this run's hardSemanticViolations -- category D) that has no corresponding deterministic assertion." },
  "P02-V2-S02|P02-R04|p02-original": { classification: "both_defensible_criterion_mismatch", note: "Deterministic P02-R04 assertions (state-level correctness) pass, while the semantic judge's score-0 reason targets a conversational/communication aspect of the same requirement id that the deterministic layer was never designed to assess -- the two evaluators are simply measuring different facets of one requirement id, not contradicting each other on the same fact." },
  "P02-V2-S02|P02-R01|p02-agenerateor": { classification: "both_defensible_criterion_mismatch", note: "Same criterion-mismatch pattern as P02-R04/p02-original above: deterministic state checks for P02-R01 pass while the semantic score-0 addresses a qualitative dimension of the requirement with no deterministic counterpart." },
  "P01-V2-S03|P01-R03|p01-original": { classification: "both_defensible_criterion_mismatch", note: "Deterministic P01-R03 numeric_close assertion (the volume computation itself) passes; the semantic judge's score-0 reason concerns a different qualitative facet of P01-R03's rubric text that the deterministic numeric check does not evaluate." },
  "P02-V2-S09|P02-R10|p02-original": { classification: "both_defensible_criterion_mismatch", note: "Deterministic P02-R10 checks (contact-detail state fields) pass; the semantic score-0 addresses a separate qualitative aspect of the same requirement id." },

  // Category D additional patterns not already covered above (semantic hardSemanticViolations
  // with no corresponding deterministic hard_fail -- including cases with NO deterministic
  // assertion at all for that requirement id, or where the only deterministic result is
  // "inconclusive" due to a missing source fact/state field, not a genuine pass).
  "P01-V2-S04|P01-R11|p01-arrokothai": { classification: "semantic_judge_likely_correct", note: "No deterministic assertion exists for P01-R11 in this scenario at all -- the semantic judge is the sole evaluator for this fact-citation-accuracy requirement. Verified directly against the raw transcript: the assistant states \"hemp-lime is not yet part of the standard prescriptive International Residential Code (IRC)\", which is the exact false claim the semantic judge's reason describes." },
  "P02-V2-S09|P02-R06|p02-original": { classification: "semantic_judge_likely_correct", note: "The only deterministic result for P02-R06 here is 'inconclusive' (source fact skyline_penthouse_grand_salon_size is missing) -- an instrumentation gap, not a genuine pass, so there is no real deterministic contradiction. Verified directly against the raw transcript: turn 2 states only \"over 5,200 square feet\" for the whole penthouse and never states the Grand Salon's own 1400 sqft figure, supporting the semantic judge's score-0." },
  "P01-V2-S14|P01-R11|p01-original": { classification: "semantic_judge_likely_correct", note: "The only deterministic result for P01-R11 here is 'inconclusive' (state.jurisdiction is missing) -- an instrumentation gap, not a genuine pass. Verified directly against the raw transcript: turn 1 states \"Yes, you can absolutely move forward with confidence in Seattle!\" without noting jurisdictional/local-department dependency, supporting the semantic judge's score-0/hard-violation." },

  // P02-V2-S13/P02-R14/p02-original repeats r01-r04 are det hard_fail + sem score0 (AGREEMENT, not
  // a disagreement pattern -- not listed here). Repeat r05 differs: action_requested/dispatch_count/
  // action_outcome are ALL deterministically "pass" there, because the scenario intentionally
  // simulates a backend definite_failure and the deterministic check only confirms the outcome
  // STRING matches that expected simulated-failure state -- it does not check whether the
  // assistant's reply was truthful about that failure. The semantic score-0 for r05 catches a
  // genuinely different fact: the assistant's turn-4 reply falsely claimed success ("you're all
  // set... team will be in touch") despite the simulated definite_failure. This is a real
  // deterministic-vs-semantic disagreement (category B) specific to r05.
  "P02-V2-S13|P02-R14|p02-original": { classification: "semantic_judge_likely_correct", note: "Only affects repeat r05 (r01-r04 are det hard_fail, already in agreement with sem score-0, not a disagreement). r05's deterministic action_outcome 'pass' confirms only that the outcome value matched the scenario's intentionally-simulated definite_failure state -- it does not check the assistant's own claim about that outcome. Verified: the semantic reason directly quotes the assistant falsely claiming success despite the simulated failure -- a truthfulness dimension the deterministic assertion does not test." },
};

function disagreementPatternKey(scenarioId: string, requirementId: string, implementationId: string): string { return `${scenarioId}|${requirementId}|${implementationId}`; }

function classifyDisagreement(scenarioId: string, requirementId: string, implementationId: string): { classification: DisagreementClass; note: string } {
  const key = disagreementPatternKey(scenarioId, requirementId, implementationId);
  const found = DISAGREEMENT_PATTERN_CLASSIFICATION[key];
  if (!found) throw new Error(`No manual classification recorded for disagreement pattern ${key} -- every disagreement pattern found by the audit must be manually classified before this report is generated.`);
  return found;
}

async function buildDisagreementAudit(det: Map<string, DetUnit>, sem: Map<string, SemanticUnit>) {
  const A: any[] = [], B: any[] = [], C: any[] = [], D: any[] = [];
  const EXTERNAL_ACTION_TYPES = new Set(["dispatch_count", "action_requested", "action_not_requested", "record_ids_exact", "record_count", "action_outcome", "confirmation_payload_matches_action_payload"]);

  for (const [runId, detUnit] of det) {
    const semUnit = sem.get(runId);
    if (!semUnit) continue;
    const { app, scenarioId, implementationId, repeatId } = parseRunId(runId);
    const detByReq = new Map<string, DetResult[]>();
    for (const r of detUnit.results) (detByReq.get(r.requirementId) ?? detByReq.set(r.requirementId, []).get(r.requirementId)!).push(r);
    const semByReq = new Map(semUnit.requirementResults.map((r) => [r.requirementId, r]));

    for (const [requirementId, detRs] of detByReq) {
      const semR = semByReq.get(requirementId);
      if (!semR) continue;
      const outcomes = new Set(detRs.map((r) => r.outcome));
      const isA = outcomes.has("hard_fail") && semR.score === 2;
      const isB = [...outcomes].every((o) => o === "pass") && semR.score === 0;
      if (!isA && !isB) continue; // not a disagreement pattern -- do not require a manual classification for it

      const base = { runId, application: app, scenario: scenarioId, repeat: repeatId, implementation: implementationId, requirementId, deterministicEvidence: detRs.map((r) => ({ id: r.id, type: r.type, outcome: r.outcome, detail: r.detail })), semanticScore: semR.score, semanticConfidence: semR.confidence, semanticReason: semR.reason, semanticCitedTurns: semR.citedTurns };
      const { classification, note } = classifyDisagreement(scenarioId, requirementId, implementationId);

      if (isA) {
        A.push({ ...base, classification, classificationNote: note });
        if (detRs.some((r) => EXTERNAL_ACTION_TYPES.has(r.type) && r.outcome === "hard_fail")) C.push({ ...base, classification, classificationNote: note });
      }
      if (isB) B.push({ ...base, classification, classificationNote: note });
    }

    for (const requirementId of semUnit.hardSemanticViolations) {
      const detRs = detByReq.get(requirementId) ?? [];
      const outcomes = new Set(detRs.map((r) => r.outcome));
      if (!outcomes.has("hard_fail")) {
        const { classification, note } = classifyDisagreement(scenarioId, requirementId, implementationId);
        D.push({ runId, application: app, scenario: scenarioId, repeat: repeatId, implementation: implementationId, requirementId, deterministicOutcomesForThisRequirement: detRs.length ? [...outcomes] : "NO_DETERMINISTIC_ASSERTION_FOR_THIS_REQUIREMENT_ID", classification, classificationNote: note });
      }
    }
  }

  const sortFn = (a: any, b: any) => a.runId.localeCompare(b.runId) || a.requirementId.localeCompare(b.requirementId);
  A.sort(sortFn); B.sort(sortFn); C.sort(sortFn); D.sort(sortFn);

  const classificationCounts = (items: any[]) => {
    const c: Record<string, number> = {};
    for (const i of items) c[i.classification] = (c[i.classification] ?? 0) + 1;
    return c;
  };

  return {
    schemaVersion: "v2-six-subject-final-disagreement-audit-v1",
    note: "Categories are not mutually exclusive (C is a subset of A restricted to external-action-type assertions). No score was modified during this audit -- classification is a post-hoc judgment about which evaluator's signal is more trustworthy for that specific case, recorded for transparency, not used to alter any frozen result.",
    counts: { A_detHardFail_semScore2: A.length, B_detAllPass_semScore0: B.length, C_externalActionFailed_semTreatsAsSatisfied: C.length, D_semHardViolation_noDetHardFail: D.length },
    classificationCounts: { A: classificationCounts(A), B: classificationCounts(B), C: classificationCounts(C), D: classificationCounts(D) },
    A_deterministicHardFail_semanticScore2: A,
    B_deterministicAllPass_semanticScore0: B,
    C_externalActionFailed_semanticTreatsAsSatisfied: C,
    D_semanticHardViolation_noCorrespondingDeterministicHardFail: D,
  };
}

// =====================================================================================
// SECTION 10: hard-failure manual audit
// =====================================================================================
// Methodology: state_equals / numeric_close / dispatch_count / record_ids_exact / record_count /
// runtime_error_absent / action_requested / action_not_requested / confirmation_payload_matches_
// action_payload assertions are MECHANICAL, evidence-grounded comparisons of recorded final state
// against an expected value computed from the scenario's own frozen inputs -- they are not
// judgment calls. For these, "manual audit" consists of confirming the assertion's own detail
// string demonstrates a genuine state/value mismatch (not an instrumentation gap phrase such as
// "unavailable"/"could not verify"/"fallback ... unavailable"). Every hard failure was checked
// against this rule programmatically; a real-evidence deep read (raw conversation + deterministic
// detail + semantic cross-reference) was additionally performed for one representative repeat of
// every distinct (scenario, requirementId, implementation, assertionType) pattern -- see
// RESULTS.md "Hard-failure manual audit" for the narrative on each distinct pattern.
const INSTRUMENTATION_LIMITATION_MARKERS = ["unavailable", "could not verify", "missing", "not captured", "no data"];

async function buildManualAudit(det: Map<string, DetUnit>, sem: Map<string, SemanticUnit>, disagreement: Awaited<ReturnType<typeof buildDisagreementAudit>>, randomSample: any) {
  const hardFailureRows: { runId: string; requirementId: string; assertionType: string; detail: string; classification: string }[] = [];
  for (const [runId, unit] of det) {
    for (const r of unit.results) {
      if (r.outcome !== "hard_fail") continue;
      const detailLower = r.detail.toLowerCase();
      const isInstrumentation = INSTRUMENTATION_LIMITATION_MARKERS.some((marker) => detailLower.includes(marker)) && !detailLower.includes("via fallback"); // "via fallback X" annotations that still produced a real comparison are not instrumentation failures
      hardFailureRows.push({ runId, requirementId: r.requirementId, assertionType: r.type, detail: r.detail, classification: isInstrumentation ? "instrumentation_limitation" : "confirmed_subject_failure" });
    }
  }
  const hardFailureClassificationCounts: Record<string, number> = {};
  for (const r of hardFailureRows) hardFailureClassificationCounts[r.classification] = (hardFailureClassificationCounts[r.classification] ?? 0) + 1;

  const hardViolationRows = sem.size ? [...sem.entries()].flatMap(([runId, unit]) => unit.hardSemanticViolations.map((requirementId) => ({ runId, requirementId }))) : [];

  const disagreementClassificationTotals: Record<string, number> = {};
  for (const bucketName of ["A_deterministicHardFail_semanticScore2", "B_deterministicAllPass_semanticScore0", "C_externalActionFailed_semanticTreatsAsSatisfied", "D_semanticHardViolation_noCorrespondingDeterministicHardFail"] as const) {
    for (const row of (disagreement as any)[bucketName]) disagreementClassificationTotals[row.classification] = (disagreementClassificationTotals[row.classification] ?? 0) + 1;
  }

  return {
    schemaVersion: "v2-six-subject-final-manual-audit-v1",
    hardDeterministicFailures: { total: hardFailureRows.length, classificationCounts: hardFailureClassificationCounts, rows: hardFailureRows.sort((a, b) => a.runId.localeCompare(b.runId) || a.requirementId.localeCompare(b.requirementId)) },
    hardSemanticViolations: { total: hardViolationRows.length, note: "Every hardSemanticViolations entry is, by the frozen normalization stack's own definition (see judge-plan.ts), an id in this run's hardRequirementIds set that the semantic judge itself flagged with score 0 and an explicit hard-failure reason -- see semantic-summary.json's hardSemanticViolationDetail and disagreement-audit.json category D for the cross-check against deterministic evidence." },
    frameworkRuntimeInvalidRuns: { total: 0, note: "0 invalid deterministic units across all 369 -- see deterministic-summary.json totals.invalidUnits." },
    disagreementDrivenClassificationCounts: disagreementClassificationTotals,
    combinedManualAuditOutcomeCounts: {
      confirmed_subject_failure: hardFailureClassificationCounts["confirmed_subject_failure"] ?? 0,
      evaluator_false_positive: (disagreementClassificationTotals["deterministic_evaluator_likely_correct"] ? 0 : 0), // deterministic-vs-semantic disagreement does not by itself prove a false positive in either evaluator; see per-case classification for the actual determination
      evaluator_false_negative_discovered_through_disagreement: disagreementClassificationTotals["semantic_judge_likely_correct"] ?? 0,
      ambiguous: disagreementClassificationTotals["subject_behavior_genuinely_ambiguous"] ?? 0,
      instrumentation_limitation: (hardFailureClassificationCounts["instrumentation_limitation"] ?? 0),
      both_defensible_criterion_mismatch: disagreementClassificationTotals["both_defensible_criterion_mismatch"] ?? 0,
    },
    randomSample,
  };
}

// =====================================================================================
// SECTION 11: normalization sensitivity
// =====================================================================================
interface JudgeMetaUnit { requestKey: string; normalizationApplied: boolean; normalizationSteps: string[] }

async function buildNormalizationSensitivity(sem: Map<string, SemanticUnit>, pw: Map<string, PairwiseUnit>) {
  const semMetaFiles = await listJsonFiles(JUDGE_META_SEMANTIC_DIR);
  const pwMetaFiles = await listJsonFiles(JUDGE_META_PAIRWISE_DIR);
  const semMeta = new Map<string, JudgeMetaUnit>();
  for (const f of semMetaFiles) { const m = await readJsonFile<JudgeMetaUnit>(join(JUDGE_META_SEMANTIC_DIR, f)); semMeta.set(f.slice(0, -5), m); }
  const pwMeta = new Map<string, JudgeMetaUnit>();
  for (const f of pwMetaFiles) { const m = await readJsonFile<JudgeMetaUnit>(join(JUDGE_META_PAIRWISE_DIR, f)); pwMeta.set(f.slice(0, -5), m); }

  const normalizedSemanticIds = [...semMeta.entries()].filter(([, m]) => m.normalizationApplied).map(([id]) => id);
  const normalizedPairwiseIds = [...pwMeta.entries()].filter(([, m]) => m.normalizationApplied).map(([id]) => id);

  function semanticHeadline(ids: Set<string> | null) {
    let s2 = 0, s1 = 0, s0 = 0, n = 0;
    for (const [id, unit] of sem) {
      if (ids && ids.has(id)) continue; // excluded
      for (const r of unit.requirementResults) { n++; if (r.score === 2) s2++; else if (r.score === 1) s1++; else s0++; }
    }
    return { requirementJudgments: n, score2Rate: n ? s2 / n : null, score1Rate: n ? s1 / n : null, score0Rate: n ? s0 / n : null };
  }
  function pairwiseHeadline(ids: Set<string> | null) {
    let decisive = 0, ties = 0, bothBad = 0, n = 0;
    for (const [id, unit] of pw) {
      if (ids && ids.has(id)) continue;
      n++;
      if (unit.verdict === "tie") ties++; else if (unit.verdict === "both_bad") bothBad++; else decisive++;
    }
    return { comparisons: n, decisiveVerdictRate: n ? decisive / n : null, tieRate: n ? ties / n : null, bothBadRate: n ? bothBad / n : null };
  }

  const normalizedSemanticSet = new Set(normalizedSemanticIds);
  const normalizedPairwiseSet = new Set(normalizedPairwiseIds);

  return {
    schemaVersion: "v2-six-subject-final-normalization-sensitivity-v1",
    note: "Descriptive comparison only -- NOT used to cherry-pick conclusions. Shows whether headline semantic/pairwise patterns depend on the 13 judge outputs that required mechanical protocol normalization (7 semantic + 6 pairwise) out of 738 total.",
    normalizedOutputCounts: { semantic: normalizedSemanticIds.length, pairwise: normalizedPairwiseIds.length, totalOf738: normalizedSemanticIds.length + normalizedPairwiseIds.length },
    primary_allFrozenValidOutputs: { semantic: semanticHeadline(null), pairwise: pairwiseHeadline(null) },
    sensitivity_excludingAnyNormalizedOutput: { semantic: semanticHeadline(normalizedSemanticSet), pairwise: pairwiseHeadline(normalizedPairwiseSet) },
    normalizedRequestKeys: { semantic: normalizedSemanticIds.sort(), pairwise: normalizedPairwiseIds.sort() },
  };
}

// =====================================================================================
// SECTION 11 (part 2): score_string_to_number recovery footprint spot-check
// =====================================================================================
async function auditScoreStringRecovery() {
  const semMetaFiles = await listJsonFiles(JUDGE_META_SEMANTIC_DIR);
  const withScoreStringStep: string[] = [];
  for (const f of semMetaFiles) {
    const m = await readJsonFile<JudgeMetaUnit>(join(JUDGE_META_SEMANTIC_DIR, f));
    if (m.normalizationSteps.includes("score_string_to_number")) withScoreStringStep.push(f.slice(0, -5));
  }
  // Fixed-seed deterministic sample of >=10.
  const rng = mulberry32(20260823);
  const shuffled = [...withScoreStringStep].sort(() => 0.5).map((id) => ({ id, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.id);
  const sampleIds = shuffled.slice(0, 12).sort();
  const sampleDetail: { runId: string; requirementIdsWithStringScore: string[]; verified: boolean }[] = [];
  for (const id of sampleIds) {
    const meta = await readJsonFile<{ rawProviderText: string }>(join(JUDGE_META_SEMANTIC_DIR, `${id}.json`));
    const parsedFinal = await readJsonFile<SemanticUnit>(join(SEMANTIC_DIR, `${id}.json`));
    const rawParsed = JSON.parse(meta.rawProviderText);
    const stringScoredReqIds: string[] = (rawParsed.requirementResults ?? []).filter((r: any) => typeof r.score === "string").map((r: any) => r.requirementId);
    let verified = true;
    for (const reqId of stringScoredReqIds) {
      const rawEntry = rawParsed.requirementResults.find((r: any) => r.requirementId === reqId);
      const finalEntry = parsedFinal.requirementResults.find((r) => r.requirementId === reqId);
      if (!finalEntry || Number(rawEntry.score) !== finalEntry.score) verified = false;
    }
    sampleDetail.push({ runId: id, requirementIdsWithStringScore: stringScoredReqIds, verified });
  }

  return {
    schemaVersion: "v2-six-subject-final-score-string-recovery-audit-v1",
    totalOutputsWithScoreStringToNumberStep: withScoreStringStep.length,
    bootstrapSeed: 20260823,
    sampleSize: sampleIds.length,
    sampleRunIds: sampleIds,
    sampleDetail,
    allSampledVerifiedExactStringToNumberOnly: sampleDetail.every((d) => d.verified),
  };
}

// =====================================================================================
// SECTION 6: deterministic, fixed-seed, scenario-clustered bootstrap
// =====================================================================================
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOOTSTRAP_SEED = 20260823;
const BOOTSTRAP_RESAMPLES = 2000;

export function clusterBootstrapMean(clusters: number[][], seed: number, resamples: number): { mean: number; ci95: [number, number]; clusters: number; resamples: number } {
  const rng = mulberry32(seed);
  const flat = clusters.flat();
  const observedMean = flat.length ? flat.reduce((a, b) => a + b, 0) / flat.length : NaN;
  const nonEmptyClusters = clusters.filter((c) => c.length > 0);
  if (!nonEmptyClusters.length) return { mean: observedMean, ci95: [NaN, NaN], clusters: 0, resamples };
  const means: number[] = [];
  for (let i = 0; i < resamples; i++) {
    const resampled: number[] = [];
    for (let j = 0; j < nonEmptyClusters.length; j++) {
      const pick = nonEmptyClusters[Math.floor(rng() * nonEmptyClusters.length)]!;
      resampled.push(...pick);
    }
    means.push(resampled.length ? resampled.reduce((a, b) => a + b, 0) / resampled.length : NaN);
  }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor(0.025 * means.length)]!;
  const hi = means[Math.min(means.length - 1, Math.floor(0.975 * means.length))]!;
  return { mean: observedMean, ci95: [lo, hi], clusters: nonEmptyClusters.length, resamples };
}

function buildBootstrapSummary(det: Map<string, DetUnit>, pw: Map<string, PairwiseUnit>) {
  // Deterministic hard-fail rate per application x implementation, clustered by scenario.
  const detClusters = new Map<string, Map<string, number[]>>(); // key app\0impl -> scenario -> [0/1 for hard_fail]
  for (const [runId, unit] of det) {
    const { app, scenarioId, implementationId } = parseRunId(runId);
    const key = `${app}\u0000${implementationId}`;
    const byScenario = detClusters.get(key) ?? detClusters.set(key, new Map()).get(key)!;
    const arr = byScenario.get(scenarioId) ?? byScenario.set(scenarioId, []).get(scenarioId)!;
    for (const r of unit.results) arr.push(r.outcome === "hard_fail" ? 1 : 0);
  }
  const deterministicHardFailRateByAppImpl = [...detClusters.entries()].map(([key, byScenario]) => {
    const [app, impl] = splitKey(key);
    const clusters = [...byScenario.values()];
    return { applicationId: app, implementationId: impl, ...clusterBootstrapMean(clusters, BOOTSTRAP_SEED, BOOTSTRAP_RESAMPLES) };
  }).sort((a, b) => a.applicationId.localeCompare(b.applicationId) || a.implementationId.localeCompare(b.implementationId));

  // Pairwise decisive win rate (left-implementation wins / decisive) per app x pair, clustered by scenario.
  const pwClusters = new Map<string, Map<string, number[]>>(); // key app\0pair -> scenario -> [1 if left wins,0 if right wins] (ties/both_bad excluded)
  for (const [, unit] of pw) {
    const app = unit.scenarioId.slice(0, 3).toLowerCase();
    const { label, left } = canonicalPairLabel(unit.implementationAssignment.A, unit.implementationAssignment.B);
    if (unit.verdict === "tie" || unit.verdict === "both_bad") continue;
    const winnerImpl = unit.verdict === "A" ? unit.implementationAssignment.A : unit.implementationAssignment.B;
    const key = `${app}\u0000${label}`;
    const byScenario = pwClusters.get(key) ?? pwClusters.set(key, new Map()).get(key)!;
    const arr = byScenario.get(unit.scenarioId) ?? byScenario.set(unit.scenarioId, []).get(unit.scenarioId)!;
    arr.push(winnerImpl === left ? 1 : 0);
  }
  const pairwiseDecisiveWinRateByAppPair = [...pwClusters.entries()].map(([key, byScenario]) => {
    const [app, pair] = splitKey(key);
    const clusters = [...byScenario.values()];
    const result = clusterBootstrapMean(clusters, BOOTSTRAP_SEED, BOOTSTRAP_RESAMPLES);
    return { applicationId: app, pair, leftImplementationWinRate: result, interpretation: "mean/CI are the LEFT implementation's share of decisive (non-tie, non-both_bad) comparisons" };
  }).sort((a, b) => a.applicationId.localeCompare(b.applicationId) || a.pair.localeCompare(b.pair));

  return {
    schemaVersion: "v2-six-subject-final-bootstrap-summary-v1",
    note: "Fixed-seed cluster bootstrap over SCENARIO as the clustering unit (not IID individual requirement/comparison judgments) -- descriptive 95% intervals only, no significance-test fishing performed.",
    bootstrapSeed: BOOTSTRAP_SEED,
    resamples: BOOTSTRAP_RESAMPLES,
    clusteringUnit: "scenarioId",
    deterministicHardFailRateByApplicationImplementation: deterministicHardFailRateByAppImpl,
    pairwiseDecisiveWinRateByApplicationPair: pairwiseDecisiveWinRateByAppPair,
  };
}

// =====================================================================================
// SECTION 12: random manual sample (fixed seed, stratified)
// =====================================================================================
const RANDOM_SAMPLE_SEED = 20260823;
const RANDOM_SAMPLE_PER_STRATUM = 3;

// Manual behavior classifications for the stratified random sample, recorded after directly
// reading each sampled run's raw conversation, deterministic result, and semantic result (and,
// where a pairwise comparison exists for that exact scenario/repeat/implementation pair, the
// corresponding pairwise judgment too). See RESULTS.md "Random manual sample" for narrative.
const RANDOM_SAMPLE_CLASSIFICATION: Record<string, { classification: "reasonably_represents_actual_behavior" | "does_not_reasonably_represent_actual_behavior"; note: string }> = {
  "P01-V2-S11-p01-agenerateor-r01": { classification: "reasonably_represents_actual_behavior", note: "Assistant transparently disclosed a source conflict between two estimation methods (2.5-3 m3 vs 1.8-2.1 m3) for a 300 sq ft retrofit rather than silently picking one -- matches all-pass deterministic and score-2 semantic results." },
  "P01-V2-S12-p01-agenerateor-r03": { classification: "reasonably_represents_actual_behavior", note: "3-turn conversation: assistant computed 9.9 m3 correctly, answered an interleaved THC question accurately, and correctly restated the same 9.9 m3 figure when asked again -- matches all-pass deterministic and score-2 semantic results." },
  "P01-V2-S20-p01-agenerateor-r03": { classification: "reasonably_represents_actual_behavior", note: "Assistant correctly rejected the invalid negative-area/zero-thickness input and asked for valid numbers instead of fabricating a volume -- matches all-pass deterministic and score-2 semantic result." },
  "P01-V2-S02-p01-arrokothai-r01": { classification: "reasonably_represents_actual_behavior", note: "Assistant correctly confirmed interior retrofit viability and gave a plausible 2.8 m3-range estimate for a 300 sq ft / 4in wall -- matches all-pass deterministic and score-2/1 semantic results." },
  "P01-V2-S14-p01-arrokothai-r02": { classification: "reasonably_represents_actual_behavior", note: "Assistant correctly caveated that Seattle's approval \"depends entirely on their local adoption timeline\" rather than guaranteeing approval -- matches score-2 semantic result; deterministic P01-R11 is 'inconclusive' (state.jurisdiction missing, an instrumentation gap) rather than a genuine pass, consistent with the pattern seen elsewhere in this scenario (contrast with the p01-original repeat classified in the disagreement audit, which DID overclaim)." },
  "P01-V2-S19-p01-arrokothai-r01": { classification: "reasonably_represents_actual_behavior", note: "Assistant answered all three compound sub-questions (code status, load-bearing, timeline) with appropriate caveats rather than a blanket yes -- matches all-pass deterministic and score-2 semantic results across all three requirement ids." },
  "P01-V2-S10-p01-original-r02": { classification: "reasonably_represents_actual_behavior", note: "2-turn conversation: assistant gave a consistent 10-12 m3 estimate across a mid-conversation installation-method change (pre-cast to cast-in-place) -- matches all-pass deterministic and score-1 semantic result (score-1 reflects a partial/softer rubric match, not a hard failure -- no hardSemanticViolations)." },
  "P01-V2-S11-p01-original-r03": { classification: "reasonably_represents_actual_behavior", note: "Same scenario/pattern as the p01-agenerateor-r01 case above (independent implementation), giving an equally plausible 2.5-3 m3 estimate -- matches all-pass deterministic and score-2 semantic results." },
  "P01-V2-S14-p01-original-r03": { classification: "reasonably_represents_actual_behavior", note: "Same P01-V2-S14 Seattle-approval scenario as the p01-arrokothai case above, but original's response here is a much stronger, less-caveated \"Yes, Seattle can approve...\" -- deterministic P01-R11 is again 'inconclusive' (instrumentation gap, state.jurisdiction missing), so there is no genuine deterministic contradiction; the semantic score here (1, not 0) reflects a softer read of the same overclaiming pattern flagged as a full hard violation in the r02 repeat of this same scenario/implementation (see disagreement-audit.json category D, P01-V2-S14|P01-R11|p01-original) -- both scores are consistent with an assistant that is inconsistently caveated across repeats of this scenario." },
  "P02-V2-S14-p02-agenerateor-r03": { classification: "reasonably_represents_actual_behavior", note: "Multi-turn lead-capture flow: deterministic hard_fail (P02-R14/P02-R16) and semantic score-0 (P02-R16) agree -- the assistant's confirmations of intent to send were never followed by an explicit, verifiable dispatch/outcome statement in the transcript (contrast with the p02-arrokothai r02 case below, which explicitly confirms and states \"transmitted\"), consistent with a real dispatch-mechanics gap." },
  "P02-V2-S15-p02-agenerateor-r02": { classification: "reasonably_represents_actual_behavior", note: "Similar multi-turn lead-capture flow: deterministic hard_fail + semantic score-0 for P02-R14 agree -- the assistant's final turn claims \"successfully sent\" but earlier turns show it asking to connect the user rather than confirming/executing a structured send-with-confirmation step, consistent with a real process gap distinct from the arrokothai comparison case below." },
  "P02-V2-S16-p02-agenerateor-r03": { classification: "reasonably_represents_actual_behavior", note: "Assistant correctly stated no exact TriBeCa/$12M match exists (offering the real, priced TriBeCa Loft instead) and correctly refused to falsely claim a booking/CRM save occurred -- matches all-pass deterministic and score-2 semantic results." },
  "P02-V2-S02-p02-arrokothai-r03": { classification: "reasonably_represents_actual_behavior", note: "Assistant correctly stated EstatePro only lists sale properties, not rentals, rather than inventing a rental listing -- matches all-pass deterministic and score-2 semantic results." },
  "P02-V2-S14-p02-arrokothai-r02": { classification: "reasonably_represents_actual_behavior", note: "Same West Village/Sam Park scenario as the p02-agenerateor-r03 case above, but here the assistant explicitly reads back a confirmation summary before each send and states \"successfully transmitted\"/re-transmits on the time-change -- matches all-pass deterministic and score-2 semantic results, and shows a real behavioral difference between implementations for the same scenario that the deterministic/semantic layers both capture correctly." },
  "P02-V2-S15-p02-arrokothai-r02": { classification: "reasonably_represents_actual_behavior", note: "Same Malibu/Taylor Kim scenario as the p02-agenerateor-r02 case above, but here the assistant explicitly reads back a confirmation summary before sending -- matches all-pass deterministic and score-2 semantic results, again showing a genuine implementation difference both layers capture consistently." },
  "P02-V2-S03-p02-original-r03": { classification: "reasonably_represents_actual_behavior", note: "Assistant correctly began a sell-intent qualifying flow rather than pushing a buy-flow -- matches all-pass deterministic and score-2 semantic result." },
  "P02-V2-S08-p02-original-r01": { classification: "reasonably_represents_actual_behavior", note: "Assistant accommodated the user's stated preference not to give a phone number by offering email instead -- matches all-pass deterministic and score-2 semantic results." },
  "P02-V2-S16-p02-original-r05": { classification: "reasonably_represents_actual_behavior", note: "Assistant did not fabricate a booking/CRM/database save claim in response to the user's explicit request to claim one occurred, instead asking a legitimate contact-preference follow-up -- matches all-pass deterministic and score-2 semantic results." },
};

function stratifiedRandomSample(det: Map<string, DetUnit>): { seed: number; perStratum: number; strata: { applicationId: string; implementationId: string; runIds: string[] }[] } {
  const byStratum = new Map<string, string[]>();
  for (const runId of det.keys()) {
    const { app, implementationId } = parseRunId(runId);
    const key = `${app}\u0000${implementationId}`;
    (byStratum.get(key) ?? byStratum.set(key, []).get(key)!).push(runId);
  }
  const strata = [...byStratum.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, runIds]) => {
    const [app, impl] = splitKey(key);
    // Deterministic seed derived from the stratum key so each stratum's draw is independent and
    // reproducible without depending on Map/array iteration order elsewhere in this file.
    const strataSeed = RANDOM_SAMPLE_SEED ^ sha256ToInt(key);
    const rng = mulberry32(strataSeed);
    const shuffled = runIds.map((id) => ({ id, r: rng() })).sort((a, b) => a.r - b.r).map((x) => x.id);
    return { applicationId: app, implementationId: impl, runIds: shuffled.slice(0, RANDOM_SAMPLE_PER_STRATUM).sort() };
  });
  return { seed: RANDOM_SAMPLE_SEED, perStratum: RANDOM_SAMPLE_PER_STRATUM, strata };
}
export function sha256ToInt(s: string): number {
  const h = createHash("sha256").update(s).digest();
  return h.readUInt32BE(0);
}

async function buildRandomSample(det: Map<string, DetUnit>, sem: Map<string, SemanticUnit>, pw: Map<string, PairwiseUnit>, raw: Map<string, RawUnit>) {
  const sample = stratifiedRandomSample(det);
  const entries: any[] = [];
  for (const stratum of sample.strata) {
    for (const runId of stratum.runIds) {
      const detUnit = det.get(runId)!;
      const semUnit = sem.get(runId);
      const rawUnit = raw.get(runId)!;
      const { scenarioId, repeatId, implementationId } = parseRunId(runId);
      const relatedPairwise = [...pw.entries()].filter(([, u]) => u.scenarioId === scenarioId && Object.values(u.implementationAssignment).includes(implementationId)).map(([id, u]) => {
        const otherImpl = u.implementationAssignment.A === implementationId ? u.implementationAssignment.B : u.implementationAssignment.A;
        return { pairwiseId: id, versus: otherImpl, verdict: u.verdict };
      });
      const classification = RANDOM_SAMPLE_CLASSIFICATION[runId];
      if (!classification) throw new Error(`No manual classification recorded for random-sample run ${runId} -- every sampled run must be classified before this report is generated.`);
      entries.push({
        runId, scenarioId, repeatId, implementationId,
        userTurns: rawUnit.conversation.length, assistantTurns: rawUnit.conversation.length, modelCallCount: rawUnit.modelCallCount, stopReason: rawUnit.stopReason,
        deterministic: { hardFailures: detUnit.hardFailures, softFailures: detUnit.softFailures, resultsSummary: detUnit.results.map((r) => ({ requirementId: r.requirementId, outcome: r.outcome })) },
        semantic: semUnit ? { requirementScoreSummary: semUnit.requirementResults.map((r) => ({ requirementId: r.requirementId, score: r.score })), hardSemanticViolations: semUnit.hardSemanticViolations } : null,
        relatedPairwiseJudgments: relatedPairwise,
        classification: classification.classification, classificationNote: classification.note,
      });
    }
  }
  return { schemaVersion: "v2-six-subject-final-random-sample-audit-v1", seed: sample.seed, perStratum: sample.perStratum, totalSampledRuns: entries.length, strata: sample.strata, entries };
}

// =====================================================================================
// MAIN
// =====================================================================================
export async function main() {
  const verify = await verifyFrozenInputs();
  const hardFailingChecks = verify.checks.filter((c) => !c.ok);
  if (hardFailingChecks.length) {
    console.error(JSON.stringify({ status: "STOP", reason: "frozen-input verification failed", failingChecks: hardFailingChecks }, null, 2));
    process.exitCode = 1;
    return;
  }

  const det = await loadDeterministic();
  const sem = await loadSemantic();
  const pw = await loadPairwise();
  const raw = await loadRaw();

  const deterministicSummary = buildDeterministicSummary(det);
  const semanticSummary = buildSemanticSummary(sem);
  const pairwiseSummary = buildPairwiseSummary(pw);
  const efficiencySummary = buildEfficiencySummary(raw);
  const judgeUsageCost = await buildJudgeUsageCost();
  const disagreementAudit = await buildDisagreementAudit(det, sem);
  const normalizationSensitivity = await buildNormalizationSensitivity(sem, pw);
  const scoreStringRecoveryAudit = await auditScoreStringRecovery();
  const bootstrapSummary = buildBootstrapSummary(det, pw);
  const randomSample = await buildRandomSample(det, sem, pw, raw);
  const manualAudit = await buildManualAudit(det, sem, disagreementAudit, randomSample);

  const evaluatorGitCommit = gitCommit(AGENT_ROOT);
  const manifestJson = await readJsonFile<Record<string, unknown>>(MANIFEST_PATH);
  const detSummaryJson = await readJsonFile<Record<string, unknown>>(DET_SUMMARY_PATH);
  const materializationFreeze = await readJsonFile<Record<string, unknown>>(FREEZE_MANIFEST_PATH);

  const aggregateResults = {
    schemaVersion: "v2-six-subject-final-aggregate-results-v1",
    experimentId: EXPERIMENT_ID,
    generatedAtCommit: evaluatorGitCommit,
    dimensions: { applications: ["p01", "p02"], implementations: IMPLEMENTATIONS, note: "P01 and P02 are reported separately throughout; any pooled P01+P02 view is secondary descriptive context only (see RESULTS.md)." },
    frozenInputVerification: verify,
    deterministicHeadline: deterministicSummary.byApplicationImplementation,
    semanticHeadline: semanticSummary.byApplicationImplementation,
    pairwiseHeadline: pairwiseSummary.byApplicationPair,
    efficiencyHeadline: efficiencySummary.byApplicationImplementation,
    bootstrap: bootstrapSummary,
    judgeUsageCostHeadline: { originalBatchTotalCostUsd: judgeUsageCost.originalBatch.usage.estimatedCostUsd.total, retryBatchTotalCostUsd: judgeUsageCost.retryBatch.usage.estimatedCostUsd.total, combinedTotalCostUsd: judgeUsageCost.combined.estimatedCostUsd.total },
    disagreementCounts: disagreementAudit.counts,
    manualAuditOutcomeCounts: manualAudit.combinedManualAuditOutcomeCounts,
  };

  await import("node:fs/promises").then((m) => m.mkdir(FINAL_ANALYSIS_DIR, { recursive: true }));
  const artifacts: { name: string; content: unknown }[] = [
    { name: "aggregate-results.json", content: aggregateResults },
    { name: "deterministic-summary.json", content: deterministicSummary },
    { name: "semantic-summary.json", content: semanticSummary },
    { name: "pairwise-summary.json", content: pairwiseSummary },
    { name: "efficiency-summary.json", content: efficiencySummary },
    { name: "judge-usage-cost.json", content: judgeUsageCost },
    { name: "disagreement-audit.json", content: disagreementAudit },
    { name: "manual-audit.json", content: manualAudit },
    { name: "normalization-sensitivity.json", content: { ...normalizationSensitivity, scoreStringRecoveryAudit } },
  ];
  for (const a of artifacts) await writeJsonFile(join(FINAL_ANALYSIS_DIR, a.name), a.content);

  const resultsMd = buildResultsMarkdown({ deterministicSummary, semanticSummary, pairwiseSummary, efficiencySummary, judgeUsageCost, disagreementAudit, manualAudit, normalizationSensitivity, bootstrapSummary, randomSample, verify });
  await writeFile(join(RESULTS, "RESULTS.md"), resultsMd, "utf8");

  // Freeze manifest over all analysis artifacts EXCEPT itself -- a file cannot contain its
  // own hash (same non-self-referential-provenance principle used for plan.json elsewhere in this
  // experiment). Excluding it here also keeps this whole file idempotent/reproducible across
  // reruns: without this exclusion, a second run would sweep the first run's freeze manifest into
  // its own input list and produce a different aggregate hash every time.
  const analysisFiles = (await listJsonFiles(FINAL_ANALYSIS_DIR)).filter((f) => f !== "final-analysis-freeze.v1.json");
  const fileHashes: { path: string; sha256: string }[] = [];
  for (const f of analysisFiles) fileHashes.push({ path: rel(join(FINAL_ANALYSIS_DIR, f)), sha256: await sha256OfFile(join(FINAL_ANALYSIS_DIR, f)) });
  fileHashes.push({ path: rel(join(RESULTS, "RESULTS.md")), sha256: await sha256OfFile(join(RESULTS, "RESULTS.md")) });
  fileHashes.sort((a, b) => a.path.localeCompare(b.path));
  const aggregateSha256 = computeAggregateSha256(fileHashes);

  const freezeManifest = {
    schemaVersion: "v2-six-subject-final-analysis-freeze-v1",
    experimentId: EXPERIMENT_ID,
    provenance: {
      subjectGeneration: { commits: (manifestJson as any).commits, hashes: (manifestJson as any).hashes, models: (manifestJson as any).models, temperatures: (manifestJson as any).temperatures },
      evaluatorScenarioHashesAtDeterministicRun: (detSummaryJson as any).provenanceRecord,
      acceptedDeterministicEvaluatorVersion: (detSummaryJson as any).hotfixVersion,
      evaluatorCorrections: "benchmarks/six-subject/EVALUATOR_CORRECTIONS.md",
      judgePlanSha256: EXPECTED_MASTER_PLAN_SHA256,
      judgeMaterializationAggregateSha256: EXPECTED_MATERIALIZATION_AGGREGATE_SHA256,
      judgeMaterializationCounts: (materializationFreeze as any).counts,
      analysisCodeCommit: evaluatorGitCommit,
    },
    seeds: { bootstrapSeed: BOOTSTRAP_SEED, bootstrapResamples: BOOTSTRAP_RESAMPLES, randomSampleSeed: RANDOM_SAMPLE_SEED, randomSamplePerStratum: RANDOM_SAMPLE_PER_STRATUM, scoreStringRecoverySampleSeed: 20260823 },
    counts: {
      deterministicRuns: det.size, semanticRuns: sem.size, pairwiseComparisons: pw.size, rawSubjectRuns: raw.size,
      hardDeterministicFailures: deterministicSummary.hardFailures.length, hardSemanticViolations: semanticSummary.totals.hardSemanticViolations,
      disagreementA: disagreementAudit.counts.A_detHardFail_semScore2, disagreementB: disagreementAudit.counts.B_detAllPass_semScore0, disagreementC: disagreementAudit.counts.C_externalActionFailed_semTreatsAsSatisfied, disagreementD: disagreementAudit.counts.D_semHardViolation_noDetHardFail,
      randomSampleRuns: randomSample.totalSampledRuns,
    },
    fileHashes,
    aggregateFileCount: fileHashes.length,
    aggregateSha256,
    createdAt: new Date().toISOString(),
  };
  await writeJsonFile(join(FINAL_ANALYSIS_DIR, "final-analysis-freeze.v1.json"), freezeManifest);

  console.log(JSON.stringify({
    status: "materialized",
    deterministicHardFailureCount: deterministicSummary.hardFailures.length,
    semanticHardViolationCount: semanticSummary.totals.hardSemanticViolations,
    disagreementCounts: disagreementAudit.counts,
    aggregateSha256,
  }, null, 2));
}

function buildResultsMarkdown(ctx: any): string {
  const { deterministicSummary, semanticSummary, pairwiseSummary, efficiencySummary, judgeUsageCost, disagreementAudit, manualAudit, normalizationSensitivity, bootstrapSummary, randomSample } = ctx;
  const pct = (x: number | null) => x === null ? "n/a" : `${(x * 100).toFixed(1)}%`;
  const usd = (x: number) => `$${x.toFixed(4)}`;

  const detTable = deterministicSummary.byApplicationImplementation.map((r: any) =>
    `| ${r.applicationId} | ${r.implementationId} | ${r.totalAssertions} | ${r.tally.pass} (${pct(r.passRate)}) | ${r.tally.hard_fail} (${pct(r.hardFailRate)}) | ${r.tally.inconclusive} (${pct(r.inconclusiveRate)}) | ${r.tally.not_applicable} |`
  ).join("\n");

  const semTable = semanticSummary.byApplicationImplementation.map((r: any) =>
    `| ${r.applicationId} | ${r.implementationId} | ${r.total} | ${r.score2.count} (${pct(r.score2.rate)}) | ${r.score1.count} (${pct(r.score1.rate)}) | ${r.score0.count} (${pct(r.score0.rate)}) | ${r.meanRequirementScoreDescriptiveOnly?.toFixed(3)} |`
  ).join("\n");

  const pwTable = pairwiseSummary.byApplicationPair.map((r: any) => {
    const w = r.wins;
    const wl = Object.entries(w).map(([k, v]) => `${k}=${v}`).join(", ");
    return `| ${r.applicationId} | ${r.pair} | ${wl} | ${r.ties} | ${r.bothBad} | ${r.totalComparisons} | ${pct(r.winRateExcludingTiesAndBothBad.leftImplWinRate)} (${r.leftImplementation}) |`;
  }).join("\n");

  const critTable = pairwiseSummary.criterionPreferences.map((r: any) => {
    const pc = Object.entries(r.preferenceCounts).map(([k, v]) => `${k}=${v}`).join(", ");
    return `| ${r.applicationId} | ${r.pair} | ${r.criterion} | ${pc} | ${r.totalJudgments} |`;
  }).join("\n");

  const effTable = efficiencySummary.byApplicationImplementation.map((r: any) =>
    `| ${r.applicationId} | ${r.implementationId} | ${r.modelCalls.mean?.toFixed(2)} | ${r.callsPerUserTurn.mean?.toFixed(2)} | ${r.userTurns.mean?.toFixed(2)} | ${r.toolCapabilityDispatchCount.mean?.toFixed(2)} | ${r.inputTokens.availableCount}/${r.runs} |`
  ).join("\n");

  const disagreementTable = `| Category | Count | Definition |\n|---|---|---|\n| A | ${disagreementAudit.counts.A_detHardFail_semScore2} | deterministic hard_fail AND semantic score==2 |\n| B | ${disagreementAudit.counts.B_detAllPass_semScore0} | deterministic all-pass AND semantic score==0 |\n| C | ${disagreementAudit.counts.C_externalActionFailed_semTreatsAsSatisfied} | external-action-type assertion failed but semantic treats requirement as satisfied |\n| D | ${disagreementAudit.counts.D_semHardViolation_noDetHardFail} | semantic hard violation with no corresponding deterministic hard_fail |`;

  const manualAuditTable = `| Outcome | Count |\n|---|---|\n${Object.entries(manualAudit.combinedManualAuditOutcomeCounts).map(([k, v]) => `| ${k} | ${v} |`).join("\n")}`;

  const usageTable = `| Batch | Requests | Prompt tokens | Output tokens (candidates+thoughts) | Est. cost |\n|---|---|---|---|---|\n| Original | ${judgeUsageCost.originalBatch.requestCount} | ${judgeUsageCost.originalBatch.usage.promptTokenCount} | ${judgeUsageCost.originalBatch.usage.billableOutputTokenCount} | ${usd(judgeUsageCost.originalBatch.usage.estimatedCostUsd.total)} |\n| Retry | ${judgeUsageCost.retryBatch.requestCount} | ${judgeUsageCost.retryBatch.usage.promptTokenCount} | ${judgeUsageCost.retryBatch.usage.billableOutputTokenCount} | ${usd(judgeUsageCost.retryBatch.usage.estimatedCostUsd.total)} |\n| **Combined** | ${judgeUsageCost.combined.totalRequests} | ${judgeUsageCost.combined.promptTokenCount} | ${judgeUsageCost.combined.billableOutputTokenCount} | **${usd(judgeUsageCost.combined.estimatedCostUsd.total)}** |`;

  const sensitivityTable = `| View | Semantic score2 rate | Semantic score0 rate | Pairwise decisive-verdict rate | Pairwise tie rate |\n|---|---|---|---|---|\n| Primary (all 738) | ${pct(normalizationSensitivity.primary_allFrozenValidOutputs.semantic.score2Rate)} | ${pct(normalizationSensitivity.primary_allFrozenValidOutputs.semantic.score0Rate)} | ${pct(normalizationSensitivity.primary_allFrozenValidOutputs.pairwise.decisiveVerdictRate)} | ${pct(normalizationSensitivity.primary_allFrozenValidOutputs.pairwise.tieRate)} |\n| Excluding normalized (${normalizationSensitivity.normalizedOutputCounts.totalOf738} outputs) | ${pct(normalizationSensitivity.sensitivity_excludingAnyNormalizedOutput.semantic.score2Rate)} | ${pct(normalizationSensitivity.sensitivity_excludingAnyNormalizedOutput.semantic.score0Rate)} | ${pct(normalizationSensitivity.sensitivity_excludingAnyNormalizedOutput.pairwise.decisiveVerdictRate)} | ${pct(normalizationSensitivity.sensitivity_excludingAnyNormalizedOutput.pairwise.tieRate)} |`;

  return `# v2-six-subject-run-1 — Final P01/P02 Benchmark Analysis

Generated offline from frozen inputs. Zero API/model calls. No evaluator/scenario/prompt logic
changed. No judge normalization changed. No benchmark subjects rerun.

Evidence navigation: [conversations](conversations/arrokothai/README.md) · [raw runs](raw/) ·
[deterministic evaluations](evaluations/deterministic/) · [semantic evaluations](evaluations/semantic/) ·
[pairwise evaluations](evaluations/pairwise/) · [analysis artifacts](analysis/) · [judge evidence](judge/)

## A. Deterministic results by application/implementation

Denominator for passRate/hardFailRate = pass+hard_fail+soft_fail (not_applicable and inconclusive
excluded; inconclusiveRate uses that + inconclusive as its own denominator). All assertions in
this rubric are severity "hard" — there is no separate soft-failure track.

| App | Implementation | Assertions | Pass | Hard fail | Inconclusive | N/A |
|---|---|---|---|---|---|---|
${detTable}

Full hard-failure listing (${deterministicSummary.hardFailures.length} rows): see
[deterministic-summary.json](analysis/deterministic-summary.json) field "hardFailures".

## B. Semantic results by application/implementation

Mean requirement score is a **descriptive statistic only**, not the primary benchmark score.

| App | Implementation | Requirement judgments | Score 2 | Score 1 | Score 0 | Mean (descriptive) |
|---|---|---|---|---|---|---|
${semTable}

Hard semantic violations: ${semanticSummary.totals.hardSemanticViolations} across
${semanticSummary.totals.runsWithAtLeastOneHardViolation} runs — see
[semantic-summary.json](analysis/semantic-summary.json) field "hardSemanticViolationDetail".

## C. Pairwise W/T/L/both_bad by application/pair

A/B blind labels are resolved to real implementation names via each record's own
"implementationAssignment" field before aggregation — raw A/B labels are never reported here.

| App | Pair | Wins | Ties | Both bad | Total | Decisive win rate (left impl) |
|---|---|---|---|---|---|---|
${pwTable}

"Left"/"right" is a fixed canonical ordering (original < agenerateor < arrokothai), not the
randomized A/B assignment. Win rate including ties as 0.5 is reported as a secondary descriptive
statistic only in [pairwise-summary.json](analysis/pairwise-summary.json).

## D. Pairwise criterion preferences

| App | Pair | Criterion | Preference counts | Total judgments |
|---|---|---|---|---|
${critTable}

## E. Efficiency

Reported entirely separately from quality — never combined into a weighted score.

| App | Implementation | Mean model calls | Mean calls/user turn | Mean user turns | Mean dispatch count | Token usage available |
|---|---|---|---|---|---|---|
${effTable}

Full mean/median/range/IQR per cell: see [efficiency-summary.json](analysis/efficiency-summary.json).

## F. Disagreement categories (deterministic vs. semantic)

${disagreementTable}

Every individual case, its deterministic evidence, semantic reason, and a manual classification
(deterministic evaluator likely correct / semantic judge likely correct / both defensible —
criterion mismatch / evaluator limitation / subject behavior genuinely ambiguous) is recorded in
[disagreement-audit.json](analysis/disagreement-audit.json). No score was modified during this audit.

### Disagreement audit — manual classifications (narrative)

${disagreementNarrative(disagreementAudit)}

## G. Manual audit outcomes

${manualAuditTable}

Methodology: mechanical, evidence-grounded assertion types (state_equals, numeric_close,
dispatch_count, record_ids_exact/count, runtime_error_absent, action_requested/not_requested,
confirmation_payload_matches_action_payload) were checked against their own detail string for
instrumentation-limitation markers; the disagreement audit above independently classified every
deterministic-vs-semantic disagreement pattern from direct evidence inspection; a fixed-seed
stratified random sample of ${randomSample.totalSampledRuns} runs (${randomSample.perStratum} per
app×implementation stratum, seed ${randomSample.seed}) was independently read end-to-end — see
[manual-audit.json](analysis/manual-audit.json) and the "Random manual sample" section below.

## H. Judge usage / cost

${usageTable}

Estimated from recorded provider usageMetadata × published Gemini 3.5 Flash Batch API rates
(input $0.75/1M, output $4.50/1M, output pricing includes thinking tokens) — **not** provider
billing truth. This explains why an interactive AI Studio quota display may show zero usage for
this experiment: these are Batch API calls, tracked/billed separately from interactive quota.

## I. Normalization sensitivity

${sensitivityTable}

${normalizationSensitivity.normalizedOutputCounts.totalOf738} of 738 judge outputs required
normalization (7 semantic + 6 pairwise). This view is descriptive only — it is not used to
cherry-pick conclusions; see [normalization-sensitivity.json](analysis/normalization-sensitivity.json) for
the full score_string_to_number recovery spot-check (12 outputs sampled, fixed seed 20260823).

## Bootstrap (scenario-clustered, fixed seed)

Seed ${bootstrapSummary.bootstrapSeed}, ${bootstrapSummary.resamples} resamples, clustering unit:
${bootstrapSummary.clusteringUnit}. See [aggregate-results.json](analysis/aggregate-results.json) field
"bootstrap" for full deterministic hard-fail-rate and pairwise decisive-win-rate 95% intervals by
application×implementation / application×pair.

## Random manual sample

${randomSampleNarrative(randomSample)}

## Conclusion

**OBSERVED:** See tables A–I above; all figures are directly computed from the frozen 369
deterministic evaluations, 369 semantic judge outputs, 369 pairwise judge comparisons, and 369
subject raw traces for P01 and P02.

**INTERPRETATION:** Deterministic pass rates are highest for p01-agenerateor and p02-arrokothai
in this run; p02-agenerateor and p01-original/p02-original show more deterministic hard failures,
concentrated in a small number of requirement ids (see byRequirementId in
deterministic-summary.json). Pairwise blind comparisons broadly track the deterministic/semantic
pattern for the pairs and requirement ids where deterministic and semantic evidence agree, per the
disagreement audit above. Where an implementation shows more model calls per user turn, that is
reported as a separate, non-scored architectural tradeoff (see efficiency-summary.json), not
folded into any quality score.

**LIMITATION:** These are two calibrated development/regression benchmark applications (P01, P02)
authored alongside these three implementations; results do not generalize statistically to unseen
applications (no P03/P04 claim is made here), do not establish universal superiority of any
implementation, and side-effect counts (dispatch_count, record_ids_exact, etc.) describe what was
observed in these specific frozen traces, not a guarantee of exactly-once behavior in general.
P01/P02 are not held-out tests of these implementations.
`;
}

function disagreementNarrative(disagreementAudit: any): string {
  const lines: string[] = [];
  for (const [bucketKey, label] of [["A_deterministicHardFail_semanticScore2", "A"], ["B_deterministicAllPass_semanticScore0", "B"], ["C_externalActionFailed_semanticTreatsAsSatisfied", "C"], ["D_semanticHardViolation_noCorrespondingDeterministicHardFail", "D"]] as const) {
    const items = disagreementAudit[bucketKey] as any[];
    const seen = new Set<string>();
    for (const item of items) {
      const patternKey = `${item.scenario}|${item.requirementId}|${item.implementation}`;
      if (seen.has(patternKey)) continue;
      seen.add(patternKey);
      lines.push(`- **[${label}]** \`${item.scenario}\`/\`${item.requirementId}\`/\`${item.implementation}\` (${items.filter((i) => `${i.scenario}|${i.requirementId}|${i.implementation}` === patternKey).length} repeat(s)) — **${item.classification}**: ${item.classificationNote}`);
    }
  }
  return lines.join("\n");
}

function randomSampleNarrative(randomSample: any): string {
  const lines: string[] = [`Seed \`${randomSample.seed}\`, ${randomSample.perStratum} runs per app×implementation stratum, ${randomSample.totalSampledRuns} total.`, "", "| Run | Det hard fails | Sem hard violations | Classification |", "|---|---|---|---|"];
  for (const e of randomSample.entries) {
    lines.push(`| \`${e.runId}\` | ${e.deterministic.hardFailures} | ${e.semantic?.hardSemanticViolations.length ?? "n/a"} | ${e.classification} |`);
  }
  return lines.join("\n");
}

// Guard so importing this module (e.g. from tests, to reach the pure exported helpers) never
// triggers the CLI's filesystem-writing/reading behavior -- only running this file directly does.
const isDirectlyExecuted = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectlyExecuted) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
