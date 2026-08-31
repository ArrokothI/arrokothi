/**
 * The runtime store: one transactional aggregate, a few focused facets.
 *
 * The alternative shapes are both wrong. A single untyped store loses the ownership boundaries the
 * architecture is built on; a dozen independently transactional micro-ports cannot express the
 * invariants that must commit together, such as "consume the mailbox, record controller progress,
 * and transition the lifecycle" or "validate the terminal result and reach COMPLETED".
 *
 * Slice A needs the executions, mailboxes, emissions, and transition-audit facets. Slice B adds
 * pending operations and the effect journal, Slice F memory, Slice I the durable outbox - as
 * facets of this same transaction, not as new stores.
 */

import type { DeliveredEvent, EventEnvelope } from "../interaction/event-envelope.ts";
import type { ExecutionContext } from "../execution/context.ts";
import type { ExecutionEmission } from "../execution/emission.ts";
import type { ExecutionId } from "../execution/ids.ts";
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

export interface RuntimeTransaction {
  readonly executions: ExecutionRecordFacet;
  readonly mailboxes: MailboxFacet;
  readonly emissions: EmissionFacet;
  readonly transitions: TransitionAuditFacet;
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
