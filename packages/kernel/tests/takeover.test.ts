/**
 * K1.2-C8 - an authorized takeover keeps the question and replaces who may answer it.
 *
 * Canonical owners: `mental-model/mechanisms/execution-cycle.md#retry-versus-takeover` (same
 * Activation ID, advancing epoch, same pinned input) and `concepts/identity.md#writer-epoch` ("An
 * authenticated takeover decision advances it. Nothing else does"; the epoch fences "the whole of an
 * Outcome acceptance"). WS ID-9's four schedules are the distinguishing cases: ordinary redelivery,
 * lost-host takeover, the stale old-epoch Outcome, and the next semantic Activation.
 *
 * `rewrite-index.md` §5.1 and §5.3 name the two plausible wrong implementations these cases reject:
 * minting a new Activation ID on takeover, and comparing epochs across different Activation IDs.
 * Epoch values are therefore compared only within one exchange here.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type ExecutionView, type SubmissionGrant } from "../src/index.ts";
import { accepted, caller, createRequest, delayedDriver, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";

const author = caller("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

function dispatchedExecution() {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest()));
  const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  return { kernel, driver, executionId: created.executionId, initialEventId: created.initialEventId, dispatched };
}

describe("K1.2-C8 an accepted takeover advances the epoch within the same exchange", () => {
  test("same Activation ID, same batch and progress, epoch + 1, a dispatch-intent receipt, a fresh delivery", () => {
    const { kernel, driver, executionId, initialEventId, dispatched } = dispatchedExecution();
    const later = accepted(kernel.submitInput(author, { destination: executionId, requestKey: "later", kind: "k", payload: 1 }));

    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    assert.equal(taken.activationId, dispatched.activationId, "a takeover is not a new exchange (rewrite-index §5.1)");
    assert.equal(taken.supersededEpoch, 1);
    assert.equal(taken.writerEpoch, 2);
    assert.deepEqual(taken.batch, [initialEventId], "the pinned batch; the later input never joins it");
    assert.equal(taken.baseProgressRevision, 0);
    assert.equal(taken.receipt.boundary, "dispatch_intent", "the dispatch intent re-records its current attempt");
    assert.notEqual(taken.receipt, dispatched.receipt);

    // The replacement attempt is handed the same exchange at the new epoch, and nothing else changed.
    assert.equal(driver.seen.length, 2);
    const [first, second] = driver.seen;
    assert.ok(first && second);
    assert.equal(second.writerEpoch, 2);
    assert.equal(first.writerEpoch, 1, "the first attempt's Activation is not edited behind it");
    const { writerEpoch: _e1, ...firstRest } = first;
    const { writerEpoch: _e2, ...secondRest } = second;
    assert.deepEqual(secondRest, firstRest, "identical Activation apart from the epoch");
    assert.ok(Object.isFrozen(second));

    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING");
    assert.equal(after.activation?.writerEpoch, 2);
    assert.equal(after.activation?.receipt, taken.receipt);
    assert.deepEqual(after.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 2, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
    ]);
    assert.deepEqual(after.queued, [initialEventId, later.eventId], "a takeover acknowledges nothing");
    assert.equal(after.receipts[after.receipts.length - 1], taken.receipt);
  });

  test("the superseded epoch is fenced at once, and the new epoch commits (WS ID-9 case 3)", () => {
    const { kernel, driver, executionId, dispatched } = dispatchedExecution();
    accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    const before = view(kernel, executionId);

    // A perfectly good draft from the original host: refused in full because its epoch moved.
    const stale = refused(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { next: { step: "complete", result: { draft: "good" } } }), submissionFor(driver, dispatched.activationId)));
    assert.equal(stale.classification, "stale_exchange");
    assert.match(stale.reason, /writer epoch 1 was superseded by epoch 2/);
    const afterStale = view(kernel, executionId);
    assert.equal(afterStale.refusals.length, before.refusals.length + 1);
    const { refusals: _a, ...afterRest } = afterStale;
    const { refusals: _b, ...beforeRest } = before;
    assert.deepEqual(afterRest, beforeRest, "no acknowledgment, progress, Emission, result or state from the stale attempt");

    const current = accepted(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, writerEpoch: 2 }, { progress: { from: "attempt 2" } }), submissionFor(driver, dispatched.activationId)));
    assert.equal(current.progressRevision, 1);
    const after = view(kernel, executionId);
    assert.deepEqual(after.acceptedProgress, { from: "attempt 2" });
    assert.equal(after.exchanges[0]?.writerEpoch, 2, "the resolved exchange records which attempt's Outcome was accepted");
  });

  test("after the new epoch's Outcome is accepted, the old attempt's late Outcome conflicts and changes nothing", () => {
    const { kernel, driver, executionId, dispatched } = dispatchedExecution();
    accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, writerEpoch: 2 }), submissionFor(driver, dispatched.activationId)));
    const before = view(kernel, executionId);
    // Identical proposal, old epoch: different content under the accepted identity (OA-2 first).
    assert.equal(refused(kernel.submitOutcome(author, outcomeFor(executionId, dispatched), submissionFor(driver, dispatched.activationId))).classification, "duplicate_conflict");
    const after = view(kernel, executionId);
    assert.equal(after.progressRevision, before.progressRevision);
    assert.equal(after.state, before.state);
  });

  test("a takeover names the attempt it supersedes: a repeat cannot advance twice", () => {
    const { kernel, executionId, dispatched } = dispatchedExecution();
    const request = { activationId: dispatched.activationId, writerEpoch: 1 };
    accepted(kernel.requestTakeover(author, executionId, request));
    const before = view(kernel, executionId);

    const repeat = refused(kernel.requestTakeover(author, executionId, request));
    assert.equal(repeat.classification, "stale_exchange");
    assert.match(repeat.reason, /writer epoch 1 is not the current epoch 2/);
    assert.equal(view(kernel, executionId).activation?.writerEpoch, 2, "advanced once");
    assert.equal(view(kernel, executionId).receipts.length, before.receipts.length, "a refused takeover mints no receipt");

    // A deliberate second takeover names the attempt that is now current.
    assert.equal(accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 2 })).writerEpoch, 3);
  });

  test("a takeover of an epoch that was never issued, or of another exchange, is refused", () => {
    const { kernel, executionId, dispatched } = dispatchedExecution();
    assert.equal(refused(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 2 })).classification, "stale_exchange");
    assert.equal(refused(kernel.requestTakeover(author, executionId, { activationId: `${dispatched.activationId}x`, writerEpoch: 1 })).classification, "stale_exchange");
    assert.equal(view(kernel, executionId).activation?.writerEpoch, 1);
  });

  test("with no exchange open there is nothing to take over; a malformed request is refused as such", () => {
    const { kernel, driver, executionId, dispatched } = dispatchedExecution();
    assert.equal(refused(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 0 })).classification, "malformed_value");
    assert.equal(refused(kernel.requestTakeover(author, executionId, { activationId: 7, writerEpoch: 1 } as never)).classification, "malformed_value");
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched), submissionFor(driver, dispatched.activationId)));
    assert.equal(
      refused(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 })).classification,
      "no_unresolved_exchange",
    );
  });
});

describe("K1.2-C8 only a takeover advances the epoch (WS ID-9 case 1)", () => {
  test("a retry-only schedule shows no epoch change from dispatch to acceptance", () => {
    const { kernel, driver, executionId, dispatched } = dispatchedExecution();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const redelivered = accepted(kernel.redeliver(author, executionId));
      assert.equal(redelivered.writerEpoch, 1);
      assert.equal(redelivered.activationId, dispatched.activationId);
    }
    assert.deepEqual(driver.seen.map((activation) => activation.writerEpoch), [1, 1, 1, 1, 1]);
    const answer = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched), submissionFor(driver, dispatched.activationId)));
    assert.equal(answer.nextState, "READY");
    assert.equal(view(kernel, executionId).exchanges[0]?.writerEpoch, 1);
  });

  test("redelivery after a takeover resends the current attempt, not the superseded one", () => {
    const { kernel, driver, executionId, dispatched } = dispatchedExecution();
    accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    assert.equal(accepted(kernel.redeliver(author, executionId)).writerEpoch, 2);
    assert.equal(driver.seen[driver.seen.length - 1]?.writerEpoch, 2);
  });
});

describe("K1.2-C8 the takeover is ordered against the Outcome it could race", () => {
  test("an Outcome accepted first resolves the exchange; a takeover arriving after it finds nothing to replace", () => {
    const { kernel, driver, executionId, dispatched } = dispatchedExecution();
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched), submissionFor(driver, dispatched.activationId)));
    assert.equal(refused(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 })).classification, "no_unresolved_exchange");
  });

  test("a takeover that reenters from inside the Driver's delivery is fenced like any other", () => {
    // The Driver itself decides, while handling delivery, that the attempt cannot continue and asks
    // for a takeover. The Kernel has already recorded the intent, so the takeover sees the open
    // exchange; the dispatch still returns the attempt it recorded.
    const delayed = delayedDriver();
    let reentered: unknown = null;
    const grants: SubmissionGrant[] = [];
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "reentrant",
        deliver(activation, settlement, submission) {
          grants.push(submission);
          if (activation.writerEpoch === 1 && reentered === null) {
            reentered = kernel.requestTakeover(author, activation.executionId, { activationId: activation.activationId, writerEpoch: 1 });
          }
          return delayed.deliver(activation, settlement, submission);
        },
        isSafeToReplace(): boolean {
          return true;
        },
      },
    });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.equal(dispatched.writerEpoch, 1, "the dispatch reports the attempt it recorded");
    assert.equal((reentered as { ok: boolean }).ok, true);
    assert.equal(view(kernel, created.executionId).activation?.writerEpoch, 2);
    assert.equal(refused(kernel.submitOutcome(author, outcomeFor(created.executionId, dispatched), submissionFor({ submissions: grants }, dispatched.activationId))).classification, "stale_exchange");
  });

  test("a redelivery answer describes the attempt it resent, even when the Driver takes over during it", () => {
    // Self-found while auditing K1.2's mutable exchange record: the answer used to be read back after
    // the Driver ran, so a reentrant takeover made redelivery report an attempt it never sent.
    let takeOver = false;
    const kernel: ExecutionCoordinator = new ExecutionCoordinator({
      driver: {
        driverId: "reentrant-on-redelivery",
        deliver(activation, settlement) {
          if (takeOver && activation.writerEpoch === 1) {
            takeOver = false;
            accepted(kernel.requestTakeover(author, activation.executionId, { activationId: activation.activationId, writerEpoch: 1 }));
          }
          settlement.delivered();
          return undefined;
        },
        isSafeToReplace(): boolean {
          return true;
        },
      },
    });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    takeOver = true;
    const resent = accepted(kernel.redeliver(author, created.executionId));
    assert.equal(resent.writerEpoch, 1, "epoch 1 was what this call delivered");
    assert.equal(resent.receipt, dispatched.receipt);
    assert.equal(view(kernel, created.executionId).activation?.writerEpoch, 2, "while the takeover it triggered stands");
  });
});
