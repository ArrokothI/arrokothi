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
import type { DispatchOptions } from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  delayedDriver,
  descriptorConversionIsHostile,
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
  rejectingDriver,
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

describe("K11-R16-DISP-01 delivery observes rejection under hostile Promise machinery", () => {
  /**
   * Capturing `Promise.resolve`/`Promise.prototype.then` is not the whole observation: a native
   * `then` runs `SpeciesConstructor` before attaching continuations, so a throwing
   * `Promise[Symbol.species]` getter installed by an earlier caller observation makes the attach
   * itself throw before the rejection handler exists — and the already-rejected Driver promise
   * escapes as process-level unhandled rejection. The delivery window reinstalls the primordial
   * construction slots for the synchronous attach and hands them back afterwards.
   *
   * Test discipline: `await` itself depends on the species machinery, so no `await` may run while
   * the throwing species is installed. Each case dispatches synchronously under pollution,
   * restores host state, and only then drains microtasks and asserts. The attach under test
   * happens synchronously inside `dispatch`; the drain merely lets the already-attached handler
   * run. (An earlier revision of these cases awaited while polluted and measured the test
   * harness's own broken `await` instead of the Kernel — the failure below would have been
   * misattributed without this ordering.)
   */
  const drain = async (): Promise<void> => {
    await settle();
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  };

  const collectUnhandled = (): { readonly reasons: unknown[]; stop(): void } => {
    const reasons: unknown[] = [];
    const handler = (reason: unknown): void => {
      reasons.push(reason);
    };
    process.on("unhandledRejection", handler);
    return {
      reasons,
      stop: (): void => {
        process.off("unhandledRejection", handler);
      },
    };
  };

  test("a rejected Driver under a throwing species stays an operational failure with no unhandled rejection", async () => {
    const kernel = new ExecutionCoordinator({ driver: rejectingDriver() });
    const created = started(kernel);
    const species = pollutePromiseSpecies(() => {
      throw new Error("species boom");
    });
    const tap = collectUnhandled();
    let dispatched: { receipt: { boundary: string; token: string } };
    try {
      assert.equal(promiseSpeciesIsHostile(), true, "throwing species live across the call");
      dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
      assert.equal(dispatched.receipt.boundary, "dispatch_intent", "the intent was recorded before the send");
    } finally {
      species.restore();
    }
    try {
      await drain();
      assert.equal(tap.reasons.length, 0, "no rejected Driver promise escaped as unhandled");
      const after = accepted(kernel.inspect(author, created.executionId));
      assert.equal(after.state, "RUNNING", "a rejection changes no accepted state");
      const deliveries = after.activation?.deliveries ?? [];
      assert.equal(deliveries.length, 1);
      assert.equal(deliveries[0]?.status, "failed");
      assert.equal(after.acknowledged.length, 0, "a failure acknowledges nothing");
      assert.equal(after.activation?.receipt.token, dispatched!.receipt.token, "the intent receipt is intact");
      assert.deepEqual(after.activation?.batch, [created.initialEventId], "the reserved batch is intact");
    } finally {
      tap.stop();
    }
    assert.equal(promiseSpeciesIsHostile(), false, "host state restored");
  });

  test("redelivery under a throwing species stays operational with no unhandled rejection", async () => {
    const kernel = new ExecutionCoordinator({ driver: rejectingDriver() });
    const created = started(kernel);
    const first = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    await drain();

    const species = pollutePromiseSpecies(() => {
      throw new Error("species boom");
    });
    const tap = collectUnhandled();
    let redelivered: { activationId: string; receipt: { token: string } };
    try {
      redelivered = accepted(kernel.redeliver(author, created.executionId));
      assert.equal(redelivered.activationId, first.activationId);
      assert.equal(redelivered.receipt.token, first.receipt.token);
    } finally {
      species.restore();
    }
    try {
      await drain();
      assert.equal(tap.reasons.length, 0, "no rejected Driver promise escaped as unhandled");
      const after = accepted(kernel.inspect(author, created.executionId));
      const deliveries = after.activation?.deliveries ?? [];
      assert.equal(deliveries.length, 2, "the redelivery attempt was recorded");
      assert.equal(deliveries[1]?.status, "failed");
      assert.deepEqual(after.activation?.batch, [created.initialEventId], "nothing was re-selected");
    } finally {
      tap.stop();
    }
  });

  test("a hostile constructor with a non-constructor species cannot divert the rejection", async () => {
    const kernel = new ExecutionCoordinator({ driver: rejectingDriver() });
    const created = started(kernel);
    const Evil = function Evil(this: unknown): void {};
    (Evil as unknown as Record<symbol, unknown>)[Symbol.species] = 42;
    const ctor = pollutePromiseConstructor(Evil);
    const tap = collectUnhandled();
    let dispatched: { writerEpoch: number };
    try {
      dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    } finally {
      ctor.restore();
    }
    try {
      await drain();
      assert.equal(tap.reasons.length, 0, "no rejected Driver promise escaped as unhandled");
      const after = accepted(kernel.inspect(author, created.executionId));
      assert.equal(after.state, "RUNNING");
      assert.equal((after.activation?.deliveries ?? [])[0]?.status, "failed");
      assert.equal(dispatched!.writerEpoch, 1, "epoch untouched");
    } finally {
      tap.stop();
    }
    assert.deepEqual(Object.getOwnPropertyDescriptor(Promise.prototype, "constructor")?.value, Promise);
  });

  test("a deleted Promise species plus an Object.prototype species shadow still attaches", async () => {
    const kernel = new ExecutionCoordinator({ driver: rejectingDriver() });
    const created = started(kernel);
    const savedSpecies = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    delete (Promise as unknown as Record<symbol, unknown>)[Symbol.species];
    const shadow = polluteObjectSpecies({});
    const tap = collectUnhandled();
    let dispatched: { receipt: { boundary: string } };
    try {
      dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    } finally {
      shadow.restore();
      if (savedSpecies === undefined) delete (Promise as unknown as Record<symbol, unknown>)[Symbol.species];
      else Object.defineProperty(Promise, Symbol.species, savedSpecies);
    }
    try {
      await drain();
      assert.equal(tap.reasons.length, 0, "no rejected Driver promise escaped as unhandled");
      const after = accepted(kernel.inspect(author, created.executionId));
      assert.equal((after.activation?.deliveries ?? [])[0]?.status, "failed");
      assert.equal(dispatched!.receipt.boundary, "dispatch_intent");
    } finally {
      tap.stop();
    }
    assert.equal(Object.getOwnPropertyDescriptor(Object.prototype, Symbol.species), undefined, "shadow handed back absent");
  });

  test("a pending Driver under a throwing species still delivers once released", async () => {
    let release: () => void = () => {};
    const pendingDriver = {
      driverId: "fake-pending-species",
      deliver(): Promise<void> {
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      },
    };
    const kernel = new ExecutionCoordinator({ driver: pendingDriver });
    const created = started(kernel);
    const species = pollutePromiseSpecies(() => {
      throw new Error("species boom");
    });
    const tap = collectUnhandled();
    try {
      accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    } finally {
      species.restore();
    }
    try {
      await drain();
      const waiting = accepted(kernel.inspect(author, created.executionId));
      assert.equal((waiting.activation?.deliveries ?? [])[0]?.status, "pending", "no false evidence while unsettled");
      release();
      await drain();
      assert.equal(tap.reasons.length, 0);
      const after = accepted(kernel.inspect(author, created.executionId));
      assert.equal((after.activation?.deliveries ?? [])[0]?.status, "delivered");
    } finally {
      tap.stop();
    }
  });

  test("a rejected Driver under a throwing species never escapes as unhandled (subprocess oracle)", () => {
    const probe = `
      const { ExecutionCoordinator } = await import("./packages/kernel/src/index.ts");
      const harness = await import("./packages/kernel/tests/harness.ts");
      const savedSpecies = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
      Object.defineProperty(Promise, Symbol.species, { configurable: true, get() { throw new Error("species boom"); } });
      const kernel = new ExecutionCoordinator({ driver: { driverId: "probe", deliver() { return Promise.reject(new Error("native submit lost")); } } });
      const author = harness.caller("app-a", "tenant-a");
      const created = kernel.createExecution(author, harness.createRequest());
      if (!created.ok) { console.log("SETUP FAILED"); process.exit(2); }
      const dispatched = kernel.dispatch(author, created.value.executionId, { bound: 1 });
      if (!dispatched.ok) { console.log("DISPATCH REFUSED"); process.exit(3); }
      // Restoring before the first await matters: await itself runs SpeciesConstructor, so
      // awaiting while polluted would measure the probe's own broken suspension, not the Kernel.
      // The attach under test already happened synchronously inside dispatch.
      if (savedSpecies !== undefined) Object.defineProperty(Promise, Symbol.species, savedSpecies);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const view = kernel.inspect(author, created.value.executionId);
      const status = view.ok && view.value.activation !== null ? view.value.activation.deliveries[0].status : "missing";
      console.log("SURVIVED " + status);
    `;
    // `--unhandled-rejections=strict`: any Driver rejection that escapes the Kernel's handling
    // crashes the child with a non-zero exit instead of passing silently.
    const result = execFileSync(
      process.execPath,
      ["--unhandled-rejections=strict", "--experimental-strip-types", "--input-type=module", "-e", probe],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    assert.match(result, /SURVIVED failed/, "the child recorded the operational failure and nothing escaped");
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
