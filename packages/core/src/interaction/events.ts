/**
 * The closed runtime Event vocabulary.
 *
 * An Event means one thing: **an observation delivered through an Execution boundary**. That
 * definition is doing real work here. Lifecycle transitions, Effect journal phases, Activation
 * records, and emissions are all records *about* an Execution, and none of them are Events - they
 * never enter a mailbox and a controller never consumes them. Making every audit record an Event
 * is how a runtime ends up with a controller that can be woken by its own bookkeeping.
 *
 * The vocabulary is closed and small, and it is derived from what Slice B semantics actually need:
 *
 *   capability.completed   a mediated operation succeeded, and here is what it observed
 *   capability.failed      it definitely did not happen
 *   capability.unknown     nobody can say whether it happened
 *   effect.denied          policy refused the request; nothing was dispatched
 *   effect.rejected        the request was never valid or dispatchable; nothing was dispatched
 *   external.input         an observation delivered from outside the kernel
 *
 * The three capability outcomes are separate kinds rather than a status field so that a controller
 * can wait for exactly the one it cares about, and so that "failed" can never be read where
 * "unknown" was meant. `effect.denied` and `effect.rejected` are likewise distinct: one is policy
 * saying no, the other is the request never having been answerable. Conflating them would make a
 * misconfiguration look like a security decision.
 *
 * Nothing here records *how fast* an Effect completed. A body field like "was this inline?" would
 * make the fast and slow paths semantically distinguishable, which is precisely the property the
 * gateway must not have.
 *
 * Kinds for later slices - child completion, peer messages, user input, timers - are deliberately
 * absent. They arrive with the Effects that produce them.
 */

import type { CapabilityError } from "../effects/outcome.ts";
import type { CapabilityId, EffectId, OperationId, PendingOperationId } from "../effects/ids.ts";
import type { EffectKind } from "../effects/types.ts";
import type { JsonValue } from "../util/json.ts";

export type EventKind =
  | "capability.completed"
  | "capability.failed"
  | "capability.unknown"
  | "effect.denied"
  | "effect.rejected"
  | "external.input";

export const EVENT_KINDS: readonly EventKind[] = [
  "capability.completed",
  "capability.failed",
  "capability.unknown",
  "effect.denied",
  "effect.rejected",
  "external.input",
];

/** Every Event that resolves an Effect. Useful for waiting on "whatever happened to my request". */
export const EFFECT_RESULT_EVENT_KINDS: readonly EventKind[] = [
  "capability.completed",
  "capability.failed",
  "capability.unknown",
  "effect.denied",
  "effect.rejected",
];

export function isEventKind(value: unknown): value is EventKind {
  return typeof value === "string" && (EVENT_KINDS as readonly string[]).includes(value);
}

export function isEffectResultEventKind(kind: EventKind): boolean {
  return (EFFECT_RESULT_EVENT_KINDS as readonly string[]).includes(kind);
}

/** Fields shared by every Event that answers an Effect request. */
interface EffectResultFields {
  readonly effectId: EffectId;
  readonly effectKind: EffectKind;
}

interface CapabilityResultFields extends EffectResultFields {
  readonly pendingOperationId: PendingOperationId;
  readonly capability: CapabilityId;
  readonly operation: OperationId;
}

export interface CapabilityCompletedBody extends CapabilityResultFields {
  /** What the executor observed. Plain data, validated before it is ever persisted. */
  readonly observation: JsonValue;
  /** True when this answered a duplicate request from the prior authoritative outcome. */
  readonly replayed: boolean;
}

export interface CapabilityFailedBody extends CapabilityResultFields {
  readonly error: CapabilityError;
  /** Whether the runtime believes another attempt could succeed. Advisory to the controller. */
  readonly retryable: boolean;
}

export interface CapabilityUnknownBody extends CapabilityResultFields {
  readonly error: CapabilityError;
}

export interface EffectDeniedBody extends EffectResultFields {
  readonly code: string;
  readonly message: string;
}

export interface EffectRejectedBody extends EffectResultFields {
  readonly code: string;
  readonly message: string;
}

/**
 * An observation from outside the kernel: application input, a user turn, a system signal.
 *
 * `label` is application vocabulary, not kernel vocabulary. It lets an application distinguish its
 * own input types without every one of them becoming a kernel Event kind.
 */
export interface ExternalInputBody {
  readonly label: string;
  readonly payload: JsonValue;
}

export interface EventBodies {
  readonly "capability.completed": CapabilityCompletedBody;
  readonly "capability.failed": CapabilityFailedBody;
  readonly "capability.unknown": CapabilityUnknownBody;
  readonly "effect.denied": EffectDeniedBody;
  readonly "effect.rejected": EffectRejectedBody;
  readonly "external.input": ExternalInputBody;
}

export interface EventBodyIssue {
  readonly path: string;
  readonly message: string;
}

function requireString(value: unknown, path: string, issues: EventBodyIssue[]): void {
  if (typeof value !== "string" || value.length === 0) issues.push({ path, message: "expected a non-empty string" });
}

function requireError(value: unknown, path: string, issues: EventBodyIssue[]): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    issues.push({ path, message: "expected an error object" });
    return;
  }
  requireString((value as { code?: unknown }).code, `${path}.code`, issues);
  if (typeof (value as { message?: unknown }).message !== "string") {
    issues.push({ path: `${path}.message`, message: "expected a string" });
  }
}

/** Structural check that a body matches the kind it claims. Kept next to the union it guards. */
export function eventBodyIssues(kind: EventKind, body: unknown): readonly EventBodyIssue[] {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return [{ path: "body", message: `expected an object body for ${kind}` }];
  }
  const value = body as Record<string, unknown>;
  const issues: EventBodyIssue[] = [];

  if (kind === "external.input") {
    requireString(value["label"], "body.label", issues);
    return issues;
  }

  requireString(value["effectId"], "body.effectId", issues);
  requireString(value["effectKind"], "body.effectKind", issues);

  if (kind === "effect.denied" || kind === "effect.rejected") {
    requireString(value["code"], "body.code", issues);
    if (typeof value["message"] !== "string") issues.push({ path: "body.message", message: "expected a string" });
    return issues;
  }

  requireString(value["pendingOperationId"], "body.pendingOperationId", issues);
  requireString(value["capability"], "body.capability", issues);
  requireString(value["operation"], "body.operation", issues);

  if (kind === "capability.completed") {
    if (typeof value["replayed"] !== "boolean") issues.push({ path: "body.replayed", message: "expected a boolean" });
    if (!("observation" in value)) issues.push({ path: "body.observation", message: "expected an observation" });
    return issues;
  }

  requireError(value["error"], "body.error", issues);
  if (kind === "capability.failed" && typeof value["retryable"] !== "boolean") {
    issues.push({ path: "body.retryable", message: "expected a boolean" });
  }
  return issues;
}
