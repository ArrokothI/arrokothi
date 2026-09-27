// Rebind four textual mutation anchors to round-2 diagnostic spelling, preserving the sealed runner.
// The original 36 mutation IDs, wrong semantics, full Kernel suite, control and verdict rules remain.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const source = readFileSync("docs/development/work/K1.2/ablations.mjs", "utf8");
assert.equal(createHash("sha256").update(source).digest("hex"), "9ea4cecb45f440fe8d6c972bc1ecbeacbf926ef1cd91c3daa683c4909b501f55");
const marker = "const applyOnce = (text, find, replace, label) => {";
assert.equal(source.split(marker).length, 2);
const adaptation = String.raw`
// Only find/replace literals, never mutation selection, suite or pass/fail logic.
const adaptedIds = new Set(["B6", "B12", "B13", "B14"]);
let adaptedCount = 0;
const spelling = text => text.replace(/\$\{(activationId|named\.activationId|record\.executionId)\}/g,
  (_, expression) => "$" + "{diagnosticIdentity(" + expression + ")}");
for (const ablation of ablations) {
  if (!adaptedIds.has(ablation.id.split(" ")[0])) continue;
  let edits = 0;
  for (const target of [ablation, ablation.prefix, ablation.suffix]) {
    if (!target) continue;
    for (const key of ["find", "replace"]) {
      const before = target[key];
      const after = spelling(before);
      if (before !== after) edits++;
      target[key] = after;
    }
  }
  if (edits === 0) throw Error("stale diagnostic adapter: " + ablation.id);
  adaptedCount++;
  console.log("ADAPTED diagnostic spelling only: " + ablation.id);
}
if (adaptedCount !== 4 || ablations.length !== 36) throw Error("original mutation inventory changed");
`;
const directory = mkdtempSync(join(tmpdir(), "k12-original-ablation-adapter-"));
try {
  const script = join(directory, "adapted.mjs");
  writeFileSync(script, source.replace(marker, adaptation + "\n" + marker));
  console.log("Sealed original SHA-256 verified; adapting only B6/B12/B13/B14 diagnostic literal anchors.");
  const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.signal) throw Error(`adapted runner terminated by ${result.signal}`);
  process.exitCode = result.status ?? 1;
} finally { rmSync(directory, { recursive: true, force: true }); }
