/**
 * ControllerResumption: the runtime's record of one piece of controller-local asynchronous work.
 *
 * This is deliberately **not** a `PendingOperation`, and the difference is semantic rather than
 * organisational. A PendingOperation records runtime-mediated semantic work whose settlement
 * normally produces an Event; a ControllerResumption records work that never crossed the runtime
 * boundary at all - a model-provider call is local to the Execution in exactly the sense that
 * parsing a string is - and whose settlement only makes a controller continuation runnable again.
 *
 * Read the record as a list of things it does not have:
 *
 * ```text
 * no effectId            no idempotency key
 * no effectKind          no dispatch state
 * no resultEventId       no "unknown" outcome
 * no authorization       no journal phase
 * ```
 *
 * Every one of those belongs to work the world may have observed. Local work either produces a
 * value/failure or is invalidated because later semantic input overtook it; none of those outcomes
 * is delivered to a mailbox and nothing here is an Event.
 *
 * `observedRevision` records the `ExecutionContext.revision` the suspending Activation read. It is
 * retained provenance, and E.1 deliberately does **not** use a naive `current.revision !==
 * observedRevision` equality to detect staleness: `ExecutionContext.revision` also advances for
 * ordinary lifecycle bookkeeping (`READY -> RUNNING`, `RUNNING -> WAITING`, `WAITING -> READY`), so
 * that comparison would classify a normal suspension as an intervening semantic mutation. See
 * [`../../../../docs/development/016-slice-e1-interleaving-peer-interaction.md`](../../../../docs/development/016-slice-e1-interleaving-peer-interaction.md).
 *
 * ## `invalidated` (Slice E.1 / E.1.1)
 *
 * E.1 lets an explicitly opted-in interleave Event overtake a still-pending resumption. When that
 * happens the resumption is moved to `invalidated` in the same transaction that queues the Event and
 * makes the Execution `READY`. An invalidated record is honest history:
 *
 * ```text
 * - its underlying promise may still finish, but that late result cannot wake the Execution,
 *   cannot become an Event, and is never returned by stable-key recovery
 * - ordinary WAITING-time invalidation is a no-op once settled; suspension-boundary invalidation
 *   may discard work that settled only after the Event already committed
 * - re-running the same semantic stable key after invalidation starts fresh work
 * ```
 *
 * Everything stored is plain JSON. A Promise, a thunk, a provider client, or an `AbortSignal` in
 * one of these records would make the runtime non-portable in the one place that most looks like it
 * could get away with it, so the value is validated and round-tripped before it is ever written.
 */

import type { JsonValue } from "../util/json.ts";
import { cloneJson, jsonIssues } from "../util/json.ts";
import type { ActivationId, ControllerResumptionId, ExecutionId } from "./ids.ts";

/** A normalized local failure. The same shape whether the work rejected fast or slow. */
export interface ControllerResumptionFailure {
  readonly code: string;
  readonly message: string;
}

/** What one piece of controller-local work produced. There is no `unknown` here, on purpose. */
export type ControllerResumptionOutcome =
  | { readonly status: "settled"; readonly value: JsonValue }
  | { readonly status: "failed"; readonly failure: ControllerResumptionFailure };

/**
 * ```text
 * pending      the work has not finished and nothing has overtaken it
 * settled      the work finished (value or normalized failure); its outcome is reusable by key
 * invalidated  an interleave Event overtook it; its late outcome is obsolete and never reusable
 * ```
 */
export type ControllerResumptionState = "pending" | "settled" | "invalidated";

export interface ControllerResumption {
  readonly resumptionId: ControllerResumptionId;
  readonly executionId: ExecutionId;
  /**
   * The controller's stable key for this work.
   *
   * Derived from persisted controller coordinates only, so a later Activation reconstructing the
   * same semantic call reconstructs the same key and recovers the stored outcome instead of
   * dispatching a second time. After invalidation a re-derived key finds no reusable record and
   * starts fresh work.
   */
  readonly key: string;
  /** The Activation that started the work and suspended on it. */
  readonly activationId: ActivationId;
  /** The controller revision that Activation read. Retained provenance; see the file docstring. */
  readonly observedRevision: number;
  readonly state: ControllerResumptionState;
  /** Present only once `state` is `settled` and the work succeeded. */
  readonly value: JsonValue | null;
  /** Present only once `state` is `settled` and the work failed. */
  readonly failure: ControllerResumptionFailure | null;
  readonly createdAt: string;
  readonly settledAt: string | null;
  /** Invalidation provenance. Non-null only once `state` is `invalidated`. */
  readonly invalidatedAt: string | null;
  /** The interleave Event that overtook this resumption. */
  readonly invalidatedByEventId: string | null;
  /** The `ExecutionContext.revision` at the instant of invalidation. Diagnostics only. */
  readonly invalidatedAtRevision: number | null;
}

export interface CreateControllerResumptionInput {
  readonly resumptionId: ControllerResumptionId;
  readonly executionId: ExecutionId;
  readonly key: string;
  readonly activationId: ActivationId;
  readonly observedRevision: number;
  readonly createdAt: string;
}

export function createControllerResumption(input: CreateControllerResumptionInput): ControllerResumption {
  return {
    resumptionId: input.resumptionId,
    executionId: input.executionId,
    key: input.key,
    activationId: input.activationId,
    observedRevision: input.observedRevision,
    state: "pending",
    value: null,
    failure: null,
    createdAt: input.createdAt,
    settledAt: null,
    invalidatedAt: null,
    invalidatedByEventId: null,
    invalidatedAtRevision: null,
  };
}

export function isUnsettled(resumption: ControllerResumption): boolean {
  return resumption.state === "pending";
}

/** True once the record can no longer be settled - either it settled or an interleave Event won. */
export function isResumptionTerminal(resumption: ControllerResumption): boolean {
  return resumption.state !== "pending";
}

/**
 * Applies an outcome.
 *
 * A non-pending record is returned untouched, so settlement is idempotent and - crucially - an
 * `invalidated` record can never be turned back into a reusable `settled` one by a late promise.
 */
export function settleControllerResumption(
  resumption: ControllerResumption,
  outcome: ControllerResumptionOutcome,
  at: string,
): ControllerResumption {
  if (resumption.state !== "pending") return resumption;
  return outcome.status === "settled"
    ? { ...resumption, state: "settled", value: outcome.value, failure: null, settledAt: at }
    : { ...resumption, state: "settled", value: null, failure: outcome.failure, settledAt: at };
}

/**
 * Marks a resumption obsolete because an interleave Event overtook it.
 *
 * Idempotent: an already-`invalidated` record is returned untouched, and an already-`settled` record
 * is left settled - invalidation only applies to work that is still genuinely pending. This is what
 * makes "further Events cannot repeatedly invalidate the same continuation" true by construction.
 */
export function invalidateControllerResumption(
  resumption: ControllerResumption,
  at: string,
  byEventId: string,
  atRevision: number,
): ControllerResumption {
  if (resumption.state !== "pending") return resumption;
  return {
    ...resumption,
    state: "invalidated",
    invalidatedAt: at,
    invalidatedByEventId: byEventId,
    invalidatedAtRevision: atRevision,
  };
}

/**
 * Invalidates work at the `RUNNING -> await_resumption` commit boundary.
 *
 * Unlike ordinary WAITING-time invalidation, this may invalidate a record that settled after the
 * interleave Event was queued but before the Activation committed its wait. The Event still won
 * the semantic ordering: the outcome was computed from pre-Event state and must not become
 * reusable merely because its promise happened to settle in that narrow window.
 */
export function invalidateControllerResumptionAtSuspension(
  resumption: ControllerResumption,
  at: string,
  byEventId: string,
  atRevision: number,
): ControllerResumption {
  if (resumption.state === "invalidated") return resumption;
  return {
    ...resumption,
    state: "invalidated",
    value: null,
    failure: null,
    settledAt: null,
    invalidatedAt: at,
    invalidatedByEventId: byEventId,
    invalidatedAtRevision: atRevision,
  };
}

/**
 * The stored outcome of a settled record, or `null` for a pending or invalidated one.
 *
 * `invalidated` returns `null` so stable-key recovery never hands a controller an obsolete result.
 */
export function outcomeOfResumption(resumption: ControllerResumption): ControllerResumptionOutcome | null {
  if (resumption.state !== "settled") return null;
  if (resumption.failure !== null) return { status: "failed", failure: resumption.failure };
  return { status: "settled", value: resumption.value };
}

/**
 * Whether this record is still usable as the reusable result for its stable key.
 *
 * `pending` and `settled` are reusable (recovered as a suspension or as a stored outcome);
 * `invalidated` is not, so `findControllerResumptionByKey` skips it and a re-derived key starts
 * fresh work.
 */
export function isReusableForKey(resumption: ControllerResumption): boolean {
  return resumption.state === "pending" || resumption.state === "settled";
}

/**
 * The single JSON boundary every controller-local result crosses.
 *
 * Applied identically on the fast and slow paths, which is what makes them interchangeable: a
 * result that could not be persisted must not be allowed to succeed merely because it happened to
 * settle inside the Activation that started it. A value that cannot survive the round trip becomes
 * a normalized failure, not a success with a hidden object graph in it.
 */
export function normalizeResumptionValue(value: unknown): ControllerResumptionOutcome {
  const issues = jsonIssues(value, "value");
  if (issues.length > 0) {
    return {
      status: "failed",
      failure: {
        code: "invalid_controller_resumption_value",
        message: `controller-local work produced something that cannot be persisted: ${issues
          .map((issue) => `${issue.path}: ${issue.message}`)
          .join("; ")}`,
      },
    };
  }
  return { status: "settled", value: cloneJson(value as JsonValue) };
}

/** Turns anything thrown by controller-local work into the one failure shape both paths use. */
export function normalizeResumptionError(error: unknown): ControllerResumptionOutcome {
  return {
    status: "failed",
    failure: {
      code: "controller_resumption_failed",
      message: error instanceof Error ? error.message : String(error),
    },
  };
}
