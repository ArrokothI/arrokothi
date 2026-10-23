/** B1-1/B1-5: compile-time root contracts and both package dependency directions. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CreateExecutionRequest, SubmitInputRequest, OutcomeEnvelope, EmissionProposal, OutcomeNext, CodeAvailability, BoundaryValue } from '../src/index.ts';
import { loadWorkspace, walkModuleGraph, typeScriptFilesUnder } from '../../../tests/conformance/architecture/module-graph.ts';
import { boundaryViolations } from '../../../tests/conformance/architecture/boundary-policy.ts';

type Equal<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;
type Check<T extends true> = T;
type InputRoots = Check<Equal<[
  CreateExecutionRequest['authorityContext'], CreateExecutionRequest['initialInput']['payload'],
  SubmitInputRequest['payload'], OutcomeEnvelope['progress'], EmissionProposal['value'],
  Extract<OutcomeNext, {step:'complete'}>['result'], Extract<OutcomeNext, {step:'fail'}>['error'],
  CodeAvailability['definitionRevisions'], CodeAvailability['runtimeContractRevisions'], CodeAvailability['progressCodecs'],
], [Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array, Uint8Array]>>;
type IdentityText = Check<Equal<[
  CreateExecutionRequest['creationKey'], CreateExecutionRequest['scope'], CreateExecutionRequest['definitionRevision'],
  CreateExecutionRequest['runtimeContractRevision'], CreateExecutionRequest['progressCodec'],
  SubmitInputRequest['requestKey'], SubmitInputRequest['kind'], EmissionProposal['emissionKey'],
], [string,string,string,string,string,string,string,string]>>;
// These are compile-only witnesses: widening a root to a live object, or making returned data mutable,
// makes the corresponding @ts-expect-error unused during the required typecheck.
function compileWitness(request: CreateExecutionRequest, output: Extract<BoundaryValue, readonly unknown[]>) {
  // @ts-expect-error value roots accept only canonical byte views
  request = { ...request, authorityContext: { a: 1 } };
  // @ts-expect-error owned output arrays are readonly
  output[0] = 1;
  // @ts-expect-error owned output arrays expose no mutator
  output.push(1);
  return request;
}
void (undefined as unknown as InputRoots); void (undefined as unknown as IdentityText); void compileWitness;
const root = resolve(import.meta.dirname, '../../..');

test('SDK capture is internal and its transitive graph imports no Kernel', async () => {
  const workspace = await loadWorkspace(root);
  const files = await typeScriptFilesUnder(root, 'packages/sdk/src/internal');
  assert.equal(files.length, 2);
  const graph = await walkModuleGraph(workspace, files);
  assert.deepEqual(boundaryViolations(graph, {
    zoneRoots: ['packages/sdk/src/internal'], allowedLeaves: [], allowedExternalPrefixes: ['node:'],
    allowedExternalSpecifiers: ['canonicalize'],
  }), []);
  const sdk = workspace.packages.get('@arrokothi/sdk')!;
  assert.deepEqual([...sdk.exports.keys()], ['.']);
  const publicGraph = await walkModuleGraph(workspace, ['packages/sdk/src/index.ts']);
  assert.equal([...publicGraph.files].some(file => file.startsWith('packages/sdk/src/internal/')), false);
  const sdkPublic = await import('../../sdk/src/index.ts');
  assert.deepEqual(Object.keys(sdkPublic).sort(), ['ApplicationConfigurationError', 'createApplication', 'defineAgent', 'defineWorkflow', 'definitionRef']);
});

test('the relocated capture implementation is byte-identical to released B before its new byte bridge', async () => {
  const source = await readFile(resolve(root, 'packages/sdk/src/internal/value-capture.ts'), 'utf8');
  const prefix = source.slice(0, source.indexOf('// Internal SDK bridge:')).trimEnd() + '\n';
  assert.equal(createHash('sha256').update(prefix).digest('hex'), '8d6e7585d0c62791df1ff9849cc1ca10b716321f7745caa137a31f1acd7cf1b6');
});
