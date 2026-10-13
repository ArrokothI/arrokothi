/**
 * K1.1-correction-03 review 01, KC3-R1-STOP-01: once a root stops, nothing more is observed.
 *
 * Provenance: review 01's `probe-stop-boundary.mjs` (Codex, `gpt-6-astra`, 2026-10-13). At H
 * `5f586b17`, a symbol diagnostic whose unit passed B stopped the root without telling `captureObject`,
 * which then listed the object's names anyway. The listing ran after the stop and its `1 + length` units
 * were never charged. Design 02 makes the stop a reported result that every caller returns on
 * (`values.ts`, `STOPPED`; static rules SC10/SC11 in `capture-metering.ts`). This file is its runtime half:
 *
 * - **The review's family at the real B.** A 193-element root of shared foreign rows leaves the meter at
 *   B + offset − 3 just before the target object `{ [symbol]: 1, k0…kN: 0 }`, whose visit costs 1, its
 *   symbols listing 2, its symbol diagnostic 1 and its names listing 1 + N. Each case counts the real
 *   listings: per call on the target, and Σ(1 + length) over every listing, which must equal the charged
 *   listing units exactly.
 * - **The same boundary through every root consumer**, with whole-state assertions. Each root keeps its own
 *   meter, so each of the eight eager Outcome roots reaches the target and stops on its diagnostic.
 * - **Every stop position of a declared set of shapes.** `captureWithWork`'s lower thresholds put the work
 *   stop on every unit, and the byte stop on every byte, of each shape. Every run must account exactly for
 *   its listings and descriptors, end with its stop issue, and agree with the unstopped run on every issue
 *   it did record. An observation after the stop shows up as an uncharged engine call.
 *
 * Expected values come from the unit table (`CAPTURE_WORK_BUDGET`), never from the implementation.
 * Timing is never asserted.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, test } from "node:test";

import { inWrappedChild, REPO_ROOT, type OperationCounts } from "./capture-instruments.ts";

const B = 3 * 1_048_576;

/**
 * Runs `body` in a fresh Node process in which only the two own-key listings are wrapped, before any
 * Kernel module loads: the review's family runs ~3 million units per root, so wrapping every observation
 * would cost more than the capture. `listing.units` sums 1 + length over every listing call;
 * `listing.targetNames` and `listing.targetSymbols` record the calls on `watched`.
 */
function inListingChild<T>(body: string): T {
  const url = (path: string): string => JSON.stringify(new URL(path, import.meta.url).href);
  const probe = `
const listing = { units: 0, targetNames: [], targetSymbols: 0 };
let watched = null;
const realNames = Object.getOwnPropertyNames;
const realSymbols = Object.getOwnPropertySymbols;
Object.getOwnPropertyNames = function (target) {
  const result = realNames(target);
  listing.units += 1 + result.length;
  if (target === watched) listing.targetNames.push(result.length);
  return result;
};
Object.getOwnPropertySymbols = function (target) {
  const result = realSymbols(target);
  listing.units += 1 + result.length;
  if (target === watched) listing.targetSymbols += 1;
  return result;
};
const values = await import(${url("../src/values.ts")});
const kernel = await import(${url("../src/index.ts")});
Object.getOwnPropertyNames = realNames;
Object.getOwnPropertySymbols = realSymbols;
const h = await import(${url("./harness.ts")});
const watch = (target) => { watched = target; listing.units = 0; listing.targetNames = []; listing.targetSymbols = 0; };
const B = values.CAPTURE_WORK_BUDGET;
const foreign = Object.create(Object.create(null));
const full = Array(4096).fill(foreign);
// Review 01's construction. The root's own units are 390; a full row of 4,096 foreign objects costs
// 4 per position + 4; the partial row of 3,805 costs 15,224; so the meter stands at B + offset - 3 when
// the target is visited. Each enclosing singleton array costs 6 and each extra row element 4; each empty
// object in place of a foreign one costs 1 more.
const fixture = ({ nameCount = 257, wrappers = 0, offset = 0, prototype = "plain", sharedRows = true } = {}) => {
  const last = Object.create(prototype === "null" ? null : Object.prototype);
  last[Symbol("refused symbol")] = 1;
  for (let index = 0; index < nameCount; index += 1) last["k" + index] = 0;
  const adjustment = 3 - 6 * wrappers + offset;
  const extraElements = Math.floor(adjustment / 4);
  const empties = adjustment - 4 * extraElements;
  const root = Array.from({ length: 191 }, () => (sharedRows ? full : Array(4096).fill(foreign)));
  const partial = Array(3805 + extraElements).fill(foreign);
  for (let index = 0; index < empties; index += 1) partial[index] = {};
  root.push(partial, last);
  let value = root;
  for (let index = 0; index < wrappers; index += 1) value = [value];
  return { value, last };
};
${body}`;
  const output = execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", probe], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 600_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(output.trim().split("\n").pop() as string) as T;
}

interface FamilyRow {
  readonly options: { offset?: number; nameCount?: number; wrappers?: number; prototype?: string; sharedRows?: boolean };
  readonly work: { units: number; listing: number; stop: string };
  readonly end: { crossing: string | null };
  readonly listingUnits: number;
  readonly targetNames: number[];
  readonly targetSymbols: number;
  readonly lastIssue: { path: string; code: string; occurrences?: number };
  readonly issueCount: number;
}

describe("KC3-R1-STOP-01 review 01's stop-boundary family at the real B", () => {
  const rows = inListingChild<FamilyRow[]>(`
    const out = [];
    for (const options of [
      ...[-2, -1, 0, 1, 2].map((offset) => ({ offset })),
      ...[0, 1, 4096, 65536].map((nameCount) => ({ nameCount })),
      ...[1, 15, 29].map((wrappers) => ({ wrappers })),
      { prototype: "null" },
      { sharedRows: false },
    ]) {
      const { value, last } = fixture(options);
      watch(last);
      const { result, work, end } = values.captureWithWork(value);
      out.push({ options, work, end, listingUnits: listing.units, targetNames: listing.targetNames, targetSymbols: listing.targetSymbols,
        lastIssue: result.ok ? null : result.issues[result.issues.length - 1], issueCount: result.ok ? 0 : result.issues.length });
    }
    console.log(JSON.stringify(out));
  `);

  test("every listing that ran was charged: Σ(1 + length) equals the listing units", () => {
    assert.equal(rows.length, 14);
    for (const row of rows) assert.equal(row.listingUnits, row.work.listing, JSON.stringify(row.options));
  });

  test("offset 0: the symbol diagnostic passes B and the names are never listed", () => {
    for (const row of rows.filter((candidate) => (candidate.options.offset ?? 0) === 0)) {
      const label = JSON.stringify(row.options);
      assert.equal(row.work.stop, "work", label);
      assert.equal(row.end.crossing, "diagnostic", label);
      assert.equal(row.work.units, B + 1, label);
      assert.deepEqual(row.targetNames, [], `${label}: no names listing after the stop`);
      assert.equal(row.targetSymbols, 1, label);
      assert.deepEqual(row.lastIssue, { path: "", code: "too_much_work", message: "additional occurrences (locations omitted)", occurrences: 1 }, label);
    }
    assert.equal(rows.filter((candidate) => (candidate.options.offset ?? 0) === 0).length, 10);
  });

  test("offsets -1 and -2: the names listing itself passes B, after it returns, and is charged", () => {
    for (const offset of [-1, -2]) {
      const row = rows.find((candidate) => candidate.options.offset === offset)!;
      // Before the target's visit: B + offset - 3. Visit 1, symbols 2, diagnostic 1, then names 1 + 257.
      assert.equal(row.work.units, B + offset - 3 + 1 + 2 + 1 + 258);
      assert.equal(row.end.crossing, "listing");
      assert.deepEqual(row.targetNames, [257]);
      assert.equal(row.targetSymbols, 1);
    }
  });

  test("offsets +1 and +2: the symbols listing passes B and the names are never listed", () => {
    for (const offset of [1, 2]) {
      const row = rows.find((candidate) => candidate.options.offset === offset)!;
      assert.equal(row.work.units, B + offset - 3 + 1 + 2);
      assert.equal(row.end.crossing, "listing");
      assert.deepEqual(row.targetNames, []);
      assert.equal(row.targetSymbols, 1);
    }
  });
});

interface ConsumerRow {
  readonly kind: string;
  readonly classification: string;
  readonly targetNames: number[];
  readonly targetSymbols: number;
  readonly unchanged: boolean;
  readonly refusalsKept: boolean;
}

describe("KC3-R1-STOP-01 the same boundary through every root consumer, each root on its own meter", () => {
  const consumers = inListingChild<ConsumerRow[]>(`
    const setup = () => {
      const who = h.caller("stop-review");
      const driver = h.recordingDriver();
      const coordinator = new kernel.ExecutionCoordinator({ driver });
      const { executionId } = h.accepted(coordinator.createExecution(who, h.createRequest()));
      const open = h.accepted(coordinator.dispatch(who, executionId, { bound: 1 }));
      return { who, coordinator, executionId, open, grant: h.submissionFor(driver, open.activationId) };
    };
    const out = [];
    for (const kind of ["canonicalize", "boundaryValueIssues", "isBoundaryValue", "creation-authority", "creation-input", "ingress",
      "recovery-definitionRevisions", "recovery-runtimeContractRevisions", "recovery-progressCodecs",
      "outcome-progress", "outcome-emission", "outcome-result", "outcome-error", "eager-eight"]) {
      const { value, last } = fixture();
      const s = setup();
      const before = h.accepted(s.coordinator.inspect(s.who, s.executionId));
      watch(last);
      let classification;
      if (kind === "canonicalize") classification = values.canonicalize(value).ok ? "accepted" : "refused";
      else if (kind === "boundaryValueIssues") classification = values.boundaryValueIssues(value).length > 0 ? "refused" : "accepted";
      else if (kind === "isBoundaryValue") classification = values.isBoundaryValue(value) ? "accepted" : "refused";
      else {
        let answer;
        if (kind === "creation-authority") answer = s.coordinator.createExecution(s.who, h.createRequest({ creationKey: "second", authorityContext: value }));
        else if (kind === "creation-input") answer = s.coordinator.createExecution(s.who, h.createRequest({ creationKey: "second", initialInput: { kind: "k", payload: value } }));
        else if (kind === "ingress") answer = s.coordinator.submitInput(s.who, { destination: s.executionId, requestKey: "input", kind: "k", payload: value });
        else if (kind.startsWith("recovery-")) {
          const available = { definitionRevisions: ["definition@1"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
          available[kind.slice("recovery-".length)] = value;
          answer = s.coordinator.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available });
        } else {
          const overrides = kind === "outcome-progress" ? { progress: value }
            : kind === "outcome-emission" ? { emissions: [{ emissionKey: "e", value }] }
            : kind === "outcome-result" ? { next: { step: "complete", result: value } }
            : kind === "outcome-error" ? { next: { step: "fail", error: value } }
            : { progress: value, emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: "e" + index, value })), next: { step: "complete", result: value } };
          const eager = kind === "eager-eight";
          answer = s.coordinator.submitOutcome(eager ? h.observer("visible") : s.who, h.outcomeFor(s.executionId, s.open, overrides), eager ? undefined : s.grant);
        }
        classification = h.refused(answer).classification;
      }
      const counted = { targetNames: listing.targetNames, targetSymbols: listing.targetSymbols };
      const after = h.accepted(s.coordinator.inspect(s.who, s.executionId));
      const { refusals: oldRefusals, ...oldView } = before;
      const { refusals: newRefusals, ...newView } = after;
      out.push({ kind, classification, ...counted,
        unchanged: JSON.stringify(newView) === JSON.stringify(oldView),
        refusalsKept: JSON.stringify(newRefusals.slice(0, oldRefusals.length)) === JSON.stringify(oldRefusals) });
    }
    console.log(JSON.stringify(out));
  `);

  const expected: Record<string, string> = {
    canonicalize: "refused",
    boundaryValueIssues: "refused",
    isBoundaryValue: "refused",
    "creation-authority": "malformed_value",
    "creation-input": "malformed_value",
    ingress: "malformed_value",
    "recovery-definitionRevisions": "malformed_value",
    "recovery-runtimeContractRevisions": "malformed_value",
    "recovery-progressCodecs": "malformed_value",
    "outcome-progress": "malformed_envelope",
    "outcome-emission": "malformed_envelope",
    "outcome-result": "malformed_envelope",
    "outcome-error": "malformed_envelope",
    "eager-eight": "unauthorized_submission",
  };

  test("all fourteen consumers ran", () => {
    assert.deepEqual(consumers.map((row) => row.kind), Object.keys(expected));
  });

  for (const kind of Object.keys(expected)) {
    test(`${kind}: refused, the target never listed after its stop, accepted state unchanged`, () => {
      const row = consumers.find((candidate) => candidate.kind === kind)!;
      const roots = kind === "eager-eight" ? 8 : 1;
      assert.equal(row.classification, expected[kind]);
      // Every root reaches the target with its own budget and stops on its symbol diagnostic.
      assert.equal(row.targetSymbols, roots, "one symbols listing per root");
      assert.deepEqual(row.targetNames, [], "no names listing after any root's stop");
      assert.ok(row.unchanged, "accepted state unchanged");
      assert.ok(row.refusalsKept, "earlier refusal records kept");
    });
  }
});

/** One run of the stop-position search, as the wrapped child reports it. */
interface SweepRun {
  readonly shape: string;
  readonly meter: "work" | "bytes";
  readonly threshold: number;
  readonly ok: boolean;
  readonly issues: readonly { path: string; code: string; message: string; occurrences?: number }[];
  readonly work: { units: number; visit: number; listing: number; element: number; descriptor: number; read: number; string: number; diagnostic: number; stop: string };
  readonly end: { bytes: number; crossing: string | null };
  readonly counts: OperationCounts;
  /** Descriptor observations of a genuine array's `length`, which belong to its visit. */
  readonly lengthTracked: number;
}

interface SweepShape {
  readonly shape: string;
  readonly reference: SweepRun;
  readonly runs: readonly SweepRun[];
  readonly exhaustive: { readonly work: boolean; readonly bytes: boolean };
}

/**
 * The declared search. A shape of at most 2,000 units is swept at every work budget from 0 to its full
 * cost, and one of at most 4,000 canonical bytes at every byte limit from 0 to its full size. A larger
 * meter is swept at thresholds 0–256, every 61st, and the last 256. Each run is one capture through
 * `captureWithWork` in a wrapped child whose caller objects are all tracked.
 */
const SHAPES = `
const shapes = [];
const add = (shape, make) => shapes.push([shape, make]);
const chain = (wrappers, leaf) => { let value = leaf; for (let level = 0; level < wrappers; level += 1) value = [value]; return value; };
const withNullPrototype = (entries) => Object.assign(Object.create(null), entries);
add("object with a symbol and names (review 01)", () => { const o = { k0: 0, k1: [1], k2: "v" }; o[Symbol("s")] = 1; return [o]; });
add("null-prototype object with a symbol and names", () => { const o = withNullPrototype({ k0: 0, k1: { a: 1 } }); o[Symbol("s")] = 1; return { inner: o, after: [1, 2] }; });
add("object with a non-enumerable member", () => ({ x: Object.defineProperty({ a: 1, b: [2] }, "h", { value: 3, enumerable: false }), y: 2 }));
add("object with accessor and undefined members", () => [{ a: 1, get g() { throw new Error("getter ran"); }, u: undefined, n: { x: [1, 2] } }, 3]);
add("refused and escaped member names", () => ({ ["\\ud800x"]: 1, ['"esc\\\\' + "\\n"]: [3], ok: "v", ["\\udc00"]: 4 }));
add("array with an extra name and a symbol", () => { const a = [0, [1, 2]]; a.x = 1; a[Symbol("s")] = 2; return [a, [3]]; });
add("array with holes, undefined and an accessor element", () => { const a = [1, , undefined, 4, [5]]; Object.defineProperty(a, 3, { get() { throw new Error("getter ran"); }, enumerable: true, configurable: true }); return [a, "z"]; });
add("strings", () => ["ok", "\\u00e9\\ud83d\\ude00", "\\ud800", "tab\\t\\"q\\"", "", { s: "\\udc00", t: "fine" }]);
add("refused scalars", () => [NaN, Infinity, -Infinity, Symbol("x"), () => 1, 10n, undefined, null, true]);
add("numbers", () => [0, -0, 1.5, 1e21, -1e-7, 2 ** 53, false]);
add("a cycle", () => { const a = [1]; const o = { a }; a.push(a, o, [a]); return a; });
add("too deep", () => chain(34, 0));
add("foreign objects, built-ins and Proxies", () => [Object.create({}), Object.setPrototypeOf(new Map([[1, 2]]), null), new Date(0), Object.setPrototypeOf(new Uint8Array(4), Object.prototype), new Proxy({}, {}), (() => { const r = Proxy.revocable([], {}); r.revoke(); return r.proxy; })(), { k: 1 }]);
add("mixed accepted and refused siblings at depth 3", () => [[[{ a: 1 }, NaN, [2, undefined], "x", (() => { const o = { b: 2 }; o[Symbol("t")] = 1; return o; })(), [[[]]], { c: [3, { d: "e" }] }]]]);
add("shared aliases", () => { const s = { a: [1, {}], b: "s" }; return [s, s, [s], { t: s, u: [s, s] }]; });
add("accepted document", () => ({ title: "Weekly report", week: 37, sections: ["hiring", "budget"], reviewer: null, nested: { a: [1, 2, { b: true }] } }));
add("empty containers", () => [[], {}, [[]], { a: {} }, withNullPrototype({})]);
add("wide mixed", () => Array.from({ length: 40 }, (_, index) => (index % 3 === 0 ? { k: index } : index % 3 === 1 ? [index] : "v" + index)));
add("over-named object", () => [Object.fromEntries(Array.from({ length: 4097 }, (_, index) => ["k" + index, index]))]);
add("over-named array", () => { const a = [0]; for (let index = 0; index < 4098; index += 1) a["x" + index] = 0; return [a, 1]; });
add("long string and long name", () => ["x".repeat(131073), { ["n".repeat(131073)]: 1 }, "y".repeat(70000)]);
`;

describe("KC3-R1-STOP-01 every stop position of the declared shapes accounts for every observation", () => {
  const swept = inWrappedChild<SweepShape[]>(`
    ${SHAPES}
    const windowListing = 2 + Object.getOwnPropertyNames(Array.prototype).length + Object.getOwnPropertyNames(Object.prototype).length;
    const { types: realTypes } = await import("node:util");
    const trackAll = (root) => {
      const seen = new Set();
      const stack = [root];
      while (stack.length > 0) {
        const value = stack.pop();
        if (value === null || (typeof value !== "object" && typeof value !== "function") || seen.has(value) || realTypes.isProxy(value)) continue;
        seen.add(value);
        track(value);
        for (const key of Reflect.ownKeys(value)) {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (descriptor !== undefined && "value" in descriptor) stack.push(descriptor.value);
        }
      }
    };
    const B = values.CAPTURE_WORK_BUDGET;
    const LIMIT = values.BOUNDARY_LIMITS.canonicalBytes;
    const run = (shape, value, meter, threshold) => {
      reset();
      const { result, work, end } = meter === "work" ? values.captureWithWork(value, threshold, LIMIT) : values.captureWithWork(value, B, threshold);
      return { shape, meter, threshold, ok: result.ok, issues: result.ok ? [] : result.issues, work, end, counts: snapshot(), lengthTracked: lengthDescriptors.tracked };
    };
    const thresholds = (full, exhaustive) => {
      if (exhaustive) return Array.from({ length: full + 1 }, (_, index) => index);
      const picked = new Set();
      for (let index = 0; index <= Math.min(256, full); index += 1) picked.add(index);
      for (let index = 0; index <= full; index += 61) picked.add(index);
      for (let index = Math.max(0, full - 256); index <= full; index += 1) picked.add(index);
      return [...picked].sort((a, b) => a - b);
    };
    const out = [];
    for (const [shape, make] of shapes) {
      const value = make();
      trackAll(value);
      const reference = run(shape, value, "work", B);
      const exhaustive = { work: reference.work.units <= 2000, bytes: reference.end.bytes <= 4000 };
      const runs = [];
      for (const threshold of thresholds(reference.work.units, exhaustive.work)) runs.push(run(shape, value, "work", threshold));
      for (const threshold of thresholds(reference.end.bytes, exhaustive.bytes)) runs.push(run(shape, value, "bytes", threshold));
      out.push({ shape, reference, runs, exhaustive, windowListing });
    }
    emit(out);
  `, { timeout: 600_000 }) as (SweepShape & { windowListing: number })[];

  test("the declared shapes were all swept, both meters, every position of the small ones", () => {
    assert.equal(swept.length, 21);
    for (const { shape, reference, runs, exhaustive } of swept) {
      assert.equal(reference.work.stop, "none", `${shape}: the reference run completes`);
      const work = runs.filter((run) => run.meter === "work").length;
      const bytes = runs.filter((run) => run.meter === "bytes").length;
      if (exhaustive.work) assert.equal(work, reference.work.units + 1, `${shape}: every work budget`);
      else assert.ok(work > 512, `${shape}: work budgets sampled`);
      if (exhaustive.bytes) assert.equal(bytes, reference.end.bytes + 1, `${shape}: every byte limit`);
      else assert.ok(bytes > 512, `${shape}: byte limits sampled`);
    }
    assert.equal(swept.filter((shape) => shape.exhaustive.work && shape.exhaustive.bytes).length, 18);
  });

  test("every listing that ran was charged, at every stop position", () => {
    for (const { shape, runs, windowListing } of swept) {
      for (const run of runs) {
        const listed = run.counts.names + run.counts.namesListed + run.counts.symbols + run.counts.symbolsListed;
        assert.equal(listed, run.work.listing + (run.ok ? windowListing : 0), `${shape} ${run.meter} ${run.threshold}: listings`);
      }
    }
  });

  test("every descriptor of a caller object was charged, at every stop position", () => {
    for (const { shape, runs } of swept) {
      for (const run of runs) {
        // A work stop on an element or descriptor unit counts that unit, and its descriptor is never taken.
        const crossed = run.work.stop === "work" && (run.end.crossing === "element" || run.end.crossing === "descriptor") ? 1 : 0;
        assert.equal(
          run.counts.descriptorTracked - run.lengthTracked,
          run.work.element + run.work.descriptor - crossed,
          `${shape} ${run.meter} ${run.threshold}: descriptors`,
        );
        assert.ok(run.counts.isProxy <= run.work.visit, `${shape} ${run.meter} ${run.threshold}: Proxy tests`);
        assert.ok(run.counts.prototypeTracked <= run.work.visit, `${shape} ${run.meter} ${run.threshold}: prototypes`);
      }
    }
  });

  test("a stopped run ends with its one stop issue, past its threshold, and recorded nothing the unstopped run did not", () => {
    for (const { shape, reference, runs } of swept) {
      const referenceDetails = reference.issues.filter((issue) => issue.occurrences === undefined);
      const referenceCounts = new Map<string, number>();
      for (const issue of reference.issues) referenceCounts.set(issue.code, (referenceCounts.get(issue.code) ?? 0) + (issue.occurrences ?? 1));
      for (const run of runs) {
        const label = `${shape} ${run.meter} ${run.threshold}`;
        const stopCode = run.work.stop === "work" ? "too_much_work" : run.work.stop === "bytes" ? "too_many_bytes" : undefined;
        if (run.meter === "work") assert.equal(run.work.stop === "work", run.work.units > run.threshold, `${label}: stops exactly when past the budget`);
        else assert.equal(run.work.stop === "bytes", run.end.bytes > run.threshold, `${label}: stops exactly when past the byte limit`);
        if (stopCode === undefined) {
          assert.deepEqual(run.issues, reference.issues, `${label}: an unstopped run is the reference run`);
          assert.deepEqual(run.work, reference.work, `${label}: and charges the same`);
          continue;
        }
        assert.equal(run.ok, false, label);
        const last = run.issues[run.issues.length - 1]!;
        assert.equal(last.code, stopCode, `${label}: the stop issue is last`);
        assert.equal(last.occurrences ?? 1, 1, `${label}: one stop issue`);
        assert.equal(run.issues.filter((issue) => issue.code === stopCode).length, 1, `${label}: one stop entry`);
        const details = run.issues.filter((issue) => issue.occurrences === undefined && issue.code !== stopCode);
        assert.deepEqual(details, referenceDetails.slice(0, details.length), `${label}: details are a prefix of the unstopped run's`);
        for (const issue of run.issues) {
          if (issue.code === stopCode) continue;
          const counted = run.issues.filter((other) => other.code === issue.code).reduce((sum, other) => sum + (other.occurrences ?? 1), 0);
          assert.ok(counted <= (referenceCounts.get(issue.code) ?? 0), `${label}: ${issue.code} counted no more than unstopped`);
        }
      }
    }
  });

  test("the meter and the engine operations only grow with the threshold", () => {
    const kinds = ["units", "visit", "listing", "element", "descriptor", "read", "string", "diagnostic"] as const;
    const operations = ["descriptor", "names", "namesListed", "symbols", "symbolsListed", "prototype", "isArray", "isProxy", "brand", "charCodeAt"] as const;
    for (const { shape, runs } of swept) {
      for (const meter of ["work", "bytes"] as const) {
        const ordered = runs.filter((run) => run.meter === meter && !run.ok);
        for (let index = 1; index < ordered.length; index += 1) {
          const before = ordered[index - 1]!;
          const after = ordered[index]!;
          const label = `${shape} ${meter} ${before.threshold}->${after.threshold}`;
          for (const kind of kinds) assert.ok(before.work[kind] <= after.work[kind], `${label}: ${kind}`);
          for (const operation of operations) assert.ok(before.counts[operation] <= after.counts[operation], `${label}: ${operation}`);
        }
      }
    }
  });
});
