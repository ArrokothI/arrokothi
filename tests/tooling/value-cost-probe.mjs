// K1.1-correction-03 registry probe (tests/fixtures/packet-tools/value-cost.json): runs the named
// maintained tests of one case and reports one JSON observation. The assertions live in the maintained
// test files only; a mutant is killed when a selected test fails, and a case with no selected test is
// reported unreached rather than passed.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const id = process.argv[2];
const entry = JSON.parse(readFileSync('tests/fixtures/packet-tools/value-cost.json', 'utf8'))
  .cases.find(row => row.id === id);
const { file, pattern, timeout_ms: timeout } = entry.input;
const run = spawnSync(process.execPath, [
  '--test', '--experimental-strip-types', '--no-warnings', '--test-reporter=tap',
  `--test-name-pattern=${pattern}`, file,
], { encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
const count = name => {
  const found = (run.stdout ?? '').match(new RegExp(`^# ${name} (\\d+)$`, 'm'));
  return found === null ? -1 : Number(found[1]);
};
const pass = count('pass');
const fail = count('fail');
const reached = pass + fail > 0;
const passed = reached && fail === 0 && run.status === 0 && run.signal === null;
const failures = passed ? [] : [entry.assertion];
console.log(JSON.stringify({ case: id, assertion: entry.assertion, reached, passed, pass, fail,
  status: run.status, signal: run.signal, failures, claim: entry.claim }));
process.exitCode = passed ? 0 : 17;
