import type { NeutralRawRunV2, PairwiseJudgeOutput, PairwiseCriterionPreference } from "../schema.ts";
import { assertPromptBlindness } from "../semantic/judge.ts";

export const PAIRWISE_PROMPT_VERSION = "pairwise-judge-v1" as const;

export interface PairwisePromptInput {
  scenarioId: string;
  title: string;
  userTurns: string[];
  authoritativeFacts: string[];
  sourceDerivedCriteria: string[];
  left: NeutralRawRunV2;
  right: NeutralRawRunV2;
  seed: string;
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

export function buildPairwiseJudgePrompt(input: PairwisePromptInput): { prompt: string; assignment: { A: string; B: string } } {
  const order = deterministicPairOrder(input.seed);
  const aRun = order === "left_first" ? input.left : input.right;
  const bRun = order === "left_first" ? input.right : input.left;
  const assignment = {
    A: order === "left_first" ? "left" : "right",
    B: order === "left_first" ? "right" : "left",
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

  return { prompt, assignment };
}

function isVerdict(value: unknown): value is "A" | "B" | "tie" | "both_bad" {
  return value === "A" || value === "B" || value === "tie" || value === "both_bad";
}

function parseCriterion(value: unknown): PairwiseCriterionPreference {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("criterion must be an object");
  const record = value as Record<string, unknown>;
  const criterion = record["criterion"];
  const preference = record["preference"];
  if (
    criterion !== "correctness" &&
    criterion !== "grounding" &&
    criterion !== "correction_handling" &&
    criterion !== "truthfulness" &&
    criterion !== "usefulness" &&
    criterion !== "conversational_coherence"
  ) {
    throw new Error("invalid pairwise criterion");
  }
  if (!isVerdict(preference)) throw new Error("invalid pairwise preference");
  if (typeof record["reason"] !== "string") throw new Error("criterion reason must be a string");
  return { criterion, preference, reason: record["reason"] };
}

export function parsePairwiseJudgeOutput(
  raw: string,
  judge: PairwiseJudgeOutput["judge"],
  scenarioId: string,
  assignment: { A: string; B: string },
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

  return {
    schemaVersion: "pairwise-judge-output-v1",
    promptVersion: PAIRWISE_PROMPT_VERSION,
    judge,
    scenarioId,
    assignment,
    verdict: record["verdict"],
    criteria: record["criteria"].map(parseCriterion),
    reason: record["reason"],
    rawStructuredOutput: parsed,
  };
}
