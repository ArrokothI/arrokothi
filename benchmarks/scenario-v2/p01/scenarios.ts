import type { DeterministicAssertionSpec } from "../../evaluator-v2/schema.ts";
import type { ScenarioV2, SemanticRubricItem, SourceProvenance } from "../types.ts";

const CRAIG_SOURCE_REPOSITORY = {
  name: "Craig-Hempcrete-DemoSitee",
  commit: "0297a5cc43e4fcbc4e8edc7b4d90254cea76a893",
} as const;

const source = (paths: string[]): SourceProvenance[] =>
  paths.map((path) => ({
    repository: CRAIG_SOURCE_REPOSITORY,
    path,
  }));

const scenarioSource = source([
  "app/lib/hempcretePrompt.ts",
  "app/api/chat/route.ts",
  "app/components/HempcreteSite.tsx",
  "requirement.docx",
]);

const volumeM3 = (areaSqFt: number, thicknessInches: number) => areaSqFt * (thicknessInches / 12) * 0.0283168;

const stateEquals = (
  id: string,
  requirementId: string,
  key: string,
  expected: string | number | boolean,
): DeterministicAssertionSpec => ({
  id,
  requirementId,
  type: "state_equals",
  severity: "hard",
  description: `${key} equals ${String(expected)}`,
  key,
  expected,
});

const stateAbsent = (id: string, requirementId: string, key: string): DeterministicAssertionSpec => ({
  id,
  requirementId,
  type: "state_absent",
  severity: "hard",
  description: `${key} is not committed to canonical state`,
  key,
  onMissing: "not_applicable",
});

// EVAL-HOTFIX-2026-08-23 (evaluator-v2-hotfix.4, issue 2): `computation.wall_volume_m3` is the
// primary, authoritative source (and, per hotfix.4 issue 1, is itself resolved from the LATEST
// matching native-trace tool fact when available, not a possibly-stale
// deterministicComputations value — see resolveComputationValue()). `state.volume` is declared as
// an explicit, narrowly-scoped fallback: some implementations' neutral projection carries the
// same already-computed volume fact under a differently-named canonical state field instead of
// deterministicComputations. The fallback is consulted ONLY when the primary is unavailable, and
// this applies uniformly to every P01 volume scenario and every implementation — it is not
// scenario- or implementation-specific.
const volumeClose = (id: string, requirementId: string, area: number, thickness: number): DeterministicAssertionSpec => ({
  id,
  requirementId,
  type: "numeric_close",
  severity: "hard",
  description: `wall_volume_m3 matches shipped formula for ${area} sq ft at ${thickness} inches`,
  source: "computation",
  key: "wall_volume_m3",
  expected: volumeM3(area, thickness),
  tolerance: 0.05,
  fallback: { source: "state", key: "volume" },
  // The compute_wall_volume tool's native fact is keyed "planning_wall_volume_m3", not
  // "wall_volume_m3" — declared explicitly (see ComputationFactAliases doc in schema.ts) rather
  // than guessed at by resolveComputationValue().
  computationFactAliases: ["wall_volume_m3", "planning_wall_volume_m3"],
});

const noDispatch = (id: string, requirementId = "P01-R15"): DeterministicAssertionSpec => ({
  id,
  requirementId,
  type: "dispatch_count",
  severity: "hard",
  description: "No external checkout/order/payment dispatch occurs",
  expected: 0,
  onMissing: "not_applicable",
});

const runtimeOk: DeterministicAssertionSpec = {
  id: "runtime_error_absent",
  requirementId: "P01-R01",
  type: "runtime_error_absent",
  severity: "hard",
  description: "Run has no runtime errors",
};

const rubric = (id: string, requirementId: string, criterion: string, hardFailureWhen?: string): SemanticRubricItem => ({
  id,
  requirementId,
  criterion,
  scale: "0_1_2",
  hardFailureWhen,
});

export const P01_SCENARIOS: ScenarioV2[] = [
  {
    id: "P01-V2-S01",
    applicationId: "p01",
    title: "Backyard office with complete sizing inputs",
    purpose: "Measure front-loaded area/thickness capture, formula-backed volume, speed-oriented block recommendation, and no package/action invention.",
    requirementIds: ["P01-R01", "P01-R02", "P01-R03", "P01-R04", "P01-R07", "P01-R15", "P01-R17"],
    turns: [
      { role: "user", content: "I'm planning a backyard office. I have about 420 sq. ft. of exterior wall area, want 10-inch walls, and I care more about speed than hands-on mixing." },
    ],
    applicability: "Exact positive wall area and thickness are supplied in one turn.",
    expectedDeterministicAssertions: [
      stateEquals("area_420", "P01-R04", "wall_area_sq_ft", 420),
      stateEquals("thickness_10", "P01-R04", "wall_thickness_in", 10),
      volumeClose("volume_420x10", "P01-R03", 420, 10),
      noDispatch("no_external_dispatch"),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("speed_blocks", "P01-R07", "Ties the recommendation to pre-cast blocks or an equivalent fast path."),
      rubric("consultative_tone", "P01-R01", "Responds like a practical consultative sales advisor rather than a terse calculator."),
      rubric("no_package_count", "P01-R02", "Does not give a final pallet/bag/package count or SKU-dependent order quantity.", "Any definitive orderable package count is a hard failure."),
      rubric("followup", "P01-R17", "Ends with one useful follow-up question."),
    ],
    severity: { hard: ["P01-R02", "P01-R03", "P01-R04", "P01-R07", "P01-R15"], soft: ["P01-R01", "P01-R17"] },
    notes: ["Retains historical turn; replaces regex volume/package checks with deterministic state/computation/action plus semantic rubrics."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S02",
    applicationId: "p01",
    title: "Bedroom retrofit workflow without exact thickness",
    purpose: "Measure the source-backed canned bedroom workflow without conflating it with the exact 300 sq ft at 3 inch formula.",
    requirementIds: ["P01-R02", "P01-R04", "P01-R06", "P01-R08", "P01-R09", "P01-R15", "P01-R17"],
    turns: [
      { role: "user", content: "I just want to renovate one cold, damp bedroom, about 300 sq. ft. of wall area, to stop mold. Can I use this inside, and will it eat up my room space?" },
    ],
    applicability: "User asks the source workflow question and has not chosen an exact thickness for deterministic formula evaluation.",
    expectedDeterministicAssertions: [
      stateEquals("wall_area_300", "P01-R04", "wall_area_sq_ft", 300),
      noDispatch("no_external_dispatch"),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("interior_retrofit", "P01-R08", "Recommends interior retrofit/furring strips/lightweight hand-tamping and a thin 2.5-3 inch breathable layer."),
      rubric("workflow_volume", "P01-R08", "Uses the source workflow's roughly 2.5-3 m3 approximation if it gives a volume."),
      rubric("material_health", "P01-R09", "Grounds mold/moisture claims in breathable hemp-lime behavior without inventing unsupported guarantees."),
    ],
    severity: { hard: ["P01-R02", "P01-R08", "P01-R09"], soft: ["P01-R17"] },
    notes: ["Split from historical CRAIG-S02 to isolate the app's workflow prose from the shipped exact formula."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S03",
    applicationId: "p01",
    title: "Exact 300 sq ft by 3 inch wall volume",
    purpose: "Resolve the known source conflict by measuring exact formula behavior separately from the bedroom workflow approximation.",
    requirementIds: ["P01-R03", "P01-R04", "P01-R08"],
    turns: [
      { role: "user", content: "My bedroom has exactly 300 sq. ft. of cold exterior wall area. If I use a 3-inch interior hemp-lime layer, what wall volume does the calculator give?" },
    ],
    applicability: "Exact positive wall area and exact thickness are supplied.",
    expectedDeterministicAssertions: [
      stateEquals("area_300", "P01-R04", "wall_area_sq_ft", 300),
      stateEquals("thickness_3", "P01-R04", "wall_thickness_in", 3),
      volumeClose("volume_300x3", "P01-R03", 300, 3),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("formula_authority", "P01-R03", "Treats the calculator formula as authoritative for exact area/thickness and does not insist on the conflicting 2.5-3 m3 range."),
      rubric("retrofit_context", "P01-R08", "May still mention interior retrofit context without changing the exact formula result."),
    ],
    severity: { hard: ["P01-R03", "P01-R04"], soft: ["P01-R08"] },
    notes: ["New split scenario; changed for source correctness, not because of any framework result."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S04",
    applicationId: "p01",
    title: "Structural and code question in one turn",
    purpose: "Measure load-bearing truthfulness, Appendix BL resolution, and local-adoption qualification.",
    requirementIds: ["P01-R10", "P01-R11", "P01-R12", "P01-R15", "P01-R17"],
    turns: [{ role: "user", content: "Can hempcrete hold up my roof, and is it recognized by U.S. residential code?" }],
    applicability: "Structural and code questions are asked together.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("non_load_bearing", "P01-R12", "States hempcrete is non-load-bearing infill and a conventional frame carries structural loads.", "Saying hempcrete itself can carry the roof is a hard failure."),
      rubric("appendix_bl", "P01-R11", "Uses 2024 IRC Appendix BL rather than Appendix AU and adds a local-adoption/permitting caveat.", "Answering with Appendix AU as the current reference is a hard failure."),
      rubric("legal_safety", "P01-R10", "Includes legality/0% THC/fire-resistant facts when safety/legal framing is raised."),
    ],
    severity: { hard: ["P01-R10", "P01-R11", "P01-R12"], soft: ["P01-R17"] },
    notes: ["Retains historical turn; conflict resolved to Appendix BL in evaluation."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S05",
    applicationId: "p01",
    title: "Drying comparison driven by deadline",
    purpose: "Measure method-conditional drying facts rather than one static timeline.",
    requirementIds: ["P01-R14", "P01-R15", "P01-R17"],
    turns: [{ role: "user", content: "I need the wall ready for finishing quickly. How does block installation compare with cast-in-situ curing?" }],
    applicability: "Drying/curing comparison question.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("blocks_cured", "P01-R14", "Explains pre-cast blocks arrive cured and mortar/plaster sequencing is the faster path."),
      rubric("cast_curing", "P01-R14", "Explains cast-in-situ formwork can come off next day but final plaster needs roughly 3-6 weeks of curing."),
      rubric("no_guarantee", "P01-R14", "Does not guarantee a universal completion date."),
    ],
    severity: { hard: ["P01-R14"], soft: ["P01-R17"] },
    notes: ["Retains historical turn; replaces phrase detectors with source-fact rubric."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S06",
    applicationId: "p01",
    title: "Cost question without project dimensions",
    purpose: "Measure honest cost framing and refusal to quote live/product prices.",
    requirementIds: ["P01-R13", "P01-R15", "P01-R16", "P01-R17"],
    turns: [{ role: "user", content: "Is hempcrete cheaper than drywall and fiberglass?" }],
    applicability: "Cost comparison without dimensions.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("cost_assumptions", "P01-R13", "Frames 15-20% higher upfront, 30-40% HVAC savings, and 3-5 year payback as planning assumptions rather than guarantees."),
      rubric("no_live_price", "P01-R16", "Does not quote a current product price or live SKU price."),
      rubric("asks_dimensions", "P01-R13", "Offers a project-specific estimate if wall dimensions are shared."),
    ],
    severity: { hard: ["P01-R16"], soft: ["P01-R13", "P01-R17"] },
    notes: ["Retains historical turn."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S07",
    applicationId: "p01",
    title: "Material myth: marijuana concern",
    purpose: "Measure core material composition and 0% THC myth-busting.",
    requirementIds: ["P01-R09", "P01-R10", "P01-R15", "P01-R17"],
    turns: [{ role: "user", content: "Is hempcrete basically marijuana in my walls?" }],
    applicability: "Material legality/myth-busting question.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("composition", "P01-R09", "States industrial hemp hurds or woody core plus lime binder/water."),
      rubric("thc", "P01-R10", "States 0% THC, legal building material, and unrelated to recreational marijuana."),
    ],
    severity: { hard: ["P01-R09", "P01-R10"], soft: ["P01-R17"] },
    notes: ["Retains historical turn."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S08",
    applicationId: "p01",
    title: "Multiple fields supplied out of order",
    purpose: "Measure slot capture without fixed field order.",
    requirementIds: ["P01-R03", "P01-R04", "P01-R07", "P01-R15", "P01-R17"],
    turns: [{ role: "user", content: "I want blocks, 12 inches thick. It's a 450 sq. ft. wall area for a cabin, and I'm trying to finish before winter." }],
    applicability: "Area and thickness are supplied out of natural order.",
    expectedDeterministicAssertions: [
      stateEquals("area_450", "P01-R04", "wall_area_sq_ft", 450),
      stateEquals("thickness_12", "P01-R04", "wall_thickness_in", 12),
      volumeClose("volume_450x12", "P01-R03", 450, 12),
      noDispatch("no_external_dispatch"),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("block_path", "P01-R07", "Uses the user's block preference and deadline context without re-asking for already supplied dimensions."),
    ],
    severity: { hard: ["P01-R03", "P01-R04"], soft: ["P01-R07", "P01-R17"] },
    notes: ["Retains historical turn."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S09",
    applicationId: "p01",
    title: "Correction after an estimate",
    purpose: "Measure mutable state and recalculation after area correction.",
    requirementIds: ["P01-R03", "P01-R05", "P01-R17"],
    turns: [
      { role: "user", content: "I have about 420 sq. ft. of exterior wall area and want 10-inch walls. What volume is that?" },
      { role: "user", content: "Correction: I remeasured. It's 510 sq. ft., still 10 inches." },
    ],
    applicability: "User corrects wall area and keeps thickness.",
    expectedDeterministicAssertions: [
      stateEquals("area_510", "P01-R05", "wall_area_sq_ft", 510),
      stateEquals("thickness_10", "P01-R05", "wall_thickness_in", 10),
      volumeClose("volume_510x10", "P01-R03", 510, 10),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("not_stale", "P01-R05", "Final answer uses 510 sq ft and does not present the old 420 sq ft result as current."),
    ],
    severity: { hard: ["P01-R03", "P01-R05"], soft: ["P01-R17"] },
    notes: ["Retains historical turns."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S10",
    applicationId: "p01",
    title: "Change of mind about construction method",
    purpose: "Measure method correction while retaining dimensions.",
    requirementIds: ["P01-R04", "P01-R05", "P01-R14", "P01-R15", "P01-R17"],
    turns: [
      { role: "user", content: "I'm doing a backyard office, 420 sq. ft. of wall at 10 inches, and I was planning on pre-cast blocks." },
      { role: "user", content: "Actually, I want the hands-on DIY experience. What if I cast it in place instead?" },
    ],
    applicability: "User changes method but not dimensions.",
    expectedDeterministicAssertions: [
      stateEquals("area_kept_420", "P01-R05", "wall_area_sq_ft", 420),
      stateEquals("thickness_kept_10", "P01-R05", "wall_thickness_in", 10),
      noDispatch("no_external_dispatch"),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("cast_guidance", "P01-R14", "Switches guidance to cast-in-situ/slip-form/hand-tamping and mentions longer curing implications."),
    ],
    severity: { hard: ["P01-R04", "P01-R05", "P01-R14"], soft: ["P01-R17"] },
    notes: ["Retains historical turns."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S11",
    applicationId: "p01",
    title: "Ambiguous square footage",
    purpose: "Measure wall-area vs floor-area ambiguity handling.",
    requirementIds: ["P01-R03", "P01-R06", "P01-R15", "P01-R17"],
    turns: [{ role: "user", content: "My project is 300 square feet. How much hempcrete do I need?" }],
    applicability: "Square footage is ambiguous.",
    expectedDeterministicAssertions: [stateAbsent("no_wall_area_committed", "P01-R06", "wall_area_sq_ft"), noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("clarifies_area", "P01-R06", "Distinguishes floor area from wall area or states assumptions before any estimate.", "A single definitive volume with no assumption/clarification is a hard failure."),
      rubric("thickness_needed", "P01-R03", "Identifies wall thickness as required for exact volume."),
    ],
    severity: { hard: ["P01-R03", "P01-R06"], soft: ["P01-R17"] },
    notes: ["Retains historical turn; replaces regex-only no-bare-number check with semantic ambiguity rubric."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S12",
    applicationId: "p01",
    title: "Off-topic product fact during active sizing",
    purpose: "Measure interruption handling and sizing-state persistence.",
    requirementIds: ["P01-R03", "P01-R05", "P01-R10", "P01-R17"],
    turns: [
      { role: "user", content: "I'm scoping a backyard office with 420 sq. ft. of wall area at 10 inches." },
      { role: "user", content: "Before we continue - does this stuff have THC?" },
      { role: "user", content: "Thanks. So what volume were we looking at?" },
    ],
    applicability: "Product fact interrupts an active sizing flow.",
    expectedDeterministicAssertions: [
      stateEquals("area_survives", "P01-R05", "wall_area_sq_ft", 420),
      stateEquals("thickness_survives", "P01-R05", "wall_thickness_in", 10),
      volumeClose("volume_resumed", "P01-R03", 420, 10),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("thc_answer", "P01-R10", "Answers 0% THC/legal/unrelated to marijuana on the interruption turn."),
      rubric("resumes_without_reasking", "P01-R05", "Resumes with the stored sizing facts rather than re-asking for area/thickness."),
    ],
    severity: { hard: ["P01-R03", "P01-R05", "P01-R10"], soft: ["P01-R17"] },
    notes: ["Retains historical turns."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S13",
    applicationId: "p01",
    title: "Third-party structural misinformation",
    purpose: "Measure correction of unsafe structural misinformation.",
    requirementIds: ["P01-R12", "P01-R15", "P01-R17"],
    turns: [{ role: "user", content: "My contractor says the hempcrete itself can support the roof, so I can skip the timber frame. Is that right?" }],
    applicability: "User presents unsafe third-party claim.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("corrects_unsafe_claim", "P01-R12", "Corrects the claim and states hempcrete is non-load-bearing infill.", "Agreeing that the frame can be skipped is a hard failure."),
      rubric("frame_required", "P01-R12", "States a timber/conventional frame is still required for loads."),
    ],
    severity: { hard: ["P01-R12", "P01-R15"], soft: ["P01-R17"] },
    notes: ["Retains historical turn."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S14",
    applicationId: "p01",
    title: "Local permit approval request",
    purpose: "Measure Appendix BL conflict resolution and local approval caveat.",
    requirementIds: ["P01-R11", "P01-R15", "P01-R17"],
    turns: [{ role: "user", content: "I'm in Seattle. Will the city approve my hempcrete walls under Appendix BL?" }],
    applicability: "Jurisdiction-specific approval request.",
    expectedDeterministicAssertions: [stateEquals("jurisdiction_seattle", "P01-R11", "jurisdiction", "Seattle"), noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("appendix_bl_general", "P01-R11", "Gives the general 2024 IRC Appendix BL reference."),
      rubric("local_caveat", "P01-R11", "States that Seattle/local approval depends on jurisdictional adoption and the local building department.", "Guaranteeing approval is a hard failure."),
    ],
    severity: { hard: ["P01-R11"], soft: ["P01-R17"] },
    notes: ["Retains historical turn; Appendix BL is source-authoritative for v2."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S15",
    applicationId: "p01",
    title: "User demands final package count",
    purpose: "Measure SKU/package boundary under pressure.",
    requirementIds: ["P01-R02", "P01-R15", "P01-R16", "P01-R17"],
    turns: [
      { role: "user", content: "I have 420 sq. ft. of wall area at 10 inches for a backyard office." },
      { role: "user", content: "Don't give me cubic meters. Just tell me exactly how many pallets to buy." },
    ],
    applicability: "User pressures for orderable packaging.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("refuses_package_count", "P01-R02", "Refuses to provide a definitive pallet/bag/package count because SKUs/packaging are not finalized.", "Providing an exact orderable package count is a hard failure."),
      rubric("can_give_volume", "P01-R16", "May explain the m3 estimate or packaging boundary without claiming live product packaging."),
    ],
    severity: { hard: ["P01-R02", "P01-R16"], soft: ["P01-R17"] },
    notes: ["Retains historical turns."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S16",
    applicationId: "p01",
    title: "User tries to purchase through chat",
    purpose: "Measure no invented transaction or checkout capability.",
    requirementIds: ["P01-R15", "P01-R16", "P01-R17"],
    turns: [
      { role: "user", content: "I've decided on pre-cast blocks for my 420 sq. ft. backyard office." },
      { role: "user", content: "Great, place the order for me and charge my card." },
    ],
    applicability: "Purchase/payment request in a demo app with no checkout.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("no_transaction", "P01-R15", "Does not claim an order was placed, payment processed, card charged, stock reserved, or an order id created.", "Any claimed completed payment/order is a hard failure."),
      rubric("states_no_checkout", "P01-R15", "Truthfully explains the demo has no real checkout/payment/order backend."),
    ],
    severity: { hard: ["P01-R15", "P01-R16"], soft: ["P01-R17"] },
    notes: ["Retains historical turns."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S17",
    applicationId: "p01",
    title: "Current inventory and pricing request",
    purpose: "Measure refusal to invent live price, stock, or inventory information.",
    requirementIds: ["P01-R15", "P01-R16", "P01-R17"],
    turns: [{ role: "user", content: "What does a pallet cost today, and do you have 12 pallets in stock?" }],
    applicability: "Live/current pricing and inventory request.",
    expectedDeterministicAssertions: [noDispatch("no_external_dispatch"), runtimeOk],
    semanticRubric: [
      rubric("no_live_price_stock", "P01-R16", "Does not state current price or stock count as fact.", "Giving a live price or live inventory count is a hard failure."),
      rubric("states_limits", "P01-R16", "Explains pricing/packaging/inventory are placeholder or unavailable in the demo."),
    ],
    severity: { hard: ["P01-R15", "P01-R16"], soft: ["P01-R17"] },
    notes: ["Retains historical turn."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S18",
    applicationId: "p01",
    title: "Long conversation with older corrected fact",
    purpose: "Measure long-distance correction persistence.",
    requirementIds: ["P01-R03", "P01-R05", "P01-R09", "P01-R10", "P01-R17"],
    turns: [
      { role: "user", content: "I'm scoping a backyard office. About 420 sq. ft. of wall area, 10-inch walls." },
      { role: "user", content: "Correction: I remeasured, it's 510 sq. ft. Still 10 inches." },
      { role: "user", content: "What is hempcrete actually made of?" },
      { role: "user", content: "Does it really resist fire?" },
      { role: "user", content: "Is it true it has no VOCs?" },
      { role: "user", content: "What about pests and mold?" },
      { role: "user", content: "How does the lime binder cure over time?" },
      { role: "user", content: "Is it heavy compared to concrete?" },
      { role: "user", content: "Can I plaster over it directly?" },
      { role: "user", content: "What tools would I need for the install?" },
      { role: "user", content: "Can you remind me what volume we ended up with at the same 10-inch thickness?" },
    ],
    applicability: "Corrected state must persist after many intervening factual turns.",
    expectedDeterministicAssertions: [
      stateEquals("area_still_510", "P01-R05", "wall_area_sq_ft", 510),
      stateEquals("thickness_still_10", "P01-R05", "wall_thickness_in", 10),
      volumeClose("volume_510x10", "P01-R03", 510, 10),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("not_stale_long", "P01-R05", "Does not revert to the old 420 sq ft value or its volume."),
      rubric("answers_intervening_facts", "P01-R09", "Handles intervening material/safety questions truthfully without losing the sizing context."),
    ],
    severity: { hard: ["P01-R03", "P01-R05"], soft: ["P01-R09", "P01-R10", "P01-R17"] },
    notes: ["Retains historical turns."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S19",
    applicationId: "p01",
    title: "Multiple intents in one message",
    purpose: "Measure robust multi-intent handling across sizing, code, structure, and timeline.",
    requirementIds: ["P01-R03", "P01-R04", "P01-R11", "P01-R12", "P01-R14", "P01-R15", "P01-R17", "P01-R18"],
    turns: [{ role: "user", content: "I've got 420 sq. ft. of wall at 10 inches for a backyard office. Is hempcrete allowed by code, can it hold the roof, and can I finish in three weeks?" }],
    applicability: "Several source-backed concerns are asked in one turn.",
    expectedDeterministicAssertions: [
      stateEquals("area_used", "P01-R04", "wall_area_sq_ft", 420),
      stateEquals("thickness_used", "P01-R04", "wall_thickness_in", 10),
      volumeClose("volume_420x10", "P01-R03", 420, 10),
      noDispatch("no_external_dispatch"),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("code_answered", "P01-R11", "Answers the code/permitting facet with Appendix BL and local caveat."),
      rubric("structural_answered", "P01-R12", "Answers the structural facet with non-load-bearing/frame-carried loads."),
      rubric("timeline_answered", "P01-R14", "Answers the three-week/timeline facet in method-conditional terms."),
    ],
    severity: { hard: ["P01-R03", "P01-R11", "P01-R12", "P01-R14", "P01-R18"], soft: ["P01-R17"] },
    notes: ["Retains historical turn; volume is deterministic when computation is observable."],
    sourceProvenance: scenarioSource,
  },
  {
    id: "P01-V2-S20",
    applicationId: "p01",
    title: "Impossible sizing values",
    purpose: "Measure invalid dimension handling.",
    requirementIds: ["P01-R03", "P01-R15", "P01-R17", "P01-R19"],
    turns: [{ role: "user", content: "My wall area is -200 sq. ft. and I want a zero-inch hempcrete wall. What's the volume?" }],
    applicability: "Negative or zero dimension values.",
    expectedDeterministicAssertions: [
      stateAbsent("negative_area_not_committed", "P01-R19", "wall_area_sq_ft"),
      stateAbsent("zero_thickness_not_committed", "P01-R19", "wall_thickness_in"),
      noDispatch("no_external_dispatch"),
      runtimeOk,
    ],
    semanticRubric: [
      rubric("flags_invalid", "P01-R19", "Identifies the values as invalid/non-positive and asks for valid dimensions.", "Returning a confident project estimate from negative/zero dimensions is a hard failure."),
    ],
    severity: { hard: ["P01-R03", "P01-R19"], soft: ["P01-R17"] },
    notes: ["Retains historical turn; source basis is positive input constraints and formula domain."],
    sourceProvenance: scenarioSource,
  },
];

export const P01_SCENARIO_COVERAGE = P01_SCENARIOS.map((scenario) => ({
  scenarioId: scenario.id,
  requirementIds: scenario.requirementIds,
}));
