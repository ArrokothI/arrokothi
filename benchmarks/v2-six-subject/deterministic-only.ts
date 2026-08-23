// evaluator-v2-hotfix.1 (2026-08-23) — deterministic-only pass over the 369 frozen
// v2-six-subject-run-1 raw artifacts.
//
// This script performs NO subject execution, NO semantic judge calls, and NO pairwise judge
// calls. It only reads already-frozen raw JSON under benchmarks/results/v2-six-subject-run-1/raw/
// (never writes there) and runs the corrected deterministic evaluator-v2 assertions plus a
// mechanical provider-identity provenance check over them.
//
// Usage:
//   node --experimental-strip-types benchmarks/v2-six-subject/deterministic-only.ts
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { classifyRunValidity, evaluateDeterministic, type DeterministicEvaluation, type NeutralRawRunV2 } from "../evaluator-v2/index.ts";
import { deterministicRequirementOutcomes } from "../evaluator-v2/deterministic/assertions.ts";
import {
  EXPERIMENT_ID, OUTPUT, ROOT, SUBJECT_MODEL, expectedUnits, gitCommit, gitCommitTimestamp, readJson, scenarios, treeHash, writeJson,
} from "./orchestration.ts";

// evaluator-v2-hotfix.3 supersedes .2 on the same date/branch/PR (freeze-boundary audit):
//   - issue 0: reverted hotfix.2's contact_time_preserved semantic rubric addition on
//     P02-V2-S13/S15/S17 — the frozen semantic rubric contract must not expand post hoc.
//     semanticRubric arrays are now structurally identical to the generation-time baseline
//     (commit 7b580b47ba58aa748d710e9427b4d3208e3f8425) for every P01/P02 scenario.
//   - issue 1: best_contact_time returns to deterministic evaluation (P02-R13 is a deterministic
//     action requirement) via a new, narrow, documented, symmetric canonicalizer
//     (action_payload_time_preference_equals / canonicalizeTimePreference() in
//     deterministic/assertions.ts) instead of a semantic rubric item.
//   - issue 2: confirmation_payload_matches_action_payload's missing-data semantics now
//     distinguish "instrumentation genuinely unavailable" (not_applicable/inconclusive) from
//     "instrumentation available but no confirmation happened before a dispatch" (hard fail).
//   - issue 3: record_field_equals gained an opt-in numeric_or_currency compare mode, used by
//     P02-V2-S12, so a numeric price and its formatted-currency-string equivalent are recognized
//     as the same fact.
// evaluator-v2-hotfix.4 supersedes .3 on the same date/branch/PR (eliminate KNOWN FALSE
// deterministic observations before judge-only builds semantic prompts):
//   - issue 1: resolveComputationValue() resolves a "computation" source from the LATEST
//     authoritative ToolExecutionSucceeded fact in nativeTrace when present (evidence-driven,
//     never implementation-name-based), instead of trusting a possibly-stale
//     deterministicComputations value. Fixes P01-V2-S09/S18 arrokothai's stale 9.9 m3.
//   - issue 2: numeric_close/numeric_range gained an explicit, opt-in `fallback` source, used
//     only when the primary is unavailable. All 7 P01 volume scenarios declare
//     fallback: {source:"state", key:"volume"}, fixing agenerateor's empty
//     deterministicComputations (its volume was already correctly present under
//     canonicalFinalState.volume).
//   - issue 3: a semantic-judge contamination gate (deterministic/gate.ts,
//     assertNoKnownMechanicalDefects()) recomputes each evaluation fresh and rejects any
//     evaluation about to be embedded in a judge prompt that disagrees with a fresh
//     recomputation — a pure freshness invariant, not a registry of scenario/implementation
//     names. Wired into judge-only.ts's preparePlan().
//   - issue 4: contains_source_fact also checks the merged recordObservations[].fields bag, and
//     P02-V2-S09's grand_salon_size_fact assertion key was corrected to
//     "skyline_penthouse_grand_salon_size" (the key the adapter's already-existing, unmodified
//     synthesis logic actually uses) — the raw arrokothai artifact already contained this fact
//     under that key.
// Output is written to the same deterministic-hotfix-1/ location established by .1; only the
// hotfixVersion string and content change.
const HOTFIX_VERSION = "evaluator-v2-hotfix.4";
const HOTFIX_DATE = "2026-08-23";
const HOTFIX_OUTPUT = join(OUTPUT, "deterministic-hotfix-1");

type ProvenanceStatus = "matched" | "unavailable" | "mismatch";

interface UnitProvenance {
  unitId: string;
  implementationId: string;
  requestedModel: string | undefined;
  requestedMatchesExpected: boolean;
  providerReportedStatus: ProvenanceStatus;
  providerReportedValues: string[];
}

function providerReportedValues(run: NeutralRawRunV2): string[] {
  const reported = run.reportedModel?.providerReported ?? run.requestedModel?.providerReported;
  if (!reported) return [];
  return Array.isArray(reported) ? reported : [reported];
}

function provenanceFor(unitId: string, implementationId: string, run: NeutralRawRunV2): UnitProvenance {
  const requested = run.requestedModel?.requested ?? run.reportedModel?.requested;
  const reported = providerReportedValues(run);
  // EVAL-HOTFIX-2026-08-23: report provider-reported identity as one of three explicit states.
  // "unavailable" (no provider-reported value in the raw artifact — expected for Agenerateor,
  // whose transport does not expose it) must never be folded into "matched"; only an actually
  // present and equal value is "matched", and an actually present but different value is
  // "mismatch". classifyRunValidity() already treats "unavailable" as non-blocking for validity
  // (correctly — it cannot prove a mismatch it cannot observe); this table exists so that
  // "unavailable" and "matched" are never conflated in reporting either.
  let providerReportedStatus: ProvenanceStatus;
  if (reported.length === 0) providerReportedStatus = "unavailable";
  else if (reported.every((value) => value === requested)) providerReportedStatus = "matched";
  else providerReportedStatus = "mismatch";
  return {
    unitId,
    implementationId,
    requestedModel: requested,
    requestedMatchesExpected: requested === SUBJECT_MODEL,
    providerReportedStatus,
    providerReportedValues: reported,
  };
}

interface RequirementTally {
  pass: number;
  hard_fail: number;
  soft_fail: number;
  inconclusive: number;
  not_applicable: number;
}

function emptyTally(): RequirementTally {
  return { pass: 0, hard_fail: 0, soft_fail: 0, inconclusive: 0, not_applicable: 0 };
}

function rate(tally: RequirementTally): { passRate: number | null; hardFailRate: number | null; softFailRate: number | null; inconclusiveRate: number | null } {
  const judged = tally.pass + tally.hard_fail + tally.soft_fail;
  const scored = judged + tally.inconclusive;
  return {
    passRate: judged ? tally.pass / judged : null,
    hardFailRate: judged ? tally.hard_fail / judged : null,
    softFailRate: judged ? tally.soft_fail / judged : null,
    inconclusiveRate: scored ? tally.inconclusive / scored : null,
  };
}

async function main() {
  const rawDir = join(OUTPUT, "raw");
  const rawFiles = (await readdir(rawDir, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(".json"));
  const units = expectedUnits();
  if (rawFiles.length !== units.length) {
    throw new Error(`Expected ${units.length} frozen raw artifacts, found ${rawFiles.length} files in ${rawDir}. Refusing to run deterministic-only over an incomplete/unexpected corpus.`);
  }

  const perUnitResults: Array<{ unitId: string; applicationId: string; implementationId: string; scenarioId: string; repeatId: string; evaluation: DeterministicEvaluation; invalid: boolean }> = [];
  const provenance: UnitProvenance[] = [];
  const missingScenario: string[] = [];

  for (const unit of units) {
    const run = await readJson<NeutralRawRunV2>(unit.rawPath);
    if (!run) throw new Error(`Missing frozen raw artifact for ${unit.id} at ${unit.rawPath}`);
    const validity = classifyRunValidity(run, { expectedRequestedModel: SUBJECT_MODEL, requireProviderReportedModelMatch: true });
    if (!validity.valid) throw new Error(`Frozen raw artifact ${unit.id} failed validity re-check post-hotfix: ${validity.reason} (${validity.detail}). Raw corpus must not be mutated to fix this.`);

    const scenario = scenarios.find((item) => item.id === unit.scenario.id);
    if (!scenario) {
      missingScenario.push(unit.id);
      continue;
    }

    const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    perUnitResults.push({ unitId: unit.id, applicationId: scenario.applicationId, implementationId: unit.implementationId, scenarioId: scenario.id, repeatId: unit.repeatId, evaluation, invalid: evaluation.invalid });
    provenance.push(provenanceFor(unit.id, unit.implementationId, run));

    await writeJson(join(HOTFIX_OUTPUT, `${unit.id}.json`), { hotfixVersion: HOTFIX_VERSION, ...evaluation });
  }

  if (missingScenario.length) throw new Error(`No scenario definition found for units: ${missingScenario.join(", ")}`);

  // Requirement-level tallies, grouped by applicationId x implementationId, mirroring
  // aggregateRepeatedRuns()'s requirement-weighted (not assertion-count-weighted) semantics.
  const tallies = new Map<string, { hard: RequirementTally; soft: RequirementTally }>();
  const tallyKey = (applicationId: string, implementationId: string) => `${applicationId}\n${implementationId}`;

  for (const item of perUnitResults) {
    const key = tallyKey(item.applicationId, item.implementationId);
    const current = tallies.get(key) ?? { hard: emptyTally(), soft: emptyTally() };
    for (const requirement of deterministicRequirementOutcomes(item.evaluation.results)) {
      const severities: Array<"hard" | "soft"> = [];
      if (requirement.assertions.some((assertion) => assertion.severity === "hard")) severities.push("hard");
      if (requirement.assertions.some((assertion) => assertion.severity === "soft")) severities.push("soft");
      for (const severity of severities) {
        const tally = current[severity];
        if (requirement.outcome === "pass") tally.pass += 1;
        else if (requirement.outcome === "hard_fail") tally.hard_fail += 1;
        else if (requirement.outcome === "soft_fail") tally.soft_fail += 1;
        else if (requirement.outcome === "inconclusive") tally.inconclusive += 1;
        else tally.not_applicable += 1;
      }
    }
    tallies.set(key, current);
  }

  const deterministicRatesByApplicationAndImplementation = [...tallies.entries()].map(([key, value]) => {
    const [applicationId, implementationId] = key.split("\n");
    return {
      applicationId,
      implementationId,
      hard: { tally: value.hard, ...rate(value.hard) },
      soft: { tally: value.soft, ...rate(value.soft) },
    };
  }).sort((a, b) => (`${a.applicationId}${a.implementationId}`).localeCompare(`${b.applicationId}${b.implementationId}`));

  // S13/S15/S17 audit table: one row per unit, with the assertions the hotfix directly touches.
  const auditScenarioIds = new Set(["P02-V2-S13", "P02-V2-S15", "P02-V2-S17"]);
  const auditRows = perUnitResults
    .filter((item) => auditScenarioIds.has(item.scenarioId))
    .map((item) => {
      const byId = new Map(item.evaluation.results.map((result) => [result.id, result]));
      return {
        unitId: item.unitId,
        scenarioId: item.scenarioId,
        implementationId: item.implementationId,
        repeatId: item.repeatId,
        handoffRequested: byId.get("handoff_requested")?.outcome ?? null,
        dispatchCount: (byId.get("single_dispatch") ?? byId.get("single_dispatch_unknown") ?? byId.get("exactly_one_dispatch"))?.outcome ?? null,
        payloadSubset: (byId.get("payload_corrected_budget") ?? byId.get("payload_success") ?? byId.get("payload_unknown"))?.outcome ?? null,
        // EVAL-HOTFIX-2026-08-23 (issue 1): S13's confirmation assertion id changed from
        // "confirmation_payload_exact" (literal comparison) to
        // "confirmation_matches_dispatched_payload" (confirmation vs. actual dispatched payload).
        confirmationMatchesDispatch: byId.get("confirmation_matches_dispatched_payload")?.outcome ?? null,
        actionOutcome: (byId.get("definite_failure") ?? byId.get("success") ?? byId.get("unknown_outcome"))?.outcome ?? null,
        hardFailures: item.evaluation.hardFailures,
      };
    })
    .sort((a, b) => (a.scenarioId + a.implementationId + a.repeatId).localeCompare(b.scenarioId + b.implementationId + b.repeatId));

  // Provenance summary.
  const provenanceByImplementation = new Map<string, { matched: number; unavailable: number; mismatch: number; requestedWrong: number }>();
  for (const item of provenance) {
    const current = provenanceByImplementation.get(item.implementationId) ?? { matched: 0, unavailable: 0, mismatch: 0, requestedWrong: 0 };
    current[item.providerReportedStatus === "matched" ? "matched" : item.providerReportedStatus === "unavailable" ? "unavailable" : "mismatch"] += 1;
    if (!item.requestedMatchesExpected) current.requestedWrong += 1;
    provenanceByImplementation.set(item.implementationId, current);
  }
  const provenanceSummary = [...provenanceByImplementation.entries()]
    .map(([implementationId, counts]) => ({ implementationId, ...counts }))
    .sort((a, b) => a.implementationId.localeCompare(b.implementationId));
  const mismatches = provenance.filter((item) => item.providerReportedStatus === "mismatch");
  const requestedWrong = provenance.filter((item) => !item.requestedMatchesExpected);

  const generationTimeManifest = await readJson<{ hashes?: { scenarioV2?: string; evaluatorV2?: string } }>(join(OUTPUT, "manifest.json"));
  const summary = {
    schemaVersion: "v2-six-subject-deterministic-hotfix-summary-v1",
    experimentId: EXPERIMENT_ID,
    hotfixVersion: HOTFIX_VERSION,
    hotfixDate: HOTFIX_DATE,
    // EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.3, issue 6): a Git commit's SHA depends on its
    // own contents, so a tracked file can never correctly contain the SHA of the commit that
    // contains that exact version of the file — attempting it (as hotfix.1/.2 did, each requiring
    // an extra "record accurate hash" follow-up commit) is inherently self-referential and was
    // stopped here. This field honestly records the commit HEAD pointed to at generation time —
    // necessarily a PRIOR commit, not the one this file will be committed in — for local
    // reproduction convenience only. The authoritative provenance chain (implementationCommit /
    // provenanceCommit) is recorded in HOTFIX-2026-08-23.md via a documentation-only follow-up
    // commit made AFTER the implementation commit exists, which is not self-referential because
    // it points at an already-existing prior commit.
    observedAtCommit: gitCommit(ROOT),
    observedAtCommitTimestamp: gitCommitTimestamp(ROOT),
    provenanceRecord: {
      generationTimeScenarioHash: generationTimeManifest?.hashes?.scenarioV2 ?? null,
      generationTimeEvaluatorHash: generationTimeManifest?.hashes?.evaluatorV2 ?? null,
      postHotfixScenarioHash: await treeHash(join(ROOT, "benchmarks/scenario-v2")),
      postHotfixEvaluatorHash: await treeHash(join(ROOT, "benchmarks/evaluator-v2")),
    },
    unitsEvaluated: perUnitResults.length,
    invalidUnits: perUnitResults.filter((item) => item.invalid).map((item) => item.unitId),
    deterministicRatesByApplicationAndImplementation,
    s13S15S17AuditTable: auditRows,
    provenance: {
      requestedModelExpected: SUBJECT_MODEL,
      requestedModelMismatches: requestedWrong.map((item) => item.unitId),
      providerReportedMismatches: mismatches.map((item) => ({ unitId: item.unitId, values: item.providerReportedValues })),
      summaryByImplementation: provenanceSummary,
    },
    noLiveCallsMade: { semantic: 0, pairwise: 0, subjectExecutions: 0 },
  };
  await writeJson(join(OUTPUT, "deterministic-hotfix-1-summary.json"), summary);
  process.stdout.write(`${JSON.stringify({ hotfixVersion: HOTFIX_VERSION, unitsEvaluated: summary.unitsEvaluated, invalidUnits: summary.invalidUnits.length, provenanceMismatches: mismatches.length, requestedWrong: requestedWrong.length }, null, 2)}\n`);
}

await main();
