/**
 * Slice G.2 — parallel branch Effects, child calls, and the fail-closed deferrals.
 *
 * A branch of one Workflow Execution may hold a real asynchronous dependency - a `UseCapability`
 * Effect, or an Agent / Workflow child `call` - while remaining a branch, not an Execution. What
 * these cases hold true:
 *
 * ```text
 * two sibling branches may use the SAME Stage-local request key; their correlations differ
 * every branch Effect is an ordinary Effect of the one enclosing Workflow Execution
 * proposal order is authored branch order; result settlement order is independent and routes right
 * a stale / duplicate result cannot settle another branch; B's observation never appears in C
 * the explicit join fires only when every branch has completed - never on completion timing
 * an Agent / Workflow branch Stage creates its child through the ordinary SpawnExecution path;
 *   the branch itself is never an Execution
 * a branch WriteMemory fails closed (parallel_branch_memory_write_deferred) - that is G.3
 * a branch emission / transition label / Adapter / multi-Stage subgraph stays unsupported
 * ```
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  defineWorkflow,
  readWorkflowControlState,
  validateWorkflowSpec,
} from "@agent-sdk/core/execution";
import type { WorkflowSpecInput } from "@agent-sdk/core/execution";
import type { FunctionStageOutcome, StageExecutionContext } from "@agent-sdk/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createFunctionStageRegistry,
} from "@agent-sdk/core/reference";
import {
  createScriptedAgentController,
  createWorkflowTestHarness,
  scriptedAgentDefinition,
} from "@agent-sdk/core/testing";

const SEARCH = { capability: "knowledge.retrieval", operation: "search" } as const;
const AUTHORITY = { operations: [SEARCH] };

/** A fork P over `branchIds` Function branches, joining into Function Stage `d`. */
function branchForkSpec(branchIds: readonly string[]): WorkflowSpecInput {
  return {
    entryStage: "a",
    forks: [
      {
        id: "p",
        branches: branchIds.map((id) => ({ id, stage: id })),
        join: { next: "d" },
      },
    ],
    stages: [
      { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
      ...branchIds.map((id) => ({
        id,
        kind: "function" as const,
        implementationRef: id,
        transitions: { kind: "always" as const, next: { to: "join" as const, fork: "p" } },
      })),
      { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
    ],
  };
}

/**
 * A Function branch body that, on its first visit, requires `keys` capability calls (all keyed the
 * way the test names them) and, once every observation is in, completes with a summary of what it
 * observed. `tag` disambiguates the branch in the capability `input` so a deferred executor can
 * settle one branch's Effect without settling the other's.
 */
function observingBranch(tag: string, keys: readonly string[]): (ctx: StageExecutionContext) => FunctionStageOutcome {
  return (ctx): FunctionStageOutcome => {
    if (ctx.progress["asked"] !== true) {
      const outcome: FunctionStageOutcome = {
        status: "awaitEffects",
        progress: { asked: true },
        effects: keys.map((key) => ({
          key,
          capability: SEARCH.capability,
          operation: SEARCH.operation,
          input: { branch: tag, key },
        })),
      };
      return outcome;
    }
    const seen = ctx.observations.map((observation) => `${observation.key}=${observation.outcome}:${JSON.stringify(observation.observation ?? null)}`);
    return { status: "completed", result: `${tag}[${seen.join(",")}]`, progress: { asked: true, seen } };
  };
}

/** Settles one branch's outstanding capability Effect by its branch-qualified correlation. */
async function settleBranchEffect(
  harness: ReturnType<typeof createWorkflowTestHarness>["harness"],
  capabilities: ReturnType<typeof createDeferredCapabilityExecutor>,
  correlationNeedle: string,
  observation: { readonly [key: string]: string | number },
): Promise<void> {
  const call = capabilities.outstanding.find((entry) => entry.request.correlationId.includes(correlationNeedle));
  if (!call) throw new Error(`no outstanding Effect matching "${correlationNeedle}"`);
  await harness.settleEffect({
    pendingOperationId: call.request.pendingOperationId,
    effectId: call.request.effectId,
    outcome: { status: "success", observation },
  });
  await harness.runUntilIdle();
}

describe("Slice G.2: Function branch Effects", () => {
  test("B and C each request one UseCapability with the SAME Stage-local key; correlations are branch-qualified", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const seenByD: StageExecutionContext["join"][] = [];
    const { harness, definitions, store } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: observingBranch("B", ["search"]),
        c: observingBranch("C", ["search"]),
        d: (ctx) => {
          seenByD.push(ctx.join);
          return { status: "completed", result: "done" };
        },
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-fx-happy", spec: branchForkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });

    // A completes -> fork; then the branches run and each proposes one Effect.
    await harness.runUntilIdle();

    // (4) Both Effects belong to the one parent Workflow Execution - there is no branch Execution.
    assert.equal((await store.listExecutions()).length, 1, "one Execution; branches are not Executions");
    assert.deepEqual(await harness.childExecutionLinksOf(handle.executionId), []);
    const pending = await harness.pendingOperationsOf(handle.executionId);
    assert.equal(pending.length, 2, "two pending capability operations, both owned by the Workflow Execution");
    assert.ok(pending.every((operation) => operation.effectKind === "use_capability"));

    // (1)+(2)+(3) Both branch bodies used the Stage-local key "search"; the correlations differ and
    // are branch-qualified with the fork invocation, branch id, and branch Stage visit.
    const journal = await harness.effectJournalOf(handle.executionId);
    const requested = journal.filter((entry) => entry.phase === "requested").sort((x, y) => x.sequence - y.sequence);
    assert.deepEqual(
      requested.map((entry) => (entry.detail as { correlationId?: string }).correlationId ?? null),
      [
        "wf/fork/p#1/branch/b/stage/b#2/request/search",
        "wf/fork/p#1/branch/c/stage/c#3/request/search",
      ],
    );

    // (5) Proposal order is B then C, by authored branch order.
    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.deepEqual(state.parallel!.branches.map((branch) => branch.status), ["awaiting_effects", "awaiting_effects"]);

    // (6)+(7) Settle C's Effect first. C re-enters and completes while B is still outstanding.
    await settleBranchEffect(harness, capabilities, "/branch/c/", { hit: "for-C" });

    const after = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(after.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "completed");
    assert.equal(after.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "awaiting_effects", "B is still outstanding");
    assert.equal(after.parallel!.joinReady, false, "(9) the join has not fired - B is not done");
    assert.equal(seenByD.length, 0, "Stage D has not run");

    // (8) Now settle B. B's observation is "for-B"; it must never have leaked into C's result.
    await settleBranchEffect(harness, capabilities, "/branch/b/", { hit: "for-B" });

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(seenByD.length, 1);
    // (10) Join result order is B, C by authored order, never completion order (C completed first).
    assert.deepEqual(seenByD[0], {
      forkId: "p",
      branches: [
        { branchId: "b", stageId: "b", result: 'B[search=completed:{"hit":"for-B"}]' },
        { branchId: "c", stageId: "c", result: 'C[search=completed:{"hit":"for-C"}]' },
      ],
    });
  });

  test("multiple Effect requests per branch: proposal order B1,B2,C1; settlement order C1,B2,B1 routes correctly", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: observingBranch("B", ["b1", "b2"]),
        c: observingBranch("C", ["c1"]),
        d: (ctx) => ({ status: "completed", result: JSON.stringify(ctx.join!.branches.map((branch) => branch.result)) }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-fx-multi", spec: branchForkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    // (11)+(12) proposal order is B1, B2, C1 - authored branch order, then Stage request order.
    const journal = await harness.effectJournalOf(handle.executionId);
    const requested = journal
      .filter((entry) => entry.phase === "requested")
      .sort((x, y) => x.sequence - y.sequence)
      .map((entry) => (entry.detail as { correlationId?: string }).correlationId);
    assert.deepEqual(requested, [
      "wf/fork/p#1/branch/b/stage/b#2/request/b1",
      "wf/fork/p#1/branch/b/stage/b#2/request/b2",
      "wf/fork/p#1/branch/c/stage/c#3/request/c1",
    ]);

    // (13) settle C1, then B2, then B1 - out of proposal order - and nothing is misrouted.
    await settleBranchEffect(harness, capabilities, "/request/c1", { r: "c1" });
    await settleBranchEffect(harness, capabilities, "/request/b2", { r: "b2" });
    // (14) B is still awaiting b1 - the b2 result alone does not complete its barrier.
    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "awaiting_effects");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "completed");
    await settleBranchEffect(harness, capabilities, "/request/b1", { r: "b1" });

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    const result = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!.provisionalResult;
    assert.equal(
      result,
      JSON.stringify(['B[b1=completed:{"r":"b1"},b2=completed:{"r":"b2"}]', 'C[c1=completed:{"r":"c1"}]']),
      "each branch saw exactly its own two / one observations, in Stage order",
    );
  });

  test("(14) a stale / duplicate result Event cannot settle another branch", async () => {
    const capabilities = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "knowledge.retrieval" }] }),
      capabilities,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: observingBranch("B", ["search"]),
        c: observingBranch("C", ["search"]),
        d: (ctx) => {
          seenByD.push(ctx.join);
          return { status: "completed", result: "done" };
        },
      }),
    });
    const seenByD: StageExecutionContext["join"][] = [];
    const ref = await definitions.save(defineWorkflow({ id: "g2-fx-stale", spec: branchForkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    await settleBranchEffect(harness, capabilities, "/branch/c/", { hit: "C-only" });
    // A spurious extra Activation must settle nothing new.
    await harness.runUntilIdle();

    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "awaiting_effects");
    assert.equal(
      state.parallel!.branches.find((branch) => branch.branchId === "b")!.barrier[0]!.settled,
      false,
      "B's barrier entry is untouched by C's result",
    );

    await settleBranchEffect(harness, capabilities, "/branch/b/", { hit: "B-only" });
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(seenByD[0]!.branches, [
      { branchId: "b", stageId: "b", result: 'B[search=completed:{"hit":"B-only"}]' },
      { branchId: "c", stageId: "c", result: 'C[search=completed:{"hit":"C-only"}]' },
    ], "each branch saw only its own observation");
  });
});

describe("Slice G.2: Agent / Workflow branch Stages", () => {
  const CHILD_STRING = { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } } as const;

  test("a Function branch and an Agent branch run together; the child is created via SpawnExecution, the branch is not an Execution", async () => {
    const { harness, definitions, store } = createWorkflowTestHarness({
      extraControllers: [createScriptedAgentController()],
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        local: (ctx) => ({ status: "completed", result: `local(${ctx.input})` }),
        d: (ctx) => ({ status: "completed", result: JSON.stringify(ctx.join!.branches) }),
      }),
    });
    await definitions.save(
      scriptedAgentDefinition({
        id: "worker",
        program: [{ do: "complete", result: "from-agent-branch" }],
        terminalResult: CHILD_STRING,
      }),
    );
    const spec: WorkflowSpecInput = {
      entryStage: "a",
      forks: [
        {
          id: "p",
          branches: [
            { id: "local", stage: "local" },
            { id: "agent", stage: "agent" },
          ],
          join: { next: "d" },
        },
      ],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "local", kind: "function", implementationRef: "local", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        {
          id: "agent",
          kind: "agent",
          child: { definitionId: "worker", definitionVersion: 1 },
          transitions: { kind: "always", next: { to: "join", fork: "p" } },
        },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await definitions.save(defineWorkflow({ id: "g2-agent-branch", spec }));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "COMPLETED", "the Workflow completed after the child terminal result");

    // (39)+(41) Exactly two Executions: the Workflow and the ONE child the Agent branch Stage called.
    // The Function branch and the branches themselves created nothing.
    const executions = await store.listExecutions();
    assert.equal(executions.length, 2, "one child Execution, created only because of the Agent Stage semantics");
    const child = executions.find((execution) => execution.executionId !== parent.executionId)!;
    assert.equal(child.kind, "agent");
    assert.equal(child.ownerExecutionId, parent.executionId);
    const links = await harness.childExecutionLinksOf(parent.executionId);
    assert.equal(links.length, 1, "one child call - not one per branch");
    assert.notEqual(links[0]!.pendingOperationId, null, "a call, not a detached spawn");

    // (10) join result order is authored: local, then agent.
    const result = readWorkflowControlState((await harness.inspect(parent.executionId))!.control.progress)!.provisionalResult;
    assert.deepEqual(JSON.parse(result ?? "[]"), [
      { branchId: "local", stageId: "local", result: "local(seed)" },
      { branchId: "agent", stageId: "agent", result: "from-agent-branch" },
    ]);
  });

  test("a Workflow branch Stage calls its child Workflow and joins after the child's terminal result", async () => {
    const { harness, definitions, store } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        localBody: (ctx) => ({ status: "completed", result: `L(${ctx.input})` }),
        childBody: (ctx) => ({ status: "completed", result: `child(${ctx.input})` }),
        d: (ctx) => ({ status: "completed", result: JSON.stringify(ctx.join!.branches.map((branch) => branch.result)) }),
      }),
    });
    await definitions.save(
      defineWorkflow({
        id: "sub",
        terminalResult: { schemaId: "sub", schemaVersion: 1, schema: { kind: "string" } },
        spec: {
          entryStage: "only",
          stages: [{ id: "only", kind: "function", implementationRef: "childBody", transitions: { kind: "always", next: { to: "complete", terminal: { kind: "value", value: "sub-done" } } } }],
        },
      }),
    );
    const spec: WorkflowSpecInput = {
      entryStage: "a",
      forks: [
        {
          id: "p",
          branches: [
            { id: "l", stage: "l" },
            { id: "w", stage: "w" },
          ],
          join: { next: "d" },
        },
      ],
      stages: [
        { id: "a", kind: "function", implementationRef: "a", transitions: { kind: "always", next: { to: "fork", fork: "p" } } },
        { id: "l", kind: "function", implementationRef: "localBody", transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "w", kind: "workflow", child: { definitionId: "sub", definitionVersion: 1 }, transitions: { kind: "always", next: { to: "join", fork: "p" } } },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await definitions.save(defineWorkflow({ id: "g2-workflow-branch", spec }));
    const parent = await harness.createExecution({ definition: ref, structuralSpawnBudget: 5 });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(parent.executionId))?.lifecycle, "COMPLETED");
    const executions = await store.listExecutions();
    assert.equal(executions.length, 2, "the Workflow plus the ONE child Workflow the branch Stage called");
    const child = executions.find((execution) => execution.executionId !== parent.executionId)!;
    assert.equal(child.kind, "workflow");
    const result = readWorkflowControlState((await harness.inspect(parent.executionId))!.control.progress)!.provisionalResult;
    assert.deepEqual(JSON.parse(result ?? "[]"), ["L(seed)", "sub-done"]);
  });
});

describe("Slice G.2: fail-closed deferred branch semantics", () => {
  const forkSpec = branchForkSpec(["b", "c"]);

  test("(42)+(43) a branch WriteMemory fails closed with the G.3-deferred code; the Effect journal stays empty", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "awaitEffects", effects: [{ kind: "write_memory", key: "w", memoryKey: "note", value: "B was here" }] }),
        c: () => ({ status: "completed", result: "C" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-branch-mem", spec: forkSpec }));
    const handle = await harness.createExecution({
      definition: ref,
      structuredMemory: { fields: [{ key: "note", description: "n", schema: { kind: "string" } }] },
    });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_memory_write_deferred");
    assert.match(context!.failure!.message, /G\.3/);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "nothing was proposed to the Harness");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 0);
  });

  test("(44) a branch emission stays unsupported", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "completed", result: "B", emissions: [{ body: { kind: "text", text: "leak" } }] }),
        c: () => ({ status: "completed", result: "C" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-branch-emit", spec: forkSpec }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_emissions_unsupported");
    assert.deepEqual(await harness.emissionsOf(handle.executionId), []);
  });

  test("(45) a branch transition label stays unsupported", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: () => ({ status: "completed", result: "B", transition: "somewhere" }),
        c: () => ({ status: "completed", result: "C" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g2-branch-label", spec: forkSpec }));
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();
    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_transition_unsupported");
  });

  test("(46)+(47) branch Adapters and nested / multi-Stage branch topology stay statically invalid", () => {
    const fn = (id: string, next: unknown) => ({ id, kind: "function", implementationRef: id, transitions: { kind: "always", next } });
    const toJoin = { to: "join", fork: "p" };

    // branch Stage with Adapters
    const withAdapters = validateWorkflowSpec({
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        fn("a", { to: "fork", fork: "p" }),
        { id: "b", kind: "function", implementationRef: "b", outputAdapters: [{ kind: "function", implementationRef: "x" }], transitions: { kind: "always", next: toJoin } },
        fn("c", toJoin),
        fn("d", { to: "complete" }),
      ],
    });
    assert.equal(withAdapters.ok, false);
    assert.ok(!withAdapters.ok && withAdapters.issues.some((issue) => /Adapters/.test(issue.message)));

    // a branch Stage that transitions somewhere other than its fork's join (multi-Stage subgraph attempt)
    const multiStage = validateWorkflowSpec({
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [
        fn("a", { to: "fork", fork: "p" }),
        fn("b", { to: "stage", stage: "d" }),
        fn("c", toJoin),
        fn("d", { to: "complete" }),
      ],
    });
    assert.equal(multiStage.ok, false);

    // a nested fork attempt: a branch Stage transitioning to a fork
    const nested = validateWorkflowSpec({
      entryStage: "a",
      forks: [{ id: "p", branches: [{ id: "b", stage: "b" }, { id: "c", stage: "c" }], join: { next: "d" } }],
      stages: [fn("a", { to: "fork", fork: "p" }), fn("b", { to: "fork", fork: "p" }), fn("c", toJoin), fn("d", { to: "complete" })],
    });
    assert.equal(nested.ok, false);
  });
});
