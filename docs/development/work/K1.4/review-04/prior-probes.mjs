/** Independent review-03 counterexamples. Run with Node 26.10; production source is untouched. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as turn } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { createApplication } from '../../../../../packages/sdk/src/index.ts';
import { InMemoryRuntimeStore, InMemoryDefinitionStore, ScriptedModelProvider } from '../../../../../packages/core/src/reference/index.ts';
import { LegacyDriver } from '../../../../../packages/sdk/src/legacy-bridge/driver.ts';
import { functionWorkflow, models, chatAgent, callingWorkflow, allowDocs } from '../../../../../packages/sdk/tests/bridge-fixtures.ts';
import { scriptedRig } from '../../../../../packages/sdk/tests/bridge-rig.ts';

const terminal = state => ['COMPLETED','FAILED','CANCELLED'].includes(state);

for (const fault of ['applyOutcome', 'definition lookup']) {
  test(`a one-shot ${fault} failure after READY->RUNNING must not certify clean cleanup`, async t => {
    let faults = 0, calls = 0;
    class Store extends InMemoryRuntimeStore {
      transact(...args) {
        if (fault === 'applyOutcome' && faults === 0 && new Error().stack.includes('Harness.applyOutcome')) {
          faults++; return Promise.reject(Error('review: applyOutcome transaction unavailable'));
        }
        return super.transact(...args);
      }
    }
    class Definitions extends InMemoryDefinitionStore {
      async get(...args) {
        if (fault === 'definition lookup' && faults === 0 && new Error().stack.includes('Harness.runController')) {
          faults++; throw Error('review: definition lookup unavailable');
        }
        return super.get(...args);
      }
    }
    const store = new Store();
    const app = createApplication({runtime:{store,definitions:new Definitions()},functions:{work:()=>{calls++;return {status:'completed',result:'ok'};}}});
    const {executionId} = await app.start({definition:functionWorkflow('cleanup-fault','work'),input:{label:'user',payload:'go'}});
    const run = await app.runUntilBlocked(executionId,{timeoutMs:500,pollIntervalMs:1});
    const request = await app.harness.cancellationRequestOf(executionId);
    const later = await app.runUntilIdle();
    const nativeLater = await app.harness.inspect(executionId);
    t.diagnostic(JSON.stringify({fault,faults,calls,kernel:run.kernel.state,native:run.execution.lifecycle,nativeLater:nativeLater.lifecycle,cancellation:request?.state,holds:run.kernel.recoveryHolds,acknowledged:run.kernel.acknowledged.length,laterSteps:later.length,result:run.kernel.result}));
    assert.equal(faults,1); assert.equal(later.length,0);
    assert.ok(terminal(nativeLater.lifecycle) || run.kernel.recoveryHolds.some(h=>h.cause==='protocol_failure'), 'cleanup must end the logical lineage or report it unconfirmed');
  });
}

async function appCancellation(ablate) {
  let armed=false, faults=0;
  class Store extends InMemoryRuntimeStore {
    async readExecution(id) {
      if(armed && faults===0 && new Error().stack.includes('LegacyDriver.cascade')) {faults++; throw Error('review: request cleanup read fails once');}
      return super.readExecution(id);
    }
  }
  const store = new Store();
  const app = createApplication({runtime:{store},models:models(new ScriptedModelProvider({id:'scripted',steps:[{output:{text:'hello'}}]})),authorizer:allowDocs()});
  await app.register(chatAgent());
  const {executionId}=await app.start({definition:callingWorkflow('chat'),structuralSpawnBudget:1,input:{label:'user',payload:'hello'}});
  assert.equal((await app.runUntilBlocked(executionId)).reason,'input_required');
  const child=(await app.harness.childExecutionLinksOf(executionId))[0].childExecutionId;
  const end=LegacyDriver.prototype.endLineage;
  LegacyDriver.prototype.endLineage=function(id,site){return ablate && site==='cancel.application' ? Promise.resolve() : end.call(this,id,site);};
  try {
    armed=true; await app.cancel(executionId);
    const facts={ablate,faults,kernel:app.inspect(executionId).state,members:await Promise.all([executionId,child].map(async id=>(await app.harness.inspect(id)).lifecycle)),later:(await app.runUntilIdle()).length};
    return facts;
  } finally { LegacyDriver.prototype.endLineage=end; }
}
test('cancel.application is non-equivalent after one rejected request cascade',async t=>{
  const baseline=await appCancellation(false), removed=await appCancellation(true);
  t.diagnostic(JSON.stringify({baseline,removed}));
  assert.equal(baseline.faults,1);assert.equal(removed.faults,1);
  assert.ok(baseline.members.every(terminal));
  assert.ok(removed.members.some(x=>!terminal(x)), 'removal has an observable behavioural effect');
});

async function exchangeStartCancellation(ablate) {
  const rig=await scriptedRig({root:[{do:'await',eventKinds:['external.input']}]});
  let faults=0;
  const read=rig.store.readExecution.bind(rig.store);
  rig.store.readExecution=async id=>{
    if(faults===0 && new Error().stack.includes('LegacyDriver.cascade')) {faults++;throw Error('review: request cleanup read fails once');}
    return read(id);
  };
  const end=rig.driver.endLineage.bind(rig.driver);
  rig.driver.endLineage=(id,site)=>ablate && site==='cancel.exchange-start' ? Promise.resolve() : end(id,site);
  rig.host.dispatchReady();
  assert.ok(rig.host.coordinator.cancelExecution(rig.host.caller,rig.executionId).ok);
  await rig.driver.cancellationSettled(rig.executionId);
  for(let i=0;i<30;i++) await turn();
  return {ablate,faults,kernel:rig.host.inspect(rig.executionId).state,members:await rig.members(),busy:rig.driver.busy};
}
test('cancel.exchange-start is non-equivalent when a pre-existing root survives a rejected request cascade',async t=>{
  const baseline=await exchangeStartCancellation(false),removed=await exchangeStartCancellation(true);
  t.diagnostic(JSON.stringify({baseline,removed}));
  assert.equal(baseline.faults,1);assert.equal(removed.faults,1);
  assert.ok(baseline.members.every(x=>terminal(x.lifecycle)));
  assert.ok(removed.members.some(x=>!terminal(x.lifecycle)));
});

async function forwardLoopCancellation(ablate) {
  const rig=await scriptedRig({root:[{do:'await',eventKinds:['external.input']}]},undefined,{startInput:{label:'user',payload:'go'}});
  let faults=0, reached, release;
  const ready=new Promise(r=>reached=r), gate=new Promise(r=>release=r);
  const read=rig.store.readExecution.bind(rig.store);
  let held=false;
  rig.store.readExecution=async id=>{
    const stack=new Error().stack;
    if(!held && stack.includes('LegacyDriver.exchange') && !stack.includes('LegacyDriver.cascade')) {
      held=true; const value=await read(id); reached(); await gate; return value;
    }
    if(faults===0 && stack.includes('LegacyDriver.cascade')) {faults++;throw Error('review: request cleanup read fails once');}
    return read(id);
  };
  const end=rig.driver.endLineage.bind(rig.driver);
  rig.driver.endLineage=(id,site)=>ablate && site==='cancel.forward-loop' ? Promise.resolve() : end(id,site);
  rig.host.dispatchReady(); await ready;
  assert.ok(rig.host.coordinator.cancelExecution(rig.host.caller,rig.executionId).ok);
  await rig.driver.cancellationSettled(rig.executionId); release();
  for(let i=0;i<30;i++) await turn();
  return {ablate,faults,kernel:rig.host.inspect(rig.executionId).state,members:await rig.members(),busy:rig.driver.busy};
}
test('cancel.forward-loop is non-equivalent after one rejected request cascade',async t=>{
  const baseline=await forwardLoopCancellation(false),removed=await forwardLoopCancellation(true);
  t.diagnostic(JSON.stringify({baseline,removed}));
  assert.equal(baseline.faults,1);assert.equal(removed.faults,1);
  assert.ok(baseline.members.every(x=>terminal(x.lifecycle)));
  assert.ok(removed.members.some(x=>!terminal(x.lifecycle)));
});

// Execute the candidate's exact census function, not a reviewer reimplementation.
const root=resolve(import.meta.dirname,'../../../../..');
const oracle=readFileSync(resolve(root,'packages/sdk/tests/bridge-terminate.test.ts'),'utf8');
const start=oracle.indexOf('const NAMES = '),stop=oracle.indexOf('async function sdkSources()');
assert.ok(start>=0&&stop>start);
const js=ts.transpileModule(oracle.slice(start,stop),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const census=Function('ts',js+'\nreturn cleanupCensus;')(ts);
const driver=readFileSync(resolve(root,'packages/sdk/src/legacy-bridge/driver.ts'),'utf8');
const app=readFileSync(resolve(root,'packages/sdk/src/application.ts'),'utf8');
const base={'driver.ts':driver,'application.ts':app};
assert.deepEqual(census(base).errors,[]);
for(const [name,method] of [
  ['static template element access','probe(id: string) { return this[`endLineage`](id, "hold"); }'],
  ['quoted destructuring alias','probe(id: string) { const { "endLineage": end } = this; return end.call(this, id, "hold"); }'],
  ['quoted native-cancel alias','probe(id: string) { const { "cancelExecution": cancel } = this.harness; return cancel.call(this.harness, {executionId:id}); }'],
]) test(`cleanup census fails closed on ${name}`,t=>{
  const changed={...base,'driver.ts':driver.replace('export class LegacyDriver implements ExecutionDriver {','export class LegacyDriver implements ExecutionDriver {\n'+method)};
  const before=census(base),after=census(changed);
  t.diagnostic(JSON.stringify({name,errors:after.errors,baselineLabels:before.sites.length,mutatedLabels:after.sites.length}));
  assert.ok(after.errors.length>0 || after.sites.length!==before.sites.length,'the extra statically named cleanup route must not disappear');
});
