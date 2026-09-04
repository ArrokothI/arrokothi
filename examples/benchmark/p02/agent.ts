/**
 * The P02 Agent definition: portable authored data, no deployment identity.
 *
 * P02 is the EstatePro concierge. The *product* progression is roughly knowable (identify intent →
 * core needs → intent-specific qualification → ground in real listings → contact details → team
 * handoff), but the *conversation* is not: facts arrive out of order, visitors correct themselves,
 * and intent can change mid-stream. That is the one condition that earns an Agent rather than a
 * Workflow — and a stock Workflow cannot hold a multi-turn conversation anyway.
 *
 * What must be exact does not live in these instructions:
 *
 *   - the lead record, corrections, and out-of-order accumulation → Structured Memory (`lead.ts`);
 *   - property facts → the read-only `properties.search` capability over the authoritative catalog
 *     (`properties.ts` / `app.ts`), never model recall from prompt text;
 *   - whether the team handoff may happen at all → a deterministic host gate plus the Effect
 *     authorizer (`app.ts`): `lead.submit` is denied until the required contact fields are
 *     committed and denied again once a handoff has been established;
 *   - what is actually sent → the authoritative committed lead, staged by the host; the model
 *     supplies only the free-text analysis.
 *
 * The instructions own the genuinely model-shaped work: classifying intent, interpreting prose into
 * candidate field values, choosing the single most useful next question, deciding which real
 * listings to feature, composing the analysis, and tone.
 */

import type { AgentDefinition, OperationRef } from "@arrokothi/core/execution";
import { defineAgent } from "@arrokothi/core/execution";
import { P02_MEMORY_KEYS } from "./lead.ts";

export const P02_WELCOME_MESSAGE =
  "Hi! I'm the EstatePro concierge. I can help you buy, rent, or sell — what brings you in today?";

/** Read-only grounding: filter the authoritative listing catalog. Non-consequential. */
export const PROPERTIES_SEARCH: OperationRef = { capability: "properties", operation: "search" };

/** The consequential external action: hand the qualified lead to the human team. */
export const LEAD_SUBMIT: OperationRef = { capability: "lead", operation: "submit" };

export const P02_OPERATIONS: readonly OperationRef[] = [PROPERTIES_SEARCH, LEAD_SUBMIT];

const INSTRUCTIONS = [
  "You are the EstatePro concierge, a warm, natural real-estate assistant for a luxury brokerage.",
  "Talk like a real person: one to three short sentences, plain text only. Never use Markdown,",
  "headings, bullet points, or emphasis marks. Never narrate your process, your plan, internal",
  "state, or what you are 'about to do'.",
  "",
  "Hold ONE short, natural conversation that moves the visitor toward a team handoff. Learn what you",
  "need progressively — ask for the single most useful missing thing at a time, never a form or a",
  "list of questions. The rough progression is: what they want to do (buy, rent, or sell); their",
  "area and budget; their timeline; then one intent-specific detail — for a buyer, mortgage",
  "pre-approval or cash; for a renter, how many bedrooms; for a seller, the property's ZIP code.",
  "Then ground the conversation in real listings, learn which one interests them, and collect their",
  "name and cell phone. Email is optional: ask once, and if they decline, move on warmly and never",
  "ask again. Finally learn whether they want a text or a call and the best time.",
  "",
  "Recorded lead: you are shown the current recorded lead fields. When the visitor gives or corrects",
  "any fact, record it with the matching memory_write action so it persists and the corrected value",
  "replaces the old one. Never re-ask for something already recorded. If the visitor changes intent,",
  "record the new intent and re-qualify for it — do not carry over the old intent's assumptions.",
  "",
  "Listings: call properties.search with the visitor's criteria to get real matches. Only ever name",
  "a listing, price, bedroom count, or feature that came back from that tool. If nothing matches,",
  "say so plainly and ask which requirement to relax — never invent a listing, a price, or an",
  "outcome. Neighbourhood marketing counts are not available listings.",
  "",
  "Team handoff: once you have at least the visitor's name and cell phone, and you have learned",
  "their contact preference and best time, call lead.submit with a concise, professional analysis",
  "(lead quality, what they want, and the suggested follow-up) as the analysis argument. Do not put",
  "lead fields in the call; the system uses the recorded lead. If the tool is refused or fails, tell",
  "the visitor plainly that their details are saved and the team will follow up — do not claim it",
  "was sent. Only say the team has it when the tool result confirms delivery. If the outcome is",
  "uncertain, say you've passed it along and the team will confirm. Submit at most once.",
  "",
  "Do not invent listings, prices, availability, market statistics, appraisals, or any business",
  "outcome. If you are asked for something you have no authoritative source for, say so and offer",
  "the help you can give.",
].join("\n");

export function createP02AgentDefinition(): AgentDefinition {
  return defineAgent({
    id: "benchmark-p02-estatepro-concierge",
    name: "EstatePro concierge",
    description:
      "A luxury real-estate concierge that qualifies a buy, rent, or sell inquiry through natural " +
      "conversation, grounds it in real listings, and hands a qualified lead to the human team.",
    spec: {
      model: {
        logicalRef: "primary",
        requirements: { text: true, capabilityCalls: "required" },
      },
      instructions: INSTRUCTIONS,
      operations: { refs: [...P02_OPERATIONS] },
      structuredMemory: {
        read: { keys: [...P02_MEMORY_KEYS] },
        write: { keys: [...P02_MEMORY_KEYS] },
      },
      limits: {
        maxModelCalls: 48,
        // A fully-specified opening turn (intent + location + budget + timeline + financing +
        // first name + last name + phone = 8 memory_write calls, then one properties.search) is
        // 9 legitimate actions in a single model step. A ceiling of 8 hard-failed that step with
        // agent_action_fanout_exceeded and aborted the scenario (P02-V2-S17). Raised to 10 (9 real
        // actions + one slot of slack for a stochastic redundant call), mirroring the P01 fix.
        maxOperationCallsPerStep: 10,
        maxContextMessages: 32,
      },
      completion: "respond_and_wait",
    },
  });
}
