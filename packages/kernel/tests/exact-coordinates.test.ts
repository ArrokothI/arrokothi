/** Review-04 P4 port, with adjacent coordinates and both terminal forms (DEC-4 closure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionCoordinator, type Receipt, type ReceiptBoundary } from "../src/index.ts";
import { diagnosticIdentity } from "../src/envelope.ts";
import { accepted, caller, createRequest, delayedDriver, outcomeFor, refused, submissionFor } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";
// Independent spelling oracle for the binding's documented injective composition.
const packed = (parts: string[]) => parts.map(part => `${part.length}:${part}`).join("");
const receiptAt = (executionId: string, boundary: ReceiptBoundary, position: number): Receipt => ({
  boundary,
  token: `${({ creation: "crt", input_ingress: "inp", dispatch_intent: "dsp", outcome_acceptance: "out" })[boundary]}:${executionId}:${position}`,
  position,
});
const available = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
for (const namespace of ["actor-é", "actor-\ud800"]) for (const step of ["complete", "fail"] as const) {
  test(`DEC-4 exact retained coordinates: ${JSON.stringify(namespace)} ${step}`, () => {
    const scope = "tenant-é", who = caller(namespace, scope), driver = delayedDriver();
    const kernel = new ExecutionCoordinator({ driver });
    function run(key: string) {
      // Derive expectations from the chosen inputs, never from another Kernel answer or view.
      // K1.1's creation/ingress coordinates flow into K1.2 and belong to DEC-4's exactness proof.
      const executionId = `execution-${packed([namespace, scope, key])}`;
      const initialEventId = `event-creation-${packed([namespace, scope, key])}`;
      const extraEventId = `event-${packed([namespace, executionId, "extra"])}`;
      const outsideEventId = `event-${packed([namespace, executionId, "outside"])}`;
      const activationId = `${executionId}/activation-1`;
      const nextActivationId = `${executionId}/activation-2`;
      const batch = [initialEventId, extraEventId];
      const create = createRequest({ scope, creationKey: key });
      const created = accepted(kernel.createExecution(who, create));
      assert.deepEqual(created, { executionId, receipt: receiptAt(executionId, "creation", 1), replayed: false, initialEventId });
      const view = () => accepted(kernel.inspect(who, executionId));
      const extra = accepted(kernel.submitInput(who, { destination: executionId, requestKey: "extra", kind: "application.note", payload: 1 }));
      assert.deepEqual(extra, { eventId: extraEventId, receipt: receiptAt(executionId, "input_ingress", 2), replayed: false, acceptancePosition: 2, disposition: { kind: "queued" } });
      const beforeDispatch = view();
      assert.equal(beforeDispatch.executionId, executionId);
      assert.equal(beforeDispatch.scope, scope);
      assert.equal(beforeDispatch.creationKey, key);
      assert.deepEqual(beforeDispatch.queued, batch);
      assert.deepEqual(beforeDispatch.mailbox.map(entry => ({ eventId: entry.eventId, inputId: entry.inputId, receipt: entry.receipt })), [
        { eventId: initialEventId, inputId: { producerNamespace: namespace, destination: executionId, requestKey: key }, receipt: receiptAt(executionId, "creation", 1) },
        { eventId: extraEventId, inputId: { producerNamespace: namespace, destination: executionId, requestKey: "extra" }, receipt: receiptAt(executionId, "input_ingress", 2) },
      ]);
      const open = accepted(kernel.dispatch(who, executionId, { bound: 2 }));
      assert.deepEqual(open, { activationId, writerEpoch: 1, baseProgressRevision: 0, batch, receipt: receiptAt(executionId, "dispatch_intent", 3), redelivered: false });
      const delivered = driver.seen[driver.seen.length - 1]!;
      assert.equal(delivered.executionId, executionId);
      assert.equal(delivered.activationId, activationId);
      assert.deepEqual(delivered.events, [
        { eventId: initialEventId, destination: executionId, kind: "application.request", payload: { text: "report for week 37" }, sourceCategory: "application_input", acceptancePosition: 1 },
        { eventId: extraEventId, destination: executionId, kind: "application.note", payload: 1, sourceCategory: "application_input", acceptancePosition: 2 },
      ]);
      assert.ok(Object.isFrozen(delivered.events));
      for (const event of delivered.events) assert.ok(Object.isFrozen(event));
      assert.deepEqual(view().activation, { activationId, writerEpoch: 1, baseProgressRevision: 0, batch, receipt: receiptAt(executionId, "dispatch_intent", 3), deliveries: [
        { attempt: 1, status: "pending", failure: null, activationId, writerEpoch: 1 },
      ] });
      assert.equal(diagnosticIdentity(open.activationId), "<identity omitted>");
      assert.equal(diagnosticIdentity(executionId), "<identity omitted>");
      const oldGrant = submissionFor(driver, open.activationId);
      const oldReport = driver.settlements[driver.settlements.length - 1]!;
      assert.equal(oldGrant.executionId, executionId);
      assert.equal(oldGrant.activationId, open.activationId);
      const resent = accepted(kernel.redeliver(who, executionId));
      assert.deepEqual(resent, { activationId, writerEpoch: 1, baseProgressRevision: 0, batch, receipt: receiptAt(executionId, "dispatch_intent", 3), redelivered: true });
      assert.strictEqual(resent.receipt, open.receipt);
      assert.strictEqual(driver.seen[driver.seen.length - 1], delivered);
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
      assert.deepEqual(taken, { activationId, supersededEpoch: 1, writerEpoch: 2, baseProgressRevision: 0, batch, receipt: receiptAt(executionId, "dispatch_intent", 4) });
      const replacement = driver.seen[driver.seen.length - 1]!;
      assert.deepEqual(replacement, { ...delivered, writerEpoch: 2 });
      assert.notStrictEqual(replacement, delivered);
      const takeoverView = view();
      assert.equal(takeoverView.executionId, executionId);
      assert.deepEqual(takeoverView.queued, batch);
      assert.deepEqual(takeoverView.activation, { activationId, writerEpoch: 2, baseProgressRevision: 0, batch, receipt: receiptAt(executionId, "dispatch_intent", 4), deliveries: [
        { attempt: 1, status: "pending", failure: null, activationId, writerEpoch: 1 },
        { attempt: 2, status: "pending", failure: null, activationId, writerEpoch: 1 },
        { attempt: 3, status: "pending", failure: null, activationId, writerEpoch: 2 },
      ] });
      const grant = submissionFor(driver, open.activationId);
      assert.notStrictEqual(grant, oldGrant);
      assert.equal(grant.activationId, open.activationId);
      assert.equal(grant.executionId, executionId);
      assert.equal(grant.writerEpoch, 2);
      const takenResent = accepted(kernel.redeliver(who, executionId));
      assert.deepEqual(takenResent, { activationId, writerEpoch: 2, baseProgressRevision: 0, batch, receipt: receiptAt(executionId, "dispatch_intent", 4), redelivered: true });
      assert.strictEqual(takenResent.receipt, taken.receipt);
      assert.strictEqual(driver.seen[driver.seen.length - 1], replacement);
      assert.strictEqual(submissionFor(driver, activationId), grant);
      // Both hold-ending acceptance paths must retain actor and exchange coordinates, too (X16).
      accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: { ...available, progressCodecs: [] } }));
      accepted(kernel.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 2 }));
      const proposal = outcomeFor(executionId, taken, { emissions: [{ emissionKey: "draft-é", value: { text: "first" } }] });
      const first = accepted(kernel.submitOutcome(who, proposal, grant));
      assert.deepEqual(first, {
        activationId, receipt: receiptAt(executionId, "outcome_acceptance", 5), acknowledged: batch,
        emissionIds: [`emission-${packed([executionId, activationId, "draft-é"])}`],
        resultId: null, terminalDispositions: [], nextState: "READY", progressRevision: 1, replayed: false,
      });
      const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
      assert.deepEqual(next, { activationId: nextActivationId, writerEpoch: 1, baseProgressRevision: 1, batch: [], receipt: receiptAt(executionId, "dispatch_intent", 6), redelivered: false });
      assert.notEqual(next.activationId, open.activationId);
      assert.equal(next.baseProgressRevision, 1);
      const queued = accepted(kernel.submitInput(who, { destination: executionId, requestKey: "outside", kind: "application.note", payload: 2 }));
      assert.deepEqual(queued, { eventId: outsideEventId, receipt: receiptAt(executionId, "input_ingress", 7), replayed: false, acceptancePosition: 7, disposition: { kind: "queued" } });
      assert.deepEqual(view().queued, [outsideEventId]);
      const last = accepted(kernel.submitOutcome(who, outcomeFor(executionId, next, { emissions: [{ emissionKey: "draft-é", value: { text: "last" } }], next: step === "complete" ? { step, result: 3 } : { step, error: 4 } }), submissionFor(driver, next.activationId)));
      assert.deepEqual(last, {
        activationId: nextActivationId, receipt: receiptAt(executionId, "outcome_acceptance", 8), acknowledged: [],
        emissionIds: [`emission-${packed([executionId, nextActivationId, "draft-é"])}`],
        resultId: `result-${packed([executionId, nextActivationId])}`, terminalDispositions: [outsideEventId],
        nextState: step === "complete" ? "COMPLETED" : "FAILED", progressRevision: 2, replayed: false,
      });
      assert.notEqual(first.emissionIds[0], last.emissionIds[0], "same local key across exchanges stays distinct");
      const final = view();
      assert.equal(final.executionId, executionId);
      assert.deepEqual(final.queued, []);
      assert.deepEqual(final.acknowledged, batch);
      assert.deepEqual(final.terminalDispositions, [outsideEventId]);
      assert.deepEqual(final.mailbox.map(entry => [entry.eventId, entry.inputId, entry.receipt]), [
        [initialEventId, { producerNamespace: namespace, destination: executionId, requestKey: key }, receiptAt(executionId, "creation", 1)],
        [extraEventId, { producerNamespace: namespace, destination: executionId, requestKey: "extra" }, receiptAt(executionId, "input_ingress", 2)],
        [outsideEventId, { producerNamespace: namespace, destination: executionId, requestKey: "outside" }, receiptAt(executionId, "input_ingress", 7)],
      ]);
      const receipts = [created.receipt, extra.receipt, open.receipt, taken.receipt, first.receipt, next.receipt, queued.receipt, last.receipt];
      const boundaries: ReceiptBoundary[] = ["creation", "input_ingress", "dispatch_intent", "dispatch_intent", "outcome_acceptance", "dispatch_intent", "input_ingress", "outcome_acceptance"];
      assert.deepEqual(final.receipts, boundaries.map((boundary, index) => receiptAt(executionId, boundary, index + 1)));
      for (const [index, receipt] of receipts.entries()) {
        assert.strictEqual(final.receipts[index], receipt);
        assert.ok(Object.isFrozen(receipt));
      }
      assert.equal(new Set(receipts.map(receipt => receipt.token)).size, 8);
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
      assert.strictEqual(final.exchanges[1]?.outcomeReceipt, last.receipt);
      assert.strictEqual(final.emissions[0]?.receipt, first.receipt);
      assert.strictEqual(final.emissions[1]?.receipt, last.receipt);
      assert.deepEqual(final.exchanges[0]?.batch, batch);
      assert.deepEqual(final.exchanges[1]?.batch, []);
      assert.deepEqual(final.exchanges[1]?.dispatchReceipt, receiptAt(executionId, "dispatch_intent", 6));
      assert.deepEqual(final.exchanges[0]?.deliveries.map(d => [d.activationId, d.writerEpoch]), [[activationId, 1], [activationId, 1], [activationId, 2], [activationId, 2]]);
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
      const creationReplay = accepted(kernel.createExecution(who, create));
      assert.deepEqual(creationReplay, { executionId, receipt: receiptAt(executionId, "creation", 1), replayed: true, initialEventId });
      assert.strictEqual(creationReplay.receipt, created.receipt);
      const inputReplay = accepted(kernel.submitInput(who, { destination: executionId, requestKey: "extra", kind: "application.note", payload: 1 }));
      assert.deepEqual(inputReplay, { eventId: extraEventId, receipt: receiptAt(executionId, "input_ingress", 2), replayed: true, acceptancePosition: 2, disposition: { kind: "acknowledged", activationId } });
      assert.strictEqual(inputReplay.receipt, extra.receipt);
      const outsideReplay = accepted(kernel.submitInput(who, { destination: executionId, requestKey: "outside", kind: "application.note", payload: 2 }));
      assert.deepEqual(outsideReplay, { eventId: outsideEventId, receipt: receiptAt(executionId, "input_ingress", 7), replayed: true, acceptancePosition: 7, disposition: final.mailbox[2]!.disposition });
      assert.strictEqual(outsideReplay.receipt, queued.receipt);
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
      return { receipts, executionId };
    }
    const a = run("k".repeat(200)), b = run("q".repeat(200));
    assert.deepEqual(kernel.visibleExecutions(who), [a.executionId, b.executionId]);
    for (const [index, receipt] of a.receipts.entries()) {
      assert.equal(receipt.position, b.receipts[index]!.position);
      assert.equal(receipt.boundary, b.receipts[index]!.boundary);
      assert.notEqual(receipt.token, b.receipts[index]!.token, `${receipt.boundary} equal-position receipts across Executions never collide`);
    }
  });
}
