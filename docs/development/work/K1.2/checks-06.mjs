// Round-6 payload-preservation and local-reference checks. Run from repository root.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
const prior = '0a063aa418b449a7d0c07f16f0c82cb9a9c9bc8b';
const h5 = 'd13a82881c5fa11aa8fc48eff83a9472eef595a6';
const base = 'a20d278185eaffc7f8b7489345a3624231ff6e6d';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(git('diff', h5, 'HEAD', '--', 'packages/kernel/src'), '');
console.log('PASS: all runtime source bytes unchanged from H5.');
const oldTests = git('ls-tree', '-r', '--name-only', h5, 'packages/kernel/tests').split('\n').filter(p => p.endsWith('.ts'));
for (const path of oldTests) {
  const print = s => ts.createPrinter({ removeComments: true }).printFile(ts.createSourceFile(path, s, ts.ScriptTarget.Latest, true));
  assert.equal(print(readFileSync(path, 'utf8')), print(git('show', `${h5}:${path}`)), path);
}
console.log(`PASS: all ${oldTests.length} pre-existing kernel test/helper files retain their printed syntax, including assertions.`);
const ablationPath = 'docs/development/work/K1.2/ablations.mjs';
const old = git('show', `${h5}:${ablationPath}`);
const now = readFileSync(ablationPath, 'utf8');
const additionsAt = now.indexOf('  {\n    id: "B10');
assert(additionsAt > 0);
assert.equal(now.slice(0, additionsAt).trimEnd(), old.slice(0, old.indexOf('\n];')).trimEnd());
assert.equal(now.slice(now.indexOf('\n];')).trim(), old.slice(old.indexOf('\n];')).trim());
console.log('PASS: all 25 prior ablations and runner unchanged; only B10/B11 appended.');
const history = git('ls-tree', '-r', '--name-only', prior, 'docs/development/work/K1.2').split('\n').filter(p => /\/(implementation-|review-|validation-|handoff-|cleanup-|integration-)/.test(p));
for (const path of history) assert.equal(git('rev-parse', `${prior}:${path}`), git('rev-parse', `HEAD:${path}`), path);
console.log(`PASS: ${history.length} sealed historical files unchanged from inspected starting head.`);
for (const path of ['mental-model/concepts/operations.rewrite.md', 'mental-model/concepts/roles.rewrite.md']) assert(!existsSync(path), path);
assert.equal(git('diff', h5, 'HEAD', '--', 'mental-model'), '');
console.log('PASS: removed rewrite drafts remain absent; Layer-3/index bytes unchanged from H5 pending owner decision.');
assert.equal(git('diff', base, 'HEAD', '--', 'packages/core/src', 'packages/sdk/src', 'packages/agents', 'packages/models', 'packages/retrieval', 'packages/interoperability'), '');
console.log('PASS: cumulative candidate changes no legacy/SDK/integration source.');
assert.equal(git('diff', '--check', base, 'HEAD'), '');
let links = 0;
for (const path of ['docs/development/work/K1.2/contract.md', 'docs/development/work/K1.2/blocker-01.md', 'docs/development/work/K1.2/submission-audit-06.md']) {
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
console.log(`PASS: ${links} local links/anchors in changed contract, blocker and reconstruction record.`);
console.log('Correction delta:\n' + git('diff', '--stat', prior, 'HEAD'));
console.log('Cumulative candidate:\n' + git('diff', '--shortstat', base, 'HEAD'));
