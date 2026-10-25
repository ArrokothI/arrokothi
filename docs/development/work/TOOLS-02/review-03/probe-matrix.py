"""Bounded supplementary API/argument search; no candidate files are changed."""
import json,os,subprocess,sys,tempfile
from pathlib import Path
candidate=Path(sys.argv[1]).resolve();sys.path.insert(0,str(candidate/'tests/tooling'))
from test_packet_tools import RepositoryFixture,tool
r=RepositoryFixture(methodName='setUp');r.setUp()
try:
 r.write('tests/fixtures/file.txt','data\n');rev=r.commit('file')
 source="""import fs from 'node:fs'; import { pathToFileURL } from 'node:url';
const p='tests/fixtures/file.txt';
for(const arg of [p,Buffer.from(p),pathToFileURL(process.cwd()+'/'+p)]) {
 fs.readFileSync(arg); await fs.promises.readFile(arg); await new Promise((ok,no)=>fs.readFile(arg,e=>e?no(e):ok()));
 const fd=fs.openSync(arg);fs.closeSync(fd); const h=await fs.promises.open(arg);await h.close();
 for await(const chunk of fs.createReadStream(arg)) void chunk;
 const b=await fs.openAsBlob(arg);await b.text();
 fs.statSync(arg);fs.lstatSync(arg);fs.statfsSync(arg);fs.existsSync(arg);fs.accessSync(arg);fs.realpathSync(arg);fs.realpathSync.native(arg);
}
fs.readdirSync('tests/fixtures');await fs.promises.readdir('tests/fixtures',{recursive:true,withFileTypes:true});
const dir=fs.opendirSync('tests/fixtures',{recursive:true});while(dir.readSync());dir.closeSync();
"""
 with tempfile.TemporaryDirectory() as d:
  trace=Path(d)/'trace.jsonl'
  run=subprocess.run(['node','--input-type=module','-e',source],cwd=r.root,capture_output=True,text=True,env=dict(os.environ,NODE_OPTIONS='--import='+str(candidate/tool.READ_TRACE),ARROKOTHI_READ_TRACE=str(trace)),check=True)
  rows=[json.loads(line) for line in trace.read_text().splitlines() if json.loads(line)['operation']!='preload']
 outcomes=[(row['operation'],tool.admit(r.reader,rev,r.root.resolve(),row,set())) for row in rows]
 assert not any(outcome[0]=='refused' for _,outcome in outcomes),outcomes
 print(json.dumps({'revision':rev,'node':subprocess.check_output(['node','--version'],text=True).strip(),'argument_forms':['string','Buffer (ASCII)','file URL'],'operations':sorted({op for op,_ in outcomes}),'rows':len(rows),'refused':0,'outcomes':sorted({tuple(o) for _,o in outcomes})},indent=2))
finally:r.doCleanups()
