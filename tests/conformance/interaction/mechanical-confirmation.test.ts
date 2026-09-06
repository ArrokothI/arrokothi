/**
 * Exact-payload mechanical confirmation.
 *
 * Confirmation is a *separate* gate from authorization (which stays `allow | deny`) and from
 * `RequestUserInput` (which asks for semantic data). It runs strictly after an `allow`, on the exact
 * concrete Effect payload, and strictly before dispatch. A trusted `approve` / `decline` resolves
 * it - never free prose.
 *
 *   confirmation not required -> ordinary Effect behaviour, unchanged
 *   confirmation required     -> exact payload + digest persisted; the executor is NOT called
 *   approve                   -> re-check CURRENT authority, then dispatch the STORED payload once
 *   decline                   -> nothing dispatched; one correlated `confirmation.declined` Event
 *   approval is not authority  -> an old approval cannot override a revocation
 *   duplicate approval         -> one dispatch; approve/decline race -> one linearized decision
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  createAllowListAuthorizer,
  createCapabilityConfirmationPolicy,
  createDeferredCapabilityExecutor,
  createScriptedCapabilityExecutor,
} from "@arrokothi/core/reference";
import type { ConfirmationPolicyRequest, EffectAuthorizer } from "@arrokothi/core/ports";
import { createTestHarness, readScriptedProgress, scriptedAgentDefinition } from "@arrokothi/core/testing";
import type { ScriptedControllerStep } from "@arrokothi/core/testing";

const AUTHORITY = { operations: [{ capability: "world.trade", operation: "execute" }] };
const TRADE: ScriptedControllerStep = {
  do: "use_capability",
  capability: "world.trade",
  operation: "execute",
  input: { asset: "BTC", qty: 1 },
  requestKey: "t1",
};

const idempotentTrade = (
  requestKey: string,
  input: { readonly asset: string; readonly qty: number } = { asset: "BTC", qty: 1 },
  awaitResult = true,
): ScriptedControllerStep => ({
  do: "use_capability",
  capability: "world.trade",
  operation: "execute",
  input,
  requestKey,
  idempotency: "per_input",
  ...(awaitResult ? {} : { await: false }),
});

const confirmedTradePolicy = () =>
  createAllowListAuthorizer({
    grants: [{ capability: "world.trade", operations: ["execute"], forceConsequential: true }],
  });

const tradeConfirmationPolicy = () =>
  createCapabilityConfirmationPolicy({ rules: [{ capability: "world.trade", operations: ["execute"] }] });

function rig(options: { confirm?: boolean; authorizer?: EffectAuthorizer } = {}) {
  const executor = createScriptedCapabilityExecutor({
    handlers: { "world.trade:execute": (request) => ({ status: "success", observation: { filled: request.input } }) },
  });
  const { harness, definitions } = createTestHarness({
    authorizer:
      options.authorizer ??
      createAllowListAuthorizer({ grants: [{ capability: "world.trade", operations: ["execute"], forceConsequential: true }] }),
    capabilities: executor,
    ...(options.confirm !== false
      ? { confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [{ capability: "world.trade", operations: ["execute"], reason: "a live trade" }] }) }
      : {}),
  });
  return { harness, definitions, executor };
}

async function gatedTrader(harness: ReturnType<typeof rig>["harness"], definitions: ReturnType<typeof rig>["definitions"], id = "trader") {
  const ref = await definitions.save(scriptedAgentDefinition({ id, program: [TRADE, { do: "complete" }] }));
  const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
  await harness.runUntilIdle();
  return handle;
}

describe("the confirmation gate", () => {
  test("separate rules for the same capability each gate their listed operation", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "world.trade:execute": () => ({ status: "success", observation: "filled" }) },
    });
    const { harness, definitions } = createTestHarness({
      capabilities: executor,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "world.trade", operations: ["execute"] }] }),
      confirmationPolicy: createCapabilityConfirmationPolicy({ rules: [
        { capability: "world.trade", operations: ["cancel"], reason: "confirm cancellation" },
        { capability: "world.trade", operations: ["execute"], reason: "confirm execution" },
      ] }),
    });
    const handle = await gatedTrader(harness, definitions);
    assert.equal(executor.callCount, 0, "an earlier rule for another operation must not bypass confirmation");
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal(confirmation?.reason, "confirm execution");
    assert.ok(confirmation);
    assert.equal((await harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "approve" })).status, "dispatched");
    assert.equal(executor.callCount, 1);
  });

  test("confirmation not required leaves ordinary Effect behaviour unchanged", async () => {
    const { harness, definitions, executor } = rig({ confirm: false });
    const handle = await gatedTrader(harness, definitions);
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal(executor.callCount, 1, "the operation ran with no gate");
    assert.deepEqual(await harness.confirmationRequestsOf(handle.executionId), []);
  });

  test("confirmation required persists the exact payload + digest and does NOT call the executor", async () => {
    const { harness, definitions, executor } = rig();
    const handle = await gatedTrader(harness, definitions);

    assert.equal(executor.callCount, 0, "nothing dispatched while confirmation is pending");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    assert.ok(confirmation);
    assert.equal(confirmation!.state, "pending");
    assert.equal(confirmation!.effectKind, "use_capability");
    assert.equal(confirmation!.reason, "a live trade");
    // The EXACT proposal, not merely the kind/operation/prompt.
    assert.equal((confirmation!.proposal as { capability: string }).capability, "world.trade");
    assert.deepEqual((confirmation!.proposal as { input: unknown }).input, { asset: "BTC", qty: 1 });
    assert.match(confirmation!.proposalDigest, /^[0-9a-f]{16}$/, "a canonical digest");

    const pending = (await harness.pendingOperationsOf(handle.executionId)).find((p) => p.effectKind === "use_capability")!;
    assert.equal(pending.status, "pending");
    assert.equal(pending.dispatch, "not_dispatched", "the payload is authorized but not dispatched");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.ok(journal.some((e) => e.phase === "confirmation_pending"), "the gate is journaled");
    assert.equal(journal.filter((e) => e.phase === "requested").length, 1, "one request, never regenerated");

    assert.equal((await harness.pendingConfirmations()).length, 1, "an application/UI can discover it");
  });

  test("approve re-checks current authority and dispatches the STORED exact payload exactly once, with no model turn", async () => {
    const { harness, definitions, executor } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);

    const activationsBefore = (await harness.transitionsOf(handle.executionId)).filter((t) => t.to === "RUNNING").length;
    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "dispatched");
    const activationsAfter = (await harness.transitionsOf(handle.executionId)).filter((t) => t.to === "RUNNING").length;
    assert.equal(activationsAfter, activationsBefore, "no Activation ran between approval and dispatch");
    assert.equal(executor.callCount, 1, "one dispatch");
    assert.deepEqual(executor.calls[0]!.request.input, { asset: "BTC", qty: 1 }, "the exact stored payload");

    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.confirmationRequest(confirmation!.confirmationId))?.state, "approved");

    // The dispatch came from resolveConfirmation, not from the controller re-proposing: no extra
    // Activation ran between approval and dispatch, and there is still exactly one `requested` entry.
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((e) => e.phase === "requested").length, 1, "the model did not regenerate the Effect");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.completed"], "the controller resumed on the ordinary outcome");
  });

  test("decline dispatches nothing and settles the dependency as confirmation.declined", async () => {
    const { harness, definitions, executor } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);

    const receipt = await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "decline" });
    assert.equal(receipt.status, "declined");
    assert.equal(executor.callCount, 0, "nothing dispatched");

    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
    assert.equal((await harness.confirmationRequest(confirmation!.confirmationId))?.state, "declined");

    const pending = (await harness.pendingOperationsOf(handle.executionId)).find((p) => p.effectKind === "use_capability")!;
    assert.equal(pending.outcome, "declined", "a decline is its own outcome, not a failure or a denial");

    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["confirmation.declined"], "exactly one correlated decline observation");
    assert.equal((progress.observations[0] as { proposalDigest: string }).proposalDigest, confirmation!.proposalDigest);
  });
});

describe("duplicate and race safety", () => {
  test("a duplicate approval cannot dispatch twice", async () => {
    const { harness, definitions, executor } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [c] = await harness.confirmationRequestsOf(handle.executionId);

    assert.equal((await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "approve" })).status, "dispatched");
    const second = await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "approve" });
    assert.equal(second.status, "already_resolved");
    assert.equal(executor.callCount, 1, "exactly one dispatch");
  });

  test("a duplicate decline is a no-op", async () => {
    const { harness, definitions } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [c] = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal((await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "decline" })).status, "declined");
    const second = await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "decline" });
    assert.equal(second.status, "already_resolved");
  });

  test("an approve/decline race linearizes to one decision", async () => {
    const { harness, definitions, executor } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [c] = await harness.confirmationRequestsOf(handle.executionId);

    const [a, b] = await Promise.all([
      harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "approve" }),
      harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "decline" }),
    ]);
    const resolved = [a, b].filter((r) => r.status !== "already_resolved");
    assert.equal(resolved.length, 1, "exactly one decision won");
    assert.ok(executor.callCount <= 1, "and if it was approve, exactly one dispatch");
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("a second already-gated per_input proposal replays a prior confirmed success and settles its own correlation", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "world.trade:execute": () => ({ status: "success", observation: { fillId: "fill-1" } }) },
    });
    const { harness, definitions } = createTestHarness({
      authorizer: confirmedTradePolicy(),
      capabilities: executor,
      confirmationPolicy: tradeConfirmationPolicy(),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "two-gated-repeats",
        program: [
          idempotentTrade("first", undefined, false),
          idempotentTrade("second", undefined, false),
          { do: "await", eventKinds: ["capability.completed"], correlationId: "first" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const confirmations = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal(confirmations.length, 2, "both exact proposals were gated before either settled");
    const first = confirmations.find((request) => request.correlationId === "first")!;
    const second = confirmations.find((request) => request.correlationId === "second")!;

    assert.equal((await harness.resolveConfirmation({ confirmationId: first.confirmationId, decision: "approve" })).status, "dispatched");
    const replayReceipt = await harness.resolveConfirmation({ confirmationId: second.confirmationId, decision: "approve" });
    assert.equal(replayReceipt.status, "replayed", "the receipt does not claim a second dispatch occurred");
    assert.equal(executor.callCount, 1, "the prior successful action was not dispatched again");

    const operations = await harness.pendingOperationsOf(handle.executionId);
    const firstOperation = operations.find((operation) => operation.correlationId === "first")!;
    const replayOperation = operations.find((operation) => operation.correlationId === "second")!;
    assert.equal(firstOperation.dispatch, "dispatched");
    assert.equal(firstOperation.outcome, "success");
    assert.equal(replayOperation.dispatch, "not_dispatched", "the confirmation's own row records that no second call occurred");
    assert.equal(replayOperation.outcome, "success");
    assert.ok(replayOperation.resultEventId, "the replay settled the gated dependency with its own result Event");

    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    const replayed = progress.observations.find((observation) => (observation as { replayed?: boolean }).replayed === true) as {
      pendingOperationId: string;
    };
    assert.equal(replayed.pendingOperationId, replayOperation.pendingOperationId, "the replay Event correlates to the gated row it settled");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((entry) => entry.phase === "dispatch_started").length, 1);
    const replayEntry = journal.find((entry) => entry.effectId === second.effectId && entry.phase === "replayed")!;
    assert.equal(replayEntry.pendingOperationId, replayOperation.pendingOperationId);
    assert.equal(replayEntry.detail["replayedFromEffectId"], first.effectId);
  });

  test("two equivalent per_input confirmations approved concurrently dispatch at most once", async () => {
    const executor = createDeferredCapabilityExecutor();
    const { harness, definitions } = createTestHarness({
      authorizer: confirmedTradePolicy(),
      capabilities: executor,
      confirmationPolicy: tradeConfirmationPolicy(),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "concurrent-approvals",
        program: [
          idempotentTrade("first", undefined, false),
          idempotentTrade("second", undefined, false),
          { do: "await", eventKinds: ["capability.completed", "effect.rejected"], correlationId: "first" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const confirmations = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal(confirmations.length, 2);

    const receipts = await Promise.all(
      confirmations.map((request) =>
        harness.resolveConfirmation({ confirmationId: request.confirmationId, decision: "approve" }),
      ),
    );
    assert.equal(executor.callCount, 1, "the dispatch-intent transaction admitted only one external call");
    assert.equal(receipts.filter((receipt) => receipt.status === "dispatched").length, 1);
    const blocked = receipts.find((receipt) => receipt.status === "rejected");
    assert.equal(blocked?.status, "rejected");
    assert.equal(blocked?.status === "rejected" && blocked.code, "prior_dispatch_unresolved");

    const journal = await harness.effectJournalOf(handle.executionId);
    assert.equal(journal.filter((entry) => entry.phase === "dispatch_started").length, 1);
    assert.equal(journal.filter((entry) => entry.phase === "rejected").length, 1);
    const rejectedOperation = (await harness.pendingOperationsOf(handle.executionId)).find(
      (operation) => operation.outcome === "rejected",
    )!;
    assert.equal(rejectedOperation.dispatch, "not_dispatched");
    assert.ok(rejectedOperation.resultEventId, "the blocked confirmation still settled its own pending dependency");

    executor.completeAll({ fillId: "fill-1" });
    await harness.drainEffects();
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });

  test("an already-gated per_input confirmation is blocked after the first outcome becomes unknown", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: {
        "world.trade:execute": () => ({
          status: "unknown",
          error: { code: "response_lost", message: "the venue did not return a terminal result" },
        }),
      },
    });
    const { harness, definitions } = createTestHarness({
      authorizer: confirmedTradePolicy(),
      capabilities: executor,
      confirmationPolicy: tradeConfirmationPolicy(),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "gated-unknown-then-approval",
        program: [
          idempotentTrade("first", undefined, false),
          idempotentTrade("second", undefined, false),
          { do: "await", eventKinds: ["capability.unknown", "effect.rejected"], correlationId: "first" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const confirmations = await harness.confirmationRequestsOf(handle.executionId);
    const first = confirmations.find((request) => request.correlationId === "first")!;
    const second = confirmations.find((request) => request.correlationId === "second")!;

    await harness.resolveConfirmation({ confirmationId: first.confirmationId, decision: "approve" });
    const blocked = await harness.resolveConfirmation({ confirmationId: second.confirmationId, decision: "approve" });

    assert.equal(blocked.status, "rejected");
    assert.equal(blocked.status === "rejected" && blocked.code, "prior_outcome_unknown");
    assert.equal(executor.callCount, 1);
    const secondOperation = (await harness.pendingOperationsOf(handle.executionId)).find(
      (operation) => operation.correlationId === "second",
    )!;
    assert.equal(secondOperation.dispatch, "not_dispatched");
    assert.equal(secondOperation.outcome, "rejected");
  });
});

describe("confirmation is not authority", () => {
  test("authority revoked while the confirmation was pending: approve dispatches nothing", async () => {
    let revoked = false;
    const base = createAllowListAuthorizer({ grants: [{ capability: "world.trade", operations: ["execute"], forceConsequential: true }] });
    const { harness, definitions, executor } = rig({
      authorizer: { authorize: (request) => (revoked ? { decision: "deny", code: "trade_desk_closed", message: "revoked" } : base.authorize(request)) },
    });
    const handle = await gatedTrader(harness, definitions);
    const [c] = await harness.confirmationRequestsOf(handle.executionId);

    revoked = true; // the standing grant is withdrawn while the human deliberates
    const receipt = await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "denied");
    assert.equal(receipt.status === "denied" && receipt.code, "trade_desk_closed");
    assert.equal(executor.callCount, 0, "an old approval never overrides a revocation");

    await harness.runUntilIdle();
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["effect.denied"], "an ordinary authorization denial");
  });

  test("authority intact at approval time: the stored payload dispatches through the ordinary path", async () => {
    const { harness, definitions, executor } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [c] = await harness.confirmationRequestsOf(handle.executionId);
    const receipt = await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "approve" });
    assert.equal(receipt.status, "dispatched");
    assert.equal(executor.callCount, 1);
  });

  test("a terminal Execution before approval: approve dispatches nothing and the request is abandoned", async () => {
    const { harness, definitions, executor } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [c] = await harness.confirmationRequestsOf(handle.executionId);

    await harness.cancelExecution({ executionId: handle.executionId });
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "CANCELLED");
    assert.equal((await harness.confirmationRequest(c!.confirmationId))?.state, "abandoned", "abandoned in terminal cleanup");

    const receipt = await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "approve" });
    assert.notEqual(receipt.status, "dispatched");
    assert.equal(executor.callCount, 0);
    const [pending] = await harness.pendingOperationsOf(handle.executionId);
    assert.equal(pending?.status, "abandoned");
    assert.equal(pending?.outcome, null, "cancellation/abandonment is not relabelled as a successful duplicate");
    assert.ok(!(await harness.effectJournalOf(handle.executionId)).some((entry) => entry.phase === "replayed"));
  });

  test("the confirmationId is not a bearer credential - a decision still goes through the trusted path only", async () => {
    const { harness, definitions } = rig();
    const handle = await gatedTrader(harness, definitions);
    const [c] = await harness.confirmationRequestsOf(handle.executionId);
    // A controller has no access to resolveConfirmation - it is a Harness method - and an unknown id
    // resolves nothing.
    assert.equal((await harness.resolveConfirmation({ confirmationId: "cnf_forged", decision: "approve" })).status, "unknown_confirmation");
    assert.equal((await harness.confirmationRequest(c!.confirmationId))?.state, "pending", "the real one is untouched");
  });
});

describe("confirmed capability prior-operation contract", () => {
  test("a later identical per_input proposal replays before creating another confirmation", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "world.trade:execute": () => ({ status: "success", observation: { fillId: "fill-1" } }) },
    });
    const { harness, definitions } = createTestHarness({
      authorizer: confirmedTradePolicy(),
      capabilities: executor,
      confirmationPolicy: tradeConfirmationPolicy(),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "late-repeat",
        program: [idempotentTrade("first"), idempotentTrade("second"), { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1);
    assert.equal((await harness.confirmationRequestsOf(handle.executionId)).length, 1, "the known duplicate did not prompt again");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.equal((progress.observations[1] as { replayed: boolean }).replayed, true);
  });

  test("a prior unknown outcome blocks a later confirmed per_input proposal", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: {
        "world.trade:execute": () => ({
          status: "unknown",
          error: { code: "response_lost", message: "the venue did not return a terminal result" },
        }),
      },
    });
    const { harness, definitions } = createTestHarness({
      authorizer: confirmedTradePolicy(),
      capabilities: executor,
      confirmationPolicy: tradeConfirmationPolicy(),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "unknown-then-repeat",
        program: [idempotentTrade("first"), idempotentTrade("second"), { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const [confirmation] = await harness.confirmationRequestsOf(handle.executionId);
    await harness.resolveConfirmation({ confirmationId: confirmation!.confirmationId, decision: "approve" });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 1);
    assert.equal((await harness.confirmationRequestsOf(handle.executionId)).length, 1, "the blocked retry did not request redundant approval");
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.unknown", "effect.rejected"]);
    assert.equal((progress.observations[1] as { code: string }).code, "prior_outcome_unknown");
  });

  test("a definite retryable failure still permits a fresh confirmed per_input dispatch", async () => {
    let attempt = 0;
    const executor = createScriptedCapabilityExecutor({
      handlers: {
        "world.trade:execute": () => {
          attempt += 1;
          return attempt === 1
            ? { status: "failure", error: { code: "venue_busy", message: "try again" }, retryable: true } as const
            : { status: "success", observation: { fillId: "fill-2" } } as const;
        },
      },
    });
    const { harness, definitions } = createTestHarness({
      authorizer: confirmedTradePolicy(),
      capabilities: executor,
      confirmationPolicy: tradeConfirmationPolicy(),
    });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "failure-then-retry",
        program: [idempotentTrade("first"), idempotentTrade("second"), { do: "complete" }],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const [first] = await harness.confirmationRequestsOf(handle.executionId);
    await harness.resolveConfirmation({ confirmationId: first!.confirmationId, decision: "approve" });
    await harness.runUntilIdle();
    const pending = (await harness.confirmationRequestsOf(handle.executionId)).find((request) => request.state === "pending")!;
    assert.ok(pending, "definite failure did not become permanent duplicate suppression");
    await harness.resolveConfirmation({ confirmationId: pending.confirmationId, decision: "approve" });
    await harness.runUntilIdle();

    assert.equal(executor.callCount, 2);
    const progress = readScriptedProgress((await harness.inspect(handle.executionId))!.control.progress);
    assert.deepEqual(progress.seenKinds, ["capability.failed", "capability.completed"]);
  });

  test("decline and current-authority denial do not suppress a later identical per_input proposal", async () => {
    for (const firstOutcome of ["decline", "deny"] as const) {
      let denyApproval = false;
      const base = confirmedTradePolicy();
      const executor = createScriptedCapabilityExecutor({
        handlers: { "world.trade:execute": () => ({ status: "success", observation: { fillId: firstOutcome } }) },
      });
      const { harness, definitions } = createTestHarness({
        authorizer: {
          authorize: (request) =>
            denyApproval
              ? { decision: "deny", code: "temporarily_denied", message: "not now" }
              : base.authorize(request),
        },
        capabilities: executor,
        confirmationPolicy: tradeConfirmationPolicy(),
      });
      const ref = await definitions.save(
        scriptedAgentDefinition({
          id: `non-success-${firstOutcome}`,
          program: [idempotentTrade("first"), idempotentTrade("second"), { do: "complete" }],
        }),
      );
      const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
      await harness.runUntilIdle();
      const [first] = await harness.confirmationRequestsOf(handle.executionId);
      if (firstOutcome === "deny") denyApproval = true;
      await harness.resolveConfirmation({ confirmationId: first!.confirmationId, decision: firstOutcome === "decline" ? "decline" : "approve" });
      denyApproval = false;
      await harness.runUntilIdle();

      const second = (await harness.confirmationRequestsOf(handle.executionId)).find((request) => request.state === "pending")!;
      assert.ok(second, `${firstOutcome} did not become a successful duplicate`);
      await harness.resolveConfirmation({ confirmationId: second.confirmationId, decision: "approve" });
      await harness.runUntilIdle();
      assert.equal(executor.callCount, 1, `${firstOutcome} left the later real dispatch available`);
    }
  });

  test("idempotency none still treats identical confirmed proposals as independent operations", async () => {
    const executor = createScriptedCapabilityExecutor({
      handlers: { "world.trade:execute": () => ({ status: "success", observation: { filled: true } }) },
    });
    const { harness, definitions } = createTestHarness({
      authorizer: confirmedTradePolicy(),
      capabilities: executor,
      confirmationPolicy: tradeConfirmationPolicy(),
    });
    const independent = (key: string): ScriptedControllerStep => ({ ...TRADE, requestKey: key, await: false });
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "independent-identical-actions",
        program: [
          independent("first"),
          independent("second"),
          { do: "await", eventKinds: ["capability.completed"], correlationId: "first" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    const confirmations = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal(confirmations.length, 2);
    for (const confirmation of confirmations) {
      await harness.resolveConfirmation({ confirmationId: confirmation.confirmationId, decision: "approve" });
    }
    assert.equal(executor.callCount, 2, "the repair did not widen suppression beyond per_input");
  });
});

describe("exact-payload binding", () => {
  test("a changed payload cannot inherit an approval - and there is no caller-controlled payload at approval time", async () => {
    const { harness, definitions, executor } = rig();
    const ref = await definitions.save(
      scriptedAgentDefinition({
        id: "two-trades",
        program: [
          { ...idempotentTrade("a", { asset: "BTC", qty: 1 }, false) },
          { ...idempotentTrade("b", { asset: "ETH", qty: 5 }, false) },
          { do: "await", eventKinds: ["capability.completed", "confirmation.declined"], correlationId: "a" },
          { do: "complete" },
        ],
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const confirmations = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal(confirmations.length, 2, "each concrete payload is its own confirmation");
    assert.notEqual(confirmations[0]!.proposalDigest, confirmations[1]!.proposalDigest, "different payloads -> different digests");

    // Approving one dispatches ONLY that exact payload. `resolveConfirmation` has no payload
    // parameter, so there is no way to redirect an approval onto payload B.
    const btc = confirmations.find((cf) => (cf.proposal as unknown as { input: { asset: string } }).input.asset === "BTC")!;
    await harness.resolveConfirmation({ confirmationId: btc.confirmationId, decision: "approve" });
    assert.equal(executor.callCount, 1);
    assert.deepEqual(executor.calls[0]!.request.input, { asset: "BTC", qty: 1 });
    // Payload B still requires its own decision.
    const eth = confirmations.find((cf) => (cf.proposal as unknown as { input: { asset: string } }).input.asset === "ETH")!;
    assert.equal((await harness.confirmationRequest(eth.confirmationId))?.state, "pending");
    await harness.resolveConfirmation({ confirmationId: eth.confirmationId, decision: "approve" });
    assert.equal(executor.callCount, 2, "different per_input payloads remain independently dispatchable");
  });
});

describe("the mechanism is generic over operational Effect kinds", () => {
  test("a SpawnExecution can be gated and dispatched from an approval", async () => {
    const executor = createScriptedCapabilityExecutor({ handlers: {} });
    const { harness, definitions } = createTestHarness({
      authorizer: createAllowListAuthorizer({ grants: [], spawn: true }),
      capabilities: executor,
      confirmationPolicy: {
        requires: (r: ConfirmationPolicyRequest) =>
          r.effectKind === "spawn_execution" ? { required: true, reason: "delegation" } : { required: false },
      },
    });
    await definitions.save(scriptedAgentDefinition({ id: "worker", program: [{ do: "complete" }] }));
    const ref = await definitions.save(
      scriptedAgentDefinition({ id: "delegator", program: [{ do: "spawn", definitionId: "worker", definitionVersion: 1, requestKey: "w" }, { do: "complete" }] }),
    );
    const handle = await harness.createExecution({ definition: ref, structuralSpawnBudget: 3 });
    await harness.runUntilIdle();

    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING", "gated on confirmation");
    assert.equal((await harness.childExecutionLinksOf(handle.executionId)).length, 0, "no child yet");
    const [c] = await harness.confirmationRequestsOf(handle.executionId);
    assert.equal(c!.effectKind, "spawn_execution");

    await harness.resolveConfirmation({ confirmationId: c!.confirmationId, decision: "approve" });
    await harness.runUntilIdle();
    assert.equal((await harness.childExecutionLinksOf(handle.executionId)).length, 1, "the child was created from the approval");
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "COMPLETED");
  });
});
