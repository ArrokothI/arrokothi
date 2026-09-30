// Reviewer single-span ablations (round 2 preliminary). Runs the whole kernel suite per mutant in a
// disposable copy of TREE/packages/kernel. TREE=<worktree> node reviewer-ablations.mjs
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const root = process.env.TREE;
const mutations = [
  ["N1 summary only when two or more issues remain", "envelope.ts",
    "if (issues.length > ISSUE_DETAIL_LIMIT) {", "if (issues.length > ISSUE_DETAIL_LIMIT + 1) {"],
  ["N2 additional count reports distinct codes, not issues", "envelope.ts",
    "out += `; ${issues.length - ISSUE_DETAIL_LIMIT} additional issues: `;", "out += `; ${counts.length} additional issues: `;"],
  ["N3 recovery control renders messages (DEC-5 says Outcomes only)", "coordinator.ts",
    "recovery request is not acceptable: ${explainDiagnosticIssues(issues, false)}", "recovery request is not acceptable: ${explainDiagnosticIssues(issues, true)}"],
  ["N4 all remaining codes merged into the first", "envelope.ts",
    "if (candidate.code === issue.code) entry = candidate;", "entry = candidate;"],
  ["N5 bracketed value path loses its root adjacency", "envelope.ts",
    ": projected.path[0] === \"[\" ? `${root}${projected.path}` : `${root}.${projected.path}`;", ": `${root}.${projected.path}`;"],
  ["N6 Outcome renders without messages", "outcome.ts",
    "explainDiagnosticIssues(issues, true);", "explainDiagnosticIssues(issues, false);"],
  ["N7 capture keeps only eight issues per root", "envelope.ts",
    "export const appendRootIssues = (target: LocatedIssue[], issues: readonly ValueIssue[], root: string): void => {\n  for (let index = 0; index < issues.length; index += 1) {",
    "export const appendRootIssues = (target: LocatedIssue[], issues: readonly ValueIssue[], root: string): void => {\n  for (let index = 0; index < issues.length && index < 8; index += 1) {"],
  ["N8 detailed issues also counted in the summary", "envelope.ts",
    "      if (withMessages) out += ` (${projected.message})`;\n    } else {",
    "      if (withMessages) out += ` (${projected.message})`;\n    }\n    if (index >= 0) {"],
  ["N9 redelivery hold reason renders raw minted ID", "coordinator.ts",
    "`Activation ${diagnosticIdentity(intent.activation.activationId)} is recovery-held and is not redelivered: ${hold.reason}`",
    "`Activation ${intent.activation.activationId} is recovery-held and is not redelivered: ${hold.reason}`"],
  ["N10 control malformed takeover renders raw issue paths via old explain", "coordinator.ts",
    "takeover request is not acceptable: ${explainDiagnosticIssues(issues, false)}", "takeover request is not acceptable: ${explain(issues)}"],
];
const run = (work) => {
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=spec", "--experimental-strip-types", "--no-warnings", "packages/kernel/tests/*.test.ts"], { cwd: work, encoding: "utf8", timeout: 900_000, maxBuffer: 256 * 1024 * 1024 });
  const out = `${r.stdout}\n${r.stderr}`;
  const n = (l) => Number(new RegExp(`ℹ ${l} (\\d+)`).exec(out)?.[1] ?? NaN);
  return { status: r.status, tests: n("tests"), pass: n("pass"), fail: n("fail"), cancelled: n("cancelled"), failing: [...new Set([...out.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((m) => m[1]))].slice(0, 3) };
};
for (const mutation of [null, ...mutations]) {
  const work = mkdtempSync(join(tmpdir(), "k12c1-reviewer-ablation-"));
  try {
    cpSync(join(root, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
    symlinkSync(join(root, "node_modules"), join(work, "node_modules"), "dir");
    if (mutation) {
      const [id, file, find, replace] = mutation;
      const path = join(work, "packages/kernel/src", file);
      const text = readFileSync(path, "utf8");
      if (text.split(find).length !== 2) { console.log(`NOT APPLICABLE ${id}`); continue; }
      writeFileSync(path, text.replace(find, () => replace));
    }
    const s = run(work);
    const label = mutation ? mutation[0] : "CONTROL";
    const verdict = !mutation ? (s.fail === 0 && s.cancelled === 0 && s.tests === s.pass ? "CONTROL-OK" : "CONTROL-BAD")
      : !(s.tests > 0 && s.pass > 0) || s.cancelled > 0 ? "NO RESULT" : s.fail > 0 ? "REJECTED" : "SURVIVED";
    console.log(`${verdict} ${label}: tests=${s.tests} pass=${s.pass} fail=${s.fail} cancelled=${s.cancelled}${s.failing.length ? `\n    ${s.failing.join(" | ")}` : ""}`);
    if (verdict === "CONTROL-BAD") process.exit(2);
  } finally { rmSync(work, { recursive: true, force: true }); }
}
