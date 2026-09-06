/**
 * What an Agent observed about one projected action it requested.
 *
 * The vocabulary mirrors the Effect-result Event kinds because it *is* those kinds, folded into
 * Agent progress: a denial and an unknown outcome are answers the Agent must be able to report to
 * its model as faithfully as a success. Collapsing them into "it didn't work" would let a model
 * retry a consequential operation whose outcome nobody actually knows.
 *
 * How one of these is *shown* to a model is deliberately not decided here. That is a replaceable
 * strategy and lives behind [`observation-projection.ts`](observation-projection.ts); this record is
 * the semantic fact the strategy projects.
 *
 * Kept separate from the Workflow Stage observation vocabulary on purpose. The two are structurally
 * similar and semantically unrelated: one is a Stage barrier requirement, the other is a step in an
 * open-ended progression, and merging them would make one change to either affect the other.
 */

import type { ModelActionTarget } from "../operations/action-target.ts";
import type { ModelLocalControlTarget } from "../operations/local-model-control.ts";
import type { JsonValue } from "../util/json.ts";

export type AgentObservationOutcome =
  | "completed"
  | "failed"
  | "unknown"
  | "denied"
  | "rejected"
  /**
   * A human declined an exact-payload mechanical confirmation for this operation.
   * Nothing dispatched, no executor ran, and policy did not deny - the human declined execution. The
   * Agent settles the pending call and makes its next model decision; the projector must render this
   * truthfully rather than as `denied` / `failed` / `cancelled`.
   */
  | "declined"
  /**
   * A versioned Structured Memory write lost an optimistic compare-and-set on the bound view
   * revision. The request was valid, authorized, and (where gated) confirmed - nothing
   * was written. Distinct from `denied` / `rejected` / `failed`: the write definitely did not
   * commit, and the controller may re-read and retry. The reference Agent's model-directed write
   * callable never supplies `expectedRevision`, so this outcome is reachable only for a
   * trusted/programmatic versioned write; the vocabulary and mapping exist so a `memory.write_conflict`
   * Event is never rendered as a capability failure.
   */
  | "conflicted";

export const AGENT_OBSERVATION_OUTCOMES: readonly AgentObservationOutcome[] = [
  "completed",
  "failed",
  "unknown",
  "denied",
  "rejected",
  "declined",
  "conflicted",
];

/**
 * One settled action result, as the executor sees it.
 *
 * `callId` is the provider's own correlation for the call it emitted, carried through so a stateful
 * executor can hand the observation back to the exact tool use that produced it. It is correlation
 * data; it authorizes nothing.
 */
export interface AgentActionObservation {
  readonly callId: string | null;
  /** The model-facing name the action was shown under, for this invocation. */
  readonly alias: string;
  /**
   * What that name resolved to. The same typed target the binding carried - an authority-governed
   * `ModelActionTarget`, or a controller-local `ModelLocalControlTarget` (`working_notes_set`).
   */
  readonly target: ModelActionTarget | ModelLocalControlTarget;
  readonly outcome: AgentObservationOutcome;
  readonly observation?: JsonValue;
  readonly error?: { readonly code: string; readonly message: string };
}

export function isSuccessfulAgentObservation(observation: AgentActionObservation): boolean {
  return observation.outcome === "completed";
}
