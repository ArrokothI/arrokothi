/**
 * K1.1-C3 - boundary values, canonical form, logical equality and the four semantic limits.
 *
 * `mental-model/concepts/values.md` owns every rule asserted here. The cases are chosen against the
 * failures the page names rather than against the code: a repaired scalar, a silently dropped
 * member, a byte comparison standing in for logical equality, and a limit checked on the wrong unit
 * or over the wrong root.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { BOUNDARY_LIMITS, boundaryValueIssues, canonicalize, isBoundaryValue, sameLogicalValue, type BoundaryValue } from "../src/internal/value-capture.ts";
import type { CaptureWork } from "../src/internal/value-capture.ts";
import { countingProxy, inWrappedChild } from "./capture-instruments.ts";
import {
  arrayIteratorPrototype,
  descriptorConversionIsHostile,
  inheritedIndexIsLive,
  iteratorNextIsHostile,
  polluteDescriptorFields,
  polluteDescriptorGetter,
  polluteIteratorNext,
  polluteObjectField,
  recordOwn,
  trapInheritedIndices,
  type DescriptorPollution,
} from "../../kernel/tests/harness.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * K1.1-correction-03: capture refuses every Proxy before observing it (owner decision-01 item 2), so a
 * Proxy can no longer be the value under test here, count the Kernel's observations, or run a side
 * effect in the middle of a capture. The cases that used one keep that Proxy as a witness of the new
 * refusal (`countingProxy`, zero traps), and reach the mechanism it protected without a Proxy: through
 * the wrapped child of `capture-instruments.ts`, whose hooks make one Kernel observation of a genuine
 * array or plain object answer differently or act, or through the same pollution installed before the
 * call. Exact values below are derived from the value's shape and the unit table in `values.ts`
 * (`CAPTURE_WORK_BUDGET`), never copied from a run.
 */
const PROXY_MESSAGE = "value is a Proxy; capture refuses every Proxy before observing it";
const proxyRefusal = (path: string): { path: string; code: string; message: string } => ({ path, code: "unsupported_form", message: PROXY_MESSAGE });

/** The fixed messages of the refusals the converted cases pin exactly. */
const DISAGREEMENT = "member is supplied differently by its own data descriptor and by ordinary property access, so it has no single content";
const NO_OWN_PROPERTY = "position has no own property; a value supplied only through a prototype or a dynamic read is not accepted content";
const UNSTABLE_LENGTH = "array length is not one stable own data property, so which positions exist cannot be established";
const THREW_OBJECT = "observing this value's structure threw (object), so it presents no readable content";
const LISTED_NOT_OWNED = "object lists an own member it does not own, so its structure has no single reading";
const INDEX_NOT_OWNED = "array lists an own index it does not own, so its structure has no single reading";
const INDEX_OUTSIDE_LENGTH = "array has an own index outside its length, which canonical form would silently drop";
const byteStop = (bytes: number): { path: string; code: string; message: string } => ({
  path: "",
  code: "too_many_bytes",
  message: `canonical form reaches at least ${bytes} bytes, above the per-root limit of ${BOUNDARY_LIMITS.canonicalBytes}; the rest of the value was not read`,
});

/** One located issue as a wrapped child reports it (JSON, so `occurrences` appears only on suffix entries). */
interface ChildIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
  readonly occurrences?: number;
}

/** One `captureWithWork` result as a wrapped child reports it: the whole result and the work meter. */
interface ChildCapture {
  readonly ok: boolean;
  readonly canonical: string | null;
  readonly value: unknown;
  readonly issues: readonly ChildIssue[];
  readonly work: CaptureWork;
}

/** Child-side text: reduces one `values.captureWithWork` result to a `ChildCapture`. */
const SUMMARIZE = `
  const summarize = (captured) => ({
    ok: captured.result.ok,
    canonical: captured.result.ok ? captured.result.value.canonical : null,
    value: captured.result.ok ? captured.result.value.value : null,
    issues: captured.result.ok ? [] : captured.result.issues,
    work: captured.work,
  });
`;

/** `harness.ts` for a child probe: it shares the child's Kernel modules, which the prelude loaded first. */
const HARNESS_URL = new URL("../../kernel/tests/harness.ts", import.meta.url).href;

/** A work record with every unit kind the case does not charge at zero; `units` is their sum. */
const workOf = (parts: Partial<Omit<CaptureWork, "units">> & { readonly stop: CaptureWork["stop"] }): CaptureWork => {
  const kinds = { visit: 0, listing: 0, element: 0, descriptor: 0, read: 0, string: 0, diagnostic: 0, ...parts };
  return {
    units: kinds.visit + kinds.listing + kinds.element + kinds.descriptor + kinds.read + kinds.string + kinds.diagnostic,
    ...kinds,
  };
};

/** A dense genuine array built without `push`, so these fixtures are own data whatever is installed. */
const copyForTest = (elements: readonly unknown[]): unknown[] => {
  const out: unknown[] = [];
  for (let index = 0; index < elements.length; index += 1) recordOwn(out, elements[index]);
  return out;
};

const canonicalOf = (value: unknown): string => {
  const result = canonicalize(value);
  assert.ok(result.ok, `expected ${JSON.stringify(value)} to be an acceptable boundary value`);
  return result.value.canonical;
};

const issueCodes = (value: unknown): string[] => boundaryValueIssues(value).map((issue) => issue.code);

const equal = (left: unknown, right: unknown): boolean => {
  const a = canonicalize(left);
  const b = canonicalize(right);
  assert.ok(a.ok && b.ok, "both sides must be valid before equality is even a question");
  return sameLogicalValue(a.value, b.value);
};

/** `A1 = []`, `A(n+1) = [An]`: the worksheet's own depth construction. */
const nested = (levels: number): BoundaryValue => {
  let value: BoundaryValue = [];
  for (let level = 1; level < levels; level += 1) value = [value];
  return value;
};

/** `T1 = {}`, then alternately `[Tn]` and `{"x": Tn}`, so the spelling changes but the depth does not. */
const alternating = (levels: number): BoundaryValue => {
  let value: BoundaryValue = {};
  for (let level = 1; level < levels; level += 1) value = level % 2 === 1 ? [value] : { x: value };
  return value;
};

/**
 * An array of strings whose canonical form is exactly `target` bytes.
 *
 * `target` must be inside the byte limit, because the size is measured by canonicalizing. The
 * one-byte-over case is built from the at-limit one by lengthening its last element, which adds
 * exactly one ASCII byte.
 */
function rootOfExactBytes(target: number): string[] {
  const chunk = "a".repeat(65_000);
  const parts: string[] = [];
  const size = (): number => {
    const result = canonicalize(parts);
    assert.ok(result.ok, "the growing root stays valid while it is being built");
    return result.value.canonicalBytes;
  };
  while (size() + chunk.length + 3 <= target) parts.push(chunk);
  const remaining = target - size();
  const comma = parts.length === 0 ? 0 : 1;
  const length = remaining - comma - 2;
  assert.ok(length >= 0 && length <= BOUNDARY_LIMITS.stringScalarValues, `construction lands inside the string limit, got ${length}`);
  parts.push("a".repeat(length));
  const built = canonicalize(parts);
  assert.ok(built.ok && built.value.canonicalBytes === target, `constructed exactly ${target} canonical bytes`);
  return parts;
}

describe("K1.1-C3 boundary values are validated, never repaired", () => {
  test("non-finite numbers are rejected rather than coerced", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.deepEqual(issueCodes({ n: value }), ["non_finite_number"], `${String(value)} is refused`);
      assert.equal(canonicalize({ n: value }).ok, false, "and produces no canonical form to compare");
    }
    // The failure this forecloses: a serializer that writes `null` would make NaN and null equal.
    assert.notEqual(canonicalOf({ n: null }), "{}", "null is a value, and is not what a rejected NaN becomes");
  });

  test("a member that is present with no value is refused, because absent and null differ", () => {
    assert.deepEqual(issueCodes({ a: undefined }), ["undefined_member"]);
    assert.deepEqual(issueCodes([undefined]), ["undefined_member"]);
    assert.deepEqual(issueCodes([1, , 3]), ["undefined_member"], "an array hole is not an absent position");
    // Had `{a: undefined}` been dropped to `{}`, these three caller intentions would collapse to two.
    assert.notEqual(canonicalOf({}), canonicalOf({ a: null }));
  });

  test("values with no boundary form are refused with their form named", () => {
    assert.deepEqual(issueCodes(() => 1), ["unsupported_form"]);
    assert.deepEqual(issueCodes({ s: Symbol("s") }), ["unsupported_form"]);
    assert.deepEqual(issueCodes({ b: 1n }), ["unsupported_form"]);
    assert.deepEqual(issueCodes({ d: new Date(0) }), ["unsupported_form"]);
    assert.deepEqual(issueCodes({ m: new Map() }), ["unsupported_form"]);
    class Holder {
      value = 1;
    }
    assert.deepEqual(issueCodes({ h: new Holder() }), ["unsupported_form"]);
    assert.match(boundaryValueIssues({ h: new Holder() })[0]?.message ?? "", /expected a plain object, received object/);
  });

  test("members canonical form cannot represent are refused, never dropped", () => {
    const symbolKeyed: Record<string, unknown> = { a: 1 };
    symbolKeyed[Symbol("hidden") as unknown as string] = 2;
    assert.deepEqual(issueCodes(symbolKeyed), ["unrepresentable_member"]);

    const hidden = { a: 1 };
    Object.defineProperty(hidden, "b", { value: 2, enumerable: false });
    assert.deepEqual(issueCodes(hidden), ["unrepresentable_member"]);

    const tagged: number[] & { tag?: string } = [1];
    tagged.tag = "x";
    assert.deepEqual(issueCodes(tagged), ["unrepresentable_member"]);
  });

  test("lone surrogates are refused rather than replaced", () => {
    assert.deepEqual(issueCodes({ s: "\ud800" }), ["lone_surrogate"], "an unpaired high surrogate");
    assert.deepEqual(issueCodes({ s: "\udc00" }), ["lone_surrogate"], "an unpaired low surrogate");
    assert.deepEqual(issueCodes({ s: "a\ud800b" }), ["lone_surrogate"], "one in the middle of a string");
    assert.deepEqual(issueCodes({ "\ud800": 1 }), ["lone_surrogate"], "and in a member name");
    assert.deepEqual(issueCodes({ s: "😀" }), [], "a well-formed pair is an ordinary string");
    assert.equal(canonicalOf({ s: "\ufffd" }), '{"s":"\ufffd"}', "U+FFFD is a real value, never a repair target");
  });

  test("a cycle has no canonical form and is reported as one", () => {
    const loop: Record<string, unknown> = {};
    loop["self"] = loop;
    assert.deepEqual(issueCodes(loop), ["cycle"]);
    const shared = { n: 1 };
    assert.deepEqual(issueCodes([shared, shared]), [], "sharing is not a cycle");
  });

  test("every reason is reported, with a path, rather than only the first", () => {
    const issues = boundaryValueIssues({ a: Number.NaN, b: [undefined], c: "\ud800" });
    assert.deepEqual(
      issues.map((issue) => [issue.path, issue.code]),
      [
        ["a", "non_finite_number"],
        ["b[0]", "undefined_member"],
        ["c", "lone_surrogate"],
      ],
    );
  });

  test("isBoundaryValue agrees with the issue list", () => {
    assert.equal(isBoundaryValue({ a: [1, "b", true, null] }), true);
    assert.equal(isBoundaryValue({ a: undefined }), false);
  });

  describe("K11-R1-VAL-01 value-preserving acceptance over the full key space", () => {
    test("a valid own __proto__ member is accepted and sealed as own data, not a prototype", () => {
      const input = JSON.parse('{"__proto__":{"admin":true},"safe":2}') as Record<string, unknown>;
      assert.ok(Object.prototype.hasOwnProperty.call(input, "__proto__"), "the fixture really carries an own member");
      assert.deepEqual(issueCodes(input), [], "values.md permits arbitrary well-formed member names");

      const result = canonicalize(input);
      assert.ok(result.ok, "it canonicalizes");
      const sealed = result.value.value as Record<string, unknown>;
      assert.ok(Object.prototype.hasOwnProperty.call(sealed, "__proto__"), "the member survives as an own property");
      assert.deepEqual(Object.keys(sealed).sort(), ["__proto__", "safe"]);
      assert.deepEqual(sealed["__proto__"], { admin: true });
      assert.equal(Object.getPrototypeOf(sealed), Object.prototype, "no prototype was grown");
      assert.ok(Object.isFrozen(sealed), "the copy is frozen");
      assert.ok(Object.isFrozen(sealed["__proto__"]), "nested values are frozen too");

      // Canonical bytes describe the same structural value that was retained.
      assert.equal(result.value.canonical, '{"__proto__":{"admin":true},"safe":2}');
      assert.equal(
        canonicalOf(sealed),
        result.value.canonical,
        "re-canonicalizing the retained copy yields the bound identity",
      );

      // The weaker assignment-style copy would fail this: the member would vanish and the
      // value would become the prototype.
      const weak: Record<string, unknown> = {};
      for (const name of Object.keys(input)) (weak as Record<string, unknown>)[name] = input[name];
      assert.equal(Object.prototype.hasOwnProperty.call(weak, "__proto__"), false, "the weak copy loses the member");
    });

    test("nested and array-embedded __proto__ members survive at depth", () => {
      const input = JSON.parse('{"a":[{"__proto__":{"deep":true}}],"b":{"c":{"__proto__":1}}}') as unknown;
      const result = canonicalize(input);
      assert.ok(result.ok);
      const sealed = result.value.value as { a: { __proto__?: unknown }[]; b: { c: Record<string, unknown> } };
      const first = sealed.a[0] as Record<string, unknown>;
      assert.ok(first && Object.prototype.hasOwnProperty.call(first, "__proto__"));
      assert.deepEqual(first["__proto__"], { deep: true });
      assert.ok(Object.prototype.hasOwnProperty.call(sealed.b.c, "__proto__"));
      assert.equal(sealed.b.c["__proto__"], 1);
      assert.equal(canonicalOf(sealed), result.value.canonical);
    });

    test("a null-prototype object keeps its prototype and its members", () => {
      const input: Record<string, unknown> = Object.create(null);
      Object.defineProperty(input, "__proto__", { value: { x: 1 }, writable: true, enumerable: true, configurable: true });
      Object.defineProperty(input, "safe", { value: 2, writable: true, enumerable: true, configurable: true });
      assert.deepEqual(issueCodes(input), [], "null-prototype plain objects are valid");
      const result = canonicalize(input);
      assert.ok(result.ok);
      const sealed = result.value.value as Record<string, unknown>;
      assert.equal(Object.getPrototypeOf(sealed), null);
      assert.ok(Object.prototype.hasOwnProperty.call(sealed, "__proto__"));
      assert.deepEqual(sealed["__proto__"], { x: 1 });
    });

    test("numeric-looking non-index array members are refused, never silently dropped", () => {
      const with01: unknown[] = [1, 2];
      Object.defineProperty(with01, "01", { value: 99, writable: true, enumerable: true, configurable: true });
      assert.deepEqual(issueCodes(with01), ["unrepresentable_member"], '"01" is not an index and must be refused');

      const with00: unknown[] = [1];
      Object.defineProperty(with00, "00", { value: 1, writable: true, enumerable: true, configurable: true });
      assert.deepEqual(issueCodes(with00), ["unrepresentable_member"]);

      const huge: unknown[] = [];
      Object.defineProperty(huge, "4294967295", { value: 1, writable: true, enumerable: true, configurable: true });
      assert.deepEqual(issueCodes(huge), ["unrepresentable_member"], "2**32-1 is not an index");

      // Sanity: genuine indices still pass, including "0" itself.
      assert.deepEqual(issueCodes([1, 2]), []);
      assert.deepEqual(issueCodes([]), []);
    });

    test("accessors and exotic array prototypes are refused rather than invoked or coerced", () => {
      const accessed: Record<string, unknown> = {};
      Object.defineProperty(accessed, "ok", { get() { return 1; }, enumerable: true, configurable: true });
      assert.deepEqual(issueCodes(accessed), ["unrepresentable_member"]);

      const exotic = [1, 2];
      Object.setPrototypeOf(exotic, Object.create(Array.prototype));
      assert.deepEqual(issueCodes(exotic), ["unsupported_form"]);

      const subclass = new (class extends Array {})() as unknown[];
      assert.deepEqual(issueCodes(subclass), ["unsupported_form"]);
    });

    test("acceptance detaches and freezes without invoking any accessor", () => {
      let invoked = 0;
      const withAccessor: Record<string, unknown> = { a: 1 };
      Object.defineProperty(withAccessor, "evil", {
        get() { invoked += 1; return 1; },
        enumerable: true,
        configurable: true,
      });
      assert.deepEqual(issueCodes(withAccessor), ["unrepresentable_member"], "an accessor is refused, not called");
      assert.equal(invoked, 0, "refusing it never ran it");

      const valid = JSON.parse('{"__proto__":{"x":1},"safe":2}') as unknown;
      const result = canonicalize(valid);
      assert.ok(result.ok);
      const snapshot = result.value.value as Record<string, unknown>;
      assert.ok(Object.prototype.hasOwnProperty.call(snapshot, "__proto__"));
      assert.throws(() => {
        (snapshot as Record<string, unknown>)["safe"] = 99;
      }, TypeError);
    });
  });

  /**
   * K11-R2-VAL-02 - one observation, one value.
   *
   * The round-3 implementation validated the caller's object, canonicalized the caller's object and
   * copied the caller's object in three separate passes. Nothing forced those three readings to
   * agree, so a value that answers differently depending on how it is asked could be accepted with
   * canonical bytes describing one structure and a retained copy holding another.
   *
   * The fixtures below are *representation* counterexamples, not one exotic object type: each one
   * makes an ordinary structural question - "what does this position own?" - have two answers. The
   * rule under test is stated the same way: no case depends on what kind of object gives the answers.
   *
   * K1.1-correction-03: the Proxies that carried these counterexamples are now refused before any trap
   * runs (owner decision-01 item 2), and each case keeps its Proxy as a witness of that. An ordinary value
   * can no longer give two answers in the middle of a capture, so the mechanism is reached through the
   * wrapped child instead: a hook makes the Kernel's one observation of a genuine array or plain object
   * answer differently from its ordinary read, or change the caller's object after its one reading.
   */
  describe("K11-R2-VAL-02 identity and retained content come from one observation", () => {
    /**
     * The round-3 witness: own data descriptors and ordinary reads that deliberately disagree, behind a
     * Proxy whose every trap is counted. Capture now refuses it before observing it.
     */
    const disagreeing = <T extends object>(target: T, key: string, read: unknown): { proxy: T; calls: () => number } =>
      countingProxy(target, {
        get(inner, property, receiver): unknown {
          if (property === key) return read;
          return Reflect.get(inner, property, receiver);
        },
      });

    /**
     * A probe whose hook makes the one own-descriptor observation of `key` on `subject` (a tracked genuine
     * array or plain object the setup declares, inside `value`) say `owned`. The prelude owns `tracked`.
     */
    type DisagreementProbe = { captured: ChildCapture; observations: number; reads: unknown };
    const disagreementProbe = (setup: string, key: string, owned: unknown, read: string): DisagreementProbe =>
      inWrappedChild<DisagreementProbe>(`
        ${SUMMARIZE}
        ${setup}
        let observations = 0;
        hooks.descriptor = (target, key, real) => {
          if (target !== subject || key !== ${JSON.stringify(key)}) return real;
          observations += 1;
          return { value: ${JSON.stringify(owned)}, writable: true, enumerable: true, configurable: true };
        };
        const captured = summarize(values.captureWithWork(value));
        emit({ captured, observations, reads: ${read} });
      `);

    test("an array position read differently than it is owned is refused, not silently picked", () => {
      // K1.1-correction-03: converted from a get-trap Proxy witness (owner decision-01 item 2). The Proxy is
      // refused before any trap; the disagreement check is reached by a hook on the one descriptor observation.
      const witness = disagreeing([1], "0", 2);
      assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
      assert.equal(canonicalize(witness.proxy).ok, false, "and it produces no identity at all");
      assert.equal(witness.calls(), 0, "refused before any trap ran");

      // A genuine array that owns 2 and reads 2, whose one own-descriptor observation says 1: the
      // ambiguity the finding names, without a Proxy.
      const observed = disagreementProbe("const subject = track([2]); const value = subject;", "0", 1, "subject[0]");
      assert.equal(observed.observations, 1, "the position's own descriptor was observed exactly once, and said 1");
      assert.equal(observed.reads, 2, "while its ordinary read says 2");
      assert.deepEqual(observed.captured.issues, [{ path: "[0]", code: "unstable_representation", message: DISAGREEMENT }]);
      assert.equal(observed.captured.ok, false, "and it produces no identity at all");
    });

    test("an object member read differently than it is owned is refused the same way", () => {
      // K1.1-correction-03: converted from a get-trap Proxy witness (owner decision-01 item 2).
      const witness = disagreeing({ a: 1 }, "a", 2);
      assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
      assert.equal(witness.calls(), 0, "refused before any trap ran");

      const observed = disagreementProbe("const subject = track({ a: 2 }); const value = subject;", "a", 1, "subject.a");
      assert.equal(observed.observations, 1);
      assert.equal(observed.reads, 2);
      assert.deepEqual(observed.captured.issues, [{ path: "a", code: "unstable_representation", message: DISAGREEMENT }], "and the refusal locates the member");
      assert.equal(observed.captured.ok, false);
    });

    test("the disagreement is refused at depth and under a valid root", () => {
      // K1.1-correction-03: converted from a nested get-trap Proxy witness (owner decision-01 item 2).
      const witness = disagreeing({ a: 1 }, "a", 2);
      assert.deepEqual(boundaryValueIssues({ outer: [{ inner: witness.proxy }] }), [proxyRefusal("outer[0].inner")]);
      assert.equal(witness.calls(), 0, "refused at depth before any trap ran");

      const observed = disagreementProbe(
        "const subject = track({ a: 2 }); const value = { outer: [{ inner: subject }] };",
        "a",
        1,
        "subject.a",
      );
      assert.equal(observed.observations, 1);
      assert.deepEqual(observed.captured.issues, [{ path: "outer[0].inner.a", code: "unstable_representation", message: DISAGREEMENT }]);
      assert.equal(observed.captured.ok, false);
    });

    test("an array position supplied only by a dynamic read, owning nothing, is refused", () => {
      // `length` says the position exists; the object owns nothing there. The round-3 code read the
      // supplied 7 as the element, while the JCS implementation skipped the absent position: the
      // pair canonicalized to `[]` and retained `[7]`.
      //
      // K1.1-correction-03: converted from a get-trap Proxy witness (owner decision-01 item 2). The read
      // that supplies 7 now comes through an inherited `Array.prototype` position, the other way an
      // ordinary read answers for a position an array does not own.
      const hollowTarget: unknown[] = [];
      hollowTarget.length = 1;
      const witness = disagreeing(hollowTarget, "0", 7);
      assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
      assert.equal(witness.calls(), 0, "refused before any trap ran");

      const hollow: unknown[] = [];
      hollow.length = 1;
      const saved = Object.getOwnPropertyDescriptor(Array.prototype, "0");
      Object.defineProperty(Array.prototype, "0", { value: 7, writable: true, enumerable: false, configurable: true });
      let owned: PropertyDescriptor | undefined;
      let read: unknown;
      let issues: ReturnType<typeof boundaryValueIssues> = [];
      let identified = true;
      try {
        owned = Object.getOwnPropertyDescriptor(hollow, "0");
        read = hollow[0];
        issues = boundaryValueIssues(hollow);
        identified = canonicalize(hollow).ok;
      } finally {
        if (saved === undefined) delete (Array.prototype as unknown as Record<string, unknown>)["0"];
        else Object.defineProperty(Array.prototype, "0", saved);
      }
      assert.equal(owned, undefined, "owns nothing at 0");
      assert.equal(read, 7, "but reads 7");
      assert.deepEqual(issues, [{ path: "[0]", code: "undefined_member", message: NO_OWN_PROPERTY }]);
      assert.equal(identified, false, "and it produces no identity at all");
    });

    test("a member supplied only by a prototype is not accepted as own content", () => {
      // Same rule, no Proxy: the value is read through the prototype chain and owned nowhere.
      const base = { a: 1 };
      const derived: Record<string, unknown> = Object.create(base);
      assert.equal(derived["a"], 1, "reads through the prototype");
      assert.equal(Object.prototype.hasOwnProperty.call(derived, "a"), false, "and owns nothing");
      // An object whose prototype is neither Object.prototype nor null is refused outright.
      assert.deepEqual(issueCodes(derived), ["unsupported_form"]);
    });

    test("a length that does not agree with itself cannot decide which positions exist", () => {
      // K1.1-correction-03: converted from a get-trap Proxy witness (owner decision-01 item 2). A genuine
      // `[1, 2]` reads length 2 while the hook makes its one own `length` descriptor say 5.
      const witness = disagreeing([1, 2], "length", 5);
      assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
      assert.equal(witness.calls(), 0, "refused before any trap ran");

      const observed = inWrappedChild<{ captured: ChildCapture; observations: number; reads: number }>(`
        ${SUMMARIZE}
        const value = track([1, 2]);
        let observations = 0;
        hooks.descriptor = (target, key, real) => {
          if (key !== "length") return real;
          observations += 1;
          return { value: 5, writable: true, enumerable: false, configurable: false };
        };
        const captured = summarize(values.captureWithWork(value));
        emit({ captured, observations, reads: value.length });
      `);
      assert.equal(observed.observations, 1, "length's own descriptor was observed once, and said 5");
      assert.equal(observed.reads, 2, "while its ordinary read says 2");
      assert.deepEqual(
        observed.captured.issues,
        [{ path: "", code: "unstable_representation", message: UNSTABLE_LENGTH }],
        "the root array is what has no stable shape",
      );
      assert.equal(observed.captured.ok, false);
    });

    test("a structure that cannot be observed is refused rather than thrown out of the boundary", () => {
      // K1.1-correction-03: converted from a throwing-trap Proxy witness (owner decision-01 item 2). The
      // catch path is now reached only by host objects and engine errors, so a hook makes the Kernel's own
      // descriptor observation of a plain object throw.
      const witness = countingProxy({ a: 1 }, {
        getOwnPropertyDescriptor(): PropertyDescriptor {
          throw new Error("no descriptors for you");
        },
      });
      assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
      assert.equal(witness.calls(), 0, "refused before the throwing trap could run");

      const observed = inWrappedChild<{ threw: string | null; captured: ChildCapture | null; observations: number }>(`
        ${SUMMARIZE}
        const value = track({ a: 1 });
        let observations = 0;
        hooks.descriptor = () => {
          observations += 1;
          throw new Error("no descriptors for you");
        };
        let threw = null;
        let captured = null;
        try {
          captured = summarize(values.captureWithWork(value));
        } catch (error) {
          threw = String(error);
        }
        emit({ threw, captured, observations });
      `);
      assert.equal(observed.threw, null, "a Kernel boundary refuses; it does not propagate a caller's exception");
      assert.equal(observed.observations, 1, "the throwing observation really ran");
      assert.deepEqual(observed.captured?.issues, [{ path: "", code: "unstable_representation", message: THREW_OBJECT }]);
      assert.equal(observed.captured?.ok, false);
    });

    test("an object listing an own member it does not own is refused", () => {
      // K1.1-correction-03: converted from an ownKeys-trap Proxy witness (owner decision-01 item 2). A hook
      // makes the one own-names listing of a plain `{}` report a name the object does not own.
      const witness = countingProxy({} as Record<string, unknown>, {
        ownKeys(): string[] {
          return ["ghost"];
        },
        getOwnPropertyDescriptor(): PropertyDescriptor | undefined {
          return undefined;
        },
      });
      assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
      assert.equal(witness.calls(), 0, "refused before any trap ran");

      const observed = inWrappedChild<{ captured: ChildCapture; listings: number }>(`
        ${SUMMARIZE}
        const value = track({});
        let listings = 0;
        hooks.names = (target, real) => {
          listings += 1;
          return [...real, "ghost"];
        };
        const captured = summarize(values.captureWithWork(value));
        emit({ captured, listings });
      `);
      assert.equal(observed.listings, 1);
      assert.deepEqual(observed.captured.issues, [{ path: "ghost", code: "unstable_representation", message: LISTED_NOT_OWNED }]);
      assert.equal(observed.captured.ok, false);
    });

    test("every accepted root re-canonicalizes to the bytes that accepted it", () => {
      // The invariant itself, checked over the whole shape vocabulary this packet accepts rather
      // than over the counterexamples alone: the retained structure is what `canonical` describes.
      const roots: unknown[] = [
        null,
        true,
        0,
        -0,
        "text",
        [],
        {},
        [1, "two", false, null, [3], { four: 4 }],
        { b: 2, a: 1, nested: { deep: [1, { x: null }] } },
        JSON.parse('{"__proto__":{"admin":true},"safe":2}'),
        JSON.parse('{"a":[{"__proto__":{"deep":true}}],"b":{"c":{"__proto__":1}}}'),
        { "": "empty name", "0": "numeric name", "\u007f": "del" },
        nested(BOUNDARY_LIMITS.containerDepth),
        alternating(BOUNDARY_LIMITS.containerDepth),
      ];
      for (const root of roots) {
        const result = canonicalize(root);
        assert.ok(result.ok, `${JSON.stringify(root)} is accepted`);
        const retained = result.value.value;
        const again = canonicalize(retained);
        assert.ok(again.ok, "the retained structure is itself an acceptable boundary value");
        assert.equal(again.value.canonical, result.value.canonical, "identity describes exactly what was retained");
        assert.equal(again.value.canonicalBytes, result.value.canonicalBytes);
        assert.deepEqual(again.value.value, retained);
      }
    });

    test("a value that answers differently on each read is bound to the one reading that was taken", () => {
      // This fixture agrees with its own descriptor on the first read and diverges afterwards, which
      // is precisely what a three-pass acceptance path could not survive. Acceptance reads each
      // position once, so the reading it took is the reading it keeps.
      //
      // K1.1-correction-03: converted from a get-trap Proxy that counted its reads (owner decision-01
      // item 2). The Proxy is refused before any read. Without one, the source moves on through a hook:
      // observing the later member `b` sets `a` to 2, after `a`'s one reading and before the snapshot is
      // finished, so any second reading of `a` would answer 2. Reads are counted by the work meter.
      let witnessReads = 0;
      const witness = countingProxy({ a: 1 } as Record<string, unknown>, {
        get(inner, property, receiver): unknown {
          if (property === "a") {
            witnessReads += 1;
            return witnessReads;
          }
          return Reflect.get(inner, property, receiver);
        },
      });
      assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
      assert.equal(witness.calls(), 0, "refused before any trap ran");
      assert.equal(witnessReads, 0, "and before any read");

      const observed = inWrappedChild<{
        captured: ChildCapture;
        aDescriptors: number;
        moved: number;
        sourceNow: number;
        retainedIsSource: boolean;
        frozen: boolean;
        again: string | null;
        counts: { descriptorTracked: number; namesTracked: number; symbolsTracked: number; prototypeTracked: number };
      }>(`
        ${SUMMARIZE}
        const inner = track({});
        const source = track({ a: 1, b: inner });
        let aDescriptors = 0;
        hooks.descriptor = (target, key, real) => {
          if (target === source && key === "a") aDescriptors += 1;
          return real;
        };
        let moved = 0;
        hooks.prototype = (target, real) => {
          if (target === inner) {
            source.a = 2;
            moved += 1;
          }
          return real;
        };
        reset();
        const result = values.captureWithWork(source);
        const observedCounts = snapshot();
        // During the capture only: re-canonicalizing below observes whatever was retained.
        const movedDuringCapture = moved;
        const captured = summarize(result);
        const retained = result.result.ok ? result.result.value.value : null;
        const again = retained === null ? null : values.canonicalize(retained);
        emit({
          captured,
          aDescriptors,
          moved: movedDuringCapture,
          sourceNow: source.a,
          retainedIsSource: retained === source,
          frozen: retained !== null && Object.isFrozen(retained),
          again: again !== null && again.ok ? again.value.canonical : null,
          counts: observedCounts,
        });
      `);
      assert.equal(observed.moved, 1, "the source moved on during the capture, so this is not a vacuous pass");
      assert.equal(observed.captured.ok, true, "the one reading agreed with the own descriptor, so it is acceptable");
      assert.equal(observed.captured.canonical, '{"a":1,"b":{}}');
      assert.deepEqual(observed.captured.value, { a: 1, b: {} });
      assert.equal(observed.retainedIsSource, false, "what is retained is a Kernel snapshot, not the caller's object");
      assert.equal(observed.frozen, true);
      // Each member was observed once. Its own descriptor is counted by the wrapped primordials
      // (`aDescriptors`, `descriptorTracked`) and by the meter's `descriptor` units. Its ordinary read is
      // counted by the meter alone: `read` counts the Kernel's metered member reads (`readMember` calls),
      // not engine [[Get]]s, since an unmetered [[Get]] of own data on a non-Proxy runs no caller code and
      // is unobservable without a Proxy. `{a: 1, b: {}}`: visits for the root, `1` and `{}`; the root's
      // symbols (1) and names (1 + 2) listings and the inner `{}`'s two listings (1 each); names "a" and "b".
      assert.equal(observed.aDescriptors, 1, "a's own descriptor was observed exactly once");
      assert.deepEqual(observed.captured.work, workOf({ visit: 3, listing: 6, descriptor: 2, read: 2, string: 2, stop: "none" }));
      assert.equal(observed.counts.descriptorTracked, 2);
      assert.equal(observed.counts.namesTracked, 2);
      assert.equal(observed.counts.symbolsTracked, 2);
      assert.equal(observed.counts.prototypeTracked, 2);

      // Reading the caller's object again now returns something else entirely. The accepted value is
      // unaffected, and re-canonicalizing what was retained still yields the bytes that bound it.
      assert.equal(observed.sourceNow, 2, "the source has moved on");
      assert.equal(observed.again, observed.captured.canonical);
    });
  });
});

describe("K1.1-C3 canonical form follows values.md rules 1-6", () => {
  test("member names sort as unsigned UTF-16 code units, not code points or locale", () => {
    assert.equal(canonicalOf({ b: 2, a: 1 }), '{"a":1,"b":2}');
    assert.equal(canonicalOf({ "é": 1, z: 2 }), '{"z":2,"é":1}', "z (U+007A) sorts before e-acute (U+00E9)");
    // U+10000 is the surrogate pair D800 DC00, so by code unit it precedes U+FFFD; by code point it
    // would follow it. This is the case that tells the two orderings apart.
    assert.equal(canonicalOf({ "\ufffd": 1, "\u{10000}": 2 }), '{"\u{10000}":2,"\ufffd":1}');
  });

  test("array order stays semantic", () => {
    assert.equal(equal([1, 2], [2, 1]), false);
    assert.equal(equal({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  });

  test("absent and explicitly null are different values", () => {
    assert.equal(canonicalOf({}), "{}");
    assert.equal(canonicalOf({ answer: null }), '{"answer":null}');
    assert.equal(equal({}, { answer: null }), false);
  });

  test("literals are spelled exactly", () => {
    assert.equal(canonicalOf(null), "null");
    assert.equal(canonicalOf(true), "true");
    assert.equal(canonicalOf(false), "false");
    assert.equal(canonicalOf([]), "[]");
    assert.equal(canonicalOf({}), "{}");
  });

  test("numbers use the shortest round-trip spelling values.md names", () => {
    assert.equal(canonicalOf(-0), "0");
    assert.equal(canonicalOf(1.0), "1");
    assert.equal(canonicalOf(1e21), "1e+21");
    assert.equal(canonicalOf(1e-6), "0.000001");
    assert.equal(canonicalOf(1e-7), "1e-7");
    assert.equal(equal(-0, 0), true, "negative zero and zero are the same logical value");
    assert.equal(equal(1, 1.0), true);
  });

  test("strings escape exactly the characters rule 4 names and nothing else", () => {
    assert.equal(canonicalOf('a"b'), '"a\\"b"');
    assert.equal(canonicalOf("a\\b"), '"a\\\\b"');
    assert.equal(canonicalOf("\b\t\n\f\r"), '"\\b\\t\\n\\f\\r"');
    assert.equal(canonicalOf("\u0000"), '"\\u0000"');
    assert.equal(canonicalOf("\u001f"), '"\\u001f"', "lowercase hex");
    assert.equal(canonicalOf("\u000b"), '"\\u000b"', "a C0 control with no named escape");
    assert.equal(canonicalOf("a/b"), '"a/b"', "the solidus is emitted directly");
    assert.equal(canonicalOf("\u007f"), '"\u007f"', "DEL is not a C0 control and is not escaped");
    assert.equal(canonicalOf("café 日 😀"), '"café 日 😀"', "other scalars pass through");
  });

  test("no insignificant whitespace and no byte-order mark", () => {
    assert.equal(canonicalOf({ a: [1, 2], b: { c: 3 } }), '{"a":[1,2],"b":{"c":3}}');
    assert.equal(canonicalOf("x").startsWith("\ufeff"), false);
  });

  test("equality is over canonical bytes, so two honest spellings of one value agree", () => {
    assert.equal(equal({ b: [1, { d: 4, c: 3 }], a: null }, { a: null, b: [1, { c: 3, d: 4 }] }), true);
    assert.equal(equal({ a: 1 }, { a: "1" }), false, "and a number is not its own text");
  });
});

describe("K1.1-C3 the four semantic limits, at the limit and one over", () => {
  test("decoded string length counts Unicode scalar values", () => {
    const atLimit = "a".repeat(BOUNDARY_LIMITS.stringScalarValues);
    assert.deepEqual(issueCodes({ s: atLimit }), [], "exactly at the limit passes");
    assert.deepEqual(issueCodes({ s: `${atLimit}a` }), ["string_too_long"], "one scalar value over is refused");

    // Astral characters are two UTF-16 code units each and one scalar value each. A limit counted in
    // code units would refuse this string at half the length the contract allows.
    const astral = "😀".repeat(BOUNDARY_LIMITS.stringScalarValues);
    assert.deepEqual(issueCodes({ s: astral }), [], "the unit is scalar values, not code units");
  });

  test("the same limit applies to member names", () => {
    const atLimit = "a".repeat(BOUNDARY_LIMITS.stringScalarValues);
    assert.deepEqual(issueCodes({ [atLimit]: null }), []);
    assert.deepEqual(issueCodes({ [`${atLimit}a`]: null }), ["string_too_long"]);
  });

  test("entry count counts direct children of one container, not a recursive total", () => {
    const atLimit = Array.from({ length: BOUNDARY_LIMITS.containerEntries }, () => 0);
    assert.deepEqual(issueCodes(atLimit), []);
    assert.deepEqual(issueCodes([...atLimit, 0]), ["too_many_entries"]);

    const members = Object.fromEntries(atLimit.map((_, index) => [`k${index}`, 0]));
    assert.deepEqual(issueCodes(members), []);
    assert.deepEqual(issueCodes({ ...members, extra: 0 }), ["too_many_entries"]);

    // Two containers of 4,096 are 8,192 values in total and are both inside the limit, because the
    // limit is per container. A recursive total would refuse this.
    assert.deepEqual(issueCodes({ left: atLimit, right: atLimit }), []);
  });

  test("depth counts containers on a path, with empty containers counting", () => {
    assert.deepEqual(issueCodes(nested(BOUNDARY_LIMITS.containerDepth)), [], "A32 passes");
    assert.deepEqual(issueCodes(nested(BOUNDARY_LIMITS.containerDepth + 1)), ["too_deep"], "A33 is refused");
    assert.deepEqual(issueCodes(alternating(BOUNDARY_LIMITS.containerDepth)), [], "T32 passes");
    assert.deepEqual(issueCodes(alternating(BOUNDARY_LIMITS.containerDepth + 1)), ["too_deep"], "T33 is refused");
    assert.deepEqual(issueCodes("scalar"), [], "a scalar has depth 0");
    assert.deepEqual(issueCodes([]), [], "an empty container has depth 1");
    // Object member names add no level: this is 32 containers, not 64.
    assert.deepEqual(issueCodes(alternating(BOUNDARY_LIMITS.containerDepth)), []);
  });

  test("a value nested far past the limit is refused rather than exhausting the stack", () => {
    assert.deepEqual(issueCodes(nested(50_000)), ["too_deep"]);
  });

  test("canonical size is measured per root, at the byte", () => {
    const atLimit = rootOfExactBytes(BOUNDARY_LIMITS.canonicalBytes);
    assert.deepEqual(issueCodes(atLimit), [], "exactly 1,048,576 canonical bytes passes");

    const last = atLimit[atLimit.length - 1] as string;
    const overLimit = [...atLimit.slice(0, -1), `${last}a`];
    assert.deepEqual(issueCodes(overLimit), ["too_many_bytes"], "one byte over is refused");
    assert.match(
      boundaryValueIssues(overLimit)[0]?.message ?? "",
      new RegExp(`${BOUNDARY_LIMITS.canonicalBytes + 1} bytes`),
      "and the refusal names the measured size, so the unit is checkable",
    );
  });

  test("sibling roots are not summed", () => {
    const sevenHundredKiB: BoundaryValue = rootOfExactBytes(700 * 1024);
    // values.md, "Fixed semantic limits": two sibling roots of about 700 KiB each, in one Outcome,
    // both pass. Each is measured on its own, which is what these two separate calls are.
    assert.deepEqual(issueCodes(sevenHundredKiB), []);
    assert.deepEqual(issueCodes(sevenHundredKiB), []);
  });

  test("the reported canonical byte length is the UTF-8 length, not the UTF-16 one", () => {
    const result = canonicalize("é");
    assert.ok(result.ok);
    assert.equal(result.value.canonical.length, 3, "two quotes and one UTF-16 code unit");
    assert.equal(result.value.canonicalBytes, 4, "but e-acute is two UTF-8 bytes");
  });
});

describe("refusing a value costs no more than the size limit allows", () => {
  /**
   * `[prefix, pad, pad, …]` whose canonical form is exactly `target` bytes.
   *
   * The prefix goes first so the last pad is what crosses the limit in the one-over variant; each
   * pad adds one comma, two quotes and its length.
   */
  const paddedToExactBytes = (prefix: BoundaryValue, target: number): BoundaryValue[] => {
    const base = canonicalize([prefix]);
    assert.ok(base.ok, "the prefix is a valid boundary value");
    let remaining = target - base.value.canonicalBytes;
    const root: BoundaryValue[] = [prefix];
    while (remaining > 65_000 + 3 + 3) {
      root.push("a".repeat(65_000));
      remaining -= 65_000 + 3;
    }
    root.push("a".repeat(remaining - 3));
    return root;
  };

  /**
   * Runs `body` in a child process and returns the JSON it prints last.
   *
   * A regression here is exponential work inside one synchronous call, which would block this
   * process's event loop so that no test timeout could ever fire. The child is killed instead, and
   * the kill fails the test rather than hanging the suite.
   */
  const inBoundedChild = <T>(body: string, prelude = ""): T => {
    const probe = `
      ${prelude}
      const { canonicalize, BOUNDARY_LIMITS } = await import("./packages/kernel/src/index.ts");
      const started = performance.now();
      ${body}
    `;
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", probe],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 },
    );
    return JSON.parse(output.trim().split("\n").pop() as string) as T;
  };

  test("the running count is exact: an at-limit value of every byte kind passes and one byte more is refused by it", () => {
    const quote = String.fromCharCode(0x22);
    const backslash = String.fromCharCode(0x5c);
    const controls = String.fromCharCode(0x00, 0x01, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1f);
    const wide = String.fromCharCode(0x7f, 0x80, 0x7ff, 0x800, 0xfffd, 0xffff);
    const bare = Object.create(null) as Record<string, BoundaryValue>;
    bare[`${controls}${quote}${backslash}/`] = [controls, `q${quote}b${backslash}s/`, wide, "é日😀"];
    const prefix = {
      names: bare,
      numbers: [0, -0, 1, 0.1, 1e20, 1e21, 1e-6, 1e-7, 5e-324, -1.5e300, 2 ** 53 + 2],
      literals: [null, true, false],
      empty: [{}, [], ""],
      own: JSON.parse('{"__proto__":{"x":[1]}}') as BoundaryValue,
    } as BoundaryValue;

    const atLimit = paddedToExactBytes(prefix, BOUNDARY_LIMITS.canonicalBytes);
    const accepted = canonicalize(atLimit);
    assert.ok(accepted.ok, "a value of exactly 1,048,576 canonical bytes is never refused by the running count");
    assert.equal(accepted.value.canonicalBytes, BOUNDARY_LIMITS.canonicalBytes);

    // The early refusal names its running count. Reaching exactly one byte over proves the count
    // matched the canonical form byte for byte: an undercount would have left this to the finished-
    // bytes check (whose message has no "at least"), and an overcount would have refused the value above.
    const overLimit = [...atLimit.slice(0, -1), `${atLimit[atLimit.length - 1] as string}a`];
    const issues = boundaryValueIssues(overLimit);
    assert.deepEqual(issues.map((issue) => issue.code), ["too_many_bytes"]);
    assert.equal(issues[0]?.path, "", "size belongs to the root");
    assert.match(issues[0]?.message ?? "", new RegExp(`at least ${BOUNDARY_LIMITS.canonicalBytes + 1} bytes`));
  });

  test("a shared member is accepted, and counted in full at every place it appears", () => {
    // Levels of `[v, v]` over `[]`: size(0) = 2 and size(k) = 2 * size(k - 1) + 3, so 5 * 2^k - 3.
    let value: BoundaryValue = [];
    for (let level = 0; level < 12; level += 1) value = [value, value];
    const result = canonicalize(value);
    assert.ok(result.ok, "sharing a member is not itself a reason to refuse");
    assert.equal(result.value.canonicalBytes, 5 * 2 ** 12 - 3);
    assert.equal(canonicalOf(result.value.value), result.value.canonical, "the retained structure re-canonicalizes to its identity");
  });

  /**
   * The unit table (`CAPTURE_WORK_BUDGET` in `values.ts`) applied, in the order capture reads, to `levels`
   * of `[v, v]` above one shared `[]` leaf, up to the first byte charge past the size limit.
   *
   * Each array occurrence costs one visit, its names listing (`1 +` its names: two indices and `length`
   * for `[v, v]`, only `length` for `[]`) and its symbols listing (1), and only then its structure bytes
   * (3 for `[v, v]`, 2 for `[]`); each position costs one element unit before its value is captured. A
   * shared member is counted in full at every place it appears. Once a charge passes the limit, nothing
   * further is charged.
   */
  const doublingToByteStop = (
    levels: number,
  ): { bytes: number; visit: number; listing: number; element: number; leafVisits: number } => {
    const model = { bytes: 0, visit: 0, listing: 0, element: 0, leafVisits: 0, stopped: false };
    const occurrence = (height: number): void => {
      model.visit += 1;
      if (height === 0) model.leafVisits += 1;
      model.listing += 1 + (height === 0 ? 1 : 3) + 1;
      model.bytes += height === 0 ? 2 : 3;
      if (model.bytes > BOUNDARY_LIMITS.canonicalBytes) {
        model.stopped = true;
        return;
      }
      for (let position = 0; height > 0 && position < 2 && !model.stopped; position += 1) {
        model.element += 1;
        occurrence(height - 1);
      }
    };
    occurrence(levels);
    return { bytes: model.bytes, visit: model.visit, listing: model.listing, element: model.element, leafVisits: model.leafVisits };
  };

  /** Canonical punctuation bytes of an array (`isObject` false) or object of `entries` entries. */
  const structureBytes = (entries: number, isObject: boolean): number => (entries === 0 ? 2 : 2 + (entries - 1) + (isObject ? entries : 0));

  test("thirty-two arrays standing for four billion are refused after reading about a megabyte", () => {
    // K1.1-correction-03: converted from a getPrototypeOf-trap Proxy that counted leaf visits (owner
    // decision-01 item 2). The genuine shared leaf is tracked in a wrapped child instead, so each of its
    // prototype observations is one visit; the timing gate is replaced by exact meter counts.
    const observed = inWrappedChild<{ captured: ChildCapture; leafVisits: number; leafListings: number }>(`
      ${SUMMARIZE}
      // The innermost array, observed once for each place it appears in the expanded value.
      const leaf = track([]);
      let value = leaf;
      for (let level = 0; level < 31; level += 1) value = [value, value];
      reset();
      const captured = summarize(values.captureWithWork(value));
      const observedCounts = snapshot();
      emit({ captured, leafVisits: observedCounts.prototypeTracked, leafListings: observedCounts.namesTracked });
    `, { timeout: 60_000 });
    const model = doublingToByteStop(31);
    assert.equal(observed.captured.ok, false);
    assert.deepEqual(observed.captured.issues, [byteStop(model.bytes)], "within the depth and entry limits, refused for size alone");
    // Each occurrence of the innermost array is at least its own two bytes, so no more than half the
    // limit's worth of them can be read before the count passes it. Unbounded, this is 2^31.
    assert.equal(observed.leafVisits, model.leafVisits, `read ${observed.leafVisits} occurrences of the shared leaf`);
    assert.equal(observed.leafListings, model.leafVisits, "each occurrence was listed once");
    assert.ok(observed.leafVisits <= BOUNDARY_LIMITS.canonicalBytes / 2);
    assert.deepEqual(
      observed.captured.work,
      workOf({ visit: model.visit, listing: model.listing, element: model.element, stop: "bytes" }),
      "every unit of the refusal, read before the byte stop",
    );
  });

  test("one long string shared across shared arrays is refused before a second megabyte is read", () => {
    // K1.1-correction-03: converted from a getOwnPropertyDescriptor-trap Proxy that counted element
    // observations (owner decision-01 item 2). The genuine inner array is tracked in a wrapped child; the
    // timing gate is replaced by exact meter counts.
    const observed = inWrappedChild<{ captured: ChildCapture; elementObservations: number }>(`
      ${SUMMARIZE}
      const text = "x".repeat(values.BOUNDARY_LIMITS.stringScalarValues);
      // Counts element observations of the inner array, which appears 4,096 times in the outer one.
      const inner = track(new Array(values.BOUNDARY_LIMITS.containerEntries).fill(text));
      let elementObservations = 0;
      hooks.descriptor = (target, key, real) => {
        if (target === inner && key !== "length") elementObservations += 1;
        return real;
      };
      const captured = summarize(values.captureWithWork(new Array(values.BOUNDARY_LIMITS.containerEntries).fill(inner)));
      emit({ captured, elementObservations });
    `, { timeout: 60_000 });
    // Each string is 65,538 canonical bytes. The outer array and the first inner one charge their 4,097
    // punctuation bytes first, so the sixteenth string passes the limit. Unbounded, this expands to about
    // a terabyte.
    const entries = BOUNDARY_LIMITS.containerEntries;
    const arrayBytes = structureBytes(entries, false);
    const perString = BOUNDARY_LIMITS.stringScalarValues + 2;
    const strings = Math.floor((BOUNDARY_LIMITS.canonicalBytes - 2 * arrayBytes) / perString) + 1;
    assert.equal(observed.captured.ok, false);
    assert.deepEqual(observed.captured.issues, [byteStop(2 * arrayBytes + strings * perString)]);
    assert.equal(observed.elementObservations, strings, `read ${observed.elementObservations} strings`);
    assert.ok(observed.elementObservations <= Math.ceil(BOUNDARY_LIMITS.canonicalBytes / perString) + 1);
    // Two array visits and one per string; each array's names (1 + 4,097) and symbols (1) listings; one
    // outer element and one per string; each string scanned in full once.
    assert.deepEqual(
      observed.captured.work,
      workOf({
        visit: 2 + strings,
        listing: 2 * (1 + entries + 1 + 1),
        element: 1 + strings,
        string: strings * BOUNDARY_LIMITS.stringScalarValues,
        stop: "bytes",
      }),
    );
  });

  test("a shared member refused for another reason is not re-read without bound either", () => {
    // K1.1-correction-03: converted from a getOwnPropertyDescriptor-trap Proxy that counted element
    // observations (owner decision-01 item 2), as above.
    const observed = inWrappedChild<{ captured: ChildCapture; elementObservations: number }>(`
      ${SUMMARIZE}
      // Too long to accept, so it has no canonical bytes of its own; reading it is still charged.
      const text = "x".repeat(200000);
      const inner = track(new Array(values.BOUNDARY_LIMITS.containerEntries).fill(text));
      let elementObservations = 0;
      hooks.descriptor = (target, key, real) => {
        if (target === inner && key !== "length") elementObservations += 1;
        return real;
      };
      const captured = summarize(values.captureWithWork(new Array(values.BOUNDARY_LIMITS.containerEntries).fill(inner)));
      emit({ captured, elementObservations });
    `, { timeout: 60_000 });
    // Each refused occurrence is charged its 200,000-unit length, after the two arrays' 4,097 bytes each,
    // so the sixth passes the limit. Refused by its length alone, it costs no string units.
    const entries = BOUNDARY_LIMITS.containerEntries;
    const arrayBytes = structureBytes(entries, false);
    const strings = Math.floor((BOUNDARY_LIMITS.canonicalBytes - 2 * arrayBytes) / 200_000) + 1;
    const tooLong = {
      code: "string_too_long",
      message: `string cannot fit within the limit of ${BOUNDARY_LIMITS.stringScalarValues} Unicode scalar values`,
    };
    assert.equal(observed.captured.ok, false);
    assert.deepEqual(observed.captured.issues, [
      ...Array.from({ length: strings }, (_, index) => ({ path: `[0][${index}]`, ...tooLong })),
      byteStop(2 * arrayBytes + strings * 200_000),
    ], "the first reason is still the real one, and reading stopped at the byte limit");
    assert.equal(observed.elementObservations, strings, `read ${observed.elementObservations} strings`);
    assert.ok(observed.elementObservations <= Math.ceil(BOUNDARY_LIMITS.canonicalBytes / 200_000) + 1);
    assert.deepEqual(
      observed.captured.work,
      workOf({ visit: 2 + strings, listing: 2 * (1 + entries + 1 + 1), element: 1 + strings, diagnostic: strings, stop: "bytes" }),
    );
  });

  // KC2-R1-01. The tests above bound how often a shared member is re-read; these bound the reading
  // inside one visit. Each count comes from a wrapper installed before the module loads, so it sees
  // exactly the reads the Kernel's own captured primordials make, and nothing the probe itself does.
  const countingCharCodeAt = `
    const originalCharCodeAt = String.prototype.charCodeAt;
    globalThis.__reads = 0;
    String.prototype.charCodeAt = function (index) {
      globalThis.__reads += 1;
      return Reflect.apply(originalCharCodeAt, this, [index]);
    };
  `;
  const restoreCharCodeAt = "String.prototype.charCodeAt = originalCharCodeAt;";
  type ReadProbe = { ok: boolean; codes: string[]; reads: number; ms: number };
  const stringReadBound = 2 * (BOUNDARY_LIMITS.stringScalarValues + 1);

  test("one oversized string is refused after reading about the length limit, not its length", () => {
    const observed = inBoundedChild<ReadProbe>(`
      ${restoreCharCodeAt}
      const text = "a".repeat(33_554_432);
      globalThis.__reads = 0;
      const result = canonicalize(text);
      console.log(JSON.stringify({
        ok: result.ok,
        codes: result.ok ? [] : result.issues.map((issue) => issue.code),
        reads: globalThis.__reads,
        ms: performance.now() - started,
      }));
    `, countingCharCodeAt);
    assert.equal(observed.ok, false);
    assert.equal(observed.codes[0], "string_too_long");
    assert.ok(observed.reads <= stringReadBound, `read ${observed.reads} code units of a 33,554,432-unit string`);
  });

  test("one oversized member name is refused after reading about the length limit, not its length", () => {
    const observed = inBoundedChild<ReadProbe>(`
      ${restoreCharCodeAt}
      const key = "k".repeat(33_554_432);
      globalThis.__reads = 0;
      const result = canonicalize({ [key]: null });
      console.log(JSON.stringify({
        ok: result.ok,
        codes: result.ok ? [] : result.issues.map((issue) => issue.code),
        reads: globalThis.__reads,
        ms: performance.now() - started,
      }));
    `, countingCharCodeAt);
    assert.equal(observed.ok, false);
    assert.equal(observed.codes[0], "string_too_long");
    assert.ok(observed.reads <= stringReadBound, `read ${observed.reads} code units of a 33,554,432-unit name`);
  });

  test("a shared oversized string is read about once, and a shared long one only until the byte limit", () => {
    const observed = inBoundedChild<{ huge: ReadProbe; long: ReadProbe }>(`
      ${restoreCharCodeAt}
      const measure = (value) => {
        globalThis.__reads = 0;
        const result = canonicalize(value);
        return {
          ok: result.ok,
          codes: result.ok ? [] : result.issues.map((issue) => issue.code),
          reads: globalThis.__reads,
          ms: performance.now() - started,
        };
      };
      const huge = measure(new Array(BOUNDARY_LIMITS.containerEntries).fill("a".repeat(33_554_432)));
      const long = measure(new Array(BOUNDARY_LIMITS.containerEntries).fill("a".repeat(70_000)));
      console.log(JSON.stringify({ huge, long }));
    `, countingCharCodeAt);
    assert.equal(observed.huge.ok, false);
    assert.equal(observed.huge.codes[observed.huge.codes.length - 1], "too_many_bytes");
    assert.ok(observed.huge.reads <= stringReadBound, `read ${observed.huge.reads} code units across 4,096 shared occurrences`);
    // Each refused occurrence is charged its 70,000-unit length, so the byte limit ends the pass after
    // at most ceil(limit / 70,000) + 1 visits, each reading at most the per-string bound.
    const visits = Math.ceil(BOUNDARY_LIMITS.canonicalBytes / 70_000) + 1;
    assert.equal(observed.long.codes[observed.long.codes.length - 1], "too_many_bytes");
    assert.ok(observed.long.reads <= visits * stringReadBound, `read ${observed.long.reads} code units`);
  });

  test("an oversized own-names listing is classified after at most one descriptor past the entry limit", () => {
    // K1.1-correction-03: converted from getOwnPropertyDescriptor-trap Proxies that counted descriptor
    // reads (owner decision-01 item 2). The genuine objects are tracked in a wrapped child, where every
    // own-descriptor observation the Kernel makes of each is counted; the bounds become exact counts.
    type Scenario = { captured: ChildCapture; reads: number };
    const observed = inWrappedChild<{ single: Scenario; shared: Scenario; justOver: Scenario }>(`
      ${SUMMARIZE}
      const reads = new Map();
      hooks.descriptor = (target, key, real) => {
        reads.set(target, (reads.get(target) ?? 0) + 1);
        return real;
      };
      const named = (count) => track(Object.fromEntries(Array.from({ length: count }, (_, i) => ["k" + i, 0])));
      const one = named(550_000);
      const single = { captured: summarize(values.captureWithWork(one)), reads: reads.get(one) ?? 0 };
      const two = named(550_000);
      const shared = { captured: summarize(values.captureWithWork(new Array(64).fill(two))), reads: reads.get(two) ?? 0 };
      const over = named(values.BOUNDARY_LIMITS.containerEntries + 1);
      const justOver = { captured: summarize(values.captureWithWork(over)), reads: reads.get(over) ?? 0 };
      emit({ single, shared, justOver });
    `, { timeout: 60_000 });
    const bound = BOUNDARY_LIMITS.containerEntries + 1;
    const tooMany = {
      code: "too_many_entries",
      message: `object has more than ${BOUNDARY_LIMITS.containerEntries} members, the limit; it lists 550000 own names`,
    };
    // 4,097 descriptors make the object certainly refused; its punctuation for 550,000 names then passes
    // the size limit, so nothing further is read.
    assert.equal(observed.single.captured.ok, false);
    assert.deepEqual(observed.single.captured.issues, [{ path: "", ...tooMany }, byteStop(structureBytes(550_000, true))]);
    assert.equal(observed.single.reads, bound, `read ${observed.single.reads} descriptors of 550,000 names`);
    assert.equal(observed.single.captured.work.descriptor, bound);
    // The first of 64 shared occurrences ends the root the same way, after the outer array's 65 bytes.
    assert.deepEqual(observed.shared.captured.issues, [{ path: "[0]", ...tooMany }, byteStop(structureBytes(64, false) + structureBytes(550_000, true))]);
    assert.equal(observed.shared.reads, bound, `read ${observed.shared.reads} descriptors across 64 shared occurrences`);
    assert.equal(observed.shared.captured.work.descriptor, bound);
    // At exactly one over, every name is still read and the reason is the same as before the bound.
    assert.deepEqual(observed.justOver.captured.issues, [
      { path: "", code: "too_many_entries", message: `object has ${bound} members, above the limit of ${BOUNDARY_LIMITS.containerEntries}` },
    ]);
    assert.equal(observed.justOver.reads, bound);
    assert.equal(observed.justOver.captured.work.descriptor, bound);
  });

  test("an array listing more names than any accepted array owns is refused without classifying each", () => {
    // K1.1-correction-03: converted from an ownKeys-trap Proxy that also counted descriptor reads (owner
    // decision-01 item 2). A hook makes the one own-names listing of a genuine `[]` report the 1,000,001
    // names; every own-descriptor observation of it is counted.
    const observed = inWrappedChild<{ captured: ChildCapture; indexReads: number; listed: number; symbolListings: number }>(`
      ${SUMMARIZE}
      const listed = ["length", ...Array.from({ length: 1_000_000 }, (_, i) => String(i))];
      const value = track([]);
      hooks.names = () => listed;
      let indexReads = 0;
      hooks.descriptor = (target, key, real) => {
        if (key !== "length") indexReads += 1;
        return real;
      };
      reset();
      // The whole result is printed: diagnostics are compressed to at most eight details and one suffix
      // entry per code, so even an implementation reporting one issue per name prints a bounded list.
      const captured = summarize(values.captureWithWork(value));
      const observedCounts = snapshot();
      emit({ captured, indexReads, listed: observedCounts.namesListed, symbolListings: observedCounts.symbolsTracked });
    `, { timeout: 60_000 });
    assert.equal(observed.listed, 1_000_001, "the one listing really reported every name");
    assert.equal(observed.captured.ok, false);
    assert.equal(observed.indexReads, 0, `read ${observed.indexReads} index descriptors of a 1,000,001-name listing`);
    // One aggregate reason: the listing holds more names than an array of at most 4,096 entries owns.
    assert.deepEqual(observed.captured.issues, [
      {
        path: "",
        code: "unrepresentable_member",
        message: `array lists 1000001 own names, more than an array of at most ${BOUNDARY_LIMITS.containerEntries} entries owns; canonical form would silently drop the rest`,
      },
    ]);
    // One visit, the names listing (1 + 1,000,001), one metered symbols listing (1: listed even though the
    // names already refuse the array, packet review MS-02) and nothing per name: no descriptor, no element.
    // Its surplus names still cost 1,000,000 bytes, within the size limit.
    assert.equal(observed.symbolListings, 1);
    assert.deepEqual(observed.captured.work, workOf({ visit: 1, listing: 1 + 1_000_001 + 1, diagnostic: 1, stop: "none" }));
  });
});

describe("K11-R2-VAL-02 serializer boundary sees only the accepted snapshot (round-5 reconstruction)", () => {
  test("an inherited Object.prototype.toJSON cannot divert canonical bytes from the retained snapshot", () => {
    const previous = (Object.prototype as Record<string, unknown>).toJSON;
    (Object.prototype as Record<string, unknown>).toJSON = () => 42;
    try {
      const result = canonicalize({ a: 1 });
      assert.ok(result.ok, "a plain object stays acceptable under ambient pollution");
      assert.equal(result.value.canonical, '{"a":1}', "bytes describe the snapshot, not the hook's return");
      assert.deepEqual(result.value.value, { a: 1 });
      const again = canonicalize(result.value.value);
      assert.ok(again.ok);
      assert.equal(again.value.canonical, result.value.canonical, "retained state re-canonicalizes to its identity");
    } finally {
      if (previous === undefined) delete (Object.prototype as Record<string, unknown>).toJSON;
      else (Object.prototype as Record<string, unknown>).toJSON = previous;
    }
  });

  test("an inherited Array.prototype.toJSON cannot divert canonical bytes either", () => {
    const previous = (Array.prototype as unknown as Record<string, unknown>).toJSON;
    (Array.prototype as unknown as Record<string, unknown>).toJSON = function () {
      return 99;
    };
    try {
      const result = canonicalize([1, 2]);
      assert.ok(result.ok);
      assert.equal(result.value.canonical, "[1,2]");
      assert.deepEqual(result.value.value, [1, 2]);
    } finally {
      if (previous === undefined) delete (Array.prototype as unknown as Record<string, unknown>).toJSON;
      else (Array.prototype as unknown as Record<string, unknown>).toJSON = previous;
    }
  });

  test("a capture-time side effect installing Object.prototype.toJSON still binds the observed structure", () => {
    // K1.1-correction-03: converted from a get-trap Proxy that installed the hook from inside capture
    // (owner decision-01 item 2). That Proxy is now refused before its trap can run. The installation
    // stays capture-time: a wrapped-child hook performs it from the Kernel's own descriptor observation of
    // a genuine `{a: 1}`, after capture began and before the serializer runs. (The case above installs
    // the same hook before the call.)
    const previous = (Object.prototype as Record<string, unknown>).toJSON;
    if (previous !== undefined) delete (Object.prototype as Record<string, unknown>).toJSON;
    const witness = countingProxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Object.prototype as Record<string, unknown>).toJSON = () => 42;
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    let witnessIssues: ReturnType<typeof boundaryValueIssues> = [];
    let installedByWitness: unknown;
    try {
      witnessIssues = boundaryValueIssues(witness.proxy);
    } finally {
      installedByWitness = (Object.prototype as Record<string, unknown>).toJSON;
      if (previous === undefined) delete (Object.prototype as Record<string, unknown>).toJSON;
      else (Object.prototype as Record<string, unknown>).toJSON = previous;
    }
    assert.deepEqual(witnessIssues, [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(installedByWitness, undefined, "so its side effect never ran");

    // Owns 1 and reads 1, so capture accepts — but observing it installs the hook as a side effect
    // before the serializer runs. Review-03's witness produced canonical `42` here.
    const observed = inWrappedChild<{ captured: ChildCapture; installs: number; installed: string; again: string | null }>(`
      ${SUMMARIZE}
      const value = track({ a: 1 });
      let installs = 0;
      hooks.descriptor = (target, key, real) => {
        if (key === "a") {
          Object.prototype.toJSON = () => 42;
          installs += 1;
        }
        return real;
      };
      let captured;
      let installed;
      try {
        captured = summarize(values.captureWithWork(value));
      } finally {
        installed = typeof Object.prototype.toJSON;
        // Before emitting: JSON.stringify would otherwise print the hook's answer.
        delete Object.prototype.toJSON;
      }
      const again = captured.ok ? values.canonicalize(captured.value) : null;
      emit({ captured, installs, installed, again: again !== null && again.ok ? again.value.canonical : null });
    `);
    assert.equal(observed.installs, 1);
    assert.equal(observed.installed, "function", "the side effect really installed the hook");
    assert.equal(observed.captured.ok, true, "the coherent reading is still acceptable");
    assert.equal(observed.captured.canonical, '{"a":1}');
    assert.deepEqual(observed.captured.value, { a: 1 });
    assert.equal(observed.again, '{"a":1}', "retained state re-canonicalizes to its identity");
  });

  test("a legitimate own toJSON data member is still content, not a hook", () => {
    const result = canonicalize({ toJSON: 1, a: 2 });
    assert.ok(result.ok);
    assert.equal(result.value.canonical, '{"a":2,"toJSON":1}');
  });

  /**
   * K1.1-correction-03: a genuine array cannot list an index at or beyond its own `length`, so the two
   * supplement witnesses below were Proxies. Each is now refused before its traps run (owner decision-01
   * item 2) and kept as a witness; the phantom-index check is reached by hooks on the Kernel's one
   * own-names listing (and, for the backed case, one own-descriptor observation) of a genuine `[]`.
   */
  const phantomIndexWitness = (index: string, backing: PropertyDescriptor | undefined): { proxy: unknown[]; calls: () => number } =>
    countingProxy([] as unknown[], {
      ownKeys(): string[] {
        return ["length", index];
      },
      getOwnPropertyDescriptor(target, property): PropertyDescriptor | undefined {
        if (property === "length") return { value: 0, writable: true, enumerable: false, configurable: false };
        if (property === index) return backing;
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      get(target, property, receiver): unknown {
        if (property === "length") return 0;
        return Reflect.get(target, property, receiver);
      },
    });

  test("an own-name listing reporting a canonical index outside length with no backing property is refused", () => {
    // Supplement witness: extensible empty-array target, length 0, ownKeys reports '10', no
    // descriptor behind it. The old partition dropped it into an accepted [].
    // K1.1-correction-03: converted from that ownKeys-trap Proxy (owner decision-01 item 2).
    const witness = phantomIndexWitness("10", undefined);
    assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
    assert.equal(canonicalize(witness.proxy).ok, false);
    assert.equal(witness.calls(), 0, "refused before any trap ran");

    const observed = inWrappedChild<{ captured: ChildCapture; listings: number; isArray: boolean; length: number }>(`
      ${SUMMARIZE}
      const value = track([]);
      let listings = 0;
      hooks.names = (target, real) => {
        listings += 1;
        return [...real, "10"];
      };
      const captured = summarize(values.captureWithWork(value));
      emit({ captured, listings, isArray: Array.isArray(value), length: value.length });
    `);
    assert.equal(observed.isArray, true);
    assert.equal(observed.length, 0);
    assert.equal(observed.listings, 1, "the one listing reported length and '10'");
    assert.equal(observed.captured.ok, false, "refused, not accepted as []");
    assert.deepEqual(observed.captured.issues, [{ path: "[10]", code: "unstable_representation", message: INDEX_NOT_OWNED }], "located unstable listing");
  });

  test("a backed canonical index outside length is also refused rather than silently dropped", () => {
    // K1.1-correction-03: converted from an ownKeys/getOwnPropertyDescriptor-trap Proxy (owner
    // decision-01 item 2).
    const witness = phantomIndexWitness("5", { value: 7, writable: true, enumerable: true, configurable: true });
    assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
    assert.equal(canonicalize(witness.proxy).ok, false);
    assert.equal(witness.calls(), 0, "refused before any trap ran");

    const observed = inWrappedChild<{ captured: ChildCapture; backings: number }>(`
      ${SUMMARIZE}
      const value = track([]);
      hooks.names = (target, real) => [...real, "5"];
      let backings = 0;
      hooks.descriptor = (target, key, real) => {
        if (key !== "5") return real;
        backings += 1;
        return { value: 7, writable: true, enumerable: true, configurable: true };
      };
      const captured = summarize(values.captureWithWork(value));
      emit({ captured, backings });
    `);
    assert.equal(observed.backings, 1, "the outside index's own descriptor was observed once");
    assert.equal(observed.captured.ok, false);
    assert.deepEqual(observed.captured.issues, [{ path: "[5]", code: "unrepresentable_member", message: INDEX_OUTSIDE_LENGTH }], "the outside index is located");
  });

  test("a throwing observation whose thrown value is itself hostile to inspection still becomes a refusal", () => {
    // K1.1-correction-03: converted from a throwing-trap Proxy witness (owner decision-01 item 2). The
    // throw now comes from a hook on the Kernel's descriptor observation of a plain object; what it throws
    // is still a Proxy hostile to inspection, every trap of which is counted.
    const hostileError = new Proxy(
      {},
      {
        get(_target, property): unknown {
          if (property === "constructor") throw new Error("constructor boom");
          return undefined;
        },
      },
    );
    const witness = countingProxy({ a: 1 }, {
      getOwnPropertyDescriptor(): PropertyDescriptor {
        throw hostileError;
      },
    });
    assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before the throwing trap could run");

    const observed = inWrappedChild<{ threw: string | null; captured: ChildCapture | null; thrown: number; inspected: number }>(`
      ${SUMMARIZE}
      // Every trap of the thrown value is counted; "constructor" throws, as before.
      let inspected = 0;
      const hostileError = new Proxy({}, new Proxy({}, {
        get(_handler, trap) {
          return (...args) => {
            inspected += 1;
            if (trap === "get" && args[1] === "constructor") throw new Error("constructor boom");
            return Reflect[trap](...args);
          };
        },
      }));
      const value = track({ a: 1 });
      let thrown = 0;
      hooks.descriptor = () => {
        thrown += 1;
        throw hostileError;
      };
      let threw = null;
      let captured = null;
      try {
        captured = summarize(values.captureWithWork(value));
      } catch (error) {
        threw = typeof error;
      }
      emit({ threw, captured, thrown, inspected });
    `);
    assert.equal(observed.threw, null, "the Kernel boundary refuses; it does not propagate the caller's exception or the formatter's");
    assert.equal(observed.thrown, 1, "the hostile value really was thrown");
    assert.equal(observed.inspected, 0, "the refusal's label inspected nothing of what was thrown");
    assert.deepEqual(observed.captured?.issues, [{ path: "", code: "unstable_representation", message: THREW_OBJECT }]);
  });
});

describe("K11-R3-LIMIT-01 over-limit arrays refuse without work proportional to the declared length", () => {
  test("exactly-at-limit passes and one-over refuses", () => {
    const atLimit = Array.from({ length: BOUNDARY_LIMITS.containerEntries }, () => 0);
    assert.deepEqual(issueCodes(atLimit), []);
    assert.deepEqual(issueCodes([...atLimit, 0]), ["too_many_entries"]);
  });

  test("a deliberately huge sparse length refuses bounded without traversing its extent", () => {
    // K1.1-correction-03: converted from a getOwnPropertyDescriptor-trap Proxy that counted index reads
    // (owner decision-01 item 2). The genuine sparse array is tracked in a wrapped child, where every own
    // descriptor and listing the Kernel takes of it is counted; the bound becomes exact counts.
    const HUGE = 20_000_000;
    const observed = inWrappedChild<{ captured: ChildCapture; indexReads: number; listings: number; symbolListings: number }>(`
      ${SUMMARIZE}
      const target = [];
      target.length = ${HUGE};
      track(target);
      let indexReads = 0;
      hooks.descriptor = (inner, key, real) => {
        if (key !== "length") indexReads += 1;
        return real;
      };
      reset();
      const captured = summarize(values.captureWithWork(target));
      const observedCounts = snapshot();
      emit({ captured, indexReads, listings: observedCounts.namesTracked, symbolListings: observedCounts.symbolsTracked });
    `);
    assert.deepEqual(observed.captured.issues, [
      { path: "", code: "too_many_entries", message: `array has ${HUGE} entries, above the limit of ${BOUNDARY_LIMITS.containerEntries}` },
    ]);
    assert.equal(observed.indexReads, 0, `rejection traversed no index extent (saw ${observed.indexReads} index descriptor reads for length ${HUGE})`);
    assert.equal(observed.listings, 0, "and listed none of its names");
    assert.equal(observed.symbolListings, 0);
    assert.deepEqual(observed.captured.work, workOf({ visit: 1, diagnostic: 1, stop: "none" }), "one visit and one diagnostic, whatever the length");
    // And the plain huge sparse array itself refuses the same way.
    const target: unknown[] = [];
    target.length = HUGE;
    assert.deepEqual(issueCodes(target), ["too_many_entries"]);
  });
});

describe("K11-R2-VAL-02 serializer execution environment is caller-independent (round-6)", () => {
  /**
   * K1.1-correction-03: these cases used a get-trap Proxy that replaced an intrinsic as a side effect of
   * capture's one reading. Capture now refuses that Proxy before its trap can run (owner decision-01
   * item 2), so each case keeps it as a witness that the side effect never happens, and installs the same
   * replacement before the call instead (a pre-call twin): the replacement is still live across the
   * whole boundary call, which is what the serializer window has to neutralize.
   */
  const sneakyWitness = (target: Record<string, unknown>, property: string, sideEffect: () => void): { proxy: Record<string, unknown>; calls: () => number } =>
    countingProxy(target, {
      get(inner, key, receiver): unknown {
        if (key === property) sideEffect();
        return Reflect.get(inner, key, receiver);
      },
    });

  test("K11-R2-VAL-02 round 6: a one-shot Object.keys replacement live across the call cannot change canonical bytes", () => {
    // K1.1-correction-03: converted from "a capture-time one-shot Object.keys replacement cannot change
    // canonical bytes", whose get-trap Proxy installed the replacement (owner decision-01 item 2).
    const realKeys = Object.keys;
    const witness = sneakyWitness({ a: 1 }, "a", () => {
      (Object as unknown as Record<string, unknown>).keys = () => [];
    });
    let witnessIssues: ReturnType<typeof boundaryValueIssues> = [];
    let keysAfterWitness: unknown;
    try {
      witnessIssues = boundaryValueIssues(witness.proxy);
    } finally {
      keysAfterWitness = Object.keys;
      Object.keys = realKeys;
    }
    assert.deepEqual(witnessIssues, [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(keysAfterWitness, realKeys, "so the replacement was never installed");

    // A coherent value, with a live-global replacement installed before the call. Review-04's witness
    // bound `{}` here while retaining `{a:1}`; the restored serializer environment must bind `{"a":1}`.
    (Object as unknown as Record<string, unknown>).keys = () => [];
    let result: ReturnType<typeof canonicalize>;
    try {
      result = canonicalize({ a: 1 });
      assert.notEqual(Object.keys, realKeys, "the replacement was live across the boundary call");
    } finally {
      Object.keys = realKeys;
    }
    assert.ok(result!.ok, "the coherent reading is still acceptable");
    assert.equal(result!.ok && result!.value.canonical, '{"a":1}', "bytes describe the snapshot, not the replacement");
    assert.deepEqual(result!.ok && result!.value.value, { a: 1 });
    const again = canonicalize(result!.ok && result!.value.value);
    assert.ok(again.ok);
    assert.equal(again.ok && again.value.canonical, '{"a":1}', "retained state re-canonicalizes to its identity");
  });

  test("K11-R2-VAL-02 round 6: an Object.keys replacement that throws, live across the call, neither leaks nor diverts bytes", () => {
    // K1.1-correction-03: converted from "a capture-time replacement that makes Object.keys throw neither
    // leaks nor diverts bytes", whose get-trap Proxy installed the replacement (owner decision-01 item 2).
    const realKeys = Object.keys;
    const throwingKeys = (): never => {
      throw new Error("keys boom");
    };
    const witness = sneakyWitness({ a: 1 }, "a", () => {
      (Object as unknown as Record<string, unknown>).keys = throwingKeys;
    });
    let witnessIssues: ReturnType<typeof boundaryValueIssues> = [];
    let keysAfterWitness: unknown;
    try {
      witnessIssues = boundaryValueIssues(witness.proxy);
    } finally {
      keysAfterWitness = Object.keys;
      Object.keys = realKeys;
    }
    assert.deepEqual(witnessIssues, [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(keysAfterWitness, realKeys, "so the replacement was never installed");

    (Object as unknown as Record<string, unknown>).keys = throwingKeys;
    let threw = false;
    let result: ReturnType<typeof canonicalize> | undefined;
    let liveAcross = false;
    try {
      result = canonicalize({ a: 1 });
      liveAcross = Object.keys === throwingKeys;
    } catch {
      threw = true;
    } finally {
      Object.keys = realKeys;
    }
    // The restored environment neutralizes a configurable replacement, so the valid value is
    // still accepted with its own bytes; what must never happen is the ambient exception
    // escaping the Kernel boundary (review-04's `escaped: keys boom`) or bytes for `{}`.
    assert.equal(threw, false, "the Kernel boundary contains serializer failure; it does not propagate the ambient exception");
    assert.equal(liveAcross, true, "the throwing replacement was live across the boundary call");
    assert.ok(result && result.ok, "the coherent reading is still acceptable");
    assert.equal(result && result.ok && result.value.canonical, '{"a":1}');
    assert.deepEqual(result && result.ok && result.value.value, { a: 1 });
  });

  test("K11-R2-VAL-02 round 6: an Array.prototype.join replacement live across the call cannot change canonical bytes either", () => {
    // K1.1-correction-03: converted from "a capture-time Array.prototype.join replacement cannot change
    // canonical bytes either", whose get-trap Proxy installed the replacement (owner decision-01 item 2).
    const realJoin = Array.prototype.join;
    const witness = sneakyWitness({ list: [1, 2] }, "list", () => {
      (Array.prototype as unknown as Record<string, unknown>).join = () => "";
    });
    let witnessIssues: ReturnType<typeof boundaryValueIssues> = [];
    let joinAfterWitness: unknown;
    try {
      witnessIssues = boundaryValueIssues(witness.proxy);
    } finally {
      joinAfterWitness = Array.prototype.join;
      (Array.prototype as unknown as Record<string, unknown>).join = realJoin;
    }
    assert.deepEqual(witnessIssues, [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(joinAfterWitness, realJoin, "so the replacement was never installed");

    (Array.prototype as unknown as Record<string, unknown>).join = () => "";
    let result: ReturnType<typeof canonicalize>;
    try {
      result = canonicalize({ list: [1, 2] });
      assert.notEqual(Array.prototype.join, realJoin, "the replacement was live across the boundary call");
    } finally {
      (Array.prototype as unknown as Record<string, unknown>).join = realJoin;
    }
    assert.ok(result!.ok);
    assert.equal(result!.ok && result!.value.canonical, '{"list":[1,2]}', "array bytes survive prototype replacement too, not only Object.keys");
  });

  test("K11-R5-VAL-03 a prototype observation that swaps the live Object binding cannot pass a foreign prototype as plain", () => {
    // K1.1-correction-03: converted from "K11-R5-VAL-03 a getPrototypeOf trap that swaps the live Object
    // binding cannot pass a foreign prototype as plain" (owner decision-01 item 2). The trap's Proxy is
    // now refused before it runs; a wrapped-child hook makes the Kernel's one prototype observation of a
    // genuine `{a: 1}` do what the trap did: swap the live binding and answer the replacement's prototype.
    const RealObject = Object;
    const realProto = Object.prototype;
    const Fake = function Fake(this: unknown) {};
    const witness = countingProxy({ a: 1 } as Record<string, unknown>, {
      getPrototypeOf() {
        (globalThis as unknown as Record<string, unknown>).Object = Fake;
        return (Fake as unknown as { prototype: object }).prototype;
      },
    });
    let witnessIssues: ReturnType<typeof boundaryValueIssues> = [];
    let objectAfterWitness: unknown;
    try {
      witnessIssues = boundaryValueIssues(witness.proxy);
    } finally {
      objectAfterWitness = (globalThis as unknown as Record<string, unknown>).Object;
      (globalThis as unknown as Record<string, unknown>).Object = RealObject;
    }
    assert.deepEqual(witnessIssues, [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(objectAfterWitness, RealObject, "so the swap never happened");

    const observed = inWrappedChild<{ captured: ChildCapture; swapLive: boolean; secondOk: boolean; swaps: number; restored: boolean }>(`
      ${SUMMARIZE}
      const RealObject = Object;
      // A fresh constructor whose prototype is neither the primordial object prototype nor null.
      const Fake = function Fake() {};
      const value = track({ a: 1 });
      let swaps = 0;
      hooks.prototype = () => {
        // The observation itself replaces the live binding, then answers the replacement's
        // prototype. Against a live Object.prototype read this compares equal and passes as
        // plain; the retained snapshot would then inherit the foreign prototype.
        swaps += 1;
        globalThis.Object = Fake;
        return Fake.prototype;
      };
      let captured;
      let swapLive;
      let secondOk;
      try {
        captured = summarize(values.captureWithWork(value));
        swapLive = globalThis.Object !== RealObject;
        // The hook fires again here and re-installs the swap; the finally below restores it.
        secondOk = values.canonicalize(value).ok;
      } finally {
        globalThis.Object = RealObject;
      }
      emit({ captured, swapLive, secondOk, swaps, restored: Object === RealObject });
    `);
    assert.equal(observed.swaps, 2, "both observations swapped the binding");
    assert.equal(observed.swapLive, true, "the swap was live across the boundary call");
    assert.deepEqual(
      observed.captured.issues,
      [{ path: "", code: "unsupported_form", message: "expected a plain object, received object" }],
      "a foreign prototype is refused, not normalized into a plain snapshot, and the refusal names the non-plain form",
    );
    assert.equal(observed.secondOk, false, "it produces no canonical identity");
    assert.equal(observed.restored, true);
    assert.equal(Object.prototype, realProto, "the live binding is restored for later tests");
  });
});

describe("K11-R6-VAL-04 one observation survives an indexed accessor installed while observing it", () => {
  /**
   * The caller here is entirely coherent, which is the point.
   *
   * Before K1.1-correction-03, `captureArray` observed the prototype first, and that observation was
   * caller code. A genuine array behind a `Proxy` whose `getPrototypeOf` trap installed an inherited
   * accessor at one of its own index names, and then returned the genuine `Array.prototype`, passed the
   * plain-array check legitimately. Its own descriptor and its ordinary read still agreed, so the one
   * observation the pass took was unambiguous.
   *
   * The previous shape then put that observed element into a holey scratch array with an ordinary
   * indexed write and read it back to build the snapshot. Both halves went through the accessor:
   * the write was swallowed, and the read of the still-unowned position answered from the getter.
   * A caller whose value read `"kept"` could therefore be retained and canonicalized as the
   * attacker's substitute — the boundary accepting a value nobody sent. `values.md` allows exactly
   * two answers for a representation like this, and "some third value" is neither of them.
   *
   * K1.1-correction-03: that `Proxy` is now refused before its `getPrototypeOf` trap can run (owner
   * decision-01 item 2), and each case keeps it as a witness that the accessor is never installed. The
   * prototype observation stays the moment of installation: in a wrapped child, a hook on the Kernel's
   * one prototype observation of a genuine array installs the inherited accessor (with `harness.ts`'s
   * `trapInheritedIndices`, which the child shares) and answers the genuine `Array.prototype`.
   */
  const coherentArrayTrapping = (elements: readonly unknown[], indices: readonly string[]): { proxy: unknown[]; calls: () => number; installed: () => number } => {
    let installed = 0;
    const witness = countingProxy(copyForTest(elements), {
      getPrototypeOf(inner): object | null {
        installed += 1;
        trapInheritedIndices(indices).restore();
        return Reflect.getPrototypeOf(inner);
      },
    });
    return { ...witness, installed: () => installed };
  };

  /** What a child reports for one array captured while its prototype observation installs the accessor. */
  type TrapProbe = { captured: ChildCapture; installed: number; swallowed: number; substitute: unknown; again: string | null; liveAfter: boolean };

  /**
   * Child-side text: `trapping(value, indices, wrap?, descriptorHook?)` tracks `value`, captures it (or the
   * root `wrap(value)` builds around it) with a prototype hook that installs the accessor at `indices` the
   * first time the Kernel observes `value`'s prototype, restores the accessor, and reports a `TrapProbe`.
   * Built only inside a test body, so this suite's load-time code references no intrinsic.
   */
  const trappingSource = (): string => `
    ${SUMMARIZE}
    const { trapInheritedIndices } = await import(${JSON.stringify(HARNESS_URL)});
    const trapping = (value, indices, wrap = (inner) => inner, descriptorHook = undefined) => {
      track(value);
      let trap;
      let installed = 0;
      hooks.prototype = (target, real) => {
        if (target === value && trap === undefined) {
          trap = trapInheritedIndices(indices);
          installed += 1;
        }
        return real;
      };
      hooks.descriptor = descriptorHook;
      let captured;
      let liveAfter = false;
      let swallowed = -1;
      try {
        captured = summarize(values.captureWithWork(wrap(value)));
        // Before the liveness probe below, whose own write the live setter swallows.
        swallowed = trap === undefined ? -1 : trap.swallowed.length;
        const probe = [];
        probe[Number(indices[0])] = "control-write";
        liveAfter = trap !== undefined && (probe.length === 0 || !Object.prototype.hasOwnProperty.call(probe, indices[0]));
      } finally {
        trap?.restore();
        hooks.prototype = undefined;
        hooks.descriptor = undefined;
      }
      const again = captured.ok ? values.canonicalize(captured.value) : null;
      return {
        captured,
        installed,
        swallowed,
        substitute: trap === undefined ? null : trap.substitute,
        again: again !== null && again.ok ? again.value.canonical : null,
        liveAfter,
      };
    };
  `;

  test("the retained structure and the canonical bytes are exactly the one value observed", () => {
    // K1.1-correction-03: converted from a getPrototypeOf-trap Proxy that installed the accessor (owner
    // decision-01 item 2); a wrapped-child prototype hook installs it instead.
    const witness = coherentArrayTrapping(["zero", "kept"], ["1"]);
    assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(witness.installed(), 0, "so the accessor was never installed by it");

    const observed = inWrappedChild<TrapProbe>(`
      ${trappingSource()}
      emit(trapping(["zero", "kept"], ["1"]));
    `);
    assert.equal(observed.installed, 1, "the trap was installed by the observation under test");
    assert.equal(observed.liveAfter, true, "and was still live when the boundary call returned");
    assert.equal(observed.captured.ok, true, `expected acceptance, got ${JSON.stringify(observed.captured.issues)}`);
    assert.deepEqual(observed.captured.value, ["zero", "kept"], "the retained snapshot is the observed value");
    assert.equal(observed.captured.canonical, '["zero","kept"]', "and its bytes describe that same structure");
    assert.notDeepEqual(observed.captured.value, ["zero", observed.substitute]);
    assert.equal(observed.swallowed, 0, "no Kernel write reached the inherited setter");
    // Re-canonicalizing what was retained reproduces the bytes that accepted it.
    assert.equal(observed.again, observed.captured.canonical);
  });

  test("the index the accessor picks is not special: position zero and a nested array behave the same", () => {
    // K1.1-correction-03: converted from getPrototypeOf-trap Proxies that installed the accessor (owner
    // decision-01 item 2); a wrapped-child prototype hook installs it instead.
    const first = coherentArrayTrapping(["only"], ["0"]);
    const nestedWitness = coherentArrayTrapping([1, 2, 3], ["0", "1", "2"]);
    assert.deepEqual(boundaryValueIssues(first.proxy), [proxyRefusal("")]);
    assert.deepEqual(boundaryValueIssues({ outer: nestedWitness.proxy }), [proxyRefusal("outer")]);
    assert.equal(first.calls() + nestedWitness.calls(), 0, "refused before any trap ran");
    assert.equal(first.installed() + nestedWitness.installed(), 0);

    const observed = inWrappedChild<{ first: TrapProbe; nested: TrapProbe }>(`
      ${trappingSource()}
      const first = trapping(["only"], ["0"]);
      const nested = trapping([1, 2, 3], ["0", "1", "2"], (inner) => ({ outer: inner }));
      emit({ first, nested });
    `);
    assert.equal(observed.first.installed, 1);
    assert.equal(observed.first.captured.ok, true);
    assert.deepEqual(observed.first.captured.value, ["only"]);
    assert.equal(observed.first.captured.canonical, '["only"]');
    assert.equal(observed.first.swallowed, 0);

    assert.equal(observed.nested.installed, 1);
    assert.equal(observed.nested.captured.ok, true);
    assert.deepEqual(observed.nested.captured.value, { outer: [1, 2, 3] });
    assert.equal(observed.nested.captured.canonical, '{"outer":[1,2,3]}');
    assert.equal(observed.nested.swallowed, 0);
    assert.equal(observed.nested.again, '{"outer":[1,2,3]}');
  });

  test("a value the rules do refuse is still refused with the accessor live, not normalized", () => {
    // Coherence is what made the case above acceptable. Remove it — an own data descriptor and an
    // ordinary read that disagree — and the answer is the refusal `values.md` requires, with the
    // accessor still live and still unable to supply a third reading.
    //
    // K1.1-correction-03: converted from a getPrototypeOf- and get-trap Proxy (owner decision-01 item 2).
    // The prototype hook installs the accessor at "1"; a descriptor hook makes position 1's one own
    // descriptor say 99 while its ordinary read says 0.
    let installed = 0;
    const witness = countingProxy(copyForTest([0, 0]), {
      getPrototypeOf(inner): object | null {
        installed += 1;
        trapInheritedIndices(["1"]).restore();
        return Reflect.getPrototypeOf(inner);
      },
      get(inner, property, receiver): unknown {
        if (property === "1") return 99;
        return Reflect.get(inner, property, receiver) as unknown;
      },
    });
    assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(installed, 0);

    const observed = inWrappedChild<TrapProbe>(`
      ${trappingSource()}
      emit(trapping([0, 0], ["1"], undefined, (target, key, real) =>
        key === "1" ? { value: 99, writable: true, enumerable: true, configurable: true } : real));
    `);
    assert.equal(observed.installed, 1);
    assert.equal(observed.liveAfter, true, "the accessor was live across the call");
    assert.deepEqual(
      observed.captured.issues.map((issue) => `${issue.path} ${issue.code}`),
      ["[1] unstable_representation"],
    );
    assert.deepEqual(observed.captured.issues, [{ path: "[1]", code: "unstable_representation", message: DISAGREEMENT }]);
  });
});

describe("K11-R6-VAL-05 canonical bytes do not depend on what the prototypes carry", () => {
  /**
   * Self-found while reconstructing the path above, and a defect of the same family that no
   * adapter-side change can reach.
   *
   * The approved JCS implementation builds its object branch as `const parts = []` grown with
   * `parts.push(...)` and then read back by `parts.join(',')`. Both are ordinary property
   * operations on a position `parts` does not own yet, so an inherited accessor at
   * `Array.prototype["0"]` receives the push and answers the join — with the primordial `push` and
   * `join` reinstalled, because the defect is in `[[Set]]`/`[[Get]]` rather than in which function
   * performs them. Measured against the unmodified dependency, `canonicalize({a: 1})` returns
   * whatever the getter says. Canonical bytes are the identity this Kernel binds, so that is a
   * caller choosing another request's identity.
   *
   * The dependency is used exactly as published and is not patched. What the Kernel controls is the
   * environment it calls into, so the serializer window removes every own index-named property from
   * `Array.prototype` and `Object.prototype` for the exact call and puts them back afterwards.
   */
  const CASES: readonly [string, unknown, string][] = [
    ["an object member", { a: 1 }, '{"a":1}'],
    ["several object members in canonical order", { b: 2, a: 1 }, '{"a":1,"b":2}'],
    ["an array root", [7, 8], "[7,8]"],
    ["a nested mixture", { outer: { inner: [1, { z: null }] } }, '{"outer":{"inner":[1,{"z":null}]}}'],
  ];

  test("an inherited accessor at the indices the serializer writes cannot choose the bytes", () => {
    const trap = trapInheritedIndices(["0", "1", "2"], '"HIJACKED":"YES"');
    try {
      assert.equal(inheritedIndexIsLive(0), true, "the accessor is live for these calls");
      for (let index = 0; index < CASES.length; index += 1) {
        const [label, value, expected] = CASES[index] as [string, unknown, string];
        const result = canonicalize(value);
        assert.ok(result.ok, `${label} was refused`);
        assert.equal(result.value.canonical, expected, label);
      }
      assert.equal(inheritedIndexIsLive(0), true, "the window restored the accessor it borrowed");
    } finally {
      trap.restore();
    }
  });

  test("an inherited data property at those indices cannot either, and equality still follows the bytes", () => {
    const saved = Object.getOwnPropertyDescriptor(Array.prototype, "0");
    Object.defineProperty(Array.prototype, "0", { value: '"NO":"NO"', writable: true, enumerable: false, configurable: true });
    let left: ReturnType<typeof canonicalize>;
    let right: ReturnType<typeof canonicalize>;
    try {
      left = canonicalize({ a: 1, b: [2] });
      right = canonicalize({ b: [2], a: 1 });
      assert.equal((Array.prototype as unknown as Record<string, unknown>)["0"], '"NO":"NO"', "still installed after the call");
    } finally {
      if (saved === undefined) delete (Array.prototype as unknown as Record<string, unknown>)["0"];
      else Object.defineProperty(Array.prototype, "0", saved);
    }
    assert.ok(left!.ok);
    assert.ok(right!.ok);
    assert.equal(left!.value.canonical, '{"a":1,"b":[2]}');
    assert.equal(sameLogicalValue(left!.value, right!.value), true, "key order is still not semantic");
  });

  test("the prototypes are left exactly as found, including properties the Kernel never installed", () => {
    const marker = { note: "host state outside the index names" };
    Object.defineProperty(Array.prototype, "hostMarker", { value: marker, writable: false, enumerable: false, configurable: true });
    const trap = trapInheritedIndices(["0"]);
    try {
      assert.ok(canonicalize({ a: [1, 2] }).ok);
      const restored = Object.getOwnPropertyDescriptor(Array.prototype, "hostMarker");
      assert.equal(restored?.value, marker, "untouched host state is untouched");
      assert.equal(restored?.writable, false);
      assert.equal(restored?.enumerable, false);
    } finally {
      trap.restore();
      delete (Array.prototype as unknown as Record<string, unknown>).hostMarker;
    }
  });
});

describe("K11-R16-VAL-01 canonical bytes do not depend on the iterator protocol the caller can reach", () => {
  /**
   * Restoring `Array.prototype[Symbol.iterator]` is not the whole iterator protocol.
   *
   * The approved JCS implementation iterates `Object.keys(object).sort()` with `for...of`: every
   * step reads `next` from the Array iterator prototype, and every result reads `done`/`value`
   * through `Object.prototype`. A caller-observation side effect can mutate that `next` between
   * the allowed observation and canonicalization, so the serializer window restores the primordial
   * `next` and borrows the prototype shadows above and beside it. The dependency is used exactly
   * as published and is not patched.
   *
   * Self-found while writing these cases, and load-bearing for every oracle below: while a hostile
   * `next` is installed, no test code may use `assert.ok` (or destructuring, `for...of`, or
   * spread). Node's `assert.ok` delegates through a rest-args spread, so under an omit-all `next`
   * it receives zero arguments and fails even for `assert.ok(true)` — and symmetrically, a
   * substitute-all `next` could make it pass vacuously. `assert.equal` takes fixed parameters and
   * stays genuine, so every oracle here is `assert.equal(actual, expected)`, and every list read is
   * indexed. A green result that depended on `assert.ok` under this pollution would prove nothing.
   */
  const CASES: readonly [string, unknown, string][] = [
    ["one member", { a: 1 }, '{"a":1}'],
    ["several members in canonical order", { b: 1, a: 2 }, '{"a":2,"b":1}'],
    ["an array root", [7, 8], "[7,8]"],
    ["a nested mixture", { outer: { inner: [1, { z: null }] } }, '{"outer":{"inner":[1,{"z":null}]}}'],
  ];

  /** A hostile `next` that ends iteration immediately, omitting every key. */
  const omitNext = (): unknown => ({ done: true });
  /** A hostile `next` that substitutes a key the object does not own. */
  const substituteNext = (): (() => unknown) => {
    let calls = 0;
    return (): unknown => {
      calls += 1;
      return calls === 1 ? { value: "zzz", done: false } : { value: undefined, done: true };
    };
  };
  /** A hostile `next` that yields the first key twice, duplicating it. */
  const duplicateNext = (): (() => unknown) => {
    let calls = 0;
    return (): unknown => {
      calls += 1;
      return calls <= 2 ? { value: "a", done: false } : { value: undefined, done: true };
    };
  };
  /** A hostile `next` that yields sorted keys back to front, reordering them. */
  const reverseNext = (keys: readonly string[]): (() => unknown) => {
    let position = keys.length - 1;
    return (): unknown => {
      if (position < 0) return { value: undefined, done: true };
      const value = keys[position] as string;
      position -= 1;
      return { value, done: false };
    };
  };

  test("a caller-mutated iterator next cannot omit, substitute, duplicate or reorder the keys", () => {
    const attacks: readonly [string, () => unknown][] = [
      ["omit", omitNext],
      ["substitute", substituteNext()],
      ["duplicate", duplicateNext()],
      ["reorder", reverseNext(["a", "b"])],
    ];
    for (let attackIndex = 0; attackIndex < attacks.length; attackIndex += 1) {
      // Indexed reads only: destructuring or `for...of` here would itself iterate through the
      // hostile `next` installed below and observe nothing.
      const row = attacks[attackIndex] as [string, () => unknown];
      const attack = row[0] as string;
      const next = row[1] as () => unknown;
      const pollution = polluteIteratorNext(next);
      try {
        assert.equal(
          Object.getOwnPropertyDescriptor(arrayIteratorPrototype(), "next")?.value,
          next,
          `${attack}: hostile next installed, so a green result cannot come from missing pollution`,
        );
        for (let caseIndex = 0; caseIndex < CASES.length; caseIndex += 1) {
          const crow = CASES[caseIndex] as [string, unknown, string];
          const label = crow[0] as string;
          const value = crow[1] as unknown;
          const expected = crow[2] as string;
          const result = canonicalize(value);
          assert.equal(result.ok, true, `${attack}: ${label} was refused`);
          assert.equal(result.ok === true ? result.value.canonical : null, expected, `${attack}: ${label}`);
        }
        assert.equal(
          Object.getOwnPropertyDescriptor(arrayIteratorPrototype(), "next")?.value,
          next,
          `${attack}: the window handed the hostile method back`,
        );
      } finally {
        pollution.restore();
      }
    }
  });

  test("an iterator result without its own done cannot be ended early through Object.prototype", () => {
    // The primordial `next` always answers results with own `done`, so this combines two hostile
    // halves: a `next` returning bare results plus an Object.prototype `done` shadow answering
    // them. Either half alone is contained by the restored holder slot; the window must close both.
    let calls = 0;
    const bareNext = (): unknown => {
      calls += 1;
      return calls <= 2 ? { value: calls === 1 ? "a" : "b" } : { value: undefined, done: true };
    };
    const nextPollution = polluteIteratorNext(bareNext);
    const doneShadow = polluteObjectField("done", true);
    try {
      const result = canonicalize({ a: 1, b: 2 });
      assert.equal(result.ok, true, "refused under combined pollution");
      assert.equal(result.ok === true ? result.value.canonical : null, '{"a":1,"b":2}');
      assert.equal(
        Object.getOwnPropertyDescriptor(Object.prototype, "done")?.value,
        true,
        "the shadow was handed back",
      );
    } finally {
      doneShadow.restore();
      nextPollution.restore();
    }
  });

  test("a deleted holder next plus an Object.prototype next shadow still binds the snapshot", () => {
    const holder = arrayIteratorPrototype();
    const savedNext = Object.getOwnPropertyDescriptor(holder, "next");
    assert.ok(savedNext, "the holder owns next before this case");
    delete (holder as Record<string, unknown>).next;
    const shadow = polluteObjectField("next", omitNext);
    try {
      const result = canonicalize({ a: 1 });
      assert.equal(result.ok, true, "refused under deleted-holder pollution");
      assert.equal(result.ok === true ? result.value.canonical : null, '{"a":1}');
    } finally {
      shadow.restore();
      if (savedNext === undefined) delete (holder as Record<string, unknown>)["next"];
      else Object.defineProperty(holder, "next", savedNext);
    }
    assert.equal(typeof (Object.getOwnPropertyDescriptor(holder, "next")?.value ?? Object.getOwnPropertyDescriptor(holder, "next")?.get), "function", "holder next restored");
  });

  test("the byte limit is enforced on the snapshot bytes, not on bytes the pollution chose", () => {
    // 1000 members of 2000 chars each: ~2 MiB canonical, within every other limit. Under an
    // omit-all `next` the uncontained serializer would bind `{}` and wrongly accept.
    const big: Record<string, string> = {};
    for (let index = 0; index < 1000; index += 1) big[`member-${index}`] = "x".repeat(2000);
    const clean = boundaryValueIssues(big).map((issue) => issue.code);
    assert.deepEqual(clean, ["too_many_bytes"], "the control refuses without pollution");
    const pollution = polluteIteratorNext(omitNext);
    // Indexed reads: nothing here may iterate while the hostile `next` is installed.
    let codes: string[] = [];
    try {
      const issues = boundaryValueIssues(big);
      for (let index = 0; index < issues.length; index += 1) codes[codes.length] = (issues[index] as { code: string }).code;
    } finally {
      pollution.restore();
    }
    assert.equal(codes.length, 1, "exactly one reason");
    assert.equal(codes[0], "too_many_bytes", "omitting the keys cannot shrink the measured bytes");
  });

  test("retained content accepted under pollution re-canonicalizes to the accepting bytes", () => {
    const pollution = polluteIteratorNext(omitNext);
    let retained: unknown;
    let accepting: string | null = null;
    try {
      const result = canonicalize({ a: 1, b: [2] });
      assert.equal(result.ok, true, "refused under pollution");
      accepting = result.ok === true ? result.value.canonical : null;
      retained = result.ok === true ? result.value.value : null;
    } finally {
      pollution.restore();
    }
    assert.equal(accepting, '{"a":1,"b":[2]}');
    assert.equal(canonicalOf(retained), '{"a":1,"b":[2]}', "clean re-canonicalization reproduces the accepting bytes");
  });
});

describe("K11-R16-VAL-01 (R2) canonical bytes do not depend on prototype-chain shape", () => {
  /**
   * Found by the fresh adversarial review wave (Reviewer 2), not by the implementation pass.
   *
   * Removing own index-named properties from `Array.prototype`/`Object.prototype` is not the whole
   * index-shadow family: `Object.setPrototypeOf(Array.prototype, hostile)` inserts a hostile object
   * *between* the two holders, and the unmodified dependency's `parts.push(...)` — `[[Set]]` on a
   * position the fresh array does not own — walks the whole chain past the cleaned holders into the
   * inserted object. `canonicalize({b:2,a:1})` then bound `{"pwned":9,"pwned":9}` for a retained
   * snapshot of `{a:1,b:2}`. The window therefore resets every prototype link on the dependency's
   * paths to its load-time shape for the exact call and hands the observed shape back afterwards.
   * The dependency is used exactly as published and is not patched.
   *
   * Oracle discipline as in the iterator-`next` cases above: `assert.equal` with indexed reads only
   * while pollution is installed.
   */
  const arrayProto = (): object => Array.prototype as object;

  test("an object inserted between Array.prototype and Object.prototype cannot choose the bytes", () => {
    const hostile = {};
    Object.defineProperty(hostile, "0", { get: () => '"pwned":9', set(_v: unknown) {}, configurable: true });
    Object.defineProperty(hostile, "1", { get: () => '"pwned":9', set(_v: unknown) {}, configurable: true });
    const original = Object.getPrototypeOf(arrayProto());
    Object.setPrototypeOf(arrayProto(), hostile);
    Object.setPrototypeOf(hostile, original);
    try {
      assert.equal(Object.getPrototypeOf(arrayProto()), hostile, "insertion live across these calls");
      const cases: Array<[unknown, string]> = [
        [{ b: 2, a: 1 }, '{"a":1,"b":2}'],
        [{ a: 1 }, '{"a":1}'],
        [[7, 8], "[7,8]"],
      ];
      for (let index = 0; index < cases.length; index += 1) {
        const row = cases[index] as [unknown, string];
        const result = canonicalize(row[0] as unknown);
        assert.equal(result.ok, true, "refused under chain insertion");
        assert.equal(result.ok === true ? result.value.canonical : null, row[1] as string);
      }
    } finally {
      Object.setPrototypeOf(arrayProto(), original);
    }
    assert.equal(Object.getPrototypeOf(arrayProto()), original, "chain handed back exactly");
  });

  test("the top of the chain is engine-pinned, so bare results have nowhere hostile to resolve", () => {
    // `Object.prototype` is an immutable-prototype exotic object: `setPrototypeOf` on it always
    // throws, so unlike `Array.prototype` nothing can ever be inserted above it. The per-result
    // `done`/`value` reads therefore fall through to `null` once the window removes an own
    // shadow — established here rather than assumed, since the whole family is about not
    // assuming what the chain looks like.
    assert.equal(Object.getPrototypeOf(Object.prototype), null);
    let threw = false;
    try {
      Object.setPrototypeOf(Object.prototype, { done: true });
    } catch {
      threw = true;
    }
    assert.equal(threw, true, "nothing can be inserted above Object.prototype");
    assert.equal(Object.getPrototypeOf(Object.prototype), null, "the attempt changed nothing");

    // Bare results (no own `done`) from a hostile `next` then resolve `done` to `undefined`
    // through the pinned top — deterministic, and identical to the clean run.
    let calls = 0;
    const bareNext = (): unknown => {
      calls += 1;
      return calls <= 2 ? { value: calls === 1 ? "a" : "b" } : { value: undefined, done: true };
    };
    const holder = arrayIteratorPrototype();
    const savedNext = Object.getOwnPropertyDescriptor(holder, "next");
    Object.defineProperty(holder, "next", { value: bareNext, writable: true, enumerable: false, configurable: true });
    try {
      const result = canonicalize({ a: 1, b: 2 });
      assert.equal(result.ok, true, "refused under bare-result pollution");
      assert.equal(result.ok === true ? result.value.canonical : null, '{"a":1,"b":2}');
    } finally {
      if (savedNext === undefined) delete (holder as Record<string, unknown>)["next"];
      else Object.defineProperty(holder, "next", savedNext);
    }
  });

  test("an object inserted on the iterator chain cannot supply next", () => {
    const between = { next: (): unknown => ({ done: true }) };
    const holder = arrayIteratorPrototype();
    const original = Object.getPrototypeOf(holder);
    Object.setPrototypeOf(holder, between);
    Object.setPrototypeOf(between, original);
    try {
      const result = canonicalize({ a: 1 });
      assert.equal(result.ok, true, "refused under iterator-chain insertion");
      assert.equal(result.ok === true ? result.value.canonical : null, '{"a":1}');
    } finally {
      Object.setPrototypeOf(holder, original);
    }
    assert.equal(Object.getPrototypeOf(holder), original, "iterator chain handed back exactly");
  });

  test("a capture-time observation that inserts the chain still binds the observed structure", () => {
    // K1.1-correction-03: converted from "a capture-time trap that inserts the chain still binds the
    // observed structure" (owner decision-01 item 2). Its getPrototypeOf-trap Proxy is now refused before
    // the trap runs; a wrapped-child hook on the Kernel's one prototype observation of a genuine
    // `{a: 1, b: 2}` inserts the chain instead, during capture. (The first case of this group, "an object
    // inserted between Array.prototype and Object.prototype cannot choose the bytes", inserts it before
    // the call.)
    let witnessInstalled = false;
    const witness = countingProxy({ a: 1, b: 2 }, {
      getPrototypeOf(t) {
        witnessInstalled = true;
        return Reflect.getPrototypeOf(t);
      },
    });
    assert.deepEqual(boundaryValueIssues(witness.proxy), [proxyRefusal("")]);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
    assert.equal(witnessInstalled, false, "so it inserted nothing");
    assert.equal(Object.getPrototypeOf(arrayProto()), Object.prototype);

    const observed = inWrappedChild<{
      captured: ChildCapture;
      installed: boolean;
      liveAcross: boolean;
      again: string | null;
      handedBack: boolean;
    }>(`
      ${SUMMARIZE}
      const target = track({ a: 1, b: 2 });
      let hostile = null;
      let installed = false;
      hooks.prototype = (t, real) => {
        if (t === target && !installed) {
          installed = true;
          hostile = {};
          Object.defineProperty(hostile, "0", { get: () => '"pwned":9', set(_v) {}, configurable: true });
          const original = Object.getPrototypeOf(Array.prototype);
          Object.setPrototypeOf(Array.prototype, hostile);
          Object.setPrototypeOf(hostile, original);
        }
        return real;
      };
      let captured;
      let liveAcross = false;
      try {
        captured = summarize(values.captureWithWork(target));
        liveAcross = hostile !== null && Object.getPrototypeOf(Array.prototype) === hostile;
      } finally {
        if (hostile !== null) Object.setPrototypeOf(Array.prototype, Object.getPrototypeOf(hostile));
      }
      const again = captured.ok ? values.canonicalize(captured.value) : null;
      emit({
        captured,
        installed,
        liveAcross,
        again: again !== null && again.ok ? again.value.canonical : null,
        handedBack: Object.getPrototypeOf(Array.prototype) === Object.prototype,
      });
    `);
    assert.equal(observed.installed, true, "the observation ran, so this is not a vacuous pass");
    assert.equal(observed.liveAcross, true, "the insertion was live across the boundary call");
    assert.equal(observed.captured.ok, true, "refused under observation-installed chain");
    assert.equal(observed.captured.canonical, '{"a":1,"b":2}');
    assert.equal(observed.again, '{"a":1,"b":2}', "retained content re-canonicalizes to the accepting bytes");
    assert.equal(observed.handedBack, true, "chain handed back exactly");
  });

  test("an unresettable chain degrades to a refusal, never to wrong bytes", () => {
    // The disturbed host is permanent by definition (non-extensible holder with a wrong link),
    // so this runs in a child process rather than poisoning the suite.
    const probe = `
      const { canonicalize } = await import("./packages/kernel/src/index.ts");
      const clean = canonicalize({ a: 1 });
      const hostile = {};
      Object.defineProperty(hostile, "0", {
        configurable: true,
        get() { return String.fromCharCode(34) + "pwned" + String.fromCharCode(34) + ":9"; },
        set(_v) {},
      });
      Object.setPrototypeOf(Array.prototype, hostile);
      Object.setPrototypeOf(hostile, Object.prototype);
      Object.preventExtensions(Array.prototype);
      let polluted;
      try { polluted = canonicalize({ a: 1 }); } catch (error) { polluted = { escaped: String(error && error.name) }; }
      console.log(JSON.stringify({
        cleanCanonical: clean.ok ? clean.value.canonical : null,
        ok: polluted.ok,
        escaped: polluted.escaped ?? null,
        code: polluted.ok === false ? polluted.issues[0].code : null,
        canonical: polluted.ok === true ? polluted.value.canonical : null,
        slotsRestored: typeof JSON.stringify === "function" && typeof Object.keys === "function",
      }));
    `;
    const output = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", probe],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const observed = JSON.parse(output.trim().split("\n").pop() as string) as {
      cleanCanonical: string | null;
      ok: boolean | undefined;
      escaped: string | null;
      code: string | null;
      canonical: string | null;
      slotsRestored: boolean;
    };
    assert.equal(observed.cleanCanonical, '{"a":1}');
    assert.equal(observed.escaped, null, "no ambient exception escaped the Kernel boundary");
    assert.equal(observed.ok, false, "an environment the window cannot control is refused");
    assert.equal(observed.code, "unstable_representation");
    assert.equal(observed.canonical, null, "and no canonical bytes were produced at all");
    assert.equal(observed.slotsRestored, true);
  });
});

describe("K11-R6-VAL-05 an unremovable index shadow degrades to a refusal, never to wrong bytes", () => {
  /**
   * The one claim in the serializer window that cannot be made in this process.
   *
   * `inheritedIndexShadows` borrows both prototypes for the exact JCS call and hands them back. If a
   * caller has made one of those positions non-configurable, the window cannot remove it, and the
   * rule `values.md` implies is that the boundary refuses rather than serializing into an
   * environment it does not control. Installing a non-configurable accessor on `Array.prototype` is
   * permanent by definition, so this runs in a child process rather than poisoning the suite.
   *
   * The also-non-writable *data* variant is deliberately not asserted: Node's own internals assign to
   * index positions of ordinary arrays, so that host dies inside the runtime before any Kernel
   * boundary is reached. It is not a behaviour this Kernel can answer for, and claiming otherwise
   * would be the kind of unbacked claim these rounds keep finding.
   */
  test("the refusal is located, the bytes are never wrong, and the borrowed slots are handed back", () => {
    const probe = `
      const { canonicalize } = await import("./packages/kernel/src/index.ts");
      const clean = canonicalize({ a: 1 });
      Object.defineProperty(Array.prototype, "0", {
        configurable: false,
        get() { return String.fromCharCode(34) + "HIJACKED" + String.fromCharCode(34); },
        set(_value) {},
      });
      let polluted;
      try { polluted = canonicalize({ a: 1 }); } catch (error) { polluted = { escaped: String(error && error.name) }; }
      console.log(JSON.stringify({
        cleanCanonical: clean.ok ? clean.value.canonical : null,
        ok: polluted.ok,
        escaped: polluted.escaped ?? null,
        code: polluted.ok === false ? polluted.issues[0].code : null,
        canonical: polluted.ok === true ? polluted.value.canonical : null,
        slotsRestored: typeof JSON.stringify === "function" && typeof Object.keys === "function" && typeof Object.getOwnPropertyDescriptor(Object, "keys").value === "function",
      }));
    `;
    const result = execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", probe],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const observed = JSON.parse(result.trim().split("\n").pop() as string) as {
      cleanCanonical: string | null;
      ok: boolean | undefined;
      escaped: string | null;
      code: string | null;
      canonical: string | null;
      slotsRestored: boolean;
    };

    // Not vacuous: the same call answers correctly in the same process before the shadow is pinned.
    assert.equal(observed.cleanCanonical, '{"a":1}');
    assert.equal(observed.escaped, null, "no ambient exception escaped the Kernel boundary");
    assert.equal(observed.ok, false, "an environment the window cannot control is refused");
    assert.equal(observed.code, "unstable_representation");
    assert.equal(observed.canonical, null, "and no canonical bytes were produced at all");
    assert.equal(observed.slotsRestored, true, "the named slots the window did install were handed back");
  });
});

describe("K11-R7-STATE-03 canonical bytes under inherited descriptor-field pollution", () => {
  /**
   * H9 moved list growth to the captured `Object.defineProperty` but kept ordinary descriptor
   * literals, so `ToPropertyDescriptor` still consults `Object.prototype` before the target's
   * `[[DefineOwnProperty]]` runs. These cases pollute each descriptor-field combination directly —
   * persistent ambient state, no caller observation needed — and require the exact clean bytes on
   * every root shape the packet accepts, plus exact host restoration.
   */
  const ROOTS: [string, unknown][] = [
    ["object", { a: 1 }],
    ["array", [1, 2]],
    ["nested", { a: [{ b: "x" }] }],
  ];

  test("every hostile data-field combination still yields the exact clean bytes", () => {
    const clean = new Map<string, string>();
    for (const [label, value] of ROOTS) clean.set(label, canonicalOf(value));
    const pollutions: [string, Record<string, unknown>][] = [
      ["get", { get: 1 }],
      ["set", { set: () => {} }],
      ["get+set", { get: 1, set: () => {} }],
    ];
    for (const [plabel, fields] of pollutions) {
      const pollution = polluteDescriptorFields(fields);
      try {
        assert.equal(descriptorConversionIsHostile(), true, `${plabel}: the probe really throws while live`);
        for (const [label, value] of ROOTS) {
          const result = canonicalize(value);
          assert.ok(result.ok, `${plabel}/${label} was refused instead of accepted`);
          assert.equal(result.value.canonical, clean.get(label), `${plabel}/${label} bytes`);
        }
      } finally {
        pollution.restore();
      }
      for (const key of Object.keys(fields)) {
        assert.equal(
          Object.prototype.hasOwnProperty.call(Object.prototype, key),
          false,
          `${plabel}: no ${key} pollution left behind`,
        );
      }
    }
  });

  test("an inherited descriptor getter never runs inside capture, cloning or the serializer window", () => {
    const clean = canonicalOf({ a: [1, { b: "x" }] });
    assert.equal(clean, '{"a":[1,{"b":"x"}]}');
    const observed = { count: 0 };
    const pollution = polluteDescriptorGetter("get", observed);
    try {
      assert.equal(observed.count, 0, "the installation itself consulted no prototype");
      const result = canonicalize({ a: [1, { b: "x" }] });
      assert.ok(result.ok, "a valid value is accepted, not refused");
      assert.equal(result.value.canonical, clean);
      assert.equal(observed.count, 0, "no Kernel definition executed caller behavior");
      assert.equal(descriptorConversionIsHostile(), true, "the getter field was hostile throughout");
    } finally {
      pollution.restore();
    }
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "get"), false);
  });

  test("an own __proto__ member still installs while conversion is hostile", () => {
    const input = JSON.parse('{"__proto__":{"x":1},"safe":2}');
    const pollution = polluteDescriptorFields({ get: 1, set: () => {} });
    try {
      assert.equal(descriptorConversionIsHostile(), true);
      const result = canonicalize(input);
      assert.ok(result.ok, "a valid member is retained, not refused");
      assert.equal(result.value.canonical, '{"__proto__":{"x":1},"safe":2}');
    } finally {
      pollution.restore();
    }
  });

  test("restoring a borrowed accessor shadow under inherited value pollution keeps the bytes and the host", () => {
    // The serializer window borrows every own index-named property of both prototypes for the exact
    // JCS call and hands each one back afterwards. An accessor shadow makes the saved descriptor an
    // accessor one, so reinstalling it while `Object.prototype` carries an inherited `value` field
    // throws out of an ordinary literal — the symmetric half of the install direction. The data
    // installs themselves are unaffected by `value` pollution (the own field shadows it), so this
    // case isolates the restoration: it passes with only the install direction ablated and fails
    // with only the restore direction ablated.
    const trap = trapInheritedIndices(["7"], "shadow-substitute");
    const pollution = polluteDescriptorFields({ value: "polluted", writable: false });
    try {
      assert.equal(inheritedIndexIsLive(7), true, "the accessor shadow is live for this call");
      const result = canonicalize({ a: 1 });
      assert.ok(result.ok, "a valid value is accepted, not refused for a restorable environment");
      assert.equal(result.value.canonical, '{"a":1}');
      const during = Object.getOwnPropertyDescriptor(Array.prototype, "7");
      assert.equal(typeof during?.get, "function", "the borrowed accessor shadow is handed back, not kept");
      assert.equal(during?.get?.(), "shadow-substitute", "it is the same getter");
    } finally {
      // Pollution first: a weakened restore reads the saved descriptor through live ambient state.
      pollution.restore();
      trap.restore();
    }
    assert.equal(Object.getOwnPropertyDescriptor(Array.prototype, "7"), undefined, "the trap itself is gone");
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "value"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "writable"), false);
  });
});
