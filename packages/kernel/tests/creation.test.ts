/**
 * K1.1-C1 - atomic creation under a caller-scoped creation key.
 *
 * `mental-model/mechanisms/creation.md` owns the rules; its lost-response table is asserted row by
 * row. The cases are built around what a wrong implementation would do: key the retry on the bare
 * text so two callers collide, compare content by reference or by transport bytes so an honest
 * re-serialization conflicts, treat a changed field as an update rather than a conflict, or read the
 * producer from the payload.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

const coordinator = (): ExecutionCoordinator => new ExecutionCoordinator({ driver: recordingDriver() });

describe("K1.1-C1 one atomic creation", () => {
  test("creation binds every field in one decision and lands READY", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const created = accepted(kernel.createExecution(author, createRequest()));

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.equal(view.state, "READY", "there is no externally visible CREATED state");
    assert.equal(view.scope, "tenant-a");
    assert.equal(view.creationKey, "report-17");
    assert.equal(view.definitionRevision, "weekly-report@3");
    assert.equal(view.runtimeContractRevision, "runtime-contract@1");
    assert.equal(view.progressCodec, "inline-json@1");
    assert.deepEqual(view.authorityContext, { tenant: "a" });
    assert.equal(view.progressRevision, 0);
    assert.equal(view.acceptedProgress, null);
    assert.equal(view.activation, null);

    assert.equal(view.mailbox.length, 1, "the initial input is accepted in the same decision");
    const initial = view.mailbox[0];
    assert.ok(initial);
    assert.equal(initial.eventId, created.initialEventId);
    assert.deepEqual(initial.inputId, { producerNamespace: "app-a", destination: created.executionId, requestKey: "report-17" });
    assert.deepEqual(initial.payload, { text: "report for week 37" });
    assert.deepEqual(initial.disposition, { kind: "queued" });
    assert.equal(initial.reserved, false);
    assert.deepEqual(view.queued, [initial.eventId]);
    assert.deepEqual(view.acknowledged, [], "nothing has accounted for it");
    assert.deepEqual(view.terminalDispositions, []);
  });

  test("the creation receipt names the creation boundary and covers its initial input", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const created = accepted(kernel.createExecution(author, createRequest()));
    assert.equal(created.receipt.boundary, "creation");

    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.receipts, [created.receipt], "one decision, one receipt");
    assert.deepEqual(view.mailbox[0]?.receipt, created.receipt, "the initial input was accepted by that boundary");
  });

  test("a creation the caller may not scope is refused and creates nothing", () => {
    const kernel = coordinator();
    const outsider = caller("app-a", "tenant-b");
    const refusal = refused(kernel.createExecution(outsider, createRequest({ scope: "tenant-a" })));
    assert.equal(refusal.classification, "unauthorized_scope");
    assert.equal(refusal.executionId, null);
    assert.deepEqual(kernel.visibleExecutions(caller("app-a", "tenant-a")), []);
  });

  test("creation content that is not a boundary value is refused, with the reason", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const refusal = refused(
      kernel.createExecution(author, createRequest({ initialInput: { kind: "k", payload: { n: Number.NaN } } })),
    );
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /non_finite_number/);
    assert.deepEqual(kernel.visibleExecutions(author), []);
  });
});

describe("K1.1-C1 the lost-response cases", () => {
  test("row 1: nothing committed, so the creation commits now", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const created = accepted(kernel.createExecution(author, createRequest()));
    assert.equal(created.replayed, false);
    assert.deepEqual(kernel.visibleExecutions(author), [created.executionId]);
  });

  test("rows 2 and 3: a retry returns the same Execution and the retained decision", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const first = accepted(kernel.createExecution(author, createRequest()));
    const before = accepted(kernel.inspect(author, first.executionId));

    for (const attempt of [1, 2]) {
      const retry = accepted(kernel.createExecution(author, createRequest()));
      assert.equal(retry.executionId, first.executionId, `retry ${attempt} names the same Execution`);
      assert.equal(retry.replayed, true);
      assert.deepEqual(retry.receipt, first.receipt, "the retained decision, not a fresh one");
      assert.equal(retry.initialEventId, first.initialEventId, "and no second initial Event");
    }

    assert.deepEqual(kernel.visibleExecutions(author), [first.executionId], "exactly one Execution exists");
    assert.deepEqual(accepted(kernel.inspect(author, first.executionId)), before, "nothing about it moved");
  });

  test("changing the content under one key is a conflict, not an update", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const first = accepted(kernel.createExecution(author, createRequest()));
    const before = accepted(kernel.inspect(author, first.executionId));

    const refusal = refused(
      kernel.createExecution(
        author,
        createRequest({ initialInput: { kind: "application.request", payload: { text: "report for week 38" } } }),
      ),
    );
    assert.equal(refusal.classification, "duplicate_conflict");
    assert.equal(refusal.executionId, first.executionId);
    assert.match(refusal.reason, /fresh key/);

    const after = accepted(kernel.inspect(author, first.executionId));
    assert.deepEqual(kernel.visibleExecutions(author), [first.executionId], "no second Execution");
    assert.deepEqual(after.mailbox, before.mailbox, "the accepted initial input is untouched");
    assert.deepEqual(after.receipts, before.receipts, "a refusal mints no receipt");
    assert.deepEqual(after.refusals, [refusal], "and the refusal is recorded where it can be read");
  });

  test("any changed part of the creation content conflicts, not only the input", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    accepted(kernel.createExecution(author, createRequest()));

    for (const variation of [
      createRequest({ definitionRevision: "weekly-report@4" }),
      createRequest({ runtimeContractRevision: "runtime-contract@2" }),
      createRequest({ progressCodec: "inline-json@2" }),
      createRequest({ authorityContext: { tenant: "a", extra: true } }),
      createRequest({ initialInput: { kind: "application.other", payload: { text: "report for week 37" } } }),
      createRequest({ initialInput: { kind: "application.request", payload: { text: "report for week 37" }, subscriptionClass: "editor" } }),
    ]) {
      const refusal = refused(kernel.createExecution(author, variation));
      assert.equal(refusal.classification, "duplicate_conflict", `changing ${JSON.stringify(variation).slice(0, 60)} conflicts`);
    }
  });

  test("content equality is logical, so an honest re-serialization is still a replay", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const first = accepted(
      kernel.createExecution(
        author,
        createRequest({
          authorityContext: { tenant: "a", region: "eu" },
          initialInput: { kind: "application.request", payload: { text: "week 37", parts: [1, 2] } },
        }),
      ),
    );

    const reordered = accepted(
      kernel.createExecution(
        author,
        createRequest({
          authorityContext: { region: "eu", tenant: "a" },
          initialInput: { kind: "application.request", payload: { parts: [1, 2], text: "week 37" } },
        }),
      ),
    );
    assert.equal(reordered.replayed, true, "member order is not semantic");
    assert.equal(reordered.executionId, first.executionId);

    const reversedArray = refused(
      kernel.createExecution(
        author,
        createRequest({
          authorityContext: { tenant: "a", region: "eu" },
          initialInput: { kind: "application.request", payload: { text: "week 37", parts: [2, 1] } },
        }),
      ),
    );
    assert.equal(reversedArray.classification, "duplicate_conflict", "but array order is");
  });

  test("a second intentional run needs a fresh key, even with identical content", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const first = accepted(kernel.createExecution(author, createRequest({ creationKey: "report-17" })));
    const second = accepted(kernel.createExecution(author, createRequest({ creationKey: "report-17-again" })));

    assert.notEqual(second.executionId, first.executionId);
    assert.equal(second.replayed, false);
    assert.notDeepEqual(second.receipt, first.receipt);
    assert.equal(kernel.visibleExecutions(author).length, 2);
  });
});

describe("K1.1-C1 the key is scoped, and the scope comes from authentication", () => {
  test("another authenticated caller may use the same key text without colliding", () => {
    const kernel = coordinator();
    const a = caller("app-a", "tenant-a");
    const b = caller("app-b", "tenant-a");

    const fromA = accepted(kernel.createExecution(a, createRequest()));
    const fromB = accepted(kernel.createExecution(b, createRequest()));
    assert.notEqual(fromB.executionId, fromA.executionId, "one key text, two producers, two Executions");

    // And each producer's own retry still finds its own Execution rather than the other's.
    assert.equal(accepted(kernel.createExecution(a, createRequest())).executionId, fromA.executionId);
    assert.equal(accepted(kernel.createExecution(b, createRequest())).executionId, fromB.executionId);
  });

  test("the same caller's key text in two authority scopes names two requests", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a", "tenant-b");
    const inA = accepted(kernel.createExecution(author, createRequest({ scope: "tenant-a" })));
    const inB = accepted(kernel.createExecution(author, createRequest({ scope: "tenant-b" })));
    assert.notEqual(inB.executionId, inA.executionId);
  });

  test("the payload cannot supply or change the producer namespace", () => {
    const kernel = coordinator();
    const impersonating = {
      kind: "application.request",
      payload: { producer: "app-b", namespace: "app-b", principal: "app-b", text: "week 37" },
    };

    const fromA = accepted(kernel.createExecution(caller("app-a", "tenant-a"), createRequest({ initialInput: impersonating })));
    const fromB = accepted(kernel.createExecution(caller("app-b", "tenant-a"), createRequest({ initialInput: impersonating })));

    // If the payload had been believed, both calls would have been scoped to `app-b` and the second
    // would have replayed the first. The authenticated caller decides, so there are two Executions.
    assert.notEqual(fromB.executionId, fromA.executionId);
    assert.equal(fromB.replayed, false);
  });

  test("an Execution is invisible outside its authority scope, exactly as a missing one is", () => {
    const kernel = coordinator();
    const owner = caller("app-a", "tenant-a");
    const outsider = caller("app-c", "tenant-c");
    const created = accepted(kernel.createExecution(owner, createRequest()));

    const hidden = refused(kernel.inspect(outsider, created.executionId));
    const missing = refused(kernel.inspect(outsider, "execution-does-not-exist"));
    assert.deepEqual({ ...hidden, position: 0 }, { ...missing, position: 0 }, "the two refusals are indistinguishable");
    assert.deepEqual(kernel.visibleExecutions(outsider), []);
  });
});
