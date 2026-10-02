// Project-owned fixture for TOOLS-01. Fixed expectations are independent of the packing code.
import { packIdentity } from '../../packages/kernel/src/identity.ts';

const outputs = [
  packIdentity(['ab', 'c']),
  packIdentity(['a', 'bc']),
  packIdentity(['', 'abc']),
  packIdentity(['abc', '']),
];
const expected = ['2:ab1:c', '1:a2:bc', '0:3:abc', '3:abc0:'];
const passed = outputs.every((value, index) => value === expected[index])
  && new Set(outputs).size === outputs.length;
console.log(JSON.stringify({
  case: 'identity.parts',
  assertion: 'identity.injective-parts',
  reached: true,
  passed,
}));
process.exitCode = passed ? 0 : 17;
