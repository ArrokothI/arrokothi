/** BINDING-01 owner direction: the wrapper retains C1's snapshot obligation directly. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalize } from '../src/internal/value-capture.ts';

test('C1 SDK wrapper snapshot owns and freezes every caller container', () => {
  const caller = { object: { count: 1 }, array: [{ label: 'original' }, [2, 3]] };
  const captured = canonicalize(caller);
  assert.equal(captured.ok, true);
  if (!captured.ok) return;
  const value = captured.value.value as typeof caller;
  assert.notStrictEqual(value, caller);
  assert.notStrictEqual(value.object, caller.object);
  assert.notStrictEqual(value.array, caller.array);
  assert.notStrictEqual(value.array[0], caller.array[0]);
  assert.notStrictEqual(value.array[1], caller.array[1]);
  for (const container of [value, value.object, value.array, value.array[0], value.array[1]]) {
    assert.equal(Object.isFrozen(container), true);
  }
  caller.object.count = 99;
  (caller.array[0] as { label: string }).label = 'changed';
  (caller.array[1] as number[]).push(4);
  caller.array.push({ label: 'added' });
  caller.object = { count: 100 };
  assert.deepEqual(value, { object: { count: 1 }, array: [{ label: 'original' }, [2, 3]] });
  assert.equal(captured.value.canonical, '{"array":[{"label":"original"},[2,3]],"object":{"count":1}}');
});
