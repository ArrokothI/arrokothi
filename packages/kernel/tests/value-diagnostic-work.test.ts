/** Review 06: constructing a refusal never inspects caller properties for a type label. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalize, type ValueIssue, type ValueIssueCode } from "../src/values.ts";
import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor, revokedProxy } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";

type Counts = { structural: number; diagnostic: number };
type RefusedFixture = { value: unknown; counts: Counts; code: ValueIssueCode; message: string };

function issuesOf(value: unknown): ValueIssue[] {
  const result = canonicalize(value);
  assert.equal(result.ok, false);
  if (result.ok) throw Error("expected refusal");
  return result.issues;
}

/** A terminal getter distinguishes even a single ordinary read through the entire deep chain. */
function chain(counts: Counts, depth: number): object {
  let tail: object = Object.create(null);
  Object.defineProperty(tail, "constructor", { get() { counts.diagnostic++; return { name: "CallerType" }; } });
  for (let index = 0; index < depth; index++) tail = Object.create(tail);
  return tail;
}

function fixture(kind: "foreign object" | "foreign array" | "thrown object", depth = 10_000): RefusedFixture {
  const counts = { structural: 0, diagnostic: 0 };
  const prototype = chain(counts, depth);
  // Prove the measured getter is live, then exclude that fixture check from the Kernel count.
  assert.equal(Reflect.get(prototype, "constructor").name, "CallerType");
  assert.equal(counts.diagnostic, 1);
  counts.diagnostic = 0;
  if (kind === "thrown object") {
    const thrown = Object.create(prototype);
    return {
      counts, code: "unstable_representation",
      message: "observing this value's structure threw (object), so it presents no readable content",
      value: new Proxy({}, { ownKeys() { counts.structural++; throw thrown; } }),
    };
  }
  const target = kind === "foreign array" ? Object.setPrototypeOf([], prototype) : Object.create(prototype);
  return {
    counts, code: "unsupported_form",
    message: `expected a plain ${kind === "foreign array" ? "array" : "object"}, received object`,
    value: new Proxy(target, { getPrototypeOf(value) { counts.structural++; return Reflect.getPrototypeOf(value); } }),
  };
}

function assertWeighted(issues: readonly ValueIssue[], count: number, code: ValueIssueCode, message: string): void {
  const details = Math.min(count, 8);
  assert.deepEqual(issues.slice(0, details), Array.from({ length: details }, (_, index) => ({ path: `[${index}]`, code, message })));
  assert.deepEqual(issues.slice(details), count > 8
    ? [{ path: "", code, message: "additional occurrences (locations omitted)", occurrences: count - 8 }]
    : []);
  assert.equal(issues.reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0), count);
}

for (const kind of ["foreign object", "foreign array", "thrown object"] as const) {
  test(`V-D1 ${kind}: deep prototype diagnostics do zero lookups before and after detail eight`, () => {
    for (const depth of [0, 1_000, 10_000]) {
      const f = fixture(kind, depth);
      for (const count of [1, 8, 9, 4_096]) {
        f.counts.structural = f.counts.diagnostic = 0;
        const issues = issuesOf(Array(count).fill(f.value));
        assertWeighted(issues, count, f.code, f.message);
        assert.equal(f.counts.structural, count, "each position still gets its required structural observation");
        assert.equal(f.counts.diagnostic, 0, "no diagnostic [[Get]] can walk the caller-built chain");
      }
    }
  });
}

test("V-D1 every unsupported primitive, including a revoked function Proxy, has a type-only label", () => {
  let reads = 0;
  const callable = new Proxy(() => undefined, { get() { reads++; throw Error("diagnostic property read"); } });
  const revoked = Proxy.revocable(() => undefined, {});
  revoked.revoke();
  for (const value of [undefined, 1n, Symbol("caller"), callable, revoked.proxy]) {
    const issues = issuesOf(value);
    assert.deepEqual(issues, [{ path: "", code: "unsupported_form", message: `expected a boundary value, received ${typeof value}` }]);
  }
  assert.equal(reads, 0);
});

test("V-D1 own constructor, constructor.name, and thrown-value properties are never inspected", () => {
  for (const property of ["constructor", "name", "message", "then", Symbol.toPrimitive] as const) {
    let reads = 0;
    const thrown = Object.create(null) as Record<PropertyKey, unknown>;
    if (property === "name") {
      const constructor = Object.create(null);
      Object.defineProperty(constructor, "name", { get() { reads++; throw Error("name read"); } });
      Object.defineProperty(thrown, "constructor", { value: constructor });
      assert.throws(() => Reflect.get(constructor, "name"), /name read/);
    } else {
      Object.defineProperty(thrown, property, { get() { reads++; throw Error("property read"); } });
      assert.throws(() => Reflect.get(thrown, property), /property read/);
    }
    assert.equal(reads, 1, "the diagnostic probe is live");
    reads = 0;
    // Both sites used to describe a caller object: a foreign prototype, and an observation throw.
    const foreign = Object.create({});
    for (const key of Reflect.ownKeys(thrown)) Object.defineProperty(foreign, key, Object.getOwnPropertyDescriptor(thrown, key)!);
    assert.equal(issuesOf(foreign)[0]?.message, "expected a plain object, received object");
    const throwing = new Proxy({}, { ownKeys() { throw thrown; } });
    assertWeighted(issuesOf(Array(17).fill(throwing)), 17, "unstable_representation", "observing this value's structure threw (object), so it presents no readable content");
    assert.equal(reads, 0);
  }
  const hugeName = "N".repeat(1_000_000);
  assert.equal(issuesOf(Object.create({ constructor: { name: hugeName } }))[0]?.message, "expected a plain object, received object");
});

test("V-D1 thrown null, arrays, functions and revoked objects need no diagnostic structural observation", () => {
  const revokedFunction = Proxy.revocable(() => undefined, {});
  revokedFunction.revoke();
  for (const thrown of [null, [], 1n, Symbol(), revokedProxy(), revokedFunction.proxy]) {
    let calls = 0;
    const value = new Proxy({}, { ownKeys() { calls++; throw thrown; } });
    const label = thrown === null ? "null" : typeof thrown;
    assertWeighted(issuesOf(Array(17).fill(value)), 17, "unstable_representation", `observing this value's structure threw (${label}), so it presents no readable content`);
    assert.equal(calls, 17);
  }
});

function setup() {
  const who = caller("diagnostic-work"), driver = recordingDriver(), kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  return { who, driver, kernel, executionId, open, grant: submissionFor(driver, open.activationId), view: () => accepted(kernel.inspect(who, executionId)) };
}

for (const kind of ["foreign object", "thrown object"] as const) {
  test(`V-D1 ${kind}: eight eager Outcome roots preserve observations and whole refusal state`, () => {
    const s = setup(), f = fixture(kind);
    let descriptors = 0, reads = 0;
    const root = new Proxy(Array(64).fill(f.value), {
      getOwnPropertyDescriptor(target, key) { if (key !== "length") descriptors++; return Reflect.getOwnPropertyDescriptor(target, key); },
      get(target, key, receiver) { if (key !== "length") reads++; return Reflect.get(target, key, receiver); },
    });
    for (const step of ["complete", "fail"] as const) {
      const proposal = outcomeFor(s.executionId, s.open, {
        progress: root,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: `e${index}`, value: root })),
        next: step === "complete" ? { step, result: root } : { step, error: root },
      });
      const beforeHidden = s.view();
      const hidden = refused(s.kernel.submitOutcome(observer("hidden", "other-scope"), proposal, s.grant));
      assert.equal(hidden.classification, "unknown_destination");
      assert.deepEqual(s.view(), beforeHidden);
      assert.equal(descriptors + reads + f.counts.structural + f.counts.diagnostic, 0, "scope precedes all root observation");
      for (const grant of [undefined, s.grant]) {
        const before = s.view(), delivered = s.driver.seen.length;
        const result = refused(s.kernel.submitOutcome(observer("visible"), proposal, grant!));
        assert.equal(result.classification, grant ? "malformed_envelope" : "unauthorized_submission");
        assert.equal(descriptors, 8 * 64);
        assert.equal(reads, 8 * 64);
        assert.equal(f.counts.structural, 8 * 64);
        assert.equal(f.counts.diagnostic, 0);
        if (grant) assert.match(result.reason, new RegExp(`504 additional issues: ${f.code}=504$`));
        else assert.doesNotMatch(result.reason, /unsupported_form|unstable_representation|additional issues/);
        assertOnlyRefusal(before, s.view(), result);
        assert.equal(s.driver.seen.length, delivered);
        descriptors = reads = f.counts.structural = f.counts.diagnostic = 0;
      }
    }
    accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
  });

  test(`V-D1 ${kind}: creation, ingress and recovery use the same zero-lookup diagnostics`, () => {
    const s = setup(), f = fixture(kind), root = Array(64).fill(f.value) as never;
    const beforeCreation = s.view(), deliveries = s.driver.seen.length;
    const creation = refused(s.kernel.createExecution(s.who, createRequest({
      creationKey: "refused-create", authorityContext: root,
      initialInput: { kind: "application.message", payload: root },
    })));
    assert.equal(creation.classification, "malformed_value");
    assert.equal(creation.executionId, null);
    assert.equal(creation.position, 0);
    assert.match(creation.reason, new RegExp(`authorityContext ${f.code} \\(56 additional occurrences`));
    assert.match(creation.reason, new RegExp(`initialInput.payload ${f.code} \\(56 additional occurrences`));
    assert.equal(f.counts.structural, 2 * 64);
    assert.equal(f.counts.diagnostic, 0);
    assert.deepEqual(s.view(), beforeCreation);
    const validCreation = accepted(s.kernel.createExecution(s.who, createRequest({ creationKey: "refused-create" })));
    assert.equal(validCreation.receipt.position, 1, "the refused creation reserved no receipt or request identity");
    assert.equal(s.driver.seen.length, deliveries);

    f.counts.structural = 0;
    const beforeIngress = s.view();
    const ingress = refused(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "refused-input", kind: "application.message", payload: root }));
    assert.equal(ingress.classification, "malformed_value");
    assert.equal(f.counts.structural, 64);
    assert.equal(f.counts.diagnostic, 0);
    assert.match(ingress.reason, new RegExp(`${f.code} \\(56 additional occurrences`));
    assertOnlyRefusal(beforeIngress, s.view(), ingress);

    f.counts.structural = 0;
    const beforeRecovery = s.view();
    const recovery = refused(s.kernel.recoverExecution(s.who, s.executionId, { activationId: s.open.activationId, available: {
      definitionRevisions: root, runtimeContractRevisions: root, progressCodecs: root,
    } }));
    assert.equal(recovery.classification, "malformed_value");
    assert.equal(f.counts.structural, 3 * 64);
    assert.equal(f.counts.diagnostic, 0);
    assert.match(recovery.reason, new RegExp(`184 additional issues: ${f.code}=184$`));
    assertOnlyRefusal(beforeRecovery, s.view(), recovery);
    assert.equal(s.driver.seen.length, deliveries);
    accepted(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "refused-input", kind: "application.message", payload: null }));
    accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
  });
}
