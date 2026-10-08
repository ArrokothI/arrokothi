"""Check a supplied scratch target's V-ENV credit through the actual full corpus.

Usage: python3 -B probe_hold_credit.py /absolute/path/to/subject FULL_REVISION
Existing installed dependencies are required; nothing is fetched or installed.
The only adoption edit and commit occur in a temporary clone, which is removed afterwards.
Exit 1 means the held-behavior target received suite credit. Other errors are setup failures.
"""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

started = time.monotonic()
source = Path(sys.argv[1]).resolve()
revision = sys.argv[2]
proposal = json.loads(Path(__file__).with_name('proposed-target.json').read_text())

with tempfile.TemporaryDirectory(prefix='tools-01-hold-credit-') as directory:
    root = Path(directory) / 'repo'

    def git(*args):
        return subprocess.check_output(['git', '-C', str(root), '-c', 'user.name=Tool fixture',
                                       '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false',
                                       '-c', 'core.hooksPath=/dev/null', *args], stderr=subprocess.PIPE).decode().strip()

    subprocess.run(['git', 'clone', '--shared', '--no-checkout', str(source), str(root)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    git('checkout', '--detach', revision)
    assert git('rev-parse', 'HEAD') == revision, 'a full source revision is required'
    modules = root / 'node_modules'
    modules.mkdir()
    for path in (source / 'node_modules').iterdir():
        if path.name == '@arrokothi':
            continue
        if path.name in ('typescript', 'canonicalize'):
            shutil.copytree(path, modules / path.name)
        else:
            (modules / path.name).symlink_to(path.resolve(), target_is_directory=path.is_dir())
    (modules / '@arrokothi').mkdir()
    for path in (source / 'node_modules/@arrokothi').iterdir():
        (modules / '@arrokothi' / path.name).symlink_to(root / path.resolve().relative_to(source), target_is_directory=True)

    adoption = root / 'tests/fixtures/packet-tools/adoption.json'
    manifest = json.loads(adoption.read_text())
    manifest['counterexamples'] = [proposal['counterexample']]
    manifest['suite_targets'] = [proposal['target']]
    adoption.write_text(json.dumps(manifest, indent=2) + '\n')
    git('add', 'tests/fixtures/packet-tools/adoption.json')
    git('commit', '-qm', 'Temporary proposed-target diagnostic; no adoption')
    fixture = git('rev-parse', 'HEAD')
    spec = importlib.util.spec_from_file_location('packet_tools', root / 'scripts/packet_tools.py')
    tool = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(tool)
    result = tool.corpus(tool.Git(root), fixture, 'tests/fixtures/packet-tools/adoption.json')
    target, = result['targets']['results']
    declaration = proposal['target']['declaration']
    key = f"{proposal['target']['file']}:{declaration['line']}:{declaration['column']}"
    record = {'subject': revision, 'fixture': fixture, 'fixture_tree': git('rev-parse', 'HEAD^{tree}'),
              'proposal': proposal, 'register_key': key,
              'stored_register_entry': next((row for row in manifest['holds']['register']['entries'] if row['key'] == key), None),
              'member_status': next(row['status'] for row in manifest['preserved'] if row['member'] == proposal['target']['member']),
              'corpus_result': result['result'], 'states': result['states'], 'register': result['register'],
              'suite_credit': result['suite_credit'], 'target_result': target,
              'elapsed_seconds': round(time.monotonic() - started, 3),
              'acceptance': 'not evaluated'}
    print(json.dumps(record, indent=2))
    credited = bool(target.get('credit')) and not target['refused']
sys.exit(1 if credited else 0)
