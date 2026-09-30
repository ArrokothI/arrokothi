/** K1.2-correction-01 round 2: diagnostic rendering never changes opaque identity semantics. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ExecutionCoordinator,
  type Activation,
  type CodeAvailability,
  type ExecutionView,
  type RefusalRecord,
  type SubmissionGrant,
} from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";
import { assertDiagnostic, assertOnlyRefusal, runBoundaryDiagnosticSchedule } from "./refusal-diagnostics-fixture.ts";

const absent = undefined as unknown as SubmissionGrant;
const available = {
  definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"],
};
const missing = { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] };

for (const [label, identity] of [
  ["50 million units", "Z".repeat(50_000_000)], ["lone high surrogate", "inject-\ud800"], ["lone low surrogate", "inject-\udc00"],
] as const) {
  test(`DIAG-01 wrong ${label}: all 21 shared scope/power/lifecycle boundary cases`, () => {
    assert.equal(runBoundaryDiagnosticSchedule(identity), 21);
  });
}

function setup(namespace = "diagnostic-host", safe = true) {
  const who = caller(namespace);
  const visible = observer("visible");
  const driver = recordingDriver();
  driver.isSafeToReplace = () => safe;
  const kernel = new ExecutionCoordinator({ driver, emissionsPerOutcome: 1 });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const view = () => accepted(kernel.inspect(visible, executionId));
  return { who, visible, driver, kernel, executionId, open, view };
}

function verifyRefusal(state: ReturnType<typeof setup>, action: () => { ok: boolean }, classification: string, limit = 1_024): RefusalRecord {
  const before = state.view();
  const deliveries = state.driver.seen.length;
  const answer = action() as { ok: true; value: unknown } | { ok: false; error: RefusalRecord };
  const refusal = refused(answer);
  assert.equal(refusal.classification, classification);
  assertDiagnostic(refusal.reason, limit);
  assertOnlyRefusal(before, state.view(), refusal);
  assert.equal(state.driver.seen.length, deliveries);
  assert.equal(refusal.executionId, state.executionId);
  return refusal;
}

const namespaces = [
  ["long", "namespace-".repeat(512)], ["surrogate-high", "host-\ud800"], ["surrogate-low", "host-\udc00"],
] as const;

for (const [label, namespace] of namespaces) {
  test(`matched ${label} identity: every Outcome refusal renderer, exact replay and answerability`, () => {
    const s = setup(namespace);
    const { kernel, who, visible, executionId, open, driver } = s;
    // Wrong caller identity must not expose the independently long/malformed Execution spelling.
    verifyRefusal(s, () => kernel.submitOutcome(visible, outcomeFor(executionId, { ...open, activationId: "wrong" }), absent), "stale_exchange");
    for (const action of [
      () => kernel.requestTakeover(who, executionId, { ...open, activationId: "wrong" }),
      () => kernel.recoverExecution(who, executionId, { activationId: "wrong", available }),
      () => kernel.reportProtocolFailure(who, executionId, { ...open, activationId: "wrong" }),
    ]) verifyRefusal(s, action, "stale_exchange");
    const grant = submissionFor(driver, open.activationId);
    const current = accepted(kernel.requestTakeover(who, executionId, open));
    const currentGrant = submissionFor(driver, open.activationId);
    const propose = (overrides = {}) => outcomeFor(executionId, current, overrides);
    for (const [overrides, authority, classification] of [
      [{ writerEpoch: 1 }, grant, "stale_exchange"],
      [{ writerEpoch: 3 }, currentGrant, "stale_exchange"],
      [{ baseProgressRevision: 7 }, currentGrant, "stale_exchange"],
      [{}, absent, "unauthorized_submission"],
      [{ emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 2 }] }, currentGrant, "capacity_exhausted"],
      [{ progress: undefined, next: { step: "await" } }, currentGrant, "malformed_envelope"],
    ] as const) {
      const r = verifyRefusal(s, () => kernel.submitOutcome(visible, propose(overrides), authority), classification);
      assert.match(r.reason, /<identity omitted>/);
      if (classification === "malformed_envelope") {
        assert.match(r.reason, /progress.*missing_field/);
        assert.match(r.reason, /next.step.*wait_unsupported/);
      }
    }
    const valid = propose({ progress: { exact: "accepted" }, emissions: [{ emissionKey: "key", value: 7 }] });
    const decision = accepted(kernel.submitOutcome(who, valid, currentGrant));
    assert.equal(s.view().exchanges.at(-1)?.activationId, open.activationId);
    assert.equal(s.view().emissions[0]?.emissionId, decision.emissionIds[0]);
    verifyRefusal(s, () => kernel.submitOutcome(visible, { ...valid, progress: 9 }, absent), "duplicate_conflict");
    verifyRefusal(s, () => kernel.submitOutcome(visible, { ...valid, activationId: "wrong" }, absent), "stale_exchange");
    verifyRefusal(s, () => kernel.submitOutcome(visible, { ...valid, activationId: undefined } as never, absent), "stale_exchange");
    const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    const terminal = outcomeFor(executionId, next, { next: { step: "complete", result: 1 } });
    accepted(kernel.submitOutcome(who, terminal, submissionFor(driver, next.activationId)));
    verifyRefusal(s, () => kernel.submitOutcome(visible, { ...valid, activationId: "wrong" }, absent), "terminal_destination");
    const beforeReplay = s.view();
    const replay = accepted(kernel.submitOutcome(visible, valid, absent));
    assert.strictEqual(replay.receipt, decision.receipt);
    assert.equal(replay.replayed, true);
    assert.deepEqual(s.view(), beforeReplay);
  });

  test(`matched ${label} identity: control, hold and unsafe-replacement renderers`, () => {
    const s = setup(namespace, false);
    const { kernel, who, visible, executionId, open, driver } = s;
    for (const action of [
      () => kernel.requestTakeover(visible, executionId, open),
      () => kernel.recoverExecution(visible, executionId, { activationId: open.activationId, available }),
      () => kernel.reportProtocolFailure(visible, executionId, open),
    ]) verifyRefusal(s, action, "unauthorized_control");
    verifyRefusal(s, () => kernel.requestTakeover(who, executionId, { ...open, writerEpoch: 9 }), "stale_exchange");
    verifyRefusal(s, () => kernel.reportProtocolFailure(who, executionId, { ...open, writerEpoch: 9 }), "stale_exchange");
    verifyRefusal(s, () => kernel.requestTakeover(who, executionId, open), "unsafe_replacement");
    accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: missing }));
    verifyRefusal(s, () => kernel.requestTakeover(who, executionId, open), "recovery_held");
    accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available }));
    accepted(kernel.submitOutcome(who, outcomeFor(executionId, open), submissionFor(driver, open.activationId)));
    for (const action of [
      () => kernel.requestTakeover(who, executionId, open),
      () => kernel.recoverExecution(who, executionId, { activationId: open.activationId, available }),
      () => kernel.reportProtocolFailure(who, executionId, open),
    ]) verifyRefusal(s, action, "no_unresolved_exchange");
    const next = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(who, outcomeFor(executionId, next, { next: { step: "complete", result: 1 } }), submissionFor(driver, next.activationId)));
    for (const action of [
      () => kernel.requestTakeover(who, executionId, next),
      () => kernel.recoverExecution(who, executionId, { activationId: next.activationId, available }),
      () => kernel.reportProtocolFailure(who, executionId, next),
    ]) verifyRefusal(s, action, "terminal_destination");
  });
}

for (const [label, namespace] of namespaces) {
  for (const callback of ["epoch", "resolved", "next-exchange", "terminal", "hold"] as const) {
    test(`matched ${label} identity: takeover callback ${callback} revalidation`, () => {
      const who = caller(namespace);
      const grants: SubmissionGrant[] = [];
      const deliveries: Activation[] = [];
      let entered = false;
      let innerState: ExecutionView | undefined;
      const kernel: ExecutionCoordinator = new ExecutionCoordinator({ driver: {
        driverId: "diagnostic-reentrant",
        deliver(activation, settlement, grant) { deliveries.push(activation); grants.push(grant); settlement.delivered(); },
        isSafeToReplace(activation) {
          if (entered) return true;
          entered = true;
          if (callback === "epoch") accepted(kernel.requestTakeover(who, activation.executionId, activation));
          else if (callback === "hold") accepted(kernel.recoverExecution(who, activation.executionId, { activationId: activation.activationId, available: missing }));
          else {
            accepted(kernel.submitOutcome(who, outcomeFor(activation.executionId, activation, callback === "terminal" ? { next: { step: "complete", result: 1 } } : {}), grants.at(-1)!));
            if (callback === "next-exchange") accepted(kernel.dispatch(who, activation.executionId, { bound: 1 }));
          }
          innerState = accepted(kernel.inspect(who, activation.executionId));
          return true;
        },
      } });
      const { executionId } = accepted(kernel.createExecution(who, createRequest()));
      const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
      const refusal = refused(kernel.requestTakeover(who, executionId, open));
      assert.equal(refusal.classification, callback === "terminal" ? "terminal_destination" : callback === "hold" ? "recovery_held" : callback === "resolved" ? "no_unresolved_exchange" : "stale_exchange");
      assertDiagnostic(refusal.reason);
      assert.match(refusal.reason, /<identity omitted>/);
      assert.ok(innerState);
      const after = accepted(kernel.inspect(who, executionId));
      assertOnlyRefusal(innerState, after, refusal);
      assert.equal(deliveries.length, callback === "epoch" || callback === "next-exchange" ? 2 : 1);
      if (callback !== "terminal") {
        const current = after.activation ?? accepted(kernel.dispatch(who, executionId, { bound: 1 }));
        accepted(kernel.submitOutcome(who, outcomeFor(executionId, current), grants.at(-1)!));
      }
    });
  }
}

for (const [label, identity, retained] of [
  ["128 printable units", "a".repeat(128), true], ["129 printable units", "a".repeat(129), false],
  ["printable endpoints", " ~", true], ["tab", "a\tb", false], ["DEL", "a\x7fb", false], ["non-ASCII", "é", false],
] as const) {
  test(`identity diagnostic edge ${label} does not change lookup`, () => {
    const s = setup();
    const refusal = verifyRefusal(s, () => s.kernel.submitOutcome(s.visible, outcomeFor(s.executionId, s.open, { activationId: identity }), absent), "stale_exchange");
    if (retained) assert.ok(refusal.reason.includes(`Activation ${identity} is not`));
    else assert.match(refusal.reason, /Activation <identity omitted> is not/);
    accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), submissionFor(s.driver, s.open.activationId)));
  });
}

for (const [label, field] of [["long member", "m".repeat(4_096)], ["Unicode member", "field-\ud800"]] as const) {
  test(`root projection ${label}: every issue and root label survives without raw caller path`, () => {
    const s = setup("n".repeat(4_096));
    const root = { [field]: undefined, short: undefined };
    const proposal = outcomeFor(s.executionId, s.open, {
      writerEpoch: undefined,
      progress: root,
      emissions: [{ emissionKey: "bad-root", value: root }],
      next: { step: "complete", result: root },
    });
    const refusal = verifyRefusal(s, () => s.kernel.submitOutcome(s.who, proposal, submissionFor(s.driver, s.open.activationId)), "malformed_envelope", 4_096);
    assert.ok(!refusal.reason.includes(field));
    for (const rootName of ["progress", "emissions[0].value", "next.result"]) {
      assert.ok(refusal.reason.includes(`${rootName}.<omitted>`), `${rootName} retained before omitted raw path`);
      assert.ok(refusal.reason.includes(`${rootName}.short`), `${rootName}'s later issue not dropped`);
    }
    assert.match(refusal.reason, /writerEpoch.*not_a_count/);
    const expectedCodes = label === "Unicode member" ? ["lone_surrogate", "undefined_member"] : ["undefined_member", "undefined_member"];
    for (const code of new Set(expectedCodes)) assert.equal(refusal.reason.split(` ${code} (`).length - 1, expectedCodes.filter(c => c === code).length * 3);
    accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), submissionFor(s.driver, s.open.activationId)));
  });
}

for (const [label, name] of [["long", "constructor-".repeat(512)], ["Unicode", "constructor-\ud800"]] as const) {
  test(`constructor ${label}: all root messages projected before composition, recovery roots included`, () => {
    const s = setup();
    const bad = Object.create({ constructor: { name } });
    const proposal = outcomeFor(s.executionId, s.open, { progress: bad, emissions: [{ emissionKey: "e", value: bad }], next: { step: "fail", error: bad } });
    const refusal = verifyRefusal(s, () => s.kernel.submitOutcome(s.who, proposal, submissionFor(s.driver, s.open.activationId)), "malformed_envelope", 4_096);
    assert.ok(!refusal.reason.includes(name));
    for (const root of ["progress", "emissions[0].value", "next.error"]) assert.ok(refusal.reason.includes(`${root} unsupported_form`));
    assert.equal(refusal.reason.split(" unsupported_form (").length - 1, 3);
    const recovery = verifyRefusal(s, () => s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: { definitionRevisions: bad, runtimeContractRevisions: bad, progressCodecs: bad } }), "malformed_value", 4_096);
    assert.ok(!recovery.reason.includes(name));
    for (const root of ["available.definitionRevisions", "available.runtimeContractRevisions", "available.progressCodecs"]) assert.ok(recovery.reason.includes(`${root} unsupported_form`));
    assert.equal(recovery.reason.split(" unsupported_form").length - 1, 3);
  });
}

for (const [label, key] of [["128", "k".repeat(128)], ["129", "k".repeat(129)], ["Unicode", "clé"]] as const) {
  test(`duplicate Emission name ${label}: bounded reason retains duplicate diagnosis and exact key semantics`, () => {
    const who = caller("diagnostic-host");
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver, emissionsPerOutcome: 2 });
    const { executionId } = accepted(kernel.createExecution(who, createRequest()));
    const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    const before = accepted(kernel.inspect(who, executionId));
    const refusal = refused(kernel.submitOutcome(who, outcomeFor(executionId, open, { emissions: [{ emissionKey: key, value: 1 }, { emissionKey: key, value: 2 }] }), submissionFor(driver, open.activationId)));
    assert.equal(refusal.classification, "malformed_envelope");
    assertDiagnostic(refusal.reason);
    assert.match(refusal.reason, /duplicate_key/);
    if (label === "128") assert.ok(refusal.reason.includes(key)); else assert.ok(!refusal.reason.includes(key));
    assertOnlyRefusal(before, accepted(kernel.inspect(who, executionId)), refusal);
    accepted(kernel.submitOutcome(who, outcomeFor(executionId, open, { emissions: [{ emissionKey: key, value: 1 }] }), submissionFor(driver, open.activationId)));
    assert.equal(accepted(kernel.inspect(who, executionId)).emissions[0]?.emissionKey, key);
  });
}

for (const [label, pin] of [["long", "p".repeat(4_096)], ["Unicode", "版本-é"], ["128", "p".repeat(128)], ["129", "p".repeat(129)]] as const) {
  test(`pinned names ${label}: hold and history aliases bounded while structured identity remains exact`, () => {
    const who = caller("actor-\ud800");
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const { executionId } = accepted(kernel.createExecution(who, createRequest({ definitionRevision: pin, runtimeContractRevision: pin, progressCodec: pin })));
    const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    const all: CodeAvailability = { definitionRevisions: [pin], runtimeContractRevisions: [pin], progressCodecs: [pin] };
    for (const avail of [missing, { ...all, progressCodecs: [] }, all, missing]) {
      accepted(kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: avail }));
      for (const item of accepted(kernel.inspect(who, executionId)).recoveryHolds) assertDiagnostic(item.reason);
    }
    const blocked = refused(kernel.requestTakeover(who, executionId, open));
    assert.equal(blocked.classification, "recovery_held"); assertDiagnostic(blocked.reason);
    accepted(kernel.submitOutcome(who, outcomeFor(executionId, open), submissionFor(driver, open.activationId)));
    const after = accepted(kernel.inspect(who, executionId));
    assert.deepEqual(after.recoveryHistory.map(h => h.transition), ["entered", "updated", "cleared_by_declaration", "entered", "ended_by_outcome"]);
    assert.deepEqual(after.recoveryHolds, []);
    for (const entry of after.recoveryHistory) {
      assertDiagnostic(entry.reason);
      assert.equal(entry.activationId, open.activationId);
      assert.equal(entry.actorNamespace, who.namespace);
      assert.ok(Object.isFrozen(entry));
      if (label === "128") assert.ok(entry.reason.includes(pin)); else assert.ok(!entry.reason.includes(pin));
    }
    assert.equal(driver.seen[0]?.definitionRevision, pin);
    assert.equal(driver.seen[0]?.runtimeContractRevision, pin);
    assert.equal(driver.seen[0]?.progressCodec, pin);
  });
}

test("explicit protocol diagnostics retain their existing 1,024-unit payload rule through both clear paths", () => {
  const s = setup("namespace-\ud800");
  const diagnostic = "é".repeat(2_000);
  const first = accepted(s.kernel.reportProtocolFailure(s.who, s.executionId, { ...s.open, diagnostic }));
  assert.ok(first.recoveryHolds[0]?.reason.endsWith("é".repeat(1_024)));
  const current = accepted(s.kernel.requestTakeover(s.who, s.executionId, s.open));
  accepted(s.kernel.reportProtocolFailure(s.who, s.executionId, { ...current, diagnostic }));
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, current), submissionFor(s.driver, current.activationId)));
  assert.deepEqual(s.view().recoveryHistory.map(h => h.transition), ["entered", "cleared_by_takeover", "entered", "ended_by_outcome"]);
  for (const entry of s.view().recoveryHistory) {
    assert.equal(entry.reason.split("é").length - 1, 1_024, "explicit operational text has a payload limit, not the identity rendering rule");
    assert.equal(entry.activationId, s.open.activationId);
  }
});
