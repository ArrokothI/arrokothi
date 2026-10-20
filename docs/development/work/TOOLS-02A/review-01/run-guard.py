"""Run only the new guard control and its registered ablation; restore source in finally."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

repo = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
node_bin = sys.argv[3]
env = dict(os.environ, PATH=node_bin + os.pathsep + os.environ['PATH'])
case_id = 'guard.clean_payload.c88434fec112f9e4'
registry = json.loads((repo / 'tests/fixtures/packet-tools/refusal-guards.json').read_text())
case = next(c for c in registry['cases'] if c['id'] == case_id)
mutation = case['mutants'][0]
source = repo / mutation['path']
original = source.read_bytes()
text = original.decode()
assert text.count(mutation['before']) == 1
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo).decode().strip() == '504fa5fb23b681e2715fcba97b98bcb456e778ee'
assert not subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=all'], cwd=repo).strip()
results = []
try:
    for label, mutate in [('guard-control-node26', False), ('guard-ablation', True)]:
        if mutate:
            source.write_text(text.replace(mutation['before'], mutation['after'], 1))
        result = subprocess.run(case['argv'], cwd=repo, env=env, capture_output=True, text=True, timeout=case['timeout_seconds'])
        (out / (label + '.stdout.txt')).write_text(result.stdout)
        (out / (label + '.stderr.txt')).write_text(result.stderr)
        row = {'label': label, 'argv': case['argv'], 'exit': result.returncode, 'probe': json.loads(result.stdout)}
        results.append(row)
        expected = case['failure_exit'] if mutate else 0
        assert result.returncode == expected, row
        assert row['probe']['reached'] is True and row['probe']['tests'] == 1
        assert row['probe']['passed'] is (not mutate)
finally:
    source.write_bytes(original)
status = subprocess.check_output(['git', 'status', '--porcelain', '--untracked-files=all'], cwd=repo).decode()
assert not status.strip(), status
report = {'repository': str(repo), 'revision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo).decode().strip(), 'node': subprocess.check_output(['node','--version'],env=env).decode().strip(), 'python': sys.version, 'mutation': mutation, 'results': results, 'source_restored_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'final_git_status': status}
(out / 'guard-runs.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
