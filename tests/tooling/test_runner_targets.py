"""F3 target-set and multi-edit mutants (design 05 D05-04): a kill is a named failing leaf in the mutant's
declared target set, at a site the passing control reached; discovery runs are metadata, never credit."""
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


def target(file, path):
    return {'file': file, 'path': path}


def mutant(name, before=None, after=None, edits=None, expected=(COMPUTE,), **extra):
    row = {'id': name, 'expected_targets': [target(*item) for item in expected], **extra}
    if edits is None:
        row.update(path='src/value.mjs', before=before, after=after)
    else:
        row['edits'] = [{'path': 'src/value.mjs', 'before': b, 'after': a} for b, a in edits]
    return row


class TargetSetRunnerTests(RepositoryFixture):
    def run_registry(self, mutants, tests=TESTS):
        for path in (tool.CATALOG_REPORTER, tool.REACH_COVERAGE):
            self.write(path, (ROOT / path).read_text())
        self.write('src/value.mjs', SOURCE)
        self.write('tests/a.test.mjs', tests)
        self.document('registry.json', {'version': 1, 'cases': [{
            'id': 'targets', 'targets': {'flags': ['--test'], 'files': ['tests/a.test.mjs']},
            'files': ['src/value.mjs', 'tests/a.test.mjs'], 'timeout_seconds': 60, 'output_limit_bytes': 1048576,
            'mutants': mutants}]})
        rev = self.commit('target-set registry')
        result = tool.mutations(self.reader, rev, 'registry.json')
        return {row['mutation']: row for row in result['cases'][0]['mutations']}, result

    def test_target_set_outcomes(self):
        rows, result = self.run_registry([
            mutant('kill', 'return n + 1;', 'return n + 2;'),
            mutant('wrong', 'return n * 2;', 'return n * 3;'),
            mutant('equivalent', 'return n + 1;', 'return 1 + n;'),
            mutant('unreached', 'return n - 1;', 'return n - 2;'),
            mutant('multi', edits=[('return n + 1;', 'return n + 2;'), ('return n * 2;', 'return n * 3;')]),
        ])
        self.assertEqual(result['cases'][0]['control'], 'passed')
        self.assertEqual({name: row['status'] for name, row in rows.items()},
                         {'kill': 'killed', 'wrong': 'wrong_kill', 'equivalent': 'survived', 'unreached': 'uncovered',
                          'multi': 'killed'})
        self.assertEqual(rows['kill']['killed_by'], 'tests/a.test.mjs > compute adds one')
        self.assertEqual(rows['wrong']['first_failure'], 'tests/a.test.mjs > other doubles')
        self.assertNotIn('killed_by', rows['wrong'])
        self.assertEqual(result['result'], 'attention_required')
        self.assertEqual(self.git('status', '--porcelain'), '')

    def test_multi_edit_applies_atomically_or_not_at_all(self):
        rows, _ = self.run_registry([
            mutant('stale', edits=[('return n + 1;', 'return n + 2;'), ('not in source', 'x')]),
            mutant('overlap', edits=[('return n + 1;', 'return n + 2;'), ('n + 1', 'n + 3')]),
        ])
        self.assertEqual({name: (row['status'], row['run']['detail']) for name, row in rows.items()},
                         {'stale': ('not_applicable', 'stale or ambiguous mutation anchor'),
                          'overlap': ('not_applicable', 'overlapping mutation edits')})

    def test_multi_edit_key_binds_the_ordered_edits(self):
        first = mutant('a', edits=[('x', 'y'), ('p', 'q')])
        self.assertNotEqual(tool.mutation_key(first), tool.mutation_key(mutant('b', edits=[('p', 'q'), ('x', 'y')])))
        single = {'path': 'f', 'before': 'x', 'after': 'y'}
        self.assertEqual(tool.mutation_key(single), tool.content_key('mutation', ['f', 'x', 'replace', 'y']))

    def test_discovery_is_metadata_never_credit(self):
        rows, _ = self.run_registry([mutant('equivalent', 'return n + 1;', 'return 1 + n;',
                                            discovery={'first_failures': ['tests/a.test.mjs > compute adds one']})])
        self.assertEqual(rows['equivalent']['status'], 'survived')
        self.assertEqual(rows['equivalent']['discovery']['credit'], 'none')

    def test_expected_target_must_pass_in_the_control(self):
        with self.assertRaisesRegex(tool.CheckError, 'expected target leaves absent'):
            self.run_registry([mutant('kill', 'return n + 1;', 'return n + 2;', expected=[('tests/a.test.mjs', ['absent'])])])

    def test_a_failing_control_is_an_invalid_baseline(self):
        rows, result = self.run_registry([mutant('kill', 'return n + 1;', 'return n + 2;')],
                                         tests=TESTS.replace('assert.equal(other(2), 4)', 'assert.equal(other(2), 5)'))
        self.assertEqual((result['cases'][0]['control'], rows['kill']['status']), ('invalid_baseline', 'invalid_baseline'))
