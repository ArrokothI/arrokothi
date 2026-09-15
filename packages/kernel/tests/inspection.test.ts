/**
 * K1.1-C9 - inspection reports everything and changes nothing.
 *
 * `core.md`: "Reservation and mailbox reads acknowledge nothing." The failures behind the cases: a
 * read that advances an acceptance position or marks something accounted for; a view that hands back
 * live internal state, so an observer can edit accepted content; and a view too thin to tell a
 * reserved Event from an acknowledged one.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, canonicalize, type BoundaryValue, type ExecutionView } from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  descriptorConversionIsHostile,
  inheritedIndexIsLive,
  polluteDescriptorFields,
  recordingDriver,
  refused,
  trapInheritedIndices,
} from "./harness.ts";

const author = caller("app-a", "tenant-a");

/** One Execution driven through every accepted boundary this packet has. */
function exercised(): { kernel: ExecutionCoordinator; executionId: string } {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const created = accepted(kernel.createExecution(author, createRequest()));
  accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }));
  accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c2", kind: "k", payload: { a: 2 } }));
  refused(kernel.submitInput(author, { destination: created.executionId, requestKey: "c2", kind: "k", payload: { a: 3 } }));
  accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));
  return { kernel, executionId: created.executionId };
}

describe("K1.1-C9 what a reader can see", () => {
  test("the snapshot carries every fact the packet accepts", () => {
    const { kernel, executionId } = exercised();
    const view = accepted(kernel.inspect(author, executionId));

    assert.equal(view.state, "RUNNING");
    assert.equal(view.progressRevision, 0);
    assert.equal(view.acceptedProgress, null);
    assert.equal(view.progressCodec, "inline-json@1");
    assert.equal(view.definitionRevision, "weekly-report@3");
    assert.equal(view.runtimeContractRevision, "runtime-contract@1");
    assert.equal(view.scope, "tenant-a");
    assert.equal(view.creationKey, "report-17");

    assert.equal(view.mailbox.length, 3);
    assert.deepEqual(view.activation?.batch, view.mailbox.slice(0, 2).map((entry) => entry.eventId));
    assert.deepEqual(view.mailbox.map((entry) => entry.reserved), [true, true, false]);
    assert.deepEqual(view.queued, view.mailbox.map((entry) => entry.eventId), "reserved is not acknowledged");
    assert.deepEqual(view.acknowledged, []);
    assert.deepEqual(view.terminalDispositions, []);

    assert.equal(view.refusals.length, 1);
    assert.equal(view.refusals[0]?.classification, "duplicate_conflict");
    assert.equal(view.receipts.length, 4, "creation, two ingresses, one dispatch intent");
    assert.equal(view.activation?.deliveries.length, 1);
  });

  test("reading twice changes nothing and reads the same", () => {
    const { kernel, executionId } = exercised();
    const first = accepted(kernel.inspect(author, executionId));
    kernel.visibleExecutions(author);
    const second = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(second, first);
    assert.deepEqual(second.acknowledged, [], "a read is not an acknowledgment");
  });

  test("editing a returned view cannot reach the Execution", () => {
    const { kernel, executionId } = exercised();
    const view = accepted(kernel.inspect(author, executionId));
    const before = accepted(kernel.inspect(author, executionId));

    (view.queued as string[]).push("event-invented");
    (view.mailbox as ExecutionView["mailbox"][number][]).length = 0;
    (view.receipts as ExecutionView["receipts"][number][]).length = 0;
    (view.refusals as ExecutionView["refusals"][number][]).length = 0;
    (view.activation?.batch as string[]).push("event-invented");

    assert.deepEqual(accepted(kernel.inspect(author, executionId)), before, "the snapshot was a copy");
  });

  test("accepted content cannot be edited through the caller's own object either", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const mutable: Record<string, BoundaryValue> = { text: "week 37" };
    const created = accepted(
      kernel.createExecution(author, createRequest({ initialInput: { kind: "application.request", payload: mutable } })),
    );

    mutable["text"] = "week 38";
    mutable["extra"] = true;

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.mailbox[0]?.payload, { text: "week 37" }, "acceptance recorded immutable content");

    // And the frozen copy resists a direct attempt through the view as well.
    assert.throws(() => {
      (view.mailbox[0]?.payload as Record<string, BoundaryValue>)["text"] = "week 39";
    }, TypeError);
  });

  test("inspection is scoped like every other read", () => {
    const { kernel, executionId } = exercised();
    const outsider = caller("app-c", "tenant-c");
    const hidden = refused(kernel.inspect(outsider, executionId));
    const missing = refused(kernel.inspect(outsider, "execution-404"));
    // K11-R12-ID-01: unmasked — hidden and missing refusals must be identical, position included.
    assert.deepEqual({ ...hidden }, { ...missing });
    assert.equal(hidden.position, 0);
  });

  test("K11-R1-VAL-01 inspection exposes the same structural value that canonical bytes bound", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const payload = JSON.parse('{"__proto__":{"x":1},"safe":2}') as Record<string, unknown>;
    const created = accepted(
      kernel.createExecution(author, createRequest({ initialInput: { kind: "application.request", payload: payload as never } })),
    );
    const stored = accepted(kernel.inspect(author, created.executionId)).mailbox[0]?.payload as Record<string, unknown>;
    assert.ok(Object.prototype.hasOwnProperty.call(stored, "__proto__"));
    assert.deepEqual(stored["__proto__"], { x: 1 });
    assert.deepEqual(Object.keys(stored).sort(), ["__proto__", "safe"]);
    assert.throws(() => {
      (stored as Record<string, unknown>)["safe"] = 99;
    }, TypeError);
  });

  test("K11-R2-VAL-02 inspection exposes the structure identity was taken from, twice over", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const payload = JSON.parse('{"__proto__":{"x":1},"list":[1,[2,{"deep":null}]],"safe":2}') as Record<string, unknown>;
    const created = accepted(
      kernel.createExecution(author, createRequest({ initialInput: { kind: "application.request", payload: payload as never } })),
    );

    const bound = canonicalize(payload);
    assert.ok(bound.ok);
    const first = accepted(kernel.inspect(author, created.executionId)).mailbox[0]?.payload;
    const second = accepted(kernel.inspect(author, created.executionId)).mailbox[0]?.payload;

    assert.equal(second, first, "two reads expose the one retained structure, not two reconstructions");
    for (const exposed of [first, second]) {
      const again = canonicalize(exposed);
      assert.ok(again.ok);
      assert.equal(again.value.canonical, bound.value.canonical);
    }
  });

  test("visibleExecutions lists what this caller may reach, and nothing else", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const inA = accepted(kernel.createExecution(caller("app-a", "tenant-a"), createRequest({ scope: "tenant-a" })));
    const inB = accepted(kernel.createExecution(caller("app-b", "tenant-b"), createRequest({ scope: "tenant-b" })));

    assert.deepEqual(kernel.visibleExecutions(caller("app-a", "tenant-a")), [inA.executionId]);
    assert.deepEqual(kernel.visibleExecutions(caller("app-b", "tenant-b")), [inB.executionId]);
    assert.deepEqual(kernel.visibleExecutions(caller("app-c", "tenant-a", "tenant-b")), [inA.executionId, inB.executionId]);
    assert.deepEqual(kernel.visibleExecutions(caller("app-d", "tenant-z")), []);
  });
});

describe("K11-R6-STATE-02 a projection describes retained truth under persistent ambient pollution", () => {
  /**
   * The projection half of the same defect, and the case that shows why "observe the caller once"
   * is not the whole answer.
   *
   * These calls take no caller value at all. The pollution is residue: an inherited indexed
   * accessor that some earlier boundary observation installed and left on `Array.prototype`. Every
   * list a view is assembled from — the mailbox entries, the queued IDs, the reserved batch copy,
   * the delivery attempts, the recorded refusals, the receipts, and the visible-Execution listing —
   * was previously grown with `list[list.length] = item`, so under that residue a freshly built
   * view could report an empty mailbox, an empty batch and no evidence for an Execution that holds
   * all three.
   */
  test("inspect and visibleExecutions report the same facts with the accessor live as without it", () => {
    const { kernel, executionId } = exercised();
    const clean = accepted(kernel.inspect(author, executionId));
    const cleanList = kernel.visibleExecutions(author);

    let polluted: ExecutionView;
    let pollutedList: readonly string[];
    let secondRead: ExecutionView;
    const trap = trapInheritedIndices(["0", "1", "2", "3"]);
    try {
      assert.equal(inheritedIndexIsLive(0), true, "the inherited setter is live for these reads");
      polluted = accepted(kernel.inspect(author, executionId));
      secondRead = accepted(kernel.inspect(author, executionId));
      pollutedList = kernel.visibleExecutions(author);
    } finally {
      trap.restore();
    }

    assert.deepEqual(polluted!, clean, "the view is the retained truth, not what the accessor allowed through");
    assert.deepEqual(secondRead!, polluted!, "and reading twice under the accessor is still inert");
    assert.deepEqual(pollutedList!, cleanList);
    assert.equal(polluted!.mailbox.length, 3);
    assert.equal(polluted!.queued.length, 3);
    assert.equal(polluted!.activation?.batch.length, 2);
    assert.equal(polluted!.activation?.deliveries.length, 1);
    assert.equal(polluted!.refusals.length, 1);
    assert.equal(polluted!.receipts.length, 4);
    assert.deepEqual(trap.swallowed, ["control-write"], "no Kernel element reached the setter");

    // Reading under pollution acknowledged nothing and changed nothing either.
    assert.deepEqual(accepted(kernel.inspect(author, executionId)), clean);
  });

  test("a refusal recorded under the accessor is still retained evidence a later read reports", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "k", kind: "k", payload: { a: 1 } }));

    const trap = trapInheritedIndices(["0", "1"]);
    let refusal: { classification: string; position: number };
    try {
      assert.equal(inheritedIndexIsLive(0), true, "the refusal list's first position is trapped");
      refusal = refused(
        kernel.submitInput(author, { destination: created.executionId, requestKey: "k", kind: "k", payload: { a: 2 } }),
      );
      // The serializer window borrows both prototypes for the exact JCS call and must hand them
      // back exactly as it found them, including a hostile accessor it did not install.
      const still = Object.getOwnPropertyDescriptor(Array.prototype, "0");
      assert.equal(typeof still?.get, "function", "the window restored the descriptor it borrowed");
      assert.equal(inheritedIndexIsLive(0), true);
    } finally {
      trap.restore();
    }

    assert.equal(refusal!.classification, "duplicate_conflict");
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(
      view.refusals.map((record) => record.classification),
      ["duplicate_conflict"],
      "the refusal reached the Execution's retained evidence",
    );
    assert.equal(view.refusals[0], refusal!, "and it is the same retained object that was returned");
    assert.equal(view.mailbox.length, 2, "the conflict mutated nothing");
  });
});

describe("K11-R7-STATE-03 projection under residual descriptor-field pollution", () => {
  /**
   * The projection half of the same class. The pollution was left behind by an earlier supported
   * observation; this call takes no caller value of its own. Every list a fresh view is assembled
   * from must still be built as own data with descriptors that consult no prototype, or inspection
   * throws a raw ambient `TypeError` instead of reporting retained truth.
   */
  test("inspect, redelivery and listings under live get/set pollution equal the unpolluted views", () => {
    const { kernel, executionId } = exercised();
    const clean = accepted(kernel.inspect(author, executionId));
    const cleanVisible = kernel.visibleExecutions(author);

    const pollution = polluteDescriptorFields({ get: 1, set: () => {} });
    try {
      assert.equal(descriptorConversionIsHostile(), true, "conversion is hostile for these reads");
      const view = accepted(kernel.inspect(author, executionId));
      assert.deepEqual(view, clean, "a fresh projection describes retained truth exactly");
      const again = accepted(kernel.inspect(author, executionId));
      assert.deepEqual(again, clean, "reading still acknowledges and mutates nothing");
      assert.deepEqual(kernel.visibleExecutions(author), cleanVisible, "the listing is complete");
      const redelivered = accepted(kernel.redeliver(author, executionId));
      assert.deepEqual(redelivered.batch, clean.activation?.batch, "redelivery re-sends the retained batch");
    } finally {
      pollution.restore();
    }

    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "get"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "set"), false);
  });
});
