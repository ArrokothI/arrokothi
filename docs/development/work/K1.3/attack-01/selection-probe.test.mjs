// Prompt E evidence probe, not a Kernel implementation or an acceptance test.
// Sources: waits.md Selecting / Small distinguishing examples; WS B-2, W-2, W-9.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const event = (id, position, eligible, atWake = true) => ({ id, position, eligible, atWake });
const U = event('U', 1, false);
const E1 = event('E1', 2, true);
const E2 = event('E2', 3, true, false);
const T = event('T', 2, false);
const R = event('R', 3, true, false);
const cases = [
  { name: 'event bound 1', events: [U, E1, E2], mandatory: 'E1', bound: 1, expected: ['E1'] },
  { name: 'spare capacity', events: [U, E1], mandatory: 'E1', bound: 3, expected: ['E1'] },
  { name: 'arrival after wake', events: [U, E1, E2], mandatory: 'E1', bound: 2, expected: ['E1', 'E2'] },
  { name: 'timeout bound 1', events: [U, T, R], mandatory: 'T', bound: 1, expected: ['T'] },
  { name: 'timeout bound 2', events: [U, T, R], mandatory: 'T', bound: 2, expected: ['T', 'R'] },
];
const ordered = xs => [...xs].sort((a, b) => a.position - b.position);
function select(c, rule) {
  const candidates = c.events.filter(e => e.id === c.mandatory ||
    (rule === 'ignore-eligibility' || (e.eligible && (rule !== 'freeze' || e.atWake))));
  if (rule === 'sort-union') return ordered(candidates).slice(0, c.bound).map(e => e.id);
  const mandatory = candidates.find(e => e.id === c.mandatory);
  return ordered([mandatory, ...ordered(candidates.filter(e => e !== mandatory)).slice(0, c.bound - 1)])
    .map(e => e.id);
}
test('A01: the five source examples kill two rules but not sort-the-union', () => {
  const failures = {};
  for (const rule of ['owned', 'ignore-eligibility', 'freeze', 'sort-union']) {
    failures[rule] = cases.filter(c => JSON.stringify(select(c, rule)) !== JSON.stringify(c.expected)).map(c => c.name);
  }
  assert.deepEqual(failures.owned, []);
  assert.ok(failures['ignore-eligibility'].length > 0);
  assert.ok(failures.freeze.length > 0);
  assert.deepEqual(failures['sort-union'], []);
  console.log(JSON.stringify({ fiveExampleFailures: failures }));
});
test('A01: a separating selector input is synthetic, not a reachable expiry history', () => {
  const synthetic = { events: [event('R', 1, true), event('T', 2, false)], mandatory: 'T', bound: 1 };
  assert.deepEqual(select(synthetic, 'owned'), ['T']); // B-2 selection rule, considered in isolation.
  assert.deepEqual(select(synthetic, 'sort-union'), ['R']);
  // W-2 step 2 or W-9 case 4 would already retire the wait on this R: no T could then be minted.
});
test('A14: two ineligible Events expose spare-capacity top-up after mandatory retention', () => {
  const c = { events: [U, event('U2', 2, false), event('T', 3, false)], mandatory: 'T', bound: 3 };
  assert.deepEqual(select(c, 'owned'), ['T']);
  assert.deepEqual(select(c, 'ignore-eligibility'), ['U', 'U2', 'T']);
});
