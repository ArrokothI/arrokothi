#!/usr/bin/env python3
"""Independent probes and record checks, sequentially after required reruns."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time

here = Path(__file__).resolve().parent
C = Path(sys.argv[1]).resolve()
B = Path(sys.argv[2]).resolve()
H = here.parents[4]
env = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
env['LANG'] = 'C.UTF-8'
checks = [
    ('stop-boundary', ['node', '--experimental-strip-types', '--no-warnings', str(here / 'probe-stop-boundary.mjs'), str(C)], C, 1200),
    ('evidence-attribution', ['python3', '-B', str(here / 'probe-evidence-attribution.py'), str(C)], C, 300),
    ('dimensions', ['node', '--experimental-strip-types', '--no-warnings', str(here / 'search-dimensions.mjs'), str(C), str(B)], C, 1800),
    ('record-audit', ['python3', '-B', str(here / 'audit-records.py'), str(C)], C, 180),
    ('candidate', ['python3', '-B', 'scripts/packet_tools.py', 'candidate', '--payload',
       'ed23733e58bcb53a2f9a0aa5264f61f8334a7bfb', '--head', '5f586b176089987fa3667e4c03f26b3dac0a5bfb',
       '--spec', 'docs/development/work/K1.1-correction-03/verification.json'], C, 180),
    *[(f'builder-docs-{label}', ['npm', 'run', 'check:builder-docs'], tree, 180) for label, tree in [('B', B), ('C', C), ('H', H)]],
    ('value-cost-leaves', ['python3', '-B', str(here / 'audit-value-cost-kills.py'), str(C)], C, 3600),
]
records = []
for name, argv, cwd, timeout in checks:
    print('Running ' + name, flush=True)
    row = {'name': name, 'argv': argv, 'cwd': str(cwd), 'start': datetime.datetime.now(datetime.UTC).isoformat(),
           'node': subprocess.check_output(['node', '--version'], text=True, env=env).strip()}
    begin = time.monotonic()
    with (here / (name + '.stdout.log')).open('w') as stdout, (here / (name + '.stderr.log')).open('w') as stderr:
        try:
            run = subprocess.run(argv, cwd=cwd, env=env, stdout=stdout, stderr=stderr, timeout=timeout)
            row['exit'] = run.returncode
        except subprocess.TimeoutExpired:
            row.update(exit=None, timeout=timeout)
    row.update(seconds=time.monotonic() - begin, end=datetime.datetime.now(datetime.UTC).isoformat())
    records.append(row)
    (here / 'independent-checks.json').write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps(row), flush=True)
