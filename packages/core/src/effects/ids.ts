/**
 * Effect-side runtime identities.
 *
 * Every one of these is a *generated, stable* identifier minted by the Harness through the id
 * port, never a digest of the payload. That is deliberate: an Effect is a request that happened at
 * a point in time, and two byte-identical requests are two different requests. Making a content
 * hash the identity of an Effect would silently merge them, and would put a non-cryptographic
 * digest in a position where a collision means "someone else's authorization applied to my
 * action". Identity is an id; correlation is persisted; digests are used only where this file says
 * they are, and only for bookkeeping.
 *
 * `CapabilityId` and `ResourceBindingId` are *logical* names. A capability id says which mediated
 * operation class was asked for, a resource binding id says which bound resource it should act on.
 * Neither is a credential, a URL, a connection, or a handle: the executor resolves them behind the
 * port, and nothing that resolves them ever enters a semantic record.
 */

/** One requested Effect. Minted per request, never derived from the payload. */
export type EffectId = string & { readonly __brand: "EffectId" };

/** One runtime-tracked operation whose result has not yet been delivered back to the Execution. */
export type PendingOperationId = string & { readonly __brand: "PendingOperationId" };

/** Logical capability name, e.g. `knowledge.query`. Not a transport, an endpoint, or a tool object. */
export type CapabilityId = string & { readonly __brand: "CapabilityId" };

/** The operation being asked of a capability, e.g. `search`. Kept separate so policy can narrow it. */
export type OperationId = string & { readonly __brand: "OperationId" };

/** Logical name of a bound resource, e.g. `knowledge://project-papers`. Never a credential. */
export type ResourceBindingId = string & { readonly __brand: "ResourceBindingId" };

/**
 * Bookkeeping key for duplicate-suppression.
 *
 * Explicitly *not* a security primitive and never an authority binding: it exists so the runtime
 * can recognise "this is the same logical operation I already ran" and replay the authoritative
 * outcome instead of causing a second external effect. See `payloadFingerprint`.
 */
export type IdempotencyKey = string & { readonly __brand: "IdempotencyKey" };

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}$/;

export function isCapabilityId(value: unknown): value is CapabilityId {
  return typeof value === "string" && NAME_PATTERN.test(value);
}

export function capabilityId(value: string): CapabilityId {
  if (!isCapabilityId(value)) throw new TypeError(`invalid capability id ${JSON.stringify(value)}`);
  return value;
}

export function isOperationId(value: unknown): value is OperationId {
  return typeof value === "string" && NAME_PATTERN.test(value);
}

export function operationId(value: string): OperationId {
  if (!isOperationId(value)) throw new TypeError(`invalid operation id ${JSON.stringify(value)}`);
  return value;
}

export function isResourceBindingId(value: unknown): value is ResourceBindingId {
  return typeof value === "string" && NAME_PATTERN.test(value);
}

export function resourceBindingId(value: string): ResourceBindingId {
  if (!isResourceBindingId(value)) throw new TypeError(`invalid resource binding id ${JSON.stringify(value)}`);
  return value;
}

export const EFFECT_ID_PREFIXES = {
  effect: "eff",
  pendingOperation: "pop",
} as const;
