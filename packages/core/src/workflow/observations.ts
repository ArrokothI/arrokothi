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

/**
 * A capability request a Stage body wants performed.
 *
 * `key` is Stage-local: the Stage names its own request ("retrieval", "pricing"), and the
 * WorkflowController scopes that name to the current Stage visit before it ever becomes a
 * correlation. Stage logic therefore never learns, and never needs, a runtime-minted `EffectId`.
 *
 * `UseCapability` is the only Effect a Slice-C Stage can request. Memory writes, child calls,
 * messages, and user input belong to slices that own them; a Stage that could ask for one now would
 * be asking for something the runtime cannot honestly answer.
 */
export interface StageCapabilityRequest {
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

/**
 * How a required operation settled.
 *
 * Mirrors the Event vocabulary rather than compressing it: `denied` is policy refusing, `rejected`
 * is a request that was never answerable, `failed` is a definite non-event, `unknown` is the
 * ambiguous case where the operation may well have happened, and `declined` (Slice E.2.1) is a human
 * declining an exact-payload mechanical confirmation - nothing dispatched, policy did not deny.
 * Collapsing any pair of these would make a Stage confidently wrong about the world.
 */
export type StageObservationOutcome = "completed" | "failed" | "unknown" | "denied" | "rejected" | "declined";

export interface StageObservation {
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

export function isSuccessfulObservation(observation: StageObservation): boolean {
  return observation.outcome === "completed";
}

/** The observation for one Stage-local key, if it settled during this visit. */
export function findObservation(
  observations: readonly StageObservation[],
  key: string,
): StageObservation | undefined {
  return observations.find((observation) => observation.key === key);
}
