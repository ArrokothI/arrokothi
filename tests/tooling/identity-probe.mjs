// Project-owned fixture for TOOLS-01. Fixed expectations are independent of the packing code.
import { packIdentity } from '../../packages/kernel/src/identity.ts';
import { readFileSync } from 'node:fs';

const entry = JSON.parse(readFileSync('tests/fixtures/packet-tools/mutations.json', 'utf8'))
  .cases.find(row => row.id === 'identity.parts');
const outputs = entry.input.values.map(parts => packIdentity(parts));
const expected = entry.input.expected;
const passed = outputs.length > 0 && outputs.length === expected.length
  && outputs.every((value, index) => value === expected[index])
  && new Set(outputs).size === outputs.length;
console.log(JSON.stringify({
  case: 'identity.parts',
  assertion: 'identity.injective-parts',
  reached: outputs.length > 0,
  passed,
}));
process.exitCode = passed ? 0 : 17;
