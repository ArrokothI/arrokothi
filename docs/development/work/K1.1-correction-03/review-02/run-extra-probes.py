#!/usr/bin/env python3
"""Follow-up evidence for defects discovered by run-review-probes.py; sequential."""
import datetime, json, os, subprocess, sys, time
from pathlib import Path

HERE=Path(__file__).resolve().parent
C=Path(sys.argv[1]).resolve(); B=Path(sys.argv[2]).resolve()
env={k:os.environ[k] for k in ('PATH','HOME','TMPDIR') if k in os.environ}; env['LANG']='C.UTF-8'
jobs=[
 ('stop-corpus',['python3','-B',str(HERE/'probe-stop-corpus.py')],600),
 ('c1-direct',['python3','-B',str(HERE/'probe-c1-group.py'),str(B)],300),
 ('attribution-controls',['python3','-B','-m','unittest','discover','-s','tests/tooling','-p','test_value_cost_probe.py','-v'],300),
]
records=[]
for name,argv,timeout in jobs:
    print('Running '+name,flush=True)
    row={'name':name,'argv':argv,'cwd':str(C),'start':datetime.datetime.now(datetime.UTC).isoformat(),
        'node':subprocess.check_output(['node','--version'],env=env,text=True).strip(),
        'clean_before':subprocess.check_output(['git','status','--porcelain'],cwd=C,text=True)}
    start=time.monotonic()
    with (HERE/(name+'.stdout.log')).open('w') as stdout,(HERE/(name+'.stderr.log')).open('w') as stderr:
        try:
            r=subprocess.run(argv,cwd=C,env=env,stdout=stdout,stderr=stderr,timeout=timeout)
            row['exit']=r.returncode
        except subprocess.TimeoutExpired:
            row.update(exit=None,timeout=timeout)
    row.update(seconds=time.monotonic()-start,end=datetime.datetime.now(datetime.UTC).isoformat(),
        clean_after=subprocess.check_output(['git','status','--porcelain'],cwd=C,text=True))
    records.append(row); (HERE/'extra-probes.json').write_text(json.dumps(records,indent=2)+'\n')
    print(json.dumps(row),flush=True)
