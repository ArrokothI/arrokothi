/**
 * The state owner (COORD-REFACTOR-01): the only module that builds or changes accepted state.
 *
 * `KernelState` holds every Execution record in private fields. It exports two things only: `apply`,
 * which applies one plan (`plan.ts`), and read-only views. The coordinator observes caller input, runs
 * host and Driver callbacks, reads state through the readers below, forms one plan per decision and
 * calls `apply`; it never holds a mutable record. Restricting writes is structural; choosing the right
 * plan stays the coordinator's job, checked by the oracle and the tests.
 *
 * ## Apply
 *
 * Each plan kind has one arm with two phases. **Prepare** resolves the Execution, checks that it is
 * still at the version the plan was formed against (`basis`), resolves positions and builds the owner's
 * mutable containers from plan data; an arm that changes a governed field builds and admits its successor
 * there too (*The successor check*, below). Nothing that existed before changes. **Commit** then appends the
 * prepared values and makes plain writes, in the order the accepted transactions fix (K1.2-DEC-10,
 * correction DEC-9). No caller, host or Driver code runs anywhere in `apply`: a plan holds no function,
 * and this module reaches none of the modules that observe caller state or hold the Driver.
 *
 * Every state change goes through `apply`, and every arm advances the Execution's version, so a plan
 * formed before some other change to its Execution is refused rather than applied to state it was not
 * decided on. Correct coordinator code never trips that check: it forms each plan after its last callback
 * and applies it before the next one.
 *
 * ## Readers
 *
 * A reader is a live, read-only window on one record. Its getters and query methods return primitives,
 * already-frozen Kernel values (Activations, receipts, grants, holds, dispositions, decisions) or other
 * readers; never a list, a record, a canonical value or bytes the owner still holds. The reader classes
 * are exported as types only, so no other module can construct one, and each keeps its record in a
 * private field. `inspection()` builds the public `ExecutionView`: fresh containers around shared frozen
 * records, as inspection always has.
 *
 * Everything here follows the zone's load-time discipline (K11-R5-STATE-01, K11-R6-STATE-02): load-time
 * references for built-ins, own-data list operations from `own-array.ts`, and no read of a member a
 * record may not own (correction DEC-8).
 */

import type { Activation, ActivationEvent, SubmissionGrant } from "./driver.ts";
import { creationRequestIdKey, inputIdKey, mayReachScope, type AuthenticatedCaller, type InputId, type Receipt } from "./identity.ts";
import type {
  ActivationView,
  CancellationView,
  DeliveryAttemptView,
  LosingOutcomeView,
  ExchangeView,
  ExecutionView,
  MailboxDisposition,
  MailboxEntryView,
  ReadinessView,
  TerminalResultView,
} from "./inspection.ts";
import { isTerminal, type ExecutionState } from "./lifecycle.ts";
import { appendAllOwn, appendOwn, copyOwn, mapOwn, readAt } from "./own-array.ts";
import {
  holdsOf,
  QUEUED,
  type AcceptedOutcome,
  type CancellationPlan,
  type ControlPlan,
  type CreationPlan,
  type DeliveryPlan,
  type DispatchPlan,
  type ExpiryPlan,
  type InputPlan,
  type LiveWait,
  type LosingOutcomePlan,
  type OutcomeAccepted,
  type OutcomePlan,
  type Plan,
  type Readiness,
  type RefusalPlan,
  type RetiredWait,
  type SettlementPlan,
  type StoredHold,
  type TakeoverPlan,
  type TimerDiscardPlan,
} from "./plan.ts";
import type { RefusalRecord } from "./refusal.ts";
import type { ActivationRecord, CancellationRecord, DeliveryAttempt, ExecutionRecord, MailboxEntry, ResolvedExchange } from "./state-records.ts";
import type { BoundaryValue, CanonicalValue } from "./value-types.ts";
import type { SourceCategory } from "./waits.ts";

/** The one kind a Kernel timeout Event carries (the K0.2 fixture's token). */
const TIMEOUT_KIND = "kernel.wait.timeout";

const PrimordialObjectFreeze = Object.freeze;
const PrimordialReflectApply = Reflect.apply;
const PrimordialMap = Map;
const PrimordialMapGet = Map.prototype.get;
const PrimordialMapSet = Map.prototype.set;
const PrimordialMapForEach = Map.prototype.forEach;
/** `Error` for a refused plan: an invariant violation, never a refusal of a request. */
const PrimordialError = Error;

/** `Map.get` without consulting the (possibly replaced) live prototype method. */
const mapGet = <K, V>(map: Map<K, V>, key: K): V | undefined =>
  PrimordialReflectApply(PrimordialMapGet, map, [key]) as V | undefined;

/** `Map.set` without consulting the (possibly replaced) live prototype method. */
const mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {
  PrimordialReflectApply(PrimordialMapSet, map, [key, value]);
};

const STALE_PLAN = "plan refused: its Execution changed after the plan was formed, or does not hold what the plan names";

/**
 * The successor check (K1.3: design 03 and its revision; owner choices 04 and 05).
 *
 * The **governed fields** are the lifecycle state, the registration count, the live wait, readiness,
 * the open-exchange pointer (`ExecutionRecord.activation`, not the exchange's own fields), the
 * cancellation record, the retired waits, the mailbox's entries and their dispositions. Every arm that
 * changes one builds, in its prepare phase, the record it is about to commit: its **successor**, the old
 * record with this decision's governed changes laid over it (`successor`). It then **admits** it
 * (`admit`): the transition rules T1–T6 against the old record, then the post-state predicate P1–P9
 * over the whole next record, including the entry this decision appends. Both are evaluated in full on
 * every decision; neither assumes the old record satisfied them. Only then does the commit write, and
 * each governed write commits the successor's own value (`control-commits.test.ts` checks that over the
 * source). A refused plan writes nothing.
 *
 * Creation admits its fresh record with P alone, before either index publishes it. Delivery, takeover
 * and control edit only the open exchange's own fields and refuse a terminal record directly (T1).
 * Settlement, refusals, losing Outcomes and discarded timer fires write operational evidence only and
 * also run on terminal records.
 *
 * Each clause names the guard it belongs to (S1–S5). P and T state relations among the governed
 * fields only. What they leave open stays the coordinator's, checked by the tests (L-15): which plan an
 * operation forms, eligibility, whether a wait wakes, expires or stays live, which Event wakes it, batch
 * selection, positions, IDs, refusal precedence, and the content of results, receipts and cancellation
 * facts.
 */
const P1 = "P1, S2: a terminal record holds no queued Event, live wait, readiness or open exchange";
const P2 = "P2, S3: WAITING exactly when a wait is live";
const P3 = "P3, S1: RUNNING exactly when an exchange is open";
const P4 = "P4, S1: CANCELLED exactly when a cancellation is recorded";
const P5 = "P5, S2: an Event is terminally disposed only in a terminal state";
const P6 = "P6, S4: the retired and live generations are exactly 1 to the count, each with its declaration's deadline";
const P7 = "P7, S4: one timeout Event for each deadline retirement, matching it, and no other";
const P8 = "P8, S3: each retirement ends as its cause says";
const P9 = "P9, S5: readiness only while READY, belonging to the last retirement, whose ending Event is still queued";
const T1 = "T1, S1: a terminal Execution never reopens, and each decision starts from its own states and changes only its own fields";
const T2 = "T2, S2: a disposition is written once, over a queued Event, never as queued, and an appended Event is queued";
const T3 = "T3, S2: only the resolving Outcome acknowledges, and it leaves its whole batch acknowledged by its Activation";
const T4 = "T4, S3: a retirement keeps its wait's registration facts and takes its decision's cause";
const T5 = "T5, S5: readiness is installed with its Event or deadline retirement and kept until dispatch or cancellation";
const T6 = "T6, S4: the count rises by one exactly when a registration is created, and a decision creates at most one";

// -- Readers ------------------------------------------------------------------

/** One mailbox entry, read-only. */
class EntryReader {
  readonly #entry: MailboxEntry;

  constructor(entry: MailboxEntry) {
    this.#entry = entry;
  }

  get eventId(): string {
    return this.#entry.eventId;
  }

  get contentIdentity(): string {
    return this.#entry.contentIdentity;
  }

  get acceptancePosition(): number {
    return this.#entry.acceptancePosition;
  }

  /** The accepting boundary's receipt; `null` for a timeout, which mints none. */
  get receipt(): Receipt | null {
    return this.#entry.receipt;
  }

  get disposition(): MailboxDisposition {
    return this.#entry.disposition;
  }

  get sourceCategory(): SourceCategory {
    return this.#entry.sourceCategory;
  }

  get subscriptionClass(): string | null {
    return this.#entry.subscriptionClass;
  }
}

/** The unresolved exchange of one Execution, read-only and live. */
class ExchangeReader {
  readonly #exchange: ActivationRecord;
  readonly #execution: ExecutionRecord;

  constructor(exchange: ActivationRecord, execution: ExecutionRecord) {
    this.#exchange = exchange;
    this.#execution = execution;
  }

  /** The current attempt's frozen Activation. */
  get activation(): Activation {
    return this.#exchange.activation;
  }

  get receipt(): Receipt {
    return this.#exchange.receipt;
  }

  /** The current attempt's grant, for the reference comparison `submitOutcome` makes (K1.2-DEC-20). */
  get submission(): SubmissionGrant {
    return this.#exchange.submission;
  }

  get batch(): readonly string[] {
    return this.#exchange.batch;
  }

  get codeHold(): StoredHold | null {
    return this.#exchange.codeHold;
  }

  get protocolFailureHold(): StoredHold | null {
    return this.#exchange.protocolFailureHold;
  }

  /** How many delivery attempts this exchange has recorded. */
  get deliveryCount(): number {
    return this.#exchange.deliveries.length;
  }

  /** The Execution this exchange belongs to. */
  get execution(): ExecutionReader {
    return new ExecutionReader(this.#execution);
  }
}

/** The retained accepted Outcome an exact replay answers from: its identity and its frozen decision. */
export interface AcceptedOutcomeView {
  readonly identity: string;
  readonly decision: Omit<OutcomeAccepted, "replayed">;
}

/** One Execution, read-only and live. */
class ExecutionReader {
  readonly #record: ExecutionRecord;

  constructor(record: ExecutionRecord) {
    this.#record = record;
  }

  get executionId(): string {
    return this.#record.executionId;
  }

  get scope(): string {
    return this.#record.scope;
  }

  get state(): ExecutionState {
    return this.#record.state;
  }

  get creationIdentity(): string {
    return this.#record.creationIdentity;
  }

  get creationReceipt(): Receipt {
    return this.#record.creationReceipt;
  }

  get initialEventId(): string {
    return this.#record.initialEventId;
  }

  get definitionRevision(): string {
    return this.#record.definitionRevision;
  }

  get runtimeContractRevision(): string {
    return this.#record.runtimeContractRevision;
  }

  get progressCodec(): string {
    return this.#record.progressCodec;
  }

  /** The accepted authority context's frozen value. */
  get authorityContext(): BoundaryValue {
    return this.#record.authorityContext.value;
  }

  get acceptedProgress(): BoundaryValue | null {
    return this.#record.acceptedProgress;
  }

  get progressRevision(): number {
    return this.#record.progressRevision;
  }

  get nextAcceptancePosition(): number {
    return this.#record.nextAcceptancePosition;
  }

  get nextRefusalPosition(): number {
    return this.#record.nextRefusalPosition;
  }

  get activationsMinted(): number {
    return this.#record.activationsMinted;
  }

  /** Accepted `await` registrations so far. */
  get registrations(): number {
    return this.#record.registrations;
  }

  /** The live wait generation, frozen, or `null`. */
  get wait(): LiveWait | null {
    return this.#record.wait;
  }

  /** Wait-ended readiness, frozen, or `null`. */
  get readiness(): Readiness | null {
    return this.#record.readiness;
  }

  /** The terminal result of an accepted `complete` or `fail`, frozen, or `null`. */
  get result(): TerminalResultView | null {
    return this.#record.result;
  }

  /** The Execution deadline set at creation, or `null`. */
  get executionDeadline(): number | null {
    return this.#record.executionDeadline;
  }

  /** The authenticated namespace that created this Execution: the actor of its Execution deadline. */
  get creatorNamespace(): string {
    return this.#record.creationRequestId.producerNamespace;
  }

  /** The accepted cancellation's frozen facts, or `null`. */
  get cancellation(): CancellationView | null {
    const cancelled = this.#record.cancellation;
    return cancelled === null ? null : cancelled.facts;
  }

  /** The retained refusal of a losing proposal under one exact-retry key, or `null` (CX-6). */
  losingRefusal(key: string): RefusalRecord | null {
    const losing = mapGet(this.#record.losingIndex, key);
    return losing === undefined ? null : losing.refusal;
  }

  /** The retired record of one generation, frozen, or `null` while it is live or was never issued. */
  retiredWait(generation: number): RetiredWait | null {
    const retired = readAt(this.#record.retiredWaits, generation - 1);
    return retired === undefined || retired.generation !== generation ? null : retired;
  }

  /** The version a plan formed now names as its basis. */
  get version(): number {
    return this.#record.version;
  }

  /** The unresolved exchange, or `null`. */
  get activation(): ExchangeReader | null {
    const exchange = this.#record.activation;
    return exchange === null ? null : new ExchangeReader(exchange, this.#record);
  }

  get mailboxLength(): number {
    return this.#record.mailbox.length;
  }

  /** The mailbox entry at `index`, which must be below `mailboxLength`. */
  entryAt(index: number): EntryReader {
    return new EntryReader(readAt(this.#record.mailbox, index) as MailboxEntry);
  }

  /** The mailbox entry at `index` as the frozen Event an Activation carries. */
  activationEventAt(index: number): ActivationEvent {
    return toActivationEvent(readAt(this.#record.mailbox, index) as MailboxEntry);
  }

  /** The post-creation ingress entry under one Input ID key, or `null`. */
  inputEntry(key: string): EntryReader | null {
    const entry = mapGet(this.#record.byInputId, key);
    return entry === undefined ? null : new EntryReader(entry);
  }

  /** The accepted Outcome of one exchange, or `null`. */
  acceptedOutcome(activationId: string): AcceptedOutcomeView | null {
    const stored = mapGet(this.#record.acceptedOutcomes, activationId);
    return stored === undefined ? null : PrimordialObjectFreeze({ identity: stored.identity, decision: stored.decision });
  }

  /**
   * The first `bound` queued Events in acceptance order, each as the frozen Event an Activation carries.
   *
   * The prefix is built with an index loop and installed as own data, so ambient pollution an earlier
   * observation left installed cannot change which Events the bound names (K11-R6-STATE-02).
   */
  queuedEvents(bound: number): ActivationEvent[] {
    const record = this.#record;
    const selected: MailboxEntry[] = [];
    for (let index = 0; index < record.mailbox.length && selected.length < bound; index += 1) {
      const entry = readAt(record.mailbox, index) as MailboxEntry;
      if (entry.disposition.kind === "queued") appendOwn(selected, entry);
    }
    return mapOwn(selected, toActivationEvent);
  }

  /** A complete, freshly built snapshot. Reading acknowledges nothing and mutates nothing. */
  inspection(): ExecutionView {
    return viewOf(this.#record);
  }
}

export type { EntryReader, ExchangeReader, ExecutionReader };

// -- The owner ----------------------------------------------------------------

export class KernelState {
  readonly #executions = new PrimordialMap<string, ExecutionRecord>();
  readonly #byCreationRequestId = new PrimordialMap<string, ExecutionRecord>();

  /** The Execution with this ID, or `null`. */
  find(executionId: string): ExecutionReader | null {
    const record = mapGet(this.#executions, executionId);
    return record === undefined ? null : new ExecutionReader(record);
  }

  /** The Execution a Creation request ID key names, or `null`. */
  findCreation(key: string): ExecutionReader | null {
    const record = mapGet(this.#byCreationRequestId, key);
    return record === undefined ? null : new ExecutionReader(record);
  }

  /**
   * The IDs of the Executions `caller` may reach, in creation order.
   *
   * The Execution map is the listing, as it was before the owner existed: an Execution is listed exactly
   * when `find` returns it, whichever creation publication faulted, and a creation that publishes an ID
   * again keeps that ID's place (CR1-R1-CREATION-01).
   */
  visibleExecutionIds(caller: AuthenticatedCaller): string[] {
    const visible: string[] = [];
    // `Map.forEach` through the load-time reference: neither the `values()` iterator protocol
    // (`Symbol.iterator`) nor `Array.prototype.push` is consulted, and each visible ID is installed
    // as this list's own data, so persistent ambient pollution left behind by an earlier boundary
    // observation cannot hide or duplicate listed IDs (K11-R6-STATE-02: this path takes no caller
    // value of its own, so the pollution it has to survive is the residue of an earlier call).
    PrimordialReflectApply(PrimordialMapForEach, this.#executions, [
      (record: ExecutionRecord) => {
        if (mayReachScope(caller, record.scope)) appendOwn(visible, record.executionId);
      },
    ]);
    return visible;
  }

  /** Every Execution's ID, in creation order. For the host's timer listing, which names no caller. */
  executionIds(): string[] {
    const ids: string[] = [];
    PrimordialReflectApply(PrimordialMapForEach, this.#executions, [
      (record: ExecutionRecord) => {
        appendOwn(ids, record.executionId);
      },
    ]);
    return ids;
  }

  /** One delivery attempt's status, or `null` when no such attempt is recorded. */
  deliveryStatus(executionId: string, activationId: string, attempt: number): DeliveryAttempt["status"] | null {
    const record = mapGet(this.#executions, executionId);
    if (record === undefined) return null;
    const deliveries = deliveriesOf(record, activationId);
    const row = deliveries === null ? undefined : readAt(deliveries, attempt - 1);
    return row === undefined ? null : row.status;
  }

  /**
   * The first post-state clause (P1–P9) the Execution's committed record breaks, or `null` (design 03's
   * runtime witness). Evidence only: `admit` checks each successor before its commit, and this checks
   * the record the commit left, so the tests can compare the two. The Kernel never calls it.
   */
  postStateViolation(executionId: string): string | null {
    const record = mapGet(this.#executions, executionId);
    return record === undefined ? null : postStateViolation(record, unchanged(record));
  }

  /** Applies one plan: the only way accepted state changes. */
  apply(plan: Plan): void {
    if (plan.kind === "creation") {
      this.#applyCreation(plan);
      return;
    }
    if (plan.kind === "input") {
      this.#applyInput(plan);
      return;
    }
    if (plan.kind === "dispatch") {
      this.#applyDispatch(plan);
      return;
    }
    if (plan.kind === "delivery") {
      this.#applyDelivery(plan);
      return;
    }
    if (plan.kind === "settlement") {
      this.#applySettlement(plan);
      return;
    }
    if (plan.kind === "outcome") {
      this.#applyOutcome(plan);
      return;
    }
    if (plan.kind === "takeover") {
      this.#applyTakeover(plan);
      return;
    }
    if (plan.kind === "control") {
      this.#applyControl(plan);
      return;
    }
    if (plan.kind === "refusal") {
      this.#applyRefusal(plan);
      return;
    }
    if (plan.kind === "expiry") {
      this.#applyExpiry(plan);
      return;
    }
    if (plan.kind === "timer_discard") {
      this.#applyTimerDiscard(plan);
      return;
    }
    if (plan.kind === "cancellation") {
      this.#applyCancellation(plan);
      return;
    }
    if (plan.kind === "losing_outcome") {
      this.#applyLosingOutcome(plan);
      return;
    }
    const unreachable: never = plan;
    throw new PrimordialError(`${STALE_PLAN}: unknown plan ${typeof unreachable}`);
  }

  /** The Execution a plan names, if it is still at the plan's basis. */
  #resolve(executionId: string, basis: number): ExecutionRecord {
    const record = mapGet(this.#executions, executionId);
    if (record === undefined || record.version !== basis) throw new PrimordialError(STALE_PLAN);
    return record;
  }

  #applyCreation(plan: CreationPlan): void {
    const executionId = plan.executionId;
    const creationRequestId = plan.creationRequestId;
    // The planner decided on the creation-key index alone, so that is the basis the plan names.
    if (plan.basis !== 0 || mapGet(this.#byCreationRequestId, creationRequestIdKey(creationRequestId)) !== undefined) {
      throw new PrimordialError(STALE_PLAN);
    }
    const receipt = plan.receipt;
    const initial = plan.initial;
    const entry: MailboxEntry = {
      eventId: initial.eventId,
      sourceCategory: "application_input",
      inputId: initial.inputId,
      destination: executionId,
      contentIdentity: initial.contentIdentity,
      kind: initial.kind,
      payload: initial.payload,
      subscriptionClass: initial.subscriptionClass,
      waitGeneration: null,
      deadline: null,
      acceptancePosition: initial.acceptancePosition,
      receipt: initial.receipt,
      disposition: QUEUED,
    };
    const fresh: ExecutionRecord = {
      executionId,
      scope: plan.scope,
      creationRequestId,
      definitionRevision: plan.definitionRevision,
      runtimeContractRevision: plan.runtimeContractRevision,
      progressCodec: plan.progressCodec,
      authorityContext: plan.authorityContext,
      creationIdentity: plan.creationIdentity,
      executionDeadline: plan.executionDeadline,
      creationReceipt: receipt,
      initialEventId: initial.eventId,
      mailbox: [entry],
      // The initial Event is deliberately not indexed here: this map is the post-creation ingress
      // replay/conflict domain (K11-R15-ID-01).
      byInputId: new PrimordialMap<string, MailboxEntry>(),
      refusals: [],
      receipts: [receipt],
      // No externally visible CREATED: the Execution is READY the moment creation is accepted.
      state: "READY",
      acceptedProgress: null,
      progressRevision: 0,
      activation: null,
      acceptedOutcomes: new PrimordialMap<string, AcceptedOutcome>(),
      exchanges: [],
      emissions: [],
      result: null,
      nextAcceptancePosition: plan.basis + 2,
      nextRefusalPosition: 1,
      activationsMinted: 0,
      recoveryHistory: [],
      registrations: 0,
      wait: null,
      readiness: null,
      retiredWaits: [],
      timerFires: [],
      cancellation: null,
      losingIndex: new PrimordialMap<string, LosingOutcomeView>(),
      version: plan.basis + 1,
    };
    // The base case: the fresh record satisfies the post-state predicate before either index publishes it.
    const record = admitCreated(fresh);
    mapSet(this.#executions, executionId, record);
    mapSet(this.#byCreationRequestId, creationRequestIdKey(creationRequestId), record);
  }

  #applyInput(plan: InputPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const facts = plan.entry;
    const inputId: InputId = facts.inputId;
    const receipt = facts.receipt;
    const position = receipt.position;
    const woken = plan.woken;
    const entry: MailboxEntry = {
      eventId: facts.eventId,
      sourceCategory: "application_input",
      inputId,
      destination: inputId.destination,
      contentIdentity: facts.contentIdentity,
      kind: facts.kind,
      payload: facts.payload,
      subscriptionClass: facts.subscriptionClass,
      waitGeneration: null,
      deadline: null,
      acceptancePosition: facts.acceptancePosition,
      receipt,
      disposition: QUEUED,
    };
    // A wake retires the live generation, with its readiness and READY; any other input only queues.
    const next = admit(
      record,
      "input",
      successor(record, {
        state: woken === null ? record.state : "READY",
        registrations: record.registrations,
        wait: woken === null ? record.wait : null,
        readiness: plan.readiness === null ? record.readiness : plan.readiness,
        activation: record.activation,
        cancellation: record.cancellation,
        retired: woken,
        appended: entry,
        acknowledgeAt: NO_POSITIONS,
        acknowledgment: QUEUED,
        endAt: NO_POSITIONS,
        ending: QUEUED,
      }),
    );
    const appended = next.appended;
    const retired = next.retired;
    const wait = next.wait;
    const readiness = next.readiness;
    const state = next.state;
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = position + 1;
    if (appended !== null) appendOwn(record.mailbox, appended);
    mapSet(record.byInputId, inputIdKey(inputId), entry);
    appendOwn(record.receipts, receipt);
    if (retired !== null) appendOwn(record.retiredWaits, retired);
    record.wait = wait;
    record.readiness = readiness;
    record.state = state;
  }

  #applyDispatch(plan: DispatchPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const receipt = plan.receipt;
    const position = receipt.position;
    const activationsMinted = plan.activationsMinted;
    const intent: ActivationRecord = {
      activation: plan.activation,
      receipt,
      submission: plan.submission,
      batch: plan.batch,
      deliveries: [],
      codeHold: null,
      protocolFailureHold: null,
    };
    // The exchange opens from READY, and consumes wait-ended readiness: it lives for one reservation.
    const next = admit(
      record,
      "dispatch",
      successor(record, {
        state: "RUNNING",
        registrations: record.registrations,
        wait: record.wait,
        readiness: null,
        activation: intent,
        cancellation: record.cancellation,
        retired: null,
        appended: null,
        acknowledgeAt: NO_POSITIONS,
        acknowledgment: QUEUED,
        endAt: NO_POSITIONS,
        ending: QUEUED,
      }),
    );
    const activation = next.activation;
    const state = next.state;
    const readiness = next.readiness;
    record.version = plan.basis + 1;
    record.activationsMinted = activationsMinted;
    record.nextAcceptancePosition = position + 1;
    record.activation = activation;
    record.state = state;
    appendOwn(record.receipts, receipt);
    record.readiness = readiness;
  }

  #applyDelivery(plan: DeliveryPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const exchange = record.activation;
    if (isTerminal(record.state)) throw new PrimordialError(`${STALE_PLAN} (${T1})`);
    if (exchange === null || exchange.activation.activationId !== plan.activationId || exchange.deliveries.length + 1 !== plan.attempt) {
      throw new PrimordialError(STALE_PLAN);
    }
    const attempt: DeliveryAttempt = {
      attempt: plan.attempt,
      status: "pending",
      failure: null,
      activationId: plan.activationId,
      writerEpoch: plan.writerEpoch,
    };
    record.version = plan.basis + 1;
    appendOwn(exchange.deliveries, attempt);
  }

  #applySettlement(plan: SettlementPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const deliveries = deliveriesOf(record, plan.activationId);
    const row = deliveries === null ? undefined : readAt(deliveries, plan.attempt - 1);
    if (row === undefined || row.status !== "pending") throw new PrimordialError(STALE_PLAN);
    const status = plan.status;
    const failure = plan.failure;
    record.version = plan.basis + 1;
    row.status = status;
    row.failure = failure;
  }

  #applyOutcome(plan: OutcomePlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const intent = record.activation;
    const facts = plan.resolved;
    if (intent === null || intent.activation.activationId !== facts.activationId) throw new PrimordialError(STALE_PLAN);
    const timeout = plan.timeout;
    const minted: MailboxEntry | null =
      timeout === null
        ? null
        : {
            eventId: timeout.eventId,
            sourceCategory: "kernel_timeout",
            inputId: null,
            destination: timeout.destination,
            contentIdentity: "",
            kind: TIMEOUT_KIND,
            payload: null,
            subscriptionClass: null,
            waitGeneration: timeout.generation,
            deadline: timeout.deadline,
            acceptancePosition: timeout.acceptancePosition,
            receipt: null,
            disposition: QUEUED,
          };
    // The Outcome resolves its exchange: it acknowledges the batch, ends the backlog at a terminal step,
    // and registers at most one generation, live or retired at once with its timeout.
    const next = admit(
      record,
      "outcome",
      successor(record, {
        state: plan.nextState,
        registrations: plan.registrations,
        wait: plan.liveWait,
        readiness: plan.readiness,
        activation: null,
        cancellation: record.cancellation,
        retired: plan.retired,
        appended: minted,
        acknowledgeAt: plan.acknowledgeAt,
        acknowledgment: plan.acknowledgment,
        endAt: plan.endAt,
        ending: plan.ending,
      }),
    );
    const toAcknowledge = next.acknowledged;
    const acknowledgment = next.acknowledgment;
    const toEnd = next.ended;
    const ending = next.ending;
    const timeoutEntry = next.appended;
    const retired = next.retired;
    const registrations = next.registrations;
    const liveWait = next.wait;
    const readiness = next.readiness;
    const activation = next.activation;
    const nextState = next.state;
    const resolved: ResolvedExchange = PrimordialObjectFreeze({
      activationId: facts.activationId,
      writerEpoch: facts.writerEpoch,
      baseProgressRevision: facts.baseProgressRevision,
      batch: facts.batch,
      dispatchReceipt: facts.dispatchReceipt,
      outcomeReceipt: facts.outcomeReceipt,
      // The same list the capabilities write into, so a late report settles its original record.
      deliveries: intent.deliveries,
    });
    const receipt = plan.receipt;
    const acceptancePosition = receipt.position;
    const stored = plan.stored;
    const outcome = stored.content;
    const progressRevision = plan.progressRevision;
    const emissionRecords = plan.emissions;
    const result = plan.result;
    const activationId = facts.activationId;
    const historyToAppend = plan.history;
    // The commit: nothing below can refuse, reads caller state or builds a record. The acceptance index
    // advances here, with the rest of the decision (K1.2-DEC-10).
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = acceptancePosition + 1;
    for (let index = 0; index < toAcknowledge.length; index += 1) (readAt(toAcknowledge, index) as MailboxEntry).disposition = acknowledgment;
    for (let index = 0; index < toEnd.length; index += 1) (readAt(toEnd, index) as MailboxEntry).disposition = ending;
    record.acceptedProgress = outcome.progress.value;
    record.progressRevision = progressRevision;
    appendAllOwn(record.emissions, emissionRecords);
    if (result !== null) record.result = result;
    appendOwn(record.exchanges, resolved);
    mapSet(record.acceptedOutcomes, activationId, stored);
    appendOwn(record.receipts, receipt);
    appendAllOwn(record.recoveryHistory, historyToAppend);
    if (timeoutEntry !== null) appendOwn(record.mailbox, timeoutEntry);
    if (retired !== null) appendOwn(record.retiredWaits, retired);
    record.registrations = registrations;
    record.wait = liveWait;
    record.readiness = readiness;
    record.activation = activation;
    record.state = nextState;
  }

  #applyTakeover(plan: TakeoverPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const exchange = record.activation;
    if (isTerminal(record.state)) throw new PrimordialError(`${STALE_PLAN} (${T1})`);
    if (exchange === null || exchange.activation.activationId !== plan.activation.activationId) throw new PrimordialError(STALE_PLAN);
    const receipt = plan.receipt;
    const cleared = plan.cleared;
    const position = receipt.position;
    const submission = plan.submission;
    const activation = plan.activation;
    // The prebuilt records are appended first, then plain writes of fields the records own (correction
    // DEC-9); the Driver is handed the new attempt only after this returns.
    record.version = plan.basis + 1;
    appendOwn(record.receipts, receipt);
    if (cleared !== null) appendOwn(record.recoveryHistory, cleared);
    record.nextAcceptancePosition = position + 1;
    exchange.submission = submission;
    exchange.activation = activation;
    exchange.receipt = receipt;
    exchange.protocolFailureHold = null;
  }

  #applyControl(plan: ControlPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const exchange = record.activation;
    if (isTerminal(record.state)) throw new PrimordialError(`${STALE_PLAN} (${T1})`);
    if (exchange === null) throw new PrimordialError(STALE_PLAN);
    const stored = plan.history;
    const codeHold = plan.codeHold;
    const protocolFailureHold = plan.protocolFailureHold;
    // The append is the only step that calls anything, so it runs first: if it throws, no hold has
    // changed without its history record (correction DEC-9).
    record.version = plan.basis + 1;
    appendOwn(record.recoveryHistory, stored);
    exchange.codeHold = codeHold;
    exchange.protocolFailureHold = protocolFailureHold;
  }

  #applyExpiry(plan: ExpiryPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const timeout = plan.timeout;
    const fire = plan.fire;
    const entry: MailboxEntry = {
      eventId: timeout.eventId,
      sourceCategory: "kernel_timeout",
      inputId: null,
      destination: timeout.destination,
      contentIdentity: "",
      kind: TIMEOUT_KIND,
      payload: null,
      subscriptionClass: null,
      waitGeneration: timeout.generation,
      deadline: timeout.deadline,
      acceptancePosition: timeout.acceptancePosition,
      receipt: null,
      disposition: QUEUED,
    };
    // The live generation retires by its deadline, with its one timeout Event, deadline readiness and READY.
    const next = admit(
      record,
      "expiry",
      successor(record, {
        state: "READY",
        registrations: record.registrations,
        wait: null,
        readiness: plan.readiness,
        activation: record.activation,
        cancellation: record.cancellation,
        retired: plan.retired,
        appended: entry,
        acknowledgeAt: NO_POSITIONS,
        acknowledgment: QUEUED,
        endAt: NO_POSITIONS,
        ending: QUEUED,
      }),
    );
    const appended = next.appended;
    const retired = next.retired;
    const wait = next.wait;
    const readiness = next.readiness;
    const state = next.state;
    // A timeout takes the next acceptance position and mints no receipt (identity.md: timeout
    // acceptance is Kernel-internal, not a seventh receipt boundary).
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = timeout.acceptancePosition + 1;
    if (appended !== null) appendOwn(record.mailbox, appended);
    if (retired !== null) appendOwn(record.retiredWaits, retired);
    appendOwn(record.timerFires, fire);
    record.wait = wait;
    record.readiness = readiness;
    record.state = state;
  }

  #applyTimerDiscard(plan: TimerDiscardPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const fire = plan.fire;
    // A discarded fire is operational evidence only: nothing logical changes.
    record.version = plan.basis + 1;
    appendOwn(record.timerFires, fire);
  }

  #applyCancellation(plan: CancellationPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const facts = plan.record;
    const history = plan.history;
    const fire = plan.fire;
    const intent = record.activation;
    if ((intent === null) !== (facts.endedExchange === null) || (intent !== null && facts.endedExchange !== null && intent.activation.activationId !== facts.endedExchange.activationId)) {
      throw new PrimordialError(STALE_PLAN);
    }
    // The ended exchange's delivery log stays the one the capabilities write into, as for a resolved
    // exchange, so a late report still settles its original row; the frozen facts never hold it.
    const ended: CancellationRecord = PrimordialObjectFreeze({ facts, deliveries: intent === null ? null : intent.deliveries });
    // Every queued Event ends, nothing is acknowledged, the live generation retires by cancellation, and
    // the wait, readiness and exchange are cleared.
    const next = admit(
      record,
      "cancellation",
      successor(record, {
        state: "CANCELLED",
        registrations: record.registrations,
        wait: null,
        readiness: null,
        activation: null,
        cancellation: ended,
        retired: plan.retired,
        appended: null,
        acknowledgeAt: NO_POSITIONS,
        acknowledgment: QUEUED,
        endAt: plan.endAt,
        ending: plan.ending,
      }),
    );
    const toEnd = next.ended;
    const ending = next.ending;
    const retired = next.retired;
    const cancellation = next.cancellation;
    const wait = next.wait;
    const readiness = next.readiness;
    const activation = next.activation;
    const state = next.state;
    const position = facts.position;
    // A cancellation takes an acceptance position and mints no receipt (identity.md's six boundaries).
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = position + 1;
    for (let index = 0; index < toEnd.length; index += 1) (readAt(toEnd, index) as MailboxEntry).disposition = ending;
    if (retired !== null) appendOwn(record.retiredWaits, retired);
    appendAllOwn(record.recoveryHistory, history);
    if (fire !== null) appendOwn(record.timerFires, fire);
    record.cancellation = cancellation;
    record.wait = wait;
    record.readiness = readiness;
    record.activation = activation;
    record.state = state;
  }

  #applyLosingOutcome(plan: LosingOutcomePlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const refusal = plan.refusal;
    const losing = plan.losing;
    const key = plan.key;
    const position = refusal.position;
    // A proposal loses only to an accepted cancellation, and an indexed proposal is answered from its
    // retained refusal, never recorded twice.
    if (record.cancellation === null || mapGet(record.losingIndex, key) !== undefined) throw new PrimordialError(STALE_PLAN);
    // The refusal is appended, then its position consumed, as the refusal arm does (SELF-R8-REFUSAL-01);
    // the index insert comes last. A fault there leaves the refusal recorded with no index entry, the
    // unindexed form a proposal with no usable content would get (the fault sweep's declared window).
    record.version = plan.basis + 1;
    appendOwn(record.refusals, refusal);
    record.nextRefusalPosition = position + 1;
    mapSet(record.losingIndex, key, losing);
  }

  #applyRefusal(plan: RefusalPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const refusal = plan.refusal;
    const position = refusal.position;
    // Appended, then the index advanced (SELF-R8-REFUSAL-01): a failed append consumes no position.
    record.version = plan.basis + 1;
    appendOwn(record.refusals, refusal);
    record.nextRefusalPosition = position + 1;
  }
}

/** The delivery log of one exchange of `record`, unresolved, resolved or ended by cancellation, or `null`. */
const deliveriesOf = (record: ExecutionRecord, activationId: string): DeliveryAttempt[] | null => {
  const open = record.activation;
  if (open !== null && open.activation.activationId === activationId) return open.deliveries;
  for (let index = 0; index < record.exchanges.length; index += 1) {
    const exchange = readAt(record.exchanges, index) as ResolvedExchange;
    if (exchange.activationId === activationId) return exchange.deliveries;
  }
  const cancelled = record.cancellation;
  if (cancelled !== null && cancelled.facts.endedExchange !== null && cancelled.facts.endedExchange.activationId === activationId) return cancelled.deliveries;
  return null;
};

// -- The successor check ------------------------------------------------------

/** No positions: a decision that writes no disposition. */
const NO_POSITIONS: readonly number[] = PrimordialObjectFreeze([]);

/** Throws the owner's refusal of a plan that breaks `clause`. */
const refuse = (clause: string): never => {
  throw new PrimordialError(`${STALE_PLAN} (${clause})`);
};

/**
 * One decision's governed changes, every member given. A member the decision leaves alone is the
 * record's own value, `null` (no retirement, no appended entry) or `NO_POSITIONS` (no dispositions).
 */
interface Change {
  readonly state: ExecutionState;
  readonly registrations: number;
  readonly wait: LiveWait | null;
  readonly readiness: Readiness | null;
  readonly activation: ActivationRecord | null;
  readonly cancellation: CancellationRecord | null;
  /** The generation this decision retires, appended to the retired waits, or `null`. */
  readonly retired: RetiredWait | null;
  /** The one entry this decision appends to the mailbox, or `null`. */
  readonly appended: MailboxEntry | null;
  readonly acknowledgeAt: readonly number[];
  readonly acknowledgment: MailboxDisposition;
  readonly endAt: readonly number[];
  readonly ending: MailboxDisposition;
}

/**
 * The record one decision is about to commit (design 03 Q1): its governed fields, laid over the old
 * record's lists. The next mailbox is the old entries, each with its written disposition if it has
 * one, followed by `appended`; the next retired waits are the old ones followed by `retired`. Frozen,
 * and never written: the commit only reads it.
 */
interface Successor {
  readonly state: ExecutionState;
  readonly registrations: number;
  readonly wait: LiveWait | null;
  readonly readiness: Readiness | null;
  readonly activation: ActivationRecord | null;
  readonly cancellation: CancellationRecord | null;
  readonly retired: RetiredWait | null;
  readonly appended: MailboxEntry | null;
  /** The old entries `acknowledgeAt` names, in its order. */
  readonly acknowledged: readonly MailboxEntry[];
  readonly acknowledgment: MailboxDisposition;
  /** The old entries `endAt` names, in its order. */
  readonly ended: readonly MailboxEntry[];
  readonly ending: MailboxDisposition;
  /** Each written entry's next disposition, keyed by the entry. */
  readonly written: Map<MailboxEntry, MailboxDisposition>;
}

/** The arms that build a successor. Creation admits its fresh record with P alone. */
type SuccessorArm = "input" | "dispatch" | "outcome" | "expiry" | "cancellation";

/**
 * Builds one decision's successor of a record that is not terminal (T1). Each position resolves as
 * `readAt` resolves it, so `-0` names entry 0, and one that names no entry, or an entry this decision
 * already writes, is refused (T2). Nothing that existed before changes.
 */
const successor = (record: ExecutionRecord, change: Change): Successor => {
  if (isTerminal(record.state)) refuse(T1);
  const written = new PrimordialMap<MailboxEntry, MailboxDisposition>();
  const acknowledged = resolveWrites(record, change.acknowledgeAt, change.acknowledgment, written);
  const ended = resolveWrites(record, change.endAt, change.ending, written);
  return PrimordialObjectFreeze({
    state: change.state,
    registrations: change.registrations,
    wait: change.wait,
    readiness: change.readiness,
    activation: change.activation,
    cancellation: change.cancellation,
    retired: change.retired,
    appended: change.appended,
    acknowledged,
    acknowledgment: change.acknowledgment,
    ended,
    ending: change.ending,
    written,
  });
};

/** The entries `positions` names in `record`'s mailbox, each recorded in `written` with `disposition`. */
const resolveWrites = (record: ExecutionRecord, positions: readonly number[], disposition: MailboxDisposition, written: Map<MailboxEntry, MailboxDisposition>): readonly MailboxEntry[] => {
  const entries: MailboxEntry[] = [];
  for (let index = 0; index < positions.length; index += 1) {
    const entry = readAt(record.mailbox, readAt(positions, index) as number);
    if (entry === undefined || mapGet(written, entry) !== undefined) refuse(T2);
    mapSet(written, entry as MailboxEntry, disposition);
    appendOwn(entries, entry as MailboxEntry);
  }
  return PrimordialObjectFreeze(entries);
};

/** A record as its own successor: the change that changes nothing. */
const unchanged = (record: ExecutionRecord): Successor =>
  PrimordialObjectFreeze({
    state: record.state,
    registrations: record.registrations,
    wait: record.wait,
    readiness: record.readiness,
    activation: record.activation,
    cancellation: record.cancellation,
    retired: null,
    appended: null,
    acknowledged: NO_ENTRIES,
    acknowledgment: QUEUED,
    ended: NO_ENTRIES,
    ending: QUEUED,
    written: new PrimordialMap<MailboxEntry, MailboxDisposition>(),
  });

const NO_ENTRIES: readonly MailboxEntry[] = PrimordialObjectFreeze([]);

/** Admits one arm's successor of `record`: T1–T6, then P1–P9, each in full. Returns it, or refuses. */
const admit = (record: ExecutionRecord, arm: SuccessorArm, next: Successor): Successor => {
  const transition = transitionViolation(record, arm, next);
  if (transition !== null) refuse(transition);
  const post = postStateViolation(record, next);
  if (post !== null) refuse(post);
  return next;
};

/** Admits a fresh record before it is published: P1–P9 over the record as it is. */
const admitCreated = (record: ExecutionRecord): ExecutionRecord => {
  const post = postStateViolation(record, unchanged(record));
  if (post !== null) refuse(post);
  return record;
};

// -- T: the transition rules --------------------------------------------------

/** T1–T6 for one arm's successor of `record`, in that order: the first rule it breaks, or `null`. */
const transitionViolation = (record: ExecutionRecord, arm: SuccessorArm, next: Successor): string | null => {
  if (!startsAndChangesAsItMay(record, arm, next)) return T1;
  const appended = next.appended;
  if (!writesOverQueued(next.acknowledged, next.acknowledgment) || !writesOverQueued(next.ended, next.ending) || (appended !== null && appended.disposition.kind !== "queued")) return T2;
  if (!acknowledgesAsItMay(record, arm, next)) return T3;
  if (!retiresAsItMay(record, arm, next)) return T4;
  if (!keepsReadinessAsItMay(record, arm, next)) return T5;
  const creates = record.wait === null && (next.wait !== null || next.retired !== null);
  if ((next.wait !== null && next.retired !== null) || next.registrations !== record.registrations + (creates ? 1 : 0)) return T6;
  return null;
};

/**
 * T1: the record is not terminal, and each arm starts from its own states, ends in its own, and leaves
 * every governed field it does not decide as it was (D03-CHK-04). Input queues one application Event
 * and may wake the live wait; dispatch opens an exchange from READY; an Outcome resolves its own open
 * exchange; expiry retires the live wait with one timeout; cancellation ends everything.
 */
const startsAndChangesAsItMay = (record: ExecutionRecord, arm: SuccessorArm, next: Successor): boolean => {
  const state = record.state;
  const appended = next.appended;
  if (isTerminal(state)) return false;
  const keepsExchange = next.activation === record.activation && next.cancellation === record.cancellation;
  if (arm === "input") {
    const wakes = next.retired !== null;
    const own = wakes ? state === "WAITING" && next.state === "READY" && next.wait === null : next.state === state && next.wait === record.wait;
    return own && keepsExchange && next.ended.length === 0 && appended !== null && appended.sourceCategory === "application_input";
  }
  if (arm === "dispatch") {
    return (
      state === "READY" &&
      record.activation === null &&
      next.state === "RUNNING" &&
      next.activation !== null &&
      next.cancellation === record.cancellation &&
      next.wait === record.wait &&
      next.retired === null &&
      appended === null &&
      next.ended.length === 0
    );
  }
  if (arm === "outcome") {
    const ends = next.state === "READY" || next.state === "WAITING" || next.state === "COMPLETED" || next.state === "FAILED";
    return state === "RUNNING" && record.activation !== null && next.activation === null && next.cancellation === record.cancellation && ends && (appended === null || appended.sourceCategory === "kernel_timeout");
  }
  if (arm === "expiry") {
    return (
      state === "WAITING" &&
      record.wait !== null &&
      next.state === "READY" &&
      next.wait === null &&
      keepsExchange &&
      next.retired !== null &&
      next.ended.length === 0 &&
      appended !== null &&
      appended.sourceCategory === "kernel_timeout"
    );
  }
  return next.state === "CANCELLED" && next.cancellation !== null && next.cancellation !== record.cancellation && next.wait === null && next.readiness === null && next.activation === null && appended === null;
};

/** T2: every written entry is queued in the old record, and the value written over it is not `queued`. */
const writesOverQueued = (entries: readonly MailboxEntry[], disposition: MailboxDisposition): boolean => {
  if (entries.length === 0) return true;
  if (disposition.kind === "queued") return false;
  for (let index = 0; index < entries.length; index += 1) {
    if ((readAt(entries, index) as MailboxEntry).disposition.kind !== "queued") return false;
  }
  return true;
};

/**
 * T3: only the Outcome that resolves an exchange acknowledges (D03-CHK-04: an input while RUNNING
 * acknowledges nothing), and an ending is never an acknowledgment. That Outcome acknowledges only its
 * batch, by its Activation, and leaves every batch entry acknowledged by it: written now, or already, by
 * an earlier commit of this exchange's Outcome that a host fault interrupted (L-28). Without such a
 * fault the batch is still queued, so the writes are exactly the batch.
 */
const acknowledgesAsItMay = (record: ExecutionRecord, arm: SuccessorArm, next: Successor): boolean => {
  const acknowledged = next.acknowledged;
  if (next.ended.length > 0 && next.ending.kind === "acknowledged") return false;
  const open = record.activation;
  if (arm !== "outcome" || open === null) return acknowledged.length === 0;
  const batch = open.batch;
  const activationId = open.activation.activationId;
  const disposition = next.acknowledgment;
  if (acknowledged.length > 0 && (disposition.kind !== "acknowledged" || disposition.activationId !== activationId)) return false;
  for (let index = 0; index < acknowledged.length; index += 1) {
    if (!batchHolds(batch, (readAt(acknowledged, index) as MailboxEntry).eventId)) return false;
  }
  for (let index = 0; index < batch.length; index += 1) {
    const entry = entryNamed(record, readAt(batch, index) as string);
    if (entry === undefined) return false;
    const after = dispositionIn(next, entry);
    if (after.kind !== "acknowledged" || after.activationId !== activationId) return false;
  }
  return true;
};

/** The first entry of `record`'s mailbox with this Event ID, or `undefined`. */
const entryNamed = (record: ExecutionRecord, eventId: string): MailboxEntry | undefined => {
  for (let index = 0; index < record.mailbox.length; index += 1) {
    const entry = readAt(record.mailbox, index) as MailboxEntry;
    if (entry.eventId === eventId) return entry;
  }
  return undefined;
};

const batchHolds = (batch: readonly string[], eventId: string): boolean => {
  for (let index = 0; index < batch.length; index += 1) if ((readAt(batch, index) as string) === eventId) return true;
  return false;
};

/**
 * T4: retiring the live generation copies its registration facts and takes the arm's cause and ending
 * Event: an input wake ends at the appended Event, an expiry at its timeout, a cancellation at nothing.
 * A registration an Outcome creates names the resolving Activation and is not retired by cancellation.
 */
const retiresAsItMay = (record: ExecutionRecord, arm: SuccessorArm, next: Successor): boolean => {
  const live = record.wait;
  const retired = next.retired;
  const appended = next.appended;
  if (arm === "input") return retired === null || (live !== null && appended !== null && retiresLive(retired, live, "event", appended.eventId));
  if (arm === "expiry") return live !== null && retired !== null && appended !== null && retiresLive(retired, live, "deadline", appended.eventId);
  if (arm === "cancellation") return live === null ? retired === null : retired !== null && retiresLive(retired, live, "cancellation", null);
  if (arm === "dispatch") return retired === null;
  const open = record.activation;
  const resolver = open === null ? null : open.activation.activationId;
  const wait = next.wait;
  return (wait === null || wait.registeredBy === resolver) && (retired === null || (retired.registeredBy === resolver && retired.retiredBy !== "cancellation"));
};

/** Whether `retired` retires the live wait `live` as it is, by `cause`, ended by `endingEventId`. */
const retiresLive = (retired: RetiredWait, live: LiveWait, cause: RetiredWait["retiredBy"], endingEventId: string | null): boolean =>
  retired.generation === live.generation &&
  retired.registeredBy === live.registeredBy &&
  retired.declaration === live.declaration &&
  retired.deadline === live.deadline &&
  retired.retiredBy === cause &&
  retired.endingEventId === endingEventId;

/**
 * T5 (D03-CHK-03): an Event or deadline retirement installs readiness, which P9 then ties to it;
 * dispatch consumes readiness and cancellation discards it; every other decision keeps it as it was.
 */
const keepsReadinessAsItMay = (record: ExecutionRecord, arm: SuccessorArm, next: Successor): boolean => {
  const retired = next.retired;
  if (retired !== null && retired.retiredBy !== "cancellation") return next.readiness !== null;
  if (arm === "dispatch" || arm === "cancellation") return next.readiness === null;
  return next.readiness === record.readiness;
};

// -- P: the post-state predicate ----------------------------------------------

/** The next record's retired wait at `index`, or `undefined` past the last. */
const retiredIn = (record: ExecutionRecord, next: Successor, index: number): RetiredWait | undefined => {
  const old = record.retiredWaits.length;
  if (index < old) return readAt(record.retiredWaits, index);
  return index === old && next.retired !== null ? next.retired : undefined;
};

/** One entry's disposition in the next record. */
const dispositionIn = (next: Successor, entry: MailboxEntry): MailboxDisposition => {
  const written = mapGet(next.written, entry);
  return written === undefined ? entry.disposition : written;
};

/** The next mailbox's entry at `position`, the appended entry last. */
const entryIn = (record: ExecutionRecord, next: Successor, position: number): MailboxEntry =>
  position < record.mailbox.length ? (readAt(record.mailbox, position) as MailboxEntry) : (next.appended as MailboxEntry);

/**
 * P1–P9 over the whole next record, in that order: the first clause it breaks, or `null` (design 03
 * Q2, revised: every clause in full on every decision, owner choice 05).
 */
const postStateViolation = (record: ExecutionRecord, next: Successor): string | null => {
  const state = next.state;
  const terminal = isTerminal(state);
  if (terminal && (next.wait !== null || next.readiness !== null || next.activation !== null)) return P1;
  if ((state === "WAITING") !== (next.wait !== null)) return P2;
  if ((state === "RUNNING") !== (next.activation !== null)) return P3;
  if ((state === "CANCELLED") !== (next.cancellation !== null)) return P4;
  const length = record.mailbox.length + (next.appended === null ? 0 : 1);
  for (let position = 0; position < length; position += 1) {
    const kind = dispositionIn(next, entryIn(record, next, position)).kind;
    if (terminal && kind === "queued") return P1;
    if (!terminal && kind === "terminal") return P5;
  }
  // P6: the generation ledger, and each wait's deadline equation (D03-CHK-02).
  const retiredCount = record.retiredWaits.length + (next.retired === null ? 0 : 1);
  const wait = next.wait;
  if (retiredCount + (wait === null ? 0 : 1) !== next.registrations) return P6;
  let deadlines = 0;
  for (let index = 0; index < retiredCount; index += 1) {
    const retired = retiredIn(record, next, index) as RetiredWait;
    if (retired.generation !== index + 1 || retired.deadline !== retired.declaration.deadline) return P6;
    if (retired.retiredBy === "deadline") deadlines += 1;
  }
  if (wait !== null && (wait.generation !== retiredCount + 1 || wait.deadline !== wait.declaration.deadline)) return P6;
  // P7: the timeout Events and the deadline retirements, one to one.
  const timedOut = new PrimordialMap<number, true>();
  let timeouts = 0;
  const byEventId = new PrimordialMap<string, MailboxEntry>();
  for (let position = 0; position < length; position += 1) {
    const entry = entryIn(record, next, position);
    if (mapGet(byEventId, entry.eventId) === undefined) mapSet(byEventId, entry.eventId, entry);
    if (entry.sourceCategory !== "kernel_timeout") continue;
    timeouts += 1;
    const generation = entry.waitGeneration as number;
    const retired = retiredIn(record, next, generation - 1);
    if (mapGet(timedOut, generation) !== undefined || retired === undefined || retired.generation !== generation || retired.retiredBy !== "deadline" || retired.endingEventId !== entry.eventId || retired.deadline !== entry.deadline) return P7;
    mapSet(timedOut, generation, true);
  }
  if (timeouts !== deadlines) return P7;
  // P8: each retirement's cause. A deadline retirement's ending is its timeout (P7).
  for (let index = 0; index < retiredCount; index += 1) {
    const retired = retiredIn(record, next, index) as RetiredWait;
    if (retired.retiredBy === "cancellation") {
      if (index !== retiredCount - 1 || state !== "CANCELLED" || retired.endingEventId !== null) return P8;
    } else if (retired.retiredBy === "event") {
      const ending = retired.endingEventId === null ? undefined : mapGet(byEventId, retired.endingEventId);
      if (ending === undefined || ending.sourceCategory === "kernel_timeout") return P8;
    } else if (retired.retiredBy !== "deadline") {
      return P8;
    }
  }
  // P9: readiness belongs to the last retirement, whose ending Event is still queued.
  const readiness = next.readiness;
  if (readiness !== null) {
    const last = retiredIn(record, next, retiredCount - 1);
    if (state !== "READY" || last === undefined) return P9;
    const timeoutEventId = last.retiredBy === "deadline" ? last.endingEventId : null;
    if (readiness.generation !== last.generation || readiness.species !== last.retiredBy || readiness.selector !== last.declaration || readiness.timeoutEventId !== timeoutEventId) return P9;
    const ending = last.endingEventId === null ? undefined : mapGet(byEventId, last.endingEventId);
    if (ending === undefined || dispositionIn(next, ending).kind !== "queued") return P9;
  }
  return null;
};

// -- View construction -------------------------------------------------------

/**
 * One carried Event, frozen.
 *
 * The Activation is immutable, and the same object is handed to the Driver again on every ordinary
 * redelivery. Freezing each member as well as the array means a Driver cannot edit the exchange it
 * was given and have the edit reappear under the same Activation ID. The payload is already a sealed
 * copy from acceptance.
 */
const toActivationEvent = (entry: MailboxEntry): ActivationEvent => {
  if (entry.sourceCategory === "kernel_timeout") {
    return PrimordialObjectFreeze({
      eventId: entry.eventId,
      destination: entry.destination,
      kind: entry.kind,
      payload: null,
      sourceCategory: "kernel_timeout" as const,
      waitGeneration: entry.waitGeneration as number,
      deadline: entry.deadline as number,
      acceptancePosition: entry.acceptancePosition,
    });
  }
  const base = {
    eventId: entry.eventId,
    destination: entry.destination,
    kind: entry.kind,
    payload: (entry.payload as CanonicalValue).value,
    sourceCategory: "application_input",
    acceptancePosition: entry.acceptancePosition,
  } as const;
  return PrimordialObjectFreeze(entry.subscriptionClass === null ? base : { ...base, subscriptionClass: entry.subscriptionClass });
};

const toDeliveryView = (attempt: DeliveryAttempt): DeliveryAttemptView => ({
  attempt: attempt.attempt,
  status: attempt.status,
  failure: attempt.failure,
  activationId: attempt.activationId,
  writerEpoch: attempt.writerEpoch,
});

const toExchangeView = (exchange: ResolvedExchange): ExchangeView => ({
  activationId: exchange.activationId,
  writerEpoch: exchange.writerEpoch,
  baseProgressRevision: exchange.baseProgressRevision,
  batch: copyOwn(exchange.batch),
  dispatchReceipt: exchange.dispatchReceipt,
  outcomeReceipt: exchange.outcomeReceipt,
  deliveries: mapOwn(exchange.deliveries, toDeliveryView),
});

const toActivationView = (intent: ActivationRecord): ActivationView => ({
  activationId: intent.activation.activationId,
  writerEpoch: intent.activation.writerEpoch,
  baseProgressRevision: intent.activation.baseProgressRevision,
  batch: copyOwn(intent.batch),
  receipt: intent.receipt,
  deliveries: mapOwn(intent.deliveries, toDeliveryView),
});

const toMailboxView = (entry: MailboxEntry, isReserved: (eventId: string) => boolean): MailboxEntryView => {
  if (entry.sourceCategory === "kernel_timeout") {
    return {
      eventId: entry.eventId,
      inputId: null,
      kind: entry.kind,
      payload: null,
      subscriptionClass: null,
      sourceCategory: "kernel_timeout",
      waitGeneration: entry.waitGeneration as number,
      deadline: entry.deadline as number,
      acceptancePosition: entry.acceptancePosition,
      disposition: entry.disposition,
      reserved: isReserved(entry.eventId),
      receipt: null,
    };
  }
  return {
    eventId: entry.eventId,
    inputId: { ...(entry.inputId as InputId) },
    kind: entry.kind,
    payload: (entry.payload as CanonicalValue).value,
    subscriptionClass: entry.subscriptionClass,
    sourceCategory: "application_input",
    acceptancePosition: entry.acceptancePosition,
    disposition: entry.disposition,
    reserved: isReserved(entry.eventId),
    receipt: entry.receipt as Receipt,
  };
};

const toReadinessView = (readiness: Readiness): ReadinessView => ({
  species: readiness.species,
  generation: readiness.generation,
  timeoutEventId: readiness.timeoutEventId,
});

function viewOf(record: ExecutionRecord): ExecutionView {
  // Membership over the reserved batch without constructing a `Set` (global `Set` and
  // `Set.prototype.has` are both caller-mutable) and without any prototype method: batches are
  // small and bounded by the mailbox capacity, so a linear scan is exact and dependency-free.
  const batch = record.activation === null ? null : record.activation.batch;
  const isReserved = (eventId: string): boolean => {
    if (batch === null) return false;
    for (let index = 0; index < batch.length; index += 1) {
      if ((readAt(batch, index) as string) === eventId) return true;
    }
    return false;
  };
  // Every list this view is assembled from is built as own data. A view is the Kernel's own answer
  // about retained truth, so a fresh projection must not be droppable or substitutable through
  // ambient pollution an earlier boundary observation left installed (K11-R6-STATE-02).
  const mailbox: MailboxEntryView[] = [];
  const queued: string[] = [];
  const acknowledged: string[] = [];
  const terminalDispositions: string[] = [];
  for (let index = 0; index < record.mailbox.length; index += 1) {
    const entry = readAt(record.mailbox, index) as MailboxEntry;
    appendOwn(mailbox, toMailboxView(entry, isReserved));
    if (entry.disposition.kind === "queued") appendOwn(queued, entry.eventId);
    else if (entry.disposition.kind === "acknowledged") appendOwn(acknowledged, entry.eventId);
    else if (entry.disposition.kind === "terminal") appendOwn(terminalDispositions, entry.eventId);
  }
  return {
    executionId: record.executionId,
    state: record.state,
    scope: record.scope,
    creationKey: record.creationRequestId.requestKey,
    definitionRevision: record.definitionRevision,
    runtimeContractRevision: record.runtimeContractRevision,
    progressCodec: record.progressCodec,
    acceptedProgress: record.acceptedProgress,
    progressRevision: record.progressRevision,
    authorityContext: record.authorityContext.value,
    activation: record.activation === null ? null : toActivationView(record.activation),
    recoveryHolds: record.activation === null ? [] : holdsOf(record.activation),
    recoveryHistory: copyOwn(record.recoveryHistory),
    exchanges: mapOwn(record.exchanges, toExchangeView),
    // The retained records are frozen at acceptance; the list around them is a fresh copy.
    emissions: copyOwn(record.emissions),
    result: record.result,
    mailbox,
    queued,
    acknowledged,
    terminalDispositions,
    refusals: copyOwn(record.refusals),
    receipts: copyOwn(record.receipts),
    // The live wait, the retired records and the fire records are frozen at acceptance.
    wait: record.wait,
    waitEndedReadiness: record.readiness === null ? null : toReadinessView(record.readiness),
    retiredWaits: copyOwn(record.retiredWaits),
    timerFires: copyOwn(record.timerFires),
    executionDeadline: record.executionDeadline,
    cancellation: record.cancellation === null ? null : toCancellationView(record.cancellation),
    losingOutcomes: losingOutcomesOf(record),
  };
}

/** The retained losing proposals in insertion order, as own data: `Map.forEach` through the load-time reference. */
const losingOutcomesOf = (record: ExecutionRecord): LosingOutcomeView[] => {
  const losing: LosingOutcomeView[] = [];
  PrimordialReflectApply(PrimordialMapForEach, record.losingIndex, [
    (entry: LosingOutcomeView) => {
      appendOwn(losing, entry);
    },
  ]);
  return losing;
};

/** The cancellation as inspection shows it: its frozen facts, and a fresh copy of the ended exchange's deliveries. */
const toCancellationView = (cancelled: CancellationRecord): CancellationView & { readonly deliveries: readonly DeliveryAttemptView[] } => {
  const facts = cancelled.facts;
  return {
    cause: facts.cause,
    actorNamespace: facts.actorNamespace,
    actorScope: facts.actorScope,
    position: facts.position,
    endedExchange: facts.endedExchange,
    retiredGeneration: facts.retiredGeneration,
    terminalDispositions: facts.terminalDispositions,
    deliveries: cancelled.deliveries === null ? [] : mapOwn(cancelled.deliveries, toDeliveryView),
  };
};
