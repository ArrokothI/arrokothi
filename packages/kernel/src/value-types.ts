/** Kernel-owned, deeply frozen JSON values. Inputs cross the core as canonical UTF-8 bytes. */
export type BoundaryValue = null | boolean | number | string | readonly BoundaryValue[] | { readonly [key: string]: BoundaryValue };

export const BOUNDARY_LIMITS = Object.freeze({
  stringScalarValues: 65_536,
  containerEntries: 4_096,
  containerDepth: 32,
  canonicalBytes: 1_048_576,
} as const);

export type ValueIssueCode =
  | "unsupported_form" | "non_finite_number" | "lone_surrogate" | "unstable_representation"
  | "string_too_long" | "too_many_entries" | "too_deep" | "too_many_bytes"
  | "invalid_utf8" | "invalid_json" | "duplicate_key" | "non_canonical" | "transport_too_large";
export interface ValueIssue {
  readonly path: string;
  readonly code: ValueIssueCode;
  readonly message: string;
  readonly occurrences?: number;
}

/** Internal only: no reader exposes this record or its owned buffer. */
export interface CanonicalValue {
  readonly bytes: Uint8Array;
  readonly value: BoundaryValue;
  readonly canonical: string;
  readonly canonicalBytes: number;
}
export type ValueAcceptance<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly issues: readonly ValueIssue[] };
