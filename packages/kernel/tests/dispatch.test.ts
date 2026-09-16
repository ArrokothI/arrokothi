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
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ExecutionCoordinator, canonicalize } from "../src/index.ts";
import type { DeliverySettlement, DispatchOptions, ExecutionDriver } from "../src/index.ts";
import {
  accepted,
  asyncFailingDriver,
  caller,
  createRequest,
  delayedDriver,
  descriptorConversionIsHostile,
  failingDriver,
  inheritedIndexIsLive,
  iteratorNextIsHostile,
  polluteDescriptorFields,
  polluteDescriptorGetter,
  polluteIteratorNext,
  polluteObjectSpecies,
  pollutePromiseConstructor,
  pollutePromiseSpecies,
  promiseSpeciesIsHostile,
  recordingDriver,
  refused,
  throwingDriver,
  trapInheritedIndices,
  type DescriptorPollution,
  type InheritedIndexTrap,
  type SpeciesPollution,
} from "./harness.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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
    // K11-R12-ID-01: unmasked — a refusal naming no Execution must be identical, position included.
    assert.deepEqual({ ...hidden }, { ...missing });
    assert.equal(hidden.position, 0);

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
    // A thrown Error object is not a primitive string, so the total diagnostic collapses to
    // the fixed text rather than reading `message` (KC1-ARCH-1).
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "failed", failure: "Driver delivery failed" }]);
  });

  test("a Driver that reports failure records an operational failure, not a state change", () => {
    const kernel = new ExecutionCoordinator({ driver: failingDriver() });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING", "a lost send does not resolve the exchange");
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "failed", failure: "native submit lost" }]);
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
        deliver(activation, settlement): undefined {
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
    // The Driver's report for `slow` is outstanding right now: nothing has released it. If the
    // coordinator waited for delivery work, this next call could not have returned at all.
    const otherDispatch = accepted(kernel.dispatch(author, other.executionId, { bound: 1 }));

    assert.notEqual(otherDispatch.activationId, slowDispatch.activationId);
    assert.deepEqual(driver.seen.map((activation) => activation.executionId), [slow.executionId, other.executionId]);
    assert.equal(accepted(kernel.inspect(author, slow.executionId)).activation?.deliveries[0]?.status, "pending");
    assert.equal(accepted(kernel.inspect(author, other.executionId)).state, "RUNNING");

    driver.release();
  });

  test("dispatch returns while the report is outstanding; a later report settles it", () => {
    const driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = started(kernel);

    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.equal(
      accepted(kernel.inspect(author, created.executionId)).activation?.deliveries[0]?.status,
      "pending",
      "no report yet, so the attempt is still outstanding",
    );

    driver.release();
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
    // K11-R12-ID-01: unmasked — see the dispatch case above.
    assert.deepEqual({ ...hidden }, { ...missing });
    assert.equal(hidden.position, 0);
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

describe("K11-R6-STATE-02 batch reservation is own data, not an ambient write", () => {
  /**
   * The counterexample needs no boundary value at all.
   *
   * `dispatch`'s `options` envelope is caller-owned state, and the `bound` getter runs inside the
   * boundary call. A getter that returns a perfectly valid `1` and installs an inherited setter at
   * `Array.prototype["0"]` leaves the selection loop's ordinary write with nowhere to land: the
   * setter receives it, no element is created, `selected.length` stays at zero, and the Kernel
   * accepts a dispatch intent whose reserved batch is empty while a queued Event was available
   * under the bound it had just validated. That is a different defect from the round-5 shifting
   * getter (which was fixed by observing the bound once) and it survives every captured-method
   * hardening, because the defect is in `[[Set]]` rather than in which function performs it.
   */
  const trappingOptions = (bound: number, indices: readonly string[], onInstall: (trap: InheritedIndexTrap) => void): DispatchOptions => {
    // Installed at most once even if the envelope is read more than once. A correct implementation
    // observes `bound` exactly once (K11-R4-DISP-01), but this fixture must not leave a stacked,
    // partly-restorable accessor on `Array.prototype` when it is run against an implementation that
    // does not — which is exactly what an ablation of that earlier fix produces.
    let installed: InheritedIndexTrap | undefined;
    return {
      get bound(): number {
        if (installed === undefined) {
          installed = trapInheritedIndices(indices);
          onInstall(installed);
        }
        return bound;
      },
    } as DispatchOptions;
  };

  test("a bound getter that installs Array.prototype[\"0\"] still reserves the exact available prefix", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const author = caller("app-a", "tenant-a");
    const created = accepted(kernel.createExecution(author, createRequest()));
    const second = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "later", kind: "k", payload: { n: 2 } }),
    );

    let trap: InheritedIndexTrap | undefined;
    let liveAcrossTheCall = false;
    let dispatched: ReturnType<typeof accepted<{ batch: readonly string[]; activationId: string }>>;
    try {
      dispatched = accepted(
        kernel.dispatch(
          author,
          created.executionId,
          trappingOptions(1, ["0", "1"], (installed) => {
            trap = installed;
          }),
        ),
      ) as { batch: readonly string[]; activationId: string };
      liveAcrossTheCall = inheritedIndexIsLive(0);
    } finally {
      trap?.restore();
    }

    // Not vacuous: the setter really was installed for the whole boundary call, and it really did
    // swallow the test's own ordinary write — it simply never saw one from the Kernel.
    assert.equal(liveAcrossTheCall, true, "the inherited setter was live across the dispatch call");
    assert.deepEqual(trap!.swallowed, ["control-write"], "only the probe reached the setter; no Kernel element did");

    assert.deepEqual(dispatched!.batch, [created.initialEventId], "the exact acceptance-order prefix under bound 1");
    assert.equal(driver.seen.length, 1);
    assert.deepEqual(
      driver.seen[0]!.events.map((event) => event.eventId),
      [created.initialEventId],
      "the Activation carries the reserved batch, not an empty one",
    );

    // Reservation acknowledged nothing, and the Event accepted before it that the bound excluded is
    // still queued and still out of the batch.
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING");
    assert.deepEqual(view.activation?.batch, [created.initialEventId]);
    assert.deepEqual(view.queued, [created.initialEventId, second.eventId]);
    assert.deepEqual(
      view.mailbox.map((entry) => entry.reserved),
      [true, false],
    );
  });

  test("the same trap at every reserved index cannot shorten a larger batch either", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const author = caller("app-a", "tenant-a");
    const created = accepted(kernel.createExecution(author, createRequest()));
    const second = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "b", kind: "k", payload: { n: 2 } }),
    );
    const third = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "c", kind: "k", payload: { n: 3 } }),
    );

    let trap: InheritedIndexTrap | undefined;
    let dispatched: { batch: readonly string[] };
    try {
      dispatched = accepted(
        kernel.dispatch(
          author,
          created.executionId,
          trappingOptions(3, ["0", "1", "2"], (installed) => {
            trap = installed;
          }),
        ),
      ) as { batch: readonly string[] };
      assert.equal(inheritedIndexIsLive(2), true, "the trap covered every position the batch needed");
    } finally {
      trap?.restore();
    }

    assert.deepEqual(dispatched!.batch, [created.initialEventId, second.eventId, third.eventId]);
    assert.deepEqual(
      driver.seen[0]!.events.map((event) => event.eventId),
      [created.initialEventId, second.eventId, third.eventId],
    );
    // The carried Events are the accepted content, not the getter's substitute.
    assert.deepEqual(
      driver.seen[0]!.events.map((event) => event.payload),
      [{ text: "report for week 37" }, { n: 2 }, { n: 3 }],
    );
    // Redelivery re-sends that same exchange, so a batch built under the trap survives it.
    const again = accepted(kernel.redeliver(author, created.executionId));
    assert.deepEqual(again.batch, dispatched!.batch);
    assert.equal(driver.seen[1], driver.seen[0], "the same frozen Activation object, not a rebuild");
  });
});

describe("K11-R7-STATE-03 dispatch under inherited descriptor-field pollution", () => {
  /**
   * The review's witness is not another indexed `[[Set]]` problem. H9's `defineAt` calls the
   * captured `Object.defineProperty`, but the descriptor it passes is an ordinary object, so
   * `ToPropertyDescriptor` reads inherited `get`/`set` fields before the target's
   * `[[DefineOwnProperty]]` runs. A valid `bound` getter installs that pollution and returns `1`;
   * the batch selection then throws a raw ambient `TypeError` instead of producing the
   * contract-defined dispatch decision.
   *
   * These cases treat that witness as one member of the class: every installation below returns an
   * otherwise valid bound, and each asserts the whole observable result — one observation, the
   * accepted batch, Driver delivery, inspection, and exact host restoration.
   */
  const descriptorTrappingOptions = (
    bound: number,
    install: () => DescriptorPollution,
    onPollution: (pollution: DescriptorPollution) => void,
    reads: { count: number },
  ): DispatchOptions => {
    let installed: DescriptorPollution | undefined;
    return {
      get bound(): number {
        reads.count += 1;
        if (installed === undefined) {
          installed = install();
          onPollution(installed);
        }
        return bound;
      },
    } as DispatchOptions;
  };

  test("a bound getter that installs Object.prototype.get still reserves the exact prefix", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const second = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "later", kind: "k", payload: { n: 2 } }),
    );

    const reads = { count: 0 };
    let pollution: DescriptorPollution | undefined;
    let hostileAcrossTheCall = false;
    let dispatched: { batch: readonly string[]; receipt: { boundary: string }; writerEpoch: number; redelivered: boolean };
    try {
      dispatched = accepted(
        kernel.dispatch(
          author,
          created.executionId,
          descriptorTrappingOptions(
            1,
            () => polluteDescriptorFields({ get: 1 }),
            (installed) => {
              pollution = installed;
            },
            reads,
          ),
        ),
      ) as { batch: readonly string[]; receipt: { boundary: string }; writerEpoch: number; redelivered: boolean };
      hostileAcrossTheCall = descriptorConversionIsHostile();
    } finally {
      pollution?.restore();
    }

    // Not vacuous: the bound was observed exactly once, and ordinary descriptor conversion really
    // did throw for the whole boundary call — the Kernel simply never performs one.
    assert.equal(reads.count, 1, "the validated bound is the one observation");
    assert.equal(hostileAcrossTheCall, true, "conversion was hostile while the Kernel committed");

    assert.deepEqual(dispatched!.batch, [created.initialEventId], "the exact acceptance-order prefix under bound 1");
    assert.equal(dispatched!.receipt.boundary, "dispatch_intent");
    assert.equal(dispatched!.writerEpoch, 1);
    assert.equal(dispatched!.redelivered, false);
    assert.equal(driver.seen.length, 1);
    assert.deepEqual(
      driver.seen[0]!.events.map((event) => event.eventId),
      [created.initialEventId],
      "the Activation carries the reserved batch, not a steered one",
    );

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING");
    assert.deepEqual(view.activation?.batch, [created.initialEventId]);
    assert.deepEqual(view.queued, [created.initialEventId, second.eventId]);
    assert.deepEqual(
      view.mailbox.map((entry) => entry.reserved),
      [true, false],
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(Object.prototype, "get"),
      false,
      "the test's own pollution left nothing behind",
    );
  });

  test("an installed Object.prototype.set cannot shorten a larger batch, and redelivery keeps it", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const second = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "b", kind: "k", payload: { n: 2 } }),
    );

    const reads = { count: 0 };
    let pollution: DescriptorPollution | undefined;
    let dispatched: { batch: readonly string[] };
    try {
      dispatched = accepted(
        kernel.dispatch(
          author,
          created.executionId,
          descriptorTrappingOptions(
            2,
            () => polluteDescriptorFields({ set: () => {} }),
            (installed) => {
              pollution = installed;
            },
            reads,
          ),
        ),
      ) as { batch: readonly string[] };
      assert.equal(descriptorConversionIsHostile(), true, "the set field was hostile across the call");
    } finally {
      pollution?.restore();
    }

    assert.equal(reads.count, 1);
    assert.deepEqual(dispatched!.batch, [created.initialEventId, second.eventId]);
    assert.deepEqual(
      driver.seen[0]!.events.map((event) => event.eventId),
      [created.initialEventId, second.eventId],
    );
    const again = accepted(kernel.redeliver(author, created.executionId));
    assert.deepEqual(again.batch, dispatched!.batch, "redelivery re-sends the retained batch, not a reselection");
    assert.equal(driver.seen[1], driver.seen[0], "the same frozen Activation object, not a rebuild");
    assert.equal(
      Object.prototype.hasOwnProperty.call(Object.prototype, "set"),
      false,
      "the test's own pollution left nothing behind",
    );
  });

  test("an inherited descriptor getter runs zero times inside the hardened operation", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));

    const observed = { count: 0 };
    const reads = { count: 0 };
    let pollution: DescriptorPollution | undefined;
    let dispatched: { batch: readonly string[] };
    try {
      dispatched = accepted(
        kernel.dispatch(
          author,
          created.executionId,
          descriptorTrappingOptions(
            1,
            () => polluteDescriptorGetter("get", observed),
            (installed) => {
              pollution = installed;
            },
            reads,
          ),
        ),
      ) as { batch: readonly string[] };
      // The installation itself converts only a null-prototype descriptor, so it cannot have run
      // the getter; if the Kernel then consulted the prototype at any point, the count would move.
      assert.equal(observed.count, 0, "no Kernel definition consulted the polluted prototype");
      assert.equal(descriptorConversionIsHostile(), true, "the getter field was hostile across the call");
    } finally {
      pollution?.restore();
    }

    assert.equal(reads.count, 1);
    assert.deepEqual(dispatched!.batch, [created.initialEventId]);
    assert.equal(driver.seen.length, 1);
    assert.equal(
      Object.prototype.hasOwnProperty.call(Object.prototype, "get"),
      false,
      "the test's own pollution left nothing behind",
    );
  });

  test("descriptor pollution and an inherited indexed trap together still commit the exact batch", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));

    const reads = { count: 0 };
    let pollution: DescriptorPollution | undefined;
    let trap: InheritedIndexTrap | undefined;
    let installed = false;
    const options = {
      get bound(): number {
        reads.count += 1;
        if (!installed) {
          installed = true;
          pollution = polluteDescriptorFields({ get: 1, set: () => {} });
          trap = trapInheritedIndices(["0", "1"]);
        }
        return 1;
      },
    } as DispatchOptions;

    let dispatched: { batch: readonly string[] };
    try {
      dispatched = accepted(kernel.dispatch(author, created.executionId, options)) as { batch: readonly string[] };
      assert.equal(descriptorConversionIsHostile(), true, "descriptor conversion was hostile across the call");
      assert.equal(inheritedIndexIsLive(0), true, "the indexed trap was live across the call");
    } finally {
      // Pollution first: a weakened restore reads the saved descriptor through live ambient state.
      pollution?.restore();
      trap?.restore();
    }

    assert.equal(reads.count, 1);
    assert.deepEqual(trap!.swallowed, ["control-write"], "only the probe reached the setter; no Kernel element did");
    assert.deepEqual(dispatched!.batch, [created.initialEventId]);
    assert.deepEqual(
      driver.seen[0]!.events.map((event) => event.eventId),
      [created.initialEventId],
    );
  });
});

describe("K11-R16-VAL-01 dispatch and redelivery project the snapshot while the iterator next is hostile", () => {
  // Oracle discipline as in the values suite: `assert.equal` with indexed reads only while the
  // hostile `next` is installed (`assert.ok` delegates through a rest-args spread and any
  // destructuring, `for...of` or spread would itself iterate through the hostile method).
  test("batch, Activation payload and redelivery are stable under an omit-all next", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = started(kernel);
    const second = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "k2", kind: "application.correction", payload: { k: "k2" } }),
    );

    const pollution = polluteIteratorNext(() => ({ done: true }));
    try {
      assert.equal(iteratorNextIsHostile(), true, "omit-all next live across these calls");

      const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));
      assert.equal(dispatched.batch.length, 2);
      assert.equal(dispatched.batch[0], created.initialEventId);
      assert.equal(dispatched.batch[1], second.eventId);
      assert.equal(dispatched.writerEpoch, 1);
      assert.equal(dispatched.receipt.boundary, "dispatch_intent");

      const carried = driver.seen[0]?.events;
      assert.equal(carried === undefined, false);
      assert.equal(carried?.length, 2);
      assert.equal(carried?.[0]?.eventId, created.initialEventId);
      assert.equal(carried?.[1]?.eventId, second.eventId);
      assert.equal((carried?.[1]?.payload as { k?: unknown }).k, "k2", "the Activation carries the retained payload");

      const late = accepted(
        kernel.submitInput(author, { destination: created.executionId, requestKey: "k3", kind: "application.correction", payload: { k: "k3" } }),
      );
      const redelivered = accepted(kernel.redeliver(author, created.executionId));
      assert.equal(redelivered.redelivered, true);
      assert.equal(redelivered.batch.length, 2);
      assert.equal(redelivered.batch[0], created.initialEventId);
      assert.equal(redelivered.batch[1], second.eventId, "the late arrival stays out of the reserved batch");
      assert.equal(late.replayed, false);
    } finally {
      pollution.restore();
    }
  });
});

describe("KC1-ARCH-1 Kernel-owned delivery reporting (decision-01)", () => {
  /**
   * Decision-01 (KC1-ARCH-1) removes Driver-returned Promise observation: `deliver` receives a
   * Kernel-created reporting capability and returns only `undefined`. Returning normally is not
   * an acknowledgment — only an explicit `delivered()`/`failed()` report settles the attempt.
   * The Kernel never reads, classifies, assimilates, or subscribes to the return value, creates
   * no Promise on this path, and performs no Promise constructor/species sanitization. The
   * Driver owns its asynchronous work and handles its own internal rejections.
   *
   * H1's counted-unhandled oracle (`unhandled.length === 1`) is removed with the path it
   * belonged to. An inert hostile return object proves non-observation without manufacturing an
   * unrelated unhandled promise; Driver-internal rejection handling is proved separately by a
   * conforming async fake under strict rejection handling.
   */
  const drain = async (): Promise<void> => {
    await settle();
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  };

  test("report during invocation settles the attempt with intent intact", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const result = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING", "a report changes no accepted state");
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "delivered", failure: null }]);
    assert.equal(view.activation?.receipt.token, result.receipt.token, "the intent receipt is intact");
    assert.deepEqual(view.activation?.batch, [created.initialEventId], "the reserved batch is intact");
    assert.deepEqual(view.acknowledged, [], "a report acknowledges nothing");
  });

  test("delayed or absent report leaves the attempt pending without blocking others", () => {
    const driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const slow = started(kernel, "slow");
    const other = started(kernel, "other");

    accepted(kernel.dispatch(author, slow.executionId, { bound: 1 }));
    assert.equal(
      accepted(kernel.inspect(author, slow.executionId)).activation?.deliveries[0]?.status,
      "pending",
      "no report yet",
    );
    // Another Execution dispatches while the first report is outstanding.
    accepted(kernel.dispatch(author, other.executionId, { bound: 1 }));
    assert.equal(accepted(kernel.inspect(author, other.executionId)).state, "RUNNING");

    driver.release();
    assert.equal(accepted(kernel.inspect(author, slow.executionId)).activation?.deliveries[0]?.status, "delivered");
    assert.equal(accepted(kernel.inspect(author, other.executionId)).activation?.deliveries[0]?.status, "delivered");
  });

  test("synchronous throw is an implicit failure report with a total diagnostic", () => {
    const kernel = new ExecutionCoordinator({ driver: throwingDriver() });
    const created = started(kernel);
    const result = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "RUNNING");
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "failed", failure: "Driver delivery failed" }]);
    assert.equal(view.activation?.receipt.token, result.receipt.token);
    assert.deepEqual(view.activation?.batch, [created.initialEventId]);
    assert.deepEqual(view.acknowledged, []);
  });

  test("a report followed by a throw retains the report", () => {
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-report-then-throw",
        deliver(_activation, settlement): undefined {
          settlement.delivered();
          throw new Error("late throw");
        },
      },
    });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "delivered", failure: null }]);
  });

  test("a throw followed by a late report retains the failure", () => {
    let captured: DeliverySettlement | null = null;
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-throw-then-late",
        deliver(_activation, settlement): undefined {
          captured = settlement;
          throw new Error("early throw");
        },
      },
    });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.ok(captured !== null, "the capability was supplied before the throw");
    (captured as DeliverySettlement).delivered();
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "failed", failure: "Driver delivery failed" }]);
  });

  test("duplicate and conflicting reports are inert after the first", () => {
    const settlements: DeliverySettlement[] = [];
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-manual",
        deliver(_activation, settlement): undefined {
          settlements.push(settlement);
          return undefined;
        },
      },
    });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const first = settlements[0] as DeliverySettlement;
    first.delivered();
    first.delivered();
    first.failed("late conflict");
    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)).activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null },
    ]);

    accepted(kernel.redeliver(author, created.executionId));
    const second = settlements[1] as DeliverySettlement;
    second.failed("first failure");
    second.delivered();
    second.failed("second failure");
    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)).activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null },
      { attempt: 2, status: "failed", failure: "first failure" },
    ]);
  });

  test("capability integrity: frozen, detached, and bound to its own attempt", () => {
    const settlements: DeliverySettlement[] = [];
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-capture",
        deliver(_activation, settlement): undefined {
          settlements.push(settlement);
          return undefined;
        },
      },
    });
    const first = started(kernel, "first");
    const second = started(kernel, "second");
    accepted(kernel.dispatch(author, first.executionId, { bound: 1 }));
    accepted(kernel.dispatch(author, second.executionId, { bound: 1 }));
    const sFirst = settlements[0] as DeliverySettlement;
    const sSecond = settlements[1] as DeliverySettlement;
    assert.equal(Object.isFrozen(sFirst), true, "the capability exposes no mutable record");
    assert.deepEqual(Object.keys(sFirst).sort(), ["delivered", "failed"]);
    // Detached methods work without a receiver.
    const detachedDeliver = sFirst.delivered;
    detachedDeliver();
    assert.equal(accepted(kernel.inspect(author, first.executionId)).activation?.deliveries[0]?.status, "delivered");
    assert.equal(
      accepted(kernel.inspect(author, second.executionId)).activation?.deliveries[0]?.status,
      "pending",
      "one Execution's report cannot settle another's attempt",
    );
    const detachedFail = sSecond.failed;
    detachedFail("second failed");
    assert.deepEqual(accepted(kernel.inspect(author, second.executionId)).activation?.deliveries, [
      { attempt: 1, status: "failed", failure: "second failed" },
    ]);
    assert.deepEqual(accepted(kernel.inspect(author, first.executionId)).activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null },
    ]);
  });

  test("hostile failure reasons are never invoked and stay bounded", () => {
    const calls = { toString: 0, valueOf: 0, then: 0 };
    const hostile = {};
    Object.defineProperty(hostile, "toString", {
      get() {
        calls.toString += 1;
        throw new Error("coerce");
      },
      configurable: true,
    });
    Object.defineProperty(hostile, "valueOf", {
      get() {
        calls.valueOf += 1;
        return 1;
      },
      configurable: true,
    });
    Object.defineProperty(hostile, "then", {
      get() {
        calls.then += 1;
        throw new Error("then");
      },
      configurable: true,
    });
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-hostile-reason",
        deliver(_activation, settlement): undefined {
          settlement.failed(hostile);
          return undefined;
        },
      },
    });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.deepEqual(calls, { toString: 0, valueOf: 0, then: 0 }, "no coercion, getter, or thenable ran");
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "failed", failure: "Driver delivery failed" }]);
    assert.deepEqual(
      accepted(kernel.inspect(author, created.executionId)).activation?.deliveries,
      view.activation?.deliveries,
      "the retained diagnostic is stable",
    );
  });

  test("a poisoned Error message is never read", () => {
    let messageReads = 0;
    const poisoned = new Error("unread");
    Object.defineProperty(poisoned, "message", {
      get(): never {
        messageReads += 1;
        throw new Error("message trap");
      },
      configurable: true,
    });
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-poisoned",
        deliver(_activation, settlement): undefined {
          settlement.failed(poisoned);
          return undefined;
        },
      },
    });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.equal(messageReads, 0, "the diagnostic never reads message");
    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)).activation?.deliveries, [
      { attempt: 1, status: "failed", failure: "Driver delivery failed" },
    ]);
  });

  test("revoked Proxy, symbol, function, and boxed-string reasons collapse to the fixed text", () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    const reasons: { name: string; reason: unknown }[] = [
      { name: "revoked proxy", reason: proxy },
      { name: "symbol", reason: Symbol("opaque") },
      { name: "function", reason: () => {} },
      { name: "number", reason: 42 },
      { name: "boxed string", reason: new String("boxed") },
      { name: "undefined", reason: undefined },
    ];
    for (const entry of reasons) {
      const kernel = new ExecutionCoordinator({
        driver: {
          driverId: "fake-exotic",
          deliver(_activation, settlement): undefined {
            settlement.failed(entry.reason);
            return undefined;
          },
        },
      });
      const created = started(kernel, `exotic ${entry.name}`);
      accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
      assert.deepEqual(
        accepted(kernel.inspect(author, created.executionId)).activation?.deliveries,
        [{ attempt: 1, status: "failed", failure: "Driver delivery failed" }],
        entry.name,
      );
    }
  });

  test("a primitive string reason is retained up to 1,024 code units", () => {
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-long",
        deliver(_activation, settlement): undefined {
          settlement.failed(`prefix-${"x".repeat(2000)}`);
          return undefined;
        },
      },
    });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const failure = accepted(kernel.inspect(author, created.executionId)).activation?.deliveries[0]?.failure as string;
    assert.equal(failure.length, 1_024);
    assert.equal(failure, `prefix-${"x".repeat(2000)}`.slice(0, 1_024));
  });

  test("redelivery overlap: out-of-order reports settle only their own attempts", () => {
    const settlements: DeliverySettlement[] = [];
    const seenIds: string[] = [];
    const kernel = new ExecutionCoordinator({
      driver: {
        driverId: "fake-overlap",
        deliver(activation, settlement): undefined {
          settlements.push(settlement);
          seenIds.push(activation.activationId);
          return undefined;
        },
      },
    });
    const created = started(kernel);
    const first = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const late = withInputs(kernel, created.executionId, ["late"]);
    const again = accepted(kernel.redeliver(author, created.executionId));
    assert.equal(again.activationId, first.activationId);
    assert.deepEqual(seenIds, [first.activationId, first.activationId], "redelivery carries the identical Activation");
    // The newer attempt reports first; the older attempt fails late.
    (settlements[1] as DeliverySettlement).delivered();
    (settlements[0] as DeliverySettlement).failed("late failure");
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.deliveries, [
      { attempt: 1, status: "failed", failure: "late failure" },
      { attempt: 2, status: "delivered", failure: null },
    ]);
    assert.equal(view.activation?.writerEpoch, 1, "reports never advance the epoch");
    assert.deepEqual(view.activation?.batch, [created.initialEventId], "nothing was re-selected");
    assert.deepEqual(view.queued, [created.initialEventId, late[0]]);
  });

  test("Promise independence: hostile ambient constructor/species slots change nothing", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const savedSpecies = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    const savedCtor = Object.getOwnPropertyDescriptor(Promise.prototype, "constructor");
    const savedShadow = Object.getOwnPropertyDescriptor(Object.prototype, Symbol.species);
    Object.defineProperty(Promise, Symbol.species, {
      configurable: true,
      get() {
        throw new Error("species boom");
      },
    });
    Object.defineProperty(Promise.prototype, "constructor", { value: 42, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(Object.prototype, Symbol.species, { value: {}, writable: true, enumerable: false, configurable: true });
    try {
      assert.equal(promiseSpeciesIsHostile(), true, "throwing species live across the calls");
      const result = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
      assert.equal(result.receipt.boundary, "dispatch_intent");
      const redelivered = accepted(kernel.redeliver(author, created.executionId));
      assert.equal(redelivered.redelivered, true);
      // The Kernel performed no sanitization: the hostile getter is still installed.
      assert.equal(typeof Object.getOwnPropertyDescriptor(Promise, Symbol.species)?.get, "function");
    } finally {
      if (savedSpecies === undefined) delete (Promise as unknown as Record<symbol, unknown>)[Symbol.species];
      else Object.defineProperty(Promise, Symbol.species, savedSpecies);
      if (savedCtor === undefined) delete (Promise.prototype as unknown as Record<string, unknown>)["constructor"];
      else Object.defineProperty(Promise.prototype, "constructor", savedCtor);
      if (savedShadow === undefined) delete (Object.prototype as unknown as Record<symbol, unknown>)[Symbol.species];
      else Object.defineProperty(Object.prototype, Symbol.species, savedShadow);
    }
    assert.equal(promiseSpeciesIsHostile(), false, "host state restored");
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.deliveries, [
      { attempt: 1, status: "delivered", failure: null },
      { attempt: 2, status: "delivered", failure: null },
    ]);
  });

  test("return misuse: an inert hostile return is never observed; the attempt stays pending", () => {
    let thenCalls = 0;
    const hostile = {};
    Object.defineProperty(hostile, "then", {
      get() {
        thenCalls += 1;
        throw new Error("then boom");
      },
      configurable: true,
    });
    const misuse = {
      driverId: "fake-return-misuse",
      deliver(): unknown {
        return hostile;
      },
    } as unknown as ExecutionDriver;
    const kernel = new ExecutionCoordinator({ driver: misuse });
    const created = started(kernel);
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.equal(thenCalls, 0, "no return-object property is read");
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.activation?.deliveries, [{ attempt: 1, status: "pending", failure: null }], "an absent explicit report remains pending");
    assert.equal(view.state, "RUNNING");
  });

  test("Driver-internal asynchronous failure reports with zero unhandled (strict subprocess)", async () => {
    const probe = `
      const { ExecutionCoordinator } = await import("./packages/kernel/src/index.ts");
      const harness = await import("./packages/kernel/tests/harness.ts");
      const unhandled = [];
      process.on("unhandledRejection", (reason) => unhandled.push(String(reason?.message ?? reason)));
      const kernel = new ExecutionCoordinator({ driver: harness.asyncFailingDriver("async lost") });
      const author = harness.caller("app-a", "tenant-a");
      const created = kernel.createExecution(author, harness.createRequest());
      if (!created.ok) { console.log("SETUP FAILED"); process.exit(2); }
      const first = kernel.dispatch(author, created.value.executionId, { bound: 1 });
      if (!first.ok) { console.log("DISPATCH REFUSED"); process.exit(3); }
      const again = kernel.redeliver(author, created.value.executionId);
      if (!again.ok) { console.log("REDELIVER REFUSED"); process.exit(4); }
      await new Promise((resolve) => setTimeout(resolve, 150));
      const view = kernel.inspect(author, created.value.executionId);
      console.log(JSON.stringify({
        unhandled: unhandled.length,
        state: view.ok ? view.value.state : "missing",
        activationId: view.ok && view.value.activation !== null ? view.value.activation.activationId : null,
        batch: view.ok && view.value.activation !== null ? view.value.activation.batch : null,
        deliveries: view.ok && view.value.activation !== null ? view.value.activation.deliveries : null,
        acknowledged: view.ok ? view.value.acknowledged : null,
      }));
    `;
    const result = execFileSync(
      process.execPath,
      ["--unhandled-rejections=strict", "--experimental-strip-types", "--input-type=module", "-e", probe],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    // The drain helper above keeps this test's async shape honest for the in-process cases; the
    // strict oracle itself runs in the child.
    await drain();
    const observed = JSON.parse(result.trim().split("\n").pop() as string) as {
      unhandled: number;
      state: string;
      activationId: string;
      batch: string[] | null;
      deliveries: { attempt: number; status: string; failure: string | null }[] | null;
      acknowledged: unknown[];
    };
    assert.equal(observed.unhandled, 0, "the conforming Driver handled its own rejection on both attempts");
    assert.equal(observed.state, "RUNNING", "reports change no accepted state");
    assert.deepEqual(observed.deliveries, [
      { attempt: 1, status: "failed", failure: "Driver delivery failed" },
      { attempt: 2, status: "failed", failure: "Driver delivery failed" },
    ]);
    assert.equal((observed.batch ?? []).length, 1, "the reserved batch is intact");
    assert.deepEqual(observed.acknowledged, [], "a failure acknowledges nothing");
  });

  test("type boundary: an async deliver is not assignable; a sync undefined deliver compiles", () => {
    const good: ExecutionDriver = {
      driverId: "fake-type-good",
      deliver(_activation, settlement): undefined {
        settlement.delivered();
        return undefined;
      },
    };
    assert.equal(good.driverId, "fake-type-good");
    // @ts-expect-error an async deliver returns a Promise, not undefined
    const _bad: ExecutionDriver = { driverId: "fake-type-bad", deliver: async () => {} };
    assert.ok(true, "the misuse above must fail typecheck");
  });
});

describe("K11-R16-ID-01 (R3) ambient prototype state cannot answer a missing bound", () => {
  // Same family as the creation-side R3 cases: the bound observation is own-only, so ambient
  // `Object.prototype` state, an `Array.prototype`-chain answer for an array envelope, or an
  // inherited-only bound all read as missing and refuse — never as an acceptance.
  test("an ambient Object.prototype bound cannot dispatch an empty envelope", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = started(kernel);
    (Object.prototype as Record<string, unknown>).bound = 1;
    try {
      const refusal = refused(kernel.dispatch(author, created.executionId, {} as DispatchOptions));
      assert.equal(refusal.classification, "invalid_batch_bound");
      assert.equal(driver.seen.length, 0, "nothing was sent behind the refusal");
    } finally {
      delete (Object.prototype as Record<string, unknown>).bound;
    }
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.deepEqual(dispatched.batch, [created.initialEventId], "a literal bound still dispatches");
  });

  test("an array envelope cannot inherit its bound through the Array.prototype chain", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = started(kernel);
    Object.defineProperty(Array.prototype, "bound", { value: 1, writable: true, enumerable: false, configurable: true });
    try {
      const refusal = refused(kernel.dispatch(author, created.executionId, [] as never));
      assert.equal(refusal.classification, "invalid_batch_bound");
      assert.equal(driver.seen.length, 0);
    } finally {
      delete (Array.prototype as unknown as Record<string, unknown>).bound;
    }
    assert.equal(Object.getOwnPropertyDescriptor(Array.prototype, "bound"), undefined, "chain handed back exactly");
  });

  test("a bound carried only by inheritance reads as missing", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = started(kernel);
    const refusal = refused(kernel.dispatch(author, created.executionId, Object.create({ bound: 1 }) as DispatchOptions));
    assert.equal(refusal.classification, "invalid_batch_bound");
  });
});
