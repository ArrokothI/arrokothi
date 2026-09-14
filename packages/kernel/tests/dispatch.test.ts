/**
 * K1.1-C4 and K1.1-C5 - dispatch intent, reservation, asynchrony and ordinary redelivery.
 *
 * `mental-model/mechanisms/execution-cycle.md` owns "Before sending" and the retry-versus-takeover
 * table; `core.md` owns batch, reservation and acknowledgment. The failures the cases are built
 * against: sending before the intent is recorded, so a lost send loses the exchange; awaiting the
 * Driver in the coordinator, so one slow Runtime stops every other Execution; treating reservation
 * as acknowledgment; re-selecting a batch on redelivery, so new mailbox arrivals appear under an
 * existing Activation ID; and inferring a pinned revision or codec from something other than the
 * creation that bound it.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, delayedDriver, recordingDriver, refused, rejectingDriver, throwingDriver } from "./harness.ts";

const author = caller("app-a", "tenant-a");
const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const started = (kernel: ExecutionCoordinator, creationKey = "report-17") => {
  const created = accepted(kernel.createExecution(author, createRequest({ creationKey })));
  return created;
};

const withInputs = (kernel: ExecutionCoordinator, executionId: string, keys: string[]): string[] =>
  keys.map(
    (requestKey) =>
      accepted(
        kernel.submitInput(author, { destination: executionId, requestKey, kind: "application.correction", payload: { k: requestKey } }),
      ).eventId,
  );

describe("K1.1-C4 what one dispatch intent pins", () => {
  test("the Activation carries exactly the facts creation bound, and the Execution is RUNNING", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = started(kernel);

    const result = accepted(kernel.dispatch(author, created.executionId, { bound: 4 }));
    assert.equal(result.receipt.boundary, "dispatch_intent");
    assert.equal(result.writerEpoch, 1);
    assert.equal(result.baseProgressRevision, 0);
    assert.equal(result.redelivered, false);

    assert.equal(driver.seen.length, 1);
    const activation = driver.seen[0];
    assert.ok(activation);
    assert.equal(activation.executionId, created.executionId);
    assert.equal(activation.activationId, result.activationId);
    assert.equal(activation.writerEpoch, 1);
    assert.equal(activation.baseProgressRevision, 0);
    assert.equal(activation.definitionRevision, "weekly-report@3");
    assert.equal(activation.runtimeContractRevision, "runtime-contract@1");
    assert.equal(activation.progressCodec, "inline-json@1");
    assert.equal(activation.acceptedProgress, null, "no Outcome has installed progress; K1.2 owns that");
    assert.deepEqual(activation.executionView, { tenant: "a" }, "the authorized view supplied at creation");
    assert.deepEqual(activation.events, [
      {
        eventId: created.initialEventId,
        destination: created.executionId,
        kind: "application.request",
        payload: { text: "report for week 37" },
        sourceCategory: "application_input",
        acceptancePosition: 1,
      },
    ]);

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING");
    assert.deepEqual(view.activation, {
      activationId: result.activationId,
      writerEpoch: 1,
      baseProgressRevision: 0,
      batch: [created.initialEventId],
      receipt: result.receipt,
      deliveries: [{ attempt: 1, status: "delivered", failure: null }],
      fenced: false,
    });
  });

  test("the pinned codec and revisions come from the creation that bound them, per Execution", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const first = accepted(kernel.createExecution(author, createRequest({ creationKey: "a" })));
    const second = accepted(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "b", definitionRevision: "other@9", runtimeContractRevision: "rc@7", progressCodec: "inline-json@2" }),
      ),
    );

    accepted(kernel.dispatch(author, first.executionId, { bound: 1 }));
    accepted(kernel.dispatch(author, second.executionId, { bound: 1 }));

    assert.deepEqual(
      driver.seen.map((activation) => [activation.definitionRevision, activation.runtimeContractRevision, activation.progressCodec]),
      [
        ["weekly-report@3", "runtime-contract@1", "inline-json@1"],
        ["other@9", "rc@7", "inline-json@2"],
      ],
    );
  });

  test("reservation pins a batch and acknowledges none of it", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const extra = withInputs(kernel, created.executionId, ["c1", "c2"]);

    const result = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));
    const view = accepted(kernel.inspect(author, created.executionId));

    assert.deepEqual(result.batch, [created.initialEventId, extra[0]]);
    assert.deepEqual(view.acknowledged, [], "reservation is not acknowledgment");
    assert.deepEqual(view.queued, [created.initialEventId, ...extra], "every Event is still unacknowledged");
    assert.deepEqual(
      view.mailbox.map((entry) => [entry.eventId, entry.reserved, entry.disposition.kind]),
      [
        [created.initialEventId, true, "queued"],
        [extra[0], true, "queued"],
        [extra[1], false, "queued"],
      ],
      "reserved is a property of the current exchange, not a disposition",
    );
  });

  test("the bound selects an acceptance-order prefix and must be at least one", () => {
    for (const [bound, expected] of [
      [1, 1],
      [2, 2],
      [3, 3],
      [9, 3],
    ] as const) {
      const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
      const created = started(kernel);
      const extra = withInputs(kernel, created.executionId, ["c1", "c2"]);
      const all = [created.initialEventId, ...extra];
      const result = accepted(kernel.dispatch(author, created.executionId, { bound }));
      assert.deepEqual(result.batch, all.slice(0, expected), `bound ${bound} selects the first ${expected}`);
    }

    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    for (const bound of [0, -1, 1.5, Number.NaN]) {
      const refusal = refused(kernel.dispatch(author, created.executionId, { bound }));
      assert.equal(refusal.classification, "invalid_batch_bound", `bound ${String(bound)} is refused`);
    }
    assert.equal(accepted(kernel.inspect(author, created.executionId)).state, "READY", "and no exchange was opened");
  });

  test("one Execution has at most one Activation authorized to commit", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const first = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const before = accepted(kernel.inspect(author, created.executionId));

    const refusal = refused(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.equal(refusal.classification, "exchange_unresolved");
    assert.match(refusal.reason, new RegExp(first.activationId.replace("/", "\\/")));

    const after = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(after.activation, before.activation, "the unresolved exchange is untouched");
  });

  test("a terminal or invisible Execution is not dispatched", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const outsider = caller("app-c", "tenant-c");

    const hidden = refused(kernel.dispatch(outsider, created.executionId, { bound: 1 }));
    const missing = refused(kernel.dispatch(outsider, "execution-404", { bound: 1 }));
    assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 });

    accepted(kernel.cancelExecution(author, created.executionId));
    assert.equal(refused(kernel.dispatch(author, created.executionId, { bound: 1 })).classification, "terminal_destination");
  });
});

describe("K1.1-C4 the intent is accepted before the send, and the send is not awaited", () => {
  test("a Driver that throws leaves the accepted intent standing", () => {
    const kernel = new ExecutionCoordinator({ driver: throwingDriver() });
    const created = started(kernel);

    const result = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING", "the exchange exists even though nothing received it");
    assert.equal(view.activation?.activationId, result.activationId);
    assert.deepEqual(view.activation?.batch, [created.initialEventId]);
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "failed", failure: "Error: native submit refused" }]);
  });

  test("a Driver whose promise rejects records an operational failure, not a state change", async () => {
    const kernel = new ExecutionCoordinator({ driver: rejectingDriver() });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));

    assert.equal(accepted(kernel.inspect(author, created.executionId)).activation?.deliveries[0]?.status, "pending");
    await settle();

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING", "a lost send does not resolve the exchange");
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "failed", failure: "Error: native submit lost" }]);
    assert.deepEqual(view.acknowledged, [], "and acknowledges nothing");
  });

  test("the intent is already accepted and readable by the time the Driver is called", () => {
    // The strongest form of "before sending": a Driver that reads the Kernel back from inside
    // `deliver` must already see the accepted exchange. If the intent were written after the send,
    // this observation would show a READY Execution with no Activation.
    let observed: { state: string; activationId: string | null; batch: readonly string[] | null; queued: readonly string[] } | null = null;
    let lateEventId: string | null = null;

    const kernel: ExecutionCoordinator = new ExecutionCoordinator({
      driver: {
        driverId: "fake-reentrant",
        deliver(activation) {
          const view = accepted(kernel.inspect(author, activation.executionId));
          observed = {
            state: view.state,
            activationId: view.activation?.activationId ?? null,
            batch: view.activation?.batch ?? null,
            queued: view.queued,
          };
          // And input accepted from inside the send is ordinary ingress: queued, never joining the
          // batch that was already reserved.
          lateEventId = accepted(
            kernel.submitInput(author, { destination: activation.executionId, requestKey: "reentrant", kind: "k", payload: null }),
          ).eventId;
        },
      },
    });

    const created = started(kernel);
    const result = accepted(kernel.dispatch(author, created.executionId, { bound: 4 }));

    assert.deepEqual(observed, {
      state: "RUNNING",
      activationId: result.activationId,
      batch: [created.initialEventId],
      queued: [created.initialEventId],
    });
    const after = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(after.activation?.batch, [created.initialEventId], "the reserved batch did not grow");
    assert.deepEqual(after.queued, [created.initialEventId, lateEventId]);
  });

  test("a delayed Execution does not prevent another from being dispatched on the same coordinator", () => {
    const driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const slow = started(kernel, "slow");
    const other = started(kernel, "other");

    const slowDispatch = accepted(kernel.dispatch(author, slow.executionId, { bound: 1 }));
    // The Driver's promise for `slow` is outstanding right now: nothing has released it. If the
    // coordinator awaited native work, this next call could not have returned at all.
    const otherDispatch = accepted(kernel.dispatch(author, other.executionId, { bound: 1 }));

    assert.notEqual(otherDispatch.activationId, slowDispatch.activationId);
    assert.deepEqual(driver.seen.map((activation) => activation.executionId), [slow.executionId, other.executionId]);
    assert.equal(accepted(kernel.inspect(author, slow.executionId)).activation?.deliveries[0]?.status, "pending");
    assert.equal(accepted(kernel.inspect(author, other.executionId)).state, "RUNNING");

    driver.release();
  });

  test("dispatch returns before the Driver's promise settles", async () => {
    const driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = started(kernel);

    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    await settle();
    assert.equal(
      accepted(kernel.inspect(author, created.executionId)).activation?.deliveries[0]?.status,
      "pending",
      "still outstanding after the event loop turned over",
    );

    driver.release();
    await settle();
    assert.equal(accepted(kernel.inspect(author, created.executionId)).activation?.deliveries[0]?.status, "delivered");
  });
});

describe("K1.1-C5 ordinary redelivery is the same exchange", () => {
  test("identity, epoch, base revision and batch are preserved, and nothing is re-selected", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = started(kernel);
    const first = accepted(kernel.dispatch(author, created.executionId, { bound: 4 }));
    const firstDelivery: unknown = JSON.parse(JSON.stringify(driver.seen[0]));

    // A new Event arrives while the exchange is unresolved. It must not appear under this
    // Activation ID: "New mailbox arrivals cannot replace the batch under an existing Activation ID."
    const late = withInputs(kernel, created.executionId, ["late"]);

    const again = accepted(kernel.redeliver(author, created.executionId));
    assert.equal(again.activationId, first.activationId);
    assert.equal(again.writerEpoch, first.writerEpoch, "an ordinary retry never advances the epoch");
    assert.equal(again.baseProgressRevision, first.baseProgressRevision);
    assert.deepEqual(again.batch, first.batch);
    assert.deepEqual(again.receipt, first.receipt, "no new accepted fact, so no new receipt");
    assert.equal(again.redelivered, true);

    assert.equal(driver.seen.length, 2);
    // Compared against a snapshot taken before the redelivery, not against the first delivery
    // object: the coordinator hands back the same immutable Activation, so comparing it with itself
    // would assert nothing. This compares content that was captured while only one send had
    // happened, which is what "the Runtime is handed the identical exchange" actually means.
    assert.deepEqual(JSON.parse(JSON.stringify(driver.seen[1])), firstDelivery);
    assert.deepEqual(driver.seen[1]?.events.map((event) => event.eventId), [created.initialEventId]);

    // And the exchange really is immutable: a Driver cannot edit what it was handed.
    assert.throws(() => {
      (driver.seen[0] as { activationId: string }).activationId = "activation-forged";
    }, TypeError);
    assert.throws(() => {
      (driver.seen[0]?.events[0] as { kind: string }).kind = "forged";
    }, TypeError);

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.batch, [created.initialEventId]);
    assert.deepEqual(view.queued, [created.initialEventId, ...late], "the late Event is queued and waiting for a later exchange");
    assert.deepEqual(view.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null },
      { attempt: 2, status: "delivered", failure: null },
    ]);
  });

  test("redelivery is refused when there is no unresolved exchange", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);

    assert.equal(refused(kernel.redeliver(author, created.executionId)).classification, "no_unresolved_exchange");

    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    accepted(kernel.cancelExecution(author, created.executionId));
    assert.equal(
      refused(kernel.redeliver(author, created.executionId)).classification,
      "no_unresolved_exchange",
      "a fenced exchange is not redelivered",
    );
  });

  test("redelivering an invisible Execution answers as an unknown one", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const outsider = caller("app-c", "tenant-c");

    const hidden = refused(kernel.redeliver(outsider, created.executionId));
    const missing = refused(kernel.redeliver(outsider, "execution-404"));
    assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 });
  });

  test("nothing in this packet advances a writer epoch", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.equal(accepted(kernel.redeliver(author, created.executionId)).writerEpoch, 1);
    }
    // The authorized takeover that does advance it is K1.2's, and this surface says so.
    assert.throws(() => kernel.requestTakeover(), /K1\.2 owns this surface/);
    assert.equal(accepted(kernel.inspect(author, created.executionId)).activation?.writerEpoch, 1);
  });
});
