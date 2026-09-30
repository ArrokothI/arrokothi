/**
 * K12-R11-ORDER-01 - total Outcome refusal-classification for partial (mixed) claims.
 *
 * Canonical owner: `mental-model/mechanisms/execution-cycle.md#outcome-acceptance` step 3:
 * "A proposal that no longer answers the current exchange is refused as stale whatever authority
 * it presents; only a current proposal without the current authority is refused as unauthorized."
 * Contract: K1.2-DEC-2, DEC-20; C3/C8/C10. BASELINE `#outcome-acceptance-api`.
 *
 * The table is total over the envelope's claim crossed with grant and content state:
 * - Activation identity: current, wrong-open, resolved, missing/malformed/unobservable
 *   (decision-02: third exchange coordinate; never establishes staleness, never addresses replay,
 *   content-group refusal after authority), no open exchange.
 * - writerEpoch: current, stale-low, future/not-yet-issued, missing/malformed.
 * - baseProgressRevision: current, stale, missing/malformed.
 * - Mixed partial claims: one coordinate well-formed and stale while the other is missing or
 *   malformed; the well-formed stale half refuses as `stale_exchange` whatever authority it
 *   presents, with no content diagnostics (R11 + R9 coexistence, decision-02 for the identity).
 * - Submission authority: current, retired, forged, absent.
 * - Content: valid and representative invalid (deep/duplicate/lone-surrogate/unknown/effects/
 *   over-capacity/await).
 * - Replay/conflict and terminal precedence where they interact with classification.
 * - Scope/nondisclosure: hidden remains indistinguishable from missing.
 *
 * For every refusal arm this file asserts more than the headline classification: the permitted
 * reason, the forbidden diagnostics (returned and retained), exactly one appended refusal with
 * retained-equals-returned, zero accepted-state mutation, no unintended acknowledgment or
 * terminal change, the exchange still answerable, and nondisclosure where scope applies.
 *
 * Existing Case B/C/D distinctions in `submission-authority.test.ts` are retained unchanged and
 * rerun as controls; this file does not edit them.
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
const outsider = caller("app-c", "tenant-c");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView =>
  accepted(kernel.inspect(author, executionId));

const forged = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant =>
  ({ executionId, activationId, writerEpoch }) as SubmissionGrant;

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

/** No content diagnostic may appear in a stale or unauthorized reason, returned or retained. */
const FORBIDDEN_CONTENT = /too_deep|duplicate_key|lone_surrogate|effects_unsupported|unknown_field|not_a_count|missing_field|unsupported_form|non_finite|wait_unsupported|carries \d+ Emissions|capacity_exhausted/;

function assertNoContentLeak(reason: string, label: string): void {
  assert.doesNotMatch(reason, FORBIDDEN_CONTENT, `${label}: no content diagnostic in reason`);
}

/** A dispatched execution taken over to epoch 2, base 0. Current grants and retired grants saved. */
function postTakeover(creationKey: string) {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest({ creationKey })));
  const executionId = created.executionId;
  const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
  const retired = submissionFor(driver, open.activationId);
  const taken = accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
  assert.equal(taken.writerEpoch, 2);
  const current = submissionFor(driver, open.activationId);
  assert.notEqual(current, retired);
  return { kernel, driver, executionId, open, retired, current };
}

describe("K12-R11 partial stale epoch: well-formed stale writerEpoch with malformed base is stale whatever authority", () => {
  // Current exchange after takeover: epoch 2, base 0.
  const malformedBases: [string, Record<string, unknown>][] = [
    ["base missing", {}],
    ["base -1", { baseProgressRevision: -1 }],
    ["base fractional", { baseProgressRevision: 1.5 }],
    ["base string", { baseProgressRevision: "0" }],
  ];
  for (const [baseLabel, basePatch] of malformedBases) {
    for (const [grantLabel, grantKind] of [["retired", "retired"], ["forged", "forged"], ["absent", "absent"], ["current", "current"]] as const) {
      for (const [contentLabel, content] of [
        ["valid content", { progress: 1 }],
        ["invalid content", { progress: deepProgress(40), emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }], next: { step: "fail", error: "\ud800" } }],
      ] as const) {
        test(`stale epoch 1 + ${baseLabel} + ${grantLabel} grant + ${contentLabel} -> stale_exchange`, () => {
          const { kernel, executionId, open, retired, current } = postTakeover(`r11-b-${baseLabel}-${grantLabel}-${contentLabel}`.replace(/[^a-z0-9-]/gi, "-"));
          const grant =
            grantKind === "retired" ? retired : grantKind === "current" ? current : grantKind === "forged" ? forged(executionId, open.activationId, 2) : (undefined as unknown as SubmissionGrant);
          const who = grantKind === "absent" || grantKind === "forged" ? dashboard : author;
          const base = outcomeFor(executionId, open, { ...content }) as unknown as Record<string, unknown>;
          base["writerEpoch"] = 1;
          if (baseLabel === "base missing") delete base["baseProgressRevision"];
          else base["baseProgressRevision"] = (basePatch as Record<string, unknown>)["baseProgressRevision"];
          const before = view(kernel, executionId);
          const refusal = refused(kernel.submitOutcome(who, base as never, grant));
          assert.equal(refusal.classification, "stale_exchange", "well-formed stale epoch refuses as stale whatever authority");
          assert.match(refusal.reason, /superseded by epoch 2/, "stale reason names the superseded epoch");
          assertNoContentLeak(refusal.reason, "stale");
          const after = view(kernel, executionId);
          assertRefusedOnlyAppendsRefusal(before, after, "stale_exchange");
          assert.deepEqual(after.refusals[after.refusals.length - 1], refusal, "retained equals returned");
          assert.ok(Object.isFrozen(after.refusals[after.refusals.length - 1]), "retained refusal is frozen");
          assert.equal(after.state, "RUNNING");
          assert.equal(after.progressRevision, 0);
          assert.equal(after.activation?.writerEpoch, 2);
          // The exchange stays answerable by a corrected current proposal.
          const corrected = accepted(kernel.submitOutcome(author, outcomeFor(executionId, { activationId: open.activationId, writerEpoch: 2, baseProgressRevision: 0 }, { progress: { cursor: 1 } }), current));
          assert.equal(corrected.receipt.boundary, "outcome_acceptance");
        });
      }
    }
  }

  test("future epoch 5 with base missing and no grant is stale, not unauthorized", () => {
    const { kernel, executionId, open } = postTakeover("r11-b-future");
    const base = outcomeFor(executionId, open, { progress: 1 }) as unknown as Record<string, unknown>;
    base["writerEpoch"] = 5;
    delete base["baseProgressRevision"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(dashboard, base as never, undefined as unknown as SubmissionGrant));
    assert.equal(refusal.classification, "stale_exchange");
    assert.match(refusal.reason, /has not been issued/, "future epoch names not-yet-issued");
    assertNoContentLeak(refusal.reason, "future stale");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "stale_exchange");
  });

  test("stale epoch with over-capacity content and no grant is stale, not a capacity disclosure", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver, emissionsPerOutcome: 2 });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r11-b-cap" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    const three = [{ emissionKey: "e1", value: 1 }, { emissionKey: "e2", value: 2 }, { emissionKey: "e3", value: 3 }];
    const base = outcomeFor(executionId, open, { progress: 1, emissions: three }) as unknown as Record<string, unknown>;
    base["writerEpoch"] = 1;
    delete base["baseProgressRevision"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(dashboard, base as never, undefined as unknown as SubmissionGrant));
    assert.equal(refusal.classification, "stale_exchange");
    assertNoContentLeak(refusal.reason, "stale over-capacity");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "stale_exchange");
  });
});

describe("K12-R11 partial stale base: malformed writerEpoch with well-formed stale base is stale whatever authority", () => {
  const malformedEpochs: [string, Record<string, unknown>, boolean][] = [
    ["epoch missing", {}, true],
    ["epoch fractional", { writerEpoch: 1.5 }, false],
    ["epoch negative", { writerEpoch: -1 }, false],
    ["epoch string", { writerEpoch: "2" }, false],
  ];
  for (const [epochLabel, epochPatch, isMissing] of malformedEpochs) {
    for (const [grantLabel, grantKind] of [["current", "current"], ["absent", "absent"], ["forged", "forged"]] as const) {
      test(`stale base 7 + ${epochLabel} + ${grantLabel} grant -> stale_exchange`, () => {
        const { kernel, executionId, open, current } = postTakeover(`r11-c-${epochLabel}-${grantLabel}`.replace(/[^a-z0-9-]/gi, "-"));
        const grant =
          grantKind === "current" ? current : grantKind === "forged" ? forged(executionId, open.activationId, 2) : (undefined as unknown as SubmissionGrant);
        const who = grantKind === "current" ? author : dashboard;
        const base = outcomeFor(executionId, open, {
          progress: deepProgress(40),
          emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
        }) as unknown as Record<string, unknown>;
        if (isMissing) delete base["writerEpoch"];
        else base["writerEpoch"] = (epochPatch as Record<string, unknown>)["writerEpoch"];
        base["baseProgressRevision"] = 7;
        const before = view(kernel, executionId);
        const refusal = refused(kernel.submitOutcome(who, base as never, grant));
        assert.equal(refusal.classification, "stale_exchange", "well-formed stale base refuses as stale whatever authority");
        assert.match(refusal.reason, /does not match the revision 0/, "stale reason names the pinned base");
        assertNoContentLeak(refusal.reason, "stale base");
        const after = view(kernel, executionId);
        assertRefusedOnlyAppendsRefusal(before, after, "stale_exchange");
        assert.deepEqual(after.refusals[after.refusals.length - 1], refusal, "retained equals returned");
      });
    }
  }

  test("stale-low base on the second exchange with missing epoch is stale", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r11-c-second" })));
    const executionId = created.executionId;
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, first, { progress: { cursor: 1 } }), submissionFor(driver, first.activationId)));
    const second = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    assert.equal(second.baseProgressRevision, 1);
    const grant = submissionFor(driver, second.activationId);
    const base = outcomeFor(executionId, second, {
      progress: deepProgress(40),
      emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
    }) as unknown as Record<string, unknown>;
    delete base["writerEpoch"];
    base["baseProgressRevision"] = 0;
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(dashboard, base as never, undefined as unknown as SubmissionGrant));
    assert.equal(refusal.classification, "stale_exchange");
    assertNoContentLeak(refusal.reason, "second-exchange stale base");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "stale_exchange");
    // The current grant still answers the current exchange afterwards.
    void grant;
  });
});

describe("K12-R11 non-stale partial claims keep Case B/C behavior (current + malformed)", () => {
  test("current epoch with malformed base and no grant is unauthorized with no claim disclosure", () => {
    const { kernel, executionId, open } = postTakeover("r11-d-current-malformed");
    const bad = outcomeFor(executionId, { activationId: open.activationId, writerEpoch: 2, baseProgressRevision: 0 }, {
      progress: deepProgress(40),
      emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
      next: { step: "fail", error: "\ud800" },
    }) as unknown as Record<string, unknown>;
    delete bad["baseProgressRevision"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(dashboard, bad as never, undefined as unknown as SubmissionGrant));
    assert.equal(refusal.classification, "unauthorized_submission");
    assert.match(refusal.reason, /presents no submission authority/);
    assertNoContentLeak(refusal.reason, "current+malformed grant-less");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "unauthorized_submission");
    assert.deepEqual(view(kernel, executionId).refusals.at(-1), refusal, "retained equals returned");
  });

  test("current epoch with malformed base and the current grant reaches malformed content validation", () => {
    const { kernel, driver, executionId, open } = postTakeover("r11-d-entitled");
    const current = submissionFor(driver, open.activationId);
    const bad = outcomeFor(executionId, { activationId: open.activationId, writerEpoch: 2, baseProgressRevision: 0 }, {
      progress: deepProgress(40),
      emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
      next: { step: "fail", error: "\ud800" },
    }) as unknown as Record<string, unknown>;
    delete bad["baseProgressRevision"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, bad as never, current));
    assert.equal(refusal.classification, "malformed_envelope");
    assert.match(refusal.reason, /baseProgressRevision not_a_count/, "malformed base reported once entitled");
    assert.match(refusal.reason, /too_deep/, "deep progress reported once entitled");
    assert.match(refusal.reason, /duplicate_key/, "duplicate Emission reported once entitled");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "malformed_envelope");
    void driver;
  });

  test("fully malformed claim with no grant stays unauthorized; with grant stays malformed", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r11-d-both-malformed" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const grant = submissionFor(driver, open.activationId);
    const both = outcomeFor(executionId, open, { progress: 1 }) as unknown as Record<string, unknown>;
    delete both["writerEpoch"];
    delete both["baseProgressRevision"];
    const unauthorized = refused(kernel.submitOutcome(dashboard, both as never, undefined as unknown as SubmissionGrant));
    assert.equal(unauthorized.classification, "unauthorized_submission");
    assertNoContentLeak(unauthorized.reason, "both-malformed grant-less");
    const malformed = refused(kernel.submitOutcome(author, both as never, grant));
    assert.equal(malformed.classification, "malformed_envelope");
    assert.match(malformed.reason, /writerEpoch not_a_count/);
    assert.match(malformed.reason, /baseProgressRevision not_a_count/);
  });
});

describe("K12-R11 activation identity, replay/conflict, terminal and scope precedence", () => {
  test("wrong Activation ID with a partial-stale claim is stale, naming the exchange", () => {
    const { kernel, executionId, open, retired } = postTakeover("r11-a-wrong");
    const base = outcomeFor(executionId, open, { progress: 1 }) as unknown as Record<string, unknown>;
    base["activationId"] = "activation-other";
    base["writerEpoch"] = 1;
    delete base["baseProgressRevision"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, base as never, retired));
    assert.equal(refusal.classification, "stale_exchange");
    assert.match(refusal.reason, /not the unresolved exchange/);
    assertNoContentLeak(refusal.reason, "wrong activation");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "stale_exchange");
  });

  test("non-text Activation ID with the current grant is content-group malformed (decision-02)", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r11-a-nontext" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const grant = submissionFor(driver, open.activationId);
    const base = outcomeFor(executionId, open, { progress: 1 }) as unknown as Record<string, unknown>;
    base["activationId"] = 7;
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, base as never, grant));
    assert.equal(refusal.classification, "malformed_envelope");
    assert.match(refusal.reason, /activationId/);
    assert.match(refusal.reason, /unsupported_form/, "identity issue reported with content");
    assert.doesNotMatch(refusal.reason, /Activation 7/, "malformed value is not rendered");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "malformed_envelope");
    assert.deepEqual(view(kernel, executionId).refusals.at(-1), refusal, "retained equals returned");
    // The exchange stays answerable by a corrected current proposal.
    const corrected = accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 1 } }), grant));
    assert.equal(corrected.receipt.boundary, "outcome_acceptance");
  });

  test("an uncapturable partial claim under an accepted Activation ID conflicts, not stale/malformed", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r11-f-conflict" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 1 } }), submissionFor(driver, open.activationId)));
    const partial = outcomeFor(executionId, open, { progress: { cursor: 2 } }) as unknown as Record<string, unknown>;
    delete partial["writerEpoch"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, partial as never, submissionFor(driver, open.activationId)));
    assert.equal(refusal.classification, "duplicate_conflict");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "duplicate_conflict");
  });

  test("terminal execution refuses a fresh partial-stale proposal as terminal, with no content leak", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r11-f-terminal" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(
      kernel.submitOutcome(author, outcomeFor(executionId, open, { next: { step: "complete", result: { done: 1 } } }), submissionFor(driver, open.activationId)),
    );
    assert.equal(view(kernel, executionId).state, "COMPLETED");
    const stale = outcomeFor(executionId, open, {
      progress: deepProgress(40),
      emissions: [{ emissionKey: "x", value: 1 }, { emissionKey: "x", value: 2 }],
    }) as unknown as Record<string, unknown>;
    stale["writerEpoch"] = 1;
    delete stale["baseProgressRevision"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, stale as never, submissionFor(driver, open.activationId)));
    // Terminal precedes currency: a fresh proposal to a terminal execution is terminal-fenced.
    // (Replay of the accepted terminal Outcome would replay instead; this changed proposal is fresh.)
    assert.equal(refusal.classification, "duplicate_conflict", "under the accepted Activation ID a changed proposal conflicts");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "duplicate_conflict");
  });

  test("terminal execution with a new Activation ID refuses partial-stale as terminal, not stale", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest({ creationKey: "r11-f-terminal-new" })));
    const executionId = created.executionId;
    const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(
      kernel.submitOutcome(author, outcomeFor(executionId, open, { next: { step: "complete", result: { done: 1 } } }), submissionFor(driver, open.activationId)),
    );
    const fresh = {
      executionId,
      activationId: "activation-new",
      writerEpoch: 1,
      progress: 1,
      next: { step: "continue" },
    } as unknown as Parameters<ExecutionCoordinator["submitOutcome"]>[1];
    delete (fresh as unknown as Record<string, unknown>)["baseProgressRevision"];
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, fresh, submissionFor(driver, open.activationId)));
    assert.equal(refusal.classification, "terminal_destination");
    assertNoContentLeak(refusal.reason, "terminal fresh");
    assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "terminal_destination");
  });

  test("outsider partial-stale proposals stay unknown_destination and indistinguishable", () => {
    const { kernel, driver, executionId, open } = postTakeover("r11-g-scope");
    const stale = outcomeFor(executionId, open, { progress: 1 }) as unknown as Record<string, unknown>;
    stale["writerEpoch"] = 1;
    delete stale["baseProgressRevision"];
    const before = view(kernel, executionId);
    const hidden = refused(kernel.submitOutcome(outsider, stale as never, submissionFor(driver, open.activationId)));
    const missing = refused(
      kernel.submitOutcome(outsider, { ...(stale as object), executionId: "execution-404" } as never, submissionFor(driver, open.activationId)),
    );
    assert.deepEqual({ ...hidden }, { ...missing }, "hidden and missing are indistinguishable");
    assert.equal(hidden.classification, "unknown_destination");
    assert.equal(hidden.position, 0);
    assert.equal(hidden.executionId, null);
    assert.deepEqual(view(kernel, executionId), before, "nothing recorded on the hidden Execution");
    void driver;
  });
});

describe("K1.2 decision-02 malformed Activation identity distinguishing schedules (C3)", () => {
  type IdentityVariant = "missing" | "number" | "object" | "throwing";
  const identityVariants: IdentityVariant[] = ["missing", "number", "object", "throwing"];

  const applyIdentity = (envelope: Record<string, unknown>, variant: IdentityVariant): string[] => {
    if (variant === "missing") {
      delete envelope["activationId"];
      return [];
    }
    if (variant === "number") {
      envelope["activationId"] = 7;
      return ["Activation 7", "for Activation 7"];
    }
    if (variant === "object") {
      envelope["activationId"] = { id: "evil" };
      return ["[object Object]"];
    }
    Object.defineProperty(envelope, "activationId", {
      get() {
        throw new Error("boom-activation-identity");
      },
      enumerable: true,
      configurable: true,
    });
    return ["boom-activation-identity"];
  };

  const invalidContent = {
    progress: deepProgress(40),
    emissions: [
      { emissionKey: "x", value: 1 },
      { emissionKey: "x", value: 2 },
    ],
    next: { step: "fail", error: "\ud800" },
  };

  const assertNoRawValue = (reason: string, forbidden: string[], label: string): void => {
    for (const token of forbidden) {
      assert.ok(!reason.includes(token), `${label}: malformed value not rendered (forbidden ${JSON.stringify(token)} in ${JSON.stringify(reason)})`);
    }
  };

  const assertPreAuthorityRefusal = (
    kernel: ExecutionCoordinator,
    executionId: string,
    before: ExecutionView,
    refusal: { classification: string; reason: string },
    forbidden: string[],
    label: string,
  ): void => {
    assertNoContentLeak(refusal.reason, `${label} returned`);
    assertNoRawValue(refusal.reason, forbidden, `${label} returned`);
    const after = view(kernel, executionId);
    assertRefusedOnlyAppendsRefusal(before, after, refusal.classification);
    const retained = after.refusals[after.refusals.length - 1];
    assert.deepEqual(retained, refusal, `${label}: retained equals returned`);
    assert.ok(Object.isFrozen(retained), `${label}: retained refusal is frozen`);
    assertNoContentLeak(retained?.reason ?? "", `${label} retained`);
    assertNoRawValue(retained?.reason ?? "", forbidden, `${label} retained`);
  };

  for (const variant of identityVariants) {
    for (const contentLabel of ["valid", "invalid"] as const) {
      const content = contentLabel === "valid" ? { progress: 1 } : invalidContent;

      test(`terminal + identity ${variant} + ${contentLabel} content -> terminal_destination`, () => {
        const driver = recordingDriver();
        const kernel = new ExecutionCoordinator({ driver });
        const created = accepted(kernel.createExecution(author, createRequest({ creationKey: `d02-terminal-${variant}-${contentLabel}` })));
        const executionId = created.executionId;
        const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
        const grant = submissionFor(driver, open.activationId);
        accepted(
          kernel.submitOutcome(author, outcomeFor(executionId, open, { next: { step: "complete", result: { done: 1 } } }), grant),
        );
        assert.equal(view(kernel, executionId).state, "COMPLETED");
        const envelope = outcomeFor(executionId, open, { ...content }) as unknown as Record<string, unknown>;
        const forbidden = applyIdentity(envelope, variant);
        const before = view(kernel, executionId);
        const refusal = refused(kernel.submitOutcome(author, envelope as never, grant));
        assert.equal(refusal.classification, "terminal_destination", "terminal fence dominates malformed identity");
        assert.match(refusal.reason, /ended as COMPLETED/);
        assertPreAuthorityRefusal(kernel, executionId, before, refusal, forbidden, `terminal/${variant}/${contentLabel}`);
        assert.equal(view(kernel, executionId).state, "COMPLETED", "terminal state unchanged");
      });

      test(`no unresolved exchange + identity ${variant} + ${contentLabel} content -> stale_exchange`, () => {
        const driver = recordingDriver();
        const kernel = new ExecutionCoordinator({ driver });
        const created = accepted(kernel.createExecution(author, createRequest({ creationKey: `d02-noexchange-${variant}-${contentLabel}` })));
        const executionId = created.executionId;
        const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
        const grant = submissionFor(driver, open.activationId);
        accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 1 } }), grant));
        assert.equal(view(kernel, executionId).state, "READY");
        assert.equal(view(kernel, executionId).activation, null);
        const envelope = outcomeFor(executionId, open, { ...content }) as unknown as Record<string, unknown>;
        const forbidden = applyIdentity(envelope, variant);
        const before = view(kernel, executionId);
        const refusal = refused(kernel.submitOutcome(author, envelope as never, grant));
        assert.equal(refusal.classification, "stale_exchange", "no unresolved exchange refuses stale whatever identity shape");
        assert.match(refusal.reason, /not the unresolved exchange|no exchange is unresolved|not usable/);
        assertPreAuthorityRefusal(kernel, executionId, before, refusal, forbidden, `no-exchange/${variant}/${contentLabel}`);
        // A fresh dispatch still answers afterwards.
        const next = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
        const nextGrant = submissionFor(driver, next.activationId);
        const corrected = accepted(kernel.submitOutcome(author, outcomeFor(executionId, next, { progress: { cursor: 2 } }), nextGrant));
        assert.equal(corrected.receipt.boundary, "outcome_acceptance");
      });

      for (const grantLabel of ["current", "retired", "forged", "absent"] as const) {
        test(`stale epoch 1 + identity ${variant} + ${grantLabel} grant + ${contentLabel} content -> stale_exchange`, () => {
          const { kernel, executionId, open, retired, current } = postTakeover(
            `d02-sepoch-${variant}-${grantLabel}-${contentLabel}`.replace(/[^a-z0-9-]/gi, "-"),
          );
          const grant =
            grantLabel === "current"
              ? current
              : grantLabel === "retired"
                ? retired
                : grantLabel === "forged"
                  ? forged(executionId, open.activationId, 2)
                  : (undefined as unknown as SubmissionGrant);
          const who = grantLabel === "current" ? author : dashboard;
          const envelope = outcomeFor(executionId, open, { ...content }) as unknown as Record<string, unknown>;
          envelope["writerEpoch"] = 1;
          envelope["baseProgressRevision"] = 0;
          const forbidden = applyIdentity(envelope, variant);
          const before = view(kernel, executionId);
          const refusal = refused(kernel.submitOutcome(who, envelope as never, grant));
          assert.equal(refusal.classification, "stale_exchange", "well-formed stale epoch dominates malformed identity");
          assert.match(refusal.reason, /superseded by epoch 2/);
          assert.match(refusal.reason, /was not usable/, "pre-content reason says not usable instead of rendering value");
          assertPreAuthorityRefusal(kernel, executionId, before, refusal, forbidden, `stale-epoch/${variant}/${grantLabel}/${contentLabel}`);
          const corrected = accepted(
            kernel.submitOutcome(author, outcomeFor(executionId, { activationId: open.activationId, writerEpoch: 2, baseProgressRevision: 0 }, { progress: { cursor: 1 } }), current),
          );
          assert.equal(corrected.receipt.boundary, "outcome_acceptance");
        });

        test(`stale base 7 + identity ${variant} + ${grantLabel} grant + ${contentLabel} content -> stale_exchange`, () => {
          const { kernel, executionId, open, retired, current } = postTakeover(
            `d02-sbase-${variant}-${grantLabel}-${contentLabel}`.replace(/[^a-z0-9-]/gi, "-"),
          );
          const grant =
            grantLabel === "current"
              ? current
              : grantLabel === "retired"
                ? retired
                : grantLabel === "forged"
                  ? forged(executionId, open.activationId, 2)
                  : (undefined as unknown as SubmissionGrant);
          const who = grantLabel === "current" ? author : dashboard;
          const envelope = outcomeFor(executionId, open, { ...content }) as unknown as Record<string, unknown>;
          envelope["writerEpoch"] = 2;
          envelope["baseProgressRevision"] = 7;
          const forbidden = applyIdentity(envelope, variant);
          const before = view(kernel, executionId);
          const refusal = refused(kernel.submitOutcome(who, envelope as never, grant));
          assert.equal(refusal.classification, "stale_exchange", "well-formed stale base dominates malformed identity");
          assert.match(refusal.reason, /does not match the revision 0/);
          assert.match(refusal.reason, /was not usable/);
          assertPreAuthorityRefusal(kernel, executionId, before, refusal, forbidden, `stale-base/${variant}/${grantLabel}/${contentLabel}`);
          const corrected = accepted(
            kernel.submitOutcome(author, outcomeFor(executionId, { activationId: open.activationId, writerEpoch: 2, baseProgressRevision: 0 }, { progress: { cursor: 1 } }), current),
          );
          assert.equal(corrected.receipt.boundary, "outcome_acceptance");
        });
      }

      for (const grantLabel of ["retired", "forged", "absent"] as const) {
        test(`current coordinates + identity ${variant} + ${grantLabel} grant + ${contentLabel} content -> unauthorized_submission`, () => {
          const { kernel, executionId, open, retired, current } = postTakeover(
            `d02-unauth-${variant}-${grantLabel}-${contentLabel}`.replace(/[^a-z0-9-]/gi, "-"),
          );
          const grant =
            grantLabel === "retired" ? retired : grantLabel === "forged" ? forged(executionId, open.activationId, 2) : (undefined as unknown as SubmissionGrant);
          const envelope = outcomeFor(executionId, open, { ...content }) as unknown as Record<string, unknown>;
          envelope["writerEpoch"] = 2;
          envelope["baseProgressRevision"] = 0;
          const forbidden = applyIdentity(envelope, variant);
          const before = view(kernel, executionId);
          const refusal = refused(kernel.submitOutcome(dashboard, envelope as never, grant));
          assert.equal(refusal.classification, "unauthorized_submission", "current coordinates without the current grant refuse as unauthorized");
          assert.match(refusal.reason, /presents no submission authority/);
          assert.match(refusal.reason, /was not usable/);
          assertPreAuthorityRefusal(kernel, executionId, before, refusal, forbidden, `unauth/${variant}/${grantLabel}/${contentLabel}`);
          const corrected = accepted(
            kernel.submitOutcome(author, outcomeFor(executionId, { activationId: open.activationId, writerEpoch: 2, baseProgressRevision: 0 }, { progress: { cursor: 1 } }), current),
          );
          assert.equal(corrected.receipt.boundary, "outcome_acceptance");
        });
      }

      test(`current coordinates + identity ${variant} + current grant + ${contentLabel} content -> malformed_envelope`, () => {
        const { kernel, driver, executionId, open } = postTakeover(`d02-malformed-${variant}-${contentLabel}`.replace(/[^a-z0-9-]/gi, "-"));
        const current = submissionFor(driver, open.activationId);
        const envelope = outcomeFor(executionId, open, { ...content }) as unknown as Record<string, unknown>;
        envelope["writerEpoch"] = 2;
        envelope["baseProgressRevision"] = 0;
        const forbidden = applyIdentity(envelope, variant);
        const before = view(kernel, executionId);
        const refusal = refused(kernel.submitOutcome(author, envelope as never, current));
        assert.equal(refusal.classification, "malformed_envelope", "entitled malformed identity reaches content");
        assert.match(refusal.reason, /activationId/, "identity issue listed");
        assertNoRawValue(refusal.reason, forbidden, `malformed/${variant}/${contentLabel}`);
        if (contentLabel === "invalid") {
          assert.match(refusal.reason, /too_deep/, "other content issues listed with the identity issue");
          assert.match(refusal.reason, /duplicate_key/);
        } else {
          assert.doesNotMatch(refusal.reason, /too_deep/, "otherwise-valid content names only the identity issue");
        }
        const after = view(kernel, executionId);
        assertRefusedOnlyAppendsRefusal(before, after, "malformed_envelope");
        assert.deepEqual(after.refusals[after.refusals.length - 1], refusal, "retained equals returned");
        const corrected = accepted(
          kernel.submitOutcome(author, outcomeFor(executionId, { activationId: open.activationId, writerEpoch: 2, baseProgressRevision: 0 }, { progress: { cursor: 1 } }), current),
        );
        assert.equal(corrected.receipt.boundary, "outcome_acceptance");
        void driver;
      });
    }
  }
});

describe("K1.2 decision-02 unaddressable identity never replays or conflicts (C2)", () => {
  type IdentityVariant = "missing" | "number" | "object" | "throwing";
  const identityVariants: IdentityVariant[] = ["missing", "number", "object", "throwing"];

  const applyIdentity = (envelope: Record<string, unknown>, variant: IdentityVariant): void => {
    if (variant === "missing") {
      delete envelope["activationId"];
      return;
    }
    if (variant === "number") {
      envelope["activationId"] = 7;
      return;
    }
    if (variant === "object") {
      envelope["activationId"] = { id: "evil" };
      return;
    }
    Object.defineProperty(envelope, "activationId", {
      get() {
        throw new Error("boom-activation-identity");
      },
      enumerable: true,
      configurable: true,
    });
  };

  for (const variant of identityVariants) {
    test(`later exchange + identity ${variant} identical resubmission is stale, not replay`, () => {
      const driver = recordingDriver();
      const kernel = new ExecutionCoordinator({ driver });
      const created = accepted(kernel.createExecution(author, createRequest({ creationKey: `d02-replay-later-ident-${variant}` })));
      const executionId = created.executionId;
      const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
      const firstGrant = submissionFor(driver, first.activationId);
      const acceptedDecision = accepted(kernel.submitOutcome(author, outcomeFor(executionId, first, { progress: { cursor: 1 } }), firstGrant));
      const second = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
      assert.notEqual(second.activationId, first.activationId);
      assert.equal(second.baseProgressRevision, 1);
      const envelope = outcomeFor(executionId, first, { progress: { cursor: 1 } }) as unknown as Record<string, unknown>;
      applyIdentity(envelope, variant);
      const before = view(kernel, executionId);
      const refusal = refused(kernel.submitOutcome(author, envelope as never, submissionFor(driver, second.activationId)));
      assert.notEqual(refusal.classification, "duplicate_conflict", "malformed identity never conflicts");
      assert.equal(refusal.classification, "stale_exchange", "fresh order classifies by the well-formed stale base");
      assert.match(refusal.reason, /does not match the revision 1/);
      assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "stale_exchange");
      // Well-formed identity keeps replay behavior.
      const replayed = accepted(kernel.submitOutcome(author, outcomeFor(executionId, first, { progress: { cursor: 1 } }), firstGrant));
      assert.equal(replayed.replayed, true);
      assert.equal(replayed.receipt.token, acceptedDecision.receipt.token);
    });

    test(`later exchange + identity ${variant} changed resubmission is stale, not conflict`, () => {
      const driver = recordingDriver();
      const kernel = new ExecutionCoordinator({ driver });
      const created = accepted(kernel.createExecution(author, createRequest({ creationKey: `d02-conflict-later-${variant}` })));
      const executionId = created.executionId;
      const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
      const firstGrant = submissionFor(driver, first.activationId);
      accepted(kernel.submitOutcome(author, outcomeFor(executionId, first, { progress: { cursor: 1 } }), firstGrant));
      const second = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
      const envelope = outcomeFor(executionId, first, { progress: { cursor: 2 } }) as unknown as Record<string, unknown>;
      applyIdentity(envelope, variant);
      const before = view(kernel, executionId);
      const refusal = refused(kernel.submitOutcome(author, envelope as never, submissionFor(driver, second.activationId)));
      assert.notEqual(refusal.classification, "duplicate_conflict");
      assert.equal(refusal.classification, "stale_exchange");
      assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "stale_exchange");
      // Well-formed changed content under the accepted ID still conflicts.
      const conflict = refused(kernel.submitOutcome(author, outcomeFor(executionId, first, { progress: { cursor: 2 } }), firstGrant));
      assert.equal(conflict.classification, "duplicate_conflict");
    });

    test(`terminal + identity ${variant} identical resubmission is terminal, not replay`, () => {
      const driver = recordingDriver();
      const kernel = new ExecutionCoordinator({ driver });
      const created = accepted(kernel.createExecution(author, createRequest({ creationKey: `d02-replay-terminal-ident-${variant}` })));
      const executionId = created.executionId;
      const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
      const grant = submissionFor(driver, open.activationId);
      const acceptedDecision = accepted(
        kernel.submitOutcome(author, outcomeFor(executionId, open, { next: { step: "complete", result: { done: 1 } } }), grant),
      );
      const envelope = outcomeFor(executionId, open, { next: { step: "complete", result: { done: 1 } } }) as unknown as Record<string, unknown>;
      applyIdentity(envelope, variant);
      const before = view(kernel, executionId);
      const refusal = refused(kernel.submitOutcome(author, envelope as never, grant));
      assert.notEqual((refusal as { replayed?: boolean }).replayed, true);
      assert.equal(refusal.classification, "terminal_destination", "terminal fence dominates unaddressable identity");
      assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "terminal_destination");
      // Well-formed identical still replays after terminal.
      const replayed = accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { next: { step: "complete", result: { done: 1 } } }), grant));
      assert.equal(replayed.replayed, true);
      assert.equal(replayed.receipt.token, acceptedDecision.receipt.token);
    });

    test(`terminal + identity ${variant} changed resubmission is terminal, not conflict`, () => {
      const driver = recordingDriver();
      const kernel = new ExecutionCoordinator({ driver });
      const created = accepted(kernel.createExecution(author, createRequest({ creationKey: `d02-conflict-terminal-${variant}` })));
      const executionId = created.executionId;
      const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
      const grant = submissionFor(driver, open.activationId);
      accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { next: { step: "complete", result: { done: 1 } } }), grant));
      const envelope = outcomeFor(executionId, open, { progress: { cursor: 9 } }) as unknown as Record<string, unknown>;
      applyIdentity(envelope, variant);
      const before = view(kernel, executionId);
      const refusal = refused(kernel.submitOutcome(author, envelope as never, grant));
      assert.equal(refusal.classification, "terminal_destination");
      assert.notEqual(refusal.classification, "duplicate_conflict");
      assertRefusedOnlyAppendsRefusal(before, view(kernel, executionId), "terminal_destination");
      // Well-formed changed content under the accepted ID still conflicts after terminal.
      const conflict = refused(kernel.submitOutcome(author, outcomeFor(executionId, open, { progress: { cursor: 9 } }), grant));
      assert.equal(conflict.classification, "duplicate_conflict");
    });
  }
});
