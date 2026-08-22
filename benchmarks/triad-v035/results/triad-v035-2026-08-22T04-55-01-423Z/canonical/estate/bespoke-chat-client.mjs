// ESTATE (P02) — BENCHMARK-ONLY driver for the bespoke EstatePro text chat.
//
// WHY THIS FILE EXISTS: unlike Craig (a Next.js `/api/chat` route the harness could just POST to),
// EstatePro's chat is implemented ENTIRELY CLIENT-SIDE in `components/AIConcierge.tsx` — it
// constructs a `GoogleGenAI` client in the browser and calls `generateContent` directly; there is no
// server route to call. To exercise it without full per-turn browser automation for every scenario,
// this file reproduces the client-side orchestration (session state shape, `systemPrompt()`,
// `parseExtraction()`, the completion/handoff trigger, `buildAnalysis()`, `sendEmail()`'s payload)
// as LITERAL, VERBATIM copies of `components/AIConcierge.tsx` (exact line ranges cited inline),
// wired to the REAL `@google/genai` SDK resolved from EstatePro's own `node_modules`, EstatePro's
// own `.env` credential, and (for the handoff) the real `api/send-email.ts` handler via
// `bespoke-email-server.mjs`. Nothing about the PROMPT TEXT, MODEL, EXTRACTION PROTOCOL, or
// COMPLETION/DUPLICATE-GUARD LOGIC is altered, simplified, or "fixed" — including known bugs
// documented in the intake §5.14 (e.g. the email-sent guard flips true before the send actually
// succeeds; a falsey extracted value can never clear a previously set field).
//
// One fidelity check against the REAL RENDERED BROWSER APP was performed separately (see
// report.md's "Harness fidelity check" — a live browser run of ESTATE-S01's first turn compared
// against this harness's output) rather than trusting the copy-paste alone.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const ESTATE_ROOT = "/Users/rex-shih/Documents/Codex/projects/EstatePro";
const requireFromEstate = createRequire(`${ESTATE_ROOT}/package.json`);
const { GoogleGenAI } = await import(requireFromEstate.resolve("@google/genai"));

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
const ESTATE_ENV = loadEnvFile(`${ESTATE_ROOT}/.env`);
const API_KEY = ESTATE_ENV.GEMINI_API_KEY;

// PROPERTIES — verbatim from constants.tsx (re-typed here as plain data; identical field values,
// independently re-verified against constants.tsx in normalized-requirements.md §3).
const PROPERTIES = JSON.parse(readFileSync(new URL("./estate-properties.json", import.meta.url), "utf8"));

const WELCOME = "Hi! I'm your real estate AI assistant. I can help you buy, rent, or sell... Are you looking to buy, rent, or sell today?";

// ── systemPrompt — VERBATIM copy of AIConcierge.tsx:53-84 (text-mode prompt) ──
function systemPrompt(s) {
  return `You are a friendly, warm real estate assistant for EstatePro. Talk like a real person — short, casual, natural sentences. You are a helpful friend who knows real estate.

RULES:
- NEVER use markdown (no **, ##, bullet points).
- NEVER reveal internal reasoning, plans, or what you're "about to do."
- NEVER say things like "I've registered", "shifting focus", "my assessment".
- 1-3 short sentences max. Sound human, not robotic.

STAGE: ${s.stage}
DATA: ${JSON.stringify(s)}
PROPERTIES: ${JSON.stringify(PROPERTIES)}

WHAT TO SAY (only for current stage):

intent → Figure out buy/rent/sell. Unclear? "Sorry, I didn't catch that. Are you looking to buy, rent, or sell?" Clear? "Great! Which area are you targeting? And what's your approximate budget range?"
core_needs → They said area/budget. Acknowledge, then: "And what's your timeline?"
core_needs_timeline → They said timeline. Then ask: buy→"Are you already pre-approved for a mortgage, or paying cash?" rent→"How many bedrooms are you looking for?" sell→"What's the zip code of the property you'd like to sell?"
intent_specific → They answered. Pick 2 matching properties: "Found it! Here are 2 quick previews: 1. [Price] in [Location] — [feature]. 2. [Price] in [Location] — [feature]. Which one catches your eye, 1 or 2?"
value_exchange → They picked. "Great taste! Can I get your name?"
lead_name → Got name. "Thanks, [Name]! To send you the full photos and details, what's your cell phone number?"
lead_phone → Got number? "Got it! And what's your email address?" Refused? "I totally get it — but I do need a way to send you the photos. How about just sharing your number for now?"
lead_email → Got/skipped email. "Last thing — would you prefer our agent to reach out by text or call? And what time works best for you?"
handoff → Got preference+time. "Perfect, [Name]! Our agent will [text/call] you around [time]. Excited to help you out!"
complete → Chat naturally about properties.

IMPORTANT — After your response, on a NEW line add (user won't see this):
|||EXTRACT|||{"stage":"${s.stage}","next_stage":"<next>","data":{<fields>}}|||END|||
Transitions: intent→core_needs→core_needs_timeline→intent_specific→value_exchange→lead_name→lead_phone→lead_email→handoff→complete
Keys: intent, location, budget, timeline, financing, bedrooms, zipCode, listingPreference, firstName, lastName, phone, email, contactPreference, bestTime
Keep next_stage = current stage if extraction incomplete.`;
}

// ── buildAnalysis / sendEmail — verbatim logic from AIConcierge.tsx:87-118, adapted only to POST
// to the benchmark-only local email server instead of the relative `/api/send-email` (there is no
// server hosting that relative path outside a real browser + would-be Vercel deployment). The
// PAYLOAD SHAPE and the analysis PROMPT TEXT are unchanged. `model` is threaded through so the
// harness can run either the CONTROLLED (gemini-3.5-flash-lite) or AS-DESIGNED (gemini-2.5-flash)
// track without duplicating this function.
async function buildAnalysis(ai, msgs, s, model) {
  try {
    const log = msgs.map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.text}`).join("\n");
    const r = await ai.models.generateContent({
      model,
      contents: `Analyze this real estate lead conversation:\n\n${log}\n\nLead data:\n${JSON.stringify(s, null, 2)}\n\nProvide: Lead quality (Hot/Warm/Cold), intent, requirements, follow-up approach, contact details.`,
      config: { systemInstruction: "You are a real estate lead analyst. Be concise and professional." },
    });
    return { text: r.text || "Analysis unavailable.", modelBacked: true };
  } catch {
    return { text: `Name: ${s.firstName} ${s.lastName}\nPhone: ${s.phone}\nEmail: ${s.email || "N/A"}\nIntent: ${s.intent}\nLocation: ${s.location}\nBudget: ${s.budget}\nTimeline: ${s.timeline}\nContact: ${s.contactPreference} at ${s.bestTime}`, modelBacked: false };
  }
}

async function sendEmail(s, analysis, mockEmailUrl) {
  try {
    const r = await fetch(`${mockEmailUrl}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadName: `${s.firstName || ""} ${s.lastName || ""}`.trim(),
        phone: s.phone || "", email: s.email || "", intent: s.intent || "",
        location: s.location || "", budget: s.budget || "", timeline: s.timeline || "",
        financing: s.financing || "", bedrooms: s.bedrooms || "", zipCode: s.zipCode || "",
        listingPreference: s.listingPreference || "", contactPreference: s.contactPreference || "",
        bestTime: s.bestTime || "", analysis,
      }),
    });
    return r.ok;
  } catch { return false; }
}

// ── parseExtraction — verbatim logic from AIConcierge.tsx:202-235, adapted from React setState to
// a plain mutable object + awaited (not fire-and-forget) email dispatch for deterministic test
// timing. The TRIGGER CONDITION and the TRUTHY-ONLY MERGE (documented §5.4/§5.9 bug: a falsey
// value can never clear a field) are unchanged.
async function parseExtractionAndMaybeHandoff(fullText, session, ctx) {
  if (!fullText.includes("|||EXTRACT|||")) return { display: fullText, extraFollowupMsg: null, actionAttempt: null };
  const [display, rest] = fullText.split("|||EXTRACT|||");
  const jsonStr = rest?.split("|||END|||")[0]?.trim();
  let extraFollowupMsg = null;
  let actionAttempt = null;
  if (jsonStr) {
    try {
      const { data, next_stage } = JSON.parse(jsonStr);
      if (data) Object.entries(data).forEach(([k, v]) => { if (v) session[k] = v; });
      if (next_stage) session.stage = next_stage;
      if (session.stage === "complete" && session.bestTime && !ctx.emailSentGuard.value) {
        ctx.emailSentGuard.value = true; // set BEFORE the send resolves — replicates the real §5.13 bug
        try {
          const analysisResult = await buildAnalysis(ctx.ai, ctx.messages, session, ctx.model);
          const ok = await sendEmail(session, analysisResult.text, ctx.mockEmailUrl);
          actionAttempt = { attempted: true, success: ok, payload: { ...session }, analysisModelBacked: analysisResult.modelBacked };
          extraFollowupMsg = ok
            ? "Awesome — I've sent your details over to our team. They'll be reaching out soon!"
            : "Your info is saved! Our team will reach out to you soon.";
        } catch {
          actionAttempt = { attempted: true, success: false, payload: { ...session }, analysisModelBacked: false };
          extraFollowupMsg = "Your info is saved! Our team will reach out to you soon.";
        }
      }
    } catch {
      // matches the real code's console.error('Extract parse error:', e) + silent continue
    }
  }
  return { display: display.trim(), extraFollowupMsg, actionAttempt };
}

/**
 * Runs one full scenario (a list of user turns) against the REAL bespoke text-chat logic.
 * @param {string[]} turns
 * @param {{ model: string, mockEmailUrl: string }} options
 */
export async function runBespokeEstateScenario(turns, options) {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = options.model;
  const mockEmailUrl = options.mockEmailUrl;
  const session = { stage: "intent" };
  const messages = [{ role: "model", text: WELCOME }]; // "Welcome message on first open" — AIConcierge.tsx:178-183
  const replies = [];
  const turnProviders = [];
  const actionAttempts = [];
  const emailSentGuard = { value: false };

  for (const userText of turns) {
    messages.push({ role: "user", text: userText });
    const history = messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
    let mode = "gemini";
    let displayReply = "";
    try {
      const r = await ai.models.generateContent({
        model,
        contents: history,
        config: { tools: [{ googleMaps: {} }], systemInstruction: systemPrompt(session) },
      });
      const fullText = r.text || "Sorry, I couldn't process that. Could you try again?";
      if (!r.text) mode = "empty_no_text";
      const parsed = await parseExtractionAndMaybeHandoff(fullText, session, { ai, messages, model, mockEmailUrl, emailSentGuard });
      displayReply = parsed.display;
      messages.push({ role: "model", text: displayReply });
      replies.push(displayReply);
      turnProviders.push(mode);
      if (parsed.extraFollowupMsg) {
        messages.push({ role: "model", text: parsed.extraFollowupMsg });
        replies.push(parsed.extraFollowupMsg); // second reply within this turn, exactly as the real UI appends it
        // Keep turnProviders.length === replies.length (grading.mjs#modelBackedFlags indexes by
        // reply, not by scripted turn). This followup string is itself a deterministic template
        // chosen by sendEmail()'s real success/failure, not a second LLM generation call, so it
        // inherits the primary turn's own provider mode rather than getting a separate judgement.
        turnProviders.push(mode);
      }
      if (parsed.actionAttempt) actionAttempts.push(parsed.actionAttempt);
    } catch {
      mode = "fallback";
      displayReply = "Something went wrong on my end. Could you try again?";
      messages.push({ role: "model", text: displayReply });
      replies.push(displayReply);
      turnProviders.push(mode);
    }
  }

  return {
    replies,
    turnProviders,
    sources: [...new Set(turnProviders.map((m) => (m === "gemini" ? "gemini" : "fallback")))],
    session,
    actionAttempts,
    harnessError: null,
  };
}
