/** Review 06: constructing a refusal never inspects caller properties for a type label. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

/**
 * Decision 03 condition 3: the descriptor is ordinary prebuilt data with a deep ordinary
 * prototype, exactly the shape in probe-descriptor-chain-04. The engine checks its absent
 * get/set fields internally. Those checks do not permit additional Kernel observations.
 */
function descriptorFixture(depth: number, value: undefined | 0) {
  let prototype: object | null = null;
  for (let index = 0; index < depth; index++) prototype = Object.create(prototype);
  const descriptors: PropertyDescriptor[] = Array.from({ length: 4_096 }, () => Object.assign(Object.create(prototype), {
    value, writable: true, enumerable: true, configurable: true,
  }));
  const counts = { prototypes: 0, ownKeys: 0, lengthDescriptors: 0, lengthReads: 0, descriptors: 0, reads: 0 };
  const positionDescriptors = new Uint32Array(4_096), positionReads = new Uint32Array(4_096);
  const target = Array(4_096).fill(value) as (undefined | 0)[];
  const inner = new Proxy(target, {
    getPrototypeOf(holder) { counts.prototypes++; return Reflect.getPrototypeOf(holder); },
    ownKeys(holder) { counts.ownKeys++; return Reflect.ownKeys(holder); },
    getOwnPropertyDescriptor(holder, key) {
      if (key === "length") {
        counts.lengthDescriptors++;
        return Reflect.getOwnPropertyDescriptor(holder, key);
      }
      const index = Number(key);
      assert.ok(Number.isInteger(index) && index >= 0 && index < 4_096, "only owned index descriptors are requested");
      counts.descriptors++;
      positionDescriptors[index]!++;
      return descriptors[index];
    },
    get(holder, key, receiver) {
      if (key === "length") counts.lengthReads++;
      else {
        const index = Number(key);
        assert.ok(Number.isInteger(index) && index >= 0 && index < 4_096, "only owned indices are read");
        counts.reads++;
        positionReads[index]!++;
      }
      return Reflect.get(holder, key, receiver);
    },
  });
  return { inner, target, counts, positionDescriptors, positionReads, root: Array(8).fill(inner) };
}

function assertDescriptorCounts(f: ReturnType<typeof descriptorFixture>, fullRows: number, structuralRows = fullRows): void {
  assert.deepEqual(f.counts, {
    prototypes: structuralRows,
    ownKeys: 2 * structuralRows,
    lengthDescriptors: structuralRows,
    lengthReads: structuralRows,
    descriptors: 4_096 * fullRows,
    reads: 4_096 * fullRows,
  });
  assert.ok(f.positionDescriptors.every(count => count === fullRows), "one descriptor observation at every visited position");
  assert.ok(f.positionReads.every(count => count === fullRows), "one ordinary read at every visited position");
}

test("decision-03 descriptor probe: depth does not change bounded observations or coherent Proxy acceptance", () => {
  for (const depth of [0, 32]) {
    const invalid = descriptorFixture(depth, undefined);
    const issues = issuesOf(invalid.root);
    assertDescriptorCounts(invalid, 8);
    assert.deepEqual(issues.slice(0, 8), Array.from({ length: 8 }, (_, index) => ({
      path: `[0][${index}]`, code: "undefined_member", message: "array element is undefined; an array has no absent positions",
    })));
    assert.deepEqual(issues.slice(8), [{
      path: "", code: "undefined_member", message: "additional occurrences (locations omitted)", occurrences: 32_760,
    }]);

    const coherent = descriptorFixture(depth, 0);
    const result = canonicalize(coherent.root);
    assert.equal(result.ok, true, "the exemption does not reject coherent Proxies");
    if (!result.ok) throw Error("expected exact accepted value");
    const expected = Array.from({ length: 8 }, () => Array(4_096).fill(0));
    // Every inner canonical array has 4,096 zeroes and 4,097 punctuation bytes. The outer
    // array adds nine punctuation bytes: 8 * 8,193 + 9 = 65,553, independently of the binding.
    assert.equal(result.value.canonicalBytes, 65_553);
    assert.equal(result.value.canonical, JSON.stringify(expected));
    assert.deepEqual(result.value.value, expected);
    assert.ok(Object.isFrozen(result.value.value));
    assert.ok((result.value.value as unknown[]).every(Object.isFrozen));
    coherent.target[0] = undefined;
    assert.deepEqual(result.value.value, expected, "accepted values stay detached from the caller");
    assertDescriptorCounts(coherent, 8, 8);
  }
});

test("decision-03 descriptor probe: the byte stop bounds trap calls before later rows", () => {
  const f = descriptorFixture(32, undefined);
  // Fifteen valid strings use 15 * (65,536 + 2) canonical bytes. The 32-member outer
  // array adds 33 punctuation bytes. Each refused inner array charges 4,097 punctuation
  // bytes and no scalar bytes. Thus exactly floor((1,048,576 - 983,103) / 4,097) = 15
  // complete inner rows fit; row16 stops after its structure, and row17 is never observed.
  const prefix = Array(15).fill("x".repeat(65_536));
  const issues = issuesOf([...prefix, ...Array(17).fill(f.inner)]);
  assertDescriptorCounts(f, 15, 16);
  assert.equal(issues.length, 10);
  assert.deepEqual(issues.slice(0, 8).map(issue => issue.path), Array.from({ length: 8 }, (_, index) => `[15][${index}]`));
  assert.deepEqual(issues.slice(8), [
    { path: "", code: "undefined_member", message: "additional occurrences (locations omitted)", occurrences: 61_432 },
    { path: "", code: "too_many_bytes", message: "additional occurrences (locations omitted)", occurrences: 1 },
  ]);
  assert.equal(issues.reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0), 61_441);
});

test("decision-03 descriptor probe: one and eight eager roots keep bounded calls before authority", () => {
  const s = setup();
  for (const roots of [1, 8]) {
    for (const grant of [undefined, s.grant]) {
      const f = descriptorFixture(32, undefined);
      const proposal = outcomeFor(s.executionId, s.open, roots === 1 ? { progress: f.root } : {
        progress: f.root,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: `descriptor-${index}`, value: f.root })),
        next: { step: "complete", result: f.root },
      });
      const before = s.view(), deliveries = s.driver.seen.length;
      const result = refused(s.kernel.submitOutcome(observer("descriptor-observer"), proposal, grant!));
      assert.equal(result.classification, grant ? "malformed_envelope" : "unauthorized_submission");
      assertDescriptorCounts(f, roots * 8);
      if (grant) {
        const suffix = roots * 32_768 - 8;
        assert.match(result.reason, new RegExp(`${suffix} additional issues: undefined_member=${suffix}$`));
      } else assert.doesNotMatch(result.reason, /undefined_member|additional issues/);
      assertOnlyRefusal(before, s.view(), result);
      assert.equal(s.driver.seen.length, deliveries);
    }
  }
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
});

test("decision-03 ordinary objects and arrays retain zero diagnostic lookups without a Proxy exemption", () => {
  for (const depth of [0, 10_000]) {
    const counts = { structural: 0, diagnostic: 0 };
    const prototype = chain(counts, depth);
    assert.equal(Reflect.get(prototype, "constructor").name, "CallerType");
    counts.diagnostic = 0;
    // These two values and the thrown value are ordinary non-Proxy objects. Only the carrier
    // of the throw is a Proxy: its required trap throws the prebuilt ordinary value at once.
    const ordinaryObject = Object.create(prototype);
    const ordinaryArray = Object.setPrototypeOf([], prototype);
    const throwsOrdinaryObject = new Proxy({}, { ownKeys() { counts.structural++; throw ordinaryObject; } });
    for (const [value, code, message] of [
      [ordinaryObject, "unsupported_form", "expected a plain object, received object"],
      [ordinaryArray, "unsupported_form", "expected a plain array, received object"],
      [throwsOrdinaryObject, "unstable_representation", "observing this value's structure threw (object), so it presents no readable content"],
    ] as const) {
      assertWeighted(issuesOf(Array(17).fill(value)), 17, code, message);
      assert.equal(counts.diagnostic, 0, "Kernel-chosen diagnostic reads remain forbidden on ordinary objects");
    }
    assert.equal(counts.structural, 17);
  }
});

/**
 * Decision 04's handler-chain probe: trap discovery walks ordinary handler prototypes, while
 * the descriptor returned by the trap is an ordinary engine-created descriptor. These traps
 * correspond one-to-one to Kernel-selected operations because the target itself is an ordinary
 * array; this fixture does not claim a general bound on engine-induced nested Proxy callbacks.
 */
function handlerFixture(depth: number, value: undefined | 0) {
  const counts = { prototypes: 0, ownKeys: 0, lengthDescriptors: 0, lengthReads: 0, descriptors: 0, reads: 0 };
  const positionDescriptors = new Uint32Array(4_096), positionReads = new Uint32Array(4_096);
  const target = Array(4_096).fill(value) as (undefined | 0)[];
  const traps: ProxyHandler<(undefined | 0)[]> = {
    getPrototypeOf(holder) { counts.prototypes++; return Reflect.getPrototypeOf(holder); },
    ownKeys(holder) { counts.ownKeys++; return Reflect.ownKeys(holder); },
    getOwnPropertyDescriptor(holder, key) {
      if (key === "length") counts.lengthDescriptors++;
      else {
        const index = Number(key);
        assert.ok(Number.isInteger(index) && index >= 0 && index < 4_096, "only owned index descriptors are requested");
        counts.descriptors++;
        positionDescriptors[index]!++;
      }
      return Reflect.getOwnPropertyDescriptor(holder, key);
    },
    get(holder, key, receiver) {
      if (key === "length") counts.lengthReads++;
      else {
        const index = Number(key);
        assert.ok(Number.isInteger(index) && index >= 0 && index < 4_096, "only owned indices are read");
        counts.reads++;
        positionReads[index]!++;
      }
      return Reflect.get(holder, key, receiver);
    },
  };
  Object.setPrototypeOf(traps, null);
  let handler = traps;
  for (let index = 0; index < depth; index++) handler = Object.create(handler) as typeof handler;
  const inner = new Proxy(target, handler);
  return { inner, target, counts, positionDescriptors, positionReads, root: Array(8).fill(inner) };
}

test("decision-04 handler probe: Kernel-selected observations and coherent acceptance do not depend on handler depth", () => {
  for (const depth of [0, 32]) {
    const invalid = handlerFixture(depth, undefined);
    const issues = issuesOf(invalid.root);
    assertDescriptorCounts(invalid, 8);
    assert.deepEqual(issues.slice(0, 8), Array.from({ length: 8 }, (_, index) => ({
      path: `[0][${index}]`, code: "undefined_member", message: "array element is undefined; an array has no absent positions",
    })));
    assert.deepEqual(issues.slice(8), [{
      path: "", code: "undefined_member", message: "additional occurrences (locations omitted)", occurrences: 32_760,
    }]);

    const coherent = handlerFixture(depth, 0);
    const result = canonicalize(coherent.root);
    assert.equal(result.ok, true, "handler inheritance must not cause coherent Proxies to be rejected");
    if (!result.ok) throw Error("expected exact accepted value");
    const expected = Array.from({ length: 8 }, () => Array(4_096).fill(0));
    assert.equal(result.value.canonicalBytes, 65_553, "8 * 8,193 inner bytes + 9 outer punctuation bytes");
    assert.equal(result.value.canonical, JSON.stringify(expected));
    assert.deepEqual(result.value.value, expected);
    assert.ok(Object.isFrozen(result.value.value));
    assert.ok((result.value.value as unknown[]).every(Object.isFrozen));
    coherent.target[0] = undefined;
    assert.deepEqual(result.value.value, expected, "retained content does not follow caller mutation");
    assertDescriptorCounts(coherent, 8);
  }
});

test("decision-04 handler probe: the byte stop bounds Kernel-selected observations", () => {
  for (const depth of [0, 32]) {
    const f = handlerFixture(depth, undefined);
    // This uses the independently derived budget in the descriptor-stop test: 983,103
    // bytes before the rows, then 4,097 bytes per row. Fifteen rows fit, the sixteenth
    // charges past the limit before any index read, and the seventeenth stays unobserved.
    const issues = issuesOf([...Array(15).fill("x".repeat(65_536)), ...Array(17).fill(f.inner)]);
    assertDescriptorCounts(f, 15, 16);
    assert.equal(issues.length, 10);
    assert.deepEqual(issues.slice(0, 8).map(issue => issue.path), Array.from({ length: 8 }, (_, index) => `[15][${index}]`));
    assert.deepEqual(issues.slice(8), [
      { path: "", code: "undefined_member", message: "additional occurrences (locations omitted)", occurrences: 61_432 },
      { path: "", code: "too_many_bytes", message: "additional occurrences (locations omitted)", occurrences: 1 },
    ]);
    assert.equal(issues.reduce((sum, issue) => sum + (issue.occurrences ?? 1), 0), 61_441);
  }
});

test("decision-04 handler probe: eager roots preserve selected counts and whole state before authority", () => {
  const s = setup();
  for (const roots of [1, 8]) {
    for (const grant of [undefined, s.grant]) {
      const f = handlerFixture(32, undefined);
      const proposal = outcomeFor(s.executionId, s.open, roots === 1 ? { progress: f.root } : {
        progress: f.root,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: `handler-${index}`, value: f.root })),
        next: { step: "complete", result: f.root },
      });
      const before = s.view(), deliveries = s.driver.seen.length;
      const result = refused(s.kernel.submitOutcome(observer("handler-observer"), proposal, grant!));
      assert.equal(result.classification, grant ? "malformed_envelope" : "unauthorized_submission");
      assertDescriptorCounts(f, roots * 8);
      if (grant) {
        const suffix = roots * 32_768 - 8;
        assert.match(result.reason, new RegExp(`${suffix} additional issues: undefined_member=${suffix}$`));
      } else assert.doesNotMatch(result.reason, /undefined_member|additional issues/);
      assertOnlyRefusal(before, s.view(), result);
      assert.equal(s.driver.seen.length, deliveries);
    }
  }
  accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
});

/** Count the Kernel's captured character primitive, independently of string storage or timing. */
function stringWorkChild(body: string): void {
  const prelude = `
    import assert from "node:assert/strict";
    const original = String.prototype.charCodeAt;
    let characterReads = 0, oversizedReads = 0;
    String.prototype.charCodeAt = function(index) {
      characterReads++;
      if (this.length > 131072) oversizedReads++;
      return Reflect.apply(original, this, [index]);
    };
    const { canonicalize } = await import(${JSON.stringify(new URL("../src/values.ts", import.meta.url).href)});
    const { ExecutionCoordinator } = await import(${JSON.stringify(new URL("../src/index.ts", import.meta.url).href)});
    const h = await import(${JSON.stringify(new URL("./harness.ts", import.meta.url).href)});
    const { assertOnlyRefusal } = await import(${JSON.stringify(new URL("./refusal-diagnostics-fixture.ts", import.meta.url).href)});
    String.prototype.charCodeAt = original;
    const measure = value => {
      characterReads = oversizedReads = 0;
      const result = canonicalize(value);
      return { result, reads: characterReads, oversized: oversizedReads };
    };
    const codes = result => result.ok ? [] : result.issues.map(issue => issue.code);
  `;
  const run = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "--eval", `${prelude}\n${body}`], {
    encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
  });
  assert.equal(run.error, undefined, String(run.error));
  assert.equal(run.signal, null, run.stderr);
  assert.equal(run.status, 0, run.stdout + run.stderr);
}

test("V-D1 UTF-16 preflight: scalar and 131072/131073-unit edges preserve exact accepted values", () => {
  stringWorkChild(`
    for (const [text, expectedReads] of [["x".repeat(65536), 65536], ["😀".repeat(65536), 131072]]) {
      const observed = measure(text);
      assert.equal(observed.result.ok, true);
      assert.equal(observed.result.value.value, text);
      assert.equal(observed.result.value.canonical, JSON.stringify(text));
      assert.equal(observed.reads, expectedReads, "the captured primitive is live on accepted strings");
    }
    const bmpOver = measure("x".repeat(65537));
    assert.deepEqual(codes(bmpOver.result), ["string_too_long"]);
    assert.equal(bmpOver.reads, 65536, "the bounded scalar scan still decides within the possible extent");
    const possibleExtent = measure("x".repeat(131072));
    assert.deepEqual(codes(possibleExtent.result), ["string_too_long"]);
    assert.equal(possibleExtent.reads, 65536);
    for (const text of ["😀".repeat(65536) + "x", "😀".repeat(65537)]) {
      const observed = measure(text);
      assert.deepEqual(codes(observed.result), ["string_too_long"]);
      assert.equal(observed.result.issues[0].message, "string cannot fit within the limit of 65536 Unicode scalar values");
      assert.equal(observed.reads, 0, "provably excessive extent is refused before the first character read");
    }
    const malformedEdge = measure("\\ud800" + "x".repeat(131071));
    assert.deepEqual(codes(malformedEdge.result), ["lone_surrogate"]);
    assert.equal(malformedEdge.reads, 2, "Unicode validation still applies at the possible extent");
    for (const text of ["\\ud800" + "x".repeat(131072), "\\udc00" + "x".repeat(16777216)]) {
      const observed = measure(text);
      assert.equal(codes(observed.result)[0], "string_too_long", "excessive extent takes precedence without reading malformed contents");
      assert.equal(observed.result.issues[0].message, "string cannot fit within the limit of 65536 Unicode scalar values");
      assert.equal(observed.reads, 0);
    }
  `);
});

test("V-D1 UTF-16 preflight: huge values and names do zero character reads and keep full byte charges", () => {
  stringWorkChild(`
    const huge = "x".repeat(16777216);
    for (const value of [huge, { [huge]: null }]) {
      const observed = measure(value);
      assert.deepEqual(codes(observed.result), ["string_too_long", "too_many_bytes"]);
      assert.equal(observed.reads, 0);
    }
    const stopped = measure([huge, undefined]);
    assert.deepEqual(codes(stopped.result), ["string_too_long", "too_many_bytes"]);
    assert.match(stopped.result.issues[1].message, /reaches at least 16777219 bytes/);
    assert.equal(stopped.oversized, 0);
    assert.equal(stopped.reads, 2, "only the two structural array-index spellings are read");
    const repeated = measure([...Array(6).fill("x".repeat(200000)), undefined]);
    assert.deepEqual(codes(repeated.result), [...Array(6).fill("string_too_long"), "too_many_bytes"]);
    assert.deepEqual(repeated.result.issues.slice(0, 6).map(issue => issue.path), ["[0]", "[1]", "[2]", "[3]", "[4]", "[5]"]);
    assert.match(repeated.result.issues[6].message, /reaches at least 1200008 bytes/);
    assert.equal(repeated.oversized, 0, "preflight preserves per-occurrence full-length charging");
    assert.equal(repeated.reads, 7, "only the seven structural array-index spellings are read");
    for (const key of ["x".repeat(65536), "😀".repeat(65536)]) {
      const observed = measure({ [key]: null });
      assert.equal(observed.result.ok, true);
      assert.deepEqual(observed.result.value.value, { [key]: null });
      assert.equal(observed.result.value.canonical, JSON.stringify({ [key]: null }));
    }
    const nameOver = measure({ ["😀".repeat(65536) + "x"]: null });
    assert.deepEqual(codes(nameOver.result), ["string_too_long"]);
    assert.equal(nameOver.result.issues[0].message, "member name cannot fit within the limit of 65536 Unicode scalar values");
    assert.equal(nameOver.reads, 0);
  `);
});

test("V-D1 UTF-16 preflight: creation, ingress and eager Outcome roots refuse without oversized character reads", () => {
  stringWorkChild(`
    const who = h.caller("string-preflight"), driver = h.recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const { executionId } = h.accepted(kernel.createExecution(who, h.createRequest()));
    const open = h.accepted(kernel.dispatch(who, executionId, { bound: 1 }));
    const grant = h.submissionFor(driver, open.activationId);
    const view = () => h.accepted(kernel.inspect(who, executionId));
    const huge = "x".repeat(16777216), deliveries = driver.seen.length;
    const beforeCreate = view();
    oversizedReads = 0;
    const creation = h.refused(kernel.createExecution(who, h.createRequest({
      creationKey: "preflight-retry", authorityContext: huge,
      initialInput: { kind: "application.message", payload: huge },
    })));
    assert.equal(creation.classification, "malformed_value");
    assert.equal(creation.executionId, null);
    assert.equal(oversizedReads, 0);
    assert.deepEqual(view(), beforeCreate);
    assert.equal(h.accepted(kernel.createExecution(who, h.createRequest({ creationKey: "preflight-retry" }))).receipt.position, 1);
    const beforeInput = view();
    oversizedReads = 0;
    const input = h.refused(kernel.submitInput(who, { destination: executionId, requestKey: "preflight-input", kind: "application.message", payload: huge }));
    assert.equal(input.classification, "malformed_value");
    assert.equal(oversizedReads, 0);
    assertOnlyRefusal(beforeInput, view(), input);
    h.accepted(kernel.submitInput(who, { destination: executionId, requestKey: "preflight-input", kind: "application.message", payload: null }));
    for (const authorization of [undefined, grant]) {
      const proposal = h.outcomeFor(executionId, open, {
        progress: huge,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: "s" + index, value: huge })),
        next: { step: "complete", result: huge },
      });
      const before = view();
      oversizedReads = 0;
      const refusal = h.refused(kernel.submitOutcome(h.observer("visible"), proposal, authorization));
      assert.equal(refusal.classification, authorization ? "malformed_envelope" : "unauthorized_submission");
      assert.equal(oversizedReads, 0, "every eager root uses the same bounded string observation");
      if (authorization) assert.match(refusal.reason, /8 additional issues: string_too_long=4, too_many_bytes=4$/);
      else assert.doesNotMatch(refusal.reason, /string_too_long|too_many_bytes/);
      assertOnlyRefusal(before, view(), refusal);
      assert.equal(driver.seen.length, deliveries);
    }
    h.accepted(kernel.submitOutcome(who, h.outcomeFor(executionId, open), grant));
  `);
});
