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
assert.ok(index >= 0);
console.log(JSON.stringify({
  node: process.version, tree, documentation_claim_holds: false,
  claim: { path: 'mental-model/roadmap.md', line: index + 1, text: roadmap[index] },
  rows,
  interpretation: 'Acceptance is authorized by design-check Q6 and the canonical values owner. The broader changed roadmap synopsis is false; this is a documentation defect, not a demand to refuse these kinds.',
}, null, 2));
