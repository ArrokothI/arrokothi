/** Review-02 counterexamples: aggregate reasons, exact equality and diagnostic edges. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ExecutionCoordinator, type SubmissionGrant } from "../src/index.ts";
import { captureOutcome } from "../src/outcome.ts";
import { explainDiagnosticIssues } from "../src/envelope.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";
import { assertDiagnostic, assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";

const available = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
function setup(namespace = "aggregate") {
  const who = caller(namespace), driver = recordingDriver();
  driver.isSafeToReplace = () => true;
  const kernel = new ExecutionCoordinator({ driver, emissionsPerOutcome: 2 });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const grant = submissionFor(driver, open.activationId);
  const view = () => accepted(kernel.inspect(who, executionId));
  const valid = () => kernel.submitOutcome(who, outcomeFor(executionId, open), grant);
  return { who, driver, kernel, executionId, open, grant, view, valid };
}

for (const [label, namespace] of [["long", "N".repeat(200)], ["non-ASCII", "é"], ["high surrogate", "\ud800"], ["low surrogate", "\udc00"]]) {
  for (const operation of ["Outcome", "takeover", "recovery", "protocol"] as const) {
    test(`EVID-01 ${operation}: different ${label} identities both render omitted`, () => {
      const s = setup(namespace);
      const wrong = { ...s.open, activationId: `${s.open.activationId}-wrong` };
      const before = s.view(), deliveries = s.driver.seen.length;
      const result = operation === "Outcome" ? s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, wrong), s.grant)
        : operation === "takeover" ? s.kernel.requestTakeover(s.who, s.executionId, wrong)
        : operation === "recovery" ? s.kernel.recoverExecution(s.who, s.executionId, { ...wrong, available })
        : s.kernel.reportProtocolFailure(s.who, s.executionId, wrong);
      assert.equal(result.ok, false, "a lossy equality would act on the current exchange");
      if (result.ok) return;
      assert.equal(result.error.classification, "stale_exchange");
      assert.match(result.error.reason, /<identity omitted>/);
      assertOnlyRefusal(before, s.view(), result.error);
      assert.equal(s.driver.seen.length, deliveries);
      accepted(s.valid());
    });
  }
}
for (const [label, keys] of [["long", ["a".repeat(129), "b".repeat(129)]], ["non-ASCII", ["é", "ê"]]] as const) {
  test(`EVID-01 distinct ${label} Emission keys both render omitted and both accept`, () => {
    const s = setup();
    accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open, { emissions: keys.map((emissionKey, value) => ({ emissionKey, value })) }), s.grant));
    assert.deepEqual(s.view().emissions.map(e => e.emissionKey), keys);
    assert.notEqual(s.view().emissions[0]!.emissionId, s.view().emissions[1]!.emissionId);
  });
}
for (const length of [128, 129]) {
  test(`DEC-5 value-relative path ${length} before adding root label`, () => {
    const s = setup(), key = "p".repeat(length);
    const direct = explainDiagnosticIssues([{ root: "progress", path: key, code: "undefined_member", message: "bad" }], true);
    assert.ok(direct.includes(length === 128 ? `progress.${key} undefined_member` : "progress.<omitted> undefined_member"));
    const before = s.view();
    const r = refused(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open, { progress: { [key]: undefined } }), s.grant));
    assert.equal(r.classification, "malformed_envelope");
    assert.ok(r.reason.includes(length === 128 ? `progress.${key} undefined_member` : "progress.<omitted> undefined_member"));
    if (length === 129) assert.ok(!r.reason.includes(key));
    assertOnlyRefusal(before, s.view(), r);
    const control = refused(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: { ...available, definitionRevisions: { [key]: undefined } as never } }));
    assert.ok(control.reason.includes(length === 128 ? `available.definitionRevisions.${key} undefined_member` : "available.definitionRevisions.<omitted> undefined_member"));
    accepted(s.valid());
  });
}
for (const length of [1_024, 1_025]) {
  test(`DEC-5 renderer message ${length}; capture uses fixed type labels`, () => {
    const s = setup();
    const prefix = "expected a plain object, received ";
    const name = "N".repeat(length - prefix.length - " instance".length);
    const direct = explainDiagnosticIssues([{ root: "progress", path: "", code: "unsupported_form", message: `${prefix}${name} instance` }], true);
    assert.ok(direct.includes(length === 1_024 ? `(${prefix}${name} instance)` : "(<message omitted>)"));
    const before = s.view();
    const r = refused(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open, { progress: Object.create({ constructor: { name } }) }), s.grant));
    assert.ok(r.reason.includes(`(${prefix}object)`));
    assert.ok(!r.reason.includes(name));
    assertOnlyRefusal(before, s.view(), r);
    accepted(s.valid());
  });
}

for (const step of ["complete", "fail"] as const) {
  test(`AGG-01 aggregate progress, two Emissions and ${step}: <=16,384 units, retained and answerable`, () => {
    const s = setup();
    const root = Array(4_096).fill(Object.create({ constructor: { name: "N".repeat(980) } }));
    // Each root is under its byte/entry/depth limits. The former detailed reason exceeded 16 MiB.
    const proposal = outcomeFor(s.executionId, s.open, { progress: root, emissions: [{ emissionKey: "one", value: root }, { emissionKey: "two", value: root }], next: step === "complete" ? { step, result: root } : { step, error: root } });
    const before = s.view(), deliveries = s.driver.seen.length;
    const r = refused(s.kernel.submitOutcome(s.who, proposal, s.grant));
    assert.equal(r.classification, "malformed_envelope");
    assertDiagnostic(r.reason, 16_384);
    assert.match(r.reason, /16376 additional issues: unsupported_form=16376$/);
    assertOnlyRefusal(before, s.view(), r);
    assert.equal(s.driver.seen.length, deliveries);
    accepted(s.valid());
  });
}
test("AGG-01 all recovery roots and the two other malformed controls return and retain", () => {
  const s = setup(), root = Array(4_096).fill(undefined);
  const before = s.view();
  const r = refused(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: { definitionRevisions: root, runtimeContractRevisions: root, progressCodecs: root } }));
  assert.equal(r.classification, "malformed_value");
  assertDiagnostic(r.reason, 16_384);
  assert.match(r.reason, /12280 additional issues: undefined_member=12280$/);
  assertOnlyRefusal(before, s.view(), r);
  for (const op of ["takeover", "protocol"]) {
    const beforeControl = s.view();
    const invalid = { activationId: undefined, writerEpoch: undefined } as never;
    const result = op === "takeover" ? s.kernel.requestTakeover(s.who, s.executionId, invalid) : s.kernel.reportProtocolFailure(s.who, s.executionId, invalid);
    const refusal = refused(result);
    assert.equal(refusal.classification, "malformed_value");
    assertDiagnostic(refusal.reason, 16_384);
    assert.match(refusal.reason, /activationId unsupported_form; writerEpoch not_a_count/);
    assertOnlyRefusal(beforeControl, s.view(), refusal);
  }
  accepted(s.valid());
});
for (const count of [0, 8, 9]) {
  test(`DEC-5 detail count edge ${count}`, () => {
    const issues = Array.from({ length: count }, (_, i) => ({ path: `progress[${i}]`, code: "undefined_member", message: `issue ${i}` }));
    const reason = explainDiagnosticIssues(issues, true);
    const expected = issues.slice(0, 8).map(i => `${i.path} ${i.code} (${i.message})`).join("; ") + (count === 9 ? "; 1 additional issues: undefined_member=1" : "");
    assert.equal(reason, expected);
  });
}
test("DEC-5 late codes and counts contribute to the same combined refusal in first occurrence order", () => {
  const s = setup();
  const before = s.view();
  const proposal = outcomeFor(s.executionId, s.open, { activationId: undefined, progress: Array(10).fill(undefined), effects: [1], next: { step: "await", wait: {} }, extra: 1 } as never);
  const r = refused(s.kernel.submitOutcome(s.who, proposal, s.grant));
  assert.equal(r.classification, "malformed_envelope");
  assert.match(r.reason, /activationId unsupported_form/);
  assert.match(r.reason, /6 additional issues: undefined_member=3, effects_unsupported=1, wait_unsupported=1, unknown_field=1$/);
  assertOnlyRefusal(before, s.view(), r);
  accepted(s.valid());
});
test("aggregate content stays behind currency and authority; capture retains bounded weighted diagnostics", () => {
  const s = setup(), name = "N".repeat(2_000);
  const proposal = outcomeFor(s.executionId, s.open, { progress: Array(32).fill(Object.create({ constructor: { name } })) });
  const capture = captureOutcome(proposal, 2);
  assert.equal(capture.issues.length, 9);
  assert.equal(capture.issues[0]!.message, "expected a plain object, received object");
  assert.equal(capture.issues[8]!.occurrences, 24);
  assert.equal(capture.issues.reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0), 32);
  for (const [overrides, grant, classification] of [[{}, undefined, "unauthorized_submission"], [{ writerEpoch: 2 }, s.grant, "stale_exchange"]] as const) {
    const before = s.view();
    const r = refused(s.kernel.submitOutcome(observer("visible"), { ...proposal, ...overrides }, grant as SubmissionGrant));
    assert.equal(r.classification, classification);
    assert.ok(!r.reason.includes("unsupported_form") && !r.reason.includes("additional issues"));
    assertOnlyRefusal(before, s.view(), r);
  }
  accepted(s.valid());
});
for (const cause of ["code", "protocol"] as const) {
  test(`O-R2-2 redelivery ${cause} hold bounds minted Activation but preserves explicit payload`, () => {
    const s = setup("namespace-\ud800" + "N".repeat(2_000));
    if (cause === "code") accepted(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] } }));
    else accepted(s.kernel.reportProtocolFailure(s.who, s.executionId, { ...s.open, diagnostic: "é".repeat(2_000) }));
    const before = s.view(), deliveries = s.driver.seen.length;
    const r = refused(s.kernel.redeliver(s.who, s.executionId));
    assert.equal(r.classification, "recovery_held");
    assert.match(r.reason, /^Activation <identity omitted> is recovery-held/);
    assert.ok(r.reason.length <= 2_048);
    if (cause === "protocol") assert.equal(r.reason.split("é").length - 1, 1_024);
    else assertDiagnostic(r.reason);
    assertOnlyRefusal(before, s.view(), r);
    assert.equal(s.driver.seen.length, deliveries);
    accepted(s.valid());
  });
}
test("DEC-5 bound proof: fixed code vocabulary and maximum-size details plus all summary codes", () => {
  const files = ["values.ts", "envelope.ts", "outcome.ts"];
  const codes = new Set(files.flatMap(file => [...readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8").matchAll(/code: "([a-z_]+)"/g)].map(m => m[1]!)));
  assert.equal(codes.size, 17);
  assert.ok([...codes].every(c => c.length <= 32));
  const details = Array.from({ length: 8 }, () => ({ root: "r".repeat(63), path: "p".repeat(128), code: "c".repeat(32), message: "m".repeat(1_024) }));
  const rest = [...codes].map(code => ({ path: "ignored", code, message: "ignored" }));
  const reason = explainDiagnosticIssues([...details, ...rest], true);
  assertDiagnostic(reason, 12_000);
  for (const code of codes) assert.ok(reason.includes(`${code}=1`));
});

test("DEC-5 root metadata is own-only under ambient pollution", () => {
  let reads = 0;
  Object.defineProperty(Object.prototype, "root", { configurable: true, get() { reads++; return "spoofed"; } });
  let reason: string;
  try { reason = explainDiagnosticIssues([{ path: "activationId", code: "unsupported_form", message: "bad identity" }], true); }
  finally { delete (Object.prototype as { root?: string }).root; }
  assert.equal(reads, 0);
  assert.equal(reason, "activationId unsupported_form (bad identity)");
});
