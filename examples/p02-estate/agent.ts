import type { AgentDefinition, ToolDefinition } from "@agent-sdk/core";
import { defineAgent } from "@agent-sdk/core";

/**
 * P02 / EstatePro, expressed only through Agent_SDK control-plane concepts.
 *
 * The reference project supplies the property catalog and concierge requirements. Its React state
 * machine, embedded prompt, Gemini calls, Maps integration, and email implementation are not used.
 */

export const ESTATE_PROPERTIES = [
  {
    id: "2",
    title: "Skyline Penthouse",
    type: "Penthouse",
    location: "Upper West Side",
    city: "New York",
    price: 18_900_000,
    beds: 4,
    baths: 5,
    sqft: 5200,
    description: "Breathtaking 360-degree views of Central Park and the Manhattan skyline from this ultra-luxurious penthouse. Managed by the city's premier estate experts.",
  },
  {
    id: "4",
    title: "The TriBeCa Loft",
    type: "Apartment",
    location: "TriBeCa",
    city: "New York",
    price: 7_250_000,
    beds: 3,
    baths: 3,
    sqft: 3400,
    description: "A classic industrial loft reimagined for modern luxury, featuring original brickwork and state-of-the-art automation.",
  },
  {
    id: "5",
    title: "Greenwich Townhouse",
    type: "Mansion",
    location: "West Village",
    city: "New York",
    price: 24_500_000,
    beds: 6,
    baths: 7,
    sqft: 8400,
    description: "An impeccably restored 25-foot wide Greek Revival townhouse featuring a private elevator and a rooftop garden with an outdoor kitchen.",
  },
  {
    id: "6",
    title: "Park Avenue Estate",
    type: "Penthouse",
    location: "Upper East Side",
    city: "New York",
    price: 32_000_000,
    beds: 5,
    baths: 6.5,
    sqft: 7200,
    description: "A white-glove Park Avenue duplex with grand proportions, offering a gallery, formal dining room, and staff quarters.",
  },
  {
    id: "1",
    title: "The Azure Vista",
    type: "Villa",
    location: "Malibu",
    city: "Malibu",
    price: 12_500_000,
    beds: 5,
    baths: 6,
    sqft: 6200,
    description: "A masterpiece of contemporary architecture with panoramic ocean views and seamless indoor-outdoor living.",
  },
  {
    id: "3",
    title: "Emerald Estate",
    type: "Mansion",
    location: "Greenwich, Connecticut",
    city: "Greenwich",
    price: 15_750_000,
    beds: 8,
    baths: 10,
    sqft: 12500,
    description: "Classic Georgian architecture meets modern luxury on 10 acres of pristine manicured grounds.",
  },
];

export const ESTATE_ROOMS = [
  { property: "Skyline Penthouse", name: "Grand Salon", size_sqft: 1400, description: "Double-height ceilings with floor-to-ceiling windows overlooking the reservoir.", features: ["Smart Lighting", "Automated Blinds", "Custom Millwork"] },
  { property: "Skyline Penthouse", name: "Private Library", size_sqft: 400, description: "Quiet wood-paneled office space with bespoke shelving.", features: ["Built-in Humidor", "Park Views"] },
  { property: "The TriBeCa Loft", name: "Open Concept Kitchen", size_sqft: 600, description: "A professional-grade kitchen with Gaggenau appliances.", features: ["Waterfall Island", "Walk-in Pantry"] },
  { property: "Greenwich Townhouse", name: "Owner's Suite", size_sqft: 1200, description: "Occupies the entire third floor with a private wet bar.", features: ["Steam Shower", "Custom Dressing Room"] },
  { property: "Park Avenue Estate", name: "Formal Gallery", size_sqft: 400, description: "Marble-clad entry gallery perfect for art collectors.", features: ["Coved Ceilings", "Recessed Lighting"] },
  { property: "The Azure Vista", name: "Master Suite", size_sqft: 800, description: "Featuring a private terrace and spa-like bathroom.", features: ["Ocean View", "Walk-in Closet", "Fireplace"] },
  { property: "The Azure Vista", name: "Gourmet Kitchen", size_sqft: 450, description: "State-of-the-art appliances with a massive marble island.", features: ["Sub-Zero Fridge", "Wine Cellar"] },
  { property: "Emerald Estate", name: "Grand Ballroom", size_sqft: 2000, description: "Perfect for high-profile entertaining and galas.", features: ["Crystal Chandeliers", "Oak Floors"] },
];

/** The application injects the real handoff transport; credentials never enter AgentDefinition. */
export const sendEstateLead: ToolDefinition = {
  name: "send_to_team",
  label: "send your details to the EstatePro team",
  description:
    "Send a visitor's details to a human EstatePro representative. Requires a name and phone number. " +
    "Request this only when the visitor wants human follow-up.",
  effect: "external_side_effect",
  confirmation: "required",
  idempotency: "once_per_session",
  argumentPolicies: {
    contact_name: { kind: "authoritative_value", sources: ["memory.contact_name"] },
    phone: { kind: "authoritative_value", sources: ["memory.phone"] },
    email: { kind: "authoritative_value", sources: ["memory.email"] },
    contact_preference: { kind: "authoritative_value", sources: ["memory.contact_preference"] },
    best_contact_time: { kind: "authoritative_value", sources: ["memory.best_contact_time"] },
    summary: { kind: "model_composed" },
  },
  input: {
    kind: "object",
    fields: {
      contact_name: { required: true, description: "The visitor's name as supplied by the visitor.", schema: { kind: "string", minLength: 2 } },
      phone: { required: true, description: "The visitor's phone number as supplied by the visitor.", schema: { kind: "string", minLength: 5 } },
      email: { required: false, description: "Omit when the visitor did not provide or declined email.", schema: { kind: "string" } },
      contact_preference: { required: false, description: "The visitor's requested contact channel.", schema: { kind: "enum", choices: ["call", "text", "email"] } },
      best_contact_time: { required: false, description: "The visitor's stated preferred contact time.", schema: { kind: "string" } },
      summary: { required: false, description: "A concise summary using the visitor's current criteria.", schema: { kind: "string", maxLength: 400 } },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

export const ESTATE_SERVICE_POLICY = `
EstatePro markets exactly six properties. The neighbourhood counts displayed elsewhere on the website are marketing figures, not listing inventory. The record set is the source of truth.

Every recorded price is a sale price. There is no rental pricing or rental availability data, so the concierge cannot quote monthly rent or claim that a property is available to rent.

There is no live listing-status or calendar feed. The concierge cannot say that a property is currently available for viewing, under offer, or in contract.

The concierge cannot itself book a viewing, run a valuation, check a calendar, send a text message, place a phone call, write to a CRM, or save a database record. A human representative handles those activities.

For sellers, the next step is a valuation conversation with a specialist. Sellers should not be routed into choosing a purchase listing.

The only external action declared by this agent is sending the visitor's supplied details to a human representative. The runtime requires confirmation of one exact frozen payload before an injected executor may perform that action.
`.trim();

export const estateAgent: AgentDefinition = defineAgent({
  id: "p02-estatepro",
  name: "EstatePro Concierge",
  description: "A luxury property concierge rebuilt from the P02 product requirements using Agent_SDK.",
  goal:
    "Help visitors buy, rent, sell, or learn about EstatePro's six recorded properties, and connect them with a human " +
    "representative when requested without inventing listings, availability, services, or action outcomes.",
  model: {
    providerId: "gemini",
    model: "gemini-3.5-flash-lite",
    temperature: 0.3,
    maxOutputTokens: 1024,
  },
  globalRules: [
    "Use a warm, concise, natural tone and avoid exposing internal state or reasoning.",
    "Never invent a property, price, address, room, or availability status; the Agent_SDK record sets are authoritative.",
    "For every constraint on price, bedrooms, location, or named rooms, use the relevant deterministic record-query capability rather than comparing records yourself.",
    "If no property satisfies the visitor's constraints, say so plainly and do not present a near miss as a match.",
    "There is no rental data; never quote a monthly rent or rental availability.",
    "Never claim a booking, appointment, viewing, valuation, text, call, CRM write, or database save occurred because this agent has no such capability.",
    "Never claim a handoff succeeded unless the authoritative ToolResult says it succeeded.",
    "A seller should be routed toward a valuation specialist, not toward choosing a purchase listing.",
    "Treat email as optional and do not repeatedly request it after the visitor declines.",
  ],
  memorySchema: {
    fields: [
      { key: "intent", schema: { kind: "enum", choices: ["buy", "rent", "sell"] }, description: "The visitor's current real-estate intent." },
      { key: "target_location", schema: { kind: "string" }, description: "The visitor's current preferred location." },
      { key: "budget", schema: { kind: "number", min: 0, max: 500_000_000 }, description: "The visitor's current budget in US dollars." },
      { key: "bedrooms_needed", schema: { kind: "number", min: 0, max: 20, integer: true }, description: "Required bedroom count." },
      { key: "timeline", schema: { kind: "string" }, description: "The visitor's move, sale, or decision timeline." },
      { key: "financing", schema: { kind: "enum", choices: ["cash", "mortgage", "undecided"] }, description: "Current buyer financing plan." },
      { key: "selected_property", schema: { kind: "string" }, description: "A property the visitor explicitly selected or asked about." },
      { key: "listing_preference", schema: { kind: "string" }, description: "Features or property style the visitor prefers." },
      { key: "contact_name", schema: { kind: "string" }, description: "The visitor's name, only when supplied by the visitor." },
      { key: "phone", schema: { kind: "string" }, description: "The visitor's phone number, only when supplied by the visitor." },
      { key: "email", schema: { kind: "string" }, description: "Optional; leave unset after refusal." },
      { key: "contact_preference", schema: { kind: "enum", choices: ["call", "text", "email"] }, description: "Requested follow-up channel." },
      { key: "best_contact_time", schema: { kind: "string" }, description: "Requested follow-up time." },
      { key: "seller_zip", schema: { kind: "string" }, description: "ZIP code of the property the visitor wants to sell." },
    ],
  },
  hostContextSchema: {
    fields: [
      { key: "viewing_property", schema: { kind: "string" }, lifecycle: "turn", visibility: "model", trust: "trusted_host", description: "The property detail page currently visible to the visitor." },
      { key: "locale", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "trusted_host" },
      { key: "handoff_transport_token", schema: { kind: "string" }, lifecycle: "fixed", visibility: "tools_only", trust: "trusted_host", description: "Runtime credential available only to the injected handoff executor." },
      { key: "lead_score_band", schema: { kind: "string" }, lifecycle: "session", visibility: "runtime_only", trust: "trusted_host", description: "Internal routing metadata that must never enter model context." },
    ],
  },
  knowledge: [
    {
      source: {
        id: "listings",
        kind: "record_set",
        title: "EstatePro properties",
        description: "The six exact sale properties with location, price, bedrooms, bathrooms, size, and description.",
        displayField: "title",
        searchFields: ["title", "type", "location", "city", "description"],
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
        records: ESTATE_PROPERTIES,
      },
    },
    {
      source: {
        id: "rooms",
        kind: "record_set",
        title: "EstatePro property rooms",
        description: "Named rooms, room sizes, descriptions, and features tied to exact recorded properties.",
        displayField: "name",
        searchFields: ["property", "name", "description"],
        fields: {
          property: { kind: "string" },
          name: { kind: "string" },
          size_sqft: { kind: "number" },
          description: { kind: "string" },
          features: { kind: "string_array", maxItems: 10 },
        },
        records: ESTATE_ROOMS,
      },
    },
    {
      source: {
        id: "service_policy",
        kind: "document",
        title: "EstatePro concierge service policy",
        description: "Rental-data, live-status, seller-routing, external-action, and handoff limits.",
        text: ESTATE_SERVICE_POLICY,
      },
      topK: 3,
    },
  ],
  tools: [{ definition: sendEstateLead, phaseIds: ["qualify", "selling", "handoff"] }],
  flow: {
    initialPhaseId: "qualify",
    phases: [
      {
        id: "qualify",
        objective: "Understand the visitor's current intent and answer from exact property records and service policy.",
        instructions: "Ask only for the next useful missing detail; do not force the visitor through a rigid slot order.",
        transitions: [
          { to: "selling", on: "pre_response", label: "visitor wants to sell", when: { kind: "memory_equals", field: "intent", value: "sell" } },
          {
            to: "handoff",
            on: "pre_response",
            label: "minimum handoff details are present",
            when: { kind: "all", of: [{ kind: "memory_present", field: "contact_name" }, { kind: "memory_present", field: "phone" }] },
          },
        ],
      },
      {
        id: "selling",
        objective: "Route the seller to a human valuation specialist without presenting purchase listings.",
        instructions: "Collect the property's ZIP code and offer specialist follow-up. Do not ask buyer financing questions.",
        transitions: [
          {
            to: "handoff",
            on: "pre_response",
            label: "seller supplied minimum handoff details",
            when: { kind: "all", of: [{ kind: "memory_present", field: "contact_name" }, { kind: "memory_present", field: "phone" }] },
          },
          { to: "qualify", on: "pre_response", label: "visitor changed to buying", when: { kind: "memory_equals", field: "intent", value: "buy" } },
          { to: "qualify", on: "pre_response", label: "visitor changed to renting", when: { kind: "memory_equals", field: "intent", value: "rent" } },
        ],
      },
      {
        id: "handoff",
        objective: "Restate the exact details, obtain confirmation, and request the single declared handoff action.",
        instructions: "Do not imply the handoff occurred before a successful ToolResult.",
        transitions: [
          { to: "complete", on: "action_result", label: "handoff succeeded", when: { kind: "tool_succeeded", tool: "send_to_team" } },
          { to: "qualify", on: "action_result", label: "handoff failed", when: { kind: "tool_failed", tool: "send_to_team" } },
        ],
      },
      {
        id: "complete",
        objective: "The handoff has completed; answer remaining questions without dispatching a duplicate.",
        terminal: true,
        transitions: [],
      },
    ],
  },
  policies: {
    maxSteps: 6,
    maxToolCallsPerTurn: 3,
    transcriptWindow: 12,
    workingNoteTtlMs: 30 * 60 * 1000,
    maxAgentIterations: 8,
  },
});
