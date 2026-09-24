/**
 * K12-R1-HOLD-01 - permitted next actions predict the controls that actually work.
 *
 * Canonical owner: `mental-model/mechanisms/recovery.md` (permitted vocabulary) with
 * K1.2-DEC-17 as the single normative owner (`permittedForHold` in `coordinator.ts`):
 * enforcement (redeliver/takeover refusals) and inspection (`holdsOf`) derive from one
 * function, so they cannot drift. Code hold permits only `declare_code_availability`
 * (`recoverExecution` with every pin covered) and `submit_outcome` (a valid Outcome from
 * the current attempt); protocol hold alone permits `request_takeover` and `submit_outcome`;
 * when both stand the code hold blocks takeover, so both holds read
 * `["declare_code_availability", "submit_outcome"]`.
 *
 * Each subcase below uses a fresh Execution (fresh `progressedAndOpen`), and for every
 * operation compares the inspected `permittedNextActions` against what the Kernel actually
 * does (accepted vs `recovery_held` refusal).
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

describe("K12-R1-HOLD-01 permitted actions predict the controls that work", () => {
  test("a) code hold permits declare_code_availability and submit_outcome; redeliver/takeover refused, declaration clears", () => {
    const { kernel, driver, executionId, open } = progressedAndOpen();

    const decision = accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: ["weekly-report@4"] },
      }),
    );
    assert.equal(decision.changed, true);
    assert.equal(decision.recoveryHolds.length, 1);
    assert.equal(decision.recoveryHolds[0]?.cause, "pinned_code_unavailable");
    // Permitted vocabulary for a code hold.
    assert.deepEqual(decision.recoveryHolds[0]?.permittedNextActions, ["declare_code_availability", "submit_outcome"]);

    const inspected = accepted(kernel.inspect(author, executionId)).recoveryHolds;
    assert.deepEqual(
      inspected.map((hold) => hold.permittedNextActions),
      [["declare_code_availability", "submit_outcome"]],
    );

    // Inspected says takeover is NOT permitted: actual takeover is refused as recovery_held.
    assert.ok(!inspected[0]?.permittedNextActions.includes("request_takeover"));
    const sent = driver.seen.length;
    const takeover = refused(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(takeover.classification, "recovery_held");
    // Inspected says redeliver is NOT permitted either (no hold lists a redeliver action).
    const redelivery = refused(kernel.redeliver(author, executionId));
    assert.equal(redelivery.classification, "recovery_held");
    assert.equal(driver.seen.length, sent, "refused controls resent nothing");

    // Inspected says declare_code_availability IS permitted: covering every pin clears.
    const cleared = accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: ALL_AVAILABLE }),
    );
    assert.equal(cleared.changed, true);
    assert.deepEqual(cleared.recoveryHolds, []);
    assert.deepEqual(accepted(kernel.inspect(author, executionId)).recoveryHolds, []);

    // After clearing, ordinary controls work again: redeliver resends the same exchange.
    const resent = accepted(kernel.redeliver(author, executionId));
    assert.equal(resent.activationId, open.activationId);
    assert.equal(resent.writerEpoch, 1);
  });

  test("a) code hold does not fence a valid Outcome: submitOutcome ends the hold with progressRevision+1", () => {
    // Fresh Execution: hold, then answer from the current epoch without clearing first.
    const { kernel, executionId, open } = progressedAndOpen();
    const before = accepted(kernel.inspect(author, executionId));
    assert.equal(before.progressRevision, 1);

    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    const held = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(held.recoveryHolds[0]?.permittedNextActions, ["declare_code_availability", "submit_outcome"]);

    // Inspected says submit_outcome IS permitted: the current attempt's valid Outcome is accepted.
    const answer = accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 8 } })));
    assert.equal(answer.progressRevision, 2, "one accepted Outcome installs one revision");
    const after = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(after.recoveryHolds, [], "resolving the exchange ends the hold");
    assert.equal(after.progressRevision, 2);
    assert.deepEqual(after.acceptedProgress, { cursor: 8 });
  });

  test("b) protocol hold alone permits request_takeover and submit_outcome; redeliver refused, takeover clears", () => {
    const { kernel, driver, executionId, open } = progressedAndOpen();

    const decision = accepted(
      kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "native garbled" }),
    );
    assert.equal(decision.changed, true);
    assert.equal(decision.recoveryHolds.length, 1);
    assert.equal(decision.recoveryHolds[0]?.cause, "protocol_failure");
    assert.deepEqual(decision.recoveryHolds[0]?.permittedNextActions, ["request_takeover", "submit_outcome"]);

    const inspected = accepted(kernel.inspect(author, executionId)).recoveryHolds;
    assert.deepEqual(inspected[0]?.permittedNextActions, ["request_takeover", "submit_outcome"]);

    // Inspected says redeliver is NOT permitted: actual redeliver is refused.
    const sent = driver.seen.length;
    assert.equal(refused(kernel.redeliver(author, executionId)).classification, "recovery_held");
    assert.equal(driver.seen.length, sent);

    // Inspected says request_takeover IS permitted: actual takeover advances the epoch and clears.
    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(taken.writerEpoch, 2);
    assert.deepEqual(accepted(kernel.inspect(author, executionId)).recoveryHolds, []);
    assert.equal(driver.seen[driver.seen.length - 1]?.writerEpoch, 2);
  });

  test("b) protocol hold ends by valid Outcome (fresh Execution)", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "native garbled" }));
    assert.deepEqual(accepted(kernel.inspect(author, executionId)).recoveryHolds[0]?.permittedNextActions, [
      "request_takeover",
      "submit_outcome",
    ]);

    // Inspected says submit_outcome IS permitted: the current attempt's Outcome ends the hold.
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open)));
    assert.deepEqual(accepted(kernel.inspect(author, executionId)).recoveryHolds, []);
  });

  test("c) both holds read declare_code_availability + submit_outcome; takeover blocked until code clears", () => {
    const { kernel, executionId, open } = progressedAndOpen();

    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "garbled" }));

    const held = accepted(kernel.inspect(author, executionId));
    // Code first, then protocol, whatever order they were entered in.
    assert.deepEqual(
      held.recoveryHolds.map((hold) => hold.cause),
      ["pinned_code_unavailable", "protocol_failure"],
    );
    assert.deepEqual(
      held.recoveryHolds.map((hold) => hold.permittedNextActions),
      [
        ["declare_code_availability", "submit_outcome"],
        ["declare_code_availability", "submit_outcome"],
      ],
      "code hold blocks takeover, so the protocol hold cannot offer it either",
    );

    // Neither hold permits takeover or redeliver while both stand: both are actually refused.
    assert.equal(
      refused(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 })).classification,
      "recovery_held",
    );
    assert.equal(refused(kernel.redeliver(author, executionId)).classification, "recovery_held");

    // declare_code_availability IS permitted: covering every pin clears the code hold only.
    const codeCleared = accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: ALL_AVAILABLE }),
    );
    assert.equal(codeCleared.changed, true);
    const protocolOnly = accepted(kernel.inspect(author, executionId)).recoveryHolds;
    assert.deepEqual(
      protocolOnly.map((hold) => hold.cause),
      ["protocol_failure"],
    );
    // With the code hold gone the surviving protocol hold offers takeover again.
    assert.deepEqual(protocolOnly[0]?.permittedNextActions, ["request_takeover", "submit_outcome"]);

    // Now the inspected takeover permission holds for real: takeover clears the protocol hold.
    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(taken.writerEpoch, 2);
    assert.deepEqual(accepted(kernel.inspect(author, executionId)).recoveryHolds, []);
  });

  test("c) valid Outcome while both held ends both (fresh Execution)", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "garbled" }));
    assert.equal(accepted(kernel.inspect(author, executionId)).recoveryHolds.length, 2);

    // Both holds permit submit_outcome: one Outcome ends both by resolving the exchange.
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open)));
    const after = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(after.recoveryHolds, []);
    assert.equal(after.recoveryHistory.length, 4, "2 entered + 2 ended_by_outcome");
    const endings = after.recoveryHistory.slice(2);
    assert.deepEqual(
      endings.map((record) => [record.cause, record.transition]),
      [
        ["pinned_code_unavailable", "ended_by_outcome"],
        ["protocol_failure", "ended_by_outcome"],
      ],
    );
  });

  test("d) permitted lists are frozen snapshots: mutation throws or leaves the next inspect unchanged", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { ...ALL_AVAILABLE, definitionRevisions: [] },
      }),
    );
    const first = accepted(kernel.inspect(author, executionId));
    assert.equal(first.recoveryHolds.length, 1);
    const hold = first.recoveryHolds[0];
    assert.ok(hold !== undefined);
    assert.ok(Object.isFrozen(hold), "the hold view is frozen");
    assert.ok(Object.isFrozen(hold.permittedNextActions), "the permitted list is frozen");

    const before = hold.permittedNextActions.slice();
    let threw = false;
    try {
      (hold.permittedNextActions as unknown as string[]).push("request_takeover");
    } catch {
      threw = true;
    }
    if (!threw) {
      // Non-throwing runtimes must still leave retained truth alone; re-inspect to prove it.
      assert.deepEqual(hold.permittedNextActions.slice(), before, "failed mutation left no mark on the returned copy");
    }
    const second = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(second.recoveryHolds[0]?.permittedNextActions, ["declare_code_availability", "submit_outcome"]);

    // The holds list itself is a fresh snapshot per inspect: pushing onto it cannot plant a hold.
    const holdsCopy = first.recoveryHolds as unknown as unknown[];
    const holdsLen = holdsCopy.length;
    try {
      holdsCopy.push({ cause: "protocol_failure" });
    } catch {
      // Frozen or not, the next inspect decides.
    }
    void holdsLen;
    assert.deepEqual(
      accepted(kernel.inspect(author, executionId)).recoveryHolds.map((entry) => entry.cause),
      ["pinned_code_unavailable"],
    );
  });
});
