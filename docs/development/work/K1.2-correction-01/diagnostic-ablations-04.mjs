// Distinguish the eliminated per-position work from mere output truncation.
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root = process.cwd(), path = 'packages/kernel/src/values.ts';
const current = readFileSync(path, 'utf8');
const previous = execFileSync('git', ['show', `3287640f045cf2e6adeefcd32f21d897480a6a7d:${path}`], { encoding: 'utf8' });
const describe = source => source.slice(source.indexOf('const describe = '), source.indexOf('\n\n// A fixed over-limit', source.indexOf('const describe = ')));
const start = describe(current);
const mutations = [
  ['T1 restore all diagnostic constructor/name lookups', start, describe(previous)],
  ['T2 reintroduce one diagnostic constructor read', start, 'const describe = (value: unknown): string => { if (value !== null && (typeof value === "object" || typeof value === "function")) { const type = (value as { constructor?: unknown }).constructor; void type; } return value === null ? "null" : typeof value; };'],
  ['T3 array inspection of thrown/revoked values', start, 'const describe = (value: unknown): string => { PrimordialArrayIsArray(value); return value === null ? "null" : typeof value; };'],
  ['T4 remove the pre-read oversized-string guard', '  if (units > 2 * BOUNDARY_LIMITS.stringScalarValues) return TOO_LONG;\n', ''],
];
let rejected = 0, controlCount;
for (const mutation of [null, ...mutations]) {
  const work = mkdtempSync(join(tmpdir(), 'k12-r4-diagnostic-ablation-'));
  try {
    cpSync(join(root, 'packages/kernel'), join(work, 'packages/kernel'), { recursive: true });
    symlinkSync(resolve(root, 'node_modules'), join(work, 'node_modules'), 'dir');
    if (mutation) {
      assert.equal(current.split(mutation[1]).length, 2, mutation[0]);
      writeFileSync(join(work, path), current.replace(mutation[1], mutation[2]));
    }
    const run = spawnSync(process.execPath, ['--test', '--test-reporter=spec', 'packages/kernel/tests/value-diagnostic-work.test.ts'], { cwd: work, encoding: 'utf8', timeout: 60_000 });
    const output = run.stdout + run.stderr;
    const n = key => Number(new RegExp(`^ℹ ${key} (\\d+)`, 'm').exec(output)?.[1]);
    assert.ok(!run.error && run.signal === null && n('cancelled') === 0 && n('skipped') === 0 && n('tests') === n('pass') + n('fail'), output);
    if (!mutation) { assert.equal(run.status, 0, output); assert.equal(n('fail'), 0); controlCount = n('tests'); }
    else { assert.equal(n('tests'), controlCount); if (run.status !== 0 && n('fail') > 0) rejected++; }
    console.log(`${mutation ? n('fail') > 0 ? 'REJECTED' : 'SURVIVED' : 'CONTROL'} ${mutation?.[0] ?? 'diagnostic work'}: exit=${run.status} tests=${n('tests')} pass=${n('pass')} fail=${n('fail')}`);
    for (const failure of new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map(m => m[1]))) console.log(`  ${failure}`);
  } finally { rmSync(work, { recursive: true, force: true }); }
}
assert.equal(rejected, mutations.length);
console.log(`${rejected}/${mutations.length} diagnostic/string-work mutations rejected; whole-packet review remains separate`);
