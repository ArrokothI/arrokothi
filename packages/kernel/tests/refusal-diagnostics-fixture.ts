/** Shared observable boundary schedule for ordinary regression tests and the explicit engine-max probe. */
import assert from "node:assert/strict";
import { ExecutionCoordinator, type ExecutionView, type RefusalRecord, type SubmissionGrant } from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";

const absent = undefined as unknown as SubmissionGrant;
const available = {
  definitionRevisions: ["weekly-report@3"],
  runtimeContractRevisions: ["runtime-contract@1"],
  progressCodecs: ["inline-json@1"],
};

export function assertDiagnostic(reason: string, limit = 1_024): void {
  assert.ok(reason.length > 0 && reason.length <= limit, `diagnostic length ${reason.length} exceeds ${limit}`);
  assert.match(reason, /^[\x20-\x7e]*$/, "identity diagnostics retain only printable ASCII");
}

export function assertOnlyRefusal(before: ExecutionView, after: ExecutionView, refusal: RefusalRecord): void {
  assert.equal(after.refusals.length, before.refusals.length + 1, "exactly one refusal appended");
  assert.strictEqual(after.refusals.at(-1), refusal, "returned object is the retained refusal");
  assert.ok(Object.isFrozen(refusal), "the shared refusal is frozen");
  assert.deepEqual(after.refusals.slice(0, -1), before.refusals, "existing refusals unchanged");
  const { refusals: _beforeRefusals, ...oldState } = before;
  const { refusals: _afterRefusals, ...newState } = after;
  assert.deepEqual(newState, oldState, "whole accepted view, holds, history, delivery and receipts unchanged");
}

/** 3 lifecycle states x (visibility-only Outcome + 3 powered controls + 3 visibility-only controls). */
export function runBoundaryDiagnosticSchedule(identity: string, observed?: (caseName: string) => void): number {
  let cases = 0;
  for (const phase of ["open", "resolved", "terminal"] as const) {
    for (const surface of ["outcome", "takeover", "recovery", "protocol", "denied-takeover", "denied-recovery", "denied-protocol"] as const) {
      const who = caller("diagnostic-author");
      const visible = observer("diagnostic-observer");
      const otherVisible = observer("second-observer");
      const driver = recordingDriver();
      const kernel = new ExecutionCoordinator({ driver });
      const { executionId } = accepted(kernel.createExecution(who, createRequest()));
      const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
      const grant = submissionFor(driver, open.activationId);
      const valid = outcomeFor(executionId, open, phase === "terminal" ? { next: { step: "complete", result: 1 } } : {});
      const decision = phase === "open" ? null : accepted(kernel.submitOutcome(who, valid, grant));
      const before = accepted(kernel.inspect(visible, executionId));
      const deliveries = driver.seen.length;
      let identityReads = 0;
      let progressReads = 0;
      const named = { get activationId() { identityReads++; return identity; }, writerEpoch: 1, available };
      const powered = !surface.startsWith("denied-");
      const actor = powered ? who : visible;
      const result = surface === "outcome"
        ? kernel.submitOutcome(visible, { ...valid, get activationId() { identityReads++; return identity; }, get progress() { progressReads++; return null; } }, absent)
        : surface.endsWith("takeover") ? kernel.requestTakeover(actor, executionId, named)
          : surface.endsWith("recovery") ? kernel.recoverExecution(actor, executionId, named)
            : kernel.reportProtocolFailure(actor, executionId, named);
      const refusal = refused(result);
      assert.equal(refusal.classification, !powered ? "unauthorized_control"
        : phase === "terminal" ? "terminal_destination"
          : phase === "resolved" && surface !== "outcome" ? "no_unresolved_exchange" : "stale_exchange");
      assertDiagnostic(refusal.reason);
      assert.equal(identityReads, powered ? 1 : 0, "identity is captured once after control power");
      assert.equal(progressReads, surface === "outcome" ? 1 : 0, "Outcome content capture stays eager");
      assert.equal(refusal.executionId, executionId, "structured identity remains exact");
      assertOnlyRefusal(before, accepted(kernel.inspect(visible, executionId)), refusal);
      assert.strictEqual(accepted(kernel.inspect(otherVisible, executionId)).refusals.at(-1), refusal);
      assert.equal(driver.seen.length, deliveries, "refusal neither retries nor delivers");
      if (phase === "open") {
        accepted(kernel.submitOutcome(who, valid, grant));
      } else if (phase === "resolved") {
        const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
        accepted(kernel.submitOutcome(who, outcomeFor(executionId, next), submissionFor(driver, next.activationId)));
      } else {
        const beforeReplay = accepted(kernel.inspect(who, executionId));
        const replay = accepted(kernel.submitOutcome(visible, valid, absent));
        assert.equal(replay.replayed, true);
        assert.strictEqual(replay.receipt, decision?.receipt);
        assert.deepEqual(accepted(kernel.inspect(who, executionId)), beforeReplay);
      }
      cases++;
      observed?.(`${phase}/${surface}`);
    }
  }
  assert.equal(cases, 21);
  return cases;
}

