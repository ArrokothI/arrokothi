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

import { BOUNDARY_LIMITS, ExecutionCoordinator, canonicalize, isTerminal, type BoundaryValue, type ExecutionView } from "../src/index.ts";
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

  test("K11-R3-ID-02 a request key that is not text names nothing and is refused", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const before = view(kernel, executionId);

    const first = refused(kernel.submitInput(author, input(executionId, { requestKey: { p: 1 } as never, payload: 1 })));
    const second = refused(kernel.submitInput(author, input(executionId, { requestKey: { q: 2 } as never, payload: 2 })));
    for (const refusal of [first, second]) {
      assert.equal(refusal.classification, "malformed_value");
      assert.match(refusal.reason, /requestKey unsupported_form/);
    }
    assert.deepEqual(view(kernel, executionId).mailbox, before.mailbox, "neither named an Event");

    // `kind` is content and is identity text for the same reason.
    const kindRefusal = refused(kernel.submitInput(author, input(executionId, { requestKey: "ok", kind: 7 as never })));
    assert.match(kindRefusal.reason, /kind unsupported_form/);
    assert.deepEqual(view(kernel, executionId).mailbox, before.mailbox);
  });

  test("K11-R3-ID-02 a destination that is not text answers as an unknown destination, disclosing nothing", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const missing = refused(kernel.submitInput(author, input("execution-404", { requestKey: "a" })));
    const nonText = refused(kernel.submitInput(author, input({ destination: executionId } as never, { requestKey: "a" })));
    assert.deepEqual({ ...nonText, position: 0 }, { ...missing, position: 0 }, "the same answer as any destination that does not exist");
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

  test("K11-R1-SCOPE-01 terminal-ingress rule is specified with live-terminal evidence deferred to K1.3", () => {
    // Governing 007 assigns out-of-band cancellation and terminal disposition to K1.3. K1.1 owns
    // the rule that *new* ordinary input to a terminal destination is refused, but must not
    // manufacture that terminal state to evidence it. No terminal state is reachable in this
    // packet, so live-terminal ingress/replay/conflict exercise awaits K1.3, which will own the
    // terminal it arrives through. What K1.1 does evidence here:
    const kernel = coordinator();
    const { executionId } = start(kernel);

    // The terminal predicate recognizes exactly the lifecycle vocabulary's terminal states.
    assert.equal(isTerminal("COMPLETED"), true);
    assert.equal(isTerminal("FAILED"), true);
    assert.equal(isTerminal("CANCELLED"), true);
    assert.equal(isTerminal("READY"), false);
    assert.equal(isTerminal("RUNNING"), false);

    // New input to a non-terminal destination is never refused as terminal.
    const fresh = accepted(kernel.submitInput(author, input(executionId, { requestKey: "fresh-terminal-check" })));
    assert.equal(fresh.replayed, false);

    // The implementation orders Input ID lookup before the terminal check (creation.md: a replay
    // of input accepted before the end is a lookup, not new input), so replay and conflict keep
    // their meaning after an end when K1.3 provides one. That ordering is read directly from
    // `submitInput`: existing-input branch precedes `isTerminal`, which precedes capacity.
    // Manufacturing a CANCELLED Execution here to execute that branch would steal K1.3 scope.
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

  test("K11-R1-VAL-01 post-creation ingress preserves an own __proto__ through replay, mailbox and inspection", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const payload = JSON.parse('{"__proto__":{"x":1},"safe":2}') as Record<string, unknown>;
    const first = accepted(kernel.submitInput(author, input(executionId, { requestKey: "proto", payload: payload as never })));

    const stored = view(kernel, executionId).mailbox[1]?.payload as Record<string, unknown>;
    assert.ok(Object.prototype.hasOwnProperty.call(stored, "__proto__"));
    assert.deepEqual(stored["__proto__"], { x: 1 });

    const replay = accepted(
      kernel.submitInput(author, input(executionId, { requestKey: "proto", payload: JSON.parse('{"safe":2,"__proto__":{"x":1}}') as never })),
    );
    assert.equal(replay.eventId, first.eventId);
    assert.equal(replay.replayed, true);

    (payload["__proto__"] as Record<string, unknown>)["x"] = 99;
    assert.deepEqual((view(kernel, executionId).mailbox[1]?.payload as Record<string, unknown>)["__proto__"], { x: 1 });
  });

  test("K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at ingress", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const before = view(kernel, executionId);

    const payload = new Proxy([1], {
      get(inner, property, receiver): unknown {
        if (property === "0") return 2;
        return Reflect.get(inner, property, receiver);
      },
    });
    const refusal = refused(kernel.submitInput(author, input(executionId, { requestKey: "unstable", payload: payload as never })));
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /payload\[0\] unstable_representation/, "and the refusal locates the position");
    assert.deepEqual(view(kernel, executionId).mailbox, before.mailbox, "nothing was queued under either reading");

    // The same refusal reaches a position `length` claims but the value does not own, which the
    // round-3 path canonicalized as absent while retaining the dynamically supplied element.
    const hollow: unknown[] = [];
    hollow.length = 1;
    const supplied = new Proxy(hollow, {
      get(inner, property, receiver): unknown {
        if (property === "0") return 7;
        return Reflect.get(inner, property, receiver);
      },
    });
    const hollowRefusal = refused(kernel.submitInput(author, input(executionId, { requestKey: "hollow", payload: supplied as never })));
    assert.equal(hollowRefusal.classification, "malformed_value");
    assert.match(hollowRefusal.reason, /payload\[0\] undefined_member/);
    assert.deepEqual(view(kernel, executionId).mailbox, before.mailbox);
  });

  test("K11-R2-VAL-02 the accepted content, the replay decision and the exposed value are one structure", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const payload = { list: [1, [2, { deep: null }]], safe: "yes" };
    const first = accepted(kernel.submitInput(author, input(executionId, { requestKey: "coherent", payload })));

    const stored = view(kernel, executionId).mailbox[1]?.payload;
    const bound = canonicalize(payload);
    const retained = canonicalize(stored);
    assert.ok(bound.ok && retained.ok);
    assert.equal(retained.value.canonical, bound.value.canonical, "identity describes exactly the exposed structure");

    // The bytes that describe the retained value are the bytes that decide replay and conflict.
    const replay = accepted(
      kernel.submitInput(author, input(executionId, { requestKey: "coherent", payload: { safe: "yes", list: [1, [2, { deep: null }]] } })),
    );
    assert.equal(replay.replayed, true);
    assert.equal(replay.eventId, first.eventId);
    const conflict = refused(
      kernel.submitInput(author, input(executionId, { requestKey: "coherent", payload: { safe: "yes", list: [1, [2, { deep: 0 }]] } })),
    );
    assert.equal(conflict.classification, "duplicate_conflict");
  });

  test("K11-R1-VAL-01 an array with own 01 is refused at ingress and queues nothing", () => {
    const kernel = coordinator();
    const { executionId } = start(kernel);
    const before = view(kernel, executionId);
    const bad: unknown[] = [1];
    Object.defineProperty(bad, "01", { value: 2, writable: true, enumerable: true, configurable: true });
    const refusal = refused(kernel.submitInput(author, input(executionId, { requestKey: "bad", payload: bad as never })));
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /unrepresentable_member/);
    assert.deepEqual(view(kernel, executionId).mailbox, before.mailbox);
  });
});
