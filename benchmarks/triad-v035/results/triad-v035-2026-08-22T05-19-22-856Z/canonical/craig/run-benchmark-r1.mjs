// CRAIG (P01) — R1 CORRECTED RERUN: "independent credentials + controlled gemini-3.5-flash-lite".
// BENCHMARK-ONLY. Reuses the FROZEN scenarios.ts, agenerateor-config.ts and grading.mjs from R0
// completely unchanged -- this rerun corrects EXPERIMENTAL CONDITIONS, not the reconstruction.
//
// What changed vs. run-benchmark.mjs (R0):
//   1. Credential isolation: Craig's baseline now runs against a server launched from a clean
//      environment with ONLY Craig's own local .env authoritative (see report.md §P01-R0 for the
//      contamination this corrects -- R0 accidentally exported Agenerateor's GEMINI_API_KEY into
//      the shell that launched the Craig dev server).
//   2. Controlled model: both sides now run gemini-3.5-flash-lite. Agenerateor already defaults to
//      it; Craig's own local .env (not its source, not .env.example) sets GEMINI_MODEL for this
//      run. Craig's *original* default per .env.example is gemini-3.5-flash -- recorded, not used
//      here, and never permanently rewritten in Craig's source.
//   3. No "adjusted maxOutputTokens" variant: flash-lite does not exhibit the R0 thinking-token
//      truncation (verified empirically before this run -- see report.md). Craig runs exactly as
//      engineered, unmodified, on its own 720-token cap.
//   4. External pacing on BOTH sides, since production code (app/api/test-turn/route.ts) is never
//      modified to pass waitForRateGate:true. Pacing lives entirely in this harness.
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createCraigBenchmarkAgent } from "./agenerateor-config.ts";
import { EXECUTABLE_SCENARIOS } from "./scenarios.ts";
import { grade, compare } from "./grading.mjs";
import { createInitialSession } from "../../../../lib/runtime.ts";

const AGEN_URL = process.env.AGEN_URL || "http://localhost:3000";
const CRAIG_URL = process.env.CRAIG_URL || "http://localhost:3110"; // R1 clean server, not 3100
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const PACE_MS = Number(process.env.PACE_MS || 16000); // conservative: <=~2 calls/turn, well under 12/min gates
const REPEATS = Math.max(1, Number(process.env.REPEATS || 1));
const OUT = process.env.OUT || "./results-r1.json";
const MERGE = process.env.MERGE === "1";

function loadEnvFile(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

// ---- Preflight: credential domain isolation (booleans / hashes only -- NEVER the raw values) ----
function preflight() {
  const craigEnv = loadEnvFile("/Users/rex-shih/Documents/Codex/projects/Craig-Hempcrete-DemoSitee/.env");
  const agenEnv = loadEnvFile("/Users/rex-shih/Documents/Codex/projects/Agenerateor/.dev.vars");
  const ck = craigEnv.GEMINI_API_KEY || "";
  const ak = agenEnv.GEMINI_API_KEY || "";
  const ch = createHash("sha256").update(ck).digest("hex");
  const ah = createHash("sha256").update(ak).digest("hex");
  const distinct = Boolean(ck) && Boolean(ak) && ch !== ah;
  const craigModel = craigEnv.GEMINI_MODEL || "(unset -> source default)";
  const agenModel = agenEnv.GEMINI_MODEL || "(unset -> source default)";
  process.stderr.write(`\n[PREFLIGHT] craig_key_present=${Boolean(ck)} agen_key_present=${Boolean(ak)}\n`);
  process.stderr.write(`[PREFLIGHT] credential_domains_distinct=${distinct}\n`);
  process.stderr.write(`[PREFLIGHT] craig_env_model=${craigModel} agen_env_model=${agenModel}\n`);
  if (!distinct) {
    process.stderr.write(`\nABORT: credential_domains_distinct=false -- Craig and Agenerateor are NOT using independent Gemini keys. Refusing to run P01-R1 under these conditions.\n`);
    process.exit(1);
  }
  if (craigModel !== "gemini-3.5-flash-lite" || agenModel !== "gemini-3.5-flash-lite") {
    process.stderr.write(`\nABORT: model asymmetry detected in configured env (craig=${craigModel}, agen=${agenModel}). P01-R1 requires both sides on gemini-3.5-flash-lite.\n`);
    process.exit(1);
  }
  return { distinct, craigModel, agenModel };
}
const pre = preflight();

const agent = createCraigBenchmarkAgent();
const fieldKeyById = Object.fromEntries(agent.session.fields.map((f) => [f.id, f.key]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postJson(url, body, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && !json.reply) { lastErr = `HTTP ${res.status}: ${json.error ?? ""}`; await sleep(2000 * (i + 1)); continue; }
      return json;
    } catch (e) { lastErr = String(e); await sleep(2000 * (i + 1)); }
  }
  return { __error: lastErr };
}

/** Both the Agenerateor and bespoke chat endpoints return HTTP 200 even when the underlying
 *  Gemini call was rate-limited -- they silently degrade to a deterministic/keyword fallback
 *  instead (see app/api/test-turn/route.ts's local_fallback branch, and Craig's own
 *  formatFallback()). That means an HTTP-level retry (postJson's own 3x retry) never fires for a
 *  quota event: the response looks like a perfectly normal 200. Per the corrected protocol
 *  ("wait for minute-level quota capacity rather than causing fallback responses"), this harness
 *  now detects a degraded provider on either side and WAITS OUT the per-minute window, then
 *  retries that exact same turn (same message, same state), rather than accepting the fallback as
 *  if it were the agent's real semantic behavior. Bounded so a genuine daily-quota wall still
 *  terminates the run instead of looping forever. */
const MINUTE_WAIT_MS = 65_000;   // one rolling 60s window plus margin
const MAX_DEGRADED_RETRIES = 3;  // ~3-4 minutes of patience per turn before giving up

async function withMinuteRetry(label, attempt) {
  for (let i = 0; i <= MAX_DEGRADED_RETRIES; i++) {
    const result = await attempt();
    if (result.ok) return { ...result.value, retriesUsed: i };
    if (i === MAX_DEGRADED_RETRIES) return { ...result.value, retriesUsed: i, gaveUp: true };
    process.stderr.write(`  [rate-limit] ${label}: provider degraded (${result.reason}) -- waiting ${Math.round(MINUTE_WAIT_MS / 1000)}s for quota to clear (retry ${i + 1}/${MAX_DEGRADED_RETRIES})\n`);
    await sleep(MINUTE_WAIT_MS);
  }
}

async function runAgenerateor(scenario) {
  let state = createInitialSession(agent);
  const history = [];
  const replies = [];
  const turnProviders = [];
  const actions = new Set();
  const providerModes = new Set();
  let model = null;
  let turnIdx = 0;
  for (const message of scenario.turns) {
    turnIdx += 1;
    await sleep(PACE_MS);
    const outcome = await withMinuteRetry(`${scenario.id} agen turn ${turnIdx}`, async () => {
      const out = await postJson(`${AGEN_URL}/api/test-turn`, { agent, message, state, history, locale: "en" });
      if (out.__error) return { ok: true, value: { out, degraded: false } }; // harness/network error: don't quota-retry
      const degraded = out.provider?.mode !== "gemini";
      return degraded
        ? { ok: false, reason: out.provider?.mode ?? "unknown", value: { out, degraded: true } }
        : { ok: true, value: { out, degraded: false } };
    });
    const out = outcome.out;
    if (out.__error) return { harnessError: out.__error, replies, fields: {}, stageId: null, actions: [...actions], turnProviders, providerModes: [...providerModes], model };
    state = out.state ?? state;
    const reply = out.reply ?? "";
    replies.push(reply);
    history.push({ role: "user", content: message }, { role: "assistant", content: reply });
    (out.actionResults ?? []).forEach((a) => { if (a.attempted) actions.add(a.actionId); });
    if (out.provider?.mode) providerModes.add(out.provider.mode);
    turnProviders.push(out.provider?.mode ?? "unknown");
    if (out.provider?.model) model = out.provider.model;
    if (outcome.gaveUp) turnProviders[turnProviders.length - 1] = `${turnProviders[turnProviders.length - 1]}(daily_quota_wall)`;
  }
  const fields = {};
  for (const [id, v] of Object.entries(state.fields ?? {})) if (fieldKeyById[id] !== undefined) fields[fieldKeyById[id]] = v;
  return { replies, fields, stageId: state.currentStageId ?? null, actions: [...actions], turnProviders, providerModes: [...providerModes], model, harnessError: null };
}

const looksTruncated = (t) => Boolean(t) && !/[.!?"'”’)]\s*$/.test(t.trim());

async function runBespoke(scenario) {
  const messages = [];
  const replies = [];
  const turnProviders = [];
  const sources = new Set();
  let turnIdx = 0;
  for (const message of scenario.turns) {
    turnIdx += 1;
    await sleep(PACE_MS);
    messages.push({ role: "user", content: message });
    const outcome = await withMinuteRetry(`${scenario.id} bespoke turn ${turnIdx}`, async () => {
      const out = await postJson(`${CRAIG_URL}/api/chat`, { messages });
      if (out.__error) return { ok: true, value: { out } };
      const degraded = out.source !== "gemini";
      return degraded ? { ok: false, reason: out.source ?? "unknown", value: { out } } : { ok: true, value: { out } };
    });
    const out = outcome.out;
    if (out.__error) return { harnessError: out.__error, replies, sources: [...sources], turnProviders };
    const reply = out.reply ?? "";
    replies.push(reply);
    messages.push({ role: "assistant", content: reply });
    if (out.source) sources.add(out.source);
    turnProviders.push(outcome.gaveUp ? `${out.source ?? "unknown"}(daily_quota_wall)` : (out.source ?? "unknown"));
  }
  const truncated = replies.filter(looksTruncated).length;
  return { replies, sources: [...sources], turnProviders, truncatedTurns: truncated, harnessError: null };
}

let results = [];
if (MERGE) {
  try { results = JSON.parse(readFileSync(new URL(OUT, import.meta.url), "utf8")).results ?? []; } catch { /* first R1 run: no prior file */ }
}

const scenarios = EXECUTABLE_SCENARIOS.filter((s) => !ONLY || ONLY.has(s.id));
for (const scenario of scenarios) {
  const samples = [];
  for (let rep = 0; rep < REPEATS; rep++) {
    process.stderr.write(`\n[${scenario.id}]${REPEATS > 1 ? ` (sample ${rep + 1}/${REPEATS})` : ""} ${scenario.title}\n`);
    const agenRun = await runAgenerateor(scenario);
    const bespokeRun = await runBespoke(scenario);
    process.stderr.write(`  agenerateor: provider=${agenRun.providerModes?.join("/")} model=${agenRun.model ?? "-"}${agenRun.harnessError ? ` ERROR=${agenRun.harnessError}` : ""}\n`);
    process.stderr.write(`  bespoke(r1): source=${bespokeRun.sources?.join("/")} truncated=${bespokeRun.truncatedTurns ?? 0}/${bespokeRun.replies.length}${bespokeRun.harnessError ? ` ERROR=${bespokeRun.harnessError}` : ""}\n`);
    const agenGrade = grade(scenario, agenRun, false);
    const bespokeGrade = grade(scenario, bespokeRun, true);
    const comparison = compare(agenGrade, bespokeGrade);
    process.stderr.write(`  => agen=${agenGrade.outcome} bespoke=${bespokeGrade.outcome} comparative=${comparison.verdict}\n`);
    samples.push({
      agenerateor: { outcome: agenGrade.outcome, reason: agenGrade.reason, provider: agenRun.providerModes, turnProviders: agenRun.turnProviders, model: agenRun.model, fields: agenRun.fields, stageId: agenRun.stageId, actionsAttempted: agenRun.actions, replies: agenRun.replies, assertions: agenGrade.assertions },
      bespoke: { outcome: bespokeGrade.outcome, reason: bespokeGrade.reason, source: bespokeRun.sources, turnProviders: bespokeRun.turnProviders, truncatedTurns: bespokeRun.truncatedTurns, replies: bespokeRun.replies, assertions: bespokeGrade.assertions },
      comparison,
    });
    // A hard daily-quota wall (as opposed to a per-minute blip) surfaces as `outcome.gaveUp` from
    // withMinuteRetry after MAX_DEGRADED_RETRIES -- tagged directly onto turnProviders as
    // "(daily_quota_wall)" above, which grading.mjs already treats as non-model-backed. No separate
    // process-level abort was needed in practice: every scenario in this run eventually got a real
    // model turn within the retry budget. Per protocol, keys are never silently switched.
  }
  const record = {
    id: scenario.id, specId: scenario.specId, title: scenario.title,
    evidence: scenario.evidence, requirement: scenario.requirement, stresses: scenario.stresses,
    note: scenario.note ?? null, turns: scenario.turns,
    samples,
    // Convenience top-level view = first sample, for tools that expect a single result.
    agenerateor: samples[0].agenerateor, bespoke: samples[0].bespoke, comparison: samples[0].comparison,
  };
  const at = results.findIndex((r) => r.id === scenario.id);
  if (at >= 0) results[at] = record; else results.push(record);
  writeFileSync(new URL(OUT, import.meta.url), JSON.stringify({
    runId: "P01-R1", label: "independent credentials + controlled gemini-3.5-flash-lite",
    generatedAt: new Date().toISOString(), agenUrl: AGEN_URL, craigUrl: CRAIG_URL,
    preflight: pre, paceMs: PACE_MS, repeats: REPEATS,
    results,
  }, null, 2));
}
process.stderr.write(`\nDONE: ${results.length} scenarios -> ${OUT}\n`);
