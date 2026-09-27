// Reviewer single-span ablations (round 2 preliminary). Runs the whole kernel suite per mutant in a
// disposable copy of TREE/packages/kernel. TREE=<worktree> node reviewer-ablations.mjs
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const root = process.env.TREE;
const mutations = [
  ["R1 structured refusal executionId rendered lossy", "coordinator.ts",
    "const refusal = mintRefusal(classification, reason, position, record.executionId);",
    "const refusal = mintRefusal(classification, reason, position, diagnosticIdentity(record.executionId));"],
  ["R2 code availability compared through the diagnostic spelling", "coordinator.ts",
    "if (!listed(captured.available.definitionRevisions, pinned.definitionRevision)) note(",
    "if (!listed(captured.available.definitionRevisions, diagnosticIdentity(pinned.definitionRevision))) note("],
  ["R3 projection after the root label (inverse of DEC-5 order)", "outcome.ts",
    "appendIssues(issues, located(diagnosticIssues(captured.issues), label));",
    "appendIssues(issues, diagnosticIssues(located(captured.issues, label)));"],
  ["R4 wrong-Activation comparison through the diagnostic spelling", "coordinator.ts",
    "if (identityUsable && intent.activation.activationId !== activationId) {",
    "if (identityUsable && diagnosticIdentity(intent.activation.activationId) !== diagnosticIdentity(activationId)) {"],
  ["R5 control exchange lookup through the diagnostic spelling", "coordinator.ts",
    "if (intent.activation.activationId !== activationId) {\n      return err(",
    "if (diagnosticIdentity(intent.activation.activationId) !== diagnosticIdentity(activationId)) {\n      return err("],
  ["R6 replay lookup keyed by diagnostic spelling", "coordinator.ts",
    "const already = mapGet(record.acceptedOutcomes, activationId);",
    "const already = mapGet(record.acceptedOutcomes, diagnosticIdentity(activationId));"],
  ["R7 duplicate Emission comparison through diagnostic spelling", "outcome.ts",
    "if ((readAt(keys, position) as string) === emissionKey) duplicate = true;",
    "if (diagnosticIdentity(readAt(keys, position) as string) === diagnosticIdentity(emissionKey)) duplicate = true;"],
  ["R8 identity limit 127 (one-under edge)", "envelope.ts",
    'diagnosticText(identity, "<identity omitted>", 128)', 'diagnosticText(identity, "<identity omitted>", 127)'],
  ["R9 path limit 129 (one-over edge)", "envelope.ts",
    'path: diagnosticText(issue.path, "<omitted>", 128),', 'path: diagnosticText(issue.path, "<omitted>", 129),'],
  ["R10 message limit removed", "envelope.ts",
    'message: diagnosticText(issue.message, "<message omitted>", 1_024),', 'message: diagnosticText(issue.message, "<message omitted>", Infinity),'],
  ["R11 code-hold 'updated' detection compares rendered reasons of equal kind only", "coordinator.ts",
    "} else if (exchange.codeHold === null || exchange.codeHold.reason !== missing) {",
    "} else if (exchange.codeHold === null) {"],
  ["R12 protocol diagnostic sanitized like an identity (DEC-6 inverse)", "coordinator.ts",
    "const reason = `the response of the attempt at writer epoch ${currentEpoch} could not be classified as an Outcome: ${diagnostic}`;",
    "const reason = `the response of the attempt at writer epoch ${currentEpoch} could not be classified as an Outcome: ${diagnosticIdentity(diagnostic)}`;"],
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
