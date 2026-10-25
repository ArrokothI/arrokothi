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
 * mutable containers from plan data; nothing that existed before changes. **Commit** then appends the
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
 * The owner's structural checks (K1.3, design 01 § 12 and addendum 01 § A7). Each refuses a plan that
 * would break one rule whatever the coordinator decided, and names the rule it guards:
 *
 * - S1: a terminal Execution never reopens; dispatch needs `READY` and an Outcome `RUNNING`.
 * - S2: a plan whose next state is terminal disposes every queued Event: acknowledged or ended. It
 *   does not by itself prove that a cancellation acknowledges nothing; the cancellation plan carries
 *   no acknowledgment to apply.
 * - S3: `WAITING` exactly when one generation is live; a plan that retires a generation names the live one.
 * - S4: at most one timeout Event per generation: only the live generation expires, once.
 * - S5: readiness is set only over none, and only by a retirement.
 *
 * These are owner guards, not semantic closure: which Events are eligible, which batch is selected and
 * which plan an operation forms stay the coordinator's, checked by the tests (L-15).
 */
const S1 = "S1 a terminal Execution never reopens";
const S2 = "S2 a terminal decision disposes every queued Event";
const S3 = "S3 WAITING exactly when one generation is live";
const S4 = "S4 at most one timeout Event per generation";
const S5 = "S5 readiness only over none, by a retirement";

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
    const record: ExecutionRecord = {
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
    const readiness = plan.readiness;
    const live = record.wait;
    if (isTerminal(record.state)) throw new PrimordialError(`${STALE_PLAN} (${S1})`);
    if ((woken === null) !== (readiness === null)) throw new PrimordialError(`${STALE_PLAN} (${S5})`);
    if (woken !== null && (record.state !== "WAITING" || live === null || live.generation !== woken.generation)) throw new PrimordialError(`${STALE_PLAN} (${S3})`);
    if (readiness !== null && record.readiness !== null) throw new PrimordialError(`${STALE_PLAN} (${S5})`);
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
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = position + 1;
    appendOwn(record.mailbox, entry);
    mapSet(record.byInputId, inputIdKey(inputId), entry);
    appendOwn(record.receipts, receipt);
    if (woken !== null) appendOwn(record.retiredWaits, woken);
    if (woken !== null) record.wait = null;
    if (readiness !== null) record.readiness = readiness;
    if (woken !== null) record.state = "READY";
  }

  #applyDispatch(plan: DispatchPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    if (record.activation !== null) throw new PrimordialError(STALE_PLAN);
    if (record.state !== "READY") throw new PrimordialError(`${STALE_PLAN} (${S1})`);
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
    record.version = plan.basis + 1;
    record.activationsMinted = activationsMinted;
    record.nextAcceptancePosition = position + 1;
    record.activation = intent;
    record.state = "RUNNING";
    appendOwn(record.receipts, receipt);
    record.readiness = null;
  }

  #applyDelivery(plan: DeliveryPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const exchange = record.activation;
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
    if (record.state !== "RUNNING") throw new PrimordialError(`${STALE_PLAN} (${S1})`);
    const registrations = plan.registrations;
    const liveWait = plan.liveWait;
    const retired = plan.retired;
    const readiness = plan.readiness;
    const timeout = plan.timeout;
    if ((plan.nextState === "WAITING") !== (liveWait !== null)) throw new PrimordialError(`${STALE_PLAN} (${S3})`);
    if (registrations !== record.registrations && registrations !== record.registrations + 1) throw new PrimordialError(`${STALE_PLAN} (${S3})`);
    if (liveWait !== null && (liveWait.generation !== registrations || record.wait !== null)) throw new PrimordialError(`${STALE_PLAN} (${S3})`);
    if (retired !== null && retired.generation !== registrations) throw new PrimordialError(`${STALE_PLAN} (${S3})`);
    if (timeout !== null && (retired === null || retired.retiredBy !== "deadline" || timeout.generation !== retired.generation)) throw new PrimordialError(`${STALE_PLAN} (${S4})`);
    if ((retired === null) !== (readiness === null) || (readiness !== null && record.readiness !== null)) throw new PrimordialError(`${STALE_PLAN} (${S5})`);
    if (isTerminal(plan.nextState) && !disposesEveryQueued(record.mailbox, plan.acknowledgeAt, plan.endAt)) throw new PrimordialError(`${STALE_PLAN} (${S2})`);
    const timeoutEntry: MailboxEntry | null =
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
    const toAcknowledge: MailboxEntry[] = [];
    for (let index = 0; index < plan.acknowledgeAt.length; index += 1) {
      appendOwn(toAcknowledge, readAt(record.mailbox, readAt(plan.acknowledgeAt, index) as number) as MailboxEntry);
    }
    const toEnd: MailboxEntry[] = [];
    for (let index = 0; index < plan.endAt.length; index += 1) {
      appendOwn(toEnd, readAt(record.mailbox, readAt(plan.endAt, index) as number) as MailboxEntry);
    }
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
    const acknowledgment = plan.acknowledgment;
    const ending = plan.ending;
    const stored = plan.stored;
    const outcome = stored.content;
    const progressRevision = plan.progressRevision;
    const emissionRecords = plan.emissions;
    const result = plan.result;
    const activationId = facts.activationId;
    const historyToAppend = plan.history;
    const nextState = plan.nextState;
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
    record.activation = null;
    record.state = nextState;
  }

  #applyTakeover(plan: TakeoverPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const exchange = record.activation;
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
    const retired = plan.retired;
    const readiness = plan.readiness;
    const fire = plan.fire;
    const live = record.wait;
    if (isTerminal(record.state)) throw new PrimordialError(`${STALE_PLAN} (${S1})`);
    if (record.state !== "WAITING" || live === null || live.generation !== retired.generation) throw new PrimordialError(`${STALE_PLAN} (${S3})`);
    if (timeout.generation !== live.generation || retired.retiredBy !== "deadline") throw new PrimordialError(`${STALE_PLAN} (${S4})`);
    if (record.readiness !== null || readiness.generation !== live.generation) throw new PrimordialError(`${STALE_PLAN} (${S5})`);
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
    // A timeout takes the next acceptance position and mints no receipt (identity.md: timeout
    // acceptance is Kernel-internal, not a seventh receipt boundary).
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = timeout.acceptancePosition + 1;
    appendOwn(record.mailbox, entry);
    appendOwn(record.retiredWaits, retired);
    appendOwn(record.timerFires, fire);
    record.wait = null;
    record.readiness = readiness;
    record.state = "READY";
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
    const retired = plan.retired;
    const history = plan.history;
    const fire = plan.fire;
    const ending = plan.ending;
    const live = record.wait;
    const intent = record.activation;
    if (isTerminal(record.state)) throw new PrimordialError(`${STALE_PLAN} (${S1})`);
    if (retired === null ? live !== null : live === null || live.generation !== retired.generation || retired.retiredBy !== "cancellation") throw new PrimordialError(`${STALE_PLAN} (${S3})`);
    if (!disposesEveryQueued(record.mailbox, NO_POSITIONS, plan.endAt)) throw new PrimordialError(`${STALE_PLAN} (${S2})`);
    if ((intent === null) !== (facts.endedExchange === null) || (intent !== null && facts.endedExchange !== null && intent.activation.activationId !== facts.endedExchange.activationId)) {
      throw new PrimordialError(STALE_PLAN);
    }
    const toEnd: MailboxEntry[] = [];
    for (let index = 0; index < plan.endAt.length; index += 1) {
      appendOwn(toEnd, readAt(record.mailbox, readAt(plan.endAt, index) as number) as MailboxEntry);
    }
    // The ended exchange's delivery log stays the one the capabilities write into, as for a resolved
    // exchange, so a late report still settles its original row; the frozen facts never hold it.
    const cancellation: CancellationRecord = PrimordialObjectFreeze({ facts, deliveries: intent === null ? null : intent.deliveries });
    const position = facts.position;
    // A cancellation takes an acceptance position and mints no receipt (identity.md's six boundaries).
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = position + 1;
    for (let index = 0; index < toEnd.length; index += 1) (readAt(toEnd, index) as MailboxEntry).disposition = ending;
    if (retired !== null) appendOwn(record.retiredWaits, retired);
    appendAllOwn(record.recoveryHistory, history);
    if (fire !== null) appendOwn(record.timerFires, fire);
    record.cancellation = cancellation;
    record.wait = null;
    record.readiness = null;
    record.activation = null;
    record.state = "CANCELLED";
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

/** No positions: the cancellation acknowledges nothing. */
const NO_POSITIONS: readonly number[] = PrimordialObjectFreeze([]);

/**
 * S2: whether two position lists together name every queued entry of `mailbox` exactly once, and only
 * queued ones. A terminal decision must leave nothing queued (B-5).
 */
const disposesEveryQueued = (mailbox: readonly MailboxEntry[], first: readonly number[], second: readonly number[]): boolean => {
  let queued = 0;
  for (let index = 0; index < mailbox.length; index += 1) {
    if ((readAt(mailbox, index) as MailboxEntry).disposition.kind === "queued") queued += 1;
  }
  if (first.length + second.length !== queued) return false;
  const named = (list: readonly number[]): boolean => {
    for (let index = 0; index < list.length; index += 1) {
      const entry = readAt(mailbox, readAt(list, index) as number);
      if (entry === undefined || entry.disposition.kind !== "queued") return false;
    }
    return true;
  };
  return named(first) && named(second);
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
