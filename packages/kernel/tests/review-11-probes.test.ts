/**
 * Review 11's runtime probes on clean code, maintained (correction DEC-8/DEC-9, amendment 03).
 *
 * K12C1-R11-READ-01's runtime probe: an authorized protocol-failure report's own `activationId`
 * getter installs an inherited `resultingEpoch` accessor on `Object.prototype`, then the Execution is
 * inspected while it is still installed. The accessor counts, throws, or re-enters with a valid
 * terminal Outcome and the saved grant. Review 11 recorded that clean H never reads it; the mutant
 * that reads it during `inspect()` completed the Execution from inside the inspection. These are the
 * review's three clean arms with its recorded results
 * (`docs/development/work/K1.2-correction-01/review-11/read-runtime-results.json`).
 *
 * K12C1-R11-COMMIT-01's fault probe (an exception immediately before the takeover's Activation is
 * built, then the next input's receipt position) needs the Kernel's load-time primordials replaced
 * before import, so it runs inside the fault sweep: `fault-sweep.test.ts`, scenario "review 11's seed".
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, submissionFor } from "./harness.ts";

describe("review 11: an inherited resultingEpoch installed during observation is never read by inspection", () => {
  for (const mode of ["count", "throw", "reenter"] as const) {
    test(`${mode}: no read, no exception, no nested decision; the view is review 11's clean result`, () => {
      const who = caller("review11", "tenant-a");
      const driver = recordingDriver();
      const kernel = new ExecutionCoordinator({ driver });
      const id = accepted(kernel.createExecution(who, createRequest())).executionId;
      const open = accepted(kernel.dispatch(who, id, { bound: 1 }));
      const complete = outcomeFor(id, open, { next: { step: "complete", result: { done: true } } });
      const grant = submissionFor(driver, open.activationId);
      let reads = 0;
      let nested: { ok: boolean } | undefined;
      const saved = Object.getOwnPropertyDescriptor(Object.prototype, "resultingEpoch");
      let answer: ReturnType<typeof kernel.inspect> | undefined;
      let error: string | undefined;
      try {
        accepted(
          kernel.reportProtocolFailure(who, id, {
            get activationId() {
              Object.defineProperty(Object.prototype, "resultingEpoch", {
                configurable: true,
                get() {
                  reads++;
                  if (mode === "throw") throw Error("reviewer inherited read");
                  if (mode === "reenter") {
                    delete (Object.prototype as Record<string, unknown>).resultingEpoch;
                    nested = kernel.submitOutcome(who, complete, grant);
                  }
                  return 777;
                },
              });
              return open.activationId;
            },
            writerEpoch: 1,
            diagnostic: "install ambient state",
          }),
        );
        try {
          answer = kernel.inspect(who, id);
        } catch (thrown) {
          error = (thrown as Error).message;
        }
      } finally {
        if (saved) Object.defineProperty(Object.prototype, "resultingEpoch", saved);
        else delete (Object.prototype as Record<string, unknown>).resultingEpoch;
      }
      const after = accepted(kernel.inspect(who, id));
      assert.equal(reads, 0, "the inherited accessor never ran");
      assert.equal(error, undefined);
      assert.equal(nested, undefined);
      assert.equal(answer?.ok === true ? answer.value.state : undefined, "RUNNING");
      assert.equal(after.state, "RUNNING");
      assert.equal(after.progressRevision, 0);
      assert.equal(after.receipts.length, 2);
      assert.deepEqual(after.recoveryHistory.map((record) => record.transition), ["entered"]);
      assert.deepEqual(answer?.ok === true ? answer.value : undefined, after, "inspection returned the retained state unchanged");
    });
  }
});
