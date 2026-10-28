/**
 * K1.1-C7 - the surfaces later packets own refuse by name and change nothing.
 *
 * 007: "Scaffolding must explicitly refuse unsupported APIs." The failure this forecloses is the one
 * K1.0 built the mechanism for - a surface that answers with a no-op a later packet, or a reader of
 * an evidence trace, could mistake for working behaviour.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { UnsupportedKernelSurfaceError, refuseUnsupportedSurface } from "../src/index.ts";
import { ExecutionCoordinator } from "./binding-facade.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");

describe("K1.1-C7 unlanded surfaces", () => {
  test("an unlanded surface refuses, names its owner packet, and returns nothing", () => {
    // Governing 007: a surface no packet has built refuses naming its owner (K11-R1-SCOPE-01). K1.3
    // implemented the last coordinator surface that refused this way (`cancelExecution`), so the
    // mechanism is exercised on a later packet's surface name; its behaviour is unchanged.
    let returned: unknown = "sentinel";
    assert.throws(
      () => {
        returned = refuseUnsupportedSurface("admitEffect", "K2");
      },
      (error: unknown) => {
        assert.ok(error instanceof UnsupportedKernelSurfaceError);
        assert.equal(error.surface, "admitEffect");
        assert.equal(error.owner, "K2");
        return true;
      },
    );
    assert.equal(returned, "sentinel", "the refusal produced no value");
  });

  test("K11-R1-SCOPE-01 after K1.3: cancellation's own refusals change no accepted state", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }));
    accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const before = accepted(kernel.inspect(author, created.executionId));
    // Invisible and missing answer alike and record nothing.
    const hidden = refused(kernel.cancelExecution(caller("elsewhere", "tenant-b"), created.executionId));
    const missing = refused(kernel.cancelExecution(author, "no-such-execution"));
    assert.deepEqual([hidden.classification, hidden.position, hidden.executionId], ["unknown_destination", 0, null]);
    assert.deepEqual(missing, hidden);
    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)), before);
    // Visible without cancel power: scoped, recorded, nothing else changed.
    const unauthorized = refused(kernel.cancelExecution(author, created.executionId));
    assert.equal(unauthorized.classification, "unauthorized_control");
    assert.equal(unauthorized.executionId, created.executionId);
    const after = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual({ ...after, refusals: before.refusals }, before, "only the refusal was recorded");
    assert.equal(after.state, "RUNNING");
  });
});
