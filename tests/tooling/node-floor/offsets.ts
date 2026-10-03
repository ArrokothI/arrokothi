import { test } from 'node:test';
import assert from 'node:assert/strict';

type Input = { value: number };
const unicode = '🛰';
function typedProbe<T extends Input>(input: T): number {
  const actual: number = input.value;
  assert.equal(actual, 7);
  return actual;
}
test('original TypeScript offsets', () => {
  assert.equal(typedProbe<Input>({ value: 7 }), 7);
  assert.equal(unicode.length, 2);
});
