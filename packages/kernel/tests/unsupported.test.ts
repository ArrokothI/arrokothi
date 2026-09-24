/**
 * The target Kernel refuses what it has not built; it does not pretend.
 *
 * K1.0 introduced this mechanism when the package shipped no protocol at all. K1.1 keeps it for the
 * surfaces later packets own, which is the failure 007 warns about in its other form: scaffolding
 * that answers a caller with a silent no-op a later packet could mistake for working behaviour.
 *
 * The example surface changed with K1.1 (`createExecution` became implemented) and again with K1.2
 * (Outcome acceptance became implemented), so the refusal cases now name `registerWait`, which K1.3
 * owns.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { UnsupportedKernelSurfaceError, refuseUnsupportedSurface } from "../src/index.ts";

describe("target Kernel scaffolding", () => {
  test("an unimplemented surface throws rather than returning anything", () => {
    let returned: unknown = "sentinel";
    assert.throws(() => {
      returned = refuseUnsupportedSurface("registerWait", "K1.3");
    }, UnsupportedKernelSurfaceError);
    assert.equal(returned, "sentinel", "the refusal never produced a value a caller could act on");
  });

  test("the refusal names the surface and the packet that owns implementing it", () => {
    try {
      refuseUnsupportedSurface("registerWait", "K1.3");
      assert.fail("expected a refusal");
    } catch (error) {
      assert.ok(error instanceof UnsupportedKernelSurfaceError);
      assert.equal(error.name, "UnsupportedKernelSurfaceError");
      assert.equal(error.surface, "registerWait");
      assert.equal(error.owner, "K1.3");
      assert.match(error.message, /registerWait is not implemented in @arrokothi\/kernel/);
      assert.match(error.message, /K1\.3 owns this surface/);
    }
  });

  test("the refusal points at the supported implementation instead of leaving a dead end", () => {
    const error = new UnsupportedKernelSurfaceError("cancelExecution", "K1.3");
    assert.match(error.message, /@arrokothi\/core, which is explicitly legacy/);
  });

  test("the package exports exactly the K1.1 and K1.2 runtime surface and nothing that could look like a later packet's", async () => {
    const surface = await import("../src/index.ts");
    assert.deepEqual(Object.keys(surface).sort(), [
      "BOUNDARY_LIMITS",
      "ExecutionCoordinator",
      "TERMINAL_STATES",
      "UNKNOWN_DESTINATION_REASON",
      "UnsupportedKernelSurfaceError",
      "boundaryValueIssues",
      "canonicalize",
      "creationRequestIdKey",
      "err",
      "inputIdKey",
      "isBoundaryValue",
      "isTerminal",
      "mayReachScope",
      "mintReceipt",
      "ok",
      "refuseUnsupportedSurface",
      "sameLogicalValue",
    ]);
    // Nothing named for a boundary no packet has built yet. The list above is exact so adding one is a
    // deliberate, reviewed change rather than a drift. K1.2 adds only types and coordinator methods,
    // no runtime export; Outcome acceptance and takeover are built now, so the guard names what is not.
    for (const name of Object.keys(surface)) {
      assert.doesNotMatch(name, /effect|wait|deadline|cancel|child|message/i, `${name} would advertise an unbuilt boundary`);
    }
  });
});
