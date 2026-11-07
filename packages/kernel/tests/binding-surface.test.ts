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
  // K1.4 (design 02 D01-CHK-06): the public graph now reaches internal/. Kept property: exactly the
  // bridge codec (encoding) and the wrapper module (the K14-5 export and the L-01 check) import it, and
  // the entry exports exactly the wrapper's bindings.
  const publicGraph = await walkModuleGraph(workspace, ['packages/sdk/src/index.ts']);
  const internalImporters = publicGraph.edges
    .filter(edge => edge.resolution.kind === 'internal' && edge.resolution.file.startsWith('packages/sdk/src/internal/') && !edge.from.startsWith('packages/sdk/src/internal/'))
    .map(edge => edge.from);
  assert.deepEqual([...new Set(internalImporters)].sort(), [
    'packages/sdk/src/legacy-bridge/codec.ts', 'packages/sdk/src/wrapper.ts',
  ]);
  const sdkPublic = await import('../../sdk/src/index.ts');
  assert.deepEqual(Object.keys(sdkPublic).sort(), [
    'ApplicationConfigurationError', 'ApplicationInputError', 'ApplicationStartError', 'LegacyHarnessMutationRefused',
    'WrapperEnvironmentError', 'createApplication', 'defineAgent', 'defineWorkflow', 'definitionRef', 'toCanonicalBytes',
  ]);
});

// K1.4 (design 02 D01-CHK-06): the prefix may differ from released B only by the L-01 call inside the
// serializer window and the two own-array helpers that check imports; removing exactly those restores B.
const L01_IMPORT = ['import { appendOwn, defineAt, defineData, readAt, restoreDescriptor, sizedList } from "./own-array.ts";',
  'import { appendOwn, defineAt, defineData, descriptorValue, isDataDescriptor, readAt, restoreDescriptor, sizedList } from "./own-array.ts";'] as const;
const L01_CALL = '    // L-01 (K1.4): a lexical shadow of a free identifier, which the swap above cannot reach, refuses the call.\n    checkSerializerEnvironment();\n';

test('the relocated capture implementation is byte-identical to released B before its new byte bridge, apart from the L-01 call', async () => {
  const source = await readFile(resolve(root, 'packages/sdk/src/internal/value-capture.ts'), 'utf8');
  const current = source.slice(0, source.indexOf('// Internal SDK bridge:')).trimEnd() + '\n';
  assert.equal(current.split(L01_CALL).length, 2, 'exactly one L-01 call in the prefix');
  assert.equal(current.split(L01_IMPORT[1]).length, 2, 'exactly one widened own-array import');
  const prefix = current.replace(L01_CALL, '').replace(L01_IMPORT[1], L01_IMPORT[0]);
  assert.equal(createHash('sha256').update(prefix).digest('hex'), '8d6e7585d0c62791df1ff9849cc1ca10b716321f7745caa137a31f1acd7cf1b6');
});
