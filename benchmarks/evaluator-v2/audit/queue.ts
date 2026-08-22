import type {
  AuditQueueItem,
  DeterministicEvaluation,
  JsonValue,
  NeutralRawRunV2,
  PairwiseJudgeOutput,
  SemanticJudgeOutput,
} from "../schema.ts";

export interface AuditQueueOptions {
  lowConfidenceThreshold?: number;
  randomSampleRate?: number;
  randomSeed?: string;
}

function hash01(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  return (hash >>> 0) / 0xffffffff;
}

function deterministicSemanticDisagreements(
  deterministic: DeterministicEvaluation | undefined,
  semantic: SemanticJudgeOutput | undefined,
): string[] {
  if (!deterministic || !semantic) return [];
  const hardFailed = new Set(deterministic.results.filter((result) => result.outcome === "hard_fail").map((result) => result.requirementId));
  const semPassed = new Set(semantic.requirementResults.filter((result) => result.score === 2).map((result) => result.requirementId));
  const semFailed = new Set(semantic.requirementResults.filter((result) => result.score === 0).map((result) => result.requirementId));
  const detPassed = new Set(deterministic.results.filter((result) => result.outcome === "pass").map((result) => result.requirementId));

  const disagreements: string[] = [];
  for (const requirementId of hardFailed) {
    if (semPassed.has(requirementId)) disagreements.push(`deterministic hard failure but semantic satisfied: ${requirementId}`);
  }
  for (const requirementId of detPassed) {
    if (semFailed.has(requirementId)) disagreements.push(`deterministic pass but semantic violation: ${requirementId}`);
  }
  return disagreements;
}

export function createAuditQueueItem(
  run: NeutralRawRunV2,
  deterministic?: DeterministicEvaluation,
  semantic?: SemanticJudgeOutput,
  pairwise?: PairwiseJudgeOutput,
  options: AuditQueueOptions = {},
): AuditQueueItem | null {
  const lowConfidenceThreshold = options.lowConfidenceThreshold ?? 0.55;
  const reasons: string[] = [];

  if (run.invalidReason) reasons.push(`invalid run: ${run.invalidReason}`);
  reasons.push(...deterministicSemanticDisagreements(deterministic, semantic));

  for (const result of semantic?.requirementResults ?? []) {
    if (result.confidence < lowConfidenceThreshold) reasons.push(`semantic low confidence: ${result.requirementId}`);
  }
  for (const requirementId of semantic?.hardSemanticViolations ?? []) {
    reasons.push(`hard semantic violation: ${requirementId}`);
  }

  if (pairwise?.verdict === "both_bad") reasons.push("pairwise judged both candidates bad");
  if (pairwise && pairwise.criteria.some((criterion) => criterion.preference !== pairwise.verdict && criterion.preference !== "tie")) {
    reasons.push("pairwise criterion-level contradiction");
  }

  const randomSampleRate = options.randomSampleRate ?? 0;
  if (!reasons.length && randomSampleRate > 0) {
    const seed = `${options.randomSeed ?? "audit"}:${run.scenarioId}:${run.implementationId ?? "unknown"}:${run.repeatId}`;
    if (hash01(seed) < randomSampleRate) reasons.push("random clean-run sample");
  }

  if (!reasons.length) return null;
  return {
    id: `${run.scenarioId}-${run.repeatId}-audit`,
    scenarioId: run.scenarioId,
    repeatId: run.repeatId,
    implementationId: run.implementationId,
    reasons,
    conversation: run.conversation,
    deterministic,
    semantic,
    pairwise,
    evidence: {
      canonicalFinalState: run.canonicalFinalState as JsonValue | undefined,
      exactSelectedRecordIds: run.exactSelectedRecordIds as JsonValue | undefined,
      exactActionPayload: run.exactActionPayload as JsonValue | undefined,
      executorDispatchCount: run.executorDispatchCount,
      terminalActionResult: run.terminalActionResult,
      runtimeErrors: run.runtimeErrors as JsonValue | undefined,
    },
  };
}

export function createAuditQueue(
  runs: readonly NeutralRawRunV2[],
  evaluations: ReadonlyMap<string, DeterministicEvaluation>,
  semantics: ReadonlyMap<string, SemanticJudgeOutput>,
  pairwise: ReadonlyMap<string, PairwiseJudgeOutput> = new Map(),
  options: AuditQueueOptions = {},
): AuditQueueItem[] {
  const items: AuditQueueItem[] = [];
  for (const run of runs) {
    const key = `${run.scenarioId}:${run.repeatId}:${run.implementationId ?? ""}`;
    const item = createAuditQueueItem(run, evaluations.get(key), semantics.get(key), pairwise.get(key), options);
    if (item) items.push(item);
  }
  return items;
}

export function renderAuditItem(item: AuditQueueItem): string {
  const transcript = item.conversation
    .map((turn) => [`User ${turn.turn}: ${turn.user}`, `Assistant ${turn.turn}: ${turn.assistant}`].join("\n"))
    .join("\n\n");
  return [
    `# Manual Audit: ${item.scenarioId} / ${item.repeatId}`,
    "",
    `Implementation: ${item.implementationId ?? "anonymized"}`,
    `Reasons: ${item.reasons.join("; ")}`,
    "",
    "## Conversation",
    "",
    transcript,
    "",
    "## Evidence",
    "",
    "```json",
    JSON.stringify(item.evidence, null, 2),
    "```",
  ].join("\n");
}
