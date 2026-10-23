// Maintained BINDING-01 ports of the sealed review-03 lexical shadow/creation witnesses.
// Core modules initialize first. Inputs are canonical bytes prepared before the shadow is installed.
import vm from 'node:vm';
import { ExecutionCoordinator } from '../../packages/kernel/src/index.ts';
import { acceptCanonicalBytes } from '../../packages/kernel/src/values.ts';
const [kind, mode] = process.argv.slice(2);
const stringify = JSON.stringify;
const saved = { JSON: globalThis.JSON, Object: globalThis.Object, Array: globalThis.Array };
const bytes = text => new TextEncoder().encode(text);
const text = '{"a":[1,"x"],"b":2}';
const firstBytes = bytes(text), secondBytes = bytes('{"a":[3,"x"],"b":7}');
const authority = bytes('{"tenant":"a"}');
const scripts = {
  JSON: "let JSON = { stringify: (x) => typeof x === 'number' ? '999' : globalThis.JSON.stringify(x) };",
  Object: "let Object = { keys: (o) => globalThis.Object.keys(o).filter((k) => k !== 'b') };",
  Array: "let Array = { isArray: () => false };",
  control: 'let bindingUnrelatedName = 1;',
};
const globalsUnchanged = () => globalThis.JSON === saved.JSON && globalThis.Object === saved.Object && globalThis.Array === saved.Array;
let actual;
if (kind === 'shadow') {
  if (!(mode in scripts)) throw new Error('unknown shadow');
  vm.runInThisContext(scripts[mode]);
  const summarize = result => result.ok
    ? { ok: true, canonical: result.value.canonical, value: result.value.value }
    : { ok: false, codes: result.issues.map(issue => issue.code) };
  actual = { case: mode, shadow: 'declared', globalBindingUnchanged: globalsUnchanged(),
    first: summarize(acceptCanonicalBytes(firstBytes)), later: summarize(acceptCanonicalBytes(firstBytes)) };
} else if (kind === 'creation') {
  if (!['control', 'hop'].includes(mode)) throw new Error('unknown creation mode');
  const kernel = new ExecutionCoordinator({ driver: { driverId: 'realm-byte-port', deliver(_a, s) { s.delivered(); }, isSafeToReplace() { return true; } } });
  const caller = { namespace: 'app-a', scopes: ['tenant-a'], controlScopes: ['tenant-a'] };
  const request = payload => ({ creationKey: 'lex-1', scope: 'tenant-a', definitionRevision: 'def', runtimeContractRevision: 'runtime', progressCodec: 'codec', authorityContext: authority, initialInput: { kind: 'k', payload } });
  const firstRequest = request(firstBytes);
  let fired = false;
  Object.defineProperty(firstRequest.initialInput, 'payload', { get() {
    if (mode === 'hop' && !fired) { fired = true; vm.runInThisContext(scripts.JSON); }
    return firstBytes;
  } });
  const summarize = result => result.ok
    ? { ok: true, executionId: result.value.executionId, replayed: result.value.replayed }
    : { ok: false, classification: result.error.classification };
  const first = kernel.createExecution(caller, firstRequest);
  const second = kernel.createExecution(caller, request(secondBytes));
  const replay = kernel.createExecution(caller, request(firstBytes));
  const view = first.ok ? kernel.inspect(caller, first.value.executionId) : null;
  actual = { mode, fired, globalBindingUnchanged: globalsUnchanged(), first: summarize(first), second: summarize(second), replay: summarize(replay),
    firstRetainedPayload: view?.ok ? view.value.mailbox[0].payload : null };
} else throw new Error('unknown byte port');
process.stdout.write(stringify(actual) + '\n');
