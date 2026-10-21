/** Fresh-process witness for the invalidation-03 lexical hop, now against raw core bytes. */
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { ExecutionCoordinator, validateCanonicalBytes } from '../src/index.ts';
import { acceptIdentityText } from '../src/envelope.ts';
import { canonicalizeJsonText } from '../src/json-transport.ts';
const [name = 'JSON', form = 'declare', timing = 'before'] = process.argv.slice(2);
const host = globalThis as unknown as Record<string, unknown>;
const original = host[name];
const define = Object.defineProperty;
const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)!;
const stringify = JSON.stringify;
const bytes = (text: string) => new TextEncoder().encode(text);
const one = bytes('{"a":[1,"x"],"b":2}');
const two = bytes('{"a":[3,"x"],"b":7}');
const transportText = bytes(' { "b": 2, "a": [1.0, "x"] } ');
let fakeCalls = 0;
const fake = new Proxy(original as object, {
  get() { fakeCalls++; throw new Error('ambient intrinsic property used'); },
  apply() { fakeCalls++; return 999; },
  construct() { fakeCalls++; throw new Error('ambient constructor used'); },
});
host.__bindingFake = fake;
host.__bindingOriginal = original;
let installed = false;
const install = () => {
  if (installed) return;
  installed = true;
  if (form === 'declare') vm.runInThisContext(`let ${name} = globalThis.__bindingFake;`);
  else if (form === 'define') define(globalThis, name, { ...descriptor, value: fake });
  else host[name] = fake;
};
let grant: unknown;
let activation: any;
const kernel = new ExecutionCoordinator({ driver: {
  driverId: 'byte-witness',
  deliver(a: any, settlement: any, g: any) { activation = a; grant = g; settlement.delivered(); },
  isSafeToReplace() { return true; },
} as never });
const request = (payload: Uint8Array) => ({ creationKey: 'identity-key', scope: 'tenant-a', definitionRevision: 'def', runtimeContractRevision: 'runtime', progressCodec: 'codec', authorityContext: one, initialInput: { kind: 'kind', payload, subscriptionClass: 'sub' } });
// Explicit trusted authorities, taken from the public AuthenticatedCaller shape.
const caller = { namespace: 'binding', scopes: ['tenant-a'], controlScopes: ['tenant-a'] };
const firstRequest = request(one);
if (timing === 'between') define(firstRequest, 'authorityContext', { get() { install(); return one; }, enumerable: true });
let result: unknown;
try {
  if (timing === 'before') install();
  const standalone = validateCanonicalBytes(one);
  const identityIssues: any[] = [];
  const identity = acceptIdentityText('key😀', 'key', identityIssues);
  const invalidIdentity = acceptIdentityText('\ud800', 'key', identityIssues);
  const transported = canonicalizeJsonText(transportText);
  const first = kernel.createExecution(caller as never, firstRequest);
  if (!first.ok) result = { first, standalone, identity, invalidIdentity, identityIssues };
  else {
    const executionId = first.value.executionId;
    const replay = kernel.createExecution(caller as never, request(one));
    const conflict = kernel.createExecution(caller as never, request(two));
    const input = { destination: executionId, requestKey: 'input', kind: 'kind', payload: one };
    const ingress = kernel.submitInput(caller as never, input);
    const ingressReplay = kernel.submitInput(caller as never, input);
    const ingressConflict = kernel.submitInput(caller as never, { ...input, payload: two });
    const dispatched = kernel.dispatch(caller as never, executionId, { bound: 1 });
    if (!dispatched.ok) result = { first, dispatched };
    else {
      const outcome = { executionId, activationId: dispatched.value.activationId, writerEpoch: dispatched.value.writerEpoch, baseProgressRevision: dispatched.value.baseProgressRevision, progress: one, emissions: [{ emissionKey: 'emission', value: one }], next: { step: 'continue' as const } };
      const accepted = kernel.submitOutcome(caller as never, outcome, grant as never);
      const outcomeReplay = kernel.submitOutcome(caller as never, outcome, undefined as never);
      const outcomeConflict = kernel.submitOutcome(caller as never, { ...outcome, progress: two }, undefined as never);
      result = { standalone, identity, invalidIdentity, identityIssues, transported, first, replay, conflict, ingress, ingressReplay, ingressConflict, dispatched, accepted, outcomeReplay, outcomeConflict, view: kernel.inspect(caller as never, executionId) };
    }
  }
} finally {
  if (form === 'declare' && installed) vm.runInThisContext(`${name} = globalThis.__bindingOriginal;`);
  else define(globalThis, name, descriptor);
  delete host.__bindingFake; delete host.__bindingOriginal;
}
const r = result as any;
assert.equal(fakeCalls, 0);
assert.equal(r.standalone.ok, true);
assert.deepEqual(r.standalone.value, { a: [1, 'x'], b: 2 });
assert.equal(r.identity, true); assert.equal(r.invalidIdentity, false);
assert.equal(r.identityIssues[0].code, 'lone_surrogate');
assert.equal(r.transported.ok, true);
assert.equal(r.first.ok, true, stringify(r.first));
assert.equal(r.replay.value.replayed, true);
assert.equal(r.replay.value.receipt.position, r.first.value.receipt.position);
assert.equal(r.conflict.error.classification, 'duplicate_conflict');
assert.equal(r.ingress.ok, true); assert.equal(r.ingressReplay.value.replayed, true);
assert.equal(r.ingressConflict.error.classification, 'duplicate_conflict');
assert.equal(r.accepted.ok, true); assert.equal(r.outcomeReplay.value.replayed, true);
assert.equal(r.outcomeConflict.ok, false);
assert.deepEqual(r.view.value.acceptedProgress, { a: [1, 'x'], b: 2 });
process.stdout.write(stringify({ name, form, timing, fakeCalls, accepted: true }) + '\n');
