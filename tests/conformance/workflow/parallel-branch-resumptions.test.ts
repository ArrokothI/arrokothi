/**
 * Slice G.2 — parallel branch ControllerResumptions and the mixed Event + resumption union wait.
 *
 * A parallel branch may be mid a slow *model* call while a sibling branch waits on an Effect result,
 * all inside one Workflow Execution. What these cases hold true:
 *
 * ```text
 * two sibling LLM branches derive two DISTINCT branch-qualified resumption keys
 * both resumptions are durably represented while the Execution waits on the union
 * one resumption settling makes the Execution READY without invalidating the other
 * a resumption that settles while the Execution is already READY records its outcome, no dup wake
 * resuming reconstructs the same model call - the provider is invoked once per branch phase
 * no Event, no PendingOperation, and no Effect journal entry for a branch model call
 * an inline Effect result keeps the Workflow runnable without abandoning a suspended sibling
 * a fresh WorkflowController over the same store continues from persisted branch + resumption state
 * ```
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ControllerRegistry,
  Harness,
  createWorkflowController,
  defineWorkflow,
  readWorkflowControlState,
} from "@agent-sdk/core/execution";
import type { WorkflowSpecInput } from "@agent-sdk/core/execution";
import type { StageExecutionContext } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createDeferredModelProvider,
  createFunctionStageRegistry,
  StaticModelResolver,
  portableModelFeatures,
} from "@agent-sdk/core/reference";
import { createWorkflowTestHarness, modelAccess } from "@agent-sdk/core/testing";

const SEARCH = { capability: "knowledge.retrieval", operation: "search" } as const;

/**
 * Lets a just-settled resumption propagate (commit + wake) without `drainResumptions()`, which would
 * block on a *sibling* branch resumption that is still legitimately outstanding.
 */
async function flush(times = 8): Promise<void> {
  for (let i = 0; i < times; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

/** A resolver that maps `wB` -> provider `alpha` and `wC` -> provider `beta`, so each branch's slow model call can be settled on its own. */
const twoModelResolver = () =>
  new StaticModelResolver({
    wB: { provider: "alpha", model: "alpha-1", portableFeatures: portableModelFeatures() },
    wC: { provider: "beta", model: "beta-1", portableFeatures: portableModelFeatures() },
  });

function llmBranchStage(id: string, logicalRef: string): WorkflowSpecInput["stages"][number] {
  return {
    id,
    kind: "llm",
    model: { logicalRef, requirements: { text: true } },
    system: `branch ${id}`,
    prompt: "{{input}}",
    transitions: { kind: "always", next: { to: "join", fork: "p" } },
  };
}

/** entry a -> fork P (branches B, C) -> join -> d, with B and C authored in that order. */
function twoLLMBranchSpec(): WorkflowSpecInput {
  return {
    entryStage: "a",
    forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
    stages: [
      { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
      llmBranchStage("b", "wB"),
      llmBranchStage("c", "wC"),
      { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
    ],
  };
}

describe("Slice G.2: multiple parallel branch ControllerResumptions", () => {
  test("two LLM branches start model work; two branch-qualified keys; C settles first, B stays valid and later recovers once", async () => {
    const alpha = createDeferredModelProvider("alpha");
    const beta = createDeferredModelProvider("beta");
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(twoModelResolver(), [alpha, beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        d: (ctx) => {
          joinSeen.push(ctx.join);
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-two-llm", spec: twoLLMBranchSpec() }));
    const handle = await harness.createExecution({ definition: ref });

    // A -> fork, then one Activation runs both branch model calls and both suspend.
    await harness.runUntilIdle();

    const waiting = await harness.inspect(handle.executionId);
    assert.equal(waiting?.lifecycle, "WAITING");
    assert.equal(waiting?.waitingFor?.kind, "dependencies", "(51)+(26) the Execution waits on the dependency SET");
    const wait = waiting!.waitingFor as { kind: "dependencies"; event: unknown; resumptions: readonly string[] };
    assert.equal(wait.event, null, "resumption-only union wait: no Event dependency");
    assert.equal(wait.resumptions.length, 2, "(26) both branch resumptions are durably represented");

    // (25) Two distinct branch-qualified resumption keys, one per branch, from persisted coordinates.
    const records = await harness.controllerResumptionsOf(handle.executionId);
    assert.deepEqual(
      records.map((record) => record.key).sort(),
      ["wf/fork/p#1/branch/b/stage/b#2/model/phase1", "wf/fork/p#1/branch/c/stage/c#3/model/phase1"],
    );
    assert.ok(records.every((record) => record.state === "pending"));

    // (31) No Event, no PendingOperation, no Effect journal for either model call.
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);

    // (27)+(28) C settles first -> the Execution becomes READY.
    beta.settle({ text: "C-answer" });
    await flush();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    await harness.runUntilIdle();

    // (29) B remains valid/pending - it was NOT invalidated by C's progress.
    let state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "completed");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "awaiting_resumption");
    const bRecord = (await harness.controllerResumptionsOf(handle.executionId)).find((record) => record.key.includes("/branch/b/"))!;
    assert.equal(bRecord.state, "pending", "B's resumption is still pending, not invalidated");

    // (30) B later settles and is recovered - the provider is invoked once, not twice.
    alpha.settle({ text: "B-answer" });
    await flush();
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(alpha.invocationCount, 1, "(30) B's model call was reconstructed, never dispatched a second time");
    assert.equal(beta.invocationCount, 1);
    // Join result order stays authored: B, then C.
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B-answer" },
      { branchId: "c", stageId: "c", result: "C-answer" },
    ]);
    // (31) still no Event / PendingOperation / Effect journal for either.
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
  });

  test("(54) a resumption that settles while the Execution is already READY records its outcome without a second READY transition", async () => {
    const alpha = createDeferredModelProvider("alpha");
    const beta = createDeferredModelProvider("beta");
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(twoModelResolver(), [alpha, beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-ready-race", spec: twoLLMBranchSpec() }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    // C settles -> READY. Then B settles *before the next Activation runs* - the Execution is
    // already READY, so B's outcome is recorded but no second WAITING->READY transition happens.
    beta.settle({ text: "C" });
    await flush();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    alpha.settle({ text: "B" });
    await flush();

    const transitions = await harness.transitionsOf(handle.executionId);
    const readyFromWaiting = transitions.filter((entry) => entry.from === "WAITING" && entry.to === "READY");
    assert.equal(readyFromWaiting.length, 1, "exactly one WAITING->READY, caused by C; B settled into an already-READY Execution");
    const bRecord = (await harness.controllerResumptionsOf(handle.executionId)).find((record) => record.key.includes("/branch/b/"))!;
    assert.equal(bRecord.state, "settled", "B's outcome is still recorded");

    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(alpha.invocationCount, 1);
  });

  test("(23) reversing the settlement order (B first, then C) has equivalent semantics", async () => {
    const alpha = createDeferredModelProvider("alpha");
    const beta = createDeferredModelProvider("beta");
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(twoModelResolver(), [alpha, beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        d: (ctx) => {
          joinSeen.push(ctx.join);
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-reverse", spec: twoLLMBranchSpec() }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    alpha.settle({ text: "B-answer" });
    await flush();
    await harness.runUntilIdle();
    let state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "completed");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "awaiting_resumption");

    beta.settle({ text: "C-answer" });
    await flush();
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B-answer" },
      { branchId: "c", stageId: "c", result: "C-answer" },
    ]);
  });
});

describe("Slice G.2: mixed Event + ControllerResumption union wait", () => {
  /** entry a -> fork(B: Function+Effect, C: LLM) -> join -> d. */
  function mixedSpec(): WorkflowSpecInput {
    return {
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        {
          id: "c",
          kind: "llm",
          model: { logicalRef: "wC", requirements: { text: true } },
          system: "branch C",
          prompt: "{{input}}",
          transitions: { kind: "always", next: { to: "join", fork: "p" } },
        },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
  }

  const effectBranchB = (ctx: StageExecutionContext) =>
    ctx.progress["asked"] === true
      ? { status: "completed" as const, result: `B:${ctx.observations[0]?.outcome}` }
      : {
          status: "awaitEffects" as const,
          progress: { asked: true },
          effects: [{ key: "look", capability: SEARCH.capability, operation: SEARCH.operation, input: {} }],
        };

  test("one Activation honestly reports both an Effect dependency and a slow model resumption; model settles first", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const beta = createDeferredModelProvider("beta");
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
      models: modelAccess(twoModelResolver(), [beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: effectBranchB,
        d: (ctx) => {
          joinSeen.push(ctx.join);
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-mixed", spec: mixedSpec() }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: { operations: [SEARCH] } });

    // (15)+(16)+(17)+(18) one Activation: B awaits a slow Effect, C suspends on a slow model call.
    await harness.runUntilIdle();
    const waiting = await harness.inspect(handle.executionId);
    assert.equal(waiting?.lifecycle, "WAITING");
    const wait = waiting!.waitingFor as { kind: "dependencies"; event: { eventKinds: readonly string[] } | null; resumptions: readonly string[] };
    assert.equal(wait.kind, "dependencies");
    assert.ok(wait.event !== null, "the Event dependency for B's Effect is reported");
    assert.equal(wait.resumptions.length, 1, "and C's model resumption is reported too - one honest union wait");
    assert.equal((await harness.pendingOperationsOf(handle.executionId)).length, 1, "B's Effect PendingOperation - and nothing for C's model call");
    assert.equal((await harness.controllerResumptionsOf(handle.executionId)).length, 1);

    // (19)+(20) the model resumption settles first -> READY; C advances/completes while B pending.
    beta.settle({ text: "C-model" });
    await harness.drainResumptions();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "READY");
    await harness.runUntilIdle();

    let state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "completed");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "awaiting_effects", "B is still pending its Effect");
    assert.equal(beta.invocationCount, 1);

    // (21) B settling later -> B advances. (22) C's model call is not invoked a second time.
    const call = capabilities.outstanding[0]!;
    await harness.settleEffect({
      pendingOperationId: call.request.pendingOperationId,
      effectId: call.request.effectId,
      outcome: { status: "success", observation: { hit: 1 } },
    });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(beta.invocationCount, 1, "(22) C's already-settled model call was not invoked twice");
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C-model" },
    ]);
  });

  test("(32)-(36) fast mixed path: an inline Effect result keeps the Workflow runnable while a sibling model resumption is still committed and attached", async () => {
    // B's Effect settles INLINE (scripted executor); C's model call is genuinely slow (deferred).
    const beta = createDeferredModelProvider("beta");
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities: {
        async execute() {
          return { status: "success", observation: { inline: true } };
        },
      },
      models: modelAccess(twoModelResolver(), [beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: effectBranchB,
        d: (ctx) => {
          joinSeen.push(ctx.join);
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-fast-mixed", spec: mixedSpec() }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: { operations: [SEARCH] } });

    // (33) The Activation that reports the union wait also proposes B's Effect; its result is already
    // in the mailbox, so the Execution stays runnable rather than parking on the whole set.
    await harness.runUntilIdle();

    // (34)+(35) C's resumption is durably committed and still being followed - not abandoned.
    const records = await harness.controllerResumptionsOf(handle.executionId);
    assert.equal(records.length, 1, "C's model resumption was committed even though B's Effect won the race");
    assert.equal(records[0]!.state, "pending");
    assert.match(records[0]!.key, /\/branch\/c\/stage\/c#3\/model\/phase1$/);

    // B advanced from its inline observation without waiting; the Execution is now WAITING only on C.
    let state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "completed");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "awaiting_resumption");
    const nowWaiting = await harness.inspect(handle.executionId);
    assert.equal(nowWaiting?.lifecycle, "WAITING");
    assert.equal((nowWaiting!.waitingFor as { kind: string }).kind, "dependencies");

    // (36) C's resumption settles and drives the ordinary path - one wake, then completion.
    beta.settle({ text: "C-final" });
    await harness.drainResumptions();
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(beta.invocationCount, 1);
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C-final" },
    ]);
  });

  test("(37)+(38) an adapter-free Function branch and an adapter-free LLM branch both work in one fork", async () => {
    const beta = createDeferredModelProvider("beta");
    const { harness, definitions } = createWorkflowTestHarness({
      models: modelAccess(twoModelResolver(), [beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: (ctx) => ({ status: "completed", result: `local:${ctx.input}` }),
        d: (ctx) => ({ status: "completed", result: JSON.stringify(ctx.join!.branches.map((branch) => branch.result)) }),
      }),
    });
    const spec: WorkflowSpecInput = {
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        {
          id: "c",
          kind: "llm",
          model: { logicalRef: "wC", requirements: { text: true } },
          system: "c",
          prompt: "{{input}}",
          transitions: { kind: "always", next: { to: "join", fork: "p" } },
        },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await definitions.save(defineWorkflow({ id: "g2-fn-and-llm", spec }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    beta.settle({ text: "model-line" });
    await harness.drainResumptions();
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    const result = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!.provisionalResult;
    assert.deepEqual(JSON.parse(result ?? "[]"), ["local:seed", "model-line"]);
  });
});

describe("Slice G.2: reconstruction from persisted branch + runtime dependency state", () => {
  test("a fresh WorkflowController over the same store continues a branch Effect + a branch ControllerResumption", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const beta = createDeferredModelProvider("beta");
    const first = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
      models: modelAccess(twoModelResolver(), [beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: (ctx: StageExecutionContext) =>
          ctx.progress["asked"] === true
            ? { status: "completed", result: `B:${ctx.observations[0]?.outcome}` }
            : { status: "awaitEffects", progress: { asked: true }, effects: [{ key: "look", capability: SEARCH.capability, operation: SEARCH.operation, input: {} }] },
        d: (ctx: StageExecutionContext) => ({ status: "completed", result: JSON.stringify(ctx.join!.branches) }),
      }),
    });
    const spec: WorkflowSpecInput = {
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        {
          id: "c",
          kind: "llm",
          model: { logicalRef: "wC", requirements: { text: true } },
          system: "c",
          prompt: "{{input}}",
          transitions: { kind: "always", next: { to: "join", fork: "p" } },
        },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await first.definitions.save(defineWorkflow({ id: "g2-reconstruct", spec }));
    const handle = await first.harness.createExecution({ definition: ref, operationAuthority: { operations: [SEARCH] } });
    await first.harness.runUntilIdle();

    const before = readWorkflowControlState((await first.harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(before.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "awaiting_effects");
    assert.equal(before.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "awaiting_resumption");
    const beforeWait = (await first.harness.inspect(handle.executionId))!.waitingFor;

    // A brand-new Harness + WorkflowController over the SAME persisted store/scheduler/records.
    const rebuilt = new Harness({
      definitions: first.definitions,
      store: first.store,
      scheduler: first.scheduler,
      controllers: new ControllerRegistry([
        createWorkflowController({
          models: modelAccess(twoModelResolver(), [beta]),
          functions: createFunctionStageRegistry({
            a: () => ({ status: "completed", result: "seed" }),
            b: (ctx: StageExecutionContext) =>
              ctx.progress["asked"] === true
                ? { status: "completed", result: `B:${ctx.observations[0]?.outcome}` }
                : { status: "awaitEffects", progress: { asked: true }, effects: [{ key: "look", capability: SEARCH.capability, operation: SEARCH.operation, input: {} }] },
            d: (ctx: StageExecutionContext) => ({ status: "completed", result: JSON.stringify(ctx.join!.branches) }),
          }),
        }),
      ]),
      clock: first.clock,
      ids: first.ids,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
    });

    const resumed = readWorkflowControlState((await rebuilt.inspect(handle.executionId))!.control.progress)!;
    assert.deepEqual(resumed, before, "the reconstructed runtime reads the same branch state, byte for byte");
    assert.deepEqual((await rebuilt.inspect(handle.executionId))!.waitingFor, beforeWait, "and the same durable union wait");
    // No live Promise was stored in control state.
    assert.deepEqual(JSON.parse(JSON.stringify(resumed)), resumed);

    // Drive it to completion under the fresh controller: settle the model resumption, then B's Effect.
    beta.settle({ text: "C-recovered" });
    await rebuilt.drainResumptions();
    await rebuilt.runUntilIdle();
    const call = capabilities.outstanding[0]!;
    await rebuilt.settleEffect({
      pendingOperationId: call.request.pendingOperationId,
      effectId: call.request.effectId,
      outcome: { status: "success", observation: {} },
    });
    await rebuilt.runUntilIdle();

    const done = await rebuilt.inspect(handle.executionId);
    assert.equal(done?.lifecycle, "COMPLETED");
    assert.equal(beta.invocationCount, 1, "stable keys recovered C's model call; the provider was invoked once");
    const finalResult = readWorkflowControlState(done!.control.progress)!.provisionalResult;
    assert.deepEqual(JSON.parse(finalResult ?? "[]"), [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C-recovered" },
    ]);
  });
});
