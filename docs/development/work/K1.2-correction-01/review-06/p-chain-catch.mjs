// Reviewer probe R-P4: the catch-path describe(error). A constant-time caller trap throws one shared
// deep-chain object; per refused position the Kernel's diagnostic walks the thrown value's chain.
// Usage: node --expose-gc --experimental-strip-types p-chain-catch.mjs <treeRoot> <D>
const [,, root, Ds] = process.argv;
const { canonicalize } = await import(`${root}/packages/kernel/src/values.ts`);
const D = Number(Ds);
let tail = { constructor: { name: "E" } };
for (let i = 0; i < D; i++) tail = Object.create(tail);
const thrown = Array.from({ length: 4096 }, () => Object.create(Object.create(tail)));
let n = 0;
const objs = Array.from({ length: 4096 }, (_, i) => new Proxy({}, { ownKeys() { n++; throw thrown[i]; } }));
const value = Array(256).fill(objs);
globalThis.gc(); const t0 = performance.now();
const r = canonicalize(value);
console.log(JSON.stringify({ D, ok: r.ok, trapCalls: n, total: r.ok ? 0 : r.issues.reduce((s, i) => s + (i.occurrences ?? 1), 0), firstCode: r.ok ? null : r.issues[0].code, ms: Math.round(performance.now() - t0) }));
