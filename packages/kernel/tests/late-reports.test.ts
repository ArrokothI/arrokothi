/**
 * K1.2-C11 - what arrives after the exchange it concerns has moved on.
 *
 * Canonical owner: `mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary`: "After
 * exchange resolution, cancellation or takeover, a report may only update that original retained
 * operational record, never the current exchange or logical state", with the resolution and takeover
 * cases assigned to K1.2 (cancellation is K1.3's). And `#outcome-acceptance` with 007's K1.2
 * acceptance: a late Outcome for a resolved Activation "returns its original receipt when it is an
 * exact duplicate and is otherwise refused with no state change, including after the next exchange
 * has started; it never commits into the new exchange."
 *
 * The delayed Driver holds each reporting capability until the test uses it, so "late" is an
 * ordering the test fixes rather than a timing accident.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type DeliverySettlement, type ExecutionView } from "../src/index.ts";
import { accepted, caller, createRequest, delayedDriver, outcomeFor, refused } from "./harness.ts";

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

function withDelayedDelivery() {
  const driver = delayedDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest()));
  const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  const capability = driver.settlements[0] as DeliverySettlement;
  return { kernel, driver, executionId: created.executionId, dispatched, capability };
}

describe("K1.2-C11 a late delivery report settles only its own original attempt record", () => {
  test("after the exchange resolved: the resolved exchange's attempt settles, and nothing logical moves", () => {
    const { kernel, executionId, dispatched, capability } = withDelayedDelivery();
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched)));
    const before = view(kernel, executionId);
    assert.deepEqual(before.exchanges[0]?.deliveries, [{ attempt: 1, status: "pending", failure: null }]);

    capability.delivered();
    const after = view(kernel, executionId);
    assert.deepEqual(after.exchanges[0]?.deliveries, [{ attempt: 1, status: "delivered", failure: null }]);
    assert.deepEqual(logicalState(after), logicalState(before), "no receipt, epoch, reservation, acknowledgment or lifecycle changed");

    capability.failed("too late to matter");
    assert.deepEqual(view(kernel, executionId).exchanges[0]?.deliveries, [{ attempt: 1, status: "delivered", failure: null }], "first report wins");
  });

  test("after the next exchange started: the old report cannot touch the new exchange's attempts", () => {
    const { kernel, driver, executionId, dispatched, capability } = withDelayedDelivery();
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched)));
    const next = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const before = view(kernel, executionId);
    assert.equal(before.activation?.activationId, next.activationId);

    capability.failed("native submit lost");
    const after = view(kernel, executionId);
    assert.deepEqual(after.exchanges[0]?.deliveries, [{ attempt: 1, status: "failed", failure: "native submit lost" }]);
    assert.deepEqual(after.activation?.deliveries, [{ attempt: 1, status: "pending", failure: null }], "the new exchange's own attempt is untouched");
    assert.deepEqual(logicalState(after), logicalState(before));
    assert.equal(driver.settlements.length, 2);
  });

  test("after a takeover: the superseded attempt's report settles its record, not the replacement's", () => {
    const { kernel, driver, executionId, dispatched, capability } = withDelayedDelivery();
    accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    const before = view(kernel, executionId);
    assert.deepEqual(before.activation?.deliveries, [
      { attempt: 1, status: "pending", failure: null },
      { attempt: 2, status: "pending", failure: null },
    ]);

    capability.delivered();
    const after = view(kernel, executionId);
    assert.deepEqual(after.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null },
      { attempt: 2, status: "pending", failure: null },
    ]);
    assert.equal(after.activation?.writerEpoch, 2, "a late report from epoch 1 does not bring epoch 1 back");
    assert.deepEqual(logicalState(after), logicalState(before));

    (driver.settlements[1] as DeliverySettlement).failed("replacement lost");
    assert.equal(view(kernel, executionId).activation?.deliveries[0]?.status, "delivered", "the replacement's report cannot rewrite the first attempt");
  });

  test("after the Execution ended: the report still lands only on its record", () => {
    const { kernel, executionId, dispatched, capability } = withDelayedDelivery();
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { next: { step: "complete", result: 1 } })));
    const before = view(kernel, executionId);
    capability.delivered();
    const after = view(kernel, executionId);
    assert.equal(after.state, "COMPLETED");
    assert.deepEqual(logicalState(after), logicalState(before));
  });
});

describe("K1.2-C11 a late Outcome for a resolved Activation never commits into the new exchange", () => {
  test("exact: the original receipt; changed: refused; either way the open exchange is untouched", () => {
    const { kernel, executionId, dispatched } = withDelayedDelivery();
    const envelope = outcomeFor(executionId, dispatched, { progress: { cursor: 1 } });
    const original = accepted(kernel.submitOutcome(author, envelope));
    accepted(kernel.submitInput(author, { destination: executionId, requestKey: "c1", kind: "k", payload: 1 }));
    const next = accepted(kernel.dispatch(author, executionId, { bound: 4 }));
    const before = view(kernel, executionId);

    const exact = accepted(kernel.submitOutcome(author, envelope));
    assert.equal(exact.receipt, original.receipt);
    assert.equal(exact.replayed, true);
    assert.deepEqual(view(kernel, executionId), before);

    // Changed content naming the old exchange - even content that would be a valid answer to the new
    // one - is a conflict under the old identity. It can neither revive A nor land in B.
    const changed = refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, baseProgressRevision: 1 }, { progress: { cursor: 2 } })));
    assert.equal(changed.classification, "duplicate_conflict");
    const after = view(kernel, executionId);
    assert.equal(after.activation?.activationId, next.activationId);
    assert.deepEqual(after.activation?.batch, before.activation?.batch);
    assert.deepEqual(after.acknowledged, before.acknowledged, "B's batch is still unacknowledged");
    assert.equal(after.progressRevision, 1);
    assert.deepEqual(after.acceptedProgress, { cursor: 1 });
  });
});
