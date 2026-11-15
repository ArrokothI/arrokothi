// Read-only checks of the pinned candidate, not this review's later recording commit.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../../../../..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const B = 'c1951226338de6ccd3e4e6289259549551268f61';
const C = '61ea8126507506b043ce5ba6515073f62c19c42f';
const H = '484afd13d7652958f6496afc56d9aa9c098d58b1';
const specPath = 'docs/development/work/K1.4-candidate/verification.json';
const spec = JSON.parse(git('show', `${H}:${specPath}`));
const changed = (...args) => git('diff', '--name-only', ...args).trim().split('\n').filter(Boolean).sort();
assert.deepEqual(changed(C, H), [...spec.administrative_files].sort());
assert.equal(git('show', `${C}:${specPath}`), git('show', `${H}:${specPath}`));
assert.equal(git('rev-parse', `${B}:packages`), git('rev-parse', `${H}:packages`));
git('merge-base', '--is-ancestor', B, C);
git('merge-base', '--is-ancestor', C, H);
const fixture = 'tests/conformance/k0/';
assert.deepEqual(changed(B, H, '--', fixture),
  ['candidate.ts', 'fixture.ts', 'protocol-vocabulary.ts', 'refusal.test.ts'].map(f => fixture + f).sort());
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, removeComments: true }
}).outputText;
for (const file of ['fixture.ts', 'protocol-vocabulary.ts']) {
  assert.equal(compile(git('show', `${B}:${fixture}${file}`)), compile(git('show', `${H}:${fixture}${file}`)));
}
const oldReason = '`scenario ${scenario.id} requires the target Activation/Outcome protocol, which no packet has implemented yet; ` +\n        `K1.1–K1.3 own create/dispatch, Outcome acceptance and wait/cancellation races`';
const newReason = '`scenario ${scenario.id}: this refusal control implements nothing of the target Activation/Outcome protocol and claims nothing about it; ` +\n        `the candidate that drives the real Kernel is kernelCandidate in tests/conformance/k0-candidate`';
const oldCandidate = git('show', `${B}:${fixture}candidate.ts`);
assert.equal(oldCandidate.split(oldReason).length - 1, 1);
assert.equal(compile(oldCandidate.replace(oldReason, newReason)), compile(git('show', `${H}:${fixture}candidate.ts`)));
assert.equal(compile(git('show', `${B}:${fixture}refusal.test.ts`).replace(
  'K0 public fixture: the current tree refuses the target protocol',
  'K0 public fixture: the refusal control refuses every scenario')),
  compile(git('show', `${H}:${fixture}refusal.test.ts`)));
console.log(JSON.stringify({ B, C, H, result: 'scope_verified', administrativeFiles: changed(C, H),
  packagesTree: git('rev-parse', `${H}:packages`).trim(),
  fixture: 'Comments, refusal reason, and describe title only; other executable bytes preserved after transpilation.' }, null, 2));
