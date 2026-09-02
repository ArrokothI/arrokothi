/**
 * The model-facing observation projection: what a settled action *looks like* to a model.
 *
 * The action path already has a replaceable boundary at every layer:
 *
 * ```text
 * Catalog -> Effective Authority -> Active View -> ModelActionProjection -> the model
 * ```
 *
 * The return path needs one too, and for the same reason. `AgentActionObservation` is a semantic
 * fact - this action was requested, and this is what happened. How that fact is *rendered* for a
 * model is a strategy: concise or detailed, redacted or complete, truncated, paginated, summarised,
 * replaced by a stable reference, or rewritten so a failure tells the model what it could do next.
 * Those are model- and task-dependent decisions, and none of them is a semantic one.
 *
 * ```text
 * Event / settled action result          semantic, owned by the Harness
 *        ↓
 * AgentActionObservation                 semantic, owned by Agent progress
 *        ↓ replaceable
 * AgentModelObservation                     model-facing, owned by a strategy
 *        ↓
 * reference AgentExecutor / framework adapter
 * ```
 *
 * Swapping the projector changes what the model reads and changes nothing else: not the Event, not
 * the Effect, not the authorization decision, not the capability implementation, and not the
 * `AgentActionObservation` itself. That is the property the conformance suite asserts, and it is
 * the reason a provider or framework adapter must not do this shaping on its own - a second
 * independent renderer would be a second, invisible answer to the same question.
 *
 * What a projector may not be: it is handed one plain-data observation and returns plain data. It
 * has no Harness, no store, no Effect requester, no dispatcher, no authority, and no provider or
 * framework type. A projection is not an authorization, is not durable memory, and cannot cause
 * anything to happen.
 *
 * The two rendered forms exist because there are two honest consumers. A transcript needs one string
 * per observation; a framework that resumes a paused tool call needs a JSON value to hand back to
 * it. One strategy decides both, so the two cannot disagree about what the model was told.
 */

import type { JsonValue } from "../util/json.ts";
import type { AgentObservationOutcome, AgentActionObservation } from "./observations.ts";

/**
 * One observation as the model is shown it.
 *
 * Correlation fields survive because a stateful executor has to hand the result back to the exact
 * call that produced it; they are not part of what is rendered. `content` and `value` are.
 */
export interface AgentModelObservation {
  /** The provider's own id for the call this answers, when it supplied one. Correlation only. */
  readonly callId: string | null;
  /** The model-facing name the action was shown under, for the invocation that requested it. */
  readonly alias: string;
  /** Carried through so a strategy downstream can distinguish success from denial without parsing. */
  readonly outcome: AgentObservationOutcome;
  /** The transcript rendering: one message body. */
  readonly content: string;
  /** The structured rendering: provider-neutral JSON, for an adapter that resumes a tool call. */
  readonly value: JsonValue;
}

/** Non-authoritative context a projector may use. Everything here is descriptive. */
export interface AgentObservationProjectionContext {
  /** 1-based Agent step this observation is being shown to. */
  readonly step?: number;
}

export interface AgentObservationProjector {
  /**
   * Renders one semantic observation for a model.
   *
   * Pure and total: the same observation renders the same way, so a resumed Activation replaying a
   * persisted invocation and the Activation that produced it cannot disagree about what was shown.
   */
  project(
    observation: AgentActionObservation,
    context?: AgentObservationProjectionContext,
  ): AgentModelObservation;
}

/**
 * The reference strategy: report faithfully and shape nothing.
 *
 * A success renders its observation as it stands; anything else renders the outcome together with
 * the code and message the runtime established. Denials, failures, and unknown outcomes are *not*
 * collapsed into "it didn't work", because a model that cannot tell an unknown outcome from a
 * failure will retry a consequential operation nobody knows the result of.
 *
 * It deliberately does not truncate, summarise, or redact. Those are real strategies and they are
 * exactly what this seam exists to make replaceable; guessing at one here would make the default
 * a policy rather than a baseline.
 */
export const referenceAgentObservationProjector: AgentObservationProjector = {
  project(observation: AgentActionObservation): AgentModelObservation {
    if (observation.outcome === "completed") {
      const value = observation.observation ?? null;
      return {
        callId: observation.callId,
        alias: observation.alias,
        outcome: observation.outcome,
        content: typeof value === "string" ? value : JSON.stringify(value),
        value,
      };
    }
    const error = {
      outcome: observation.outcome,
      code: observation.error?.code ?? observation.outcome,
      message: observation.error?.message ?? observation.outcome,
    };
    return {
      callId: observation.callId,
      alias: observation.alias,
      outcome: observation.outcome,
      content: JSON.stringify({ error: { code: error.code, message: error.message } }),
      value: { error },
    };
  },
};

/** Projects a whole step's worth of observations with one strategy. */
export function projectAgentObservations(
  projector: AgentObservationProjector,
  observations: readonly AgentActionObservation[],
  context?: AgentObservationProjectionContext,
): readonly AgentModelObservation[] {
  return observations.map((observation) => projector.project(observation, context));
}
