/**
 * Controller-local asynchronous resumption, at the substrate level.
 *
 * The claim under test is a distinction, not a feature: slow work that is *local to an Execution*
 * must be able to yield an Activation without becoming an Event, an Effect, or a PendingOperation.
 *
 * ```text
 * Event               observation delivered through the runtime boundary
 * PendingOperation    runtime-mediated semantic work; settles into an Event
 * ControllerResumption
 *                     controller-local async work; settles into a runnable continuation
 * ```
 *
 * Everything here checks one of the three: that the record exists and is only data, that the
 * settlement path touches none of the Effect machinery, that v0.4's exclusive suspension holds, and
 * that the JSON boundary a slow result crosses is the same one a fast result crosses - so "it
 * settled inline" can never be the reason something succeeded.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { ControllerResumption } from "@arrokothi/core/execution";
import { createNoInlineWaitBudget } from "@arrokothi/core/reference";
import {
  createScriptedAgentController,
  createTestHarness,
  readScriptedProgress,
  scriptedAgentDefinition,
} from "@arrokothi/core/testing";
import type { ScriptedControllerStep } from "@arrokothi/core/testing";

/**
 * A hold a test can keep open across Activations.
 *
 * Work that resolves immediately is settled by the runtime on the next microtask, which is right -
 * a wake is never lost - but leaves nothing outstanding to observe. Holding one open is how a case
 * can look at an Execution while its local work is genuinely still running.
 */
function workGate() {
  const releases = new Map<string, () => void>();
  return {
    hold: (key: string) => new Promise<void>((resolve) => releases.set(key, resolve)),
    release: (key: string) => {
      const resolve = releases.get(key);
      if (!resolve) throw new Error(`nothing is holding "${key}"`);
      resolve();
    },
  };
}

function nonDataPaths(value: unknown, path: string, found: string[], seen = new Set<object>()): void {
  if (value === null) return;
  const type = typeof value;
  if (type === "function" || type === "symbol" || type === "bigint" || type === "undefined") {
    found.push(`${path}: ${type}`);
    return;
  }
  if (type !== "object") return;
  const object = value as object;
  if (seen.has(object)) return;
  seen.add(object);
  if (!Array.isArray(object) && Object.getPrototypeOf(object) !== Object.prototype && Object.getPrototypeOf(object) !== null) {
    found.push(`${path}: ${object.constructor?.name ?? "instance"}`);
    return;
  }
  for (const [key, child] of Object.entries(object as Record<string, unknown>)) {
    nonDataPaths(child, `${path}.${key}`, found, seen);
  }
}

/** Runs one script twice: once where local work settles inline, once where it always yields. */
async function bothPaths(program: readonly ScriptedControllerStep[], id: string) {
  const run = async (slow: boolean) => {
    const { harness, definitions } = createTestHarness(slow ? { inlineWait: createNoInlineWaitBudget() } : {});
    const ref = await definitions.save(scriptedAgentDefinition({ id: `${id}-${slow ? "slow" : "fast"}`, program }));
    const handle = await harness.createExecution({ definition: ref });
    for (let i = 0; i < 8; i++) {
      await harness.runUntilIdle();
      await harness.drainResumptions();
      const context = await harness.inspect(handle.executionId);
      if (context && (context.lifecycle === "COMPLETED" || context.lifecycle === "FAILED")) break;
    }
    const context = await harness.inspect(handle.executionId);
    return {
      lifecycle: context!.lifecycle,
      notes: readScriptedProgress(context!.control.progress).notes,
      resumptions: await harness.controllerResumptionsOf(handle.executionId),
      activations: (await harness.transitionsOf(handle.executionId)).filter((t) => t.to === "RUNNING").length,
    };
  };
  return { fast: await run(false), slow: await run(true) };
}

describe("controller-local resumption", () => {
  test("slow local work yields the Activation and resumes from the stored outcome", async () => {
    const gate = workGate();
    const { harness, definitions, store } = createTestHarness({
      controllers: [createScriptedAgentController({ gate: gate.hold })],
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "slow-local",
        program: [{ do: "local_work", key: "inference", produces: { answer: 42 } }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const waiting = await harness.inspect(handle.executionId);
    assert.equal(waiting?.lifecycle, "WAITING", "the Activation yielded rather than holding the scheduler");
    assert.equal(waiting?.waitingFor?.kind, "controller_resumption", "and it waits on the resumption, not on an Event");

    const records = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(records.length, 1);
    const record = records[0]!;
    assert.equal(record.state, "pending");
    assert.equal(record.key, "inference", "the controller's stable key, not a runtime-minted correlation");
    assert.equal(record.executionId, handle.executionId);
    assert.equal(
      waiting?.waitingFor?.kind === "controller_resumption" ? waiting.waitingFor.resumptionId : null,
      record.resumptionId,
    );

    // Nothing about this crossed the runtime boundary.
    assert.deepEqual(await store.peekMailbox(waiting!.mailbox.mailboxId), [], "no Event was appended");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), [], "no PendingOperation was created");
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "nothing was journaled as an Effect");

    gate.release("inference");
    await harness.drainResumptions();
    const ready = await harness.inspect(handle.executionId);
    assert.equal(ready?.lifecycle, "READY", "settlement makes work runnable; it does not run it");
    assert.equal(ready?.waitingFor, null, "the satisfied dependency was cleared");

    await harness.runUntilIdle();
    const done = await harness.inspect(handle.executionId);
    assert.equal(done?.lifecycle, "COMPLETED");
    assert.deepEqual(readScriptedProgress(done!.control.progress).notes["inference"], { settled: { answer: 42 } });

    const settled = (await harness.controllerResumptionsOf(handle.executionId))[0]!;
    assert.equal(settled.state, "settled");
    assert.deepEqual(settled.value, { answer: 42 });
    assert.equal(settled.failure, null);
  });

  test("the record is only data, and never acquires Effect vocabulary", async () => {
    const { harness, definitions } = createTestHarness({ inlineWait: createNoInlineWaitBudget() });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "record-shape",
        program: [{ do: "local_work", key: "k", produces: "text" }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    await harness.drainResumptions();
    await harness.runUntilIdle();

    const records = await harness.controllerResumptionsOf(handle.executionId);
    const issues: string[] = [];
    nonDataPaths(records, "resumptions", issues);
    assert.deepEqual(issues, [], "no Promise, thunk, provider client, or AbortSignal is stored");
    assert.deepEqual(JSON.parse(JSON.stringify(records)) as unknown, records, "the record survives a JSON round trip");

    const record = records[0] as unknown as Record<string, unknown>;
    for (const forbidden of [
      "effectId",
      "effectKind",
      "idempotencyKey",
      "dispatch",
      "dispatchState",
      "resultEventId",
      "authorization",
      "grant",
      "outcome",
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(record, forbidden),
        false,
        `a ControllerResumption is not a PendingOperation and must not declare "${forbidden}"`,
      );
    }
    assert.deepEqual(Object.keys(record as object).sort(), [
      "activationId",
      "createdAt",
      "executionId",
      "failure",
      // Slice E.1 invalidation provenance: diagnostics for an interleave Event that overtook the
      // work. Still only plain data - no Effect vocabulary.
      "invalidatedAt",
      "invalidatedAtRevision",
      "invalidatedByEventId",
      "key",
      "observedRevision",
      "resumptionId",
      "settledAt",
      "state",
      "value",
    ]);
  });

  test("the suspending Activation's controller revision is recorded", async () => {
    const { harness, definitions } = createTestHarness({ inlineWait: createNoInlineWaitBudget() });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "revision",
        program: [{ do: "remember", key: "a", value: 1 }, { do: "local_work", key: "k" }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    const record = (await harness.controllerResumptionsOf(handle.executionId))[0]!;
    // No policy is attached to it in v0.4 - v0.4 suspends exclusively, so there is no intervening
    // Activation and no stale continuation to detect. It is recorded now so v0.5's rule has
    // something to check without migrating persisted records.
    assert.equal(typeof record.observedRevision, "number");
    assert.ok(record.observedRevision > 0 && record.observedRevision < context!.revision);
    assert.match(record.activationId, /^act_/, "and which Activation started the work");
  });

  test("an Event delivered while waiting on a resumption is queued but does not wake", async () => {
    const gate = workGate();
    const { harness, definitions, store } = createTestHarness({
      controllers: [createScriptedAgentController({ gate: gate.hold })],
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "exclusive",
        program: [{ do: "local_work", key: "k", produces: "done" }, { do: "observe" }, { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    const receipt = await harness.deliverExternalInput({
      destination: handle.executionId,
      label: "user.message",
      payload: "hello",
      correlationId: "anything",
    });
    assert.equal(receipt.status, "delivered", "the mailbox is not closed");
    if (receipt.status === "delivered") {
      assert.equal(receipt.wokeExecution, false, "but an Event cannot satisfy a controller-local dependency");
    }

    const still = await harness.inspect(handle.executionId);
    assert.equal(still?.lifecycle, "WAITING", "v0.4 suspends exclusively while a continuation is outstanding");
    assert.equal(still?.waitingFor?.kind, "controller_resumption");
    assert.equal((await store.peekMailbox(still!.mailbox.mailboxId)).length, 1, "the Event is retained, not dropped");
    assert.equal(await harness.runOnce(), null, "and no intervening Activation was scheduled");

    // Only the resumption settling makes it runnable, and the queued Event is observed after.
    gate.release("k");
    await harness.drainResumptions();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    await harness.runUntilIdle();
    const done = await harness.inspect(handle.executionId);
    assert.equal(done?.lifecycle, "COMPLETED");
    assert.deepEqual(readScriptedProgress(done!.control.progress).seenKinds, ["external.input"]);
  });

  test("settlement consults no authorizer, journals nothing, and creates no pending operation", async () => {
    let authorizerCalls = 0;
    const { harness, definitions, store } = createTestHarness({
      inlineWait: createNoInlineWaitBudget(),
      authorizer: {
        authorize() {
          authorizerCalls += 1;
          return { decision: "deny", code: "unreachable", message: "nothing should reach an authorizer here" };
        },
      },
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "no-effect-machinery",
        program: [
          { do: "local_work", key: "one", produces: 1 },
          { do: "local_work", key: "two", produces: 2 },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    for (let i = 0; i < 4; i++) {
      await harness.runUntilIdle();
      await harness.drainResumptions();
    }

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(authorizerCalls, 0, "controller-local work is not an Effect and is authorized by nobody");
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.deepEqual(await store.peekMailbox(context!.mailbox.mailboxId), []);
    assert.deepEqual(
      (await store.listTransitions(handle.executionId)).filter((t) => t.from === "WAITING").map((t) => t.reason),
      ["controller resumption res_1", "controller resumption res_2"],
      "every wake here was caused by a resumption, never by an Event",
    );
  });

  test("a failure is normalized identically whether it settles inline or later", async () => {
    const { fast, slow } = await bothPaths(
      [{ do: "local_work", key: "k", throws: "provider exploded" }, { do: "complete" }],
      "failure",
    );
    assert.equal(fast.lifecycle, "COMPLETED");
    assert.equal(slow.lifecycle, "COMPLETED");
    assert.deepEqual(fast.notes["k"], {
      failed: "controller_resumption_failed",
      message: "provider exploded",
    });
    assert.deepEqual(slow.notes["k"], fast.notes["k"], "one failure shape, both paths");
    assert.equal(fast.resumptions.length, 0, "the fast path needs no durable record");
    assert.equal(slow.resumptions.length, 1, "only the slow path leaves one");
    assert.deepEqual(slow.resumptions[0]!.failure, {
      code: "controller_resumption_failed",
      message: "provider exploded",
    });
  });

  test("a result that cannot be persisted fails on the fast path too", async () => {
    // The regression this guards against: normalizing only on the slow path, so an object graph
    // that could never have been stored succeeds purely because the work happened to be quick.
    const { fast, slow } = await bothPaths(
      [{ do: "local_work", key: "k", unserializable: true }, { do: "complete" }],
      "unpersistable",
    );
    for (const [label, run] of [
      ["fast", fast],
      ["slow", slow],
    ] as const) {
      const note = run.notes["k"] as { failed?: string; message?: string };
      assert.equal(note.failed, "invalid_controller_resumption_value", `${label}: settling inline is not a way past the JSON boundary`);
      assert.match(note.message ?? "", /cannot be persisted/);
    }
    assert.deepEqual(slow.notes["k"], fast.notes["k"]);
  });

  test("a successful value crosses the same JSON boundary on both paths", async () => {
    const { fast, slow } = await bothPaths(
      [{ do: "local_work", key: "k", produces: { nested: [1, "two", { three: true }] } }, { do: "complete" }],
      "value",
    );
    assert.deepEqual(fast.notes["k"], { settled: { nested: [1, "two", { three: true }] } });
    assert.deepEqual(slow.notes["k"], fast.notes["k"]);
    assert.equal(fast.lifecycle, slow.lifecycle);
    assert.ok(slow.activations > fast.activations, "only the Activation count differs");
  });

  test("work the controller never waited on is abandoned and can never wake the Execution", async () => {
    const { harness, definitions } = createTestHarness({ inlineWait: createNoInlineWaitBudget() });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "abandoned",
        program: [
          { do: "local_work", key: "orphan", produces: "never observed", abandon: true },
          { do: "emit", text: "still running" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    // Registering is not committing: the controller reported `continue`, so nothing durable names
    // this work and nothing is following its promise.
    assert.deepEqual(await harness.controllerResumptionsOf(handle.executionId), []);
    await harness.drainResumptions();
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED", "abandoned work neither blocks nor wakes anything");
    assert.deepEqual(await harness.controllerResumptionsOf(handle.executionId), []);
    assert.equal(readScriptedProgress(context!.control.progress).notes["orphan"], "abandoned");
  });

  test("a controller cannot name a resumption it never registered", async () => {
    const { harness, definitions } = createTestHarness();
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "fabricated", program: [{ do: "misreport", as: "unknown_resumption" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED", "an Execution is never parked on work nothing is following");
    assert.equal(context?.failure?.code, "invalid_controller_outcome:invalid_resumption");
    assert.deepEqual(await harness.controllerResumptionsOf(handle.executionId), [], "and no record was created");
  });

  test("there is no public way to settle a controller resumption", async () => {
    const { harness } = createTestHarness();
    const surface = new Set<string>();
    for (let proto = Object.getPrototypeOf(harness); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
      for (const name of Object.getOwnPropertyNames(proto)) surface.add(name);
    }
    for (const name of [...surface]) {
      if (name === "settleEffect") continue;
      assert.equal(
        /settle/i.test(name) && /resum/i.test(name),
        false,
        `Harness.${name} would let a caller hand a controller a result nothing produced`,
      );
    }
    assert.ok(surface.has("drainResumptions"), "advancing in-flight work is fine; reporting an outcome is not");
    assert.ok(surface.has("controllerResumptionsOf"), "read-only inspection is fine too");
  });

  test("a terminal Execution is never woken by late local work", async () => {
    const { harness, definitions } = createTestHarness({ inlineWait: createNoInlineWaitBudget() });
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "cut-short", program: [{ do: "local_work", key: "k", produces: "late" }] }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    // Settle first, then let the Execution reach a terminal state, then confirm nothing resurrects it.
    await harness.drainResumptions();
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED", "the script runs out, which is a semantic failure");

    const records: readonly ControllerResumption[] = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(records[0]!.state, "settled");
    await harness.drainResumptions();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "FAILED", "terminal states do not resume");
  });
});
