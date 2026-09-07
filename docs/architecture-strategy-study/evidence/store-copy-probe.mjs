// Diagnostic of the reference store, not an application or competitive benchmark.
// Run from any directory: node --experimental-strip-types <this file>
import { performance } from 'node:perf_hooks';
import { InMemoryRuntimeStore } from '../../../packages/core/src/reference/in-memory-runtime-store.ts';
const rows = [];
for (const count of [0, 100, 1000, 5000]) {
  const store = new InMemoryRuntimeStore();
  await store.transact('seed', async tx => {
    for (let i = 0; i < count; i++) await tx.emissions.append({
      emissionId: `e${i}`, executionId: `x${i}`, activationId: `a${i}`,
      sequence: 1, body: { kind: 'text', text: 'x'.repeat(8192) },
      emittedAt: '2026-09-07T00:00:00.000Z',
    });
  });
  for (let i = 0; i < 3; i++) await store.transact('unrelated', async () => {});
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    await store.transact('unrelated', async () => {});
    samples.push(performance.now() - start);
  }
  samples.sort((a,b) => a-b);
  rows.push({ emissions: count, textBytes: count * 8192, samples: samples.length,
    medianMs: samples[10], p95Ms: samples[18] });
}
console.log(JSON.stringify({ node: process.version, platform: process.platform,
  arch: process.arch, measuredAt: new Date().toISOString(), rows }, null, 2));
