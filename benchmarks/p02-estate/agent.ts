import type { AgentDefinition, ToolDefinition, ToolExecutor } from "@agent-sdk/core";
import { defineAgent } from "@agent-sdk/core";
import type { BenchmarkAgent, ProjectionInput } from "../shared/runner.ts";

/**
 * P02 / EstatePro - reconstructed from the NEUTRAL normalized requirements only.
 *
 * No bespoke EstatePro implementation and no Agenerateor runtime code is imported. The six
 * properties are the product's own published records; everything else is this SDK's own answer to
 * the requirement register.
 */

export const PROPERTIES = [
  { id: "2", title: "Skyline Penthouse", type: "Penthouse", location: "Upper West Side", city: "New York", price: 18_900_000, beds: 4, baths: 5, sqft: 5200, description: "Breathtaking 360-degree views of Central Park and the Manhattan skyline." },
  { id: "4", title: "The TriBeCa Loft", type: "Apartment", location: "TriBeCa", city: "New York", price: 7_250_000, beds: 3, baths: 3, sqft: 3400, description: "A classic industrial loft reimagined for modern luxury, with original brickwork." },
  { id: "5", title: "Greenwich Townhouse", type: "Mansion", location: "West Village", city: "New York", price: 24_500_000, beds: 6, baths: 7, sqft: 8400, description: "An impeccably restored 25-foot wide Greek Revival townhouse with a private elevator." },
  { id: "6", title: "Park Avenue Estate", type: "Penthouse", location: "Upper East Side", city: "New York", price: 32_000_000, beds: 5, baths: 6.5, sqft: 7200, description: "A white-glove Park Avenue duplex with a gallery, formal dining room and staff quarters." },
  { id: "1", title: "The Azure Vista", type: "Villa", location: "Malibu", city: "Malibu", price: 12_500_000, beds: 5, baths: 6, sqft: 6200, description: "Contemporary architecture with panoramic ocean views and indoor-outdoor living." },
  { id: "3", title: "Emerald Estate", type: "Mansion", location: "Greenwich, Connecticut", city: "Greenwich", price: 15_750_000, beds: 8, baths: 10, sqft: 12500, description: "Classic Georgian architecture on 10 acres of manicured grounds." },
];

/** Rooms are a separate record set so a factual room question is grounded, not recalled. */
export const ROOMS = [
  { property: "Skyline Penthouse", name: "Grand Salon", size_sqft: 1400, description: "Double-height ceilings with floor-to-ceiling windows overlooking the reservoir." },
  { property: "Skyline Penthouse", name: "Private Library", size_sqft: 400, description: "Quiet wood-panelled office space with bespoke shelving." },
  { property: "The TriBeCa Loft", name: "Open Concept Kitchen", size_sqft: 600, description: "Professional grade kitchen with Gaggenau appliances." },
  { property: "Greenwich Townhouse", name: "Owner's Suite", size_sqft: 1200, description: "Occupies the entire third floor with a private wet bar." },
  { property: "Park Avenue Estate", name: "Formal Gallery", size_sqft: 400, description: "Marble-clad entry gallery." },
  { property: "The Azure Vista", name: "Master Suite", size_sqft: 800, description: "Private terrace and spa-like bathroom." },
  { property: "The Azure Vista", name: "Gourmet Kitchen", size_sqft: 450, description: "State-of-the-art appliances with a marble island." },
  { property: "Emerald Estate", name: "Grand Ballroom", size_sqft: 2000, description: "Crystal chandeliers and oak floors." },
];

export const sendToTeam: ToolDefinition = {
  name: "send_to_team",
  label: "send your details to our team",
  description:
    "Send the visitor's details to a human representative. Requires a name AND a phone number. " +
    "Do not call this until the visitor has asked for human follow-up.",
  effect: "external_side_effect",
  confirmation: "required",
  idempotency: "once_per_session",
  input: {
    kind: "object",
    fields: {
      contact_name: { required: true, description: "The visitor's name as they gave it.", schema: { kind: "string", minLength: 2 } },
      phone: { required: true, description: "The phone number they gave.", schema: { kind: "string", minLength: 5 } },
      email: { required: false, description: "Omit entirely if they declined to give one.", schema: { kind: "string" } },
      summary: { required: false, description: "One sentence on what they are looking for, using their CURRENT stated criteria.", schema: { kind: "string", maxLength: 400 } },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

/**
 * Benchmark-only transport.
 *
 * This is the lowest practical external boundary: the conversation, extraction, action eligibility,
 * confirmation, payload construction, action result and post-action behaviour are all REAL. Only the
 * final network hop is faked, and the payload it received is recorded so the corrected-payload
 * assertion is a fact rather than an inference from the reply text.
 */
export function makeTransport(mode: "success" | "fail"): { executor: ToolExecutor; calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    executor: {
      async execute(args) {
        calls.push(args);
        if (mode === "fail") {
          return { ok: false, error: { code: "transport_unavailable", message: "the handoff could not be transmitted to the team" }, retryable: true };
        }
        return {
          ok: true,
          output: { delivered: true, transport: "benchmark_dry_run", reference: `bench-${calls.length}` },
          facts: [{ key: "handoff_transmitted", value: true, description: "The handoff was transmitted. This is the runtime's own record of the dispatch." }],
        };
      },
    },
  };
}

const POLICY_DOC = `
EstatePro markets six properties and no others. The neighbourhood counts shown on the website are marketing figures, not inventory. There is exactly one TriBeCa property: The TriBeCa Loft.

There is no rental pricing data and no rental availability data of any kind. Every price on file is a sale price. We cannot state a monthly rent for any property.

We have no live availability feed. We cannot say whether a property is currently available for viewing, under offer, or in contract.

We cannot book viewings, run valuations, check calendars, send text messages, place phone calls, write to a CRM, or save to a database. None of those systems exist here. A human representative arranges all of them.

For a seller, the next step is a valuation conversation with a specialist. A seller should not be shown purchase listings to pick from.

The only thing we can do on the visitor's behalf is send their details to a human representative, and only after they confirm.
`.trim();

export const estateAgent: AgentDefinition = defineAgent({
  id: "bench-p02-estate",
  name: "EstatePro Concierge",
  description: "P02 benchmark reconstruction from neutral normalized requirements.",
  goal:
    "Help a visitor with buying, renting, selling or learning about our six luxury properties, and connect them with a human " +
    "representative when they want one. Everything you say about a property must come from the records.",
  model: { providerId: "gemini", model: "gemini-3.5-flash-lite", temperature: 0.3, maxOutputTokens: 1024 },
  globalRules: [
    "Never invent a property, a price, or an address. Six properties exist; there are no others.",
    "For ANY constraint on price, bedrooms, or location, call the listings query tool. Never compare numbers yourself.",
    "If nothing matches what the visitor asked for, say so plainly. Never present a property that misses their constraint as if it met it.",
    "There is no rental data. Never state a monthly rent.",
    "Never claim a booking, appointment, viewing, valuation result, text message, phone call, CRM record or database save has occurred - none of those systems exist.",
    "Never claim the visitor's details were sent unless the runtime reports that the send succeeded.",
    "A seller wants a valuation, not a listing to pick from.",
  ],
  memorySchema: {
    fields: [
      { key: "intent", schema: { kind: "enum", choices: ["buy", "rent", "sell"] }, description: "What the visitor wants to do" },
      { key: "target_location", schema: { kind: "string" }, description: "Where they are looking" },
      { key: "budget", schema: { kind: "number", min: 0, max: 500_000_000 }, description: "Budget in US dollars, as a plain number" },
      { key: "bedrooms_needed", schema: { kind: "number", min: 0, max: 20, integer: true } },
      { key: "timeline", schema: { kind: "string" }, description: "When they want to move" },
      { key: "financing", schema: { kind: "enum", choices: ["cash", "mortgage", "undecided"] } },
      { key: "contact_name", schema: { kind: "string" }, description: "Only the visitor's actual name" },
      { key: "phone", schema: { kind: "string" } },
      { key: "email", schema: { kind: "string" }, description: "Optional. Leave unset if the visitor declines." },
      { key: "contact_preference", schema: { kind: "enum", choices: ["call", "text", "email"] } },
      { key: "seller_zip", schema: { kind: "string" }, description: "ZIP of the property they want to sell" },
    ],
  },
  hostContextSchema: {
    fields: [
      { key: "viewing_property", schema: { kind: "string" }, lifecycle: "turn", visibility: "model", trust: "trusted_host" },
      { key: "locale", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "trusted_host" },
      { key: "crm_endpoint_token", schema: { kind: "string" }, lifecycle: "fixed", visibility: "tools_only", trust: "trusted_host" },
      { key: "lead_score_band", schema: { kind: "string" }, lifecycle: "session", visibility: "runtime_only", trust: "trusted_host" },
    ],
  },
  knowledge: [
    {
      source: {
        id: "listings",
        kind: "record_set",
        title: "EstatePro properties",
        displayField: "title",
        fields: {
          id: { kind: "string" },
          title: { kind: "string" },
          type: { kind: "string" },
          location: { kind: "string" },
          city: { kind: "string" },
          price: { kind: "number" },
          beds: { kind: "number" },
          baths: { kind: "number" },
          sqft: { kind: "number" },
          description: { kind: "string" },
        },
        records: PROPERTIES,
      },
    },
    {
      source: {
        id: "rooms",
        kind: "record_set",
        title: "Rooms within our properties",
        displayField: "name",
        fields: {
          property: { kind: "string" },
          name: { kind: "string" },
          size_sqft: { kind: "number" },
          description: { kind: "string" },
        },
        records: ROOMS,
      },
    },
    { source: { id: "policies", kind: "document", title: "What the concierge can and cannot do", text: POLICY_DOC }, topK: 3 },
  ],
  tools: [{ definition: sendToTeam, phaseIds: ["qualify", "handoff"] }],
  flow: {
    initialPhaseId: "qualify",
    phases: [
      {
        id: "qualify",
        objective: "Understand what the visitor wants and answer from the records.",
        transitions: [
          { to: "selling", on: "pre_response", label: "visitor wants to sell", when: { kind: "memory_equals", field: "intent", value: "sell" } },
          {
            to: "handoff",
            on: "pre_response",
            label: "contact details on file",
            when: { kind: "all", of: [{ kind: "memory_present", field: "contact_name" }, { kind: "memory_present", field: "phone" }] },
          },
        ],
      },
      {
        id: "selling",
        objective: "Route the seller to a valuation specialist. Do not offer purchase listings.",
        instructions: "Collect the property's ZIP code and offer a specialist conversation. Do not ask buyer financing questions.",
        toolNames: [],
        transitions: [{ to: "qualify", on: "pre_response", label: "switched back to buying", when: { kind: "memory_equals", field: "intent", value: "buy" } }],
      },
      {
        id: "handoff",
        objective: "State the details out loud, get a clear yes, then send them.",
        transitions: [
          { to: "complete", on: "action_result", label: "handoff succeeded", when: { kind: "tool_succeeded", tool: "send_to_team" } },
          { to: "qualify", on: "action_result", label: "handoff failed", when: { kind: "tool_failed", tool: "send_to_team" } },
        ],
      },
      { id: "complete", objective: "The handoff is done. Answer anything else without sending again.", terminal: true, transitions: [] },
    ],
  },
  policies: { maxSteps: 6, maxToolCallsPerTurn: 3, transcriptWindow: 12 },
});

/**
 * Projection into the CANONICAL benchmark field names used by the stored P02 artifacts.
 *
 * `budget` is the interesting one: this SDK stores a validated NUMBER, while the canonical
 * assertions match on a string containing "20" or "25". Projecting to a string preserves the stored
 * assertion semantics exactly rather than rewriting the benchmark to suit the SDK.
 */
export function projectEstateFields(state: ProjectionInput): Record<string, string | number | boolean | undefined> {
  const raw = (key: string) => state.memory[key]?.value;
  const asString = (key: string) => {
    const value = raw(key);
    return value === undefined ? undefined : Array.isArray(value) ? value.join(", ") : String(value);
  };
  const budget = raw("budget");
  return {
    intent: asString("intent"),
    target_location: asString("target_location"),
    // Rendered in the canonical "$25M" style so the stored substring assertions apply unchanged.
    budget: typeof budget === "number" ? `$${budget / 1_000_000}M` : asString("budget"),
    budget_numeric: typeof budget === "number" ? budget : undefined,
    bedrooms_needed: asString("bedrooms_needed"),
    timeline: asString("timeline"),
    financing: asString("financing"),
    contact_name: asString("contact_name"),
    phone: asString("phone"),
    email: asString("email"),
    contact_preference: asString("contact_preference"),
    seller_zip: asString("seller_zip"),
  };
}

export function makeEstateBenchmarkAgent(): BenchmarkAgent & { lastCalls: () => Record<string, unknown>[] } {
  let calls: Record<string, unknown>[] = [];
  return {
    definition: estateAgent,
    executors: (mode) => {
      const transport = makeTransport(mode);
      calls = transport.calls;
      return { [sendToTeam.name]: transport.executor };
    },
    project: projectEstateFields,
    canonicalAction: (toolName) => (toolName === sendToTeam.name ? "send_email" : null),
    lastCalls: () => calls,
  };
}
