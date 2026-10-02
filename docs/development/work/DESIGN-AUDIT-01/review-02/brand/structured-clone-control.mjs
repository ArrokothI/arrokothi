// Review 02 (Claude Code, claude-opus-5-5): prior-art control for DA01-R2-PROXY-01. Structured clone
// classifies by internal slot (a re-prototyped Map clones as a Map) and refuses every Proxy outright.
// Usage: node structured-clone-control.mjs
const m = new Map([['k', 1]]); Object.setPrototypeOf(m, Object.prototype);
const out = { node: process.version };
for (const [name, v] of [['Proxy({})', new Proxy({}, {})], ['Proxy(re-prototyped Map)', new Proxy(m, {})], ['re-prototyped Map', m]]) {
  try { const c = structuredClone(v); out[name] = { cloned: Object.prototype.toString.call(c), entries: c instanceof Map ? [...c] : null }; }
  catch (e) { out[name] = { threw: e.name }; }
}
console.log(JSON.stringify(out, null, 1));
