// Maintained design-03 continuation search. Provenance: review-02/probe-continuations.{py,mjs}.
// Emits plain observations; the maintained test asserts them after capture completes.
import fs from 'node:fs';
import os from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {instrumentCapture,captureObserver} from './capture-trace.mjs';

const mode=process.argv[2]??'small';
if(!['small','subset','full'].includes(mode))throw Error('unknown continuation search mode: '+mode);
const inventory=JSON.parse(fs.readFileSync('tests/fixtures/packet-tools/capture-trace-sites.json','utf8'));
const source=fs.readFileSync('packages/sdk/src/internal/value-capture.ts','utf8');
const temp=fs.mkdtempSync(resolve(fs.realpathSync(os.tmpdir()),'kc3-continuations-'));
fs.cpSync('packages/sdk/src/internal',temp+'/src',{recursive:true});
fs.symlinkSync(resolve('node_modules'),temp+'/node_modules');
const instrumented=instrumentCapture(source,inventory);
fs.writeFileSync(temp+'/src/values.ts',instrumented.source);
const observer=captureObserver();globalThis.__ARROKOTHI_CAPTURE_TRACE__=observer.trace;
let nativeEvents=0;
const saved=[];
for(const name of ['getOwnPropertyNames','getOwnPropertySymbols','getOwnPropertyDescriptor','freeze','defineProperty','create']) {
 const fn=Object[name];saved.push([name,fn]);Object[name]=function(...args){nativeEvents++;observer.native(name);return Reflect.apply(fn,this,args);};
}
try {
 const v=await import(pathToFileURL(temp+'/src/values.ts'));
 for(const[name,fn]of saved)Object[name]=fn;
 const pristine=await import(pathToFileURL(resolve('packages/sdk/src/internal/value-capture.ts')));
 const B=v.CAPTURE_WORK_BUDGET,L=v.BOUNDARY_LIMITS.canonicalBytes;
 const shapes=[];let forbidden=0;
 const add=(name,value)=>shapes.push({name,value});
 // Retain the original 21 shapes and threshold policy, supplied from the maintained test's literal.
 const oldTest=fs.readFileSync('packages/sdk/tests/capture-stop.test.ts','utf8');
 const match=oldTest.match(/const SHAPES = (`[\s\S]*?`);/);
 if(!match)throw Error('missing original 21-shape inventory');
 // The literal is test-owned, never caller input; execute it only in this disposable test process.
 const makeShapes=new Function(`return ${match[1]}`)();
 const originals=new Function(makeShapes+'\nreturn shapes;')();
 for(const[name,make]of originals)add(name,make());
 for(const scalar of [false,null]) {
  const label=String(scalar);
  for(const[name,value]of [
   ['scalar',scalar],['array',[scalar]],['object',{x:scalar}],
   ['siblings',[false,scalar,null]],['object-siblings',{before:false,x:scalar,after:null}],
   ['nested-array',[[scalar],true]],['nested-object',{x:{y:scalar},after:false}],
   ['mixed',[{x:[scalar]},null]],
  ])add(`${label}-${name}`,value);
 }
 add('ordinary undefined refusal',[undefined,false,null]);
 let foreign=Object.create(null);for(let i=0;i<513;i++)foreign=Object.create(foreign);
 const prototypes={ordinary:Object.prototype,null:null,foreign};
 const families=['symbol','hidden','accessor','undefined','lone-name','array-extra','hole','cycle','Map','proxy','revoked','NaN'];
 function leaf(family,prototype,parent){
  const o=()=>Object.create(prototypes[prototype]);let x;
  switch(family){
   case 'symbol':x=o();x[Symbol('s')]=1;x.tail=[0];return x;
   case 'hidden':return Object.defineProperty(o(),'hidden',{value:[1]});
   case 'accessor':return Object.defineProperty(o(),'read',{enumerable:true,get(){forbidden++;throw Error('getter');}});
   case 'undefined':x=o();x.u=undefined;return x;
   case 'lone-name':x=o();x['\ud800']=0;x.after=true;return x;
   case 'array-extra':x=[0];x.extra=1;return x;
   case 'hole':return new Array(2);
   case 'cycle':return parent;
   case 'Map':return Object.setPrototypeOf(new Map([[1,2]]),prototypes[prototype]);
   case 'proxy':return new Proxy({}, {ownKeys(){forbidden++;throw Error('trap');},getPrototypeOf(){forbidden++;throw Error('trap');}});
   case 'revoked':x=Proxy.revocable([],{});x.revoke();return x.proxy;
   case 'NaN':return NaN;
  }
 }
 const smallCount=shapes.length;
 if(mode!=='small') {
  const widths=mode==='full'?[1,7,8,9,17]:[1,9];
  const depths=mode==='full'?[0,1,15,29,31]:[0,31];
  for(const family of families)for(const prototype of Object.keys(prototypes))for(const width of widths)for(const depth of depths)for(const alias of ['shared','distinct']){
   const row=[],shared=leaf(family,prototype,row);
   for(let i=0;i<width;i++){row.push(i%3===0?{accepted:[0,'x']}:i%3===1?NaN:[]);row.push(alias==='shared'?shared:leaf(family,prototype,row));}
   row.push({after:[true,null]});let value=row;
   for(let i=0;i<depth;i++)value=i%2?{nested:value,after:0}:[value,1];
   add(JSON.stringify({family,prototype,width,depth,alias}),value);
  }
  for(const length of [0,1,10,128,129,65536,65537,131072,131073]){
   add(`string-${length}`,[NaN,'x'.repeat(length),{after:0}]);
   add(`member-name-${length}`,{['k'.repeat(length)]:0,after:[NaN]});
  }
  for(const width of [4095,4096,4097]){
   add(`wide-object-${width}`,Object.fromEntries(Array.from({length:width},(_,i)=>['k'+i,i%2?NaN:0])));
   add(`wide-array-${width}`,Array(width).fill(NaN));
  }
 }
 let runs=0,comparisons=0,violations=0,first=[],stops={none:0,work:0,bytes:0},crossed=new Set(),unwinds=0,natives=0;
 function problem(name,kind,detail){violations++;if(first.length<32)first.push({name,kind,detail});}
 function run(name,value,work,bytes,reference){
  observer.begin();nativeEvents=0;
  const result=v.captureWithWork(value,work,bytes), trace=observer.end();runs++;unwinds+=trace.unwinds;natives+=trace.natives;
  stops[result.work.stop]++;if(result.end.crossing)crossed.add(result.end.crossing);
  if(trace.violations)problem(name,'post-stop',trace.first);
  if(!trace.balanced||trace.roots!==1)problem(name,'unbalanced',trace);
  const plain=pristine.captureWithWork(value,work,bytes);comparisons++;
  if(!isDeepStrictEqual(result,plain))problem(name,'instrumentation-result', {result,plain});
  const stopped=result.work.stop!=='none';
  if(trace.transitions!==(stopped?1:0)||trace.collector!==(stopped?1:0))problem(name,'transition-count',trace);
  if(stopped){
   const code=result.work.stop==='work'?'too_much_work':'too_many_bytes';
   const issues=result.result.ok?[]:result.result.issues;
   const stopIssues=issues.filter(x=>x.code===code);
   if(stopIssues.length!==1||(stopIssues[0].occurrences??1)!==1||issues.at(-1)?.code!==code)problem(name,'stop-issue',issues);
   if(result.work.stop==='work'?result.work.units<=work:result.end.bytes<=bytes)problem(name,'crossing',result);
   if(reference){
    const all=reference.result.ok?[]:reference.result.issues;
    const details=issues.filter(x=>x.occurrences===undefined&&x.code!==code);
    if(!isDeepStrictEqual(details,all.filter(x=>x.occurrences===undefined).slice(0,details.length)))problem(name,'diagnostic-prefix',details);
    for(const k of new Set(issues.map(x=>x.code))){if(k===code)continue;const count=xs=>xs.filter(x=>x.code===k).reduce((n,x)=>n+(x.occurrences??1),0);if(count(issues)>count(all))problem(name,'occurrences',k);}
   }
  }
  if(forbidden)problem(name,'caller-code',forbidden);
  return {result,events:trace.events};
 }
 const thresholds=(full,bound)=>{
  if(full<=bound)return Array.from({length:full+1},(_,i)=>i);
  const out=new Set();for(let i=0;i<=Math.min(256,full);i++)out.add(i);for(let i=0;i<=full;i+=61)out.add(i);for(let i=Math.max(0,full-256);i<=full;i++)out.add(i);return [...out].sort((a,b)=>a-b);
 };
 const boundaries=(events,name,cap)=>{let n=0;const out=new Set([0,cap]);for(const e of events)if(e.name===name){n+=e.amount;for(const x of[n-1,n,n+1])if(x>=0&&x<=cap)out.add(x);}const xs=[...out].sort((a,b)=>a-b);return xs.length<=160?xs:[...new Set([...xs.slice(0,48),...xs.filter((_,i)=>i%97===0),...xs.slice(-48)])];};
 for(let index=0;index<shapes.length;index++){
  const {name,value}=shapes[index],reference=run(name,value,B,L);
  const works=index<smallCount?thresholds(reference.result.work.units,2000):boundaries(reference.events,'spend',B);
  const bytes=index<smallCount?thresholds(reference.result.end.bytes,4000):boundaries(reference.events,'charge',L);
  for(const n of works)run(name,value,n,L,reference.result);
  for(const n of bytes)run(name,value,B,n,reference.result);
  for(const q of [0,0.25,0.5,1])run(name,value,works[Math.floor((works.length-1)*q)],bytes[Math.floor((bytes.length-1)*(1-q))],reference.result);
 }
 console.log(JSON.stringify({node:process.version,mode,shapes:shapes.length,smallShapes:smallCount,runs,comparisons,violations,first,stops,crossed:[...crossed].sort(),unwinds,natives,forbidden,
  inventory:instrumented.inventory,dimensions:{families,prototypes:Object.keys(prototypes),widths:mode==='full'?[1,7,8,9,17]:[1,9],depths:mode==='full'?[0,1,15,29,31]:[0,31],aliasing:['shared','distinct'],smallThresholds:'work <=2000 and bytes <=4000 exhaustive; otherwise 0..256, every 61st, final 256',largeThresholds:'charge neighborhoods; over 160 neighborhoods: first/final 48 and every 97th; four paired thresholds'}}));
 // Small mode is an observation child: its importing test must reach its own assertion,
 // including under mutations. Standalone larger searches enforce their own exit gate.
 if(mode!=='small' && (violations!==0 || comparisons!==runs || forbidden!==0))process.exitCode=1;
} finally {for(const[name,fn]of saved)Object[name]=fn;fs.rmSync(temp,{recursive:true,force:true});}
