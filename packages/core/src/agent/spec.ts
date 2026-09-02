/**
 * The Agent spec: portable authored data for a model-directed Execution.
 *
 * Slice A left this as `JsonObject` so the substrate would not guess at this slice. This is the
 * replacement, and like the Workflow spec it is chosen by what it *cannot* contain. An Agent
 * definition names a logical model, its instructions, its bounds, and the operations it would like
 * exposed. It holds no provider client, no API key, no executor, no store, no Harness, no capability
 * catalog, no authority grant, no Active View, no model projection, no provider tool schema, no
 * application principal, and no protocol type - `definitions/validation.ts` enforces the structural
 * half of that (plain JSON only), and the shapes here enforce the rest by having nowhere to put them.
 *
 * The exposure request is the part that most invites mistakes, so it is the smallest thing that
 * works: operation identities and authored group labels. It is a *request*, intersected with the
 * runtime-owned ceiling; writing an operation here neither grants it nor makes it appear.
 *
 * ```text
 * spec.operations             what the author would like exposed
 * effective authority         what the runtime decided is legal
 * Active Operation View       the intersection, ordered and bounded
 * ```
 *
 * Bounds are runtime limits, not permissions. `maxModelCalls` says how much autonomous progression
 * may occur; it says nothing about whether any of it is allowed.
 */

import type { LogicalModelRequest } from "../model/types.ts";
import type { OperationExposureRequest } from "../operations/exposure.ts";

/**
 * What a model text response means for this Agent.
 *
 * ```text
 * respond_and_wait      a response is communication; the Execution stays alive
 * complete_on_response  a response is this Agent's terminal answer
 * ```
 *
 * The default is `respond_and_wait`, because `response != terminal result` and a kernel that
 * completed an Execution every time a model produced text would have collapsed the two. Completing
 * on a response is a deliberate contract an author opts into.
 */
export type AgentCompletionMode = "respond_and_wait" | "complete_on_response";

export const AGENT_COMPLETION_MODES: readonly AgentCompletionMode[] = ["respond_and_wait", "complete_on_response"];

/** Bounded autonomous progression. Budgets, never authority. */
export interface AgentLimits {
  /** How many model invocations this Execution may make in total. */
  readonly maxModelCalls: number;
  /** How many operations one model step may request at once. Fan-out, not strategy. */
  readonly maxOperationCallsPerStep: number;
  /** How many messages the information branch may carry into a model call. */
  readonly maxContextMessages: number;
}

export const DEFAULT_AGENT_LIMITS: AgentLimits = Object.freeze({
  maxModelCalls: 8,
  maxOperationCallsPerStep: 4,
  maxContextMessages: 64,
});

/**
 * An authored request to read named Structured Memory fields into the model's information context.
 *
 * A *request*, not authority - the exact counterpart of `operations` on the operation branch:
 *
 * ```text
 * spec.structuredMemory.read.keys   what the author would like read
 * read authority / grant            what the deployment decided is readable
 * bound Structured Memory view      what actually exists
 *          ↓ intersection
 * authorized read snapshot          what the model is shown
 * ```
 *
 * Absent means no memory read - reading is never implicit, exactly as exposure is never implicit.
 * Writing a key here neither grants read access to it nor makes it appear if it is unwritten.
 */
export interface AgentStructuredMemoryRead {
  /** The field keys the author would like read. Non-empty, unique. Intersected with read authority. */
  readonly keys: readonly string[];
}

/**
 * The authored Structured Memory spec.
 *
 * Deliberately a single optional `read` member rather than a general memory-form union. F.1 is the
 * read path; a write-exposure request (F.1.1) or Working Notes are separate future shapes, added
 * here only when they exist.
 */
export interface AgentStructuredMemorySpec {
  readonly read?: AgentStructuredMemoryRead;
}

export interface AgentSpec {
  /** Logical model plus the portable features this Agent genuinely needs. Never a provider id. */
  readonly model: LogicalModelRequest;
  /** The Agent's standing instructions. Information, compiled by the information branch. */
  readonly instructions: string;
  /** Which authorized operations to expose. Absent means none: exposure is never implicit. */
  readonly operations?: OperationExposureRequest;
  /** Which Structured Memory fields to request into context. Absent means none: reading is never implicit. */
  readonly structuredMemory?: AgentStructuredMemorySpec;
  readonly limits?: AgentLimits;
  readonly completion?: AgentCompletionMode;
}

/** Authoring shape. Identical today; separate so `defineAgent` has a validation boundary. */
export interface AgentSpecInput {
  readonly model: LogicalModelRequest;
  readonly instructions: string;
  readonly operations?: OperationExposureRequest;
  readonly structuredMemory?: AgentStructuredMemorySpec;
  readonly limits?: Partial<AgentLimits>;
  readonly completion?: AgentCompletionMode;
}

/** The authored Structured Memory read request, or `null` when the Agent asked for none. */
export function agentStructuredMemoryRead(spec: AgentSpec): AgentStructuredMemoryRead | null {
  return spec.structuredMemory?.read ?? null;
}

export function agentLimits(spec: AgentSpec): AgentLimits {
  return { ...DEFAULT_AGENT_LIMITS, ...(spec.limits ?? {}) };
}

export function agentCompletionMode(spec: AgentSpec): AgentCompletionMode {
  return spec.completion ?? "respond_and_wait";
}
