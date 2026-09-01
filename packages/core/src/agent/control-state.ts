/**
 * AgentControlState: the Agent controller's serializable semantic progress.
 *
 * Everything here survives `JSON.parse(JSON.stringify(x))` unchanged, because that is the
 * difference between progress the runtime can persist and a process-local object graph pretending
 * to be state. What is deliberately absent is the point: no promises, no closures, no provider
 * clients, no `AbortSignal`s, no executor instances, no store or Harness handles, no resolver
 * objects, no raw provider payloads.
 *
 * ## The invariant this file exists to hold
 *
 * A model invocation may outlive its Activation. When it does, the Activation that resumes must
 * interpret the answer with **the same projection and the same information the invocation was
 * given**, not with whatever the current Active View would produce now. So both are written down
 * before yielding:
 *
 * ```text
 * invocation = { step, information, projection, continuation }
 * ```
 *
 * The resuming Activation rebuilds the request from that record, derives the same resumption key,
 * and is handed the stored result. It does not re-resolve the view, does not rebuild the
 * projection, and does not re-dispatch the provider call.
 *
 * Events that arrive while the invocation is outstanding are queued by the runtime's exclusive
 * suspension and delivered to the Activation that resumes. They are folded into `messages` for a
 * *later* step; they cannot retroactively change what the in-flight invocation saw, because what it
 * saw is already frozen in `invocation.information`.
 *
 * ## Correlating operation results
 *
 * `pending` is one entry per operation the current step requested, carrying the correlation the
 * controller chose. Entries are scoped to the step that made them, so a result from step 2 matches
 * nothing in step 3, and an entry that has already settled ignores a duplicate result rather than
 * being answered twice.
 */

import type { ModelMessage } from "../model/types.ts";
import type { ModelActionTarget } from "../operations/action-target.ts";
import type { ModelOperationProjection } from "../operations/projection.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";
import type { AgentModelObservation } from "./observation-projection.ts";
import type { AgentObservationOutcome } from "./observations.ts";

/**
 * Version 2.
 *
 * Version 1 persisted a projection binding and a pending call as a flat `capability`/`operation`
 * pair, and persisted observations as the semantic record rather than as what the model was shown.
 * Both are now typed: a binding names a `ModelActionTarget`, and an invocation snapshot records the
 * projected observations. Old progress is *refused* rather than reinterpreted - see
 * [`readAgentControlState`](#readAgentControlState) - because a shape that could be read either way
 * would silently resolve a stored alias against a guess.
 */
export const AGENT_CONTROL_STATE_VERSION = 2;

/**
 * The compiled information one invocation was given. Frozen at dispatch, replayed on resume.
 *
 * Structurally an `AgentInformationContext`; named separately because this one is *persisted*, and
 * a field added to the live context for a provider's benefit must not silently become part of what
 * the runtime stores.
 */
export interface AgentInformationSnapshot {
  readonly system: string;
  readonly messages: readonly ModelMessage[];
}

/**
 * One model invocation that has been prepared, and possibly issued.
 *
 * Present while an invocation is in flight or has just been interpreted. `continuation` is whatever
 * serializable state the executor asked to carry into this call - a framework's own conversation
 * snapshot, for instance - and the kernel never inspects it.
 */
export interface AgentInvocationState {
  /** 1-based step this invocation belongs to. Part of the resumption key and the correlations. */
  readonly step: number;
  readonly information: AgentInformationSnapshot;
  readonly projection: ModelOperationProjection;
  readonly continuation: JsonValue | null;
  /**
   * The settled results this invocation was given, as the model was shown them.
   *
   * The projected form rather than the semantic one, deliberately: what must survive a resumption is
   * what the call actually saw, and a later change of observation strategy must not retroactively
   * change that.
   */
  readonly observations: readonly AgentModelObservation[];
  /**
   * How long the message history was when this invocation was issued.
   *
   * Its answer belongs at that position, not at the end. Input that arrives while the call is
   * outstanding is appended as it arrives - it must not be lost - so without this the transcript
   * would show the Agent being asked a second question before it answered the first.
   */
  readonly messageCount: number;
}

export interface AgentPendingCall {
  /** The controller-chosen correlation the matching result Event will carry. */
  readonly correlationId: string;
  /** Which projection binding produced this call. Integrity data; it authorizes nothing. */
  readonly bindingId: string;
  readonly alias: string;
  /** What the binding resolved to. Typed for the same reason the binding is. */
  readonly target: ModelActionTarget;
  /** The provider's own id for the call it emitted, when it supplied one. */
  readonly callId: string | null;
  readonly settled: boolean;
  readonly outcome: AgentObservationOutcome | null;
  readonly observation: JsonValue | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}

export interface AgentControlState {
  readonly version: number;
  /** Model invocations completed. The next one is `step + 1`. */
  readonly step: number;
  /** Whether start input has been observed. Before that there is nothing to reason about. */
  readonly started: boolean;
  /** User input, model responses, and observations, in order. The information branch's material. */
  readonly messages: readonly ModelMessage[];
  /** The prepared or in-flight invocation, or `null` between steps. */
  readonly invocation: AgentInvocationState | null;
  /** Executor-owned continuation carried between steps. Opaque JSON to the kernel. */
  readonly continuation: JsonValue | null;
  /** Operations the current step requested. Empty means nothing is outstanding. */
  readonly pending: readonly AgentPendingCall[];
  /** How many times this Agent has responded without terminating. `response != terminal result`. */
  readonly responses: number;
}

export function initialAgentControlState(): AgentControlState {
  return {
    version: AGENT_CONTROL_STATE_VERSION,
    step: 0,
    started: false,
    messages: [],
    invocation: null,
    continuation: null,
    pending: [],
    responses: 0,
  };
}

export function isAgentControlState(value: unknown): value is AgentControlState {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate["step"] === "number" &&
    typeof candidate["started"] === "boolean" &&
    Array.isArray(candidate["messages"]) &&
    Array.isArray(candidate["pending"])
  );
}

/**
 * What reading persisted progress can produce.
 *
 * Three answers rather than two. "Nothing is stored yet" and "something is stored that this build
 * cannot interpret" are different situations with different correct responses, and collapsing them
 * into `null` would restart an Agent that was mid-progression as though it had never begun.
 */
export type AgentControlStateRead =
  /** A freshly created Execution: no progress has been written. */
  | { readonly status: "absent" }
  | { readonly status: "read"; readonly state: AgentControlState }
  /** Written by a different version of this shape. Refused, never guessed at. */
  | { readonly status: "unsupported"; readonly version: number };

/**
 * Reads persisted progress back, tolerating the empty progress a freshly created Execution has.
 *
 * A version this build does not know is reported rather than coerced. Pre-v1 the repository carries
 * no migration, and that is a deliberate simplicity rather than an oversight: reading a v1 record
 * as a v2 one would resolve a stored alias against a target that is not there, which is worse than
 * refusing to run.
 */
export function readAgentControlState(progress: JsonObject): AgentControlStateRead {
  if (!isAgentControlState(progress)) return { status: "absent" };
  const state = progress as unknown as AgentControlState;
  const version = typeof state.version === "number" ? state.version : 1;
  if (version !== AGENT_CONTROL_STATE_VERSION) return { status: "unsupported", version };
  return {
    status: "read",
    state: {
      version,
      step: state.step,
      started: state.started,
      messages: state.messages ?? [],
      invocation: state.invocation ?? null,
      continuation: state.continuation ?? null,
      pending: state.pending ?? [],
      responses: state.responses ?? 0,
    },
  };
}

/** Control state as the `JsonObject` the kernel persists. Structural proof that it is data. */
export function toAgentControllerProgress(state: AgentControlState): JsonObject {
  return state as unknown as JsonObject;
}

export function unsettledAgentCalls(state: AgentControlState): readonly AgentPendingCall[] {
  return state.pending.filter((call) => !call.settled);
}

/**
 * Applies one settled outcome.
 *
 * Idempotent by construction: an entry that has already settled is left exactly as it was, so a
 * duplicate result Event cannot answer the same requirement twice or overwrite the authoritative
 * first answer. A correlation matching no entry of this step changes nothing, which is what makes a
 * stale result from an earlier step harmless.
 */
export function settleAgentCall(
  state: AgentControlState,
  correlationId: string,
  outcome: AgentObservationOutcome,
  detail: { readonly observation?: JsonValue; readonly error?: { readonly code: string; readonly message: string } },
): { readonly state: AgentControlState; readonly settled: boolean } {
  let settled = false;
  const pending = state.pending.map((call) => {
    if (call.correlationId !== correlationId || call.settled) return call;
    settled = true;
    return {
      ...call,
      settled: true,
      outcome,
      observation: detail.observation ?? null,
      error: detail.error ?? null,
    };
  });
  return settled ? { state: { ...state, pending }, settled } : { state, settled };
}
