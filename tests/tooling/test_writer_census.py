"""TOOLS-02 T2-2 writer census (design 02 §2.2): a check over a declared, bounded vocabulary.

Every non-test file under scripts/ and tests/tooling/ that calls a vocabulary write API is classed. A
`fixture_writer` must contain a guarded route; a `scratch_writer` writes only temporary files or a path its
caller supplies for one run. It does not claim to catch every writer: shell redirection, subprocess writes,
third-party code and stdout piped by a caller are outside the vocabulary, and the CLI dispatch guard covers
the stdout routes."""
import re
import unittest

from test_target_tools import ROOT

VOCABULARY = re.compile(r"\.write_text\(|\.write_bytes\(|\bjson\.dump\(|\b(?:gzip\.)?open\([^)\n]*['\"][wax][bt]?\+?['\"]|"
                        r"\bwriteFileSync\b|\bappendFileSync\b|\bcreateWriteStream\b|\bwriteFile\b")
SUFFIXES = ('.py', '.mjs', '.js', '.cjs', '.ts', '.mts')
GUARD = re.compile(r'\b(?:tool\.)?(?:pristine|clean_payload)\(')
WRITERS = {
    'scripts/packet_tools.py': ('fixture_writer', '`regenerate` writes the adoption manifest; the other writes fill '
                                                  'temporary evidence trees and request files'),
    'tests/tooling/requalify-value-cost.py': ('fixture_writer', 'K1.1-correction-03 requalification evidence in --output'),
    'tests/tooling/value-cost-loss-ledger.py': ('fixture_writer', 'K1.1-correction-03 loss ledger in --output'),
    'tests/tooling/capture-continuations.mjs': ('scratch_writer', 'an instrumented copy inside its temporary tree'),
    'tests/tooling/capture-trace-controls.mjs': ('scratch_writer', 'an instrumented copy inside its temporary tree'),
    'tests/tooling/check-node-floor.py': ('scratch_writer', 'floor fixtures, logs and archives in temporary directories'),
    'tests/tooling/node-floor/archive-input-controls.py': ('scratch_writer', 'edits inside the archive copy it is given'),
    'tests/tooling/node-floor/isolation-a.test.mjs': ('scratch_writer', 'appends to the log check-node-floor.py names'),
    'tests/tooling/node-floor/isolation-b.test.mjs': ('scratch_writer', 'appends to the log check-node-floor.py names'),
    'tests/tooling/node-floor/order-await.test.ts': ('scratch_writer', 'appends to FLOOR_ORDER_LOG, a temporary path'),
    'tests/tooling/node-floor/order-deferred.test.ts': ('scratch_writer', 'appends to FLOOR_ORDER_LOG, a temporary path'),
    'tests/tooling/node-floor/order.test.ts': ('scratch_writer', 'appends to FLOOR_ORDER_LOG, a temporary path'),
    'tests/tooling/oracle-reach.mjs': ('scratch_writer', 'PACKET_REACH_FILE, a temporary path oracle-probe.mjs sets'),
    'tests/tooling/read-trace.mjs': ('scratch_writer', 'ARROKOTHI_READ_TRACE, a temporary path the reads phase sets'),
    'tests/tooling/source-facts.mjs': ('scratch_writer', 'its result file in the caller\'s temporary directory'),
    'tests/tooling/value-cost-witness.mjs': ('scratch_writer', 'ARROKOTHI_VALUE_COST_LOAD, a temporary path the probe sets'),
}


def writing_files():
    files = sorted(path for root in ('scripts', 'tests/tooling') for path in (ROOT / root).rglob('*')
                   if path.is_file() and path.suffix in SUFFIXES and not path.name.startswith('test_'))
    return {path.relative_to(ROOT).as_posix(): path.read_text() for path in files if VOCABULARY.search(path.read_text())}


class WriterCensusTests(unittest.TestCase):
    def test_every_vocabulary_writer_is_classed(self):
        found = writing_files()
        self.assertTrue(found, 'non-vacuity: the vocabulary matches no file')
        self.assertEqual(sorted(found), sorted(WRITERS))

    def test_every_fixture_writer_holds_a_guarded_route(self):
        found = writing_files()
        for path, (kind, reason) in WRITERS.items():
            with self.subTest(path=path):
                self.assertIn(kind, ('fixture_writer', 'scratch_writer'))
                self.assertTrue(reason)
                if kind == 'fixture_writer':
                    self.assertRegex(found[path], GUARD)

    def test_the_vocabulary_recognises_each_declared_form(self):
        for text in ("p.write_text('x')", "p.write_bytes(b'')", 'json.dump(value, handle)', "open(path, 'w')",
                     "gzip.open(path, 'wt')", "open(path, 'ab')", 'fs.writeFileSync(a, b)', 'appendFileSync(a, b)',
                     'createWriteStream(a)', 'promises.writeFile(a, b)'):
            with self.subTest(text=text):
                self.assertRegex(text, VOCABULARY)
        for text in ('json.dumps(value)', "open(path)", "open(path, 'r')", 'readFileSync(a)'):
            with self.subTest(text=text):
                self.assertNotRegex(text, VOCABULARY)


if __name__ == '__main__':
    unittest.main()
