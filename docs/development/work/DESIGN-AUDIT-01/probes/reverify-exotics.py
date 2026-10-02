#!/usr/bin/env python3
"""Run review-08's exact exotic values against the audit base; relocate only its import.

From the repository root, with canonicalize@3.0.0 installed:
  python3 docs/development/work/DESIGN-AUDIT-01/probes/reverify-exotics.py
No product or historical probe file is written. The temporary driver is removed.
"""
import hashlib
import json
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[5]
BASE = '66bc041175e6fc191c2e7cf88de198111e7d97c9'
PROBE = 'docs/development/work/K1.2-correction-01/review-08/p-reprototyped-exotics.ts'
SOURCE = 'packages/kernel/src/values.ts'

def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

# Guard both the historical input and all source modules imported by it.
assert not git('diff', BASE, '--', 'packages/kernel/src', PROBE)
for name in git('ls-tree', '-r', '--name-only', BASE, 'packages/kernel/src').decode().splitlines():
    assert (ROOT / name).read_bytes() == git('show', f'{BASE}:{name}'), name
original = git('show', f'{BASE}:{PROBE}')
assert (ROOT / PROBE).read_bytes() == original
text = original.decode()
old_import = '"./packages/kernel/src/values.ts"'
assert text.count(old_import) == 1
relocated = text.replace(old_import, json.dumps((ROOT / SOURCE).as_uri()))
dependency = json.loads((ROOT / 'node_modules/canonicalize/package.json').read_text())
assert dependency['version'] == '3.0.0'
with tempfile.TemporaryDirectory(prefix='design-audit-exotics-') as tmp:
    runner = pathlib.Path(tmp) / 'probe.mts'
    runner.write_text(relocated)
    command = ['node', '--experimental-strip-types', '--no-warnings', str(runner)]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=30)
    print(json.dumps({
        'base': BASE,
        'node': subprocess.check_output(['node', '--version'], text=True).strip(),
        'dependency': 'canonicalize@' + dependency['version'],
        'original_probe': PROBE,
        'original_probe_sha256': digest(original),
        'values_sha256': digest((ROOT / SOURCE).read_bytes()),
        'adaptation': 'import relocation only; original cases and output unchanged',
        'command': 'node --experimental-strip-types --no-warnings <temporary probe.mts>',
        'exit': result.returncode,
    }, indent=2))
    print(result.stdout, end='')
    if result.stderr:
        print(result.stderr, end='')
    raise SystemExit(result.returncode)
