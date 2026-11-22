// Derived from review 02 probes at 2a95a49a6e7ff46242a137f9d9ca6835e70ed946; command schedules unchanged except the added successful fresh-reference controls.
// Independent review 02. Run from the repository root with Node 26.10+:
// node --no-warnings --experimental-strip-types docs/development/work/K1.4-candidate/review-02/probes.mjs
// Review 03: the original commands and injections, with assertions updated for the approved corrected behavior.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2] ?? process.cwd());
const load = p => import(pathToFileURL(resolve(root, p)).href);
const { createKernelCandidate } = await load('tests/conformance/k0-candidate/kernel-candidate.ts');
const { ExecutionCoordinator } = await load('packages/kernel/src/index.ts');
const { createOperationSink } = await load('tests/conformance/k0/operation-sink.ts');
const report = (name, facts) => console.log(JSON.stringify({ case: name, ...facts }));

function harness({ drift = false } = {}) {
  let latest;
  let changed = null;
  class Watching extends ExecutionCoordinator {
    fireTimer(key) {
      const a = super.fireTimer(key);
      if (drift && a.result === 'duplicate' && a.timeoutEventId !== null) {
        changed = [a.timeoutEventId, 'review-drift'];
        return { ...a, timeoutEventId: changed[1] };
      }
      return a;
    }
    inspect(caller, id) {
      const a = super.inspect(caller, id);
      if (!a.ok) return a;
      latest = a.value;
      if (changed === null) return a;
      const rename = id => id === changed[0] ? changed[1] : id;
      const v = a.value;
      return { ...a, value: { ...v,
        mailbox: v.mailbox.map(e => ({ ...e, eventId: rename(e.eventId) })),
        queued: v.queued.map(rename), acknowledged: v.acknowledged.map(rename),
        terminalDispositions: v.terminalDispositions.map(rename),
        activation: v.activation === null ? null : { ...v.activation, batch: v.activation.batch.map(rename) },
        waitEndedReadiness: v.waitEndedReadiness === null ? null : { ...v.waitEndedReadiness,
          timeoutEventId: rename(v.waitEndedReadiness.timeoutEventId) },
      } };
    }
  }
  const run = createKernelCandidate({ Coordinator: Watching }).begin(
    { id: 'independent-review-02', title: '', sources: [], k0BoundaryRows: [], isUnsafeControl: false, steps: [] },
    createOperationSink().sink,
  );
  assert.notEqual(run.refused, true);
  const apply = c => run.apply(c);
  const create = (id = 'x', key = 'kx') => apply({ kind: 'create', executionId: id, requestKey: key,
    definitionRevision: 'review-runtime@1', initialInput: { eventId: 'initial', destination: id,
      kind: 'external.input', category: 'application_input', subscriptionClass: 'initial', producer: 'review', requestKey: 'initial' } });
  const dispatch = (id = 'x') => apply({ kind: 'dispatch', executionId: id, bound: 1 });
  const wait = (g, deadline, id = 'x') => {
    const o = dispatch(id);
    return apply({ kind: 'submit_outcome', outcome: {
      executionId: id, activationId: o.activationId, writerEpoch: o.writerEpoch,
      baseProgressRevision: o.progressRevision, progress: null, emissions: [], effects: [],
      next: { step: 'await', wait: { generation: g, dependencies: [], subscriptions: [{ subscriptionClass: 'continue' }], deadline } },
    } });
  };
  const fire = (g, name, id = 'x') => apply({ kind: 'deliver_timer', executionId: id, generation: g,
    timeoutEvent: { eventId: name, destination: id, kind: 'kernel.wait.timeout', category: 'kernel_timeout', waitGeneration: g } });
  return { apply, create, dispatch, wait, fire, view: () => latest, changed: () => changed,
    ids: () => latest.mailbox.filter(e => e.sourceCategory === 'kernel_timeout').map(e => e.eventId) };
}

// No injected behavior: exposure, then a command reuses that output spelling for another Event.
{
  const h = harness(); h.create(); h.wait('alpha', 10); h.fire('alpha', 'taken');
  h.wait('beta', 20); const second = h.fire('beta', 'taken');
  const exposed = second.queued[0];
  assert.match(exposed, /^kernel-event:/);
  h.wait('gamma', 30); const third = h.fire('gamma', exposed);
  assert.equal(new Set(h.ids()).size, 3);
  assert.ok(!third.acknowledged.includes(third.queued[0]));
  assert.deepEqual(h.dispatch().dispatchedBatch, third.queued);
  const cancelled = h.apply({ kind: 'accept_cancellation', executionId: 'x' });
  assert.ok(!cancelled.acknowledged.includes(cancelled.terminalDispositions[0]));
  report('exposed-then-command', { timeoutIds: h.ids(), exposed, observation: third,
    terminalDispositions: cancelled.terminalDispositions, identityHidden: false });
}

// Reverse order. A separate calibration obtains the public deterministic ID; it changes no source.
{
  const calibration = harness(); calibration.create();
  calibration.wait('alpha', 10); calibration.fire('alpha', 'first');
  calibration.wait('beta', 20); calibration.fire('beta', 'second');
  const name = `kernel-event:${calibration.ids()[1]}`;
  const h = harness(); h.create(); h.wait('alpha', 10); h.fire('alpha', name);
  h.wait('beta', 20); const o = h.fire('beta', name);
  assert.deepEqual(h.ids(), calibration.ids());
  assert.ok(!o.acknowledged.includes(o.queued[0]));
  report('command-then-exposed', { timeoutIds: h.ids(), name, observation: o, identityHidden: false });
}

// Broken public response, not a real Kernel defect. Same command, different ID, same complete Observation.
for (const name of ['ordinary-name', 'kernel-event:review-drift']) {
  const h = harness({ drift: true }); h.create(); h.wait('alpha', 10);
  const before = h.fire('alpha', name); const after = h.fire('alpha', name);
  assert.ok(h.changed());
  const hidden = false;
  if (hidden) assert.deepEqual(after, before);
  else assert.notDeepEqual(after, before);
  report('changed-id-duplicate', { name, nativeIds: h.changed(), identityHidden: hidden, before, after });
}

// Adjacent preserved cases, with independently chosen names and schedules.
{
  const h = harness(); h.create(); const due = h.wait('雪', 1);
  assert.deepEqual(due.queued, ['to-雪']);
  const named = h.fire('雪', '__proto__'); assert.deepEqual(named.queued, ['to-雪']);
  assert.deepEqual(h.fire('雪', '__proto__'), named);
  assert.deepEqual(h.fire('雪', 'another-name'), named);
  const next = h.wait('later', 50);
  assert.deepEqual(h.fire('雪', 'late-name'), next);
  const offered = h.fire('later', 'to-雪');
  assert.match(offered.queued[0], /^kernel-event:/);
  assert.notEqual(offered.queued[0], offered.acknowledged.at(-1));
  report('unnamed-then-named-duplicate-stale-old-label', { passed: true, observation: offered });
}
{
  const h = harness(); h.create('x', 'kx'); h.create('y', 'ky');
  h.wait('same', 10, 'x'); h.wait('same', 10, 'y');
  assert.deepEqual(h.fire('same', '__proto__', 'x').queued, ['__proto__']);
  assert.deepEqual(h.fire('same', '__proto__', 'y').queued, ['__proto__']);
  h.wait('second', 20, 'x'); const x = h.fire('second', '__proto__', 'x');
  assert.match(x.queued[0], /^kernel-event:/);
  assert.deepEqual(h.apply({ kind: 'inspect', executionId: 'y' }).queued, ['__proto__']);
  report('per-execution-scope', { passed: true });
}

// The same marked-string fallback assumption exists in the other two alias families.
{
  const h = harness(); h.create();
  const first = h.wait('kernel-generation:2', 10);
  h.fire('kernel-generation:2', 'first');
  const second = h.wait('kernel-generation:2', 20);
  assert.notEqual(first.liveWaitGeneration, second.liveWaitGeneration);
  assert.equal(h.view().wait.generation, 2);
  const fired = h.fire('kernel-generation:2', 'second');
  assert.equal(fired.state, 'WAITING'); // the old name still denotes generation 1
  assert.equal(h.fire(second.liveWaitGeneration, 'third').state, 'READY');
  report('generation-fallback-collision', { first: first.liveWaitGeneration, second: second.liveWaitGeneration,
    nativeGeneration: 2, fireState: fired.state, identityHidden: false });
}
{
  const calibration = harness(); calibration.create('calibration', 'second-key');
  const targetId = calibration.view().executionId;
  const h = harness(); const label = `kernel-execution:${targetId}`;
  const first = h.create(label, 'first-key'); const firstId = h.view().executionId;
  const second = h.create(label, 'second-key'); const secondId = h.view().executionId;
  assert.notEqual(firstId, secondId); assert.equal(secondId, targetId);
  assert.notEqual(first.executionId, second.executionId);
  assert.equal(h.apply({kind: "inspect", executionId: second.executionId}).executionId, second.executionId);
  report('execution-fallback-collision', { nativeIds: [firstId, secondId],
    reportedIds: [first.executionId, second.executionId], identityHidden: false });
}
