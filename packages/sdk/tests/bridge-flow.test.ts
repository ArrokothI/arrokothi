/**
 * K1.4 bridge corpus through the public SDK entry (K14-1, K14-2): exchanges, waits, input,
 * confirmations, children, terminal mapping, concurrency and in-flight native work.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { ApplicationInputError, createApplication, definitionRef } from "@arrokothi/sdk";
import type { ExecutionId } from "@arrokothi/sdk";
import { InMemoryRuntimeStore, ScriptedModelProvider, createDeferredModelProvider, createNoInlineWaitBudget } from "@arrokothi/core/reference";
import type { CapabilityExecutor } from "@arrokothi/core/ports";
import {
  allowDocs, answerAgent, callingWorkflow, catalog, chatAgent, confirmDocs, deferred, functionWorkflow, ingressResults, loopWorkflow,
  models, pauseEmissions, readThenAnswer, toolAgent,
} from "./bridge-fixtures.ts";

const counting = () => {
  const counter = { calls: 0 };
  const executor: CapabilityExecutor = { async execute() { counter.calls++; return { status: "success", observation: "docs" }; } };
  return { counter, executor };
};

test("B-DELIVER: each exchange is delivered synchronously; a throwing native step fails E by name and ends its lineage", async () => {
  const app = createApplication({ functions: { up: ctx => ({ status: "completed", result: ctx.input?.toUpperCase() ?? null }) } });
  const { executionId } = await app.start({ definition: functionWorkflow("up", "up"), input: { label: "t", payload: "x" } });
  const run = await app.runUntilBlocked(executionId);
  assert.equal(run.reason, "completed");
  assert.ok(run.kernel.exchanges.length > 0);
  for (const exchange of run.kernel.exchanges) assert.deepEqual(exchange.deliveries.map(delivery => delivery.status), ["delivered"]);

  class OfflineStore extends InMemoryRuntimeStore {
    offline = false;
    override async listEmissions(id: Parameters<InMemoryRuntimeStore["listEmissions"]>[0]) {
      if (this.offline) throw new Error("store offline");
      return super.listEmissions(id);
    }
  }
  const store = new OfflineStore();
  const failing = createApplication({ functions: { up: () => ({ status: "completed", result: null }) }, runtime: { store } });
  const started = await failing.start({ definition: functionWorkflow("up", "up") });
  store.offline = true;
  const failed = await failing.runUntilBlocked(started.executionId);
  assert.equal(failed.reason, "failed");
  assert.equal((failed.kernel.result?.value as { code?: string }).code, "arrokothi.bridge.native_error");
  assert.equal(failed.execution.lifecycle, "CANCELLED", "B-FAIL-CASCADE: a Driver-originated fail ends the native lineage");
});

test("B-CONTINUE: each exchange runs one native step; activation_limit leaves the Kernel READY", async () => {
  const app = createApplication({ functions: { tick: () => ({ status: "completed", result: null }) } });
  const { executionId } = await app.start({ definition: loopWorkflow() });
  const run = await app.runUntilBlocked(executionId, { maxActivations: 2 });
  assert.equal(run.reason, "activation_limit");
  assert.equal(run.activations, 2);
  assert.equal(run.kernel.state, "READY");
  assert.equal(run.kernel.exchanges.length, 2, "both continue Outcomes were accepted before the limit returned");
});

test("B-WAKE and B-INPUT: an input wakes the declared wait once; an exact retry replays and a changed one conflicts", async () => {
  const provider = new ScriptedModelProvider({ id: "chat", steps: [{ output: { text: "One" } }, { output: { text: "Two" } }] });
  const app = createApplication({ models: models(provider) });
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hello" } });
  const first = await app.runUntilBlocked(executionId);
  assert.equal(first.reason, "input_required");
  assert.equal(first.waitingExecutionId, executionId);
  assert.deepEqual(first.kernel.wait?.declaration.subscriptions, [{ subscriptionClass: "arrokothi.legacy.input" }]);
  assert.deepEqual(pauseEmissions(app, executionId).at(-1), [{ kind: "input", executionId }]);

  const accepted = await app.input(executionId, { requestKey: "turn-2", label: "user", payload: "again" });
  const replay = await app.input(executionId, { requestKey: "turn-2", label: "user", payload: "again" });
  assert.equal(accepted.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(replay.eventId, accepted.eventId);
  await assert.rejects(app.input(executionId, { requestKey: "turn-2", label: "user", payload: "changed" }),
    (error: unknown) => error instanceof ApplicationInputError && error.code === "duplicate_conflict");
  assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
  assert.equal(provider.requests.length, 2, "the native Agent received the turn exactly once");
  assert.deepEqual(ingressResults(app, executionId).map(result => result.status), ["delivered", "delivered"]);
});

test("B-QUEUED and B-RES: slow native work keeps E RUNNING with no Kernel wait; input queued meanwhile is forwarded once", async () => {
  const provider = createDeferredModelProvider("slow");
  const app = createApplication({ models: models(provider), runtime: { inlineWait: createNoInlineWaitBudget() } });
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hello" } });
  const pending = await app.runUntilBlocked(executionId, { timeoutMs: 15, pollIntervalMs: 1 });
  assert.equal(pending.reason, "timeout");
  assert.equal(pending.kernel.state, "RUNNING");
  assert.equal(pending.kernel.wait, null, "native in-flight work is not a Kernel wait");
  const queued = await app.input(executionId, { label: "user", payload: "second" });
  assert.equal(queued.disposition.kind, "queued");
  provider.settle({ text: "One" });
  for (let round = 0; round < 200 && provider.invocationCount < 2; round++) {
    assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 10, pollIntervalMs: 1 })).reason, "timeout");
  }
  assert.equal(provider.invocationCount, 2, "the queued input was carried by a later exchange and reached the Agent");
  provider.settle({ text: "Two" });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
  assert.equal(provider.invocationCount, 2, "each model call resumed exactly once");
  assert.deepEqual(ingressResults(app, executionId).map(result => result.status), ["delivered", "delivered"]);
});

test("B-CONFIRM: a decision is Kernel input; one dispatch; a retry replays; a foreign confirmation is reported and changes nothing", async () => {
  const { counter, executor } = counting();
  const options = { models: models(new ScriptedModelProvider({ id: "s", steps: readThenAnswer() })), capabilities: { catalog, executor }, authorizer: allowDocs(), confirmationPolicy: confirmDocs() };
  const app = createApplication(options);
  const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [{ capability: "docs", operation: "read" }] }, input: { label: "user", payload: "read" } });
  const waiting = await app.runUntilBlocked(executionId);
  assert.equal(waiting.reason, "confirmation_required");
  assert.deepEqual(waiting.kernel.wait?.declaration.subscriptions, [{ subscriptionClass: "arrokothi.legacy.confirmation" }]);
  const [confirmation] = await app.harness.pendingConfirmations();
  assert.ok(confirmation);

  await app.resolveConfirmation(executionId, { confirmationId: "cnf_elsewhere", decision: "approve" });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "confirmation_required");
  assert.equal(ingressResults(app, executionId).at(-1)?.reason, "confirmation_outside_lineage");
  assert.equal(counter.calls, 0);

  const approve = await app.resolveConfirmation(executionId, { requestKey: "approve-1", confirmationId: confirmation.confirmationId, decision: "approve" });
  assert.equal((await app.resolveConfirmation(executionId, { requestKey: "approve-1", confirmationId: confirmation.confirmationId, decision: "approve" })).replayed, true);
  assert.equal(approve.replayed, false);
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
  assert.equal(counter.calls, 1);
  assert.equal(ingressResults(app, executionId).at(-1)?.status, "dispatched");

  const declining = createApplication({ ...options, models: models(new ScriptedModelProvider({ id: "s", steps: readThenAnswer() })) });
  const other = await declining.start({ definition: toolAgent(), operationAuthority: { operations: [{ capability: "docs", operation: "read" }] }, input: { label: "user", payload: "read" } });
  await declining.runUntilBlocked(other.executionId);
  const [request] = await declining.harness.pendingConfirmations();
  await declining.resolveConfirmation(other.executionId, { confirmationId: request!.confirmationId, decision: "decline" });
  assert.equal((await declining.runUntilBlocked(other.executionId)).reason, "completed");
  assert.equal(counter.calls, 1, "a decline reaches the native controller and dispatches nothing");
});

test("B-CHILD and B-CHILD-CONFIRM: a confirmation inside a called child surfaces with the child's ID from the pause Emission", async () => {
  const { counter, executor } = counting();
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: readThenAnswer() })), capabilities: { catalog, executor }, authorizer: allowDocs(), confirmationPolicy: confirmDocs() });
  await app.register(toolAgent());
  const { executionId } = await app.start({ definition: callingWorkflow("lookup"), structuralSpawnBudget: 1, operationAuthority: { operations: [{ capability: "docs", operation: "read" }] }, input: { label: "user", payload: "read" } });
  const run = await app.runUntilBlocked(executionId);
  assert.equal(run.reason, "confirmation_required");
  const [pause] = pauseEmissions(app, executionId).at(-1) ?? [];
  assert.ok(pause && pause.executionId !== executionId);
  assert.equal(run.waitingExecutionId, pause.executionId);
  assert.equal((await app.harness.inspect(pause.executionId as ExecutionId))?.rootExecutionId, executionId);
  await app.resolveConfirmation(executionId, { confirmationId: pause.confirmationId!, decision: "approve" });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
  assert.equal(counter.calls, 1);
});

test("B-TERM and B-FAIL: native completion and failure map to complete and fail; a terminal Execution refuses input", async () => {
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "Ready" } }] })) });
  const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
  const done = await app.runUntilBlocked(executionId);
  assert.equal(done.reason, "completed");
  assert.equal(done.kernel.result?.kind, "completed");
  assert.deepEqual(done.kernel.result?.value, done.execution.terminalResult);
  await assert.rejects(app.input(executionId, { label: "user", payload: "late" }),
    (error: unknown) => error instanceof ApplicationInputError && error.code === "terminal_destination");

  const failing = createApplication({ functions: { boom: () => ({ status: "failed", code: "boom", message: "it broke" }) } });
  const started = await failing.start({ definition: functionWorkflow("boom", "boom") });
  const failed = await failing.runUntilBlocked(started.executionId);
  assert.equal(failed.reason, "failed");
  assert.equal(failed.kernel.result?.kind, "failed");
  assert.equal((failed.kernel.result?.value as { code: string }).code, failed.execution.failure?.code);
});

test("B-STALL and B-INTERLEAVE: a parked native step blocks only its own lineage; Activations of different Executions interleave", async () => {
  const barrier = deferred();
  const parked = deferred();
  const log: string[] = [];
  const app = createApplication({ functions: {
    slow: async () => { log.push("1:start"); parked.resolve(); await barrier.promise; log.push("1:end"); return { status: "completed", result: null }; },
    fast: () => { log.push("2:start"); log.push("2:end"); return { status: "completed", result: null }; },
  } });
  const one = await app.start({ definition: functionWorkflow("slow", "slow") });
  const running = app.runUntilBlocked(one.executionId);
  await parked.promise;
  const two = await app.start({ definition: functionWorkflow("fast", "fast") });
  assert.equal((await app.runUntilBlocked(two.executionId)).reason, "completed");
  assert.equal(app.inspect(one.executionId).state, "RUNNING");
  barrier.resolve();
  assert.equal((await running).reason, "completed");
  assert.deepEqual(log, ["1:start", "2:start", "2:end", "1:end"]);
});

test("B-MANY and B-PIN: separate lineages share the native ID of their Kernel Execution and run exactly their pinned definition", async () => {
  const app = createApplication({ functions: { up: ctx => ({ status: "completed", result: ctx.input ?? null }) } });
  const definition = functionWorkflow("pinned", "up");
  const ids: string[] = [];
  for (let index = 0; index < 10; index++) ids.push((await app.start({ definition, input: { label: "n", payload: String(index) } })).executionId);
  await app.register({ ...definition, version: 2 });
  for (const id of ids) assert.equal((await app.runUntilBlocked(id as ExecutionId)).reason, "completed");
  const natives = await app.services.store.listExecutions();
  assert.deepEqual(natives.map(context => context.executionId).sort(), [...ids].sort());
  for (const context of natives) {
    assert.equal(context.rootExecutionId, context.executionId);
    assert.deepEqual(context.definition, definitionRef(definition));
  }
  const ref = definitionRef(definition);
  assert.equal(app.inspect(ids[0]!).definitionRevision, JSON.stringify({ id: ref.id, integrity: ref.integrity, version: ref.version }));
});

test("B-IDLE, B-SLOWCAP-NO-WAIT and B-ENQUEUE-WINDOW: in-flight capability work stays RUNNING with no wait, through a delayed enqueue", async () => {
  const finish = deferred<void>();
  const executor: CapabilityExecutor = { async execute() { await finish.promise; return { status: "success", observation: "docs" }; } };
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: readThenAnswer() })), capabilities: { catalog, executor }, authorizer: allowDocs(), runtime: { inlineWait: createNoInlineWaitBudget() } });
  const enqueue = app.services.scheduler.enqueue.bind(app.services.scheduler);
  app.services.scheduler.enqueue = async id => { await delay(2); return enqueue(id); };
  const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [{ capability: "docs", operation: "read" }] }, input: { label: "user", payload: "read" } });
  await app.runUntilIdle();
  const open = app.inspect(executionId);
  assert.equal(open.state, "RUNNING", "runUntilIdle does not wait for native work in flight");
  assert.equal(open.wait, null);
  finish.resolve();
  const done = await app.runUntilBlocked(executionId);
  assert.equal(done.reason, "completed");
  assert.equal(done.kernel.retiredWaits.length, 0, "no Kernel wait was declared while native work could still run");
});

test("B-APPROVAL-INFLIGHT: an approved tool still dispatching keeps the exchange open", async () => {
  const finish = deferred<void>();
  let calls = 0;
  const executor: CapabilityExecutor = { async execute() { calls++; await finish.promise; return { status: "success", observation: "docs" }; } };
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: readThenAnswer() })), capabilities: { catalog, executor }, authorizer: allowDocs(), confirmationPolicy: confirmDocs(), runtime: { inlineWait: createNoInlineWaitBudget() } });
  const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [{ capability: "docs", operation: "read" }] }, input: { label: "user", payload: "read" } });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "confirmation_required");
  const [confirmation] = await app.harness.pendingConfirmations();
  await app.resolveConfirmation(executionId, { confirmationId: confirmation!.confirmationId, decision: "approve" });
  const inflight = await app.runUntilBlocked(executionId, { timeoutMs: 20, pollIntervalMs: 1 });
  assert.equal(inflight.reason, "timeout");
  assert.equal(inflight.kernel.state, "RUNNING");
  assert.equal(inflight.kernel.wait, null);
  finish.resolve();
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
  assert.equal(calls, 1);
});
