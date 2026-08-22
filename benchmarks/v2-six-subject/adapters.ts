import type { NeutralRawRunV2 } from "../evaluator-v2/schema.ts";
import type { ScenarioV2 } from "../scenario-v2/types.ts";
import { ESTATE_PROPERTIES, ESTATE_ROOMS } from "../benchmark-rebuild-v1/p02-arrokothai/records.ts";

export const SUBJECT_MODEL = "gemini-3.5-flash-lite";

type GeminiResponse = {
  modelVersion?: string;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

async function geminiGenerate(input: {
  apiKey: string;
  system: string;
  history: Array<{ role: "user" | "model"; text: string }>;
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${SUBJECT_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": input.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.system }] },
      contents: input.history.map((item) => ({ role: item.role, parts: [{ text: item.text }] })),
      generationConfig: {
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
      },
    }),
  });
  if (!response.ok) throw new Error(`Gemini subject request failed: ${response.status} ${(await response.text()).slice(0, 500)}`);
  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n").trim() ?? "";
  if (!text) throw new Error("Gemini subject returned no text");
  return { text, model: data.modelVersion, usage: data.usageMetadata };
}

const P01_SYSTEM = `
You are the Craig Hempcrete AI Assistant for a U.S. B2C hemp-lime building materials demo website.

Behavior:
- Act like a consultative sales advisor for homeowners, DIY builders, and small builders.
- Keep every answer warm, practical, and educational.
- Work in universal project quantities: square feet first, metric secondary, and material volume in m³. Never tie estimates to final SKUs or package counts.
- Every answer must end with exactly one useful follow-up question.
- State that hempcrete is 100% legal, 0% THC, fire-resistant, and unrelated to recreational marijuana when legality or safety comes up.
- Use the current 2024 International Residential Code reference as Appendix BL for hemp-lime construction. Do not call it Appendix AU.
- Explain that hempcrete is non-load-bearing infill. A conventional timber frame carries roof and floor loads.
- Be honest that calculator numbers are planning estimates, not stamped engineering or permit advice.
- In voice mode, keep replies concise enough to speak naturally, usually 2-4 sentences.

Core workflows to preserve:
1. Backyard office around 180 sq. ft.: estimate 400-450 sq. ft. net exterior wall area, 10-12 inch walls, roughly 10-12 m³, recommend pre-cast blocks for clean speed, ask about 12-inch insulation vs. 8-inch floor space.
2. Cold damp bedroom around 300 sq. ft. wall area: recommend interior retrofit, 2.5-3 inch layer, roughly 2.5-3 m³, furring strips plus hand-tamping, ask existing wall type.
3. Load and code: hempcrete is non-load-bearing infill; 2024 IRC Appendix BL standardizes hemp-lime; ask planning phase.
4. Cost: upfront materials about 15-20% higher, total ownership improves through 4-in-1 assembly, 30-40% HVAC savings, 3-5 year payback, ask for dimensions.
5. Drying: pre-cast blocks arrive cured, mortar 2-3 days before plaster; cast-in-situ forms off next day, 3-6 weeks curing before final plaster; ask deadline vs. hands-on DIY priority.
`.trim();

type EstateState = {
  stage: string;
  intent?: string;
  location?: string;
  budget?: string;
  timeline?: string;
  financing?: string;
  bedrooms?: string;
  zipCode?: string;
  listingPreference?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  contactPreference?: string;
  bestTime?: string;
};

function estateSystem(s: EstateState): string {
  return `You are a friendly, warm real estate assistant for EstatePro. Talk like a real person — short, casual, natural sentences. You are a helpful friend who knows real estate.

RULES:
- NEVER use markdown (no **, ##, bullet points).
- NEVER reveal internal reasoning, plans, or what you're "about to do."
- NEVER say things like "I've registered", "shifting focus", "my assessment".
- 1-3 short sentences max. Sound human, not robotic.

STAGE: ${s.stage}
DATA: ${JSON.stringify(s)}
PROPERTIES: ${JSON.stringify(ESTATE_PROPERTIES)}

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

function p01Projection(messages: string[]) {
  const state: Record<string, string | number> = {};
  for (const message of messages) {
    const lower = message.toLowerCase();
    const wallArea = message.match(/(?:exactly\s+|about\s+)?([\d,]+)\s*(?:sq\.?\s*ft\.?|square feet)[^.!?]{0,45}(?:wall|exterior)/i)
      ?? message.match(/(?:wall area|walls?|wall)[^\d]{0,30}(?:is|of|at|about|around)?\s*([\d,]+)\s*(?:sq\.?\s*ft\.?|square feet)/i)
      ?? message.match(/([\d,]+)\s*(?:sq\.?\s*ft\.?|square feet)[^.!?]{0,18}(?:of\s+)?(?:exterior\s+)?wall/i);
    if (wallArea?.[1]) state.wall_area_sq_ft = Number(wallArea[1].replaceAll(",", ""));
    const thickness = message.match(/([\d.]+)\s*(?:-|\s)?inch(?:es)?(?:\s+(?:thick|walls?|layer))?/i);
    if (thickness?.[1]) state.wall_thickness_in = Number(thickness[1]);
    if (/pre-?cast|blocks/.test(lower)) state.install_method = "precast_blocks";
    if (/cast[- ]in[- ]situ|cast it in place|hands-on diy/.test(lower)) state.install_method = "cast_in_situ";
    if (/interior|bedroom|retrofit/.test(lower)) state.project_type = "interior_retrofit";
  }
  const area = state.wall_area_sq_ft;
  const thickness = state.wall_thickness_in;
  return {
    state,
    computations: typeof area === "number" && typeof thickness === "number"
      ? { wall_volume_m3: area * (thickness / 12) * 0.0283168 }
      : {},
  };
}

function parseEstateExtraction(full: string, state: EstateState) {
  const marker = full.indexOf("|||EXTRACT|||");
  if (marker < 0) return { display: full.trim(), state };
  const display = full.slice(0, marker).trim();
  const raw = full.slice(marker + "|||EXTRACT|||".length).split("|||END|||")[0]?.trim();
  try {
    const parsed = JSON.parse(raw ?? "{}") as { data?: Record<string, unknown>; next_stage?: string };
    const next = { ...state } as Record<string, unknown>;
    for (const [key, value] of Object.entries(parsed.data ?? {})) if (value !== null && value !== "") next[key] = value;
    if (parsed.next_stage) next.stage = parsed.next_stage;
    return { display, state: next as EstateState };
  } catch {
    return { display, state };
  }
}

function numericBudget(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replaceAll(/[$,\s]/g, "").toLowerCase();
  const match = cleaned.match(/([\d.]+)(m|million)?/);
  if (!match?.[1]) return undefined;
  return Number(match[1]) * (match[2] ? 1_000_000 : 1);
}

function originalEstateCanonical(state: EstateState): Record<string, string | number | undefined> {
  return {
    intent: state.intent,
    target_location: state.location,
    budget: numericBudget(state.budget),
    bedrooms_needed: state.bedrooms ? Number(state.bedrooms) : undefined,
    timeline: state.timeline,
    financing: state.financing,
    seller_zip: state.zipCode,
    selected_property: state.listingPreference,
    contact_name: [state.firstName, state.lastName].filter(Boolean).join(" ") || undefined,
    phone: state.phone,
    email: state.email,
    contact_preference: state.contactPreference,
    best_contact_time: state.bestTime,
  };
}

function mentionedRecordIds(conversation: NeutralRawRunV2["conversation"]): string[] {
  const text = conversation.map((turn) => turn.assistant).join("\n").toLowerCase();
  return ESTATE_PROPERTIES.filter((row) => text.includes(String(row.title).toLowerCase())).map((row) => String(row.id));
}

function recordRows() {
  const rows: Record<string, Record<string, any>> = {};
  for (const property of ESTATE_PROPERTIES) rows[String(property.id)] = { ...property, price: `$${Number(property.price).toLocaleString("en-US")}` };
  for (const room of ESTATE_ROOMS) rows[String(room.id)] = { ...room };
  return rows;
}

export async function runOriginalP01(apiKey: string, scenario: ScenarioV2, repeatId: string): Promise<NeutralRawRunV2> {
  const started = Date.now();
  const history: Array<{ role: "user" | "model"; text: string }> = [];
  const conversation: NeutralRawRunV2["conversation"] = [];
  const models: string[] = [];
  let inputTokens = 0, outputTokens = 0;
  for (const [index, turn] of scenario.turns.entries()) {
    history.push({ role: "user", text: turn.content });
    const response = await geminiGenerate({ apiKey, system: P01_SYSTEM, history, temperature: 0.35, maxOutputTokens: 720 });
    history.push({ role: "model", text: response.text });
    conversation.push({ turn: index + 1, user: turn.content, assistant: response.text });
    if (response.model) models.push(response.model);
    inputTokens += response.usage?.promptTokenCount ?? 0;
    outputTokens += response.usage?.candidatesTokenCount ?? 0;
  }
  const projection = p01Projection(scenario.turns.map((turn) => turn.content));
  return {
    schemaVersion: "neutral-raw-run-v2", applicationId: "p01", implementationId: "p01-original", frameworkId: "bespoke-original",
    scenarioId: scenario.id, repeatId, conversation,
    requestedModel: { provider: "gemini", requested: SUBJECT_MODEL, temperature: 0.35, callCount: conversation.length, usage: { available: true, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } },
    reportedModel: { provider: "gemini", requested: SUBJECT_MODEL, providerReported: [...new Set(models)] },
    canonicalFinalState: projection.state, deterministicComputations: projection.computations,
    actionRequests: [], executorDispatchCount: 0, stopReason: "scenario_turns_complete",
    timing: { elapsedMs: Date.now() - started }, modelCallCount: conversation.length,
    tokenUsage: { available: true, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
  };
}

export async function runOriginalP02(apiKey: string, scenario: ScenarioV2, repeatId: string): Promise<NeutralRawRunV2> {
  const started = Date.now();
  let state: EstateState = { stage: "intent" };
  const history: Array<{ role: "user" | "model"; text: string }> = [];
  const conversation: NeutralRawRunV2["conversation"] = [];
  const models: string[] = [];
  let inputTokens = 0, outputTokens = 0, dispatchCount = 0;
  let terminalActionResult: NeutralRawRunV2["terminalActionResult"];
  let exactActionPayload: Record<string, string | number> | undefined;
  for (const [index, turn] of scenario.turns.entries()) {
    history.push({ role: "user", text: turn.content });
    const response = await geminiGenerate({ apiKey, system: estateSystem(state), history });
    const parsed = parseEstateExtraction(response.text, state);
    state = parsed.state;
    history.push({ role: "model", text: parsed.display });
    conversation.push({ turn: index + 1, user: turn.content, assistant: parsed.display });
    if (response.model) models.push(response.model);
    inputTokens += response.usage?.promptTokenCount ?? 0;
    outputTokens += response.usage?.candidatesTokenCount ?? 0;
    if (state.stage === "complete" && dispatchCount === 0 && state.phone && (state.firstName || state.lastName)) {
      dispatchCount = 1;
      const canonical = originalEstateCanonical(state);
      exactActionPayload = Object.fromEntries(Object.entries(canonical).filter(([, value]) => value !== undefined)) as Record<string, string | number>;
      const injected = scenario.setup?.terminalActionResult;
      terminalActionResult = injected === "definite_failure" ? "definite_failure" : injected === "outcome_unknown" ? "outcome_unknown" : "success";
      const outcomeReply = terminalActionResult === "success"
        ? "Awesome — I've sent your details over to our team. They'll be reaching out soon!"
        : "Your info is saved! Our team will reach out to you soon.";
      conversation[conversation.length - 1]!.assistant += `\n${outcomeReply}`;
    }
  }
  const canonical = originalEstateCanonical(state);
  const selectedIds = mentionedRecordIds(conversation);
  return {
    schemaVersion: "neutral-raw-run-v2", applicationId: "p02", implementationId: "p02-original", frameworkId: "bespoke-original",
    scenarioId: scenario.id, repeatId, conversation,
    requestedModel: { provider: "gemini", requested: SUBJECT_MODEL, callCount: conversation.length, usage: { available: true, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } },
    reportedModel: { provider: "gemini", requested: SUBJECT_MODEL, providerReported: [...new Set(models)] },
    canonicalFinalState: canonical, recordObservations: [{ collection: "frozen-estate-records", selectedIds, rows: recordRows(), resultCount: selectedIds.length, zeroMatch: selectedIds.length === 0 }],
    exactSelectedRecordIds: selectedIds,
    actionRequests: dispatchCount ? [{ turn: conversation.length, actionName: "send_lead_to_team", args: exactActionPayload, effect: "external_side_effect", dispatched: true }] : [],
    exactActionPayload, executorDispatchCount: dispatchCount, terminalActionResult,
    stopReason: state.stage === "complete" ? "completed" : "scenario_turns_complete",
    timing: { elapsedMs: Date.now() - started }, modelCallCount: conversation.length,
    tokenUsage: { available: true, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
    nativeTrace: { projectedSessionState: state, transport: "deterministic_fake" },
  };
}

export async function runAgenerateor(endpoint: string, scenario: ScenarioV2, repeatId: string): Promise<NeutralRawRunV2> {
  const started = Date.now();
  let state: unknown;
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  const conversation: NeutralRawRunV2["conversation"] = [];
  const nativeTurns: Array<Record<string, any>> = [];
  for (const [index, turn] of scenario.turns.entries()) {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      applicationId: scenario.applicationId, message: turn.content, state, history, locale: "en", terminalActionResult: scenario.setup?.terminalActionResult,
    }) });
    const payload = await response.json() as Record<string, any>;
    if (!response.ok) throw new Error(`Agenerateor turn failed ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
    state = payload.state;
    conversation.push({ turn: index + 1, user: turn.content, assistant: payload.reply });
    history.push({ role: "user", content: turn.content }, { role: "assistant", content: payload.reply });
    nativeTurns.push(payload);
  }
  const last = nativeTurns.at(-1);
  const flatState = { ...(last?.canonicalState?.fields ?? {}), ...(last?.canonicalState?.context ?? {}) };
  const observations = nativeTurns.map((turn) => turn.applicationObservation).filter(Boolean);
  const selectedIds = observations.flatMap((observation) => observation.selectedIds ?? observation.resultIds ?? []);
  const actionResults = nativeTurns.flatMap((turn, index) => (turn.actionResults ?? []).map((result: any) => ({ turn: index + 1, ...result })));
  const attempted = actionResults.filter((result) => result.attempted);
  const lastAction = attempted.at(-1);
  const requestedOutcome = scenario.setup?.terminalActionResult;
  const terminalActionResult = lastAction
    ? (requestedOutcome === "outcome_unknown" ? undefined : lastAction.success ? "success" : "definite_failure")
    : undefined;
  const exactActionPayload = lastAction?.publicResponse?.action?.payload ?? lastAction?.output?.payload ?? undefined;
  const modelCalls = nativeTurns.flatMap((turn) => turn.modelCalls ?? []);
  return {
    schemaVersion: "neutral-raw-run-v2", applicationId: scenario.applicationId, implementationId: `${scenario.applicationId}-agenerateor`, frameworkId: "generated-runtime",
    scenarioId: scenario.id, repeatId, conversation,
    requestedModel: { provider: "gemini", requested: last?.provider?.requestedModel, temperature: last?.provider?.temperature, callCount: modelCalls.length, usage: { available: false } },
    reportedModel: { provider: "gemini", requested: last?.provider?.requestedModel, providerReported: last?.provider?.providerReportedModel ?? undefined },
    canonicalFinalState: flatState, deterministicComputations: scenario.applicationId === "p01" ? { wall_volume_m3: flatState.wall_volume_m3 } : undefined,
    recordObservations: observations.map((observation) => ({ selectedIds: observation.selectedIds ?? observation.resultIds, resultCount: observation.resultCount ?? observation.matchCount, fields: observation })),
    exactSelectedRecordIds: selectedIds.length ? [...new Set(selectedIds.map(String))] : [],
    actionRequests: attempted.map((result) => ({ turn: result.turn, actionName: result.actionId, args: result.publicResponse?.action?.payload ?? result.output?.payload, effect: "external_side_effect", dispatched: true })),
    exactActionPayload, executorDispatchCount: attempted.length, terminalActionResult,
    stopReason: last?.canonicalState?.completed ? "completed" : "scenario_turns_complete",
    timing: { elapsedMs: Date.now() - started }, modelCallCount: modelCalls.length, tokenUsage: { available: false },
    nativeTrace: { turns: nativeTurns, outcomeUnknownLimitation: requestedOutcome === "outcome_unknown" },
  };
}

export function adaptArrokothai(raw: Record<string, any>, scenario: ScenarioV2, repeatId: string): NeutralRawRunV2 {
  const knowledgeCalls = raw.knowledge?.calls ?? [];
  const observations = knowledgeCalls.map((call: any) => ({
    queryId: call.request?.sourceId, collection: call.sourceId, selectedIds: call.result?.matches?.map((row: any) => String(row.id)) ?? [],
    rows: Object.fromEntries((call.result?.matches ?? []).map((row: any) => [String(row.id), row])), resultCount: call.returnedCount, zeroMatch: call.returnedCount === 0,
    fields: Object.fromEntries((call.result?.matches ?? []).flatMap((row: any) => row.name && row.size ? [[`${String(row.property).toLowerCase().replaceAll(" ", "_")}_${String(row.name).toLowerCase().replaceAll(" ", "_")}_size`, row.size]] : [])),
  }));
  const requests = raw.actions?.requests ?? [];
  const starts = raw.actions?.executionStarted ?? [];
  const confirmation = raw.actions?.confirmationsRequested?.at(-1);
  const latestStart = starts.at(-1);
  const terminalActionResult = raw.actions?.succeeded?.length ? "success" : raw.actions?.outcomeUnknown?.length ? "outcome_unknown" : raw.actions?.failed?.length ? "definite_failure" : undefined;
  const computationFacts = (raw.nativeTrace?.eventStream ?? []).filter((event: any) => event.type === "ToolExecutionSucceeded").flatMap((event: any) => event.payload?.facts ?? []);
  const computation = computationFacts.find((fact: any) => fact.key === "planning_wall_volume_m3")?.value;
  const selectedIds: string[] = [...new Set<string>(observations.flatMap((observation: any) => observation.selectedIds ?? []).map(String))];
  return {
    schemaVersion: "neutral-raw-run-v2", applicationId: scenario.applicationId, implementationId: `${scenario.applicationId}-arrokothai`, frameworkId: "provider-neutral-runtime",
    scenarioId: scenario.id, repeatId,
    conversation: (raw.conversation ?? []).map((turn: any) => ({ turn: turn.turn, user: turn.user, assistant: turn.assistant, at: turn.at })),
    requestedModel: { provider: "gemini", requested: raw.model?.requested, temperature: raw.model?.temperature, callCount: raw.model?.callCount, usage: raw.model?.usage },
    reportedModel: { provider: "gemini", requested: raw.model?.requested, providerReported: raw.model?.providerReported },
    canonicalFinalState: raw.canonicalState, deterministicComputations: computation === undefined ? undefined : { wall_volume_m3: computation },
    retrievalObservations: observations, recordObservations: observations, exactSelectedRecordIds: selectedIds,
    actionRequests: requests.map((request: any) => ({ turn: request.turn, actionName: request.toolName, args: request.args, effect: request.toolName === "send_lead_to_team" ? "external_side_effect" : "read", dispatched: starts.some((start: any) => start.requestId === request.requestId) })),
    confirmationRequests: confirmation ? [{ turn: confirmation.turn, actionName: confirmation.toolName, payload: confirmation.args, resolved: raw.actions?.confirmationsResolved?.length ? "accepted" : undefined }] : [],
    exactActionPayload: latestStart?.args, executorDispatchCount: raw.actions?.dispatchCount ?? 0, terminalActionResult,
    stopReason: raw.stopReason, runtimeErrors: raw.runtimeErrors?.map((error: any) => ({ code: error.code, message: error.message ?? JSON.stringify(error) })),
    timing: raw.timestamps, modelCallCount: raw.model?.callCount, tokenUsage: { ...raw.model?.usage, totalTokens: (raw.model?.usage?.inputTokens ?? 0) + (raw.model?.usage?.outputTokens ?? 0) },
    nativeTrace: raw,
  };
}
