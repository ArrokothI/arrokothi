/**
 * K1.4 bridge corpus: deadlines, cancellation, start's root-less window and the protocol-failure
 * fallback (design 02 D01-CHK-01, -03, -04, -11, -14).
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { ApplicationStartError, createApplication } from "@arrokothi/sdk";
import type { ExecutionId } from "@arrokothi/sdk";
import { ExecutionCoordinator } from "@arrokothi/kernel";
import { InMemoryRuntimeStore, ScriptedModelProvider, createAllowListAuthorizer, createDeferredModelProvider, createNoInlineWaitBudget } from "@arrokothi/core/reference";
import type { CapabilityExecutor, EffectAuthorizer } from "@arrokothi/core/ports";
import {
  allowDocs, answerAgent, callingWorkflow, catalog, chatAgent, confirmDocs, deferred, functionWorkflow, ingressResults, kernelId,
  manualClock, models, readThenAnswer, toolAgent,
} from "./bridge-fixtures.ts";

const chat = (clock: ReturnType<typeof manualClock>, deadlineMs = 100, steps = [{ output: { text: "One" } }, { output: { text: "Two" } }]) => {
  const provider = new ScriptedModelProvider({ id: "chat", steps });
  return { provider, app: createApplication({ models: models(provider), runtime: { clock: clock.clock }, humanWaitDeadlineMs: deadlineMs }) };
};
const failureCode = (value: unknown) => (value as { code?: string } | undefined)?.code;

test("B-DEADLINE-WAIT: an expired human wait fails E by name and cancels the native lineage", async () => {
  const clock = manualClock();
  const { app } = chat(clock);
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
  const waiting = await app.runUntilBlocked(executionId);
  assert.equal(waiting.reason, "input_required");
  assert.equal(waiting.kernel.wait?.deadline, clock.now + 100);
  clock.advance(101);
  const expired = await app.runUntilBlocked(executionId);
  assert.equal(expired.reason, "failed");
  assert.equal(failureCode(expired.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.equal(expired.execution.lifecycle, "CANCELLED");
});

test("B-DEADLINE-STRAY: an input that wakes the Kernel wait but not the native pause keeps the pause's deadline", async () => {
  const clock = manualClock();
  const { app, provider } = chat(clock);
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
  const first = (await app.runUntilBlocked(executionId)).kernel.wait?.deadline;
  for (let stray = 0; stray < 3; stray++) {
    clock.advance(30);
    await app.input(executionId, { label: "user", payload: "elsewhere", destination: "exe_elsewhere" });
    const again = await app.runUntilBlocked(executionId);
    assert.equal(again.reason, "input_required");
    assert.equal(again.kernel.wait?.deadline, first, "the re-declared wait carries the same absolute deadline");
  }
  assert.equal(ingressResults(app, executionId).at(-1)?.reason, "destination_outside_lineage");
  assert.equal(provider.requests.length, 1);
  clock.advance(11);
  assert.equal(failureCode((await app.runUntilBlocked(executionId)).kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
});

test("B-DEADLINE-AT-INGRESS and B-ACK-DISCARD: a host input pumps due timers first; the late reply is reported as discarded", async () => {
  const clock = manualClock();
  const { app, provider } = chat(clock);
  const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hi" } });
  assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
  clock.advance(10_000);
  const late = await app.input(executionId, { label: "user", payload: "too late" });
  assert.equal(late.disposition.kind, "queued");
  const run = await app.runUntilBlocked(executionId);
  assert.equal(failureCode(run.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.deepEqual(ingressResults(app, executionId).at(-1), { eventId: late.eventId, kind: "arrokothi.legacy.input", status: "discarded" });
  assert.equal(provider.requests.length, 1, "the late reply never reached the native Agent");
});

test("B-DEADLINE-EXEC and B-START-RETRY-DEADLINE: an absolute Execution deadline cancels E and its lineage; an exact retry replays", async () => {
  const clock = manualClock();
  const { app } = chat(clock, 10_000);
  const deadline = new Date(clock.now + 500);
  const input = { definition: chatAgent(), creationKey: "deadline-1", executionDeadline: deadline, input: { label: "user", payload: "hi" } };
  const started = await app.start(input);
  const replay = await app.start({ ...input, executionDeadline: new Date(deadline.getTime()) });
  assert.equal(replay.replayed, true);
  assert.equal(replay.executionId, started.executionId);
  await assert.rejects(app.start({ ...input, executionDeadline: new Date(deadline.getTime() + 1) }),
    (error: unknown) => error instanceof ApplicationStartError && error.code === "duplicate_conflict");
  assert.equal((await app.runUntilBlocked(started.executionId)).reason, "input_required");
  clock.advance(501);
  const cancelled = await app.runUntilBlocked(started.executionId);
  assert.equal(cancelled.reason, "cancelled");
  assert.equal(cancelled.kernel.cancellation?.cause, "execution_deadline");
  assert.equal(cancelled.execution.lifecycle, "CANCELLED");
});

test("B-CANCEL: cancelling an open exchange ends E; the Driver submits nothing for the stopped step", async () => {
  const release = deferred();
  const parked = deferred();
  const app = createApplication({ functions: { park: async () => { parked.resolve(); await release.promise; return { status: "completed", result: null }; } } });
  const { executionId } = await app.start({ definition: functionWorkflow("park", "park") });
  void app.runUntilBlocked(executionId, { timeoutMs: 1_000 });
  await parked.promise;
  const before = app.inspect(executionId);
  assert.equal(before.state, "RUNNING");
  const decision = await app.cancel(executionId);
  assert.equal(decision.state, "CANCELLED");
  release.resolve();
  await app.runUntilIdle();
  const after = app.inspect(executionId);
  assert.equal(after.state, "CANCELLED");
  assert.equal(after.exchanges.length, 0, "no Outcome was accepted after the cancellation");
  assert.equal(after.losingOutcomes.length, 0, "the Driver starts no Outcome once E ended");
  assert.equal((await app.harness.inspect(executionId as ExecutionId))?.lifecycle, "CANCELLED");
});

test("B-CANCEL-PREROOT: a cancellation between dispatch and the task, or while start creates the root, runs no native work", async () => {
  let calls = 0;
  const executor: CapabilityExecutor = { async execute() { calls++; return { status: "success", observation: "docs" }; } };
  const provider = new ScriptedModelProvider({ id: "s", steps: readThenAnswer() });
  const app = createApplication({ models: models(provider), capabilities: { catalog, executor }, authorizer: allowDocs() });
  const { executionId } = await app.start({ definition: toolAgent(), operationAuthority: { operations: [{ capability: "docs", operation: "read" }] }, input: { label: "user", payload: "read" } });
  const idle = app.runUntilIdle();
  const cancelled = app.cancel(executionId);
  await cancelled;
  await idle;
  assert.equal(app.inspect(executionId).state, "CANCELLED");
  assert.equal(provider.requests.length, 0);
  assert.equal(calls, 0);
  assert.equal((await app.harness.inspect(executionId as ExecutionId))?.lifecycle, "CANCELLED");

  // B-START-CANCEL-RUN: the cancellation arrives while start is creating the native root.
  const gate = deferred();
  const reached = deferred();
  class GatedStore extends InMemoryRuntimeStore {
    gated = true;
    override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
      if (this.gated && id === kernelId("pre-root")) { this.gated = false; reached.resolve(); await gate.promise; }
      return super.readExecution(id);
    }
  }
  const second = new ScriptedModelProvider({ id: "s", steps: readThenAnswer() });
  const gated = createApplication({ models: models(second), runtime: { store: new GatedStore() } });
  const starting = gated.start({ definition: answerAgent(), creationKey: "pre-root", input: { label: "user", payload: "q" } });
  await reached.promise;
  await gated.cancel(kernelId("pre-root"));
  gate.resolve();
  const started = await starting;
  assert.equal(started.executionId, kernelId("pre-root"));
  assert.equal((await gated.harness.inspect(started.executionId))?.lifecycle, "CANCELLED", "B-START-INSPECT: the root exists when start returns");
  assert.equal((await gated.runUntilBlocked(started.executionId)).reason, "cancelled");
  assert.equal(second.requests.length, 0);
});

test("B-CANCEL-MIDSTEP-CHILD: a child spawned by the step running when the cancellation arrived ends CANCELLED", async () => {
  // The legacy effect processor abandons a spawn once the native cancellation request is recorded
  // (abandonIfCancellationPending). The window this test holds open is the one before that record
  // lands: the request's cascade is gated on its first store read, so the step spawns its child,
  // and only the Driver's second cascade after the step returns can find it.
  const reached = deferred();
  const release = deferred();
  const gate = deferred();
  class GatedStore extends InMemoryRuntimeStore {
    gateLinks = false;
    override async listChildExecutionLinks(id: Parameters<InMemoryRuntimeStore["listChildExecutionLinks"]>[0]) {
      if (this.gateLinks) { this.gateLinks = false; await gate.promise; }
      return super.listChildExecutionLinks(id);
    }
  }
  const store = new GatedStore();
  const base = createAllowListAuthorizer({ grants: [], spawn: { definitions: ["answer"] } });
  const authorizer: EffectAuthorizer = {
    async authorize(request) {
      if (request.proposal.kind === "spawn_execution") { reached.resolve(); await release.promise; }
      return base.authorize(request);
    },
  };
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "A" } }] })), authorizer, runtime: { store } });
  await app.register(answerAgent());
  const { executionId } = await app.start({ definition: callingWorkflow("answer"), structuralSpawnBudget: 1 });
  const running = app.runUntilBlocked(executionId);
  await reached.promise;
  store.gateLinks = true;
  const cancelling = app.cancel(executionId);
  release.resolve();
  await app.runUntilIdle();
  const links = await app.harness.childExecutionLinksOf(executionId);
  assert.equal(links.length, 1, "the step spawned its child before the native cancellation request was recorded");
  assert.equal((await app.harness.inspect(links[0]!.childExecutionId))?.lifecycle, "CANCELLED");
  gate.resolve();
  await cancelling;
  assert.equal((await running).reason, "cancelled");
  assert.equal((await app.harness.inspect(executionId))?.lifecycle, "CANCELLED");
});

test("B-FAIL-CASCADE: an expired wait held by a called child cancels the child with the root", async () => {
  const clock = manualClock();
  const executor: CapabilityExecutor = { async execute() { return { status: "success", observation: "docs" }; } };
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: readThenAnswer() })), capabilities: { catalog, executor }, authorizer: allowDocs(), confirmationPolicy: confirmDocs(), runtime: { clock: clock.clock }, humanWaitDeadlineMs: 50 });
  await app.register(toolAgent());
  const { executionId } = await app.start({ definition: callingWorkflow("lookup"), structuralSpawnBudget: 1, operationAuthority: { operations: [{ capability: "docs", operation: "read" }] }, input: { label: "user", payload: "read" } });
  const waiting = await app.runUntilBlocked(executionId);
  assert.equal(waiting.reason, "confirmation_required");
  clock.advance(51);
  assert.equal(failureCode((await app.runUntilBlocked(executionId)).kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
  assert.equal((await app.harness.inspect(waiting.waitingExecutionId!))?.lifecycle, "CANCELLED");
  assert.equal((await app.harness.inspect(executionId))?.lifecycle, "CANCELLED");
});

test("B-ROOT-EXISTS and B-START-REPLAY: a replay does no native work; a key whose native root exists is cancelled by name", async () => {
  const provider = new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "A" } }] });
  const store = new InMemoryRuntimeStore();
  const app = createApplication({ models: models(provider), runtime: { store } });
  const first = await app.start({ definition: answerAgent(), creationKey: "shared-key", input: { label: "user", payload: "q" } });
  const replay = await app.start({ definition: answerAgent(), creationKey: "shared-key", input: { label: "user", payload: "q" } });
  assert.equal(replay.replayed, true);
  assert.equal(replay.executionId, first.executionId);
  assert.equal((await store.listExecutions()).length, 1);

  const other = createApplication({ models: models(provider), runtime: { store } });
  await assert.rejects(other.start({ definition: answerAgent(), creationKey: "shared-key", input: { label: "user", payload: "q" } }),
    (error: unknown) => error instanceof ApplicationStartError && error.code === "arrokothi.bridge.native_root_exists" && error.executionId === first.executionId);
  assert.equal(other.inspect(first.executionId).state, "CANCELLED");
  assert.equal((await store.readExecution(first.executionId))?.lifecycle, "READY", "the other application's native root is untouched");
});

test("B-START-INSPECT: the native root is readable as soon as start returns", async () => {
  const app = createApplication({ functions: { up: () => ({ status: "completed", result: null }) } });
  const { executionId } = await app.start({ definition: functionWorkflow("up", "up") });
  assert.equal((await app.harness.inspect(executionId))?.lifecycle, "READY");
  assert.equal(app.inspect(executionId).state, "READY");
});

test("B-PROTOCOL-HOLD: a refused Driver fail becomes a protocol-failure hold, not a silent open exchange", async () => {
  const original = ExecutionCoordinator.prototype.submitOutcome;
  ExecutionCoordinator.prototype.submitOutcome = function (this: ExecutionCoordinator, ...args: Parameters<ExecutionCoordinator["submitOutcome"]>) {
    if (args[1].next.step === "fail") return { ok: false, error: { classification: "malformed_envelope", reason: "forced refusal" } } as unknown as ReturnType<ExecutionCoordinator["submitOutcome"]>;
    return original.apply(this, args);
  };
  try {
    const app = createApplication({ functions: { boom: () => ({ status: "failed", code: "boom", message: "x" }) } });
    const { executionId } = await app.start({ definition: functionWorkflow("boom", "boom") });
    let run = await app.runUntilBlocked(executionId, { timeoutMs: 10, pollIntervalMs: 1 });
    for (let round = 0; round < 200 && run.kernel.recoveryHolds.length === 0; round++) {
      run = await app.runUntilBlocked(executionId, { timeoutMs: 10, pollIntervalMs: 1 });
    }
    assert.equal(run.reason, "timeout", "the held exchange stays open; nothing is silently completed");
    assert.equal(run.kernel.recoveryHolds[0]?.cause, "protocol_failure");
    assert.match(run.kernel.recoveryHolds[0]?.reason ?? "", /forced refusal/);
  } finally {
    ExecutionCoordinator.prototype.submitOutcome = original;
  }
});

test("B-RES: a slow model call resumes exactly once inside one open exchange", async () => {
  const provider = createDeferredModelProvider("slow");
  const app = createApplication({ models: models(provider), runtime: { inlineWait: createNoInlineWaitBudget() } });
  const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
  assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 15, pollIntervalMs: 1 })).reason, "timeout");
  provider.settle({ text: "Ready" });
  const done = await app.runUntilBlocked(executionId);
  assert.equal(done.reason, "completed");
  assert.equal(provider.invocationCount, 1);
  assert.equal(done.kernel.exchanges.length, 1, "the resumption stayed inside the exchange that started it");
});
