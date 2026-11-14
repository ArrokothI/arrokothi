import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as turn } from 'node:timers/promises';
import { scriptedRig } from '../../../../../packages/sdk/tests/bridge-rig.ts';
import { deferred, models, answerAgent } from '../../../../../packages/sdk/tests/bridge-fixtures.ts';
import { createApplication } from '../../../../../packages/sdk/src/index.ts';
import { InMemoryRuntimeStore, createNoInlineWaitBudget, createDeferredModelProvider } from '../../../../../packages/core/src/reference/index.ts';

test('D04 idle-only reconciliation starves a settled READY child while another member continues', async t => {
  const release = deferred(); let calls = 0;
  const rig = await scriptedRig({
    root: [{do:'spawn',definitionId:'child',definitionVersion:1,await:false, requestedOperations:[{capability:'test',operation:'slow'}]}, ...Array.from({length:100},()=>({do:'continue'})), {do:'await',eventKinds:['external.input']}],
    child:[{do:'use_capability',capability:'test',operation:'slow'}, {do:'complete'}],
  }, {async execute(){ calls++; await release.promise; return {status:'success',observation:'ok'}; }});
  const tick = async () => { rig.host.pump(); rig.host.dispatchReady(); await rig.host.idle(2); };
  let faults=0, child, childSteps=0, rootSteps=0;
  try {
    for(let i=0;i<10 && calls===0;i++) await tick();
    assert.equal(calls,1);
    child=(await rig.driver.harness.childExecutionLinksOf(rig.executionId))[0].childExecutionId;
    const read=rig.store.readExecution.bind(rig.store);
    rig.store.readExecution=async id=>{
      if(id===child && faults===0 && new Error().stack.includes('LineageScheduler.enqueue')) { faults++; throw Error('lost child enqueue'); }
      return read(id);
    };
    release.resolve();
    for(let i=0;i<100 && faults===0;i++) await turn();
    assert.equal(faults,1);
    const off=rig.driver.onStep(record=>{ if(record.executionId===child) childSteps++; else rootSteps++; });
    for(let i=0;i<20;i++) await tick();
    const facts={faults,calls,rootSteps,childSteps,child:(await read(child)).lifecycle,queued:rig.driver.scheduler.queue.map(x=>x.executionId===child?'child':'root'),holds:rig.host.inspect(rig.executionId).recoveryHolds};
    t.diagnostic(JSON.stringify(facts));
    assert.equal(facts.child,'READY'); assert.equal(childSteps,0); assert.ok(rootSteps>=20); assert.equal(facts.holds.length,0);
    rig.driver.scheduler.schedule(child,rig.executionId);
    for(let i=0;i<4;i++) await tick();
    assert.ok(childSteps>0,'control: scheduling the omitted member lets it run');
    assert.equal(calls,1,'no repeated capability dispatch'); off();
  } finally { release.resolve(); rig.host.coordinator.cancelExecution(rig.host.caller,rig.executionId); await rig.driver.cancellationSettled(rig.executionId); await rig.driver.cascade(rig.executionId); }
});

test('postcommit failure plus a cleanup read failure silently loses the exception report', async t => {
  let armed=false, faults=0;
  class Store extends InMemoryRuntimeStore {
    async readExecution(id) {
      const stack=new Error().stack;
      if(armed && (stack.includes('LegacyDriver.collect') || stack.includes('LegacyDriver.cascade'))) { faults++; throw Error('native reads unavailable'); }
      return super.readExecution(id);
    }
  }
  const provider=createDeferredModelProvider('slow'); const store=new Store();
  const app=createApplication({models:models(provider),runtime:{store,inlineWait:createNoInlineWaitBudget()}});
  const {executionId}=await app.start({definition:answerAgent(),input:{label:'user',payload:'q'}});
  try {
    await app.runUntilBlocked(executionId,{timeoutMs:30,pollIntervalMs:1});
    armed=true; provider.settle({text:'ready'});
    for(let i=0;i<100 && faults<2;i++) await turn();
    const run=await app.runUntilBlocked(executionId,{timeoutMs:50,pollIntervalMs:1});
    t.diagnostic(JSON.stringify({faults,kernel:run.kernel.state,native:run.execution.lifecycle,holds:run.kernel.recoveryHolds}));
    assert.equal(faults,2); assert.equal(run.kernel.state,'RUNNING'); assert.equal(run.execution.lifecycle,'READY'); assert.deepEqual(run.kernel.recoveryHolds,[]);
  } finally { armed=false; await app.cancel(executionId); }
});
