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
 * A capture-time side effect can install `Object.prototype.toJSON` (or overwrite a global)
 * while `capture` is observing a hostile value. The serialization clone below must be built
 * from the snapshot's own data with functions that predate that side effect, so the references
 * it uses are captured here at module load rather than looked up again after capture.
 */
const PrimordialObjectKeys = Object.keys;
const PrimordialGetOwnPropertyNames = Object.getOwnPropertyNames;
const PrimordialGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const PrimordialDefineProperty = Object.defineProperty;
const PrimordialGetPrototypeOf = Object.getPrototypeOf;

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
    if (Array.isArray(value)) return "array";
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
  /** Containers currently on the path, by identity, so a self-reference is a cycle and not a hang. */
  readonly open: Set<object>;
}

/**
 * Whether `name` is a canonical array index in the ECMA-262 sense.
 *
 * An array index is a string `P` with `ToString(ToUint32(P)) === P` and
 * `P !== "4294967295"`. In particular `"01"`, `"00"` and strings above
 * `2**32 - 2` are *not* indices: they are ordinary own members
 * that canonical array form would silently drop, so they must be refused
 * rather than ignored. The previous `/^\d+$/` test accepted `"01"` as an
 * index and let it escape the extra-member rejection (K11-R1-VAL-01).
 */
const isArrayIndex = (name: string): boolean => {
  if (!/^(0|[1-9]\d*)$/.test(name)) return false;
  const numeric = Number(name);
  return Number.isSafeInteger(numeric) && numeric <= 4294967294 && String(numeric) === name;
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
    state.issues.push({
      path,
      code: "undefined_member",
      message: "position has no own property; a value supplied only through a prototype or a dynamic read is not accepted content",
    });
    return { ok: false };
  }
  if (!("value" in descriptor)) {
    state.issues.push({ path, code: "unrepresentable_member", message: "member is an accessor, which canonical form cannot represent" });
    return { ok: false };
  }
  const read = (container as Record<string, unknown>)[key];
  if (!Object.is(descriptor.value, read)) {
    state.issues.push({
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
    if (!Number.isFinite(value)) {
      state.issues.push({ path, code: "non_finite_number", message: `expected a finite number, received ${String(value)}` });
      return REFUSED;
    }
    return value as number;
  }
  if (type === "string") {
    const text = value as string;
    if (!isWellFormed(text)) {
      state.issues.push({ path, code: "lone_surrogate", message: "string contains an unpaired surrogate and has no UTF-8 encoding" });
      return REFUSED;
    }
    const length = scalarValueCount(text);
    if (length > BOUNDARY_LIMITS.stringScalarValues) {
      state.issues.push({
        path,
        code: "string_too_long",
        message: `string is ${length} Unicode scalar values, above the limit of ${BOUNDARY_LIMITS.stringScalarValues}`,
      });
      return REFUSED;
    }
    return text;
  }
  if (type !== "object") {
    state.issues.push({ path, code: "unsupported_form", message: `expected a boundary value, received ${describe(value)}` });
    return REFUSED;
  }

  const container = value as object;
  if (state.open.has(container)) {
    state.issues.push({ path, code: "cycle", message: "value refers to itself and has no canonical form" });
    return REFUSED;
  }

  const entered = level + 1;
  if (entered > BOUNDARY_LIMITS.containerDepth) {
    state.issues.push({
      path,
      code: "too_deep",
      message: `container nesting passes the depth limit of ${BOUNDARY_LIMITS.containerDepth}`,
    });
    return REFUSED;
  }

  state.open.add(container);
  try {
    // Every structural observation of caller-owned state happens inside this block. A container
    // whose structure cannot be observed without throwing has no readable content; it is refused
    // like any other unsupported form rather than escaping as an exception from a Kernel boundary.
    return Array.isArray(container)
      ? captureArray(container as readonly unknown[] & object, path, entered, state)
      : captureObject(container, path, entered, state);
  } catch (error) {
    state.issues.push({
      path,
      code: "unstable_representation",
      message: `observing this value's structure threw (${describe(error)}), so it presents no readable content`,
    });
    return REFUSED;
  } finally {
    state.open.delete(container);
  }
}

/** The array half of `capture`. Positions come from own data properties below `length`, only. */
function captureArray(container: readonly unknown[] & object, path: string, entered: number, state: CaptureState): Captured {
  // Arrays must be genuine arrays: a subclass instance or a re-prototyped array would
  // canonicalize as a plain array and lose its exotic identity, so refuse it instead.
  if (PrimordialGetPrototypeOf(container) !== Array.prototype) {
    state.issues.push({ path, code: "unsupported_form", message: `expected a plain array, received ${describe(container)}` });
    return REFUSED;
  }

  // `length` decides which positions exist, so it is held to the same one-stable-structure rule as
  // any other member before it is trusted to bound the loop.
  const lengthDescriptor = PrimordialGetOwnPropertyDescriptor(container, "length");
  const lengthRead: unknown = (container as { length: unknown }).length;
  if (
    lengthDescriptor === undefined ||
    !("value" in lengthDescriptor) ||
    !Object.is(lengthDescriptor.value, lengthRead) ||
    typeof lengthRead !== "number"
  ) {
    state.issues.push({
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
    state.issues.push({
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
  // effect that overwrites a global cannot steer the rest of this observation.
  const names = PrimordialGetOwnPropertyNames(container) as string[];
  const extra = names.filter((name) => name !== "length" && !isArrayIndex(name));
  if (extra.length > 0 || Object.getOwnPropertySymbols(container).length > 0) {
    state.issues.push({ path, code: "unrepresentable_member", message: "array has own members outside its indices, which canonical form would silently drop" });
    refused = true;
  }

  // K11-R2-VAL-02 supplement: a canonical-index own name at or beyond the stable observed
  // length is neither `extra` above nor visited by the position loop below, so without this
  // check it would disappear into an accepted `[]`. Every observed own name must either cohere
  // with accepted array content or refuse. A listed index with no backing descriptor has no
  // property behind the listing (`unstable_representation`, like the object half); a backed
  // index outside `length` is state canonical array form would silently drop
  // (`unrepresentable_member`). Both refuse; neither is normalized.
  for (const name of names) {
    if (name === "length" || !isArrayIndex(name)) continue;
    const numeric = Number(name);
    if (numeric >= length) {
      const backing = PrimordialGetOwnPropertyDescriptor(container, name);
      if (backing === undefined) {
        state.issues.push({
          path: element(path, numeric),
          code: "unstable_representation",
          message: "array lists an own index it does not own, so its structure has no single reading",
        });
      } else {
        state.issues.push({
          path: element(path, numeric),
          code: "unrepresentable_member",
          message: "array has an own index outside its length, which canonical form would silently drop",
        });
      }
      refused = true;
    }
  }

  const captured: Captured[] = new Array<Captured>(length);
  for (let index = 0; index < length; index += 1) {
    const where = element(path, index);
    const key = String(index);
    const member = describedValue(container, key, PrimordialGetOwnPropertyDescriptor(container, key), where, state);
    if (!member.ok) {
      refused = true;
      continue;
    }
    if (member.value === undefined) {
      state.issues.push({ path: where, code: "undefined_member", message: "array element is undefined; an array has no absent positions" });
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
  const out: BoundaryValue[] = new Array<BoundaryValue>(length);
  for (let index = 0; index < length; index += 1) {
    // `defineProperty`, never assignment, for the same reason the object half uses it: the key is
    // installed as own data whatever it spells.
    PrimordialDefineProperty(out, String(index), { value: captured[index] as BoundaryValue, writable: false, enumerable: true, configurable: false });
  }
  return Object.freeze(out) as unknown as BoundaryValue[];
}

/** The object half of `capture`. Members come from own enumerable string-keyed data properties. */
function captureObject(container: object, path: string, entered: number, state: CaptureState): Captured {
  const prototype = PrimordialGetPrototypeOf(container) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    state.issues.push({ path, code: "unsupported_form", message: `expected a plain object, received ${describe(container)}` });
    return REFUSED;
  }

  let refused = false;
  if (Object.getOwnPropertySymbols(container).length > 0) {
    state.issues.push({ path, code: "unrepresentable_member", message: "object has symbol-keyed members, which canonical form cannot represent" });
    refused = true;
  }

  // One own-names observation and one descriptor per name. The same descriptor answers "is this
  // member enumerable?" and "what does this member own?", so those two questions cannot be settled
  // from different readings of the same object.
  const names = PrimordialGetOwnPropertyNames(container) as string[];
  const enumerable: [string, PropertyDescriptor][] = [];
  let nonEnumerable = false;
  for (const name of names) {
    const descriptor = PrimordialGetOwnPropertyDescriptor(container, name);
    if (descriptor === undefined) {
      // The object listed an own name it does not own. There is no content behind it to accept.
      state.issues.push({
        path: child(path, name),
        code: "unstable_representation",
        message: "object lists an own member it does not own, so its structure has no single reading",
      });
      refused = true;
      continue;
    }
    if (descriptor.enumerable) enumerable.push([name, descriptor]);
    else nonEnumerable = true;
  }
  if (nonEnumerable) {
    state.issues.push({ path, code: "unrepresentable_member", message: "object has non-enumerable own members, which canonical form would silently drop" });
    refused = true;
  }
  if (enumerable.length > BOUNDARY_LIMITS.containerEntries) {
    state.issues.push({
      path,
      code: "too_many_entries",
      message: `object has ${enumerable.length} members, above the limit of ${BOUNDARY_LIMITS.containerEntries}`,
    });
    refused = true;
  }

  const captured: [string, BoundaryValue][] = [];
  for (const [key, descriptor] of enumerable) {
    const where = child(path, key);
    if (!isWellFormed(key)) {
      state.issues.push({ path: where, code: "lone_surrogate", message: "member name contains an unpaired surrogate" });
      refused = true;
      continue;
    }
    const nameLength = scalarValueCount(key);
    if (nameLength > BOUNDARY_LIMITS.stringScalarValues) {
      state.issues.push({
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
      state.issues.push({
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
    captured.push([key, item]);
  }

  if (refused) return REFUSED;
  // The snapshot preserves the validated prototype (`Object.prototype` or `null`) and installs every
  // member with `defineProperty`, never assignment. Plain assignment `snapshot[name] = ...` invokes
  // the inherited legacy `__proto__` setter for that one key instead of creating an own data
  // property: a valid own `"__proto__"` member would vanish from the record, its value would
  // silently become the snapshot's prototype, and the retained structure would stop matching the
  // canonical bytes taken from it (K02-R2-02, K11-R1-VAL-01). `defineProperty` gives no member name
  // special treatment.
  const snapshot = Object.create(prototype) as Record<string, BoundaryValue>;
  for (const [name, member] of captured) {
    PrimordialDefineProperty(snapshot, name, { value: member, writable: false, enumerable: true, configurable: false });
  }
  return Object.freeze(snapshot);
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
 * The clone derives solely from the accepted logical snapshot, and the unmodified dependency sees
 * only the clone. Canonical bytes therefore cannot be derived from inherited/ambient hooks or any
 * other state outside the snapshot, while the dependency itself is used exactly as published.
 */
function toSerializationSafe(value: BoundaryValue): BoundaryValue {
  if (value === null) return null;
  const kind = typeof value;
  if (kind === "boolean" || kind === "number" || kind === "string") return value;
  if (Array.isArray(value)) {
    const lengthDescriptor = PrimordialGetOwnPropertyDescriptor(value, "length");
    const length =
      lengthDescriptor !== undefined && "value" in lengthDescriptor && typeof lengthDescriptor.value === "number"
        ? lengthDescriptor.value
        : (value as unknown[]).length;
    const out: unknown[] = new Array(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = PrimordialGetOwnPropertyDescriptor(value, String(index));
      // Snapshots are dense own-data by construction; a missing descriptor here is unreachable.
      // Fall back to `undefined` rather than an ordinary read so no prototype is ever consulted.
      const child: BoundaryValue =
        descriptor !== undefined && "value" in descriptor ? (descriptor.value as BoundaryValue) : (undefined as unknown as BoundaryValue);
      PrimordialDefineProperty(out, String(index), {
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
        lengthDescriptorInner !== undefined && "value" in lengthDescriptorInner && typeof lengthDescriptorInner.value === "number"
          ? lengthDescriptorInner.value
          : self.length;
      const result: unknown[] = new Array(innerLength);
      for (let innerIndex = 0; innerIndex < innerLength; innerIndex += 1) {
        const innerDescriptor = PrimordialGetOwnPropertyDescriptor(self, String(innerIndex));
        const innerValue = innerDescriptor !== undefined && "value" in innerDescriptor ? innerDescriptor.value : undefined;
        result[innerIndex] = callback(innerValue, innerIndex, self);
      }
      return result;
    };
    PrimordialDefineProperty(out, "map", { value: safeMap, writable: true, enumerable: false, configurable: true });
    return out as unknown as BoundaryValue;
  }
  const out: Record<string, BoundaryValue> = Object.create(null);
  for (const key of PrimordialObjectKeys(value) as string[]) {
    const descriptor = PrimordialGetOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) continue;
    PrimordialDefineProperty(out, key, {
      value: toSerializationSafe(descriptor.value as BoundaryValue),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  return out as unknown as BoundaryValue;
}

function encode(value: BoundaryValue): string {
  const canonical = canonicalizeJcs(toSerializationSafe(value)) as string | undefined;
  if (typeof canonical !== "string") throw new Error("JCS implementation returned no canonical form for a validated boundary value");
  return canonical;
}

/**
 * The whole acceptance path, run once: capture, canonicalize the capture, measure its bytes.
 *
 * Both public entry points go through this, so "what was refused" and "what was accepted" can never
 * be answered by two different passes over the caller's object.
 */
function accept(value: unknown): { readonly ok: true; readonly value: CanonicalValue } | { readonly ok: false; readonly issues: ValueIssue[] } {
  const state: CaptureState = { issues: [], open: new Set() };
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

  const canonical = encode(snapshot);
  const canonicalBytes = Buffer.byteLength(canonical, "utf8");
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
  return { ok: true, value: Object.freeze({ value: snapshot, canonical, canonicalBytes }) };
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
