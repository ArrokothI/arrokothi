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

    def test_pattern_reads_refuse_their_file(self):
        reason = tool.pattern_refusal([('tests/fixtures/**/*.json', 'pattern'), ('config/scan.json', 'bytes')])
        self.assertIsInstance(reason, str)
        self.assertRegex(reason, 'pattern or copy whose dependency identity is not represented: tests/fixtures/\\*\\*/\\*.json$')
        self.assertIsNone(tool.pattern_refusal([('config/scan.json', 'bytes'), ('tests', 'tree')]))

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
    census. A subclass names its members, the other files at the pin, and its test script's globs."""
    members = MEMBERS
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
        for member in ('tests/glob/glob.test.mjs', 'tests/copy/copy.test.mjs'):
            with self.subTest(member=member):
                self.assertEqual(initial[member]['status'], 'refused')
                self.assertTrue(any('pattern or copy whose dependency identity is not represented' in reason
                                    for reason in initial[member]['reasons']), initial[member]['reasons'])

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


if __name__ == '__main__':
    unittest.main()
