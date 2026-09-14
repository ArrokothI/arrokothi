/**
 * Boundary values: validity, canonical form, logical equality and the four semantic limits.
 *
 * `mental-model/concepts/values.md` owns these rules; this module implements them and nothing else.
 * It exists because every identity decision in this package — "is this creation retry the same
 * request?", "is this input an exact replay or a conflict?" — is a question about *logical* value
 * equality, and that question has exactly one accepted answer: the canonical bytes are equal.
 *
 * Three properties are deliberate and are the reason this is one module rather than a helper:
 *
 * 1. **Validation runs before equality, never after.** A non-finite number, a lone surrogate or a
 *    class instance is rejected at the boundary; it is never coerced to `null`, `"NaN"` or U+FFFD
 *    and then compared. A repaired value compares equal to something the caller did not send.
 * 2. **Nothing is silently dropped.** A member whose value is `undefined`, a symbol-keyed member and
 *    a non-enumerable own property are all *rejected*, not skipped. Skipping them would make two
 *    different caller intentions canonicalize identically, which is the same failure class as
 *    repairing a bad scalar.
 * 3. **Each root is measured on its own.** `values.md`: "Two sibling roots of 700 KiB each are not
 *    rejected solely because their envelope exceeds 1 MiB." Callers pass one root at a time.
 *
 * K1.0 assigned `packages/core/src/util/json.ts` to this packet as `DX-2` (migratable). It is not
 * extracted. The legacy `canonicalJson` in `packages/core/src/util/hash.ts` is an
 * almost-equivalent serializer, not this contract: it maps `undefined` to `null`, accepts non-finite
 * numbers through `JSON.stringify`, applies none of the four limits and rejects no invalid value.
 * Adopting it would import exactly the behaviour rule 1 above forbids.
 *
 * `values.md` says to prefer an unmodified conforming JCS implementation over an almost-equivalent
 * serializer. The target zone may not add a third-party package without an owner decision under
 * AGENTS.md's third-party review, so this implementation is written directly against `values.md`'s
 * own stated rules and worked examples, behind this one module so a later approved dependency can
 * replace it without touching a caller. That open decision is K1.1-OPEN-2 in the packet contract.
 */

import { Buffer } from "node:buffer";

/** A value that may cross a Kernel boundary. `values.md`: "Boundary value and root". */
export type BoundaryValue = null | boolean | number | string | BoundaryValue[] | { [key: string]: BoundaryValue };

/** `values.md`, "Fixed semantic limits". All four apply together. */
export const BOUNDARY_LIMITS = {
  /** Unicode scalar values per individual decoded string value or object member name. */
  stringScalarValues: 65_536,
  /** Direct children of one array or one object. */
  containerEntries: 4_096,
  /** Recursive depth of each root: scalar 0, empty container 1, otherwise 1 + max(child). */
  containerDepth: 32,
  /** Canonical UTF-8 bytes of each root, measured independently of its siblings. */
  canonicalBytes: 1_048_576,
} as const;

export type ValueIssueCode =
  /** Not one of the six boundary forms: `undefined`, a symbol, a function, a class instance, … */
  | "unsupported_form"
  /** `NaN`, `Infinity` or `-Infinity`. */
  | "non_finite_number"
  /** An unpaired UTF-16 surrogate, which has no UTF-8 encoding. */
  | "lone_surrogate"
  /** The value refers to itself, directly or through a chain. */
  | "cycle"
  /** A member that is present but carries no value; an absent member must actually be absent. */
  | "undefined_member"
  /** A symbol-keyed or non-enumerable own property, which canonical form cannot represent. */
  | "unrepresentable_member"
  | "string_too_long"
  | "too_many_entries"
  | "too_deep"
  | "too_many_bytes";

/** One reason a value is not an acceptable boundary value, located within that value. */
export interface ValueIssue {
  /** Dotted/bracketed path from the root; `""` is the root itself. */
  readonly path: string;
  readonly code: ValueIssueCode;
  readonly message: string;
}

/** A validated root together with its canonical form. Equality compares `canonical`. */
export interface CanonicalValue {
  /** A frozen structural copy, so accepted content cannot be edited through the caller's reference. */
  readonly value: BoundaryValue;
  /** RFC 8785/JCS bytes as a JavaScript string; `canonicalBytes` is its UTF-8 length. */
  readonly canonical: string;
  readonly canonicalBytes: number;
}

const describe = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") {
    const name = (value as object).constructor?.name;
    return name !== undefined && name !== "Object" ? `${name} instance` : "object";
  }
  return typeof value;
};

const child = (path: string, key: string): string => (path === "" ? key : `${path}.${key}`);
const element = (path: string, index: number): string => `${path}[${index}]`;

/**
 * Whether a string is well-formed Unicode.
 *
 * `values.md` rejects lone surrogates rather than repairing them, so this is written out rather than
 * taken from `String.prototype.isWellFormed`, which is newer than the `ES2023` library this
 * repository compiles against. A high surrogate must be followed by a low one and a low surrogate
 * must never appear alone; every other code unit is fine.
 */
function isWellFormed(input: string): boolean {
  for (let index = 0; index < input.length; index += 1) {
    const unit = input.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < input.length ? input.charCodeAt(index + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

/** Unicode scalar values, which is what the string limit counts — not UTF-16 code units. */
const scalarValueCount = (input: string): number => {
  let count = 0;
  for (const _ of input) count += 1;
  return count;
};

interface WalkState {
  readonly issues: ValueIssue[];
  readonly open: Set<object>;
}

/**
 * One pass that validates structure, strings, numbers and all three structural limits.
 *
 * `level` counts the containers entered on the path to this value, so the root container is level 1
 * and `values.md`'s depth is the greatest level any path reaches. Descent stops one level past the
 * limit: a value nested ten thousand deep is reported as too deep rather than exhausting the stack.
 */
function walk(value: unknown, path: string, level: number, state: WalkState): void {
  if (value === null) return;

  const type = typeof value;
  if (type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value)) {
      state.issues.push({ path, code: "non_finite_number", message: `expected a finite number, received ${String(value)}` });
    }
    return;
  }
  if (type === "string") {
    const text = value as string;
    if (!isWellFormed(text)) {
      state.issues.push({ path, code: "lone_surrogate", message: "string contains an unpaired surrogate and has no UTF-8 encoding" });
      return;
    }
    const length = scalarValueCount(text);
    if (length > BOUNDARY_LIMITS.stringScalarValues) {
      state.issues.push({
        path,
        code: "string_too_long",
        message: `string is ${length} Unicode scalar values, above the limit of ${BOUNDARY_LIMITS.stringScalarValues}`,
      });
    }
    return;
  }
  if (type !== "object") {
    state.issues.push({ path, code: "unsupported_form", message: `expected a boundary value, received ${describe(value)}` });
    return;
  }

  const container = value as object;
  if (state.open.has(container)) {
    state.issues.push({ path, code: "cycle", message: "value refers to itself and has no canonical form" });
    return;
  }

  const entered = level + 1;
  if (entered > BOUNDARY_LIMITS.containerDepth) {
    state.issues.push({
      path,
      code: "too_deep",
      message: `container nesting passes the depth limit of ${BOUNDARY_LIMITS.containerDepth}`,
    });
    return;
  }

  state.open.add(container);
  try {
    if (Array.isArray(container)) {
      // An array carrying extra own properties (`a = [1]; a.tag = "x"`) would canonicalize as if
      // they were not there. Reject it rather than drop them.
      const extra = Object.getOwnPropertyNames(container).filter((name) => name !== "length" && !/^\d+$/.test(name));
      if (extra.length > 0 || Object.getOwnPropertySymbols(container).length > 0) {
        state.issues.push({ path, code: "unrepresentable_member", message: "array has own members outside its indices, which canonical form would silently drop" });
      }
      if (container.length > BOUNDARY_LIMITS.containerEntries) {
        state.issues.push({
          path,
          code: "too_many_entries",
          message: `array has ${container.length} entries, above the limit of ${BOUNDARY_LIMITS.containerEntries}`,
        });
      }
      for (let index = 0; index < container.length; index += 1) {
        const item = container[index];
        if (item === undefined) {
          state.issues.push({ path: element(path, index), code: "undefined_member", message: "array element is undefined; an array has no absent positions" });
          continue;
        }
        walk(item, element(path, index), entered, state);
      }
      return;
    }

    const prototype = Object.getPrototypeOf(container);
    if (prototype !== Object.prototype && prototype !== null) {
      state.issues.push({ path, code: "unsupported_form", message: `expected a plain object, received ${describe(container)}` });
      return;
    }
    if (Object.getOwnPropertySymbols(container).length > 0) {
      state.issues.push({ path, code: "unrepresentable_member", message: "object has symbol-keyed members, which canonical form cannot represent" });
    }
    const names = Object.getOwnPropertyNames(container);
    const enumerable = Object.keys(container);
    if (names.length !== enumerable.length) {
      state.issues.push({ path, code: "unrepresentable_member", message: "object has non-enumerable own members, which canonical form would silently drop" });
    }
    if (enumerable.length > BOUNDARY_LIMITS.containerEntries) {
      state.issues.push({
        path,
        code: "too_many_entries",
        message: `object has ${enumerable.length} members, above the limit of ${BOUNDARY_LIMITS.containerEntries}`,
      });
    }
    for (const key of enumerable) {
      if (!isWellFormed(key)) {
        state.issues.push({ path: child(path, key), code: "lone_surrogate", message: "member name contains an unpaired surrogate" });
        continue;
      }
      const nameLength = scalarValueCount(key);
      if (nameLength > BOUNDARY_LIMITS.stringScalarValues) {
        state.issues.push({
          path: child(path, key),
          code: "string_too_long",
          message: `member name is ${nameLength} Unicode scalar values, above the limit of ${BOUNDARY_LIMITS.stringScalarValues}`,
        });
      }
      const member = (container as Record<string, unknown>)[key];
      if (member === undefined) {
        state.issues.push({
          path: child(path, key),
          code: "undefined_member",
          message: "member is present with no value; omit the member instead, since absent and null are different values",
        });
        continue;
      }
      walk(member, child(path, key), entered, state);
    }
  } finally {
    state.open.delete(container);
  }
}

const ESCAPES = new Map<number, string>([
  [0x08, "\\b"],
  [0x09, "\\t"],
  [0x0a, "\\n"],
  [0x0c, "\\f"],
  [0x0d, "\\r"],
]);

/**
 * `values.md` rule 4: escape quote, backslash and C0 controls, with the five named escapes and
 * lowercase `\u00xx` for the rest. `/` and every other scalar value is emitted directly.
 */
function encodeString(input: string): string {
  let out = '"';
  for (const character of input) {
    const code = character.codePointAt(0) as number;
    if (character === '"') out += '\\"';
    else if (character === "\\") out += "\\\\";
    else if (code <= 0x1f) {
      const named = ESCAPES.get(code);
      out += named ?? `\\u${code.toString(16).padStart(4, "0")}`;
    } else out += character;
  }
  return `${out}"`;
}

/**
 * `values.md` rule 5: ECMA-262 `Number::toString`, the shortest round-trip spelling RFC 8785 adopts.
 * JavaScript's own string conversion *is* that algorithm, which is why the page's examples — `-0`
 * becoming `0`, `1e21` becoming `1e+21`, `1e-6` becoming `0.000001` — need no special cases here.
 */
const encodeNumber = (value: number): string => String(value);

/** Rule 3: member names sort as unsigned UTF-16 code-unit sequences, independent of locale. */
const byCodeUnit = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

function encode(value: BoundaryValue): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return encodeNumber(value);
    case "string":
      return encodeString(value);
    default:
      break;
  }
  if (Array.isArray(value)) return `[${value.map(encode).join(",")}]`;
  const names = Object.keys(value).sort(byCodeUnit);
  return `{${names.map((name) => `${encodeString(name)}:${encode((value as Record<string, BoundaryValue>)[name] as BoundaryValue)}`).join(",")}}`;
}

/** Every reason `value` is not an acceptable boundary value root. Empty means it is one. */
export function boundaryValueIssues(value: unknown): ValueIssue[] {
  const state: WalkState = { issues: [], open: new Set() };
  walk(value, "", 0, state);
  if (state.issues.length > 0) return state.issues;

  const canonical = encode(value as BoundaryValue);
  const bytes = Buffer.byteLength(canonical, "utf8");
  if (bytes > BOUNDARY_LIMITS.canonicalBytes) {
    return [
      {
        path: "",
        code: "too_many_bytes",
        message: `canonical form is ${bytes} bytes, above the per-root limit of ${BOUNDARY_LIMITS.canonicalBytes}`,
      },
    ];
  }
  return [];
}

/** Whether `value` is an acceptable boundary value root. */
export const isBoundaryValue = (value: unknown): value is BoundaryValue => boundaryValueIssues(value).length === 0;

/**
 * Validates one root and returns it with its canonical form, or every reason it was refused.
 *
 * The returned object is what identity decisions compare: two requests carry the same logical value
 * exactly when their `canonical` strings are equal.
 */
export function canonicalize(value: unknown): { readonly ok: true; readonly value: CanonicalValue } | { readonly ok: false; readonly issues: ValueIssue[] } {
  const issues = boundaryValueIssues(value);
  if (issues.length > 0) return { ok: false, issues };
  const canonical = encode(value as BoundaryValue);
  return {
    ok: true,
    value: { value: sealBoundaryValue(value as BoundaryValue), canonical, canonicalBytes: Buffer.byteLength(canonical, "utf8") },
  };
}

/**
 * A frozen structural copy of an already-validated root.
 *
 * Accepted content is immutable, and a caller keeps a reference to the object it passed in. Without
 * this, an application could edit an accepted Event's payload after acceptance - or an observer could
 * edit it through an inspection view - while the canonical bytes that decided its identity stayed the
 * same. The copy is taken once, at the boundary that accepts the value.
 */
export function sealBoundaryValue(value: BoundaryValue): BoundaryValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return Object.freeze(value.map(sealBoundaryValue)) as unknown as BoundaryValue[];
  const sealed: Record<string, BoundaryValue> = {};
  for (const name of Object.keys(value)) sealed[name] = sealBoundaryValue((value as Record<string, BoundaryValue>)[name] as BoundaryValue);
  return Object.freeze(sealed);
}

/**
 * Whether two already-validated roots are the same logical value.
 *
 * `values.md`: "Two values are equal exactly when their canonical bytes are equal." Key order is not
 * semantic, array order is, and an absent member differs from an explicit null.
 */
export const sameLogicalValue = (left: CanonicalValue, right: CanonicalValue): boolean => left.canonical === right.canonical;
