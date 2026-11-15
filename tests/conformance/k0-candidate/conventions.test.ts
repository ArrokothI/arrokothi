/**
 * K1.4-candidate: witnesses for the candidate's own rules, outside the fifteen fixture schedules.
 *
 * The fixture judges the Kernel. These tests judge the adapter: the conventions the owner adopted
 * (owner choice 02), the scoping design check 01 asked for (D01-CHK-03, -04, -06, -07), and the rule
 * that an answer the adapter has no projection for fails visibly instead of looking like success.
 * Each drives `kernelCandidate` with its own commands over the real Kernel.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { validateCanonicalBytes } from "@arrokothi/kernel";
import type { Activation, DeliverySettlement, SubmissionGrant } from "@arrokothi/kernel";

import type { Command, Observation } from "../k0/fixture.ts";
import type { WaitRecord } from "../k0/protocol-vocabulary.ts";
import { canonicalBytes, canonicalText, decodeBytes, plainCopy, UnsupportedLaboratoryValue } from "./canonical-json.ts";
import { createFakeDriver } from "./fake-driver.ts";
import { kernelCandidate } from "./kernel-candidate.ts";
import { create, input, outcomeFor, startRun } from "./support.ts";

const subscriptionWait = (generation: string, deadline?: number): WaitRecord =>
  deadline === undefined
    ? { dependencies: [], subscriptions: [{ subscriptionClass: "continue" }], generation }
    : { dependencies: [], subscriptions: [{ subscriptionClass: "continue" }], deadline, generation };

const timer = (executionId: string, generation: string, eventId: string): Command => ({
  kind: "deliver_timer",
  executionId,
  generation,
  timeoutEvent: { eventId, destination: executionId, kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: generation },
});

/** An Outcome the Kernel refuses as `malformed_envelope`: two Emissions under one key. */
const malformed = (open: Observation) =>
  outcomeFor(open, { step: "continue" }, { emissions: [{ emissionId: "e", value: 1 }, { emissionId: "e", value: 2 }] });

describe("K1.4-candidate: the rejection convention (owner choice 02 Q3 b, addendum §A5)", () => {
  test("a rejection is kept across an accepted input, an inspect and an ordinary redelivery", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    const open = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const refused = apply({ kind: "submit_outcome", outcome: malformed(open) });
    assert.equal(refused.rejection?.classification, "malformed_envelope");

    const afterInput = apply({ kind: "accept_event", event: input("later", "x", "continue") });
    assert.deepEqual(afterInput.queued, ["in-x", "later"]);
    assert.deepEqual(afterInput.rejection, refused.rejection);
    assert.deepEqual(apply({ kind: "inspect", executionId: "x" }).rejection, refused.rejection);
    assert.deepEqual(apply({ kind: "redeliver_dispatch", executionId: "x" }).rejection, refused.rejection);
  });

  test("a takeover, a cancellation, a dispatch and an accepted Outcome each drop it", () => {
    const apply = startRun(kernelCandidate);
    const created = apply(create("x", "kx", input("in-x", "x", "initial")));
    const conflict = apply(create("x", "kx", input("in-other", "x", "initial"), "create_retry"));
    assert.equal(conflict.rejection?.classification, "duplicate_conflict");
    assert.equal(conflict.receipt, created.receipt);

    const open = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    assert.equal(open.rejection, null, "a dispatch changes the lifecycle state");

    assert.equal(apply({ kind: "submit_outcome", outcome: malformed(open) }).rejection?.classification, "malformed_envelope");
    const taken = apply({ kind: "takeover", executionId: "x" });
    assert.equal(taken.rejection, null, "a takeover changes the writer epoch");
    assert.equal(taken.activationId, open.activationId);
    assert.ok(taken.writerEpoch > open.writerEpoch);

    const stale = apply({ kind: "submit_outcome", outcome: outcomeFor(open, { step: "continue" }) });
    assert.equal(stale.rejection?.classification, "stale_exchange");
    const accepted = apply({ kind: "submit_outcome", outcome: outcomeFor(taken, { step: "continue" }) });
    assert.equal(accepted.rejection, null, "an accepted Outcome closes the exchange");
    assert.equal(accepted.state, "READY");

    const reopened = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    assert.equal(apply({ kind: "submit_outcome", outcome: malformed(reopened) }).rejection?.classification, "malformed_envelope");
    const cancelled = apply({ kind: "accept_cancellation", executionId: "x" });
    assert.equal(cancelled.state, "CANCELLED");
    assert.equal(cancelled.rejection, null, "a cancellation changes the lifecycle state");
  });

  test("each Execution has its own memory: activity on one cannot clear another's rejection", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    const openX = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const refusedX = apply({ kind: "submit_outcome", outcome: malformed(openX) });

    assert.equal(apply(create("y", "ky", input("in-y", "y", "initial"))).rejection, null);
    const openY = apply({ kind: "dispatch", executionId: "y", bound: 1 });
    const doneY = apply({ kind: "submit_outcome", outcome: outcomeFor(openY, { step: "complete", result: "done" }) });
    assert.equal(doneY.state, "COMPLETED");
    assert.equal(doneY.rejection, null);

    assert.deepEqual(apply({ kind: "inspect", executionId: "x" }).rejection, refusedX.rejection);
  });

  test("the classification and reason are the Kernel's own, and terminal ingress is reported apart from it", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    const open = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const done = apply({ kind: "submit_outcome", outcome: outcomeFor(open, { step: "complete", result: null }) });
    const late = apply({ kind: "accept_event", event: input("late", "x", "continue") });
    assert.equal(late.ingressRefused, "late");
    assert.equal(late.rejection, null);
    assert.deepEqual(late.queued, []);

    // Other content for the exchange whose Outcome was already accepted: the Kernel answers from its
    // record, and its classification and reason are reported as it gave them.
    const afterEnd = apply({ kind: "submit_outcome", outcome: outcomeFor(open, { step: "continue" }, { progress: { other: true } }) });
    assert.equal(afterEnd.rejection?.classification, "duplicate_conflict");
    assert.match(afterEnd.rejection?.reason ?? "", /already accepted with different content/);
    assert.equal(afterEnd.receipt, done.receipt);
  });
});

describe("K1.4-candidate: aliases are scoped to their Execution (design check 01 D01-CHK-06)", () => {
  test("two Executions each register their first generation; names, deadlines and timers stay apart", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    apply(create("y", "ky", input("in-y", "y", "initial")));
    const openX = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const openY = apply({ kind: "dispatch", executionId: "y", bound: 1 });
    const waitingX = apply({ kind: "submit_outcome", outcome: outcomeFor(openX, { step: "await", wait: subscriptionWait("gx", 50) }) });
    const waitingY = apply({ kind: "submit_outcome", outcome: outcomeFor(openY, { step: "await", wait: subscriptionWait("gy", 60) }) });
    assert.deepEqual([waitingX.state, waitingX.liveWaitGeneration, waitingX.acceptedDeadline], ["WAITING", "gx", 50]);
    assert.deepEqual([waitingY.state, waitingY.liveWaitGeneration, waitingY.acceptedDeadline], ["WAITING", "gy", 60]);

    // The other Execution's generation name does not exist here, although both are the Kernel's generation 1.
    assert.throws(() => apply(timer("x", "gy", "to-wrong")), /names wait generation "gy", which the Kernel never issued for this Execution/);

    const firedY = apply(timer("y", "gy", "to-y"));
    assert.deepEqual([firedY.state, firedY.queued, firedY.waitEndedReadiness], ["READY", ["to-y"], [{ generation: "gy", species: "deadline" }]]);
    const stillX = apply({ kind: "inspect", executionId: "x" });
    assert.deepEqual([stillX.state, stillX.liveWaitGeneration, stillX.queued], ["WAITING", "gx", []]);

    const firedX = apply(timer("x", "gx", "to-x"));
    assert.deepEqual([firedX.state, firedX.queued, firedX.waitEndedReadiness], ["READY", ["to-x"], [{ generation: "gx", species: "deadline" }]]);

    // A repeated fire is the Kernel's `duplicate`: nothing changes, and the first name stays bound.
    const again = apply(timer("x", "gx", "to-x-again"));
    assert.deepEqual(again, firedX);
  });

  test("an unnamed timeout takes its label from its own generation in its own Execution (Q2 b)", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    apply(create("y", "ky", input("in-y", "y", "initial")));
    const openX = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const openY = apply({ kind: "dispatch", executionId: "y", bound: 1 });
    // The clock starts at 1, so a deadline of 1 is already due when the wait registers (B-7 path A).
    const dueX = apply({ kind: "submit_outcome", outcome: outcomeFor(openX, { step: "await", wait: subscriptionWait("first-of-x", 1) }) });
    const dueY = apply({ kind: "submit_outcome", outcome: outcomeFor(openY, { step: "await", wait: subscriptionWait("first-of-y", 1) }) });
    assert.deepEqual([dueX.state, dueX.queued, dueX.waitEndedReadiness], ["READY", ["to-first-of-x"], [{ generation: "first-of-x", species: "deadline" }]]);
    assert.deepEqual([dueY.state, dueY.queued, dueY.waitEndedReadiness], ["READY", ["to-first-of-y"], [{ generation: "first-of-y", species: "deadline" }]]);

    // A later fire names the same Event; the explicit name is bound to it from then on.
    const named = apply(timer("x", "first-of-x", "named-by-timer"));
    assert.deepEqual(named.queued, ["named-by-timer"]);
    assert.deepEqual(apply({ kind: "inspect", executionId: "y" }).queued, ["to-first-of-y"]);
  });

  test("a laboratory name the Kernel answers with a second Execution is not rebound", () => {
    const apply = startRun(kernelCandidate);
    const first = apply(create("x", "k1", input("in-1", "x", "initial")));
    assert.equal(first.executionId, "x");
    const second = apply(create("x", "k2", input("in-2", "x", "initial")));
    assert.match(second.executionId, /^kernel-execution:/);
    assert.deepEqual(second.queued, ["in-2"]);
    assert.deepEqual(apply({ kind: "inspect", executionId: "x" }).queued, ["in-1"]);
  });

  test("a Kernel Execution that already has a name keeps it when another name reaches it", () => {
    const apply = startRun(kernelCandidate);
    const first = apply(create("x", "shared", input("in-1", "x", "initial")));
    const collapsed = apply(create("y", "shared", input("in-1", "y", "initial")));
    assert.equal(collapsed.executionId, "x");
    assert.equal(collapsed.receipt, first.receipt);
    assert.throws(() => apply({ kind: "inspect", executionId: "y" }), /names Execution "y", which the Kernel has not created/);
  });
});

describe("K1.4-candidate: an answer with no projection fails visibly (addendum §A8)", () => {
  const started = () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    return apply;
  };

  test("a refused dispatch throws; it is never shown as unchanged state", () => {
    const apply = started();
    apply({ kind: "dispatch", executionId: "x", bound: 1 });
    assert.throws(() => apply({ kind: "dispatch", executionId: "x", bound: 1 }), /dispatch was refused \(exchange_unresolved\)/);
    assert.throws(() => started()({ kind: "dispatch", executionId: "x", bound: 0 }), /dispatch was refused \(invalid_batch_bound\)/);
  });

  test("a refused redelivery, takeover or recovery throws", () => {
    assert.throws(() => started()({ kind: "redeliver_dispatch", executionId: "x" }), /redelivery was refused \(no_unresolved_exchange\)/);
    assert.throws(() => started()({ kind: "takeover", executionId: "x" }), /takeover needs an open exchange/);
    assert.throws(() => started()({ kind: "recover", executionId: "x", availableDefinitionRevisions: [] }), /recover needs an open exchange/);
  });

  test("a command for an Execution the Kernel never created throws", () => {
    const apply = started();
    assert.throws(() => apply({ kind: "inspect", executionId: "nobody" }), /has not created/);
    assert.throws(() => apply({ kind: "accept_event", event: input("e", "nobody", "continue") }), /has not created/);
    assert.throws(() => apply(timer("x", "never", "to-never")), /never issued/);
  });

  test("a command the Kernel has no surface for throws if it reaches apply", () => {
    const apply = started();
    assert.throws(
      () => apply({ kind: "accept_event", event: { eventId: "r", destination: "x", kind: "effect.result", category: "kernel_event", correlation: "c" } }),
      /unsupported command reached apply: accept_event carries an Event of category kernel_event/,
    );
  });

  test("a create the Kernel refuses without naming an Execution throws", () => {
    const apply = startRun(kernelCandidate);
    // A creation key that is not well-formed text: the Kernel refuses before any Execution exists.
    assert.throws(() => apply(create("x", "\ud800", input("in-x", "x", "initial"))), /the create was refused without naming an Execution \(malformed_value\)/);
  });
});

describe("K1.4-candidate: bounded projections, recorded as limits (design check 01 D01-CHK-04, -05)", () => {
  test("acknowledged is the Kernel's acceptance order, not the order of acknowledgment", () => {
    // Older ineligible backlog, a newer input that ends the wait, then the older one acknowledged later.
    // The fixture's `cited-decision-edges` steps 14–20 expect acknowledgment order; that schedule is
    // refused at K1, and the choice of convention goes with its K2 unblock (017). This pins today's report.
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("initial", "x", "initial")));
    const first = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    apply({ kind: "accept_event", event: input("older", "x", "other") });
    apply({ kind: "accept_event", event: input("newer", "x", "continue") });
    const woken = apply({ kind: "submit_outcome", outcome: outcomeFor(first, { step: "await", wait: subscriptionWait("g") }) });
    assert.deepEqual([woken.state, woken.waitEndedReadiness], ["READY", [{ generation: "g", species: "event" }]]);

    const second = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    assert.deepEqual(second.dispatchedBatch, ["newer"]);
    const afterNewer = apply({ kind: "submit_outcome", outcome: outcomeFor(second, { step: "continue" }) });
    assert.deepEqual(afterNewer.acknowledged, ["initial", "newer"]);

    const third = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    assert.deepEqual(third.dispatchedBatch, ["older"]);
    const afterOlder = apply({ kind: "submit_outcome", outcome: outcomeFor(third, { step: "continue" }) });
    assert.deepEqual(afterOlder.acknowledged, ["initial", "older", "newer"], "acceptance order; acknowledgment order would be initial, newer, older");
  });

  test("effectIntents is a constant and the sink is never called, even when an Outcome proposes an Effect", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    const open = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const refused = apply({
      kind: "submit_outcome",
      outcome: outcomeFor(open, { step: "continue" }, { progress: { cursor: 1 }, effects: [{ proposalKey: "p", operation: "artifact.publish", input: { a: 1 } }] }),
    });
    assert.equal(refused.rejection?.classification, "malformed_envelope");
    assert.match(refused.rejection?.reason ?? "", /Effect proposals are not supported before K2/);
    assert.deepEqual(refused.effectIntents, []);
    assert.deepEqual([refused.state, refused.progressRevision, refused.progress, refused.acknowledged], ["RUNNING", 0, null, []]);
  });

  test("emissions are reported by the key the Runtime gave, and progress as a plain copy", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    const open = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const accepted = apply({
      kind: "submit_outcome",
      outcome: outcomeFor(open, { step: "continue" }, { progress: { b: [1, { c: null }], a: "x" }, emissions: [{ emissionId: "second", value: 2 }, { emissionId: "first", value: 1 }] }),
    });
    assert.deepEqual(accepted.emissions, ["second", "first"]);
    assert.deepEqual(accepted.progress, { a: "x", b: [1, { c: null }] });
    assert.equal(Object.getPrototypeOf(accepted.progress), Object.prototype);
    assert.equal(Object.isFrozen(accepted.progress), false);
  });
});

describe("K1.4-candidate: the fake Driver records and never decides (addendum §A9)", () => {
  const activation = (writerEpoch: number): Activation => ({
    executionId: "e",
    activationId: "a",
    writerEpoch,
    baseProgressRevision: 0,
    runtimeContractRevision: "r",
    definitionRevision: "d",
    progressCodec: "p",
    acceptedProgress: null,
    events: [],
    executionView: null,
  });
  const settlement = (calls: string[]): DeliverySettlement => ({ delivered: () => void calls.push("delivered"), failed: () => void calls.push("failed") });
  const grant = (writerEpoch: number): SubmissionGrant => Object.freeze({ executionId: "e", activationId: "a", writerEpoch });

  test("deliver reports delivered at once, returns undefined and keeps each attempt's own grant", () => {
    const driver = createFakeDriver();
    const calls: string[] = [];
    const first = grant(1);
    const second = grant(2);
    assert.equal(driver.deliver(activation(1), settlement(calls), first), undefined);
    assert.equal(driver.deliver(activation(1), settlement(calls), first), undefined);
    assert.equal(driver.deliver(activation(2), settlement(calls), second), undefined);
    assert.deepEqual(calls, ["delivered", "delivered", "delivered"]);
    assert.equal(driver.grantFor("e", "a", 1), first, "the superseded attempt keeps its own, retired grant");
    assert.equal(driver.grantFor("e", "a", 2), second);
    assert.equal(driver.grantFor("e", "a", 3), null);
    assert.equal(driver.grantFor("other", "a", 1), null);
    assert.equal(driver.deliveries.length, 3);
  });

  test("it answers safe-to-replace with true and records a cancellation request", () => {
    const driver = createFakeDriver();
    assert.equal(driver.isSafeToReplace?.(activation(1)), true);
    assert.equal(driver.requestCancellation?.({ executionId: "e", cause: "explicit", attempt: null }), undefined);
    assert.deepEqual(driver.cancellationRequests, [{ executionId: "e", cause: "explicit" }]);
  });

  test("through the Kernel: a takeover reaches the Driver as a second attempt with its own grant", () => {
    const apply = startRun(kernelCandidate);
    apply(create("x", "kx", input("in-x", "x", "initial")));
    const open = apply({ kind: "dispatch", executionId: "x", bound: 1 });
    const taken = apply({ kind: "takeover", executionId: "x" });
    // The superseded attempt presents the grant it was delivered: the Kernel fences it as stale.
    assert.equal(apply({ kind: "submit_outcome", outcome: outcomeFor(open, { step: "continue" }) }).rejection?.classification, "stale_exchange");
    assert.equal(apply({ kind: "submit_outcome", outcome: outcomeFor(taken, { step: "continue" }) }).state, "READY");
  });
});

describe("K1.4-candidate: the laboratory encoder (design check 01 D01-CHK-06 item 1)", () => {
  const vectors: readonly (readonly [string, unknown, string])[] = [
    ["members are sorted, arrays keep their order", { b: 1, a: [true, null, "x"] }, '{"a":[true,null,"x"],"b":1}'],
    ["numeric-looking keys sort as text, not as numbers", { "9": 2, "10": 1, a: 3 }, '{"10":1,"9":2,"a":3}'],
    ["an own __proto__ member is a member", JSON.parse('{"safe":2,"__proto__":{"x":1}}'), '{"__proto__":{"x":1},"safe":2}'],
    ["member order is by UTF-16 code unit", { "דּ": 1, "\u{1f600}": 2 }, '{"\u{1f600}":2,"דּ":1}'],
    ["negative zero is zero", -0, "0"],
    ["numbers use ECMAScript serialization", [1e21, 0.1, 1.5e-7, 100], "[1e+21,0.1,1.5e-7,100]"],
    ["strings escape only what JSON requires", "€\n\u000f\"\\/", '"€\\n\\u000f\\"\\\\/"'],
    ["empty containers", [{}, []], "[{},[]]"],
    ["a null-prototype record is a record", Object.assign(Object.create(null) as object, { k: "v" }), '{"k":"v"}'],
    ["null", null, "null"],
  ];

  for (const [title, value, expected] of vectors) {
    test(`golden: ${title}`, () => {
      assert.equal(canonicalText(value), expected);
      const bytes = canonicalBytes(value);
      assert.equal(new TextDecoder().decode(bytes), expected);
      assert.equal(validateCanonicalBytes(bytes).ok, true, "the Kernel accepts these bytes as canonical");
      assert.equal(canonicalText(decodeBytes(bytes)), expected, "decoding and encoding again is stable");
    });
  }

  test("each call returns a fresh byte root", () => {
    assert.notEqual(canonicalBytes({ a: 1 }), canonicalBytes({ a: 1 }));
  });

  const refusals: readonly (readonly [string, () => unknown])[] = [
    ["NaN", () => Number.NaN],
    ["an infinity", () => Number.POSITIVE_INFINITY],
    ["undefined", () => undefined],
    ["an undefined member", () => ({ a: undefined })],
    ["an undefined element", () => [undefined]],
    ["an array hole", () => [1, , 3]],
    ["an array with another member", () => Object.assign([1], { extra: true })],
    ["a lone surrogate", () => "\ud800"],
    ["a lone surrogate in a member name", () => ({ "\udc00": 1 })],
    ["an accessor member", () => Object.defineProperty({}, "a", { get: () => 1, enumerable: true })],
    ["a non-enumerable member", () => Object.defineProperty({}, "a", { value: 1, enumerable: false })],
    ["a symbol-keyed member", () => ({ [Symbol("s")]: 1 })],
    ["a Date", () => new Date(0)],
    ["a Map", () => new Map()],
    ["a class instance", () => new (class Point { x = 1; })()],
    ["a function", () => () => 1],
    ["a bigint", () => 1n],
    ["a typed array", () => new Uint8Array(1)],
  ];

  for (const [title, make] of refusals) {
    test(`refused, never repaired: ${title}`, () => {
      assert.throws(() => canonicalText(make()), UnsupportedLaboratoryValue);
      assert.throws(() => canonicalBytes({ nested: [make()] }), UnsupportedLaboratoryValue);
    });
  }

  test("JSON.stringify would have repaired several of these into another value", () => {
    // The reason the encoder refuses instead of delegating: these encodings are valid canonical bytes
    // of a different value, which Kernel validation would accept (D01-CHK-06 item 1).
    assert.equal(JSON.stringify(Number.NaN), "null");
    assert.equal(JSON.stringify({ a: undefined }), "{}");
    assert.equal(JSON.stringify([undefined]), "[null]");
    assert.equal(validateCanonicalBytes(new TextEncoder().encode("null")).ok, true);
  });

  test("plainCopy gives an unfrozen plain value equal to a frozen Kernel-style one", () => {
    const frozen = Object.freeze({ a: Object.freeze([1, Object.freeze({ b: null })]) });
    const copy = plainCopy(frozen);
    assert.deepEqual(copy, { a: [1, { b: null }] });
    assert.equal(Object.isFrozen(copy), false);
  });
});
