/** Revision 4: diagnostic storage is bounded at capture, with complete code counts and reads. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalize, boundaryValueIssues, isBoundaryValue, type ValueIssue } from "../src/values.ts";
import { captureOutcome } from "../src/outcome.ts";
import { explainDiagnosticIssues, located, explain } from "../src/envelope.ts";
import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor, revokedProxy } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";

const total = (issues: readonly ValueIssue[]) => issues.reduce((n, issue) => n + (issue.occurrences ?? 1), 0);
function issuesOf(value: unknown) {
  const result = canonicalize(value);
  assert.equal(result.ok, false);
  if (result.ok) throw Error("expected refusal");
  // 8 details plus at most 11 distinct value codes. The bound is independent of positions.
  assert.ok(result.issues.length <= 19, `unbounded allocation: ${result.issues.length} records`);
  for (const issue of result.issues) {
    assert.ok(issue.path.length <= 128);
    assert.ok(issue.message.length <= 1_024);
  }
  return result.issues;
}

const ghostObject = (name = "ghost") => new Proxy({}, { ownKeys: () => [name], getOwnPropertyDescriptor: () => undefined });
const ghostArray = (backed: boolean) => new Proxy([], {
  ownKeys: () => ["length", "1"],
  getOwnPropertyDescriptor: (target, key) => key === "1"
    ? backed ? { value: 1, writable: true, configurable: true, enumerable: true } : undefined
    : Reflect.getOwnPropertyDescriptor(target, key),
});
const factories: [string, () => unknown, string][] = [
  ["undefined array members", () => undefined, "undefined_member"],
  ["nonfinite", () => Infinity, "non_finite_number"],
  ["unsupported primitive", () => Symbol("bad"), "unsupported_form"],
  ["foreign object prototype", () => new Date(), "unsupported_form"],
  ["foreign array prototype", () => Object.setPrototypeOf([], null), "unsupported_form"],
  ["revoked structure", () => revokedProxy(), "unstable_representation"],
  ["throwing structure", () => new Proxy({}, { ownKeys() { throw null; } }), "unstable_representation"],
  ["lone surrogate", () => "\ud800", "lone_surrogate"],
  ["object ghost descriptor", () => ghostObject(), "unstable_representation"],
  ["array ghost index", () => ghostArray(false), "unstable_representation"],
  ["array out-of-range index", () => ghostArray(true), "unrepresentable_member"],
  ["array unstable length", () => new Proxy([], { get: () => 1 }), "unstable_representation"],
  ["array excess length", () => new Array(4097), "too_many_entries"],
  ["array extra member", () => Object.assign([], { extra: 1 }), "unrepresentable_member"],
  ["array symbol", () => Object.assign([], { [Symbol()]: 1 }), "unrepresentable_member"],
  ["object symbol", () => ({ [Symbol()]: 1 }), "unrepresentable_member"],
  ["object nonenumerable", () => Object.defineProperty({}, "hidden", { value: 1 }), "unrepresentable_member"],
  ["object undefined", () => ({ a: undefined }), "undefined_member"],
  ["object accessor", () => ({ get a() { throw Error("must not read"); } }), "unrepresentable_member"],
  ["descriptor/read mismatch", () => new Proxy({ a: 1 }, { get: () => 2 }), "unstable_representation"],
  ["object bad key", () => ({ ["\ud800"]: 1 }), "lone_surrogate"],
];
for (const [name, factory, code] of factories) {
  test(`V-D1 every issue family: ${name}`, () => {
    const issues = issuesOf(Array(256).fill(factory()));
    assert.equal(total(issues), 256);
    assert.ok(issues.every(issue => issue.code === code));
    assert.equal(issues[8]?.occurrences, 248);
  });
}

test("V-D1 holes and accessors retain all occurrences without invoking accessors", () => {
  const holes = new Array(4096);
  assert.equal(total(issuesOf(holes)), 4096);
  let calls = 0;
  const accessors = Array.from({ length: 4096 }, () => 1);
  for (let i = 0; i < accessors.length; i++) Object.defineProperty(accessors, i, { get() { calls++; return 1; } });
  assert.equal(total(issuesOf(accessors)), 4096);
  assert.equal(calls, 0);
});

test("V-D1 cycle and depth issues share the collector", () => {
  const cycle: unknown[] = []; cycle.push(cycle);
  assert.equal(total(issuesOf(Array(256).fill(cycle))), 256);
  let deep: unknown = Array(256).fill([]);
  for (let i = 0; i < 31; i++) deep = [deep];
  const issues = issuesOf(deep);
  assert.equal(total(issues), 256);
  assert.ok(issues.every(issue => issue.code === "too_deep"));
});

test("V-D1 long strings/names and oversized listings keep the existing stopping/read bounds", () => {
  for (const value of ["x".repeat(65537), { ["x".repeat(65537)]: 1 }, Object.fromEntries(Array.from({ length: 4097 }, (_, i) => [`a${i}`, 1]))]) {
    const issues = issuesOf(Array(256).fill(value));
    assert.ok(total(issues) > 8);
    assert.ok(issues.some(issue => issue.code === "too_many_bytes"), "the original byte stop still applies");
  }
});

test("V-D1 P5: 532480 invalid positions retain nine records and exact ordered details", () => {
  const issues = issuesOf(Array(130).fill(Array(4096).fill(undefined)));
  assert.equal(total(issues), 532480);
  assert.equal(issues.length, 9);
  assert.deepEqual(issues.slice(0, 8).map(i => i.path), Array.from({ length: 8 }, (_, i) => `[0][${i}]`));
  assert.equal(issues[8]?.occurrences, 532472);
});

test("V-D1 bounded paths include phantom names, long ancestors, and literal omission text", () => {
  for (const value of [ghostObject("x".repeat(1_000_000)), { ["x".repeat(65536)]: { a: undefined } }, { ["x".repeat(128)]: Array(32).fill(undefined) }]) {
    assert.equal(issuesOf(value)[0]?.path, "<omitted>");
  }
  assert.equal(issuesOf({ "<omitted>": { a: undefined } })[0]?.path, "<omitted>.a");
  assert.equal(issuesOf({ ["a".repeat(128)]: undefined })[0]?.path, "a".repeat(128));
  const hostile = Object.create({ constructor: { name: "N".repeat(1_000_000) } });
  assert.equal(issuesOf(hostile)[0]?.message, "expected a plain object, received object");
});

test("V-D1 suffix counts preserve late codes and first occurrence order across root consumers", () => {
  const root = [...Array(9).fill(undefined), NaN, Symbol(), undefined, NaN];
  const issues = issuesOf(root);
  assert.deepEqual(issues.slice(8).map(i => [i.code, i.occurrences]), [["undefined_member", 2], ["non_finite_number", 2], ["unsupported_form", 1]]);
  assert.match(explainDiagnosticIssues(issues, true), /5 additional issues: undefined_member=2, non_finite_number=2, unsupported_form=1$/);
  assert.equal(total(boundaryValueIssues(root)), 13);
  assert.equal(isBoundaryValue(root), false);
  assert.match(explain(located(issues, "payload")), /payload undefined_member \(2 additional occurrences; locations omitted\)/);
});

test("V-D1 own-only multiplicity under ambient pollution and capture-time mutation", () => {
  let reads = 0;
  const value = new Proxy(Array(64).fill(undefined), { getPrototypeOf(target) {
    Object.defineProperty(Object.prototype, "occurrences", { configurable: true, get() { reads++; return 999; } });
    return Reflect.getPrototypeOf(target);
  } });
  let issues: ValueIssue[], reason: string;
  try {
    const result = canonicalize(value);
    if (result.ok) throw Error("expected refusal");
    issues = result.issues;
    reason = explainDiagnosticIssues(issues, true);
    const relocated = located(issues, "payload");
    assert.match(explain(relocated), /56 additional occurrences/);
  } finally { delete (Object.prototype as { occurrences?: unknown }).occurrences; }
  assert.equal(reads, 0);
  assert.equal(total(issues!), 64);
  assert.match(reason!, /56 additional issues: undefined_member=56$/);
});

function setup() {
  const who = caller("cost"), driver = recordingDriver(), kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, kernel, executionId, open, grant: submissionFor(driver, open.activationId), view: () => accepted(kernel.inspect(who, executionId)) };
}

test("V-D1 eight eager roots before authority: every position once, no forbidden mutation", () => {
  const s = setup();
  let descriptors = 0, reads = 0;
  const root = new Proxy(Array(4096).fill(undefined), {
    getOwnPropertyDescriptor(target, key) { if (key !== "length") descriptors++; return Reflect.getOwnPropertyDescriptor(target, key); },
    get(target, key, receiver) { if (key !== "length") reads++; return Reflect.get(target, key, receiver); },
  });
  const proposal = outcomeFor(s.executionId, s.open, { progress: root, emissions: Array.from({ length: 6 }, (_, i) => ({ emissionKey: `e${i}`, value: root })), next: { step: "complete", result: root } });
  for (const [grant, classification] of [[undefined, "unauthorized_submission"], [s.grant, "malformed_envelope"]] as const) {
    const before = s.view(), sent = s.driver.seen.length;
    descriptors = reads = 0;
    const refusal = refused(s.kernel.submitOutcome(observer("visible"), proposal, grant!));
    assert.equal(descriptors, 8 * 4096);
    assert.equal(reads, 8 * 4096);
    assert.equal(refusal.classification, classification);
    if (grant) assert.match(refusal.reason, /32760 additional issues: undefined_member=32760$/);
    else assert.doesNotMatch(refusal.reason, /undefined_member|additional issues/);
    assertOnlyRefusal(before, s.view(), refusal);
    assert.equal(s.driver.seen.length, sent);
  }
  const capture = captureOutcome(proposal, 256);
  assert.equal(capture.issues.length, 8 * 9);
  assert.equal(total(capture.issues as ValueIssue[]), 8 * 4096);
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
});

test("V-D1 creation, ingress, all recovery roots, complete and fail consume weighted evidence", () => {
  const s = setup(), root = Array(64).fill(undefined);
  const bad = root as never;
  const creation = refused(s.kernel.createExecution(s.who, createRequest({ creationKey: "bad", authorityContext: bad, initialInput: { kind: "application.message", payload: bad } })));
  assert.match(creation.reason, /authorityContext undefined_member \(56 additional occurrences/);
  assert.match(creation.reason, /initialInput.payload undefined_member \(56 additional occurrences/);
  const before = s.view();
  const ingress = refused(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "bad", kind: "application.message", payload: bad }));
  assert.match(ingress.reason, /56 additional occurrences/);
  assertOnlyRefusal(before, s.view(), ingress);
  const recovery = refused(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: { definitionRevisions: bad, runtimeContractRevisions: bad, progressCodecs: bad } }));
  assert.match(recovery.reason, /184 additional issues: undefined_member=184$/);
  for (const step of ["complete", "fail"] as const) {
    const proposal = outcomeFor(s.executionId, s.open, { progress: bad, next: step === "complete" ? { step, result: bad } : { step, error: bad } });
    const capture = captureOutcome(proposal, 256);
    assert.equal(total(capture.issues as ValueIssue[]), 128);
    assert.match(refused(s.kernel.submitOutcome(s.who, proposal, s.grant)).reason, /120 additional issues: undefined_member=120$/);
  }
});

test("V-D1 different root suffixes compose in global capture order", () => {
  const s = setup();
  const proposal = outcomeFor(s.executionId, s.open, {
    progress: [...Array(8).fill(undefined), NaN, Symbol(), NaN] as never,
    emissions: [{ emissionKey: "next-root", value: [Symbol(), undefined, NaN, ...Array(8).fill(undefined)] as never }],
    next: { step: "fail", error: Infinity },
  });
  const refusal = refused(s.kernel.submitOutcome(s.who, proposal, s.grant));
  assert.match(refusal.reason, /15 additional issues: non_finite_number=4, unsupported_form=2, undefined_member=9$/);
});
