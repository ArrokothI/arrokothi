// Maintained assertions over the sealed review-03 reproducers. A witness reproduces a held defect;
// it does not assert that the binding is safe. Each invocation is a separate disposable process.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const id = process.argv[2];
const spec = JSON.parse(readFileSync('tests/fixtures/packet-tools/realm-cases.json', 'utf8'));
const entry = spec.cases.find(row => row.id === id);
if (!entry) throw new Error('Unknown realm case');
const argv = entry.argv.map(arg => arg === '$ROOT' ? process.cwd() : arg === '$SERIALIZER'
  ? resolve('node_modules/canonicalize/lib/canonicalize.js') : arg);
const run = spawnSync(process.execPath, argv, { encoding: 'utf8', timeout: 10_000, maxBuffer: 32768 });
if (run.error || run.signal || run.status !== 0) throw new Error('Realm probe setup/termination failure: ' + run.stderr);
const actual = JSON.parse(run.stdout);
delete actual.reviewer;
delete actual.node;
let passed = true;
try { assert.deepEqual(actual, entry.expected); }
catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; passed = false; }
console.log(JSON.stringify({ case: id, assertion: id + '.observation', reached: true, passed,
  profile: entry.profile, actual, correction_owner: entry.correction_owner }));
process.exitCode = passed ? 0 : 17;
