/**
 * K13-6 — Outcome proposals that lose to an accepted cancellation (CX-6; `lifecycle.md` § Cancellation
 * order; `execution-cycle.md` § Outcome acceptance). Corpus labels K13-A07, K13-A08, K13-A09, K13-A23;
 * attack O5.
 *
 * After the replay lookup (OA-2) and before every other check, a cancelled Execution's proposal loses
 * whatever its step, epoch, grant or content, with the exact reason `cancellation accepted before
 * Outcome acceptance`. A well-formed proposal is recorded with its coordinates and indexed by Activation
 * and canonical content identity, so an exact retry, even as a fresh equal object, returns the same
 * retained refusal; a proposal without usable identity or content gets an unindexed refusal each time.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { accepted, caller, outcomeFor, refused } from "./harness.ts";
import { author, created, dispatch, grantOf, input, submitNext, view, type Opened } from "./waits-kit.ts";

const REASON = "cancellation accepted before Outcome acceptance";

/** A cancelled Execution whose open exchange the cancellation ended. */
function cancelledOpen(): Opened & { readonly exchange: ReturnType<typeof dispatch> } {
  const opened = created();
  input(opened, "x");
  const exchange = dispatch(opened, 2);
  accepted(opened.kernel.cancelExecution(author, opened.executionId));
  return { ...opened, exchange };
}

const propose = (opened: Opened, exchange: ReturnType<typeof dispatch>, overrides: Record<string, unknown> = {}) =>
  opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, exchange, overrides), grantOf(opened.driver, exchange.activationId));

describe("K13-A07 an exact retry, even a fresh equal object, returns the retained refusal", () => {
  test("loser, fresh equal loser, another loser, then the original again", () => {
    const opened = cancelledOpen();
    const before = view(opened);
    const first = refused(propose(opened, opened.exchange, { progress: { n: 1 } }));
    assert.deepEqual([first.classification, first.reason], ["cancellation_terminal_conflict", REASON]);
    const freshEqual = refused(propose(opened, opened.exchange, { progress: { n: 1 } }));
    assert.strictEqual(freshEqual, first, "the same retained refusal object");
    const other = refused(propose(opened, opened.exchange, { progress: { n: 2 } }));
    assert.notStrictEqual(other, first);
    assert.equal(other.position, first.position + 1);
    assert.strictEqual(refused(propose(opened, opened.exchange, { progress: { n: 1 } })), first, "after another loser, the original's retry still finds its refusal");
    const after = view(opened);
    assert.deepEqual(after.refusals.slice(before.refusals.length), [first, other], "a retry records nothing new");
    assert.deepEqual(after.receipts, before.receipts, "no receipt");
    assert.deepEqual({ ...after, refusals: before.refusals, losingOutcomes: before.losingOutcomes }, before, "no logical mutation");
  });
});

describe("K13-A08 losers differing only in progress, or only in an Emission, keep separate records", () => {
  for (const [name, a, b] of [
    ["progress", { progress: { n: 1 } }, { progress: { n: 2 } }],
    ["one Emission", { emissions: [{ emissionKey: "e", value: { v: 1 } }] }, { emissions: [{ emissionKey: "e", value: { v: 2 } }] }],
    ["the next step", { next: { step: "continue" } }, { next: { step: "await", wait: { subscriptions: [{ subscriptionClass: "s" }] } } }],
  ] as const) {
    test(name, () => {
      const opened = cancelledOpen();
      const l1 = refused(propose(opened, opened.exchange, a));
      const l2 = refused(propose(opened, opened.exchange, b));
      assert.notStrictEqual(l1, l2, "rejection evidence stays bound to each canonical proposal");
      assert.strictEqual(refused(propose(opened, opened.exchange, a)), l1);
      assert.strictEqual(refused(propose(opened, opened.exchange, b)), l2);
      assert.strictEqual(refused(propose(opened, opened.exchange, a)), l1);
      const losers = view(opened).losingOutcomes;
      assert.deepEqual(losers.map((loser) => loser.refusal), [l1, l2]);
      assert.equal(view(opened).emissions.length, 0, "no losing output was accepted");
    });
  }

  test("a changed writer epoch or base revision is a different losing proposal", () => {
    const opened = cancelledOpen();
    const base = refused(propose(opened, opened.exchange));
    const epoch = refused(propose(opened, opened.exchange, { writerEpoch: 2 }));
    const revision = refused(propose(opened, opened.exchange, { baseProgressRevision: 7 }));
    assert.equal(new Set([base, epoch, revision]).size, 3);
    assert.deepEqual(view(opened).losingOutcomes.map((loser) => [loser.writerEpoch, loser.baseProgressRevision]), [[1, 0], [2, 0], [1, 7]]);
  });
});

describe("K13-A09 OA-2 is answered before the fence", () => {
  test("after a losing A2, the saved A1 replays its original receipt and a changed A1 conflicts", () => {
    const opened = created();
    const a1 = dispatch(opened);
    const savedA1 = outcomeFor(opened.executionId, a1, { progress: { phase: "one" } });
    const original = accepted(opened.kernel.submitOutcome(author, savedA1, grantOf(opened.driver, a1.activationId)));
    const a2 = dispatch(opened);
    accepted(opened.kernel.cancelExecution(author, opened.executionId));
    refused(propose(opened, a2));
    const replay = accepted(opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, a1, { progress: { phase: "one" } }), grantOf(opened.driver, a1.activationId)));
    assert.equal(replay.replayed, true);
    assert.strictEqual(replay.receipt, original.receipt);
    const changed = refused(opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, a1, { progress: { phase: "changed" } }), grantOf(opened.driver, a1.activationId)));
    assert.equal(changed.classification, "duplicate_conflict", "an accepted Outcome's conflict is OA-2's, not the fence's");
  });

  test("S7 c d q r: an Outcome accepted before the cancellation replays after it", () => {
    const opened = created();
    const exchange = dispatch(opened);
    const continued = accepted(submitNext(opened, exchange));
    dispatch(opened);
    accepted(opened.kernel.cancelExecution(author, opened.executionId));
    assert.strictEqual(accepted(submitNext(opened, exchange)).receipt, continued.receipt);
  });
});

describe("K13-A23 scope before lookup; the fence before currency, grant and content", () => {
  test("an invisible retry discloses nothing and records nothing", () => {
    const opened = cancelledOpen();
    const first = refused(propose(opened, opened.exchange));
    const before = view(opened);
    const hidden = refused(opened.kernel.submitOutcome(caller("elsewhere", "tenant-b"), outcomeFor(opened.executionId, opened.exchange), grantOf(opened.driver, opened.exchange.activationId)));
    assert.deepEqual([hidden.classification, hidden.executionId, hidden.position], ["unknown_destination", null, 0]);
    assert.notStrictEqual(hidden, first);
    assert.deepEqual(view(opened), before);
  });

  test("a visible caller without the grant still loses to the fence, before the grant check", () => {
    const opened = cancelledOpen();
    const refusal = refused(opened.kernel.submitOutcome({ namespace: "watcher", scopes: ["tenant-a"] }, outcomeFor(opened.executionId, opened.exchange), { ...grantOf(opened.driver, opened.exchange.activationId) }));
    assert.deepEqual([refusal.classification, refusal.reason], ["cancellation_terminal_conflict", REASON]);
  });

  test("two Executions with same-looking coordinates never share losing evidence", () => {
    const first = cancelledOpen();
    const kernel = first.kernel;
    const other = accepted(kernel.createExecution(author, { creationKey: "other", scope: "tenant-a", definitionRevision: "weekly-report@3", runtimeContractRevision: "runtime-contract@1", progressCodec: "inline-json@1", authorityContext: { tenant: "a" }, initialInput: { kind: "application.request", payload: { text: "x" } } } as never)).executionId;
    const otherExchange = accepted(kernel.dispatch(author, other, { bound: 1 }));
    accepted(kernel.cancelExecution(author, other));
    const onFirst = refused(propose(first, first.exchange));
    const onOther = refused(kernel.submitOutcome(author, outcomeFor(other, otherExchange), grantOf(first.driver, otherExchange.activationId)));
    assert.notStrictEqual(onFirst, onOther);
    assert.equal(onOther.executionId, other);
    assert.equal(accepted(kernel.inspect(author, other)).losingOutcomes.length, 1);
    assert.equal(view(first).losingOutcomes.length, 1);
  });

  test("O5: a proposal with an unusable identity or malformed content gets an unindexed refusal each time", () => {
    const opened = cancelledOpen();
    const before = view(opened);
    const unusable = refused(propose(opened, opened.exchange, { activationId: 42 }));
    const again = refused(propose(opened, opened.exchange, { activationId: 42 }));
    const malformed = refused(propose(opened, opened.exchange, { writerEpoch: "1" }));
    for (const refusal of [unusable, again, malformed]) assert.deepEqual([refusal.classification, refusal.reason], ["cancellation_terminal_conflict", REASON]);
    assert.notStrictEqual(again, unusable, "nothing to index, so nothing to return again");
    assert.doesNotMatch(malformed.reason, /writerEpoch/, "no pre-authority content diagnostic");
    assert.equal(view(opened).losingOutcomes.length, before.losingOutcomes.length);
  });
});
