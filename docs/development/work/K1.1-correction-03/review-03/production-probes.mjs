// Reviewer-owned concrete-input probes. No candidate source is changed.
// Node v26.10.0: node --experimental-strip-types production-probes.mjs C_TREE B_TREE
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {types} from 'node:util';
const tree=resolve(process.argv[2]), baseline=resolve(process.argv[3]);
assert.equal(process.version,'v26.10.0');
const url=(root,p)=>pathToFileURL(resolve(root,p)).href;
let watched=new WeakMap(), events=[], enabled=false;
const saved=[];
for(const [holder,key,label] of [[Object,'getOwnPropertyNames','names'],[Object,'getOwnPropertySymbols','symbols'],[Object,'getPrototypeOf','prototype'],[Object,'getOwnPropertyDescriptor','descriptor'],[Array,'isArray','isArray'],[types,'isProxy','isProxy']]) {
 const native=holder[key]; saved.push([holder,key,native]);
 holder[key]=function(value,...args){
  const tag=value!==null&&(typeof value==='object'||typeof value==='function')?watched.get(value):undefined;
  if(enabled&&tag!==undefined)events.push({tag,operation:label});
  return native(value,...args);
 };
}
let values;
try{values=await import(url(tree,'packages/kernel/src/values.ts'));}
finally{for(const [holder,key,native] of saved)holder[key]=native;}
const old=await import(url(baseline,'packages/kernel/src/values.ts'));
const {ExecutionCoordinator}=await import(url(tree,'packages/kernel/src/index.ts'));
const {acceptIdentityText}=await import(url(tree,'packages/kernel/src/envelope.ts'));
const {captureWithWork,canonicalize,boundaryValueIssues,isBoundaryValue,CAPTURE_WORK_BUDGET:B}=values;
const ok=x=>{assert.equal(x.ok,true);return x.value;};
const no=x=>{assert.equal(x.ok,false);return x.error;};
const who={namespace:'independent-review03',scopes:['tenant-a'],controlScopes:['tenant-a']};
const visible={namespace:'observer',scopes:['tenant-a']};
const request=overrides=>({creationKey:'create',scope:'tenant-a',definitionRevision:'definition@1',runtimeContractRevision:'runtime@1',progressCodec:'json@1',authorityContext:{tenant:'a'},initialInput:{kind:'start',payload:null},...overrides});
function setup(){
 const deliveries=[],grants=[];
 const kernel=new ExecutionCoordinator({driver:{driverId:'review03',deliver(a,s,g){deliveries.push(a);grants.push(g);s.delivered();},isSafeToReplace(){return true;}}});
 const created=ok(kernel.createExecution(who,request()));
 const open=ok(kernel.dispatch(who,created.executionId,{bound:1}));
 return {kernel,deliveries,grant:grants[0],open,id:created.executionId,view:()=>ok(kernel.inspect(who,created.executionId))};
}
function outcome(s,overrides={}){return {executionId:s.id,activationId:s.open.activationId,writerEpoch:s.open.writerEpoch,baseProgressRevision:s.open.baseProgressRevision,progress:null,next:{step:'continue'},...overrides};}
function sameAcceptedState(before,after,refusal){
 const {refusals:a,...x}=before,{refusals:b,...y}=after;
 assert.deepEqual(y,x,'accepted state and receipts unchanged');
 assert.deepEqual(b.slice(0,a.length),a,'existing refusals unchanged');
 assert.ok(b.length===a.length||b.length===a.length+1);
 if(b.length>a.length)assert.deepEqual(b.at(-1),refusal);
}
const consumerKinds=['create-authority','create-input','ingress','recovery-definitionRevisions','recovery-runtimeContractRevisions','recovery-progressCodecs','progress','emission','result','error'];
let consumerCases=0;
function throughConsumer(value,kind){
 const s=setup(),before=s.view(),visibleBefore=s.kernel.visibleExecutions(who),delivered=s.deliveries.length;
 let answer;
 if(kind==='create-authority')answer=s.kernel.createExecution(who,request({creationKey:'second',authorityContext:value}));
 else if(kind==='create-input')answer=s.kernel.createExecution(who,request({creationKey:'second',initialInput:{kind:'k',payload:value}}));
 else if(kind==='ingress')answer=s.kernel.submitInput(who,{destination:s.id,requestKey:'i',kind:'k',payload:value});
 else if(kind.startsWith('recovery-')){
  const available={definitionRevisions:['definition@1'],runtimeContractRevisions:['runtime@1'],progressCodecs:['json@1']};available[kind.slice(9)]=value;
  answer=s.kernel.recoverExecution(who,s.id,{activationId:s.open.activationId,available});
 }else{
  const override=kind==='progress'?{progress:value}:kind==='emission'?{emissions:[{emissionKey:'e',value}]}:kind==='result'?{next:{step:'complete',result:value}}:{next:{step:'fail',error:value}};
  answer=s.kernel.submitOutcome(who,outcome(s,override),s.grant);
 }
 const refusal=no(answer);
 assert.equal(refusal.classification,['progress','emission','result','error'].includes(kind)?'malformed_envelope':'malformed_value');
 assert.ok(refusal.reason.includes('unsupported_form'),kind);
 sameAcceptedState(before,s.view(),refusal);
 assert.deepEqual(s.kernel.visibleExecutions(who),visibleBefore);
 assert.equal(s.deliveries.length,delivered);
 ok(s.kernel.submitOutcome(who,outcome(s),s.grant)); // refusal leaves the grant and open exchange usable
 consumerCases++;
}
let trapCalls=0;
const fail=()=>{trapCalls++;throw Error('Proxy/accessor invoked');};
const traps=Object.fromEntries(['get','set','has','ownKeys','getPrototypeOf','setPrototypeOf','getOwnPropertyDescriptor','defineProperty','deleteProperty','isExtensible','preventExtensions','apply','construct'].map(k=>[k,fail]));
const proxyFactories=[['ordinary',()=>new Proxy({},traps)],['array',()=>new Proxy([],traps)],['callable',()=>new Proxy(function(){},traps)],['revoked-object',()=>{const x=Proxy.revocable({},traps);x.revoke();return x.proxy;}],['revoked-callable',()=>{const x=Proxy.revocable(function(){},traps);x.revoke();return x.proxy;}],['target-chain',()=>new Proxy(new Proxy([],traps),traps)]];
const proxyRows=[];
for(const [kind,make] of proxyFactories){
 const value=make();watched.set(value,kind);events=[];enabled=true;
 const metered=captureWithWork(value);enabled=false;
 assert.equal(metered.result.ok,false);assert.equal(metered.work.units,2);
 assert.deepEqual(events,[{tag:kind,operation:'isProxy'}]);
 assert.equal(metered.result.issues[0].message,'value is a Proxy; capture refuses every Proxy before observing it');
 assert.deepEqual(boundaryValueIssues(value),metered.result.issues);assert.equal(isBoundaryValue(value),false);
 let nested=value;for(let d=0;d<32;d++)nested=[nested];
 const deepest=canonicalize(nested);assert.equal(deepest.ok,false);assert.equal(deepest.issues[0].code,'unsupported_form');assert.ok(deepest.issues[0].message.includes('Proxy'));
 const identity=[];assert.equal(acceptIdentityText(value,'identity',identity),false);assert.equal(identity[0].message,'expected text that can name a request, received a Proxy');
 for(const consumer of consumerKinds)throughConsumer(value,consumer);
 proxyRows.push({kind,work:metered.work,firstOperations:events,deepestCode:deepest.issues[0].code,identity});
}
const namespace=await import('data:text/javascript,export const witness=1');
const brandFactories=[['Map',()=>new Map([[1,2]])],['Set',()=>new Set([1])],['WeakMap',()=>new WeakMap()],['WeakSet',()=>new WeakSet()],['Date',()=>new Date(0)],['RegExp',()=>/a/g],['ArrayBuffer',()=>new ArrayBuffer(64)],['SharedArrayBuffer',()=>new SharedArrayBuffer(64)],['Uint8Array',()=>new Uint8Array(4096)],['DataView',()=>new DataView(new ArrayBuffer(64))],['Number',()=>new Number(1)],['String',()=>new String('x'.repeat(4096))],['Boolean',()=>new Boolean(false)],['BigInt',()=>Object(1n)],['Symbol',()=>Object(Symbol('s'))],['Error',()=>new Error('x')],['Promise',()=>Promise.resolve(1)],['Generator',()=>function*(){yield 1;}()],['AsyncGenerator',()=>async function*(){yield 1;}()],['MapIterator',()=>new Map().keys()],['SetIterator',()=>new Set().values()],['Arguments',()=>function(){return arguments;}(1)],['cross-realm-Map',()=>vm.runInNewContext('new Map([[1,2]])')],['cross-realm-Date',()=>vm.runInNewContext('new Date(0)')],['cross-realm-Uint8Array',()=>vm.runInNewContext('new Uint8Array(8)')]];
const brandRows=[];
for(const [kind,make] of brandFactories)for(const prototype of ['natural','ordinary','null']){
 const value=make();if(prototype!=='natural')Object.setPrototypeOf(value,prototype==='null'?null:Object.prototype);
 const tag=kind+'/'+prototype;watched.set(value,tag);events=[];enabled=true;
 const result=captureWithWork(value);enabled=false;
 assert.equal(result.result.ok,false,tag);assert.equal(result.result.issues[0].code,'unsupported_form',tag);
 assert.equal(result.work.units,2,tag);assert.equal(result.work.listing,0,tag);
 assert.equal(events[0].operation,'isProxy');assert.equal(events.some(x=>['names','symbols','descriptor'].includes(x.operation)),false,tag);
 for(const consumer of consumerKinds)throughConsumer(value,consumer);
 brandRows.push({kind,prototype,work:result.work,operations:events,issue:result.result.issues[0]});
}
for(const [kind,value] of [['ModuleNamespace',namespace],['RawJSON',JSON.rawJSON('1')]]){
 watched.set(value,kind);events=[];enabled=true;const result=captureWithWork(value);enabled=false;
 assert.equal(result.result.ok,false);assert.equal(result.result.issues[0].code,'unsupported_form');assert.equal(result.work.listing,0);
 for(const consumer of consumerKinds)throughConsumer(value,consumer);
 brandRows.push({kind,prototype:'natural',work:result.work,operations:events,issue:result.result.issues[0]});
}
assert.equal(trapCalls,0);
// Exact diagnostic ordering/counts and B compatibility on ordinary refused values.
const mixed=[...Array(8).fill(NaN),...Array(3).fill(undefined),Infinity,-Infinity,1n,()=>0];
const diag=captureWithWork(mixed);assert.equal(diag.result.ok,false);assert.deepEqual(diag.result,old.canonicalize(mixed));
assert.deepEqual(diag.result.issues.slice(0,8).map(x=>[x.path,x.code]),Array.from({length:8},(_,i)=>['['+i+']','non_finite_number']));
assert.deepEqual(diag.result.issues.slice(8).map(x=>[x.code,x.occurrences]),[['undefined_member',3],['non_finite_number',2],['unsupported_form',2]]);
assert.equal(diag.work.diagnostic,15);
const ordinaryCases=[Object.defineProperty({},'x',{enumerable:true,get:fail}),Object.defineProperty({},'x',{value:1}),Object.assign([0],{extra:1}),Array(3),{'\ud800':1},'x'.repeat(65537)];
for(const value of ordinaryCases)assert.deepEqual(canonicalize(value),old.canonicalize(value));
let cyclic=[];let cursor=cyclic;for(let n=1;n<32;n++){const next=[];cursor.push(next);cursor=next;}cursor.push(cyclic);
assert.equal(canonicalize(cyclic).issues[0].code,'cycle');
const foreign=Object.create(Object.create(null));let tooDeep=foreign;for(let n=0;n<32;n++)tooDeep=[tooDeep];
assert.equal(canonicalize(tooDeep).issues[0].code,'too_deep');
// The historical real-B diagnostic crossing, with eight DISTINCT eager root identities.
function crossing(index){
 const target={[Symbol('stop')]:1};for(let n=0;n<257;n++)target['k'+n]=0;
 const row=Array(4096).fill(foreign),partial=Array(3805).fill(foreign);for(let n=0;n<3;n++)partial[n]={};
 const root=[...Array(191).fill(row),partial,target];
 watched.set(root,'root-'+index);watched.set(target,'target-'+index);return {root,target};
}
const eight=Array.from({length:8},(_,i)=>crossing(i));
const single=captureWithWork(eight[0].root);assert.equal(single.work.units,B+1);assert.equal(single.work.stop,'work');assert.equal(single.end.crossing,'diagnostic');
assert.equal(single.result.issues.filter(x=>x.code==='too_much_work').reduce((n,x)=>n+(x.occurrences??1),0),1);
const eagerRows=[];
for(const authority of ['none','valid']){
 const s=setup(),before=s.view(),delivered=s.deliveries.length;events=[];enabled=true;
 const proposal=outcome(s,{progress:eight[0].root,emissions:eight.slice(1,7).map((x,i)=>({emissionKey:'e'+i,value:x.root})),next:{step:'complete',result:eight[7].root}});
 const refusal=no(s.kernel.submitOutcome(authority==='none'?visible:who,proposal,authority==='none'?undefined:s.grant));enabled=false;
 assert.equal(refusal.classification,authority==='none'?'unauthorized_submission':'malformed_envelope');
 for(let i=0;i<8;i++){
  assert.equal(events.filter(x=>x.tag==='root-'+i&&x.operation==='names').length,1);
  assert.equal(events.filter(x=>x.tag==='target-'+i&&x.operation==='symbols').length,1);
  assert.equal(events.filter(x=>x.tag==='target-'+i&&x.operation==='names').length,0);
 }
 assert.deepEqual(events.filter(x=>x.tag.startsWith('root-')&&x.operation==='names').map(x=>x.tag),Array.from({length:8},(_,i)=>'root-'+i));
 if(authority==='none')assert.equal(refusal.reason.includes('too_much_work'),false,'content diagnostics stay behind authorization');
 else assert.ok(refusal.reason.includes('too_much_work=8'),'one stop per root survives weighted diagnostic composition');
 sameAcceptedState(before,s.view(),refusal);assert.equal(s.deliveries.length,delivered);ok(s.kernel.submitOutcome(who,outcome(s),s.grant));
 eagerRows.push({authority,classification:refusal.classification,reason:refusal.reason,events});
}
// Eight large accepted roots have no request-wide work/byte budget (owner-approved L-13).
const payload=Array(11).fill('x'.repeat(65536)), measured=captureWithWork(payload);assert.equal(measured.result.ok,true);
const s=setup();const accepted=ok(s.kernel.submitOutcome(who,outcome(s,{progress:payload,emissions:Array.from({length:6},(_,i)=>({emissionKey:'a'+i,value:payload})),next:{step:'complete',result:payload}}),s.grant));
assert.ok(measured.work.units*8>B);assert.ok(measured.result.value.canonicalBytes*8>1048576);
assert.equal(trapCalls,0);
console.log(JSON.stringify({node:process.version,tree,baseline,budget:B,proxyRows,brandRows,consumerCases,trapCalls,diagnostics:diag,eagerRows,largeAccepted:{perRootWork:measured.work,perRootBytes:measured.result.value.canonicalBytes,roots:8,decision:accepted},limits:['Finite concrete inputs; native External requires an addon and was not tested.','Native wrappers preserve returned values but do not observe engine-internal work.','No new mutant-credit, static-guard, ledger, census or registry probes.']},null,2));
