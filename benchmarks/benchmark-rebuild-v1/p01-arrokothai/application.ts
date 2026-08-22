import type { AgentDefinition, ToolDefinition, ToolExecutor } from "@agent-sdk/core";
import { defineAgent } from "@agent-sdk/core";
import type { ModelPolicy } from "@agent-sdk/core";

export const wallVolumeM3 = (wallAreaSqFt: number, wallThicknessIn: number) =>
  wallAreaSqFt * (wallThicknessIn / 12) * 0.0283168;

export const computeWallVolume: ToolDefinition = {
  name: "compute_wall_volume",
  label: "compute hemp-lime wall volume",
  description: "Compute the authoritative planning volume from net wall area in square feet and wall thickness in inches.",
  effect: "read",
  confirmation: "none",
  idempotency: "per_input",
  input: {
    kind: "object",
    fields: {
      wall_area_sq_ft: {
        required: true,
        description: "Net wall surface area, excluding openings, in square feet.",
        schema: { kind: "number", min: 0.01, max: 100_000 },
      },
      wall_thickness_in: {
        required: true,
        description: "Hemp-lime layer or wall thickness in inches.",
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
        error: { code: "invalid_dimensions", message: "Wall area and thickness must both be positive numbers." },
      };
    }
    const exact = wallVolumeM3(area, thickness);
    const displayed = Math.round(exact * 10) / 10;
    return {
      ok: true,
      output: {
        volume_m3: displayed,
        exact_volume_m3: exact,
        wall_area_sq_ft: area,
        wall_thickness_in: thickness,
      },
      facts: [{
        key: "planning_wall_volume_m3",
        value: displayed,
        description: `Runtime-computed planning volume: ${displayed} m³ from ${area} sq ft at ${thickness} in.`,
      }],
    };
  },
};

export const CRAIG_MATERIAL_KNOWLEDGE = `
Hempcrete, or hemp-lime, is made from industrial hemp hurds, a lime-based binder, and water. It is 0% THC and unrelated to recreational marijuana. The reference site describes it as breathable, zero-VOC, mold-resistant, pest-resistant, fire-resistant, and insulating.

Hempcrete is non-load-bearing infill. A conventional structural frame, commonly timber framing, carries roof, floor, wind, and seismic loads.

The shipped product cites hemp-lime construction in the 2024 International Residential Code Appendix BL. That model-code reference is not proof of local adoption or permit approval; a specific project still requires local authority and qualified-professional review.

Interior retrofit uses a relatively thin breathable layer over a suitable existing assembly, commonly with furring strips and hand-tamping. Pre-cast blocks arrive cured and are laid with lime mortar; the reference planning window is about 2–3 days for mortar before plaster sequencing. Cast-in-situ material is tamped into forms; forms may come off the next day, while natural curing before final plaster is about 3–6 weeks depending on conditions.

The reference site's planning claims are about 15–20% higher upfront material cost than drywall plus fiberglass, possible 30–40% HVAC savings, and a 3–5 year payback. These are demo assumptions, not quotes or guarantees.

For the reference site's small 180 sq ft backyard-office concept, its prescribed early assumption is about 400–450 sq ft of net exterior wall area at 10–12 inches, with pre-cast blocks favored for speed. The actual wall volume must be computed from the selected wall area and thickness.

The requirements document's 300 sq ft interior-retrofit workflow says 2.5–3 m³ at 2.5–3 inches, while the shipped estimator formula yields about 1.8–2.1 m³. This is an unresolved source conflict. When exact dimensions are supplied, report the deterministic estimator result and disclose the conflict if the reference workflow is relevant.

Final SKUs, packaging, and real prices are not set. The demo has no live inventory, checkout, payment, CRM, order management, or workshop-registration backend. Quantities stay in physical units rather than bags, pallets, or packages.
`.trim();

export function createCraigAgent(model: ModelPolicy): AgentDefinition {
  return defineAgent({
    id: "benchmark-rebuild-v1-p01-arrokothai",
    name: "Craig Hempcrete Project Guide",
    description: "A conversational hemp-lime project guide for homeowners and small builders.",
    goal: "Help homeowners and small builders scope hemp-lime projects, compute planning wall volume, choose an approach, and understand authoritative material and business limits.",
    model,
    planning: { mode: "llm", extractWorkingNotes: false },
    execution: { harness: "agentic", executionContextPolicy: "fresh_each_turn" },
    globalRules: [
      "Answer the user's immediate question in warm, practical English and close with one useful follow-up question.",
      "Use the runtime computation capability whenever wall area and thickness are known; its observation is authoritative.",
      "Keep quantities in square feet and cubic metres, not unfinalized package or SKU units.",
      "Separate published material facts and planning assumptions from unavailable live, engineering, pricing, inventory, and permitting information.",
    ],
    memorySchema: {
      fields: [
        { key: "project_type", schema: { kind: "string" }, description: "The project being built or renovated." },
        { key: "project_floor_area_sq_ft", schema: { kind: "number", min: 0.01, max: 100_000 }, description: "Floor area; distinct from wall area." },
        { key: "wall_area_sq_ft", schema: { kind: "number", min: 0.01, max: 100_000 }, description: "Net wall surface area in square feet." },
        { key: "wall_thickness_in", schema: { kind: "number", min: 0.01, max: 48 }, description: "Hemp-lime wall or layer thickness in inches." },
        { key: "install_method", schema: { kind: "enum", choices: ["interior_retrofit", "precast_blocks", "cast_in_situ", "undecided"] }, description: "Current construction approach." },
        { key: "existing_wall_type", schema: { kind: "string" }, description: "Existing substrate for an interior retrofit." },
        { key: "user_priority", schema: { kind: "string" }, description: "Current priority such as speed, insulation, floor space, or hands-on work." },
        { key: "project_stage", schema: { kind: "string" }, description: "Current planning or construction stage." },
        { key: "jurisdiction", schema: { kind: "string" }, description: "Project location when supplied for local-code context." },
      ],
    },
    hostContextSchema: { fields: [] },
    knowledge: [{
      source: {
        id: "craig_product_knowledge",
        kind: "document",
        title: "Craig Hempcrete product and project facts",
        description: "Material composition, methods, code, planning claims, source conflict, and unavailable live systems.",
        text: CRAIG_MATERIAL_KNOWLEDGE,
      },
      topK: 4,
    }],
    tools: [{ definition: computeWallVolume }],
    policies: {
      maxSteps: 5,
      maxToolCallsPerTurn: 2,
      transcriptWindow: 14,
      maxAgentIterations: 6,
      maxKnowledgeCallsPerTurn: 6,
      maxActionRequestsPerTurn: 2,
    },
  });
}
