/**
 * K12-R1-HISTORY-01 - recovery history retains every accepted hold decision.
 *
 * Canonical owners: `mental-model/concepts/state.md` (recovery decisions as Execution
 * History) and K1.2-DEC-18 (`appendRecoveryHistory` in `coordinator.ts`: one frozen record
 * per accepted decision that enters, updates, or ends a hold, on the owning Execution,
 * surviving hold changes, exchange resolution, and Execution end; idempotent duplicates
 * append nothing).
 *
 * Each subcase uses a fresh Execution unless the point is retention across dispatch and
 * completion on the same Execution.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type CodeAvailability } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");

const ALL_AVAILABLE: CodeAvailability = {
  definitionRevisions: ["weekly-report@3", "weekly-report@4"],
  runtimeContractRevisions: ["runtime-contract@1"],
  progressCodecs: ["inline-json@1"],
};

/** An Execution with accepted progress at revision 1, and a second exchange open against it. */
function progressedAndOpen() {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest()));
  const first = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  accepted(kernel.submitOutcome(author, outcomeFor(created.executionId, first, { progress: { cursor: 7 } })));
  const open = accepted(kernel.dispatch(author, created.executionId, { bound: 4 }));
  return { kernel, driver, executionId: created.executionId, open };
}

const historyOf = (kernel: ExecutionCoordinator, executionId: string) =>
  accepted(kernel.inspect(author, executionId)).recoveryHistory;

describe("K12-R1-HISTORY-01 recovery history is retained Execution evidence", () => {
  test("a) code hold lifecycle: entered, updated on reason change, cleared_by_declaration; all retained", () => {
    const { kernel, executionId, open } = progressedAndOpen();

    // First missing: Definition pin uncovered.
    const first = accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    assert.equal(first.changed, true);
    let history = historyOf(kernel, executionId);
    assert.equal(history.length, 1);
    assert.equal(history[0]?.transition, "entered");
    assert.equal(history[0]?.cause, "pinned_code_unavailable");

    // Second missing: Definition covered, progress codec uncovered -> reason differs -> updated.
    const second = accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: {
          definitionRevisions: ["weekly-report@3"],
          runtimeContractRevisions: ["runtime-contract@1"],
          progressCodecs: [],
        },
      }),
    );
    assert.equal(second.changed, true);
    history = historyOf(kernel, executionId);
    assert.equal(history.length, 2);
    assert.equal(history[1]?.transition, "updated");
    assert.equal(history[1]?.cause, "pinned_code_unavailable");
    assert.notEqual(history[1]?.reason, history[0]?.reason);

    // Compatible declaration clears the hold.
    const cleared = accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: ALL_AVAILABLE }),
    );
    assert.equal(cleared.changed, true);
    assert.deepEqual(accepted(kernel.inspect(author, executionId)).recoveryHolds, []);
    history = historyOf(kernel, executionId);
    assert.equal(history.length, 3);
    assert.equal(history[2]?.transition, "cleared_by_declaration");
    assert.equal(history[2]?.cause, "pinned_code_unavailable");

    // Every record carries its authenticated actor, exchange causation, and a readable reason.
    for (const record of history) {
      assert.equal(record.activationId, open.activationId);
      assert.equal(record.writerEpoch, 1);
      assert.equal(record.actorNamespace, "app-a");
      assert.equal(record.actorScope, "tenant-a");
      assert.equal(record.cause, "pinned_code_unavailable");
      assert.ok(record.reason.length > 0, "a reason is always recorded");
    }
  });

  test("b) protocol hold via takeover: entered, then cleared_by_takeover with resultingEpoch", () => {
    const { kernel, executionId, open } = progressedAndOpen();

    const reported = accepted(
      kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "garbled" }),
    );
    assert.equal(reported.changed, true);
    let history = historyOf(kernel, executionId);
    assert.equal(history.length, 1);
    assert.deepEqual([history[0]?.cause, history[0]?.transition], ["protocol_failure", "entered"]);

    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(taken.writerEpoch, 2);
    assert.deepEqual(accepted(kernel.inspect(author, executionId)).recoveryHolds, []);
    history = historyOf(kernel, executionId);
    assert.equal(history.length, 2, "history survives the hold disappearing");
    assert.equal(history[1]?.cause, "protocol_failure");
    assert.equal(history[1]?.transition, "cleared_by_takeover");
    assert.equal(history[1]?.resultingEpoch, 2);
    assert.match(history[1]?.reason ?? "", /takeover/i);
    assert.equal(history[1]?.actorNamespace, "app-a");
    assert.equal(history[1]?.actorScope, "tenant-a");
  });

  test("c) ended_by_outcome: code hold ends with the exchange, history survives dispatch and completion", () => {
    const { kernel, executionId, open } = progressedAndOpen();

    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    assert.equal(historyOf(kernel, executionId).length, 1);

    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 8 } })));
    let view = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(view.recoveryHolds, []);
    assert.equal(view.recoveryHistory.length, 2);
    assert.deepEqual([view.recoveryHistory[1]?.cause, view.recoveryHistory[1]?.transition], [
      "pinned_code_unavailable",
      "ended_by_outcome",
    ]);
    assert.equal(view.activation, null, "the exchange resolved");
    assert.equal(view.exchanges.length, 2);

    // History survives the next dispatch on the same Execution.
    const next = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    view = accepted(kernel.inspect(author, executionId));
    assert.equal(view.recoveryHistory.length, 2);

    // And survives terminal completion (which adds no hold record of its own).
    accepted(
      kernel.submitOutcome(author, outcomeFor(executionId, next, { next: { step: "complete", result: { report: "week 37" } } })),
    );
    view = accepted(kernel.inspect(author, executionId));
    assert.equal(view.state, "COMPLETED");
    assert.equal(view.recoveryHistory.length, 2);
    assert.deepEqual(view.recoveryHistory.map((record) => record.transition), ["entered", "ended_by_outcome"]);
  });

  test("d) both holds plus Outcome: 2 entered + 2 ended_by_outcome", () => {
    const { kernel, executionId, open } = progressedAndOpen();

    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "garbled" }));
    assert.equal(historyOf(kernel, executionId).length, 2);

    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open)));
    const view = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(view.recoveryHolds, []);
    assert.equal(view.recoveryHistory.length, 4);
    assert.deepEqual(
      view.recoveryHistory.map((record) => [record.cause, record.transition]),
      [
        ["pinned_code_unavailable", "entered"],
        ["protocol_failure", "entered"],
        ["pinned_code_unavailable", "ended_by_outcome"],
        ["protocol_failure", "ended_by_outcome"],
      ],
    );
  });

  test("e) idempotent duplicates append nothing", () => {
    // Code duplicate on a fresh Execution.
    {
      const { kernel, executionId, open } = progressedAndOpen();
      const missing = { activationId: open.activationId, available: { ...ALL_AVAILABLE, definitionRevisions: [] } };
      assert.equal(accepted(kernel.recoverExecution(author, executionId, missing)).changed, true);
      assert.equal(historyOf(kernel, executionId).length, 1);
      assert.equal(accepted(kernel.recoverExecution(author, executionId, missing)).changed, false);
      assert.equal(historyOf(kernel, executionId).length, 1);
    }
    // Protocol duplicate on a fresh Execution.
    {
      const { kernel, executionId, open } = progressedAndOpen();
      const report = { activationId: open.activationId, writerEpoch: 1, diagnostic: "first" };
      assert.equal(accepted(kernel.reportProtocolFailure(author, executionId, report)).changed, true);
      assert.equal(historyOf(kernel, executionId).length, 1);
      assert.equal(accepted(kernel.reportProtocolFailure(author, executionId, { ...report, diagnostic: "second" })).changed, false);
      assert.equal(historyOf(kernel, executionId).length, 1);
    }
  });

  test("f) history is immutable: list edits and record edits leave the next inspect unchanged", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    const first = accepted(kernel.inspect(author, executionId));
    assert.equal(first.recoveryHistory.length, 1);
    const record = first.recoveryHistory[0];
    assert.ok(record !== undefined);
    assert.ok(Object.isFrozen(record), "history records are frozen at acceptance");
    const snapshot = JSON.stringify(first.recoveryHistory);

    // Mutate the returned list: push a fake record and truncate. The list is a per-inspect copy.
    const mutableList = first.recoveryHistory as unknown as unknown[];
    try {
      mutableList.push({ forged: true });
    } catch {
      // Frozen or not, the next inspect decides.
    }
    try {
      mutableList.length = 0;
    } catch {
      // Same: length assignment on a frozen list throws; on a copy it only clears the copy.
    }

    // Mutate the returned record through a cast-away readonly.
    let recordThrew = false;
    try {
      (record as unknown as Record<string, unknown>).reason = "forged reason";
    } catch {
      recordThrew = true;
    }
    void recordThrew;

    const second = accepted(kernel.inspect(author, executionId));
    assert.equal(second.recoveryHistory.length, 1, "list edits did not reach retained history");
    assert.equal(JSON.stringify(second.recoveryHistory), snapshot, "record edits did not reach retained history");
    assert.ok(Object.isFrozen(second.recoveryHistory[0]));
    assert.notEqual(second.recoveryHistory[0]?.reason, "forged reason");
  });

  test("g) cross-scope: control activity on B leaves A's history unchanged and undisclosed", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const authorB = caller("app-b", "tenant-b");

    const execA = accepted(kernel.createExecution(author, createRequest({ creationKey: "exec-a" })));
    const execB = accepted(
      kernel.createExecution(
        authorB,
        createRequest({ creationKey: "exec-b", scope: "tenant-b", authorityContext: { tenant: "b" } }),
      ),
    );

    // Progress both so each has a second exchange open.
    const firstA = accepted(kernel.dispatch(author, execA.executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(execA.executionId, firstA, { progress: { cursor: 1 } })));
    const openA = accepted(kernel.dispatch(author, execA.executionId, { bound: 1 }));

    const firstB = accepted(kernel.dispatch(authorB, execB.executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(authorB, outcomeFor(execB.executionId, firstB, { progress: { cursor: 2 } })));
    const openB = accepted(kernel.dispatch(authorB, execB.executionId, { bound: 1 }));

    // Control activity only on B: a code hold and a protocol hold.
    const heldB = accepted(
      kernel.recoverExecution(authorB, execB.executionId, {
        activationId: openB.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    assert.equal(heldB.recoveryHolds.length, 1);
    accepted(
      kernel.reportProtocolFailure(authorB, execB.executionId, {
        activationId: openB.activationId,
        writerEpoch: 1,
        diagnostic: "hidden garbled marker-xyz-123",
      }),
    );
    const viewB = accepted(kernel.inspect(authorB, execB.executionId));
    assert.equal(viewB.recoveryHistory.length, 2);

    // A's history is unchanged and A's view discloses nothing of B's exchange.
    const viewA = accepted(kernel.inspect(author, execA.executionId));
    assert.deepEqual(viewA.recoveryHistory, []);
    assert.deepEqual(viewA.recoveryHolds, []);
    assert.equal(viewA.activation?.activationId, openA.activationId);
    const serializedA = JSON.stringify(viewA);
    assert.ok(!serializedA.includes(openB.activationId), "B's activationId is absent from A's view");
    for (const record of viewB.recoveryHistory) {
      assert.ok(!serializedA.includes(record.reason), "B's hold reasons are absent from A's view");
    }
    assert.ok(!serializedA.includes("marker-xyz-123"));
    // A cannot even address B's Execution: hidden answers exactly as missing.
    assert.equal(refused(kernel.inspect(author, execB.executionId)).classification, "unknown_destination");
  });
});
