"""K1.1-correction-03 review 01 (KC3-R1-EVID-02): the value-cost probe credits only a reached assertion.

Provenance: review 01's `probe-evidence-attribution.py` (Codex, `gpt-6-astra`, 2026-10-13) showed that the
previous probe called a parse failure or a module-load throw in `values.ts` a selected-test failure, which
TOOLS-01's runner then classified `killed`. Design 02 §1.2 gives the probe an evidence contract: a kill
needs a selected test that failed at an assertion that a test-side module imported. Every other failure
exits 3, which the runner's unchanged parser refuses (`setup_error`), and the probe's JSON names the state.

Each control runs the real probe and the real runner (`command`, `execution_outcome`) on a temporary tree:
- the review's two negative controls and a passing control, on a copy of the repository's capture code
  with the real `value-cost.unit-table` case, plus a genuine kill by that case's registered mutant;
- synthetic cases for every other state: a test-side assertion, a harness helper's `assert.fail`, an async
  assertion, a subject exception raised while an assertion's arguments are evaluated, an `AssertionError`
  thrown by the subject or built by it and rethrown by the test, a hook failure, a cancelled subtest, no
  selection, a hang and an inner output overflow.
"""
from pathlib import Path
import json
import os
import shutil
import tempfile
import unittest

from test_packet_tools import tool

REPO = Path(__file__).resolve().parents[2]
PROBE_FILES = ['tests/tooling/value-cost-probe.mjs', 'tests/tooling/value-cost-witness.mjs', 'tests/tooling/value-cost-reporter.mjs']
REGISTRY = 'tests/fixtures/packet-tools/value-cost.json'
ENVIRONMENT = {name: os.environ[name] for name in ('PATH', 'HOME', 'TMPDIR') if name in os.environ}
ENVIRONMENT['LANG'] = 'C.UTF-8'


def case(identifier, file, pattern, timeout=120, **extra):
    return {'id': identifier, 'category': 'value-cost', 'assertion': f'{identifier}.selected-tests',
            'input': {'file': file, 'pattern': pattern, **extra}, 'failure_exit': 17,
            'argv': ['node', '--no-warnings', '--experimental-strip-types', 'tests/tooling/value-cost-probe.mjs', identifier],
            'timeout_seconds': timeout, 'output_limit_bytes': 32768}


class ProbeFixture(unittest.TestCase):
    def tree(self):
        directory = tempfile.TemporaryDirectory(prefix='value-cost-probe-test-')
        self.addCleanup(directory.cleanup)
        root = Path(directory.name)
        for relative in PROBE_FILES:
            (root / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(REPO / relative, root / relative)
        return root

    def run_case(self, root, entry):
        run = tool.command(entry['argv'], root, entry['timeout_seconds'], entry['output_limit_bytes'], ENVIRONMENT)
        outcome = tool.execution_outcome(run, entry)
        observation = json.loads(run['output']) if run['status'] == 'finished' else None
        return run, outcome, observation


class RepositoryControls(ProbeFixture):
    """Review 01's controls on a copy of the real capture code and the real `value-cost.unit-table` case."""

    def copy(self):
        root = self.tree()
        shutil.copytree(REPO / 'packages/kernel/src', root / 'packages/kernel/src')
        shutil.copytree(REPO / 'packages/kernel/tests', root / 'packages/kernel/tests')
        for relative in ['package.json', 'tsconfig.json', REGISTRY]:
            (root / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(REPO / relative, root / relative)
        (root / 'node_modules').symlink_to(REPO / 'node_modules', target_is_directory=True)
        entry = next(row for row in json.loads((root / REGISTRY).read_text())['cases'] if row['id'] == 'value-cost.unit-table')
        return root, entry

    def test_passing_control(self):
        root, entry = self.copy()
        run, outcome, observation = self.run_case(root, entry)
        self.assertEqual((run['exit'], observation['state']), (0, 'passed'))
        self.assertGreater(observation['leaves'], 0)
        self.assertTrue(tool.observation(run, entry)['reached'] and tool.observation(run, entry)['passed'], 'a valid control')
        self.assertEqual(outcome['status'], 'survived')

    def test_a_genuine_selected_assertion_failure_is_a_kill(self):
        """Positive control: the case's registered mutant 'visit unit uncharged' fails an exact unit count."""
        root, entry = self.copy()
        mutant = next(row for row in entry['mutants'] if row['name'] == 'visit unit uncharged')
        self.assertIsNone(tool.apply_edits(root, tool.mutation_edits(mutant)))
        run, outcome, observation = self.run_case(root, entry)
        self.assertEqual((observation['state'], outcome['status']), ('assertion_failed', 'killed'))
        self.assertTrue(all(name.startswith('packages/kernel/tests/capture-work.test.ts > ') and name.endswith(']')
                            for name in observation['failures']))

    def test_review_01_parse_failure_is_not_a_kill(self):
        root, entry = self.copy()
        source = root / 'packages/kernel/src/values.ts'
        source.write_text(source.read_text() + '\nconst = ;\n')
        run, outcome, observation = self.run_case(root, entry)
        self.assertEqual((run['exit'], observation['state'], observation['reached']), (3, 'parse_error', False))
        self.assertEqual(observation['leaves'], 0)
        self.assertEqual(outcome['status'], 'setup_error')

    def test_review_01_module_load_throw_is_not_a_kill(self):
        root, entry = self.copy()
        source = root / 'packages/kernel/src/values.ts'
        source.write_text(source.read_text() + '\nthrow new Error("independent-review setup failure");\n')
        run, outcome, observation = self.run_case(root, entry)
        self.assertEqual((run['exit'], observation['state'], observation['reached']), (3, 'load_error', False))
        self.assertEqual(outcome['status'], 'setup_error')


SUBJECT = """import assert from 'node:assert/strict';
export const throwing = () => { throw new TypeError('Getter must be a function: 1'); };
export const internalAssertion = () => { assert.equal(1, 3, 'subject-internal'); };
export const madeAssertion = () => new assert.AssertionError({ message: 'built by the subject', stackStartFn: madeAssertion });
"""

HELPER = """import assert from 'node:assert/strict';
export function accepted(result) {
  if (!result.ok) assert.fail(`expected acceptance, got ${result.error}`);
  return result.value;
}
"""

TESTS = """import assert from 'node:assert/strict';
import { describe, test, beforeEach } from 'node:test';
import { throwing, internalAssertion, madeAssertion } from '../src/subject.mjs';
import { accepted } from './helper.mjs';

test('control passes', () => { assert.equal(1, 1); });
test('a selected assertion fails', () => { assert.equal(1, 2); });
test('a harness helper fails through assert.fail', () => { accepted({ ok: false, error: 'refused' }); });
test('an async assertion rejects', async () => { await assert.rejects(Promise.resolve(1)); });
test('the subject throws while an assertion argument is evaluated', () => { assert.equal(throwing(), 1); });
test('the subject throws its own assertion error', () => { internalAssertion(); });
test('the test rethrows an assertion error the subject built', () => { throw madeAssertion(); });
describe('a hook fails', () => {
  beforeEach(() => { throw new Error('hook'); });
  test('hooked leaf', () => { assert.equal(1, 1); });
});
test('a subtest is cancelled', { timeout: 100 }, async (t) => { await t.test('cancelled child', () => new Promise((done) => setTimeout(done, 2000))); });
test('a hang', () => { for (;;) {} });
test('a noisy test', () => { process.stdout.write('x'.repeat(4096)); assert.equal(1, 1); });
"""


class SyntheticControls(ProbeFixture):
    """Every other evidence state, on a synthetic case whose pattern selects exactly one test."""

    def synthetic(self, *entries):
        root = self.tree()
        for relative, text in [('packages/kernel/src/subject.mjs', SUBJECT), ('packages/kernel/tests/helper.mjs', HELPER),
                               ('packages/kernel/tests/synthetic.test.mjs', TESTS)]:
            (root / relative).parent.mkdir(parents=True, exist_ok=True)
            (root / relative).write_text(text)
        (root / REGISTRY).parent.mkdir(parents=True, exist_ok=True)
        (root / REGISTRY).write_text(json.dumps({'version': 1, 'cases': list(entries)}))
        return root

    def observe(self, pattern, **extra):
        timeout = extra.pop('timeout', 120)
        entry = case('synthetic', 'packages/kernel/tests/synthetic.test.mjs', pattern, timeout, **extra)
        return self.run_case(self.synthetic(entry), entry)

    def assertState(self, pattern, state, status, exit_code, **extra):
        run, outcome, observation = self.observe(pattern, **extra)
        self.assertEqual((observation['state'], outcome['status'], run['exit']), (state, status, exit_code), observation)
        return observation

    def test_control_passes(self):
        self.assertState('^control passes$', 'passed', 'survived', 0)

    def test_a_test_side_assertion_is_a_kill(self):
        observation = self.assertState('^a selected assertion fails$', 'assertion_failed', 'killed', 17)
        self.assertEqual(observation['failures'], ['packages/kernel/tests/synthetic.test.mjs > a selected assertion fails [assert.equal]'])

    def test_a_harness_helper_assertion_is_a_kill(self):
        observation = self.assertState('^a harness helper fails through assert.fail$', 'assertion_failed', 'killed', 17)
        self.assertTrue(observation['failures'][0].endswith('[assert.fail]'))

    def test_an_async_assertion_is_a_kill(self):
        self.assertState('^an async assertion rejects$', 'assertion_failed', 'killed', 17)

    def test_an_exception_while_arguments_are_evaluated_is_not_a_kill(self):
        """Review 01's ingress O-DEFINEDATA-LITERAL shape: the subject throws before the assertion runs."""
        observation = self.assertState('^the subject throws while an assertion argument is evaluated$', 'subject_exception', 'setup_error', 3)
        self.assertEqual(observation['nonqualifying'][0]['cause']['name'], 'TypeError')

    def test_a_subject_assertion_error_is_not_a_kill(self):
        observation = self.assertState('^the subject throws its own assertion error$', 'subject_exception', 'setup_error', 3)
        self.assertEqual(observation['nonqualifying'][0]['cause']['code'], 'ERR_ASSERTION')

    def test_an_assertion_error_the_subject_built_is_not_a_kill(self):
        """TOOLS-01 owner choice 09's objection: such an error carries only test frames, yet it is not witnessed."""
        self.assertState('^the test rethrows an assertion error the subject built$', 'subject_exception', 'setup_error', 3)

    def test_a_hook_failure_is_not_a_kill(self):
        self.assertState('^a hook fails', 'hook_failure', 'setup_error', 3)

    def test_a_cancelled_subtest_is_not_a_kill(self):
        self.assertState('^a subtest is cancelled', 'cancelled', 'setup_error', 3)

    def test_no_selection_is_uncovered(self):
        observation = self.assertState('^nothing matches this$', 'no_selection', 'uncovered', 17)
        self.assertEqual(observation['leaves'], 0)

    def test_a_hang_is_the_runner_timeout(self):
        run, outcome, _ = self.observe('^a hang$', timeout=3)
        self.assertEqual((run['status'], outcome['status']), ('timeout', 'timeout'))

    def test_an_inner_output_overflow_is_not_a_kill(self):
        self.assertState('^a noisy test$', 'output_limit', 'setup_error', 3, inner_output_bytes=1024)


if __name__ == '__main__':
    unittest.main()
