import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  assertNoKnownMechanicalDefects, PAIRWISE_PROMPT_VERSION, SEMANTIC_PROMPT_VERSION, assertPromptBlindness, buildPairwiseJudgePrompt,
  buildSemanticJudgePrompt, classifyRunValidity, evaluateDeterministic,
  type DeterministicEvaluation, type NeutralRawRunV2,
} from "../evaluator-v2/index.ts";
import {
  AGENT_ROOT, JUDGE_MODEL, OUTPUT, SUBJECT_MODEL, authoritativeFacts, criteriaFor, expectedUnits,
  gitCommit, implementations, pathFor, readJson, runKey, writeJson,
} from "./orchestration.ts";
import {
  assertNoExistingJobs, BATCH_DIR, JOBS_PATH, PLAN_PATH, classifyBatchState, extractInlineResponses, loadFrozenJudgePlan,
  resolveResponseKey, validateAndParseResponseItem, validateBatchEnvelope,
  type JudgeBatchPlan, type JudgeRequest, type ValidatedResponseItem,
} from "./judge-plan.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY is required");
if (process.env.BENCHMARK_JUDGE_MODEL?.trim() !== JUDGE_MODEL) throw new Error(`BENCHMARK_JUDGE_MODEL must be ${JUDGE_MODEL}`);
const submit = process.argv.includes("--submit-batch");
const collect = process.argv.includes("--collect-batch");
if (submit && collect) throw new Error("Use --submit-batch and --collect-batch in separate invocations");
const MAX_INLINE_BYTES = 8 * 1024 * 1024;

interface BatchJob {
  batchJobId: string;
  requestedJudgeModel: string;
  submittedAt: string;
  requestKeys: string[];
  providerCreateResponse: unknown;
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

async function ensureOutputDirs() {
  await Promise.all(["deterministic", "semantic", "pairwise", "judge-metadata", "aggregate", "audit"].map((dir) => mkdir(join(OUTPUT, dir), { recursive: true })));
}

async function preparePlan(runs: NeutralRawRunV2[]) {
  await ensureOutputDirs();
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

async function submitBatches(plan: JudgeBatchPlan) {
  const existing = await readJson<{ jobs: BatchJob[] }>(JOBS_PATH);
  assertNoExistingJobs(existing);
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

interface PendingJobStatus {
  batchJobId: string;
  state: unknown;
}

interface CollectedForWrite extends ValidatedResponseItem {
  request: JudgeRequest;
  batchJobId: string;
  submittedAt: string;
  receivedAt: string;
}

// EVAL-HOTFIX-2026-08-23 (collection-infrastructure fix): two-pass validate-then-write, fixed
// against the documented BATCH_STATE_* enum (see judge-plan.ts's classifyBatchState() for the
// state-handling rationale — the previous JOB_STATE_* checks never matched any real API
// response). PASS 1 fetches every job's status and validates every returned envelope/response
// without writing any output file; if ANY job is still pending, or ANY response fails validation
// for ANY job, NOTHING is written — this prevents a partially-written semantic/pairwise result
// set from ever existing on disk. PASS 2 only runs once every job that reported SUCCEEDED has had
// every one of its responses fully validated.
async function collectBatches(plan: JudgeBatchPlan) {
  const stored = await readJson<{ jobs: BatchJob[] }>(JOBS_PATH);
  if (!stored?.jobs.length) throw new Error("No submitted judge batch jobs were recorded");
  const byKey = new Map(plan.requests.map((request) => [request.key, request]));

  const pendingJobs: PendingJobStatus[] = [];
  const toWrite: CollectedForWrite[] = [];
  let positionalFallbackCount = 0;

  // ---- PASS 1: fetch + validate every job/response; write nothing yet. ----
  for (const job of stored.jobs) {
    const status = await geminiFetch(job.batchJobId);
    const state = status.metadata?.state ?? status.state;
    await writeJson(join(BATCH_DIR, `${job.batchJobId.replaceAll("/", "_")}-status.json`), status);

    const classification = classifyBatchState(state);
    if (classification.kind === "pending") {
      pendingJobs.push({ batchJobId: job.batchJobId, state });
      continue;
    }
    if (classification.kind === "terminal_failure") {
      throw new Error(`Judge batch ${job.batchJobId} ended in terminal failure state ${classification.state}. STOPPING — status evidence preserved in ${job.batchJobId.replaceAll("/", "_")}-status.json.`);
    }
    if (classification.kind === "unknown") {
      throw new Error(`Judge batch ${job.batchJobId} returned an unrecognized/unspecified state (${JSON.stringify(classification.state)}); refusing to guess success or failure. Status evidence preserved.`);
    }

    // classification.kind === "succeeded"
    validateBatchEnvelope(status, { batchJobId: job.batchJobId, expectedRequestCount: job.requestKeys.length });
    const responses = extractInlineResponses(status);
    if (responses.length !== job.requestKeys.length) {
      throw new Error(`Judge batch ${job.batchJobId} returned ${responses.length}/${job.requestKeys.length} inline responses.`);
    }

    const seenKeysThisJob = new Set<string>();
    for (let index = 0; index < responses.length; index++) {
      const item = responses[index];
      const resolved = resolveResponseKey(item, index, job.requestKeys);
      if (seenKeysThisJob.has(resolved.key)) throw new Error(`Judge batch ${job.batchJobId}: duplicate response key ${resolved.key} at index ${index}.`);
      seenKeysThisJob.add(resolved.key);
      if (resolved.usedPositionalFallback) positionalFallbackCount++;

      const request = byKey.get(resolved.key);
      if (!request) throw new Error(`Judge batch ${job.batchJobId}: unknown response key ${resolved.key} is not present in the frozen plan.`);

      const receivedAt = new Date().toISOString();
      const validated = validateAndParseResponseItem(
        item,
        request,
        JUDGE_MODEL,
        { provider: "gemini", requestedModel: JUDGE_MODEL, temperature: 0, timestamp: receivedAt, evaluatorGitCommit: gitCommit(AGENT_ROOT) },
        resolved.usedPositionalFallback,
      );
      toWrite.push({ ...validated, request, batchJobId: job.batchJobId, submittedAt: job.submittedAt, receivedAt });
    }

    const missingKeys = job.requestKeys.filter((key) => !seenKeysThisJob.has(key));
    if (missingKeys.length) throw new Error(`Judge batch ${job.batchJobId}: missing response(s) for key(s): ${missingKeys.slice(0, 10).join(", ")}`);
  }

  if (pendingJobs.length) {
    return { pending: pendingJobs.length, pendingJobs, written: 0, positionalFallbackCount: 0, items: [] as CollectedForWrite[] };
  }

  // ---- PASS 2: every job succeeded and every response validated; now write. ----
  for (const collected of toWrite) {
    if (collected.kind === "semantic") await writeJson(pathFor("semantic", collected.request.id), collected.parsedOutput);
    else await writeJson(pathFor("pairwise", collected.request.id), collected.parsedOutput);
    await writeJson(pathFor(`judge-metadata/${collected.kind}`, collected.request.id), {
      schemaVersion: "v2-six-subject-judge-call-metadata-v1", requestKey: collected.key, batchJobId: collected.batchJobId,
      requestedJudgeModel: JUDGE_MODEL, providerReportedJudgeModel: collected.reportedModelVersion, usageMetadata: collected.usageMetadata,
      usedPositionalFallback: collected.usedPositionalFallback,
      promptVersion: collected.request.promptVersion, seed: collected.request.seed ?? null,
      promptCreatedAt: collected.request.createdAt, batchSubmittedAt: collected.submittedAt, responseReceivedAt: collected.receivedAt,
    });
  }

  return { pending: 0, pendingJobs: [] as PendingJobStatus[], written: toWrite.length, positionalFallbackCount, items: toWrite };
}

// EVAL-HOTFIX-2026-08-23 (judge-run submission-infrastructure fix): submit and collect load and
// verify the EXISTING frozen plan.json — via loadFrozenJudgePlan() in judge-plan.ts — and never
// call preparePlan(). Only plain prepare mode (neither flag) rebuilds/rewrites plan.json. This is
// the whole point of the fix: a whole-file SHA-256 pinned at freeze time must still match
// immediately before submission, which is impossible if the run that submits also re-stamps
// fresh preparedAt/createdAt timestamps into the file first.
if (submit) {
  const plan = await loadFrozenJudgePlan();
  const jobs = await submitBatches(plan);
  process.stdout.write(`${JSON.stringify({ status: "submitted", requests: plan.requests.length, jobs: jobs.map((job) => job.batchJobId) }, null, 2)}\n`);
} else if (collect) {
  await ensureOutputDirs();
  const plan = await loadFrozenJudgePlan();
  const result = await collectBatches(plan);
  if (result.pending) {
    process.stdout.write(`${JSON.stringify({ status: "pending", pendingJobs: result.pendingJobs }, null, 2)}\n`);
  } else {
    const modelVersionCounts: Record<string, number> = {};
    let usageMissing = 0;
    const usageTotals: Record<string, number> = {};
    for (const item of result.items) {
      modelVersionCounts[item.reportedModelVersion] = (modelVersionCounts[item.reportedModelVersion] ?? 0) + 1;
      if (!item.usageMetadata) { usageMissing++; continue; }
      for (const [usageKey, usageValue] of Object.entries(item.usageMetadata)) {
        if (typeof usageValue === "number") usageTotals[usageKey] = (usageTotals[usageKey] ?? 0) + usageValue;
      }
    }
    process.stdout.write(`${JSON.stringify({
      status: "collected",
      writtenSemantic: result.items.filter((item) => item.kind === "semantic").length,
      writtenPairwise: result.items.filter((item) => item.kind === "pairwise").length,
      positionalFallbackCount: result.positionalFallbackCount,
      modelVersionCounts,
      usageMissing,
      usageTotals,
    }, null, 2)}\n`);
  }
} else {
  const runs = await frozenRuns();
  const plan = await preparePlan(runs);
  process.stdout.write(`${JSON.stringify({ status: "prepared", requests: plan.requests.length, plan: PLAN_PATH, note: "No judge batch was submitted; pass --submit-batch only after reviewing the frozen plan." }, null, 2)}\n`);
}
