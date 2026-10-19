/** Review-only Q6 witness. Run with Node v26.10.0 and a clean C tree argument. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const tree = resolve(process.argv[2]);
const { canonicalize } = await import(pathToFileURL(resolve(tree, 'packages/kernel/src/values.ts')).href);
const target = {}; // Keep the WeakRef target live throughout the synchronous capture.
const rows = [];
for (const [kind, value] of [
  ['WeakRef', new WeakRef(target)],
  ['FinalizationRegistry', new FinalizationRegistry(() => {})],
]) {
  Object.setPrototypeOf(value, Object.prototype);
  const result = canonicalize(value);
  assert.equal(result.ok, true);
  assert.equal(result.value.canonical, '{}');
  rows.push({ kind, result });
}
const roadmap = readFileSync(resolve(tree, 'mental-model/roadmap.md'), 'utf8').split('\n');
const index = roadmap.findIndex(line => line.includes('refuses every Proxy and every built-in with internal slots'));
assert.equal(index, -1);
const qualified = roadmap.findIndex(line => line.includes('every built-in whose internal slots a side-effect-free engine test detects'));
assert.ok(qualified >= 0);
console.log(JSON.stringify({
  node: process.version, tree, documentation_claim_holds: true,
  claim: { path: 'mental-model/roadmap.md', line: qualified + 1, text: roadmap[qualified] },
  rows,
  interpretation: 'Review 01 witnesses still receive the Q6-authorized acceptance; the former broad roadmap synopsis is absent and the detectable-kind qualifier is present.',
}, null, 2));
