#!/usr/bin/env python3
"""Sequential required post-verify runs; no edits to the candidate tree."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time

tree = Path(sys.argv[1]).resolve()
out = Path(__file__).resolve().parent
C = 'ed23733e58bcb53a2f9a0aa5264f61f8334a7bfb'
environment = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
environment['LANG'] = 'C.UTF-8'
checks = [('capture-corpus', ['node', '--test', '--experimental-strip-types', '--no-warnings',
    *['packages/kernel/tests/' + p + '.test.ts' for p in
      ('capture-corpus', 'capture-refusals', 'capture-work', 'capture-metering',
       'value-refusal-cost', 'value-diagnostic-work', 'values')]], 1200)]
checks.append(('adoption-corpus', ['python3', '-B', 'scripts/packet_tools.py', 'corpus', '--revision', C,
    '--spec', 'tests/fixtures/packet-tools/adoption.json'], 1800))
for name in ('mutations', 'refusal-guards', 'value-cost'):
    checks.append((name, ['python3', '-B', 'scripts/packet_tools.py', 'mutations', '--revision', C,
        '--spec', f'tests/fixtures/packet-tools/{name}.json'], 3600))
records = []
for name, argv, timeout in checks:
    record = {'name': name, 'argv': argv, 'cwd': str(tree), 'start': datetime.datetime.now(datetime.UTC).isoformat(),
              'node': subprocess.check_output(['node', '--version'], env=environment, text=True).strip(),
              'clean_before': subprocess.check_output(['git', 'status', '--porcelain'], cwd=tree, text=True)}
    print('Running ' + name, flush=True)
    started = time.monotonic()
    with (out / (name + '.stdout.log')).open('w') as stdout, (out / (name + '.stderr.log')).open('w') as stderr:
        try:
            run = subprocess.run(argv, cwd=tree, env=environment, stdout=stdout, stderr=stderr, timeout=timeout)
            record['exit'] = run.returncode
        except subprocess.TimeoutExpired:
            record['exit'] = None
            record['timeout'] = timeout
    record.update(seconds=time.monotonic() - started, end=datetime.datetime.now(datetime.UTC).isoformat(),
        clean_after=subprocess.check_output(['git', 'status', '--porcelain'], cwd=tree, text=True))
    records.append(record)
    (out / 'required-followups.json').write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps(record), flush=True)
