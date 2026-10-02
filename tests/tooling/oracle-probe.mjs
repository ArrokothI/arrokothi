// Adapter for the maintained complete-decision oracle's own independent negative controls.
// A test loader failure or an arbitrary nonzero exit can never become a kill.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const name = process.argv[2];
const specification = JSON.parse(readFileSync('tests/fixtures/packet-tools/oracle-controls.json', 'utf8'));
const expected = specification.controls[name];
if (!expected) throw new Error('Unknown comparison');
const witness = resolve('.oracle-reach.json');
const run = spawnSync(process.execPath, ['--no-warnings', '--experimental-strip-types', '--test',
  '--import', './tests/tooling/oracle-reach.mjs', '--test-reporter=./tests/tooling/assertion-reporter.mjs',
  'packages/kernel/tests/fault-oracle.test.ts'], {
  encoding: 'utf8', timeout: 180_000, maxBuffer: 900_000,
  env: { ...process.env, PACKET_ORACLE_CHECK: name, PACKET_REACH_FILE: witness },
});
if (run.error || run.signal || ![0, 1].includes(run.status)) throw new Error('Oracle child setup/termination failure');
const observations = JSON.parse(run.stdout);
const reach = JSON.parse(readFileSync(witness, 'utf8'));
if (reach.name !== name || !Number.isInteger(reach.calls)) throw new Error('Invalid reach witness');
if (observations.length !== specification.test_count || observations.some(row => row.skipped)) {
  throw new Error('Oracle test inventory changed or skipped');
}
const byName = new Map(observations.map(row => [row.name, row]));
if (byName.size !== observations.length || expected.some(test => !byName.has(test))) throw new Error('Missing/duplicate control');
const failures = observations.filter(row => !row.passed);
if (failures.some(row => row.code !== 'ERR_ASSERTION')) throw new Error('Non-assertion failure');
if ((failures.length === 0) !== (run.status === 0)) throw new Error('Exit/result disagreement');
const named = failures.filter(row => expected.includes(row.name));
if (failures.length && !named.length) throw new Error('Only unrelated controls failed');
const passed = failures.length === 0;
console.log(JSON.stringify({ case: `oracle.${name}`, assertion: `oracle.${name}.negative-control`,
  reached: reach.calls > 0, passed, calls: reach.calls, failures: named.map(row => row.name),
  tests: observations.length, skipped: 0 }));
process.exitCode = passed ? 0 : 17;
