/**
 * Benchmark result schema.
 *
 * Deliberately close to the canonical P01/P02 result shape already stored in the Agenerateor
 * benchmark artifacts, so results can be aligned scenario-by-scenario and assertion-by-assertion
 * without a translation layer that could quietly change what is being compared.
 *
 * The one field that matters most for honesty is `mode`. A `harness_selfcheck` run exercises the
 * adapter plumbing with a scripted model; its grades say nothing about agent quality. Only a `live`
 * run is a measurement.
 */

export type EvidenceClass = "CORE" | "INFERRED" | "UNRESOLVED" | "IMPLEMENTATION_ONLY";
export type AssertionKind = "state" | "text" | "action";
export type Severity = "hard" | "soft";
export type Outcome = "pass" | "soft_fail" | "hard_fail" | "inconclusive";

/**
 * Canonical projection of runtime state.
 *
 * Keys are the benchmark's field names, NOT the SDK's. The projection function is the only place
 * the two vocabularies meet, which keeps a rename inside the SDK from silently changing a
 * benchmark result.
 */
export type CanonicalFields = Record<string, string | number | boolean | undefined>;

export interface TurnContext {
  /** Reply text for THIS turn. */
  reply: string;
  /** All replies so far, joined - for assertions about the conversation as a whole. */
  allReplies: string;
  fields: CanonicalFields;
  phaseId: string | null;
  /** Tool/action names actually attempted this run, projected to canonical names. */
  actionsAttempted: string[];
  /** Whether the run's consequential action succeeded. `null` when none was attempted. */
  actionSuccess: boolean | null;
}

export interface Assertion {
  id: string;
  label: string;
  kind: AssertionKind;
  severity: Severity;
  /** Index of the turn this applies to; -1 = final turn. */
  turn: number;
  check: (ctx: TurnContext) => { passed: boolean; detail: string } | null;
}

export interface BenchmarkScenario {
  id: string;
  /** Original spec id, preserved so results align with the stored canonical artifacts. */
  specId: string;
  title: string;
  evidence: EvidenceClass;
  requirement: string;
  stresses: string;
  turns: string[];
  assertions: Assertion[];
  /** Which transport outcome the dry run must use for this scenario. */
  mockTransportMode?: "success" | "fail";
  note?: string;
}

export interface AssertionResult {
  id: string;
  label: string;
  kind: AssertionKind;
  severity: Severity;
  applicable: boolean;
  passed: boolean | null;
  detail: string;
}

export interface ScenarioResult {
  id: string;
  specId: string;
  title: string;
  evidence: EvidenceClass;
  requirement: string;
  stresses: string;
  note?: string;
  turns: string[];
  outcome: Outcome;
  reason: string | null;
  /** Raw dialogue: every reply the scripted user actually received. */
  replies: string[];
  fields: CanonicalFields;
  phaseId: string | null;
  actionsAttempted: string[];
  actionSuccess: boolean | null;
  /** Tool events, so a duplicate dispatch or a refusal is inspectable after the fact. */
  toolEvents: { turn: number; type: string; toolName: string; detail: string }[];
  /** Per-turn provider/model, so a degraded turn is never mistaken for model behaviour. */
  providers: { turn: number; providerId: string; model: string; purpose: string }[];
  assertions: AssertionResult[];
  /** Model calls, retries, and failures, for efficiency accounting. */
  modelCalls: number;
  harnessError?: string;
  /**
   * Only on a self-check run. Grading is `inconclusive` there (correctly - no model answered), so
   * this is what the self-check genuinely establishes: that every assertion in the scenario is
   * executable against a real projected state without throwing.
   */
  adapterCheck?: { assertionsRun: number; threw: { id: string; error: string }[] };
}

export interface BenchmarkRun {
  runId: string;
  project: "P01-CRAIG" | "P02-ESTATE";
  /**
   * `harness_selfcheck` - scripted model, plumbing only. NOT a measurement of agent quality.
   * `live`             - a real model provider answered every turn.
   */
  mode: "harness_selfcheck" | "live";
  label: string;
  generatedAt: string;
  sdk: { agentId: string; agentVersion: number; definitionHash: string; harness: string };
  provider: { id: string; model: string };
  paceMs: number;
  totals: Record<Outcome, number>;
  results: ScenarioResult[];
  /** Present on a self-check: states plainly what the run does and does not establish. */
  disclaimer?: string;
}
