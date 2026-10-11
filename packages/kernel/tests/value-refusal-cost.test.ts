/** Revision 4: diagnostic storage is bounded at capture, with complete code counts and reads. */
/*
 * K1.1-correction-03. Capture refuses every Proxy before observing it (owner decision-01 item 2), so a
 * Proxy can no longer be the value that reaches a defensive refusal path, list a phantom name, install
 * pollution in the middle of a capture, or count the Kernel's descriptors and reads. Each converted test
 * keeps a witness that its original Proxy (its own handler, every trap counted by `countingProxy`) is now
 * refused with zero trap calls, and keeps the production mechanism it protected exercised without a Proxy:
 * - `inWrappedChild` (capture-instruments.ts): the Kernel captures wrappers of its observation primordials
 *   before it loads, so a hook on a tracked plain object or array can make one observation throw (the catch
 *   path and its typeof-only label), list a name the value does not own (the listed-but-not-owned and
 *   phantom-index checks), or answer with a different own descriptor (the out-of-range index, unstable
 *   length and descriptor/read disagreement checks), and each tracked observation is counted exactly;
 * - `captureWithWork` meter counts, derived below from each shape and the unit table, never copied from a run;
 * - pollution installed before the call (pre-call twin), and from the Kernel's own prototype observation
 *   of a tracked root in the middle of the capture (capture-time twin).
 *
 * An ordinary [[Get]] of own data on a genuine array runs no caller code and cannot be counted. Where the
 * original counted reads, two checks replace the count: a disagreement witness, whose own descriptor says
 * `undefined` while the element holds 0, so every position whose read happens is refused as unstable and
 * a position that skipped its read would be refused as `undefined_member` instead; and a local structural
 * pin (`helperContainerUses`) that inside the element helper, and the member helper, the caller value
 * appears only as the argument of the one descriptor primordial call and in the one element read, with no
 * loop, so no position is read twice or reached any other way. The meter's element unit is a cost pin
 * only: it is charged before the position's descriptor, whether or not the read follows.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { canonicalize, boundaryValueIssues, captureWithWork, isBoundaryValue, type CaptureWork, type ValueIssue, type ValueIssueCode } from "../src/values.ts";
import { captureOutcome } from "../src/outcome.ts";
import { explainDiagnosticIssues, located, explain } from "../src/envelope.ts";
import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";
import { countingProxy, inWrappedChild, revokedCountingProxy, type OperationCounts } from "./capture-instruments.ts";

const PROXY_MESSAGE = "value is a Proxy; capture refuses every Proxy before observing it";
const BUILT_IN_MESSAGE = "expected a plain object, received a built-in object whose content is kept in internal slots";
const SUFFIX_MESSAGE = "additional occurrences (locations omitted)";
const GHOST_MEMBER = "object lists an own member it does not own, so its structure has no single reading";
const threw = (label: string): string => `observing this value's structure threw (${label}), so it presents no readable content`;

const total = (issues: readonly ValueIssue[]) => issues.reduce((n, issue) => n + (issue.occurrences ?? 1), 0);

/** The bounds every refused root keeps, wherever its issues were computed. */
function assertBounded(issues: readonly ValueIssue[]): void {
  // 8 details plus at most 11 distinct value codes. The bound is independent of positions.
  assert.ok(issues.length <= 19, `unbounded allocation: ${issues.length} records`);
  for (const issue of issues) {
    assert.ok(issue.path.length <= 128);
    assert.ok(issue.message.length <= 1_024);
  }
}

function issuesOf(value: unknown) {
  const result = canonicalize(value);
  assert.equal(result.ok, false);
  if (result.ok) throw Error("expected refusal");
  assertBounded(result.issues);
  return result.issues;
}

/** 256 positions of one family: eight exact located details, then one suffix of 248. */
function assertFamily(issues: readonly ValueIssue[], code: ValueIssueCode, message: string, path: (index: number) => string): void {
  assert.equal(total(issues), 256);
  assert.ok(issues.every(issue => issue.code === code));
  assert.equal(issues[8]?.occurrences, 248);
  assert.deepEqual(issues, [
    ...Array.from({ length: 8 }, (_, index) => ({ path: path(index), code, message })),
    { path: "", code, message: SUFFIX_MESSAGE, occurrences: 248 },
  ]);
}

/** Every unit kind not named is 0; `units` is their sum. */
const work = (counts: Partial<Omit<CaptureWork, "units" | "stop">>, stop: CaptureWork["stop"] = "none"): CaptureWork => {
  const full = { visit: 0, listing: 0, element: 0, descriptor: 0, read: 0, string: 0, diagnostic: 0, ...counts };
  return { units: full.visit + full.listing + full.element + full.descriptor + full.read + full.string + full.diagnostic, ...full, stop };
};

const factories: [string, () => unknown, string][] = [
  ["undefined array members", () => undefined, "undefined_member"],
  ["nonfinite", () => Infinity, "non_finite_number"],
  ["unsupported primitive", () => Symbol("bad"), "unsupported_form"],
  ["foreign object prototype", () => new Date(), "unsupported_form"],
  ["foreign array prototype", () => Object.setPrototypeOf([], null), "unsupported_form"],
  ["lone surrogate", () => "\ud800", "lone_surrogate"],
  ["array excess length", () => new Array(4097), "too_many_entries"],
  ["array extra member", () => Object.assign([], { extra: 1 }), "unrepresentable_member"],
  ["array symbol", () => Object.assign([], { [Symbol()]: 1 }), "unrepresentable_member"],
  ["object symbol", () => ({ [Symbol()]: 1 }), "unrepresentable_member"],
  ["object nonenumerable", () => Object.defineProperty({}, "hidden", { value: 1 }), "unrepresentable_member"],
  ["object undefined", () => ({ a: undefined }), "undefined_member"],
  ["object accessor", () => ({ get a() { throw Error("must not read"); } }), "unrepresentable_member"],
  ["object bad key", () => ({ ["\ud800"]: 1 }), "lone_surrogate"],
];
for (const [name, factory, code] of factories) {
  test(`V-D1 every issue family: ${name}`, () => {
    const issues = issuesOf(Array(256).fill(factory()));
    assert.equal(total(issues), 256);
    assert.ok(issues.every(issue => issue.code === code));
    assert.equal(issues[8]?.occurrences, 248);
  });
}

test("V-D1 every issue family: re-prototyped built-in", () => {
  // K1.1-correction-03: new family (owner decision-01 item 3). A built-in that keeps its content in internal
  // slots under a plain prototype is refused at its own position and shares the collector.
  const issues = issuesOf(Array(256).fill(Object.setPrototypeOf(new Map([["a", 1]]), Object.prototype)));
  assertFamily(issues, "unsupported_form", BUILT_IN_MESSAGE, index => `[${index}]`);
});

test("V-D1 every issue family: Proxy", () => {
  // K1.1-correction-03: new family (owner decision-01 item 2). Every Proxy, ordinary, callable or revoked,
  // is refused at its own position before any trap runs, and shares the collector like every other family.
  for (const witness of [countingProxy({}), countingProxy(() => 1), countingProxy([1]), revokedCountingProxy()]) {
    const issues = issuesOf(Array(256).fill(witness.proxy));
    assertFamily(issues, "unsupported_form", PROXY_MESSAGE, index => `[${index}]`);
    assert.equal(witness.calls(), 0, "refused before any trap ran");
  }
});

/**
 * A family whose value was a Proxy at the base. The Proxy (its original handler, every trap counted) is
 * now a refused witness; a tracked plain value in a wrapped child, whose hooks answer one observation
 * the way the Proxy's trap did, reaches the same refusal path. `tracked` counts each tracked observation
 * per position, and `work` is the meter of the 256-position root, both derived from the shape.
 */
interface HookFamily {
  readonly witness: () => { readonly proxy: unknown; readonly calls: () => number };
  readonly subject: string;
  readonly hooks: string;
  readonly code: ValueIssueCode;
  readonly message: string;
  readonly path: (index: number) => string;
  readonly tracked: { readonly prototype: number; readonly symbols: number; readonly names: number; readonly descriptor: number };
  readonly work: CaptureWork;
}

/**
 * The 256-position root: its visit, its names listing (256 indices and `length`: 1 + 257), its empty
 * symbols listing (1) and 256 elements; then each position's own units, `per`, 256 times.
 */
const familyWork = (per: Partial<Omit<CaptureWork, "units" | "stop" | "element">>): CaptureWork => work({
  visit: 1 + 256 * (per.visit ?? 0),
  listing: (1 + 257) + 1 + 256 * (per.listing ?? 0),
  element: 256,
  descriptor: 256 * (per.descriptor ?? 0),
  read: 256 * (per.read ?? 0),
  string: 256 * (per.string ?? 0),
  diagnostic: 256 * (per.diagnostic ?? 0),
});

const ghostArrayHooks = (backed: boolean) => `
  hooks.names = (target, real) => target === subject ? ["length", "1"] : real;
  hooks.descriptor = (target, key, real) => target === subject && key === "1"
    ? ${backed ? `{ value: 1, writable: true, enumerable: true, configurable: true }` : "real"}
    : real;
`;
const ghostArrayProxy = (backed: boolean) => countingProxy([] as unknown[], {
  ownKeys: () => ["length", "1"],
  getOwnPropertyDescriptor: (target, key) => key === "1"
    ? backed ? { value: 1, writable: true, configurable: true, enumerable: true } : undefined
    : Reflect.getOwnPropertyDescriptor(target, key),
});

/**
 * Named families in registration order: an array of pairs, so registering their tests reads no intrinsic
 * at load time (the TOOLS-01 V-ENV detector).
 */
const hookFamilies: readonly (readonly [string, HookFamily])[] = [
  // Original: a revoked Proxy, whose first structural observation (IsArray) threw a TypeError.
  ["revoked structure", {
    witness: () => revokedCountingProxy(),
    subject: "{}",
    hooks: `hooks.prototype = (target, real) => { if (target === subject) throw new TypeError("revoked"); return real; };`,
    code: "unstable_representation",
    message: threw("object"),
    path: index => `[${index}]`,
    // The hook throws at the prototype observation, which follows the Proxy test, the cycle-set check and
    // IsArray; no listing or descriptor follows it.
    tracked: { prototype: 1, symbols: 0, names: 0, descriptor: 0 },
    work: familyWork({ visit: 1, diagnostic: 1 }),
  }],
  // Original: a Proxy whose `ownKeys` threw `null` at the object's first listing (its own symbols).
  ["throwing structure", {
    witness: () => countingProxy({}, { ownKeys() { throw null; } }),
    subject: "{}",
    hooks: `hooks.symbols = (target, real) => { if (target === subject) throw null; return real; };`,
    code: "unstable_representation",
    message: threw("null"),
    path: index => `[${index}]`,
    // A listing is charged only after it returns; this one throws, so it costs no listing unit.
    tracked: { prototype: 1, symbols: 1, names: 0, descriptor: 0 },
    work: familyWork({ visit: 1, diagnostic: 1 }),
  }],
  // Original: a Proxy listing `ghost` with no own descriptor behind it.
  ["object ghost descriptor", {
    witness: () => countingProxy({}, { ownKeys: () => ["ghost"], getOwnPropertyDescriptor: () => undefined }),
    subject: "{}",
    hooks: `hooks.names = (target, real) => target === subject ? ["ghost"] : real;`,
    code: "unstable_representation",
    message: GHOST_MEMBER,
    path: index => `[${index}].ghost`,
    // Symbols listing 1, names listing 1 + 1, the ghost's one descriptor; the unowned name is never scanned.
    tracked: { prototype: 1, symbols: 1, names: 1, descriptor: 1 },
    work: familyWork({ visit: 1, listing: 1 + 2, descriptor: 1, diagnostic: 1 }),
  }],
  // Original: a Proxy over [] listing index 1 at length 0, with no own descriptor for it.
  ["array ghost index", {
    witness: () => ghostArrayProxy(false),
    subject: "[]",
    hooks: ghostArrayHooks(false),
    code: "unstable_representation",
    message: "array lists an own index it does not own, so its structure has no single reading",
    path: index => `[${index}][1]`,
    // `length` and index 1 descriptors; names listing 1 + 2, symbols listing 1; no position below length 0.
    tracked: { prototype: 1, symbols: 1, names: 1, descriptor: 2 },
    work: familyWork({ visit: 1, listing: 3 + 1, descriptor: 1, diagnostic: 1 }),
  }],
  // Original: the same Proxy with index 1 backed by an own data descriptor.
  ["array out-of-range index", {
    witness: () => ghostArrayProxy(true),
    subject: "[]",
    hooks: ghostArrayHooks(true),
    code: "unrepresentable_member",
    message: "array has an own index outside its length, which canonical form would silently drop",
    path: index => `[${index}][1]`,
    tracked: { prototype: 1, symbols: 1, names: 1, descriptor: 2 },
    work: familyWork({ visit: 1, listing: 3 + 1, descriptor: 1, diagnostic: 1 }),
  }],
  // Original: a Proxy over [] whose `get` answered 1 for `length` while the own descriptor said 0.
  ["array unstable length", {
    witness: () => countingProxy([] as unknown[], { get: () => 1 }),
    subject: "[]",
    hooks: `hooks.descriptor = (target, key, real) => target === subject && key === "length"
      ? { value: 1, writable: true, enumerable: false, configurable: false }
      : real;`,
    code: "unstable_representation",
    message: "array length is not one stable own data property, so which positions exist cannot be established",
    path: index => `[${index}]`,
    // Refused at its length, before any listing.
    tracked: { prototype: 1, symbols: 0, names: 0, descriptor: 1 },
    work: familyWork({ visit: 1, diagnostic: 1 }),
  }],
  // Original: a Proxy over { a: 1 } whose `get` answered 2 while the own descriptor said 1.
  ["descriptor/read mismatch", {
    witness: () => countingProxy({ a: 1 }, { get: () => 2 }),
    subject: "{ a: 1 }",
    hooks: `hooks.descriptor = (target, key, real) => target === subject && key === "a"
      ? { value: 2, writable: true, enumerable: true, configurable: true }
      : real;`,
    code: "unstable_representation",
    message: "member is supplied differently by its own data descriptor and by ordinary property access, so it has no single content",
    path: index => `[${index}].a`,
    // Symbols 1, names 1 + 1, one descriptor, the name "a" scanned (1), one read.
    tracked: { prototype: 1, symbols: 1, names: 1, descriptor: 1 },
    work: familyWork({ visit: 1, listing: 1 + 2, descriptor: 1, string: 1, read: 1, diagnostic: 1 }),
  }],
];

interface HookFamilyRun {
  readonly ok: boolean;
  readonly issues: ValueIssue[] | null;
  readonly counts: OperationCounts;
  readonly workOk: boolean;
  readonly workIssues: ValueIssue[] | null;
  readonly work: CaptureWork;
}

function runHookFamily(family: HookFamily): HookFamilyRun {
  return inWrappedChild<HookFamilyRun>(`
    const subject = track(${family.subject});
    ${family.hooks}
    const root = Array(256).fill(subject);
    reset();
    const result = values.canonicalize(root);
    const observed = snapshot();
    const metered = values.captureWithWork(root);
    emit({
      ok: result.ok, issues: result.ok ? null : result.issues, counts: observed,
      workOk: metered.result.ok, workIssues: metered.result.ok ? null : metered.result.issues, work: metered.work,
    });
  `);
}

for (const [name, family] of hookFamilies) {
  test(`V-D1 every issue family: ${name}`, () => {
    // K1.1-correction-03: converted from a Proxy family value (owner decision-01 item 2). The Proxy is now
    // refused before any trap; a hook on a tracked plain value reaches the refusal path it reached.
    const witness = family.witness();
    assertFamily(issuesOf(Array(256).fill(witness.proxy)), "unsupported_form", PROXY_MESSAGE, index => `[${index}]`);
    assert.equal(witness.calls(), 0, "the original Proxy is refused before any trap ran");

    const run = runHookFamily(family);
    assert.equal(run.ok, false);
    const issues = run.issues ?? [];
    assertBounded(issues);
    assertFamily(issues, family.code, family.message, family.path);
    // Each position was observed once: one prototype observation, at most one listing of each kind, and
    // one descriptor per name the Kernel examined.
    assert.deepEqual(
      [run.counts.prototypeTracked, run.counts.symbolsTracked, run.counts.namesTracked, run.counts.descriptorTracked],
      [family.tracked.prototype * 256, family.tracked.symbols * 256, family.tracked.names * 256, family.tracked.descriptor * 256],
    );
    assert.equal(run.workOk, false);
    assert.deepEqual(run.workIssues, run.issues, "the metered path is the same capture");
    assert.deepEqual(run.work, family.work);
  });
}

test("V-D1 holes and accessors retain all occurrences without invoking accessors", () => {
  const holes = new Array(4096);
  assert.equal(total(issuesOf(holes)), 4096);
  let calls = 0;
  const accessors = Array.from({ length: 4096 }, () => 1);
  for (let i = 0; i < accessors.length; i++) Object.defineProperty(accessors, i, { get() { calls++; return 1; } });
  assert.equal(total(issuesOf(accessors)), 4096);
  assert.equal(calls, 0);
});

test("V-D1 cycle and depth issues share the collector", () => {
  const cycle: unknown[] = []; cycle.push(cycle);
  assert.equal(total(issuesOf(Array(256).fill(cycle))), 256);
  let deep: unknown = Array(256).fill([]);
  for (let i = 0; i < 31; i++) deep = [deep];
  const issues = issuesOf(deep);
  assert.equal(total(issues), 256);
  assert.ok(issues.every(issue => issue.code === "too_deep"));
});

test("V-D1 long strings/names and oversized listings keep the existing stopping/read bounds", () => {
  for (const value of ["x".repeat(65537), { ["x".repeat(65537)]: 1 }, Object.fromEntries(Array.from({ length: 4097 }, (_, i) => [`a${i}`, 1]))]) {
    const issues = issuesOf(Array(256).fill(value));
    assert.ok(total(issues) > 8);
    assert.ok(issues.some(issue => issue.code === "too_many_bytes"), "the original byte stop still applies");
  }
});

test("V-D1 P5: 532480 invalid positions retain nine records and exact ordered details", () => {
  const issues = issuesOf(Array(130).fill(Array(4096).fill(undefined)));
  assert.equal(total(issues), 532480);
  assert.equal(issues.length, 9);
  assert.deepEqual(issues.slice(0, 8).map(i => i.path), Array.from({ length: 8 }, (_, i) => `[0][${i}]`));
  assert.equal(issues[8]?.occurrences, 532472);
});

test("V-D1 bounded paths include phantom names, long ancestors, and literal omission text", () => {
  // K1.1-correction-03: converted from a Proxy listing a 1,000,000-character phantom name (owner decision-01
  // item 2). That Proxy is refused at the root before any trap, so its name is never listed; the phantom
  // name is listed instead by a hook on a tracked plain object that does not own it. A short phantom name,
  // added with the conversion, shows that an unowned name is never scanned.
  const name = "x".repeat(1_000_000);
  const witness = countingProxy({}, { ownKeys: () => [name], getOwnPropertyDescriptor: () => undefined });
  assert.deepEqual(issuesOf(witness.proxy), [{ path: "", code: "unsupported_form", message: PROXY_MESSAGE }]);
  assert.equal(witness.calls(), 0, "refused before any trap ran");

  interface Phantom { readonly ok: boolean; readonly issues: ValueIssue[] | null; readonly names: number; readonly descriptors: number; readonly work: CaptureWork }
  const phantoms = inWrappedChild<{ long: Phantom; short: Phantom }>(`
    const phantom = (name) => {
      const subject = track({});
      hooks.names = (target, real) => target === subject ? [name] : real;
      reset();
      const result = values.canonicalize(subject);
      const { namesTracked: names, descriptorTracked: descriptors } = snapshot();
      return { ok: result.ok, issues: result.ok ? null : result.issues, names, descriptors, work: values.captureWithWork(subject).work };
    };
    emit({ long: phantom("x".repeat(1_000_000)), short: phantom("ghost") });
  `);
  // Visit 1; symbols listing 1 and names listing 1 + 1; one descriptor; one diagnostic; no string units.
  const phantomWork = work({ visit: 1, listing: 1 + 2, descriptor: 1, diagnostic: 1 });
  for (const [phantom, path] of [[phantoms.long, "<omitted>"], [phantoms.short, "ghost"]] as const) {
    assert.equal(phantom.ok, false);
    assertBounded(phantom.issues ?? []);
    assert.deepEqual(phantom.issues, [{ path, code: "unstable_representation", message: GHOST_MEMBER }]);
    assert.deepEqual([phantom.names, phantom.descriptors], [1, 1], "one listing, one descriptor for the phantom name");
    assert.deepEqual(phantom.work, phantomWork);
  }
  // The long name's length never reaches the path. It is past the scan limit, so it would cost no string
  // units even if scanned; the short name, which would cost 5, shows that the unowned name is never scanned.

  for (const value of [{ ["x".repeat(65536)]: { a: undefined } }, { ["x".repeat(128)]: Array(32).fill(undefined) }]) {
    assert.equal(issuesOf(value)[0]?.path, "<omitted>");
  }
  assert.equal(issuesOf({ "<omitted>": { a: undefined } })[0]?.path, "<omitted>.a");
  assert.equal(issuesOf({ ["a".repeat(128)]: undefined })[0]?.path, "a".repeat(128));
  const hostile = Object.create({ constructor: { name: "N".repeat(1_000_000) } });
  assert.equal(issuesOf(hostile)[0]?.message, "expected a plain object, received object");
});

test("V-D1 suffix counts preserve late codes and first occurrence order across root consumers", () => {
  const root = [...Array(9).fill(undefined), NaN, Symbol(), undefined, NaN];
  const issues = issuesOf(root);
  assert.deepEqual(issues.slice(8).map(i => [i.code, i.occurrences]), [["undefined_member", 2], ["non_finite_number", 2], ["unsupported_form", 1]]);
  assert.match(explainDiagnosticIssues(issues, true), /5 additional issues: undefined_member=2, non_finite_number=2, unsupported_form=1$/);
  assert.equal(total(boundaryValueIssues(root)), 13);
  assert.equal(isBoundaryValue(root), false);
  assert.match(explain(located(issues, "payload")), /payload undefined_member \(2 additional occurrences; locations omitted\)/);
});

const ENVELOPE_URL = new URL("../src/envelope.ts", import.meta.url).href;
const HARNESS_URL = new URL("./harness.ts", import.meta.url).href;
const FIXTURE_URL = new URL("./refusal-diagnostics-fixture.ts", import.meta.url).href;
const OUTCOME_URL = new URL("../src/outcome.ts", import.meta.url).href;

test("V-D1 own-only multiplicity under ambient pollution and capture-time mutation", () => {
  // K1.1-correction-03: converted from a getPrototypeOf-trap Proxy that installed the pollution mid-capture
  // (owner decision-01 item 2). The Proxy is now refused before any trap, so its pollution is never
  // installed; the pollution is installed before the call (pre-call twin) and, in a wrapped child, from
  // the Kernel's own prototype observation of a tracked root, the moment the trap used to run.
  const pollute = (observed: { reads: number }) => {
    Object.defineProperty(Object.prototype, "occurrences", { configurable: true, get() { observed.reads++; return 999; } });
  };
  const unpollute = () => { delete (Object.prototype as { occurrences?: unknown }).occurrences; };

  const witnessReads = { reads: 0 };
  const witness = countingProxy(Array(64).fill(undefined), { getPrototypeOf(target) {
    pollute(witnessReads);
    return Reflect.getPrototypeOf(target);
  } });
  try {
    assert.deepEqual(issuesOf(witness.proxy), [{ path: "", code: "unsupported_form", message: PROXY_MESSAGE }]);
  } finally { unpollute(); }
  assert.equal(witness.calls(), 0, "refused before any trap ran, so nothing was installed");
  assert.equal(witnessReads.reads, 0);

  // Pre-call twin: the pollution is live for the whole capture and for every consumer after it.
  const observed = { reads: 0 };
  let issues: ValueIssue[], reason: string;
  pollute(observed);
  try {
    const result = canonicalize(Array(64).fill(undefined));
    if (result.ok) throw Error("expected refusal");
    issues = result.issues;
    reason = explainDiagnosticIssues(issues, true);
    const relocated = located(issues, "payload");
    assert.match(explain(relocated), /56 additional occurrences/);
  } finally { unpollute(); }
  assert.equal(observed.reads, 0);
  assert.equal(total(issues!), 64);
  assert.match(reason!, /56 additional issues: undefined_member=56$/);

  // Capture-time twin: installed by the Kernel's first observation of the root, inside the capture.
  const midPass = inWrappedChild<{ installed: number; reads: number; issues: ValueIssue[]; reason: string; relocated: string }>(`
    const { explainDiagnosticIssues, located, explain } = await import(${JSON.stringify(ENVELOPE_URL)});
    let installed = 0, reads = 0;
    const value = track(Array(64).fill(undefined));
    hooks.prototype = (target, real) => {
      if (target === value) {
        installed++;
        Object.defineProperty(Object.prototype, "occurrences", { configurable: true, get() { reads++; return 999; } });
      }
      return real;
    };
    let issues, reason, relocated;
    try {
      const result = values.canonicalize(value);
      if (result.ok) throw Error("expected refusal");
      issues = result.issues;
      reason = explainDiagnosticIssues(issues, true);
      relocated = explain(located(issues, "payload"));
    } finally { delete Object.prototype.occurrences; }
    emit({ installed, reads, issues, reason, relocated });
  `);
  assert.equal(midPass.installed, 1, "the pollution was installed during the capture, by the root's prototype observation");
  assert.equal(midPass.reads, 0);
  assert.equal(total(midPass.issues), 64);
  assertBounded(midPass.issues);
  assert.match(midPass.reason, /56 additional issues: undefined_member=56$/);
  assert.match(midPass.relocated, /56 additional occurrences/);
});

function setup() {
  const who = caller("cost"), driver = recordingDriver(), kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, kernel, executionId, open, grant: submissionFor(driver, open.activationId), view: () => accepted(kernel.inspect(who, executionId)) };
}

/** How one metered helper of `values.ts` uses its `container` parameter, the caller value. */
interface ContainerUses {
  /** As the first argument of a `PrimordialGetOwnPropertyDescriptor` call: one own-descriptor observation. */
  readonly descriptor: number;
  /** As the object of an element access: one ordinary read. */
  readonly read: number;
  /** Any other reference: a property access, any other call's argument, an alias, a return. */
  readonly other: number;
  /** Loops in the helper, which would repeat one of the above. */
  readonly loops: number;
}

/**
 * Every reference to the `container` parameter inside one metered helper of `values.ts`, classified
 * through casts, non-null assertions and parentheses. A local instrument (K1.1-correction-03): an own-data
 * [[Get]] on a genuine array runs no caller code and no Proxy may count it any more, so the one read per
 * position the original Proxy counted is pinned where it is taken. In the helper the caller value may
 * appear only in its one descriptor call and its one element read; any other reference (`Reflect.get`, a
 * helper call, an alias, a second read) is a way to reach it that the wrapped child's counts and the read
 * witness cannot see.
 */
function helperContainerUses(helper: string): ContainerUses {
  const source = ts.createSourceFile("values.ts", readFileSync(new URL("../src/values.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
  let declared: ts.Expression | undefined;
  const find = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === helper) declared = node.initializer;
    else ts.forEachChild(node, find);
  };
  find(source);
  assert.ok(declared !== undefined && ts.isArrowFunction(declared), `${helper} is declared in values.ts as an arrow function`);
  const helperFunction = declared as ts.ArrowFunction;
  assert.ok(helperFunction.parameters.some(parameter => ts.isIdentifier(parameter.name) && parameter.name.text === "container"), `${helper} takes the caller value as \`container\``);
  const wrapped = (node: ts.Node): ts.Node => {
    const parent = node.parent;
    return ts.isParenthesizedExpression(parent) || ts.isAsExpression(parent) || ts.isTypeAssertionExpression(parent) ||
      ts.isNonNullExpression(parent) || ts.isSatisfiesExpression(parent) ? wrapped(parent) : node;
  };
  let descriptor = 0, read = 0, other = 0, loops = 0;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === "container") {
      const use = wrapped(node), parent = use.parent;
      if (ts.isParameter(parent) && parent.name === use) {
        // The declaration itself, not a use.
      } else if (ts.isCallExpression(parent) && ts.isIdentifier(parent.expression) &&
          parent.expression.text === "PrimordialGetOwnPropertyDescriptor" && parent.arguments[0] === use) descriptor += 1;
      else if (ts.isElementAccessExpression(parent) && parent.expression === use) read += 1;
      else other += 1;
    }
    if (ts.isIterationStatement(node, false)) loops += 1;
    ts.forEachChild(node, visit);
  };
  visit(helperFunction);
  return { descriptor, read, other, loops };
}

interface EagerArm {
  readonly arm: "none" | "grant" | "read witness";
  readonly classification: string;
  readonly reason: string;
  readonly observed: { readonly prototypes: number; readonly names: number; readonly symbols: number; readonly lengthDescriptors: number; readonly descriptors: number; readonly unexpected: number; readonly positionMin: number; readonly positionMax: number };
  readonly delivered: number;
}

test("V-D1 eight eager roots before authority: every position once, no forbidden mutation", () => {
  // K1.1-correction-03: converted from a Proxy root counting its descriptors and reads (owner decision-01
  // item 2). The Proxy is now refused at each of the eight root positions before any trap (witness below).
  // A tracked genuine array in a wrapped child counts every Kernel observation of it, per position; a read
  // witness and a structural pin on the element helper replace the read count, which a genuine array
  // cannot expose. The meter's element unit below is a cost pin only.
  const s = setup();
  const proxyRoot = countingProxy(Array(4096).fill(undefined));
  const proxyProposal = outcomeFor(s.executionId, s.open, { progress: proxyRoot.proxy, emissions: Array.from({ length: 6 }, (_, i) => ({ emissionKey: `e${i}`, value: proxyRoot.proxy })), next: { step: "complete", result: proxyRoot.proxy } });
  const rootLabels = ["progress", ...Array.from({ length: 6 }, (_, i) => `emissions[${i}].value`), "next.result"];
  for (const [grant, classification] of [[undefined, "unauthorized_submission"], [s.grant, "malformed_envelope"]] as const) {
    const before = s.view(), sent = s.driver.seen.length;
    const refusal = refused(s.kernel.submitOutcome(observer("visible"), proxyProposal, grant!));
    assert.equal(proxyRoot.calls(), 0, "every root position refused before any trap ran");
    assert.equal(refusal.classification, classification);
    if (grant) {
      assert.equal(refusal.reason, `Outcome for Activation ${s.open.activationId} refused whole: ${rootLabels.map(label => `${label} unsupported_form (${PROXY_MESSAGE})`).join("; ")}`);
    } else assert.doesNotMatch(refusal.reason, /unsupported_form|additional issues/);
    assertOnlyRefusal(before, s.view(), refusal);
    assert.equal(s.driver.seen.length, sent);
  }
  const proxyCapture = captureOutcome(proxyProposal, 256);
  assert.deepEqual(proxyCapture.issues.map(issue => [issue.code, issue.message]), rootLabels.map(() => ["unsupported_form", PROXY_MESSAGE]));
  assert.equal(proxyRoot.calls(), 0);
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));

  const probe = inWrappedChild<{ arms: EagerArm[]; capture: { issues: number; total: number; observed: EagerArm["observed"] } }>(`
    const h = await import(${JSON.stringify(HARNESS_URL)});
    const { assertOnlyRefusal } = await import(${JSON.stringify(FIXTURE_URL)});
    const { captureOutcome } = await import(${JSON.stringify(OUTCOME_URL)});
    const ROW = 4096;
    const who = h.caller("cost"), driver = h.recordingDriver(), coordinator = new kernel.ExecutionCoordinator({ driver });
    const { executionId } = h.accepted(coordinator.createExecution(who, h.createRequest()));
    const open = h.accepted(coordinator.dispatch(who, executionId, { bound: 1 }));
    const grant = h.submissionFor(driver, open.activationId);
    const view = () => h.accepted(coordinator.inspect(who, executionId));
    // One tracked genuine array, eight root positions; every Kernel observation of it is counted.
    const fixture = (fill, answer) => {
      const root = track(Array(ROW).fill(fill));
      const counts = { prototypes: 0, names: 0, symbols: 0, lengthDescriptors: 0, descriptors: 0, unexpected: 0 };
      const positions = new Uint32Array(ROW);
      hooks.prototype = (target, real) => { if (target === root) counts.prototypes++; return real; };
      hooks.names = (target, real) => { if (target === root) counts.names++; return real; };
      hooks.symbols = (target, real) => { if (target === root) counts.symbols++; return real; };
      hooks.descriptor = (target, key, real) => {
        if (target !== root) return real;
        if (key === "length") { counts.lengthDescriptors++; return real; }
        const index = Number(key);
        if (Number.isInteger(index) && index >= 0 && index < ROW && String(index) === key) { counts.descriptors++; positions[index]++; }
        else counts.unexpected++;
        return answer === undefined ? real : answer;
      };
      const proposal = h.outcomeFor(executionId, open, {
        progress: root,
        emissions: Array.from({ length: 6 }, (_, i) => ({ emissionKey: "e" + i, value: root })),
        next: { step: "complete", result: root },
      });
      const observed = () => {
        let positionMin = Infinity, positionMax = 0;
        for (const seen of positions) { positionMin = Math.min(positionMin, seen); positionMax = Math.max(positionMax, seen); }
        return { ...counts, positionMin, positionMax };
      };
      return { proposal, observed };
    };
    const arms = [];
    const submit = (arm, f, actorGrant) => {
      const before = view(), sent = driver.seen.length;
      const refusal = h.refused(coordinator.submitOutcome(h.observer("visible"), f.proposal, actorGrant));
      assertOnlyRefusal(before, view(), refusal);
      arms.push({ arm, classification: refusal.classification, reason: refusal.reason, observed: f.observed(), delivered: driver.seen.length - sent });
    };
    submit("none", fixture(undefined), undefined);
    submit("grant", fixture(undefined), grant);
    // The element holds 0 and its own descriptor says undefined: a position whose read happens disagrees.
    submit("read witness", fixture(0, { value: undefined, writable: true, enumerable: true, configurable: true }), grant);
    const f = fixture(undefined);
    const outcome = captureOutcome(f.proposal, 256);
    const capture = { issues: outcome.issues.length, total: outcome.issues.reduce((n, issue) => n + (issue.occurrences ?? 1), 0), observed: f.observed() };
    h.accepted(coordinator.submitOutcome(who, h.outcomeFor(executionId, open), grant));
    emit({ arms, capture });
  `);

  // Eight roots, each the same 4,096-position array: one prototype observation, one names and one symbols
  // listing, one length descriptor and one descriptor per position, per root, and nothing else.
  const everyPositionOnce = { prototypes: 8, names: 8, symbols: 8, lengthDescriptors: 8, descriptors: 8 * 4096, unexpected: 0, positionMin: 8, positionMax: 8 };
  assert.deepEqual(probe.arms.map(arm => arm.arm), ["none", "grant", "read witness"]);
  for (const arm of probe.arms) {
    assert.deepEqual(arm.observed, everyPositionOnce, `${arm.arm}: every root captured eagerly, each position observed once`);
    assert.equal(arm.classification, arm.arm === "none" ? "unauthorized_submission" : "malformed_envelope");
    assert.equal(arm.delivered, 0);
  }
  const [none, grant, witness] = probe.arms as [EagerArm, EagerArm, EagerArm];
  assert.doesNotMatch(none.reason, /undefined_member|additional issues/);
  assert.match(grant.reason, /32760 additional issues: undefined_member=32760$/);
  // Every one of the 8 x 4,096 positions was read: each read (0) disagrees with its descriptor (undefined).
  assert.match(witness.reason, /32760 additional issues: unstable_representation=32760$/);
  assert.doesNotMatch(witness.reason, /undefined_member/);
  assert.deepEqual(probe.capture, { issues: 8 * 9, total: 8 * 4096, observed: everyPositionOnce });

  // One root on the meter: its visit, names listing (4,096 indices and length: 1 + 4,097) and symbols
  // listing (1), then per position one element unit and one diagnostic. The element unit is a cost pin
  // only: it is charged before the position's descriptor, whether or not the read follows.
  const metered = captureWithWork(Array(4096).fill(undefined));
  assert.equal(metered.result.ok, false);
  assert.deepEqual(metered.work, work({ visit: 1, listing: (1 + 4097) + 1, element: 4096, diagnostic: 4096 }));
  // The element helper reaches the caller value only through its one descriptor call and its one element
  // read, with no loop, so no position is read twice or reached any other way; the member helper only
  // through its one read.
  assert.deepEqual(helperContainerUses("observeElement"), { descriptor: 1, read: 1, other: 0, loops: 0 });
  assert.deepEqual(helperContainerUses("readMember"), { descriptor: 0, read: 1, other: 0, loops: 0 });
});

test("V-D1 creation, ingress, all recovery roots, complete and fail consume weighted evidence", () => {
  const s = setup(), root = Array(64).fill(undefined);
  const bad = root as never;
  const creation = refused(s.kernel.createExecution(s.who, createRequest({ creationKey: "bad", authorityContext: bad, initialInput: { kind: "application.message", payload: bad } })));
  assert.match(creation.reason, /authorityContext undefined_member \(56 additional occurrences/);
  assert.match(creation.reason, /initialInput.payload undefined_member \(56 additional occurrences/);
  const before = s.view();
  const ingress = refused(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "bad", kind: "application.message", payload: bad }));
  assert.match(ingress.reason, /56 additional occurrences/);
  assertOnlyRefusal(before, s.view(), ingress);
  const recovery = refused(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: { definitionRevisions: bad, runtimeContractRevisions: bad, progressCodecs: bad } }));
  assert.match(recovery.reason, /184 additional issues: undefined_member=184$/);
  for (const step of ["complete", "fail"] as const) {
    const proposal = outcomeFor(s.executionId, s.open, { progress: bad, next: step === "complete" ? { step, result: bad } : { step, error: bad } });
    const capture = captureOutcome(proposal, 256);
    assert.equal(total(capture.issues as ValueIssue[]), 128);
    assert.match(refused(s.kernel.submitOutcome(s.who, proposal, s.grant)).reason, /120 additional issues: undefined_member=120$/);
  }
});

test("V-D1 different root suffixes compose in global capture order", () => {
  const s = setup();
  const proposal = outcomeFor(s.executionId, s.open, {
    progress: [...Array(8).fill(undefined), NaN, Symbol(), NaN] as never,
    emissions: [{ emissionKey: "next-root", value: [Symbol(), undefined, NaN, ...Array(8).fill(undefined)] as never }],
    next: { step: "fail", error: Infinity },
  });
  const refusal = refused(s.kernel.submitOutcome(s.who, proposal, s.grant));
  assert.match(refusal.reason, /15 additional issues: non_finite_number=4, unsupported_form=2, undefined_member=9$/);
});
