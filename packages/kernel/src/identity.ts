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
 */
export interface AuthenticatedCaller {
  readonly namespace: string;
  readonly scopes: readonly string[];
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
 * A caller-scoped creation key: the same retry idea before an Execution exists.
 *
 * The destination member of an Input ID has no value yet, so the scope is the authenticated caller
 * namespace together with the authority scope the creation asks for.
 */
export interface CreationKeyId {
  readonly producerNamespace: string;
  readonly scope: string;
  readonly requestKey: string;
}

/**
 * Keys for the Kernel's own lookup tables, and for comparing multi-part content identities.
 *
 * Each part is length-prefixed rather than joined with a separator, so no choice of caller text can
 * make two different identities collide: `("ab", "c")` and `("a", "bc")` produce different keys
 * whatever characters they contain. Identity comparison is over the parts; this is only their
 * storage spelling.
 */
export const packIdentity = (parts: readonly string[]): string => parts.map((part) => `${part.length}:${part}`).join("");

export const inputIdKey = (id: InputId): string => packIdentity([id.producerNamespace, id.destination, id.requestKey]);
export const creationKeyIdKey = (id: CreationKeyId): string => packIdentity([id.producerNamespace, id.scope, id.requestKey]);

/**
 * The acceptance boundaries this packet implements.
 *
 * `identity.md` names six receipt scopes. Three of them belong to boundaries no accepted packet has
 * built - Outcome acceptance is K1.2's, Effect admission and settlement are K2's, child and message
 * operations are K4's - so this union has three members rather than a placeholder for each.
 */
export type ReceiptBoundary = "creation" | "input_ingress" | "dispatch_intent";

/**
 * Evidence that one specific request was accepted at one named boundary.
 *
 * "There is no single receipt per Execution." The token carries its boundary, so a receipt from one
 * boundary can never be mistaken for, or compare equal to, a receipt from another.
 */
export interface Receipt {
  readonly boundary: ReceiptBoundary;
  /** Opaque to callers; its spelling is implementation-owned. */
  readonly token: string;
  /** This coordinator's acceptance position, which orders accepted facts within it. */
  readonly position: number;
}

const BOUNDARY_PREFIX: Record<ReceiptBoundary, string> = {
  creation: "crt",
  input_ingress: "inp",
  dispatch_intent: "dsp",
};

export const mintReceipt = (boundary: ReceiptBoundary, position: number): Receipt => ({
  boundary,
  token: `${BOUNDARY_PREFIX[boundary]}:${position}`,
  position,
});

/** Whether the caller may reach Executions bound to `scope`. */
export const mayReachScope = (caller: AuthenticatedCaller, scope: string): boolean => caller.scopes.includes(scope);
