/** Review 04: execute the candidate's exact F rows and ablations, with registration disabled.
 * Run from the repository root with Node 26.10. No production file is changed.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { LegacyDriver } from '../../../../../packages/sdk/src/legacy-bridge/driver.ts';

const root = resolve(import.meta.dirname, '../../../../..');
const sourcePath = resolve(root, 'packages/sdk/tests/bridge-terminate.test.ts');
const source = await readFile(sourcePath, 'utf8');
const registration = 'import { describe, test } from "node:test";';
assert.equal(source.split(registration).length, 2);
const exposed = source.replace(registration, 'const describe = () => {}; const test = () => {};') +
  '\nexport { ROWS, PAIRS, EQUIVALENT_ONLY, FAULTS, logged, TERMINATE_SITES };\n';
const js = ts.transpileModule(exposed, { compilerOptions: {
  target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext,
} }).outputText;
const temporary = resolve(root, `packages/sdk/tests/.review04-oracle-${process.pid}.mjs`);
const request = LegacyDriver.prototype.requestCancellation;
const end = LegacyDriver.prototype.endLineage;
await writeFile(temporary, js, { flag: 'wx' });
try {
  const { ROWS, PAIRS, EQUIVALENT_ONLY, FAULTS, logged, TERMINATE_SITES } = await import(pathToFileURL(temporary).href);
  const dispositions = Object.values(PAIRS).flatMap(Object.values);
  const counts = { rows: ROWS.length, labels: TERMINATE_SITES.length, removals: dispositions.length,
    kills: dispositions.filter(x => x === 'kill').length,
    equivalences: dispositions.filter(x => typeof x === 'object').length,
    empty: dispositions.filter(x => typeof x === 'object' && 'empty' in x).length,
    redundant: dispositions.filter(x => typeof x === 'object' && 'redundant' in x).length,
    killedLabels: new Set(Object.values(PAIRS).flatMap(x => Object.entries(x).filter(([,d]) => d === 'kill').map(([l]) => l))).size,
    equivalentOnly: Object.keys(EQUIVALENT_ONLY),
  };
  assert.deepEqual(counts, { rows: 20, labels: 16, removals: 30, kills: 16, equivalences: 14,
    empty: 1, redundant: 13, killedLabels: 15, equivalentOnly: ['initial-input'] });
  console.log(JSON.stringify({ counts }));
  for (const [key, fallback] of [['F1', 'cancel.application'], ['F2', 'cancel.exchange-start'], ['F3', 'cancel.forward-loop']]) {
    const row = ROWS.find(r => r.id.startsWith(key + ' '));
    assert.ok(row);
    for (const removed of [null, fallback, 'cancel.request']) {
      FAULTS.delete(key);
      const { calls, error } = await logged(row, removed);
      const faults = FAULTS.get(key);
      assert.equal(faults, removed === 'cancel.request' ? 0 : 1);
      if (removed === fallback) {
        assert.ok(error instanceof assert.AssertionError);
        assert.match(error.message, key === 'F1' ? / is WAITING$/ : / is READY$/);
      } else assert.equal(error, null);
      assert.equal(LegacyDriver.prototype.requestCancellation, request, 'request wrapper restored');
      assert.equal(LegacyDriver.prototype.endLineage, end, 'ablation wrapper restored');
      console.log(JSON.stringify({ key, removed, faults, error: error?.message ?? null,
        calls: calls.map(c => ({ label: c.label, ablated: c.ablated,
          entry: c.entry.map(m => m.lifecycle), exit: c.exit?.map(m => m.lifecycle) ?? null })) }));
    }
  }
} finally {
  await unlink(temporary);
}
