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
