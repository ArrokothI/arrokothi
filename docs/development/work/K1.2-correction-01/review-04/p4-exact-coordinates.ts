// Reviewer oracle: retained and returned coordinates stay exact for Kernel-minted Activation and
// Execution IDs that DEC-4 renders as "<identity omitted>" (non-ASCII scope, >128 units).
import assert from "node:assert/strict";
import { ExecutionCoordinator } from "../packages/kernel/src/index.ts";
import { packIdentity } from "../packages/kernel/src/identity.ts";
import { caller, createRequest, accepted, recordingDriver, submissionFor, outcomeFor } from "../packages/kernel/tests/harness.ts";
const scope = "tenant-é";
const who = caller("app-a", scope);
const driver = recordingDriver();
const kernel = new ExecutionCoordinator({ driver });
const missing = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: [] };
const results: Record<string, string> = {};
const check = (name: string, fn: () => void) => { try { fn(); results[name] = "ok"; } catch (e) { results[name] = "FAIL: " + String((e as Error).message).split("\n")[0].slice(0, 160); } };

function run(key: string) {
  const { executionId } = accepted(kernel.createExecution(who, createRequest({ creationKey: key, scope })));
  accepted(kernel.submitInput(who, { destination: executionId, requestKey: "extra", kind: "application.note", payload: 1 }));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 2 }));
  accepted(kernel.redeliver(who, executionId));
  const held = accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: missing }));
  const heldView = accepted(kernel.inspect(who, executionId)).recoveryHolds;
  accepted(kernel.recoverExecution(who, executionId, { ...{ activationId: open.activationId }, available: { ...missing, progressCodecs: ["inline-json@1"] } }));
  const protocol = accepted(kernel.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 1 }));
  const protocolView = accepted(kernel.inspect(who, executionId)).recoveryHolds;
  const taken = accepted(kernel.requestTakeover(who, executionId, { activationId: open.activationId, writerEpoch: 1 }));
  const first = accepted(kernel.submitOutcome(who, outcomeFor(executionId, taken, { emissions: [{ emissionKey: "draft", value: 1 }] }), submissionFor(driver, open.activationId)));
  const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const last = accepted(kernel.submitOutcome(who, outcomeFor(executionId, next, { emissions: [{ emissionKey: "draft", value: 2 }], next: { step: "complete", result: 3 } }), submissionFor(driver, next.activationId)));
  return { executionId, open, next, held, heldView, protocol, protocolView, first, last, view: accepted(kernel.inspect(who, executionId)) };
}
const a = run("k".repeat(200));
const b = run("q".repeat(200));
check("precondition: minted IDs are unrenderable", () => { assert.ok(a.open.activationId.length > 128); assert.ok(a.open.activationId.includes("é")); });
check("X17 decision.activationId exact", () => assert.equal(a.first.activationId, a.open.activationId));
check("X10 acknowledgment names exact Activation", () => {
  for (const entry of a.view.mailbox.slice(0, 2)) assert.deepEqual(entry.disposition, { kind: "acknowledged", activationId: a.open.activationId });
});
check("X11 code hold coordinate exact (answer and view)", () => { assert.equal(a.held.recoveryHolds[0]?.activationId, a.open.activationId); assert.equal(a.heldView[0]?.activationId, a.open.activationId); });
check("X21 protocol hold coordinate exact", () => assert.equal(a.protocolView[0]?.activationId, a.open.activationId));
check("X20 protocol answer exact", () => assert.equal(a.protocol.activationId, a.open.activationId));
check("X13 delivery rows exact", () => { for (const row of a.view.exchanges[0]!.deliveries) assert.equal(row.activationId, a.open.activationId); });
check("X8 Emission IDs distinct across exchanges with one key", () => assert.notEqual(a.first.emissionIds[0], a.last.emissionIds[0]));
check("X8 Emission ID derivation (K1.2-DEC-4)", () => assert.equal(a.first.emissionIds[0], `emission-${packIdentity([a.executionId, a.open.activationId, "draft"])}`));
check("X22 Emission record activationId exact", () => assert.equal(a.view.emissions[0]?.activationId, a.open.activationId));
check("X23 result record activationId exact", () => assert.equal(a.view.result?.activationId, a.next.activationId));
check("X9 result ID derivation (K1.2-DEC-4)", () => assert.equal(a.last.resultId, `result-${packIdentity([a.executionId, a.next.activationId])}`));
check("X15 Outcome receipts of two Executions distinct", () => { assert.equal(a.first.receipt.position, b.first.receipt.position); assert.notEqual(a.first.receipt.token, b.first.receipt.token); });
console.log(JSON.stringify(results, null, 1));
process.exitCode = Object.values(results).every(v => v === "ok") ? 0 : 1;
