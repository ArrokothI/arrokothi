import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
const child = new URL('./byte-shadow-child.ts', import.meta.url);
for (const name of ['JSON','Object','Array','Number','String','Uint8Array','Reflect','Set','Map','WeakMap','Symbol','Error','TypeError','Function','ArrayBuffer']) {
  for (const form of ['assign','define','declare']) for (const timing of ['before','between']) {
    test(`B1-4 ${name} ${form} ${timing} calls preserves whole byte decisions`, () => {
      const output = execFileSync(process.execPath, [child.pathname, name, form, timing], { encoding: 'utf8', timeout: 15_000 });
      assert.deepEqual(JSON.parse(output), { name, form, timing, fakeCalls: 0, accepted: true });
    });
  }
}
