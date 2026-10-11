/** Review 06: constructing a refusal never inspects caller properties for a type label. */
/*
 * K1.1-correction-03. Capture refuses every Proxy before observing it (owner decision-01 item 2), so a
 * Proxy can no longer count the Kernel's observations, throw from inside a structural observation, or
 * stand as the coherent value decisions 03/04 item 5 accepted (item 5 of each is superseded by
 * decision-01 item 2). Each converted test keeps a witness that its original Proxy is now refused with
 * zero trap calls, and keeps the production mechanism it protected exercised without a Proxy:
 * - a deep caller-built prototype chain whose terminal `constructor` getter counts every diagnostic
 *   [[Get]], on plain foreign objects and arrays and on the thrown value;
 * - `inWrappedChild` (capture-instruments.ts): the Kernel captures counting wrappers of its observation
 *   primordials, so a tracked plain object's observations are counted exactly, and a hook makes one
 *   observation throw (the catch path) or hand the Kernel a different descriptor (the descriptor/read
 *   and length disagreement checks, and decision-03's deep-prototype descriptor shape);
 * - `captureWithWork` meter counts, derived below from each shape and the unit table, never from a run.
 *
 * An ordinary [[Get]] of own data on a plain object runs no caller code and cannot be counted. Where the
 * original counted reads, a disagreement witness replaces the count: the own descriptor names one value
 * and the element holds another, so every position whose read happens is refused, and a position that
 * skipped its read would capture the descriptor's value instead.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { canonicalize, captureWithWork, type CaptureWork, type ValueIssue, type ValueIssueCode } from "../src/values.ts";
import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";
import { countingProxy, inWrappedChild, revokedCountingProxy, type OperationCounts } from "./capture-instruments.ts";

type Counts = { structural: number; diagnostic: number };
type Kind = "foreign object" | "foreign array" | "thrown object";

const PROXY_MESSAGE = "value is a Proxy; capture refuses every Proxy before observing it";
const threw = (label: string): string => `observing this value's structure threw (${label}), so it presents no readable content`;
const EXPECTED: Record<Kind, { readonly code: ValueIssueCode; readonly message: string }> = {
  "foreign object": { code: "unsupported_form", message: "expected a plain object, received object" },
  "foreign array": { code: "unsupported_form", message: "expected a plain array, received object" },
  "thrown object": { code: "unstable_representation", message: threw("object") },
};

function issuesOf(value: unknown): ValueIssue[] {
  const result = canonicalize(value);
  assert.equal(result.ok, false);
  if (result.ok) throw Error("expected refusal");
  return result.issues;
}

/** A terminal getter distinguishes even a single ordinary read through the entire deep chain. */
function chain(counts: Counts, depth: number): object {
  let tail: object = Object.create(null);
  Object.defineProperty(tail, "constructor", { get() { counts.diagnostic++; return { name: "CallerType" }; } });
  for (let index = 0; index < depth; index++) tail = Object.create(tail);
  return tail;
}

/** The chain with its getter proven live, and that fixture check excluded from the Kernel count. */
function liveChain(counts: Counts, depth: number): object {
  const prototype = chain(counts, depth);
  assert.equal(Reflect.get(prototype, "constructor").name, "CallerType");
  assert.equal(counts.diagnostic, 1);
  counts.diagnostic = 0;
  return prototype;
}

/**
 * The original fixture's Proxy, now a decision-01 item 2 witness: the trap it used to count or throw
 * from is wrapped by `countingProxy`, which counts every trap, and none may run.
 */
function proxyWitness(kind: Kind, depth = 10_000): { readonly value: object; readonly calls: () => number; readonly counts: Counts } {
  const counts = { structural: 0, diagnostic: 0 };
  const prototype = liveChain(counts, depth);
  if (kind === "thrown object") {
    const thrown: unknown = Object.create(prototype);
    const witness = countingProxy({}, { ownKeys() { counts.structural++; throw thrown; } });
    return { value: witness.proxy, calls: witness.calls, counts };
  }
  const target: object = kind === "foreign array" ? Object.setPrototypeOf([], prototype) : Object.create(prototype);
  const witness = countingProxy(target, { getPrototypeOf(value) { counts.structural++; return Reflect.getPrototypeOf(value); } });
  return { value: witness.proxy, calls: witness.calls, counts };
}

function assertWeighted(issues: readonly ValueIssue[] | null, count: number, code: ValueIssueCode, message: string): void {
  assert.ok(issues !== null, "expected a refusal");
  const details = Math.min(count, 8);
  assert.deepEqual(issues.slice(0, details), Array.from({ length: details }, (_, index) => ({ path: `[${index}]`, code, message })));
  assert.deepEqual(issues.slice(details), count > 8
    ? [{ path: "", code, message: "additional occurrences (locations omitted)", occurrences: count - 8 }]
    : []);
  assert.equal(issues.reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0), count);
}

/** A meter reading with every unit kind named, from its parts. */
function work(parts: Partial<Omit<CaptureWork, "units" | "stop">>, stop: CaptureWork["stop"] = "none"): CaptureWork {
  const visit = parts.visit ?? 0, listing = parts.listing ?? 0, element = parts.element ?? 0, descriptor = parts.descriptor ?? 0;
  const read = parts.read ?? 0, string = parts.string ?? 0, diagnostic = parts.diagnostic ?? 0;
  return { units: visit + listing + element + descriptor + read + string + diagnostic, visit, listing, element, descriptor, read, string, diagnostic, stop };
}

/**
 * A root array of `count` positions, each holding a value refused during its own visit with one issue:
 * the root's visit, its names listing (`count` indices and `length`: 1 + count + 1) and its empty symbols
 * listing (1); then per position one element, one visit and one diagnostic. A thrown observation is not
 * charged as a listing, because a listing is charged only after it returns.
 */
const refusedPositionsWork = (count: number): CaptureWork =>
  work({ visit: 1 + count, listing: (1 + count + 1) + 1, element: count, diagnostic: count });

// -- The wrapped-child probe library --------------------------------------------------------------

const HARNESS_URL = new URL("./harness.ts", import.meta.url).href;
const FIXTURE_URL = new URL("./refusal-diagnostics-fixture.ts", import.meta.url).href;

/**
 * Shared probe code, run after `inWrappedChild`'s prelude. `answer` routes the wrapped observations of
 * one tracked object to that object's own hook. `fixture` is the Proxy-free twin of the original
 * fixture: a foreign object or array on the deep chain whose one prototype observation is counted, or a
 * plain object whose own-symbols listing (its first listing) throws an ordinary object on the deep chain.
 * `rowFixture` is the Proxy-free twin of decisions 03/04's 4,096-position rows, every Kernel observation
 * of which is counted; `answerFor(key, real)` may hand the Kernel a different descriptor.
 */
const CHILD = `
const { default: assert } = await import("node:assert/strict");
const h = await import(${JSON.stringify(HARNESS_URL)});
const { assertOnlyRefusal } = await import(${JSON.stringify(FIXTURE_URL)});
const answer = { descriptor: new Map(), names: new Map(), symbols: new Map(), prototype: new Map() };
hooks.descriptor = (target, key, real) => answer.descriptor.has(target) ? answer.descriptor.get(target)(key, real) : real;
hooks.names = (target, real) => answer.names.has(target) ? answer.names.get(target)(real) : real;
hooks.symbols = (target, real) => answer.symbols.has(target) ? answer.symbols.get(target)(real) : real;
hooks.prototype = (target, real) => answer.prototype.has(target) ? answer.prototype.get(target)(real) : real;
const liveChain = (counts, depth) => {
  let tail = Object.create(null);
  Object.defineProperty(tail, "constructor", { get() { counts.diagnostic++; return { name: "CallerType" }; } });
  for (let index = 0; index < depth; index++) tail = Object.create(tail);
  assert.equal(Reflect.get(tail, "constructor").name, "CallerType");
  assert.equal(counts.diagnostic, 1);
  counts.diagnostic = 0;
  return tail;
};
const fixture = (kind, depth = 10000) => {
  const counts = { structural: 0, diagnostic: 0 };
  const prototype = liveChain(counts, depth);
  if (kind === "thrown object") {
    const thrown = Object.create(prototype);
    const value = track({});
    answer.symbols.set(value, () => { counts.structural++; throw thrown; });
    return { counts, value };
  }
  const value = track(kind === "foreign array" ? Object.setPrototypeOf([], prototype) : Object.create(prototype));
  answer.prototype.set(value, (real) => { counts.structural++; return real; });
  return { counts, value };
};
const setup = () => {
  const who = h.caller("diagnostic-work"), driver = h.recordingDriver(), coordinator = new kernel.ExecutionCoordinator({ driver });
  const { executionId } = h.accepted(coordinator.createExecution(who, h.createRequest()));
  const open = h.accepted(coordinator.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, coordinator, executionId, open, grant: h.submissionFor(driver, open.activationId), view: () => h.accepted(coordinator.inspect(who, executionId)) };
};
const ROW = 4096;
const deepDescriptors = (depth, value) => {
  let prototype = null;
  for (let index = 0; index < depth; index++) prototype = Object.create(prototype);
  return Array.from({ length: ROW }, () => Object.assign(Object.create(prototype), { value, writable: true, enumerable: true, configurable: true }));
};
const deepAnswer = (depth, value) => {
  const descriptors = deepDescriptors(depth, value);
  return (key, real) => key === "length" ? real : descriptors[Number(key)];
};
const disagreeingLength = (key, real) => key === "length" ? { value: ROW - 1, writable: true, enumerable: false, configurable: false } : real;
const rowFixture = (value, answerFor) => {
  const counts = { prototypes: 0, ownKeys: 0, lengthDescriptors: 0, descriptors: 0, unexpected: 0 };
  const positions = new Uint32Array(ROW);
  const target = track(Array(ROW).fill(value));
  answer.prototype.set(target, (real) => { counts.prototypes++; return real; });
  answer.names.set(target, (real) => { counts.ownKeys++; return real; });
  answer.symbols.set(target, (real) => { counts.ownKeys++; return real; });
  answer.descriptor.set(target, (key, real) => {
    if (key === "length") counts.lengthDescriptors++;
    else {
      const index = Number(key);
      if (Number.isInteger(index) && index >= 0 && index < ROW) { counts.descriptors++; positions[index]++; }
      else counts.unexpected++;
    }
    return answerFor === undefined ? real : answerFor(key, real);
  });
  return {
    target, root: Array(8).fill(target),
    observed: () => ({ ...counts, positionMin: Math.min(...positions), positionMax: Math.max(...positions) }),
  };
};
const run = (value) => {
  const { result, work } = values.captureWithWork(value);
  return { ok: result.ok, issues: result.ok ? null : result.issues, work };
};
`;

interface Captured {
  readonly ok: boolean;
  readonly issues: ValueIssue[] | null;
  readonly work: CaptureWork;
}

interface FixtureRow {
  readonly depth: number;
  readonly count: number;
  readonly issues: ValueIssue[] | null;
  readonly counts: Counts;
  readonly work: CaptureWork;
  readonly operations: OperationCounts;
}

for (const kind of ["foreign object", "foreign array", "thrown object"] as const) {
  test(`V-D1 ${kind}: deep prototype diagnostics do zero lookups before and after detail eight`, () => {
    // K1.1-correction-03: converted from a Proxy fixture counting getPrototypeOf or throwing a deep-chain object from ownKeys (owner decision-01 item 2; design-01 §7.2).
    // The original Proxy is now a refused witness; plain twins in a wrapped child keep the structural count, the throw and the diagnostic count.
    const witness = proxyWitness(kind);
    for (const count of [1, 8, 9, 4_096]) {
      assertWeighted(issuesOf(Array(count).fill(witness.value)), count, "unsupported_form", PROXY_MESSAGE);
      assert.deepEqual([witness.calls(), witness.counts.structural, witness.counts.diagnostic], [0, 0, 0], "a refused Proxy runs no trap");
    }

    const { code, message } = EXPECTED[kind];
    const rows = inWrappedChild<FixtureRow[]>(`${CHILD}
      const rows = [];
      for (const depth of [0, 1000, 10000]) {
        const f = fixture(${JSON.stringify(kind)}, depth);
        for (const count of [1, 8, 9, 4096]) {
          f.counts.structural = f.counts.diagnostic = 0;
          reset();
          const captured = run(Array(count).fill(f.value));
          rows.push({ depth, count, issues: captured.issues, counts: { ...f.counts }, work: captured.work, operations: snapshot() });
        }
      }
      emit(rows);
    `);
    assert.deepEqual(rows.map(row => [row.depth, row.count]), [0, 1_000, 10_000].flatMap(depth => [1, 8, 9, 4_096].map(count => [depth, count])));
    for (const row of rows) {
      assertWeighted(row.issues, row.count, code, message);
      assert.equal(row.counts.structural, row.count, "each position still gets its required structural observation");
      assert.equal(row.counts.diagnostic, 0, "no diagnostic [[Get]] can walk the caller-built chain");
      assert.deepEqual(row.work, refusedPositionsWork(row.count));
      // One prototype observation per position; a foreign value is never listed, and a throwing listing
      // is the thrown value's only listing. No descriptor of the value is ever requested.
      assert.equal(row.operations.prototypeTracked, row.count);
      assert.equal(row.operations.symbolsTracked, kind === "thrown object" ? row.count : 0);
      assert.equal(row.operations.namesTracked, 0);
      assert.equal(row.operations.descriptorTracked, 0);
    }
  });
}

/** Keys a type label could plausibly consult on a function, each guarded by a counting getter. */
const DIAGNOSTIC_KEYS: readonly PropertyKey[] = [
  "constructor", "name", "length", "message", "stack", "description", "toString", "valueOf", "then", "prototype",
  Symbol.toPrimitive, Symbol.toStringTag, Symbol.hasInstance,
];

/** A plain (non-Proxy) function whose every diagnostic key, own and inherited, is a throwing tripwire. */
function tripwireFunction(onRead: () => void): () => undefined {
  const fn = (): undefined => undefined;
  const inherited = Object.create(null) as object;
  for (const key of DIAGNOSTIC_KEYS) {
    const tripwire = { get() { onRead(); throw Error(`diagnostic property read: ${String(key)}`); }, configurable: true };
    Object.defineProperty(fn, key, tripwire);
    Object.defineProperty(inherited, key, tripwire);
  }
  Object.setPrototypeOf(fn, inherited);
  return fn;
}

test("V-D1 every unsupported primitive and plain function has a type-only label; callable and revoked function Proxies are refused untouched", () => {
  // K1.1-correction-03: converted from "V-D1 every unsupported primitive, including a revoked function Proxy, has a type-only label" (owner decision-01 item 2).
  // A callable Proxy is now refused as a Proxy before typeof decides "function", so a plain function full of tripwires exercises the label rule.
  let reads = 0;
  const fn = tripwireFunction(() => { reads++; });
  for (const key of DIAGNOSTIC_KEYS) assert.throws(() => Reflect.get(fn, key), /diagnostic property read/);
  assert.equal(reads, DIAGNOSTIC_KEYS.length, "every tripwire is live");
  reads = 0;
  for (const value of [undefined, 1n, Symbol("caller"), fn]) {
    assert.deepEqual(issuesOf(value), [{ path: "", code: "unsupported_form", message: `expected a boundary value, received ${typeof value}` }]);
  }
  assert.equal(reads, 0);
  // One visit and one diagnostic: the label costs nothing beyond its own issue.
  assert.deepEqual(captureWithWork(fn).work, work({ visit: 1, diagnostic: 1 }));

  const callable = countingProxy((): undefined => undefined, { get() { reads++; throw Error("diagnostic property read"); } });
  const revoked = revokedCountingProxy((): undefined => undefined);
  for (const witness of [callable, revoked]) {
    assert.equal(typeof witness.proxy, "function");
    assert.deepEqual(issuesOf(witness.proxy), [{ path: "", code: "unsupported_form", message: PROXY_MESSAGE }]);
    assert.equal(witness.calls(), 0);
  }
  assert.equal(reads, 0);
});

test("V-D1 own constructor, constructor.name, and thrown-value properties are never inspected", () => {
  // K1.1-correction-03: converted from a Proxy carrier whose ownKeys trap threw the probed value (owner decision-01 item 2; design-01 §7.2).
  // The carrier is a refused witness; the throw now comes from a wrapped own-symbols listing of a plain object.
  for (const property of ["constructor", "name", "message", "then", Symbol.toPrimitive] as const) {
    let reads = 0;
    const thrown = Object.create(null) as Record<PropertyKey, unknown>;
    if (property === "name") {
      const constructor = Object.create(null);
      Object.defineProperty(constructor, "name", { get() { reads++; throw Error("name read"); } });
      Object.defineProperty(thrown, "constructor", { value: constructor });
      assert.throws(() => Reflect.get(constructor, "name"), /name read/);
    } else {
      Object.defineProperty(thrown, property, { get() { reads++; throw Error("property read"); } });
      assert.throws(() => Reflect.get(thrown, property), /property read/);
    }
    assert.equal(reads, 1, "the diagnostic probe is live");
    reads = 0;
    // Both sites used to describe a caller object: a foreign prototype, and an observation throw.
    const foreign = Object.create({});
    for (const key of Reflect.ownKeys(thrown)) Object.defineProperty(foreign, key, Object.getOwnPropertyDescriptor(thrown, key)!);
    assert.equal(issuesOf(foreign)[0]?.message, "expected a plain object, received object");
    const throwing = countingProxy({}, { ownKeys() { throw thrown; } });
    assertWeighted(issuesOf(Array(17).fill(throwing.proxy)), 17, "unsupported_form", PROXY_MESSAGE);
    assert.equal(throwing.calls(), 0, "the original throwing carrier is refused before any trap");
    assert.equal(reads, 0);
  }
  const hugeName = "N".repeat(1_000_000);
  assert.equal(issuesOf(Object.create({ constructor: { name: hugeName } }))[0]?.message, "expected a plain object, received object");

  const rows = inWrappedChild<{ property: string; live: number; reads: number; structural: number; issues: ValueIssue[] | null; work: CaptureWork }[]>(`${CHILD}
    const rows = [];
    for (const property of ["constructor", "name", "message", "then", "toPrimitive"]) {
      let reads = 0;
      const thrown = Object.create(null);
      if (property === "name") {
        const constructor = Object.create(null);
        Object.defineProperty(constructor, "name", { get() { reads++; throw Error("name read"); } });
        Object.defineProperty(thrown, "constructor", { value: constructor });
        assert.throws(() => Reflect.get(constructor, "name"), /name read/);
      } else {
        const key = property === "toPrimitive" ? Symbol.toPrimitive : property;
        Object.defineProperty(thrown, key, { get() { reads++; throw Error("property read"); } });
        assert.throws(() => Reflect.get(thrown, key), /property read/);
      }
      const live = reads;
      reads = 0;
      let structural = 0;
      const carrier = track({});
      answer.symbols.set(carrier, () => { structural++; throw thrown; });
      const captured = run(Array(17).fill(carrier));
      rows.push({ property, live, reads, structural, issues: captured.issues, work: captured.work });
    }
    emit(rows);
  `);
  assert.deepEqual(rows.map(row => row.property), ["constructor", "name", "message", "then", "toPrimitive"]);
  for (const row of rows) {
    assert.equal(row.live, 1, "the diagnostic probe is live");
    assertWeighted(row.issues, 17, "unstable_representation", threw("object"));
    assert.equal(row.structural, 17, "each position's listing throws once");
    assert.equal(row.reads, 0);
    assert.deepEqual(row.work, refusedPositionsWork(17));
  }
});

test("V-D1 thrown null, arrays, functions and revoked objects need no diagnostic structural observation", () => {
  // K1.1-correction-03: converted from a Proxy carrier whose ownKeys trap threw each value (owner decision-01 item 2; design-01 §7.2).
  // The thrown revoked Proxies are thrown values, never captured: any structural observation of them in the catch path would throw out of the boundary.
  const rows = inWrappedChild<{ name: string; label: string; calls: number; issues: ValueIssue[] | null; work: CaptureWork; operations: OperationCounts }[]>(`${CHILD}
    const revokedObject = Proxy.revocable({}, {});
    revokedObject.revoke();
    const revokedFunction = Proxy.revocable(() => undefined, {});
    revokedFunction.revoke();
    const cases = [["null", null], ["array", []], ["bigint", 1n], ["symbol", Symbol()], ["revoked object", revokedObject.proxy], ["revoked function", revokedFunction.proxy]];
    const rows = [];
    for (const [name, thrown] of cases) {
      let calls = 0;
      const value = track({});
      answer.symbols.set(value, () => { calls++; throw thrown; });
      reset();
      const captured = run(Array(17).fill(value));
      rows.push({ name, label: thrown === null ? "null" : typeof thrown, calls, issues: captured.issues, work: captured.work, operations: snapshot() });
    }
    emit(rows);
  `);
  assert.deepEqual(rows.map(row => [row.name, row.label]), [
    ["null", "null"], ["array", "object"], ["bigint", "bigint"], ["symbol", "symbol"], ["revoked object", "object"], ["revoked function", "function"],
  ]);
  for (const row of rows) {
    assertWeighted(row.issues, 17, "unstable_representation", threw(row.label));
    assert.equal(row.calls, 17);
    assert.deepEqual(row.work, refusedPositionsWork(17));
    // Every object visit makes exactly one Proxy test, one IsArray and one prototype observation: the root
    // and its 17 positions. The catch path adds none, on the thrown value or the container.
    assert.equal(row.operations.isProxy, 18);
    assert.equal(row.operations.isArray, 18);
    assert.equal(row.operations.prototype, 18);
    assert.equal(row.operations.symbols, 18, "the root's listing and one throwing listing per position");
    assert.equal(row.operations.names, 1, "only the root's names are listed");
  }
});

function setup() {
  const who = caller("diagnostic-work"), driver = recordingDriver(), kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, kernel, executionId, open, grant: submissionFor(driver, open.activationId), view: () => accepted(kernel.inspect(who, executionId)) };
}

/** The eight eager roots of one Outcome, in capture order. */
const outcomeRoots = (step: "complete" | "fail"): string[] =>
  ["progress", ...Array.from({ length: 6 }, (_, index) => `emissions[${index}].value`), step === "complete" ? "next.result" : "next.error"];

interface OutcomeRow {
  readonly step: string;
  readonly arm: "hidden" | "none" | "grant" | "read witness";
  readonly classification: string;
  readonly reason: string;
  readonly descriptors: number;
  readonly structural: number;
  readonly diagnostic: number;
  readonly delivered: number;
}

for (const kind of ["foreign object", "thrown object"] as const) {
  test(`V-D1 ${kind}: eight eager Outcome roots preserve observations and whole refusal state`, () => {
    // K1.1-correction-03: converted from a Proxy root counting descriptors and reads over Proxy positions (owner decision-01 item 2; design-01 §7.2).
    // The original payload is a refused witness; the counts move to wrapped primordials on plain roots, and the read count to a disagreement witness.
    {
      const s = setup(), inner = proxyWitness(kind), root = countingProxy(Array(64).fill(inner.value));
      for (const step of ["complete", "fail"] as const) {
        const proposal = outcomeFor(s.executionId, s.open, {
          progress: root.proxy,
          emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: `e${index}`, value: root.proxy })),
          next: step === "complete" ? { step, result: root.proxy } : { step, error: root.proxy },
        });
        const beforeHidden = s.view();
        assert.equal(refused(s.kernel.submitOutcome(observer("hidden", "other-scope"), proposal, s.grant)).classification, "unknown_destination");
        assert.deepEqual(s.view(), beforeHidden);
        for (const grant of [undefined, s.grant]) {
          const before = s.view(), delivered = s.driver.seen.length;
          const result = refused(s.kernel.submitOutcome(observer("visible"), proposal, grant!));
          assert.equal(result.classification, grant ? "malformed_envelope" : "unauthorized_submission");
          if (grant) {
            assert.equal(result.reason, `Outcome for Activation ${s.open.activationId} refused whole: ${
              outcomeRoots(step).map(label => `${label} unsupported_form (${PROXY_MESSAGE})`).join("; ")}`);
          } else assert.doesNotMatch(result.reason, /unsupported_form|unstable_representation|additional issues/);
          assertOnlyRefusal(before, s.view(), result);
          assert.equal(s.driver.seen.length, delivered);
        }
      }
      assert.deepEqual([root.calls(), inner.calls(), inner.counts.structural, inner.counts.diagnostic], [0, 0, 0, 0]);
      accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
    }

    const rows = inWrappedChild<OutcomeRow[]>(`${CHILD}
      const s = setup(), f = fixture(${JSON.stringify(kind)});
      let descriptors = 0;
      const root = track(Array(64).fill(f.value));
      answer.descriptor.set(root, (key, real) => { if (key !== "length") descriptors++; return real; });
      const rows = [];
      const proposalOf = (value, step) => h.outcomeFor(s.executionId, s.open, {
        progress: value,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: "e" + index, value })),
        next: step === "complete" ? { step, result: value } : { step, error: value },
      });
      for (const step of ["complete", "fail"]) {
        const proposal = proposalOf(root, step);
        const beforeHidden = s.view();
        const hidden = h.refused(s.coordinator.submitOutcome(h.observer("hidden", "other-scope"), proposal, s.grant));
        assert.deepEqual(s.view(), beforeHidden);
        rows.push({ step, arm: "hidden", classification: hidden.classification, reason: hidden.reason, descriptors, structural: f.counts.structural, diagnostic: f.counts.diagnostic, delivered: 0 });
        for (const grant of [undefined, s.grant]) {
          const before = s.view(), delivered = s.driver.seen.length;
          const result = h.refused(s.coordinator.submitOutcome(h.observer("visible"), proposal, grant));
          assertOnlyRefusal(before, s.view(), result);
          rows.push({ step, arm: grant ? "grant" : "none", classification: result.classification, reason: result.reason, descriptors, structural: f.counts.structural, diagnostic: f.counts.diagnostic, delivered: s.driver.seen.length - delivered });
          descriptors = f.counts.structural = f.counts.diagnostic = 0;
        }
      }
      // Read witness: every position's own descriptor names the fixture value while its element is another
      // plain object, so each of the 8 x 64 positions is refused only if it is read and compared.
      const witnessRoot = track(Array(64).fill({}));
      answer.descriptor.set(witnessRoot, (key, real) => {
        if (key === "length") return real;
        descriptors++;
        return { value: f.value, writable: true, enumerable: true, configurable: true };
      });
      const before = s.view(), delivered = s.driver.seen.length;
      const witness = h.refused(s.coordinator.submitOutcome(h.observer("visible"), proposalOf(witnessRoot, "complete"), s.grant));
      assertOnlyRefusal(before, s.view(), witness);
      rows.push({ step: "complete", arm: "read witness", classification: witness.classification, reason: witness.reason, descriptors, structural: f.counts.structural, diagnostic: f.counts.diagnostic, delivered: s.driver.seen.length - delivered });
      h.accepted(s.coordinator.submitOutcome(s.who, h.outcomeFor(s.executionId, s.open), s.grant));
      emit(rows);
    `);
    const { code } = EXPECTED[kind];
    assert.deepEqual(rows.map(row => `${row.step}/${row.arm}`), [
      "complete/hidden", "complete/none", "complete/grant", "fail/hidden", "fail/none", "fail/grant", "complete/read witness",
    ]);
    for (const row of rows) {
      assert.equal(row.delivered, 0);
      assert.equal(row.diagnostic, 0);
      if (row.arm === "hidden") {
        assert.equal(row.classification, "unknown_destination");
        assert.equal(row.descriptors + row.structural, 0, "scope precedes all root observation");
      } else if (row.arm === "read witness") {
        assert.equal(row.classification, "malformed_envelope");
        assert.equal(row.descriptors, 8 * 64);
        assert.equal(row.structural, 0, "no descriptor value is captured in place of the read");
        assert.match(row.reason, /504 additional issues: unstable_representation=504$/);
      } else {
        assert.equal(row.classification, row.arm === "grant" ? "malformed_envelope" : "unauthorized_submission");
        assert.equal(row.descriptors, 8 * 64);
        assert.equal(row.structural, 8 * 64);
        if (row.arm === "grant") assert.match(row.reason, new RegExp(`504 additional issues: ${code}=504$`));
        else assert.doesNotMatch(row.reason, /unsupported_form|unstable_representation|additional issues/);
      }
    }
  });

  test(`V-D1 ${kind}: creation, ingress and recovery use the same zero-lookup diagnostics`, () => {
    // K1.1-correction-03: converted from Proxy positions counting getPrototypeOf or throwing from ownKeys (owner decision-01 item 2; design-01 §7.2).
    // The original payload is a refused witness; plain twins in a wrapped child keep the structural and diagnostic counts.
    {
      const s = setup(), witness = proxyWitness(kind), root = Array(64).fill(witness.value) as never;
      const beforeCreation = s.view(), deliveries = s.driver.seen.length;
      const creation = refused(s.kernel.createExecution(s.who, createRequest({
        creationKey: "refused-create", authorityContext: root,
        initialInput: { kind: "application.message", payload: root },
      })));
      assert.equal(creation.classification, "malformed_value");
      assert.equal(creation.executionId, null);
      assert.equal(creation.position, 0);
      assert.match(creation.reason, /authorityContext unsupported_form \(56 additional occurrences/);
      assert.match(creation.reason, /initialInput\.payload unsupported_form \(56 additional occurrences/);
      assert.deepEqual(s.view(), beforeCreation);
      assert.equal(accepted(s.kernel.createExecution(s.who, createRequest({ creationKey: "refused-create" }))).receipt.position, 1);
      const beforeIngress = s.view();
      const ingress = refused(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "refused-input", kind: "application.message", payload: root }));
      assert.equal(ingress.classification, "malformed_value");
      assert.match(ingress.reason, /unsupported_form \(56 additional occurrences/);
      assertOnlyRefusal(beforeIngress, s.view(), ingress);
      const beforeRecovery = s.view();
      const recovery = refused(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: {
        definitionRevisions: root, runtimeContractRevisions: root, progressCodecs: root,
      } }));
      assert.equal(recovery.classification, "malformed_value");
      assert.match(recovery.reason, /184 additional issues: unsupported_form=184$/);
      assertOnlyRefusal(beforeRecovery, s.view(), recovery);
      assert.equal(s.driver.seen.length, deliveries);
      accepted(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "refused-input", kind: "application.message", payload: null }));
      accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
      assert.deepEqual([witness.calls(), witness.counts.structural, witness.counts.diagnostic], [0, 0, 0]);
    }

    interface Step { classification: string; reason: string; structural: number; diagnostic: number }
    const out = inWrappedChild<{
      creation: Step & { executionId: string | null; position: number }; retryPosition: number; creationDeliveries: number;
      ingress: Step; recovery: Step; deliveries: number;
    }>(`${CHILD}
      const s = setup(), f = fixture(${JSON.stringify(kind)}), root = Array(64).fill(f.value);
      const out = {};
      const beforeCreation = s.view(), deliveries = s.driver.seen.length;
      const creation = h.refused(s.coordinator.createExecution(s.who, h.createRequest({
        creationKey: "refused-create", authorityContext: root,
        initialInput: { kind: "application.message", payload: root },
      })));
      out.creation = { classification: creation.classification, reason: creation.reason, executionId: creation.executionId, position: creation.position, structural: f.counts.structural, diagnostic: f.counts.diagnostic };
      assert.deepEqual(s.view(), beforeCreation);
      out.retryPosition = h.accepted(s.coordinator.createExecution(s.who, h.createRequest({ creationKey: "refused-create" }))).receipt.position;
      out.creationDeliveries = s.driver.seen.length - deliveries;

      f.counts.structural = 0;
      const beforeIngress = s.view();
      const ingress = h.refused(s.coordinator.submitInput(s.who, { destination: s.executionId, requestKey: "refused-input", kind: "application.message", payload: root }));
      assertOnlyRefusal(beforeIngress, s.view(), ingress);
      out.ingress = { classification: ingress.classification, reason: ingress.reason, structural: f.counts.structural, diagnostic: f.counts.diagnostic };

      f.counts.structural = 0;
      const beforeRecovery = s.view();
      const recovery = h.refused(s.coordinator.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: {
        definitionRevisions: root, runtimeContractRevisions: root, progressCodecs: root,
      } }));
      assertOnlyRefusal(beforeRecovery, s.view(), recovery);
      out.recovery = { classification: recovery.classification, reason: recovery.reason, structural: f.counts.structural, diagnostic: f.counts.diagnostic };
      out.deliveries = s.driver.seen.length - deliveries;
      h.accepted(s.coordinator.submitInput(s.who, { destination: s.executionId, requestKey: "refused-input", kind: "application.message", payload: null }));
      h.accepted(s.coordinator.submitOutcome(s.who, h.outcomeFor(s.executionId, s.open), s.grant));
      emit(out);
    `);
    const { code } = EXPECTED[kind];
    assert.equal(out.creation.classification, "malformed_value");
    assert.equal(out.creation.executionId, null);
    assert.equal(out.creation.position, 0);
    assert.match(out.creation.reason, new RegExp(`authorityContext ${code} \\(56 additional occurrences`));
    assert.match(out.creation.reason, new RegExp(`initialInput.payload ${code} \\(56 additional occurrences`));
    assert.equal(out.creation.structural, 2 * 64);
    assert.equal(out.creation.diagnostic, 0);
    assert.equal(out.retryPosition, 1, "the refused creation reserved no receipt or request identity");
    assert.equal(out.creationDeliveries, 0);

    assert.equal(out.ingress.classification, "malformed_value");
    assert.equal(out.ingress.structural, 64);
    assert.equal(out.ingress.diagnostic, 0);
    assert.match(out.ingress.reason, new RegExp(`${code} \\(56 additional occurrences`));

    assert.equal(out.recovery.classification, "malformed_value");
    assert.equal(out.recovery.structural, 3 * 64);
    assert.equal(out.recovery.diagnostic, 0);
    assert.match(out.recovery.reason, new RegExp(`184 additional issues: ${code}=184$`));
    assert.equal(out.deliveries, 0);
  });
}

// -- Decisions 03 and 04: item 5 (coherent Proxy acceptance) is superseded by decision-01 item 2 ------------

/**
 * Decision 03 condition 3: the descriptor is ordinary prebuilt data with a deep ordinary
 * prototype, exactly the shape in probe-descriptor-chain-04. The engine checks its absent
 * get/set fields internally. Those checks do not permit additional Kernel observations.
 *
 * K1.1-correction-03: this Proxy is now a refused witness (owner decision-01 item 2 supersedes decision-03
 * item 5): every trap it defines is counted, and none may run. The rows the probe measured are now plain
 * tracked arrays in a wrapped child (`rowFixture`), and the deep-prototype descriptor reaches the Kernel
 * directly through the wrapped descriptor primordial (`deepAnswer`).
 */
function descriptorFixture(depth: number, value: undefined | 0) {
  let prototype: object | null = null;
  for (let index = 0; index < depth; index++) prototype = Object.create(prototype);
  const descriptors: PropertyDescriptor[] = Array.from({ length: 4_096 }, () => Object.assign(Object.create(prototype), {
    value, writable: true, enumerable: true, configurable: true,
  }));
  const counts = { prototypes: 0, ownKeys: 0, lengthDescriptors: 0, lengthReads: 0, descriptors: 0, reads: 0 };
  const target = Array(4_096).fill(value) as (undefined | 0)[];
  const witness = countingProxy(target, {
    getPrototypeOf(holder) { counts.prototypes++; return Reflect.getPrototypeOf(holder); },
    ownKeys(holder) { counts.ownKeys++; return Reflect.ownKeys(holder); },
    getOwnPropertyDescriptor(holder, key) {
      if (key === "length") {
        counts.lengthDescriptors++;
        return Reflect.getOwnPropertyDescriptor(holder, key);
      }
      counts.descriptors++;
      return descriptors[Number(key)];
    },
    get(holder, key, receiver) {
      if (key === "length") counts.lengthReads++;
      else counts.reads++;
      return Reflect.get(holder, key, receiver);
    },
  });
  return { inner: witness.proxy, counts, calls: witness.calls, root: Array(8).fill(witness.proxy) };
}

/**
 * Decision 04's handler-chain probe: trap discovery walks ordinary handler prototypes, while
 * the descriptor returned by the trap is an ordinary engine-created descriptor. These traps
 * correspond one-to-one to Kernel-selected operations because the target itself is an ordinary
 * array; this fixture does not claim a general bound on engine-induced nested Proxy callbacks.
 *
 * K1.1-correction-03: now a refused witness (owner decision-01 item 2 supersedes decision-04 item 5).
 * The traps sit behind counting getters at the end of the handler chain, so even a trap lookup counts.
 */
const TRAP_NAMES = [
  "apply", "construct", "defineProperty", "deleteProperty", "get", "getOwnPropertyDescriptor", "getPrototypeOf",
  "has", "isExtensible", "ownKeys", "preventExtensions", "set", "setPrototypeOf",
] as const;

function handlerFixture(depth: number, value: undefined | 0) {
  const counts = { prototypes: 0, ownKeys: 0, lengthDescriptors: 0, lengthReads: 0, descriptors: 0, reads: 0, lookups: 0 };
  const target = Array(4_096).fill(value) as (undefined | 0)[];
  const traps: ProxyHandler<(undefined | 0)[]> = {
    getPrototypeOf(holder) { counts.prototypes++; return Reflect.getPrototypeOf(holder); },
    ownKeys(holder) { counts.ownKeys++; return Reflect.ownKeys(holder); },
    getOwnPropertyDescriptor(holder, key) {
      if (key === "length") counts.lengthDescriptors++;
      else counts.descriptors++;
      return Reflect.getOwnPropertyDescriptor(holder, key);
    },
    get(holder, key, receiver) {
      if (key === "length") counts.lengthReads++;
      else counts.reads++;
      return Reflect.get(holder, key, receiver);
    },
  };
  // Every trap name, defined or not, is looked up through a counting getter at the end of the chain.
  const terminal = Object.create(null) as ProxyHandler<(undefined | 0)[]>;
  for (const name of TRAP_NAMES) {
    Object.defineProperty(terminal, name, { get() { counts.lookups++; return traps[name]; } });
  }
  let handler = terminal;
  for (let index = 0; index < depth; index++) handler = Object.create(handler) as typeof handler;
  const inner = new Proxy(target, handler);
  const calls = (): number => Object.values(counts).reduce((sum, count) => sum + count, 0);
  return { inner, counts, calls, root: Array(8).fill(inner) };
}

type ProbeFixture = ReturnType<typeof descriptorFixture> | ReturnType<typeof handlerFixture>;

function assertUntouched(f: ProbeFixture): void {
  assert.equal(f.calls(), 0, "no trap ran and no trap was looked up");
  assert.ok(Object.values(f.counts).every(count => count === 0), `no observation reached the probe: ${JSON.stringify(f.counts)}`);
}

/** The probe rows after fifteen valid strings: seventeen refused Proxies, which charge no canonical bytes. */
const PROXY_ROWS_AFTER_PREFIX: ValueIssue[] = [
  ...Array.from({ length: 8 }, (_, index) => ({ path: `[${15 + index}]`, code: "unsupported_form" as const, message: PROXY_MESSAGE })),
  { path: "", code: "unsupported_form", message: "additional occurrences (locations omitted)", occurrences: 9 },
];

/** Eight positions of a root, each a refused Proxy (fewer than nine, so all of them are located). */
const eightProxies = (prefix: string): ValueIssue[] =>
  Array.from({ length: 8 }, (_, index) => ({ path: `${prefix}[${index}]`, code: "unsupported_form", message: PROXY_MESSAGE }));

interface RowObservation {
  readonly prototypes: number;
  readonly ownKeys: number;
  readonly lengthDescriptors: number;
  readonly descriptors: number;
  readonly unexpected: number;
  readonly positionMin: number;
  readonly positionMax: number;
}

/** Every tracked row's Kernel observations: `structuralRows` rows reached, `fullRows` of them read in full. */
function assertRowObservations(observed: RowObservation, fullRows: number, structuralRows = fullRows): void {
  assert.deepEqual(observed, {
    prototypes: structuralRows,
    ownKeys: 2 * structuralRows,
    lengthDescriptors: structuralRows,
    descriptors: 4_096 * fullRows,
    unexpected: 0,
    positionMin: fullRows,
    positionMax: fullRows,
  }, "one descriptor observation at every visited position, and one structure observation per row reached");
}

/**
 * The meter of a root of eight rows of 4,096 positions. Root: visit 1, names 1 + 9, symbols 1, 8 elements.
 * Each row: visit 1, names 1 + 4,097, symbols 1, 4,096 elements; then per position one diagnostic (a refused
 * position) or one visit (an accepted 0).
 */
function eightRowsWork(acceptedRows: boolean): CaptureWork {
  const positions = 8 * 4_096;
  return work({
    visit: 1 + 8 + (acceptedRows ? positions : 0),
    listing: (1 + 9) + 1 + 8 * ((1 + 4_097) + 1),
    element: 8 + positions,
    diagnostic: acceptedRows ? 0 : positions,
  });
}

/** Eight rows whose length descriptor disagrees with the length read: one visit and one diagnostic each. */
const LENGTH_WITNESS_WORK = work({ visit: 1 + 8, listing: (1 + 9) + 1, element: 8, diagnostic: 8 });

/**
 * The byte stop below: 15 strings of 65,536 units, then 17 rows. Root: visit 1, names 1 + 33, symbols 1;
 * root elements 15 + 16 (the 17th row's position is never observed). Strings: one visit and 65,536 string
 * units each. Rows 1–15: visit 1, names 1 + 4,097, symbols 1, 4,096 elements and 4,096 diagnostics. Row 16:
 * visit 1 and both listings, then its structure charge passes the byte limit. The stop issue is uncharged.
 */
const BYTE_STOP_WORK = work({
  visit: 1 + 15 + 16,
  listing: (1 + 33) + 1 + 16 * ((1 + 4_097) + 1),
  element: 15 + 16 + 15 * 4_096,
  string: 15 * 65_536,
  diagnostic: 15 * 4_096,
}, "bytes");

const UNDEFINED_ELEMENT = "array element is undefined; an array has no absent positions";
const DISAGREEING_MEMBER = "member is supplied differently by its own data descriptor and by ordinary property access, so it has no single content";
const UNSTABLE_LENGTH = "array length is not one stable own data property, so which positions exist cannot be established";

function assertRefusedRows(issues: ValueIssue[] | null, code: ValueIssueCode, message: string): void {
  assert.deepEqual(issues, [
    ...Array.from({ length: 8 }, (_, index) => ({ path: `[0][${index}]`, code, message })),
    { path: "", code, message: "additional occurrences (locations omitted)", occurrences: 32_760 },
  ]);
}

interface AcceptanceProbe {
  readonly invalid: Captured & { readonly observed: RowObservation };
  readonly coherent: {
    readonly ok: boolean; readonly canonicalBytes: number; readonly canonical: string; readonly value: unknown;
    readonly frozen: boolean; readonly afterMutation: unknown; readonly work: CaptureWork; readonly observed: RowObservation;
  };
  readonly readWitness: Captured & { readonly observed: RowObservation };
  readonly lengthWitness: Captured & { readonly observed: RowObservation };
}

/**
 * The plain-row acceptance probe: invalid rows (4,096 undefined), coherent rows (4,096 zeroes), a read
 * witness (each own descriptor says 1 while each element is 0) and a length witness (the own `length`
 * descriptor says 4,095 while the read says 4,096). `answerOf(value)` names the descriptor each row hands
 * the Kernel: engine-created (`undefined`) or decision-03's deep-prototype prebuilt data.
 */
function acceptanceProbe(answerOf: (value: string) => string): AcceptanceProbe {
  return inWrappedChild<AcceptanceProbe>(`${CHILD}
    const out = {};
    const invalid = rowFixture(undefined, ${answerOf("undefined")});
    out.invalid = { ...run(invalid.root), observed: invalid.observed() };
    const coherent = rowFixture(0, ${answerOf("0")});
    const { result, work } = values.captureWithWork(coherent.root);
    assert.equal(result.ok, true);
    const frozen = Object.isFrozen(result.value.value) && result.value.value.every(Object.isFrozen);
    const value = JSON.parse(JSON.stringify(result.value.value));
    coherent.target[0] = undefined;
    out.coherent = {
      ok: result.ok, canonicalBytes: result.value.canonicalBytes, canonical: result.value.canonical, value,
      frozen, afterMutation: result.value.value, work, observed: coherent.observed(),
    };
    const readWitness = rowFixture(0, ${answerOf("1")});
    out.readWitness = { ...run(readWitness.root), observed: readWitness.observed() };
    const lengthWitness = rowFixture(0, disagreeingLength);
    out.lengthWitness = { ...run(lengthWitness.root), observed: lengthWitness.observed() };
    emit(out);
  `);
}

function assertAcceptanceProbe(probe: AcceptanceProbe): void {
  assertRefusedRows(probe.invalid.issues, "undefined_member", UNDEFINED_ELEMENT);
  assertRowObservations(probe.invalid.observed, 8);
  assert.deepEqual(probe.invalid.work, eightRowsWork(false));

  const expected = Array.from({ length: 8 }, () => Array(4_096).fill(0));
  assert.equal(probe.coherent.ok, true, "a coherent plain value is accepted");
  // Every inner canonical array has 4,096 zeroes and 4,097 punctuation bytes. The outer
  // array adds nine punctuation bytes: 8 * 8,193 + 9 = 65,553, independently of the binding.
  assert.equal(probe.coherent.canonicalBytes, 65_553);
  assert.equal(probe.coherent.canonical, JSON.stringify(expected));
  assert.deepEqual(probe.coherent.value, expected);
  assert.equal(probe.coherent.frozen, true, "the snapshot and every row are frozen");
  assert.deepEqual(probe.coherent.afterMutation, expected, "accepted values stay detached from the caller");
  assertRowObservations(probe.coherent.observed, 8);
  assert.deepEqual(probe.coherent.work, eightRowsWork(true));

  // Replaces the read count: refused at every position only because every position is read once and
  // compared with its own descriptor; a skipped read would accept the descriptor's 1.
  assertRefusedRows(probe.readWitness.issues, "unstable_representation", DISAGREEING_MEMBER);
  assertRowObservations(probe.readWitness.observed, 8);
  assert.deepEqual(probe.readWitness.work, eightRowsWork(false));

  // Replaces the length-read count: each row's length is read once and compared before any listing.
  assert.deepEqual(probe.lengthWitness.issues, Array.from({ length: 8 }, (_, index) => ({ path: `[${index}]`, code: "unstable_representation", message: UNSTABLE_LENGTH })));
  assert.deepEqual(probe.lengthWitness.observed, { prototypes: 8, ownKeys: 0, lengthDescriptors: 8, descriptors: 0, unexpected: 0, positionMin: 0, positionMax: 0 });
  assert.deepEqual(probe.lengthWitness.work, LENGTH_WITNESS_WORK);
}

interface ByteStopProbe extends Captured {
  readonly observed: RowObservation;
}

/**
 * Fifteen valid strings use 15 * (65,536 + 2) canonical bytes. The 32-member outer array adds 33
 * punctuation bytes. Each refused inner array charges 4,097 punctuation bytes and no scalar bytes. Thus
 * exactly floor((1,048,576 - 983,103) / 4,097) = 15 complete inner rows fit; row16 stops after its
 * structure, and row17 is never observed.
 */
function byteStopProbe(answer: string): ByteStopProbe {
  return inWrappedChild<ByteStopProbe>(`${CHILD}
    const f = rowFixture(undefined, ${answer});
    const prefix = Array(15).fill("x".repeat(65536));
    emit({ ...run([...prefix, ...Array(17).fill(f.target)]), observed: f.observed() });
  `);
}

function assertByteStop(probe: ByteStopProbe): void {
  assertRowObservations(probe.observed, 15, 16);
  assert.ok(probe.issues !== null);
  assert.equal(probe.issues.length, 10);
  assert.deepEqual(probe.issues.slice(0, 8).map(issue => issue.path), Array.from({ length: 8 }, (_, index) => `[15][${index}]`));
  assert.deepEqual(probe.issues.slice(8), [
    { path: "", code: "undefined_member", message: "additional occurrences (locations omitted)", occurrences: 61_432 },
    { path: "", code: "too_many_bytes", message: "additional occurrences (locations omitted)", occurrences: 1 },
  ]);
  assert.equal(probe.issues.reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0), 61_441);
  // The meter stays far below B (3,145,728): the byte stop ends this root, as before.
  assert.deepEqual(probe.work, BYTE_STOP_WORK);
}

interface EagerRow {
  readonly roots: number;
  readonly arm: "none" | "grant" | "read witness" | "length witness";
  readonly classification: string;
  readonly reason: string;
  readonly observed: RowObservation;
  readonly delivered: number;
}

/**
 * One and eight eager Outcome roots, each a root of eight rows, with and without the current grant, plus a
 * read witness and a length witness per root count (each replaces a read count the Proxy probe kept). Every
 * arm checks the whole refusal state in the child.
 */
function eagerRootsProbe(answerOf: (value: string) => string): EagerRow[] {
  return inWrappedChild<EagerRow[]>(`${CHILD}
    const s = setup();
    const rows = [];
    const submit = (roots, arm, grant, f) => {
      const proposal = h.outcomeFor(s.executionId, s.open, roots === 1 ? { progress: f.root } : {
        progress: f.root,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: "rows-" + index, value: f.root })),
        next: { step: "complete", result: f.root },
      });
      const before = s.view(), delivered = s.driver.seen.length;
      const result = h.refused(s.coordinator.submitOutcome(h.observer("rows-observer"), proposal, grant));
      assertOnlyRefusal(before, s.view(), result);
      rows.push({ roots, arm, classification: result.classification, reason: result.reason, observed: f.observed(), delivered: s.driver.seen.length - delivered });
    };
    for (const roots of [1, 8]) {
      for (const grant of [undefined, s.grant]) submit(roots, grant ? "grant" : "none", grant, rowFixture(undefined, ${answerOf("undefined")}));
      submit(roots, "read witness", s.grant, rowFixture(0, ${answerOf("1")}));
      submit(roots, "length witness", s.grant, rowFixture(0, disagreeingLength));
    }
    h.accepted(s.coordinator.submitOutcome(s.who, h.outcomeFor(s.executionId, s.open), s.grant));
    emit(rows);
  `);
}

function assertEagerRoots(rows: readonly EagerRow[]): void {
  assert.deepEqual(rows.map(row => `${row.roots}/${row.arm}`), [
    "1/none", "1/grant", "1/read witness", "1/length witness", "8/none", "8/grant", "8/read witness", "8/length witness",
  ]);
  for (const row of rows) {
    assert.equal(row.classification, row.arm === "none" ? "unauthorized_submission" : "malformed_envelope");
    assert.equal(row.delivered, 0);
    if (row.arm === "length witness") {
      // Each row's length is read once and compared with its own descriptor, before any listing.
      const rowsReached = row.roots * 8;
      assert.deepEqual(row.observed, { prototypes: rowsReached, ownKeys: 0, lengthDescriptors: rowsReached, descriptors: 0, unexpected: 0, positionMin: 0, positionMax: 0 });
      if (row.roots === 1) {
        assert.equal(row.reason.split(`unstable_representation (${UNSTABLE_LENGTH})`).length - 1, 8);
        assert.doesNotMatch(row.reason, /additional issues/);
      } else assert.match(row.reason, /; 56 additional issues: unstable_representation=56$/);
      continue;
    }
    assertRowObservations(row.observed, row.roots * 8);
    const suffix = row.roots * 32_768 - 8;
    if (row.arm === "none") assert.doesNotMatch(row.reason, /undefined_member|unstable_representation|additional issues/);
    else {
      const code = row.arm === "grant" ? "undefined_member" : "unstable_representation";
      assert.match(row.reason, new RegExp(`${suffix} additional issues: ${code}=${suffix}$`));
    }
  }
}

/** The same eager-root schedule with the probe's Proxy rows: refused at each root position with no trap. */
function assertEagerProxyWitness(make: () => ProbeFixture): void {
  const s = setup();
  for (const roots of [1, 8]) {
    for (const grant of [undefined, s.grant]) {
      const f = make();
      const proposal = outcomeFor(s.executionId, s.open, roots === 1 ? { progress: f.root } : {
        progress: f.root,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: `rows-${index}`, value: f.root })),
        next: { step: "complete", result: f.root },
      });
      const before = s.view(), deliveries = s.driver.seen.length;
      const result = refused(s.kernel.submitOutcome(observer("rows-observer"), proposal, grant!));
      assert.equal(result.classification, grant ? "malformed_envelope" : "unauthorized_submission");
      assertUntouched(f);
      if (!grant) assert.doesNotMatch(result.reason, /unsupported_form|additional issues/);
      else if (roots === 1) {
        assert.equal(result.reason, `Outcome for Activation ${s.open.activationId} refused whole: ${
          Array.from({ length: 8 }, (_, index) => `progress[${index}] unsupported_form (${PROXY_MESSAGE})`).join("; ")}`);
      } else assert.match(result.reason, /; 56 additional issues: unsupported_form=56$/);
      assertOnlyRefusal(before, s.view(), result);
      assert.equal(s.driver.seen.length, deliveries);
    }
  }
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
}

const deepAnswer = (depth: number) => (value: string): string => `deepAnswer(${depth}, ${value})`;
const engineAnswer = (value: string): string =>
  value === "1" ? `(key, real) => key === "length" ? real : { value: 1, writable: true, enumerable: true, configurable: true }` : "undefined";

test("decision-03 descriptor probe (item 5 superseded by decision-01 item 2): the probe's Proxy is refused with zero traps; plain rows keep depth-independent bounded observations and exact acceptance", () => {
  // K1.1-correction-03: converted from "decision-03 descriptor probe: depth does not change bounded observations or coherent Proxy acceptance" (owner decision-01 item 2 supersedes decision-03 item 5).
  for (const depth of [0, 32]) {
    for (const value of [undefined, 0] as const) {
      const f = descriptorFixture(depth, value);
      assert.deepEqual(issuesOf(f.root), eightProxies(""));
      assertUntouched(f);
    }
    assertAcceptanceProbe(acceptanceProbe(deepAnswer(depth)));
  }
});

test("decision-03 descriptor probe (item 5 superseded by decision-01 item 2): the byte stop bounds observations before later rows", () => {
  // K1.1-correction-03: converted from "decision-03 descriptor probe: the byte stop bounds trap calls before later rows" (owner decision-01 item 2 supersedes decision-03 item 5).
  const f = descriptorFixture(32, undefined);
  const issues = issuesOf([...Array(15).fill("x".repeat(65_536)), ...Array(17).fill(f.inner)]);
  assertUntouched(f);
  // A refused Proxy charges no canonical bytes, so the seventeen are all examined and none reaches the limit.
  assert.deepEqual(issues, PROXY_ROWS_AFTER_PREFIX);
  assertByteStop(byteStopProbe("deepAnswer(32, undefined)"));
});

test("decision-03 descriptor probe (item 5 superseded by decision-01 item 2): one and eight eager roots keep bounded observations before authority", () => {
  // K1.1-correction-03: converted from "decision-03 descriptor probe: one and eight eager roots keep bounded calls before authority" (owner decision-01 item 2 supersedes decision-03 item 5).
  assertEagerProxyWitness(() => descriptorFixture(32, undefined));
  assertEagerRoots(eagerRootsProbe(deepAnswer(32)));
});

test("decision-03 ordinary objects and arrays retain zero diagnostic lookups without a Proxy exemption", () => {
  // K1.1-correction-03: converted from a Proxy carrier whose ownKeys trap threw the ordinary object (owner decision-01 item 2; design-01 §7.2).
  // The carrier is a refused witness; the throw now comes from a wrapped own-symbols listing of a plain object.
  for (const depth of [0, 10_000]) {
    const counts = { structural: 0, diagnostic: 0 };
    const prototype = liveChain(counts, depth);
    // These two values and the thrown value are ordinary non-Proxy objects.
    const ordinaryObject = Object.create(prototype);
    const ordinaryArray = Object.setPrototypeOf([], prototype);
    for (const [value, code, message] of [
      [ordinaryObject, "unsupported_form", "expected a plain object, received object"],
      [ordinaryArray, "unsupported_form", "expected a plain array, received object"],
    ] as const) {
      assertWeighted(issuesOf(Array(17).fill(value)), 17, code, message);
      assert.equal(counts.diagnostic, 0, "Kernel-chosen diagnostic reads remain forbidden on ordinary objects");
    }
    const carrier = countingProxy({}, { ownKeys() { counts.structural++; throw ordinaryObject; } });
    assertWeighted(issuesOf(Array(17).fill(carrier.proxy)), 17, "unsupported_form", PROXY_MESSAGE);
    assert.deepEqual([carrier.calls(), counts.structural, counts.diagnostic], [0, 0, 0]);
  }

  const rows = inWrappedChild<{ depth: number; issues: ValueIssue[] | null; counts: Counts; work: CaptureWork }[]>(`${CHILD}
    const rows = [];
    for (const depth of [0, 10000]) {
      const counts = { structural: 0, diagnostic: 0 };
      const ordinaryObject = Object.create(liveChain(counts, depth));
      const carrier = track({});
      answer.symbols.set(carrier, () => { counts.structural++; throw ordinaryObject; });
      const captured = run(Array(17).fill(carrier));
      rows.push({ depth, issues: captured.issues, counts: { ...counts }, work: captured.work });
    }
    emit(rows);
  `);
  assert.deepEqual(rows.map(row => row.depth), [0, 10_000]);
  for (const row of rows) {
    assertWeighted(row.issues, 17, "unstable_representation", threw("object"));
    assert.deepEqual(row.counts, { structural: 17, diagnostic: 0 }, "Kernel-chosen diagnostic reads remain forbidden on a thrown ordinary object");
    assert.deepEqual(row.work, refusedPositionsWork(17));
  }
});

test("decision-04 handler probe (item 5 superseded by decision-01 item 2): a handler-chain Proxy is refused with no trap lookup; plain rows keep Kernel-selected observations and exact acceptance", () => {
  // K1.1-correction-03: converted from "decision-04 handler probe: Kernel-selected observations and coherent acceptance do not depend on handler depth" (owner decision-01 item 2 supersedes decision-04 item 5).
  for (const depth of [0, 32]) {
    for (const value of [undefined, 0] as const) {
      const f = handlerFixture(depth, value);
      assert.deepEqual(issuesOf(f.root), eightProxies(""));
      assertUntouched(f);
    }
  }
  assertAcceptanceProbe(acceptanceProbe(engineAnswer));
});

test("decision-04 handler probe (item 5 superseded by decision-01 item 2): the byte stop bounds Kernel-selected observations", () => {
  // K1.1-correction-03: converted from "decision-04 handler probe: the byte stop bounds Kernel-selected observations" (owner decision-01 item 2 supersedes decision-04 item 5).
  for (const depth of [0, 32]) {
    const f = handlerFixture(depth, undefined);
    const issues = issuesOf([...Array(15).fill("x".repeat(65_536)), ...Array(17).fill(f.inner)]);
    assertUntouched(f);
    assert.deepEqual(issues, PROXY_ROWS_AFTER_PREFIX);
  }
  // This uses the independently derived budget in the descriptor-stop test: 983,103
  // bytes before the rows, then 4,097 bytes per row. Fifteen rows fit, the sixteenth
  // charges past the limit before any index read, and the seventeenth stays unobserved.
  assertByteStop(byteStopProbe("undefined"));
});

test("decision-04 handler probe (item 5 superseded by decision-01 item 2): eager roots preserve selected counts and whole state before authority", () => {
  // K1.1-correction-03: converted from "decision-04 handler probe: eager roots preserve selected counts and whole state before authority" (owner decision-01 item 2 supersedes decision-04 item 5).
  assertEagerProxyWitness(() => handlerFixture(32, undefined));
  assertEagerRoots(eagerRootsProbe(engineAnswer));
});

/** Count the Kernel's captured character primitive, independently of string storage or timing. */
function stringWorkChild(body: string): void {
  const prelude = `
    import assert from "node:assert/strict";
    const original = String.prototype.charCodeAt;
    let characterReads = 0, oversizedReads = 0;
    String.prototype.charCodeAt = function(index) {
      characterReads++;
      if (this.length > 131072) oversizedReads++;
      return Reflect.apply(original, this, [index]);
    };
    const { canonicalize } = await import(${JSON.stringify(new URL("../src/values.ts", import.meta.url).href)});
    const { ExecutionCoordinator } = await import(${JSON.stringify(new URL("../src/index.ts", import.meta.url).href)});
    const h = await import(${JSON.stringify(new URL("./harness.ts", import.meta.url).href)});
    const { assertOnlyRefusal } = await import(${JSON.stringify(new URL("./refusal-diagnostics-fixture.ts", import.meta.url).href)});
    String.prototype.charCodeAt = original;
    const measure = value => {
      characterReads = oversizedReads = 0;
      const result = canonicalize(value);
      return { result, reads: characterReads, oversized: oversizedReads };
    };
    const codes = result => result.ok ? [] : result.issues.map(issue => issue.code);
  `;
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "--eval", `${prelude}\n${body}`], {
    encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
  });
  assert.equal(run.error, undefined, String(run.error));
  assert.equal(run.signal, null, run.stderr);
  assert.equal(run.status, 0, run.stdout + run.stderr);
}

test("V-D1 UTF-16 preflight: scalar and 131072/131073-unit edges preserve exact accepted values", () => {
  stringWorkChild(`
    for (const [text, expectedReads] of [["x".repeat(65536), 65536], ["😀".repeat(65536), 131072]]) {
      const observed = measure(text);
      assert.equal(observed.result.ok, true);
      assert.equal(observed.result.value.value, text);
      assert.equal(observed.result.value.canonical, JSON.stringify(text));
      assert.equal(observed.reads, expectedReads, "the captured primitive is live on accepted strings");
    }
    const bmpOver = measure("x".repeat(65537));
    assert.deepEqual(codes(bmpOver.result), ["string_too_long"]);
    assert.equal(bmpOver.reads, 65536, "the bounded scalar scan still decides within the possible extent");
    const possibleExtent = measure("x".repeat(131072));
    assert.deepEqual(codes(possibleExtent.result), ["string_too_long"]);
    assert.equal(possibleExtent.reads, 65536);
    for (const text of ["😀".repeat(65536) + "x", "😀".repeat(65537)]) {
      const observed = measure(text);
      assert.deepEqual(codes(observed.result), ["string_too_long"]);
      assert.equal(observed.result.issues[0].message, "string cannot fit within the limit of 65536 Unicode scalar values");
      assert.equal(observed.reads, 0, "provably excessive extent is refused before the first character read");
    }
    const malformedEdge = measure("\\ud800" + "x".repeat(131071));
    assert.deepEqual(codes(malformedEdge.result), ["lone_surrogate"]);
    assert.equal(malformedEdge.reads, 2, "Unicode validation still applies at the possible extent");
    for (const text of ["\\ud800" + "x".repeat(131072), "\\udc00" + "x".repeat(16777216)]) {
      const observed = measure(text);
      assert.equal(codes(observed.result)[0], "string_too_long", "excessive extent takes precedence without reading malformed contents");
      assert.equal(observed.result.issues[0].message, "string cannot fit within the limit of 65536 Unicode scalar values");
      assert.equal(observed.reads, 0);
    }
  `);
});

test("V-D1 UTF-16 preflight: huge values and names do zero character reads and keep full byte charges", () => {
  stringWorkChild(`
    const huge = "x".repeat(16777216);
    for (const value of [huge, { [huge]: null }]) {
      const observed = measure(value);
      assert.deepEqual(codes(observed.result), ["string_too_long", "too_many_bytes"]);
      assert.equal(observed.reads, 0);
    }
    const stopped = measure([huge, undefined]);
    assert.deepEqual(codes(stopped.result), ["string_too_long", "too_many_bytes"]);
    assert.match(stopped.result.issues[1].message, /reaches at least 16777219 bytes/);
    assert.equal(stopped.oversized, 0);
    assert.equal(stopped.reads, 2, "only the two structural array-index spellings are read");
    const repeated = measure([...Array(6).fill("x".repeat(200000)), undefined]);
    assert.deepEqual(codes(repeated.result), [...Array(6).fill("string_too_long"), "too_many_bytes"]);
    assert.deepEqual(repeated.result.issues.slice(0, 6).map(issue => issue.path), ["[0]", "[1]", "[2]", "[3]", "[4]", "[5]"]);
    assert.match(repeated.result.issues[6].message, /reaches at least 1200008 bytes/);
    assert.equal(repeated.oversized, 0, "preflight preserves per-occurrence full-length charging");
    assert.equal(repeated.reads, 7, "only the seven structural array-index spellings are read");
    for (const key of ["x".repeat(65536), "😀".repeat(65536)]) {
      const observed = measure({ [key]: null });
      assert.equal(observed.result.ok, true);
      assert.deepEqual(observed.result.value.value, { [key]: null });
      assert.equal(observed.result.value.canonical, JSON.stringify({ [key]: null }));
    }
    const nameOver = measure({ ["😀".repeat(65536) + "x"]: null });
    assert.deepEqual(codes(nameOver.result), ["string_too_long"]);
    assert.equal(nameOver.result.issues[0].message, "member name cannot fit within the limit of 65536 Unicode scalar values");
    assert.equal(nameOver.reads, 0);
  `);
});

test("V-D1 UTF-16 preflight: creation, ingress and eager Outcome roots refuse without oversized character reads", () => {
  stringWorkChild(`
    const who = h.caller("string-preflight"), driver = h.recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
    const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    const grant = h.submissionFor(driver, open.activationId);
    const view = () => h.accepted(kernel.inspect(who, executionId));
    const huge = "x".repeat(16777216), deliveries = driver.seen.length;
    const beforeCreate = view();
    oversizedReads = 0;
    const creation = h.refused(kernel.createExecution(who, h.createRequest({
      creationKey: "preflight-retry", authorityContext: huge,
      initialInput: { kind: "application.message", payload: huge },
    })));
    assert.equal(creation.classification, "malformed_value");
    assert.equal(creation.executionId, null);
    assert.equal(oversizedReads, 0);
    assert.deepEqual(view(), beforeCreate);
    assert.equal(h.accepted(kernel.createExecution(who, h.createRequest({ creationKey: "preflight-retry" }))).receipt.position, 1);
    const beforeInput = view();
    oversizedReads = 0;
    const input = h.refused(kernel.submitInput(who, { destination: executionId, requestKey: "preflight-input", kind: "application.message", payload: huge }));
    assert.equal(input.classification, "malformed_value");
    assert.equal(oversizedReads, 0);
    assertOnlyRefusal(beforeInput, view(), input);
    h.accepted(kernel.submitInput(who, { destination: executionId, requestKey: "preflight-input", kind: "application.message", payload: null }));
    for (const authorization of [undefined, grant]) {
      const proposal = h.outcomeFor(executionId, open, {
        progress: huge,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: "s" + index, value: huge })),
        next: { step: "complete", result: huge },
      });
      const before = view();
      oversizedReads = 0;
      const refusal = h.refused(kernel.submitOutcome(h.observer("visible"), proposal, authorization));
      assert.equal(refusal.classification, authorization ? "malformed_envelope" : "unauthorized_submission");
      assert.equal(oversizedReads, 0, "every eager root uses the same bounded string observation");
      if (authorization) assert.match(refusal.reason, /8 additional issues: string_too_long=4, too_many_bytes=4$/);
      else assert.doesNotMatch(refusal.reason, /string_too_long|too_many_bytes/);
      assertOnlyRefusal(before, view(), refusal);
      assert.equal(driver.seen.length, deliveries);
    }
    h.accepted(kernel.submitOutcome(who, h.outcomeFor(executionId, open), grant));
  `);
});
