// Round 9 (contract revision 10): production negative controls for review 12's findings.
//
// Each mutant edits packages/kernel/src/coordinator.ts in a disposable copy of packages/kernel (one
// pinned snapshot per run, node_modules linked back) and is given to three checkers:
//   - this tree's fault sweep (sweep/fault-child.ts) on the scenarios named; it must REJECT the mutant;
//   - the fault sweep of reviewed H 4a917f8 (its fault-child.ts, copied beside it) on its nearest
//     scenarios; it ACCEPTS every one, which is what K12C1-R12-ORACLE-01 and -SCOPE-01 found;
//   - where one comparison is what rejects the mutant, this tree's sweep with that CHECKS entry replaced
//     by `() => true`; it must ACCEPT, which ties the comparison to a defect it exists to catch.
// The Kernel suite's own verdict on each mutant is recorded too, as context only.
// ORACLE-01: M1 revokes the setup grant on a contained refusal; M2 returns the wrong hold answer on
// the declared alternate path; M3 inserts the Outcome receipt out of the declared apply order.
// SCOPE-01: M4 lets a hidden caller's refusal consume the Execution's refusal position; M5 gives a
// post-callback revalidation exit the SELF-R8-REFUSAL-01 ordering.
// Clean controls on the same snapshot must pass first. A span not found exactly once aborts.
// Run from the repository root: node docs/development/work/K1.2-correction-01/sweeps-09.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const REVIEWED_H = "4a917f8caac04e7d9861e0ec3638662d52f9d3ae";
const C = "coordinator.ts";

const TAKEOVER_MALFORMED = "    if (named === null) {\n      return err(this.#refusal(\"malformed_value\", `takeover request is not acceptable";
const REPORT_ANSWER = "    const answer = ok({ activationId: named.activationId, writerEpoch: currentEpoch, recoveryHolds: holdsOf(commit), changed: true });";
const OUTCOME_INDEX = "    record.nextAcceptancePosition = acceptancePosition + 1;\n    for (let index = 0; index < toAcknowledge.length;";
const OUTCOME_RECEIPT = "    mapSet(record.acceptedOutcomes, activationId, stored);\n    appendOwn(record.receipts, receipt);\n";
const RECOVER_UNSEEN = "  recoverExecution(caller: AuthenticatedCaller, executionId: string, request: RecoveryRequest): Result<RecoveryDecision, RefusalRecord> {\n    const record = this.#visible(caller, executionId);\n    if (record === null) return err(this.#refusal(\"unknown_destination\", UNKNOWN_DESTINATION_REASON, null));";
const TAKEOVER_ENDED = [
  "    if (isTerminal(record.state)) {",
  "      return err(",
  "        this.#refusal(",
  "          \"terminal_destination\",",
  "          `Execution ${diagnosticIdentity(record.executionId)} ended as ${record.state}; there is no exchange to take over`,",
  "          record,",
  "        ),",
  "      );",
  "    }",
].join("\n");

// [id, edits, this tree's filter, reviewed H's filter, the comparison that alone rejects it (or null)]
const mutants = [
  [
    "M1 a contained takeover refusal also revokes the setup attempt's grant (ORACLE-01 item 1)",
    [[C, TAKEOVER_MALFORMED, `    if (named === null) {\n      if (record.activation !== null) record.activation.submission = mintSubmission(record.executionId, "revoked", 0);\n      return err(this.#refusal("malformed_value", \`takeover request is not acceptable`]],
    "takeover: accepted",
    "takeover: accepted",
    "setupGrant",
  ],
  [
    "M2 a report whose diagnostic could not be read answers with no holds (ORACLE-01 item 2)",
    [[C, REPORT_ANSWER, REPORT_ANSWER.replace("recoveryHolds: holdsOf(commit)", "recoveryHolds: diagnosticSeen.threw ? [] : holdsOf(commit)")]],
    "=report: enter a protocol hold",
    "report: enter a protocol hold",
    "returned",
  ],
  [
    "M3 Outcome acceptance appends its receipt out of the declared apply order (ORACLE-01 item 3)",
    [[C, OUTCOME_INDEX, OUTCOME_INDEX.replace("\n    for", "\n    appendOwn(record.receipts, receipt);\n    for")], [C, OUTCOME_RECEIPT, "    mapSet(record.acceptedOutcomes, activationId, stored);\n"]],
    "=outcome: continue",
    "outcome: continue",
    null,
  ],
  [
    "M4 a hidden caller's recovery refusal consumes the Execution's refusal position (SCOPE-01)",
    [[C, RECOVER_UNSEEN, RECOVER_UNSEEN.replace(
      "    if (record === null) return err(this.#refusal(\"unknown_destination\", UNKNOWN_DESTINATION_REASON, null));",
      "    if (record === null) {\n      const unseen = mapGet(this.#executions, executionId);\n      if (unseen !== undefined) unseen.nextRefusalPosition += 1;\n      return err(this.#refusal(\"unknown_destination\", UNKNOWN_DESTINATION_REASON, null));\n    }",
    )]],
    "recover: refused, Execution hidden from the caller",
    "recover:",
    null,
  ],
  [
    "M5 the post-callback terminal exit advances the refusal index before its record exists (SCOPE-01)",
    [[C, TAKEOVER_ENDED, [
      "    if (isTerminal(record.state)) {",
      "      const position = record.nextRefusalPosition;",
      "      record.nextRefusalPosition = position + 1;",
      "      const refusal = mintRefusal(\"terminal_destination\", `Execution ${diagnosticIdentity(record.executionId)} ended as ${record.state}; there is no exchange to take over`, position, record.executionId);",
      "      appendOwn(record.refusals, refusal);",
      "      return err(refusal);",
      "    }",
    ].join("\n")]],
    "takeover: refused, the safety callback ended the Execution",
    "takeover:",
    "nextRefusal",
  ],
];

const snapshot = mkdtempSync(join(tmpdir(), "k12c1-r9-sweeps-"));
cpSync(join(root, "packages/kernel"), join(snapshot, "packages/kernel"), { recursive: true });
for (const name of ["package.json", "tsconfig.json"]) cpSync(join(root, name), join(snapshot, name));
const reviewedChild = execFileSync("git", ["show", `${REVIEWED_H}:packages/kernel/tests/sweep/fault-child.ts`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
writeFileSync(join(snapshot, "packages/kernel/tests/sweep/fault-child-h.ts"), reviewedChild);
console.log(`ENV node=${process.version} platform=${process.platform} arch=${process.arch} mutants=${mutants.length} reviewed-H=${REVIEWED_H}`);

const node = (cwd, args, timeout = 1_800_000) => {
  const run = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout, maxBuffer: 256 * 1024 * 1024 });
  return { status: run.status, signal: run.signal, output: `${run.stdout ?? ""}${run.stderr ?? ""}`, stdout: run.stdout ?? "" };
};
const faultSweep = (cwd, child, filter) => {
  const run = node(cwd, ["--experimental-strip-types", "--no-warnings", `packages/kernel/tests/sweep/${child}`, "--scenarios", filter]);
  try {
    const report = JSON.parse(run.stdout);
    const first = report.results.flatMap((result) => result.violations.map((violation) => `${result.name}: ${violation}`))[0] ?? "";
    return { status: run.status, scenarios: report.scenarios, runs: report.runs, violations: report.violations, first };
  } catch {
    return { status: run.status, scenarios: -1, runs: -1, violations: -1, first: run.output.slice(-600) };
  }
};
const kernelSuite = (cwd) => {
  const files = readdirSync(join(cwd, "packages/kernel/tests")).filter((name) => name.endsWith(".test.ts") && !/^(fault-sweep|fault-oracle|poison-catalog)\.test\.ts$/.test(name)).sort();
  const run = node(cwd, ["--test", "--experimental-strip-types", ...files.map((name) => `packages/kernel/tests/${name}`)]);
  const count = (label) => Number(new RegExp(`^ℹ ${label} (\\d+)`, "m").exec(run.output)?.[1]);
  return { status: run.status, tests: count("tests"), fail: count("fail") };
};
const disabling = (check) => (dir) => {
  const path = join(dir, "packages/kernel/tests/sweep/fault-oracle.ts");
  const source = readFileSync(path, "utf8");
  const table = source.indexOf("export const CHECKS = {");
  assert.ok(table !== -1, "the CHECKS table");
  const pattern = new RegExp(`^  ${check}: .*,$`, "m");
  const line = pattern.exec(source.slice(table));
  assert.ok(line !== null, `CHECKS.${check} is one line`);
  // A one-line entry ends with "," at depth 0; replacing the whole line keeps the table well formed.
  const at = table + line.index;
  writeFileSync(path, `${source.slice(0, at)}  ${check}: () => true,${source.slice(at + line[0].length)}`);
};

const withCopy = (edits, work, prepare = () => {}) => {
  const dir = mkdtempSync(join(tmpdir(), "k12c1-r9-mutant-"));
  try {
    cpSync(join(snapshot, "packages/kernel"), join(dir, "packages/kernel"), { recursive: true });
    for (const name of ["package.json", "tsconfig.json"]) cpSync(join(snapshot, name), join(dir, name));
    symlinkSync(resolve(root, "node_modules"), join(dir, "node_modules"), "dir");
    for (const [file, find, replacement] of edits) {
      const path = join(dir, "packages/kernel/src", file);
      const source = readFileSync(path, "utf8");
      assert.equal(source.split(find).length, 2, `unique anchor in ${file}: ${find.slice(0, 70)}`);
      writeFileSync(path, source.replace(find, () => replacement));
    }
    prepare(dir);
    return work(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

let failures = 0;
try {
  withCopy([], (dir) => {
    for (const [, , filter, hFilter] of mutants) {
      const clean = faultSweep(dir, "fault-child.ts", filter);
      const cleanH = faultSweep(dir, "fault-child-h.ts", hFilter);
      const ok = clean.status === 0 && clean.violations === 0 && cleanH.status === 0 && cleanH.violations === 0;
      if (!ok) failures += 1;
      console.log(`${ok ? "CONTROL" : "CONTROL FAILED"} clean tree: this sweep "${filter}" ${clean.scenarios} scenarios/${clean.runs} runs/${clean.violations} violations; reviewed H's sweep "${hFilter}" ${cleanH.scenarios}/${cleanH.runs}/${cleanH.violations}${ok ? "" : ` first: ${clean.first || cleanH.first}`}`);
    }
  });

  for (const [id, edits, filter, hFilter, check] of mutants) {
    withCopy(edits, (dir) => {
      const current = faultSweep(dir, "fault-child.ts", filter);
      const reviewed = faultSweep(dir, "fault-child-h.ts", hFilter);
      const suite = kernelSuite(dir);
      const rejected = current.status === 1 && current.violations > 0;
      const acceptedByH = reviewed.status === 0 && reviewed.violations === 0;
      if (!rejected || !acceptedByH) failures += 1;
      console.log(`${rejected ? "REJECTED" : "SURVIVED"} ${id}`);
      console.log(`  this sweep "${filter}": exit=${current.status} runs=${current.runs} violations=${current.violations}`);
      if (rejected) console.log(`  first violation: ${current.first.slice(0, 400)}`);
      console.log(`  ${acceptedByH ? "ACCEPTED" : "NOT ACCEPTED"} by reviewed H's sweep "${hFilter}": exit=${reviewed.status} scenarios=${reviewed.scenarios} runs=${reviewed.runs} violations=${reviewed.violations}`);
      console.log(`  Kernel suite (context only): exit=${suite.status} tests=${suite.tests} fail=${suite.fail}`);
    });
    if (check !== null) {
      withCopy(edits, (dir) => {
        const without = faultSweep(dir, "fault-child.ts", filter);
        const accepted = without.status === 0 && without.violations === 0;
        if (!accepted) failures += 1;
        console.log(`  ${accepted ? "ACCEPTED" : "STILL REJECTED"} by this sweep with CHECKS.${check} disabled: exit=${without.status} violations=${without.violations}${accepted ? "" : ` first: ${without.first.slice(0, 300)}`}`);
      }, disabling(check));
    }
  }
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
console.log(failures === 0 ? "ALL ROUND-9 PRODUCTION CONTROLS REJECTED HERE AND ACCEPTED BY REVIEWED H'S SWEEP; CLEAN CONTROLS PASSED" : `${failures} clean-control failures or unexpected verdicts`);
process.exitCode = failures === 0 ? 0 : 1;
