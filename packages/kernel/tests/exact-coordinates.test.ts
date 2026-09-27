/** Review-04 P4 port, with adjacent coordinates and both terminal forms (DEC-4 closure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionCoordinator } from "../src/index.ts";
import { diagnosticIdentity } from "../src/envelope.ts";
import { accepted, caller, createRequest, delayedDriver, outcomeFor, refused, submissionFor } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";
// Independent spelling oracle for the binding's documented injective composition.
const packed = (parts: string[]) => parts.map(part => `${part.length}:${part}`).join("");
const available = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
for (const namespace of ["actor-é", "actor-\ud800"]) for (const step of ["complete", "fail"] as const) {
  test(`DEC-4 exact retained coordinates: ${JSON.stringify(namespace)} ${step}`, () => {
    const scope = "tenant-é", who = caller(namespace, scope), driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    function run(key: string) {
      const { executionId } = accepted(kernel.createExecution(who, createRequest({ scope, creationKey: key })));
      const view = () => accepted(kernel.inspect(who, executionId));
      const extra = accepted(kernel.submitInput(who, { destination: executionId, requestKey: "extra", kind: "application.note", payload: 1 }));
      const open = accepted(kernel.dispatch(who, executionId, { bound: 2 }));
      assert.equal(diagnosticIdentity(open.activationId), "<identity omitted>");
      assert.equal(diagnosticIdentity(executionId), "<identity omitted>");
      const oldGrant = submissionFor(driver, open.activationId);
      const oldReport = driver.settlements[driver.settlements.length - 1]!;
      assert.equal(oldGrant.executionId, executionId);
      assert.equal(oldGrant.activationId, open.activationId);
      accepted(kernel.redeliver(who, executionId));
      assert.strictEqual(submissionFor(driver, open.activationId), oldGrant);
      const held = accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: { ...available, progressCodecs: [] } }));
      assert.equal(held.activationId, open.activationId);
      assert.equal(held.recoveryHolds[0]?.activationId, open.activationId);
      assert.equal(view().recoveryHolds[0]?.activationId, open.activationId);
      const clear = accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available }));
      assert.equal(clear.activationId, open.activationId);
      const protocol = accepted(kernel.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 1 }));
      assert.equal(protocol.activationId, open.activationId);
      assert.equal(protocol.recoveryHolds[0]?.activationId, open.activationId);
      assert.equal(view().recoveryHolds[0]?.activationId, open.activationId);
      assert.equal(accepted(kernel.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 1 })).activationId, open.activationId);
      const taken = accepted(kernel.requestTakeover(who, executionId, { activationId: open.activationId, writerEpoch: 1 }));
      assert.equal(taken.activationId, open.activationId);
      assert.deepEqual(taken.batch, open.batch);
      const grant = submissionFor(driver, open.activationId);
      assert.notStrictEqual(grant, oldGrant);
      assert.equal(grant.activationId, open.activationId);
      assert.equal(grant.executionId, executionId);
      assert.equal(grant.writerEpoch, 2);
      // Both hold-ending acceptance paths must retain actor and exchange coordinates, too (X16).
      accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: { ...available, progressCodecs: [] } }));
      accepted(kernel.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 2 }));
      const proposal = outcomeFor(executionId, taken, { emissions: [{ emissionKey: "draft-é", value: { text: "first" } }] });
      const first = accepted(kernel.submitOutcome(who, proposal, grant));
      assert.equal(first.activationId, open.activationId);
      assert.equal(first.emissionIds[0], `emission-${packed([executionId, open.activationId, "draft-é"])}`);
      const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
      assert.notEqual(next.activationId, open.activationId);
      assert.equal(next.baseProgressRevision, 1);
      const queued = accepted(kernel.submitInput(who, { destination: executionId, requestKey: "outside", kind: "application.note", payload: 2 }));
      const last = accepted(kernel.submitOutcome(who, outcomeFor(executionId, next, { emissions: [{ emissionKey: "draft-é", value: { text: "last" } }], next: step === "complete" ? { step, result: 3 } : { step, error: 4 } }), submissionFor(driver, next.activationId)));
      assert.equal(last.activationId, next.activationId);
      assert.equal(last.resultId, `result-${packed([executionId, next.activationId])}`);
      assert.notEqual(first.emissionIds[0], last.emissionIds[0], "same local key across exchanges stays distinct");
      const final = view();
      assert.deepEqual(final.emissions.map(e => [e.activationId, e.emissionKey, e.emissionId, e.value]), [
        [open.activationId, "draft-é", first.emissionIds[0], { text: "first" }],
        [next.activationId, "draft-é", `emission-${packed([executionId, next.activationId, "draft-é"])}`, { text: "last" }],
      ]);
      assert.equal(final.result?.activationId, next.activationId);
      assert.equal(final.result?.resultId, last.resultId);
      assert.equal(final.result?.kind, step === "complete" ? "completed" : "failed");
      assert.equal(final.result?.value, step === "complete" ? 3 : 4);
      assert.strictEqual(final.result?.receipt, last.receipt);
      for (const entry of final.mailbox.slice(0, 2)) assert.deepEqual(entry.disposition, { kind: "acknowledged", activationId: open.activationId });
      assert.ok(first.acknowledged.includes(extra.eventId));
      assert.deepEqual(last.terminalDispositions, [queued.eventId]);
      assert.equal(final.mailbox[2]?.disposition.kind, "terminal");
      assert.deepEqual(final.exchanges.map(e => [e.activationId, e.writerEpoch]), [[open.activationId, 2], [next.activationId, 1]]);
      assert.strictEqual(final.exchanges[0]?.dispatchReceipt, taken.receipt);
      assert.strictEqual(final.exchanges[0]?.outcomeReceipt, first.receipt);
      assert.strictEqual(final.emissions[0]?.receipt, first.receipt);
      assert.deepEqual(final.exchanges[0]?.deliveries.map(d => [d.activationId, d.writerEpoch]), [[open.activationId, 1], [open.activationId, 1], [open.activationId, 2]]);
      assert.deepEqual(final.exchanges[1]?.deliveries.map(d => [d.activationId, d.writerEpoch]), [[next.activationId, 1]]);
      for (const history of final.recoveryHistory) {
        assert.equal(history.activationId, open.activationId);
        assert.equal(history.actorNamespace, namespace);
        assert.equal(history.actorScope, scope);
        assert.ok(Object.isFrozen(history));
      }
      assert.ok(final.recoveryHistory.some(h => h.transition === "ended_by_outcome" && h.authority === "attempt_submission"));
      const replay = accepted(kernel.submitOutcome(who, proposal, undefined!));
      assert.strictEqual(replay.receipt, first.receipt);
      assert.deepEqual(replay, { ...first, replayed: true });
      assert.deepEqual(view(), final, "terminal replay is read-only");
      oldReport.failed("late native report");
      const after = view();
      const expected = { ...final, exchanges: final.exchanges.map((exchange, i) => i !== 0 ? exchange : {
        ...exchange, deliveries: exchange.deliveries.map((row, j) => j !== 0 ? row : { ...row, status: "failed", failure: "late native report" }),
      }) };
      assert.deepEqual(after, expected, "late report changes its original row only");
      const refusal = refused(kernel.submitOutcome(who, { ...proposal, progress: 99 }, undefined!));
      assert.equal(refusal.executionId, executionId);
      assert.equal(refusal.classification, "duplicate_conflict");
      assertOnlyRefusal(after, view(), refusal);
      return { first, last, executionId };
    }
    const a = run("k".repeat(200)), b = run("q".repeat(200));
    assert.equal(a.first.receipt.position, b.first.receipt.position);
    assert.notEqual(a.first.receipt.token, b.first.receipt.token, "equal-position receipts across Executions never collide");
    assert.notEqual(a.last.receipt.token, b.last.receipt.token);
  });
}
