/**
 * Explicit high-memory regression probe, excluded from npm's *.test.ts discovery.
 * Run alone: node --experimental-strip-types docs/development/work/K1.2-correction-01/probe-diagnostics-maxlen.ts
 * It allocates an identity near buffer.constants.MAX_STRING_LENGTH (about 0.5 GiB on V8).
 * Allow additional engine/test overhead; do not run beside another high-memory probe.
 * The default diagnostic tests import the same schedule without allocating the engine-max string.
 */
import assert from "node:assert/strict";
import { constants } from "node:buffer";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runBoundaryDiagnosticSchedule } from "../../../../packages/kernel/tests/refusal-diagnostics-fixture.ts";

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const length = constants.MAX_STRING_LENGTH - 16;
  console.log(`Explicit high-memory probe: ${length} UTF-16 units, MAX_STRING_LENGTH=${constants.MAX_STRING_LENGTH}; approximately 0.5 GiB plus overhead.`);
  const identity = "Z".repeat(length);
  assert.equal(identity.length, length);
  const cases = runBoundaryDiagnosticSchedule(identity, name => console.log(`PASS ${name}`));
  console.log(`PASS ${cases}/${cases} asserted cases; bounded frozen refusals, whole-state equality, single capture and later valid answers/replay.`);
}
