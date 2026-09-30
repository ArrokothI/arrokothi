// Review-04's sealed X8–X23 mutations, now against direct exact-coordinate oracles, plus V-D1.
// Each mutation gets a disposable package tree. No mutation of candidate or sealed evidence.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
const root = process.cwd();
const sealed = readFileSync('docs/development/work/K1.2-correction-01/review-04/reviewer-ablations.mjs', 'utf8');
assert.equal(createHash('sha256').update(sealed).digest('hex'), '98a6ac4c3c6e520bedffe8b2ff25e089c93c10ec4ca2c9de3766a5aa34909c71');
const definition = sealed.slice(sealed.indexOf('const all = ') + 'const all = '.length, sealed.indexOf('\nconst only =')).replace(/;\s*$/, '');
const mutations = runInNewContext(definition, { C: 'coordinator.ts', E: 'envelope.ts', O: 'outcome.ts' }).filter(m => /^X(?:[89]|1\d|2[0-3]) /.test(m[0]));
assert.equal(mutations.length, 16);
const values = readFileSync('packages/kernel/src/values.ts', 'utf8');
const collector = values.slice(values.indexOf('const pushIssue = '), values.indexOf('\n\n/**', values.indexOf('const pushIssue = ')));
mutations.push(
  ['V1 restore unbounded per-position issues', 'values.ts', collector, 'const pushIssue = (issues: ValueIssue[], issue: ValueIssue): void => { appendOwn(issues, issue); };'],
  ['V2 skip siblings after eight diagnostics', 'values.ts', '  if (state.stopped) return REFUSED;', '  if (state.stopped || state.issues.length >= 8) return REFUSED;'],
  ['V3 count each summarized suffix as one issue', 'envelope.ts', 'const count = occurrences ?? 1;', 'const count = 1;'],
  ['V4 inherited multiplicity affects diagnostics', 'envelope.ts', 'const occurrences = PrimordialGetOwnPropertyDescriptor(issue, "occurrences")?.value as number | undefined;\n    if (occurrences === undefined && details < ISSUE_DETAIL_LIMIT)', 'const occurrences = issue.occurrences;\n    if (occurrences === undefined && details < ISSUE_DETAIL_LIMIT)'],
  ['V5 retain unbounded first-detail messages', 'values.ts', 'message: issueText(issue.message, 1_024, "<message omitted>"),', 'message: issue.message,'],
);
// V2 belongs only at capture entry, not the same spelling in container loops.
const captureAnchor = 'function capture(value: unknown, path: string, level: number, state: CaptureState): Captured {\n  if (state.stopped) return REFUSED;';
mutations[17][2] = captureAnchor;
mutations[17][3] = captureAnchor.replace('state.stopped', 'state.stopped || state.issues.length >= 8');
let rejected = 0;
for (const mutation of [null, ...mutations]) {
  const work = mkdtempSync(join(tmpdir(), 'k12-r4-ablation-'));
  try {
    cpSync(join(root, 'packages/kernel'), join(work, 'packages/kernel'), { recursive: true });
    symlinkSync(resolve(root, 'node_modules'), join(work, 'node_modules'), 'dir');
    if (mutation) {
      const [id, file, find, replacement] = mutation, path = join(work, 'packages/kernel/src', file);
      const source = readFileSync(path, 'utf8');
      assert.equal(source.split(find).length, 2, `unique anchor: ${id}`);
      writeFileSync(path, source.replace(find, replacement));
    }
    const args = ['--experimental-strip-types', '--test', '--test-reporter=spec', 'packages/kernel/tests/exact-coordinates.test.ts', 'packages/kernel/tests/value-refusal-cost.test.ts'];
    const run = spawnSync(process.execPath, args, { cwd: work, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
    const output = (run.stdout ?? '') + (run.stderr ?? '');
    const n = key => Number(new RegExp(`ℹ ${key} (\\d+)`).exec(output)?.[1]);
    const tests = n('tests'), pass = n('pass'), fail = n('fail'), cancelled = n('cancelled');
    assert.ok(!run.error && Number.isFinite(tests) && cancelled === 0 && tests === pass + fail, output);
    if (!mutation) assert.ok(run.status === 0 && fail === 0 && tests === 35, output);
    else if (run.status !== 0 && fail > 0 && pass > 0) rejected++;
    console.log(`${mutation ? run.status !== 0 && fail > 0 ? 'REJECTED' : 'SURVIVED' : 'CONTROL'} ${mutation?.[0] ?? ''}: exit=${run.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled}`);
    for (const match of [...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].slice(0, 4)) console.log('  ' + match[1]);
  } finally { rmSync(work, { recursive: true, force: true }); }
}
console.log(`${rejected}/${mutations.length} revision-4 ablations rejected`);
process.exitCode = rejected === mutations.length ? 0 : 1;
