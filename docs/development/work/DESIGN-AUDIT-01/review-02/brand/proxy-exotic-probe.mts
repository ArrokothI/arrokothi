// Review 02 (Claude Code, claude-opus-5-5). Second hop for O-R8-4: a coherent, forwarding Proxy whose
// target is a re-prototyped built-in. Shows (1) what the current Kernel accepts, (2) what an
// internal-slot brand check sees through the Proxy, (3) that hidden contents collapse to one value.
// Usage: node --experimental-strip-types --no-warnings proxy-exotic-probe.mts <repo-root>
import { pathToFileURL } from 'node:url';
import { types } from 'node:util';
const { canonicalize } = await import(pathToFileURL(process.argv[2] + '/packages/kernel/src/values.ts').href);
const reproto = <T extends object>(o: T): T => { Object.setPrototypeOf(o, Object.prototype); return o; };
const cases: Record<string, () => unknown> = {
  'Map (control)': () => new Map([['k', 1]]),
  're-prototyped Map': () => reproto(new Map([['k', 1]])),
  'Proxy(re-prototyped Map), empty handler': () => new Proxy(reproto(new Map([['k', 1]])), {}),
  'Proxy(re-prototyped Map) other contents': () => new Proxy(reproto(new Map([['k', 2], ['z', 3]])), {}),
  'Proxy(re-prototyped Date)': () => new Proxy(reproto(new Date(0)), {}),
  'Proxy(re-prototyped Uint8Array)': () => new Proxy(reproto(new Uint8Array([1, 2])), {}),
};
const out: Record<string, unknown> = { node: process.version };
for (const [name, make] of Object.entries(cases)) {
  const v = make() as object;
  const r = canonicalize(v);
  out[name] = {
    kernel: r.ok ? { ok: true, canonical: r.value.canonical } : { ok: false, codes: r.issues.map((x: { code: string }) => x.code) },
    'util.types.isMap': types.isMap(v), 'util.types.isDate': types.isDate(v), 'util.types.isTypedArray': types.isTypedArray(v),
    'util.types.isProxy': types.isProxy(v),
  };
}
console.log(JSON.stringify(out, null, 1));
