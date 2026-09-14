/**
 * K1.1-C7 - the surfaces later packets own refuse by name and change nothing.
 *
 * 007: "Scaffolding must explicitly refuse unsupported APIs." The failure this forecloses is the one
 * K1.0 built the mechanism for - a surface that answers with a no-op a later packet, or a reader of
 * an evidence trace, could mistake for working behaviour.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, UnsupportedKernelSurfaceError } from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver } from "./harness.ts";

const author = caller("app-a", "tenant-a");

describe("K1.1-C7 unlanded surfaces", () => {
  test("each refuses, names its owner packet, and returns nothing", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const expectations: [() => unknown, string, string][] = [
      [() => kernel.submitOutcome(), "submitOutcome", "K1.2"],
      [() => kernel.requestTakeover(), "requestTakeover", "K1.2"],
      [() => kernel.recoverExecution(), "recoverExecution", "K1.2"],
    ];

    for (const [call, surface, owner] of expectations) {
      let returned: unknown = "sentinel";
      assert.throws(
        () => {
          returned = call();
        },
        (error: unknown) => {
          assert.ok(error instanceof UnsupportedKernelSurfaceError, `${surface} refuses with the packet's own error`);
          assert.equal(error.surface, surface);
          assert.equal(error.owner, owner);
          return true;
        },
      );
      assert.equal(returned, "sentinel", `${surface} produced no value`);
    }
  });

  test("calling them leaves the whole observable state untouched", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }));
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const before = accepted(kernel.inspect(author, created.executionId));

    for (const call of [() => kernel.submitOutcome(), () => kernel.requestTakeover(), () => kernel.recoverExecution()]) {
      assert.throws(call, UnsupportedKernelSurfaceError);
    }

    // No progress, no acknowledgment, no epoch advance, no refusal record, no receipt: a refused
    // surface is not even a recorded rejection of a proposal, because no proposal was accepted for
    // inspection in the first place.
    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)), before);
  });
});
