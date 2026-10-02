// Reviewer probe (DESIGN-AUDIT-01 review 03; Claude Code, claude-opus-5-5). K11-R5-STATE-01's second
// recorded witness (dispatch.test.ts:567 replaces Object.freeze from a coherent read), first hop
// (property on the Object constructor) and binding hop (globalThis.Object), with and without the flag
// and with the eight A-hard pins.
const pinned = process.argv[2] === 'pinned';
const saved = { Object, freeze: Object.freeze, JSON };
if (pinned) for (const k of ['isNaN','isFinite','Object','Array','JSON','Set','Error','Symbol'])
  saved.Object.defineProperty(globalThis, k, { value: globalThis[k], writable: false, configurable: false });
const out = { reviewer: 'Claude Code claude-opus-5-5 (review 03)', node: process.version, frozen: process.execArgv.includes('--frozen-intrinsics'), pinned };
try { Object.freeze = (v) => v; out.firstHop = Object.freeze === saved.freeze ? 'unchanged' : 'replaced'; } catch (e) { out.firstHop = e.name; }
if (Object.freeze !== saved.freeze) saved.Object.defineProperty(saved.Object, 'freeze', { value: saved.freeze });
try { globalThis.Object = { freeze: (v) => v }; out.bindingHop = 'replaced'; } catch (e) { out.bindingHop = e.name; }
const o = {}; Object.freeze(o); out.liveFreezeWorks = saved.Object.isFrozen(o);
process.stdout.write(saved.JSON.stringify(out) + '\n');
