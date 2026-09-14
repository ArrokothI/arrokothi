/**
 * K1.1-C6 - per-boundary receipts, and reads that are scoped before they reveal anything.
 *
 * `mental-model/concepts/identity.md`, "Acceptance, boundary and receipt": a receipt names one
 * boundary and one revision/position, "There is no single receipt per Execution", and a refusal is
 * not an acceptance. The failures behind the cases: one receipt per Execution reused at every
 * boundary; a receipt minted for a refused request; and a lookup that tells an unauthorized caller
 * an Execution exists by answering differently from a missing one.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

const author = caller("app-a", "tenant-a");
const coordinator = (): ExecutionCoordinator => new ExecutionCoordinator({ driver: recordingDriver() });

describe("K1.1-C6 one receipt per accepted boundary", () => {
  test("creation, ingress and dispatch intent each mint their own", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const ingress = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }),
    );
    const dispatch = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));

    assert.deepEqual(
      [created.receipt.boundary, ingress.receipt.boundary, dispatch.receipt.boundary],
      ["creation", "input_ingress", "dispatch_intent"],
    );
    const tokens = new Set([created.receipt.token, ingress.receipt.token, dispatch.receipt.token]);
    assert.equal(tokens.size, 3, "three accepted decisions, three distinct receipts");

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.receipts, [created.receipt, ingress.receipt, dispatch.receipt], "in acceptance order");
    assert.deepEqual(
      view.receipts.map((receipt) => receipt.position),
      [...view.receipts.map((receipt) => receipt.position)].sort((left, right) => left - right),
      "positions order the accepted facts",
    );
  });

  test("a receipt from one boundary can never be mistaken for another's", () => {
    const kernel = coordinator();
    const first = accepted(kernel.createExecution(author, createRequest({ creationKey: "a" })));
    const second = accepted(kernel.createExecution(author, createRequest({ creationKey: "b" })));

    // Two Executions, and one boundary each: no two receipts collapse onto one token.
    assert.notEqual(second.receipt.token, first.receipt.token);

    const ingress = accepted(
      kernel.submitInput(author, { destination: first.executionId, requestKey: "c1", kind: "k", payload: null }),
    );
    assert.notEqual(ingress.receipt.token, first.receipt.token);
    assert.match(first.receipt.token, /^crt:/);
    assert.match(ingress.receipt.token, /^inp:/);
  });

  test("an exact replay returns the original token, at each boundary that can replay", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const ingress = accepted(
      kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }),
    );
    const dispatch = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));

    assert.deepEqual(accepted(kernel.createExecution(author, createRequest())).receipt, created.receipt);
    assert.deepEqual(
      accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } })).receipt,
      ingress.receipt,
    );
    assert.deepEqual(accepted(kernel.redeliver(author, created.executionId)).receipt, dispatch.receipt);

    assert.equal(accepted(kernel.inspect(author, created.executionId)).receipts.length, 3, "and no replay minted a fourth");
  });

  test("every refusal mints none", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 1 } }));
    const before = accepted(kernel.inspect(author, created.executionId)).receipts;

    refused(kernel.createExecution(author, createRequest({ initialInput: { kind: "k", payload: { other: true } } })));
    refused(kernel.createExecution(caller("app-a", "tenant-b"), createRequest({ scope: "tenant-a" })));
    refused(kernel.submitInput(author, { destination: created.executionId, requestKey: "c1", kind: "k", payload: { a: 2 } }));
    refused(kernel.submitInput(author, { destination: created.executionId, requestKey: "c2", kind: "k", payload: { n: Number.NaN } as never }));
    refused(kernel.submitInput(author, { destination: "execution-404", requestKey: "c3", kind: "k", payload: null }));
    refused(kernel.dispatch(author, created.executionId, { bound: 0 }));
    refused(kernel.redeliver(author, created.executionId));

    assert.deepEqual(accepted(kernel.inspect(author, created.executionId)).receipts, before, "seven refusals, no receipt");
  });
});

describe("K1.1-C6 reads are authenticated and scoped first", () => {
  test("an unauthorized caller cannot learn that an Execution exists", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const outsider = caller("app-c", "tenant-c");

    const hidden = refused(kernel.inspect(outsider, created.executionId));
    const missing = refused(kernel.inspect(outsider, "execution-404"));
    assert.equal(hidden.classification, "unknown_destination");
    assert.equal(hidden.reason, missing.reason);
    assert.equal(hidden.executionId, null, "and the refusal names nothing");
    assert.deepEqual(kernel.visibleExecutions(outsider), []);
  });

  test("a caller that holds the scope sees the Execution and its receipts", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    // A second producer in the same authority scope is a different Input ID namespace but the same
    // visibility: the scope decides what may be seen, the namespace decides what collides.
    const sibling = caller("app-b", "tenant-a");
    const view = accepted(kernel.inspect(sibling, created.executionId));
    assert.deepEqual(view.receipts, [created.receipt]);
    assert.deepEqual(kernel.visibleExecutions(sibling), [created.executionId]);
  });
});
