// Narrow projections of design-01's generator; no production Kernel imports.
// These exhibit missing dimensions, not 456,976 executed Kernel schedules.
import assert from 'node:assert/strict';
import { test } from 'node:test';

test('A02: first-report-only p cannot detect overwriting an already settled delivery', () => {
  const firstWins = (old, report) => old === 'pending' ? report : old;
  const lastWins = (_old, report) => report; // Plausible removed pending guard.
  // Every p targets a previously unreported capability. Both functions agree on that domain.
  assert.equal(firstWins('pending', 'delivered'), lastWins('pending', 'delivered'));
  // execution-cycle Delivery reporting boundary: repeated/contradictory reports are inert.
  assert.equal(firstWins(firstWins('pending', 'delivered'), 'failed'), 'delivered');
  assert.equal(lastWins(lastWins('pending', 'delivered'), 'failed'), 'failed');
});
test('A03: oldest/newest held-key selection cannot fire the middle retired generation', () => {
  const held = [1, 2, 3]; // S4 e d w: g1 and g2 retired by input, g3 live.
  const keysAddressedByAlphabet = [held[0], held.at(-1)];
  assert.ok(!keysAddressedByAlphabet.includes(2));
  const owned = (key, live) => key === live; // W-3 exact live-generation equality.
  const wrong = (key, live) => live !== null && (key === live || key > 1); // Only first stale key fenced.
  assert.deepEqual(keysAddressedByAlphabet.map(g => owned(g, 3)), keysAddressedByAlphabet.map(g => wrong(g, 3)));
  assert.equal(owned(2, 3), false);
  assert.equal(wrong(2, 3), true);
});
test('A04: a fixed subscription cannot distinguish using the first selector after re-registration', () => {
  const matches = (selector, input) => selector === input; // W-1 application subscription equality.
  const run = (selectors, keepFirst) => {
    let stored;
    return selectors.map(selector => {
      if (!keepFirst || stored === undefined) stored = selector;
      return ['s', 'x'].map(input => matches(stored, input));
    });
  };
  assert.deepEqual(run(['s', 's', 's'], false), run(['s', 's', 's'], true));
  assert.notDeepEqual(run(['s', 'x'], false), run(['s', 'x'], true));
  // Register s, wake, consume; register x. Input s must now stay queued; x must wake.
  assert.equal(matches('x', 's'), false);
  assert.equal(matches('s', 's'), true); // Wrong retained selector would wake.
  assert.equal(matches('x', 'x'), true);
});
test('A05: payload omission makes a destructive cancellation transcript observationally equal', () => {
  const source = { state: 'CANCELLED', mailbox: [{ id: 'E', position: 1, payload: { text: 'keep me' }, disposition: 'terminal' }] };
  const corrupted = { ...source, mailbox: [{ ...source.mailbox[0], payload: null }] };
  const omitPayload = view => ({ ...view, mailbox: view.mailbox.map(({ payload: _ignored, ...row }) => row) });
  assert.deepEqual(omitPayload(source), omitPayload(corrupted));
  assert.notDeepEqual(source, corrupted); // B-4/B-5 keep the accepted Event; disposition is not deletion.
});
test('A06: reaching A3 reporting after cancellation takes six suffix actions from S4', () => {
  // Design: each accepted d makes one capability; p settles the oldest unreported one.
  // S4 prefix d w e d w leaves A1,A2 both unreported and g2 live. e d q makes A3 the cancelled exchange.
  const reports = [false, false, false];
  const prefix = ['e', 'd', 'q'];
  const targetIndex = reports.length - 1;
  let suffixLength = prefix.length;
  while (!reports[targetIndex]) {
    reports[reports.indexOf(false)] = true;
    suffixLength++;
  }
  assert.equal(suffixLength, 6); // e d q p p p, not within the declared four-letter extension.
  // General CX-6 / reporting rule decides it; this is a missing witness, not an undecided schedule.
});
