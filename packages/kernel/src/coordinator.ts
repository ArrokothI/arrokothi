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
import { appendAllOwn, appendOwn, copyOwn, defineData, mapOwn, readAt, restoreDescriptor } from "./own-array.ts";
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
 * `Promise.prototype.then`, and the rest. The serializer sandbox (values.ts) does not cover these
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
 * used.)
 */
const PrimordialNumberIsInteger = Number.isInteger;
const PrimordialArrayIsArray = Array.isArray;
const PrimordialObjectFreeze = Object.freeze;
const PrimordialReflectApply = Reflect.apply;
const PrimordialMap = Map;
const PrimordialPromise = Promise;
const PrimordialMapGet = Map.prototype.get;
const PrimordialMapSet = Map.prototype.set;
const PrimordialMapForEach = Map.prototype.forEach;
const PrimordialPromiseResolve = Promise.resolve;
const PrimordialPromiseThen = Promise.prototype.then;
/**
 * Load-time Promise-construction machinery for the delivery window (K11-R16-DISP-01).
 *
 * A native `then` performs `SpeciesConstructor` — `Get(O, "constructor")`, then
 * `Get(C, Symbol.species)` — before attaching any continuation. Capturing `resolve`/`then`
 * alone therefore leaves two caller-mutable slots on the path: a capture-time side effect can
 * install a throwing `Promise[Symbol.species]` getter (or a hostile
 * `Promise.prototype.constructor`, or an own `Symbol.species` on `Object.prototype` that answers
 * once the Promise-own slot is deleted) and make the attach itself throw *before* the rejection
 * handler exists. The original rejected Driver promise would then escape as unhandled while the
 * coordinator correctly records only a synchronous attach failure. `#deliver` reinstalls these
 * primordials for the synchronous attach and restores afterwards; descriptor reads never invoke
 * an installed getter.
 *
 * `getOwnPropertyDescriptor` doubles for own-only envelope observation (R3-BLOCKING): an ordinary
 * field read consults the whole prototype chain for a key the envelope does not own, so ambient
 * `Object.prototype`/`Array.prototype` pollution would answer missing fields into acceptances the
 * caller never spelled. The envelope's own data is what was sent; anything above it reads as
 * missing.
 */
const PrimordialGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const PrimordialSymbolSpecies = Symbol.species;
const PrimordialPromisePrototype = Promise.prototype;
const PrimordialObjectPrototype = Object.prototype;
/**
 * Error constructors and `String`, from load time.
 *
 * `describeFailure` runs inside `#deliver`, which the dispatch tick reaches *after* the caller's
 * `options.bound` getter has run, so a live `Error`/`String` read there is exactly the ambient
 * dependency the rule above forbids: `instanceof Error` consults `globalThis.Error` and then its
 * `Symbol.hasInstance`, and `String(x)` consults `globalThis.String`. Both failures are already
 * contained by `describeFailure`'s own guard, so this is closing the stated rule rather than a
 * reachable wrong-answer path — but the rule should be true as written (self-found, separate
 * provenance from K11-R6-STATE-02).
 */
const PrimordialErrorConstructor = Error;
const PrimordialRangeError = RangeError;
const PrimordialString = String;

/** `Map.get` without consulting the (possibly replaced) live prototype method. */
const mapGet = <K, V>(map: Map<K, V>, key: K): V | undefined =>
  PrimordialReflectApply(PrimordialMapGet, map, [key]) as V | undefined;

/** `Map.set` without consulting the (possibly replaced) live prototype method. */
const mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {
  PrimordialReflectApply(PrimordialMapSet, map, [key, value]);
};

/** One refusal issue, appended as own data (see the note above). */
const appendIssue = (target: ValueIssue[], issue: ValueIssue): void => {
  appendOwn(target, issue);
};

/** Every issue of another list, appended as own data and in order. */
const appendIssues = (target: ValueIssue[], extra: readonly ValueIssue[]): void => {
  appendAllOwn(target, extra);
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
  /**
   * This Execution's own acceptance index. Creation consumes 1; each later accepted
   * input-ingress or dispatch-intent decision on this Execution consumes the next.
   * Replay and redelivery consume none: they return an already-accepted decision.
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

const describeFailure = (reason: unknown): string => {
  try {
    if (reason instanceof PrimordialErrorConstructor) {
      // A hostile rejection reason can throw again when `name`/`message` is read. Delivery
      // bookkeeping must never let that second error escape the Kernel boundary.
      let name: unknown;
      let message: unknown;
      try {
        name = reason.name;
        message = reason.message;
      } catch {
        return "delivery failed with an uninspectable reason";
      }
      return `${typeof name === "string" ? name : "Error"}: ${typeof message === "string" ? message : PrimordialString(message)}`;
    }
    return PrimordialString(reason);
  } catch {
    return "delivery failed with an uninspectable reason";
  }
};

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" && value !== null && typeof (value as { then?: unknown }).then === "function";

/**
 * Subscribes to a Driver settlement under sanitized Promise-construction machinery.
 *
 * Captured `resolve`/`then` decide *which function object* runs, but a native `then` still reads
 * *what that function observes*: `SpeciesConstructor` performs `Get(O, "constructor")` and then
 * `Get(C, Symbol.species)` before `PerformPromiseThen` attaches anything. A throwing
 * `Promise[Symbol.species]` getter installed by an earlier caller observation in the same tick
 * therefore makes the attach itself throw before the rejection continuation exists — and the
 * already-rejected Driver promise escapes as process-level unhandled rejection while the attempt
 * is (correctly but incompletely) recorded as failed (K11-R16-DISP-01).
 *
 * This window closes that channel the same way `own-array.ts` closes the list discipline: the
 * two construction slots (`Promise[Symbol.species]`, `Promise.prototype.constructor`) are
 * reinstalled to their primordials, and a caller-installed own `Symbol.species` on
 * `Object.prototype` — which would answer once the Promise-own slot is deleted — is removed, for
 * the synchronous attach only, then everything is restored from its saved descriptor. Saving and
 * restoring go through own-property descriptors, so neither step executes an installed getter.
 * `settled` itself stays host-trusted (it is Driver-supplied); what is sanitized is the ambient
 * machinery that observes it.
 *
 * If the sanitization itself throws — a host that redefined one of these slots as
 * non-configurable — the failure propagates to `#deliver`, which records the operational
 * delivery failure. No in-process code can subscribe on such a host; that permanently disturbed
 * host degrades to a recorded failure, the same availability-only degradation the values module
 * commits to for non-configurable slots (KC1-DEC-5).
 */
function attachSettlementHandlers(settled: PromiseLike<unknown>, attempt: DeliveryAttempt): void {
  // Observation first, through own-property descriptors only: reading what is installed cannot
  // itself execute an installed getter. Nothing is changed yet, so this has nothing to undo.
  const promiseSpecies = PrimordialGetOwnPropertyDescriptor(PrimordialPromise, PrimordialSymbolSpecies);
  const prototypeConstructor = PrimordialGetOwnPropertyDescriptor(PrimordialPromisePrototype, "constructor");
  const objectSpecies = PrimordialGetOwnPropertyDescriptor(PrimordialObjectPrototype, PrimordialSymbolSpecies);
  try {
    defineData(PrimordialPromise, PrimordialSymbolSpecies, PrimordialPromise, true, false, true);
    defineData(PrimordialPromisePrototype, "constructor", PrimordialPromise, true, false, true);
    // No conforming host owns this property; its only possible content is caller-installed.
    if (objectSpecies !== undefined) {
      delete (PrimordialObjectPrototype as Record<string | symbol, unknown>)[PrimordialSymbolSpecies];
    }
    const observed = PrimordialReflectApply(PrimordialPromiseResolve, PrimordialPromise, [settled]);
    void PrimordialReflectApply(PrimordialPromiseThen, observed, [
      () => {
        attempt.status = "delivered";
      },
      (reason: unknown) => {
        attempt.status = "failed";
        attempt.failure = describeFailure(reason);
      },
    ]);
  } finally {
    restoreDescriptor(PrimordialPromise, PrimordialSymbolSpecies, promiseSpecies);
    restoreDescriptor(PrimordialPromisePrototype, "constructor", prototypeConstructor);
    if (objectSpecies !== undefined) {
      restoreDescriptor(PrimordialObjectPrototype, PrimordialSymbolSpecies, objectSpecies);
    }
  }
}

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
const located = (issues: readonly ValueIssue[], label: string): ValueIssue[] => {
  const out: ValueIssue[] = [];
  for (let index = 0; index < issues.length; index += 1) {
    const issue = readAt(issues, index) as ValueIssue;
    // Index read, not `String.prototype.startsWith`: refusal formatting runs after caller
    // observation in the same tick, and the method is caller-replaceable. String indexing is a
    // read of the string's own character position, not an array position, so no prototype is
    // consulted for it.
    const bracketed = issue.path.length > 0 && (issue.path[0] as string) === "[";
    const path = issue.path === "" ? label : bracketed ? `${label}${issue.path}` : `${label}.${issue.path}`;
    appendOwn(out, { ...issue, path });
  }
  return out;
};

/** Renders issues into one reason a person can act on. */
const explain = (issues: readonly ValueIssue[]): string => {
  let out = "";
  for (let index = 0; index < issues.length; index += 1) {
    const issue = readAt(issues, index) as ValueIssue;
    if (index > 0) out += "; ";
    out += `${issue.path} ${issue.code}`;
  }
  return out;
};

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
    // Total classification (K11-R16-ID-01): `Array.isArray` performs `IsArray`, which throws a
    // `TypeError` on a revoked Proxy. The classifier runs on caller-owned values, so that throw
    // must become the same located refusal — never an exception escaping the boundary.
    let received: string;
    try {
      received = value === null ? "null" : PrimordialArrayIsArray(value) ? "array" : typeof value;
    } catch {
      received = "an uninspectable value";
    }
    appendIssue(issues, { path: label, code: "unsupported_form", message: `expected text that can name a request, received ${received}` });
    return false;
  }
  const checked = canonicalize(value);
  if (!checked.ok) {
    appendIssues(issues, located(checked.issues, label));
    return false;
  }
  return true;
}

/**
 * One caller-owned envelope field, observed from the envelope's own data only.
 *
 * The envelope is caller-owned state: on a revoked Proxy, or under a throwing getter, the read
 * itself throws. That failure is a fact *about this field*, so it is recorded as a located
 * `unstable_representation` issue rather than thrown out of the boundary (K11-R16-ID-01).
 *
 * A field the envelope does not own itself is missing — even when a prototype above it would
 * answer. Ordinary reads consult the whole chain, so ambient `Object.prototype`/`Array.prototype`
 * pollution (residue or same-tick trap-installed) would otherwise steer missing fields into
 * acceptances the caller never spelled: `dispatch({})` accepted by an ambient `bound`,
 * `create({})` accepted by ambient identity text, `dispatch([])` answered through the
 * `Array.prototype` chain (R3-BLOCKING). An envelope that carries a field only by inheritance
 * therefore reads exactly as one that omits it (KC1-DEC-6).
 *
 * A `null`/`undefined` holder owns no fields and observes as `undefined`, so the field validator
 * refuses it as malformed rather than the boundary throwing a `TypeError`. A primitive holder
 * likewise owns no text field. An own accessor still runs — a `get bound()` is the allowed caller
 * observation the single-observation rule already accounts for — and its throw maps the same way.
 */
function observeOwn(holder: unknown, key: string): { readonly observed: unknown; readonly threw: boolean } {
  try {
    if (holder === null || holder === undefined) return { observed: undefined, threw: false };
    if (typeof holder !== "object" && typeof holder !== "function") return { observed: undefined, threw: false };
    // Own-descriptor first, never an ordinary read for the existence question: the descriptor
    // reports without invoking anything, and only an owned position may proceed to the read.
    // A Proxy's traps may throw here; that is the same observation failure as a throwing getter.
    if (PrimordialGetOwnPropertyDescriptor(holder, key) === undefined) return { observed: undefined, threw: false };
    // Owned, so the prototype chain is no longer on the path: own data answers directly and an
    // own accessor runs with the holder as receiver — the same single observation as before.
    return { observed: (holder as Record<string, unknown>)[key], threw: false };
  } catch {
    return { observed: undefined, threw: true };
  }
}

function observeField(holder: unknown, key: string, label: string, issues: ValueIssue[]): { readonly observed: unknown; readonly ok: boolean } {
  const seen = observeOwn(holder, key);
  if (seen.threw) {
    appendIssue(issues, { path: label, code: "unstable_representation", message: `request field ${label} could not be observed` });
    return { observed: undefined, ok: false };
  }
  return { observed: seen.observed, ok: true };
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

/** The complete creation content a caller-scoped creation key binds. */
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
  readonly #executions = new PrimordialMap<string, ExecutionRecord>();
  readonly #byCreationKey = new PrimordialMap<string, ExecutionRecord>();
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
    // the caller-scoped key is packed from, so it is held to the same identity-text rule. Both are
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

    const creationKey: CreationKeyId = {
      producerNamespace: caller.namespace,
      scope,
      requestKey: creationKeyText,
    };
    const existing = mapGet(this.#byCreationKey, creationKeyIdKey(creationKey));
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
    // conflict for input it never submitted). The caller-scoped creation key and the Input ID
    // triple are two different scoping constructs in `identity.md`; nothing reserves the
    // creation-key text inside the producer's ingress key space. `byInputId` therefore indexes
    // post-creation ingress entries only, and the initial Event ID derives from the creation key
    // under a prefix no ingress Event ID can carry. Creation retry still resolves through
    // `byCreationKey`; the triple on the entry below is retained creation provenance for
    // inspection, not an ingress address.
    //
    // K11-R12-ID-01: both identities remain pure functions of the request identity that named
    // them — the caller-scoped creation key for the Execution and its initial Event — so neither
    // encodes how many unrelated Executions or Events already exist. Creation is always this
    // Execution's first acceptance, hence position 1; the record below continues its own index
    // at 2.
    const executionId = `execution-${creationKeyIdKey(creationKey)}`;
    const receipt = mintReceipt("creation", 1, executionId);
    const initialInputId: InputId = {
      producerNamespace: caller.namespace,
      destination: executionId,
      requestKey: creationKeyText,
    };
    const eventId = `event-creation-${creationKeyIdKey(creationKey)}`;

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
      creationKey,
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
      nextAcceptancePosition: 2,
      nextRefusalPosition: 1,
      activationsMinted: 0,
    };

    mapSet(this.#executions, executionId, record);
    mapSet(this.#byCreationKey, creationKeyIdKey(creationKey), record);
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
   * `deliver` is called and its result is not awaited. A Driver that never settles holds up nothing:
   * another Execution on this same coordinator dispatches while the first exchange is unresolved.
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
      // A new exchange starts its own attempt ordering. `identity.md` leaves whether the counter
      // resets across Activations to the implementation; only an advance within one unresolved
      // exchange is constrained, and only an authorized takeover may do that. K1.2 owns takeover.
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
   * Hands an Activation to the Driver and returns immediately.
   *
   * A synchronous throw and a rejected promise are both recorded as operational delivery failures.
   * Neither changes accepted state: the intent stands, the Execution stays `RUNNING`, and the same
   * exchange can be redelivered.
   */
  #deliver(intent: ActivationRecord): void {
    const attempt: DeliveryAttempt = { attempt: intent.deliveries.length + 1, status: "pending", failure: null };
    appendOwn(intent.deliveries, attempt);
    try {
      const settled: unknown = this.#driver.deliver(intent.activation);
      if (isThenable(settled)) {
        // Promise machinery through load-time references: a caller-observation side effect earlier
        // in the dispatch tick (e.g. the bound getter) may have replaced global `Promise` or
        // `Promise.prototype.then` before this line runs. `settled` itself is Driver-supplied
        // (host-trusted), but the machinery that observes it must not be caller-steerable, or a
        // throw here would escape dispatch after the intent was already recorded.
        attachSettlementHandlers(settled, attempt);
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
  return PrimordialObjectFreeze(entry.subscriptionClass === null ? base : { ...base, subscriptionClass: entry.subscriptionClass });
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
  const terminalDispositions: string[] = [];
  for (let index = 0; index < record.mailbox.length; index += 1) {
    const entry = readAt(record.mailbox, index) as MailboxEntry;
    appendOwn(mailbox, toMailboxView(entry, isReserved));
    if (entry.disposition.kind === "queued") appendOwn(queued, entry.eventId);
    else if (entry.disposition.kind === "terminal") appendOwn(terminalDispositions, entry.eventId);
  }
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
    mailbox,
    queued,
    // Acknowledgment arrives with Outcome acceptance (K1.2). Nothing in this packet produces one,
    // and reporting an empty list is the truthful answer rather than an omitted field.
    acknowledged: [],
    terminalDispositions,
    refusals: copyOwn(record.refusals),
    receipts: copyOwn(record.receipts),
  };
}
