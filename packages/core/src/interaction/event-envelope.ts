/**
 * The minimal delivered-Event envelope.
 *
 * Slice A needs exactly enough of the Event protocol to prove the wait/wake checkpoint: an
 * observation is addressed to one Execution, the router refuses to hand it to anybody else, and
 * its arrival - not a save, not a timer, not a log entry - is what makes a WAITING Execution READY
 * again. Slice B owns the closed Event body taxonomy and the delivery guarantees; until then
 * `kind` is an opaque label that the kernel routes but never interprets.
 *
 * An Event is an *observation delivered through the Execution boundary*. Audit records, lifecycle
 * transitions, emissions, and traces are not Events and never enter a mailbox, even when they are
 * about the same Execution.
 */

import type { JsonValue } from "../util/json.ts";
import type { ExecutionId } from "../execution/ids.ts";

export type EventId = string & { readonly __brand: "EventId" };

/** Slice B replaces this with a closed union. Today it is a label, checked only for well-formedness. */
export type EventKind = string;

/** Events are addressed. There is no broadcast and no ambient delivery. */
export interface EventDestination {
  readonly executionId: ExecutionId;
}

export interface EventEnvelope {
  readonly eventId: EventId;
  readonly destination: EventDestination;
  readonly kind: EventKind;
  readonly body: JsonValue;
  /** Ties this observation to the request that asked for it. */
  readonly correlationId: string | null;
  /** Ties this observation to what caused it, for provenance across Executions. */
  readonly causationId: string | null;
  readonly occurredAt: string;
}

/** An envelope plus what the mailbox knows about its delivery. */
export interface DeliveredEvent extends EventEnvelope {
  readonly deliveredAt: string;
  /** Per-mailbox monotonic position, so consumption cursors are meaningful. */
  readonly sequence: number;
}

/**
 * What an Execution is waiting for.
 *
 * A controller *reports* this; it never sets a lifecycle state. The Harness decides whether the
 * dependency is genuinely unmet and only then derives `WAITING`.
 */
export interface WakeCondition {
  /** Empty means "any Event addressed to me". */
  readonly eventKinds: readonly EventKind[];
  readonly correlationId: string | null;
  /** Human-readable note for traces. Never used for matching. */
  readonly description?: string;
}

export function eventSatisfiesWake(event: EventEnvelope, wake: WakeCondition): boolean {
  if (wake.eventKinds.length > 0 && !wake.eventKinds.includes(event.kind)) return false;
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
  if (typeof event.kind !== "string" || event.kind.length === 0) {
    issues.push({ path: "kind", message: "expected a non-empty event kind" });
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
  } else if (wake.eventKinds.some((kind) => typeof kind !== "string" || kind.length === 0)) {
    issues.push({ path: "wake.eventKinds", message: "event kinds must be non-empty strings" });
  }
  if (wake.correlationId !== null && typeof wake.correlationId !== "string") {
    issues.push({ path: "wake.correlationId", message: "expected a correlation id or null" });
  }
  return issues;
}
