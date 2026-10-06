"""Design 06 R1-02: one Markdown block parse decides fence bounds for the inventory and the minimum
context. A fence origin closes only as a recognized closed fence; an uncertain line at or before a
section's end refuses closure, and an uncertain origin's areas come from its whole file."""
from test_packet_tools import RepositoryFixture, tool

NOTE = 'A sealed note.\n'


class MarkdownBlockTests(RepositoryFixture):
    def pinned(self, text):
        self.write('docs/review.md', text)
        self.write('docs/records/note.md', NOTE)
        return self.commit('review record')

    def origin(self, pin, line, kind='artifact'):
        return {'id': 'origin.' + kind, 'kind': kind, 'revision': pin, 'path': 'docs/review.md', 'line': line}

    def ranges(self, pin, start, end, note=True):
        rows = [{'revision': pin, 'path': 'docs/review.md', 'start': start, 'end': end}]
        return {'context': rows + ([{'revision': pin, 'path': 'docs/records/note.md', 'start': 1, 'end': 1}] if note else [])}

    def section(self, lines, line, expected, fence=True):
        """The minimum is `expected`, certain; it needs the note after the fence and accepts it."""
        pin = self.pinned('\n'.join(lines) + '\n')
        origin = self.origin(pin, line, 'artifact' if fence else 'mention')
        self.assertEqual(tool.context_minimum(self.reader, origin)[::3], (expected[0], None))
        self.assertEqual(tool.context_minimum(self.reader, origin)[:2], expected)
        with self.assertRaisesRegex(tool.CheckError, 'named sealed record is outside the context'):
            tool.context_check(self.reader, origin, self.ranges(pin, *expected, note=False))
        self.assertEqual(tool.context_check(self.reader, origin, self.ranges(pin, *expected))['ranges'], 2)
        return pin, origin

    def uncertain(self, lines, line, reason, kind='artifact'):
        pin = self.pinned('\n'.join(lines) + '\n')
        origin = self.origin(pin, line, kind)
        start, end, _, found = tool.context_minimum(self.reader, origin)
        self.assertEqual(found, reason)
        with self.assertRaisesRegex(tool.CheckError, 'minimum context is uncertain'):
            tool.context_check(self.reader, origin, self.ranges(pin, 1, len(lines)))

    def test_review_01_tilde_probe_keeps_its_code_and_the_record_after_the_fence(self):
        for delimiter in ('~~~', '```'):
            with self.subTest(delimiter=delimiter):
                lines = ['# Probe', '## Section', delimiter + 'js', 'const text = `', '## Embedded heading', '`;', delimiter,
                         'Read [note](records/note.md).', '## Next', 'after']
                pin, origin = self.section(lines, 3, (2, 8))
                with self.assertRaisesRegex(tool.CheckError, 'does not cover the minimum'):
                    tool.context_check(self.reader, origin, self.ranges(pin, 2, 4))
                self.assertEqual(tool.fenced_bytes(self.reader.blob(pin, 'docs/review.md'), 3),
                                 b'const text = `\n## Embedded heading\n`;\n')

    def test_a_closer_is_only_the_same_run_then_spaces_or_tabs(self):
        lines = ['## Section', '~~~js', '~~~ not-a-close', '## still code', '~~~', 'Read [note](records/note.md).', '## Next']
        self.section(lines, 2, (1, 6))
        lines = ['## Section', '~~~~', '~~~', '## x', '~~~~ \t', 'Read [note](records/note.md).', '## Next']
        self.section(lines, 2, (1, 6))
        self.assertEqual(tool.markdown_blocks(lines)['fences'], {2: 5})

    def test_a_longer_fence_holds_a_shorter_backtick_fence(self):
        lines = ['## Section', '````md', '```', '## x', '```', '````', 'Read [note](records/note.md).', '## Next']
        self.section(lines, 2, (1, 7))

    def test_revision_3_mixed_delimiter_fence(self):
        """A tilde fence holds three backticks and a heading; the true tilde closer ends it."""
        lines = ['## Section', '~~~', '```', '## x', '~~~', 'Read [note](records/note.md).', '## Next']
        self.section(lines, 2, (1, 6))
        self.assertEqual(tool.fenced_bytes(self.reader.blob(self.git('rev-parse', 'HEAD'), 'docs/review.md'), 2),
                         b'```\n## x\n')

    def test_a_mention_inside_a_fence_has_its_true_section(self):
        lines = ['## Section', '```', 'mention', '```', 'Read [note](records/note.md).', '## Next', 'after']
        self.section(lines, 3, (1, 5), fence=False)

    def test_a_certain_mention_section_closes_without_a_fence(self):
        lines = ['# Top', '## Section', 'A mention; read [note](records/note.md).', '## Other', 'x']
        self.section(lines, 3, (2, 3), fence=False)

    def test_unsupported_fence_forms_refuse_closure(self):
        for form in ('    ```', '\t```', '- ```', '> ```', '1. ~~~', '```a`b'):
            with self.subTest(form=form):
                lines = ['## Section', form, '## x', '```js', 'code', '```', '## Next']
                self.uncertain(lines, 4, 'a fence-like line that is not a top-level fence at line 2')

    def test_an_uncertain_line_after_the_section_end_does_not_refuse(self):
        lines = ['## Section', '```js', 'code', '```', 'Read [note](records/note.md).', '## Next', '> ```']
        self.section(lines, 2, (1, 5))

    def test_html_blocks_make_heading_and_fence_like_lines_uncertain(self):
        for opener, closer in (('<!--', '-->'), ('<div>', ''), ('<pre>', '</pre>'), ('<custom-tag>', '')):
            with self.subTest(opener=opener):
                lines = ['## Section', opener, '## x', closer, '```js', 'code', '```', '## Next']
                self.uncertain(lines, 5, 'a heading- or fence-like line in an HTML block at line 3')
        lines = ['## Section', '<!-- one line -->', '```js', 'code', '```', 'Read [note](records/note.md).', '## Next']
        self.section(lines, 3, (1, 6))

    def test_an_unclosed_fence_refuses_and_has_no_body(self):
        lines = ['## Section', '```js', 'code', '## x']
        self.uncertain(lines, 2, 'an unclosed fence at line 2')
        with self.assertRaisesRegex(tool.CheckError, 'unclosed source fence'):
            tool.fenced_bytes(('\n'.join(lines) + '\n').encode(), 2)

    def test_a_fence_origin_must_be_a_recognized_opener(self):
        lines = ['## Section', '````', '```js', 'code', '```', '````', '## Next']
        self.uncertain(lines, 3, 'the origin is not a recognized closed fence')
        with self.assertRaisesRegex(tool.CheckError, 'not an opening fence'):
            tool.fenced_bytes(('\n'.join(lines) + '\n').encode(), 3)

    def test_carriage_returns(self):
        """A trailing CR belongs to the line end; a lone CR is a CommonMark line ending LF cannot place."""
        lines = ['## Section\r', '```js\r', 'code\r', '```\r', 'Read [note](records/note.md).\r', '## Next\r']
        self.section(lines, 2, (1, 5))
        self.uncertain(['## Section', 'text\r```', '## x', '```js', 'code', '```'], 4,
                       'a carriage return inside the line at line 2')

    def test_an_uncertain_origin_takes_its_areas_from_its_whole_file(self):
        self.write('packages/a.ts', 'x\n')
        self.write('scripts/b.py', 'x\n')
        text = '## Section\n- ```\npackages/a.ts\n```js\ncode\n```\n## Next\nscripts/b.py\n'
        pin = self.pinned(text)
        areas = [{'id': 'packages', 'globs': ['packages/**']}, {'id': 'scripts', 'globs': ['scripts/**']},
                 {'id': 'other', 'globs': ['**']}]
        ids, area_of, paths = tool.area_map(self.reader, pin, areas)
        origin = self.origin(pin, 4)
        derived = tool.origin_areas(self.reader, {'origins': [{'id': origin['id'], 'state': 'pending'}]},
                                    {'origins': [origin]}, ids, area_of, paths)
        self.assertEqual(derived[origin['id']], {'state': 'pending', 'areas': ['packages', 'scripts'], 'derived': True,
                                                 'uncertain': True})
