/**
 * K1.3 correction (design 02): the owner's S1–S5 predicates, with review 01's counterexamples under
 * their stable IDs (K13-R01-S2-01, K13-R01-S4-02, K13-R01-CLOCK-03) and the positive controls that keep
 * every valid plan working.
 *
 * A guard case forms a real plan through the public coordinator and alters it at the owner's one entry,
 * `KernelState.prototype.apply`, as review 01's probe and `state-plans.test.ts` do. The altered plan is
 * internally consistent where the case says so: these are negative controls of structural guarantees,
 * not public-call schedules the coordinator produces. A refused plan must also leave inspection
 * unchanged, because every predicate is checked before the owner writes anything.
 *
 * The recording and rewriting inside `apply` run inside poison windows when the poisoned-prototype sweep
 * runs this file, so they use load-time references and own-data writes only.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import type { Plan } from "../src/plan.ts";
import { KernelState } from "../src/state.ts";
import { accepted, createRequest, recordOwn } from "./harness.ts";
import { author, created, dispatch, input, manualClock, submitAwait, submitNext, view, waitKey, waitOn, type Exchange, type Opened } from "./waits-kit.ts";

const ReflectApply = Reflect.apply;
const freeze = Object.freeze;
const originalApply = KernelState.prototype.apply;
const find = KernelState.prototype.find;

type PlanOf<K extends Plan["kind"]> = Extract<Plan, { kind: K }>;

/** Runs `run` with every plan of `kind` replaced by `rewrite(plan)` at the owner's entry. */
function rewriting<K extends Plan["kind"], T>(kind: K, rewrite: (plan: PlanOf<K>) => object, run: () => T): T {
  KernelState.prototype.apply = function (this: KernelState, plan: Plan): unknown {
    return ReflectApply(originalApply, this, [plan.kind === kind ? freeze(rewrite(plan as PlanOf<K>)) : plan]);
  } as KernelState["apply"];
  try {
    return run();
  } finally {
    KernelState.prototype.apply = originalApply;
  }
}

/** Asserts that the rewritten operation is refused by the owner naming `guard`, and changed nothing. */
function refusedWithoutChange<K extends Plan["kind"]>(opened: Opened, guard: RegExp, kind: K, rewrite: (plan: PlanOf<K>) => object, run: () => unknown): void {
  const before = view(opened);
  assert.throws(() => rewriting(kind, rewrite, run), guard);
  assert.deepEqual(view(opened), before, "the refused plan changed nothing");
}

/** The positions of the entries still queued. */
const queuedAt = (opened: Opened): number[] =>
  view(opened).mailbox.flatMap((entry, position) => (entry.disposition.kind === "queued" ? [position] : []));

const cancel = (opened: Opened) => opened.kernel.cancelExecution(author, opened.executionId);
const executionKey = (executionId: string) => ({ executionId, kind: "execution_deadline" as const, generation: null });

describe("K13-R01-S2-01 a terminal decision's positions are an exact cover of the queued Events", () => {
  test("a cancellation naming one queued position twice is refused, though its length equals the queued count", () => {
    const opened = created();
    input(opened, "s");
    assert.equal(queuedAt(opened).length, 2);
    refusedWithoutChange(opened, /S2/, "cancellation", (plan) => ({ ...plan, endAt: freeze([plan.endAt[0]!, plan.endAt[0]!]) }), () => cancel(opened));
  });

  test("the shared cancellation arm refuses the same plan formed by the Execution deadline's fire", () => {
    const opened = created({ executionDeadline: 5 });
    input(opened, "s");
    opened.clock.set(5);
    refusedWithoutChange(opened, /S2/, "cancellation", (plan) => ({ ...plan, endAt: freeze([plan.endAt[1]!, plan.endAt[1]!]) }), () => opened.kernel.fireTimer(executionKey(opened.executionId)));
  });

  for (const [step, next] of [["complete", { step: "complete", result: true }], ["fail", { step: "fail", error: { reason: "x" } }]] as const) {
    test(`a ${step} Outcome acknowledging and ending the same position is refused (review 01's overlap)`, () => {
      const opened = created();
      input(opened, "s");
      const exchange = dispatch(opened, 1);
      refusedWithoutChange(opened, /S2/, "outcome", (plan) => ({ ...plan, endAt: freeze([plan.acknowledgeAt[0]!]) }), () => submitNext(opened, exchange, next));
    });

    test(`a ${step} Outcome repeating a position within one list is refused`, () => {
      const opened = created();
      input(opened, "s");
      const exchange = dispatch(opened, 1);
      refusedWithoutChange(opened, /S2/, "outcome", (plan) => ({ ...plan, acknowledgeAt: freeze([plan.acknowledgeAt[0]!, plan.acknowledgeAt[0]!]), endAt: freeze([]) }), () => submitNext(opened, exchange, next));
    });
  }

  test("an Outcome naming a position that is not queued is refused, even with the right count", () => {
    const opened = created();
    input(opened, "s");
    const first = dispatch(opened, 1);
    accepted(submitNext(opened, first));
    // Position 0 is acknowledged now; naming it in place of the queued position 1 keeps the count at one.
    const exchange = dispatch(opened, 1);
    refusedWithoutChange(opened, /S2/, "outcome", (plan) => ({ ...plan, acknowledgeAt: freeze([0]) }), () => submitNext(opened, exchange, { step: "complete", result: true }));
  });

  test("positive controls: a valid disjoint partition completes, and a cancellation of two queued Events disposes both", () => {
    const completing = created();
    input(completing, "s");
    const exchange = dispatch(completing, 1);
    accepted(submitNext(completing, exchange, { step: "complete", result: true }));
    const completed = view(completing);
    assert.equal(completed.state, "COMPLETED");
    assert.deepEqual(completed.queued, []);
    assert.deepEqual(completed.mailbox.map((entry) => entry.disposition.kind), ["acknowledged", "terminal"]);

    const cancelling = created();
    input(cancelling, "s");
    accepted(cancel(cancelling));
    assert.deepEqual(view(cancelling).queued, []);
    assert.deepEqual(view(cancelling).mailbox.map((entry) => entry.disposition.kind), ["terminal", "terminal"]);
  });
});

describe("K13-R01-S4-02 every Outcome that creates a registration takes a fresh generation", () => {
  test("review 01's case: a second immediate expiry reusing generation 1 consistently is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    const old = view(opened).mailbox.find((entry) => entry.sourceCategory === "kernel_timeout")!;
    const exchange = dispatch(opened);
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({
      ...plan,
      registrations: 1,
      retired: freeze({ ...plan.retired!, generation: 1, endingEventId: old.eventId }),
      readiness: freeze({ ...plan.readiness!, generation: 1, timeoutEventId: old.eventId }),
      timeout: freeze({ ...plan.timeout!, generation: 1, eventId: old.eventId }),
    }), () => submitAwait(opened, exchange, waitOn("s", 0)));
  });

  test("a live registration reusing the last generation is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    const exchange = dispatch(opened);
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({ ...plan, registrations: 1, liveWait: freeze({ ...plan.liveWait!, generation: 1 }) }), () => submitAwait(opened, exchange, waitOn("s")));
  });

  test("an immediately woken registration reusing the last generation is refused", () => {
    const opened = created();
    const first = dispatch(opened, 1);
    input(opened, "s");
    accepted(submitAwait(opened, first, waitOn("s")));
    const exchange = dispatch(opened, 1);
    input(opened, "s");
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({
      ...plan,
      registrations: 1,
      retired: freeze({ ...plan.retired!, generation: 1 }),
      readiness: freeze({ ...plan.readiness!, generation: 1 }),
    }), () => submitAwait(opened, exchange, waitOn("s")));
  });

  test("a count that does not move under a new registration, or moves without one, is refused", () => {
    const registering = created();
    const exchange = dispatch(registering);
    refusedWithoutChange(registering, /S4/, "outcome", (plan) => ({ ...plan, registrations: 0 }), () => submitAwait(registering, exchange, waitOn("s")));
    const continuing = created();
    const plain = dispatch(continuing);
    refusedWithoutChange(continuing, /S4/, "outcome", (plan) => ({ ...plan, registrations: 1 }), () => submitNext(continuing, plain));
  });

  test("positive controls: successive generations 1, 2 and 3 expire, wake and stay live", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    const second = dispatch(opened, 1);
    input(opened, "s");
    assert.equal(accepted(submitAwait(opened, second, waitOn("s"))).wait?.result, "woken");
    accepted(submitAwait(opened, dispatch(opened, 1), waitOn("s")));
    const after = view(opened);
    assert.deepEqual(after.retiredWaits.map((wait) => [wait.generation, wait.retiredBy]), [[1, "deadline"], [2, "event"]]);
    assert.equal(after.wait?.generation, 3);
    assert.equal(after.state, "WAITING");
  });

  test("positive control: a duplicate host fire stays a recorded duplicate with one timeout", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    opened.clock.set(5);
    const first = opened.kernel.fireTimer(waitKey(opened.executionId, 1));
    const repeat = opened.kernel.fireTimer(waitKey(opened.executionId, 1));
    assert.equal(first.result, "expired");
    assert.deepEqual([repeat.result, repeat.timeoutEventId], ["duplicate", first.timeoutEventId]);
    const after = view(opened);
    assert.equal(after.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout").length, 1);
    assert.deepEqual(after.timerFires.map((fire) => fire.result), ["expired", "duplicate"]);
  });
});

describe("design 02 audit: the S1, S3, S4 and S5 predicates beyond review 01's cases", () => {
  test("S1: a delivery, takeover or control plan on a terminal record is refused by that rule", () => {
    const recorded: { plan: Plan; state: KernelState }[] = [];
    const opened = created();
    const ended = accepted(opened.kernel.createExecution(author, createRequest({ creationKey: "s1-ended" })));
    KernelState.prototype.apply = function (this: KernelState, plan: Plan): unknown {
      recordOwn(recorded, { plan, state: this });
      return ReflectApply(originalApply, this, [plan]);
    } as KernelState["apply"];
    let exchange: Exchange;
    try {
      exchange = dispatch(opened);
      accepted(opened.kernel.reportProtocolFailure(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1, diagnostic: "garbled" }));
      accepted(opened.kernel.requestTakeover(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1 }));
    } finally {
      KernelState.prototype.apply = originalApply;
    }
    const target = { ...opened, executionId: ended.executionId };
    const endedExchange = dispatch(target);
    accepted(submitNext(target, endedExchange, { step: "complete", result: null }));
    for (const kind of ["delivery", "control", "takeover"] as const) {
      const sample = recorded.find((row) => row.plan.kind === kind)!;
      const reader = ReflectApply(find, sample.state, [ended.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
      const before = view(target);
      assert.throws(() => ReflectApply(originalApply, sample.state, [freeze({ ...sample.plan, executionId: ended.executionId, basis: reader.version })]), /S1/, kind);
      assert.deepEqual(view(target), before, `the refused ${kind} plan changed nothing`);
    }
  });

  test("S3: an Outcome carrying both a live and a retired wait is refused", () => {
    const opened = created();
    const exchange = dispatch(opened);
    refusedWithoutChange(opened, /S3/, "outcome", (plan) => ({ ...plan, retired: freeze({ ...plan.liveWait!, retiredBy: "event", endingEventId: "event-forged" }) }), () => submitAwait(opened, exchange, waitOn("s")));
  });

  test("S3: a wake, expiry or cancellation that names the live generation but rewrites what it retires is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    for (const rewrite of [{ deadline: 99 }, { retiredBy: "deadline" }, { endingEventId: "event-forged" }, { registeredBy: "activation-forged" }, { declaration: freeze({ dependencies: [], subscriptions: [], deadline: 5 }) }]) {
      refusedWithoutChange(opened, /S3/, "input", (plan) => ({ ...plan, woken: freeze({ ...plan.woken!, ...rewrite }) }), () => input(opened, "s"));
    }
    opened.clock.set(5);
    refusedWithoutChange(opened, /S3/, "expiry", (plan) => ({ ...plan, retired: freeze({ ...plan.retired, endingEventId: "event-forged" }) }), () => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
    refusedWithoutChange(opened, /S3/, "cancellation", (plan) => ({ ...plan, retired: freeze({ ...plan.retired!, retiredBy: "event" }) }), () => cancel(opened));
    assert.equal(opened.kernel.fireTimer(waitKey(opened.executionId, 1)).result, "expired", "the unaltered fire still expires the live generation");
  });

  test("S4: a deadline retirement without its timeout, and a timeout that disagrees with its retirement, are refused", () => {
    const opened = created();
    const exchange = dispatch(opened);
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({ ...plan, timeout: null }), () => submitAwait(opened, exchange, waitOn("s", 0)));
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({ ...plan, timeout: freeze({ ...plan.timeout!, deadline: 1 }) }), () => submitAwait(opened, exchange, waitOn("s", 0)));
    const waiting = created();
    accepted(submitAwait(waiting, dispatch(waiting), waitOn("s", 5)));
    waiting.clock.set(5);
    refusedWithoutChange(waiting, /S4/, "expiry", (plan) => ({ ...plan, timeout: freeze({ ...plan.timeout, deadline: 6 }) }), () => waiting.kernel.fireTimer(waitKey(waiting.executionId, 1)));
  });

  test("S5: readiness for another generation, cause, selector or timeout Event is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    for (const rewrite of [{ generation: 2 }, { species: "deadline" }, { selector: freeze({ dependencies: [], subscriptions: [], deadline: 5 }) }, { timeoutEventId: "timeout-forged" }]) {
      refusedWithoutChange(opened, /S5/, "input", (plan) => ({ ...plan, readiness: freeze({ ...plan.readiness!, ...rewrite }) }), () => input(opened, "s"));
    }
    opened.clock.set(5);
    refusedWithoutChange(opened, /S5/, "expiry", (plan) => ({ ...plan, readiness: freeze({ ...plan.readiness, timeoutEventId: null }) }), () => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
    const expiring = created();
    const exchange = dispatch(expiring);
    refusedWithoutChange(expiring, /S5/, "outcome", (plan) => ({ ...plan, readiness: freeze({ ...plan.readiness!, timeoutEventId: null }) }), () => submitAwait(expiring, exchange, waitOn("s", 0)));
  });
});

describe("K13-R01-CLOCK-03 three deadline paths: due at registration, live wait, Execution deadline", () => {
  test("due at registration: the Outcome's own reading expires the wait, with no host fire and no pending timer", () => {
    const opened = created();
    const answer = accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    assert.equal(answer.wait?.result, "expired");
    const after = view(opened);
    assert.deepEqual([after.state, after.timerFires.length, after.waitEndedReadiness?.species], ["READY", 0, "deadline"]);
    assert.deepEqual(opened.kernel.pendingTimers(), []);
  });

  test("live wait: a deadline passed on the clock expires nothing until the host fires it", () => {
    const opened = created();
    assert.equal(accepted(submitAwait(opened, dispatch(opened), waitOn("s", 10))).wait?.result, "waiting");
    opened.clock.set(20);
    assert.equal(view(opened).state, "WAITING", "no instant enforcement");
    assert.deepEqual(opened.kernel.pendingTimers(), [{ executionId: opened.executionId, kind: "wait_deadline", generation: 1, deadline: 10 }]);
    assert.equal(opened.kernel.fireTimer(waitKey(opened.executionId, 1)).result, "expired");
    assert.equal(view(opened).state, "READY");
  });

  test("Execution deadline: fire-only; creation with a past deadline is READY, an earlier Outcome wins, the fire cancels", () => {
    const past = created({ clock: manualClock(10), executionDeadline: 5 });
    assert.equal(view(past).state, "READY", "creation never reads the clock");
    assert.equal(past.clock.reads, 0);
    accepted(submitNext(past, dispatch(past), { step: "complete", result: null }));
    assert.equal(past.kernel.fireTimer(executionKey(past.executionId)).result, "stale", "the Outcome accepted before the fire won");
    assert.equal(view(past).state, "COMPLETED");

    const fired = created({ clock: manualClock(10), executionDeadline: 5 });
    assert.equal(fired.kernel.fireTimer(executionKey(fired.executionId)).result, "cancelled");
    assert.equal(view(fired).state, "CANCELLED");
  });
});
