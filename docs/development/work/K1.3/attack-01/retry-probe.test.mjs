// CX-6 records scoped identity + canonical content. These caches are mutants, not implementation.
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Fixed-shape tuples suffice for these particular scalar examples; not a replacement for E-7.
const exactKey = p => JSON.stringify([p.execution, p.activation, p.epoch, p.base, p.progress, p.emission, p.wait]);
const coarseKey = p => JSON.stringify([p.execution, p.activation, p.epoch, p.base, p.wait]);
const proposal = { execution: 'X', activation: 'A1', epoch: 1, base: 0, progress: 'first', emission: 'one', wait: 's@10' };
function cache(keyOf) {
  const entries = new Map();
  return { entries, submit(p) {
    const key = keyOf(p);
    if (!entries.has(key)) entries.set(key, { proposal: structuredClone(p), classification: 'cancellation_terminal_conflict', reason: 'cancellation accepted before Outcome acceptance' });
    return entries.get(key);
  } };
}
test('A07: equal fresh envelopes must replay by content, not object identity', () => {
  const fresh = structuredClone(proposal);
  const correct = cache(exactKey);
  assert.equal(correct.submit(proposal), correct.submit(fresh));
  const weak = new WeakMap();
  weak.set(proposal, 'recorded rejection');
  assert.equal(weak.get(fresh), undefined); // r alone always reuses proposal, so would miss this.
});
test('A08: changed progress or Emission must not alias the old losing proposal', () => {
  const correct = cache(exactKey);
  const mutant = cache(coarseKey);
  const first = correct.submit(proposal);
  const wrongFirst = mutant.submit(proposal);
  for (const changed of [{ ...proposal, progress: 'second' }, { ...proposal, emission: 'two' }]) {
    assert.notEqual(correct.submit(changed), first);
    assert.equal(mutant.submit(changed), wrongFirst);
  }
  assert.equal(correct.entries.size, 3);
  assert.equal(mutant.entries.size, 1);
  assert.equal(correct.submit(structuredClone(proposal)), first);
  // Source requires correctly bound evidence and exact replay. Whether a different loser gets
  // this binding's own new refusal object is design §10's proposal, not a universal wire rule.
});
test('A09: accepted replay must precede cancellation, including an earlier exchange', () => {
  const receipts = new Map([['A1', { key: exactKey(proposal), token: 'receipt-1' }]]);
  const lookup = p => receipts.get(p.activation)?.key === exactKey(p) ? receipts.get(p.activation).token : null;
  assert.equal(lookup(structuredClone(proposal)), 'receipt-1');
  assert.equal(lookup({ ...proposal, progress: 'changed' }), null);
  // Expected: changed content under accepted A1 is duplicate_conflict, not CX-6 (OA-2).
  // After an A2 Outcome is submitted, c/w/z/k select A2 and r repeats that last submission.
  // No letter chooses retained A1 now. Before an A2 submission, r CAN still address A1.
  // Raising depth does not add arbitrary historical-envelope selection.
});
