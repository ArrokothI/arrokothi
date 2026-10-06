"""P1-P and P1-H (design 05 §2.3, D05-CHK-05): the prefix rule's negative corpus and controls, the reads
phase, helper closure, production label and hold register, over one census of a fixture repository."""
import contextlib
import gzip
import json
import unittest

from test_packet_tools import RepositoryFixture, classified, tool
from test_target_tools import ROOT, pinned_toolchain

TOOLING = ['tests/tooling/catalog-reporter.mjs', 'tests/tooling/source-facts.mjs', 'tests/tooling/read-trace.mjs',
           'tests/tooling/reach-coverage.mjs']
HEAD = "import { test, beforeEach, describe } from 'node:test';\nimport assert from 'node:assert/strict';\n"
INPUT = 'const input = { length: 1 };\n'
MEMBER = "test('member', () => { assert.ok(input.length > 0); });\n"
READ = "import { readFileSync, readdirSync } from 'node:fs';\n"


def body(prefix='', after='', head=HEAD, member=MEMBER, setup=INPUT):
    return head + setup + prefix + member + after


# name: (pin text, current text). Every refused case keeps the member's span identical.
REFUSED = {
    'unused-hook-changed': (body('const unusedHook = beforeEach(() => { input.length = 33554432; });\n'),
                            body('const unusedHook = beforeEach(() => { input.length = 16777216; });\n')),
    'unused-hook-removed': (body('const unusedHook = beforeEach(() => { input.length = 33554432; });\n'), body()),
    'hook-inserted': (body(), body('beforeEach(() => { input.length = 2; });\n')),
    'hook-changed': (body('beforeEach(() => { input.length = 2; });\n'), body('beforeEach(() => { input.length = 3; });\n')),
    'hook-removed': (body('beforeEach(() => { input.length = 2; });\n'), body()),
    'initializer-inserted': (body(), body('const seed = Math.max(1, 2);\n')),
    'initializer-changed': (body('const seed = Math.max(1, 2);\n'), body('const seed = Math.max(1, 3);\n')),
    'initializer-removed': (body('const seed = Math.max(1, 2);\n'), body()),
    'hook-reads-constant': (body('const n = 33554432;\nbeforeEach(() => { input.length = n; });\n'),
                            body('const n = 16777216;\nbeforeEach(() => { input.length = n; });\n')),
    'indirect-reference': (body(setup='const n = 33554432;\nconst input = { length: n };\n'),
                           body(setup='const n = 16777216;\nconst input = { length: n };\n')),
    'earlier-test-inserted': (body(), body("test('earlier', () => { input.length = 2; });\n")),
    'helper-of-earlier-test': (
        body("function grow() { input.length = 33554432; }\ntest('earlier', () => { grow(); });\n"),
        body("function grow() { input.length = 16777216; }\ntest('earlier', () => { grow(); });\n")),
    'effect-import-inserted': (body(), body(head=HEAD + "import './effect.mjs';\n")),
    'tagged-template': (body(), body('const t = String.raw`x`;\n')),
    'getter-read': (body(setup=INPUT + 'const holder = { get v() { return 1; } };\n'),
                    body('const x = holder.v;\n', setup=INPUT + 'const holder = { get v() { return 1; } };\n')),
    'destructuring': (body(setup=INPUT + 'const holder = { v: 1 };\n'),
                      body('const { v } = holder;\n', setup=INPUT + 'const holder = { v: 1 };\n')),
    'static-block': (body(), body('class C { static { input.length = 2; } }\n')),
    'concurrency': (body(member="describe('s', { concurrency: 2 }, () => {\n  " + MEMBER +
                         "  test('later', () => { assert.ok(true); });\n});\n"),
                    body(member="describe('s', { concurrency: 2 }, () => {\n  " + MEMBER +
                         "  test('later', () => { assert.ok(1); });\n});\n")),
}
PRESERVED = {
    'inert-insertions': (body(), body('function spare() { return 1; }\nconst LIMIT = 4;\n')),
    'import-binding-added': (body(head=HEAD.replace('beforeEach, describe', 'beforeEach')), body()),
    'earlier-title-only': (body("test('earlier', () => { assert.ok(true); });\n"),
                           body("test('earlier, renamed', () => { assert.ok(true); });\n")),
    'change-after-member': (body(after="test('later', () => { assert.ok(true); });\n"),
                            body(after="test('later', () => { assert.ok(1); });\n")),
    'comment-only': (body('// a note\n'), body('// a different note\n/* and another */\n')),
}
FIXTURE_FILE = READ + body(member="test('member', () => { assert.ok(readFileSync(new URL('../fixtures/data.txt', "
                                  "import.meta.url), 'utf8').length > 0); });\n")
FIXTURE_LISTING = READ + body(member="test('member', () => { assert.ok(readdirSync(new URL('../fixtures/', "
                                     "import.meta.url)).length > 0); });\n")
PRODUCTION_DATA = READ + body(member="test('member', () => { assert.ok(readFileSync(new URL('../../src/data.json', "
                                     "import.meta.url), 'utf8').length > 0); });\n")
PRODUCTION_IMPORT = body(head=HEAD + "import { value } from '../../src/value.mjs';\n",
                         member="test('member', () => { assert.ok(value() > 0); });\n")
HELPER_USER = body(head=HEAD + "import { size } from './helper.mjs';\n",
                   member="test('member', () => { assert.ok(size() > 0); });\n")
TRACE_SENSITIVE = body(member="test('member', () => { assert.equal(process.env.NODE_OPTIONS, undefined); });\n")
REGISTERED = body(head=HEAD + "import * as proxies from './proxies.mjs';\n",
                  setup="function wrap(target) { return new Proxy(target, {}); }\n",
                  member="test('member', () => {\n  const proxy = wrap({});\n  assert.ok(proxy);\n});\n"
                         "test('revoked', () => { assert.ok(proxies.revoked()); });\n"
                         "test('plain', () => { assert.ok(true); });\n")


class PreservedCensusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.toolchain = pinned_toolchain()
        cls.repo = RepositoryFixture(methodName='setUp')
        cls.repo.setUp()
        cls.addClassCleanup(cls.repo.doCleanups)
        repo = cls.repo
        for path in TOOLING:
            repo.write(path, (ROOT / path).read_text())
        files = {f'tests/fx/{name}.test.mjs': pair for name, pair in {**REFUSED, **PRESERVED}.items()}
        files.update({
            'tests/fx/fixture-file.test.mjs': (FIXTURE_FILE, FIXTURE_FILE),
            'tests/fx/fixture-listing.test.mjs': (FIXTURE_LISTING, FIXTURE_LISTING),
            'tests/fx/production-data.test.mjs': (PRODUCTION_DATA, PRODUCTION_DATA),
            'tests/fx/production-import.test.mjs': (PRODUCTION_IMPORT, PRODUCTION_IMPORT),
            'tests/fx/helper-reviewed.test.mjs': (HELPER_USER, HELPER_USER),
            'tests/fx/helper-unreviewed.test.mjs': (HELPER_USER, HELPER_USER),
            'tests/fx/trace-sensitive.test.mjs': (TRACE_SENSITIVE, TRACE_SENSITIVE),
            'tests/fx/registered.test.mjs': (REGISTERED, REGISTERED),
            'tests/shared/shared.test.mjs': (body(), body()),
        })
        support = {'tests/fixtures/data.txt': ('pinned\n', 'current\n'),
                   'tests/fx/effect.mjs': ('export {};\n', 'export {};\n'),
                   'tests/fx/helper.mjs': ('export const size = () => 1;\n', 'export const size = () => 2;\n'),
                   'tests/fx/proxies.mjs': ('export function revoked() { return Proxy.revocable({}, {}).proxy; }\n',) * 2,
                   'src/data.json': ('{"v": 1}\n', '{"v": 2}\n'),
                   'src/value.mjs': ('export const value = () => 1;\n', 'export const value = () => 2;\n')}
        for path, (pin, _) in {**files, **support}.items():
            repo.write(path, pin)
        repo.document('package.json', {'type': 'module', 'scripts': {
            'test': 'node --test tests/fx/*.test.mjs', 'test:shared': 'node --test --test-isolation=none tests/shared/*.test.mjs'}})
        cls.pin = repo.commit('pin')
        for path, (_, current) in {**files, **support}.items():
            repo.write(path, current)
        repo.write('tests/fixtures/extra.txt', 'listing changes\n')
        rows = [{'revision': cls.pin, 'path': path, 'line': 1, 'kind': 'test file',
                 'sha256': tool.digest(files[path][0].encode()), 'disposition': 'extract'} for path in sorted(files)]
        repo.document('origins.json', rows)
        repo.document('registry.json', {'version': 1, 'cases': [{'id': 'case'}]})
        repo.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'],
            'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'}},
            'checks': [{'id': 'repository-tests', 'catalog': {'script': 'test', 'script_text': 'node --test tests/fx/*.test.mjs',
                                                             'flags': ['--test'], 'globs': ['tests/fx/*.test.mjs']},
                        'timeout_seconds': 120, 'output_limit_bytes': 1048576},
                       {'id': 'shared-tests', 'catalog': {'script': 'test:shared',
                                                         'script_text': 'node --test --test-isolation=none tests/shared/*.test.mjs',
                                                         'flags': ['--test', '--test-isolation=none'],
                                                         'globs': ['tests/shared/*.test.mjs']},
                        'timeout_seconds': 120, 'output_limit_bytes': 1048576},
                       {'id': 'mutants', 'operation': 'mutations', 'spec': 'registry.json', 'expected': 'selected_cases_passed'}]})
        catalog = repo.commit('catalog')
        repo.document('inventory.json', {'version': 1, 'catalogs': [{
            'revision': catalog, 'path': 'origins.json', 'kind': 'artifact', 'count': len(rows),
            'sha256': tool.digest((repo.root / 'origins.json').read_bytes())}], 'additional_sources': []})
        intake_rev = repo.commit('inventory')
        cls.intake = tool.inventory(repo.reader, intake_rev, 'inventory.json')
        cls.origins = {row['path']: row['id'] for row in cls.intake['origins']}
        repo.document('legacy.json', {'version': 1, 'inventory': 'inventory.json', 'registry': 'registry.json',
                                      'verification': 'verify.json', 'suites': [],
                                      'mappings': [{'origin': key, 'status': 'pending', 'rationale': 'Pending'}
                                                   for key in cls.origins.values()]})
        helper = 'tests/fx/helper.mjs'
        cls.reviews = [{'id': 'review.helper', 'origin': cls.origins['tests/fx/helper-reviewed.test.mjs'], 'module': helper,
                        'pin_blob': tool.blob_id(repo.reader, cls.pin, helper),
                        'current_blob': tool.blob_id(repo.reader, intake_rev, helper), 'covers': 'module',
                        'reason': 'size() still returns a positive number; the module has no other top-level code.'}]
        cls.legacy = None
        cls.spec = cls.manifest([], [], order_model_holds=True)
        cls.c = repo.commit('census')
        cls.legacy = cls.c  # legacy.json is committed with the census revision
        cls.environment = tool.child_environment(tool.environment_declaration(None))[0]
        claims = tool.holds_table(repo.reader, cls.c, cls.spec['holds'])
        recipes = tool.register_recipes(claims, cls.spec['holds']['register'])
        cls.matches = tool.register_matches(repo.reader, cls.c, sorted(files), recipes, cls.environment, cls.toolchain)
        held = f'tests/fx/registered.test.mjs:{cls.line("member")}:1'
        cls.entries = [classified(row, 'held', 'Proxy') if row['key'] == held else classified(row) for row in cls.matches]
        register = {row['key']: row for row in cls.entries}
        with contextlib.ExitStack() as stack:
            context = tool.target_context(repo.reader, cls.c, cls.spec, stack, cls.toolchain)
            cls.evaluations, cls.all_earlier = tool.preserved_census(repo.reader, cls.c, cls.spec, cls.intake,
                                                                     context, register)
        cls.table = tool.preserved_table(cls.evaluations)
        cls.by_file = {row['file']: row for row in cls.table if row['title'] == 'member'}

    @classmethod
    def line(cls, title):
        return next(index for index, text in enumerate(REGISTERED.splitlines(), 1) if f"test('{title}'" in text)

    @classmethod
    def manifest(cls, preserved, entries, order_model_holds, reviews=None):
        repo = cls.repo
        tables = repo.format_two_tables()
        record = gzip.compress(json.dumps({'results': [{'assumption': 'A10', 'passed': True, 'facts': {
            'process_isolation': {'distinct_processes': True}, 'order_model_holds': order_model_holds}}]}).encode(), mtime=0)
        (repo.root / 'floor.json.gz').write_bytes(record)
        tables['floor'] = {'record': 'floor.json.gz', 'sha256': tool.digest(record), 'order_model_holds': order_model_holds}
        tables['holds']['register']['entries'] = entries
        tables['helper_reviews'] = cls.reviews if reviews is None else reviews
        return {'version': 2, 'inventory': 'inventory.json', 'registry': 'registry.json', 'verification': 'verify.json',
                'migration': {'source': {'format': 1, 'revision': cls.legacy, 'path': 'legacy.json',
                                         'sha256': tool.digest((repo.root / 'legacy.json').read_bytes())}},
                'origins': [{'id': key, 'state': 'pending'} for key in cls.origins.values()],
                'counterexamples': [], 'suite_targets': [], 'preserved': preserved, 'families': [], 'areas': [], **tables}

    def member(self, name, directory='fx'):
        return self.by_file[f'tests/{directory}/{name}.test.mjs']

    def evaluation(self, name):
        return next(row for row in self.evaluations if row['file'] == f'tests/fx/{name}.test.mjs' and row['title'] == 'member')

    def test_every_negative_case_is_refused_by_its_prefix(self):
        for name in REFUSED:
            with self.subTest(name):
                row = self.evaluation(name)
                self.assertEqual((row['scope'], row['span_identical'], row['prefix_blocked']), ('span', True, True))
                self.assertEqual(self.member(name)['status'], 'refused')

    def test_every_control_stays_preserved(self):
        for name in PRESERVED:
            with self.subTest(name):
                row = self.member(name)
                self.assertEqual((row['status'], row['scope'], row['reasons']), ('preserved', 'span', []))

    def test_a_change_after_the_member_blocks_when_every_leaf_counts_as_earlier(self):
        pin, current = PRESERVED['change-after-member']
        for all_earlier, blocked in ((False, False), (True, True)):
            result, = tool.source_facts(self.repo.reader, self.c, [{'op': 'prefix', 'path': 'x.test.mjs', 'pin': pin,
                                                                    'current': current, 'all_earlier': all_earlier}],
                                        self.environment, self.toolchain)
            member, = [row for row in result['members'] if row['title'].get('value') == 'member']
            self.assertEqual(bool(member['blocking']), blocked)

    def test_changed_fixture_file_and_listing_refuse_the_file(self):
        for name, path in (('fixture-file', 'tests/fixtures/data.txt'), ('fixture-listing', 'tests/fixtures')):
            with self.subTest(name):
                row = self.member(name)
                self.assertEqual((row['status'], row['scope']), ('refused', 'whole_file'))
                self.assertIn('changed test fixture read: ' + path, row['reasons'])

    def test_changed_production_data_is_labelled_not_refused(self):
        row = self.member('production-data')
        self.assertEqual((row['status'], row['repository_read_changed']), ('preserved', ['src/data.json']))

    def test_changed_production_import_is_labelled(self):
        row = self.member('production-import')
        self.assertEqual((row['status'], row['production_changed']), ('preserved', ['src/value.mjs']))

    def test_changed_helper_needs_a_counted_review(self):
        self.assertEqual(self.member('helper-reviewed')['status'], 'preserved')
        self.assertEqual(self.member('helper-reviewed')['helper_closure'], {'reviewed': ['review.helper']})
        self.assertEqual(self.member('helper-unreviewed')['reasons'],
                         ['test-side module changed without a helper review: tests/fx/helper.mjs'])

    def test_a_traced_run_with_other_verdicts_refuses_the_file(self):
        row = self.member('trace-sensitive')
        self.assertEqual(row['reasons'], ['the traced run differs from the catalog run, or did not load the trace'])

    def test_a_command_sharing_one_process_preserves_nothing(self):
        self.assertEqual(self.member('shared', 'shared')['reasons'],
                         ['the command does not run each file in its own process'])

    def test_register_follows_same_file_and_imported_helpers(self):
        keys = {row['key'] for row in self.matches}
        self.assertEqual(keys, {f'tests/fx/registered.test.mjs:{self.line(title)}:1' for title in ('member', 'revoked')})
        self.assertEqual(self.member('registered')['status'], 'held')
        revoked = next(row for row in self.table if row['title'] == 'revoked')
        self.assertEqual((revoked['status'], revoked['register']), ('preserved', 'not_held'))

    def test_figures_count_the_census(self):
        figures = tool.census_figures(self.evaluations, self.table, self.all_earlier)
        self.assertFalse(figures['all_leaves_earlier'])
        self.assertEqual((figures['registrations'], figures['members']), (len(self.evaluations), len(self.table)))
        self.assertEqual(figures['changed_origins'], len(REFUSED) + len(PRESERVED))
        self.assertEqual(figures['changed_span_identical'],
                         figures['changed_kept_by_prefix'] + figures['changed_refused_by_prefix'])
        self.assertEqual((figures['identical_fixture_refused'], figures['preserved_helper_reviewed'],
                          figures['preserved_production_changed'], figures['preserved_repository_read_changed']), (2, 1, 1, 1))

    def commit_manifest(self, spec):
        self.repo.document('corpus.json', spec)
        return self.repo.commit('format 2')

    def test_corpus_recomputes_the_table_and_the_register(self):
        rev = self.commit_manifest(self.manifest(self.table, self.entries, order_model_holds=True))
        result = tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)
        self.assertEqual(result['counts']['preserved'], sum(row['status'] == 'preserved' for row in self.table))
        self.assertEqual(result['register']['entries'], 2)
        stale = json.loads(json.dumps(self.table))
        stale[0]['status'] = 'preserved' if stale[0]['status'] != 'preserved' else 'refused'
        rev = self.commit_manifest(self.manifest(stale, self.entries, order_model_holds=True))
        with self.assertRaisesRegex(tool.CheckError, 'preserved table differs from the census at C: 1 members differ'):
            tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)

    def test_a_suite_target_on_a_held_leaf_is_refused(self):
        spec = self.manifest(self.table, self.entries, order_model_holds=True)
        origin = self.origins['tests/fx/registered.test.mjs']
        spec['counterexamples'] = [{'id': 'cx', 'kind': 'behavior', 'origins': [origin], 'required_result': 'a proxy'}]
        spec['suite_targets'] = [{
            'id': 'target.held', 'counterexample': 'cx', 'command': 'repository-tests', 'file': 'tests/fx/registered.test.mjs',
            'test_path': ['member'], 'declaration': {'line': self.line('member'), 'column': 1},
            'input_anchors': [{'anchor': 'const proxy = wrap({});', 'sha256': tool.digest(b'const proxy = wrap({});'),
                               'computed': True}],
            'assertion_anchors': [{'anchor': 'assert.ok(proxy);', 'sha256': tool.digest(b'assert.ok(proxy);')}],
            'relation': {'kind': 'exact_input'}, 'discrimination': {'reading': 'the assertion checks the proxy'}}]
        result = tool.corpus(self.repo.reader, self.commit_manifest(spec), 'corpus.json', toolchain=self.toolchain)
        target, = result['targets']['results']
        self.assertEqual(target['refused'], ['the target leaf is a registered held test (P1-H)'])
        self.assertNotIn('credit', target)

    def held_member(self):
        return next(row['member'] for row in self.table if row['status'] == 'held')

    def witness(self, **changes):
        origin = self.origins['tests/fx/registered.test.mjs']
        row = {'id': 'witness.held', 'kind': 'held_witness', 'origins': [origin], 'claim': 'Proxy',
               'members': [self.held_member()], 'required_result': 'A Proxy reaching capture is refused (held).'}
        row.update(changes)
        return row

    def test_witness_records_name_their_claim_and_members(self):
        spec = self.manifest(self.table, self.entries, order_model_holds=True)
        spec['counterexamples'] = [self.witness()]
        result = tool.corpus(self.repo.reader, self.commit_manifest(spec), 'corpus.json', toolchain=self.toolchain)
        self.assertEqual(result['counts']['counterexamples'], 1)
        spec['counterexamples'] = [self.witness(claim='V-ENV')]
        with self.assertRaisesRegex(tool.CheckError, 'registered under another claim'):
            tool.corpus(self.repo.reader, self.commit_manifest(spec), 'corpus.json', toolchain=self.toolchain)

    def test_a_witness_lists_members_of_its_status(self):
        preserved = next(row['member'] for row in self.table if row['status'] == 'preserved')
        spec = self.manifest(self.table, self.entries, order_model_holds=True)
        spec['counterexamples'] = [self.witness(members=[preserved])]
        with self.assertRaisesRegex(tool.CheckError, 'a witness member has another status'):
            tool.corpus(self.repo.reader, self.commit_manifest(spec), 'corpus.json', toolchain=self.toolchain)

    def test_corpus_requires_an_attributed_witness_to_close_a_held_origin(self):
        path = 'tests/fx/registered.test.mjs'
        origin = self.origins[path]
        for kind in ('behavior', 'held_witness'):
            with self.subTest(kind=kind):
                spec = self.manifest(self.table, self.entries, order_model_holds=True)
                witness = self.witness(kind=kind)
                if kind == 'behavior':
                    witness.pop('claim')
                spec['counterexamples'] = [witness]
                for row in spec['origins']:
                    if row['id'] == origin:
                        row.update(state='complete', closure={
                            'links': [{'kind': 'counterexample', 'id': witness['id']}],
                            'context': [{'revision': self.pin, 'path': path, 'start': 1,
                                         'end': len(REGISTERED.encode().split(b'\n'))}]})
                rev = self.commit_manifest(spec)
                if kind == 'behavior':
                    with self.assertRaisesRegex(tool.CheckError, 'has no linked witness'):
                        tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)
                else:
                    result = tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)
                    self.assertEqual(result['closures']['complete'], 1)
                    self.assertEqual(result['preserved']['by_status']['held'], 1)

    def test_a_complete_origin_closes_over_its_members_and_context(self):
        path = 'tests/fx/production-data.test.mjs'
        origin = self.origins[path]
        lines = len(PRODUCTION_DATA.splitlines())
        spec = self.manifest(self.table, self.entries, order_model_holds=True)
        for row in spec['origins']:
            if row['id'] == origin:
                row.update(state='complete', closure={
                    'links': [{'kind': 'member', 'id': next(r['member'] for r in self.table if r['file'] == path)}],
                    'context': [{'revision': self.pin, 'path': path, 'start': 1, 'end': lines}]})
        result = tool.corpus(self.repo.reader, self.commit_manifest(spec), 'corpus.json', toolchain=self.toolchain)
        self.assertEqual((result['states'].get('complete'), result['closures']['complete']), (1, 1))

    def test_a_member_target_sits_at_its_members_declaration(self):
        refused = next(row for row in self.table if row['status'] == 'refused' and row.get('current'))
        spec = self.manifest(self.table, self.entries, order_model_holds=True)
        spec['counterexamples'] = [{'id': 'cx', 'kind': 'behavior', 'origins': refused['origins'], 'required_result': 'x'}]
        spec['suite_targets'] = [{'id': 'target.moved', 'counterexample': 'cx', 'member': refused['member'], 'command': 'repository-tests',
                                  'file': refused['file'], 'test_path': ['member'], 'declaration': {'line': 1, 'column': 1},
                                  'input_anchors': [{'anchor': 'x', 'sha256': tool.digest(b'x'), 'computed': True}],
                                  'assertion_anchors': [{'anchor': 'y', 'sha256': tool.digest(b'y')}],
                                  'relation': {'kind': 'exact_input'}, 'discrimination': {'reading': 'r'}}]
        with self.assertRaisesRegex(tool.CheckError, "sits at its member's declaration"):
            tool.corpus(self.repo.reader, self.commit_manifest(spec), 'corpus.json', toolchain=self.toolchain)

    def test_corpus_refuses_an_unclassified_register_match(self):
        rev = self.commit_manifest(self.manifest(self.table, self.entries[:1], order_model_holds=True))
        with self.assertRaisesRegex(tool.CheckError, 'register entries differ from the recomputed matches'):
            tool.corpus(self.repo.reader, rev, 'corpus.json', toolchain=self.toolchain)


class RepositoryRegisterTests(unittest.TestCase):
    def test_the_register_holds_the_d05_chk_05_fixtures(self):
        """The helper-built Proxy acceptances D05-CHK-05 names, and a harness revokedProxy user."""
        manifest = json.loads((ROOT / 'tests/fixtures/packet-tools/adoption.json').read_text())
        entries = {row['key']: row for row in manifest['holds']['register']['entries']}
        expected = {'packages/kernel/tests/values.test.ts:1225:3': 'superseded',
                    'packages/kernel/tests/values.test.ts:1239:3': 'superseded',
                    'packages/kernel/tests/creation.test.ts:742:3': 'superseded',
                    'packages/kernel/tests/ingress.test.ts:819:3': 'held'}
        self.assertEqual({key: entries[key]['classification'] for key in expected}, expected)
        self.assertEqual(manifest['holds']['register']['recipes'], tool.REGISTER_MINIMUM)


if __name__ == '__main__':
    unittest.main()
