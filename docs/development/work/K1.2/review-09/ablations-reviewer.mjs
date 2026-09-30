// K1.2 distinguishing ablations: plausible broken implementations the K1.2 suites must reject.
//
// 012's deterministic-execution method asks for "a plausible broken behavior that the oracle would
// reject". Each entry below replaces one exact span of `packages/kernel/src` with a wrong but
// plausible alternative, in a temporary copy of the package, and runs the kernel suite there. An
// ablation passes this script only if at least one test fails against it; a span that is not found
// exactly once is reported as not applicable, so a stale ablation cannot pass silently.
//
// Run from the repository root:  node docs/development/work/K1.2/ablations.mjs
// The working tree is never modified; the copy lives under the OS temporary directory.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());

const ablations = [
 {
  "id": "R1 content validated before submission authority (grant check moved after content)",
  "file": "coordinator.ts",
  "find": "    if (submission !== intent.submission) {\n      return err(\n        this.#refusal(\n          \"unauthorized_submission\",\n          `Outcome for Activation ${activationId} presents no submission authority for the current attempt at writer epoch ${currentEpoch}; an inspected Activation does not authorize answering it`,\n          record,\n        ),\n      );\n    }\n",
  "replace": "",
  "suffix": {
   "find": "    return ok(this.#accept(record, intent, capture.outcome, caller));",
   "replace": "    if (submission !== intent.submission) {\n      return err(\n        this.#refusal(\n          \"unauthorized_submission\",\n          `Outcome for Activation ${activationId} presents no submission authority for the current attempt at writer epoch ${currentEpoch}; an inspected Activation does not authorize answering it`,\n          record,\n        ),\n      );\n    }\n    return ok(this.#accept(record, intent, capture.outcome, caller));"
  }
 },
 {
  "id": "R2 submission authority checked before exchange currency (stale attempt told unauthorized)",
  "file": "coordinator.ts",
  "find": "    if (submission !== intent.submission) {\n      return err(\n        this.#refusal(\n          \"unauthorized_submission\",\n          `Outcome for Activation ${activationId} presents no submission authority for the current attempt at writer epoch ${currentEpoch}; an inspected Activation does not authorize answering it`,\n          record,\n        ),\n      );\n    }\n",
  "replace": "",
  "prefix": {
   "find": "    const currentEpoch = intent.activation.writerEpoch;\n    if (claim.writerEpoch !== currentEpoch) {",
   "replace": "    const currentEpoch = intent.activation.writerEpoch;\n    if (submission !== intent.submission) {\n      return err(\n        this.#refusal(\n          \"unauthorized_submission\",\n          `Outcome for Activation ${activationId} presents no submission authority for the current attempt at writer epoch ${currentEpoch}; an inspected Activation does not authorize answering it`,\n          record,\n        ),\n      );\n    }\n    if (claim.writerEpoch !== currentEpoch) {"
  }
 },
 {
  "id": "R3 exact replay requires the current grant",
  "file": "coordinator.ts",
  "find": "      if (capture.outcome !== null && capture.outcome.identity === already.identity) {",
  "replace": "      if (capture.outcome !== null && capture.outcome.identity === already.identity && submission === record.activation?.submission) {"
 },
 {
  "id": "R4 grant compared by fields, not reference",
  "file": "coordinator.ts",
  "find": "    if (submission !== intent.submission) {",
  "replace": "    if (submission === undefined || submission === null || submission.activationId !== intent.submission.activationId || submission.writerEpoch !== intent.submission.writerEpoch || submission.executionId !== intent.submission.executionId) {"
 },
 {
  "id": "R5 takeover keeps the superseded attempt's grant",
  "file": "coordinator.ts",
  "find": "    exchange.submission = mintSubmission(record.executionId, named.activationId, writerEpoch);",
  "replace": ""
 },
 {
  "id": "R6 base-revision currency not checked",
  "file": "coordinator.ts",
  "find": "    if (claim.baseProgressRevision !== intent.activation.baseProgressRevision) {",
  "replace": "    if (false) {"
 },
 {
  "id": "R7 accepted-Outcome identity ignores the writer epoch (changed-epoch resubmission replays)",
  "file": "outcome.ts",
  "find": "    `${claim.writerEpoch}`,\n    `${claim.baseProgressRevision}`,",
  "replace": "    \"epoch\",\n    `${claim.baseProgressRevision}`,"
 },
 {
  "id": "R8 a code hold fences Outcome acceptance",
  "file": "coordinator.ts",
  "find": "    if (capture.overCapacity !== null) {",
  "replace": "    if (intent.codeHold !== null) return err(this.#refusal(\"recovery_held\", \"held\", record));\n    if (capture.overCapacity !== null) {"
 },
 {
  "id": "R9 unauthorized_submission refusal not recorded on the Execution",
  "file": "coordinator.ts",
  "find": "    if (submission !== intent.submission) {\n      return err(\n        this.#refusal(",
  "replace": "    if (submission !== intent.submission) {\n      return err(\n        mintRefusalLike(",
  "prefix": {
   "find": "const DEFAULT_MAILBOX_CAPACITY = 1_024;",
   "replace": "const mintRefusalLike = (c: RefusalClassification, r: string, rec: ExecutionRecord) => mintRefusal(c, r, 0, rec.executionId);\nconst DEFAULT_MAILBOX_CAPACITY = 1_024;"
  }
 },
 {
  "id": "R10 B-5 terminal disposition also given at continue",
  "file": "coordinator.ts",
  "find": "      } else if (nextState !== \"READY\") {",
  "replace": "      } else if (true) {"
 },
 {
  "id": "R11 protocol-failure report accepted for a superseded epoch",
  "file": "coordinator.ts",
  "find": "    if (named.writerEpoch !== currentEpoch) {\n      return err(\n        this.#refusal(\n          \"stale_exchange\",\n          `writer epoch ${named.writerEpoch} is not the current epoch ${currentEpoch} of Activation ${named.activationId}; a superseded attempt cannot hold the exchange`,",
  "replace": "    if (false) {\n      return err(\n        this.#refusal(\n          \"stale_exchange\",\n          `writer epoch ${named.writerEpoch} is not the current epoch ${currentEpoch} of Activation ${named.activationId}; a superseded attempt cannot hold the exchange`,"
 },
 {
  "id": "R12 dispatch mints the grant only on first Execution dispatch (next exchange reuses previous grant object)",
  "file": "coordinator.ts",
  "find": "      submission: mintSubmission(record.executionId, activationId, 1),",
  "replace": "      submission: (record as any).lastGrant ?? ((record as any).lastGrant = mintSubmission(record.executionId, activationId, 1)),"
 }
];

const applyOnce = (text, find, replace, label) => {
  const first = text.indexOf(find);
  if (first < 0 || text.indexOf(find, first + 1) >= 0) return { text, ok: false, why: `${label} span not found exactly once` };
  return { text: text.slice(0, first) + replace + text.slice(first + find.length), ok: true };
};

/** Runs the whole kernel suite in `work` and reads its counts. `--test` expands the glob itself. */
const runSuite = (work) => {
  // `--test-reporter=spec` is forced so piped runs report the same `ℹ`/`✖` lines on every
  // platform (K12-R2-PROC-01): without it some Node versions emit TAP when piped, which this
  // parser does not read.
  const run = spawnSync(process.execPath, ["--test", "--test-reporter=spec", "--experimental-strip-types", "--no-warnings", "packages/kernel/tests/*.test.ts"], {
    cwd: work,
    encoding: "utf8",
    timeout: 600_000,
  });
  const output = `${run.stdout}\n${run.stderr}`;
  const read = (label) => {
    const match = new RegExp(`ℹ ${label} (\\d+)`).exec(output);
    return match === null ? Number.NaN : Number(match[1]);
  };
  const failing = [...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]);
  return { tests: read("tests"), pass: read("pass"), fail: read("fail"), failing: [...new Set(failing)] };
};

/** A temporary copy of the package, resolving `canonicalize` through the repository's node_modules. */
const copyPackage = () => {
  const work = mkdtempSync(join(tmpdir(), "k12-ablation-"));
  cpSync(join(root, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
  symlinkSync(join(root, "node_modules"), join(work, "node_modules"), "dir");
  return work;
};

// Control: the unablated copy must run the whole suite and pass it, or no ablation result means anything.
{
  const work = copyPackage();
  try {
    const control = runSuite(work);
    console.log(`CONTROL        unablated copy: tests ${control.tests}, pass ${control.pass}, fail ${control.fail}`);
    if (!(control.tests > 0 && control.fail === 0 && control.pass === control.tests)) {
      console.log("The control did not run cleanly; no ablation verdict can be trusted.");
      process.exit(2);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const results = [];
for (const ablation of ablations) {
  const work = copyPackage();
  try {
    const path = join(work, "packages/kernel/src", ablation.file);
    let text = readFileSync(path, "utf8");
    let applied = applyOnce(text, ablation.find, ablation.replace, "main");
    for (const extra of [ablation.prefix, ablation.suffix]) {
      if (applied.ok && extra) applied = applyOnce(applied.text, extra.find, extra.replace, "extra");
    }
    if (!applied.ok) {
      results.push({ id: ablation.id, verdict: "NOT APPLICABLE", detail: applied.why });
      continue;
    }
    writeFileSync(path, applied.text);
    const suite = runSuite(work);
    // REJECTED needs a suite that actually ran: tests counted, most of them passing, some failing.
    const ran = suite.tests > 0 && suite.pass > 0;
    const verdict = !ran ? "NO RESULT" : suite.fail > 0 ? "REJECTED" : "SURVIVED";
    results.push({
      id: ablation.id,
      verdict,
      detail: `tests ${suite.tests}, pass ${suite.pass}, fail ${suite.fail}; failing: ${suite.failing.slice(0, 4).join(" | ")}`,
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

let survived = 0;
for (const result of results) {
  if (result.verdict !== "REJECTED") survived += 1;
  console.log(`${result.verdict.padEnd(14)} ${result.id}\n               ${result.detail}`);
}
console.log(`\n${results.length - survived}/${results.length} ablations rejected by the kernel suite.`);
process.exitCode = survived === 0 ? 0 : 1;
