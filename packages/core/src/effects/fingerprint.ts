/**
 * Payload fingerprints, and what they are not.
 *
 * The runtime needs a way to say "this is the same logical operation I already performed" so a
 * repeated request replays the authoritative outcome instead of causing a second external effect.
 * That is ordinary deterministic bookkeeping, and this module provides it.
 *
 * It is **not** a security primitive. `hashValue` is a 64-bit-equivalent FNV digest: stable and
 * cheap, with no collision resistance against an adversary who is trying to produce one. So the
 * meaning of a fingerprint here is strictly:
 *
 *   two requests with the same fingerprint are *probably* the same request
 *
 * and never:
 *
 *   this fingerprint proves the payload the user authorized
 *   this fingerprint is the identity of an Effect
 *   this fingerprint binds consent to a payload
 *
 * Effect identity is an `EffectId` minted by the id port and persisted with the request record.
 * When a later slice needs a digest that survives an adversary - exact-payload confirmation
 * binding, for example - it must introduce a reviewed collision-resistant mechanism behind its own
 * port rather than promoting this helper.
 */

import { hashValue } from "../util/hash.ts";
import type { JsonValue } from "../util/json.ts";
import type { CapabilityId, IdempotencyKey, OperationId } from "./ids.ts";
import type { ExecutionId } from "../execution/ids.ts";
import type { EffectId } from "./ids.ts";

/** How aggressively repeated requests should be recognised as the same logical operation. */
export type EffectIdempotencyScope =
  /** Every request is its own operation. The key is the EffectId, so nothing is ever suppressed. */
  | "none"
  /** Same Execution + capability + operation + payload is one logical operation. */
  | "per_input";

export function isEffectIdempotencyScope(value: unknown): value is EffectIdempotencyScope {
  return value === "none" || value === "per_input";
}

/**
 * Non-cryptographic digest of a request payload, used only for duplicate recognition.
 *
 * Named so that no call site can read it as proof of anything.
 */
export function payloadFingerprint(value: JsonValue): string {
  return hashValue(value);
}

export interface IdempotencyKeyInput {
  readonly scope: EffectIdempotencyScope;
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  readonly capability: CapabilityId;
  readonly operation: OperationId;
  readonly input: JsonValue;
}

/**
 * Builds the duplicate-suppression key.
 *
 * `none` returns a key containing the unique EffectId, which by construction can never collide with
 * an earlier operation - "no idempotency" is expressed as a unique key rather than as a special
 * case scattered through the processor.
 */
export function effectIdempotencyKey(input: IdempotencyKeyInput): IdempotencyKey {
  if (input.scope === "none") return `effect:${input.effectId}` as IdempotencyKey;
  return `per_input:${input.executionId}:${input.capability}:${input.operation}:${payloadFingerprint(input.input)}` as IdempotencyKey;
}
