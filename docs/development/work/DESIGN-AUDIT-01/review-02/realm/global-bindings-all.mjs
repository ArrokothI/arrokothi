// Review 02 (Claude Code, claude-opus-5-5): writability of the eight globalThis bindings the Kernel serializer window pins
// (values.ts:1170-1177), with and without --frozen-intrinsics. Usage: node [--frozen-intrinsics] global-bindings-all.mjs
const names = ['isNaN', 'isFinite', 'Object', 'Array', 'JSON', 'Set', 'Error', 'Symbol'];
const out = { node: process.version, frozenIntrinsics: process.execArgv.includes('--frozen-intrinsics'), bindings: {} };
for (const n of names) {
  const d = Object.getOwnPropertyDescriptor(globalThis, n); const original = globalThis[n]; let assign;
  try { globalThis[n] = function replaced() {}; assign = globalThis[n] !== original ? 'replaced' : 'unchanged'; } catch (e) { assign = 'threw ' + e.constructor.name; }
  globalThis[n] = original;
  out.bindings[n] = { writable: d.writable, configurable: d.configurable, intrinsicFrozen: Object.isFrozen(original), assignment: assign };
}
console.log(JSON.stringify(out, null, 1));
