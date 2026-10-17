// Maintained adaptations of review-02 stop guard/forms probes; original artifacts are unchanged.
import fs from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {instrumentCapture,captureObserver} from './capture-trace.mjs';
import {meteringViolations} from '../../packages/kernel/tests/capture-metering.ts';
const original=fs.readFileSync('packages/kernel/src/values.ts','utf8');
const inventory=JSON.parse(fs.readFileSync('tests/fixtures/packet-tools/capture-trace-sites.json','utf8'));
const controls=JSON.parse(fs.readFileSync('tests/fixtures/packet-tools/capture-trace-controls.json','utf8'));
const pristine=await import('../../packages/kernel/src/values.ts');
const rows=[];
for(const row of [{name:'correct-control',shape:'[null]',static:'pass',inventory_delta:{}},...controls]) {
 if(row.before && original.split(row.before).length!==2)throw Error('control anchor must match exactly once: '+row.name);
 const source=row.before?original.replace(row.before,row.after)+row.extra:original;
 const expected={...inventory};for(const[key,delta]of Object.entries(row.inventory_delta))expected[key]=(expected[key]??0)+delta;
 const traced=instrumentCapture(source,expected),observer=captureObserver();globalThis.__ARROKOTHI_CAPTURE_TRACE__=observer.trace;
 const temp=fs.mkdtempSync('/private/tmp/kc3-trace-control-');
 const saved=[];
 try {
  fs.cpSync('packages/kernel/src',temp+'/src',{recursive:true});fs.symlinkSync(resolve('node_modules'),temp+'/node_modules');
  fs.writeFileSync(temp+'/src/values.ts',traced.source);
  for(const name of ['getOwnPropertyNames','getOwnPropertySymbols','getOwnPropertyDescriptor','freeze','create','defineProperty']){
   const fn=Object[name];saved.push([name,fn]);Object[name]=function(...args){observer.native(name);return Reflect.apply(fn,this,args);};
  }
  const v=await import(pathToFileURL(temp+'/src/values.ts'));
  for(const[name,fn]of saved)Object[name]=fn;
  const value=new Function('return ('+row.shape+')')(),bytes=row.shape==='{x:null}'?6:2;
  observer.begin();const actual=v.captureWithWork(value,v.CAPTURE_WORK_BUDGET,bytes), trace=observer.end();
  const reference=pristine.captureWithWork(value,v.CAPTURE_WORK_BUDGET,bytes);
  const staticResult=meteringViolations(source);
  rows.push({name:row.name,expectedStatic:row.static,static:staticResult,unchangedResult:isDeepStrictEqual(actual,reference),trace});
 }finally{for(const[name,fn]of saved)Object[name]=fn;fs.rmSync(temp,{recursive:true,force:true});}
}
const inventoryControls=[];
for(const[name,source]of [['missing',original.replace('    defineAt(out, index, item);','')],
 ['duplicated',original.replace('    defineAt(out, index, item);','    defineAt(out, index, item); defineAt(out, index, item);')],
 ['unclassified',original.replace('    defineAt(out, index, item);','    defineAt(out, index, item); const extra = {};')]]) {
 let rejected=false;try{instrumentCapture(source,inventory);}catch(error){rejected=String(error).includes('inventory mismatch');}
 inventoryControls.push({name,rejected});
}
console.log(JSON.stringify({rows,inventoryControls}));
