// SELF-R4-DESCRIPTOR-01: engine descriptor normalization walks a caller-built chain.
// Run: node --expose-gc probe-descriptor-chain-04.mjs <tree> <depth> [direct|outcome]
// The only trap work is a counter, key conversion and returning a prebuilt descriptor.
import assert from 'node:assert/strict';
const [,, tree = process.cwd(), depthText = '0', surface = 'direct'] = process.argv;
const { canonicalize } = await import(`${tree}/packages/kernel/src/values.ts`);
const D = Number(depthText), repeats = 8;
let tail = null;
for (let index = 0; index < D; index++) tail = Object.create(tail);
const descriptors = Array.from({ length: 4096 }, () => Object.assign(Object.create(tail), {
  value: undefined, writable: true, enumerable: true, configurable: true,
}));
let descriptorCalls = 0, readCalls = 0;
const inner = new Proxy(Array(4096).fill(undefined), {
  getOwnPropertyDescriptor(target, key) {
    if (key === 'length') return Reflect.getOwnPropertyDescriptor(target, key);
    descriptorCalls++;
    return descriptors[Number(key)];
  },
  get(target, key) { readCalls++; return Reflect.get(target, key); },
});
const root = Array(repeats).fill(inner);
let call, verify;
if (surface === 'direct') {
  call = () => canonicalize(root);
  verify = result => {
    assert.equal(result.ok, false);
    assert.equal(result.issues.reduce((n, issue) => n + (issue.occurrences ?? 1), 0), repeats * 4096);
    assert.ok(result.issues.every(issue => issue.code === 'undefined_member'));
    assert.equal(result.issues.length, 9);
  };
} else if (surface === 'outcome') {
  const { ExecutionCoordinator } = await import(`${tree}/packages/kernel/src/index.ts`);
  const h = await import(`${tree}/packages/kernel/tests/harness.ts`);
  const { assertOnlyRefusal } = await import(`${tree}/packages/kernel/tests/refusal-diagnostics-fixture.ts`);
  const who = h.caller('descriptor-probe'), driver = h.recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
  const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const proposal = h.outcomeFor(executionId, open, { progress: root });
  const before = h.accepted(kernel.inspect(who, executionId)), deliveries = driver.seen.length;
  call = () => kernel.submitOutcome(h.observer('visible'), proposal, undefined);
  verify = result => {
    const refusal = h.refused(result);
    assert.equal(refusal.classification, 'unauthorized_submission');
    assertOnlyRefusal(before, h.accepted(kernel.inspect(who, executionId)), refusal);
    assert.equal(driver.seen.length, deliveries);
    h.accepted(kernel.submitOutcome(who, h.outcomeFor(executionId, open), h.submissionFor(driver, open.activationId)));
  };
} else throw Error(`unknown surface: ${surface}`);
globalThis.gc?.();
const start = performance.now(), result = call(), ms = performance.now() - start;
verify(result);
assert.equal(descriptorCalls, repeats * 4096);
assert.equal(readCalls, repeats * 4097);
console.log(JSON.stringify({ D, surface, repeats, ms, descriptorCalls, readCalls,
  ok: result.ok, classification: surface === 'outcome' ? result.error.classification : 'undefined_member',
  logicalAssertions: 'passed; timing is an observation, not a passed cost gate' }));
