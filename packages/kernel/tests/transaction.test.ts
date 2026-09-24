/**
 * K12-R1-DOC-01 - the transaction boundary: one acceptance position per accepted fact.
 *
 * Refusals, replays and redeliveries consume no acceptance position, so receipt positions
 * stay contiguous. A hostile observation installed mid-envelope cannot split the commit,
 * and a reentrant Outcome is ordered entirely before the outer decision's checks
 * (K1.2-DEC-10): at most one Outcome commits per exchange.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type ExecutionView, type OutcomeEnvelope } from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  descriptorConversionIsHostile,
  inheritedIndexIsLive,
  outcomeFor,
  polluteDescriptorFields,
  recordingDriver,
  refused,
  trapInheritedIndices,
  type DescriptorPollution,
  type InheritedIndexTrap,
} from "./harness.ts";

const author = caller("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

/**
 * `envelope` with `field` turned into an own getter that runs `effect` on its first read.
 *
 * Caller code runs during observation only where the envelope itself holds an accessor;
 * the effect therefore runs inside the boundary call, before the Kernel's checks.
 */
function withSideEffect(envelope: OutcomeEnvelope, field: keyof OutcomeEnvelope, effect: () => void): OutcomeEnvelope {
  const value = envelope[field];
  let ran = false;
  const copy: Record<string, unknown> = { ...envelope };
  Object.defineProperty(copy, field, {
    get() {
      if (!ran) {
        ran = true;
        effect();
      }
      return value;
    },
    enumerable: true,
    configurable: true,
  });
  return copy as unknown as OutcomeEnvelope;
}

describe("K12-R1-DOC-01 refusals consume no acceptance position", () => {
  test('Test A "refusals consume no acceptance position"', () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    assert.equal(created.receipt.position, 1);
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    assert.equal(dispatched.receipt.position, 2);
    const executionId = created.executionId;

    const baseReceipts = view(kernel, executionId).receipts.length;
    const baseRefusals = view(kernel, executionId).refusals.length;
    assert.equal(baseReceipts, 2);
    assert.equal(baseRefusals, 0);

    // Stale epoch: refused, no position consumed.
    const stale = refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, writerEpoch: 2 })));
    assert.equal(stale.classification, "stale_exchange");
    assert.equal(view(kernel, executionId).receipts.length, 2, "a refusal mints no receipt");
    assert.equal(view(kernel, executionId).refusals.length, baseRefusals + 1);

    // Malformed envelope: refused, no position consumed.
    const malformed = refused(kernel.submitOutcome(author, { ...outcomeFor(executionId, dispatched), progress: undefined } as unknown as OutcomeEnvelope));
    assert.equal(malformed.classification, "malformed_envelope");
    assert.match(malformed.reason, /progress missing_field/);
    assert.equal(view(kernel, executionId).receipts.length, 2);
    assert.equal(view(kernel, executionId).refusals.length, baseRefusals + 2);

    // The corrected proposal takes the very next position: no gap around the refusals.
    const answer = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched)));
    assert.equal(answer.receipt.position, 3);
    assert.deepEqual(
      view(kernel, executionId).receipts.map((receipt) => receipt.position),
      [1, 2, 3],
    );

    // After `continue`, the next dispatch continues the same contiguous index.
    const next = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    assert.equal(next.receipt.position, 4);
    assert.deepEqual(
      view(kernel, executionId).receipts.map((receipt) => receipt.position),
      [1, 2, 3, 4],
    );
    assert.deepEqual(
      view(kernel, executionId).receipts.map((receipt) => receipt.boundary),
      ["creation", "dispatch_intent", "outcome_acceptance", "dispatch_intent"],
    );
  });
});

describe("K12-R1-DOC-01 replay and redelivery consume no position", () => {
  test('Test B "replay and redelivery consume no position"', () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const executionId = created.executionId;
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const envelope = outcomeFor(executionId, dispatched);
    const first = accepted(kernel.submitOutcome(author, envelope));
    assert.equal(first.replayed, false);
    assert.equal(first.receipt.position, 3);
    assert.equal(view(kernel, executionId).receipts.length, 3);

    // Exact replay returns the same receipt and mints nothing.
    const replay = accepted(kernel.submitOutcome(author, envelope));
    assert.equal(replay.replayed, true);
    assert.equal(replay.receipt, first.receipt, "the same retained receipt object, not a reconstruction");
    assert.equal(view(kernel, executionId).receipts.length, 3, "a replay mints no receipt");

    // After `continue`, the next dispatch takes position 4 ...
    const next = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    assert.equal(next.receipt.position, 4);
    assert.equal(view(kernel, executionId).receipts.length, 4);

    // ... and redelivery returns that same receipt without consuming a position.
    const before = view(kernel, executionId).receipts.length;
    const resent = accepted(kernel.redeliver(author, executionId));
    assert.equal(resent.redelivered, true);
    assert.equal(resent.receipt, next.receipt);
    assert.equal(view(kernel, executionId).receipts.length, before, "a redelivery mints no receipt");

    assert.deepEqual(
      view(kernel, executionId).receipts.map((receipt) => receipt.position),
      [1, 2, 3, 4],
      "contiguous: replays and redeliveries left no gaps",
    );
  });
});

describe("K12-R1-DOC-01 hostile pollution during observation cannot split the commit", () => {
  test('Test C "hostile pollution during observation cannot split the commit"', () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const executionId = created.executionId;
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));

    const progressValue = { phase: "hostile-commit" };
    const emissions = [{ emissionKey: "a", value: 1 }];
    const base = outcomeFor(executionId, dispatched, { progress: progressValue, emissions });

    let trap: InheritedIndexTrap | undefined;
    let pollution: DescriptorPollution | undefined;
    const savedMapSet = Map.prototype.set;
    let installed = false;
    const copy: Record<string, unknown> = { ...base };
    Object.defineProperty(copy, "progress", {
      get() {
        if (!installed) {
          installed = true;
          // Drop writes: a commit built on live Map writes would lose its keys.
          (Map.prototype as unknown as Record<string, unknown>).set = function (this: unknown): unknown {
            return this;
          };
          trap = trapInheritedIndices(["0", "1", "2", "3", "4", "5", "6", "7"]);
          pollution = polluteDescriptorFields({ get: 1, set: () => {} });
        }
        return progressValue;
      },
      enumerable: true,
      configurable: true,
    });
    const envelope = copy as unknown as OutcomeEnvelope;

    let result: ReturnType<ExecutionCoordinator["submitOutcome"]> | undefined;
    let indexLive = false;
    let descriptorHostile = false;
    let mapPolluted = false;
    try {
      result = kernel.submitOutcome(author, envelope);
      indexLive = inheritedIndexIsLive(0);
      descriptorHostile = descriptorConversionIsHostile();
      mapPolluted = Map.prototype.set !== savedMapSet;
    } finally {
      (Map.prototype as unknown as Record<string, unknown>).set = savedMapSet;
      pollution?.restore();
      trap?.restore();
    }
    assert.equal(installed, true, "the getter ran inside the boundary call");
    assert.equal(indexLive, true, "the inherited indexed trap was live across the call");
    assert.equal(descriptorHostile, true, "descriptor conversion was hostile across the call");
    assert.equal(mapPolluted, true, "the Map.set replacement was live across the call");

    // The decision is whole: everything committed together, or nothing would have.
    const answer = accepted(result as NonNullable<typeof result>);
    assert.deepEqual([...answer.acknowledged], [created.initialEventId]);
    assert.equal(answer.receipt.boundary, "outcome_acceptance");
    assert.equal(answer.receipt.position, 3);
    assert.equal(answer.emissionIds.length, 1);

    const after = view(kernel, executionId);
    assert.deepEqual(after.acknowledged, [created.initialEventId], "the whole batch, not a prefix the trap shortened");
    assert.deepEqual(after.acceptedProgress, progressValue, "the one observed progress value");
    assert.equal(after.progressRevision, 1);
    assert.equal(after.emissions.length, 1);
    assert.equal(after.emissions[0]?.emissionKey, "a");
    assert.deepEqual(after.emissions[0]?.value, 1);
    assert.equal(after.exchanges.length, 1, "one exchange, one accepted Outcome");
    assert.equal(after.receipts[after.receipts.length - 1], answer.receipt);
    assert.deepEqual(
      after.receipts.map((receipt) => receipt.position),
      [1, 2, 3],
      "contiguous despite the hostile window",
    );
    assert.equal(after.refusals.length, 0, "no partial refusal alongside the acceptance");

    // The retained decision is really retained: an exact replay after restoring finds it.
    const replay = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { progress: progressValue, emissions })));
    assert.equal(replay.replayed, true);
    assert.equal(replay.receipt, answer.receipt);
    assert.equal(view(kernel, executionId).receipts.length, 3, "the replay minted nothing");
  });
});

describe("K12-R1-DOC-01 reentrant Outcome during observation ordered before outer checks", () => {
  test('Test D "reentrant Outcome during observation ordered before outer checks"', () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const executionId = created.executionId;
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));

    // The outer envelope's progress observation runs the inner submission first.
    const outer = withSideEffect(outcomeFor(executionId, dispatched, { progress: { phase: "outer" } }), "progress", () => {
      accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { progress: { phase: "reentrant" } })));
    });
    const refusal = refused(kernel.submitOutcome(author, outer));
    assert.equal(refusal.classification, "duplicate_conflict", "the inner acceptance is already the decision for this Activation ID");

    // Exactly one commit: the reentrant content, at the next contiguous position.
    const after = view(kernel, executionId);
    assert.deepEqual(after.acceptedProgress, { phase: "reentrant" });
    assert.equal(after.progressRevision, 1, "no two writers committed");
    assert.equal(after.exchanges.length, 1);
    assert.deepEqual(
      after.receipts.map((receipt) => receipt.position),
      [1, 2, 3],
      "one acceptance took position 3; the refused outer took none",
    );
    assert.equal(after.receipts[after.receipts.length - 1]?.boundary, "outcome_acceptance");
    assert.equal(after.refusals.length, 1, "only the outer refusal was recorded");
    assert.equal(after.refusals[0]?.classification, "duplicate_conflict");
  });
});
