"""TOOLS-01 implementer counterexamples for adoption, dependency and clean-C evidence."""
import json
import sys
from unittest.mock import patch
from test_packet_tools import RepositoryFixture, tool


class CorpusTests(RepositoryFixture):
    def fixture(self, statuses=('non_executable', 'pending')):
        rows = [{'revision': self.b, 'path': 'source.md', 'line': 1, 'kind': 'inline js',
                 'sha256': tool.digest(b'const value = 1;\n'), 'disposition': 'extract'}]
        self.document('origins.json', rows)
        catalog = self.commit('catalog')
        self.document('inventory.json', {'version': 1, 'catalogs': [{
            'revision': catalog, 'path': 'origins.json', 'kind': 'artifact', 'count': 1,
            'sha256': tool.digest((self.root / 'origins.json').read_bytes())}],
            'additional_sources': [{'revision': self.b, 'path': 'sealed.txt', 'line': 1,
                'sha256': tool.digest((self.root / 'sealed.txt').read_bytes()), 'disposition': 'record'}]})
        rev = self.commit('inventory')
        origins = tool.inventory(self.reader, rev, 'inventory.json')['origins']
        self.document('registry.json', {'version': 1, 'cases': [{'id': 'example'}]})
        self.document('verify.json', {'version': 1, 'checks': [
            {'id': 'unit', 'argv': ['python3', '-B', 'fixture.py']},
            {'id': 'mutants', 'operation': 'mutations', 'spec': 'registry.json',
             'expected': 'selected_cases_passed'}]})
        self.document('corpus.json', {'version': 1, 'inventory': 'inventory.json',
            'registry': 'registry.json', 'verification': 'verify.json',
            'suites': [{'id': 'suite', 'files': ['source.md'], 'command': 'unit'}],
            'mappings': [{'origin': origin['id'], 'status': status, 'rationale': 'Fixture classification',
                          'reason': 'record', 'targets': ['example'] if status == 'case' else ['suite']}
                         for origin, status in zip(origins, statuses)]})
        return self.commit('adoption')

    def revise(self, change):
        data = json.loads((self.root / 'corpus.json').read_text())
        change(data)
        self.document('corpus.json', data)
        return self.commit('change adoption')

    def check(self, rev):
        return tool.corpus(self.reader, rev, 'corpus.json')

    def test_pending_is_not_complete(self):
        result = self.check(self.fixture())
        self.assertEqual(result['pending_adoption'], 1)
        self.assertFalse(result['mapping_complete'])
        self.assertFalse(result['full_corpus_complete'])

    def test_complete_mapping_is_not_execution(self):
        result = self.check(self.fixture(('case', 'suite')))
        self.assertTrue(result['mapping_complete'])
        self.assertEqual(result['execution'], 'not evaluated')
        self.assertFalse(result['full_corpus_complete'])

    def test_missing_origin_cannot_shrink_obligation(self):
        self.fixture()
        rev = self.revise(lambda d: d['mappings'].pop())
        with self.assertRaisesRegex(tool.CheckError, 'every origin'):
            self.check(rev)

    def test_duplicate_origin(self):
        self.fixture()
        rev = self.revise(lambda d: d['mappings'].append(d['mappings'][0]))
        with self.assertRaisesRegex(tool.CheckError, 'duplicate mapping'):
            self.check(rev)

    def test_duplicate_cycle(self):
        self.fixture()
        def change(d):
            for i in range(2):
                d['mappings'][i].update(status='duplicate', target=d['mappings'][1-i]['origin'])
        with self.assertRaisesRegex(tool.CheckError, 'cyclic'):
            self.check(self.revise(change))

    def test_duplicate_pending_stays_pending(self):
        self.fixture()
        rev = self.revise(lambda d: d['mappings'][0].update(status='duplicate', target=d['mappings'][1]['origin']))
        self.assertEqual(self.check(rev)['pending_adoption'], 2)

    def test_unavailable_case_is_not_coverage(self):
        self.fixture()
        rev = self.revise(lambda d: d['mappings'][0].update(status='case', targets=['missing']))
        with self.assertRaisesRegex(tool.CheckError, 'target absent'):
            self.check(rev)

    def test_missing_suite_source(self):
        self.fixture()
        rev = self.revise(lambda d: d['suites'][0].update(files=['missing.ts']))
        with self.assertRaisesRegex(tool.CheckError, 'missing regular'):
            self.check(rev)

    def test_non_executable_requires_reason(self):
        self.fixture()
        rev = self.revise(lambda d: d['mappings'][0].update(reason='filename says so'))
        with self.assertRaisesRegex(tool.CheckError, 'evidence reason'):
            self.check(rev)

    def change_plan(self, change):
        self.fixture(('case', 'suite'))
        data = json.loads((self.root / 'verify.json').read_text())
        change(data)
        self.document('verify.json', data)
        return self.commit('execution plan')

    def test_suite_command_must_be_scheduled(self):
        self.fixture(('case', 'suite'))
        rev = self.revise(lambda d: d['suites'][0].update(command='never-run'))
        error = None
        try:
            self.check(rev)
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError)
        self.assertIn('command absent', str(error))

    def test_corpus_mutations_must_be_scheduled(self):
        rev = self.change_plan(lambda d: d['checks'].pop())
        with self.assertRaisesRegex(tool.CheckError, 'registry must run'):
            self.check(rev)

    def test_suite_cannot_claim_default_for_unexecuted_profile(self):
        def change(d):
            d['profiles_not_run'] = [dict(id='live', reason='credentials required', checks=[d['checks'].pop(0)])]
        rev = self.change_plan(change)
        with self.assertRaisesRegex(tool.CheckError, 'profile disagrees'):
            self.check(rev)

    def test_unexecuted_profile_mapping_is_visible(self):
        def change(d):
            d['profiles_not_run'] = [dict(id='live', reason='credentials required', checks=[d['checks'].pop(0)])]
        self.change_plan(change)
        rev = self.revise(lambda d: d['suites'][0].update(profile='live'))
        result = self.check(rev)
        self.assertEqual(result['suite_execution'], [dict(suite='suite', command='unit',
            profile='live', execution='not_run', reason='credentials required')])
        self.assertEqual(result['execution'], 'not evaluated')

    def test_duplicate_execution_command(self):
        rev = self.change_plan(lambda d: d.update(profiles_not_run=[dict(
            id='live', reason='credentials required', checks=[d['checks'][0]])]))
        with self.assertRaisesRegex(tool.CheckError, 'execution command IDs: duplicate'):
            self.check(rev)

    def test_duplicate_profile(self):
        with self.assertRaisesRegex(tool.CheckError, 'profile IDs: duplicate'):
            tool.execution_plan(dict(checks=[], profiles_not_run=[dict(id='live'), dict(id='live')]))

    def test_default_profile_cannot_be_unexecuted(self):
        with self.assertRaisesRegex(tool.CheckError, 'deterministic profile must execute'):
            tool.execution_plan(dict(checks=[], profiles_not_run=[dict(id='deterministic',
                reason='wrong default exclusion', checks=[dict(id='unit', argv=['true'])])]))

    def test_profile_reason_required(self):
        with self.assertRaisesRegex(tool.CheckError, 'profile needs a reason'):
            tool.execution_plan(dict(checks=[], profiles_not_run=[dict(id='live', reason='',
                checks=[dict(id='unit', argv=['true'])])]))

    def test_profile_commands_required(self):
        with self.assertRaisesRegex(tool.CheckError, 'profile needs commands'):
            tool.execution_plan(dict(checks=[], profiles_not_run=[dict(id='live', reason='credentials', checks=[])]))

    def test_profile_argv_required(self):
        with self.assertRaisesRegex(tool.CheckError, 'profile command needs argv'):
            tool.execution_plan(dict(checks=[], profiles_not_run=[dict(id='live', reason='credentials',
                checks=[dict(id='live-check', argv=None)])]))


class DependencyTests(RepositoryFixture):
    def fixture(self):
        self.document('package-lock.json', {'packages': {'node_modules/example': {'version': '1.0.0'}}})
        rev = self.commit('lock')
        self.document('node_modules/example/package.json', {'version': '1.0.0'})
        self.write('node_modules/example/index.js', 'export default 1;\n')
        dep = {'path': 'node_modules/example', 'version': '1.0.0', 'files': {
            p: tool.digest((self.root / 'node_modules/example' / p).read_bytes())
            for p in ('package.json', 'index.js')}}
        return rev, dep

    def test_pinned_bytes_loaded(self):
        rev, dep = self.fixture()
        self.assertEqual(len(tool.dependency_files(self.reader, rev, [dep])), 2)

    def test_changed_bytes_same_version_refused(self):
        rev, dep = self.fixture()
        self.write('node_modules/example/index.js', 'export default 2;\n')
        with self.assertRaisesRegex(tool.CheckError, 'digest mismatch'):
            tool.dependency_files(self.reader, rev, [dep])

    def test_lock_version_mismatch(self):
        rev, dep = self.fixture()
        dep['version'] = '2.0.0'
        with self.assertRaisesRegex(tool.CheckError, 'version differs'):
            tool.dependency_files(self.reader, rev, [dep])

    def test_symlinked_dependency_refused(self):
        rev, dep = self.fixture()
        path = self.root / 'node_modules/example/index.js'
        path.unlink()
        path.symlink_to(self.root / 'sealed.txt')
        with self.assertRaisesRegex(tool.CheckError, 'symlink refused'):
            tool.dependency_files(self.reader, rev, [dep])


class VerificationTests(RepositoryFixture):
    def fixture(self, script='print("tests 3; skips 0")'):
        self.write('check.py', script + '\n')
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'},
                            'census': {'roots': ['check.py']}}, 'checks': [{
            'id': 'unit', 'argv': [sys.executable, '-B', 'check.py'], 'timeout_seconds': 2,
            'output_limit_bytes': 1024, 'counts': {'tests': r'tests (\d+)', 'skips': r'skips (\d+)'},
            'minimum_counts': {'tests': 1}, 'exact_counts': {'skips': 0}}]})
        return self.commit('verification')

    def test_command_counts_and_versions(self):
        result = tool.verify(self.reader, self.fixture(), 'verify.json')
        self.assertEqual(result['result'], 'checks_passed')
        self.assertEqual(result['checks'][0]['counts'], {'tests': 3, 'skips': 0})
        self.assertEqual(result['acceptance'], 'not evaluated')

    def test_dirty_source_refused(self):
        rev = self.fixture()
        self.write('check.py', 'print("tests 999; skips 0")\n')
        with self.assertRaisesRegex(tool.CheckError, 'must be clean'):
            tool.verify(self.reader, rev, 'verify.json')

    def test_wrong_head_refused(self):
        self.fixture()
        with self.assertRaisesRegex(tool.CheckError, 'HEAD must'):
            tool.verify(self.reader, self.b, 'verify.json')

    def test_green_exit_with_no_tests_does_not_pass(self):
        result = tool.verify(self.reader, self.fixture('print("tests 0; skips 0")'), 'verify.json')
        self.assertEqual(result['result'], 'attention_required')

    def test_skipped_test_does_not_pass(self):
        result = tool.verify(self.reader, self.fixture('print("tests 3; skips 1")'), 'verify.json')
        self.assertEqual(result['result'], 'attention_required')

    def test_duplicate_counts_are_not_one_result(self):
        rev = self.fixture('print("tests 3; tests 3; skips 0")')
        with self.assertRaisesRegex(tool.CheckError, 'ambiguous or missing'):
            tool.verify(self.reader, rev, 'verify.json')

    def test_command_source_mutation_refused(self):
        rev = self.fixture('from pathlib import Path\nPath("check.py").write_text("changed")\nprint("tests 3; skips 0")')
        with self.assertRaisesRegex(tool.CheckError, 'must be clean'):
            tool.verify(self.reader, rev, 'verify.json')
