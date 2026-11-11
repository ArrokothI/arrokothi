/**
 * K1.4 design 03 R1-05 and design 04 R2-02 (review 01 K14-R1-05; review 02 K14-R2-02; design check 03 T12
 * clarification; design check 04 D04-CHK-03; review 03 K14-R3-02, owner choice 06): in each row below, the
 * terminal trigger ends every native member, and no later host run starts native work.
 *
 * That is a fact about these rows, not about every cleanup. The cascade treats a fulfilled native
 * `cancelExecution` as the end, but a RUNNING member answers `cancellation_pending`. After a native exception
 * past READY→RUNNING, no step is left to apply it: the member stays RUNNING with no hold (017 L-36).
 * B-TERM-LIMIT keeps review 03's two counterexamples and asserts the recorded behaviour.
 *
 * The cleanup sites come from the code, not from the rows. B-TERM-CENSUS resolves every `endLineage`
 * call in `packages/sdk/src` to its literal label and requires the labels to equal `TERMINATE_SITES`. It
 * is a bounded syntactic guard (017 L-37). It checks:
 * - dot-property calls of `endLineage`, `terminate`, `cascade` and `cancelExecution`, with a literal label
 *   or a conditional of literals;
 * - an identifier with one of those names anywhere outside such a call, which covers aliases and
 *   `.call`/`.apply`/`.bind` on the dot name;
 * - element access by a string literal of one of those names.
 * It does not see static template element access (this[`endLineage`](…)), quoted destructuring aliases
 * (`const { "endLineage": end } = this`), or names computed at run time. B-TERM-CENSUS keeps
 * review 03's three escaping forms as recorded exclusions.
 *
 * B-TERM-ORACLE runs every row once, logging the labels it reaches, and the table gives each (row, label)
 * pair one disposition. B-TERM-ABLATION removes one label's cascade at a time and runs each pair's check:
 * - **kill:** the row's behavioural assertions fail;
 * - **empty obligation:** at the label's entry the root is terminal and E has no descendant, and the row
 *   passes (T6);
 * - **redundant:** another label's cascade ended every member, every member that exists at the end
 *   existed at that cascade's exit, and the row passes.
 *
 * T12, the refused terminal Outcome's hold, is B-PROTOCOL-HOLD in `bridge-deadline-cancel.test.ts`: its
 * cascade runs at the terminal label, and the hold that follows has no cascade of its own. T13 here is the
 * nonterminal accounting hold with a live lineage. F1–F3 are review 03's one-fault witnesses: the request's
 * cascade fails once, and only the row's own `cancel.*` cascade ends the lineage. Rows run through the SDK
 * where the stock controllers reach the trigger; T4 is a Driver-level injection, and the rig rows use
 * scripted native controllers.
 */
import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { describe, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { setImmediate as turn } from "node:timers/promises";
import ts from "typescript";
import { createApplication } from "@arrokothi/sdk";
import type { Application, ExecutionId } from "@arrokothi/sdk";
import { InMemoryDefinitionStore, InMemoryRuntimeStore, ScriptedModelProvider } from "@arrokothi/core/reference";
import { ProtocolShapeError } from "../src/legacy-bridge/codec.ts";
import { LegacyDriver, TERMINATE_SITES } from "../src/legacy-bridge/driver.ts";
import type { TerminateSite } from "../src/legacy-bridge/driver.ts";
import { BatchLedger } from "../src/legacy-bridge/ledger.ts";
import { allowDocs, callingWorkflow, chatAgent, deferred, functionWorkflow, ingressResults, manualClock, models } from "./bridge-fixtures.ts";
import type { Deferred } from "./bridge-fixtures.ts";
import { scriptedRig } from "./bridge-rig.ts";

const REPO = resolve(import.meta.dirname, "../../..");
const code = (value: unknown): string | undefined => (value as { code?: string } | null)?.code;
const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

type Member = { readonly id: string; readonly lifecycle: string };

/** Every native member of E's lineage, through the deprecated read view. */
async function members(app: Application, executionId: string): Promise<Member[]> {
  const ids = [executionId];
  for (let index = 0; index < ids.length; index++) {
    for (const link of await app.harness.childExecutionLinksOf(ids[index]! as ExecutionId)) ids.push(link.childExecutionId);
  }
  return Promise.all(ids.map(async id => ({ id, lifecycle: (await app.harness.inspect(id as ExecutionId))?.lifecycle ?? "missing" })));
}

/** The row assertions: a live descendant existed (when `descendant`), every member ended, and later host runs start nothing. */
async function assertEnded(list: readonly Member[], laterSteps: () => Promise<readonly unknown[]>, row: string, descendant = true) {
  if (descendant) assert.ok(list.length >= 2, `${row}: the lineage had a descendant`);
  for (const member of list) assert.ok(TERMINAL.has(member.lifecycle), `${row}: ${member.id} is ${member.lifecycle}`);
  assert.deepEqual(await laterSteps(), [], `${row}: no later host run starts native work`);
}

/** A Workflow calling a `chat` child that waits for input: the live descendant of the SDK rows. */
async function chatLineage(options: Parameters<typeof createApplication>[0] = {}, start: Record<string, unknown> = {}) {
  const app = createApplication({ models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "One" } }, { output: { text: "Two" } }] })), authorizer: allowDocs(), ...options });
  await app.register(chatAgent());
  const { executionId } = await app.start({ definition: callingWorkflow("chat"), structuralSpawnBudget: 1, input: { label: "user", payload: "hello" }, ...start });
  const first = await app.runUntilBlocked(executionId);
  assert.equal(first.reason, "input_required");
  return { app, executionId, child: first.waitingExecutionId! };
}

const later = (app: Application, executionId: string) => async () => {
  await app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 20, pollIntervalMs: 1 });
  return app.runUntilIdle();
};

const within = <T>(promise: Promise<T>, ms: number) => Promise.race([promise, new Promise<void>(resolve => setTimeout(resolve, ms))]);

/** A store that holds, once each, the first transaction or read whose stack names a frame, until released. */
class HoldStore extends InMemoryRuntimeStore {
  private readonly holds: { readonly frame: string; readonly reached: Deferred<void>; readonly gate: Deferred<void>; used: boolean }[] = [];
  hold(frame: string) {
    const entry = { frame, reached: deferred<void>(), gate: deferred<void>(), used: false };
    this.holds.push(entry);
    return { reached: entry.reached.promise, release: () => entry.gate.resolve() };
  }
  private take(): Promise<void> | null {
    const stack = new Error().stack!;
    const entry = this.holds.find(candidate => !candidate.used && stack.includes(candidate.frame));
    if (!entry) return null;
    entry.used = true;
    entry.reached.resolve();
    return entry.gate.promise;
  }
  override transact<T>(...args: Parameters<InMemoryRuntimeStore["transact"]>): Promise<T> {
    const held = this.take();
    if (held) return held.then(() => super.transact(...args) as Promise<T>);
    return super.transact(...args) as Promise<T>;
  }
  override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
    const held = this.take();
    if (held) await held;
    return super.readExecution(id);
  }
}

/** Marks the work a Kernel cancellation request starts in the Driver (`requestCancellation`). */
const REQUEST = new AsyncLocalStorage<true>();

/**
 * Runs `body` with each `requestCancellation` call inside REQUEST, so the cascade that call starts carries
 * the mark through its awaits. A cascade started at any other label never does.
 */
async function inRequestScope<T>(body: () => Promise<T>): Promise<T> {
  const original = LegacyDriver.prototype.requestCancellation;
  LegacyDriver.prototype.requestCancellation = function (this: LegacyDriver, request: Parameters<LegacyDriver["requestCancellation"]>[0]) {
    return REQUEST.run(true, () => original.call(this, request));
  };
  try {
    return await body();
  } finally {
    LegacyDriver.prototype.requestCancellation = original;
  }
}

/**
 * Review 03 K14-R3-02's fault: the first native read of the request's own cascade fails, once. With the
 * `cancel.request` cascade removed, nothing reads in that scope, so nothing fails.
 */
class RequestFaultStore extends HoldStore {
  faults = 0;
  override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
    if (this.faults === 0 && REQUEST.getStore() === true && new Error().stack!.includes("LegacyDriver.cascade")) {
      this.faults += 1;
      throw new Error("injected: the request's cleanup read fails once");
    }
    return super.readExecution(id);
  }
}

/** The fault count each F row saw in its latest run, for the oracle's schedule checks. */
const FAULTS = new Map<string, number>();

type Row = { readonly id: string; readonly run: () => Promise<void> };

const ROWS: readonly Row[] = [
  { id: "T1 Kernel cancellation through app.cancel", async run() {
    const { app, executionId } = await chatLineage();
    await app.cancel(executionId);
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T2 Kernel Execution-deadline fire", async run() {
    const clock = manualClock();
    const { app, executionId } = await chatLineage({ runtime: { clock: clock.clock } }, { executionDeadline: new Date(clock.now + 100) });
    clock.advance(101);
    assert.equal((await app.runUntilBlocked(executionId as ExecutionId)).reason, "cancelled");
    await app.runUntilBlocked(executionId as ExecutionId);
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T3 wait-deadline timeout", async run() {
    const clock = manualClock();
    const { app, executionId } = await chatLineage({ runtime: { clock: clock.clock }, humanWaitDeadlineMs: 50 });
    clock.advance(51);
    const run = await app.runUntilBlocked(executionId as ExecutionId);
    assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T4 malformed accepted progress (Driver-level injected)", async run() {
    const { app, executionId, child } = await chatLineage();
    const original = LegacyDriver.prototype.progressOf;
    LegacyDriver.prototype.progressOf = () => { throw new ProtocolShapeError("injected: accepted progress is malformed"); };
    try {
      await app.input(executionId, { label: "user", payload: "go", destination: child });
      const run = await app.runUntilBlocked(executionId as ExecutionId);
      assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.native_error");
    } finally {
      LegacyDriver.prototype.progressOf = original;
    }
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T5 native root missing", async run() {
    class Store extends InMemoryRuntimeStore {
      hide = "";
      override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
        if (id === this.hide && new Error().stack!.includes("LegacyDriver.exchange")) { this.hide = ""; return undefined; }
        return super.readExecution(id);
      }
    }
    const store = new Store();
    const { app, executionId, child } = await chatLineage({ runtime: { store } });
    store.hide = executionId;
    await app.input(executionId, { label: "user", payload: "go", destination: child });
    const run = await app.runUntilBlocked(executionId as ExecutionId);
    assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.native_session_missing");
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T6 initial input rejected by a terminal root (Driver rig)", async run() {
    // A root's initial input is rejected natively only when the root is terminal (deliverEnvelope refuses a
    // terminal destination), and the first exchange forwards it before any step: no descendant can exist.
    const rig = await scriptedRig({ root: [{ do: "await", eventKinds: ["external.input"] }] }, undefined, { startInput: { label: "user", payload: "hello" } });
    await rig.driver.harness.cancelExecution({ executionId: rig.executionId as ExecutionId, reason: "injected native cancellation" });
    assert.equal(await rig.drive(2000), "FAILED");
    const view = rig.host.inspect(rig.executionId);
    assert.equal(code(view.result?.value), "arrokothi.bridge.initial_input_rejected");
    const ingress = view.emissions.map(emission => emission.value as { kind?: string; results?: { status: string }[] })
      .filter(value => value.kind === "arrokothi.bridge.ingress_result").flatMap(value => value.results ?? []);
    assert.deepEqual(ingress.map(result => result.status), ["rejected"], "the start Event is accounted for as rejected");
    await assertEnded(await rig.members(), rig.laterSteps, this.id, false);
  } },
  { id: "T7 store exception after forwarding", async run() {
    class Store extends InMemoryRuntimeStore {
      armed = false;
      override async listEmissions(id: Parameters<InMemoryRuntimeStore["listEmissions"]>[0]) {
        if (this.armed && new Error().stack!.includes("LegacyDriver.exchange")) { this.armed = false; throw new Error("store offline"); }
        return super.listEmissions(id);
      }
    }
    const store = new Store();
    const { app, executionId, child } = await chatLineage({ runtime: { store } });
    store.armed = true;
    await app.input(executionId, { label: "user", payload: "go", destination: child });
    const run = await app.runUntilBlocked(executionId as ExecutionId);
    assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.native_error");
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T7f a forward throws", async run() {
    class Store extends InMemoryRuntimeStore {
      armed = false;
      override transact<T>(...args: Parameters<InMemoryRuntimeStore["transact"]>): Promise<T> {
        if (this.armed && new Error().stack!.includes("deliverEnvelope")) { this.armed = false; throw new Error("delivery failed"); }
        return super.transact(...args) as Promise<T>;
      }
    }
    const store = new Store();
    const { app, executionId, child } = await chatLineage({ runtime: { store } });
    store.armed = true;
    await app.input(executionId, { label: "user", payload: "go", destination: child });
    const run = await app.runUntilBlocked(executionId as ExecutionId);
    assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.native_error");
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T8 value unrepresentable (Driver rig)", async run() {
    // Parallel branches cannot emit (parallel_branch_emissions_unsupported), so a stock Workflow never
    // emits while a called child lives; the rig's root spawns a detached child, then emits over the limits.
    const rows = Array.from({ length: 5_000 }, (_, index) => index);
    const rig = await scriptedRig({
      root: [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "emit", data: rows }, { do: "await", eventKinds: ["external.input"] }],
      child: [{ do: "await", eventKinds: ["external.input"] }],
    });
    assert.equal(await rig.drive(2000), "FAILED");
    assert.equal(code(rig.host.inspect(rig.executionId).result?.value), "arrokothi.bridge.value_unrepresentable");
    await assertEnded(await rig.members(), rig.laterSteps, this.id);
  } },
  { id: "T9 root COMPLETED with a live detached child (Driver rig)", async run() {
    const rig = await scriptedRig({
      root: [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "complete" }],
      child: [{ do: "await", eventKinds: ["external.input"] }],
    });
    assert.equal(await rig.drive(2000), "COMPLETED");
    await assertEnded(await rig.members(), rig.laterSteps, this.id);
  } },
  { id: "T10 root FAILED with a live detached child (Driver rig)", async run() {
    const rig = await scriptedRig({
      root: [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "fail", code: "root_failed", message: "x" }],
      child: [{ do: "await", eventKinds: ["external.input"] }],
    });
    assert.equal(await rig.drive(2000), "FAILED");
    await assertEnded(await rig.members(), rig.laterSteps, this.id);
  } },
  { id: "T11 root CANCELLED natively, no Kernel cancellation (Driver rig, injected)", async run() {
    const rig = await scriptedRig({
      root: [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "await", eventKinds: ["external.input"] }],
      child: [{ do: "await", eventKinds: ["external.input"] }],
    });
    assert.equal(await rig.drive(2000), "WAITING");
    await rig.driver.harness.cancelExecution({ executionId: rig.executionId as ExecutionId, reason: "injected native cancellation" });
    rig.input("wake", "go");
    assert.equal(await rig.drive(2000), "FAILED");
    assert.equal(code(rig.host.inspect(rig.executionId).result?.value), "arrokothi.bridge.native_cancelled");
    await assertEnded(await rig.members(), rig.laterSteps, this.id);
  } },
  { id: "T13 accounting cannot be encoded while the lineage lives (review 02 K14-R2-02)", async run() {
    const { app, executionId, child } = await chatLineage();
    const encode = BatchLedger.prototype.encode;
    BatchLedger.prototype.encode = () => { throw new Error("forced accounting encoding failure"); };
    try {
      const accepted = await app.input(executionId, { label: "user", payload: "go", destination: child });
      let run = await app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 20, pollIntervalMs: 1 });
      for (let round = 0; round < 100 && run.kernel.recoveryHolds.length === 0; round++) run = await app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 10, pollIntervalMs: 1 });
      assert.equal(run.kernel.recoveryHolds[0]?.cause, "protocol_failure");
      assert.match(run.kernel.recoveryHolds[0]?.reason ?? "", /cannot be encoded/);
      assert.ok(!TERMINAL.has(run.kernel.state), `held, not terminal (${run.kernel.state})`);
      const eventId = (accepted as { eventId?: string }).eventId;
      assert.ok(eventId, "the input was accepted as a Kernel Event");
      assert.ok(!run.kernel.acknowledged.some(entry => JSON.stringify(entry).includes(eventId)), "the batch was not acknowledged");
      assert.deepEqual(ingressResults(app, executionId).filter(result => (result as { eventId?: string }).eventId === eventId), [], "no accounting Emission for it");
    } finally {
      BatchLedger.prototype.encode = encode;
    }
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "C1 cancellation while the native root is being created (Driver rig)", async run() {
    const store = new HoldStore();
    const rig = await scriptedRig({ root: [{ do: "await", eventKinds: ["external.input"] }] }, undefined, { store, deferRoot: true });
    const creation = store.hold("Harness.createExecution");
    const creating = rig.createRoot();
    await creation.reached;
    assert.ok(rig.host.coordinator.cancelExecution(rig.host.caller, rig.executionId).ok);
    await rig.driver.cancellationSettled(rig.executionId);
    creation.release();
    await creating;
    await assertEnded(await rig.members(), rig.laterSteps, this.id, false);
  } },
  { id: "C2 a step spawns a child after the request's cascade listed the lineage (late spawn, Driver rig)", async run() {
    // The child commits after the request's cascade read the lineage and before it cancels the root (a
    // cancelled parent cannot spawn), so only the exchange's ended check after the step can end it.
    const store = new HoldStore();
    const rig = await scriptedRig({
      root: [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "await", eventKinds: ["external.input"] }],
      child: [{ do: "await", eventKinds: ["external.input"] }],
    }, undefined, { store });
    const spawn = store.hold("dispatchSpawn");
    rig.host.pump();
    rig.host.dispatchReady();
    await spawn.reached;
    const cancel = store.hold("Harness.cancelExecution");
    assert.ok(rig.host.coordinator.cancelExecution(rig.host.caller, rig.executionId).ok);
    // Bounded: with the request's cascade removed (B-TERM-ABLATION), nothing reaches this hold.
    await within(cancel.reached, 200);
    spawn.release();
    await rig.host.idle(20);
    cancel.release();
    await rig.driver.cancellationSettled(rig.executionId);
    await rig.host.idle(20);
    await assertEnded(await rig.members(), rig.laterSteps, this.id);
  } },
  { id: "C3 cancellation while a batch is being forwarded", async run() {
    const store = new HoldStore();
    const { app, executionId, child } = await chatLineage({ runtime: { store } });
    await app.input(executionId, { requestKey: "a", label: "user", payload: "a", destination: child });
    await app.input(executionId, { requestKey: "b", label: "user", payload: "b", destination: child });
    const forward = store.hold("LegacyDriver.inLineage");
    const running = app.runUntilBlocked(executionId, { timeoutMs: 2000 });
    await forward.reached;
    await app.cancel(executionId);
    forward.release();
    await running;
    await new Promise(resolve => setTimeout(resolve, 5));
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "C4 cancellation while an exchange waits for the root's creation (Driver rig)", async run() {
    const store = new HoldStore();
    const rig = await scriptedRig({ root: [{ do: "await", eventKinds: ["external.input"] }] }, undefined, { store, deferRoot: true, startInput: { label: "user", payload: "hello" } });
    const creation = store.hold("Harness.createExecution");
    const creating = rig.createRoot();
    await creation.reached;
    rig.host.pump();
    rig.host.dispatchReady();
    for (let n = 0; n < 20; n++) await turn();
    assert.ok(rig.host.coordinator.cancelExecution(rig.host.caller, rig.executionId).ok);
    await rig.driver.cancellationSettled(rig.executionId);
    creation.release();
    await creating;
    await rig.host.idle(5);
    await assertEnded(await rig.members(), rig.laterSteps, this.id, false);
  } },
  { id: "F1 app.cancel after the request's cascade failed once (review 03 K14-R3-02)", async run() {
    const store = new RequestFaultStore();
    const { app, executionId } = await chatLineage({ runtime: { store } });
    const cancelled = await inRequestScope(() => app.cancel(executionId).then(() => null, (error: unknown) => error));
    FAULTS.set("F1", store.faults);
    assert.equal(app.inspect(executionId).state, "CANCELLED", `${this.id}: Kernel CANCELLED`);
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
    assert.equal(cancelled, null, `${this.id}: app.cancel resolves`);
  } },
  { id: "F2 an exchange starts after the request's cascade failed once (Driver rig; review 03 K14-R3-02)", async run() {
    // The root exists before the exchange starts, so the exchange's own ended check is what ends it.
    const store = new RequestFaultStore();
    const rig = await scriptedRig({ root: [{ do: "await", eventKinds: ["external.input"] }] }, undefined, { store });
    await inRequestScope(async () => {
      rig.host.dispatchReady();
      assert.ok(rig.host.coordinator.cancelExecution(rig.host.caller, rig.executionId).ok);
      await rig.driver.cancellationSettled(rig.executionId);
    });
    FAULTS.set("F2", store.faults);
    await rig.host.idle(20);
    assert.equal(rig.host.inspect(rig.executionId).state, "CANCELLED", `${this.id}: Kernel CANCELLED`);
    await assertEnded(await rig.members(), rig.laterSteps, this.id, false);
  } },
  { id: "F3 cancellation while the exchange reads its root, after the request's cascade failed once (Driver rig; review 03 K14-R3-02)", async run() {
    // Held at the exchange's root read, before the forwarding loop: the loop's ended check ends the root.
    const store = new RequestFaultStore();
    const rig = await scriptedRig({ root: [{ do: "await", eventKinds: ["external.input"] }] }, undefined, { store, startInput: { label: "user", payload: "go" } });
    const read = store.hold("LegacyDriver.exchange");
    await inRequestScope(async () => {
      rig.host.dispatchReady();
      await read.reached;
      assert.ok(rig.host.coordinator.cancelExecution(rig.host.caller, rig.executionId).ok);
      await rig.driver.cancellationSettled(rig.executionId);
    });
    FAULTS.set("F3", store.faults);
    read.release();
    await rig.host.idle(20);
    assert.equal(rig.host.inspect(rig.executionId).state, "CANCELLED", `${this.id}: Kernel CANCELLED`);
    await assertEnded(await rig.members(), rig.laterSteps, this.id, false);
  } },
];

describe("B-TERM-TRIGGERS: in each row, the terminal trigger ends every native member (review 01 K14-R1-05; bounded by 017 L-36)", () => {
  for (const row of ROWS) test(row.id, () => row.run());
});

// -- The census: every cleanup call site, from the source (D04-CHK-03) ---------

const NAMES = new Set(["endLineage", "terminate", "cascade", "cancelExecution"]);
type Site = { readonly label: string; readonly at: string; readonly method: string };
type Census = { readonly sites: readonly Site[]; readonly errors: readonly string[] };

function enclosingMethod(node: ts.Node, source: ts.SourceFile): string {
  for (let up: ts.Node | undefined = node.parent; up; up = up.parent) {
    if (ts.isMethodDeclaration(up) && up.name) return up.name.getText(source);
    if (ts.isConstructorDeclaration(up)) return "constructor";
  }
  return "?";
}

/** The labels a label argument can take: a string literal, or a conditional of them. */
function literalLabels(node: ts.Expression): string[] | null {
  if (ts.isStringLiteral(node)) return [node.text];
  if (ts.isParenthesizedExpression(node)) return literalLabels(node.expression);
  if (ts.isConditionalExpression(node)) {
    const whenTrue = literalLabels(node.whenTrue);
    const whenFalse = literalLabels(node.whenFalse);
    return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null;
  }
  return null;
}

/**
 * Resolves every cleanup call in `files` syntactically: a bounded guard (017 L-37), not a sound analysis.
 * The checked forms are errors unless they resolve:
 * - a dot-property call of a cleanup name (`x.endLineage(…)`) needs a literal label, or a conditional of
 *   literals, and each label one call site; `cascade` only from `endLineage`; a native
 *   `harness.cancelExecution` only from `cascade`. The Kernel's `coordinator.cancelExecution` is
 *   recognised and excluded, and any other receiver is an error;
 * - an Identifier with a cleanup name outside such a call, which covers aliases and
 *   `.call`/`.apply`/`.bind` on the dot name;
 * - element access by a StringLiteral cleanup name.
 * Excluded (review 03 K14-R3-03, owner choice 06): static template element access, quoted destructuring
 * aliases (a StringLiteral property name, then calls through the renamed binding), and names computed at
 * run time. B-TERM-CENSUS asserts that the first two escape.
 */
function cleanupCensus(files: Readonly<Record<string, string>>): Census {
  const sites: Site[] = [];
  const errors: string[] = [];
  let forwards = 0;
  for (const [file, text] of Object.entries(files)) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const callees = new Set<ts.Node>();
    const where = (node: ts.Node) => `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && NAMES.has(node.expression.name.text)) {
        const callee = node.expression;
        callees.add(callee.name);
        const name = callee.name.text;
        const method = enclosingMethod(node, source);
        const receiver = callee.expression.getText(source);
        if (name === "endLineage") {
          const argument = node.arguments[1];
          const labels = argument ? literalLabels(argument) : null;
          if (labels) for (const label of labels) sites.push({ label, at: where(node), method });
          else if (argument && ts.isIdentifier(argument) && argument.text === "site" && method === "terminate") forwards += 1;
          else errors.push(`${where(node)}: endLineage without a literal label`);
        } else if (name === "terminate") {
          const argument = node.arguments[node.arguments.length - 1];
          if (receiver === "this" && argument && ts.isStringLiteral(argument)) sites.push({ label: argument.text, at: where(node), method });
          else errors.push(`${where(node)}: terminate without a literal label`);
        } else if (name === "cascade") {
          if (method !== "endLineage") errors.push(`${where(node)}: cascade called from ${method}, not endLineage`);
        } else if (/(?:^|\.)coordinator$/.test(receiver)) {
          // The Kernel's cancellation, not a native cleanup.
        } else if (/(?:^|\.)harness$/.test(receiver)) {
          if (method !== "cascade") errors.push(`${where(node)}: native cancelExecution in ${method}, not cascade`);
        } else {
          errors.push(`${where(node)}: cancelExecution on an unresolved receiver ${receiver}`);
        }
      }
      if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && NAMES.has(node.argumentExpression.text)) {
        errors.push(`${where(node)}: element access by ${node.argumentExpression.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    const references = (node: ts.Node) => {
      if (ts.isTypeNode(node)) return;
      if (ts.isIdentifier(node) && NAMES.has(node.text) && !callees.has(node)) {
        const parent = node.parent;
        const declaration = (ts.isMethodDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isMethodSignature(parent) || ts.isPropertySignature(parent)) && parent.name === node;
        if (!declaration) errors.push(`${where(node)}: ${node.text} referenced outside a call`);
      }
      ts.forEachChild(node, references);
    };
    references(source);
  }
  if (forwards !== 1) errors.push(`expected one label-forwarding endLineage inside terminate, found ${forwards}`);
  const seen = new Map<string, string>();
  for (const site of sites) {
    if (seen.has(site.label)) errors.push(`label ${site.label} at both ${seen.get(site.label)} and ${site.at}`);
    seen.set(site.label, site.at);
  }
  return { sites, errors };
}

async function sdkSources(): Promise<Record<string, string>> {
  const root = resolve(REPO, "packages/sdk/src");
  const files: Record<string, string> = {};
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith(".ts")) files[relative(REPO, path)] = await readFile(path, "utf8");
    }
  };
  await walk(root);
  return files;
}

const DRIVER = "packages/sdk/src/legacy-bridge/driver.ts";
const ANCHOR = "  /** Resolves once the cascade a cancellation request started for E has finished. */";
const inject = (files: Record<string, string>, method: string) => {
  assert.ok(files[DRIVER]!.includes(ANCHOR));
  return { ...files, [DRIVER]: files[DRIVER]!.replace(ANCHOR, `${method}\n\n${ANCHOR}`) };
};

describe("B-TERM-CENSUS: every cleanup call site resolves to one literal label (design 04 §3.2, D04-CHK-03)", () => {
  test("the source: one label per call site, and the labels are exactly TERMINATE_SITES", async () => {
    const census = cleanupCensus(await sdkSources());
    assert.deepEqual(census.errors, []);
    assert.deepEqual(census.sites.map(site => site.label).sort(), [...TERMINATE_SITES].sort());
    assert.equal(census.sites.find(site => site.label === "cancel.application")?.at.split(":")[0], "packages/sdk/src/application.ts");
  });

  const controls: readonly [string, string, RegExp][] = [
    ["an unlabelled call", "  probe(id: string, label: TerminateSite) { return this.endLineage(id, label); }", /endLineage without a literal label/],
    ["an aliased call", "  probe() { const end = this.endLineage; return end; }", /endLineage referenced outside a call/],
    ["a .call form", "  probe(id: string) { return this.endLineage.call(this, id, \"hold\"); }", /endLineage referenced outside a call/],
    ["an element access", "  probe(id: string) { return this[\"endLineage\"](id, \"hold\"); }", /element access by endLineage/],
    ["a reused label", "  probe(id: string) { return this.endLineage(id, \"hold\"); }", /label hold at both/],
    ["a cascade outside endLineage", "  probe(id: string) { return this.cascade(id); }", /cascade called from probe/],
    ["a native cancellation outside cascade", "  probe(id: string) { return this.harness.cancelExecution({ executionId: id as ExecutionId, reason: \"x\" }); }", /native cancelExecution in probe/],
    ["an unresolved cancellation receiver", "  probe(other: { cancelExecution(): void }) { return other.cancelExecution(); }", /unresolved receiver other/],
  ];
  for (const [name, method, error] of controls) {
    test(`negative control: ${name} fails the census`, async () => {
      const census = cleanupCensus(inject(await sdkSources(), method));
      assert.ok(census.errors.some(entry => error.test(entry)), `${name}: ${JSON.stringify(census.errors)}`);
    });
  }

  // Review 03 K14-R3-03's forms, kept as recorded exclusions (017 L-37): each adds a cleanup route that the
  // census does not see. If the census learns a form, its test fails here and L-37 narrows.
  const excluded: readonly [string, string][] = [
    ["static template element access", "  probe(id: string) { return this[`endLineage`](id, \"hold\"); }"],
    ["a quoted destructuring alias", "  probe(id: string) { const { \"endLineage\": end } = this; return end.call(this, id, \"hold\"); }"],
    ["a quoted native-cancel alias", "  probe(id: string) { const { \"cancelExecution\": cancel } = this.harness; return cancel.call(this.harness, { executionId: id as ExecutionId, reason: \"x\" }); }"],
  ];
  for (const [name, method] of excluded) {
    test(`recorded exclusion (L-37): ${name} escapes the census`, async () => {
      const base = cleanupCensus(await sdkSources());
      const census = cleanupCensus(inject(await sdkSources(), method));
      assert.deepEqual(census.errors, [], `${name} is not reported`);
      assert.deepEqual(census.sites.map(site => site.label).sort(), base.sites.map(site => site.label).sort(), `${name} adds no label`);
    });
  }

  test("negative control: a new labelled site with no table entry fails the label set and the oracle table", async () => {
    const census = cleanupCensus(inject(await sdkSources(), "  probe(id: string) { return this.endLineage(id, \"cancel.new\"); }"));
    assert.deepEqual(census.errors, []);
    const labels = census.sites.map(site => site.label);
    assert.notDeepEqual(labels.sort(), [...TERMINATE_SITES].sort());
    assert.ok(tableErrors(PAIRS, EQUIVALENT_ONLY, labels).some(entry => /cancel\.new/.test(entry)));
  });
});

// -- The oracle: each (row, label) pair's disposition (design 04 §6, D04-CHK-03) --

type Disposition = "kill" | { readonly empty: true } | { readonly redundant: TerminateSite };

/**
 * Every label each row reaches, with its disposition when only that label's cascade is removed. B-TERM-ORACLE
 * requires each row's reached labels to equal its keys here.
 */
const PAIRS: Readonly<Record<string, Partial<Record<TerminateSite, Disposition>>>> = {
  T1: { "cancel.request": { redundant: "cancel.application" }, "cancel.application": { redundant: "cancel.request" } },
  T2: { "cancel.request": "kill" },
  T3: { timeout: "kill" },
  T4: { progress: "kill" },
  T5: { "root-missing": "kill" },
  T6: { "initial-input": { empty: true } },
  T7: { exception: "kill" },
  T7f: { forward: "kill" },
  T8: { exception: "kill" },
  T9: { complete: "kill" },
  T10: { fail: "kill" },
  T11: { "native-cancelled": "kill" },
  T13: { hold: "kill" },
  C1: { "cancel.request": { redundant: "cancel.root-created" }, "cancel.root-created": "kill" },
  C2: { "cancel.request": { redundant: "cancel.step-ended" }, "cancel.step-ended": "kill" },
  C3: { "cancel.request": { redundant: "cancel.application" }, "cancel.application": { redundant: "cancel.request" }, "cancel.forward-loop": { redundant: "cancel.request" } },
  C4: { "cancel.request": { redundant: "cancel.root-created" }, "cancel.root-created": { redundant: "cancel.exchange-start" }, "cancel.exchange-start": { redundant: "cancel.root-created" } },
  // Review 03 K14-R3-02. With `cancel.request` removed, nothing fails and the row's own label ends the lineage.
  F1: { "cancel.request": { redundant: "cancel.application" }, "cancel.application": "kill" },
  F2: { "cancel.request": { redundant: "cancel.exchange-start" }, "cancel.exchange-start": "kill" },
  F3: { "cancel.request": { redundant: "cancel.forward-loop" }, "cancel.forward-loop": "kill" },
};

/**
 * Labels with no killing row, each with why its removal changes nothing. Only T6's empty obligation is left:
 * review 03 showed one-fault rows (F1–F3) that kill the three `cancel.*` labels once recorded here.
 */
const EQUIVALENT_ONLY: Readonly<Partial<Record<TerminateSite, string>>> = {
  "initial-input": "the root is terminal before the first forward and no step has run, so no descendant exists (T6)",
};

/** Each F row's expected request-cascade faults: one, except with `cancel.request` itself removed. */
const expectedFaults = (row: string, ablated: TerminateSite | null) => (!row.startsWith("F") ? null : ablated === "cancel.request" ? 0 : 1);

/** The table's consistency with a set of labels: every label mapped, each with a kill or a recorded reason. */
function tableErrors(pairs: typeof PAIRS, only: typeof EQUIVALENT_ONLY, labels: readonly string[]): string[] {
  const errors: string[] = [];
  const mapped = new Map<string, Disposition[]>();
  for (const [row, entries] of Object.entries(pairs)) {
    for (const [label, disposition] of Object.entries(entries)) {
      if (!labels.includes(label)) errors.push(`${row}: ${label} is not a cleanup site`);
      if (typeof disposition === "object" && "redundant" in disposition && !(disposition.redundant in entries)) errors.push(`${row}: ${label} is redundant by ${disposition.redundant}, which ${row} does not reach`);
      mapped.set(label, [...(mapped.get(label) ?? []), disposition!]);
    }
  }
  for (const label of labels) {
    const list = mapped.get(label);
    if (!list) { errors.push(`${label}: no row reaches it`); continue; }
    const killed = list.includes("kill");
    if (!killed && !(label in only)) errors.push(`${label}: no row kills it and no reason is recorded`);
    if (killed && label in only) errors.push(`${label}: killed, yet recorded as equivalent only`);
  }
  return errors;
}

const rowKey = (row: Row) => row.id.split(" ")[0]!;

type Call = { readonly driver: LegacyDriver; readonly executionId: string; readonly label: TerminateSite; readonly ablated: boolean; readonly entry: Member[]; exit: Member[] | null };

async function lineageOf(driver: LegacyDriver, executionId: string): Promise<Member[]> {
  const ids = [executionId];
  for (let index = 0; index < ids.length; index++) {
    for (const link of await driver.harness.childExecutionLinksOf(ids[index]! as ExecutionId)) ids.push(link.childExecutionId);
  }
  return Promise.all(ids.map(async id => ({ id, lifecycle: (await driver.harness.inspect(id as ExecutionId))?.lifecycle ?? "missing" })));
}

/** Runs `row` with every `endLineage` call logged, and `ablate`'s cascade removed. */
async function logged(row: Row, ablate: TerminateSite | null): Promise<{ calls: Call[]; error: unknown }> {
  const calls: Call[] = [];
  const original = LegacyDriver.prototype.endLineage;
  LegacyDriver.prototype.endLineage = async function (this: LegacyDriver, executionId: string, label: TerminateSite) {
    const call: Call = { driver: this, executionId, label, ablated: label === ablate, entry: await lineageOf(this, executionId), exit: null };
    calls.push(call);
    if (!call.ablated) await original.call(this, executionId, label);
    call.exit = await lineageOf(this, executionId);
  };
  try {
    await row.run();
    return { calls, error: null };
  } catch (error) {
    return { calls, error };
  } finally {
    LegacyDriver.prototype.endLineage = original;
  }
}

describe("B-TERM-ORACLE: each row reaches exactly the labels the table maps (design 04 §6, D04-CHK-03)", () => {
  test("the table covers every TERMINATE_SITES label, each killed or with a recorded reason", () => {
    assert.deepEqual(tableErrors(PAIRS, EQUIVALENT_ONLY, TERMINATE_SITES), []);
    assert.deepEqual(Object.keys(PAIRS).sort(), ROWS.map(rowKey).sort());
  });
  test("negative control: the table without its hold row fails", () => {
    const { T13: _removed, ...withoutHold } = PAIRS;
    assert.ok(tableErrors(withoutHold, EQUIVALENT_ONLY, TERMINATE_SITES).some(entry => /^hold: no row reaches it/.test(entry)));
  });
  test("negative control: the table without its F rows fails for each of the three cancel labels", () => {
    const { F1: _f1, F2: _f2, F3: _f3, ...withoutF } = PAIRS;
    const errors = tableErrors(withoutF, EQUIVALENT_ONLY, TERMINATE_SITES);
    for (const label of ["cancel.application", "cancel.exchange-start", "cancel.forward-loop"]) {
      assert.ok(errors.includes(`${label}: no row kills it and no reason is recorded`), `${label}: ${JSON.stringify(errors)}`);
    }
  });
  test("negative control: restoring an equivalent-only reason for a killed label fails", () => {
    const restored = { ...EQUIVALENT_ONLY, "cancel.application": "restored for the control" };
    assert.ok(tableErrors(PAIRS, restored, TERMINATE_SITES).includes("cancel.application: killed, yet recorded as equivalent only"));
  });
  for (const row of ROWS) {
    test(`baseline ${rowKey(row)}: passes, and reaches exactly its mapped labels`, async t => {
      FAULTS.delete(rowKey(row));
      const { calls, error } = await logged(row, null);
      t.diagnostic(JSON.stringify(calls.map(call => [call.label, call.entry.map(member => member.lifecycle).join("/")])));
      assert.equal(error, null, `${row.id} passes unablated: ${String(error)}`);
      assert.deepEqual([...new Set(calls.map(call => call.label))].sort(), Object.keys(PAIRS[rowKey(row)]!).sort());
      const faults = expectedFaults(rowKey(row), null);
      if (faults !== null) assert.equal(FAULTS.get(rowKey(row)), faults, "the request's cascade failed once");
    });
  }
});

describe("B-TERM-ABLATION: each pair's disposition, executed with only that label's cascade removed", () => {
  for (const row of ROWS) {
    for (const [label, disposition] of Object.entries(PAIRS[rowKey(row)]!) as [TerminateSite, Disposition][]) {
      const kind = disposition === "kill" ? "kill" : "empty" in disposition ? "empty obligation" : `redundant by ${disposition.redundant}`;
      test(`${rowKey(row)} without ${label}: ${kind}`, async t => {
        FAULTS.delete(rowKey(row));
        const { calls, error } = await logged(row, label);
        assert.ok(calls.some(call => call.label === label && call.ablated), `${label} was reached`);
        const faults = expectedFaults(rowKey(row), label);
        if (faults !== null) assert.equal(FAULTS.get(rowKey(row)), faults, `the one-fault schedule ran (${faults} request faults)`);
        if (disposition === "kill") {
          t.diagnostic(String((error as Error | null)?.message).split("\n")[0]!);
          assert.ok(error instanceof assert.AssertionError, `a behavioural assertion of ${row.id} fails: ${String(error)}`);
          return;
        }
        assert.equal(error, null, `${row.id} still passes: ${String(error)}`);
        if ("empty" in disposition) {
          for (const call of calls.filter(entry => entry.label === label)) {
            assert.equal(call.entry.length, 1, "no descendant at the label's entry");
            assert.ok(TERMINAL.has(call.entry[0]!.lifecycle), `the root is terminal at the label's entry (${call.entry[0]!.lifecycle})`);
          }
          return;
        }
        const other = calls.filter(call => call.label === disposition.redundant && !call.ablated && call.exit !== null);
        assert.ok(other.length > 0, `${disposition.redundant} ran`);
        const ended = new Set(other.flatMap(call => call.exit!.filter(member => TERMINAL.has(member.lifecycle)).map(member => member.id)));
        for (const call of other) for (const member of call.exit!) assert.ok(TERMINAL.has(member.lifecycle), `${disposition.redundant} ended ${member.id}`);
        const final = await lineageOf(other[0]!.driver, other[0]!.executionId);
        for (const member of final) assert.ok(ended.has(member.id), `${member.id} existed when ${disposition.redundant} ended the lineage`);
      });
    }
  }
});

// -- The recorded limit: a fulfilled cancel call is not an ended member (017 L-36) ------------------

describe("B-TERM-LIMIT: review 03 K14-R3-01's counterexamples, kept with the recorded behaviour (017 L-36)", () => {
  // These assert what happens today, which L-36 records; they are not a guarantee. A native exception after
  // READY->RUNNING leaves the member RUNNING, and the cascade's cancel call answers `cancellation_pending`.
  // Kernel FAILED is authoritative and the accounted input is acknowledged, or Kernel CANCELLED when a Kernel
  // cancellation reached the running step first. No hold follows and no later step starts. If a later packet
  // ends or reports the member, these fail, and L-36 is removed with them.
  for (const fault of ["applyOutcome", "definition lookup"] as const) {
    test(`L-36 counterexample: one failed ${fault} after READY->RUNNING leaves the root RUNNING with a pending cancellation and no hold`, async t => {
      let faults = 0;
      let calls = 0;
      class Store extends InMemoryRuntimeStore {
        override transact<T>(...args: Parameters<InMemoryRuntimeStore["transact"]>): Promise<T> {
          if (fault === "applyOutcome" && faults === 0 && new Error().stack!.includes("Harness.applyOutcome")) {
            faults += 1;
            return Promise.reject(new Error("injected: applyOutcome transaction unavailable"));
          }
          return super.transact(...args) as Promise<T>;
        }
      }
      class Definitions extends InMemoryDefinitionStore {
        override async get(...args: Parameters<InMemoryDefinitionStore["get"]>) {
          if (fault === "definition lookup" && faults === 0 && new Error().stack!.includes("Harness.runController")) {
            faults += 1;
            throw new Error("injected: definition lookup unavailable");
          }
          return super.get(...args);
        }
      }
      const app = createApplication({
        runtime: { store: new Store(), definitions: new Definitions() },
        functions: { work: () => { calls += 1; return { status: "completed", result: "ok" }; } },
      });
      const { executionId } = await app.start({ definition: functionWorkflow("cleanup-fault", "work"), input: { label: "user", payload: "go" } });
      const run = await app.runUntilBlocked(executionId, { timeoutMs: 500, pollIntervalMs: 1 });
      const request = await app.harness.cancellationRequestOf(executionId);
      const laterSteps = await app.runUntilIdle();
      const native = await app.harness.inspect(executionId);
      t.diagnostic(JSON.stringify({ fault, faults, calls, kernel: run.kernel.state, native: native?.lifecycle, cancellation: request?.state, holds: run.kernel.recoveryHolds.length, acknowledged: run.kernel.acknowledged.length, laterSteps: laterSteps.length }));
      assert.equal(faults, 1, "one injected fault");
      assert.equal(calls, fault === "applyOutcome" ? 1 : 0, "the function ran once, or not at all");
      assert.equal(run.kernel.state, "FAILED", "Kernel FAILED is authoritative");
      assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.native_error");
      assert.equal(run.kernel.acknowledged.length, 1, "the accounted input is acknowledged");
      assert.deepEqual(run.kernel.recoveryHolds, [], "no cleanup hold");
      assert.equal(native?.lifecycle, "RUNNING", "the native root stays RUNNING");
      assert.equal(request?.state, "pending", "its cancellation is pending");
      assert.equal(laterSteps.length, 0, "the Driver starts no later step");
    });
  }

  test("L-36 counterexample (implementer-found variant): app.cancel mid-step, then the step's applyOutcome fails; the root stays RUNNING under Kernel CANCELLED", async t => {
    let faults = 0;
    let armed = false;
    const inStep = deferred<void>();
    const gate = deferred<void>();
    class Store extends InMemoryRuntimeStore {
      override transact<T>(...args: Parameters<InMemoryRuntimeStore["transact"]>): Promise<T> {
        if (armed && faults === 0 && new Error().stack!.includes("Harness.applyOutcome")) {
          faults += 1;
          return Promise.reject(new Error("injected: applyOutcome transaction unavailable"));
        }
        return super.transact(...args) as Promise<T>;
      }
    }
    const app = createApplication({
      runtime: { store: new Store() },
      functions: { work: async () => { inStep.resolve(); await gate.promise; return { status: "completed", result: "ok" }; } },
    });
    const { executionId } = await app.start({ definition: functionWorkflow("cancel-mid-step", "work"), input: { label: "user", payload: "go" } });
    const running = app.runUntilBlocked(executionId, { timeoutMs: 1000, pollIntervalMs: 1 });
    await inStep.promise;
    assert.equal((await app.harness.inspect(executionId))?.lifecycle, "RUNNING", "the cancellation reaches a running step");
    const cancelling = app.cancel(executionId);
    armed = true;
    gate.resolve();
    await cancelling;
    await running;
    const laterSteps = await app.runUntilIdle();
    const view = app.inspect(executionId);
    const native = await app.harness.inspect(executionId);
    const request = await app.harness.cancellationRequestOf(executionId);
    t.diagnostic(JSON.stringify({ faults, kernel: view.state, holds: view.recoveryHolds.length, native: native?.lifecycle, cancellation: request?.state, laterSteps: laterSteps.length }));
    assert.equal(faults, 1, "one injected fault");
    assert.equal(view.state, "CANCELLED", "Kernel CANCELLED is authoritative, and app.cancel resolved");
    assert.deepEqual(view.recoveryHolds, [], "no cleanup hold");
    assert.equal(native?.lifecycle, "RUNNING", "the native root stays RUNNING");
    assert.equal(request?.state, "pending", "its cancellation is pending");
    assert.equal(laterSteps.length, 0, "the Driver starts no later step");
  });
});
