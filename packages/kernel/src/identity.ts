/**
 * Scoped identities and per-boundary receipts.
 *
 * `mental-model/concepts/identity.md` owns these terms. The rule this module exists to make
 * structural rather than conventional is that **"same request" always needs a scope**: a request key
 * is caller-chosen text, so the thing the Kernel compares is never that text alone.
 *
 * Nothing here reads a principal from a payload. An `AuthenticatedCaller` is supplied by the host's
 * authentication boundary as a separate argument, and no request type in this package has a field
 * that could carry one; a payload member spelled `producer` is ordinary content.
 */

/**
 * The authenticated caller, as the host's authentication boundary established it.
 *
 * `namespace` is the trusted producer namespace: the first member of an Input ID and the scope of a
 * creation key. `scopes` are the authority scopes this caller may reach; an Execution is bound to
 * exactly one at creation, and a caller outside it cannot see the Execution at all.
 *
 * `controlScopes` is the separate control power `evidence.md` requires: inspection privilege does
 * not grant re-execution or settlement privilege. A caller may inspect an Execution it can reach
 * through `scopes`, but the three K1.2 exchange controls (takeover, recovery declaration,
 * protocol-failure report) additionally require the Execution's scope in `controlScopes`. Absent
 * (or not containing the scope) means inspect-only: the caller can read but cannot enter/clear
 * holds or supersede an attempt. This is the in-process binding's Kernel-enforced distinction
 * (K1.2-DEC-14); it introduces no universal token format or remote policy backend, which stay
 * K2's (`authority.md`). Like `scopes`, this list is a trusted host input, not caller-observed
 * state.
 */
export interface AuthenticatedCaller {
  readonly namespace: string;
  readonly scopes: readonly string[];
  readonly controlScopes?: readonly string[];
}

/**
 * An Input ID: authenticated producer namespace, destination Execution ID, producer request key.
 *
 * "Two producers can use the text `17` without colliding; the same producer sending `17` to two
 * Executions also names different inputs."
 */
export interface InputId {
  readonly producerNamespace: string;
  readonly destination: string;
  readonly requestKey: string;
}

/**
 * A Creation request ID: the same retry idea before an Execution exists.
 *
 * No destination Execution exists yet. The producer namespace comes from authentication; `scope`
 * is the selected creation authority scope, and `requestKey` is the caller's creation-key text.
 */
export interface CreationRequestId {
  readonly producerNamespace: string;
  readonly scope: string;
  readonly requestKey: string;
}

/**
 * Load-time `Object.freeze`: receipts are minted after caller-owned values have been observed,
 * and a capture-time side effect can replace the global before the mint runs. The runtime
 * immutability claim (K11-R2-EVID-01) must not depend on that global.
 */
const PrimordialObjectFreeze = Object.freeze;

/**
 * Load-time `TypeError`: `packIdentity` raises on a non-text part *after* caller-owned values have
 * been observed in the same tick, so reading the live constructor there would let a capture-time
 * side effect decide what the boundary throws (self-found alongside K11-R6-STATE-02).
 */
const PrimordialTypeError = TypeError;

/**
 * Keys for the Kernel's own lookup tables, and for comparing multi-part content identities.
 *
 * Each part is length-prefixed rather than joined with a separator, so no choice of caller text can
 * make two different identities collide: `("ab", "c")` and `("a", "bc")` produce different keys
 * whatever characters they contain. Identity comparison is over the parts; this is only their
 * storage spelling.
 *
 * Built with an index loop and string concatenation, not `Array.prototype.map`/`join`: identity
 * is packed after caller observation in the same tick, and a capture-time side effect can replace
 * those prototype methods before packing runs. Packing must be a function only of the parts.
 *
 * `parts` is always a list the Kernel builds as an array literal at the call site, so its elements
 * are own data installed with `CreateDataPropertyOrThrow` rather than `[[Set]]`, and these reads
 * reach no prototype. That is why packing needs no `own-array.ts` read here; a list the Kernel
 * *grows* after construction does (K11-R6-STATE-02).
 */
export const packIdentity = (parts: readonly string[]): string => {
  let out = "";
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] as string;
    // The length prefix is what makes the packing injective, and it only means anything for text.
    // A non-string part would stringify to something like `[object Object]` with an undefined
    // length, so two different parts could pack identically and one request could be mistaken for
    // another. Every caller-supplied identity part is refused as a malformed value before it
    // reaches here; a part arriving from the host's trusted authentication boundary that is not
    // text is a programming error at that boundary, and is raised as one rather than silently
    // producing a colliding key (K11-R3-ID-02).
    if (typeof part !== "string") {
      throw new PrimordialTypeError(`identity parts must be text; received ${part === null ? "null" : typeof part}`);
    }
    out += `${part.length}:${part}`;
  }
  return out;
};

export const inputIdKey = (id: InputId): string => packIdentity([id.producerNamespace, id.destination, id.requestKey]);
export const creationRequestIdKey = (id: CreationRequestId): string => packIdentity([id.producerNamespace, id.scope, id.requestKey]);

/**
 * The acceptance boundaries this package implements.
 *
 * `identity.md` names six receipt scopes. K1.1 built creation/input ingress (two members here,
 * because the creation receipt also covers the initial input) and dispatch intent; K1.2 adds Outcome
 * acceptance. The other three belong to boundaries no packet has built yet - Effect admission and
 * settlement are K2's, child and message operations are K4's - so this union has no placeholder for
 * them. An authorized takeover re-records the dispatch intent's current attempt and is receipted at
 * that boundary rather than inventing a seventh (K1.2-DEC-6).
 */
export type ReceiptBoundary = "creation" | "input_ingress" | "dispatch_intent" | "outcome_acceptance";

/**
 * Evidence that one specific request was accepted at one named boundary.
 *
 * "There is no single receipt per Execution." The token carries its boundary, so a receipt from one
 * boundary can never be mistaken for, or compare equal to, a receipt from another.
 *
 * `readonly` here is a compile-time claim only. The runtime claim — that this is *retained* evidence
 * the Kernel can still return unchanged on a later replay — is held by `mintReceipt` freezing every
 * receipt at the one place receipts are created. See its note.
 */
export interface Receipt {
  readonly boundary: ReceiptBoundary;
  /** Opaque to callers; its spelling is implementation-owned. */
  readonly token: string;
  /**
   * This Execution's acceptance position, which orders accepted facts within it.
   *
   * `identity.md` is explicit that an acceptance position orders accepted facts within the
   * owning record/domain and is not a global clock. A receipt's position is therefore the
   * owning Execution's own acceptance index — creation is 1, each later accepted boundary on
   * that Execution consumes the next — and carries no information about decisions on any other
   * Execution. Two receipts on different Executions may hold the same numeric position without
   * naming the same decision; the token below keeps them distinct.
   */
  readonly position: number;
}

const BOUNDARY_PREFIX: Record<ReceiptBoundary, string> = {
  creation: "crt",
  input_ingress: "inp",
  dispatch_intent: "dsp",
  outcome_acceptance: "out",
};

/**
 * The one place a receipt comes into existence, and the one place its immutability is established.
 *
 * `identity.md` calls a receipt "retained evidence that one specific request was accepted", and
 * K1.1-C6 requires exact replay to return *the original* token. The Kernel keeps one receipt object
 * per accepted decision and hands that same object to the caller, stores it on the Execution record,
 * attaches it to the mailbox entry or Activation it accepted, and returns it again on every later
 * replay and inspection. Copying it at each of those exits would be several places to forget; a
 * receipt that cannot be edited at all is one place to get right, and it keeps receipt identity
 * (`===`) meaningful for a replay that must return the same evidence rather than an equal-looking
 * reconstruction.
 *
 * Without this, ordinary JavaScript could cast away `readonly`, edit a returned receipt's token, and
 * have the Kernel's own later replay and inspection report the edited value as the decision it had
 * retained (K11-R2-EVID-01).
 *
 * K11-R12-ID-01: the token and the position together must not encode a coordinator-global order.
 * A previous revision minted `token` as `prefix:globalPosition` off one coordinator-wide counter
 * shared with refusals, so one principal's own receipt disclosed how many decisions had happened
 * in scopes it cannot observe. The token is therefore `prefix:owningExecution:position`: a pure
 * function of the owning Execution's identity and that Execution's own acceptance index. It is
 * unique per accepted decision — no two receipts on one Execution share a position, and no two
 * Executions share an identity — while revealing nothing about any other Execution's activity.
 */
export const mintReceipt = (boundary: ReceiptBoundary, position: number, executionId: string): Receipt =>
  PrimordialObjectFreeze({
    boundary,
    token: `${BOUNDARY_PREFIX[boundary]}:${executionId}:${position}`,
    position,
  });

/** Whether the caller may reach Executions bound to `scope`.
 *
 * `caller` arrives from the host's authentication boundary, not from a request payload, so its
 * scope list is a trusted input rather than caller-observed state; these are ordinary reads of it.
 *
 * Full scan with no early exit: work depends only on `caller.scopes.length`, never on where a
 * match sits. `Array.prototype.includes` would return early on a match, so a hidden record whose
 * scope matches early would cost less than a missing one that scans everything. Scanning all
 * entries keeps hidden and missing lookups on the same control path for the same caller.
 * This normalizes application-level lookup work; it does not claim cryptographic constant-time
 * string comparison or hash-table timing, which JavaScript does not provide.
 */
export const mayReachScope = (caller: AuthenticatedCaller, scope: string): boolean => {
  let allowed = false;
  for (let index = 0; index < caller.scopes.length; index += 1) {
    if (caller.scopes[index] === scope) allowed = true;
  }
  return allowed;
};

/**
 * Sentinel scope naming no Execution, for normalizing missing-lookup work.
 *
 * Scopes bound at creation are validated boundary values, so they are well-formed Unicode.
 * This sentinel contains lone surrogates and can never equal a bound scope, nor any
 * well-formed caller scope a host supplies. Scanning for it costs the same number of
 * comparisons as scanning for a hidden record's scope with the same caller.
 */
export const MISSING_SCOPE_SENTINEL = "\ud800missing\udc00";
