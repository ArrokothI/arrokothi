/**
 * K1.2-C12 - what the Outcome boundary retains cannot be edited through what it returns.
 *
 * K1.1-DEC-4's rule, extended to K1.2's records: retained evidence is frozen where it is minted, and
 * everything else a caller receives is either that frozen record or a fresh copy. `readonly` is erased
 * at run time, so each case casts it away and mutates, then checks that a later replay and a later
 * inspection report what the Kernel accepted rather than what the caller wrote.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver } from "./harness.ts";

const author = caller("app-a", "tenant-a");

function acceptedOnce() {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest()));
  accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "late", kind: "k", payload: 1 }));
  const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  const progress = { phase: "draft", sections: ["intro"] };
  const emissionValue = { pages: 12 };
  const envelope = outcomeFor(created.executionId, dispatched, {
    progress,
    emissions: [{ emissionKey: "draft", value: emissionValue }],
    next: { step: "complete", result: { report: "week 37" } },
  });
  const answer = accepted(kernel.submitOutcome(author, envelope));
  return { kernel, driver, executionId: created.executionId, dispatched, envelope, answer, progress, emissionValue };
}

const mutable = <T>(value: T): { -readonly [K in keyof T]: T[K] } => value as { -readonly [K in keyof T]: T[K] };

describe("K1.2-C12 retained Outcome evidence is immutable", () => {
  test("editing the returned answer changes neither the replay nor inspection", () => {
    const { kernel, executionId, envelope, answer } = acceptedOnce();
    const snapshot = structuredClone(accepted(kernel.inspect(author, executionId)));
    const edited = mutable(answer);
    edited.nextState = "READY";
    edited.progressRevision = 99;
    edited.resultId = "forged";
    assert.throws(() => (answer.acknowledged as string[]).push("forged"), TypeError, "the retained lists are frozen");
    assert.throws(() => (answer.emissionIds as string[]).pop(), TypeError);
    assert.throws(() => (answer.terminalDispositions as string[]).push("forged"), TypeError);
    assert.throws(() => {
      mutable(answer.receipt).token = "forged";
    }, TypeError);

    const replay = accepted(kernel.submitOutcome(author, envelope));
    assert.equal(replay.nextState, "COMPLETED");
    assert.equal(replay.progressRevision, 1);
    assert.notEqual(replay.resultId, "forged");
    assert.deepEqual(structuredClone(accepted(kernel.inspect(author, executionId))), snapshot);
  });

  test("the caller's own progress, Emission and result objects are captured, not retained", () => {
    const { kernel, executionId, progress, emissionValue } = acceptedOnce();
    progress.sections.push("appendix");
    mutable(progress).phase = "changed";
    emissionValue.pages = 99;
    const view = accepted(kernel.inspect(author, executionId));
    assert.deepEqual(view.acceptedProgress, { phase: "draft", sections: ["intro"] });
    assert.deepEqual(view.emissions[0]?.value, { pages: 12 });
    assert.ok(Object.isFrozen(view.acceptedProgress));
  });

  test("every record inspection exposes is frozen, and every list around them is a fresh copy", () => {
    const { kernel, executionId } = acceptedOnce();
    const first = accepted(kernel.inspect(author, executionId));
    for (const record of [first.result, first.emissions[0], first.exchanges[0]?.dispatchReceipt, first.exchanges[0]?.outcomeReceipt]) {
      assert.ok(Object.isFrozen(record));
    }
    for (const entry of first.mailbox) assert.ok(Object.isFrozen(entry.disposition), "each disposition is frozen");
    assert.throws(() => {
      mutable(first.emissions[0] as object as { value: unknown }).value = "forged";
    }, TypeError);

    (first.emissions as unknown[]).push("forged");
    (first.exchanges as unknown[]).length = 0;
    (first.terminalDispositions as unknown[]).length = 0;
    const second = accepted(kernel.inspect(author, executionId));
    assert.equal(second.emissions.length, 1);
    assert.equal(second.exchanges.length, 1);
    assert.equal(second.terminalDispositions.length, 1);
  });

  test("the Activation that carries accepted progress is frozen through the progress it carries", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const first = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(created.executionId, first, { progress: { nested: { cursor: 1 } } })));
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const activation = driver.seen[1];
    assert.ok(activation);
    assert.throws(() => {
      (activation.acceptedProgress as { nested: { cursor: number } }).nested.cursor = 99;
    }, TypeError);
    accepted(kernel.redeliver(author, created.executionId));
    assert.deepEqual(driver.seen[2]?.acceptedProgress, { nested: { cursor: 1 } });
  });

  test("a recovery hold record is frozen and edits to a returned decision do not reach the Kernel", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const decision = accepted(
      kernel.recoverExecution(author, created.executionId, {
        activationId: dispatched.activationId,
        available: { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] },
      }),
    );
    assert.ok(Object.isFrozen(decision.recoveryHolds[0]));
    (decision.recoveryHolds as unknown[]).length = 0;
    assert.equal(accepted(kernel.inspect(author, created.executionId)).recoveryHolds.length, 1);
  });
});
