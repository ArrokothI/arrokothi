// Second-reviewer single-span ablations for H 312f258. Each mutant runs the FULL kernel suite
// (packages/kernel/tests/*.test.ts via an explicit file list) in a disposable package copy.
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const root = resolve(process.cwd());
const C = "coordinator.ts", E = "envelope.ts", O = "outcome.ts";
const all = [
  ["X1 Activation identity capped at 2^20 code units", E, '  if (typeof value === "string") return true;', '  if (typeof value === "string" && value.length <= 1_048_576) return true;'],
  ["X2 empty Activation identity treated as malformed", E, '  if (typeof value === "string") return true;', '  if (typeof value === "string" && value.length > 0) return true;'],
  ["X3 replay lookup skipped above the old 65,536 limit", C, 'const already = mapGet(record.acceptedOutcomes, activationId);', 'const already = activationId.length > 65_536 ? undefined : mapGet(record.acceptedOutcomes, activationId);'],
  ["X8 Emission ID derived from diagnostic Activation spelling", C, 'const emissionId = `emission-${packIdentity([record.executionId, activationId, emission.emissionKey])}`;', 'const emissionId = `emission-${packIdentity([record.executionId, diagnosticIdentity(activationId), emission.emissionKey])}`;'],
  ["X9 result ID derived from diagnostic Activation spelling", C, 'resultId: `result-${packIdentity([record.executionId, activationId])}`,', 'resultId: `result-${packIdentity([record.executionId, diagnosticIdentity(activationId)])}`,'],
  ["X10 acknowledged disposition names diagnostic Activation spelling", C, 'PrimordialObjectFreeze({ kind: "acknowledged" as const, activationId });', 'PrimordialObjectFreeze({ kind: "acknowledged" as const, activationId: diagnosticIdentity(activationId) });'],
  ["X11 code hold stores diagnostic Activation spelling", C, '        reason: missing,\n        activationId: pinned.activationId,', '        reason: missing,\n        activationId: diagnosticIdentity(pinned.activationId),'],
  ["X12 recovery history stores diagnostic Activation spelling", C, '          activationId: entry.activationId,\n          writerEpoch: entry.writerEpoch,\n          cause: entry.cause,\n          transition: entry.transition,\n          reason: entry.reason,\n          authority: entry.authority,\n          actorNamespace: entry.actorNamespace,\n          actorScope: entry.actorScope,\n        })', '          activationId: diagnosticIdentity(entry.activationId),\n          writerEpoch: entry.writerEpoch,\n          cause: entry.cause,\n          transition: entry.transition,\n          reason: entry.reason,\n          authority: entry.authority,\n          actorNamespace: entry.actorNamespace,\n          actorScope: entry.actorScope,\n        })'],
  ["X13 delivery row stores diagnostic Activation spelling", C, '      activationId: intent.activation.activationId,\n      writerEpoch: intent.activation.writerEpoch,\n    };', '      activationId: diagnosticIdentity(intent.activation.activationId),\n      writerEpoch: intent.activation.writerEpoch,\n    };'],
  ["X14 resolved exchange stores diagnostic Activation spelling", C, '    const resolved: ResolvedExchange = PrimordialObjectFreeze({\n      activationId,', '    const resolved: ResolvedExchange = PrimordialObjectFreeze({\n      activationId: diagnosticIdentity(activationId),'],
  ["X15 Outcome receipt token uses diagnostic Execution spelling", C, 'const receipt = mintReceipt("outcome_acceptance", acceptancePosition, record.executionId);', 'const receipt = mintReceipt("outcome_acceptance", acceptancePosition, diagnosticIdentity(record.executionId));'],
  ["X16 history actor namespace rendered lossy", C, '          actorNamespace: caller.namespace,\n          actorScope: record.scope,\n        }),\n      );\n    }\n    if (intent.protocolFailureHold !== null) {', '          actorNamespace: diagnosticIdentity(caller.namespace),\n          actorScope: record.scope,\n        }),\n      );\n    }\n    if (intent.protocolFailureHold !== null) {'],
  ["X17 decision answer activationId rendered lossy", C, '    const decision: Omit<OutcomeAccepted, "replayed"> = PrimordialObjectFreeze({\n      receipt,\n      activationId,', '    const decision: Omit<OutcomeAccepted, "replayed"> = PrimordialObjectFreeze({\n      receipt,\n      activationId: diagnosticIdentity(activationId),'],
  ["X18 takeover answer activationId rendered lossy", C, '    return ok({\n      activationId: named.activationId,\n      supersededEpoch: currentEpoch,', '    return ok({\n      activationId: diagnosticIdentity(named.activationId),\n      supersededEpoch: currentEpoch,'],
  ["X19 recovery answer activationId rendered lossy", C, 'return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed });', 'return ok({ activationId: diagnosticIdentity(pinned.activationId), writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed });'],
  ["X20 protocol answer activationId rendered lossy", C, 'return ok({ activationId: named.activationId, writerEpoch: currentEpoch, recoveryHolds: holdsOf(exchange), changed: true });', 'return ok({ activationId: diagnosticIdentity(named.activationId), writerEpoch: currentEpoch, recoveryHolds: holdsOf(exchange), changed: true });'],
  ["X21 protocol hold stores diagnostic Activation spelling", C, '      reason,\n      activationId: named.activationId,\n      writerEpoch: currentEpoch,\n    });', '      reason,\n      activationId: diagnosticIdentity(named.activationId),\n      writerEpoch: currentEpoch,\n    });'],
  ["X22 Emission record activationId rendered lossy", C, 'PrimordialObjectFreeze({ emissionId, emissionKey: emission.emissionKey, activationId, value: emission.value.value, receipt }),', 'PrimordialObjectFreeze({ emissionId, emissionKey: emission.emissionKey, activationId: diagnosticIdentity(activationId), value: emission.value.value, receipt }),'],
  ["X23 result record activationId rendered lossy", C, '        value: outcome.next.step === "complete" ? outcome.next.result.value : outcome.next.error.value,\n        activationId,', '        value: outcome.next.step === "complete" ? outcome.next.result.value : outcome.next.error.value,\n        activationId: diagnosticIdentity(activationId),'],
];
const only = process.argv[2] ? new Set(process.argv[2].split(",")) : null;
const mutations = only ? all.filter(m => only.has(m[0].split(" ")[0])) : all;
const testDir = join(root, "packages/kernel/tests");
const files = readdirSync(testDir).filter(f => f.endsWith(".test.ts")).sort().map(f => `packages/kernel/tests/${f}`);
let rejected = 0, survived = [];
for (const mutation of [null, ...mutations]) {
  const work = mkdtempSync(join(tmpdir(), "k12c1-r2nd-"));
  try {
    cpSync(join(root, "packages/kernel"), join(work, "packages/kernel"), { recursive: true });
    symlinkSync(join(root, "node_modules"), join(work, "node_modules"), "dir");
    if (mutation) {
      const [id, file, find, replacement] = mutation;
      const path = join(work, "packages/kernel/src", file);
      const source = readFileSync(path, "utf8");
      if (source.split(find).length !== 2) { console.log(`NOT APPLICABLE ${id}`); continue; }
      writeFileSync(path, source.replace(find, replacement));
    }
    const result = spawnSync(process.execPath, ["--test", "--test-reporter=spec", "--experimental-strip-types", ...files], { cwd: work, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    const out = result.stdout + result.stderr;
    const n = l => Number(new RegExp(`ℹ ${l} (\\d+)`).exec(out)?.[1] ?? NaN);
    const [tests, pass, fail, cancelled] = ["tests", "pass", "fail", "cancelled"].map(n);
    if (!mutation) { console.log(`CONTROL exit=${result.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled}`); if (result.status !== 0 || fail !== 0 || cancelled !== 0) throw Error("control failed"); continue; }
    const verdict = result.status !== 0 && fail > 0 && cancelled === 0 ? "REJECTED" : result.status === 0 && fail === 0 ? "SURVIVED" : "UNCLEAR";
    console.log(`${verdict} ${mutation[0]}: exit=${result.status} tests=${tests} pass=${pass} fail=${fail} cancelled=${cancelled}`);
    const failed = [...new Set([...out.matchAll(/^\s*✖ (.+?) \(\d/gm)].map(m => m[1]))].slice(0, 3);
    if (failed.length) console.log("   first failures: " + failed.join(" | ").slice(0, 400));
    if (verdict === "REJECTED") rejected++; else survived.push(mutation[0]);
  } finally { rmSync(work, { recursive: true, force: true }); }
}
console.log(`${rejected}/${mutations.length} rejected; survived: ${survived.join("; ") || "none"}`);
