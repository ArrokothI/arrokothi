// K1.3: runs one mutant family's killing test files under node:test with the assertion reporter
// (design 01 addendum 01 § A3). A kill is a failure of a named killer that is an assertion failure, or a
// failure whose message names the family's declared owner guard or invariant. A loader failure, a changed
// or skipped test inventory, any other failure, or only unrelated failures can never become a kill.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const family = process.argv[2];
const specification = JSON.parse(readFileSync('tests/fixtures/packet-tools/k13-controls.json', 'utf8'));
const expected = specification.families[family];
if (!expected) throw new Error('Unknown family');
const run = spawnSync(process.execPath, ['--no-warnings', '--experimental-strip-types', '--test',
  '--test-reporter=./tests/tooling/assertion-reporter.mjs', ...expected.files], {
  encoding: 'utf8', timeout: 300_000, maxBuffer: 8_000_000,
});
if (run.error || run.signal || ![0, 1].includes(run.status)) throw new Error('Probe child setup/termination failure');
const observations = JSON.parse(run.stdout);
if (observations.length !== expected.test_count || observations.some(row => row.skipped)) {
  throw new Error('Test inventory changed or skipped');
}
const byName = new Map(observations.map(row => [row.name, row]));
if (expected.killers.some(name => !byName.has(name))) throw new Error('Missing killer');
const failures = observations.filter(row => !row.passed);
const recognised = row => row.code === 'ERR_ASSERTION' || (typeof expected.guard === 'string' && typeof row.message === 'string' && row.message.includes(expected.guard));
if (failures.some(row => !recognised(row))) throw new Error('A failure that is neither an assertion nor the declared guard: ' + failures.filter(row => !recognised(row)).map(row => `${row.name}: ${row.message}`).join('; '));
if ((failures.length === 0) !== (run.status === 0)) throw new Error('Exit/result disagreement');
const named = failures.filter(row => expected.killers.includes(row.name));
if (failures.length && !named.length) throw new Error('Only unrelated tests failed: ' + failures.map(row => row.name).join('; '));
const passed = failures.length === 0;
console.log(JSON.stringify({ case: `k13.${family}`, assertion: `k13.${family}.killed`,
  reached: true, passed, failures: [...new Set(named.map(row => row.name))], tests: observations.length, skipped: 0 }));
process.exitCode = passed ? 0 : 17;
