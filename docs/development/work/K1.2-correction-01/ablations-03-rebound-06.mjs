// Round 6: rebind four review-04 mutation anchors to the reconstructed recovery-control code,
// preserving the round-3 runner and the sealed review-04 definitions byte for byte.
//
// Amendment 02's reconstruction deleted `appendRecoveryHistory` (the defective mechanism) and
// prebuilds the three control answers, so X12, X18, X19 and X20 name spans that no longer exist.
// This adapter changes only those four find/replace literals, to the spans that now carry the same
// retained or returned coordinate, with the same wrong semantics (the Activation ID through its
// lossy diagnostic spelling). Mutation IDs, test selection, the 35-test control and the verdict rule
// are unchanged. The unadapted runner is still run and its result disclosed (validation-06).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const runnerPath = "docs/development/work/K1.2-correction-01/ablations-03.mjs";
const source = readFileSync(runnerPath, "utf8");
assert.equal(createHash("sha256").update(source).digest("hex"), "fef23a334dd15f427bed658f915f8a48914b08253ca918b53b879ee5e83b1dc2", "round-3 runner unchanged");
const marker = "let rejected = 0;";
assert.equal(source.split(marker).length, 2);
const rebinding = String.raw`
// Round-6 rebinding (implementation 06): anchors only.
{
  const coordinator = readFileSync("packages/kernel/src/coordinator.ts", "utf8");
  const lossy = (text, from, to) => { assert.ok(text.includes(from), "rebinding target present: " + from); return text.split(from).join(to); };
  const span = (first, last) => {
    const start = coordinator.indexOf(first);
    const end = coordinator.indexOf(last, start) + last.length;
    assert.ok(start >= 0 && end > start, "rebinding span present: " + first);
    return coordinator.slice(start, end);
  };
  const historyBuilders = span(
    'PrimordialObjectFreeze({ activationId, writerEpoch, cause, transition, reason, authority: "control" as const, actorNamespace, actorScope });',
    "  PrimordialObjectFreeze({\n    activationId,\n    writerEpoch: supersededEpoch,",
  );
  const recoverAnswers = span(
    "      return ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(exchange), changed: false });",
    "    const answer = ok({ activationId: pinned.activationId, writerEpoch: pinned.writerEpoch, recoveryHolds: holdsOf(commit), changed: true });",
  );
  const takeoverAnswer = "    const answer = ok({\n      activationId: named.activationId,\n      supersededEpoch: currentEpoch,";
  const protocolAnswer = "const answer = ok({ activationId: named.activationId, writerEpoch: currentEpoch, recoveryHolds: holdsOf(commit), changed: true });";
  const rebound = {
    // Every hold/takeover history record (both builders), as X12 covered every appendRecoveryHistory record.
    X12: [historyBuilders, lossy(lossy(historyBuilders, "PrimordialObjectFreeze({ activationId, writerEpoch,", "PrimordialObjectFreeze({ activationId: diagnosticIdentity(activationId), writerEpoch,"), "    activationId,\n    writerEpoch: supersededEpoch,", "    activationId: diagnosticIdentity(activationId),\n    writerEpoch: supersededEpoch,")],
    X18: [takeoverAnswer, lossy(takeoverAnswer, "activationId: named.activationId,", "activationId: diagnosticIdentity(named.activationId),")],
    // Both recovery answers, as X19's single return statement served both.
    X19: [recoverAnswers, lossy(recoverAnswers, "activationId: pinned.activationId,", "activationId: diagnosticIdentity(pinned.activationId),")],
    X20: [protocolAnswer, lossy(protocolAnswer, "activationId: named.activationId,", "activationId: diagnosticIdentity(named.activationId),")],
  };
  let count = 0;
  for (const mutation of mutations) {
    const id = mutation[0].split(" ")[0];
    if (!(id in rebound)) continue;
    assert.ok(!coordinator.includes(mutation[2]), "stale rebinding: the original anchor of " + id + " still exists");
    [mutation[2], mutation[3]] = rebound[id];
    count += 1;
    console.log("REBOUND anchor only: " + mutation[0]);
  }
  if (count !== 4 || mutations.length !== 21) throw Error("revision-4 mutation inventory changed");
}
`;
const directory = mkdtempSync(join(tmpdir(), "k12c1-r6-rebound-"));
try {
  const script = join(directory, "rebound.mjs");
  writeFileSync(script, source.replace(marker, () => rebinding + "\n" + marker));
  console.log(`Round-3 runner SHA-256 verified (${runnerPath}); rebinding only X12/X18/X19/X20 anchors.`);
  const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.signal) throw Error(`rebound runner terminated by ${result.signal}`);
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
