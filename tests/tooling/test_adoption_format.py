"""Adoption format 2: origin states, exact reconciliation with the pinned format-1 manifest (P1-R)."""
import copy
import json

from test_packet_tools import RepositoryFixture, tool


class FormatTwoTests(RepositoryFixture):
    def fixture(self, change=None, legacy_change=None):
        rows = [{'revision': self.b, 'path': 'source.md', 'line': 1, 'kind': 'inline js',
                 'sha256': tool.digest(b'const value = 1;\n'), 'disposition': 'extract'}]
        self.document('origins.json', rows)
        catalog = self.commit('catalog')
        self.document('inventory.json', {'version': 1, 'catalogs': [{
            'revision': catalog, 'path': 'origins.json', 'kind': 'artifact', 'count': 1,
            'sha256': tool.digest((self.root / 'origins.json').read_bytes())}],
            'additional_sources': [{'revision': self.b, 'path': 'sealed.txt', 'line': 1,
                'sha256': tool.digest((self.root / 'sealed.txt').read_bytes()), 'disposition': 'record'}]})
        self.document('registry.json', {'version': 1, 'cases': [{'id': 'example'}]})
        self.document('verify.json', {'version': 1, 'checks': [
            {'id': 'unit', 'argv': ['python3', '-B', 'fixture.py']},
            {'id': 'mutants', 'operation': 'mutations', 'spec': 'registry.json', 'expected': 'selected_cases_passed'}]})
        rev = self.commit('inventory')
        origins = [row['id'] for row in tool.inventory(self.reader, rev, 'inventory.json')['origins']]
        legacy = {'version': 1, 'inventory': 'inventory.json', 'registry': 'registry.json', 'verification': 'verify.json',
                  'suites': [{'id': 'suite', 'files': ['source.md'], 'command': 'unit'}],
                  'mappings': [{'origin': origins[0], 'status': 'suite', 'rationale': 'Old mapping', 'targets': ['suite']},
                               {'origin': origins[1], 'status': 'pending', 'rationale': 'Pending'}]}
        if legacy_change:
            legacy_change(legacy)
        self.document('legacy.json', legacy)
        old = self.commit('format 1')
        data = {'version': 2, 'inventory': 'inventory.json', 'registry': 'registry.json', 'verification': 'verify.json',
                'migration': {'source': {'format': 1, 'revision': old, 'path': 'legacy.json',
                                         'sha256': tool.digest((self.root / 'legacy.json').read_bytes())}},
                'origins': [{'id': origins[0], 'state': 'pending_revalidation',
                             'legacy': {'status': 'suite', 'rationale': 'Old mapping', 'targets': ['suite']}},
                            {'id': origins[1], 'state': 'pending'}],
                'counterexamples': [], 'suite_targets': [], 'preserved': [], 'families': [], 'areas': [],
                **self.format_two_tables()}
        if change:
            change(data)
        self.document('corpus.json', data)
        return self.commit('format 2')

    def check(self, rev):
        return tool.corpus(self.reader, rev, 'corpus.json')

    def test_migrated_rows_await_revalidation_and_counts_stay_separate(self):
        result = self.check(self.fixture())
        self.assertEqual(result['format'], 2)
        self.assertEqual(result['result'], 'extraction_pending')
        self.assertEqual(result['states'], {'pending_revalidation': 1, 'pending': 1})
        self.assertEqual(result['pending_revalidation'], {'suite': 1})
        self.assertEqual(result['counts']['kills'], 0)
        self.assertFalse(result['full_corpus_complete'])

    def test_missing_origin_refused(self):
        rev = self.fixture(lambda data: data['origins'].pop())
        with self.assertRaisesRegex(tool.CheckError, 'every origin'):
            self.check(rev)

    def test_duplicate_origin_refused(self):
        rev = self.fixture(lambda data: data['origins'].append(copy.deepcopy(data['origins'][0])))
        with self.assertRaisesRegex(tool.CheckError, 'duplicate record ID'):
            self.check(rev)

    def test_unknown_state_refused(self):
        rev = self.fixture(lambda data: data['origins'][1].update(state='accepted'))
        with self.assertRaisesRegex(tool.CheckError, 'unknown origin state'):
            self.check(rev)

    def test_legacy_record_must_equal_the_pinned_source(self):
        rev = self.fixture(lambda data: data['origins'][0]['legacy'].update(rationale='Rewritten'))
        with self.assertRaisesRegex(tool.CheckError, 'differs from the format-1 source'):
            self.check(rev)

    def test_migrated_row_cannot_return_to_pending(self):
        rev = self.fixture(lambda data: data['origins'][0].update(state='pending'))
        with self.assertRaisesRegex(tool.CheckError, 'cannot return to pending'):
            self.check(rev)

    def test_unmapped_row_cannot_await_revalidation(self):
        rev = self.fixture(lambda data: data['origins'][1].update(state='pending_revalidation'))
        with self.assertRaisesRegex(tool.CheckError, 'only a revision-2 mapping'):
            self.check(rev)

    def test_closure_claims_are_refused_until_implemented(self):
        rev = self.fixture(lambda data: data['origins'][1].update(state='complete'))
        with self.assertRaisesRegex(tool.CheckError, 'closure is not implemented'):
            self.check(rev)

    def test_source_digest_mismatch_refused(self):
        rev = self.fixture(lambda data: data['migration']['source'].update(sha256='0' * 64))
        with self.assertRaisesRegex(tool.CheckError, 'format-1 source digest'):
            self.check(rev)

    def test_missing_table_refused(self):
        rev = self.fixture(lambda data: data.pop('families'))
        with self.assertRaisesRegex(tool.CheckError, 'every adoption table'):
            self.check(rev)

    def test_hold_decision_must_exist(self):
        rev = self.fixture(lambda data: data['holds']['claims'][0].update(decisions=['absent.md']))
        with self.assertRaisesRegex(tool.CheckError, 'missing regular source'):
            self.check(rev)

    def test_hold_needs_owner(self):
        rev = self.fixture(lambda data: data['holds']['claims'][0].update(owner=''))
        with self.assertRaisesRegex(tool.CheckError, 'owner and decisions'):
            self.check(rev)

    def test_format_one_is_legacy_unverified(self):
        self.fixture()
        legacy = json.loads((self.root / 'legacy.json').read_text())
        for row in legacy['mappings']:
            row.update(status='suite', targets=['suite'])
        self.document('legacy.json', legacy)
        rev = self.commit('complete format 1')
        result = tool.corpus(self.reader, rev, 'legacy.json')
        self.assertTrue(result['mapping_complete'])
        self.assertEqual((result['result'], result['target_verification']), ('legacy_unverified', 'legacy_unverified'))

    def test_unknown_format_refused(self):
        rev = self.fixture(lambda data: data.update(version=3))
        with self.assertRaisesRegex(tool.CheckError, 'unsupported schema'):
            self.check(rev)
