/**
 * K1.1-correction-03 KC3-1: capture observes caller values only through metered helpers.
 *
 * `capture-metering.ts` holds the eight rules and their stated gaps. This file runs them on the real
 * `values.ts` (the clean control) and on one seeded bypass per rule: each bypass is a plausible
 * maintainer mistake, typechecks, and must be reported. The registered mutants in
 * `tests/fixtures/packet-tools/value-cost.json` apply the same shapes to the real file.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { meteringViolations, VALUES_FILE } from "./capture-metering.ts";

const SOURCE = readFileSync(VALUES_FILE, "utf8");

/** `SOURCE` with exactly one occurrence of `before` replaced. */
const edited = (before: string, after: string): string => {
  const at = SOURCE.indexOf(before);
  assert.ok(at >= 0 && SOURCE.indexOf(before, at + 1) < 0, `the seeded text occurs exactly once: ${before.slice(0, 60)}`);
  return SOURCE.slice(0, at) + after + SOURCE.slice(at + before.length);
};

describe("KC3-1 static metering check", () => {
  test("the real values.ts passes every rule", () => {
    assert.deepEqual(meteringViolations(), []);
  });

  const bypasses: { rule: string; name: string; before: string; after: string }[] = [
    {
      rule: "SC1",
      name: "an element observed by a direct descriptor call in the traversal",
      before: "    const observed = observeElement(state, container, `${index}`);\n    if (observed === STOPPED) return REFUSED;",
      after: "    const raw = PrimordialGetOwnPropertyDescriptor(container, `${index}`);\n    const observed = { descriptor: raw, read: raw === undefined ? undefined : raw.value };",
    },
    {
      rule: "SC2",
      name: "a descriptor helper that no longer charges",
      before: '  if (!spend(state, "descriptor", 1)) return STOPPED;\n  return PrimordialGetOwnPropertyDescriptor(container, name);',
      after: "  return PrimordialGetOwnPropertyDescriptor(container, name);",
    },
    {
      rule: "SC2",
      name: "a names listing charged a constant instead of its length",
      before: '  return spend(state, "listing", 1 + names.length) ? names : STOPPED;',
      after: '  return spend(state, "listing", 1) ? names : STOPPED;',
    },
    {
      rule: "SC2",
      name: "a string scanned before it is charged",
      before: '  if (!spend(state, "string", units)) return STOPPED;\n  return scanBoundaryString(text);',
      after: '  const scanned = scanBoundaryString(text);\n  if (!spend(state, "string", units)) return STOPPED;\n  return scanned;',
    },
    {
      rule: "SC3",
      name: "a member read in the traversal through a cast",
      before: "  let refused = false;\n  const symbolCount = listOwnSymbols(state, container);",
      after: "  let refused = (container as Record<string, unknown>)[\"x\"] === 1;\n  const symbolCount = listOwnSymbols(state, container);",
    },
    {
      rule: "SC3",
      name: "a global built-in called in the traversal",
      before: "  let refused = false;\n  const symbolCount = listOwnSymbols(state, container);",
      after: "  let refused = Reflect.ownKeys(container).length > 4096;\n  const symbolCount = listOwnSymbols(state, container);",
    },
    {
      rule: "SC4",
      name: "an unmetered loop in the traversal",
      before: "  if (refused || state.stopped) return REFUSED;\n  return finishObject(prototype, captured);",
      after: "  let scanned = 0;\n  for (let index = 0; index < captured.length; index += 1) scanned += index;\n  if (refused || state.stopped || scanned < 0) return REFUSED;\n  return finishObject(prototype, captured);",
    },
    {
      rule: "SC5",
      name: "the cycle test moved before the Proxy test",
      before: "  if ((typeof value === \"object\" || typeof value === \"function\") && isProxyValue(value)) {",
      after: "  if (typeof value === \"object\" && value !== null && isOpenContainer(state, value)) return REFUSED;\n  if ((typeof value === \"object\" || typeof value === \"function\") && isProxyValue(value)) {",
    },
    {
      rule: "SC5",
      name: "a visit that is not charged first",
      before: '  if (!spend(state, "visit", 1)) return REFUSED;\n  if (value === null) return charge(state, 4) ? null : REFUSED;',
      after: '  if (value === null) return charge(state, 4) ? null : REFUSED;\n  if (!spend(state, "visit", 1)) return REFUSED;',
    },
    {
      rule: "SC6",
      name: "a prototype observation repeated inside the element loop",
      before: "    const where = element(path, index);\n    const member = checkMember(observed.descriptor, observed.read, where, state);",
      after: "    const where = prototypeOf(container) === null ? path : element(path, index);\n    const member = checkMember(observed.descriptor, observed.read, where, state);",
    },
    {
      rule: "SC7",
      name: "a string scanned directly, bypassing scanText",
      before: "    const scan = scanText(state, value);\n    if (scan === STOPPED) return REFUSED;",
      after: "    const scan = scanBoundaryString(value);",
    },
    {
      rule: "SC8",
      name: "the serializer window reached from the traversal",
      before: "  if (refused || state.stopped) return REFUSED;\n  return finishObject(prototype, captured);",
      after: "  if (refused || state.stopped || encode(null) === \"\") return REFUSED;\n  return finishObject(prototype, captured);",
    },
  ];

  for (const bypass of bypasses) {
    test(`${bypass.rule} reports ${bypass.name}`, () => {
      const violations = meteringViolations(edited(bypass.before, bypass.after));
      assert.ok(!violations.some((violation) => violation.startsWith("typecheck:")), `the seeded bypass typechecks: ${violations.join("; ")}`);
      assert.ok(
        violations.some((violation) => violation.startsWith(bypass.rule)),
        `expected a ${bypass.rule} violation, got: ${violations.join("; ") || "none"}`,
      );
    });
  }
});
