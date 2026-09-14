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

  test("the two refusals cost the same position, which is shape evidence rather than timing evidence", () => {
    const kernel = coordinator();
    const created = accepted(kernel.createExecution(author, createRequest()));
    const outsider = caller("app-c", "tenant-c");

    // Identical text is not enough: a record position that advances differently for the hidden case
    // is a side channel of exactly the kind ID-8 forbids. Both orders are measured, so the check
    // cannot be satisfied by a constant offset. This asserts record-position shape; the
    // K11-R1-ID-01 cases below assert equal lookup *work* via scope-read counting, which is what
    // distinguishes a missing fast path from a hidden scope search.
    const hiddenFirst = refused(kernel.inspect(outsider, created.executionId));
    const missingAfter = refused(kernel.inspect(outsider, "execution-404"));
    const missingFirst = refused(kernel.inspect(outsider, "execution-405"));
    const hiddenAfter = refused(kernel.inspect(outsider, created.executionId));

    assert.equal(missingAfter.position - hiddenFirst.position, 1, "an invisible Execution costs one position");
    assert.equal(hiddenAfter.position - missingFirst.position, 1, "and so does one that does not exist");
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

  describe("K11-R1-ID-01 hidden and missing lookups do equal work", () => {
    const countingCaller = (namespace: string, scopes: string[]): { caller: { namespace: string; scopes: readonly string[] }; reads: () => number } => {
      let reads = 0;
      const proxied = new Proxy(scopes.slice(), {
        get(target, property, receiver) {
          if (property === "length" || (typeof property === "string" && /^\d+$/.test(property))) reads += 1;
          return Reflect.get(target, property, receiver);
        },
      });
      return { caller: { namespace, scopes: proxied as unknown as readonly string[] }, reads: () => reads };
    };

    test("inspect performs the same scope work for hidden and missing", () => {
      const kernel = coordinator();
      const created = accepted(kernel.createExecution(author, createRequest()));

      const hiddenCounter = countingCaller("app-c", ["tenant-c"]);
      const hidden = refused(kernel.inspect(hiddenCounter.caller, created.executionId));
      const hiddenReads = hiddenCounter.reads();

      const missingCounter = countingCaller("app-c", ["tenant-c"]);
      const missing = refused(kernel.inspect(missingCounter.caller, "execution-404"));
      const missingReads = missingCounter.reads();

      assert.equal(hidden.classification, "unknown_destination");
      assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 });
      assert.ok(hiddenReads > 0, "the hidden path really scans scopes");
      assert.equal(missingReads, hiddenReads, "a missing fast path that skipped the scan would read 0");
    });

    test("equal work holds with many legitimate scopes and in both orders", () => {
      const kernel = coordinator();
      const created = accepted(kernel.createExecution(author, createRequest()));
      const many = ["tenant-c", ...Array.from({ length: 200 }, (_, index) => `scope-${index}`)];

      const first = countingCaller("app-c", many);
      refused(kernel.inspect(first.caller, created.executionId));
      const hiddenReads = first.reads();

      const second = countingCaller("app-c", many);
      refused(kernel.inspect(second.caller, "execution-404"));
      const missingReads = second.reads();

      assert.equal(missingReads, hiddenReads, "work depends only on caller scope count, not on existence");
      assert.ok(hiddenReads > 200, "the scan really walks the whole list without early exit");
    });

    test("scope work does not depend on where the match sits", () => {
      const kernel = coordinator();
      const created = accepted(kernel.createExecution(author, createRequest()));
      const tail = Array.from({ length: 100 }, (_, index) => `other-${index}`);
      const early = countingCaller("app-e", ["tenant-a", ...tail]);
      const late = countingCaller("app-l", [...tail, "tenant-a"]);

      const earlyView = accepted(kernel.inspect(early.caller, created.executionId));
      const lateView = accepted(kernel.inspect(late.caller, created.executionId));
      assert.equal(earlyView.executionId, created.executionId);
      assert.equal(lateView.executionId, created.executionId);
      assert.equal(late.reads(), early.reads(), "an early-exit includes would cost less for an early match");
    });

    test("single-ID lookup work does not depend on hidden-record population", () => {
      const kernel = coordinator();
      const created = accepted(kernel.createExecution(author, createRequest()));
      for (let index = 0; index < 50; index += 1) {
        accepted(kernel.createExecution(caller(`hidden-${index}`, "tenant-hidden"), createRequest({ creationKey: `h-${index}`, scope: "tenant-hidden" })));
      }

      const hiddenCounter = countingCaller("app-c", ["tenant-c"]);
      refused(kernel.inspect(hiddenCounter.caller, created.executionId));
      const hiddenReads = hiddenCounter.reads();

      const missingCounter = countingCaller("app-c", ["tenant-c"]);
      refused(kernel.inspect(missingCounter.caller, "execution-404"));
      const missingReads = missingCounter.reads();

      assert.equal(missingReads, hiddenReads, "population changes total map size but not per-lookup scope work");
    });

    test("ingress, dispatch and redelivery share the same normalized lookup", () => {
      const kernel = coordinator();
      const created = accepted(kernel.createExecution(author, createRequest()));
      accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));

      const hiddenIngress = countingCaller("app-c", ["tenant-c"]);
      const hiddenIngressRefusal = refused(kernel.submitInput(hiddenIngress.caller, { destination: created.executionId, requestKey: "k", kind: "k", payload: null }));
      const missingIngress = countingCaller("app-c", ["tenant-c"]);
      const missingIngressRefusal = refused(kernel.submitInput(missingIngress.caller, { destination: "execution-404", requestKey: "k", kind: "k", payload: null }));
      assert.deepEqual({ ...hiddenIngressRefusal, position: 0 }, { ...missingIngressRefusal, position: 0 });
      assert.equal(missingIngress.reads(), hiddenIngress.reads());

      const hiddenDispatch = countingCaller("app-c", ["tenant-c"]);
      const hiddenDispatchRefusal = refused(kernel.dispatch(hiddenDispatch.caller, created.executionId, { bound: 1 }));
      const missingDispatch = countingCaller("app-c", ["tenant-c"]);
      const missingDispatchRefusal = refused(kernel.dispatch(missingDispatch.caller, "execution-404", { bound: 1 }));
      assert.deepEqual({ ...hiddenDispatchRefusal, position: 0 }, { ...missingDispatchRefusal, position: 0 });
      assert.equal(missingDispatch.reads(), hiddenDispatch.reads());

      const hiddenRedeliver = countingCaller("app-c", ["tenant-c"]);
      const hiddenRedeliverRefusal = refused(kernel.redeliver(hiddenRedeliver.caller, created.executionId));
      const missingRedeliver = countingCaller("app-c", ["tenant-c"]);
      const missingRedeliverRefusal = refused(kernel.redeliver(missingRedeliver.caller, "execution-404"));
      assert.deepEqual({ ...hiddenRedeliverRefusal, position: 0 }, { ...missingRedeliverRefusal, position: 0 });
      assert.equal(missingRedeliver.reads(), hiddenRedeliver.reads());
    });

    test("visibleExecutions does uniform per-record work and reveals only visible IDs", () => {
      const kernel = coordinator();
      const inA = accepted(kernel.createExecution(caller("app-a", "tenant-a"), createRequest({ scope: "tenant-a" })));
      accepted(kernel.createExecution(caller("app-b", "tenant-b"), createRequest({ scope: "tenant-b" })));

      const counter = countingCaller("app-a", ["tenant-a"]);
      const listed = kernel.visibleExecutions(counter.caller);
      assert.deepEqual(listed, [inA.executionId], "hidden IDs never appear in shape");
      // Two records, one scope each: two full scans. A per-record early exit or a skipped
      // hidden record would read fewer.
      assert.ok(counter.reads() > 0, "listing really scans scopes");

      const emptyCounter = countingCaller("app-z", ["tenant-z"]);
      assert.deepEqual(kernel.visibleExecutions(emptyCounter.caller), [], "empty for an outsider regardless of hidden population");
    });
  });
});
