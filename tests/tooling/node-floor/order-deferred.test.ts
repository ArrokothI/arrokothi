// A10 fixture: a registration site inside a function that runs later than a later site.
import { test } from 'node:test';
import { appendFileSync } from 'node:fs';

const log = (step: string) => appendFileSync(process.env.FLOOR_ORDER_LOG as string, step + '\n');
function registerEarlierSite() {
  test('x', () => log('x'));
}
test('y', () => log('y'));
registerEarlierSite();
