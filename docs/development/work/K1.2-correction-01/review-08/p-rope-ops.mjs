// Does Map.get / === / charCodeAt flatten a rope? Measure time + heap for one operation.
const mk = (n) => { let s = "ab"; while (s.length < n) s = s + s; return s + "x"; }; // cons rope
const op = process.argv[2]; const n = Number(process.argv[3]);
const s = mk(n);
const m = new Map([["exec-1", 1]]);
global.gc?.();
const h0 = process.memoryUsage().heapUsed, r0 = process.memoryUsage().rss; const t0 = performance.now();
let r;
if (op === "map") r = m.get(s);
if (op === "eq") r = s === "exec-1";
if (op === "len") r = s.length;
if (op === "char") r = s.charCodeAt(0);
if (op === "slice") r = s.slice(0, 1024).length;
const t1 = performance.now();
console.log(op, s.length, (t1 - t0).toFixed(2) + " ms", "heap +" + ((process.memoryUsage().heapUsed - h0) / 2 ** 20).toFixed(1) + " MiB", "rss +" + ((process.memoryUsage().rss - r0) / 2 ** 20).toFixed(1) + " MiB", r);
