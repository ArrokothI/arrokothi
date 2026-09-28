// Round 6 (contract revision 7, amendment 02): mutants of the recovery-control/history
// reconstruction and the same-mechanism host-member corrections. Each mutant replaces one exact
// span in a disposable copy of packages/kernel and runs the complete Kernel suite there, after a
// clean control on the same snapshot. A mutant is REJECTED only with at least one real failed test,
// passing tests alongside, and no cancelled/skipped/todo; a span not found exactly once aborts.
// Run from the repository root: node docs/development/work/K1.2-correction-01/ablations-06.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const C = "coordinator.ts";
const E = "envelope.ts";
const O = "own-array.ts";
const RECOVER_APPLY =
  "    const answer = ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });\n    applyControlCommit(record, exchange, commit);\n    return answer;";
const PROTOCOL_APPLY =
  "    const answer = ok({ activationId: named.activationId, writerEpoch: currentEpoch, recoveryHolds: holdsOf(commit), changed: true });\n    applyControlCommit(record, exchange, commit);\n    return answer;";
const TAKEOVER_WRITES =
  "    if (cleared !== null) appendOwn(record.recoveryHistory, cleared);\n    record.nextAcceptancePosition = position + 1;\n    exchange.submission = submission;\n    exchange.activation = activation;\n    exchange.receipt = receipt;\n    exchange.protocolFailureHold = null;";

const mutations = [
  // K12C1-R9-HISTORY-01: restore the inherited optional read.
  ["H1 hold history built from an entry whose resultingEpoch is optional (review 09's read)", C,
    '  PrimordialObjectFreeze({ activationId, writerEpoch, cause, transition, reason, authority: "control" as const, actorNamespace, actorScope });',
    '  ((entry: { readonly activationId: string; readonly writerEpoch: number; readonly cause: RecoveryHistoryRecord["cause"]; readonly transition: RecoveryHistoryRecord["transition"]; readonly reason: string; readonly actorNamespace: string; readonly actorScope: string; readonly resultingEpoch?: number }): RecoveryHistoryRecord =>\n    entry.resultingEpoch === undefined\n      ? PrimordialObjectFreeze({ activationId: entry.activationId, writerEpoch: entry.writerEpoch, cause: entry.cause, transition: entry.transition, reason: entry.reason, authority: "control" as const, actorNamespace: entry.actorNamespace, actorScope: entry.actorScope })\n      : PrimordialObjectFreeze({ activationId: entry.activationId, writerEpoch: entry.writerEpoch, cause: entry.cause, transition: entry.transition, reason: entry.reason, authority: "control" as const, actorNamespace: entry.actorNamespace, actorScope: entry.actorScope, resultingEpoch: entry.resultingEpoch }))({ activationId, writerEpoch, cause, transition, reason, actorNamespace, actorScope });'],
  ["H2 the apply step reads an optional member of the planned commit", C,
    "  const stored = commit.history;",
    "  const stored = (commit as ControlCommit & { readonly resultingEpoch?: number }).resultingEpoch === undefined ? commit.history : PrimordialObjectFreeze({ ...commit.history, resultingEpoch: (commit as ControlCommit & { readonly resultingEpoch?: number }).resultingEpoch });"],
  // K12C1-R9-HISTORY-01: move history after mutation.
  ["H3 apply step writes the holds before appending their history", C,
    "  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);\n  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;",
    "  exchange.codeHold = commit.codeHold;\n  exchange.protocolFailureHold = commit.protocolFailureHold;\n  const stored = commit.history;\n  appendOwn(record.recoveryHistory, stored);"],
  ["H4 protocol report mutates the hold, then builds its history and answer (review 09's order)", C,
    PROTOCOL_APPLY,
    '    exchange.protocolFailureHold = commit.protocolFailureHold;\n    appendOwn(record.recoveryHistory, holdHistoryRecord(named.activationId, currentEpoch, "protocol_failure", "entered", reason, caller.namespace, record.scope));\n    return ok({ activationId: named.activationId, writerEpoch: currentEpoch, recoveryHolds: holdsOf(exchange), changed: true });'],
  ["H5 code hold mutated, then its history record built", C,
    RECOVER_APPLY,
    "    exchange.codeHold = commit.codeHold;\n    appendOwn(record.recoveryHistory, PrimordialObjectFreeze({ ...commit.history }));\n    return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed: true });"],
  ["H6 takeover replaces the attempt, then builds its clearing record", C,
    TAKEOVER_WRITES,
    "    record.nextAcceptancePosition = position + 1;\n    exchange.submission = submission;\n    exchange.activation = activation;\n    exchange.receipt = receipt;\n    exchange.protocolFailureHold = null;\n    if (clearedHold !== null) appendOwn(record.recoveryHistory, takeoverHistoryRecord(named.activationId, currentEpoch, `takeover to writer epoch ${writerEpoch} cleared the protocol-failure hold: ${clearedHold.reason}`, caller.namespace, record.scope, writerEpoch));"],
  ["H7 recovery answer projected after the decision is applied", C,
    RECOVER_APPLY,
    "    applyControlCommit(record, exchange, commit);\n    return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed: true });"],
  ["H8 prebuilt recovery answer describes the holds before the decision", C,
    "writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });",
    "writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed: true });"],
  ["H9 takeover clearing record not retained", C,
    "    if (cleared !== null) appendOwn(record.recoveryHistory, cleared);\n",
    ""],
  ["H10 takeover record loses its resulting epoch", C,
    "    actorScope,\n    resultingEpoch,\n  });",
    "    actorScope,\n  });"],
  ["H11 declaration records claim attempt-submission authority", C,
    'authority: "control" as const, actorNamespace, actorScope });',
    'authority: "attempt_submission" as const, actorNamespace, actorScope });'],
  // Takeover commit prebuild: the new mint and apply sites.
  ["H12 takeover receipt token through the diagnostic spelling", C,
    '    const receipt = mintReceipt("dispatch_intent", position, record.executionId);',
    '    const receipt = mintReceipt("dispatch_intent", position, diagnosticIdentity(record.executionId));'],
  ["H13 takeover receipt not retained", C,
    "    appendOwn(record.receipts, receipt);\n    if (cleared !== null)",
    "    if (cleared !== null)"],
  ["H14 takeover acceptance index not advanced", C,
    "    record.nextAcceptancePosition = position + 1;\n",
    ""],
  // Same mechanism, trusted host members (correction DEC-8).
  ["H15 ordinary optional controlScopes read restored", C,
    '  const controls = hostMember(caller, "controlScopes") as readonly string[] | undefined;',
    "  const controls = caller.controlScopes;"],
  ["H16 ordinary optional isSafeToReplace call restored", C,
    '      const establish = hostMember(this.#driver, "isSafeToReplace");\n      safe = typeof establish === "function" && PrimordialReflectApply(establish, this.#driver, [exchange.activation]) === true;',
    "      safe = this.#driver.isSafeToReplace?.(exchange.activation) === true;"],
  ["H17 ordinary optional mailboxCapacity read restored", C,
    'hostMember(options, "mailboxCapacity")',
    "options.mailboxCapacity"],
  ["H18 ordinary optional emissionsPerOutcome read restored", C,
    'hostMember(options, "emissionsPerOutcome")',
    "options.emissionsPerOutcome"],
  ["H19 hostMember answers from Object.prototype", E,
    "  while (current !== null && current !== PrimordialObjectPrototype && current !== PrimordialFunctionPrototype) {",
    "  while (current !== null && current !== PrimordialFunctionPrototype) {"],
  ["H20 hostMember answers from Function.prototype", E,
    "  while (current !== null && current !== PrimordialObjectPrototype && current !== PrimordialFunctionPrototype) {",
    "  while (current !== null && current !== PrimordialObjectPrototype) {"],
  ["H21 hostMember ignores members the host's own prototype supplies", E,
    "    current = PrimordialGetPrototypeOf(current) as object | null;",
    "    current = null;"],
  ["H22 descriptor field read without its own-value check", O,
    "  if (fieldDescriptor === undefined || !hasOwnValue(fieldDescriptor)) return undefined;\n  return (fieldDescriptor as { readonly value?: unknown }).value;",
    "  return fieldDescriptor === undefined ? undefined : (fieldDescriptor as { readonly value?: unknown }).value;"],
];

const testFiles = readdirSync(join(root, "packages/kernel/tests")).filter((name) => name.endsWith(".test.ts")).sort().map((name) => `packages/kernel/tests/${name}`);
const args = ["--experimental-strip-types", "--test", "--test-reporter=spec", ...testFiles];
console.log(`ENV node=${process.version} platform=${process.platform} arch=${process.arch} files=${testFiles.length} mutants=${mutations.length}`);
console.log(`COMMAND ${JSON.stringify([process.execPath, ...args])}`);
// One pinned snapshot for the whole run; each mutant works on its own copy of it.
const snapshot = mkdtempSync(join(tmpdir(), "k12c1-r6-source-"));
cpSync(join(root, "packages/kernel"), join(snapshot, "packages/kernel"), { recursive: true });
cpSync(join(root, "package.json"), join(snapshot, "package.json"));
let controlTests;
let rejected = 0;
try {
  for (const mutation of [null, ...mutations]) {
    const work = mkdtempSync(join(tmpdir(), "k12c1-r6-ablation-"));
    try {
      cpSync(join(snapshot, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
      symlinkSync(resolve(root, "node_modules"), join(work, "node_modules"), "dir");
      cpSync(join(snapshot, "package.json"), join(work, "package.json"));
      if (mutation) {
        const [id, file, find, replacement] = mutation;
        const path = join(work, "packages/kernel/src", file);
        const source = readFileSync(path, "utf8");
        assert.equal(source.split(find).length, 2, `unique anchor: ${id}`);
        writeFileSync(path, source.replace(find, () => replacement));
      }
      const run = spawnSync(process.execPath, args, { cwd: work, encoding: "utf8", timeout: 900_000, maxBuffer: 64 * 1024 * 1024 });
      const output = (run.stdout ?? "") + (run.stderr ?? "");
      const count = (name) => Number(new RegExp(`^ℹ ${name} (\\d+)`, "m").exec(output)?.[1]);
      const tests = count("tests"), pass = count("pass"), fail = count("fail"), cancelled = count("cancelled"), skipped = count("skipped"), todo = count("todo");
      assert.ok(!run.error && run.signal === null && Number.isFinite(tests) && cancelled === 0 && skipped === 0 && todo === 0 && tests === pass + fail, output.slice(-4000));
      const failedNames = [...new Set([...output.matchAll(/^\s*✖ (.+?) \(\d/gm)].map((match) => match[1]))];
      let verdict = "CONTROL";
      if (!mutation) {
        assert.ok(run.status === 0 && fail === 0 && pass > 0, output.slice(-4000));
        controlTests = tests;
      } else {
        assert.equal(tests, controlTests, "a mutant runs the same complete suite as its control");
        const isRejected = run.status !== 0 && fail > 0 && pass > 0;
        verdict = isRejected ? "REJECTED" : "SURVIVED";
        if (isRejected) rejected += 1;
      }
      console.log(`${verdict} ${mutation?.[0] ?? "full Kernel suite"}: exit=${run.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled} skipped=${skipped} todo=${todo}`);
      for (const name of failedNames.slice(0, 6)) console.log(`  ${name}`);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }
} finally {
  rmSync(snapshot, { recursive: true, force: true });
}
console.log(`${rejected}/${mutations.length} round-6 mutants rejected by the full Kernel suite`);
process.exitCode = rejected === mutations.length ? 0 : 1;
