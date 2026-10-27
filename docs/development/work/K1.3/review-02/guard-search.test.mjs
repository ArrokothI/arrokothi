// Review-only controls at the same internal-plan seam as owner-guards.test.ts.
// Imports candidate source from the current working directory; does not patch files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { KernelState } = await import(`${process.cwd()}/packages/kernel/src/state.ts`);
const { accepted } = await import(`${process.cwd()}/packages/kernel/tests/harness.ts`);
const { author, created, dispatch, input, submitAwait, submitNext, view, waitOn } = await import(`${process.cwd()}/packages/kernel/tests/waits-kit.ts`);
const original = KernelState.prototype.apply;
function rewrite(kind, transform, run) {
  KernelState.prototype.apply = function(plan) { return original.call(this, plan.kind === kind ? Object.freeze(transform(plan)) : plan); };
  try { return run(); } finally { KernelState.prototype.apply = original; }
}
function mustRefuse(opened, kind, transform, run) {
  const before = view(opened);
  let thrown;
  try { rewrite(kind, transform, run); } catch (error) { thrown = error; }
  if (!thrown) {
    const after = view(opened);
    console.log(JSON.stringify({kind, state: after.state, queued: after.queued, dispositions: after.mailbox.map(e => e.disposition.kind), readiness: after.waitEndedReadiness}));
  }
  assert.match(String(thrown), /S2|S5/, 'owner must refuse before any mutation');
  assert.deepEqual(view(opened), before);
}
for (const cause of ['explicit','execution_deadline']) {
  test(`K13-R02-S2-01 exact position cover with queued ending: ${cause}`, () => {
    const o = created(cause === 'explicit' ? {} : {executionDeadline: 5}); input(o, 's');
    o.clock.set(5);
    mustRefuse(o, 'cancellation', p => ({...p, ending: Object.freeze({kind:'queued'})}), () => cause === 'explicit' ? o.kernel.cancelExecution(author,o.executionId) : o.kernel.fireTimer({executionId:o.executionId,kind:'execution_deadline',generation:null}));
  });
}
for (const step of ['complete','fail']) {
  for (const field of ['acknowledgment','ending']) {
    test(`K13-R02-S2-01 exact position cover with queued ${field}: ${step}`, () => {
      const o = created(); input(o,'s'); const a = dispatch(o,1);
      mustRefuse(o,'outcome',p => ({...p,[field]:Object.freeze({kind:'queued'})}), () => submitNext(o,a,step==='complete'?{step,result:true}:{step,error:true}));
    });
  }
  test(`K13-R02-S2-02 terminal decision appends queued timeout: ${step}`, () => {
    const o = created(); const a = dispatch(o);
    mustRefuse(o,'outcome',p => ({...p,nextState:step==='complete'?'COMPLETED':'FAILED'}), () => submitAwait(o,a,waitOn('s',0)));
  });
}
test('positive: exact cover, correct dispositions, and nonterminal timeout', () => {
  for (const step of ['complete','fail']) { const o=created(); input(o,'s'); const a=dispatch(o,1); accepted(submitNext(o,a,step==='complete'?{step,result:true}:{step,error:true})); assert.deepEqual(view(o).queued,[]); }
  const o=created(); accepted(submitAwait(o,dispatch(o),waitOn('s',0))); assert.equal(view(o).state,'READY'); assert.equal(view(o).queued.length,1);
});
