// A10 fixture: each file records its process and whether the other file's global is visible.
import { test } from 'node:test';
import { appendFileSync } from 'node:fs';

globalThis.floorIsolationA = true;
test('isolation a', () => appendFileSync(process.env.FLOOR_ORDER_LOG,
  JSON.stringify({ file: 'a', pid: process.pid, ppid: process.ppid, other: typeof globalThis.floorIsolationB }) + '\n'));
