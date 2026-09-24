// K1.1-correction-02 read-count probe (payload, committed in C).
//
// Counts the Kernel's own character and descriptor reads while refusing oversized values, using the
// reviewer's method from review 01: a wrapper around String.prototype.charCodeAt is installed before
// the module loads, so the Kernel's load-time captured reference is the wrapper, and the original is
// restored before any probe input is built. Run from the repository root:
//
//   node --experimental-strip-types --no-warnings docs/development/work/K1.1-correction-02/measure-probe.mjs
//
const original = String.prototype.charCodeAt;
let reads = 0;
String.prototype.charCodeAt = function (i) { reads++; return Reflect.apply(original, this, [i]); };
const { canonicalize } = await import(process.cwd() + '/packages/kernel/src/index.ts');
String.prototype.charCodeAt = original;
const out = {};
for (const n of [1_048_576, 8_388_608, 33_554_432]) {
  reads = 0; const r = canonicalize('a'.repeat(n));
  out['string ' + n] = { reads, codes: r.ok ? [] : r.issues.map((i) => i.code) };
}
let d = 0;
const big = Object.fromEntries(Array.from({ length: 550000 }, (_, i) => ['k' + i, 0]));
const p = new Proxy(big, { getOwnPropertyDescriptor(t, k) { d++; return Reflect.getOwnPropertyDescriptor(t, k); } });
const r = canonicalize(p);
out['object 550000 names'] = { descriptorReads: d, codes: r.ok ? [] : r.issues.map((i) => i.code) };
console.log(JSON.stringify(out, null, 1));
