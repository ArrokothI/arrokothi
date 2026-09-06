/**
 * Controlled Event interleaving and the minimal stale-continuation rule.
 *
 * By default a `ControllerResumption` suspends *exclusively*: no Event produces an intervening
 * Activation. A controller can opt a specific class of Event into overtaking that wait. The
 * risk this introduces - a stale controller-local result silently committing assumptions a later
 * Activation superseded - is closed by invalidating the resumption in the same transaction that
 * queues the winning Event.
 *
 * The cases below cover the full interleaving matrix plus the default behavior. They use
 * deterministic barriers (a gate the test opens), never sleeps.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ControllerRegistry, Harness } from "@arrokothi/core/execution";
import type { ActivationOutcome, ExecutionController } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createDeterministicIds,
  createFixedClock,
  createNoInlineWaitBudget,
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
} from "@arrokothi/core/reference";
import { createScriptedAgentController, createTestHarness, scriptedAgentDefinition } from "@arrokothi/core/testing";
import type { ScriptedControllerStep } from "@arrokothi/core/testing";

/**
 * A gate the test controls: every `gate(key)` call stays blocked until `open(key)` is called, and
 * calls made after `open(key)` resolve immediately. Resolvers are tracked per call, not per key, so
 * an invalidated resumption's still-running promise is also released and `drainResumptions` returns.
 */
function makeGate() {
  const pending = new Map<string, Array<() => void>>();
  const opened = new Set<string>();
  return {
    gate: (key: string): Promise<void> => {
      if (opened.has(key)) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const list = pending.get(key) ?? [];
        list.push(resolve);
        pending.set(key, list);
      });
    },
    open(key: string): void {
      opened.add(key);
      for (const resolve of pending.get(key) ?? []) resolve();
      pending.delete(key);
    },
  };
}

interface Rig {
  readonly harness: Harness;
  readonly definitions: InMemoryDefinitionStore;
  readonly store: InMemoryRuntimeStore;
  readonly open: (key: string) => void;
}

function rig(): Rig {
  const definitions = new InMemoryDefinitionStore();
  const store = new InMemoryRuntimeStore();
  const { gate, open } = makeGate();
  const harness = new Harness({
    definitions,
    store,
    scheduler: new FifoScheduler(),
    controllers: new ControllerRegistry([createScriptedAgentController({ gate })]),
    clock: createFixedClock(),
    ids: createDeterministicIds(),
    // Force the slow path: local work never settles inline, so it always leaves a resumption.
    inlineWait: createNoInlineWaitBudget(),
  });
  return { harness, definitions, store, open };
}

/** Controller-local work that suspends, opted into interleaving on `external.input`. */
const INTERLEAVING_WORK: ScriptedControllerStep = {
  do: "local_work",
  key: "R",
  produces: "R-result",
  interleave: { eventKinds: ["external.input"] },
};

describe("controlled interleaving", () => {
  test("RUNNING-window race - a queued interleave Event invalidates the not-yet-committed suspension", async () => {
    let reportSuspension!: () => void;
    const suspensionReady = new Promise<void>((resolve) => { reportSuspension = resolve; });
    let releaseController!: () => void;
    const controllerRelease = new Promise<void>((resolve) => { releaseController = resolve; });
    let releaseR1!: () => void;
    const r1 = new Promise<string>((resolve) => { releaseR1 = () => resolve("obsolete"); });
    let releaseR2!: () => void;
    const r2 = new Promise<string>((resolve) => { releaseR2 = () => resolve("fresh"); });
    let workStarts = 0;
    let activations = 0;

    const controller: ExecutionController = {
      kind: "agent",
      async activate(input, resumptions): Promise<ActivationOutcome> {
        activations += 1;
        const attempt = await resumptions.run("stable-R", () => {
          workStarts += 1;
          return workStarts === 1 ? r1 : r2;
        });
        if (activations === 1) {
          assert.equal(attempt.status, "suspended");
          reportSuspension();
          await controllerRelease;
          return {
            control: { kind: "agent", progress: { activations } },
            next: {
              status: "await_resumption",
              resumptionId: attempt.resumptionId,
              interleave: { eventKinds: ["external.input"], correlationId: null },
            },
          };
        }
        if (attempt.status === "suspended") {
          return {
            control: { kind: "agent", progress: { activations, events: input.events.length } },
            next: {
              status: "await_resumption",
              resumptionId: attempt.resumptionId,
              interleave: { eventKinds: ["external.input"], correlationId: null },
            },
          };
        }
        assert.equal(attempt.status, "settled");
        return { control: { kind: "agent", progress: { activations, value: attempt.value } }, next: { status: "complete" } };
      },
    };

    const definitions = new InMemoryDefinitionStore();
    const store = new InMemoryRuntimeStore();
    const harness = new Harness({
      definitions,
      store,
      scheduler: new FifoScheduler(),
      controllers: new ControllerRegistry([controller]),
      clock: createFixedClock(),
      ids: createDeterministicIds(),
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await definitions.save(scriptedAgentDefinition({ id: "running-window", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });

    const firstActivation = harness.runOnce();
    await suspensionReady;
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "RUNNING");

    // E1/E2/E3 commit while A1 is still RUNNING and deliberately held before reporting its wait.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e1" });
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e2" });
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e3" });
    releaseController();
    await firstActivation;

    const [obsolete] = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    assert.equal(obsolete?.state, "invalidated", "the suspension commit records durable invalidation");
    assert.ok(obsolete?.invalidatedByEventId, "one matching queued Event supplies provenance");
    assert.equal(await store.findControllerResumptionByKey(handle.executionId, "stable-R"), undefined);

    // Late R1 completion is not followed and cannot wake or become reusable.
    releaseR1();
    await Promise.resolve();
    assert.equal((await harness.controllerResumption(obsolete!.resumptionId))?.state, "invalidated");

    const secondActivation = await harness.runOnce();
    assert.equal(secondActivation?.deliveredEventIds.length, 3, "the burst is consumed by one Activation");
    assert.equal(workStarts, 2, "one fresh R2 starts after consolidated Event processing");
    const records = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(records.filter((record) => record.state === "invalidated").length, 1);
    assert.equal(records.filter((record) => record.state === "pending").length, 1);

    releaseR2();
    await harness.drainResumptions();
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(workStarts, 2, "stable-key recovery did not start a duplicate R2");
  });

  test("R5 - a controller with no interleave declaration keeps exclusive-resumption behaviour", async () => {
    const { harness, definitions, open } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "exclusive",
        program: [{ do: "local_work", key: "R", produces: "done" }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    // An Event arrives while suspended. Without an interleave condition it must not wake anything.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "poke" });
    assert.equal(await harness.runOnce(), null, "no intervening Activation while the resumption is outstanding");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    open("R");
    await harness.drainResumptions();
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("R4 - an unrelated Event does not invalidate or wake a resumption whose interleave is a different kind", async () => {
    const { harness, definitions, open } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "narrow-interleave",
        program: [
          // Opted into interleaving only for `child.spawned` - an `external.input` must not touch it.
          { do: "local_work", key: "R", produces: "done", interleave: { eventKinds: ["child.spawned"] } },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    await harness.deliverExternalInput({ destination: handle.executionId, label: "unrelated" });
    assert.equal(await harness.runOnce(), null, "an unrelated Event is queued, not acted on");
    const resumption = (await harness.controllerResumptionsOf(handle.executionId))[0]!;
    assert.equal(resumption.state, "pending", "the resumption was not invalidated");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    open("R");
    await harness.drainResumptions();
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("R2 - an interleave Event wins: the resumption is invalidated, the Execution runs again, the late result cannot wake it", async () => {
    const { harness, definitions, open } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "interleave-wins",
        program: [INTERLEAVING_WORK, INTERLEAVING_WORK, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const first = (await harness.controllerResumptionsOf(handle.executionId))[0]!;
    assert.equal(first.state, "pending");

    // The interleave Event arrives before the work settles.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "wake" });

    const invalidated = await harness.controllerResumption(first.resumptionId);
    assert.equal(invalidated?.state, "invalidated", "invalidated in the same transaction that queued the Event");
    assert.equal(invalidated?.invalidatedByEventId !== null, true, "with provenance");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY", "and the Execution is runnable again");

    // The next Activation re-runs local_work; findByKey skips the invalidated record, so fresh work starts.
    await harness.runUntilIdle();
    const records = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(records.length, 2, "a fresh resumption, distinct from the invalidated one");
    assert.equal(records.filter((r) => r.state === "invalidated").length, 1);
    assert.equal(records.filter((r) => r.state === "pending").length, 1);

    // The invalidated resumption's underlying promise now settles - it must do nothing.
    open("R");
    await harness.drainResumptions();
    const afterLateSettle = await harness.controllerResumption(first.resumptionId);
    assert.equal(afterLateSettle?.state, "invalidated", "the late result did not turn it back into a reusable settled record");

    // And the fresh work carries the Execution to completion.
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("R7 - once a resumption is invalidated, Event delivery alone creates no second invalidation and no replacement work", async () => {
    const { harness, definitions, open } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "no-repeat",
        program: [INTERLEAVING_WORK, { do: "observe" }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const first = (await harness.controllerResumptionsOf(handle.executionId))[0]!;

    await harness.deliverExternalInput({ destination: handle.executionId, label: "e1" });
    const afterE1 = await harness.controllerResumption(first.resumptionId);
    assert.equal(afterE1?.state, "invalidated");
    const invalidatedAtE1 = afterE1?.invalidatedByEventId;

    // E2 and E3 arrive before the next Activation. The Execution is already READY, not WAITING, so
    // routeEvent takes the mailbox-only path: no wake decision, no resumption touched.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e2" });
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e3" });

    const afterE3 = await harness.controllerResumption(first.resumptionId);
    assert.equal(afterE3?.invalidatedByEventId, invalidatedAtE1, "no second invalidation - the provenance is unchanged");
    assert.equal(
      (await harness.controllerResumptionsOf(handle.executionId)).length,
      1,
      "no replacement resumption was created merely by Event delivery",
    );

    // Only when an Activation actually runs does the controller re-run local_work and start exactly
    // one fresh resumption - a deliberate replacement, not one per delivered Event.
    await harness.runOnce();
    const afterActivation = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(afterActivation.filter((r) => r.state === "invalidated").length, 1);
    assert.equal(afterActivation.filter((r) => r.state === "pending").length, 1, "one fresh resumption, not three");

    open("R");
    await harness.drainResumptions();
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("R6 - Events that accumulate before the next Activation are all consumed before any replacement work", async () => {
    const { harness, definitions } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "accumulate",
        program: [
          INTERLEAVING_WORK,
          { do: "observe", note: "after-burst" },
          // A second interleaving work only if the controller decides it still needs one.
          { do: "local_work", key: "R2", produces: "second" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    await harness.deliverExternalInput({ destination: handle.executionId, label: "e1" });
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e2" });
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e3" });

    // One Activation processes the burst. It sees all three delivered Events.
    const record = await harness.runOnce();
    assert.equal(record?.deliveredEventIds.length, 3, "one Activation consumed the whole burst");

    const resumptions = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(resumptions.filter((r) => r.state === "invalidated").length, 1, "exactly one invalidation");
    // The controller reached its next `local_work` and started exactly one fresh resumption.
    assert.equal(resumptions.filter((r) => r.state === "pending").length, 1, "at most one fresh local invocation");
  });

  test("R1 - the resumption settles before the interleave Event: the settled result stays reusable and the Event is not lost", async () => {
    const { harness, definitions, open } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "resumption-wins",
        program: [INTERLEAVING_WORK, { do: "observe", note: "saw-event" }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const first = (await harness.controllerResumptionsOf(handle.executionId))[0]!;

    // Settle the resumption first. The Execution becomes READY on the resumption path.
    open("R");
    await harness.drainResumptions();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    const settled = await harness.controllerResumption(first.resumptionId);
    assert.equal(settled?.state, "settled");

    // Then an Event arrives. It must not invalidate the already-settled reusable result.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "late" });
    assert.equal((await harness.controllerResumption(first.resumptionId))?.state, "settled", "still reusable");

    await harness.runUntilIdle();
    const ctx = await harness.inspect(handle.executionId);
    assert.equal(ctx?.lifecycle, "COMPLETED");
    // The Activation that resumed also observed the late Event - it was queued, not dropped.
    const progress = ctx!.control.progress as { seenKinds?: string[] };
    assert.deepEqual(progress.seenKinds, ["external.input"], "the interleave Event reached the controller");
  });

  test("R8 - a deliberately started replacement R2 may itself be invalidated by a later interleave Event", async () => {
    const { harness, definitions, open } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "replacement-invalidated",
        program: [INTERLEAVING_WORK, INTERLEAVING_WORK, INTERLEAVING_WORK, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const r1 = (await harness.controllerResumptionsOf(handle.executionId))[0]!;

    // E1 invalidates R1; the next Activation deliberately starts R2.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e1" });
    await harness.runUntilIdle();
    const pendingAfterFirst = (await harness.controllerResumptionsOf(handle.executionId)).find((r) => r.state === "pending")!;
    assert.notEqual(pendingAfterFirst.resumptionId, r1.resumptionId, "R2 is a genuinely fresh resumption");

    // E2 arrives while WAITING on R2 - it overtakes R2 legitimately.
    await harness.deliverExternalInput({ destination: handle.executionId, label: "e2" });
    assert.equal((await harness.controllerResumption(pendingAfterFirst.resumptionId))?.state, "invalidated");
    const invalidated = (await harness.controllerResumptionsOf(handle.executionId)).filter((r) => r.state === "invalidated");
    assert.equal(invalidated.length, 2, "R1 and R2 were each invalidated once - by a separate Event, not repeated delivery");

    open("R");
    for (let i = 0; i < 6 && (await harness.inspect(handle.executionId))?.lifecycle !== "COMPLETED"; i += 1) {
      await harness.drainResumptions();
      await harness.runUntilIdle();
    }
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("await_event interleave - an interleave Event wakes the Execution without settling the primary PendingOperation", async () => {
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], message: true }),
    });
    // A asks B and interleaves on peer.message; a fresh peer message must wake A without settling
    // the ask.
    const bRef = await definitions.save(
      scriptedAgentDefinition({ id: "B-slow", program: [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }] }),
    );
    const b = await harness.createExecution({ definition: bRef });
    await harness.runUntilIdle();

    const cRef = await definitions.save(
      scriptedAgentDefinition({ id: "C-poker", program: [{ do: "send", to: "PLACEHOLDER", body: { poke: true }, await: false }, { do: "complete" }] }),
    );
    void cRef;

    const aRef = await definitions.save(
      scriptedAgentDefinition({
        id: "A-asks",
        program: [
          { do: "ask", to: b.executionId, body: {}, requestKey: "AB", interleave: { eventKinds: ["peer.message"] } },
          { do: "observe", note: "woke on interleave" },
          { do: "await", eventKinds: ["peer.message"], correlationId: "AB" }, // still owes the reply
          { do: "complete" },
        ],
      }),
    );
    const a = await harness.createExecution({ definition: aRef });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(a.executionId))?.lifecycle, "WAITING", "A is waiting on B's reply");
    const askPending = () =>
      harness.pendingOperationsOf(a.executionId).then((ps) => ps.find((p) => p.correlationId === "AB")!);
    assert.equal((await askPending()).status, "pending");

    // A third Execution sends A an unrelated peer message.
    const pokeRef = await definitions.save(
      scriptedAgentDefinition({ id: "poker", program: [{ do: "send", to: a.executionId, body: { poke: 1 }, await: false }, { do: "complete" }] }),
    );
    await harness.createExecution({ definition: pokeRef });
    await harness.runUntilIdle();

    // A woke, processed the poke, and is back to waiting for B's reply - on the SAME PendingOperation.
    const aCtx = await harness.inspect(a.executionId);
    assert.equal(aCtx?.lifecycle, "WAITING");
    assert.equal((await askPending()).status, "pending", "the interleave Event did not settle the ask");
    const progress = aCtx!.control.progress as { seenKinds?: string[] };
    assert.ok(progress.seenKinds?.includes("peer.message"), "A processed the interleave peer message");
  });

  test("R3 - the invalidated resumption's promise re-entering produces no duplicate wake and no Event", async () => {
    const { harness, definitions, open, store } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "duplicate-late",
        program: [INTERLEAVING_WORK, INTERLEAVING_WORK, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const ctx0 = await harness.inspect(handle.executionId);

    await harness.deliverExternalInput({ destination: handle.executionId, label: "wake" });
    await harness.runUntilIdle(); // fresh work started, waiting on it
    const mailboxBefore = await store.peekMailbox(ctx0!.mailbox.mailboxId);

    open("R"); // both the invalidated promise and the fresh one settle
    await harness.drainResumptions();

    const mailboxAfter = await store.peekMailbox(ctx0!.mailbox.mailboxId);
    assert.equal(mailboxAfter.length, mailboxBefore.length, "the invalidated promise settling added nothing to the mailbox");
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });
});
