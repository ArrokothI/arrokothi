"""Research reconciliation counterexamples; category names are stable test identities."""
import copy
import json
import unittest
from unittest.mock import patch
from test_packet_tools import tool, RepositoryFixture
import test_packet_tools as runner_fixtures


class CoverageTests(unittest.TestCase):
    def fixture(self):
        self.registry = {'cases': [{'id': 'negative.assignment', 'category': 'binding',
                                   'input': {'value': {'a': [1, 'x']}}}]}
        self.spec = {'negative_categories': ['binding', 'loader'], 'families': [{
            'id': 'binding', 'domains': {'form': ['assignment', 'declare'], 'stage': ['post-pin']},
            'cases': [{'case': 'negative.assignment', 'values': {'form': 'assignment', 'stage': 'post-pin'}}]}]}

    def setUp(self):
        self.fixture()

    def check(self):
        return tool.coverage_manifest(self.spec, self.registry)

    def test_dimension_never_tried_is_visible(self):
        result = self.check()
        self.assertEqual(result['families'][0]['missing_combinations'], [{'form': 'declare', 'stage': 'post-pin'}])
        self.assertEqual(result['missing_categories'], ['loader'])

    def test_nonvacuity_rule_matching_nothing_must_fail(self):
        self.spec['families'][0]['cases'] = []
        with self.assertRaisesRegex(tool.CheckError, 'matches no input'):
            self.check()

    def test_reasoned_empty_family_is_visible(self):
        self.spec['families'].append({'id': 'browser', 'domains': {'environment': ['browser']},
                                      'cases': [], 'empty_reason': 'POSIX Node is the declared host.'})
        self.assertEqual(self.check()['families'][1]['empty_reason'], 'POSIX Node is the declared host.')

    def test_dimension_missing_from_case(self):
        del self.spec['families'][0]['cases'][0]['values']['stage']
        with self.assertRaisesRegex(tool.CheckError, 'dimensions differ'):
            self.check()

    def test_dimension_value_outside_domain(self):
        self.spec['families'][0]['cases'][0]['values']['stage'] = 'before'
        with self.assertRaisesRegex(tool.CheckError, 'undeclared dimension value'):
            self.check()

    def test_empty_domain(self):
        self.spec['families'][0]['domains']['stage'] = []
        with self.assertRaisesRegex(tool.CheckError, 'empty dimension domain'):
            self.check()

    def test_undeclared_family_case(self):
        self.registry['cases'].append({'id': 'other'})
        with self.assertRaisesRegex(tool.CheckError, 'every case'):
            self.check()

    def test_seed_cannot_replace_input(self):
        self.registry['cases'][0]['input'] = {'seed': 42}
        with self.assertRaisesRegex(tool.CheckError, 'stored inputs'):
            self.check()

    def test_seed_metadata_needs_version_and_commit(self):
        self.registry['cases'][0]['input']['seed'] = 42
        with self.assertRaisesRegex(tool.CheckError, 'version and commit'):
            self.check()

    def test_reading_not_a_kill_and_reason_visible(self):
        self.spec['readings'] = [{'id': 'reading.guard', 'status': 'closed_by_reading',
                                  'reason': 'The fixture has no such comparator.'}]
        result = self.check()
        self.assertEqual(result['reading_kills'], 0)
        self.assertEqual(result['readings'], self.spec['readings'])

    def test_waiver_without_reason(self):
        self.spec['readings'] = [{'id': 'waived.guard', 'status': 'waived', 'reason': ''}]
        with self.assertRaisesRegex(tool.CheckError, 'needs reason'):
            self.check()

    def test_mutation_identity_is_content_not_location(self):
        mutant = dict(path='source.py', before='return 1', after='return 2', operator='replace')
        key = tool.mutation_key(mutant)
        self.assertEqual(key, tool.mutation_key(dict(mutant, line=500, id='renamed')))
        for field, value in [('path', 'other.py'), ('before', 'return 0'), ('after', 'return 3'), ('operator', 'remove')]:
            self.assertNotEqual(key, tool.mutation_key(dict(mutant, **{field: value})))


class ResultTests(RepositoryFixture):
    fixture = runner_fixtures.RunnerTests.fixture
    outcome = runner_fixtures.RunnerTests.outcome
    def test_syntax_error_invalid(self):
        result, state = self.outcome(self.fixture(after='this is not valid python !!!'))
        self.assertEqual(state, 'setup_error')
        self.assertTrue(result['cases'][0]['mutations'][0]['invalid'])

    def test_import_error_invalid(self):
        _, state = self.outcome(self.fixture(after='import tools01_missing_module'))
        self.assertEqual(state, 'setup_error')

    def test_first_named_assertion_reported(self):
        result, _ = self.outcome(self.fixture())
        self.assertEqual(result['cases'][0]['mutations'][0]['killed_by'], 'exact-value')

    def test_stale_site_has_explicit_count(self):
        result, _ = self.outcome(self.fixture(before='changed site'))
        self.assertEqual(result['cases'][0]['mutations'][0]['run']['matches'], 0)

    def sampled_fixture(self):
        self.fixture()
        spec = json.loads((self.root / 'registry.json').read_text())
        spec['determinism_sample'] = ['case']
        self.document('registry.json', spec)
        return self.commit('sample')

    def test_determinism_repeat(self):
        result, _ = self.outcome(self.sampled_fixture())
        self.assertTrue(result['cases'][0]['determinism']['passed'])

    def test_determinism_changed_outcome(self):
        rev = self.sampled_fixture()
        def run(passed):
            return {'status': 'finished', 'exit': 0 if passed else 17,
                    'output': json.dumps(dict(case='case', assertion='exact-value', reached=True, passed=passed))}
        with patch.object(tool, 'run_case', side_effect=[run(True), run(False), run(False), run(False)]):
            result, _ = self.outcome(rev)
        self.assertFalse(result['cases'][0]['determinism']['passed'])
        self.assertEqual(result['result'], 'attention_required')

    def test_determinism_changed_mutant_is_not_killed(self):
        rev = self.sampled_fixture()
        def run(passed):
            return {'status': 'finished', 'exit': 0 if passed else 17,
                    'output': json.dumps(dict(case='case', assertion='exact-value', reached=True, passed=passed))}
        with patch.object(tool, 'run_case', side_effect=[run(True), run(False), run(True), run(True)]):
            result, status = self.outcome(rev)
        self.assertEqual(status, 'nondeterministic')
        self.assertNotIn('killed_by', result['cases'][0]['mutations'][0])


if __name__ == '__main__':
    unittest.main()
