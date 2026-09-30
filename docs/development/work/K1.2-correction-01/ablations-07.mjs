// Round 7 (contract revision 8): mutants for review 10's K12C1-R10-READ-01 and K12C1-R10-COMMIT-01.
// Each mutant replaces exact spans in a disposable copy of packages/kernel and runs the complete
// Kernel suite there, after a clean control on the same snapshot. A mutant is REJECTED only with at
// least one real failed test, passing tests alongside, and no cancelled/skipped/todo; a span not found
// exactly once aborts. Each mutant must also fail at least one of the enforcement files' rule tests
// (listed below), so the rule itself — not only a behavioural oracle, and not only the in-memory
// negative controls, whose own anchors a mutant can change — is shown to reject it.
// Run from the repository root: node docs/development/work/K1.2-correction-01/ablations-07.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const C = "coordinator.ts";
const E = "envelope.ts";
const V = "values.ts";
const U = "unsupported.ts";
const CONTROLS = '  const controls = hostMember(caller, "controlScopes") as readonly string[] | undefined;';
const TAKEOVER_POSITION = 'const position = record.nextAcceptancePosition;\n    const receipt = mintReceipt("dispatch_intent", position, record.executionId);';
const TAKEOVER_SUBMISSION = "const submission = mintSubmission(record.executionId, named.activationId, writerEpoch);";
const TAKEOVER_APPEND = "    appendOwn(record.receipts, receipt);\n    if (cleared !== null)";
const TAKEOVER_ANSWER_END = "      batch: exchange.batch,\n      receipt,\n    });\n";

const mutations = [
  // K12C1-R10-READ-01: reads of an optional member in the forms round 6's scanner did not list, and
  // the other equivalent ways of reaching a member an object may not own.
  ["R1 quoted binding name reads the optional controlScopes", [[C, CONTROLS, '  const { "controlScopes": controls } = caller;']]],
  ["R2 computed binding name reads the optional controlScopes", [[C, CONTROLS, '  const { ["controlScopes"]: controls } = caller;']]],
  ["R3 assignment destructuring reads the optional controlScopes", [[C, CONTROLS, "  let controls: readonly string[] | undefined;\n  ({ controlScopes: controls } = caller);"]]],
  ["R4 bare binding reads the optional controlScopes", [[C, CONTROLS, "  const { controlScopes: controls } = caller;"]]],
  ["R5 a cast makes the optional controlScopes required", [[C, CONTROLS, "  const controls: readonly string[] | undefined = (caller as Required<AuthenticatedCaller>).controlScopes;"]]],
  ["R6 a rest copy then an optional read", [[C, CONTROLS, "  const { ...hostView } = caller;\n  const controls = hostView.controlScopes;"]]],
  ["R7 an in-operator guard consults the prototype chain", [[C, CONTROLS, '  const controls = "controlScopes" in caller ? (hostMember(caller, "controlScopes") as readonly string[] | undefined) : undefined;']]],
  ["R8 a String.prototype method replaces an index read", [[E, '    const bracketed = issue.path.length > 0 && (issue.path[0] as string) === "[";', '    const bracketed = issue.path.startsWith("[");']]],
  ["R9 the occurrences suffix access respelled as an ordinary optional access", [[V, "      (entry as { occurrences: number }).occurrences += 1;", "      (entry as { occurrences?: number }).occurrences = ((entry as { occurrences?: number }).occurrences ?? 0) + 1;"]]],
  ["R10 SELF-R7-UNSUPPORTED-01 restored: name written through [[Set]]", [[U, '  override readonly name = "UnsupportedKernelSurfaceError";\n', ""], [U, "    this.surface = surface;", '    this.name = "UnsupportedKernelSurfaceError";\n    this.surface = surface;']]],
  ["R11 a lib global read after load", [[E, "      return PrimordialReflectApply(PrimordialStringSlice, reason, [0, DIAGNOSTIC_LIMIT]) as string;", "      return String.prototype.slice.call(reason, 0, DIAGNOSTIC_LIMIT);"]]],
  ["R12 a caller envelope read directly", [[C, "    const named = captureAttempt(request, issues);\n    if (named === null) {\n      return err(this.#refusal(\"malformed_value\", `takeover request", "    const named = request.writerEpoch === undefined ? null : captureAttempt(request, issues);\n    if (named === null) {\n      return err(this.#refusal(\"malformed_value\", `takeover request"]]],
  // K12C1-R10-COMMIT-01: the first accepted-state mutation moved before the builds, in every form.
  ["C1 review 10: takeover receipt minted through this.#mint", [[C, 'const receipt = mintReceipt("dispatch_intent", position, record.executionId);', 'const receipt = this.#mint("dispatch_intent", record);']]],
  ["C2 review 10: takeover index advanced by a postfix increment", [[C, TAKEOVER_POSITION, TAKEOVER_POSITION.replace("record.nextAcceptancePosition;", "record.nextAcceptancePosition++;")]]],
  ["C3 compound assignment in an initializer", [[C, TAKEOVER_POSITION, TAKEOVER_POSITION.replace("record.nextAcceptancePosition;", "(record.nextAcceptancePosition += 1) - 1;")]]],
  ["C4 early append through a const alias", [[C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const receiptsAlias = record.receipts;\n    appendOwn(receiptsAlias, receipt);`], [C, TAKEOVER_APPEND, "    if (cleared !== null)"]]],
  ["C5 early append through a fresh container holding a Kernel list", [[C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const plan = { list: record.receipts };\n    appendOwn(plan.list, receipt);`], [C, TAKEOVER_APPEND, "    if (cleared !== null)"]]],
  ["C6 early write inside a local closure", [[C, TAKEOVER_SUBMISSION, `${TAKEOVER_SUBMISSION}\n    const retire = (): void => {\n      exchange.submission = submission;\n    };\n    retire();`]]],
  ["C15 an early write through a binding set by logical assignment", [[C, TAKEOVER_SUBMISSION, `${TAKEOVER_SUBMISSION}\n    let target: ActivationRecord | undefined;\n    target ??= exchange;\n    target.submission = submission;`]]],
  ["C16 an early truncation through an object whose constructor keeps a Kernel list", [[C, "const mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {", "class ListHolder {\n  readonly list: Receipt[];\n  constructor(list: Receipt[]) {\n    this.list = list;\n  }\n}\n\nconst mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {"], [C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const holder = new ListHolder(record.receipts);\n    holder.list.length = 0;`]]],
  ["C7 a Kernel list widened, disguised as a string and appended to through a helper", [[C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const widened: unknown = record.receipts;\n    const disguised = widened as string;\n    const launder = (text: string): void => {\n      appendOwn(text as unknown as Receipt[], receipt);\n    };\n    launder(disguised);`], [C, TAKEOVER_APPEND, "    if (cleared !== null)"]]],
  ["C8 foreign code after the decision is being built", [[C, TAKEOVER_ANSWER_END, `${TAKEOVER_ANSWER_END}    hostMember(caller, "controlScopes");\n`]]],
  ["C9 a refusal recorded without exiting", [[C, TAKEOVER_POSITION, `this.#refusal("stale_exchange", "probe", record);\n    ${TAKEOVER_POSITION}`]]],
  ["C10 a builder that also changes module state", [[C, "const mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant =>\n  PrimordialObjectFreeze({ executionId, activationId, writerEpoch });", "let grantsMinted = 0;\nconst mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant => {\n  grantsMinted += 1;\n  return PrimordialObjectFreeze({ executionId, activationId, writerEpoch });\n};"]]],
  ["C11 the Driver handed the attempt before it is recorded", [[C, "    this.#deliver(exchange);\n\n    return answer;", "    return answer;"], [C, TAKEOVER_APPEND, "    this.#deliver(exchange);\n    appendOwn(record.receipts, receipt);\n    if (cleared !== null)"]]],
  ["C12 a protocol hold written before its record is built", [[C, "    const reason = `the response of the attempt", "    exchange.protocolFailureHold = null;\n    const reason = `the response of the attempt"]]],
  ["C13 the recovery answer projected after the commit (round 6 H7)", [[C, "    const answer = ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });\n    applyControlCommit(record, exchange, commit);\n    return answer;", "    applyControlCommit(record, exchange, commit);\n    return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed: true });"]]],
  ["C14 holds written before their history append (round 6 H3)", [[C, "  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);\n  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;", "  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;\n  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);"]]],
];

// The enforcement files' rule tests: the checks of the zone itself, as opposed to their negative controls.
const RULE_TESTS = new Set([
  "the zone typechecks under the repository configuration the analysis uses",
  "the zone uses only permitted syntax",
  "every reported site is inventoried, at its exact count, with a reason",
  "every guarded descriptor read follows its own-value check in the same function",
  "every bounded index read sits in a loop that keeps its index below the list's own length",
  "every hostMember call names an optional member of its holder's declared type",
  "an accessor installed on Error.prototype.name receives nothing, and the error still names itself",
  "every call resolves to zone code, a classified primordial or an inventoried foreign call",
  "recoverExecution: an apply suffix of prebuilt values, and no accepted-state mutation or foreign call before it",
  "reportProtocolFailure: an apply suffix of prebuilt values, and no accepted-state mutation or foreign call before it",
  "requestTakeover: an apply suffix of prebuilt values, and no accepted-state mutation or foreign call before it",
  "the recognised apply suffixes are the ones the contract describes",
  "applyControlCommit appends its prebuilt record before its hold writes and does nothing else",
  "hold fields, recovery history, receipts and the acceptance index have fixed writers",
  "the effect summaries do not depend on the order functions are analysed in",
  "the refusal helpers change nothing on the path that continues past their exit test",
  "values.ts: only pushIssue itself mutates an issue list, so every suffix entry owns `occurrences`",
  "the unmodified source is the clean control",
]);
const testFiles = readdirSync(join(root, "packages/kernel/tests")).filter((name) => name.endsWith(".test.ts")).sort().map((name) => `packages/kernel/tests/${name}`);
const args = ["--experimental-strip-types", "--test", "--test-reporter=spec", ...testFiles];
console.log(`ENV node=${process.version} platform=${process.platform} arch=${process.arch} files=${testFiles.length} mutants=${mutations.length}`);
console.log(`COMMAND ${JSON.stringify([process.execPath, ...args])}`);
// One pinned snapshot for the whole run; each mutant works on its own copy of it.
const snapshot = mkdtempSync(join(tmpdir(), "k12c1-r7-source-"));
cpSync(join(root, "packages/kernel"), join(snapshot, "packages/kernel"), { recursive: true });
cpSync(join(root, "package.json"), join(snapshot, "package.json"));
let controlTests;
let rejected = 0;
try {
  for (const mutation of [null, ...mutations]) {
    const work = mkdtempSync(join(tmpdir(), "k12c1-r7-ablation-"));
    try {
      cpSync(join(snapshot, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
      symlinkSync(resolve(root, "node_modules"), join(work, "node_modules"), "dir");
      cpSync(join(snapshot, "package.json"), join(work, "package.json"));
      if (mutation) {
        const [id, edits] = mutation;
        for (const [file, find, replacement] of edits) {
          const path = join(work, "packages/kernel/src", file);
          const source = readFileSync(path, "utf8");
          assert.equal(source.split(find).length, 2, `unique anchor: ${id}`);
          writeFileSync(path, source.replace(find, () => replacement));
        }
      }
      const run = spawnSync(process.execPath, args, { cwd: work, encoding: "utf8", timeout: 900_000, maxBuffer: 64 * 1024 * 1024 });
      const output = (run.stdout ?? "") + (run.stderr ?? "");
      const count = (name) => Number(new RegExp(`^ℹ ${name} (\\d+)`, "m").exec(output)?.[1]);
      const tests = count("tests"), pass = count("pass"), fail = count("fail"), cancelled = count("cancelled"), skipped = count("skipped"), todo = count("todo");
      assert.ok(!run.error && run.signal === null && Number.isFinite(tests) && cancelled === 0 && skipped === 0 && todo === 0 && tests === pass + fail, output.slice(-4000));
      const failedNames = [...new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]))];
      const failedFiles = [...new Set([...output.matchAll(/^test at packages\/kernel\/tests\/([^:]+):\d+/gm)].map((match) => match[1]))].sort();
      let verdict = "CONTROL";
      if (!mutation) {
        assert.ok(run.status === 0 && fail === 0 && pass > 0, output.slice(-4000));
        controlTests = tests;
      } else {
        assert.equal(tests, controlTests, "a mutant runs the same complete suite as its control");
        const ruleFailures = failedNames.filter((name) => RULE_TESTS.has(name));
        const isRejected = run.status !== 0 && fail > 0 && pass > 0 && ruleFailures.length > 0;
        verdict = isRejected ? "REJECTED" : "SURVIVED";
        if (isRejected) rejected += 1;
      }
      console.log(`${verdict} ${mutation?.[0] ?? "full Kernel suite"}: exit=${run.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled} skipped=${skipped} todo=${todo}`);
      if (mutation) {
        console.log(`  failing files: ${failedFiles.join(", ") || "none"}`);
        console.log(`  failing rule tests: ${failedNames.filter((name) => RULE_TESTS.has(name)).join(" | ") || "none"}`);
        const others = failedNames.filter((name) => !RULE_TESTS.has(name));
        console.log(`  other failing tests (${others.length}): ${others.slice(0, 8).join(" | ")}${others.length > 8 ? " | …" : ""}`);
      }
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
console.log(`${rejected}/${mutations.length} round-7 mutants rejected by the full Kernel suite, each by an enforcement rule test`);
process.exitCode = rejected === mutations.length ? 0 : 1;
