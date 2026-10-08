"""P1-X area map, area derivation and the gate verify always runs, advisory under owner choice 07:
it reports the open origins and prose_pending records per touched area and never fails verify."""
import sys
import test_adoption_format
from test_packet_tools import RepositoryFixture, tool

MAP = [{'id': 'kernel', 'globs': ['packages/kernel/**']}, {'id': 'notes', 'globs': ['docs/notes.md']},
       {'id': 'docs', 'globs': ['docs/**']}, {'id': 'scripts', 'globs': ['scripts/**']}, {'id': 'other', 'globs': ['**']}]
PACKET = 'docs/verification.json'


class AreaGateTests(RepositoryFixture):
    fixture = test_adoption_format.FormatTwoTests.fixture
    check = test_adoption_format.FormatTwoTests.check

    def setUp(self):
        super().setUp()
        # The two fixture origins name one path each: the artifact a kernel file, the sealed record a note.
        self.write('source.md', '```js\nconst value = 1;\n```\n\nA recorded probe of packages/kernel/src/values.ts.\n')
        self.write('sealed.txt', 'historical evidence; see docs/notes.md\n')
        self.b = self.commit('origins that name paths')

    def candidate(self, changes, areas=MAP, administrative=(), extra=None):
        def change(data):
            data['areas'] = areas
            if extra:
                extra(data)
        rev = self.fixture(change)
        self.document(PACKET, {'version': 1, 'base': rev, 'administrative_files': list(administrative)})
        for path in changes:
            self.write(path, 'changed\n')
        return self.commit('candidate')

    def gate(self, rev):
        return tool.area_gate(self.reader, rev, PACKET, 'corpus.json')

    def test_first_matching_area_and_coverage(self):
        rev = self.commit('nothing') if False else self.b
        ids, area_of, paths = tool.area_map(self.reader, rev, MAP)
        self.assertEqual((area_of('packages/kernel/src/values.ts'), area_of('docs/notes.md'), area_of('source.md')),
                         ('kernel', 'notes', 'other'))
        self.assertEqual(ids, ['kernel', 'notes', 'docs', 'scripts', 'other'])

    def test_area_map_refusals(self):
        for areas, message in [([], 'the area map lists its areas'),
                               ([{'id': 'kernel', 'globs': ['packages/**']}], 'the area map does not cover'),
                               ([{'id': 'a', 'globs': ['**']}, {'id': 'a', 'globs': ['**']}], 'area IDs: duplicate'),
                               ([{'id': 'a', 'globs': []}], 'an area names its globs')]:
            with self.subTest(message=message):
                with self.assertRaisesRegex(tool.CheckError, message):
                    tool.area_map(self.reader, self.b, areas)

    def test_derivation_is_lexical_and_an_origin_naming_nothing_is_ungated(self):
        rev = self.fixture(lambda data: data.update(areas=MAP))
        spec = self.reader.document(rev, 'corpus.json', versions=(2,))
        intake = tool.inventory(self.reader, rev, spec['inventory'])
        ids, area_of, paths = tool.area_map(self.reader, rev, MAP)
        derived = tool.origin_areas(self.reader, spec, intake, ids, area_of, paths)
        # Each fixture origin also lies outside docs/, so its own path adds its area.
        self.assertEqual(sorted(row['areas'] for row in derived.values()), [['kernel', 'other'], ['notes', 'other']])
        self.write('docs/empty.md', 'A record that names no path.\n')
        rev = self.commit('a record under docs/ that names nothing')
        intake = {'origins': [{'id': 'origin.empty', 'kind': 'artifact', 'revision': rev, 'path': 'docs/empty.md', 'line': 1}]}
        ids, area_of, paths = tool.area_map(self.reader, rev, MAP)
        derived = tool.origin_areas(self.reader, {'origins': [{'id': 'origin.empty', 'state': 'pending'}]}, intake,
                                    ids, area_of, paths)
        self.assertEqual(derived, {'origin.empty': {'state': 'pending', 'areas': [], 'derived': False, 'uncertain': False}})

    def listed(self, result):
        return {area: (row['origins'], row['records']) for area, row in result['by_area'].items()}

    def test_an_area_without_open_origins_reports_none(self):
        result = self.gate(self.candidate(['scripts/tool.py']))
        self.assertEqual((result['advisory'], result['result'], result['touched_areas']), (True, 'reported', ['scripts']))
        self.assertEqual((self.listed(result), result['reported']['open_origins'], result['ungated']),
                         ({'scripts': ([], [])}, 0, 0))

    def test_open_origins_in_a_touched_area_are_listed_with_counts(self):
        result = self.gate(self.candidate(['packages/kernel/src/values.ts']))
        self.assertEqual(result['result'], 'reported')
        self.assertEqual(result['by_area']['kernel']['open_origins'], 1)
        self.assertEqual(result['reported']['by_state'], {'pending_revalidation': 1})

    def test_docs_mental_model_root_markdown_and_administrative_records_touch_nothing(self):
        result = self.gate(self.candidate(['docs/notes.md', 'mental-model/rule.md', 'NOTES.md'],
                                          administrative=['docs/development/report.md']))
        # The sealed origin names docs/notes.md, yet editing that note touches no area (owner choice 06 rule 1).
        self.assertEqual((result['behaviour_paths'], result['touched_areas'], result['by_area']), (0, [], {}))

    def test_a_prose_pending_record_in_a_touched_area_is_listed(self):
        def prose(data):
            data['counterexamples'].append({'id': 'prose.one', 'kind': 'prose_pending', 'origins': [data['origins'][1]['id']],
                                            'required_result': 'A prose obligation.', 'areas': ['scripts']})
        result = self.gate(self.candidate(['scripts/tool.py'], extra=prose))
        self.assertEqual((result['result'], self.listed(result), result['reported']['prose_pending']),
                         ('reported', {'scripts': ([], ['prose.one'])}, 1))

    def test_a_prose_pending_record_names_areas_from_the_map(self):
        def prose(data):
            data['counterexamples'].append({'id': 'prose.one', 'kind': 'prose_pending', 'origins': [data['origins'][1]['id']],
                                            'required_result': 'A prose obligation.', 'areas': ['elsewhere']})
        with self.assertRaisesRegex(tool.CheckError, 'a prose_pending record names areas from the map: prose.one'):
            self.gate(self.candidate(['scripts/tool.py'], extra=prose))

    def test_the_base_must_be_an_ancestor_of_c(self):
        rev = self.candidate(['scripts/tool.py'])
        self.git('checkout', '-q', '--orphan', 'unrelated')
        self.write('unrelated.txt', 'another history\n')
        other = self.commit('unrelated root')
        self.git('checkout', '-q', rev)
        self.document(PACKET, {'version': 1, 'base': other, 'administrative_files': []})
        with self.assertRaisesRegex(tool.CheckError, 'the packet base is an ancestor of C'):
            self.gate(self.commit('base from another history'))

    def test_verify_refuses_a_spec_without_the_packet_verification(self):
        self.write('check.py', 'print("tests 1")\n')
        self.document('gate-verify.json', {'version': 1, 'limits': ['Fixture evidence only'],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}, 'census': {'roots': ['check.py']}},
            'checks': [{'id': 'unit', 'argv': [sys.executable, '-B', 'check.py'], 'timeout_seconds': 10,
                        'output_limit_bytes': 1024}]})
        rev, error = self.commit('a verify spec naming no packet'), None
        try:
            tool.verify(self.reader, rev, 'gate-verify.json')
        except Exception as exc:
            error = exc
        self.assertIsInstance(error, tool.CheckError, 'a spec naming no packet must be a declared refusal')
        self.assertIn('verify needs the packet verification spec', str(error))

    def test_verify_always_runs_the_gate_and_never_fails_on_it(self):
        rev = self.fixture(lambda data: data.update(areas=MAP))
        self.write(tool.ADOPTION_MANIFEST, (self.root / 'corpus.json').read_text())
        self.document(PACKET, {'version': 1, 'base': rev, 'administrative_files': []})
        self.write('check.py', 'print("tests 1")\n')
        self.document('gate-verify.json', {'version': 1, 'limits': ['Fixture evidence only'], 'candidate': PACKET,
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}, 'census': {'roots': ['check.py']}},
            'checks': [{'id': 'unit', 'argv': [sys.executable, '-B', 'check.py'], 'timeout_seconds': 10,
                        'output_limit_bytes': 1024}]})
        self.write('packages/kernel/src/values.ts', 'changed\n')
        result = tool.verify(self.reader, self.commit('candidate'), 'gate-verify.json')
        gate = result['checks'][-1]
        self.assertEqual((result['result'], [check['id'] for check in result['checks']]),
                         ('checks_passed', ['unit', 'area-gate']))
        self.assertEqual((gate['advisory'], gate['passed'], gate['result']['by_area']['kernel']['open_origins']), (True, True, 1))

    def test_corpus_needs_a_covering_area_map(self):
        with self.assertRaisesRegex(tool.CheckError, 'the area map does not cover'):
            self.check(self.fixture(lambda data: data.update(areas=MAP[:1])))
