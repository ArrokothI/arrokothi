/**
 * K13-7 — the Execution deadline (`operations.md` § Three clocks; CL-1; owner decision 1; owner choice
 * 01, D01-CHK-07). Corpus labels K13-A16, K13-A17, K13-A24.
 *
 * The deadline is an optional creation-request field in creation's canonical content: an exact retry
 * replays, an added, removed or changed deadline conflicts, and nothing changes it later. Enforcement is
 * fire-only: creation never reads the clock, so a deadline already past creates a `READY` Execution, and
 * only an accepted host fire expires it, through the same cancellation decision as `cancelExecution`. An
 * Outcome or a dispatch accepted before that fire may win. Accepted expiry mints no timeout Event,
 * accepts no later progress, and cannot reopen `COMPLETED` or `FAILED`.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import type { ExecutionView } from "../src/index.ts";
import { ExecutionCoordinator } from "./binding-facade.ts";
import { accepted, createRequest, refused } from "./harness.ts";
import { author, created, dispatch, input, keepingDriver, manualClock, submitAwait, submitNext, view, waitKey, waitOn, type Opened } from "./waits-kit.ts";

const DEADLINE_REASON = "Execution ended as CANCELLED (its Execution deadline expired) before this Event was acknowledged";
const executionKey = (executionId: string) => ({ executionId, kind: "execution_deadline" as const, generation: null });
const withDeadline = (deadline: number | undefined, key = "report-17") =>
  (deadline === undefined ? createRequest({ creationKey: key }) : { ...createRequest({ creationKey: key }), executionDeadline: deadline }) as never;

describe("K13-A17 the Execution deadline is creation content (owner decision 1)", () => {
  test("an exact retry replays; an added, removed or changed deadline conflicts", () => {
    const kernel = new ExecutionCoordinator({ driver: keepingDriver(), clock: manualClock(0) });
    const first = accepted(kernel.createExecution(author, withDeadline(0, "with")));
    assert.strictEqual(accepted(kernel.createExecution(author, withDeadline(0, "with"))).receipt, first.receipt);
    for (const changed of [undefined, 1]) assert.equal(refused(kernel.createExecution(author, withDeadline(changed, "with"))).classification, "duplicate_conflict");
    accepted(kernel.createExecution(author, withDeadline(undefined, "without")));
    assert.equal(refused(kernel.createExecution(author, withDeadline(5, "without"))).classification, "duplicate_conflict", "adding a deadline under the same key conflicts");
    assert.equal(accepted(kernel.createExecution(author, { ...createRequest({ creationKey: "without" }), executionDeadline: undefined } as never)).replayed, true, "an absent field and undefined are the same request");
    assert.equal(accepted(kernel.inspect(author, first.executionId)).executionDeadline, 0);
  });

  test("an identity without a deadline is unchanged by K1.3: the six-part packing still names it", () => {
    const kernel = new ExecutionCoordinator({ driver: keepingDriver() });
    const plain = accepted(kernel.createExecution(author, createRequest()));
    assert.equal(accepted(kernel.inspect(author, plain.executionId)).executionDeadline, null);
    assert.equal(accepted(kernel.createExecution(author, createRequest())).replayed, true);
  });

  for (const [name, deadline] of [["negative", -1], ["fractional", 1.5], ["beyond the safe integers", Number.MAX_SAFE_INTEGER + 1], ["text", "5"], ["null", null]] as const) {
    test(`a ${name} deadline is refused as a malformed value`, () => {
      const kernel = new ExecutionCoordinator({ driver: keepingDriver(), clock: manualClock(0) });
      const refusal = refused(kernel.createExecution(author, withDeadline(deadline as never)));
      assert.equal(refusal.classification, "malformed_value");
      assert.match(refusal.reason, /executionDeadline unsupported_form/);
      assert.deepEqual(kernel.visibleExecutions(author), []);
    });
  }

  test("a coordinator without a clock refuses a deadline as deadline_unsupported", () => {
    const kernel = new ExecutionCoordinator({ driver: keepingDriver() });
    const refusal = refused(kernel.createExecution(author, withDeadline(5)));
    assert.deepEqual([refusal.classification, /executionDeadline deadline_unsupported/.test(refusal.reason)], ["malformed_value", true]);
  });
});

describe("owner choice 01 (D01-CHK-07): fire-only enforcement", () => {
  test("creation with a deadline already past is READY, dispatches, and reads no clock", () => {
    const clock = manualClock(100);
    const opened = created({ clock, executionDeadline: 5 });
    assert.equal(clock.reads, 0, "creation never reads the clock");
    assert.equal(view(opened).state, "READY");
    assert.deepEqual(opened.kernel.pendingTimers(), [{ executionId: opened.executionId, kind: "execution_deadline", generation: null, deadline: 5 }]);
    dispatch(opened);
    assert.equal(view(opened).state, "RUNNING", "a dispatch accepted before the fire wins");
  });

  test("an Outcome accepted before the fire wins; the later fire is stale on COMPLETED", () => {
    const opened = created({ clock: manualClock(100), executionDeadline: 5 });
    accepted(submitNext(opened, dispatch(opened), { step: "complete", result: { done: true } }));
    const before = view(opened);
    const answer = opened.kernel.fireTimer(executionKey(opened.executionId));
    assert.deepEqual([answer.result, answer.reason], ["stale", "the Execution already ended as COMPLETED"]);
    assert.deepEqual({ ...view(opened), timerFires: before.timerFires }, before, "COMPLETED is never reopened");
    assert.deepEqual(opened.kernel.pendingTimers(), []);
  });

  test("a fire before the Outcome cancels, and the Outcome then loses", () => {
    const opened = created({ clock: manualClock(100), executionDeadline: 5 });
    const exchange = dispatch(opened);
    const answer = opened.kernel.fireTimer(executionKey(opened.executionId));
    assert.deepEqual([answer.result, answer.timeoutEventId], ["cancelled", null]);
    const after = view(opened);
    assert.equal(after.state, "CANCELLED");
    assert.deepEqual([after.cancellation?.cause, after.cancellation?.actorNamespace, after.cancellation?.actorScope], ["execution_deadline", "app-a", "tenant-a"]);
    for (const id of exchange.batch) assert.deepEqual(after.mailbox.find((entry) => entry.eventId === id)?.disposition, { kind: "terminal", reason: DEADLINE_REASON });
    assert.equal(after.mailbox.some((entry) => entry.sourceCategory === "kernel_timeout"), false, "accepted expiry mints no timeout Event");
    assert.deepEqual(after.timerFires.map((fire) => [fire.timer, fire.result, fire.generation]), [["execution_deadline", "cancelled", null]]);
    assert.equal(refused(submitNext(opened, exchange)).classification, "cancellation_terminal_conflict", "no later progress is accepted");
    assert.deepEqual(opened.driver.cancellations, [{ executionId: opened.executionId, cause: "execution_deadline", attempt: { activationId: exchange.activationId, writerEpoch: 1 } }]);
  });

  test("each fire result: not due, an unusable clock, cancelled, then a duplicate", () => {
    const clock = manualClock(0);
    const opened = created({ clock, executionDeadline: 10 });
    const fire = () => opened.kernel.fireTimer(executionKey(opened.executionId));
    clock.set(9);
    assert.equal(fire().result, "not_due");
    clock.set(10);
    clock.fail = "throw";
    assert.equal(fire().result, "clock_unavailable");
    assert.equal(view(opened).state, "READY", "neither changed anything logical");
    clock.fail = null;
    assert.equal(fire().result, "cancelled");
    const before = view(opened);
    const again = fire();
    assert.deepEqual([again.result, again.reason], ["duplicate", "the Execution deadline already cancelled this Execution"]);
    assert.deepEqual({ ...view(opened), timerFires: before.timerFires }, before);
    assert.equal(opened.driver.cancellations.length, 1, "a duplicate fire requests nothing again");
  });

  test("an explicitly cancelled Execution's deadline fire is stale", () => {
    const opened = created({ clock: manualClock(50), executionDeadline: 10 });
    accepted(opened.kernel.cancelExecution(author, opened.executionId));
    assert.deepEqual(opened.kernel.fireTimer(executionKey(opened.executionId)).reason, "the Execution already ended as CANCELLED");
  });
});

/** A view with the two causes' declared differences masked: cause, actor, disposition reasons, fires. */
function masked(v: ExecutionView): unknown {
  const reasons = (entry: ExecutionView["mailbox"][number]) => (entry.disposition.kind === "terminal" ? { ...entry, disposition: { kind: "terminal" } } : entry);
  return {
    ...v,
    mailbox: v.mailbox.map(reasons),
    timerFires: [],
    cancellation: v.cancellation === null ? null : { ...v.cancellation, cause: "masked", actorNamespace: "masked", actorScope: "masked" },
    recoveryHistory: v.recoveryHistory.map((record) => (record.transition === "ended_by_cancellation" ? { ...record, authority: "masked", actorNamespace: "masked", actorScope: "masked" } : record)),
  };
}

describe("K13-A16 explicit cancellation and deadline expiry make the same decision", () => {
  const prefixes: readonly (readonly [string, (opened: Opened) => void])[] = [
    ["READY with backlog", (opened) => void input(opened, "x", { n: 1 }, "backlog")],
    ["RUNNING with both recovery holds", (opened) => {
      const exchange = dispatch(opened);
      accepted(opened.kernel.recoverExecution(author, opened.executionId, { activationId: exchange.activationId, available: { definitionRevisions: [], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] } } as never));
      accepted(opened.kernel.reportProtocolFailure(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1, diagnostic: "garbled" }));
    }],
    ["WAITING with a wait deadline", (opened) => void accepted(submitAwait(opened, dispatch(opened), waitOn("s", 80)))],
    ["READY with a queued timeout", (opened) => {
      accepted(submitAwait(opened, dispatch(opened), waitOn("s", 20)));
      opened.clock.set(20);
      assert.equal(opened.kernel.fireTimer(waitKey(opened.executionId, 1)).result, "expired");
    }],
  ];
  for (const [name, prefix] of prefixes) {
    test(name, () => {
      const explicit = created({ clock: manualClock(0), executionDeadline: 50 });
      const deadline = created({ clock: manualClock(0), executionDeadline: 50 });
      prefix(explicit);
      prefix(deadline);
      assert.deepEqual(view(explicit), view(deadline), "identical prefixes");
      accepted(explicit.kernel.cancelExecution(author, explicit.executionId));
      deadline.clock.set(50);
      assert.equal(deadline.kernel.fireTimer(executionKey(deadline.executionId)).result, "cancelled");
      const e = view(explicit);
      const d = view(deadline);
      assert.deepEqual(masked(d), masked(e), "equal after masking only cause, actor, disposition reason and fire fields");
      assert.equal(d.cancellation?.cause, "execution_deadline");
      for (const id of d.terminalDispositions) assert.equal((d.mailbox.find((entry) => entry.eventId === id)?.disposition as { reason: string }).reason, DEADLINE_REASON);
      assert.deepEqual([explicit.driver.cancellations.length, deadline.driver.cancellations.length], [1, 1]);
      assert.equal(refused(deadline.kernel.dispatch(author, deadline.executionId, { bound: 4 })).classification, "terminal_destination", "no further Activation");
    });
  }
});

describe("K13-A24 a wait deadline and the Execution deadline are independent", () => {
  for (const [waitAt, executionAt] of [[10, 25], [10, 5], [10, 10]] as const) {
    test(`wait ${waitAt} / Execution ${executionAt}: the wait fire first mints its timeout, which the cancellation then disposes`, () => {
      const opened = created({ clock: manualClock(0), executionDeadline: executionAt });
      accepted(submitAwait(opened, dispatch(opened), waitOn("s", waitAt)));
      opened.clock.set(Math.max(waitAt, executionAt));
      const timeout = opened.kernel.fireTimer(waitKey(opened.executionId, 1));
      assert.equal(timeout.result, "expired");
      assert.equal(opened.kernel.fireTimer(executionKey(opened.executionId)).result, "cancelled");
      const after = view(opened);
      assert.equal(after.state, "CANCELLED");
      assert.deepEqual(after.mailbox.find((entry) => entry.eventId === timeout.timeoutEventId)?.disposition, { kind: "terminal", reason: DEADLINE_REASON });
      assert.equal(refused(opened.kernel.dispatch(author, opened.executionId, { bound: 4 })).classification, "terminal_destination");
    });

    test(`wait ${waitAt} / Execution ${executionAt}: the Execution fire first cancels, and the wait fire mints nothing`, () => {
      const opened = created({ clock: manualClock(0), executionDeadline: executionAt });
      accepted(submitAwait(opened, dispatch(opened), waitOn("s", waitAt)));
      opened.clock.set(Math.max(waitAt, executionAt));
      assert.equal(opened.kernel.fireTimer(executionKey(opened.executionId)).result, "cancelled");
      const answer = opened.kernel.fireTimer(waitKey(opened.executionId, 1));
      assert.deepEqual([answer.result, answer.reason], ["stale", "generation already ended by cancellation"]);
      const after = view(opened);
      assert.equal(after.mailbox.some((entry) => entry.sourceCategory === "kernel_timeout"), false, "no timeout Event");
      assert.deepEqual(after.retiredWaits.map((retired) => retired.retiredBy), ["cancellation"]);
    });
  }
});
