import type { ModelPolicy } from "../provider/types.ts";
import type { SessionState } from "../session/state.ts";
import type { KnowledgeSourceCatalogEntry, RetrievalRequest } from "../knowledge/types.ts";
import type { MemoryWriteProposal } from "../memory/types.ts";

export type PlanningMode = "llm" | "deterministic" | "hybrid";

export interface PlanningPolicy {
  /** Rich agents default to llm; trivial agents may conclusively skip the call. */
  mode?: PlanningMode;
  /** Defaults to AgentDefinition.model. A separately injected provider may serve it. */
  model?: ModelPolicy;
}

export interface WorkingNoteProposal {
  text: string;
  confidence?: number;
}

/**
 * Preflight state proposal for one external user turn.
 *
 * This is deliberately not the complete autonomous plan. It establishes memory, notes, routing,
 * and optional initial retrieval before an agentic Harness begins its iterative decisions.
 */
export interface PreflightPlan {
  memoryProposals: MemoryWriteProposal[];
  workingNotes: WorkingNoteProposal[];
  signals: string[];
  retrievalRequests: RetrievalRequest[];
}

/** v0.2 compatibility name. TurnPlan now means the preflight plan, not a full tool trajectory. */
export type TurnPlan = PreflightPlan;

export const EMPTY_TURN_PLAN: PreflightPlan = {
  memoryProposals: [],
  workingNotes: [],
  signals: [],
  retrievalRequests: [],
};

export interface DeterministicPlannerInput {
  userMessage: string;
  state: SessionState;
  sourceCatalog: KnowledgeSourceCatalogEntry[];
  signalVocabulary: string[];
  memoryFieldKeys: string[];
}

export type DeterministicPlanResult =
  | { kind: "planned"; plan: TurnPlan; reason: string }
  | { kind: "unknown"; reason: string };

/** Optional code-injected strategy seam. It is not stored in serializable AgentDefinition. */
export interface DeterministicPlanner {
  plan(input: DeterministicPlannerInput): DeterministicPlanResult | Promise<DeterministicPlanResult>;
}

export interface TurnPlanValidationError {
  code:
    | "malformed_plan"
    | "unknown_source"
    | "wrong_source_kind"
    | "source_not_permitted_in_phase"
    | "invalid_document_query"
    | "invalid_record_query"
    | "invalid_web_query"
    | "web_search_unavailable"
    | "knowledge_limit_exceeded"
    | "retrieval_limit_exceeded";
  message: string;
  requestIndex?: number;
}
