/** K1.2-correction-01: producer/consumer closure, not just a validator unit test. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionCoordinator, type ExecutionView, type SubmissionGrant } from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, revokedProxy, submissionFor } from "./harness.ts";

const absent = undefined as unknown as SubmissionGrant;
const available = {
  definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"],
};
const unavailable = { ...available, progressCodecs: [] };

function setup(key = "identity", namespace = "app-a", scope = "tenant-a") {
  const who = caller(namespace, scope);
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(who, createRequest({ creationKey: key, scope })));
  const executionId = created.executionId;
  const view = () => accepted(kernel.inspect(who, executionId));
  return { who, driver, kernel, executionId, view };
}

function onlyRefusal(before: ExecutionView, after: ExecutionView, refusal: unknown) {
  assert.equal(after.refusals.length, before.refusals.length + 1);
  assert.deepEqual(after.refusals.at(-1), refusal);
  assert.ok(Object.isFrozen(after.refusals.at(-1)));
  const { refusals: _a, ...a } = after;
  const { refusals: _b, ...b } = before;
  assert.deepEqual(a, b, "no accepted state, receipt, output, hold, history, batch or delivery mutation");
}
function sameExcept(before: ExecutionView, after: ExecutionView, fields: (keyof ExecutionView)[]) {
  const a = { ...after }, b = { ...before };
  for (const key of fields) { delete a[key]; delete b[key]; }
  assert.deepEqual(a, b);
}

// Both reviewer schedules, maximal bounded caller parts, astral text, and the additional
// producer counterexample: integrated creation accepts arbitrary trusted namespace text.
for (const [name, key, namespace, scope, target] of [
  ["reviewer key at limit", "k".repeat(65_536), "app-a", "tenant-a", 1],
  ["reviewer exchange 9 to 10", "k".repeat(65_490), "app-a", "tenant-a", 10],
  ["maximal caller parts and long host namespace", "😀".repeat(65_536), "n".repeat(131_072), "s".repeat(65_536), 1],
  ["trusted namespace lone high surrogate", "k", "host-\ud800", "tenant-a", 1],
  ["trusted namespace lone low surrogate", "k", "host-\udc00", "tenant-a", 1],
] as const) {
  test(`${name}: Outcome, takeover, recovery, protocol hold, replay and terminal remain usable`, () => {
    const { who, driver, kernel, executionId, view } = setup(key, namespace, scope);
    for (let n = 1; n < target; n++) {
      const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
      assert.equal(open.activationId.length, 65_536);
      const decision = accepted(kernel.submitOutcome(who, outcomeFor(executionId, open, { progress: n }), submissionFor(driver, open.activationId)));
      assert.equal(decision.progressRevision, n);
      assert.equal(decision.receipt.position, 2 * n + 1);
    }
    const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    if (target === 10) assert.equal(open.activationId.length, 65_537);
    if (key.length >= 65_536) assert.ok(open.activationId.length > 65_536);
    const originalGrant = submissionFor(driver, open.activationId);
    const beforeHold = view();
    const held = accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: unavailable }));
    assert.equal(held.changed, true);
    assert.equal(held.activationId, open.activationId);
    assert.equal(held.writerEpoch, 1);
    assert.deepEqual(held.recoveryHolds.map(h => h.cause), ["pinned_code_unavailable"]);
    assert.deepEqual(held.recoveryHolds[0]?.permittedNextActions, ["declare_code_availability", "submit_outcome"]);
    sameExcept(beforeHold, view(), ["recoveryHolds", "recoveryHistory"]);
    assert.equal(view().state, "RUNNING");
    for (const action of [() => kernel.redeliver(who, executionId), () => kernel.requestTakeover(who, executionId, open)]) {
      const before = view(); const refusal = refused(action());
      assert.equal(refusal.classification, "recovery_held"); onlyRefusal(before, view(), refusal);
    }
    const beforeClear = view();
    const cleared = accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available }));
    assert.equal(cleared.changed, true); assert.deepEqual(cleared.recoveryHolds, []);
    sameExcept(beforeClear, view(), ["recoveryHolds", "recoveryHistory"]);
    accepted(kernel.redeliver(who, executionId));
    assert.strictEqual(submissionFor(driver, open.activationId), originalGrant);
    const beforeProtocol = view();
    const protocol = accepted(kernel.reportProtocolFailure(who, executionId, { ...open, diagnostic: "lost response" }));
    assert.equal(protocol.changed, true);
    assert.deepEqual(protocol.recoveryHolds.map(h => h.cause), ["protocol_failure"]);
    sameExcept(beforeProtocol, view(), ["recoveryHolds", "recoveryHistory"]);
    const beforeTakeover = view();
    const takeover = accepted(kernel.requestTakeover(who, executionId, open));
    assert.equal(takeover.activationId, open.activationId);
    assert.equal(takeover.supersededEpoch, 1); assert.equal(takeover.writerEpoch, 2);
    assert.equal(takeover.baseProgressRevision, target - 1);
    assert.deepEqual(takeover.batch, open.batch);
    assert.equal(takeover.receipt.boundary, "dispatch_intent");
    assert.equal(takeover.receipt.position, beforeTakeover.receipts.at(-1)!.position + 1);
    assert.equal(driver.seen.at(-1)?.activationId, open.activationId);
    assert.equal(driver.seen.at(-1)?.writerEpoch, 2);
    assert.deepEqual(view().recoveryHolds, []);
    sameExcept(beforeTakeover, view(), ["activation", "receipts", "recoveryHolds", "recoveryHistory"]);
    const currentGrant = submissionFor(driver, open.activationId);
    assert.notStrictEqual(currentGrant, originalGrant);
    const beforeStale = view();
    const stale = refused(kernel.submitOutcome(who, outcomeFor(executionId, open), originalGrant));
    assert.equal(stale.classification, "stale_exchange"); onlyRefusal(beforeStale, view(), stale);
    accepted(kernel.reportProtocolFailure(who, executionId, takeover));
    const proposal = outcomeFor(executionId, takeover, { progress: { n: target }, emissions: [{ emissionKey: "draft", value: 7 }] });
    const beforeAccept = view();
    const decision = accepted(kernel.submitOutcome(who, proposal, currentGrant));
    assert.equal(decision.progressRevision, target); assert.equal(decision.nextState, "READY");
    assert.equal(decision.receipt.position, takeover.receipt.position + 1);
    assert.deepEqual(decision.acknowledged, open.batch);
    assert.equal(decision.emissionIds.length, 1); assert.equal(decision.resultId, null);
    assert.deepEqual(decision.terminalDispositions, []);
    const afterAccept = view();
    assert.deepEqual(afterAccept.acceptedProgress, { n: target });
    assert.equal(afterAccept.activation, null); assert.deepEqual(afterAccept.recoveryHolds, []);
    assert.equal(afterAccept.emissions.length, beforeAccept.emissions.length + 1);
    assert.equal(afterAccept.exchanges.at(-1)?.activationId, open.activationId);
    assert.equal(afterAccept.recoveryHistory.at(-1)?.transition, "ended_by_outcome");
    assert.equal(afterAccept.recoveryHistory.at(-1)?.authority, "attempt_submission");
    assert.deepEqual(afterAccept.recoveryHistory.map(h => h.transition), ["entered", "cleared_by_declaration", "entered", "cleared_by_takeover", "entered", "ended_by_outcome"]);
    const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    assert.notEqual(next.activationId, open.activationId); assert.equal(next.baseProgressRevision, target);
    for (const terminal of [false, true]) {
      if (terminal) accepted(kernel.submitOutcome(who, outcomeFor(executionId, next, { next: { step: "complete", result: 9 } }), submissionFor(driver, next.activationId)));
      const beforeReplay = view();
      const replay = accepted(kernel.submitOutcome(who, proposal, absent));
      assert.strictEqual(replay.receipt, decision.receipt);
      assert.deepEqual(replay, { ...decision, replayed: true }); assert.deepEqual(view(), beforeReplay);
      const conflict = refused(kernel.submitOutcome(who, { ...proposal, progress: 99 }, absent));
      assert.equal(conflict.classification, "duplicate_conflict"); onlyRefusal(beforeReplay, view(), conflict);
    }
  });
}

const textEdges = [
  ["empty", ""], ["lone high surrogate", "\ud800"], ["lone low surrogate", "\udc00"],
  ["old limit", "x".repeat(65_536)], ["past old limit", "x".repeat(65_537)],
  ["astral past old limit", "😀".repeat(65_537)],
] as const;
for (const [label, text] of textEdges) {
  for (const schedule of ["terminal", "no exchange", "stale epoch", "stale base", "current"] as const) {
    for (const grantKind of ["current", "retired", "forged", "absent"] as const) {
      for (const invalidContent of [false, true]) {
        test(`opaque text ${label} / ${schedule} / ${grantKind} / invalid=${invalidContent}`, () => {
          const { who, driver, kernel, executionId, view } = setup();
          const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
          const retired = submissionFor(driver, open.activationId);
          const current = accepted(kernel.requestTakeover(who, executionId, open));
          const currentGrant = submissionFor(driver, open.activationId);
          if (schedule === "terminal" || schedule === "no exchange") {
            accepted(kernel.submitOutcome(who, outcomeFor(executionId, current, schedule === "terminal" ? { next: { step: "fail", error: 1 } } : {}), currentGrant));
          }
          const grant = grantKind === "current" ? currentGrant : grantKind === "retired" ? retired : grantKind === "forged" ? { ...currentGrant } as SubmissionGrant : absent;
          const envelope = outcomeFor(executionId, current, {
            activationId: text, writerEpoch: schedule === "stale epoch" ? 1 : 2,
            baseProgressRevision: schedule === "stale base" ? 7 : 0,
            ...(invalidContent ? { progress: "\ud800", next: { step: "await", get wait() { throw Error("must not read wait"); } } } : {}),
          });
          const before = view(); const deliveries = driver.seen.length;
          const refusal = refused(kernel.submitOutcome(who, envelope, grant));
          assert.equal(refusal.classification, schedule === "terminal" ? "terminal_destination" : "stale_exchange");
          assert.doesNotMatch(refusal.reason, /lone_surrogate|string_too_long|wait_unsupported|unsupported_form|was not usable/);
          onlyRefusal(before, view(), refusal); assert.equal(driver.seen.length, deliveries);
          // Text shape is usable, but a different string never selects the current exchange.
          if (schedule !== "terminal" && schedule !== "no exchange") {
            accepted(kernel.submitOutcome(who, outcomeFor(executionId, current), currentGrant));
          }
        });
      }
    }
    for (const control of ["takeover", "recover", "protocol"] as const) {
      for (const allowed of [false, true]) {
        test(`control ${control} / text ${label} / ${schedule} / power=${allowed}`, () => {
          const { who, driver, kernel, executionId, view } = setup();
          const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
          if (schedule === "terminal" || schedule === "no exchange") {
            accepted(kernel.submitOutcome(who, outcomeFor(executionId, open, schedule === "terminal" ? { next: { step: "complete", result: 1 } } : {}), submissionFor(driver, open.activationId)));
          }
          const actor = allowed ? who : observer(who.namespace, "tenant-a");
          const request = { activationId: text, writerEpoch: schedule === "stale epoch" ? 7 : 1, available };
          const before = view();
          const answer = control === "takeover" ? kernel.requestTakeover(actor, executionId, request) : control === "recover" ? kernel.recoverExecution(actor, executionId, request) : kernel.reportProtocolFailure(actor, executionId, request);
          const refusal = refused(answer);
          assert.equal(refusal.classification, !allowed ? "unauthorized_control" : schedule === "terminal" ? "terminal_destination" : schedule === "no exchange" ? "no_unresolved_exchange" : "stale_exchange");
          assert.doesNotMatch(refusal.reason, /string_too_long|lone_surrogate|unsupported_form/);
          onlyRefusal(before, view(), refusal);
        });
      }
    }
  }
}

for (const [label, value] of [["boxed", new String("identity")], ["revoked", revokedProxy()], ["missing", undefined]] as const) {
  test(`non-text ${label} is unusable with no coercion on every consumer`, () => {
    const { who, driver, kernel, executionId, view } = setup();
    const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    for (const entitled of [false, true]) {
      const before = view();
      const refusal = refused(kernel.submitOutcome(who, outcomeFor(executionId, open, { activationId: value }), entitled ? submissionFor(driver, open.activationId) : absent));
      assert.equal(refusal.classification, entitled ? "malformed_envelope" : "unauthorized_submission"); onlyRefusal(before, view(), refusal);
    }
    for (const run of [
      () => kernel.requestTakeover(who, executionId, { ...open, activationId: value } as never),
      () => kernel.recoverExecution(who, executionId, { activationId: value, available } as never),
      () => kernel.reportProtocolFailure(who, executionId, { ...open, activationId: value } as never),
    ]) { const before = view(); const refusal = refused(run()); assert.equal(refusal.classification, "malformed_value"); onlyRefusal(before, view(), refusal); }
  });
}

for (const holder of ["envelope", "next", "emission"] as const) {
  for (const [label, key] of [["long", "x".repeat(1_000_000)], ["surrogate", "\ud800"], ["control", "\n\u0000"], ["ASCII at limit", "x".repeat(128)], ["ASCII past limit", "x".repeat(129)]] as const) {
    test(`O3 unknown ${holder} field ${label}: bounded diagnostic, whole refusal`, () => {
      const { who, driver, kernel, executionId, view } = setup();
      const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
      let unknownReads = 0;
      const unknown = Object.defineProperty({}, key, { enumerable: true, get() { unknownReads++; throw Error("unknown field is unread"); } });
      // Define descriptors instead of spread: constructing the fixture must not execute the getter.
      const proposal = outcomeFor(executionId, open);
      const target = holder === "envelope" ? proposal : holder === "next" ? proposal.next : ((proposal as unknown as { emissions: object[] }).emissions = [{ emissionKey: "x", value: 1 }])[0]!;
      Object.defineProperties(target, Object.getOwnPropertyDescriptors(unknown));
      for (const entitled of [false, true]) {
        const before = view();
        const refusal = refused(kernel.submitOutcome(who, proposal, entitled ? submissionFor(driver, open.activationId) : absent));
        assert.equal(refusal.classification, entitled ? "malformed_envelope" : "unauthorized_submission");
        assert.ok(refusal.reason.length < 1_024); assert.doesNotMatch(refusal.reason, /[\ud800-\udfff]/);
        if (entitled) { assert.match(refusal.reason, /unknown_field/); assert.equal(refusal.reason.includes(key), label === "ASCII at limit"); }
        else assert.doesNotMatch(refusal.reason, /unknown_field|omitted/);
        onlyRefusal(before, view(), refusal); assert.equal(unknownReads, 0);
      }
    });
  }
}

for (const namespace of ["n".repeat(65_537), "host-\ud800"]) {
  for (const coordinate of ["current", "stale epoch", "stale base"] as const) {
    for (const grantKind of ["current", "retired", "forged", "absent"] as const) {
      for (const invalidContent of [false, true]) {
        test(`minted ${namespace.length > 100 ? "long" : "surrogate"} / ${coordinate} / ${grantKind} / invalid=${invalidContent}`, () => {
          const { who, driver, kernel, executionId, view } = setup("k", namespace);
          const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
          const retired = submissionFor(driver, open.activationId);
          const current = accepted(kernel.requestTakeover(who, executionId, open));
          const grant = submissionFor(driver, open.activationId);
          const submitted = grantKind === "current" ? grant : grantKind === "retired" ? retired : grantKind === "forged" ? { ...grant } as SubmissionGrant : absent;
          let identityReads = 0;
          const proposal = outcomeFor(executionId, current, {
            writerEpoch: coordinate === "stale epoch" ? 1 : 2,
            baseProgressRevision: coordinate === "stale base" ? 1 : 0,
            progress: invalidContent ? "\ud800" : 42,
          });
          Object.defineProperty(proposal, "activationId", { enumerable: true, get() { identityReads++; return open.activationId; } });
          const before = view();
          const answer = kernel.submitOutcome(who, proposal, submitted);
          assert.equal(identityReads, 1);
          if (coordinate === "current" && grantKind === "current" && !invalidContent) {
            const decision = accepted(answer); assert.equal(decision.progressRevision, 1); assert.deepEqual(decision.acknowledged, open.batch);
          } else {
            const refusal = refused(answer);
            const expected = coordinate !== "current" ? "stale_exchange" : grantKind !== "current" ? "unauthorized_submission" : "malformed_envelope";
            assert.equal(refusal.classification, expected); onlyRefusal(before, view(), refusal);
            assert.doesNotMatch(refusal.reason, /activationId (?:lone_surrogate|string_too_long|unsupported_form)/);
            if (expected === "malformed_envelope") assert.match(refusal.reason, /progress lone_surrogate/);
            else assert.doesNotMatch(refusal.reason, /progress lone_surrogate/);
            accepted(kernel.submitOutcome(who, outcomeFor(executionId, current), grant));
          }
        });
      }
    }
  }
}

for (const surface of ["outcome", "takeover", "recover", "protocol"] as const) {
  test(`identity classification follows scope and control power on ${surface}`, () => {
    const { who, driver, kernel, executionId, view } = setup();
    const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    let reads = 0;
    const request = { executionId, get activationId() { reads++; return "\ud800"; }, writerEpoch: 1, baseProgressRevision: 0, available, progress: 1, next: { step: "continue" } };
    const outsider = caller("hidden", "elsewhere");
    const scopeRun = (id: string) => {
      if (surface === "takeover") return kernel.requestTakeover(outsider, id, request);
      if (surface === "recover") return kernel.recoverExecution(outsider, id, request);
      if (surface === "protocol") return kernel.reportProtocolFailure(outsider, id, request);
      const envelope = Object.defineProperties({}, Object.getOwnPropertyDescriptors(request));
      Object.defineProperty(envelope, "executionId", { value: id });
      return kernel.submitOutcome(outsider, envelope as never, absent);
    };
    const before = view();
    assert.deepEqual(refused(scopeRun(executionId)), refused(scopeRun("missing")));
    assert.equal(reads, 0); assert.deepEqual(view(), before);
    accepted(kernel.submitOutcome(who, outcomeFor(executionId, open), submissionFor(driver, open.activationId)));
  });
}
