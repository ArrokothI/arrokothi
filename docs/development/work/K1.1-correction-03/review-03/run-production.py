import os,sys,json,time,datetime,subprocess,pathlib
E=pathlib.Path(__file__).resolve().parent
C=pathlib.Path(sys.argv[1]).resolve(); B=pathlib.Path(sys.argv[2]).resolve()
env={k:os.environ[k] for k in ('PATH','HOME','TMPDIR') if k in os.environ};env['LANG']='C.UTF-8'
assert subprocess.check_output(['node','--version'],env=env,text=True).strip()=='v26.10.0'
jobs=[('candidate-identity',['python3','-B','scripts/packet_tools.py','candidate','--payload','2bf220e9e426c810f2505fa2d74d70197807e584','--head','4b121d7ba665182b22857f049c05f019f25d0c65','--spec','docs/development/work/K1.1-correction-03/verification.json']),('production-probes',['node','--no-warnings','--experimental-strip-types',str(E/'production-probes.mjs'),str(C),str(B)]),('historical-stop-boundary',['node','--no-warnings','--experimental-strip-types',str(E/'rerun-stop-boundary.mjs'),str(C),'--require-contract']),('historical-declared-limit',['node','--no-warnings','--experimental-strip-types',str(E/'rerun-declared-limit.mjs'),str(C)]),('historical-dimensions',['node','--no-warnings','--experimental-strip-types',str(E/'search-dimensions.mjs'),str(C),str(B)]),('historical-continuations',['python3','-B',str(E/'probe-continuations.py')])]
rows=[]
for name,argv in jobs:
 row={'name':name,'argv':argv,'cwd':str(C),'start_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'node':'v26.10.0','clean_before':subprocess.check_output(['git','status','--porcelain'],cwd=C,text=True)}
 assert not row['clean_before']; start=time.monotonic();print('Running '+name,flush=True)
 with (E/(name+'.stdout.json')).open('wb') as out,(E/(name+'.stderr.log')).open('wb') as err:
  child=subprocess.Popen(argv,cwd=C,env=env,stdout=out,stderr=err)
  while child.poll() is None:
   try:child.wait(timeout=50)
   except subprocess.TimeoutExpired:print(name+' elapsed_s '+str(round(time.monotonic()-start)),flush=True)
 row.update(exit=child.returncode,seconds=time.monotonic()-start,end_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),clean_after=subprocess.check_output(['git','status','--porcelain'],cwd=C,text=True));rows.append(row);(E/'production-runs.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(row),flush=True)
