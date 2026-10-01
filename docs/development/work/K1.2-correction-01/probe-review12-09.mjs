// Round 9 (contract revision 10): review 12's two probes, rerun unchanged from the sealed evidence.
//
// 1. The oracle probe (review-12-evidence/build-oracle-probe.py) copies the fault sweep's
//    classification branches out of a source tree and feeds them review 12's three altered
//    observations. Against a disposable detached worktree of reviewed H 4a917f8 it must reproduce
//    review 12's result exactly (oracle-probe.json): all three accepted, zero violations. That is the
//    defect K12C1-R12-ORACLE-01 records. The builder slices the old fault-child.ts at text anchors this
//    tree's rewritten sweep no longer has, so against this tree it is expected to stop; the same three
//    observations are maintained negative controls in packages/kernel/tests/fault-oracle.test.ts, where
//    each is a violation.
// 2. The scope probe (review-12-evidence/scope-probe.mjs) exercises the 16 exits K12C1-R12-SCOPE-01
//    lists, without faults, and asserts their ordinary behaviour. Against this tree it must pass and
//    reproduce review 12's rows (scope-probe.json) exactly; each of the 16 is now a scenario of the sweep.
// Run from the repository root. The worktree and scratch directory are removed afterwards.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const root = process.cwd();
const H = "4a917f8caac04e7d9861e0ec3638662d52f9d3ae";
const EVIDENCE = join(root, "docs/development/work/K1.2-correction-01/review-12-evidence");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const scratch = mkdtempSync(join(tmpdir(), "k12c1-r9-review12-"));
const tree = join(scratch, "h");
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
};
let exit = 0;
try {
  git("worktree", "add", "--quiet", "--detach", tree, H);
  symlinkSync(resolve(root, "node_modules"), join(tree, "node_modules"), "dir");
  console.log(`worktree ${tree} at ${git("-C", tree, "rev-parse", "HEAD")}`);

  const recorded = JSON.parse(readFileSync(join(EVIDENCE, "oracle-probe.json"), "utf8"));
  const builtAtH = run("python3", [join(EVIDENCE, "build-oracle-probe.py"), tree, join(scratch, "oracle-probe-h.ts")]);
  assert.equal(builtAtH.status, 0, builtAtH.stderr);
  const probeAtH = run(process.execPath, ["--experimental-strip-types", "--no-warnings", join(scratch, "oracle-probe-h.ts")]);
  assert.equal(probeAtH.status, 0, probeAtH.stderr);
  const atH = JSON.parse(probeAtH.stdout);
  console.log("ORACLE PROBE AT REVIEWED H:");
  for (const result of atH.results) console.log(`  ${result.name}: classes ${JSON.stringify(result.decision.classes)}; violations ${result.decision.violations.length}`);
  const reproduced = isDeepStrictEqual(atH, recorded);
  console.log(`  identical to review 12's oracle-probe.json: ${reproduced}`);
  assert.ok(reproduced);
  assert.ok(atH.results.every((result) => result.decision.violations.length === 0), "reviewed H's oracle accepts all three");

  const builtHere = run("python3", [join(EVIDENCE, "build-oracle-probe.py"), root, join(scratch, "oracle-probe-c.ts")]);
  console.log(`ORACLE PROBE BUILDER AGAINST THIS TREE: exit=${builtHere.status} (expected nonzero: the rewritten sweep has none of its slice anchors)`);
  console.log(`  ${builtHere.stderr.trim().split("\n").at(-1) ?? ""}`);
  assert.notEqual(builtHere.status, 0);

  const scope = run(process.execPath, ["--experimental-strip-types", "--no-warnings", join(EVIDENCE, "scope-probe.mjs"), root]);
  assert.equal(scope.status, 0, scope.stderr);
  const scopeHere = JSON.parse(scope.stdout);
  const scopeRecorded = JSON.parse(readFileSync(join(EVIDENCE, "scope-probe.json"), "utf8"));
  console.log(`SCOPE PROBE AGAINST THIS TREE: exit=${scope.status} rows=${scopeHere.rows.length}; identical to review 12's scope-probe.json: ${isDeepStrictEqual(scopeHere, scopeRecorded)}`);
  for (const row of scopeHere.rows) console.log(`  ${row.method} ${row.path}: ${row.classification}`);
  assert.deepEqual(scopeHere, scopeRecorded);
} catch (error) {
  console.log(`FAILED: ${error instanceof Error ? error.message : String(error)}`);
  exit = 1;
} finally {
  try {
    git("worktree", "remove", "--force", tree);
  } catch {
    // Already gone.
  }
  rmSync(scratch, { recursive: true, force: true });
}
process.exitCode = exit;
