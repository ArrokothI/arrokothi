/**
 * K1.1-C2 - post-creation input ingress under the Input ID triple.
 *
 * `creation.md`'s "Later input has a destination" owns these rules and `identity.md` owns the
 * triple. The counterexamples driving the cases: keying on the bare request-key text so two
 * producers collide or one producer's key reaches the wrong Execution; treating a conflicting
 * resubmission as an edit; letting a terminal Execution queue new input, or letting a refusal double
 * as a disposition; and letting the refusal for an Execution the caller may not see differ from the
 * refusal for one that does not exist.
 *
 * Every case here holds with no wait registered, because no wait can exist in this packet. Wait
 * matching is K1.3's and adds no second ingress rule.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { BOUNDARY_LIMITS, ExecutionCoordinator, type BoundaryValue, type ExecutionView } from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

const coordinator = (mailboxCapacity?: number): ExecutionCoordinator =>
  new ExecutionCoordinator(mailboxCapacity === undefined ? { driver: recordingDriver() } : { driver: recordingDriver(), mailboxCapacity });

const author = caller("app-a", "tenant-a");

const start = (kernel: ExecutionCoordinator, who = author): { executionId: string; initialEventId: string } => {
  const created = accepted(kernel.createExecution(who, createRequest()));
  return { executionId: created.executionId, initialEventId: created.initialEventId };
};

const input = (destination: string, overrides: Partial<Parameters<ExecutionCoordinator["submitInput"]>[1]> = {}) => ({
  destination,
  requestKey: "correction-1",
  kind: "application.correction",
  payload: { text: "fix the total" },
  ...overrides,
});

const view = (kernel: ExecutionCoordinator, executionId: string, who = author): ExecutionView =>
  accepted(kernel.inspect(who, executionId));

describe("K1.1-C2 accepting one input", () => {
  test("acceptance records content, provenance, a mailbox entry and a position together", () => {
    const kernel = coordinator();
    const { executionId, initialEventId } = start(kernel);

    const result = accepted(kernel.submitInput(author, input(executionId)));
    assert.equal(result.replayed, false);
    assert.equal(result.receipt.boundary, "input_ingress");
    assert.equal(result.acceptancePosition, 2, "after the initial input at position 1");
    assert.deepEqual(result.disposition, { kind: "queued" });

    const after = view(kernel, executionId);
    assert.deepEqual(after.queued, [initialEventId, result.eventId], "queued in per-Execution acceptance order");
    const entry = after.mailbox[1];
    assert.ok(entry);
    assert.deepEqual(entry.inputId, { producerNamespace: "app-a", destination: executionId, requestKey: "correction-1" });
    assert.equal(entry.sourceCategory, "application_input");
    assert.deepEqual(entry.payload, { text: "fix the total" });
    assert.equal(entry.subscriptionClass, null);
    assert.deepEqual(after.acknowledged, [], "acceptance is not acknowledgment");
  });

  test("a declared subscription class is retained as part of the immutable content", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const result = accepted(kernel.submitInput(author, input(executionId, { subscriptionClass: "editor" })));
    assert.equal(view(kernel, executionId).mailbox[1]?.subscriptionClass, "editor");

    // Absent and present are different logical values, so adding one on retry conflicts rather than
    // silently matching. K1.3 decides what a subscription class selects; this packet only keeps it.
    assert.equal(refused(kernel.submitInput(author, input(executionId))).classification, "duplicate_conflict");
    assert.equal(result.replayed, false);
  });

  test("input that is not a boundary value is refused and queues nothing", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const before = view(kernel, executionId);

    const refusal = refused(kernel.submitInput(author, input(executionId, { payload: { when: new Date(0) as unknown as null } })));
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /unsupported_form/);

    const after = view(kernel, executionId);
    assert.deepEqual(after.mailbox, before.mailbox);
    assert.deepEqual(after.receipts, before.receipts);
  });
});

describe("K1.1-C2 each field is measured as its own boundary-value root", () => {
  /** `A1 = []`, `A(n+1) = [An]`: the depth construction values.md uses. */
  const nested = (levels: number): BoundaryValue => {
    let value: BoundaryValue = [];
    for (let level = 1; level < levels; level += 1) value = [value];
    return value;
  };

  test("a payload exactly at a limit is accepted, and one unit over is refused", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);

    // The envelope is not an extra aggregate root. Validating the payload inside a wrapper object
    // would add a level and refuse this value, which the contract says must pass.
    assert.equal(
      accepted(kernel.submitInput(author, input(executionId, { requestKey: "deep", payload: nested(BOUNDARY_LIMITS.containerDepth) }))).replayed,
      false,
    );
    assert.equal(
      refused(kernel.submitInput(author, input(executionId, { requestKey: "deeper", payload: nested(BOUNDARY_LIMITS.containerDepth + 1) })))
        .classification,
      "malformed_value",
    );
  });

  test("the same holds at creation, for the initial input and the authority context alike", () => {
    const kernel = coordinator();
    const author2 = caller("app-a", "tenant-a");
    const atLimit = nested(BOUNDARY_LIMITS.containerDepth);

    assert.equal(
      accepted(
        kernel.createExecution(author2, createRequest({ creationKey: "deep", authorityContext: atLimit, initialInput: { kind: "k", payload: atLimit } })),
      ).replayed,
      false,
      "two sibling roots, each at the limit, are both accepted",
    );
    const refusal = refused(
      kernel.createExecution(
        author2,
        createRequest({ creationKey: "deeper", initialInput: { kind: "k", payload: nested(BOUNDARY_LIMITS.containerDepth + 1) } }),
      ),
    );
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /initialInput\.payload(\[0\])* too_deep/, "and the reason locates the field that broke it");
  });

  test("a refusal locates the offending field by name", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const refusal = refused(
      kernel.submitInput(author, input(executionId, { requestKey: "bad", payload: { rows: [{ n: Number.NaN }] } })),
    );
    assert.match(refusal.reason, /payload\.rows\[0\]\.n non_finite_number/);
  });
});

describe("K1.1-C2 exact replay and content conflict", () => {
  test("an exact replay returns the recorded disposition and creates no second Event", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const first = accepted(kernel.submitInput(author, input(executionId)));
    const before = view(kernel, executionId);

    const replay = accepted(kernel.submitInput(author, input(executionId)));
    assert.equal(replay.replayed, true);
    assert.equal(replay.eventId, first.eventId);
    assert.deepEqual(replay.receipt, first.receipt);
    assert.equal(replay.acceptancePosition, first.acceptancePosition, "its acceptance position does not move");
    assert.deepEqual(view(kernel, executionId), before, "and nothing about the Execution changed");
  });

  test("a replay is decided by logical value, not by spelling", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const first = accepted(kernel.submitInput(author, input(executionId, { payload: { a: 1, b: [1, 2] } })));

    const reordered = accepted(kernel.submitInput(author, input(executionId, { payload: { b: [1, 2], a: 1 } })));
    assert.equal(reordered.eventId, first.eventId, "member order is not semantic");

    const reversed = refused(kernel.submitInput(author, input(executionId, { payload: { a: 1, b: [2, 1] } })));
    assert.equal(reversed.classification, "duplicate_conflict", "array order is");
  });

  test("different content under an accepted identity is recorded and refused, and edits nothing", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const first = accepted(kernel.submitInput(author, input(executionId)));
    const before = view(kernel, executionId);

    const refusal = refused(kernel.submitInput(author, input(executionId, { payload: { text: "fix the date" } })));
    assert.equal(refusal.classification, "duplicate_conflict");
    assert.equal(refusal.executionId, executionId);
    assert.match(refusal.reason, /immutable/);

    const after = view(kernel, executionId);
    assert.deepEqual(after.mailbox, before.mailbox, "the accepted payload is not edited");
    assert.deepEqual(after.queued, before.queued, "and no second Event is queued");
    assert.deepEqual(after.receipts, before.receipts, "a refusal mints no receipt");
    assert.deepEqual(after.refusals, [refusal]);
    assert.equal(first.eventId, before.mailbox[1]?.eventId);
  });

  test("the initial input is reachable under its own triple, like any other input", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));

    const replay = accepted(
      kernel.submitInput(author, {
        destination: created.executionId,
        requestKey: "report-17",
        kind: "application.request",
        payload: { text: "report for week 37" },
      }),
    );
    assert.equal(replay.replayed, true);
    assert.equal(replay.eventId, created.initialEventId);
    assert.deepEqual(replay.receipt, created.receipt, "the boundary that accepted it was creation");

    const conflict = refused(
      kernel.submitInput(author, {
        destination: created.executionId,
        requestKey: "report-17",
        kind: "application.request",
        payload: { text: "report for week 38" },
      }),
    );
    assert.equal(conflict.classification, "duplicate_conflict");
  });
});

describe("K1.1-C2 the triple keeps unrelated requests apart", () => {
  test("two producers may use the same request-key text", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const other = caller("app-b", "tenant-a");

    const fromA = accepted(kernel.submitInput(author, input(executionId)));
    const fromB = accepted(kernel.submitInput(other, input(executionId)));
    assert.notEqual(fromB.eventId, fromA.eventId, "identical key text, different producers, different inputs");
    assert.equal(fromB.replayed, false);
    assert.equal(view(kernel, executionId).queued.length, 3);
  });

  test("one producer's key text to two Executions names two inputs", () => {
    const kernel = coordinator();
    const first = start(kernel);
    const second = accepted(kernel.createExecution(author, createRequest({ creationKey: "report-18" })));

    const toFirst = accepted(kernel.submitInput(author, input(first.executionId)));
    const toSecond = accepted(kernel.submitInput(author, input(second.executionId)));
    assert.notEqual(toSecond.eventId, toFirst.eventId);
    assert.deepEqual(view(kernel, first.executionId).queued, [first.initialEventId, toFirst.eventId]);
    assert.deepEqual(view(kernel, second.executionId).queued, [second.initialEventId, toSecond.eventId]);
  });

  test("no packing of the three parts can make two identities collide", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);

    // Two triples whose parts render identically once joined by any single separator. With the
    // destination `d` fixed, ("x", d, "y d k") and ("x d y", d, "k") both read "x d y d k". This is
    // the K1.0-correction-02 failure in another place: a joined rendering is not injective, so an
    // identity compared through one would bind two different inputs to one Event.
    const separator = " ";
    const left = caller("x", "tenant-a");
    const right = caller(["x", executionId, "y"].join(separator), "tenant-a");
    const leftKey = ["y", executionId, "k"].join(separator);

    assert.equal(
      [left.namespace, executionId, leftKey].join(separator),
      [right.namespace, executionId, "k"].join(separator),
      "the two triples really are indistinguishable once joined",
    );

    const first = accepted(kernel.submitInput(left, input(executionId, { requestKey: leftKey })));
    const second = accepted(kernel.submitInput(right, input(executionId, { requestKey: "k", payload: { text: "different" } })));
    assert.notEqual(second.eventId, first.eventId, "but they are different inputs and stay so");
    assert.equal(second.replayed, false, "and the second is not treated as a replay or a conflict");
  });
});

describe("K1.1-C2 destinations that refuse", () => {
  test("an unknown destination and one the caller may not see answer identically", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const outsider = caller("app-c", "tenant-c");

    const hidden = refused(kernel.submitInput(outsider, input(executionId)));
    const missing = refused(kernel.submitInput(outsider, input("execution-404")));
    assert.equal(hidden.classification, "unknown_destination");
    assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 });
    assert.equal(hidden.executionId, null, "the refusal does not name an Execution the caller cannot see");
    assert.equal(view(kernel, executionId).refusals.length, 0, "and records nothing against it");
  });

  test("new ordinary input to a terminal destination is a third answer: refused, not queued, not disposed", () => {
    const kernel = coordinator();
    const { executionId, initialEventId } = start(kernel);
    accepted(kernel.cancelExecution(author, executionId));
    const before = view(kernel, executionId);

    const refusal = refused(kernel.submitInput(author, input(executionId)));
    assert.equal(refusal.classification, "terminal_destination");
    assert.match(refusal.reason, /CANCELLED/);

    const after = view(kernel, executionId);
    assert.deepEqual(after.queued, [], "it is not queued");
    assert.deepEqual(after.terminalDispositions, [initialEventId], "and it is not a terminal disposition either");
    assert.deepEqual(after.mailbox, before.mailbox, "no Event was minted for it");
    assert.deepEqual(after.receipts, before.receipts);
  });

  test("a replay of input accepted before the end still returns its recorded disposition", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const before = accepted(kernel.submitInput(author, input(executionId)));
    accepted(kernel.cancelExecution(author, executionId));

    // "Reject ordinary input to a terminal Execution" is about *new* input. An exact replay of an
    // already-accepted one is a lookup, and it reports what actually happened to that Event.
    const replay = accepted(kernel.submitInput(author, input(executionId)));
    assert.equal(replay.replayed, true);
    assert.equal(replay.eventId, before.eventId);
    assert.deepEqual(replay.disposition, { kind: "terminal", reason: "Execution terminated before this Event was acknowledged" });
  });

  test("a conflicting resubmission after the end is still an identity conflict", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    accepted(kernel.submitInput(author, input(executionId)));
    accepted(kernel.cancelExecution(author, executionId));

    // Identity is decided before admission: this submission is not new input under a free key, it is
    // a second, different thing claiming an identity that is already bound.
    const refusal = refused(kernel.submitInput(author, input(executionId, { payload: { text: "other" } })));
    assert.equal(refusal.classification, "duplicate_conflict");
  });

  test("a capacity below one is a configuration error, not a refusal to discover at runtime", () => {
    // Creation accepts its initial input in the same atomic decision, so a coordinator declaring a
    // capacity of zero would break its own limit on the first Execution.
    assert.throws(() => new ExecutionCoordinator({ driver: recordingDriver(), mailboxCapacity: 0 }), RangeError);
    assert.throws(() => new ExecutionCoordinator({ driver: recordingDriver(), mailboxCapacity: 2.5 }), RangeError);
  });

  test("capacity refuses ingress before any acknowledgment", () => {
    const kernel = coordinator(3);
    const { executionId } = start(kernel);
    accepted(kernel.submitInput(author, input(executionId, { requestKey: "c1" })));
    accepted(kernel.submitInput(author, input(executionId, { requestKey: "c2" })));
    const before = view(kernel, executionId);
    assert.equal(before.queued.length, 3, "the mailbox is at its declared capacity");

    const refusal = refused(kernel.submitInput(author, input(executionId, { requestKey: "c3" })));
    assert.equal(refusal.classification, "capacity_exhausted");
    assert.match(refusal.reason, /capacity of 3/);

    const after = view(kernel, executionId);
    assert.deepEqual(after.queued, before.queued, "nothing queued");
    assert.deepEqual(after.acknowledged, [], "and nothing acknowledged to make room");
  });
});

describe("K1.1-C2 ingress does not depend on what the Execution is doing", () => {
  test("input accepted while RUNNING is queued and stays out of the reserved batch", () => {
    const kernel = coordinator();
    const { executionId, initialEventId } = start(kernel);
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 4 }));
    assert.deepEqual(dispatched.batch, [initialEventId]);

    const late = accepted(kernel.submitInput(author, input(executionId)));
    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING");
    assert.deepEqual(after.activation?.batch, [initialEventId], "reservation pinned the batch; a later arrival does not join it");
    assert.deepEqual(after.queued, [initialEventId, late.eventId], "both are unacknowledged");
    assert.equal(after.mailbox[1]?.reserved, false);
  });

  test("replay and conflict behave the same way while RUNNING as while READY", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const first = accepted(kernel.submitInput(author, input(executionId)));
    accepted(kernel.dispatch(author, executionId, { bound: 4 }));

    assert.equal(accepted(kernel.submitInput(author, input(executionId))).eventId, first.eventId);
    assert.equal(
      refused(kernel.submitInput(author, input(executionId, { payload: { text: "changed" } }))).classification,
      "duplicate_conflict",
    );
  });
});
