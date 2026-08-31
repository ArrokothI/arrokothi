/**
 * The delivered-Event envelope.
 *
 * An Event is addressed: the router writes exactly one mailbox, the one belonging to
 * `destination.executionId`, and there is no broadcast and no ambient delivery. Its arrival - not a
 * save, not a timer, not a log entry - is what makes a WAITING Execution runnable again.
 *
 * The envelope is generic over the closed `EventKind` union in `events.ts`, so `kind` and `body`
 * cannot disagree: an envelope tagged `capability.failed` carries a `CapabilityFailedBody` and
 * nothing else. Slice A carried an open `kind: string` because there was no vocabulary yet; there
 * is one now.
 *
 * Four states are deliberately distinct, and this file only owns the first two:
 *
 *   accepted/routed        the Harness admitted the Event for this destination
 *   persisted in mailbox   it is durable and will be offered to a future Activation
 *   consumed by Activation an Activation took it out of the mailbox and handed it to a controller
 *   semantically handled   the controller decided what it meant
 *
 * A delivery receipt is evidence of the first two only. Nothing in this module may be read as a
 * claim that a controller observed anything.
 */

import type { ExecutionId } from "../execution/ids.ts";
import type { EventBodies, EventKind } from "./events.ts";
import { eventBodyIssues, isEventKind } from "./events.ts";

export type EventId = string & { readonly __brand: "EventId" };

/** Events are addressed. There is no broadcast and no ambient delivery. */
export interface EventDestination {
  readonly executionId: ExecutionId;
}

interface EnvelopeBase {
  readonly eventId: EventId;
  readonly destination: EventDestination;
  /** Ties this observation to the request that asked for it. */
  readonly correlationId: string | null;
  /** Ties this observation to what caused it, for provenance across Executions. */
  readonly causationId: string | null;
  readonly occurredAt: string;
}

type EnvelopeFor<K extends EventKind> = EnvelopeBase & { readonly kind: K; readonly body: EventBodies[K] };

/** One Event, discriminated by `kind`, with the body that kind is defined to carry. */
export type EventEnvelope = { [K in EventKind]: EnvelopeFor<K> }[EventKind];

/** An envelope plus what the mailbox knows about its delivery. */
export type DeliveredEvent = EventEnvelope & {
  readonly deliveredAt: string;
  /** Per-mailbox monotonic position, so consumption cursors are meaningful. */
  readonly sequence: number;
};

/**
 * What an Execution is waiting for.
 *
 * A controller *reports* this; it never sets a lifecycle state. The Harness decides whether the
 * dependency is genuinely unmet and only then derives `WAITING`.
 *
 * The condition is prospective. It describes what is still needed *after* the controller's semantic
 * work, so Events already delivered into the Activation that reported it can never satisfy it -
 * those were consumed observations, and the controller already decided they were not enough.
 */
export interface WakeCondition {
  /** Empty means "any Event addressed to me". */
  readonly eventKinds: readonly EventKind[];
  readonly correlationId: string | null;
  /** Human-readable note for traces. Never used for matching. */
  readonly description?: string;
}

export function eventSatisfiesWake(event: EventEnvelope, wake: WakeCondition): boolean {
  if (wake.eventKinds.length > 0 && !(wake.eventKinds as readonly string[]).includes(event.kind)) return false;
  if (wake.correlationId !== null && event.correlationId !== wake.correlationId) return false;
  return true;
}

export interface EventEnvelopeIssue {
  readonly path: string;
  readonly message: string;
}

export function eventEnvelopeIssues(event: EventEnvelope): readonly EventEnvelopeIssue[] {
  const issues: EventEnvelopeIssue[] = [];
  if (typeof event.eventId !== "string" || event.eventId.length === 0) {
    issues.push({ path: "eventId", message: "expected a non-empty event id" });
  }
  if (!isEventKind(event.kind)) {
    issues.push({ path: "kind", message: `unknown event kind ${JSON.stringify(event.kind)}` });
  } else {
    issues.push(...eventBodyIssues(event.kind, event.body));
  }
  if (event.destination === null || typeof event.destination !== "object") {
    issues.push({ path: "destination", message: "expected a destination" });
  } else if (typeof event.destination.executionId !== "string" || event.destination.executionId.length === 0) {
    issues.push({ path: "destination.executionId", message: "expected a destination execution id" });
  }
  if (typeof event.occurredAt !== "string" || event.occurredAt.length === 0) {
    issues.push({ path: "occurredAt", message: "expected an occurredAt timestamp" });
  }
  return issues;
}

export function wakeConditionIssues(wake: WakeCondition): readonly EventEnvelopeIssue[] {
  const issues: EventEnvelopeIssue[] = [];
  if (!Array.isArray(wake.eventKinds)) {
    issues.push({ path: "wake.eventKinds", message: "expected an array of event kinds" });
  } else {
    const unknown = wake.eventKinds.filter((kind) => !isEventKind(kind));
    if (unknown.length > 0) {
      issues.push({
        path: "wake.eventKinds",
        message: `unknown event kind(s) ${unknown.map((k) => JSON.stringify(k)).join(", ")}`,
      });
    }
  }
  if (wake.correlationId !== null && typeof wake.correlationId !== "string") {
    issues.push({ path: "wake.correlationId", message: "expected a correlation id or null" });
  }
  return issues;
}
