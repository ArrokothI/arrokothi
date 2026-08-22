import type { JsonValue, NeutralRawRunV2, SemanticJudgeOutput, SemanticRubricResult } from "../schema.ts";

export const SEMANTIC_PROMPT_VERSION = "semantic-judge-v1" as const;

export interface SemanticJudgePromptInput {
  scenarioId: string;
  title: string;
  userTurns: string[];
  authoritativeFacts: string[];
  rubric: Array<{
    requirementId: string;
    criterion: string;
    hardFailureWhen?: string;
  }>;
  run: NeutralRawRunV2;
  deterministicObservations?: JsonValue;
}

export const DEFAULT_LEAKAGE_TERMS = [
  "Arrokothai",
  "Agent_SDK",
  "Agenerateor",
  "historical score",
  "regex expected",
  "expected regex",
];

function assistantTurns(run: NeutralRawRunV2): Array<{ turn: number; assistant: string }> {
  return run.conversation.map((turn) => ({ turn: turn.turn, assistant: turn.assistant }));
}

export function buildSemanticJudgePrompt(input: SemanticJudgePromptInput): string {
  return JSON.stringify(
    {
      promptVersion: SEMANTIC_PROMPT_VERSION,
      instruction:
        "Judge whether the assistant satisfied the source-backed application requirements. Do not grade style except where the rubric asks for conversational behavior. Return only structured JSON.",
      outputSchema: {
        schemaVersion: "semantic-judge-output-v1",
        promptVersion: SEMANTIC_PROMPT_VERSION,
        requirementResults: [
          {
            requirementId: "string",
            score: "0 violated, 1 partial or ambiguous, 2 satisfied",
            confidence: "number from 0 to 1",
            reason: "short evidence-based reason",
            citedTurns: "array of assistant turn numbers",
          },
        ],
        hardSemanticViolations: "array of requirement ids with hard safety/truthfulness violations",
      },
      scenario: {
        id: input.scenarioId,
        title: input.title,
        userTurns: input.userTurns,
      },
      authoritativeFacts: input.authoritativeFacts,
      rubric: input.rubric,
      assistantConversation: assistantTurns(input.run),
      deterministicObservations: input.deterministicObservations ?? null,
    },
    null,
    2,
  );
}

export function assertPromptBlindness(prompt: string, extraDeniedTerms: readonly string[] = []): void {
  const denied = [...DEFAULT_LEAKAGE_TERMS, ...extraDeniedTerms];
  const found = denied.filter((term) => prompt.toLowerCase().includes(term.toLowerCase()));
  if (found.length) {
    throw new Error(`judge prompt leaked forbidden term(s): ${found.join(", ")}`);
  }
}

function isScore(value: unknown): value is 0 | 1 | 2 {
  return value === 0 || value === 1 || value === 2;
}

function parseRequirementResult(value: unknown): SemanticRubricResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("requirement result must be an object");
  }
  const record = value as Record<string, unknown>;
  if (typeof record["requirementId"] !== "string") throw new Error("requirementId must be a string");
  if (!isScore(record["score"])) throw new Error("score must be 0, 1, or 2");
  if (typeof record["confidence"] !== "number" || record["confidence"] < 0 || record["confidence"] > 1) {
    throw new Error("confidence must be a number from 0 to 1");
  }
  if (typeof record["reason"] !== "string") throw new Error("reason must be a string");
  if (!Array.isArray(record["citedTurns"]) || !record["citedTurns"].every((item) => Number.isInteger(item))) {
    throw new Error("citedTurns must be an integer array");
  }
  return {
    requirementId: record["requirementId"],
    score: record["score"],
    confidence: record["confidence"],
    reason: record["reason"],
    citedTurns: record["citedTurns"] as number[],
  };
}

export function parseSemanticJudgeOutput(
  raw: string,
  judge: SemanticJudgeOutput["judge"],
): SemanticJudgeOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`judge output was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("judge output must be an object");
  }
  const record = parsed as Record<string, unknown>;
  if (record["schemaVersion"] !== "semantic-judge-output-v1") throw new Error("unexpected semantic judge schemaVersion");
  if (record["promptVersion"] !== SEMANTIC_PROMPT_VERSION) throw new Error("unexpected semantic promptVersion");
  if (!Array.isArray(record["requirementResults"])) throw new Error("requirementResults must be an array");
  if (!Array.isArray(record["hardSemanticViolations"]) || !record["hardSemanticViolations"].every((item) => typeof item === "string")) {
    throw new Error("hardSemanticViolations must be a string array");
  }

  return {
    schemaVersion: "semantic-judge-output-v1",
    promptVersion: SEMANTIC_PROMPT_VERSION,
    judge,
    requirementResults: record["requirementResults"].map(parseRequirementResult),
    hardSemanticViolations: record["hardSemanticViolations"] as string[],
    rawStructuredOutput: parsed,
  };
}

export interface JudgeClient {
  judge(prompt: string): Promise<{ text: string; providerReportedModel?: string }>;
}

export async function runSemanticJudge(
  client: JudgeClient,
  input: SemanticJudgePromptInput,
  judgeConfig: Omit<SemanticJudgeOutput["judge"], "providerReportedModel" | "timestamp"> & { timestamp?: string },
): Promise<SemanticJudgeOutput> {
  const prompt = buildSemanticJudgePrompt(input);
  assertPromptBlindness(prompt, [input.run.frameworkId ?? "", input.run.implementationId ?? ""].filter(Boolean));
  const response = await client.judge(prompt);
  return parseSemanticJudgeOutput(response.text, {
    ...judgeConfig,
    providerReportedModel: response.providerReportedModel,
    timestamp: judgeConfig.timestamp ?? new Date().toISOString(),
  });
}
