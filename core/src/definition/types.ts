import type { StructuredMemorySchema } from "../memory/types.ts";
import type { HostContextSchema } from "../context/types.ts";
import type { KnowledgeBinding } from "../knowledge/types.ts";
import type { ToolBinding } from "../tools/types.ts";
import type { FlowDefinition } from "../flow/types.ts";
import type { ModelPolicy } from "../provider/types.ts";
import type { PlanningPolicy } from "../planning/types.ts";

export interface AgentRule {
  id: string;
  text: string;
  /** Invariants are non-overridable. Defaults may be explicitly specialized by a phase. */
  kind: "invariant" | "default";
  /** Which semantic model work should see this instruction. Defaults to `both`. */
  scope?: "planner" | "response" | "both";
}

export type AgentRuleInput = string | AgentRule;

/**
 * The AgentDefinition: immutable, versioned, serializable.
 *
 * It is plain JSON - no functions, no classes - so it can be stored in a database, diffed,
 * imported/exported, and content-hashed. Executors, providers, and stores are injected separately
 * and are never part of the definition.
 */
export interface AgentDefinition {
  id: string;
  /** Monotonic. A change produces a NEW version; an existing version is never edited in place. */
  version: number;
  name: string;
  /**
   * The agent's goal, in a sentence or two.
   *
   * Deliberately one concise string. This field exists precisely to stop the authoring requirements
   * document from being concatenated into every prompt - a long goal here is a design error, and
   * `validateDefinition` warns about it.
   */
  goal: string;
  model: ModelPolicy;
  /** Planner mode/model. Omitted model means use the main model/provider. */
  planning?: PlanningPolicy;
  /** Serializable Harness preference. The application still injects the implementation. */
  execution?: {
    /** `agentic` and `workflow` are the v0.36 primary strategies. Other values are legacy. */
    harness: "agentic" | "workflow" | "two_pass" | "native_agent" | "claude_agent";
    executionContextPolicy?: "fresh_each_turn" | "resume";
  };
  /** Standing rules. Legacy strings remain supported and are treated as invariants. */
  globalRules?: AgentRuleInput[];
  knowledge: KnowledgeBinding[];
  memorySchema: StructuredMemorySchema;
  hostContextSchema: HostContextSchema;
  tools: ToolBinding[];
  policies: DeterministicPolicies;
  /** Optional. Absent means ordinary conversation with no phases. */
  flow?: FlowDefinition;
  description?: string;
  createdAt?: string;
}

/**
 * Knobs the runtime enforces itself, without consulting the model.
 *
 * `allowUnconfirmedSideEffects` exists as an explicit, auditable field rather than an implicit
 * behaviour. It defaults to false and the runtime refuses to flip it implicitly.
 */
export interface DeterministicPolicies {
  /** Hard ceiling on model/tool steps in the response pass. Always enforced. */
  maxSteps: number;
  maxToolCallsPerTurn: number;
  /** Reject a proposal naming a field that is not in the memory schema. Default true. */
  rejectUnknownMemoryFields: boolean;
  /** Run `confirmation: "required"` tools without a resolved PendingAction. Default false. */
  allowUnconfirmedSideEffects: boolean;
  /** Working notes older than this are dropped from compiled context. 0 = never expire. */
  workingNoteTtlMs?: number;
  /** Transcript messages included in compiled context. Default 10. */
  transcriptWindow?: number;
  /** Maximum explicit retrieval requests accepted from one PreflightPlan. */
  maxRetrievalRequests: number;
  /** Maximum chunks returned by one document search. */
  maxDocumentChunks: number;
  /** Maximum record rows from one planned query entering response context. */
  maxRecordRows: number;
  /** Approximate total character budget for retrieved knowledge in response context. */
  maxKnowledgeChars: number;
  /** Hard ceiling on observe/decide/delegate iterations in an agentic Harness. */
  maxAgentIterations: number;
  /** All product-classified Knowledge requests, including read-only Tool implementations. */
  maxKnowledgeCallsPerTurn: number;
  /** Requests for write/external-side-effect capabilities, whether or not they are authorized. */
  maxActionRequestsPerTurn: number;
  /** Maximum read-only Knowledge operations started concurrently from one planner iteration. */
  maxParallelReadCalls: number;
}

export const DEFAULT_POLICIES: DeterministicPolicies = {
  maxSteps: 6,
  maxToolCallsPerTurn: 4,
  rejectUnknownMemoryFields: true,
  allowUnconfirmedSideEffects: false,
  workingNoteTtlMs: 0,
  transcriptWindow: 10,
  maxRetrievalRequests: 4,
  maxDocumentChunks: 4,
  maxRecordRows: 20,
  maxKnowledgeChars: 12_000,
  maxAgentIterations: 8,
  maxKnowledgeCallsPerTurn: 12,
  maxActionRequestsPerTurn: 4,
  maxParallelReadCalls: 4,
};

export interface DefinitionIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
}
