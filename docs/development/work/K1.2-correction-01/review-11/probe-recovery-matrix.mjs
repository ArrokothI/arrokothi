import assert from 'node:assert/strict';
import { ExecutionCoordinator } from '/tmp/arrokothi-review-r8/packages/kernel/src/index.ts';
import { accepted, caller, createRequest, recordingDriver, outcomeFor, submissionFor } from '/tmp/arrokothi-review-r8/packages/kernel/tests/harness.ts';
const author = caller('reviewer', 'tenant-a');
const available = {definitionRevisions:['weekly-report@3'],runtimeContractRevisions:['runtime-contract@1'],progressCodecs:['inline-json@1']};
const rows=[];
for (const transition of ['protocol-enter','code-enter','code-update','code-clear','takeover-clear','outcome-end']) {
 for (const mode of ['control','data','throw','reenter']) {
  if (mode==='reenter' && ['takeover-clear','outcome-end'].includes(transition)) continue;
  const driver=recordingDriver(),kernel=new ExecutionCoordinator({driver});
  const executionId=accepted(kernel.createExecution(author,createRequest({creationKey:transition+mode}))).executionId;
  const open=accepted(kernel.dispatch(author,executionId,{bound:1}));
  const code=(av)=>kernel.recoverExecution(author,executionId,{activationId:open.activationId,available:av});
  if(['code-update','code-clear'].includes(transition)) accepted(code({...available,definitionRevisions:[]}));
  if(['takeover-clear','outcome-end'].includes(transition)) accepted(kernel.reportProtocolFailure(author,executionId,{activationId:open.activationId,writerEpoch:1,diagnostic:'initial'}));
  const before=accepted(kernel.inspect(author,executionId));
  const grant=submissionFor(driver,open.activationId);
  const valid=outcomeFor(executionId,open,{next:{step:'complete',result:{done:true}}});
  let reads=0,answer,thrown,nested;
  const install=()=>{
   if(mode==='control') return;
   const descriptor=Object.create(null);descriptor.configurable=true;
   if(mode==='data') descriptor.value=777;
   else descriptor.get=()=>{reads++;if(mode==='throw') throw Error('ambient history callback');delete Object.prototype.resultingEpoch;nested=kernel.submitOutcome(author,valid,grant);return undefined;};
   Object.defineProperty(Object.prototype,'resultingEpoch',descriptor);
  };
  const request={get activationId(){install();return open.activationId;},writerEpoch:1,diagnostic:'unclassifiable',available:transition==='code-clear'?available:transition==='code-update'?{...available,progressCodecs:[]}:{...available,definitionRevisions:[]}};
  try {
   if(transition==='protocol-enter') answer=kernel.reportProtocolFailure(author,executionId,request);
   else if(transition==='takeover-clear') answer=kernel.requestTakeover(author,executionId,request);
   else if(transition==='outcome-end') {Object.defineProperty(valid,'activationId',{get(){install();return open.activationId;},configurable:true});answer=kernel.submitOutcome(author,valid,grant);}
   else answer=kernel.recoverExecution(author,executionId,request);
  } catch(e){thrown=e.message;}
  finally{delete Object.prototype.resultingEpoch;}
  const after=accepted(kernel.inspect(author,executionId));
  const newHistory=after.recoveryHistory.slice(before.recoveryHistory.length);
  const row={transition,mode,reads,thrown,answer,nested,before:{state:before.state,holds:before.recoveryHolds,history:before.recoveryHistory},after:{state:after.state,holds:after.recoveryHolds,history:after.recoveryHistory,progressRevision:after.progressRevision,receipts:after.receipts.length}};
  rows.push(row);
  console.log(JSON.stringify(row));
  if(mode==='control') {assert.equal(answer.ok,true);assert.equal(newHistory.length,1);}
  if(['takeover-clear','outcome-end'].includes(transition)) {assert.equal(reads,0);assert.equal(answer.ok,true);assert.equal(newHistory.length,1);assert.equal(Object.hasOwn(newHistory[0],'resultingEpoch'),transition==='takeover-clear');}
 }
}
assert.equal(rows.length,22);
console.log('Reproducer completed: 22 cases; control and own-field/Outcome paths verified. Data/throw/reenter rows intentionally expose candidate defects, not passing intended-behavior assertions.');
if (process.argv.includes('--expect-correct')) {
 const failures=rows.filter(row=>row.thrown!==undefined || row.reads!==0 || (row.transition!=='takeover-clear' && row.after.history.some(h=>Object.hasOwn(h,'resultingEpoch'))));
 console.log(JSON.stringify({intendedOracle:'No inherited resultingEpoch read, no invented coordinate, and no boundary exception',cases:rows.length,violations:failures.map(r=>`${r.transition}/${r.mode}`)}));
 assert.equal(failures.length,0,'Recovery history must be built solely from Kernel-owned observations before state mutation');
}
