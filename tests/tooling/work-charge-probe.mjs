// N15 survived an earlier suite: keep an explicit value recipe and count visits, never milliseconds.
// The load-time observation wrapper runs in this disposable child only.
let tracked;
let visits = 0;
const names = Object.getOwnPropertyNames;
Object.getOwnPropertyNames = function (value) {
  if (value === tracked) visits += 1;
  return names(value);
};
const { canonicalize } = await import('../../packages/kernel/src/values.ts');
Object.getOwnPropertyNames = names;
tracked = [];
for (let index = 0; index < 256; index += 1) tracked[`x${index}`] = 0;
const result = canonicalize(Array(4096).fill(tracked));
// Root punctuation is 4097 units; each empty array plus 256 surplus names costs 258.
// The first visit beyond (1048576 - 4097) / 258 is visit 4049.
const failures = [];
if (visits !== 4049) failures.push('work-charge.array-surplus.exact-visits');
if (result.ok || !result.issues.some(issue => issue.code === 'too_many_bytes')) {
  failures.push('work-charge.array-surplus.byte-stop');
}
const passed = failures.length === 0;
console.log(JSON.stringify({ case: 'work-charge.array-surplus', assertion: 'work-charge.array-surplus.exact-visits',
  reached: visits > 0, passed, visits, failures, correction_owner: 'V-D1 hold remains; count only the existing surplus charge' }));
process.exitCode = passed ? 0 : 17;
