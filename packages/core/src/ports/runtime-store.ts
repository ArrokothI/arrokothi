/**
 * The runtime store: one transactional aggregate, a few focused facets.
 *
 * The alternative shapes are both wrong. A single untyped store loses the ownership boundaries the
 * architecture is built on; a dozen independently transactional micro-ports cannot express the
 * invariants that must commit together, such as "consume the mailbox, record controller progress,
 * and transition the lifecycle" or "validate the terminal result and reach COMPLETED".
 *
 * Slice A needed the executions, mailboxes, emissions, and transition-audit facets. Slice B adds
 * pending operations and the Effect journal here, inside the *same* transaction, because the
 * combinations that must never be observable are exactly the ones that span facets:
 *
 *   an Effect journaled as dispatched with no pending operation to settle
 *   a pending operation settled with no result Event in the mailbox
 *   a result Event delivered while the operation still reads as unresolved
 *   an Execution woken by an Event that rolled back
 *
 * Independently transactional micro-stores cannot express any of that. Slice C.1 adds controller
 * resumptions for the same reason, with its own combination that must never be observable:
 *
 *   a resumption settled while the Execution it belongs to still reads as WAITING on it
 *
 * Slice F adds memory and Slice I the durable outbox as further facets of this same transaction,
 * not as new stores.
 */

import type { EffectJournalDraft, EffectJournalEntry } from "../effects/journal.ts";
import type { EffectId, IdempotencyKey, PendingOperationId } from "../effects/ids.ts";
import type { PendingOperation } from "../effects/pending.ts";
import type { DeliveredEvent, EventEnvelope } from "../interaction/event-envelope.ts";
import type { ExecutionContext } from "../execution/context.ts";
import type { ExecutionEmission } from "../execution/emission.ts";
import type { ControllerResumptionId, ExecutionId } from "../execution/ids.ts";
import type { ControllerResumption } from "../execution/resumption.ts";
import type { LifecycleTransitionRecord } from "../execution/lifecycle.ts";

export interface ExecutionRecordFacet {
  get(executionId: ExecutionId): Promise<ExecutionContext | undefined>;
  /** Fails if the Execution already exists. */
  insert(context: ExecutionContext): Promise<void>;
  /** Compare-and-set on the revision the caller read. */
  update(context: ExecutionContext, expectedRevision: number): Promise<void>;
}

export type MailboxAppendResult =
  | { readonly accepted: true; readonly event: DeliveredEvent }
  | { readonly accepted: false; readonly reason: "duplicate" };

export interface MailboxFacet {
  /** Duplicate-safe: re-appending an already-seen `eventId` is a no-op, not a second observation. */
  append(mailboxId: string, event: EventEnvelope, deliveredAt: string): Promise<MailboxAppendResult>;
  /** Events delivered but not yet consumed by an Activation, in arrival order. */
  peek(mailboxId: string): Promise<readonly DeliveredEvent[]>;
  /** Returns the unconsumed events and advances the consumption cursor past them. */
  consume(mailboxId: string): Promise<readonly DeliveredEvent[]>;
}

export interface EmissionFacet {
  append(emission: ExecutionEmission): Promise<void>;
  list(executionId: ExecutionId): Promise<readonly ExecutionEmission[]>;
  /** Next per-Execution sequence number. */
  nextSequence(executionId: ExecutionId): Promise<number>;
}

/**
 * Lifecycle audit.
 *
 * Separate from mailboxes on purpose: these records describe operational history and are never
 * delivered to a controller. Sharing physical storage with Events later must not merge their roles.
 */
export interface TransitionAuditFacet {
  append(record: LifecycleTransitionRecord): Promise<void>;
  list(executionId: ExecutionId): Promise<readonly LifecycleTransitionRecord[]>;
}

/**
 * Pending operations.
 *
 * Runtime state, kept out of the Execution record so a controller can never be handed a mutable
 * one. Everything here is keyed by runtime-minted ids; `findByIdempotencyKey` exists so a repeated
 * request can be recognised as the same logical operation and answered from the prior authoritative
 * outcome instead of causing a second external effect.
 */
export interface PendingOperationFacet {
  insert(operation: PendingOperation): Promise<void>;
  get(pendingOperationId: PendingOperationId): Promise<PendingOperation | undefined>;
  /** Replaces the record wholesale. Pending operations have no independent revision counter. */
  update(operation: PendingOperation): Promise<void>;
  listByExecution(executionId: ExecutionId): Promise<readonly PendingOperation[]>;
  /** Prior operations sharing a duplicate-suppression key, oldest first. */
  findByIdempotencyKey(executionId: ExecutionId, key: IdempotencyKey): Promise<readonly PendingOperation[]>;
}

/**
 * The Effect journal.
 *
 * Append-only audit, sequenced per Execution. Never a mailbox: nothing appended here is delivered
 * to a controller, and a later implementation that shares physical storage with Events must keep
 * the two roles distinguishable.
 */
export interface EffectJournalFacet {
  /** Assigns the per-Execution sequence and returns the stored entry. */
  append(entry: EffectJournalDraft): Promise<EffectJournalEntry>;
  listByExecution(executionId: ExecutionId): Promise<readonly EffectJournalEntry[]>;
  listByEffect(effectId: EffectId): Promise<readonly EffectJournalEntry[]>;
}

/**
 * Controller-local resumptions.
 *
 * A facet of the same transaction as everything else, because settling one and transitioning the
 * Execution from WAITING to READY must commit together or not at all - the same reason pending
 * operations and mailboxes share a transaction. It is a *separate* facet from
 * `pendingOperations` because the records mean different things: nothing here is correlated to an
 * Event, journaled as an Effect, deduplicated by an idempotency key, or ever reported as an
 * unknown outcome.
 *
 * `findByKey` is what makes a slow call dispatch once. A later Activation reconstructing the same
 * controller-local key finds the settled record and reads its outcome instead of starting the work
 * again.
 */
export interface ControllerResumptionFacet {
  insert(resumption: ControllerResumption): Promise<void>;
  get(resumptionId: ControllerResumptionId): Promise<ControllerResumption | undefined>;
  /** Replaces the record wholesale. Resumptions have no independent revision counter. */
  update(resumption: ControllerResumption): Promise<void>;
  listByExecution(executionId: ExecutionId): Promise<readonly ControllerResumption[]>;
  /** The record for one Execution's stable controller-local key, if it has one. */
  findByKey(executionId: ExecutionId, key: string): Promise<ControllerResumption | undefined>;
}

export interface RuntimeTransaction {
  readonly executions: ExecutionRecordFacet;
  readonly mailboxes: MailboxFacet;
  readonly emissions: EmissionFacet;
  readonly transitions: TransitionAuditFacet;
  readonly pendingOperations: PendingOperationFacet;
  readonly effectJournal: EffectJournalFacet;
  readonly controllerResumptions: ControllerResumptionFacet;
}

export interface RuntimeStore {
  /**
   * Runs `work` atomically. Every write either commits together or none does; a throw rolls the
   * whole transaction back. `scope` names the Execution aggregate the transaction is about.
   */
  transact<T>(scope: ExecutionId, work: (tx: RuntimeTransaction) => Promise<T>): Promise<T>;

  readExecution(executionId: ExecutionId): Promise<ExecutionContext | undefined>;
  listExecutions(): Promise<readonly ExecutionContext[]>;
  listEmissions(executionId: ExecutionId): Promise<readonly ExecutionEmission[]>;
  listTransitions(executionId: ExecutionId): Promise<readonly LifecycleTransitionRecord[]>;
  listPendingOperations(executionId: ExecutionId): Promise<readonly PendingOperation[]>;
  readPendingOperation(pendingOperationId: PendingOperationId): Promise<PendingOperation | undefined>;
  listEffectJournal(executionId: ExecutionId): Promise<readonly EffectJournalEntry[]>;
  listControllerResumptions(executionId: ExecutionId): Promise<readonly ControllerResumption[]>;
  readControllerResumption(resumptionId: ControllerResumptionId): Promise<ControllerResumption | undefined>;
  /**
   * One Execution's record for a controller-local key.
   *
   * On the read surface as well as the transaction facet because the runtime consults it on every
   * `run(key, ...)` - it is the lookup that decides whether a resumed Activation dispatches a second
   * provider call or is handed the stored one. A durable store should index it rather than scan.
   */
  findControllerResumptionByKey(executionId: ExecutionId, key: string): Promise<ControllerResumption | undefined>;
}

export class UnknownControllerResumptionError extends Error {
  constructor(resumptionId: string) {
    super(`unknown controller resumption ${resumptionId}`);
    this.name = "UnknownControllerResumptionError";
  }
}

export class UnknownPendingOperationError extends Error {
  constructor(pendingOperationId: string) {
    super(`unknown pending operation ${pendingOperationId}`);
    this.name = "UnknownPendingOperationError";
  }
}

export class ExecutionAlreadyExistsError extends Error {
  constructor(executionId: string) {
    super(`execution ${executionId} already exists`);
    this.name = "ExecutionAlreadyExistsError";
  }
}

export class RuntimeConcurrencyError extends Error {
  readonly expectedRevision: number;
  readonly actualRevision: number;
  constructor(executionId: string, expectedRevision: number, actualRevision: number) {
    super(`execution ${executionId} changed underneath this writer (expected revision ${expectedRevision}, found ${actualRevision})`);
    this.name = "RuntimeConcurrencyError";
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export class UnknownExecutionError extends Error {
  constructor(executionId: string) {
    super(`unknown execution ${executionId}`);
    this.name = "UnknownExecutionError";
  }
}
