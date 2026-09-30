// R6-EVID-01: preserve the review's Z1–Z16 single-span mutants and run the full Kernel suite.
// Each mutant uses a disposable copy; no candidate or sealed evidence file is mutated.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

const root = process.cwd();
const sealedPath = "docs/development/work/K1.2-correction-01/review-06/mutants.py";
const sealed = readFileSync(join(root, sealedPath), "utf8");
assert.equal(createHash("sha256").update(sealed).digest("hex"), "b2906ec25130ddd22073cf6bd47694f9fb78ef2b96b6698b7b617a5926550a0e");
// These sixteen sealed definitions use string literals shared by Python and JavaScript. Read the
// spans verbatim after checking their source digest; evaluating the list needs no Python runtime.
const mutations = sealed.split("\n").filter(line => /^\s*"Z\d+-.*": \(C,.*\),$/.test(line)).map(line => {
  const separator = line.indexOf(": (");
  const expression = `[${line.slice(0, separator).trim()}, ${line.slice(separator + 3, -2)}]`;
  return runInNewContext(expression, { C: "coordinator.ts" });
});
assert.equal(mutations.length, 16);
assert.deepEqual(mutations.map(([id]) => Number(/^Z(\d+)-/.exec(id)[1])), Array.from({ length: 16 }, (_, i) => i + 1));

const testFiles = readdirSync(join(root, "packages/kernel/tests")).filter(name => name.endsWith(".test.ts")).sort().map(name => `packages/kernel/tests/${name}`);
const args = ["--experimental-strip-types", "--test", "--test-reporter=spec", ...testFiles];
console.log(`SOURCE ${sealedPath} sha256=b2906ec25130ddd22073cf6bd47694f9fb78ef2b96b6698b7b617a5926550a0e`);
console.log(`ENV node=${process.version} platform=${process.platform} arch=${process.arch} files=${testFiles.length}`);
console.log(`COMMAND ${JSON.stringify([process.execPath, ...args])}`);
let controlTests;
let rejected = 0;
// Pin one source/test snapshot for this run even during exploratory use on a working tree.
// Final candidate evidence still requires 006's clean payload C.
const snapshot = mkdtempSync(join(tmpdir(), "k12-r6-coordinate-source-"));
cpSync(join(root, "packages/kernel"), join(snapshot, "packages/kernel"), { recursive: true });
cpSync(join(root, "package.json"), join(snapshot, "package.json"));
try {
for (const mutation of [null, ...mutations]) {
  const work = mkdtempSync(join(tmpdir(), "k12-r6-coordinate-ablation-"));
  try {
    cpSync(join(snapshot, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
    symlinkSync(resolve(root, "node_modules"), join(work, "node_modules"), "dir");
    cpSync(join(snapshot, "package.json"), join(work, "package.json"));
    if (mutation) {
      const [id, file, find, replacement] = mutation;
      const path = join(work, "packages/kernel/src", file);
      const source = readFileSync(path, "utf8");
      assert.equal(source.split(find).length, 2, `unique anchor: ${id}`);
      writeFileSync(path, source.replace(find, replacement));
    }
    const run = spawnSync(process.execPath, args, { cwd: work, encoding: "utf8", timeout: 900_000, maxBuffer: 32 * 1024 * 1024 });
    const output = (run.stdout ?? "") + (run.stderr ?? "");
    const count = name => Number(new RegExp(`^ℹ ${name} (\\d+)`, "m").exec(output)?.[1]);
    const tests = count("tests"), pass = count("pass"), fail = count("fail"), cancelled = count("cancelled"), skipped = count("skipped"), todo = count("todo");
    assert.ok(!run.error && run.signal === null && Number.isFinite(tests) && cancelled === 0 && skipped === 0 && todo === 0 && tests === pass + fail, output);
    const failedNames = [...new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map(match => match[1]))];
    let verdict = "CONTROL";
    if (!mutation) {
      assert.ok(run.status === 0 && fail === 0 && pass > 0, output);
      controlTests = tests;
    } else {
      assert.equal(tests, controlTests, "a mutant must run the same complete suite as its control");
      const exactOracleRejected = failedNames.some(name => name.startsWith("DEC-4 exact retained coordinates:"));
      const isRejected = run.status !== 0 && fail > 0 && pass > 0 && exactOracleRejected;
      verdict = isRejected ? "REJECTED" : "SURVIVED";
      if (isRejected) rejected += 1;
    }
    console.log(`${verdict} ${mutation?.[0] ?? "full Kernel suite"}: exit=${run.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled} skipped=${skipped} todo=${todo}`);
    const shownNames = new Set([...failedNames.slice(0, 8), ...failedNames.filter(name => name.startsWith("DEC-4 exact retained coordinates:"))]);
    for (const name of shownNames) console.log(`  ${name}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
console.log(`${rejected}/${mutations.length} review-06 coordinate ablations rejected by the maintained exact-coordinate oracle within the full Kernel suite`);
process.exitCode = rejected === mutations.length ? 0 : 1;
