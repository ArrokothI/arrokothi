/**
 * Instruments that observe what capture does without putting a Proxy in front of it
 * (K1.1-correction-03).
 *
 * Capture now refuses every Proxy before observing it, so a Proxy can no longer count the Kernel's
 * observations or perform a side effect in the middle of a capture. Two instruments replace it:
 *
 * - **`countingProxy`** wraps a target in a handler that counts every trap call. It is a *witness*: a
 *   refused Proxy must record zero trap calls.
 * - **`inWrappedChild`** runs a probe in a fresh Node process. Before any Kernel module loads, it
 *   wraps every engine operation `values.ts` and `own-array.ts` capture at load (descriptor, names,
 *   symbols and prototype observations, `IsArray`, the `util.types` predicates, the cycle-set methods
 *   and `charCodeAt`). The Kernel modules capture the wrappers, so the probe can count each operation
 *   on a tracked caller object and in total, and can make one observation of a tracked object throw or
 *   answer differently to reach a defensive refusal path. The globals are restored right after the
 *   Kernel loads, so test code itself is never counted. A regression is exponential or unbounded work
 *   inside one synchronous call, which no test timeout could interrupt, so the child is killed instead.
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Every trap a Proxy handler may define. */
const TRAPS = [
  "apply",
  "construct",
  "defineProperty",
  "deleteProperty",
  "get",
  "getOwnPropertyDescriptor",
  "getPrototypeOf",
  "has",
  "isExtensible",
  "ownKeys",
  "preventExtensions",
  "set",
  "setPrototypeOf",
] as const;

/**
 * A Proxy over `target` whose handler forwards every trap to `Reflect` and counts it, optionally after
 * a handler of the caller's own (whose traps are counted too). A refused Proxy must leave `calls()` at 0.
 */
export function countingProxy<T extends object>(target: T, own: ProxyHandler<T> = {}): { proxy: T; calls: () => number } {
  let calls = 0;
  const handler: ProxyHandler<T> = {};
  for (const trap of TRAPS) {
    const ownTrap = own[trap] as ((...args: unknown[]) => unknown) | undefined;
    const forward = Reflect[trap] as (...args: unknown[]) => unknown;
    (handler as Record<string, unknown>)[trap] = (...args: unknown[]) => {
      calls += 1;
      return ownTrap !== undefined ? Reflect.apply(ownTrap, own, args) : Reflect.apply(forward, Reflect, args);
    };
  }
  return { proxy: new Proxy(target, handler), calls: () => calls };
}

/** A revocable Proxy, already revoked, with every trap counted (a revoked Proxy runs none). */
export function revokedCountingProxy(target: object = {}): { proxy: object; calls: () => number } {
  let calls = 0;
  const handler: ProxyHandler<object> = {};
  for (const trap of TRAPS) {
    (handler as Record<string, unknown>)[trap] = () => {
      calls += 1;
      throw new Error("trap reached");
    };
  }
  const { proxy, revoke } = Proxy.revocable(target, handler);
  revoke();
  return { proxy, calls: () => calls };
}

/**
 * The prelude every wrapped child runs before importing a Kernel module.
 *
 * `counts` holds totals per operation and, for caller-object observations, the share whose first
 * argument is a tracked object. `hooks` lets a probe replace one observation's answer for a tracked
 * object: `hooks.descriptor(target, key, real)`, `hooks.names(target, real)`,
 * `hooks.symbols(target, real)`, `hooks.prototype(target, real)`; a hook may throw.
 */
const PRELUDE = `
const counts = {
  descriptor: 0, descriptorTracked: 0,
  names: 0, namesTracked: 0, namesListed: 0,
  symbols: 0, symbolsTracked: 0, symbolsListed: 0,
  prototype: 0, prototypeTracked: 0,
  isArray: 0, isProxy: 0, brand: 0,
  setHas: 0, setAdd: 0, setDelete: 0,
  charCodeAt: 0,
};
const tracked = new WeakSet();
const track = (value) => { tracked.add(value); return value; };
const hooks = {};
const restore = [];
const unwrapped = [];
const wrap = (holder, key, make) => {
  const saved = Object.getOwnPropertyDescriptor(holder, key);
  // Node defines a few predicates (isKeyObject, isCryptoKey) non-configurable; they stay uncounted.
  if (!saved.configurable && !saved.writable) { unwrapped.push(key); return; }
  const original = holder[key];
  restore.push(() => { Object.defineProperty(holder, key, saved); });
  Object.defineProperty(holder, key, { value: make(original), writable: true, enumerable: saved.enumerable, configurable: true });
};
const isTracked = (value) => value !== null && (typeof value === "object" || typeof value === "function") && tracked.has(value);
wrap(Object, "getOwnPropertyDescriptor", (original) => function (target, key) {
  counts.descriptor += 1;
  if (isTracked(target)) {
    counts.descriptorTracked += 1;
    if (hooks.descriptor) return hooks.descriptor(target, key, Reflect.apply(original, this, [target, key]));
  }
  return Reflect.apply(original, this, [target, key]);
});
wrap(Object, "getOwnPropertyNames", (original) => function (target) {
  counts.names += 1;
  let result = Reflect.apply(original, this, [target]);
  if (isTracked(target)) {
    counts.namesTracked += 1;
    if (hooks.names) result = hooks.names(target, result);
  }
  counts.namesListed += result.length;
  return result;
});
wrap(Object, "getOwnPropertySymbols", (original) => function (target) {
  counts.symbols += 1;
  let result = Reflect.apply(original, this, [target]);
  if (isTracked(target)) {
    counts.symbolsTracked += 1;
    if (hooks.symbols) result = hooks.symbols(target, result);
  }
  counts.symbolsListed += result.length;
  return result;
});
wrap(Object, "getPrototypeOf", (original) => function (target) {
  counts.prototype += 1;
  if (isTracked(target)) {
    counts.prototypeTracked += 1;
    if (hooks.prototype) return hooks.prototype(target, Reflect.apply(original, this, [target]));
  }
  return Reflect.apply(original, this, [target]);
});
wrap(Array, "isArray", (original) => function (value) { counts.isArray += 1; return Reflect.apply(original, this, [value]); });
const { types: utilTypes } = await import("node:util");
for (const name of Object.keys(utilTypes)) {
  if (typeof utilTypes[name] !== "function") continue;
  const field = name === "isProxy" ? "isProxy" : "brand";
  wrap(utilTypes, name, (original) => function (value) { counts[field] += 1; return Reflect.apply(original, this, [value]); });
}
wrap(JSON, "isRawJSON", (original) => function (value) { counts.brand += 1; return Reflect.apply(original, this, [value]); });
wrap(Set.prototype, "has", (original) => function (value) { counts.setHas += 1; return Reflect.apply(original, this, [value]); });
wrap(Set.prototype, "add", (original) => function (value) { counts.setAdd += 1; return Reflect.apply(original, this, [value]); });
wrap(Set.prototype, "delete", (original) => function (value) { counts.setDelete += 1; return Reflect.apply(original, this, [value]); });
wrap(String.prototype, "charCodeAt", (original) => function (index) { counts.charCodeAt += 1; return Reflect.apply(original, this, [index]); });
const values = await import(${JSON.stringify(new URL("../src/values.ts", import.meta.url).href)});
const kernel = await import(${JSON.stringify(new URL("../src/index.ts", import.meta.url).href)});
for (const undo of restore.reverse()) undo();
const reset = () => { for (const key of Object.keys(counts)) counts[key] = 0; };
const snapshot = () => ({ ...counts, unwrapped: [...unwrapped] });
const emit = (value) => { console.log(JSON.stringify(value)); };
`;

/**
 * Runs `body` in a fresh Node process after the prelude above and returns the JSON it emits last.
 *
 * `body` sees `counts`, `reset`, `snapshot`, `track`, `hooks`, `values` (the `values.ts` module) and
 * `kernel` (the package entry), and calls `emit(result)`. `prelude` runs before the wrappers (for a
 * probe that must prepare state the Kernel never sees as caller code).
 */
export function inWrappedChild<T>(body: string, options: { readonly timeout?: number; readonly before?: string } = {}): T {
  const probe = `${options.before ?? ""}\n${PRELUDE}\n${body}`;
  const output = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", probe],
    { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: options.timeout ?? 120_000, maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(output.trim().split("\n").pop() as string) as T;
}

/** The wrapped-child operation counts, as `snapshot()` returns them. */
export interface OperationCounts {
  readonly descriptor: number;
  readonly descriptorTracked: number;
  readonly names: number;
  readonly namesTracked: number;
  readonly namesListed: number;
  readonly symbols: number;
  readonly symbolsTracked: number;
  readonly symbolsListed: number;
  readonly prototype: number;
  readonly prototypeTracked: number;
  readonly isArray: number;
  readonly isProxy: number;
  readonly brand: number;
  readonly setHas: number;
  readonly setAdd: number;
  readonly setDelete: number;
  readonly charCodeAt: number;
  /** Predicates Node defines non-configurable (`isKeyObject`, `isCryptoKey`), which the child cannot count. */
  readonly unwrapped: readonly string[];
}
