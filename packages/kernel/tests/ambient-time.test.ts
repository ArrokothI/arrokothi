/**
 * K13-8 — no ambient time in the Kernel zone (`operations.md` § Three clocks; brief 01 K13-8).
 *
 * Three pieces of evidence, each with its stated reach:
 *
 * - **Census.** No zone file references a time or scheduling source in executable code: `Date`,
 *   `performance`, the timer functions and their `clear*` forms, `queueMicrotask`, `process`, `Temporal`,
 *   `Atomics` or `globalThis`, and none imports `node:timers`, `node:perf_hooks`, `node:process` or
 *   `node:worker_threads`. Like L-11's guards this is a bounded syntactic regression guard over the
 *   current source, not a proof about future code: it reads identifiers, not what a value might alias.
 * - **Runtime windows.** A catalog of the K1.3 boundary calls runs twice: once plainly, and once with
 *   each of those globals replaced by a throwing stub inside each call's window (the poison catalog's
 *   window method). Every answer and view must be equal. A Kernel that read ambient time anywhere on
 *   these paths would throw or diverge.
 * - **Determinism.** Every K1.3 test drives a manual clock; the read counts are in
 *   `waits-registration.test.ts` and `waits-timers.test.ts`.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { accepted } from "./harness.ts";
import { author, created, dispatch, input, manualClock, submitAwait, view, waitKey, waitOn } from "./waits-kit.ts";

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const FORBIDDEN_IDENTIFIERS = new Set([
  "Date",
  "performance",
  "setTimeout",
  "setInterval",
  "setImmediate",
  "clearTimeout",
  "clearInterval",
  "clearImmediate",
  "queueMicrotask",
  "process",
  "Temporal",
  "Atomics",
  "globalThis",
]);
const FORBIDDEN_MODULES = new Set(["node:timers", "node:timers/promises", "node:perf_hooks", "node:process", "node:worker_threads"]);

/** Every identifier and module specifier in executable code of one source file. */
function references(path: string): { identifiers: string[]; modules: string[] } {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
  const identifiers: string[] = [];
  const modules: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      // A member name (`x.Date`) or a property key is not a reference to the global.
      const isMemberName = (ts.isPropertyAccessExpression(parent) && parent.name === node) || (ts.isPropertyAssignment(parent) && parent.name === node) || (ts.isPropertySignature(parent) && parent.name === node);
      if (!isMemberName) identifiers.push(node.text);
    }
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) modules.push(node.moduleSpecifier.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { identifiers, modules };
}

describe("K13-8 the zone references no ambient time source (bounded syntactic guard)", () => {
  const files = readdirSync(SOURCE_ROOT).filter((name) => name.endsWith(".ts")).map((name) => resolve(SOURCE_ROOT, name));

  test("the census covers every zone file, including the new clock and wait modules", () => {
    const names = files.map((path) => path.slice(SOURCE_ROOT.length + 1));
    for (const name of ["coordinator.ts", "state.ts", "time.ts", "waits.ts", "outcome.ts"]) assert.ok(names.includes(name), name);
  });

  test("no forbidden identifier or module in executable code", () => {
    const found: string[] = [];
    for (const path of files) {
      const { identifiers, modules } = references(path);
      for (const identifier of identifiers) if (FORBIDDEN_IDENTIFIERS.has(identifier)) found.push(`${path.slice(SOURCE_ROOT.length + 1)}: ${identifier}`);
      for (const module of modules) if (FORBIDDEN_MODULES.has(module)) found.push(`${path.slice(SOURCE_ROOT.length + 1)}: imports ${module}`);
    }
    assert.deepEqual(found, []);
  });

  test("the census is not vacuous: it reports a planted reference", () => {
    const planted = resolve(dirname(fileURLToPath(import.meta.url)), "ambient-time.test.ts");
    const { identifiers } = references(planted);
    assert.ok(identifiers.includes("FORBIDDEN_IDENTIFIERS"));
    const probe = ts.createSourceFile("probe.ts", "const t = Date.now(); queueMicrotask(() => {}); import 'node:timers';", ts.ScriptTarget.Latest, true);
    const seen: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) seen.push(node.text);
      ts.forEachChild(node, visit);
    };
    visit(probe);
    assert.deepEqual(seen, ["Date", "queueMicrotask"]);
  });
});

// -- Runtime windows -------------------------------------------------------------------------------

const POISONED = ["Date", "performance", "setTimeout", "setInterval", "setImmediate", "clearTimeout", "clearInterval", "clearImmediate", "queueMicrotask", "Temporal"] as const;
const host = globalThis as unknown as Record<string, unknown>;

/** Runs `call` with every time global replaced by a throwing stub, restoring them before it returns. */
function inWindow<T>(call: () => T): T {
  const saved = POISONED.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const hit: string[] = [];
  const stub = (name: string) =>
    new Proxy(function poisoned() {}, {
      get() {
        hit.push(name);
        throw new Error(`ambient ${name} read inside a Kernel call`);
      },
      apply() {
        hit.push(name);
        throw new Error(`ambient ${name} called inside a Kernel call`);
      },
      construct() {
        hit.push(name);
        throw new Error(`ambient ${name} constructed inside a Kernel call`);
      },
    });
  for (const name of POISONED) Object.defineProperty(globalThis, name, { value: stub(name), writable: true, configurable: true });
  try {
    return call();
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor === undefined) delete host[name];
      else Object.defineProperty(globalThis, name, descriptor);
    }
    assert.deepEqual(hit, [], "no time global was touched inside the window");
  }
}

/** The K1.3 boundary catalog: each step's answer, then every view, under `wrap` around each Kernel call. */
function catalog(wrap: <T>(call: () => T) => T): unknown[] {
  const answers: unknown[] = [];
  const clock = manualClock(0);
  const opened = created({ clock });
  const step = <T>(call: () => T): T => {
    const answer = wrap(call);
    answers.push(answer);
    return answer;
  };
  const exchange = step(() => dispatch(opened));
  step(() => submitAwait(opened, exchange, waitOn("s", 10)));
  step(() => opened.kernel.pendingTimers());
  clock.set(5);
  step(() => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
  clock.set(10);
  step(() => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
  step(() => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
  step(() => input(opened, "s", { n: 1 }, "catalog-1"));
  const second = step(() => dispatch(opened, 2));
  step(() => submitAwait(opened, second, waitOn("s")));
  step(() => input(opened, "s", { n: 2 }, "catalog-2"));
  step(() => dispatch(opened, 2));
  step(() => opened.kernel.inspect(author, opened.executionId));
  answers.push(view(opened));
  return answers;
}

describe("K13-8 runtime: the K1.3 boundary calls run unchanged with every time global poisoned", () => {
  test("every answer and view equals the unpoisoned run", () => {
    const plain = catalog((call) => call());
    const poisoned = catalog(inWindow);
    assert.deepEqual(poisoned, plain);
    assert.equal(accepted({ ok: true, value: plain.length }), 13);
  });

  test("the window is not vacuous: a read of Date inside it is caught", () => {
    assert.throws(() => inWindow(() => Date.now()), /ambient Date read inside a Kernel call|no time global was touched/);
  });
});
