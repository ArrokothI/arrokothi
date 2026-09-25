/**
 * K12-R1-AUTH-01 - control authority distinct from visibility, and safe replacement.
 *
 * Canonical owners: `evidence.md` (inspection does not grant control), `authority.md`
 * (separate powers), `identity.md#writer-epoch` + `recovery.md` + `driver.md` (safe
 * replacement prerequisite), `kernel.md` (fencing does not stop native work).
 *
 * Covers:
 * - visible caller lacking control (`observer`) vs control (`caller`) on takeover/recover/report;
 * - safe-replacement gating (`isSafeToReplace` exactly true, absent/false/throwing refused);
 * - visibility before control (hidden ≡ missing, no record);
 * - visibility alone cannot authorize a fresh Outcome; the separate current attempt grant is required;
 * - control is per-scope.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ExecutionCoordinator,
  type Activation,
  type AuthenticatedCaller,
  type DeliverySettlement,
  type ExecutionDriver,
  type ExecutionView,
} from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  delayedDriver,
  observer,
  outcomeFor,
  recordingDriver,
  refused,
  unsafeDriver,
} from "./harness.ts";

const author = caller("app-a", "tenant-a");
const obs = observer("app-a", "tenant-a");
const outsider = caller("app-c", "tenant-c");

const MISSING = "execution-404";

function freshDispatched(creationKey: string, driver: ExecutionDriver = recordingDriver()) {
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest({ creationKey, scope: "tenant-a" })));
  const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  return { kernel, driver, executionId: created.executionId, dispatched };
}

const viewAs = (kernel: ExecutionCoordinator, who: AuthenticatedCaller, executionId: string): ExecutionView =>
  accepted(kernel.inspect(who, executionId));

/** Strips refusals for the "only refusals changed" comparison. */
function withoutRefusals(view: ExecutionView): Omit<ExecutionView, "refusals"> {
  const { refusals: _dropped, ...rest } = view;
  return rest;
}

describe("K12-R1-AUTH-01 visible caller without control vs control on all three controls", () => {
  test("observer can inspect OK", () => {
    const { kernel, executionId } = freshDispatched("auth-inspect-1");
    const byAuthor = viewAs(kernel, author, executionId);
    const byObserver = viewAs(kernel, obs, executionId);
    assert.deepEqual(byObserver, byAuthor);
    assert.equal(byObserver.executionId, executionId);
  });

  test("observer takeover refused unauthorized_control; author takeover succeeds epoch 2", () => {
    const { kernel, executionId, dispatched } = freshDispatched("auth-takeover-1");
    const before = viewAs(kernel, author, executionId);

    const refusal = refused(
      kernel.requestTakeover(obs, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(refusal.classification, "unauthorized_control");
    assert.equal(refusal.executionId, executionId, "visible caller: execution named, not null");
    assert.equal(refusal.position, 1, "per-Execution refusal index starts at 1");
    assert.ok(Object.isFrozen(refusal), "refusal frozen");

    const after = viewAs(kernel, author, executionId);
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1], refusal, "recorded");
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before), "only refusals changed");
    assert.equal(after.activation?.writerEpoch, 1, "epoch still 1");
    assert.deepEqual(after.recoveryHolds, [], "holds empty");
    assert.deepEqual(after.recoveryHistory, [], "history empty");
    assert.deepEqual(after.receipts, before.receipts, "receipts unchanged");
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries, "deliveries unchanged");

    const taken = accepted(
      kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(taken.writerEpoch, 2, "control-authorized takeover succeeds");
    assert.equal(taken.supersededEpoch, 1);
  });

  test("observer recover refused unauthorized_control; author recover creates hold", () => {
    const { kernel, executionId, dispatched } = freshDispatched("auth-recover-1");
    const missing = {
      activationId: dispatched.activationId,
      available: {
        definitionRevisions: [] as string[],
        runtimeContractRevisions: ["runtime-contract@1"],
        progressCodecs: ["inline-json@1"],
      },
    };
    const before = viewAs(kernel, author, executionId);

    const refusal = refused(kernel.recoverExecution(obs, executionId, missing));
    assert.equal(refusal.classification, "unauthorized_control");
    assert.equal(refusal.executionId, executionId);
    assert.equal(refusal.position, 1);
    assert.ok(Object.isFrozen(refusal));

    const after = viewAs(kernel, author, executionId);
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1], refusal);
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before));
    assert.equal(after.activation?.writerEpoch, 1);
    assert.deepEqual(after.recoveryHolds, []);
    assert.deepEqual(after.recoveryHistory, []);
    assert.deepEqual(after.receipts, before.receipts);
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries);

    const decision = accepted(kernel.recoverExecution(author, executionId, missing));
    assert.equal(decision.changed, true, "control-authorized recover creates hold");
    assert.equal(decision.recoveryHolds.length, 1);
    assert.equal(decision.recoveryHolds[0]?.cause, "pinned_code_unavailable");
  });

  test("observer report refused unauthorized_control; author report creates hold", () => {
    const { kernel, executionId, dispatched } = freshDispatched("auth-report-1");
    const report = { activationId: dispatched.activationId, writerEpoch: 1, diagnostic: "native said boom" };
    const before = viewAs(kernel, author, executionId);

    const refusal = refused(kernel.reportProtocolFailure(obs, executionId, report));
    assert.equal(refusal.classification, "unauthorized_control");
    assert.equal(refusal.executionId, executionId);
    assert.equal(refusal.position, 1);
    assert.ok(Object.isFrozen(refusal));

    const after = viewAs(kernel, author, executionId);
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1], refusal);
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before));
    assert.equal(after.activation?.writerEpoch, 1);
    assert.deepEqual(after.recoveryHolds, []);
    assert.deepEqual(after.recoveryHistory, []);
    assert.deepEqual(after.receipts, before.receipts);
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries);

    const decision = accepted(kernel.reportProtocolFailure(author, executionId, report));
    assert.equal(decision.changed, true, "control-authorized report creates hold");
    assert.equal(decision.recoveryHolds.length, 1);
    assert.equal(decision.recoveryHolds[0]?.cause, "protocol_failure");
  });
});

describe("K12-R1-AUTH-01 takeover safe-replacement", () => {
  test("recordingDriver (safe) accepted", () => {
    const { kernel, executionId, dispatched } = freshDispatched("safe-recording-1", recordingDriver());
    const taken = accepted(
      kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(taken.writerEpoch, 2);
    assert.equal(viewAs(kernel, author, executionId).activation?.writerEpoch, 2);
  });

  test("delayedDriver (safe) accepted", () => {
    const { kernel, executionId, dispatched } = freshDispatched("safe-delayed-1", delayedDriver());
    const taken = accepted(
      kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(taken.writerEpoch, 2);
  });

  test("unsafeDriver refused unsafe_replacement with zero mutation except refusal", () => {
    const { kernel, executionId, dispatched } = freshDispatched("safe-unsafe-1", unsafeDriver());
    const before = viewAs(kernel, author, executionId);

    const refusal = refused(
      kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(refusal.classification, "unsafe_replacement");
    assert.equal(refusal.executionId, executionId);
    assert.equal(refusal.position, 1);
    assert.ok(Object.isFrozen(refusal));

    const after = viewAs(kernel, author, executionId);
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1], refusal);
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before), "zero mutation except refusal");
    assert.equal(after.activation?.writerEpoch, 1, "epoch 1");
    assert.deepEqual(after.receipts, before.receipts, "no receipt");
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries, "no new delivery");
  });

  test("driver lacking isSafeToReplace refused unsafe_replacement", () => {
    const noMethod: ExecutionDriver = {
      driverId: "fake-no-method",
      deliver(_activation: Activation, settlement: DeliverySettlement): undefined {
        settlement.delivered();
        return undefined;
      },
    };
    const { kernel, executionId, dispatched } = freshDispatched("safe-absent-1", noMethod);
    const before = viewAs(kernel, author, executionId);

    const refusal = refused(
      kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(refusal.classification, "unsafe_replacement", "absent treated as unsafe");
    assert.equal(refusal.executionId, executionId);
    assert.equal(refusal.position, 1);
    assert.ok(Object.isFrozen(refusal));

    const after = viewAs(kernel, author, executionId);
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1], refusal);
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before));
    assert.equal(after.activation?.writerEpoch, 1);
    assert.deepEqual(after.receipts, before.receipts);
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries);
  });

  test("throwing isSafeToReplace refused unsafe_replacement", () => {
    const throwing: ExecutionDriver = {
      driverId: "fake-throwing-safety",
      deliver(_activation: Activation, settlement: DeliverySettlement): undefined {
        settlement.delivered();
        return undefined;
      },
      isSafeToReplace(): boolean {
        throw new Error("cannot determine");
      },
    };
    const { kernel, executionId, dispatched } = freshDispatched("safe-throwing-1", throwing);
    const before = viewAs(kernel, author, executionId);

    const refusal = refused(
      kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(refusal.classification, "unsafe_replacement", "throwing treated as unsafe");
    assert.equal(refusal.executionId, executionId);
    assert.equal(refusal.position, 1);
    assert.ok(Object.isFrozen(refusal));

    const after = viewAs(kernel, author, executionId);
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1], refusal);
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before));
    assert.equal(after.activation?.writerEpoch, 1);
    assert.deepEqual(after.receipts, before.receipts);
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries);
  });
});

describe("K12-R1-AUTH-01 visibility before control", () => {
  test("outsider gets unknown_destination for all three controls, hidden≡missing, no record", () => {
    const { kernel, executionId, dispatched } = freshDispatched("visibility-1");
    const before = viewAs(kernel, author, executionId);

    const takeoverReq = { activationId: dispatched.activationId, writerEpoch: 1 };
    const recoverReq = {
      activationId: dispatched.activationId,
      available: {
        definitionRevisions: ["weekly-report@3"],
        runtimeContractRevisions: ["runtime-contract@1"],
        progressCodecs: ["inline-json@1"],
      },
    };
    const reportReq = { activationId: dispatched.activationId, writerEpoch: 1, diagnostic: "x" };

    const hiddenTakeover = refused(kernel.requestTakeover(outsider, executionId, takeoverReq));
    const missingTakeover = refused(kernel.requestTakeover(outsider, MISSING, takeoverReq));
    const hiddenRecover = refused(kernel.recoverExecution(outsider, executionId, recoverReq));
    const missingRecover = refused(kernel.recoverExecution(outsider, MISSING, recoverReq));
    const hiddenReport = refused(kernel.reportProtocolFailure(outsider, executionId, reportReq));
    const missingReport = refused(kernel.reportProtocolFailure(outsider, MISSING, reportReq));

    for (const refusal of [hiddenTakeover, missingTakeover, hiddenRecover, missingRecover, hiddenReport, missingReport]) {
      assert.equal(refusal.classification, "unknown_destination");
      assert.equal(refusal.position, 0);
      assert.equal(refusal.executionId, null);
    }
    assert.deepEqual({ ...hiddenTakeover }, { ...missingTakeover }, "hidden≡missing takeover");
    assert.deepEqual({ ...hiddenRecover }, { ...missingRecover }, "hidden≡missing recover");
    assert.deepEqual({ ...hiddenReport }, { ...missingReport }, "hidden≡missing report");

    const after = viewAs(kernel, author, executionId);
    assert.deepEqual(after, before, "no record on hidden Execution");
  });
});

describe("K12-R1-AUTH-01 observer Outcome without grant is refused (K12-R3-AUTH-02)", () => {
  test("visibility-only caller submitting at a valid epoch is refused without the attempt grant", () => {
    const { kernel, executionId, dispatched } = freshDispatched("observer-outcome-1");
    const before = viewAs(kernel, author, executionId);
    const outcome = outcomeFor(executionId, dispatched);
    const forged = { executionId, activationId: dispatched.activationId, writerEpoch: 1 } as never;
    const refusal = refused(kernel.submitOutcome(obs, outcome, forged));
    assert.equal(refusal.classification, "unauthorized_submission");
    assert.equal(refusal.executionId, executionId);
    const after = viewAs(kernel, author, executionId);
    assert.deepEqual(after.recoveryHolds, []);
    assert.deepEqual(after.recoveryHistory, []);
    assert.equal(after.progressRevision, before.progressRevision);
    assert.equal(after.state, before.state);
    assert.equal(after.activation?.writerEpoch, 1, "the real attempt remains answerable");
  });
});

describe("K12-R1-AUTH-01 control is per-scope", () => {
  const creatorB = caller("app-b", "tenant-b");
  const mixed: AuthenticatedCaller = {
    namespace: "app-a",
    scopes: ["tenant-a", "tenant-b"],
    controlScopes: ["tenant-a"],
  };

  function freshInB(creationKey: string) {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(
      kernel.createExecution(creatorB, createRequest({ creationKey, scope: "tenant-b", authorityContext: { tenant: "b" } })),
    );
    const dispatched = accepted(kernel.dispatch(creatorB, created.executionId, { bound: 1 }));
    return { kernel, executionId: created.executionId, dispatched };
  }

  test("mixed sees tenant-b but cannot takeover there", () => {
    const { kernel, executionId, dispatched } = freshInB("mixed-takeover-b-1");
    const seen = accepted(kernel.inspect(mixed, executionId));
    assert.equal(seen.executionId, executionId, "visible");
    const before = seen;

    const refusal = refused(
      kernel.requestTakeover(mixed, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }),
    );
    assert.equal(refusal.classification, "unauthorized_control", "visible but no control for that scope");
    assert.equal(refusal.executionId, executionId);
    assert.ok(refusal.position >= 1);
    assert.ok(Object.isFrozen(refusal));

    const after = accepted(kernel.inspect(mixed, executionId));
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1], refusal);
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before));
    assert.equal(after.activation?.writerEpoch, 1);
  });

  test("mixed cannot recover in tenant-b", () => {
    const { kernel, executionId, dispatched } = freshInB("mixed-recover-b-1");
    assert.ok(accepted(kernel.inspect(mixed, executionId)));
    const before = accepted(kernel.inspect(mixed, executionId));
    const refusal = refused(
      kernel.recoverExecution(mixed, executionId, {
        activationId: dispatched.activationId,
        available: {
          definitionRevisions: ["weekly-report@3"],
          runtimeContractRevisions: ["runtime-contract@1"],
          progressCodecs: ["inline-json@1"],
        },
      }),
    );
    assert.equal(refusal.classification, "unauthorized_control");
    assert.equal(refusal.executionId, executionId);
    assert.ok(refusal.position >= 1);
    assert.ok(Object.isFrozen(refusal));
    const after = accepted(kernel.inspect(mixed, executionId));
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before));
    assert.deepEqual(after.recoveryHolds, []);
  });

  test("mixed cannot report in tenant-b", () => {
    const { kernel, executionId, dispatched } = freshInB("mixed-report-b-1");
    assert.ok(accepted(kernel.inspect(mixed, executionId)));
    const before = accepted(kernel.inspect(mixed, executionId));
    const refusal = refused(
      kernel.reportProtocolFailure(mixed, executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
        diagnostic: "x",
      }),
    );
    assert.equal(refusal.classification, "unauthorized_control");
    assert.equal(refusal.executionId, executionId);
    assert.ok(refusal.position >= 1);
    assert.ok(Object.isFrozen(refusal));
    const after = accepted(kernel.inspect(mixed, executionId));
    assert.deepEqual(withoutRefusals(after), withoutRefusals(before));
    assert.deepEqual(after.recoveryHolds, []);
  });
});
