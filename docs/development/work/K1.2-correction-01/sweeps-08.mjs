// Round 8 (contract revision 9, amendment 03): negative controls for the two runtime sweeps.
//
// Each mutant replaces exact spans in a disposable copy of packages/kernel (one pinned snapshot per
// run, node_modules linked back) and is then given to the sweep that must reject it:
//   - fault mutants to the DEC-9 fault sweep (packages/kernel/tests/sweep/fault-child.ts) on the
//     scenarios that reach the mutated control; REJECTED when the sweep reports a violation;
//   - read mutants to the DEC-8 catalog sweep (poison-catalog.test.ts); REJECTED when its
//     zone-firing test fails. Review 11's read mutant and one controlScopes form are also given to the
//     whole-suite poison sweep in count mode (run-poison-sweep.ts --expect-firings).
// Clean controls on the same snapshot must pass first. Mutants marked `outside` are forms a runtime
// sweep cannot observe; they are run and reported, and the static guard (ablations-07.mjs) rejects
// them. Review 11's three mutants and review 10's two are included verbatim; C*/R* reuse
// ablations-07.mjs's edit specifications. A span not found exactly once aborts.
// Run from the repository root: node docs/development/work/K1.2-correction-01/sweeps-08.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const C = "coordinator.ts";
const E = "envelope.ts";
const O = "own-array.ts";
const U = "unsupported.ts";
const V = "values.ts";
const CONTROLS = '  const controls = hostMember(caller, "controlScopes") as readonly string[] | undefined;';
const TAKEOVER_RECEIPT = 'const receipt = mintReceipt("dispatch_intent", position, record.executionId);';
const TAKEOVER_POSITION = `const position = record.nextAcceptancePosition;\n    ${TAKEOVER_RECEIPT}`;
const TAKEOVER_SUBMISSION = "const submission = mintSubmission(record.executionId, named.activationId, writerEpoch);";
const TAKEOVER_APPEND = "    appendOwn(record.receipts, receipt);\n    if (cleared !== null)";
const TAKEOVER_ANSWER_END = "      batch: exchange.batch,\n      receipt,\n    });\n";
const TAKEOVER = "takeover: accepted";

// [id, edits, sweep, scope, outside reason?]
const faults = [
  ["review 11 default parameter: a helper whose default argument is the record mints early", [[C, TAKEOVER_RECEIPT, `${TAKEOVER_RECEIPT}\n    const reserve = (target: ExecutionRecord = record): Receipt =>\n      this.#mint("dispatch_intent", target);\n    reserve();`]], TAKEOVER],
  ["review 11 shadowed undefined: a local named undefined advances the acceptance index", [[C, TAKEOVER_RECEIPT, `${TAKEOVER_RECEIPT}\n    const undefined = record;\n    undefined.nextAcceptancePosition = position + 1;`]], TAKEOVER],
  ["C1 review 10: takeover receipt minted through this.#mint", [[C, TAKEOVER_RECEIPT, 'const receipt = this.#mint("dispatch_intent", record);']], TAKEOVER],
  ["C2 review 10: takeover index advanced by a postfix increment", [[C, TAKEOVER_POSITION, TAKEOVER_POSITION.replace("record.nextAcceptancePosition;", "record.nextAcceptancePosition++;")]], TAKEOVER],
  ["C3 compound assignment in an initializer", [[C, TAKEOVER_POSITION, TAKEOVER_POSITION.replace("record.nextAcceptancePosition;", "(record.nextAcceptancePosition += 1) - 1;")]], TAKEOVER],
  ["C4 early append through a const alias", [[C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const receiptsAlias = record.receipts;\n    appendOwn(receiptsAlias, receipt);`], [C, TAKEOVER_APPEND, "    if (cleared !== null)"]], TAKEOVER],
  ["C5 early append through a fresh container holding a Kernel list", [[C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const plan = { list: record.receipts };\n    appendOwn(plan.list, receipt);`], [C, TAKEOVER_APPEND, "    if (cleared !== null)"]], TAKEOVER],
  ["C6 early write inside a local closure", [[C, TAKEOVER_SUBMISSION, `${TAKEOVER_SUBMISSION}\n    const retire = (): void => {\n      exchange.submission = submission;\n    };\n    retire();`]], TAKEOVER],
  ["C7 a Kernel list widened, disguised as a string and appended to through a helper", [[C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const widened: unknown = record.receipts;\n    const disguised = widened as string;\n    const launder = (text: string): void => {\n      appendOwn(text as unknown as Receipt[], receipt);\n    };\n    launder(disguised);`], [C, TAKEOVER_APPEND, "    if (cleared !== null)"]], TAKEOVER],
  ["C9 a refusal recorded without exiting", [[C, TAKEOVER_POSITION, `this.#refusal("stale_exchange", "probe", record);\n    ${TAKEOVER_POSITION}`]], TAKEOVER],
  ["C11 the Driver handed the attempt before it is recorded", [[C, "    this.#deliver(exchange);\n\n    return answer;", "    return answer;"], [C, TAKEOVER_APPEND, "    this.#deliver(exchange);\n    appendOwn(record.receipts, receipt);\n    if (cleared !== null)"]], TAKEOVER],
  ["C13 the recovery answer projected after the commit (round 6 H7)", [[C, "    const answer = ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });\n    applyControlCommit(record, exchange, commit);\n    return answer;", "    applyControlCommit(record, exchange, commit);\n    return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed: true });"]], "recover: enter a code hold"],
  ["C14 holds written before their history append (round 6 H3)", [[C, "  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);\n  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;", "  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;\n  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);"]], "report: enter a protocol hold without"],
  ["C15 an early write through a binding set by logical assignment", [[C, TAKEOVER_SUBMISSION, `${TAKEOVER_SUBMISSION}\n    let target: ActivationRecord | undefined;\n    target ??= exchange;\n    target.submission = submission;`]], TAKEOVER],
  ["C16 an early truncation through an object whose constructor keeps a Kernel list", [[C, "const mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {", "class ListHolder {\n  readonly list: Receipt[];\n  constructor(list: Receipt[]) {\n    this.list = list;\n  }\n}\n\nconst mapSet = <K, V>(map: Map<K, V>, key: K, value: V): void => {"], [C, TAKEOVER_POSITION, `${TAKEOVER_POSITION}\n    const holder = new ListHolder(record.receipts);\n    holder.list.length = 0;`]], TAKEOVER],
  ["C8 foreign code after the decision is being built", [[C, TAKEOVER_ANSWER_END, `${TAKEOVER_ANSWER_END}    hostMember(caller, "controlScopes");\n`]], TAKEOVER, "a host read with no state change: nothing a fault can reveal (static guard)"],
  ["C10 a builder that also changes module state", [[C, "const mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant =>\n  PrimordialObjectFreeze({ executionId, activationId, writerEpoch });", "let grantsMinted = 0;\nconst mintSubmission = (executionId: string, activationId: string, writerEpoch: number): SubmissionGrant => {\n  grantsMinted += 1;\n  return PrimordialObjectFreeze({ executionId, activationId, writerEpoch });\n};"]], TAKEOVER, "module state outside every Execution: invisible at the boundary (static guard)"],
  ["C12 a protocol hold written before its record is built", [[C, "    const reason = `the response of the attempt", "    exchange.protocolFailureHold = null;\n    const reason = `the response of the attempt"]], "report: enter a protocol hold without", "the write stores the null the exchange already holds on that path: runtime-equivalent (static guard)"],
];

const reads = [
  ["review 11 READ-01: inspection reads a member introduced through a Pick cast", [[C, "    return ok(viewOf(record));", '    const summary: Pick<ExecutionRecord, "executionId"> = record;\n    (summary as { executionId: string; resultingEpoch: number }).resultingEpoch;\n    return ok(viewOf(record));']], "inspection.test.ts"],
  ["R1 quoted binding name reads the optional controlScopes", [[C, CONTROLS, '  const { "controlScopes": controls } = caller;']], "control-authority.test.ts"],
  ["R2 computed binding name reads the optional controlScopes", [[C, CONTROLS, '  const { ["controlScopes"]: controls } = caller;']]],
  ["R3 assignment destructuring reads the optional controlScopes", [[C, CONTROLS, "  let controls: readonly string[] | undefined;\n  ({ controlScopes: controls } = caller);"]]],
  ["R4 bare binding reads the optional controlScopes", [[C, CONTROLS, "  const { controlScopes: controls } = caller;"]]],
  ["R5 a cast makes the optional controlScopes required", [[C, CONTROLS, "  const controls: readonly string[] | undefined = (caller as Required<AuthenticatedCaller>).controlScopes;"]]],
  ["R6 a rest copy then an optional read", [[C, CONTROLS, "  const { ...hostView } = caller;\n  const controls = hostView.controlScopes;"]]],
  ["R8 a String.prototype method replaces an index read", [[E, '    const bracketed = issue.path.length > 0 && (issue.path[0] as string) === "[";', '    const bracketed = issue.path.startsWith("[");']]],
  ["R11 a lib global read after load", [[E, "      return PrimordialReflectApply(PrimordialStringSlice, reason, [0, DIAGNOSTIC_LIMIT]) as string;", "      return String.prototype.slice.call(reason, 0, DIAGNOSTIC_LIMIT);"]]],
  ["R12 a caller envelope read directly", [[C, "    const named = captureAttempt(request, issues);\n    if (named === null) {\n      return err(this.#refusal(\"malformed_value\", `takeover request", "    const named = request.writerEpoch === undefined ? null : captureAttempt(request, issues);\n    if (named === null) {\n      return err(this.#refusal(\"malformed_value\", `takeover request"]]],
  ["K1 hostMember walks on to the built-in prototypes", [[E, "  while (current !== null && current !== PrimordialObjectPrototype && current !== PrimordialFunctionPrototype) {", "  while (current !== null) {"]]],
  ["K2 an ordinary descriptor literal in defineData", [[O, "  PrimordialDefineProperty(target, key, descriptor as PropertyDescriptor);\n};", "  PrimordialDefineProperty(target, key, { value, writable, enumerable, configurable });\n};"]]],
  ["K3 an ordinary read of the optional controlScopes", [[C, CONTROLS, "  const controls = caller.controlScopes;"]]],
  ["R7 an in-operator guard consults the prototype chain", [[C, CONTROLS, '  const controls = "controlScopes" in caller ? (hostMember(caller, "controlScopes") as readonly string[] | undefined) : undefined;']], undefined, "`in` asks [[HasProperty]], which no accessor observes, and the guarded read is hostMember's: runtime-equivalent (static guard)"],
  ["R9 the occurrences suffix access respelled as an ordinary optional access", [[V, "      (entry as { occurrences: number }).occurrences += 1;", "      (entry as { occurrences?: number }).occurrences = ((entry as { occurrences?: number }).occurrences ?? 0) + 1;"]], undefined, "every suffix entry owns `occurrences`, so the respelled read is an own read: runtime-equivalent (static guard)"],
  ["R10 SELF-R7-UNSUPPORTED-01 restored: name written through [[Set]]", [[U, '  override readonly name = "UnsupportedKernelSurfaceError";\n', ""], [U, "    this.surface = surface;", '    this.name = "UnsupportedKernelSurfaceError";\n    this.surface = surface;']], undefined, "the write stops at Error.prototype, which the sweep does not poison (ambient-reads.test.ts's runtime case rejects it)"],
];

const snapshot = mkdtempSync(join(tmpdir(), "k12c1-r8-sweeps-"));
cpSync(join(root, "packages/kernel"), join(snapshot, "packages/kernel"), { recursive: true });
for (const name of ["package.json", "tsconfig.json"]) cpSync(join(root, name), join(snapshot, name));
console.log(`ENV node=${process.version} platform=${process.platform} arch=${process.arch} fault-mutants=${faults.length} read-mutants=${reads.length}`);

const node = (cwd, args, timeout = 1_800_000) => {
  const run = spawnSync(process.execPath, args, { cwd, encoding: "utf8", timeout, maxBuffer: 256 * 1024 * 1024 });
  return { status: run.status, signal: run.signal, error: run.error, output: `${run.stdout ?? ""}${run.stderr ?? ""}`, stdout: run.stdout ?? "" };
};
const faultSweep = (cwd, filter) => {
  const run = node(cwd, ["--experimental-strip-types", "--no-warnings", "packages/kernel/tests/sweep/fault-child.ts", "--scenarios", filter]);
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    return { run, violations: -1, first: run.output.slice(-600) };
  }
  const first = report.results.flatMap((result) => result.violations.map((violation) => `${result.name}: ${violation}`))[0] ?? "";
  return { run, violations: report.violations, runs: report.runs, first };
};
const catalog = (cwd) => {
  const run = node(cwd, ["--test", "--experimental-strip-types", "--test-reporter=spec", "packages/kernel/tests/poison-catalog.test.ts"]);
  const failed = [...run.output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]);
  return { run, failed };
};
const wholeSuite = (cwd, files, expectFirings) =>
  node(cwd, ["--experimental-strip-types", "--no-warnings", "packages/kernel/tests/sweep/run-poison-sweep.ts", "--modes", "count", "--files", files, ...(expectFirings ? ["--expect-firings"] : [])]);

const withCopy = (edits, work) => {
  const dir = mkdtempSync(join(tmpdir(), "k12c1-r8-mutant-"));
  try {
    cpSync(join(snapshot, "packages/kernel"), join(dir, "packages/kernel"), { recursive: true });
    for (const name of ["package.json", "tsconfig.json"]) cpSync(join(snapshot, name), join(dir, name));
    symlinkSync(resolve(root, "node_modules"), join(dir, "node_modules"), "dir");
    for (const [file, find, replacement] of edits) {
      const path = join(dir, "packages/kernel/src", file);
      const source = readFileSync(path, "utf8");
      assert.equal(source.split(find).length, 2, `unique anchor in ${file}: ${find.slice(0, 60)}`);
      writeFileSync(path, source.replace(find, () => replacement));
    }
    return work(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

let failures = 0;
try {
  // Clean controls on the pinned snapshot.
  withCopy([], (dir) => {
    for (const filter of [...new Set(faults.map(([, , scope]) => scope))]) {
      const clean = faultSweep(dir, filter);
      const ok = clean.run.status === 0 && clean.violations === 0;
      if (!ok) failures += 1;
      console.log(`${ok ? "CONTROL" : "CONTROL FAILED"} fault sweep "${filter}": exit=${clean.run.status} runs=${clean.runs} violations=${clean.violations}${ok ? "" : ` first: ${clean.first}`}`);
    }
    const cleanCatalog = catalog(dir);
    const ok = cleanCatalog.run.status === 0 && cleanCatalog.failed.length === 0;
    if (!ok) failures += 1;
    console.log(`${ok ? "CONTROL" : "CONTROL FAILED"} catalog poison sweep: exit=${cleanCatalog.run.status} failed=${cleanCatalog.failed.length}`);
    for (const files of ["inspection.test.ts", "control-authority.test.ts"]) {
      const clean = wholeSuite(dir, files, false);
      const passed = clean.status === 0 && /POISON SWEEP PASSED/.test(clean.output);
      if (!passed) failures += 1;
      console.log(`${passed ? "CONTROL" : "CONTROL FAILED"} whole-suite poison sweep (count) over ${files}: exit=${clean.status}`);
    }
  });

  for (const [id, edits, filter, outside] of faults) {
    withCopy(edits, (dir) => {
      const result = faultSweep(dir, filter);
      const rejected = result.run.status === 1 && result.violations > 0;
      const verdict = outside === undefined ? (rejected ? "REJECTED" : "SURVIVED") : rejected ? "OUTSIDE (detected anyway)" : "OUTSIDE (expected)";
      if (verdict === "SURVIVED") failures += 1;
      console.log(`${verdict} fault: ${id}: sweep "${filter}" exit=${result.run.status} violations=${result.violations}`);
      if (rejected) console.log(`  first violation: ${result.first}`);
      if (outside !== undefined) console.log(`  why a runtime sweep cannot see it: ${outside}`);
    });
  }

  for (const [id, edits, wholeSuiteFiles, outside] of reads) {
    withCopy(edits, (dir) => {
      const result = catalog(dir);
      const rejected = result.run.status !== 0 && result.failed.some((name) => /no zone frame reaches a poisoned member/.test(name));
      const verdict = outside === undefined ? (rejected ? "REJECTED" : "SURVIVED") : rejected ? "OUTSIDE (detected anyway)" : "OUTSIDE (expected)";
      if (verdict === "SURVIVED") failures += 1;
      console.log(`${verdict} read: ${id}: catalog sweep exit=${result.run.status}; failing: ${result.failed.slice(0, 3).join(" | ") || "none"}`);
      if (outside !== undefined) console.log(`  why a runtime sweep cannot see it: ${outside}`);
      if (wholeSuiteFiles !== undefined) {
        const suite = wholeSuite(dir, wholeSuiteFiles, true);
        const detected = suite.status === 0 && /NEGATIVE CONTROL DETECTED/.test(suite.output);
        if (!detected) failures += 1;
        const firing = /ZONE FIRING (.+)/.exec(suite.output)?.[1] ?? "none";
        console.log(`  ${detected ? "REJECTED" : "SURVIVED"} by the whole-suite poison sweep over ${wholeSuiteFiles}: first firing ${firing}`);
      }
    });
  }
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
console.log(failures === 0 ? "ALL SWEEP NEGATIVE CONTROLS REJECTED; CLEAN CONTROLS PASSED" : `${failures} clean-control failures or surviving mutants`);
process.exitCode = failures === 0 ? 0 : 1;
