/** Independent KC3 review probe; does not modify the candidate.
 * Run with Node v26.10.0:
 *   node --experimental-strip-types probe-stop-boundary.mjs /absolute/candidate/tree
 * Optional --require-contract makes the demonstrated violation an exit-1 assertion.
 * Hooks wrap the real engine operation before values.ts loads, then globals are restored.
 * They do not change the returned listing or create a Proxy/accessor in any input.
 */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const tree = resolve(process.argv[2]);
const url = p => pathToFileURL(resolve(tree, p)).href;
const originals = { names: Object.getOwnPropertyNames, symbols: Object.getOwnPropertySymbols };
let target, namesUnits = 0, symbolsUnits = 0, targetNames = [];
Object.getOwnPropertyNames = function (object) {
  const result = originals.names(object);
  namesUnits += 1 + result.length;
  if (object === target) targetNames.push(result.length);
  return result;
};
Object.getOwnPropertySymbols = function (object) {
  const result = originals.symbols(object);
  symbolsUnits += 1 + result.length;
  return result;
};
let values;
try { values = await import(url('packages/kernel/src/values.ts')); }
finally {
  Object.getOwnPropertyNames = originals.names;
  Object.getOwnPropertySymbols = originals.symbols;
}
const { captureWithWork, canonicalize, boundaryValueIssues, isBoundaryValue, CAPTURE_WORK_BUDGET } = values;
const B = 3 * 1_048_576;
assert.equal(CAPTURE_WORK_BUDGET, B);
const reset = watched => { target = watched; namesUnits = 0; symbolsUnits = 0; targetNames = []; };
const foreignPrototype = Object.create(null);
const foreign = Object.create(foreignPrototype);

function fixture({ nameCount = 257, wrappers = 0, offset = 0, prototype = 'plain', sharedRows = true } = {}) {
  const last = Object.create(prototype === 'null' ? null : Object.prototype);
  last[Symbol('refused symbol')] = 1;
  for (let i = 0; i < nameCount; i++) last['k' + i] = 0;
  // Root has 193 elements and costs 390 of its own units. A full foreign row
  // costs 4*4096+4 = 16388; a partial row of 3805 costs 15224.
  // Target visit + one-symbol listing costs 3. Baseline before its diagnostic:
  //   390 + 191*16388 + 15224 + 3 = B-3.
  // Each extra empty object in place of a foreign object adds 1; each row
  // element adds 4; each enclosing singleton array adds 6.
  const adjustment = 3 - 6 * wrappers + offset;
  const extraElements = Math.floor(adjustment / 4);
  const empties = adjustment - 4 * extraElements;
  const full = Array(4096).fill(foreign);
  const root = Array.from({ length: 191 }, () => sharedRows ? full : Array(4096).fill(foreign));
  const partial = Array(3805 + extraElements).fill(foreign);
  for (let i = 0; i < empties; i++) partial[i] = {};
  root.push(partial, last);
  let value = root;
  for (let i = 0; i < wrappers; i++) value = [value];
  return { value, last, expectedBeforeDiagnostic: B + offset };
}

const rows = [];
for (const options of [
  ...[-2, -1, 0, 1, 2].map(offset => ({ offset })),
  ...[0, 1, 4096, 65536].map(nameCount => ({ nameCount })),
  ...[1, 15, 29].map(wrappers => ({ wrappers })),
  { prototype: 'null' }, { sharedRows: false },
]) {
  const f = fixture(options);
  reset(f.last);
  const { result, work } = captureWithWork(f.value);
  assert.equal(result.ok, false);
  const actualListingUnits = namesUnits + symbolsUnits;
  const row = { options, expectedBeforeDiagnostic: f.expectedBeforeDiagnostic, work,
    actualListingUnits, unchargedListingUnits: actualListingUnits - work.listing,
    targetNameListings: targetNames.slice(), issues: result.issues };
  if ((options.offset ?? 0) === 0) {
    assert.equal(work.stop, 'work');
    assert.equal(work.units, B + 1);
    assert.deepEqual(targetNames, []);
    assert.equal(row.unchargedListingUnits, 0);
  } else assert.equal(row.unchargedListingUnits, 0, 'adjacent alignment control');
  rows.push(row);
}

// The same boundary, through actual public/root consumers. Harness supplies
// ordinary identities/requests; assertions and the tested construction are ours.
const { ExecutionCoordinator } = await import(url('packages/kernel/src/index.ts'));
const { caller, observer, recordingDriver, createRequest, accepted, refused, outcomeFor, submissionFor } =
  await import(url('packages/kernel/tests/harness.ts'));
function setup() {
  const who = caller('independent-stop-review');
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, kernel, executionId, open, grant: submissionFor(driver, open.activationId) };
}
const consumers = [];
for (const kind of ['canonicalize', 'boundaryValueIssues', 'isBoundaryValue', 'creation-authority',
  'creation-input', 'ingress', 'recovery-definitionRevisions', 'recovery-runtimeContractRevisions',
  'recovery-progressCodecs', 'outcome-progress', 'outcome-emission', 'outcome-result', 'outcome-error', 'eager-eight']) {
  const f = fixture();
  const s = setup();
  const before = accepted(s.kernel.inspect(s.who, s.executionId));
  reset(f.last);
  let classification;
  if (kind === 'canonicalize') classification = canonicalize(f.value).ok ? 'accepted' : 'refused';
  else if (kind === 'boundaryValueIssues') classification = boundaryValueIssues(f.value).length ? 'refused' : 'accepted';
  else if (kind === 'isBoundaryValue') classification = isBoundaryValue(f.value) ? 'accepted' : 'refused';
  else {
    let answer;
    if (kind === 'creation-authority') answer = s.kernel.createExecution(s.who, createRequest({ creationKey: 'second', authorityContext: f.value }));
    else if (kind === 'creation-input') answer = s.kernel.createExecution(s.who, createRequest({ creationKey: 'second', initialInput: { kind: 'k', payload: f.value } }));
    else if (kind === 'ingress') answer = s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: 'input', kind: 'k', payload: f.value });
    else if (kind.startsWith('recovery-')) {
      const available = { definitionRevisions: ['definition@1'], runtimeContractRevisions: ['runtime-contract@1'], progressCodecs: ['inline-json@1'] };
      available[kind.slice('recovery-'.length)] = f.value;
      answer = s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available });
    } else {
      const overrides = kind === 'outcome-progress' ? { progress: f.value }
        : kind === 'outcome-emission' ? { emissions: [{ emissionKey: 'e', value: f.value }] }
        : kind === 'outcome-result' ? { next: { step: 'complete', result: f.value } }
        : kind === 'outcome-error' ? { next: { step: 'fail', error: f.value } }
        : { progress: f.value, emissions: Array.from({ length: 6 }, (_, i) => ({ emissionKey: 'e' + i, value: f.value })), next: { step: 'complete', result: f.value } };
      answer = s.kernel.submitOutcome(kind === 'eager-eight' ? observer('visible') : s.who,
        outcomeFor(s.executionId, s.open, overrides), kind === 'eager-eight' ? undefined : s.grant);
    }
    classification = refused(answer).classification;
  }
  const counts = targetNames.slice();
  assert.equal(counts.length, 0, kind);
  assert.ok(counts.every(n => n === 257));
  const after = accepted(s.kernel.inspect(s.who, s.executionId));
  const { refusals: oldRefusals, ...oldView } = before;
  const { refusals: newRefusals, ...newView } = after;
  assert.deepEqual(newView, oldView, 'whole accepted state is unchanged');
  assert.deepEqual(newRefusals.slice(0, oldRefusals.length), oldRefusals);
  consumers.push({ kind, classification, targetNameListings: counts });
}
const output = { node: process.version, tree, budget: B, contract_holds: true,
  explanation: 'Review 01 fixtures rerun with corrected expected outcome: the crossing diagnostic stops the root before the following names listing, including every eager root. Input construction, native wrappers and public schedules are unchanged.', rows, consumers };
console.log(JSON.stringify(output, null, 2));
if (process.argv.includes('--require-contract')) assert.equal(output.contract_holds, true, 'KC3 stop and complete metering');
