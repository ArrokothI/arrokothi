"""TOOLS-02 T2-1 (owner choice 01; design 02 §1, D02-CHK-01, D02-CHK-02): the census read form.

`ReadFormTests` checks the partition and identity rules on hand-built traces; the registered partition
variants in mutations.json each fail one of them. `ReadFormCensusTests` runs real traced censuses of a
fixture repository through a sequence of commits: unrelated additions keep the stored table valid, and
every edit of a named or fixture read, the first and the second, changes it. `RecursiveListingCensusTests`
(review 01's T2-R1-READ-01, design 04) runs recursive, globbing, copying and typed listers in their own repository."""
import contextlib
import gzip
import json
import os
import subprocess
import tempfile
import unittest

from test_packet_tools import RepositoryFixture, classified, tool
from test_target_tools import ROOT, pinned_toolchain

# A recursive scanner: one listing of `tests`, an existence read of every entry, bytes of selected files,
# and one named configuration read outside every listed directory.
WALK = [('config/scan.json', 'bytes'), ('tests', 'exists'), ('tests', 'listing'), ('tests/fixtures', 'exists'),
        ('tests/fixtures/scan.input.txt', 'bytes'), ('tests/fixtures/scan.input.txt', 'exists'),
        ('tests/new-suite', 'exists'), ('tests/scan/sample.scan.mjs', 'bytes')]
WALK_LISTED = {'tests'}
# A member that lists tests/fixtures directly: a fixture walk-root listing and a read beneath it.
FIXTURE_ROOT = [('tests/fixtures', 'listing'), ('tests/fixtures/scan.input.txt', 'bytes')]
FIXTURE_LISTED = {'tests/fixtures'}


class ReadFormTests(unittest.TestCase):
    def setUp(self):
        self.repo = RepositoryFixture(methodName='setUp')
        self.repo.setUp()
        self.addCleanup(self.repo.doCleanups)
        for path, text in {'config/scan.json': '{"v": 1}\n', 'tests/fixtures/scan.input.txt': 'one\n',
                           'tests/scan/sample.scan.mjs': 'export const v = 1;\n',
                           'tests/new-suite/unrelated.test.mjs': 'export {};\n'}.items():
            self.repo.write(path, text)
        self.rev = self.repo.commit('fixture')

    def form(self, compared, listed, rev=None):
        return tool.read_form(self.repo.reader, rev or self.rev, listed, sorted(compared))

    def change(self, path, text):
        self.repo.write(path, text)
        return self.repo.commit('change ' + path)

    def test_a_walk_records_named_reads_and_fixtures_and_only_the_root_of_the_rest(self):
        form = self.form(WALK, WALK_LISTED)
        self.assertEqual(form['walks'], ['tests'])
        self.assertEqual(form['checked'], [('config/scan.json', 'bytes'), ('tests', 'exists'), ('tests/fixtures', 'exists'),
                                           ('tests/fixtures/scan.input.txt', 'bytes'),
                                           ('tests/fixtures/scan.input.txt', 'exists')])

    def test_one_path_can_be_named_and_a_walk_root_through_different_kinds(self):
        form = self.form(WALK, WALK_LISTED)
        self.assertIn(('tests', 'exists'), form['checked'])
        self.assertNotIn(('tests', 'listing'), form['checked'])
        self.assertEqual(form['walks'], ['tests'])

    def test_a_directory_existence_read_follows_the_listing_rule(self):
        reader = self.repo.reader
        self.assertFalse(tool.fixture_read('tests/new-suite', 'exists', tool.is_directory(reader, self.rev, 'tests/new-suite')))
        self.assertTrue(tool.fixture_read('tests/fixtures', 'exists', tool.is_directory(reader, self.rev, 'tests/fixtures')))
        self.assertTrue(tool.fixture_read('tests/new-suite', 'exists'))  # a path that is no directory keeps the file rule
        self.assertFalse(tool.fixture_read('tests/new-suite/unrelated.test.mjs', 'bytes'))

    def test_unrelated_additions_leave_the_walk_form_unchanged(self):
        before = self.form(WALK, WALK_LISTED)['digest']
        self.repo.write('tests/scan/zz-unrelated.test.mjs', 'export {};\n')
        self.repo.write('tests/brand-new/unrelated.test.mjs', 'export {};\n')
        rev = self.repo.commit('additions')
        after = self.form(WALK + [('tests/brand-new', 'exists'), ('tests/brand-new/unrelated.test.mjs', 'exists'),
                                  ('tests/scan/zz-unrelated.test.mjs', 'exists')], WALK_LISTED, rev)['digest']
        self.assertEqual(before, after)

    def test_every_edit_of_a_named_read_changes_the_form(self):
        digests = [self.form(WALK, WALK_LISTED)['digest']]
        for text in ('{"v": 2}\n', '{"v": 3}\n'):
            digests.append(self.form(WALK, WALK_LISTED, self.change('config/scan.json', text))['digest'])
        self.assertEqual(len(set(digests)), 3)

    def test_every_edit_of_an_enumerated_fixture_changes_the_form(self):
        digests = [self.form(WALK, WALK_LISTED)['digest']]
        for text in ('two\n', 'three\n'):
            digests.append(self.form(WALK, WALK_LISTED, self.change('tests/fixtures/scan.input.txt', text))['digest'])
        self.assertEqual(len(set(digests)), 3)

    def test_an_enumerated_non_fixture_edit_is_recorded_by_its_walk_root_only(self):
        before = self.form(WALK, WALK_LISTED)['digest']
        after = self.form(WALK, WALK_LISTED, self.change('tests/scan/sample.scan.mjs', 'export const v = 2;\n'))['digest']
        self.assertEqual(before, after)

    def test_every_entry_change_of_a_fixture_walk_root_listing_changes_the_form(self):
        form = self.form(FIXTURE_ROOT, FIXTURE_LISTED)
        self.assertEqual((form['walks'], form['checked']), (['tests/fixtures'], sorted(FIXTURE_ROOT)))
        digests = [form['digest']]
        for name in ('one.txt', 'two.txt'):
            digests.append(self.form(FIXTURE_ROOT, FIXTURE_LISTED, self.change('tests/fixtures/' + name, 'x\n'))['digest'])
        self.assertEqual(len(set(digests)), 3)

    def test_a_recursive_listing_is_a_tree_read(self):
        for row, kind in (({'operation': 'readdirSync', 'recursive': True}, 'tree'),
                          ({'operation': 'promises.readdir', 'recursive': True}, 'tree'),
                          ({'operation': 'opendirSync', 'recursive': True}, 'tree'),
                          ({'operation': 'readdir'}, 'listing'), ({'operation': 'statSync', 'recursive': True}, 'exists'),
                          ({'operation': 'globSync'}, 'pattern'), ({'operation': 'promises.glob'}, 'pattern'),
                          ({'operation': 'cpSync'}, 'pattern'), ({'operation': 'promises.cp'}, 'pattern')):
            with self.subTest(row=row):
                self.assertEqual(tool.read_kind(row), kind)

    def test_the_trace_marks_each_recursive_form_and_records_glob_and_cp(self):
        """Every listing form of design 04 §2 under the real preload, with Node's own option handling."""
        script = """import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const done = () => {};
fs.readdirSync('f', { recursive: true });
fs.readdirSync('f', 'utf8');
fs.readdirSync('f', { withFileTypes: true });
await new Promise((resolve) => fs.readdir('f', () => resolve()));
await new Promise((resolve) => fs.readdir('f', { recursive: true }, () => resolve()));
await fs.promises.readdir('f', { recursive: true, withFileTypes: true });
fs.opendirSync('f', { recursive: true }).closeSync();
fs.globSync('f/**/*.json');
const target = fs.mkdtempSync(join(tmpdir(), 'trace-cp-'));
fs.cpSync('f', target, { recursive: true });
fs.rmSync(target, { recursive: true, force: true });
"""
        with tempfile.TemporaryDirectory() as directory:
            os.makedirs(os.path.join(directory, 'f', 'nested'))
            with open(os.path.join(directory, 'f', 'nested', 'a.json'), 'w') as handle:
                handle.write('{}\n')
            with open(os.path.join(directory, 'forms.mjs'), 'w') as handle:
                handle.write(script)
            trace = os.path.join(directory, 'trace.jsonl')
            subprocess.run(['node', 'forms.mjs'], cwd=directory, check=True, capture_output=True,
                           env=dict(os.environ, NODE_OPTIONS='--import=' + str(ROOT / tool.READ_TRACE),
                                    ARROKOTHI_READ_TRACE=trace))
            with open(trace) as handle:
                rows = [json.loads(line) for line in handle]
        observed = [(row['operation'], tool.read_kind(row)) for row in rows if row['operation'] != 'preload']
        for expected in (('readdirSync', 'tree'), ('readdirSync', 'listing'), ('readdir', 'listing'), ('readdir', 'tree'),
                         ('promises.readdir', 'tree'), ('opendirSync', 'tree'), ('globSync', 'pattern'), ('cpSync', 'pattern')):
            with self.subTest(expected=expected):
                self.assertIn(expected, observed)
        recursive = [row for row in rows if row['operation'] == 'readdirSync' and row.get('recursive')]
        self.assertEqual(len(recursive), 1)  # the encoding and withFileTypes calls are not recursive

    def test_every_nested_change_under_a_recursive_fixture_listing_changes_the_form(self):
        compared, listed = [('tests/fixtures', 'tree')], {'tests/fixtures'}
        digests = [self.form(compared, listed, self.change('tests/fixtures/nested/seed.json', '{}\n'))['digest']]
        for name in ('nested/one.json', 'nested/deeper/two.json'):
            digests.append(self.form(compared, listed, self.change('tests/fixtures/' + name, '{}\n'))['digest'])
        self.assertEqual(len(set(digests)), 3)
        self.assertEqual(self.form(compared, listed)['checked'], [('tests/fixtures', 'tree')])

    def test_a_recursive_tests_listing_records_only_its_fixture_subtree(self):
        compared, listed = [('tests', 'tree')], {'tests'}
        before = self.form(compared, listed)['digest']
        self.repo.write('tests/scan/zz-unrelated.test.mjs', 'export {};\n')
        self.repo.write('tests/brand-new/unrelated.test.mjs', 'export {};\n')
        self.assertEqual(self.form(compared, listed, self.repo.commit('additions'))['digest'], before)
        self.assertNotEqual(self.form(compared, listed, self.change('tests/fixtures/nested/one.json', '{}\n'))['digest'], before)

    def test_a_fixture_subtree_present_only_at_the_pin_still_changes(self):
        self.repo.git('rm', '-rq', 'tests/fixtures')
        rev = self.repo.commit('remove the fixtures')
        changed = tool.changed_reads(self.repo.reader, self.rev, rev, [('tests', 'tree')])
        self.assertEqual(changed, [{'path': 'tests/fixtures', 'kind': 'listing', 'fixture': True}])
        self.assertEqual(tool.changed_reads(self.repo.reader, self.rev, rev, [('tests/scan', 'tree')]), [])

    def row(self, operation, text, second='undefined', **fields):
        """A traced row as read-trace.mjs writes it, for a path read from the repository root."""
        root = os.path.realpath(self.repo.root)
        return {'pid': 1, 'operation': operation, 'path': os.path.join(root, text), 'argument': 'path', 'text': text,
                'cwd': root, 'second': second, **fields}

    def admit(self, row, rev=None):
        return tool.admit(self.repo.reader, rev or self.rev, tool.Path(os.path.realpath(self.repo.root)), row, set())

    def test_pattern_reads_refuse_their_file(self):
        for row in (self.row('globSync', 'tests/fixtures/**/*.json'),
                    {'pid': 1, 'operation': 'globSync', 'path': None, 'argument': 'array', 'second': 'undefined'},
                    {'pid': 1, 'operation': 'promises.glob', 'path': None, 'argument': 'array', 'second': 'options',
                     'keys': ['withFileTypes']}):
            with self.subTest(row=row):
                outcome = self.admit(row)
                self.assertEqual(outcome[0], 'refused')
                self.assertTrue(outcome[1].startswith('the traced run read through a glob pattern'), outcome)

    def test_admission_refuses_every_row_the_matrix_does_not_name(self):
        fd = {'pid': 1, 'operation': 'readFileSync', 'path': None, 'argument': 'fd', 'second': 'undefined'}
        handle = dict(fd, operation='promises.readFile', argument='filehandle')
        refused = {'unknown operation': self.row('watchSync', 'config/scan.json'),
                   'descriptor': fd, 'file handle': handle,
                   'stream fd override': self.row('createReadStream', 'tests/fixtures/scan.input.txt', 'options',
                                                  keys=['autoClose', 'fd']),
                   'stream fs override': self.row('createReadStream', 'config/scan.json', 'options', keys=['fs']),
                   'open options': self.row('openSync', 'config/scan.json', 'options', keys=['flag']),
                   'unnamed option': self.row('readdirSync', 'tests', 'options', keys=['recursive', 'surprise']),
                   'repository copy': self.row('cpSync', 'tests/fixtures', 'string')}
        for name, row in refused.items():
            with self.subTest(name=name):
                self.assertEqual(self.admit(row)[:1], ('refused',), self.admit(row))
        self.assertEqual(self.admit(self.row('watchSync', 'config/scan.json')),
                         ('refused', 'an operation the read matrix does not name: watchSync'))
        admitted = {('readFileSync', 'config/scan.json', 'string', ()): ('read', 'config/scan.json', 'bytes'),
                    ('readdirSync', 'tests', 'options', ('recursive', 'withFileTypes')): ('read', 'tests', 'tree'),
                    ('statSync', 'tests/new-suite', 'options', ('throwIfNoEntry',)): ('read', 'tests/new-suite', 'exists'),
                    ('accessSync', 'config/scan.json', 'number', ()): ('read', 'config/scan.json', 'exists')}
        for (operation, text, second, keys), expected in admitted.items():
            with self.subTest(operation=operation):
                fields = {'keys': list(keys)} if second == 'options' else {}
                if 'recursive' in keys:
                    fields['recursive'] = True
                self.assertEqual(self.admit(self.row(operation, text, second, **fields)), expected)
        outside = dict(self.row('cpSync', 'x', 'string'), text='/tmp/elsewhere', path='/tmp/elsewhere')
        self.assertEqual(self.admit(outside), ('outside',))

    def linked(self):
        """Tracked symlinks: tests/fixtures/jump -> ../../data/sub and tests/fixtures/link -> ../../data/target."""
        for path, text in {'data/sub/seed': 'seed\n', 'data/actual.txt': 'REAL\n', 'data/target/seed.json': '{}\n',
                           'tests/fixtures/actual.txt': 'DECOY\n'}.items():
            self.repo.write(path, text)
        os.symlink('../../data/sub', self.repo.root / 'tests/fixtures/jump')
        os.symlink('../../data/target', self.repo.root / 'tests/fixtures/link')
        return self.repo.commit('links')

    def test_the_walk_refuses_a_tracked_symlink_before_normalizing(self):
        rev = self.linked()
        self.assertEqual(self.admit(self.row('readFileSync', 'tests/fixtures/jump/../actual.txt'), rev),
                         ('refused', 'the traced run read through a symlink in the repository: tests/fixtures/jump'))
        self.assertEqual(self.admit(self.row('readFileSync', 'tests/fixtures/link/seed.json'), rev),
                         ('refused', 'the traced run read through a symlink in the repository: tests/fixtures/link'))
        self.assertEqual(self.admit(self.row('readFileSync', 'tests/fixtures/actual.txt'), rev),
                         ('read', 'tests/fixtures/actual.txt', 'bytes'))
        (self.repo.root / 'scratch').mkdir()
        os.symlink('../config', self.repo.root / 'scratch/untracked')  # untracked, like a workspace link: followed
        self.assertEqual(self.admit(self.row('readFileSync', 'scratch/untracked/scan.json'), rev),
                         ('read', 'config/scan.json', 'bytes'))

    def test_a_recursive_listing_that_crosses_a_symlink_refuses(self):
        rev = self.linked()
        row = self.row('readdirSync', 'tests/fixtures', 'options', keys=['recursive'], recursive=True)
        root = tool.Path(os.path.realpath(self.repo.root))
        compared, listed, refusals = tool.admitted_reads(self.repo.reader, rev, root, [row], set())
        self.assertEqual((compared, refusals), ([('tests/fixtures', 'tree')],
                                                ['a recursive listing crosses a symlink: tests/fixtures/jump']))
        plain = self.row('readdirSync', 'tests/scan', 'options', keys=['recursive'], recursive=True)
        self.assertEqual(tool.admitted_reads(self.repo.reader, rev, root, [plain], set())[2], [])

    def test_a_read_through_a_symlink_at_the_pin_refuses_its_origin(self):
        self.repo.write('tests/fixtures/target', 'TARGET CONTENT\n')
        os.symlink('target', self.repo.root / 'tests/fixtures/same')
        pin = self.repo.commit('a link at the pin')
        (self.repo.root / 'tests/fixtures/same').unlink()
        (self.repo.root / 'tests/fixtures/same').write_text('target')  # the link's own blob: equal IDs
        rev = self.repo.commit('a file at C')
        reader = self.repo.reader
        self.assertEqual(tool.blob_id(reader, pin, 'tests/fixtures/same'), tool.blob_id(reader, rev, 'tests/fixtures/same'))
        self.assertEqual(tool.changed_reads(reader, pin, rev, [('tests/fixtures/same', 'bytes')]), [])
        self.assertEqual(tool.pin_refusals(reader, pin, [('tests/fixtures/same', 'bytes')]),
                         ['a read path or its ancestor is a symlink at the pin: tests/fixtures/same'])
        self.assertEqual(tool.pin_refusals(reader, rev, [('tests/fixtures/same', 'bytes')]), [])

    def test_a_recursive_listing_that_crossed_a_symlink_at_the_pin_refuses_its_origin(self):
        pin = self.linked()
        self.repo.git('rm', '-q', 'tests/fixtures/jump', 'tests/fixtures/link')
        rev = self.repo.commit('links removed')
        reader = self.repo.reader
        self.assertEqual(tool.pin_refusals(reader, pin, [('tests/fixtures', 'tree')]),
                         ['a recursive listing crosses a symlink at the pin: tests/fixtures/jump'])
        self.assertEqual(tool.pin_refusals(reader, rev, [('tests/fixtures', 'tree')]), [])

    def test_a_stat_read_of_a_file_carries_its_content_and_mode(self):
        reader = self.repo.reader
        before = tool.exists_identity(reader, self.rev, 'tests/fixtures/scan.input.txt')
        edited = self.change('tests/fixtures/scan.input.txt', 'two\n')
        self.assertNotEqual(tool.exists_identity(reader, edited, 'tests/fixtures/scan.input.txt'), before)
        os.chmod(self.repo.root / 'tests/fixtures/scan.input.txt', 0o755)
        executable = self.repo.commit('executable')
        self.assertNotEqual(tool.exists_identity(reader, executable, 'tests/fixtures/scan.input.txt'),
                            tool.exists_identity(reader, edited, 'tests/fixtures/scan.input.txt'))
        self.assertEqual(tool.exists_identity(reader, executable, 'tests/fixtures'), 'directory')
        self.assertEqual(tool.changed_reads(reader, self.rev, edited, [('tests/fixtures/scan.input.txt', 'exists')]),
                         [{'path': 'tests/fixtures/scan.input.txt', 'kind': 'exists', 'fixture': True}])
        self.assertEqual(tool.changed_reads(reader, self.rev, edited, [('tests/fixtures', 'exists')]), [])

    def test_real_trace_rows_are_admitted_or_refused(self):
        """The real preload through admission (design 05 §7.4): an inherited descriptor, a decoy-path stream with an
        fd override, a symlink-then-`..` path, array, callback and promise globs, and an ordinary positive control."""
        rev = self.linked()
        script = """import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
fs.readFileSync('config/scan.json', 'utf8');
const fd = fs.openSync('tests/fixtures/scan.input.txt');
await new Promise((done) => fs.createReadStream('tests/fixtures/actual.txt', { fd, autoClose: true }).on('close', done).resume());
fs.readFileSync('tests/fixtures/jump/../actual.txt', 'utf8');
execFileSync(process.execPath, ['-e', 'require("fs").readFileSync(0)'], { stdio: [fs.openSync('tests/fixtures/actual.txt'), 'pipe', 'pipe'] });
fs.globSync(['tests/fixtures/actual.txt']);
await new Promise((done) => fs.glob('tests/fixtures/*.txt', () => done()));
for await (const entry of fs.promises.glob('tests/fixtures/*.txt')) void entry;
"""
        (self.repo.root / 'forms.mjs').write_text(script)
        trace = self.repo.root.parent / (self.repo.root.name + '-trace.jsonl')
        self.addCleanup(lambda: trace.unlink(missing_ok=True))
        subprocess.run(['node', 'forms.mjs'], cwd=self.repo.root, check=True, capture_output=True,
                       env=dict(os.environ, NODE_OPTIONS='--import=' + str(ROOT / tool.READ_TRACE),
                                ARROKOTHI_READ_TRACE=str(trace)))
        rows = [json.loads(line) for line in trace.read_text().splitlines()]
        outcomes = [(row['operation'], self.admit(row, rev)) for row in rows if row['operation'] != 'preload']
        def refused(operation, start):
            return any(name == operation and outcome[0] == 'refused' and outcome[1].startswith(start)
                       for name, outcome in outcomes)
        self.assertIn(('readFileSync', ('read', 'config/scan.json', 'bytes')), outcomes)
        self.assertTrue(refused('createReadStream', 'an option the read matrix does not name: createReadStream fd'))
        self.assertTrue(refused('readFileSync', 'the traced run read through a symlink in the repository: tests/fixtures/jump'))
        self.assertTrue(refused('readFileSync', 'a first argument the read matrix does not admit (fd)'))
        for operation in ('globSync', 'glob', 'promises.glob'):
            with self.subTest(operation=operation):
                self.assertTrue(refused(operation, 'the traced run read through a glob pattern'))


    def test_a_same_name_type_change_changes_a_fixture_listing(self):
        compared, listed = [('tests/fixtures/kind', 'listing')], {'tests/fixtures/kind'}
        pin = self.change('tests/fixtures/kind/entry', 'file\n')
        before = self.form(compared, listed, pin)['digest']
        (self.repo.root / 'tests/fixtures/kind/entry').unlink()
        rev = self.change('tests/fixtures/kind/entry/inner.txt', 'now a directory\n')
        self.assertNotEqual(self.form(compared, listed, rev)['digest'], before)
        self.assertEqual(tool.changed_reads(self.repo.reader, pin, rev, compared),
                         [{'path': 'tests/fixtures/kind', 'kind': 'listing', 'fixture': True}])


SCANNER = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
test('scan', () => {
  const base = new URL('tests/', root);
  let read = 0;
  for (const name of readdirSync(base, { recursive: true })) {
    const url = new URL(name, base);
    if (statSync(url).isDirectory()) continue;
    if (name.endsWith('.scan.mjs') || name.endsWith('.input.txt')) { readFileSync(url, 'utf8'); read += 1; }
  }
  assert.ok(read > 0);
  assert.ok(readFileSync(new URL('config/scan.json', root), 'utf8').length > 0);
});
"""
LISTER = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
test('list', () => { assert.ok(readdirSync(new URL('../fixtures/', import.meta.url)).length > 0); });
"""
NAMED = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('named', () => { assert.ok(readFileSync(new URL('../fixtures/named.txt', import.meta.url), 'utf8').length > 0); });
"""
UNRELATED = "import { test } from 'node:test';\ntest('unrelated', () => {});\n"
TOOLING = ['tests/tooling/catalog-reporter.mjs', 'tests/tooling/source-facts.mjs', 'tests/tooling/read-trace.mjs',
           'tests/tooling/reach-coverage.mjs']
MEMBERS = {'tests/scan/scanner.test.mjs': SCANNER, 'tests/lister/lister.test.mjs': LISTER,
           'tests/named/named.test.mjs': NAMED}
# Review 01's T2-R1-READ-01 and design 04 §2: recursive, globbing, copying and typed listers of the fixtures.
RECURSIVE_LISTER = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
test('recursive', () => {
  assert.ok(readdirSync(new URL('../fixtures/', import.meta.url), { recursive: true }).length > 0);
});
"""
RECURSIVE_SCANNER = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
test('recursive tests', async () => {
  assert.ok((await readdir(new URL('../', import.meta.url), { recursive: true })).length > 0);
});
"""
GLOBBER = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
test('glob', () => { assert.ok(globSync('tests/fixtures/**/*.json').length > 0); });
"""
COPIER = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('copy', () => {
  const target = mkdtempSync(join(tmpdir(), 'copy-'));
  try {
    cpSync(new URL('../fixtures/nested/', import.meta.url), target, { recursive: true });
    assert.ok(readdirSync(target).length > 0);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});
"""
TYPED = """import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
test('typed', () => {
  assert.ok(readdirSync(new URL('../fixtures/kind/', import.meta.url), { withFileTypes: true }).length > 0);
});
"""


class CensusRepository(unittest.TestCase):
    """One fixture repository per subclass; each test appends commits and compares a stored table with a fresh
    census. A subclass names its members, the other files at the pin, its tracked symlinks and its test script's globs."""
    members = MEMBERS
    links = {}
    seed = {'config/scan.json': '{"v": 1}\n', 'tests/fixtures/scan.input.txt': 'one\n',
            'tests/fixtures/named.txt': 'named\n', 'tests/scan/sample.scan.mjs': 'export const v = 1;\n'}
    globs = ['tests/scan/*.test.mjs', 'tests/lister/*.test.mjs', 'tests/named/*.test.mjs']

    @classmethod
    def setUpClass(cls):
        script = 'node --test ' + ' '.join(cls.globs)
        cls.toolchain = pinned_toolchain()
        cls.repo = RepositoryFixture(methodName='setUp')
        cls.repo.setUp()
        cls.addClassCleanup(cls.repo.doCleanups)
        repo = cls.repo
        for path in TOOLING:
            repo.write(path, (ROOT / path).read_text())
        for path, text in {**cls.members, **cls.seed}.items():
            repo.write(path, text)
        for path, target in cls.links.items():
            (repo.root / path).parent.mkdir(parents=True, exist_ok=True)
            os.symlink(target, repo.root / path)
        repo.document('package.json', {'type': 'module', 'scripts': {'test': script}})
        pin = repo.commit('pin')
        rows = [{'revision': pin, 'path': path, 'line': 1, 'kind': 'test file', 'sha256': tool.digest(text.encode()),
                 'disposition': 'extract'} for path, text in sorted(cls.members.items())]
        repo.document('origins.json', rows)
        repo.document('registry.json', {'version': 1, 'cases': [{'id': 'case'}]})
        repo.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}},
            'checks': [{'id': 'repository-tests', 'catalog': {'script': 'test', 'script_text': script, 'flags': ['--test'],
                                                             'globs': cls.globs},
                        'timeout_seconds': 120, 'output_limit_bytes': 1048576},
                       {'id': 'mutants', 'operation': 'mutations', 'spec': 'registry.json', 'expected': 'selected_cases_passed'}]})
        catalog = repo.commit('catalog')
        repo.document('inventory.json', {'version': 1, 'catalogs': [{
            'revision': catalog, 'path': 'origins.json', 'kind': 'artifact', 'count': len(rows),
            'sha256': tool.digest((repo.root / 'origins.json').read_bytes())}], 'additional_sources': []})
        intake_rev = repo.commit('inventory')
        cls.origins = [row['id'] for row in tool.inventory(repo.reader, intake_rev, 'inventory.json')['origins']]
        repo.document('legacy.json', {'version': 1, 'inventory': 'inventory.json', 'registry': 'registry.json',
                                      'verification': 'verify.json', 'suites': [],
                                      'mappings': [{'origin': key, 'status': 'pending', 'rationale': 'Pending'}
                                                   for key in cls.origins]})
        cls.legacy = repo.commit('legacy')
        tables = repo.format_two_tables()
        record = gzip.compress(json.dumps({'results': [{'assumption': 'A10', 'passed': True, 'facts': {
            'process_isolation': {'distinct_processes': True}, 'order_model_holds': True}}]}).encode(), mtime=0)
        (repo.root / 'floor.json.gz').write_bytes(record)
        tables['floor'] = {'record': 'floor.json.gz', 'sha256': tool.digest(record), 'order_model_holds': True}
        cls.tables = tables
        cls.spec = {'version': 2, 'inventory': 'inventory.json', 'registry': 'registry.json', 'verification': 'verify.json',
                    'migration': {'source': {'format': 1, 'revision': cls.legacy, 'path': 'legacy.json',
                                             'sha256': tool.digest((repo.root / 'legacy.json').read_bytes())}},
                    'origins': [{'id': key, 'state': 'pending'} for key in cls.origins],
                    'counterexamples': [], 'suite_targets': [], 'preserved': [], 'families': [], 'areas': [], **tables}
        rev = repo.commit('tables')
        environment = tool.child_environment(tool.environment_declaration(None))[0]
        claims = tool.holds_table(repo.reader, rev, tables['holds'])
        recipes = tool.register_recipes(claims, tables['holds']['register'])
        matches = tool.register_matches(repo.reader, rev, sorted(cls.members), recipes, environment, cls.toolchain)
        cls.spec['holds']['register']['entries'] = [classified(row) for row in matches]
        cls.table = cls.initial = cls.regenerate_table()

    @classmethod
    def commit(cls, message):
        cls.repo.git('add', '.')
        cls.repo.git('commit', '-q', '--allow-empty', '-m', message)
        return cls.repo.git('rev-parse', 'HEAD')

    @classmethod
    def commit_manifest(cls, table):
        cls.repo.write('corpus.json', tool.manifest_text(dict(cls.spec, preserved=table)))
        return cls.commit('manifest')

    @classmethod
    def regenerate_table(cls):
        """Write the census table at HEAD through `regenerate` and commit it; return the table."""
        rev = cls.commit_manifest([])
        tool.regenerate(cls.repo.reader, rev, 'corpus.json', write=True, toolchain=cls.toolchain)
        cls.commit('regenerated')
        return json.loads((cls.repo.root / 'corpus.json').read_text())['preserved']

    def step(self, changes):
        """Write each change (None deletes the path), commit, and regenerate against the stored table."""
        for path, text in changes.items():
            if text is None:
                self.repo.git('rm', '-rq', path)
            else:
                self.repo.write(path, text)
        self.commit('step')
        rev = self.commit_manifest(self.table)
        return tool.regenerate(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)

    def changed_files(self, result):
        return sorted({key.split(':')[0] for key in result['changed']})

    def advance(self):
        type(self).table = type(self).regenerate_table()

    def row(self, member_file):
        return next(row for row in self.table if row['file'] == member_file)

    def assert_stale(self, result, member_file):
        self.assertEqual(result['result'], 'table_differs')
        self.assertIn(member_file, self.changed_files(result))
        rev = self.commit_manifest(self.table)
        with self.assertRaisesRegex(tool.CheckError, 'preserved table differs from the census at C'):
            tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)
        self.advance()


class ReadFormCensusTests(CensusRepository):
    def test_a_stored_table_validates_in_corpus_and_survives_unrelated_tests(self):
        rev = self.commit_manifest(self.table)
        self.assertEqual(tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)['result'],
                         'revalidation_complete')
        self.assertTrue(all(row.get('walks') is not None for row in self.table))
        scanner = next(row for row in self.table if row['file'] == 'tests/scan/scanner.test.mjs')
        self.assertEqual(scanner['walks'], ['tests'])
        for path in ('tests/scan/zz-unrelated.test.mjs', 'tests/new-suite/unrelated.test.mjs'):
            with self.subTest(path=path):
                self.assertEqual(self.step({path: UNRELATED})['result'], 'table_current')
                rev = self.commit_manifest(self.table)
                self.assertEqual(tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)['result'],
                                 'revalidation_complete')

    def test_a_direct_fixture_listing_changes_with_each_entry_change(self):
        for name in ('one.txt', 'two.txt'):
            with self.subTest(name=name):
                result = self.step({'tests/fixtures/' + name: 'x\n'})
                self.assertEqual(result['result'], 'table_differs')
                self.assertIn('tests/lister/lister.test.mjs', self.changed_files(result))
                rev = self.commit_manifest(self.table)
                with self.assertRaisesRegex(tool.CheckError, 'preserved table differs from the census at C'):
                    tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)
                self.advance()

    def test_every_edit_of_a_named_read_or_a_fixture_changes_the_table(self):
        for path, member, texts in (('config/scan.json', 'tests/scan/scanner.test.mjs', ('{"v": 2}\n', '{"v": 3}\n')),
                                    ('tests/fixtures/named.txt', 'tests/named/named.test.mjs', ('two\n', 'three\n')),
                                    ('tests/fixtures/scan.input.txt', 'tests/scan/scanner.test.mjs', ('two\n', 'three\n'))):
            for text in texts:
                with self.subTest(path=path, text=text):
                    result = self.step({path: text})
                    self.assertEqual(result['result'], 'table_differs')
                    self.assertIn(member, self.changed_files(result))
                    self.advance()

    def test_an_enumerated_source_edit_leaves_the_table_valid(self):
        self.assertEqual(self.step({'tests/scan/sample.scan.mjs': 'export const v = 2;\n'})['result'], 'table_current')



class RecursiveListingCensusTests(CensusRepository):
    """Review 01's probe as a maintained acceptance control, with design 04 §2's nearby forms."""
    members = {'tests/rlister/rlister.test.mjs': RECURSIVE_LISTER, 'tests/rscan/rscan.test.mjs': RECURSIVE_SCANNER,
               'tests/glob/glob.test.mjs': GLOBBER, 'tests/copy/copy.test.mjs': COPIER, 'tests/typed/typed.test.mjs': TYPED}
    seed = {'tests/fixtures/nested/seed.json': '{}\n', 'tests/fixtures/kind/entry': 'file\n'}
    globs = ['tests/rlister/*.test.mjs', 'tests/rscan/*.test.mjs', 'tests/glob/*.test.mjs', 'tests/copy/*.test.mjs',
             'tests/typed/*.test.mjs']

    def test_listers_start_preserved_and_glob_and_copy_members_are_refused(self):
        initial = {row['file']: row for row in self.initial}
        for member in ('tests/rlister/rlister.test.mjs', 'tests/rscan/rscan.test.mjs', 'tests/typed/typed.test.mjs'):
            with self.subTest(member=member):
                self.assertEqual(initial[member]['status'], 'preserved')
        for member, reason in (('tests/glob/glob.test.mjs', 'the traced run read through a glob pattern'),
                               ('tests/copy/copy.test.mjs', 'the traced run copied a repository tree')):
            with self.subTest(member=member):
                self.assertEqual(initial[member]['status'], 'refused')
                self.assertTrue(any(reason in text for text in initial[member]['reasons']), initial[member]['reasons'])

    def test_each_nested_fixture_change_under_a_recursive_listing_changes_the_table(self):
        for name, directory in (('nested/one.json', 'tests/fixtures/nested'),
                                ('nested/deeper/two.json', 'tests/fixtures/nested/deeper')):
            with self.subTest(name=name):
                self.assert_stale(self.step({'tests/fixtures/' + name: '{}\n'}), 'tests/rlister/rlister.test.mjs')
                for member in ('tests/rlister/rlister.test.mjs', 'tests/rscan/rscan.test.mjs'):
                    row = self.row(member)
                    self.assertEqual(row['status'], 'refused')
                    self.assertTrue(any(reason.startswith('changed test fixture read: ') and directory in reason
                                        for reason in row['reasons']), row['reasons'])
        # The immediate-child positive control of review 01's probe.
        self.assert_stale(self.step({'tests/fixtures/direct.json': '{}\n'}), 'tests/rlister/rlister.test.mjs')

    def test_deleting_a_fixture_subtree_changes_the_table(self):
        self.step({'tests/fixtures/gone/a.json': '{}\n'})
        self.advance()
        self.assert_stale(self.step({'tests/fixtures/gone': None}), 'tests/rscan/rscan.test.mjs')

    def test_a_same_name_type_change_under_a_fixture_listing_changes_the_table(self):
        self.assert_stale(self.step({'tests/fixtures/kind/entry': None,
                                     'tests/fixtures/kind/entry/inner.txt': 'now a directory\n'}),
                          'tests/typed/typed.test.mjs')

    def test_unrelated_additions_leave_recursive_listings_valid(self):
        for path in ('tests/rscan/zz-unrelated.test.mjs', 'tests/brand-new/unrelated.test.mjs'):
            with self.subTest(path=path):
                self.assertEqual(self.step({path: UNRELATED})['result'], 'table_current')
                rev = self.commit_manifest(self.table)
                self.assertEqual(tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)['result'],
                                 'revalidation_complete')



def member(body, imports="import { readFileSync } from 'node:fs';"):
    return ("import { test } from 'node:test';\nimport assert from 'node:assert/strict';\n" + imports +
            "\ntest('read', async () => {\n" + body + "\n});\n")


class ReadMatrixCensusTests(CensusRepository):
    """Design 05 (review 02, design check 05): symlinks, globs, descriptors and options through the real census."""
    members = {
        'tests/linked/sync.test.mjs': member(
            "assert.ok(readdirSync(new URL('../fixtures/', import.meta.url), { recursive: true }).length > 0);",
            "import { readdirSync } from 'node:fs';"),
        'tests/linked/typed.test.mjs': member(
            "assert.ok((await readdir(new URL('../fixtures/', import.meta.url), { recursive: true, withFileTypes: true }))"
            ".length > 0);", "import { readdir } from 'node:fs/promises';"),
        'tests/plain/plain.test.mjs': member(
            "assert.ok(readdirSync(new URL('../fixtures/plain/', import.meta.url), { recursive: true }).length > 0);",
            "import { readdirSync } from 'node:fs';"),
        'tests/alias/jump.test.mjs': member("assert.ok(readFileSync('tests/fixtures/jump/../actual.txt', 'utf8').length > 0);"),
        'tests/glob/array.test.mjs': member(
            "assert.ok(globSync(['tests/fixtures/entry'], { withFileTypes: true }).length > 0);",
            "import { globSync } from 'node:fs';"),
        'tests/glob/callback.test.mjs': member(
            "assert.ok((await new Promise((done, fail) => glob('tests/fixtures/*.txt', (error, found) => "
            "error ? fail(error) : done(found)))).length > 0);", "import { glob } from 'node:fs';"),
        'tests/glob/promise.test.mjs': member(
            "const found = []; for await (const entry of glob('tests/fixtures/*.txt')) found.push(entry);\n"
            "assert.ok(found.length > 0);", "import { glob } from 'node:fs/promises';"),
        'tests/stat/stat.test.mjs': member(
            "assert.ok(statSync(new URL('../fixtures/sized.txt', import.meta.url)).size > 0);",
            "import { statSync } from 'node:fs';"),
        'tests/stream/decoy.test.mjs': member(
            "const fd = openSync('tests/fixtures/other.txt');\n"
            "const chunks = []; for await (const chunk of createReadStream('tests/fixtures/actual.txt', { fd })) chunks.push(chunk);\n"
            "assert.ok(chunks.length > 0);", "import { createReadStream, openSync } from 'node:fs';"),
        'tests/stdin/inherit.test.mjs': member(
            "const out = execFileSync(process.execPath, ['-e', 'process.stdout.write(require(\"fs\").readFileSync(0))'],\n"
            "  { stdio: [openSync('tests/fixtures/actual.txt'), 'pipe', 'pipe'] });\nassert.ok(out.length > 0);",
            "import { openSync } from 'node:fs';\nimport { execFileSync } from 'node:child_process';"),
        'tests/copy/tmp.test.mjs': member(
            "const from = mkdtempSync(join(tmpdir(), 'from-')); const to = mkdtempSync(join(tmpdir(), 'to-'));\n"
            "try { writeFileSync(join(from, 'a'), 'a'); cpSync(from, to, { recursive: true }); assert.ok(readdirSync(to).length > 0); }\n"
            "finally { rmSync(from, { recursive: true, force: true }); rmSync(to, { recursive: true, force: true }); }",
            "import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';\n"
            "import { tmpdir } from 'node:os';\nimport { join } from 'node:path';"),
        'tests/pinlink/same.test.mjs': member("assert.ok(readFileSync('tests/fixtures/same', 'utf8').length > 0);"),
    }
    seed = {'data/target/seed.json': '{}\n', 'data/sub/seed': 'seed\n', 'data/actual.txt': 'REAL\n',
            'tests/fixtures/actual.txt': 'DECOY\n', 'tests/fixtures/other.txt': 'OTHER\n',
            'tests/fixtures/plain/seed.json': '{}\n', 'tests/fixtures/entry': 'file\n',
            'tests/fixtures/sized.txt': 'sized\n', 'tests/fixtures/target': 'TARGET CONTENT\n'}
    links = {'tests/fixtures/link': '../../data/target', 'tests/fixtures/jump': '../../data/sub',
             'tests/fixtures/same': 'target'}
    globs = ['tests/linked/*.test.mjs', 'tests/plain/*.test.mjs', 'tests/alias/*.test.mjs', 'tests/glob/*.test.mjs',
             'tests/stat/*.test.mjs', 'tests/stream/*.test.mjs', 'tests/stdin/*.test.mjs', 'tests/copy/*.test.mjs',
             'tests/pinlink/*.test.mjs']

    def reasons(self, table, member_file):
        return next(row for row in table if row['file'] == member_file)['reasons']

    def assert_refused(self, table, member_file, start):
        row = next(row for row in table if row['file'] == member_file)
        self.assertEqual(row['status'], 'refused', row['reasons'])
        self.assertTrue(any(reason.startswith(start) or ('; ' + start) in reason for reason in row['reasons']),
                        row['reasons'])

    def test_crossing_alias_glob_descriptor_and_option_members_are_refused(self):
        for member_file, start in (
                ('tests/linked/sync.test.mjs', 'a recursive listing crosses a symlink: tests/fixtures/'),
                ('tests/linked/typed.test.mjs', 'a recursive listing crosses a symlink: tests/fixtures/'),
                ('tests/alias/jump.test.mjs', 'the traced run read through a symlink in the repository: tests/fixtures/jump'),
                ('tests/glob/array.test.mjs', 'the traced run read through a glob pattern'),
                ('tests/glob/callback.test.mjs', 'the traced run read through a glob pattern'),
                ('tests/glob/promise.test.mjs', 'the traced run read through a glob pattern'),
                ('tests/stream/decoy.test.mjs', 'an option the read matrix does not name: createReadStream fd'),
                ('tests/stdin/inherit.test.mjs', 'a first argument the read matrix does not admit (fd)'),
                ('tests/pinlink/same.test.mjs', 'the traced run read through a symlink in the repository: tests/fixtures/same')):
            with self.subTest(member=member_file):
                self.assert_refused(self.initial, member_file, start)
        for member_file in ('tests/plain/plain.test.mjs', 'tests/stat/stat.test.mjs', 'tests/copy/tmp.test.mjs'):
            with self.subTest(member=member_file):
                self.assertEqual(next(row for row in self.initial if row['file'] == member_file)['status'], 'preserved')

    def test_a_plain_recursive_listing_keeps_its_positive_control(self):
        self.assert_stale(self.step({'tests/fixtures/plain/direct.json': '{}\n'}), 'tests/plain/plain.test.mjs')

    def test_each_target_edit_behind_a_symlink_leaves_the_member_refused(self):
        for text in ('REAL 2\n', 'REAL 3\n'):
            with self.subTest(text=text):
                self.step({'data/actual.txt': text})
                self.advance()
                self.assert_refused(self.table, 'tests/alias/jump.test.mjs',
                                    'the traced run read through a symlink in the repository: tests/fixtures/jump')

    def test_an_array_glob_member_stays_refused_through_type_changes(self):
        for changes in ({'tests/fixtures/entry': None}, {'tests/fixtures/entry/inner.txt': 'now a directory\n'},
                        {'tests/fixtures/entry': None}, {'tests/fixtures/entry': 'file again\n'}):
            self.step(changes)
            self.advance()
            self.assert_refused(self.table, 'tests/glob/array.test.mjs', 'the traced run read through a glob pattern')

    def test_a_stat_only_fixture_change_refuses_its_member(self):
        self.assert_stale(self.step({'tests/fixtures/sized.txt': 'sized and longer\n'}), 'tests/stat/stat.test.mjs')
        self.assert_refused(self.table, 'tests/stat/stat.test.mjs', 'changed test fixture read: tests/fixtures/sized.txt')

    def test_a_pin_side_link_replaced_by_an_equal_blob_file_stays_refused(self):
        self.repo.git('rm', '-q', 'tests/fixtures/same')
        self.step({'tests/fixtures/same': 'target'})
        self.advance()
        self.assert_refused(self.table, 'tests/pinlink/same.test.mjs',
                            'a read path or its ancestor is a symlink at the pin: tests/fixtures/same')


if __name__ == '__main__':
    unittest.main()
