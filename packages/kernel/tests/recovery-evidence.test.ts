/**
 * K12-R1 recovery evidence non-disclosure and immutability.
 *
 * Covers every new evidence/control record:
 * - K12-R1-HISTORY-01 recovery history (entered/updated/cleared/ended, retained)
 * - K12-R1-HOLD-01 holds + permittedNextActions
 * - K12-R1-DELIVERY-01 delivery attribution rows
 * - K12-R1-AUTH-01 control refusals (unauthorized_control, unsafe_replacement)
 *
 * Canonical owners: `mental-model/concepts/identity.md` (per-Execution positions,
 * hidden ≡ missing), `mental-model/mechanisms/evidence.md` (scoped visibility,
 * frozen retained evidence), `mechanisms/recovery.md` + K1.2-DEC-17/18 (holds/history),
 * `mechanisms/execution-cycle.md#delivery-reporting-boundary` + K1.2-DEC-16 (deliveries),
 * K1.2-DEC-14/15 (control authority / safe replacement).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator } from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  delayedDriver,
  observer,
  outcomeFor,
  recordingDriver,
  refused,
  submissionFor,
  unsafeDriver,
  type RecordingDriver,
} from "./harness.ts";

const authorA = caller("app-a", "tenant-a");
const authorB = caller("app-b", "tenant-b");
const observerA = observer("app-a", "tenant-a");
const observerB = observer("app-b", "tenant-b");

const MISSING_AVAILABLE = {
  definitionRevisions: [] as string[],
  runtimeContractRevisions: ["runtime-contract@1"],
  progressCodecs: ["inline-json@1"],
};

const FULL_AVAILABLE = {
  definitionRevisions: ["weekly-report@3"],
  runtimeContractRevisions: ["runtime-contract@1"],
  progressCodecs: ["inline-json@1"],
};

const bCreate = (creationKey: string) =>
  createRequest({
    creationKey,
    scope: "tenant-b",
    authorityContext: { tenant: "b" },
    initialInput: { kind: "application.request", payload: { text: `hidden ${creationKey}` } },
  });

function attemptMutation(mutate: () => void): void {
  try {
    mutate();
  } catch {
    // Frozen objects throw TypeError in strict mode; fresh copies silently accept.
    // What matters is the next inspect, asserted by each caller.
  }
}

// ---------------------------------------------------------------------------
// 1. Nondisclosure across new records
// ---------------------------------------------------------------------------

interface EvidenceArm {
  serialized: string[];
  viewJson: string;
  hiddenIds: string[];
  kernel: ExecutionCoordinator;
  executionId: string;
}

function runEvidenceArm(
  hidden: (kernel: ExecutionCoordinator, hiddenIds: string[], round: number, driver: RecordingDriver) => void,
): EvidenceArm {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const hiddenIds: string[] = [];

  const createdA = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-evidence" })));
  hidden(kernel, hiddenIds, 0, driver);

  const dispatchedA = accepted(kernel.dispatch(authorA, createdA.executionId, { bound: 1 }));
  hidden(kernel, hiddenIds, 1, driver);

  const recoverA = accepted(
    kernel.recoverExecution(authorA, createdA.executionId, {
      activationId: dispatchedA.activationId,
      available: MISSING_AVAILABLE,
    }),
  );
  hidden(kernel, hiddenIds, 2, driver);

  const reportA = accepted(
    kernel.reportProtocolFailure(authorA, createdA.executionId, {
      activationId: dispatchedA.activationId,
      writerEpoch: 1,
      diagnostic: "a-native-garbled",
    }),
  );
  hidden(kernel, hiddenIds, 3, driver);

  const viewA = accepted(kernel.inspect(authorA, createdA.executionId));
  const visibleA = kernel.visibleExecutions(authorA);

  for (const hid of hiddenIds) {
    const probe = refused(kernel.inspect(authorA, hid));
    assert.equal(probe.classification, "unknown_destination");
    assert.equal(probe.executionId, null);
    assert.ok(!visibleA.includes(hid), "B's Executions never appear in A's listing");
  }

  const serialized = [
    JSON.stringify(createdA),
    JSON.stringify(dispatchedA),
    JSON.stringify(recoverA),
    JSON.stringify(reportA),
    JSON.stringify(viewA),
    JSON.stringify(viewA.receipts),
    JSON.stringify(viewA.recoveryHistory),
    JSON.stringify(viewA.recoveryHolds),
    JSON.stringify(viewA.activation?.deliveries),
    JSON.stringify(viewA.refusals),
    JSON.stringify(visibleA),
  ];
  return { serialized, viewJson: JSON.stringify(viewA), hiddenIds, kernel, executionId: createdA.executionId };
}

function hiddenEvidenceActivity(kernel: ExecutionCoordinator, hiddenIds: string[], round: number, driver: RecordingDriver): void {
  const key = `b-evidence-${round}`;
  const createdB = accepted(kernel.createExecution(authorB, bCreate(key)));
  hiddenIds.push(createdB.executionId);
  const dispatchedB = accepted(kernel.dispatch(authorB, createdB.executionId, { bound: 1 }));
  accepted(
    kernel.recoverExecution(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      available: MISSING_AVAILABLE,
    }),
  );
  accepted(
    kernel.reportProtocolFailure(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      writerEpoch: 1,
      diagnostic: `hidden-diagnostic-${round}-marker-xyz-789`,
    }),
  );
  accepted(
    kernel.recoverExecution(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      available: FULL_AVAILABLE,
    }),
  );
  accepted(
    kernel.requestTakeover(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      writerEpoch: 1,
    }),
  );
  accepted(
    kernel.submitOutcome(
      authorB,
      outcomeFor(createdB.executionId, { ...dispatchedB, writerEpoch: 2 }, { progress: { hidden: round }, next: { step: "continue" } }),
      submissionFor(driver, dispatchedB.activationId),
    ),
  );
  const secondB = accepted(kernel.dispatch(authorB, createdB.executionId, { bound: 1 }));
  accepted(
    kernel.submitOutcome(
      authorB,
      outcomeFor(createdB.executionId, secondB, {
        progress: { hidden: `done-${round}` },
        next: { step: "complete", result: { hidden: round } },
      }),
      submissionFor(driver, secondB.activationId),
    ),
  );
}

const noHidden = (): void => {};

describe("K12-R1 HISTORY/HOLD/DELIVERY/AUTH scoped non-disclosure for new records", () => {
  test("control arms agree exactly", () => {
    const first = runEvidenceArm(noHidden);
    const second = runEvidenceArm(noHidden);
    assert.deepEqual(second.serialized, first.serialized);
  });

  test("B create/dispatch/recover/report/takeover/outcome discloses nothing to A", () => {
    const control = runEvidenceArm(noHidden);
    const interleaved = runEvidenceArm(hiddenEvidenceActivity);
    assert.deepEqual(interleaved.serialized, control.serialized, "A's new-record evidence must not reveal B activity");

    // B's identities and B-only diagnostics absent from A's view.
    const aJson = interleaved.viewJson;
    assert.ok(!aJson.includes("b-evidence"), "B creation keys absent from A's view");
    assert.ok(!aJson.includes("marker-xyz-789"), "B diagnostics absent from A's view");
    assert.ok(!aJson.includes("hidden-diagnostic"), "B diagnostic text absent from A's view");
    for (const hid of interleaved.hiddenIds) {
      assert.ok(!aJson.includes(hid), "B executionId absent from A's view");
      const viewB = accepted(interleaved.kernel.inspect(authorB, hid));
      for (const ex of viewB.exchanges) {
        assert.ok(!aJson.includes(ex.activationId), "B activationId absent from A's view");
      }
      if (viewB.activation !== null) {
        assert.ok(!aJson.includes(viewB.activation.activationId));
      }
      for (const rec of viewB.recoveryHistory) {
        // Code-hold reasons coincide across scopes (same missing pin text); only
        // B-specific causation must stay hidden, and activationIds already checked.
        if (rec.reason.includes("marker-xyz-789")) {
          assert.ok(!aJson.includes(rec.reason));
        }
      }
    }
    // Hidden ≡ missing for A's inspector.
    for (const hid of interleaved.hiddenIds) {
      const probe = refused(interleaved.kernel.inspect(authorA, hid));
      assert.equal(probe.classification, "unknown_destination");
      assert.equal(probe.executionId, null);
      assert.equal(probe.position, 0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Immutability
// ---------------------------------------------------------------------------

describe("K12-R1-HISTORY-01 history records are immutable snapshots", () => {
  test("a) list push/pop/truncate and record edits leave next inspect unchanged, records frozen", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-history-imm" })));
    const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));
    accepted(
      kernel.recoverExecution(authorA, created.executionId, {
        activationId: dispatched.activationId,
        available: MISSING_AVAILABLE,
      }),
    );
    accepted(
      kernel.reportProtocolFailure(authorA, created.executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
        diagnostic: "history-imm",
      }),
    );

    const first = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(first.recoveryHistory.length, 2);
    for (const rec of first.recoveryHistory) {
      assert.ok(Object.isFrozen(rec), "each history record frozen");
    }
    const snapshot = JSON.stringify(first.recoveryHistory);

    const mutableList = first.recoveryHistory as unknown as unknown[];
    attemptMutation(() => {
      mutableList.push({ forged: true });
    });
    attemptMutation(() => {
      mutableList.pop();
    });
    attemptMutation(() => {
      mutableList.length = 0;
    });
    const rec0 = first.recoveryHistory[0] as unknown as Record<string, unknown>;
    attemptMutation(() => {
      rec0.reason = "forged reason";
    });
    attemptMutation(() => {
      rec0.transition = "cleared_by_takeover";
    });
    attemptMutation(() => {
      rec0.activationId = "forged";
    });
    attemptMutation(() => {
      rec0.actorNamespace = "forged";
    });

    const second = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(second.recoveryHistory.length, 2, "list edits did not reach retained history");
    assert.equal(JSON.stringify(second.recoveryHistory), snapshot, "record edits did not reach retained history");
    for (const rec of second.recoveryHistory) {
      assert.ok(Object.isFrozen(rec));
    }
    assert.ok(!JSON.stringify(second.recoveryHistory).includes("forged"));
  });
});

describe("K12-R1-HOLD-01 holds and permitted lists are frozen snapshots", () => {
  test("b) hold frozen, permitted frozen, edits leave next inspect unchanged", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-hold-imm" })));
    const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));
    accepted(
      kernel.recoverExecution(authorA, created.executionId, {
        activationId: dispatched.activationId,
        available: MISSING_AVAILABLE,
      }),
    );
    accepted(
      kernel.reportProtocolFailure(authorA, created.executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
        diagnostic: "hold-imm",
      }),
    );

    const first = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(first.recoveryHolds.length, 2);
    for (const hold of first.recoveryHolds) {
      assert.ok(Object.isFrozen(hold), "hold view frozen");
      assert.ok(Object.isFrozen(hold.permittedNextActions), "permitted list frozen");
    }
    // Both holds read declare+submit while code blocks takeover.
    assert.deepEqual(
      first.recoveryHolds.map((h) => h.permittedNextActions),
      [
        ["declare_code_availability", "submit_outcome"],
        ["declare_code_availability", "submit_outcome"],
      ],
    );
    const snapshot = JSON.stringify(first.recoveryHolds);

    const hold0 = first.recoveryHolds[0] as unknown as Record<string, unknown>;
    attemptMutation(() => {
      (hold0.permittedNextActions as unknown as string[]).push("request_takeover");
    });
    attemptMutation(() => {
      (hold0.permittedNextActions as unknown as string[]).pop();
    });
    attemptMutation(() => {
      hold0.reason = "forged reason";
    });
    attemptMutation(() => {
      hold0.cause = "protocol_failure";
    });
    const holdsList = first.recoveryHolds as unknown as unknown[];
    attemptMutation(() => {
      holdsList.push({ cause: "protocol_failure" });
    });
    attemptMutation(() => {
      holdsList.length = 0;
    });

    const second = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(JSON.stringify(second.recoveryHolds), snapshot, "hold edits did not reach retained holds");
    assert.deepEqual(
      second.recoveryHolds.map((h) => h.permittedNextActions),
      [
        ["declare_code_availability", "submit_outcome"],
        ["declare_code_availability", "submit_outcome"],
      ],
    );
    for (const hold of second.recoveryHolds) {
      assert.ok(Object.isFrozen(hold));
      assert.ok(Object.isFrozen(hold.permittedNextActions));
    }
  });
});

describe("K12-R1-DELIVERY-01 delivery rows are fresh copies, not caller-mutable", () => {
  test("c) activation deliveries: push/edit leave next inspect unchanged, views are fresh copies", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-delivery-imm" })));
    const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));
    accepted(kernel.redeliver(authorA, created.executionId));
    accepted(
      kernel.requestTakeover(authorA, created.executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
      }),
    );
    accepted(kernel.redeliver(authorA, created.executionId));

    const first = accepted(kernel.inspect(authorA, created.executionId));
    assert.deepEqual(
      first.activation?.deliveries.map((r) => [r.attempt, r.writerEpoch, r.status]),
      [
        [1, 1, "delivered"],
        [2, 1, "delivered"],
        [3, 2, "delivered"],
        [4, 2, "delivered"],
      ],
    );
    const snapshot = JSON.stringify(first.activation?.deliveries);

    // Fresh copies across inspects.
    const again = accepted(kernel.inspect(authorA, created.executionId));
    assert.notEqual(first.activation?.deliveries, again.activation?.deliveries, "deliveries list is a fresh copy");
    assert.notEqual(
      first.activation?.deliveries[0],
      again.activation?.deliveries[0],
      "delivery rows are fresh copies",
    );

    const rows = first.activation?.deliveries as unknown as Record<string, unknown>[];
    assert.ok(rows !== undefined);
    attemptMutation(() => {
      (rows as unknown as unknown[]).push({ attempt: 99, status: "delivered" });
    });
    attemptMutation(() => {
      (rows as unknown as unknown[]).pop();
    });
    attemptMutation(() => {
      rows[0]!.status = "failed";
    });
    attemptMutation(() => {
      rows[0]!.failure = "forged";
    });
    attemptMutation(() => {
      rows[0]!.writerEpoch = 99;
    });
    attemptMutation(() => {
      rows[0]!.activationId = "forged";
    });
    attemptMutation(() => {
      rows[1]!.attempt = 99;
    });

    const second = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(JSON.stringify(second.activation?.deliveries), snapshot, "delivery edits did not reach kernel");
    assert.deepEqual(
      second.activation?.deliveries.map((r) => r.attempt),
      [1, 2, 3, 4],
    );
  });

  test("c) resolved exchange deliveries: edits leave next inspect and replay unchanged", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-delivery-resolved" })));
    const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));
    accepted(kernel.redeliver(authorA, created.executionId));
    accepted(
      kernel.requestTakeover(authorA, created.executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
      }),
    );
    const answer = accepted(
      kernel.submitOutcome(
        authorA,
        outcomeFor(created.executionId, { ...dispatched, writerEpoch: 2 }, { progress: { cursor: 1 } }),
        submissionFor(driver, dispatched.activationId),
      ),
    );
    assert.equal(answer.progressRevision, 1);

    const first = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(first.activation, null, "exchange resolved");
    assert.equal(first.exchanges.length, 1);
    const snapshot = JSON.stringify(first.exchanges[0]?.deliveries);
    assert.deepEqual(
      first.exchanges[0]?.deliveries.map((r) => [r.attempt, r.writerEpoch]),
      [
        [1, 1],
        [2, 1],
        [3, 2],
      ],
    );

    const rows = first.exchanges[0]?.deliveries as unknown as Record<string, unknown>[];
    attemptMutation(() => {
      (rows as unknown as unknown[]).push({ attempt: 99 });
    });
    attemptMutation(() => {
      rows[0]!.status = "pending";
    });
    attemptMutation(() => {
      rows[0]!.failure = "forged";
    });
    attemptMutation(() => {
      rows[0]!.writerEpoch = 99;
    });
    attemptMutation(() => {
      rows[0]!.activationId = "forged-activation";
    });

    const second = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(JSON.stringify(second.exchanges[0]?.deliveries), snapshot, "resolved delivery edits did not reach kernel");

    // Exact outcome replay still answers from retained record, unchanged.
    const replayed = accepted(
      kernel.submitOutcome(
        authorA,
        outcomeFor(created.executionId, { ...dispatched, writerEpoch: 2 }, { progress: { cursor: 1 } }),
        submissionFor(driver, dispatched.activationId),
      ),
    );
    assert.equal(replayed.replayed, true);
    assert.equal(replayed.receipt, answer.receipt);
    const afterReplay = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(JSON.stringify(afterReplay.exchanges[0]?.deliveries), snapshot);
  });

  test("c) delayedDriver pending rows are fresh copies; settling after mutation touches only its row", () => {
    const driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-delivery-delayed" })));
    const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));
    accepted(kernel.redeliver(authorA, created.executionId));

    const first = accepted(kernel.inspect(authorA, created.executionId));
    assert.deepEqual(
      first.activation?.deliveries.map((r) => r.status),
      ["pending", "pending"],
    );
    const snapshot = JSON.stringify(first.activation?.deliveries);

    const rows = first.activation?.deliveries as unknown as Record<string, unknown>[];
    attemptMutation(() => {
      rows[0]!.status = "delivered";
    });
    attemptMutation(() => {
      (rows as unknown as unknown[]).push({ attempt: 99 });
    });

    const second = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(JSON.stringify(second.activation?.deliveries), snapshot, "pending edits did not reach kernel");

    // Settling still works row-locally after the mutation attempt.
    const cap0 = driver.settlements[0] as { delivered(): void; failed(reason: unknown): void };
    const cap1 = driver.settlements[1] as { delivered(): void; failed(reason: unknown): void };
    cap0.delivered();
    cap1.failed("second lost");
    const after = accepted(kernel.inspect(authorA, created.executionId));
    assert.deepEqual(
      after.activation?.deliveries.map((r) => [r.attempt, r.status, r.failure]),
      [
        [1, "delivered", null],
        [2, "failed", "second lost"],
      ],
    );
    assert.equal(after.activation?.activationId, dispatched.activationId);
    void dispatched;
  });
});

describe("K12-R1-AUTH-01 control refusals are frozen retained evidence", () => {
  test("d) unauthorized_control frozen; mutating returned or inspected copy leaves record unchanged", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-auth-imm" })));
    const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));

    const takeoverRefusal = refused(
      kernel.requestTakeover(observerA, created.executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
      }),
    );
    assert.equal(takeoverRefusal.classification, "unauthorized_control");
    assert.equal(takeoverRefusal.executionId, created.executionId);
    assert.equal(takeoverRefusal.position, 1);
    assert.ok(Object.isFrozen(takeoverRefusal), "control refusal frozen");

    const recoverRefusal = refused(
      kernel.recoverExecution(observerA, created.executionId, {
        activationId: dispatched.activationId,
        available: FULL_AVAILABLE,
      }),
    );
    assert.equal(recoverRefusal.classification, "unauthorized_control");
    assert.equal(recoverRefusal.position, 2);
    assert.ok(Object.isFrozen(recoverRefusal));

    const reportRefusal = refused(
      kernel.reportProtocolFailure(observerA, created.executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
        diagnostic: "x",
      }),
    );
    assert.equal(reportRefusal.classification, "unauthorized_control");
    assert.equal(reportRefusal.position, 3);
    assert.ok(Object.isFrozen(reportRefusal));

    const snapshot = JSON.stringify(accepted(kernel.inspect(authorA, created.executionId)).refusals);

    // Mutate returned records through cast-away readonly.
    for (const rec of [takeoverRefusal, recoverRefusal, reportRefusal]) {
      const m = rec as unknown as Record<string, unknown>;
      attemptMutation(() => {
        m.classification = "capacity_exhausted";
      });
      attemptMutation(() => {
        m.reason = "forged reason";
      });
      attemptMutation(() => {
        m.position = -1;
      });
      attemptMutation(() => {
        m.executionId = "execution-invented";
      });
    }
    // Mutate inspected copies too.
    const view = accepted(kernel.inspect(authorA, created.executionId));
    for (const rec of view.refusals) {
      const m = rec as unknown as Record<string, unknown>;
      attemptMutation(() => {
        m.reason = "forged via inspect";
      });
    }

    const after = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(JSON.stringify(after.refusals), snapshot, "control-refusal edits did not reach retained refusals");
    assert.deepEqual(
      after.refusals.map((r) => [r.classification, r.position]),
      [
        ["unauthorized_control", 1],
        ["unauthorized_control", 2],
        ["unauthorized_control", 3],
      ],
    );
    for (const rec of after.refusals) {
      assert.ok(Object.isFrozen(rec));
    }
  });

  test("d) unsafe_replacement frozen; mutation leaves inspect unchanged and mints no receipt/delivery", () => {
    const driver = unsafeDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-unsafe-imm" })));
    const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));
    const before = accepted(kernel.inspect(authorA, created.executionId));

    const refusal = refused(
      kernel.requestTakeover(authorA, created.executionId, {
        activationId: dispatched.activationId,
        writerEpoch: 1,
      }),
    );
    assert.equal(refusal.classification, "unsafe_replacement");
    assert.equal(refusal.executionId, created.executionId);
    assert.equal(refusal.position, 1);
    assert.ok(Object.isFrozen(refusal), "unsafe refusal frozen");
    const snapshot = JSON.stringify(accepted(kernel.inspect(authorA, created.executionId)).refusals);

    const m = refusal as unknown as Record<string, unknown>;
    attemptMutation(() => {
      m.classification = "unauthorized_control";
    });
    attemptMutation(() => {
      m.reason = "forged";
    });
    attemptMutation(() => {
      m.position = 99;
    });

    const after = accepted(kernel.inspect(authorA, created.executionId));
    assert.equal(JSON.stringify(after.refusals), snapshot);
    assert.equal(after.refusals.length, before.refusals.length + 1);
    assert.deepEqual(after.refusals[after.refusals.length - 1]?.classification, "unsafe_replacement");
    assert.ok(Object.isFrozen(after.refusals[after.refusals.length - 1]));
    assert.equal(after.activation?.writerEpoch, 1, "epoch still 1");
    assert.deepEqual(after.receipts, before.receipts, "no receipt");
    assert.deepEqual(after.activation?.deliveries, before.activation?.deliveries, "no new delivery");
  });
});

// ---------------------------------------------------------------------------
// 3. Positions are per-Execution (new ops consume none / own index)
// ---------------------------------------------------------------------------

interface PositionsArm {
  receipts: number[];
  refusalPositions: number[];
  historyLength: number;
  holdsLength: number;
  serialized: string[];
}

function runPositionsArm(
  hidden: (kernel: ExecutionCoordinator, hiddenIds: string[], round: number, driver: RecordingDriver) => void,
): { arm: PositionsArm; kernel: ExecutionCoordinator; executionId: string; hiddenIds: string[] } {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const hiddenIds: string[] = [];

  const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-positions" })));
  hidden(kernel, hiddenIds, 0, driver);
  const dispatched = accepted(kernel.dispatch(authorA, created.executionId, { bound: 1 }));
  hidden(kernel, hiddenIds, 1, driver);
  accepted(
    kernel.recoverExecution(authorA, created.executionId, {
      activationId: dispatched.activationId,
      available: MISSING_AVAILABLE,
    }),
  );
  hidden(kernel, hiddenIds, 2, driver);
  accepted(
    kernel.reportProtocolFailure(authorA, created.executionId, {
      activationId: dispatched.activationId,
      writerEpoch: 1,
      diagnostic: "a-positions-garbled",
    }),
  );
  hidden(kernel, hiddenIds, 3, driver);

  // A's own control refusals (unauthorized, per-Execution).
  const r1 = refused(
    kernel.requestTakeover(observerA, created.executionId, {
      activationId: dispatched.activationId,
      writerEpoch: 1,
    }),
  );
  hidden(kernel, hiddenIds, 4, driver);
  const r2 = refused(
    kernel.recoverExecution(observerA, created.executionId, {
      activationId: dispatched.activationId,
      available: FULL_AVAILABLE,
    }),
  );
  hidden(kernel, hiddenIds, 5, driver);
  void r1;
  void r2;

  const view = accepted(kernel.inspect(authorA, created.executionId));
  const arm: PositionsArm = {
    receipts: view.receipts.map((r) => r.position),
    refusalPositions: view.refusals.map((r) => r.position),
    historyLength: view.recoveryHistory.length,
    holdsLength: view.recoveryHolds.length,
    serialized: [
      JSON.stringify(view.receipts),
      JSON.stringify(view.refusals),
      JSON.stringify(view.recoveryHistory),
      JSON.stringify(view.recoveryHolds),
      JSON.stringify(view.activation?.deliveries),
      JSON.stringify(kernel.visibleExecutions(authorA)),
    ],
  };
  return { arm, kernel, executionId: created.executionId, hiddenIds };
}

function hiddenPositionsActivity(kernel: ExecutionCoordinator, hiddenIds: string[], round: number, driver: RecordingDriver): void {
  const key = `b-pos-${round}`;
  const createdB = accepted(kernel.createExecution(authorB, bCreate(key)));
  hiddenIds.push(createdB.executionId);
  const dispatchedB = accepted(kernel.dispatch(authorB, createdB.executionId, { bound: 1 }));
  // B accepts: holds + history on B's own record.
  accepted(
    kernel.recoverExecution(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      available: MISSING_AVAILABLE,
    }),
  );
  accepted(
    kernel.reportProtocolFailure(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      writerEpoch: 1,
      diagnostic: `b-pos-diagnostic-${round}-marker-xyz-456`,
    }),
  );
  // B control refusals on B's own record (observer, then held-control refusals).
  refused(
    kernel.requestTakeover(observerB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      writerEpoch: 1,
    }),
  );
  refused(
    kernel.recoverExecution(observerB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      available: FULL_AVAILABLE,
    }),
  );
  // Held-control refusals by the authorized caller while both holds stand.
  refused(kernel.redeliver(authorB, createdB.executionId));
  refused(
    kernel.requestTakeover(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      writerEpoch: 1,
    }),
  );
  // Stale + missing probes (latter names no Execution, position 0).
  refused(
    kernel.requestTakeover(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      writerEpoch: 9,
    }),
  );
  refused(kernel.inspect(authorB, "execution-404"));
  // B clears code then takes over (accepted, advances B's own receipt index only).
  accepted(
    kernel.recoverExecution(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      available: FULL_AVAILABLE,
    }),
  );
  accepted(
    kernel.requestTakeover(authorB, createdB.executionId, {
      activationId: dispatchedB.activationId,
      writerEpoch: 1,
    }),
  );
  accepted(
    kernel.submitOutcome(
      authorB,
      outcomeFor(createdB.executionId, { ...dispatchedB, writerEpoch: 2 }, { progress: { bpos: round }, next: { step: "fail", error: { bpos: round } } }),
      submissionFor(driver, dispatchedB.activationId),
    ),
  );
}

describe("K12-R1 per-Execution positions for new ops (recover/report consume none)", () => {
  test("control: recover+report mint no receipts; receipts [1,2], refusals [1,2], history 2, holds 2", () => {
    const { arm } = runPositionsArm(noHidden);
    assert.deepEqual(arm.receipts, [1, 2], "creation+dispatch only; holds consume none");
    assert.deepEqual(arm.refusalPositions, [1, 2], "A's own refusals start at 1, contiguous");
    assert.equal(arm.historyLength, 2, "code entered + protocol entered");
    assert.equal(arm.holdsLength, 2);
  });

  test("B accepts/refusals including control refusals do not shift A's positions", () => {
    const control = runPositionsArm(noHidden);
    const interleaved = runPositionsArm(hiddenPositionsActivity);
    assert.deepEqual(interleaved.arm, control.arm, "A's positions and new-record evidence unchanged by B");

    // Explicit contiguity on the interleaved arm too.
    assert.deepEqual(interleaved.arm.receipts, [1, 2]);
    assert.deepEqual(interleaved.arm.refusalPositions, [1, 2]);

    // B's own record advanced on its own index (sanity: B did accept).
    const bId = interleaved.hiddenIds[0] as string;
    const viewB = accepted(interleaved.kernel.inspect(authorB, bId));
    assert.ok(viewB.receipts.length >= 3, "B's takeover minted on B's own index");
    assert.ok(viewB.refusals.length >= 5, "B's control refusals recorded on B");
    assert.deepEqual(
      viewB.refusals.slice(0, 2).map((r) => r.classification),
      ["unauthorized_control", "unauthorized_control"],
    );
    // A cannot address B.
    assert.equal(refused(interleaved.kernel.inspect(authorA, bId)).classification, "unknown_destination");
  });
});
