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

import { BOUNDARY_LIMITS, boundaryValueIssues, canonicalize, isBoundaryValue, sameLogicalValue, type BoundaryValue } from "../src/index.ts";
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
  type InheritedIndexTrap,
} from "./harness.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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
    assert.match(boundaryValueIssues({ h: new Holder() })[0]?.message ?? "", /Holder instance/);
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
   * rule under test is stated the same way, so nothing here or in `values.ts` tests for `Proxy`.
   */
  describe("K11-R2-VAL-02 identity and retained content come from one observation", () => {
    /** A container whose own data descriptors and ordinary property reads deliberately disagree. */
    const disagreeing = <T extends object>(target: T, key: string, read: unknown): T =>
      new Proxy(target, {
        get(inner, property, receiver): unknown {
          if (property === key) return read;
          return Reflect.get(inner, property, receiver);
        },
      });

    test("an array position read differently than it is owned is refused, not silently picked", () => {
      const value = disagreeing([1], "0", 2);
      // The fixture really is the ambiguity the finding names, not a broken test double.
      assert.equal(Array.isArray(value), true);
      assert.equal(Object.getPrototypeOf(value), Array.prototype);
      assert.equal(Object.getOwnPropertyDescriptor(value, "0")?.value, 1, "owns 1");
      assert.equal((value as unknown as number[])[0], 2, "reads 2");

      assert.deepEqual(issueCodes(value), ["unstable_representation"]);
      assert.equal(canonicalize(value).ok, false, "and it produces no identity at all");
    });

    test("an object member read differently than it is owned is refused the same way", () => {
      const value = disagreeing({ a: 1 }, "a", 2);
      assert.equal(Object.getOwnPropertyDescriptor(value, "a")?.value, 1);
      assert.equal((value as { a: number }).a, 2);
      assert.deepEqual(issueCodes(value), ["unstable_representation"]);
      assert.equal(boundaryValueIssues(value)[0]?.path, "a", "and the refusal locates the member");
    });

    test("the disagreement is refused at depth and under a valid root", () => {
      const nestedDisagreement = { outer: [{ inner: disagreeing({ a: 1 }, "a", 2) }] };
      assert.deepEqual(issueCodes(nestedDisagreement), ["unstable_representation"]);
      assert.equal(boundaryValueIssues(nestedDisagreement)[0]?.path, "outer[0].inner.a");
    });

    test("an array position supplied only by a dynamic read, owning nothing, is refused", () => {
      // `length` says the position exists; the object owns nothing there. The round-3 code read the
      // supplied 7 as the element, while the JCS implementation skipped the absent position: the
      // pair canonicalized to `[]` and retained `[7]`.
      const hollow: unknown[] = [];
      hollow.length = 1;
      const value = disagreeing(hollow, "0", 7);
      assert.equal(Object.getOwnPropertyDescriptor(value, "0"), undefined, "owns nothing at 0");
      assert.equal((value as unknown[])[0], 7, "but reads 7");
      assert.deepEqual(issueCodes(value), ["undefined_member"]);
      assert.equal(boundaryValueIssues(value)[0]?.path, "[0]");
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
      const value = disagreeing([1, 2], "length", 5);
      assert.deepEqual(issueCodes(value), ["unstable_representation"]);
      assert.equal(boundaryValueIssues(value)[0]?.path, "", "the root array is what has no stable shape");
    });

    test("a structure that cannot be observed is refused rather than thrown out of the boundary", () => {
      const hostile = new Proxy({ a: 1 }, {
        getOwnPropertyDescriptor(): PropertyDescriptor {
          throw new Error("no descriptors for you");
        },
      });
      let issues: ReturnType<typeof boundaryValueIssues> = [];
      assert.doesNotThrow(() => {
        issues = boundaryValueIssues(hostile);
      }, "a Kernel boundary refuses; it does not propagate a caller's exception");
      assert.deepEqual(issues.map((issue) => issue.code), ["unstable_representation"]);
    });

    test("an object listing an own member it does not own is refused", () => {
      const lying = new Proxy({} as Record<string, unknown>, {
        ownKeys(): string[] {
          return ["ghost"];
        },
        getOwnPropertyDescriptor(): PropertyDescriptor | undefined {
          return undefined;
        },
      });
      assert.deepEqual(issueCodes(lying), ["unstable_representation"]);
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
      let reads = 0;
      const shifting = new Proxy({ a: 1 } as Record<string, unknown>, {
        get(inner, property, receiver): unknown {
          if (property === "a") {
            reads += 1;
            return reads;
          }
          return Reflect.get(inner, property, receiver);
        },
      });

      const result = canonicalize(shifting);
      assert.ok(result.ok, "the first reading agreed with the own descriptor, so it is acceptable");
      assert.equal(reads, 1, "the caller's object was read exactly once");
      assert.equal(result.value.canonical, '{"a":1}');
      assert.deepEqual(result.value.value, { a: 1 });

      // Reading the caller's object again now returns something else entirely. The accepted value is
      // unaffected, and re-canonicalizing what was retained still yields the bytes that bound it.
      assert.equal(shifting["a"], 2, "the source has moved on");
      const again = canonicalize(result.value.value);
      assert.ok(again.ok);
      assert.equal(again.value.canonical, result.value.canonical);
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
    // values.md: two sibling roots of 700 KiB each are not rejected solely because their envelope
    // exceeds 1 MiB. Each is measured on its own, which is what these two separate calls are.
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
    const previous = (Object.prototype as Record<string, unknown>).toJSON;
    if (previous !== undefined) delete (Object.prototype as Record<string, unknown>).toJSON;
    // Owns 1 and reads 1, so capture accepts — but the ordinary read installs the hook as a side
    // effect before the serializer runs. Review-03's witness produced canonical `42` here.
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Object.prototype as Record<string, unknown>).toJSON = () => 42;
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    assert.equal(Object.getOwnPropertyDescriptor(sneaky, "a")?.value, 1, "owns 1");
    let result: ReturnType<typeof canonicalize>;
    try {
      result = canonicalize(sneaky);
    } finally {
      const installed = (Object.prototype as Record<string, unknown>).toJSON;
      assert.equal(typeof installed, "function", "the side effect really installed the hook");
      if (previous === undefined) delete (Object.prototype as Record<string, unknown>).toJSON;
      else (Object.prototype as Record<string, unknown>).toJSON = previous;
    }
    assert.ok(result!.ok, "the coherent reading is still acceptable");
    assert.equal(result!.ok && result!.value.canonical, '{"a":1}');
    assert.deepEqual(result!.ok && result!.value.value, { a: 1 });
  });

  test("a legitimate own toJSON data member is still content, not a hook", () => {
    const result = canonicalize({ toJSON: 1, a: 2 });
    assert.ok(result.ok);
    assert.equal(result.value.canonical, '{"a":2,"toJSON":1}');
  });

  test("an own-name listing reporting a canonical index outside length with no backing property is refused", () => {
    // Supplement witness: extensible empty-array target, length 0, ownKeys reports '10', no
    // descriptor behind it. The old partition dropped it into an accepted [].
    const proxy = new Proxy([] as unknown[], {
      ownKeys(): string[] {
        return ["length", "10"];
      },
      getOwnPropertyDescriptor(target, property): PropertyDescriptor | undefined {
        if (property === "length") return { value: 0, writable: true, enumerable: false, configurable: false };
        if (property === "10") return undefined;
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      get(target, property, receiver): unknown {
        if (property === "length") return 0;
        return Reflect.get(target, property, receiver);
      },
    });
    assert.equal(Array.isArray(proxy), true);
    assert.equal(Object.getPrototypeOf(proxy), Array.prototype);
    assert.deepEqual(Object.getOwnPropertyNames(proxy), ["length", "10"]);
    assert.equal(Object.getOwnPropertyDescriptor(proxy, "10"), undefined);
    const issues = boundaryValueIssues(proxy);
    assert.ok(issues.length > 0, "refused, not accepted as []");
    assert.ok(
      issues.some((issue) => issue.path === "[10]" && issue.code === "unstable_representation"),
      `located unstable listing, got ${JSON.stringify(issues)}`,
    );
    assert.equal(canonicalize(proxy).ok, false);
  });

  test("a backed canonical index outside length is also refused rather than silently dropped", () => {
    const proxy = new Proxy([] as unknown[], {
      ownKeys(): string[] {
        return ["length", "5"];
      },
      getOwnPropertyDescriptor(target, property): PropertyDescriptor | undefined {
        if (property === "length") return { value: 0, writable: true, enumerable: false, configurable: false };
        if (property === "5") return { value: 7, writable: true, enumerable: true, configurable: true };
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
      get(target, property, receiver): unknown {
        if (property === "length") return 0;
        return Reflect.get(target, property, receiver);
      },
    });
    const issues = boundaryValueIssues(proxy);
    assert.ok(issues.length > 0);
    assert.ok(
      issues.some((issue) => issue.path === "[5]"),
      `the outside index is located, got ${JSON.stringify(issues)}`,
    );
    assert.equal(canonicalize(proxy).ok, false);
  });

  test("a throwing observation whose thrown value is itself hostile to inspection still becomes a refusal", () => {
    const hostileError = new Proxy(
      {},
      {
        get(_target, property): unknown {
          if (property === "constructor") throw new Error("constructor boom");
          return undefined;
        },
      },
    );
    const hostile = new Proxy({ a: 1 }, {
      getOwnPropertyDescriptor(): PropertyDescriptor {
        throw hostileError;
      },
    });
    let issues: ReturnType<typeof boundaryValueIssues> = [];
    assert.doesNotThrow(() => {
      issues = boundaryValueIssues(hostile);
    }, "the Kernel boundary refuses; it does not propagate the caller's exception or the formatter's");
    assert.deepEqual(issues.map((issue) => issue.code), ["unstable_representation"]);
  });
});

describe("K11-R3-LIMIT-01 over-limit arrays refuse without work proportional to the declared length", () => {
  test("exactly-at-limit passes and one-over refuses", () => {
    const atLimit = Array.from({ length: BOUNDARY_LIMITS.containerEntries }, () => 0);
    assert.deepEqual(issueCodes(atLimit), []);
    assert.deepEqual(issueCodes([...atLimit, 0]), ["too_many_entries"]);
  });

  test("a deliberately huge sparse length refuses bounded without traversing its extent", () => {
    const HUGE = 20_000_000;
    const target: unknown[] = [];
    target.length = HUGE;
    let indexReads = 0;
    const counting = new Proxy(target, {
      getOwnPropertyDescriptor(inner, property): PropertyDescriptor | undefined {
        if (typeof property === "string" && property !== "length" && /^(0|[1-9]\d*)$/.test(property)) indexReads += 1;
        return Reflect.getOwnPropertyDescriptor(inner, property);
      },
    });
    const issues = boundaryValueIssues(counting);
    assert.deepEqual(issues.map((issue) => issue.code), ["too_many_entries"]);
    assert.ok(indexReads < 100, `rejection traversed no index extent (saw ${indexReads} index descriptor reads for length ${HUGE})`);
    // And the plain huge sparse array itself refuses the same way.
    assert.deepEqual(issueCodes(target), ["too_many_entries"]);
  });
});

describe("K11-R2-VAL-02 serializer execution environment is caller-independent (round-6)", () => {
  test("a capture-time one-shot Object.keys replacement cannot change canonical bytes", () => {
    const realKeys = Object.keys;
    // Coherent on the one reading capture takes (descriptor 1, read 1), while the read installs
    // a live-global replacement as its side effect. Review-04's witness bound `{}` here while
    // retaining `{a:1}`; the restored serializer environment must bind `{"a":1}`.
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Object as unknown as Record<string, unknown>).keys = () => [];
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    assert.equal(Object.getOwnPropertyDescriptor(sneaky, "a")?.value, 1, "owns 1");
    let result: ReturnType<typeof canonicalize>;
    try {
      result = canonicalize(sneaky);
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

  test("a capture-time replacement that makes Object.keys throw neither leaks nor diverts bytes", () => {
    const realKeys = Object.keys;
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Object as unknown as Record<string, unknown>).keys = () => {
            throw new Error("keys boom");
          };
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    let threw = false;
    let result: ReturnType<typeof canonicalize> | undefined;
    try {
      result = canonicalize(sneaky);
    } catch {
      threw = true;
    } finally {
      Object.keys = realKeys;
    }
    // The restored environment neutralizes a configurable replacement, so the valid value is
    // still accepted with its own bytes; what must never happen is the ambient exception
    // escaping the Kernel boundary (review-04's `escaped: keys boom`) or bytes for `{}`.
    assert.equal(threw, false, "the Kernel boundary contains serializer failure; it does not propagate the ambient exception");
    assert.ok(result && result.ok, "the coherent reading is still acceptable");
    assert.equal(result && result.ok && result.value.canonical, '{"a":1}');
    assert.deepEqual(result && result.ok && result.value.value, { a: 1 });
  });

  test("a capture-time Array.prototype.join replacement cannot change canonical bytes either", () => {
    const realJoin = Array.prototype.join;
    const sneaky = new Proxy({ list: [1, 2] } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "list") {
          (Array.prototype as unknown as Record<string, unknown>).join = () => "";
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    let result: ReturnType<typeof canonicalize>;
    try {
      result = canonicalize(sneaky);
      assert.notEqual(Array.prototype.join, realJoin, "the replacement was live across the boundary call");
    } finally {
      (Array.prototype as unknown as Record<string, unknown>).join = realJoin;
    }
    assert.ok(result!.ok);
    assert.equal(result!.ok && result!.value.canonical, '{"list":[1,2]}', "array bytes survive prototype replacement too, not only Object.keys");
  });

  test("K11-R5-VAL-03 a getPrototypeOf trap that swaps the live Object binding cannot pass a foreign prototype as plain", () => {
    const RealObject = Object;
    const realProto = Object.prototype;
    // A fresh constructor whose prototype is neither the primordial object prototype nor null.
    const Fake = function Fake(this: unknown) {};
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      getPrototypeOf() {
        // The observation itself replaces the live binding, then returns the replacement's
        // prototype. Against a live `Object.prototype` read this compares equal and passes as
        // plain; the retained snapshot would then inherit the foreign prototype.
        (globalThis as unknown as Record<string, unknown>).Object = Fake;
        return (Fake as unknown as { prototype: object }).prototype;
      },
    });
    let issues: ReturnType<typeof boundaryValueIssues>;
    let secondOk: boolean | undefined;
    try {
      issues = boundaryValueIssues(sneaky);
      assert.notEqual((globalThis as unknown as Record<string, unknown>).Object, RealObject, "the swap was live across the boundary call");
      // The trap fires again here and re-installs the swap; the finally below restores it.
      secondOk = canonicalize(sneaky).ok;
    } finally {
      (globalThis as unknown as Record<string, unknown>).Object = RealObject;
    }
    assert.ok(issues!.length > 0, "a foreign prototype is refused, not normalized into a plain snapshot");
    assert.ok(
      issues!.some((issue) => issue.code === "unsupported_form"),
      `the refusal names the non-plain form, got ${JSON.stringify(issues)}`,
    );
    assert.equal(secondOk, false, "it produces no canonical identity");
    assert.equal(Object.prototype, realProto, "the live binding is restored for later tests");
  });
});

describe("K11-R6-VAL-04 one observation survives an indexed accessor installed while observing it", () => {
  /**
   * The caller here is entirely coherent, which is the point.
   *
   * `captureArray` observes the prototype first, and that observation is caller code. A genuine
   * array behind a `Proxy` whose `getPrototypeOf` trap installs an inherited accessor at one of its
   * own index names, and then returns the genuine `Array.prototype`, passes the plain-array check
   * legitimately. Its own descriptor and its ordinary read still agree, so the one observation the
   * pass takes is unambiguous.
   *
   * The previous shape then put that observed element into a holey scratch array with an ordinary
   * indexed write and read it back to build the snapshot. Both halves went through the accessor:
   * the write was swallowed, and the read of the still-unowned position answered from the getter.
   * A caller whose value read `"kept"` could therefore be retained and canonicalized as the
   * attacker's substitute — the boundary accepting a value nobody sent. `values.md` allows exactly
   * two answers for a representation like this, and "some third value" is neither of them.
   */
  const coherentArrayTrapping = (
    elements: readonly unknown[],
    indices: readonly string[],
    onInstall: (trap: InheritedIndexTrap) => void,
  ): unknown => {
    const target = copyForTest(elements);
    return new Proxy(target, {
      getPrototypeOf(inner): object | null {
        onInstall(trapInheritedIndices(indices));
        return Reflect.getPrototypeOf(inner);
      },
    });
  };

  const withTrap = <T>(work: (onInstall: (trap: InheritedIndexTrap) => void) => T): { result: T; trap: InheritedIndexTrap } => {
    let trap: InheritedIndexTrap | undefined;
    try {
      const result = work((installed) => {
        trap = installed;
      });
      assert.ok(trap !== undefined, "the trap was installed by the observation under test");
      return { result, trap };
    } finally {
      trap?.restore();
    }
  };

  test("the retained structure and the canonical bytes are exactly the one value observed", () => {
    const { result, trap } = withTrap((onInstall) =>
      canonicalize(coherentArrayTrapping(["zero", "kept"], ["1"], onInstall)),
    );
    assert.ok(result.ok, `expected acceptance, got ${result.ok ? "" : JSON.stringify(result.issues)}`);
    assert.deepEqual(result.value.value, ["zero", "kept"], "the retained snapshot is the observed value");
    assert.equal(result.value.canonical, '["zero","kept"]', "and its bytes describe that same structure");
    assert.notDeepEqual(result.value.value, ["zero", trap.substitute]);
    // Re-canonicalizing what was retained reproduces the bytes that accepted it.
    const again = canonicalize(result.value.value);
    assert.ok(again.ok);
    assert.equal(again.value.canonical, result.value.canonical);
  });

  test("the index the accessor picks is not special: position zero and a nested array behave the same", () => {
    const first = withTrap((onInstall) => canonicalize(coherentArrayTrapping(["only"], ["0"], onInstall)));
    assert.ok(first.result.ok);
    assert.deepEqual(first.result.value.value, ["only"]);
    assert.equal(first.result.value.canonical, '["only"]');

    const nested = withTrap((onInstall) =>
      canonicalize({ outer: coherentArrayTrapping([1, 2, 3], ["0", "1", "2"], onInstall) }),
    );
    assert.ok(nested.result.ok);
    assert.deepEqual(nested.result.value.value, { outer: [1, 2, 3] });
    assert.equal(nested.result.value.canonical, '{"outer":[1,2,3]}');
  });

  test("a value the rules do refuse is still refused with the accessor live, not normalized", () => {
    // Coherence is what made the case above acceptable. Remove it — an own data descriptor and an
    // ordinary read that disagree — and the answer is the refusal `values.md` requires, with the
    // accessor still live and still unable to supply a third reading.
    const target = copyForTest([0, 0]);
    let trap: InheritedIndexTrap | undefined;
    let issues: ReturnType<typeof boundaryValueIssues>;
    const shifting = new Proxy(target, {
      getPrototypeOf(inner): object | null {
        trap = trapInheritedIndices(["1"]);
        return Reflect.getPrototypeOf(inner);
      },
      get(inner, property, receiver): unknown {
        if (property === "1") return 99;
        return Reflect.get(inner, property, receiver) as unknown;
      },
    });
    try {
      issues = boundaryValueIssues(shifting);
    } finally {
      trap?.restore();
    }
    assert.deepEqual(
      issues!.map((issue) => `${issue.path} ${issue.code}`),
      ["[1] unstable_representation"],
    );
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

  test("a capture-time trap that inserts the chain still binds the observed structure", () => {
    const target = { a: 1, b: 2 };
    let hostile: object | null = null;
    let installed = false;
    const proxy = new Proxy(target, {
      getPrototypeOf(t) {
        if (!installed) {
          installed = true;
          hostile = {};
          Object.defineProperty(hostile, "0", { get: () => '"pwned":9', set(_v: unknown) {}, configurable: true });
          const original = Object.getPrototypeOf(arrayProto());
          Object.setPrototypeOf(arrayProto(), hostile);
          Object.setPrototypeOf(hostile, original);
        }
        return Reflect.getPrototypeOf(t);
      },
    });
    let result: ReturnType<typeof canonicalize>;
    try {
      result = canonicalize(proxy);
    } finally {
      if (hostile !== null) Object.setPrototypeOf(arrayProto(), Object.getPrototypeOf(hostile));
    }
    assert.equal(installed, true, "the trap ran, so this is not a vacuous pass");
    assert.equal(result!.ok, true, "refused under trap-installed chain");
    assert.equal(result!.ok === true ? result!.value.canonical : null, '{"a":1,"b":2}');
    assert.equal(
      canonicalOf(result!.ok === true ? result!.value.value : null),
      '{"a":1,"b":2}',
      "retained content re-canonicalizes to the accepting bytes",
    );
    assert.equal(Object.getPrototypeOf(arrayProto()), Object.prototype, "chain handed back exactly");
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
