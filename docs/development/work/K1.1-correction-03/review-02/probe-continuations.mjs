// Reviewer-owned finite search; invoked by probe-continuations.py against disposable source.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const [instrumented,clean]=process.argv.slice(2);
let state,events=[],post=[],unwinds=0,enabled=false;
globalThis.__KC3_REVIEW_TRACE__=(name,s,kind,amount)=>{
 if(!enabled)return;
 if(s!==undefined)state=s;
 if(state?.stopped){if(name==='closeContainer')unwinds++;else post.push({name,stop:state.stop,units:state.units,bytes:state.bytes});}
 if(name==='spend'||name==='charge') events.push({name,kind,amount});
};
const u=p=>pathToFileURL(resolve(p,'packages/kernel/src/values.ts')).href;
const v=await import(u(instrumented)), pristine=await import(u(clean));
const B=v.CAPTURE_WORK_BUDGET,L=v.BOUNDARY_LIMITS.canonicalBytes;
const shapes=[];
let forbidden=0;
let foreign=Object.create(null);for(let i=0;i<513;i++)foreign=Object.create(foreign);
const prototypes={ordinary:Object.prototype,null:null,foreign};
const families=['symbol','hidden','accessor','undefined','lone-name','array-extra','hole','cycle','Map','proxy','revoked','NaN'];
function leaf(family,prototype,parent){
 const o=()=>Object.create(prototypes[prototype]);
 let x;
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
for(const family of families)for(const prototype of Object.keys(prototypes))for(const width of [1,7,8,9,17])for(const depth of [0,1,15,29,31])for(const alias of ['shared','distinct']){
 const root=[],shared=leaf(family,prototype,root);
 for(let i=0;i<width;i++){
  root.push(i%3===0?{accepted:[0,'x']} : i%3===1? NaN : []);
  root.push(alias==='shared'?shared:leaf(family,prototype,root));
 }
 // Mixed siblings before and after the refusal; both object and array return paths.
 root.push({after:[true,null]});let value=root;
 for(let i=0;i<depth;i++) value=i%2?{nested:value,after:0}:[value,1];
 shapes.push({name:JSON.stringify({family,prototype,width,depth,alias}),value});
}
// Independent precision edges: string preflight, UTF-16 scans, punctuation/empty strings,
// descriptor batches at the semantic limit, and diagnostic-detail rollover.
for(const length of [0,1,10,128,129,65536,65537,131072,131073]){
 shapes.push({name:`string-${length}`,value:[NaN,'x'.repeat(length),{after:0}]});
 shapes.push({name:`member-name-${length}`,value:{['k'.repeat(length)]:0,after:[NaN]}});
}
for(const width of [4095,4096,4097]){
 shapes.push({name:`wide-object-${width}`,value:Object.fromEntries(Array.from({length:width},(_,i)=>['k'+i,i%2?NaN:0]))});
 shapes.push({name:`wide-array-${width}`,value:Array(width).fill(NaN)});
}
function run(value,work,bytes){
 state=undefined;events=[];post=[];enabled=true;
 const result=v.captureWithWork(value,work,bytes);enabled=false;
 assert.deepEqual(post,[],'no continuation helper after stop');
 assert.equal(forbidden,0,'no accessor or Proxy trap');
 return {result,events:[...events]};
}
const boundaries=(events,name,cap)=>{
 let total=0;const out=new Set([0,cap]);
 for(const event of events)if(event.name===name){
  total+=event.amount;
  for(const n of [total-1,total,total+1])if(n>=0&&n<=cap)out.add(n);
 }
 return [...out].sort((a,b)=>a-b);
};
let runs=0,comparisons=0,stops={none:0,work:0,bytes:0};const crossed=new Set();
for(const {name,value} of shapes){
 const reference=run(value,B,L);runs++;
 assert.deepEqual(reference.result,pristine.captureWithWork(value),`instrumentation preserves ${name}`);comparisons++;
 let works=boundaries(reference.events,'spend',B),bytes=boundaries(reference.events,'charge',L);
 // Full transition neighborhoods for small shapes; deterministic sampling of wide/long shapes.
 const sample=xs=>xs.length<=160?xs:[...new Set([...xs.slice(0,48),...xs.filter((_,i)=>i%97===0),...xs.slice(-48)])];
 works=sample(works);bytes=sample(bytes);
 for(const work of works){const {result}=run(value,work,L);runs++;stops[result.work.stop]++;if(result.end.crossing)crossed.add(result.end.crossing);}
 for(const byte of bytes){const {result}=run(value,B,byte);runs++;stops[result.work.stop]++;}
 // Interacting stops: four deterministic pairs use both reduced budgets together.
 for(const q of [0,0.25,0.5,1]){const {result}=run(value,works[Math.floor((works.length-1)*q)],bytes[Math.floor((bytes.length-1)*(1-q))]);runs++;stops[result.work.stop]++;}
}
console.log(JSON.stringify({node:process.version,shapes:shapes.length,runs,comparisons,stops,crossed:[...crossed].sort(),allowedCycleUnwinds:unwinds,postStopHelpers:0,forbiddenCalls:forbidden,dimensions:{families,prototypes:Object.keys(prototypes),widths:[1,7,8,9,17],depths:[0,1,15,29,31],aliasing:['shared','distinct'],mix:'accepted object/array/NaN siblings around every refused position; object/array alternating wrappers',diagnostics:'crosses first-eight boundary',root:'single capture; public eager roots separately rerun from review-01'},limits:'Instrumented helper-entry trace; no claim of engine internals or static-check soundness; wide/long thresholds sampled, small charge transitions exhaustive.'},null,2));
