/** TOOLS-02 ports of the five review-04 control request getter schedules. */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { ExecutionView } from "../src/index.ts";
import { ExecutionCoordinator, accepted, caller, createRequest, outcomeFor, recordingDriver, refused } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";

for (const [outer, inner, classification, state, epoch, sends] of [
  ["takeover", "resolve", "no_unresolved_exchange", "READY", null, 1],
  ["takeover", "takeover", "stale_exchange", "RUNNING", 2, 2],
  ["protocol", "takeover", "stale_exchange", "RUNNING", 2, 2],
  ["recover", "resolve", "no_unresolved_exchange", "READY", null, 1],
  ["protocol", "complete", "terminal_destination", "COMPLETED", null, 1],
] as const) {
  test(`control request getter reentry ${outer}/${inner} checks the post-observation state`, () => {
    const who = caller("control-observer"), driver = recordingDriver(), kernel = new ExecutionCoordinator({ driver });
    const executionId = accepted(kernel.createExecution(who, createRequest())).executionId;
    const exchange = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    const grant = driver.submissions[0]!;
    let reads = 0, afterInner: ExecutionView | undefined;
    const request = {
      get activationId() {
        reads++;
        if (inner === "takeover") accepted(kernel.requestTakeover(who, executionId, exchange));
        else accepted(kernel.submitOutcome(who, outcomeFor(executionId, exchange, inner === "complete" ? { next: { step: "complete", result: "done" } } : {}), grant));
        afterInner = accepted(kernel.inspect(who, executionId));
        return exchange.activationId;
      },
      writerEpoch: 1,
      available: { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: [] },
    };
    const result = outer === "takeover" ? kernel.requestTakeover(who, executionId, request)
      : outer === "protocol" ? kernel.reportProtocolFailure(who, executionId, request)
        : kernel.recoverExecution(who, executionId, request);
    assert.equal(reads, 1);
    assert.ok(afterInner, "the inner decision completed in the observed getter");
    const rejection = refused(result), after = accepted(kernel.inspect(who, executionId));
    assert.equal(rejection.classification, classification);
    assertOnlyRefusal(afterInner, after, rejection);
    assert.equal(after.state, state);
    assert.equal(after.activation?.writerEpoch ?? null, epoch);
    assert.equal(driver.seen.length, sends);
    if (inner === "takeover") accepted(kernel.submitOutcome(who, outcomeFor(executionId, { ...exchange, writerEpoch: 2 }), driver.submissions[1]!));
    else if (inner === "resolve") {
      const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
      accepted(kernel.submitOutcome(who, outcomeFor(executionId, next), driver.submissions[1]!));
    }
  });
}
