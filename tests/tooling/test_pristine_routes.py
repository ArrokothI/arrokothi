"""TOOLS-02 T2-2 (design 02 §2): every route that produces fixture data refuses an unclean checkout.

Each test calls its own route directly, so removing that route's guard fails it even when an outer or inner
guard elsewhere would still refuse (design check 02, D02-CHK-03). A refusal is read from the route's own
message; any other exception counts as "not refused", so an ablated guard fails the test instead of erroring."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import unittest.mock

from test_packet_tools import tool

HERE = Path(__file__).resolve().parent
KINDS = ('untracked', 'ignored', 'invisible')


def refusal(call):
    """The CheckError message a call raises, or a marker when it raises nothing or something else."""
    try:
        call()
    except Exception as exc:  # noqa: BLE001 - an ablated guard may surface as any later error
        return str(exc) if type(exc).__name__ == 'CheckError' else 'not refused: ' + type(exc).__name__
    return 'not refused'


class PristineRoutes(unittest.TestCase):
    def unclean(self, kind):
        """A committed repository plus one entry not tracked at HEAD: untracked, ignored, or git-invisible."""
        tmp = tempfile.TemporaryDirectory(prefix='pristine-route-')
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        git = lambda *args: subprocess.run(['git', '-C', str(root), '-c', 'user.name=Tool fixture', '-c',
                                            'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
                                            '-c', 'core.hooksPath=/dev/null', *args], check=True, capture_output=True)
        git('init', '-q')
        (root / '.gitignore').write_text({'ignored': '.env\n', 'invisible': 'node_modules/\n'}.get(kind, ''))
        (root / 'tracked.txt').write_text('tracked\n')
        git('add', '.')
        git('commit', '-qm', 'fixture')
        extra = {'untracked': 'stray.txt', 'ignored': '.env', 'invisible': 'examples/removed/node_modules/dep/index.js'}[kind]
        (root / extra).parent.mkdir(parents=True, exist_ok=True)
        (root / extra).write_text('not tracked at HEAD\n')
        reader = tool.Git(root)
        self.assertEqual(subprocess.run(['git', '-C', str(root), 'status', '--porcelain'], capture_output=True,
                                        text=True).stdout.strip() == '', kind != 'untracked')
        return root, reader, reader.run('rev-parse', 'HEAD').decode().strip()

    def assertRefused(self, route, message):
        self.assertTrue(message.startswith(route + tool.UNCLEAN), message)

    def test_dispatch_refuses_every_guarded_operation(self):
        for kind in KINDS:
            for operation in tool.GUARDED_OPERATIONS:
                with self.subTest(kind=kind, operation=operation):
                    root, _, rev = self.unclean(kind)
                    out = io.StringIO()
                    argv = ['packet_tools.py', '--repo', str(root), operation, '--revision', rev, '--spec', 'spec.json']
                    with contextlib.redirect_stdout(out), unittest.mock.patch.object(sys, 'argv', argv):
                        code = tool.main()
                    result = json.loads(out.getvalue())
                    self.assertEqual((code, result['result']), (2, 'invalid'))
                    self.assertRefused(operation, result['error'])

    def test_dispatch_leaves_candidate_and_gate_unguarded(self):
        self.assertEqual(set(tool.GUARDED_OPERATIONS) & {'candidate', 'gate', 'verify'}, set())

    def test_preserved_census_refuses(self):
        for kind in KINDS:
            with self.subTest(kind=kind):
                _, reader, rev = self.unclean(kind)
                self.assertRefused('preserved_census',
                                   refusal(lambda: tool.preserved_census(reader, rev, None, None, None, None)))

    def test_corpus_census_route_refuses(self):
        for kind in KINDS:
            with self.subTest(kind=kind):
                _, reader, rev = self.unclean(kind)
                self.assertRefused('corpus', refusal(lambda: tool.corpus_format_2(reader, rev, {}, {'origins': []})))

    def test_regenerate_refuses(self):
        for kind in KINDS:
            with self.subTest(kind=kind):
                _, reader, rev = self.unclean(kind)
                self.assertRefused('regenerate', refusal(lambda: tool.regenerate(reader, rev, 'adoption.json', write=True)))

    def test_regenerate_writes_only_a_canonical_manifest(self):
        root, reader, _ = self.unclean('untracked')
        (root / 'stray.txt').unlink()
        (root / 'adoption.json').write_text(json.dumps({'version': 2, 'preserved': []}) + '\n')
        subprocess.run(['git', '-C', str(root), 'add', '.'], check=True)
        subprocess.run(['git', '-C', str(root), '-c', 'user.name=f', '-c', 'user.email=f@example.invalid', 'commit', '-qm', 'm'],
                       check=True)
        message = refusal(lambda: tool.regenerate(reader, reader.run('rev-parse', 'HEAD').decode().strip(), 'adoption.json', write=True))
        self.assertEqual(message, 'regenerate writes only a manifest already in its canonical form')

    def evidence_script(self, name, kind, arguments):
        """Run a K1.1-correction-03 evidence script's main with its ROOT moved to an unclean repository."""
        root, _, _ = self.unclean(kind)
        spec = importlib.util.spec_from_file_location(name.replace('-', '_') + '_' + kind, HERE / (name + '.py'))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.ROOT = root
        output = Path(tempfile.mkdtemp(prefix='evidence-out-'))
        self.addCleanup(lambda: subprocess.run(['rm', '-rf', str(output)], check=False))
        argv = [name + '.py', *arguments, '--output', str(output / 'out')]
        with unittest.mock.patch.object(sys, 'argv', argv):
            return refusal(module.main)

    def test_requalification_refuses(self):
        for kind in KINDS:
            with self.subTest(kind=kind):
                self.assertRefused('requalify-value-cost',
                                   self.evidence_script('requalify-value-cost', kind, ['--revision', 'HEAD', '--side', 'c']))

    def test_loss_ledger_refuses(self):
        for kind in KINDS:
            with self.subTest(kind=kind):
                self.assertRefused('value-cost-loss-ledger',
                                   self.evidence_script('value-cost-loss-ledger', kind, ['--b', 'b', '--c', 'c']))


if __name__ == '__main__':
    unittest.main()
