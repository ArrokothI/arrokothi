// Round 8 (contract revision 9): the runtime sweeps and the new maintained probes against review 11's H.
// A disposable detached worktree of H receives this round's sweep directory and four new test files;
// nothing else of H changes (the harness is unchanged since H). Expected:
//   - review 10's 30 whole-view comparisons and review 11's inherited-read probe pass at H, which is
//     the code whose clean results those reviews recorded;
//   - the catalog poison sweep passes at H, and so does the whole-suite poison sweep in count mode:
//     review 11 found H's runtime correct;
//   - the fault sweep at H reports violations only while a refusal record is built or appended
//     (SELF-R8-REFUSAL-01, fixed on this tree), and none anywhere else.
// Run from the repository root. The worktree is removed afterwards.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const H = "dcac779bdf7e887bcf42c8a6407c1b24c2083a55";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const scratch = mkdtempSync(join(tmpdir(), "k12c1-r8-h-"));
const tree = join(scratch, "h");
const NEW_TESTS = ["whole-view-ambient.test.ts", "review-11-probes.test.ts", "poison-catalog.test.ts"];
let exit = 0;
try {
  assert.equal(git("diff", H, "HEAD", "--", "packages/kernel/tests/harness.ts"), "", "the harness is unchanged since H");
  git("worktree", "add", "--detach", tree, H);
  symlinkSync(resolve(root, "node_modules"), join(tree, "node_modules"), "dir");
  console.log(`worktree ${tree} at ${git("-C", tree, "rev-parse", "HEAD")}`);
  cpSync(join(root, "packages/kernel/tests/sweep"), join(tree, "packages/kernel/tests/sweep"), { recursive: true });
  for (const file of [...NEW_TESTS, "fault-sweep.test.ts"]) cpSync(join(root, "packages/kernel/tests", file), join(tree, "packages/kernel/tests", file));

  const tests = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "--test-reporter=spec", ...NEW_TESTS.map((file) => `packages/kernel/tests/${file}`)], { cwd: tree, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
  const output = (tests.stdout ?? "") + (tests.stderr ?? "");
  const count = (label) => Number(new RegExp(`^ℹ ${label} (\\d+)`, "m").exec(output)?.[1]);
  console.log(`MAINTAINED PROBES AND CATALOG SWEEP AT H: exit=${tests.status} tests=${count("tests")} pass=${count("pass")} fail=${count("fail")} cancelled=${count("cancelled")} skipped=${count("skipped")} todo=${count("todo")}`);
  for (const match of output.matchAll(/^\s*✖ (.+?) \(\d/gm)) console.log(`  ✖ ${match[1]}`);
  assert.equal(tests.status, 0);

  const fault = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "packages/kernel/tests/sweep/fault-child.ts"], { cwd: tree, encoding: "utf8", timeout: 1_800_000, maxBuffer: 256 * 1024 * 1024 });
  const report = JSON.parse(fault.stdout);
  const violations = report.results.flatMap((result) => result.violations.map((violation) => ({ scenario: result.name, violation })));
  const refusalOnly = /\((Object\.freeze at refusal\.ts:\d+ mintRefusal|Object\.create at own-array\.ts:\d+ defineData|Object\.defineProperty at own-array\.ts:\d+ defineData)\): threw and left a state no complete decision explains$/;
  const elsewhere = violations.filter(({ violation }) => !refusalOnly.test(violation));
  const scenarios = [...new Set(violations.map(({ scenario }) => scenario))];
  console.log(`FAULT SWEEP AT H: exit=${fault.status} scenarios=${report.scenarios} runs=${report.runs} violations=${report.violations}`);
  console.log(`  every violation is a fault while a refusal record is built or appended: ${elsewhere.length === 0}`);
  console.log(`  scenarios with violations (${scenarios.length}): ${scenarios.join(" | ")}`);
  for (const { scenario, violation } of violations.slice(0, 6)) console.log(`  ${scenario}: ${violation}`);
  for (const { scenario, violation } of elsewhere) console.log(`  UNEXPECTED ${scenario}: ${violation}`);
  assert.equal(fault.status, 1);
  assert.ok(report.violations > 0);
  assert.equal(elsewhere.length, 0);

  const poison = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "packages/kernel/tests/sweep/run-poison-sweep.ts", "--modes", "off,count"], { cwd: tree, encoding: "utf8", timeout: 1_800_000, maxBuffer: 256 * 1024 * 1024 });
  const poisonOutput = (poison.stdout ?? "") + (poison.stderr ?? "");
  for (const line of poisonOutput.split("\n").filter((text) => /^(SCOPE|RUN|MODE|BOUNDARY|POISON|PROBLEM|ZONE FIRING)/.test(text))) console.log(`WHOLE-SUITE POISON AT H: ${line}`);
  assert.equal(poison.status, 0);
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
