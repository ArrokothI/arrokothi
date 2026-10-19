#!/usr/bin/env python3
"""C1 kill matrix: every mutant against every leaf test of the given files, in one checkout.

    python3 -B matrix.py <checkout> <side: b|c> <mutants.json> <out.jsonl> <file>...

<mutants.json> is a list of {id, at_b, at_c}, each side one edit {path, before, after} or a list of edits to one
file, applied together. The side picks the edit.
For the control and for each mutant, each file runs in its own `node --test` process with the leaf reporter;
the mutated file is restored after every mutant (and checked byte-identical). Output: one JSON line per
(mutant or 'control', file) with every leaf's verdict, plus run status. Never touches anything but
<checkout>.
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
checkout, side, mutants_path, out_path, files = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), sys.argv[5:]
mutants = json.loads(mutants_path.read_text())
env = dict(os.environ)
env.pop('NODE_OPTIONS', None)
env.pop('NODE_TEST_CONTEXT', None)


def run_file(name):
    started = time.monotonic()
    try:
        proc = subprocess.run(['node', '--test', '--experimental-strip-types', '--no-warnings',
                               f'--test-reporter={HERE / "leaf-reporter.mjs"}', '--test-reporter-destination=stdout', name],
                              cwd=checkout, capture_output=True, text=True, timeout=900, env=env)
        status, exit_code, stdout, stderr = 'finished', proc.returncode, proc.stdout, proc.stderr
    except subprocess.TimeoutExpired as error:
        status, exit_code, stdout, stderr = 'timeout', None, (error.stdout or b'').decode() if isinstance(error.stdout, bytes) else (error.stdout or ''), ''
    leaves = {}
    for line in stdout.splitlines():
        try:
            row = json.loads(line)
        except ValueError:
            continue
        leaves[' > '.join(row['path'])] = row['verdict']
    return {'status': status, 'exit': exit_code, 'seconds': round(time.monotonic() - started, 1), 'leaves': leaves,
            'stderr_tail': stderr[-400:] if status != 'finished' or exit_code not in (0, 1) else ''}


with out_path.open('a') as out:
    for name in files:
        out.write(json.dumps({'mutant': 'control', 'file': name, **run_file(name)}) + '\n')
        out.flush()
    for mutant in mutants:
        edits = mutant['at_b'] if side == 'b' else mutant.get('at_c')
        edits = edits if isinstance(edits, list) else [edits]
        target = checkout / edits[0]['path']
        assert all(e['path'] == edits[0]['path'] for e in edits)
        original = target.read_bytes()
        text = original.decode()
        bad = [e['before'][:40] for e in edits if text.count(e['before']) != 1]
        if bad:
            out.write(json.dumps({'mutant': mutant['id'], 'skipped': f"anchor not unique: {bad}"}) + '\n')
            continue
        for e in edits:
            text = text.replace(e['before'], e['after'], 1)
        target.write_bytes(text.encode())
        try:
            for name in files:
                out.write(json.dumps({'mutant': mutant['id'], 'file': name, **run_file(name)}) + '\n')
                out.flush()
        finally:
            target.write_bytes(original)
        assert target.read_bytes() == original
print('done', file=sys.stderr)
