/**
 * K12-R6-EVID-01: a reply to the first send remains authorized after ordinary redelivery.
 * Capture grants at Driver entry before any resend; never look up the latest grant as the oracle.
 * The same schedules distinguish fresh per-delivery reporting capabilities from attempt authority.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ExecutionCoordinator,
  type Activation,
  type DeliverySettlement,
  type ExecutionDriver,
  type ExecutionView,
  type SubmissionGrant,
} from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, refused } from "./harness.ts";

const owner = caller("owner", "tenant-a");
const runtime = observer("runtime", "tenant-a");

function setup(key: string) {
  const deliveries: { activation: Activation; settlement: DeliverySettlement; grant: SubmissionGrant }[] = [];
  const driver: ExecutionDriver = {
    driverId: "lifetime-probe",
    deliver(activation, settlement, grant): undefined {
      deliveries.push({ activation, settlement, grant });
      return undefined; // Leave reports pending so late-settlement isolation can be observed.
    },
    isSafeToReplace: () => true,
  };
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(owner, createRequest({ creationKey: key })));
  const open = accepted(kernel.dispatch(owner, executionId, { bound: 1 }));
  const inspect = () => accepted(kernel.inspect(owner, executionId));
  return { kernel, executionId, open, deliveries, inspect };
}

function withoutRefusals(value: ExecutionView) {
  const { refusals: _refusals, ...rest } = value;
  return rest;
}

function containsReference(root: unknown, target: object): boolean {
  if (root === target) return true;
  return typeof root === "object" && root !== null && Object.values(root).some(value => containsReference(value, target));
}

describe("K12-R6-EVID-01 submission authority follows Runtime attempts, not delivery attempts", () => {
  test("the first send's grant still accepts after two redeliveries, including hold-ending submission", () => {
    const { kernel, executionId, open, deliveries, inspect } = setup("lifetime-first");
    const first = deliveries[0];
    assert.ok(first);
    const originalGrant = first.grant; // Saved BEFORE either redelivery.
    assert.ok(Object.isFrozen(originalGrant));
    assert.deepEqual(originalGrant, { executionId, activationId: open.activationId, writerEpoch: 1 });
    const before = inspect();
    for (let index = 0; index < 2; index += 1) {
      const resent = accepted(kernel.redeliver(owner, executionId));
      assert.equal(resent.receipt, open.receipt);
      assert.equal(resent.activationId, open.activationId);
      assert.equal(resent.writerEpoch, 1);
    }
    assert.equal(deliveries.length, 3);
    const afterResends = inspect();
    assert.deepEqual({ ...afterResends, activation: before.activation }, before, "only delivery evidence grows");
    assert.equal(afterResends.activation?.deliveries.length, 3);
    assert.equal(containsReference(afterResends, originalGrant), false, "inspection never hands out authority");
    assert.equal(containsReference(first.activation, originalGrant), false, "grant travels separately from Activation");

    accepted(kernel.recoverExecution(owner, executionId, {
      activationId: open.activationId,
      available: { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] },
    }));
    accepted(kernel.reportProtocolFailure(owner, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    const held = inspect();
    assert.equal(held.recoveryHolds.length, 2);
    assert.equal(runtime.controlScopes, undefined);
    const proposal = outcomeFor(executionId, open, { progress: { answered: "first send" } });
    // A per-redelivery grant rotation fails HERE: the original reference must still authorize acceptance.
    const answer = accepted(kernel.submitOutcome(runtime, proposal, originalGrant));
    assert.equal(answer.nextState, "READY");
    assert.equal(answer.progressRevision, 1);
    assert.deepEqual(answer.acknowledged, open.batch);
    const after = inspect();
    assert.deepEqual(after.recoveryHolds, []);
    assert.deepEqual(after.acceptedProgress, { answered: "first send" });
    assert.deepEqual(after.receipts.map(receipt => receipt.position), [1, 2, 3]);
    assert.deepEqual(after.recoveryHistory.slice(2).map(row => [row.transition, row.authority]), [
      ["ended_by_outcome", "attempt_submission"], ["ended_by_outcome", "attempt_submission"],
    ]);
    assert.equal(after.exchanges.length, 1);
    for (const delivery of deliveries) {
      assert.equal(delivery.activation, first.activation);
      assert.equal(delivery.grant, originalGrant);
      assert.ok(Object.isFrozen(delivery.settlement));
    }
    assert.equal(new Set(deliveries.map(delivery => delivery.settlement)).size, 3, "report capabilities are per delivery");
    const replay = accepted(kernel.submitOutcome(runtime, proposal, undefined as unknown as SubmissionGrant));
    assert.equal(replay.receipt, answer.receipt);
    assert.deepEqual(inspect(), after, "replay needs no fresh grant and commits nothing");

    first.settlement.delivered(); // A late report changes only its original delivery row.
    const late = inspect();
    assert.deepEqual(late.exchanges[0]?.deliveries.map(row => row.status), ["delivered", "pending", "pending"]);
    assert.deepEqual({ ...late, exchanges: after.exchanges }, after);
  });

  test("takeover creates a new grant whose first send survives redelivery while the retired grant stays fenced", () => {
    const { kernel, executionId, open, deliveries, inspect } = setup("lifetime-takeover");
    const first = deliveries[0];
    assert.ok(first);
    const retiredGrant = first.grant;
    accepted(kernel.reportProtocolFailure(owner, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    const taken = accepted(kernel.requestTakeover(owner, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    const replacement = deliveries[1];
    assert.ok(replacement);
    const replacementGrant = replacement.grant; // Saved at takeover delivery BEFORE either resend.
    assert.notEqual(replacementGrant, retiredGrant);
    assert.ok(Object.isFrozen(replacementGrant));
    assert.deepEqual(replacementGrant, { executionId, activationId: open.activationId, writerEpoch: 2 });
    assert.deepEqual(replacement.activation.events, first.activation.events);
    assert.equal(inspect().recoveryHistory[1]?.authority, "control");
    assert.deepEqual(inspect().recoveryHolds, []);
    accepted(kernel.redeliver(owner, executionId));
    accepted(kernel.redeliver(owner, executionId));
    assert.equal(deliveries.length, 4);
    const beforeRefusal = inspect();
    assert.equal(refused(kernel.submitOutcome(runtime, outcomeFor(executionId, open), retiredGrant)).classification, "stale_exchange");
    assert.equal(refused(kernel.submitOutcome(runtime, outcomeFor(executionId, taken), retiredGrant)).classification, "unauthorized_submission");
    assert.deepEqual(withoutRefusals(inspect()), withoutRefusals(beforeRefusal));
    assert.equal(inspect().refusals.length, beforeRefusal.refusals.length + 2);
    const proposal = outcomeFor(executionId, taken, { progress: { answered: "replacement first send" }, next: { step: "complete", result: "done" } });
    // This also rejects a subtler mutation that rotates only after a takeover (epoch > 1).
    const answer = accepted(kernel.submitOutcome(runtime, proposal, replacementGrant));
    assert.equal(answer.nextState, "COMPLETED");
    assert.equal(answer.progressRevision, 1);
    const after = inspect();
    assert.equal(after.exchanges[0]?.writerEpoch, 2);
    assert.deepEqual(after.receipts.map(receipt => receipt.position), [1, 2, 3, 4]);
    assert.deepEqual(after.exchanges[0]?.deliveries.map(row => row.writerEpoch), [1, 2, 2, 2]);
    for (const delivery of deliveries.slice(1)) {
      assert.equal(delivery.grant, replacementGrant);
      assert.equal(delivery.activation, replacement.activation);
    }
    assert.equal(new Set(deliveries.map(delivery => delivery.settlement)).size, 4);
    assert.equal(containsReference(after, replacementGrant), false);
    assert.equal(containsReference(after, retiredGrant), false);
    assert.equal(accepted(kernel.submitOutcome(runtime, proposal, retiredGrant)).receipt, answer.receipt, "terminal replay precedes authority");
    assert.deepEqual(inspect(), after);
    first.settlement.failed("late old attempt");
    const late = inspect();
    assert.deepEqual(late.exchanges[0]?.deliveries.map(row => row.status), ["failed", "pending", "pending", "pending"]);
    assert.deepEqual({ ...late, exchanges: after.exchanges }, after);
  });
});
