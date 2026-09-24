/**
 * K12-R1-DELIVERY-01 - delivery attribution across redelivery and takeover.
 *
 * Canonical owner: `mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary`
 * and `concepts/identity.md#dispatch-and-delivery` (K1.2-DEC-16): each retained delivery row
 * names the Activation ID and writer epoch it carried when sent. Ordinary redelivery keeps
 * both; an authorized takeover keeps the Activation ID and advances the epoch. A late report
 * settles only its own row, never the current exchange or logical state.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type DeliverySettlement, type ExecutionView } from "../src/index.ts";
import { accepted, caller, createRequest, delayedDriver, outcomeFor, recordingDriver } from "./harness.ts";

const author = caller("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

/** Everything except the delivery-attempt records, which are the one thing a late report may change. */
function logicalState(snapshot: ExecutionView): unknown {
  return {
    ...snapshot,
    activation: snapshot.activation === null ? null : { ...snapshot.activation, deliveries: "(operational)" },
    exchanges: snapshot.exchanges.map((exchange) => ({ ...exchange, deliveries: "(operational)" })),
  };
}

describe("K12-R1-DELIVERY-01 mixed redeliveries across takeover retain exact attribution", () => {
  test('Test A "mixed redeliveries across takeover retain exact attribution"', () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));

    // attempt2 at epoch 1: ordinary redelivery.
    const second = accepted(kernel.redeliver(author, created.executionId));
    assert.equal(second.activationId, dispatched.activationId);
    assert.equal(second.writerEpoch, 1);

    // attempt3 at epoch 2: authorized takeover keeps the Activation ID, advances the epoch.
    const taken = accepted(
      kernel.requestTakeover(author, created.executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(taken.activationId, dispatched.activationId);
    assert.equal(taken.writerEpoch, 2);

    // attempt4 at epoch 2: redelivery of the current attempt.
    const fourth = accepted(kernel.redeliver(author, created.executionId));
    assert.equal(fourth.activationId, dispatched.activationId);
    assert.equal(fourth.writerEpoch, 2);

    assert.equal(driver.seen.length, 4);
    const after = view(kernel, created.executionId);
    assert.equal(after.activation?.activationId, dispatched.activationId);
    assert.equal(after.activation?.writerEpoch, 2);
    assert.deepEqual(
      after.activation?.deliveries,
      [
        { attempt: 1, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
        { attempt: 2, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
        { attempt: 3, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
        { attempt: 4, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
      ],
      "four rows, attempts [1,2,3,4], one Activation ID, epochs [1,1,2,2], all delivered",
    );
    assert.deepEqual(
      after.activation?.deliveries.map((row) => row.attempt),
      [1, 2, 3, 4],
    );
    assert.deepEqual(
      after.activation?.deliveries.map((row) => row.activationId),
      [dispatched.activationId, dispatched.activationId, dispatched.activationId, dispatched.activationId],
    );
    assert.deepEqual(
      after.activation?.deliveries.map((row) => row.writerEpoch),
      [1, 1, 2, 2],
    );
  });

  test('Test B "late reports settle only their own row across epochs"', () => {
    const driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const executionId = created.executionId;
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const cap0 = driver.settlements[0] as DeliverySettlement;
    accepted(kernel.redeliver(author, executionId));
    const cap1 = driver.settlements[1] as DeliverySettlement;
    accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    const cap2 = driver.settlements[2] as DeliverySettlement;
    accepted(kernel.redeliver(author, executionId));
    const cap3 = driver.settlements[3] as DeliverySettlement;

    const pending = view(kernel, executionId);
    assert.deepEqual(
      pending.activation?.deliveries,
      [
        { attempt: 1, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
        { attempt: 2, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
        { attempt: 3, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
        { attempt: 4, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
      ],
    );
    assert.equal(pending.activation?.writerEpoch, 2);

    // Settle out of order: fourth first.
    const beforeFourth = view(kernel, executionId);
    cap3.failed("fourth lost");
    const afterFourth = view(kernel, executionId);
    assert.deepEqual(afterFourth.activation?.deliveries, [
      { attempt: 1, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 2, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 3, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
      { attempt: 4, status: "failed", failure: "fourth lost", activationId: dispatched.activationId, writerEpoch: 2 },
    ]);
    assert.equal(afterFourth.activation?.writerEpoch, 2, "a report does not move the epoch");
    assert.deepEqual(logicalState(afterFourth), logicalState(beforeFourth), "no logical change");

    // First delivers; the failed fourth is untouched.
    const beforeFirst = view(kernel, executionId);
    cap0.delivered();
    const afterFirst = view(kernel, executionId);
    assert.deepEqual(afterFirst.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 2, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 3, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
      { attempt: 4, status: "failed", failure: "fourth lost", activationId: dispatched.activationId, writerEpoch: 2 },
    ]);
    assert.equal(afterFirst.activation?.writerEpoch, 2);
    assert.deepEqual(logicalState(afterFirst), logicalState(beforeFirst));

    // Third delivers (the replacement attempt); rows 1, 2 and 4 unchanged.
    const beforeThird = view(kernel, executionId);
    cap2.delivered();
    const afterThird = view(kernel, executionId);
    assert.deepEqual(afterThird.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 2, status: "pending", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 3, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
      { attempt: 4, status: "failed", failure: "fourth lost", activationId: dispatched.activationId, writerEpoch: 2 },
    ]);
    assert.equal(afterThird.activation?.writerEpoch, 2);
    assert.deepEqual(logicalState(afterThird), logicalState(beforeThird));

    // Second fails last; every row is now settled and isolated.
    const beforeSecond = view(kernel, executionId);
    cap1.failed("second lost");
    const afterSecond = view(kernel, executionId);
    assert.deepEqual(afterSecond.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 2, status: "failed", failure: "second lost", activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 3, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
      { attempt: 4, status: "failed", failure: "fourth lost", activationId: dispatched.activationId, writerEpoch: 2 },
    ]);
    assert.deepEqual(
      afterSecond.activation?.deliveries.map((row) => row.writerEpoch),
      [1, 1, 2, 2],
    );
    assert.equal(afterSecond.activation?.writerEpoch, 2);
    assert.deepEqual(logicalState(afterSecond), logicalState(beforeSecond));
    assert.deepEqual(afterSecond.acknowledged, beforeSecond.acknowledged);
    assert.equal(afterSecond.state, beforeSecond.state);
  });

  test('Test C "resolved exchange retains per-delivery epochs"', () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const executionId = created.executionId;
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.redeliver(author, executionId));
    accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, writerEpoch: 2 })));

    const after = view(kernel, executionId);
    assert.equal(after.activation, null, "the exchange is resolved");
    assert.equal(after.exchanges.length, 1);
    assert.equal(after.exchanges[0]?.activationId, dispatched.activationId);
    assert.equal(after.exchanges[0]?.writerEpoch, 2, "the resolved exchange records which attempt was accepted");
    assert.deepEqual(after.exchanges[0]?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 2, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 1 },
      { attempt: 3, status: "delivered", failure: null, activationId: dispatched.activationId, writerEpoch: 2 },
    ]);
    assert.deepEqual(
      after.exchanges[0]?.deliveries.map((row) => row.writerEpoch),
      [1, 1, 2],
    );
  });

  test('Test D "new exchange after continue has its own attribution"', () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const executionId = created.executionId;
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.redeliver(author, executionId));
    accepted(kernel.requestTakeover(author, executionId, { activationId: first.activationId, writerEpoch: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, { ...first, writerEpoch: 2 })));

    const next = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    assert.notEqual(next.activationId, first.activationId, "a new exchange, not the old one resent");
    assert.equal(next.writerEpoch, 1, "a new exchange starts its own attempt ordering at 1");

    const after = view(kernel, executionId);
    assert.equal(after.activation?.activationId, next.activationId);
    assert.equal(after.activation?.writerEpoch, 1);
    assert.deepEqual(after.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null, activationId: next.activationId, writerEpoch: 1 },
    ]);
    assert.equal(after.exchanges.length, 1);
    assert.deepEqual(
      after.exchanges[0]?.deliveries,
      [
        { attempt: 1, status: "delivered", failure: null, activationId: first.activationId, writerEpoch: 1 },
        { attempt: 2, status: "delivered", failure: null, activationId: first.activationId, writerEpoch: 1 },
        { attempt: 3, status: "delivered", failure: null, activationId: first.activationId, writerEpoch: 2 },
      ],
      "the old exchange's rows are unchanged",
    );
  });
});
