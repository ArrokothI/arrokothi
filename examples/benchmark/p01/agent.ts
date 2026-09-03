/**
 * The P01 Agent definition: portable authored data, no deployment identity.
 *
 * P01 is the Craig Hempcrete consultative assistant. The product is a multi-turn conversation whose
 * progression cannot be enumerated in advance (a homeowner may ask about cost, then drying, then
 * correct a dimension three turns later), so the conversational surface is an **Agent**, not a
 * Workflow. What must be exact does not live in this prompt:
 *
 *   - the material-volume arithmetic and the invalid-dimension rule → `volume.ts`, run only inside
 *     the `hempcrete.estimate_volume` capability executor (`app.ts`);
 *   - the current project dimensions and construction context → Structured Memory fields, so a
 *     correction is a new committed value that supersedes the stale one and out-of-order inputs
 *     accumulate on the same record;
 *   - what the Agent may do at all → the operation ceiling, the Effect authorizer, and the memory
 *     write-exposure grant in `app.ts`, all deny-by-default.
 *
 * The instructions below restate the domain rules for the model's benefit and own the genuinely
 * model-shaped work: interpreting prose into candidate numbers, classifying wall vs floor vs other,
 * choosing the single most useful follow-up question, and tone.
 */

import type { AgentDefinition, OperationRef, StructuredMemoryBinding } from "@arrokothi/core/execution";
import { defineAgent } from "@arrokothi/core/execution";
import { MAX_AREA_SQ_FT, MAX_THICKNESS_IN } from "./volume.ts";

export const P01_WELCOME_MESSAGE =
  "Hi, I'm the Craig Hempcrete project guide. Tell me what you're building and I'll help scope wall " +
  "area, layer thickness, hemp-lime material volume in cubic metres, and the best approach for your project.";

/** The single capability operation P01 exposes. Read-only, deterministic, non-consequential. */
export const ESTIMATE_VOLUME: OperationRef = { capability: "hempcrete", operation: "estimate_volume" };

/**
 * Structured Memory fields. Each is the application's current assertion about the project; the model
 * proposes writes as it learns or is corrected, and every write is schema-validated and
 * independently authorized at commit (see `app.ts`). Latest write wins — that is the supersession
 * mechanism, not a prompt instruction.
 */
export const P01_MEMORY: StructuredMemoryBinding = {
  fields: [
    {
      key: "construction_context",
      description:
        "What the hemp-lime is being applied to, as one short phrase: \"wall\" (new exterior wall " +
        "infill), \"interior wall retrofit\", \"floor\", \"roof\", or \"other\". Do not assume; write it " +
        "only once the user has made the construction type clear.",
      schema: { kind: "string", minLength: 1, maxLength: 60 },
    },
    {
      key: "wall_area_sq_ft",
      description:
        "The project area the hemp-lime covers, in square feet (primary unit). Overwrite this with " +
        "the corrected value whenever the user revises it.",
      schema: { kind: "number", min: 0, max: MAX_AREA_SQ_FT },
    },
    {
      key: "layer_thickness_in",
      description:
        "The hemp-lime layer or wall thickness, in inches. Overwrite this with the corrected value " +
        "whenever the user revises it.",
      schema: { kind: "number", min: 0, max: MAX_THICKNESS_IN },
    },
  ],
};

export const P01_MEMORY_KEYS: readonly string[] = P01_MEMORY.fields.map((field) => field.key);

const INSTRUCTIONS = [
  "You are the Craig Hempcrete AI assistant, a consultative guide for U.S. homeowners, DIY builders,",
  "and small builders considering hemp-lime (hempcrete) construction. Be warm, practical, and",
  "concise enough to stay conversational — usually two to four short paragraphs, never a form.",
  "",
  "END EVERY REPLY WITH EXACTLY ONE follow-up question — the single most useful thing to learn next.",
  "Never ask about something already recorded in project state, and never stack multiple questions.",
  "",
  "Project state: you are shown the current recorded construction context, wall area (sq ft), and",
  "layer thickness (in). When the user gives or corrects any of these, record it with the matching",
  "memory_write action so it persists and the corrected value replaces the old one. Inputs may",
  "arrive across several turns and out of order; combine them on the recorded state. Do not treat a",
  "wall project as a floor project or vice versa — if the construction type is unclear, ask.",
  "",
  "Sizing and volume: work in square feet first, with metric as a secondary figure, and express",
  "hemp-lime material volume in cubic metres. When you have BOTH a recorded wall area and layer",
  "thickness, call hempcrete.estimate_volume with those exact values to get the volume — never do",
  "the arithmetic yourself and never state a volume you did not get from that tool. If it reports a",
  "dimension problem, tell the user plainly and ask for a corrected figure. Do NOT convert results",
  "into bags, blocks, pallets, or SKU/package counts — there is no authoritative package data.",
  "",
  "Structure and code: hempcrete is non-load-bearing infill; a conventional timber (or other) frame",
  "carries the roof, floor, and structural loads. The 2024 International Residential Code covers",
  "hemp-lime construction in Appendix BL. Conversational estimates are planning guidance only — they",
  "do not replace stamped engineering, structural design, jurisdiction approval, or permit review.",
  "",
  "Do not invent live inventory, current pricing, package availability, purchasing or contractor",
  "outcomes, permit approvals, or engineering sign-off. If asked for something you have no",
  "authoritative source for, say so plainly and offer the planning help you can give.",
].join("\n");

export function createP01AgentDefinition(): AgentDefinition {
  return defineAgent({
    id: "benchmark-p01-hempcrete-assistant",
    name: "Craig Hempcrete assistant",
    description:
      "A consultative hemp-lime project guide that scopes wall area, thickness, and material volume " +
      "and explains structural and code context without overclaiming.",
    spec: {
      model: {
        logicalRef: "primary",
        requirements: { text: true, capabilityCalls: "required" },
      },
      instructions: INSTRUCTIONS,
      operations: { refs: [ESTIMATE_VOLUME] },
      structuredMemory: {
        read: { keys: [...P01_MEMORY_KEYS] },
        write: { keys: [...P01_MEMORY_KEYS] },
      },
      limits: {
        maxModelCalls: 6,
        maxOperationCallsPerStep: 3,
        maxContextMessages: 24,
      },
      completion: "respond_and_wait",
    },
  });
}
