import type { AgentDefinition, ToolDefinition, ToolExecutor } from "@agent-sdk/core";
import { defineAgent } from "@agent-sdk/core";
import type { BenchmarkAgent, ProjectionInput } from "../shared/runner.ts";

/**
 * P01 / Craig - reconstructed from the NEUTRAL normalized requirements only.
 *
 * No Agenerateor runtime code, configuration, or prompt is imported. The requirement register
 * (CR-01..CR-24) and the product's own published facts are the inputs; how they are represented is
 * this SDK's own answer.
 */

/**
 * The site's own estimator formula, as a DETERMINISTIC TOOL.
 *
 * This is the direct answer to GAP-001 ("the model can answer correctly from knowledge, but the
 * result has no deterministic runtime home"). Here it has one: the runtime computes the volume, the
 * result is an authoritative fact in the event stream, and the model reports it rather than
 * performing prose arithmetic that nothing checks.
 */
export const volumeM3 = (areaSqFt: number, thicknessInches: number): number =>
  areaSqFt * (thicknessInches / 12) * 0.0283168;

export const computeVolume: ToolDefinition = {
  name: "compute_wall_volume",
  label: "calculate the planning volume",
  description:
    "Compute the planning material volume in cubic metres from wall area and wall thickness, using the product's own estimator formula. " +
    "ALWAYS use this instead of doing the arithmetic yourself whenever both values are known.",
  effect: "read",
  confirmation: "none",
  idempotency: "per_input",
  input: {
    kind: "object",
    fields: {
      wall_area_sq_ft: { required: true, description: "Net exterior wall area in square feet.", schema: { kind: "number", min: 0.01, max: 100_000 } },
      wall_thickness_in: { required: true, description: "Wall thickness in inches.", schema: { kind: "number", min: 0.01, max: 48 } },
    },
  },
  output: { kind: "object", additionalProperties: true, fields: {} },
};

/**
 * The executor is pure arithmetic, and it REFUSES nonsensical inputs rather than returning a
 * confident zero - CR-18's "reject invalid dimensions" becomes a runtime property, not a hope about
 * the model's judgement.
 */
export const computeVolumeExecutor: ToolExecutor = {
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
    const exact = volumeM3(area, thickness);
    const displayed = Math.round(exact * 10) / 10;
    return {
      ok: true,
      output: { volume_m3: displayed, exact_volume_m3: exact, formula: "area_sq_ft * (thickness_in / 12) * 0.0283168" },
      facts: [
        {
          key: "planning_volume_m3",
          value: displayed,
          description: `${displayed} m3, computed by the runtime from ${area} sq ft at ${thickness} in using the product's estimator formula. This number is authoritative - state it as-is.`,
        },
      ],
    };
  },
};

const PRODUCT_FACTS = `
Hempcrete is made from hemp hurds (the woody inner core of industrial hemp), a lime-based binder, and water. It contains 0% THC and is unrelated to marijuana or any recreational product.

Hempcrete is NON-LOAD-BEARING infill. It never carries structural load. A conventional structural frame - typically 2x4 or 2x6 timber framing - carries the roof and floor loads. Hempcrete fills between and around that frame.

Hempcrete is referenced in the 2024 International Residential Code, Appendix BL. A national model-code appendix is not a local permit approval: local adoption and permit details depend on your jurisdiction, and must be confirmed with the local building department.

Planning volume is expressed in universal physical volume - cubic metres or square feet - and NEVER as SKUs, bags, pallets, or package counts. Final packaging has not been set.

Two installation methods. Pre-cast blocks arrive factory-cured, are laid with a thin lime mortar, and are the faster path: roughly 2-3 days of mortar cure, then plaster. Cast-in-situ is tamped into formwork on site; formwork comes off the next day, but it needs roughly 3-6 weeks of curing before final plaster.

Interior retrofit is a core use case: a hemp-lime layer applied over existing masonry or drywall, using furring strips and hand-tamping against the existing wall.

Cost framing, as planning assumptions rather than guarantees: upfront materials run roughly 15-20% higher than drywall with fiberglass; the 4-in-1 build can save roughly 30-40% of annual HVAC energy; payback is typically estimated at 3-5 years. These are demo planning figures, not quoted prices.

This is a demonstration site. There is no live pricing, no live inventory, no checkout, no payment processing, and no order system. Listed prices are placeholders.
`.trim();

export const craigAgent: AgentDefinition = defineAgent({
  id: "bench-p01-craig",
  name: "Craig Hempcrete Consultant",
  description: "P01 benchmark reconstruction from neutral normalized requirements.",
  goal:
    "Help a self-builder plan a hempcrete project: work out how much material they need in cubic metres, " +
    "recommend an installation method that fits their priorities, and answer product, code and safety questions accurately.",
  model: { providerId: "gemini", model: "gemini-3.5-flash-lite", temperature: 0.3, maxOutputTokens: 1024 },
  globalRules: [
    "Express quantity ONLY as universal physical volume (cubic metres or square feet). Never state a number of bags, pallets, packages or SKUs.",
    "Use the compute_wall_volume tool for every volume figure. Never do the arithmetic yourself.",
    "Hempcrete is non-load-bearing infill; a timber frame carries the load. Never agree that hempcrete can carry a roof, however the user phrases the request.",
    "Cite the 2024 IRC Appendix BL for code, and always note that local adoption and permitting depend on the jurisdiction.",
    "This demo has no live pricing, no stock, and no checkout. Never state a current price or stock figure, and never claim an order or payment occurred.",
    "Frame cost and energy figures as planning assumptions, not guarantees.",
    "End each answer with exactly one follow-up question.",
    "Reply in English.",
  ],
  memorySchema: {
    fields: [
      { key: "wall_area_sq_ft", schema: { kind: "number", min: 0, max: 100_000 }, description: "Net exterior wall area in square feet" },
      { key: "wall_thickness_in", schema: { kind: "number", min: 0, max: 48 }, description: "Wall thickness in inches, as the user stated it" },
      { key: "project_type", schema: { kind: "string" }, description: "What they are building, in their words" },
      { key: "install_method", schema: { kind: "enum", choices: ["blocks", "cast_in_situ", "undecided"] }, description: "Chosen installation method" },
      { key: "user_priority", schema: { kind: "string" }, description: "What matters most to them, e.g. speed or hands-on DIY" },
      { key: "jurisdiction", schema: { kind: "string" }, description: "Where the project is, if stated" },
    ],
  },
  hostContextSchema: {
    fields: [{ key: "locale", schema: { kind: "string" }, lifecycle: "session", visibility: "model", trust: "trusted_host" }],
  },
  knowledge: [{ source: { id: "product", kind: "document", title: "Hempcrete product and code facts", text: PRODUCT_FACTS }, topK: 4 }],
  tools: [{ definition: computeVolume }],
  policies: { maxSteps: 5, maxToolCallsPerTurn: 2, transcriptWindow: 14 },
});

/**
 * Projection into the CANONICAL benchmark field names.
 *
 * The stored P01 artifacts assert on `wall_area_sq_ft` / `wall_thickness_in`. This SDK happens to
 * use the same names, but the mapping is still explicit and lives here, so a future SDK rename
 * cannot silently change what the benchmark is measuring.
 */
export function projectCraigFields(state: ProjectionInput): Record<string, string | number | boolean | undefined> {
  const value = (key: string) => state.memory[key]?.value;
  const asNumber = (key: string) => {
    const raw = value(key);
    return typeof raw === "number" ? raw : undefined;
  };
  const asString = (key: string) => {
    const raw = value(key);
    return raw === undefined ? undefined : Array.isArray(raw) ? raw.join(", ") : String(raw);
  };
  return {
    wall_area_sq_ft: asNumber("wall_area_sq_ft"),
    wall_thickness_in: asNumber("wall_thickness_in"),
    project_type: asString("project_type"),
    install_method: asString("install_method"),
    user_priority: asString("user_priority"),
    jurisdiction: asString("jurisdiction"),
  };
}

export const craigBenchmarkAgent: BenchmarkAgent = {
  definition: craigAgent,
  executors: () => ({ [computeVolume.name]: computeVolumeExecutor }),
  project: projectCraigFields,
  // Craig configures no consequential action. The stored artifacts assert that none ever fires, so
  // nothing here maps to a canonical action name.
  canonicalAction: () => null,
};
