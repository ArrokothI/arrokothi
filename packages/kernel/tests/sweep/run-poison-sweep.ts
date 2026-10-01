/**
 * Whole-suite poisoned-prototype sweep for correction DEC-8 (contract revision 9, amendment 03).
 *
 * Runs the maintained Kernel test files four times, with `preload.ts` imported into every
 * test-file process: once unpoisoned (`off`), then with the poison in `count`, `throw` and
 * `reenter` mode. It then requires:
 *
 * - every run passes the same tests with no failure, cancellation, skip or todo;
 * - no accessor fired from a zone frame in any poisoned run;
 * - every boundary call returned or threw exactly what it did in the unpoisoned run, call by call
 *   and file by file (the same number of calls, the same digests in the same order);
 * - the poison was live: at every outermost window, a probe read on a fresh object reached it.
 *
 * Scope: the paths the maintained Kernel scenarios reach, through the boundary calls `preload.ts`
 * windows. The name set is `zone-names.ts`'s, minus the six property-descriptor fields, which the
 * catalog sweep (`poison-catalog.test.ts`) poisons instead (see the contract, DEC-8 evidence).
 *
 * Usage, from the repository root (or the root of a disposable copy):
 *   node --experimental-strip-types packages/kernel/tests/sweep/run-poison-sweep.ts [--modes count,throw] [--files a.test.ts,b.test.ts] [--expect-firings] [--out dir]
 * `--expect-firings` inverts the verdict for negative controls: it succeeds only when a zone firing
 * is reported.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DESCRIPTOR_FIELDS, encodeName, zoneMemberNames } from "./zone-names.ts";
import { HOLDERS } from "./poison.ts";

const SWEEP_ROOT = dirname(fileURLToPath(import.meta.url));
const TESTS_ROOT = resolve(SWEEP_ROOT, "..");
const ZONE_ROOT = resolve(TESTS_ROOT, "../src");
const REPOSITORY_ROOT = resolve(TESTS_ROOT, "../../..");

/** Test files that are sweeps themselves, and so are not scenarios for this one. */
export const EXCLUDED_FILES = new Set(["poison-catalog.test.ts", "fault-sweep.test.ts"]);

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const modes = (option("--modes") ?? "off,count,throw,reenter").split(",") as ("off" | "count" | "throw" | "reenter")[];
const expectFirings = process.argv.includes("--expect-firings");
const out = resolve(option("--out") ?? mkdtempSync(join(tmpdir(), "kernel-poison-sweep-")));
const selected = option("--files")?.split(",");
const files = readdirSync(TESTS_ROOT)
  .filter((name) => name.endsWith(".test.ts") && !EXCLUDED_FILES.has(name))
  .filter((name) => selected === undefined || selected.includes(name))
  .sort();

const names = zoneMemberNames(ZONE_ROOT).filter((name) => typeof name === "symbol" || !DESCRIPTOR_FIELDS.includes(name));
mkdirSync(out, { recursive: true });
const namesFile = join(out, "names.json");
writeFileSync(namesFile, `${JSON.stringify(names.map(encodeName))}\n`);

interface Report {
  readonly file: string;
  readonly mode: string;
  readonly names: number;
  readonly counts: { windows: number; installed: number; skipped: number; callerFirings: number; handlerFirings: number; reentries: number; liveProbes: number };
  readonly zoneFirings: { holder: string; name: string; operation: string; site: string; window: string }[];
  readonly calls: number;
  readonly trace: string[];
}

const preload = pathToFileURL(join(SWEEP_ROOT, "preload.ts")).href;
console.log(`ENV node=${process.version} platform=${process.platform} arch=${process.arch}`);
console.log(`SCOPE ${files.length} Kernel test files; ${names.length} poisoned names on ${HOLDERS.map(([, name]) => name).join(", ")}; modes ${modes.join(",")}`);
console.log(`OUT ${out}`);

const reports = new Map<string, Map<string, Report>>();
const summaries = new Map<string, Record<string, number>>();
const problems: string[] = [];
for (const mode of modes) {
  const dir = join(out, mode);
  mkdirSync(dir, { recursive: true });
  const args = ["--experimental-strip-types", "--no-warnings", `--import=${preload}`, "--test", "--test-reporter=spec", ...files.map((name) => join("packages/kernel/tests", name))];
  const started = Date.now();
  const run = spawnSync(process.execPath, args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    timeout: 1_800_000,
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, KERNEL_POISON_MODE: mode, KERNEL_POISON_OUT: dir, KERNEL_POISON_NAMES: namesFile },
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  writeFileSync(join(out, `${mode}.txt`), output);
  const count = (name: string): number => Number(new RegExp(`^ℹ ${name} (\\d+)`, "m").exec(output)?.[1]);
  const summary = { exit: run.status ?? -1, tests: count("tests"), pass: count("pass"), fail: count("fail"), cancelled: count("cancelled"), skipped: count("skipped"), todo: count("todo"), seconds: Math.round((Date.now() - started) / 1000) };
  summaries.set(mode, summary);
  console.log(`RUN ${mode}: ${JSON.stringify(summary)}`);
  if (run.error !== undefined || run.signal !== null) problems.push(`${mode}: runner error ${run.error?.message ?? run.signal}`);
  if (summary.exit !== 0 || summary.fail !== 0 || summary.cancelled !== 0 || summary.skipped !== 0 || summary.todo !== 0 || !(summary.pass > 0)) {
    const failed = [...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]).slice(0, 10);
    problems.push(`${mode}: the suite did not pass cleanly (${JSON.stringify(summary)}; first failures: ${failed.join(" | ")})`);
  }
  const byFile = new Map<string, Report>();
  for (const name of files) {
    try {
      byFile.set(name, JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")) as Report);
    } catch {
      problems.push(`${mode}: no report from ${name}`);
    }
  }
  reports.set(mode, byFile);
}

const baseline = reports.get("off");
let windows = 0;
let calls = 0;
const firings: Report["zoneFirings"] = [];
for (const mode of modes) {
  const byFile = reports.get(mode) as Map<string, Report>;
  const totals = { windows: 0, calls: 0, liveProbes: 0, callerFirings: 0, handlerFirings: 0, reentries: 0, zoneFirings: 0, skippedSlots: 0 };
  for (const [name, report] of byFile) {
    totals.windows += report.counts.windows;
    totals.calls += report.calls;
    totals.liveProbes += report.counts.liveProbes;
    totals.callerFirings += report.counts.callerFirings;
    totals.handlerFirings += report.counts.handlerFirings;
    totals.reentries += report.counts.reentries;
    totals.zoneFirings += report.zoneFirings.length;
    totals.skippedSlots += report.counts.skipped;
    for (const firing of report.zoneFirings) firings.push(firing);
    if (mode !== "off" && baseline !== undefined) {
      const reference = baseline.get(name);
      if (reference === undefined) continue;
      if (reference.trace.length !== report.trace.length) {
        problems.push(`${mode}: ${name} made ${report.trace.length} boundary calls, the unpoisoned run ${reference.trace.length}`);
      }
      const length = Math.min(reference.trace.length, report.trace.length);
      for (let index = 0; index < length; index += 1) {
        if (reference.trace[index] !== report.trace[index]) {
          problems.push(`${mode}: ${name} call ${index + 1} differs: ${report.trace[index]} (unpoisoned: ${reference.trace[index]})`);
          break;
        }
      }
    }
  }
  if (mode === "off") {
    windows = totals.windows;
    calls = totals.calls;
  }
  console.log(`MODE ${mode}: ${JSON.stringify(totals)}`);
  if (mode !== "off" && totals.liveProbes !== totals.windows) problems.push(`${mode}: ${totals.liveProbes} liveness probes for ${totals.windows} windows`);
}
for (const firing of firings.slice(0, 40)) console.log(`ZONE FIRING ${firing.holder}.${firing.name} (${firing.operation}) at ${firing.site} in ${firing.window}`);
console.log(`BOUNDARY ${windows} outermost windows; ${calls} traced calls per run`);

if (expectFirings) {
  const verdict = firings.length > 0;
  console.log(verdict ? `NEGATIVE CONTROL DETECTED: ${firings.length} zone firings` : "NEGATIVE CONTROL MISSED: no zone firing");
  process.exitCode = verdict ? 0 : 1;
} else {
  if (firings.length > 0) problems.push(`${firings.length} zone firings`);
  for (const problem of problems.slice(0, 60)) console.log(`PROBLEM ${problem}`);
  console.log(problems.length === 0 ? "POISON SWEEP PASSED" : `POISON SWEEP FAILED: ${problems.length} problems`);
  process.exitCode = problems.length === 0 ? 0 : 1;
}
