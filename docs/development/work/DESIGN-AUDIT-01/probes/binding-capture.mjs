// Session/model: Codex / GPT-6; local sandboxed source access; no product edits or acceptance authority.
// Independent mechanism model, not a replacement Kernel capture. One coherent caller read
// mutates a binding; the unmodified installed serializer then reads the captured ordinary data.
import canonicalize from 'canonicalize';
const session = 'Codex coding-agent / GPT-6; local sandboxed repository/runtime access; no acceptance authority';
const names = ['isNaN', 'isFinite', 'Object', 'Array', 'JSON', 'Set', 'Error', 'Symbol'];
const saved = Object.fromEntries(names.map(k => [k, globalThis[k]]));
const define = Object.defineProperty, getDescriptor = Object.getOwnPropertyDescriptor;
const getPrototype = Object.getPrototypeOf, reflectGet = Reflect.get;
const name = process.argv[2], pinned = process.argv[3] === 'pinned';
if (!names.includes(name) && name !== 'prototype-comparison') throw new Error('unknown case');
const input = {b: 2, a: [1, 'x']};
const before = canonicalize(input);
const replacements = {
  isNaN: () => true, isFinite: () => false,
  Object: {keys: o => saved.Object.keys(o).filter(k => k !== 'b')},
  Array: {isArray: () => false},
  JSON: {stringify: x => typeof x === 'number' ? '999' : saved.JSON.stringify(x)},
  Set: class {has() {return true;} add() {} delete() {}},
  Error: class extends saved.Error {constructor(message) {super('replacement: ' + message);}},
  Symbol: function replacementSymbol() {},
};
if (pinned) for (const k of names) define(globalThis, k, {value: saved[k], writable: false, configurable: false});
let replacement = '', trapCalls = 0;
function replace(k, value) {
  try {globalThis[k] = value; replacement = globalThis[k] === value ? 'replaced' : 'unchanged';}
  catch (e) {replacement = e.name;}
}
let result;
if (name === 'prototype-comparison') {
  const foreign = {};
  const value = new Proxy(Object.create(foreign), {getPrototypeOf(target) {
    trapCalls++; replace('Object', {prototype: foreign}); return getPrototype(target);
  }});
  const prototype = getPrototype(value);
  result = {liveAccepted: prototype === globalThis.Object.prototype, primordialAccepted: prototype === saved.Object.prototype};
} else {
  const caller = new Proxy({payload: input}, {get(target, key, receiver) {
    trapCalls++; replace(name, replacements[name]); return reflectGet(target, key, receiver);
  }});
  const descriptor = getDescriptor(caller, 'payload');
  const snapshot = reflectGet(caller, 'payload');
  if (snapshot !== descriptor.value) throw new saved.Error('incoherent probe');
  let after, errorPath;
  try {after = canonicalize(snapshot);} catch(e) {after = 'throws: ' + e.message;}
  // Error is resolved only on invalid/cyclic input. Symbol has no explicit global
  // read in this dependency version: for-of uses the engine's well-known symbol.
  if (name === 'Error') {try {canonicalize(NaN);} catch(e) {errorPath = e.message;}}
  result = {before, after, ...(errorPath === undefined ? {} : {errorPath})};
}
if (!pinned) for (const k of names) globalThis[k] = saved[k];
process.stdout.write(saved.JSON.stringify({session, node: process.version, name, pinned,
  frozen: process.execArgv.includes('--frozen-intrinsics'), replacement, trapCalls, ...result}) + '\n');
