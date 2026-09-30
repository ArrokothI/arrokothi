// Independent reviewer comparison across complete observable views, with one queued nonbatch input.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ExecutionCoordinator} from '../../../../../packages/kernel/src/index.ts';
import {accepted, caller, createRequest, recordingDriver, outcomeFor, submissionFor} from '../../../../../packages/kernel/tests/harness.ts';
const who = caller('review10', 'tenant-a');
const available = {definitionRevisions:['weekly-report@3'], runtimeContractRevisions:['runtime-contract@1'], progressCodecs:['inline-json@1']};
const missing = {...available, definitionRevisions:[]};
const results = [];
for (const transition of ['protocol-enter','code-enter','code-update','code-clear','takeover-clear','outcome-end']) {
  let control;
  for (const mode of ['control','data','mutable','throw','reenter']) {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({driver});
    const executionId = accepted(kernel.createExecution(who, createRequest({creationKey:transition}))).executionId;
    const open = accepted(kernel.dispatch(who, executionId, {bound:1}));
    const grant = submissionFor(driver, open.activationId);
    accepted(kernel.submitInput(who, {destination:executionId, requestKey:'outside-batch', kind:'update',payload:{newer:true}}));
    const code = av => kernel.recoverExecution(who, executionId, {activationId:open.activationId, available:av});
    if (transition==='code-update' || transition==='code-clear') accepted(code(missing));
    if (transition==='takeover-clear' || transition==='outcome-end') accepted(kernel.reportProtocolFailure(who, executionId, {activationId:open.activationId, writerEpoch:1, diagnostic:'initial'}));
    const before = accepted(kernel.inspect(who, executionId));
    const complete = outcomeFor(executionId, open, {next:{step:'complete',result:{done:true}}, emissions:[{emissionKey:'e',value:{output:true}}]});
    let reads = 0;
    let nested = 0;
    const foreign = {epoch:777};
    const saved = Object.getOwnPropertyDescriptor(Object.prototype, 'resultingEpoch');
    const install = () => {
      if (mode==='control') return;
      const descriptor = Object.create(null);
      descriptor.configurable = true;
      if (mode==='data' || mode==='mutable') descriptor.value = mode==='data' ? 777 : foreign;
      else descriptor.get = () => {
        reads++;
        if (mode==='throw') throw Error('review10 inherited read');
        delete Object.prototype.resultingEpoch;
        nested++;
        return kernel.submitOutcome(who, complete, grant);
      };
      Object.defineProperty(Object.prototype, 'resultingEpoch', descriptor);
    };
    const request = {get activationId(){install();return open.activationId;},writerEpoch:1,diagnostic:'unclassifiable',available:transition==='code-clear'?available:transition==='code-update'?{...available,progressCodecs:[]}:missing};
    let answer;
    try {
      if (transition==='protocol-enter') answer=kernel.reportProtocolFailure(who,executionId,request);
      else if (transition==='takeover-clear') answer=kernel.requestTakeover(who,executionId,request);
      else if (transition==='outcome-end') {
        Object.defineProperty(complete,'activationId',{get(){install();return open.activationId;},configurable:true});
        answer=kernel.submitOutcome(who,complete,grant);
      } else answer=kernel.recoverExecution(who,executionId,request);
      assert.equal(answer.ok,true);
    } finally {
      if (saved) Object.defineProperty(Object.prototype,'resultingEpoch',saved);
      else delete Object.prototype.resultingEpoch;
    }
    const after = accepted(kernel.inspect(who,executionId));
    foreign.epoch = 999;
    assert.deepEqual(accepted(kernel.inspect(who,executionId)),after,'a foreign mutation changes no retained/projection field');
    assert.equal(reads,0);
    assert.equal(nested,0);
    assert.equal(after.recoveryHistory.length,before.recoveryHistory.length+1);
    assert.equal(after.progressRevision,transition==='outcome-end'?1:0);
    assert.equal(after.state,transition==='outcome-end'?'COMPLETED':'RUNNING');
    assert.equal(after.receipts.length,before.receipts.length+(['takeover-clear','outcome-end'].includes(transition)?1:0));
    if (transition==='outcome-end') {
      assert.equal(after.acknowledged.length,1);
      assert.equal(after.terminalDispositions.length,1);
      assert.equal(after.emissions.length,1);
    } else {
      assert.deepEqual(after.mailbox,before.mailbox);
      assert.deepEqual(after.emissions,before.emissions);
      assert.deepEqual(after.result,before.result);
      assert.equal(after.activation.writerEpoch,transition==='takeover-clear'?2:1);
    }
    const observation = {before,answer,after};
    if (mode==='control') control = observation;
    else assert.deepEqual(observation,control,'pollution must change no answer or field of either whole view');
    results.push({transition,mode,reads,nested,observation});
  }
}
assert.equal(results.length,30);
fs.writeFileSync('docs/development/work/K1.2-correction-01/review-10/whole-view-results.json',JSON.stringify(results,null,2)+'\n');
console.log('30/30 whole-view comparisons passed; no inherited reads/reentry, no foreign-reference mutation, and receipt/progress/mailbox/output expectations passed.');
