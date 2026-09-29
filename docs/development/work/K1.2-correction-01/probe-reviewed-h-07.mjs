// Round 7: the new enforcement files and the SELF-R7-UNSUPPORTED-01 probe against review 10's H.
// A disposable detached worktree of H receives the round-7 enforcement files (the two tests and their
// analysis and inventory modules) in place of H's own; nothing else of H changes. Expected:
//   - ambient-reads.test.ts fails at H, and only because of unsupported.ts's `this.name` write (the
//     one runtime site the new rule finds; review 10's reads were probes, not zone code);
//   - control-commits.test.ts passes at H, whose control ordering review 10 found correct — its
//     distinguishing power is shown by the mutants (ablations-07.mjs, the rebound review-10 probe);
//   - an accessor on Error.prototype.name receives the Kernel's write at H and nothing on this tree.
// Run from the repository root. The worktree is removed afterwards.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const H = "35c6ba0277542236f21f95d695154fa0164feb96";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const scratch = mkdtempSync(join(tmpdir(), "k12c1-r7-h-"));
const tree = join(scratch, "h");
const probe = join(scratch, "probe-unsupported.ts");
writeFileSync(
  probe,
  [
    "// An accessor on Error.prototype.name, then an unsupported surface throws.",
    "const root = process.argv[2]!;",
    "const { ExecutionCoordinator } = await import(`${root}/packages/kernel/src/index.ts`);",
    "const original = Object.getOwnPropertyDescriptor(Error.prototype, \"name\")!;",
    "const received: unknown[] = [];",
    "Object.defineProperty(Error.prototype, \"name\", { configurable: true, get: () => \"Error\", set: (value: unknown) => void received.push(value) });",
    "let result: unknown;",
    "try {",
    "  const coordinator = new ExecutionCoordinator({ driver: { driverId: \"probe\", deliver: () => undefined } });",
    "  try { coordinator.cancelExecution(); } catch (error) {",
    "    const own = Object.getOwnPropertyDescriptor(error as object, \"name\");",
    "    result = { setterReceived: received, ownName: own === undefined ? null : own.value, reportedName: (error as Error).name };",
    "  }",
    "} finally { Object.defineProperty(Error.prototype, \"name\", original); }",
    "console.log(JSON.stringify(result));",
    "",
  ].join("\n"),
);
let exit = 0;
try {
  git("worktree", "add", "--detach", tree, H);
  symlinkSync(resolve(root, "node_modules"), join(tree, "node_modules"), "dir");
  console.log(`worktree ${tree} at ${git("-C", tree, "rev-parse", "HEAD")}`);
  for (const file of ["ambient-reads.test.ts", "control-commits.test.ts", "zone-analysis.ts", "zone-inventory.ts"]) {
    cpSync(join(root, "packages/kernel/tests", file), join(tree, "packages/kernel/tests", file));
  }
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "--test-reporter=spec", "packages/kernel/tests/ambient-reads.test.ts", "packages/kernel/tests/control-commits.test.ts"], { cwd: tree, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
  const output = (run.stdout ?? "") + (run.stderr ?? "");
  const count = (label) => Number(new RegExp(`^ℹ ${label} (\\d+)`, "m").exec(output)?.[1]);
  const failed = [...new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]))];
  const failedFiles = [...new Set([...output.matchAll(/^test at packages\/kernel\/tests\/([^:]+):\d+/gm)].map((match) => match[1]))].sort();
  console.log(`NEW ORACLES AT H: exit=${run.status} tests=${count("tests")} pass=${count("pass")} fail=${count("fail")} cancelled=${count("cancelled")} skipped=${count("skipped")} todo=${count("todo")}`);
  console.log(`  failing files: ${failedFiles.join(", ") || "none"}`);
  for (const name of failed) console.log(`  ✖ ${name}`);
  const unexpected = /unsupported\.ts:\d+ builtin\/write this\.name/.test(output);
  console.log(`  the inventory failure names unsupported.ts's this.name write: ${unexpected}`);
  assert.equal(run.status, 1);
  assert.deepEqual(failedFiles, ["ambient-reads.test.ts"]);
  assert.ok(unexpected);
  for (const [label, where] of [["H", tree], ["C", root]]) {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", probe, where], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    console.log(`UNSUPPORTED-NAME PROBE at ${label}: ${result.stdout.trim()}`);
    const parsed = JSON.parse(result.stdout);
    if (label === "H") assert.deepEqual(parsed, { setterReceived: ["UnsupportedKernelSurfaceError"], ownName: null, reportedName: "Error" });
    else assert.deepEqual(parsed, { setterReceived: [], ownName: "UnsupportedKernelSurfaceError", reportedName: "UnsupportedKernelSurfaceError" });
  }
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
