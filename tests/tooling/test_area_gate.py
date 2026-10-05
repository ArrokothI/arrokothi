"""P1-X area map, area derivation and the unconditional gate (gate-design-01)."""
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

    def test_derivation_is_lexical_and_every_area_when_nothing_is_named(self):
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
        self.assertEqual(derived, {'origin.empty': {'state': 'pending', 'areas': sorted(ids), 'derived': False}})

    def test_an_untouched_area_passes(self):
        result = self.gate(self.candidate(['scripts/tool.py']))
        self.assertEqual((result['result'], result['touched_areas']), ('gate_passed', ['docs', 'scripts']))

    def test_a_touched_area_with_an_open_origin_blocks(self):
        result = self.gate(self.candidate(['packages/kernel/src/values.ts']))
        self.assertEqual(result['result'], 'gate_blocked')
        self.assertEqual([(row['state'], row['touched']) for row in result['blocking_origins']],
                         [('pending_revalidation', ['kernel'])])

    def test_declared_administrative_files_count_as_touched(self):
        result = self.gate(self.candidate([], administrative=['docs/notes.md']))
        self.assertEqual([(row['state'], row['touched']) for row in result['blocking_origins']], [('pending', ['notes'])])

    def test_a_prose_pending_record_in_a_touched_area_blocks(self):
        def prose(data):
            data['counterexamples'].append({'id': 'prose.one', 'kind': 'prose_pending', 'origins': [data['origins'][1]['id']],
                                            'required_result': 'A prose obligation.', 'areas': ['scripts']})
        result = self.gate(self.candidate(['scripts/tool.py'], extra=prose))
        self.assertEqual((result['result'], result['blocking_origins'], result['blocking_prose_pending']),
                         ('gate_blocked', [], [{'record': 'prose.one', 'touched': ['scripts']}]))

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

    def test_verify_runs_the_gate_whatever_its_checks(self):
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
        self.assertEqual((result['result'], [check['id'] for check in result['checks']]),
                         ('attention_required', ['unit', 'area-gate']))
        self.assertTrue(result['checks'][0]['passed'])
        self.assertEqual(result['checks'][1]['result']['result'], 'gate_blocked')

    def test_corpus_needs_a_covering_area_map(self):
        with self.assertRaisesRegex(tool.CheckError, 'the area map does not cover'):
            self.check(self.fixture(lambda data: data.update(areas=MAP[:1])))
