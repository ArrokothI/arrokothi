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
 *   child.spawned          a `SpawnExecution` created an independent child; here is its identity
 *   child.completed        a child this Execution called reached COMPLETED; here is its terminal result
 *   child.failed           a child this Execution called reached FAILED; here is why
 *   child.cancelled        a child this Execution called reached CANCELLED; distinct from failure
 *   message.sent           a `SendMessage` was admitted/persisted for its destination (not processed)
 *   peer.message           another Execution sent this one a message (fresh, or a correlated reply)
 *   user.input             a trusted response to a `RequestUserInput` Effect; runtime-established
 *   confirmation.declined  a human declined an exact-payload mechanical confirmation; nothing ran
 *   memory.written         a Structured Memory write committed at a runtime-owned revision
 *   external.input         an observation delivered from outside the kernel
 *
 * The three capability outcomes are separate kinds rather than a status field so that a controller
 * can wait for exactly the one it cares about, and so that "failed" can never be read where
 * "unknown" was meant. `effect.denied` and `effect.rejected` are likewise distinct: one is policy
 * saying no, the other is the request never having been answerable. Conflating them would make a
 * misconfiguration look like a security decision.
 *
 * The child kinds arrive with Slice E, exactly as this file's original note said they would ("Kinds
 * for later slices - child completion, peer messages, user input, timers - are deliberately absent.
 * They arrive with the Effects that produce them."). `child.spawned` is the immediate result of a
 * `SpawnExecution` Effect; `child.completed` / `child.failed` / `child.cancelled` settle a `call`'s
 * dependency on the child's terminal outcome, and are distinct kinds so that "created", "finished",
 * and "cancelled" can never be read for one another - `spawn` vs `call` and `failed` vs `cancelled`
 * both depend on it.
 *
 * `message.sent` and `peer.message` arrive with Slice E.1's `SendMessage` runtime. `message.sent`
 * answers the *sender's* Effect - the runtime admitted the message for that destination. `peer.message`
 * is the *recipient's* observation; a reply to an `ask` is also a `peer.message`, carrying the
 * asker's original correlation so its exact PendingOperation settles.
 *
 * `user.input` and `confirmation.declined` arrive with Slice E.2. `user.input` is a
 * *runtime-established* correlated result: it settles one exact pending `RequestUserInput` Effect and
 * carries enough runtime truth to identify the request, the PendingOperation, and the validated
 * value. It is deliberately distinct from `external.input`, which is an application observation and
 * is externally mintable through the generic delivery path - a `user.input` is not deliverable that
 * way. `confirmation.declined` settles one gated Effect's dependency when a human declines its
 * exact-payload confirmation - distinct from `effect.denied` (policy said no) and from a capability
 * failure (nothing dispatched at all). Timers remain absent.
 *
 * Nothing here records *how fast* an Effect completed. A body field like "was this inline?" would
 * make the fast and slow paths semantically distinguishable, which is precisely the property the
 * gateway must not have.
 *
 * Timer kinds remain deliberately absent until the Effect/runtime work that establishes them.
 */

import type { CapabilityError } from "../effects/outcome.ts";
import type { CapabilityId, EffectId, OperationId, PendingOperationId } from "../effects/ids.ts";
import type { EffectKind } from "../effects/types.ts";
import type { ExecutionId } from "../execution/ids.ts";
import type { JsonValue } from "../util/json.ts";

export type EventKind =
  | "capability.completed"
  | "capability.failed"
  | "capability.unknown"
  | "effect.denied"
  | "effect.rejected"
  | "child.spawned"
  | "child.completed"
  | "child.failed"
  | "child.cancelled"
  | "message.sent"
  | "peer.message"
  | "user.input"
  | "confirmation.declined"
  | "memory.written"
  | "external.input";

export const EVENT_KINDS: readonly EventKind[] = [
  "capability.completed",
  "capability.failed",
  "capability.unknown",
  "effect.denied",
  "effect.rejected",
  "child.spawned",
  "child.completed",
  "child.failed",
  "child.cancelled",
  "message.sent",
  "peer.message",
  "user.input",
  "confirmation.declined",
  "memory.written",
  "external.input",
];

/**
 * Every Event that resolves an Effect. Useful for waiting on "whatever happened to my request".
 *
 * `message.sent` is here: it answers a `SendMessage`. `peer.message` is *not* - it is primarily an
 * observation delivered to a different Execution than the one that proposed the Effect; its
 * reply-to-an-`ask` role is correlation-specific and a controller waits on that correlation
 * explicitly.
 */
export const EFFECT_RESULT_EVENT_KINDS: readonly EventKind[] = [
  "capability.completed",
  "capability.failed",
  "capability.unknown",
  "effect.denied",
  "effect.rejected",
  "child.spawned",
  "child.completed",
  "child.failed",
  "child.cancelled",
  "message.sent",
  "user.input",
  "confirmation.declined",
  "memory.written",
];

/**
 * The terminal-outcome Events a `call` waits on.
 *
 * `child.spawned` is deliberately not here: it acknowledges creation, not termination. `child.cancelled`
 * is here - cancellation is a terminal outcome and a `call` parent must be woken by it, or it would
 * wait forever for a `child.completed` / `child.failed` that can never come.
 */
export const CHILD_RESULT_EVENT_KINDS: readonly EventKind[] = [
  "child.completed",
  "child.failed",
  "child.cancelled",
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

/** Facts about the spawned child that every child-result Event carries. */
interface ChildResultFields extends EffectResultFields {
  readonly pendingOperationId: PendingOperationId;
  readonly childExecutionId: ExecutionId;
  readonly rootExecutionId: ExecutionId;
  readonly definitionId: string;
  readonly definitionVersion: number;
}

export interface ChildSpawnedBody extends ChildResultFields {
  /** The operations the child actually received, after attenuation against the parent's ceiling. */
  readonly grantedOperations: readonly { readonly capability: string; readonly operation: string }[];
}

export interface ChildCompletedBody extends ChildResultFields {
  /**
   * The child's validated terminal result.
   *
   * `schemaId` is `null` when the child's Definition declared no terminal-result schema; `value` is
   * then `null` too. This is the child's terminal result, not a response or a message.
   */
  readonly terminalResult: {
    readonly schemaId: string | null;
    readonly schemaVersion: number | null;
    readonly value: JsonValue;
    readonly valueDigest: string;
  };
}

export interface ChildFailedBody extends ChildResultFields {
  readonly failure: { readonly code: string; readonly message: string };
}

export interface ChildCancelledBody extends ChildResultFields {
  /** Why the child was cancelled, as supplied to the trusted cancellation entry point. */
  readonly reason: string | null;
}

/**
 * The sender's acknowledgement that a `SendMessage` was admitted.
 *
 * "sent" means the runtime persisted the message for the destination, not that the recipient
 * processed it. `messageId` is the runtime-minted identity a reply must name.
 */
export interface MessageSentBody extends EffectResultFields {
  readonly pendingOperationId: PendingOperationId;
  readonly messageId: string;
  /** The destination this message was admitted for. */
  readonly to: ExecutionId;
}

/**
 * A message from another Execution: a fresh `send` / `ask`, or a correlated reply.
 *
 * `fromExecutionId` is runtime-owned - it is taken from the sending Execution's runtime context, not
 * from any field a controller supplied. A reply carries the original ask's correlation on the
 * envelope so the asker's exact PendingOperation settles; `inReplyToMessageId` lets the recipient
 * tell a reply from a fresh request.
 */
export interface PeerMessageBody {
  readonly messageId: string;
  readonly fromExecutionId: ExecutionId;
  readonly body: JsonValue;
  /** Whether the sender is waiting for a reply to this exact message (an `ask`). */
  readonly expectsReply: boolean;
  /** The message id this one replies to, or `null` for a fresh request. */
  readonly inReplyToMessageId: string | null;
}

/**
 * A trusted response to a `RequestUserInput` Effect.
 *
 * Runtime-established, not application-minted: it is produced only by `Harness.submitUserInput`
 * after the value validated against the request's stored schema, and it is *not* deliverable through
 * the generic `external.input` path. The body carries enough runtime truth to identify the exact
 * request and PendingOperation it settles.
 */
export interface UserInputBody extends EffectResultFields {
  readonly pendingOperationId: PendingOperationId;
  /** The runtime-owned `UserInputRequest` this answers. */
  readonly requestId: string;
  /** The validated response value. Validated against the request's stored schema before delivery. */
  readonly value: JsonValue;
}

/**
 * A human declined an exact-payload mechanical confirmation.
 *
 * Runtime-established. It settles the gated Effect's dependency and is deliberately distinct from
 * `effect.denied` (policy refused) and from a capability failure (nothing was dispatched at all).
 * The controller decides what to do next; approval itself is never a controller Event.
 */
export interface ConfirmationDeclinedBody extends EffectResultFields {
  readonly pendingOperationId: PendingOperationId;
  /** The runtime-owned `ConfirmationRequest` this answers. */
  readonly confirmationId: string;
  /** The canonical digest of the exact payload that was declined. */
  readonly proposalDigest: string;
}

/** A runtime-established successful commit of one schema-bound Structured Memory field. */
export interface MemoryWrittenBody extends EffectResultFields {
  /** Non-null only when this write reused a confirmation-gated PendingOperation. */
  readonly pendingOperationId: PendingOperationId | null;
  readonly memoryViewId: string;
  readonly key: string;
  readonly revision: number;
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
  readonly "child.spawned": ChildSpawnedBody;
  readonly "child.completed": ChildCompletedBody;
  readonly "child.failed": ChildFailedBody;
  readonly "child.cancelled": ChildCancelledBody;
  readonly "message.sent": MessageSentBody;
  readonly "peer.message": PeerMessageBody;
  readonly "user.input": UserInputBody;
  readonly "confirmation.declined": ConfirmationDeclinedBody;
  readonly "memory.written": MemoryWrittenBody;
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

  if (kind === "peer.message") {
    requireString(value["messageId"], "body.messageId", issues);
    requireString(value["fromExecutionId"], "body.fromExecutionId", issues);
    if (!("body" in value)) issues.push({ path: "body.body", message: "expected a message body" });
    if (typeof value["expectsReply"] !== "boolean") {
      issues.push({ path: "body.expectsReply", message: "expected a boolean" });
    }
    if (value["inReplyToMessageId"] !== null && typeof value["inReplyToMessageId"] !== "string") {
      issues.push({ path: "body.inReplyToMessageId", message: "expected a message id or null" });
    }
    return issues;
  }

  requireString(value["effectId"], "body.effectId", issues);
  requireString(value["effectKind"], "body.effectKind", issues);

  if (kind === "effect.denied" || kind === "effect.rejected") {
    requireString(value["code"], "body.code", issues);
    if (typeof value["message"] !== "string") issues.push({ path: "body.message", message: "expected a string" });
    return issues;
  }

  if (kind === "message.sent") {
    requireString(value["pendingOperationId"], "body.pendingOperationId", issues);
    requireString(value["messageId"], "body.messageId", issues);
    requireString(value["to"], "body.to", issues);
    return issues;
  }

  if (kind === "user.input") {
    requireString(value["pendingOperationId"], "body.pendingOperationId", issues);
    requireString(value["requestId"], "body.requestId", issues);
    if (!("value" in value)) issues.push({ path: "body.value", message: "expected a response value" });
    return issues;
  }

  if (kind === "confirmation.declined") {
    requireString(value["pendingOperationId"], "body.pendingOperationId", issues);
    requireString(value["confirmationId"], "body.confirmationId", issues);
    requireString(value["proposalDigest"], "body.proposalDigest", issues);
    return issues;
  }
  if (kind === "memory.written") {
    if (value["pendingOperationId"] !== null && typeof value["pendingOperationId"] !== "string") {
      issues.push({ path: "body.pendingOperationId", message: "expected a pending-operation id or null" });
    }
    requireString(value["memoryViewId"], "body.memoryViewId", issues);
    requireString(value["key"], "body.key", issues);
    if (typeof value["revision"] !== "number" || !Number.isInteger(value["revision"]) || value["revision"] < 1) {
      issues.push({ path: "body.revision", message: "expected a positive integer revision" });
    }
    return issues;
  }

  if (
    kind === "child.spawned" ||
    kind === "child.completed" ||
    kind === "child.failed" ||
    kind === "child.cancelled"
  ) {
    requireString(value["pendingOperationId"], "body.pendingOperationId", issues);
    requireString(value["childExecutionId"], "body.childExecutionId", issues);
    requireString(value["rootExecutionId"], "body.rootExecutionId", issues);
    requireString(value["definitionId"], "body.definitionId", issues);
    if (typeof value["definitionVersion"] !== "number") {
      issues.push({ path: "body.definitionVersion", message: "expected a number" });
    }
    if (kind === "child.spawned" && !Array.isArray(value["grantedOperations"])) {
      issues.push({ path: "body.grantedOperations", message: "expected an array of operation refs" });
    }
    if (kind === "child.completed") {
      const terminal = value["terminalResult"];
      if (terminal === null || typeof terminal !== "object" || Array.isArray(terminal) || !("value" in terminal)) {
        issues.push({ path: "body.terminalResult", message: "expected a terminal result envelope" });
      }
    }
    if (kind === "child.failed") requireError(value["failure"], "body.failure", issues);
    if (kind === "child.cancelled" && value["reason"] !== null && typeof value["reason"] !== "string") {
      issues.push({ path: "body.reason", message: "expected a string reason or null" });
    }
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
