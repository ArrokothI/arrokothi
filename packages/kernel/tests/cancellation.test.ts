/**
 * K1.1-C11 - accepted cancellation and the terminal disposition of unconsumed input.
 *
 * `mental-model/mechanisms/lifecycle.md` owns cancellation; `B-5` owns what happens to input that
 * was accepted but never acknowledged. Two failures drive the cases: ending an Execution by deleting
 * its unconsumed input or treating it as processed, and retroactively acknowledging a reserved batch
 * because the exchange is over.
 *
 * **Scope.** 007 assigns cancellation *races* to K1.3 - ordering against Outcome acceptance,
 * Execution-deadline routing, interaction with waits. None of those exist in this packet: there is
 * no Outcome to lose to, no deadline and no wait. What is asserted here is acceptance and its
 * terminal disposition only, which K1.1 needs because its own contract requires refusing new
 * ordinary input to a terminal Execution.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");
const TERMINAL_REASON = "Execution terminated before this Event was acknowledged";

describe("K1.1-C11 accepted cancellation", () => {
  test("a READY Execution ends, and its unconsumed input is recorded rather than deleted", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const extra = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }),
    );

    const result = accepted(kernel.cancelExecution(author, created.executionId));
    assert.equal(result.state, "CANCELLED");
    assert.equal(result.alreadyTerminal, false);
    assert.deepEqual(result.terminallyDisposed, [created.initialEventId, extra.eventId]);

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "CANCELLED");
    assert.deepEqual(view.queued, [], "nothing is still queued");
    assert.deepEqual(view.terminalDispositions, [created.initialEventId, extra.eventId]);
    assert.deepEqual(view.acknowledged, [], "a terminal disposition is not an acknowledgment");
    assert.equal(view.mailbox.length, 2, "and no Event was deleted");
    for (const entry of view.mailbox) {
      assert.deepEqual(entry.disposition, { kind: "terminal", reason: TERMINAL_REASON });
    }
  });

  test("a reserved batch is fenced and disposed, never retroactively acknowledged", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatch = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));

    accepted(kernel.cancelExecution(author, created.executionId));
    const view = accepted(kernel.inspect(author, created.executionId));

    assert.equal(view.state, "CANCELLED");
    assert.equal(view.activation?.activationId, dispatch.activationId, "the exchange is still on record");
    assert.equal(view.activation?.fenced, true, "and can no longer commit");
    assert.deepEqual(view.activation?.batch, [created.initialEventId], "its reserved batch is unchanged");
    assert.deepEqual(view.acknowledged, [], "the losing reserved batch is not acknowledged");
    assert.deepEqual(view.terminalDispositions, [created.initialEventId]);
    assert.equal(view.progressRevision, 0, "and ending installed no progress");
  });

  test("cancellation is idempotent and a terminal lifetime never reopens", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    accepted(kernel.cancelExecution(author, created.executionId));
    const before = accepted(kernel.inspect(author, created.executionId));

    const again = accepted(kernel.cancelExecution(author, created.executionId));
    assert.equal(again.alreadyTerminal, true);
    assert.equal(again.state, "CANCELLED");
    assert.deepEqual(again.terminallyDisposed, [], "a second cancel disposes nothing new");
    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)), before);

    assert.equal(refused(kernel.dispatch(author, created.executionId, { bound: 1 })).classification, "terminal_destination");
    assert.equal(refused(kernel.redeliver(author, created.executionId)).classification, "no_unresolved_exchange");
    assert.equal(
      refused(kernel.submitInput(author, { destination: created.executionId, requestKey: "late", kind: "k", payload: null })).classification,
      "terminal_destination",
    );
  });

  test("cancelling an Execution the caller cannot see answers as an unknown one", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const outsider = caller("app-c", "tenant-c");

    const hidden = refused(kernel.cancelExecution(outsider, created.executionId));
    const missing = refused(kernel.cancelExecution(outsider, "execution-404"));
    assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 });
    assert.equal(accepted(kernel.inspect(author, created.executionId)).state, "READY", "and nothing happened to it");
  });

  test("an Execution ID is never reissued, including after one ends", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const seen = new Set<string>();
    for (let round = 0; round < 5; round += 1) {
      const created = accepted(kernel.createExecution(author, createRequest({ creationKey: `run-${round}` })));
      assert.equal(seen.has(created.executionId), false, "a fresh identity every time");
      seen.add(created.executionId);
      accepted(kernel.cancelExecution(author, created.executionId));
    }
    // And the ended Executions are still addressable under their own identities, which is what
    // makes "never reissued" checkable rather than merely intended.
    for (const executionId of seen) {
      assert.equal(accepted(kernel.inspect(author, executionId)).state, "CANCELLED");
    }
  });

  test("cancelling one Execution leaves another alone", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const first = accepted(kernel.createExecution(author, createRequest({ creationKey: "a" })));
    const second = accepted(kernel.createExecution(author, createRequest({ creationKey: "b" })));
    const untouched = accepted(kernel.inspect(author, second.executionId));

    accepted(kernel.cancelExecution(author, first.executionId));
    assert.deepEqual(accepted(kernel.inspect(author, second.executionId)), untouched);
  });
});
