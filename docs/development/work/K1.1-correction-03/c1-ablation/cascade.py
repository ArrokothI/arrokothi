#!/usr/bin/env python3
"""Re-run each (file, leaf, mutant) B kill alone: does the leaf fail under the mutant with no other test before it?

    python3 -B cascade.py <checkout> <mutants.json> <pairs.json> <out.jsonl>
"""
import json, os, re, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
checkout, mutants, pairs, out_path = Path(sys.argv[1]), json.load(open(sys.argv[2])), json.load(open(sys.argv[3])), sys.argv[4]
mutants = {m['id']: m for m in mutants}
env = {k: v for k, v in os.environ.items() if k not in ('NODE_OPTIONS', 'NODE_TEST_CONTEXT')}
by_mutant = {}
for p in pairs:
    by_mutant.setdefault(p['mutant'], []).append(p)
with open(out_path, 'a') as out:
    for mid, items in by_mutant.items():
        edit = mutants[mid]['at_b']
        target = checkout / edit['path']
        original = target.read_bytes()
        text = original.decode()
        assert text.count(edit['before']) == 1, mid
        target.write_bytes(text.replace(edit['before'], edit['after'], 1).encode())
        try:
            for p in items:
                pattern = '^' + re.escape(p['leaf']) + '$'
                try:
                    proc = subprocess.run(['node', '--test', '--experimental-strip-types', '--no-warnings',
                                           f'--test-reporter={HERE / "leaf-reporter.mjs"}', '--test-reporter-destination=stdout',
                                           f'--test-name-pattern={pattern}', 'packages/kernel/tests/' + p['file']],
                                          cwd=checkout, capture_output=True, text=True, timeout=600, env=env)
                    rows = [json.loads(l) for l in proc.stdout.splitlines() if l.startswith('{')]
                    verdicts = [r['verdict'] for r in rows if r['path'][-1] == p['leaf']]
                    status = 'finished'
                except subprocess.TimeoutExpired:
                    verdicts, status = [], 'timeout'
                out.write(json.dumps(dict(p, status=status, alone=verdicts)) + '\n')
                out.flush()
        finally:
            target.write_bytes(original)
        assert target.read_bytes() == original
print('done', file=sys.stderr)
