// Review 02 (Claude Code, claude-opus-5-5): does --frozen-intrinsics prevent replacing the global
// bindings that the approved serializer (canonicalize@3.0.0) resolves at call time
// (values.ts:1130-1137 lists them), and does such a replacement steer its output?
// Usage: node [--frozen-intrinsics] global-binding-probe.mjs <path-to-node_modules/canonicalize/lib/canonicalize.js>
import { pathToFileURL } from 'node:url';
const { default: canonicalize } = await import(pathToFileURL(process.argv[2]).href);
const out = { node: process.version, frozenIntrinsics: process.execArgv.includes('--frozen-intrinsics') };
out.objectPrototypeFrozen = Object.isFrozen(Object.prototype);
out.JSONObjectFrozen = Object.isFrozen(JSON);
out.globalThisFrozen = Object.isFrozen(globalThis);
out.globalJSONDescriptor = (({ writable, configurable }) => ({ writable, configurable }))(Object.getOwnPropertyDescriptor(globalThis, 'JSON'));
out.globalObjectDescriptor = (({ writable, configurable }) => ({ writable, configurable }))(Object.getOwnPropertyDescriptor(globalThis, 'Object'));
const value = { b: 2, a: [1, 'x'] };
out.before = canonicalize(value);
// Control: the five review-01 intrinsic mutations (attempt only one representative here).
try { Object.prototype.toJSON = () => 'steered'; out.objectPrototypeToJSON = 'assigned'; delete Object.prototype.toJSON; } catch (e) { out.objectPrototypeToJSON = 'threw ' + e.constructor.name; }
// Second hop: replace the global *bindings*, not the intrinsics themselves.
const realJSON = globalThis.JSON, realObject = globalThis.Object;
try {
  globalThis.JSON = { stringify: (x) => (typeof x === 'number' ? '999' : realJSON.stringify(x)) };
  out.replaceGlobalJSON = 'assigned';
} catch (e) { out.replaceGlobalJSON = 'threw ' + e.constructor.name; }
try {
  globalThis.Object = { keys: (o) => realObject.keys(o).reverse().concat([]) .filter(k => k !== 'b') };
  out.replaceGlobalObject = 'assigned';
} catch (e) { out.replaceGlobalObject = 'threw ' + e.constructor.name; }
let after;
try { after = canonicalize(value); } catch (e) { after = 'threw ' + e.message; }
out.after = after;
globalThis.JSON = realJSON; globalThis.Object = realObject;
out.restored = canonicalize(value);
out.steered = out.after !== out.before;
console.log(JSON.stringify(out, null, 1));
