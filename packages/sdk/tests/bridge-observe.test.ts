/**
 * K1.4 design 03 R1-01 and R1-04 (review 01 K14-R1-01, K14-R1-04; design check 03 D03-CHK-01, -03).
 *
 * Real native schedules: the validated observation under real settlements, gated at the Driver's named
 * points (B-OBSERVE-*), the commit signal (B-COMMIT-SIGNAL, B-NOTIFY-NOWAKE) and the controller hook's
 * services (B-HOOK-SERVICES). The record-model product of the classifier is B-QUIESCE-CELLS in
 * `bridge-classify.test.ts`; it forges records and is labelled apart from these.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { setImmediate as turn } from "node:timers/promises";
import { createApplication, defineAgent, defineWorkflow } from "@arrokothi/sdk";
import type { Application, ExecutionId } from "@arrokothi/sdk";
import type { CapabilityExecutor, RuntimeTransaction } from "@arrokothi/core/ports";
import {
  InMemoryRuntimeStore, ScriptedModelProvider, createAllowListAuthorizer, createCapabilityCatalog,
  createCapabilityConfirmationPolicy, createDeferredModelProvider, createNoInlineWaitBudget,
} from "@arrokothi/core/reference";
import { classifyLineage } from "../src/legacy-bridge/classify.ts";
import { INPUT_KINDS } from "../src/legacy-bridge/codec.ts";
import { CommitSignallingStore } from "../src/legacy-bridge/commit-signal-store.ts";
import { LegacyDriver } from "../src/legacy-bridge/driver.ts";
import type { GateDetail, GatePoint } from "../src/legacy-bridge/driver.ts";
import { LineageScheduler } from "../src/legacy-bridge/lineage-scheduler.ts";
import { deferred, models } from "./bridge-fixtures.ts";
import { scriptedRig } from "./bridge-rig.ts";

const REPO = resolve(import.meta.dirname, "../../..");

// -- Shared fixture pieces --------------------------------------------------

const TEST_OPS = ["slow", "human"] as const;
const testCatalog = () => createCapabilityCatalog(TEST_OPS.map(operation => ({
  capability: "test", operation, consequential: false, description: operation, input: { kind: "object", fields: {} },
})));
const authority = { operations: TEST_OPS.map(operation => ({ capability: "test", operation })) };
const allowTest = () => createAllowListAuthorizer({ grants: [{ capability: "test" }], spawn: { definitions: ["chat", "deep"] } });
const confirmHuman = createCapabilityConfirmationPolicy({ rules: [{ capability: "test", operations: ["human"] }] });
const fork = (id: string, branches: readonly { readonly id: string; readonly stage: string }[]) => ({ id, branches, join: { next: "d" } });
const toJoin = { kind: "always", next: { to: "join", fork: "p" } } as const;
const done = () => ({ status: "completed" as const, result: null });

type Hook = (driver: LegacyDriver, point: GatePoint, executionId: string, detail?: GateDetail) => Promise<void> | undefined;

/** Runs `body` with the Driver's named gates answered by `hook` (design 03 addendum, D03-CHK-03). */
async function withGate<T>(hook: Hook, body: () => Promise<T>): Promise<T> {
  const original = LegacyDriver.prototype.gate;
  LegacyDriver.prototype.gate = function (this: LegacyDriver, point: GatePoint, executionId: string, detail?: GateDetail) {
    return hook(this, point, executionId, detail);
  };
  try {
    return await body();
  } finally {
    LegacyDriver.prototype.gate = original;
  }
}

/** Every live native member of E's lineage, with what makes it runnable or in flight. */
async function nativeState(app: Application, executionId: string) {
  const ids = [executionId];
  const out: { id: string; lifecycle: string; inFlight: boolean; resuming: boolean }[] = [];
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index]! as ExecutionId;
    const context = await app.harness.inspect(id);
    if (!context) continue;
    for (const link of await app.harness.childExecutionLinksOf(id)) ids.push(link.childExecutionId);
    const operations = await app.harness.pendingOperationsOf(id);
    const resumptions = await app.harness.controllerResumptionsOf(id);
    out.push({
      id, lifecycle: context.lifecycle,
      // A pending call (spawn_execution) is a live child, not in-flight work; the child is checked itself.
      inFlight: operations.some(operation => operation.status === "pending" && operation.dispatch === "dispatched" &&
        (operation.effectKind === "use_capability" || operation.effectKind === "write_memory")),
      resuming: resumptions.some(resumption => resumption.state === "pending"),
    });
  }
  return out;
}

/** A Kernel `WAITING` with runnable or in-flight native work is a stranded wait (R1-01). */
async function assertNotStranded(app: Application, executionId: string, where: string): Promise<void> {
  if (app.inspect(executionId).state !== "WAITING") return;
  for (const member of await nativeState(app, executionId)) {
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(member.lifecycle)) continue;
    assert.ok(member.lifecycle !== "READY" && !member.inFlight && !member.resuming,
      `${where}: Kernel WAITING strands ${member.id} (${JSON.stringify(member)})`);
  }
}

// -- The review's probe (K14-R1-01), maintained -----------------------------

/**
 * The review's snapshot probe. The supported async store port delays the Driver's operation read,
 * selected by stack frame (the Driver's read is now `LegacyDriver.collect`), until the real executor
 * settled. No record is forged.
 */
async function snapshotProbe(): Promise<{ observed: boolean; kernel: string; native: string }> {
  const release = deferred();
  let armed = false;
  let observed = false;
  class RaceStore extends InMemoryRuntimeStore {
    override async listPendingOperations(id: Parameters<InMemoryRuntimeStore["listPendingOperations"]>[0]) {
      if (armed && new Error().stack!.includes("LegacyDriver.collect")) {
        armed = false;
        assert.equal((await super.readExecution(id))?.lifecycle, "WAITING");
        release.resolve();
        for (let n = 0; n < 200; n++) {
          if ((await super.readExecution(id))?.lifecycle === "READY") { observed = true; break; }
          await turn();
        }
      }
      return super.listPendingOperations(id);
    }
  }
  const executor: CapabilityExecutor = { async execute() { armed = true; await release.promise; return { status: "success", observation: "done" }; } };
  const app = createApplication({
    runtime: { store: new RaceStore(), inlineWait: createNoInlineWaitBudget() },
    capabilities: { catalog: testCatalog(), executor }, authorizer: allowTest(), confirmationPolicy: confirmHuman,
    functions: { work: context => context.observations.length ? done() : {
      status: "awaitEffects", effects: [
        { key: "slow", capability: "test", operation: "slow", input: {} },
        { key: "human", capability: "test", operation: "human", input: {} },
      ],
    } },
  });
  const { executionId } = await app.start({ definition: functionWorkflowOf("snapshot", "work"), operationAuthority: authority });
  try {
    await app.runUntilBlocked(executionId, { timeoutMs: 1000, pollIntervalMs: 1 });
    const again = await app.runUntilBlocked(executionId, { timeoutMs: 1000, pollIntervalMs: 1 });
    await assertNotStranded(app, executionId, "after a second host run");
    return { observed, kernel: again.kernel.state, native: again.execution.lifecycle };
  } finally {
    release.resolve();
    await app.cancel(executionId).catch(() => undefined);
  }
}

const functionWorkflowOf = (id: string, ref: string) => defineWorkflow({ id, spec: { entryStage: "work", stages: [
  { id: "work", kind: "function", implementationRef: ref, transitions: { kind: "always", next: { to: "complete" } } },
] } });

test("B-OBSERVE-PROBE (review 01 K14-R1-01): settling native work between lineage reads never commits a stranded human wait", async () => {
  const result = await snapshotProbe();
  assert.ok(result.observed, "the intended interleaving ran");
  assert.ok(!(result.kernel === "WAITING" && result.native === "READY"), "Kernel WAITING strands READY native work");
});

// -- Real native schedules F1-F4 (D03-CHK-03) --------------------------------

interface Fixture {
  readonly name: string;
  readonly app: Application;
  start(): Promise<string>;
  /** Whether the held settlement S is in flight natively (only then can a gate release it). */
  inFlight(): boolean;
  release(): void;
  /** Whether S became visible in the native store. */
  settled(executionId: string): Promise<boolean>;
}

/** F1: one member with a dispatched capability and a confirmation-gated operation (the probe's shape). */
function f1(): Fixture {
  const release = deferred();
  let entered = false;
  const executor: CapabilityExecutor = { async execute(request) {
    if (request.operation === "slow") { entered = true; await release.promise; }
    return { status: "success", observation: "ok" };
  } };
  const app = createApplication({
    runtime: { inlineWait: createNoInlineWaitBudget() }, capabilities: { catalog: testCatalog(), executor },
    authorizer: allowTest(), confirmationPolicy: confirmHuman,
    functions: { work: context => context.observations.length ? done() : { status: "awaitEffects", effects: [
      { key: "slow", capability: "test", operation: "slow", input: {} },
      { key: "human", capability: "test", operation: "human", input: {} },
    ] } },
  });
  return {
    name: "F1", app,
    start: async () => (await app.start({ definition: functionWorkflowOf("f1", "work"), operationAuthority: authority })).executionId,
    inFlight: () => entered, release: () => release.resolve(),
    settled: async id => (await app.harness.pendingOperationsOf(id as ExecutionId)).some(operation => operation.status !== "pending"),
  };
}

/** F2: a fork whose capability branch is in flight while its called `chat` child waits for input. */
function f2(): Fixture {
  const release = deferred();
  let entered = false;
  const executor: CapabilityExecutor = { async execute() { entered = true; await release.promise; return { status: "success", observation: "ok" }; } };
  const app = createApplication({
    runtime: { inlineWait: createNoInlineWaitBudget() }, capabilities: { catalog: testCatalog(), executor },
    authorizer: allowTest(), models: models(new ScriptedModelProvider({ id: "s", steps: [{ output: { text: "Two" } }] })),
    functions: { a: done, d: done, slowfn: context => context.observations.length ? done() : { status: "awaitEffects", effects: [
      { key: "slow", capability: "test", operation: "slow", input: {} },
    ] } },
  });
  const workflow = defineWorkflow({ id: "f2", spec: { entryStage: "a", forks: [fork("p", [{ id: "slow", stage: "slow" }, { id: "chat", stage: "chat" }])], stages: [
    { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
    { id: "slow", kind: "function", implementationRef: "slowfn", transitions: toJoin },
    { id: "chat", kind: "agent", child: { definitionId: "chat", definitionVersion: 1 }, transitions: toJoin },
    { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
  ] } });
  return {
    name: "F2", app,
    start: async () => {
      await app.register(defineAgent({ id: "chat", spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Chat", completion: "respond_and_wait" } }));
      return (await app.start({ definition: workflow, operationAuthority: authority, structuralSpawnBudget: 1 })).executionId;
    },
    inFlight: () => entered, release: () => release.resolve(),
    settled: async id => (await app.harness.pendingOperationsOf(id as ExecutionId)).some(operation => operation.effectKind === "use_capability" && operation.status !== "pending"),
  };
}

/** F3 and F4: a deferred model call (a called child's, or the root's own LLM stage) beside a confirmation branch. */
function deferredModelFixture(name: "F3" | "F4"): Fixture {
  const provider = createDeferredModelProvider("slow");
  const executor: CapabilityExecutor = { async execute() { return { status: "success", observation: "ok" }; } };
  const app = createApplication({
    runtime: { inlineWait: createNoInlineWaitBudget() }, capabilities: { catalog: testCatalog(), executor },
    authorizer: allowTest(), confirmationPolicy: confirmHuman, models: models(provider),
    functions: { a: () => ({ status: "completed" as const, result: "q" }), d: done, humanfn: context => context.observations.length ? done() : { status: "awaitEffects", effects: [
      { key: "human", capability: "test", operation: "human", input: {} },
    ] } },
  });
  const slow = name === "F3"
    ? { id: "slow", kind: "agent" as const, child: { definitionId: "deep", definitionVersion: 1 }, transitions: toJoin }
    : { id: "slow", kind: "llm" as const, model: { logicalRef: "primary", requirements: { text: true } }, system: "Think", prompt: "{{input}}", transitions: toJoin };
  const workflow = defineWorkflow({ id: name.toLowerCase(), spec: { entryStage: "a", forks: [fork("p", [{ id: "slow", stage: "slow" }, { id: "human", stage: "human" }])], stages: [
    { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
    slow,
    { id: "human", kind: "function", implementationRef: "humanfn", transitions: toJoin },
    { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
  ] } } as never);
  /** The resumption S lives on: the child for F3, the root for F4. */
  const holder = async (id: string): Promise<string | undefined> => name === "F4" ? id : (await app.harness.childExecutionLinksOf(id as ExecutionId))[0]?.childExecutionId;
  return {
    name, app,
    start: async () => {
      if (name === "F3") await app.register(defineAgent({ id: "deep", terminalResult: { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } }, spec: { model: { logicalRef: "primary", requirements: { text: true } }, instructions: "Answer", completion: "complete_on_response" } }));
      return (await app.start({ definition: workflow, operationAuthority: authority, structuralSpawnBudget: 1, input: { label: "user", payload: "q" } })).executionId;
    },
    inFlight: () => provider.outstanding.length > 0,
    release: () => { if (provider.outstanding.length > 0) provider.settle({ text: "Done" }); },
    settled: async id => {
      const target = await holder(id);
      return target !== undefined && (await app.harness.controllerResumptionsOf(target as ExecutionId)).some(resumption => resumption.state !== "pending");
    },
  };
}

const FIXTURES: Record<string, () => Fixture> = { F1: f1, F2: f2, F3: () => deferredModelFixture("F3"), F4: () => deferredModelFixture("F4") };

interface Target { readonly point: GatePoint; readonly collect?: number; readonly ordinal?: number }
interface ScheduleRecord {
  readonly fixture: string;
  readonly target: string;
  readonly result: "reached" | "unreachable";
  readonly reason?: string;
  readonly end: string;
  /** Second collects started after the release, and validations that followed one. */
  readonly secondCollects: number;
  readonly validations: number;
}
const label = (target: Target): string => [target.point, target.collect, target.ordinal].filter(part => part !== undefined).join(":");

/**
 * Fixtures that submit a non-await Outcome while S is held, so their submission gates are reachable then:
 * F2's fork spawns its `chat` child READY, and the child's step runs in the next exchange after a `continue`.
 */
const SUBMITS_WHILE_HELD = new Set(["F2"]);

/** The ordering reason a target cannot be reached while S is held, or `undefined` when it can. */
function unreachableReason(fixture: string, target: Target): string | undefined {
  if (target.point === "validated" || (target.collect ?? 1) > 1) {
    return "a second collect and validation follow only an await classification; with S held, every first collect sees S in flight, so the lineage is open";
  }
  if ((target.point === "submit.before" || target.point === "submit.after") && !SUBMITS_WHILE_HELD.has(fixture)) {
    return "with S held, this fixture's exchange stays open (parked) and submits no Outcome until S settles";
  }
  return undefined;
}

/** Runs host slices until S is in flight natively (bounded by progress, not by a fixed time). */
async function untilInFlight(fixture: Fixture, executionId: string): Promise<void> {
  for (let runs = 0; runs < 400 && !fixture.inFlight(); runs++) {
    await fixture.app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 5, pollIntervalMs: 1 });
  }
  assert.ok(fixture.inFlight(), `${fixture.name}: S never went in flight`);
}

/** Runs one fixture unscheduled; returns its end reason and the largest read ordinal of a first collect. */
async function baseline(make: () => Fixture): Promise<{ end: string; ordinals: number }> {
  const fixture = make();
  let ordinals = 0;
  return withGate((_driver, point, _id, detail) => {
    if (point === "read.before" && detail?.collect === 1 && fixture.inFlight()) ordinals = Math.max(ordinals, detail.ordinal ?? 0);
    return undefined;
  }, async () => {
    const executionId = await fixture.start();
    await untilInFlight(fixture, executionId);
    // Let the held lineage settle into its parked state, then release S.
    for (let runs = 0; runs < 3; runs++) await fixture.app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 10, pollIntervalMs: 1 });
    fixture.release();
    const run = await fixture.app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 5000, pollIntervalMs: 1 });
    return { end: run.reason, ordinals };
  });
}

/** One schedule: hold S until `target` is reached with S in flight, release it there, and check the invariants. */
async function schedule(name: string, make: () => Fixture, target: Target, expectedEnd: string): Promise<ScheduleRecord> {
  const fixture = make();
  let reached = false;
  let fallback = false;
  let executionId = "";
  let secondCollects = 0;
  let validations = 0;
  // Progress, for the watchdog: gate events seen, and whether the exchange last parked.
  let events = 0;
  let parked = false;
  const matches = (point: GatePoint, detail?: GateDetail): boolean =>
    !reached && !fallback && fixture.inFlight() && point === target.point &&
    (target.collect === undefined || detail?.collect === target.collect) &&
    (target.ordinal === undefined || detail?.ordinal === target.ordinal);
  const hook: Hook = (_driver, point, id, detail) => {
    if (id !== executionId) return undefined;
    events += 1;
    if (point === "park") parked = true;
    if (point === "register.before") parked = false;
    if (reached && point === "read.before" && detail?.ordinal === 1 && (detail.collect ?? 1) > 1) secondCollects += 1;
    if (reached && point === "validated") validations += 1;
    // Every accepted Outcome is checked for a stranded wait, whatever the target.
    const check = point === "submit.after" ? assertNotStranded(fixture.app, executionId, `${name} ${label(target)} at an accepted Outcome`) : undefined;
    if (!matches(point, detail)) return check;
    reached = true;
    return (async () => {
      await check;
      fixture.release();
      for (let n = 0; n < 200; n++) {
        if (await fixture.settled(executionId)) return;
        await turn();
      }
      throw new Error(`${name} ${label(target)}: S did not become visible within 200 turns`);
    })();
  };
  return withGate(hook, async () => {
    executionId = await fixture.start();
    const id = executionId as ExecutionId;
    // The watchdog, bounded by progress rather than time: host slices continue while gates keep firing,
    // and stop once the exchange is parked with S held and two slices pass with no gate event.
    let quiet = 0;
    for (let runs = 0; runs < 400 && !reached && quiet < 2; runs++) {
      const seen = events;
      await fixture.app.runUntilBlocked(id, { timeoutMs: 5, pollIntervalMs: 1 });
      quiet = fixture.inFlight() && parked && events === seen ? quiet + 1 : 0;
    }
    // An unreached target releases S as a fallback; it is never counted as covered.
    if (!reached) {
      fallback = true;
      fixture.release();
    }
    const end = await fixture.app.runUntilBlocked(id, { timeoutMs: 5000, pollIntervalMs: 1 });
    const again = await fixture.app.runUntilBlocked(id, { timeoutMs: 20, pollIntervalMs: 1 });
    await assertNotStranded(fixture.app, executionId, `${name} ${label(target)} after a second host run`);
    assert.equal(again.kernel.state, end.kernel.state, `${name} ${label(target)}: a second host run changed nothing`);
    assert.equal(end.reason, expectedEnd, `${name} ${label(target)} ends as the unscheduled run does`);
    const reason = unreachableReason(name, target);
    return { fixture: name, target: label(target), result: reached ? "reached" : "unreachable", ...(reached ? {} : { reason: reason ?? "unexpected" }), end: end.reason, secondCollects, validations };
  });
}

describe("B-OBSERVE-SCHEDULES: real native settlements released at every named gate (D03-CHK-03)", () => {
  const records: ScheduleRecord[] = [];
  for (const name of Object.keys(FIXTURES)) {
    test(`${name}: every gate, before and after each read of the first and second collect`, async t => {
      const make = FIXTURES[name]!;
      const { end, ordinals } = await baseline(make);
      assert.ok(ordinals >= 5, `${name}: a first collect reads at least one member's five records`);
      const targets: Target[] = [
        { point: "register.before" }, { point: "register.after" }, { point: "park" },
        { point: "validated" }, { point: "submit.before" }, { point: "submit.after" },
      ];
      for (const collect of [1, 2]) for (let ordinal = 1; ordinal <= ordinals; ordinal++) {
        targets.push({ point: "read.before", collect, ordinal }, { point: "read.after", collect, ordinal });
      }
      for (const target of targets) {
        const record = await schedule(name, make, target, end);
        records.push(record);
        // The pinned expectation: reachable exactly when no await classification is needed first.
        const expected = unreachableReason(name, target) === undefined ? "reached" : "unreachable";
        assert.equal(record.result, expected, `${name} ${record.target}`);
      }
      const mine = records.filter(record => record.fixture === name);
      t.diagnostic(JSON.stringify({ fixture: name, end, schedules: mine.length, reached: mine.filter(r => r.result === "reached").length, unreachable: mine.filter(r => r.result === "unreachable").length }));
    });
  }

  test("non-vacuity: some schedule drove a failed validation (a second collect that did not validate)", () => {
    const failed = records.filter(record => record.secondCollects > record.validations);
    assert.ok(failed.length > 0, "a settlement released inside a first collect made the second collect differ");
  });

  test("F3: a normal child completion settles its parent inside one runOnce, so no collect sees the gap", () => {
    // Structurally unreachable, recorded with its ordering reason (D03-CHK-03): `Harness.applyOutcome` awaits
    // `settleOwnerOnChildTerminal` (packages/core/src/runtime/harness.ts), and `runOnce` awaits `activate`; the
    // Driver collects only after `runOnce` returns. The coherent "terminal child, pending call" state is
    // covered by the record model (B-QUIESCE-CELLS, child settling) and is classified open.
    return readFile(resolve(REPO, "packages/core/src/runtime/harness.ts"), "utf8").then(text => {
      assert.match(text, /await this\.settleOwnerOnChildTerminal\(/);
    });
  });
});

describe("B-OBSERVE-POSTVALIDATION: Kernel input and cancellation at the validated and submission gates", () => {
  for (const point of ["validated", "submit.before"] as const) {
    test(`F2 at ${point}: input accepted in the window is queued and delivered by a later exchange`, async () => {
      const fixture = f2();
      let executionId = "";
      let acted = false;
      let released = false;
      let input: Awaited<ReturnType<Application["input"]>> | undefined;
      // The window after S settled: the lineage is awaitable and the await is being validated or submitted.
      await withGate((_driver, gate, id) => {
        if (acted || !released || id !== executionId || gate !== point) return undefined;
        acted = true;
        return (async () => {
          const child = (await fixture.app.harness.childExecutionLinksOf(id as ExecutionId))[0]!.childExecutionId;
          input = await fixture.app.input(id, { requestKey: "window", label: "user", payload: "hello", destination: child });
        })();
      }, async () => {
        executionId = await fixture.start();
        await untilInFlight(fixture, executionId);
        fixture.release();
        released = true;
        const end = await fixture.app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 5000, pollIntervalMs: 1 });
        assert.ok(acted, "the window was reached");
        assert.equal(end.reason, "input_required");
        await assertNotStranded(fixture.app, executionId, `input at ${point}`);
        const results = fixture.app.inspect(executionId).emissions.map(emission => emission.value as { kind?: string; results?: { eventId: string; status: string }[] })
          .filter(value => value.kind === "arrokothi.bridge.ingress_result").flatMap(value => value.results ?? []);
        assert.deepEqual(results.filter(result => result.eventId === input!.eventId).map(result => result.status), ["delivered"]);
      });
    });
    test(`F4 at ${point}: a cancellation accepted in the window ends E and every native member`, async () => {
      const fixture = deferredModelFixture("F4");
      let executionId = "";
      let acted = false;
      let released = false;
      await withGate((_driver, gate, id) => {
        if (acted || !released || id !== executionId || gate !== point) return undefined;
        acted = true;
        return fixture.app.cancel(id).then(() => undefined);
      }, async () => {
        executionId = await fixture.start();
        await untilInFlight(fixture, executionId);
        fixture.release();
        released = true;
        const end = await fixture.app.runUntilBlocked(executionId as ExecutionId, { timeoutMs: 5000, pollIntervalMs: 1 });
        assert.ok(acted, "the window was reached");
        assert.equal(end.reason, "cancelled");
        for (const member of await nativeState(fixture.app, executionId)) assert.equal(member.lifecycle, "CANCELLED", member.id);
      });
    });
  }
});

// -- The commit signal (D03-CHK-01) ------------------------------------------

describe("B-COMMIT-SIGNAL: the facade returns the store's own transaction and never loses a wake", () => {
  const scope = "root" as ExecutionId;

  test("a committed transaction: the same promise, its result, the committed state, the lineage woken", async () => {
    const inner = new InMemoryRuntimeStore();
    const scheduler = new LineageScheduler(inner);
    scheduler.learn("root", "root");
    const facade = new CommitSignallingStore(inner, s => scheduler.signal(s));
    const woke = scheduler.nextWork("root");
    let observed: unknown;
    const transaction = facade.transact(scope, async (tx: RuntimeTransaction) => { observed = tx; return 42; });
    assert.equal(await transaction, 42);
    assert.ok(observed);
    await woke;
  });

  test("a rolled-back transaction: the original error reaches the caller and the lineage is still woken", async () => {
    const inner = new InMemoryRuntimeStore();
    const scheduler = new LineageScheduler(inner);
    scheduler.learn("root", "root");
    const facade = new CommitSignallingStore(inner, s => scheduler.signal(s));
    const woke = scheduler.nextWork("root");
    const failure = new Error("work failed");
    await assert.rejects(facade.transact(scope, async () => { throw failure; }), error => error === failure);
    await woke;
  });

  test("the facade's promise is the store's own object, and a store that throws synchronously is unchanged", async () => {
    const result = Promise.resolve(7);
    const signals: string[] = [];
    const inner = { transact: () => result } as unknown as InMemoryRuntimeStore;
    const facade = new CommitSignallingStore(inner, s => signals.push(s));
    assert.equal(facade.transact(scope, async () => 7), result);
    await result;
    await turn();
    assert.deepEqual(signals, ["root"]);
    const thrower = new CommitSignallingStore({ transact() { throw new Error("sync"); } } as unknown as InMemoryRuntimeStore, s => signals.push(s));
    assert.throws(() => thrower.transact(scope, async () => 1), /sync/);
    assert.deepEqual(signals, ["root"], "nothing committed, nothing signalled");
  });

  test("an unknown scope wakes every registered waiter; a known one wakes only its lineage", async () => {
    const scheduler = new LineageScheduler();
    scheduler.learn("a-child", "a");
    let woken: string[] = [];
    const watch = (lineage: string) => void scheduler.nextWork(lineage).then(() => woken.push(lineage));
    watch("a"); watch("b");
    scheduler.signal("a-child");
    await turn();
    assert.deepEqual(woken, ["a"], "lineage isolation");
    woken = [];
    watch("a");
    scheduler.signal("not-yet-learned");
    await turn();
    assert.deepEqual(woken.sort(), ["a", "b"], "a scope with no learned root wakes every waiter (delayed resolution)");
  });

  test("a failing lineage read cannot touch the signal: the signal never reads the store", async () => {
    let reads = 0;
    class Failing extends InMemoryRuntimeStore {
      override async readExecution(id: Parameters<InMemoryRuntimeStore["readExecution"]>[0]): ReturnType<InMemoryRuntimeStore["readExecution"]> {
        reads += 1;
        throw new Error(`one lineage lookup failed for ${id}`);
      }
    }
    const store = new Failing();
    const scheduler = new LineageScheduler(store);
    const facade = new CommitSignallingStore(store, s => scheduler.signal(s));
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const woke = scheduler.nextWork("root");
      assert.equal(await facade.transact(scope, async () => "committed"), "committed");
      await woke;
      await turn();
      assert.equal(reads, 0, "no read on the notification path");
      assert.deepEqual(unhandled, []);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});

test("B-NOTIFY-NOWAKE (Driver level, scripted native controller): a settlement that wakes nothing still lets the exchange declare its wait", async () => {
  const release = deferred();
  const executor: CapabilityExecutor = { async execute() { await release.promise; return { status: "success", observation: "ok" }; } };
  // Propose a capability without waiting for it, then wait only for application input: the settlement's
  // result Event matches no wake condition, so it neither makes the member READY nor enqueues it.
  const rig = await scriptedRig({ root: [
    { do: "use_capability", capability: "test", operation: "slow", await: false },
    { do: "await", eventKinds: ["external.input"] },
  ] }, executor);
  assert.equal(await rig.drive(40), "RUNNING", "in-flight work keeps the exchange open with no Kernel wait");
  release.resolve();
  assert.equal(await rig.drive(2000), "WAITING", "the commit signal woke the parked exchange, which declared the input wait");
  const view = rig.host.inspect(rig.executionId);
  assert.ok(view.wait !== null, "a live wait generation");
  assert.match(JSON.stringify(view.wait.declaration), new RegExp(INPUT_KINDS.input.replace(/\./g, "\\.")));
});

// -- Structural guards on the soundness argument (design 03 §2.2, §2.4) ------

const CORE = resolve(REPO, "packages/core/src");

/** Enclosing method name of each `.transact(` call in a file. */
function transactSites(text: string): string[] {
  const lines = text.split("\n");
  const sites: string[] = [];
  lines.forEach((line, index) => {
    if (!line.includes(".transact(")) return;
    for (let back = index; back >= 0; back--) {
      const match = /^ {2}(?:(?:private|public|protected|async|static) )*([A-Za-z#]+)\s*[(<]/.exec(lines[back]!);
      if (match && !["if", "for", "while", "switch", "return", "await"].includes(match[1]!)) { sites.push(match[1]!); return; }
    }
    sites.push("?");
  });
  return sites;
}

test("B-NATIVE-WRITERS: the 25 native transaction sites of design 03 §2.4, by file and enclosing method", async () => {
  const census: Record<string, string[]> = {};
  for (const name of (await readdir(resolve(CORE, "runtime"))).filter(file => file.endsWith(".ts")).sort()) {
    const sites = transactSites(await readFile(resolve(CORE, "runtime", name), "utf8"));
    if (sites.length) census[name] = sites;
  }
  assert.deepEqual(census, {
    "effect-processor.ts": [
      "submitUserInput", "processOne", "gateForConfirmation", "declineConfirmation", "approveConfirmation",
      "denyApprovedConfirmation", "abandonApprovedConfirmation", "dispatchSpawn", "dispatchSendMessage",
      "dispatchWriteMemory", "dispatchRequestUserInput", "dispatchCapability", "settle", "refuse", "refuse",
      "replay", "checkPriorOperations",
    ],
    "harness.ts": ["createExecution", "deliverEnvelope", "activate", "applyOutcome", "failActivation", "settleOwnerOnChildTerminal", "cancelExecution"],
    "resumption-processor.ts": ["settle"],
  }, "a new or moved native writer needs design 03 §2.4 re-argued");
});

test("B-RECORD-ONEWAY: the classifier's record states are written only by their one-way helpers", async () => {
  // Bounded regression guard (design check 03): the transitions in the record modules, and no spread-then-state
  // rewrite of these records anywhere else under packages/core/src.
  const helpers: Record<string, RegExp[]> = {
    "effects/pending.ts": [/status: "pending",\n\s+dispatch: "not_dispatched"/, /dispatch: "dispatched", dispatchedAt/, /status: "settled", outcome/, /status: "abandoned", outcome/],
    "execution/confirmation-request.ts": [/state: "pending"/],
    "execution/child-link.ts": [/state: "active"/],
    "execution/resumption.ts": [/state: "pending"/, /if \(resumption\.state !== "pending"\) return resumption;\n[\s\S]{0,80}state: "invalidated"/],
  };
  for (const [file, patterns] of Object.entries(helpers)) {
    const text = await readFile(resolve(CORE, file), "utf8");
    for (const pattern of patterns) assert.match(text, pattern, `${file}: ${pattern}`);
  }
  const offenders: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!entry.name.endsWith(".ts") || Object.keys(helpers).some(file => path.endsWith(file))) continue;
      const text = await readFile(path, "utf8");
      if (/\.\.\.(?:operation|pending|existing|op)\b[^}]{0,40}\b(?:status|dispatch): "(?:pending|not_dispatched)"/.test(text)) offenders.push(path);
      if (/\.\.\.(?:request|link|resumption|confirmation)\b[^}]{0,40}\bstate: "(?:pending|active)"/.test(text)) offenders.push(path);
    }
  };
  await walk(CORE);
  assert.deepEqual(offenders, [], "a record state written backwards outside its helper module");
});

// -- R1-04: the controller hook's services (review 01 K14-R1-04) -------------

test("B-HOOK-SERVICES (review 01 K14-R1-04): the hook receives the initialized lineage scheduler the native Runtime uses", async () => {
  let seen: unknown;
  let queued: Promise<number> | undefined;
  const app = createApplication({
    functions: { work: () => ({ status: "completed", result: null }) },
    controllers: services => {
      seen = services.scheduler;
      assert.equal(typeof services.scheduler?.queuedCount, "function", "the scheduler exists during the hook");
      queued = services.scheduler.queuedCount();
      return {};
    },
  });
  assert.equal(await queued, 0);
  assert.equal(seen, app.services.scheduler, "the retained scheduler is the application's");
  const retained = seen as LineageScheduler;
  const { executionId } = await app.start({ definition: functionWorkflowOf("hook", "work") });
  assert.equal(await retained.queuedCount(), 1, "native root creation queued the root in the retained scheduler: it is the Harness's");
  assert.equal((await app.runUntilBlocked(executionId)).reason, "completed");
  assert.equal(await retained.queuedCount(), 0);
});

// -- Removed-fix ablations for R1-01 ------------------------------------------

test("B-OBSERVE-ABLATION: without the second collect, the review's probe strands the wait again", async () => {
  const proto = LegacyDriver.prototype as unknown as { observe(this: unknown, executionId: string): Promise<unknown>; collect(this: unknown, executionId: string, n: number): Promise<never> };
  const original = proto.observe;
  proto.observe = async function (this: unknown, executionId: string) {
    return classifyLineage(await proto.collect.call(this, executionId, 1));
  };
  try {
    const result = await snapshotProbe().catch(error => ({ error }));
    assert.ok("error" in result || (result.kernel === "WAITING" && result.native === "READY"), "a single collect commits the stranded wait");
  } finally {
    proto.observe = original;
  }
});

test("B-NOTIFY-ABLATION: without the commit signal, the no-wake settlement leaves the exchange parked", async () => {
  const original = LineageScheduler.prototype.signal;
  LineageScheduler.prototype.signal = () => undefined;
  try {
    const release = deferred();
    const executor: CapabilityExecutor = { async execute() { await release.promise; return { status: "success", observation: "ok" }; } };
    const rig = await scriptedRig({ root: [
      { do: "use_capability", capability: "test", operation: "slow", await: false },
      { do: "await", eventKinds: ["external.input"] },
    ] }, executor);
    await rig.drive(40);
    release.resolve();
    assert.equal(await rig.drive(150), "RUNNING", "nothing wakes the parked exchange");
    await rig.driver.cascade(rig.executionId);
  } finally {
    LineageScheduler.prototype.signal = original;
  }
});
