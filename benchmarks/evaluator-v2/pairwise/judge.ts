import type { NeutralRawRunV2, PairwiseJudgeOutput, PairwiseCriterion, PairwiseCriterionPreference } from "../schema.ts";
import { assertPromptBlindness } from "../semantic/judge.ts";

export const PAIRWISE_PROMPT_VERSION = "pairwise-judge-v1" as const;
export const PAIRWISE_CRITERIA: readonly PairwiseCriterion[] = [
  "correctness",
  "grounding",
  "correction_handling",
  "truthfulness",
  "usefulness",
  "conversational_coherence",
] as const;

export interface PairwisePromptInput {
  scenarioId: string;
  title: string;
  userTurns: string[];
  authoritativeFacts: string[];
  sourceDerivedCriteria: string[];
  left: NeutralRawRunV2;
  right: NeutralRawRunV2;
  seed: string;
  criteria?: readonly PairwiseCriterion[];
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicPairOrder(seed: string): "left_first" | "right_first" {
  return hashSeed(seed) % 2 === 0 ? "left_first" : "right_first";
}

function candidateConversation(run: NeutralRawRunV2) {
  return run.conversation.map((turn) => ({ turn: turn.turn, assistant: turn.assistant }));
}

export function buildPairwiseJudgePrompt(input: PairwisePromptInput): {
  prompt: string;
  assignment: { A: string; B: string };
  implementationAssignment: { A?: string; B?: string };
  expectedCriteria: readonly PairwiseCriterion[];
} {
  const order = deterministicPairOrder(input.seed);
  const aRun = order === "left_first" ? input.left : input.right;
  const bRun = order === "left_first" ? input.right : input.left;
  const expectedCriteria = input.criteria ?? PAIRWISE_CRITERIA;
  const assignment = {
    A: order === "left_first" ? "left" : "right",
    B: order === "left_first" ? "right" : "left",
  };
  const implementationAssignment = {
    A: aRun.implementationId,
    B: bRun.implementationId,
  };

  const prompt = JSON.stringify(
    {
      promptVersion: PAIRWISE_PROMPT_VERSION,
      instruction:
        "Compare two assistant conversations for the same user scenario. Judge only user-facing quality against the task facts and criteria. Return only structured JSON.",
      outputSchema: {
        schemaVersion: "pairwise-judge-output-v1",
        promptVersion: PAIRWISE_PROMPT_VERSION,
        verdict: "A, B, tie, or both_bad",
        criteria: [
          {
            criterion: "correctness | grounding | correction_handling | truthfulness | usefulness | conversational_coherence",
            preference: "A | B | tie | both_bad",
            reason: "short reason",
          },
        ],
        reason: "concise overall reason",
      },
      outputRequirements: {
        criteria: expectedCriteria,
        completeness: "Return exactly one criteria entry for each listed criterion. Do not add unknown criteria.",
      },
      scenario: {
        id: input.scenarioId,
        title: input.title,
        userTurns: input.userTurns,
      },
      authoritativeFacts: input.authoritativeFacts,
      sourceDerivedCriteria: input.sourceDerivedCriteria,
      candidates: {
        A: candidateConversation(aRun),
        B: candidateConversation(bRun),
      },
    },
    null,
    2,
  );

  assertPromptBlindness(prompt, [
    input.left.frameworkId ?? "",
    input.left.implementationId ?? "",
    input.right.frameworkId ?? "",
    input.right.implementationId ?? "",
  ].filter(Boolean));

  return { prompt, assignment, implementationAssignment, expectedCriteria };
}

function isVerdict(value: unknown): value is "A" | "B" | "tie" | "both_bad" {
  return value === "A" || value === "B" || value === "tie" || value === "both_bad";
}

function parseCriterion(value: unknown): PairwiseCriterionPreference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("criterion must be an object");
  const record = value as Record<string, unknown>;
  const criterion = record["criterion"];
  const preference = record["preference"];
  if (!PAIRWISE_CRITERIA.includes(criterion as PairwiseCriterion)) {
    throw new Error("invalid pairwise criterion");
  }
  if (!isVerdict(preference)) throw new Error("invalid pairwise preference");
  if (typeof record["reason"] !== "string") throw new Error("criterion reason must be a string");
  return { criterion: criterion as PairwiseCriterion, preference, reason: record["reason"] };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function duplicateCriteria(values: readonly PairwiseCriterion[]): PairwiseCriterion[] {
  return unique(values.filter((value, index) => values.indexOf(value) !== index));
}

function validatePairwiseCriteria(
  criteria: readonly PairwiseCriterionPreference[],
  expectedCriteria: readonly PairwiseCriterion[],
): void {
  const expected = unique(expectedCriteria);
  const expectedSet = new Set(expected);
  const actual = criteria.map((item) => item.criterion);
  const duplicates = duplicateCriteria(actual);
  if (duplicates.length) throw new Error(`duplicate pairwise criteria: ${duplicates.join(", ")}`);

  const missing = expected.filter((criterion) => !actual.includes(criterion));
  if (missing.length) throw new Error(`missing pairwise criteria: ${missing.join(", ")}`);

  const unknown = actual.filter((criterion) => !expectedSet.has(criterion));
  if (unknown.length) throw new Error(`unknown pairwise criteria: ${unknown.join(", ")}`);
}

export function parsePairwiseJudgeOutput(
  raw: string,
  judge: PairwiseJudgeOutput["judge"],
  scenarioId: string,
  assignment: { A: string; B: string },
  expectedCriteria: readonly PairwiseCriterion[],
  implementationAssignment?: { A?: string; B?: string },
): PairwiseJudgeOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`pairwise judge output was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("pairwise output must be an object");
  const record = parsed as Record<string, unknown>;
  if (record["schemaVersion"] !== "pairwise-judge-output-v1") throw new Error("unexpected pairwise schemaVersion");
  if (record["promptVersion"] !== PAIRWISE_PROMPT_VERSION) throw new Error("unexpected pairwise promptVersion");
  if (!isVerdict(record["verdict"])) throw new Error("invalid pairwise verdict");
  if (!Array.isArray(record["criteria"])) throw new Error("criteria must be an array");
  if (typeof record["reason"] !== "string") throw new Error("pairwise reason must be a string");

  const criteria = record["criteria"].map(parseCriterion);
  validatePairwiseCriteria(criteria, expectedCriteria);

  return {
    schemaVersion: "pairwise-judge-output-v1",
    promptVersion: PAIRWISE_PROMPT_VERSION,
    judge,
    scenarioId,
    assignment,
    implementationAssignment,
    verdict: record["verdict"],
    criteria,
    reason: record["reason"],
    rawStructuredOutput: parsed,
  };
}
