import assert from 'node:assert/strict';
import { ExecutionCoordinator } from '../../../../../packages/kernel/src/index.ts';
import { accepted,caller,createRequest,recordingDriver } from '../../../../../packages/kernel/tests/harness.ts';
const who=caller('reviewer');const kernel=new ExecutionCoordinator({driver:recordingDriver()});
const {executionId}=accepted(kernel.createExecution(who,createRequest()));
const open=accepted(kernel.dispatch(who,executionId,{bound:1}));const foreign={value:777};
try {
 accepted(kernel.reportProtocolFailure(who,executionId,{get activationId(){Object.defineProperty(Object.prototype,'resultingEpoch',{value:foreign,configurable:true});return open.activationId;},writerEpoch:1,diagnostic:'test'}));
} finally {delete Object.prototype.resultingEpoch;}
const history=accepted(kernel.inspect(who,executionId)).recoveryHistory[0];
const before=JSON.stringify(history);foreign.value=888;const after=JSON.stringify(accepted(kernel.inspect(who,executionId)).recoveryHistory[0]);
assert.equal(history.resultingEpoch,foreign);assert.notEqual(before,after);
console.log(JSON.stringify({outerRecordFrozen:Object.isFrozen(history),foreignFrozen:Object.isFrozen(foreign),before:JSON.parse(before),after:JSON.parse(after)}));
console.log('Candidate bug reproduced: caller mutation changes retained history after boundary returns. Exit 0 confirms reproducer, not intended behavior.');
