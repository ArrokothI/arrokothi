/**
 * K1.1-C1 - atomic creation under a Creation request ID.
 *
 * `mental-model/mechanisms/creation.md` owns the rules; its lost-response table is asserted row by
 * row. The cases are built around what a wrong implementation would do: key the retry on the bare
 * text so two callers collide, compare content by reference or by transport bytes so an honest
 * re-serialization conflicts, treat a changed field as an update rather than a conflict, or read the
 * producer from the payload.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, canonicalize } from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  descriptorConversionIsHostile,
  inheritedIndexIsLive,
  iteratorNextIsHostile,
  polluteDescriptorFields,
  polluteIteratorNext,
  recordingDriver,
  refused,
  revokedProxy,
  trapInheritedIndices,
  type DescriptorPollution,
  type InheritedIndexTrap,
} from "./harness.ts";

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

  test("no packing of the creation key's three parts can make two requests collide", () => {
    const kernel = coordinator();
    // ("a", "b c", "d") and ("a b", "c", "d") join to the same text under any single separator.
    const wide = caller("a", "b c");
    const narrow = caller("a b", "c");
    assert.equal(["a", "b c", "d"].join(" "), ["a b", "c", "d"].join(" "), "the two keys really do render alike");

    const first = accepted(kernel.createExecution(wide, createRequest({ scope: "b c", creationKey: "d" })));
    const second = accepted(kernel.createExecution(narrow, createRequest({ scope: "c", creationKey: "d" })));
    assert.notEqual(second.executionId, first.executionId);
    assert.equal(second.replayed, false, "the second request is its own, not a replay of the first");
  });

  test("K11-R3-ID-02 an identity field that is not text is refused rather than packed into a colliding key", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");

    // Every object renders as `[object Object]` with no length, so before this rule two genuinely
    // different creation keys packed identically: the first created an Execution and the second was
    // refused as its conflict, having named nothing of the sort.
    const first = refused(
      kernel.createExecution(author, createRequest({ creationKey: { a: 1 } as never, initialInput: { kind: "k", payload: 1 } })),
    );
    const second = refused(
      kernel.createExecution(author, createRequest({ creationKey: { b: 2 } as never, initialInput: { kind: "k", payload: 2 } })),
    );
    for (const refusal of [first, second]) {
      assert.equal(refusal.classification, "malformed_value");
      assert.match(refusal.reason, /creationKey unsupported_form/);
    }
    assert.deepEqual(kernel.visibleExecutions(author), [], "neither request named an Execution");

    // The sharper case is `kind`, which is content: two different kinds under one key were accepted
    // as an exact replay of each other, which is the opposite of C1's conflict rule.
    const kindA = refused(
      kernel.createExecution(author, createRequest({ creationKey: "k1", initialInput: { kind: { a: 1 } as never, payload: 1 } })),
    );
    assert.match(kindA.reason, /initialInput\.kind unsupported_form/);
    const kindB = refused(
      kernel.createExecution(author, createRequest({ creationKey: "k1", initialInput: { kind: { b: 2 } as never, payload: 1 } })),
    );
    assert.equal(kindB.classification, "malformed_value", "and the second is not answered as a replay of the first");
    assert.deepEqual(kernel.visibleExecutions(author), []);

    // The rule covers every identity-bearing field of the creation envelope, and reports them all.
    const many = refused(
      kernel.createExecution(caller("app-a", "tenant-a", "tenant-b"), {
        creationKey: 17 as never,
        scope: "tenant-a",
        definitionRevision: null as never,
        runtimeContractRevision: "r@1",
        progressCodec: ["c"] as never,
        authorityContext: { tenant: "a" },
        initialInput: { kind: "k", payload: 1, subscriptionClass: 5 as never },
      }),
    );
    assert.equal(many.classification, "malformed_value");
    for (const field of ["creationKey", "definitionRevision", "progressCodec", "initialInput.subscriptionClass"]) {
      assert.ok(many.reason.includes(`${field} unsupported_form`), `${field} is named in the refusal`);
    }
  });

  test("K11-R3-ID-02 identity text is still held to the ordinary boundary-value rules", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const refusal = refused(kernel.createExecution(author, createRequest({ creationKey: "bad\ud800key" })));
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /creationKey lone_surrogate/);
    assert.deepEqual(kernel.visibleExecutions(author), []);
  });

  test("K11-R3-ID-03 malformed scope is refused before authorization, well-formed unauthorized scope after", () => {
    const kernel = coordinator();
    // Ordering is explicit: a non-text scope is malformed even when the caller is also
    // unauthorized for it (the old code returned unauthorized_scope first and never validated).
    const outsider = caller("app-a", "tenant-b");
    const nonText = refused(kernel.createExecution(outsider, createRequest({ scope: 17 as never })));
    assert.equal(nonText.classification, "malformed_value", "non-text scope is malformed, not unauthorized");
    assert.match(nonText.reason, /scope unsupported_form/);
    assert.equal(nonText.executionId, null);

    const malformedUnicode = refused(
      kernel.createExecution(outsider, createRequest({ scope: "bad\ud800scope" as never })),
    );
    assert.equal(malformedUnicode.classification, "malformed_value");
    assert.match(malformedUnicode.reason, /scope lone_surrogate/);

    // A well-formed scope the caller does not hold is still unauthorized — validation passed, so
    // authorization is what refuses it. This is the other half of the ordering.
    const unauthorized = refused(kernel.createExecution(outsider, createRequest({ scope: "tenant-a" })));
    assert.equal(unauthorized.classification, "unauthorized_scope");
    assert.deepEqual(kernel.visibleExecutions(outsider), []);
    assert.deepEqual(kernel.visibleExecutions(caller("app-a", "tenant-a")), [], "nothing was created by the refused calls");
  });

  test("K11-R2-VAL-02 creation under ambient toJSON still binds the retained payload and its replay", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const previous = (Object.prototype as Record<string, unknown>).toJSON;
    (Object.prototype as Record<string, unknown>).toJSON = () => 42;
    try {
      const created = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "ambient-1", initialInput: { kind: "k", payload: { a: 1 } as never } }),
        ),
      );
      assert.equal(created.replayed, false);
      const view = accepted(kernel.inspect(author, created.executionId));
      assert.deepEqual(view.mailbox[0]?.payload, { a: 1 }, "retained content is the snapshot, not 42");
      const replay = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "ambient-1", initialInput: { kind: "k", payload: { a: 1 } as never } }),
        ),
      );
      assert.equal(replay.replayed, true, "exact replay still finds the same Execution by canonical identity");
      assert.equal(replay.executionId, created.executionId);
    } finally {
      if (previous === undefined) delete (Object.prototype as Record<string, unknown>).toJSON;
      else (Object.prototype as Record<string, unknown>).toJSON = previous;
    }
  });

  test("K11-R2-VAL-02 creation identity and replay agree under a capture-time Object.keys replacement", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const realKeys = Object.keys;
    // The payload reads coherently (descriptor 1, read 1) while installing a live-global
    // replacement that would make `{a:1}` serialize as `{}`. Review-04's H5 bound the wrong
    // bytes here, so a later logically different request could collide under one identity.
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Object as unknown as Record<string, unknown>).keys = () => [];
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    let created: { executionId: string; initialEventId: string; replayed: boolean };
    try {
      created = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "ambient-keys", initialInput: { kind: "k", payload: sneaky as never } }),
        ),
      );
    } finally {
      Object.keys = realKeys;
    }
    assert.equal(created!.replayed, false);
    const view = accepted(kernel.inspect(author, created!.executionId));
    assert.deepEqual(view.mailbox[0]?.payload, { a: 1 }, "retained content is the snapshot, not {}");
    const retained = canonicalize(view.mailbox[0]?.payload);
    assert.ok(retained.ok);
    assert.equal(retained.value.canonical, '{"a":1}', "retained inspection re-canonicalizes to the bound bytes");

    // Identity proves it too: a fresh plain spelling of the same logical value replays (it would
    // conflict had identity bound `{}`), while different content under the key still conflicts.
    const replay = accepted(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "ambient-keys", initialInput: { kind: "k", payload: { a: 1 } as never } }),
      ),
    );
    assert.equal(replay.replayed, true, "exact replay finds the same Execution by canonical identity");
    assert.equal(replay.executionId, created!.executionId);
    const conflict = refused(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "ambient-keys", initialInput: { kind: "k", payload: { a: 2 } as never } }),
      ),
    );
    assert.equal(conflict.classification, "duplicate_conflict");
  });

  test("K11-R5-VAL-03 creation refuses a prototype observation that swaps the live Object binding", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const RealObject = Object;
    const Fake = function Fake(this: unknown) {};
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      getPrototypeOf() {
        (globalThis as unknown as Record<string, unknown>).Object = Fake;
        return (Fake as unknown as { prototype: object }).prototype;
      },
    });
    let refusal: { classification: string };
    try {
      refusal = refused(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "foreign-proto", initialInput: { kind: "k", payload: sneaky as never } }),
        ),
      );
    } finally {
      (globalThis as unknown as Record<string, unknown>).Object = RealObject;
    }
    assert.equal(refusal!.classification, "malformed_value");
    assert.deepEqual(kernel.visibleExecutions(author), [], "nothing was created from the refused value");
  });

  test("K11-R5-STATE-01 a capture-time Map.prototype.set no-op cannot drop the creation commit", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const realSet = Map.prototype.set;
    // Coherent on the one reading capture takes, while the read disables the commit path's own
    // collection operation. Bytes and identity are correct — what is under test is retention.
    const sneaky = new Proxy({ a: 1 } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "a") {
          (Map.prototype as unknown as Record<string, unknown>).set = function (this: unknown) {
            return this;
          };
          return 1;
        }
        return Reflect.get(inner, property, receiver);
      },
    });
    let created: { executionId: string; initialEventId: string; replayed: boolean };
    try {
      created = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "state-map", initialInput: { kind: "k", payload: sneaky as never } }),
        ),
      );
      assert.notEqual(Map.prototype.set, realSet, "the no-op was live across the boundary call");
    } finally {
      (Map.prototype as unknown as Record<string, unknown>).set = realSet;
    }
    assert.equal(created!.replayed, false);
    // The receipt must have a retained decision behind it: exact replay returns the same
    // Execution (a dropped commit would mint a second Execution here), and inspection shows it.
    const replay = accepted(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "state-map", initialInput: { kind: "k", payload: { a: 1 } as never } }),
      ),
    );
    assert.equal(replay.replayed, true, "the creation decision was actually retained");
    assert.equal(replay.executionId, created!.executionId);
    const view = accepted(kernel.inspect(author, created!.executionId));
    assert.equal(view.state, "READY");
    assert.deepEqual(view.mailbox[0]?.payload, { a: 1 });
    assert.deepEqual(kernel.visibleExecutions(author), [created!.executionId]);
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
    assert.deepEqual({ ...hidden }, { ...missing }, "the two refusals are indistinguishable");
    assert.equal(hidden.position, 0, "K11-R12-ID-01: unmasked — a refusal naming no Execution orders against nothing");
    assert.deepEqual(kernel.visibleExecutions(outsider), []);
  });

  test("K11-R1-VAL-01 a valid own __proto__ creation payload is retained as own data through inspection", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const payload = JSON.parse('{"__proto__":{"admin":true},"safe":2}') as Record<string, unknown>;
    const created = accepted(
      kernel.createExecution(author, createRequest({ creationKey: "proto-1", initialInput: { kind: "application.request", payload: payload as never } })),
    );

    const view = accepted(kernel.inspect(author, created.executionId));
    const stored = view.mailbox[0]?.payload as Record<string, unknown>;
    assert.ok(Object.prototype.hasOwnProperty.call(stored, "__proto__"), "stored state keeps the member as own data");
    assert.deepEqual(stored["__proto__"], { admin: true });
    assert.equal(Object.getPrototypeOf(stored), Object.prototype);

    // Replay with an honest re-serialization still finds the same Execution.
    const replay = accepted(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "proto-1", initialInput: { kind: "application.request", payload: JSON.parse('{"safe":2,"__proto__":{"admin":true}}') as never } }),
      ),
    );
    assert.equal(replay.executionId, created.executionId);
    assert.equal(replay.replayed, true);

    // Mutating the caller's object afterwards does not reach the record.
    (payload["__proto__"] as Record<string, unknown>)["admin"] = false;
    const after = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual((after.mailbox[0]?.payload as Record<string, unknown>)["__proto__"], { admin: true });
  });

  test("K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at creation", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    // Owns 1 at position 0, reads 2 there. The round-3 path validated the read, bound canonical
    // bytes from the read, and retained the owned value: identity named a value nobody kept.
    const payload = new Proxy([1], {
      get(inner, property, receiver): unknown {
        if (property === "0") return 2;
        return Reflect.get(inner, property, receiver);
      },
    });
    const refusal = refused(
      kernel.createExecution(author, createRequest({ creationKey: "unstable", initialInput: { kind: "k", payload: payload as never } })),
    );
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /unstable_representation/);
    assert.deepEqual(kernel.visibleExecutions(author), [], "nothing was created under either reading");

    // The same rule reaches the authority context, which is its own boundary-value root.
    const context = new Proxy({ tenant: "a" } as Record<string, unknown>, {
      get(inner, property, receiver): unknown {
        if (property === "tenant") return "b";
        return Reflect.get(inner, property, receiver);
      },
    });
    const contextRefusal = refused(
      kernel.createExecution(author, createRequest({ creationKey: "unstable-2", authorityContext: context as never })),
    );
    assert.equal(contextRefusal.classification, "malformed_value");
    assert.match(contextRefusal.reason, /authorityContext\.tenant unstable_representation/);
    assert.deepEqual(kernel.visibleExecutions(author), []);
  });

  test("K11-R2-VAL-02 what creation retained is exactly what its canonical identity described", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const payload = JSON.parse('{"__proto__":{"admin":true},"list":[1,[2,{"deep":null}]],"safe":2}') as Record<string, unknown>;
    const created = accepted(
      kernel.createExecution(author, createRequest({ creationKey: "coherent", initialInput: { kind: "application.request", payload: payload as never } })),
    );

    const stored = accepted(kernel.inspect(author, created.executionId)).mailbox[0]?.payload;
    const bound = canonicalize(payload);
    const retained = canonicalize(stored);
    assert.ok(bound.ok && retained.ok);
    assert.equal(retained.value.canonical, bound.value.canonical, "the retained structure canonicalizes to the bytes that accepted it");

    // And that identity is what decides a replay: a fresh spelling of the same logical value is the
    // lost-response row, while one differing anywhere is a conflict.
    const replay = accepted(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "coherent", initialInput: { kind: "application.request", payload: JSON.parse('{"safe":2,"list":[1,[2,{"deep":null}]],"__proto__":{"admin":true}}') as never } }),
      ),
    );
    assert.equal(replay.replayed, true);
    assert.equal(replay.executionId, created.executionId);
  });

  test("K11-R1-VAL-01 an array carrying own non-index member 01 is refused at creation", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const bad: unknown[] = [1, 2];
    Object.defineProperty(bad, "01", { value: 99, writable: true, enumerable: true, configurable: true });
    const refusal = refused(
      kernel.createExecution(author, createRequest({ creationKey: "bad-array", initialInput: { kind: "k", payload: bad as never } })),
    );
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /unrepresentable_member/);
    assert.deepEqual(kernel.visibleExecutions(author), []);
  });
});

describe("K11-R6-VAL-04 the one observed value is what creation binds, retains and replays", () => {
  /**
   * The same coherent-array counterexample, driven through a real acceptance boundary rather than
   * `canonicalize` alone.
   *
   * If the capture pass could be steered into retaining `["zero", <substitute>]` for a caller whose
   * value read `["zero", "kept"]`, then the creation key would be bound to bytes the caller never
   * sent: the caller's own honest retry would arrive as a `duplicate_conflict`, and inspection and
   * the Activation would both describe the attacker's value. Closure has to hold here, not only at
   * the value module's own entry point.
   */
  test("a coherent array whose prototype observation installs an indexed accessor binds its own value", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const author = caller("app-a", "tenant-a");

    const elements: unknown[] = [];
    Object.defineProperty(elements, "0", { value: "zero", writable: true, enumerable: true, configurable: true });
    Object.defineProperty(elements, "1", { value: "kept", writable: true, enumerable: true, configurable: true });

    let trap: InheritedIndexTrap | undefined;
    const sneaky = new Proxy(elements, {
      getPrototypeOf(inner): object | null {
        trap = trapInheritedIndices(["0", "1"]);
        return Reflect.getPrototypeOf(inner);
      },
    });

    let created: { executionId: string; initialEventId: string; replayed: boolean; receipt: { token: string } };
    try {
      created = accepted(
        kernel.createExecution(
          author,
          createRequest({ creationKey: "indexed-accessor", initialInput: { kind: "k", payload: sneaky as never } }),
        ),
      );
      assert.ok(trap !== undefined, "the prototype observation really installed the accessor");
      assert.equal(inheritedIndexIsLive(1), true, "and it was live across the creation call");
    } finally {
      trap?.restore();
    }

    assert.equal(created!.replayed, false);
    const view = accepted(kernel.inspect(author, created!.executionId));
    assert.deepEqual(view.mailbox[0]?.payload, ["zero", "kept"], "retained content is the observed value");

    // Identity proves it as well: the caller's own plain retry of the same logical value replays,
    // which it could not do if the key had been bound to the substitute's bytes.
    const replay = accepted(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "indexed-accessor", initialInput: { kind: "k", payload: ["zero", "kept"] } }),
      ),
    );
    assert.equal(replay.replayed, true);
    assert.equal(replay.executionId, created!.executionId);
    assert.equal(replay.receipt, created!.receipt);

    // And a genuinely different value under that key is still a conflict, so the replay above is
    // not simply a key that matches anything.
    const conflict = refused(
      kernel.createExecution(
        author,
        createRequest({ creationKey: "indexed-accessor", initialInput: { kind: "k", payload: ["zero", "changed"] } }),
      ),
    );
    assert.equal(conflict.classification, "duplicate_conflict");

    // The Activation carries that same retained structure to the Driver.
    accepted(kernel.dispatch(author, created!.executionId, { bound: 1 }));
    assert.deepEqual(driver.seen[0]?.events[0]?.payload, ["zero", "kept"]);
  });
});

describe("K11-R7-STATE-03 creation under inherited descriptor-field pollution", () => {
  /**
   * The snapshot/safe-clone/serializer-window half of the same defect class.
   *
   * A payload's `getPrototypeOf` observation installs inherited `get`/`set` fields on
   * `Object.prototype` and then presents a perfectly valid object. Every definition the Kernel
   * performs afterwards — snapshot members, the serialization-safe clone, the serializer
   * environment swap, the mailbox and receipt lists, the refusal list — converts a descriptor, so
   * an ordinary literal anywhere in that chain throws a raw ambient `TypeError` instead of the one
   * atomic creation decision the contract requires.
   */
  /**
   * The handler's own prototype matters. A Proxy trap lookup (`handler.get`, `handler.ownKeys`,
   * …) consults the handler's prototype chain, so an ordinary handler breaks under the very
   * pollution its own observation installed: every later trap lookup finds the inherited field and
   * the observation throws. That shape is refused as `unstable_representation` — the contract's
   * defined answer for "a structure whose observation throws" — and these cases assert exactly
   * that containment too. To isolate the *Kernel-side* closure (everything after a successful
   * observation), the accepted-content cases below use a null-prototype handler, whose trap
   * lookups never consult `Object.prototype`, so any failure would be the Kernel's own definition
   * throwing rather than the caller's handler breaking.
   */
  const polluteOnPrototype = (
    payload: Record<string, unknown>,
    onPollution: (pollution: DescriptorPollution) => void,
    seen: { hostile: boolean },
    nullPrototypeHandler: boolean,
  ): unknown => {
    let installed = false;
    const handler: ProxyHandler<Record<string, unknown>> = {
      getPrototypeOf(target): object | null {
        if (!installed) {
          installed = true;
          onPollution(polluteDescriptorFields({ get: 1, set: () => {} }));
          seen.hostile = descriptorConversionIsHostile();
        }
        return Reflect.getPrototypeOf(target);
      },
    };
    const effective = nullPrototypeHandler ? Object.assign(Object.create(null), handler) : handler;
    return new Proxy(payload, effective);
  };

  const cleanCanonical = (value: unknown): string => {
    const checked = canonicalize(value);
    assert.ok(checked.ok, "the twin is an acceptable boundary value");
    return checked.value.canonical;
  };

  test("a payload observation that installs get/set still creates the exact Execution", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const author = caller("app-a", "tenant-a");
    const expected = cleanCanonical({ text: "report for week 37" });

    let pollution: DescriptorPollution | undefined;
    const seen = { hostile: false };
    let created: { executionId: string; receipt: { token: string; boundary: string }; replayed: boolean; initialEventId: string };
    try {
      created = accepted(
        kernel.createExecution(
          author,
          createRequest({
            creationKey: "descriptor-pollution",
            initialInput: {
              kind: "application.request",
              payload: polluteOnPrototype(
                { text: "report for week 37" },
                (installed) => {
                  pollution = installed;
                },
                seen,
                true,
              ) as { text: string },
            },
          }),
        ),
      ) as { executionId: string; receipt: { token: string; boundary: string }; replayed: boolean; initialEventId: string };
    } finally {
      pollution?.restore();
    }

    // Not vacuous: the observation really ran and conversion really was hostile for the call.
    assert.equal(seen.hostile, true, "descriptor conversion threw for the whole creation call");

    assert.equal(created!.replayed, false);
    assert.equal(created!.receipt.boundary, "creation");
    const view = accepted(kernel.inspect(author, created!.executionId));
    assert.equal(view.state, "READY");
    assert.deepEqual(view.mailbox[0]?.payload, { text: "report for week 37" }, "retained content is the observed value");
    assert.equal(
      cleanCanonical(view.mailbox[0]?.payload),
      expected,
      "re-canonicalizing the retained structure reproduces the accepting bytes",
    );

    // Identity proves it as well: the caller's own plain retry of the same logical value replays.
    const replay = accepted(
      kernel.createExecution(
        author,
        createRequest({
          creationKey: "descriptor-pollution",
          initialInput: { kind: "application.request", payload: { text: "report for week 37" } },
        }),
      ),
    );
    assert.equal(replay.replayed, true);
    assert.equal(replay.executionId, created!.executionId);
    assert.equal(replay.receipt, created!.receipt);

    // And a genuinely different value under that key is still a conflict.
    const conflict = refused(
      kernel.createExecution(
        author,
        createRequest({
          creationKey: "descriptor-pollution",
          initialInput: { kind: "application.request", payload: { text: "something else" } },
        }),
      ),
    );
    assert.equal(conflict.classification, "duplicate_conflict");

    // The Activation carries that same retained structure to the Driver.
    accepted(kernel.dispatch(author, created!.executionId, { bound: 1 }));
    assert.deepEqual(driver.seen[0]?.events[0]?.payload, { text: "report for week 37" });

    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "get"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "set"), false);
  });

  test("an ordinary handler broken by its own pollution is refused, never accepted or leaked", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver });
    const author = caller("app-a", "tenant-a");

    let pollution: DescriptorPollution | undefined;
    const seen = { hostile: false };
    let refusal: { classification: string; reason: string };
    try {
      refusal = refused(
        kernel.createExecution(
          author,
          createRequest({
            creationKey: "descriptor-pollution",
            initialInput: {
              kind: "application.request",
              payload: polluteOnPrototype(
                { text: "report for week 37" },
                (installed) => {
                  pollution = installed;
                },
                seen,
                false,
              ) as { text: string },
            },
          }),
        ),
      ) as { classification: string; reason: string };
    } finally {
      pollution?.restore();
    }

    // The observation genuinely threw: after installing `get`, the handler's own `get` trap lookup
    // finds the inherited field. The contract's answer for an unobservable structure is refusal.
    assert.equal(seen.hostile, true);
    assert.equal(refusal!.classification, "malformed_value");

    // Nothing was committed behind the refusal: the same key with a plain twin creates cleanly.
    const created = accepted(
      kernel.createExecution(
        author,
        createRequest({
          creationKey: "descriptor-pollution",
          initialInput: { kind: "application.request", payload: { text: "report for week 37" } },
        }),
      ),
    );
    assert.equal(created.replayed, false);
    const view = accepted(kernel.inspect(author, created.executionId));
    assert.deepEqual(view.mailbox[0]?.payload, { text: "report for week 37" });

    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "get"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(Object.prototype, "set"), false);
  });
});

describe("K11-R16-VAL-01 creation replay and conflict are stable while the iterator next is hostile", () => {
  // While the omit-all `next` is installed, oracles use `assert.equal` with indexed reads only:
  // `assert.ok` delegates through a rest-args spread and would fail even on `true`, and any
  // destructuring, `for...of` or spread would itself iterate through the hostile method.
  test("retry still replays and changed content still conflicts", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const first = accepted(kernel.createExecution(author, createRequest()));

    const pollution = polluteIteratorNext(() => ({ done: true }));
    try {
      assert.equal(iteratorNextIsHostile(), true, "omit-all next live across these calls");

      const retry = accepted(kernel.createExecution(author, createRequest()));
      assert.equal(retry.replayed, true);
      assert.equal(retry.executionId, first.executionId);
      assert.equal(retry.receipt.boundary, first.receipt.boundary);
      assert.equal(retry.receipt.token, first.receipt.token);
      assert.equal(retry.receipt.position, first.receipt.position);
      assert.equal(retry.initialEventId, first.initialEventId);

      const conflict = refused(
        kernel.createExecution(
          author,
          createRequest({ initialInput: { kind: "application.request", payload: { text: "report for week 38" } } }),
        ),
      );
      assert.equal(conflict.classification, "duplicate_conflict");
      assert.equal(conflict.executionId, first.executionId);
    } finally {
      pollution.restore();
    }

    const after = accepted(kernel.inspect(author, first.executionId));
    assert.equal(after.mailbox.length, 1, "retry and conflict created no second Event");
    assert.equal(after.mailbox[0]?.eventId, first.initialEventId);
  });
});

describe("K11-R16-ID-01 malformed identity diagnostics never throw on caller-owned values", () => {
  // Every observation below throws if merely read (`Array.isArray` on a revoked Proxy throws
  // `TypeError`; a revoked envelope throws on any field read). Each must answer the located
  // contract-defined refusal with zero accepted-state mutation — never an escaped exception.
  test("a revoked Proxy in any identity-text field is a located malformed_value refusal", () => {
    const fields = [
      "scope",
      "creationKey",
      "definitionRevision",
      "runtimeContractRevision",
      "progressCodec",
    ] as const;
    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index] as string;
      const kernel = coordinator();
      const author = caller("app-a", "tenant-a");
      const request = createRequest({ [field]: revokedProxy() } as Partial<Parameters<ExecutionCoordinator["createExecution"]>[1]>);
      const refusal = refused(kernel.createExecution(author, request));
      assert.equal(refusal.classification, "malformed_value", field);
      assert.match(refusal.reason, new RegExp(`${field} (unsupported_form|unstable_representation)`), field);
      assert.doesNotMatch(refusal.reason, /TypeError|IsArray/, "no ambient exception leaks into the reason");
      assert.equal(refusal.executionId, null);
      assert.deepEqual(kernel.visibleExecutions(author), [], "nothing was created behind the refusal");
    }
  });

  test("a revoked Proxy in initial-input identity fields is located under initialInput", () => {
    for (const overrides of [{ kind: revokedProxy() as never }, { subscriptionClass: revokedProxy() as never }]) {
      const kernel = coordinator();
      const author = caller("app-a", "tenant-a");
      const refusal = refused(
        kernel.createExecution(author, createRequest({ initialInput: { kind: "application.request", payload: 1, ...overrides } })),
      );
      assert.equal(refusal.classification, "malformed_value");
      assert.match(refusal.reason, /initialInput\.(kind|subscriptionClass) (unsupported_form|unstable_representation)/);
      assert.doesNotMatch(refusal.reason, /TypeError|IsArray/);
      assert.deepEqual(kernel.visibleExecutions(author), []);
    }
  });

  test("an unreadable or absent creation envelope is malformed, and scope still precedes authorization", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");

    const revoked = refused(kernel.createExecution(author, revokedProxy() as never));
    assert.equal(revoked.classification, "malformed_value");
    assert.match(revoked.reason, /scope unstable_representation/);

    const missing = refused(kernel.createExecution(author, null as never));
    assert.equal(missing.classification, "malformed_value");
    assert.match(missing.reason, /scope unsupported_form/);

    // An outsider naming an unobservable scope learns nothing beyond the malformed-value refusal:
    // scope text validation still precedes authorization.
    const outsider = refused(kernel.createExecution(caller("app-a", "tenant-b"), createRequest({ scope: revokedProxy() as never })));
    assert.equal(outsider.classification, "malformed_value");
    assert.match(outsider.reason, /scope (unsupported_form|unstable_representation)/);

    assert.deepEqual(kernel.visibleExecutions(author), []);
  });

  test("a revoked initialInput envelope is a located refusal", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const refusal = refused(kernel.createExecution(author, createRequest({ initialInput: revokedProxy() as never })));
    assert.equal(refusal.classification, "malformed_value");
    // Each field read throws on the revoked envelope; every failure is located under initialInput.
    assert.match(refusal.reason, /initialInput/);
    assert.match(refusal.reason, /unstable_representation/);
    assert.doesNotMatch(refusal.reason, /TypeError|IsArray/);
    assert.deepEqual(kernel.visibleExecutions(author), []);
  });
});

describe("K11-R16-ID-01 (R3) ambient prototype state cannot answer missing envelope fields", () => {
  /**
   * Found by the fresh adversarial review wave (Reviewer 3), not by the implementation pass.
   *
   * Ordinary field reads consult the whole prototype chain for a key the envelope does not own,
   * so ambient `Object.prototype`/`Array.prototype` pollution — residue or same-tick
   * trap-installed — steered missing fields into acceptances the caller never spelled:
   * `dispatch({})` accepted by an ambient `bound`, `create({})` accepted by ambient identity text.
   * Every envelope observation is therefore own-only: inherited-only reads as missing (KC1-DEC-6).
   */
  const setProtoFields = (fields: Record<string, unknown>): void => {
    for (const key of Object.keys(fields)) (Object.prototype as Record<string, unknown>)[key] = fields[key];
  };
  const clearProtoFields = (fields: Record<string, unknown>): void => {
    for (const key of Object.keys(fields)) delete (Object.prototype as Record<string, unknown>)[key];
  };

  test("ambient identity text cannot complete an empty creation envelope", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const ambient = {
      scope: "tenant-a",
      creationKey: "proto-key",
      definitionRevision: "weekly-report@3",
      runtimeContractRevision: "runtime-contract@1",
      progressCodec: "inline-json@1",
    };
    setProtoFields(ambient);
    try {
      const refusal = refused(kernel.createExecution(author, {} as never));
      assert.equal(refusal.classification, "malformed_value");
      assert.match(refusal.reason, /scope unsupported_form/, "the own-missing scope is refused, not ambient-answered");
      assert.doesNotMatch(refusal.reason, /proto-key/, "ambient text leaks nowhere into the reason");
      assert.deepEqual(kernel.visibleExecutions(author), [], "nothing was created behind the refusal");
    } finally {
      clearProtoFields(ambient);
    }
  });

  test("an earlier-field trap cannot steer a later field through ambient state in the same tick", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    let installed = false;
    const pollutingContext = new Proxy({ tenant: "a" }, {
      get(target, property, receiver) {
        if (!installed) {
          installed = true;
          setProtoFields({ kind: "INJECTED", payload: { injected: true } });
        }
        return Reflect.get(target, property, receiver);
      },
    });
    try {
      const refusal = refused(
        kernel.createExecution(author, createRequest({ authorityContext: pollutingContext as never, initialInput: {} as never })),
      );
      assert.equal(installed, true, "the trap ran, so this is not a vacuous pass");
      assert.equal(refusal.classification, "malformed_value");
      assert.match(refusal.reason, /initialInput\.kind unsupported_form/, "the own-missing kind is refused");
      assert.doesNotMatch(refusal.reason, /INJECTED/, "the injected kind was never bound");
      assert.deepEqual(kernel.visibleExecutions(author), []);
    } finally {
      clearProtoFields({ kind: "INJECTED", payload: { injected: true } });
    }
  });

  test("a field carried only by inheritance reads as missing", () => {
    const kernel = coordinator();
    const author = caller("app-a", "tenant-a");
    const inherited = Object.create(createRequest());
    const refusal = refused(kernel.createExecution(author, inherited as never));
    assert.equal(refusal.classification, "malformed_value");
    assert.match(refusal.reason, /scope unsupported_form/);
    assert.deepEqual(kernel.visibleExecutions(author), []);
  });
});
