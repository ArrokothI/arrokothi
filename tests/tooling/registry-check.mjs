import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHECKS } from '../../packages/kernel/tests/sweep/fault-oracle.ts';
const registry = JSON.parse(readFileSync('tests/fixtures/packet-tools/mutations.json', 'utf8'));
const controls = JSON.parse(readFileSync('tests/fixtures/packet-tools/oracle-controls.json', 'utf8'));
const expected = Object.keys(CHECKS).sort();
assert.deepEqual(Object.keys(controls.controls).sort(), expected, 'every oracle comparison has a named negative control');
assert.deepEqual(registry.cases.filter(row => row.id.startsWith('oracle.')).map(row => row.id.slice(7)).sort(), expected,
  'every oracle comparison has exactly one registry case');
for (const name of expected) {
  const entry = registry.cases.find(row => row.id === `oracle.${name}`);
  assert.equal(entry.mutants.length, 1);
  assert.equal(entry.mutants[0].name, `oracle.disable-${name}`);
  assert.equal(entry.mutants[0].after, `${name}: () => true`);
}
console.log(JSON.stringify({ oracle_comparisons: expected.length, registered_mutants: expected.length }));
