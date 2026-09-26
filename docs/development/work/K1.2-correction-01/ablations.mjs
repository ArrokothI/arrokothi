// Correction-specific distinguishing mutations; original 36 remain in K1.2/ablations.mjs.
// Execute only in disposable package copies. No mutation of the candidate or existing evidence.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const root = resolve(process.cwd());
const mutations = [
  ["I1 restore old value validator for every Activation consumer", "envelope.ts", '  if (typeof value === "string") return true;', '  if (typeof value === "string") return acceptIdentityText(value, label, issues);'],
  ["I2 inverse X24: refuse lone surrogates but permit long strings", "envelope.ts", '  if (typeof value === "string") return true;', '  if (typeof value === "string" && value.isWellFormed()) return true;'],
  ["I3 Outcome-only old validator", "coordinator.ts", 'acceptActivationIdentity(activationField.observed, "activationId", idIssues)', 'acceptIdentityText(activationField.observed, "activationId", idIssues)'],
  ["I4 takeover/protocol-only old validator", "outcome.ts", 'const activationOk = activationField.ok && acceptActivationIdentity(activationField.observed, "activationId", issues);\n  const writerEpoch', 'const activationOk = activationField.ok && acceptIdentityText(activationField.observed, "activationId", issues);\n  const writerEpoch'],
  ["I5 recovery-only old validator", "outcome.ts", 'const activationOk = activationField.ok && acceptActivationIdentity(activationField.observed, "activationId", issues);\n  const availableField', 'const activationOk = activationField.ok && acceptIdentityText(activationField.observed, "activationId", issues);\n  const availableField'],
  ["I6 boxed strings treated as usable identities", "envelope.ts", '  if (typeof value === "string") return true;', '  if (typeof value === "string" || value instanceof String) return true;'],
  ["I7 unbounded unknown-field diagnostics", "outcome.ts", 'const name = diagnosticFieldName(key);', 'const name = key;'],
];
let rejected = 0;
for (const mutation of [null, ...mutations]) {
  const work = mkdtempSync(join(tmpdir(), "k12-correction-ablation-"));
  try {
    cpSync(join(root, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
    symlinkSync(join(root, "node_modules"), join(work, "node_modules"), "dir");
    if (mutation) {
      const [id, file, find, replacement] = mutation;
      const path = join(work, "packages/kernel/src", file);
      const source = readFileSync(path, "utf8");
      if (source.split(find).length !== 2) throw Error(`NOT APPLICABLE: ${id}`);
      writeFileSync(path, source.replace(find, replacement));
    }
    const result = spawnSync(process.execPath, ["--test", "--test-reporter=spec", "--experimental-strip-types", "packages/kernel/tests/activation-identity.test.ts"], { cwd: work, encoding: "utf8", timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
    const output = result.stdout + result.stderr;
    const count = label => Number(new RegExp(`ℹ ${label} (\\d+)`).exec(output)?.[1] ?? NaN);
    const tests = count("tests"), pass = count("pass"), fail = count("fail"), cancelled = count("cancelled");
    if (result.error || !Number.isFinite(tests) || cancelled !== 0 || tests !== pass + fail) throw Error(`NO RESULT: ${mutation?.[0] ?? "control"}: ${result.error ?? output.slice(-2000)}`);
    if (!mutation) {
      if (result.status !== 0 || fail !== 0 || tests !== 495) throw Error("control did not pass all 495 distinguishing tests");
      console.log(`CONTROL exit=${result.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled}`);
    } else {
      const verdict = result.status !== 0 && fail > 0 && pass > 0 ? "REJECTED" : "SURVIVED";
      console.log(`${verdict} ${mutation[0]}: exit=${result.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled}`);
      console.log([...new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map(m => m[1]))].slice(0, 4).join("\n"));
      if (verdict === "REJECTED") rejected++;
    }
  } finally { rmSync(work, { recursive: true, force: true }); }
}
console.log(`${rejected}/${mutations.length} correction ablations rejected.`);
process.exitCode = rejected === mutations.length ? 0 : 1;
