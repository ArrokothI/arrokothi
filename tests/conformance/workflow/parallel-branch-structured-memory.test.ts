/**
 * concurrent Structured Memory branch writes + explicit optimistic conflict handling.
 *
 * A parallel Workflow branch may now use the ordinary `WriteMemory` Effect, but only *optimistically*:
 * a branch write must carry an explicit `expectedRevision`. This connects two already-proven pieces
 * with no new merge system:
 *
 * ```text
 * optimistic whole-view expectedRevision, memory.written / memory.write_conflict, whole-view CAS
 * branch-local Effect barriers, branch-qualified correlations, authored proposal folding,
 *       one Workflow Execution owning every branch Effect
 * ```
 *
 * What these cases hold true:
 *
 * ```text
 * a versioned branch write goes through the ordinary WriteMemory machinery (authority, confirmation,
 *   whole-view revision check / physical CAS) - no branch-specific memory path, no BranchMemory
 * an UNVERSIONED branch write fails closed before the Harness (parallel_branch_memory_write_requires_revision)
 * simultaneously ungated branch writes are arbitrated by AUTHORED branch order, not wall-clock timing
 * a stale versioned branch write settles its branch barrier "conflicted" - it never overwrites, and it
 *   does NOT automatically fail the branch / fork / Workflow (the Stage re-enters and decides)
 * whole-view revision stays deliberately coarse: disjoint keys still conflict
 * two sibling branches may share a Stage-local request key and still route independently
 * no automatic retry / merge; exactly one write attempt per proposal
 * denied / declined / approved-stale each mutate nothing and reach the branch as their own outcome
 * a branch WriteMemory proposal never reaches the Harness when a sibling fails in the same Activation
 * a branch WriteMemory Event and a sibling LLM ControllerResumption compose in one dependency set
 * a persisted active fork with a branch awaiting a WriteMemory result reconstructs and continues
 * ordinary non-parallel unconditional WriteMemory is unchanged
 * no Stage / Effect / Event / wait vocabulary is added; WORKFLOW_CONTROL_STATE_VERSION stays 4
 * ```
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ControllerRegistry,
  EFFECT_KINDS,
  EVENT_KINDS,
  Harness,
  STAGE_KINDS,
  WORKFLOW_CONTROL_STATE_VERSION,
  createWorkflowController,
  defineWorkflow,
  readWorkflowControlState,
} from "@arrokothi/core/execution";
import type { JsonValue, WorkflowSpecInput } from "@arrokothi/core/execution";
import type { ConfirmationPolicy, FunctionStageOutcome, StageExecutionContext } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredModelProvider,
  createFunctionStageRegistry,
  StaticModelResolver,
  portableModelFeatures,
} from "@arrokothi/core/reference";
import { createWorkflowTestHarness, modelAccess, seedStructuredMemory } from "@arrokothi/core/testing";

const MEMORY = {
  fields: [
    { key: "note", description: "a free-text note", schema: { kind: "string" } },
    { key: "alt", description: "a second free-text note", schema: { kind: "string" } },
    { key: "count", description: "a bounded integer", schema: { kind: "number", integer: true, min: 0 } },
  ],
} as const;

const ALLOW_MEMORY = createAllowListAuthorizer({ grants: [], memory: true });

/** entry `a` -> fork P over `branchIds` (each its own same-named Function Stage) -> join -> `d`. */
function forkSpec(branchIds: readonly string[]): WorkflowSpecInput {
  return {
    entryStage: "a",
    forks: [{ id: "p", branches: branchIds.map((id) => ({ id, stage: id })), join: { next: "d" } }],
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

interface WriteSpec {
  readonly memoryKey: string;
  readonly value: JsonValue;
  readonly expectedRevision?: number;
  /** Stage-local request key; defaults to "save" so sibling branches deliberately collide on it. */
  readonly key?: string;
}

/**
 * A Function branch that, on its first visit, proposes one or more versioned `WriteMemory` requests,
 * and on re-entry completes with `"<tag>:<outcome>[,<outcome>...]"` describing what it observed. An
 * optional `delayMs` before the write makes another branch finish first in wall-clock time without
 * changing the authored proposal order.
 */
function writerBranch(
  tag: string,
  writes: readonly WriteSpec[],
  opts: { readonly delayMs?: number; readonly order?: string[] } = {},
): (ctx: StageExecutionContext) => Promise<FunctionStageOutcome> {
  return async (ctx): Promise<FunctionStageOutcome> => {
    if ((ctx.progress as { wrote?: boolean }).wrote !== true) {
      if (opts.delayMs) await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
      opts.order?.push(tag);
      return {
        status: "awaitEffects",
        progress: { wrote: true },
        effects: writes.map((write) => ({
          kind: "write_memory" as const,
          key: write.key ?? "save",
          memoryKey: write.memoryKey,
          value: write.value,
          ...(write.expectedRevision !== undefined ? { expectedRevision: write.expectedRevision } : {}),
        })),
      };
    }
    const outcomes = ctx.observations.map((observation) => observation.outcome);
    return { status: "completed", result: `${tag}:${outcomes.join(",")}`, progress: { wrote: true, outcomes } };
  };
}

/** The `d` Function Stage: records the join snapshot and completes with the serialized branch results. */
function joinRecorder(sink: StageExecutionContext["join"][]): (ctx: StageExecutionContext) => FunctionStageOutcome {
  return (ctx): FunctionStageOutcome => {
    sink.push(ctx.join);
    return { status: "completed", result: JSON.stringify(ctx.join?.branches.map((branch) => branch.result) ?? []) };
  };
}

const passthrough = (tag: string) => (ctx: StageExecutionContext): FunctionStageOutcome => ({
  status: "completed",
  result: `${tag}(${ctx.input})`,
});

const confirmWrites: ConfirmationPolicy = {
  requires(request) {
    return request.effectKind === "write_memory"
      ? { required: true, reason: "confirm the exact Structured Memory write" }
      : { required: false };
  },
};

// ---------------------------------------------------------------------------

describe("a versioned branch write, and the expectedRevision requirement", () => {
  test("A. one versioned branch write commits through the ordinary WriteMemory path; one Execution, no child", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions, store } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "count", value: 10, expectedRevision: 0 }]),
        c: passthrough("C"),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-a", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");

    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1, "exactly one commit advanced the whole-view revision");
    assert.equal(view.values["count"]?.value, 10);
    assert.equal(view.writes.length, 1);

    // The write is the one enclosing Workflow Execution's Effect - the branch is not an Execution.
    assert.equal((await store.listExecutions()).length, 1);
    assert.deepEqual(await harness.childExecutionLinksOf(handle.executionId), []);

    // Branch-qualified correlation.
    const journal = await harness.effectJournalOf(handle.executionId);
    const requested = journal.filter((entry) => entry.phase === "requested");
    assert.equal(requested.length, 1);
    assert.equal(
      (requested[0]!.detail as { correlationId?: string }).correlationId,
      "wf/fork/p#1/branch/b/stage/b#2/request/save",
    );
    assert.equal(requested[0]!.effectKind, "write_memory");

    // The branch saw "completed" and completed normally; the join carries authored-order results.
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C(seed)" },
    ]);
  });

  test("B. an unversioned branch write fails closed before the Harness - no journal, no PendingOperation, no mutation", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B" }]), // no expectedRevision
        c: passthrough("C"),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-b", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_memory_write_requires_revision");
    assert.match(context!.failure!.message, /fork "p" branch "b"/);
    assert.match(context!.failure!.message, /expectedRevision/);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "nothing reached the Effect gateway");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.deepEqual(await harness.confirmationRequestsOf(handle.executionId), []);
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 0);
  });

  test("B (mixed). one branch versions its write and a sibling does not - the sibling still fails closed", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "alt", value: "C" }]), // unversioned
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-b-mixed", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_memory_write_requires_revision");
    assert.match(context!.failure!.message, /branch "c"/, "the earliest authored failing branch is reported");
    // Failure atomicity: B's well-formed versioned proposal never reached the Harness either.
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), []);
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 0);
  });

  test("T. an ordinary NON-parallel unconditional WriteMemory is unchanged", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        save: (ctx): FunctionStageOutcome =>
          ctx.observations.length === 0
            ? { status: "awaitEffects", effects: [{ kind: "write_memory", key: "w", memoryKey: "note", value: "plain" }] }
            : { status: "completed", result: `saved:${ctx.observations[0]?.outcome}` },
      }),
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "g3-t",
        spec: {
          entryStage: "save",
          stages: [
            { id: "save", kind: "function", implementationRef: "save", transitions: { kind: "always", next: { to: "complete" } } },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1, "an unconditional non-parallel write still commits and advances the revision");
    assert.equal(view.values["note"]?.value, "plain");
    const phases = (await harness.effectJournalOf(handle.executionId)).map((entry) => entry.phase);
    assert.equal(phases.includes("conflicted"), false);
    assert.ok(phases.includes("completed"));
  });
});

describe("deterministic proposal arbitration for simultaneously ungated branch writes", () => {
  test("C. two sibling writes from the same revision - the authored-first branch commits, the other conflicts", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "from-B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "note", value: "from-C", expectedRevision: 0 }]),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-c", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1, "exactly one of the two same-revision writes committed");
    assert.equal(view.values["note"]?.value, "from-B", "the authored-first branch is the winner");
    assert.equal(view.writes.length, 1);

    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C:conflicted" },
    ]);

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((entry) => entry.phase === "completed").length, 1);
    assert.equal(journal.filter((entry) => entry.phase === "conflicted").length, 1);
  });

  test("D. reversing the authored branch order reverses the ungated winner", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "from-B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "note", value: "from-C", expectedRevision: 0 }]),
        d: joinRecorder(joinSeen),
      }),
    });
    // Authored order is now C, then B.
    const ref = await definitions.save(defineWorkflow({ id: "g3-d", spec: forkSpec(["c", "b"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.values["note"]?.value, "from-C", "with C authored first, C is the winner");
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "c", stageId: "c", result: "C:completed" },
      { branchId: "b", stageId: "b", result: "B:conflicted" },
    ]);
  });

  test("E. reversing the wall-clock branch completion order does NOT reverse the proposal winner", async () => {
    const order: string[] = [];
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        // B is authored first but finishes its local computation LAST (a real delay before the write).
        b: writerBranch("B", [{ memoryKey: "note", value: "from-B", expectedRevision: 0 }], { delayMs: 25, order }),
        c: writerBranch("C", [{ memoryKey: "note", value: "from-C", expectedRevision: 0 }], { order }),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-e", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    assert.deepEqual(order, ["C", "B"], "C's local branch computation finished before B's in wall-clock time");
    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.values["note"]?.value, "from-B", "authored order (B first) still decides the winner, not completion timing");
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C:conflicted" },
    ]);
  });

  test("F. disjoint keys still conflict on the whole-view revision - deliberate conservative coarseness", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B-note", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "count", value: 7, expectedRevision: 0 }]),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-f", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1);
    assert.equal(view.values["note"]?.value, "B-note");
    assert.equal(view.values["count"], undefined, "the disjoint-key write still conflicted on the whole-view revision");

    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress);
    // (already joined/complete) - assert via the journal instead.
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((entry) => entry.phase === "conflicted").length, 1);
    void state;
  });

  test("G. sibling branches sharing the Stage-local request key \"save\" route their observations independently", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ key: "save", memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ key: "save", memoryKey: "alt", value: "C", expectedRevision: 0 }]),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-g", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const requested = (await harness.effectJournalOf(handle.executionId))
      .filter((entry) => entry.phase === "requested")
      .map((entry) => (entry.detail as { correlationId?: string }).correlationId)
      .sort();
    assert.deepEqual(requested, [
      "wf/fork/p#1/branch/b/stage/b#2/request/save",
      "wf/fork/p#1/branch/c/stage/c#3/request/save",
    ], "the same Stage-local key produced two distinct branch-qualified correlations");

    // B committed, C conflicted (whole-view revision), and each branch saw exactly its own outcome.
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C:conflicted" },
    ]);
  });
});

describe("conflict is an observation, not an automatic failure", () => {
  test("H. a conflicted branch settles \"conflicted\" and may still complete normally - fork and Workflow proceed", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "note", value: "C", expectedRevision: 0 }]),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-h", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED", "a branch conflict did not fail the branch, the fork, or the Workflow");
    assert.equal(joinSeen.length, 1, "the join fired");
    assert.equal(joinSeen[0]!.branches[1]!.result, "C:conflicted", "the conflicted branch produced its own deterministic result");
  });

  test("I. a conflicted branch performs no automatic retry - exactly one write attempt per proposal", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "note", value: "C", expectedRevision: 0 }]),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-i", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const journal = await harness.effectJournalOf(handle.executionId);
    const requested = journal.filter((entry) => entry.phase === "requested");
    assert.equal(requested.length, 2, "two proposals total - one per branch, never re-proposed after the conflict");
    const cRequests = requested.filter((entry) => (entry.detail as { correlationId?: string }).correlationId?.includes("/branch/c/"));
    assert.equal(cRequests.length, 1, "the conflicted branch C attempted its write exactly once");
    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1);
    assert.equal(view.writes.length, 1, "only the successful write is in the history");
  });

  test("O. two versioned writes inside one branch keep request order and conflict on the view revision", async () => {
    const observedByB: string[][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: (ctx): FunctionStageOutcome => {
          if ((ctx.progress as { wrote?: boolean }).wrote !== true) {
            return {
              status: "awaitEffects",
              progress: { wrote: true },
              effects: [
                { kind: "write_memory", key: "first", memoryKey: "note", value: "first", expectedRevision: 0 },
                { kind: "write_memory", key: "second", memoryKey: "alt", value: "second", expectedRevision: 0 },
              ],
            };
          }
          const seen = ctx.observations.map((observation) => `${observation.key}=${observation.outcome}`);
          observedByB.push(seen);
          return { status: "completed", result: seen.join(",") };
        },
        c: passthrough("C"),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-o", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(
      observedByB[0],
      ["first=completed", "second=conflicted"],
      "the branch re-entered only after BOTH requests had terminal observations, in request/barrier order",
    );
    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1, "the first write advanced the view; the second (still expecting 0) conflicted");
    assert.equal(view.values["note"]?.value, "first");
    assert.equal(view.values["alt"], undefined);
  });

  test("P. the join waits for every branch and exposes results in authored branch order", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "count", value: 1, expectedRevision: 0 }]),
        e: writerBranch("E", [{ memoryKey: "alt", value: "E", expectedRevision: 0 }]),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-p", spec: forkSpec(["b", "c", "e"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.deepEqual(
      joinSeen[0]!.branches.map((branch) => branch.branchId),
      ["b", "c", "e"],
      "authored branch order regardless of which write won",
    );
    // Exactly one branch committed (whole-view revision); the other two conflicted.
    const results = joinSeen[0]!.branches.map((branch) => String(branch.result));
    assert.equal(results.filter((result) => result.endsWith(":completed")).length, 1);
    assert.equal(results.filter((result) => result.endsWith(":conflicted")).length, 2);
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 1);
  });
});

describe("authority is fail-closed; confirmation stays authoritative", () => {
  test("J. a denied versioned branch write mutates nothing and reaches the branch as \"denied\"", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [] }), // memory writes NOT granted
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: passthrough("C"),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-j", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED", "a denied branch write does not fail the Workflow");
    assert.equal(joinSeen[0]!.branches[0]!.result, "B:denied");
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 0, "no memory mutation");
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "denied"]);
  });

  test("K. a declined confirmation for a versioned branch write mutates nothing and reaches the branch as \"declined\"", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      confirmationPolicy: confirmWrites,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: passthrough("C"),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-k", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    assert.ok(confirmation, "the branch write opened one exact-payload confirmation");
    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "decline" });
    assert.equal(receipt.status, "declined");
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(joinSeen[0]!.branches[0]!.result, "B:declined");
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 0, "nothing dispatched to Structured Memory");
  });

  test("L. two gated branch writes: approving C before B means B's stale approval conflicts, never overwrites", async () => {
    const joinSeen: StageExecutionContext["join"][] = [];
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      confirmationPolicy: confirmWrites,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "from-B", expectedRevision: 0 }]),
        c: writerBranch("C", [{ memoryKey: "note", value: "from-C", expectedRevision: 0 }]),
        d: joinRecorder(joinSeen),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-l", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const confirmations = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal(confirmations.length, 2, "both branch writes are independently gated");
    const bConf = confirmations.find((c) => ((c.proposal as { requestKey?: string }).requestKey ?? "").includes("/branch/b/"))!;
    const cConf = confirmations.find((c) => ((c.proposal as { requestKey?: string }).requestKey ?? "").includes("/branch/c/"))!;

    // Approve C first: it passes the revision check and commits.
    const cReceipt = await harness.resolveConfirmation({ confirmationId: cConf.confirmationId, decision: "approve" });
    assert.equal(cReceipt.status, "dispatched");
    await harness.runUntilIdle();

    // Now approve B: the view advanced to revision 1 while B's confirmation was pending, so the exact
    // approved write is stale and conflicts - it does NOT overwrite C's commit.
    const bReceipt = await harness.resolveConfirmation({ confirmationId: bConf.confirmationId, decision: "approve" });
    assert.equal(bReceipt.status, "conflicted", "an approved-but-stale branch write conflicts, never last-writer-wins");
    await harness.runUntilIdle();

    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1);
    assert.equal(view.values["note"]?.value, "from-C", "the write that passed the revision check first stands");
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:conflicted" },
      { branchId: "c", stageId: "c", result: "C:completed" },
    ]);

    const [bOperation] = (await harness.pendingOperationsOf(handle.executionId)).filter(
      (operation) => operation.effectKind === "write_memory" && operation.outcome === "conflicted",
    );
    assert.ok(bOperation, "B's gated operation settled conflicted");
    assert.equal(bOperation!.dispatch, "not_dispatched", "nothing reached Structured Memory mutation for B");
  });
});

describe("failure atomicity and the mixed dependency set", () => {
  test("M. branch B proposes a versioned write while sibling C fails in the same Activation - the write never reaches the Harness", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: () => ({ status: "failed", code: "c_broke", message: "C could not compute" }),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-m", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "parallel_branch_failed:c_broke");
    // The Structured Memory version of the "Effect proposal + sibling failure" proof.
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.revision, 0, "memory revision unchanged");
    assert.equal((await harness.structuredMemoryOf(handle.executionId))?.values["note"], undefined, "value unchanged");
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "no B write request in the Effect journal");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
    assert.deepEqual(await harness.confirmationRequestsOf(handle.executionId), []);
  });

  test("N. a branch WriteMemory Event and a sibling LLM ControllerResumption compose in one dependency set", async () => {
    const beta = createDeferredModelProvider("beta");
    const joinSeen: StageExecutionContext["join"][] = [];
    const resolver = new StaticModelResolver({
      wC: { provider: "beta", model: "beta-1", portableFeatures: portableModelFeatures() },
    });
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      confirmationPolicy: confirmWrites, // gate B's write so its memory operation stays pending across Activations
      models: modelAccess(resolver, [beta]),
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        d: joinRecorder(joinSeen),
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
          system: "branch C",
          prompt: "{{input}}",
          transitions: { kind: "always", next: { to: "join", fork: "p" } },
        },
        { id: "d", kind: "function", implementationRef: "d", transitions: { kind: "always", next: { to: "complete" } } },
      ],
    };
    const ref = await definitions.save(defineWorkflow({ id: "g3-n", spec }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    // One Execution, one honest union wait: an Event dependency for B's gated write plus C's model resumption.
    const waiting = await harness.inspect(handle.executionId);
    assert.equal(waiting?.lifecycle, "WAITING");
    const wait = waiting!.waitingFor as { kind: string; event: unknown; resumptions: readonly string[] };
    assert.equal(wait.kind, "dependencies");
    assert.ok(wait.event !== null, "B's WriteMemory result is an Event dependency");
    assert.equal(wait.resumptions.length, 1, "C's model call is a ControllerResumption dependency - no PendingOperation, no Event");
    assert.equal((await harness.controllerResumptionsOf(handle.executionId)).length, 1);
    const bPending = await harness.pendingOperationsOf(handle.executionId);
    assert.equal(bPending.length, 1, "only B's gated write is a PendingOperation");

    // B's memory result arriving (confirmation approved) wakes the set and does NOT invalidate C's resumption.
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    await harness.runUntilIdle();

    let state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "completed");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "awaiting_resumption");
    const cRecord = (await harness.controllerResumptionsOf(handle.executionId))[0]!;
    assert.equal(cRecord.state, "pending", "C's model resumption was not invalidated by B's memory result");
    assert.equal(beta.invocationCount, 1);

    // C settling later drives the ordinary path; B's committed write is untouched.
    beta.settle({ text: "C-model" });
    await harness.drainResumptions();
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(beta.invocationCount, 1, "C's model call was invoked exactly once");
    const view = (await harness.structuredMemoryOf(handle.executionId))!;
    assert.equal(view.revision, 1);
    assert.equal(view.values["note"]?.value, "B");
    assert.deepEqual(joinSeen[0]!.branches, [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C-model" },
    ]);
  });
});

describe("reconstruction from persisted branch memory-barrier state", () => {
  test("Q. a fresh WorkflowController over the same store continues a branch awaiting a WriteMemory result", async () => {
    const first = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      confirmationPolicy: confirmWrites,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: passthrough("C"),
        d: (ctx): FunctionStageOutcome => ({ status: "completed", result: JSON.stringify(ctx.join?.branches ?? []) }),
      }),
    });
    const ref = await first.definitions.save(defineWorkflow({ id: "g3-q", spec: forkSpec(["b", "c"]) }));
    const handle = await first.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await first.harness.runUntilIdle();

    const before = readWorkflowControlState((await first.harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(before.parallel!.branches.find((branch) => branch.branchId === "b")!.status, "awaiting_effects");
    const bBarrierEntry = before.parallel!.branches.find((branch) => branch.branchId === "b")!.barrier[0]!;
    assert.equal("effectKind" in bBarrierEntry && bBarrierEntry.effectKind, "write_memory");
    assert.equal(before.parallel!.branches.find((branch) => branch.branchId === "c")!.status, "completed");
    const beforeWait = (await first.harness.inspect(handle.executionId))!.waitingFor;

    // A brand-new Harness + WorkflowController over the SAME persisted store / scheduler / records.
    const rebuilt = new Harness({
      definitions: first.definitions,
      store: first.store,
      scheduler: first.scheduler,
      controllers: new ControllerRegistry([
        createWorkflowController({
          functions: createFunctionStageRegistry({
            a: () => ({ status: "completed", result: "seed" }),
            b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
            c: passthrough("C"),
            d: (ctx: StageExecutionContext): FunctionStageOutcome => ({ status: "completed", result: JSON.stringify(ctx.join?.branches ?? []) }),
          }),
        }),
      ]),
      clock: first.clock,
      ids: first.ids,
      authorizer: ALLOW_MEMORY,
      confirmationPolicy: confirmWrites,
    });

    const resumed = readWorkflowControlState((await rebuilt.inspect(handle.executionId))!.control.progress)!;
    assert.deepEqual(resumed, before, "the reconstructed runtime reads the same branch + barrier state, byte for byte");
    assert.deepEqual((await rebuilt.inspect(handle.executionId))!.waitingFor, beforeWait, "and the same durable Event wait");
    assert.deepEqual(JSON.parse(JSON.stringify(resumed)), resumed, "no Promise / memory client in controller state");

    // Drive it to completion under the fresh controller.
    const [confirmation] = await rebuilt.confirmationRequestsOf(handle.executionId);
    await rebuilt.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    await rebuilt.runUntilIdle();

    const done = await rebuilt.inspect(handle.executionId);
    assert.equal(done?.lifecycle, "COMPLETED");
    assert.equal((await rebuilt.structuredMemoryOf(handle.executionId))?.values["note"]?.value, "B");
    assert.deepEqual(JSON.parse(readWorkflowControlState(done!.control.progress)!.provisionalResult ?? "[]"), [
      { branchId: "b", stageId: "b", result: "B:completed" },
      { branchId: "c", stageId: "c", result: "C(seed)" },
    ]);
  });
});

describe("fork invariants and closed vocabularies", () => {
  test("R. currentStage + visit / visits / forkVisit stay truthful while a branch write is outstanding", async () => {
    const { harness, definitions } = createWorkflowTestHarness({
      authorizer: ALLOW_MEMORY,
      confirmationPolicy: confirmWrites,
      functions: createFunctionStageRegistry({
        a: () => ({ status: "completed", result: "seed" }),
        b: writerBranch("B", [{ memoryKey: "note", value: "B", expectedRevision: 0 }]),
        c: passthrough("C"),
        d: () => ({ status: "completed", result: "done" }),
      }),
    });
    const ref = await definitions.save(defineWorkflow({ id: "g3-r", spec: forkSpec(["b", "c"]) }));
    const handle = await harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await harness.runUntilIdle();

    const state = readWorkflowControlState((await harness.inspect(handle.executionId))!.control.progress)!;
    assert.equal(state.currentStage, "a", "currentStage still names the forking Stage");
    assert.equal(state.visit, 1, "visit is the forking Stage's real invocation number, unchanged by the fork");
    assert.equal(state.visits, 3, "visits is the allocation high-water: a@1, b@2, c@3");
    assert.equal(state.parallel!.forkVisit, 1, "forkVisit is the fork-invocation coordinate, independent of visit allocation");
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "b")!.visit, 2);
    assert.equal(state.parallel!.branches.find((branch) => branch.branchId === "c")!.visit, 3);
  });

  test("S. structured-memory branches add no Stage / Effect / Event / wait vocabulary and do not bump the control-state version", async () => {
    assert.deepEqual([...STAGE_KINDS], ["function", "llm", "agent", "workflow"]);
    assert.deepEqual([...EFFECT_KINDS], ["use_capability", "write_memory", "spawn_execution", "send_message", "request_user_input"]);
    assert.equal(EVENT_KINDS.includes("memory.conflict_resolved" as never), false);
    assert.equal(EVENT_KINDS.includes("parallel_write" as never), false);
    assert.equal(EVENT_KINDS.includes("branch_memory" as never), false);
    assert.ok(EVENT_KINDS.includes("memory.written"));
    assert.ok(EVENT_KINDS.includes("memory.write_conflict"));
    assert.equal(WORKFLOW_CONTROL_STATE_VERSION, 4, "the branch barrier already represents WriteMemory");
  });
});
