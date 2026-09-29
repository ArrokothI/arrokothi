import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const roots=[['clean','/tmp/arrokothi-review-r8'],['partial-type-assertion',JSON.parse(fs.readFileSync('/tmp/arrokothi-r8-review-evidence/read-mutant-result.json','utf8')).copy]];const results=[];
for(const [variant,root]of roots){
const {ExecutionCoordinator}=await import(pathToFileURL(path.join(root,'packages/kernel/src/index.ts')));const {accepted,caller,createRequest,recordingDriver,outcomeFor,submissionFor}=await import(pathToFileURL(path.join(root,'packages/kernel/tests/harness.ts')));
for(const mode of ['count','throw','reenter']){
 const who=caller('review11','tenant-a'),driver=recordingDriver(),kernel=new ExecutionCoordinator({driver});const id=accepted(kernel.createExecution(who,createRequest())).executionId;const open=accepted(kernel.dispatch(who,id,{bound:1}));const complete=outcomeFor(id,open,{next:{step:'complete',result:{done:true}}}),grant=submissionFor(driver,open.activationId);let reads=0,nested;const saved=Object.getOwnPropertyDescriptor(Object.prototype,'resultingEpoch');let answer,error;
 try{
 accepted(kernel.reportProtocolFailure(who,id,{get activationId(){Object.defineProperty(Object.prototype,'resultingEpoch',{configurable:true,get(){reads++;if(mode==='throw')throw Error('reviewer inherited read');if(mode==='reenter'){delete Object.prototype.resultingEpoch;nested=kernel.submitOutcome(who,complete,grant);}return 777;}});return open.activationId;},writerEpoch:1,diagnostic:'install ambient state'}));
 try{answer=kernel.inspect(who,id);}catch(e){error=e.message;}
 }finally{if(saved)Object.defineProperty(Object.prototype,'resultingEpoch',saved);else delete Object.prototype.resultingEpoch;}
 const after=accepted(kernel.inspect(who,id));results.push({variant,mode,reads,error,nestedAccepted:nested?.ok,returnedState:answer?.value?.state,afterState:after.state,progressRevision:after.progressRevision,receipts:after.receipts.length,history:after.recoveryHistory.map(x=>x.transition)});
 if(variant==='clean')assert.equal(reads,0);else assert.equal(reads,1);
}}
console.log(JSON.stringify(results,null,2));
