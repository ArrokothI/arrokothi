/**
 * K12-R3-AUTH-02 - visibility alone cannot speak as the current Runtime attempt.
 *
 * Canonical owners: `execution-cycle.md` (the Kernel sends an Activation through the Driver; the
 * Runtime returns the Outcome — a proposal until accepted), `evidence.md` (inspection privilege
 * grants no re-execution power; H3's own binding calls a grant-less caller inspect-only),
 * `identity.md#writer-epoch` (only the current attempt's Outcome may commit), C10 (a protocol hold
 * ends through an authorized takeover or a valid Outcome *from the current attempt*).
 *
 * K1.2-DEC-20 binds submission authority to the attempt: the Kernel mints one unforgeable grant
 * per writer epoch, hands it to the Driver with the Activation, and requires that same reference
 * back on `submitOutcome`. Inspected coordinates (Activation ID, epoch, base revision) authorize
 * nothing; a forged look-alike, a retired grant, or no grant is refused as `unauthorized_submission`
 * with zero accepted-state mutation. Takeover retires the old grant with the old epoch, so fencing
 * keeps its `stale_exchange` vocabulary: currency is checked before authority.
 *
 * Each case asserts the complete observable result, not just the refusal classification.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ExecutionCoordinator,
  type ExecutionView,
  type SubmissionGrant,
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
const dashboard = observer("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView =>
  accepted(kernel.inspect(author, executionId));

/** A look-alike with the right fields but no Kernel mint behind it. */
const forged = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant =>
  ({ executionId, activationId, writerEpoch }) as SubmissionGrant;

function openExecution(creationKey: string) {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest({ creationKey })));
  const open = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  return { kernel, driver, executionId: created.executionId, open };
}

describe("K12-R3-AUTH-02 visibility-only continuing Outcome is refused", () => {
  test("correct-looking continue with a forged grant commits nothing", () => {
    const { kernel, executionId, open } = openExecution("auth2-continue");
    const before = view(kernel, executionId);

    const refusal = refused(
      kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 1 } }), forged(executionId, open.activationId, 1)),
    );
    assert.equal(refusal.classification, "unauthorized_submission");
    assert.equal(refusal.executionId, executionId);
    assert.ok(Object.isFrozen(refusal));

    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING");
    assert.equal(after.activation?.writerEpoch, 1);
    assert.equal(after.activation?.receipt, before.activation?.receipt);
    assert.equal(after.progressRevision, 0);
    assert.deepEqual(after.acceptedProgress, null);
    assert.deepEqual(after.exchanges, []);
    assert.deepEqual(after.recoveryHolds, []);
    assert.deepEqual(after.recoveryHistory, []);
    assert.deepEqual(after.acknowledged, []);
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries);
    assert.deepEqual(after.receipts, before.receipts, "no Outcome receipt minted");
    assert.equal(after.refusals.length, before.refusals.length + 1, "only the refusal was recorded");

    // No grant at all is the same refusal, not a different path.
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, open), undefined as unknown as SubmissionGrant)).classification,
      "unauthorized_submission",
    );
  });
});

describe("K12-R3-AUTH-02 visibility-only terminal Outcome is refused", () => {
  test("correct-looking complete commits no result, no B-5, and leaves the attempt answerable", () => {
    const { kernel, driver, executionId, open } = openExecution("auth2-terminal");
    const late = accepted(
      kernel.submitInput(author, { destination: executionId, requestKey: "late", kind: "k", payload: 1 }),
    );

    const refusal = refused(
      kernel.submitOutcome(
        dashboard,
        outcomeFor(executionId, open, { next: { step: "complete", result: { report: "forged" } } }),
        forged(executionId, open.activationId, 1),
      ),
    );
    assert.equal(refusal.classification, "unauthorized_submission");

    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING", "lifecycle unchanged");
    assert.equal(after.activation?.writerEpoch, 1);
    assert.equal(after.result, null, "no result recorded");
    assert.deepEqual(after.terminalDispositions, [], "no B-5 disposition");
    assert.deepEqual(after.acknowledged, []);
    assert.deepEqual(after.exchanges, []);
    assert.deepEqual(
      after.receipts.map((receipt) => receipt.position),
      [1, 2, 3],
      "creation, late input, dispatch; no Outcome receipt",
    );

    // The real attempt remains answerable: the same Outcome with the grant commits.
    const answer = accepted(
      kernel.submitOutcome(
        author,
        outcomeFor(executionId, open, { next: { step: "complete", result: { report: "real" } } }),
        submissionFor(driver, open.activationId),
      ),
    );
    assert.equal(answer.nextState, "COMPLETED");
    assert.deepEqual(view(kernel, executionId).terminalDispositions, [late.eventId]);
  });
});

describe("K12-R3-AUTH-02 replay needs no grant; refusal order preserves fencing", () => {
  test("exact replay answers from retained evidence even with a forged grant", () => {
    const { kernel, driver, executionId, open } = openExecution("auth2-replay");
    const envelope = outcomeFor(executionId, open, { progress: { cursor: 1 } });
    const first = accepted(kernel.submitOutcome(author, envelope, submissionFor(driver, open.activationId)));
    // OA-2 precedes authority: replay commits nothing and reveals only what inspection exposes.
    const replay = accepted(
      kernel.submitOutcome(author, envelope, forged(executionId, open.activationId, 1)),
    );
    assert.equal(replay.replayed, true);
    assert.equal(replay.receipt, first.receipt);
    assert.equal(view(kernel, executionId).receipts.length, 3);
  });

  test("forged grant after takeover is unauthorized, retired grant is stale or silent", () => {
    const { kernel, driver, executionId, open } = openExecution("auth2-post-takeover");
    const grant1 = submissionFor(driver, open.activationId);
    accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    const current = { ...open, writerEpoch: 2 };
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, current), forged(executionId, open.activationId, 2))).classification,
      "unauthorized_submission",
      "current coordinates without the grant",
    );
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, current), grant1)).classification,
      "unauthorized_submission",
      "the retired grant proves nothing about the current attempt",
    );
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, open), grant1)).classification,
      "stale_exchange",
      "the retired attempt's own content is fenced with the old vocabulary",
    );
  });
});

describe("K12-R3-AUTH-02 visibility-only hold-ending Outcome is refused", () => {
  test("holds and history survive a fabricated current-looking Outcome", () => {
    const { kernel, executionId, open } = openExecution("auth2-holds");
    accepted(
      kernel.recoverExecution(author, executionId, {
        activationId: open.activationId,
        available: { definitionRevisions: [], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] },
      }),
    );
    accepted(
      kernel.reportProtocolFailure(author, executionId, {
        activationId: open.activationId,
        writerEpoch: 1,
        diagnostic: "unreadable",
      }),
    );
    const held = view(kernel, executionId);
    assert.equal(held.recoveryHolds.length, 2);
    assert.equal(held.recoveryHistory.length, 2);

    const refusal = refused(
      kernel.submitOutcome(dashboard, outcomeFor(executionId, open, { progress: { cursor: 5 } }), forged(executionId, open.activationId, 1)),
    );
    assert.equal(refusal.classification, "unauthorized_submission");

    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING");
    assert.equal(after.activation?.writerEpoch, 1);
    assert.deepEqual(after.recoveryHolds, held.recoveryHolds, "both holds stand");
    assert.deepEqual(after.recoveryHistory, held.recoveryHistory, "no ended_by_outcome fabricated");
    assert.equal(after.progressRevision, 0);
    assert.deepEqual(after.exchanges, []);
  });
});

describe("K12-R3-AUTH-02 the grant-holding attempt proposal is accepted", () => {
  test("the same valid Outcome with the current grant commits normally", () => {
    const { kernel, driver, executionId, open } = openExecution("auth2-authorized");
    const grant = submissionFor(driver, open.activationId);
    assert.ok(Object.isFrozen(grant), "grants are immutable");

    const answer = accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 2 } }), grant));
    assert.equal(answer.progressRevision, 1);
    assert.equal(answer.receipt.boundary, "outcome_acceptance");

    const after = view(kernel, executionId);
    assert.equal(after.state, "READY");
    assert.deepEqual(after.acceptedProgress, { cursor: 2 });
    assert.equal(after.exchanges.length, 1);
    assert.equal(after.exchanges[0]?.writerEpoch, 1);

    // Even a grant presented by a principal without general control power speaks as the attempt:
    // authority comes from the Driver path, not the principal's controlScopes.
    const second = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const grant2 = submissionFor(driver, second.activationId);
    const answer2 = accepted(kernel.submitOutcome(dashboard, outcomeFor(executionId, second, { progress: { cursor: 3 } }), grant2));
    assert.equal(answer2.progressRevision, 2);
    assert.deepEqual(view(kernel, executionId).acceptedProgress, { cursor: 3 });
  });
});

describe("K12-R3-AUTH-02 old attempt authority dies with its epoch", () => {
  test("after takeover the retired grant cannot commit while the new grant can", () => {
    const { kernel, driver, executionId, open } = openExecution("auth2-takeover");
    const grant1 = submissionFor(driver, open.activationId);
    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(taken.writerEpoch, 2);
    const grant2 = submissionFor(driver, open.activationId);
    assert.notEqual(grant2, grant1, "takeover mints a fresh grant");

    // Old content with the retired grant: fenced as before, same vocabulary.
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { stale: true } }), grant1)).classification,
      "stale_exchange",
    );
    // Old content with the current grant: still stale — currency precedes authority.
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, open), grant2)).classification,
      "stale_exchange",
    );
    // New content with the retired grant: the epoch matches nothing current either.
    assert.equal(
      refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...open, writerEpoch: 2 }), grant1)).classification,
      "unauthorized_submission",
    );

    const answer = accepted(
      kernel.submitOutcome(author, outcomeFor(executionId, { ...open, writerEpoch: 2 }, { progress: { from: "attempt 2" } }), grant2),
    );
    assert.equal(answer.progressRevision, 1);
    const after = view(kernel, executionId);
    assert.equal(after.exchanges[0]?.writerEpoch, 2);
    assert.deepEqual(
      after.receipts.map((receipt) => receipt.position),
      [1, 2, 3, 4],
      "creation, dispatch, takeover, Outcome: contiguous, no gaps from the refused arms",
    );
  });
});

describe("K12-R3-AUTH-02 submission authority is undiscoverable and unforgeable", () => {
  test("hidden and missing stay indistinguishable, and views expose no grant", () => {
    const { kernel, executionId, open } = openExecution("auth2-nondisclosure");
    const outsider = caller("app-c", "tenant-c");

    for (const id of [executionId, "execution-404"]) {
      const probe = refused(
        kernel.submitOutcome(outsider, outcomeFor(id, open), forged(id, open.activationId, 1)),
      );
      assert.equal(probe.classification, "unknown_destination");
      assert.equal(probe.position, 0);
      assert.equal(probe.executionId, null);
    }
    const hiddenProbe = refused(kernel.submitOutcome(outsider, outcomeFor(executionId, open), forged(executionId, open.activationId, 1)));
    const missingProbe = refused(kernel.submitOutcome(outsider, outcomeFor("execution-404", open), forged("execution-404", open.activationId, 1)));
    assert.deepEqual({ ...hiddenProbe }, { ...missingProbe });

    // Inspection exposes coordinates but no grant reference: the Activation view carries exactly
    // its documented fields, and no view object is the grant the Driver holds.
    const seen = view(kernel, executionId);
    assert.deepEqual(Object.keys(seen.activation ?? {}).sort(), [
      "activationId",
      "baseProgressRevision",
      "batch",
      "deliveries",
      "receipt",
      "writerEpoch",
    ]);
    assert.equal((seen.activation as unknown as Record<string, unknown>).submission, undefined);
  });
});
