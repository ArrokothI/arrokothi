import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createApplication, defineAgent, defineWorkflow, definitionRef, ApplicationConfigurationError } from "@arrokothi/sdk";
import type { ApplicationOptions, StartExecutionInput } from "@arrokothi/sdk";
import type { ModelProvider } from "@arrokothi/core/ports";
import {
  ScriptedModelProvider, portableModelFeatures, createDeferredModelProvider,
  createCapabilityCatalog, createAllowListAuthorizer, createCapabilityConfirmationPolicy,
  InMemoryRuntimeStore, FifoScheduler, createNoInlineWaitBudget,
} from "@arrokothi/core/reference";

const features = portableModelFeatures({ capabilityCalls: true, structuredOutput: true });
const models = (provider: ModelProvider) => ({ providers: [provider], bindings: {
  primary: { provider: provider.id, model: "test", portableFeatures: features },
} });
const agent = (completion: "complete_on_response" | "respond_and_wait" = "complete_on_response") => defineAgent({
  id: "answer", terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } },
  spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Answer", completion },
});
const transform = () => defineWorkflow({ id: "transform", spec: { entryStage: "work", stages: [
  { id: "work", kind: "function", implementationRef: "upper", transitions: { kind: "always", next: { to: "complete" } } },
] } });
const upper: NonNullable<ApplicationOptions["functions"]> = { upper: ctx => ({
  status: "completed", result: ctx.input?.toUpperCase() ?? null,
  emissions: [{ body: { kind: "text", text: ctx.input?.toUpperCase() ?? "NO INPUT" } }],
}) };
const operation = { capability: "docs", operation: "read" };
const catalog = createCapabilityCatalog([{ ...operation, consequential: false, description: "Read docs", input: { kind: "object", fields: {} } }]);
const toolAgent = () => defineAgent({ id: "lookup", spec: {
  model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
  instructions: "Read", operations: { refs: [operation] }, completion: "complete_on_response",
} });
const script = () => new ScriptedModelProvider({ id: "script", steps: [
  { output: { capabilityCalls: [{ id: "read", capability: "docs_read", input: {} }] } },
  { output: { text: "Done" } },
] });

test("a pure Function Workflow needs no model or policy and preserves emission versus terminal result", async () => {
  const app = createApplication({ functions: upper });
  const started = await app.start({ definition: transform(), input: { label: "text", payload: "hello" } });
  assert.equal(started.inputReceipt?.status, "delivered");
  const run = await app.runUntilBlocked(started.executionId);
  assert.equal(run.reason, "completed");
  assert.equal(run.execution.terminalResult?.value, null);
  assert.deepEqual((await app.harness.emissionsOf(started.executionId))[0]?.body, { kind: "text", text: "HELLO" });
});

test("registration is idempotent, rejects version changes, and start pins definitions", async () => {
  const app = createApplication({ functions: upper });
  const d = transform();
  const [ref] = await app.register(d, d);
  assert.deepEqual(await app.register(d), [ref]);
  const changed = { ...d, name: "changed" };
  await assert.rejects(app.register(changed), /immutable|already|version/i);
  await assert.rejects(app.start({ definition: changed }), ApplicationConfigurationError);
  const started = await app.start({ definition: ref! });
  assert.deepEqual(started.definition, definitionRef(d));
  const newer = { ...changed, version: 2 };
  await app.register(newer);
  assert.deepEqual((await app.harness.inspect(started.executionId))?.definition, ref);
});

test("registration validates a whole batch before inserting conflicting versions", async () => {
  const app = createApplication();
  const d = transform();
  await assert.rejects(app.register(d, { ...d, name: "collision" }));
  assert.equal(await app.services.definitions.getVersion(d.id, d.version), undefined);
});

test("missing handlers/models fail before any Execution is queued and preflight does no inference", async () => {
  const app = createApplication();
  const report = await app.preflight({ definition: transform() });
  assert.equal(report.ok, false);
  assert.ok(report.diagnostics.some(d => d.code === "function_missing"));
  await assert.rejects(app.start({ definition: agent() }), ApplicationConfigurationError);
  assert.equal(await app.services.scheduler.queuedCount(), 0);
  const provider = script();
  const configured = createApplication({ models: models(provider) });
  assert.equal((await configured.preflight({ definition: agent() })).ok, true);
  assert.equal(provider.requests.length, 0);
});

test("preflight finds a missing provider and incompatible static model features", async () => {
  const configured = models(script());
  for (const settings of [
    { ...configured, providers: [] },
    { ...configured, bindings: { primary: { ...configured.bindings.primary, portableFeatures: portableModelFeatures() } } },
  ]) {
    const app = createApplication({ models: settings });
    assert.equal((await app.preflight({ definition: toolAgent() })).ok, false);
  }
});

test("custom model resolution, policy, and custom view resolvers are never probed by preflight", async () => {
  let calls = 0;
  const app = createApplication({
    models: { providers: [], resolver: { resolve() { calls++; throw new Error("not during preflight"); } } },
    authorizer: { authorize() { calls++; throw new Error("not during preflight"); } },
    controllers: () => ({ agent: { views: { resolve() { calls++; throw new Error("not during preflight"); } } } }),
  });
  const report = await app.preflight({ definition: toolAgent() });
  assert.equal(report.ok, true);
  assert.ok(report.diagnostics.some(d => d.code === "model_resolution_deferred"));
  assert.equal(calls, 0);
});

test("catalog and exposure never grant dispatch permission", async () => {
  let calls = 0;
  const app = createApplication({ models: models(script()), capabilities: { catalog, executor: { async execute() { calls++; return { status: "success", observation: "docs" }; } } } });
  const start = await app.start({ definition: toolAgent(), operationAuthority: { operations: [operation] }, input: { label: "user", payload: "read" } });
  assert.ok(start.preflight.diagnostics.some(d => d.code === "effects_denied_by_default"));
  assert.equal((await app.runUntilBlocked(start.executionId)).reason, "completed");
  assert.equal(calls, 0);
  assert.ok((await app.harness.effectJournalOf(start.executionId)).some(e => e.phase === "denied"));
});

test("operation ceiling is independent from policy; default views use the supplied runtime store", async () => {
  const store = new InMemoryRuntimeStore();
  const provider = new ScriptedModelProvider({ id: "text", steps: [{ output: { text: "No actions" } }] });
  const app = createApplication({ models: models(provider), runtime: { store }, capabilities: { catalog, executor: { async execute() { throw new Error("must not run"); } } }, authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs" }] }) });
  const start = await app.start({ definition: toolAgent(), input: { label: "user", payload: "read" } });
  assert.ok(start.preflight.diagnostics.some(d => d.code === "operation_not_granted"));
  await app.runUntilBlocked(start.executionId);
  assert.equal(provider.requests[0]?.capabilities?.length ?? 0, 0);
  assert.equal(app.services.store, store);
  assert.ok(await store.readExecution(start.executionId));
});

test("approved exact payload dispatches once through the shared catalog, store, and authorizer", async () => {
  let calls = 0;
  const store = new InMemoryRuntimeStore();
  const app = createApplication({ models: models(script()), runtime: { store }, capabilities: { catalog, executor: { async execute() { calls++; return { status: "success", observation: "docs" }; } } },
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs", operations: ["read"] }] }),
    confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: "docs", operations: ["read"] }] }),
  });
  const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [operation] }, input: { label: "user", payload: "read" } });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "confirmation_required");
  assert.equal(calls, 0);
  const [confirmation] = await app.harness.pendingConfirmations();
  assert.ok(confirmation);
  await app.harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "approve" });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
  assert.equal(calls, 1);
});

test("memory binding and write exposure do not authorize a WriteMemory Effect", async () => {
  const d = defineAgent({ id: "memory", spec: {
    model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } }, instructions: "Save", completion: "complete_on_response",
    structuredMemory: { read: { keys: ["title"] }, write: { keys: ["title"] } },
  } });
  const provider = new ScriptedModelProvider({ id: "script", steps: [
    { output: { capabilityCalls: [{ id: "write", capability: "memory_write_title", input: { value: "Draft" } }] } },
    { output: { text: "Saved" } },
  ] });
  const app = createApplication({ models: models(provider), memory: { writeExposure: { writableKeys: ["title"] } } });
  const start = await app.start({ definition: d, structuredMemory: { fields: [{ key: "title", schema: { kind: "string" } }] }, input: { label: "user", payload: "Save" } });
  assert.ok(start.preflight.diagnostics.some(d => d.code === "memory_grant_missing" && d.path.endsWith("read")));
  const disabled = createApplication({ models: models(provider), memory: { read: true }, controllers: () => ({ agent: { structuredMemoryReadView: undefined } }) });
  assert.ok((await disabled.preflight({ definition: d })).diagnostics.some(d => d.code === "memory_resolver_missing" && d.path.endsWith("read")));
  await app.runUntilBlocked(start.executionId);
  assert.equal((await app.harness.structuredMemoryOf(start.executionId))?.values.title, undefined);
  assert.ok((await app.harness.effectJournalOf(start.executionId)).some(e => e.phase === "denied"));
});

test("a slow model yields; host timeout/abort preserve pending work and later resume exactly once", async () => {
  const provider = createDeferredModelProvider("slow");
  const app = createApplication({ models: models(provider), runtime: { inlineWait: createNoInlineWaitBudget() } });
  const { executionId } = await app.start({ definition: agent(), input: { label: "user", payload: "answer" } });
  const run = await app.runUntilBlocked(executionId, { timeoutMs: 15, pollIntervalMs: 1 });
  assert.equal(run.reason, "timeout");
  assert.equal(run.execution.lifecycle, "WAITING");
  assert.equal(provider.invocationCount, 1);
  const abort = new AbortController(); abort.abort();
  assert.equal((await app.runUntilBlocked(executionId, { signal: abort.signal })).reason, "aborted");
  const waiting = app.runUntilBlocked(executionId, { timeoutMs: 1000, pollIntervalMs: 1 });
  provider.settle({ text: "Ready" });
  const resumed = await waiting;
  assert.equal(resumed.reason, "completed");
  assert.equal(resumed.execution.terminalResult?.value, "Ready");
  assert.equal(provider.invocationCount, 1);
});

test("slow capabilities settle without an unbounded drain and cancellation remains explicit", async () => {
  let finish!: () => void;
  const app = createApplication({ models: models(script()), capabilities: { catalog, executor: { execute: () => new Promise(resolve => { finish = () => resolve({ status: "success", observation: "done" }); }) } }, authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs" }] }) });
  const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [operation] }, input: { label: "user", payload: "read" } });
  assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 15, pollIntervalMs: 1 })).reason, "timeout");
  finish();
  assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 1000, pollIntervalMs: 1 })).reason, "completed");
  const idle = await app.start({ definition: agent("respond_and_wait") });
  await app.harness.cancelExecution({ executionId: idle.executionId });
  assert.equal((await app.runUntilBlocked(idle.executionId)).reason, "cancelled");
});

test("conversation response yields input_required and cumulative budgets are unchanged", async () => {
  const provider = new ScriptedModelProvider({ id: "chat", steps: [{ output: { text: "One" } }, { output: { text: "Two" } }] });
  const d = agent("respond_and_wait");
  const app = createApplication({ models: models(provider) });
  const { executionId } = await app.start({ definition: defineAgent({ ...d, spec: { ...d.spec, limits: { ...d.spec.limits, maxModelCalls: 1 } } }), input: { label: "user", payload: "hello" } });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
  await app.harness.deliverExternalInput({ destination: executionId, label: "user", payload: "again" });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "failed");
  assert.equal(provider.requests.length, 1);
});

test("bounded loops report activation_limit, leaving the Execution runnable", async () => {
  const d = defineWorkflow({ id: "loop", spec: { entryStage: "work", stages: [
    { id: "work", kind: "function", implementationRef: "upper", transitions: { kind: "always", next: { to: "stage", stage: "work" } } },
  ] } });
  const app = createApplication({ functions: upper });
  const { executionId } = await app.start({ definition: d });
  assert.equal((await app.runUntilBlocked(executionId, { maxActivations: 2 })).reason, "activation_limit");
  assert.equal((await app.harness.inspect(executionId))?.lifecycle, "READY");
  await assert.rejects(app.runUntilBlocked(executionId, { maxActivations: 0 }), /positive/);
  await assert.rejects(app.runUntilBlocked(executionId, { timeoutMs: NaN }), /finite/);
});

test("SDK start serializes initial input ahead of concurrent scheduler driving", async () => {
  class SlowScheduler extends FifoScheduler {
    override async enqueue(id: Parameters<FifoScheduler["enqueue"]>[0]) { await super.enqueue(id); await delay(1); }
  }
  const app = createApplication({ functions: upper, runtime: { scheduler: new SlowScheduler() } });
  const started = app.start({ definition: transform(), input: { label: "text", payload: "first" } });
  await app.runUntilIdle();
  const { executionId } = await started;
  assert.deepEqual((await app.harness.emissionsOf(executionId))[0]?.body, { kind: "text", text: "FIRST" });
});

test("malformed initial data refuses before creation and a failed start does not poison the SDK lock", async () => {
  const app = createApplication({ functions: upper });
  await assert.rejects(app.start({ definition: transform(), input: { label: "", payload: "bad" } }), ApplicationConfigurationError);
  await assert.rejects(app.start({ definition: transform(), input: { label: "data", payload: new Date() } } as unknown as StartExecutionInput), ApplicationConfigurationError);
  assert.equal(await app.services.scheduler.queuedCount(), 0);
  const { executionId } = await app.start({ definition: transform() });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
});

test("controller hooks receive actual services and diagnostics reflect the effective registries", async () => {
  const store = new InMemoryRuntimeStore();
  const app = createApplication({ runtime: { store }, controllers: services => {
    assert.equal(services.store, store);
    return {};
  } });
  assert.equal((await app.preflight({ definition: transform() })).ok, false);
  const disabled = createApplication({ functions: upper, controllers: () => ({ workflow: { functions: undefined } }) });
  assert.ok((await disabled.preflight({ definition: transform() })).diagnostics.some(d => d.code === "function_missing"));
  const adapted = transform();
  const withAdapter = defineWorkflow({ id: "adapted", spec: { ...adapted.spec, stages: adapted.spec.stages.map(stage => ({
    ...stage, inputAdapters: [{ kind: "function", implementationRef: "trim" }],
  })) } });
  const disabledAdapters = createApplication({ functions: upper, adapters: { trim: ctx => ({ kind: "transform", value: ctx.value }) }, controllers: () => ({ workflow: { adapters: undefined } }) });
  assert.ok((await disabledAdapters.preflight({ definition: withAdapter })).diagnostics.some(d => d.code === "adapter_missing"));
});

function parent(child = "lookup", kind: "agent" | "workflow" = "agent") {
  return defineWorkflow({ id: "parent", spec: { entryStage: "call", stages: [
    { id: "call", kind, child: { definitionId: child, definitionVersion: 1 }, requestedOperations: [operation], transitions: { kind: "always", next: { to: "complete" } } },
  ] } });
}

test("child definitions are preflighted recursively; confirmation in a called child reaches the host", async () => {
  let calls = 0;
  const app = createApplication({ models: models(script()), capabilities: { catalog, executor: { async execute() { calls++; return { status: "success", observation: "docs" }; } } },
    authorizer: createAllowListAuthorizer({ grants: [{ capability: "docs" }], spawn: { definitions: ["lookup"] } }),
    confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: "docs" }] }),
  });
  assert.ok((await app.preflight({ definition: parent() })).diagnostics.some(d => d.code === "child_definition_missing"));
  await app.register(toolAgent());
  const { executionId } = await app.start({ definition: parent(), structuralSpawnBudget: 1, operationAuthority: { operations: [operation] }, input: { label: "user", payload: "read" } });
  const result = await app.runUntilBlocked(executionId);
  assert.equal(result.reason, "confirmation_required");
  assert.notEqual(result.waitingExecutionId, executionId);
  assert.equal(calls, 0);
  const [confirmation] = await app.harness.pendingConfirmations();
  await app.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "decline" });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
  assert.equal(calls, 0);
});

test("preflight checks child kind, absent spawn credits, child input waits, and memory bindings", async () => {
  const child = agent("respond_and_wait");
  const app = createApplication({ models: models(script()) });
  await app.register(child);
  const report = await app.preflight({ definition: parent(child.id), structuralSpawnBudget: 0 });
  assert.equal(report.ok, true);
  assert.ok(report.diagnostics.some(d => d.code === "child_waits_for_input"));
  assert.ok(report.diagnostics.some(d => d.code === "spawn_budget_missing"));
  assert.equal((await app.preflight({ definition: parent(child.id, "workflow") })).ok, false);
});

test("recursive definition graphs remain legal and terminate preflight traversal", async () => {
  const recursive = defineWorkflow({ id: "recursive", spec: { entryStage: "call", stages: [
    { id: "call", kind: "workflow", child: { definitionId: "recursive", definitionVersion: 1 }, transitions: { kind: "always", next: { to: "complete" } } },
  ] } });
  const app = createApplication({ authorizer: createAllowListAuthorizer({ grants: [], spawn: true }) });
  const report = await app.preflight({ definition: recursive, structuralSpawnBudget: 2 });
  assert.equal(report.ok, true);
  assert.ok(report.diagnostics.length < 10);
  const { executionId } = await app.start({ definition: recursive, structuralSpawnBudget: 2 });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "failed");
  assert.equal((await app.harness.lineageSpawnBudgetOf(executionId))?.consumed, 2);
});

test("Function adapters and explicit fork/join execute inside one Workflow", async () => {
  const d = defineWorkflow({ id: "parallel", spec: { entryStage: "seed", stages: [
    { id: "seed", kind: "function", implementationRef: "identity", inputAdapters: [{ kind: "function", implementationRef: "trim" }], transitions: { kind: "always", next: { to: "fork", fork: "lookups" } } },
    { id: "left", kind: "function", implementationRef: "left", transitions: { kind: "always", next: { to: "join", fork: "lookups" } } },
    { id: "right", kind: "function", implementationRef: "right", transitions: { kind: "always", next: { to: "join", fork: "lookups" } } },
    { id: "merge", kind: "function", implementationRef: "merge", transitions: { kind: "always", next: { to: "complete" } } },
  ], forks: [{ id: "lookups", branches: [{ id: "left", stage: "left" }, { id: "right", stage: "right" }], join: { next: "merge" } }] } });
  const app = createApplication({ adapters: { trim: ctx => ({ kind: "transform", value: ctx.value?.trim() ?? null }) }, functions: {
    identity: ctx => ({ status: "completed", result: ctx.input }),
    left: ctx => ({ status: "completed", result: `left:${ctx.input}` }),
    right: ctx => ({ status: "completed", result: `right:${ctx.input}` }),
    merge: ctx => ({ status: "completed", result: null, emissions: [{ body: { kind: "text", text: ctx.join!.branches.map(b => b.result).join(",") } }] }),
  } });
  const { executionId } = await app.start({ definition: d, input: { label: "text", payload: " seed " } });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
  assert.equal((await app.services.store.listExecutions()).length, 1);
  assert.deepEqual((await app.harness.emissionsOf(executionId))[0]?.body, { kind: "text", text: "left:seed,right:seed" });
});
