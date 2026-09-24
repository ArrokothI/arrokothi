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
    id: "A1 acknowledge every queued Event, cursor-style",
    file: "coordinator.ts",
    find: "      if (inBatch(entry.eventId)) {",
    replace: "      if (true) {",
  },
  {
    id: "A2 replay only while no exchange is open and the Execution is live (validation effectively first)",
    file: "coordinator.ts",
    find: "    const already = mapGet(record.acceptedOutcomes, activationId);",
    replace: "    const already = record.activation === null && !isTerminal(record.state) ? mapGet(record.acceptedOutcomes, activationId) : undefined;",
  },
  {
    id: "A3 no writer-epoch fence",
    file: "coordinator.ts",
    find: "    if (claim.writerEpoch !== currentEpoch) {",
    replace: "    if (false) {",
  },
  {
    id: "A4 takeover mints a new Activation ID",
    file: "coordinator.ts",
    find: "    const activation: Activation = PrimordialObjectFreeze({ ...exchange.activation, writerEpoch });",
    replace: "    const activation: Activation = PrimordialObjectFreeze({ ...exchange.activation, writerEpoch, activationId: `${exchange.activation.activationId}-takeover` });",
  },
  {
    id: "A5 takeover leaves the epoch where it was",
    file: "coordinator.ts",
    find: "    const writerEpoch = currentEpoch + 1;",
    replace: "    const writerEpoch = currentEpoch;",
  },
  {
    id: "A6 Effects silently stripped instead of refusing the Outcome",
    file: "outcome.ts",
    find: "  if (length !== null && length > 0) {",
    replace: "  if (false) {",
  },
  {
    id: "A7 no B-5 terminal disposition at complete/fail",
    file: "coordinator.ts",
    find: "      } else if (nextState !== \"READY\") {",
    replace: "      } else if (false) {",
  },
  {
    id: "A8 terminal disposition recorded as acknowledgment",
    file: "coordinator.ts",
    find: "    for (let index = 0; index < toEnd.length; index += 1) (readAt(toEnd, index) as MailboxEntry).disposition = ending;",
    replace: "    for (let index = 0; index < toEnd.length; index += 1) (readAt(toEnd, index) as MailboxEntry).disposition = acknowledgment;",
  },
  {
    id: "A9 redelivery ignores recovery holds",
    file: "coordinator.ts",
    find: "    const hold = intent.codeHold ?? intent.protocolFailureHold;",
    replace: "    const hold = null as RecoveryHoldView | null;",
  },
  {
    id: "A10 takeover allowed while pinned code is unavailable",
    file: "coordinator.ts",
    find: "    if (exchange.codeHold !== null) {\n      return err(\n        this.#refusal(\n          \"recovery_held\",",
    replace: "    if (false) {\n      return err(\n        this.#refusal(\n          \"recovery_held\",",
  },
  {
    id: "A11 unknown envelope fields ignored",
    file: "outcome.ts",
    find: "  let reported = 0;",
    replace: "  let reported = 0;\n  if (reported === 0) return;",
  },
  {
    id: "A12 Emission identity from a coordinator-wide counter",
    file: "coordinator.ts",
    find: "      const emissionId = `emission-${packIdentity([record.executionId, activationId, emission.emissionKey])}`;",
    replace: "      globalEmissionCounter += 1;\n      const emissionId = `emission-${globalEmissionCounter}`;",
    prefix: { find: "const DEFAULT_MAILBOX_CAPACITY = 1_024;", replace: "let globalEmissionCounter = 0;\nconst DEFAULT_MAILBOX_CAPACITY = 1_024;" },
  },
  {
    id: "A13 progress observed twice (validation and retention read separately)",
    file: "outcome.ts",
    find: "  const progress = progressField.ok ? acceptRoot(progressField.observed, \"progress\", issues) : null;",
    replace:
      "  observeField(envelope, \"progress\", \"progress\", issues);\n  const progress = progressField.ok ? acceptRoot(progressField.observed, \"progress\", issues) : null;",
  },
  {
    id: "A14 Emission capacity checked only after every element is read",
    file: "outcome.ts",
    find: "  if (length > limit) return { emissions, overCapacity: { count: length, limit } };",
    replace: "",
    suffix: {
      find: "    appendOwn(emissions, PrimordialObjectFreeze({ emissionKey, value }));\n  }\n  return { emissions, overCapacity: null };",
      replace:
        "    appendOwn(emissions, PrimordialObjectFreeze({ emissionKey, value }));\n  }\n  if (length > limit) return { emissions, overCapacity: { count: length, limit } };\n  return { emissions, overCapacity: null };",
    },
  },
  {
    id: "A15 await accepted as continue",
    file: "outcome.ts",
    find: "  if (step === \"continue\") {",
    replace: "  if (step === \"continue\" || step === \"await\") {",
  },
  {
    id: "A16 an accepted Outcome keeps the exchange open (a second writer can commit)",
    file: "coordinator.ts",
    find: "    record.activation = null;\n    record.state = nextState;",
    replace: "    record.state = nextState;",
  },
];

const applyOnce = (text, find, replace, label) => {
  const first = text.indexOf(find);
  if (first < 0 || text.indexOf(find, first + 1) >= 0) return { text, ok: false, why: `${label} span not found exactly once` };
  return { text: text.slice(0, first) + replace + text.slice(first + find.length), ok: true };
};

/** Runs the whole kernel suite in `work` and reads its counts. `--test` expands the glob itself. */
const runSuite = (work) => {
  const run = spawnSync(process.execPath, ["--test", "--experimental-strip-types", "--no-warnings", "packages/kernel/tests/*.test.ts"], {
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
