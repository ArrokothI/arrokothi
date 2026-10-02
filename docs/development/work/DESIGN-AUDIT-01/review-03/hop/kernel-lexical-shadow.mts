// Reviewer probe (DESIGN-AUDIT-01 review 03; Claude Code, claude-opus-5-5). Read-only use of the
// current Kernel source at the checkout given as argv[2]. A coherent caller Proxy (descriptor and
// ordinary read agree) runs one classic script during its permitted observation. The script's
// top-level `let <Name>` lands in the global declarative environment record, which identifier
// resolution in the unmodified canonicalize@3.0.0 module consults before globalThis. The Kernel's
// serializer window (values.ts serializerSlots) restores globalThis properties only.
// Usage: node --experimental-strip-types --no-warnings kernel-lexical-shadow.mts <checkout> <case>
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
const { canonicalize } = await import(pathToFileURL(process.argv[2] + '/packages/kernel/src/values.ts').href);
const which = process.argv[3];
const scripts: Record<string, string> = {
  JSON: "let JSON = { stringify: (x) => typeof x === 'number' ? '999' : globalThis.JSON.stringify(x) };",
  Object: "let Object = { keys: (o) => globalThis.Object.keys(o).filter((k) => k !== 'b') };",
  Array: "let Array = { isArray: () => false };",
  control: "let reviewerUnrelatedName = 1;",
};
if (!(which in scripts)) throw new Error('unknown case');
const saved = { JSON: globalThis.JSON, Object: globalThis.Object, Array: globalThis.Array };
const plain = { b: 2, a: [1, 'x'] };
let shadow = '', trapCalls = 0;
const value = new Proxy(plain, { get(target, key, receiver) {
  if (key === 'b' && trapCalls++ === 0) {
    try { vm.runInThisContext(scripts[which]); shadow = 'declared'; } catch (e) { shadow = (e as Error).name; }
  }
  return Reflect.get(target, key, receiver);
}});
const r = canonicalize(value);
const out = r.ok ? { ok: true, canonical: r.value.canonical } : { ok: false, codes: r.issues.map((i: { code: string }) => i.code) };
const later = canonicalize({ b: 2, a: [1, 'x'] });
const laterOut = later.ok ? later.value.canonical : later.issues.map((i: { code: string }) => i.code);
process.stdout.write(saved.JSON.stringify({ reviewer: 'Claude Code claude-opus-5-5 (review 03)', node: process.version, case: which,
  shadow, trapCalls, globalBindingUnchanged: globalThis.JSON === saved.JSON && globalThis.Object === saved.Object && globalThis.Array === saved.Array,
  expected: '{"a":[1,"x"],"b":2}', result: out, laterPlainCall: laterOut }) + '\n');
