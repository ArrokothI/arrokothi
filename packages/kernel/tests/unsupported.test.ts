/**
 * The target Kernel landing zone refuses; it does not pretend.
 *
 * K1.0 ships no protocol, so the only behaviour this package can correctly have is an explicit
 * refusal. These cases exist to catch the failure mode 007 warns about - scaffolding that answers a
 * caller with a silent no-op, which a later packet could mistake for working behaviour.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { UnsupportedKernelSurfaceError, refuseUnsupportedSurface } from "../src/index.ts";

describe("target Kernel scaffolding", () => {
  test("an unimplemented surface throws rather than returning anything", () => {
    let returned: unknown = "sentinel";
    assert.throws(() => {
      returned = refuseUnsupportedSurface("activate", "K1.1");
    }, UnsupportedKernelSurfaceError);
    assert.equal(returned, "sentinel", "the refusal never produced a value a caller could act on");
  });

  test("the refusal names the surface and the packet that owns implementing it", () => {
    try {
      refuseUnsupportedSurface("acceptOutcome", "K1.2");
      assert.fail("expected a refusal");
    } catch (error) {
      assert.ok(error instanceof UnsupportedKernelSurfaceError);
      assert.equal(error.name, "UnsupportedKernelSurfaceError");
      assert.equal(error.surface, "acceptOutcome");
      assert.equal(error.owner, "K1.2");
      assert.match(error.message, /acceptOutcome is not implemented in @arrokothi\/kernel/);
      assert.match(error.message, /K1\.2 owns this surface/);
    }
  });

  test("the refusal points at the supported implementation instead of leaving a dead end", () => {
    const error = new UnsupportedKernelSurfaceError("createExecution", "K1.1");
    assert.match(error.message, /@arrokothi\/core, which is explicitly legacy/);
  });

  test("the package exports the refusal and nothing that could look like a protocol", async () => {
    const surface = await import("../src/index.ts");
    assert.deepEqual(Object.keys(surface).sort(), ["UnsupportedKernelSurfaceError", "refuseUnsupportedSurface"]);
  });
});
