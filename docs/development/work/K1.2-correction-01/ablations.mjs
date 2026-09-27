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
// One mutation per identity interpolation, including both fragments of a single reason.
// Pin the inventory so a new renderer cannot silently enter without its own distinguishing test.
const rendererInventory = { "coordinator.ts": 30, "outcome.ts": 1 };
let rendererNumber = 0;
for (const [file, expected] of Object.entries(rendererInventory)) {
  const source = readFileSync(join(root, "packages/kernel/src", file), "utf8");
  const matches = [...source.matchAll(/\$\{diagnosticIdentity\(([^)]*)\)\}/g)];
  if (matches.length !== expected) throw Error(`renderer inventory changed for ${file}: ${matches.length} != ${expected}`);
  for (const match of matches) {
    const start = match.index;
    let left = Math.max(0, start - 200), right = Math.min(source.length, start + match[0].length + 200);
    let find = source.slice(left, right);
    while (source.split(find).length !== 2 && left > 0) { left = Math.max(0, left - 200); find = source.slice(left, right); }
    const replacement = source.slice(left, start) + "$" + "{" + match[1] + "}" + source.slice(start + match[0].length, right);
    const line = source.slice(0, start).split("\n").length;
    mutations.push([`${++rendererNumber === 1 ? "D35" : `D${rendererNumber - 1}`} unbounded identity at ${file}:${line} (${match[1]})`, file, find, replacement]);
  }
}
mutations.push(
  ["D31 raw captured member path before root prefix", "envelope.ts", 'path: diagnosticText(issue.path, "<omitted>", 128),', 'path: issue.path,'],
  ["D32 raw captured constructor message", "envelope.ts", 'message: diagnosticText(issue.message, "<message omitted>", 1_024),', 'message: issue.message,'],
  ["D33 identity length limit removed", "envelope.ts", 'diagnosticText(identity, "<identity omitted>", 128)', 'diagnosticText(identity, "<identity omitted>", Infinity)'],
  ["D34 diagnostic ASCII guard removed", "envelope.ts", '    if (text[index]! < " " || text[index]! > "~") return omitted;', '    if (false) return omitted;'],
  ["R1 structured refusal executionId rendered lossy", "coordinator.ts", 'const refusal = mintRefusal(classification, reason, position, record.executionId);', 'const refusal = mintRefusal(classification, reason, position, diagnosticIdentity(record.executionId));'],
  ["R2 code availability compared through diagnostic spelling", "coordinator.ts", 'if (!listed(captured.available.definitionRevisions, pinned.definitionRevision)) note(', 'if (!listed(captured.available.definitionRevisions, diagnosticIdentity(pinned.definitionRevision))) note('],
  ["R6 replay keyed by diagnostic spelling", "coordinator.ts", 'const already = mapGet(record.acceptedOutcomes, activationId);', 'const already = mapGet(record.acceptedOutcomes, diagnosticIdentity(activationId));'],
  ["R8 identity limit 127", "envelope.ts", 'diagnosticText(identity, "<identity omitted>", 128)', 'diagnosticText(identity, "<identity omitted>", 127)'],
  ["R10 message limit removed", "envelope.ts", 'message: diagnosticText(issue.message, "<message omitted>", 1_024),', 'message: diagnosticText(issue.message, "<message omitted>", Infinity),'],
  ["R11 hold update lost", "coordinator.ts", '} else if (exchange.codeHold === null || exchange.codeHold.reason !== missing) {', '} else if (exchange.codeHold === null) {'],
  ["R12 explicit protocol diagnostic made lossy", "coordinator.ts", 'const reason = `the response of the attempt at writer epoch ${currentEpoch} could not be classified as an Outcome: ${diagnostic}`;', 'const reason = `the response of the attempt at writer epoch ${currentEpoch} could not be classified as an Outcome: ${diagnosticIdentity(diagnostic)}`;'],
  ["R4 Outcome compares diagnostic spellings", "coordinator.ts", 'if (identityUsable && intent.activation.activationId !== activationId) {', 'if (identityUsable && diagnosticIdentity(intent.activation.activationId) !== diagnosticIdentity(activationId)) {'],
  ["R5 controls compare diagnostic spellings", "coordinator.ts", 'if (intent.activation.activationId !== activationId) {\n      return err(', 'if (diagnosticIdentity(intent.activation.activationId) !== diagnosticIdentity(activationId)) {\n      return err('],
  ["R7 Emission keys compare diagnostic spellings", "outcome.ts", 'if ((readAt(keys, position) as string) === emissionKey) duplicate = true;', 'if (diagnosticIdentity(readAt(keys, position) as string) === diagnosticIdentity(emissionKey)) duplicate = true;'],
  ["R9 path limit 129", "envelope.ts", 'path: diagnosticText(issue.path, "<omitted>", 128),', 'path: diagnosticText(issue.path, "<omitted>", 129),'],
  ["G1 restore unbounded detail list", "envelope.ts", 'const ISSUE_DETAIL_LIMIT = 8;', 'const ISSUE_DETAIL_LIMIT = Infinity;'],
  ["G2 drop omitted code evidence", "envelope.ts", 'if (issues.length > ISSUE_DETAIL_LIMIT) {', 'if (false) {'],
  ["G3 fail to count repeated omitted code", "envelope.ts", 'else entry.count += 1;', 'else entry.count += 0;'],
  ["G4 details 7", "envelope.ts", 'const ISSUE_DETAIL_LIMIT = 8;', 'const ISSUE_DETAIL_LIMIT = 7;'],
  ["G5 details 9", "envelope.ts", 'const ISSUE_DETAIL_LIMIT = 8;', 'const ISSUE_DETAIL_LIMIT = 9;'],
  ["G6 path limit 127", "envelope.ts", 'path: diagnosticText(issue.path, "<omitted>", 128),', 'path: diagnosticText(issue.path, "<omitted>", 127),'],
  ["G7 message limit 1023", "envelope.ts", 'message: diagnosticText(issue.message, "<message omitted>", 1_024),', 'message: diagnosticText(issue.message, "<message omitted>", 1_023),'],
  ["G8 message limit 1025", "envelope.ts", 'message: diagnosticText(issue.message, "<message omitted>", 1_024),', 'message: diagnosticText(issue.message, "<message omitted>", 1_025),'],
  ["G9 eagerly project captured messages", "envelope.ts", 'message: issue.message, root', 'message: diagnosticText(issue.message, "<message omitted>", 1_024), root'],
  ["G10 reverse detail order", "envelope.ts", 'const issue = readAt(issues, index) as LocatedIssue;\n    if (index < ISSUE_DETAIL_LIMIT)', 'const issue = readAt(issues, issues.length - 1 - index) as LocatedIssue;\n    if (index < ISSUE_DETAIL_LIMIT)'],
  ["G11 reverse summary code order", "envelope.ts", 'const entry = readAt(counts, index) as { code: string; count: number };', 'const entry = readAt(counts, counts.length - 1 - index) as { code: string; count: number };'],
  ["G12 lose root label on detail", "envelope.ts", 'const root = PrimordialGetOwnPropertyDescriptor(issue, "root")?.value as string | undefined;', 'const root = undefined;'],
  ["G13 project after root prefix", "envelope.ts", 'out += `${path === "" ? "envelope" : path} ${issue.code}`;', 'out += `${diagnosticText(path === "" ? "envelope" : path, "<omitted>", 128)} ${issue.code}`;'],
  ["G14 inherited root metadata", "envelope.ts", 'const root = PrimordialGetOwnPropertyDescriptor(issue, "root")?.value as string | undefined;', 'const root = issue.root;'],

);
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
    const result = spawnSync(process.execPath, ["--test", "--test-reporter=spec", "--experimental-strip-types", "packages/kernel/tests/activation-identity.test.ts", "packages/kernel/tests/refusal-diagnostics.test.ts", "packages/kernel/tests/aggregate-refusal.test.ts"], { cwd: work, encoding: "utf8", timeout: 60_000, maxBuffer: 64 * 1024 * 1024 });
    const output = result.stdout + result.stderr;
    const count = label => Number(new RegExp(`ℹ ${label} (\\d+)`).exec(output)?.[1] ?? NaN);
    const tests = count("tests"), pass = count("pass"), fail = count("fail"), cancelled = count("cancelled");
    if (result.error || !Number.isFinite(tests) || cancelled !== 0 || tests !== pass + fail) throw Error(`NO RESULT: ${mutation?.[0] ?? "control"}: ${result.error ?? output.slice(-2000)}`);
    if (!mutation) {
      if (result.status !== 0 || fail !== 0 || tests !== 571) throw Error("control did not pass all 571 distinguishing tests");
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
