import type { DeterministicAssertionSpec } from "../evaluator-v2/schema.ts";

export type ApplicationId = "p01" | "p02";

export type RequirementType =
  | "deterministic_state"
  | "deterministic_numeric"
  | "deterministic_action"
  | "grounding"
  | "semantic_behavior"
  | "conversational_behavior"
  | "safety_truthfulness";

export type Severity = "hard" | "soft";

export interface RequirementV2 {
  id: string;
  statement: string;
  sourceFiles: string[];
  sourceEvidence: string[];
  type: RequirementType;
  severity: Severity;
  applicability: string;
  directlyObservable: boolean;
  preferredEvaluation: string;
  conflictResolution?: string;
}

export interface ScenarioTurn {
  role: "user";
  content: string;
}

export interface SemanticRubricItem {
  id: string;
  requirementId: string;
  criterion: string;
  scale: "0_1_2";
  hardFailureWhen?: string;
}

export interface ScenarioV2 {
  id: string;
  applicationId: ApplicationId;
  title: string;
  purpose: string;
  requirementIds: string[];
  turns: ScenarioTurn[];
  setup?: Record<string, unknown>;
  applicability: string;
  expectedDeterministicAssertions: DeterministicAssertionSpec[];
  semanticRubric: SemanticRubricItem[];
  severity: {
    hard: string[];
    soft: string[];
  };
  notes: string[];
  sourceProvenance: string[];
}

export type ScenarioDisposition =
  | "retain_unchanged"
  | "retain_turns_replace_evaluation"
  | "revise"
  | "split"
  | "merge"
  | "retire";

export interface HistoricalScenarioAudit {
  scenarioId: string;
  userTurns: string[];
  intendedRequirementsMeasured: string[];
  requirementsActuallyMeasured: string[];
  deterministicObservables: string[];
  semanticObservables: string[];
  ambiguity: string;
  obsoleteImplementationCoupling: string;
  regexEvaluatorCoupling: string;
  redundantWithAnotherScenario: string;
  combinesTooManyFailureModes: string;
  recommendedDisposition: ScenarioDisposition;
  rationale: string;
}

export function scenarioIds(scenarios: readonly ScenarioV2[]): string[] {
  return scenarios.map((scenario) => scenario.id);
}
