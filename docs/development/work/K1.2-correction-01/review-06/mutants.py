#!/usr/bin/env python3
"""Reviewer mutation runner (review-06 draft). Each mutant: one exact-once span replacement in a
disposable copy of H's packages/kernel; full kernel suite; clean control first. A mutant counts as
REJECTED only with >=1 real failed test and 0 cancelled; missing anchors abort."""
import json, os, re, shutil, subprocess, sys
SP = os.environ["SP"]; H = f"{SP}/h"; OUT = f"{SP}/mut"
C = "packages/kernel/src/coordinator.ts"; V = "packages/kernel/src/values.ts"; E = "packages/kernel/src/envelope.ts"
MUTANTS = {
 # Exact retained/returned coordinates (DEC-4) not in review-04's X8-X23 list
 "Z1-mint-receipt-token": (C, "    return mintReceipt(boundary, position, record.executionId);", "    return mintReceipt(boundary, position, diagnosticIdentity(record.executionId));"),
 "Z2-creation-receipt-token": (C, 'const receipt = mintReceipt("creation", 1, executionId);', 'const receipt = mintReceipt("creation", 1, diagnosticIdentity(executionId));'),
 "Z3-activation-executionId": (C, "      executionId: record.executionId,\n      activationId,\n", "      executionId: diagnosticIdentity(record.executionId),\n      activationId,\n"),
 "Z4-activation-activationId": (C, "      executionId: record.executionId,\n      activationId,\n", "      executionId: record.executionId,\n      activationId: diagnosticIdentity(activationId),\n"),
 "Z5-takeover-activation-copy": (C, "PrimordialObjectFreeze({ ...exchange.activation, writerEpoch });", "PrimordialObjectFreeze({ ...exchange.activation, activationId: diagnosticIdentity(exchange.activation.activationId), writerEpoch });"),
 "Z6-replay-map-key": (C, "    mapSet(record.acceptedOutcomes, activationId, stored);", "    mapSet(record.acceptedOutcomes, diagnosticIdentity(activationId), stored);"),
 "Z7-event-destination": (C, "    destination: entry.inputId.destination,", "    destination: diagnosticIdentity(entry.inputId.destination),"),
 "Z8-redeliver-answer": (C, "      activationId: resent.activationId,", "      activationId: diagnosticIdentity(resent.activationId),"),
 "Z9-dispatch-grant-exec": (C, "      submission: mintSubmission(record.executionId, activationId, 1),", "      submission: mintSubmission(diagnosticIdentity(record.executionId), activationId, 1),"),
 "Z10-acknowledged-ids": (C, "        appendOwn(acknowledgedIds, entry.eventId);", "        appendOwn(acknowledgedIds, diagnosticIdentity(entry.eventId));"),
 "Z11-takeover-answer-batch-receipt": (C, "      supersededEpoch: currentEpoch,\n      writerEpoch,\n      baseProgressRevision: activation.baseProgressRevision,\n      batch: exchange.batch,\n      receipt,", "      supersededEpoch: currentEpoch,\n      writerEpoch,\n      baseProgressRevision: activation.baseProgressRevision,\n      batch: exchange.batch,\n      receipt: mintReceipt(\"dispatch_intent\", receipt.position, diagnosticIdentity(record.executionId)),"),
 "Z12-view-activation-id": (C, "const toActivationView = (intent: ActivationRecord): ActivationView => ({\n  activationId: intent.activation.activationId,", "const toActivationView = (intent: ActivationRecord): ActivationView => ({\n  activationId: diagnosticIdentity(intent.activation.activationId),"),
 "Z13-view-execution-id": (C, "    executionId: record.executionId,\n    state: record.state,", "    executionId: diagnosticIdentity(record.executionId),\n    state: record.state,"),
 "Z14-view-queued-ids": (C, "if (entry.disposition.kind === \"queued\") appendOwn(queued, entry.eventId);", "if (entry.disposition.kind === \"queued\") appendOwn(queued, diagnosticIdentity(entry.eventId));"),
 "Z15-view-mailbox-destination": (C, "  inputId: { ...entry.inputId },", "  inputId: { ...entry.inputId, destination: diagnosticIdentity(entry.inputId.destination) },"),
 "Z16-view-hold-activation": (C, "    const stored = intent.codeHold;\n    appendOwn(\n      holds,\n      PrimordialObjectFreeze({\n        cause: stored.cause,\n        reason: stored.reason,\n        activationId: stored.activationId,", "    const stored = intent.codeHold;\n    appendOwn(\n      holds,\n      PrimordialObjectFreeze({\n        cause: stored.cause,\n        reason: stored.reason,\n        activationId: diagnosticIdentity(stored.activationId),"),
 # Value-collector weights and bounds (DEC-7)
 "W1-located-drops-weight": (E, "    appendOwn(out, { ...issue, path });", "    appendOwn(out, { path, code: issue.code, message: issue.message });"),
 "W2-rootissues-drops-weight": (E, "      ? { path: issue.path, code: issue.code, message: issue.message, root }\n      : { path: issue.path, code: issue.code, message: issue.message, root, occurrences });", "      ? { path: issue.path, code: issue.code, message: issue.message, root }\n      : { path: issue.path, code: issue.code, message: issue.message, root });"),
 "W3-explain-drops-weight": (E, "(${occurrences} additional occurrences; locations omitted)", "(additional occurrences; locations omitted)"),
 "W4-suffix-first-code-only": (V, "    if (entry.code === issue.code) {", "    if (true) {"),
 "W5-details-unbounded-path": (V, "      path: issueText(issue.path, 128, \"<omitted>\"),", "      path: issue.path,"),
 "W6-render-counts-suffix-as-one": (E, "      const count = occurrences ?? 1;", "      const count = 1;"),
 "W7-suffix-steals-detail-slot": (E, "    if (occurrences === undefined && details < ISSUE_DETAIL_LIMIT) {", "    if (details < ISSUE_DETAIL_LIMIT) {"),
 "W8-order-last-occurrence": (V, "  appendOwn(issues, { path: \"\", code: issue.code, message: \"additional occurrences (locations omitted)\", occurrences: 1 });", "  const moved = { path: \"\", code: issue.code, message: \"additional occurrences (locations omitted)\", occurrences: 1 };\n  if (issues.length > 8) { const first = readAt(issues, 8) as ValueIssue; defineAt(issues, 8, moved); appendOwn(issues, first); return; }\n  appendOwn(issues, moved);"),
}
def run(tree):
    p = subprocess.run(["node", "--test", "--experimental-strip-types"] + sorted(f"packages/kernel/tests/{f}" for f in os.listdir(f"{tree}/packages/kernel/tests") if f.endswith(".test.ts")), cwd=tree, capture_output=True, text=True, timeout=900)
    out = p.stdout + p.stderr
    g = lambda k: int(m.group(1)) if (m := re.search(rf"^ℹ {k} (\d+)", out, re.M)) else -1
    fails = re.findall(r"^\s*✖ (.+?) \(", out, re.M)
    return {"exit": p.returncode, "tests": g("tests"), "pass": g("pass"), "fail": g("fail"), "cancelled": g("cancelled"), "failed_names": sorted(set(fails))[:12]}, out
def tree(name, mutation=None):
    d = f"{OUT}/{name}"; shutil.rmtree(d, ignore_errors=True); os.makedirs(f"{d}/packages")
    shutil.copytree(f"{H}/packages/kernel", f"{d}/packages/kernel", symlinks=True)
    os.symlink(f"{H}/node_modules", f"{d}/node_modules"); shutil.copy(f"{H}/package.json", f"{d}/package.json")
    if mutation:
        f, old, new = mutation; path = f"{d}/{f}"; s = open(path).read()
        n = s.count(old)
        if n != 1: raise SystemExit(f"{name}: anchor count {n}")
        open(path, "w").write(s.replace(old, new))
    return d
only = sys.argv[1:]
results = {}
ctl, out = run(tree("control")); results["control"] = ctl; print("control", json.dumps(ctl), flush=True)
if ctl["fail"] != 0 or ctl["cancelled"] != 0: raise SystemExit("control not clean")
for name, m in MUTANTS.items():
    if only and name not in only: continue
    r, out = run(tree(name, m)); r["verdict"] = "REJECTED" if r["fail"] > 0 and r["cancelled"] == 0 else ("SURVIVED" if r["fail"] == 0 and r["cancelled"] == 0 else "INCONCLUSIVE")
    results[name] = r; print(name, json.dumps(r), flush=True)
    open(f"{OUT}/{name}.log", "w").write(out)
json.dump(results, open(f"{OUT}/results-{len(only) or 'all'}.json", "w"), indent=1)
