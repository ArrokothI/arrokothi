/**
 * The DEC-9 fault-injection sweep, maintained subset (contract revision 9, amendment 03).
 *
 * `sweep/fault-child.ts` replaces the built-in methods the zone captures at load with counting
 * wrappers, then throws at every intercepted operation of a scenario's target call in turn and checks
 * that the Execution is always left in a state a complete decision explains: unchanged, one recorded
 * refusal, or the whole accepted decision. See that file for the mechanism, the oracle and its scope.
 *
 * This file runs the scenarios whose calls make few operations: every exit of `reportProtocolFailure`
 * and `requestTakeover`, including review 11's seed (an exception immediately before the takeover's
 * new Activation is built; clean code leaves the view unchanged and the next input at position 3),
 * and the refusal exits that stop before value capture. The complete sweep, which also covers every
 * exit of `recoverExecution` and Outcome acceptance (about 43,000 injected runs), is
 * `npm run test:kernel-sweeps`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TESTS = dirname(fileURLToPath(import.meta.url));
const CHILD = resolve(TESTS, "sweep/fault-child.ts");

interface Report {
  intercepted: string[];
  scenarios: number;
  runs: number;
  violations: number;
  results: { name: string; operations: number; classes: Record<string, number>; violations: string[]; seed?: { operation: number; threw: boolean; viewUnchanged: boolean; nextAcceptance: number | string } }[];
}

const SUBSET = ["report:", "takeover:", "recover: refused without control power", "recover: refused malformed request", "outcome: refused malformed content"];

test("fault injection at every intercepted operation leaves only states a complete decision explains", () => {
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", CHILD, "--scenarios", SUBSET.join("|")], {
    cwd: resolve(TESTS, "../../.."),
    encoding: "utf8",
    timeout: 300_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(run.error, undefined);
  const report = JSON.parse(run.stdout) as Report;
  const failures = report.results.flatMap((result) => result.violations.map((violation) => `${result.name}: ${violation}`));
  assert.deepEqual(failures, [], "no fault leaves an unexplained state");
  assert.equal(run.status, 0, run.stderr);
  assert.equal(report.scenarios, 18, "the maintained subset: 7 report, 8 takeover and 3 early refusal scenarios");
  for (const operation of ["Object.freeze", "Object.defineProperty", "Object.getOwnPropertyDescriptor", "Reflect.apply", "Map.prototype.get", "Map.prototype.set"]) {
    assert.ok(report.intercepted.includes(operation), `${operation} is intercepted`);
  }
  for (const result of report.results) {
    assert.ok(result.operations > 0, `${result.name} made intercepted operations`);
    assert.equal(result.classes.completed, 1, `${result.name}: the run with no fault completes`);
  }
  const clearing = report.results.find((result) => result.name === "takeover: accepted, clearing a protocol hold");
  assert.ok((clearing?.classes["threw inside the declared takeover apply window: receipt appended, clearing record not"] ?? 0) > 0, "the declared two-append window is exercised and reported");
});

test("review 11's fault probe: an exception before the new Activation is built changes neither the view nor the next receipt", () => {
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", CHILD, "--scenarios", "review 11's seed"], {
    cwd: resolve(TESTS, "../../.."),
    encoding: "utf8",
    timeout: 120_000,
  });
  const report = JSON.parse(run.stdout) as Report;
  assert.equal(run.status, 0, JSON.stringify(report.results[0]?.violations));
  const seed = report.results[0]?.seed;
  assert.ok(seed !== undefined, "the Activation construction was intercepted");
  assert.equal(seed.threw, true);
  assert.equal(seed.viewUnchanged, true, "the whole view equals the view before the call");
  assert.equal(seed.nextAcceptance, 3, "the next accepted input receives position 3, as review 11 recorded for clean code (its mutants: 4)");
});
