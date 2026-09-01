/**
 * What an Agent observed about one operation it requested.
 *
 * The vocabulary mirrors the Effect-result Event kinds because it *is* those kinds, folded into
 * Agent progress: a denial and an unknown outcome are answers the Agent must be able to report to
 * its model as faithfully as a success. Collapsing them into "it didn't work" would let a model
 * retry a consequential operation whose outcome nobody actually knows.
 *
 * Kept separate from the Workflow Stage observation vocabulary on purpose. The two are structurally
 * similar and semantically unrelated: one is a Stage barrier requirement, the other is a step in an
 * open-ended progression, and merging them would make one change to either affect the other.
 */

import type { JsonValue } from "../util/json.ts";

export type AgentObservationOutcome = "completed" | "failed" | "unknown" | "denied" | "rejected";

export const AGENT_OBSERVATION_OUTCOMES: readonly AgentObservationOutcome[] = [
  "completed",
  "failed",
  "unknown",
  "denied",
  "rejected",
];

/**
 * One settled operation result, as the executor sees it.
 *
 * `callId` is the provider's own correlation for the call it emitted, carried through so a stateful
 * executor can hand the observation back to the exact tool use that produced it. It is correlation
 * data; it authorizes nothing.
 */
export interface AgentOperationObservation {
  readonly callId: string | null;
  /** The model-facing name the operation was shown under, for this invocation. */
  readonly alias: string;
  readonly capability: string;
  readonly operation: string;
  readonly outcome: AgentObservationOutcome;
  readonly observation?: JsonValue;
  readonly error?: { readonly code: string; readonly message: string };
}

export function isSuccessfulAgentObservation(observation: AgentOperationObservation): boolean {
  return observation.outcome === "completed";
}

/** How one observation is rendered into the information branch. */
export function renderAgentObservation(observation: AgentOperationObservation): string {
  if (observation.outcome === "completed") {
    const value = observation.observation;
    return typeof value === "string" ? value : JSON.stringify(value ?? null);
  }
  return JSON.stringify({
    error: {
      code: observation.error?.code ?? observation.outcome,
      message: observation.error?.message ?? observation.outcome,
    },
  });
}
