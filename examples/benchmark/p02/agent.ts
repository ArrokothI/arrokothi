import type { AgentDefinition, ToolDefinition } from "@arrokothi/core";
import { defineAgent } from "@arrokothi/core";
import { P02_PROPERTIES } from "./catalog.ts";

export const P02_WELCOME_MESSAGE =
  "Hi! I'm your real estate AI assistant. I can help you buy, rent, or sell... Are you looking to buy, rent, or sell today?";

export interface P02GenerationConfig {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

const authoritativeMemoryArgument = (key: string) => ({
  kind: "authoritative_value" as const,
  sources: [`memory.${key}` as const],
});

export const sendEmailTool: ToolDefinition = {
  name: "send_email",
  label: "send the qualified EstatePro lead to the team",
  description:
    "Send the completed EstatePro lead and a concise conversation analysis to the human team. Use once, only after the contact preference and best contact time are known.",
  effect: "external_side_effect",
  confirmation: "none",
  idempotency: "once_per_session",
  input: {
    kind: "object",
    fields: {
      firstName: { required: true, description: "Lead's first name.", schema: { kind: "string", minLength: 1 } },
      lastName: { required: false, description: "Lead's last name, when supplied.", schema: { kind: "string" } },
      phone: { required: true, description: "Lead's cell phone number.", schema: { kind: "string", minLength: 5 } },
      email: { required: false, description: "Lead's email, omitted when declined.", schema: { kind: "string", minLength: 3 } },
      intent: { required: false, schema: { kind: "enum", choices: ["buy", "rent", "sell"] } },
      location: { required: false, schema: { kind: "string" } },
      budget: { required: false, schema: { kind: "string" } },
      timeline: { required: false, schema: { kind: "string" } },
      financing: { required: false, schema: { kind: "string" } },
      bedrooms: { required: false, schema: { kind: "string" } },
      zipCode: { required: false, schema: { kind: "string" } },
      listingPreference: { required: false, schema: { kind: "string" } },
      contactPreference: { required: true, schema: { kind: "enum", choices: ["text", "call"] } },
      bestTime: { required: true, schema: { kind: "string", minLength: 1 } },
      analysis: {
        required: false,
        description: "Concise professional lead quality, requirements, and follow-up analysis.",
        schema: { kind: "string", maxLength: 2000 },
      },
    },
  },
  output: {
    kind: "object",
    additionalProperties: true,
    fields: {
      delivered: { required: true, schema: { kind: "boolean" } },
      transport: { required: true, schema: { kind: "string" } },
      message_id: { required: false, schema: { kind: "string" } },
    },
  },
  argumentPolicies: {
    firstName: authoritativeMemoryArgument("firstName"),
    lastName: authoritativeMemoryArgument("lastName"),
    phone: authoritativeMemoryArgument("phone"),
    email: authoritativeMemoryArgument("email"),
    intent: authoritativeMemoryArgument("intent"),
    location: authoritativeMemoryArgument("location"),
    budget: authoritativeMemoryArgument("budget"),
    timeline: authoritativeMemoryArgument("timeline"),
    financing: authoritativeMemoryArgument("financing"),
    bedrooms: authoritativeMemoryArgument("bedrooms"),
    zipCode: authoritativeMemoryArgument("zipCode"),
    listingPreference: authoritativeMemoryArgument("listingPreference"),
    contactPreference: authoritativeMemoryArgument("contactPreference"),
    bestTime: authoritativeMemoryArgument("bestTime"),
    analysis: { kind: "model_composed" },
  },
};

const intentSpecificReady = {
  kind: "any" as const,
  of: [
    { kind: "all" as const, of: [
      { kind: "memory_equals" as const, field: "intent", value: "buy" },
      { kind: "memory_present" as const, field: "financing" },
    ] },
    { kind: "all" as const, of: [
      { kind: "memory_equals" as const, field: "intent", value: "rent" },
      { kind: "memory_present" as const, field: "bedrooms" },
    ] },
    { kind: "all" as const, of: [
      { kind: "memory_equals" as const, field: "intent", value: "sell" },
      { kind: "memory_present" as const, field: "zipCode" },
    ] },
  ],
};

export function createP02Definition(generation: P02GenerationConfig = {}): AgentDefinition {
  return defineAgent({
    id: "benchmark-p02-estatepro-concierge",
    version: 1,
    name: "EstatePro AI Assistant",
    description: "A staged luxury real-estate lead concierge with grounded property records and a human handoff.",
    goal: "Help an EstatePro visitor qualify a buy, rent, or sell inquiry, preview suitable properties, and arrange a human follow-up.",
    model: {
      providerId: "gemini",
      model: generation.model ?? "gemini-3.5-flash-lite",
      temperature: generation.temperature,
      maxOutputTokens: generation.maxOutputTokens,
    },
    planning: { mode: "llm", extractWorkingNotes: false },
    execution: { harness: "workflow", executionContextPolicy: "fresh_each_turn" },
    globalRules: [
      {
        id: "natural-short-style",
        kind: "invariant",
        scope: "response",
        text: "Talk like a friendly, warm person who knows real estate: short, casual, natural sentences, with 1-3 short sentences maximum.",
      },
      {
        id: "no-markdown",
        kind: "invariant",
        scope: "response",
        text: "Never use Markdown, including headings, emphasis, or bullet-list syntax.",
      },
      {
        id: "no-internal-narration",
        kind: "invariant",
        scope: "response",
        text: "Never reveal internal reasoning, plans, extraction, state transitions, or what you are about to do. Never say phrases such as 'I've registered', 'shifting focus', or 'my assessment'.",
      },
      {
        id: "current-stage-only",
        kind: "invariant",
        scope: "response",
        text: "Follow only the current phase's speaking instruction. Do not skip ahead to later lead questions.",
      },
      {
        id: "planner-direct-facts",
        kind: "invariant",
        scope: "planner",
        text: "Write only facts explicitly supplied by the latest user. Extract intent, location, budget, timeline, financing, bedrooms, zipCode, listingPreference, firstName, lastName, phone, email, contactPreference, and bestTime into matching memory fields when present.",
      },
      {
        id: "planner-email-refusal",
        kind: "invariant",
        scope: "planner",
        text: "Emit the email_skipped signal only when the user explicitly declines or skips email at the email-collection step.",
      },
      {
        id: "ground-property-claims",
        kind: "invariant",
        scope: "both",
        text: "Use only the bound EstatePro property records for listing names, prices, locations, rooms, and features. Use the property query capability for numeric or exact matching rather than inventing a listing.",
      },
      {
        id: "maps-grounding",
        kind: "invariant",
        scope: "both",
        text: "Use the Google Maps grounding source when current location or place evidence would materially help. Treat its returned URLs and descriptions as observations, not as property inventory.",
      },
      {
        id: "automatic-reference-handoff",
        kind: "invariant",
        scope: "response",
        text: "The reference application automatically sends a completed lead without asking for a second confirmation. Never claim delivery unless the send_email result reports delivered=true; on failure, say the information is saved for team follow-up.",
      },
    ],
    memorySchema: {
      fields: [
        { key: "intent", schema: { kind: "enum", choices: ["buy", "rent", "sell"] } },
        { key: "location", schema: { kind: "string", minLength: 1 } },
        { key: "budget", schema: { kind: "string", minLength: 1 } },
        { key: "timeline", schema: { kind: "string", minLength: 1 } },
        { key: "financing", schema: { kind: "string", minLength: 1 } },
        { key: "bedrooms", schema: { kind: "string", minLength: 1 } },
        { key: "zipCode", schema: { kind: "string", minLength: 1 } },
        { key: "listingPreference", schema: { kind: "string", minLength: 1 } },
        { key: "firstName", schema: { kind: "string", minLength: 1 } },
        { key: "lastName", schema: { kind: "string" } },
        { key: "phone", schema: { kind: "string", minLength: 5 } },
        { key: "email", schema: { kind: "string", minLength: 3 } },
        { key: "contactPreference", schema: { kind: "enum", choices: ["text", "call"] } },
        { key: "bestTime", schema: { kind: "string", minLength: 1 } },
      ],
    },
    hostContextSchema: { fields: [] },
    knowledge: [
      {
        source: {
          id: "properties",
          kind: "record_set",
          title: "EstatePro property catalog",
          description: "The six reference sale listings with exact price, location, size, and authored highlights.",
          displayField: "title",
          fields: {
            id: { kind: "string" },
            title: { kind: "string" },
            type: { kind: "string" },
            location: { kind: "string" },
            price: { schema: { kind: "number", min: 0 }, description: "Sale price in U.S. dollars." },
            beds: { schema: { kind: "number", min: 0 }, description: "Bedroom count." },
            baths: { kind: "number", min: 0 },
            sqft: { kind: "number", min: 0 },
            description: { kind: "string" },
            highlights: { kind: "string_array", maxItems: 8 },
          },
          records: P02_PROPERTIES,
        },
        exposeQueryTool: true,
      },
      {
        source: {
          id: "google_maps",
          kind: "web_search",
          title: "Google Maps grounding",
          description: "Current place and location evidence compatible with the reference model's Google Maps grounding tool.",
          maxResults: 5,
        },
      },
    ],
    tools: [{ definition: sendEmailTool, phaseIds: ["complete"] }],
    flow: {
      initialPhaseId: "intent",
      phases: [
        {
          id: "intent",
          objective: "Determine whether the visitor wants to buy, rent, or sell.",
          instructions: "If the intent is unclear, say: Sorry, I didn't catch that. Are you looking to buy, rent, or sell?",
          transitions: [{ to: "core_needs", on: "pre_response", when: { kind: "memory_present", field: "intent" } }],
        },
        {
          id: "core_needs",
          objective: "Collect target area and approximate budget.",
          instructions: "Acknowledge the intent and ask: Which area are you targeting? And what's your approximate budget range?",
          transitions: [{
            to: "core_needs_timeline",
            on: "pre_response",
            when: { kind: "all", of: [
              { kind: "memory_present", field: "location" },
              { kind: "memory_present", field: "budget" },
            ] },
          }],
        },
        {
          id: "core_needs_timeline",
          objective: "Collect the visitor's timeline.",
          instructions: "Acknowledge the area and budget, then ask: And what's your timeline?",
          transitions: [{ to: "intent_specific", on: "pre_response", when: { kind: "memory_present", field: "timeline" } }],
        },
        {
          id: "intent_specific",
          objective: "Collect the one intent-specific qualification detail.",
          instructions: "For a buyer ask whether they are pre-approved for a mortgage or paying cash. For a renter ask how many bedrooms. For a seller ask the property's ZIP code.",
          transitions: [{ to: "value_exchange", on: "pre_response", when: intentSpecificReady }],
        },
        {
          id: "value_exchange",
          objective: "Show exactly two suitable property previews and learn which the visitor prefers.",
          instructions: "Use the property evidence to give exactly two quick previews with price, location, and one feature, then ask which catches their eye, 1 or 2.",
          transitions: [{ to: "lead_name", on: "pre_response", when: { kind: "memory_present", field: "listingPreference" } }],
        },
        {
          id: "lead_name",
          objective: "Collect the lead's name after they choose a property.",
          instructions: "Say: Great taste! Can I get your name?",
          transitions: [{ to: "lead_phone", on: "pre_response", when: { kind: "memory_present", field: "firstName" } }],
        },
        {
          id: "lead_phone",
          objective: "Collect the lead's cell phone number.",
          instructions: "Thank the lead by first name and ask for their cell phone number so the full photos and details can be sent.",
          transitions: [{ to: "lead_email", on: "pre_response", when: { kind: "memory_present", field: "phone" } }],
        },
        {
          id: "lead_email",
          objective: "Collect or explicitly skip email.",
          instructions: "Say: Got it! And what's your email address? If they refuse, accept the refusal and do not invent an address.",
          transitions: [{
            to: "handoff",
            on: "pre_response",
            when: { kind: "any", of: [
              { kind: "memory_present", field: "email" },
              { kind: "signal", name: "email_skipped" },
            ] },
          }],
        },
        {
          id: "handoff",
          objective: "Collect contact method and best contact time.",
          instructions: "Ask whether the lead prefers a text or call from the agent and what time works best.",
          transitions: [{
            to: "complete",
            on: "pre_response",
            when: { kind: "all", of: [
              { kind: "memory_present", field: "contactPreference" },
              { kind: "memory_present", field: "bestTime" },
            ] },
          }],
        },
        {
          id: "complete",
          objective: "Send the qualified lead once, confirm the handoff honestly, and continue natural property conversation.",
          instructions: "If send_email has not produced a result, call it once with the validated lead memory and a concise professional analysis. After its result, tell the lead the agent will use their preferred method around their preferred time. On later turns, chat naturally about the properties.",
          toolNames: ["send_email"],
          terminal: true,
          transitions: [],
        },
      ],
    },
    policies: {
      maxSteps: 3,
      maxToolCallsPerTurn: 2,
      maxRetrievalRequests: 3,
      maxDocumentChunks: 3,
      maxRecordRows: 6,
      maxKnowledgeChars: 12_000,
      maxKnowledgeCallsPerTurn: 4,
      maxActionRequestsPerTurn: 1,
      transcriptWindow: 12,
    },
  });
}

export const p02Agent = createP02Definition();
