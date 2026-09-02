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
 * interpret the answer with **the same projection, the same local-control snapshot, and the same
 * information the invocation was given**, not with whatever the current Active View or authored spec
 * would produce now. So all of them are written down before yielding:
 *
 * ```text
 * invocation = { step, information, projection, localControls, continuation }
 * ```
 *
 * The resuming Activation rebuilds the request from that record, derives the same resumption key,
 * and is handed the stored result. It does not re-resolve the view, does not rebuild either
 * projection, does not re-evaluate authored local controls, and does not re-dispatch the provider
 * call.
 *
 * Events that arrive while the invocation is outstanding are queued by the runtime's exclusive
 * suspension and delivered to the Activation that resumes. They are folded into `messages` for a
 * *later* step; they cannot retroactively change what the in-flight invocation saw, because what it
 * saw is already frozen in `invocation.information`.
 *
 * ## Correlating action results
 *
 * `pending` is one entry per model action the current step requested, carrying the correlation the
 * controller chose. Entries are scoped to the step that made them, so a result from step 2 matches
 * nothing in step 3, and an entry that has already settled ignores a duplicate result rather than
 * being answered twice.
 */

import type { WorkingNotesFrame } from "../execution/working-notes.ts";
import { emptyWorkingNotesFrame, workingNotesFrameIssues } from "../execution/working-notes.ts";
import type { ModelMessage } from "../model/types.ts";
import type { ModelActionTarget } from "../operations/action-target.ts";
import type { ModelLocalControlTarget, LocalModelControlProjection } from "../operations/local-model-control.ts";
import { localModelControlProjectionIssues } from "../operations/local-model-control.ts";
import type { ModelActionProjection } from "../operations/projection.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";
import type { AgentModelObservation } from "./observation-projection.ts";
import type { AgentObservationOutcome } from "./observations.ts";

/**
 * Version 3.
 *
 * Version 1 persisted a projection binding and a pending call as a flat `capability`/`operation`
 * pair, and persisted observations as the semantic record rather than as what the model was shown.
 * Version 2 typed both: a binding names a `ModelActionTarget`, and an invocation snapshot records
 * the projected observations.
 *
 * Version 3 (Slice F.2a) adds `workingNotes` (the Agent controller's local scratch frame) to the
 * top level and `invocation.localControls` (the exact controller-local model-control snapshot) to
 * an in-flight invocation. Both are part of persisted semantic progression. Version 2 is *refused*
 * - see [`readAgentControlState`](#readAgentControlState) - and a version-3 record whose
 * `workingNotes` frame is missing or malformed is refused too: the runtime never restarts corrupted
 * progress or normalises it silently. Pre-v1 the repository carries no migration.
 */
export const AGENT_CONTROL_STATE_VERSION = 3;

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
  /** The authority-governed model-action snapshot this invocation was shown (F.1.1). */
  readonly projection: ModelActionProjection;
  /**
   * The controller-local model-control snapshot this invocation was shown (F.2a).
   *
   * A separate category from `projection`: it carries no authority and is derived from authored
   * local enablement, not an Active View. Persisted for the same reason `projection` is - a returned
   * `working_notes_set` alias resolves through *this* exact snapshot on re-entry, and neither
   * snapshot is rebuilt.
   */
  readonly localControls: LocalModelControlProjection;
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
  /**
   * What the binding resolved to. Typed for the same reason the binding is.
   *
   * A `ModelLocalControlTarget` (`working_notes_set`) here always belongs to an already-settled
   * entry - a local control never has an outstanding runtime result.
   */
  readonly target: ModelActionTarget | ModelLocalControlTarget;
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
  /** Model actions the current step requested. Empty means nothing is outstanding. */
  readonly pending: readonly AgentPendingCall[];
  /** How many times this Agent has responded without terminating. `response != terminal result`. */
  readonly responses: number;
  /**
   * The Agent controller's local Working Notes: temporary scratch state it owns and persists with
   * the rest of its progress. Not a runtime-owned record, not read through the Harness, not
   * inherited by a child. A fresh Agent, and one that authored no `workingNotes`, carries the
   * empty frame.
   */
  readonly workingNotes: WorkingNotesFrame;
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
    workingNotes: emptyWorkingNotesFrame(),
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
  | { readonly status: "unsupported"; readonly version: number }
  /**
   * The right version, but its content violates an invariant this build requires (today: a missing
   * or malformed `workingNotes` frame). Refused - the controller fails the Execution deterministically
   * rather than restarting corrupted progress or normalising it into something the model never wrote.
   */
  | { readonly status: "invalid"; readonly reason: string };

/**
 * Reads persisted progress back, tolerating the empty progress a freshly created Execution has.
 *
 * A version this build does not know is reported rather than coerced. Pre-v1 the repository carries
 * no migration, and that is a deliberate simplicity rather than an oversight: reading an older
 * record would resolve a stored alias against a target that is not there, which is worse than
 * refusing to run.
 *
 * A version-3 record must also carry a valid `workingNotes` frame and, when an invocation is in
 * flight, an honest `invocation.localControls` snapshot (a returned alias is resolved against it on
 * re-entry). Neither is defaulted or repaired: "no frame persisted" / "no local-control snapshot
 * persisted" is a corrupt v3 record, not the same as a fresh Execution, and silently substituting
 * one would hide the corruption or resolve a stored alias against a guess.
 */
function persistedInvocationIssues(value: unknown): readonly string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return ["expected an invocation object"];
  }
  const record = value as Record<string, unknown>;
  const issues: string[] = [];
  // The authority-governed action projection is F.1.1; a shallow shape check is enough to keep
  // callable-namespace reconstruction from throwing on a corrupt record.
  const projection = record["projection"] as Record<string, unknown> | null | undefined;
  if (
    projection === null ||
    typeof projection !== "object" ||
    Array.isArray(projection) ||
    typeof projection["projectionId"] !== "string" ||
    !Array.isArray(projection["bindings"])
  ) {
    issues.push("invocation.projection is missing or malformed");
  }
  // The controller-local model-control snapshot is F.2a and is validated in full.
  if (!Object.prototype.hasOwnProperty.call(record, "localControls") || record["localControls"] == null) {
    issues.push("invocation.localControls is missing");
  } else {
    for (const issue of localModelControlProjectionIssues(record["localControls"])) {
      issues.push(`invocation.localControls ${issue}`);
    }
  }
  return issues;
}

export function readAgentControlState(progress: JsonObject): AgentControlStateRead {
  if (!isAgentControlState(progress)) return { status: "absent" };
  const state = progress as unknown as AgentControlState;
  const version = typeof state.version === "number" ? state.version : 1;
  if (version !== AGENT_CONTROL_STATE_VERSION) return { status: "unsupported", version };

  const frame = (state as { workingNotes?: unknown }).workingNotes;
  if (frame === undefined || frame === null) {
    return { status: "invalid", reason: "version 3 Agent progress is missing its workingNotes frame" };
  }
  const frameIssues = workingNotesFrameIssues(frame);
  if (frameIssues.length > 0) {
    return { status: "invalid", reason: `persisted Working Notes frame is malformed: ${frameIssues.join("; ")}` };
  }

  const invocation = (state as { invocation?: unknown }).invocation;
  if (invocation !== undefined && invocation !== null) {
    const invocationIssues = persistedInvocationIssues(invocation);
    if (invocationIssues.length > 0) {
      return { status: "invalid", reason: `persisted invocation is malformed: ${invocationIssues.join("; ")}` };
    }
  }

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
      workingNotes: frame as WorkingNotesFrame,
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
