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

export interface SemanticJudgeValidation {
  expectedRequirementIds: readonly string[];
  hardRequirementIds: readonly string[];
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
      outputRequirements: {
        expectedRequirementIds: unique(input.rubric.map((item) => item.requirementId)),
        hardRequirementIds: unique(input.rubric.filter((item) => item.hardFailureWhen).map((item) => item.requirementId)),
        completeness: "Return exactly one requirementResults entry for each expectedRequirementId. Do not add unknown requirement ids.",
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

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function duplicates(values: readonly string[]): string[] {
  return unique(values.filter((value, index) => values.indexOf(value) !== index));
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
  validation: SemanticJudgeValidation,
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

  const requirementResults = record["requirementResults"].map(parseRequirementResult);
  validateSemanticCompleteness(requirementResults, record["hardSemanticViolations"] as string[], validation);

  return {
    schemaVersion: "semantic-judge-output-v1",
    promptVersion: SEMANTIC_PROMPT_VERSION,
    judge,
    requirementResults,
    hardSemanticViolations: record["hardSemanticViolations"] as string[],
    rawStructuredOutput: parsed,
  };
}

function validateSemanticCompleteness(
  requirementResults: readonly SemanticRubricResult[],
  hardSemanticViolations: readonly string[],
  validation: SemanticJudgeValidation,
): void {
  const expected = unique(validation.expectedRequirementIds);
  const hard = new Set(validation.hardRequirementIds);
  const expectedSet = new Set(expected);
  const actual = requirementResults.map((result) => result.requirementId);
  const duplicateActual = duplicates(actual);
  if (duplicateActual.length) throw new Error(`duplicate semantic requirement result(s): ${duplicateActual.join(", ")}`);

  const missing = expected.filter((requirementId) => !actual.includes(requirementId));
  if (missing.length) throw new Error(`missing semantic requirement result(s): ${missing.join(", ")}`);

  const unknown = actual.filter((requirementId) => !expectedSet.has(requirementId));
  if (unknown.length) throw new Error(`unknown semantic requirement result(s): ${unknown.join(", ")}`);

  const duplicateViolations = duplicates(hardSemanticViolations);
  if (duplicateViolations.length) throw new Error(`duplicate hardSemanticViolations: ${duplicateViolations.join(", ")}`);

  const unknownViolations = hardSemanticViolations.filter((requirementId) => !hard.has(requirementId));
  if (unknownViolations.length) throw new Error(`hardSemanticViolations contained non-hard or unknown requirement id(s): ${unknownViolations.join(", ")}`);
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
  }, {
    expectedRequirementIds: unique(input.rubric.map((item) => item.requirementId)),
    hardRequirementIds: unique(input.rubric.filter((item) => item.hardFailureWhen).map((item) => item.requirementId)),
  });
}
