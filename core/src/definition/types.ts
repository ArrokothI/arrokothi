import type { StructuredMemorySchema } from "../memory/types.ts";
import type { HostContextSchema } from "../context/types.ts";
import type { KnowledgeBinding } from "../knowledge/types.ts";
import type { ToolBinding } from "../tools/types.ts";
import type { FlowDefinition } from "../flow/types.ts";
import type { ModelPolicy } from "../provider/types.ts";

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
  /** Standing rules compiled into every prompt. Keep them short and behavioural. */
  globalRules?: string[];
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
}

export const DEFAULT_POLICIES: DeterministicPolicies = {
  maxSteps: 6,
  maxToolCallsPerTurn: 4,
  rejectUnknownMemoryFields: true,
  allowUnconfirmedSideEffects: false,
  workingNoteTtlMs: 0,
  transcriptWindow: 10,
};

export interface DefinitionIssue {
  severity: "error" | "warning";
  path: string;
  message: string;
}
