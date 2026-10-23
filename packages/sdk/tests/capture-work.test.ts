/**
 * K1.1-correction-03: the work meter, its budget B and its runtime cross-check.
 *
 * - KC3-1/KC3-5: each unit kind is pinned by an exact count on a shape whose units are derived by hand,
 *   so removing or weakening any charge changes a count here.
 * - KC3-2: B = 3 × the size limit; the costliest acceptances named in BASELINE are accepted with exact
 *   unit counts at or below B; one byte more is refused by the byte stop, not the meter.
 * - KC3-4 (K12C1-R8-VALUE-DEPTH-01): review 08's refused family charges the same per-position work at
 *   depths 2, 16 and 31, by meter counts and by wrapped engine-operation counts, and stops at B + 1; eight
 *   such SDK roots stop independently without a core call. Core byte authority witnesses are separate.
 * - KC3-1 runtime oracle: every wrapped engine operation is accounted for by the units charged, so an
 *   unmetered observation, a weakened charge or extra helper work shows up as a mismatch.
 *
 * Expected values are derived from the unit table in `values.ts` (`CAPTURE_WORK_BUDGET`):
 * visit 1; listing 1 + length; element 1; descriptor 1; read 1; string = length; diagnostic 1.
 * An accepted array of n ≥ 1 entries costs 2n + 4 of its own, an empty one 4; an object of n members
 * 3n + 3 plus its member-name lengths, an empty one 3; a scalar 1, a string 1 + its length.
 * Timing is never asserted.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ExecutionCoordinator } from "../../kernel/tests/binding-facade.ts";
import { BOUNDARY_LIMITS, CAPTURE_WORK_BUDGET, captureWithWork, type CaptureWork, type ValueIssue } from "../src/internal/value-capture.ts";
import { inWrappedChild, type OperationCounts } from "./capture-instruments.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "../../kernel/tests/harness.ts";
import { assertOnlyRefusal } from "../../kernel/tests/refusal-diagnostics-fixture.ts";

const B = 3 * BOUNDARY_LIMITS.canonicalBytes;
const work = (value: unknown): CaptureWork => captureWithWork(value).work;
const unitsOf = (value: unknown): number => work(value).units;
const total = (issues: readonly ValueIssue[]): number => issues.reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0);

/** `[[...[leaf]...]]` with `wrappers` singleton arrays. */
const chain = (wrappers: number, leaf: unknown): unknown => {
  let value = leaf;
  for (let level = 0; level < wrappers; level += 1) value = [value];
  return value;
};

describe("KC3-1/KC3-5 every unit kind is charged exactly", () => {
  const cases: [string, unknown, Partial<CaptureWork>][] = [
    ["null", null, { units: 1, visit: 1 }],
    ["true", true, { units: 1, visit: 1 }],
    ["a number", 12.5, { units: 1, visit: 1 }],
    ['"abc"', "abc", { units: 4, visit: 1, string: 3 }],
    ["[]", [], { units: 4, visit: 1, listing: 3 }],
    ["[0]", [0], { units: 7, visit: 2, listing: 4, element: 1 }],
    ["{}", {}, { units: 3, visit: 1, listing: 2 }],
    ['{"ab":1}', { ab: 1 }, { units: 9, visit: 2, listing: 3, descriptor: 1, read: 1, string: 2 }],
    // 2n + 4 for the array, 1 per element: [0,1,2] costs 10 + 3.
    ["[0,1,2]", [0, 1, 2], { units: 13, visit: 4, listing: 6, element: 3 }],
    // A refusal costs its visit and one diagnostic unit.
    ["NaN", Number.NaN, { units: 2, visit: 1, diagnostic: 1 }],
    ["a symbol", Symbol("s"), { units: 2, visit: 1, diagnostic: 1 }],
    ["a function", () => 1, { units: 2, visit: 1, diagnostic: 1 }],
    ["a Proxy", new Proxy({}, {}), { units: 2, visit: 1, diagnostic: 1 }],
    ["a foreign object", Object.create({}), { units: 2, visit: 1, diagnostic: 1 }],
    ["a re-prototyped Map", Object.setPrototypeOf(new Map(), null), { units: 2, visit: 1, diagnostic: 1 }],
    // Refused by length alone: no string units.
    ["an overlong string", "x".repeat(2 * BOUNDARY_LIMITS.stringScalarValues + 1), { units: 2, visit: 1, string: 0, diagnostic: 1 }],
    // Scanned in full (131,072 units charged first), then refused at the 65,537th scalar.
    ["a string of twice the scalar limit", "x".repeat(2 * BOUNDARY_LIMITS.stringScalarValues), { units: 1 + 131_072 + 1, visit: 1, string: 131_072, diagnostic: 1 }],
    // [undefined]: array 2·1 + 4 = 6 (the element unit included), then one diagnostic; no child visit.
    ["[undefined]", [undefined], { units: 7, visit: 1, listing: 4, element: 1, diagnostic: 1 }],
    // An array with an extra name: names ["0","length","x"] (1 + 3), symbols (1; listed and metered although
    // the extra name already refuses the array, packet review MS-02), one diagnostic, then the element and
    // its visit.
    ["[0] with an extra member", Object.assign([0], { x: 1 }), { units: 9, visit: 2, listing: 5, element: 1, diagnostic: 1 }],
    // An object with a non-enumerable member: symbols (1) + names (2) + descriptor (1) + diagnostic (1).
    ["{} with a non-enumerable member", Object.defineProperty({}, "h", { value: 1 }), { units: 6, visit: 1, listing: 3, descriptor: 1, diagnostic: 1 }],
    // An object with two symbol members: symbols (1 + 2) + diagnostic (1) + names (1).
    ["{} with two symbol members", { [Symbol("s")]: 1, [Symbol("t")]: 2 }, { units: 6, visit: 1, listing: 4, diagnostic: 1 }],
    // A cycle: the outer array 2·1 + 4 = 6, then the inner visit refuses as a cycle (visit + diagnostic).
    ["a cycle", (() => { const a: unknown[] = []; a.push(a); return a; })(), { units: 8, visit: 2, listing: 4, element: 1, diagnostic: 1 }],
  ];
  for (const [name, value, expected] of cases) {
    test(name, () => {
      const counted = work(value);
      for (const [key, count] of Object.entries(expected)) assert.equal(counted[key as keyof CaptureWork], count, `${name}: ${key}`);
      assert.equal(counted.units, counted.visit + counted.listing + counted.element + counted.descriptor + counted.read + counted.string + counted.diagnostic, "the kinds sum to the units");
    });
  }

  test("too deep: 32 singleton arrays then one more container", () => {
    // 32 arrays are entered (6 units each, the last one empty: 4); a 33rd container costs a visit and
    // a diagnostic. chain(33, []) has 34 containers: 32 entered wrappers then a refused wrapper.
    const counted = work(chain(33, []));
    assert.equal(counted.visit, 33);
    assert.equal(counted.units, 32 * 6 + 1 + 1);
    assert.equal(counted.diagnostic, 1);
  });
});

describe("KC3-2 B is derived from the limits and covers the costliest acceptances", () => {
  test("B is three units per canonical byte of the size limit", () => {
    assert.equal(CAPTURE_WORK_BUDGET, B);
    assert.equal(B, 3_145_728);
  });

  /** Root of `mids` full mid arrays of 4,096 chains plus one partial mid of `partial` chains. */
  const chains = (wrappers: number, leaf: unknown, mids: number, partial: number): unknown[] => {
    const one = chain(wrappers, leaf);
    const root: unknown[] = Array.from({ length: mids }, () => Array(4096).fill(one));
    root.push(Array(partial).fill(one));
    return root;
  };

  test("the costliest acceptance found: 30 singleton arrays around 0, 98.4% of B", () => {
    // A chain of 30 wrappers around 0 costs 30·6 + 1 = 181 units for 61 bytes; each chain also costs
    // 2 units in its mid array. Mid array of c chains: 2c + 4 own + 181c. Root of 5 mids: 2·5 + 4 own.
    const value = chains(30, 0, 4, 528);
    const expectedUnits = (2 * 5 + 4) + 4 * (2 * 4096 + 4 + 181 * 4096) + (2 * 528 + 4 + 181 * 528);
    const expectedBytes = (5 + 1) + 4 * (4096 + 1 + 61 * 4096) + (528 + 1 + 61 * 528);
    assert.equal(expectedUnits, 3_094_930);
    assert.equal(expectedBytes, 1_048_555);
    const { result, work: counted } = captureWithWork(value);
    assert.ok(result.ok, "accepted");
    assert.equal(result.value.canonicalBytes, expectedBytes);
    assert.equal(counted.units, expectedUnits);
    assert.equal(counted.stop, "none");
    assert.ok(counted.units <= B);
  });

  test("the empty-array-leaf variant: 29 wrappers around []", () => {
    // 29·6 + 4 = 178 units for 60 bytes per chain.
    const value = chains(29, [], 4, 805);
    const expectedUnits = (2 * 5 + 4) + 4 * (2 * 4096 + 4 + 178 * 4096) + (2 * 805 + 4 + 178 * 805);
    const expectedBytes = (5 + 1) + 4 * (4096 + 1 + 60 * 4096) + (805 + 1 + 60 * 805);
    assert.equal(expectedUnits, 3_094_054);
    const { result, work: counted } = captureWithWork(value);
    assert.ok(result.ok);
    assert.equal(result.value.canonicalBytes, expectedBytes);
    assert.equal(counted.units, expectedUnits);
  });

  test("other at-limit families stay well below B and are accepted", () => {
    const families: [string, unknown, number, number][] = [
      // 127 × [4,096 × 0]: inner 2·4096 + 4 + 4096 = 12,292; root 2·127 + 4 = 258.
      ["wide zeros", Array(127).fill(Array(4096).fill(0)), 258 + 127 * 12_292, 127 * (4096 + 4095 + 2) + 126 + 2],
      // 85 × [4,096 × {}]: inner 2·4096 + 4 + 4096·3; root 2·85 + 4.
      ["empty objects", Array(85).fill(Array.from({ length: 4096 }, () => ({}))), 174 + 85 * (8196 + 4096 * 3), 85 * (4096 * 2 + 4095 + 2) + 84 + 2],
      // 85 × [4,096 × []]: inner 2·4096 + 4 + 4096·4.
      ["empty arrays", Array(85).fill(Array.from({ length: 4096 }, () => [])), 174 + 85 * (8196 + 4096 * 4), 85 * (4096 * 2 + 4095 + 2) + 84 + 2],
      // 15 strings at the scalar limit: array 2·15 + 4, each string 1 + 65,536.
      ["strings at the scalar limit", Array(15).fill("a".repeat(65_536)), 34 + 15 * 65_537, 15 * 65_538 + 14 + 2],
      // One member whose name is at the scalar limit, values.md's 65,545-byte example.
      ["a member name at the scalar limit", { ["a".repeat(65_536)]: null }, 1 + 2 + 1 + 1 + 65_536 + 1 + 1, 65_545],
    ];
    for (const [name, value, units, bytes] of families) {
      const { result, work: counted } = captureWithWork(value);
      assert.ok(result.ok, `${name} is accepted`);
      assert.equal(result.value.canonicalBytes, bytes, `${name}: bytes`);
      assert.equal(counted.units, units, `${name}: units`);
      assert.ok(counted.units <= B, `${name} within B`);
    }
  });

  test("one byte past the size limit is refused by the byte stop, not the meter", () => {
    // The costliest witness plus 22 more canonical bytes: a 19-character string (21 bytes with its quotes)
    // and its comma push it to 1,048,577.
    const value = chains(30, 0, 4, 528);
    value.push("x".repeat(1_048_576 - 1_048_555 - 2));
    const { result, work: counted } = captureWithWork(value);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(result.issues.map((issue) => issue.code), ["too_many_bytes"]);
    assert.equal(counted.stop, "bytes");
    assert.ok(counted.units <= B);
  });

  test("a meter stop before any other issue is one root-located detail (packet review BM-01)", () => {
    // The costliest witness plus a 60,000-unit string: the root's one more element costs 2 units (a
    // listed name and an element), the string's visit 1, and its 60,000 string units are charged before
    // its scan and before its bytes, so the meter passes B with no other issue recorded.
    const value: unknown[] = chains(30, 0, 4, 528);
    value.push("x".repeat(60_000));
    const { result, work: counted } = captureWithWork(value);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.deepEqual(result.issues, [{
      path: "",
      code: "too_much_work",
      message: "reading this value passed the work budget of 3145728 units that bounds every acceptable value; the rest of the value was not read",
    }]);
    assert.equal(counted.stop, "work");
    assert.equal(counted.units, 3_094_930 + 2 + 1 + 60_000);
    assert.equal(counted.string, 60_000);
  });
});

/**
 * Review 08's family: 256 references to one row of 4,096 distinct objects whose prototype is a foreign
 * null-prototype object, inside `depth - 2` enclosing singleton arrays (depth counts the 256-array as 1
 * and the row as 2 when there are no wrappers).
 */
const depthFamily = (depth: number, rows = 256, width = 4096): unknown => {
  const foreign = Object.create(null) as object;
  const row = Array.from({ length: width }, () => Object.create(foreign) as object);
  return chain(depth - 2, Array(rows).fill(row));
};

/** The meter's derived stopping point for `depthFamily(depth)`, from the unit table. */
const derivedStop = (depth: number): { positions: number; units: number } => {
  const wrappers = (depth - 2) * 6;
  const top = 1 + (1 + 257) + 1; // the 256-array: visit, names (256 indices + length), symbols
  const row = 1 + 1 + (1 + 4097) + 1; // element in the 256-array, visit, names, symbols
  const perPosition = 3; // element, visit, diagnostic
  let units = wrappers + top;
  let positions = 0;
  const rowCost = row + perPosition * 4096;
  const fullRows = Math.floor((B - units) / rowCost);
  units += fullRows * rowCost;
  positions += fullRows * 4096;
  units += row;
  const more = Math.floor((B - units) / perPosition);
  units += more * perPosition;
  positions += more;
  // The next position: its element unit fits (units ≤ B) and its visit passes B.
  return { positions, units: B + 1 };
};

describe("KC3-4 K12C1-R8-VALUE-DEPTH-01: per-position work does not depend on nesting depth", () => {
  for (const depth of [2, 16, 31]) {
    test(`depth ${depth}: refused at the meter after the derived number of positions`, () => {
      const { result, work: counted } = captureWithWork(depthFamily(depth));
      const expected = derivedStop(depth);
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(counted.stop, "work");
      assert.equal(counted.units, expected.units);
      assert.equal(counted.diagnostic, expected.positions, "one diagnostic unit per refused position");
      const prefix = depth === 2 ? "" : "[0]".repeat(depth - 2);
      assert.deepEqual(
        result.issues.slice(0, 8),
        Array.from({ length: 8 }, (_, index) => ({ path: `${prefix}[0][${index}]`, code: "unsupported_form", message: "expected a plain object, received object" })),
      );
      assert.deepEqual(result.issues.slice(8), [
        { path: "", code: "unsupported_form", message: "additional occurrences (locations omitted)", occurrences: expected.positions - 8 },
        { path: "", code: "too_much_work", message: "additional occurrences (locations omitted)", occurrences: 1 },
      ]);
      assert.equal(total(result.issues), expected.positions + 1);
    });
  }

  test("wrapped engine operations per refused position are the same at depths 2, 16 and 31", () => {
    // Sixteen rows (65,536 refused positions) stay below B, so every depth examines every position;
    // each extra enclosing array adds exactly one wrapper's operations, never one per position.
    const observed = inWrappedChild<Record<string, { counts: OperationCounts; work: CaptureWork }>>(`
      const out = {};
      for (const depth of [2, 16, 31]) {
        const foreign = Object.create(null);
        const row = Array.from({ length: 4096 }, () => track(Object.create(foreign)));
        let value = Array(16).fill(row);
        for (let level = 2; level < depth; level += 1) value = [value];
        reset();
        const { work } = values.captureWithWork(value);
        out[depth] = { counts: snapshot(), work };
      }
      emit(out);
    `);
    const base = observed[2]!;
    // One singleton wrapper: a visit (Proxy test, cycle has/add/delete, IsArray, prototype, length
    // descriptor), its names listing of ["0","length"], its symbols listing, and one element descriptor;
    // `arrayIndexValue("0")` reads one character. 6 units.
    const wrapper: Partial<OperationCounts> = {
      isProxy: 1, setHas: 1, setAdd: 1, setDelete: 1, isArray: 1, prototype: 1,
      descriptor: 2, names: 1, namesListed: 2, symbols: 1, symbolsListed: 0, charCodeAt: 1, brand: 0,
      prototypeTracked: 0, descriptorTracked: 0,
    };
    for (const depth of [16, 31]) {
      const at = observed[depth]!;
      assert.equal(at.work.units - base.work.units, 6 * (depth - 2), `units at depth ${depth}`);
      assert.equal(at.work.diagnostic, base.work.diagnostic);
      assert.equal(at.work.diagnostic, 16 * 4096);
      for (const [key, perLevel] of Object.entries(wrapper)) {
        const field = key as keyof OperationCounts;
        assert.equal((at.counts[field] as number) - (base.counts[field] as number), (perLevel as number) * (depth - 2), `${key} at depth ${depth}`);
      }
    }
    // Each refused position: exactly one prototype observation of the tracked object.
    assert.equal(base.counts.prototypeTracked, 16 * 4096);
  });

  test("a stop on a position's diagnostic unit leaves that one examined position uncounted (packet review BM-05)", () => {
    // 255 rows: the top array costs 1 + (1 + 256) + 1 = 259 units, so the meter's remainder lands on a
    // diagnostic unit. That position was visited and classified foreign; the stop records too_much_work
    // instead of its unsupported_form, so the diagnostic units exceed the counted occurrences by one.
    const foreign = Object.create(null) as object;
    const row = Array.from({ length: 4096 }, () => Object.create(foreign) as object);
    const { result, work: counted } = captureWithWork(Array(255).fill(row));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(counted.stop, "work");
    assert.equal(counted.units, B + 1);
    assert.equal(counted.diagnostic, 786_026);
    assert.equal(total(result.issues.filter((issue) => issue.code === "unsupported_form")), 786_025);
    assert.equal(total(result.issues.filter((issue) => issue.code === "too_much_work")), 1);
  });

  test("each of the eight eager Outcome roots does the work of one direct capture, no more (packet review BM-03)", () => {
    // In one wrapped child: a direct capture of review 08's family (depth 2) stops at B + 1, and the
    // eight independent SDK captures runs the Proxy test exactly eight times as
    // often (every value of this family is an object, so the Proxy test runs once per completed visit),
    // over the same eight captures of a small refused value (one foreign
    // object in an array), measured the same way.
    const observed = inWrappedChild<{ direct: { units: number; stop: string; isProxy: number; prototype: number }; small: { isProxy: number; prototype: number }; outcome: { acceptedRoots: number; isProxy: number; prototype: number }; control: { acceptedRoots: number; isProxy: number; prototype: number } }>(`
      const h = await import(${JSON.stringify(new URL("../../kernel/tests/harness.ts", import.meta.url).href)});
      const foreign = Object.create(null);
      const row = Array.from({ length: 4096 }, () => Object.create(foreign));
      const root = Array(256).fill(row);
      const small = [Object.create(foreign)];
      reset();
      const direct = values.captureWithWork(root);
      const directCounts = snapshot();
      reset();
      values.captureWithWork(small);
      const smallCounts = snapshot();
      const submit = (value) => {
        reset();
        let acceptedRoots = 0;
        for (let root = 0; root < 8; root++) if (values.canonicalize(value).ok) acceptedRoots++;
        const counted = snapshot();
        return { acceptedRoots, isProxy: counted.isProxy, prototype: counted.prototype };
      };
      emit({
        direct: { units: direct.work.units, stop: direct.work.stop, isProxy: directCounts.isProxy, prototype: directCounts.prototype },
        small: { isProxy: smallCounts.isProxy, prototype: smallCounts.prototype },
        control: submit(small),
        outcome: submit(root),
      });
    `, { timeout: 600_000 });
    assert.equal(observed.direct.stop, "work");
    assert.equal(observed.direct.units, B + 1);
    assert.equal(observed.control.acceptedRoots, 0);
    assert.equal(observed.outcome.acceptedRoots, 0);
    assert.equal(observed.outcome.isProxy - observed.control.isProxy, 8 * (observed.direct.isProxy - observed.small.isProxy));
    assert.equal(observed.outcome.prototype - observed.control.prototype, 8 * (observed.direct.prototype - observed.small.prototype));
  });

  test("eight wrapper roots each stop at their own budget before any core call", () => {
    const root = depthFamily(31);
    let coreCalls = 0;
    for (let index = 0; index < 8; index++) {
      const { result, work: counted } = captureWithWork(root);
      if (result.ok) coreCalls++;
      assert.equal(result.ok, false);
      assert.equal(counted.stop, "work");
      assert.equal(counted.units, B + 1);
      if (!result.ok) assert.equal(result.issues.at(-1)?.code, "too_much_work");
    }
    assert.equal(coreCalls, 0);
  });
});

describe("KC3-1 runtime oracle: wrapped engine operations are accounted for by the units charged", () => {
  test("every shape of the maintained corpus", () => {
    const observed = inWrappedChild<{ name: string; counts: OperationCounts; work: CaptureWork; ok: boolean; windowListing: number; window: OperationCounts }[]>(`
      const shapes = [];
      const add = (name, make) => shapes.push([name, make]);
      add("costliest-chain-sample", () => { let v = 0; for (let i = 0; i < 30; i += 1) v = [v]; return Array(64).fill(v); });
      add("P5 130 x [4096 x undefined]", () => Array(130).fill(Array(4096).fill(undefined)));
      add("review-08 family depth 31, 16 rows", () => { const f = Object.create(null); const row = Array.from({ length: 4096 }, () => Object.create(f)); let v = Array(16).fill(row); for (let i = 2; i < 31; i += 1) v = [v]; return v; });
      add("N15 256 extra names x 4096", () => { const a = []; for (let i = 0; i < 256; i += 1) a["x" + i] = 0; return Array(4096).fill(a); });
      add("over-named object 20,000", () => Object.fromEntries(Array.from({ length: 20000 }, (_, i) => ["k" + i, i])));
      add("strings and names", () => ({ ["n".repeat(1000)]: "v".repeat(5000), b: ["x".repeat(65536), "\\ud800"] }));
      add("mixed refusals", () => [undefined, NaN, Symbol(), () => 1, new Map(), Object.setPrototypeOf(new Date(), null), new Proxy({}, {}), { get a() { return 1; } }]);
      add("accepted plain document", () => ({ title: "Weekly report", week: 37, sections: ["hiring", "budget"], reviewer: null, nested: { a: [1, 2, { b: true }] } }));
      add("cycles", () => { const a = []; const o = { a }; a.push(o, o, a); return Array(4096).fill(a); });
      // The serializer window (encode, outside the meter) lists the own names of Array.prototype and
      // Object.prototype once per accepted root, to find index-named shadows.
      const windowListing = 2 + Object.getOwnPropertyNames(Array.prototype).length + Object.getOwnPropertyNames(Object.prototype).length;
      // The window's other constant work per accepted root (prototype-link saves and restores, slot
      // descriptors), measured on the smallest accepted root, whose capture is one visit.
      reset();
      values.captureWithWork(null);
      const window = snapshot();
      // Track every non-Proxy object of a shape, so observations of caller objects are counted apart
      // from the Kernel's own lists. The walk runs before capture, with the globals restored.
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
      const out = [];
      for (const [name, make] of shapes) {
        const value = make();
        trackAll(value);
        reset();
        const { result, work } = values.captureWithWork(value);
        out.push({ name, counts: snapshot(), work, ok: result.ok, windowListing, window });
      }
      emit(out);
    `);
    assert.equal(observed.length, 9);
    for (const { name, counts, work: w, ok, windowListing, window } of observed) {
      // Every listing call and every listed name is charged: equality, not a bound. An accepted root
      // adds exactly the serializer window's two prototype listings.
      assert.equal(counts.names + counts.namesListed + counts.symbols + counts.symbolsListed, w.listing + (ok ? windowListing : 0), `${name}: listings`);
      // Visit-covered operations happen at most once per visit during capture. An accepted root also
      // runs encode on its snapshot (outside the meter): the safe clone and the JCS call each test
      // `IsArray` and use the `seen` set at most once more per snapshot node, and a snapshot has at
      // most one node per visit.
      assert.ok(counts.isProxy <= w.visit, `${name}: isProxy ${counts.isProxy} <= visits ${w.visit}`);
      assert.ok(counts.prototype <= w.visit + (ok ? window.prototype : 0), `${name}: prototype ${counts.prototype}`);
      for (const field of ["isArray", "setHas", "setAdd", "setDelete"] as const) {
        const bound = ok ? 3 * w.visit + window[field] : w.visit;
        assert.ok(counts[field] <= bound, `${name}: ${field} ${counts[field]} <= ${bound}`);
      }
      assert.equal(counts.setAdd, counts.setDelete, `${name}: every opened container is closed`);
      // Observations of caller objects, exactly bounded: an array's length belongs to its visit, each
      // position to an element or descriptor unit, and each prototype observation to a visit.
      assert.ok(counts.descriptorTracked <= w.visit + w.element + w.descriptor, `${name}: caller descriptors ${counts.descriptorTracked}`);
      assert.ok(counts.prototypeTracked <= w.visit, `${name}: caller prototypes ${counts.prototypeTracked}`);
      assert.ok(counts.namesTracked + counts.symbolsTracked <= w.listing, `${name}: caller listings`);
      assert.ok(counts.brand <= 18 * w.visit, `${name}: brand predicates`);
      // charCodeAt: the string scans plus at most ten reads per listed array-index name.
      assert.ok(counts.charCodeAt <= w.string + 10 * w.listing, `${name}: character reads`);
      // Descriptors: at most one per visit (array length), element and descriptor unit, two per read
      // (pending-member and snapshot lists) and eleven per diagnostic (suffix search); an accepted root
      // also runs encode on its snapshot, which reads each snapshot position and length a bounded
      // number of times.
      const captureBound = w.visit + w.element + w.descriptor + 2 * w.read + 11 * w.diagnostic;
      const encodeBound = ok ? 4 * (w.visit + w.element + w.read) + window.descriptor : 0;
      assert.ok(counts.descriptor <= captureBound + encodeBound, `${name}: descriptors ${counts.descriptor} <= ${captureBound + encodeBound}`);
      // No shape here reaches the meter (packet review BM-02): each stays within B and never stops on it.
      assert.notEqual(w.stop, "work", `${name}: no meter stop`);
      assert.ok(w.units <= B, `${name}: within B`);
    }
  });
});

/**
 * KC3-5 (K12C1-R8-EVID-01): every byte charge of capture is pinned by an exact whole result.
 *
 * Each shape shares one refused container (or string) `width` times in a root array, so the root's
 * structure charges `width + 1` bytes and each visit charges the shape's own bytes; the byte stop fires
 * on the first visit that takes the count past 1,048,576. Removing or weakening the charge lets the
 * shape run on to the meter or to completion, which changes the result.
 */
describe("KC3-5 every byte charge is pinned by its exact byte-stop position", () => {
  const LIMIT = BOUNDARY_LIMITS.canonicalBytes;
  /** The visit at which a root of `width` shared shapes, each charging `perVisit` bytes, stops. */
  const stopVisit = (width: number, perVisit: number): number => Math.floor((LIMIT - (width + 1)) / perVisit) + 1;

  const sharedArrayWithNames = (extra: number): unknown[] => {
    const shared: unknown[] = [];
    for (let index = 0; index < extra; index += 1) (shared as unknown as Record<string, number>)[`x${index}`] = 0;
    return shared;
  };

  for (const extra of [256, 4_096, 20_000]) {
    test(`N15 array surplus names: ${extra} extra names ${extra + 1 > 4_097 ? "(above" : "(below"} the overlong threshold)`, () => {
      // An empty array with `extra` own names: structure 2 bytes plus a surplus of `extra` names.
      const visits = stopVisit(4_096, 2 + extra);
      assert.ok(visits < 4_096, "the byte stop fires before the root is exhausted");
      const { result, work: counted } = captureWithWork(Array(4_096).fill(sharedArrayWithNames(extra)));
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(counted.stop, "bytes");
      assert.deepEqual(result.issues.slice(8).map((issue) => [issue.code, issue.occurrences]), [["unrepresentable_member", visits - 8], ["too_many_bytes", 1]]);
      // Root: a visit, names (1 + 4,096 + 1) and symbols (1); then each visit up to the stop: its element
      // unit in the root, its visit, its names listing (1 + extra + 1), its symbols listing (1, metered
      // although the extra names refuse the array; MS-02) and a diagnostic. Elements past the stop are never
      // observed.
      assert.equal(counted.units, 1 + 4_098 + 1 + visits * (1 + 1 + (extra + 2) + 1 + 1));
    });
  }

  test("N16 object structure: an over-named object is charged for every listed name", () => {
    // 4,097 members k0..k4096 with value 0: structure 2·4097 + 1, then each member's quoted name and
    // its value `0` until the byte stop; refused for too many entries.
    const members = 4_097;
    const shared = Object.fromEntries(Array.from({ length: members }, (_, index) => [`k${index}`, 0]));
    const perVisit = 2 * members + 1 + Array.from({ length: members }, (_, index) => `"k${index}"`.length + 1).reduce((a, b) => a + b, 0);
    const visits = stopVisit(4_096, perVisit);
    const { result, work: counted } = captureWithWork(Array(4_096).fill(shared));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(counted.stop, "bytes");
    const tooMany = result.issues.filter((issue) => issue.code === "too_many_entries").reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0);
    assert.equal(tooMany, visits, "one too_many_entries per visit up to the stop");
    assert.equal(result.issues.filter((issue) => issue.code === "too_many_bytes").length, 1);
  });

  test("N16 object structure: listed non-enumerable names are charged although no member is read", () => {
    // 4,096 non-enumerable members: structure 2·4096 + 1 bytes for the names listed, no member bytes.
    // Charging only enumerable members (none) would charge 2 bytes and run on to the meter instead.
    const shared = {};
    for (let index = 0; index < 4_096; index += 1) Object.defineProperty(shared, `h${index}`, { value: 0 });
    const visits = stopVisit(4_096, 2 * 4_096 + 1);
    const { result, work: counted } = captureWithWork(Array(4_096).fill(shared));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(counted.stop, "bytes");
    assert.deepEqual(result.issues.slice(8).map((issue) => [issue.code, issue.occurrences]), [["unrepresentable_member", visits - 8], ["too_many_bytes", 1]]);
    // Root: a visit, names (1 + 4,096 + 1) and symbols (1); then per visit: its element unit, its visit,
    // symbols (1), names (1 + 4,096), 4,096 descriptors and a diagnostic.
    assert.equal(counted.units, 1 + 4_098 + 1 + visits * (1 + 1 + 1 + 4_097 + 4_096 + 1));
  });

  for (const [name, text, code] of [
    ["a refused long string", "x".repeat(65_537), "string_too_long"],
    ["a string with a lone surrogate", `${"x".repeat(1_000)}\ud800`, "lone_surrogate"],
  ] as const) {
    test(`${name} is charged its full length`, () => {
      const visits = stopVisit(4_096, text.length);
      const { result, work: counted } = captureWithWork(Array(4_096).fill(text));
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(counted.stop, "bytes");
      assert.deepEqual(result.issues.slice(8).map((issue) => [issue.code, issue.occurrences]), [[code, visits - 8], ["too_many_bytes", 1]]);
    });
  }

  for (const [name, key, code] of [
    ["a refused long member name", "x".repeat(65_537), "string_too_long"],
    ["a member name with a lone surrogate", `${"x".repeat(1_000)}\ud800`, "lone_surrogate"],
  ] as const) {
    test(`${name} is charged its full length`, () => {
      // { [key]: 1 }: structure 2 + 1 (one member: brackets and a colon), then the refused key's length.
      const visits = stopVisit(4_096, 3 + key.length);
      const { result, work: counted } = captureWithWork(Array(4_096).fill({ [key]: 1 }));
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(counted.stop, "bytes");
      assert.deepEqual(result.issues.slice(8).map((issue) => [issue.code, issue.occurrences]), [[code, visits - 8], ["too_many_bytes", 1]]);
    });
  }

  for (const kind of ["object", "array"] as const) {
    test(`an ${kind} with 4,096 symbol-keyed members is charged one byte per symbol`, () => {
      const shared: object = kind === "object" ? {} : [];
      for (let index = 0; index < 4_096; index += 1) (shared as Record<symbol, number>)[Symbol(`s${index}`)] = 0;
      // Structure 2 bytes (no string-keyed member or element) plus one per symbol.
      const visits = stopVisit(4_096, 2 + 4_096);
      const { result, work: counted } = captureWithWork(Array(4_096).fill(shared));
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(counted.stop, "bytes");
      assert.deepEqual(result.issues.slice(8).map((issue) => [issue.code, issue.occurrences]), [["unrepresentable_member", visits - 8], ["too_many_bytes", 1]]);
    });
  }
});
