import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const release = "6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb";
const base = "a20d278185eaffc7f8b7489345a3624231ff6e6d";
for (const sha of [base, "b53ccb48a8fd4b9d0b0028fc11e925d563e284fa", "954d31b00eb7f2412c22ccf7d4d079699f0c4032", release]) git("merge-base", "--is-ancestor", sha, "HEAD");
assert.equal(git("diff", release, "HEAD", "--", "docs/development/work/K1.2"), "", "historical K1.2 records and ablations preserved");
const changedTests = git("diff", "--name-only", release, "HEAD", "--", "packages/kernel/tests").split("\n").filter(Boolean);
assert.deepEqual(changedTests, ["packages/kernel/tests/activation-identity.test.ts", "packages/kernel/tests/aggregate-refusal.test.ts", "packages/kernel/tests/refusal-diagnostics-fixture.ts", "packages/kernel/tests/refusal-diagnostics.test.ts"], "only declared correction tests added");
for (const path of ["review-02.md", "review-02"]) {
  assert.equal(git("diff", "b18a729d989dea334a86ec08bdf8773ee77de4db", "HEAD", "--", `docs/development/work/K1.2-correction-01/${path}`), "", `sealed ${path} preserved`);
}
const review = "449b243cd31d5596c457e091233dfc4d77a4eff4";
for (const path of ["implementation-01.md", "validation-01", "review-01.md", "review-01"]) {
  assert.equal(git("diff", review, "HEAD", "--", `docs/development/work/K1.2-correction-01/${path}`), "", `sealed ${path} preserved`);
}
for (const path of git("ls-tree", "-r", "--name-only", review, "packages/kernel/tests").split("\n")) {
  assert.equal(git("diff", review, "HEAD", "--", path), "", `pre-round-2 test preserved: ${path}`);
}
for (const file of ["006-development-process.md", "008-implementation-report.md", "012-review-methods.md"]) {
  assert.equal(git("diff", base, "HEAD", "--", `docs/development/${file}`), "", `governing process unchanged: ${file}`);
}
for (const file of ["packages/kernel/src/identity.ts", "packages/kernel/src/values.ts", "package-lock.json"]) assert.equal(git("diff", release, "HEAD", "--", file), "");
const before = git("show", `${release}:packages/kernel/src/coordinator.ts`);
const after = readFileSync("packages/kernel/src/coordinator.ts", "utf8");
const creation = text => text.slice(text.indexOf("  createExecution("), text.indexOf("  submitOutcome("));
const holdDiagnostic = text => text.replace("${diagnosticIdentity(intent.activation.activationId)} is recovery-held and is not redelivered", "${intent.activation.activationId} is recovery-held and is not redelivered");
assert.equal(holdDiagnostic(creation(after)), creation(before), "creation/ingress/dispatch/inspection preserved; only declared K1.2 redelivery hold diagnostic changed");
console.log("Prerequisite ancestry, historical records/36 ablations, every original test, identity/value producer code and creation-through-dispatch preservation verified.");
const files = ["docs/development/002-implemented-kernel-baseline.md", "docs/development/007-work-packets.md", "mental-model/concepts/identity.md", "mental-model/mechanisms/execution-cycle.md", "mental-model/sources.md", "mental-model/roadmap.md", "mental-model/rewrite-index.md", "docs/development/work/K1.2-correction-01/contract.md", "docs/development/work/K1.2-correction-01/reconstruction.md", "docs/development/work/K1.2-correction-01/coverage-02.md", "docs/development/work/K1.2-correction-01/coverage-03.md"];
const slug = heading => heading.toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, "").replace(/ /g, "-");
let links = 0;
for (const file of files) {
  for (const match of readFileSync(file, "utf8").matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = match[1];
    if (/^(https?:|mailto:)/.test(href)) continue;
    const [path, anchor] = href.split("#");
    const target = path ? resolve(dirname(file), decodeURIComponent(path)) : resolve(file);
    assert.ok(existsSync(target), `${file}: missing ${href}`);
    if (anchor && target.endsWith(".md")) {
      const contents = readFileSync(target, "utf8");
      const headings = [...contents.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => slug(m[1]));
      assert.ok(headings.includes(anchor) || contents.includes(`id="${anchor}"`), `${file}: missing anchor ${href}`);
    }
    links++;
  }
}
console.log(`Local reference check: ${files.length} files, ${links} links/anchors; remote links not fetched.`);
