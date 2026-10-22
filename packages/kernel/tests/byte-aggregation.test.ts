/** BINDING-01 C1 port: the core half of the value-diagnostic-work and value-refusal-cost obligations.
 * At B those tests also pinned the Kernel's whole-refusal order through live roots. The SDK tests keep
 * per-root capture; these keep it over byte roots: every malformed root of one decision is reported,
 * and a caller that cannot see the Execution has no envelope field read.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionCoordinator, type ExecutionDriver, type OutcomeEnvelope, type SubmissionGrant } from '../src/index.ts';
import { assertOnlyRefusal } from './refusal-diagnostics-fixture.ts';
const bytes = (text: string) => new TextEncoder().encode(text);
const who = { namespace: 'byte-aggregation', scopes: ['tenant-a'], controlScopes: ['tenant-a'] };
const hidden = { namespace: 'byte-aggregation', scopes: ['tenant-b'], controlScopes: ['tenant-b'] };
const revisions = { scope: 'tenant-a', definitionRevision: 'def', runtimeContractRevision: 'runtime', progressCodec: 'codec' };
function setup() {
  const grants: SubmissionGrant[] = [];
  const driver: ExecutionDriver = { driverId: 'byte-aggregation', deliver(_a, s, g) { grants.push(g); s.delivered(); }, isSafeToReplace() { return true; } };
  const kernel = new ExecutionCoordinator({ driver });
  const creation = kernel.createExecution(who, { ...revisions, creationKey: 'open', authorityContext: bytes('{}'), initialInput: { kind: 'k', payload: bytes('1') } });
  assert.ok(creation.ok);
  const id = creation.value.executionId;
  const dispatch = kernel.dispatch(who, id, { bound: 1 }); assert.ok(dispatch.ok);
  const view = () => { const result = kernel.inspect(who, id); assert.ok(result.ok); return result.value; };
  const proposal = (overrides: Partial<OutcomeEnvelope> = {}): OutcomeEnvelope => ({ executionId: id, activationId: dispatch.value.activationId, writerEpoch: dispatch.value.writerEpoch, baseProgressRevision: dispatch.value.baseProgressRevision, progress: bytes('{}'), next: { step: 'continue' }, ...overrides });
  return { kernel, grants, id, activationId: dispatch.value.activationId, view, proposal };
}

test('C1 core port: creation reports a malformed authorityContext and initial input together', () => {
  const s = setup();
  const result = s.kernel.createExecution(who, { ...revisions, creationKey: 'both', authorityContext: bytes('1e400'), initialInput: { kind: 'k', payload: bytes('{"a":1,"a":2}') } });
  assert.equal(result.ok, false); if (result.ok) return;
  assert.equal(result.error.classification, 'malformed_value');
  assert.equal(result.error.reason, 'creation content is not an acceptable boundary value: authorityContext non_finite_number; initialInput.payload duplicate_key');
  assert.equal(result.error.executionId, null);
  const retry = s.kernel.createExecution(who, { ...revisions, creationKey: 'both', authorityContext: bytes('{}'), initialInput: { kind: 'k', payload: bytes('1') } });
  assert.ok(retry.ok); assert.equal(retry.value.replayed, false, 'the refused key committed nothing');
});

test('C1 core port: an Outcome reports refused progress, every refused Emission and the result together', () => {
  const s = setup(), before = s.view();
  const result = s.kernel.submitOutcome(who, s.proposal({
    progress: bytes(' 1'),
    emissions: [{ emissionKey: 'a', value: bytes('1e400') }, { emissionKey: 'b', value: bytes('{"x":1,"x":1}') }],
    next: { step: 'complete', result: bytes('01') },
  }), s.grants[0]!);
  assert.equal(result.ok, false); if (result.ok) return;
  assert.equal(result.error.classification, 'malformed_envelope');
  assert.equal(result.error.reason, `Outcome for Activation ${s.activationId} refused whole: progress non_canonical (input is not the exact canonical encoding of its value); ` +
    'emissions[0].value non_finite_number (expected a finite number, received a non-finite number); ' +
    'emissions[1].value duplicate_key (decoded object member name appears more than once); next.result invalid_json (data follows the JSON root)');
  assertOnlyRefusal(before, s.view(), result.error);
  assert.ok(s.kernel.submitOutcome(who, s.proposal(), s.grants[0]!).ok, 'refusal preserved the grant');
});

test('C1 core port: recovery reports every malformed availability list', () => {
  const s = setup(), before = s.view();
  const result = s.kernel.recoverExecution(who, s.id, { activationId: s.activationId, available: {
    definitionRevisions: bytes('1e400'), runtimeContractRevisions: bytes(' []'), progressCodecs: bytes('[1]'),
  } });
  assert.equal(result.ok, false); if (result.ok) return;
  assert.equal(result.error.classification, 'malformed_value');
  assert.equal(result.error.reason, 'recovery request is not acceptable: available.definitionRevisions non_finite_number; available.runtimeContractRevisions non_canonical; available.progressCodecs[0] unsupported_form');
  assertOnlyRefusal(before, s.view(), result.error);
});

test('C1 core port: an Outcome from a caller that cannot see the Execution has no other field read', () => {
  const s = setup(), before = s.view(), envelope = s.proposal({ emissions: [{ emissionKey: 'a', value: bytes('1') }] }) as unknown as Record<string, unknown>;
  let reads = 0;
  for (const key of Object.keys(envelope)) {
    const value = envelope[key];
    Object.defineProperty(envelope, key, { enumerable: true, get() { if (key !== 'executionId') reads += 1; return value; } });
  }
  const result = s.kernel.submitOutcome(hidden, envelope as unknown as OutcomeEnvelope, s.grants[0]!);
  assert.equal(result.ok, false); if (result.ok) return;
  assert.equal(result.error.classification, 'unknown_destination');
  assert.equal(reads, 0, 'visibility precedes every content read');
  assert.equal(s.view().refusals.length, before.refusals.length);
  assert.ok(s.kernel.submitOutcome(who, s.proposal(), s.grants[0]!).ok, 'the hidden attempt left the grant usable');
});
