/**
 * The Stage completion barrier.
 *
 * ```text
 * Stage proposes Effect(s)
 *     -> controller records required correlation(s)
 *     -> Harness authorizes and dispatches
 *          fast: result Event already in the mailbox -> READY
 *          slow: pending Effect -> WAITING -> result Event -> READY
 *     -> controller consumes matching results
 *     -> barrier settles -> the Stage may transition
 * ```
 *
 * Two properties carry most of the weight. Fast and slow must be the *same* Workflow semantics -
 * latency is a scheduling fact, not a semantic one. And "settled" must never be read as
 * "successful": a denial, a definite failure, and an unknown outcome all settle the barrier, and the
 * Stage has to be able to see which one it got.
 *
 * There is no Stage mailbox anywhere in here. The enclosing Workflow Execution waits; the Stage is
 * only what that Execution is currently doing.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, readWorkflowControlState, stageCorrelationId, stageId } from "@arrokothi/core/execution";
import type { ExecutionId, LifecycleState } from "@arrokothi/core/execution";
import type { FunctionStageOutcome, StageExecutionContext } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createFunctionStageRegistry,
  createNoInlineWaitBudget,
  createScriptedCapabilityExecutor,
} from "@arrokothi/core/reference";
import { createWorkflowTestHarness } from "@arrokothi/core/testing";

/**
 * What this Execution is permitted to use at all.
 *
 * The runtime-owned ceiling, supplied when the Execution is created. It is checked again at dispatch
 * from current state, so an Execution created without one can reach no capability implementation
 * whatever a controller proposes and whatever policy would have said.
 */
const AUTHORITY = { operations: [{ capability: "knowledge.retrieval", operation: "search" }] };

/**
 * One Function Stage that requires the operations its config names, then reports what settled.
 *
 * The two halves of the barrier contract in one implementation: it *returns* requests upward and it
 * *reads* observations that were handed to it. It has no executor and no way to learn an outcome
 * except through the controller.
 */
interface ProbeConfig {
  readonly requests: readonly { key: string; capability: string; operation: string; resources?: readonly string[] }[];
}

function probe(context: StageExecutionContext): FunctionStageOutcome {
  const config = context.config as unknown as ProbeConfig;
  if (context.progress["requested"] !== true) {
    return {
      status: "awaitEffects",
      progress: { requested: true },
      effects: config.requests.map((request) => ({
        key: request.key,
        capability: request.capability,
        operation: request.operation,
        input: { q: request.key },
        ...(request.resources ? { resources: request.resources } : {}),
      })),
    };
  }
  const summary = context.observations
    .map((observation) => `${observation.key}=${observation.outcome}`)
    .sort()
    .join(",");
  return { status: "completed", result: summary };
}

const functions = createFunctionStageRegistry({ probe, echo: (context) => ({ status: "completed", result: context.input }) });

const policy = () => createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval", operations: ["search"] }] });

function oneRequestWorkflow(id: string) {
  return defineWorkflow({
    id,
    spec: {
      entryStage: "gather",
      stages: [
        {
          id: "gather",
          kind: "function",
          implementationRef: "probe",
          config: { requests: [{ key: "retrieval", capability: "knowledge.retrieval", operation: "search" }] },
          transitions: { kind: "always", next: { to: "stage", stage: "report" } },
        },
        { id: "report", kind: "function", implementationRef: "echo", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    },
  });
}

interface Semantics {
  readonly lifecycle: LifecycleState;
  readonly currentStage: string;
  readonly stageResult: string | null;
  readonly barrierSettled: boolean;
  readonly correlations: readonly string[];
}

async function semanticsOf(harness: ReturnType<typeof createWorkflowTestHarness>["harness"], executionId: ExecutionId): Promise<Semantics> {
  const context = await harness.inspect(executionId);
  const state = readWorkflowControlState(context!.control.progress)!;
  return {
    lifecycle: context!.lifecycle,
    currentStage: state.currentStage,
    stageResult: state.provisionalResult,
    barrierSettled: state.barrier.every((entry) => entry.settled),
    // Pending operations carry the correlation the controller chose, which is how a required
    // operation is tied back to the Stage visit that required it.
    correlations: (await harness.pendingOperationsOf(executionId)).map((operation) => operation.correlationId),
  };
}

describe("Stage completion barrier", () => {
  test("a required Effect that settles inline still settles the barrier before the transition", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      authorizer: policy(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "knowledge.retrieval:search": () => ({ status: "success", observation: { hits: 2 } }) },
      }),
    });
    const ref = await definitions.save(oneRequestWorkflow("fast"));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    const records = await harness.runUntilIdle();

    const semantics = await semanticsOf(harness, handle.executionId);
    assert.equal(semantics.lifecycle, "COMPLETED");
    assert.equal(semantics.currentStage, "report");
    assert.equal(semantics.stageResult, "retrieval=completed");
    assert.deepEqual(semantics.correlations, [stageCorrelationId(stageId("gather"), 1, "retrieval")]);
    assert.equal(records.some((record) => record.lifecycleAfter === "WAITING"), false, "nothing had to wait");
  });

  test("the same Effect on the slow path waits, then resumes with identical Workflow semantics", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      authorizer: policy(),
      capabilities: executor,
    });
    const ref = await definitions.save(oneRequestWorkflow("fast"));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    const first = await harness.runUntilIdle();

    // The barrier is genuinely unresolved: the Workflow is WAITING, still inside the requesting
    // Stage, and the next Stage has not been entered.
    const waiting = await semanticsOf(harness, handle.executionId);
    assert.equal(waiting.lifecycle, "WAITING");
    assert.equal(waiting.currentStage, "gather");
    assert.equal(waiting.barrierSettled, false);
    assert.equal(waiting.stageResult, null);
    assert.ok(first.some((record) => record.lifecycleAfter === "WAITING"));

    executor.completeAll({ hits: 2 });
    await harness.drainEffects();
    await harness.runUntilIdle();

    const settled = await semanticsOf(harness, handle.executionId);
    // Same definition, same Stage sequence, same Stage result, same correlation. Only the
    // Activation count and the trip through WAITING differed.
    assert.deepEqual(
      { ...settled },
      {
        lifecycle: "COMPLETED",
        currentStage: "report",
        stageResult: "retrieval=completed",
        barrierSettled: true,
        correlations: [stageCorrelationId(stageId("gather"), 1, "retrieval")],
      },
    );
  });

  test("an Effect that could have settled inline is unchanged when the budget forbids it", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      authorizer: policy(),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "knowledge.retrieval:search": () => ({ status: "success", observation: { hits: 2 } }) },
      }),
      inlineWait: createNoInlineWaitBudget(),
    });
    const ref = await definitions.save(oneRequestWorkflow("fast"));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    await harness.drainEffects();
    await harness.runUntilIdle();

    const semantics = await semanticsOf(harness, handle.executionId);
    assert.equal(semantics.lifecycle, "COMPLETED");
    assert.equal(semantics.stageResult, "retrieval=completed");
  });

  test("several required Effects join mechanically, with no aggregator Stage", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      authorizer: policy(),
      capabilities: executor,
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "fan-out",
        spec: {
          entryStage: "gather",
          stages: [
            {
              id: "gather",
              kind: "function",
              implementationRef: "probe",
              config: {
                requests: [
                  { key: "a", capability: "knowledge.retrieval", operation: "search" },
                  { key: "b", capability: "knowledge.retrieval", operation: "search" },
                  { key: "c", capability: "knowledge.retrieval", operation: "search" },
                ],
              },
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    assert.equal(executor.outstanding.length, 3, "all three were dispatched");

    // Settling two of three must not release the barrier.
    // Settled through the trusted settlement ingress so the partial state is deterministic:
    // draining would wait for the third dispatch, which is exactly what must still be outstanding.
    const outstanding = [...executor.outstanding];
    for (const call of outstanding.slice(0, 2)) {
      await harness.settleEffect({
        pendingOperationId: call.request.pendingOperationId,
        effectId: call.request.effectId,
        outcome: { status: "success", observation: { hit: call.request.correlationId } },
      });
    }
    await harness.runUntilIdle();

    const partial = await semanticsOf(harness, handle.executionId);
    assert.equal(partial.lifecycle, "WAITING", "a Stage cannot transition with a required operation outstanding");
    assert.equal(partial.barrierSettled, false);

    await harness.settleEffect({
      pendingOperationId: outstanding[2]!.request.pendingOperationId,
      effectId: outstanding[2]!.request.effectId,
      outcome: { status: "success", observation: { hit: "c" } },
    });
    await harness.runUntilIdle();
    executor.completeAll({ hit: "released" });
    await harness.drainEffects();

    const joined = await semanticsOf(harness, handle.executionId);
    assert.equal(joined.lifecycle, "COMPLETED");
    assert.equal(joined.stageResult, "a=completed,b=completed,c=completed");
    assert.deepEqual(joined.correlations, [
      stageCorrelationId(stageId("gather"), 1, "a"),
      stageCorrelationId(stageId("gather"), 1, "b"),
      stageCorrelationId(stageId("gather"), 1, "c"),
    ]);
  });

  test("a denied Effect settles the barrier as a denial, never as a success", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      // No authorizer at all: the fail-closed default denies every Effect.
      capabilities: createScriptedCapabilityExecutor({ fallback: () => ({ status: "success", observation: "should never run" }) }),
    });
    const ref = await definitions.save(oneRequestWorkflow("denied"));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const semantics = await semanticsOf(harness, handle.executionId);
    assert.equal(semantics.lifecycle, "COMPLETED");
    assert.equal(semantics.stageResult, "retrieval=denied", "the Stage saw a denial and could act on it");
    assert.equal(semantics.barrierSettled, true, "settled is not successful");
  });

  test("a failed Effect settles as failure and an unknown outcome settles as unknown", async () => {
    for (const [label, outcome, expected] of [
      ["failure", { status: "failure" as const, error: { code: "upstream", message: "no" }, retryable: false }, "retrieval=failed"],
      ["unknown", { status: "unknown" as const, error: { code: "lost", message: "response lost" } }, "retrieval=unknown"],
    ] as const) {
      const { harness, definitions } = createWorkflowTestHarness({
        functions,
        authorizer: policy(),
        capabilities: createScriptedCapabilityExecutor({ handlers: { "knowledge.retrieval:search": () => outcome } }),
      });
      const ref = await definitions.save(oneRequestWorkflow(`outcome-${label}`));
      const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
      await harness.runUntilIdle();

      const semantics = await semanticsOf(harness, handle.executionId);
      assert.equal(semantics.lifecycle, "COMPLETED", label);
      assert.equal(semantics.stageResult, expected, `${label} is distinguishable from every other outcome`);
    }
  });

  test("a duplicate result does not settle a barrier entry twice", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      authorizer: policy(),
      capabilities: executor,
    });
    const ref = await definitions.save(oneRequestWorkflow("duplicate"));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const call = executor.outstanding[0]!;
    executor.complete(call.request.effectId, { hits: 1 });
    await harness.drainEffects();

    // Reporting the same outcome again through the trusted settlement ingress must not create a
    // second observation, and must not disturb the authoritative first one.
    const receipt = await harness.settleEffect({
      pendingOperationId: call.request.pendingOperationId,
      effectId: call.request.effectId,
      outcome: { status: "success", observation: { hits: 999 } },
    });
    assert.equal(receipt.status, "already_settled");

    await harness.runUntilIdle();
    const semantics = await semanticsOf(harness, handle.executionId);
    assert.equal(semantics.lifecycle, "COMPLETED");
    assert.equal(semantics.stageResult, "retrieval=completed");

    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.barrier.length, 0, "the next Stage's visit starts with an empty barrier");
  });

  test("a Stage visit is a fresh barrier, so a prior visit's correlation can settle nothing in it", async () => {
    // The correlation encodes the visit, so looping back to the same Stage produces a different
    // one. That is why a stale result is not merely unlikely here - there is no entry it matches.
    assert.notEqual(
      stageCorrelationId(stageId("evaluate"), 1, "probe"),
      stageCorrelationId(stageId("evaluate"), 3, "probe"),
    );

    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        probe,
        // Visits run gather=1, decide=2, gather=3, decide=4, so this loops exactly once.
        decide: (context) => ({
          status: "completed",
          result: context.input,
          transition: context.visit < 4 ? "again" : "publish",
        }),
      }),
      authorizer: policy(),
      capabilities: executor,
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "loop-barrier",
        spec: {
          entryStage: "gather",
          stages: [
            {
              id: "gather",
              kind: "function",
              implementationRef: "probe",
              config: { requests: [{ key: "probe", capability: "knowledge.retrieval", operation: "search" }] },
              transitions: { kind: "always", next: { to: "stage", stage: "decide" } },
            },
            {
              id: "decide",
              kind: "function",
              implementationRef: "decide",
              transitions: {
                kind: "labeled",
                cases: [
                  { label: "again", next: { to: "stage", stage: "gather" } },
                  { label: "publish", next: { to: "complete" } },
                ],
              },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const firstCall = executor.outstanding[0]!;
    const firstCorrelation = stageCorrelationId(stageId("gather"), 1, "probe");
    assert.equal(firstCall.request.correlationId, firstCorrelation);
    executor.complete(firstCall.request.effectId, { pass: "first" });
    await harness.drainEffects();
    await harness.runUntilIdle();

    // Visit 3 of the Workflow is the second visit to `gather`, with a new barrier and a new
    // correlation. Nothing from visit 1 is still recorded as required.
    const second = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(second.currentStage, "gather");
    assert.equal(second.visit, 3);
    assert.deepEqual(second.barrier.map((entry) => entry.correlationId), [stageCorrelationId(stageId("gather"), 3, "probe")]);
    assert.equal(second.barrier.some((entry) => entry.correlationId === firstCorrelation), false);

    // An Event addressed to this Execution carrying the *old* correlation settles nothing: the
    // controller only settles current barrier entries, and only from Effect-result Events.
    await harness.deliverExternalInput({
      destination: handle.executionId,
      label: "stale",
      payload: { note: "an old visit's result" },
      correlationId: firstCorrelation,
    });
    await harness.runUntilIdle();

    const stillWaiting = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(stillWaiting.barrier.every((entry) => entry.settled), false, "the new visit is still waiting for its own result");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    executor.complete(executor.outstanding[0]!.request.effectId, { pass: "second" });
    await harness.drainEffects();
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });
});
