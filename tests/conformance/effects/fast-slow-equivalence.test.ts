/**
 * Fast and slow are the same Effect.
 *
 * The centre of the gateway. One semantic request - the same capability, the same operation, the
 * same payload, the same controller script - is run twice: once where the executor answers inside
 * the Activation's inline wait budget, and once where it answers only after the Execution has gone
 * WAITING and been woken by the result.
 *
 * The two runs must be indistinguishable to the controller. Same Event kind, same body, same
 * correlation, same pending-operation outcome, same final lifecycle, same terminal result. What
 * differs is scheduling: how many Activations the runtime needed and whether it passed through
 * WAITING. That is an operational fact, and nothing semantic is allowed to depend on it.
 *
 * Two ways of being slow are exercised, because they fail differently. An executor that genuinely
 * has not answered yet proves the pending/wake path; an executor that *could* have answered inline
 * but was denied the budget proves that the difference really is only the budget.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { LifecycleState } from "@agent-sdk/core/execution";
import {
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
  createTimeoutInlineBudget,
} from "@agent-sdk/core/reference";
import { microtaskInlineWaitBudget } from "@agent-sdk/core/ports";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@agent-sdk/core/testing";
import type { JsonValue } from "@agent-sdk/core/execution";

/** The one scenario, authored once so neither run can quietly differ from the other. */
const scenario = () =>
  scriptedAgentDefinition({
    id: "same-request",
    terminalResult: {
      schemaId: "answer",
      schemaVersion: 1,
      schema: { kind: "object", fields: { hits: { schema: { kind: "number" }, required: true } } },
    },
    program: [
      { do: "remember", key: "asked", value: true },
      { do: "use_capability", capability: "knowledge.query", operation: "search", input: { q: "revenue" }, requestKey: "search-1" },
      { do: "emit", text: "found it" },
      { do: "complete", result: { hits: 2 } },
    ],
  });

const policy = () =>
  createAllowListAuthorizer({ grants: [{ capability: "knowledge.query", operations: ["search"] }] });

const OBSERVATION: JsonValue = { hits: ["alpha", "beta"] };

interface Semantics {
  readonly lifecycle: LifecycleState;
  readonly terminalResult: JsonValue;
  readonly seenKinds: readonly string[];
  readonly observations: readonly JsonValue[];
  readonly emissions: readonly string[];
  readonly pendingCorrelations: readonly string[];
  readonly pendingStatuses: readonly string[];
  readonly pendingOutcomes: readonly (string | null)[];
  readonly journalPhases: readonly string[];
}

/**
 * Everything the Execution ends up meaning, with every runtime-minted identifier stripped out.
 *
 * Ids and timestamps legitimately differ between runs; anything else differing would be a semantic
 * divergence between the fast and slow paths.
 */
async function semanticsOf(harness: ReturnType<typeof createTestHarness>["harness"], executionId: never): Promise<Semantics> {
  const context = await harness.inspect(executionId);
  const progress = readScriptedProgress(context!.control.progress);
  const pending = await harness.pendingOperationsOf(executionId);
  const journal = await harness.effectJournalOf(executionId);
  const emissions = await harness.emissionsOf(executionId);

  return {
    lifecycle: context!.lifecycle,
    terminalResult: context!.terminalResult!.value,
    seenKinds: progress.seenKinds,
    observations: progress.observations.map(stripIds),
    emissions: emissions.map((emission) => (emission.body.kind === "text" ? emission.body.text : "")),
    pendingCorrelations: pending.map((operation) => operation.correlationId),
    pendingStatuses: pending.map((operation) => operation.status),
    pendingOutcomes: pending.map((operation) => operation.outcome),
    journalPhases: journal.map((entry) => entry.phase),
  };
}

function stripIds(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return value;
  const copy: Record<string, JsonValue> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "effectId" || key === "pendingOperationId") continue;
    copy[key] = child;
  }
  return copy;
}

/** The operational half: how the runtime got there, which is allowed to differ. */
interface Operations {
  readonly activations: number;
  readonly waited: boolean;
  readonly transitions: readonly string[];
}

async function runFast(): Promise<{ semantics: Semantics; operations: Operations }> {
  const { harness, definitions } = createTestHarness({
    authorizer: policy(),
    capabilities: createScriptedCapabilityExecutor({
      handlers: { "knowledge.query:search": () => ({ status: "success", observation: OBSERVATION }) },
    }),
  });
  const ref = await definitions.save(scenario());
  const handle = await harness.createExecution({ definition: ref });
  const records = await harness.runUntilIdle();
  return {
    semantics: await semanticsOf(harness, handle.executionId as never),
    operations: await operationsOf(harness, handle.executionId as never, records.length),
  };
}

/** Slow because the executor genuinely has not answered yet. */
async function runDeferred(): Promise<{ semantics: Semantics; operations: Operations }> {
  const executor = createDeferredCapabilityExecutor();
  const { harness, definitions } = createTestHarness({ authorizer: policy(), capabilities: executor });
  const ref = await definitions.save(scenario());
  const handle = await harness.createExecution({ definition: ref });

  const first = await harness.runUntilIdle();
  assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "the slow run really did wait");
  assert.equal(executor.outstanding.length, 1, "and really did have work outstanding");

  executor.completeAll(OBSERVATION);
  await harness.drainEffects();
  const second = await harness.runUntilIdle();

  return {
    semantics: await semanticsOf(harness, handle.executionId as never),
    operations: await operationsOf(harness, handle.executionId as never, first.length + second.length),
  };
}

/**
 * Slow only because the Activation was denied the budget to wait for an answerable executor.
 *
 * Whether this run passes through WAITING is genuinely undetermined - the result may land in the
 * mailbox before the Harness derives the next lifecycle state, in which case keeping the Execution
 * runnable is the correct answer. That indeterminacy is the point: it must not change anything the
 * controller can observe.
 */
async function runBudgetStarved(): Promise<{ semantics: Semantics; operations: Operations }> {
  const { harness, definitions } = createTestHarness({
    authorizer: policy(),
    capabilities: createScriptedCapabilityExecutor({
      handlers: { "knowledge.query:search": () => ({ status: "success", observation: OBSERVATION }) },
    }),
    inlineWait: createNoInlineWaitBudget(),
  });
  const ref = await definitions.save(scenario());
  const handle = await harness.createExecution({ definition: ref });

  const first = await harness.runUntilIdle();
  await harness.drainEffects();
  const second = await harness.runUntilIdle();

  return {
    semantics: await semanticsOf(harness, handle.executionId as never),
    operations: await operationsOf(harness, handle.executionId as never, first.length + second.length),
  };
}

async function operationsOf(
  harness: ReturnType<typeof createTestHarness>["harness"],
  executionId: never,
  activations: number,
): Promise<Operations> {
  const transitions = (await harness.transitionsOf(executionId)).map((record) => `${record.from}->${record.to}`);
  return { activations, waited: transitions.includes("RUNNING->WAITING"), transitions };
}

describe("fast and slow Effect completion are semantically identical", () => {
  test("the fast path settles inline and never suspends the Execution", async () => {
    const fast = await runFast();
    assert.equal(fast.operations.waited, false, "an Effect that answered in time did not force a WAITING round trip");
    assert.equal(fast.semantics.lifecycle, "COMPLETED");
    assert.deepEqual(fast.semantics.seenKinds, ["capability.completed"]);
  });

  test("the slow path suspends, is woken by the result, and reaches the same outcome", async () => {
    const slow = await runDeferred();
    assert.equal(slow.operations.waited, true, "the Execution genuinely waited");
    assert.ok(
      slow.operations.transitions.includes("WAITING->READY"),
      "and was made runnable again by the arriving result, not by a save or a poll",
    );
    assert.equal(slow.semantics.lifecycle, "COMPLETED");
    assert.deepEqual(slow.semantics.seenKinds, ["capability.completed"]);
    assert.deepEqual(slow.semantics.pendingStatuses, ["settled"]);
    assert.deepEqual(slow.semantics.pendingOutcomes, ["success"]);
  });

  test("the same request through both paths produces identical semantics", async () => {
    const fast = await runFast();
    const slow = await runDeferred();

    assert.deepEqual(slow.semantics, fast.semantics, "nothing a controller can observe depends on latency");

    // What did differ is entirely operational, and lives in the lifecycle history rather than in
    // anything the Execution or its controller can read.
    assert.notDeepEqual(slow.operations.transitions, fast.operations.transitions);
    assert.equal(fast.operations.waited, false);
    assert.equal(slow.operations.waited, true);
  });

  test("an Effect that could have completed inline is unchanged by being denied the budget", async () => {
    const fast = await runFast();
    const starved = await runBudgetStarved();

    assert.deepEqual(starved.semantics, fast.semantics, "the inline budget is a scheduling choice, not a semantic one");
    assert.deepEqual(starved.semantics.pendingStatuses, ["settled"], "the operation still settled exactly once");
  });

  test("the result Event body carries no trace of how long the Effect took", async () => {
    const fast = await runFast();
    const slow = await runDeferred();

    const fastBody = fast.semantics.observations[0] as Record<string, JsonValue>;
    const slowBody = slow.semantics.observations[0] as Record<string, JsonValue>;
    assert.deepEqual(Object.keys(fastBody).sort(), Object.keys(slowBody).sort());
    for (const key of Object.keys(fastBody)) {
      assert.deepEqual(slowBody[key], fastBody[key], `${key} is identical in both paths`);
    }
    const serialized = JSON.stringify(fastBody);
    for (const leak of ["inline", "deferred", "elapsed", "duration", "latency", "fast", "slow"]) {
      assert.ok(!serialized.includes(leak), `the observation must not expose "${leak}"`);
    }
  });

  test("every inline wait budget answers the same two questions and disturbs nothing", async () => {
    // A budget only decides whether the Activation keeps waiting. It never cancels, rejects, or
    // otherwise touches the work, because the Harness still owns that promise and will settle the
    // operation whenever it resolves.
    const budgets = [
      { name: "microtask (the deterministic default)", budget: microtaskInlineWaitBudget() },
      { name: "wall clock", budget: createTimeoutInlineBudget(50) },
      { name: "never wait", budget: createNoInlineWaitBudget() },
    ];

    for (const { name, budget } of budgets) {
      const answered = await budget.race(Promise.resolve("done"));
      if (name === "never wait") {
        assert.equal(answered.settled, false, `${name}: refuses to wait even for an answer already available`);
      } else {
        assert.deepEqual(answered, { settled: true, value: "done" }, `${name}: an available answer is taken inline`);
      }

      let resolve!: (value: string) => void;
      const outstanding = new Promise<string>((r) => {
        resolve = r;
      });
      const yielded = await budget.race(outstanding);
      assert.equal(yielded.settled, false, `${name}: work that has not answered yet does not hold the Activation`);

      // And the work it stopped waiting for is untouched.
      resolve("late");
      assert.equal(await outstanding, "late", `${name}: the abandoned work still completes normally`);
    }
  });

  test("both paths journal the same phases in the same order", async () => {
    const fast = await runFast();
    const slow = await runDeferred();

    assert.deepEqual(fast.semantics.journalPhases, ["requested", "authorized", "dispatch_started", "completed"]);
    assert.deepEqual(slow.semantics.journalPhases, fast.semantics.journalPhases);
  });
});
