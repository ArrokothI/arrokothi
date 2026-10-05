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

    def test_supported_references_close_only_with_their_transitive_context(self):
        for form in ('relative', 'direct', 'qualified', 'short'):
            with self.subTest(form=form):
                revision = self.prepare(form)
                result = self.run_context(revision)
                self.assertEqual(result['closures']['complete'], 1)
                self.assertEqual(result['closures']['context_candidates'], 2)

    def test_omitted_relative_and_qualified_records_cannot_be_reasoned_away(self):
        for form in ('relative', 'qualified'):
            with self.subTest(form=form):
                revision = self.prepare(form)
                with self.assertRaisesRegex(tool.CheckError, 'named sealed record is outside the context'):
                    self.run_context(revision, (), {self.pin: 'Omit the quoted revision.'})

    def test_missing_transitive_record_is_refused(self):
        revision = self.prepare('qualified')
        with self.assertRaisesRegex(tool.CheckError, 'outside the context: docs/records/deeper.md'):
            self.run_context(revision, ('docs/records/note.md',))

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

    def test_relative_parent_and_cycles_are_resolved_by_revision_and_path(self):
        revision = self.prepare(note='Required [deeper](../records/deeper.md).\n')
        self.write('docs/records/deeper.md', 'Cycle [note](note.md).\n')
        self.b = self.commit('relative cycle')
        result = self.run_context(self.b)
        self.assertEqual(result['closures']['context_candidates'], 2)

    def test_same_path_at_two_revisions_is_traversed_twice(self):
        self.prepare()
        self.write('docs/records/note.md', f'[old](https://github.com/ArrokothI/arrokothi/blob/{self.pin}/docs/records/note.md).\n')
        self.b = self.commit('same path names its previous version')
        with self.assertRaisesRegex(tool.CheckError, 'outside the context: docs/records/note.md@' + self.pin):
            self.run_context(self.b)

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

    def test_bare_relative_required_record_is_refused(self):
        self.prepare(note='Read deeper.md.\n')
        with self.assertRaisesRegex(tool.CheckError, 'unsupported sealed-record reference: deeper.md'):
            self.run_context(self.b)

    def test_missing_named_record_cannot_be_reasoned_away(self):
        self.prepare('./docs/records/missing.md')
        with self.assertRaisesRegex(tool.CheckError, 'missing regular source'):
            self.run_context(self.b, (), {'docs/records/missing.md': 'No longer present.'})

    def test_bare_concept_name_that_is_not_a_sealed_record_is_not_resolved(self):
        self.prepare(note='The conceptual values.md contract applies.\n')
        self.assertEqual(self.run_context(self.b)['closures']['context_candidates'], 1)
