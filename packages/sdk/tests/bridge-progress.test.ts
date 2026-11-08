/**
 * K1.4 design 04 R2-01 (review 02 K14-R2-01; design check 04 D04-CHK-01, D04-CHK-02).
 *
 * The Driver owns runnable work after a native commit: whenever its lineage's decision is `continue`, it
 * schedules every READY member itself, with no read (`LegacyDriver.reconcile`). A native `enqueue` that
 * fails after its commit therefore cannot strand settled work (B-ENQUEUE-LOST-*, promoted from review
 * 02's probes), and a sibling that keeps continuing cannot starve a settled member (B-RECONCILE-*,
 * promoted from design check 04's witness). What cannot progress fails explicitly (B-UNSCHEDULABLE), and
 * the report of a failure survives a failed native cleanup (B-FAULT-*, design check 04's two-fault
 * witness). The fault injections choose their store reads by stack frame, as the review's probes do.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { setImmediate as turn } from "node:timers/promises";
import ts from "typescript";
import { createApplication } from "@arrokothi/sdk";
import type { Application, ExecutionId } from "@arrokothi/sdk";
import {
  InMemoryRuntimeStore, createAllowListAuthorizer, createCapabilityCatalog, createCapabilityConfirmationPolicy, createDeferredModelProvider,
  createNoInlineWaitBudget,
} from "@arrokothi/core/reference";
import { LegacyDriver } from "../src/legacy-bridge/driver.ts";
import type { GateDetail, GatePoint } from "../src/legacy-bridge/driver.ts";
import type { LineageScheduler } from "../src/legacy-bridge/lineage-scheduler.ts";
import { answerAgent, deferred, functionWorkflow, models } from "./bridge-fixtures.ts";
import { scriptedRig } from "./bridge-rig.ts";

const REPO = resolve(import.meta.dirname, "../../..");
const TEST_OPS = ["slow", "human"] as const;
const authority = { operations: TEST_OPS.map(operation => ({ capability: "test", operation })) };
const code = (value: unknown): string | undefined => (value as { code?: string } | null)?.code;
const message = (value: unknown): string => (value as { message?: string } | null)?.message ?? "";

/** A store whose `readExecution` throws while `fault` says so; `faults` counts the throws. */
class FaultStore extends InMemoryRuntimeStore {
  fault: ((id: string, stack: string) => boolean) | null = null;
  faults = 0;
  override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]) {
    if (this.fault?.(id, new Error().stack ?? "")) {
      this.faults += 1;
      throw new Error("injected native read failure");
    }
    return super.readExecution(id);
  }
}

/** One failure of the next lookup inside `LineageScheduler.enqueue`, as review 02's probes inject. */
const oneEnqueueLookup = (store: FaultStore) => {
  let left = 1;
  store.fault = (_id, stack) => left > 0 && stack.includes("LineageScheduler.enqueue") && left-- > 0;
};

/** Collects unhandled rejections for the duration of a scenario. */
async function noUnhandled<T>(body: () => Promise<T>): Promise<T> {
  const seen: unknown[] = [];
  const on = (reason: unknown) => { seen.push(reason); };
  process.on("unhandledRejection", on);
  try {
    const result = await body();
    await turn();
    assert.deepEqual(seen, [], "no unhandled rejection");
    return result;
  } finally {
    process.off("unhandledRejection", on);
  }
}

async function waitFor(condition: () => boolean, turns = 300): Promise<boolean> {
  for (let n = 0; n < turns && !condition(); n++) await turn();
  return condition();
}

/** Releases the settlement at the first hit of `at` (D03-CHK-03's named gates), then lets the fault happen. */
type Arm = { readonly point: GatePoint; readonly collect?: number };

async function withArm<T>(at: Arm | undefined, release: () => void, faulted: () => boolean, body: (reached: () => boolean) => Promise<T>): Promise<T> {
  let reached = false;
  const original = LegacyDriver.prototype.gate;
  if (at) {
    LegacyDriver.prototype.gate = function (point: GatePoint, _executionId: string, detail?: GateDetail) {
      if (reached || point !== at.point || (at.collect !== undefined && detail?.collect !== at.collect)) return undefined;
      reached = true;
      release();
      return waitFor(faulted).then(() => undefined);
    };
  }
  try {
    return await body(() => reached);
  } finally {
    LegacyDriver.prototype.gate = original;
  }
}

// -- The two producers of review 02 (K14-R2-01) -------------------------------

/**
 * Capability producer (review 02 probe 4): a Function awaits a slow capability and a human-confirmed one.
 * The slow one settles, commits the Execution READY and loses its enqueue once. Returns whether the gate
 * (if any) was reached; asserts progress to the confirmation, then completion.
 */
async function lostEnqueueCapability(at?: Arm): Promise<{ reached: boolean }> {
  return noUnhandled(async () => {
    const release = deferred();
    const calls: string[] = [];
    let handled = 0;
    const store = new FaultStore();
    const app = createApplication({
      runtime: { store, inlineWait: createNoInlineWaitBudget() },
      capabilities: {
        catalog: createCapabilityCatalog(TEST_OPS.map(operation => ({ capability: "test", operation, consequential: false, description: operation, input: { kind: "object", fields: {} } }))),
        executor: { async execute(request) { calls.push(request.operation); if (request.operation === "slow") await release.promise; return { status: "success", observation: "settled" }; } },
      },
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "test" }] }),
      confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: "test", operations: ["human"] }] }),
      functions: { work: context => {
        handled++;
        return context.observations.length ? { status: "completed", result: null } : { status: "awaitEffects", effects: [
          { key: "slow", capability: "test", operation: "slow", input: {} },
          { key: "human", capability: "test", operation: "human", input: {} },
        ] };
      } },
    });
    const go = () => { oneEnqueueLookup(store); release.resolve(); };
    return withArm(at, go, () => store.faults > 0, async reached => {
      const { executionId } = await app.start({ definition: functionWorkflow("enqueue-fault", "work"), operationAuthority: authority });
      try {
        if (!at) {
          assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 30, pollIntervalMs: 1 })).reason, "timeout");
          go();
        }
        let run = await app.runUntilBlocked(executionId, { timeoutMs: at ? 300 : 2000, pollIntervalMs: 1 });
        if (at && !reached()) return { reached: false };
        if (run.reason === "timeout") run = await app.runUntilBlocked(executionId, { timeoutMs: 2000, pollIntervalMs: 1 });
        assert.equal(store.faults, 1, "the post-commit lookup failed once");
        assert.equal(run.reason, "confirmation_required", "the settled work progressed to the human confirmation");
        assert.deepEqual(run.kernel.recoveryHolds, []);
        const [confirmation] = await app.harness.pendingConfirmations();
        await app.resolveConfirmation(executionId, { confirmationId: confirmation!.confirmationId, decision: "approve" });
        assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 2000 })).reason, "completed");
        assert.deepEqual(calls.sort(), ["human", "slow"], "each capability executed once");
        return { reached: true };
      } finally {
        release.resolve();
        await app.cancel(executionId).catch(() => undefined);
      }
    });
  });
}

/** Model-resumption producer (review 02 probe 5): the settled model call commits READY and loses its enqueue once. */
async function lostEnqueueModel(at?: Arm): Promise<{ reached: boolean }> {
  return noUnhandled(async () => {
    const store = new FaultStore();
    const provider = createDeferredModelProvider("slow");
    const app = createApplication({ models: models(provider), runtime: { store, inlineWait: createNoInlineWaitBudget() } });
    const go = () => { oneEnqueueLookup(store); provider.settle({ text: "Ready" }); };
    return withArm(at, go, () => store.faults > 0, async reached => {
      const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
      try {
        if (!at) {
          assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 30, pollIntervalMs: 1 })).kernel.state, "RUNNING");
          go();
        }
        let run = await app.runUntilBlocked(executionId, { timeoutMs: at ? 300 : 2000, pollIntervalMs: 1 });
        if (at && !reached()) return { reached: false };
        if (run.reason === "timeout") run = await app.runUntilBlocked(executionId, { timeoutMs: 2000, pollIntervalMs: 1 });
        assert.equal(store.faults, 1, "the post-commit lookup failed once");
        assert.equal(run.reason, "completed", "the settled resumption progressed");
        assert.deepEqual(run.kernel.recoveryHolds, []);
        assert.equal(provider.invocationCount, 1, "one model call");
        assert.deepEqual((await app.harness.controllerResumptionsOf(executionId as ExecutionId)).map(r => r.state), ["settled"]);
        return { reached: true };
      } finally {
        await app.cancel(executionId).catch(() => undefined);
      }
    });
  });
}

describe("B-ENQUEUE-LOST (review 02 K14-R2-01): a failed post-commit enqueue cannot strand settled work", () => {
  test("B-ENQUEUE-LOST-CAP: capability settlement, then the human confirmation, then completion", () => lostEnqueueCapability().then(() => undefined));
  test("B-ENQUEUE-LOST-MODEL: model resumption settlement, then completion", () => lostEnqueueModel().then(() => undefined));
});

const POINTS: readonly Arm[] = [
  { point: "register.before" }, { point: "register.after" }, { point: "read.before", collect: 1 }, { point: "read.after", collect: 1 },
  { point: "read.before", collect: 2 }, { point: "read.after", collect: 2 }, { point: "validated" }, { point: "park" },
];
const label = (at: Arm) => `${at.point}${at.collect ? `@${at.collect}` : ""}`;

describe("B-ENQUEUE-LOST-SCHEDULES (design 04 §2.9): the settlement and its lost enqueue at each named gate", () => {
  const record: Record<string, Record<string, "reached" | "unreachable">> = { capability: {}, model: {} };
  for (const at of POINTS) {
    test(`capability, released at ${label(at)}`, async () => {
      record.capability![label(at)] = (await lostEnqueueCapability(at)).reached ? "reached" : "unreachable";
    });
    test(`model, released at ${label(at)}`, async () => {
      record.model![label(at)] = (await lostEnqueueModel(at)).reached ? "reached" : "unreachable";
    });
  }
  test("the per-schedule record: reached schedules progressed; the rest are unreachable, never credited", () => {
    // Neither producer's lineage has a human pause while its settlement is in flight, so the lineage is
    // `open`: no second collect and no validation happen before the settlement.
    const expected = Object.fromEntries(POINTS.map(at => [label(at), at.collect === 2 || at.point === "validated" ? "unreachable" : "reached"]));
    assert.deepEqual(record, { capability: expected, model: expected });
  });
});

// -- A sibling that keeps continuing (design check 04 D04-CHK-01) -------------

type Rig = Awaited<ReturnType<typeof scriptedRig>>;
const tick = async (rig: Rig) => { rig.host.pump(); rig.host.dispatchReady(); await rig.host.idle(2); };
const childrenOf = async (rig: Rig) => (await rig.driver.harness.childExecutionLinksOf(rig.executionId as ExecutionId)).map(link => link.childExecutionId);
const endRig = async (rig: Rig) => {
  rig.host.coordinator.cancelExecution(rig.host.caller, rig.executionId);
  await rig.driver.cancellationSettled(rig.executionId);
  await rig.driver.cascade(rig.executionId);
};

/**
 * A root that spawns `count` children and then continues 100 times. Each child awaits one slow capability.
 * Every child's post-commit enqueue fails once. Asserts each child steps within 20 exchanges while the
 * root keeps continuing, completes, and executed its capability once.
 */
async function settledChildren(count: number): Promise<void> {
  await noUnhandled(async () => {
    const release = deferred();
    let calls = 0;
    const rig = await scriptedRig({
      root: [
        ...Array.from({ length: count }, () => ({ do: "spawn" as const, definitionId: "child", definitionVersion: 1, await: false, requestedOperations: [{ capability: "test", operation: "slow" }] })),
        ...Array.from({ length: 100 }, () => ({ do: "continue" as const })),
        { do: "await", eventKinds: ["external.input"] },
      ],
      child: [{ do: "use_capability", capability: "test", operation: "slow" }, { do: "complete" }],
    }, { async execute() { calls++; await release.promise; return { status: "success", observation: "ok" }; } });
    try {
      for (let i = 0; i < 20 * count && calls < count; i++) await tick(rig);
      assert.equal(calls, count, "every child dispatched its capability");
      const children = await childrenOf(rig);
      assert.equal(children.length, count);
      const store = rig.store as InMemoryRuntimeStore;
      const read = store.readExecution.bind(store);
      const lost = new Set<string>();
      store.readExecution = async id => {
        if (children.includes(id) && !lost.has(id) && new Error().stack!.includes("LineageScheduler.enqueue")) { lost.add(id); throw new Error("lost child enqueue"); }
        return read(id);
      };
      release.resolve();
      assert.ok(await waitFor(() => lost.size === count), "every child's settlement lost its enqueue once");
      const steps = new Map<string, number>();
      const off = rig.driver.onStep(record => steps.set(record.executionId, (steps.get(record.executionId) ?? 0) + 1));
      for (let i = 0; i < 20 && children.some(child => !steps.get(child)); i++) await tick(rig);
      off();
      for (const child of children) assert.ok((steps.get(child) ?? 0) > 0, `settled child ${child} stepped while its sibling continued`);
      assert.ok((steps.get(rig.executionId) ?? 0) > 0, "the root kept continuing meanwhile");
      for (const child of children) assert.equal((await read(child as ExecutionId))?.lifecycle, "COMPLETED");
      assert.equal(calls, count, "no capability executed twice");
      assert.deepEqual(rig.host.inspect(rig.executionId).recoveryHolds, []);
    } finally {
      release.resolve();
      await endRig(rig);
    }
  });
}

describe("B-RECONCILE (design check 04 D04-CHK-01): reconciliation on every continue", () => {
  test("B-RECONCILE-STARVE: a settled child runs while its parent keeps continuing (check 04 witness)", () => settledChildren(1));
  test("B-RECONCILE-MANY: two settled children, both enqueues lost, both run once", () => settledChildren(2));

  test("B-RECONCILE-REVISION and B-ENQUEUE-LATE: a late duplicate claim is dropped; a later READY revision is not unschedulable", async () => {
    await noUnhandled(async () => {
      const releases = [deferred(), deferred()];
      let calls = 0;
      const rig = await scriptedRig({ root: [
        { do: "use_capability", capability: "test", operation: "slow" },
        { do: "use_capability", capability: "test", operation: "slow" },
        { do: "await", eventKinds: ["external.input"] },
      ] }, { async execute() { const mine = releases[calls++]!; await mine.promise; return { status: "success", observation: "ok" }; } });
      const root = rig.executionId;
      const activations: string[] = [];
      const off = rig.driver.onStep(record => activations.push(record.executionId));
      const scheduler = rig.driver.scheduler;
      const enqueue = scheduler.enqueue.bind(scheduler);
      const late = deferred();
      let delayed = 0;
      try {
        for (let i = 0; i < 20 && calls < 1; i++) await tick(rig);
        assert.equal(calls, 1);
        // The first settlement's own enqueue arrives only after the Driver scheduled and stepped the root.
        scheduler.enqueue = async id => { if (id === root && delayed === 0) { delayed++; await late.promise; } return enqueue(id); };
        releases[0]!.resolve();
        for (let i = 0; i < 40 && calls < 2; i++) await tick(rig);
        assert.equal(calls, 2, "the Driver stepped the root before its producer's enqueue arrived");
        const claimsBefore = scheduler.claimsOf(root);
        late.resolve();
        for (let i = 0; i < 10 && scheduler.claimsOf(root) === claimsBefore; i++) await tick(rig);
        assert.equal(scheduler.claimsOf(root), claimsBefore + 1, "the late duplicate was claimed once");
        assert.equal(activations.filter(id => id === root).length, 2, "and dropped: it ran no Activation");
        // The second settlement commits READY at a later revision and loses its enqueue.
        scheduler.enqueue = enqueue;
        const store = rig.store as InMemoryRuntimeStore;
        const read = store.readExecution.bind(store);
        let lost = 0;
        store.readExecution = async id => {
          if (id === root && lost === 0 && new Error().stack!.includes("LineageScheduler.enqueue")) { lost++; throw new Error("lost enqueue"); }
          return read(id);
        };
        releases[1]!.resolve();
        assert.equal(await rig.drive(2000), "WAITING", "the later revision ran; the detector did not fire");
        assert.equal(lost, 1);
        assert.equal(activations.filter(id => id === root).length, 3);
        assert.equal(calls, 2);
        assert.deepEqual(rig.host.inspect(root).recoveryHolds, []);
      } finally {
        off();
        late.resolve();
        for (const release of releases) release.resolve();
        await endRig(rig);
      }
    });
  });
});

// -- Explicit failure, and a report that survives cleanup failure (D04-CHK-02) --

const isTerminal = (lifecycle: string | undefined) => ["COMPLETED", "FAILED", "CANCELLED"].includes(lifecycle ?? "");

/**
 * A model Execution parked on its in-flight model call. `arm` installs faults on `store` once the first
 * exchange has parked; `settle` decides whether the model call then settles.
 */
async function modelScenario(arm: (store: FaultStore, root: string) => void, settle: boolean, check: (app: Application, executionId: ExecutionId, store: FaultStore) => Promise<void>, store: FaultStore = new FaultStore()) {
  await noUnhandled(async () => {
    const provider = createDeferredModelProvider("slow");
    const app = createApplication({ models: models(provider), runtime: { store, inlineWait: createNoInlineWaitBudget() } });
    const { executionId } = await app.start({ definition: answerAgent(), input: { label: "user", payload: "q" } });
    try {
      assert.equal((await app.runUntilBlocked(executionId, { timeoutMs: 30, pollIntervalMs: 1 })).kernel.state, "RUNNING");
      arm(store, executionId);
      // Without a settlement, a lineage signal (what any commit sends) wakes the parked exchange.
      if (settle) provider.settle({ text: "Ready" });
      else (app.services.scheduler as LineageScheduler).signal(executionId);
      await check(app, executionId, store);
      assert.equal(provider.invocationCount, 1, "no second model call");
      assert.deepEqual(await app.runUntilIdle(), [], "no later native step");
    } finally {
      store.fault = null;
      if (!settle) provider.settle({ text: "late" });
      await app.cancel(executionId).catch(() => undefined);
    }
  });
}

async function settledRun(app: Application, executionId: ExecutionId) {
  let run = await app.runUntilBlocked(executionId, { timeoutMs: 50, pollIntervalMs: 1 });
  for (let round = 0; round < 40 && run.kernel.recoveryHolds.length === 0 && !isTerminal(run.kernel.state); round++) {
    run = await app.runUntilBlocked(executionId, { timeoutMs: 10, pollIntervalMs: 1 });
  }
  return run;
}

async function assertFailedNative(app: Application, executionId: ExecutionId, pattern: RegExp) {
  const run = await settledRun(app, executionId);
  assert.equal(run.kernel.state, "FAILED");
  assert.equal(code(run.kernel.result?.value), "arrokothi.bridge.native_error");
  assert.match(message(run.kernel.result?.value), pattern);
  assert.ok(isTerminal(run.execution.lifecycle), `the native lineage ended (${run.execution.lifecycle})`);
}

async function assertHeldUnconfirmed(app: Application, executionId: ExecutionId, store: FaultStore, faults: number, ending: RegExp) {
  const run = await settledRun(app, executionId);
  assert.equal(run.kernel.recoveryHolds[0]?.cause, "protocol_failure", "an explicit Kernel hold, not a silent RUNNING");
  assert.match(run.kernel.recoveryHolds[0]?.reason ?? "", /native cleanup at exception failed.*stopped but not confirmed ended/);
  assert.match(run.kernel.recoveryHolds[0]?.reason ?? "", ending, "the hold names the failure that started the cleanup");
  assert.ok(!isTerminal(run.kernel.state), "held, not reported as a clean terminal Outcome");
  assert.equal(run.kernel.result, null);
  assert.deepEqual(run.kernel.acknowledged, [], "nothing acknowledged");
  assert.ok(store.faults >= faults, `the injected faults happened (${store.faults})`);
}

/** Shows READY to the Driver's collects while the store holds the root WAITING: a broken atomic visibility. */
const phantomReady = (store: FaultStore, root: string) => {
  const read = InMemoryRuntimeStore.prototype.readExecution;
  store.readExecution = async function (this: FaultStore, id) {
    const stack = new Error().stack ?? "";
    if (this.fault?.(id, stack)) { this.faults += 1; throw new Error("injected native read failure"); }
    const context = await read.call(this, id);
    if (id === root && context?.lifecycle === "WAITING" && stack.includes("LegacyDriver.collect")) return { ...context, lifecycle: "READY" as const };
    return context;
  };
};

describe("B-FAULT and B-UNSCHEDULABLE (design check 04 D04-CHK-02, design 04 §2.8)", () => {
  test("B-FAULT-COLLECT: one collect-inspector failure fails E native_error and the cascade runs", () =>
    modelScenario((store, root) => {
      let left = 1;
      store.fault = (id, stack) => id === root && left > 0 && stack.includes("LegacyDriver.collect") && left-- > 0;
    }, true, (app, id) => assertFailedNative(app, id, /injected native read failure/)));

  test("B-FAULT-ACTIVATE: one activation-setup failure fails E native_error and the cascade runs", async () => {
    class ActivateFault extends FaultStore {
      activateFaults = 0;
      override transact<T>(...args: Parameters<InMemoryRuntimeStore["transact"]>): Promise<T> {
        if (this.activateFaults > 0 && new Error().stack!.includes("Harness.activate")) { this.activateFaults--; this.faults++; throw new Error("injected activation failure"); }
        return super.transact(...args) as Promise<T>;
      }
    }
    const store = new ActivateFault();
    await modelScenario(() => { store.activateFaults = 1; }, true, async (app, id) => {
      await assertFailedNative(app, id, /injected activation failure/);
      assert.equal(store.faults, 1);
    }, store);
  });

  test("B-FAULT-CLEANUP: a collect failure and then a cleanup failure end in an explicit hold (check 04 two-fault witness)", () =>
    modelScenario(store => {
      store.fault = (_id, stack) => stack.includes("LegacyDriver.collect") || stack.includes("LegacyDriver.cascade");
    }, true, (app, id, store) => assertHeldUnconfirmed(app, id, store, 2, /it was ending with .*native_error.*injected native read failure/)));

  test("B-UNSCHEDULABLE: READY to the collect, not to the claim, at one revision: an explicit Driver failure", async () => {
    const store = new FaultStore();
    let claims = 0;
    await modelScenario(phantomReady, false, async (app, id) => {
      await assertFailedNative(app, id, /UnschedulableReadyError: native member .* stays READY at revision \d+ after a claim that ran no Activation/);
      claims = (app.services.scheduler as LineageScheduler).claimsOf(id);
    }, store);
    assert.ok(claims <= 3, `bounded: ${claims} claims, no spin`);
  });

  test("B-UNSCHEDULABLE-CLEANUP: the detector, then a cleanup failure: an explicit hold", () =>
    modelScenario((store, root) => {
      phantomReady(store, root);
      store.fault = (_id, stack) => stack.includes("LegacyDriver.cascade");
    }, false, (app, id, store) => assertHeldUnconfirmed(app, id, store, 1, /it was ending with .*UnschedulableReadyError/)));
});

// -- Ablation: the fix is what makes these pass (design 04 §2.9) -------------

test("B-RECONCILE-ABLATION: without reconciliation, both lost-enqueue producers and the starved child fail", async () => {
  const original = LegacyDriver.prototype.reconcile;
  LegacyDriver.prototype.reconcile = () => undefined;
  try {
    await assert.rejects(lostEnqueueCapability(), assert.AssertionError, "capability producer");
    await assert.rejects(lostEnqueueModel(), assert.AssertionError, "model producer");
    await assert.rejects(settledChildren(1), assert.AssertionError, "starved child");
  } finally {
    LegacyDriver.prototype.reconcile = original;
  }
});

test("B-REPORT-ABLATION: without the cleanup-failure report, the two-fault witness is silent again", async () => {
  const proto = LegacyDriver.prototype as unknown as { report(this: unknown, activation: unknown, diagnostic: string): void };
  const original = proto.report;
  proto.report = () => undefined;
  try {
    await assert.rejects(modelScenario(store => {
      store.fault = (_id, stack) => stack.includes("LegacyDriver.collect") || stack.includes("LegacyDriver.cascade");
    }, true, (app, id, store) => assertHeldUnconfirmed(app, id, store, 2, /it was ending with/)), assert.AssertionError);
  } finally {
    proto.report = original;
  }
});

test("B-UNSCHEDULABLE-ABLATION: without the detector, the phantom READY spins until a guard stops it", async () => {
  const proto = LegacyDriver.prototype as unknown as {
    reconcile(this: { scheduler: { schedule(member: string, lineage: string): void } }, executionId: string, records: { members: Map<string, { context: { lifecycle: string } }> }): void;
  };
  const original = proto.reconcile;
  proto.reconcile = function (executionId, records) {
    for (const [member, record] of records.members) if (record.context.lifecycle === "READY") this.scheduler.schedule(member, executionId);
  };
  try {
    await assert.rejects(modelScenario((store, root) => {
      phantomReady(store, root);
      let collects = 0;
      // The spin guard: after 40 collect reads the store fails, which the exchange reports as a plain native error.
      store.fault = (_id, stack) => stack.includes("LegacyDriver.collect") && ++collects > 40;
    }, false, (app, id) => assertFailedNative(app, id, /UnschedulableReadyError/)), assert.AssertionError);
  } finally {
    proto.reconcile = original;
  }
});

// -- The native producers, derived from the source (design 04 §6 D04-CHK-03) --

type Producer = { readonly file: string; readonly method: string; readonly kind: "delegate" | "producer"; readonly tracked: boolean };

/** Every `scheduler.enqueue(` and `deps.wake(` call in the native runtime, with its enclosing method. */
async function producerCensus(): Promise<Producer[]> {
  const dir = resolve(REPO, "packages/core/src/runtime");
  const out: Producer[] = [];
  for (const file of (await readdir(dir)).filter(name => name.endsWith(".ts")).sort()) {
    const source = ts.createSourceFile(file, await readFile(resolve(dir, file), "utf8"), ts.ScriptTarget.Latest, true);
    // Methods a swallowing tracker calls: `track(...)` bodies that end in `.catch(() => undefined)`.
    const tracked = new Set<string>();
    const visitTrack = (node: ts.Node) => {
      if (ts.isMethodDeclaration(node) && node.name.getText(source) === "track" && /\.catch\(\(\) => undefined\)/.test(node.getText(source))) {
        const calls = (inner: ts.Node): void => {
          if (ts.isCallExpression(inner) && ts.isPropertyAccessExpression(inner.expression) && inner.expression.expression.kind === ts.SyntaxKind.ThisKeyword) tracked.add(inner.expression.name.text);
          ts.forEachChild(inner, calls);
        };
        calls(node);
      }
      ts.forEachChild(node, visitTrack);
    };
    visitTrack(source);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression.getText(source);
        if (/(?:^|\.)scheduler\.enqueue$/.test(callee) || /(?:^|\.)deps\.wake$/.test(callee)) {
          let method = "?";
          let delegate = false;
          for (let up: ts.Node | undefined = node.parent; up; up = up.parent) {
            if ((ts.isArrowFunction(up) || ts.isFunctionExpression(up)) && ts.isPropertyAssignment(up.parent) && up.parent.name.getText(source) === "wake") delegate = true;
            if (ts.isMethodDeclaration(up) || ts.isConstructorDeclaration(up)) { method = ts.isConstructorDeclaration(up) ? "constructor" : up.name.getText(source); break; }
          }
          out.push({ file, method, kind: delegate ? "delegate" : "producer", tracked: tracked.has(method) });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return out;
}

/**
 * Each native producer of runnable work and the owner of its scheduling error. A tracker-reached
 * producer swallows the error; `reconcile` restores its work, proven by the named test. Every other
 * producer's error reaches a caller whose accepted route applies.
 */
const PRODUCERS: readonly (Producer & { readonly owner: string })[] = [
  { file: "effect-processor.ts", method: "submitUserInput", kind: "producer", tracked: false, owner: "caller: Harness.submitUserInput, which the bridge never calls (the deprecated view refuses it)" },
  { file: "effect-processor.ts", method: "declineConfirmation", kind: "producer", tracked: false, owner: "caller: resolveConfirmation, from the Driver's forward (owner choice 04, `unknown`)" },
  { file: "effect-processor.ts", method: "wakeRequesterIfReady", kind: "producer", tracked: false, owner: "caller: approveConfirmation, from the Driver's forward" },
  { file: "effect-processor.ts", method: "denyApprovedConfirmation", kind: "producer", tracked: false, owner: "caller: approveConfirmation, from the Driver's forward" },
  { file: "effect-processor.ts", method: "dispatchSpawn", kind: "producer", tracked: false, owner: "caller: processOne in a native step (exception site), or approveConfirmation from the Driver's forward" },
  { file: "effect-processor.ts", method: "dispatchSendMessage", kind: "producer", tracked: false, owner: "caller: processOne in a native step (exception site), or approveConfirmation from the Driver's forward" },
  { file: "effect-processor.ts", method: "dispatchWriteMemory", kind: "producer", tracked: false, owner: "caller: processOne in a native step (exception site), or approveConfirmation from the Driver's forward" },
  { file: "effect-processor.ts", method: "settle", kind: "producer", tracked: true, owner: "tracker swallows; reconcile restores (B-ENQUEUE-LOST-CAP)" },
  { file: "harness.ts", method: "constructor", kind: "delegate", tracked: false, owner: "delegate edge: the resumption processor's wake" },
  { file: "harness.ts", method: "constructor", kind: "delegate", tracked: false, owner: "delegate edge: the effect processor's wake" },
  { file: "harness.ts", method: "createExecution", kind: "producer", tracked: false, owner: "caller: the Driver's createRoot, or a native step's spawn" },
  { file: "harness.ts", method: "deliverEnvelope", kind: "producer", tracked: false, owner: "caller: deliverExternalInput, from the Driver's forward (owner choice 04, `unknown`)" },
  { file: "harness.ts", method: "settleOwnerOnChildTerminal", kind: "producer", tracked: false, owner: "caller: a native step, or the Driver's cascade" },
  { file: "resumption-processor.ts", method: "settle", kind: "producer", tracked: true, owner: "tracker swallows; reconcile restores (B-ENQUEUE-LOST-MODEL)" },
];

test("B-PRODUCER-CENSUS: the native producers of runnable work, derived from the source, each with its error owner", async () => {
  const derived = await producerCensus();
  assert.deepEqual(derived, PRODUCERS.map(({ owner: _owner, ...producer }) => producer), "a new or moved native producer needs its error owner classified");
  const tracked = PRODUCERS.filter(producer => producer.tracked);
  assert.equal(tracked.length, 2, "the two swallowing producers are the two review 02 reproduces");
  for (const producer of tracked) assert.match(producer.owner, /B-ENQUEUE-LOST-(?:CAP|MODEL)/);
});
