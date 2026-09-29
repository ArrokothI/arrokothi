// Review 10's enforcement probe (sealed at review-10/probe-enforcement.mjs), rebound to the round-7
// enforcement. The sealed probe extracts round 6's `scan` from ambient-reads.test.ts by slicing the
// text between `const OPTIONS:` and `const zoneFiles`, and writes its results into the sealed
// review-10 directory; neither works on this candidate, and the second must never happen. This adapter
// verifies the sealed probe's SHA-256, takes its six reads and its two find/replace regressions from the
// sealed text itself, and asserts the opposite of the sealed result on this tree:
//   - all six reads are reported by the round-7 analysis (the sealed probe asserted 3 of 6);
//   - both regressions are rejected by the complete Kernel suite, including the rule test for the
//     takeover commit (the sealed probe asserted that each passed all 1,331 tests).
// Nothing is written inside the repository. Run from the repository root.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const sealedPath = "docs/development/work/K1.2-correction-01/review-10/probe-enforcement.mjs";
const sealed = readFileSync(sealedPath, "utf8");
const digest = createHash("sha256").update(sealed).digest("hex");
assert.equal(digest, "5695f73c581e01241af82b8a658c4d70c82a8aa6b70a13846b0d4fa641d6273b", "sealed review-10 probe unchanged (review-10/MANIFEST.sha256)");
console.log(`sealed probe ${sealedPath} sha256 ${digest}`);

// The six reads, exactly as the sealed probe writes them.
const formsStart = sealed.indexOf("fs.writeFileSync(syntax,`") + "fs.writeFileSync(syntax,`".length;
const forms = sealed.slice(formsStart, sealed.indexOf("\\n`);", formsStart)) + "\n";
assert.ok(forms.includes('const { ["resultingEpoch"]: computed }=e;') && forms.includes("({resultingEpoch: assigned}=e);"), "the six forms were found in the sealed text");

// The two regressions, exactly as the sealed probe spells them.
const mutantsStart = sealed.indexOf("for(const [name,find,replacement] of [");
const mutantsText = sealed.slice(mutantsStart + "for(const [name,find,replacement] of ".length, sealed.indexOf("]) {", mutantsStart) + 1);
const mutants = new Function(`return ${mutantsText};`)();
assert.deepEqual(mutants.map(([name]) => name), ["early-mint", "early-increment"]);

// 1. The six reads against the round-7 analysis, as a probe beside the zone sources in a copy.
const work = mkdtempSync(join(tmpdir(), "k12c1-r7-rebound-"));
try {
  cpSync(join(root, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
  symlinkSync(resolve(root, "node_modules"), join(work, "node_modules"), "dir");
  cpSync(join(root, "package.json"), join(work, "package.json"));
  writeFileSync(join(work, "packages/kernel/src/__review10_forms.ts"), forms);
  writeFileSync(
    join(work, "packages/kernel/tests/__review10_forms.ts"),
    [
      'import { resolve } from "node:path";',
      'import { analyseAccesses, buildZone, SOURCE_ROOT } from "./zone-analysis.ts";',
      'const path = resolve(SOURCE_ROOT, "__review10_forms.ts");',
      "const zone = buildZone([path]);",
      "const sites = analyseAccesses(zone).map(({ kind, mode, text, line }) => ({ kind, mode, text, line }));",
      "console.log(JSON.stringify(sites));",
      "",
    ].join("\n"),
  );
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "packages/kernel/tests/__review10_forms.ts"], { cwd: work, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const sites = JSON.parse(run.stdout);
  console.log(`SITES ${JSON.stringify(sites)}`);
  const lines = new Set(sites.map((site) => site.line));
  for (const line of [3, 4, 5, 6, 7, 9]) assert.ok(lines.has(line), `form on line ${line} reported`);
  console.log("six forms: all six reported (sealed result at H: 3 of 6)");
} finally {
  rmSync(work, { recursive: true, force: true });
}

// 2. The two regressions against the complete Kernel suite.
const RULE = "requestTakeover: an apply suffix of prebuilt values, and no accepted-state mutation or foreign call before it";
let rejected = 0;
for (const [name, find, replacement] of mutants) {
  const copy = mkdtempSync(join(tmpdir(), "k12c1-r7-rebound-mutant-"));
  try {
    cpSync(join(root, "packages/kernel"), join(copy, "packages/kernel"), { recursive: true });
    symlinkSync(resolve(root, "node_modules"), join(copy, "node_modules"), "dir");
    cpSync(join(root, "package.json"), join(copy, "package.json"));
    const file = join(copy, "packages/kernel/src/coordinator.ts");
    const text = readFileSync(file, "utf8");
    assert.equal(text.split(find).length, 2, `unique anchor: ${name}`);
    writeFileSync(file, text.replace(find, () => replacement));
    const tests = readdirSync(join(copy, "packages/kernel/tests")).filter((entry) => entry.endsWith(".test.ts")).sort().map((entry) => `packages/kernel/tests/${entry}`);
    const run = spawnSync(process.execPath, ["--experimental-strip-types", "--test", "--test-reporter=spec", ...tests], { cwd: copy, encoding: "utf8", timeout: 600_000, maxBuffer: 64 * 1024 * 1024 });
    const output = (run.stdout ?? "") + (run.stderr ?? "");
    const count = (label) => Number(new RegExp(`^ℹ ${label} (\\d+)`, "m").exec(output)?.[1]);
    const failedFiles = [...new Set([...output.matchAll(/^test at packages\/kernel\/tests\/([^:]+):\d+/gm)].map((match) => match[1]))].sort();
    const failed = [...new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]))];
    const ok = run.status !== 0 && count("fail") > 0 && count("pass") > 0 && count("cancelled") === 0 && count("skipped") === 0 && count("todo") === 0 && failed.includes(RULE);
    if (ok) rejected += 1;
    console.log(`${ok ? "REJECTED" : "SURVIVED"} ${name}: exit=${run.status} tests=${count("tests")} pass=${count("pass")} fail=${count("fail")} cancelled=${count("cancelled")} skipped=${count("skipped")} todo=${count("todo")}`);
    console.log(`  failing files: ${failedFiles.join(", ") || "none"}`);
    console.log(`  takeover rule test failed: ${failed.includes(RULE)}`);
    for (const test of failed.slice(0, 6)) console.log(`  ${test}`);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}
console.log(`${rejected}/2 review-10 regressions rejected (sealed result at H: both passed 1,331/1,331)`);
process.exitCode = rejected === 2 ? 0 : 1;
