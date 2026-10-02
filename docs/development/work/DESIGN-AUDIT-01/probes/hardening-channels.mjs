// Session/model: Codex / GPT-6; local sandboxed runtime access; no acceptance authority.
// Each invocation runs one historical mechanism in a fresh process. This tests
// mutation prevention, not a reconstructed historical Kernel or its whole decision.
const session = 'Codex coding-agent / GPT-6; local sandboxed repository/runtime access; no acceptance authority';
const key = process.argv[2];
const define = Object.defineProperty, descriptor = Object.getOwnPropertyDescriptor;
const channels = {
  mapSet: [Map.prototype, 'set', {value() {}}],
  arrayIndex: [Array.prototype, '0', {get() {return 999;}, set(_) {}}],
  objectIndex: [Object.prototype, '0', {get() {return 999;}, set(_) {}}],
  descriptorGet: [Object.prototype, 'get', {value() {return 999;}}],
  iteratorNext: [Object.getPrototypeOf([][Symbol.iterator]()), 'next', {value() {return {done: true};}}],
  iteratorResult: [Object.prototype, 'done', {get() {return true;}}],
  promiseSpecies: [Promise, Symbol.species, {get() {throw new Error('species');}}],
  hostObject: [Object.prototype, 'isSafeToReplace', {value() {return true;}}],
  hostFunction: [Function.prototype, 'isSafeToReplace', {value() {return true;}}],
  controlScopes: [Object.prototype, 'controlScopes', {value: ['*']}],
  mailboxCapacity: [Object.prototype, 'mailboxCapacity', {value: 0}],
  emissionsPerOutcome: [Object.prototype, 'emissionsPerOutcome', {value: 0}],
  errorName: [Error.prototype, 'name', {get() {return 'steered';}, set(_) {}}],
  historyGetter: [Object.prototype, 'resultingEpoch', {get() {throw new Error('history');}}],
};
let result;
if (key === 'proxyCoherence') {
  const p = new Proxy([1], {get(t, k, r) {return k === '0' ? 2 : Reflect.get(t,k,r);}});
  result = {descriptor: descriptor(p, '0').value, read: p[0], mismatch: true};
} else if (key === 'ownGetter') {
  let calls = 0; const p = {get bound() {calls++; return 1;}};
  result = {value: p.bound, calls};
} else {
  if (!Object.hasOwn(channels,key)) throw new Error('unknown case');
  const [holder, slot, attributes] = channels[key], prior = descriptor(holder, slot);
  // Descriptor conversion must not itself consult the very inherited get being tested.
  const next = Object.assign(Object.create(null), attributes, {configurable: true});
  let mutation;
  try {define(holder, slot, next); mutation = 'installed';} catch(e) {mutation = e.name;}
  if (mutation === 'installed') {if (prior) define(holder, slot, prior); else delete holder[slot];}
  result = {mutation, frozenHolder: Object.isFrozen(holder)};
}
process.stdout.write(JSON.stringify({session, node: process.version, key, ...result}) + '\n');
