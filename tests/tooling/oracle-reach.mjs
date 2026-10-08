// Installed only in the disposable child. Observe the real comparison without changing its answer.
import { writeFileSync } from 'node:fs';
import { CHECKS } from '../../packages/kernel/tests/sweep/fault-oracle.ts';
const name = process.env.PACKET_ORACLE_CHECK;
const original = CHECKS[name];
if (typeof original !== 'function') throw new Error('Unknown oracle comparison');
let calls = 0;
CHECKS[name] = (...args) => { calls += 1; return original(...args); };
process.on('exit', () => writeFileSync(process.env.PACKET_REACH_FILE, JSON.stringify({ name, calls })));
