// A10 fixture: load-time code after an await, at module level and in a suite callback.
import { test, describe } from 'node:test';
import { appendFileSync } from 'node:fs';

const log = (step: string) => appendFileSync(process.env.FLOOR_ORDER_LOG as string, step + '\n');
log('load:top');
test('a', async () => {
  log('a:start');
  await new Promise((resolve) => setTimeout(resolve, 50));
  log('a:end');
});
describe('async suite', async () => {
  log('load:suite-before-await');
  await new Promise((resolve) => setTimeout(resolve, 10));
  log('load:suite-after-await');
  test('b', () => log('b'));
});
log('load:before-await');
await new Promise((resolve) => setTimeout(resolve, 10));
log('load:after-await');
test('c', () => log('c'));
