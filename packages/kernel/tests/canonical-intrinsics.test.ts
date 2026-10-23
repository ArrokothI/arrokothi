import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CODEC_FILES, intrinsicViolations } from './canonical-intrinsics.ts';

test('B1-4 decoder, encoder, identity text and transitive local helpers use load-time intrinsics', () => {
  assert.deepEqual(intrinsicViolations(), []);
});
for (const [file, needle, replacement] of [
  ['canonical-bytes.ts', 'const value = PrimordialNumber(', 'const value = Number('],
  ['canonical-bytes.ts', 'return PrimordialApply(PrimordialNumberText, value, [10]) as string;', 'return JSON.stringify(value);'],
  ['canonical-bytes.ts', 'const unit = unitAt(text, index);', 'const unit = text.charCodeAt(index);'],
  ['canonical-bytes.ts', 'const unit = unitAt(text, index);', 'const unit = Number.prototype.valueOf.call(1);'],
  ['envelope.ts', 'const problem = identityTextIssue(value);', 'const problem = JSON.parse("null");'],
  ['own-array.ts', 'const descriptor = PrimordialObjectCreate(null)', 'const descriptor = Object.create(null)'],
] as const) {
  test(`B1-4 negative control ${file}: ${replacement}`, () => {
    const path = CODEC_FILES.find(p => p.endsWith('/' + file))!;
    const text = readFileSync(path, 'utf8'); assert.ok(text.includes(needle));
    const failures = intrinsicViolations(new Map([[path, text.replace(needle, replacement)]]));
    assert.ok(failures.some(f => /call-time/.test(f)), failures.join('\n'));
  });
}
