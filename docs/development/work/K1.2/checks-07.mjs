// Round-7 canonical-correction preservation and local-reference checks. Run from repository root.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
const prior = 'b89a703472397c264743014a5ed2a83c30846f2e';
const h5 = 'd13a82881c5fa11aa8fc48eff83a9472eef595a6';
const base = 'a20d278185eaffc7f8b7489345a3624231ff6e6d';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(git('diff', h5, 'HEAD', '--', 'packages/kernel/src'), '');
console.log('PASS: all runtime source bytes unchanged from H5 (retained through H6).');
const oldTests = git('ls-tree', '-r', '--name-only', prior, 'packages/kernel/tests').split('\n').filter(p => p.endsWith('.ts'));
for (const path of oldTests) {
  const print = s => ts.createPrinter({ removeComments: true }).printFile(ts.createSourceFile(path, s, ts.ScriptTarget.Latest, true));
  assert.equal(print(readFileSync(path, 'utf8')), print(git('show', `${prior}:${path}`)), path);
}
console.log(`PASS: all ${oldTests.length} pre-existing kernel test/helper files retain their printed syntax, including assertions.`);
const ablationPath = 'docs/development/work/K1.2/ablations.mjs';
const old = git('show', `${prior}:${ablationPath}`);
const now = readFileSync(ablationPath, 'utf8');
assert.equal(now.trimEnd(), old.trimEnd());
assert(now.includes('id: "B10 ordinary redelivery rotates the Runtime attempt grant"'));
assert(now.includes('id: "B11 redelivery rotates only a takeover attempt grant"'));
console.log('PASS: all 25 prior ablations plus B10/B11 and runner unchanged.');
const history = git('ls-tree', '-r', '--name-only', prior, 'docs/development/work/K1.2').split('\n').filter(p => /\/(implementation-|review-|validation-|handoff-|cleanup-|integration-|blocker-)/.test(p));
for (const path of history) assert.equal(git('rev-parse', `${prior}:${path}`), git('rev-parse', `HEAD:${path}`), path);
console.log(`PASS: ${history.length} sealed historical files unchanged from H6.`);
for (const path of ['mental-model/concepts/operations.rewrite.md', 'mental-model/concepts/roles.rewrite.md']) assert(!existsSync(path), path);
console.log('PASS: removed rewrite drafts remain absent.');
const changedMM = git('diff', '--name-only', prior, 'HEAD', '--', 'mental-model').split('\n').filter(s => s.length > 0).sort();
const allowedMM = [
  'mental-model/concepts/core.md',
  'mental-model/concepts/identity.md',
  'mental-model/mechanisms/execution-cycle.md',
  'mental-model/mechanisms/integration.md',
  'mental-model/reference.md',
  'mental-model/rewrite-index.md',
  'mental-model/sources.md',
].sort();
assert.deepEqual(changedMM, [...new Set(allowedMM)].sort(), `mental-model change allowlist:\n${changedMM.join('\n')}`);
console.log(`PASS: Layer-3/index changes are exactly the authorized canonical set (${changedMM.length} paths).`);
assert.equal(git('diff', base, 'HEAD', '--', 'packages/core/src', 'packages/sdk/src', 'packages/agents', 'packages/models', 'packages/retrieval', 'packages/interoperability'), '');
console.log('PASS: cumulative candidate changes no legacy/SDK/integration source.');
assert.equal(git('diff', '--check', base, 'HEAD'), '');
let links = 0;
for (const path of ['docs/development/work/K1.2/contract.md', 'docs/development/work/K1.2/decision-01.md', 'docs/development/work/K1.2/blocker-01.md', 'docs/development/002-implemented-kernel-baseline.md', 'mental-model/mechanisms/execution-cycle.md', 'mental-model/concepts/identity.md', 'mental-model/concepts/core.md', 'mental-model/mechanisms/integration.md', 'mental-model/sources.md', 'mental-model/reference.md']) {
  for (const match of readFileSync(path, 'utf8').matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const [rel, anchor] = target.split('#');
    const dest = rel ? resolve(dirname(path), decodeURIComponent(rel)) : resolve(path);
    assert(existsSync(dest), `${path}: ${target}`);
    if (anchor) {
      const headings = [...readFileSync(dest, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map(h => h[1].toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-'));
      assert(headings.includes(decodeURIComponent(anchor)), `${path}: ${target}`);
    }
    links++;
  }
}
console.log(`PASS: ${links} local links/anchors in changed contract, decision, blocker, baseline and canonical pages.`);
console.log('Correction delta:\n' + git('diff', '--stat', prior, 'HEAD'));
console.log('Cumulative candidate:\n' + git('diff', '--shortstat', base, 'HEAD'));
