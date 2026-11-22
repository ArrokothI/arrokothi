// Fixed-revision scope checks; runnable after the review is committed.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const B = 'c1951226338de6ccd3e4e6289259549551268f61';
const C = '7392e4a640c07c9a2989464cd2a979938c37ee25';
const H = '14a7ef485282ab2c16d08702be5d61cfeb9997e7';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trimEnd();
git('merge-base', '--is-ancestor', B, C); git('merge-base', '--is-ancestor', C, H);
const specPath = 'docs/development/work/K1.4-candidate/verification.json';
const spec = JSON.parse(git('show', `${C}:${specPath}`));
assert.equal(git('show', `${C}:${specPath}`), git('show', `${H}:${specPath}`));
const administration = git('diff', '--name-only', C, H).split('\n').sort();
assert.deepEqual(administration, [...spec.administrative_files].sort());
const trees = {};
for (const path of ['packages', 'scripts', 'tests/tooling']) {
  const base = git('rev-parse', `${B}:${path}`); const head = git('rev-parse', `${H}:${path}`);
  assert.equal(base, head); trees[path] = { base, head, identical: true };
}
const fixtureChanges = git('diff', '--name-only', B, H, '--', 'tests/conformance/k0').split('\n');
assert.deepEqual(fixtureChanges, ['candidate.ts', 'fixture.ts', 'protocol-vocabulary.ts', 'refusal.test.ts'].map(f => `tests/conformance/k0/${f}`));
const ts = createRequire(import.meta.url)('typescript');
const transpile = (rev, path) => ts.transpileModule(git('show', `${rev}:${path}`), {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, removeComments: true },
}).outputText;
const fixtureBehavior = {};
for (const name of ['fixture.ts', 'protocol-vocabulary.ts']) {
  const path = `tests/conformance/k0/${name}`;
  assert.equal(transpile(B, path), transpile(H, path)); fixtureBehavior[name] = 'executable text identical';
}
const refusal = 'tests/conformance/k0/refusal.test.ts';
assert.equal(transpile(B, refusal).replace('the current tree refuses the target protocol', 'the refusal control refuses every scenario'), transpile(H, refusal));
fixtureBehavior['refusal.test.ts'] = 'only describe title changes';
const candidate = 'tests/conformance/k0/candidate.ts';
const oldReason = '`scenario ${scenario.id} requires the target Activation/Outcome protocol, which no packet has implemented yet; ` +\n                `K1.1–K1.3 own create/dispatch, Outcome acceptance and wait/cancellation races`';
const newReason = '`scenario ${scenario.id}: this refusal control implements nothing of the target Activation/Outcome protocol and claims nothing about it; ` +\n                `the candidate that drives the real Kernel is kernelCandidate in tests/conformance/k0-candidate`';
assert.equal(transpile(B, candidate).replace(oldReason, newReason), transpile(H, candidate));
fixtureBehavior['candidate.ts'] = 'only refusal reason changes';
console.log(JSON.stringify({ result: 'scope_verified', B, C, H, administration, trees, fixtureBehavior }, null, 2));
