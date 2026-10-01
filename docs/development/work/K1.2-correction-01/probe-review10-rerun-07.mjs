// Round 7: review 10's two behavioural probes rerun on this tree. Both write their results into the
// sealed review-10 directory, so they run only inside a disposable detached worktree of HEAD (the clean
// payload C when run by validate.mjs); their stdout and the SHA-256 and summary of what they wrote are
// printed here, and nothing inside the repository changes.
//   - probe-whole-view.mjs: 30 whole-view comparisons across six recovery transitions and five
//     pollution modes; it asserts its own result.
//   - probe-read-effects.mjs: its six-form inherited-getter execution and its syntax inventory of the
//     13 zone sources (a navigation aid in review 10, not a proof).
// Run from the repository root.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const scratch = mkdtempSync(join(tmpdir(), "k12c1-r7-review10-"));
const tree = join(scratch, "c");
const directory = "docs/development/work/K1.2-correction-01/review-10";
let exit = 0;
try {
  git("worktree", "add", "--detach", tree, "HEAD");
  symlinkSync(resolve(root, "node_modules"), join(tree, "node_modules"), "dir");
  console.log(`worktree ${tree} at ${git("-C", tree, "rev-parse", "HEAD")}`);
  for (const [probe, produced] of [["probe-whole-view.mjs", "whole-view-results.json"], ["probe-read-effects.mjs", "source-access-inventory.json"]]) {
    const run = spawnSync(process.execPath, [`${directory}/${probe}`], { cwd: tree, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    console.log(`\n== ${probe}: exit=${run.status} signal=${run.signal}`);
    console.log(`${run.stdout ?? ""}${run.stderr ?? ""}`.trim());
    const path = join(tree, directory, produced);
    if (existsSync(path)) {
      const bytes = readFileSync(path);
      const parsed = JSON.parse(bytes.toString("utf8"));
      const summary = Array.isArray(parsed)
        ? parsed.length > 0 && "transition" in parsed[0]
          ? { entries: parsed.length, transitions: [...new Set(parsed.map((entry) => entry.transition))], modes: [...new Set(parsed.map((entry) => entry.mode))], inheritedReads: parsed.reduce((sum, entry) => sum + Number(entry.reads ?? 0), 0), nested: parsed.reduce((sum, entry) => sum + Number(entry.nested ?? 0), 0) }
          : { files: parsed.length, sites: parsed.reduce((sum, entry) => sum + entry.sites.length, 0) }
        : {};
      console.log(`wrote ${produced} (in the disposable worktree only): sha256 ${createHash("sha256").update(bytes).digest("hex")} ${JSON.stringify(summary)}`);
    }
    if (run.status !== 0) exit = 1;
  }
  console.log(`\nrepository tree unchanged: ${git("status", "--porcelain", "--", directory) === "" ? "yes" : "NO"}`);
} finally {
  try {
    git("worktree", "remove", "--force", tree);
  } catch {
    // Already gone.
  }
  rmSync(scratch, { recursive: true, force: true });
}
process.exitCode = exit;
