"""F3 target-set and multi-edit mutants (design 05 D05-04; design 06 R1-04 under owner choice 09). The
target-set route reports what it observed at a site the passing control reached and never returns
`killed`; discovery runs are metadata, never credit. Run-level categories stay distinct."""
import json

from test_packet_tools import RepositoryFixture, tool
from test_target_tools import ROOT

SOURCE = """export function compute(n) { return n + 1; }
export function other(n) { return n * 2; }
export function unused(n) { return n - 1; }
"""
TESTS = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, other } from '../src/value.mjs';
test('compute adds one', () => { assert.equal(compute(1), 2); });
test('other doubles', () => { assert.equal(other(2), 4); });
"""
COMPUTE = 'tests/a.test.mjs', ['compute adds one']
OTHER = 'tests/a.test.mjs', ['other doubles']
# R1-04 corpus: hooks, a test-side helper, a timed subtest and a timed target.
CORPUS_SOURCE = """export function compute(n) { return n + 1; }
export function other(n) { return n * 2; }
export async function pause() { }
export function setup() { }
"""
CORPUS_TESTS = """import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { compute, other, pause, setup } from '../src/value.mjs';
import { check } from './helper.mjs';
beforeEach(() => { setup(); });
test('compute adds one', { timeout: 1000 }, async () => { await pause(); assert.equal(compute(1), 2); });
test('other doubles', () => { assert.equal(other(2), 4); });
test('helper checks', () => { check(compute(1)); });
test('parent', { timeout: 1000 }, async (t) => { await t.test('child computes', async () => { await pause(); assert.equal(compute(1), 2, 'child'); }); });
"""
HELPER = """import assert from 'node:assert/strict';
export function check(value) { assert.equal(value, 2); }
"""
HELPER_TARGET = 'tests/a.test.mjs', ['helper checks']
CHILD = 'tests/a.test.mjs', ['parent', 'child computes']


def target(file, path):
    return {'file': file, 'path': path}


def mutant(name, before=None, after=None, edits=None, expected=(COMPUTE,), path='src/value.mjs', **extra):
    row = {'id': name, 'expected_targets': [target(*item) for item in expected], **extra}
    if edits is None:
        row.update(path=path, before=before, after=after)
    else:
        # An edit is (before, after) in src/value.mjs, or (path, before, after).
        row['edits'] = [{'path': edit[0] if len(edit) == 3 else 'src/value.mjs', 'before': edit[-2], 'after': edit[-1]}
                        for edit in edits]
    return row


def src(name, before, after, **extra):
    return mutant(name, before, after, **extra)


def tests(name, before, after, **extra):
    return mutant(name, before, after, path='tests/a.test.mjs', **extra)


class TargetSetRunnerTests(RepositoryFixture):
    def run_registry(self, mutants, tests=TESTS, source=SOURCE, helper=None, timeout=60):
        for path in (tool.CATALOG_REPORTER, tool.REACH_COVERAGE):
            self.write(path, (ROOT / path).read_text())
        self.write('src/value.mjs', source)
        self.write('tests/a.test.mjs', tests)
        files = ['src/value.mjs', 'tests/a.test.mjs']
        if helper:
            self.write('tests/helper.mjs', helper)
            files.append('tests/helper.mjs')
        self.document('registry.json', {'version': 1, 'cases': [{
            'id': 'targets', 'targets': {'flags': ['--test'], 'files': ['tests/a.test.mjs']},
            'files': files, 'timeout_seconds': timeout, 'output_limit_bytes': 1048576, 'mutants': mutants}]})
        rev = self.commit('target-set registry')
        result = tool.mutations(self.reader, rev, 'registry.json')
        return {row['mutation']: row for row in result['cases'][0]['mutations']}, result

    def outcomes(self, row):
        return {item['target']: item['outcome'] for item in row.get('targets', [])}

    def test_target_set_outcomes(self):
        rows, result = self.run_registry([
            src('assertion', 'return n + 1;', 'return n + 2;'),
            src('wrong', 'return n * 2;', 'return n * 3;'),
            src('equivalent', 'return n + 1;', 'return 1 + n;'),
            src('unreached', 'return n - 1;', 'return n - 2;'),
            mutant('multi', edits=[('src/value.mjs', 'return n + 1;', 'return n + 2;'), ('src/value.mjs', 'return n * 2;', 'return n * 3;')]),
        ])
        self.assertEqual(result['cases'][0]['control'], 'passed')
        self.assertEqual({name: row['status'] for name, row in rows.items()},
                         {'assertion': 'observed', 'wrong': 'wrong_kill', 'equivalent': 'survived', 'unreached': 'uncovered',
                          'multi': 'observed'})
        self.assertEqual(self.outcomes(rows['assertion']), {'tests/a.test.mjs > compute adds one': 'assertion'})
        self.assertEqual(rows['assertion']['targets'][0]['origin'], 'not established')
        self.assertEqual(rows['wrong']['first_failure'], 'tests/a.test.mjs > other doubles')
        self.assertFalse(any('killed_by' in row for row in rows.values()))
        self.assertNotIn('killed', result['counts'])
        self.assertEqual(result['result'], 'attention_required')
        self.assertEqual(self.git('status', '--porcelain'), '')

    def test_no_observed_outcome_becomes_a_kill(self):
        """Owner choice 09: an assertion in the target, a TypeError before it, skips, a todo, cancellation,
        a test timeout, a hook, a renamed target, production and trimmed-stack AssertionErrors, a plain Error
        with the assertion code, a helper assertion, missing and malformed provenance, and a qualifying-
        looking failure beside an absent target are all observations, never kills."""
        both = (COMPUTE, CHILD)
        rows, result = self.run_registry([
            src('assertion', 'return n + 1;', 'return n + 2;'),
            src('type-error', 'return n + 1;', 'return n.x.y;'),
            tests('skip', "test('compute adds one',", "test.skip('compute adds one',"),
            tests('todo', "test('compute adds one',", "test.todo('compute adds one',"),
            tests('t-skip', '{ timeout: 1000 }, async () => { await pause();',
                  '{ timeout: 1000 }, async (t) => { t.skip(); return; await pause();'),
            src('slow', 'export async function pause() { }',
                'export async function pause() { await new Promise((resolve) => setTimeout(resolve, 3000)); }', expected=both),
            src('hook', 'export function setup() { }', "export function setup() { throw new Error('setup'); }"),
            tests('renamed', "test('compute adds one',", "test('compute adds two',"),
            mutant('production', edits=[('src/value.mjs', 'export function compute(n) {',
                                         "import { AssertionError } from 'node:assert';\nexport function compute(n) {"),
                                        ('src/value.mjs', 'return n + 1;',
                                         "throw new AssertionError({ actual: 0, expected: 1, operator: 'strictEqual' });")]),
            mutant('trimmed', edits=[('src/value.mjs', 'export function compute(n) {',
                                      "import { AssertionError } from 'node:assert';\nexport function compute(n) {"),
                                     ('src/value.mjs', 'return n + 1;',
                                      "throw new AssertionError({ actual: 0, expected: 1, operator: 'strictEqual', stackStartFn: compute });")]),
            src('plain-code', 'return n + 1;', "throw Object.assign(new Error('x'), { code: 'ERR_ASSERTION' });"),
            src('helper', 'return n + 1;', 'return n + 3;', expected=(HELPER_TARGET,)),
            src('missing-provenance', 'return n + 1;', 'throw 42;'),
            src('empty-stack', 'return n + 1;',
                "const error = new Error('x'); error.name = 'AssertionError'; error.stack = ''; throw error;"),
            src('numeric-stack', 'return n + 1;',
                "const error = new Error('x'); error.name = 'AssertionError'; Object.defineProperty(error, 'stack', { value: 42 }); throw error;"),
            mutant('mixed', expected=(COMPUTE, OTHER), edits=[('src/value.mjs', 'return n + 1;', 'return n + 2;'),
                                                              ('tests/a.test.mjs', "test('other doubles',", "test('other triples',")]),
        ], tests=CORPUS_TESTS, source=CORPUS_SOURCE, helper=HELPER)
        self.assertEqual(result['cases'][0]['control'], 'passed')
        self.assertEqual({name for name, row in rows.items() if row['status'] != 'observed'}, set())
        self.assertNotIn('killed', result['counts'])
        compute, child = 'tests/a.test.mjs > compute adds one', 'tests/a.test.mjs > parent > child computes'
        expected = {'assertion': 'assertion', 'type-error': 'error', 'skip': 'skipped', 'todo': 'todo', 't-skip': 'skipped',
                    'hook': 'hook', 'renamed': 'absent', 'production': 'assertion', 'trimmed': 'assertion',
                    'plain-code': 'assertion', 'missing-provenance': 'error', 'empty-stack': 'assertion',
                    'numeric-stack': 'assertion'}
        self.assertEqual({name: self.outcomes(rows[name])[compute] for name in expected}, expected)
        self.assertEqual(self.outcomes(rows['slow']), {compute: 'timeout', child: 'cancelled'})
        self.assertEqual(self.outcomes(rows['helper']), {'tests/a.test.mjs > helper checks': 'assertion'})
        self.assertEqual(self.outcomes(rows['mixed']), {compute: 'assertion', 'tests/a.test.mjs > other doubles': 'absent'})
        provenance = {name: rows[name]['targets'][0]['provenance'] for name in
                      ('assertion', 'trimmed', 'missing-provenance', 'empty-stack', 'numeric-stack')}
        self.assertEqual(provenance, {'assertion': 'frames', 'trimmed': 'frames', 'missing-provenance': 'absent',
                                      'empty-stack': 'unusable', 'numeric-stack': 'unusable'})
        causes = {name: rows[name]['targets'][0]['cause'] for name in ('type-error', 'plain-code', 'trimmed')}
        self.assertEqual(causes, {'type-error': {'name': 'TypeError', 'code': None},
                                  'plain-code': {'name': 'Error', 'code': 'ERR_ASSERTION'},
                                  'trimmed': {'name': 'AssertionError', 'code': 'ERR_ASSERTION'}})
        self.assertTrue(all(item['origin'] == 'not established' for row in rows.values() for item in row['targets']
                            if item['outcome'] in ('assertion', 'error')))

    def test_run_level_categories_stay_distinct(self):
        rows, _ = self.run_registry([src('hang', 'return n + 1;', 'for (;;) {}')], timeout=8)
        self.assertEqual(rows['hang']['status'], 'timeout')
        self.assertTrue(rows['hang']['invalid'])
        row = mutant('m', 'x', 'y')
        # Labels are unique: python-probe refuses an observation with repeated failure names.
        for label, run, status in (('output limit', {'status': 'output_limit', 'exit': None}, 'output_limit'),
                                   ('setup error', {'status': 'setup_error', 'exit': None}, 'setup_error'),
                                   ('no match', {'status': 'not_applicable', 'exit': None, 'matches': 0}, 'not_applicable'),
                                   ('no catalog events', {'status': 'finished', 'exit': 1, 'tree': None}, 'malformed'),
                                   ('invalid catalog tree', {'status': 'finished', 'exit': 1, 'tree': {'valid': False, 'refused': {}}}, 'malformed')):
            with self.subTest(label, status=status):
                self.assertEqual(tool.target_outcome(run, row, True)['status'], status)

    def test_multi_edit_applies_atomically_or_not_at_all(self):
        rows, _ = self.run_registry([
            mutant('stale', edits=[('src/value.mjs', 'return n + 1;', 'return n + 2;'), ('src/value.mjs', 'not in source', 'x')]),
            mutant('overlap', edits=[('src/value.mjs', 'return n + 1;', 'return n + 2;'), ('src/value.mjs', 'n + 1', 'n + 3')]),
        ])
        self.assertEqual({name: (row['status'], row['run']['detail']) for name, row in rows.items()},
                         {'stale': ('not_applicable', 'stale or ambiguous mutation anchor'),
                          'overlap': ('not_applicable', 'overlapping mutation edits')})

    def test_multi_edit_key_binds_the_ordered_edits(self):
        first = mutant('a', edits=[('f', 'x', 'y'), ('f', 'p', 'q')])
        self.assertNotEqual(tool.mutation_key(first), tool.mutation_key(mutant('b', edits=[('f', 'p', 'q'), ('f', 'x', 'y')])))
        single = {'path': 'f', 'before': 'x', 'after': 'y'}
        self.assertEqual(tool.mutation_key(single), tool.content_key('mutation', ['f', 'x', 'replace', 'y']))

    def test_discovery_is_metadata_never_credit(self):
        rows, _ = self.run_registry([src('equivalent', 'return n + 1;', 'return 1 + n;',
                                         discovery={'first_failures': ['tests/a.test.mjs > compute adds one']})])
        self.assertEqual(rows['equivalent']['status'], 'survived')
        self.assertEqual(rows['equivalent']['discovery']['credit'], 'none')

    def test_expected_target_must_pass_in_the_control(self):
        with self.assertRaisesRegex(tool.CheckError, 'expected target leaves absent'):
            self.run_registry([src('assertion', 'return n + 1;', 'return n + 2;', expected=[('tests/a.test.mjs', ['absent'])])])

    def test_a_failing_control_is_an_invalid_baseline(self):
        rows, result = self.run_registry([src('assertion', 'return n + 1;', 'return n + 2;')],
                                         tests=TESTS.replace('assert.equal(other(2), 4)', 'assert.equal(other(2), 5)'))
        self.assertEqual((result['cases'][0]['control'], rows['assertion']['status']), ('invalid_baseline', 'invalid_baseline'))
