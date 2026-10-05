"""Distinguishing tool fixtures; every Git mutation uses this test's own temporary repository."""
from pathlib import Path
import importlib.util
import gzip
import json
import os
import subprocess
import sys
import tempfile
import unittest
import unittest.mock

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('packet_tools', Path(__file__).resolve().parents[2] / 'scripts/packet_tools.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


def stub_area_gate(case):
    """Verify tests that are not about P1-X: the gate is stubbed; test_area_gate runs the real one."""
    patcher = unittest.mock.patch.object(tool, 'area_gate', lambda git, rev, path: {'operation': 'gate', 'result': 'gate_passed'})
    patcher.start()
    case.addCleanup(patcher.stop)


class RepositoryFixture(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='packet-tools-test-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.git('init', '-q')
        self.write('sealed.txt', 'historical evidence\n')
        self.write('source.md', '```js\nconst value = 1;\n```\n\nA recorded probe.\n')
        self.b = self.commit('baseline')
        self.reader = tool.Git(self.root)

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), '-c', 'user.name=Tool fixture',
                                       '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
                                       '-c', 'core.hooksPath=/dev/null', *args], stderr=subprocess.PIPE).decode().strip()

    def write(self, name, text):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def document(self, name, value):
        self.write(name, json.dumps(value) + '\n')

    def commit(self, message):
        self.git('add', '.')
        self.git('commit', '-qm', message)
        return self.git('rev-parse', 'HEAD')

    def format_two_tables(self):
        """Format-2 holds with the minimum register recipes, a passing A10 floor record, no moves or reviews."""
        self.write('decision.md', 'Held claim decision.\n')
        record = gzip.compress(json.dumps({'results': [{'assumption': 'A10', 'passed': True, 'facts': {
            'process_isolation': {'distinct_processes': True}, 'order_model_holds': False}}]}).encode(), mtime=0)
        (self.root / 'floor.json.gz').write_bytes(record)
        claims = [{'id': claim, 'owner': 'BINDING-01' if claim == 'V-ENV' else 'K1.1-correction-03',
                   'decisions': ['decision.md']} for claim in ('V-D1', 'Proxy', 're-prototyped-built-in', 'V-ENV')]
        return {'holds': {'claims': claims, 'register': {'recipes': json.loads(json.dumps(tool.REGISTER_MINIMUM)),
                                                         'entries': []}},
                'moves': [], 'floor': {'record': 'floor.json.gz', 'sha256': tool.digest(record), 'order_model_holds': False},
                'helper_reviews': [], 'areas': [{'id': 'other', 'globs': ['**']}]}

    def candidate_pair(self, **changes):
        data = {'version': 1, 'base': self.b, 'require_direct_parent': True,
                'administrative_files': ['report.md'], 'preserve': [{'revision': self.b, 'path': 'sealed.txt'}],
                'evidence': []}
        data.update(changes)
        self.document('spec.json', data)
        c = self.commit('payload')
        self.write('report.md', 'Implementation observations, not acceptance.\n')
        h = self.commit('report')
        return c, h


class CandidateTests(RepositoryFixture):
    def test_exact_candidate(self):
        c, h = self.candidate_pair()
        result = tool.candidate(self.reader, c, h, 'spec.json')
        self.assertEqual(result['result'], 'facts_verified')
        self.assertEqual(result['acceptance'], 'not evaluated')
        self.assertEqual(result['administrative_files'], ['report.md'])

    def test_moving_ref_is_not_identity(self):
        c, h = self.candidate_pair()
        with self.assertRaisesRegex(tool.CheckError, 'full 40'):
            tool.candidate(self.reader, c, 'HEAD', 'spec.json')

    def test_blob_is_not_commit(self):
        c, h = self.candidate_pair()
        blob = self.git('rev-parse', c + ':spec.json')
        with self.assertRaisesRegex(tool.CheckError, 'not a commit'):
            tool.candidate(self.reader, blob, h, 'spec.json')

    def test_nonexistent_commit(self):
        with self.assertRaises(tool.CheckError):
            self.reader.commit('f' * 40)

    def test_reverse_ancestry(self):
        c, _ = self.candidate_pair()
        with self.assertRaises(tool.CheckError):
            tool.candidate(self.reader, c, self.b, 'spec.json')

    def test_payload_cannot_certify_itself(self):
        c, _ = self.candidate_pair()
        with self.assertRaisesRegex(tool.CheckError, 'wrap payload'):
            tool.candidate(self.reader, c, c, 'spec.json')

    def test_extra_file(self):
        c, _ = self.candidate_pair(require_direct_parent=False)
        self.write('unexpected.ts', 'export const bypass = true;\n')
        h = self.commit('unexpected payload')
        with self.assertRaisesRegex(tool.CheckError, 'files differ'):
            tool.candidate(self.reader, c, h, 'spec.json')

    def test_non_direct_wrapper(self):
        c, _ = self.candidate_pair()
        self.write('report.md', 'Another wrapper commit.\n')
        h = self.commit('later wrapper')
        with self.assertRaisesRegex(tool.CheckError, 'directly wrap'):
            tool.candidate(self.reader, c, h, 'spec.json')

    def test_executable_cannot_be_declared_output(self):
        c, h = self.candidate_pair(administrative_files=['report.md', 'runner.py'])
        with self.assertRaisesRegex(tool.CheckError, 'payload review'):
            tool.candidate(self.reader, c, h, 'spec.json')

    def test_spec_loaded_from_c_not_checkout(self):
        c, h = self.candidate_pair()
        self.write('spec.json', '{"version":999}')
        self.assertEqual(tool.candidate(self.reader, c, h, 'spec.json')['result'], 'facts_verified')

    def test_historical_evidence_preserved(self):
        self.write('sealed.txt', 'changed old evidence\n')
        c, h = self.candidate_pair()
        with self.assertRaisesRegex(tool.CheckError, 'preserved path changed'):
            tool.candidate(self.reader, c, h, 'spec.json')

    def test_missing_preservation_source_is_not_empty_success(self):
        c, h = self.candidate_pair(preserve=[{'revision': self.b, 'path': 'missing'}])
        with self.assertRaisesRegex(tool.CheckError, 'source is missing'):
            tool.candidate(self.reader, c, h, 'spec.json')

    def test_missing_evidence(self):
        c, h = self.candidate_pair(evidence=[{'at': 'candidate', 'path': 'absent.txt', 'sha256': '0' * 64}])
        with self.assertRaisesRegex(tool.CheckError, 'missing regular source'):
            tool.candidate(self.reader, c, h, 'spec.json')

    def test_wrong_evidence_digest(self):
        c, h = self.candidate_pair(evidence=[{'at': 'candidate', 'path': 'report.md', 'sha256': '0' * 64}])
        with self.assertRaisesRegex(tool.CheckError, 'digest mismatch'):
            tool.candidate(self.reader, c, h, 'spec.json')

    def test_accessible_matching_evidence(self):
        self.write('result.json', '{"executed_at":"fixture"}\n')
        sha = tool.digest((self.root / 'result.json').read_bytes())
        c, h = self.candidate_pair(evidence=[{'at': 'payload', 'path': 'result.json', 'sha256': sha}])
        self.assertEqual(tool.candidate(self.reader, c, h, 'spec.json')['evidence'][0]['sha256'], sha)

    def test_duplicate_allowlist(self):
        c, h = self.candidate_pair(administrative_files=['report.md', 'report.md'])
        with self.assertRaisesRegex(tool.CheckError, 'duplicate'):
            tool.candidate(self.reader, c, h, 'spec.json')


class InventoryTests(RepositoryFixture):
    def fixture(self, change=None):
        artifact = {'revision': self.b, 'path': 'source.md', 'line': 1, 'kind': 'inline js',
                    'sha256': tool.digest(b'const value = 1;\n'), 'disposition': 'extract'}
        mention = {'revision': self.b, 'path': 'source.md', 'line': 5, 'text': 'A recorded probe.',
                   'disposition': 'inspect mention'}
        rows, mentions = [artifact], [mention]
        if change:
            change(rows, mentions)
        self.document('artifacts.json', rows)
        self.document('mentions.json', mentions)
        revision = self.commit('catalogs')
        catalogs = [{'revision': revision, 'path': path,
                     'sha256': tool.digest((self.root / path).read_bytes()), 'count': len(items), 'kind': kind}
                    for path, items, kind in [('artifacts.json', rows, 'artifact'), ('mentions.json', mentions, 'mention')]]
        self.document('inventory.json', {'version': 1, 'catalogs': catalogs, 'additional_sources': [], 'mappings': []})
        return self.commit('inventory spec')

    def test_all_origins_remain_pending(self):
        rev = self.fixture()
        result = tool.inventory(self.reader, rev, 'inventory.json')
        self.assertEqual(result['counts'], {'artifact': 1, 'mention': 1})
        self.assertEqual(result['pending_adoption'], 2)
        self.assertFalse(result['full_corpus_complete'])
        self.assertEqual(len({r['id'] for r in result['origins']}), 2)

    def test_wrong_fence_hash(self):
        rev = self.fixture(lambda rows, mentions: rows[0].update(sha256='0' * 64))
        with self.assertRaisesRegex(tool.CheckError, 'origin digest mismatch'):
            tool.inventory(self.reader, rev, 'inventory.json')

    def test_wrong_mention(self):
        rev = self.fixture(lambda rows, mentions: mentions[0].update(text='not the source'))
        with self.assertRaisesRegex(tool.CheckError, 'prose locator mismatch'):
            tool.inventory(self.reader, rev, 'inventory.json')

    def test_duplicate_origin(self):
        rev = self.fixture(lambda rows, mentions: rows.append(dict(rows[0])))
        with self.assertRaisesRegex(tool.CheckError, 'duplicate origin'):
            tool.inventory(self.reader, rev, 'inventory.json')

    def test_wrong_catalog_count(self):
        self.fixture()
        spec = json.loads((self.root / 'inventory.json').read_text())
        spec['catalogs'][0]['count'] += 1
        self.document('inventory.json', spec)
        rev = self.commit('wrong count')
        with self.assertRaisesRegex(tool.CheckError, 'row count mismatch'):
            tool.inventory(self.reader, rev, 'inventory.json')

    def test_dead_mapping(self):
        self.fixture()
        spec = json.loads((self.root / 'inventory.json').read_text())
        spec['mappings'] = [{'origin': 'unknown', 'status': 'proposed', 'rationale': 'test', 'destination': 'test'}]
        self.document('inventory.json', spec)
        rev = self.commit('dead mapping')
        with self.assertRaisesRegex(tool.CheckError, 'missing or duplicate mapping'):
            tool.inventory(self.reader, rev, 'inventory.json')

    def test_no_invented_adoption(self):
        rev = self.fixture()
        origin = tool.inventory(self.reader, rev, 'inventory.json')['origins'][0]['id']
        spec = json.loads((self.root / 'inventory.json').read_text())
        spec['mappings'] = [{'origin': origin, 'status': 'accepted', 'rationale': 'test', 'destination': 'test'}]
        self.document('inventory.json', spec)
        rev = self.commit('claimed adoption')
        with self.assertRaisesRegex(tool.CheckError, 'proposed status'):
            tool.inventory(self.reader, rev, 'inventory.json')


class RunnerTests(RepositoryFixture):
    def fixture(self, *, before='result = 1', after='result = 2', control='result = 1', passed='result == 1', reached='True', timeout=2):
        self.write('program.py', control + '\n')
        self.write('probe.py', 'import json\nfrom program import result\n' +
                   f'passed = {passed}\n' +
                   f'print(json.dumps({{"case":"case", "assertion":"exact-value", "reached":{reached}, "passed":passed}}))\n' +
                   'raise SystemExit(0 if passed else 17)\n')
        self.document('registry.json', {'version': 1, 'cases': [{
            'id': 'case', 'assertion': 'exact-value', 'files': ['program.py', 'probe.py'],
            'argv': [sys.executable, '-B', 'probe.py'], 'timeout_seconds': timeout,
            'output_limit_bytes': 4096, 'failure_exit': 17,
            'mutants': [{'id': 'mutation', 'path': 'program.py', 'before': before, 'after': after}]}]})
        return self.commit('runner fixture')

    def outcome(self, rev):
        result = tool.mutations(self.reader, rev, 'registry.json')
        return result, result['cases'][0]['mutations'][0]['status']

    def test_actual_distinguishing_kill_and_source_unchanged(self):
        rev = self.fixture()
        original = (self.root / 'program.py').read_bytes()
        result, status = self.outcome(rev)
        self.assertEqual(status, 'killed')
        self.assertEqual(result['result'], 'selected_cases_passed')
        self.assertEqual((self.root / 'program.py').read_bytes(), original)
        self.assertEqual(self.git('status', '--porcelain'), '')

    def test_survived(self):
        _, status = self.outcome(self.fixture(passed='True'))
        self.assertEqual(status, 'survived')

    def test_uncovered(self):
        _, status = self.outcome(self.fixture(reached='result == 1'))
        self.assertEqual(status, 'uncovered')

    def test_invalid_baseline(self):
        _, status = self.outcome(self.fixture(control='result = 2'))
        self.assertEqual(status, 'invalid_baseline')

    def test_unapplied_mutation(self):
        _, status = self.outcome(self.fixture(before='not in source'))
        self.assertEqual(status, 'not_applicable')

    def test_ambiguous_mutation_site(self):
        _, status = self.outcome(self.fixture(control='result = 1\nresult = 1'))
        self.assertEqual(status, 'not_applicable')

    def test_setup_error_is_not_kill(self):
        _, status = self.outcome(self.fixture(after='raise RuntimeError("setup")'))
        self.assertEqual(status, 'setup_error')

    def test_timeout_is_not_kill(self):
        _, status = self.outcome(self.fixture(after='import time; time.sleep(10); result = 2', timeout=0.3))
        self.assertEqual(status, 'timeout')

    def test_output_overflow_is_not_kill(self):
        _, status = self.outcome(self.fixture(after='print("x" * 5000); result = 2'))
        self.assertEqual(status, 'output_limit')

    def test_invalid_json_is_not_kill(self):
        _, status = self.outcome(self.fixture(after='print("extra output"); result = 2'))
        self.assertEqual(status, 'setup_error')

    def test_zero_exit_cannot_mask_assertion_failure(self):
        run = {'status': 'finished', 'exit': 0, 'output': '{"case":"c","assertion":"a","passed":false,"reached":true}'}
        with self.assertRaisesRegex(tool.CheckError, 'exit disagrees'):
            tool.observation(run, {'id': 'c', 'assertion': 'a', 'failure_exit': 17})

    def test_missing_runtime_is_setup_error(self):
        run = tool.command(['nonexistent-runtime-tool-fixture'], self.root, 1, 1000, tool.child_environment(tool.environment_declaration(None))[0])
        self.assertEqual(run['status'], 'setup_error')

    def test_global_state_is_process_local(self):
        files = {'p.py': b'import builtins; print(hasattr(builtins,"polluted")); builtins.polluted=True\n'}
        case = {'argv': [sys.executable, '-B', 'p.py'], 'timeout_seconds': 2, 'output_limit_bytes': 1000}
        self.assertEqual(tool.run_case(files, case, tool.child_environment(tool.environment_declaration(None))[0])['output'], 'False\n')
        self.assertEqual(tool.run_case(files, case, tool.child_environment(tool.environment_declaration(None))[0])['output'], 'False\n')

    def test_symlink_fixture_refused(self):
        rev = self.fixture()
        (self.root / 'outside-link').symlink_to('/etc/passwd')
        rev = self.commit('link')
        with self.assertRaisesRegex(tool.CheckError, 'not a regular file'):
            self.reader.blob(rev, 'outside-link')

    def test_path_escape_refused(self):
        for path in ['../escape', '/absolute', 'a/../b', 'a//b', './x', '.git/config', 'a\\b']:
            with self.subTest(path=path), self.assertRaises(tool.CheckError):
                tool.path_name(path)

    def test_unclosed_fence_refused(self):
        with self.assertRaisesRegex(tool.CheckError, 'unclosed'):
            tool.fenced_bytes(b'```js\nconst x = 1;\n', 1)


if __name__ == '__main__':
    unittest.main()
