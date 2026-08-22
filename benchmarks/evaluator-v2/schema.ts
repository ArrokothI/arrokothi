export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

export type AssertionSeverity = "hard" | "soft";
export type AssertionOutcome = "pass" | "soft_fail" | "hard_fail" | "not_applicable" | "inconclusive";
export type TerminalActionOutcome = "success" | "definite_failure" | "outcome_unknown";
export type RunInvalidReason =
  | "wrong_requested_model"
  | "silent_model_substitution"
  | "provider_schema_rejection_before_subject_behavior"
  | "provider_outage_or_transport_failure"
  | "corrupted_raw_artifact"
  | "evaluator_crash"
  | "missing_required_benchmark_setup";

export interface NeutralConversationTurn {
  turn: number;
  user: string;
  assistant: string;
  at?: string;
}

export interface NeutralModelMetadata {
  provider?: string;
  requested?: string;
  providerReported?: string | string[];
  temperature?: number;
  thinking?: Record<string, JsonValue>;
  callCount?: number;
  usage?: {
    available: boolean;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface NeutralRecordObservation {
  queryId?: string;
  collection?: string;
  selectedIds?: string[];
  rows?: Record<string, Record<string, JsonValue>>;
  resultCount?: number;
  zeroMatch?: boolean;
  fields?: Record<string, JsonValue>;
}

export interface NeutralActionRequest {
  turn?: number;
  actionName: string;
  args?: Record<string, JsonValue>;
  effect?: "none" | "read" | "external_side_effect";
  dispatched?: boolean;
}

export interface NeutralConfirmationRequest {
  turn?: number;
  actionName: string;
  payload?: Record<string, JsonValue>;
  resolved?: "accepted" | "rejected" | "expired";
}

export interface NeutralRawRunV2 {
  schemaVersion: "neutral-raw-run-v2";
  applicationId: "p01" | "p02" | string;
  implementationId?: string;
  frameworkId?: string;
  scenarioId: string;
  repeatId: string;
  conversation: NeutralConversationTurn[];
  requestedModel?: NeutralModelMetadata;
  reportedModel?: NeutralModelMetadata;
  canonicalFinalState?: Record<string, JsonValue | undefined>;
  canonicalPerTurnState?: Array<{ turn: number; state: Record<string, JsonValue | undefined> }>;
  deterministicComputations?: Record<string, JsonValue | undefined>;
  retrievalObservations?: NeutralRecordObservation[];
  recordObservations?: NeutralRecordObservation[];
  exactSelectedRecordIds?: string[];
  actionRequests?: NeutralActionRequest[];
  confirmationRequests?: NeutralConfirmationRequest[];
  exactActionPayload?: Record<string, JsonValue>;
  executorDispatchCount?: number;
  terminalActionResult?: TerminalActionOutcome;
  stopReason?: string;
  runtimeErrors?: Array<{ code?: string; message: string; beforeSubjectBehavior?: boolean }>;
  timing?: { startedAt?: string; completedAt?: string; elapsedMs?: number };
  modelCallCount?: number;
  tokenUsage?: NeutralModelMetadata["usage"];
  nativeTrace?: unknown;
  invalidReason?: RunInvalidReason;
}

export interface ExperimentPlan {
  expectedRequestedModel?: string;
  requireProviderReportedModelMatch?: boolean;
  requiredSetupKeys?: string[];
}

export type DeterministicAssertionType =
  | "state_equals"
  | "state_absent"
  | "state_one_of"
  | "numeric_close"
  | "numeric_range"
  | "record_ids_exact"
  | "record_count"
  | "record_field_equals"
  | "action_not_requested"
  | "action_requested"
  | "dispatch_count"
  | "action_args_exact"
  | "action_args_subset"
  | "confirmation_requested"
  | "confirmation_payload_exact"
  | "action_outcome"
  | "stop_reason"
  | "runtime_error_absent"
  | "contains_source_fact"
  | "custom";

export interface BaseDeterministicAssertion {
  id: string;
  requirementId: string;
  type: DeterministicAssertionType;
  severity: AssertionSeverity;
  description: string;
  onMissing?: "not_applicable" | "inconclusive" | "fail";
}

export type DeterministicAssertionSpec =
  | (BaseDeterministicAssertion & { type: "state_equals"; key: string; expected: JsonValue })
  | (BaseDeterministicAssertion & { type: "state_absent"; key: string })
  | (BaseDeterministicAssertion & { type: "state_one_of"; key: string; expected: JsonValue[] })
  | (BaseDeterministicAssertion & { type: "numeric_close"; source: "state" | "computation" | "action_payload"; key: string; expected: number; tolerance: number })
  | (BaseDeterministicAssertion & { type: "numeric_range"; source: "state" | "computation" | "action_payload"; key: string; min: number; max: number })
  | (BaseDeterministicAssertion & { type: "record_ids_exact"; expectedIds: string[] })
  | (BaseDeterministicAssertion & { type: "record_count"; expected: number })
  | (BaseDeterministicAssertion & { type: "record_field_equals"; recordId: string; field: string; expected: JsonValue })
  | (BaseDeterministicAssertion & { type: "action_not_requested"; actionName: string })
  | (BaseDeterministicAssertion & { type: "action_requested"; actionName: string })
  | (BaseDeterministicAssertion & { type: "dispatch_count"; expected: number })
  | (BaseDeterministicAssertion & { type: "action_args_exact"; actionName?: string; expected: Record<string, JsonValue> })
  | (BaseDeterministicAssertion & { type: "action_args_subset"; actionName?: string; expectedSubset: Record<string, JsonValue> })
  | (BaseDeterministicAssertion & { type: "confirmation_requested"; actionName?: string; expected: boolean })
  | (BaseDeterministicAssertion & { type: "confirmation_payload_exact"; expected: Record<string, JsonValue> })
  | (BaseDeterministicAssertion & { type: "action_outcome"; expected: TerminalActionOutcome })
  | (BaseDeterministicAssertion & { type: "stop_reason"; expected: string | string[] })
  | (BaseDeterministicAssertion & { type: "runtime_error_absent" })
  | (BaseDeterministicAssertion & { type: "contains_source_fact"; key: string; expected?: JsonValue })
  | (BaseDeterministicAssertion & { type: "custom"; customId: string });

export interface DeterministicAssertionResult {
  id: string;
  requirementId: string;
  type: DeterministicAssertionType;
  severity: AssertionSeverity;
  outcome: AssertionOutcome;
  passed: boolean | null;
  detail: string;
}

export interface DeterministicEvaluation {
  schemaVersion: "deterministic-evaluation-v2";
  scenarioId: string;
  repeatId: string;
  invalid: boolean;
  invalidReason?: RunInvalidReason;
  results: DeterministicAssertionResult[];
  hardFailures: number;
  softFailures: number;
}

export interface SemanticRubricResult {
  requirementId: string;
  score: 0 | 1 | 2;
  confidence: number;
  reason: string;
  citedTurns: number[];
}

export interface SemanticJudgeOutput {
  schemaVersion: "semantic-judge-output-v1";
  promptVersion: "semantic-judge-v1";
  judge: {
    provider: string;
    requestedModel: string;
    providerReportedModel?: string;
    temperature: number;
    thinking?: Record<string, JsonValue>;
    timestamp: string;
    evaluatorGitCommit?: string;
  };
  requirementResults: SemanticRubricResult[];
  hardSemanticViolations: string[];
  rawStructuredOutput?: unknown;
}

export interface PairwiseCriterionPreference {
  criterion: "correctness" | "grounding" | "correction_handling" | "truthfulness" | "usefulness" | "conversational_coherence";
  preference: "A" | "B" | "tie" | "both_bad";
  reason: string;
}

export interface PairwiseJudgeOutput {
  schemaVersion: "pairwise-judge-output-v1";
  promptVersion: "pairwise-judge-v1";
  judge: SemanticJudgeOutput["judge"] & { randomizationSeed: string };
  scenarioId: string;
  assignment: { A: string; B: string };
  verdict: "A" | "B" | "tie" | "both_bad";
  criteria: PairwiseCriterionPreference[];
  reason: string;
  rawStructuredOutput?: unknown;
}

export interface AuditQueueItem {
  id: string;
  scenarioId: string;
  repeatId: string;
  implementationId?: string;
  reasons: string[];
  conversation: NeutralConversationTurn[];
  deterministic?: DeterministicEvaluation;
  semantic?: SemanticJudgeOutput;
  pairwise?: PairwiseJudgeOutput;
  evidence: Record<string, JsonValue | undefined>;
}
