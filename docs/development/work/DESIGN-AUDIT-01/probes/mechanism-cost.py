#!/usr/bin/env python3
"""Cooperative-only ablations in disposable copies; not product fixes or conformance evidence."""
from pathlib import Path
import json,shutil,subprocess,tempfile,platform
P=Path(__file__).resolve().parents[1];R=P.parents[3]
B='66bc041175e6fc191c2e7cf88de198111e7d97c9'
assert not subprocess.check_output(['git','-C',str(R),'diff',B,'--','packages/kernel/src']).strip()
runner='''import {canonicalize} from './src/values.ts';
import {performance} from 'node:perf_hooks';
const value={b:[true,null,'text'],a:1}; const n=2000;
for(let i=0;i<100;i++) canonicalize(value);
const expected=JSON.stringify(canonicalize(value));
const times=[]; for(let r=0;r<5;r++){ const start=performance.now();for(let i=0;i<n;i++){if(JSON.stringify(canonicalize(value))!==expected)throw new Error('result drift');}times.push(performance.now()-start); }
console.log(JSON.stringify({n,repeats:5,times,expected}));
'''
results=[]
for variant in ['control','no-serializer-window','direct-internal-read','both']:
 with tempfile.TemporaryDirectory(prefix='design-audit-cost-') as d:
  t=Path(d);shutil.copytree(R/'packages/kernel/src',t/'src');(t/'node_modules').symlink_to(R/'node_modules');(t/'package.json').write_text('{"type":"module"}');(t/'run.mts').write_text(runner)
  if variant in ['no-serializer-window','both']:
   f=t/'src/values.ts';s=f.read_text();start=s.index('function withSerializerEnvironment<T>');end=s.index('\nfunction encode',start);s=s[:start]+'function withSerializerEnvironment<T>(work: () => T): T { return work(); }\n'+s[end:];f.write_text(s)
  if variant in ['direct-internal-read','both']:
   f=t/'src/own-array.ts';s=f.read_text();start=s.index('export const readAt =');end=s.index('\n};',start)+3;s=s[:start]+'export const readAt = <T>(list: readonly T[], index: number): T | undefined => list[index];'+s[end:];f.write_text(s)
  run=subprocess.run(['node','--experimental-strip-types','--no-warnings',str(t/'run.mts')],capture_output=True,text=True,timeout=90);assert run.returncode==0,run.stderr
  results.append({'variant':variant,'exit':run.returncode,'result':json.loads(run.stdout)})
assert len({r['result']['expected'] for r in results})==1
out={'base':B,'node':subprocess.check_output(['node','--version']).decode().strip(),'platform':platform.platform(),'scope':'one small cooperative value; sequential variants, timing only; output JSON equality checked, no hostile inputs or validity claim','results':results}
(P/'probes/mechanism-cost.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
