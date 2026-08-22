import type { AssertionOutcome, DeterministicEvaluation, NeutralRawRunV2, SemanticJudgeOutput } from "./schema.ts";

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
  modelCalls: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  dispatchCount: number | null;
}

function rate(values: boolean[]): number | null {
  return values.length ? values.filter(Boolean).length / values.length : null;
}

function sumDefined(values: Array<number | undefined>): number | null {
  const present = values.filter((value): value is number => typeof value === "number");
  return present.length ? present.reduce((a, b) => a + b, 0) : null;
}

function assertionPasses(evaluation: DeterministicEvaluation, severity: "hard" | "soft"): boolean[] {
  return evaluation.results
    .filter((result) => result.severity === severity)
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
    const hardPasses = validItems.flatMap((item) => (item.deterministic ? assertionPasses(item.deterministic, "hard") : []));
    const softPasses = validItems.flatMap((item) => (item.deterministic ? assertionPasses(item.deterministic, "soft") : []));
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
      modelCalls: sumDefined(validItems.map((item) => item.rawRun.modelCallCount)),
      inputTokens: sumDefined(validItems.map((item) => item.rawRun.tokenUsage?.inputTokens)),
      outputTokens: sumDefined(validItems.map((item) => item.rawRun.tokenUsage?.outputTokens)),
      latencyMs: sumDefined(validItems.map((item) => item.rawRun.timing?.elapsedMs)),
      dispatchCount: sumDefined(validItems.map((item) => item.rawRun.executorDispatchCount)),
    };
  });
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
