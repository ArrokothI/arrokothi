// Independent review 01 evidence. Run from any directory with Node v26.10.0.
// No subject file is changed. Temporary copies are removed in finally.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ExecutionCoordinator } from '../../../../../packages/kernel/src/index.ts';
import { createKernelCandidate } from '../../../../../tests/conformance/k0-candidate/kernel-candidate.ts';
import { create, input, outcomeFor, startRun } from '../../../../../tests/conformance/k0-candidate/support.ts';

const root = resolve(import.meta.dirname, '../../../../..');
let lastView;
class CapturedCoordinator extends ExecutionCoordinator {
  inspect(caller, executionId) {
    const result = super.inspect(caller, executionId);
    if (result.ok) lastView = result.value;
    return result;
  }
}
const apply = startRun(createKernelCandidate({ Coordinator: CapturedCoordinator }));
const waiting = (open, generation, deadline) => ({ kind: 'submit_outcome', outcome: outcomeFor(open,
  { step: 'await', wait: { dependencies: [], subscriptions: [{ subscriptionClass: 'continue' }], generation, deadline } }) });
const timer = (generation, eventId) => ({ kind: 'deliver_timer', executionId: 'x', generation,
  timeoutEvent: { eventId, destination: 'x', kind: 'kernel.wait.timeout', category: 'kernel_timeout', waitGeneration: generation } });

apply(create('x', 'kx', input('initial', 'x', 'initial')));
const first = apply({ kind: 'dispatch', executionId: 'x', bound: 1 });
apply(waiting(first, 'g1', 10));
const firstFire = apply(timer('g1', 'to-g2'));
assert.deepEqual(firstFire.queued, ['to-g2']);
const second = apply({ kind: 'dispatch', executionId: 'x', bound: 1 });
apply(waiting(second, 'g2', 20));
const secondFire = apply(timer('g2', 'to-g2'));
const timeoutIds = lastView.mailbox.filter(entry => entry.sourceCategory === 'kernel_timeout').map(entry => entry.eventId);
assert.equal(timeoutIds.length, 2);
assert.equal(new Set(timeoutIds).size, 2);
const literal = secondFire.queued[0];
assert.equal(literal, 'to-g2');
assert.ok(secondFire.acknowledged.includes('to-g2'));
console.log(JSON.stringify({ probe: 'timeout-alias-collision', first: firstFire.queued,
  second: secondFire.queued, acknowledged: secondFire.acknowledged, timeoutIds,
  finding: 'A second timeout reuses an already-bound explicit name; Q2b fallback hides the collision.' }));

// Adjacent fault-injection control: legal duplicate timer commands keep exactly the same name.
// A broken public Kernel response changes the timeout ID consistently in its answer/mailbox/queue.
// The adapter must expose that identity drift, not turn it back into the original literal name.
let changedId = null;
class DriftingTimeoutCoordinator extends ExecutionCoordinator {
  fireTimer(key) {
    const answer = super.fireTimer(key);
    if (answer.result === 'duplicate' && answer.timeoutEventId !== null) {
      changedId = [answer.timeoutEventId, `${answer.timeoutEventId}-changed`];
      return { ...answer, timeoutEventId: changedId[1] };
    }
    return answer;
  }
  inspect(caller, executionId) {
    const answer = super.inspect(caller, executionId);
    if (!answer.ok || changedId === null) return answer;
    const rename = id => id === changedId[0] ? changedId[1] : id;
    const view = answer.value;
    return { ...answer, value: { ...view,
      mailbox: view.mailbox.map(entry => ({ ...entry, eventId: rename(entry.eventId) })),
      queued: view.queued.map(rename), acknowledged: view.acknowledged.map(rename),
      terminalDispositions: view.terminalDispositions.map(rename),
      waitEndedReadiness: view.waitEndedReadiness === null ? null : { ...view.waitEndedReadiness,
        timeoutEventId: rename(view.waitEndedReadiness.timeoutEventId) },
    } };
  }
}
const drift = startRun(createKernelCandidate({ Coordinator: DriftingTimeoutCoordinator }));
drift(create('x', 'kx', input('initial', 'x', 'initial')));
const driftOpen = drift({ kind: 'dispatch', executionId: 'x', bound: 1 });
drift(waiting(driftOpen, 'g1', 10));
const beforeDrift = drift(timer('g1', 'to-g1'));
const afterDrift = drift(timer('g1', 'to-g1'));
assert.notEqual(changedId[0], changedId[1]);
assert.deepEqual(afterDrift, beforeDrift);
console.log(JSON.stringify({ probe: 'duplicate-timeout-identity-drift', changedId,
  observedBefore: beforeDrift.queued, observedAfter: afterDrift.queued,
  finding: 'An explicit timeout ID changes in public Kernel facts but the entire Observation stays identical.' }));

const workspace = mkdtempSync(join(tmpdir(), 'k14-review-survivor-'));
try {
  const conformance = join(workspace, 'tests/conformance');
  mkdirSync(conformance, { recursive: true });
  cpSync(join(root, 'tests/conformance/k0'), join(conformance, 'k0'), { recursive: true });
  cpSync(join(root, 'tests/conformance/k0-candidate'), join(conformance, 'k0-candidate'), { recursive: true });
  symlinkSync(join(root, 'node_modules'), join(workspace, 'node_modules'));
  symlinkSync(join(root, 'packages'), join(workspace, 'packages'));
  const subject = join(conformance, 'k0-candidate/kernel-candidate.ts');
  const original = readFileSync(subject, 'utf8');
  const anchor = 'driver.grantFor(executionId, outcome.activationId, outcome.writerEpoch) ?? NO_GRANT';
  assert.equal(original.split(anchor).length - 1, 1);
  // Plausible adapter mistake: use the latest grant for the Execution, repairing stale provenance.
  writeFileSync(subject, original.replace(anchor,
    'driver.deliveries.filter((delivery) => delivery.activation.executionId === executionId).at(-1)?.grant ?? NO_GRANT'));
  const entry = join(workspace, 'run.mjs');
  writeFileSync(entry, `
import assert from 'node:assert/strict';
import { ExecutionCoordinator } from ${JSON.stringify(pathToFileURL(join(root, 'packages/kernel/src/index.ts')).href)};
import { createKernelCandidate } from './tests/conformance/k0-candidate/kernel-candidate.ts';
import { runScenario } from './tests/conformance/k0/fixture.ts';
import { ALL_SCENARIOS } from './tests/conformance/k0/scenarios.ts';
import { createOperationSink } from './tests/conformance/k0/operation-sink.ts';
const mismatches = [];
class WatchingCoordinator extends ExecutionCoordinator {
  submitOutcome(caller, envelope, grant) {
    if (envelope.writerEpoch !== grant.writerEpoch) mismatches.push({ submittedEpoch: envelope.writerEpoch, grantEpoch: grant.writerEpoch });
    return super.submitOutcome(caller, envelope, grant);
  }
}
const candidate = createKernelCandidate({ Coordinator: WatchingCoordinator });
const results = ALL_SCENARIOS.map(s => runScenario(candidate, s, createOperationSink()));
const counts = Object.fromEntries(['PASS','REFUSED','FAIL'].map(k => [k, results.filter(r => r.outcome === k).length]));
assert.deepEqual(counts, { PASS: 12, REFUSED: 3, FAIL: 0 });
assert.ok(mismatches.length > 0);
console.log(JSON.stringify({ probe: 'latest-grant-mutant', counts, mismatches, conclusion: 'non-equivalent survivor of the 12-schedule matrix' }));
`);
  process.stdout.write(execFileSync(process.execPath, [entry], { encoding: 'utf8' }));
  const testNames = ['ablations', 'blindness', 'boundary', 'conventions', 'verdicts'];
  let tap;
  try {
    tap = execFileSync(process.execPath, ['--test', '--test-reporter=tap',
      ...testNames.map(name => join(conformance, `k0-candidate/${name}.test.ts`))], { encoding: 'utf8' });
    assert.fail('the supplemental ABL-2 test must catch this mutant');
  } catch (error) {
    assert.equal(error.status, 1);
    tap = error.stdout;
  }
  const summary = tap.split('\n').filter(line => /^# (tests|pass|fail|cancelled|skipped|todo) /.test(line));
  assert.ok(summary.includes('# pass 157'));
  assert.ok(summary.includes('# fail 1'));
  assert.match(tap, /not ok 4 - ABL-2 \(coordinator.ts\): identity-create-and-activation fails at step 7 in rejection/);
  console.log(JSON.stringify({ probe: 'latest-grant-mutant-adapter-suite', summary,
    killedBy: 'ABL-2: the stale-epoch ablation exposes the repaired grant',
    conclusion: '12 PASS is insufficient alone; the existing supplemental ablation detects this mutant. No extra finding.' }));
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
