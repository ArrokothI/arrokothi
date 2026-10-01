import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root='/tmp/arrokothi-review-r8'; const out='/tmp/arrokothi-r8-review-evidence';
const source=fs.readFileSync(path.join(root,'packages/kernel/src/coordinator.ts'),'utf8');
const anchor='const receipt = mintReceipt("dispatch_intent", position, record.executionId);';
const variants=[['default-parameter','\n    const reserve = (target: ExecutionRecord = record): Receipt => this.#mint("dispatch_intent", target);\n    reserve();'],['shadowed-undefined','\n    const undefined = record;\n    undefined.nextAcceptancePosition = position + 1;']];
const results=[];
for(const [name,insert] of variants){
 const copy=fs.mkdtempSync('/tmp/arrokothi-r11-'+name+'-');
 fs.cpSync(path.join(root,'packages/kernel'),path.join(copy,'packages/kernel'),{recursive:true});
 fs.copyFileSync(path.join(root,'package.json'),path.join(copy,'package.json'));
 fs.copyFileSync(path.join(root,'tsconfig.json'),path.join(copy,'tsconfig.json'));
 fs.symlinkSync(path.join(root,'node_modules'),path.join(copy,'node_modules'),'dir');
 fs.writeFileSync(path.join(copy,'packages/kernel/src/coordinator.ts'),source.replace(anchor,anchor+insert));
 const args=['--experimental-strip-types','--test','--test-reporter=spec',...fs.readdirSync(path.join(copy,'packages/kernel/tests')).filter(n=>n.endsWith('.test.ts')).sort().map(n=>'packages/kernel/tests/'+n)];
 const run=spawnSync(process.execPath,args,{cwd:copy,encoding:'utf8',maxBuffer:64*1024*1024,timeout:300000});
 fs.writeFileSync(path.join(out,name+'-suite.txt'),run.stdout+run.stderr);
 results.push({name,copy,anchor,insert,exit:run.status,signal:run.signal,error:run.error?.message,summary:(run.stdout+run.stderr).split('\n').slice(-10)});
 console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync(path.join(out,'mutant-results.json'),JSON.stringify(results,null,2)+'\n');
