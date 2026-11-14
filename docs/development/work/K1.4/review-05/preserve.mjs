// Independent, pinned R4-PRESERVE/R4-EVIDENCE audit. Run from the repository root.
// Uses AST structure and exact token text, omitting JSDoc/comment trivia; not the
// implementer's comment-stripping printer. This is evidence tooling, not product code.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const B = '608f9ece44dbe42b78974bdac9e7ddcd33697705';
const P = '1b98a76e625ef187ba179fdad2e823ac4dabd521';
const C = '72d452bb39e0ae0f846d85e273441d06a9cd22fb';
const H = 'e307943d6b315e724e49107c3b26a1100ef4916c';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 32 << 20 });
const at = (rev, path) => git('show', `${rev}:${path}`);
const lines = text => text.trimEnd().split('\n').filter(Boolean);
const diff = (a, b, ...paths) => lines(git('diff', '--name-only', a, b, '--', ...paths));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const log = value => console.log(JSON.stringify(value));

function ast(text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(source.parseDiagnostics.length, 0, `${path}: parse errors`);
  let tokens = 0;
  function visit(node) {
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return null;
    if (node.kind <= ts.SyntaxKind.LastToken) {
      tokens++;
      return [node.kind, node.getText(source)];
    }
    return [node.kind, ...node.getChildren(source).map(visit).filter(x => x !== null)];
  }
  return { tree: visit(source), tokens };
}

log({ B, previous: P, C, H, node: process.version, typescript: ts.version });
assert.equal(git('rev-parse', `${C}^`).trim(), P);
assert.equal(git('rev-parse', `${H}^`).trim(), C);
git('merge-base', '--is-ancestor', B, P);
const specPath = 'docs/development/work/K1.4/verification.json';
const oldSpec = JSON.parse(at(P, specPath)), spec = JSON.parse(at(C, specPath));
assert.equal(at(C, specPath), at(H, specPath));
assert.deepEqual(diff(C, H).sort(), [...spec.administrative_files].sort());
log({ administrative_files: diff(C, H), exact_allowlist: true });

const changed = diff(P, C);
const source = changed.filter(path => path.startsWith('packages/') && path.includes('/src/'));
assert.deepEqual(source, ['packages/sdk/src/application.ts', 'packages/sdk/src/legacy-bridge/driver.ts', 'packages/sdk/src/types.ts']);
for (const path of source) {
  const before = ast(at(P, path), path), after = ast(at(C, path), path);
  assert.deepEqual(after, before, path);
  const options = { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, removeComments: true };
  assert.equal(ts.transpileModule(at(P, path), { compilerOptions: options }).outputText,
    ts.transpileModule(at(C, path), { compilerOptions: options }).outputText, `${path}: JavaScript emit`);
  log({ path, tokens: after.tokens, ast_sha256: digest(after.tree), ast_and_emit_identical: true });
}
// Controls discriminate a real edit and an ASI/newline change even when token text is identical.
assert.deepEqual(ast('/** old */ const x = 1;', 'control.ts'), ast('/** new */ const x = 1;', 'control.ts'));
assert.notDeepEqual(ast('const x = 1;', 'control.ts'), ast('const x = 2;', 'control.ts'));
assert.notDeepEqual(ast('function f(){return 1;}', 'control.ts'), ast('function f(){return\n1;}', 'control.ts'));
log({ controls: ['comment ignored', 'changed literal detected', 'changed ASI structure detected'], passed: true });

// Exhaustive changed-file inventory; no new/deleted production file can hide in the classifier.
const permittedDocuments = [
  'docs/development/002-implemented-kernel-baseline.md', 'docs/development/017-known-limitations.md',
  'docs/development/work/K1.4/design-04.md', 'docs/development/work/K1.4/implementation-03.md',
  'docs/development/work/K1.4/implementation-04.md', 'docs/guides/deployment/quick-start.md',
];
const addedEvidence = ['bridge-suites.log', 'comment-only-control.log', 'comment-only.log', 'comment-only.mjs', 'review-04-probe.log']
  .map(name => `docs/development/work/K1.4/implementation-05/${name}`);
assert.deepEqual([...changed].sort(), [...source, ...permittedDocuments, specPath, ...addedEvidence].sort());
assert.deepEqual(diff(P, H).filter(path => !path.startsWith('docs/') && !source.includes(path)), []);
const allSource = lines(git('ls-tree', '-r', '--name-only', C, '--', 'packages')).filter(p => p.includes('/src/'));
const earlierSource = lines(git('ls-tree', '-r', '--name-only', P, '--', 'packages')).filter(p => p.includes('/src/'));
assert.deepEqual(allSource, earlierSource);
for (const path of allSource.filter(p => !source.includes(p))) assert.equal(at(P, path), at(C, path), path);
log({ changed_files: changed, production_src_files: allSource.length, other_src_files_byte_identical: allSource.length - source.length,
  tests_fixtures_configuration_packages_scripts_unchanged: true, exception: 'verification.json metadata only; checked below' });
const specKeys = [...new Set([...Object.keys(oldSpec), ...Object.keys(spec)])]
  .filter(key => JSON.stringify(oldSpec[key]) !== JSON.stringify(spec[key])).sort();
assert.deepEqual(specKeys, ['administrative_files', 'limits']);
log({ verification_changed_keys: specKeys, checks_inputs_thresholds_preserve_profiles_unchanged: true });

for (const path of ['packages/kernel/src', 'packages/core/src',
  'tests/fixtures/packet-tools/mutations.json', 'tests/fixtures/packet-tools/refusal-guards.json',
  'tests/fixtures/packet-tools/value-cost.json', 'AGENTS.md', 'docs/development/006-development-process.md',
  'docs/development/008-implementation-report.md', 'docs/development/012-review-methods.md']) {
  assert.deepEqual(diff(B, H, path), [], path);
  log({ path, byte_identical_to_B: true });
}
for (const path of permittedDocuments.filter(p => /\/(design|implementation)-\d+\.md$/.test(p))) {
  const patch = git('diff', '--unified=0', P, C, '--', path).split('\n');
  assert.deepEqual(patch.filter(line => line.startsWith('-') && !line.startsWith('---')), [], path);
  for (const hunk of git('diff', '--unified=0', P, C, '--', path).split(/(?=^@@)/m).slice(1)) {
    assert.match(hunk, /Correction, 2026-11-11 \(round 5/);
  }
  log({ historical_record: path, only_dated_insertions: true });
}
const limit = rev => at(rev, 'docs/development/017-known-limitations.md').split('\n').find(l => l.startsWith('| L-37 |'));
assert.equal(limit(P), limit(C));
assert.deepEqual(diff(P, H, 'docs/development/work/K1.4/owner-choice-05.md', 'docs/development/work/K1.4/owner-choice-06.md'), []);
log({ L37_and_owner_choices_unchanged: true, result: 'passed' });
