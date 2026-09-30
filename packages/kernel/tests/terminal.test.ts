/**
 * K1.2-C5, K1.2-C6 - `complete` and `fail` end the Execution; nothing reopens it; unprocessed input
 * is disposed of explicitly.
 *
 * Canonical owners: `mental-model/mechanisms/lifecycle.md` (terminal states never reopen; completion
 * records the terminal result), `concepts/core.md#batch-reservation-and-acknowledgment` (exactly two
 * final dispositions, and a terminal disposition "must not masquerade as acknowledgment"),
 * `mechanisms/creation.md#when-the-destination-cannot-take-the-input` (new ordinary input to a
 * terminal Execution is refused; earlier input keeps its record) and WS B-5, assigned to K1.2 for the
 * terminal states it makes reachable by the owner's 2026-09-24 amendment.
 *
 * K1.1 could only specify the terminal-ingress rule, because no terminal state was reachable
 * (`ingress.test.ts`, K11-R1-SCOPE-01). These cases exercise it live.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type ExecutionView } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";

const author = caller("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

const correction = (destination: string, requestKey: string, text = requestKey) => ({
  destination,
  requestKey,
  kind: "application.correction",
  payload: { text },
});

/**
 * An Execution whose batch holds the initial input, with two more Events queued outside it: one
 * accepted before reservation and excluded by the bound, one accepted after reservation.
 */
function withBacklog() {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest()));
  const early = accepted(kernel.submitInput(author, correction(created.executionId, "early")));
  const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
  const late = accepted(kernel.submitInput(author, correction(created.executionId, "late")));
  return { kernel, driver, executionId: created.executionId, initialEventId: created.initialEventId, early, late, dispatched };
}

describe("K1.2-C6 B-5: an accepted `complete` or `fail` disposes of every Event still unacknowledged", () => {
  for (const step of ["complete", "fail"] as const) {
    test(`\`${step}\` acknowledges the batch and gives the rest a terminal disposition, in one decision`, () => {
      const { kernel, driver, executionId, initialEventId, early, late, dispatched } = withBacklog();
      const next = step === "complete" ? { step, result: { report: "week 37" } } : { step, error: { code: "sources_unavailable" } };
      const answer = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { next }), submissionFor(driver, dispatched.activationId)));

      const state = step === "complete" ? "COMPLETED" : "FAILED";
      assert.equal(answer.nextState, state);
      assert.deepEqual(answer.acknowledged, [initialEventId]);
      assert.deepEqual(answer.terminalDispositions, [early.eventId, late.eventId], "the answer names what this decision disposed of");

      const after = view(kernel, executionId);
      assert.equal(after.state, state);
      assert.deepEqual(after.acknowledged, [initialEventId]);
      assert.deepEqual(after.terminalDispositions, [early.eventId, late.eventId]);
      assert.deepEqual(after.queued, [], "nothing is left waiting for a lifetime that will never read it");
      assert.equal(after.mailbox.length, 3, "nothing was deleted");
      for (const entry of after.mailbox.slice(1)) {
        assert.deepEqual(entry.disposition, { kind: "terminal", reason: `Execution ended as ${state} before this Event was acknowledged` });
        assert.notEqual(entry.disposition.kind, "acknowledged", "a terminal disposition never masquerades as acknowledgment");
      }
    });
  }

  test("`continue` disposes of nothing: queued input stays queued for the next exchange", () => {
    const { kernel, driver, executionId, early, late, dispatched } = withBacklog();
    const answer = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched), submissionFor(driver, dispatched.activationId)));
    assert.deepEqual(answer.terminalDispositions, []);
    assert.deepEqual(view(kernel, executionId).queued, [early.eventId, late.eventId]);
  });

  test("a refused terminal proposal disposes of nothing", () => {
    const { kernel, driver, executionId, early, late, dispatched } = withBacklog();
    refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, writerEpoch: 3 }, { next: { step: "complete", result: 1 } }), submissionFor(driver, dispatched.activationId)));
    const after = view(kernel, executionId);
    assert.equal(after.state, "RUNNING");
    assert.deepEqual(after.terminalDispositions, []);
    assert.deepEqual(after.queued, [after.mailbox[0]?.eventId, early.eventId, late.eventId]);
  });
});

describe("K1.2-C6 live terminal ingress", () => {
  test("new input to an ended Execution is refused and not queued; earlier input keeps its record", () => {
    const { kernel, driver, executionId, early, dispatched } = withBacklog();
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { next: { step: "complete", result: 1 } }), submissionFor(driver, dispatched.activationId)));
    const before = view(kernel, executionId);

    const refusal = refused(kernel.submitInput(author, correction(executionId, "after-the-end")));
    assert.equal(refusal.classification, "terminal_destination");
    assert.match(refusal.reason, /ended as COMPLETED/);
    const after = view(kernel, executionId);
    assert.deepEqual(after.mailbox, before.mailbox, "not queued, not disposed, not recorded as an Event at all");

    // An exact retry of input accepted before the end is not new input: it replays its record,
    // which now carries its terminal disposition.
    const replay = accepted(kernel.submitInput(author, correction(executionId, "early")));
    assert.equal(replay.replayed, true);
    assert.equal(replay.eventId, early.eventId);
    assert.equal(replay.receipt, early.receipt);
    assert.deepEqual(replay.disposition, { kind: "terminal", reason: "Execution ended as COMPLETED before this Event was acknowledged" });

    // A changed retry under that identity still conflicts.
    assert.equal(refused(kernel.submitInput(author, correction(executionId, "early", "changed"))).classification, "duplicate_conflict");
  });

  test("the same holds after `fail`, and an acknowledged Event replays as acknowledged", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const first = accepted(kernel.submitInput(author, correction(created.executionId, "first")));
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));
    accepted(kernel.submitOutcome(author, outcomeFor(created.executionId, dispatched, { next: { step: "fail", error: { code: "x" } } }), submissionFor(driver, dispatched.activationId)));

    assert.equal(refused(kernel.submitInput(author, correction(created.executionId, "new"))).classification, "terminal_destination");
    const replay = accepted(kernel.submitInput(author, correction(created.executionId, "first")));
    assert.deepEqual(replay.disposition, { kind: "acknowledged", activationId: dispatched.activationId });
    assert.equal(first.eventId, replay.eventId);
  });
});

describe("K1.2-C5 a terminal lifetime never reopens", () => {
  test("dispatch, redelivery, a new Outcome, takeover, recovery and protocol reports are all refused", () => {
    const { kernel, driver, executionId, dispatched } = withBacklog();
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { next: { step: "complete", result: 1 } }), submissionFor(driver, dispatched.activationId)));
    const before = view(kernel, executionId);
    const named = { activationId: dispatched.activationId, writerEpoch: 1 };
    const available = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };

    const outcomes: [string, { ok: boolean; error?: { classification: string } }][] = [
      ["dispatch", kernel.dispatch(author, executionId, { bound: 1 })],
      ["redeliver", kernel.redeliver(author, executionId)],
      ["new Outcome", kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, activationId: `${executionId}/activation-2`, baseProgressRevision: 1 }), submissionFor(driver, dispatched.activationId))],
      ["takeover", kernel.requestTakeover(author, executionId, named)],
      ["recover", kernel.recoverExecution(author, executionId, { activationId: dispatched.activationId, available })],
      ["protocol failure", kernel.reportProtocolFailure(author, executionId, named)],
    ];
    for (const [label, result] of outcomes) {
      assert.equal(result.ok, false, `${label} is refused`);
    }
    assert.deepEqual(
      outcomes.map(([label, result]) => [label, result.error?.classification]),
      [
        ["dispatch", "terminal_destination"],
        ["redeliver", "no_unresolved_exchange"],
        ["new Outcome", "terminal_destination"],
        ["takeover", "terminal_destination"],
        ["recover", "terminal_destination"],
        ["protocol failure", "terminal_destination"],
      ],
    );
    const after = view(kernel, executionId);
    assert.equal(after.state, "COMPLETED");
    assert.equal(after.refusals.length, before.refusals.length + outcomes.length);
    const { refusals: _a, ...afterRest } = after;
    const { refusals: _b, ...beforeRest } = before;
    assert.deepEqual(afterRest, beforeRest, "nothing but the refusal records changed");
  });

  test("an exact replay of the terminal Outcome still returns its receipt: the lookup precedes the terminal check", () => {
    const { kernel, driver, executionId, dispatched } = withBacklog();
    const envelope = outcomeFor(executionId, dispatched, { next: { step: "complete", result: { report: "week 37" } } });
    const first = accepted(kernel.submitOutcome(author, envelope, submissionFor(driver, envelope.activationId)));
    const before = view(kernel, executionId);
    const again = accepted(kernel.submitOutcome(author, envelope, submissionFor(driver, envelope.activationId)));
    assert.equal(again.replayed, true);
    assert.equal(again.receipt, first.receipt);
    assert.equal(again.nextState, "COMPLETED");
    assert.deepEqual(view(kernel, executionId), before);
  });
});

describe("K1.2-C5 the terminal result is typed", () => {
  test("`complete` records a result and `fail` an error, distinguishable by kind and retained as captured", () => {
    const outcomes = (["complete", "fail"] as const).map((step) => {
      const driver = recordingDriver();
      const kernel = new ExecutionCoordinator({ driver });
      const created = accepted(kernel.createExecution(author, createRequest()));
      const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
      const value = { report: "week 37", pages: 12 };
      const next = step === "complete" ? { step, result: value } : { step, error: value };
      const answer = accepted(kernel.submitOutcome(author, outcomeFor(created.executionId, dispatched, { next }), submissionFor(driver, dispatched.activationId)));
      return { answer, result: view(kernel, created.executionId).result, dispatched };
    });
    const [completed, failed] = outcomes;
    assert.ok(completed && failed);
    assert.equal(completed.result?.kind, "completed");
    assert.equal(failed.result?.kind, "failed");
    assert.deepEqual(completed.result?.value, { report: "week 37", pages: 12 });
    assert.deepEqual(failed.result?.value, completed.result?.value, "same value, different meaning: the kind carries the difference");
    assert.equal(completed.result?.resultId, completed.answer.resultId);
    assert.equal(completed.result?.receipt, completed.answer.receipt);
    assert.equal(completed.result?.activationId, completed.dispatched.activationId);
    assert.ok(Object.isFrozen(completed.result));
  });

  test("a `continue` records no result", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(created.executionId, dispatched), submissionFor(driver, dispatched.activationId)));
    assert.equal(view(kernel, created.executionId).result, null);
  });
});
