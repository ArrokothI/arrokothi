import type { AgentDefinition, ToolDefinition } from "@arrokothi/core";
import { defineAgent } from "@arrokothi/core";

/**
 * An estate-like agent: the shape that exercises everything v0 has.
 *
 * Grounded records with a deterministic budget filter, a confirmation-gated external side effect
 * with once-per-session idempotency, a coarse three-phase flow with both transition timings, and
 * host context at all three visibility levels.
 */

export const PROPERTIES = [
  { id: "p1", title: "The Azure Vista", type: "Villa", location: "Malibu", price: 12_500_000, beds: 5, baths: 6, sqft: 6200, highlight: "Panoramic ocean views and seamless indoor-outdoor living." },
  { id: "p2", title: "Skyline Penthouse", type: "Penthouse", location: "Upper West Side", price: 18_900_000, beds: 4, baths: 5, sqft: 5200, highlight: "360-degree views of Central Park and the Manhattan skyline." },
  { id: "p3", title: "Emerald Estate", type: "Mansion", location: "Greenwich, Connecticut", price: 15_750_000, beds: 8, baths: 10, sqft: 12500, highlight: "Georgian architecture on ten acres of manicured grounds." },
  { id: "p4", title: "The TriBeCa Loft", type: "Apartment", location: "TriBeCa", price: 7_250_000, beds: 3, baths: 3, sqft: 3400, highlight: "Industrial loft with original brickwork and full automation." },
  { id: "p5", title: "Greenwich Townhouse", type: "Mansion", location: "West Village", price: 24_500_000, beds: 6, baths: 7, sqft: 8400, highlight: "Restored Greek Revival with private elevator and roof garden." },
  { id: "p6", title: "Park Avenue Estate", type: "Penthouse", location: "Upper East Side", price: 32_000_000, beds: 5, baths: 6.5, sqft: 7200, highlight: "White-glove duplex with gallery, formal dining and staff quarters." },
];

/**
 * The one consequential action.
 *
 * `external_side_effect` + `confirmation: "required"` + `once_per_session` is the combination that
 * makes a duplicate handoff structurally impossible rather than merely discouraged.
 */
export const sendToTeam: ToolDefinition = {
  name: "send_to_team",
  label: "send your details to our team",
  description:
    "Send the visitor's details to a human representative. Use only when the visitor has given a name and a phone number and wants a human to follow up.",
  effect: "external_side_effect",
  confirmation: "required",
  idempotency: "once_per_session",
  argumentPolicies: {
    contact_name: { kind: "authoritative_value", sources: ["memory.contact_name"] },
    phone: { kind: "authoritative_value", sources: ["memory.phone"] },
    email: { kind: "authoritative_value", sources: ["memory.email"] },
    summary: { kind: "model_composed" },
  },
  input: {
    kind: "object",
    fields: {
      contact_name: { required: true, description: "The visitor's name.", schema: { kind: "string", minLength: 2 } },
      phone: { required: true, description: "A phone number they gave.", schema: { kind: "string", minLength: 5 } },
      email: { required: false, description: "Optional - omit entirely if they declined.", schema: { kind: "string" } },
      summary: { required: false, description: "One sentence on what they are looking for.", schema: { kind: "string", maxLength: 400 } },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

export const estateAgent: AgentDefinition = defineAgent({
  id: "estate-like",
  name: "EstatePro Concierge",
  description: "A luxury property concierge with grounded listings and a confirmation-gated human handoff.",
  goal:
    "Help a visitor find a property from our six listings, or route them to a specialist if they want to sell. " +
    "Only ever describe properties that exist in the records, and hand off to a human when they are ready.",
  model: { providerId: "gemini", model: "gemini-3.5-flash-lite", temperature: 0.3 },
  globalRules: [
    "Never invent a listing, a price, or an availability status. Six properties exist and no others.",
    "Never claim a booking, viewing, valuation, CRM record, or database save has occurred - none of those systems exist.",
    "Use the listings query tool for any budget, bedroom, or location constraint rather than comparing numbers yourself.",
    "If nothing matches what they asked for, say so plainly instead of offering the closest thing as if it matched.",
  ],
  memorySchema: {
    fields: [
      { key: "intent", schema: { kind: "enum", choices: ["buy", "rent", "sell"] }, description: "What the visitor wants to do" },
      { key: "target_location", schema: { kind: "string" }, description: "Where they want to be" },
      { key: "budget", schema: { kind: "number", min: 0, max: 200_000_000 }, description: "Budget in US dollars" },
      { key: "bedrooms_needed", schema: { kind: "number", min: 0, max: 20, integer: true } },
      { key: "timeline", schema: { kind: "string" }, description: "When they want to move" },
      { key: "financing", schema: { kind: "enum", choices: ["cash", "mortgage", "undecided"] } },
      { key: "contact_name", schema: { kind: "string" } },
      { key: "phone", schema: { kind: "string" } },
      { key: "email", schema: { kind: "string" }, description: "Optional. Leave blank if the visitor declines it." },
      { key: "contact_preference", schema: { kind: "enum", choices: ["call", "text", "email"] } },
      { key: "seller_zip", schema: { kind: "string" }, description: "ZIP code of the property they want to sell" },
    ],
  },
  hostContextSchema: {
    fields: [
      { key: "viewing_property", schema: { kind: "string" }, lifecycle: "turn", visibility: "model", trust: "trusted_host", description: "The listing the visitor is currently looking at" },
      { key: "locale", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "trusted_host" },
      { key: "referral_claim", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "user_claimed", description: "Who the visitor says referred them" },
      { key: "crm_endpoint_token", schema: { kind: "string" }, lifecycle: "fixed", visibility: "tools_only", trust: "trusted_host", description: "Credential for the handoff transport. Tools only." },
      { key: "lead_score_band", schema: { kind: "string" }, lifecycle: "session", visibility: "runtime_only", trust: "trusted_host", description: "Internal routing signal. Never shown to the model." },
    ],
  },
  knowledge: [
    {
      source: {
        id: "listings",
        kind: "record_set",
        title: "Available properties",
        description: "Current sale listings including price, location, bedrooms, baths, size, and highlights.",
        displayField: "title",
        fields: {
          id: { kind: "string" },
          title: { kind: "string" },
          type: { kind: "string" },
          location: { kind: "string" },
          price: { kind: "number" },
          beds: { kind: "number" },
          baths: { kind: "number" },
          sqft: { kind: "number" },
          highlight: { kind: "string" },
        },
        records: PROPERTIES,
      },
    },
    {
      source: {
        id: "policies",
        kind: "document",
        title: "What the concierge can and cannot do",
        description: "Service limits, inventory caveats, rental-data limitations, and seller next steps.",
        text: [
          "We market six properties. The neighbourhood counts shown on the website are marketing figures, not inventory: there is exactly one TriBeCa listing, The TriBeCa Loft.",
          "We have no rental pricing or rental availability data. Every listed price is a sale price.",
          "We cannot book viewings, run valuations, or check live availability. A human representative arranges all of those.",
          "For a seller, the next step is a valuation conversation with a specialist, not a purchase listing.",
        ].join("\n\n"),
      },
    },
  ],
  tools: [{ definition: sendToTeam, phaseIds: ["qualify", "handoff"] }],
  flow: {
    initialPhaseId: "qualify",
    phases: [
      {
        id: "qualify",
        objective: "Understand what the visitor wants and show them properties that genuinely fit.",
        instructions: "Answer their questions from the records. Ask for contact details only once they want a human to follow up.",
        transitions: [
          { to: "selling", on: "pre_response", label: "visitor wants to sell", when: { kind: "memory_equals", field: "intent", value: "sell" } },
          {
            to: "handoff",
            on: "pre_response",
            label: "ready for a human",
            when: { kind: "all", of: [{ kind: "memory_present", field: "contact_name" }, { kind: "memory_present", field: "phone" }] },
          },
        ],
      },
      {
        id: "selling",
        objective: "Route the seller to a valuation specialist.",
        instructions: "Do not pitch purchase listings to a seller. Collect the property's ZIP code and offer a specialist call.",
        toolNames: [],
        transitions: [{ to: "qualify", on: "pre_response", label: "changed back to buying", when: { kind: "memory_equals", field: "intent", value: "buy" } }],
      },
      {
        id: "handoff",
        objective: "Confirm the details out loud, then pass them to the team.",
        instructions: "State exactly what you are about to send and wait for a clear yes before sending it.",
        transitions: [
          { to: "complete", on: "action_result", label: "handoff succeeded", when: { kind: "tool_succeeded", tool: "send_to_team" } },
          { to: "qualify", on: "action_result", label: "handoff failed", when: { kind: "tool_failed", tool: "send_to_team" } },
        ],
      },
      {
        id: "complete",
        objective: "The handoff is done. Answer any remaining questions without sending anything again.",
        terminal: true,
        transitions: [],
      },
    ],
  },
  policies: { maxSteps: 6, maxToolCallsPerTurn: 3, workingNoteTtlMs: 30 * 60 * 1000, transcriptWindow: 12 },
});
