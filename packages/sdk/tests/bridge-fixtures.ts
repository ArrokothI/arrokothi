/** Shared definitions and readers for the K1.4 bridge corpus (`bridge-*.test.ts`). */
import { defineAgent, defineWorkflow } from "@arrokothi/sdk";
import type { Application, ApplicationOptions } from "@arrokothi/sdk";
import type { ModelProvider } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer, createCapabilityCatalog, createCapabilityConfirmationPolicy, portableModelFeatures,
} from "@arrokothi/core/reference";

export const features = portableModelFeatures({ capabilityCalls: true, structuredOutput: true });
export const models = (provider: ModelProvider) => ({ providers: [provider], bindings: {
  primary: { provider: provider.id, model: "test", portableFeatures: features },
} });

export const DOCS = { capability: "docs", operation: "read" } as const;
export const catalog = createCapabilityCatalog([{ ...DOCS, consequential: false, description: "Read docs", input: { kind: "object", fields: {} } }]);
export const allowDocs = () => createAllowListAuthorizer({ grants: [{ capability: "docs" }], spawn: { definitions: ["lookup", "chat"] } });
export const confirmDocs = () => createCapabilityConfirmationPolicy({ rules: [{ capability: "docs", operations: ["read"] }] });

export const chatAgent = (maxModelCalls = 8) => defineAgent({
  id: "chat", terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
  spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Chat", completion: "respond_and_wait", limits: { maxModelCalls } },
});
export const answerAgent = () => defineAgent({
  id: "answer", terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
  spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Answer", completion: "complete_on_response" },
});
export const toolAgent = () => defineAgent({ id: "lookup", spec: {
  model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
  instructions: "Read", operations: { refs: [DOCS] }, completion: "complete_on_response",
} });
export const readThenAnswer = () => [
  { output: { capabilityCalls: [{ id: "read", capability: "docs_read", input: {} }] } },
  { output: { text: "Done" } },
];

/** A one-Stage Function Workflow running `ref`. */
export const functionWorkflow = (id: string, ref: string) => defineWorkflow({ id, spec: { entryStage: "work", stages: [
  { id: "work", kind: "function", implementationRef: ref, transitions: { kind: "always", next: { to: "complete" } } },
] } });
export const loopWorkflow = () => defineWorkflow({ id: "loop", spec: { entryStage: "work", stages: [
  { id: "work", kind: "function", implementationRef: "tick", transitions: { kind: "always", next: { to: "stage", stage: "work" } } },
] } });
/** A Workflow whose one Stage calls the `child` Agent. */
export const callingWorkflow = (child: string) => defineWorkflow({ id: "parent", spec: { entryStage: "call", stages: [
  { id: "call", kind: "agent", child: { definitionId: child, definitionVersion: 1 }, requestedOperations: [DOCS], transitions: { kind: "always", next: { to: "complete" } } },
] } });

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}
export function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

/** A manual `runtime.clock`; the Kernel clock reads the same instant. */
export function manualClock(start = 1_000_000) {
  let now = start;
  return {
    clock: { now: () => new Date(now) },
    advance(ms: number) { now += ms; },
    get now() { return now; },
  };
}

type EmissionValue = { kind?: string; results?: { eventId: string; kind: string; status: string; reason?: string }[]; pauses?: { kind: string; executionId: string; confirmationId?: string }[]; emission?: { body: unknown } };

const values = (app: Application, executionId: string): EmissionValue[] =>
  app.inspect(executionId).emissions.map(emission => emission.value as EmissionValue);

/** Every native ingress result the bridge reported, in acceptance order. */
export const ingressResults = (app: Application, executionId: string) =>
  values(app, executionId).filter(value => value.kind === "arrokothi.bridge.ingress_result").flatMap(value => value.results ?? []);
/** Every pause Emission's pause list, oldest first. */
export const pauseEmissions = (app: Application, executionId: string) =>
  values(app, executionId).filter(value => value.kind === "arrokothi.bridge.pause").map(value => value.pauses ?? []);
/** The native Emission bodies the Kernel accepted, in order. */
export const nativeBodies = (app: Application, executionId: string) =>
  values(app, executionId).filter(value => value.kind === "arrokothi.legacy.emission").map(value => value.emission?.body);

/** The Kernel Execution ID for an SDK creation key (identity.md: length-prefixed packing). */
export const kernelId = (creationKey: string) => `execution-13:arrokothi.sdk11:application${creationKey.length}:${creationKey}`;

export type Options = ApplicationOptions;
