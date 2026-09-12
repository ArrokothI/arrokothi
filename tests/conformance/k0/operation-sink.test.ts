/**
 * K0.2-C3: the fake operation sink keeps an independent ledger.
 *
 * "Independent" is a structural property, not a promise. What is tested here is that the surface a
 * candidate is handed has no way to read, edit, reorder or truncate the record of what it did, and
 * that the observation surface hands out frozen snapshots so a later caller cannot rewrite history
 * either. That is what makes the ledger usable as attribution evidence in K2/E2.
 *
 * Round-1 review finding K02-R1-02: absent methods are not enough. The earlier revision recorded the
 * caller's own objects and shallow-froze the entry, so a candidate that simply *kept a reference* to
 * the input it passed in — or to the result it was handed back, or to any object nested inside either
 * — could reach through and rewrite the ledger after the attempt was recorded. Historical evidence
 * editable by the party it incriminates is not evidence. The suite below therefore mutates every
 * retained reference it can reach, after recording, and asserts later reads are unchanged.
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

describe("K0 operation sink: retained references cannot rewrite recorded history", () => {
  // Finding K02-R1-02. Each case holds a reference the way a real candidate naturally would, mutates
  // it after `attempt()` has returned, and then asks the ledger what it recorded.

  test("mutating the request input object afterwards does not change the entry", () => {
    const { sink, ledger } = createOperationSink();
    const input = { artifact: "draft-1", nested: { revision: 1 } };
    sink.attempt(attempt({ input }));

    input.artifact = "tampered";
    input.nested.revision = 99;

    const recorded = ledger.entries()[0]?.input as { artifact: string; nested: { revision: number } };
    assert.equal(recorded.artifact, "draft-1", "the ledger kept the caller's own object");
    assert.equal(recorded.nested.revision, 1, "a nested object inside the input was still reachable");
  });

  test("mutating an array inside the request input afterwards does not change the entry", () => {
    const { sink, ledger } = createOperationSink();
    const input = { recipients: ["a@example.test"] };
    sink.attempt(attempt({ input }));

    input.recipients.push("attacker@example.test");

    const recorded = ledger.entries()[0]?.input as { recipients: string[] };
    assert.deepEqual(recorded.recipients, ["a@example.test"], "an array inside the input was shared with the ledger");
  });

  test("mutating the returned result afterwards does not change the entry", () => {
    const { sink, ledger } = createOperationSink({
      handlers: { "artifact.publish": () => ({ disposition: "success", observation: { published: true, at: { seq: 1 } } }) },
    });
    const returned = sink.attempt(attempt()) as { disposition: string; observation: { published: boolean; at: { seq: number } } };

    returned.observation.published = false;
    returned.observation.at.seq = 99;

    const recorded = ledger.entries()[0]?.result.observation as { published: boolean; at: { seq: number } };
    assert.equal(recorded.published, true, "the result handed back was the object the ledger stored");
    assert.equal(recorded.at.seq, 1, "a nested object inside the observation was still reachable");
  });

  test("mutating a nested error object on the returned result does not change the entry", () => {
    const { sink, ledger } = createOperationSink();
    const returned = sink.attempt(attempt({ operation: "mail.send" })) as { error?: { code: string; message: string } };

    if (returned.error) {
      returned.error.code = "tampered";
      returned.error.message = "tampered";
    }

    assert.equal(ledger.entries()[0]?.result.error?.code, "unscripted_operation");
  });

  test("the handler's own object is not shared with the ledger either", () => {
    // A scripted handler that reuses one result object across calls must not be able to retro-edit
    // every entry it ever produced.
    const shared = { disposition: "success" as const, observation: { seq: 0 } };
    const { sink, ledger } = createOperationSink({ handlers: { "artifact.publish": () => shared } });

    sink.attempt(attempt({ operationId: "op-1" }));
    shared.observation.seq = 1;
    sink.attempt(attempt({ operationId: "op-2" }));
    shared.observation.seq = 2;

    const seqs = ledger.entries().map((entry) => (entry.result.observation as { seq: number }).seq);
    assert.deepEqual(seqs, [0, 1], "each entry must hold the value as of its own attempt");
  });

  test("a recorded entry is frozen all the way down, not just at the top level", () => {
    const { sink, ledger } = createOperationSink({
      handlers: { "artifact.publish": () => ({ disposition: "success", observation: { nested: { deep: true } } }) },
    });
    sink.attempt(attempt({ input: { nested: { deep: true } } }));

    const entry = ledger.entries()[0];
    assert.ok(entry);
    assert.ok(Object.isFrozen(entry), "entry");
    assert.ok(Object.isFrozen(entry.input), "entry.input");
    assert.ok(Object.isFrozen((entry.input as { nested: unknown }).nested), "entry.input.nested");
    assert.ok(Object.isFrozen(entry.result), "entry.result");
    assert.ok(Object.isFrozen(entry.result.observation), "entry.result.observation");
    assert.ok(Object.isFrozen((entry.result.observation as { nested: unknown }).nested), "deeply nested observation");
  });

  test("the candidate/fixture surface separation is unchanged by all of this", () => {
    // The fix must not have quietly widened what a candidate can reach.
    const { sink } = createOperationSink();
    assert.deepEqual(Object.keys(sink as unknown as Record<string, unknown>), ["attempt"]);
  });
});
