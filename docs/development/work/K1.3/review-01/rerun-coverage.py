"""Reproduce owner-choice-02 at H, keeping the exact exclusion set."""
import os,subprocess,sys,json
from pathlib import Path
repo=Path(sys.argv[1]); out=Path(sys.argv[2]) if len(sys.argv)>2 else Path('/private/tmp/k13-review-01-evidence')
out.mkdir(parents=True,exist_ok=True)
all_files=sorted((repo/'packages/kernel/tests').glob('*.test.ts'))
excluded={'race-search.test.ts','poison-catalog.test.ts','fault-sweep.test.ts'}
for group,files in [('race',[repo/'packages/kernel/tests/race-search.test.ts']),('scenarios',[p for p in all_files if p.name not in excluded])]:
 env=dict(os.environ,NODE_V8_COVERAGE=str(out/('coverage-'+group)))
 with open(out/('coverage-'+group+'.log'),'w') as f:
  r=subprocess.run(['node','--experimental-strip-types','--no-warnings','--test',*map(str,files)],cwd=repo,env=env,stdout=f,stderr=subprocess.STDOUT)
 print(json.dumps({'group':group,'files':len(files),'exit':r.returncode}),flush=True)
 if r.returncode:sys.exit(r.returncode)
for a,b in [('race','scenarios'),('scenarios','race')]:
 subprocess.run(['python3','-B',str(repo/'docs/development/work/K1.3/owner-choice-02/coverage-compare.py'),str(out/('coverage-'+a)),str(out/('coverage-'+b)),str(repo/'packages/kernel/src')],check=True)
