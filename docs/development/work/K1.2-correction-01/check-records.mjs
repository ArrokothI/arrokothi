import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const release = "6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb";
const base = "a20d278185eaffc7f8b7489345a3624231ff6e6d";
for (const sha of [base, "b53ccb48a8fd4b9d0b0028fc11e925d563e284fa", "954d31b00eb7f2412c22ccf7d4d079699f0c4032", release]) git("merge-base", "--is-ancestor", sha, "HEAD");
assert.equal(git("diff", "8a418d408f715e999a403a3e84b73a9db1b43712", "HEAD", "--", "docs/development/work/K1.2", ":(exclude)docs/development/work/K1.2/decision-03.md", ":(exclude)docs/development/work/K1.2/decision-04.md"), "", "historical K1.2 records and ablations preserved");
assert.equal(createHash("sha256").update(readFileSync("docs/development/work/K1.2/decision-03.md")).digest("hex"), "13c20e5fdaec8d8f4c01e64849ce313bf4da72008e6683383996899a378c54ae", "explicit owner decision-03 transcription preserved");
assert.equal(createHash("sha256").update(readFileSync("docs/development/work/K1.2/decision-04.md")).digest("hex"), "342111d9825742ea076e97367cca1b97dfa6fc0b25442e7b1a2d1d6ae75f496c", "explicit owner decision-04 transcription preserved");
const changedTests = git("diff", "--name-only", release, "HEAD", "--", "packages/kernel/tests").split("\n").filter(Boolean);
assert.deepEqual(changedTests, ["packages/kernel/tests/activation-identity.test.ts", "packages/kernel/tests/aggregate-refusal.test.ts", "packages/kernel/tests/exact-coordinates.test.ts", "packages/kernel/tests/refusal-diagnostics-fixture.ts", "packages/kernel/tests/refusal-diagnostics.test.ts", "packages/kernel/tests/value-diagnostic-work.test.ts", "packages/kernel/tests/value-refusal-cost.test.ts", "packages/kernel/tests/values.test.ts"], "only declared correction tests added");
for (const path of ["review-02.md", "review-02"]) {
  assert.equal(git("diff", "b18a729d989dea334a86ec08bdf8773ee77de4db", "HEAD", "--", `docs/development/work/K1.2-correction-01/${path}`), "", `sealed ${path} preserved`);
}
for (const path of ["implementation-02.md", "validation-02", "review-03.md", "review-03", "review-04.md", "review-04"]) {
  assert.equal(git("diff", "8a418d408f715e999a403a3e84b73a9db1b43712", "HEAD", "--", `docs/development/work/K1.2-correction-01/${path}`), "", `sealed ${path} preserved`);
}
const review = "449b243cd31d5596c457e091233dfc4d77a4eff4";
for (const path of ["implementation-01.md", "validation-01", "review-01.md", "review-01"]) {
  assert.equal(git("diff", review, "HEAD", "--", `docs/development/work/K1.2-correction-01/${path}`), "", `sealed ${path} preserved`);
}
for (const path of git("ls-tree", "-r", "--name-only", review, "packages/kernel/tests").split("\n")) {
  if (path === "packages/kernel/tests/values.test.ts") {
    // R6 removes the caller-name producer; only this diagnostic-label expectation changes.
    const old = git("show", `${review}:${path}`);
    assert.equal(readFileSync(path, "utf8").trim(), old.replace("/Holder instance/", "/expected a plain object, received object/"));
  } else assert.equal(git("diff", review, "HEAD", "--", path), "", `pre-round-2 test preserved: ${path}`);
}
for (const path of ["implementation-03.md", "validation-03", "review-06.md", "review-06"]) {
  assert.equal(git("diff", "3287640f045cf2e6adeefcd32f21d897480a6a7d", "HEAD", "--", `docs/development/work/K1.2-correction-01/${path}`), "", `sealed ${path} preserved`);
}
for (const file of ["006-development-process.md", "008-implementation-report.md", "012-review-methods.md"]) {
  assert.equal(git("diff", base, "HEAD", "--", `docs/development/${file}`), "", `governing process unchanged: ${file}`);
}
for (const file of ["packages/kernel/src/identity.ts", "package-lock.json"]) assert.equal(git("diff", release, "HEAD", "--", file), "");
const before = git("show", `${release}:packages/kernel/src/coordinator.ts`);
const after = readFileSync("packages/kernel/src/coordinator.ts", "utf8");
const creation = text => text.slice(text.indexOf("  createExecution("), text.indexOf("  submitOutcome("));
const holdDiagnostic = text => text.replace("${diagnosticIdentity(intent.activation.activationId)} is recovery-held and is not redelivered", "${intent.activation.activationId} is recovery-held and is not redelivered");
assert.equal(holdDiagnostic(creation(after)), creation(before), "creation/ingress/dispatch/inspection preserved; only declared K1.2 redelivery hold diagnostic changed");
console.log("Prerequisite ancestry, historical records/36 ablations, original tests (one declared diagnostic-label assertion updated), identity producer code (values.ts amended by owner for V-D1) and creation-through-dispatch preservation verified.");
const files = ["docs/development/002-implemented-kernel-baseline.md", "docs/development/007-work-packets.md", "mental-model/concepts/identity.md", "mental-model/mechanisms/execution-cycle.md", "mental-model/sources.md", "mental-model/roadmap.md", "mental-model/rewrite-index.md", "docs/development/work/K1.2-correction-01/contract.md", "docs/development/work/K1.2-correction-01/reconstruction.md", "docs/development/work/K1.2-correction-01/coverage-02.md", "docs/development/work/K1.2-correction-01/coverage-03.md", "docs/development/work/K1.2-correction-01/coverage-04.md", "mental-model/concepts/values.md", ...["coverage-05.md", "exact-coverage-04.md", "diagnostic-closure-04.md", "cumulative-audit-04.md", "blocker-01.md", "blocker-02.md", "string-closure-04.md"].map(name => `docs/development/work/K1.2-correction-01/${name}`)];
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
