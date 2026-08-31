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
 * `routeEvent` runs inside a caller-provided transaction so that "the operation settled" and "the
 * Execution observed it" commit together or not at all. Scheduling happens after the commit: the
 * caller enqueues when the returned decision says the Execution woke.
 */

import { transitionContext } from "../execution/context.ts";
import type { ExecutionId } from "../execution/ids.ts";
import { isTerminalLifecycle } from "../execution/lifecycle.ts";
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

  const wake = context.waitingFor;
  if (context.lifecycle === "WAITING" && wake !== null && eventSatisfiesWake(envelope, wake)) {
    const ready = transitionContext(context, "READY", deliveredAt);
    await tx.executions.update(ready, context.revision);
    await input.recordTransition(destination, "WAITING", "READY", deliveredAt, `event ${envelope.eventId}`);
    return { status: "delivered", eventId: envelope.eventId, wokeExecution: true };
  }

  return { status: "delivered", eventId: envelope.eventId, wokeExecution: false };
}
