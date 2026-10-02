// Current observations superseded by decision-01. These are held evidence, not legal outcomes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canonicalize } from '../../packages/kernel/src/values.ts';
const id = process.argv[2];
const entry = JSON.parse(readFileSync('tests/fixtures/packet-tools/mutations.json', 'utf8'))
  .cases.find(row => row.id === id);
const { recipe, recorded_observation } = entry.input;
// Each recipe stores constructor arguments, values and the replacement prototype explicitly.
const constructors = { Map, Date, Set, Uint8Array, ArrayBuffer, RegExp, Error, String, Boolean, WeakMap };
let value;
if (recipe.type === 'Proxy') value = new Proxy(recipe.target, {});
else value = Reflect.construct(constructors[recipe.type], recipe.arguments);
if ('prototype' in recipe) Object.setPrototypeOf(value, recipe.prototype === 'null' ? null : Object.prototype);
const result = canonicalize(value);
const actual = result.ok ? { accepted: true, canonical: result.value.canonical }
  : { accepted: false, codes: [...new Set(result.issues.map(issue => issue.code))] };
let comparisons = 0;
function agrees(value, expected) {
  comparisons += 1;
  try { assert.deepEqual(value, expected); return true; }
  catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; return false; }
}
const failures = [];
if (!agrees(actual, recorded_observation)) failures.push(id + '.recorded-observation');
if (agrees({ ...actual, tools01CorruptObservation: true }, recorded_observation)) {
  failures.push(id + '.reject-corrupt-observation');
}
const passed = failures.length === 0;
console.log(JSON.stringify({ case: id, assertion: id + '.recorded-observation', reached: true,
  passed, actual, comparisons, failures, claim: entry.claim }));
process.exitCode = passed ? 0 : 17;
