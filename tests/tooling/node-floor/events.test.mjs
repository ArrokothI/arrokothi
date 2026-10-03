// A1 deliberately includes a named assertion failure to inspect both event kinds.
import { test, describe, suite, it } from 'node:test';
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
suite('failing suite', () => {
  it('nested intentional failure', () => assert.equal(3, 4));
});
describe('empty suite', () => {});
test('parent test', async (t) => {
  await t.test('subtest', () => assert.equal(5, 5));
});
