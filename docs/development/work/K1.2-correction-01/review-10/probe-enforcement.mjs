import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';
const root=process.cwd(), out=path.join(root,'docs/development/work/K1.2-correction-01/review-10');
const source=fs.readFileSync('packages/kernel/tests/ambient-reads.test.ts','utf8');
const start=source.indexOf('const OPTIONS:'); const end=source.indexOf('const zoneFiles');
const compiled=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.CommonJS}}).outputText;
const scan=new Function('ts','basename',compiled+'\nreturn scan;')(ts,path.basename);
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'k12-review10-scanner-'));
const syntax=path.join(scratch,'forms.ts');
fs.writeFileSync(syntax,`interface E { resultingEpoch?: number }
export function f(e:E){
const plain=e.resultingEpoch;
const bracket=e["resultingEpoch"];
const { resultingEpoch: binding }=e;
const { "resultingEpoch": quoted }=e;
const { ["resultingEpoch"]: computed }=e;
let assigned: number | undefined;
({resultingEpoch: assigned}=e);
return [plain,bracket,binding,quoted,computed,assigned];
}\n`);
const got=scan([syntax]).accesses.map(({text,kind,line})=>({text,kind,line}));
console.log('SCANNER',JSON.stringify(got));
assert.equal(got.length,3,'six equivalent optional reads, only three inventoried');
fs.rmSync(scratch,{recursive:true,force:true});
const runs=[];
for(const [name,find,replacement] of [
 ['early-mint','const receipt = mintReceipt("dispatch_intent", position, record.executionId);','const receipt = this.#mint("dispatch_intent", record);'],
 ['early-increment','const position = record.nextAcceptancePosition;\n    const receipt = mintReceipt("dispatch_intent", position, record.executionId);','const position = record.nextAcceptancePosition++;\n    const receipt = mintReceipt("dispatch_intent", position, record.executionId);']
]) {
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'k12-review10-mutant-'));
 try{
 fs.cpSync(path.join(root,'packages/kernel'),path.join(work,'packages/kernel'),{recursive:true});
 fs.copyFileSync(path.join(root,'package.json'),path.join(work,'package.json'));
 fs.symlinkSync(path.join(root,'node_modules'),path.join(work,'node_modules'),'dir');
 const file=path.join(work,'packages/kernel/src/coordinator.ts'); const text=fs.readFileSync(file,'utf8');
 assert.equal(text.split(find).length,2);fs.writeFileSync(file,text.replace(find,replacement));
 const tests=fs.readdirSync(path.join(work,'packages/kernel/tests')).filter(x=>x.endsWith('.test.ts')).sort().map(x=>'packages/kernel/tests/'+x);
 const args=['--experimental-strip-types','--test','--test-reporter=spec',...tests];
 const run=spawnSync(process.execPath,args,{cwd:work,encoding:'utf8',timeout:120000,maxBuffer:64*1024*1024});
 const log=(run.stdout??'')+(run.stderr??''); fs.writeFileSync(path.join(out,name+'.txt'),log);
 const count=k=>Number(new RegExp('^ℹ '+k+' (\\d+)','m').exec(log)?.[1]);
 const result={name,find,replacement,command:[process.execPath,...args],exit:run.status,signal:run.signal,tests:count('tests'),pass:count('pass'),fail:count('fail'),skipped:count('skipped'),cancelled:count('cancelled'),todo:count('todo')};
 runs.push(result);console.log(JSON.stringify(result));
 assert.equal(run.status,0);assert.equal(result.tests,1331);assert.equal(result.fail,0);
 }finally{fs.rmSync(work,{recursive:true,force:true});}
}
fs.writeFileSync(path.join(out,'enforcement-results.json'),JSON.stringify({H:'35c6ba0277542236f21f95d695154fa0164feb96',scanner:{source:'packages/kernel/tests/ambient-reads.test.ts',found:got,actualReads:6},runs},null,2)+'\n');
