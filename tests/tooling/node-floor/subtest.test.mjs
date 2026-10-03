// A9 fixture: a t.test subtest beside a sibling; full-path selection is checked, not assumed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('parent', async (t) => {
  await t.test('child', () => assert.ok(true));
  await t.test('sibling', () => assert.ok(true));
});
