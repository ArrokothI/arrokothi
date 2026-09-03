/**
 * Slice G.2 — the runtime dependency-set (union) wait, exercised directly.
 *
 * A controller may report `await_dependencies`: an optional primary Event `WakeCondition` plus a set
 * of `ControllerResumptionId`s. The Harness validates every reported id, commits controller progress
 * and every newly-registered resumption record in ONE transaction, and derives WAITING on the set.
 *
 * ```text
 * Event + R1 + R2 persist as one dependency set (kind: "dependencies")
 * the Event member wakes the Execution WITHOUT invalidating R1 / R2  (this is NOT interleave)
 * R1 settling wakes the Execution WITHOUT invalidating R2 or satisfying the Event
 * R2 settling while already READY records its outcome and causes no second READY transition
 * a foreign / duplicate resumption id fails the Activation fail-closed
 * a terminal / cancelled Execution is never resurrected by a late member
 * the pre-existing single await_event / await_resumption / interleave paths are unchanged
 * failure atomicity: a failing branch discards this Activation's proposals and registrations
 * ```
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ControllerRegistry,
  Harness,
  defineWorkflow,
  readWorkflowControlState,
  useCapability,
} from "@arrokothi/core/execution";
import type {
  ActivationOutcome,
  CapabilityExecutor,
  EffectAuthorizer,
  ExecutionController,
} from "@arrokothi/core/ports";
import type { WorkflowSpecInput } from "@arrokothi/core/execution";
import type { StageExecutionContext } from "@arrokothi/core/ports";
import {
  FifoScheduler,
  InMemoryDefinitionStore,
  InMemoryRuntimeStore,
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createDeferredModelProvider,
  createDeterministicIds,
  createFixedClock,
  createFunctionStageRegistry,
  createNoInlineWaitBudget,
  StaticModelResolver,
  portableModelFeatures,
} from "@arrokothi/core/reference";
import { createWorkflowTestHarness, modelAccess, scriptedAgentDefinition } from "@arrokothi/core/testing";

const SEARCH = { capability: "knowledge.retrieval", operation: "search" } as const;

async function flush(times = 8): Promise<void> {
  for (let i = 0; i < times; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

const threeBranchResolver = () =>
  new StaticModelResolver({
    wC: { provider: "gamma", model: "g", portableFeatures: portableModelFeatures() },
    wE: { provider: "delta", model: "d", portableFeatures: portableModelFeatures() },
  });

/** fork P over B (Function + Effect), C (LLM), E (LLM), joining into d. */
function eventPlusTwoResumptionsSpec(): WorkflowSpecInput {
  const llm = (id: string, ref: string) => ({
    id,
    kind: "llm" as const,
    model: { logicalRef: ref, requirements: { text: true } },
    system: id,
    prompt: "{{input}}",
    transitions: { kind: "always" as const, next: { to: "join" as const, fork: "p" } },
  });
  return {
    entryStage: "a",
    forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }, { id: "e", stage: "e" }], join: { next: "d" } }],
    stages: [
      { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
      { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
      llm("c", "wC"),
      llm("e", "wE"),
      { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
    ],
  } as WorkflowSpecInput;
}

const bEffectThenComplete = (ctx: StageExecutionContext) =>
  ctx.progress["asked"] === true
    ? { status: "completed" as const, result: `B:${ctx.observations[0]?.outcome}` }
    : {
        status: "awaitEffects" as const,
        progress: { asked: true },
        effects: [{ key: "look", capability: SEARCH.capability, operation: SEARCH.operation, input: {} }],
      };

describe("Slice G.2: runtime dependency-set wake semantics", () => {
  test("(51)+(52)+(53) Event + R1 + R2 as one set; the Event wakes without invalidating R1/R2; R1 wakes without invalidating R2", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const gamma = createDeferredModelProvider("gamma");
    const delta = createDeferredModelProvider("delta");
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
      models: modelAccess(threeBranchResolver(), [gamma, delta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: bEffectThenComplete,
        d: (ctx) => {
          joinSeen.push(ctx.join);
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-e-r-r", spec: eventPlusTwoResumptionsSpec() }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: { operations: [SEARCH] } });
    await harness.runUntilIdle();

    // (51) one dependency set: the Event dependency for B, plus R for C and R for E.
    const waiting = await harness.inspect(handle.executionId);
    const wait = waiting!.waitingFor as { kind: "dependencies"; event: { eventKinds: readonly string[] } | null; resumptions: readonly string[] };
    assert.equal(wait.kind, "dependencies");
    assert.ok(wait.event !== null, "the Event member is present");
    assert.equal(wait.resumptions.length, 2, "R1 and R2 are both in the persisted set");
    assert.equal((await harness.pendingOperationsOf(handle.executionId)).length, 1, "one PendingOperation - B's Effect");
    const records0 = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(records0.length, 2);
    assert.ok(records0.every((record) => record.state === "pending"));

    // (52) the Event member wakes the Execution. R1 and R2 are NOT invalidated - this is not interleave.
    const call = capabilities.outstanding[0]!;
    await harness.settleEffect({
      pendingOperationId: call.request.pendingOperationId,
      effectId: call.request.effectId,
      outcome: { status: "success", observation: { hit: 1 } },
    });
    await harness.runUntilIdle();

    const afterEvent = await harness.controllerResumptionsOf(handle.executionId);
    assert.ok(afterEvent.every((record) => record.state === "pending"), "(52) neither branch resumption was invalidated by the Event wake");
    let state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "completed");
    const afterWait = (await harness.inspect(handle.executionId))!.waitingFor as { event: unknown; resumptions: readonly string[] };
    assert.equal(afterWait.event, null, "B is done, so the union wait is now resumption-only");
    assert.equal(afterWait.resumptions.length, 2);

    // (53) R1 (C's model call) settles -> wakes the Execution. R2 (E's) is NOT invalidated, and the
    // Event dependency is not "re-satisfied" - it is simply gone because B completed.
    gamma.settle({ text: "C-model" });
    await flush();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    await harness.runUntilIdle();

    state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "completed");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "e")!.status, "awaiting_resumption");
    const eRecord = (await harness.controllerResumptionsOf(handle.executionId)).find((record) => record.key.includes("/branch/e/"))!;
    assert.equal(eRecord.state, "pending", "R2 remained valid while R1 woke the Execution");

    delta.settle({ text: "E-model" });
    await flush();
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C-model" },
      { branchId: "e", stageId: "e", result: "E-model" },
    ]);
    // No Event / PendingOperation / Effect journal for either model call - only B's one Effect.
    assert.equal((await harness.effectJournalOf(handle.executionId)).filter((entry) => entry.phase === "requested").length, 1);
  });

  test("(57) a cancelled Execution waiting on a dependency set is not resurrected by a late member", async () => {
    const alpha = createDeferredModelProvider("alpha");
    const beta = createDeferredModelProvider("beta");
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(
        new StaticModelResolver({
          wB: { provider: "alpha", model: "a", portableFeatures: portableModelFeatures() },
          wC: { provider: "beta", model: "b", portableFeatures: portableModelFeatures() },
        }),
        [alpha, beta],
      ),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const spec: WorkflowSpecInput = {
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "b", kind: "llm", model: { logicalRef: "wB", requirements: { text: true } }, system: "b", prompt: "{{input}}", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "c", kind: "llm", model: { logicalRef: "wC", requirements: { text: true } }, system: "c", prompt: "{{input}}", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await definitions.save(defineWorkflow({ id: "g2-cancel-union", spec }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.waitingFor?.kind, "dependencies");

    const receipt = await harness.cancelExecution({ executionId: handle.executionId, reason: "stop" });
    assert.equal(receipt.status, "cancelled");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "CANCELLED");

    // Both model calls now answer. A terminal Execution does not resume.
    alpha.settle({ text: "late-B" });
    beta.settle({ text: "late-C" });
    await flush();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "CANCELLED", "no member resurrected the cancelled Execution");
    assert.equal(await harness.runOnce(), null, "and no Activation was scheduled");
  });
});

/** A minimal Agent-kind controller that reports whatever `await_dependencies` the test wants. */
function forgingController(build: (ids: { r1: string; r2: string }) => ActivationOutcome["next"]): ExecutionController {
  return {
    kind: "agent",
    async activate(_input, resumptions): Promise<ActivationOutcome> {
      const a1 = await resumptions.run("R1", () => new Promise(() => {}));
      const a2 = await resumptions.run("R2", () => new Promise(() => {}));
      const r1 = a1.status === "suspended" ? a1.resumptionId : "res_x";
      const r2 = a2.status === "suspended" ? a2.resumptionId : "res_y";
      return { control: { kind: "agent", progress: {} }, next: build({ r1, r2 }) };
    },
  };
}

function forgingRig(
  controller: ExecutionController,
  options: {
    readonly authorizer?: EffectAuthorizer;
    readonly capabilities?: CapabilityExecutor;
  } = {},
) {
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
    ...(options.authorizer !== undefined ? { authorizer: options.authorizer } : {}),
    ...(options.capabilities !== undefined ? { capabilities: options.capabilities } : {}),
  });
  return { harness, definitions, store };
}

describe("Slice G.2: dependency-set validation is fail-closed", () => {
  test("an invalid dependency set is rejected before a real Effect crosses the Harness boundary", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const controller: ExecutionController = {
      kind: "agent",
      async activate(_input, resumptions): Promise<ActivationOutcome> {
        const attempt = await resumptions.run("valid", () => new Promise(() => {}));
        assert.equal(attempt.status, "suspended");
        const valid = attempt.status === "suspended" ? attempt.resumptionId : "res_unreachable";
        return {
          control: { kind: "agent", progress: {} },
          effects: [
            useCapability({
              capability: SEARCH.capability,
              operation: SEARCH.operation,
              input: {},
              requestKey: "real-effect",
            }),
          ],
          next: {
            status: "await_dependencies",
            event: {
              eventKinds: ["capability.completed", "capability.failed"],
              correlationId: "real-effect",
            },
            resumptions: [valid as never, "res_foreign_999" as never],
          },
        };
      },
    };
    const { harness, definitions } = forgingRig(controller, {
      authorizer: createAllowListAuthorizer({ grants: [{ capability: SEARCH.capability }] }),
      capabilities,
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "forge-foreign-with-effect", program: [{ do: "complete" }] }),
    );
    const handle = await harness.createExecution({
      definition: ref,
      operationAuthority: { operations: [SEARCH] },
    });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.match(context?.failure?.code ?? "", /invalid_resumption/);
    assert.equal(capabilities.callCount, 0, "the executor is never called for a rejected outcome");
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "no Effect request was journaled");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), [], "no PendingOperation was created");
    assert.deepEqual(
      await harness.controllerResumptionsOf(handle.executionId),
      [],
      "the otherwise-valid new registration was not partially committed",
    );
  });

  test("(55) a foreign resumption id in the set fails the Activation, and no record is created", async () => {
    const { harness, definitions } = forgingRig(
      forgingController(({ r1 }) => ({ status: "await_dependencies", resumptions: [r1 as never, "res_forged_999" as never] })),
    );
    const ref = await definitions.save(scriptedAgentDefinition({ id: "forge-foreign", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.match(context?.failure?.code ?? "", /invalid_resumption/);
    assert.deepEqual(await harness.controllerResumptionsOf(handle.executionId), [], "no partial dependency set was committed");
  });

  test("(56) a duplicate resumption id in the set is rejected", async () => {
    const { harness, definitions } = forgingRig(
      forgingController(({ r1 }) => ({ status: "await_dependencies", resumptions: [r1 as never, r1 as never] })),
    );
    const ref = await definitions.save(scriptedAgentDefinition({ id: "forge-dup", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.match(context?.failure?.code ?? "", /invalid_resumption|invalid_next/);
  });

  test("await_dependencies with neither an event nor a resumption is rejected", async () => {
    const { harness, definitions } = forgingRig(forgingController(() => ({ status: "await_dependencies" })));
    const ref = await definitions.save(scriptedAgentDefinition({ id: "forge-empty", program: [{ do: "complete" }] }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "FAILED");
  });
});

describe("Slice G.2: failure atomicity", () => {
  const forkSpec: WorkflowSpecInput = {
    entryStage: "a",
    forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
    stages: [
      { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
      { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
      { id: "c", kind: "function", implementationRef: "c", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
      { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
    ],
  };

  test("(48) B proposes an Effect while C fails: the Workflow fails and B's proposal is never dispatched or journaled", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "awaitEffects", effects: [{ key: "x", capability: SEARCH.capability, operation: SEARCH.operation, input: {} }] }),
        c: () => ({ status: "failed", code: "c_broke", message: "C could not compute" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-atomic-effect", spec: forkSpec }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: { operations: [SEARCH] } });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_failed:c_broke");
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "B's Effect proposal was discarded, not dispatched");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.equal(capabilities.callCount, 0);
  });

  test("(49) B starts a model resumption while C fails: no durable orphan resumption survives the failed Activation", async () => {
    const alpha = createDeferredModelProvider("alpha");
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(new StaticModelResolver({ wB: { provider: "alpha", model: "a", portableFeatures: portableModelFeatures() } }), [alpha]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        c: () => ({ status: "failed", code: "c_broke", message: "C could not compute" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const spec: WorkflowSpecInput = {
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "b", kind: "llm", model: { logicalRef: "wB", requirements: { text: true } }, system: "b", prompt: "{{input}}", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "c", kind: "function", implementationRef: "c", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await definitions.save(defineWorkflow({ id: "g2-atomic-resumption", spec }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_failed:c_broke");
    assert.deepEqual(await harness.controllerResumptionsOf(handle.executionId), [], "(49) B's unreported registration was abandoned, never committed");
    // The abandoned provider promise may still resolve; it wakes nothing.
    alpha.settle({ text: "late" });
    await flush();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "FAILED");
  });

  test("(50) two branch failures choose the primary by authored order, not wall-clock order", async () => {
    let released!: () => void;
    const gateB = new Promise<void>((resolve) => { released = resolve; });
    const order: string[] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: async () => {
          await gateB;
          order.push("b");
          return { status: "failed", code: "b_broke", message: "B failed second" };
        },
        c: () => {
          order.push("c");
          return { status: "failed", code: "c_broke", message: "C failed first" };
        },
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-atomic-order", spec: forkSpec }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runOnce(); // A -> fork
    const activation = harness.runOnce();
    await flush(2);
    assert.deepEqual(order, ["c"], "C failed first in wall-clock time");
    released();
    await activation;

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_failed:b_broke", "authored order: B is the primary failure");
    assert.deepEqual(order, ["c", "b"]);
  });
});

describe("Slice G.2: G.1 fork/join still holds under G.2, and the vocabularies stay closed", () => {
  test("(61)-(67) a pure local Function fork still journals no Effect, no resumption; joinReady + coordinates truthful", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "completed", result: "B" }),
        c: () => ({ status: "completed", result: "C" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const spec: WorkflowSpecInput = {
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "c", kind: "function", implementationRef: "c", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await definitions.save(defineWorkflow({ id: "g2-regression", spec }));
    const handle = await harness.createExecution({ definition: ref });

    await harness.runOnce(); // A -> fork
    await harness.runOnce(); // branches run
    const mid = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(mid.parallel?.joinReady, true, "(63) the explicit joinReady boundary remains");
    assert.equal(mid.currentStage, "a");
    assert.equal(mid.visit, 1, "(64) currentStage + visit stay truthful");
    assert.equal(mid.visits, 3, "(65) visit allocation stayed monotone");
    assert.equal(mid.parallel?.forkVisit, 1, "(66) forkVisit is independent of visit allocation");
    assert.deepEqual(mid.parallel?.branches.map((branch) => branch.barrier), [[], []], "no branch barrier for a pure local branch");

    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "(61) empty Effect journal for a pure local fork");
    assert.deepEqual(await harness.controllerResumptionsOf(handle.executionId), [], "and no ControllerResumption");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
  });

  test("(67) no new Stage / Effect / Event kind; 'dependencies' is a wait kind, never an Event kind", async () => {
    const { STAGE_KINDS, EFFECT_KINDS, EVENT_KINDS } = await import("@arrokothi/core/execution");
    assert.deepEqual([...STAGE_KINDS], ["function", "llm", "agent", "workflow"]);
    assert.deepEqual([...EFFECT_KINDS], ["use_capability", "write_memory", "spawn_execution", "send_message", "request_user_input"]);
    for (const invented of ["dependencies", "await_dependencies", "branch", "fork", "join"]) {
      assert.equal((EVENT_KINDS as readonly string[]).includes(invented), false, `"${invented}" is not an Event kind`);
    }
  });
});
