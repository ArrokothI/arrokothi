// N15 impact probe (observation): a shared ordinary array carrying extra own names, repeated
// across a root. At H the surplus names are charged per visit; the N15 mutant charges only
// punctuation. Usage: node --experimental-strip-types n15-probe.mjs <tree> <extraNames>
import { pathToFileURL } from "node:url";
const [tree, extra] = [process.argv[2], Number(process.argv[3] ?? 4096)];
const { canonicalize } = await import(pathToFileURL(`${tree}/packages/kernel/src/values.ts`).href);
const bad = [];
for (let i = 0; i < extra; i++) bad["x" + i] = 0;
let visits = 0;
const root = Array(4096).fill(Array(4096).fill(bad));
const t0 = performance.now();
const r = canonicalize(root);
const ms = performance.now() - t0;
const total = r.ok ? 0 : r.issues.reduce((s, i) => s + (i.occurrences ?? 1), 0);
console.log(JSON.stringify({ tree: tree.split("/").pop(), extra, ok: r.ok, issues: total, codes: r.ok ? [] : [...new Set(r.issues.map(i => i.code))], ms: Math.round(ms) }));
