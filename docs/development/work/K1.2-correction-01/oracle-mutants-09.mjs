// Round 9 (contract revision 10): mutants of the DEC-9 fault sweep's own oracle (K12C1-R12-ORACLE-01).
//
// packages/kernel/tests/sweep/fault-oracle.ts makes every comparison through one table, `CHECKS`. This
// runner finds the table's entries with the TypeScript parser, so a new comparison gets a mutant
// without editing this file. For each entry it copies packages/kernel into a disposable directory
// (node_modules linked back), replaces that entry's function with `() => true` — the comparison
// always passes — and runs the oracle's negative controls, packages/kernel/tests/fault-oracle.test.ts.
//
// A mutant is KILLED when at least one negative control fails, and SURVIVES otherwise. A survivor is
// acceptable only if it is listed in NOT_NEEDED below with the reason the comparison is not needed;
// any other survivor fails the run. The unmutated copy must pass first (the clean control).
// Run from the repository root: node docs/development/work/K1.2-correction-01/oracle-mutants-09.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const ORACLE = "packages/kernel/tests/sweep/fault-oracle.ts";
const CONTROLS = "packages/kernel/tests/fault-oracle.test.ts";

/** Comparisons whose mutant may survive, with the reason. None is expected. */
const NOT_NEEDED = new Map([]);

const source = readFileSync(join(root, ORACLE), "utf8");
const file = ts.createSourceFile(ORACLE, source, ts.ScriptTarget.Latest, true);
const entries = [];
for (const statement of file.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "CHECKS") continue;
    const table = declaration.initializer;
    assert.ok(table !== undefined && ts.isObjectLiteralExpression(table), "CHECKS is an object literal");
    for (const property of table.properties) {
      assert.ok(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name), "every CHECKS entry is `name: function`");
      entries.push({ name: property.name.text, start: property.initializer.getStart(file), end: property.initializer.getEnd() });
    }
  }
}
assert.ok(entries.length > 0, "CHECKS found");
console.log(`ENV node=${process.version} platform=${process.platform} arch=${process.arch} oracle-comparisons=${entries.length}`);
console.log(`CHECKS: ${entries.map((entry) => entry.name).join(", ")}`);

const snapshot = mkdtempSync(join(tmpdir(), "k12c1-r9-oracle-"));
cpSync(join(root, "packages/kernel"), join(snapshot, "packages/kernel"), { recursive: true });
for (const name of ["package.json", "tsconfig.json"]) cpSync(join(root, name), join(snapshot, name));

const controls = (replacement) => {
  const dir = mkdtempSync(join(tmpdir(), "k12c1-r9-oracle-mutant-"));
  try {
    cpSync(join(snapshot, "packages/kernel"), join(dir, "packages/kernel"), { recursive: true });
    for (const name of ["package.json", "tsconfig.json"]) cpSync(join(snapshot, name), join(dir, name));
    symlinkSync(resolve(root, "node_modules"), join(dir, "node_modules"), "dir");
    if (replacement !== null) writeFileSync(join(dir, ORACLE), replacement);
    const run = spawnSync(process.execPath, ["--test", "--experimental-strip-types", "--test-reporter=spec", CONTROLS], { cwd: dir, encoding: "utf8", timeout: 1_200_000, maxBuffer: 256 * 1024 * 1024 });
    const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    const failed = [...new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]))];
    const count = (label) => Number(new RegExp(`^ℹ ${label} (\\d+)`, "m").exec(output)?.[1]);
    return { status: run.status, signal: run.signal, failed, tests: count("tests"), fail: count("fail") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

let failures = 0;
try {
  const clean = controls(null);
  const cleanOk = clean.status === 0 && clean.fail === 0;
  if (!cleanOk) failures += 1;
  console.log(`${cleanOk ? "CONTROL" : "CONTROL FAILED"} unmutated oracle: exit=${clean.status} tests=${clean.tests} fail=${clean.fail}${cleanOk ? "" : ` ${clean.failed.slice(0, 5).join(" | ")}`}`);
  for (const entry of entries) {
    const mutant = `${source.slice(0, entry.start)}() => true${source.slice(entry.end)}`;
    const result = controls(mutant);
    const killed = result.status !== 0 && result.fail > 0;
    const reason = NOT_NEEDED.get(entry.name);
    const verdict = killed ? "KILLED" : reason === undefined ? "SURVIVED" : "SURVIVED (not needed)";
    if (verdict === "SURVIVED") failures += 1;
    console.log(`${verdict} CHECKS.${entry.name}: exit=${result.status} failing controls=${result.fail} of ${result.tests}`);
    for (const name of result.failed.filter((name) => !/^(every |review 12|a recorded refusal|the reference|the exit)/.test(name)).slice(0, 4)) console.log(`  ✖ ${name}`);
    if (reason !== undefined) console.log(`  not needed: ${reason}`);
  }
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
console.log(failures === 0 ? "EVERY ORACLE COMPARISON IS NEEDED BY A NEGATIVE CONTROL; CLEAN CONTROL PASSED" : `${failures} clean-control failures or surviving comparisons`);
process.exitCode = failures === 0 ? 0 : 1;
