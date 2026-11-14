/** Review 04 claim check: F1's rejected request cleanup does not install a protocol hold.
 * This observes the existing behavior; it does not request a new cancellation mechanism.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApplication } from '../../../../../packages/sdk/src/index.ts';
import { InMemoryRuntimeStore, ScriptedModelProvider } from '../../../../../packages/core/src/reference/index.ts';
import { LegacyDriver } from '../../../../../packages/sdk/src/legacy-bridge/driver.ts';
import { models, chatAgent, callingWorkflow, allowDocs } from '../../../../../packages/sdk/tests/bridge-fixtures.ts';

test('one rejected cancel.request cleanup is swallowed; the real fallback ends both members with no hold', async t => {
  let armed = false, faults = 0;
  class Store extends InMemoryRuntimeStore {
    async readExecution(id) {
      if (armed && faults === 0 && new Error().stack.includes('LegacyDriver.cascade')) {
        faults++;
        throw Error('review 04: request cascade read rejects once');
      }
      return super.readExecution(id);
    }
  }
  const app = createApplication({ runtime: { store: new Store() },
    models: models(new ScriptedModelProvider({ id: 'scripted', steps: [{ output: { text: 'hello' } }] })),
    authorizer: allowDocs() });
  await app.register(chatAgent());
  const { executionId } = await app.start({ definition: callingWorkflow('chat'), structuralSpawnBudget: 1,
    input: { label: 'user', payload: 'hello' } });
  assert.equal((await app.runUntilBlocked(executionId)).reason, 'input_required');
  const child = (await app.harness.childExecutionLinksOf(executionId))[0].childExecutionId;
  const original = LegacyDriver.prototype.endLineage;
  const cleanup = [];
  LegacyDriver.prototype.endLineage = async function(id, site) {
    try { const result = await original.call(this, id, site); cleanup.push([site, 'fulfilled']); return result; }
    catch (error) { cleanup.push([site, 'rejected']); throw error; }
  };
  try {
    armed = true;
    await app.cancel(executionId);
    const kernel = app.inspect(executionId);
    const states = await Promise.all([executionId, child].map(async id => (await app.harness.inspect(id)).lifecycle));
    const later = (await app.runUntilIdle()).length;
    t.diagnostic(JSON.stringify({ faults, cleanup, kernel: kernel.state, holds: kernel.recoveryHolds,
      members: states, laterSteps: later }));
    assert.equal(faults, 1);
    assert.deepEqual(cleanup, [['cancel.request', 'rejected'], ['cancel.application', 'fulfilled']]);
    assert.equal(kernel.state, 'CANCELLED');
    assert.deepEqual(kernel.recoveryHolds, []);
    assert.deepEqual(states, ['CANCELLED', 'CANCELLED']);
    assert.equal(later, 0);
  } finally { LegacyDriver.prototype.endLineage = original; }
});
