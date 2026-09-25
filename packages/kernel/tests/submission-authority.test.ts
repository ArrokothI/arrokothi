/**
 * K12-R3-AUTH-02 - visibility alone cannot speak as the current Runtime attempt.
 *
 * Canonical owners: `execution-cycle.md` (the Kernel sends an Activation through the Driver; the
 * Runtime returns the Outcome — a proposal until accepted), `evidence.md` (inspection privilege
 * grants no attempt-submission or general control power),
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

/**
 * K12-R9-ORDER-01 / K12-R9-EVID-01 — authority before content.
 *
 * Canonical order (execution-cycle.md#outcome-acceptance, DEC-2, DEC-20): scope, then
 * replay/conflict, then exchange currency (terminal, Activation, epoch, base revision), then
 * the current attempt's submission grant, then content, then atomic acceptance. A later group
 * must not be inspected, diagnosed, returned, retained, or otherwise made observably relevant
 * until every preceding group has succeeded.
 *
 * Prior coverage missed this clause because every grant-less case sent valid content and every
 * content-defect case presented the current grant, so no oracle crossed authority failure with
 * invalid content, and no ablation inverted authority/content ordering.
 *
 * All malformed writerEpoch/baseProgressRevision variants below share one implementation path:
 * `acceptCount` (outcome.ts) rejects missing, fractional, negative, and zero-epoch values, so
 * `capture.claim` is null and the same content-group branch answers after authority. The sampled
 * variants document that equivalence rather than exploding the product.
 */
function deepProgress(depth: number): unknown {
  let root: Record<string, unknown> = {};
  let current = root;
  for (let index = 0; index < depth; index += 1) {
    const child: Record<string, unknown> = {};
    current["n"] = child;
    current = child;
  }
  return root;
}

function assertRefusedOnlyAppendsRefusal(before: ExecutionView, after: ExecutionView, classification: string): void {
  assert.equal(after.refusals.length, before.refusals.length + 1, "exactly one refusal was recorded");
  assert.equal(after.refusals[after.refusals.length - 1]?.classification, classification);
  const { refusals: _afterRefusals, ...afterRest } = after;
  const { refusals: _beforeRefusals, ...beforeRest } = before;
  assert.deepEqual(afterRest, beforeRest, "no acknowledgment, progress, Emission, result, disposition, state, epoch or receipt changed");
}

describe("K12-R9 authority before content on a well-formed current claim (Case A)", () => {
  test("grant-less and forged current proposals with invalid content are unauthorized without content disclosure", () => {
    const { kernel, executionId, open } = openExecution("r9-case-a");
    const invalidContents: [string, Record<string, unknown>][] = [
      ["duplicate Emission key", { emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }] }],
      ["unsupported Effect", { effects: [1] }],
    ];
    for (const [label, content] of invalidContents) {
      for (const [grantLabel, grant] of [
        ["absent", undefined],
        ["forged", forged(executionId, open.activationId, 1)],
      ] as const) {
        const before = view(kernel, executionId);
        const envelope = outcomeFor(executionId, open, { progress: 1, ...content }) as Parameters<typeof kernel.submitOutcome>[1];
        const refusal = refused(kernel.submitOutcome(dashboard, envelope, grant as unknown as SubmissionGrant));
        assert.equal(refusal.classification, "unauthorized_submission", `${label} × ${grantLabel}`);
        assert.match(refusal.reason, /presents no submission authority/, `${label} × ${grantLabel}: authority reason`);
        assert.doesNotMatch(refusal.reason, /duplicate_key/, `${label} × ${grantLabel}: no emission content`);
        assert.doesNotMatch(refusal.reason, /effects_unsupported/, `${label} × ${grantLabel}: no effect content`);
        assert.doesNotMatch(refusal.reason, /too_deep|unknown_field|not_a_count|missing_field|lone_surrogate/, `${label} × ${grantLabel}: no other content`);
        const after = view(kernel, executionId);
        assertRefusedOnlyAppendsRefusal(before, after, "unauthorized_submission");
        const retained = after.refusals[after.refusals.length - 1];
        assert.deepEqual(retained, refusal, `${label} × ${grantLabel}: retained equals returned`);
        assert.doesNotMatch(retained?.reason ?? "", /duplicate_key|effects_unsupported/, `${label} × ${grantLabel}: retained hides content`);
        assert.ok(Object.isFrozen(retained), "retained refusal is frozen");
      }
    }
  });

  test("the same invalid content with the current grant reaches content validation", () => {
    const { kernel, driver, executionId, open } = openExecution("r9-case-a-control");
    const grant = submissionFor(driver, open.activationId);
    const before = view(kernel, executionId);
    const refusal = refused(
      kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: 1, emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }] }), grant),
    );
    assert.equal(refusal.classification, "malformed_envelope");
    assert.match(refusal.reason, /duplicate_key/);
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "malformed_envelope");
    const effectsRefusal = refused(
      kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: 1, effects: [1] }), grant),
    );
    assert.equal(effectsRefusal.classification, "malformed_envelope");
    assert.match(effectsRefusal.reason, /effects_unsupported/);
  });

  test("over-capacity proposals without authority are unauthorized, not capacity disclosures", () => {
    // Capacity is content-group after authority (DEC-9 within step 3): an over-limit list from a
    // non-entitled caller must not have its size diagnosed before authority succeeds.
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver, emissionsPerOutcome: 2 });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r9-case-a-capacity" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const three = [{ emissionKey: "e1", value: 1 }, { emissionKey: "e2", value: 2 }, { emissionKey: "e3", value: 3 }];
    for (const [grantLabel, grant] of [
      ["absent", undefined],
      ["forged", forged(executionId, open.activationId, 1)],
    ] as const) {
      const before = view(kernel, executionId);
      const refusal = refused(
        kernel.submitOutcome(dashboard, outcomeFor(executionId, open, { progress: 1, emissions: three }), grant as unknown as SubmissionGrant),
      );
      assert.equal(refusal.classification, "unauthorized_submission", `over-capacity × ${grantLabel}`);
      assert.match(refusal.reason, /presents no submission authority/, `over-capacity × ${grantLabel}`);
      assert.doesNotMatch(refusal.reason, /carries 3 Emissions/, `over-capacity × ${grantLabel}: no capacity content`);
      assert.doesNotMatch(refusal.reason, /capacity_exhausted|duplicate_key|effects_unsupported/, `over-capacity × ${grantLabel}: no content`);
      const after = view(kernel, executionId);
      assertRefusedOnlyAppendsRefusal(before, after, "unauthorized_submission");
      assert.deepEqual(after.refusals[after.refusals.length - 1], refusal, `over-capacity × ${grantLabel}: retained equals returned`);
    }
    // The same over-limit list with the current grant reaches capacity validation.
    const grant = submissionFor(driver, open.activationId);
    const capacity = refused(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: 1, emissions: three }), grant));
    assert.equal(capacity.classification, "capacity_exhausted");
    assert.match(capacity.reason, /carries 3 Emissions/);
  });
});

describe("K12-R9 malformed coordinates crossed with authority failure and invalid content (Case B)", () => {
  test("missing, fractional, and negative epoch/base variants never leak content before authority", () => {
    const { kernel, executionId, open } = openExecution("r9-case-b");
    const deep = deepProgress(40);
    const badContent = {
      progress: deep,
      emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
      next: { step: "fail", error: "\ud800" },
    };
    const malformedClaims: [string, Record<string, unknown>][] = [
      ["missing epoch", (() => { const envelope: Record<string, unknown> = { writerEpoch: undefined }; return envelope; })()],
      ["fractional epoch", { writerEpoch: 1.5 }],
      ["negative epoch", { writerEpoch: -1 }],
      ["missing base revision", { baseProgressRevision: undefined }],
      ["fractional base revision", { baseProgressRevision: 1.5 }],
      ["negative base revision", { baseProgressRevision: -1 }],
    ];
    for (const [claimLabel, claim] of malformedClaims) {
      for (const [grantLabel, grant] of [
        ["absent", undefined],
        ["forged", forged(executionId, open.activationId, 1)],
      ] as const) {
        const before = view(kernel, executionId);
        const base = outcomeFor(executionId, open, badContent) as unknown as Record<string, unknown>;
        if (claim["writerEpoch"] === undefined && claimLabel === "missing epoch") delete base["writerEpoch"];
        else Object.assign(base, claim["writerEpoch"] !== undefined ? { writerEpoch: claim["writerEpoch"] } : {});
        if (claimLabel === "missing base revision") delete base["baseProgressRevision"];
        else if (claim["baseProgressRevision"] !== undefined) base["baseProgressRevision"] = claim["baseProgressRevision"];
        // For the missing-epoch arm the envelope truly omits the field; for the others it carries the bad number.
        const refusal = refused(kernel.submitOutcome(dashboard, base as unknown as Parameters<typeof kernel.submitOutcome>[1], grant as unknown as SubmissionGrant));
        assert.equal(refusal.classification, "unauthorized_submission", `${claimLabel} × ${grantLabel}`);
        assert.match(refusal.reason, /presents no submission authority/, `${claimLabel} × ${grantLabel}`);
        assert.doesNotMatch(refusal.reason, /too_deep/, `${claimLabel} × ${grantLabel}: no progress content`);
        assert.doesNotMatch(refusal.reason, /duplicate_key/, `${claimLabel} × ${grantLabel}: no emission content`);
        assert.doesNotMatch(refusal.reason, /lone_surrogate|effects_unsupported|unknown_field/, `${claimLabel} × ${grantLabel}: no next/effect content`);
        assert.doesNotMatch(refusal.reason, /not_a_count|missing_field/, `${claimLabel} × ${grantLabel}: claim itself is content-group after authority`);
        const after = view(kernel, executionId);
        assertRefusedOnlyAppendsRefusal(before, after, "unauthorized_submission");
        assert.deepEqual(after.refusals[after.refusals.length - 1], refusal, `${claimLabel} × ${grantLabel}: retained equals returned`);
      }
    }
  });

  test("base -1 with effects and no grant is unauthorized, not an effect disclosure (P2c)", () => {
    const { kernel, executionId, open } = openExecution("r9-case-b-p2c");
    const before = view(kernel, executionId);
    const refusal = refused(
      kernel.submitOutcome(
        dashboard,
        outcomeFor(executionId, open, { progress: 1, effects: [1], baseProgressRevision: -1 }) as Parameters<typeof kernel.submitOutcome>[1],
        undefined as unknown as SubmissionGrant,
      ),
    );
    assert.equal(refusal.classification, "unauthorized_submission");
    assert.doesNotMatch(refusal.reason, /effects_unsupported/);
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "unauthorized_submission");
  });
});

describe("K12-R9 entitled malformed and content-invalid attempts reach later validation (Case C)", () => {
  test("valid grant with malformed claim and invalid content is malformed, not unauthorized", () => {
    const { kernel, driver, executionId, open } = openExecution("r9-case-c");
    const grant = submissionFor(driver, open.activationId);
    const deep = deepProgress(40);
    const envelope = {
      ...outcomeFor(executionId, open, {
        progress: deep,
        emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
        next: { step: "fail", error: "\ud800" },
      }),
      writerEpoch: undefined,
    } as unknown as Parameters<typeof kernel.submitOutcome>[1];
    delete (envelope as unknown as Record<string, unknown>)["writerEpoch"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, envelope, grant));
    assert.equal(refusal.classification, "malformed_envelope");
    assert.match(refusal.reason, /writerEpoch not_a_count/, "malformed claim reported");
    assert.match(refusal.reason, /too_deep/, "deep progress reported once entitled");
    assert.match(refusal.reason, /duplicate_key/, "duplicate Emission reported once entitled");
    assert.match(refusal.reason, /next\.error lone_surrogate/, "genuinely malformed fail error reported once entitled");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "malformed_envelope");
    assert.deepEqual(view(kernel, executionId).refusals.at(-1), refusal, "retained refusal carries the full diagnostics");
    // A corrected proposal from the same entitled attempt still commits.
    const answer = kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 1 } }), grant);
    assert.equal(answer.ok, true);
  });
});

describe("K12-R9 neighboring currency ordering: retired grant with stale exchange (Case D)", () => {
  test("currency refusal still precedes authority, even with invalid content", () => {
    const { kernel, driver, executionId, open } = openExecution("r9-case-d");
    const grant1 = submissionFor(driver, open.activationId);
    const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    assert.equal(taken.writerEpoch, 2);
    const grant2 = submissionFor(driver, open.activationId);
    const staleBad = outcomeFor(executionId, open, {
      progress: deepProgress(40),
      emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
    });
    // Retired grant with its own stale coordinates: stale, not unauthorized, no content leak.
    const before = view(kernel, executionId);
    const staleRetired = refused(kernel.submitOutcome(author, staleBad, grant1));
    assert.equal(staleRetired.classification, "stale_exchange");
    assert.doesNotMatch(staleRetired.reason, /too_deep|duplicate_key/);
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "stale_exchange");
    // Current grant with stale coordinates: still stale — currency precedes authority.
    const staleCurrent = refused(kernel.submitOutcome(author, staleBad, grant2));
    assert.equal(staleCurrent.classification, "stale_exchange");
    assert.doesNotMatch(staleCurrent.reason, /too_deep|duplicate_key/);
    // Retired grant with current coordinates: unauthorized.
    const current = { ...open, writerEpoch: 2 };
    const unauthorized = refused(kernel.submitOutcome(author, outcomeFor(executionId, current, { progress: { cursor: 9 } }), grant1));
    assert.equal(unauthorized.classification, "unauthorized_submission");
  });
});
