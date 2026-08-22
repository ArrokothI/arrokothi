import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { classifyRunValidity, withValidity, type NeutralRawRunV2, type RunInvalidReason } from "../evaluator-v2/index.ts";
import { createCraigAgent, computeWallVolumeExecutor, computeWallVolume } from "../benchmark-rebuild-v1/p01-arrokothai/application.ts";
import { createEstateAgent, createHandoffExecutor, sendLeadToTeam } from "../benchmark-rebuild-v1/p02-arrokothai/application.ts";
import { liveModelEnvironment } from "../benchmark-rebuild-v1/shared/model.ts";
import { runArrokothaiSmoke } from "../benchmark-rebuild-v1/shared/raw-run.ts";
import { adaptArrokothai, runAgenerateor, runOriginalP01, runOriginalP02 } from "./adapters.ts";
import {
  AGENT_ROOT, AGENERATEOR_ROOT, CRAIG_ROOT, ESTATE_ROOT, EXPERIMENT_ID, OUTPUT, ROOT, SUBJECT_MODEL,
  expectedUnits, gitCommit, gitCommitTimestamp, pathFor, readJson, treeHash, writeJson,
} from "./orchestration.ts";
import type { ScenarioV2 } from "../scenario-v2/index.ts";

const apiKey = process.env.GEMINI_API_KEY?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY is required");
if (process.env.GEMINI_MODEL?.trim() !== SUBJECT_MODEL) throw new Error(`GEMINI_MODEL must be ${SUBJECT_MODEL}`);
const ENDPOINT = process.env.BENCHMARK_REBUILD_URL?.trim() || "http://127.0.0.1:3000/api/benchmark-rebuild-v1/turn";
const CANARY_PATH = join(OUTPUT, "canary-flash-lite.json");
const INFRASTRUCTURE_REASONS = new Set<RunInvalidReason>([
  "wrong_requested_model", "silent_model_substitution", "provider_schema_rejection_before_subject_behavior",
  "provider_outage_or_transport_failure", "corrupted_raw_artifact", "evaluator_crash", "missing_required_benchmark_setup",
]);

interface CanaryEvidence {
  status: string;
  requestedModel: string;
  providerReportedModel: string;
  apiModelCallCount: number;
  startedAt: string;
  completedAt: string;
}

class SubjectPacer {
  private nextAvailable = 0;
  async before() {
    const waitMs = Math.max(0, this.nextAvailable - Date.now());
    if (waitMs) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
  }
  after(run: NeutralRawRunV2) {
    const calls = run.modelCallCount ?? (run.invalidReason ? 1 : 1);
    this.nextAvailable = Date.now() + Math.max(5_000, calls * 4_500);
  }
}

function arrokothaiState(scenario: ScenarioV2) {
  return scenario.applicationId === "p01"
    ? (state: any) => ({
        project_type: state.memory.project_type?.value, wall_area_sq_ft: state.memory.wall_area_sq_ft?.value,
        wall_thickness_in: state.memory.wall_thickness_in?.value, install_method: state.memory.install_method?.value,
        existing_wall_type: state.memory.existing_wall_type?.value, user_priority: state.memory.user_priority?.value,
      })
    : (state: any) => Object.fromEntries([
        "intent", "target_location", "budget", "bedrooms_needed", "timeline", "financing", "selected_property", "listing_preference",
        "seller_zip", "contact_name", "phone", "email", "contact_preference", "best_contact_time",
      ].map((field) => [field, state.memory[field]?.value]));
}

async function executeSubject(scenario: ScenarioV2, implementationId: string, repeatId: string): Promise<NeutralRawRunV2> {
  if (implementationId === "p01-original") return runOriginalP01(apiKey!, scenario, repeatId);
  if (implementationId === "p02-original") return runOriginalP02(apiKey!, scenario, repeatId);
  if (implementationId.endsWith("agenerateor")) return runAgenerateor(ENDPOINT, scenario, repeatId);
  const model = liveModelEnvironment();
  const nativePath = pathFor("raw/native", `${scenario.id}-${implementationId}-${repeatId}`);
  const p02Outcome = scenario.setup?.terminalActionResult === "definite_failure" ? "failure"
    : scenario.setup?.terminalActionResult === "outcome_unknown" ? "unknown" : "success";
  const handoff = createHandoffExecutor(p02Outcome);
  const raw = await runArrokothaiSmoke({
    applicationId: scenario.applicationId,
    scenarioId: scenario.id,
    definition: scenario.applicationId === "p01" ? createCraigAgent(model.policy) : createEstateAgent(model.policy),
    turns: scenario.turns.map((turn) => ({ content: turn.content })),
    executors: scenario.applicationId === "p01" ? { [computeWallVolume.name]: computeWallVolumeExecutor } : { [sendLeadToTeam.name]: handoff.executor },
    projectState: arrokothaiState(scenario),
    outputFile: nativePath,
  });
  return adaptArrokothai(raw as unknown as Record<string, any>, scenario, repeatId);
}

function invalidRun(scenario: ScenarioV2, implementationId: string, repeatId: string, error: unknown): NeutralRawRunV2 {
  const message = error instanceof Error ? error.message : String(error);
  return {
    schemaVersion: "neutral-raw-run-v2", applicationId: scenario.applicationId, implementationId, scenarioId: scenario.id, repeatId,
    conversation: [], requestedModel: { provider: "gemini", requested: SUBJECT_MODEL },
    runtimeErrors: [{ code: "transport_failure", message, beforeSubjectBehavior: true }], invalidReason: "provider_outage_or_transport_failure",
  };
}

function isGenuineSubjectFailure(run: NeutralRawRunV2) {
  return !run.invalidReason && (run.terminalActionResult === "definite_failure" || (run.runtimeErrors ?? []).some((error) => !error.beforeSubjectBehavior));
}

async function archiveInvalidAttempt(id: string, run: NeutralRawRunV2) {
  const attemptsDir = join(OUTPUT, "raw/attempts");
  await mkdir(attemptsDir, { recursive: true });
  const names = (await readdir(attemptsDir)).filter((name) => name.startsWith(`${id}-attempt-`) && name.endsWith(".json"));
  const serialized = `${JSON.stringify(run, null, 2)}\n`;
  for (const name of names) {
    if (await readFile(join(attemptsDir, name), "utf8") === serialized) return;
  }
  const attemptNumber = names.reduce((max, name) => Math.max(max, Number(name.match(/-attempt-(\d+)\.json$/)?.[1] ?? 0)), 0) + 1;
  await writeJson(join(attemptsDir, `${id}-attempt-${attemptNumber}.json`), run);
  const native = await readJson<unknown>(pathFor("raw/native", id));
  if (native) await writeJson(join(attemptsDir, "native", `${id}-attempt-${attemptNumber}.json`), native);
}

async function requireCanary(): Promise<CanaryEvidence> {
  const canary = await readJson<CanaryEvidence>(CANARY_PATH);
  if (!canary || canary.status !== "passed" || canary.requestedModel !== SUBJECT_MODEL || canary.providerReportedModel !== SUBJECT_MODEL || canary.apiModelCallCount !== 1) {
    throw new Error(`Refusing generation: ${CANARY_PATH} must record exactly one passing ${SUBJECT_MODEL} canary with matching requested/provider-reported models`);
  }
  return canary;
}

async function main() {
  const canary = await requireCanary();
  const resumeStartedAt = new Date().toISOString();
  const units = expectedUnits();
  const observedRawNames = new Set((await readdir(join(OUTPUT, "raw"), { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json")).map((entry) => entry.name));
  const expectedNames = new Set(units.map((unit) => `${unit.id}.json`));
  const unexpectedRawArtifacts = [...observedRawNames].filter((name) => !expectedNames.has(name)).sort();
  const alreadyValid: string[] = [];
  const infrastructureInvalid: string[] = [];
  const missing: string[] = [];
  const genuineSubjectFailuresAtResume: string[] = [];
  const generatedRuns: NeutralRawRunV2[] = [];
  const generatedUnitIds = new Set<string>();
  const pacer = new SubjectPacer();

  for (const unit of units) {
    let run = await readJson<NeutralRawRunV2>(unit.rawPath);
    if (run) {
      const validity = classifyRunValidity(run, { expectedRequestedModel: SUBJECT_MODEL, requireProviderReportedModelMatch: true });
      if (validity.valid) {
        alreadyValid.push(unit.id);
        if (isGenuineSubjectFailure(run)) genuineSubjectFailuresAtResume.push(unit.id);
        continue;
      }
      if (!validity.reason || !INFRASTRUCTURE_REASONS.has(validity.reason)) {
        genuineSubjectFailuresAtResume.push(unit.id);
        continue;
      }
      infrastructureInvalid.push(unit.id);
      await archiveInvalidAttempt(unit.id, run);
    } else {
      missing.push(unit.id);
    }

    process.stdout.write(`subject ${unit.id}\n`);
    await pacer.before();
    try { run = await executeSubject(unit.scenario, unit.implementationId, unit.repeatId); }
    catch (error) { run = invalidRun(unit.scenario, unit.implementationId, unit.repeatId, error); }
    run = withValidity(run, { expectedRequestedModel: SUBJECT_MODEL, requireProviderReportedModelMatch: true });
    await writeJson(unit.rawPath, run);
    generatedRuns.push(run);
    generatedUnitIds.add(unit.id);
    pacer.after(run);
  }

  const finalRuns: NeutralRawRunV2[] = [];
  const remainingInvalid: string[] = [];
  const remainingMissing: string[] = [];
  const genuineSubjectFailures: string[] = [];
  for (const unit of units) {
    const run = await readJson<NeutralRawRunV2>(unit.rawPath);
    if (!run) { remainingMissing.push(unit.id); continue; }
    finalRuns.push(run);
    const validity = classifyRunValidity(run, { expectedRequestedModel: SUBJECT_MODEL, requireProviderReportedModelMatch: true });
    if (!validity.valid) remainingInvalid.push(unit.id);
    else if (isGenuineSubjectFailure(run)) genuineSubjectFailures.push(unit.id);
  }
  const resumeCompletedAt = new Date().toISOString();
  const checkpointModelCalls = finalRuns.filter((run) => !generatedUnitIds.has(`${run.scenarioId}-${run.implementationId}-${run.repeatId}`)).reduce((sum, run) => sum + (run.modelCallCount ?? 0), 0);
  const resumeModelCalls = generatedRuns.reduce((sum, run) => sum + (run.modelCallCount ?? 0), 0);
  const counts = {
    expectedSubjectUnits: units.length,
    alreadyValidUnitsReused: alreadyValid.length,
    infrastructureInvalidUnitsRerun: infrastructureInvalid.length,
    missingUnitsGenerated: missing.length,
    genuineSubjectFailures: genuineSubjectFailures.length,
    remainingInvalidUnits: remainingInvalid.length,
    remainingMissingUnits: remainingMissing.length,
  };
  const manifest = {
    schemaVersion: "v2-six-subject-experiment-manifest-v2", experimentId: EXPERIMENT_ID, mode: "generate-only",
    interruption: { reason: "Gemini Flash-Lite quota interruption", checkpointCommittedAt: gitCommitTimestamp(AGENT_ROOT), resumeStartedAt, resumeCompletedAt },
    commits: { agentSdk: gitCommit(AGENT_ROOT), agenerateor: gitCommit(AGENERATEOR_ROOT), originalP01: gitCommit(CRAIG_ROOT), originalP02: gitCommit(ESTATE_ROOT) },
    hashes: { scenarioV2: await treeHash(join(ROOT, "benchmarks/scenario-v2")), evaluatorV2: await treeHash(join(ROOT, "benchmarks/evaluator-v2")) },
    subjectConfigurations: { originalP01: "source commit + shipped system prompt", agenerateorP01: "benchmark-rebuild-v1-p01-agenerateor", arrokothaiP01: "benchmark-rebuild-v1-p01-arrokothai", originalP02: "source commit + shipped SessionData/systemPrompt", agenerateorP02: "benchmark-rebuild-v1-p02-agenerateor", arrokothaiP02: "benchmark-rebuild-v1-p02-arrokothai" },
    models: { subject: SUBJECT_MODEL, judge: null }, temperatures: { subject: 0.35, originalP02: "not externally configurable" },
    repeatPolicy: { default: 3, consequential: 5 }, canary,
    counts,
    units: { alreadyValid, infrastructureInvalidRerun: infrastructureInvalid, missingGenerated: missing, genuineSubjectFailures, genuineSubjectFailuresAtResume, remainingInvalid, remainingMissing, unexpectedRawArtifacts },
    flashLiteCalls: { canaryApiModelCalls: 1, checkpointArtifactModelCalls: checkpointModelCalls, resumeArtifactModelCalls: resumeModelCalls, totalFrozenArtifactModelCalls: checkpointModelCalls + resumeModelCalls, note: "Counts are observable logical model calls recorded by raw artifacts; provider-internal retry transports are unavailable." },
    rawArtifactsFrozen: remainingInvalid.length === 0 && remainingMissing.length === 0,
    judgeBatchStarted: false,
  };
  await writeJson(join(OUTPUT, "manifest.json"), manifest);
  const report = `# ${EXPERIMENT_ID} generate-only checkpoint\n\n` +
    `Raw subject artifacts frozen: ${manifest.rawArtifactsFrozen ? "YES" : "NO"}. No semantic or pairwise judge calls were made.\n\n` +
    `| Measure | Count |\n|---|---:|\n` +
    `| Expected subject units | ${counts.expectedSubjectUnits} |\n` +
    `| Already-valid units reused | ${counts.alreadyValidUnitsReused} |\n` +
    `| Infrastructure-invalid units rerun | ${counts.infrastructureInvalidUnitsRerun} |\n` +
    `| Missing units generated | ${counts.missingUnitsGenerated} |\n` +
    `| Genuine subject failures | ${counts.genuineSubjectFailures} |\n` +
    `| Remaining invalid units | ${counts.remainingInvalidUnits} |\n` +
    `| Remaining missing units | ${counts.remainingMissingUnits} |\n\n` +
    `Flash-Lite calls: canary ${manifest.flashLiteCalls.canaryApiModelCalls}; reused checkpoint artifacts ${checkpointModelCalls}; resume-generated artifacts ${resumeModelCalls}; frozen artifact total ${checkpointModelCalls + resumeModelCalls}.\n\n` +
    `Quota checkpoint committed at ${manifest.interruption.checkpointCommittedAt}; resume started ${resumeStartedAt}; resume completed ${resumeCompletedAt}.\n`;
  await writeJson(join(OUTPUT, "generate-only-checkpoint.json"), manifest);
  await import("node:fs/promises").then(({ writeFile }) => writeFile(join(OUTPUT, "GENERATE_ONLY_CHECKPOINT.md"), report, "utf8"));
  process.stdout.write(`${JSON.stringify({ output: OUTPUT, counts, flashLiteCalls: manifest.flashLiteCalls, rawArtifactsFrozen: manifest.rawArtifactsFrozen }, null, 2)}\n`);
}

await main();
