/**
 * The generated capture corpus of K1.1-correction-03 (owner decision-05 item 3): refusal families, the
 * root consumers that capture values, and placement helpers. `capture-corpus.test.ts` declares and runs
 * the bounded search over them; `capture-refusals.test.ts` reuses the consumers.
 *
 * A family makes one refused element. `shared` says whether one instance may be repeated (aliasing)
 * or each position needs its own. `code` is the code capture reports for the element when it is visited
 * at a depth where containers may still be entered; `container` says whether the element is itself a
 * container (so at the depth limit it is refused as `too_deep` instead, unless it is a Proxy or a cycle).
 */
import assert from "node:assert/strict";

import { ExecutionCoordinator, type ExecutionView } from "../src/index.ts";
import { boundaryValueIssues, canonicalize, isBoundaryValue, type ValueIssue } from "../src/values.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "./harness.ts";
import { assertOnlyRefusal } from "./refusal-diagnostics-fixture.ts";

export interface Family {
  readonly name: string;
  readonly code: string;
  /** A fresh refused element; `root` is the enclosing root, for families that refer back to it. */
  readonly make: (root: unknown[]) => unknown;
  readonly container: boolean;
  /** Refused as a cycle even past the depth limit (it refers to an open ancestor). */
  readonly cycle?: true;
  /** Refused before the depth test (a Proxy). */
  readonly proxy?: true;
}

const foreignChain = (length: number): object => {
  let prototype: object = Object.create(null) as object;
  for (let level = 1; level < length; level += 1) prototype = Object.create(prototype) as object;
  return prototype;
};

const sparse = (): unknown[] => {
  const holes: unknown[] = [];
  holes.length = 1;
  return holes;
};

export const FAMILIES: readonly Family[] = [
  { name: "undefined element", code: "undefined_member", make: () => [undefined], container: true },
  { name: "hole", code: "undefined_member", make: sparse, container: true },
  { name: "accessor member", code: "unrepresentable_member", make: () => ({ get a() { return 1; } }), container: true },
  { name: "non-finite number", code: "non_finite_number", make: () => Number.POSITIVE_INFINITY, container: false },
  { name: "lone surrogate value", code: "lone_surrogate", make: () => "\ud800", container: false },
  { name: "lone surrogate name", code: "lone_surrogate", make: () => ({ ["\udc00"]: 1 }), container: true },
  { name: "long string", code: "string_too_long", make: () => "x".repeat(65_537), container: false },
  { name: "long member name", code: "string_too_long", make: () => ({ ["x".repeat(65_537)]: 1 }), container: true },
  { name: "symbol member", code: "unrepresentable_member", make: () => ({ [Symbol("s")]: 1 }), container: true },
  { name: "non-enumerable member", code: "unrepresentable_member", make: () => Object.defineProperty({}, "h", { value: 1 }), container: true },
  { name: "array extra member", code: "unrepresentable_member", make: () => Object.assign([1], { extra: 1 }), container: true },
  { name: "over-named array", code: "unrepresentable_member", make: () => { const a: unknown[] = []; for (let i = 0; i < 4_097; i += 1) (a as unknown as Record<string, number>)[`n${i}`] = 0; return a; }, container: true },
  { name: "over-named object", code: "too_many_entries", make: () => Object.fromEntries(Array.from({ length: 4_097 }, (_, i) => [`k${i}`, 0])), container: true },
  { name: "too many entries", code: "too_many_entries", make: () => new Array(4_097), container: true },
  { name: "cycle", code: "cycle", make: (root) => root, container: true, cycle: true },
  { name: "foreign object", code: "unsupported_form", make: () => Object.create(foreignChain(1)), container: true },
  { name: "foreign object, prototype chain of 1,000", code: "unsupported_form", make: () => Object.create(foreignChain(1_000)), container: true },
  { name: "foreign array", code: "unsupported_form", make: () => Object.setPrototypeOf([], foreignChain(1)), container: true },
  { name: "unsupported primitive", code: "unsupported_form", make: () => 1n, container: false },
  { name: "re-prototyped Map", code: "unsupported_form", make: () => Object.setPrototypeOf(new Map([[1, 2]]), null), container: true },
  { name: "re-prototyped Date", code: "unsupported_form", make: () => Object.setPrototypeOf(new Date(0), Object.prototype), container: true },
  { name: "re-prototyped Uint8Array", code: "unsupported_form", make: () => Object.setPrototypeOf(new Uint8Array([1]), null), container: true },
  { name: "re-prototyped Error", code: "unsupported_form", make: () => Object.setPrototypeOf(new Error("m"), null), container: true },
  { name: "re-prototyped Number object", code: "unsupported_form", make: () => Object.setPrototypeOf(new Number(1), null), container: true },
  { name: "raw JSON", code: "unsupported_form", make: () => (JSON as unknown as { rawJSON(text: string): object }).rawJSON("1"), container: true },
  { name: "Proxy", code: "unsupported_form", make: () => new Proxy({}, {}), container: true, proxy: true },
  { name: "revoked Proxy", code: "unsupported_form", make: () => { const { proxy, revoke } = Proxy.revocable({}, {}); revoke(); return proxy; }, container: true, proxy: true },
];

/** The code `family` reports when its element sits at depth `elementDepth` (the root is 1). */
export const expectedCode = (family: Family, elementDepth: number): string =>
  family.container && elementDepth > 32 && family.cycle !== true && family.proxy !== true ? "too_deep" : family.code;

/** One root consumer: it captures `root` once and checks its whole result for a refusal at `path`. */
export interface Consumer {
  readonly name: string;
  readonly run: (root: unknown, path: string, code: string, message: string | null) => void;
}

/** An Execution with one open exchange, and its view. */
export function openExecution() {
  const who = caller("corpus");
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(who, createRequest()));
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const grant = submissionFor(driver, open.activationId);
  const view = (): ExecutionView => accepted(kernel.inspect(who, executionId));
  return { who, driver, kernel, executionId, open, grant, view };
}

const directIssues = (root: unknown): ValueIssue[] => {
  const result = canonicalize(root);
  assert.equal(result.ok, false, "refused");
  return result.ok ? [] : result.issues;
};

/** The first located detail, compared with the expected path, code and (when given) message. */
const assertFirst = (issues: readonly ValueIssue[], path: string, code: string, message: string | null): void => {
  const first = issues[0];
  assert.ok(first !== undefined);
  assert.equal(first.path, path);
  assert.equal(first.code, code);
  if (message !== null) assert.equal(first.message, message);
};

/** A root issue's path relocated under its field label, as `envelope.ts`'s `located` renders it. */
export const locate = (label: string, path: string): string =>
  path === "" ? label : path.startsWith("[") ? `${label}${path}` : `${label}.${path}`;

/** Every consumer of in-process capture at B (design-01 §1.9), each with its whole-result check. */
export const CONSUMERS: readonly Consumer[] = [
  {
    name: "canonicalize",
    run: (root, path, code, message) => assertFirst(directIssues(root), path, code, message),
  },
  {
    name: "boundaryValueIssues and isBoundaryValue",
    run: (root, path, code, message) => {
      const issues = boundaryValueIssues(root);
      assertFirst(issues, path, code, message);
      assert.deepEqual(issues, directIssues(root), "the same issues as canonicalize");
      assert.equal(isBoundaryValue(root), false);
    },
  },
  {
    name: "creation authorityContext",
    run: (root, path, code) => {
      const who = caller("corpus-create");
      const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
      const refusal = refused(kernel.createExecution(who, createRequest({ authorityContext: root as never })));
      assert.equal(refusal.classification, "malformed_value");
      assert.ok(refusal.reason.includes(`${locate("authorityContext", path)} ${code}`), refusal.reason);
      assert.deepEqual(kernel.visibleExecutions(who), [], "nothing created");
    },
  },
  {
    name: "creation initial input payload",
    run: (root, path, code) => {
      const who = caller("corpus-create");
      const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
      const refusal = refused(kernel.createExecution(who, createRequest({ initialInput: { kind: "k", payload: root as never } })));
      assert.equal(refusal.classification, "malformed_value");
      assert.ok(refusal.reason.includes(`${locate("initialInput.payload", path)} ${code}`), refusal.reason);
      assert.deepEqual(kernel.visibleExecutions(who), [], "nothing created");
    },
  },
  {
    name: "ingress payload",
    run: (root, path, code) => {
      const s = openExecution();
      const before = s.view();
      const refusal = refused(s.kernel.submitInput(s.who, { destination: s.executionId, requestKey: "r", kind: "k", payload: root as never }));
      assert.equal(refusal.classification, "malformed_value");
      assert.ok(refusal.reason.includes(`${locate("payload", path)} ${code}`), refusal.reason);
      assertOnlyRefusal(before, s.view(), refusal);
    },
  },
  {
    name: "recovery availability list",
    run: (root, path, code) => {
      const s = openExecution();
      const before = s.view();
      const refusal = refused(s.kernel.recoverExecution(s.who, s.executionId, {
        activationId: s.open.activationId,
        available: { definitionRevisions: [root] as never, runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] },
      }));
      assert.equal(refusal.classification, "malformed_value");
      // The list is the captured root: its first issue's path is the direct capture's, below `[0]`.
      const listPath = directIssues([root])[0]!.path;
      assert.ok(path === "<omitted>" || listPath === `[0]${path}`, `the list path ${listPath} extends ${path}`);
      assert.ok(refusal.reason.includes(`${locate("available.definitionRevisions", listPath)} ${code}`), refusal.reason);
      assertOnlyRefusal(before, s.view(), refusal);
    },
  },
  ...(["progress", "emission value", "completed result", "failed error"] as const).map((field): Consumer => ({
    name: `Outcome ${field}`,
    run: (root, path, code) => {
      const s = openExecution();
      const overrides =
        field === "progress" ? { progress: root }
          : field === "emission value" ? { emissions: [{ emissionKey: "e", value: root }] }
            : field === "completed result" ? { next: { step: "complete", result: root } }
              : { next: { step: "fail", error: root } };
      const label = field === "progress" ? "progress" : field === "emission value" ? "emissions[0].value" : field === "completed result" ? "next.result" : "next.error";
      const before = s.view();
      const delivered = s.driver.seen.length;
      const refusal = refused(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open, overrides), s.grant));
      assert.equal(refusal.classification, "malformed_envelope");
      assert.ok(refusal.reason.includes(`${locate(label, path)} ${code}`), refusal.reason);
      assertOnlyRefusal(before, s.view(), refusal);
      assert.equal(s.driver.seen.length, delivered, "no delivery");
      accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
    },
  })),
  {
    name: "eight eager Outcome roots from a visible caller with no grant",
    run: (root, _path, code) => {
      const s = openExecution();
      const proposal = outcomeFor(s.executionId, s.open, {
        progress: root,
        emissions: Array.from({ length: 6 }, (_, index) => ({ emissionKey: `e${index}`, value: root })),
        next: { step: "complete", result: root },
      });
      const before = s.view();
      const delivered = s.driver.seen.length;
      const refusal = refused(s.kernel.submitOutcome(observer("visible"), proposal, undefined as never));
      assert.equal(refusal.classification, "unauthorized_submission");
      assert.ok(!refusal.reason.includes(code), "no content diagnostic before authority");
      assertOnlyRefusal(before, s.view(), refusal);
      assert.equal(s.driver.seen.length, delivered, "no delivery");
      accepted(s.kernel.submitOutcome(s.who, outcomeFor(s.executionId, s.open), s.grant));
    },
  },
];

/** `value` inside `wrappers` singleton arrays, and the path prefix capture reports below them. */
export const wrapped = (value: unknown, wrappers: number): { root: unknown; prefix: string } => {
  let root = value;
  for (let level = 0; level < wrappers; level += 1) root = [root];
  return { root, prefix: "[0]".repeat(wrappers) };
};
