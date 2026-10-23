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

import { type ExecutionView } from "../../kernel/src/index.ts";
import { ExecutionCoordinator } from "../../kernel/tests/binding-facade.ts";
import { boundaryValueIssues, canonicalize, captureCanonicalBytes, isBoundaryValue, type ValueIssue } from "../src/internal/value-capture.ts";
import { accepted, caller, createRequest, observer, outcomeFor, recordingDriver, refused, submissionFor } from "../../kernel/tests/harness.ts";
import { assertOnlyRefusal } from "../../kernel/tests/refusal-diagnostics-fixture.ts";

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

/** Wrapper-side positions formerly exercised through the object-intake Kernel. Per the owner's
 * migration ruling these stop before any core call. Byte-domain atomicity has separate witnesses.
 */
export const CONSUMERS: readonly Consumer[] = [
  { name: "canonicalize", run: (root, path, code, message) => assertFirst(directIssues(root), path, code, message) },
  { name: "boundaryValueIssues and isBoundaryValue", run: (root, path, code, message) => {
    assertFirst(boundaryValueIssues(root), path, code, message);
    assert.deepEqual(boundaryValueIssues(root), directIssues(root));
    assert.equal(isBoundaryValue(root), false);
  } },
  ...["creation authorityContext", "creation initial input payload", "ingress payload",
    "recovery availability list", "Outcome progress", "Outcome emission value",
    "Outcome completed result", "Outcome failed error", "eight eager Outcome roots from a visible caller with no grant"].map((name): Consumer => ({
    name,
    run(root, path, code, message) {
      const input = name === "recovery availability list" ? [root] : root;
      const expectedPath = name === "recovery availability list" ? directIssues(input)[0]!.path : path;
      const roots = name.startsWith("eight") ? 8 : 1;
      let coreCalls = 0;
      for (let index = 0; index < roots; index += 1) {
        const captured = captureCanonicalBytes(input);
        if (captured.ok) { coreCalls += 1; continue; }
        assertFirst(captured.issues, expectedPath, code, message);
      }
      assert.equal(coreCalls, 0, "wrapper refuses every root before a core submission");
    },
  })),
];

/** `value` inside `wrappers` singleton arrays, and the path prefix capture reports below them. */
export const wrapped = (value: unknown, wrappers: number): { root: unknown; prefix: string } => {
  let root = value;
  for (let level = 0; level < wrappers; level += 1) root = [root];
  return { root, prefix: "[0]".repeat(wrappers) };
};
