/**
 * Slice G.1 — minimal system-defined parallel Workflow branches with an explicit join.
 *
 * The proof topology is exactly:
 *
 * ```text
 * Stage A ──▶ fork P ──┬─▶ Function Stage B ─▶ result B ──┐
 *                      └─▶ Function Stage C ─▶ result C ──┤
 *                                                     explicit join P
 *                                                         │
 *                                                         ▼
 *                                                      Stage D
 * ```
 *
 * All four Stages belong to one Workflow Execution. What these cases hold true:
 *
 * ```text
 * one Workflow Execution, no child Executions to simulate branches
 * branch-local progress and branch-local results, each its own persisted JSON
 * independent branch Function work overlaps in wall-clock time
 * controller-state mutation stays serialized (one commit after the branches settle)
 * the explicit join is a distinct semantic step, not "whichever branch finished last"
 * deterministic result / failure ordering by authored branch order, never completion timing
 * a branch that returns awaitEffects fails closed - no Effect, no half-built G.2
 * closed Stage / Effect vocabularies stay closed
 * ```
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ControllerRegistry,
  EFFECT_KINDS,
  Harness,
  STAGE_KINDS,
  WORKFLOW_CONTROL_STATE_VERSION,
  createWorkflowController,
  defineWorkflow,
  readWorkflowControlState,
  validateWorkflowSpec,
} from "@agent-sdk/core/execution";
import type { ExecutionId, WorkflowSpecInput } from "@agent-sdk/core/execution";
import type { FunctionStageOutcome, StageExecutionContext } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createFunctionStageRegistry,
  createScriptedCapabilityExecutor,
} from "@agent-sdk/core/reference";
import { createWorkflowTestHarness } from "@agent-sdk/core/testing";

const AUTHORITY = { operations: [{ capability: "knowledge.retrieval", operation: "search" }] };

/** A one-shot promise a test resolves by hand, to make branch work genuinely overlap. */
function deferred<T = void>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function tick(times = 3): Promise<void> {
  for (let i = 0; i < times; i += 1) await new Promise((r) => setImmediate(r));
}

async function waitFor(predicate: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await new Promise((r) => setImmediate(r));
  }
  throw new Error(`waitFor timed out: ${label}`);
}

/** The canonical G.1 graph: entry A, fork P with branches B and C, join into D. */
function forkJoinSpec(): WorkflowSpecInput {
  return {
    entryStage: "a",
    forks: [
      {
        id: "p",
        branches: [
          { id: "b", stage: "b" },
          { id: "c", stage: "c" },
        ],
        join: { next: "d" },
      },
    ],
    stages: [
      { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
      { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
      { id: "c", kind: "function", implementationRef: "c", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
      { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
    ],
  };
}

describe("Slice G.1: minimal system-defined Workflow fork/join", () => {
  test("A -> fork(B,C) -> join -> D succeeds with all four Stages in one Execution", async () => {
    const seenByD: { input: StageExecutionContext["input"]; join: StageExecutionContext["join"] } = { input: "unset", join: null };
    const { harness, definitions, store } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: (ctx) => ({ status: "completed", result: `B(${ctx.input})` }),
        c: (ctx) => ({ status: "completed", result: `C(${ctx.input})` }),
        d: (ctx) => {
          seenByD.input = ctx.input;
          seenByD.join = ctx.join;
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-happy", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");

    // (2) No child Execution was created to stand in for a branch.
    const executions = await store.listExecutions();
    assert.equal(executions.length, 1, "the pure fork/join proof creates exactly one Execution");
    assert.deepEqual(await harness.childExecutionLinksOf(handle.executionId), [], "no child links");

    // (3) The local proof journals no Effect and opens no PendingOperation.
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "no Effect for a fork or a join");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.deepEqual(await harness.controllerResumptionsOf(handle.executionId), [], "no ControllerResumption for branch work");

    // (9) D received both branch results, in authored branch order, only at the join.
    assert.deepEqual(seenByD.join, {
      forkId: "p",
      branches: [
        { branchId: "b", stageId: "b", result: "B(seed)" },
        { branchId: "c", stageId: "c", result: "C(seed)" },
      ],
    });
    // (10) D's ordinary input is the fork's original input, not a branch result.
    assert.equal(seenByD.input, "seed");
  });

  test("both branches receive the same fork-input snapshot; branch progress is separate persisted JSON", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "shared-input" }),
        b: (ctx) => ({ status: "completed", result: `B:${ctx.input}`, progress: { branch: "b", n: 1 } }),
        c: (ctx) => ({ status: "completed", result: `C:${ctx.input}`, progress: { branch: "c", n: 2 } }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-inputs", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref });

    await harness.runOnce(); // A completes, fork installed
    await harness.runOnce(); // branches run, joinReady persisted

    const progress = (await harness.inspect(handle.executionId))!.control.progress;
    const state = readWorkflowControlState(progress)!;
    const parallel = state.parallel!;
    assert.ok(parallel, "the fork is still active before the join step");

    // (4) One immutable fork-input value, snapshotted to both branches.
    assert.equal(parallel.input, "shared-input");
    assert.deepEqual(parallel.branches.map((branch) => branch.input), ["shared-input", "shared-input"]);

    // (5) Each branch owns its own progress and its own result.
    assert.deepEqual(parallel.branches.map((branch) => branch.progress), [
      { branch: "b", n: 1 },
      { branch: "c", n: 2 },
    ]);
    assert.deepEqual(parallel.branches.map((branch) => branch.result), ["B:shared-input", "C:shared-input"]);
    assert.deepEqual(parallel.branches.map((branch) => branch.visit).sort(), [2, 3]);

    // (18) The active fork state is plain serializable data.
    assert.deepEqual(JSON.parse(JSON.stringify(progress)), progress, "a JSON round trip changes the parallel state not at all");
  });

  test("branch Function work overlaps in wall-clock time; completion order is not semantic order", async () => {
    const started: string[] = [];
    const finished: string[] = [];
    const gates = { b: deferred(), c: deferred() };
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: async () => {
          started.push("b");
          await gates.b.promise;
          finished.push("b");
          return { status: "completed", result: "B-result" };
        },
        c: async () => {
          started.push("c");
          await gates.c.promise;
          finished.push("c");
          return { status: "completed", result: "C-result" };
        },
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-overlap", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref });

    await harness.runOnce(); // A completes, fork installed
    const branchActivation = harness.runOnce(); // runs both branch bodies

    // (6) Both branch bodies are in flight before either is allowed to finish.
    await waitFor(() => started.length === 2, "both branches started");
    assert.deepEqual([...started].sort(), ["b", "c"]);
    assert.deepEqual(finished, [], "neither branch has finished yet");

    // Let C finish first, then B - so completion order is C, B.
    gates.c.resolve();
    await tick();
    gates.b.resolve();
    await branchActivation;
    assert.deepEqual(finished, ["c", "b"], "C completed before B in wall-clock time");

    // (7) Persisted branch results are still in authored order B, C.
    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.deepEqual(state.parallel!.branches.map((branch) => branch.branchId), ["b", "c"]);
    assert.deepEqual(state.parallel!.branches.map((branch) => branch.result), ["B-result", "C-result"]);
    assert.equal(state.parallel!.joinReady, true);

    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("the explicit join is a distinct semantic boundary: branches complete, then D runs on a later Activation", async () => {
    let dRuns = 0;
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "completed", result: "B" }),
        c: () => ({ status: "completed", result: "C" }),
        d: () => {
          dRuns += 1;
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-join-step", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref });

    const at = async () => readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;

    await harness.runOnce(); // Activation N: A -> install fork
    let state = await at();
    assert.equal(state.parallel?.forkId, "p");
    assert.equal(state.parallel?.joinReady, false);
    assert.deepEqual(state.parallel?.branches.map((b) => b.status), ["ready", "ready"]);
    assert.equal(dRuns, 0);

    await harness.runOnce(); // Activation N+1: branch bodies run, joinReady persisted, D has NOT run
    state = await at();
    assert.equal(state.parallel?.joinReady, true, "there is a persisted state where both branches are done and D has not executed");
    assert.deepEqual(state.parallel?.branches.map((b) => b.status), ["completed", "completed"]);
    assert.equal(state.join, null, "no join snapshot yet - the join step has not run");
    assert.equal(dRuns, 0, "completing the branches did not run Stage D");

    await harness.runOnce(); // Activation N+2: the explicit join enters D
    state = await at();
    assert.equal(state.parallel, null, "the active fork is cleared by the join");
    assert.equal(state.currentStage, "d");
    assert.ok(state.join, "the join snapshot is persisted with D's visit");
    assert.equal(dRuns, 0, "entering D and running D's body are still separate Activations");

    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(dRuns, 1, "Stage D ran exactly once");
  });

  test("the join snapshot survives a D re-entry driven by an ordinary required Effect", async () => {
    const joinOnReentry: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "knowledge.retrieval:search": () => ({ status: "success", observation: { hits: 1 } }) },
      }),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "completed", result: "B" }),
        c: () => ({ status: "completed", result: "C" }),
        d: (ctx) => {
          if (ctx.progress["asked"] !== true) {
            return {
              status: "awaitEffects",
              progress: { asked: true },
              effects: [{ key: "look", capability: "knowledge.retrieval", operation: "search", input: { q: "x" } }],
            };
          }
          joinOnReentry.push(ctx.join);
          return { status: "completed", result: `reentry saw ${ctx.observations[0]?.outcome}` };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-reentry", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    await harness.drainEffects();
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    // (11) D re-entered after a real Activation boundary and still saw the join snapshot.
    assert.equal(joinOnReentry.length, 1);
    assert.deepEqual(joinOnReentry[0], {
      forkId: "p",
      branches: [
        { branchId: "b", stageId: "b", result: "B" },
        { branchId: "c", stageId: "c", result: "C" },
      ],
    });
    // and it is gone once D transitions away.
    const finalState = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(finalState.join, null, "the join snapshot is cleared when the Workflow leaves D");
  });

  test("a branch that returns awaitEffects fails closed with a G.1-specific code and no Effect", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities: createScriptedCapabilityExecutor({
        handlers: { "knowledge.retrieval:search": () => ({ status: "success", observation: {} }) },
      }),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({
          status: "awaitEffects",
          effects: [{ key: "x", capability: "knowledge.retrieval", operation: "search", input: {} }],
        }),
        c: () => ({ status: "completed", result: "C" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-branch-effects", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_effects_unsupported");
    assert.match(context!.failure!.message, /fork "p" branch "b"/);
    // (12) Nothing reached the Effect journal - no half-built G.2.
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
  });

  test("a branch failure prevents the join and downstream execution", async () => {
    let dRuns = 0;
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "completed", result: "B" }),
        c: () => ({ status: "failed", code: "c_broke", message: "branch C could not compute" }),
        d: () => {
          dRuns += 1;
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-branch-fail", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_failed:c_broke");
    assert.match(context!.failure!.message, /fork "p" branch "c"/);
    assert.equal(dRuns, 0, "the join never fired, so Stage D never ran");
  });

  test("multiple branch failures report the earliest authored branch, not the first to fail", async () => {
    const failed: string[] = [];
    const gateB = deferred();
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: async () => {
          await gateB.promise;
          failed.push("b");
          return { status: "failed", code: "b_broke", message: "B failed second" };
        },
        c: () => {
          failed.push("c");
          return { status: "failed", code: "c_broke", message: "C failed first" };
        },
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-two-failures", spec: forkJoinSpec() }));
    const handle = await harness.createExecution({ definition: ref });

    await harness.runOnce(); // A -> fork
    const branchActivation = harness.runOnce();
    await waitFor(() => failed.includes("c"), "C failed first");
    gateB.resolve();
    await branchActivation;
    assert.deepEqual(failed, ["c", "b"], "C failed before B in wall-clock time");

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    // authored order is B, C - so B (b_broke) is the primary failure even though C failed first.
    assert.equal(context?.failure?.code, "parallel_branch_failed:b_broke");
    assert.match(context!.failure!.message, /fork "p" branch "b"/);
  });

  test("malformed fork topology is rejected statically", () => {
    const expectIssue = (spec: unknown, code: string, needle?: RegExp) => {
      const result = validateWorkflowSpec(spec);
      assert.equal(result.ok, false, "expected this spec to be rejected");
      const issues = result.ok ? [] : result.issues;
      assert.ok(issues.some((issue) => issue.code === code), `expected a ${code} issue, got ${issues.map((i) => i.code).join(", ")}`);
      if (needle) assert.ok(issues.some((issue) => needle.test(issue.message)), `expected a message matching ${needle}`);
    };
    const fn = (id: string, next: unknown) => ({ id, kind: "function", implementationRef: id, transitions: { kind: "always", next } });
    const toJoin = { to: "join", fork: "p" };
    const base = (extra: Record<string, unknown>) => ({
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        fn("a", { to: "fork", fork: "p" }),
        fn("b", toJoin),
        fn("c", toJoin),
        fn("d", { to: "complete" }),
      ],
      ...extra,
    });

    // duplicate fork ids
    expectIssue(
      {
        entryStage: "a",
        forks: [
          { id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } },
          { id: "p", branches: [{ id: "e", stage: "e" }, { id: "f", stage: "f" }], join: { next: "d" } },
        ],
        stages: [fn("a", { to: "fork", fork: "p" }), fn("b", toJoin), fn("c", toJoin), fn("e", toJoin), fn("f", toJoin), fn("d", { to: "complete" })],
      },
      "invalid_fork",
      /declared more than once/,
    );

    // fewer than two branches
    expectIssue(
      {
        entryStage: "a",
        forks: [{ id: "p", branches: [{ id: "b", stage: "b" }], join: { next: "d" } }],
        stages: [fn("a", { to: "fork", fork: "p" }), fn("b", toJoin), fn("d", { to: "complete" })],
      },
      "invalid_fork",
      /at least two branches/,
    );

    // duplicate branch ids
    expectIssue(
      base({ forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "b", stage: "c" }], join: { next: "d" } }] }),
      "invalid_branch",
      /declared twice/,
    );

    // unknown branch Stage
    expectIssue(
      base({ forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "ghost" }], join: { next: "d" } }] }),
      "invalid_branch",
      /not a declared Stage/,
    );

    // non-Function branch Stage
    expectIssue(
      {
        entryStage: "a",
        forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
        stages: [
          fn("a", { to: "fork", fork: "p" }),
          { id: "b", kind: "llm", model: { logicalRef: "m", requirements: { text: true } }, system: "s", prompt: "p", transitions: { kind: "always", next: toJoin } },
          fn("c", toJoin),
          fn("d", { to: "complete" }),
        ],
      },
      "invalid_branch",
      /function Stage/,
    );

    // one Stage claimed by two forks
    expectIssue(
      {
        entryStage: "a",
        forks: [
          { id: "p", branches: [{ id: "b", stage: "shared" }, { id: "c", stage: "c" }], join: { next: "d" } },
          { id: "q", branches: [{ id: "e", stage: "shared" }, { id: "f", stage: "f" }], join: { next: "d" } },
        ],
        stages: [fn("a", { to: "fork", fork: "p" }), fn("shared", toJoin), fn("c", toJoin), fn("f", { to: "join", fork: "q" }), fn("d", { to: "complete" })],
      },
      "invalid_branch",
      /already a branch of fork/,
    );

    // a branch Stage joining the wrong fork
    expectIssue(
      base({
        forks: [
          { id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } },
          { id: "q", branches: [{ id: "e", stage: "e" }, { id: "f", stage: "f" }], join: { next: "d" } },
        ],
        stages: [fn("a", { to: "fork", fork: "p" }), fn("b", { to: "join", fork: "q" }), fn("c", toJoin), fn("e", { to: "join", fork: "q" }), fn("f", { to: "join", fork: "q" }), fn("d", { to: "complete" })],
      }),
      "invalid_transition",
      /joins its own fork/,
    );

    // an ordinary Stage transitioning to a join
    expectIssue(base({ stages: [fn("a", { to: "join", fork: "p" }), fn("b", toJoin), fn("c", toJoin), fn("d", { to: "complete" })] }), "invalid_transition", /only a parallel branch Stage/);

    // an ordinary Stage transitioning directly into a branch Stage
    expectIssue(base({ stages: [fn("a", { to: "stage", stage: "b" }), fn("b", toJoin), fn("c", toJoin), fn("d", { to: "complete" })] }), "invalid_transition", /reached through fork/);

    // a nested fork attempt: a branch Stage transitioning to a fork
    expectIssue(base({ stages: [fn("a", { to: "fork", fork: "p" }), fn("b", { to: "fork", fork: "p" }), fn("c", toJoin), fn("d", { to: "complete" })] }), "invalid_branch", /transitions only to/);

    // a labelled branch Stage
    expectIssue(
      base({
        stages: [
          fn("a", { to: "fork", fork: "p" }),
          { id: "b", kind: "function", implementationRef: "b", transitions: { kind: "labeled", cases: [{ label: "go", next: toJoin }] } },
          fn("c", toJoin),
          fn("d", { to: "complete" }),
        ],
      }),
      "invalid_branch",
      /one unconditional transition/,
    );

    // a fork target naming an undeclared fork
    expectIssue(base({ stages: [fn("a", { to: "fork", fork: "nope" }), fn("b", toJoin), fn("c", toJoin), fn("d", { to: "complete" })] }), "invalid_transition", /does not declare/);

    // the join successor missing
    expectIssue(
      {
        entryStage: "a",
        forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "ghost" } }],
        stages: [fn("a", { to: "fork", fork: "p" }), fn("b", toJoin), fn("c", toJoin)],
      },
      "invalid_fork",
      /join successor/,
    );

    // the join successor is one of the fork's own branch Stages
    expectIssue(
      {
        entryStage: "a",
        forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "b" } }],
        stages: [fn("a", { to: "fork", fork: "p" }), fn("b", toJoin), fn("c", toJoin)],
      },
      "invalid_fork",
      /cannot also be one of this fork's branch Stages/,
    );

    // the entry Stage cannot be a branch
    expectIssue(
      {
        entryStage: "b",
        forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
        stages: [fn("b", toJoin), fn("c", toJoin), fn("d", { to: "complete" })],
      },
      "invalid_branch",
      /entry Stage/,
    );

    // a branch Stage with Adapters
    expectIssue(
      {
        entryStage: "a",
        forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
        stages: [
          fn("a", { to: "fork", fork: "p" }),
          { id: "b", kind: "function", implementationRef: "b", inputAdapters: [{ kind: "function", implementationRef: "x" }], transitions: { kind: "always", next: toJoin } },
          fn("c", toJoin),
          fn("d", { to: "complete" }),
        ],
      },
      "invalid_branch",
      /Adapters/,
    );

    // defineWorkflow refuses to publish it at all
    assert.throws(() =>
      defineWorkflow({
        id: "bad-fork",
        spec: {
          entryStage: "a",
          forks: [{ id: "p", branches: [{ id: "b", stage: "b" }], join: { next: "d" } }],
          stages: [fn("a", { to: "fork", fork: "p" }) as never, fn("b", toJoin) as never, fn("d", { to: "complete" }) as never],
        },
      }),
    );
  });

  test("a valid G.1 graph is portable data with a stable digest", () => {
    const definition = defineWorkflow({ id: "g1-portable", spec: forkJoinSpec() });
    assert.deepEqual(JSON.parse(JSON.stringify(definition)), definition);
    const fork = definition.spec.forks?.[0];
    assert.deepEqual(fork, { id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } });
  });

  test("existing linear Workflow behaviour is unchanged, and the closed vocabularies stay closed", async () => {
    // (17) no fork/join/branch/parallel Stage or Effect kind.
    assert.deepEqual([...STAGE_KINDS], ["function", "llm", "agent", "workflow"]);
    assert.deepEqual([...EFFECT_KINDS], ["use_capability", "write_memory", "spawn_execution", "send_message", "request_user_input"]);
    for (const invented of ["fork", "join", "branch", "parallel"]) {
      assert.equal((STAGE_KINDS as readonly string[]).includes(invented), false);
      assert.equal((EFFECT_KINDS as readonly string[]).includes(invented), false);
    }
    assert.equal(WORKFLOW_CONTROL_STATE_VERSION, 3);

    // (16) a Workflow with no forks validates and runs exactly as before.
    const linear: WorkflowSpecInput = {
      entryStage: "one",
      stages: [
        { id: "one", kind: "function", implementationRef: "one", transitions: { kind: "always", next: { to: "stage", stage: "two" } } },
        { id: "two", kind: "function", implementationRef: "two", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    assert.equal(validateWorkflowSpec(linear).ok, true);
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        one: () => ({ status: "completed", result: "1" }),
        two: (ctx) => ({ status: "completed", result: `2 after ${ctx.input}` }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g1-linear", spec: linear }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(state.parallel, null, "a linear Workflow never installs a fork");
    assert.equal(state.join, null);
    assert.equal(state.forks, 0);
  });

  test("branch-local state reconstructs from persisted records under a fresh controller", async () => {
    const gates = { b: deferred(), c: deferred() };
    const first = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: async () => {
          await gates.b.promise;
          return { status: "completed", result: "B", progress: { branch: "b" } };
        },
        c: async () => {
          await gates.c.promise;
          return { status: "completed", result: "C", progress: { branch: "c" } };
        },
        d: (ctx) => ({ status: "completed", result: JSON.stringify(ctx.join) }),
      }),
    });
    const ref = await first.definitions.save(defineWorkflow({ id: "g1-reconstruct", spec: forkJoinSpec() }));
    const handle = await first.harness.createExecution({ definition: ref });

    await first.harness.runOnce(); // A -> fork
    const branchActivation = first.harness.runOnce();
    gates.c.resolve();
    gates.b.resolve();
    await branchActivation; // joinReady persisted

    const beforeId: ExecutionId = handle.executionId;
    const before = readWorkflowControlState((await first.harness.inspect(beforeId))!.control.progress)!;
    assert.equal(before.parallel?.joinReady, true);

    // A different Harness, a brand-new WorkflowController, over the same persisted records.
    const rebuilt = new Harness({
      definitions: first.definitions,
      store: first.store,
      scheduler: first.scheduler,
      controllers: new ControllerRegistry([
        createWorkflowController({
          functions: createFunctionStageRegistry({
            a: () => ({ status: "completed", result: "seed" }),
            b: () => ({ status: "completed", result: "B" }),
            c: () => ({ status: "completed", result: "C" }),
            d: (ctx) => ({ status: "completed", result: JSON.stringify(ctx.join) }),
          }),
        }),
      ]),
      clock: first.clock,
      ids: first.ids,
    });

    const resumed = readWorkflowControlState((await rebuilt.inspect(beforeId))!.control.progress)!;
    assert.deepEqual(resumed, before, "the reconstructed runtime reads the same active-fork state, byte for byte");

    await rebuilt.runUntilIdle();
    const done = await rebuilt.inspect(beforeId);
    assert.equal(done?.lifecycle, "COMPLETED");
    const finalState = readWorkflowControlState(done!.control.progress)!;
    assert.equal(finalState.currentStage, "d");
    assert.equal(
      finalState.provisionalResult,
      JSON.stringify({
        forkId: "p",
        branches: [
          { branchId: "b", stageId: "b", result: "B" },
          { branchId: "c", stageId: "c", result: "C" },
        ],
      }),
      "the join resumed from persisted branch results under the fresh controller",
    );
  });
});
