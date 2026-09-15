/**
 * Boundary values: validity, canonical form, logical equality and the four semantic limits.
 *
 * `mental-model/concepts/values.md` owns these rules; this module implements them and nothing else.
 * It exists because every identity decision in this package — "is this creation retry the same
 * request?", "is this input an exact replay or a conflict?" — is a question about *logical* value
 * equality, and that question has exactly one accepted answer: the canonical bytes are equal.
 *
 * ## The one invariant this module exists to hold
 *
 * **One observation, one value.** Each position of a caller's object is observed once, during a
 * single capture pass — one own-property descriptor, and one ordinary read that must agree with it.
 * That pass produces an immutable structural snapshot, and *everything afterwards is derived from
 * the snapshot*: the issues that refuse it, the canonical bytes that decide its identity, the
 * content the Kernel retains, what inspection exposes, and what an Activation carries. The caller's
 * object is never consulted again.
 *
 * This is stronger than "copy the value somewhere". The previous shape of this module validated the
 * caller's object in one pass, canonicalized *the caller's object* in a second, and copied it in a
 * third. Three passes over one JavaScript object need not see the same thing: an ordinary array
 * `Proxy` can make indexed reads and own data descriptors disagree, so validation could accept `2`,
 * the JCS implementation could bind canonical `[2]`, and the retained copy could hold `[1]`
 * (K11-R2-VAL-02). Identity then named a value nobody retained. Capturing once removes the class,
 * not one example of it: after the capture pass there is no second reading of caller-owned state to
 * disagree with.
 *
 * Coherence alone would still let an exotic representation be *normalized* into a plain snapshot, and
 * `values.md` says to reject unsupported values rather than repair them. So the capture pass also
 * refuses any container whose own data descriptor and ordinary property read disagree, whose array
 * position is supplied by anything other than an own data property, or whose structure cannot be
 * observed at all (a trap that throws). Those are `unstable_representation`, `undefined_member` and
 * `unsupported_form` refusals, not repairs, and they are stated structurally rather than by naming
 * `Proxy`: nothing here tests for a particular exotic object kind.
 *
 * Three further properties are deliberate and are the reason this is one module rather than a helper:
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
 * Canonical bytes come from the owner-approved unmodified conforming JCS implementation
 * `canonicalize@3.0.0` (Apache-2.0, erdtman/canonicalize, zero runtime dependencies), used exactly
 * as published via its default export. Owner approval for this exact dependency is recorded in
 * K1.1's contract revision 3 (K11-R1-JCS-01); the AGENTS.md third-party record (source, version,
 * license, reuse method, obligations) lives in `implementation-03.md`. ArrokothI boundary
 * validation, the four semantic limits, per-root measurement and the capture pass below remain this
 * module's own: the dependency is called only with a serialization-safe clone built solely from the
 * already-captured immutable snapshot's own data (null-prototype objects; arrays with own
 * non-enumerable `toJSON`/`map` shadows), and only to serialize it — never to decide validity,
 * and never on caller-owned state, nor directly on a snapshot whose prototype chain could carry an
 * ambient `toJSON`/`map` hook into the dependency's ordinary property reads (K11-R2-VAL-02).
 */

import canonicalizeJcs from "canonicalize";
import { Buffer } from "node:buffer";

/**
 * Primordials captured before any caller code runs.
 *
 * A capture-time side effect can install `Object.prototype.toJSON`, overwrite a global such as
 * `Object.keys`, or replace a prototype method such as `Array.prototype.join` while `capture` is
 * observing a hostile value (K11-R2-VAL-02). Everything after capture — the serialization-safe
 * clone, the exact JCS invocation, the byte measurement, identity packing and retained evidence —
 * must therefore use only these load-time references, never a live global or prototype lookup.
 * Each use site names why; the serializer sandbox below restores the same references around the
 * exact dependency call, and `accept` contains any failure as a refusal rather than leaking it.
 */
const PrimordialObject = Object;
const PrimordialArray = Array;
const PrimordialJSON = JSON;
const PrimordialSet = Set;
const PrimordialError = Error;
const PrimordialSymbol = Symbol;
const PrimordialReflectApply = Reflect.apply;
const PrimordialIsNaN = isNaN;
const PrimordialIsFinite = isFinite;
const PrimordialObjectKeys = Object.keys;
const PrimordialGetOwnPropertyNames = Object.getOwnPropertyNames;
const PrimordialGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const PrimordialDefineProperty = Object.defineProperty;
const PrimordialGetPrototypeOf = Object.getPrototypeOf;
const PrimordialObjectCreate = Object.create;
const PrimordialObjectFreeze = Object.freeze;
const PrimordialObjectIs = Object.is;
/**
 * The genuine `Object.prototype`, captured before any caller code runs.
 *
 * `captureObject` must compare the observed prototype against this, never against a live
 * `Object.prototype` read: the `getPrototypeOf` observation itself runs a caller-controlled trap
 * that can replace `globalThis.Object` and return the replacement's prototype, which would then
 * compare equal to the live `Object.prototype` while being neither primordial nor null
 * (K11-R5-VAL-03). `Object.prototype` is non-writable/non-configurable and so cannot be swapped
 * in place — but the *binding* `globalThis.Object` can, which is what the live comparison reads.
 */
const PrimordialObjectPrototype = Object.prototype;
const PrimordialGetOwnPropertySymbols = Object.getOwnPropertySymbols;
const PrimordialArrayIsArray = Array.isArray;
const PrimordialJSONStringify = JSON.stringify;
const PrimordialNumberIsFinite = Number.isFinite;
const PrimordialArrayPrototype = Array.prototype;
const PrimordialSetPrototype = Set.prototype;
const PrimordialArrayMap = Array.prototype.map;
const PrimordialArrayJoin = Array.prototype.join;
const PrimordialArraySort = Array.prototype.sort;
const PrimordialArrayPush = Array.prototype.push;
const PrimordialArrayIterator = Array.prototype[Symbol.iterator];
const PrimordialSetHas = Set.prototype.has;
const PrimordialSetAdd = Set.prototype.add;
const PrimordialSetDelete = Set.prototype.delete;
const PrimordialStringCharCodeAt = String.prototype.charCodeAt;
/**
 * Own-property existence without consulting the prototype chain.
 *
 * The `in` operator consults inherited members: a trap can pollute `Object.prototype` with a
 * `value` member mid-pass, making an accessor descriptor (which owns no `value`) pass a
 * `"value" in descriptor` test, after which `descriptor.value` reads the pollution as if it were
 * owned data. Every data-descriptor test below therefore uses this own-check instead of `in`
 * (K11-R5-VAL-03 capture-path re-audit). It runs through load-time references only.
 */
const PrimordialHasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwnValue = (holder: object): boolean =>
  PrimordialReflectApply(PrimordialHasOwnProperty, holder, ["value"]) as boolean;
const PrimordialBufferByteLength = Buffer.byteLength;
const PrimordialGlobalThis = globalThis;

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
  /**
   * The value does not present one stable structure to read.
   *
   * Its own data descriptor and ordinary property access disagree, or observing its structure threw.
   * Such a value has no single content to bind identity to, so it is refused rather than normalized
   * into whichever reading happened to win (K11-R2-VAL-02).
   */
  | "unstable_representation"
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
  /**
   * The captured snapshot: frozen, detached from the caller, and the *only* structure `canonical`
   * describes. Re-canonicalizing it reproduces `canonical` exactly.
   */
  readonly value: BoundaryValue;
  /** RFC 8785/JCS bytes as a JavaScript string; `canonicalBytes` is its UTF-8 length. */
  readonly canonical: string;
  readonly canonicalBytes: number;
}

const describe = (value: unknown): string => {
  try {
    if (value === null) return "null";
    if (PrimordialArrayIsArray(value)) return "array";
    if (typeof value === "object") {
      // A hostile thrown value can throw again when its `constructor` (or `constructor.name`)
      // is read. This formatter must never let that second error escape the Kernel boundary:
      // it names refusals, never canonical bytes, so any inspection failure degrades to a
      // generic label rather than a raw exception (K11-R2-VAL-02).
      let constructorName: unknown;
      try {
        constructorName = (value as { constructor?: unknown }).constructor;
        if (constructorName !== undefined && constructorName !== null) {
          const name = (constructorName as { name?: unknown }).name;
          if (typeof name === "string" && name !== "Object") return `${name} instance`;
        }
        return "object";
      } catch {
        return "uninspectable value";
      }
    }
    return typeof value;
  } catch {
    return "uninspectable value";
  }
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
  // `String.prototype.charCodeAt` is invoked through the load-time reference: a capture-time
  // side effect can replace the prototype method, and an index loop (not `for...of`, whose
  // `Symbol.iterator` lookup is itself ambient) keeps the scan independent of it.
  for (let index = 0; index < input.length; index += 1) {
    const unit = PrimordialReflectApply(PrimordialStringCharCodeAt, input, [index]) as number;
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < input.length ? (PrimordialReflectApply(PrimordialStringCharCodeAt, input, [index + 1]) as number) : -1;
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

/** Unicode scalar values, which is what the string limit counts — not UTF-16 code units. */
const scalarValueCount = (input: string): number => {
  // Same discipline as `isWellFormed`: no `for...of` (ambient `Symbol.iterator`) and no live
  // prototype method. A high surrogate consumes its pair; anything else counts one.
  let count = 0;
  for (let index = 0; index < input.length; index += 1) {
    const unit = PrimordialReflectApply(PrimordialStringCharCodeAt, input, [index]) as number;
    if (unit >= 0xd800 && unit <= 0xdbff) index += 1;
    count += 1;
  }
  return count;
};

/**
 * Appends without consulting `Array.prototype.push`.
 *
 * Issue and capture lists are built while caller traps are still running: an earlier trap in the
 * same capture pass can replace `Array.prototype.push`, so `list.push(item)` would invoke
 * attacker code (or throw out of the boundary). The load-time `push` is applied directly through
 * the load-time `Reflect.apply`, so neither call consults any mutable prototype or global.
 */
const appendItem = <T>(list: T[], item: T): void => {
  PrimordialReflectApply(PrimordialArrayPush, list, [item]);
};

const pushIssue = (issues: ValueIssue[], issue: ValueIssue): void => {
  appendItem(issues, issue);
};

/**
 * What a capture returns when the value at that position is not acceptable.
 *
 * A distinct sentinel rather than `undefined`, because `undefined` is itself one of the refused
 * things this pass reports. Every path that returns `REFUSED` has already recorded at least one
 * located issue.
 */
const REFUSED = Symbol("refused boundary value");
type Captured = BoundaryValue | typeof REFUSED;

interface CaptureState {
  readonly issues: ValueIssue[];
  /**
   * Containers currently on the path, by identity, so a self-reference is a cycle and not a hang.
   *
   * A plain identity stack compared with `===`, not a `Set`: `Set` construction consults the
   * global `Set` binding and `has`/`add`/`delete` consult `Set.prototype`, all of which a
   * capture-time side effect can replace mid-pass. Depth is bounded by `containerDepth`, so a
   * linear scan is trivially cheap and consults nothing ambient.
   */
  readonly open: object[];
}

const isOpen = (state: CaptureState, container: object): boolean => {
  for (let index = 0; index < state.open.length; index += 1) {
    if (state.open[index] === container) return true;
  }
  return false;
};

const openContainer = (state: CaptureState, container: object): void => {
  appendItem(state.open, container);
};

const closeContainer = (state: CaptureState, container: object): void => {
  for (let index = 0; index < state.open.length; index += 1) {
    if (state.open[index] === container) {
      state.open[index] = state.open[state.open.length - 1] as object;
      state.open.length -= 1;
      return;
    }
  }
};

/**
 * Whether `name` is a canonical array index in the ECMA-262 sense.
 *
 * An array index is a string `P` with `ToString(ToUint32(P)) === P` and
 * `P !== "4294967295"`. In particular `"01"`, `"00"` and strings above
 * `2**32 - 2` are *not* indices: they are ordinary own members
 * that canonical array form would silently drop, so they must be refused
 * rather than ignored. The previous `/^\d+$/` test accepted `"01"` as an
 * index and let it escape the extra-member rejection (K11-R1-VAL-01).
 *
 * Written without `RegExp.prototype.test`, the `Number`/`String` globals or any prototype
 * method: all three are ambient reads a capture-time side effect can replace mid-pass. Digit
 * spelling is checked by code-unit comparison (safe internal ordering on single characters, no
 * method lookup); the range bound uses length plus a lexicographic comparison, which agrees
 * with the numeric comparison for equal-length digit strings. `"4294967295"` (length 10,
 * above `"4294967294"`) is therefore excluded exactly as the definition requires.
 */
const isArrayIndex = (name: string): boolean => {
  if (name.length === 0) return false;
  for (let index = 0; index < name.length; index += 1) {
    const unit = name[index] as string;
    if (unit < "0" || unit > "9") return false;
  }
  if (name.length > 1 && (name[0] as string) === "0") return false;
  if (name.length > 10) return false;
  if (name.length === 10 && name > "4294967294") return false;
  return true;
};

/**
 * Numeric value of a name `isArrayIndex` already accepted.
 *
 * No `Number` global read: the spelling is already known to be canonical digits in range, so a
 * positional accumulation over code units (via the load-time `charCodeAt`) is exact.
 */
const arrayIndexValue = (name: string): number => {
  let value = 0;
  for (let index = 0; index < name.length; index += 1) {
    value = value * 10 + ((PrimordialReflectApply(PrimordialStringCharCodeAt, name, [index]) as number) - 48);
  }
  return value;
};

/**
 * One member's value, or a refusal, from the one descriptor already read for that position.
 *
 * `descriptor.value` is the structural fact — what the object *owns* — and `container[key]` is what
 * ordinary property access, including the JCS implementation's own member access, would see. On an
 * ordinary object these are the same thing by construction. Where they differ, the value has no
 * single content: one reading would decide identity and the other would be retained. `values.md`
 * rejects unsupported values rather than repairing them, so the disagreement is refused here and
 * neither reading is preferred.
 *
 * Each position is observed exactly twice — its own descriptor and one ordinary read — and never
 * again. The descriptor is read by the caller of this function, which is also what decides that the
 * position exists at all, so there is only ever one descriptor per position to reason about.
 * Whatever the container answers on any later read cannot matter: nothing downstream reads it.
 */
function describedValue(
  container: object,
  key: string,
  descriptor: PropertyDescriptor | undefined,
  path: string,
  state: CaptureState,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  if (descriptor === undefined) {
    // The structure said this member exists — an own-names listing, or an array position below
    // `length` — but it owns no property there. Anything a read would return comes from somewhere
    // else (a prototype, a trap), so there is no own content to accept.
    pushIssue(state.issues, {
      path,
      code: "undefined_member",
      message: "position has no own property; a value supplied only through a prototype or a dynamic read is not accepted content",
    });
    return { ok: false };
  }
  if (!hasOwnValue(descriptor)) {
    pushIssue(state.issues, { path, code: "unrepresentable_member", message: "member is an accessor, which canonical form cannot represent" });
    return { ok: false };
  }
  const read = (container as Record<string, unknown>)[key];
  if (!PrimordialObjectIs(descriptor.value, read)) {
    pushIssue(state.issues, {
      path,
      code: "unstable_representation",
      message: "member is supplied differently by its own data descriptor and by ordinary property access, so it has no single content",
    });
    return { ok: false };
  }
  return { ok: true, value: descriptor.value };
}

/**
 * The single pass: validate structure, strings, numbers and all three structural limits while
 * building the immutable snapshot that every later use of this value is taken from.
 *
 * `level` counts the containers entered on the path to this value, so the root container is level 1
 * and `values.md`'s depth is the greatest level any path reaches. Descent stops one level past the
 * limit: a value nested ten thousand deep is reported as too deep rather than exhausting the stack.
 *
 * Refusals are collected rather than thrown: `values.md` expects every reason a value was refused,
 * located, so a caller can fix all of them at once. A refused position stops contributing to the
 * snapshot but does not stop its siblings from being examined.
 */
function capture(value: unknown, path: string, level: number, state: CaptureState): Captured {
  if (value === null) return null;

  const type = typeof value;
  if (type === "boolean") return value as boolean;
  if (type === "number") {
    if (!PrimordialNumberIsFinite(value)) {
      pushIssue(state.issues, { path, code: "non_finite_number", message: "expected a finite number, received a non-finite number" });
      return REFUSED;
    }
    return value as number;
  }
  if (type === "string") {
    const text = value as string;
    if (!isWellFormed(text)) {
      pushIssue(state.issues, { path, code: "lone_surrogate", message: "string contains an unpaired surrogate and has no UTF-8 encoding" });
      return REFUSED;
    }
    const length = scalarValueCount(text);
    if (length > BOUNDARY_LIMITS.stringScalarValues) {
      pushIssue(state.issues, {
        path,
        code: "string_too_long",
        message: `string is ${length} Unicode scalar values, above the limit of ${BOUNDARY_LIMITS.stringScalarValues}`,
      });
      return REFUSED;
    }
    return text;
  }
  if (type !== "object") {
    pushIssue(state.issues, { path, code: "unsupported_form", message: `expected a boundary value, received ${describe(value)}` });
    return REFUSED;
  }

  const container = value as object;
  if (isOpen(state, container)) {
    pushIssue(state.issues, { path, code: "cycle", message: "value refers to itself and has no canonical form" });
    return REFUSED;
  }

  const entered = level + 1;
  if (entered > BOUNDARY_LIMITS.containerDepth) {
    pushIssue(state.issues, {
      path,
      code: "too_deep",
      message: `container nesting passes the depth limit of ${BOUNDARY_LIMITS.containerDepth}`,
    });
    return REFUSED;
  }

  openContainer(state, container);
  try {
    // Every structural observation of caller-owned state happens inside this block. A container
    // whose structure cannot be observed without throwing has no readable content; it is refused
    // like any other unsupported form rather than escaping as an exception from a Kernel boundary.
    return PrimordialArrayIsArray(container)
      ? captureArray(container as readonly unknown[] & object, path, entered, state)
      : captureObject(container, path, entered, state);
  } catch (error) {
    pushIssue(state.issues, {
      path,
      code: "unstable_representation",
      message: `observing this value's structure threw (${describe(error)}), so it presents no readable content`,
    });
    return REFUSED;
  } finally {
    closeContainer(state, container);
  }
}

/** The array half of `capture`. Positions come from own data properties below `length`, only. */
function captureArray(container: readonly unknown[] & object, path: string, entered: number, state: CaptureState): Captured {
  // Arrays must be genuine arrays: a subclass instance or a re-prototyped array would
  // canonicalize as a plain array and lose its exotic identity, so refuse it instead.
  // `Array.prototype` itself is non-writable and non-configurable, so this reference cannot be
  // swapped by a capture-time side effect; only its *properties* are mutable, and those are
  // handled by the serializer sandbox below.
  if (PrimordialGetPrototypeOf(container) !== PrimordialArrayPrototype) {
    pushIssue(state.issues, { path, code: "unsupported_form", message: `expected a plain array, received ${describe(container)}` });
    return REFUSED;
  }

  // `length` decides which positions exist, so it is held to the same one-stable-structure rule as
  // any other member before it is trusted to bound the loop.
  const lengthDescriptor = PrimordialGetOwnPropertyDescriptor(container, "length");
  const lengthRead: unknown = (container as { length: unknown }).length;
  if (
    lengthDescriptor === undefined ||
    !hasOwnValue(lengthDescriptor) ||
    !PrimordialObjectIs(lengthDescriptor.value, lengthRead) ||
    typeof lengthRead !== "number"
  ) {
    pushIssue(state.issues, {
      path,
      code: "unstable_representation",
      message: "array length is not one stable own data property, so which positions exist cannot be established",
    });
    return REFUSED;
  }
  const length = lengthRead;

  // K11-R3-LIMIT-01: the trusted observed length has already decided this root cannot be
  // accepted, so refuse without allocating or traversing proportional to that invalid extent.
  // A declared sparse length can be as large as 2**32 - 1; allocating `new Array(length)` and
  // looping to `length - 1` would turn a known over-limit root into effectively unbounded work.
  // Exactly-at-limit still proceeds below; one-over refuses here with no traversal.
  if (length > BOUNDARY_LIMITS.containerEntries) {
    pushIssue(state.issues, {
      path,
      code: "too_many_entries",
      message: `array has ${length} entries, above the limit of ${BOUNDARY_LIMITS.containerEntries}`,
    });
    return REFUSED;
  }

  let refused = false;

  // An array carrying extra own properties (`a = [1]; a.tag = "x"`, or `a["01"] = 1`)
  // would canonicalize as if they were not there. Reject it rather than drop them.
  // Only canonical indices count; numeric-looking non-indices such as `"01"` are extra.
  // Structural reads below use the primordials captured at module load so a capture-time side
  // effect that overwrites a global cannot steer the rest of this observation. The scan below
  // uses index loops and `appendItem` rather than `filter`/`for...of`/`push`, because
  // `Array.prototype` methods and `Symbol.iterator` are themselves mutable mid-pass.
  const names = PrimordialGetOwnPropertyNames(container) as string[];
  let hasExtra = false;
  for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
    const name = names[nameIndex] as string;
    if (name !== "length" && !isArrayIndex(name)) {
      hasExtra = true;
      break;
    }
  }
  if (hasExtra || PrimordialGetOwnPropertySymbols(container).length > 0) {
    pushIssue(state.issues, { path, code: "unrepresentable_member", message: "array has own members outside its indices, which canonical form would silently drop" });
    refused = true;
  }

  // K11-R2-VAL-02 supplement: a canonical-index own name at or beyond the stable observed
  // length is neither `extra` above nor visited by the position loop below, so without this
  // check it would disappear into an accepted `[]`. Every observed own name must either cohere
  // with accepted array content or refuse. A listed index with no backing descriptor has no
  // property behind the listing (`unstable_representation`, like the object half); a backed
  // index outside `length` is state canonical array form would silently drop
  // (`unrepresentable_member`). Both refuse; neither is normalized.
  for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
    const name = names[nameIndex] as string;
    if (name === "length" || !isArrayIndex(name)) continue;
    const numeric = arrayIndexValue(name);
    if (numeric >= length) {
      const backing = PrimordialGetOwnPropertyDescriptor(container, name);
      if (backing === undefined) {
        pushIssue(state.issues, {
          path: element(path, numeric),
          code: "unstable_representation",
          message: "array lists an own index it does not own, so its structure has no single reading",
        });
      } else {
        pushIssue(state.issues, {
          path: element(path, numeric),
          code: "unrepresentable_member",
          message: "array has an own index outside its length, which canonical form would silently drop",
        });
      }
      refused = true;
    }
  }

  const captured: Captured[] = new PrimordialArray<Captured>(length);
  for (let index = 0; index < length; index += 1) {
    const where = element(path, index);
    const key = `${index}`;
    const member = describedValue(container, key, PrimordialGetOwnPropertyDescriptor(container, key), where, state);
    if (!member.ok) {
      refused = true;
      continue;
    }
    if (member.value === undefined) {
      pushIssue(state.issues, { path: where, code: "undefined_member", message: "array element is undefined; an array has no absent positions" });
      refused = true;
      continue;
    }
    const item = capture(member.value, where, entered, state);
    if (item === REFUSED) {
      refused = true;
      continue;
    }
    captured[index] = item;
  }

  if (refused) return REFUSED;
  const out: BoundaryValue[] = new PrimordialArray<BoundaryValue>(length);
  for (let index = 0; index < length; index += 1) {
    // `defineProperty`, never assignment, for the same reason the object half uses it: the key is
    // installed as own data whatever it spells.
    PrimordialDefineProperty(out, `${index}`, { value: captured[index] as BoundaryValue, writable: false, enumerable: true, configurable: false });
  }
  return PrimordialObjectFreeze(out) as unknown as BoundaryValue[];
}

/** The object half of `capture`. Members come from own enumerable string-keyed data properties. */
function captureObject(container: object, path: string, entered: number, state: CaptureState): Captured {
  // Both sides of this comparison are independent of caller-mutable state: the observation uses
  // the load-time `getPrototypeOf`, and the plain prototype is the load-time object, not a live
  // `globalThis.Object` read the trap itself may just have replaced (K11-R5-VAL-03). A trap that
  // returns a non-primordial, non-null prototype is refused here rather than normalized; a trap
  // that returns the primordial prototype (or null) yields a genuinely plain snapshot, whatever
  // else the trap did — and everything downstream of capture uses primordials only.
  const prototype = PrimordialGetPrototypeOf(container) as object | null;
  if (prototype !== PrimordialObjectPrototype && prototype !== null) {
    pushIssue(state.issues, { path, code: "unsupported_form", message: `expected a plain object, received ${describe(container)}` });
    return REFUSED;
  }

  let refused = false;
  if (PrimordialGetOwnPropertySymbols(container).length > 0) {
    pushIssue(state.issues, { path, code: "unrepresentable_member", message: "object has symbol-keyed members, which canonical form cannot represent" });
    refused = true;
  }

  // One own-names observation and one descriptor per name. The same descriptor answers "is this
  // member enumerable?" and "what does this member own?", so those two questions cannot be settled
  // from different readings of the same object. Index loops, not `for...of`: the iterator lookup
  // is ambient and mutable mid-pass.
  const names = PrimordialGetOwnPropertyNames(container) as string[];
  const enumerable: [string, PropertyDescriptor][] = [];
  let nonEnumerable = false;
  for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
    const name = names[nameIndex] as string;
    const descriptor = PrimordialGetOwnPropertyDescriptor(container, name);
    if (descriptor === undefined) {
      // The object listed an own name it does not own. There is no content behind it to accept.
      pushIssue(state.issues, {
        path: child(path, name),
        code: "unstable_representation",
        message: "object lists an own member it does not own, so its structure has no single reading",
      });
      refused = true;
      continue;
    }
    if (descriptor.enumerable) appendItem(enumerable, [name, descriptor]);
    else nonEnumerable = true;
  }
  if (nonEnumerable) {
    pushIssue(state.issues, { path, code: "unrepresentable_member", message: "object has non-enumerable own members, which canonical form would silently drop" });
    refused = true;
  }
  if (enumerable.length > BOUNDARY_LIMITS.containerEntries) {
    pushIssue(state.issues, {
      path,
      code: "too_many_entries",
      message: `object has ${enumerable.length} members, above the limit of ${BOUNDARY_LIMITS.containerEntries}`,
    });
    refused = true;
  }

  const captured: [string, BoundaryValue][] = [];
  for (let entryIndex = 0; entryIndex < enumerable.length; entryIndex += 1) {
    // Index access, not destructuring iteration: `for...of` over the pair would consult the
    // ambient `Symbol.iterator`.
    const pair = enumerable[entryIndex] as [string, PropertyDescriptor];
    const key = pair[0];
    const descriptor = pair[1];
    const where = child(path, key);
    if (!isWellFormed(key)) {
      pushIssue(state.issues, { path: where, code: "lone_surrogate", message: "member name contains an unpaired surrogate" });
      refused = true;
      continue;
    }
    const nameLength = scalarValueCount(key);
    if (nameLength > BOUNDARY_LIMITS.stringScalarValues) {
      pushIssue(state.issues, {
        path: where,
        code: "string_too_long",
        message: `member name is ${nameLength} Unicode scalar values, above the limit of ${BOUNDARY_LIMITS.stringScalarValues}`,
      });
      refused = true;
      continue;
    }
    const member = describedValue(container, key, descriptor, where, state);
    if (!member.ok) {
      refused = true;
      continue;
    }
    if (member.value === undefined) {
      pushIssue(state.issues, {
        path: where,
        code: "undefined_member",
        message: "member is present with no value; omit the member instead, since absent and null are different values",
      });
      refused = true;
      continue;
    }
    const item = capture(member.value, where, entered, state);
    if (item === REFUSED) {
      refused = true;
      continue;
    }
    appendItem(captured, [key, item]);
  }

  if (refused) return REFUSED;
  // The snapshot preserves the validated prototype (`Object.prototype` or `null`) and installs every
  // member with `defineProperty`, never assignment. Plain assignment `snapshot[name] = ...` invokes
  // the inherited legacy `__proto__` setter for that one key instead of creating an own data
  // property: a valid own `"__proto__"` member would vanish from the record, its value would
  // silently become the snapshot's prototype, and the retained structure would stop matching the
  // canonical bytes taken from it (K02-R2-02, K11-R1-VAL-01). `defineProperty` gives no member name
  // special treatment.
  const snapshot = PrimordialObjectCreate(prototype) as Record<string, BoundaryValue>;
  for (let entryIndex = 0; entryIndex < captured.length; entryIndex += 1) {
    const pair = captured[entryIndex] as [string, BoundaryValue];
    PrimordialDefineProperty(snapshot, pair[0], { value: pair[1], writable: false, enumerable: true, configurable: false });
  }
  return PrimordialObjectFreeze(snapshot);
}

/**
 * Canonical bytes for a captured snapshot, via the owner-approved unmodified JCS implementation.
 *
 * Called only on the frozen snapshot `capture` built, never on caller-owned state. Every input here
 * is therefore plain data the dependency serializes deterministically — `null`, boolean, finite
 * number, well-formed string, or frozen arrays/plain objects thereof with own data members only, no
 * `undefined`/symbol/accessor/non-enumerable/array-extra members and no cycles — and the bytes it
 * returns describe exactly the structure the Kernel retains. The dependency is never asked to decide
 * validity: refusal (with located ArrokothI issue codes) happens in `capture`, and the byte limit is
 * measured here from its output. Verified byte-identical to `values.md` rules 1–6 on the accepted
 * space (key UTF-16 order, shortest round-trip numbers with `-0` as `0`, rule-4 escapes with
 * `/`/DEL/direct Unicode passthrough), including own `"__proto__"` members and null-prototype objects.
 *
 * ## The serializer boundary (K11-R2-VAL-02 reconstruction)
 *
 * The snapshot alone is not enough: the approved JCS implementation observes its input through
 * ordinary property reads — `object.toJSON` (including inherited members), `object.map` and
 * `object[key]` — before its array/object serialization. `Object.freeze(snapshot)` freezes the
 * snapshot's own state, not its prototype chain, so passing the snapshot directly would let an
 * ambient or capture-time-installed `Object.prototype.toJSON` / `Array.prototype.toJSON` (or a
 * polluted `Array.prototype.map`) decide canonical bytes describing a different value from the
 * retained one. Re-canonicalizing the retained snapshot through the same direct call is not an
 * independent oracle either: it would inherit the same hook and reproduce the same wrong bytes.
 *
  * `encode` therefore never hands the snapshot itself to the dependency. It first builds a
  * serialization-safe clone from the snapshot's own data only (own descriptors via the primordials
  * above, never an ordinary read that could reach a prototype or trap):
  *
  * - objects become `Object.create(null)` clones carrying the same own enumerable members, so an
  *   `Object.prototype.toJSON` hook is not on the lookup path at all;
  * - arrays become fresh arrays carrying the same indices plus two own non-enumerable shadows:
  *   `toJSON: undefined` (so an inherited `toJSON` never diverts the JCS `toJSON` branch) and a
  *   minimal `map` that iterates only this clone's own indices via primordials (so a polluted
  *   `Array.prototype.map` is never called). Both shadows are non-enumerable, so `Object.keys`
  *   and the JCS array/object serialization ignore them; valid snapshots never carry own
  *   enumerable `toJSON`/`map` (array extras are refused), so the shadows cannot collide with
  *   logical content. A legitimate own enumerable `"toJSON"` data member (for example
  *   `{"toJSON":1}`) is preserved as ordinary content and, being non-function data, already keeps
  *   the JCS `toJSON` branch off.
  *
  * The clone alone is still not enough: the dependency resolves its own globals (`Object.keys`,
  * `Array.isArray`, `JSON.stringify`, `isNaN`/`isFinite`, `Set`, `Error`, `Symbol`) and prototype
  * methods (`Array.prototype.sort/join/push`, `Set.prototype.has/add/delete`, the array iterator)
  * at call time, and a capture-time side effect can replace any of them before the call. So the
  * exact call runs inside `withSerializerEnvironment`, which reinstalls the load-time primordials
  * for every slot the dependency audit names (see `serializerSlots`), invokes the unmodified
  * dependency on the clone, and then restores the previously observed descriptors. No caller code
  * can run while the primordials are installed — the clone has no traps and the dependency calls
  * no caller function — so the bytes are a function only of the clone. Any failure, including a
  * disturbed intrinsic throwing, propagates to `accept`, which maps it to an
  * `unstable_representation` refusal with a generic message rather than leaking the ambient
  * exception out of the Kernel boundary.
  *
  * The clone derives solely from the accepted logical snapshot, the dependency runs only in the
  * restored environment, and the dependency itself is used exactly as published.
  */
function toSerializationSafe(value: BoundaryValue): BoundaryValue {
  if (value === null) return null;
  const kind = typeof value;
  if (kind === "boolean" || kind === "number" || kind === "string") return value;
  if (PrimordialArrayIsArray(value)) {
    const lengthDescriptor = PrimordialGetOwnPropertyDescriptor(value, "length");
    const length =
      lengthDescriptor !== undefined && hasOwnValue(lengthDescriptor) && typeof lengthDescriptor.value === "number"
        ? lengthDescriptor.value
        : (value as unknown[]).length;
    const out: unknown[] = new PrimordialArray(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = PrimordialGetOwnPropertyDescriptor(value, `${index}`);
      // Snapshots are dense own-data by construction; a missing descriptor here is unreachable.
      // Fall back to `undefined` rather than an ordinary read so no prototype is ever consulted.
      const child: BoundaryValue =
        descriptor !== undefined && hasOwnValue(descriptor) ? (descriptor.value as BoundaryValue) : (undefined as unknown as BoundaryValue);
      PrimordialDefineProperty(out, `${index}`, {
        value: toSerializationSafe(child),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    PrimordialDefineProperty(out, "toJSON", { value: undefined, writable: true, enumerable: false, configurable: true });
    const safeMap = function (
      this: unknown[],
      callback: (item: unknown, index: number, array: unknown[]) => unknown,
    ): unknown[] {
      const self = this as unknown[];
      const lengthDescriptorInner = PrimordialGetOwnPropertyDescriptor(self, "length");
      const innerLength =
        lengthDescriptorInner !== undefined && hasOwnValue(lengthDescriptorInner) && typeof lengthDescriptorInner.value === "number"
          ? lengthDescriptorInner.value
          : self.length;
      const result: unknown[] = new PrimordialArray(innerLength);
      for (let innerIndex = 0; innerIndex < innerLength; innerIndex += 1) {
        const innerDescriptor = PrimordialGetOwnPropertyDescriptor(self, `${innerIndex}`);
        const innerValue = innerDescriptor !== undefined && hasOwnValue(innerDescriptor) ? innerDescriptor.value : undefined;
        result[innerIndex] = callback(innerValue, innerIndex, self);
      }
      return result;
    };
    PrimordialDefineProperty(out, "map", { value: safeMap, writable: true, enumerable: false, configurable: true });
    return out as unknown as BoundaryValue;
  }
  const out: Record<string, BoundaryValue> = PrimordialObjectCreate(null);
  const keys = PrimordialReflectApply(PrimordialObjectKeys, PrimordialObject, [value]) as string[];
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex] as string;
    const descriptor = PrimordialGetOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !hasOwnValue(descriptor)) continue;
    PrimordialDefineProperty(out, key, {
      value: toSerializationSafe(descriptor.value as BoundaryValue),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  return out as unknown as BoundaryValue;
}

/**
 * Every ambient read the exact `canonicalize@3.0.0` implementation performs, with the load-time
 * value that must be visible while it runs.
 *
 * Audited against the published 49-line `lib/canonicalize.js` (default export `canonicalize`):
 *
 * | Dependency read | How it is observed | Slot below |
 * |---|---|---|
 * | `isNaN(object)` (number guard) | `globalThis.isNaN` at call time | global `isNaN` |
 * | `isFinite(object)` (number guard) | `globalThis.isFinite` at call time | global `isFinite` |
 * | `new Error(...)` (four throw sites) | `globalThis.Error` at call time | global `Error` |
 * | `JSON.stringify(primitive)` | `globalThis.JSON`, then `.stringify` | global `JSON` + `JSON.stringify` |
 * | `Array.isArray(object)` | `globalThis.Array`, then `.isArray` | global `Array` + `Array.isArray` |
 * | `Object.keys(object)` (object branch) | `globalThis.Object`, then `.keys` | global `Object` + `Object.keys` |
 * | `new Set()` (default `seen` param) | `globalThis.Set` at call time | global `Set` |
 * | `for (const key of ...sort())` iteration | `globalThis.Symbol`, then `Symbol.iterator` | global `Symbol` |
 * | `object.toJSON` (own or inherited) | ordinary read on the input | neutralized structurally: the input is always the safe clone (null-prototype objects; arrays with an own non-enumerable `toJSON: undefined` shadow), never caller state and never a bare snapshot |
 * | `object.map(...)` (array branch) | ordinary read on the input | neutralized structurally: the clone's own non-enumerable `map` shadow (iterates own indices via primordials) |
 * | `object[key]` (object branch) | ordinary read on the input | neutralized structurally: the clone holds only own data copied from the snapshot's own descriptors |
 * | `seen.has/add/delete` | `Set.prototype` at call time | `Set.prototype` slots |
 * | `values.join(',')`, `parts.join(',')`, `parts.push(...)` | `Array.prototype` at call time (`values`/`parts` are arrays the dependency creates) | `Array.prototype.join/push` slots |
 * | `Object.keys(object).sort()` | `Array.prototype` at call time | `Array.prototype.sort` slot |
 * | `typeof`, `===`, template-literal spelling | language operators, not lookups | no slot needed |
 *
 * Anything not in this table is not read by the dependency. In particular it never reads
 * `Number`, `String`, `Reflect`, `Buffer`, `Map`, `Object.getOwnProperty*` or `Array.from`, so
 * those need no sandbox slot (the adapter's own uses of them are primordial-hardened above).
 */
type SandboxSlot = {
  /** The object holding the mutable property (`globalThis`, `Object`, `Array.prototype`, …). */
  readonly holder: object;
  /** The property key as observed at call time. */
  readonly key: string | symbol;
  /** The load-time value to install for the call. */
  readonly primordial: unknown;
};

const serializerSlots = (): SandboxSlot[] => {
  const slots: SandboxSlot[] = [];
  const slot = (holder: object, key: string | symbol, primordial: unknown): void => {
    appendItem(slots, { holder, key, primordial });
  };
  slot(PrimordialGlobalThis, "isNaN", PrimordialIsNaN);
  slot(PrimordialGlobalThis, "isFinite", PrimordialIsFinite);
  slot(PrimordialGlobalThis, "Object", PrimordialObject);
  slot(PrimordialGlobalThis, "Array", PrimordialArray);
  slot(PrimordialGlobalThis, "JSON", PrimordialJSON);
  slot(PrimordialGlobalThis, "Set", PrimordialSet);
  slot(PrimordialGlobalThis, "Error", PrimordialError);
  slot(PrimordialGlobalThis, "Symbol", PrimordialSymbol);
  slot(PrimordialObject, "keys", PrimordialObjectKeys);
  slot(PrimordialArray, "isArray", PrimordialArrayIsArray);
  slot(PrimordialJSON, "stringify", PrimordialJSONStringify);
  slot(PrimordialArrayPrototype, "map", PrimordialArrayMap);
  slot(PrimordialArrayPrototype, "join", PrimordialArrayJoin);
  slot(PrimordialArrayPrototype, "sort", PrimordialArraySort);
  slot(PrimordialArrayPrototype, "push", PrimordialArrayPush);
  slot(PrimordialArrayPrototype, PrimordialSymbol.iterator, PrimordialArrayIterator);
  slot(PrimordialSetPrototype, "has", PrimordialSetHas);
  slot(PrimordialSetPrototype, "add", PrimordialSetAdd);
  slot(PrimordialSetPrototype, "delete", PrimordialSetDelete);
  return slots;
};

/**
 * Runs `work` with the serializer execution environment restored to load-time primordials.
 *
 * A capture-time side effect can replace any slot above between the start of `capture` and this
 * call. Saving and restoring through own-property descriptors (never through reads that would
 * invoke an installed getter/setter) keeps the swap itself from executing attacker code, and no
 * caller code runs while the primordials are installed: the safe clone holds only frozen plain
 * data with no traps, and the dependency calls no caller function. Canonical bytes produced
 * inside are therefore a function only of the clone — which is a function only of the snapshot —
 * never of the ambient mutation.
 *
 * The swap is temporary: the previously observed descriptors are reinstalled afterwards, so host
 * polyfills or unrelated host state outside these slots are left exactly as found. If the swap
 * itself fails (for example an attacker redefined a slot as non-configurable), the throw
 * propagates to `accept`, which contains it as a refusal: degraded availability, never wrong
 * bytes and never a leaked ambient exception.
 */
function withSerializerEnvironment<T>(work: () => T): T {
  const slots = serializerSlots();
  const saved: { readonly holder: object; readonly key: string | symbol; readonly descriptor: PropertyDescriptor | undefined }[] = [];
  for (let index = 0; index < slots.length; index += 1) {
    const entry = slots[index] as SandboxSlot;
    appendItem(saved, {
      holder: entry.holder,
      key: entry.key,
      descriptor: PrimordialGetOwnPropertyDescriptor(entry.holder, entry.key),
    });
  }
  for (let index = 0; index < slots.length; index += 1) {
    const entry = slots[index] as SandboxSlot;
    PrimordialDefineProperty(entry.holder, entry.key, {
      value: entry.primordial,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
  try {
    return work();
  } finally {
    for (let index = saved.length - 1; index >= 0; index -= 1) {
      const entry = saved[index] as { readonly holder: object; readonly key: string | symbol; readonly descriptor: PropertyDescriptor | undefined };
      if (entry.descriptor === undefined) {
        // The slot did not exist when saved (an attacker deleted it): remove the installed
        // primordial again rather than inventing a property the host did not have.
        delete (entry.holder as Record<string | symbol, unknown>)[entry.key];
      } else {
        PrimordialDefineProperty(entry.holder, entry.key, entry.descriptor);
      }
    }
  }
}

function encode(value: BoundaryValue): string {
  // The clone and the exact call both run inside the restored environment, so even the clone
  // construction (which uses primordials directly and would be correct outside) shares the one
  // audited execution window. Any throw — a disturbed intrinsic, or the dependency's own
  // rejection — propagates to `accept`, which maps it to a boundary refusal. The message is
  // deliberately generic: a disturbed intrinsic can throw an attacker-influenced value, and the
  // boundary must contain it rather than leak it.
  const canonical = withSerializerEnvironment(() => canonicalizeJcs(toSerializationSafe(value)) as string | undefined);
  if (typeof canonical !== "string") throw new PrimordialError("JCS implementation returned no canonical form for a validated boundary value");
  return canonical;
}

/**
 * The whole acceptance path, run once: capture, canonicalize the capture, measure its bytes.
 *
 * Both public entry points go through this, so "what was refused" and "what was accepted" can never
 * be answered by two different passes over the caller's object.
 */
function accept(value: unknown): { readonly ok: true; readonly value: CanonicalValue } | { readonly ok: false; readonly issues: ValueIssue[] } {
  const state: CaptureState = { issues: [], open: [] };
  const snapshot = capture(value, "", 0, state);
  if (snapshot === REFUSED || state.issues.length > 0) {
    return {
      ok: false,
      issues:
        state.issues.length > 0
          ? state.issues
          : // Unreachable by construction — every REFUSED path records a located issue — but a
            // silent empty refusal would be worse than a generic one, so it is stated rather than
            // assumed.
            [{ path: "", code: "unsupported_form", message: "value is not an acceptable boundary value" }],
    };
  }

  // The serializer execution environment is caller-mutable until `encode` restores it: a
  // capture-time side effect can leave an ambient intrinsic replaced or throwing. Any failure
  // here therefore becomes the same located refusal the capture pass would have produced, never
  // an arbitrary exception escaping the Kernel boundary (K11-R2-VAL-02).
  let canonical: string;
  try {
    canonical = encode(snapshot);
  } catch {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "unstable_representation",
          message: "serializing the accepted snapshot failed; the serializer execution environment was disturbed while observing the caller's value",
        },
      ],
    };
  }
  const canonicalBytes = PrimordialBufferByteLength(canonical, "utf8");
  if (canonicalBytes > BOUNDARY_LIMITS.canonicalBytes) {
    return {
      ok: false,
      issues: [
        {
          path: "",
          code: "too_many_bytes",
          message: `canonical form is ${canonicalBytes} bytes, above the per-root limit of ${BOUNDARY_LIMITS.canonicalBytes}`,
        },
      ],
    };
  }
  return { ok: true, value: PrimordialObjectFreeze({ value: snapshot, canonical, canonicalBytes }) };
}

/** Every reason `value` is not an acceptable boundary value root. Empty means it is one. */
export function boundaryValueIssues(value: unknown): ValueIssue[] {
  const result = accept(value);
  return result.ok ? [] : result.issues;
}

/** Whether `value` is an acceptable boundary value root. */
export const isBoundaryValue = (value: unknown): value is BoundaryValue => boundaryValueIssues(value).length === 0;

/**
 * Validates one root and returns the captured snapshot with its canonical form, or every reason it
 * was refused.
 *
 * The returned object is what identity decisions compare: two requests carry the same logical value
 * exactly when their `canonical` strings are equal. `value` is the structure those bytes were taken
 * from — not a copy of something else that was canonicalized separately — so re-canonicalizing it
 * reproduces `canonical`, and what the Kernel retains, dispatches and exposes is that same structure.
 *
 * There is deliberately no exported way to seal a value without validating it. The snapshot only
 * means anything as the product of the capture pass that accepted it; a separate sealing entry point
 * is exactly the second reading of caller-owned state that made identity and retained content
 * disagree (K11-R2-VAL-02).
 */
export function canonicalize(value: unknown): { readonly ok: true; readonly value: CanonicalValue } | { readonly ok: false; readonly issues: ValueIssue[] } {
  return accept(value);
}

/**
 * Whether two already-validated roots are the same logical value.
 *
 * `values.md`: "Two values are equal exactly when their canonical bytes are equal." Key order is not
 * semantic, array order is, and an absent member differs from an explicit null.
 */
export const sameLogicalValue = (left: CanonicalValue, right: CanonicalValue): boolean => left.canonical === right.canonical;
