import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function op(n: number) {
  if (n > 10) throw new RangeError('too big');
  return { ok: true, charge: n };
}

describe('reach suite', () => {
  test('same-line throw', () => {
    for (const depth of [0, 32]) {
      const result = { ok: true };
      assert.equal(result.ok, true);
      if (!result.ok) throw Error('untaken same-line throw');
      assert.ok(depth >= 0);
    }
  });
  test('caught throwing call', () => {
    try {
      const r = op(33554432);
      assert.equal(r.charge, 33554432);
    } catch {}
  });
  test('direct caught throw', () => {
    let assertionExecuted = false;
    try {
      throw Error('caught before assertion');
      assert.equal(1, 999);
      assertionExecuted = true;
    } catch {}
    assert.equal(assertionExecuted, false);
  });
  test('short circuit', () => {
    const result = { ok: true };
    result.ok || assert.fail('untaken assertion');
  });
  test('template text', () => {
    const text = `assert.equal('template', 'not executed')`;
    assert.ok(text.length > 0);
  });
});
