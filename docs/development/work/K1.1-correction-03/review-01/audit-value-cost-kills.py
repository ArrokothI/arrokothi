#!/usr/bin/env python3
"""Rerun every submitted value-cost mutant directly, retaining leaf errors.

Independent of value-cost-probe.mjs's claimed selected-test assertion. Only a
temporary source copy is mutated. Run after required registry reruns with exact
Node v26.10.0 first in PATH. Raw events and stderr are retained in gzip JSONL.
"""
import collections
import gzip
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

tree = Path(sys.argv[1]).resolve()
here = Path(__file__).resolve().parent
registry = json.loads((tree / 'tests/fixtures/packet-tools/value-cost.json').read_text())
env = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
env['LANG'] = 'C.UTF-8'
records = []
started = time.monotonic()
with tempfile.TemporaryDirectory(prefix='kc3-review-kills-') as directory, gzip.open(here / 'value-cost-leaf-events.jsonl.gz', 'wt') as raw:
    root = Path(directory)
    shutil.copytree(tree / 'packages/kernel', root / 'packages/kernel')
    for name in ('package.json', 'tsconfig.json'):
        shutil.copyfile(tree / name, root / name)
    (root / 'node_modules').symlink_to(tree / 'node_modules', target_is_directory=True)
    shutil.copyfile(here / 'review-events.mjs', root / 'review-events.mjs')
    for case in registry['cases']:
        print('Direct leaf audit: ' + case['id'], flush=True)
        args = ['node', '--test', '--experimental-strip-types', '--no-warnings',
                '--test-reporter=./review-events.mjs', '--test-name-pattern=' + case['input']['pattern'], case['input']['file']]
        for mutant in [None, *case['mutants']]:
            originals = {}
            if mutant is not None:
                edits = mutant.get('edits', [mutant])
                planned = collections.defaultdict(list)
                for edit in edits:
                    path = root / edit['path']
                    original = originals.setdefault(path, path.read_text())
                    assert original.count(edit['before']) == 1, mutant['id']
                    begin = original.index(edit['before'])
                    planned[path].append((begin, begin + len(edit['before']), edit['after']))
                for path, replacements in planned.items():
                    changed = originals[path]
                    spans = sorted(replacements)
                    assert all(a[1] <= b[0] for a, b in zip(spans, spans[1:]))
                    for begin, end, replacement in reversed(spans): changed = changed[:begin] + replacement + changed[end:]
                    path.write_text(changed)
            row = {'case': case['id'], 'mutant': 'control' if mutant is None else mutant['id'],
                   'name': 'control' if mutant is None else mutant.get('name'), 'argv': args}
            begin = time.monotonic()
            try:
                run = subprocess.run(args, cwd=root, env=env, text=True, capture_output=True,
                                     timeout=case['input']['timeout_ms'] / 1000)
                row.update(exit=run.returncode, seconds=time.monotonic() - begin)
                events = [json.loads(line) for line in run.stdout.splitlines()]
                failed = [e for e in events if e['event'] == 'test:fail']
                passed = [e for e in events if e['event'] == 'test:pass' and not e.get('skip') and not e.get('todo')]
                row.update(passed=len(passed), failed=len(failed), failed_events=failed,
                           summary=[e['data'] for e in events if e['event'] == 'test:summary'])
                raw.write(json.dumps({'case': row['case'], 'mutant': row['mutant'],
                                      'stdout': run.stdout, 'stderr': run.stderr}) + '\n')
            except subprocess.TimeoutExpired:
                row.update(exit=None, timeout=True, seconds=time.monotonic() - begin)
            finally:
                for path, original in originals.items(): path.write_text(original)
            records.append(row)
            (here / 'value-cost-leaf-audit.json').write_text(json.dumps({'node': subprocess.check_output(['node', '--version'], text=True, env=env).strip(),
                'tree': str(tree), 'seconds': time.monotonic() - started, 'runs': records}, indent=2) + '\n')
print(json.dumps({'runs': len(records), 'controls': sum(r['mutant'] == 'control' for r in records),
                  'seconds': time.monotonic() - started}), flush=True)
