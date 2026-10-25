/**
 * K13-3 — registering a wait inside the Outcome decision (`waits.md` § Registering a wait; W-2,
 * CL-3). Corpus labels K13-A12, K13-A15 (the clock's reentry), K13-A18.
 *
 * The four W-2 steps run in one decision: acknowledge the whole batch; create generation g and test
 * every queued Event outside the batch, an eligible one retiring g at once with Event readiness;
 * otherwise compare a deadline with one accepted-time observation, `now >= deadline` minting g's one
 * timeout Event with deadline readiness; otherwise `WAITING`. One clock reading per decision, taken
 * only for a complete `await` whose wait has a deadline, before every state check.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { accepted, outcomeFor, refused } from "./harness.ts";
import { author, created, dispatch, grantOf, input, manualClock, submitAwait, submitNext, view, waitOn, type ManualClock } from "./waits-kit.ts";

describe("K13-3 each W-2 branch, one case each", () => {
  test("an eligible Event already queued retires the generation at registration: READY, Event readiness, no timeout", () => {
    const opened = created();
    const exchange = dispatch(opened);
    const eligibleId = input(opened, "s");
    const decision = accepted(submitAwait(opened, exchange, waitOn("s")));
    assert.equal(decision.nextState, "READY");
    assert.deepEqual(decision.wait, { generation: 1, result: "woken", timeoutEventId: null });
    const after = view(opened);
    assert.equal(after.state, "READY");
    assert.equal(after.wait, null);
    assert.deepEqual(after.waitEndedReadiness, { species: "event", generation: 1, timeoutEventId: null });
    assert.deepEqual(after.retiredWaits.map((r) => [r.generation, r.registeredBy, r.retiredBy, r.endingEventId]), [[1, exchange.activationId, "event", eligibleId]]);
    assert.equal(after.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout").length, 0);
  });

  for (const [name, reading] of [["now == deadline", 10], ["now > deadline", 11]] as const) {
    test(`nothing eligible and the deadline due (${name}): one timeout Event, deadline readiness, never WAITING (K13-A18)`, () => {
      const opened = created({ clock: manualClock(reading) });
      const exchange = dispatch(opened);
      const decision = accepted(submitAwait(opened, exchange, waitOn("s", 10)));
      assert.equal(decision.nextState, "READY");
      assert.equal(decision.wait?.result, "expired");
      const after = view(opened);
      const timeouts = after.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout");
      assert.equal(timeouts.length, 1, "exactly one timeout Event");
      const timeout = timeouts[0]!;
      assert.equal(timeout.eventId, decision.wait?.timeoutEventId);
      assert.deepEqual(
        { kind: timeout.kind, payload: timeout.payload, inputId: timeout.inputId, receipt: timeout.receipt, subscriptionClass: timeout.subscriptionClass, disposition: timeout.disposition },
        { kind: "kernel.wait.timeout", payload: null, inputId: null, receipt: null, subscriptionClass: null, disposition: { kind: "queued" } },
      );
      assert.equal(timeout.sourceCategory === "kernel_timeout" && timeout.waitGeneration, 1);
      assert.equal(timeout.sourceCategory === "kernel_timeout" && timeout.deadline, 10);
      assert.equal(timeout.acceptancePosition, decision.receipt.position, "a registration-time timeout shares its Outcome's acceptance position");
      assert.equal(after.receipts.length, 3, "the timeout mints no receipt");
      assert.deepEqual(after.waitEndedReadiness, { species: "deadline", generation: 1, timeoutEventId: timeout.eventId });
      assert.deepEqual(after.retiredWaits.map((r) => [r.retiredBy, r.endingEventId, r.deadline]), [["deadline", timeout.eventId, 10]]);
      assert.equal(after.wait, null);
      assert.equal(accepted(opened.kernel.submitInput(author, { destination: opened.executionId, requestKey: "next", kind: "k", payload: 1 } as never)).acceptancePosition, decision.receipt.position + 1);
    });
  }

  test("a deadline in the future leaves the generation live: WAITING (K13-A18 D-1)", () => {
    const opened = created({ clock: manualClock(9) });
    const exchange = dispatch(opened);
    const decision = accepted(submitAwait(opened, exchange, waitOn("s", 10)));
    assert.deepEqual(decision.wait, { generation: 1, result: "waiting", timeoutEventId: null });
    const after = view(opened);
    assert.equal(after.state, "WAITING");
    assert.deepEqual(after.wait && { generation: after.wait.generation, registeredBy: after.wait.registeredBy, deadline: after.wait.deadline }, { generation: 1, registeredBy: exchange.activationId, deadline: 10 });
    assert.equal(after.waitEndedReadiness, null);
  });

  test("no deadline leaves the generation live: WAITING", () => {
    const opened = created();
    const exchange = dispatch(opened);
    assert.equal(accepted(submitAwait(opened, exchange, waitOn("s"))).nextState, "WAITING");
    assert.equal(view(opened).wait?.deadline, null);
  });

  test("eligible and due at once: the Event wins and no timeout exists (the tie)", () => {
    const opened = created({ clock: manualClock(10) });
    const exchange = dispatch(opened);
    const eligibleId = input(opened, "s");
    const decision = accepted(submitAwait(opened, exchange, waitOn("s", 10)));
    assert.deepEqual(decision.wait, { generation: 1, result: "woken", timeoutEventId: null });
    assert.equal(view(opened).mailbox.some((entry) => entry.sourceCategory === "kernel_timeout"), false);
    assert.equal(view(opened).retiredWaits[0]?.endingEventId, eligibleId);
  });

  test("generations count accepted awaits, including those retired at registration", () => {
    const opened = created({ clock: manualClock(100) });
    let exchange = dispatch(opened);
    accepted(submitAwait(opened, exchange, waitOn("s", 5)));
    exchange = dispatch(opened);
    accepted(submitNext(opened, exchange));
    exchange = dispatch(opened);
    const third = accepted(submitAwait(opened, exchange, waitOn("s")));
    assert.equal(third.wait?.generation, 2, "the continue registered nothing");
  });
});

describe("K13-A12 the registering batch cannot wake its own wait (S0 e d z)", () => {
  for (const [label, deadline, reading] of [["no deadline", undefined, 0], ["a future deadline", 10, 0], ["a due deadline", 0, 0]] as const) {
    test(`bound 2 acknowledges e first; ${label}`, () => {
      const opened = created({ clock: manualClock(reading) });
      const e = input(opened, "s");
      const exchange = dispatch(opened, 2);
      assert.ok(exchange.batch.includes(e));
      const decision = accepted(submitAwait(opened, exchange, waitOn("s", deadline)));
      const after = view(opened);
      assert.equal(after.mailbox.find((entry) => entry.eventId === e)?.disposition.kind, "acknowledged");
      if (deadline === 0) {
        assert.equal(decision.wait?.result, "expired", "nothing outside the batch is eligible, so a due deadline mints T");
        assert.equal(after.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout").length, 1);
      } else {
        assert.equal(decision.wait?.result, "waiting");
        assert.equal(after.state, "WAITING");
      }
    });
    test(`bound 1 leaves e outside the batch, so it wakes the wait; ${label}`, () => {
      const opened = created({ clock: manualClock(reading) });
      const e = input(opened, "s");
      const exchange = dispatch(opened, 1);
      assert.ok(!exchange.batch.includes(e));
      const decision = accepted(submitAwait(opened, exchange, waitOn("s", deadline)));
      assert.deepEqual(decision.wait, { generation: 1, result: "woken", timeoutEventId: null });
      const after = view(opened);
      assert.equal(after.mailbox.find((entry) => entry.eventId === e)?.disposition.kind, "queued");
      assert.equal(after.mailbox.some((entry) => entry.sourceCategory === "kernel_timeout"), false);
      assert.deepEqual(after.waitEndedReadiness, { species: "event", generation: 1, timeoutEventId: null });
    });
  }
});

describe("K13-A18 one accepted-time observation, and no other clock read", () => {
  const openWith = (clock: ManualClock) => {
    const opened = created({ clock });
    return { ...opened, exchange: dispatch(opened) };
  };

  test("an await with a deadline reads the clock once; nothing else on the path reads it", () => {
    const clock = manualClock(0);
    const opened = openWith(clock);
    assert.equal(clock.reads, 0, "creation and dispatch read no clock");
    input(opened, "x");
    assert.equal(clock.reads, 0, "ingress reads no clock");
    accepted(submitAwait(opened, opened.exchange, waitOn("s", 10)));
    assert.equal(clock.reads, 1);
    accepted(submitAwait(opened, opened.exchange, waitOn("s", 10)));
    assert.equal(clock.reads, 2, "an exact replay of such an Outcome reads it too, and is answered from the record");
    opened.kernel.inspect(author, opened.executionId);
    opened.kernel.pendingTimers();
    assert.equal(clock.reads, 2, "inspection and the timer listing read no clock");
  });

  test("an await without a deadline, a continue, a refused or a stale proposal read no clock", () => {
    const clock = manualClock(0);
    const opened = openWith(clock);
    refused(submitAwait(opened, opened.exchange, waitOn("s", 10), { writerEpoch: 9 }));
    assert.equal(clock.reads, 1, "a complete await with a deadline is read before the checks, whatever they decide");
    refused(submitAwait(opened, opened.exchange, {}));
    assert.equal(clock.reads, 1, "an incomplete capture reads nothing");
    accepted(submitAwait(opened, opened.exchange, waitOn("s")));
    assert.equal(clock.reads, 1);
    const second = created({ clock: manualClock(0) });
    accepted(submitNext(second, dispatch(second)));
    assert.equal(second.clock.reads, 0);
  });

  for (const failure of ["throw", "nan", "negative", "fraction", "text"] as const) {
    test(`an unusable reading (${failure}) refuses the Outcome only when the deadline decides it`, () => {
      const clock = manualClock(0);
      clock.fail = failure;
      const opened = openWith(clock);
      const before = view(opened);
      const refusal = refused(submitAwait(opened, opened.exchange, waitOn("s", 10)));
      assert.equal(refusal.classification, "clock_unavailable");
      const after = view(opened);
      const { refusals: _a, ...restAfter } = after;
      const { refusals: _b, ...restBefore } = before;
      assert.deepEqual(restAfter, restBefore, "nothing of the proposal was accepted; the exchange stays open for a corrected one");
      input(opened, "s");
      const woken = accepted(submitAwait(opened, opened.exchange, waitOn("s", 10)));
      assert.equal(woken.wait?.result, "woken", "an eligible queued Event decides before the clock is consulted");
    });
  }

  test("an unusable reading does not override a replay or a fence", () => {
    const clock = manualClock(0);
    const opened = openWith(clock);
    const first = accepted(submitAwait(opened, opened.exchange, waitOn("s", 10)));
    clock.fail = "throw";
    assert.strictEqual(accepted(submitAwait(opened, opened.exchange, waitOn("s", 10))).receipt, first.receipt);
    assert.equal(refused(submitAwait(opened, opened.exchange, waitOn("s", 10), { activationId: "other" })).classification, "stale_exchange");
  });
});

describe("K13-A15 a reentrant clock is ordered before the decision that read it", () => {
  test("a clock that accepts an eligible input: the Outcome then finds it queued and wakes at registration", () => {
    const clock = manualClock(0);
    const opened = created({ clock });
    const exchange = dispatch(opened);
    let nested = "";
    clock.onRead = () => {
      nested = input(opened, "s");
    };
    const decision = accepted(submitAwait(opened, exchange, waitOn("s", 10)));
    assert.notEqual(nested, "");
    assert.deepEqual(decision.wait, { generation: 1, result: "woken", timeoutEventId: null });
    const after = view(opened);
    const nestedEntry = after.mailbox.find((entry) => entry.eventId === nested)!;
    assert.ok(nestedEntry.acceptancePosition < decision.receipt.position, "the nested input was accepted first, in its own decision");
    assert.equal(after.retiredWaits[0]?.endingEventId, nested);
  });

  test("a clock that answers the same exchange first: the outer Outcome is then a conflict or a replay", () => {
    const clock = manualClock(0);
    const opened = created({ clock });
    const exchange = dispatch(opened);
    clock.onRead = () => {
      accepted(submitNext(opened, exchange));
    };
    const outer = refused(opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, exchange, { next: { step: "await", wait: waitOn("s", 10) } }), grantOf(opened.driver, exchange.activationId)));
    assert.equal(outer.classification, "duplicate_conflict", "the nested continue was accepted first; the different await is not merged");
    assert.equal(view(opened).state, "READY");
  });
});
