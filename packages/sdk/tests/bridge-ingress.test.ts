/**
 * K1.4 design 03 R1-02 and R1-03 (review 01 K14-R1-02, K14-R1-03; design check 03 D03-CHK-02; owner
 * choice 04): a keyed input retry keeps the destination the Kernel recorded, and every acknowledged
 * Event that carries input has exactly one `ingress_result` entry on every exit.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ApplicationInputError, createApplication, defineAgent, defineWorkflow } from "@arrokothi/sdk";
import type { Application, ExecutionId } from "@arrokothi/sdk";
import type { CapabilityExecutor } from "@arrokothi/core/ports";
import { InMemoryRuntimeStore, ScriptedModelProvider } from "@arrokothi/core/reference";
import { BatchLedger, INGRESS_REASONS, INGRESS_STATUS } from "../src/legacy-bridge/ledger.ts";
import { INPUT_KINDS } from "../src/legacy-bridge/codec.ts";
import { LegacyDriver } from "../src/legacy-bridge/driver.ts";
import { LineageScheduler } from "../src/legacy-bridge/lineage-scheduler.ts";
import {
  allowDocs, answerAgent, callingWorkflow, chatAgent, functionWorkflow, ingressResults, loopWorkflow, models,
} from "./bridge-fixtures.ts";
import { ControllerRegistry, createAgentController, createWorkflowController } from "@arrokothi/core";
import { InMemoryDefinitionStore, createAdapterRegistry, createFunctionStageRegistry, createSystemClock } from "@arrokothi/core/reference";

const conflict = (error: unknown) => error instanceof ApplicationInputError && error.code === "duplicate_conflict";

/** The native `external.input` bodies still in a member's native mailbox (unconsumed). */
async function nativeInputs(store: InMemoryRuntimeStore, app: Application, executionId: string): Promise<unknown[]> {
  const context = await app.harness.inspect(executionId as ExecutionId);
  if (!context) return [];
  return (await store.peekMailbox(context.mailbox.mailboxId))
    .filter(event => event.kind === "external.input").map(event => (event.body as { payload?: unknown }).payload);
}

// -- R1-02: retry identity ----------------------------------------------------

describe("B-INPUT-RETRY: an exact keyed retry keeps the destination the Kernel recorded", () => {
  test("review 01 K14-R1-02: the child's pause disappears and E ends; the omitted-destination retry replays", async () => {
    const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "One" } }] })), authorizer: allowDocs() });
    await app.register(chatAgent(1));
    const { executionId } = await app.start({ definition: callingWorkflow("chat"), structuralSpawnBudget: 1, input: { label: "user", payload: "hello" } });
    const first = await app.runUntilBlocked(executionId);
    assert.equal(first.reason, "input_required");
    const child = first.waitingExecutionId!;
    assert.notEqual(child, executionId);
    const request = { requestKey: "reply", label: "user", payload: "again" };
    const accepted = await app.input(executionId, request);
    // Before any exchange forwarded it: the same retry replays.
    assert.equal((await app.input(executionId, request)).eventId, accepted.eventId);
    const end = await app.runUntilBlocked(executionId);
    assert.equal(end.reason, "failed", "the child's model budget ends the lineage");
    // The review's control: naming the original child replays.
    const explicit = await app.input(executionId, { ...request, destination: child });
    assert.equal(explicit.eventId, accepted.eventId);
    const replay = await app.input(executionId, request);
    assert.deepEqual([replay.eventId, replay.receipt, replay.acceptancePosition, replay.replayed], [accepted.eventId, accepted.receipt, accepted.acceptancePosition, true]);
    // Changed content still conflicts: destination, label, payload, correlation, causation.
    await assert.rejects(app.input(executionId, { ...request, destination: executionId }), conflict);
    await assert.rejects(app.input(executionId, { ...request, label: "other" }), conflict);
    await assert.rejects(app.input(executionId, { ...request, payload: "changed" }), conflict);
    await assert.rejects(app.input(executionId, { ...request, correlationId: "c" }), conflict);
    await assert.rejects(app.input(executionId, { ...request, causationId: "c" }), conflict);
    // A fresh key on the terminal Execution is refused as before.
    await assert.rejects(app.input(executionId, { requestKey: "fresh", label: "user", payload: "x" }), (error: unknown) => error instanceof ApplicationInputError && !conflict(error));
    // One native delivery: the replays created no Kernel Event, so nothing was forwarded twice.
    assert.equal(ingressResults(app, executionId).filter(result => result.eventId === accepted.eventId).length, 1);
  });

  test("a later fork leaves several input pauses: the earlier keyed retry still replays; a new key needs a destination", async () => {
    const provider = new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "A" } }, { output: { text: "B" } }, { output: { text: "C" } }] });
    const app = createApplication({ models: models(provider), authorizer: allowDocs(), functions: { d: () => ({ status: "completed", result: null }) } });
    await app.register(defineAgent({ id: "lookup", terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } }, spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Answer", completion: "complete_on_response" } }));
    await app.register(chatAgent());
    const toJoin = { kind: "always", next: { to: "join", fork: "p" } } as const;
    const workflow = defineWorkflow({ id: "ask-then-fork", spec: { entryStage: "ask",
      forks: [{ id: "p", branches: [{ id: "x", stage: "x" }, { id: "y", stage: "y" }], join: { next: "d" } }],
      stages: [
        { id: "ask", kind: "agent", child: { definitionId: "lookup", definitionVersion: 1 }, transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "x", kind: "agent", child: { definitionId: "chat", definitionVersion: 1 }, transitions: toJoin },
        { id: "y", kind: "agent", child: { definitionId: "chat", definitionVersion: 1 }, transitions: toJoin },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ] } });
    const { executionId } = await app.start({ definition: workflow, structuralSpawnBudget: 3 });
    const first = await app.runUntilBlocked(executionId);
    assert.equal(first.reason, "input_required");
    const asker = first.waitingExecutionId!;
    const request = { requestKey: "k", label: "user", payload: "question" };
    const accepted = await app.input(executionId, request);
    const forked = await app.runUntilBlocked(executionId);
    assert.equal(forked.reason, "input_required");
    assert.notEqual(forked.waitingExecutionId, asker, "the original pause disappeared");
    // Several members now wait for input.
    await assert.rejects(app.input(executionId, { requestKey: "new", label: "user", payload: "x" }), (error: unknown) => error instanceof ApplicationInputError && error.code === "destination_required");
    const replay = await app.input(executionId, request);
    assert.deepEqual([replay.eventId, replay.receipt, replay.replayed], [accepted.eventId, accepted.receipt, true]);
    // Explicit first, omitted retry: explicitness is not content, so it replays too.
    const explicit = await app.input(executionId, { requestKey: "k2", label: "user", payload: "to x", destination: forked.waitingExecutionId! });
    assert.equal((await app.input(executionId, { requestKey: "k2", label: "user", payload: "to x" })).eventId, explicit.eventId);
    await assert.rejects(app.input(executionId, { ...request, payload: "changed" }), conflict);
    await app.cancel(executionId);
    assert.equal((await app.input(executionId, request)).eventId, accepted.eventId, "after E is terminal, the accepted identity replays");
    assert.equal(ingressResults(app, executionId).filter(result => result.eventId === accepted.eventId).length, 1);
  });
});

// -- R1-03: per-batch accounting -----------------------------------------------

/** Per-Event oracle (D03-CHK-02): each entry's allowed native deliveries. */
const ALLOWED = { delivered: [1], unknown: [0, 1], discarded: [0], rejected: [0], ignored: [0] } as Record<string, number[]>;

/** Each acknowledged input Event has exactly one entry, with its original ID, and the Kernel receipt is unchanged. */
function assertOneEntryEach(app: Application, executionId: string): Map<string, string> {
  const view = app.inspect(executionId);
  const results = ingressResults(app, executionId);
  const statuses = new Map<string, string>();
  for (const entry of view.mailbox) {
    if (entry.sourceCategory !== "application_input" || entry.disposition.kind !== "acknowledged") continue;
    const payload = entry.payload as { input?: unknown } | null;
    if (entry.kind === INPUT_KINDS.start && payload && payload.input === null) continue;
    const mine = results.filter(result => result.eventId === entry.eventId);
    assert.equal(mine.length, 1, `acknowledged Event ${entry.eventId} has exactly one entry`);
    statuses.set(entry.eventId, mine[0]!.status);
  }
  return statuses;
}

describe("B-ACK-EXITS: every exit accounts for each acknowledged Event once (review 01 K14-R1-03)", () => {
  test("review 01 K14-R1-03: a store read fails before the first forward; both inputs are discarded, none delivered", async () => {
    class FaultStore extends InMemoryRuntimeStore {
      armed = false;
      override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
        if (this.armed) { this.armed = false; throw new Error("one read failed before forwarding"); }
        return super.readExecution(id);
      }
    }
    const store = new FaultStore();
    let calls = 0;
    const app = createApplication({ runtime: { store }, functions: { work: () => { calls++; return { status: "completed", result: null }; } } });
    const { executionId } = await app.start({ definition: functionWorkflow("discard", "work"), input: { label: "user", payload: "initial" } });
    await app.input(executionId, { requestKey: "later", label: "user", payload: "next" });
    store.armed = true;
    const run = await app.runUntilBlocked(executionId);
    assert.equal(run.reason, "failed");
    assert.equal(calls, 0);
    const statuses = assertOneEntryEach(app, executionId);
    assert.deepEqual([...statuses.values()], ["discarded", "discarded"]);
    assert.deepEqual(await nativeInputs(store, app, executionId), [], "nothing reached the native mailbox");
  });

  test("the second of three forwards fails before its commit: delivered, unknown, discarded; one native delivery", async () => {
    class FaultStore extends InMemoryRuntimeStore {
      deliveries = 0;
      override transact<T>(...args: Parameters<InMemoryRuntimeStore["transact"]>): Promise<T> {
        if (new Error().stack!.includes("deliverEnvelope") && ++this.deliveries === 2) throw new Error("the delivery transaction failed");
        return super.transact(...args) as Promise<T>;
      }
    }
    const store = new FaultStore();
    const app = createApplication({ runtime: { store }, functions: { work: () => ({ status: "completed", result: null }) } });
    const { executionId } = await app.start({ definition: functionWorkflow("partial", "work"), input: { label: "user", payload: "one" } });
    await app.input(executionId, { requestKey: "two", label: "user", payload: "two" });
    await app.input(executionId, { requestKey: "three", label: "user", payload: "three" });
    const run = await app.runUntilBlocked(executionId);
    assert.equal(run.reason, "failed");
    assert.equal((run.kernel.result?.value as { code?: string }).code, "arrokothi.bridge.native_error");
    const statuses = [...assertOneEntryEach(app, executionId).values()];
    assert.deepEqual(statuses, ["delivered", "unknown", "discarded"]);
    const results = ingressResults(app, executionId);
    assert.equal(results[1]!.reason, INGRESS_REASONS.forwardFailed);
    // Per Event: delivered once, the unknown one not (it failed before commit), the discarded one never.
    const native = await nativeInputs(store, app, executionId);
    assert.deepEqual(native, ["one"]);
    for (const [index, payload] of ["one", "two", "three"].entries()) {
      assert.ok(ALLOWED[statuses[index]!]!.includes(native.filter(value => value === payload).length), `${payload}: ${statuses[index]}`);
    }
  });

  test("design check 03: a delivery commits, then the scheduler's read fails; unknown then discarded, one native delivery, never a second", async () => {
    class Store extends InMemoryRuntimeStore {
      armed = false;
      override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
        if (this.armed && new Error().stack!.includes("LineageScheduler.enqueue")) {
          this.armed = false;
          throw new Error("post-commit scheduler read failed");
        }
        return super.readExecution(id);
      }
    }
    const store = new Store();
    const app = createApplication({ runtime: { store }, models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "One" } }, { output: { text: "Two" } }] })) });
    await app.register(chatAgent());
    const { executionId } = await app.start({ definition: chatAgent(), input: { label: "user", payload: "hello" } });
    assert.equal((await app.runUntilBlocked(executionId)).reason, "input_required");
    await app.input(executionId, { requestKey: "r1", label: "user", payload: "first reply" });
    await app.input(executionId, { requestKey: "r2", label: "user", payload: "second reply" });
    store.armed = true;
    const run = await app.runUntilBlocked(executionId);
    assert.equal(run.reason, "failed");
    const entries = ingressResults(app, executionId).slice(-2);
    assert.deepEqual(entries.map(entry => [entry.status, entry.reason]), [[INGRESS_STATUS.unknown, INGRESS_REASONS.forwardFailed], [INGRESS_STATUS.discarded, undefined]]);
    const native = await nativeInputs(store, app, executionId);
    assert.deepEqual(native.filter(value => value === "first reply"), ["first reply"], "the unknown Event was delivered exactly once");
    assert.deepEqual(native.filter(value => value === "second reply"), [], "the discarded Event never was");
    assertOneEntryEach(app, executionId);
  });

  test("the initial input is rejected natively with later inputs queued: rejected, then discarded", async () => {
    const app = createApplication({ functions: { up: () => ({ status: "completed", result: null }) } });
    const { executionId } = await app.start({ definition: functionWorkflow("reject", "up"), input: { label: "first", payload: "x" } });
    await app.input(executionId, { requestKey: "a", label: "user", payload: "a" });
    await app.input(executionId, { requestKey: "b", label: "user", payload: "b" });
    // The unsupported services.store side door (L-34) ends the native root before the first exchange.
    await app.services.store.transact(executionId as ExecutionId, async tx => {
      const context = (await tx.executions.get(executionId as ExecutionId))!;
      await tx.executions.update({ ...context, lifecycle: "CANCELLED", revision: context.revision + 1 }, context.revision);
    });
    const run = await app.runUntilBlocked(executionId);
    assert.equal((run.kernel.result?.value as { code?: string }).code, "arrokothi.bridge.initial_input_rejected");
    assert.deepEqual([...assertOneEntryEach(app, executionId).values()], ["rejected", "discarded", "discarded"]);
  });

  test("an over-limit terminal result after two forwards: both delivered entries are kept", async () => {
    const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "x".repeat(70_000) } }] })) });
    const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "one" } });
    await app.input(executionId, { requestKey: "two", label: "user", payload: "two" });
    const run = await app.runUntilBlocked(executionId);
    assert.equal((run.kernel.result?.value as { code?: string }).code, "arrokothi.bridge.value_unrepresentable");
    assert.deepEqual([...assertOneEntryEach(app, executionId).values()], ["delivered", "delivered"]);
  });

  test("design check 03: the accounting itself cannot be encoded; nothing is acknowledged, the exchange is held and the lineage ended", async () => {
    const original = BatchLedger.prototype.encode;
    BatchLedger.prototype.encode = () => { throw new Error("forced accounting encoding failure"); };
    try {
      const app = createApplication({ functions: { work: () => ({ status: "completed", result: null }) } });
      const { executionId } = await app.start({ definition: functionWorkflow("hold", "work"), input: { label: "user", payload: "one" } });
      await app.input(executionId, { requestKey: "two", label: "user", payload: "two" });
      let run = await app.runUntilBlocked(executionId, { timeoutMs: 20, pollIntervalMs: 1 });
      for (let round = 0; round < 100 && run.kernel.recoveryHolds.length === 0; round++) run = await app.runUntilBlocked(executionId, { timeoutMs: 10, pollIntervalMs: 1 });
      assert.equal(run.kernel.recoveryHolds[0]?.cause, "protocol_failure");
      assert.match(run.kernel.recoveryHolds[0]?.reason ?? "", /cannot be encoded/);
      assert.notEqual(run.kernel.state, "COMPLETED");
      assert.deepEqual(run.kernel.acknowledged, [], "no Event of the batch was acknowledged");
      assert.ok(run.kernel.mailbox.every(entry => entry.disposition.kind !== "acknowledged"));
      assert.deepEqual(ingressResults(app, executionId), []);
      assert.ok(["COMPLETED", "CANCELLED"].includes(run.execution.lifecycle), `the native lineage was ended (${run.execution.lifecycle})`);
    } finally {
      BatchLedger.prototype.encode = original;
    }
  });

  test("B-ACK-ABLATION: a ledger that drops unattempted Events fails the before-first-forward case", async () => {
    const original = BatchLedger.prototype.close;
    BatchLedger.prototype.close = function (this: BatchLedger, terminal: boolean) {
      return original.call(this, terminal).filter(result => result.status !== INGRESS_STATUS.discarded);
    };
    try {
      class FaultStore extends InMemoryRuntimeStore {
        armed = false;
        override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
          if (this.armed) { this.armed = false; throw new Error("one read failed before forwarding"); }
          return super.readExecution(id);
        }
      }
      const store = new FaultStore();
      const app = createApplication({ runtime: { store }, functions: { work: () => ({ status: "completed", result: null }) } });
      const { executionId } = await app.start({ definition: functionWorkflow("ablate", "work"), input: { label: "user", payload: "initial" } });
      store.armed = true;
      await app.runUntilBlocked(executionId);
      assert.throws(() => assertOneEntryEach(app, executionId), /exactly one entry/);
    } finally {
      BatchLedger.prototype.close = original;
    }
  });
});

describe("B-ACK-BOUND: the accounting encodes within the core limits by construction", () => {
  test("64 Events with the longest fields encode; over-cap reasons and details are omitted and marked", () => {
    const id = (index: number) => `event-13:arrokothi.sdk79:execution-13:arrokothi.sdk11:application64:${"k".repeat(64)}${String(index).padStart(3, "0")}:${"r".repeat(64)}`;
    const ledger = new BatchLedger(Array.from({ length: 64 }, (_, index) => ({ eventId: id(index), kind: INPUT_KINDS.input })));
    for (let index = 0; index < 64; index++) ledger.record(index, { status: "delivered", reason: "\u{1F600}".repeat(32), detail: "\u{1F600}".repeat(512) });
    const bytes = ledger.encode(ledger.close(false));
    assert.ok(bytes.length < 1_048_576, `${bytes.length} bytes`);
    const capped = new BatchLedger([{ eventId: id(0), kind: INPUT_KINDS.input }]);
    capped.record(0, { status: "delivered", reason: "r".repeat(65), detail: "d".repeat(1_025) });
    assert.deepEqual(capped.close(false), [{ eventId: id(0), kind: INPUT_KINDS.input, status: "delivered", detailsOmitted: true }]);
  });

  test("a non-terminal Outcome cannot leave an Event unaccounted", () => {
    const ledger = new BatchLedger([{ eventId: "e1", kind: INPUT_KINDS.input }]);
    assert.throws(() => ledger.close(false), /no disposition/);
    assert.deepEqual(ledger.close(true), [{ eventId: "e1", kind: INPUT_KINDS.input, status: "discarded" }]);
  });
});

test("B-ACK-ONCE (Driver level): an Event left attempted by a refused Outcome is never forwarded a second time", async () => {
  class Counting extends InMemoryRuntimeStore {
    deliveries = 0;
    override transact<T>(...args: Parameters<InMemoryRuntimeStore["transact"]>): Promise<T> {
      if (new Error().stack!.includes("deliverEnvelope")) this.deliveries += 1;
      return super.transact(...args) as Promise<T>;
    }
  }
  const store = new Counting();
  const definitions = new InMemoryDefinitionStore();
  const driver = new LegacyDriver({
    native: {
      store, definitions, clock: createSystemClock(),
      controllers: new ControllerRegistry([createAgentController({}), createWorkflowController({ functions: createFunctionStageRegistry({ tick: () => ({ status: "completed", result: null }) }), adapters: createAdapterRegistry({}) })]),
    },
    scheduler: new LineageScheduler(store), ids: { next: prefix => `${prefix}_${Math.random().toString(36).slice(2)}` },
    now: () => Date.now(), onChange: () => undefined,
  });
  const refusals: string[] = [];
  const offered: { emissions?: { value: Uint8Array }[] }[] = [];
  const fakeCoordinator = {
    submitOutcome: (_caller: unknown, envelope: { emissions?: { value: Uint8Array }[] }) => {
      offered.push(envelope);
      return { ok: false, error: { classification: "stale_activation", reason: "forced refusal" } };
    },
    inspect: () => ({ ok: true, value: { state: "RUNNING" } }),
    reportProtocolFailure: (_caller: unknown, _id: string, report: { diagnostic: string }) => { refusals.push(report.diagnostic); return { ok: true }; },
  };
  driver.attach(fakeCoordinator as never, {} as never, {} as never);
  // A looping Workflow: each exchange submits a `continue` Outcome, so a refusal never ends E.
  const ref = await definitions.save(loopWorkflow());
  const executionId = "execution-once";
  await driver.createRoot(executionId, { definition: ref });
  const activation = {
    executionId, activationId: `${executionId}/activation-1`, writerEpoch: 1, baseProgressRevision: 0, acceptedProgress: null,
    events: [{ eventId: "event-1", kind: INPUT_KINDS.input, sourceCategory: "application_input", payload: { label: "user", payload: "only once" } }],
  };
  const settlement = { delivered: () => undefined };
  const settle = async () => { for (let n = 0; n < 50 && driver.busy > 0; n++) await new Promise(resolve => setTimeout(resolve, 1)); };
  driver.deliver(activation as never, settlement as never, {} as never);
  await settle();
  assert.equal(refusals.length, 1, "the first Outcome was refused and held");
  driver.deliver({ ...activation, activationId: `${executionId}/activation-2` } as never, settlement as never, {} as never);
  await settle();
  assert.equal(store.deliveries, 1, "one native delivery for the Event, across both exchanges");
  const second = offered.at(-1)!.emissions!.map(emission => JSON.parse(new TextDecoder().decode(emission.value)) as { kind: string; results?: unknown[] })
    .find(value => value.kind === "arrokothi.bridge.ingress_result");
  assert.deepEqual(second?.results, [{ eventId: "event-1", kind: INPUT_KINDS.input, status: "unknown", reason: "already_attempted" }]);
});
