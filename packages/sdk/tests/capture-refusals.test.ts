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
import { createSecretKey, webcrypto } from "node:crypto";
import vm from "node:vm";

import { acceptIdentityText, type LocatedIssue } from "../../kernel/src/envelope.ts";
import { boundaryValueIssues, canonicalize, captureWithWork, isBoundaryValue, type ValueIssue } from "../src/internal/value-capture.ts";
import { CONSUMERS as SHARED_CONSUMERS, openExecution, type Consumer } from "./capture-corpus.ts";
import { countingProxy, inWrappedChild, revokedCountingProxy } from "./capture-instruments.ts";
import { observer, outcomeFor, refused } from "../../kernel/tests/harness.ts";
import { assertOnlyRefusal } from "../../kernel/tests/refusal-diagnostics-fixture.ts";

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

  test("no ambient process.versions read: the brand checks run no code a caller can install (packet review PXS-1)", () => {
    // util.types.isKeyObject and isCryptoKey are JavaScript functions that read process.versions.openssl on
    // every call. Capture does not use them, so a getter installed before the call is never reached and a
    // throwing one changes nothing.
    const saved = Object.getOwnPropertyDescriptor(process, "versions")!;
    let reads = 0;
    Object.defineProperty(process, "versions", { configurable: true, enumerable: true, get() { reads += 1; throw new Error("ambient"); } });
    try {
      const result = canonicalize({ a: { b: [{ c: 1 }] }, d: {} });
      assert.ok(result.ok, "plain objects are still accepted");
      assert.equal(result.value.canonical, '{"a":{"b":[{"c":1}]},"d":{}}');
      assert.deepEqual(issuesOf(Object.setPrototypeOf(new Map(), null)), [{ path: "", code: "unsupported_form", message: BUILT_IN_MESSAGE }]);
    } finally {
      Object.defineProperty(process, "versions", saved);
    }
    assert.equal(reads, 0, "the getter never ran");
  });

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
    // Node's KeyObject keeps its key outside own properties, and util.types.isKeyObject is a JavaScript
    // function that reads the configurable process.versions, so capture does not call it (PXS-1).
    ["KeyObject", () => createSecretKey(Buffer.from("key"))],
  ];
  for (const [kind, make] of UNDETECTABLE) {
    test(`re-prototyped ${kind} is captured as {}`, () => {
      const result = canonicalize(Object.setPrototypeOf(make(), null));
      assert.ok(result.ok);
      assert.equal(result.value.canonical, "{}");
    });
  }

  test("review 01 Q6 scope witnesses: WeakRef and FinalizationRegistry given Object.prototype are captured as {}", () => {
    // Provenance: review 01 `probe-declared-limit.mjs` (KC3-R1-DOC-03). This acceptance is what design check
    // Q6 permits; the finding was a summary that promised refusal of every internal-slot kind. A change that
    // broadens the refusal claim has to change this test, and the descriptions with it.
    const target = {};
    for (const value of [new WeakRef(target), new FinalizationRegistry(() => undefined)]) {
      const result = canonicalize(Object.setPrototypeOf(value, Object.prototype));
      assert.ok(result.ok);
      assert.equal(result.value.canonical, "{}");
    }
    assert.equal(typeof target, "object", "the WeakRef target stays live through the capture");
  });

  test("re-prototyped CryptoKey is captured as {} (its predicate reads process.versions, PXS-1)", async () => {
    const key = await webcrypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, true, ["sign"]);
    for (const prototype of [null, Object.prototype]) {
      const result = canonicalize(Object.setPrototypeOf(key, prototype));
      assert.ok(result.ok);
      assert.equal(result.value.canonical, "{}");
    }
  });

  test("residual R2: a contextified vm global over a Proxy sandbox forwards to the sandbox's traps (packet review PXS-3)", () => {
    // The global of a context made from a Proxy is a host object with interceptors, not a Proxy: the
    // Proxy test cannot see it, and its interceptors forward to the caller's traps. Natural, it is refused
    // by its prototype with no trap; re-prototyped to null, it is listed and its traps run. values.md and
    // BASELINE declare this as residual R2; this test keeps it visible.
    let traps = 0;
    const sandbox = new Proxy({}, {
      ownKeys(target) { traps += 1; return Reflect.ownKeys(target); },
      getOwnPropertyDescriptor(target, key) { traps += 1; return Reflect.getOwnPropertyDescriptor(target, key); },
    });
    const global = vm.runInContext("this", vm.createContext(sandbox)) as object;
    traps = 0;
    assert.deepEqual(issuesOf(global), [{ path: "", code: "unsupported_form", message: "expected a plain object, received object" }]);
    assert.equal(traps, 0, "refused by its prototype before any listing");
    Object.setPrototypeOf(global, null);
    traps = 0;
    const result = canonicalize(global);
    assert.equal(result.ok, false);
    assert.ok(traps > 0, "the sandbox's traps run through the interceptors");
  });
});

describe("KC3-7 identity text: a Proxy is named as one before any other observation (packet review PXS-2)", () => {
  const PROXY_LABEL = "expected text that can name a request, received a Proxy";
  const witnesses = (): { name: string; proxy: unknown; calls: () => number }[] => {
    let chain: object = [];
    for (let level = 0; level < 10_000; level += 1) chain = new Proxy(chain, {});
    return [
      { name: "a Proxy over an array", ...countingProxy([] as object) },
      { name: "a revoked Proxy", ...revokedCountingProxy() },
      { name: "a callable Proxy", ...countingProxy(() => 1) },
      { name: "a chain of 10,000 Proxies over an array", proxy: chain, calls: () => 0 },
    ];
  };

  test("acceptIdentityText labels every Proxy as a Proxy with zero traps; other values keep their labels", () => {
    for (const witness of witnesses()) {
      const issues: LocatedIssue[] = [];
      assert.equal(acceptIdentityText(witness.proxy, "creationKey", issues), false);
      assert.deepEqual(issues, [{ path: "creationKey", code: "unsupported_form", message: PROXY_LABEL }], witness.name);
      assert.equal(witness.calls(), 0, `${witness.name}: no trap ran`);
    }
    for (const [value, label] of [[null, "null"], [[], "array"], [{}, "object"], [7, "number"], [() => 1, "function"]] as const) {
      const issues: LocatedIssue[] = [];
      acceptIdentityText(value, "requestKey", issues);
      assert.deepEqual(issues, [{ path: "requestKey", code: "unsupported_form", message: `expected text that can name a request, received ${label}` }]);
    }
  });

  test("creation, ingress and Emission keys: a Proxy identity field is refused with no trap and no IsArray", () => {
    const observed = inWrappedChild<{ field: string; isArray: number; isProxy: number; classification: string; reason: string }[]>(`
      const h = await import(${JSON.stringify(new URL("../../kernel/tests/harness.ts", import.meta.url).href)});
      const out = [];
      const chain = () => { let value = []; for (let level = 0; level < 10_000; level += 1) value = new Proxy(value, {}); return value; };
      const run = (field, value) => {
        const coordinator = new kernel.ExecutionCoordinator({ driver: h.recordingDriver() });
        const request = h.createRequest({ [field]: value });
        reset();
        const result = coordinator.createExecution(h.caller("app-a", "tenant-a"), request);
        return { counted: snapshot(), result };
      };
      for (const field of ["scope", "creationKey", "definitionRevision"]) {
        // The control is a plain object in the same field: its label costs exactly one IsArray.
        const control = run(field, {});
        const { counted, result } = run(field, chain());
        out.push({ field, isArray: counted.isArray - (control.counted.isArray - 1), isProxy: counted.isProxy, classification: result.ok ? "accepted" : result.error.classification, reason: result.ok ? "" : result.error.reason });
      }
      emit(out);
    `);
    assert.equal(observed.length, 3);
    for (const row of observed) {
      assert.equal(row.classification, "malformed_value", row.field);
      assert.ok(row.reason.includes(`${row.field} unsupported_form`), row.reason);
      assert.equal(row.isArray, 0, `${row.field}: IsArray never reached the chain`);
      assert.ok(row.isProxy >= 1, `${row.field}: the Proxy test ran`);
    }

    // Ingress request key and kind, and an Emission key in the eight-root Outcome before authority.
    for (const witness of witnesses()) {
      const s = openExecution();
      for (const field of ["requestKey", "kind"] as const) {
        const refusal = refused(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "r", kind: "k", payload: 1, [field]: witness.proxy as never }));
        assert.equal(refusal.classification, "malformed_value", `${witness.name} ${field}`);
        assert.ok(refusal.reason.includes(`${field} unsupported_form`), refusal.reason);
      }
      const proposal = outcomeFor(s.executionId, s.open, {
        emissions: Array.from({ length: 6 }, () => ({ emissionKey: witness.proxy as never, value: 1 })),
      });
      const before = s.view();
      const delivered = s.driver.seen.length;
      const refusal = refused(s.kernel.submitOutcome(observer("visible"), proposal, undefined as never));
      assert.equal(refusal.classification, "unauthorized_submission", witness.name);
      assertOnlyRefusal(before, s.view(), refusal);
      assert.equal(s.driver.seen.length, delivered, "no delivery");
      assert.equal(witness.calls(), 0, `${witness.name}: no trap ran`);
      const own = refused(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open, { emissions: [{ emissionKey: witness.proxy as never, value: 1 }] }), s.grant));
      assert.equal(own.classification, "malformed_envelope", witness.name);
      assert.ok(own.reason.includes("emissions[0].emissionKey unsupported_form"), own.reason);
      assert.equal(witness.calls(), 0, `${witness.name}: no trap ran`);
    }
  });
});
