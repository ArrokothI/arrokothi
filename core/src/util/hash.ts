/**
 * Small, dependency-free content hashing.
 *
 * Used for idempotency keys, pending-action payload identity, and definition hashes - all of which
 * need stability and practical collision-resistance, not cryptographic strength. Deliberately pure
 * JS so `core` stays importable in any JS runtime (no `node:crypto`).
 */

/** Canonical JSON: object keys sorted recursively, so `{a,b}` and `{b,a}` hash identically. */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** FNV-1a, 32-bit, with a configurable offset basis so we can cheaply build a wider digest. */
function fnv1a(input: string, basis: number): number {
  let h = basis >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const hex8 = (n: number) => n.toString(16).padStart(8, "0");

/** 64-bit-equivalent hex digest of a string. Two independent bases reduce accidental collisions. */
export function hashString(input: string): string {
  return hex8(fnv1a(input, 0x811c9dc5)) + hex8(fnv1a(`${input.length} ${input}`, 0x9e3779b1));
}

/** Stable hash of any JSON value. Argument order and key order never change the result. */
export function hashValue(value: unknown): string {
  return hashString(canonicalJson(value));
}
