// Minimal diagnostic for the A7 run's cancellation; no keepalive or runtime patch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTimeoutInlineBudget } from '../../../packages/core/src/reference/inline-wait.ts';

test('unreferenced timeout with outstanding work', async () => {
  const budget = createTimeoutInlineBudget(50);
  const result = await budget.race(new Promise<string>(() => {}));
  assert.deepEqual(result, { settled: false });
});
