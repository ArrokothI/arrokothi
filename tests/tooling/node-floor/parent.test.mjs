import { test } from 'node:test';
import assert from 'node:assert/strict';

test('parent', async (t) => {
  await t.test('child', () => assert.ok(true));
  assert.equal(1, 2);
});
