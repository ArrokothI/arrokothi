// Non-Proxy exotic objects with plain prototypes: what does own-key enumeration cost/throw?
const kind = process.argv[2], n = Number(process.argv[3]);
const rope = (m) => { let s = "ab"; while (s.length < m) s = s + s; return s; };
let v;
if (kind === "string") v = Object.setPrototypeOf(new String(rope(n)), null);
if (kind === "u8") v = Object.setPrototypeOf(new Uint8Array(n), null);
if (kind === "u8obj") v = Object.setPrototypeOf(new Uint8Array(n), Object.prototype);
if (kind === "args") v = (function () { return arguments; })(...Array(Math.min(n, 60000)).fill(0));
const t0 = performance.now(), h0 = process.memoryUsage().rss;
let out;
try { out = Object.getOwnPropertyNames(v).length; } catch (e) { out = "threw " + (e && e.constructor && e.constructor.name) + ": " + e.message; }
console.log(kind, n, out, (performance.now() - t0).toFixed(0) + " ms", "rss +" + ((process.memoryUsage().rss - h0) / 2 ** 20).toFixed(0) + " MiB");
