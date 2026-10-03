// A10 fixture without an await at load time: load first, then one leaf at a time with its hooks.
import { test, describe, beforeEach, afterEach } from 'node:test';
import { appendFileSync } from 'node:fs';

const log = (step: string) => appendFileSync(process.env.FLOOR_ORDER_LOG as string, step + '\n');
log('load:top');
test('a', async () => {
  log('a:start');
  await new Promise((resolve) => setTimeout(resolve, 20));
  log('a:end');
});
log('load:after-a');
describe('suite', () => {
  log('load:suite');
  beforeEach(() => log('suite:beforeEach'));
  afterEach(() => log('suite:afterEach'));
  test('b', async () => {
    log('b:start');
    await new Promise((resolve) => setImmediate(resolve));
    log('b:end');
  });
  test('c', () => log('c'));
  log('load:suite-end');
});
test('d', () => log('d'));
log('load:bottom');
