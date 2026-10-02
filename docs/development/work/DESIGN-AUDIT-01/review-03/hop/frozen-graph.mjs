// Reviewer probe (review-03, Claude Code claude-opus-5-5): which serializer-relevant objects
// does --frozen-intrinsics freeze, and which global bindings stay writable?
const AIP = Object.getPrototypeOf([][Symbol.iterator]());
const objs = {
  'Object': Object, 'Object.prototype': Object.prototype, 'Array': Array, 'Array.prototype': Array.prototype,
  'ArrayIteratorPrototype': AIP, 'IteratorPrototype': Object.getPrototypeOf(AIP), 'Set': Set, 'Set.prototype': Set.prototype,
  'JSON': JSON, 'Error': Error, 'Error.prototype': Error.prototype, 'Symbol': Symbol, 'String.prototype': String.prototype,
  'Function.prototype': Function.prototype, 'Map': Map, 'Map.prototype': Map.prototype, 'Reflect': Reflect, 'Number': Number,
  'Promise': Promise, 'Iterator': globalThis.Iterator, 'globalThis': globalThis,
};
const frozen = Object.fromEntries(Object.entries(objs).map(([k, v]) => [k, v === undefined ? 'absent' : Object.isFrozen(v)]));
const names = ['Map','WeakMap','Promise','Reflect','Number','String','RangeError','TypeError','Math','Uint8Array','structuredClone','queueMicrotask','Iterator'];
const bindings = Object.fromEntries(names.map(n => { const d = Object.getOwnPropertyDescriptor(globalThis, n); return [n, d ? {writable: d.writable, configurable: d.configurable} : 'absent']; }));
process.stdout.write(JSON.stringify({node: process.version, flag: process.execArgv.includes('--frozen-intrinsics'), frozen, bindings}, null, 1) + '\n');
