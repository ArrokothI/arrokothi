/**
 * K13-6 — out-of-band cancellation and its order (`lifecycle.md` § Cancellation order; CX-1–CX-6,
 * B-5). Corpus labels K13-A02, K13-A06, K13-A10, K13-A11, K13-A15, K13-A22; owner choice 01's
 * D01-CHK-06 cases; design check 01's cancel-power combinations (Q1).
 *
 * One cancellation decision: visibility, then the separate cancel power, then a terminal report, then
 * every queued Event terminal-disposed, any open exchange ended unacknowledged with its delivery log
 * kept, any wait retired and readiness discarded, `CANCELLED`, at an acceptance position with no
 * receipt. After it commits, the Driver is asked once to cancel the native work, never awaited.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import type { AuthenticatedCaller, ExecutionView } from "../src/index.ts";
import { accepted, caller, outcomeFor, refused } from "./harness.ts";
import { author, created, dispatch, grantOf, input, keepingDriver, manualClock, submitAwait, submitNext, view, waitKey, waitOn, type Opened } from "./waits-kit.ts";

const EXPLICIT_REASON = "Execution ended as CANCELLED before this Event was acknowledged";
const cancel = (opened: Opened, who: AuthenticatedCaller = author) => opened.kernel.cancelExecution(who, opened.executionId);

/** The facts every accepted cancellation must leave, against the view before it. */
function assertCancelled(before: ExecutionView, after: ExecutionView, message: string): void {
  assert.equal(after.state, "CANCELLED", message);
  assert.deepEqual(after.queued, [], `${message}: nothing stays queued`);
  assert.deepEqual(after.acknowledged, before.acknowledged, `${message}: nothing newly acknowledged`);
  assert.deepEqual(after.terminalDispositions, [...before.terminalDispositions, ...before.queued], `${message}: every queued Event terminal-disposed, in order`);
  for (const id of before.queued) assert.deepEqual(after.mailbox.find((entry) => entry.eventId === id)?.disposition, { kind: "terminal", reason: EXPLICIT_REASON });
  assert.equal(after.activation, null);
  assert.equal(after.wait, null);
  assert.equal(after.waitEndedReadiness, null);
  assert.deepEqual(after.receipts, before.receipts, `${message}: a cancellation mints no receipt`);
  assert.deepEqual(after.acceptedProgress, before.acceptedProgress);
  assert.equal(after.progressRevision, before.progressRevision);
  assert.deepEqual(after.emissions, before.emissions);
  const record = after.cancellation!;
  assert.equal(record.cause, "explicit");
  assert.equal(record.actorNamespace, author.namespace);
  assert.equal(record.actorScope, "tenant-a");
  assert.deepEqual(record.terminalDispositions, before.queued);
  assert.equal(record.endedExchange?.activationId ?? null, before.activation?.activationId ?? null);
  assert.equal(record.retiredGeneration, before.wait?.generation ?? null);
}

describe("K13-6 cancel power is separate from visibility, control and submission (design check Q1)", () => {
  const callers: readonly (readonly [string, AuthenticatedCaller, string])[] = [
    ["invisible, with cancel power", { namespace: "x", scopes: ["tenant-b"], cancelScopes: ["tenant-a"] } as AuthenticatedCaller, "unknown_destination"],
    ["visible, no power at all", { namespace: "x", scopes: ["tenant-a"] }, "unauthorized_control"],
    ["visible, exchange control only", { namespace: "x", scopes: ["tenant-a"], controlScopes: ["tenant-a"] }, "unauthorized_control"],
    ["visible, cancel power over another scope", { namespace: "x", scopes: ["tenant-a"], cancelScopes: ["tenant-b"] } as AuthenticatedCaller, "unauthorized_control"],
  ];
  for (const [name, who, classification] of callers) {
    test(name, () => {
      const opened = created();
      dispatch(opened);
      const before = view(opened);
      const refusal = refused(cancel(opened, who));
      assert.equal(refusal.classification, classification);
      if (classification === "unknown_destination") {
        assert.deepEqual(refusal, refused(opened.kernel.cancelExecution(who, "no-such-execution")), "hidden and missing answer alike");
        assert.deepEqual(view(opened), before);
      } else {
        assert.equal(refusal.executionId, opened.executionId, "scoped: the Execution is named");
        assert.deepEqual({ ...view(opened), refusals: before.refusals }, before, "only the refusal was recorded");
      }
    });
  }

  test("a submission grant authorizes no cancellation, and cancel power alone suffices", () => {
    const opened = created();
    dispatch(opened);
    const grantHolder = { namespace: "runtime", scopes: ["tenant-a"] };
    assert.equal(refused(cancel(opened, grantHolder)).classification, "unauthorized_control");
    assert.equal(accepted(cancel(opened, { namespace: "operator", scopes: ["tenant-a"], cancelScopes: ["tenant-a"] } as AuthenticatedCaller)).changed, true);
  });

  test("cancel power that only Object.prototype supplies is no power", () => {
    const opened = created();
    Object.defineProperty(Object.prototype, "cancelScopes", { value: ["tenant-a"], configurable: true, writable: true });
    try {
      assert.equal(refused(cancel(opened, { namespace: "x", scopes: ["tenant-a"] })).classification, "unauthorized_control");
    } finally {
      delete (Object.prototype as Record<string, unknown>).cancelScopes;
    }
    assert.equal(view(opened).state, "READY");
  });
});

describe("K13-6 cancellation in each nonterminal state", () => {
  const states: readonly (readonly [string, () => Opened])[] = [
    ["READY, ordinary", () => {
      const opened = created();
      input(opened, "x");
      return opened;
    }],
    ["READY with Event readiness", () => {
      const opened = created();
      accepted(submitAwait(opened, dispatch(opened), waitOn("s")));
      input(opened, "x");
      input(opened, "s");
      return opened;
    }],
    ["READY with deadline readiness and a queued timeout", () => {
      const opened = created({ clock: manualClock(0) });
      accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
      opened.clock.set(5);
      assert.equal(opened.kernel.fireTimer(waitKey(opened.executionId, 1)).result, "expired");
      return opened;
    }],
    ["RUNNING, with an outside-batch input", () => {
      const opened = created();
      input(opened, "x");
      dispatch(opened, 1);
      input(opened, "x");
      return opened;
    }],
    ["RUNNING with both recovery holds", () => {
      const opened = created();
      const exchange = dispatch(opened);
      accepted(opened.kernel.recoverExecution(author, opened.executionId, { activationId: exchange.activationId, available: { definitionRevisions: [], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] } } as never));
      accepted(opened.kernel.reportProtocolFailure(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1, diagnostic: "garbled" }));
      return opened;
    }],
    ["WAITING without a deadline", () => {
      const opened = created();
      accepted(submitAwait(opened, dispatch(opened), waitOn("s")));
      input(opened, "x");
      return opened;
    }],
    ["WAITING with a deadline", () => {
      const opened = created({ clock: manualClock(0) });
      accepted(submitAwait(opened, dispatch(opened), waitOn("s", 50)));
      return opened;
    }],
  ];
  for (const [name, build] of states) {
    test(name, () => {
      const opened = build();
      const before = view(opened);
      const decision = accepted(cancel(opened));
      const after = view(opened);
      assert.equal(decision.changed, true);
      assert.equal(decision.state, "CANCELLED");
      const { deliveries: _deliveries, ...facts } = after.cancellation!;
      assert.deepEqual(decision.cancellation, facts, "the answer carries the retained facts; the view adds the delivery log");
      assertCancelled(before, after, name);
      assert.equal(after.cancellation?.position, (before.receipts.at(-1)?.position ?? 0) + countUnreceipted(before) + 1, "the next acceptance position");
      if (before.wait !== null) assert.deepEqual(after.retiredWaits.at(-1) && [after.retiredWaits.at(-1)!.retiredBy, after.retiredWaits.at(-1)!.endingEventId], ["cancellation", null]);
      if (before.recoveryHolds.length > 0) {
        const ended = after.recoveryHistory.slice(before.recoveryHistory.length);
        assert.deepEqual(ended.map((record) => [record.cause, record.transition, record.authority, record.actorNamespace]), [
          ["pinned_code_unavailable", "ended_by_cancellation", "cancellation", author.namespace],
          ["protocol_failure", "ended_by_cancellation", "cancellation", author.namespace],
        ]);
      }
      assert.deepEqual(opened.kernel.pendingTimers(), [], "a cancelled Execution has no pending timer");
      assert.equal(refused(opened.kernel.dispatch(author, opened.executionId, { bound: 4 })).classification, "terminal_destination", "no Activation follows");
    });
  }
});

/** Positions taken without a receipt before `view`: timeouts minted by a fire. */
function countUnreceipted(v: ExecutionView): number {
  return v.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout" && !v.receipts.some((receipt) => receipt.position === entry.acceptancePosition)).length;
}

describe("K13-A10 cancellation against each Outcome step, in both acceptance orders", () => {
  const steps: readonly (readonly [string, unknown])[] = [
    ["continue", { step: "continue" }],
    ["await with a deadline", { step: "await", wait: waitOn("s", 50) }],
    ["complete", { step: "complete", result: { done: true } }],
    ["fail", { step: "fail", error: { reason: "x" } }],
  ];
  /** Two reserved Events and one outside the batch; the proposal carries progress and an Emission. */
  const prepared = () => {
    const opened = created({ clock: manualClock(0) });
    input(opened, "x");
    const exchange = dispatch(opened, 2);
    const outside = input(opened, "x");
    return { opened, exchange, outside };
  };
  const proposal = (opened: Opened, exchange: ReturnType<typeof dispatch>, next: unknown) =>
    outcomeFor(opened.executionId, exchange, { next, progress: { phase: "drafted", n: 3 }, emissions: [{ emissionKey: "draft", value: { text: "partial" } }] });

  for (const [name, next] of steps) {
    test(`cancellation first: the ${name} loses whole, and nothing of it is installed`, () => {
      const { opened, exchange } = prepared();
      accepted(cancel(opened));
      const before = view(opened);
      const refusal = refused(opened.kernel.submitOutcome(author, proposal(opened, exchange, next), grantOf(opened.driver, exchange.activationId)));
      assert.deepEqual([refusal.classification, refusal.reason], ["cancellation_terminal_conflict", "cancellation accepted before Outcome acceptance"]);
      const after = view(opened);
      assert.deepEqual({ ...after, refusals: before.refusals, losingOutcomes: before.losingOutcomes }, before, "no acknowledgment, progress, Emission, wait, deadline, readiness or result");
      assert.deepEqual(after.losingOutcomes.map((loser) => [loser.activationId, loser.writerEpoch, loser.baseProgressRevision, loser.refusal]), [[exchange.activationId, 1, 0, refusal]]);
      assert.equal(after.cancellation?.endedExchange?.activationId, exchange.activationId, "the reserved batch was terminal-disposed, never acknowledged (INV-12)");
      for (const id of exchange.batch) assert.equal(after.mailbox.find((entry) => entry.eventId === id)?.disposition.kind, "terminal");
    });

    test(`the ${name} first: accepted whole, then the cancellation`, () => {
      const { opened, exchange, outside } = prepared();
      const decision = accepted(opened.kernel.submitOutcome(author, proposal(opened, exchange, next), grantOf(opened.driver, exchange.activationId)));
      const before = view(opened);
      for (const id of exchange.batch) assert.equal(before.mailbox.find((entry) => entry.eventId === id)?.disposition.kind, "acknowledged");
      const answer = accepted(cancel(opened));
      const after = view(opened);
      if (decision.nextState === "COMPLETED" || decision.nextState === "FAILED") {
        assert.deepEqual(answer, { changed: false, state: decision.nextState, cancellation: null, result: before.result }, "the earlier terminal result is reported unchanged");
        assert.deepEqual(after, before);
      } else {
        assert.equal(answer.changed, true);
        assertCancelled(before, after, name);
        assert.ok(after.terminalDispositions.includes(outside));
        assert.deepEqual(after.emissions, before.emissions, "the accepted Emission stands");
        assert.equal(after.progressRevision, 1, "the accepted progress stands");
      }
    });
  }
});

describe("K13-A11 accepted history survives; new input is refused, replays still replay", () => {
  test("an older acknowledgment stands; reserved and backlog are terminal; input retries and fresh input", () => {
    const opened = created();
    const first = dispatch(opened, 1);
    const initial = first.batch[0]!;
    accepted(submitNext(opened, first));
    const reservedA = input(opened, "x", { n: "a" }, "key-a");
    const reservedB = input(opened, "x", { n: "b" }, "key-b");
    dispatch(opened, 2);
    const backlog = input(opened, "x", { n: "c" }, "key-c");
    accepted(cancel(opened));
    const after = view(opened);
    assert.deepEqual(after.mailbox.find((entry) => entry.eventId === initial)?.disposition, { kind: "acknowledged", activationId: first.activationId }, "the older acknowledgment is preserved");
    for (const id of [reservedA, reservedB, backlog]) assert.equal(after.mailbox.find((entry) => entry.eventId === id)?.disposition.kind, "terminal");
    const retry = accepted(opened.kernel.submitInput(author, { destination: opened.executionId, requestKey: "key-c", kind: "application.note", payload: { n: "c" }, subscriptionClass: "x" } as never));
    assert.equal(retry.replayed, true);
    assert.equal(retry.eventId, backlog);
    assert.equal(refused(opened.kernel.submitInput(author, { destination: opened.executionId, requestKey: "key-c", kind: "application.note", payload: { n: "changed" }, subscriptionClass: "x" } as never)).classification, "duplicate_conflict");
    const fresh = refused(opened.kernel.submitInput(author, { destination: opened.executionId, requestKey: "key-d", kind: "application.note", payload: null } as never));
    assert.equal(fresh.classification, "terminal_destination");
    assert.equal(view(opened).mailbox.length, after.mailbox.length, "nothing queued");
  });
});

describe("K13-6 repeated and terminal cancellation report and change nothing (CX-2)", () => {
  test("a repeated cancel returns the same cancellation with changed false, and requests nothing again", () => {
    const opened = created();
    dispatch(opened);
    const first = accepted(cancel(opened));
    const before = view(opened);
    const again = accepted(cancel(opened));
    assert.deepEqual(again, { changed: false, state: "CANCELLED", cancellation: first.cancellation, result: null });
    assert.strictEqual(again.cancellation, first.cancellation, "the retained record");
    assert.deepEqual(view(opened), before);
    assert.equal(opened.driver.cancellations.length, 1);
  });

  for (const step of ["complete", "fail"] as const) {
    test(`cancelling a ${step === "complete" ? "COMPLETED" : "FAILED"} Execution reports its result unchanged`, () => {
      const opened = created();
      const exchange = dispatch(opened);
      accepted(submitNext(opened, exchange, step === "complete" ? { step, result: 1 } : { step, error: 2 }));
      const before = view(opened);
      const answer = accepted(cancel(opened));
      assert.deepEqual(answer, { changed: false, state: before.state, cancellation: null, result: before.result });
      assert.deepEqual(view(opened), before);
      assert.equal(opened.driver.cancellations.length, 0, "no request: nothing was cancelled");
    });
  }
});

describe("K13-A22 every control after cancellation is refused with no change", () => {
  test("dispatch, redelivery, takeover, recovery and protocol-failure report", () => {
    const opened = created();
    const exchange = dispatch(opened);
    accepted(cancel(opened));
    const before = view(opened);
    assert.equal(refused(opened.kernel.dispatch(author, opened.executionId, { bound: 1 })).classification, "terminal_destination");
    assert.equal(refused(opened.kernel.redeliver(author, opened.executionId)).classification, "no_unresolved_exchange", "the established redelivery token (D01-CHK-04)");
    assert.equal(refused(opened.kernel.requestTakeover(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1 })).classification, "terminal_destination");
    assert.equal(refused(opened.kernel.recoverExecution(author, opened.executionId, { activationId: exchange.activationId, available: { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] } } as never)).classification, "terminal_destination");
    assert.equal(refused(opened.kernel.reportProtocolFailure(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1 })).classification, "terminal_destination");
    const after = view(opened);
    assert.deepEqual({ ...after, refusals: before.refusals }, before, "only refusals were recorded");
    assert.equal(opened.driver.seen.length, 1, "no Activation was delivered again");
  });

  test("COMPLETED and FAILED keep their established tokens", () => {
    for (const step of ["complete", "fail"] as const) {
      const opened = created();
      const exchange = dispatch(opened);
      accepted(submitNext(opened, exchange, step === "complete" ? { step, result: 1 } : { step, error: 2 }));
      assert.equal(refused(opened.kernel.redeliver(author, opened.executionId)).classification, "no_unresolved_exchange");
      assert.equal(refused(opened.kernel.dispatch(author, opened.executionId, { bound: 1 })).classification, "terminal_destination");
      assert.equal(refused(submitNext(opened, exchange, { step: "continue" }, { activationId: "other" })).classification, "terminal_destination");
    }
  });
});

describe("K13-A02 a cancelled exchange keeps its delivery log; late reports settle only their own rows", () => {
  test("delivered, failed, delivered: only the first report stands, and nothing logical changes", () => {
    const opened = created({ driver: keepingDriver() });
    dispatch(opened);
    accepted(cancel(opened));
    const before = view(opened);
    assert.deepEqual(before.cancellation?.deliveries.map((row) => row.status), ["pending"]);
    const capability = opened.driver.settlements[0]!;
    capability.delivered();
    capability.failed("late");
    capability.delivered();
    const after = view(opened);
    assert.deepEqual(after.cancellation?.deliveries.map((row) => [row.status, row.failure]), [["delivered", null]]);
    assert.deepEqual({ ...after, cancellation: before.cancellation }, before, "only the delivery row changed");
  });

  test("failed first, and a redelivery's second capability, each settle their own row", () => {
    const opened = created({ driver: keepingDriver() });
    dispatch(opened);
    accepted(opened.kernel.redeliver(author, opened.executionId));
    accepted(cancel(opened));
    const [first, second] = opened.driver.settlements;
    second!.failed("second lost");
    first!.delivered();
    second!.delivered();
    assert.deepEqual(view(opened).cancellation?.deliveries.map((row) => [row.attempt, row.status, row.failure]), [[1, "delivered", null], [2, "failed", "second lost"]]);
  });

  test("K13-A06 S4 e d q p p p: the third report still finds the cancelled exchange's row", () => {
    const opened = created({ clock: manualClock(0), driver: keepingDriver() });
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 10)));
    input(opened, "s");
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 20)));
    input(opened, "s");
    const third = dispatch(opened);
    accepted(cancel(opened));
    const before = view(opened);
    for (const capability of opened.driver.settlements) capability.delivered();
    const after = view(opened);
    assert.deepEqual(after.exchanges.map((exchange) => exchange.deliveries[0]?.status), ["delivered", "delivered"]);
    assert.equal(after.cancellation?.endedExchange?.activationId, third.activationId);
    assert.deepEqual(after.cancellation?.deliveries.map((row) => row.status), ["delivered"]);
    assert.deepEqual({ ...after, exchanges: before.exchanges, cancellation: before.cancellation }, before, "no logical state changed");
  });
});

describe("owner choice 01 (D01-CHK-06): the Driver is asked to cancel, never awaited", () => {
  test("from RUNNING the request carries the open attempt's coordinates", () => {
    const opened = created();
    const exchange = dispatch(opened);
    accepted(cancel(opened));
    assert.deepEqual(opened.driver.cancellations, [{ executionId: opened.executionId, cause: "explicit", attempt: { activationId: exchange.activationId, writerEpoch: 1 } }]);
    assert.ok(Object.isFrozen(opened.driver.cancellations[0]));
  });

  test("from WAITING, from READY after a resolved exchange, and from a fresh READY, the request names only the Execution", () => {
    const waiting = created();
    accepted(submitAwait(waiting, dispatch(waiting), waitOn("s")));
    const resolved = created();
    accepted(submitNext(resolved, dispatch(resolved)));
    const fresh = created();
    for (const opened of [waiting, resolved, fresh]) {
      accepted(cancel(opened));
      assert.deepEqual(opened.driver.cancellations, [{ executionId: opened.executionId, cause: "explicit", attempt: null }]);
    }
  });

  test("a throwing request, and a member whose getter throws, leave the committed cancellation unchanged", () => {
    const throwing = created({ driver: keepingDriver({ reportAtOnce: true, cancellation: "throw" }) });
    dispatch(throwing);
    assert.equal(accepted(cancel(throwing)).changed, true);
    assert.equal(view(throwing).state, "CANCELLED");
    const getterDriver = keepingDriver({ reportAtOnce: true, cancellation: "absent" });
    let looked = 0;
    Object.defineProperty(getterDriver, "requestCancellation", { get() { looked += 1; throw new Error("unreadable member"); }, configurable: true });
    const getter = created({ driver: getterDriver });
    dispatch(getter);
    assert.equal(accepted(cancel(getter)).changed, true);
    assert.equal(looked, 1, "the member was looked up once, and its throw contained");
    assert.equal(view(getter).state, "CANCELLED");
  });

  test("an absent member, or one only Object.prototype supplies, receives no request", () => {
    const absent = created({ driver: keepingDriver({ reportAtOnce: true, cancellation: "absent" }) });
    dispatch(absent);
    let ambient = 0;
    Object.defineProperty(Object.prototype, "requestCancellation", { value: () => { ambient += 1; }, configurable: true, writable: true });
    try {
      assert.equal(accepted(cancel(absent)).changed, true);
    } finally {
      delete (Object.prototype as Record<string, unknown>).requestCancellation;
    }
    assert.equal(ambient, 0);
  });

  test("a returned thenable is never read", () => {
    let reads = 0;
    const thenable = Object.defineProperty({}, "then", { get() { reads += 1; return () => undefined; } });
    const opened = created({ driver: keepingDriver({ reportAtOnce: true, cancellation: () => thenable }) });
    dispatch(opened);
    accepted(cancel(opened));
    assert.equal(reads, 0);
  });

  test("a request that reenters: its Outcome loses, and its delivery report settles only its own row", () => {
    let nested: ReturnType<Opened["kernel"]["submitOutcome"]> | null = null;
    const holder: { opened?: Opened; exchange?: ReturnType<typeof dispatch> } = {};
    const driver = keepingDriver({
      cancellation: () => {
        const opened = holder.opened!;
        const exchange = holder.exchange!;
        nested = opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, exchange, { next: { step: "complete", result: 1 } }), grantOf(opened.driver, exchange.activationId));
        opened.driver.settlements[0]!.delivered();
        return undefined;
      },
    });
    const opened = created({ driver });
    holder.opened = opened;
    holder.exchange = dispatch(opened);
    accepted(cancel(opened));
    assert.equal(refused(nested!).classification, "cancellation_terminal_conflict");
    const after = view(opened);
    assert.equal(after.state, "CANCELLED");
    assert.equal(after.result, null);
    assert.deepEqual(after.cancellation?.deliveries.map((row) => row.status), ["delivered"]);
  });
});

describe("K13-A15 reentrant host code is ordered before the decision that ran it", () => {
  test("a cancelScopes getter that completes the exchange: the cancellation then reports COMPLETED", () => {
    const opened = created();
    const exchange = dispatch(opened);
    const who = {
      namespace: "operator",
      scopes: ["tenant-a"],
      get cancelScopes(): readonly string[] {
        accepted(submitNext(opened, exchange, { step: "complete", result: { done: true } }));
        return ["tenant-a"];
      },
    } as AuthenticatedCaller;
    const answer = accepted(cancel(opened, who));
    assert.equal(answer.changed, false);
    assert.equal(answer.state, "COMPLETED");
    assert.equal(view(opened).state, "COMPLETED");
  });

  test("a clock that cancels during an await's reading: the outer Outcome loses", () => {
    const clock = manualClock(0);
    const opened = created({ clock });
    const exchange = dispatch(opened);
    clock.onRead = () => {
      accepted(cancel(opened));
    };
    const outer = refused(submitAwait(opened, exchange, waitOn("s", 10)));
    assert.equal(outer.classification, "cancellation_terminal_conflict");
    assert.equal(view(opened).wait, null);
  });

  test("a clock that cancels during a fire: the fire then resolves against CANCELLED", () => {
    const clock = manualClock(0);
    const opened = created({ clock });
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 10)));
    clock.set(10);
    clock.onRead = () => {
      accepted(cancel(opened));
    };
    const answer = opened.kernel.fireTimer(waitKey(opened.executionId, 1));
    assert.deepEqual([answer.result, answer.reason], ["stale", "generation already ended by cancellation"]);
    assert.equal(view(opened).mailbox.some((entry) => entry.sourceCategory === "kernel_timeout"), false, "no timeout after the cancellation");
  });

  test("a takeover whose safety callback cancels is refused as terminal_destination (K1.2-DEC-19)", () => {
    const driver = keepingDriver({ reportAtOnce: true });
    const opened = created({ driver });
    const exchange = dispatch(opened);
    driver.isSafeToReplace = () => {
      accepted(cancel(opened));
      return true;
    };
    assert.equal(refused(opened.kernel.requestTakeover(caller("app-a", "tenant-a"), opened.executionId, { activationId: exchange.activationId, writerEpoch: 1 })).classification, "terminal_destination");
    assert.equal(view(opened).state, "CANCELLED");
  });
});
