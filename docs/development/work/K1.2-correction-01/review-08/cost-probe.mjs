// Reviewer cost probe (observation only, not a gate): plain-data (no Proxy) refusal shapes vs
// at-limit acceptance shapes, direct canonicalize(), one fresh process per run.
import { pathToFileURL } from "node:url";
const TREE = process.env.TREE, shape = process.argv[2];
const { canonicalize } = await import(pathToFileURL(`${TREE}/packages/kernel/src/values.ts`).href);
const wrap = (v, levels) => { for (let i = 0; i < levels; i++) v = [v]; return v; };
const row = (n, f) => Array.from({ length: n }, f);
const shapes = {
  // acceptance at the limits
  "A-zeros": () => Array(127).fill(Array(4096).fill(0)),
  "A-empty-arrays": () => Array(85).fill(row(4096, () => [])),
  "A-empty-arrays-deep": () => wrap(Array(85).fill(row(4096, () => [])), 29),
  "A-empty-objects-deep": () => wrap(Array(85).fill(row(4096, () => ({}))), 29),
  ...Object.fromEntries([[0, 30, 4], [14, 16, 7], [22, 8, 15], [26, 4, 28], [28, 2, 51]].map(([W, L, k]) => [`A-chain-W${W}-L${L}`, () => {
    let c = []; for (let i = 1; i < L; i++) c = [c];
    return wrap(Array(k).fill(Array(4096).fill(c)), W);
  }])),
  "R-foreign-depth16": () => { const p = Object.create(null); return wrap(Array(256).fill(row(4096, () => Object.create(p))), 14); },
  "A-members-null":() => { const o = {}; for (let i = 0; i < 4096; i++) o["k" + i] = null; return Array(20).fill(o); },
  // refusal, no Proxy anywhere
  "R-foreign": () => { const p = Object.create(null); return Array(256).fill(row(4096, () => Object.create(p))); },
  "R-foreign-deep": () => { const p = Object.create(null); return wrap(Array(256).fill(row(4096, () => Object.create(p))), 29); },
  "R-undefined-deep": () => wrap(Array(256).fill(Array(4096).fill(undefined)), 29),
  "R-nan-deep": () => wrap(Array(256).fill(Array(4096).fill(NaN)), 29),
  "R-too-deep": () => { const r = Array(4096).fill([]); return wrap(Array(256).fill(r), 30); },
  "R-cycle-deep": () => { const r = []; for (let i = 0; i < 4096; i++) r.push(r); return wrap(Array(256).fill(r), 28); },
  "R-nonenumerable": () => { const o = {}; for (let i = 0; i < 4096; i++) Object.defineProperty(o, "k" + i, { value: null, enumerable: false }); return Array(4096).fill(o); },
  "R-accessor": () => { const o = {}; for (let i = 0; i < 4096; i++) Object.defineProperty(o, "k" + i, { get() { return 1; }, enumerable: true }); return Array(4096).fill(o); },
  "R-undefined-members": () => { const o = {}; for (let i = 0; i < 4096; i++) o["k" + i] = undefined; return Array(4096).fill(o); },
  "R-foreign-arrays": () => { const p = Object.create(Array.prototype); return Array(256).fill(row(4096, () => Object.setPrototypeOf([], p))); },
};
const value = shapes[shape]();
global.gc(); const h0 = process.memoryUsage().heapUsed; const t0 = performance.now();
const r = canonicalize(value);
const ms = performance.now() - t0; const heap = (process.memoryUsage().heapUsed - h0) / 2 ** 20;
const weight = r.ok ? 0 : r.issues.reduce((s, i) => s + (i.occurrences ?? 1), 0);
console.log(JSON.stringify({ shape, ok: r.ok, bytes: r.ok ? r.value.canonicalBytes : undefined, records: r.ok ? 0 : r.issues.length, issues: weight, codes: r.ok ? [] : [...new Set(r.issues.map(i => i.code))], ms: Math.round(ms), heapMiB: +heap.toFixed(1) }));
