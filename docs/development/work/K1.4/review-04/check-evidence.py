"""Review 04 identity, preservation and downloaded-CI checks. Does not run CI.

Usage: python3 -B .../review-04/check-evidence.py /path/to/unpacked/artifact
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

B = '608f9ece44dbe42b78974bdac9e7ddcd33697705'
C = '697922e251a572d0c96f7a02c1b646b607c351fc'
H = '1b98a76e625ef187ba179fdad2e823ac4dabd521'
PREVIOUS = 'b1769c0fcdb73bfc6297551b87f80e74bc6cb588'
SOURCE_BASE = '3e8b4bac60266fda3e277ae0dd381c4936e15ff3'
SPEC = 'docs/development/work/K1.4/verification.json'

def git(*args):
    return subprocess.check_output(['git', *args])

def changed(a, b):
    return git('diff', '--name-only', a, b).decode().splitlines()

def show(rev, path):
    return git('show', f'{rev}:{path}')

spec = json.loads(show(C, SPEC))
administrative = changed(C, H)
assert sorted(administrative) == sorted(spec['administrative_files'])
assert show(C, SPEC) == show(H, SPEC)
for ancestor in [B, C, PREVIOUS, SOURCE_BASE]:
    subprocess.run(['git', 'merge-base', '--is-ancestor', ancestor, H], check=True)

src_paths = sorted(set(git('ls-tree', '-r', '--name-only', SOURCE_BASE).decode().splitlines()) |
                   set(git('ls-tree', '-r', '--name-only', H).decode().splitlines()))
src_paths = [p for p in src_paths if '/src/' in p or p.startswith('src/')]
source_changes = [p for p in changed(SOURCE_BASE, H) if p in src_paths]
assert source_changes == []
for prefix in ['packages/kernel/src/', 'packages/core/src/']:
    assert not any(p.startswith(prefix) for p in changed(B, H))

history = {}
for name in ['design-03.md', 'design-04.md', 'implementation-02.md', 'implementation-03.md']:
    path = 'docs/development/work/K1.4/' + name
    old = show(PREVIOUS, path).decode().splitlines(keepends=True)
    new = show(H, path).decode().splitlines(keepends=True)
    remaining = iter(new)
    assert all(any(candidate == line for candidate in remaining) for line in old)
    diff = git('diff', '--unified=0', PREVIOUS, H, '--', path).decode().splitlines()
    assert not any(line.startswith('-') and not line.startswith('---') for line in diff)
    history[name] = {'old_lines_preserved_in_order': True,
                     'dated_corrections': sum('Correction, 2026-11-11' in x for x in new)}
assert show(H, 'docs/development/work/K1.4/design-02.md') == show(
    '138937918ed0a0f2677bd5588eedafba6c51750c', 'docs/development/work/K1.4/design-02.md')
registries = ['tests/fixtures/packet-tools/' + x for x in ['mutations.json', 'refusal-guards.json', 'value-cost.json']]
for path in registries:
    assert show(B, path) == show(H, path)

artifact = Path(sys.argv[1])
summary = json.loads((artifact / 'summary.json').read_text())
verify = json.loads((artifact / 'verify.json').read_text())
run = dict(line.split('=', 1) for line in (artifact / 'run.txt').read_text().splitlines())
assert run['revision'] == run['head'] == verify['revision'] == C
assert summary['result'] == verify['result'] == 'checks_passed'
assert len(summary['checks']) == sum(c['passed'] is True for c in summary['checks']) == 19
assert all(c['passed'] is True for c in verify['checks'])
mutations = {c['id']: c['result']['counts'] for c in verify['checks'] if 'mutant' in c['id']}
print(json.dumps({
    'base': B, 'payload': C, 'candidate': H, 'previous_review_head': PREVIOUS,
    'administrative_files_exact': administrative,
    'production_src_files_compared': len(src_paths), 'source_base': SOURCE_BASE,
    'source_changes': source_changes, 'kernel_and_core_unchanged_from_B': True,
    'historical_records': history, 'design_02_preserved': True,
    'registries_unchanged_from_B': registries,
    'delta_files': changed(PREVIOUS, H),
    'ci': {'checks': len(summary['checks']), 'passed_true': sum(c['passed'] is True for c in summary['checks']),
           'run': run, 'mutations': mutations,
           'sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(artifact.iterdir()) if p.is_file()}},
}, indent=2))
