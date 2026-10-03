// A1 deliberately includes a named assertion failure to inspect both event kinds.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

test('first pass', async () => {
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(1, 1);
});
test('second intentional failure', () => {
  assert.equal(1, 2);
});
describe('outer suite', () => {
  test('nested pass', () => assert.equal(2, 2));
});
