/**
 * The EstatePro lead: the application's authoritative, schema-bound record of what the visitor has
 * told us. It lives in Structured Memory, not in prompt prose.
 *
 *   - The model proposes writes as it interprets the conversation; every write is schema-validated
 *     and independently authorized at commit (`app.ts`). Latest committed write wins — that is how
 *     a correction supersedes a stale value and how out-of-order facts accumulate on one record,
 *     with no prompt instruction doing the work.
 *   - `intent` is an enum, so "buy" / "rent" / "sell" is a validated value, not free text. When the
 *     visitor changes intent the model overwrites it; the now-irrelevant qualification fields
 *     (financing / bedrooms / zipCode) are simply not read for the new intent, so a stale buyer
 *     assumption cannot drive a seller handoff.
 *   - The handoff-eligibility gate below is deterministic host code over the committed record. The
 *     required contact fields are `firstName` and `phone` — matching the historical server, which
 *     rejected a submission missing either. `email` is optional and never gates anything.
 */

import type { StructuredMemoryBinding, StructuredMemoryView } from "@arrokothi/core/execution";

export const P02_MEMORY: StructuredMemoryBinding = {
  fields: [
    {
      key: "intent",
      description:
        'What the visitor wants to do, as one word: "buy", "rent", or "sell". Overwrite it if they change their mind.',
      schema: { kind: "enum", choices: ["buy", "rent", "sell"] },
    },
    {
      key: "location",
      description: "Target area / neighbourhood in the visitor's own words. Overwrite on correction.",
      schema: { kind: "string", minLength: 1, maxLength: 120 },
    },
    {
      key: "budget",
      description:
        "Approximate budget or price expectation in the visitor's own words (e.g. \"up to $20M\", \"around 8 million\").",
      schema: { kind: "string", minLength: 1, maxLength: 120 },
    },
    {
      key: "timeline",
      description: 'When the visitor wants to act (e.g. "next month", "6-12 months", "just browsing").',
      schema: { kind: "string", minLength: 1, maxLength: 120 },
    },
    {
      key: "financing",
      description:
        'Buyers only: mortgage pre-approval status or cash (e.g. "pre-approved", "paying cash"). Ignore for renters and sellers.',
      schema: { kind: "string", minLength: 1, maxLength: 120 },
    },
    {
      key: "bedrooms",
      description: "Renters only: how many bedrooms they need. Ignore for buyers and sellers.",
      schema: { kind: "string", minLength: 1, maxLength: 60 },
    },
    {
      key: "zipCode",
      description: "Sellers only: the ZIP code of the property they want to sell. Ignore for buyers and renters.",
      schema: { kind: "string", minLength: 1, maxLength: 20 },
    },
    {
      key: "selectedProperty",
      description:
        "The listing the visitor said they were most interested in, by its exact catalog title. Only set it from a real search result.",
      schema: { kind: "string", minLength: 1, maxLength: 120 },
    },
    {
      key: "firstName",
      description: "The lead's first name. Required before the team handoff.",
      schema: { kind: "string", minLength: 1, maxLength: 80 },
    },
    {
      key: "lastName",
      description: "The lead's last name, when they give it.",
      schema: { kind: "string", minLength: 1, maxLength: 80 },
    },
    {
      key: "phone",
      description: "The lead's cell phone number, digits and separators as they wrote it. Required before the team handoff.",
      schema: { kind: "string", minLength: 5, maxLength: 40 },
    },
    {
      key: "email",
      description:
        "The lead's email address. OPTIONAL. If the visitor declines, never write it and never ask again.",
      schema: { kind: "string", minLength: 3, maxLength: 160 },
    },
    {
      key: "contactPreference",
      description: 'How the lead wants the agent to reach them: "text" or "call".',
      schema: { kind: "enum", choices: ["text", "call"] },
    },
    {
      key: "bestTime",
      description: 'When the lead wants to be contacted, in their own words (e.g. "tomorrow morning", "weekday evenings").',
      schema: { kind: "string", minLength: 1, maxLength: 120 },
    },
  ],
};

export const P02_MEMORY_KEYS: readonly string[] = P02_MEMORY.fields.map((field) => field.key);

/** The contact fields the historical server treated as mandatory for a submission. */
export const REQUIRED_CONTACT_KEYS = ["firstName", "phone"] as const;

export type LeadRecord = Record<string, string>;

/** Committed Structured Memory → a plain string record. Only committed values, never model prose. */
export function leadFromMemory(view: StructuredMemoryView | undefined): LeadRecord {
  const out: LeadRecord = {};
  for (const [key, committed] of Object.entries(view?.values ?? {})) {
    const value = (committed as { value: unknown }).value;
    if (typeof value === "string" && value.trim()) out[key] = value;
    else if (typeof value === "number") out[key] = String(value);
  }
  return out;
}

/** Deterministic handoff gate: the required contact fields are present on the committed record. */
export function contactRequirementsMet(lead: LeadRecord): boolean {
  return REQUIRED_CONTACT_KEYS.every((key) => typeof lead[key] === "string" && lead[key]!.trim().length > 0);
}

/** The fields that are still missing before a handoff can be offered. Diagnostics / tests. */
export function missingContactFields(lead: LeadRecord): readonly string[] {
  return REQUIRED_CONTACT_KEYS.filter((key) => !lead[key] || !lead[key]!.trim());
}
