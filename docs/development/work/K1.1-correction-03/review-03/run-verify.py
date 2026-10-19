import os,subprocess,pathlib,json,datetime,time
root=pathlib.Path('/Users/linzhenglin/Desktop/ArrokothAI/k11-review-03-C')
e=pathlib.Path('/Users/linzhenglin/Desktop/ArrokothAI/k11-review-03-source/docs/development/work/K1.1-correction-03/review-03')
env=os.environ.copy();env['PATH']='/Users/linzhenglin/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin:'+env['PATH']
def output(argv):return subprocess.check_output(argv,cwd=root,env=env,text=True).strip()
argv=['python3','-B','scripts/packet_tools.py','verify','--revision','2bf220e9e426c810f2505fa2d74d70197807e584','--spec','docs/development/work/K1.1-correction-03/verification.json']
record=dict(argv=argv,cwd=str(root),start_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),node=output(['node','--version']),npm=output(['npm','--version']),python=output(['python3','--version']),head=output(['git','rev-parse','HEAD']),clean_before=output(['git','status','--porcelain']),parallel_validation_jobs=0,process_inspection='Only persistent ChatGPT CUA Node services observed; no independent Node/Python/npm validation jobs. No other review tests are run concurrently.',dependency_install='npm ci --ignore-scripts --no-audit --no-fund (locked dependencies)')
assert record['node']=='v26.10.0';assert not record['clean_before']
t0=time.monotonic()
with (e/'verify.stdout.json').open('wb') as out,(e/'verify.stderr.log').open('wb') as err:
 p=subprocess.Popen(argv,cwd=root,env=env,stdout=out,stderr=err)
 record['pid']=p.pid;(e/'verify-run.json').write_text(json.dumps(record,indent=2)+'\n')
 keep=subprocess.Popen(['/usr/bin/caffeinate','-i','-w',str(p.pid)])
 print('Started',p.pid,record['start_utc'],record['node'],flush=True)
 while p.poll() is None:
  try:p.wait(timeout=50)
  except subprocess.TimeoutExpired:
   lines=(e/'verify.stderr.log').read_text(errors='replace').splitlines();print('elapsed_s',round(time.monotonic()-t0),'latest',lines[-1] if lines else '(no stderr yet)',flush=True)
 record.update(exit_code=p.returncode,elapsed_seconds=time.monotonic()-t0,end_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),clean_after=output(['git','status','--porcelain']))
 (e/'verify-run.json').write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps(record,indent=2),flush=True)
 keep.wait()
