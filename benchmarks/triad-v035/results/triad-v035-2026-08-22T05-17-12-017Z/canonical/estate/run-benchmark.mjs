// ESTATE (P02) — controlled-model primary benchmark driver. BENCHMARK-ONLY.
//
// Agenerateor side: real HTTP calls to /api/test-turn (unmodified production route), using the
// FROZEN agenerateor-config.ts, exactly like Craig's R1 harness.
// Bespoke side: bespoke-chat-client.mjs (verbatim-copied client orchestration) + real
// api/send-email.ts via bespoke-email-server.mjs (mocked transport only).
//
// Rate-limit / degradation protocol matches Craig's R1 harness: pace every model call, detect a
// degraded provider, wait a full per-minute window and retry the SAME turn rather than accept a
// fallback reply as semantic evidence.
import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createEstateBenchmarkAgent } from "./agenerateor-config.ts";
import { EXECUTABLE_SCENARIOS } from "./scenarios.ts";
import { grade, compare } from "./grading.mjs";
import { createInitialSession } from "../../../../lib/runtime.ts";
import { runBespokeEstateScenario } from "./bespoke-chat-client.mjs";

const AGEN_URL = process.env.AGEN_URL || "http://localhost:3000";
const MOCK_EMAIL_URL = process.env.MOCK_EMAIL_URL || "http://localhost:3101";
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const PACE_MS = Number(process.env.PACE_MS || 7000); // ~8-9 calls/min per side, under the 10/min conservative target
const TEXT_MODEL = process.env.ESTATE_TEXT_MODEL || "gemini-3.5-flash-lite"; // controlled track
const OUT = process.env.OUT || "./results-controlled.json";
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

function preflight() {
  const estateEnv = loadEnvFile("/Users/rex-shih/Documents/Codex/projects/EstatePro/.env");
  const agenEnv = loadEnvFile("/Users/rex-shih/Documents/Codex/projects/Agenerateor/.dev.vars");
  const ek = estateEnv.GEMINI_API_KEY || "";
  const ak = agenEnv.GEMINI_API_KEY || "";
  const eh = createHash("sha256").update(ek).digest("hex");
  const ah = createHash("sha256").update(ak).digest("hex");
  const distinct = Boolean(ek) && Boolean(ak) && eh !== ah;
  process.stderr.write(`\n[PREFLIGHT] estate_key_present=${Boolean(ek)} agen_key_present=${Boolean(ak)}\n`);
  process.stderr.write(`[PREFLIGHT] credential_domains_distinct=${distinct}\n`);
  process.stderr.write(`[PREFLIGHT] text_model=${TEXT_MODEL}\n`);
  if (!distinct) { process.stderr.write("\nABORT: credential_domains_distinct=false.\n"); process.exit(1); }
  return { distinct };
}
const pre = preflight();

const agent = createEstateBenchmarkAgent();
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

const MINUTE_WAIT_MS = 65_000;
const MAX_DEGRADED_RETRIES = 3;
async function withMinuteRetry(label, attempt) {
  for (let i = 0; i <= MAX_DEGRADED_RETRIES; i++) {
    const result = await attempt();
    if (result.ok) return { ...result.value, retriesUsed: i };
    if (i === MAX_DEGRADED_RETRIES) return { ...result.value, retriesUsed: i, gaveUp: true };
    process.stderr.write(`  [rate-limit] ${label}: provider degraded (${result.reason}) -- waiting ${Math.round(MINUTE_WAIT_MS / 1000)}s (retry ${i + 1}/${MAX_DEGRADED_RETRIES})\n`);
    await sleep(MINUTE_WAIT_MS);
  }
}

// Canonical field projection (both sides -> same key space; see scenarios.ts header).
function projectAgenFields(state) {
  const fields = {};
  for (const [id, v] of Object.entries(state.fields ?? {})) if (fieldKeyById[id] !== undefined) fields[fieldKeyById[id]] = v;
  return fields;
}
function projectBespokeFields(session) {
  const name = [session.firstName, session.lastName].filter(Boolean).join(" ").trim();
  return {
    intent: session.intent, target_location: session.location, budget: session.budget,
    timeline: session.timeline, financing: session.financing, bedrooms_needed: session.bedrooms,
    seller_zip: session.zipCode, property_preference: session.listingPreference,
    contact_name: name || undefined, phone: session.phone, email: session.email,
    contact_preference: session.contactPreference, best_contact_time: session.bestTime,
  };
}

async function setMockMode(mode) {
  await fetch(`${MOCK_EMAIL_URL}/__mock/mode?mode=${mode}`);
  await fetch(`${MOCK_EMAIL_URL}/__mock/reset`);
}
async function mockCallCount() {
  const r = await fetch(`${MOCK_EMAIL_URL}/__mock/calls`).then((x) => x.json()).catch(() => ({ calls: [] }));
  return r.calls?.length ?? 0;
}

async function runAgenerateor(scenario) {
  let state = createInitialSession(agent);
  const history = [];
  const replies = [];
  const turnProviders = [];
  const actionsAttempted = [];
  let actionSuccess = null;
  let model = null;
  let turnIdx = 0;
  for (const message of scenario.turns) {
    turnIdx += 1;
    await sleep(PACE_MS);
    const outcome = await withMinuteRetry(`${scenario.id} agen turn ${turnIdx}`, async () => {
      const out = await postJson(`${AGEN_URL}/api/test-turn`, { agent, message, state, history, locale: "en" });
      if (out.__error) return { ok: true, value: { out } };
      const degraded = out.provider?.mode !== "gemini";
      return degraded ? { ok: false, reason: out.provider?.mode ?? "unknown", value: { out } } : { ok: true, value: { out } };
    });
    const out = outcome.out;
    if (out.__error) return { harnessError: out.__error, replies, fields: {}, actionsAttempted, actionSuccess, turnProviders, model };
    state = out.state ?? state;
    const reply = out.reply ?? "";
    replies.push(reply);
    history.push({ role: "user", content: message }, { role: "assistant", content: reply });
    (out.actionResults ?? []).forEach((a) => { if (a.attempted) { actionsAttempted.push(a.actionId); actionSuccess = a.success; } });
    turnProviders.push(out.provider?.mode === "gemini" ? "gemini" : (out.provider?.mode ?? "unknown"));
    if (out.provider?.model) model = out.provider.model;
  }
  return { replies, fields: projectAgenFields(state), actionsAttempted, actionSuccess, turnProviders, model, harnessError: null };
}

async function runBespoke(scenario) {
  if (scenario.mockTransportMode) await setMockMode(scenario.mockTransportMode);
  const before = scenario.mockTransportMode ? await mockCallCount() : 0;
  let result;
  try {
    result = await runBespokeEstateScenario(scenario.turns, { model: TEXT_MODEL, mockEmailUrl: MOCK_EMAIL_URL });
  } catch (e) {
    return { harnessError: String(e), replies: [], fields: {}, actionsAttempted: [], actionSuccess: null, turnProviders: [] };
  }
  const after = scenario.mockTransportMode ? await mockCallCount() : before;
  const dispatchCount = after - before;
  const actionsAttempted = result.actionAttempts.map(() => "send_email");
  const actionSuccess = result.actionAttempts.length ? result.actionAttempts[result.actionAttempts.length - 1].success : null;
  return {
    replies: result.replies, fields: projectBespokeFields(result.session), actionsAttempted, actionSuccess,
    turnProviders: result.turnProviders, harnessError: null,
    actionAttemptsFull: result.actionAttempts, mockDispatchCount: dispatchCount,
  };
}

let results = [];
if (MERGE) { try { results = JSON.parse(readFileSync(new URL(OUT, import.meta.url), "utf8")).results ?? []; } catch { /* first run */ } }

const scenarios = EXECUTABLE_SCENARIOS.filter((s) => !ONLY || ONLY.has(s.id));
for (const scenario of scenarios) {
  process.stderr.write(`\n[${scenario.id}] ${scenario.title}\n`);
  const agenRun = await runAgenerateor(scenario);
  const bespokeRun = await runBespoke(scenario);
  process.stderr.write(`  agenerateor: provider=${agenRun.turnProviders?.join("/")} model=${agenRun.model ?? "-"}${agenRun.harnessError ? ` ERROR=${agenRun.harnessError}` : ""}\n`);
  process.stderr.write(`  bespoke: provider=${bespokeRun.turnProviders?.join("/")}${bespokeRun.harnessError ? ` ERROR=${bespokeRun.harnessError}` : ""} dispatches=${bespokeRun.mockDispatchCount ?? "n/a"}\n`);
  const forceInapplicable = new Set(scenario.agenSideInapplicableAssertionIds ?? []);
  const agenGrade = grade(scenario, agenRun, forceInapplicable);
  const bespokeGrade = grade(scenario, bespokeRun);
  const comparison = compare(agenGrade, bespokeGrade);
  process.stderr.write(`  => agen=${agenGrade.outcome} bespoke=${bespokeGrade.outcome} comparative=${comparison.verdict}\n`);
  const record = {
    id: scenario.id, specId: scenario.specId, title: scenario.title,
    evidence: scenario.evidence, requirement: scenario.requirement, stresses: scenario.stresses,
    note: scenario.note ?? null, turns: scenario.turns, mockTransportMode: scenario.mockTransportMode ?? null,
    agenerateor: { outcome: agenGrade.outcome, reason: agenGrade.reason, provider: agenRun.turnProviders, model: agenRun.model, fields: agenRun.fields, actionsAttempted: agenRun.actionsAttempted, actionSuccess: agenRun.actionSuccess, replies: agenRun.replies, assertions: agenGrade.assertions },
    bespoke: { outcome: bespokeGrade.outcome, reason: bespokeGrade.reason, provider: bespokeRun.turnProviders, fields: bespokeRun.fields, actionsAttempted: bespokeRun.actionsAttempted, actionSuccess: bespokeRun.actionSuccess, replies: bespokeRun.replies, assertions: bespokeGrade.assertions, mockDispatchCount: bespokeRun.mockDispatchCount ?? null, actionAttemptsFull: bespokeRun.actionAttemptsFull ?? null },
    comparison,
  };
  const at = results.findIndex((r) => r.id === scenario.id);
  if (at >= 0) results[at] = record; else results.push(record);
  writeFileSync(new URL(OUT, import.meta.url), JSON.stringify({
    runId: "P02-controlled", label: "controlled-model gemini-3.5-flash-lite, both sides",
    generatedAt: new Date().toISOString(), agenUrl: AGEN_URL, mockEmailUrl: MOCK_EMAIL_URL, textModel: TEXT_MODEL,
    preflight: pre, paceMs: PACE_MS, results,
  }, null, 2));
}
process.stderr.write(`\nDONE: ${results.length} scenarios -> ${OUT}\n`);
