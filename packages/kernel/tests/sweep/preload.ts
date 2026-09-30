/**
 * Whole-suite poisoned-prototype sweep: the per-process instrumentation (DEC-8, contract revision 9).
 *
 * `run-poison-sweep.ts` starts the maintained Kernel suite with `--import` of this module. In each
 * test-file process it:
 *
 * 1. derives nothing itself: the name set, the mode and the output directory come from the runner;
 * 2. registers every Proxy handler the tests create (see `poison.ts`, "Proxy handler");
 * 3. turns every Kernel boundary call into a poison window: each public `ExecutionCoordinator`
 *    method and its constructor, and every function a test file imports from a zone module
 *    (`canonicalize`, `captureOutcome`, …), which a module hook routes through a wrapper;
 * 4. records, per call and in order, a digest of what the call returned or threw;
 * 5. writes the digests, the zone firings and the counters when the process exits.
 *
 * Nothing activates unless the process runs one Kernel test file; child processes the tests spawn
 * for their own purposes do not load this module.
 */

import { registerHooks } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPoison, digest, registerProxyHandlers, type PoisonMode } from "./poison.ts";
import { decodeName } from "./zone-names.ts";

const ReflectApply = Reflect.apply;
const ReflectConstruct = Reflect.construct;
const ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const ObjectGetPrototypeOf = Object.getPrototypeOf;
const FunctionToString = Function.prototype.toString;
const JSONStringify = JSON.stringify;

/** A thrown value's own message and its class's name, read without running anything. */
const describeThrown = (error: unknown): string => {
  if (typeof error !== "object" || error === null) return typeof error;
  const message = ObjectGetOwnPropertyDescriptor(error, "message");
  const proto = ObjectGetPrototypeOf(error) as object | null;
  const ctor = proto === null ? undefined : ObjectGetOwnPropertyDescriptor(proto, "constructor");
  const ctorName = ctor !== undefined && typeof ctor.value === "function" ? ObjectGetOwnPropertyDescriptor(ctor.value, "name") : undefined;
  return `${typeof ctorName?.value === "string" ? ctorName.value : "?"}:${typeof message?.value === "string" ? message.value : "?"}`;
};

const KERNEL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TESTS_ROOT = resolve(KERNEL_ROOT, "tests");
const ZONE_ROOT = resolve(KERNEL_ROOT, "src");
const testFile = process.argv[1] ?? "";
const active = dirname(testFile) === TESTS_ROOT && testFile.endsWith(".test.ts") && process.env.KERNEL_POISON_MODE !== undefined;

/** The zone modules whose function exports test files call directly. `own-array.ts` is test instrumentation's helper, not a boundary. */
const WRAPPED_MODULES = ["index.ts", "values.ts", "envelope.ts", "outcome.ts", "identity.ts", "coordinator.ts"];
const WINDOW_SCHEME = "kernel-poison-window:";
const BRIDGE = Symbol.for("arrokothi.kernel.poison-window");


if (active) {
  const mode = process.env.KERNEL_POISON_MODE as PoisonMode;
  const out = process.env.KERNEL_POISON_OUT as string;
  const names = (JSON.parse(readFileSync(process.env.KERNEL_POISON_NAMES as string, "utf8")) as string[]).map(decodeName);
  const poison = createPoison({ mode, names, zoneRoot: ZONE_ROOT });
  registerProxyHandlers(poison);
  const trace: string[] = [];
  // Own-data appends through a null-prototype descriptor: this runs inside windows, where an
  // ordinary indexed write or descriptor literal would itself walk to installed pollution.
  const defineProperty = Object.defineProperty;
  const create = Object.create;
  const record = (entry: string): void => {
    const descriptor = create(null) as PropertyDescriptor;
    descriptor.value = entry;
    descriptor.writable = true;
    descriptor.enumerable = true;
    descriptor.configurable = true;
    defineProperty(trace, `${trace.length}`, descriptor);
  };

  const inWindow = (label: string, work: () => unknown, reentry?: () => void): unknown => {
    let result: unknown;
    try {
      result = poison.within(label, work, reentry);
    } catch (error) {
      record(`${label}!${describeThrown(error)}`);
      throw error;
    }
    record(`${label}=${digest(result)}`);
    return result;
  };

  const coordinatorModule = (await import(pathToFileURL(resolve(ZONE_ROOT, "coordinator.ts")).href)) as {
    ExecutionCoordinator: new (options: unknown) => object;
  };
  const coordinatorClass = coordinatorModule.ExecutionCoordinator;
  const prototype = coordinatorClass.prototype as Record<string, unknown>;
  let reentryKey = 0;
  for (const method of Object.getOwnPropertyNames(prototype)) {
    if (method === "constructor") continue;
    const original = prototype[method];
    if (typeof original !== "function") continue;
    prototype[method] = function (this: Record<string, (...args: unknown[]) => unknown>, ...args: unknown[]): unknown {
      const kernel = this;
      const caller = args[0];
      // `reenter` mode: a Kernel read of a member its object does not own runs caller code; this
      // is that code. It appends one input to every Execution the caller can see, which changes
      // the accepted state (mailbox, receipts, acceptance index) of whatever the outer call touches.
      const reentry = typeof caller === "object" && caller !== null
        ? (): void => {
            const visible = kernel.visibleExecutions!(caller) as readonly string[];
            for (let index = 0; index < visible.length; index += 1) {
              kernel.submitInput!(caller, { destination: visible[index], requestKey: `poison-reentry-${(reentryKey += 1)}`, kind: "poison.reentry", payload: null });
            }
          }
        : undefined;
      return inWindow(`ExecutionCoordinator.${method}`, () => ReflectApply(original as (...a: unknown[]) => unknown, this, args), reentry);
    };
  }
  const constructed = new Proxy(coordinatorClass, {
    construct(target, args, newTarget) {
      return inWindow("new ExecutionCoordinator", () => ReflectConstruct(target, args, newTarget)) as object;
    },
  });

  const isClass = (value: unknown): boolean => typeof value === "function" && /^class[\s{]/.test(ReflectApply(FunctionToString, value, []) as string);
  (globalThis as unknown as Record<symbol, unknown>)[BRIDGE] = {
    wrap(label: string, value: unknown): unknown {
      if (value === coordinatorClass) return constructed;
      if (typeof value !== "function" || isClass(value)) return value;
      const fn = value as (...args: unknown[]) => unknown;
      return function (this: unknown, ...args: unknown[]): unknown {
        return inWindow(label, () => ReflectApply(fn, this, args));
      };
    },
  };

  // Export names per zone module, read once, for the generated wrappers below.
  const exportsOf = new Map<string, string[]>();
  for (const name of WRAPPED_MODULES) {
    const url = pathToFileURL(resolve(ZONE_ROOT, name)).href;
    exportsOf.set(url, Object.keys(await import(url)));
  }

  registerHooks({
    resolve(specifier, context, nextResolve) {
      const resolved = nextResolve(specifier, context);
      const parent = context.parentURL;
      if (parent !== undefined && parent.startsWith("file:") && dirname(fileURLToPath(parent)) === TESTS_ROOT && exportsOf.has(resolved.url)) {
        return { url: `${WINDOW_SCHEME}${resolved.url}`, format: "module", shortCircuit: true };
      }
      return resolved;
    },
    load(url, context, nextLoad) {
      if (!url.startsWith(WINDOW_SCHEME)) return nextLoad(url, context);
      const real = url.slice(WINDOW_SCHEME.length);
      const module = basename(fileURLToPath(real), ".ts");
      const lines = [`import * as real from ${JSON.stringify(real)};`, `const bridge = globalThis[Symbol.for("arrokothi.kernel.poison-window")];`];
      for (const name of exportsOf.get(real) ?? []) {
        lines.push(`export const ${name} = bridge.wrap(${JSON.stringify(`${module}.${name}`)}, real.${name});`);
      }
      return { format: "module", source: lines.join("\n"), shortCircuit: true };
    },
  });

  process.on("exit", () => {
    const report = {
      file: basename(testFile),
      mode,
      names: names.length,
      counts: poison.counts,
      zoneFirings: poison.zoneFirings,
      calls: trace.length,
      trace,
    };
    writeFileSync(resolve(out, `${basename(testFile)}.json`), `${JSONStringify(report)}\n`);
  });
}
