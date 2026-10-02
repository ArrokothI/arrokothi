// Reviewer probe (DESIGN-AUDIT-01 review 03; Claude Code, claude-opus-5-5). Whole-decision effect
// of the global declarative-record hop on the current integrated Kernel, read-only (argv[2] is a
// checkout). Step 1 creates an Execution whose coherent initial-input Proxy runs one classic script
// (`let JSON = ...`) during its permitted observation. Step 2 retries the SAME creation key with a
// DIFFERENT ordinary payload. A correct binding refuses step 2 as a creation-key conflict; replay
// requires identical canonical content. Control mode skips the script.
// Usage: node --experimental-strip-types --no-warnings kernel-lexical-creation.mts <checkout> <hop|control>
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], mode = process.argv[3];
const { ExecutionCoordinator } = await import(pathToFileURL(root + '/packages/kernel/src/index.ts').href);
const { caller, createRequest, recordingDriver } = await import(pathToFileURL(root + '/packages/kernel/tests/harness.ts').href);
const savedJSON = JSON;
const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
const author = caller('app-a', 'tenant-a');
let fired = false;
const payload = new Proxy({ b: 2, a: [1, 'x'] } as Record<string, unknown>, { get(t, k, r) {
  if (mode === 'hop' && k === 'b' && !fired) { fired = true;
    vm.runInThisContext("let JSON = { stringify: (x) => typeof x === 'number' ? '999' : globalThis.JSON.stringify(x) };"); }
  return Reflect.get(t, k, r);
}});
const first = kernel.createExecution(author, createRequest({ creationKey: 'lex-1', initialInput: { kind: 'k', payload } }));
const second = kernel.createExecution(author, createRequest({ creationKey: 'lex-1', initialInput: { kind: 'k', payload: { b: 7, a: [3, 'x'] } } }));
const summary = (r: any) => r.ok ? { ok: true, executionId: r.value.executionId, replayed: r.value.replayed ?? r.value.replay ?? null } : { ok: false, reason: r.error?.reason ?? r.error?.code ?? r.error };
const view = first.ok ? kernel.inspect(author, first.value.executionId) : null;
const retained = view && view.ok ? savedJSON.stringify(view.value.mailbox?.[0]?.payload ?? view.value) : null;
process.stdout.write(savedJSON.stringify({ reviewer: 'Claude Code claude-opus-5-5 (review 03)', node: process.version, mode, fired,
  first: summary(first), second: summary(second),
  sameExecutionForDifferentContent: first.ok && second.ok && first.value.executionId === second.value.executionId,
  firstRetainedPayload: retained }) + '\n');
