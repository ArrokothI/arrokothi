// Review evidence only: inject plausible bad plans at the same seam used by state-plans.test.ts.
// Run from H's repository root: node --experimental-strip-types --test /path/guard-probe.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const fromRoot = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const { KernelState } = await fromRoot('packages/kernel/src/state.ts');
const { created, dispatch, input, submitAwait, submitNext, waitOn, view, author } = await fromRoot('packages/kernel/tests/waits-kit.ts');
const original = KernelState.prototype.apply;
function inject(transform, run) {
  KernelState.prototype.apply = function(plan) { return Reflect.apply(original, this, [transform(plan, this)]); };
  try { return run(); } finally { KernelState.prototype.apply = original; }
}
const freeze = x => Object.freeze(x);
const summarize = o => { const v=view(o); return {state:v.state, queued:v.queued, mailbox:v.mailbox.map(e=>({eventId:e.eventId,kind:e.disposition.kind,generation:e.waitGeneration??null})), retired:v.retiredWaits.map(w=>w.generation),timerFires:v.timerFires.length}; };
const report = (t,o,fn) => { const result=fn(); t.diagnostic(JSON.stringify(summarize(o))); return result; };

test('control: normal cancellation disposes both queued Events', () => {
  const o = created(); input(o, 's');
  assert.equal(o.kernel.cancelExecution(author, o.executionId).ok, true);
  assert.deepEqual(view(o).queued, []);
});

test('S2 must reject duplicated cancellation positions, even when the length equals queued count', t => {
  const o = created(); input(o, 's');
  assert.throws(() => report(t,o,() => inject(p => p.kind === 'cancellation' ? freeze({...p, endAt: freeze([p.endAt[0], p.endAt[0]])}) : p,
    () => o.kernel.cancelExecution(author, o.executionId))), /S2/);
});

test('S2 must reject an Outcome acknowledging and terminal-disposing the same position', t => {
  const o = created(); input(o, 's'); const a = dispatch(o, 1);
  assert.throws(() => report(t,o,() => inject(p => p.kind === 'outcome' ? freeze({...p, endAt: freeze([p.acknowledgeAt[0]])}) : p,
    () => submitNext(o, a, {step:'complete', result: true}))), /S2/);
});

test('control: two immediate expiries mint distinct generations', () => {
  const o = created(); submitAwait(o, dispatch(o), waitOn('s', 0));
  submitAwait(o, dispatch(o), waitOn('s', 0));
  assert.deepEqual(view(o).mailbox.filter(e => e.sourceCategory === 'kernel_timeout').map(e => e.waitGeneration), [1,2]);
});

test('S4 must reject reusing an already-expired generation in the Outcome arm', t => {
  const o = created(); submitAwait(o, dispatch(o), waitOn('s', 0));
  const old = view(o).mailbox.find(e => e.sourceCategory === 'kernel_timeout');
  const a = dispatch(o);
  assert.throws(() => report(t,o,() => inject(p => p.kind !== 'outcome' ? p : freeze({...p,
    registrations: 1,
    retired: freeze({...p.retired, generation:1, endingEventId:old.eventId}),
    readiness: freeze({...p.readiness, generation:1, timeoutEventId:old.eventId}),
    timeout: freeze({...p.timeout, generation:1, eventId:old.eventId})
  }), () => submitAwait(o,a,waitOn('s',0)))), /S3|S4/);
});

test('due-at-registration wait expiry needs no host fire (L-22 counterexample)', t => {
  const o = created(); const a = dispatch(o);
  const answer = submitAwait(o,a,waitOn('s',0));
  assert.equal(answer.ok,true); assert.equal(answer.value.wait.result,'expired');
  assert.equal(view(o).state,'READY'); assert.equal(view(o).timerFires.length,0);
  assert.equal(view(o).mailbox.filter(e => e.sourceCategory === 'kernel_timeout').length,1);
  assert.deepEqual(o.kernel.pendingTimers(),[]); t.diagnostic(JSON.stringify(summarize(o)));
});
