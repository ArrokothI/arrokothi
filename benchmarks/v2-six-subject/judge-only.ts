import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertNoKnownMechanicalDefects, PAIRWISE_PROMPT_VERSION, SEMANTIC_PROMPT_VERSION, assertPromptBlindness, buildPairwiseJudgePrompt,
  buildSemanticJudgePrompt, classifyRunValidity, evaluateDeterministic, parsePairwiseJudgeOutput,
  parseSemanticJudgeOutput, type DeterministicEvaluation, type NeutralRawRunV2,
} from "../evaluator-v2/index.ts";
import {
  AGENT_ROOT, JUDGE_MODEL, OUTPUT, SUBJECT_MODEL, authoritativeFacts, criteriaFor, expectedUnits,
  gitCommit, implementations, pathFor, readJson, runKey, writeJson,
} from "./orchestration.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY is required");
if (process.env.BENCHMARK_JUDGE_MODEL?.trim() !== JUDGE_MODEL) throw new Error(`BENCHMARK_JUDGE_MODEL must be ${JUDGE_MODEL}`);
const submit = process.argv.includes("--submit-batch");
const collect = process.argv.includes("--collect-batch");
if (submit && collect) throw new Error("Use --submit-batch and --collect-batch in separate invocations");
const BATCH_DIR = join(OUTPUT, "judge-batch");
const PLAN_PATH = join(BATCH_DIR, "plan.json");
const JOBS_PATH = join(BATCH_DIR, "jobs.json");
const MAX_INLINE_BYTES = 8 * 1024 * 1024;

type RequestKind = "semantic" | "pairwise";
interface JudgeRequest {
  key: string;
  kind: RequestKind;
  id: string;
  prompt: string;
  promptVersion: typeof SEMANTIC_PROMPT_VERSION | typeof PAIRWISE_PROMPT_VERSION;
  seed?: string;
  createdAt: string;
  parse: Record<string, unknown>;
}
interface BatchJob {
  batchJobId: string;
  requestedJudgeModel: string;
  submittedAt: string;
  requestKeys: string[];
  providerCreateResponse: unknown;
}
interface GeminiResponse {
  modelVersion?: string;
  usageMetadata?: Record<string, unknown>;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

async function frozenRuns() {
  const manifest = await readJson<{ rawArtifactsFrozen?: boolean }>(join(OUTPUT, "manifest.json"));
  if (!manifest?.rawArtifactsFrozen) throw new Error("Judge-only requires a generate-only manifest with rawArtifactsFrozen=true");
  const runs: NeutralRawRunV2[] = [];
  for (const unit of expectedUnits()) {
    const run = await readJson<NeutralRawRunV2>(unit.rawPath);
    if (!run) throw new Error(`Judge-only found missing frozen raw artifact: ${unit.id}`);
    const validity = classifyRunValidity(run, { expectedRequestedModel: SUBJECT_MODEL, requireProviderReportedModelMatch: true });
    if (!validity.valid) throw new Error(`Judge-only found invalid frozen raw artifact ${unit.id}: ${validity.reason}`);
    runs.push(run);
  }
  return runs;
}

async function preparePlan(runs: NeutralRawRunV2[]) {
  await Promise.all(["deterministic", "semantic", "pairwise", "judge-metadata", "aggregate", "audit"].map((dir) => mkdir(join(OUTPUT, dir), { recursive: true })));
  const deterministic = new Map<string, DeterministicEvaluation>();
  for (const run of runs) {
    const unit = expectedUnits().find((candidate) => candidate.id === `${run.scenarioId}-${run.implementationId}-${run.repeatId}`)!;
    const evaluation = evaluateDeterministic(unit.scenario.id, unit.scenario.expectedDeterministicAssertions, run);
    // EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.4, issue 3): semantic-judge contamination gate.
    // `evaluation` was just computed with the current evaluator, so this call is checked against
    // itself here as a standing invariant — it exists so that if this code path is ever changed
    // to read a cached/on-disk deterministic evaluation instead of recomputing it (or an older
    // deterministic-hotfix-*/*.json is ever fed in by mistake), any resulting drift from what the
    // current evaluator would produce is caught before it can reach a semantic judge prompt.
    assertNoKnownMechanicalDefects(unit.scenario, run, evaluation);
    deterministic.set(runKey(run), evaluation);
    await writeJson(pathFor("deterministic", unit.id), evaluation);
  }
  const requests: JudgeRequest[] = [];
  for (const run of runs) {
    const id = `${run.scenarioId}-${run.implementationId}-${run.repeatId}`;
    if (await readJson(pathFor("semantic", id))) continue;
    const scenario = expectedUnits().find((unit) => unit.id === id)!.scenario;
    const prompt = buildSemanticJudgePrompt({
      scenarioId: scenario.id, title: scenario.title, userTurns: scenario.turns.map((turn) => turn.content),
      authoritativeFacts: authoritativeFacts(scenario), rubric: scenario.semanticRubric, run,
      deterministicObservations: deterministic.get(runKey(run)) as any,
    });
    assertPromptBlindness(prompt, [run.frameworkId ?? "", run.implementationId ?? ""].filter(Boolean));
    requests.push({
      key: `semantic:${id}`, kind: "semantic", id, prompt, promptVersion: SEMANTIC_PROMPT_VERSION,
      createdAt: new Date().toISOString(),
      parse: {
        expectedRequirementIds: [...new Set(scenario.semanticRubric.map((item) => item.requirementId))],
        hardRequirementIds: [...new Set(scenario.semanticRubric.filter((item) => item.hardFailureWhen).map((item) => item.requirementId))],
      },
    });
  }
  for (const scenario of [...new Map(expectedUnits().map((unit) => [unit.scenario.id, unit.scenario])).values()]) {
    const repeatCount = expectedUnits().filter((unit) => unit.scenario.id === scenario.id && unit.implementationId === implementations[scenario.applicationId][0]).length;
    const impls = implementations[scenario.applicationId];
    const pairs = [[impls[0], impls[1]], [impls[0], impls[2]], [impls[1], impls[2]]] as const;
    for (let repeat = 1; repeat <= repeatCount; repeat++) {
      const repeatId = `r${String(repeat).padStart(2, "0")}`;
      for (const [leftId, rightId] of pairs) {
        const id = `${scenario.id}-${repeatId}-${leftId}-vs-${rightId}`;
        if (await readJson(pathFor("pairwise", id))) continue;
        const left = runs.find((run) => run.scenarioId === scenario.id && run.repeatId === repeatId && run.implementationId === leftId)!;
        const right = runs.find((run) => run.scenarioId === scenario.id && run.repeatId === repeatId && run.implementationId === rightId)!;
        const seed = `v2-run-1:${scenario.id}:${repeatId}:${leftId}:${rightId}`;
        const built = buildPairwiseJudgePrompt({
          scenarioId: scenario.id, title: scenario.title, userTurns: scenario.turns.map((turn) => turn.content),
          authoritativeFacts: authoritativeFacts(scenario), sourceDerivedCriteria: scenario.semanticRubric.map((item) => item.criterion),
          left, right, seed, criteria: criteriaFor(scenario),
        });
        requests.push({
          key: `pairwise:${id}`, kind: "pairwise", id, prompt: built.prompt, promptVersion: PAIRWISE_PROMPT_VERSION,
          seed, createdAt: new Date().toISOString(),
          parse: { scenarioId: scenario.id, assignment: built.assignment, expectedCriteria: built.expectedCriteria, implementationAssignment: built.implementationAssignment },
        });
      }
    }
  }
  const plan = {
    schemaVersion: "v2-six-subject-judge-batch-plan-v1", experimentId: "v2-six-subject-run-1",
    requestedJudgeModel: JUDGE_MODEL, temperature: 0, preparedAt: new Date().toISOString(),
    promptVersions: { semantic: SEMANTIC_PROMPT_VERSION, pairwise: PAIRWISE_PROMPT_VERSION }, requests,
  };
  await writeJson(PLAN_PATH, plan);
  return plan;
}

function chunks(requests: JudgeRequest[]) {
  const result: JudgeRequest[][] = [];
  let current: JudgeRequest[] = [];
  let bytes = 0;
  for (const request of requests) {
    const itemBytes = Buffer.byteLength(JSON.stringify(request), "utf8");
    if (itemBytes > MAX_INLINE_BYTES) throw new Error(`Judge request exceeds inline batch limit: ${request.key}`);
    if (current.length && bytes + itemBytes > MAX_INLINE_BYTES) { result.push(current); current = []; bytes = 0; }
    current.push(request); bytes += itemBytes;
  }
  if (current.length) result.push(current);
  return result;
}

async function geminiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey!, ...(init?.headers ?? {}) },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Gemini Batch API failed: ${response.status} ${body.slice(0, 1000)}`);
  return JSON.parse(body) as Record<string, any>;
}

async function submitBatches(plan: Awaited<ReturnType<typeof preparePlan>>) {
  const existing = await readJson<{ jobs: BatchJob[] }>(JOBS_PATH);
  if (existing?.jobs.length) throw new Error("Batch jobs already recorded; refusing non-idempotent resubmission");
  const jobs: BatchJob[] = [];
  for (const [index, group] of chunks(plan.requests).entries()) {
    const submittedAt = new Date().toISOString();
    const response = await geminiFetch(`models/${JUDGE_MODEL}:batchGenerateContent`, {
      method: "POST",
      body: JSON.stringify({ batch: {
        display_name: `v2-six-subject-run-1-judge-${index + 1}`,
        input_config: { requests: { requests: group.map((request) => ({
          request: { contents: [{ role: "user", parts: [{ text: request.prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json" } },
          metadata: { key: request.key, promptVersion: request.promptVersion, seed: request.seed ?? "" },
        })) } },
      } }),
    });
    if (typeof response.name !== "string") throw new Error("Gemini Batch API create response omitted the batch job id");
    jobs.push({ batchJobId: response.name, requestedJudgeModel: JUDGE_MODEL, submittedAt, requestKeys: group.map((request) => request.key), providerCreateResponse: response });
    await writeJson(JOBS_PATH, { schemaVersion: "v2-six-subject-judge-batch-jobs-v1", jobs, updatedAt: new Date().toISOString() });
  }
  return jobs;
}

function inlineResponses(status: Record<string, any>) {
  return status.dest?.inlinedResponses?.inlinedResponses
    ?? status.output?.inlinedResponses?.inlinedResponses
    ?? status.response?.output?.inlinedResponses?.inlinedResponses
    ?? [];
}

function responseText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("").trim() ?? "";
}

async function collectBatches(plan: Awaited<ReturnType<typeof preparePlan>>) {
  const stored = await readJson<{ jobs: BatchJob[] }>(JOBS_PATH);
  if (!stored?.jobs.length) throw new Error("No submitted judge batch jobs were recorded");
  const byKey = new Map(plan.requests.map((request) => [request.key, request]));
  let pending = 0;
  for (const job of stored.jobs) {
    const status = await geminiFetch(job.batchJobId);
    const state = status.state ?? status.metadata?.state;
    await writeJson(join(BATCH_DIR, `${job.batchJobId.replaceAll("/", "_")}-status.json`), status);
    if (state !== "JOB_STATE_SUCCEEDED") {
      if (["JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED"].includes(state)) throw new Error(`Judge batch ${job.batchJobId} ended in ${state}`);
      pending++;
      continue;
    }
    const responses = inlineResponses(status);
    if (responses.length !== job.requestKeys.length) throw new Error(`Judge batch ${job.batchJobId} returned ${responses.length}/${job.requestKeys.length} inline responses`);
    for (let index = 0; index < responses.length; index++) {
      const item = responses[index];
      const key = item.metadata?.key ?? job.requestKeys[index];
      const request = byKey.get(key);
      if (!request) throw new Error(`Unknown judge batch response key: ${key}`);
      if (item.error) throw new Error(`Judge batch item ${key} failed: ${JSON.stringify(item.error)}`);
      const response = (item.response ?? item.output?.response) as GeminiResponse;
      const reported = response?.modelVersion;
      if (reported !== JUDGE_MODEL) throw new Error(`Judge batch item ${key} reported ${String(reported)} instead of ${JUDGE_MODEL}`);
      const receivedAt = new Date().toISOString();
      const judge = { provider: "gemini", requestedModel: JUDGE_MODEL, providerReportedModel: reported, temperature: 0, timestamp: receivedAt, evaluatorGitCommit: gitCommit(AGENT_ROOT) };
      const text = responseText(response);
      if (!text) throw new Error(`Judge batch item ${key} returned no text`);
      if (request.kind === "semantic") {
        const output = parseSemanticJudgeOutput(text, judge, request.parse as any);
        await writeJson(pathFor("semantic", request.id), output);
      } else {
        const output = parsePairwiseJudgeOutput(text, { ...judge, randomizationSeed: request.seed! }, (request.parse as any).scenarioId, (request.parse as any).assignment, (request.parse as any).expectedCriteria, (request.parse as any).implementationAssignment);
        await writeJson(pathFor("pairwise", request.id), output);
      }
      await writeJson(pathFor(`judge-metadata/${request.kind}`, request.id), {
        schemaVersion: "v2-six-subject-judge-call-metadata-v1", requestKey: key, batchJobId: job.batchJobId,
        requestedJudgeModel: JUDGE_MODEL, providerReportedJudgeModel: reported, usageMetadata: response.usageMetadata ?? null,
        promptVersion: request.promptVersion, seed: request.seed ?? null,
        promptCreatedAt: request.createdAt, batchSubmittedAt: job.submittedAt, responseReceivedAt: receivedAt,
      });
    }
  }
  return pending;
}

const runs = await frozenRuns();
const plan = await preparePlan(runs);
if (submit) {
  const jobs = await submitBatches(plan);
  process.stdout.write(`${JSON.stringify({ status: "submitted", requests: plan.requests.length, jobs: jobs.map((job) => job.batchJobId) }, null, 2)}\n`);
} else if (collect) {
  const pending = await collectBatches(plan);
  process.stdout.write(`${JSON.stringify({ status: pending ? "pending" : "collected", pendingJobs: pending }, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify({ status: "prepared", requests: plan.requests.length, plan: PLAN_PATH, note: "No judge batch was submitted; pass --submit-batch only after reviewing the frozen plan." }, null, 2)}\n`);
}
