"""Suite targets (design 05 P1-T): source facts, reach against a no-test baseline, token guards and run validity."""
import json
import unittest
from pathlib import Path

from test_packet_tools import RepositoryFixture, tool

ROOT = Path(__file__).resolve().parents[2]
TOOLING = ['tests/tooling/catalog-reporter.mjs', 'tests/tooling/source-facts.mjs', 'tests/tooling/reach-coverage.mjs']
SUBJECT = """import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const TABLE = [33554432];
function op(n) { if (n > 10) throw { tooBig: n }; return { ok: true, charge: n }; } const Calc = { min: (a, b) => (a < b ? a : b) };
function checkCharge(r, n) {
  assert.equal(r.charge, n);
}
function loadCheck() {
  assert.ok(TABLE.length === 1);
}
loadCheck();

describe('suite', () => {
  test('exact', () => {
    const r = op(5);
    assert.equal(r.charge, 5);
  });
  test('early return', () => {
    const r = op(6);
    if (r.ok) return;
    assert.equal(r.charge, 999);
  });
  test('caught throw', () => {
    try {
      const r = op(33554432);
      assert.equal(r.charge, 33554432);
    } catch {}
  });
  test('short circuit', () => {
    const r = op(1);
    r.ok || assert.equal(r.charge, 33554431);
  });
  test('template', () => {
    const text = `assert.equal(op(2).charge, 2)`;
    assert.ok(text.length > 0);
  });
  test('two arguments', () => {
    const r = op(Calc.min(16777216, 33554432) - 16777211);
    assert.equal(r.charge * 1, 5);
  });
  test('module input', () => {
    for (const n of TABLE) assert.equal(n, 33554432);
  });
  test('helper', () => {
    const r = op(7);
    checkCharge(r, 7);
  });
  // assert.equal(op(3).charge, 3);
});
test('parent', async (t) => {
  await t.test('child', () => assert.ok(true));
});
"""


def pinned_toolchain():
    """The TypeScript subset mutations.json pins, read and digest-checked without Git (runs in mutant copies)."""
    registry = json.loads((ROOT / 'tests/fixtures/packet-tools/mutations.json').read_text())
    pinned, = [row for row in registry['dependencies'] if row['path'] == 'node_modules/typescript']
    files = {}
    for relative, expected in pinned['files'].items():
        data = (ROOT / pinned['path'] / relative).read_bytes()
        assert tool.digest(data) == expected, 'pinned TypeScript digest: ' + relative
        files[pinned['path'] + '/' + relative] = data
    return files

def anchor(text, **extra):
    return {'anchor': text, 'sha256': tool.digest(text.encode()), **extra}


def line_of(text, fragment):
    return text.splitlines().index(next(line for line in text.splitlines() if fragment in line)) + 1


class TargetFixture(RepositoryFixture):
    toolchain = None

    @classmethod
    def setUpClass(cls):
        cls.toolchain = pinned_toolchain()

    def build(self, targets, counterexample_kind='behavior', mutants=None):
        for path in TOOLING:
            self.write(path, (ROOT / path).read_text())
        self.write('tests/a.test.mjs', SUBJECT)
        self.write('tests/helper.mjs', 'export const unused = 1;\n')
        self.document('package.json', {'type': 'module', 'scripts': {'test': 'node --test tests/*.test.mjs'}})
        self.document('registry.json', {'version': 1, 'cases': [{'id': 'case', 'mutants': mutants or []}]})
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}, 'census': {'roots': ['tests']}},
            'checks': [{'id': 'repository-tests', 'catalog': {'script': 'test', 'script_text': 'node --test tests/*.test.mjs',
                                                             'flags': ['--test'], 'globs': ['tests/*.test.mjs']},
                        'timeout_seconds': 60, 'output_limit_bytes': 1048576},
                       {'id': 'mutants', 'operation': 'mutations', 'spec': 'registry.json', 'expected': 'selected_cases_passed'}]})
        rows = [{'revision': self.b, 'path': 'source.md', 'line': 1, 'kind': 'inline js',
                 'sha256': tool.digest(b'const value = 1;\n'), 'disposition': 'extract'}]
        self.document('origins.json', rows)
        catalog = self.commit('catalog')
        self.document('inventory.json', {'version': 1, 'catalogs': [{
            'revision': catalog, 'path': 'origins.json', 'kind': 'artifact', 'count': 1,
            'sha256': tool.digest((self.root / 'origins.json').read_bytes())}], 'additional_sources': []})
        rev = self.commit('inventory')
        origin = tool.inventory(self.reader, rev, 'inventory.json')['origins'][0]['id']
        self.document('legacy.json', {'version': 1, 'inventory': 'inventory.json', 'registry': 'registry.json',
                                      'verification': 'verify.json', 'suites': [],
                                      'mappings': [{'origin': origin, 'status': 'pending', 'rationale': 'Pending'}]})
        old = self.commit('format 1')
        self.document('corpus.json', {'version': 2, 'inventory': 'inventory.json', 'registry': 'registry.json',
            'verification': 'verify.json',
            'migration': {'source': {'format': 1, 'revision': old, 'path': 'legacy.json',
                                     'sha256': tool.digest((self.root / 'legacy.json').read_bytes())}},
            'origins': [{'id': origin, 'state': 'pending'}],
            'counterexamples': [{'id': 'cx', 'kind': counterexample_kind, 'origins': [origin],
                                 'required_result': 'charge equals the input'}],
            'suite_targets': targets, 'preserved': [], 'families': [], 'areas': [], **self.format_two_tables()})
        return self.commit('targets')

    def target(self, name, input_anchor, assertions, **extra):
        line = line_of(SUBJECT, f"test('{name}'")
        column = SUBJECT.splitlines()[line - 1].index('test(') + 1
        row = {'id': 'target.' + name.replace(' ', '-'), 'counterexample': 'cx', 'command': 'repository-tests',
               'file': 'tests/a.test.mjs', 'test_path': ['suite', name], 'declaration': {'line': line, 'column': column},
               'input_anchors': [input_anchor], 'assertion_anchors': [anchor(text) for text in assertions],
               'relation': {'kind': 'exact_input'}, 'discrimination': {'reading': 'the assertion compares the charge'}}
        row.update(extra)
        return row

    def check(self, *targets, **build):
        rev = self.build(list(targets), **build)
        return tool.corpus(self.reader, rev, 'corpus.json', toolchain=self.toolchain)

    @staticmethod
    def by_id(result):
        return {row['id']: row for row in result['targets']['results']}


class TargetTests(TargetFixture):
    def test_exact_target_is_reached_and_matched(self):
        result = self.check(self.target('exact', anchor('const r = op(5);', literals=[{'ordinal': 5, 'value': '5'}]),
                                         ['assert.equal(r.charge, 5);']))
        target = self.by_id(result)['target.exact']
        self.assertEqual(target['refused'], [], target)
        self.assertEqual(target['credit'], 'target_reading')
        self.assertTrue(all(entry['reached'] for entry in target['anchors']))
        counts = result['targets']['counts']
        self.assertEqual((counts['input_tokens_matched'], counts['anchors_reached']), (1, 2))
        self.assertEqual(counts['credit'], {'target_reading': 1})

    def test_early_return_leaves_the_assertion_unreached(self):
        target = self.by_id(self.check(self.target('early return', anchor('const r = op(6);', computed=True),
                                                   ['assert.equal(r.charge, 999);'])))['target.early-return']
        self.assertIn('assertion anchor not reached: assert.equal(r.charge, 999);', target['refused'])

    def test_sibling_anchor_is_not_reached(self):
        target = self.by_id(self.check(self.target('exact', anchor('const r = op(5);', computed=True),
                                                   ['checkCharge(r, 7);'])))['target.exact']
        self.assertTrue(any(reason.startswith('assertion anchor not reached') for reason in target['refused']))

    def test_assertion_in_a_try_block_is_not_observable(self):
        target = self.by_id(self.check(self.target('caught throw', anchor('const r = op(33554432);', computed=True),
                                                   ['assert.equal(r.charge, 33554432);'])))['target.caught-throw']
        assertion = [entry for entry in target['anchors'] if entry['role'] == 'assertion'][0]
        self.assertEqual(assertion['not_observable'], 'try block')
        self.assertEqual(target['refused'], [])

    def test_short_circuit_is_measured_at_the_call(self):
        target = self.by_id(self.check(self.target('short circuit', anchor('const r = op(1);', computed=True),
                                                   ['r.ok || assert.equal(r.charge, 33554431);'])))['target.short-circuit']
        assertion = [entry for entry in target['anchors'] if entry['role'] == 'assertion'][0]
        self.assertEqual((assertion['count'], assertion['reached']), (0, False))

    def test_anchor_inside_a_template_or_comment_is_not_observable(self):
        target = self.by_id(self.check(self.target('template', anchor('const text = `assert.equal(op(2).charge, 2)`;', computed=True),
                                                   ['assert.equal(op(2).charge, 2)', 'assert.equal(op(3).charge, 3);'])))['target.template']
        reasons = [entry.get('not_observable') for entry in target['anchors'] if entry['role'] == 'assertion']
        self.assertEqual(reasons, ['anchor starts inside a literal', 'anchor starts inside a comment'])

    def test_a_different_value_at_the_recorded_position_fails(self):
        statement = 'const r = op(Calc.min(16777216, 33554432) - 16777211);'
        # Token 9 is 16777216; the stored input 33554432 sits in another argument (token 11).
        row = self.target('two arguments', anchor(statement, literals=[{'ordinal': 9, 'value': '33554432'}]),
                          ['assert.equal(r.charge * 1, 5);'])
        target = self.by_id(self.check(row))['target.two-arguments']
        self.assertIn('input literal tokens differ at their recorded positions', target['refused'])

    def test_module_scope_input_is_counted_separately(self):
        result = self.check(self.target('module input', anchor('const TABLE = [33554432];', literals=[{'ordinal': 4, 'value': '33554432'}]),
                                        ['for (const n of TABLE) assert.equal(n, 33554432);']))
        target = self.by_id(result)['target.module-input']
        self.assertEqual(target['refused'], [])
        self.assertEqual(result['targets']['counts']['input_module_scope'], 1)

    def test_same_file_helper_assertion_is_reached(self):
        target = self.by_id(self.check(self.target('helper', anchor('const r = op(7);', computed=True),
                                                   ['assert.equal(r.charge, n);'])))['target.helper']
        self.assertEqual(target['refused'], [])
        self.assertEqual(result_counts(target), 0)

    def test_module_load_helper_is_not_reached_by_the_test(self):
        target = self.by_id(self.check(self.target('exact', anchor('const r = op(5);', computed=True),
                                                   ['assert.ok(TABLE.length === 1);'])))['target.exact']
        assertion = [entry for entry in target['anchors'] if entry['role'] == 'assertion'][0]
        self.assertEqual((assertion['count'], assertion['baseline'], assertion['reached']), (1, 1, False))

    def test_subtest_target_is_refused(self):
        row = self.target('exact', anchor('const r = op(5);', computed=True), ['assert.equal(r.charge, 5);'])
        line = line_of(SUBJECT, "t.test('child'")
        row.update(test_path=['parent', 'child'], declaration={'line': line, 'column': SUBJECT.splitlines()[line - 1].index('test(') + 1})
        target = self.by_id(self.check(row))['target.exact']
        self.assertEqual(target['refused'], ['a t.test subtest cannot be selected by its full path (A9)'])

    def test_file_outside_the_command_selection_is_refused(self):
        row = self.target('exact', anchor('const r = op(5);', computed=True), ['assert.equal(r.charge, 5);'], file='tests/helper.mjs')
        self.assertEqual(self.by_id(self.check(row))['target.exact']['refused'], ["file is not in the command's own selection"])

    def test_mutation_of_another_counterexample_cannot_discriminate(self):
        mutant = {'id': 'mutation-foreign', 'path': 'tests/a.test.mjs', 'before': 'charge: n', 'after': 'charge: 0',
                  'obligation': 'another-counterexample'}
        row = self.target('exact', anchor('const r = op(5);', computed=True), ['assert.equal(r.charge, 5);'],
                          discrimination={'mutation': 'mutation-foreign'})
        target = self.by_id(self.check(row, mutants=[mutant]))['target.exact']
        self.assertIn('the mutation is not registered to this counterexample', target['refused'])

    def test_held_counterexample_never_earns_suite_credit(self):
        row = self.target('exact', anchor('const r = op(5);', computed=True), ['assert.equal(r.charge, 5);'])
        with self.assertRaisesRegex(tool.CheckError, 'never earn suite credit'):
            self.check(row, counterexample_kind='held_witness')


def result_counts(target):
    return sum('not_observable' in entry for entry in target['anchors'])


class ReachValidityTests(unittest.TestCase):
    def rows(self, *pairs, summary):
        out = []
        for kind, name, line, nesting, verdict, extra in pairs:
            out.append({'type': 'test:start', 'name': name, 'line': line, 'column': 1, 'nesting': nesting, 'file': '/f',
                        **{key: value for key, value in extra.items() if key == 'synthetic'}})
            out.append({'type': 'test:fail' if verdict == 'fail' else 'test:pass', 'name': name, 'line': line, 'column': 1,
                        'nesting': nesting, 'file': '/f', 'details_type': kind, **extra})
        labels = ('tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo')
        out += [{'type': 'summary', 'label': label, 'count': value} for label, value in zip(labels, summary)]
        return {'run': {'status': 'finished', 'exit': 0}, 'rows': out}

    def test_one_passing_leaf_is_valid(self):
        observation = self.rows(('suite', 's', 1, 0, 'pass', {}), ('test', 'a', 2, 1, 'pass', {}), summary=(1, 1, 1, 0, 0, 0, 0))
        self.assertEqual(tool.reach_valid(observation, ['s', 'a']), (True, None))

    def test_failing_parent_with_a_passing_child_is_invalid(self):
        observation = self.rows(('test', 'parent', 1, 0, 'fail', {}), ('test', 'child', 2, 1, 'pass', {}), summary=(2, 0, 1, 1, 0, 0, 0))
        self.assertEqual(tool.reach_valid(observation, ['parent', 'child']), (False, 'a test failed in the reach run'))

    def test_zero_match_synthetic_pass_is_invalid(self):
        observation = self.rows(('test', '/f', 1, 0, 'pass', {'synthetic': True}), summary=(1, 0, 1, 0, 0, 0, 0))
        self.assertEqual(tool.reach_valid(observation, ['s', 'a'])[1], '0 leaves matched, not exactly the target')

    def test_two_leaves_are_invalid(self):
        observation = self.rows(('test', 'a', 1, 0, 'pass', {}), ('test', 'a', 2, 0, 'pass', {}), summary=(2, 0, 2, 0, 0, 0, 0))
        self.assertEqual(tool.reach_valid(observation, ['a'])[1], '2 leaves matched, not exactly the target')

    def test_name_pattern_escapes_regular_expression_syntax(self):
        self.assertEqual(tool.name_pattern(['a.b', 'c (d)']), '^a\\.b c \\(d\\)$')


if __name__ == '__main__':
    unittest.main()
