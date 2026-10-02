// Reviewer probe (DESIGN-AUDIT-01 review 03; Claude Code, claude-opus-5-5). Varies the replacement
// FORM of a global binding (the hop dimension) against two pin styles, under --frozen-intrinsics:
//   forms: assign (globalThis[k] = v), define (Object.defineProperty), declare (classic-script
//          top-level `let k` via vm.runInThisContext, which lands in the global declarative record),
//          preexisting (the `let` declaration runs at bootstrap, BEFORE pinning).
//   pins:  full (writable:false, configurable:false, as the A-hard/B-hard closures require),
//          writableOnly (writable:false, configurable left true: a plausible slip).
// A startup identity check reads globalThis[k] after pinning. The probe then runs the unmodified
// canonicalize@3.0.0 on ordinary data after a coherent Proxy read that attempts the replacement.
// Usage: node --frozen-intrinsics pin-forms-probe.mjs <canonicalize.js> <binding> <form> <pin>
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
const [, , path, name, form, pin] = process.argv;
const { default: canonicalize } = await import(pathToFileURL(path).href);
const saved = { [name]: globalThis[name], JSON: globalThis.JSON, Object: globalThis.Object };
const define = Object.defineProperty, reflectGet = Reflect.get, getDescriptor = Object.getOwnPropertyDescriptor;
const fakes = {
  JSON: "({ stringify: (x) => typeof x === 'number' ? '999' : globalThis.JSON.stringify(x) })",
  Object: "({ keys: (o) => globalThis.Object.keys(o).filter((k) => k !== 'b') })",
  Array: "({ isArray: () => false })",
};
if (!(name in fakes) || !['assign','define','declare','preexisting'].includes(form) || !['full','writableOnly'].includes(pin)) throw new Error('usage');
const fakeValue = () => vm.runInThisContext(fakes[name]);
let bootstrap = 'none';
if (form === 'preexisting') { try { vm.runInThisContext(`let ${name} = ${fakes[name]};`); bootstrap = 'declared'; } catch (e) { bootstrap = e.name; } }
define(globalThis, name, pin === 'full' ? { value: saved[name], writable: false, configurable: false } : { value: saved[name], writable: false });
const d = getDescriptor(globalThis, name);
const startupCheck = d.value === saved[name] && d.writable === false; // a globalThis-descriptor check
const input = { b: 2, a: [1, 'x'] };
let attempt = 'none', trapCalls = 0;
const caller = new Proxy({ payload: input }, { get(target, key, receiver) {
  trapCalls++;
  try {
    if (form === 'assign') { globalThis[name] = fakeValue(); attempt = 'assigned'; }
    else if (form === 'define') { define(globalThis, name, { value: fakeValue() }); attempt = 'defined'; }
    else if (form === 'declare') { vm.runInThisContext(`let ${name} = ${fakes[name]};`); attempt = 'declared'; }
  } catch (e) { attempt = e.name; }
  return reflectGet(target, key, receiver);
}});
const descriptor = getDescriptor(caller, 'payload');
const snapshot = reflectGet(caller, 'payload');
if (snapshot !== descriptor.value) throw new Error('incoherent probe');
let after; try { after = canonicalize(snapshot); } catch (e) { after = 'throws: ' + e.message; }
const expected = '{"a":[1,"x"],"b":2}';
process.stdout.write(saved.JSON.stringify({ reviewer: 'Claude Code claude-opus-5-5 (review 03)', node: process.version,
  frozen: process.execArgv.includes('--frozen-intrinsics'), name, form, pin, bootstrap,
  pinnedDescriptor: { writable: d.writable, configurable: d.configurable }, startupCheck, attempt, trapCalls,
  globalThisUnchanged: globalThis[name] === saved[name], after, steered: after !== expected }) + '\n');
