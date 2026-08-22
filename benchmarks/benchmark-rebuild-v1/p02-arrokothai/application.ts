import type { AgentDefinition, ModelPolicy, ToolDefinition, ToolExecutor } from "@agent-sdk/core";
import { defineAgent } from "@agent-sdk/core";
import { ESTATE_PROPERTIES, ESTATE_ROOMS } from "./records.ts";

export const sendLeadToTeam: ToolDefinition = {
  name: "send_lead_to_team",
  label: "send the confirmed lead details to the EstatePro team",
  description: "Transmit the visitor's confirmed contact details and current real-estate criteria to a human EstatePro representative.",
  effect: "external_side_effect",
  confirmation: "required",
  idempotency: "once_per_session",
  argumentPolicies: {
    contact_name: { kind: "authoritative_value", sources: ["memory.contact_name"] },
    phone: { kind: "authoritative_value", sources: ["memory.phone"] },
    email: { kind: "authoritative_value", sources: ["memory.email"] },
    contact_preference: { kind: "authoritative_value", sources: ["memory.contact_preference"] },
    best_contact_time: { kind: "authoritative_value", sources: ["memory.best_contact_time"] },
    intent: { kind: "authoritative_value", sources: ["memory.intent"] },
    target_location: { kind: "authoritative_value", sources: ["memory.target_location"] },
    budget: { kind: "authoritative_value", sources: ["memory.budget"] },
    selected_property: { kind: "authoritative_value", sources: ["memory.selected_property"] },
    seller_zip: { kind: "authoritative_value", sources: ["memory.seller_zip"] },
  },
  input: {
    kind: "object",
    fields: {
      contact_name: { required: true, description: "Visitor-supplied contact name.", schema: { kind: "string", minLength: 2 } },
      phone: { required: true, description: "Visitor-supplied phone number.", schema: { kind: "string", minLength: 5 } },
      email: { required: false, description: "Optional visitor-supplied email; omit after refusal.", schema: { kind: "string" } },
      contact_preference: { required: false, description: "Visitor's requested follow-up channel.", schema: { kind: "enum", choices: ["call", "text", "email"] } },
      best_contact_time: { required: false, description: "Visitor's requested follow-up time.", schema: { kind: "string" } },
      intent: { required: false, description: "Current buy, rent, or sell intent.", schema: { kind: "enum", choices: ["buy", "rent", "sell"] } },
      target_location: { required: false, description: "Current target location.", schema: { kind: "string" } },
      budget: { required: false, description: "Current budget in US dollars.", schema: { kind: "number", min: 0 } },
      selected_property: { required: false, description: "Exact recorded property selected by the visitor.", schema: { kind: "string" } },
      seller_zip: { required: false, description: "ZIP code for a seller's property.", schema: { kind: "string" } },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

export function createHandoffExecutor(
  outcome: "success" | "failure" | "unknown" = "success",
): { executor: ToolExecutor; calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    executor: {
      async execute(args, context) {
        calls.push(structuredClone(args));
        if (outcome === "failure") {
          return { ok: false, error: { code: "handoff_rejected", message: "The configured transport rejected the handoff." }, retryable: true };
        }
        if (outcome === "unknown") {
          return { ok: false, outcome: "outcome_unknown", error: { code: "handoff_outcome_unknown", message: "The transport outcome could not be established." }, retryable: false };
        }
        return {
          ok: true,
          output: { delivered: true, transport: "dry_run", reference: `p02-${calls.length}`, idempotency_key: context.idempotencyKey },
          facts: [{ key: "handoff_transmitted", value: true, description: "The configured dry-run transport accepted the confirmed payload." }],
        };
      },
    },
  };
}

export const ESTATE_SERVICE_POLICY = `
EstatePro is a boutique luxury real-estate firm founded in Manhattan by Marcus Sterling. The site reports more than $4.2B in total sales volume and 98% client retention. Its public office contact is +1 (212) 555-0198 and its Global HQ is 750 5th Avenue, New York, NY.

The concrete property record set contains exactly six showcased sale properties. Neighborhood-card counts—TriBeCa 12, Upper East Side 8, Chelsea 15, and West Village 6—are marketing display figures, not additional property records.

The records contain sale prices only. There is no rental pricing or rental-availability data. There is no live MLS, current listing status, viewing calendar, automated valuation, booking, payment, CRM, text-message, or phone-call backend.

For a buyer, use exact record queries for budget, location, bedroom, property, and room constraints. A zero-row result means no recorded match; do not invent or alter a property to fill the gap.

For a renter, retain the criteria and explain the missing rental data. For a seller, collect the property's ZIP code and route toward a human valuation conversation rather than a purchase listing.

Email is optional. Human follow-up requires a name and phone number. The only consequential capability is transmission of the exact confirmed lead payload to a human representative; its ToolResult is the authority on success, failure, or unknown outcome.
`.trim();

export function createEstateAgent(model: ModelPolicy): AgentDefinition {
  return defineAgent({
    id: "benchmark-rebuild-v1-p02-arrokothai",
    name: "EstatePro Concierge",
    description: "A luxury real-estate concierge grounded in EstatePro's showcased records and service boundaries.",
    goal: "Help visitors with buy, rent, sell, and exact-property questions, then connect willing visitors to a human representative without inventing records or action outcomes.",
    model,
    planning: { mode: "llm", extractWorkingNotes: false },
    execution: { harness: "agentic", executionContextPolicy: "fresh_each_turn" },
    globalRules: [
      "Use a warm, concise, professional tone and answer the user's immediate question before asking for the next useful detail.",
      "Use deterministic record-query capabilities for property, price, location, bedroom, and room constraints; treat the returned rows and counts as authoritative.",
      "When no record matches, say so plainly and offer human follow-up without creating a near match.",
      "Treat the service-policy Knowledge and consequential ToolResult as authoritative for unavailable live data and external outcomes.",
      "For human follow-up, require a contact name and phone, omit a declined optional email, and request the handoff tool with the exact current structured facts so the runtime can present and freeze that payload for confirmation.",
      "Do not repeat an optional email request after the visitor declines it.",
    ],
    memorySchema: {
      fields: [
        { key: "intent", schema: { kind: "enum", choices: ["buy", "rent", "sell"] }, description: "Visitor's current real-estate intent." },
        { key: "target_location", schema: { kind: "string" }, description: "Current preferred location." },
        { key: "budget", schema: { kind: "number", min: 0, max: 500_000_000 }, description: "Maximum budget in US dollars." },
        { key: "bedrooms_needed", schema: { kind: "number", min: 0, max: 20, integer: true }, description: "Minimum bedroom requirement." },
        { key: "timeline", schema: { kind: "string" }, description: "Move, purchase, sale, or decision timeline." },
        { key: "financing", schema: { kind: "enum", choices: ["cash", "mortgage", "undecided"] }, description: "Buyer's current financing plan." },
        { key: "selected_property", schema: { kind: "string" }, description: "Exact recorded property selected or asked about." },
        { key: "listing_preference", schema: { kind: "string" }, description: "Desired property style or feature." },
        { key: "seller_zip", schema: { kind: "string" }, description: "ZIP code of the property to sell or value." },
        { key: "contact_name", schema: { kind: "string" }, description: "Visitor-supplied contact name." },
        { key: "phone", schema: { kind: "string" }, description: "Visitor-supplied contact phone." },
        { key: "email", schema: { kind: "string" }, description: "Optional visitor-supplied email." },
        { key: "contact_preference", schema: { kind: "enum", choices: ["call", "text", "email"] }, description: "Requested follow-up channel." },
        { key: "best_contact_time", schema: { kind: "string" }, description: "Requested follow-up time." },
      ],
    },
    hostContextSchema: { fields: [] },
    knowledge: [
      {
        source: {
          id: "estate_properties",
          kind: "record_set",
          title: "EstatePro showcased sale properties",
          description: "Six exact property records with snapshot sale price, location, bedrooms, bathrooms, size, images, and description.",
          displayField: "title",
          searchFields: ["title", "type", "location", "description"],
          fields: {
            id: { schema: { kind: "string" }, description: "Stable property identifier." },
            title: { schema: { kind: "string" }, description: "Published property title." },
            type: { schema: { kind: "string" }, description: "Published property type." },
            location: { schema: { kind: "string" }, description: "Published neighborhood and region." },
            price: { schema: { kind: "number" }, description: "Snapshot sale price in US dollars; not a live quote or rent." },
            beds: { schema: { kind: "number" }, description: "Recorded bedroom count." },
            baths: { schema: { kind: "number" }, description: "Recorded bathroom count." },
            sqft: { schema: { kind: "number" }, description: "Recorded interior size in square feet." },
            main_image: { schema: { kind: "string" }, description: "Published primary image URL." },
            images: { schema: { kind: "string_array", maxItems: 10 }, description: "Published additional image URLs." },
            description: { schema: { kind: "string" }, description: "Published property description." },
          },
          records: ESTATE_PROPERTIES,
        },
      },
      {
        source: {
          id: "estate_rooms",
          kind: "record_set",
          title: "EstatePro named rooms",
          description: "Exact named rooms and features linked to the six property records.",
          displayField: "name",
          searchFields: ["property", "name", "description"],
          fields: {
            property_id: { schema: { kind: "string" }, description: "Owning property identifier." },
            property: { schema: { kind: "string" }, description: "Owning property title." },
            id: { schema: { kind: "string" }, description: "Stable room identifier." },
            name: { schema: { kind: "string" }, description: "Published room name." },
            size: { schema: { kind: "string" }, description: "Published room size text." },
            description: { schema: { kind: "string" }, description: "Published room description." },
            features: { schema: { kind: "string_array", maxItems: 10 }, description: "Published room features." },
          },
          records: ESTATE_ROOMS,
        },
      },
      {
        source: {
          id: "estate_service_policy",
          kind: "document",
          title: "EstatePro company and service policy",
          description: "Company facts, marketing-count boundary, rent/sell handling, absent live systems, and handoff semantics.",
          text: ESTATE_SERVICE_POLICY,
        },
        topK: 3,
      },
    ],
    tools: [{ definition: sendLeadToTeam }],
    policies: {
      maxSteps: 6,
      maxToolCallsPerTurn: 3,
      transcriptWindow: 12,
      maxAgentIterations: 8,
      maxKnowledgeCallsPerTurn: 8,
      maxActionRequestsPerTurn: 3,
      maxRecordRows: 6,
    },
  });
}
