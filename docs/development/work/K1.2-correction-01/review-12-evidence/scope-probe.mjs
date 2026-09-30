import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2] ?? 'work/review-source');
const {ExecutionCoordinator}=await import(pathToFileURL(resolve(root,'packages/kernel/src/index.ts')));
const h=await import(pathToFileURL(resolve(root,'packages/kernel/tests/harness.ts')));
const available={definitionRevisions:['weekly-report@3'],runtimeContractRevisions:['runtime-contract@1'],progressCodecs:['inline-json@1']};
function env(){const driver=h.recordingDriver(),kernel=new ExecutionCoordinator({driver}),who=h.caller('reviewer');const {executionId}=h.accepted(kernel.createExecution(who,h.createRequest()));const open=h.accepted(kernel.dispatch(who,executionId,{bound:1}));return {driver,kernel,who,executionId,open};}
const rows=[];
for(const method of ['recoverExecution','reportProtocolFailure','requestTakeover']){
 const kinds=method==='recoverExecution'?['unknown','hidden']:method==='reportProtocolFailure'?['unknown','hidden','wrongActivation','noOpen','terminal']:['unknown','hidden','wrongActivation','terminal'];
 for(const kind of kinds){const e=env();if(kind==='terminal'||kind==='noOpen')h.accepted(e.kernel.submitOutcome(e.who,h.outcomeFor(e.executionId,e.open,kind==='terminal'?{next:{step:'complete',result:null}}:{}),h.submissionFor(e.driver,e.open.activationId)));
 const before=h.accepted(e.kernel.inspect(e.who,e.executionId));const request={activationId:kind==='wrongActivation'?'different':e.open.activationId,writerEpoch:1,available};
 const answer=e.kernel[method](kind==='hidden'?h.caller('hidden','other-scope'):e.who,kind==='unknown'?'missing':e.executionId,request);assert.equal(answer.ok,false);
 assert.equal(answer.error.classification,({unknown:'unknown_destination',hidden:'unknown_destination',wrongActivation:'stale_exchange',noOpen:'no_unresolved_exchange',terminal:'terminal_destination'})[kind]);
 const after=h.accepted(e.kernel.inspect(e.who,e.executionId));if(['unknown','hidden'].includes(kind))assert.deepEqual(after,before);else {assert.deepEqual({...after,refusals:before.refusals},before);assert.deepEqual(after.refusals,[...before.refusals,answer.error]);}
 rows.push({method,path:kind,classification:answer.error.classification,wholeView:'only expected refusal, or no hidden mutation'});
 }
}
for(const action of ['terminal','resolved','newExchange','nestedTakeover','codeHold']){
 const e=env();let afterCallback; e.driver.isSafeToReplace=()=>{
  e.driver.isSafeToReplace=()=>true;
  if(action==='nestedTakeover')h.accepted(e.kernel.requestTakeover(e.who,e.executionId,{activationId:e.open.activationId,writerEpoch:1}));
  else if(action==='codeHold')h.accepted(e.kernel.recoverExecution(e.who,e.executionId,{activationId:e.open.activationId,available:{...available,definitionRevisions:[]}}));
  else {h.accepted(e.kernel.submitOutcome(e.who,h.outcomeFor(e.executionId,e.open,action==='terminal'?{next:{step:'complete',result:null}}:{}),h.submissionFor(e.driver,e.open.activationId)));if(action==='newExchange')h.accepted(e.kernel.dispatch(e.who,e.executionId,{bound:1}));}
  afterCallback=h.accepted(e.kernel.inspect(e.who,e.executionId));return true;
 };
 const answer=e.kernel.requestTakeover(e.who,e.executionId,{activationId:e.open.activationId,writerEpoch:1});assert.equal(answer.ok,false);const after=h.accepted(e.kernel.inspect(e.who,e.executionId));assert.deepEqual({...after,refusals:afterCallback.refusals},afterCallback);
 assert.equal(answer.error.classification,({terminal:'terminal_destination',resolved:'no_unresolved_exchange',newExchange:'stale_exchange',nestedTakeover:'stale_exchange',codeHold:'recovery_held'})[action]);
 assert.deepEqual(after.refusals,[...afterCallback.refusals,answer.error]);
 rows.push({method:'requestTakeover',path:'safety callback: '+action,classification:answer.error.classification,wholeView:'callback decision plus only outer refusal'});
}
console.log(JSON.stringify({purpose:'Reachability and clean behavior of exits absent from fault-child SCENARIOS; no injected faults or production mutations.',rows},null,2));
