// Known O-R8-4 variants; no new accepted-claim family. Run from the repository root.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {ExecutionCoordinator} from '../../../../../packages/kernel/src/index.ts';
import {accepted,caller,createRequest,recordingDriver,outcomeFor,submissionFor} from '../../../../../packages/kernel/tests/harness.ts';
const base='66bc041175e6fc191c2e7cf88de198111e7d97c9';
assert.equal(execFileSync('git',['diff',base,'--','packages/kernel/src','packages/kernel/tests/harness.ts']).toString(),'');
const author=caller('app-a','tenant-a');
const exotic=(n:number)=>Object.setPrototypeOf(new Map([['retained-in-internal-slot',n]]),null);
const results=[];
for(const field of ['authorityContext','initialInput','ingress','progress','emission','result','error']){
 const driver=recordingDriver();const k=new ExecutionCoordinator({driver});
 const req=createRequest(field==='authorityContext'?{authorityContext:exotic(1)}:field==='initialInput'?{initialInput:{kind:'x',payload:exotic(1)}}:{});
 const created=accepted(k.createExecution(author,req));const id=created.executionId;let answer:any=created;let replay:any=null;
 if(field==='authorityContext'||field==='initialInput')replay=accepted(k.createExecution(author,createRequest(field==='authorityContext'?{authorityContext:exotic(2)}:{initialInput:{kind:'x',payload:exotic(2)}})));
 if(field==='ingress'){
  const input={destination:id,requestKey:'i',kind:'x',payload:exotic(1)};
  answer=accepted(k.submitInput(author,input));replay=accepted(k.submitInput(author,{...input,payload:exotic(2)}));
 }
 if(['progress','emission','result','error'].includes(field)){
  const d=accepted(k.dispatch(author,id,{bound:1}));
  const override=(n:number)=>field==='progress'?{progress:exotic(n)}:field==='emission'?{emissions:[{emissionKey:'e',value:exotic(n)}]}:field==='result'?{next:{step:'complete',result:exotic(n)}}:{next:{step:'fail',error:exotic(n)}};
  answer=accepted(k.submitOutcome(author,outcomeFor(id,d,override(1)),submissionFor(driver,d.activationId)));
  replay=accepted(k.submitOutcome(author,outcomeFor(id,d,override(2)),submissionFor(driver,d.activationId)));
 }
 assert.equal(replay.replayed,true,field);
 results.push({field,answer,replay,view:accepted(k.inspect(author,id))});
}
console.log(JSON.stringify({base,node:process.version,expectation:'Current behavior reproduction, not desired-domain conformance: different hidden Map contents replay as the same projected value.',results},null,2));
