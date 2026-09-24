/**
 * The target Kernel coordinator: create, accept input, dispatch, and accept Outcomes.
 *
 * K1.1 built the boundaries `creation.md` and `execution-cycle.md` own up to Outcome acceptance:
 *
 * - one atomic creation per Creation request ID, with the initial input;
 * - post-creation input ingress under the Input ID triple, including refusal of new ordinary
 *   input to a terminal destination;
 * - one atomic dispatch intent that reserves an exact batch and pins the exchange;
 * - ordinary redelivery of that same exchange;
 * - minimum inspection.
 *
 * K1.2 adds Outcome acceptance and what surrounds it:
 *
 * - `submitOutcome`: scope first, then the replay lookup, then whole-envelope validation, then one
 *   atomic commit that acknowledges the whole batch, installs progress, records Emissions, the
 *   terminal result and the next state, and gives every Event still unacknowledged at a `complete`
 *   or `fail` its terminal disposition (`B-5`);
 * - `requestTakeover`: the authorized writer-epoch advance within one unresolved exchange;
 * - `recoverExecution`: the recovery hold for unavailable pinned code, and its clearing;
 * - `reportProtocolFailure`: the inspectable hold for a response that could not be classified
 *   (OA-6), never a silent retry.
 *
 * Everything else refuses by name: out-of-band cancellation and its terminal disposition, wait
 * registration, wait matching and deadlines are K1.3's; Effects are K2's. `refuseUnsupportedSurface`
 * is the K1.0 mechanism for saying so, reused rather than reinvented.
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
 * another consequential request. The same holds for what K1.2 retains: accepted-Outcome records,
 * resolved exchanges, Emissions and terminal results are kept for the coordinator's lifetime, so an
 * exact Outcome replay is answered from its record for as long as the coordinator lives
 * (K1.2-DEC-12).
 *
 * ## One Outcome acceptance, one synchronous decision
 *
 * `execution-cycle.md` leaves the transaction mechanism open provided the atomicity is real. Here it
 * is one synchronous call on a single-threaded, in-memory coordinator: every caller-owned field is
 * observed first, every record the decision needs is then built, and only then is anything mutated,
 * through load-time primitives that no caller observation can have replaced. No caller code runs
 * between the first check of accepted state and the last mutation, so a reentrant call made from a
 * getter during observation is ordered entirely before this decision's checks (K1.2-DEC-10). This is
 * atomicity within the process, not durability.
 */

import type { Activation, ActivationEvent, DeliverySettlement, ExecutionDriver } from "./driver.ts";
import {
  acceptIdentityText,
  appendIssue,
  appendIssues,
  boundDiagnostic,
  explain,
  located,
  observeField,
  observeOwn,
  type LocatedIssue,
} from "./envelope.ts";
import {
  captureAttempt,
  captureOutcome,
  captureRecovery,
  explainOutcomeIssues,
  listed,
  type CapturedOutcome,
  type OutcomeEnvelope,
  type ProtocolFailureReport,
  type RecoveryRequest,
  type TakeoverRequest,
} from "./outcome.ts";
import {
  creationRequestIdKey,
  inputIdKey,
  MISSING_SCOPE_SENTINEL,
  mayReachScope,
  mintReceipt,
  packIdentity,
  type AuthenticatedCaller,
  type CreationRequestId,
  type InputId,
  type Receipt,
  type ReceiptBoundary,
} from "./identity.ts";
import type {
  ActivationView,
  DeliveryAttemptView,
  EmissionView,
  ExchangeView,
  ExecutionView,
  MailboxDisposition,
  MailboxEntryView,
  RecoveryHoldView,
  TerminalResultView,
} from "./inspection.ts";
import { isTerminal, type ExecutionState } from "./lifecycle.ts";
import { appendAllOwn, appendOwn, copyOwn, mapOwn, readAt } from "./own-array.ts";
import { UNKNOWN_DESTINATION_REASON, mintRefusal, type RefusalClassification, type RefusalRecord } from "./refusal.ts";
import { err, ok, type Result } from "./result.ts";
import { refuseUnsupportedSurface } from "./unsupported.ts";
import { canonicalize, type BoundaryValue, type CanonicalValue, type ValueIssue } from "./values.ts";

/**
 * Load-time references used on paths that run after caller-owned state has been observed.
 *
 * K11-R5-STATE-01: a capture-time side effect (installed while `canonicalize` observes a hostile
 * value) can replace *any* mutable builtin or prototype method before the commit below runs in
 * the same tick — `Map.prototype.set`, `Object.freeze`, `Array.prototype.push/map/filter`, `Set`,
 * and the rest. The serializer sandbox (values.ts) does not cover these
 * because they are not serializer dependencies; yet they decide whether the accepted fact is
 * retained, whether a receipt has a decision behind it, whether an Event is queued, and whether
 * an Activation is actually immutable.
 *
 * The class-closing rule is therefore total, not a per-method blacklist: from the first caller
 * observation until the atomic decision is completely recorded — and on every replay, redelivery
 * and inspection projection of that decision — this module consults **no live global, no live
 * prototype method, no iteration protocol and no promise machinery**. Everything below comes from
 * these load-time references and index loops.
 *
 * K11-R6-STATE-02: *index assignment is not part of that answer.* The previous round replaced the
 * prototype methods with `list[list.length] = item`, on the reading that an index loop plus an
 * ordinary indexed write is an ambient-independent primitive. It is not. An indexed write into a
 * position the list does not own yet is `[[Set]]`, which walks the prototype chain, so an inherited
 * accessor at `Array.prototype["0"]` — installable from the very `options.bound` getter or payload
 * trap this boundary is observing — swallows the write and answers a later read from its own
 * getter. A captured `Array.prototype.push` performs the same `[[Set]]` and then raises `length`
 * anyway, so it is worse rather than better. Dispatch could accept a reserved batch the validated
 * bound did not name, ingress could return an accepted Event with nothing retained behind it, and a
 * freshly built view could describe something the Kernel never recorded.
 *
 * Every Kernel-owned list is therefore built and read as own data through
 * [`own-array.ts`](./own-array.ts), which owns that rule and explains it. Completeness is
 * verifiable mechanically, not by inspection alone: no `new Map/Set`, no
 * `.get/.set/.has/.push/.map/.filter/.slice`, no `for...of`, no array/object-iterator spread, no
 * bare `Object.freeze`/`Promise` and **no ordinary indexed assignment** remains anywhere in this
 * zone outside `own-array.ts`, and `boundary.test.ts` enforces the last two over the zone's
 * executable text. (Object *spread* of plain Kernel records copies own data with
 * `CreateDataPropertyOrThrow` rather than `[[Set]]`, and consults no iterator, so it is kept;
 * array literals are own data at construction for the same reason; Driver-supplied values and the
 * host-authenticated caller are trusted inputs, not caller observations, and are documented where
 * used. Delivery reporting creates no Promise and consults no Promise machinery.)
 */
const PrimordialNumberIsInteger = Number.isInteger;
const PrimordialObjectFreeze = Object.freeze;
const PrimordialReflectApply = Reflect.apply;
const PrimordialMap = Map;
const PrimordialMapGet = Map.prototype.get;
const PrimordialMapSet = Map.prototype.set;
const PrimordialMapForEach = Map.prototype.forEach;
/** `RangeError` for coordinator configuration misuse, from load time. */
const PrimordialRangeError = RangeError;

/** `Map.get` without consulting the (possibly replaced) live prototype method. */
const mapGet = <K, V>(map: Map<K, V>, key: K): V | undefined =>
  PrimordialReflectApply(PrimordialMapGet, map, [key]) as V | undefined;

/** `Map.set` without consulting the (possibly replaced) live prototype method. */
const mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {
  PrimordialReflectApply(PrimordialMapSet, map, [key, value]);
};

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

/**
 * The answer to an accepted Outcome, and to every exact replay of it.
 *
 * Everything but `replayed` is the retained decision: a replay returns the same receipt object and
 * the same lists, never a reconstruction (OA-2).
 */
export interface OutcomeAccepted {
  /** The Outcome-acceptance receipt: evidence that this proposal was accepted, and of nothing it asked for. */
  readonly receipt: Receipt;
  /** True when this call returned the already-accepted decision rather than committing a new one. */
  readonly replayed: boolean;
  readonly activationId: string;
  /** The state the accepted Outcome's next step produced, which is not necessarily the current one. */
  readonly nextState: ExecutionState;
  /** The accepted progress revision this Outcome installed. */
  readonly progressRevision: number;
  /** The whole reserved batch, acknowledged by this decision. */
  readonly acknowledged: readonly string[];
  readonly emissionIds: readonly string[];
  /** The terminal result's ID for an accepted `complete` or `fail`; otherwise `null`. */
  readonly resultId: string | null;
  /** Events this decision gave a `B-5` terminal disposition. */
  readonly terminalDispositions: readonly string[];
}

/** An accepted takeover: the same exchange, now answerable only by the new attempt. */
export interface TakeoverAccepted {
  readonly activationId: string;
  /** The epoch that was current and is now fenced. */
  readonly supersededEpoch: number;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  /** The same reserved batch; a takeover never re-selects. */
  readonly batch: readonly string[];
  /** The dispatch-intent receipt re-recording the exchange's current attempt (K1.2-DEC-6). */
  readonly receipt: Receipt;
}

/** What a recovery request or a protocol-failure report left in place. */
export interface RecoveryDecision {
  readonly activationId: string;
  readonly writerEpoch: number;
  /** The holds on the exchange after this request; empty when it can continue. */
  readonly recoveryHolds: readonly RecoveryHoldView[];
  /** False when the request found nothing to change. */
  readonly changed: boolean;
}

export interface CoordinatorOptions {
  readonly driver: ExecutionDriver;
  /**
   * The declared maximum number of unacknowledged Events one Execution's mailbox may hold.
   *
   * `creation.md`: "Capacity limits refuse ingress before acknowledgment." Only an accepted Outcome
   * acknowledges an Event, so a mailbox at capacity stays at capacity until one does.
   */
  readonly mailboxCapacity?: number;
  /**
   * The declared maximum number of Emissions one Outcome may carry (K1.2-DEC-9).
   *
   * `output.md`: if capacity cannot retain newly promised output, refuse Outcome acceptance before
   * commit, never accept and then drop. This is an operational bound of the in-process binding, not
   * a semantic value limit: an over-limit Outcome is refused as `capacity_exhausted`, and its values
   * are not judged invalid. Default 256.
   */
  readonly emissionsPerOutcome?: number;
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

/** The unresolved exchange: its current attempt, its pinned batch, its delivery log and its holds. */
interface ActivationRecord {
  /** The current attempt's Activation. A takeover replaces it with the same exchange at the next epoch. */
  activation: Activation;
  /** The current attempt's dispatch-intent receipt. */
  receipt: Receipt;
  readonly batch: readonly string[];
  /** Shared with the resolved-exchange record, so a late report still finds its original attempt. */
  readonly deliveries: DeliveryAttempt[];
  codeHold: RecoveryHoldView | null;
  protocolFailureHold: RecoveryHoldView | null;
}

/** An exchange an accepted Outcome resolved. */
interface ResolvedExchange {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly batch: readonly string[];
  readonly dispatchReceipt: Receipt;
  readonly outcomeReceipt: Receipt;
  readonly deliveries: DeliveryAttempt[];
}

/** The retained decision an exact replay answers from (OA-2). */
interface AcceptedOutcomeRecord {
  /** The captured content's identity; equality is an exact duplicate. */
  readonly identity: string;
  /** Frozen; everything a replay returns except the `replayed` flag. */
  readonly decision: Omit<OutcomeAccepted, "replayed">;
}

interface ExecutionRecord {
  readonly executionId: string;
  readonly scope: string;
  readonly creationRequestId: CreationRequestId;
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
  /**
   * Post-creation ingress entries by Input ID, for replay/conflict lookup.
   *
   * The initial creation Event is deliberately absent: it was accepted by the creation boundary,
   * not by ingress, and indexing it here would let creation consume a producer-constructible
   * ingress identity (K11-R15-ID-01).
   */
  readonly byInputId: Map<string, MailboxEntry>;
  readonly refusals: RefusalRecord[];
  readonly receipts: Receipt[];
  state: ExecutionState;
  acceptedProgress: BoundaryValue | null;
  progressRevision: number;
  activation: ActivationRecord | null;
  /** Accepted Outcomes by Activation ID: at most one per exchange, and the replay/conflict index. */
  readonly acceptedOutcomes: Map<string, AcceptedOutcomeRecord>;
  readonly exchanges: ResolvedExchange[];
  readonly emissions: EmissionView[];
  result: TerminalResultView | null;
  /**
   * This Execution's own acceptance index. Creation consumes 1; each later accepted
   * input-ingress, dispatch-intent (including a takeover's) or Outcome-acceptance decision on
   * this Execution consumes the next. Replay and redelivery consume none: they return an
   * already-accepted decision. A recovery hold is not an acceptance and consumes none either.
   * Because the index advances only for decisions on this Execution, gaps in it reveal
   * only this Execution's own history — never activity elsewhere.
   */
  nextAcceptancePosition: number;
  /**
   * This Execution's own refusal index, sharing nothing with the acceptance index above.
   * The first recorded refusal against this Execution is 1. Refusals that name no
   * Execution never touch it (they carry position 0), so probing for hidden versus
   * missing records advances no observable sequence at all.
   */
  nextRefusalPosition: number;
  activationsMinted: number;
}

const DEFAULT_MAILBOX_CAPACITY = 1_024;
const DEFAULT_EMISSIONS_PER_OUTCOME = 256;

/**
 * The one `queued` disposition object, frozen and shared.
 *
 * A disposition is retained accepted state that inspection and both ingress answers expose. Every
 * entry accepted in this packet is `queued` and carries no per-entry data, so one immutable value
 * serves them all and no exposed reference can be edited into a different disposition. K1.2 and K1.3
 * record their own dispositions by *replacing* an entry's disposition with a new frozen value, which
 * is why `MailboxEntry.disposition` stays a writable field while the object it names does not.
 */
const QUEUED: MailboxDisposition = PrimordialObjectFreeze({ kind: "queued" });

/** The protocol-failure diagnostic used when the report carried none a person could read. */
const PROTOCOL_FAILURE_FALLBACK = "no readable diagnostic was supplied";

/**
 * Bounded total diagnostic for one delivery report (KC1-ARCH-1).
 *
 * The settlement reason is Driver-supplied data observed after caller-owned state has run in
 * the same tick, so reading it must invoke nothing: no `Error`/`message` property read, no
 * `String()` coercion, no `then` assimilation. A primitive string reason retains at most its
 * first 1,024 UTF-16 code units through the captured slice; every other value — objects,
 * string objects, numbers, accessors, revoked Proxies, thenables — collapses to the fixed
 * text. The retained string is a fresh primitive, so later caller mutation cannot alter
 * inspection. This limit is operational diagnostics, independent of canonical
 * boundary-value limits. The rule itself lives in `envelope.ts`, which K1.2's protocol-failure
 * report shares.
 */
const DELIVERY_FAILURE_FALLBACK = "Driver delivery failed";

const describeDeliveryFailure = (reason: unknown): string => boundDiagnostic(reason, DELIVERY_FAILURE_FALLBACK);

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

function acceptInputContent(content: InputContent, prefix: string): Result<AcceptedInput, ValueIssue[]> {
  const issues: ValueIssue[] = [];
  // The request envelope is caller-owned state: observe each field once and reuse that same
  // observation for validation, retention and identity. Re-reading `content.kind` for validation
  // and again for packing would let a shifting envelope validate as one kind and bind as another.
  const kindField = observeField(content, "kind", `${prefix}kind`, issues);
  const payloadField = observeField(content, "payload", `${prefix}payload`, issues);
  const subscriptionField = observeField(content, "subscriptionClass", `${prefix}subscriptionClass`, issues);
  if (!kindField.ok || !payloadField.ok || !subscriptionField.ok) return err(issues);
  const kindObserved: unknown = kindField.observed;
  const payloadObserved: unknown = payloadField.observed;
  const subscriptionObserved: unknown = subscriptionField.observed;
  const hasSubscription = subscriptionObserved !== undefined;
  // `kind` and `subscriptionClass` are packed into this input's content identity, so they are held
  // to the identity-text rule rather than only to the boundary-value rules.
  const kindOk = acceptIdentityText(kindObserved, `${prefix}kind`, issues);
  const payload = canonicalize(payloadObserved);
  if (!payload.ok) appendIssues(issues, located(payload.issues, `${prefix}payload`));

  let subscriptionClass: string | null = null;
  if (hasSubscription) {
    if (acceptIdentityText(subscriptionObserved, `${prefix}subscriptionClass`, issues)) {
      subscriptionClass = subscriptionObserved as string;
    }
  }

  if (!kindOk || !payload.ok || issues.length > 0) return err(issues);
  const kind = kindObserved as string;
  return ok({
    kind,
    payload: payload.value,
    subscriptionClass,
    identity: packIdentity([
      kind,
      payload.value.canonical,
      subscriptionClass === null ? "absent" : "present",
      subscriptionClass ?? "",
    ]),
  });
}

/** The complete creation content a Creation request ID binds. */
interface AcceptedCreation {
  readonly scope: string;
  readonly definitionRevision: string;
  readonly runtimeContractRevision: string;
  readonly progressCodec: string;
  readonly authorityContext: CanonicalValue;
  readonly initialInput: AcceptedInput;
  readonly identity: string;
}

function acceptCreationContent(
  request: CreateExecutionRequest,
  validatedScope: string,
): Result<AcceptedCreation, ValueIssue[]> {
  const issues: ValueIssue[] = [];
  // Each of these is packed into the creation content identity, so each is identity text.
  // Observed once: `request.scope` itself is the caller-supplied `validatedScope` (checked before
  // authorization in `createExecution` and reused here so auth and binding cannot see two scopes).
  const definitionField = observeField(request, "definitionRevision", "definitionRevision", issues);
  const runtimeField = observeField(request, "runtimeContractRevision", "runtimeContractRevision", issues);
  const codecField = observeField(request, "progressCodec", "progressCodec", issues);
  if (!definitionField.ok || !runtimeField.ok || !codecField.ok) return err(issues);
  const definitionObserved: unknown = definitionField.observed;
  const runtimeObserved: unknown = runtimeField.observed;
  const codecObserved: unknown = codecField.observed;
  const scalars: [string, unknown][] = [
    ["definitionRevision", definitionObserved],
    ["runtimeContractRevision", runtimeObserved],
    ["progressCodec", codecObserved],
  ];
  let scalarsOk = true;
  // Index loop, not destructuring iteration: `for...of` consults the ambient `Symbol.iterator`.
  for (let scalarIndex = 0; scalarIndex < scalars.length; scalarIndex += 1) {
    // `scalars` is complete at its literal construction above, so this is an own read; array
    // literals install their elements with `CreateDataPropertyOrThrow`, never `[[Set]]`.
    const scalar = scalars[scalarIndex] as [string, unknown];
    if (!acceptIdentityText(scalar[1], scalar[0], issues)) scalarsOk = false;
  }
  const authorityField = observeField(request, "authorityContext", "authorityContext", issues);
  const initialField = observeField(request, "initialInput", "initialInput", issues);
  if (!authorityField.ok || !initialField.ok) return err(issues);
  const authorityObserved: unknown = authorityField.observed;
  const initialObserved: unknown = initialField.observed;
  const authorityContext = canonicalize(authorityObserved);
  if (!authorityContext.ok) appendIssues(issues, located(authorityContext.issues, "authorityContext"));
  const initialInput =
    initialObserved !== undefined && initialObserved !== null && typeof initialObserved === "object"
      ? acceptInputContent(initialObserved as InputContent, "initialInput.")
      : (() => {
          appendIssue(issues, { path: "initialInput", code: "unsupported_form", message: "expected input content" });
          return err([] as ValueIssue[]) as Result<AcceptedInput, ValueIssue[]>;
        })();
  if (!initialInput.ok) appendIssues(issues, initialInput.error);

  if (!scalarsOk || !authorityContext.ok || !initialInput.ok || issues.length > 0) return err(issues);
  const definitionRevision = definitionObserved as string;
  const runtimeContractRevision = runtimeObserved as string;
  const progressCodec = codecObserved as string;
  return ok({
    scope: validatedScope,
    definitionRevision,
    runtimeContractRevision,
    progressCodec,
    authorityContext: authorityContext.value,
    initialInput: initialInput.value,
    identity: packIdentity([
      validatedScope,
      definitionRevision,
      runtimeContractRevision,
      progressCodec,
      authorityContext.value.canonical,
      initialInput.value.identity,
    ]),
  });
}

// -- The coordinator ---------------------------------------------------------

export class ExecutionCoordinator {
  readonly #driver: ExecutionDriver;
  readonly #mailboxCapacity: number;
  readonly #emissionsPerOutcome: number;
  readonly #executions = new PrimordialMap<string, ExecutionRecord>();
  readonly #byCreationRequestId = new PrimordialMap<string, ExecutionRecord>();
  // K11-R12-ID-01: there is deliberately no coordinator-wide acceptance counter, execution
  // counter or event counter here. A single mutable sequence shared across Executions, callers
  // and boundaries turns one principal's own receipt into an oracle for decisions taken in
  // scopes it cannot observe: every accepted boundary and every refusal used to increment one
  // `#acceptancePosition`, and the resulting number was exposed as `Receipt.position` and
  // embedded in `Receipt.token`. Ordering therefore lives on the owning Execution record
  // (`nextAcceptancePosition`/`nextRefusalPosition` below), Execution and Event identities are
  // pure functions of the request identity that named them, and receipt tokens name the owning
  // Execution plus its own acceptance index. Nothing one Execution's evidence exposes advances
  // when an unrelated Execution is accepted or refused.

  constructor(options: CoordinatorOptions) {
    const capacity = options.mailboxCapacity ?? DEFAULT_MAILBOX_CAPACITY;
    if (!PrimordialNumberIsInteger(capacity) || (capacity as number) < 1) {
      // A configuration error, not a protocol refusal: creation accepts its initial input as part of
      // one atomic decision, so a capacity below one would declare a limit the first Execution
      // necessarily breaks.
      throw new PrimordialRangeError(`mailboxCapacity must be an integer of at least 1, received ${typeof capacity === "number" ? `${capacity}` : typeof capacity}`);
    }
    const emissionLimit = options.emissionsPerOutcome ?? DEFAULT_EMISSIONS_PER_OUTCOME;
    if (!PrimordialNumberIsInteger(emissionLimit) || (emissionLimit as number) < 1) {
      // A configuration error for the same reason: a declared limit is published, not discovered.
      throw new PrimordialRangeError(
        `emissionsPerOutcome must be an integer of at least 1, received ${typeof emissionLimit === "number" ? `${emissionLimit}` : typeof emissionLimit}`,
      );
    }
    this.#driver = options.driver;
    this.#mailboxCapacity = capacity;
    this.#emissionsPerOutcome = emissionLimit;
  }

  /**
   * Creates one Execution, or returns the one this Creation request ID already named.
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
    // K11-R3-ID-03: contract revision 4 requires every request-naming field, including `scope`,
    // to be text before it is packed into an identity. A non-text or malformed-Unicode scope is
    // `malformed_value` naming `scope`, even when the caller is also unauthorized for it — so scope
    // text validation precedes authorization. Only scope moves before auth: the remaining identity
    // fields stay after auth so an unauthorized caller receives no field-validity oracle beyond the
    // scope it named. Authorization still precedes the key lookup, following
    // `execution-cycle.md`'s acceptance step 1: scope access before inspecting or disclosing
    // anything. A caller whose scope was revoked after it created an Execution is refused here
    // rather than handed back the retained decision. The envelope is caller-owned state, so `scope`
    // is observed once here and that same observation is reused for validation, authorization,
    // binding and the record below — never re-read.
    const scopeIssues: ValueIssue[] = [];
    const scopeField = observeField(request, "scope", "scope", scopeIssues);
    if (!scopeField.ok) {
      return err(this.#refusal("malformed_value", `creation content is not an acceptable boundary value: ${explain(scopeIssues)}`, null));
    }
    const scopeObserved: unknown = scopeField.observed;
    if (!acceptIdentityText(scopeObserved, "scope", scopeIssues)) {
      return err(this.#refusal("malformed_value", `creation content is not an acceptable boundary value: ${explain(scopeIssues)}`, null));
    }
    const scope = scopeObserved as string;
    if (!mayReachScope(caller, scope)) {
      return err(this.#refusal("unauthorized_scope", `caller cannot create an Execution in authority scope "${scope}"`, null));
    }

    // The creation key is not content — it never joins the content identity — but it is the text
    // the Creation request ID is packed from, so it is held to the same identity-text rule. Both are
    // checked before either is reported, so one call names every reason the request was refused.
    // Observed once and reused for the lookup/binding below for the same single-observation reason.
    const keyIssues: ValueIssue[] = [];
    const creationKeyField = observeField(request, "creationKey", "creationKey", keyIssues);
    const keyOk = creationKeyField.ok && acceptIdentityText(creationKeyField.observed, "creationKey", keyIssues);
    const content = acceptCreationContent(request, scope);
    if (!keyOk || !content.ok) {
      // No spread: spread iteration consults the ambient `Symbol.iterator`, which content
      // observation in the same tick may have replaced.
      const issues: ValueIssue[] = [];
      appendIssues(issues, keyIssues);
      if (!content.ok) appendIssues(issues, content.error);
      return err(this.#refusal("malformed_value", `creation content is not an acceptable boundary value: ${explain(issues)}`, null));
    }
    const creationKeyText = creationKeyField.observed as string;

    const creationRequestId: CreationRequestId = {
      producerNamespace: caller.namespace,
      scope,
      requestKey: creationKeyText,
    };
    const existing = mapGet(this.#byCreationRequestId, creationRequestIdKey(creationRequestId));
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
          `creation key "${creationKeyText}" already names Execution ${existing.executionId} with different content; a second intentional run needs a fresh key`,
          existing,
        ),
      );
    }

    // K11-R15-ID-01: the initial Event is accepted by the creation boundary, not by ingress, so
    // its identity lives in the creation-key domain rather than in the post-creation Input-ID
    // domain. Indexing it under `(namespace, executionId, creationKeyText)` would plant a row that
    // `submitInput` constructs for every later ingress request: the creating producer could never
    // reuse its own creation-key text as a genuine ingress key (equal content replaying a
    // creation-boundary receipt through the ingress boundary, different content refused as a
    // conflict for input it never submitted). The Creation request ID and the Input ID
    // triple are two different scoping constructs in `identity.md`; nothing reserves the
    // creation-key text inside the producer's ingress key space. `byInputId` therefore indexes
    // post-creation ingress entries only, and the initial Event ID derives from the Creation request ID
    // under a prefix no ingress Event ID can carry. Creation retry still resolves through
    // `byCreationRequestId`; the triple on the entry below is retained creation provenance for
    // inspection, not an ingress address.
    //
    // K11-R12-ID-01: both identities remain pure functions of the request identity that named
    // them — the Creation request ID for the Execution and its initial Event — so neither
    // encodes how many unrelated Executions or Events already exist. Creation is always this
    // Execution's first acceptance, hence position 1; the record below continues its own index
    // at 2.
    const executionId = `execution-${creationRequestIdKey(creationRequestId)}`;
    const receipt = mintReceipt("creation", 1, executionId);
    const initialInputId: InputId = {
      producerNamespace: caller.namespace,
      destination: executionId,
      requestKey: creationKeyText,
    };
    const eventId = `event-creation-${creationRequestIdKey(creationRequestId)}`;

    // Accepted content is immutable, so what is retained is the sealed copy validation made, never
    // the caller's own object. An application that keeps editing the value it passed in cannot change
    // what the Kernel accepted, and an observer cannot edit it through an inspection view.
    const initial = content.value.initialInput;

    const entry: MailboxEntry = {
      eventId,
      inputId: initialInputId,
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

    // The commit below uses primordial collection operations only. Content observation above ran
    // caller traps in this tick, which may have replaced `Map.prototype.set` (or any sibling)
    // before these lines run: a live `.set` that silently drops the write would return an accepted
    // Execution ID and receipt with no retained decision behind them (K11-R5-STATE-01). The
    // initial Event is deliberately *not* indexed in `byInputId`: that map is the post-creation
    // ingress replay/conflict domain (K11-R15-ID-01 above).
    const byInputId = new PrimordialMap<string, MailboxEntry>();

    const record: ExecutionRecord = {
      executionId,
      scope: content.value.scope,
      creationRequestId,
      definitionRevision: content.value.definitionRevision,
      runtimeContractRevision: content.value.runtimeContractRevision,
      progressCodec: content.value.progressCodec,
      authorityContext: content.value.authorityContext.value,
      creationIdentity: content.value.identity,
      creationReceipt: receipt,
      initialEventId: eventId,
      mailbox: [entry],
      byInputId,
      refusals: [],
      receipts: [receipt],
      // No externally visible CREATED: the Execution is READY the moment creation is accepted.
      state: "READY",
      acceptedProgress: null,
      progressRevision: 0,
      activation: null,
      acceptedOutcomes: new PrimordialMap<string, AcceptedOutcomeRecord>(),
      exchanges: [],
      emissions: [],
      result: null,
      nextAcceptancePosition: 2,
      nextRefusalPosition: 1,
      activationsMinted: 0,
    };

    mapSet(this.#executions, executionId, record);
    mapSet(this.#byCreationRequestId, creationRequestIdKey(creationRequestId), record);
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
    // Total destination observation (K11-R16-ID-01), from the envelope's own data only
    // (R3-BLOCKING): the envelope is caller-owned, so reading it can throw, and a prototype above
    // it must not answer a missing destination. An unreadable destination matches no minted
    // Execution ID and is answered exactly as a missing one, disclosing nothing.
    const destinationSeen = observeOwn(request, "destination");
    if (destinationSeen.threw) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));
    const record = this.#visible(caller, destinationSeen.observed as string);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    // The producer request key is the third member of the Input ID triple, so it is identity text
    // for the same reason the creation key is. `destination` needs no such check: a non-text
    // destination simply matches no minted Execution ID and has already been answered above as an
    // unknown destination, which discloses nothing. Observed once and reused below so validation
    // and binding cannot see two keys.
    const keyIssues: ValueIssue[] = [];
    const requestKeyField = observeField(request, "requestKey", "requestKey", keyIssues);
    const keyOk = requestKeyField.ok && acceptIdentityText(requestKeyField.observed, "requestKey", keyIssues);
    const content = acceptInputContent(request, "");
    if (!keyOk || !content.ok) {
      const issues: ValueIssue[] = [];
      appendIssues(issues, keyIssues);
      if (!content.ok) appendIssues(issues, content.error);
      return err(this.#refusal("malformed_value", `input content is not an acceptable boundary value: ${explain(issues)}`, record));
    }
    const requestKey = requestKeyField.observed as string;

    const inputId: InputId = {
      producerNamespace: caller.namespace,
      destination: record.executionId,
      requestKey,
    };
    const existing = mapGet(record.byInputId, inputIdKey(inputId));
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
          `input key "${requestKey}" from this producer already names Event ${existing.eventId} with different content; input identity is immutable`,
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

    // Counted with an index loop: content observation above runs caller traps in the same tick,
    // which can replace `Array.prototype.filter` before this line runs.
    let unacknowledged = 0;
    for (let index = 0; index < record.mailbox.length; index += 1) {
      if ((readAt(record.mailbox, index) as MailboxEntry).disposition.kind === "queued") unacknowledged += 1;
    }
    if (unacknowledged >= this.#mailboxCapacity) {
      return err(
        this.#refusal(
          "capacity_exhausted",
          `Execution ${record.executionId} already holds ${unacknowledged} unacknowledged Events, at the declared capacity of ${this.#mailboxCapacity}`,
          record,
        ),
      );
    }

    const eventId = `event-${inputIdKey(inputId)}`;
    const receipt = this.#mint("input_ingress", record);
    const entry: MailboxEntry = {
      eventId,
      inputId,
      contentIdentity: content.value.identity,
      kind: content.value.kind,
      payload: content.value.payload.value,
      subscriptionClass: content.value.subscriptionClass,
      // One accepted decision carries one acceptance number: the mailbox entry shares the
      // receipt's position rather than consuming a second one (`#mint` above already advanced
      // this Execution's index).
      acceptancePosition: receipt.position,
      receipt,
      disposition: QUEUED,
    };
    // `appendOwn`, not `.push` and not `mailbox[mailbox.length] = entry`: both are `[[Set]]` on a
    // position the mailbox does not own yet, and the payload capture above ran caller traps in this
    // tick that may have installed an inherited accessor at exactly that index name. A swallowed
    // write would return an accepted Event ID and receipt with nothing behind them — the same
    // acceptance-without-retention shape as the round-6 `Map.set` drop, reached without touching
    // any method (K11-R6-STATE-02).
    appendOwn(record.mailbox, entry);
    mapSet(record.byInputId, inputIdKey(inputId), entry);
    appendOwn(record.receipts, receipt);

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
   * `deliver` is called with a fresh reporting capability and the Kernel does not wait for a
   * report. A Driver that never reports holds up nothing: another Execution on this same
   * coordinator dispatches while the first exchange is unresolved.
   */
  dispatch(caller: AuthenticatedCaller, executionId: string, options: DispatchOptions): Result<DispatchAccepted, RefusalRecord> {
    const record = this.#visible(caller, executionId);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    // K11-R4-DISP-01: `options` is caller-owned JavaScript state. The bound is observed exactly
    // once into a local; validation, refusal reporting and batch selection all use that one
    // observation. Reading `options.bound` three times lets a shifting getter validate as `1`
    // and select as `0`, accepting a request under one value and committing under another.
    // The integer test itself is the load-time reference: the observation (a getter) can replace
    // the global before validation runs in the same tick. A non-object envelope has no bound to
    // observe and is refused the same way, rather than throwing a `TypeError` out of the boundary.
    // K11-R16-ID-01: the read itself can also throw (a revoked envelope, a throwing `bound`
    // getter). That failure is an invalid bound, reported without stringifying caller state.
    // R3-BLOCKING: the read is own-only, so ambient `Object.prototype`/`Array.prototype` state
    // cannot answer a missing bound, and an array envelope (`[]`) owns none.
    let boundObserved: unknown = undefined;
    let boundUninspectable = false;
    if (options !== null && typeof options === "object") {
      const seen = observeOwn(options, "bound");
      if (seen.threw) boundUninspectable = true;
      else boundObserved = seen.observed;
    }
    if (!PrimordialNumberIsInteger(boundObserved) || (boundObserved as number) < 1) {
      // Only numbers are interpolated: anything else failing validation may be an object whose
      // `toString` trap throws, and the refusal reason must not invoke it.
      const received = boundUninspectable ? "an uninspectable value" : typeof boundObserved === "number" ? `${boundObserved}` : typeof boundObserved;
      return err(
        this.#refusal(
          "invalid_batch_bound",
          `batch bound must be an integer of at least 1, received ${received}; a Runtime dispatched with an unbounded-below batch cannot be told why it was activated`,
          record,
        ),
      );
    }
    const bound = boundObserved as number;
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

    // The batch is the acceptance-order prefix of exactly the validated length: the same `bound`
    // observation that passed validation selects, with no second read of the envelope. The prefix
    // is built with an index loop rather than `filter`/`slice` so a getter side effect that
    // replaced an `Array.prototype` method before selection runs cannot change which Events the
    // validated bound names — and each selected entry is installed as the list's own data
    // (`appendOwn`), not written with `selected[selected.length] = entry`.
    //
    // K11-R6-STATE-02: that last part is the whole counterexample, and it needs no payload at all.
    // A `bound` getter that returns `1` and installs an inherited setter at `Array.prototype["0"]`
    // leaves this loop's ordinary write with nowhere to land: the setter runs, no element is
    // created, `selected.length` stays at zero, and the loop keeps re-selecting into the same
    // swallowed position. The Kernel then accepts a dispatch intent whose reserved batch is empty
    // while a queued Event was available under a validated bound of one. `appendOwn` is
    // `[[DefineOwnProperty]]`, so the accessor is not on the path.
    const selected: MailboxEntry[] = [];
    for (let index = 0; index < record.mailbox.length && selected.length < bound; index += 1) {
      const entry = readAt(record.mailbox, index) as MailboxEntry;
      if (entry.disposition.kind === "queued") appendOwn(selected, entry);
    }
    record.activationsMinted += 1;
    const activationId = `${record.executionId}/activation-${record.activationsMinted}`;
    const receipt = this.#mint("dispatch_intent", record);

    // The intent is frozen through the load-time reference and its member arrays are built with
    // index loops: a capture-time (or bound-getter) side effect may have replaced live
    // `Object.freeze`/`Array.prototype.map` before these lines run, which would hand the Driver a
    // mutable exchange whose later mutation reappears on redelivery (K11-R5-STATE-01).
    const carriedEvents: ActivationEvent[] = mapOwn(selected, toActivationEvent);
    const batchIds: string[] = mapOwn(selected, (entry: MailboxEntry) => entry.eventId);
    const activation: Activation = PrimordialObjectFreeze({
      executionId: record.executionId,
      activationId,
      // A new exchange starts its own attempt ordering at 1. `identity.md` leaves whether the
      // counter resets across Activations to the implementation; this binding restarts it
      // (K1.1-DEC-2, carried as K1.2-DEC-5). Only an advance within one unresolved exchange is
      // constrained, and only an accepted takeover (`requestTakeover`) makes one.
      writerEpoch: 1,
      baseProgressRevision: record.progressRevision,
      runtimeContractRevision: record.runtimeContractRevision,
      definitionRevision: record.definitionRevision,
      progressCodec: record.progressCodec,
      acceptedProgress: record.acceptedProgress,
      events: PrimordialObjectFreeze(carriedEvents),
      executionView: record.authorityContext,
    });

    const intent: ActivationRecord = {
      activation,
      receipt,
      batch: PrimordialObjectFreeze(batchIds),
      deliveries: [],
      codeHold: null,
      protocolFailureHold: null,
    };
    record.activation = intent;
    record.state = "RUNNING";
    appendOwn(record.receipts, receipt);

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
    // A recovery-held exchange "cannot safely continue" (`state.md`), and resending it is
    // continuing it. The hold is lifted by its own recovery decision, never by a resend (OA-6:
    // never a silent retry).
    const hold = intent.codeHold ?? intent.protocolFailureHold;
    if (hold !== null) {
      return err(
        this.#refusal(
          "recovery_held",
          `Activation ${intent.activation.activationId} is recovery-held and is not redelivered: ${hold.reason}`,
          record,
        ),
      );
    }

    // The answer describes the attempt this call resent. Read before the Driver runs: a Driver that
    // reenters with a takeover replaces the exchange's current attempt, and reading it back
    // afterwards would report an attempt this call never delivered.
    const resent = intent.activation;
    const receipt = intent.receipt;
    this.#deliver(intent);
    return ok({
      activationId: resent.activationId,
      writerEpoch: resent.writerEpoch,
      baseProgressRevision: resent.baseProgressRevision,
      batch: intent.batch,
      receipt,
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

  // -- Outcome acceptance (K1.2) ---------------------------------------------

  /**
   * Accepts one Runtime proposal whole, returns the decision already made for it, or refuses it whole.
   *
   * `execution-cycle.md` fixes the order, and each step is here for a reason it states:
   *
   * 1. **Authenticate and scope** before anything else is read (OA-1). `executionId` is the one field
   *    read first, because scoping needs it; a hidden Execution answers exactly as a missing one.
   * 2. **Look for an already accepted Outcome** under this Activation ID, before fresh validation
   *    (OA-2). An exact duplicate returns the original decision and receipt, with no mutation, even
   *    after the exchange resolved, the next one started or the Execution ended. Any other content
   *    under that identity is a conflict, never a merge.
   * 3. **Validate the whole envelope** (OA-3): not terminal; the Activation, writer epoch and base
   *    revision the envelope names are the unresolved exchange's own; then the content. Any failure
   *    refuses the whole proposal and leaves the exchange open for a corrected one (K1.2-DEC-2).
   * 4. **Commit** everything in one decision (OA-4): acknowledge the whole batch, install progress,
   *    record Emissions, the terminal result and the next state, and give each Event still
   *    unacknowledged at `complete` or `fail` its terminal disposition (`B-5`).
   * 5. **Return** the receipt.
   *
   * Every caller observation happens before step 2's lookup, so a getter that reenters the Kernel
   * is ordered before this decision's checks rather than inside them (K1.2-DEC-10). A refusal is
   * recorded and returned; the Kernel never redelivers or retries on its own (OA-5).
   */
  submitOutcome(caller: AuthenticatedCaller, envelope: OutcomeEnvelope): Result<OutcomeAccepted, RefusalRecord> {
    const executionSeen = observeOwn(envelope, "executionId");
    if (executionSeen.threw) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));
    const record = this.#visible(caller, executionSeen.observed as string);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    const idIssues: LocatedIssue[] = [];
    const activationField = observeField(envelope, "activationId", "activationId", idIssues);
    if (!activationField.ok || !acceptIdentityText(activationField.observed, "activationId", idIssues)) {
      return err(this.#refusal("malformed_envelope", `Outcome envelope refused whole: ${explainOutcomeIssues(idIssues)}`, record));
    }
    const activationId = activationField.observed as string;
    // Content is captured before the lookup: an exact duplicate is equal captured content, and
    // nothing after this line reads the caller's envelope again.
    const capture = captureOutcome(envelope as object, this.#emissionsPerOutcome);

    const already = mapGet(record.acceptedOutcomes, activationId);
    if (already !== undefined) {
      if (capture.outcome !== null && capture.outcome.identity === already.identity) {
        return ok({ ...already.decision, replayed: true });
      }
      return err(
        this.#refusal(
          "duplicate_conflict",
          `an Outcome for Activation ${activationId} was already accepted with different content; an accepted Outcome is never replaced, merged or patched`,
          record,
        ),
      );
    }

    if (isTerminal(record.state)) {
      return err(
        this.#refusal(
          "terminal_destination",
          `Execution ${record.executionId} ended as ${record.state}; no further Outcome can be accepted for it`,
          record,
        ),
      );
    }
    const intent = record.activation;
    if (intent === null || intent.activation.activationId !== activationId) {
      return err(
        this.#refusal(
          "stale_exchange",
          `Activation ${activationId} is not the unresolved exchange of Execution ${record.executionId}; an Outcome can answer only the exchange that is open`,
          record,
        ),
      );
    }
    const claim = capture.claim;
    if (claim === null) {
      return err(
        this.#refusal("malformed_envelope", `Outcome for Activation ${activationId} refused whole: ${explainOutcomeIssues(capture.issues)}`, record),
      );
    }
    const currentEpoch = intent.activation.writerEpoch;
    if (claim.writerEpoch !== currentEpoch) {
      return err(
        this.#refusal(
          "stale_exchange",
          claim.writerEpoch < currentEpoch
            ? `Outcome for Activation ${activationId}: writer epoch ${claim.writerEpoch} was superseded by epoch ${currentEpoch}; the superseded attempt commits nothing`
            : `Outcome for Activation ${activationId}: writer epoch ${claim.writerEpoch} has not been issued; the current epoch is ${currentEpoch}`,
          record,
        ),
      );
    }
    if (claim.baseProgressRevision !== intent.activation.baseProgressRevision) {
      return err(
        this.#refusal(
          "stale_exchange",
          `Outcome for Activation ${activationId}: base progress revision ${claim.baseProgressRevision} does not match the revision ${intent.activation.baseProgressRevision} this exchange was pinned at`,
          record,
        ),
      );
    }
    if (capture.overCapacity !== null) {
      return err(
        this.#refusal(
          "capacity_exhausted",
          `the Outcome for Activation ${activationId} carries ${capture.overCapacity.count} Emissions, above the declared limit of ${capture.overCapacity.limit} per Outcome; nothing of it was accepted`,
          record,
        ),
      );
    }
    if (capture.outcome === null) {
      return err(
        this.#refusal("malformed_envelope", `Outcome for Activation ${activationId} refused whole: ${explainOutcomeIssues(capture.issues)}`, record),
      );
    }
    // Completion accounting (`lifecycle.md#completion-is-an-accounting-check`, WS CX-3) is part of
    // this validation. Its first half - a `complete` proposes no new Effect - is the EF-2 refusal
    // above, and any other obligation-bearing field is refused as unknown. Its second half - every
    // owned action and child has a known disposition - has nothing to find here: no obligation kind
    // exists before K2, so no record can be outstanding. K2.3 adds the check over real records.
    return ok(this.#accept(record, intent, capture.outcome));
  }

  /**
   * Authorizes a replacement attempt at the same unresolved exchange (ID-3, ID-4).
   *
   * The request names the Activation and the epoch it supersedes; only when both are current does
   * one accepted decision advance the epoch by one, keep the Activation ID and the pinned input, and
   * re-record the dispatch intent's current attempt with its receipt. The superseded attempt is fenced
   * the moment this returns: there is no window in which its Outcome is still acceptable. The same
   * exchange is then delivered at the new epoch through a fresh capability.
   *
   * What this does not do is the Driver's half of takeover. The Kernel rejects every later write from
   * the superseded attempt; excluding its native work, or refusing the takeover when that cannot be
   * done, stays with the Driver's recovery contract (`recovery.md`). The caller authorizing this has
   * made that determination; the Kernel does not infer it from a lease or a silence.
   */
  requestTakeover(caller: AuthenticatedCaller, executionId: string, request: TakeoverRequest): Result<TakeoverAccepted, RefusalRecord> {
    const record = this.#visible(caller, executionId);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    const issues: LocatedIssue[] = [];
    const named = captureAttempt(request, issues);
    if (named === null) {
      return err(this.#refusal("malformed_value", `takeover request is not acceptable: ${explain(issues)}`, record));
    }
    const intent = this.#openExchange(record, named.activationId, "take over");
    if (!intent.ok) return intent;
    const exchange = intent.value;
    const currentEpoch = exchange.activation.writerEpoch;
    if (named.writerEpoch !== currentEpoch) {
      return err(
        this.#refusal(
          "stale_exchange",
          `writer epoch ${named.writerEpoch} is not the current epoch ${currentEpoch} of Activation ${named.activationId}; a takeover names the attempt it supersedes and advances past it once`,
          record,
        ),
      );
    }
    if (exchange.codeHold !== null) {
      return err(
        this.#refusal(
          "recovery_held",
          `Activation ${named.activationId} cannot be taken over while its pinned code is unavailable: ${exchange.codeHold.reason}`,
          record,
        ),
      );
    }

    const writerEpoch = currentEpoch + 1;
    const receipt = this.#mint("dispatch_intent", record);
    // Same exchange, same pinned input, next attempt: a copy of the frozen Kernel-built Activation
    // with only the epoch changed. Object spread copies own data and consults no prototype.
    const activation: Activation = PrimordialObjectFreeze({ ...exchange.activation, writerEpoch });
    exchange.activation = activation;
    exchange.receipt = receipt;
    // The failed response came from the superseded attempt; replacing the attempt is the recovery
    // decision OA-6 asks for (K1.2-DEC-7). A code hold is never cleared this way: it refused above.
    exchange.protocolFailureHold = null;
    appendOwn(record.receipts, receipt);

    this.#deliver(exchange);

    return ok({
      activationId: named.activationId,
      supersededEpoch: currentEpoch,
      writerEpoch,
      baseProgressRevision: activation.baseProgressRevision,
      batch: exchange.batch,
      receipt,
    });
  }

  /**
   * Checks the unresolved exchange's pinned code against what the deployment can run now.
   *
   * The request names the exchange and declares the available Definition revisions, Runtime contract
   * revisions and progress codecs; the Kernel infers none of them (K1.2-DEC-7). When a pin is
   * missing, the exchange is **recovery-held**: still `RUNNING`, with its Activation, batch, progress
   * and revision intact, and a reason naming what is missing. Nothing fresh is presented as restored
   * (PC-5). When every pin is available the code hold clears, and the exchange continues as it was -
   * redelivered or answered - without any new revision. This is exchange handling on an in-memory
   * coordinator, not K3 process-fault recovery, and it claims no persistence.
   */
  recoverExecution(caller: AuthenticatedCaller, executionId: string, request: RecoveryRequest): Result<RecoveryDecision, RefusalRecord> {
    const record = this.#visible(caller, executionId);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    const issues: LocatedIssue[] = [];
    const captured = captureRecovery(request, issues);
    if (captured === null) {
      return err(this.#refusal("malformed_value", `recovery request is not acceptable: ${explain(issues)}`, record));
    }
    const intent = this.#openExchange(record, captured.activationId, "recover");
    if (!intent.ok) return intent;
    const exchange = intent.value;
    const pinned = exchange.activation;

    let missing = "";
    const note = (what: string, value: string): void => {
      missing += `${missing === "" ? "" : "; "}pinned ${what} ${value} is unavailable`;
    };
    if (!listed(captured.available.definitionRevisions, pinned.definitionRevision)) note("Definition revision", pinned.definitionRevision);
    if (!listed(captured.available.runtimeContractRevisions, pinned.runtimeContractRevision)) note("Runtime contract revision", pinned.runtimeContractRevision);
    if (!listed(captured.available.progressCodecs, pinned.progressCodec)) note("progress codec", pinned.progressCodec);

    let changed = false;
    if (missing === "") {
      if (exchange.codeHold !== null) {
        exchange.codeHold = null;
        changed = true;
      }
    } else if (exchange.codeHold === null || exchange.codeHold.reason !== missing) {
      exchange.codeHold = PrimordialObjectFreeze({
        cause: "pinned_code_unavailable" as const,
        reason: missing,
        activationId: pinned.activationId,
        writerEpoch: pinned.writerEpoch,
      });
      changed = true;
    }
    return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed });
  }

  /**
   * Holds the unresolved exchange because its current attempt's response could not be classified.
   *
   * OA-6: such a response "ends or holds the exchange under an explicit, inspectable recovery
   * decision" and is "never an infinite silent retry". This binding holds (K1.2-DEC-8): lifecycle
   * transitions come only from accepted decisions, and none has been accepted. The hold names the
   * attempt and carries a bounded diagnostic; state, progress, epoch, batch and receipts are
   * untouched, and redelivery is refused while it stands. An authorized takeover, or a valid Outcome
   * from the current attempt, is what ends it.
   */
  reportProtocolFailure(caller: AuthenticatedCaller, executionId: string, report: ProtocolFailureReport): Result<RecoveryDecision, RefusalRecord> {
    const record = this.#visible(caller, executionId);
    if (record === null) return err(this.#refusal("unknown_destination", UNKNOWN_DESTINATION_REASON, null));

    const issues: LocatedIssue[] = [];
    const named = captureAttempt(report, issues);
    const diagnosticSeen = observeOwn(report, "diagnostic");
    const diagnostic = diagnosticSeen.threw ? PROTOCOL_FAILURE_FALLBACK : boundDiagnostic(diagnosticSeen.observed, PROTOCOL_FAILURE_FALLBACK);
    if (named === null) {
      return err(this.#refusal("malformed_value", `protocol-failure report is not acceptable: ${explain(issues)}`, record));
    }
    const intent = this.#openExchange(record, named.activationId, "hold");
    if (!intent.ok) return intent;
    const exchange = intent.value;
    const currentEpoch = exchange.activation.writerEpoch;
    if (named.writerEpoch !== currentEpoch) {
      return err(
        this.#refusal(
          "stale_exchange",
          `writer epoch ${named.writerEpoch} is not the current epoch ${currentEpoch} of Activation ${named.activationId}; a superseded attempt cannot hold the exchange`,
          record,
        ),
      );
    }
    if (exchange.protocolFailureHold !== null) {
      return ok({ activationId: named.activationId, writerEpoch: currentEpoch, recoveryHolds: holdsOf(exchange), changed: false });
    }
    exchange.protocolFailureHold = PrimordialObjectFreeze({
      cause: "protocol_failure" as const,
      reason: `the response of the attempt at writer epoch ${currentEpoch} could not be classified as an Outcome: ${diagnostic}`,
      activationId: named.activationId,
      writerEpoch: currentEpoch,
    });
    return ok({ activationId: named.activationId, writerEpoch: currentEpoch, recoveryHolds: holdsOf(exchange), changed: true });
  }

  // -- Surfaces later packets own --------------------------------------------

  /** Out-of-band cancellation and terminal disposition are K1.3's (governing 007). */
  cancelExecution(): never {
    return refuseUnsupportedSurface("cancelExecution", "K1.3");
  }

  // -- Internals -------------------------------------------------------------

  /**
   * The unresolved exchange a control names, or the recorded refusal saying why there is none.
   *
   * A control acts only on the exchange it names (PLAN-01): a request decided against one exchange
   * must never land on the next one.
   */
  #openExchange(record: ExecutionRecord, activationId: string, verb: string): Result<ActivationRecord, RefusalRecord> {
    if (isTerminal(record.state)) {
      return err(
        this.#refusal("terminal_destination", `Execution ${record.executionId} ended as ${record.state}; there is no exchange to ${verb}`, record),
      );
    }
    const intent = record.activation;
    if (intent === null) {
      return err(this.#refusal("no_unresolved_exchange", `Execution ${record.executionId} has no unresolved Activation to ${verb}`, record));
    }
    if (intent.activation.activationId !== activationId) {
      return err(
        this.#refusal(
          "stale_exchange",
          `Activation ${activationId} is not the unresolved exchange of Execution ${record.executionId}`,
          record,
        ),
      );
    }
    return ok(intent);
  }

  /**
   * Commits one validated Outcome as one decision (OA-4), and retains it for replay.
   *
   * Every record is built first, from Kernel data only; the mutations follow in one run, through
   * load-time primitives. Nothing here reads the caller's envelope - `outcome` is the capture - and
   * nothing here reads the Runtime's progress: acknowledgment is the whole reserved batch because
   * acceptance says so (`B-3`), not because progress was parsed for what it handled (R5-j6-2).
   */
  #accept(record: ExecutionRecord, intent: ActivationRecord, outcome: CapturedOutcome): OutcomeAccepted {
    const activationId = intent.activation.activationId;
    const receipt = this.#mint("outcome_acceptance", record);
    const progressRevision = record.progressRevision + 1;
    const step = outcome.next.step;
    const nextState: ExecutionState = step === "continue" ? "READY" : step === "complete" ? "COMPLETED" : "FAILED";

    const emissionRecords: EmissionView[] = [];
    const emissionIds: string[] = [];
    for (let index = 0; index < outcome.emissions.length; index += 1) {
      const emission = readAt(outcome.emissions, index) as CapturedOutcome["emissions"][number];
      // K1.2-DEC-4: a pure function of accepted identities, so a replay cannot mint another.
      const emissionId = `emission-${packIdentity([record.executionId, activationId, emission.emissionKey])}`;
      appendOwn(emissionIds, emissionId);
      appendOwn(
        emissionRecords,
        PrimordialObjectFreeze({ emissionId, emissionKey: emission.emissionKey, activationId, value: emission.value.value, receipt }),
      );
    }

    let result: TerminalResultView | null = null;
    if (outcome.next.step === "complete" || outcome.next.step === "fail") {
      result = PrimordialObjectFreeze({
        resultId: `result-${packIdentity([record.executionId, activationId])}`,
        kind: outcome.next.step === "complete" ? ("completed" as const) : ("failed" as const),
        value: outcome.next.step === "complete" ? outcome.next.result.value : outcome.next.error.value,
        activationId,
        receipt,
      });
    }

    // Which entries this decision disposes, planned before any is changed. The reserved batch is
    // acknowledged whole; at a terminal step, every Event still unacknowledged after that receives a
    // terminal disposition in the same decision (`B-5`) - never an acknowledgment, never a deletion.
    const inBatch = (eventId: string): boolean => {
      for (let index = 0; index < intent.batch.length; index += 1) {
        if ((readAt(intent.batch, index) as string) === eventId) return true;
      }
      return false;
    };
    const toAcknowledge: MailboxEntry[] = [];
    const toEnd: MailboxEntry[] = [];
    const acknowledgedIds: string[] = [];
    const endedIds: string[] = [];
    for (let index = 0; index < record.mailbox.length; index += 1) {
      const entry = readAt(record.mailbox, index) as MailboxEntry;
      if (entry.disposition.kind !== "queued") continue;
      if (inBatch(entry.eventId)) {
        appendOwn(toAcknowledge, entry);
        appendOwn(acknowledgedIds, entry.eventId);
      } else if (nextState !== "READY") {
        appendOwn(toEnd, entry);
        appendOwn(endedIds, entry.eventId);
      }
    }
    const acknowledgment: MailboxDisposition = PrimordialObjectFreeze({ kind: "acknowledged" as const, activationId });
    const ending: MailboxDisposition = PrimordialObjectFreeze({
      kind: "terminal" as const,
      reason: `Execution ended as ${nextState} before this Event was acknowledged`,
    });

    const resolved: ResolvedExchange = PrimordialObjectFreeze({
      activationId,
      writerEpoch: intent.activation.writerEpoch,
      baseProgressRevision: intent.activation.baseProgressRevision,
      batch: intent.batch,
      dispatchReceipt: intent.receipt,
      outcomeReceipt: receipt,
      // The same list the capabilities write into, so a late report settles its original record.
      deliveries: intent.deliveries,
    });
    const decision: Omit<OutcomeAccepted, "replayed"> = PrimordialObjectFreeze({
      receipt,
      activationId,
      nextState,
      progressRevision,
      acknowledged: PrimordialObjectFreeze(acknowledgedIds),
      emissionIds: PrimordialObjectFreeze(emissionIds),
      resultId: result === null ? null : result.resultId,
      terminalDispositions: PrimordialObjectFreeze(endedIds),
    });

    // -- The decision, applied. Nothing below can refuse, and nothing below reads caller state.
    for (let index = 0; index < toAcknowledge.length; index += 1) (readAt(toAcknowledge, index) as MailboxEntry).disposition = acknowledgment;
    for (let index = 0; index < toEnd.length; index += 1) (readAt(toEnd, index) as MailboxEntry).disposition = ending;
    record.acceptedProgress = outcome.progress.value;
    record.progressRevision = progressRevision;
    appendAllOwn(record.emissions, emissionRecords);
    if (result !== null) record.result = result;
    appendOwn(record.exchanges, resolved);
    mapSet(record.acceptedOutcomes, activationId, PrimordialObjectFreeze({ identity: outcome.identity, decision }));
    appendOwn(record.receipts, receipt);
    record.activation = null;
    record.state = nextState;

    return { ...decision, replayed: false };
  }

  /**
   * Mints the receipt for one accepted decision on the given Execution.
   *
   * The position consumed is that Execution's own acceptance index, never a shared
   * coordinator sequence (K11-R12-ID-01). Replay and redelivery do not call this: they
   * return the already-minted receipt unchanged.
   */
  #mint(boundary: ReceiptBoundary, record: ExecutionRecord): Receipt {
    const position = record.nextAcceptancePosition;
    record.nextAcceptancePosition += 1;
    return mintReceipt(boundary, position, record.executionId);
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
    const record = mapGet(this.#executions, executionId);
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
    // K11-R12-ID-01: a refusal advances only the owning Execution's own refusal index, and a
    // refusal that names no Execution advances nothing at all — it carries position 0. Either
    // way no caller-visible sequence moves for activity outside the caller's visible domain.
    if (record === null) return mintRefusal(classification, reason, 0, null);
    const position = record.nextRefusalPosition;
    record.nextRefusalPosition += 1;
    const refusal = mintRefusal(classification, reason, position, record.executionId);
    appendOwn(record.refusals, refusal);
    return refusal;
  }

  /**
   * Hands an Activation to the Driver with a Kernel-owned reporting capability.
   *
   * The attempt is recorded before the Driver is invoked, and a fresh frozen capability
   * bound to that exact attempt is supplied. Only an explicit `delivered()`/`failed()`
   * report settles the attempt; returning normally leaves it `pending` and the return
   * value is never read, classified, or subscribed to. A synchronous throw is an implicit
   * failure report through the same first-report rule: a report followed by a throw keeps
   * the report, and a throw followed by a late report keeps the failure. Nothing here
   * changes accepted state: the intent stands, the Execution stays `RUNNING`, and the same
   * exchange can be redelivered with a new capability for the new attempt (KC1-ARCH-1).
   */
  #deliver(intent: ActivationRecord): void {
    const attempt: DeliveryAttempt = { attempt: intent.deliveries.length + 1, status: "pending", failure: null };
    appendOwn(intent.deliveries, attempt);
    // Claimed before any reason is inspected: the first report wins, including reentrant
    // reports issued while a diagnostic is being bounded. Each closure captures only its
    // own attempt object, so a late report can settle only its original retained record —
    // never a newer attempt, the current exchange, or logical state.
    const settlement: DeliverySettlement = PrimordialObjectFreeze({
      delivered(): void {
        if (attempt.status !== "pending") return;
        attempt.status = "delivered";
      },
      failed(reason: unknown): void {
        if (attempt.status !== "pending") return;
        attempt.status = "failed";
        attempt.failure = describeDeliveryFailure(reason);
      },
    });
    try {
      // The return value is intentionally ignored: no observation, no assimilation, no
      // Promise creation, and no constructor/species sanitization on this path.
      this.#driver.deliver(intent.activation, settlement);
    } catch (error) {
      if (attempt.status !== "pending") return;
      attempt.status = "failed";
      attempt.failure = describeDeliveryFailure(error);
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
  return PrimordialObjectFreeze(entry.subscriptionClass === null ? base : { ...base, subscriptionClass: entry.subscriptionClass });
};

const toDeliveryView = (attempt: DeliveryAttempt): DeliveryAttemptView => ({
  attempt: attempt.attempt,
  status: attempt.status,
  failure: attempt.failure,
});

/** The holds on one unresolved exchange, code first, as own data. */
const holdsOf = (intent: ActivationRecord): RecoveryHoldView[] => {
  const holds: RecoveryHoldView[] = [];
  if (intent.codeHold !== null) appendOwn(holds, intent.codeHold);
  if (intent.protocolFailureHold !== null) appendOwn(holds, intent.protocolFailureHold);
  return holds;
};

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
  payload: entry.payload,
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
    authorityContext: record.authorityContext,
    activation: record.activation === null ? null : toActivationView(record.activation),
    recoveryHolds: record.activation === null ? [] : holdsOf(record.activation),
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
