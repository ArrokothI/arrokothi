// Independent runtime checks of table premises, in this disposable Node process only.
import assert from 'node:assert/strict';

const observations = {};
for (const [name, invoke] of [
  ['Object.keys', () => Object.keys(Object.prototype)],
  ['Object.getOwnPropertyNames', () => Object.getOwnPropertyNames(Object.prototype)],
  ['Reflect.ownKeys', () => Reflect.ownKeys(Object.prototype)],
]) {
  const first = invoke(), second = invoke();
  assert.notEqual(first, second);
  assert(first.every(key => typeof key === 'string' || typeof key === 'symbol'));
  observations[name] = { fresh: true, primitive_elements_only: true };
}
for (const [name, value] of [
  ['Object.isFrozen', Object.isFrozen(Object.prototype)],
  ['Object.hasOwn', Object.hasOwn(Object.prototype, 'toString')],
  ['Array.isArray', Array.isArray(Object.prototype)],
]) {
  assert.equal(typeof value, 'boolean');
  observations[name] = { primitive_boolean: true };
}

let escaped;
const serialized = JSON.stringify(Object.prototype, function(key, value) {
  if (key === '') {
    escaped = value;
    value.__check03 = 42;
  }
  return value;
});
assert.equal(escaped, Object.prototype);
assert.equal(Object.prototype.__check03, 42);
delete Object.prototype.__check03;
observations.stringify = { intrinsic_argument_mutated_by_replacer: true, serialized };

const key = {toString() { this.changed = true; return 'x'; }};
Object.hasOwn(Object.prototype, key);
assert.equal(key.changed, true);
observations.hasOwn = { argument_mutated_by_coercion: true };

const object = {};
assert.equal(JSON.parse('{}', () => object), object);
observations.parse = { reviver_can_return_existing_object: true };
const regexp = /x/;
assert.equal(RegExp(regexp), regexp);
assert.notEqual(new RegExp(regexp), regexp);
observations.regexp = { call_can_return_argument: true, new_is_distinct: true };
const promise = Promise.resolve(1);
assert.equal(Promise.resolve(promise), promise);
observations.promiseResolve = { can_return_argument: true };

const allInput = Promise.resolve(1);
let thenCalled = false;
allInput.then = function(resolve) { this.changed = true; thenCalled = true; resolve(1); };
await Promise.all([allInput]);
assert.equal(thenCalled, true);
assert.equal(allInput.changed, true);
observations.promiseAll = { calls_input_then_and_can_mutate_input: true };

const retained = {};
assert.equal(new Error('x', {cause: retained}).cause, retained);
observations.error = { fresh_error_can_hold_cause_argument: true };

for (const path of ['Number.NaN', 'Number.POSITIVE_INFINITY', 'Number.NEGATIVE_INFINITY',
  'Symbol.iterator', 'Symbol.asyncIterator', 'Symbol.hasInstance', 'Symbol.isConcatSpreadable',
  'Symbol.species', 'Symbol.toPrimitive', 'Symbol.toStringTag']) {
  const [root, key] = path.split('.');
  const descriptor = Object.getOwnPropertyDescriptor(globalThis[root], key);
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
  assert(['number', 'symbol'].includes(typeof descriptor.value));
  observations[path] = { immutable_primitive: true };
}
console.log(JSON.stringify({node: process.version, observations}, null, 2));
