import { CALIBRATION_FIXTURES } from "./fixtures/calibration.ts";
import { GeminiJudgeClient } from "./semantic/gemini-client.ts";
import {
  SEMANTIC_PROMPT_VERSION,
  buildSemanticJudgePrompt,
  parseSemanticJudgeOutput,
} from "./semantic/judge.ts";
import {
  PAIRWISE_PROMPT_VERSION,
  buildPairwiseJudgePrompt,
  parsePairwiseJudgeOutput,
} from "./pairwise/judge.ts";

function requiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function main() {
  const model = requiredEnv("BENCHMARK_JUDGE_MODEL");
  const apiKey = requiredEnv("GEMINI_API_KEY") ?? requiredEnv("GOOGLE_API_KEY");
  if (!model || !apiKey) {
    console.log(
      JSON.stringify(
        {
          status: "skipped",
          reason: "BENCHMARK_JUDGE_MODEL and GEMINI_API_KEY or GOOGLE_API_KEY are required for the live judge canary",
        },
        null,
        2,
      ),
    );
    return;
  }

  const client = new GeminiJudgeClient({ apiKey, model, temperature: 0 });
  const semanticFixture = CALIBRATION_FIXTURES.find((fixture) => fixture.id === "cal-p02-zero-match");
  const pairwiseLeft = CALIBRATION_FIXTURES.find((fixture) => fixture.id === "cal-p02-zero-match");
  const pairwiseRight = CALIBRATION_FIXTURES.find((fixture) => fixture.id === "cal-p02-invented-near-match");
  if (!semanticFixture || !pairwiseLeft || !pairwiseRight) throw new Error("missing canary fixtures");

  const semanticPrompt = buildSemanticJudgePrompt({
    scenarioId: "canary-semantic",
    title: "Truthful zero-match property query",
    userTurns: ["I want a 5-bedroom Manhattan property under $10M."],
    authoritativeFacts: ["The frozen property records contain no 5-bedroom Manhattan property under $10M."],
    rubric: [
      {
        requirementId: "P02-R07",
        criterion: "The assistant must truthfully report that no matching record exists and must not invent a listing.",
        hardFailureWhen: "The assistant presents any matching listing despite zero record evidence.",
      },
    ],
    run: semanticFixture.run,
    deterministicObservations: { recordCount: 0, selectedIds: [] },
  });

  const semanticResponse = await client.judge(semanticPrompt);
  const semantic = parseSemanticJudgeOutput(semanticResponse.text, {
    provider: "gemini",
    requestedModel: model,
    providerReportedModel: semanticResponse.providerReportedModel,
    temperature: 0,
    timestamp: new Date().toISOString(),
  });

  const pairwisePrompt = buildPairwiseJudgePrompt({
    scenarioId: "canary-pairwise",
    title: "Truthful zero-match property query",
    userTurns: ["I want a 5-bedroom Manhattan property under $10M."],
    authoritativeFacts: ["The frozen property records contain no 5-bedroom Manhattan property under $10M."],
    sourceDerivedCriteria: ["Truthfully report no match.", "Do not invent a listing.", "Be useful and concise."],
    left: pairwiseLeft.run,
    right: pairwiseRight.run,
    seed: "canary-seed",
  });

  const pairwiseResponse = await client.judge(pairwisePrompt.prompt);
  const pairwise = parsePairwiseJudgeOutput(
    pairwiseResponse.text,
    {
      provider: "gemini",
      requestedModel: model,
      providerReportedModel: pairwiseResponse.providerReportedModel,
      temperature: 0,
      timestamp: new Date().toISOString(),
      randomizationSeed: "canary-seed",
    },
    "canary-pairwise",
    pairwisePrompt.assignment,
  );

  let malformedHandled = false;
  try {
    parseSemanticJudgeOutput("{ this is not json", {
      provider: "offline",
      requestedModel: "malformed-test",
      temperature: 0,
      timestamp: new Date().toISOString(),
    });
  } catch {
    malformedHandled = true;
  }

  console.log(
    JSON.stringify(
      {
        status: "passed",
        model,
        semanticPromptVersion: SEMANTIC_PROMPT_VERSION,
        pairwisePromptVersion: PAIRWISE_PROMPT_VERSION,
        semanticScores: semantic.requirementResults.map((result) => ({
          requirementId: result.requirementId,
          score: result.score,
          confidence: result.confidence,
        })),
        pairwiseVerdict: pairwise.verdict,
        pairwiseAssignment: pairwise.assignment,
        malformedHandled,
      },
      null,
      2,
    ),
  );
}

await main();
