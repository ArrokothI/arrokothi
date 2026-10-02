// Reviewer probe (DESIGN-AUDIT-01 review 03; Claude Code, claude-opus-5-5). Varies the *hop* of a
// global-binding replacement: instead of assigning globalThis.JSON (object environment record), a
// coherent Proxy trap mid-capture runs a classic script whose top-level `let JSON` lands in the global
// declarative record, which identifier resolution consults first. Expectation per ECMA-262
// GlobalDeclarationInstantiation/HasRestrictedGlobalProperty: shadowing succeeds when the binding is
// configurable (flag-only) and throws SyntaxError when it is pinned non-configurable.
// Usage: node [--frozen-intrinsics] lexical-shadow-probe.mjs <path to canonicalize.js> [pinned]
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
const { default: canonicalize } = await import(pathToFileURL(process.argv[2]).href);
const pinned = process.argv[3] === 'pinned';
const saved = { JSON: globalThis.JSON };
const define = Object.defineProperty, reflectGet = Reflect.get, getDescriptor = Object.getOwnPropertyDescriptor;
if (pinned) for (const k of ['isNaN','isFinite','Object','Array','JSON','Set','Error','Symbol'])
  define(globalThis, k, { value: globalThis[k], writable: false, configurable: false });
const input = { b: 2, a: [1, 'x'] };
const before = canonicalize(input);
let shadow = '', trapCalls = 0;
const caller = new Proxy({ payload: input }, { get(target, key, receiver) {
  trapCalls++;
  try { vm.runInThisContext("let JSON = { stringify: (x) => typeof x === 'number' ? '999' : globalThis.JSON.stringify(x) };"); shadow = 'declared'; }
  catch (e) { shadow = e.name; }
  return reflectGet(target, key, receiver);
}});
const descriptor = getDescriptor(caller, 'payload');
const snapshot = reflectGet(caller, 'payload');
if (snapshot !== descriptor.value) throw new Error('incoherent probe');
let after; try { after = canonicalize(snapshot); } catch (e) { after = 'throws: ' + e.message; }
const globalJSONUnchanged = globalThis.JSON === saved.JSON;
process.stdout.write(saved.JSON.stringify({ reviewer: 'Claude Code claude-opus-5-5 (review 03)', node: process.version,
  frozen: process.execArgv.includes('--frozen-intrinsics'), pinned, shadow, trapCalls, globalJSONUnchanged, before, after,
  steered: before !== after }) + '\n');
