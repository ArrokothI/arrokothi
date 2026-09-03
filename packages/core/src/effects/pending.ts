/**
 * PendingOperation: an Effect whose request exists but whose result the Execution has not observed.
 *
 * Generic on purpose. Nothing here mentions capabilities, because `SpawnExecution`, `SendMessage`,
 * `RequestUserInput`, and a timer all need the same runtime record: whose operation it is, what it
 * was, how its result will be correlated, whether it has been dispatched, whether it has settled,
 * and - if anything decided one - by when it must. Building a capability-shaped waiting mechanism
 * now would guarantee four more bespoke ones later.
 *
 * It is runtime state, not controller state. A controller learns that an operation settled by
 * receiving an Event; it never receives a handle to the record, because a mutable pending operation
 * is a way to claim an outcome that did not happen.
 *
 * Two states are deliberately distinguished at the top level:
 *
 *   dispatch  did the runtime hand this to the outside world?
 *   outcome   did the outside world tell us what happened?
 *
 * "dispatched with no outcome" is the crash-sensitive state that makes duplicate external effects
 * possible, so it must be representable rather than inferred.
 */

import type { ExecutionId } from "../execution/ids.ts";
import type { EventId } from "../interaction/event-envelope.ts";
import type { EffectId, IdempotencyKey, PendingOperationId } from "./ids.ts";
import type { EffectKind } from "./types.ts";

/** Whether the Execution is still owed a result. */
export type PendingOperationStatus =
  | "pending"
  /** A result was correlated and delivered as an Event. */
  | "settled"
  /** The result can never be delivered - the Execution reached a terminal state first. */
  | "abandoned";

export type PendingDispatchState = "not_dispatched" | "dispatched";

/**
 * What the outside world established, once it did. `null` while nothing is known.
 *
 * `cancelled` (Slice E.1) is distinct from `failure` on purpose: a `call` parent whose child reached
 * `CANCELLED` settles as `cancelled`, and the runtime must never relabel that as failure merely
 * because the union once lacked the word.
 *
 * `declined`, `denied`, and `rejected` (Slice E.2 / E.2.1) are each distinct from `failure` and
 * `cancelled`. `declined` is a human declining an exact-payload mechanical confirmation. `denied` is
 * an authorization refusal of an approved payload - the confirmation's current-authority re-check, or
 * a hard operation-authority ceiling narrowed while the human deliberated. `rejected` is a runtime
 * refusal of an approved payload *before* dispatch - a missing/kind-mismatched child Definition, an
 * exhausted structural spawn budget, an invalid/terminal message destination. In every case the
 * Effect never dispatched, nothing reached the external world, and the runtime must not relabel the
 * outcome as a capability failure, a decline, a denial, or a cancellation - they mean different
 * things.
 *
 * `conflicted` (Slice G.0) is a confirmation-gated `WriteMemory` whose optimistic `expectedRevision`
 * precondition was no longer true when its approved dispatch resolved. Nothing reached Structured
 * Memory: `dispatch` stays `not_dispatched`, no value changed, no revision advanced. It is distinct
 * from `denied` (authorization), `declined` (a human), `rejected` (never dispatchable), and
 * `failure` (a dispatched operation that did not happen) - a conflict means the write *definitely
 * did not commit* and the controller may re-read and retry.
 */
export type PendingOutcomeState =
  | "success"
  | "failure"
  | "unknown"
  | "cancelled"
  | "declined"
  | "denied"
  | "rejected"
  | "conflicted"
  | null;

export interface PendingOperation {
  readonly pendingOperationId: PendingOperationId;
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
  /** The label the result Event will carry, so a controller can wait for this specific operation. */
  readonly correlationId: string;
  /** What caused the request; the Activation that proposed it. */
  readonly causationId: string | null;
  readonly status: PendingOperationStatus;
  readonly dispatch: PendingDispatchState;
  readonly outcome: PendingOutcomeState;
  readonly idempotencyKey: IdempotencyKey;
  readonly createdAt: string;
  readonly dispatchedAt: string | null;
  /**
   * When the operation itself stops being allowed to remain unresolved, or `null` when no
   * application/runtime deadline was configured for it.
   *
   * Set once, from the Effect request. An Activation that yields because its inline wait budget
   * expired does not touch this: the operation is still valid, still pending, and still has until
   * this instant to produce a result - if it has one at all.
   *
   * `null` is not a missing feature. A long-lived Execution may intentionally wait indefinitely for
   * a dependency (`docs/execution-runtime.md` §16), and a `null` deadline is the honest
   * representation of that: nothing has decided when this operation stops being allowed to remain
   * unresolved. It is never a stand-in far-future timestamp - a sentinel that merely looks unlikely
   * to be reached is not the same claim as "no deadline was configured".
   */
  readonly deadline: string | null;
  readonly settledAt: string | null;
  /** Result linkage: the Event that delivered the outcome to the Execution. */
  readonly resultEventId: EventId | null;
}

export interface CreatePendingOperationInput {
  readonly pendingOperationId: PendingOperationId;
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
  readonly correlationId: string;
  readonly causationId: string | null;
  readonly idempotencyKey: IdempotencyKey;
  readonly createdAt: string;
  /** `null` means this operation has no configured deadline and may remain unresolved indefinitely. */
  readonly deadline: string | null;
}

export function createPendingOperation(input: CreatePendingOperationInput): PendingOperation {
  return {
    pendingOperationId: input.pendingOperationId,
    executionId: input.executionId,
    effectId: input.effectId,
    effectKind: input.effectKind,
    correlationId: input.correlationId,
    causationId: input.causationId,
    status: "pending",
    dispatch: "not_dispatched",
    outcome: null,
    idempotencyKey: input.idempotencyKey,
    createdAt: input.createdAt,
    dispatchedAt: null,
    deadline: input.deadline,
    settledAt: null,
    resultEventId: null,
  };
}

export function markDispatched(operation: PendingOperation, at: string): PendingOperation {
  return { ...operation, dispatch: "dispatched", dispatchedAt: at };
}

export function markSettled(
  operation: PendingOperation,
  outcome: Exclude<PendingOutcomeState, null>,
  resultEventId: EventId,
  at: string,
): PendingOperation {
  return { ...operation, status: "settled", outcome, resultEventId, settledAt: at };
}

/** The Execution can no longer observe the result; retain any outcome already known for audit. */
export function markAbandoned(
  operation: PendingOperation,
  at: string,
  outcome: Exclude<PendingOutcomeState, null> | null = null,
): PendingOperation {
  return { ...operation, status: "abandoned", outcome, settledAt: at };
}

export function isUnresolved(operation: PendingOperation): boolean {
  return operation.status === "pending";
}

/**
 * Dispatched with no outcome: the state that makes duplicate external effects possible.
 *
 * A runtime reconstructed after a crash uses this to recognise operations it must not automatically
 * redispatch. Slice B does not automatically redispatch anything, so this is a query rather than a
 * recovery mechanism; Slice I owns production recovery.
 */
export function isUnresolvedDispatch(operation: PendingOperation): boolean {
  return operation.status === "pending" && operation.dispatch === "dispatched";
}

/** A `null` deadline never expires: nothing has decided when this operation stops being valid. */
export function isExpired(operation: PendingOperation, now: string): boolean {
  return operation.status === "pending" && operation.deadline !== null && operation.deadline <= now;
}
