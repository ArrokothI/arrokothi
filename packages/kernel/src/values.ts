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
 * One observation is also not enough on its own: the pass has to be able to *hold* what it observed.
 * An ordinary indexed write into a position a list does not own yet is `[[Set]]`, which consults the
 * prototype chain, so a caller-installed accessor at `Array.prototype["20"]` could swallow the
 * element the pass had just accepted and answer the read that built the snapshot from its own
 * getter — a coherent caller array reading `20` at that position could be retained and canonicalized
 * as `999`. Every internal list between the observation and the frozen snapshot is therefore built
 * and read as own data through `own-array.ts`, and the array half installs each accepted element
 * directly into the snapshot rather than into a scratch array it reads back (K11-R6-VAL-04).
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
 * 3. **Each root is measured on its own.** `values.md`, "Fixed semantic limits": "Two sibling roots
 *    of about 700 KiB each, in one Outcome, both pass." Callers pass one root at a time.
 * 4. **Refusing costs no more than accepting.** A live object can hold one member in many places,
 *    which JSON text cannot: thirty-two arrays, each holding the next one twice, pass the depth limit
 *    and stand for a value of over four billion arrays. The capture pass therefore keeps the root's
 *    canonical byte count *while* it reads, counting every occurrence in full, and stops reading once
 *    that count passes the size limit. Before this, the limit was checked only on the finished
 *    canonical string, so such a value was expanded in full — time and memory doubling per level —
 *    before it could be refused. The count is exact for content that is accepted, so it never refuses
 *    a value the finished-bytes check would accept; that check stays as well.
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

import { appendOwn, defineAt, defineData, readAt, restoreDescriptor, sizedList, truncateOwn } from "./own-array.ts";

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
const PrimordialGetPrototypeOf = Object.getPrototypeOf;
/**
 * Load-time `Object.setPrototypeOf`, for pinning the prototype-chain shape (R2-BLOCKING).
 *
 * Removing own index-named properties from `Array.prototype`/`Object.prototype` is not enough:
 * `Object.setPrototypeOf(Array.prototype, hostile)` inserts a hostile object *between* the two
 * holders, and the unmodified dependency's `parts.push(...)` — `[[Set]]` on a position `parts`
 * does not own — walks the whole chain and lands in the inserted object instead. The window
 * therefore resets every prototype link on the dependency's paths to its load-time shape for the
 * exact call. Captured at load, before any caller code runs.
 */
const PrimordialSetPrototypeOf = Object.setPrototypeOf;
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
/**
 * The holder of the `next` method the exact JCS call reads, and its own prototype.
 *
 * `canonicalize@3.0.0` iterates `for (const key of Object.keys(object).sort())`. That is a
 * two-step ambient read, not one: `GetMethod(sorted, Symbol.iterator)` — covered by the
 * `Array.prototype[Symbol.iterator]` slot — followed by `GetV(iterator, "next")` on every step,
 * which resolves through this prototype, and then `GetV(result, "done"/"value")` on each
 * iteration result, which resolves through `Object.prototype`. Restoring the iterator-producing
 * function while leaving a caller-mutated `next` in place lets an observation-time side effect
 * choose which keys the serializer sees — omit, substitute, duplicate — so canonical bytes and
 * byte size describe a different logical value than the retained snapshot (K11-R16-VAL-01).
 * Captured at load, before any caller code runs.
 */
const PrimordialArrayIteratorPrototype: object = PrimordialGetPrototypeOf(
  PrimordialReflectApply(PrimordialArrayIterator, [], []) as object,
) as object;
const PrimordialArrayIteratorNext: unknown = (PrimordialArrayIteratorPrototype as { readonly next: unknown }).next;
const PrimordialIteratorPrototype: object = PrimordialGetPrototypeOf(PrimordialArrayIteratorPrototype) as object;
/**
 * The load-time prototype-chain shape on every path the exact JCS call walks (R2-BLOCKING).
 *
 * `inheritedIndexShadows` removes own index-named properties from `Array.prototype` and
 * `Object.prototype`, but a capture-time side effect can instead *insert* a hostile object between
 * them with `Object.setPrototypeOf(Array.prototype, hostile)`: the dependency's
 * `parts.push(...)` is `[[Set]]` on a position the fresh array does not own, so it walks the whole
 * chain — `parts` → `Array.prototype` (no own index, removed) → hostile (answers) — and a later
 * `join` reads the attacker's values back. `canonicalize({b:2,a:1})` then binds
 * `{"pwned":9,"pwned":9}` for a retained snapshot of `{a:1,b:2}`. The same insertion above
 * `Object.prototype` would answer the per-result `done`/`value` reads, and insertions on the
 * iterator/set chains would sit on the `next`/`has` paths beside the restored slots.
 *
 * These are the shapes the window resets to for the exact call and hands back afterwards. A host
 * that made a link unresettable (non-extensible holder) degrades to the same located
 * `unstable_representation` refusal as a non-configurable slot: never wrong bytes.
 */
const PrimordialArrayPrototypeProto: object | null = PrimordialGetPrototypeOf(PrimordialArrayPrototype) as object | null;
const PrimordialObjectPrototypeProto: object | null = PrimordialGetPrototypeOf(PrimordialObjectPrototype) as object | null;
const PrimordialArrayIteratorPrototypeProto: object | null = PrimordialGetPrototypeOf(PrimordialArrayIteratorPrototype) as object | null;
const PrimordialIteratorPrototypeProto: object | null = PrimordialGetPrototypeOf(PrimordialIteratorPrototype) as object | null;
const PrimordialSetPrototypeProto: object | null = PrimordialGetPrototypeOf(PrimordialSetPrototype) as object | null;
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

/**
 * `values.md`, "Fixed semantic limits". All four apply together.
 *
 * Frozen at load time, through the load-time reference. `as const` is a compile-time claim only,
 * and every limit below is read from this object at the moment a value is checked — so without the
 * freeze an ordinary caller could raise `containerEntries` or `canonicalBytes` on the exported
 * object and the next boundary call would enforce the caller's limit instead of the published one.
 * Self-found while auditing caller-mutable ambient state for K11-R6-STATE-02/VAL-04; it is the same
 * family (a Kernel decision that reads mutable state a caller can reach), not a reviewer finding.
 */
export const BOUNDARY_LIMITS = PrimordialObjectFreeze({
  /** Unicode scalar values per individual decoded string value or object member name. */
  stringScalarValues: 65_536,
  /** Direct children of one array or one object. */
  containerEntries: 4_096,
  /** Recursive depth of each root: scalar 0, empty container 1, otherwise 1 + max(child). */
  containerDepth: 32,
  /** Canonical UTF-8 bytes of each root, measured independently of its siblings. */
  canonicalBytes: 1_048_576,
} as const);

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
 * Exact canonical bytes of a well-formed string: its two quotes plus its rule-4 escaped UTF-8 body.
 *
 * This is the byte count the JCS implementation's `JSON.stringify` spelling produces, computed
 * without producing it, so the capture pass can charge a string against the size limit before any
 * serialization runs. Called only after `isWellFormed` passed, so a high surrogate always has its
 * pair. Same discipline as the two scans above.
 */
const canonicalStringBytes = (input: string): number => {
  let bytes = 2;
  for (let index = 0; index < input.length; index += 1) {
    const unit = PrimordialReflectApply(PrimordialStringCharCodeAt, input, [index]) as number;
    if (unit < 0x20) {
      // `\b`, `\t`, `\n`, `\f`, `\r` are two bytes; every other C0 control is the six-byte `\u00xx`.
      bytes += unit === 0x08 || unit === 0x09 || unit === 0x0a || unit === 0x0c || unit === 0x0d ? 2 : 6;
    } else if (unit === 0x22 || unit === 0x5c) {
      bytes += 2;
    } else if (unit < 0x80) {
      bytes += 1;
    } else if (unit < 0x800) {
      bytes += 2;
    } else if (unit >= 0xd800 && unit <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }
  return bytes;
};

/**
 * Records one located reason this value is not acceptable.
 *
 * Through `appendOwn`, not `push` and not `list[list.length] = issue`. Issue lists are built while
 * caller traps are still running, and both of those are `[[Set]]` on a position the list does not
 * own yet: an inherited `Array.prototype` indexed setter installed by an earlier trap in the same
 * pass swallows the issue and leaves a hole that a later read answers from the attacker's getter,
 * so the reason a value was refused would be the attacker's text (K11-R6-VAL-04). `own-array.ts`
 * owns why the replacement is structural rather than another captured method.
 */
const pushIssue = (issues: ValueIssue[], issue: ValueIssue): void => {
  appendOwn(issues, issue);
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
  /**
   * Canonical bytes of everything read so far, every occurrence of a shared member counted in full.
   *
   * For content that is accepted, each charge is one disjoint part of the root's canonical form —
   * brackets, commas and colons when a container's structure is observed, a member name's quoted
   * bytes, a scalar's spelling — so the count only ever grows toward the exact canonical size and
   * never past it. Content that is refused for another reason is charged for the work of reading it
   * (a refused string's length, a container's surplus names), which can only add to a count on a
   * value that is refused anyway.
   */
  bytes: number;
  /** Set once `bytes` passes the size limit; from then on nothing further is read. */
  stopped: boolean;
}

/**
 * Adds `bytes` to the root's running canonical size and reports whether reading may continue.
 *
 * The first time the count passes the limit, one root-located `too_many_bytes` issue is recorded and
 * the pass stops: every later `capture` returns at once and every container loop ends. The reported
 * size is a lower bound — the part of the value read before stopping — which is the point: nothing
 * past the limit is read, so the refusal costs no more than a value at the limit would. `state` is a
 * Kernel-created literal and `bytes`/`stopped` are its own data properties, so these writes consult
 * no prototype.
 */
const charge = (state: CaptureState, bytes: number): boolean => {
  if (state.stopped) return false;
  state.bytes += bytes;
  if (state.bytes > BOUNDARY_LIMITS.canonicalBytes) {
    state.stopped = true;
    pushIssue(state.issues, {
      path: "",
      code: "too_many_bytes",
      message: `canonical form reaches at least ${state.bytes} bytes, above the per-root limit of ${BOUNDARY_LIMITS.canonicalBytes}; the rest of the value was not read`,
    });
    return false;
  }
  return true;
};

/**
 * Canonical bytes of a container's own punctuation: its two brackets, one comma between each pair of
 * entries and, for an object, one colon per member. Member names and values are charged separately.
 */
const containerStructureBytes = (entries: number, isObject: boolean): number =>
  entries === 0 ? 2 : 2 + (entries - 1) + (isObject ? entries : 0);

const isOpen = (state: CaptureState, container: object): boolean => {
  for (let index = 0; index < state.open.length; index += 1) {
    if (readAt(state.open, index) === container) return true;
  }
  return false;
};

const openContainer = (state: CaptureState, container: object): void => {
  appendOwn(state.open, container);
};

// The swap-with-last removal is an own write at a position the stack already owns, and the
// truncation is an own `length` write; neither reaches a prototype. It is still routed through
// `own-array.ts` so the whole stack — push, read and removal — obeys one rule rather than three
// separately argued ones (K11-R6-VAL-04).
const closeContainer = (state: CaptureState, container: object): void => {
  for (let index = 0; index < state.open.length; index += 1) {
    if (readAt(state.open, index) === container) {
      defineAt(state.open, index, readAt(state.open, state.open.length - 1) as object);
      truncateOwn(state.open, state.open.length - 1);
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
 * snapshot but does not stop its siblings from being examined — with one exception. Once the running
 * canonical size passes the limit (`charge`), reading stops outright, because examining the rest is
 * exactly the unbounded work the limit exists to prevent. Reasons past that point are not collected.
 */
function capture(value: unknown, path: string, level: number, state: CaptureState): Captured {
  if (state.stopped) return REFUSED;
  if (value === null) return charge(state, 4) ? null : REFUSED;

  const type = typeof value;
  if (type === "boolean") return charge(state, value === true ? 4 : 5) ? (value as boolean) : REFUSED;
  if (type === "number") {
    if (!PrimordialNumberIsFinite(value)) {
      pushIssue(state.issues, { path, code: "non_finite_number", message: "expected a finite number, received a non-finite number" });
      return REFUSED;
    }
    // A template literal applies the abstract `ToString` to a number primitive — the same
    // `Number::toString` spelling `JSON.stringify` emits for a finite number, `-0` as `0` — and
    // consults no prototype or global on the way.
    return charge(state, `${value as number}`.length) ? (value as number) : REFUSED;
  }
  if (type === "string") {
    const text = value as string;
    if (!isWellFormed(text)) {
      pushIssue(state.issues, { path, code: "lone_surrogate", message: "string contains an unpaired surrogate and has no UTF-8 encoding" });
      charge(state, text.length);
      return REFUSED;
    }
    const length = scalarValueCount(text);
    if (length > BOUNDARY_LIMITS.stringScalarValues) {
      pushIssue(state.issues, {
        path,
        code: "string_too_long",
        message: `string is ${length} Unicode scalar values, above the limit of ${BOUNDARY_LIMITS.stringScalarValues}`,
      });
      charge(state, text.length);
      return REFUSED;
    }
    return charge(state, canonicalStringBytes(text)) ? text : REFUSED;
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
  // uses index loops rather than `filter`/`for...of`/`push`, because `Array.prototype` methods
  // and `Symbol.iterator` are themselves mutable mid-pass. `names` is an engine-built list
  // (`CreateArrayFromList`, own data, dense), so its element reads are own reads.
  const names = PrimordialGetOwnPropertyNames(container) as string[];
  let hasExtra = false;
  for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
    const name = names[nameIndex] as string;
    if (name !== "length" && !isArrayIndex(name)) {
      hasExtra = true;
      break;
    }
  }
  const symbolCount = hasExtra ? 0 : PrimordialGetOwnPropertySymbols(container).length;
  if (hasExtra || symbolCount > 0) {
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

  // Charged before any element is read, so an occurrence of a shared array costs budget in
  // proportion to the listing just taken. An accepted array owns exactly its indices plus
  // `length`, so the surplus and symbol terms are zero for it and the charge is its exact
  // punctuation; they are non-zero only on an array already refused above.
  const surplus = names.length - (length + 1);
  if (!charge(state, containerStructureBytes(length, false) + (surplus > 0 ? surplus : 0) + symbolCount)) return REFUSED;

  // K11-R6-VAL-04: there is no scratch array between the one caller observation and the snapshot.
  //
  // The previous shape captured each accepted element into a holey `new Array(length)` with
  // ordinary assignment and read it back to build the snapshot. Both halves are ambient: the
  // assignment is `[[Set]]` into a position the scratch does not own, so an inherited
  // `Array.prototype` indexed setter installed during this value's own prototype observation
  // swallowed it, and the later read of that still-unowned position answered from the attacker's
  // getter. A coherent caller array whose element read *and* own descriptor both said `20` could
  // therefore be retained and canonicalized as `999`.
  //
  // Each accepted element is now installed directly into the snapshot as own data at the moment it
  // is captured. `defineAt` is `[[DefineOwnProperty]]`, so no prototype is consulted, and there is
  // no second reading of anything to disagree with the first. A refused position stops
  // contributing and the whole partially built array is discarded, exactly as before.
  const out: BoundaryValue[] = sizedList<BoundaryValue>(length);
  for (let index = 0; index < length; index += 1) {
    if (state.stopped) return REFUSED;
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
    defineAt(out, index, item as BoundaryValue);
  }

  if (refused) return REFUSED;
  // Freezing reduces every element installed above to the non-writable, non-configurable own data
  // the snapshot contract requires, and fixes `length` with it.
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
  const symbolCount = PrimordialGetOwnPropertySymbols(container).length;
  if (symbolCount > 0) {
    pushIssue(state.issues, { path, code: "unrepresentable_member", message: "object has symbol-keyed members, which canonical form cannot represent" });
    refused = true;
  }

  // One own-names observation and one descriptor per name. The same descriptor answers "is this
  // member enumerable?" and "what does this member own?", so those two questions cannot be settled
  // from different readings of the same object. Index loops, not `for...of`: the iterator lookup
  // is ambient and mutable mid-pass. `names` is engine-built (`CreateArrayFromList`), so it is
  // dense own data and its element reads consult no prototype; `enumerable` and `captured` below
  // are Kernel-grown and therefore go through `own-array.ts` in both directions.
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
    if (descriptor.enumerable) appendOwn(enumerable, [name, descriptor]);
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

  // Charged before any member is read, as for arrays. An accepted object's own names are exactly
  // its enumerable members and it owns no symbols, so this is its exact punctuation; a larger
  // listing, or any symbol, belongs to an object already refused above.
  if (!charge(state, containerStructureBytes(names.length, true) + symbolCount)) return REFUSED;

  const captured: [string, BoundaryValue][] = [];
  for (let entryIndex = 0; entryIndex < enumerable.length; entryIndex += 1) {
    if (state.stopped) return REFUSED;
    // Index access, not destructuring iteration: `for...of` over the pair would consult the
    // ambient `Symbol.iterator`.
    const pair = readAt(enumerable, entryIndex) as [string, PropertyDescriptor];
    const key = pair[0];
    const descriptor = pair[1];
    const where = child(path, key);
    if (!isWellFormed(key)) {
      pushIssue(state.issues, { path: where, code: "lone_surrogate", message: "member name contains an unpaired surrogate" });
      refused = true;
      if (!charge(state, key.length)) return REFUSED;
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
      if (!charge(state, key.length)) return REFUSED;
      continue;
    }
    // The member name's quoted, escaped bytes, exactly as the member will be spelled.
    if (!charge(state, canonicalStringBytes(key))) return REFUSED;
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
    appendOwn(captured, [key, item]);
  }

  if (refused) return REFUSED;
  // The snapshot preserves the validated prototype (`Object.prototype` or `null`) and installs every
  // member with `defineData` (`own-array.ts`), never assignment and never a descriptor literal.
  // Plain assignment `snapshot[name] = ...` invokes the inherited legacy `__proto__` setter for
  // that one key instead of creating an own data property: a valid own `"__proto__"` member would
  // vanish from the record, its value would silently become the snapshot's prototype, and the
  // retained structure would stop matching the canonical bytes taken from it (K02-R2-02,
  // K11-R1-VAL-01). `defineProperty` gives no member name special treatment — but an ordinary
  // descriptor literal would let inherited `get`/`set` pollution throw out of the installation, so
  // the descriptor is null-prototype (K11-R7-STATE-03).
  const snapshot = PrimordialObjectCreate(prototype) as Record<string, BoundaryValue>;
  for (let entryIndex = 0; entryIndex < captured.length; entryIndex += 1) {
    const pair = readAt(captured, entryIndex) as [string, BoundaryValue];
    defineData(snapshot, pair[0], pair[1], false, true, false);
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
    const out: unknown[] = sizedList<unknown>(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = PrimordialGetOwnPropertyDescriptor(value, `${index}`);
      // Snapshots are dense own-data by construction; a missing descriptor here is unreachable.
      // Fall back to `undefined` rather than an ordinary read so no prototype is ever consulted.
      const child: BoundaryValue =
        descriptor !== undefined && hasOwnValue(descriptor) ? (descriptor.value as BoundaryValue) : (undefined as unknown as BoundaryValue);
      defineAt(out, index, toSerializationSafe(child));
    }
    defineData(out, "toJSON", undefined, true, false, true);
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
      // `defineAt`, not `result[innerIndex] = ...`: this shadow runs while the JCS call is in
      // progress, and an ordinary indexed assignment into a not-yet-owned position of a fresh
      // array is `[[Set]]` — steerable by an inherited `Array.prototype` indexed accessor
      // (K11-R6-VAL-04). The surrounding window already removes those, so this is the second of
      // two independent layers rather than the only one.
      const result: unknown[] = sizedList<unknown>(innerLength);
      for (let innerIndex = 0; innerIndex < innerLength; innerIndex += 1) {
        const innerDescriptor = PrimordialGetOwnPropertyDescriptor(self, `${innerIndex}`);
        const innerValue = innerDescriptor !== undefined && hasOwnValue(innerDescriptor) ? innerDescriptor.value : undefined;
        defineAt(result, innerIndex, callback(innerValue, innerIndex, self));
      }
      return result;
    };
    defineData(out, "map", safeMap, true, false, true);
    return out as unknown as BoundaryValue;
  }
  const out: Record<string, BoundaryValue> = PrimordialObjectCreate(null);
  // Engine-built list: dense own data, so these element reads reach no prototype.
  const keys = PrimordialReflectApply(PrimordialObjectKeys, PrimordialObject, [value]) as string[];
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
    const key = keys[keyIndex] as string;
    const descriptor = PrimordialGetOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !hasOwnValue(descriptor)) continue;
    defineData(out, key, toSerializationSafe(descriptor.value as BoundaryValue), true, true, true);
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
 * | `for (const key of ...)` step | `GetV(iterator, "next")` on every step, resolving through the Array iterator prototype | `next` on the Array iterator prototype, restored to primordial |
 * | `for (const key of ...)` result | `GetV(result, "done")` / `GetV(result, "value")` on each iteration result, resolving through `Object.prototype` | own `next`/`value`/`done` removed from the iterator prototype and `Object.prototype` for the window |
 * | `object.toJSON` (own or inherited) | ordinary read on the input | neutralized structurally: the input is always the safe clone (null-prototype objects; arrays with an own non-enumerable `toJSON: undefined` shadow), never caller state and never a bare snapshot |
 * | `object.map(...)` (array branch) | ordinary read on the input | neutralized structurally: the clone's own non-enumerable `map` shadow (iterates own indices via primordials) |
 * | `object[key]` (object branch) | ordinary read on the input | neutralized structurally: the clone holds only own data copied from the snapshot's own descriptors |
 * | `seen.has/add/delete` | `Set.prototype` at call time | `Set.prototype` slots |
 * | `values.join(',')`, `parts.join(',')`, `parts.push(...)` | `Array.prototype` at call time (`values`/`parts` are arrays the dependency creates) | `Array.prototype.join/push` slots |
 * | `Object.keys(object).sort()` | `Array.prototype` at call time | `Array.prototype.sort` slot |
 * | `typeof`, `===`, template-literal spelling | language operators, not lookups | no slot needed |
 * | `parts.push(...)` / `values`/`parts` element reads behind `join` | `[[Set]]` and `[[Get]]` on the dependency's own scratch arrays, which consult `Array.prototype` then `Object.prototype` for positions those arrays do not own | neutralized structurally: `inheritedIndexShadows` removes every own index-named property from both prototypes for the call window (K11-R6-VAL-04), **and** `chainShape` resets every prototype link on those paths to its load-time shape, so an inserted object between or above the holders answers nothing (R2-BLOCKING) |
 * | iterator-protocol shadows above the holders the window restores | an own `next` on the iterator prototype or on `Object.prototype` would answer if the restored holder slot were ever deleted; own `value`/`done` on `Object.prototype` would answer the result reads directly | neutralized structurally: `prototypeNamedShadows` removes those own properties for the call window (K11-R16-VAL-01) |
 *
 * The table above names every ambient read the published implementation performs, including the
 * full iterator protocol (`GetMethod` for the iterator function, `GetV(iterator, "next")` per
 * step, `GetV(result, "done"/"value")` per result). In particular it never reads
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
    appendOwn(slots, { holder, key, primordial });
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
  slot(PrimordialArrayIteratorPrototype, "next", PrimordialArrayIteratorNext);
  slot(PrimordialSetPrototype, "has", PrimordialSetHas);
  slot(PrimordialSetPrototype, "add", PrimordialSetAdd);
  slot(PrimordialSetPrototype, "delete", PrimordialSetDelete);
  return slots;
};

/** One observed property position, with the descriptor that must be reinstalled after the call. */
type SavedSlot = {
  readonly holder: object;
  readonly key: string | symbol;
  readonly descriptor: PropertyDescriptor | undefined;
};

/** One observed prototype link, with the shape that must be reinstalled after the call. */
type SavedChain = {
  readonly holder: object;
  /** The prototype observed before the window, handed back afterwards. */
  readonly proto: object | null;
  /** The load-time shape, installed for the exact call. */
  readonly primordial: object | null;
};

/**
 * Every prototype link the exact JCS call can walk, with its load-time shape.
 *
 * The dependency's scratch arrays walk `parts` → `Array.prototype` → `Object.prototype` → null;
 * its key iteration walks `iterator` → Array iterator prototype → iterator prototype →
 * `Object.prototype` → null; its cycle guard walks `seen` → `Set.prototype` → …. An inserted
 * object on any of these links answers the `[[Set]]`/`[[Get]]` that reaches it, which no removal
 * of own properties from the two endpoint holders can prevent (R2-BLOCKING).
 */
const chainShape = (): SavedChain[] => {
  const chains: SavedChain[] = [];
  const link = (holder: object, primordial: object | null): void => {
    appendOwn(chains, { holder, proto: PrimordialGetPrototypeOf(holder) as object | null, primordial });
  };
  link(PrimordialArrayPrototype, PrimordialArrayPrototypeProto);
  link(PrimordialObjectPrototype, PrimordialObjectPrototypeProto);
  link(PrimordialArrayIteratorPrototype, PrimordialArrayIteratorPrototypeProto);
  link(PrimordialIteratorPrototype, PrimordialIteratorPrototypeProto);
  link(PrimordialSetPrototype, PrimordialSetPrototypeProto);
  return chains;
};

/**
 * Own index-named properties currently installed on the prototypes the dependency's own scratch
 * arrays inherit from, so the call window can run without them (K11-R6-VAL-04).
 *
 * The slot table above neutralizes every *named* ambient read the dependency performs. It cannot
 * neutralize this one, because this one is not a read of a named intrinsic at all. The exact
 * published implementation builds `const parts = []` and grows it with `parts.push(...)` before
 * `parts.join(',')`. `push` is `[[Set]]` on a position `parts` does not own yet, so an inherited
 * accessor at `Array.prototype["0"]` receives the write, leaves no element, and answers the
 * following `join` from its own getter — even with the primordial `push` and `join` reinstalled,
 * because the defect is the operation rather than which function performs it. A caller that
 * installs such an accessor from inside a boundary observation can therefore choose the canonical
 * bytes of an already-accepted snapshot outright, which is the identity the Kernel binds.
 *
 * Nothing about the adapter can fix that: the writes happen inside the unmodified dependency, which
 * is used exactly as published. What the Kernel controls is the environment it calls into, so the
 * window removes these positions and reinstalls them afterwards, the same save/neutralize/restore
 * discipline the named slots use. Both `Array.prototype` and `Object.prototype` are covered: an
 * array's `[[Set]]` walks the whole chain.
 *
 * No conforming host installs an own index-named property on either prototype, so in an undisturbed
 * process this finds nothing and changes nothing.
 *
 * If an attacker made such a position **non-configurable**, the `delete` throws and `accept`
 * contains it as a located `unstable_representation` refusal, with the named slots still handed back:
 * degraded availability, never wrong bytes. That is a committed case, run in a child process because
 * the pollution it installs is by definition permanent. The variant of it that is also non-writable
 * *data* is not the Kernel's to answer at all: Node's own internals assign to index positions of
 * ordinary arrays, so such a host is already broken before any Kernel boundary is reached.
 */
const inheritedIndexShadows = (): SavedSlot[] => {
  const shadows: SavedSlot[] = [];
  // A literal and an engine-built names list: both are own data at construction, so the reads below
  // are own reads. `shadows` is grown, so it goes through `own-array.ts`.
  const holders: object[] = [PrimordialArrayPrototype, PrimordialObjectPrototype];
  for (let holderIndex = 0; holderIndex < holders.length; holderIndex += 1) {
    const holder = holders[holderIndex] as object;
    const names = PrimordialGetOwnPropertyNames(holder) as string[];
    for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
      const name = names[nameIndex] as string;
      if (!isArrayIndex(name)) continue;
      appendOwn(shadows, { holder, key: name, descriptor: PrimordialGetOwnPropertyDescriptor(holder, name) });
    }
  }
  return shadows;
};

/**
 * Own iterator-protocol shadows above the holders the serializer window restores.
 *
 * Restoring the primordial `next` on the Array iterator prototype wins every `GetV(iterator,
 * "next")` lookup — unless that own slot were deleted, in which case an own `next` on the
 * iterator prototype or on `Object.prototype` would answer instead. And the per-result
 * `GetV(result, "done"/"value")` reads resolve through `Object.prototype` directly. No
 * conforming host installs own `next`/`value`/`done` on either of these prototypes, so in an
 * undisturbed process this finds nothing and changes nothing (K11-R16-VAL-01).
 *
 * An own `next` on `Array.prototype` itself needs no slot: nothing on the dependency's path
 * reads `GetV(arrayLike, "next")`, so it is never consulted.
 */
const prototypeNamedShadows = (): SavedSlot[] => {
  const shadows: SavedSlot[] = [];
  const holders: object[] = [PrimordialIteratorPrototype, PrimordialObjectPrototype];
  const names: string[] = ["next", "value", "done"];
  for (let holderIndex = 0; holderIndex < holders.length; holderIndex += 1) {
    const holder = holders[holderIndex] as object;
    for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
      const name = names[nameIndex] as string;
      const descriptor = PrimordialGetOwnPropertyDescriptor(holder, name);
      if (descriptor !== undefined) appendOwn(shadows, { holder, key: name, descriptor });
    }
  }
  return shadows;
};

/**
 * Runs `work` with the serializer execution environment restored to load-time primordials.
 *
 * A capture-time side effect can replace any slot above between the start of `capture` and this
 * call, install an indexed accessor on `Array.prototype`/`Object.prototype` that steers the
 * dependency's own `parts.push(...)`/`join` without replacing any named intrinsic (K11-R6-VAL-04),
 * replace the Array iterator prototype's `next` (or shadow the iterator result's `done`/`value`)
 * to steer the dependency's key iteration without replacing the iterator-producing function
 * (K11-R16-VAL-01), or *insert* a hostile object into the prototype chain itself with
 * `Object.setPrototypeOf`, so the dependency's `[[Set]]`/`[[Get]]` walks land in it past the two
 * cleaned holders (R2-BLOCKING). This window closes all four: it reinstalls the load-time
 * primordial for every named slot, removes every own index-named property from both prototypes as
 * well as the own iterator-protocol shadows above the restored holders, and resets every
 * prototype link on the dependency's paths to its load-time shape. Saving and
 * restoring through own-property descriptors (never through reads that would invoke an installed
 * getter/setter) keeps the swap itself from executing attacker code, and no caller-installed code
 * runs while the environment is installed: the safe clone holds only frozen plain data with no
 * traps, the restored `next` is the primordial one, and the prototype shadows that could answer
 * above or beside it are absent for the call. Canonical bytes produced inside are therefore a
 * function only of the clone — which is a function only of the snapshot — never of the ambient
 * mutation.
 *
 * The swap is temporary: the previously observed descriptors are reinstalled afterwards, so host
 * polyfills or unrelated host state outside these positions are left exactly as found. If the swap
 * itself fails (for example an attacker redefined a slot as non-configurable, or made an index
 * shadow non-configurable so removing it throws), the throw propagates to `accept`, which contains
 * it as a refusal: degraded availability, never wrong bytes and never a leaked ambient exception.
 */
function withSerializerEnvironment<T>(work: () => T): T {
  const slots = serializerSlots();
  const shadows = inheritedIndexShadows();
  const named = prototypeNamedShadows();
  for (let namedIndex = 0; namedIndex < named.length; namedIndex += 1) {
    appendOwn(shadows, readAt(named, namedIndex) as SavedSlot);
  }
  // Chain observation is own-state reporting like the descriptor saves above: `getPrototypeOf`
  // on these primordial holders reports without invoking any getter. Nothing is changed yet.
  const chains = chainShape();
  const saved: SavedSlot[] = [];
  // Observation first, and only through own-property descriptors: reading what is currently
  // installed cannot itself execute an installed getter. Nothing is changed yet, so this loop has
  // nothing to undo.
  for (let index = 0; index < slots.length; index += 1) {
    const entry = readAt(slots, index) as SandboxSlot;
    appendOwn(saved, {
      holder: entry.holder,
      key: entry.key,
      descriptor: PrimordialGetOwnPropertyDescriptor(entry.holder, entry.key),
    });
  }
  // Both mutations live inside the `try`, so a swap that fails part-way — an attacker who made one
  // slot or one index shadow non-configurable — still restores everything this call had changed
  // instead of leaving the process in the swapped state. The failure then propagates to `accept`
  // as a located refusal.
  try {
    for (let index = 0; index < slots.length; index += 1) {
      const entry = readAt(slots, index) as SandboxSlot;
      // `defineData`, not a descriptor literal: this installation runs after caller observation in
      // the same tick, so an inherited `get`/`set` on `Object.prototype` installed by that
      // observation would otherwise throw out of the swap itself (K11-R7-STATE-03). A
      // non-configurable slot still throws here, which `accept` contains as a refusal.
      defineData(entry.holder, entry.key, entry.primordial, true, false, true);
    }
    // The index shadows are removed after the named slots are installed and restored before them,
    // so the window in which the dependency runs has neither a replaced intrinsic nor an inherited
    // indexed accessor on the prototypes its own scratch arrays are built on. The chain links are
    // reset after the removals for the same reason: an inserted object between the holders would
    // otherwise still answer the walks. A reset that throws — the holder is non-extensible, so the
    // disturbed host is permanent — propagates to `accept` as a located refusal.
    for (let index = 0; index < shadows.length; index += 1) {
      const entry = readAt(shadows, index) as SavedSlot;
      delete (entry.holder as Record<string | symbol, unknown>)[entry.key];
    }
    for (let index = 0; index < chains.length; index += 1) {
      const entry = readAt(chains, index) as SavedChain;
      if (entry.proto !== entry.primordial) PrimordialSetPrototypeOf(entry.holder, entry.primordial);
    }
    return work();
  } finally {
    // Chain shape first: later restores run in the original shape, not the sanitized one.
    for (let index = chains.length - 1; index >= 0; index -= 1) {
      const entry = readAt(chains, index) as SavedChain;
      if (PrimordialGetPrototypeOf(entry.holder) !== entry.proto) PrimordialSetPrototypeOf(entry.holder, entry.proto);
    }
    for (let index = shadows.length - 1; index >= 0; index -= 1) {
      const entry = readAt(shadows, index) as SavedSlot;
      // `restoreDescriptor`, not the saved descriptor object itself: that object is ordinary, so an
      // inherited `value`/`writable` (against a saved accessor shadow) or `get`/`set` (against a
      // saved data shadow) on `Object.prototype` would otherwise throw out of the restoration and
      // leave the window unrestored behind the throw (K11-R7-STATE-03).
      if (entry.descriptor !== undefined) restoreDescriptor(entry.holder, entry.key, entry.descriptor);
    }
    for (let index = saved.length - 1; index >= 0; index -= 1) {
      const entry = readAt(saved, index) as SavedSlot;
      if (entry.descriptor === undefined) {
        // The slot did not exist when saved (an attacker deleted it): remove the installed
        // primordial again rather than inventing a property the host did not have.
        delete (entry.holder as Record<string | symbol, unknown>)[entry.key];
      } else {
        restoreDescriptor(entry.holder, entry.key, entry.descriptor);
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
  const state: CaptureState = { issues: [], open: [], bytes: 0, stopped: false };
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
  // The running count already refused anything over the limit, and for an accepted snapshot it equals
  // this length. The limit is still enforced on the bytes themselves, which are the definition; the
  // count is only what lets an over-limit value be refused without producing them.
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
