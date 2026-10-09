/**
 * K1.1-correction-03 KC3-7 and KC3-8: Proxy refusal and internal-slot refusal, in every root consumer.
 *
 * - KC3-7 (owner decision-01 item 2): every Proxy — plain, array, revoked, callable, nested, over a
 *   re-prototyped built-in (DESIGN-AUDIT-01 review 02 PROXY-01), and the descriptor-chain and
 *   handler-chain shapes of K1.2-correction-01 blockers 01/02 — is refused before any observation, at
 *   depths 1, 2, 16 and 31, in each of the root consumers, with zero trap calls and the whole result
 *   unchanged apart from the one refusal.
 * - KC3-8 (decision-01 item 3; owner design check Q4): every built-in kind of design-01 §4 that keeps
 *   content in internal slots is refused when its prototype is plain (or naturally null/Object.prototype:
 *   arguments objects, module namespaces, raw JSON), by internal-slot checks, with zero own-key listings
 *   (the O-R8-3 `Uint8Array(2**24)` and the String wrapper over a large rope included); a
 *   `Symbol.toStringTag` spoof changes nothing; cross-realm built-ins are refused the same way.
 * - The kinds with no usable predicate (design check Q6) are pinned as the declared limit they are.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import vm from "node:vm";

import { boundaryValueIssues, canonicalize, captureWithWork, isBoundaryValue, type ValueIssue } from "../src/values.ts";
import { CONSUMERS as SHARED_CONSUMERS, type Consumer } from "./capture-corpus.ts";
import { countingProxy, inWrappedChild, revokedCountingProxy } from "./capture-instruments.ts";

const PROXY_MESSAGE = "value is a Proxy; capture refuses every Proxy before observing it";
const BUILT_IN_MESSAGE = "expected a plain object, received a built-in object whose content is kept in internal slots";

/** A Proxy witness and its trap counter. */
interface Witness {
  readonly name: string;
  readonly make: () => { proxy: unknown; calls: () => number };
}

/** Blocker 01: descriptors returned by the trap carry deep prototype chains. */
const descriptorChainProxy = (): { proxy: unknown; calls: () => number } => {
  let calls = 0;
  let tail: object = {};
  for (let level = 0; level < 1_000; level += 1) tail = Object.create(tail);
  const descriptor = Object.assign(Object.create(tail), { value: 1, writable: true, enumerable: true, configurable: true });
  const proxy = new Proxy(Array(4096).fill(1), {
    getOwnPropertyDescriptor(target, key) {
      calls += 1;
      return key === "length" ? Reflect.getOwnPropertyDescriptor(target, key) : descriptor;
    },
  });
  return { proxy, calls: () => calls };
};

/** Blocker 02: the handler is a deep chain whose traps sit at the tail. */
const handlerChainProxy = (): { proxy: unknown; calls: () => number } => {
  let calls = 0;
  const tail: ProxyHandler<object> = {
    getOwnPropertyDescriptor: (target, key) => { calls += 1; return Reflect.getOwnPropertyDescriptor(target, key); },
    get: (target, key, receiver) => { calls += 1; return Reflect.get(target, key, receiver); },
    ownKeys: (target) => { calls += 1; return Reflect.ownKeys(target); },
    getPrototypeOf: (target) => { calls += 1; return Reflect.getPrototypeOf(target); },
  };
  let handler: object = tail;
  for (let level = 0; level < 1_000; level += 1) handler = Object.create(handler);
  return { proxy: new Proxy(Array(4096).fill(undefined), handler as ProxyHandler<object>), calls: () => calls };
};

const WITNESSES: readonly Witness[] = [
  { name: "a Proxy over a plain object", make: () => countingProxy({ a: 1 }) },
  { name: "a Proxy over an array", make: () => countingProxy([1, 2, 3]) },
  { name: "a revoked Proxy", make: () => revokedCountingProxy() },
  { name: "a callable Proxy", make: () => countingProxy(() => 1) },
  {
    name: "a Proxy over a Proxy",
    make: () => {
      const inner = countingProxy({ a: 1 });
      const outer = countingProxy(inner.proxy);
      return { proxy: outer.proxy, calls: () => inner.calls() + outer.calls() };
    },
  },
  { name: "PROXY-01: a Proxy over a re-prototyped Map", make: () => countingProxy(Object.setPrototypeOf(new Map([["k", 1]]), null) as object) },
  { name: "PROXY-01: a Proxy over a re-prototyped Uint8Array", make: () => countingProxy(Object.setPrototypeOf(new Uint8Array([1, 2]), null) as object) },
  { name: "blocker 01: descriptors with deep prototype chains", make: descriptorChainProxy },
  { name: "blocker 02: a handler that is a deep chain", make: handlerChainProxy },
];

/** `value` placed at nesting depth `depth` (1 is the root itself) and the path capture reports for it. */
const placed = (value: unknown, depth: number): { root: unknown; path: string } => {
  let root = value;
  for (let level = 1; level < depth; level += 1) root = [root];
  return { root, path: "[0]".repeat(depth - 1) };
};

const DEPTHS = [1, 2, 16, 31] as const;

/** The value issues a direct capture reports for `root`. */
const issuesOf = (root: unknown): ValueIssue[] => {
  const result = canonicalize(root);
  assert.equal(result.ok, false);
  return result.ok ? [] : result.issues;
};

/**
 * The root consumers: the two direct ones checked here against the exact, single-issue result, and the
 * coordinator consumers (creation, ingress, recovery and the eager Outcome roots) from the shared
 * corpus, each with its whole-result check.
 */
const CONSUMERS: readonly Consumer[] = [
  {
    name: "canonicalize",
    run: (root, path, code, message) => assert.deepEqual(issuesOf(root), [{ path, code, message }]),
  },
  {
    name: "boundaryValueIssues and isBoundaryValue",
    run: (root, path, code, message) => {
      assert.deepEqual(boundaryValueIssues(root), [{ path, code, message }]);
      assert.equal(isBoundaryValue(root), false);
    },
  },
  ...SHARED_CONSUMERS.slice(2),
];

describe("KC3-7 every Proxy is refused first, with no trap run, in every root consumer", () => {
  for (const witness of WITNESSES) {
    for (const consumer of CONSUMERS) {
      test(`${witness.name}: ${consumer.name}, at depths ${DEPTHS.join(", ")}`, () => {
        for (const depth of DEPTHS) {
          const { proxy, calls } = witness.make();
          const { root, path } = placed(proxy, depth);
          consumer.run(root, path, "unsupported_form", PROXY_MESSAGE);
          assert.equal(calls(), 0, `no trap ran at depth ${depth}`);
        }
      });
    }
  }

  test("a Proxy at depth 33 is refused as a Proxy, before the depth test", () => {
    const { proxy, calls } = countingProxy({});
    const { root, path } = placed(proxy, 33);
    assert.deepEqual(issuesOf(root), [{ path, code: "unsupported_form", message: PROXY_MESSAGE }]);
    assert.equal(calls(), 0);
  });

  test("4,096 revoked Proxies in one array: one refusal each, no trap, bounded work", () => {
    const witnesses = Array.from({ length: 4096 }, () => revokedCountingProxy());
    const { result, work } = captureWithWork(witnesses.map((witness) => witness.proxy));
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.issues.slice(0, 8).every((issue) => issue.message === PROXY_MESSAGE), true);
    assert.deepEqual(result.issues.slice(8), [{ path: "", code: "unsupported_form", message: "additional occurrences (locations omitted)", occurrences: 4088 }]);
    // 2·4096 + 4 for the array, then a visit and a diagnostic per Proxy.
    assert.equal(work.units, 2 * 4096 + 4 + 2 * 4096);
    assert.equal(witnesses.reduce((sum, witness) => sum + witness.calls(), 0), 0);
  });
});

/** Every kind of design-01 §4 with a predicate, as a factory of a fresh instance. */
const BRANDED: readonly [string, () => object][] = [
  ["Map", () => new Map([["k", 1]])],
  ["Set", () => new Set([1])],
  ["WeakMap", () => new WeakMap([[{}, 1]])],
  ["WeakSet", () => new WeakSet([{}])],
  ["Date", () => new Date(0)],
  ["RegExp", () => /x/g],
  ["ArrayBuffer", () => new ArrayBuffer(8)],
  ["SharedArrayBuffer", () => new SharedArrayBuffer(8)],
  ["DataView", () => new DataView(new ArrayBuffer(4))],
  ["Uint8Array [7,8,9]", () => new Uint8Array([7, 8, 9])],
  ["Float64Array", () => new Float64Array(2)],
  ["BigInt64Array", () => new BigInt64Array(1)],
  ["Buffer", () => Buffer.from("ab")],
  ["Number object", () => new Number(1)],
  ["String object", () => new String("ab")],
  ["Boolean object", () => new Boolean(false)],
  ["Symbol object", () => Object(Symbol("s")) as object],
  ["BigInt object", () => Object(1n) as object],
  ["Error", () => new Error("m")],
  ["TypeError", () => new TypeError("m")],
  ["AggregateError", () => new AggregateError([], "m")],
  ["DOMException", () => new DOMException("m")],
  ["Promise", () => Promise.resolve(1)],
  ["generator object", () => (function* () { yield 1; })()],
  ["async generator object", () => (async function* () { yield 1; })()],
  ["Map iterator", () => new Map([[1, 2]]).entries()],
  ["Set iterator", () => new Set([1]).values()],
];

/** Objects that keep internal slots although their own prototype is already plain (design check Q4). */
const NATURALLY_PLAIN: readonly [string, () => object][] = [
  ["an arguments object", function (this: unknown) { return (function (..._a: unknown[]) { return arguments; })(1, 2); }],
  ["a raw JSON object (SELF-K113-RAWJSON-01)", () => (JSON as unknown as { rawJSON(text: string): object }).rawJSON("1")],
];

describe("KC3-8 built-ins that keep content in internal slots are refused by internal-slot checks", () => {
  for (const [kind, make] of BRANDED) {
    test(`re-prototyped ${kind}: refused before any listing, with null and with Object.prototype`, () => {
      for (const prototype of [null, Object.prototype]) {
        const value = Object.setPrototypeOf(make(), prototype) as object;
        assert.deepEqual(issuesOf(value), [{ path: "", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
        assert.deepEqual(issuesOf({ nested: [value] }), [{ path: "nested[0]", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
      }
      // With its own prototype it is refused by the prototype check, exactly as before this packet.
      assert.deepEqual(issuesOf(make()), [{ path: "", code: "unsupported_form", message: "expected a plain object, received object" }]);
    });
  }

  for (const [kind, make] of NATURALLY_PLAIN) {
    test(`${kind} is refused by its internal slot (owner design check Q4)`, () => {
      assert.deepEqual(issuesOf(make()), [{ path: "", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
    });
  }

  test("a module namespace object is refused by its internal slot (owner design check Q4)", async () => {
    const namespace = await import("node:path");
    assert.deepEqual(issuesOf(namespace), [{ path: "", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
  });

  test("zero own-key listings for every witness, including the O-R8-3 shapes", () => {
    const observed = inWrappedChild<{ kind: string; names: number; symbols: number; codes: string[]; message: string }[]>(`
      const kinds = [
        ["Map", () => new Map([["k", 1]])], ["Set", () => new Set([1])], ["WeakMap", () => new WeakMap()],
        ["Date", () => new Date(0)], ["ArrayBuffer", () => new ArrayBuffer(8)], ["Boolean", () => new Boolean(true)],
        ["Uint8Array [7,8,9]", () => new Uint8Array([7, 8, 9])],
        ["O-R8-3 Uint8Array(2**24)", () => new Uint8Array(2 ** 24)],
        ["O-R8-3 String wrapper over a 2**27 rope", () => new String("a".repeat(2 ** 26) + "b".repeat(2 ** 26))],
        ["Error", () => new Error("m")], ["arguments", () => (function () { return arguments; })(1, 2)],
        ["raw JSON", () => JSON.rawJSON("1")],
      ];
      const out = [];
      for (const [kind, make] of kinds) {
        const made = make();
        const value = kind === "arguments" || kind === "raw JSON" ? made : Object.setPrototypeOf(made, null);
        track(value);
        reset();
        const result = values.canonicalize(value);
        const counted = snapshot();
        out.push({ kind, names: counted.namesTracked, symbols: counted.symbolsTracked, codes: result.ok ? [] : result.issues.map((issue) => issue.code), message: result.ok ? "" : result.issues[0].message });
      }
      emit(out);
    `, { timeout: 120_000 });
    assert.equal(observed.length, 12);
    for (const row of observed) {
      assert.equal(row.names, 0, `${row.kind}: no own-names listing`);
      assert.equal(row.symbols, 0, `${row.kind}: no own-symbols listing`);
      assert.deepEqual(row.codes, ["unsupported_form"], row.kind);
      assert.equal(row.message, BUILT_IN_MESSAGE, row.kind);
    }
  });

  test("the brand checks read no Symbol.toStringTag: an ambient spoof changes nothing", () => {
    const saved = Object.getOwnPropertyDescriptor(Object.prototype, Symbol.toStringTag);
    Object.defineProperty(Object.prototype, Symbol.toStringTag, { value: "Map", configurable: true });
    try {
      assert.equal(Object.prototype.toString.call({ a: 1 }), "[object Map]", "the spoof is live");
      const result = canonicalize({ a: 1 });
      assert.ok(result.ok, "a plain object is still accepted");
      assert.equal(result.value.canonical, '{"a":1}');
      assert.deepEqual(issuesOf(Object.setPrototypeOf(new Map(), null)), [{ path: "", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
    } finally {
      if (saved === undefined) delete (Object.prototype as Record<symbol, unknown>)[Symbol.toStringTag];
      else Object.defineProperty(Object.prototype, Symbol.toStringTag, saved);
    }
  });

  test("cross-realm values: built-ins refused by their slot, plain values as before", () => {
    const context = vm.createContext({});
    const map = vm.runInContext("new Map([[1, 2]])", context) as object;
    const typed = vm.runInContext("new Uint8Array([1])", context) as object;
    assert.deepEqual(issuesOf(Object.setPrototypeOf(map, null)), [{ path: "", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
    assert.deepEqual(issuesOf(Object.setPrototypeOf(typed, null)), [{ path: "", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
    // A cross-realm plain object or array carries its realm's prototype: refused as foreign, unchanged.
    assert.deepEqual(issuesOf(vm.runInContext("({ a: 1 })", context)), [{ path: "", code: "unsupported_form", message: "expected a plain object, received object" }]);
    assert.deepEqual(issuesOf(vm.runInContext("[1]", context)), [{ path: "", code: "unsupported_form", message: "expected a plain array, received object" }]);
    // A cross-realm null-prototype object has no realm-specific prototype: accepted, unchanged.
    const bare = vm.runInContext("Object.assign(Object.create(null), { a: 1 })", context);
    const result = canonicalize(bare);
    assert.ok(result.ok);
    assert.equal(result.value.canonical, '{"a":1}');
  });
});

describe("design check Q6: kinds with no usable predicate are a declared limit, not a guarantee", () => {
  // These kinds keep content in internal slots, but Node v26.10.0 offers no non-throwing, side-effect-free
  // test for them (design-01 §4). Re-prototyped to plain, they are captured as their own data, which is
  // `{}`. values.md and BASELINE state this limit; this test keeps it exact so a change is visible.
  const UNDETECTABLE: readonly [string, () => object][] = [
    ["WeakRef", () => new WeakRef({})],
    ["FinalizationRegistry", () => new FinalizationRegistry(() => undefined)],
    ["Temporal.PlainDate", () => (globalThis as unknown as { Temporal: { PlainDate: { from(text: string): object } } }).Temporal.PlainDate.from("2026-10-09")],
    ["Intl.Locale", () => new Intl.Locale("en")],
    ["an array iterator", () => [1][Symbol.iterator]()],
    ["DisposableStack", () => new (globalThis as unknown as { DisposableStack: new () => object }).DisposableStack()],
    ["WebAssembly.Memory", () => new (globalThis as unknown as { WebAssembly: { Memory: new (descriptor: { initial: number }) => object } }).WebAssembly.Memory({ initial: 0 })],
  ];
  for (const [kind, make] of UNDETECTABLE) {
    test(`re-prototyped ${kind} is captured as {}`, () => {
      const result = canonicalize(Object.setPrototypeOf(make(), null));
      assert.ok(result.ok);
      assert.equal(result.value.canonical, "{}");
    });
  }
});
