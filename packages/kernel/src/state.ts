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
import { creationRequestIdKey, inputIdKey, type InputId, type Receipt } from "./identity.ts";
import type {
  ActivationView,
  DeliveryAttemptView,
  ExchangeView,
  ExecutionView,
  MailboxDisposition,
  MailboxEntryView,
} from "./inspection.ts";
import type { ExecutionState } from "./lifecycle.ts";
import { appendAllOwn, appendOwn, copyOwn, mapOwn, readAt } from "./own-array.ts";
import {
  holdsOf,
  QUEUED,
  type AcceptedOutcome,
  type ControlPlan,
  type CreationPlan,
  type DeliveryPlan,
  type DispatchPlan,
  type InputPlan,
  type OutcomeAccepted,
  type OutcomePlan,
  type Plan,
  type RefusalPlan,
  type SettlementPlan,
  type StoredHold,
  type TakeoverPlan,
} from "./plan.ts";
import type { ActivationRecord, DeliveryAttempt, ExecutionRecord, MailboxEntry, ResolvedExchange } from "./state-records.ts";
import type { BoundaryValue } from "./value-types.ts";

const PrimordialObjectFreeze = Object.freeze;
const PrimordialReflectApply = Reflect.apply;
const PrimordialMap = Map;
const PrimordialMapGet = Map.prototype.get;
const PrimordialMapSet = Map.prototype.set;
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

  get receipt(): Receipt {
    return this.#entry.receipt;
  }

  get disposition(): MailboxDisposition {
    return this.#entry.disposition;
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

  /** The next Execution in creation order, or `null`. */
  get nextExecution(): ExecutionReader | null {
    const next = this.#record.next;
    return next === null ? null : new ExecutionReader(next);
  }

  /** The mailbox entry at `index`, which must be below `mailboxLength`. */
  entryAt(index: number): EntryReader {
    return new EntryReader(readAt(this.#record.mailbox, index) as MailboxEntry);
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
  // Creation order, as links on the records: appending writes plain fields and calls nothing, so it
  // cannot separate an Execution's listing from its lookup.
  #first: ExecutionRecord | null = null;
  #last: ExecutionRecord | null = null;

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

  /** The first Execution in creation order, or `null`. */
  get firstExecution(): ExecutionReader | null {
    const first = this.#first;
    return first === null ? null : new ExecutionReader(first);
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
      inputId: initial.inputId,
      contentIdentity: initial.contentIdentity,
      kind: initial.kind,
      payload: initial.payload,
      subscriptionClass: initial.subscriptionClass,
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
      version: plan.basis + 1,
      next: null,
    };
    const last = this.#last;
    mapSet(this.#executions, executionId, record);
    mapSet(this.#byCreationRequestId, creationRequestIdKey(creationRequestId), record);
    if (last === null) this.#first = record;
    else last.next = record;
    this.#last = record;
  }

  #applyInput(plan: InputPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    const facts = plan.entry;
    const inputId: InputId = facts.inputId;
    const receipt = facts.receipt;
    const position = receipt.position;
    const entry: MailboxEntry = {
      eventId: facts.eventId,
      inputId,
      contentIdentity: facts.contentIdentity,
      kind: facts.kind,
      payload: facts.payload,
      subscriptionClass: facts.subscriptionClass,
      acceptancePosition: facts.acceptancePosition,
      receipt,
      disposition: QUEUED,
    };
    record.version = plan.basis + 1;
    record.nextAcceptancePosition = position + 1;
    appendOwn(record.mailbox, entry);
    mapSet(record.byInputId, inputIdKey(inputId), entry);
    appendOwn(record.receipts, receipt);
  }

  #applyDispatch(plan: DispatchPlan): void {
    const record = this.#resolve(plan.executionId, plan.basis);
    if (record.activation !== null) throw new PrimordialError(STALE_PLAN);
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

/** The delivery log of one exchange of `record`, unresolved or resolved, or `null`. */
const deliveriesOf = (record: ExecutionRecord, activationId: string): DeliveryAttempt[] | null => {
  const open = record.activation;
  if (open !== null && open.activation.activationId === activationId) return open.deliveries;
  for (let index = 0; index < record.exchanges.length; index += 1) {
    const exchange = readAt(record.exchanges, index) as ResolvedExchange;
    if (exchange.activationId === activationId) return exchange.deliveries;
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
  const base = {
    eventId: entry.eventId,
    destination: entry.inputId.destination,
    kind: entry.kind,
    payload: entry.payload.value,
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

const toMailboxView = (entry: MailboxEntry, isReserved: (eventId: string) => boolean): MailboxEntryView => ({
  eventId: entry.eventId,
  inputId: { ...entry.inputId },
  kind: entry.kind,
  payload: entry.payload.value,
  subscriptionClass: entry.subscriptionClass,
  sourceCategory: "application_input",
  acceptancePosition: entry.acceptancePosition,
  disposition: entry.disposition,
  reserved: isReserved(entry.eventId),
  receipt: entry.receipt,
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
  };
}
