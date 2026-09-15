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

import { ExecutionCoordinator, canonicalize } from "../src/index.ts";
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

  test("K11-R4-DISP-01 the batch bound is observed once: a 1,1,0 shifting getter selects the validated bound", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    withInputs(kernel, created.executionId, ["c1", "c2"]);

    // Caller-owned state: validates as 1, then shifts to 0 for selection. The old triple read
    // (`isInteger`, `< 1`, `slice`) accepted the request and reserved an empty prefix.
    let reads = 0;
    const shifting = {
      get bound(): number {
        reads += 1;
        return reads <= 2 ? 1 : 0;
      },
    };
    const result = accepted(kernel.dispatch(author, created.executionId, shifting as never));
    assert.equal(reads, 1, "one dispatch request has one observed batch bound");
    assert.deepEqual(result.batch, [created.initialEventId], "the exact value validated is the exact value used for selection");
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.batch, [created.initialEventId]);
  });

  test("K11-R4-DISP-01 validation uses the primordial integer test even if the observation pollutes it", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const realIsInteger = Number.isInteger;
    const shifting = {
      get bound(): unknown {
        (Number as unknown as Record<string, unknown>).isInteger = () => true;
        return "2";
      },
    };
    let result: ReturnType<typeof kernel.dispatch>;
    try {
      result = kernel.dispatch(author, created.executionId, shifting as never);
    } finally {
      (Number as unknown as Record<string, unknown>).isInteger = realIsInteger;
    }
    assert.equal(result!.ok, false, "a non-integer bound is refused despite the polluted validator");
    assert.equal(!result!.ok && result!.error.classification, "invalid_batch_bound");
    assert.equal(accepted(kernel.inspect(author, created.executionId)).state, "READY", "and no exchange was opened");
  });

  test("K11-R4-DISP-01 a non-object envelope is refused as an invalid bound, not thrown out of the boundary", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    for (const options of [null, undefined, 3, "1"]) {
      const result = kernel.dispatch(author, created.executionId, options as never);
      assert.equal(result.ok, false, `${String(options)} is refused`);
      assert.equal(!result.ok && result.error.classification, "invalid_batch_bound");
    }
    assert.equal(accepted(kernel.inspect(author, created.executionId)).state, "READY", "and no exchange was opened");
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

  test("an invisible Execution is not dispatched", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const outsider = caller("app-c", "tenant-c");

    const hidden = refused(kernel.dispatch(outsider, created.executionId, { bound: 1 }));
    const missing = refused(kernel.dispatch(outsider, "execution-404", { bound: 1 }));
    assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 });

    // K11-R1-SCOPE-01: dispatch to a terminal destination remains refused with
    // `terminal_destination`, but no terminal state is reachable in K1.1 — manufacturing one
    // via cancellation is K1.3's. The rule is specified and the check remains in `dispatch`;
    // its live-terminal exercise awaits K1.3 rather than a K1.1-constructed terminal.
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

  test("K11-R1-VAL-01 Activation construction and redelivery carry the sealed structural value", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const payload = JSON.parse('{"__proto__":{"x":1},"safe":2}') as Record<string, unknown>;
    const created = accepted(
      kernel.createExecution(author, createRequest({ initialInput: { kind: "application.request", payload: payload as never } })),
    );
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));

    const carried = driver.seen[0]?.events[0]?.payload as Record<string, unknown>;
    assert.ok(Object.prototype.hasOwnProperty.call(carried, "__proto__"), "Activation carries the own member");
    assert.deepEqual(carried["__proto__"], { x: 1 });

    accepted(kernel.redeliver(author, created.executionId));
    const recarried = driver.seen[1]?.events[0]?.payload as Record<string, unknown>;
    assert.ok(Object.prototype.hasOwnProperty.call(recarried, "__proto__"));
    assert.deepEqual(recarried, carried);
    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)).mailbox[0]?.payload, carried);
  });

  test("K11-R2-VAL-02 the Activation, redelivery and inspection carry the one value identity described", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const payload = { list: [1, [2, { deep: null }]], safe: "yes" };
    const context = { tenant: "a", nested: { flags: [true, false] } };
    const created = accepted(
      kernel.createExecution(
        author,
        createRequest({ authorityContext: context, initialInput: { kind: "application.request", payload } }),
      ),
    );
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    accepted(kernel.redeliver(author, created.executionId));

    const bound = canonicalize(payload);
    const boundContext = canonicalize(context);
    assert.ok(bound.ok && boundContext.ok);

    const first = driver.seen[0];
    const second = driver.seen[1];
    const inspected = accepted(kernel.inspect(author, created.executionId));

    // Every projection of the accepted value is the same object, and that object is what the
    // canonical bytes identity was taken from. A projection that re-derived the value from the
    // caller's own object - which is what three separate passes amounted to - could differ here.
    assert.equal(second, first, "ordinary redelivery re-sends the same frozen Activation");
    assert.equal(first?.events[0]?.payload, inspected.mailbox[0]?.payload, "one retained structure, not two copies");
    assert.equal(first?.executionView, inspected.authorityContext);

    for (const projection of [first?.events[0]?.payload, inspected.mailbox[0]?.payload]) {
      const again = canonicalize(projection);
      assert.ok(again.ok);
      assert.equal(again.value.canonical, bound.value.canonical);
    }
    const contextAgain = canonicalize(first?.executionView);
    assert.ok(contextAgain.ok);
    assert.equal(contextAgain.value.canonical, boundContext.value.canonical);
  });

  test("K11-R2-VAL-02 a payload with no single reading never reaches a Driver", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const payload = new Proxy([1], {
      get(inner, property, receiver): unknown {
        if (property === "0") return 2;
        return Reflect.get(inner, property, receiver);
      },
    });
    const refusal = refused(
      kernel.createExecution(author, createRequest({ initialInput: { kind: "k", payload: payload as never } })),
    );
    assert.equal(refusal.classification, "malformed_value");
    assert.deepEqual(driver.seen, [], "no Activation was built from a value with two readings");
  });

  test("K11-R2-VAL-02 Activation, redelivery and inspection carry exactly the value whose bytes were bound", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const realKeys = Object.keys;
    // The initial input reads coherently while installing the review-04 replacement. Creation,
    // dispatch, redelivery and inspection must then all agree on `{a:1}` with bytes `{"a":1}`.
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Object as unknown as Record<string, unknown>).keys = () => [];
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    let created: { executionId: string; initialEventId: string };
    try {
      created = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "ambient-keys-dispatch", initialInput: { kind: "k", payload: sneaky as never } }),
        ),
      );
    } finally {
      Object.keys = realKeys;
    }
    accepted(kernel.dispatch(author, created!.executionId, { bound: 1 }));
    const redelivered = accepted(kernel.redeliver(author, created!.executionId));
    assert.equal(redelivered.redelivered, true);

    const first = driver.seen[0];
    const second = driver.seen[1];
    const inspected = accepted(kernel.inspect(author, created!.executionId));
    assert.equal(second, first, "redelivery re-sends the same Activation object");
    assert.deepEqual(first?.events[0]?.payload, { a: 1 }, "the Activation carries the retained snapshot, not {}");
    assert.equal(first?.events[0]?.payload, inspected.mailbox[0]?.payload, "Activation and inspection share the one retained structure");
    assert.deepEqual(redelivered.batch, [created!.initialEventId]);
    for (const projection of [first?.events[0]?.payload, inspected.mailbox[0]?.payload]) {
      const again = canonicalize(projection);
      assert.ok(again.ok);
      assert.equal(again.value.canonical, '{"a":1}', "every projection re-canonicalizes to the bytes that bound it");
    }
  });

  test("K11-R5-STATE-01 a capture-time Object.freeze replacement cannot leave the Activation mutable", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const realFreeze = Object.freeze;
    // The input reads coherently while disabling the operation a later dispatch uses to seal its
    // exchange. Identity is correct — what is under test is that the Activation handed to the
    // Driver is actually immutable.
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Object as unknown as Record<string, unknown>).freeze = (value: unknown) => value;
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    let created: { executionId: string; initialEventId: string };
    try {
      created = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "state-freeze", initialInput: { kind: "k", payload: sneaky as never } }),
        ),
      );
      assert.notEqual(Object.freeze, realFreeze, "the replacement was live across the boundary call");
      // The replacement stays live through the later dispatch below: the review witness requires
      // the Activation sealed *after* the pollution, not after a cleanup.
      accepted(kernel.dispatch(author, created!.executionId, { bound: 1 }));
      const activation = driver.seen[0];
      assert.ok(activation, "the Driver received the exchange");
      assert.ok(Object.isFrozen(activation), "the Activation itself is frozen");
      assert.ok(Object.isFrozen(activation!.events), "its Event batch is frozen");
      assert.ok(Object.isFrozen(activation!.events[0]), "each carried Event is frozen");
      assert.throws(() => {
        (activation as unknown as { activationId: string }).activationId = "activation-forged";
      }, TypeError);
      assert.throws(() => {
        (activation!.events[0] as unknown as { kind: string }).kind = "forged";
      }, TypeError);
      // Redelivery therefore re-sends an exchange no Driver mutation could have altered.
      accepted(kernel.redeliver(author, created!.executionId));
      assert.equal(driver.seen[1], activation, "redelivery re-sends the same frozen Activation");
      assert.deepEqual(accepted(kernel.inspect(author, created!.executionId)).mailbox[0]?.payload, { a: 1 });
    } finally {
      (Object as unknown as Record<string, unknown>).freeze = realFreeze;
    }
  });

  test("K11-R2-VAL-02 Activation, redelivery and inspection agree under ambient toJSON pollution", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const previous = (Object.prototype as Record<string, unknown>).toJSON;
    (Object.prototype as Record<string, unknown>).toJSON = () => 42;
    try {
      const created = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "ambient-dispatch", initialInput: { kind: "k", payload: { a: 1 } as never } }),
        ),
      );
      accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
      const redelivered = accepted(kernel.redeliver(author, created.executionId));
      assert.equal(redelivered.redelivered, true);
      const first = driver.seen[0];
      const second = driver.seen[1];
      const inspected = accepted(kernel.inspect(author, created.executionId));
      assert.equal(second, first, "redelivery re-sends the same Activation object");
      assert.deepEqual(first?.events[0]?.payload, { a: 1 });
      assert.equal(first?.events[0]?.payload, inspected.mailbox[0]?.payload, "Activation and inspection share the retained structure");
      const again = canonicalize(first?.events[0]?.payload);
      assert.ok(again.ok);
      assert.equal(again.value.canonical, '{"a":1}', "identity still describes the retained payload, not 42");
    } finally {
      if (previous === undefined) delete (Object.prototype as Record<string, unknown>).toJSON;
      else (Object.prototype as Record<string, unknown>).toJSON = previous;
    }
  });
});
