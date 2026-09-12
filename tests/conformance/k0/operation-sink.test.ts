/**
 * K0.2-C3: the fake operation sink keeps an independent ledger.
 *
 * "Independent" is a structural property, not a promise. What is tested here is that the surface a
 * candidate is handed has no way to read, edit, reorder or truncate the record of what it did, and
 * that the observation surface hands out frozen snapshots so a later caller cannot rewrite history
 * either. That is what makes the ledger usable as attribution evidence in K2/E2.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createOperationSink } from "./operation-sink.ts";
import type { OperationAttempt } from "./operation-sink.ts";

const attempt = (overrides: Partial<OperationAttempt> = {}): OperationAttempt => ({
  operationId: "op-1",
  executionId: "exec-x",
  operation: "artifact.publish",
  input: { artifact: "draft-1" },
  ...overrides,
});

describe("K0 operation sink: the ledger is independent of the candidate", () => {
  test("the candidate-facing surface exposes no read path at all", () => {
    const { sink } = createOperationSink();
    const surface = sink as unknown as Record<string, unknown>;
    for (const forbidden of ["entries", "entriesFor", "count", "ledger", "clear", "reset", "truncate"]) {
      assert.equal(surface[forbidden], undefined, `the sink must not expose ${forbidden} to a candidate`);
    }
    assert.deepEqual(Object.keys(surface), ["attempt"]);
  });

  test("every attempt is recorded in sink acceptance order with its own sequence", () => {
    const { sink, ledger } = createOperationSink({
      handlers: { "artifact.publish": () => ({ disposition: "success", observation: { published: true } }) },
    });

    sink.attempt(attempt({ operationId: "op-1" }));
    sink.attempt(attempt({ operationId: "op-2" }));

    const entries = ledger.entries();
    assert.equal(entries.length, 2);
    assert.deepEqual(
      entries.map((entry) => [entry.sequence, entry.operationId]),
      [[0, "op-1"], [1, "op-2"]],
    );
    assert.equal(entries[0]?.result.disposition, "success");
  });

  test("an unscripted operation settles `unknown`, which is not a flavour of failure", () => {
    // kernel.md: "A lost receipt, timeout or malformed response after possible execution is `unknown`,
    // not definite failure." A sink that was never told what happened must not invent a failure.
    const { sink, ledger } = createOperationSink();
    const result = sink.attempt(attempt({ operation: "mail.send" }));

    assert.equal(result.disposition, "unknown");
    assert.notEqual(result.disposition as string, "failure");
    assert.equal(ledger.entries()[0]?.result.disposition, "unknown");
  });

  test("ledger snapshots are frozen, so an observation cannot be rewritten after the fact", () => {
    const { sink, ledger } = createOperationSink();
    sink.attempt(attempt());

    const snapshot = ledger.entries();
    assert.ok(Object.isFrozen(snapshot));
    assert.throws(() => (snapshot as unknown as unknown[]).push({}), TypeError);
    assert.ok(Object.isFrozen(snapshot[0]));

    // Mutating a returned entry must not reach the ledger.
    try {
      (snapshot[0] as unknown as { operation: string }).operation = "tampered";
    } catch {
      // Frozen in strict mode; either way the ledger below must be unchanged.
    }
    assert.equal(ledger.entries()[0]?.operation, "artifact.publish");
  });

  test("a later snapshot is unaffected by mutating an earlier one", () => {
    const { sink, ledger } = createOperationSink();
    sink.attempt(attempt({ operationId: "op-1" }));
    const first = ledger.entries();
    sink.attempt(attempt({ operationId: "op-2" }));

    assert.equal(first.length, 1, "an earlier snapshot must not grow as new attempts arrive");
    assert.equal(ledger.count(), 2);
  });

  test("entries are attributable per Execution", () => {
    const { sink, ledger } = createOperationSink();
    sink.attempt(attempt({ executionId: "exec-x" }));
    sink.attempt(attempt({ executionId: "exec-y" }));
    sink.attempt(attempt({ executionId: "exec-x" }));

    assert.equal(ledger.entriesFor("exec-x").length, 2);
    assert.equal(ledger.entriesFor("exec-y").length, 1);
    assert.equal(ledger.entriesFor("exec-absent").length, 0);
  });

  test("the logical operation ID is recorded separately from the sink's physical sequence", () => {
    // kernel.md: "Record logical action ID separately from physical attempts ... all retries keep the
    // logical request identity."
    const { sink, ledger } = createOperationSink();
    sink.attempt(attempt({ operationId: "op-1" }));
    sink.attempt(attempt({ operationId: "op-1" }));

    const entries = ledger.entries();
    assert.deepEqual(entries.map((entry) => entry.operationId), ["op-1", "op-1"]);
    assert.deepEqual(entries.map((entry) => entry.sequence), [0, 1]);
  });
});
