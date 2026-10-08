// N15 survived an earlier suite: keep an explicit value recipe and count visits, never milliseconds.
// The load-time observation wrapper runs in this disposable child only.
import { readFileSync } from 'node:fs';
const entry = JSON.parse(readFileSync('tests/fixtures/packet-tools/mutations.json', 'utf8'))
  .cases.find(row => row.id === 'work-charge.array-surplus');
const { recipe, expected_visits } = entry.input;
let tracked;
let visits = 0;
const names = Object.getOwnPropertyNames;
Object.getOwnPropertyNames = function (value) {
  if (value === tracked) visits += 1;
  return names(value);
};
const { canonicalize } = await import('../../packages/kernel/src/values.ts');
Object.getOwnPropertyNames = names;
tracked = Array(recipe.array_length);
for (let index = 0; index < recipe.extra_names; index += 1) tracked[recipe.name_prefix + index] = recipe.value;
const result = canonicalize(Array(recipe.root_repetitions).fill(tracked));
// Root punctuation is 4097 units; each empty array plus 256 surplus names costs 258.
// The first visit beyond (1048576 - 4097) / 258 is visit 4049.
const failures = [];
if (visits !== expected_visits) failures.push('work-charge.array-surplus.exact-visits');
if (result.ok || !result.issues.some(issue => issue.code === 'too_many_bytes')) {
  failures.push('work-charge.array-surplus.byte-stop');
}
const passed = failures.length === 0;
console.log(JSON.stringify({ case: 'work-charge.array-surplus', assertion: 'work-charge.array-surplus.exact-visits',
  reached: visits > 0, passed, visits, failures, claim: entry.claim }));
process.exitCode = passed ? 0 : 17;
