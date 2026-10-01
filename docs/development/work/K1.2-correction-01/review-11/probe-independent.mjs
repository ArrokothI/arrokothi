import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.argv[2]||'/tmp/arrokothi-review-r8';
const A=await import(pathToFileURL(path.join(root,'packages/kernel/tests/zone-analysis.ts')));
const I=await import(pathToFileURL(path.join(root,'packages/kernel/tests/zone-inventory.ts')));
const zone=A.buildZone();
const effects=z=>A.analyseEffects(z,{foreignCalls:new Set(I.FOREIGN_CALLS.keys()),overrides:I.EFFECT_OVERRIDES,getterReads:I.getterReads()});
const violations=(z,a)=>{
 const out=[...a.unclassified];
 for(const n of ['recoverExecution','reportProtocolFailure','requestTakeover']) out.push(...A.checkControl(z,a,A.findMethod(z,'ExecutionCoordinator',n)).violations);
 out.push(...A.checkApplyHelper(z,a,A.findConstFunction(z,'applyControlCommit')));
 const owners=A.writeOwners(z,a,new Map([...I.WRITE_SITES].map(([field,s])=>[field,s.element])));
 for(const [field,s] of I.WRITE_SITES) if(JSON.stringify([...owners.get(field)].sort())!==JSON.stringify([...s.owners].sort())) out.push(`${field} writers ${[...owners.get(field)]}`);
 return out;
};
const clean=A.analyseAccesses(zone,{extraEnvelopeParameters:I.EXTRA_ENVELOPE_PARAMETERS});
const k=s=>`${s.file} ${s.kind}/${s.mode} ${s.text}`;
const multiset=ss=>Object.fromEntries([...ss.reduce((m,s)=>m.set(k(s),(m.get(k(s))||0)+1),new Map())].sort());
const cleanSites=multiset(clean);
const src=path.join(A.SOURCE_ROOT,'coordinator.ts');
const text=fs.readFileSync(src,'utf8');
const receipt='const receipt = mintReceipt("dispatch_intent", position, record.executionId);';
const mutants=[
 ['default-parameter',receipt,'const reserve = (target: ExecutionRecord = record): Receipt => this.#mint("dispatch_intent", target);\n    const receipt = reserve();'],
 ['shadowed-undefined',receipt,receipt+'\n    const undefined = record;\n    undefined.nextAcceptancePosition = position + 1;'],
];
const results=[];
results.push({name:'clean',errors:A.typeErrors(zone),violations:violations(zone,effects(zone))});
for(const [name,find,repl] of mutants){
 if(text.split(find).length!==2) throw Error('anchor');
 const z=A.buildZone(A.zoneFiles(),new Map([[src,text.replace(find,repl)]]),zone);
 const access=A.analyseAccesses(z,{extraEnvelopeParameters:I.EXTRA_ENVELOPE_PARAMETERS});
 results.push({name,typeErrors:A.typeErrors(z),sameAccessInventory:JSON.stringify(multiset(access))===JSON.stringify(cleanSites),violations:violations(z,effects(z))});
}
const probes=[
 ['assert-add-member','interface Base { writerEpoch:number } interface Extra extends Base { resultingEpoch:number } export const read=(value:Base):number=>(value as Extra).resultingEpoch;'],
 ['predicate-add-member','interface Base { writerEpoch:number } interface Extra extends Base { resultingEpoch:number } function hasExtra(value:Base):value is Extra{return true} export const read=(value:Base):number=>hasExtra(value)?value.resultingEpoch:0;'],
 ['nested-strengthening','interface Base { child:{ resultingEpoch?:number } } interface Extra { child:{ resultingEpoch:number } } export const read=(value:Base):number=>(value as Extra).child.resultingEpoch;'],
];
for(const [name,source] of probes){
 const p=path.join(A.SOURCE_ROOT,'__review11.ts');
 const z=A.buildZone([p],new Map([[p,source]]));
 results.push({name,typeErrors:A.typeErrors(z),sites:A.analyseAccesses(z).map(({kind,mode,text})=>({kind,mode,text})),unclassified:effects(z).unclassified});
}
console.log(JSON.stringify(results,null,2));
