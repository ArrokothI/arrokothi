"""Declared child environments, the environment census and pinned snapshot inputs (TOOLS-01 F4)."""
import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from test_packet_tools import RepositoryFixture, tool

# Inherited names a contaminated parent could carry; none may reach a declared child.
CONTAMINANTS = {
    'NODE_OPTIONS': '--require=/nonexistent/tools01-contaminant.cjs',
    'KERNEL_POISON_MODE': 'throw',
    'NODE_TEST_CONTEXT': 'child-v8',
    'NODE_V8_COVERAGE': '/nonexistent/tools01-coverage',
    'PACKET_ORACLE_CHECK': 'returned',
    'ARROKOTHI_EVIDENCE_ROOT': '/nonexistent/tools01-archive',
}
MARKER = 'TOOLS01_SYNTHETIC_INHERITED_VALUE'
PRINT_NAMES = 'import json, os; print(json.dumps(dict((k, os.environ[k]) for k in sorted(os.environ))))'


def census(**extra):
    return {'pass': ['PATH', 'HOME', 'TMPDIR'], 'set': {'LANG': 'C.UTF-8'},
            'census': {'roots': ['tests'], **extra.pop('census', {})}, **extra}


class EnvironmentTests(RepositoryFixture):
    def child(self, declaration=None, provided=None, argv=None):
        with patch.dict(os.environ, dict(CONTAMINANTS, TOOLS01_PASSED=MARKER)):
            environment, record = tool.child_environment(tool.environment_declaration(declaration), provided)
            run = tool.command(argv or [sys.executable, '-c', PRINT_NAMES], self.root, 10, 65536, environment)
        return run, record

    def test_inherited_contaminants_never_reach_a_child(self):
        run, record = self.child()
        seen = json.loads(run['output'])
        self.assertFalse(set(CONTAMINANTS) & set(seen))
        self.assertNotIn('TOOLS01_PASSED', seen)
        self.assertEqual(seen['LANG'], 'C.UTF-8')
        self.assertIn('PATH', seen)
        self.assertEqual(record['absent'], [])
        self.assertFalse(record['inherited_values_recorded'])

    def test_contaminated_node_options_cannot_reach_node(self):
        run, _ = self.child(argv=['node', '-e', 'process.exit(process.env.NODE_OPTIONS === undefined ? 0 : 3)'])
        self.assertEqual((run['status'], run['exit']), ('finished', 0), run['output'])

    def test_declared_names_pass_and_records_hold_no_inherited_value(self):
        run, record = self.child({'pass': ['PATH', 'TOOLS01_PASSED'], 'set': {'TOOLS01_SET': 'declared'},
                                  'absent': [{'name': 'NODE_OPTIONS', 'effect': 'fixture'}]})
        seen = json.loads(run['output'])
        self.assertEqual((seen['TOOLS01_PASSED'], seen['TOOLS01_SET']), (MARKER, 'declared'))
        self.assertNotIn('NODE_OPTIONS', seen)
        self.assertEqual(record['passed'], ['PATH', 'TOOLS01_PASSED'])
        self.assertEqual(record['absent'], ['NODE_OPTIONS'])
        self.assertNotIn(MARKER, json.dumps(record))

    def test_mutation_runner_children_get_the_declared_environment(self):
        self.write('probe.py', 'import json, os\nfrom program import result\n'
                   'passed = result == 1 and "KERNEL_POISON_MODE" not in os.environ\n'
                   'print(json.dumps({"case":"case", "assertion":"clean", "reached":True, "passed":passed}))\n'
                   'raise SystemExit(0 if passed else 17)\n')
        self.write('program.py', 'result = 1\n')
        self.document('registry.json', {'version': 1, 'cases': [{
            'id': 'case', 'assertion': 'clean', 'files': ['program.py', 'probe.py'],
            'argv': [sys.executable, '-B', 'probe.py'], 'timeout_seconds': 10, 'output_limit_bytes': 4096,
            'failure_exit': 17, 'mutants': [{'id': 'm', 'path': 'program.py', 'before': 'result = 1',
                                             'after': 'result = 2'}]}]})
        rev = self.commit('runner')
        with patch.dict(os.environ, CONTAMINANTS):
            result = tool.mutations(self.reader, rev, 'registry.json')
        self.assertEqual(result['cases'][0]['control'], 'passed')
        self.assertEqual(result['cases'][0]['mutations'][0]['status'], 'killed')
        self.assertEqual(result['environment']['passed'][0], 'PATH')

    def test_unknown_declaration_field_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'unknown fields'):
            tool.environment_declaration({'inherit': True})


class CensusTests(RepositoryFixture):
    def spec(self, source, **declaration):
        self.write('tests/read.mjs', source)
        self.write('check.py', 'print("tests 1")\n')
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'],
                                      'environment': census(**declaration), 'checks': [{
                                          'id': 'unit', 'argv': [sys.executable, '-B', 'check.py'],
                                          'timeout_seconds': 10, 'output_limit_bytes': 1024,
                                          'counts': {'tests': r'tests (\d+)'}, 'minimum_counts': {'tests': 1}}]})
        return self.commit('census fixture')

    def test_unlisted_read_fails(self):
        rev = self.spec('if (!process.env.TOOLS01_GATE) process.exit(0);\n')
        with self.assertRaisesRegex(tool.CheckError, 'undeclared environment read: TOOLS01_GATE'):
            tool.verify(self.reader, rev, 'verify.json')

    def test_bracket_read_is_a_named_read(self):
        rev = self.spec("const gate = process.env['TOOLS01_GATE'];\n")
        with self.assertRaisesRegex(tool.CheckError, 'TOOLS01_GATE'):
            tool.verify(self.reader, rev, 'verify.json')

    def test_declared_absent_read_passes_and_is_listed(self):
        rev = self.spec('if (!process.env.TOOLS01_GATE) process.exit(0);\n',
                        absent=[{'name': 'TOOLS01_GATE', 'effect': 'fixture branch stays inactive'}])
        result = tool.verify(self.reader, rev, 'verify.json')
        self.assertEqual(result['result'], 'checks_passed')
        self.assertEqual(result['environment']['census']['names'], {'TOOLS01_GATE': ['tests/read.mjs']})

    def test_computed_read_needs_a_declaration(self):
        rev = self.spec('const all = { ...process.env };\n')
        with self.assertRaisesRegex(tool.CheckError, 'computed environment read needs a declaration'):
            tool.verify(self.reader, rev, 'verify.json')

    def test_declared_computed_read_passes(self):
        rev = self.spec('const all = { ...process.env };\n', census={'computed': [
            {'path': 'tests/read.mjs', 'text': 'const all = { ...process.env };', 'reason': 'fixture'}]})
        self.assertEqual(tool.verify(self.reader, rev, 'verify.json')['result'], 'checks_passed')

    def test_stale_computed_declaration_refused(self):
        rev = self.spec('const unrelated = 1;\n', census={'computed': [
            {'path': 'tests/read.mjs', 'text': 'const all = { ...process.env };', 'reason': 'fixture'}]})
        with self.assertRaisesRegex(tool.CheckError, 'stale computed'):
            tool.verify(self.reader, rev, 'verify.json')

    def test_process_module_env_import_is_computed(self):
        rev = self.spec("import { env } from 'node:process';\n")
        with self.assertRaisesRegex(tool.CheckError, 'needs a declaration'):
            tool.verify(self.reader, rev, 'verify.json')


class SnapshotInputTests(RepositoryFixture):
    def spec(self, reader, other='print("tests 1")'):
        self.write('reader.py', reader + '\n')
        self.write('other.py', other + '\n')
        checks = [{'id': 'with-input', 'argv': [sys.executable, '-B', 'reader.py'], 'inputs': ['sealed'],
                   'timeout_seconds': 10, 'output_limit_bytes': 4096, 'counts': {'tests': r'tests (\d+)'},
                   'minimum_counts': {'tests': 1}},
                  {'id': 'without-input', 'argv': [sys.executable, '-B', 'other.py'], 'timeout_seconds': 10,
                   'output_limit_bytes': 4096, 'counts': {'tests': r'tests (\d+)'}, 'minimum_counts': {'tests': 1}}]
        self.document('verify.json', {'version': 1, 'limits': ['Fixture evidence only'],
                                      'environment': census(census={'roots': ['reader.py']}),
                                      'inputs': [{'id': 'sealed', 'kind': 'git_snapshot', 'revision': self.b,
                                                  'environment': 'TOOLS01_SNAPSHOT'}],
                                      'checks': checks})
        return self.commit('input fixture')

    READS = ('import os\nfrom pathlib import Path\n'
             'text = (Path(os.environ["TOOLS01_SNAPSHOT"]) / "sealed.txt").read_text()\n'
             'print("tests " + ("1" if text == "historical evidence\\n" else "0"))')

    def test_snapshot_is_provided_only_to_the_step_naming_it(self):
        rev = self.spec(self.READS, 'import os\nprint("tests " + ("0" if "TOOLS01_SNAPSHOT" in os.environ else "1"))')
        with patch.dict(os.environ, {'TOOLS01_SNAPSHOT': '/nonexistent/inherited'}):
            result = tool.verify(self.reader, rev, 'verify.json')
        self.assertEqual(result['result'], 'checks_passed')
        first, second = result['checks']
        self.assertEqual(first['inputs'][0]['revision'], self.b)
        self.assertEqual(first['inputs'][0]['regular_files'], 2)
        self.assertEqual(first['environment']['inputs'], ['TOOLS01_SNAPSHOT'])
        self.assertEqual(second['inputs'], [])

    def test_snapshot_changed_by_the_step_refused(self):
        rev = self.spec(self.READS + '\n(Path(os.environ["TOOLS01_SNAPSHOT"]) / "sealed.txt").write_text("changed")')
        with self.assertRaisesRegex(tool.CheckError, 'snapshot input changed during with-input'):
            tool.verify(self.reader, rev, 'verify.json')

    def test_snapshot_verification_refuses_changed_missing_extra_and_retyped_entries(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary) / 'snapshot'
            directory.mkdir()
            original = tool.snapshot_input(self.reader, {'id': 'x', 'revision': self.b}, directory)
            sealed = directory / 'sealed.txt'
            sealed.write_text('changed\n')
            with self.assertRaisesRegex(tool.CheckError, 'bytes differ'):
                tool.verify_snapshot(self.reader, self.b, directory)
            sealed.unlink()
            with self.assertRaisesRegex(tool.CheckError, 'paths differ'):
                tool.verify_snapshot(self.reader, self.b, directory)
            sealed.symlink_to('source.md')
            with self.assertRaisesRegex(tool.CheckError, 'entry kind differs'):
                tool.verify_snapshot(self.reader, self.b, directory)
            sealed.unlink()
            sealed.write_text('historical evidence\n')
            (directory / 'extra').write_text('extra')
            with self.assertRaisesRegex(tool.CheckError, 'paths differ'):
                tool.verify_snapshot(self.reader, self.b, directory)
            (directory / 'extra').unlink()
            self.assertEqual(tool.verify_snapshot(self.reader, self.b, directory), original)

    def test_undeclared_input_refused(self):
        self.spec(self.READS)
        spec = json.loads((self.root / 'verify.json').read_text())
        spec['checks'][0]['inputs'] = ['absent']
        self.document('verify.json', spec)
        rev = self.commit('undeclared input')
        with self.assertRaisesRegex(tool.CheckError, 'undeclared input'):
            tool.verify(self.reader, rev, 'verify.json')


class NodeFloorTests(unittest.TestCase):
    def fake_node(self, output):
        directory = tempfile.TemporaryDirectory(prefix='tools01-fake-node-')
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / 'node'
        path.write_text('#!/bin/sh\necho ' + output + '\n')
        path.chmod(path.stat().st_mode | stat.S_IXUSR)
        return {'PATH': directory.name + os.pathsep + os.environ.get('PATH', '')}

    def test_floor_version_accepted(self):
        self.assertEqual(tool.node_version(self.fake_node('v26.10.0'), Path.cwd()), 'v26.10.0')

    def test_older_node_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'below the v26.10.0 floor'):
            tool.node_version(self.fake_node('v22.15.0'), Path.cwd())

    def test_unreadable_version_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'node --version failed'):
            tool.node_version(self.fake_node('not-a-version'), Path.cwd())


if __name__ == '__main__':
    unittest.main()
