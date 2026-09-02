/**
 * Event routing: the single place an Event enters a mailbox.
 *
 * Every Event in the system - an externally delivered observation, a capability result, an
 * authorization denial - goes through `routeEvent`. That is not tidiness; it is what makes the
 * destination rules structural rather than repeated. Because there is exactly one implementation:
 *
 *   an Event reaches the mailbox named by `destination.executionId` and no other
 *   a result addressed to Execution A can never wake Execution B
 *   an Event for a terminal Execution is refused, because terminal states do not resume
 *   a repeated `eventId` is not a second observation
 *   WAITING becomes READY only when the arriving Event satisfies the recorded wake condition
 *
 * The last one is worth stating precisely. Waking is caused by an Event, never by a save, a timer,
 * or a poll. And the wake decision is made against `context.waitingFor`, the dependency the Harness
 * recorded when it derived WAITING - not against anything the arriving Event claims about itself.
 *
 * Since Slice C.1 that dependency is a tagged union, and only its Event arm is routable here as a
 * *primary* wake. An Execution waiting on a controller-local resumption still *accepts* Events - the
 * mailbox is not closed - and absent an interleave condition no Event makes it READY; only that
 * resumption settling does.
 *
 * ## Controlled interleaving (Slice E.1)
 *
 * A wait may carry a second, separate `interleave` wake condition. An Event that matches it makes
 * the Execution `READY` for another Activation *without* the primary dependency being satisfied:
 *
 * ```text
 * primary `event` wake matches      -> ordinary dependency wake (WAITING -> READY)
 * `interleave` matches, `event` arm -> WAITING -> READY; the primary PendingOperation stays pending
 * `interleave` matches, resumption  -> the still-pending resumption is invalidated in THIS
 *                                      transaction, then WAITING -> READY
 * nothing matches                   -> mailbox only; no wake
 * ```
 *
 * The invalidation is the minimal stale-continuation rule: once an opted-in Event has overtaken a
 * resumption, that resumption's late result can no longer wake the Execution and is never reused by
 * stable-key recovery. It is deliberately conservative - it may fire slightly before "a semantic
 * commit occurred" - because only an explicitly opted-in interleave Event can trigger it. After the
 * interleave wake `waitingFor` is `null`, so further Events that arrive before the next Activation
 * are mailbox-only and cannot re-invalidate an already-obsolete continuation.
 *
 * `routeEvent` runs inside a caller-provided transaction so that "the operation settled" and "the
 * Execution observed it" commit together or not at all. Scheduling happens after the commit: the
 * caller enqueues when the returned decision says the Execution woke.
 */

import { transitionContext } from "../execution/context.ts";
import type { ExecutionId } from "../execution/ids.ts";
import { isTerminalLifecycle } from "../execution/lifecycle.ts";
import { invalidateControllerResumption } from "../execution/resumption.ts";
import type { EventEnvelope, EventId } from "../interaction/event-envelope.ts";
import { eventEnvelopeIssues, eventSatisfiesWake } from "../interaction/event-envelope.ts";
import type { RuntimeTransaction } from "../ports/runtime-store.ts";

export type EventRoutingRejection = "unknown_destination" | "execution_terminal" | "malformed_event";

export type EventRoutingResult =
  | { readonly status: "delivered"; readonly eventId: EventId; readonly wokeExecution: boolean }
  | { readonly status: "duplicate"; readonly eventId: EventId }
  | {
      readonly status: "rejected";
      readonly eventId: EventId;
      readonly reason: EventRoutingRejection;
      readonly detail: string;
    };

export interface RouteEventInput {
  readonly tx: RuntimeTransaction;
  readonly envelope: EventEnvelope;
  readonly deliveredAt: string;
  /** Records the WAITING -> READY transition when the Event satisfies the wake dependency. */
  readonly recordTransition: (
    executionId: ExecutionId,
    from: "WAITING",
    to: "READY",
    at: string,
    reason: string,
  ) => Promise<void>;
}

export async function routeEvent(input: RouteEventInput): Promise<EventRoutingResult> {
  const { tx, envelope, deliveredAt } = input;

  const issues = eventEnvelopeIssues(envelope);
  if (issues.length > 0) {
    return {
      status: "rejected",
      eventId: envelope.eventId,
      reason: "malformed_event",
      detail: issues.map((i) => `${i.path}: ${i.message}`).join("; "),
    };
  }

  const destination = envelope.destination.executionId;
  const context = await tx.executions.get(destination);
  if (!context) {
    return {
      status: "rejected",
      eventId: envelope.eventId,
      reason: "unknown_destination",
      detail: `no execution ${destination}`,
    };
  }
  if (isTerminalLifecycle(context.lifecycle)) {
    return {
      status: "rejected",
      eventId: envelope.eventId,
      reason: "execution_terminal",
      detail: `execution ${destination} is ${context.lifecycle}`,
    };
  }

  const appended = await tx.mailboxes.append(context.mailbox.mailboxId, envelope, deliveredAt);
  if (!appended.accepted) return { status: "duplicate", eventId: envelope.eventId };

  const wait = context.waitingFor;
  if (context.lifecycle === "WAITING" && wait !== null) {
    // Primary dependency. Only the `event` arm is satisfiable by an arriving Event; a
    // resumption-suspended Execution is woken by the resumption settling, never here.
    if (wait.kind === "event" && eventSatisfiesWake(envelope, wait.wake)) {
      const ready = transitionContext(context, "READY", deliveredAt);
      await tx.executions.update(ready, context.revision);
      await input.recordTransition(destination, "WAITING", "READY", deliveredAt, `event ${envelope.eventId}`);
      return { status: "delivered", eventId: envelope.eventId, wokeExecution: true };
    }

    // Controlled interleaving: an explicitly opted-in Event overtakes the wait.
    if (wait.interleave !== undefined && eventSatisfiesWake(envelope, wait.interleave)) {
      if (wait.kind === "controller_resumption") {
        // The resumption's continuation was computed from a now-superseded state. Invalidate it in
        // this same transaction so its late result cannot wake the Execution or be reused by key.
        // A no-op if it already settled or was already invalidated - so E2/E3 arriving after E1
        // has invalidated it produce no second invalidation.
        const resumption = await tx.controllerResumptions.get(wait.resumptionId);
        if (resumption !== undefined && resumption.state === "pending") {
          await tx.controllerResumptions.update(
            invalidateControllerResumption(resumption, deliveredAt, envelope.eventId, context.revision),
          );
        }
      }
      // The `event` arm's primary PendingOperation is deliberately NOT settled here: the ask reply
      // or child result is still owed, and the controller may report the same dependency again.
      const ready = transitionContext(context, "READY", deliveredAt);
      await tx.executions.update(ready, context.revision);
      await input.recordTransition(destination, "WAITING", "READY", deliveredAt, `interleave event ${envelope.eventId}`);
      return { status: "delivered", eventId: envelope.eventId, wokeExecution: true };
    }
  }

  return { status: "delivered", eventId: envelope.eventId, wokeExecution: false };
}
