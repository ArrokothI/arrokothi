/**
 * K1.2-C9, K1.2-C10 - holding an exchange visibly rather than guessing.
 *
 * Canonical owners: `mental-model/concepts/state.md#recovery-and-re-execution` ("Recovery-held is
 * what happens when no form of continuing can be shown to be safe ... The lifecycle state stays
 * `RUNNING`"), `mechanisms/recovery.md#compatibility-and-migration` (code must be available before
 * restored progress runs; "never present empty state as restored"), WS PC-4/PC-5, and
 * `mechanisms/execution-cycle.md#outcome-acceptance` with WS OA-6 (an unclassifiable response "ends
 * or holds the exchange ... never an infinite silent retry").
 *
 * These are in-memory exchange handling, as 007 scopes them: no process dies here and nothing is
 * claimed about persistence. The K0.2 missing-code control (`scenarios.ts`,
 * `control-missing-checkpoint-code`) is the shape followed: hold, then clear, with progress intact.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type CodeAvailability, type ExecutionView } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

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

describe("K1.2-C9 unavailable pinned code holds the exchange, visibly", () => {
  test("a missing Definition revision holds: RUNNING, same exchange, same progress and revision", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    const before = view(kernel, executionId);

    const decision = accepted(
      kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: { ...ALL_AVAILABLE, definitionRevisions: ["weekly-report@4"] } }),
    );
    assert.equal(decision.changed, true);
    assert.deepEqual(decision.recoveryHolds, [
      { cause: "pinned_code_unavailable", reason: "pinned Definition revision weekly-report@3 is unavailable", activationId: open.activationId, writerEpoch: 1 },
    ]);

    const held = view(kernel, executionId);
    assert.equal(held.state, "RUNNING", "the Activation is unresolved; no wait was declared and nothing failed");
    assert.deepEqual(held.recoveryHolds, decision.recoveryHolds);
    assert.deepEqual(held.acceptedProgress, { cursor: 7 }, "never an empty or fresh state presented as restored");
    assert.equal(held.progressRevision, 1, "never a silent start-over");
    const { recoveryHolds: _h, ...heldRest } = held;
    const { recoveryHolds: _b, ...beforeRest } = before;
    assert.deepEqual(heldRest, beforeRest, "only the hold changed");
  });

  test("the reason names every missing pin: Definition, Runtime contract and progress codec", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    const decision = accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: ["inline-json@2"] },
      }),
    );
    assert.equal(
      decision.recoveryHolds[0]?.reason,
      "pinned Definition revision weekly-report@3 is unavailable; pinned Runtime contract revision runtime-contract@1 is unavailable; pinned progress codec inline-json@1 is unavailable",
    );
  });

  test("while held, redelivery and takeover are refused; nothing is resent", () => {
    const { kernel, driver, executionId, open } = progressedAndOpen();
    accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: { ...ALL_AVAILABLE, progressCodecs: [] } }));
    const sent = driver.seen.length;

    const redelivery = refused(kernel.redeliver(author, executionId));
    assert.equal(redelivery.classification, "recovery_held");
    const takeover = refused(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(takeover.classification, "recovery_held");
    assert.equal(driver.seen.length, sent);
    assert.equal(view(kernel, executionId).activation?.writerEpoch, 1);
  });

  test("when compatible code is available the hold clears, and ordinary progress resumes without a new revision", () => {
    const { kernel, driver, executionId, open } = progressedAndOpen();
    accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: { ...ALL_AVAILABLE, definitionRevisions: [] } }));
    const held = view(kernel, executionId);

    const cleared = accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: ALL_AVAILABLE }));
    assert.equal(cleared.changed, true);
    assert.deepEqual(cleared.recoveryHolds, []);
    const after = view(kernel, executionId);
    assert.deepEqual(after.recoveryHolds, []);
    assert.equal(after.progressRevision, held.progressRevision, "holding and clearing minted no revision");
    assert.deepEqual(after.acceptedProgress, held.acceptedProgress);
    assert.deepEqual(after.receipts, held.receipts, "and no receipt");

    // Ordinary progress: the same exchange is resent unchanged, then answered, at base + 1.
    const resent = accepted(kernel.redeliver(author, executionId));
    assert.equal(resent.activationId, open.activationId);
    assert.deepEqual(driver.seen[driver.seen.length - 1]?.acceptedProgress, { cursor: 7 });
    const answer = accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 8 } })));
    assert.equal(answer.progressRevision, 2);
  });

  test("a compatible check with no hold changes nothing; a repeated missing check keeps the one hold", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    const before = view(kernel, executionId);
    assert.equal(accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: ALL_AVAILABLE })).changed, false);
    assert.deepEqual(view(kernel, executionId), before);

    const missing = { activationId: open.activationId, available: { ...ALL_AVAILABLE, definitionRevisions: [] } };
    accepted(kernel.recoverExecution(author, executionId, missing));
    assert.equal(accepted(kernel.recoverExecution(author, executionId, missing)).changed, false);
    assert.equal(view(kernel, executionId).recoveryHolds.length, 1);
  });

  test("a held Execution is distinguishable by inspection from a failed one and from a waiting one", () => {
    const held = progressedAndOpen();
    accepted(held.kernel.recoverExecution(author, held.executionId, { activationId: held.open.activationId, available: { ...ALL_AVAILABLE, definitionRevisions: [] } }));
    const failed = progressedAndOpen();
    accepted(failed.kernel.submitOutcome(author, outcomeFor(failed.executionId, failed.open, { next: { step: "fail", error: { code: "x" } } })));

    const heldView = view(held.kernel, held.executionId);
    const failedView = view(failed.kernel, failed.executionId);
    assert.equal(heldView.state, "RUNNING");
    assert.notEqual(heldView.activation, null, "an unresolved exchange");
    assert.equal(heldView.recoveryHolds.length, 1);
    assert.equal(heldView.result, null);
    assert.equal(failedView.state, "FAILED");
    assert.equal(failedView.activation, null);
    assert.deepEqual(failedView.recoveryHolds, []);
    assert.equal(failedView.result?.kind, "failed");
    // WAITING needs an accepted wait registration, which is K1.3's: a held Execution is never
    // relabeled as waiting, because nobody declared anything.
    assert.notEqual(heldView.state, "WAITING");
  });

  test("a recovery request names the exchange; one for another exchange, or with no exchange open, is refused", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    assert.equal(
      refused(kernel.recoverExecution(author, executionId, { activationId: `${executionId}/activation-1`, available: ALL_AVAILABLE })).classification,
      "stale_exchange",
    );
    assert.equal(
      refused(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: { ...ALL_AVAILABLE, progressCodecs: [7] } } as never))
        .classification,
      "malformed_value",
    );
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open)));
    assert.equal(
      refused(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: ALL_AVAILABLE })).classification,
      "no_unresolved_exchange",
    );
  });

  test("a hold does not fence the current attempt: its valid Outcome resolves the exchange and ends the hold", () => {
    // `state.md` defines recovery-held as an unresolved Activation that cannot safely continue. Only
    // the writer epoch and terminal state fence acceptance (K1.2-DEC-7); an answer from the attempt
    // that still holds the epoch is accepted, and with the exchange resolved there is nothing held.
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: { ...ALL_AVAILABLE, definitionRevisions: [] } }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open)));
    const after = view(kernel, executionId);
    assert.equal(after.state, "READY");
    assert.deepEqual(after.recoveryHolds, []);
  });
});

describe("K1.2-C10 an unclassifiable response holds the exchange; it is never retried silently", () => {
  test("a report for the current attempt holds with a bounded diagnostic and changes nothing else", () => {
    const { kernel, driver, executionId, open } = progressedAndOpen();
    const before = view(kernel, executionId);
    const decision = accepted(
      kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: `native said: ${"x".repeat(5_000)}` }),
    );
    assert.equal(decision.changed, true);
    const hold = decision.recoveryHolds[0];
    assert.equal(hold?.cause, "protocol_failure");
    assert.match(hold?.reason ?? "", /^the response of the attempt at writer epoch 1 could not be classified as an Outcome: native said: x+$/);
    assert.ok((hold?.reason.length ?? 0) < 1_200, "the Driver's diagnostic keeps at most 1,024 code units");

    const after = view(kernel, executionId);
    const { recoveryHolds: _h, ...afterRest } = after;
    const { recoveryHolds: _b, ...beforeRest } = before;
    assert.deepEqual(afterRest, beforeRest, "state, progress, epoch, batch, receipts and refusals are untouched");

    assert.equal(refused(kernel.redeliver(author, executionId)).classification, "recovery_held");
    assert.equal(driver.seen.length, 2, "the Kernel resent nothing on its own, and refused the explicit resend");
  });

  test("a diagnostic that is not a primitive string collapses to fixed text without being read", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    let touched = 0;
    const hostile = {
      get message() {
        touched += 1;
        return "leaked";
      },
      toString() {
        touched += 1;
        return "leaked";
      },
    };
    const decision = accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: hostile } as never));
    assert.match(decision.recoveryHolds[0]?.reason ?? "", /no readable diagnostic was supplied$/);
    assert.equal(touched, 0);
  });

  test("a repeated report changes nothing; a stale report cannot hold the exchange", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "first" }));
    const held = view(kernel, executionId);
    const again = accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "second" }));
    assert.equal(again.changed, false);
    assert.deepEqual(view(kernel, executionId), held, "the first report's hold stands unchanged");

    assert.equal(
      refused(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 2 })).classification,
      "stale_exchange",
    );
  });

  test("an authorized takeover is the recovery decision that ends it, and the new attempt can answer", () => {
    const { kernel, driver, executionId, open } = progressedAndOpen();
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(taken.writerEpoch, 2);
    assert.deepEqual(view(kernel, executionId).recoveryHolds, [], "replacing the attempt that produced the failure clears its hold");
    assert.equal(driver.seen[driver.seen.length - 1]?.writerEpoch, 2);
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, { ...open, writerEpoch: 2 })));
  });

  test("a takeover does not clear a code hold alongside it; recovery must find the code first", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: { ...ALL_AVAILABLE, definitionRevisions: [] } }));
    assert.deepEqual(
      view(kernel, executionId).recoveryHolds.map((hold) => hold.cause),
      ["pinned_code_unavailable", "protocol_failure"],
    );
    assert.equal(refused(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 })).classification, "recovery_held");
    accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: ALL_AVAILABLE }));
    assert.deepEqual(view(kernel, executionId).recoveryHolds.map((hold) => hold.cause), ["protocol_failure"], "code found; the failure still stands");
    accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.deepEqual(view(kernel, executionId).recoveryHolds, []);
  });

  test("a valid Outcome from the current attempt also ends it", () => {
    const { kernel, executionId, open } = progressedAndOpen();
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open)));
    assert.deepEqual(view(kernel, executionId).recoveryHolds, []);
  });
});
