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
 * `values.md` says to reject unsupported values rather than repair them. So the capture pass refuses
 * every Proxy before observing it at all — the first observation of any object is the Proxy test, so
 * no trap runs (owner decision-01 item 2) — and refuses a built-in that keeps its content in internal
 * slots (a re-prototyped Map, Date, typed array, boxed primitive, …) by internal-slot type checks
 * before any own-key listing (decision-01 item 3). It also refuses any container whose own data
 * descriptor and ordinary property read disagree, whose array position is supplied by anything other
 * than an own data property, or whose structure cannot be observed at all. Those structural checks
 * predate the Proxy refusal and stay as a second line for host objects; all of these are
 * `unsupported_form`, `unstable_representation` and `undefined_member` refusals, not repairs.
 *
 * Further properties are deliberate and are the reason this is one module rather than a helper:
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
 * 4. **Reading stops at the byte limit.** A live object can hold one member in many places, which
 *    JSON text cannot: thirty-two arrays, each holding the next one twice, pass the depth limit and
 *    stand for a value of over four billion arrays. The capture pass therefore keeps the root's
 *    canonical byte count *while* it reads, counting every occurrence in full, and stops reading once
 *    that count passes the size limit. Before this, the limit was checked only on the finished
 *    canonical string, so such a value was expanded in full — time and memory doubling per level —
 *    before it could be refused. The count is exact for content that is accepted, so it never refuses
 *    a value the finished-bytes check would accept; that check stays as well. Within a single visit
 *    (KC2-R1-01) a string or member name is read only until its answer is settled — at most one scalar
 *    value past the length limit — and a container's own-names listing is classified only until it
 *    holds more names than an accepted container can own. Diagnostic storage stays bounded: eight
 *    bounded details per root, then exact counts per remaining code, with bounded path construction.
 *    Reading does not stop at eight issues.
 *
 *    The byte count bounds what is accepted, not the work of refusing. A refused position can charge
 *    no bytes at all (review 08 of K1.2-correction-01 measured refused containers at nesting depth
 *    costing more than any acceptance), so refusal cost has its own measure (`values.md` V-D1, owner
 *    decision-05):
 * 5. **Every root has a work meter.** Every observation of a caller value and every value-dependent
 *    piece of Kernel work is charged to the root's meter through the metered helpers below, and the
 *    root stops at the first unit past `CAPTURE_WORK_BUDGET` = 3 × the size limit, which no acceptable
 *    value can reach. Refusing a root therefore costs at most that budget plus one operation, whatever
 *    its shape, depth or sharing; `tests/capture-metering.test.ts` keeps capture code inside the helpers
 *    (K1.1-correction-03).
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

import { types as UtilTypes } from "node:util";

import { appendOwn, defineAt, defineData, readAt, restoreDescriptor, sizedList } from "./own-array.ts";

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

/**
 * The Proxy and internal-slot predicates, read once at load (owner decision-01 items 2–3).
 *
 * `util.types` reads the engine's object kind: it runs no trap and consults no prototype, global or
 * `Symbol.toStringTag`, and it recognizes revoked Proxies and cross-realm built-ins. Looking the
 * predicates up at call time would itself be a global hop, so each is captured here. `JSON.isRawJSON`
 * (ECMAScript 2026, missing from this repository's ES2023 type library, hence `JSONWithRawJSON`) tests the
 * `[[IsRawJSON]]` slot.
 */
const PrimordialIsProxy = UtilTypes.isProxy;
const PrimordialIsMap = UtilTypes.isMap;
const PrimordialIsSet = UtilTypes.isSet;
const PrimordialIsWeakMap = UtilTypes.isWeakMap;
const PrimordialIsWeakSet = UtilTypes.isWeakSet;
const PrimordialIsDate = UtilTypes.isDate;
const PrimordialIsRegExp = UtilTypes.isRegExp;
const PrimordialIsAnyArrayBuffer = UtilTypes.isAnyArrayBuffer;
const PrimordialIsArrayBufferView = UtilTypes.isArrayBufferView;
const PrimordialIsBoxedPrimitive = UtilTypes.isBoxedPrimitive;
const PrimordialIsNativeError = UtilTypes.isNativeError;
const PrimordialIsPromise = UtilTypes.isPromise;
const PrimordialIsGeneratorObject = UtilTypes.isGeneratorObject;
const PrimordialIsMapIterator = UtilTypes.isMapIterator;
const PrimordialIsSetIterator = UtilTypes.isSetIterator;
const PrimordialIsArgumentsObject = UtilTypes.isArgumentsObject;
const PrimordialIsModuleNamespaceObject = UtilTypes.isModuleNamespaceObject;
const PrimordialIsKeyObject = UtilTypes.isKeyObject;
const PrimordialIsCryptoKey = UtilTypes.isCryptoKey;
const PrimordialIsExternal = UtilTypes.isExternal;
interface JSONWithRawJSON extends JSON {
  readonly isRawJSON: (value: unknown) => boolean;
}
const PrimordialJSONWithRawJSON = PrimordialJSON as JSONWithRawJSON;
const PrimordialIsRawJSON = PrimordialJSONWithRawJSON.isRawJSON;

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
  /**
   * Not one of the six boundary forms: `undefined`, a symbol, a function, a class instance, any Proxy,
   * a built-in that keeps its content in internal slots (a Map, Date, typed array, boxed primitive, …), …
   */
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
  | "too_many_bytes"
  /**
   * Reading the value passed the root's work budget B (`CAPTURE_WORK_BUDGET`), which every acceptable
   * value stays within, so the value is refused and the rest of it is not read. Like `too_many_bytes`
   * it stops the root; the two are exclusive, so one root still reports at most eleven distinct codes.
   */
  | "too_much_work";

/** One reason a value is not an acceptable boundary value, located within that value. */
export interface ValueIssue {
  /** Dotted/bracketed path; `""` is the root on details, or no location on a counted suffix. */
  readonly path: string;
  readonly code: ValueIssueCode;
  readonly message: string;
  /** Counted suffix entry (no individual location); absent on the first eight details. */
  readonly occurrences?: number;
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

/**
 * A diagnostic label, never another observation of caller-owned state. Even an ordinary
 * constructor/name read can walk an unbounded prototype chain, and a thrown value can be a
 * Proxy or a revoked Proxy. Only language-level type classification is needed here. In
 * particular, do not inspect constructor, name, message, toStringTag or array/proxy structure.
 * The surrounding refusal identifies the failed form or observation; this label executes no caller code.
 */
const describe = (value: unknown): string => value === null ? "null" : typeof value;

// A fixed over-limit sentinel keeps omission sticky without confusing a caller's literal
// "<omitted>" member with the sentinel. No caller-sized path is ever concatenated.
const OMITTED_PATH = ".................................................................................................................................";
const child = (path: string, key: string): string =>
  path.length + key.length + (path === "" ? 0 : 1) > 128 ? OMITTED_PATH : path === "" ? key : `${path}.${key}`;
const element = (path: string, index: number): string => childElement(path, `[${index}]`);
const childElement = (path: string, suffix: string): string =>
  path.length + suffix.length > 128 ? OMITTED_PATH : `${path}${suffix}`;

/** Bounded diagnostics only; never used for accepted content or identity. */
const issueText = (text: string, limit: number, omitted: string): string => {
  if (text.length > limit) return omitted;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index]! < " " || text[index]! > "~") return omitted;
  }
  return text;
};

/**
 * What one bounded pass over a string found. `ok` carries the string's exact canonical bytes.
 *
 * Frozen singletons for the two refusals, so a refusal allocates nothing per string.
 */
type StringScan =
  | { readonly kind: "ok"; readonly bytes: number }
  | { readonly kind: "lone_surrogate" }
  | { readonly kind: "too_long" };
const LONE_SURROGATE: StringScan = PrimordialObjectFreeze({ kind: "lone_surrogate" } as const);
const TOO_LONG: StringScan = PrimordialObjectFreeze({ kind: "too_long" } as const);

/**
 * Checks well-formedness, counts Unicode scalar values and sizes the canonical form in one pass that
 * stops as soon as the string is known to be refused (KC2-R1-01).
 *
 * These were three full scans, all run before any charge against the size limit, so a
 * 33,554,432-character string cost 67,108,864 character reads before it was refused. This pass reads
 * code units only until the answer is settled: an unpaired surrogate ends it, and so does the 65,537th
 * scalar value, because a string that long is refused whatever follows. At most
 * `2 * (stringScalarValues + 1)` code units are ever read: one scalar value (at most two code
 * units) past the most an accepted string can need. A string refused for length is therefore
 * reported as longer than the limit, not by its exact length, and an unpaired surrogate past that
 * point is not reported; either way the string is refused.
 *
 * `values.md` rejects lone surrogates rather than repairing them, so well-formedness is checked here
 * rather than taken from `String.prototype.isWellFormed`, which is newer than the `ES2023` library this
 * repository compiles against. A high surrogate must be followed by a low one and a low surrogate must
 * never appear alone. The byte count is the one the JCS implementation's `JSON.stringify` spelling
 * produces, computed without producing it: rule-4 escapes, then UTF-8.
 *
 * `String.prototype.charCodeAt` is invoked through the load-time reference: a capture-time side effect
 * can replace the prototype method, and an index loop (not `for...of`, whose `Symbol.iterator` lookup
 * is itself ambient) keeps the scan independent of it.
 */
const scanBoundaryString = (input: string): StringScan => {
  const units = input.length;
  // Any valid scalar uses at most two UTF-16 units. A larger extent cannot fit the scalar
  // limit, regardless of its contents. Refuse before a character read can make the engine
  // flatten a caller-sized rope string. Remaining string extents and scalar reads are bounded.
  // This preflight also wins for malformed oversized text.
  if (units > 2 * BOUNDARY_LIMITS.stringScalarValues) return TOO_LONG;
  let scalars = 0;
  let bytes = 2;
  for (let index = 0; index < units; index += 1) {
    scalars += 1;
    if (scalars > BOUNDARY_LIMITS.stringScalarValues) return TOO_LONG;
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
      const next = index + 1 < units ? (PrimordialReflectApply(PrimordialStringCharCodeAt, input, [index + 1]) as number) : -1;
      if (next < 0xdc00 || next > 0xdfff) return LONE_SURROGATE;
      bytes += 4;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return LONE_SURROGATE;
    } else {
      bytes += 3;
    }
  }
  return { kind: "ok", bytes };
};

/**
 * Records one located reason this value is not acceptable.
 *
 * Through `appendOwn`, not `push` and not `list[list.length] = issue`. Issue lists are Kernel-grown, and
 * both of those are `[[Set]]` on a position the list does not own yet: an inherited `Array.prototype`
 * indexed setter would swallow the issue and leave a hole that a later read answers from the inherited
 * getter, so the reason a value was refused would be someone else's text (K11-R6-VAL-04). `own-array.ts`
 * owns why the replacement is structural rather than another captured method.
 *
 * Capture charges this as one diagnostic unit through `record`; the two stop issues are recorded here
 * directly and are the "plus one operation" of the work bound.
 */
const pushIssue = (issues: ValueIssue[], issue: ValueIssue): void => {
  // Keep every code occurrence, but never a per-position suffix object/path/message. This
  // collector is shared by ALL refusal sites, including pre-member structural observations.
  // Observation and the running byte budget are unchanged: later siblings still run.
  if (issues.length < 8) {
    appendOwn(issues, {
      path: issueText(issue.path, 128, "<omitted>"),
      code: issue.code,
      message: issueText(issue.message, 1_024, "<message omitted>"),
    });
    return;
  }
  for (let index = 8; index < issues.length; index += 1) {
    const entry = readAt(issues, index) as ValueIssue;
    if (entry.code === issue.code) {
      // Every suffix entry owns occurrences; no caller or inherited value is consulted.
      (entry as { occurrences: number }).occurrences += 1;
      return;
    }
  }
  appendOwn(issues, { path: "", code: issue.code, message: "additional occurrences (locations omitted)", occurrences: 1 });
};

/**
 * What a capture returns when the value at that position is not acceptable.
 *
 * A distinct sentinel rather than `undefined`, because `undefined` is itself one of the refused
 * things this pass reports. Every path that returns `REFUSED` has already recorded at least one
 * located issue, or a stop issue for the whole root.
 */
const REFUSED: unique symbol = Symbol("refused boundary value");
type Captured = BoundaryValue | typeof REFUSED;

/** What a metered helper returns once the root has stopped: nothing further is observed or charged. */
const STOPPED: unique symbol = Symbol("capture stopped");

/**
 * The work budget B of one root: the most units any acceptable value can consume, as a proven bound.
 *
 * `values.md`, fixed semantic limits: refusal cost is compared in metered Kernel work. Each unit below is
 * an abstract operation whose engine work is bounded by a constant that depends only on the four limits,
 * because no Proxy is ever observed (`capture` refuses every Proxy first) and no accessor is ever invoked.
 *
 * | Unit | Charged for | Units |
 * |---|---|---|
 * | visit | one visit of one value: classification, the Proxy test, the cycle and depth tests, the array test, the prototype observation, the internal-slot predicates, an array's `length` | 1 |
 * | listing | one own-key listing (names or symbols), right after it returns | 1 + its length |
 * | element | one array position: its own descriptor and its one ordinary read | 1 |
 * | descriptor | one object member's (or listed index's) own descriptor | 1 |
 * | read | one object member's ordinary read | 1 |
 * | string | scanning one string or member name of at most 131,072 UTF-16 units, before the scan | its length |
 * | diagnostic | recording one issue (bounded path, bounded message, at most eleven suffix codes) | 1 |
 *
 * **Derivation.** An accepted value's canonical form splits into disjoint per-node parts (brackets,
 * commas, colons and quoted names for a container, the spelling for a scalar), and each accepted node
 * costs at most three units per byte of its own part:
 * - an array of n ≥ 1 entries costs 1 + (1 + n + 1) + 1 + n = 2n + 4 units for n + 1 bytes, and 2n + 4 ≤ 3n + 3
 *   exactly when n ≥ 1; an empty array costs 4 units for 2 bytes;
 * - an object of n ≥ 1 members with name lengths ℓ costs 1 + (1 + n) + 1 + n + n + Σℓ = 3n + 3 + Σℓ units for at
 *   least 2n + 1 + Σ(ℓ + 2) bytes; an empty object costs 3 units for 2 bytes;
 * - a string of ℓ units costs 1 + ℓ for at least ℓ + 2 bytes; any other scalar costs 1 for at least 1 byte.
 * So an accepted value costs at most 3 × its canonical bytes ≤ 3 × 1,048,576. Units only grow during a
 * capture, so no acceptable value ever passes B at any point, and the meter never refuses a valid value.
 * B is a proven upper bound, not an attained maximum: the ratio 3 is reached only by singleton arrays,
 * and the depth limit forces leaves and fan-out (BASELINE `#value-refusal-diagnostics` records the
 * costliest witness and the gap).
 */
export const CAPTURE_WORK_BUDGET: number = 3 * BOUNDARY_LIMITS.canonicalBytes;

/** The string preflight: no valid string has more UTF-16 units than twice the scalar limit. */
const STRING_SCAN_LIMIT = 2 * BOUNDARY_LIMITS.stringScalarValues;

const PROXY_MESSAGE = "value is a Proxy; capture refuses every Proxy before observing it";
const BUILT_IN_MESSAGE = "expected a plain object, received a built-in object whose content is kept in internal slots";
const TOO_MUCH_WORK_MESSAGE = `reading this value passed the work budget of ${CAPTURE_WORK_BUDGET} units that bounds every acceptable value; the rest of the value was not read`;

interface CaptureState {
  readonly issues: ValueIssue[];
  /**
   * Containers currently on the path, by identity, so a self-reference is a cycle and not a hang.
   *
   * A Kernel-created `Set`, reached only through load-time references: constructed with the load-time
   * constructor and no iterable (so no adder lookup), and read and written only through the load-time
   * `has`/`add`/`delete` under the load-time `Reflect.apply`. No global binding or prototype is consulted
   * at call time (DEC-8). Only containers on the current path are open and descent stops one level past
   * the depth limit, so it never holds more than 32 entries: each operation is a constant bounded by the
   * depth limit, and a visit's work no longer grows with nesting depth (K12C1-R8-VALUE-DEPTH-01).
   */
  readonly open: Set<object>;
  /**
   * Canonical bytes of everything read so far, every occurrence of a shared member counted in full.
   *
   * For content that is accepted, each charge is one disjoint part of the root's canonical form —
   * brackets, commas and colons when a container's structure is observed, a member name's quoted
   * bytes, a scalar's spelling — so the count only ever grows toward the exact canonical size and
   * never past it. Content that is refused for another reason is charged for the work of reading it
   * (a refused string's length, a container's surplus names), which can only add to a count on a
   * value that is refused anyway. This is the semantic size limit; the work meter is `units`.
   */
  bytes: number;
  /** The work meter: every unit charged to this root (the per-kind counts below sum to it). */
  units: number;
  visitUnits: number;
  listingUnits: number;
  elementUnits: number;
  descriptorUnits: number;
  readUnits: number;
  stringUnits: number;
  diagnosticUnits: number;
  /** Which stop ended reading, if any: the byte limit or the work budget. They are exclusive. */
  stop: "none" | "bytes" | "work";
  /** Set once either stop fires; from then on nothing further is read or charged. */
  stopped: boolean;
}

type UnitKind = "visit" | "listing" | "element" | "descriptor" | "read" | "string" | "diagnostic";

/**
 * Charges `units` of one kind to the root's work meter and reports whether reading may continue.
 *
 * The first charge that takes the meter past B records one root-located `too_much_work` issue and stops
 * the root: every later helper returns at once and every container loop ends. Every charge is made
 * before the work it pays for, except a listing, which is charged right after it returns because its
 * length is not known before; that listing is the one operation a refusal may perform past B. `state` is
 * a Kernel-created literal and its counters are own data properties, so these writes consult no prototype.
 */
const spend = (state: CaptureState, kind: UnitKind, units: number): boolean => {
  if (state.stopped) return false;
  state.units += units;
  if (kind === "visit") state.visitUnits += units;
  else if (kind === "listing") state.listingUnits += units;
  else if (kind === "element") state.elementUnits += units;
  else if (kind === "descriptor") state.descriptorUnits += units;
  else if (kind === "read") state.readUnits += units;
  else if (kind === "string") state.stringUnits += units;
  else state.diagnosticUnits += units;
  if (state.units > CAPTURE_WORK_BUDGET) {
    state.stopped = true;
    state.stop = "work";
    pushIssue(state.issues, { path: "", code: "too_much_work", message: TOO_MUCH_WORK_MESSAGE });
    return false;
  }
  return true;
};

/** Records one located issue as one diagnostic unit; past B the stop issue is recorded instead. */
const record = (state: CaptureState, issue: ValueIssue): void => {
  if (spend(state, "diagnostic", 1)) pushIssue(state.issues, issue);
};

/**
 * Adds `bytes` to the root's running canonical size and reports whether reading may continue.
 *
 * The first time the count passes the limit, one root-located `too_many_bytes` issue is recorded and
 * the pass stops: every later `capture` returns at once and every container loop ends. The reported
 * size is a lower bound — the part of the value read before stopping. This is the semantic size limit
 * and is not a work charge: the work every read performs is charged to the meter (`spend`), whose
 * budget B bounds refusal cost (`values.md` V-D1, owner decision-05).
 */
const charge = (state: CaptureState, bytes: number): boolean => {
  if (state.stopped) return false;
  state.bytes += bytes;
  if (state.bytes > BOUNDARY_LIMITS.canonicalBytes) {
    state.stopped = true;
    state.stop = "bytes";
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

// -- Metered helpers ----------------------------------------------------------------------------
//
// These are the only functions that observe a caller value or grow value-dependent bookkeeping
// (`tests/capture-metering.test.ts` enforces it). Three kinds:
// - visit-covered: constant work, called at most once per visit and never inside a loop, paid by the
//   visit unit `capture` charges first;
// - charged: the first statement charges the unit (a listing charges its length right after it returns);
// - per-name: constant work on one listed name, called only inside loops bounded by a charged listing.

/** Whether an object or function is a Proxy. Reads only the engine's object kind; runs no trap. */
const isProxyValue = (value: object): boolean => PrimordialIsProxy(value);

/** Whether a container is open on the current path (cycle test), through the load-time `has`. */
const isOpenContainer = (state: CaptureState, container: object): boolean =>
  PrimordialReflectApply(PrimordialSetHas, state.open, [container]) as boolean;

const openContainer = (state: CaptureState, container: object): void => {
  PrimordialReflectApply(PrimordialSetAdd, state.open, [container]);
};

const closeContainer = (state: CaptureState, container: object): void => {
  PrimordialReflectApply(PrimordialSetDelete, state.open, [container]);
};

/** `IsArray` of a value already known not to be a Proxy, so it forwards nowhere and cannot throw. */
const isArrayValue = (container: object): boolean => PrimordialArrayIsArray(container);

/**
 * The observed prototype, through the load-time `getPrototypeOf`.
 *
 * Callers compare it with the load-time `Object.prototype`/`Array.prototype`, never a live global read
 * (K11-R5-VAL-03). For a non-Proxy value this reports the internal `[[Prototype]]` and runs nothing.
 */
const prototypeOf = (container: object): object | null => PrimordialGetPrototypeOf(container) as object | null;

/**
 * Whether a non-array object keeps content in internal slots: a built-in kind that a plain-object
 * snapshot would silently drop (owner decision-01 item 3; owner-decisions-02 extra check b).
 *
 * Internal-slot type checks only, never the prototype, a constructor name or `Symbol.toStringTag`: each
 * predicate reads the engine's object kind, so a re-prototyped or cross-realm built-in is recognized the
 * same way. Run only on an object whose prototype is plain, before any own-key listing, so a typed array
 * or String wrapper is refused without enumerating its indices (O-R8-3). Kinds with no non-throwing,
 * side-effect-free predicate in Node v26.10.0 are a declared limit (`values.md`).
 */
const isBuiltInWithSlots = (container: object): boolean =>
  PrimordialIsMap(container) ||
  PrimordialIsSet(container) ||
  PrimordialIsWeakMap(container) ||
  PrimordialIsWeakSet(container) ||
  PrimordialIsDate(container) ||
  PrimordialIsRegExp(container) ||
  PrimordialIsAnyArrayBuffer(container) ||
  PrimordialIsArrayBufferView(container) ||
  PrimordialIsBoxedPrimitive(container) ||
  PrimordialIsNativeError(container) ||
  PrimordialIsPromise(container) ||
  PrimordialIsGeneratorObject(container) ||
  PrimordialIsMapIterator(container) ||
  PrimordialIsSetIterator(container) ||
  PrimordialIsArgumentsObject(container) ||
  PrimordialIsModuleNamespaceObject(container) ||
  PrimordialIsKeyObject(container) ||
  PrimordialIsCryptoKey(container) ||
  PrimordialIsExternal(container) ||
  PrimordialIsRawJSON(container);

/**
 * An array's `length`, held to the one-stable-structure rule before it is trusted to bound the loop:
 * one own data descriptor and one ordinary read that agree on a number. `null` when they do not.
 */
const observeArrayLength = (container: object): number | null => {
  const lengthDescriptor = PrimordialGetOwnPropertyDescriptor(container, "length");
  const lengthRead: unknown = (container as { length: unknown }).length;
  if (
    lengthDescriptor === undefined ||
    !hasOwnValue(lengthDescriptor) ||
    !PrimordialObjectIs(lengthDescriptor.value, lengthRead) ||
    typeof lengthRead !== "number"
  ) {
    return null;
  }
  return lengthRead;
};

/**
 * The snapshot list for an array of `length` positions (at most the entry limit), visit-covered.
 *
 * There is no scratch array between the one caller observation and the snapshot (K11-R6-VAL-04): each
 * accepted element is installed directly into this list as own data with `defineAt`, so no inherited
 * indexed setter can swallow it and no second reading exists to disagree with the first.
 */
const allocateElements = (length: number): BoundaryValue[] => sizedList<BoundaryValue>(length);

/**
 * One own-names listing, charged `1 + length` right after it returns.
 *
 * `names` is engine-built (`CreateArrayFromList`), so it is dense own data and its element reads consult
 * no prototype. The listing itself is the one step whose engine work is not known before it runs
 * (`values.md`, the narrowed own-key exclusion): its charge stops the root if it passes B.
 */
const listOwnNames = (state: CaptureState, container: object): readonly string[] | typeof STOPPED => {
  const names = PrimordialGetOwnPropertyNames(container) as string[];
  return spend(state, "listing", 1 + names.length) ? names : STOPPED;
};

/** One own-symbols listing, charged `1 + length` right after it returns; only its count is used. */
const listOwnSymbols = (state: CaptureState, container: object): number | typeof STOPPED => {
  const symbols = PrimordialGetOwnPropertySymbols(container);
  return spend(state, "listing", 1 + symbols.length) ? symbols.length : STOPPED;
};

/** One array position, observed once: its own descriptor and, for own data, one ordinary read. */
interface ObservedPosition {
  readonly descriptor: PropertyDescriptor | undefined;
  readonly read: unknown;
}

const observeElement = (state: CaptureState, container: object, key: string): ObservedPosition | typeof STOPPED => {
  if (!spend(state, "element", 1)) return STOPPED;
  const descriptor = PrimordialGetOwnPropertyDescriptor(container, key);
  // An accessor or a missing position is refused from its descriptor; it is never read, so no getter runs.
  if (descriptor === undefined || !hasOwnValue(descriptor)) return { descriptor, read: undefined };
  return { descriptor, read: (container as Record<string, unknown>)[key] };
};

/** One own descriptor of a listed object member or listed array index. */
const observeDescriptor = (state: CaptureState, container: object, name: string): PropertyDescriptor | undefined | typeof STOPPED => {
  if (!spend(state, "descriptor", 1)) return STOPPED;
  return PrimordialGetOwnPropertyDescriptor(container, name);
};

/**
 * One object member's ordinary read, made only after its own descriptor said enumerable data.
 *
 * `{ read }` rather than the bare value, because `undefined` is itself a refused member value and must
 * stay distinguishable from the stop.
 */
const readMember = (state: CaptureState, container: object, key: string): { readonly read: unknown } | typeof STOPPED => {
  if (!spend(state, "read", 1)) return STOPPED;
  return { read: (container as Record<string, unknown>)[key] };
};

/**
 * Scans one string or member name, charging its length first.
 *
 * A string longer than twice the scalar limit cannot be valid whatever it holds, so it is refused by
 * its length alone: no character is read, the engine never flattens a caller-sized rope, and it costs
 * no string units (KC2-R1-01, SELF-R4-STRING-01). Otherwise the scan reads at most that many units.
 */
const scanText = (state: CaptureState, text: string): StringScan | typeof STOPPED => {
  const units = text.length;
  if (units > STRING_SCAN_LIMIT) return TOO_LONG;
  if (!spend(state, "string", units)) return STOPPED;
  return scanBoundaryString(text);
};

/** The frozen snapshot of an accepted array, installed element by element above. */
const finishArray = (out: BoundaryValue[]): BoundaryValue => PrimordialObjectFreeze(out) as unknown as BoundaryValue;

/**
 * The frozen snapshot of an accepted object, with the validated prototype (`Object.prototype` or `null`).
 *
 * Every member is installed with `defineData` (`own-array.ts`), never assignment and never a descriptor
 * literal. Plain assignment `snapshot[name] = ...` invokes the inherited legacy `__proto__` setter for
 * that one key instead of creating an own data property: a valid own `"__proto__"` member would vanish
 * from the record, its value would silently become the snapshot's prototype, and the retained structure
 * would stop matching the canonical bytes taken from it (K02-R2-02, K11-R1-VAL-01). `defineProperty`
 * gives no member name special treatment — but an ordinary descriptor literal would let inherited
 * `get`/`set` pollution throw out of the installation, so the descriptor is null-prototype (K11-R7-STATE-03).
 */
const finishObject = (prototype: object | null, captured: readonly (readonly [string, BoundaryValue])[]): BoundaryValue => {
  const snapshot = PrimordialObjectCreate(prototype) as Record<string, BoundaryValue>;
  for (let entryIndex = 0; entryIndex < captured.length; entryIndex += 1) {
    const pair = readAt(captured, entryIndex) as readonly [string, BoundaryValue];
    defineData(snapshot, pair[0], pair[1], false, true, false);
  }
  return PrimordialObjectFreeze(snapshot);
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
 * method: all three are ambient reads. Digit spelling is checked by code-unit comparison (safe
 * internal ordering on single characters, no method lookup); the range bound uses length plus a
 * lexicographic comparison, which agrees with the numeric comparison for equal-length digit strings.
 * `"4294967295"` (length 10, above `"4294967294"`) is therefore excluded exactly as the definition
 * requires. Per-name work: at most ten reads, paid by the listing that produced the name.
 */
const isArrayIndex = (name: string): boolean => {
  // Length first, so a caller-supplied name of any size is classified after at most ten reads.
  if (name.length === 0 || name.length > 10) return false;
  for (let index = 0; index < name.length; index += 1) {
    const unit = name[index] as string;
    if (unit < "0" || unit > "9") return false;
  }
  if (name.length > 1 && (name[0] as string) === "0") return false;
  if (name.length === 10 && name > "4294967294") return false;
  return true;
};

/**
 * Numeric value of a name `isArrayIndex` already accepted.
 *
 * No `Number` global read: the spelling is already known to be canonical digits in range, so a
 * positional accumulation over code units (via the load-time `charCodeAt`) is exact. Per-name work.
 */
const arrayIndexValue = (name: string): number => {
  let value = 0;
  for (let index = 0; index < name.length; index += 1) {
    value = value * 10 + ((PrimordialReflectApply(PrimordialStringCharCodeAt, name, [index]) as number) - 48);
  }
  return value;
};

// -- The traversal ------------------------------------------------------------------------------
//
// No function below observes a caller value except through the helpers above, and none holds a caller
// value in anything but `unknown`/`object`, so strict TypeScript rejects a member read of one here.

/**
 * One member's value, or a refusal, from the one descriptor and the one read already taken.
 *
 * `descriptor.value` is the structural fact — what the object *owns* — and `read` is what ordinary
 * property access, including the JCS implementation's own member access, would see. On an ordinary
 * object these are the same thing by construction. Where they differ, the value has no single
 * content: one reading would decide identity and the other would be retained. `values.md` rejects
 * unsupported values rather than repairing them, so the disagreement is refused and neither reading
 * is preferred. An accessor or a missing position was never read.
 */
function checkMember(
  descriptor: PropertyDescriptor | undefined,
  read: unknown,
  path: string,
  state: CaptureState,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  if (descriptor === undefined) {
    // The structure said this member exists — an own-names listing, or an array position below
    // `length` — but it owns no property there. Anything a read would return comes from somewhere
    // else (a prototype), so there is no own content to accept.
    record(state, {
      path,
      code: "undefined_member",
      message: "position has no own property; a value supplied only through a prototype or a dynamic read is not accepted content",
    });
    return { ok: false };
  }
  if (!hasOwnValue(descriptor)) {
    record(state, { path, code: "unrepresentable_member", message: "member is an accessor, which canonical form cannot represent" });
    return { ok: false };
  }
  if (!PrimordialObjectIs(descriptor.value, read)) {
    record(state, {
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
 * Every visit is charged one unit first. The first observation of an object-typed value is the Proxy
 * test, before `IsArray` (which forwards through a Proxy's target), before the prototype and before
 * any descriptor or key, so every Proxy at every depth is refused with no trap run (owner decision-01
 * item 2). Then cycle, depth and foreign forms are classified in that order, as before.
 *
 * Refusals are collected rather than thrown: eight bounded located details, followed by exact
 * counts for every remaining code. A refused position stops contributing to the snapshot but does
 * not stop its siblings from being examined — until a stop: once the running canonical size passes
 * the limit (`charge`) or the work meter passes B (`spend`), reading stops outright. Reasons past a
 * stop are not collected; counts describe the positions examined.
 */
function capture(value: unknown, path: string, level: number, state: CaptureState): Captured {
  if (state.stopped) return REFUSED;
  if (!spend(state, "visit", 1)) return REFUSED;
  if (value === null) return charge(state, 4) ? null : REFUSED;
  if (typeof value === "boolean") return charge(state, value ? 4 : 5) ? value : REFUSED;
  if (typeof value === "number") {
    if (!PrimordialNumberIsFinite(value)) {
      record(state, { path, code: "non_finite_number", message: "expected a finite number, received a non-finite number" });
      return REFUSED;
    }
    // A template literal applies the abstract `ToString` to a number primitive — the same
    // `Number::toString` spelling `JSON.stringify` emits for a finite number, `-0` as `0` — and
    // consults no prototype or global on the way.
    return charge(state, `${value}`.length) ? value : REFUSED;
  }
  if (typeof value === "string") {
    const scan = scanText(state, value);
    if (scan === STOPPED) return REFUSED;
    if (scan.kind === "lone_surrogate") {
      record(state, { path, code: "lone_surrogate", message: "string contains an unpaired surrogate and has no UTF-8 encoding" });
      charge(state, value.length);
      return REFUSED;
    }
    if (scan.kind === "too_long") {
      record(state, {
        path,
        code: "string_too_long",
        message: `string cannot fit within the limit of ${BOUNDARY_LIMITS.stringScalarValues} Unicode scalar values`,
      });
      // Charged at its full length, which is free to read and never less than the reading the scan
      // did, so repeated occurrences of one refused string exhaust the size budget quickly.
      charge(state, value.length);
      return REFUSED;
    }
    return charge(state, scan.bytes) ? value : REFUSED;
  }
  if ((typeof value === "object" || typeof value === "function") && isProxyValue(value)) {
    record(state, { path, code: "unsupported_form", message: PROXY_MESSAGE });
    return REFUSED;
  }
  if (typeof value !== "object") {
    record(state, { path, code: "unsupported_form", message: `expected a boundary value, received ${describe(value)}` });
    return REFUSED;
  }

  if (isOpenContainer(state, value)) {
    record(state, { path, code: "cycle", message: "value refers to itself and has no canonical form" });
    return REFUSED;
  }

  const entered = level + 1;
  if (entered > BOUNDARY_LIMITS.containerDepth) {
    record(state, {
      path,
      code: "too_deep",
      message: `container nesting passes the depth limit of ${BOUNDARY_LIMITS.containerDepth}`,
    });
    return REFUSED;
  }

  openContainer(state, value);
  try {
    // Every structural observation of the value happens inside this block. A container whose
    // structure cannot be observed without throwing has no readable content; it is refused like any
    // other unsupported form rather than escaping as an exception from a Kernel boundary. With every
    // Proxy refused above, this is reached only by host objects and engine errors.
    return isArrayValue(value) ? captureArray(value, path, entered, state) : captureObject(value, path, entered, state);
  } catch (error) {
    record(state, {
      path,
      code: "unstable_representation",
      message: `observing this value's structure threw (${describe(error)}), so it presents no readable content`,
    });
    return REFUSED;
  } finally {
    closeContainer(state, value);
  }
}

/** The array half of `capture`. Positions come from own data properties below `length`, only. */
function captureArray(container: object, path: string, entered: number, state: CaptureState): Captured {
  // Arrays must be genuine arrays: a subclass instance or a re-prototyped array would
  // canonicalize as a plain array and lose its exotic identity, so refuse it instead.
  // `Array.prototype` itself is non-writable and non-configurable, so this reference cannot be
  // swapped; only its *properties* are mutable, and those are handled by the serializer sandbox below.
  if (prototypeOf(container) !== PrimordialArrayPrototype) {
    record(state, { path, code: "unsupported_form", message: `expected a plain array, received ${describe(container)}` });
    return REFUSED;
  }

  // `length` decides which positions exist, so it is held to the same one-stable-structure rule as
  // any other member before it is trusted to bound the loop.
  const length = observeArrayLength(container);
  if (length === null) {
    record(state, {
      path,
      code: "unstable_representation",
      message: "array length is not one stable own data property, so which positions exist cannot be established",
    });
    return REFUSED;
  }

  // K11-R3-LIMIT-01: the trusted observed length has already decided this root cannot be
  // accepted, so refuse without allocating or traversing proportional to that invalid extent.
  // A declared sparse length can be as large as 2**32 - 1. Exactly-at-limit still proceeds below;
  // one-over refuses here with no traversal.
  if (length > BOUNDARY_LIMITS.containerEntries) {
    record(state, {
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
  //
  // Both name scans are bounded by the entry limit, not by the listing (KC2-R1-01). An accepted array
  // owns exactly its indices below `length` plus `length` itself, and `length` is at most
  // `containerEntries` here, so a listing longer than `containerEntries + 1` names is refused as one
  // aggregate reason without classifying each name. Each name the scans do classify was paid for by
  // the listing's charge.
  const names = listOwnNames(state, container);
  if (names === STOPPED) return REFUSED;
  const overlong = names.length > BOUNDARY_LIMITS.containerEntries + 1;
  let hasExtra = overlong;
  for (let nameIndex = 0; !overlong && nameIndex < names.length; nameIndex += 1) {
    const name = names[nameIndex]!;
    if (name !== "length" && !isArrayIndex(name)) {
      hasExtra = true;
      break;
    }
  }
  let symbolCount = 0;
  if (!hasExtra) {
    const listed = listOwnSymbols(state, container);
    if (listed === STOPPED) return REFUSED;
    symbolCount = listed;
  }
  if (overlong) {
    record(state, {
      path,
      code: "unrepresentable_member",
      message: `array lists ${names.length} own names, more than an array of at most ${BOUNDARY_LIMITS.containerEntries} entries owns; canonical form would silently drop the rest`,
    });
    refused = true;
  } else if (hasExtra || symbolCount > 0) {
    record(state, { path, code: "unrepresentable_member", message: "array has own members outside its indices, which canonical form would silently drop" });
    refused = true;
  }

  // K11-R2-VAL-02 supplement: a canonical-index own name at or beyond the stable observed
  // length is neither `extra` above nor visited by the position loop below, so without this
  // check it would disappear into an accepted `[]`. Every observed own name must either cohere
  // with accepted array content or refuse. A listed index with no backing descriptor has no
  // property behind the listing (`unstable_representation`, like the object half); a backed
  // index outside `length` is state canonical array form would silently drop
  // (`unrepresentable_member`). Both refuse; neither is normalized.
  for (let nameIndex = 0; !overlong && nameIndex < names.length; nameIndex += 1) {
    const name = names[nameIndex]!;
    if (name === "length" || !isArrayIndex(name)) continue;
    const numeric = arrayIndexValue(name);
    if (numeric >= length) {
      const backing = observeDescriptor(state, container, name);
      if (backing === STOPPED) return REFUSED;
      if (backing === undefined) {
        record(state, {
          path: element(path, numeric),
          code: "unstable_representation",
          message: "array lists an own index it does not own, so its structure has no single reading",
        });
      } else {
        record(state, {
          path: element(path, numeric),
          code: "unrepresentable_member",
          message: "array has an own index outside its length, which canonical form would silently drop",
        });
      }
      refused = true;
    }
  }

  // Charged before any element is read, so an occurrence of a shared array costs size budget in
  // proportion to the listing just taken. An accepted array owns exactly its indices plus
  // `length`, so the surplus and symbol terms are zero for it and the charge is its exact
  // punctuation; they are non-zero only on an array already refused above.
  const surplus = names.length - (length + 1);
  if (!charge(state, containerStructureBytes(length, false) + (surplus > 0 ? surplus : 0) + symbolCount)) return REFUSED;

  const out = allocateElements(length);
  for (let index = 0; index < length; index += 1) {
    const observed = observeElement(state, container, `${index}`);
    if (observed === STOPPED) return REFUSED;
    const where = element(path, index);
    const member = checkMember(observed.descriptor, observed.read, where, state);
    if (!member.ok) {
      refused = true;
      continue;
    }
    if (member.value === undefined) {
      record(state, { path: where, code: "undefined_member", message: "array element is undefined; an array has no absent positions" });
      refused = true;
      continue;
    }
    const item = capture(member.value, where, entered, state);
    if (item === REFUSED) {
      refused = true;
      continue;
    }
    defineAt(out, index, item);
  }

  if (refused || state.stopped) return REFUSED;
  // Freezing reduces every element installed above to the non-writable, non-configurable own data
  // the snapshot contract requires, and fixes `length` with it.
  return finishArray(out);
}

/** The object half of `capture`. Members come from own enumerable string-keyed data properties. */
function captureObject(container: object, path: string, entered: number, state: CaptureState): Captured {
  // Both sides of this comparison are independent of caller-mutable state: the observation uses
  // the load-time `getPrototypeOf`, and the plain prototype is the load-time object, not a live
  // `globalThis.Object` read (K11-R5-VAL-03). A non-primordial, non-null prototype is refused here
  // rather than normalized, exactly as before; a built-in keeping its own prototype is refused here too.
  const prototype = prototypeOf(container);
  if (prototype !== PrimordialObjectPrototype && prototype !== null) {
    record(state, { path, code: "unsupported_form", message: `expected a plain object, received ${describe(container)}` });
    return REFUSED;
  }
  // A plain-looking prototype does not make a built-in plain: a re-prototyped Map, Date or typed array
  // (and an arguments object, a module namespace or a raw JSON object) keeps its content in internal
  // slots. Refused by internal-slot type checks before any own-key listing (owner decision-01 item 3).
  if (isBuiltInWithSlots(container)) {
    record(state, { path, code: "unsupported_form", message: BUILT_IN_MESSAGE });
    return REFUSED;
  }

  let refused = false;
  const symbolCount = listOwnSymbols(state, container);
  if (symbolCount === STOPPED) return REFUSED;
  if (symbolCount > 0) {
    record(state, { path, code: "unrepresentable_member", message: "object has symbol-keyed members, which canonical form cannot represent" });
    refused = true;
  }

  // One own-names observation and one descriptor per name. The same descriptor answers "is this
  // member enumerable?" and "what does this member own?", so those two questions cannot be settled
  // from different readings of the same object. Index loops, not `for...of`: the iterator lookup
  // is ambient. `enumerable` and `captured` below are Kernel-grown and therefore go through
  // `own-array.ts` in both directions.
  //
  // The descriptor reads are bounded by the entry limit, not by the listing (KC2-R1-01). An accepted
  // object owns at most `containerEntries` names, all enumerable, so once `containerEntries + 1`
  // descriptors have been read the object is certainly refused, and a reason is already recorded:
  // either more than `containerEntries` of them were enumerable, or one was non-enumerable or not
  // owned. The remaining names are not read.
  const names = listOwnNames(state, container);
  if (names === STOPPED) return REFUSED;
  const readable = names.length > BOUNDARY_LIMITS.containerEntries + 1 ? BOUNDARY_LIMITS.containerEntries + 1 : names.length;
  const enumerable: (readonly [string, PropertyDescriptor])[] = [];
  let nonEnumerable = false;
  for (let nameIndex = 0; nameIndex < readable; nameIndex += 1) {
    const descriptor = observeDescriptor(state, container, names[nameIndex]!);
    if (descriptor === STOPPED) return REFUSED;
    const name = names[nameIndex]!;
    if (descriptor === undefined) {
      // The object listed an own name it does not own. There is no content behind it to accept.
      record(state, {
        path: child(path, name),
        code: "unstable_representation",
        message: "object lists an own member it does not own, so its structure has no single reading",
      });
      refused = true;
      continue;
    }
    if (descriptor.enumerable) appendOwn(enumerable, [name, descriptor] as const);
    else nonEnumerable = true;
  }
  if (nonEnumerable) {
    record(state, { path, code: "unrepresentable_member", message: "object has non-enumerable own members, which canonical form would silently drop" });
    refused = true;
  }
  if (enumerable.length > BOUNDARY_LIMITS.containerEntries) {
    record(state, {
      path,
      code: "too_many_entries",
      message:
        readable < names.length
          ? `object has more than ${BOUNDARY_LIMITS.containerEntries} members, the limit; it lists ${names.length} own names`
          : `object has ${enumerable.length} members, above the limit of ${BOUNDARY_LIMITS.containerEntries}`,
    });
    refused = true;
  }

  // Charged before any member is read, as for arrays. An accepted object's own names are exactly
  // its enumerable members and it owns no symbols, so this is its exact punctuation; a larger
  // listing, or any symbol, belongs to an object already refused above.
  if (!charge(state, containerStructureBytes(names.length, true) + symbolCount)) return REFUSED;

  const captured: (readonly [string, BoundaryValue])[] = [];
  for (let entryIndex = 0; entryIndex < enumerable.length; entryIndex += 1) {
    const pair = readAt(enumerable, entryIndex)!;
    const keyScan = scanText(state, pair[0]);
    if (keyScan === STOPPED) return REFUSED;
    const key = pair[0];
    const descriptor = pair[1];
    const where = child(path, key);
    if (keyScan.kind === "lone_surrogate") {
      record(state, { path: where, code: "lone_surrogate", message: "member name contains an unpaired surrogate" });
      refused = true;
      if (!charge(state, key.length)) return REFUSED;
      continue;
    }
    if (keyScan.kind === "too_long") {
      record(state, {
        path: where,
        code: "string_too_long",
        message: `member name cannot fit within the limit of ${BOUNDARY_LIMITS.stringScalarValues} Unicode scalar values`,
      });
      refused = true;
      if (!charge(state, key.length)) return REFUSED;
      continue;
    }
    // The member name's quoted, escaped bytes, exactly as the member will be spelled.
    if (!charge(state, keyScan.bytes)) return REFUSED;
    let read: unknown = undefined;
    if (hasOwnValue(descriptor)) {
      const observed = readMember(state, container, key);
      if (observed === STOPPED) return REFUSED;
      read = observed.read;
    }
    const member = checkMember(descriptor, read, where, state);
    if (!member.ok) {
      refused = true;
      continue;
    }
    if (member.value === undefined) {
      record(state, {
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
    appendOwn(captured, [key, item] as const);
  }

  if (refused || state.stopped) return REFUSED;
  return finishObject(prototype, captured);
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

type Acceptance = { readonly ok: true; readonly value: CanonicalValue } | { readonly ok: false; readonly issues: ValueIssue[] };

/**
 * What one capture charged to its root's work meter, by unit kind (`CAPTURE_WORK_BUDGET`'s table).
 * `units` is their sum; `stop` names the stop that ended reading, if any.
 */
export interface CaptureWork {
  readonly units: number;
  readonly visit: number;
  readonly listing: number;
  readonly element: number;
  readonly descriptor: number;
  readonly read: number;
  readonly string: number;
  readonly diagnostic: number;
  readonly stop: "none" | "bytes" | "work";
}

/**
 * The whole acceptance path, run once: capture, canonicalize the capture, measure its bytes.
 *
 * Every public entry point goes through this, so "what was refused" and "what was accepted" can never
 * be answered by two different passes over the caller's object. Each call is one root with its own
 * work meter and its own budget; eager multi-root consumers call it once per root (owner decision-05
 * item 5). `encode` runs only on a snapshot capture accepted, outside the meter: it is the same for
 * every acceptance and no refusal reaches it.
 */
function acceptMetered(value: unknown): { readonly result: Acceptance; readonly work: CaptureWork } {
  const state: CaptureState = {
    issues: [],
    open: new PrimordialSet<object>(),
    bytes: 0,
    units: 0,
    visitUnits: 0,
    listingUnits: 0,
    elementUnits: 0,
    descriptorUnits: 0,
    readUnits: 0,
    stringUnits: 0,
    diagnosticUnits: 0,
    stop: "none",
    stopped: false,
  };
  const snapshot = capture(value, "", 0, state);
  const work: CaptureWork = PrimordialObjectFreeze({
    units: state.units,
    visit: state.visitUnits,
    listing: state.listingUnits,
    element: state.elementUnits,
    descriptor: state.descriptorUnits,
    read: state.readUnits,
    string: state.stringUnits,
    diagnostic: state.diagnosticUnits,
    stop: state.stop,
  });
  return { result: finishAcceptance(snapshot, state), work };
}

function finishAcceptance(snapshot: Captured, state: CaptureState): Acceptance {
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

const accept = (value: unknown): Acceptance => acceptMetered(value).result;

/**
 * Evidence only: one capture's result together with what it charged to the work meter.
 *
 * The maintained tests and the TOOLS-01 probes read meter counts through this. It runs exactly the
 * path `canonicalize` runs. `index.ts` does not re-export it, so it is no part of the package surface;
 * it is the test-only path owner decision-02 anticipates for the capture module.
 */
export const captureWithWork = (value: unknown): { readonly result: Acceptance; readonly work: CaptureWork } => acceptMetered(value);

/** Bounded details and exact suffix code counts for a refused root. Empty means valid. */
export function boundaryValueIssues(value: unknown): ValueIssue[] {
  const result = accept(value);
  return result.ok ? [] : result.issues;
}

/** Whether `value` is an acceptable boundary value root. */
export const isBoundaryValue = (value: unknown): value is BoundaryValue => boundaryValueIssues(value).length === 0;

/**
 * Validates one root and returns its exact canonical snapshot, or bounded issue details and
 * exact suffix code counts. Diagnostic compression never changes which positions are observed.
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
export function canonicalize(value: unknown): Acceptance {
  return accept(value);
}

/**
 * Whether two already-validated roots are the same logical value.
 *
 * `values.md`: "Two values are equal exactly when their canonical bytes are equal." Key order is not
 * semantic, array order is, and an absent member differs from an explicit null.
 */
export const sameLogicalValue = (left: CanonicalValue, right: CanonicalValue): boolean => left.canonical === right.canonical;
