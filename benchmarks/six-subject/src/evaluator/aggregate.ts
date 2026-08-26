import type { AssertionOutcome, DeterministicEvaluation, NeutralRawRunV2, PairwiseJudgeOutput, SemanticJudgeOutput } from "./schema.ts";
import { deterministicRequirementOutcomes } from "./deterministic/assertions.ts";

export interface RepeatMeasurement {
  scenarioId: string;
  implementationId: string;
  repeatId: string;
  rawRun: NeutralRawRunV2;
  deterministic?: DeterministicEvaluation;
  semantic?: SemanticJudgeOutput;
}

export interface ScenarioImplementationAggregate {
  scenarioId: string;
  implementationId: string;
  repeats: number;
  runtimeInvalidRate: number;
  deterministicHardRequirementPassRate: number | null;
  deterministicSoftRequirementPassRate: number | null;
  semanticRequirementSatisfaction: number | null;
  hardSemanticViolationCount: number;
  meanModelCalls: number | null;
  meanInputTokens: number | null;
  meanOutputTokens: number | null;
  meanLatencyMs: number | null;
  meanDispatchCount: number | null;
}

function rate(values: boolean[]): number | null {
  return values.length ? values.filter(Boolean).length / values.length : null;
}

function meanDefined(values: Array<number | undefined>): number | null {
  const present = values.filter((value): value is number => typeof value === "number");
  return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;
}

function requirementPasses(evaluation: DeterministicEvaluation, severity: "hard" | "soft"): boolean[] {
  return deterministicRequirementOutcomes(evaluation.results)
    .filter((result) => result.assertions.some((assertion) => assertion.severity === severity))
    .filter((result) => result.outcome !== "not_applicable" && result.outcome !== "inconclusive")
    .map((result) => result.outcome === "pass");
}

export function aggregateRepeatedRuns(measurements: readonly RepeatMeasurement[]): ScenarioImplementationAggregate[] {
  const groups = new Map<string, RepeatMeasurement[]>();
  for (const measurement of measurements) {
    const key = `${measurement.scenarioId}\n${measurement.implementationId}`;
    const current = groups.get(key) ?? [];
    current.push(measurement);
    groups.set(key, current);
  }

  return [...groups.values()].map((items) => {
    const first = items[0];
    if (!first) {
      throw new Error("empty aggregate group");
    }
    const validItems = items.filter((item) => !item.rawRun.invalidReason);
    const hardPasses = validItems.flatMap((item) => (item.deterministic ? requirementPasses(item.deterministic, "hard") : []));
    const softPasses = validItems.flatMap((item) => (item.deterministic ? requirementPasses(item.deterministic, "soft") : []));
    const semanticScores = validItems.flatMap((item) => item.semantic?.requirementResults.map((result) => result.score / 2) ?? []);
    const hardSemanticViolationCount = validItems.reduce((sum, item) => sum + (item.semantic?.hardSemanticViolations.length ?? 0), 0);

    return {
      scenarioId: first.scenarioId,
      implementationId: first.implementationId,
      repeats: items.length,
      runtimeInvalidRate: items.filter((item) => item.rawRun.invalidReason).length / items.length,
      deterministicHardRequirementPassRate: rate(hardPasses),
      deterministicSoftRequirementPassRate: rate(softPasses),
      semanticRequirementSatisfaction: semanticScores.length
        ? semanticScores.reduce((a, b) => a + b, 0) / semanticScores.length
        : null,
      hardSemanticViolationCount,
      meanModelCalls: meanDefined(validItems.map((item) => item.rawRun.modelCallCount)),
      meanInputTokens: meanDefined(validItems.map((item) => item.rawRun.tokenUsage?.inputTokens)),
      meanOutputTokens: meanDefined(validItems.map((item) => item.rawRun.tokenUsage?.outputTokens)),
      meanLatencyMs: meanDefined(validItems.map((item) => item.rawRun.timing?.elapsedMs)),
      meanDispatchCount: meanDefined(validItems.map((item) => item.rawRun.executorDispatchCount)),
    };
  });
}

export interface PairwiseAggregate {
  implementationId: string;
  wins: number;
  ties: number;
  losses: number;
  bothBad: number;
}

export function aggregatePairwiseOutcomes(outputs: readonly PairwiseJudgeOutput[]): PairwiseAggregate[] {
  const aggregates = new Map<string, PairwiseAggregate>();
  const ensure = (implementationId: string): PairwiseAggregate => {
    const current = aggregates.get(implementationId);
    if (current) return current;
    const created = { implementationId, wins: 0, ties: 0, losses: 0, bothBad: 0 };
    aggregates.set(implementationId, created);
    return created;
  };

  for (const output of outputs) {
    const a = output.implementationAssignment?.A;
    const b = output.implementationAssignment?.B;
    if (!a || !b) continue;
    const aAggregate = ensure(a);
    const bAggregate = ensure(b);
    if (output.verdict === "A") {
      aAggregate.wins += 1;
      bAggregate.losses += 1;
    } else if (output.verdict === "B") {
      bAggregate.wins += 1;
      aAggregate.losses += 1;
    } else if (output.verdict === "tie") {
      aAggregate.ties += 1;
      bAggregate.ties += 1;
    } else {
      aAggregate.bothBad += 1;
      bAggregate.bothBad += 1;
    }
  }

  return [...aggregates.values()].sort((a, b) => a.implementationId.localeCompare(b.implementationId));
}

export function tallyAssertionOutcomes(evaluations: readonly DeterministicEvaluation[]): Record<AssertionOutcome, number> {
  const out: Record<AssertionOutcome, number> = {
    pass: 0,
    soft_fail: 0,
    hard_fail: 0,
    not_applicable: 0,
    inconclusive: 0,
  };
  for (const evaluation of evaluations) {
    for (const result of evaluation.results) out[result.outcome]++;
  }
  return out;
}
