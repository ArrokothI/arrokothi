import assert from 'node:assert/strict';
import { LegacyDriver } from '../../../../../packages/sdk/src/legacy-bridge/driver.ts';
import { LineageScheduler, lineageWorker } from '../../../../../packages/sdk/src/legacy-bridge/lineage-scheduler.ts';
// Throwaway reading of D04 §2.1. No repository source is changed.
LineageScheduler.prototype.schedule = function(executionId, lineage) {
  if (this.claimedExecutions.has(executionId)) this.pendingRequeue.set(executionId, lineage);
  else if (!this.queue.some(entry => entry.executionId === executionId)) this.queue.push({ executionId, lineage });
  this.wake(lineage);
};
const collected = new WeakMap();
const collect = LegacyDriver.prototype.collect;
LegacyDriver.prototype.collect = async function(...args) {
  const result = await collect.apply(this,args); collected.set(this,result); return result;
};
LegacyDriver.prototype.reconcile = function(id) {
  for (const [member, record] of collected.get(this).members) {
    if (record.context.lifecycle === 'READY') this.scheduler.schedule(member,id);
  }
};
let step = LegacyDriver.prototype.step.toString();
const old = /\/\/ READY in the store but not queued yet:[\s\S]*?\/\/ wait for it rather than split the work across exchanges\./;
assert.match(step,old);
step = step.replace(old, 'this.reconcile(executionId); continue;');
LegacyDriver.prototype.step = Function('lineageWorker',`return ({${step}}).step`)(lineageWorker);
