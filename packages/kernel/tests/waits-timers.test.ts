/**
 * K13-4 — ending a wait by expiry, and every other timer fire (`waits.md` § Ending a wait; W-3, W-9).
 * Corpus labels K13-A03, K13-A13; design 01 § 7 and addendum 01 § A5 (D01-CHK-05's key rules).
 *
 * A fire is a hint the Kernel resolves against its own clock reading and current state. Only the live
 * generation of a `WAITING` Execution whose deadline is reached expires, minting its one timeout Event;
 * a repeat names that Event (`duplicate`); a generation ended by an Event or replaced is `stale`; an
 * early fire is `not_due`; an unusable clock is `clock_unavailable`. Every fire that names an Execution
 * is recorded, and only an expiry changes logical state. Generation fencing applies to timers, never to
 * ordinary results: a late input stays an accepted fact a later wait can match.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { accepted } from "./harness.ts";
import { author, created, dispatch, input, manualClock, sameExcept, submitAwait, submitNext, view, waitKey, waitOn, type Opened } from "./waits-kit.ts";

/** A `WAITING` Execution on generation 1 with deadline 10, the clock at 0. */
function waiting(): Opened {
  const opened = created({ clock: manualClock(0) });
  accepted(submitAwait(opened, dispatch(opened), waitOn("s", 10)));
  return opened;
}

const fire = (opened: Opened, key: unknown) => opened.kernel.fireTimer(key as never);

describe("K13-4 the timer listing", () => {
  test("lists every live wait deadline in creation order, and nothing retired, woken, deadline-less or terminal", () => {
    const clock = manualClock(0);
    const first = created({ clock });
    const kernel = first.kernel;
    accepted(submitAwait(first, dispatch(first), waitOn("s", 10)));
    assert.deepEqual(kernel.pendingTimers(), [{ executionId: first.executionId, kind: "wait_deadline", generation: 1, deadline: 10 }]);
    const listed = kernel.pendingTimers()[0]!;
    assert.ok(Object.isFrozen(listed));
    input(first, "s");
    assert.deepEqual(kernel.pendingTimers(), [], "a woken generation is no longer listed");
    accepted(submitAwait(first, dispatch(first), waitOn("s")));
    assert.deepEqual(kernel.pendingTimers(), [], "a live wait without a deadline has no timer");
  });

  test("a terminal Execution has no pending timer (the DTFx trap)", () => {
    const opened = waiting();
    clockTo(opened, 10);
    assert.equal(fire(opened, waitKey(opened.executionId, 1)).result, "expired");
    accepted(submitNext(opened, dispatch(opened), { step: "complete", result: null }));
    assert.deepEqual(opened.kernel.pendingTimers(), []);
    const before = view(opened);
    assert.equal(fire(opened, waitKey(opened.executionId, 1)).result, "duplicate", "a fire after the terminal state changes nothing (durabletask-python PR #280)");
    sameExcept(before, view(opened), ["timerFires"]);
  });
});

function clockTo(opened: Opened, value: number): void {
  opened.clock.set(value);
}

describe("K13-4 resolving a fire", () => {
  test("the live generation's deadline reached: expired, one timeout Event at the next position, deadline readiness, READY", () => {
    const opened = waiting();
    clockTo(opened, 10);
    const before = view(opened);
    const answer = fire(opened, waitKey(opened.executionId, 1));
    assert.equal(answer.result, "expired");
    const after = view(opened);
    assert.equal(after.state, "READY");
    assert.equal(after.wait, null);
    const timeout = after.mailbox.at(-1)!;
    assert.equal(timeout.eventId, answer.timeoutEventId);
    assert.equal(timeout.sourceCategory, "kernel_timeout");
    assert.equal(timeout.acceptancePosition, accepted(opened.kernel.inspect(author, opened.executionId)).receipts.at(-1)!.position + 1, "the timeout took the next position, with no receipt");
    assert.equal(after.receipts.length, before.receipts.length, "timeout acceptance mints no receipt");
    assert.deepEqual(after.waitEndedReadiness, { species: "deadline", generation: 1, timeoutEventId: answer.timeoutEventId });
    assert.deepEqual(after.retiredWaits.map((r) => [r.generation, r.retiredBy, r.endingEventId]), [[1, "deadline", answer.timeoutEventId]]);
    assert.deepEqual(after.timerFires, [{ timer: "wait_deadline", generation: 1, observedAt: 10, result: "expired", reason: answer.reason, timeoutEventId: answer.timeoutEventId }]);
    assert.deepEqual(opened.kernel.pendingTimers(), []);
  });

  test("an early fire is not_due; only the fire record changes", () => {
    const opened = waiting();
    clockTo(opened, 9);
    const before = view(opened);
    assert.equal(fire(opened, waitKey(opened.executionId, 1)).result, "not_due");
    sameExcept(before, view(opened), ["timerFires"]);
    assert.deepEqual(view(opened).timerFires.map((f) => [f.result, f.observedAt]), [["not_due", 9]]);
  });

  test("an unusable clock is clock_unavailable; a coordinator without a clock reads nothing", () => {
    const opened = waiting();
    clockTo(opened, 50);
    opened.clock.fail = "throw";
    const before = view(opened);
    assert.equal(fire(opened, waitKey(opened.executionId, 1)).result, "clock_unavailable");
    sameExcept(before, view(opened), ["timerFires"]);
    assert.equal(view(opened).timerFires[0]?.observedAt, null);
    opened.clock.fail = null;
    assert.equal(fire(opened, waitKey(opened.executionId, 1)).result, "expired", "the fire is a hint: a later one resolves again");
  });

  test("K13-A13 a repeated expiry fire is a duplicate naming the one timeout: before and after reservation, after the next Outcome, during the next generation", () => {
    const opened = waiting();
    clockTo(opened, 10);
    const t1 = fire(opened, waitKey(opened.executionId, 1)).timeoutEventId;
    const check = (where: string): void => {
      const before = view(opened);
      const again = fire(opened, waitKey(opened.executionId, 1));
      assert.deepEqual([again.result, again.timeoutEventId], ["duplicate", t1], where);
      sameExcept(before, view(opened), ["timerFires"], `${where}: no second timeout, readiness or logical change`);
    };
    check("before reservation");
    const exchange = dispatch(opened);
    assert.deepEqual(exchange.batch, [t1]);
    check("after reservation");
    accepted(submitAwait(opened, exchange, waitOn("s", 20)));
    check("during generation 2");
    assert.equal(view(opened).mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout").length, 1, "one stable timeout for generation 1");
  });

  test("K13-A13 the key of a generation that expired at registration: built from the decision, a duplicate", () => {
    const opened = created({ clock: manualClock(10) });
    const decision = accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    assert.equal(decision.wait?.result, "expired");
    assert.deepEqual(opened.kernel.pendingTimers(), [], "never listed");
    const answer = fire(opened, waitKey(opened.executionId, decision.wait!.generation));
    assert.deepEqual([answer.result, answer.timeoutEventId], ["duplicate", decision.wait?.timeoutEventId]);
  });

  test("a generation woken by an Event: its fire is stale, before and after the deadline", () => {
    const opened = waiting();
    input(opened, "s");
    for (const reading of [5, 10]) {
      clockTo(opened, reading);
      const before = view(opened);
      const answer = fire(opened, waitKey(opened.executionId, 1));
      assert.deepEqual([answer.result, answer.reason], ["stale", "generation already ended by an eligible Event"]);
      sameExcept(before, view(opened), ["timerFires"]);
    }
  });

  test("a generation woken at registration: its fire is stale", () => {
    const opened = created({ clock: manualClock(0) });
    const exchange = dispatch(opened);
    input(opened, "s");
    const decision = accepted(submitAwait(opened, exchange, waitOn("s", 10)));
    clockTo(opened, 10);
    assert.equal(fire(opened, waitKey(opened.executionId, decision.wait!.generation)).result, "stale");
  });

  test("W-9 case 2: a stale fire of generation 1 while generation 2 is live leaves generation 2 untouched", () => {
    const opened = waiting();
    input(opened, "s");
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 30)));
    clockTo(opened, 15);
    const before = view(opened);
    assert.equal(fire(opened, waitKey(opened.executionId, 1)).result, "stale");
    sameExcept(before, view(opened), ["timerFires"]);
    assert.equal(view(opened).wait?.generation, 2);
  });

  for (const retiredBy of ["event", "timeout"] as const) {
    test(`K13-A03 S4 e d w, then g2 retired by ${retiredBy}: its fire leaves g3 untouched`, () => {
      const opened = waiting();
      input(opened, "s");
      accepted(submitAwait(opened, dispatch(opened), waitOn("s", 20)));
      let t2: string | null = null;
      if (retiredBy === "event") input(opened, "s");
      else {
        clockTo(opened, 20);
        t2 = fire(opened, waitKey(opened.executionId, 2)).timeoutEventId;
      }
      accepted(submitAwait(opened, dispatch(opened), waitOn("s", 40)));
      clockTo(opened, 25);
      const before = view(opened);
      const answer = fire(opened, waitKey(opened.executionId, 2));
      if (retiredBy === "event") assert.equal(answer.result, "stale");
      else assert.deepEqual([answer.result, answer.timeoutEventId], ["duplicate", t2]);
      sameExcept(before, view(opened), ["timerFires"], "g3, its deadline and readiness unchanged; no new timeout or wake");
      assert.deepEqual([view(opened).wait?.generation, view(opened).wait?.deadline], [3, 40]);
      assert.equal(fire(opened, waitKey(opened.executionId, 2)).result, retiredBy === "event" ? "stale" : "duplicate", "its repeat is classified the same way");
    });
  }

  test("W-6 case 4: a result arriving after expiry is not fenced; a later wait matches it at registration", () => {
    const opened = waiting();
    clockTo(opened, 10);
    const t1 = fire(opened, waitKey(opened.executionId, 1)).timeoutEventId;
    const late = input(opened, "s");
    assert.equal(view(opened).waitEndedReadiness?.species, "deadline", "an input accepted while READY creates no readiness (B-8)");
    const exchange = dispatch(opened, 1);
    assert.deepEqual(exchange.batch, [t1], "the timeout is mandatory; the late input stays queued at bound 1");
    const decision = accepted(submitAwait(opened, exchange, waitOn("s", 50)));
    assert.deepEqual(decision.wait, { generation: 2, result: "woken", timeoutEventId: null });
    assert.equal(view(opened).retiredWaits[1]?.endingEventId, late);
  });
});

describe("K13-4 the timer key (D01-CHK-05)", () => {
  test("only the key's own executionId, kind and generation are read; a descriptive deadline cannot accelerate expiry", () => {
    const opened = waiting();
    clockTo(opened, 5);
    assert.equal(fire(opened, { ...waitKey(opened.executionId, 1), deadline: 0 }).result, "not_due");
    const listed = opened.kernel.pendingTimers()[0]!;
    clockTo(opened, 10);
    assert.equal(fire(opened, listed).result, "expired", "a listed timer fires as its key");
  });

  test("each key field is observed once, own fields only", () => {
    const opened = waiting();
    const reads: string[] = [];
    const key = {} as Record<string, unknown>;
    for (const [name, value] of [["executionId", opened.executionId], ["kind", "wait_deadline"], ["generation", 1], ["deadline", 0]] as const) {
      Object.defineProperty(key, name, { get() { reads.push(name); return value; }, enumerable: true });
    }
    fire(opened, key);
    assert.deepEqual(reads, ["executionId", "kind", "generation"]);
    const inherited = Object.create({ executionId: opened.executionId, kind: "wait_deadline", generation: 1 }) as object;
    assert.deepEqual(fire(opened, inherited), { result: "unknown", reason: "malformed timer key", timeoutEventId: null });
  });

  test("malformed keys and unknown Executions answer unknown and record nothing, without reading the clock", () => {
    const opened = waiting();
    const before = view(opened);
    const throwing = Object.defineProperty({}, "executionId", { get() { throw new Error("unreadable"); }, enumerable: true });
    const keys: unknown[] = [
      null, 5, "key", {}, throwing,
      { executionId: 5, kind: "wait_deadline", generation: 1 },
      { executionId: opened.executionId, kind: "lease", generation: 1 },
      { executionId: opened.executionId, kind: "wait_deadline", generation: 0 },
      { executionId: opened.executionId, kind: "wait_deadline", generation: 1.5 },
      { executionId: opened.executionId, kind: "wait_deadline", generation: "1" },
      { executionId: opened.executionId, kind: "wait_deadline", generation: null },
      { executionId: opened.executionId, kind: "execution_deadline", generation: 1 },
    ];
    keys.forEach((key, index) => {
      assert.deepEqual(fire(opened, key), { result: "unknown", reason: "malformed timer key", timeoutEventId: null }, `malformed key ${index}`);
    });
    assert.deepEqual(fire(opened, waitKey("no-such-execution", 1)), { result: "unknown", reason: "no such Execution", timeoutEventId: null });
    assert.equal(opened.clock.reads, 1, "only the registration read the clock");
    assert.deepEqual(view(opened), before);
  });

  test("a never-issued generation and one issued without a deadline are stale, and recorded", () => {
    const opened = created({ clock: manualClock(0) });
    accepted(submitAwait(opened, dispatch(opened), waitOn("s")));
    assert.deepEqual([fire(opened, waitKey(opened.executionId, 7)).result, view(opened).timerFires.at(-1)?.reason], ["stale", "generation never issued"]);
    assert.deepEqual([fire(opened, waitKey(opened.executionId, 1)).result, view(opened).timerFires.at(-1)?.reason], ["stale", "generation had no deadline"]);
    assert.equal(view(opened).state, "WAITING");
  });

  test("a fire reads the clock once per key that names an Execution", () => {
    const opened = waiting();
    const start = opened.clock.reads;
    fire(opened, waitKey(opened.executionId, 1));
    fire(opened, waitKey(opened.executionId, 9));
    fire(opened, { executionId: opened.executionId, kind: "execution_deadline", generation: null });
    assert.equal(opened.clock.reads, start + 3);
  });

  test("an Execution key on an Execution without an Execution deadline is stale", () => {
    const opened = waiting();
    const answer = fire(opened, { executionId: opened.executionId, kind: "execution_deadline", generation: null });
    assert.deepEqual([answer.result, answer.reason], ["stale", "this Execution has no Execution deadline"]);
    assert.deepEqual(view(opened).timerFires.at(-1)?.timer, "execution_deadline");
  });

  test("the timeout Event ID is a pure function of the Execution and generation", () => {
    const opened = waiting();
    clockTo(opened, 10);
    const answer = fire(opened, waitKey(opened.executionId, 1));
    const packed = (parts: string[]) => parts.map((part) => `${part.length}:${part}`).join("");
    assert.equal(answer.timeoutEventId, `timeout-${packed([opened.executionId, "1"])}`);
  });
});
