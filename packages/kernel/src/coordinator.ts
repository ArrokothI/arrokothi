/**
 * The target Kernel coordinator: create, accept input, reserve a batch and dispatch.
 *
 * This is the K1.1 surface. It implements the boundaries `creation.md` and `execution-cycle.md` own
 * up to, but not including, Outcome acceptance:
 *
 * - one atomic creation per caller-scoped creation key, with the initial input;
 * - post-creation input ingress under the Input ID triple, including refusal of new ordinary
 *   input to a terminal destination (the rule is K1.1's; manufacturing a terminal state is not —
 *   cancellation and terminal disposition are K1.3's, completion/failure are K1.2's, so no
 *   terminal state is reachable in this packet and the branch is specified-but-unexercised here);
 * - one atomic dispatch intent that reserves an exact batch and pins the exchange;
 * - ordinary redelivery of that same exchange;
 * - minimum inspection.
 *
 * Everything else refuses by name. Outcome acceptance, the writer-epoch advance under an authorized
 * takeover and the recovery hold for unavailable pinned code are K1.2's; out-of-band cancellation
 * and terminal disposition, wait registration, wait matching and deadlines are K1.3's; Effects are
 * K2's. `refuseUnsupportedSurface` is the K1.0 mechanism for saying so, reused rather than
 * reinvented.
 *
 * ## What this coordinator is not
 *
 * It is in memory and process-scoped. Nothing here survives process loss, and this packet makes no
 * durability, isolation, scheduling or Driver-fidelity claim. A persistent profile is K3's; the
 * dispatch intent is written before the Driver is called *because that is the accepted order*, not
 * because this implementation can recover it after a crash.
 *
 * ## Retention, published
 *
 * `creation.md` requires the exact expired-key policy to be published. This profile's policy is:
 * **no creation key and no Input ID ever expires while the coordinator lives, and nothing survives
 * it.** Deduplication is therefore exact for the coordinator's whole lifetime, and no expired-key
 * case exists here. A profile that does expire keys must publish its own policy before enabling
 * expiry, and must keep `evidence.md`'s rule that an expired idempotency key never silently becomes
 * another consequential request.
 */

import type { Activation, ActivationEvent, ExecutionDriver } from "./driver.ts";
import {
  creationKeyIdKey,
  inputIdKey,
  MISSING_SCOPE_SENTINEL,
  mayReachScope,
  mintReceipt,
  packIdentity,
  type AuthenticatedCaller,
  type CreationKeyId,
  type InputId,
  type Receipt,
  type ReceiptBoundary,
} from "./identity.ts";
import type {
  ActivationView,
  DeliveryAttemptView,
  ExecutionView,
  MailboxDisposition,
  MailboxEntryView,
} from "./inspection.ts";
import { isTerminal, type ExecutionState } from "./lifecycle.ts";
import { UNKNOWN_DESTINATION_REASON, mintRefusal, type RefusalClassification, type RefusalRecord } from "./refusal.ts";
import { err, ok, type Result } from "./result.ts";
import { refuseUnsupportedSurface } from "./unsupported.ts";
import { canonicalize, type BoundaryValue, type CanonicalValue, type ValueIssue } from "./values.ts";

// -- Requests and accepted answers -------------------------------------------

/** The content of one input Event, independent of which boundary accepts it. */
export interface InputContent {
  readonly kind: string;
  readonly payload: BoundaryValue;
  /**
   * The declared input-subscription class, when the producer declares one. Matched by K1.3, not here.
   *
   * Omitting it and passing `undefined` mean the same thing at this request envelope, which is an
   * ordinary TypeScript optional property rather than a boundary value. The content value the Kernel
   * builds and compares simply has no such member, and `values.md` rule 6 then makes "absent" and
   * "present as null" different content - so adding the member on a retry is a conflict.
   */
  readonly subscriptionClass?: string;
}

/**
 * One create request.
 *
 * There is no principal field. The authenticated caller is a separate argument, so no payload can
 * supply or change the namespace a creation key is scoped by.
 */
export interface CreateExecutionRequest {
  /** Caller-chosen text reused when retrying this one intended request. Not a content hash. */
  readonly creationKey: string;
  /** The authority scope the Execution is bound to. The caller must hold it. */
  readonly scope: string;
  readonly definitionRevision: string;
  readonly runtimeContractRevision: string;
  /** The progress codec pinned for this Execution's continuation data. */
  readonly progressCodec: string;
  /** Opaque application authority context, supplied to the Runtime as its execution view. */
  readonly authorityContext: BoundaryValue;
  readonly initialInput: InputContent;
}

export interface CreationAccepted {
  readonly executionId: string;
  readonly receipt: Receipt;
  /** True when this call returned an already-accepted decision rather than committing a new one. */
  readonly replayed: boolean;
  /** The Event the initial input was accepted as, in the same atomic decision. */
  readonly initialEventId: string;
}

/** One post-creation input request. */
export interface SubmitInputRequest {
  readonly destination: string;
  /** The producer's request key: the third member of the Input ID triple. */
  readonly requestKey: string;
  readonly kind: string;
  readonly payload: BoundaryValue;
  readonly subscriptionClass?: string;
}

export interface InputAccepted {
  readonly eventId: string;
  readonly receipt: Receipt;
  readonly replayed: boolean;
  readonly acceptancePosition: number;
  readonly disposition: MailboxDisposition;
}

export interface DispatchOptions {
  /** The implementation-owned batch bound. `B-1`: at least one. */
  readonly bound: number;
}

export interface DispatchAccepted {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly batch: readonly string[];
  readonly receipt: Receipt;
  /** True when this call re-sent an already-accepted dispatch intent rather than accepting a new one. */
  readonly redelivered: boolean;
}

export interface CoordinatorOptions {
  readonly driver: ExecutionDriver;
  /**
   * The declared maximum number of unacknowledged Events one Execution's mailbox may hold.
   *
   * `creation.md`: "Capacity limits refuse ingress before acknowledgment." Nothing in this packet
   * acknowledges an Event, so a mailbox at capacity stays at capacity until K1.2 lands; that is the
   * honest consequence of the boundary, not a defect in the limit.
   */
  readonly mailboxCapacity?: number;
}

// -- Internal records --------------------------------------------------------

interface MailboxEntry {
  readonly eventId: string;
  readonly inputId: InputId;
  /** The injective packing of this input's content parts; equal identity means equal content. */
  readonly contentIdentity: string;
  readonly kind: string;
  readonly payload: BoundaryValue;
  readonly subscriptionClass: string | null;
  readonly acceptancePosition: number;
  readonly receipt: Receipt;
  disposition: MailboxDisposition;
}

interface DeliveryAttempt {
  readonly attempt: number;
  status: "pending" | "delivered" | "failed";
  failure: string | null;
}

interface ActivationRecord {
  readonly activation: Activation;
  readonly receipt: Receipt;
  readonly batch: readonly string[];
  readonly deliveries: DeliveryAttempt[];
}

interface ExecutionRecord {
  readonly executionId: string;
  readonly scope: string;
  readonly creationKey: CreationKeyId;
  readonly definitionRevision: string;
  readonly runtimeContractRevision: string;
  readonly progressCodec: string;
  readonly authorityContext: BoundaryValue;
  /** The injective packing of the complete creation content this key is bound to. */
  readonly creationIdentity: string;
  readonly creationReceipt: Receipt;
  /** The Event the initial input was accepted as. Retained so a creation replay can name it. */
  readonly initialEventId: string;
  readonly mailbox: MailboxEntry[];
  readonly byInputId: Map<string, MailboxEntry>;
  readonly refusals: RefusalRecord[];
  readonly receipts: Receipt[];
  state: ExecutionState;
  acceptedProgress: BoundaryValue | null;
  progressRevision: number;
  activation: ActivationRecord | null;
  nextAcceptancePosition: number;
  activationsMinted: number;
}

const DEFAULT_MAILBOX_CAPACITY = 1_024;

/**
 * The one `queued` disposition object, frozen and shared.
 *
 * A disposition is retained accepted state that inspection and both ingress answers expose. Every
 * entry accepted in this packet is `queued` and carries no per-entry data, so one immutable value
 * serves them all and no exposed reference can be edited into a different disposition. K1.2 and K1.3
 * record their own dispositions by *replacing* an entry's disposition with a new frozen value, which
 * is why `MailboxEntry.disposition` stays a writable field while the object it names does not.
 */
const QUEUED: MailboxDisposition = Object.freeze({ kind: "queued" });

const describeFailure = (reason: unknown): string =>
  reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

// -- Accepting content -------------------------------------------------------

/**
 * One request's content, validated root by root and reduced to a comparable identity.
 *
 * **Each field is its own boundary-value root.** `values.md` is explicit that a root is measured
 * independently and that "the enclosing envelope is not an extra aggregate size root", so the
 * payload is checked against the four limits on its own rather than inside a wrapper object. Packing
 * the fields into one object first would have made a payload of exactly 1 MiB, or of exactly depth
 * 32, fail the limit it is supposed to pass.
 *
 * Identity is then the injective packing of the parts, not the canonical form of a wrapper: equal
 * identity means equal kind, equal logical payload and the same presence and value of a subscription
 * class. Absent and present are separate parts, so a retry that adds `subscriptionClass` conflicts
 * rather than silently matching - `values.md` rule 6 makes those different content.
 */
interface AcceptedInput {
  readonly kind: string;
  readonly payload: CanonicalValue;
  readonly subscriptionClass: string | null;
  readonly identity: string;
}

/** Re-locates a root's issues under the field name the caller used. */
const located = (issues: readonly ValueIssue[], label: string): ValueIssue[] =>
  issues.map((issue) => ({
    ...issue,
    path: issue.path === "" ? label : issue.path.startsWith("[") ? `${label}${issue.path}` : `${label}.${issue.path}`,
  }));

/** Renders issues into one reason a person can act on. */
const explain = (issues: readonly ValueIssue[]): string => issues.map((issue) => `${issue.path} ${issue.code}`).join("; ");

/**
 * One identity-bearing request field, which has to be text before it can name anything.
 *
 * `identity.md` requires that two different requests never name one identity. This package gets that
 * from `packIdentity`'s length-prefixed packing, which is injective **over text**. A field that is
 * not text defeats it: every object stringifies to `[object Object]` with no length, so two
 * genuinely different creation keys, request keys or input kinds pack identically — and the Kernel
 * then answers a second, different request with the first one's retained decision, or refuses an
 * unrelated request as its conflict.
 *
 * TypeScript declares these fields `string`, but a request envelope crossing a Kernel boundary is
 * caller-supplied data, not a compile-time guarantee. So the boundary checks it, and refuses a
 * non-text identity field as a malformed value with the field named — the same answer, and the same
 * located reason, as any other unacceptable request content (K11-R3-ID-02).
 *
 * Text is then held to the ordinary boundary-value rules as well, so a lone surrogate or an
 * over-limit name is refused here rather than becoming part of a stored key.
 */
function acceptIdentityText(value: unknown, label: string, issues: ValueIssue[]): value is string {
  if (typeof value !== "string") {
    const received = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    issues.push({ path: label, code: "unsupported_form", message: `expected text that can name a request, received ${received}` });
    return false;
  }
  const checked = canonicalize(value);
  if (!checked.ok) {
    issues.push(...located(checked.issues, label));
    return false;
  }
  return true;
}

function acceptInputContent(content: InputContent, prefix: string): Result<AcceptedInput, ValueIssue[]> {
  const issues: ValueIssue[] = [];
  // `kind` and `subscriptionClass` are packed into this input's content identity, so they are held
  // to the identity-text rule rather than only to the boundary-value rules.
  const kindOk = acceptIdentityText(content.kind, `${prefix}kind`, issues);
  const payload = canonicalize(content.payload);
  if (!payload.ok) issues.push(...located(payload.issues, `${prefix}payload`));

  let subscriptionClass: string | null = null;
  if (content.subscriptionClass !== undefined) {
    if (acceptIdentityText(content.subscriptionClass, `${prefix}subscriptionClass`, issues)) {
      subscriptionClass = content.subscriptionClass;
    }
  }

  if (!kindOk || !payload.ok || issues.length > 0) return err(issues);
  return ok({
    kind: content.kind,
    payload: payload.value,
    subscriptionClass,
    identity: packIdentity([
      content.kind,
      payload.value.canonical,
      subscriptionClass === null ? "absent" : "present",
      subscriptionClass ?? "",
    ]),
  });
}

/** The complete creation content a caller-scoped creation key binds. */
interface AcceptedCreation {
  readonly authorityContext: CanonicalValue;
  readonly initialInput: AcceptedInput;
  readonly identity: string;
}

function acceptCreationContent(request: CreateExecutionRequest): Result<AcceptedCreation, ValueIssue[]> {
  const issues: ValueIssue[] = [];
  // Each of these is packed into the creation content identity, so each is identity text.
  const scalars: [string, unknown][] = [
    ["scope", request.scope],
    ["definitionRevision", request.definitionRevision],
    ["runtimeContractRevision", request.runtimeContractRevision],
    ["progressCodec", request.progressCodec],
  ];
  let scalarsOk = true;
  for (const [label, value] of scalars) {
    if (!acceptIdentityText(value, label, issues)) scalarsOk = false;
  }
  const authorityContext = canonicalize(request.authorityContext);
  if (!authorityContext.ok) issues.push(...located(authorityContext.issues, "authorityContext"));
  const initialInput = acceptInputContent(request.initialInput, "initialInput.");
  if (!initialInput.ok) issues.push(...initialInput.error);

  if (!scalarsOk || !authorityContext.ok || !initialInput.ok || issues.length > 0) return err(issues);
  return ok({
    authorityContext: authorityContext.value,
    initialInput: initialInput.value,
    identity: packIdentity([
      request.scope,
      request.definitionRevision,
      request.runtimeContractRevision,
      request.progressCodec,
      authorityContext.value.canonical,
      initialInput.value.identity,
    ]),
  });
}

// -- The coordinator ---------------------------------------------------------

export class ExecutionCoordinator {
  readonly #driver: ExecutionDriver;
  readonly #mailboxCapacity: number;
  readonly #executions = new Map<string, ExecutionRecord>();
  readonly #byCreationKey = new Map<string, ExecutionRecord>();
  #acceptancePosition = 0;
  #executionsMinted = 0;
  #eventsMinted = 0;

  constructor(options: CoordinatorOptions) {
    const capacity = options.mailboxCapacity ?? DEFAULT_MAILBOX_CAPACITY;
    if (!Number.isInteger(capacity) || capacity < 1) {
      // A configuration error, not a protocol refusal: creation accepts its initial input as part of
      // one atomic decision, so a capacity below one would declare a limit the first Execution
      // necessarily breaks.
      throw new RangeError(`mailboxCapacity must be an integer of at least 1, received ${String(capacity)}`);
    }
    this.#driver = options.driver;
    this.#mailboxCapacity = capacity;
  }

  /**
   * Creates one Execution, or returns the one this caller-scoped creation key already named.
   *
   * The three lost-response rows in `creation.md` are one lookup: nothing committed commits now; a
   * committed-then-lost response returns the already-created Execution and its retained decision;
   * a caller repeating a response it already saw gets that same answer again. Changing the content
   * under a key is a conflict rather than an update, and a second intentional run needs a fresh key
   * even when its content is identical.
   *
   * Validation runs before the key lookup on purpose. An invalid request cannot be a replay of an
   * accepted one - accepted content is always valid - so reporting exactly why it is invalid is
   * strictly more informative than reporting a conflict.
   */
  createExecution(caller: AuthenticatedCaller, request: CreateExecutionRequest): Result<CreationAccepted, RefusalRecord> {
    // Authorization precedes the key lookup, following `execution-cycle.md`'s acceptance step 1:
    // scope access before inspecting or disclosing anything. A caller whose scope was revoked after
    // it created an Execution is refused here rather than handed back the retained decision.
    if (!mayReachScope(caller, request.scope)) {
      return err(this.#refusal("unauthorized_scope", `caller cannot create an Execution in authority scope "${request.scope}"`, null));
    }

    // The creation key is not content — it never joins the content identity — but it is the text
    // the caller-scoped key is packed from, so it is held to the same identity-text rule. Both are
    // checked before either is reported, so one call names every reason the request was refused.
    const keyIssues: ValueIssue[] = [];
    const keyOk = acceptIdentityText(request.creationKey, "creationKey", keyIssues);
    const content = acceptCreationContent(request);
    if (!keyOk || !content.ok) {
      const issues = [...keyIssues, ...(content.ok ? [] : content.error)];
      return err(this.#refusal("malformed_value", `creation content is not an acceptable boundary value: ${explain(issues)}`, null));
    }

    const creationKey: CreationKeyId = {
      producerNamespace: caller.namespace,
      scope: request.scope,
      requestKey: request.creationKey,
    };
    const existing = this.#byCreationKey.get(creationKeyIdKey(creationKey));
    if (existing !== undefined) {
      if (existing.creationIdentity === content.value.identity) {
        return ok({
          executionId: existing.executionId,
          receipt: existing.creationReceipt,
          replayed: true,
          initialEventId: existing.initialEventId,
        });
      }
      return err(
        this.#refusal(
          "duplicate_conflict",
          `creation key "${request.creationKey}" already names Execution ${existing.executionId} with different content; a second intentional run needs a fresh key`,
          existing,
        ),
      );
    }

    this.#executionsMinted += 1;
    const executionId = `execution-${this.#executionsMinted}`;
    const receipt = this.#mint("creation");
    this.#eventsMinted += 1;
    const eventId = `event-${this.#eventsMinted}`;

    // Accepted content is immutable, so what is retained is the sealed copy validation made, never
    // the caller's own object. An application that keeps editing the value it passed in cannot change
    // what the Kernel accepted, and an observer cannot edit it through an inspection view.
    const initial = content.value.initialInput;

    const entry: MailboxEntry = {
      eventId,
      inputId: { producerNamespace: caller.namespace, destination: executionId, requestKey: request.creationKey },
      contentIdentity: initial.identity,
      kind: initial.kind,
      payload: initial.payload.value,
      subscriptionClass: initial.subscriptionClass,
      acceptancePosition: 1,
      // The initial input is accepted by the creation boundary, in the same atomic decision, so it
      // carries that boundary's receipt rather than minting a second one for the same decision.
      receipt,
      disposition: QUEUED,
    };

    const record: ExecutionRecord = {
      executionId,
      scope: request.scope,
      creationKey,
      definitionRevision: request.definitionRevision,
      runtimeContractRevision: request.runtimeContractRevision,
      progressCodec: request.progressCodec,
      authorityContext: content.value.authorityContext.value,
      creationIdentity: content.value.identity,
      creationReceipt: receipt,
      initialEventId: eventId,
      mailbox: [entry],
      byInputId: new Map([[inputIdKey(entry.inputId), entry]]),
      refusals: [],
      receipts: [receipt],
      // No externally visible CREATED: the Execution is READY the moment creation is accepted.
      state: "READY",
      acceptedProgress: null,
      progressRevision: 0,
      activation: null,
      nextAcceptancePosition: 2,
      activationsMinted: 0,
    };

    this.#executions.set(executionId, record);
    this.#byCreationKey.set(creationKeyIdKey(creationKey), record);
    return ok({ executionId, receipt, replayed: false, initialEventId: eventId });
  }

  /**
   * Accepts one post-creation input under its Input ID triple.
   *
   * The order of the checks is the contract, not a convenience:
   *
   * 1. Resolve the destination for this caller. An Execution outside the caller's scope answers
   *    exactly as one that does not exist, so a refusal cannot be used to discover it.
   * 2. Validate the content, for the same reason creation validates first.
   * 3. Look up the Input ID. An exact replay returns the recorded disposition without creating a
   *    second Event; different content under that identity is a conflict that mutates nothing. This
   *    lookup precedes the terminal check deliberately: `creation.md` refuses *new ordinary input*
   *    to a terminal Execution, and a replay of input accepted before it ended is not new.
   * 4. Refuse new ordinary input to a terminal Execution. This is a third answer: not a queued
   *    Event, and not a `B-5` terminal disposition.
   * 5. Refuse before any acknowledgment when the mailbox is at its declared capacity.
   */
  submitInput(caller: AuthenticatedCaller, request: SubmitInputRequest): Result<InputAccepted, RefusalRecord> {
    const record = this.#visible(caller, request.destination);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    // The producer request key is the third member of the Input ID triple, so it is identity text
    // for the same reason the creation key is. `destination` needs no such check: a non-text
    // destination simply matches no minted Execution ID and has already been answered above as an
    // unknown destination, which discloses nothing.
    const keyIssues: ValueIssue[] = [];
    const keyOk = acceptIdentityText(request.requestKey, "requestKey", keyIssues);
    const content = acceptInputContent(request, "");
    if (!keyOk || !content.ok) {
      const issues = [...keyIssues, ...(content.ok ? [] : content.error)];
      return err(this.#refusal("malformed_value", `input content is not an acceptable boundary value: ${explain(issues)}`, record));
    }

    const inputId: InputId = {
      producerNamespace: caller.namespace,
      destination: record.executionId,
      requestKey: request.requestKey,
    };
    const existing = record.byInputId.get(inputIdKey(inputId));
    if (existing !== undefined) {
      if (existing.contentIdentity === content.value.identity) {
        return ok({
          eventId: existing.eventId,
          receipt: existing.receipt,
          replayed: true,
          acceptancePosition: existing.acceptancePosition,
          disposition: existing.disposition,
        });
      }
      return err(
        this.#refusal(
          "duplicate_conflict",
          `input key "${request.requestKey}" from this producer already names Event ${existing.eventId} with different content; input identity is immutable`,
          record,
        ),
      );
    }

    if (isTerminal(record.state)) {
      return err(
        this.#refusal(
          "terminal_destination",
          `Execution ${record.executionId} ended as ${record.state}; new ordinary input is refused rather than queued`,
          record,
        ),
      );
    }

    const unacknowledged = record.mailbox.filter((entry) => entry.disposition.kind === "queued").length;
    if (unacknowledged >= this.#mailboxCapacity) {
      return err(
        this.#refusal(
          "capacity_exhausted",
          `Execution ${record.executionId} already holds ${unacknowledged} unacknowledged Events, at the declared capacity of ${this.#mailboxCapacity}`,
          record,
        ),
      );
    }

    this.#eventsMinted += 1;
    const eventId = `event-${this.#eventsMinted}`;
    const receipt = this.#mint("input_ingress");
    const entry: MailboxEntry = {
      eventId,
      inputId,
      contentIdentity: content.value.identity,
      kind: content.value.kind,
      payload: content.value.payload.value,
      subscriptionClass: content.value.subscriptionClass,
      acceptancePosition: record.nextAcceptancePosition,
      receipt,
      disposition: QUEUED,
    };
    record.nextAcceptancePosition += 1;
    record.mailbox.push(entry);
    record.byInputId.set(inputIdKey(inputId), entry);
    record.receipts.push(receipt);

    return ok({
      eventId,
      receipt,
      replayed: false,
      acceptancePosition: entry.acceptancePosition,
      disposition: entry.disposition,
    });
  }

  /**
   * Accepts one dispatch intent and hands the Activation to the Driver without waiting for it.
   *
   * The intent - the pinned exchange, the reserved batch and the current attempt - is recorded as
   * one decision *before* anything is sent, so it is reconstructible even if the send is lost. The
   * reservation pins the batch and acknowledges none of it: those Events stay unacknowledged and
   * keep their own dispositions, which is what makes "reservation is not acknowledgment" observable
   * rather than asserted.
   *
   * `deliver` is called and its result is not awaited. A Driver that never settles holds up nothing:
   * another Execution on this same coordinator dispatches while the first exchange is unresolved.
   */
  dispatch(caller: AuthenticatedCaller, executionId: string, options: DispatchOptions): Result<DispatchAccepted, RefusalRecord> {
    const record = this.#visible(caller, executionId);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    if (!Number.isInteger(options.bound) || options.bound < 1) {
      return err(
        this.#refusal(
          "invalid_batch_bound",
          `batch bound must be an integer of at least 1, received ${String(options.bound)}; a Runtime dispatched with an unbounded-below batch cannot be told why it was activated`,
          record,
        ),
      );
    }
    if (isTerminal(record.state)) {
      return err(this.#refusal("terminal_destination", `Execution ${record.executionId} ended as ${record.state} and is not dispatched`, record));
    }
    if (record.activation !== null) {
      return err(
        this.#refusal(
          "exchange_unresolved",
          `Activation ${record.activation.activation.activationId} is still unresolved; one Execution has at most one Activation authorized to commit`,
          record,
        ),
      );
    }

    const selected = record.mailbox.filter((entry) => entry.disposition.kind === "queued").slice(0, options.bound);
    record.activationsMinted += 1;
    const activationId = `${record.executionId}/activation-${record.activationsMinted}`;
    const receipt = this.#mint("dispatch_intent");

    const activation: Activation = Object.freeze({
      executionId: record.executionId,
      activationId,
      // A new exchange starts its own attempt ordering. `identity.md` leaves whether the counter
      // resets across Activations to the implementation; only an advance within one unresolved
      // exchange is constrained, and only an authorized takeover may do that. K1.2 owns takeover.
      writerEpoch: 1,
      baseProgressRevision: record.progressRevision,
      runtimeContractRevision: record.runtimeContractRevision,
      definitionRevision: record.definitionRevision,
      progressCodec: record.progressCodec,
      acceptedProgress: record.acceptedProgress,
      events: Object.freeze(selected.map(toActivationEvent)),
      executionView: record.authorityContext,
    });

    const intent: ActivationRecord = {
      activation,
      receipt,
      batch: Object.freeze(selected.map((entry) => entry.eventId)),
      deliveries: [],
    };
    record.activation = intent;
    record.state = "RUNNING";
    record.receipts.push(receipt);

    this.#deliver(intent);

    return ok({
      activationId,
      writerEpoch: activation.writerEpoch,
      baseProgressRevision: activation.baseProgressRevision,
      batch: intent.batch,
      receipt,
      redelivered: false,
    });
  }

  /**
   * Re-sends the unresolved exchange unchanged.
   *
   * `execution-cycle.md`'s retry-versus-takeover table: an ordinary delivery retry keeps the same
   * Activation ID, the same writer epoch and the same pinned semantic input. Nothing is re-selected:
   * "New mailbox arrivals cannot replace the batch under an existing Activation ID", so an Event
   * accepted after reservation stays queued and out of this batch until the exchange resolves.
   *
   * No accepted state changes, so this mints no new receipt: it returns the dispatch intent's.
   */
  redeliver(caller: AuthenticatedCaller, executionId: string): Result<DispatchAccepted, RefusalRecord> {
    const record = this.#visible(caller, executionId);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    const intent = record.activation;
    if (intent === null) {
      return err(
        this.#refusal(
          "no_unresolved_exchange",
          `Execution ${record.executionId} has no unresolved Activation to redeliver`,
          record,
        ),
      );
    }

    this.#deliver(intent);
    return ok({
      activationId: intent.activation.activationId,
      writerEpoch: intent.activation.writerEpoch,
      baseProgressRevision: intent.activation.baseProgressRevision,
      batch: intent.batch,
      receipt: intent.receipt,
      redelivered: true,
    });
  }

  /** A complete, freshly built snapshot. Reading acknowledges nothing and mutates nothing. */
  inspect(caller: AuthenticatedCaller, executionId: string): Result<ExecutionView, RefusalRecord> {
    const record = this.#visible(caller, executionId);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));
    return ok(viewOf(record));
  }

  /**
   * Execution IDs this caller may see, in creation order.
   *
   * Scoped like every other read: an Execution outside the caller's authority scope is absent here
   * for the same reason `inspect` refuses it. Each record costs one full `mayReachScope` scan, so
   * per-record work is uniform and reveals nothing about any specific hidden ID beyond the visible
   * list itself. Total work is necessarily linear in the number of Executions — listing must look
   * at each record to decide visibility — so this method does not claim timing independence from
   * corpus size. What it does not do is branch on the content of any particular hidden record or
   * reveal a hidden ID through its shape: the returned list contains exactly the visible IDs.
   */
  visibleExecutions(caller: AuthenticatedCaller): readonly string[] {
    const visible: string[] = [];
    for (const record of this.#executions.values()) {
      if (mayReachScope(caller, record.scope)) visible.push(record.executionId);
    }
    return visible;
  }

  // -- Surfaces later packets own --------------------------------------------

  /**
   * Outcome acceptance is K1.2's. Refuses; it never records a proposal or advances anything.
   *
   * These take no arguments deliberately. Giving them a typed proposal shape would advertise a
   * contract no accepted packet has settled, and a caller could build against it before the packet
   * that owns it decides what it is.
   */
  submitOutcome(): never {
    return refuseUnsupportedSurface("submitOutcome", "K1.2");
  }

  /** The writer-epoch advance under an authorized takeover is K1.2's. */
  requestTakeover(): never {
    return refuseUnsupportedSurface("requestTakeover", "K1.2");
  }

  /** The recovery hold for unavailable pinned progress code is K1.2's exchange handling. */
  recoverExecution(): never {
    return refuseUnsupportedSurface("recoverExecution", "K1.2");
  }

  /** Out-of-band cancellation and terminal disposition are K1.3's (governing 007). */
  cancelExecution(): never {
    return refuseUnsupportedSurface("cancelExecution", "K1.3");
  }

  // -- Internals -------------------------------------------------------------

  #mint(boundary: ReceiptBoundary): Receipt {
    this.#acceptancePosition += 1;
    return mintReceipt(boundary, this.#acceptancePosition);
  }

  /**
   * The record this caller may act on, or `null`.
   *
   * One lookup answers both "does it exist?" and "may this caller see it?", because the caller must
   * not be able to tell those apart.
   *
   * `identity.md` requires refusal shape *and timing* to not distinguish a hidden record from a
   * missing one. The previous implementation returned early for a missing ID without touching
   * `caller.scopes`, while a hidden ID paid for a scope search — a different control-path cost
   * for the same caller. This version always performs the same work: one map lookup plus one
   * full scope scan over `caller.scopes.length` comparisons. A missing ID scans for a sentinel
   * scope that names no Execution, so it costs the same number of comparisons as the hidden
   * case and answers identically. `mayReachScope` itself scans without early exit, so work does
   * not depend on where a match sits either.
   *
   * This normalizes application-level lookup work. It does not claim cryptographic constant-time
   * string or hash-table behavior, which JavaScript does not provide; see `identity.ts`.
   */
  #visible(caller: AuthenticatedCaller, executionId: string): ExecutionRecord | null {
    const record = this.#executions.get(executionId);
    const targetScope = record !== undefined ? record.scope : MISSING_SCOPE_SENTINEL;
    if (!mayReachScope(caller, targetScope)) return null;
    return record ?? null;
  }

  /**
   * Records one refusal and returns that same retained record.
   *
   * The caller's copy and the Execution's retained copy are deliberately the same object: a refusal
   * is retained evidence, and `mintRefusal` freezes it, so sharing the reference is safe and keeps
   * "what was returned" and "what was recorded" the same fact rather than two that could drift.
   */
  #refusal(classification: RefusalClassification, reason: string, record: ExecutionRecord | null): RefusalRecord {
    this.#acceptancePosition += 1;
    const refusal = mintRefusal(classification, reason, this.#acceptancePosition, record === null ? null : record.executionId);
    if (record !== null) record.refusals.push(refusal);
    return refusal;
  }

  /**
   * Hands an Activation to the Driver and returns immediately.
   *
   * A synchronous throw and a rejected promise are both recorded as operational delivery failures.
   * Neither changes accepted state: the intent stands, the Execution stays `RUNNING`, and the same
   * exchange can be redelivered.
   */
  #deliver(intent: ActivationRecord): void {
    const attempt: DeliveryAttempt = { attempt: intent.deliveries.length + 1, status: "pending", failure: null };
    intent.deliveries.push(attempt);
    try {
      const settled: unknown = this.#driver.deliver(intent.activation);
      if (isThenable(settled)) {
        void Promise.resolve(settled).then(
          () => {
            attempt.status = "delivered";
          },
          (reason: unknown) => {
            attempt.status = "failed";
            attempt.failure = describeFailure(reason);
          },
        );
        return;
      }
      attempt.status = "delivered";
    } catch (error) {
      attempt.status = "failed";
      attempt.failure = describeFailure(error);
    }
  }
}

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
    payload: entry.payload,
    sourceCategory: "application_input",
    acceptancePosition: entry.acceptancePosition,
  } as const;
  return Object.freeze(entry.subscriptionClass === null ? base : { ...base, subscriptionClass: entry.subscriptionClass });
};

const toDeliveryView = (attempt: DeliveryAttempt): DeliveryAttemptView => ({
  attempt: attempt.attempt,
  status: attempt.status,
  failure: attempt.failure,
});

const toActivationView = (intent: ActivationRecord): ActivationView => ({
  activationId: intent.activation.activationId,
  writerEpoch: intent.activation.writerEpoch,
  baseProgressRevision: intent.activation.baseProgressRevision,
  batch: [...intent.batch],
  receipt: intent.receipt,
  deliveries: intent.deliveries.map(toDeliveryView),
});

const toMailboxView = (entry: MailboxEntry, reserved: ReadonlySet<string>): MailboxEntryView => ({
  eventId: entry.eventId,
  inputId: { ...entry.inputId },
  kind: entry.kind,
  payload: entry.payload,
  subscriptionClass: entry.subscriptionClass,
  sourceCategory: "application_input",
  acceptancePosition: entry.acceptancePosition,
  disposition: entry.disposition,
  reserved: reserved.has(entry.eventId),
  receipt: entry.receipt,
});

function viewOf(record: ExecutionRecord): ExecutionView {
  const reserved = new Set(record.activation === null ? [] : record.activation.batch);
  return {
    executionId: record.executionId,
    state: record.state,
    scope: record.scope,
    creationKey: record.creationKey.requestKey,
    definitionRevision: record.definitionRevision,
    runtimeContractRevision: record.runtimeContractRevision,
    progressCodec: record.progressCodec,
    acceptedProgress: record.acceptedProgress,
    progressRevision: record.progressRevision,
    authorityContext: record.authorityContext,
    activation: record.activation === null ? null : toActivationView(record.activation),
    mailbox: record.mailbox.map((entry) => toMailboxView(entry, reserved)),
    queued: record.mailbox.filter((entry) => entry.disposition.kind === "queued").map((entry) => entry.eventId),
    // Acknowledgment arrives with Outcome acceptance (K1.2). Nothing in this packet produces one,
    // and reporting an empty list is the truthful answer rather than an omitted field.
    acknowledged: [],
    terminalDispositions: record.mailbox.filter((entry) => entry.disposition.kind === "terminal").map((entry) => entry.eventId),
    refusals: [...record.refusals],
    receipts: [...record.receipts],
  };
}
