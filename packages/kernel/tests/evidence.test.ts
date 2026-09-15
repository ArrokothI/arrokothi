/**
 * K11-R2-EVID-01 - retained evidence is not caller-mutable, on every path that exposes it.
 *
 * `mental-model/concepts/identity.md` calls a receipt "retained evidence that one specific request
 * was accepted", K1.1-C1/C6 require an exact replay to return *the original* decision and token, and
 * K1.1-C9 reports recorded refusals through inspection. The Kernel deliberately hands the caller the
 * same object it retains, so those claims hold only if the object cannot be edited.
 *
 * The failure these cases exist against is narrow and entirely ordinary: `readonly` in TypeScript is
 * erased at run time, so a caller can cast it away and assign. Before this correction, doing that to
 * a returned receipt edited the Kernel's retained decision, and the Kernel's own later replay and
 * inspection reported the forged value as what it had accepted.
 *
 * Every case therefore does three things: take the evidence through one exposed path, attempt an
 * ordinary mutation with `readonly` cast away, then ask the Kernel again and check the answer is the
 * original. A frozen object throws on assignment under the module's strict mode, so the attempt is
 * wrapped rather than asserted to throw: what is under test is that the Kernel's retained answer is
 * unchanged, not which of the two ways the assignment failed.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  BOUNDARY_LIMITS,
  ExecutionCoordinator,
  TERMINAL_STATES,
  boundaryValueIssues,
  isTerminal,
  type ExecutionState,
  type Receipt,
  type RefusalRecord,
} from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");
const coordinator = (): ExecutionCoordinator => new ExecutionCoordinator({ driver: recordingDriver() });

/** Runs a caller's mutation attempt the way ordinary application code would, and lets it fail. */
function attemptMutation(mutate: () => void): void {
  try {
    mutate();
  } catch (error) {
    assert.ok(error instanceof TypeError, `a refused mutation fails as a TypeError, got ${String(error)}`);
  }
}

/** Every way a caller can get hold of a receipt that names a retained acceptance. */
const forgeReceipt = (receipt: Receipt): void => {
  attemptMutation(() => {
    (receipt as { token: string }).token = "forged";
  });
  attemptMutation(() => {
    (receipt as { boundary: Receipt["boundary"] }).boundary = "dispatch_intent";
  });
  attemptMutation(() => {
    (receipt as { position: number }).position = -1;
  });
};

const forgeRefusal = (refusal: RefusalRecord): void => {
  attemptMutation(() => {
    (refusal as { classification: RefusalRecord["classification"] }).classification = "capacity_exhausted";
  });
  attemptMutation(() => {
    (refusal as { reason: string }).reason = "forged reason";
  });
  attemptMutation(() => {
    (refusal as { position: number }).position = -1;
  });
  attemptMutation(() => {
    (refusal as { executionId: string | null }).executionId = "execution-invented";
  });
};

describe("K11-R2-EVID-01 retained receipts survive a caller editing what it was handed", () => {
  test("the creation receipt is unchanged by editing the returned one, on replay and in inspection", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const original = { ...created.receipt };

    forgeReceipt(created.receipt);

    const replayed = accepted(kernel.createExecution(author, createRequest()));
    assert.equal(replayed.replayed, true, "the second call is the lost-response row, not a new decision");
    assert.deepEqual({ ...replayed.receipt }, original, "exact replay returns the original decision");

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual({ ...(view.receipts[0] as Receipt) }, original, "and inspection reports it unedited");
    assert.deepEqual({ ...(view.mailbox[0]?.receipt as Receipt) }, original, "including on the initial input it accepted");
  });

  test("the ingress receipt is unchanged by editing the returned one", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const input = { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } };
    const ingress = accepted(kernel.submitInput(author, input));
    const original = { ...ingress.receipt };

    forgeReceipt(ingress.receipt);

    const replayed = accepted(kernel.submitInput(author, input));
    assert.equal(replayed.replayed, true);
    assert.deepEqual({ ...replayed.receipt }, original);

    const view = accepted(kernel.inspect(author, created.executionId));
    const entry = view.mailbox.find((candidate) => candidate.eventId === ingress.eventId);
    assert.deepEqual({ ...(entry?.receipt as Receipt) }, original, "the mailbox entry still names the original acceptance");
  });

  test("the dispatch receipt is unchanged by editing the returned one, and redelivery returns the original", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatch = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const original = { ...dispatch.receipt };

    forgeReceipt(dispatch.receipt);

    const again = accepted(kernel.redeliver(author, created.executionId));
    assert.equal(again.redelivered, true);
    assert.deepEqual({ ...again.receipt }, original, "the re-sent exchange carries the intent's original receipt");

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual({ ...(view.activation?.receipt as Receipt) }, original);
    assert.deepEqual({ ...(view.receipts[view.receipts.length - 1] as Receipt) }, original);
  });

  test("editing a receipt reached through inspection cannot reach the Execution either", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }));
    accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));

    const before = accepted(kernel.inspect(author, created.executionId));
    const snapshot = before.receipts.map((receipt) => ({ ...receipt }));

    for (const receipt of before.receipts) forgeReceipt(receipt);
    for (const entry of before.mailbox) forgeReceipt(entry.receipt);
    if (before.activation !== null) forgeReceipt(before.activation.receipt);

    const after = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(after.receipts.map((receipt) => ({ ...receipt })), snapshot);
  });

  test("the retained mailbox disposition cannot be edited into a different disposition", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const ingress = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }),
    );

    attemptMutation(() => {
      (ingress.disposition as { kind: string }).kind = "terminal";
    });
    const view = accepted(kernel.inspect(author, created.executionId));
    attemptMutation(() => {
      (view.mailbox[0]?.disposition as { kind: string }).kind = "terminal";
    });

    const after = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(after.mailbox.map((entry) => entry.disposition.kind), ["queued", "queued"]);
    assert.deepEqual(after.terminalDispositions, [], "nothing became a B-5 terminal disposition");
    assert.deepEqual(after.queued, after.mailbox.map((entry) => entry.eventId));
  });
});

describe("K11-R2-EVID-01 retained refusals survive a caller editing what it was handed", () => {
  test("a recorded creation conflict is unchanged by editing the returned record", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const conflict = refused(
      kernel.createExecution(author, createRequest({ initialInput: { kind: "application.request", payload: { text: "week 38" } } })),
    );
    const original = { ...conflict };
    assert.equal(original.classification, "duplicate_conflict");

    forgeRefusal(conflict);

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.refusals.length, 1);
    assert.deepEqual({ ...(view.refusals[0] as RefusalRecord) }, original, "inspection reports the recorded refusal, not the edited one");
  });

  test("a recorded ingress conflict is unchanged, and editing it invents no Execution", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const base = { destination: created.executionId, requestKey: "c1", kind: "k" };
    accepted(kernel.submitInput(author, { ...base, payload: { a: 1 } }));
    const conflict = refused(kernel.submitInput(author, { ...base, payload: { a: 2 } }));
    const original = { ...conflict };

    forgeRefusal(conflict);

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual({ ...(view.refusals[0] as RefusalRecord) }, original);
    assert.equal(view.mailbox.length, 2, "and the refused input is still not queued");
  });

  test("editing a refusal reached through inspection cannot reach the Execution", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    refused(kernel.dispatch(author, created.executionId, { bound: 0 }));
    refused(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: undefined as never }));

    const before = accepted(kernel.inspect(author, created.executionId));
    const snapshot = before.refusals.map((refusal) => ({ ...refusal }));
    assert.deepEqual(snapshot.map((refusal) => refusal.classification), ["invalid_batch_bound", "malformed_value"]);

    for (const refusal of before.refusals) forgeRefusal(refusal);

    const after = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(after.refusals.map((refusal) => ({ ...refusal })), snapshot);
  });

  test("a refusal that names no Execution is immutable too, and stays unrecorded", () => {
    const kernel = coordinator();
    const outsider = caller("app-c", "tenant-c");
    const hidden = refused(kernel.inspect(outsider, "execution-404"));
    const original = { ...hidden };

    forgeRefusal(hidden);

    assert.deepEqual({ ...hidden }, original, "the record the caller holds is the record that was made");
    assert.equal(original.executionId, null, "and it still discloses no Execution");
  });
});

describe("K11-R2-EVID-01 the ownership rule, not one call site", () => {
  test("every evidence object any exposed path returns is immutable", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const ingress = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }),
    );
    const replayedCreate = accepted(kernel.createExecution(author, createRequest()));
    const replayedIngress = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }),
    );
    const dispatch = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));
    const redelivered = accepted(kernel.redeliver(author, created.executionId));
    const conflict = refused(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 2 } }));
    const unknown = refused(kernel.inspect(caller("app-c", "tenant-c"), "execution-404"));
    const view = accepted(kernel.inspect(author, created.executionId));

    const evidence: { readonly what: string; readonly value: object }[] = [
      { what: "creation receipt", value: created.receipt },
      { what: "replayed creation receipt", value: replayedCreate.receipt },
      { what: "ingress receipt", value: ingress.receipt },
      { what: "replayed ingress receipt", value: replayedIngress.receipt },
      { what: "replayed ingress disposition", value: replayedIngress.disposition },
      { what: "dispatch receipt", value: dispatch.receipt },
      { what: "redelivered dispatch receipt", value: redelivered.receipt },
      { what: "dispatch batch", value: dispatch.batch },
      { what: "ingress conflict record", value: conflict },
      { what: "unknown-destination record", value: unknown },
      { what: "inspection activation receipt", value: view.activation?.receipt as object },
      ...view.receipts.map((receipt, index) => ({ what: `inspection receipt ${index}`, value: receipt })),
      ...view.refusals.map((refusal, index) => ({ what: `inspection refusal ${index}`, value: refusal })),
      ...view.mailbox.map((entry, index) => ({ what: `mailbox receipt ${index}`, value: entry.receipt })),
      ...view.mailbox.map((entry, index) => ({ what: `mailbox disposition ${index}`, value: entry.disposition })),
      ...view.mailbox.map((entry, index) => ({ what: `mailbox payload ${index}`, value: entry.payload as object })),
      { what: "authority context", value: view.authorityContext as object },
    ];

    for (const { what, value } of evidence) {
      assert.ok(value !== undefined && value !== null, `${what} is exposed at all`);
      assert.ok(Object.isFrozen(value), `${what} is immutable`);
    }
    // The list is meant to be exhaustive over this packet's exposed evidence, so a later packet that
    // adds a boundary has to extend it rather than quietly ship a mutable receipt.
    assert.equal(view.receipts.length, 3, "creation, ingress and dispatch intent - redelivery mints none, and the list above covers each");
    assert.equal(view.refusals.length, 1);
  });

  test("evidence the Kernel retains and evidence it returns are the same object, safely", () => {
    // Sharing the reference is what makes an exact replay able to return *the original* receipt
    // rather than an equal-looking reconstruction. That is only sound because the object is frozen,
    // so this asserts both halves together: same identity, and no way to edit it.
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const replayed = accepted(kernel.createExecution(author, createRequest()));
    const view = accepted(kernel.inspect(author, created.executionId));

    assert.equal(replayed.receipt, created.receipt, "replay returns the very receipt creation minted");
    assert.equal(view.receipts[0], created.receipt);
    assert.equal(view.mailbox[0]?.receipt, created.receipt);
    assert.ok(Object.isFrozen(created.receipt));
  });
});

describe("the exported vocabulary a Kernel decision reads is not caller-mutable (self-found)", () => {
  /**
   * Found while auditing caller-mutable ambient state for K11-R6-STATE-02, not reported by a
   * reviewer. Same family, different mechanism: these are not prototype positions but exported
   * objects the Kernel reads *at decision time*, and `readonly` / `as const` are erased at run time.
   *
   * `isTerminal` scans `TERMINAL_STATES` on every ingress and every dispatch, and each boundary
   * value is measured against `BOUNDARY_LIMITS` as it is checked. An ordinary caller holding either
   * exported object could therefore decide which destinations refuse input and how large a value
   * the Kernel accepts. Both are frozen where they are defined, for the same reason receipts and
   * refusals are frozen where they are minted: one construction site rather than every reader.
   */
  test("the terminal vocabulary cannot be extended, emptied or re-spelled", () => {
    const mutable = TERMINAL_STATES as ExecutionState[];
    assert.equal(Object.isFrozen(TERMINAL_STATES), true);
    assert.throws(() => {
      mutable[mutable.length] = "READY";
    }, TypeError);
    assert.throws(() => {
      mutable[0] = "READY";
    }, TypeError);
    assert.throws(() => {
      mutable.length = 0;
    }, TypeError);
    assert.deepEqual(TERMINAL_STATES, ["COMPLETED", "FAILED", "CANCELLED"]);
    assert.equal(isTerminal("READY"), false, "a live Execution is still not terminal");
    assert.equal(isTerminal("COMPLETED"), true);

    // And the decision that reads it is unchanged: ordinary input to a live Execution is accepted,
    // not refused as `terminal_destination`.
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const submitted = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "after", kind: "k", payload: { a: 1 } }),
    );
    assert.equal(submitted.replayed, false);
  });

  test("the published limits cannot be raised or lowered by a caller", () => {
    const mutable = BOUNDARY_LIMITS as unknown as Record<string, number>;
    assert.equal(Object.isFrozen(BOUNDARY_LIMITS), true);
    assert.throws(() => {
      mutable.containerEntries = 1;
    }, TypeError);
    assert.throws(() => {
      mutable.canonicalBytes = 8;
    }, TypeError);
    assert.equal(BOUNDARY_LIMITS.containerEntries, 4_096);
    assert.equal(BOUNDARY_LIMITS.canonicalBytes, 1_048_576);

    // The check that reads them is unchanged: at the limit passes, one over is refused.
    const atLimit: Record<string, number> = {};
    for (let index = 0; index < BOUNDARY_LIMITS.containerEntries; index += 1) atLimit[`k${index}`] = index;
    assert.equal(boundaryValueIssues(atLimit).length, 0);
    atLimit.oneMore = 1;
    assert.deepEqual(
      boundaryValueIssues(atLimit).map((issue) => issue.code),
      ["too_many_entries"],
    );
  });
});
