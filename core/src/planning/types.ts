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

/** Structured output of Harness pass 1. Every field is still subject to runtime validation. */
export interface TurnPlan {
  memoryProposals: MemoryWriteProposal[];
  workingNotes: WorkingNoteProposal[];
  signals: string[];
  retrievalRequests: RetrievalRequest[];
}

export const EMPTY_TURN_PLAN: TurnPlan = {
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
    | "retrieval_limit_exceeded";
  message: string;
  requestIndex?: number;
}
