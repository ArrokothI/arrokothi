// SELF-R4-HANDLER-01: required Proxy observations discover traps through a handler chain.
// Run: node --expose-gc probe-handler-chain-04.mjs <tree> <depth> [direct|outcome]
// Decision-03's returned-value processing exemption is not assumed to cover trap discovery.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [,, treeArgument = process.cwd(), depthText = '0', surface = 'direct'] = process.argv;
const tree = resolve(treeArgument);
const source = path => pathToFileURL(`${tree}/${path}`).href;
const { canonicalize } = await import(source('packages/kernel/src/values.ts'));
const depth = Number(depthText), repeats = 8, width = 4096;
assert.ok(Number.isSafeInteger(depth) && depth >= 0);
const counts = { descriptor: 0, elementDescriptor: 0, read: 0, ownKeys: 0, prototype: 0 };
const traps = Object.assign(Object.create(null), {
  getOwnPropertyDescriptor(target, key) {
    counts.descriptor++;
    if (key !== 'length') counts.elementDescriptor++;
    return Reflect.getOwnPropertyDescriptor(target, key);
  },
  get(target, key) { counts.read++; return Reflect.get(target, key); },
  ownKeys(target) { counts.ownKeys++; return Reflect.ownKeys(target); },
  getPrototypeOf(target) { counts.prototype++; return Reflect.getPrototypeOf(target); },
});
let handler = traps;
for (let index = 0; index < depth; index++) handler = Object.create(handler);
// Returned descriptors are normal engine-created own-data objects. Only trap discovery traverses D.
const inner = new Proxy(Array(width).fill(undefined), handler);
const root = Array(repeats).fill(inner);
let call, verify;
if (surface === 'direct') {
  call = () => canonicalize(root);
  verify = result => {
    assert.equal(result.ok, false);
    assert.equal(result.issues.length, 9);
    assert.ok(result.issues.every(issue => issue.code === 'undefined_member'));
    assert.equal(result.issues.reduce((total, issue) => total + (issue.occurrences ?? 1), 0), repeats * width);
    assert.equal(result.issues[0].path, '[0][0]');
    assert.equal(result.issues[7].path, '[0][7]');
    assert.deepEqual(result.issues[8], {
      path: '', code: 'undefined_member', message: 'additional occurrences (locations omitted)',
      occurrences: repeats * width - 8,
    });
  };
} else if (surface === 'outcome') {
  const { ExecutionCoordinator } = await import(source('packages/kernel/src/index.ts'));
  const h = await import(source('packages/kernel/tests/harness.ts'));
  const who = h.caller('handler-probe'), driver = h.recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
  const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const proposal = h.outcomeFor(executionId, open, { progress: root });
  const before = h.accepted(kernel.inspect(who, executionId)), deliveries = driver.seen.length;
  call = () => kernel.submitOutcome(h.observer('visible'), proposal, undefined);
  verify = result => {
    const refusal = h.refused(result);
    assert.equal(refusal.classification, 'unauthorized_submission');
    assert.equal(refusal.executionId, executionId);
    assert.equal(refusal.position, before.refusals.length + 1);
    assert.ok(Object.isFrozen(refusal));
    assert.doesNotMatch(refusal.reason, /undefined_member|additional occurrences/);
    const after = h.accepted(kernel.inspect(who, executionId));
    assert.deepEqual(after, { ...before, refusals: [...before.refusals, refusal] });
    assert.strictEqual(after.refusals[after.refusals.length - 1], refusal);
    assert.equal(driver.seen.length, deliveries);
    const corrected = h.accepted(kernel.submitOutcome(who, h.outcomeFor(executionId, open), h.submissionFor(driver, open.activationId)));
    assert.equal(corrected.nextState, 'READY');
    assert.equal(corrected.progressRevision, 1);
    assert.deepEqual(corrected.acknowledged, open.batch);
  };
} else throw Error(`unknown surface: ${surface}`);
globalThis.gc?.();
const started = performance.now(), result = call(), elapsedMs = performance.now() - started;
verify(result);
assert.deepEqual(counts, {
  descriptor: repeats * (width + 1), elementDescriptor: repeats * width,
  read: repeats * (width + 1), ownKeys: repeats * 2, prototype: repeats,
});
console.log(JSON.stringify({ depth, surface, repeats, width, elapsedMs, counts,
  classification: surface === 'outcome' ? result.error.classification : 'undefined_member',
  logicalAssertions: 'passed; timing and cost-claim scope remain separate' }));
