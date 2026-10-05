"""Title catalog: declared command binding, glob selection, leaf tree and run validity (design 05 step 3)."""
import json
import unittest
from pathlib import Path

from test_packet_tools import RepositoryFixture, stub_area_gate, tool
from test_target_tools import pinned_toolchain

ROOT = Path(__file__).resolve().parents[2]
REPORTER = Path(__file__).resolve().parent / 'catalog-reporter.mjs'
SOURCE_FACTS = Path(__file__).resolve().parent / 'source-facts.mjs'
FLAGS = ['--test']
GLOBS = ['tests/*.test.mjs']
SCRIPT = ' '.join(['node', *FLAGS, *GLOBS])
PASSING = ("import { test, describe } from 'node:test';\n"
           "import assert from 'node:assert/strict';\n"
           "test('first', () => assert.ok(true));\n"
           "describe('outer', () => {\n"
           "  test('inner', () => assert.equal(1, 1));\n"
           "});\n"
           "test('skipped', { skip: true }, () => {});\n")


def row(kind, name, line, column, nesting=0, file='/x.test.mjs', **extra):
    return {'type': kind, 'name': name, 'line': line, 'column': column, 'nesting': nesting, 'file': file, **extra}


class CatalogFixture(RepositoryFixture):
    toolchain = None

    @classmethod
    def setUpClass(cls):
        cls.toolchain = pinned_toolchain()

    def setUp(self):
        super().setUp()
        stub_area_gate(self)

    def verify(self, rev):
        return tool.verify(self.reader, rev, 'verify.json', self.toolchain)

    def catalog(self, files=None, script=SCRIPT, step_script=SCRIPT, globs=GLOBS):
        self.write('tests/tooling/catalog-reporter.mjs', REPORTER.read_text())
        self.write('tests/tooling/source-facts.mjs', SOURCE_FACTS.read_text())
        for name, text in (files or {'tests/a.test.mjs': PASSING}).items():
            self.write(name, text)
        self.document('package.json', {'type': 'module', 'scripts': {'test': script}})
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'], 'candidate': 'packet.json',
                                      'environment': {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'},
                                                      'census': {'roots': ['tests']}},
                                      'checks': [{'id': 'repository-tests', 'catalog': {
                                          'script': 'test', 'script_text': step_script, 'flags': FLAGS,
                                          'globs': globs}, 'timeout_seconds': 60, 'output_limit_bytes': 1048576,
                                          'counts': {'tests': r'^[#ℹ] tests (\d+)$', 'fail': r'^[#ℹ] fail (\d+)$'},
                                          'minimum_counts': {'tests': 1}, 'exact_counts': {'fail': 0}}]})
        return self.commit('catalog fixture')


class CatalogDeclarationTests(CatalogFixture):
    def test_declared_script_selects_and_runs_with_both_reporters(self):
        rev = self.catalog()
        result = self.verify(rev)
        check = result['checks'][0]
        self.assertEqual(result['result'], 'checks_passed', check)
        self.assertEqual(check['counts'], {'tests': 3, 'fail': 0})
        catalog = check['catalog']
        self.assertTrue(catalog['valid'])
        self.assertTrue(catalog['source_kind_checked'])
        self.assertEqual((catalog['files'], catalog['leaves']), (1, 3))
        self.assertEqual(catalog['leaf_verdicts'], {'passed': 2, 'skipped': 1})

    def test_script_drift_refused(self):
        rev = self.catalog(script=SCRIPT + ' tests/extra.test.mjs')
        with self.assertRaisesRegex(tool.CheckError, 'catalog script drift'):
            self.verify(rev)

    def test_declared_text_must_equal_the_rendering(self):
        rev = self.catalog(step_script='node --test tests/a.test.mjs')
        with self.assertRaisesRegex(tool.CheckError, 'catalog script drift'):
            self.verify(rev)

    def test_glob_selects_one_segment_and_never_helpers_or_other_directories(self):
        self.catalog({'tests/a.test.mjs': PASSING, 'tests/harness.mjs': 'export const x = 1;\n',
                      'tests/evals/b.test.mjs': PASSING, 'examples/c.test.mjs': PASSING,
                      'tests/.hidden.test.mjs': PASSING})
        self.assertEqual(tool.expand_globs(self.reader, self.git('rev-parse', 'HEAD'), GLOBS), ['tests/a.test.mjs'])

    def test_glob_matching_nothing_refused(self):
        rev = self.catalog(globs=['tests/*.spec.mjs'], script='node --test tests/*.spec.mjs',
                           step_script='node --test tests/*.spec.mjs')
        with self.assertRaisesRegex(tool.CheckError, 'matches no file'):
            self.verify(rev)

    def test_selection_flag_in_catalog_refused(self):
        flags = ['--test', '--test-name-pattern=first']
        script = ' '.join(['node', *flags, *GLOBS])
        rev = self.catalog(script=script, step_script=script)
        spec = json.loads((self.root / 'verify.json').read_text())
        spec['checks'][0]['catalog']['flags'] = flags
        self.document('verify.json', spec)
        rev = self.commit('selection flag')
        with self.assertRaisesRegex(tool.CheckError, 'without their own reporter or selection'):
            self.verify(rev)

    def test_failing_leaf_fails_the_step_and_stays_in_the_catalog(self):
        rev = self.catalog({'tests/a.test.mjs': PASSING + "test('broken', () => { throw new Error('x'); });\n"})
        result = self.verify(rev)
        self.assertEqual(result['result'], 'attention_required')
        self.assertEqual(result['checks'][0]['catalog']['leaf_verdicts']['failed'], 1)


    def test_registration_through_an_alias_refuses_its_file(self):
        aliased = "import { test } from 'node:test';\nconst register = test;\nregister('aliased', () => {});\n"
        rev = self.catalog({'tests/a.test.mjs': PASSING, 'tests/b.test.mjs': aliased})
        catalog = self.verify(rev)['checks'][0]['catalog']
        self.assertFalse(catalog['valid'])
        self.assertEqual(catalog['refused_files'], {'tests/b.test.mjs': 'source registration mismatch at 3:1'})

    def test_suite_reported_where_source_registers_a_test_refuses_the_file(self):
        tree = {'files': {'t.mjs': {'pairs': [{'kind': 'suite', 'line': 1, 'column': 1}], 'synthetic': 0}},
                'refused': {}, 'valid': True}
        kinds = {'t.mjs': {(1, 1): {'kind': 'leaf'}}}
        self.assertEqual(tool.catalog_source_check(tree, kinds)['refused'], {'t.mjs': 'source registration mismatch at 1:1'})


class LeafTreeTests(unittest.TestCase):
    def tree(self, rows):
        return tool.file_tree(rows)

    def test_suite_start_without_details_pairs_with_its_result(self):
        tree, error = self.tree([row('test:start', 'outer', 1, 1), row('test:start', 'inner', 2, 3, 1),
                                 row('test:pass', 'inner', 2, 3, 1, details_type='test'),
                                 row('test:pass', 'outer', 1, 1, details_type='suite')])
        self.assertIsNone(error)
        self.assertEqual([(p['path'], p['kind'], p['leaf']) for p in tree['pairs']],
                         [(['outer'], 'suite', False), (['outer', 'inner'], 'test', True)])

    def test_absent_type_is_a_test(self):
        tree, _ = self.tree([row('test:start', 'a', 1, 1), row('test:pass', 'a', 1, 1)])
        self.assertEqual(tree['pairs'][0]['kind'], 'test')

    def test_empty_suite_and_parent_test_are_not_leaves(self):
        tree, _ = self.tree([row('test:start', 'empty', 1, 1), row('test:pass', 'empty', 1, 1, details_type='suite'),
                             row('test:start', 'parent', 2, 1), row('test:start', 'child', 2, 9, 1),
                             row('test:pass', 'child', 2, 9, 1, details_type='test'),
                             row('test:pass', 'parent', 2, 1, details_type='test')])
        self.assertEqual([(p['path'], p['leaf']) for p in tree['pairs']],
                         [(['empty'], False), (['parent'], False), (['parent', 'child'], True)])

    def test_malformed_files_are_refused(self):
        start, result = row('test:start', 'a', 1, 1), row('test:pass', 'a', 1, 1, details_type='test')
        cases = {'unknown details.type': [start, dict(result, details_type='bench')],
                 'start/result keys differ': [start],
                 'duplicated key among starts': [start, start, result],
                 'duplicated key among results': [start, result, result],
                 'missing location': [dict(start, line=None), result],
                 'missing parent start': [row('test:start', 'b', 2, 3, 1), row('test:pass', 'b', 2, 3, 1)]}
        for reason, rows in cases.items():
            with self.subTest(reason=reason):
                tree, error = self.tree(rows)
                self.assertIsNone(tree)
                self.assertIn(reason, error)

    def test_synthetic_file_pair_is_not_a_leaf(self):
        tree, _ = self.tree([row('test:start', '/x.test.mjs', 1, 1, synthetic=True),
                             row('test:pass', '/x.test.mjs', 1, 1, synthetic=True)])
        self.assertEqual((tree['pairs'], tree['synthetic']), ([], 1))

    def test_run_validity_requires_every_selected_file_and_consistent_summary(self):
        root = Path('/repo')
        rows = [row('test:start', 'a', 1, 1, file='/repo/t/a.test.mjs'),
                row('test:pass', 'a', 1, 1, file='/repo/t/a.test.mjs', details_type='test')]
        summary = [{'type': 'summary', 'label': label, 'count': count} for label, count in
                   {'tests': 1, 'suites': 0, 'pass': 1, 'fail': 0, 'cancelled': 0, 'skipped': 0, 'todo': 0}.items()]
        self.assertTrue(tool.catalog_tree(rows + summary, root, ['t/a.test.mjs'])['valid'])
        missing = tool.catalog_tree(rows + summary, root, ['t/a.test.mjs', 't/b.test.mjs'])
        self.assertEqual((missing['valid'], missing['refused']), (False, {'t/b.test.mjs': 'no result reported'}))
        wrong = [dict(entry, count=2) if entry['label'] == 'pass' else entry for entry in summary]
        self.assertFalse(tool.catalog_tree(rows + wrong, root, ['t/a.test.mjs'])['valid'])
        with self.assertRaisesRegex(tool.CheckError, 'catalog summary incomplete'):
            tool.catalog_tree(rows + summary[1:], root, ['t/a.test.mjs'])


if __name__ == '__main__':
    unittest.main()
