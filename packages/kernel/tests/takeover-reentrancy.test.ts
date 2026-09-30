/**
 * K12-R2-TAKEOVER-01 - the safety callback can synchronously reenter the coordinator.
 *
 * Canonical owners: `identity.md#writer-epoch` (only an accepted takeover advances the epoch),
 * `recovery.md#decide-permission-before-replacing-work` (permission before replacement and fencing),
 * `execution-cycle.md#retry-versus-takeover` (one current attempt per exchange).
 *
 * `isSafeToReplace` is trusted same-process Driver/host code. It can synchronously reenter with a
 * nested takeover, a valid Outcome, or a recovery declaration before returning `true`. The outer
 * request must revalidate the same unresolved exchange, current epoch, and hold state after the
 * callback returns and before committing: at most one takeover decision commits per request, and an
 * exchange that resolved, advanced, ended, or became held during the callback makes the outer arm
 * refuse with no orphan receipt, extra delivery, or overwritten evidence.
 *
 * Each case asserts the whole retained result: lifecycle, current Activation, resolved exchanges,
 * writer epoch, holds, receipt sequence and references, delivery attempts, refusals, and history.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ExecutionCoordinator,
  type Activation,
  type DeliverySettlement,
  type ExecutionDriver,
  type ExecutionView,
  type SubmissionGrant,
  type TakeoverAccepted,
} from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView =>
  accepted(kernel.inspect(author, executionId));

/** Receipt positions on the owning Execution, oldest first. */
const positions = (kernel: ExecutionCoordinator, executionId: string): number[] =>
  view(kernel, executionId).receipts.map((receipt) => receipt.position);

function dispatched(creationKey: string, driver: ExecutionDriver) {
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest({ creationKey })));
  const open = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  return { kernel, executionId: created.executionId, open };
}

describe("K12-R2-TAKEOVER-01 a nested takeover inside isSafeToReplace commits once", () => {
  test("inner takeover commits epoch 2; the outer stale arm refuses with no orphan receipt or delivery", () => {
    // Captured through an array: the callback assignment is invisible to control-flow
    // narrowing, so the length check below is a real runtime assertion, not a tautology.
    const committed: TakeoverAccepted[] = [];
    let entered = false;
    const kernel: ExecutionCoordinator = new ExecutionCoordinator({
      driver: {
        driverId: "reentrant-safety-nested",
        deliver(_activation: Activation, settlement: DeliverySettlement): undefined {
          settlement.delivered();
          return undefined;
        },
        isSafeToReplace(activation: Activation): boolean {
          if (!entered) {
            entered = true;
            committed.push(
              accepted(
                kernel.requestTakeover(author, activation.executionId, {
                  activationId: activation.activationId,
                  writerEpoch: activation.writerEpoch,
                }),
              ),
            );
          }
          return true;
        },
      },
    });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "reentrant-nested" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const beforeReceipts = view(kernel, executionId).receipts.length;

    const outer = kernel.requestTakeover(author, executionId, {
      activationId: open.activationId,
      writerEpoch: 1,
    });
    assert.equal(refused(outer).classification, "stale_exchange", "the outer arm is superseded");
    assert.equal(committed.length, 1, "the inner takeover commits while the outer is inside the callback");
    const inner = committed[0] as TakeoverAccepted;
    assert.equal(inner.writerEpoch, 2);

    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING");
    assert.equal(after.activation?.writerEpoch, 2, "exactly one advance");
    assert.equal(after.activation?.receipt, inner.receipt, "the inner receipt stands; the outer minted none");
    assert.deepEqual(positions(kernel, executionId), [1, 2, 3], "creation, dispatch, one takeover; no orphan");
    assert.equal(after.receipts.length, beforeReceipts + 1);
    assert.deepEqual(after.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: open.activationId, writerEpoch: 1 },
      { attempt: 2, status: "delivered", failure: null, activationId: open.activationId, writerEpoch: 2 },
    ]);
    assert.equal(after.refusals.length, 1);
    assert.equal(after.refusals[0]?.classification, "stale_exchange");
    assert.deepEqual(after.recoveryHolds, []);
    assert.deepEqual(after.recoveryHistory, []);
  });
});

describe("K12-R2-TAKEOVER-01 an Outcome inside isSafeToReplace resolves first", () => {
  test("a current continue Outcome resolves; the outer takeover refuses with no receipt or delivery", () => {
    const envelope = (executionId: string, activationId: string) => ({
      executionId,
      activationId,
      writerEpoch: 1,
      baseProgressRevision: 0,
      progress: { phase: "from-safety" },
      next: { step: "continue" as const },
    });
    let innerOk = false;
    // The grant arrives with the delivery; the array capture keeps the runtime read real.
    const grants: SubmissionGrant[] = [];
    const kernel: ExecutionCoordinator = new ExecutionCoordinator({
      driver: {
        driverId: "reentrant-safety-outcome",
        deliver(_activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined {
          grants.push(submission);
          settlement.delivered();
          return undefined;
        },
        isSafeToReplace(activation: Activation): boolean {
          if (!innerOk) {
            innerOk = true;
            accepted(
              kernel.submitOutcome(
                author,
                envelope(activation.executionId, activation.activationId),
                grants[grants.length - 1] as SubmissionGrant,
              ),
            );
          }
          return true;
        },
      },
    });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "reentrant-outcome" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));

    const outer = kernel.requestTakeover(author, executionId, {
      activationId: open.activationId,
      writerEpoch: 1,
    });
    assert.equal(refused(outer).classification, "no_unresolved_exchange");

    const after = view(kernel, executionId);
    assert.equal(after.state, "READY", "the Outcome resolved the exchange");
    assert.equal(after.activation, null);
    assert.equal(after.exchanges.length, 1);
    assert.equal(after.exchanges[0]?.writerEpoch, 1);
    assert.deepEqual(positions(kernel, executionId), [1, 2, 3], "creation, dispatch, Outcome; no takeover receipt");
    assert.deepEqual(after.exchanges[0]?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: open.activationId, writerEpoch: 1 },
    ]);
    assert.deepEqual(after.acceptedProgress, { phase: "from-safety" });
    // The resolving Outcome is replayable from its record; the refused takeover changed nothing else.
    const replay = accepted(
      kernel.submitOutcome(author, envelope(executionId, open.activationId), grants[grants.length - 1] as SubmissionGrant),
    );
    assert.equal(replay.replayed, true);
    assert.deepEqual(view(kernel, executionId).exchanges.length, 1);
  });

  test("a terminal complete inside the callback ends the Execution; the outer takeover is refused", () => {
    const grants: SubmissionGrant[] = [];
    const kernel: ExecutionCoordinator = new ExecutionCoordinator({
      driver: {
        driverId: "reentrant-safety-terminal",
        deliver(_activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined {
          grants.push(submission);
          settlement.delivered();
          return undefined;
        },
        isSafeToReplace(activation: Activation): boolean {
          accepted(
            kernel.submitOutcome(
              author,
              outcomeFor(activation.executionId, {
                activationId: activation.activationId,
                writerEpoch: 1,
                baseProgressRevision: 0,
              }, { next: { step: "complete", result: { report: "from-safety" } } }),
              grants[grants.length - 1] as SubmissionGrant,
            ),
          );
          return true;
        },
      },
    });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "reentrant-terminal" })));
    const executionId = created.executionId;
    const late = accepted(
      kernel.submitInput(author, { destination: executionId, requestKey: "late", kind: "k", payload: 1 }),
    );
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));

    const outer = kernel.requestTakeover(author, executionId, {
      activationId: open.activationId,
      writerEpoch: 1,
    });
    assert.equal(refused(outer).classification, "terminal_destination");

    const after = view(kernel, executionId);
    assert.equal(after.state, "COMPLETED");
    assert.equal(after.activation, null);
    assert.equal(after.result?.kind, "completed");
    assert.deepEqual(after.terminalDispositions, [late.eventId], "B-5 disposition in the same decision");
    assert.deepEqual(positions(kernel, executionId), [1, 2, 3, 4], "creation, input, dispatch, Outcome; no takeover");
    assert.deepEqual(after.exchanges[0]?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: open.activationId, writerEpoch: 1 },
    ]);
  });
});

describe("K12-R2-TAKEOVER-01 a code hold inside isSafeToReplace blocks the outer takeover", () => {
  test("recoverExecution establishes the hold during the callback; the outer arm is refused", () => {
    let declared = false;
    const kernel: ExecutionCoordinator = new ExecutionCoordinator({
      driver: {
        driverId: "reentrant-safety-hold",
        deliver(_activation: Activation, settlement: DeliverySettlement): undefined {
          settlement.delivered();
          return undefined;
        },
        isSafeToReplace(activation: Activation): boolean {
          if (!declared) {
            declared = true;
            accepted(
              kernel.recoverExecution(author, activation.executionId, {
                activationId: activation.activationId,
                available: { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] },
              }),
            );
          }
          return true;
        },
      },
    });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "reentrant-hold" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));

    const outer = kernel.requestTakeover(author, executionId, {
      activationId: open.activationId,
      writerEpoch: 1,
    });
    assert.equal(refused(outer).classification, "recovery_held");

    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING");
    assert.equal(after.activation?.writerEpoch, 1, "no advance past the new hold");
    assert.equal(after.recoveryHolds.length, 1);
    assert.equal(after.recoveryHolds[0]?.cause, "pinned_code_unavailable");
    assert.deepEqual(after.recoveryHolds[0]?.permittedNextActions, ["declare_code_availability", "submit_outcome"]);
    assert.equal(after.recoveryHistory.length, 1);
    assert.equal(after.recoveryHistory[0]?.transition, "entered");
    assert.deepEqual(positions(kernel, executionId), [1, 2], "creation, dispatch; the refused takeover minted none");
    assert.deepEqual(after.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: open.activationId, writerEpoch: 1 },
    ]);
    assert.equal(after.refusals.length, 1);
    assert.equal(after.refusals[0]?.classification, "recovery_held");
  });
});
