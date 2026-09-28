// Comparative observations for R6; deterministic zero-lookup tests own diagnostic discrimination.
// Decision-03 scopes descriptor conversion outside V-D1; its invocation counts remain binding.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const tree = process.cwd(), dir = 'docs/development/work/K1.2-correction-01';
if (process.argv[2] === 'accept-deep') {
  const { canonicalize } = await import(`${tree}/packages/kernel/src/values.ts`);
  let chain = [];
  for (let i = 1; i < 30; i++) chain = [chain];
  const value = Array(4).fill(Array(4096).fill(chain));
  // 4 * (4096 * (60-byte chain + comma) + 1) + 5 outer punctuation bytes = 999433.
  // Adding a final string uses another comma plus two quotes. Exact 1 MiB, depth 32.
  value.push('x'.repeat(1_048_576 - 999_433 - 3));
  globalThis.gc?.(); const h0 = process.memoryUsage().heapUsed, t = performance.now();
  const result = canonicalize(value), ms = performance.now() - t;
  assert.equal(result.ok, true);
  assert.equal(result.value.canonicalBytes, 1_048_576);
  console.log(JSON.stringify({ mode: 'accept-depth32-arrays', bytes: result.value.canonicalBytes,
    ms, heapMiB: (process.memoryUsage().heapUsed - h0) / 2**20, rssMiB: process.memoryUsage().rss / 2**20 }));
} else {
  const runs = [];
  for (let repeat = 1; repeat <= 3; repeat++) {
    for (const mode of ['accept-zeros', 'accept-empty-objects', 'accept-empty-arrays']) runs.push([`R-P1 control ${repeat}`, `${dir}/review-06/p-chain.mjs`, tree, mode]);
    runs.push([`depth32 exact-limit acceptance ${repeat}`, `${dir}/refusal-cost-probe-04.mjs`, 'accept-deep']);
    for (const depth of ['0', '1000', '10000']) {
      runs.push([`R-P1 refusal ${repeat}`, `${dir}/review-06/p-chain.mjs`, tree, 'refuse-chain', depth]);
      runs.push([`R-P4 thrown refusal ${repeat}`, `${dir}/review-06/p-chain-catch.mjs`, tree, depth]);
    }
  }
  for (const depth of ['0', '10000']) {
    for (const roots of ['1', '8']) runs.push(['R-P2 eager pre-authority', `${dir}/review-06/p-chain-outcome.ts`, tree, depth, roots]);
    runs.push(['R-P5 creation/ingress', `${dir}/review-06/p-chain-ingress.ts`, tree, depth]);
  }
  runs.push(['R-P3 exact coordinates', `${dir}/review-06/p-receipts.ts`, tree]);
  for (const surface of ['direct', 'outcome']) for (const depth of ['0', '1000', '10000']) {
    runs.push(['SELF-R4-DESCRIPTOR-01 decision-03 scope/count witness', `${dir}/probe-descriptor-chain-04.mjs`, tree, depth, surface]);
  }
  for (const [label, ...args] of runs) {
    const command = ['--expose-gc', '--max-old-space-size=4096', ...args];
    console.log(`${label}: ${JSON.stringify([process.execPath, ...command])}`);
    const result = spawnSync(process.execPath, command, { encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
    console.log(result.stdout + result.stderr);
    assert.ok(!result.error && result.status === 0 && result.signal === null, JSON.stringify({ exit: result.status, error: result.error?.message, signal: result.signal }));
  }
  console.log('All probes executed; descriptor conversion timing is outside V-D1 under owner decision-03; bounded observation/count assertions passed.');
}
