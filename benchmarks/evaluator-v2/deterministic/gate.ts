// EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.4, issue 3): semantic-judge contamination gate.
//
// judge-only.ts embeds a run's DeterministicEvaluation verbatim into the semantic judge prompt
// (`deterministicObservations`). If that evaluation were ever built from stale or otherwise
// invalid evidence — for example, a cached deterministic/*.json written by an earlier hotfix
// round before a mechanical defect was fixed — the judge would see a false hard_fail/inconclusive
// result presented as authoritative context and could be biased by it.
//
// This gate is a pure freshness invariant, not a registry of scenario/implementation names: it
// recomputes the evaluation for (scenario, run) with the CURRENT evaluator code and compares it,
// assertion by assertion, to the evaluation about to be embedded in a prompt. Any mismatch means
// the supplied evaluation was not produced by the current, already-fixed evaluator — i.e. it is
// exactly the class of "known invalid evaluator evidence" this gate exists to reject. A genuine
// subject failure or a legitimate inconclusive result is, by definition, reproduced identically
// by a fresh recomputation, so it never trips this gate.
import { evaluateDeterministic } from "./assertions.ts";
import type { DeterministicAssertionSpec, DeterministicEvaluation, NeutralRawRunV2 } from "../schema.ts";

export interface MechanicalDefectViolation {
  unitId: string;
  assertionId: string;
  suppliedOutcome: string;
  freshOutcome: string;
  suppliedDetail: string;
  freshDetail: string;
}

export interface GateScenario {
  id: string;
  expectedDeterministicAssertions: readonly DeterministicAssertionSpec[];
}

export function findMechanicalDefectViolations(
  scenario: GateScenario,
  run: NeutralRawRunV2,
  supplied: DeterministicEvaluation,
): MechanicalDefectViolation[] {
  const fresh = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
  const freshById = new Map(fresh.results.map((result) => [result.id, result]));
  const unitId = `${run.scenarioId}-${run.implementationId ?? "unknown"}-${run.repeatId}`;
  const violations: MechanicalDefectViolation[] = [];
  for (const suppliedResult of supplied.results) {
    const freshResult = freshById.get(suppliedResult.id);
    if (!freshResult) continue; // assertion set itself changed; not this gate's concern
    if (freshResult.outcome !== suppliedResult.outcome || freshResult.detail !== suppliedResult.detail) {
      violations.push({
        unitId,
        assertionId: suppliedResult.id,
        suppliedOutcome: suppliedResult.outcome,
        freshOutcome: freshResult.outcome,
        suppliedDetail: suppliedResult.detail,
        freshDetail: freshResult.detail,
      });
    }
  }
  return violations;
}

export function assertNoKnownMechanicalDefects(scenario: GateScenario, run: NeutralRawRunV2, supplied: DeterministicEvaluation): void {
  const violations = findMechanicalDefectViolations(scenario, run, supplied);
  if (violations.length) {
    throw new Error(
      `Refusing to build a semantic judge prompt from stale/invalid deterministic evidence for ` +
        `${violations[0]!.unitId}: ${JSON.stringify(violations, null, 2)}`,
    );
  }
}
