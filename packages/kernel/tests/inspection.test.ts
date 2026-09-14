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

import { ExecutionCoordinator, type BoundaryValue, type ExecutionView } from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

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
    assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 });
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
