#!/usr/bin/env python3
"""Sequential review evidence, invoked only after the required follow-up runs finish."""
import datetime, json, os, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
C = Path(sys.argv[1]).resolve()
B = Path(sys.argv[2]).resolve()
env = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
env['LANG'] = 'C.UTF-8'
node = ['node', '--experimental-strip-types', '--no-warnings']
prior = C / 'docs/development/work/K1.1-correction-03/review-01'
jobs = [
    ('original-stop', node + [str(prior/'probe-stop-boundary.mjs'), str(C)], C, 300),
    ('stop-boundary', node + [str(HERE/'rerun-stop-boundary.mjs'), str(C), '--require-contract'], C, 300),
    ('original-declared-limit', node + [str(prior/'probe-declared-limit.mjs'), str(C)], C, 60),
    ('declared-limit', node + [str(HERE/'rerun-declared-limit.mjs'), str(C)], C, 60),
    ('old-attribution', ['python3', '-B', str(HERE/'rerun-evidence-attribution.py'), str(C)], C, 300),
    ('dimensions', node + [str(prior/'search-dimensions.mjs'), str(C), str(B)], C, 1200),
    ('attribution-02', ['python3', '-B', str(HERE/'probe-attribution-02.py')], C, 300),
    ('continuations', ['python3', '-B', str(HERE/'probe-continuations.py')], C, 1200),
    ('stop-guard', ['python3', '-B', str(HERE/'probe-stop-guard.py')], C, 600),
    ('stop-forms', ['python3', '-B', str(HERE/'probe-stop-forms.py')], C, 1200),
    ('c1-requalification', ['python3', '-B', 'docs/development/work/K1.1-correction-03/c1-requalification-02/requalify.py', str(B)], C, 1800),
    ('builder-docs-C', ['npm', 'run', 'check:builder-docs'], C, 120),
    ('builder-docs-B', ['npm', 'run', 'check:builder-docs'], B, 120),
]
records = []
for name, argv, cwd, timeout in jobs:
    print('Running ' + name, flush=True)
    record = {'name': name, 'argv': argv, 'cwd': str(cwd), 'start': datetime.datetime.now(datetime.UTC).isoformat(),
        'node': subprocess.check_output(['node','--version'],env=env,text=True).strip(),
        'clean_before': subprocess.check_output(['git','status','--porcelain'],cwd=cwd,text=True)}
    start = time.monotonic()
    with (HERE/(name+'.stdout.log')).open('w') as stdout, (HERE/(name+'.stderr.log')).open('w') as stderr:
        try:
            run = subprocess.run(argv,cwd=cwd,env=env,stdout=stdout,stderr=stderr,timeout=timeout)
            record['exit'] = run.returncode
        except subprocess.TimeoutExpired:
            record['exit'] = None
            record['timeout'] = timeout
    record.update(seconds=time.monotonic()-start,end=datetime.datetime.now(datetime.UTC).isoformat(),
        clean_after=subprocess.check_output(['git','status','--porcelain'],cwd=cwd,text=True))
    records.append(record)
    (HERE/'review-probes.json').write_text(json.dumps(records,indent=2)+'\n')
    print(json.dumps(record),flush=True)
