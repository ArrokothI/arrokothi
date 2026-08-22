import type { ObjectSchema } from "../schema/value-schema.ts";
import type { HostContextState } from "../context/types.ts";
import type { StructuredMemory } from "../memory/types.ts";

/**
 * Tools / actions.
 *
 * The load-bearing idea: **the ToolResult is authoritative**. It distinguishes success, definite
 * failure, and an unknown remote outcome; the model cannot promote any of those states into another.
 * The model may *request* an action; the runtime decides whether it runs.
 */

export type ToolEffect = "read" | "write" | "external_side_effect";
export type ToolConfirmation = "none" | "required";

/**
 * `per_input`      - same tool + same arguments runs once; a repeat replays the stored result.
 * `once_per_session` - the tool runs at most once per session, whatever the arguments.
 */
export type ToolIdempotency = "none" | "per_input" | "once_per_session";

export type ToolArgumentSource = `memory.${string}` | `host_context.${string}` | `tool_fact.${string}`;

export type ToolArgumentPolicy =
  | {
      kind: "authoritative_value";
      /** Exact typed equality against at least one named runtime-controlled source is required. */
      sources: ToolArgumentSource[];
    }
  | {
      /** Prose or another non-identifying value may be composed by the response model. */
      kind: "model_composed";
    };

export interface ToolDefinition {
  name: string;
  description: string;
  input: ObjectSchema;
  output: ObjectSchema;
  effect: ToolEffect;
  confirmation: ToolConfirmation;
  idempotency: ToolIdempotency;
  /** Required for each argument that an external side effect may receive. */
  argumentPolicies?: Record<string, ToolArgumentPolicy>;
  /** Human-readable label used in confirmation prompts and the confirmation resolver. */
  label?: string;
}

/** An assertion the runtime should treat as ground truth after a tool returns. */
export interface AuthoritativeFact {
  key: string;
  value: string | number | boolean | string[];
  description?: string;
  /** When set, the runtime commits this fact with `runtime_observation` / `tool_verified` provenance. */
  writeToMemory?: boolean;
}

export type ToolResult =
  | { ok: true; output: Record<string, unknown>; facts?: AuthoritativeFact[] }
  | {
      ok: false;
      /** Omitted by legacy executors and interpreted as a definite failure. */
      outcome?: "definite_failure";
      error: { code: string; message: string };
      retryable?: boolean;
    }
  | {
      ok: false;
      /** The remote effect may have happened; automatic retry is unsafe. */
      outcome: "outcome_unknown";
      error: { code: string; message: string };
      retryable?: false;
    };

/** Read-only view handed to an executor. Executors get `tools_only` context; the model never does. */
export interface ToolExecutionContext {
  sessionId: string;
  turn: number;
  requestId: string;
  /** Stable, runtime-owned key for the authorized logical execution/replay. */
  idempotencyKey: string;
  memory: StructuredMemory;
  /** Includes `model` and `tools_only` context. `runtime_only` is withheld even from tools. */
  hostContext: HostContextState;
}

/**
 * The injected side of a tool. Core ships no real executor: the Studio, examples, and benchmarks
 * supply fakes and dry runs, and a production caller supplies the real thing.
 */
export interface ToolExecutor {
  execute(args: Record<string, unknown>, ctx: ToolExecutionContext): Promise<ToolResult>;
}

export interface BoundTool {
  definition: ToolDefinition;
  executor: ToolExecutor;
}

/** Declared on the AgentDefinition. The executor is injected separately, by name. */
export interface ToolBinding {
  definition: ToolDefinition;
  /** Restrict to specific phases. Absent means available in all phases. */
  phaseIds?: string[];
}

/** Why the runtime refused to run a requested tool. Every reason is deterministic. */
export type ToolRejectionReason =
  | "unknown_tool"
  | "not_bound_to_agent"
  | "not_permitted_in_phase"
  | "invalid_arguments"
  | "non_authoritative_argument_source"
  | "confirmation_required"
  | "external_retry_not_authorized"
  | "external_outcome_unknown"
  | "no_executor";

export interface ToolRejection {
  reason: ToolRejectionReason;
  message: string;
}
