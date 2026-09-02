/**
 * The Agent spec: portable authored data for a model-directed Execution.
 *
 * Slice A left this as `JsonObject` so the substrate would not guess at this slice. This is the
 * replacement, and like the Workflow spec it is chosen by what it *cannot* contain. An Agent
 * definition names a logical model, its instructions, its bounds, and the actions/information it
 * would like exposed. It holds no provider client, API key, executor, store, Harness, capability
 * catalog, authority grant, Active View, model projection, provider tool schema, application
 * principal, or protocol type. `definitions/validation.ts` enforces the plain-JSON half, and the
 * shapes here enforce the rest by having nowhere to put them.
 *
 * Authored exposure is only a request. Capability-operation refs are intersected with the
 * runtime-owned operation ceiling and catalog; Structured Memory read/write keys go through their
 * own independent authority branches and bound declarations. Writing a name here neither grants it
 * nor makes it appear.
 *
 * Bounds are runtime limits, not permissions. `maxModelCalls` says how much autonomous progression
 * may occur; it says nothing about whether any action is allowed.
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
  /**
   * Provider callable-interface fan-out for one step. `call_operations` is retained provider/tool
   * protocol vocabulary; these calls may resolve to more than capability operations.
   */
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
 * ```text
 * spec.structuredMemory.read.keys   what the author would like read
 * read authority / grant            what the deployment decided is readable
 * bound Structured Memory view      what actually exists
 *          ↓ intersection
 * authorized read snapshot          what the model is shown
 * ```
 *
 * Absent means no memory read. A key here grants nothing and need not exist.
 */
export interface AgentStructuredMemoryRead {
  /** Non-empty, unique field keys, intersected with independent read authority. */
  readonly keys: readonly string[];
}

/**
 * An authored request to expose exact Structured Memory write interfaces to the model.
 *
 * ```text
 * spec.structuredMemory.write.keys  what the author would like exposed
 * write-exposure authority          what may be visible now
 * bound Structured Memory view      which declared schemas exist
 *          ↓ intersection
 * authorized write-interface view   what may enter the model action projection
 * ```
 *
 * Absent means no write-exposure work. A key here is not permission and is never a model-supplied
 * payload field: the eventual projection binding owns the exact key identity.
 */
export interface AgentStructuredMemoryWrite {
  /** Non-empty, unique field keys, intersected with independent write-exposure authority. */
  readonly keys: readonly string[];
}

/** Independent Structured Memory information/action requests, not a general memory-form union. */
export interface AgentStructuredMemorySpec {
  readonly read?: AgentStructuredMemoryRead;
  readonly write?: AgentStructuredMemoryWrite;
}

export interface AgentSpec {
  /** Logical model plus the portable features this Agent genuinely needs. Never a provider id. */
  readonly model: LogicalModelRequest;
  /** The Agent's standing instructions. Information, compiled by the information branch. */
  readonly instructions: string;
  /** Which authorized capability operations to expose. Absent means none. */
  readonly operations?: OperationExposureRequest;
  /** Independent read-information and write-action requests. Absent means no memory work. */
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

/** The authored Structured Memory write-exposure request, or `null` when none was authored. */
export function agentStructuredMemoryWrite(spec: AgentSpec): AgentStructuredMemoryWrite | null {
  return spec.structuredMemory?.write ?? null;
}

export function agentLimits(spec: AgentSpec): AgentLimits {
  return { ...DEFAULT_AGENT_LIMITS, ...(spec.limits ?? {}) };
}

export function agentCompletionMode(spec: AgentSpec): AgentCompletionMode {
  return spec.completion ?? "respond_and_wait";
}
