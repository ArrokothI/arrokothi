/**
 * K12-R3-HISTORY-02 - hold-ending History tells the truth about whose authority ended the hold.
 *
 * `RecoveryHistoryRecord.authority` separates the two powers this binding enforces: `control`
 * (the caller held `controlScopes` over the Execution's scope — recovery declarations,
 * protocol-failure reports, takeovers) from `attempt_submission` (the accepted Outcome presented
 * the current attempt's grant — a valid Runtime proposal that is not by itself general control
 * power). `actorScope` names the Execution's scope factually in both cases; control power over it
 * is claimed only when `authority` is `control`.
 *
 * Preserved from HISTORY-01: immutability, actor/causation evidence, all five transitions, no
 * extra receipt boundary, nondisclosure, and survival across clearing/resolution/dispatch/terminal
 * state. Exact replay still appends no duplicate History, and refused (unauthorized) submissions
 * append none.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ExecutionCoordinator,
  type ExecutionView,
} from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  observer,
  outcomeFor,
  recordingDriver,
  refused,
  submissionFor,
} from "./harness.ts";

const author = caller("app-a", "tenant-a");
/** A Runtime-side submitter: visible in the Execution's scope, holding no general control power. */
const runtime = observer("runtime-1", "tenant-a");

const viewAs = (kernel: ExecutionCoordinator, executionId: string): ExecutionView =>
  accepted(kernel.inspect(author, executionId));

function openExecution(creationKey: string) {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest({ creationKey })));
  const open = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  return { kernel, driver, executionId: created.executionId, open };
}

const MISSING = {
  definitionRevisions: [] as string[],
  runtimeContractRevisions: ["runtime-contract@1"],
  progressCodecs: ["inline-json@1"],
};

describe("K12-R3-HISTORY-02 a Runtime submitter without control power ends holds truthfully", () => {
  test("ended_by_outcome records attempt_submission, never a control claim", () => {
    const { kernel, driver, executionId, open } = openExecution("history-truthful");
    assert.deepEqual(author.controlScopes, ["tenant-a"]);
    assert.equal(runtime.controlScopes, undefined, "the Runtime principal holds no control power");

    accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: MISSING }),
    );
    const entered = viewAs(kernel, executionId).recoveryHistory;
    assert.equal(entered.length, 1);
    assert.equal(entered[0]?.authority, "control");
    assert.equal(entered[0]?.actorNamespace, "app-a");

    const grant = submissionFor(driver, open.activationId);
    const answer = accepted(
      kernel.submitOutcome(runtime, outcomeFor(executionId, open, { progress: { cursor: 1 } }), grant),
    );
    assert.equal(answer.progressRevision, 1);

    const after = viewAs(kernel, executionId);
    assert.deepEqual(after.recoveryHolds, []);
    assert.equal(after.recoveryHistory.length, 2);
    const ended = after.recoveryHistory[1];
    assert.equal(ended?.transition, "ended_by_outcome");
    assert.equal(ended?.cause, "pinned_code_unavailable");
    assert.equal(ended?.authority, "attempt_submission");
    assert.equal(ended?.actorNamespace, "runtime-1", "who submitted");
    assert.equal(ended?.actorScope, "tenant-a", "the Execution's scope, factually");
    assert.equal(ended?.writerEpoch, 1);
    // The record nowhere claims the submitter controlled the scope: authority says otherwise,
    // and no control-only field shadows it.
    assert.ok(
      !(ended?.reason.includes("control power") ?? false),
      "the ending explanation must not assert control power",
    );
  });
});

describe("K12-R3-HISTORY-02 explicit control transitions still record control authority", () => {
  test("entered, protocol entered, and cleared_by_takeover are control-origin", () => {
    const { kernel, driver, executionId, open } = openExecution("history-control");
    accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: MISSING }),
    );
    accepted(
      kernel.reportProtocolFailure(author, executionId, {
        activationId: open.activationId,
        writerEpoch: 1,
        diagnostic: "unreadable",
      }),
    );
    const cleared = accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: {
          definitionRevisions: ["weekly-report@3"],
          runtimeContractRevisions: ["runtime-contract@1"],
          progressCodecs: ["inline-json@1"],
        },
      }),
    );
    assert.equal(cleared.changed, true, "code found first: takeover never clears a code hold");
    const taken = accepted(
      kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }),
    );
    assert.equal(taken.writerEpoch, 2);
    void driver;

    const history = viewAs(kernel, executionId).recoveryHistory;
    assert.deepEqual(
      history.map((record) => [record.transition, record.authority, record.actorNamespace]),
      [
        ["entered", "control", "app-a"],
        ["entered", "control", "app-a"],
        ["cleared_by_declaration", "control", "app-a"],
        ["cleared_by_takeover", "control", "app-a"],
      ],
    );
    assert.equal(history[3]?.resultingEpoch, 2);
  });
});

describe("K12-R3-HISTORY-02 replay and refused submissions grow no History", () => {
  test("exact replay after a hold-ending Outcome appends nothing", () => {
    const { kernel, driver, executionId, open } = openExecution("history-replay");
    accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: MISSING }),
    );
    const envelope = outcomeFor(executionId, open, { progress: { cursor: 4 } });
    const grant = submissionFor(driver, open.activationId);
    accepted(kernel.submitOutcome(author, envelope, grant));
    assert.equal(viewAs(kernel, executionId).recoveryHistory.length, 2);

    const replay = accepted(kernel.submitOutcome(author, envelope, grant));
    assert.equal(replay.replayed, true);
    assert.equal(viewAs(kernel, executionId).recoveryHistory.length, 2, "replay references evidence, appends none");
  });

  test("an unauthorized Outcome submission appends no History", () => {
    const { kernel, executionId, open } = openExecution("history-refused");
    accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: MISSING }),
    );
    const before = viewAs(kernel, executionId);
    assert.equal(before.recoveryHistory.length, 1);

    const forged = { executionId, activationId: open.activationId, writerEpoch: 1 } as never;
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, open), forged)).classification,
      "unauthorized_submission",
    );
    const after = viewAs(kernel, executionId);
    assert.deepEqual(after.recoveryHistory, before.recoveryHistory, "refusals record refusals, not History");
    assert.equal(after.recoveryHolds.length, 1, "the hold stands");
  });
});

describe("K12-R3-HISTORY-02 history records stay frozen snapshots", () => {
  test("editing a returned ended_by_outcome record changes no retained evidence", () => {
    const { kernel, driver, executionId, open } = openExecution("history-frozen");
    accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: MISSING }),
    );
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open), submissionFor(driver, open.activationId)));
    const first = viewAs(kernel, executionId);
    assert.ok(first.recoveryHistory.every((record) => Object.isFrozen(record)));

    const mutable = first.recoveryHistory as unknown as Record<string, unknown>[];
    mutable.push({ forged: true });
    mutable.length = 0;
    const edited = first.recoveryHistory[1] as unknown as Record<string, unknown>;
    if (edited !== undefined) {
      assert.throws(() => {
        edited.authority = "control";
      }, TypeError);
    }
    const second = viewAs(kernel, executionId);
    assert.equal(second.recoveryHistory.length, 2);
    assert.equal(second.recoveryHistory[1]?.authority, "attempt_submission");
  });
});
