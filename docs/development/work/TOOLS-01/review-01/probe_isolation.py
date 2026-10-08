#!/usr/bin/env python3
"""Review-only failure/timeout/SIGINT probes; all source fixtures are temporary."""
import sys, json, subprocess, tempfile, time, signal, hashlib
from pathlib import Path
ROOT=Path(sys.argv[1]).resolve()
sys.path.insert(0,str(ROOT/'tests/tooling'))
from test_packet_tools import tool
start=time.monotonic()
env=tool.child_environment(tool.environment_declaration(None))[0]
rows=[]
with tempfile.TemporaryDirectory(prefix='tools01-review-isolation-') as tmp:
 d=Path(tmp); original=d/'original.mjs'
 original.write_text("import fs from 'node:fs';\nconst value = 'original';\nfs.writeFileSync(process.argv[2], JSON.stringify({cwd:process.cwd(), value}));\nif (process.argv[3] === 'fail') process.exit(7);\nsetInterval(() => {}, 1000);\n")
 before=hashlib.sha256(original.read_bytes()).hexdigest()
 for mode in ('fail','timeout','interrupt'):
  marker=d/(mode+'.json')
  case={'argv':['node','fixture.mjs',str(marker),'fail' if mode=='fail' else 'wait'],
        'timeout_seconds':0.3 if mode=='timeout' else 30,'output_limit_bytes':4096}
  mutation={'path':'fixture.mjs','before':"'original'",'after':"'mutated'"}
  if mode!='interrupt':
   result=tool.run_case({'fixture.mjs':original.read_bytes()},case,env,mutation)
   assert result['status']==('finished' if mode=='fail' else 'timeout')
   if mode=='fail': assert result['exit']==7
  else:
   request=d/'request.json';request.write_text(json.dumps({'case':case,'mutant':mutation,'source':str(original)}))
   driver="import sys,json;from pathlib import Path;sys.path.insert(0,sys.argv[1]);from test_packet_tools import tool;r=json.load(open(sys.argv[2]));tool.run_case({'fixture.mjs':Path(r['source']).read_bytes()},r['case'],tool.child_environment(tool.environment_declaration(None))[0],r['mutant'])"
   p=subprocess.Popen([sys.executable,'-B','-c',driver,str(ROOT/'tests/tooling'),str(request)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   deadline=time.monotonic()+10
   while not marker.exists() and time.monotonic()<deadline:
    assert p.poll() is None
    time.sleep(.02)
   assert marker.exists(),'child did not start'
   p.send_signal(signal.SIGINT);stdout,stderr=p.communicate(timeout=10)
   assert p.returncode!=0 and b'KeyboardInterrupt' in stderr
   result={'status':'interrupted','exit':p.returncode,'exception':'KeyboardInterrupt'}
  observed=json.loads(marker.read_text())
  assert observed['value']=='mutated'
  assert Path(observed['cwd']).resolve()!=d.resolve()
  assert not Path(observed['cwd']).exists()
  after=hashlib.sha256(original.read_bytes()).hexdigest();assert before==after
  rows.append({'mode':mode,'run':result,'mutated_copy_observed':True,'copy_removed':True,'source_sha256_before':before,'source_sha256_after':after})
print(json.dumps({'rows':rows,'seconds':time.monotonic()-start},indent=2))
