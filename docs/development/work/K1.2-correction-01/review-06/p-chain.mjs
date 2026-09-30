// Reviewer probe R-P1: refusal time when diagnostic construction walks caller-built prototype chains.
// Usage: node --expose-gc --experimental-strip-types p-chain.mjs <treeRoot> <mode> [D] [N] [M]
const [,, root, mode, Ds = "0", Ns = "4096", Ms = "256"] = process.argv;
const { canonicalize } = await import(`${root}/packages/kernel/src/values.ts`);
const D = Number(Ds), N = Number(Ns), M = Number(Ms);
let value;
if (mode === "accept-zeros") {
  // costliest simple accepted shape near the limit: shared inner arrays of 0 (2 bytes/position)
  const inner = Array(4096).fill(0); value = Array(127).fill(inner);
} else if (mode === "accept-empty-objects") {
  const inner = Array.from({ length: 4096 }, () => ({})); value = Array(85).fill(inner);
} else if (mode === "accept-empty-arrays") {
  const inner = Array.from({ length: 4096 }, () => []); value = Array(85).fill(inner);
} else if (mode === "refuse-chain") {
  let tail = { constructor: { name: "X" } };
  for (let i = 0; i < D; i++) tail = Object.create(tail);
  const objs = Array.from({ length: N }, () => Object.create(Object.create(tail)));
  value = Array(M).fill(objs);
} else if (mode === "refuse-undefined") {
  value = Array(M).fill(Array(4096).fill(undefined));
} else throw Error(mode);
globalThis.gc(); const h0 = process.memoryUsage().heapUsed; const t0 = performance.now();
const r = canonicalize(value);
const ms = performance.now() - t0; const h1 = process.memoryUsage().heapUsed;
const total = r.ok ? 0 : r.issues.reduce((n, i) => n + (i.occurrences ?? 1), 0);
console.log(JSON.stringify({ mode, D, N, M, ok: r.ok, bytes: r.ok ? r.value.canonicalBytes : null, records: r.ok ? 0 : r.issues.length, total, ms: Math.round(ms), heapMiB: +((h1 - h0) / 2**20).toFixed(1), rssMiB: Math.round(process.memoryUsage().rss / 2**20) }));
