/**
 * What a Stage asked the runtime for, and what came back.
 *
 * These two shapes are the entire vocabulary a Stage body uses to interact with anything outside
 * its own computation, and both are plain data. A Stage *returns* requests upward; it is never
 * handed something that performs them. The results come back as observations the controller
 * collected from delivered Events, never as a value an executor handed to Stage code.
 *
 * The observation union keeps the distinction the whole gateway is built on:
 *
 * ```text
 * settled != successful
 * ```
 *
 * A barrier settles when its authoritative result Event arrives, whatever that Event says. Denied,
 * failed, and unknown are all answers, and Stage logic must be able to see which one it got and
 * decide what to do. Nothing here lets "the barrier stopped waiting" be read as "the operation
 * worked".
 */

import type { JsonObject, JsonValue } from "../util/json.ts";
import type { EffectIdempotencyScope } from "../effects/fingerprint.ts";
import type { BranchId, ForkId, StageId } from "./spec.ts";
import type { StageResult } from "./stage-result.ts";

/**
 * A capability request a Stage body wants performed.
 *
 * `key` is Stage-local: the Stage names its own request ("retrieval", "pricing"), and the
 * WorkflowController scopes that name to the current Stage visit before it ever becomes a
 * correlation. Stage logic therefore never learns, and never needs, a runtime-minted `EffectId`.
 *
 * `UseCapability` remains the default. Slice F.0 adds a discriminated Structured Memory request;
 * child calls remain owned by their dedicated Stage kinds, and messages/user input stay deferred.
 */
export interface StageCapabilityRequest {
  /** Omitted for backward-compatible authored data; when present, discriminates the request. */
  readonly kind?: "use_capability";
  /** Stage-local name for this request. Unique within one Stage visit. */
  readonly key: string;
  readonly capability: string;
  readonly operation: string;
  readonly input?: JsonObject;
  /** Logical resource bindings. Never contents, never credentials. */
  readonly resources?: readonly string[];
  /** The operation deadline. Unrelated to how long any Activation waits for it. */
  readonly deadlineMs?: number;
  readonly idempotency?: EffectIdempotencyScope;
}

/** One schema-bound Structured Memory write required by a Function Stage. */
export interface StageMemoryWriteRequest {
  readonly kind: "write_memory";
  /** Stage-local correlation key, distinct from the memory field identity. */
  readonly key: string;
  readonly memoryKey: string;
  readonly value: JsonValue;
  /**
   * Optional optimistic-concurrency precondition (Slice G.0): a non-negative integer bound-view
   * revision. Absent = unconditional (the accepted F.0 behaviour). Present and stale ⇒ the barrier
   * settles `conflicted` and nothing is written. This lets deterministic Workflow code exercise G.0
   * through the ordinary Effect path.
   */
  readonly expectedRevision?: number;
}

export type StageEffectRequest = StageCapabilityRequest | StageMemoryWriteRequest;

/**
 * How a required operation settled.
 *
 * Mirrors the Event vocabulary rather than compressing it: `denied` is policy refusing, `rejected`
 * is a request that was never answerable, `failed` is a definite non-event, `unknown` is the
 * ambiguous case where the operation may well have happened, `declined` (Slice E.2.1) is a human
 * declining an exact-payload mechanical confirmation - nothing dispatched, policy did not deny - and
 * `conflicted` (Slice G.0) is a valid, authorized versioned `WriteMemory` whose optimistic
 * precondition was stale, so nothing was written. Collapsing any pair of these would make a Stage
 * confidently wrong about the world.
 */
export type StageObservationOutcome =
  | "completed"
  | "failed"
  | "unknown"
  | "denied"
  | "rejected"
  | "declined"
  | "conflicted";

export interface StageCapabilityObservation {
  /** The Stage-local key this answers. */
  readonly key: string;
  readonly outcome: StageObservationOutcome;
  readonly capability: string;
  readonly operation: string;
  /** Present only for `completed`. */
  readonly observation?: JsonValue;
  /** Present for every outcome except `completed`. */
  readonly error?: { readonly code: string; readonly message: string };
}

export interface StageMemoryWriteObservation {
  readonly key: string;
  readonly outcome: StageObservationOutcome;
  readonly effectKind: "write_memory";
  readonly memoryKey: string;
  readonly observation?: JsonValue;
  readonly error?: { readonly code: string; readonly message: string };
}

export type StageObservation = StageCapabilityObservation | StageMemoryWriteObservation;

export function isSuccessfulObservation(observation: StageObservation): boolean {
  return observation.outcome === "completed";
}

// -- explicit join surface (Slice G.1) ------------------------------------------

/**
 * One branch's final result, as the downstream Stage sees it at the join.
 *
 * This is a *value*, not a handle: the downstream Stage receives each branch's final `text | none`
 * result plus its authored identity, and never a reference to branch progress or branch internals.
 */
export interface WorkflowJoinedBranchResult {
  readonly branchId: BranchId;
  readonly stageId: StageId;
  readonly result: StageResult;
}

/**
 * The read-only snapshot a fork's explicit join hands to its immediate downstream Function Stage.
 *
 * `branches` is in authored branch order - never completion order. It is `null` for every ordinary
 * Stage visit and present only on the visit a join created. The downstream Stage's ordinary `input`
 * is still the fork's original incoming `StageResult`; this carries the parallel results alongside
 * it without changing the `text | none` cross-Stage contract.
 */
export interface WorkflowJoinContext {
  readonly forkId: ForkId;
  readonly branches: readonly WorkflowJoinedBranchResult[];
}

/** The observation for one Stage-local key, if it settled during this visit. */
export function findObservation(
  observations: readonly StageObservation[],
  key: string,
): StageObservation | undefined {
  return observations.find((observation) => observation.key === key);
}
