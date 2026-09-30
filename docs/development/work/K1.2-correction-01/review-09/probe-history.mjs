import assert from 'node:assert/strict';
import { ExecutionCoordinator } from '../../../../../packages/kernel/src/index.ts';
import { accepted, caller, createRequest, recordingDriver } from '../../../../../packages/kernel/tests/harness.ts';
const author = caller('reviewer', 'tenant-a');
for (const mode of ['data', 'throw']) {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const created = accepted(kernel.createExecution(author, createRequest({creationKey: mode})));
  const open = accepted(kernel.dispatch(author, created.executionId, {bound: 1}));
  const before = accepted(kernel.inspect(author, created.executionId));
  let reads = 0, answer, thrown;
  const request = {
    get activationId() {
      Object.defineProperty(Object.prototype, 'resultingEpoch', mode === 'data'
        ? {value: 777, configurable: true}
        : {get() { reads++; throw new Error('ambient history callback'); }, configurable: true});
      return open.activationId;
    },
    writerEpoch: 1,
    diagnostic: 'unclassifiable'
  };
  try { answer = kernel.reportProtocolFailure(author, created.executionId, request); }
  catch (e) { thrown = e.message; }
  finally { delete Object.prototype.resultingEpoch; }
  const after = accepted(kernel.inspect(author, created.executionId));
  console.log(JSON.stringify({mode, reads, thrown, answer, beforeHolds: before.recoveryHolds.length,
    afterHolds: after.recoveryHolds.length, history: after.recoveryHistory, receipts: after.receipts.length}));
  if (mode === 'data') assert.equal(after.recoveryHistory[0].resultingEpoch, 777);
  else { assert.equal(reads, 1); assert.equal(after.recoveryHolds.length, 1); assert.equal(after.recoveryHistory.length, 0); assert.equal(thrown, 'ambient history callback'); }
}
