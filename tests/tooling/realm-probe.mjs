// Maintained assertions over the sealed review-03 reproducers. A witness reproduces a held defect;
// it does not assert that the binding is safe. Each invocation is a separate disposable process.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const id = process.argv[2];
const spec = JSON.parse(readFileSync('tests/fixtures/packet-tools/mutations.json', 'utf8'));
const entry = spec.cases.find(row => row.id === id);
if (!entry) throw new Error('Unknown realm case');
const argv = entry.input.argv.map(arg => arg === '$ROOT' ? process.cwd() : arg === '$SERIALIZER'
  ? resolve('node_modules/canonicalize/lib/canonicalize.js') : arg);
const run = spawnSync(process.execPath, argv, { encoding: 'utf8', timeout: 10_000, maxBuffer: 32768 });
if (run.error || run.signal || run.status !== 0) throw new Error('Realm probe setup/termination failure: ' + run.stderr);
const actual = JSON.parse(run.stdout);
delete actual.reviewer;
delete actual.node;
let comparisons = 0;
function agrees(value, expected) {
  comparisons += 1;
  try { assert.deepEqual(value, expected); return true; }
  catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; return false; }
}
const failures = [];
if (!agrees(actual, entry.input.recorded_observation)) failures.push(id + '.observation');
if (agrees({ ...actual, tools01CorruptObservation: true }, entry.input.recorded_observation)) {
  failures.push(id + '.reject-corrupt-observation');
}
const passed = failures.length === 0;
console.log(JSON.stringify({ case: id, assertion: id + '.observation', reached: true, passed,
  comparisons, failures, profile: entry.profile, actual, claim: entry.claim }));
process.exitCode = passed ? 0 : 17;
