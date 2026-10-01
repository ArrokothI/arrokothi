// SELF-R4-STRING-01: observe string capture cost in fresh processes; no timing/heap thresholds.
// Run from the tree root: node --expose-gc docs/development/work/K1.2-correction-01/probe-string-work-04.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

if (process.argv[2] !== "--child") {
  for (const [surface, units, representation] of [
    ["direct", 1_048_576, "rope"],
    ["direct", 16_777_216, "rope"],
    ["direct", 268_435_456, "rope"],
    ["direct", 268_435_456, "flat"],
    ["creation", 16_777_216, "rope"],
    ["ingress", 16_777_216, "rope"],
    ["outcome-one", 16_777_216, "rope"],
    ["outcome-eight", 16_777_216, "rope"],
    ["accepted-zeros", 0, "plain"],
    ["accepted-arrays", 0, "plain"],
    ["accepted-objects", 0, "plain"],
  ]) {
    const run = spawnSync(process.execPath, ["--expose-gc", "--max-old-space-size=4096", "--experimental-strip-types", fileURLToPath(import.meta.url), "--child", surface, String(units), representation], {
      encoding: "utf8", timeout: 60_000, maxBuffer: 2 * 1024 * 1024,
    });
    process.stdout.write(run.stdout ?? "");
    process.stderr.write(run.stderr ?? "");
    assert.equal(run.error, undefined, String(run.error));
    assert.equal(run.signal, null);
    assert.equal(run.status, 0, `probe child ${surface}/${units}/${representation} failed`);
  }
} else {
  const [, , , surface, unitsText, representation] = process.argv;
  const units = Number(unitsText);
  let oversizedReads = 0;
  const original = String.prototype.charCodeAt;
  String.prototype.charCodeAt = function (index) {
    if (this.length > 131_072) oversizedReads++;
    return Reflect.apply(original, this, [index]);
  };
  const tree = pathToFileURL(`${process.cwd()}/`);
  const { canonicalize } = await import(new URL("packages/kernel/src/values.ts", tree));
  const { ExecutionCoordinator } = await import(new URL("packages/kernel/src/index.ts", tree));
  const h = await import(new URL("packages/kernel/tests/harness.ts", tree));
  const { assertOnlyRefusal } = await import(new URL("packages/kernel/tests/refusal-diagnostics-fixture.ts", tree));
  String.prototype.charCodeAt = original;
  const isAccepted = surface.startsWith("accepted-");
  const value = surface === "accepted-zeros" ? Array(127).fill(Array(4096).fill(0))
    : surface === "accepted-arrays" ? Array(85).fill(Array.from({ length: 4096 }, () => []))
      : surface === "accepted-objects" ? Array(85).fill(Array.from({ length: 4096 }, () => ({})))
        : "x".repeat(units);
  // This control makes the same primitive text flat before measurement. It isolates the engine
  // flattening from the logical scanner; neither representation changes string validity.
  if (representation === "flat") Reflect.apply(original, value, [0]);
  let call, verify;
  if (surface === "direct" || isAccepted) {
    call = () => canonicalize(value);
    verify = result => {
      assert.equal(result.ok, isAccepted);
      if (isAccepted) assert.ok(result.value.canonicalBytes <= 1_048_576);
      else {
        assert.equal(result.issues[0].code, "string_too_long");
        assert.equal(oversizedReads, 0);
      }
    };
  } else {
    const who = h.caller("string-cost"), driver = h.recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
    const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    const view = () => h.accepted(kernel.inspect(who, executionId));
    const before = view(), deliveries = driver.seen.length;
    if (surface === "creation") {
      const request = h.createRequest({ creationKey: "refused", authorityContext: value, initialInput: { kind: "application.message", payload: value } });
      call = () => kernel.createExecution(who, request);
    } else if (surface === "ingress") {
      call = () => kernel.submitInput(who, { destination: executionId, requestKey: "refused", kind: "application.message", payload: value });
    } else {
      assert.ok(surface === "outcome-one" || surface === "outcome-eight");
      const proposal = h.outcomeFor(executionId, open, surface === "outcome-one" ? { progress: value } : {
        progress: value,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: `e${index}`, value })),
        next: { step: "complete", result: value },
      });
      call = () => kernel.submitOutcome(h.observer("visible"), proposal, undefined);
    }
    verify = result => {
      const refusal = h.refused(result);
      assert.equal(refusal.classification, surface.startsWith("outcome-") ? "unauthorized_submission" : "malformed_value");
      assert.equal(oversizedReads, 0);
      if (surface === "creation") {
        assert.equal(refusal.executionId, null);
        assert.deepEqual(view(), before);
        assert.equal(h.accepted(kernel.createExecution(who, h.createRequest({ creationKey: "refused" }))).receipt.position, 1);
      } else assertOnlyRefusal(before, view(), refusal);
      assert.equal(driver.seen.length, deliveries);
    };
  }
  oversizedReads = 0;
  globalThis.gc?.();
  const before = process.memoryUsage(), start = performance.now();
  const result = call();
  const ms = performance.now() - start, after = process.memoryUsage();
  verify(result);
  console.log(JSON.stringify({ node: process.version, surface, units, representation, ms,
    heapMiB: (after.heapUsed - before.heapUsed) / 2 ** 20, rssMiB: (after.rss - before.rss) / 2 ** 20,
    oversizedReads, ok: result.ok, canonicalBytes: isAccepted ? result.value.canonicalBytes : null,
    logicalAssertions: "passed; timing and heap are observations, not thresholds" }));
}
