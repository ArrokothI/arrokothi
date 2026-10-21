import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionCoordinator, type Activation, type ExecutionDriver, type SubmissionGrant, type OutcomeEnvelope, type CreateExecutionRequest } from '../src/index.ts';
import { assertOnlyRefusal } from './refusal-diagnostics-fixture.ts';
const bytes = (text: string) => new TextEncoder().encode(text);
const who = { namespace: 'byte-consumers', scopes: ['tenant-a'], controlScopes: ['tenant-a'] };
function setup() {
  const seen: Activation[] = [], grants: SubmissionGrant[] = [];
  const driver: ExecutionDriver = { driverId: 'bytes', deliver(a,s,g) { seen.push(a); grants.push(g); s.delivered(); }, isSafeToReplace() { return true; } };
  const kernel = new ExecutionCoordinator({ driver });
  const request = (overrides: Partial<CreateExecutionRequest> = {}): CreateExecutionRequest => ({ creationKey: 'create', scope: 'tenant-a', definitionRevision: 'def', runtimeContractRevision: 'runtime', progressCodec: 'codec', authorityContext: bytes('{"tenant":"a"}'), initialInput: { kind: 'k', payload: bytes('{"n":1}') }, ...overrides });
  const creation = kernel.createExecution(who, request()); assert.ok(creation.ok);
  const id = creation.value.executionId;
  const dispatch = kernel.dispatch(who, id, { bound: 1 }); assert.ok(dispatch.ok);
  const view = () => { const result = kernel.inspect(who,id); assert.ok(result.ok); return result.value; };
  const proposal = (overrides: Partial<OutcomeEnvelope> = {}): OutcomeEnvelope => ({ executionId: id, activationId: dispatch.value.activationId, writerEpoch: dispatch.value.writerEpoch, baseProgressRevision: dispatch.value.baseProgressRevision, progress: bytes('{"p":1}'), next: { step: 'continue' }, ...overrides });
  return { kernel, seen, grants, request, id, dispatch: dispatch.value, view, proposal };
}

for (const field of ['authorityContext','initialInput','payload','progress','emission','result','error'] as const) {
  test(`B1-1 ${field} binds its own copy through inspection, retry and Driver readers`, () => {
    const s = setup();
    const input = bytes('{"owned":[1]}');
    let target = s.id;
    let retry: (() => any) | undefined;
    if (field === 'authorityContext' || field === 'initialInput') {
      const request = s.request({ creationKey: field, ...(field === 'authorityContext' ? { authorityContext: input } : { initialInput: { kind: 'k', payload: input } }) });
      const result = s.kernel.createExecution(who, request); assert.ok(result.ok); target = result.value.executionId;
      retry = () => s.kernel.createExecution(who, { ...request, ...(field === 'authorityContext' ? { authorityContext: bytes('{"owned":[1]}') } : { initialInput: { kind: 'k', payload: bytes('{"owned":[1]}') } }) });
    } else if (field === 'payload') {
      const request = { destination: target, requestKey: field, kind: 'k', payload: input };
      assert.ok(s.kernel.submitInput(who, request).ok);
      retry = () => s.kernel.submitInput(who, { ...request, payload: bytes('{"owned":[1]}') });
    } else {
      const overrides = (value: Uint8Array): Partial<OutcomeEnvelope> => field === 'progress' ? { progress: value } : field === 'emission' ? { emissions: [{ emissionKey: 'e', value }] } : field === 'result' ? { next: { step: 'complete', result: value } } : { next: { step: 'fail', error: value } };
      assert.ok(s.kernel.submitOutcome(who, s.proposal(overrides(input)), s.grants[0]!).ok);
      retry = () => s.kernel.submitOutcome(who, s.proposal(overrides(bytes('{"owned":[1]}'))), undefined as never);
    }
    input.fill(0); structuredClone(input, { transfer: [input.buffer] });
    const replay = retry(); assert.ok(replay.ok); assert.equal(replay.value.replayed, true);
    const result = s.kernel.inspect(who, target); assert.ok(result.ok);
    const text = JSON.stringify(result.value);
    assert.ok(text.includes('"owned":[1]'), text);
    const roots: unknown[] = [];
    const collect = (value: unknown): void => {
      if (value === null || typeof value !== 'object') return;
      if (Object.hasOwn(value, 'owned')) roots.push(value);
      for (const key of Object.keys(value)) collect((value as Record<string,unknown>)[key]);
    };
    collect(result.value); assert.ok(roots.length > 0);
    for (const root of roots) { assert.ok(Object.isFrozen(root)); assert.ok(Object.isFrozen((root as any).owned)); assert.throws(() => ((root as any).owned[0] = 99)); }
    if (field === 'authorityContext' || field === 'initialInput') {
      assert.ok(s.kernel.dispatch(who,target,{ bound: 1 }).ok);
      assert.ok(JSON.stringify(s.seen.at(-1)).includes('"owned":[1]'));
      const last = s.seen.at(-1)!;
      assert.ok(s.kernel.redeliver(who,target).ok);
      assert.strictEqual(s.seen.at(-1), last);
    }
  });
}

for (const field of ['definitionRevisions','runtimeContractRevisions','progressCodecs'] as const) {
  test(`B1-1 recovery ${field} snapshots before observing the next list`, () => {
    const s = setup();
    const input = bytes(JSON.stringify([field === 'definitionRevisions' ? 'def' : field === 'runtimeContractRevisions' ? 'runtime' : 'codec']));
    const available = { definitionRevisions: bytes('["def"]'), runtimeContractRevisions: bytes('["runtime"]'), progressCodecs: bytes('["codec"]'), [field]: input };
    const result = s.kernel.recoverExecution(who,s.id,{ activationId: s.dispatch.activationId, available });
    assert.ok(result.ok);
    input.fill(0);
    const retry = s.kernel.recoverExecution(who,s.id,{ activationId: s.dispatch.activationId, available: { definitionRevisions: bytes('["def"]'), runtimeContractRevisions: bytes('["runtime"]'), progressCodecs: bytes('["codec"]') } });
    assert.ok(retry.ok);
    assert.deepEqual(s.view().recoveryHolds, []);
  });
}

test('B1-1 copy/validate each observed root before a later envelope getter mutates its buffer', () => {
  const s = setup();
  const authority = bytes('{"n":1}'), payload = bytes('{"n":2}');
  const request = s.request({ creationKey: 'getter', authorityContext: authority });
  Object.defineProperty(request, 'initialInput', { get() { authority.fill(32); return { kind:'k', payload, get subscriptionClass() { payload.fill(32); return 'sub'; } }; } });
  const created = s.kernel.createExecution(who,request);
  assert.ok(created.ok);
  const result = s.kernel.inspect(who, created.value.executionId); assert.ok(result.ok);
  assert.deepEqual(result.value.authorityContext, { n:1 });
  assert.deepEqual(result.value.mailbox[0]!.payload, { n:2 });
});

const consumers = ['ingress','recovery-definition','recovery-runtime','recovery-codec','progress','emission','result','error'] as const;
for (const consumer of consumers) for (const [text, code] of [['1e400','non_finite_number'], ['{"a":1,"a":2}','duplicate_key'], [' 1','non_canonical']] as const) {
  test(`B1-3 ${consumer} refuses ${code} as one complete decision`, () => {
    const s = setup(), before = s.view(), input = bytes(text);
    let result;
    if (consumer === 'ingress') result = s.kernel.submitInput(who,{destination:s.id,requestKey:'bad',kind:'k',payload:input});
    else if (consumer.startsWith('recovery')) result = s.kernel.recoverExecution(who,s.id,{activationId:s.dispatch.activationId,available:{definitionRevisions:consumer === 'recovery-definition' ? input : bytes('["def"]'),runtimeContractRevisions:consumer === 'recovery-runtime' ? input : bytes('["runtime"]'),progressCodecs:consumer === 'recovery-codec' ? input : bytes('["codec"]')}});
    else result = s.kernel.submitOutcome(who,s.proposal(consumer === 'progress' ? {progress:input} : consumer === 'emission' ? {emissions:[{emissionKey:'e',value:input}]} : consumer === 'result' ? {next:{step:'complete',result:input}} : {next:{step:'fail',error:input}}),s.grants[0]!);
    assert.equal(result.ok,false); if (result.ok) return;
    assert.ok(result.error.reason.includes(code),result.error.reason);
    assertOnlyRefusal(before,s.view(),result.error);
    assert.ok(s.kernel.submitOutcome(who,s.proposal(),s.grants[0]!).ok,'refusal preserved the grant');
  });
}
