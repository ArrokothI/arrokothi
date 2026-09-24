/**
 * K1.2-C3 - E-6's four limits, at the limit and one past, at the Outcome boundary.
 *
 * `values.md`, "Fixed semantic limits": every boundary value is bounded by four exact numbers, each
 * root is measured on its own, and "Two sibling roots of about 700 KiB each, in one Outcome, both
 * pass." E-6 assigns the at-limit/one-past matrix to "a K1 fixture"; K0.2's contract and K1.1's
 * contract assign it to K1.2, the first packet with an Outcome to measure (`protocol-vocabulary.ts`
 * records the numbers; this file exercises them).
 *
 * `values.test.ts` already holds `canonicalize` to the matrix. What this file adds is the boundary:
 * each Outcome root - progress, an Emission value, a completion result, a failure error - is its own
 * root, the envelope around it adds no level and no bytes, and a one-past value refuses the *whole*
 * Outcome with a located reason, while the at-limit one is accepted and retained exactly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { BOUNDARY_LIMITS, ExecutionCoordinator, canonicalize, type BoundaryValue, type OutcomeEnvelope } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");

/** A fresh dispatched Execution and a submit function for Outcomes answering its exchange. */
function openExchange(): { submit: (overrides: Partial<Record<keyof OutcomeEnvelope, unknown>>) => ReturnType<ExecutionCoordinator["submitOutcome"]>; kernel: ExecutionCoordinator; executionId: string } {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const { executionId } = accepted(kernel.createExecution(author, createRequest()));
  const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
  return { kernel, executionId, submit: (overrides) => kernel.submitOutcome(author, outcomeFor(executionId, dispatched, overrides)) };
}

/** `A1 = []`, `A(n+1) = [An]`: depth exactly `levels`. */
const nested = (levels: number): BoundaryValue => {
  let value: BoundaryValue = [];
  for (let level = 1; level < levels; level += 1) value = [value];
  return value;
};

/** An array of strings whose canonical form is exactly `target` bytes (see `values.test.ts`). */
function rootOfExactBytes(target: number): string[] {
  const chunk = "a".repeat(65_000);
  const parts: string[] = [];
  const size = (): number => {
    const result = canonicalize(parts);
    assert.ok(result.ok);
    return result.value.canonicalBytes;
  };
  while (size() + chunk.length + 3 <= target) parts.push(chunk);
  const remaining = target - size();
  parts.push("a".repeat(remaining - (parts.length === 0 ? 0 : 1) - 2));
  const built = canonicalize(parts);
  assert.ok(built.ok && built.value.canonicalBytes === target, `constructed exactly ${target} canonical bytes`);
  return parts;
}

const oneByteMore = (atLimit: string[]): string[] => [...atLimit.slice(0, -1), `${atLimit[atLimit.length - 1] as string}a`];

/** The four limits, each as an at-limit value and the one-past value that differs by one unit. */
function limitCases(): { limit: string; code: string; atLimit: BoundaryValue; onePast: BoundaryValue }[] {
  const atLimitString = "a".repeat(BOUNDARY_LIMITS.stringScalarValues);
  const entries = Array.from({ length: BOUNDARY_LIMITS.containerEntries }, () => 0);
  const bytes = rootOfExactBytes(BOUNDARY_LIMITS.canonicalBytes);
  return [
    { limit: "string length", code: "string_too_long", atLimit: { s: atLimitString }, onePast: { s: `${atLimitString}a` } },
    { limit: "member name length", code: "string_too_long", atLimit: { [atLimitString]: null }, onePast: { [`${atLimitString}a`]: null } },
    { limit: "entries", code: "too_many_entries", atLimit: entries, onePast: [...entries, 0] },
    { limit: "depth", code: "too_deep", atLimit: nested(BOUNDARY_LIMITS.containerDepth), onePast: nested(BOUNDARY_LIMITS.containerDepth + 1) },
    { limit: "canonical bytes", code: "too_many_bytes", atLimit: bytes, onePast: oneByteMore(bytes) },
  ];
}

describe("K1.2-C3 E-6 at the limit and one past, for every Outcome root", () => {
  const roots: { root: string; path: string; place: (value: BoundaryValue) => Partial<Record<keyof OutcomeEnvelope, unknown>> }[] = [
    { root: "progress", path: "progress", place: (value) => ({ progress: value }) },
    { root: "an Emission value", path: "emissions\\[0\\]\\.value", place: (value) => ({ emissions: [{ emissionKey: "e", value }] }) },
    { root: "a completion result", path: "next\\.result", place: (value) => ({ next: { step: "complete", result: value } }) },
    { root: "a failure error", path: "next\\.error", place: (value) => ({ next: { step: "fail", error: value } }) },
  ];

  for (const { root, path, place } of roots) {
    for (const { limit, code, atLimit, onePast } of limitCases()) {
      test(`${root}: ${limit} at the limit is accepted and retained exactly; one past refuses the whole Outcome`, () => {
        const refusing = openExchange();
        const before = accepted(refusing.kernel.inspect(author, refusing.executionId));
        const refusal = refused(refusing.submit(place(onePast)));
        assert.equal(refusal.classification, "malformed_envelope");
        assert.match(refusal.reason, new RegExp(`${path}\\S* ${code}`), "located under the field that carried it");
        const after = accepted(refusing.kernel.inspect(author, refusing.executionId));
        assert.equal(after.progressRevision, before.progressRevision);
        assert.deepEqual(after.acknowledged, before.acknowledged);
        assert.deepEqual(after.emissions, []);
        assert.equal(after.result, null);
        assert.equal(after.state, "RUNNING", "the exchange stays open");

        const accepting = openExchange();
        accepted(accepting.submit(place(atLimit)));
        const view = accepted(accepting.kernel.inspect(author, accepting.executionId));
        const retained = root === "progress" ? view.acceptedProgress : root === "an Emission value" ? view.emissions[0]?.value : view.result?.value;
        assert.deepEqual(retained, atLimit, "the envelope added no level and no bytes: the at-limit root is accepted whole");
      });
    }
  }

  test("two sibling roots of about 700 KiB each, in one Outcome, both pass", () => {
    const sevenHundredKiB = rootOfExactBytes(700 * 1024);
    const { submit } = openExchange();
    const answer = accepted(
      submit({ progress: sevenHundredKiB, emissions: [{ emissionKey: "draft", value: sevenHundredKiB }], next: { step: "complete", result: sevenHundredKiB } }),
    );
    assert.equal(answer.nextState, "COMPLETED", "about 2.1 MiB across three roots; no aggregate limit applies to their sum");
  });
});
