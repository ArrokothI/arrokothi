// K1.1-correction-03 registry probe (tests/fixtures/packet-tools/value-cost.json): runs the named
// maintained tests of one case and reports one JSON observation.
//
// Evidence contract (review 01, KC3-R1-EVID-02; design 02 §1.2). A kill needs a reached qualifying
// assertion: a selected test ran in a process that loaded and completed, and it failed with
// `testCodeFailure` whose cause is an `AssertionError` thrown by an assertion function that a test-side
// module imported (`value-cost-witness.mjs`). Exactly one state is reported per run:
//
//   passed            a selected test ran, every one passed, nothing failed, exit 0     -> exit 0
//   assertion_failed  a selected test failed at a witnessed assertion                    -> exit 17, reached
//   no_selection      the run completed and no selected test ran                         -> exit 17, unreached
//   anything else     spawn_error, output_limit, parse_error, load_error, setup_error,   -> exit 3
//                     hook_failure, cancelled, test_timeout, subject_exception,
//                     unattributed_failure
//
// Exit 3 is neither 0 nor the case's failure_exit, so TOOLS-01's parser refuses the observation and the
// runner records a non-credit `setup_error`; this JSON, which the runner keeps, names the precise state.
// The probe sets no timeout of its own: the runner's case timeout kills the process group and records
// `timeout`. The assertions live in the maintained test files only.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sourcePolicy } from './value-cost-source-policy.mjs';
import { createHash } from 'node:crypto';

const NONQUALIFYING_EXIT = 3;
const id = process.argv[2];
const entry = JSON.parse(readFileSync('tests/fixtures/packet-tools/value-cost.json', 'utf8')).cases.find((row) => row.id === id);
const { file, pattern, additional_files = [] } = entry.input;
const certificate = sourcePolicy(process.cwd(), JSON.parse(readFileSync('tests/fixtures/packet-tools/value-cost-source-files.json', 'utf8')));
const source = { ...certificate, sha256: createHash('sha256').update(JSON.stringify(certificate.files)).digest('hex') };
if (!source.ok) {
  const state = source.violations.some(row => row.reason === 'parse_error') ? 'parse_error' : 'source_policy';
  console.log(JSON.stringify({ case:id, assertion:entry.assertion, reached:false, passed:false, state,
    leaves:0, pass:0, fail:0, failures:[], nonqualifying:[], source, claim:entry.claim }));
  process.exit(3);
}
const innerOutput = entry.input.inner_output_bytes ?? 64 * 1024 * 1024;
const side = mkdtempSync(join(tmpdir(), 'value-cost-probe-'));
const events = join(side, 'events.jsonl');
const load = join(side, 'load.json');

const run = spawnSync(process.execPath, [
  '--experimental-strip-types', '--no-warnings',
  '--import', './tests/tooling/value-cost-witness.mjs',
  '--test-reporter=./tests/tooling/value-cost-reporter.mjs', `--test-reporter-destination=${events}`,
  `--test-name-pattern=${pattern}`, ...(additional_files.length ? ['--test'] : []), file, ...additional_files,
], { encoding: 'utf8', maxBuffer: innerOutput, env: { ...process.env, ARROKOTHI_VALUE_COST_LOAD: load } });

const readLines = (path) => {
  try {
    return readFileSync(path, 'utf8').split('\n').filter((line) => line !== '').map((line) => JSON.parse(line));
  } catch {
    return null;
  }
};
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
};
const lines = readLines(events);
const loadFailure = readJson(load);
rmSync(side, { recursive: true, force: true });

const bounded = (list) => list;
// The runner executes each case in a fresh temporary tree. Report test and assertion locations relative
// to that tree, so a repeated run (the registry's determinism sample) observes the same structure.
const roots = [...new Set([process.cwd(), realpathSync(process.cwd())])].flatMap((root) => [root + sep, pathToFileURL(root + sep).href]);
const relative = (text) => {
  if (typeof text !== 'string') return text;
  const root = roots.find((prefix) => text.startsWith(prefix));
  return root === undefined ? text : text.slice(root.length);
};
const at = (declaration) => (declaration === null || declaration === undefined ? declaration : { ...declaration, file: relative(declaration.file) });
const site = (witness) => (witness === null || witness === undefined ? witness : { ...witness, module: relative(witness.module) });
const leaf = (line) => line.type === 'test';
const executed = (lines ?? []).filter((line) => (line.event === 'pass' || line.event === 'fail') && leaf(line) && !line.skip && !line.todo);
const witnessed = executed.filter((line) => line.event === 'fail' && line.failureType === 'testCodeFailure' && line.witnessed !== null);
// A suite (or a test with subtests) fails with `subtestsFailed` because a child did; that is not a failure of its own.
const failures = (lines ?? []).filter((line) => line.event === 'fail' && line.failureType !== 'subtestsFailed');
const nonqualifying = failures.filter((line) => !witnessed.includes(line));
const summary = (lines ?? []).find((line) => line.event === 'summary');
const started = (lines ?? []).some((line) => line.event === 'start');

let state;
if (run.error !== undefined) state = run.error.code === 'ENOBUFS' ? 'output_limit' : 'spawn_error';
else if (run.signal !== null) state = 'signal';
else if (lines === null || summary === undefined) state = started ? 'setup_error' : loadFailure?.syntax === true ? 'parse_error' : loadFailure !== null ? 'load_error' : 'setup_error';
else if (witnessed.length > 0) state = 'assertion_failed';
else if (executed.length === 0 && failures.length === 0) state = 'no_selection';
else if (failures.length === 0 && run.status === 0 && run.signal === null) state = 'passed';
else {
  const first = nonqualifying[0];
  state = first === undefined ? 'unattributed_failure'
    : first.failureType === 'hookFailed' ? 'hook_failure'
    : first.failureType === 'cancelledByParent' ? 'cancelled'
    : first.failureType === 'testTimeoutFailure' ? 'test_timeout'
    : first.failureType === 'testCodeFailure' && leaf(first) ? 'subject_exception'
    : 'unattributed_failure';
}

const reached = state === 'passed' || state === 'assertion_failed';
const passed = state === 'passed';
const exit = state === 'passed' ? 0 : state === 'assertion_failed' || state === 'no_selection' ? entry.failure_exit : NONQUALIFYING_EXIT;
const named = state === 'assertion_failed'
  ? bounded(witnessed.map((line) => `${relative(line.declaration?.file) ?? file} > ${line.name} [${line.witnessed.kind}]`))
  : state === 'passed' ? [] : [`${entry.assertion}: ${state}`];
console.log(JSON.stringify({
  case: id, assertion: entry.assertion, reached, passed, state,
  leaves: executed.length, pass: executed.filter((line) => line.event === 'pass').length, fail: executed.filter((line) => line.event === 'fail').length,
  failures: named,
  observations: executed.map(({ name, path, declaration, event, failureType, witnessed, cause }) => ({ name, path, declaration: at(declaration), event, failureType, witnessed: site(witnessed), cause })),
  witnesses: witnessed.map(({ name, path, declaration, witnessed }) => ({ name, path, declaration: at(declaration), ...site(witnessed) })),
  source,
  nonqualifying: bounded(nonqualifying.map((line) => ({ name: line.name, path: line.path, declaration: at(line.declaration), type: line.type, failureType: line.failureType, cause: line.cause }))),
  load: loadFailure, status: run.status, signal: run.signal, claim: entry.claim,
}));
process.exitCode = exit;
