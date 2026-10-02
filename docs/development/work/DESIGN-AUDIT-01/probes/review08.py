#!/usr/bin/env python3
"""Re-execute pinned review-08 scripts; original files stay untouched.
Run from repo root: python3 docs/development/work/DESIGN-AUDIT-01/probes/review08.py
Requires Node >=22.9, canonicalize@3.0.0 and the pinned workspace TypeScript dependency.
N15 edits only the original runner's disposable copies. Slow impact runs time out explicitly.
"""
from pathlib import Path
import hashlib,json,os,platform,subprocess,sys,time
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[4]
BASE='66bc041175e6fc191c2e7cf88de198111e7d97c9'
R8=ROOT/'docs/development/work/K1.2-correction-01/review-08'
OUT=HERE/'review08-output';OUT.mkdir(exist_ok=True)
mode=sys.argv[1] if len(sys.argv)>1 else 'all'
assert not subprocess.check_output(['git','-C',str(ROOT),'diff',BASE,'--','packages/kernel','tsconfig.json',str(R8)])
node=['node','--expose-gc','--experimental-strip-types','--no-warnings']
results=[]
def run(label,args,timeout=60,env=None):
 t=time.monotonic(); data={'label':label,'args':[str(x).replace(str(ROOT),'<repo>') for x in args],'timeout_seconds':timeout}
 try:
  p=subprocess.run([str(x) for x in args],cwd=ROOT,env=os.environ|{'TREE':str(ROOT)}|(env or {}),capture_output=True,text=True,timeout=timeout)
  data|={'exit':p.returncode,'stdout':p.stdout,'stderr':p.stderr}
 except subprocess.TimeoutExpired as e:
  def dec(x):return x.decode() if isinstance(x,bytes) else x or ''
  data|={'exit':None,'timed_out':True,'stdout':dec(e.stdout),'stderr':dec(e.stderr)}
 data['elapsed_seconds']=round(time.monotonic()-t,3);results.append(data)
 (OUT/(label+'.json')).write_text(json.dumps(data,indent=2)+'\n'); print(label,data['exit'],data.get('timed_out',False),flush=True)
 return data
if mode in ['all','cost']:
 shapes=['A-zeros','A-empty-arrays','A-empty-arrays-deep','A-empty-objects-deep','A-members-null','A-chain-W0-L30','A-chain-W14-L16','A-chain-W22-L8','A-chain-W26-L4','A-chain-W28-L2','R-foreign','R-foreign-depth16','R-foreign-deep','R-foreign-arrays','R-undefined-deep','R-nan-deep','R-too-deep','R-cycle-deep','R-nonenumerable','R-accessor','R-undefined-members']
 for rep in range(1,4):
  for shape in shapes:run(f'cost-{rep}-{shape}',node+[R8/'cost-probe.mjs',shape])
 for roots in [1,8]:run(f'outcome-{roots}',node+[R8/'deep-outcome.ts',ROOT,roots],120)
if mode in ['all','enumeration']:
 for kind,n in [('u8',2**16),('u8',2**20),('u8',2**24),('u8',2**27),('string',2**16),('string',2**24),('string',2**28)]:
  run(f'ownkeys-{kind}-{n}',node+[R8/'p-exotic-ownkeys.mjs',kind,n],45)
if mode in ['all','n15']:
 run('n15-suite',node+[R8/'mutants.mjs','N15'],300,{'OUT':str(OUT/'n15-suite-results.json')})
 # Original impact probe at current main. For mutant impact make one disposable source copy.
 import tempfile,shutil
 with tempfile.TemporaryDirectory(prefix='da-n15-') as d:
  tmp=Path(d);shutil.copytree(ROOT/'packages/kernel',tmp/'packages/kernel')
  (tmp/'package.json').write_text((ROOT/'package.json').read_text());(tmp/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
  v=tmp/'packages/kernel/src/values.ts';s=v.read_text();old='containerStructureBytes(length, false) + (surplus > 0 ? surplus : 0) + symbolCount';new='containerStructureBytes(length, false) + symbolCount'
  assert s.count(old)==1;v.write_text(s.replace(old,new))
  for n in [4096,20000]:
   run(f'n15-control-{n}',node+[R8/'n15-probe.mjs',ROOT,n],45)
   r=run(f'n15-mutant-{n}',node+[R8/'n15-probe.mjs',tmp,n],30)
   # Temp pathname is provenance only; it is not a required retained input.
   r['mutation']={'file':'packages/kernel/src/values.ts','old':old,'new':new,'copies_only':True}
   (OUT/(r['label']+'.json')).write_text(json.dumps(r,indent=2)+'\n')
manifest={'base':BASE,'node':subprocess.check_output(['node','--version'],text=True).strip(),'platform':platform.platform(),'mode':mode,'sources':{str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(R8.iterdir()) if f.suffix in ['.mjs','.ts']},'runs':[r['label'] for r in results]}
(OUT/f'manifest-{mode}.json').write_text(json.dumps(manifest,indent=2)+'\n')
