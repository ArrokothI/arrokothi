"""Source provenance and closure coordinates use byte LF boundaries, never universal newlines."""
from test_packet_tools import RepositoryFixture, tool


SEPARATORS = '\r\v\f\x1c\x1d\x1e\x85\u2028\u2029'


class SourceLineTests(RepositoryFixture):
    def test_source_coordinates_count_only_lf(self):
        for data, expected in [(b'', []), (b'\n', [b'']), (b'x', [b'x']), (b'x\n', [b'x']),
                               (b'x\n\n', [b'x', b'']), (b'\r\n', [b'\r']),
                               (SEPARATORS.encode(), [SEPARATORS.encode()])]:
            with self.subTest(data=data):
                self.assertEqual(tool.source_lines(data), expected)

    def test_fence_locator_and_body_preserve_non_lf_bytes(self):
        body = ('const text = "' + SEPARATORS + '";\r\n').encode()
        data = ('prefix' + SEPARATORS + '\n```js\r\n').encode() + body + b'```\r\n'
        self.assertEqual(tool.fenced_bytes(data, 2), body)
        with self.assertRaisesRegex(tool.CheckError, 'not an opening fence'):
            tool.fenced_bytes(data, 3)

    def test_inventory_prose_locator_counts_only_lf(self):
        text = 'prefix' + SEPARATORS
        (self.root / 'source.md').write_bytes((text + '\nA recorded probe.\n').encode())
        pin = self.commit('LF source')
        rows = [{'revision': pin, 'path': 'source.md', 'line': 2, 'text': 'A recorded probe.',
                 'disposition': 'inspect mention'}]
        self.document('mentions.json', rows)
        catalog = self.commit('LF catalog')
        spec = {'version': 1, 'catalogs': [{'revision': catalog, 'path': 'mentions.json', 'kind': 'mention',
                'count': 1, 'sha256': tool.digest((self.root / 'mentions.json').read_bytes())}]}
        self.document('inventory.json', spec)
        result = tool.inventory(self.reader, self.commit('LF inventory'), 'inventory.json')
        self.assertEqual(result['origins'][0]['line'], 2)
        self.assertEqual(result['origins'][0]['id'], tool.origin_id('mention', rows[0]))
        rows[0]['line'] = len(SEPARATORS) + 2
        self.document('mentions.json', rows)
        spec['catalogs'][0].update(revision=self.commit('wrong coordinate catalog'),
                                   sha256=tool.digest((self.root / 'mentions.json').read_bytes()))
        self.document('inventory.json', spec)
        with self.assertRaisesRegex(tool.CheckError, 'prose locator mismatch'):
            tool.inventory(self.reader, self.commit('wrong coordinate inventory'), 'inventory.json')

    def test_whole_file_endpoints(self):
        for data, end in [(b'', 1), (b'x', 1), (b'x\n', 1), (b'x\n\n', 2),
                          (SEPARATORS.encode() + b'\nend', 2)]:
            with self.subTest(data=data):
                (self.root / 'source.md').write_bytes(data)
                pin = self.commit('whole file endpoint')
                origin = {'id': 'whole', 'path': 'source.md', 'revision': pin, 'line': 1}
                self.assertEqual(tool.context_minimum(self.reader, origin), (1, end, data.decode()))

    def test_fence_cannot_omit_context_after_embedded_separators(self):
        for separator in ('\r', '\u2028', '\u2029'):
            with self.subTest(separator=separator):
                text = ('# Intro\nprefix' + separator + '## Forged' + separator + 'padding' + separator +
                        'padding\n## Required\nRead docs/records/note.md.\n```js\nconst value = 1;\n```\n')
                (self.root / 'source.md').write_bytes(text.encode())
                self.write('docs/records/note.md', 'Mandatory.\n')
                pin = self.commit('LF heading section')
                origin = {'id': 'fence', 'path': 'source.md', 'revision': pin, 'line': 5}
                self.assertEqual(tool.context_minimum(self.reader, origin)[:2], (3, 7))
                closure = {'context': [{'revision': pin, 'path': 'source.md', 'start': 3, 'end': 5}]}
                with self.assertRaisesRegex(tool.CheckError, 'does not cover the minimum'):
                    tool.context_check(self.reader, origin, closure)
                closure['context'][0]['end'] = 7
                with self.assertRaisesRegex(tool.CheckError, 'named sealed record is outside the context'):
                    tool.context_check(self.reader, origin, closure)
                closure['context'].append({'revision': pin, 'path': 'docs/records/note.md', 'start': 1, 'end': 1})
                self.assertEqual(tool.context_check(self.reader, origin, closure)['candidates'], 1)

    def test_named_sealed_record_endpoints(self):
        for data, end in [(b'', 1), (b'x', 1), (b'x\n', 1), (b'x\n\n', 2),
                          (SEPARATORS.encode() + b'\nend', 2)]:
            with self.subTest(data=data):
                self.write('source.md', 'Read docs/records/note.md.\n')
                note = self.root / 'docs/records/note.md'
                note.parent.mkdir(parents=True, exist_ok=True)
                note.write_bytes(data)
                pin = self.commit('sealed endpoint')
                origin = {'id': 'whole', 'path': 'source.md', 'revision': pin, 'line': 1}
                closure = {'context': [{'revision': pin, 'path': 'source.md', 'start': 1, 'end': 1},
                                       {'revision': pin, 'path': 'docs/records/note.md', 'start': 1, 'end': end}]}
                self.assertEqual(tool.context_check(self.reader, origin, closure)['candidates'], 1)
