import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import {
  AgentHarness,
  AgentRuntime,
  InMemorySessionStore,
  KnowledgeIndex,
  ToolRegistry,
  createRandomIds,
  createSystemClock,
  recordQueryTools,
} from "@agent-sdk/core";
import { emailDryRun } from "@agent-sdk/core/testing";
import { GeminiProvider, geminiApiKeyFromEnv } from "@agent-sdk/provider-gemini";
import { createStrandsGeminiEngine } from "@agent-sdk/integration-strands";
import { computeWallVolume, computeWallVolumeExecutor, craigAgent } from "../../examples/p01-craig/agent.ts";
import { estateAgent, sendEstateLead } from "../../examples/p02-estate/agent.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = resolve(HERE, "../..");
const PROJECTS_ROOT = resolve(AGENT_ROOT, "..");
const AGEN_ROOT = join(PROJECTS_ROOT, "Agenerateor");
const CRAIG_ROOT = join(PROJECTS_ROOT, "Craig-Hempcrete-DemoSitee");
const ESTATE_ROOT = join(PROJECTS_ROOT, "EstatePro");
const MODEL = "gemini-3.5-flash-lite";
const AGEN_URL = process.env["AGEN_URL"] ?? "http://localhost:3000";
const CRAIG_URL = process.env["CRAIG_URL"] ?? "http://localhost:3110";
const MOCK_EMAIL_URL = process.env["MOCK_EMAIL_URL"] ?? "http://localhost:3101";
const MIN_INTERVAL_MS = Math.max(0, Number(process.env["BENCHMARK_MIN_CALL_INTERVAL_MS"] ?? 15_000));
const MAX_RETRIES = Math.max(0, Number(process.env["BENCHMARK_MAX_RETRIES"] ?? 3));
const RETRY_BASE_MS = Math.max(250, Number(process.env["BENCHMARK_RETRY_BASE_MS"] ?? 65_000));
const ONLY_PROJECT = process.env["ONLY_PROJECT"]?.toLowerCase();
const ONLY_SCENARIO = process.env["ONLY_SCENARIO"];

type ProjectId = "p01" | "p02";
type SystemId = "bespoke" | "agenerateor" | "arrokothi";
type Json = Record<string, unknown>;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const nowId = () => new Date().toISOString().replace(/[:.]/g, "-");

function parseEnv(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at < 1) continue;
    let value = line.slice(at + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[line.slice(0, at).trim()] = value;
  }
  return result;
}

function repoState(root: string) {
  const run = (args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const sha = run(["rev-parse", "HEAD"]);
  const status = run(["status", "--short"]);
  if (sha.status !== 0 || status.status !== 0) throw new Error(`git provenance failed for ${root}`);
  return { root, commit: sha.stdout.trim(), trackedDirty: status.stdout.split(/\r?\n/).filter((line) => /^\s*M|^[MADRCU?!]{1,2}\s/.test(line)), statusShort: status.stdout.split(/\r?\n/).filter(Boolean) };
}

function preflightCredentials() {
  const files = {
    arrokothi: join(AGENT_ROOT, ".env"),
    bespokeCraig: join(CRAIG_ROOT, ".env"),
    bespokeEstate: join(ESTATE_ROOT, ".env"),
    agenerateor: join(AGEN_ROOT, ".dev.vars"),
  };
  const parsed = Object.fromEntries(Object.entries(files).map(([name, path]) => [name, parseEnv(path)]));
  const keys = Object.fromEntries(Object.entries(parsed).map(([name, env]) => [name, env["GEMINI_API_KEY"] ?? ""]));
  if (Object.values(keys).some((key) => !key)) throw new Error("credential preflight failed: one or more Gemini keys are absent");
  const digests = Object.values(keys).map((key) => sha256(key));
  if (new Set(digests).size !== digests.length) throw new Error("credential preflight failed: credentials are not pairwise distinct");
  for (const [name, env] of Object.entries(parsed)) {
    if (name === "bespokeEstate") continue;
    if (env["GEMINI_MODEL"] !== MODEL) throw new Error(`${name} GEMINI_MODEL is ${env["GEMINI_MODEL"] ?? "unset"}, expected ${MODEL}`);
  }
  if (process.env["GEMINI_MODEL"] !== MODEL || geminiApiKeyFromEnv() !== keys.arrokothi) {
    throw new Error("Agent_SDK process did not load its own root .env exactly");
  }
  return { keys, files, credentialsPairwiseDistinct: true, userDeclaredIndependentGoogleProjects: true };
}

async function requireHealthy(url: string, label: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (response.status >= 500) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(`${label} is not reachable at ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function postJson(url: string, body: unknown) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    const json = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, json, latencyMs: Date.now() - started, error: response.ok ? null : String((json as Json)["error"] ?? `HTTP ${response.status}`) };
  } catch (error) {
    return { ok: false, status: 0, json: {}, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) };
  }
}

function genericCompare(leftId: SystemId, left: any, rightId: SystemId, right: any) {
  if (left.outcome === "inconclusive" || right.outcome === "inconclusive") return { left: leftId, right: rightId, verdict: "inconclusive", shared: [] };
  const byId = Object.fromEntries((right.assertions ?? []).map((a: any) => [a.id, a]));
  const shared = (left.assertions ?? []).filter((a: any) => a.applicable && (byId[a.id] as any)?.applicable).map((a: any) => ({ id: a.id, severity: a.severity, left: a.passed, right: (byId[a.id] as any).passed }));
  if (!shared.length) return { left: leftId, right: rightId, verdict: "inconclusive", shared };
  const leftWins = shared.filter((a: any) => a.left && !a.right).map((a: any) => a.id);
  const rightWins = shared.filter((a: any) => !a.left && a.right).map((a: any) => a.id);
  const bothFail = shared.filter((a: any) => !a.left && !a.right).map((a: any) => a.id);
  const verdict = leftWins.length && rightWins.length ? "mixed" : leftWins.length ? `${leftId}_better` : rightWins.length ? `${rightId}_better` : bothFail.length ? "tie_both_fail" : "tie";
  return { left: leftId, right: rightId, verdict, shared, leftWins, rightWins, bothFail };
}

function callEvents(turn: any, project: ProjectId, scenarioId: string, turnIndex: number) {
  return turn.events.filter((event: any) => event.type === "ModelCallCompleted").map((event: any) => {
    if (event.payload.model !== MODEL) throw new Error(`MODEL_MISMATCH ${project}/${scenarioId}/arrokothi turn ${turnIndex}: ${event.payload.model}`);
    return {
      system: "arrokothi", project, scenarioId, turnIndex, purpose: event.payload.purpose,
      requestedModel: MODEL, reportedModel: event.payload.model, successful: true,
      latencyMs: event.payload.durationMs ?? null, retryIndex: 0,
      inputTokens: event.payload.usage?.inputTokens ?? null,
      outputTokens: event.payload.usage?.outputTokens ?? null,
      thinkingTokens: null, cachedTokens: null,
      totalTokens: event.payload.usage ? (event.payload.usage.inputTokens ?? 0) + (event.payload.usage.outputTokens ?? 0) : null,
    };
  });
}

async function runArrokothi(project: ProjectId, scenario: any, apiKey: string) {
  const definition = project === "p01" ? craigAgent : estateAgent;
  const sessions = new InMemorySessionStore();
  const knowledge = new KnowledgeIndex(definition.knowledge);
  const tools = new ToolRegistry(definition.tools);
  for (const pair of recordQueryTools(knowledge)) tools.add(pair.definition, pair.executor);
  if (project === "p01") tools.register(computeWallVolume.name, computeWallVolumeExecutor);
  const transport = project === "p02" ? emailDryRun(scenario.mockTransportMode === "fail" ? "fail" : "success") : null;
  if (transport) tools.register(sendEstateLead.name, transport);
  const runtime = new AgentRuntime({
    definition, sessions, knowledge, tools,
    model: new GeminiProvider({ apiKey, model: MODEL, maxRetries: 0 }),
    planningModel: new GeminiProvider({ apiKey, model: MODEL, maxRetries: 0 }),
    harness: new AgentHarness({ strategy: "agentic", engine: createStrandsGeminiEngine({ apiKey }) }),
    ids: createRandomIds(), clock: createSystemClock(),
  });
  const sessionId = await runtime.createSession(undefined, `${project}-${scenario.id}`);
  const replies: string[] = [];
  const turnProviders: string[] = [];
  const calls: any[] = [];
  const toolEvents: any[] = [];
  const metrics = { preflightModelCalls: 0, agentLoopModelCalls: 0, conversationSummaryModelCalls: 0, guideRetryModelCalls: 0, totalModelCalls: 0 };
  let finalState: any = { memory: {}, phaseId: null };
  let harnessError: string | null = null;
  let frameworkFailure: { code: string; message: string; turnIndex: number; classification: string } | null = null;
  for (const [turnIndex, message] of scenario.turns.entries()) {
    if (turnIndex > 0 && MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS);
    const started = Date.now();
    const turn = await runtime.runTurn({ sessionId, message, hostContext: project === "p01" ? { locale: "en-US" } : { locale: "en-US", handoff_transport_token: "benchmark-dry-run", lead_score_band: "unscored" } });
    replies.push(turn.reply);
    finalState = turn.state;
    for (const key of Object.keys(metrics) as Array<keyof typeof metrics>) metrics[key] += turn.metrics[key];
    const perTurnCalls = callEvents(turn, project, scenario.id, turnIndex);
    calls.push(...perTurnCalls);
    turnProviders.push(perTurnCalls.length ? "gemini" : "unknown");
    for (const event of turn.events) {
      if (["ToolRequested", "ToolExecutionSucceeded", "ToolExecutionFailed", "ConfirmationRequested", "DelegationCompleted", "DelegationRejected"].includes(event.type)) {
        toolEvents.push({ turnIndex, type: event.type, payload: event.payload });
      }
    }
    const runtimeFailure: any = turn.events.find((event: any) => event.type === "RuntimeError" && /model|provider|network|timeout|429|quota|invalid.argument|http.400/i.test(`${event.payload.code} ${event.payload.message}`));
    if (runtimeFailure) {
      const detail = `${runtimeFailure.payload.code}: ${runtimeFailure.payload.message}`;
      if (/HTTP_400|INVALID_ARGUMENT|invalid argument/i.test(detail)) {
        frameworkFailure = { code: runtimeFailure.payload.code, message: runtimeFailure.payload.message, turnIndex, classification: "FRAMEWORK_GAP" };
        calls.push({ system: "arrokothi", project, scenarioId: scenario.id, turnIndex, purpose: "agent_loop_failed_attempt", requestedModel: MODEL, reportedModel: MODEL, successful: false, latencyMs: null, retryIndex: 0, inputTokens: null, outputTokens: null, thinkingTokens: null, cachedTokens: null, totalTokens: null, error: detail });
        turnProviders[turnProviders.length - 1] = "gemini_then_framework_failure";
      } else {
        for (const call of perTurnCalls) call.successful = false;
        turnProviders[turnProviders.length - 1] = "infrastructure_failure";
        harnessError = `infrastructure failure: ${detail}`;
      }
      break;
    }
    if (Date.now() - started < 0) throw new Error("unreachable clock state");
  }
  const actionsAttempted = transport ? transport.calls.map(() => "send_email") : [];
  const actionSuccess = transport?.callCount ? scenario.mockTransportMode !== "fail" : null;
  return {
    replies, fields: finalState.memory ?? {}, stageId: finalState.phaseId ?? null,
    actions: actionsAttempted, actionsAttempted, actionSuccess,
    actionResults: transport?.calls.map((call) => ({ tool: "send_to_team", payload: call.args, success: actionSuccess })) ?? [],
    toolEvents, turnProviders, model: MODEL, harnessError, frameworkFailure,
    callMetrics: { ...metrics, logicalModelCalls: calls.length, physicalAttempts: null, physicalAttemptNote: "Strands SDK does not expose transport retry attempts; configured provider retries=0 for preflight. Failed model attempts are counted separately from RunTurnResult.metrics." },
    calls,
  };
}

async function runCraigBespoke(scenario: any) {
  const messages: any[] = [];
  const replies: string[] = [];
  const turnProviders: string[] = [];
  const calls: any[] = [];
  const infrastructureErrors: any[] = [];
  for (const [turnIndex, message] of scenario.turns.entries()) {
    if (turnIndex > 0 && MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS);
    messages.push({ role: "user", content: message });
    let accepted: any = null;
    for (let retryIndex = 0; retryIndex <= MAX_RETRIES; retryIndex++) {
      const attempt = await postJson(`${CRAIG_URL}/api/chat`, { messages });
      const out: any = attempt.json;
      calls.push({ system: "bespoke", project: "p01", scenarioId: scenario.id, turnIndex, purpose: "reply", requestedModel: MODEL, reportedModel: out.source === "gemini" ? MODEL : null, successful: attempt.ok && out.source === "gemini", latencyMs: attempt.latencyMs, retryIndex, inputTokens: null, outputTokens: null, thinkingTokens: null, cachedTokens: null, totalTokens: null });
      if (attempt.ok && out.source === "gemini") { accepted = out; break; }
      infrastructureErrors.push({ turnIndex, retryIndex, status: attempt.status, providerMode: out.source ?? null, error: attempt.error });
      if (retryIndex < MAX_RETRIES) await sleep(RETRY_BASE_MS * Math.min(4, 2 ** retryIndex));
    }
    if (!accepted) return { replies, fields: {}, actions: [], actionsAttempted: [], actionSuccess: null, turnProviders, model: MODEL, harnessError: `infrastructure retries exhausted on turn ${turnIndex}`, infrastructureErrors, calls, callMetrics: { logicalModelCalls: scenario.turns.length, physicalAttempts: calls.length } };
    replies.push(accepted.reply ?? "");
    messages.push({ role: "assistant", content: accepted.reply ?? "" });
    turnProviders.push("gemini");
  }
  return { replies, fields: {}, stageId: null, actions: [], actionsAttempted: [], actionSuccess: null, turnProviders, sources: ["gemini"], model: MODEL, harnessError: null, infrastructureErrors, calls, callMetrics: { logicalModelCalls: scenario.turns.length, physicalAttempts: calls.length } };
}

async function runAgenerateor(project: ProjectId, scenario: any, deps: any) {
  const agent = project === "p01" ? deps.createCraigAgent() : deps.createEstateAgent();
  const fieldKeyById = Object.fromEntries(agent.session.fields.map((field: any) => [field.id, field.key]));
  let state = deps.createInitialSession(agent);
  const history: any[] = [];
  const replies: string[] = [];
  const turnProviders: string[] = [];
  const actionsAttempted: string[] = [];
  const actionResults: any[] = [];
  const calls: any[] = [];
  const infrastructureErrors: any[] = [];
  let actionSuccess: boolean | null = null;
  for (const [turnIndex, message] of scenario.turns.entries()) {
    if (turnIndex > 0 && MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS);
    let accepted: any = null;
    for (let retryIndex = 0; retryIndex <= MAX_RETRIES; retryIndex++) {
      const attempt = await postJson(`${AGEN_URL}/api/test-turn`, { agent, message, state, history, locale: "en" });
      const out: any = attempt.json;
      const modelOk = out.provider?.mode === "gemini" && out.provider?.model === MODEL;
      const logicalThisAttempt = (out.extraction?.aiAttempted ? 1 : 0) + (out.provider?.mode === "gemini" || out.provider?.mode === "local_fallback" ? 1 : 0);
      for (let i = 0; i < Math.max(1, logicalThisAttempt); i++) calls.push({ system: "agenerateor", project, scenarioId: scenario.id, turnIndex, purpose: i === logicalThisAttempt - 1 ? "reply" : "field_extraction", requestedModel: MODEL, reportedModel: out.provider?.model ?? null, successful: modelOk, latencyMs: i === logicalThisAttempt - 1 ? attempt.latencyMs : null, retryIndex, inputTokens: null, outputTokens: null, thinkingTokens: null, cachedTokens: null, totalTokens: null });
      if (attempt.ok && modelOk) { accepted = out; break; }
      if (attempt.ok && out.provider?.mode === "gemini" && out.provider?.model !== MODEL) throw new Error(`MODEL_MISMATCH ${project}/${scenario.id}/agenerateor: ${out.provider.model}`);
      infrastructureErrors.push({ turnIndex, retryIndex, status: attempt.status, provider: out.provider ?? null, error: attempt.error });
      if (retryIndex < MAX_RETRIES) await sleep(RETRY_BASE_MS * Math.min(4, 2 ** retryIndex));
    }
    if (!accepted) return { replies, fields: {}, actions: actionsAttempted, actionsAttempted, actionSuccess, turnProviders, model: MODEL, harnessError: `infrastructure retries exhausted on turn ${turnIndex}`, infrastructureErrors, calls, callMetrics: { logicalModelCalls: calls.length, physicalAttempts: calls.length } };
    state = accepted.state ?? state;
    replies.push(accepted.reply ?? "");
    history.push({ role: "user", content: message }, { role: "assistant", content: accepted.reply ?? "" });
    turnProviders.push("gemini");
    for (const action of accepted.actionResults ?? []) if (action.attempted) { actionsAttempted.push(action.actionId); actionSuccess = action.success; actionResults.push(action); }
  }
  const fields: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(state.fields ?? {})) if (fieldKeyById[id]) fields[fieldKeyById[id] as string] = value;
  return { replies, fields, stageId: state.currentStageId ?? null, actions: actionsAttempted, actionsAttempted, actionSuccess, actionResults, turnProviders, model: MODEL, harnessError: null, infrastructureErrors, calls, callMetrics: { logicalModelCalls: calls.length, physicalAttempts: calls.length, note: "Counted from returned extraction.aiAttempted plus reply provider metadata." } };
}

async function runEstateBespoke(scenario: any, runBespokeEstateScenario: any) {
  if (scenario.mockTransportMode) {
    await fetch(`${MOCK_EMAIL_URL}/__mock/mode?mode=${scenario.mockTransportMode}`);
    await fetch(`${MOCK_EMAIL_URL}/__mock/reset`);
  }
  const started = Date.now();
  try {
    const result = await runBespokeEstateScenario(scenario.turns, { model: MODEL, mockEmailUrl: MOCK_EMAIL_URL });
    const fields = {
      intent: result.session.intent, target_location: result.session.location, budget: result.session.budget,
      timeline: result.session.timeline, financing: result.session.financing, bedrooms_needed: result.session.bedrooms,
      seller_zip: result.session.zipCode, property_preference: result.session.listingPreference,
      contact_name: [result.session.firstName, result.session.lastName].filter(Boolean).join(" ") || undefined,
      phone: result.session.phone, email: result.session.email, contact_preference: result.session.contactPreference,
      best_contact_time: result.session.bestTime,
    };
    const actionResults = result.actionAttempts ?? [];
    const logicalModelCalls = scenario.turns.length + actionResults.filter((a: any) => a.analysisModelBacked).length;
    const calls = Array.from({ length: logicalModelCalls }, (_, index) => ({ system: "bespoke", project: "p02", scenarioId: scenario.id, turnIndex: Math.min(index, scenario.turns.length - 1), purpose: index < scenario.turns.length ? "reply" : "lead_analysis", requestedModel: MODEL, reportedModel: MODEL, successful: true, latencyMs: index === logicalModelCalls - 1 ? Date.now() - started : null, retryIndex: 0, inputTokens: null, outputTokens: null, thinkingTokens: null, cachedTokens: null, totalTokens: null }));
    const modelBacked = result.turnProviders.every((mode: string) => mode === "gemini");
    return { replies: result.replies, fields, actions: actionResults.map(() => "send_email"), actionsAttempted: actionResults.map(() => "send_email"), actionSuccess: actionResults.length ? actionResults.at(-1).success : null, actionResults, turnProviders: result.turnProviders, model: MODEL, harnessError: modelBacked ? null : "infrastructure fallback in faithful EstatePro client", infrastructureErrors: modelBacked ? [] : [{ providerModes: result.turnProviders }], calls, callMetrics: { logicalModelCalls, physicalAttempts: logicalModelCalls, note: "Faithful client exposes no token usage; no transport retry is performed inside the copied driver." } };
  } catch (error) {
    return { replies: [], fields: {}, actions: [], actionsAttempted: [], actionSuccess: null, turnProviders: [], model: MODEL, harnessError: String(error), infrastructureErrors: [{ error: String(error) }], calls: [], callMetrics: { logicalModelCalls: 0, physicalAttempts: 0 } };
  }
}

function totals(records: any[]) {
  const bySystem: Record<string, any> = {};
  for (const record of records) for (const [system, value] of Object.entries(record.systems ?? {}) as any) {
    const bucket = bySystem[system] ??= { scenarios: 0, turns: 0, outcomes: { pass: 0, soft_fail: 0, hard_fail: 0, inconclusive: 0 }, logicalModelCalls: 0, physicalAttemptsKnown: 0, physicalAttemptsUnknownScenarios: 0, inputTokens: 0, outputTokens: 0, tokenCoverageCalls: 0 };
    bucket.scenarios++; bucket.turns += record.turns.length; bucket.outcomes[value.outcome] = (bucket.outcomes[value.outcome] ?? 0) + 1;
    bucket.logicalModelCalls += value.callMetrics?.logicalModelCalls ?? 0;
    if (typeof value.callMetrics?.physicalAttempts === "number") bucket.physicalAttemptsKnown += value.callMetrics.physicalAttempts;
    else bucket.physicalAttemptsUnknownScenarios++;
    for (const call of value.calls ?? []) if (call.inputTokens !== null || call.outputTokens !== null) { bucket.inputTokens += call.inputTokens ?? 0; bucket.outputTokens += call.outputTokens ?? 0; bucket.tokenCoverageCalls++; }
  }
  for (const bucket of Object.values(bySystem)) {
    bucket.physicalAttempts = bucket.physicalAttemptsUnknownScenarios ? null : bucket.physicalAttemptsKnown;
    bucket.meanLogicalCallsPerTurn = bucket.turns ? bucket.logicalModelCalls / bucket.turns : null;
  }
  return bySystem;
}

function writeSummary(runDir: string, manifest: any, projectResults: Record<string, any[]>) {
  const lines = [
    "# Agent_SDK v0.35 triad benchmark summary", "",
    "**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**", "",
    `Run: \`${manifest.runId}\``, `Requested model: \`${MODEL}\``, "",
  ];
  for (const project of ["p01", "p02"] as const) {
    const records = projectResults[project] ?? [];
    if (!records.length) continue;
    lines.push(`## ${project.toUpperCase()}`, "", "| Scenario | Bespoke | Agenerateor | Arrokothi |", "|---|---:|---:|---:|");
    for (const record of records) lines.push(`| ${record.scenarioId} | ${record.systems.bespoke.outcome} | ${record.systems.agenerateor.outcome} | ${record.systems.arrokothi.outcome} |`);
    lines.push("", "### Efficiency", "", "```json", JSON.stringify(totals(records), null, 2), "```", "");
  }
  const all = Object.values(projectResults).flat();
  const infra = all.flatMap((record: any) => Object.entries(record.systems).filter(([, value]: any) => value.harnessError).map(([system, value]: any) => ({ scenario: record.scenarioId, system, error: value.harnessError })));
  lines.push("## Integrity answers", "", `- All requested/observed agent models matched \`${MODEL}\`: ${manifest.modelMismatchCount === 0}.`, `- Degraded/fallback or infrastructure-inconclusive records: ${infra.length}.`, `- Credential values were pairwise distinct: ${manifest.credentialsPairwiseDistinct}.`, "- Efficiency is reported separately and is not folded into semantic outcomes.", "- P01/P02 are development-set regression evidence because Agent_SDK was redesigned using lessons from these cases; P03/P04 remain the prospective tests.", "");
  if (infra.length) lines.push("### Infrastructure records", "", "```json", JSON.stringify(infra, null, 2), "```", "");
  writeFileSync(join(runDir, "summary.md"), lines.join("\n"));
}

async function main() {
  const startedAt = new Date().toISOString();
  const credential = preflightCredentials();
  await requireHealthy(AGEN_URL, "Agenerateor");
  await requireHealthy(CRAIG_URL, "Craig");
  if (ONLY_PROJECT !== "p01") await requireHealthy(`${MOCK_EMAIL_URL}/__mock/calls`, "EstatePro mock email server");

  const canonicalRoot = join(AGEN_ROOT, "tests/benchmarks/real-agents");
  const modules = {
    p01Scenarios: await import(pathToFileURL(join(canonicalRoot, "craig/scenarios.ts")).href),
    p01Grading: await import(pathToFileURL(join(canonicalRoot, "craig/grading.mjs")).href),
    p02Scenarios: await import(pathToFileURL(join(canonicalRoot, "estate/scenarios.ts")).href),
    p02Grading: await import(pathToFileURL(join(canonicalRoot, "estate/grading.mjs")).href),
    craigConfig: await import(pathToFileURL(join(canonicalRoot, "craig/agenerateor-config.ts")).href),
    estateConfig: await import(pathToFileURL(join(canonicalRoot, "estate/agenerateor-config.ts")).href),
    agenRuntime: await import(pathToFileURL(join(AGEN_ROOT, "lib/runtime.ts")).href),
    estateBespoke: await import(pathToFileURL(join(canonicalRoot, "estate/bespoke-chat-client.mjs")).href),
  };
  const deps = { createCraigAgent: modules.craigConfig.createCraigBenchmarkAgent, createEstateAgent: modules.estateConfig.createEstateBenchmarkAgent, createInitialSession: modules.agenRuntime.createInitialSession };
  const runId = `triad-v035-${nowId()}`;
  const runDir = join(HERE, "results", runId);
  mkdirSync(join(runDir, "canonical"), { recursive: true });
  mkdirSync(join(runDir, "provenance"), { recursive: true });
  const sourceFiles = ["craig/scenarios.ts", "craig/grading.mjs", "craig/agenerateor-config.ts", "craig/run-benchmark-r1.mjs", "estate/scenarios.ts", "estate/grading.mjs", "estate/agenerateor-config.ts", "estate/bespoke-chat-client.mjs", "estate/run-benchmark.mjs"];
  const sourceProvenance = sourceFiles.map((relativePath) => {
    const source = join(canonicalRoot, relativePath); const destination = join(runDir, "canonical", relativePath); mkdirSync(dirname(destination), { recursive: true }); copyFileSync(source, destination);
    return { sourceRelativePath: `tests/benchmarks/real-agents/${relativePath}`, copiedRelativePath: `canonical/${relativePath}`, sha256: sha256(readFileSync(source)) };
  });
  const repos = { agentSdk: repoState(AGENT_ROOT), craig: repoState(CRAIG_ROOT), estatePro: repoState(ESTATE_ROOT), agenerateor: repoState(AGEN_ROOT) };
  writeFileSync(join(runDir, "repo-shas.json"), JSON.stringify(repos, null, 2));
  writeFileSync(join(runDir, "provenance", "canonical-sources.json"), JSON.stringify({ sourceRepositoryCommit: repos.agenerateor.commit, files: sourceProvenance }, null, 2));
  const manifest: any = {
    runId, utcStart: startedAt, utcEnd: null, datasetRole: "retrospective-development", requestedModel: MODEL,
    credentialsPairwiseDistinct: credential.credentialsPairwiseDistinct, credentialDomainsDeclaredIndependent: credential.userDeclaredIndependentGoogleProjects,
    pacing: { minCallIntervalMs: MIN_INTERVAL_MS }, retryPolicy: { maxRetries: MAX_RETRIES, baseMs: RETRY_BASE_MS, boundedExponential: true },
    endpoints: { agenerateor: AGEN_URL, craig: CRAIG_URL, estateMockEmail: MOCK_EMAIL_URL },
    agentDefinitionHashes: { p01: sha256(readFileSync(join(AGENT_ROOT, "examples/p01-craig/agent.ts"))), p02: sha256(readFileSync(join(AGENT_ROOT, "examples/p02-estate/agent.ts"))) },
    canonicalSources: sourceProvenance, modelMismatchCount: 0,
    callAccounting: { logical: "one intentional model inference", physical: "one observable outbound/provider-boundary attempt; null where the native library does not expose it" },
  };
  writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const allProjects: Array<{ id: ProjectId; scenarios: any[]; grading: any }> = [
    { id: "p01", scenarios: modules.p01Scenarios.EXECUTABLE_SCENARIOS, grading: modules.p01Grading },
    { id: "p02", scenarios: modules.p02Scenarios.EXECUTABLE_SCENARIOS, grading: modules.p02Grading },
  ];
  const projects = allProjects.filter((project) => !ONLY_PROJECT || project.id === ONLY_PROJECT);
  const projectResults: Record<string, any[]> = {};
  const rotations: SystemId[][] = [["bespoke", "agenerateor", "arrokothi"], ["agenerateor", "arrokothi", "bespoke"], ["arrokothi", "bespoke", "agenerateor"]];
  for (const project of projects) {
    const records: any[] = [];
    projectResults[project.id] = records;
    const scenarios = project.scenarios.filter((scenario) => !ONLY_SCENARIO || scenario.id === ONLY_SCENARIO);
    mkdirSync(join(runDir, project.id), { recursive: true });
    for (const [scenarioIndex, scenario] of scenarios.entries()) {
      const order = rotations[scenarioIndex % rotations.length]!;
      process.stderr.write(`\n[${project.id.toUpperCase()} ${scenario.id}] order=${order.join(" -> ")} ${scenario.title}\n`);
      const systems: Record<string, any> = {};
      for (const system of order) {
        process.stderr.write(`  ${system}: running ${scenario.turns.length} turn(s)\n`);
        const run: any = system === "arrokothi" ? await runArrokothi(project.id, scenario, credential.keys.arrokothi!)
          : system === "agenerateor" ? await runAgenerateor(project.id, scenario, deps)
          : project.id === "p01" ? await runCraigBespoke(scenario)
          : await runEstateBespoke(scenario, modules.estateBespoke.runBespokeEstateScenario);
        const forceInapplicable = project.id === "p02" && system === "agenerateor" ? new Set(scenario.agenSideInapplicableAssertionIds ?? []) : new Set();
        let grade = project.id === "p01" ? project.grading.grade(scenario, run, system === "bespoke") : project.grading.grade(scenario, run, forceInapplicable);
        if (run.frameworkFailure) {
          grade = {
            ...grade,
            outcome: "hard_fail",
            reason: `FRAMEWORK_GAP: ${run.frameworkFailure.code}: ${run.frameworkFailure.message}`,
            assertions: [...(grade.assertions ?? []), { id: "arrokothi_framework_execution_completed", label: "Canonical v0.35 Strands execution completes without an invalid provider request", kind: "state", severity: "hard", applicable: true, passed: false, detail: `${run.frameworkFailure.code}: ${run.frameworkFailure.message}` }],
          };
        }
        systems[system] = { ...run, outcome: grade.outcome, reason: grade.reason, assertions: grade.assertions };
        process.stderr.write(`    outcome=${grade.outcome} model=${run.model} logical_calls=${run.callMetrics?.logicalModelCalls ?? "?"}${run.harnessError ? ` error=${run.harnessError}` : ""}\n`);
      }
      const comparisons = {
        arrokothi_vs_bespoke: genericCompare("arrokothi", systems.arrokothi, "bespoke", systems.bespoke),
        arrokothi_vs_agenerateor: genericCompare("arrokothi", systems.arrokothi, "agenerateor", systems.agenerateor),
        agenerateor_vs_bespoke: genericCompare("agenerateor", systems.agenerateor, "bespoke", systems.bespoke),
      };
      const record = { scenarioId: scenario.id, specId: scenario.specId, title: scenario.title, evidence: scenario.evidence, requirement: scenario.requirement, stresses: scenario.stresses, note: scenario.note ?? null, turns: scenario.turns, executionOrder: order, systems, comparisons };
      records.push(record);
      writeFileSync(join(runDir, project.id, "results.json"), JSON.stringify({ project: project.id, records }, null, 2));
      for (const system of ["bespoke", "agenerateor", "arrokothi"] as const) {
        const path = join(runDir, project.id, `calls-${system}.jsonl`);
        const prior = existsSync(path) ? readFileSync(path, "utf8") : "";
        writeFileSync(path, prior + (systems[system].calls ?? []).map((call: any) => JSON.stringify(call)).join("\n") + ((systems[system].calls ?? []).length ? "\n" : ""));
      }
    }
    writeFileSync(join(runDir, project.id, "efficiency.json"), JSON.stringify(totals(records), null, 2));
  }
  manifest.utcEnd = new Date().toISOString();
  writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeSummary(runDir, manifest, projectResults);
  process.stdout.write(`${runDir}\n`);
}

await main();
