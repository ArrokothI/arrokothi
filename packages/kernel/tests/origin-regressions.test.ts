/** TOOLS-02 extractions. Source-specific P1-G readings are recorded in the packet's triage plans. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionCoordinator as CoreCoordinator, type CreateExecutionRequest, type SubmitInputRequest } from "../src/index.ts";
import { explainDiagnosticIssues } from "../src/envelope.ts";
import { ExecutionCoordinator, accepted, caller, createRequest, outcomeFor, recordingDriver, refused } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";

function opened(key = "origin-regression") {
  const who = caller("origin-owner"), driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(who, createRequest({ creationKey: key })));
  const exchange = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const grant = driver.submissions[0]!;
  const view = () => accepted(kernel.inspect(who, executionId));
  return { who, driver, kernel, executionId, exchange, grant, view };
}

test("listing scans equal scope positions for early, late and absent matches", () => {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const visible = ["first", "second"].map(creationKey => accepted(kernel.createExecution(caller("owner"), createRequest({ creationKey }))).executionId);
  accepted(kernel.createExecution(caller("hidden", "tenant-b"), createRequest({ scope: "tenant-b" })));
  const scans = [["tenant-a", "x", "y"], ["x", "y", "tenant-a"], ["x", "y", "z"]].map((values, index) => {
    const reads: string[] = [];
    const scopes = new Proxy(values, { get(target, key, receiver) {
      if (typeof key === "string" && /^(0|[1-9][0-9]*)$/.test(key)) reads.push(key);
      return Reflect.get(target, key, receiver);
    } });
    const listed = kernel.visibleExecutions({ namespace: "reader", scopes });
    assert.deepEqual(listed, index < 2 ? visible : []);
    return reads;
  });
  assert.deepEqual(scans[0], ["0", "1", "2", "0", "1", "2", "0", "1", "2"]);
  assert.deepEqual(scans[1], scans[0]);
  assert.deepEqual(scans[2], scans[0]);
});

test("a completed exchange grant cannot authorize the next exchange's current coordinates", () => {
  const s = opened();
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.exchange), s.grant));
  const next = accepted(s.kernel.dispatch(s.who, s.executionId, { bound: 1 }));
  const currentGrant = s.driver.submissions[1]!;
  assert.notStrictEqual(currentGrant, s.grant);
  assert.notEqual(next.activationId, s.exchange.activationId);
  const before = s.view(), sent = s.driver.seen.length;
  const rejection = refused(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, next), s.grant));
  assert.equal(rejection.classification, "unauthorized_submission");
  assertOnlyRefusal(before, s.view(), rejection);
  assert.equal(s.driver.seen.length, sent);
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, next), currentGrant));
  assert.equal(s.view().progressRevision, 2);
});

test("a grant minted for another Execution cannot authorize a current-coordinate proposal", () => {
  const s = opened("grant-a");
  const other = accepted(s.kernel.createExecution(s.who, createRequest({ creationKey: "grant-b" }))).executionId;
  const otherExchange = accepted(s.kernel.dispatch(s.who, other, { bound: 1 }));
  const otherGrant = s.driver.submissions[1]!;
  const before = accepted(s.kernel.inspect(s.who, other)), firstBefore = s.view(), sent = s.driver.seen.length;
  const rejection = refused(s.kernel.submitOutcome(s.who, outcomeFor(other, otherExchange), s.grant));
  assert.equal(rejection.classification, "unauthorized_submission");
  assertOnlyRefusal(before, accepted(s.kernel.inspect(s.who, other)), rejection);
  assert.deepEqual(s.view(), firstBefore);
  assert.equal(s.driver.seen.length, sent);
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(other, otherExchange), otherGrant));
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.exchange), s.grant));
});

test("opaque Activation identity rejects prefix, suffix, NFD and uppercase variants", () => {
  const s = opened("café"), original = s.exchange.activationId;
  const variants = ["prefix" + original, original + "suffix", original.normalize("NFD"), original.toUpperCase()];
  for (const activationId of variants) {
    assert.notEqual(activationId, original);
    const before = s.view(), sent = s.driver.seen.length;
    const rejection = refused(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, { ...s.exchange, activationId }), s.grant));
    assert.equal(rejection.classification, "stale_exchange");
    assertOnlyRefusal(before, s.view(), rejection);
    assert.equal(s.driver.seen.length, sent);
  }
  const equal = ("#" + original).slice(1);
  assert.equal(equal, original);
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, { ...s.exchange, activationId: equal }), s.grant));
});

test("malformed recovery retains the located code without the nonempty issue message", () => {
  const s = opened(), before = s.view(), sent = s.driver.seen.length;
  const rejection = refused(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.exchange.activationId, available: undefined }));
  assert.equal(rejection.classification, "malformed_value");
  assert.equal(rejection.reason, "recovery request is not acceptable: available unsupported_form");
  assertOnlyRefusal(before, s.view(), rejection);
  assert.equal(s.driver.seen.length, sent);
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.exchange), s.grant));
});

test("rooted bracket diagnostics stay adjacent while member paths keep their dot", () => {
  assert.equal(explainDiagnosticIssues([
    { root: "progress", path: "[0]", code: "undefined_member", message: "first item absent" },
    { root: "progress", path: "member", code: "unsupported_form", message: "member is unsupported" },
  ], true), "progress[0] undefined_member (first item absent); progress.member unsupported_form (member is unsupported)");
});

for (const safe of ["absent", "false"] as const) {
  test(`protocol hold permits takeover but ${safe} Driver safety still refuses it`, () => {
    const s = opened();
    if (safe === "absent") delete s.driver.isSafeToReplace;
    else s.driver.isSafeToReplace = () => false;
    accepted(s.kernel.reportProtocolFailure(s.who, s.executionId, s.exchange));
    const hold = s.view().recoveryHolds[0]!;
    assert.equal(hold.cause, "protocol_failure");
    assert.deepEqual(hold.permittedNextActions, ["request_takeover", "submit_outcome"]);
    const sent = s.driver.seen.length, beforeTakeover = s.view();
    const takeover = refused(s.kernel.requestTakeover(s.who, s.executionId, s.exchange));
    assert.equal(takeover.classification, "unsafe_replacement");
    assertOnlyRefusal(beforeTakeover, s.view(), takeover);
    const beforeRedelivery = s.view(), redelivery = refused(s.kernel.redeliver(s.who, s.executionId));
    assert.equal(redelivery.classification, "recovery_held");
    assertOnlyRefusal(beforeRedelivery, s.view(), redelivery);
    assert.equal(s.driver.seen.length, sent);
    accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.exchange), s.grant));
    assert.deepEqual(s.view().recoveryHolds, []);
  });
}

test("creation and ingress retain each shifting envelope getter's first observation", () => {
  const kernel = new CoreCoordinator({ driver: recordingDriver() }), who = caller("first-observation");
  const bytes = (text: string) => new TextEncoder().encode(text);
  const reads: Record<string, number> = {};
  const shifting = <T extends object>(first: T, label: string): T => {
    const result = {};
    for (const [key, value] of Object.entries(first)) Object.defineProperty(result, key, {
      enumerable: true, get() { const name = `${label}.${key}`; reads[name] = (reads[name] ?? 0) + 1; return reads[name] === 1 ? value : "changed-after-observation"; },
    });
    return result as T;
  };
  const initialInput = { kind: "first-kind", subscriptionClass: "first-subscription", payload: bytes('{"first":1}') };
  const first: CreateExecutionRequest = { creationKey: "first-key", scope: "tenant-a", definitionRevision: "first-definition", runtimeContractRevision: "first-runtime", progressCodec: "first-codec", authorityContext: bytes('{"tenant":"first"}'), initialInput };
  const observed = shifting({ ...first, initialInput: shifting(initialInput, "initial") }, "create");
  const created = accepted(kernel.createExecution(who, observed));
  const view = accepted(kernel.inspect(who, created.executionId));
  assert.deepEqual([view.creationKey, view.scope, view.definitionRevision, view.runtimeContractRevision, view.progressCodec], ["first-key", "tenant-a", "first-definition", "first-runtime", "first-codec"]);
  assert.deepEqual(view.authorityContext, { tenant: "first" });
  assert.deepEqual([view.mailbox[0]!.kind, view.mailbox[0]!.subscriptionClass, view.mailbox[0]!.payload], ["first-kind", "first-subscription", { first: 1 }]);
  assert.equal(accepted(kernel.createExecution(who, first)).replayed, true);
  const input: SubmitInputRequest = { destination: created.executionId, requestKey: "first-input", kind: "input-kind", subscriptionClass: "input-subscription", payload: bytes('{"first":2}') };
  const submitted = accepted(kernel.submitInput(who, shifting(input, "input")));
  assert.equal(accepted(kernel.submitInput(who, input)).replayed, true);
  assert.equal(accepted(kernel.inspect(who, created.executionId)).mailbox.length, 2);
  const last = accepted(kernel.inspect(who, created.executionId)).mailbox[1]!;
  assert.deepEqual([last.kind, last.subscriptionClass, last.payload], ["input-kind", "input-subscription", { first: 2 }]);
  assert.equal(last.eventId, submitted.eventId);
  assert.deepEqual(Object.keys(reads).sort(), [...Object.keys(first).map(key => `create.${key}`), ...Object.keys(initialInput).map(key => `initial.${key}`), ...Object.keys(input).map(key => `input.${key}`)].sort());
  assert.ok(Object.values(reads).every(count => count === 1), JSON.stringify(reads));
});
