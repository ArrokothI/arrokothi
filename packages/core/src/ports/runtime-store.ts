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
 * Slice D adds effective operation authority on the same terms, with its own combination that must
 * never be observable:
 *
 *   an Execution created without the authority record its exposure will be derived from
 *
 * Slice F adds memory and Slice I the durable outbox as further facets of this same transaction,
 * not as new stores.
 */

import type { EffectJournalDraft, EffectJournalEntry } from "../effects/journal.ts";
import type { EffectId, IdempotencyKey, PendingOperationId } from "../effects/ids.ts";
import type { PendingOperation } from "../effects/pending.ts";
import type { DeliveredEvent, EventEnvelope } from "../interaction/event-envelope.ts";
import type { CancellationRequest } from "../execution/cancellation-request.ts";
import type { ChildExecutionLink } from "../execution/child-link.ts";
import type { ExecutionContext } from "../execution/context.ts";
import type { ExecutionEmission } from "../execution/emission.ts";
import type { ControllerResumptionId, ExecutionId } from "../execution/ids.ts";
import type { PeerRequestLink } from "../execution/peer-request-link.ts";
import type { ControllerResumption } from "../execution/resumption.ts";
import type { LifecycleTransitionRecord } from "../execution/lifecycle.ts";
import type { LineageSpawnBudget } from "../execution/structural-budget.ts";
import type { UserInputRequest } from "../execution/user-input-request.ts";
import type { EffectiveOperationAuthority } from "../operations/authority.ts";

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
 *
 * Since E.1 a key may accumulate historical `invalidated` records (an interleave Event overtook the
 * work) alongside a fresh one. `findByKey` must return the *reusable* record - a `pending` or
 * `settled` one - and never an `invalidated` one, so a re-derived key after invalidation starts
 * fresh work rather than recovering an obsolete result. A durable store should index this rather
 * than scan.
 */
export interface ControllerResumptionFacet {
  insert(resumption: ControllerResumption): Promise<void>;
  get(resumptionId: ControllerResumptionId): Promise<ControllerResumption | undefined>;
  /** Replaces the record wholesale. Resumptions have no independent revision counter. */
  update(resumption: ControllerResumption): Promise<void>;
  listByExecution(executionId: ExecutionId): Promise<readonly ControllerResumption[]>;
  /** The reusable (`pending` | `settled`) record for one Execution's stable key; never `invalidated`. */
  findByKey(executionId: ExecutionId, key: string): Promise<ControllerResumption | undefined>;
}

/**
 * Effective operation authority.
 *
 * A facet of the same transaction because the record and the Execution it belongs to must appear
 * together or not at all: an Execution whose context committed without its ceiling would be an
 * Execution whose exposure silently reads as "nothing authorized", and one whose ceiling committed
 * without its context would be a permission attached to nothing.
 *
 * There is no `delete`, no `widen`, and no `update`. Child delegation - implemented in E.0 - does
 * not narrow or otherwise rewrite the parent's record: it inserts a *fresh* delegated authority
 * record for the child, `version: 1`, computed from `requestedOperations ∩ the parent's current
 * effective authority` at spawn time. The parent's own record is untouched by delegating from it.
 */
export interface OperationAuthorityFacet {
  insert(authority: EffectiveOperationAuthority): Promise<void>;
  /** The ceiling for one Execution, or `undefined` when none was configured. */
  get(executionId: ExecutionId): Promise<EffectiveOperationAuthority | undefined>;
}

/**
 * Lineage-scoped structural spawn budget.
 *
 * Keyed by the root Execution, because the whole ownership tree shares one finite pool. A facet of
 * the same transaction as everything else so that "one credit spent" and "one child created" commit
 * together or not at all - a spawn that created a child without spending a credit would let a
 * lineage exceed its budget, and a spend without a child would leak capacity. `update` is
 * compare-and-set on the record's revision so two concurrent spawns cannot both spend the last
 * credit. There is no `widen` and no per-Execution variant: capacity is set once, at the root.
 */
export interface LineageSpawnBudgetFacet {
  insert(budget: LineageSpawnBudget): Promise<void>;
  get(rootExecutionId: ExecutionId): Promise<LineageSpawnBudget | undefined>;
  update(budget: LineageSpawnBudget, expectedRevision: number): Promise<void>;
}

/**
 * Child-Execution links.
 *
 * The edge from a spawning Execution to a child it created, plus the pending dependency (if any)
 * that a `call` registered on the child's terminal result. A facet of the same transaction because
 * the child, its authority, the spent budget credit, the parent's pending operation, and this link
 * are one atomic creation: a partially created child is exactly what §24 forbids.
 */
export interface ChildExecutionLinkFacet {
  insert(link: ChildExecutionLink): Promise<void>;
  get(childExecutionId: ExecutionId): Promise<ChildExecutionLink | undefined>;
  update(link: ChildExecutionLink): Promise<void>;
  listByParent(parentExecutionId: ExecutionId): Promise<readonly ChildExecutionLink[]>;
}

/**
 * Peer request links (Slice E.1).
 *
 * The runtime-owned correlation between an `ask` and the reply that settles it. A facet of the same
 * transaction because "the message reached the recipient", "the requester's PendingOperation is
 * pending", and "this link exists" are one atomic admission - an `ask` to a terminal or nonexistent
 * peer must leave no half-created link.
 */
export interface PeerRequestLinkFacet {
  insert(link: PeerRequestLink): Promise<void>;
  get(messageId: string): Promise<PeerRequestLink | undefined>;
  update(link: PeerRequestLink): Promise<void>;
  listByRequester(requesterExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]>;
  listByResponder(responderExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]>;
}

/**
 * Cancellation requests (Slice E.1).
 *
 * A narrow record that a RUNNING Execution should reach a safe boundary and become CANCELLED. Its
 * own facet - not a field of the ExecutionContext - so recording one does not touch the context
 * revision an in-flight Activation will compare-and-set against.
 */
export interface CancellationRequestFacet {
  insert(request: CancellationRequest): Promise<void>;
  get(executionId: ExecutionId): Promise<CancellationRequest | undefined>;
  update(request: CancellationRequest): Promise<void>;
}

/**
 * User-input requests (Slice E.2).
 *
 * The runtime-owned record of one open `RequestUserInput` Effect. A facet of the same transaction
 * because "the request exists", "the sender's PendingOperation is pending", and the journal entries
 * are one atomic admission - and because settling one (mark responded, settle the PendingOperation,
 * route the `user.input` Event) must commit together or not at all. `get` is keyed by the
 * runtime-minted `requestId`, which is correlation/integrity data, never a bearer credential.
 */
export interface UserInputRequestFacet {
  insert(request: UserInputRequest): Promise<void>;
  get(requestId: string): Promise<UserInputRequest | undefined>;
  update(request: UserInputRequest): Promise<void>;
  listByExecution(executionId: ExecutionId): Promise<readonly UserInputRequest[]>;
}

export interface RuntimeTransaction {
  readonly executions: ExecutionRecordFacet;
  readonly mailboxes: MailboxFacet;
  readonly emissions: EmissionFacet;
  readonly transitions: TransitionAuditFacet;
  readonly pendingOperations: PendingOperationFacet;
  readonly effectJournal: EffectJournalFacet;
  readonly controllerResumptions: ControllerResumptionFacet;
  readonly operationAuthorities: OperationAuthorityFacet;
  readonly lineageSpawnBudgets: LineageSpawnBudgetFacet;
  readonly childExecutionLinks: ChildExecutionLinkFacet;
  readonly peerRequestLinks: PeerRequestLinkFacet;
  readonly cancellationRequests: CancellationRequestFacet;
  readonly userInputRequests: UserInputRequestFacet;
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
   * One Execution's *reusable* record for a controller-local key (`pending` | `settled`, never
   * `invalidated`).
   *
   * On the read surface as well as the transaction facet because the runtime consults it on every
   * `run(key, ...)` - it is the lookup that decides whether a resumed Activation dispatches a second
   * provider call or is handed the stored one. After an interleave Event invalidated the prior work
   * it returns `undefined`, so the resumed Activation starts fresh. A durable store should index it
   * rather than scan.
   */
  findControllerResumptionByKey(executionId: ExecutionId, key: string): Promise<ControllerResumption | undefined>;
  /**
   * One Execution's effective operation authority.
   *
   * On the read surface because exposure resolution consults it outside any transaction, through a
   * narrow read-only port. Reading it is not holding it: what comes back is a copy of runtime-owned
   * data with no way to write one back.
   */
  readOperationAuthority(executionId: ExecutionId): Promise<EffectiveOperationAuthority | undefined>;
  /** One lineage's structural spawn budget. Read-only diagnostics; the gateway owns spending. */
  readLineageSpawnBudget(rootExecutionId: ExecutionId): Promise<LineageSpawnBudget | undefined>;
  /** The link for one child Execution, or `undefined` when it was not spawned through the gateway. */
  readChildExecutionLink(childExecutionId: ExecutionId): Promise<ChildExecutionLink | undefined>;
  /** Every child one Execution spawned. Read-only lineage/wait-for diagnostics. */
  listChildExecutionLinks(parentExecutionId: ExecutionId): Promise<readonly ChildExecutionLink[]>;
  /** One peer request link by its message id. Read-only diagnostics. */
  readPeerRequestLink(messageId: string): Promise<PeerRequestLink | undefined>;
  /** Every `ask` one Execution sent. Read-only wait-for diagnostics (asker -> expected responder). */
  listPeerRequestLinksByRequester(requesterExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]>;
  /** Every `ask` one Execution is the expected responder for. Read-only diagnostics. */
  listPeerRequestLinksByResponder(responderExecutionId: ExecutionId): Promise<readonly PeerRequestLink[]>;
  /** One Execution's pending cancellation request, if the runtime recorded one. Read-only. */
  readCancellationRequest(executionId: ExecutionId): Promise<CancellationRequest | undefined>;
  /** One user-input request by its runtime-minted id. Read-only; a controller never receives one. */
  readUserInputRequest(requestId: string): Promise<UserInputRequest | undefined>;
  /** Every user-input request one Execution proposed. Read-only diagnostics. */
  listUserInputRequests(executionId: ExecutionId): Promise<readonly UserInputRequest[]>;
  /** Every currently-open user-input request, for an application/UI to discover. Read-only. */
  listOpenUserInputRequests(): Promise<readonly UserInputRequest[]>;
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

export class SpawnBudgetConcurrencyError extends Error {
  constructor(rootExecutionId: string, expectedRevision: number, actualRevision: number) {
    super(
      `lineage spawn budget for ${rootExecutionId} changed underneath this writer ` +
        `(expected revision ${expectedRevision}, found ${actualRevision})`,
    );
    this.name = "SpawnBudgetConcurrencyError";
  }
}
