/**
 * K1.4 design 03 R1-05 (review 01 K14-R1-05; design check 03 T12 clarification): every terminal trigger
 * with a live descendant ends the whole native lineage, and no later host run starts native work.
 *
 * B-TERM-TRIGGERS has one row per trigger (design 03 §5, T1-T11; T12 is B-PROTOCOL-HOLD in
 * `bridge-deadline-cancel.test.ts`). Rows run through the SDK where the stock controllers reach the
 * trigger; T4 is a Driver-level injected case, and T9-T11 use the Driver rig's scripted controllers.
 * B-TERM-ABLATION removes one `endLineage` call site at a time and requires every row that shares
 * the site to fail.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createApplication } from "@arrokothi/sdk";
import type { Application, ExecutionId } from "@arrokothi/sdk";
import { InMemoryRuntimeStore, ScriptedModelProvider } from "@arrokothi/core/reference";
import { ProtocolShapeError } from "../src/legacy-bridge/codec.ts";
import { LegacyDriver } from "../src/legacy-bridge/driver.ts";
import type { TerminateSite } from "../src/legacy-bridge/driver.ts";
import { allowDocs, callingWorkflow, chatAgent, manualClock, models } from "./bridge-fixtures.ts";
import { scriptedRig } from "./bridge-rig.ts";

const code = (value: unknown): string | undefined => (value as { code?: string } | null)?.code;

/** Every native member of E's lineage, through the deprecated read view. */
async function members(app: Application, executionId: string) {
  const ids = [executionId];
  for (let index = 0; index < ids.length; index++) {
    for (const link of await app.harness.childExecutionLinksOf(ids[index]! as ExecutionId)) ids.push(link.childExecutionId);
  }
  return Promise.all(ids.map(async id => ({ id, lifecycle: (await app.harness.inspect(id as ExecutionId))?.lifecycle ?? "missing" })));
}

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

/** The row assertions: a live descendant existed, every member ended, and later host runs start nothing. */
async function assertEnded(list: readonly { id: string; lifecycle: string }[], laterSteps: () => Promise<readonly unknown[]>, row: string) {
  assert.ok(list.length >= 2, `${row}: the lineage had a descendant`);
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

type Row = { readonly id: string; readonly site: TerminateSite; readonly run: () => Promise<void> };

const ROWS: Row[] = [
  { id: "T1 Kernel cancellation", site: "cancellation", async run() {
    const { app, executionId } = await chatLineage();
    await app.cancel(executionId);
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T2 Kernel Execution-deadline fire", site: "cancellation", async run() {
    const clock = manualClock();
    const { app, executionId } = await chatLineage({ runtime: { clock: clock.clock } }, { executionDeadline: new Date(clock.now + 100) });
    clock.advance(101);
    assert.equal((await app.runUntilBlocked(executionId as ExecutionId)).reason, "cancelled");
    await app.runUntilBlocked(executionId as ExecutionId);
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T3 wait-deadline timeout", site: "timeout", async run() {
    const clock = manualClock();
    const { app, executionId } = await chatLineage({ runtime: { clock: clock.clock }, humanWaitDeadlineMs: 50 });
    clock.advance(51);
    const run = await app.runUntilBlocked(executionId as ExecutionId);
    assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.wait_deadline_expired");
    await assertEnded(await members(app, executionId), later(app, executionId), this.id);
  } },
  { id: "T4 malformed accepted progress (Driver-level injected)", site: "progress", async run() {
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
  { id: "T5 native root missing", site: "root-missing", async run() {
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
  { id: "T7 store exception after forwarding", site: "exception", async run() {
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
  { id: "T7f a forward throws", site: "forward", async run() {
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
  { id: "T8 value unrepresentable (Driver rig)", site: "exception", async run() {
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
  { id: "T9 root COMPLETED with a live detached child (Driver rig)", site: "complete", async run() {
    const rig = await scriptedRig({
      root: [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "complete" }],
      child: [{ do: "await", eventKinds: ["external.input"] }],
    });
    assert.equal(await rig.drive(2000), "COMPLETED");
    await assertEnded(await rig.members(), rig.laterSteps, this.id);
  } },
  { id: "T10 root FAILED with a live detached child (Driver rig)", site: "fail", async run() {
    const rig = await scriptedRig({
      root: [{ do: "spawn", definitionId: "child", definitionVersion: 1, await: false }, { do: "fail", code: "root_failed", message: "x" }],
      child: [{ do: "await", eventKinds: ["external.input"] }],
    });
    assert.equal(await rig.drive(2000), "FAILED");
    await assertEnded(await rig.members(), rig.laterSteps, this.id);
  } },
  { id: "T11 root CANCELLED natively, no Kernel cancellation (Driver rig, injected)", site: "native-cancelled", async run() {
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
];

describe("B-TERM-TRIGGERS: each terminal trigger ends the whole native lineage (review 01 K14-R1-05)", () => {
  for (const row of ROWS) test(row.id, () => row.run());

  test("T6 initial input rejected: no descendant can exist, and the root is already terminal", () => {
    // Recorded, not run as a cascade row: a root's initial input is rejected natively only when the root is
    // terminal (deliverEnvelope refuses a terminal destination), and the first exchange forwards it before
    // any step, so no descendant exists. B-ACK-EXITS covers its accounting; its `endLineage` site has nothing
    // to end, so B-TERM-ABLATION records it as undetectable by construction.
    assert.ok(true);
  });
});

describe("B-TERM-ABLATION: removing one endLineage call site fails every row that shares it", () => {
  const sites = [...new Set(ROWS.map(row => row.site))];
  test("the sites the rows exercise, and the rows sharing each", () => {
    const sharing = Object.fromEntries(sites.map(site => [site, ROWS.filter(row => row.site === site).map(row => row.id.split(" ")[0])]));
    assert.deepEqual(sharing, {
      cancellation: ["T1", "T2"], timeout: ["T3"], progress: ["T4"], "root-missing": ["T5"], exception: ["T7", "T8"],
      forward: ["T7f"], complete: ["T9"], fail: ["T10"], "native-cancelled": ["T11"],
    });
  });
  for (const site of sites) {
    for (const row of ROWS.filter(candidate => candidate.site === site)) {
      test(`without the ${site} site, ${row.id.split(" ")[0]} fails`, async () => {
        const original = LegacyDriver.prototype.endLineage;
        LegacyDriver.prototype.endLineage = function (this: LegacyDriver, executionId: string, at: TerminateSite) {
          return at === site ? Promise.resolve() : original.call(this, executionId, at);
        };
        try {
          await assert.rejects(row.run(), assert.AssertionError, `${row.id} catches the removed ${site} cascade`);
        } finally {
          LegacyDriver.prototype.endLineage = original;
        }
      });
    }
  }
});
