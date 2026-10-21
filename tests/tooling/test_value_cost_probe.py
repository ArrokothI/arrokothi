"""K1.1-correction-03 review 01 (KC3-R1-EVID-02): the value-cost probe credits only a reached assertion.

Provenance: review 01's `probe-evidence-attribution.py` (Codex, `gpt-6-astra`, 2026-10-13) showed that the
previous probe called a parse failure or a module-load throw in `values.ts` a selected-test failure, which
TOOLS-01's runner then classified `killed`. Design 02 §1.2 gives the probe an evidence contract: a kill
needs a selected test that failed at an assertion that a test-side module imported. Every other failure
exits 3, which the runner's unchanged parser refuses (`setup_error`), and the probe's JSON names the state.

Each control runs the real probe and the real runner (`command`, `execution_outcome`) on a temporary tree:
- the review's two negative controls and a passing control, on a copy of the repository's capture code
  with the real `value-cost.unit-table` case, plus a genuine kill by that case's registered mutant;
- synthetic cases for every other state: a test-side assertion, a helper's `assert.fail`, the harness's
  `accepted`/`refused` failing on their own condition (and not credited when they throw for another
  reason), an async assertion, a subject exception raised while an assertion's arguments are evaluated, an
  `AssertionError` thrown by the subject or built by it and rethrown by the test, a hook failure, a
  cancelled subtest, no selection, a hang and an inner output overflow.
"""
from pathlib import Path
import json
import os
import shutil
import tempfile
import unittest

from test_packet_tools import tool

REPO = Path(__file__).resolve().parents[2]
PROBE_FILES = ['tests/tooling/value-cost-probe.mjs', 'tests/tooling/value-cost-witness.mjs', 'tests/tooling/value-cost-reporter.mjs', 'tests/tooling/value-cost-source-policy.mjs']
REGISTRY = 'tests/fixtures/packet-tools/value-cost.json'
ENVIRONMENT = {name: os.environ[name] for name in ('PATH', 'HOME', 'TMPDIR') if name in os.environ}
ENVIRONMENT['LANG'] = 'C.UTF-8'


def case(identifier, file, pattern, timeout=120, **extra):
    return {'id': identifier, 'category': 'value-cost', 'assertion': f'{identifier}.selected-tests',
            'input': {'file': file, 'pattern': pattern, **extra}, 'failure_exit': 17,
            'argv': ['node', '--no-warnings', '--experimental-strip-types', 'tests/tooling/value-cost-probe.mjs', identifier],
            'timeout_seconds': timeout, 'output_limit_bytes': 1048576}


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
        inventory = root / 'tests/fixtures/packet-tools/value-cost-source-files.json'
        inventory.parent.mkdir(parents=True, exist_ok=True)
        if not inventory.exists():
            inventory.write_text(json.dumps(sorted(str(p.relative_to(root)) for p in (root/'packages').rglob('*')
                if p.is_file() and 'src' in p.relative_to(root).parts and p.suffix in ('.js','.mjs','.cjs','.ts','.mts','.cts','.tsx','.jsx'))))
        if not (root/'node_modules').exists():
            (root/'node_modules').symlink_to(REPO/'node_modules', target_is_directory=True)
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
        shutil.copytree(REPO / 'packages/sdk/src/internal', root / 'packages/sdk/src/internal')
        shutil.copytree(REPO / 'packages/sdk/tests', root / 'packages/sdk/tests')
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
        self.assertTrue(all(name.startswith('packages/sdk/tests/capture-work.test.ts > ') and name.endswith(']')
                            for name in observation['failures']))

    def test_repeated_runs_observe_the_same_structure(self):
        """Round 4: the registry's determinism sample repeats a case in a fresh tree and compares the observations,
        so test and assertion locations are reported relative to the tree, for a control and for a kill."""
        _, entry = self.copy()
        mutant = next(row for row in entry['mutants'] if row['name'] == 'visit unit uncharged')
        runs = []
        for edits in ([], tool.mutation_edits(mutant)):
            pair = []
            for _ in range(2):
                root, entry = self.copy()
                if edits:
                    self.assertIsNone(tool.apply_edits(root, edits))
                pair.append(self.run_case(root, entry)[2])
            self.assertEqual(pair[0], pair[1])
            runs.append(pair[0])
        self.assertEqual([runs[0]['state'], runs[1]['state']], ['passed', 'assertion_failed'])
        self.assertEqual({row['declaration']['file'] for row in runs[0]['observations']}, {'packages/sdk/tests/capture-work.test.ts'})
        self.assertEqual({row['module'] for row in runs[1]['witnesses']}, {'packages/sdk/tests/capture-work.test.ts'})

    def test_review_01_parse_failure_is_not_a_kill(self):
        root, entry = self.copy()
        source = root / 'packages/sdk/src/internal/value-capture.ts'
        source.write_text(source.read_text() + '\nconst = ;\n')
        run, outcome, observation = self.run_case(root, entry)
        self.assertEqual((run['exit'], observation['state'], observation['reached']), (3, 'parse_error', False))
        self.assertEqual(observation['leaves'], 0)
        self.assertEqual(outcome['status'], 'setup_error')

    def test_review_01_module_load_throw_is_not_a_kill(self):
        root, entry = self.copy()
        source = root / 'packages/sdk/src/internal/value-capture.ts'
        source.write_text(source.read_text() + '\nthrow new Error("independent-review setup failure");\n')
        run, outcome, observation = self.run_case(root, entry)
        self.assertEqual((run['exit'], observation['state'], observation['reached']), (3, 'load_error', False))
        self.assertEqual(outcome['status'], 'setup_error')


SUBJECT = """export const throwing = () => { throw new TypeError('Getter must be a function: 1'); };
export const internalAssertion = error => { throw error; };
export const madeAssertion = error => error;
"""

HELPER = """import assert from 'node:assert/strict';
export function unwrap(result) {
  if (!result.ok) assert.fail(`expected acceptance, got ${result.error}`);
  return result.value;
}
"""

# Actual design-03 harness conditions and message evaluation; no synthetic witness.
HARNESS = """import assert from 'node:assert/strict';
export function accepted(result) {
  if (!result.ok) assert.fail(`expected acceptance, got ${result.error.classification}: ${result.error.reason}`);
  return result.value;
}
export function refused(result) {
  if (result.ok) assert.fail('expected a refusal, but the request was accepted');
  return result.error;
}
"""

TESTS = """import assert from 'node:assert/strict';
import { describe, test, beforeEach } from 'node:test';
import { throwing, internalAssertion, madeAssertion } from '../src/subject.mjs';
import { unwrap } from './helper.mjs';
import { accepted, refused } from './harness.ts';

test('control passes', () => { assert.equal(1, 1); });
test('a selected assertion fails', () => { assert.equal(1, 2); });
test('a helper fails through assert.fail', () => { unwrap({ ok: false, error: 'refused' }); });
test('the harness accepted() fails on a refusal', () => { accepted({ ok: false, error: { classification: 'malformed_value', reason: 'r' } }); });
test('the harness refused() fails on an acceptance', () => { refused({ ok: true, value: 1 }); });
test('the harness accepted() throws for another reason', () => { accepted(null); });
test('an async assertion rejects', async () => { await assert.rejects(Promise.resolve(1)); });
test('the subject throws while an assertion argument is evaluated', () => { assert.equal(throwing(), 1); });
test('the subject throws its own assertion error', () => { internalAssertion(new assert.AssertionError({message:'supplied by test'})); });
test('the test rethrows an assertion error the subject built', () => { throw madeAssertion(new assert.AssertionError({message:'supplied by test'})); });
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
                               ('packages/kernel/tests/harness.ts', HARNESS), ('packages/kernel/tests/synthetic.test.mjs', TESTS)]:
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

    def test_a_helper_assertion_is_a_kill(self):
        observation = self.assertState('^a helper fails through assert.fail$', 'assertion_failed', 'killed', 17)
        self.assertTrue(observation['failures'][0].endswith('[assert.fail]'))

    def test_the_harness_unwrappers_are_kills_on_their_own_condition(self):
        """Review 01 found 15 of 23 runs without ERR_ASSERTION failing through these; they are assertions."""
        observation = self.assertState('^the harness accepted\\(\\) fails on a refusal$', 'assertion_failed', 'killed', 17)
        self.assertTrue(observation['failures'][0].endswith('[assert.fail]'))
        observation = self.assertState('^the harness refused\\(\\) fails on an acceptance$', 'assertion_failed', 'killed', 17)
        self.assertTrue(observation['failures'][0].endswith('[assert.fail]'))

    def test_a_harness_error_outside_its_condition_is_not_a_kill(self):
        self.assertState('^the harness accepted\\(\\) throws for another reason$', 'subject_exception', 'setup_error', 3)

    def test_an_async_assertion_is_not_a_kill(self):
        self.assertState('^an async assertion rejects$', 'subject_exception', 'setup_error', 3)

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


class VocabularyControls(ProbeFixture):
    def snippet(self, body, expected='subject_exception', subject=SUBJECT, imports=''):
        root = self.tree()
        entry = case('vocabulary', 'packages/kernel/tests/vocabulary.test.mjs', '^selected$')
        for path, text in [('packages/kernel/src/subject.mjs', subject),
                           ('packages/kernel/tests/vocabulary.test.mjs', "import assert from 'node:assert/strict';\nimport {test} from 'node:test';\nimport * as subject from '../src/subject.mjs';\n" + imports + "\ntest('selected', async () => {" + body + "});"),
                           (REGISTRY,json.dumps({'cases':[entry]}))]:
            (root/path).parent.mkdir(parents=True,exist_ok=True)
            (root/path).write_text(text)
        _, outcome, observed = self.run_case(root,entry)
        self.assertEqual(observed['state'],expected,observed)
        self.assertEqual(outcome['status'],'killed' if expected=='assertion_failed' else 'survived' if expected=='passed' else 'setup_error',observed)
        return observed

    def test_synchronous_vocabulary_with_passing_counterparts(self):
        for bad, good in [
            ('assert(false)','assert(true)'), ('assert.ok(false)','assert.ok(true)'),
            ('assert.equal(1,2)','assert.equal(1,1)'), ('assert.notEqual(1,1)','assert.notEqual(1,2)'),
            ('assert.deepEqual({a:[1]}, {a:[2]})','assert.deepEqual({a:[1]}, {a:[1]})'),
            ('assert.notDeepEqual([1],[1])','assert.notDeepEqual([1],[2])'),
            ('assert.fail()','assert.equal(null,null)'), ('assert.fail("message")','assert.ok(true,"message")'),
            ('assert.match("abc",/z/)','assert.match("abc",/b/)'),
            ('assert.doesNotMatch("abc",/b/)','assert.doesNotMatch("abc",/z/)'),
            ('await Promise.resolve(); assert.equal(1,2)','await Promise.resolve(); assert.equal(1,1)'),
        ]:
            with self.subTest(bad=bad):
                row=self.snippet(bad,'assertion_failed')
                self.assertEqual(row['witnesses'][0]['kind'].split('.')[0],'assert')
                self.assertGreater(row['witnesses'][0]['anchor']['line'],0)
                self.assertTrue(row['witnesses'][0]['module'].endswith('vocabulary.test.mjs'))
                self.snippet(good,'passed')

    def test_review_02_false_credit_routes(self):
        error="new assert.AssertionError({message:'test supplied error'})"
        snippets=[
            f'assert.doesNotThrow(() => subject.internalAssertion({error}))',
            f'await assert.doesNotReject(async () => subject.internalAssertion({error}))',
            f'const x={{get a(){{throw {error}}}}}; assert.deepEqual(x,{{a:1}})',
            f'assert.throws(() => {{throw Error("subject")}}, () => {{throw {error}}})',
            'assert.throws(() => {throw Error("subject")}, () => {assert.fail("inner")})',
            'assert.doesNotThrow(() => {assert.fail("inner")})',
            'await assert.doesNotReject(async () => {await Promise.resolve(); assert.fail("inner")})',
            'await assert.rejects(async () => {}, () => {assert.fail("inner")})',
            'assert.equal(1,2, new Error("unsafe message"))',
            'assert.ok({value:true},"truthy plain data does not qualify") ; assert.ok(0)',
            'assert.deepEqual(new Proxy({}, {ownKeys(){throw Error("trap")}}),{})',
            'assert.deepEqual(Object.create({get constructor(){throw Error("hook")}}),{})',
            'assert.deepEqual({[Symbol.for("nodejs.util.inspect.custom")](){return "x"}}, {})',
            'const saved=Object.getOwnPropertyDescriptor(Object.prototype,"x"); Object.defineProperty(Object.prototype,"x",{value:1,configurable:true}); try {assert.equal(1,2)} finally {delete Object.prototype.x}',
            'assert.match("abc",new RegExp("z"))',
            'const re=/z/; re.exec=()=>null; assert.match("abc",re)',
            'assert.fail("one","two")',
        ]
        for body in snippets:
            with self.subTest(body=body): self.snippet(body)
        self.snippet('assert.equal(1,1)','passed')

    def test_harness_getters_do_not_become_failures(self):
        prefix=HARNESS.replace("import assert from 'node:assert/strict';",'').replace('export ','')
        for expression in [
            'accepted({ok:false,error:{get classification(){throw Error("diagnostic")}}})',
            'accepted({ok:1,get value(){throw Error("value")}})',
            'let n=0; accepted({get ok(){return ++n===1},get value(){throw Error("value")}})',
            'accepted({ok:false})',
        ]:
            with self.subTest(expression=expression):self.snippet(prefix+expression)

    def test_preflight_does_not_observe_inherited_descriptor_fields(self):
        for key in ['value','get','set','writable']:
            body = "let calls=0; const desc=Object.create(null); desc.get=()=>{calls++;return undefined}; desc.configurable=true; Object.defineProperty(Object.prototype,"+json.dumps(key)+",desc); try {assert.equal(1,1)} finally {delete Object.prototype["+json.dumps(key)+"]} assert.equal(calls,0)"
            with self.subTest(key=key):self.snippet(body,'passed')
        self.snippet('let calls=0; const x={get value(){calls++; return 1}}; assert.strictEqual(x,x); assert.equal(calls,0)','passed')

    def test_a_raised_array_prototype_length_alone_stays_eligible(self):
        """Round 4: a test that defines and then deletes an Array.prototype index leaves its length raised for the
        rest of the process. That number runs no code, so later assertions still qualify; an index that remains
        is still an unclean intrinsic."""
        install = 'Object.defineProperty(Array.prototype,"0",{value:7,writable:true,configurable:true});'
        self.snippet(install + ' delete Array.prototype[0]; assert.equal(Array.prototype.length,1); assert.deepEqual([1],[2])', 'assertion_failed')
        self.snippet(install + ' delete Array.prototype[0]; assert.deepEqual([1],[1])', 'passed')
        self.snippet(install + ' try {assert.deepEqual([1],[2])} finally {delete Array.prototype[0]}')

    def test_live_intrinsic_binding_changes_are_unobserved_and_uncredited(self):
        for name in ['Object','Symbol','Array','RegExp']:
            body="let calls=0; const saved=globalThis["+json.dumps(name)+"]; globalThis["+json.dumps(name)+"]=new Proxy(saved,{get(){calls++;throw Error('live intrinsic read')}}); try {assert.equal(1,1)} finally {globalThis["+json.dumps(name)+"]=saved} assert.equal(calls,0)"
            with self.subTest(name=name):self.snippet(body,'passed')

    def test_source_policy_all_module_requests_and_references(self):
        sources=[
            "import x from 'assert';", "import x from 'assert/strict';",
            "import {AssertionError as Different} from 'node:assert';",
            "import * as alias from 'node:assert/strict';",
            "export * from 'node:assert';", "export {default as x} from 'assert/strict';",
            "const x = require('assert');", "import('node:assert/strict');",
            "import alias = require('node:assert');", "throw new AssertionError({});",
            "new x.AssertionError({});", "new x['AssertionError']({});",
            "const x='assert'; import(x);", "const x='node:assert'; require(x);",
            "eval('1');", "new Function('return 1')", "globalThis['Function']('1')",
            "const loader=require; loader('assert')", "const maker=Function; maker('1')",
        ]
        for source in sources:
            with self.subTest(source=source): self.snippet('assert.equal(1,2)', 'source_policy', source)
        self.snippet('assert.equal(1,2)', 'assertion_failed', 'export const value=1;')

    def test_source_inventory_is_complete_and_includes_nested_workspaces(self):
        for mode in ['clean','nested-assert','missing-file','empty','parse']:
            root=self.tree();entry=case('inventory','packages/kernel/tests/inventory.test.mjs','selected')
            for name,text in [('packages/kernel/src/subject.mjs','export const value=1;'),
                              ('packages/models/example/src/subject.mjs',"import x from 'assert'" if mode=='nested-assert' else 'export const value=2;'),
                              ('packages/kernel/tests/inventory.test.mjs',"import assert from 'node:assert/strict'; import {test} from 'node:test'; test('selected',()=>assert.equal(1,1));"),
                              (REGISTRY,json.dumps({'cases':[entry]}))]:
                (root/name).parent.mkdir(parents=True,exist_ok=True);(root/name).write_text(text)
            inventory=root/'tests/fixtures/packet-tools/value-cost-source-files.json'
            inventory.write_text(json.dumps(['packages/kernel/src/subject.mjs','packages/models/example/src/subject.mjs']))
            if mode=='missing-file':(root/'packages/models/example/src/subject.mjs').unlink()
            if mode=='empty':shutil.rmtree(root/'packages/models');shutil.rmtree(root/'packages/kernel/src')
            if mode=='parse':(root/'packages/models/example/src/subject.mjs').write_text('const = ;')
            _,_,row=self.run_case(root,entry)
            with self.subTest(mode=mode):self.assertEqual(row['state'],'passed' if mode=='clean' else 'parse_error' if mode=='parse' else 'source_policy',row)

    def test_mixed_domains_and_more_than_twenty_failures_are_preserved(self):
        root=self.tree(); entry=case('mixed','packages/kernel/tests/mixed.test.mjs','selected')
        for name,text in [('packages/kernel/src/subject.mjs',SUBJECT), (REGISTRY,json.dumps({'cases':[entry]})),
                          ('packages/kernel/tests/mixed.test.mjs', "import assert from 'node:assert/strict'; import {test} from 'node:test';\n" +
                           "\n".join(f"test('selected {i}',()=>{{assert.equal(1,2)}});" for i in range(25)) +
                           "test('selected subject',()=>{throw Error('subject')});")]:
            (root/name).parent.mkdir(parents=True,exist_ok=True);(root/name).write_text(text)
        _,_,row=self.run_case(root,entry)
        self.assertEqual((row['state'],len(row['witnesses']),len(row['nonqualifying'])),('assertion_failed',25,1))


if __name__ == '__main__':
    unittest.main()
