/**
 * Slice G.0: the first honest optimistic Structured Memory write precondition.
 *
 * `WriteMemoryProposal.expectedRevision` is an optional application-level compare-and-set on the
 * whole bound `StructuredMemoryView.revision`. Absent -> the accepted F.0 unconditional write.
 * Present and stale -> a *distinct* `memory.write_conflict` observation, a terminal `conflicted`
 * journal phase, and (when gated) a `conflicted` PendingOperation outcome with `dispatch`
 * `not_dispatched`. A stale versioned write never silently becomes last-write-wins.
 *
 * These cases prove: unconditional compatibility, a matching precondition, a stale precondition,
 * a lost-update race, deliberately-coarse view-level conflict across different keys, structural
 * rejection of malformed preconditions before any authorizer/memory lookup, authorization ordering
 * with no revision oracle, the confirmation digest covering the precondition, the confirmation/state
 * race, Event/observation fidelity across the Workflow Stage and Agent action vocabularies, the
 * store-level physical CAS backstop, and the model-facing surfaces staying unchanged.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type {
  EventEnvelope,
  StructuredMemoryBinding,
  WriteMemoryProposal,
} from "@agent-sdk/core/execution";
import {
  defineWorkflow,
  effectRequestsIn,
  expectedRevisionIssues,
  effectProposalIssues,
  proposalDigest,
  writeMemory,
} from "@agent-sdk/core/execution";
import type {
  ActivationOutcome,
  ConfirmationPolicy,
  EffectAuthorizer,
  ExecutionController,
  FunctionStageOutcome,
  RuntimeTransaction,
} from "@agent-sdk/core/ports";
import { StructuredMemoryConcurrencyError } from "@agent-sdk/core/ports";
import { createAllowListAuthorizer, createFunctionStageRegistry, InMemoryRuntimeStore } from "@agent-sdk/core/reference";
import {
  agentModelAccess,
  createAgentTestHarness,
  createTestHarness,
  createWorkflowTestHarness,
  readScriptedProgress,
  scriptedAgentDefinition,
  seedStructuredMemory,
} from "@agent-sdk/core/testing";
import { scriptedAgentExecutor, testAgent, testModelResolver } from "../agent/fixtures.ts";

const MEMORY = {
  fields: [
    {
      key: "profile",
      description: "The explicitly asserted application profile.",
      schema: {
        kind: "object",
        fields: { name: { required: true, schema: { kind: "string", minLength: 1 } } },
        additionalProperties: false,
      },
    },
    { key: "count", description: "A bounded integer.", schema: { kind: "number", integer: true, min: 0 } },
  ],
} as const satisfies StructuredMemoryBinding;

function versionedWrite(
  key: string,
  value: WriteMemoryProposal["value"],
  requestKey: string,
  expectedRevision?: number,
): WriteMemoryProposal {
  return {
    kind: "write_memory",
    key,
    value,
    requestKey,
    ...(expectedRevision !== undefined ? { expectedRevision } : {}),
  };
}

async function scriptedWriter(
  id: string,
  effects: readonly WriteMemoryProposal[],
  options: {
    readonly authorizer?: EffectAuthorizer;
    readonly confirmationPolicy?: ConfirmationPolicy;
    readonly memory?: StructuredMemoryBinding;
    readonly store?: InMemoryRuntimeStore;
  } = {},
) {
  const bundle = createTestHarness({
    authorizer: options.authorizer ?? createAllowListAuthorizer({ grants: [], memory: true }),
    ...(options.confirmationPolicy ? { confirmationPolicy: options.confirmationPolicy } : {}),
    ...(options.store ? { store: options.store } : {}),
  });
  const ref = await bundle.definitions.save(
    scriptedAgentDefinition({
      id,
      program: [
        ...effects.map((effect) => ({ do: "propose_effect", effect } as const)),
        { do: "complete" as const },
      ],
    }),
  );
  const handle = await bundle.harness.createExecution({
    definition: ref,
    ...(options.memory !== undefined ? { structuredMemory: options.memory } : {}),
  });
  return { ...bundle, handle };
}

function progressOf(bundle: Awaited<ReturnType<typeof scriptedWriter>>) {
  return bundle.harness
    .inspect(bundle.handle.executionId)
    .then((context) => readScriptedProgress(context!.control.progress));
}

describe("G.0 — unconditional compatibility", () => {
  test("a WriteMemory with no expectedRevision behaves exactly as F.0", async () => {
    const run = await scriptedWriter("unconditional", [versionedWrite("count", 1, "w1"), versionedWrite("count", 2, "w2")], {
      memory: MEMORY,
    });
    await run.harness.runUntilIdle();

    const view = (await run.harness.structuredMemoryOf(run.handle.executionId))!;
    assert.equal(view.revision, 2, "revision advances once per unconditional commit");
    assert.equal(view.values["count"]?.value, 2);

    const progress = await progressOf(run);
    assert.deepEqual(progress.seenKinds, ["memory.written", "memory.written"], "no conflict machinery appears on this path");

    const phases = (await run.harness.effectJournalOf(run.handle.executionId)).map((entry) => entry.phase);
    assert.equal(phases.includes("conflicted"), false, "no conflicted journal phase");
    assert.deepEqual(
      phases.filter((phase) => phase === "completed"),
      ["completed", "completed"],
    );
  });
});

describe("G.0 — the optimistic precondition", () => {
  test("a matching precondition commits exactly once and advances the revision", async () => {
    const run = await scriptedWriter("matching", [versionedWrite("count", 5, "w1", 0)], { memory: MEMORY });
    await run.harness.runUntilIdle();

    const view = (await run.harness.structuredMemoryOf(run.handle.executionId))!;
    assert.equal(view.revision, 1);
    assert.equal(view.values["count"]?.value, 5);
    assert.equal(view.writes.length, 1);

    const progress = await progressOf(run);
    assert.deepEqual(progress.seenKinds, ["memory.written"]);
    assert.equal(
      (await run.harness.effectJournalOf(run.handle.executionId)).filter((entry) => entry.phase === "completed").length,
      1,
    );
  });

  test("a stale precondition produces a conflict and mutates nothing", async () => {
    // The view is already at revision 1 (first write), so the second write expecting 0 is stale.
    const run = await scriptedWriter(
      "stale",
      [versionedWrite("count", 5, "w1"), versionedWrite("count", 9, "w2", 0)],
      { memory: MEMORY },
    );
    await run.harness.runUntilIdle();

    const view = (await run.harness.structuredMemoryOf(run.handle.executionId))!;
    assert.equal(view.revision, 1, "no revision advance");
    assert.equal(view.values["count"]?.value, 5, "the stale write did not overwrite");
    assert.equal(view.writes.length, 1, "no write-history append");

    const progress = await progressOf(run);
    assert.deepEqual(progress.seenKinds, ["memory.written", "memory.write_conflict"]);
    const conflict = progress.observations[1] as {
      effectKind: string;
      key: string;
      expectedRevision: number;
      actualRevision: number;
      memoryViewId: string;
      pendingOperationId: unknown;
    };
    assert.deepEqual(
      {
        effectKind: conflict.effectKind,
        key: conflict.key,
        expectedRevision: conflict.expectedRevision,
        actualRevision: conflict.actualRevision,
        pendingOperationId: conflict.pendingOperationId,
      },
      { effectKind: "write_memory", key: "count", expectedRevision: 0, actualRevision: 1, pendingOperationId: null },
    );
    assert.equal(conflict.memoryViewId, view.memoryViewId);

    const journal = await run.harness.effectJournalOf(run.handle.executionId);
    const conflictEntries = journal.filter((entry) => entry.phase === "conflicted");
    assert.equal(conflictEntries.length, 1, "exactly one terminal conflicted journal outcome");
    assert.equal(conflictEntries[0]!.detail["code"], "structured_memory_write_conflict");
    assert.equal(
      journal.some((entry) => entry.effectId === conflictEntries[0]!.effectId && entry.phase === "dispatch_started"),
      false,
      "a stale semantic precondition is caught before dispatch_started",
    );
    assert.deepEqual(await run.harness.pendingOperationsOf(run.handle.executionId), [], "an ungated conflict needs no operation record");
  });

  test("lost-update: two writes at the same expected revision, exactly one commits", async () => {
    const run = await scriptedWriter(
      "lost-update",
      [versionedWrite("count", 100, "a", 0), versionedWrite("count", 200, "b", 0)],
      { memory: MEMORY },
    );
    await run.harness.runUntilIdle();

    const view = (await run.harness.structuredMemoryOf(run.handle.executionId))!;
    assert.equal(view.revision, 1, "exactly one of the two versioned writes committed");
    assert.equal(view.values["count"]?.value, 100, "the winner is the first, not whichever finished last");
    assert.equal(view.writes.length, 1);

    const progress = await progressOf(run);
    assert.deepEqual(
      progress.seenKinds,
      ["memory.written", "memory.write_conflict"],
      "one write committed, the other conflicted - neither was silently accepted",
    );
  });

  test("different keys still conflict on the same whole-view revision - deliberate G.0 coarseness", async () => {
    // Writer A targets `profile`, writer B targets `count`, both expecting revision 0. After A commits,
    // B conflicts even though the keys are disjoint. This is intentional view-level semantics for G.0,
    // not a bug: G.0 uses the whole Structured Memory view revision. Field-level conflict is later work.
    const run = await scriptedWriter(
      "coarse",
      [versionedWrite("profile", { name: "Ada" }, "a", 0), versionedWrite("count", 7, "b", 0)],
      { memory: MEMORY },
    );
    await run.harness.runUntilIdle();

    const view = (await run.harness.structuredMemoryOf(run.handle.executionId))!;
    assert.equal(view.revision, 1);
    assert.deepEqual(view.values["profile"]?.value, { name: "Ada" });
    assert.equal(view.values["count"], undefined, "the disjoint-key write did not commit");

    const progress = await progressOf(run);
    assert.deepEqual(progress.seenKinds, ["memory.written", "memory.write_conflict"]);
    assert.equal((progress.observations[1] as { key: string }).key, "count");
  });
});

describe("G.0 — structural validation of the precondition", () => {
  test("expectedRevisionIssues rejects every malformed shape and accepts a non-negative integer", () => {
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "0" as unknown, null as unknown, {} as unknown]) {
      assert.equal(expectedRevisionIssues(bad).length, 1, `${String(bad)} is malformed`);
    }
    assert.deepEqual(expectedRevisionIssues(undefined), [], "absent is fine");
    assert.deepEqual(expectedRevisionIssues(0), []);
    assert.deepEqual(expectedRevisionIssues(42), []);
  });

  test("effectProposalIssues refuses a malformed precondition on a WriteMemory proposal", () => {
    for (const bad of [-3, 2.5, Number.NaN, "7", null]) {
      const issues = effectProposalIssues(
        { kind: "write_memory", key: "count", value: 1, expectedRevision: bad },
        "effects[0]",
      );
      assert.ok(
        issues.some((issue) => issue.path === "effects[0].expectedRevision"),
        `malformed expectedRevision ${String(bad)} is a structural issue`,
      );
    }
    assert.deepEqual(
      effectProposalIssues({ kind: "write_memory", key: "count", value: 1, expectedRevision: 4 }, "effects[0]"),
      [],
      "a non-negative integer precondition is well-formed",
    );
  });

  test("a structurally malformed precondition fails the Activation before any authorizer or memory lookup", async () => {
    let authorizeCalls = 0;
    const authorizer: EffectAuthorizer = {
      authorize() {
        authorizeCalls += 1;
        return { decision: "allow", grantId: "g" };
      },
    };
    const malformed: ExecutionController = {
      kind: "agent",
      activate(): ActivationOutcome {
        return {
          control: { kind: "agent", progress: {} },
          effects: [{ kind: "write_memory", key: "count", value: 1, expectedRevision: -1 } as WriteMemoryProposal],
          next: { status: "await_event", wake: { eventKinds: [], correlationId: null } },
        };
      },
    };
    const bundle = createTestHarness({ controllers: [malformed], authorizer });
    const ref = await bundle.definitions.save(scriptedAgentDefinition({ id: "malformed-precondition", program: [{ do: "complete" }] }));
    const handle = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await bundle.harness.runUntilIdle();

    const context = await bundle.harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "FAILED");
    assert.equal(context?.failure?.code, "invalid_controller_outcome:invalid_effect");
    assert.equal(authorizeCalls, 0, "no authorizer decision for a malformed proposal");
    assert.equal((await bundle.harness.structuredMemoryOf(handle.executionId))?.revision, 0, "and no memory mutation");
    assert.deepEqual(await bundle.harness.effectJournalOf(handle.executionId), [], "nothing reached the Effect gateway");
  });
});

describe("G.0 — authorization ordering and no revision oracle", () => {
  class ViewGetCountingStore extends InMemoryRuntimeStore {
    viewGets = 0;
    override async transact<T>(scope: Parameters<InMemoryRuntimeStore["transact"]>[0], work: (tx: RuntimeTransaction) => Promise<T>): Promise<T> {
      return super.transact(scope, (tx) => {
        const realGet = tx.structuredMemory.get.bind(tx.structuredMemory);
        (tx.structuredMemory as { get: RuntimeTransaction["structuredMemory"]["get"] }).get = async (id: string) => {
          this.viewGets += 1;
          return realGet(id);
        };
        return work(tx);
      });
    }
  }

  test("a denied versioned write reads no Structured Memory view and reveals no actual revision", async () => {
    const store = new ViewGetCountingStore();
    const run = await scriptedWriter("denied-versioned", [versionedWrite("count", 1, "w", 0)], {
      authorizer: createAllowListAuthorizer({ grants: [] }),
      memory: MEMORY,
      store,
    });
    await run.harness.runUntilIdle();

    assert.equal(store.viewGets, 0, "authorization runs before any view lookup");
    assert.equal((await run.harness.structuredMemoryOf(run.handle.executionId))?.revision, 0);

    const progress = await progressOf(run);
    assert.deepEqual(progress.seenKinds, ["effect.denied"], "a conflict is not collapsed into a denial, and a denial is not a conflict");
    const denial = progress.observations[0] as Record<string, unknown>;
    assert.equal("actualRevision" in denial, false, "the denial body carries no revision oracle");
    assert.equal("expectedRevision" in denial, false);
    assert.deepEqual(
      (await run.harness.effectJournalOf(run.handle.executionId)).map((entry) => entry.phase),
      ["requested", "denied"],
    );
  });
});

describe("G.0 — the confirmation digest covers the precondition", () => {
  test("same key/value, different expected revisions -> different proposal digests", () => {
    const four = writeMemory({ key: "count", value: 3, expectedRevision: 4 });
    const five = writeMemory({ key: "count", value: 3, expectedRevision: 5 });
    const none = writeMemory({ key: "count", value: 3 });
    assert.notEqual(proposalDigest(four), proposalDigest(five));
    assert.notEqual(proposalDigest(four), proposalDigest(none));
    assert.equal(proposalDigest(four), proposalDigest(writeMemory({ key: "count", value: 3, expectedRevision: 4 })));
  });
});

const confirmWrites: ConfirmationPolicy = {
  requires(request) {
    return request.effectKind === "write_memory"
      ? { required: true, reason: "confirm the exact Structured Memory write" }
      : { required: false };
  },
};

describe("G.0 — confirmation / state race", () => {
  test("a confirmed write expecting revision N conflicts if the view advances before confirmed dispatch", async () => {
    const run = await scriptedWriter("confirm-race", [versionedWrite("count", 42, "w", 0)], {
      memory: MEMORY,
      confirmationPolicy: confirmWrites,
    });
    await run.harness.runUntilIdle();

    const [confirmation] = await run.harness.confirmationRequestsOf(run.handle.executionId);
    const [gated] = await run.harness.pendingOperationsOf(run.handle.executionId);
    assert.equal((confirmation!.proposal as WriteMemoryProposal).expectedRevision, 0, "the precondition is part of the exact stored payload");
    assert.equal(gated!.dispatch, "not_dispatched");

    // A legitimate commit advances the view to revision 1 while the human deliberates.
    await seedStructuredMemory(run.store, run.handle.executionId, [{ key: "count", value: 1 }]);
    assert.equal((await run.harness.structuredMemoryOf(run.handle.executionId))?.revision, 1);

    const receipt = await run.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "conflicted", "approval did not overwrite the newer state");

    const view = (await run.harness.structuredMemoryOf(run.handle.executionId))!;
    assert.equal(view.revision, 1, "no revision advance from the approved-but-stale write");
    assert.equal(view.values["count"]?.value, 1, "the newer legitimate commit stands");

    const [settled] = await run.harness.pendingOperationsOf(run.handle.executionId);
    assert.equal(settled!.pendingOperationId, gated!.pendingOperationId, "the same gated operation settled");
    assert.equal(settled!.status, "settled");
    assert.equal(settled!.outcome, "conflicted");
    assert.equal(settled!.dispatch, "not_dispatched", "nothing reached Structured Memory mutation");

    await run.harness.runUntilIdle();
    const progress = await progressOf(run);
    assert.deepEqual(progress.seenKinds, ["memory.write_conflict"]);
    const journal = await run.harness.effectJournalOf(run.handle.executionId);
    assert.equal(journal.filter((entry) => entry.phase === "conflicted").length, 1);
    assert.equal(journal.some((entry) => entry.phase === "completed"), false);
  });

  test("current authority is still re-evaluated on the confirmed-dispatch path", async () => {
    let decisions = 0;
    const authorizer: EffectAuthorizer = {
      authorize() {
        decisions += 1;
        return decisions === 1
          ? { decision: "allow", grantId: "initial" }
          : { decision: "deny", code: "memory_grant_revoked", message: "revoked" };
      },
    };
    const run = await scriptedWriter("confirm-authority-recheck", [versionedWrite("count", 8, "w", 0)], {
      authorizer,
      memory: MEMORY,
      confirmationPolicy: confirmWrites,
    });
    await run.harness.runUntilIdle();
    const [confirmation] = await run.harness.confirmationRequestsOf(run.handle.executionId);
    const receipt = await run.harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "denied", "a revocation during deliberation wins over an approved conflict-free write");
    assert.equal(decisions, 2);
    assert.equal((await run.harness.structuredMemoryOf(run.handle.executionId))?.revision, 0);
  });
});

describe("G.0 — physical persistence CAS backstop", () => {
  class RacingStore extends InMemoryRuntimeStore {
    armed = false;
    override async transact<T>(scope: Parameters<InMemoryRuntimeStore["transact"]>[0], work: (tx: RuntimeTransaction) => Promise<T>): Promise<T> {
      return super.transact(scope, (tx) => {
        if (this.armed) {
          (tx.structuredMemory as { update: RuntimeTransaction["structuredMemory"]["update"] }).update = async (view) => {
            this.armed = false;
            throw new StructuredMemoryConcurrencyError(view.memoryViewId, 0, 999);
          };
        }
        return work(tx);
      });
    }
  }

  test("a physical StructuredMemoryConcurrencyError fails closed with the same conflict semantics", async () => {
    const store = new RacingStore();
    const run = await scriptedWriter("physical-cas", [versionedWrite("count", 1, "w")], { memory: MEMORY, store });
    store.armed = true;
    await run.harness.runUntilIdle();

    const view = (await run.harness.structuredMemoryOf(run.handle.executionId))!;
    assert.equal(view.revision, 0, "the physical CAS refusal did not become last-write-wins");
    assert.equal(view.values["count"], undefined);

    const progress = await progressOf(run);
    assert.deepEqual(progress.seenKinds, ["memory.write_conflict"], "the same distinct conflict observation, not a retry or a rejection");
    const conflict = progress.observations[0] as { actualRevision: number; expectedRevision: number };
    assert.equal(conflict.actualRevision, 999, "surfaced the store's reported actual revision");
    const journal = await run.harness.effectJournalOf(run.handle.executionId);
    const entry = journal.find((record) => record.phase === "conflicted");
    assert.ok(entry);
    assert.match(String(entry!.detail["reason"] ?? ""), /physical persistence CAS/);
  });
});

describe("G.0 — Workflow Stage observation fidelity", () => {
  test("a stale required WriteMemory settles the barrier as conflicted, distinct from rejected", async () => {
    let observed: unknown;
    const functions = createFunctionStageRegistry({
      save: (context): FunctionStageOutcome => {
        if (context.observations.length === 0) {
          return {
            status: "awaitEffects",
            effects: [
              { kind: "write_memory", key: "seed", memoryKey: "count", value: 1 },
              { kind: "write_memory", key: "stale", memoryKey: "profile", value: { name: "Ada" }, expectedRevision: 0 },
            ],
          };
        }
        observed = context.observations;
        return { status: "completed", result: "done" };
      },
    });
    const bundle = createWorkflowTestHarness({
      functions,
      authorizer: createAllowListAuthorizer({ grants: [], memory: true }),
    });
    const ref = await bundle.definitions.save(
      defineWorkflow({
        id: "conflict-workflow",
        spec: {
          entryStage: "save",
          stages: [
            {
              id: "save",
              kind: "function",
              implementationRef: "save",
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const workflow = await bundle.harness.createExecution({ definition: ref, structuredMemory: MEMORY });
    await bundle.harness.runUntilIdle();

    const observations = observed as ReadonlyArray<{ key: string; outcome: string; error?: { code: string } }>;
    const byKey = Object.fromEntries(observations.map((o) => [o.key, o]));
    assert.equal(byKey["seed"]!.outcome, "completed");
    assert.equal(byKey["stale"]!.outcome, "conflicted", "not rejected, not failed, not denied");
    assert.equal(byKey["stale"]!.error?.code, "structured_memory_write_conflict");

    const view = (await bundle.harness.structuredMemoryOf(workflow.executionId))!;
    assert.equal(view.revision, 1, "only the seed write committed");
    assert.equal(view.values["profile"], undefined);
    assert.equal((await bundle.harness.inspect(workflow.executionId))?.lifecycle, "COMPLETED", "the Stage did not wait forever");
  });
});

describe("G.0 — model-facing surfaces unchanged", () => {
  test("the F.1.1 model write callable never asks the model for expectedRevision", async () => {
    const executor = scriptedAgentExecutor([{ kind: "respond", text: "done" }]);
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor,
      memoryWriteExposureGrants: { writableKeys: ["profile"] },
      authorizer: createAllowListAuthorizer({ grants: [], memory: { writableKeys: ["profile"] } }),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "g0-model-surface",
        completion: "complete_on_response",
        structuredMemory: { write: { keys: ["profile"] } },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "go" });
    await bundle.harness.runUntilIdle();

    const spec = executor.requests[0]!.capabilities.find((entry) => entry.name === "memory_write_profile");
    assert.ok(spec, "the write callable is exposed");
    assert.deepEqual(Object.keys(spec!.input.fields), ["value"], "the model supplies only { value } - no expectedRevision");
    assert.equal(spec!.input.additionalProperties, false);

    const binding = executor.requests[0]!.projection.bindings.find(
      (b) => b.target.kind === "structured_memory_write",
    );
    assert.deepEqual(Object.keys(binding!.input.fields), ["value"]);
  });

  test("a model-directed write proposes an unconditional WriteMemory (no expectedRevision)", async () => {
    const executor = scriptedAgentExecutor([
      { kind: "call_operations", calls: [{ callId: "m1", alias: "memory_write_profile", input: { value: { name: "Ada" } } as never }] },
      { kind: "respond", text: "saved" },
    ]);
    const bundle = createAgentTestHarness({
      models: agentModelAccess(testModelResolver()),
      executor,
      memoryWriteExposureGrants: { writableKeys: ["profile"] },
      authorizer: createAllowListAuthorizer({ grants: [], memory: { writableKeys: ["profile"] } }),
    });
    const ref = await bundle.definitions.save(
      testAgent({
        id: "g0-model-write-unconditional",
        completion: "complete_on_response",
        structuredMemory: { write: { keys: ["profile"] } },
      }),
    );
    const agent = await bundle.createAgent({ definition: ref, authority: [], memory: MEMORY });
    await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: "remember Ada" });
    await bundle.harness.runUntilIdle();

    const [requested] = effectRequestsIn(await bundle.harness.effectJournalOf(agent.executionId));
    const proposal = requested!.proposal as unknown as Record<string, unknown>;
    assert.equal("expectedRevision" in proposal, false);
    assert.deepEqual(Object.keys(proposal), ["kind", "key", "value", "requestKey"]);
  });
});
