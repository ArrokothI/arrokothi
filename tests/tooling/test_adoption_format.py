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

    def pin_list(self, data, decision, origins, path=None):
        """R1-03: the decision's machine-readable list of transferred origins, in its attachment directory."""
        path = path or decision[:-len('.md')] + '/transferred.json'
        self.write(decision, 'Transfer decision.\n')
        self.document(path, [{'origin': origin} for origin in origins])
        data.setdefault('transfer_lists', []).append({'decision': decision, 'list': path,
                                                      'sha256': tool.digest((self.root / path).read_bytes())})

    def transfer(self, data, decision='decision.md', listed=None):
        data.update(transferred=[{'origin': data['origins'][0]['id'], 'decision': decision}])
        self.pin_list(data, decision, [data['origins'][0]['id']] if listed is None else listed)

    def test_transferred_revalidation_origins_complete_the_revalidation_scope(self):
        # Owner choices 04-05: only owner-transferred revalidation origins may stay open; pending ones are TOOLS-02's.
        result = self.check(self.fixture(self.transfer))
        self.assertEqual((result['result'], result['transferred']),
                         ('revalidation_complete', {'origins': 1, 'by_decision': {'decision.md': 1}, 'limited': {}}))

    def test_a_transferred_origin_is_an_open_revalidation_origin(self):
        def change(data):
            data.update(transferred=[{'origin': data['origins'][1]['id'], 'decision': 'decision.md'}])
            self.pin_list(data, 'decision.md', [data['origins'][1]['id']])
        with self.assertRaisesRegex(tool.CheckError, 'a transferred origin is an open revalidation origin'):
            self.check(self.fixture(change))

    def test_a_transferred_origin_names_its_decision_once(self):
        rev, error = self.fixture(lambda data: data.update(transferred=[{'origin': data['origins'][0]['id']}])), None
        try:
            self.check(rev)
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError, 'a transfer without its decision must be a declared refusal')
        self.assertIn('a transferred origin is unique and names its owner decision', str(error))

    def test_a_transferred_origin_is_listed_once(self):
        def change(data):
            self.transfer(data)
            data['transferred'] *= 2
        rev = self.fixture(change)
        with self.assertRaisesRegex(tool.CheckError, 'a transferred origin is unique and names its owner decision'):
            self.check(rev)

    def test_transferred_origins_are_a_list(self):
        rev = self.fixture(lambda data: data.update(transferred={'origin': data['origins'][0]['id']}))
        with self.assertRaisesRegex(tool.CheckError, 'transferred origins are a list'):
            self.check(rev)

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

    def test_a_complete_origin_needs_its_closure(self):
        rev = self.fixture(lambda data: data['origins'][1].update(state='complete'))
        error = None
        try:
            self.check(rev)
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError, 'missing closure must produce a declared refusal')
        self.assertIn('a complete origin records its closure', str(error))

    def test_corpus_cannot_waive_a_named_sealed_dependency(self):
        self.write('sealed.txt', 'Read docs/records/note.md.\n')
        self.write('docs/records/note.md', 'Read docs/records/deeper.md.\n')
        self.write('docs/records/deeper.md', 'Required transitive context.\n')
        self.b = self.commit('pinned sealed dependencies')

        def change(spec):
            spec['origins'][1].update(state='complete', closure={
                'links': [], 'non_executable': {'reason': 'record', 'rationale': 'A historical record.'},
                'context': [{'revision': self.b, 'path': 'sealed.txt', 'start': 1, 'end': 1}],
                'context_reasons': {'docs/records/note.md': 'Omit the named sealed record.'}})

        rev = self.fixture(change)
        with self.assertRaisesRegex(tool.CheckError, 'a named sealed record is outside the context: docs/records/note.md'):
            self.check(rev)

    def test_prose_triage_waits_for_its_step(self):
        rev = self.fixture(lambda data: data['origins'][1].update(state='triaged'))
        with self.assertRaisesRegex(tool.CheckError, 'prose triage is not implemented'):
            self.check(rev)

    def test_corpus_closes_valid_lf_context_with_embedded_separators(self):
        (self.root / 'sealed.txt').write_bytes('prefix\r\u2028\u2029\nRead docs/records/note.md.\n'.encode())
        self.write('docs/records/note.md', 'Sealed\r\u2028\u2029content.\n')
        self.b = self.commit('LF sealed context')

        def change(spec):
            spec['origins'][1].update(state='complete', closure={
                'links': [], 'non_executable': {'reason': 'record', 'rationale': 'A historical record.'},
                'context': [{'revision': self.b, 'path': 'sealed.txt', 'start': 1, 'end': 2},
                            {'revision': self.b, 'path': 'docs/records/note.md', 'start': 1, 'end': 1}]})

        result = self.check(self.fixture(change))
        self.assertEqual(result['closures']['complete'], 1)
        self.assertEqual(result['closures']['context_candidates'], 1)

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
