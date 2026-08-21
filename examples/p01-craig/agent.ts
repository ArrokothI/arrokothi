import type { AgentDefinition, ToolDefinition, ToolExecutor } from "@agent-sdk/core";
import { defineAgent } from "@agent-sdk/core";

/**
 * P01 / Craig Hempcrete, expressed only through Agent_SDK control-plane concepts.
 *
 * The reference project supplies requirements and published product facts. Its bespoke chat route,
 * prompt, UI state, and fallback classifier are deliberately not imported.
 */

export const wallVolumeM3 = (wallAreaSqFt: number, wallThicknessIn: number): number =>
  wallAreaSqFt * (wallThicknessIn / 12) * 0.0283168;

/** Project arithmetic belongs in a deterministic Tool rather than model prose. */
export const computeWallVolume: ToolDefinition = {
  name: "compute_wall_volume",
  label: "calculate the planning wall volume",
  description:
    "Compute hemp-lime wall volume in cubic metres from wall area and thickness. " +
    "Use this whenever both values are known; do not perform this arithmetic in model prose.",
  effect: "read",
  confirmation: "none",
  idempotency: "per_input",
  input: {
    kind: "object",
    fields: {
      wall_area_sq_ft: {
        required: true,
        description: "Net wall area in square feet.",
        schema: { kind: "number", min: 0.01, max: 100_000 },
      },
      wall_thickness_in: {
        required: true,
        description: "Hemp-lime wall thickness in inches.",
        schema: { kind: "number", min: 0.01, max: 48 },
      },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

export const computeWallVolumeExecutor: ToolExecutor = {
  async execute(args) {
    const area = Number(args["wall_area_sq_ft"]);
    const thickness = Number(args["wall_thickness_in"]);
    if (!Number.isFinite(area) || !Number.isFinite(thickness) || area <= 0 || thickness <= 0) {
      return {
        ok: false,
        error: {
          code: "invalid_dimensions",
          message: `wall area and thickness must both be positive; received area=${args["wall_area_sq_ft"]}, thickness=${args["wall_thickness_in"]}`,
        },
      };
    }

    const exact = wallVolumeM3(area, thickness);
    const displayed = Math.round(exact * 10) / 10;
    return {
      ok: true,
      output: {
        volume_m3: displayed,
        exact_volume_m3: exact,
        formula: "wall_area_sq_ft * (wall_thickness_in / 12) * 0.0283168",
      },
      facts: [
        {
          key: "planning_volume_m3",
          value: displayed,
          description: `${displayed} m3, computed by the runtime from ${area} sq ft at ${thickness} in. State this value as the planning estimate.`,
        },
      ],
    };
  },
};

export const CRAIG_PRODUCT_GUIDE = `
Hempcrete is made from hemp hurds (the woody inner core of industrial hemp), a lime-based binder, and water. As the lime carbonates, the mixture becomes a breathable mineral matrix. It contains 0% THC and is unrelated to marijuana or recreational cannabis.

Hempcrete is non-load-bearing infill. A conventional structural frame, typically 2x4 or 2x6 timber framing, carries roof, floor, wind, and seismic loads. Hempcrete fills between and around that frame.

The current reference project cites hemp-lime construction in the 2024 International Residential Code, Appendix BL. A national model-code appendix is not local permit approval. Local adoption, engineering, and permit details must be confirmed with the relevant building department and qualified professionals.

Project quantities must remain in universal physical units such as square feet and cubic metres. Product packaging, SKUs, and final pricing have not been set. The demo has no live inventory, checkout, payment, or order-management system.

Interior retrofit is a core use case. A 2.5-3 inch breathable hemp-lime layer may be installed over suitable existing walls using furring strips and lightweight hand-tamping. Existing wall material and moisture conditions affect preparation.

Pre-cast blocks arrive factory-cured and are laid with thin lime mortar. The mortar typically needs about 2-3 days before plaster sequencing. Cast-in-situ hemp-lime is tamped into temporary forms; forms may usually come off the next day, while natural curing commonly takes about 3-6 weeks before final plaster, depending on wall design and conditions.

The reference planning figures say materials may cost roughly 15-20% more upfront than drywall with fiberglass, with possible 30-40% annual HVAC savings and a 3-5 year payback. These are demo assumptions, not quotes, guarantees, or engineering results.

For a small backyard office around 180 sq ft of floor area, the reference workflow estimates roughly 400-450 sq ft of net exterior wall area and recommends 10-12 inch walls. Pre-cast blocks are the clean, fast path. Ask whether insulation or preserving interior floor area matters more.

For a cold, damp bedroom with around 300 sq ft of wall area, the reference workflow recommends a 2.5-3 inch interior retrofit layer with furring strips and hand-tamping. Ask whether the existing wall is drywall, brick, concrete, or another material.
`.trim();

export const craigAgent: AgentDefinition = defineAgent({
  id: "p01-craig-hempcrete",
  name: "Craig Hempcrete Project Guide",
  description: "A consultative hemp-lime project guide rebuilt from the P01 product requirements using Agent_SDK.",
  goal:
    "Help U.S. homeowners, DIY builders, and small builders scope hemp-lime projects, calculate planning wall volume, " +
    "choose an installation approach, and understand product, code, safety, cost, and curing constraints.",
  model: {
    providerId: "gemini",
    model: "gemini-3.5-flash-lite",
    temperature: 0.3,
    maxOutputTokens: 1024,
  },
  globalRules: [
    "Reply in English with a warm, practical, educational tone.",
    "Express quantities only as universal physical units such as square feet and cubic metres; never answer in bags, pallets, packages, or SKUs.",
    "Use compute_wall_volume for every volume derived from wall area and thickness; never do the arithmetic yourself.",
    "Hempcrete is non-load-bearing infill and must never be represented as carrying a roof or another structural load.",
    "For code questions, cite 2024 IRC Appendix BL and explain that local adoption, engineering, and permitting still depend on the jurisdiction.",
    "Never state live pricing, stock, availability, checkout, payment, or order status because the reference product has none of those systems.",
    "Treat cost, carbon, energy, and schedule figures as planning assumptions rather than guarantees.",
    "End every user-facing answer with exactly one useful follow-up question.",
  ],
  memorySchema: {
    fields: [
      {
        key: "project_floor_area_sq_ft",
        schema: { kind: "number", min: 0.01, max: 100_000 },
        description: "Project floor area when the visitor supplies it; do not confuse it with wall area.",
      },
      {
        key: "wall_area_sq_ft",
        schema: { kind: "number", min: 0.01, max: 100_000 },
        description: "Net wall area in square feet.",
      },
      {
        key: "wall_thickness_in",
        schema: { kind: "number", min: 0.01, max: 48 },
        description: "Wall thickness in inches as stated or selected by the visitor.",
      },
      { key: "project_type", schema: { kind: "string" }, description: "What the visitor is building or renovating." },
      {
        key: "install_method",
        schema: { kind: "enum", choices: ["interior_retrofit", "precast_blocks", "cast_in_situ", "undecided"] },
        description: "The active installation approach.",
      },
      { key: "existing_wall_type", schema: { kind: "string" }, description: "Existing wall material for a retrofit." },
      { key: "user_priority", schema: { kind: "string" }, description: "The visitor's active priority, such as speed, insulation, floor space, or hands-on DIY." },
      { key: "jurisdiction", schema: { kind: "string" }, description: "Project location when supplied for code guidance." },
    ],
  },
  hostContextSchema: {
    fields: [
      { key: "locale", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "trusted_host" },
      {
        key: "current_site_section",
        schema: { kind: "string" },
        lifecycle: "turn",
        visibility: "model",
        trust: "trusted_host",
        description: "The section of the Craig site currently visible to the visitor.",
      },
    ],
  },
  knowledge: [
    {
      source: {
        id: "craig_product_guide",
        kind: "document",
        title: "Craig Hempcrete product and project guide",
        description: "Product composition, application methods, safety, code, business limits, cost assumptions, and reference workflows.",
        text: CRAIG_PRODUCT_GUIDE,
      },
      topK: 4,
    },
  ],
  tools: [{ definition: computeWallVolume }],
  policies: {
    maxSteps: 5,
    maxToolCallsPerTurn: 2,
    transcriptWindow: 14,
    maxAgentIterations: 6,
  },
});
