import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const out='/tmp/arrokothi-r8-review-evidence';
const variants=[{name:'clean',copy:'/tmp/arrokothi-review-r8'},...JSON.parse(fs.readFileSync(path.join(out,'mutant-results.json'),'utf8'))];
const result=[];
for(const v of variants){
 const copy=fs.mkdtempSync('/tmp/arrokothi-r11-fault-');fs.cpSync(path.join(v.copy,'packages/kernel'),path.join(copy,'packages/kernel'),{recursive:true});fs.copyFileSync(path.join(v.copy,'package.json'),path.join(copy,'package.json'));fs.symlinkSync('/tmp/arrokothi-review-r8/node_modules',path.join(copy,'node_modules'),'dir');
 const file=path.join(copy,'packages/kernel/src/coordinator.ts');const text=fs.readFileSync(file,'utf8');const anchor='const activation: Activation = PrimordialObjectFreeze({ ...exchange.activation, writerEpoch });';if(text.split(anchor).length!==2)throw Error('unique');fs.writeFileSync(file,text.replace(anchor,'throw new Error("reviewer injected construction fault");\n    '+anchor));
 const run=spawnSync(process.execPath,['--experimental-strip-types',path.join(out,'probe-fault.mjs'),copy],{encoding:'utf8'});result.push({name:v.name,exit:run.status,stdout:run.stdout,stderr:run.stderr});
}
console.log(JSON.stringify(result,null,2));
