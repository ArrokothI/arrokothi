/**
 * Resume-aware settlement of a confirmed Effect that is refused before it dispatches.
 *
 * The runtime creates one `PendingOperation` when an Effect is gated for confirmation and closes the gap
 * after approval: an approved stored Effect may still receive an ordinary runtime answer before
 * anything is dispatched - a missing/kind-mismatched child Definition, an exhausted structural spawn
 * budget, an invalid message destination, or an authority that was revoked while the human was
 * deciding. Every one of those must settle the SAME gated `PendingOperation`, never leave it pending,
 * never mint a second one, and route exactly one correlated Event.
 *
 *   confirmed spawn/send -> runtime rejection -> same PendingOperation settled `rejected`, one effect.rejected
 *   confirmed spawn/send -> authorization deny -> same PendingOperation settled `denied`,   one effect.denied
 *   runtime rejection is distinct from denial, decline, failure, and cancellation
 *   one approved spawn/send never performs two independent authorization decisions
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createAllowListAuthorizer, InMemoryRuntimeStore } from "@arrokothi/core/reference";
import type { ConfirmationPolicy, EffectAuthorizer } from "@arrokothi/core/ports";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";
import type { ScriptedControllerStep } from "@arrokothi/core/testing";

const gateSpawn: ConfirmationPolicy = {
  requires: (r) => (r.effectKind === "spawn_execution" ? { required: true, reason: "delegation" } : { required: false }),
};
const gateSend: ConfirmationPolicy = {
  requires: (r) => (r.effectKind === "send_message" ? { required: true, reason: "outbound" } : { required: false }),
};

describe("a resumed spawn refusal settles the gated PendingOperation", () => {
  async function gatedSpawn(step: ScriptedControllerStep, options: { budget?: number } = {}) {
    const { harness, definitions, store } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
      confirmationPolicy: gateSpawn,
    });
    await definitions.save(scriptedAgentDefinition({ id: "real-agent", program: [{ do: "complete" }] }));
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "delegator", program: [step, { do: "observe" }, { do: "complete" }] }),
    );
    const handle = await harness.createExecution({
      definition: ref,
      ...(options.budget !== undefined ? { structuralSpawnBudget: options.budget } : {}),
    });
    await harness.runUntilIdle();
    return { harness, store, handle };
  }

  async function proveRejected(
    label: string,
    step: ScriptedControllerStep,
    expectedCode: RegExp,
    options: { budget?: number } = {},
  ) {
    const { harness, store, handle } = await gatedSpawn(step, options);

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", `${label}: gated`);
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    assert.ok(confirmation, `${label}: the Effect was gated`);
    const gatedPendingId = confirmation!.pendingOperationId;
    assert.equal((await harness.pendingOperationsOf(handle.executionId)).length, 1, `${label}: one gated PendingOperation`);

    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "rejected", `${label}: an approved-then-rejected confirmed Effect`);
    assert.equal(receipt.status === "rejected" && receipt.pendingOperationId, gatedPendingId, `${label}: the SAME PendingOperation`);
    assert.match(receipt.status === "rejected" ? receipt.code : "", expectedCode);

    // Inspect the RuntimeStore record directly: same id, now settled `rejected`, still not_dispatched.
    const record = await store.readPendingOperation(gatedPendingId);
    assert.ok(record, `${label}: the gated PendingOperation still exists`);
    assert.equal(record!.status, "settled", `${label}: no longer pending`);
    assert.equal(record!.outcome, "rejected", `${label}: rejected, not failure/denied/declined/cancelled`);
    assert.equal(record!.dispatch, "not_dispatched", `${label}: nothing reached the external world`);

    assert.equal((await harness.pendingOperationsOf(handle.executionId)).length, 1, `${label}: no second PendingOperation`);
    assert.equal((await harness.childExecutionLinksOf(handle.executionId)).length, 0, `${label}: no child`);
    assert.equal(
      (await harness.confirmationRequest(confirmation!.confirmationId))?.state,
      "approved",
      `${label}: the human's decision stands`,
    );

    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(
      progress.seenKinds.filter((k) => k === "effect.rejected"),
      ["effect.rejected"],
      `${label}: exactly one correlated effect.rejected`,
    );

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((e) => e.phase === "requested").length, 1, `${label}: the Effect was never regenerated`);
  }

  test("missing child Definition", async () => {
    await proveRejected(
      "missing",
      { do: "propose_effect", effect: { kind: "spawn_execution", definitionId: "ghost", definitionVersion: 1, requestKey: "s" } as never },
      /spawn_definition_not_found/,
      { budget: 3 },
    );
  });

  test("child Definition kind mismatch", async () => {
    await proveRejected(
      "mismatch",
      {
        do: "propose_effect",
        effect: {
          kind: "spawn_execution",
          definitionId: "real-agent",
          definitionVersion: 1,
          expectedChildKind: "workflow",
          requestKey: "s",
        } as never,
      },
      /spawn_definition_kind_mismatch/,
      { budget: 3 },
    );
  });

  test("structural spawn budget refusal", async () => {
    await proveRejected(
      "budget",
      { do: "propose_effect", effect: { kind: "spawn_execution", definitionId: "real-agent", definitionVersion: 1, requestKey: "s" } as never },
      /no_structural_spawn_budget|structural_spawn_budget_exhausted/,
      // no structuralSpawnBudget supplied -> the lineage has none
    );
  });
});

describe("a resumed SendMessage refusal settles the gated PendingOperation", () => {
  test("an invalid destination rejects the same PendingOperation, delivers no message, mints no second op", async () => {
    const { harness, definitions, store } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], message: true }),
      confirmationPolicy: gateSend,
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "sender",
        program: [
          { do: "propose_effect", effect: { kind: "send_message", to: "exec_nonexistent", body: { hi: 1 }, requestKey: "m" } as never },
          { do: "observe" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    const gatedPendingId = confirmation!.pendingOperationId;

    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "rejected");
    assert.equal(receipt.status === "rejected" && receipt.pendingOperationId, gatedPendingId);
    assert.match(receipt.status === "rejected" ? receipt.code : "", /message_destination_not_found/);

    const record = await store.readPendingOperation(gatedPendingId);
    assert.equal(record!.status, "settled");
    assert.equal(record!.outcome, "rejected");
    assert.equal(record!.dispatch, "not_dispatched", "no message was delivered");
    assert.equal((await harness.pendingOperationsOf(handle.executionId)).length, 1, "no second PendingOperation");

    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds.filter((k) => k === "effect.rejected"), ["effect.rejected"], "one effect.rejected");
  });

  test("authorization recheck deny settles the same PendingOperation `denied`, with no second policy evaluation", async () => {
    let deny = false;
    let authorizeCalls = 0;
    const base = createAllowListAuthorizer({ grants: [], message: true });
    const authorizer: EffectAuthorizer = {
      authorize: (request) => {
        if (request.effectKind === "send_message") {
          authorizeCalls += 1;
          if (deny) return { decision: "deny", code: "outbound_frozen", message: "sends are frozen" };
        }
        return base.authorize(request);
      },
    };
    const { harness, definitions, store } = createTestHarness({ authorizer, confirmationPolicy: gateSend });

    const peerRef = await definitions.save(
      scriptedAgentDefinition({
        id: "peer",
        program: [{ do: "await", eventKinds: ["external.input"], correlationId: "never" }, { do: "complete" }],
      }),
    );
    const peer = await harness.createExecution({ definition: peerRef });
    await harness.runUntilIdle();

    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "sender2",
        program: [
          { do: "propose_effect", effect: { kind: "send_message", to: peer.executionId, body: {}, requestKey: "m" } as never },
          { do: "observe" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref });
    await harness.runUntilIdle();

    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    const gatedPendingId = confirmation!.pendingOperationId;
    const callsAfterGate = authorizeCalls; // one policy evaluation at proposal time

    deny = true; // the standing grant is withdrawn while the human deliberates
    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });

    assert.equal(receipt.status, "denied");
    assert.equal(receipt.status === "denied" && receipt.pendingOperationId, gatedPendingId, "the SAME gated PendingOperation");
    assert.equal(receipt.status === "denied" && receipt.code, "outbound_frozen");
    assert.equal(authorizeCalls - callsAfterGate, 1, "exactly ONE authorization decision during the approved dispatch - not two");

    const record = await store.readPendingOperation(gatedPendingId);
    assert.equal(record!.status, "settled");
    assert.equal(record!.outcome, "denied", "an authorization denial, distinct from `rejected`");
    assert.equal(record!.dispatch, "not_dispatched");

    await harness.runUntilIdle();
    const peerProgress = readScriptedProgress((await harness.inspect(peer.executionId))!.control.progress);
    assert.deepEqual(peerProgress.peerMessages, [], "no message delivered");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds.filter((k) => k === "effect.denied"), ["effect.denied"], "one effect.denied");
  });
});

/**
 * Deterministic authority-race regression.
 *
 * A store-owned hard operation-authority revocation that commits *before* a confirmed capability
 * dispatch intent must win: the executor is never called, `dispatch_started` never commits, the
 * gated PendingOperation settles `denied`, and one `effect.denied` routes. The barrier is the store
 * itself - no sleeps, no timing luck: the revocation is made observable the instant the outer
 * approval authority recheck has read "allowed".
 */
describe("a revocation committed before confirmed dispatch intent wins", () => {
  function raceStore(): { store: InMemoryRuntimeStore; arm: () => void } {
    const inner = new InMemoryRuntimeStore();
    let armed = false;
    let revoked = false;
    const revoke = (a: { operations: unknown[]; version?: number } | undefined) =>
      a ? { ...a, operations: [], version: (a.version ?? 1) + 1 } : a;
    const wrapTx = (tx: Record<string, unknown>): Record<string, unknown> => ({
      ...tx,
      operationAuthorities: {
        insert: (x: unknown) => (tx.operationAuthorities as { insert: (x: unknown) => unknown }).insert(x),
        get: async (id: unknown) => {
          const real = await (tx.operationAuthorities as { get: (id: unknown) => Promise<unknown> }).get(id);
          return revoked ? revoke(real as never) : real;
        },
      },
    });
    const proxy = new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === "transact") {
          return (scope: unknown, work: (tx: unknown) => unknown) =>
            (target as unknown as { transact: (s: unknown, w: (tx: unknown) => unknown) => unknown }).transact(scope, (tx: unknown) =>
              work(wrapTx(tx as Record<string, unknown>)),
            );
        }
        if (prop === "readOperationAuthority") {
          return async (id: unknown) => {
            const real = await (
              target as unknown as { readOperationAuthority: (id: unknown) => Promise<unknown> }
            ).readOperationAuthority(id);
            if (armed && !revoked) {
              revoked = true; // the revocation "commits" the moment the outer check has read allowed
              return real;
            }
            return revoked ? revoke(real as never) : real;
          };
        }
        const v = Reflect.get(target, prop, receiver);
        return typeof v === "function" ? v.bind(target) : v;
      },
    }) as unknown as InMemoryRuntimeStore;
    return { store: proxy, arm: () => { armed = true; } };
  }

  test("executor is never called; PendingOperation settles denied; one effect.denied", async () => {
    const { store, arm } = raceStore();
    let executorCalls = 0;
    const { harness, definitions } = createTestHarness({
      store,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "world.trade", operations: ["execute"], forceConsequential: true }] }),
      confirmationPolicy: {
        requires: (r) => (r.effectKind === "use_capability" ? { required: true, reason: "a live trade" } : { required: false }),
      },
      capabilities: {
        execute: async () => {
          executorCalls += 1;
          return { status: "success", observation: {} };
        },
      },
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "trader",
        program: [
          { do: "use_capability", capability: "world.trade", operation: "execute", input: { qty: 1 }, requestKey: "t" },
          { do: "observe" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({
      definition: ref,
      operationAuthority: { operations: [{ capability: "world.trade", operation: "execute" }] },
    });
    await harness.runUntilIdle();

    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    const gatedPendingId = confirmation!.pendingOperationId;

    arm(); // the next authority read (the outer approval recheck) sees allowed, then revocation commits
    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });

    assert.equal(receipt.status, "denied", "the dispatch-intent transaction observed the revocation");
    assert.equal(receipt.status === "denied" && receipt.pendingOperationId, gatedPendingId);
    assert.equal(executorCalls, 0, "the executor was never called");

    const record = await store.readPendingOperation(gatedPendingId);
    assert.equal(record!.status, "settled");
    assert.equal(record!.outcome, "denied");
    assert.equal(record!.dispatch, "not_dispatched", "dispatch_started never committed for the external action");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((e) => e.phase === "dispatch_started").length, 0, "no dispatch_started");
    assert.equal(journal.filter((e) => e.phase === "denied").length, 1, "one denial recorded");

    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds.filter((k) => k === "effect.denied"), ["effect.denied"], "exactly one effect.denied");
  });
});
