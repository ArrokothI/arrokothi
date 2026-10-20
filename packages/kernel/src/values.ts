/** Core value admission: own the bytes, validate exact canonical form, retain the owned parse. */
import { copyByteInput, parseOwnedBytes } from "./canonical-bytes.ts";
import { BOUNDARY_LIMITS, type BoundaryValue, type CanonicalValue, type ValueAcceptance } from "./value-types.ts";
const PrimordialFreeze = Object.freeze;
export { BOUNDARY_LIMITS } from "./value-types.ts";
export type { BoundaryValue, CanonicalValue, ValueIssue, ValueIssueCode } from "./value-types.ts";
export { isProxyValue, identityTextIssue } from "./canonical-bytes.ts";

/** Internal owned record. Call immediately after observing a byte root, before another getter. */
export function acceptCanonicalBytes(input: unknown): ValueAcceptance<CanonicalValue> {
  const copied = copyByteInput(input, BOUNDARY_LIMITS.canonicalBytes);
  return copied.ok ? parseOwnedBytes(copied.value, true) : copied;
}

/** The private package's byte API exposes only the deeply frozen parsed value, never its buffer. */
export function validateCanonicalBytes(input: Uint8Array): ValueAcceptance<BoundaryValue> {
  const accepted = acceptCanonicalBytes(input);
  return accepted.ok ? PrimordialFreeze({ ok: true, value: accepted.value.value }) : accepted;
}
