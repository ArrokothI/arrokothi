// K1.1-correction-03 review 01 (KC3-R1-EVID-02): the assertion witness for the value-cost probe.
//
// Loaded with `--import` before the selected test file. Every module under `packages/kernel/tests/`
// (test-side code: test files and their helpers, such as `harness.ts`) that imports `node:assert` or
// `node:assert/strict` receives a wrapping module instead. Each wrapped assertion function calls the real
// one and, when that throws an `AssertionError`, remembers the error object before rethrowing it. Every
// other module, the code under test and its dependencies included, receives the real `node:assert`.
//
// So a failure counts as a test-side assertion only by where its assertion function was imported, never
// by a stack frame or an error-class name (TOOLS-01 owner choice 09: a frame cannot establish origin):
// - an exception thrown while an assertion's arguments are evaluated never enters the wrapper;
// - an `AssertionError` that the code under test constructs, or throws through its own `node:assert`, is
//   never remembered.
//
// The reporter (`value-cost-reporter.mjs`) runs in the same process and looks each failure's cause up in
// `globalThis[Symbol.for("arrokothi.value-cost.witness")]`. A load failure is recorded through
// `uncaughtExceptionMonitor` into the file named by ARROKOTHI_VALUE_COST_LOAD, so the probe can tell a
// module that failed to parse from one that threw while loading.
import { writeFileSync, realpathSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import legacyAssert from 'node:assert';
import strictAssert from 'node:assert/strict';

const WITNESS = Symbol.for('arrokothi.value-cost.witness');
const TEST_SIDE = pathToFileURL(resolve(realpathSync(process.cwd()), 'packages/kernel/tests') + sep).href;
const NOT_ASSERTIONS = new Set(['AssertionError', 'CallTracker', 'Assert', 'strict']);

/** Witnessed `AssertionError` objects, each with the name of the assertion function that threw it. */
const witnessed = new WeakMap();
globalThis[WITNESS] = witnessed;

const remember = (error, name) => {
  if (error instanceof strictAssert.AssertionError && !witnessed.has(error)) witnessed.set(error, name);
};

const wrap = (real, name) => function witnessedAssertion(...args) {
  let result;
  try {
    result = Reflect.apply(real, this, args);
  } catch (error) {
    remember(error, name);
    throw error;
  }
  // `rejects` and `doesNotReject` fail asynchronously.
  if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
    return result.then(undefined, (error) => {
      remember(error, name);
      throw error;
    });
  }
  return result;
};

const witnessing = (real, label) => {
  const wrapped = wrap(real, label);
  for (const key of Object.keys(real)) {
    const member = real[key];
    wrapped[key] = typeof member === 'function' && !NOT_ASSERTIONS.has(key) ? wrap(member, `${label}.${key}`) : member;
  }
  wrapped.strict = wrapped;
  return wrapped;
};

const MODULES = {
  'arrokothi-witness:assert': witnessing(legacyAssert, 'assert'),
  'arrokothi-witness:assert/strict': witnessing(strictAssert, 'assert'),
};
globalThis[Symbol.for('arrokothi.value-cost.modules')] = MODULES;

const SPECIFIERS = new Map([
  ['assert', 'arrokothi-witness:assert'],
  ['node:assert', 'arrokothi-witness:assert'],
  ['assert/strict', 'arrokothi-witness:assert/strict'],
  ['node:assert/strict', 'arrokothi-witness:assert/strict'],
]);

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const source = (url) => {
  const module = MODULES[url];
  const lines = [`const module = globalThis[Symbol.for('arrokothi.value-cost.modules')][${JSON.stringify(url)}];`, 'export default module;'];
  for (const key of Object.keys(module)) {
    if (IDENTIFIER.test(key) && key !== 'default') lines.push(`export const ${key} = module[${JSON.stringify(key)}];`);
  }
  if (!Object.keys(module).includes('strict')) lines.push('export const strict = module;');
  return lines.join('\n');
};

registerHooks({
  resolve(specifier, context, next) {
    const target = SPECIFIERS.get(specifier);
    if (target !== undefined && typeof context.parentURL === 'string' && context.parentURL.startsWith(TEST_SIDE)) {
      return { url: target, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (Object.hasOwn(MODULES, url)) return { format: 'module', source: source(url), shortCircuit: true };
    return next(url, context);
  },
});

const loadRecord = process.env.ARROKOTHI_VALUE_COST_LOAD;
process.on('uncaughtExceptionMonitor', (error, origin) => {
  if (loadRecord === undefined) return;
  try {
    writeFileSync(loadRecord, JSON.stringify({ origin, syntax: error instanceof SyntaxError, name: error?.name ?? typeof error }));
  } catch {
    // The probe treats a missing record as an unexplained setup failure.
  }
});
