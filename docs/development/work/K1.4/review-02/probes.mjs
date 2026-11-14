import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as turn } from 'node:timers/promises';
import { createApplication } from '../../../../../packages/sdk/src/index.ts';
import { InMemoryRuntimeStore, createNoInlineWaitBudget, createCapabilityCatalog, createAllowListAuthorizer } from '../../../../../packages/core/src/reference/index.ts';
import { CommitSignallingStore } from '../../../../../packages/sdk/src/legacy-bridge/commit-signal-store.ts';
import { LineageScheduler } from '../../../../../packages/sdk/src/legacy-bridge/lineage-scheduler.ts';
import { LegacyDriver } from '../../../../../packages/sdk/src/legacy-bridge/driver.ts';
import { deferred, functionWorkflow, allowDocs, callingWorkflow, chatAgent, answerAgent, models } from '../../../../../packages/sdk/tests/bridge-fixtures.ts';
import { ScriptedModelProvider, createDeferredModelProvider } from '../../../../../packages/core/src/reference/index.ts';
import { BatchLedger } from '../../../../../packages/sdk/src/legacy-bridge/ledger.ts';
import { scriptedRig } from '../../../../../packages/sdk/tests/bridge-rig.ts';

test('facade preserves real commit and rollback state and original result/error', async () => {
  const store = new InMemoryRuntimeStore();
  const app = createApplication({ runtime: { store }, functions: { work: () => ({ status: 'completed', result: null }) } });
  const { executionId } = await app.start({ definition: functionWorkflow('transaction', 'work') });
  const scheduler = new LineageScheduler(store);
  scheduler.learn(executionId, executionId);
  const facade = new CommitSignallingStore(store, scope => scheduler.signal(scope));
  const original = await store.readExecution(executionId);
  const woke = scheduler.nextWork(executionId);
  const result = {};
  assert.equal(await facade.transact(executionId, async tx => {
    const current = await tx.executions.get(executionId);
    await tx.executions.update({ ...current, revision: current.revision + 1 }, current.revision);
    return result;
  }), result);
  await woke;
  const committed = await store.readExecution(executionId);
  assert.equal(committed.revision, original.revision + 1);
  const wokeRollback = scheduler.nextWork(executionId);
  const failure = new Error('rollback sentinel');
  await assert.rejects(facade.transact(executionId, async tx => {
    const current = await tx.executions.get(executionId);
    await tx.executions.update({ ...current, revision: current.revision + 1 }, current.revision);
    throw failure;
  }), error => error === failure);
  await wokeRollback;
  assert.deepEqual(await store.readExecution(executionId), committed);
  await app.cancel(executionId);
});

test('a hold-cascade removal is non-equivalent for an accounting failure with a live child', async t => {
  async function exercise(ablate) {
    const app = createApplication({ models: models(new ScriptedModelProvider({ id: 's', steps: [{ output: { text: 'One' } }, { output: { text: 'Two' } }] })), authorizer: allowDocs() });
    await app.register(chatAgent());
    const { executionId } = await app.start({ definition: callingWorkflow('chat'), structuralSpawnBudget: 1, input: { label: 'user', payload: 'hello' } });
    const first = await app.runUntilBlocked(executionId);
    assert.equal(first.reason, 'input_required');
    assert.notEqual(first.waitingExecutionId, executionId);
    const encode = BatchLedger.prototype.encode;
    const endLineage = LegacyDriver.prototype.endLineage;
    let holdCalls = 0;
    BatchLedger.prototype.encode = () => { throw new Error('forced accounting encoding failure'); };
    LegacyDriver.prototype.endLineage = function (id, site) {
      if (site === 'hold') { holdCalls++; if (ablate) return Promise.resolve(); }
      return endLineage.call(this, id, site);
    };
    try {
      await app.input(executionId, { label: 'user', payload: 'go', destination: first.waitingExecutionId });
      const run = await app.runUntilBlocked(executionId, { timeoutMs: 60, pollIntervalMs: 1 });
      const root = await app.harness.inspect(executionId);
      const child = await app.harness.inspect(first.waitingExecutionId);
      const facts = { ablate, holdCalls, root: root.lifecycle, child: child.lifecycle, hold: run.kernel.recoveryHolds[0]?.cause };
      t.diagnostic(JSON.stringify(facts));
      assert.equal(holdCalls, 1);
      assert.equal(facts.hold, 'protocol_failure');
      for (const member of [root, child]) assert.ok(['COMPLETED', 'FAILED', 'CANCELLED'].includes(member.lifecycle), `live member remains ${member.lifecycle}`);
    } finally {
      BatchLedger.prototype.encode = encode;
      LegacyDriver.prototype.endLineage = endLineage;
      await app.cancel(executionId);
    }
  }
  await exercise(false);
  await assert.rejects(exercise(true), assert.AssertionError);
});

test('a delayed commit signal wakes an already parked no-wake lineage', async () => {
  const release = deferred();
  const signalRelease = deferred();
  let armed = false;
  let signals = 0;
  const original = LegacyDriver.prototype.gate;
  LegacyDriver.prototype.gate = function (point) {
    if (armed && point === 'signal') { signals++; return signalRelease.promise; }
    return undefined;
  };
  let rig;
  try {
    rig = await scriptedRig({ root: [
      { do: 'use_capability', capability: 'test', operation: 'slow', await: false },
      { do: 'await', eventKinds: ['external.input'] },
    ] }, { async execute() { await release.promise; return { status: 'success', observation: 'ok' }; } });
    assert.equal(await rig.drive(40), 'RUNNING');
    armed = true;
    release.resolve();
    for (let n = 0; n < 200 && signals === 0; n++) await turn();
    assert.ok(signals > 0);
    assert.equal(await rig.drive(30), 'RUNNING', 'no native enqueue accompanies this settlement');
    signalRelease.resolve();
    assert.equal(await rig.drive(1000), 'WAITING');
  } finally {
    release.resolve(); signalRelease.resolve();
    LegacyDriver.prototype.gate = original;
    if (rig) await rig.driver.cascade(rig.executionId);
  }
});

test('a one-shot post-commit enqueue lookup failure cannot silently strand settled native work', async t => {
  const release = deferred();
  let armed = false;
  let faults = 0;
  let handled = 0;
  class Store extends InMemoryRuntimeStore {
    async readExecution(id) {
      if (armed && new Error().stack.includes('LineageScheduler.enqueue')) {
        armed = false; faults++;
        throw new Error('one post-commit lineage lookup failed');
      }
      return super.readExecution(id);
    }
  }
  const store = new Store();
  const app = createApplication({
    runtime: { store, inlineWait: createNoInlineWaitBudget() },
    capabilities: {
      catalog: createCapabilityCatalog(['slow', 'human'].map(operation => ({ capability: 'test', operation, consequential: false, description: operation, input: { kind: 'object', fields: {} } }))),
      executor: { async execute() { await release.promise; return { status: 'success', observation: 'settled' }; } },
    },
    authorizer: createAllowListAuthorizer({ grants: [{ capability: 'test' }] }),
    confirmationPolicy: { requires(request) { return { required: request.proposal.operation === 'human' }; } },
    functions: { work: context => {
      handled++;
      return context.observations.length ? { status: 'completed', result: null } : { status: 'awaitEffects', effects: [
        { key: 'slow', capability: 'test', operation: 'slow', input: {} },
        { key: 'human', capability: 'test', operation: 'human', input: {} },
      ] };
    } },
  });
  const { executionId } = await app.start({ definition: functionWorkflow('enqueue-fault', 'work'), operationAuthority: { operations: ['slow', 'human'].map(operation => ({ capability: 'test', operation })) } });
  try {
    await app.runUntilBlocked(executionId, { timeoutMs: 30, pollIntervalMs: 1 });
    assert.equal(handled, 1);
    armed = true;
    release.resolve();
    for (let n = 0; n < 200 && faults === 0; n++) await turn();
    assert.equal(faults, 1, 'the selected post-commit lookup failed once');
    const run = await app.runUntilBlocked(executionId, { timeoutMs: 60, pollIntervalMs: 1 });
    const again = await app.runUntilBlocked(executionId, { timeoutMs: 60, pollIntervalMs: 1 });
    const operations = await app.harness.pendingOperationsOf(executionId);
    const facts = { faults, handled, reason: run.reason, secondReason: again.reason, kernel: again.kernel.state, native: again.execution.lifecycle, queued: await app.services.scheduler.queuedCount(), holds: again.kernel.recoveryHolds, operations: operations.map(op => ({ status: op.status, dispatch: op.dispatch })) };
    t.diagnostic(JSON.stringify(facts));
    assert.ok(again.kernel.state !== 'RUNNING' || again.kernel.recoveryHolds.length > 0,
      'settled native work must progress or expose an explicit failure/hold; an unqueued READY member is not an in-flight operation');
  } finally {
    armed = false; release.resolve(); await app.cancel(executionId);
  }
});

test('the same lost-enqueue mechanism strands a settled model resumption', async t => {
  let armed = false;
  let faults = 0;
  class Store extends InMemoryRuntimeStore {
    async readExecution(id) {
      if (armed && new Error().stack.includes('LineageScheduler.enqueue')) {
        armed = false; faults++; throw new Error('one post-commit lineage lookup failed');
      }
      return super.readExecution(id);
    }
  }
  const provider = createDeferredModelProvider('slow');
  const app = createApplication({ models: models(provider), runtime: { store: new Store(), inlineWait: createNoInlineWaitBudget() } });
  const { executionId } = await app.start({ definition: answerAgent(), input: { label: 'user', payload: 'q' } });
  try {
    assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 30, pollIntervalMs: 1 })).kernel.state, 'RUNNING');
    armed = true; provider.settle({ text: 'Ready' });
    for (let n = 0; n < 200 && faults === 0; n++) await turn();
    assert.equal(faults, 1);
    const run = await app.runUntilBlocked(executionId, { timeoutMs: 60, pollIntervalMs: 1 });
    const again = await app.runUntilBlocked(executionId, { timeoutMs: 60, pollIntervalMs: 1 });
    const resumptions = await app.harness.controllerResumptionsOf(executionId);
    assert.deepEqual(resumptions.map(r => r.state), ['settled']);
    t.diagnostic(JSON.stringify({ faults, reason: run.reason, secondReason: again.reason, kernel: again.kernel.state, native: again.execution.lifecycle, queued: await app.services.scheduler.queuedCount(), holds: again.kernel.recoveryHolds, resumptions: resumptions.map(r => ({ state: r.state })) }));
    assert.ok(again.kernel.state !== 'RUNNING' || again.kernel.recoveryHolds.length > 0, 'a settled model resumption must progress or expose an explicit failure/hold');
  } finally { armed = false; await app.cancel(executionId); }
});
