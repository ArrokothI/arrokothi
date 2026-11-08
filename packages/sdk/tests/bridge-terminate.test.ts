/**
 * K1.4 design 03 R1-05 and design 04 R2-02 (review 01 K14-R1-05; review 02 K14-R2-02; design check 03 T12
 * clarification; design check 04 D04-CHK-03): every terminal trigger ends the whole native lineage, and
 * no later host run starts native work.
 *
 * The cleanup sites come from the code, not from the rows. B-TERM-CENSUS resolves every `endLineage`
 * call in `packages/sdk/src` to its literal label, fails closed on any other form, and requires the labels
 * to equal `TERMINATE_SITES`. B-TERM-ORACLE runs every row once, logging the labels it reaches, and the
 * table gives each (row, label) pair one disposition. B-TERM-ABLATION removes one label's cascade at a time
 * and runs each pair's check:
 * - **kill:** the row's behavioural assertions fail;
 * - **empty obligation:** at the label's entry the root is terminal and E has no descendant, and the row
 *   passes (T6);
 * - **redundant:** another label's cascade ended every member, every member that exists at the end
 *   existed at that cascade's exit, and the row passes.
 *
 * T12, the refused terminal Outcome's hold, is B-PROTOCOL-HOLD in `bridge-deadline-cancel.test.ts`: its
 * cascade runs at the terminal label, and the hold that follows has no cascade of its own. T13 here is the
 * nonterminal accounting hold with a live lineage. Rows run through the SDK where the stock controllers
 * reach the trigger; T4 is a Driver-level injection, and the rig rows use scripted native controllers.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { setImmediate as turn } from "node:timers/promises";
import ts from "typescript";
import { createApplication } from "@arrokothi/sdk";
import type { Application, ExecutionId } from "@arrokothi/sdk";
import { InMemoryRuntimeStore, ScriptedModelProvider } from "@arrokothi/core/reference";
import { ProtocolShapeError } from "../src/legacy-bridge/codec.ts";
import { LegacyDriver, TERMINATE_SITES } from "../src/legacy-bridge/driver.ts";
import type { TerminateSite } from "../src/legacy-bridge/driver.ts";
import { BatchLedger } from "../src/legacy-bridge/ledger.ts";
import { allowDocs, callingWorkflow, chatAgent, deferred, ingressResults, manualClock, models } from "./bridge-fixtures.ts";
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
];

describe("B-TERM-TRIGGERS: each terminal trigger ends the whole native lineage (review 01 K14-R1-05)", () => {
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
 * Resolves every cleanup call in `files` syntactically. Fails closed: a cleanup name used other than as
 * the callee of a call, an element access by such a name, a non-literal label, a label at two call
 * sites, a cascade outside `endLineage`, or a native cancellation outside `cascade` is an error. The
 * Kernel's `coordinator.cancelExecution` is recognised and excluded. Run-time computed property names are
 * the declared gap of this bounded search.
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
};

/** Labels with no killing row, each with why no row can distinguish its removal. */
const EQUIVALENT_ONLY: Readonly<Partial<Record<TerminateSite, string>>> = {
  "initial-input": "the root is terminal before the first forward and no step has run, so no descendant exists (T6)",
  "cancel.application": "app.cancel runs it after the request's cascade finished; a member that cascade missed was created by a step still running (a cancelled parent cannot spawn), and the exchange's ended check after that step ends it (cancel.step-ended, C2)",
  "cancel.forward-loop": "forwarding creates no member, so the request's cascade has already ended every member (C3)",
  "cancel.exchange-start": "the exchange waits for root creation, whose own ended check cancels the new root first (C4)",
};

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
  for (const row of ROWS) {
    test(`baseline ${rowKey(row)}: passes, and reaches exactly its mapped labels`, async t => {
      const { calls, error } = await logged(row, null);
      t.diagnostic(JSON.stringify(calls.map(call => [call.label, call.entry.map(member => member.lifecycle).join("/")])));
      assert.equal(error, null, `${row.id} passes unablated: ${String(error)}`);
      assert.deepEqual([...new Set(calls.map(call => call.label))].sort(), Object.keys(PAIRS[rowKey(row)]!).sort());
    });
  }
});

describe("B-TERM-ABLATION: each pair's disposition, executed with only that label's cascade removed", () => {
  for (const row of ROWS) {
    for (const [label, disposition] of Object.entries(PAIRS[rowKey(row)]!) as [TerminateSite, Disposition][]) {
      const kind = disposition === "kill" ? "kill" : "empty" in disposition ? "empty obligation" : `redundant by ${disposition.redundant}`;
      test(`${rowKey(row)} without ${label}: ${kind}`, async () => {
        const { calls, error } = await logged(row, label);
        assert.ok(calls.some(call => call.label === label && call.ablated), `${label} was reached`);
        if (disposition === "kill") {
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
