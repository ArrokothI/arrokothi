// Independent review 01 counterexamples. These assert the contract and FAIL at reviewed H.
// Run with Node v26.10.0: node --test docs/development/work/K1.4/review-01/probes.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as turn } from 'node:timers/promises';
import { createApplication } from '../../../../../packages/sdk/src/index.ts';
import {
  InMemoryRuntimeStore, ScriptedModelProvider, createNoInlineWaitBudget,
  createCapabilityCatalog, createAllowListAuthorizer,
} from '../../../../../packages/core/src/reference/index.ts';
import {
  chatAgent, callingWorkflow, models, allowDocs, functionWorkflow, deferred, ingressResults,
} from '../../../../../packages/sdk/tests/bridge-fixtures.ts';

test('control: an ordinary initial input is accounted for and a Function completes', async () => {
  const app = createApplication({ functions: { work: () => ({ status: 'completed', result: null }) } });
  const { executionId } = await app.start({ definition: functionWorkflow('control', 'work'), input: { label: 'user', payload: 'initial' } });
  const run = await app.runUntilBlocked(executionId);
  assert.equal(run.reason, 'completed');
  assert.equal(ingressResults(app, executionId).length, 1);
  assert.equal(ingressResults(app, executionId)[0].status, 'delivered');
});

test('K14-R1-01: settling native work between lineage reads must not commit a human wait', async t => {
  const release = deferred();
  let armed = false;
  let observed = false;
  let handled = 0;
  class RaceStore extends InMemoryRuntimeStore {
    async listPendingOperations(id) {
      // This supported async store port delays just the Driver read after its context read.
      // The stack selects the acceptance window; no records are forged or directly mutated.
      if (armed && new Error().stack.includes('LegacyDriver.lineage')) {
        armed = false;
        assert.equal((await super.readExecution(id)).lifecycle, 'WAITING');
        release.resolve();
        for (let n = 0; n < 200; n++) {
          if ((await super.readExecution(id)).lifecycle === 'READY') { observed = true; break; }
          await turn();
        }
        assert.ok(observed, 'fixture must settle the native operation inside the selected read window');
      }
      return super.listPendingOperations(id);
    }
  }
  const store = new RaceStore();
  const catalog = createCapabilityCatalog(['slow', 'human'].map(operation => ({
    capability: 'test', operation, consequential: false, description: operation,
    input: { kind: 'object', fields: {} },
  })));
  const app = createApplication({
    runtime: { store, inlineWait: createNoInlineWaitBudget() },
    capabilities: { catalog, executor: { async execute() {
      armed = true;
      await release.promise;
      return { status: 'success', observation: 'done' };
    } } },
    authorizer: createAllowListAuthorizer({ grants: [{ capability: 'test' }] }),
    confirmationPolicy: { requires(request) { return { required: request.proposal.operation === 'human' }; } },
    functions: { work: context => {
      handled++;
      return context.observations.length ? { status: 'completed', result: null } : {
        status: 'awaitEffects', effects: [
          { key: 'slow', capability: 'test', operation: 'slow', input: {} },
          { key: 'human', capability: 'test', operation: 'human', input: {} },
        ],
      };
    } },
  });
  const { executionId } = await app.start({
    definition: functionWorkflow('snapshot', 'work'),
    operationAuthority: { operations: ['slow', 'human'].map(operation => ({ capability: 'test', operation })) },
  });
  try {
    const run = await app.runUntilBlocked(executionId, { timeoutMs: 1000, pollIntervalMs: 1 });
    const again = await app.runUntilBlocked(executionId, { timeoutMs: 1000, pollIntervalMs: 1 });
    t.diagnostic(JSON.stringify({ observed, handled, reason: run.reason, kernel: run.kernel.state,
      native: run.execution.lifecycle, secondKernel: again.kernel.state, secondNative: again.execution.lifecycle,
      operations: (await app.harness.pendingOperationsOf(executionId)).map(op => ({ status: op.status, dispatch: op.dispatch, outcome: op.outcome?.status })),
    }));
    assert.ok(observed, 'the intended interleaving ran');
    assert.ok(!(again.kernel.state === 'WAITING' && again.execution.lifecycle === 'READY'),
      'Kernel WAITING strands READY native work, even across a second host run');
  } finally {
    release.resolve();
    await app.cancel(executionId);
  }
});

test('K14-R1-02: exact input retry keeps its originally selected child destination', async t => {
  const app = createApplication({
    models: models(new ScriptedModelProvider({ id: 'scripted', steps: [{ output: { text: 'One' } }] })),
    authorizer: allowDocs(),
  });
  await app.register(chatAgent(1));
  const { executionId } = await app.start({ definition: callingWorkflow('chat'), structuralSpawnBudget: 1,
    input: { label: 'user', payload: 'hello' } });
  const first = await app.runUntilBlocked(executionId);
  assert.equal(first.reason, 'input_required');
  assert.notEqual(first.waitingExecutionId, executionId);
  const request = { requestKey: 'reply', label: 'user', payload: 'again' };
  const accepted = await app.input(executionId, request);
  const end = await app.runUntilBlocked(executionId);
  // Control: retaining the originally selected destination still replays after termination.
  const explicit = await app.input(executionId, { ...request, destination: first.waitingExecutionId });
  assert.equal(explicit.eventId, accepted.eventId);
  t.diagnostic(JSON.stringify({ firstReason: first.reason, finalReason: end.reason, explicitReplay: explicit }));
  const replay = await app.input(executionId, request);
  assert.equal(replay.eventId, accepted.eventId, 'same caller key and content must replay the original Event');
});

test('K14-R1-03: failure before forwarding accounts for every acknowledged input', async t => {
  class FaultStore extends InMemoryRuntimeStore {
    armed = false;
    async readExecution(id) {
      if (this.armed) { this.armed = false; throw new Error('one read failed before forwarding'); }
      return super.readExecution(id);
    }
  }
  const store = new FaultStore();
  let calls = 0;
  const app = createApplication({ runtime: { store }, functions: { work: () => {
    calls++;
    return { status: 'completed', result: null };
  } } });
  const { executionId } = await app.start({ definition: functionWorkflow('discard', 'work'), input: { label: 'user', payload: 'initial' } });
  await app.input(executionId, { requestKey: 'later', label: 'user', payload: 'next' });
  store.armed = true;
  const run = await app.runUntilBlocked(executionId);
  const results = ingressResults(app, executionId);
  t.diagnostic(JSON.stringify({ reason: run.reason, calls, mailbox: run.kernel.mailbox, results }));
  assert.equal(run.reason, 'failed');
  assert.equal(calls, 0);
  assert.equal(run.kernel.mailbox.length, 2);
  for (const event of run.kernel.mailbox) {
    assert.equal(event.disposition.kind, 'acknowledged');
    assert.equal(results.find(result => result.eventId === event.eventId)?.status, 'discarded',
      `unforwarded acknowledged Event ${event.eventId} needs its discarded result`);
  }
});

test('K14-R1-04: the controller hook receives initialized readable services', async () => {
  let seen;
  let queued;
  const app = createApplication({ controllers: services => {
    seen = services.scheduler;
    assert.equal(typeof services.scheduler?.queuedCount, 'function', 'scheduler must exist during the hook');
    queued = services.scheduler.queuedCount();
    return {};
  } });
  assert.equal(seen, app.services.scheduler);
  assert.equal(await queued, 0);
});
