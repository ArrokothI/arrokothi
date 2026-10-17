/**
 * K1.1-correction-03 KC3-1: capture observes caller values only through metered helpers.
 *
 * `capture-metering.ts` holds the eleven rules and their stated gaps. This file runs them on the real
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
      before: "    const observed = observeElement(state, container, `${index}`);\n    if (observed === STOPPED) return STOPPED;",
      after: "    const raw = PrimordialGetOwnPropertyDescriptor(container, `${index}`);\n    const observed = { descriptor: raw, read: raw === undefined ? undefined : raw.value };",
    },
    {
      rule: "SC2",
      name: "a descriptor helper that no longer charges",
      before: "  if (spend(state, \"descriptor\", 1) === STOPPED) return STOPPED;\n  return PrimordialGetOwnPropertyDescriptor(container, name);",
      after: "  return PrimordialGetOwnPropertyDescriptor(container, name);",
    },
    {
      rule: "SC2",
      name: "a names listing charged a constant instead of its length",
      before: "  return spend(state, \"listing\", 1 + names.length) === STOPPED ? STOPPED : names;",
      after: "  return spend(state, \"listing\", 1) === STOPPED ? STOPPED : names;",
    },
    {
      rule: "SC2",
      name: "a string scanned before it is charged",
      before: "  if (spend(state, \"string\", units) === STOPPED) return STOPPED;\n  return scanBoundaryString(text);",
      after: "  const scanned = scanBoundaryString(text);\n  if (spend(state, \"string\", units) === STOPPED) return STOPPED;\n  return scanned;",
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
      before: "  if (refused) return REFUSED;\n  return finishObject(prototype, captured);",
      after: "  let scanned = 0;\n  for (let index = 0; index < captured.length; index += 1) scanned += index;\n  if (refused || scanned < 0) return REFUSED;\n  return finishObject(prototype, captured);",
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
      before: "  if (spend(state, \"visit\", 1) === STOPPED) return STOPPED;\n  if (value === null) return charge(state, 4) === STOPPED ? STOPPED : null;",
      after: "  if (value === null) return charge(state, 4) === STOPPED ? STOPPED : null;\n  if (spend(state, \"visit\", 1) === STOPPED) return STOPPED;",
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
      before: "    const scan = scanText(state, value);\n    if (scan === STOPPED) return STOPPED;",
      after: "    const scan = scanBoundaryString(value);",
    },
    {
      rule: "SC8",
      name: "the serializer window reached from the traversal",
      before: "  if (refused) return REFUSED;\n  return finishObject(prototype, captured);",
      after: "  if (refused || encode(null) === \"\") return REFUSED;\n  return finishObject(prototype, captured);",
    },
    {
      // Packet review MS-03: with the length guard after the loop, an all-digit name of any length is
      // read in full; the loop's own cap is what keeps it at ten reads.
      rule: "SC9",
      name: "an index-name loop whose bound rests only on the guard",
      before: "  for (let index = 0; index < name.length && index < 10; index += 1) {\n    const unit = name[index] as string;",
      after: "  for (let index = 0; index < name.length; index += 1) {\n    const unit = name[index] as string;",
    },
    {
      rule: "SC9",
      name: "a suffix search without its code-count cap",
      before: "  for (let index = 8; index < issues.length && index < 8 + 12; index += 1) {",
      after: "  for (let index = 8; index < issues.length; index += 1) {",
    },
    // Review 01, KC3-R1-STOP-01: one layer of the stop mechanism removed at a time. Each is invisible at
    // run time while the other layer holds, so the static rules are what reject it; `capture-stop.test.ts`
    // rejects the two-layer shapes at run time.
    {
      rule: "SC2",
      name: "a names listing that no longer tests the stop first",
      before: "const listOwnNames = (state: CaptureState, container: object): readonly string[] | typeof STOPPED => {\n  if (state.stopped) return STOPPED;\n",
      after: "const listOwnNames = (state: CaptureState, container: object): readonly string[] | typeof STOPPED => {\n",
    },
    {
      rule: "SC10",
      name: "a symbol diagnostic whose stop is not propagated (review 01's counterexample site)",
      before: "    if (record(state, { path, code: \"unrepresentable_member\", message: \"object has symbol-keyed members, which canonical form cannot represent\" }) === STOPPED) return STOPPED;",
      after: '    record(state, { path, code: "unrepresentable_member", message: "object has symbol-keyed members, which canonical form cannot represent" });',
    },
    {
      rule: "SC10",
      name: "a diagnostic whose stop branch returns REFUSED",
      before: "    if (record(state, { path, code: \"unrepresentable_member\", message: \"object has symbol-keyed members, which canonical form cannot represent\" }) === STOPPED) return STOPPED;",
      after: "    if (record(state, { path, code: \"unrepresentable_member\", message: \"object has symbol-keyed members, which canonical form cannot represent\" }) === STOPPED) return REFUSED;",
    },
    {
      rule: "SC10",
      name: "a nested stop folded into a refused member",
      before: "    const item = capture(member.value, where, entered, state);\n    if (item === STOPPED) return STOPPED;\n    if (item === REFUSED) {\n      refused = true;\n      continue;\n    }\n    appendOwn",
      after: "    const item = capture(member.value, where, entered, state);\n    if (item === REFUSED || item === STOPPED) {\n      refused = true;\n      continue;\n    }\n    appendOwn",
    },
    {
      rule: "SC10",
      name: "a terminal refusal that drops its diagnostic's stop",
      before: "const refuse = (state: CaptureState, issue: ValueIssue): typeof REFUSED | typeof STOPPED => (record(state, issue) === STOPPED ? STOPPED : REFUSED);",
      after: "const refuse = (state: CaptureState, issue: ValueIssue): typeof REFUSED | typeof STOPPED => (record(state, issue), REFUSED);",
    },
    {
      rule: "SC10",
      name: "a failed byte charge reported as a refusal",
      before: "  if (value === null) return charge(state, 4) === STOPPED ? STOPPED : null;",
      after: "  if (value === null) return charge(state, 4) === STOPPED ? REFUSED : null;",
    },
    {
      rule: "SC11",
      name: "the stop state written outside spend and charge",
      before: "  let refused = false;\n  const symbolCount = listOwnSymbols(state, container);",
      after: "  let refused = false;\n  state.stopped = false;\n  const symbolCount = listOwnSymbols(state, container);",
    },
    {
      rule: "SC9",
      name: "a snapshot loop over for...of",
      before: "  for (let entryIndex = 0; entryIndex < captured.length && entryIndex < BOUNDARY_LIMITS.containerEntries; entryIndex += 1) {\n    const pair = readAt(captured, entryIndex) as readonly [string, BoundaryValue];",
      after: "  for (const pair of captured) {",
    },
    {
      "rule": "SC10",
      "name": "a mutable stop-capable function binding",
      "before": "const charge = (state: CaptureState, bytes: number):",
      "after": "let charge = (state: CaptureState, bytes: number):"
    },
    {
      "rule": "SC10",
      "name": "an async stop-capable wrapper",
      "before": "const charge = (state: CaptureState, bytes: number):",
      "after": "const asyncCharge = async (state: CaptureState): Promise<true | typeof STOPPED> => charge(state, 1);\nconst charge = (state: CaptureState, bytes: number):"
    },
    {
      "rule": "SC10",
      "name": "a generator stop-capable wrapper",
      "before": "const charge = (state: CaptureState, bytes: number):",
      "after": "function* generatorCharge(state: CaptureState): Generator<unknown, true | typeof STOPPED, unknown> { return charge(state, 1); }\nconst charge = (state: CaptureState, bytes: number):"
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
