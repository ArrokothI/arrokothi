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

import { BOUNDARY_LIMITS, boundaryValueIssues, canonicalize, isBoundaryValue, sameLogicalValue, type BoundaryValue } from "../src/index.ts";

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
