"""TOOLS-CONT-04: required-reference normalization through real Git blobs and full corpus."""
import test_adoption_format
from test_packet_tools import RepositoryFixture, tool


class ContextReferenceTests(RepositoryFixture):
    fixture = test_adoption_format.FormatTwoTests.fixture
    check = test_adoption_format.FormatTwoTests.check

    def prepare(self, form='relative', note='Required [deeper](deeper.md#result).\n'):
        self.write('form.txt', form + '\n')
        self.write('docs/records/note.md', note)
        self.write('docs/records/deeper.md', 'Required transitive context.\n')
        self.write('docs/wrong/note.md', 'Wrong-directory substitute.\n')
        self.pin = self.commit('records at reference revision')
        destinations = {
            'relative': './docs/records/note.md#result',
            'direct': 'docs/records/note.md',
            'qualified': f'https://github.com/ArrokothI/arrokothi/blob/{self.pin}/docs/records/note.md#result',
            'short': f'https://github.com/ArrokothI/arrokothi/blob/{self.pin[:8]}/docs/records/note.md',
        }
        destination = destinations.get(form, form)
        text = destination if form == 'direct' else '[note](' + destination + ')'
        self.write('sealed.txt', text + '\n')
        self.b = self.commit('origin at a different revision')
        return self.pin if form in ('qualified', 'short') else self.b

    def run_context(self, revision, paths=('docs/records/note.md', 'docs/records/deeper.md'), reasons=None):
        def change(spec):
            spec['origins'][1].update(state='complete', closure={
                'links': [], 'non_executable': {'reason': 'record', 'rationale': 'A sealed record.'},
                'context': [{'revision': self.b, 'path': 'sealed.txt', 'start': 1, 'end': 1}] + [
                    {'revision': revision, 'path': path, 'start': 1, 'end': 1} for path in paths],
                'context_reasons': reasons or {}})
        return self.check(self.fixture(change))

    def test_supported_references_close_with_their_one_hop_context(self):
        """TOOLS-02 design 06 §6 (owner choice 14): the named record is context; the record it names is not walked."""
        for form in ('relative', 'direct', 'qualified', 'short'):
            with self.subTest(form=form):
                revision = self.prepare(form)
                result = self.run_context(revision, ('docs/records/note.md',))
                self.assertEqual(result['closures']['complete'], 1)
                self.assertEqual(result['closures']['context_candidates'], 1)

    def test_omitted_relative_and_qualified_records_cannot_be_reasoned_away(self):
        for form in ('relative', 'qualified'):
            with self.subTest(form=form):
                revision = self.prepare(form)
                with self.assertRaisesRegex(tool.CheckError, 'named sealed record is outside the context'):
                    self.run_context(revision, (), {self.pin: 'Omit the quoted revision.'})

    def test_a_record_named_only_by_a_named_record_is_not_walked(self):
        """Owner choice 14 replaces the refusal of an uncovered transitive record (one hop)."""
        revision = self.prepare('qualified')
        self.assertEqual(self.run_context(revision, ('docs/records/note.md',))['closures']['complete'], 1)

    def test_wrong_directory_does_not_cover_a_relative_link(self):
        revision = self.prepare()
        with self.assertRaisesRegex(tool.CheckError, 'outside the context: docs/records/note.md'):
            self.run_context(revision, ('docs/wrong/note.md', 'docs/records/deeper.md'))

    def test_same_bytes_at_the_wrong_revision_are_not_context(self):
        self.prepare('qualified')
        with self.assertRaisesRegex(tool.CheckError, 'outside the context: docs/records/note.md'):
            self.run_context(self.b)

    def test_transitive_relative_link_keeps_its_referrers_revision(self):
        self.prepare('qualified')
        self.write('docs/records/deeper.md', 'Changed after the reference pin.\n')
        self.b = self.commit('later record')
        self.assertEqual(self.run_context(self.pin)['closures']['complete'], 1)

    def test_a_cycle_through_a_named_record_is_not_walked(self):
        revision = self.prepare(note='Required [deeper](../records/deeper.md).\n')
        self.write('docs/records/deeper.md', 'Cycle [note](note.md).\n')
        self.b = self.commit('relative cycle')
        result = self.run_context(self.b, ('docs/records/note.md',))
        self.assertEqual(result['closures']['context_candidates'], 1)

    def test_a_named_records_own_references_are_not_walked(self):
        self.prepare()
        self.write('docs/records/note.md', f'[old](https://github.com/ArrokothI/arrokothi/blob/{self.pin}/docs/records/note.md).\n')
        self.b = self.commit('same path names its previous version')
        self.assertEqual(self.run_context(self.b, ('docs/records/note.md',))['closures']['complete'], 1)

    def test_unsupported_record_forms_refuse_with_declared_error(self):
        for form in ('https://other.example/docs/records/note.md',
                     'https://github.com/ArrokothI/arrokothi/blob/main/docs/records/note.md',
                     '/docs/records/note.md', './docs/records/note.md?raw=1',
                     '<./docs/records/note.md>', './docs/records/note.md "title"',
                     './docs/records/%6eote.md'):
            with self.subTest(form=form):
                self.prepare(form)
                error = None
                try:
                    self.run_context(self.b)
                except Exception as exc:
                    error = exc
                self.assertIsInstance(error, tool.CheckError, 'unsupported record form must be a declared refusal')
                self.assertIn('unsupported sealed-record reference', str(error))

    # TOOLS-02 design 06 §5 (owner choice 14): spellings the language now resolves, read in one record.
    def references(self, text, referring='docs/records/note.md'):
        self.write(referring, text)
        revision = self.commit('the referring record')
        return revision, tool.context_references(self.reader, revision, referring, text)

    def test_bare_relative_record_is_resolved_and_required(self):
        """Owner choice 14 replaces the earlier refusal of this spelling: the record is named and must be covered."""
        self.prepare()
        revision, (required, _) = self.references('Read deeper.md.\n')
        self.assertEqual(required, {(revision, 'docs/records/deeper.md')})

    def test_relative_subpath_and_revision_path_are_required_records(self):
        self.prepare()
        self.write('docs/records/sub/deep.md', 'A nested record.\n')
        self.commit('nested record')
        revision, (required, candidates) = self.references(f'See sub/deep.md and {self.pin}:docs/records/deeper.md.\n')
        self.assertEqual(required, {(revision, 'docs/records/sub/deep.md'), (self.pin, 'docs/records/deeper.md')})
        self.assertNotIn(self.pin, candidates)

    def test_directory_url_pattern_and_absent_spellings_are_candidates(self):
        self.prepare()
        text = ('The folder docs/records/, [an essay](https://example.com/engineering/post), [a guide](https://vendor.example/docs/en/guide), '
                '[gone](./missing.md), [outside](../../../other/docs/x.md), docs/records/$ and [elided](…).\n')
        _, (required, candidates) = self.references(text)
        self.assertEqual(required, set())
        self.assertEqual(candidates, {'docs/records', 'docs/records/missing.md', '../../../other/docs/x.md', 'docs/records/$', '…'})

    def test_a_pinned_tree_view_is_a_revision_candidate(self):
        self.prepare()
        _, (required, candidates) = self.references(f'[Pinned repository](https://github.com/ArrokothI/arrokothi/tree/{self.pin})\n')
        self.assertEqual((required, candidates), (set(), {self.pin}))
        with self.assertRaisesRegex(tool.CheckError, 'unsupported sealed-record reference'):
            self.references('[Moving](https://github.com/ArrokothI/arrokothi/tree/main/docs/records)\n')

    def test_source_code_link_syntax_is_plain_text(self):
        self.prepare()
        _, (required, candidates) = self.references("const label = names[kind]('hidden', 'other-scope');\n", 'docs/records/probe.mjs')
        self.assertEqual((required, candidates), (set(), set()))

    def test_a_record_absent_at_its_revision_needs_a_reason(self):
        """Owner choice 14 replaces the earlier refusal: a reference that names no entry at the revision it is read
        at is unresolvable text with a recorded reason."""
        self.prepare('./docs/records/missing.md')
        with self.assertRaisesRegex(tool.CheckError, 'unreasoned path or revision candidate in the context: docs/records/missing.md'):
            self.run_context(self.b, ())
        self.git('reset', '-q', '--hard', self.b)
        self.assertEqual(self.run_context(self.b, (), {'docs/records/missing.md': 'Never present at this revision.'})['closures']['complete'], 1)

    def test_bare_concept_name_that_is_not_a_sealed_record_is_not_resolved(self):
        self.prepare(note='The conceptual values.md contract applies.\n')
        self.assertEqual(self.run_context(self.b)['closures']['context_candidates'], 1)
