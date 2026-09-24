/**
 * K1.2 - Outcome acceptance: scope, replay, whole-envelope validation and one atomic commit.
 *
 * Canonical owner: `mental-model/mechanisms/execution-cycle.md#outcome-acceptance`, with the terms
 * in `concepts/core.md` (Outcome, batch, acknowledgment) and `concepts/identity.md` (receipt, writer
 * epoch, revision). Every case drives the supported entry, `ExecutionCoordinator`, with the recording
 * fake Driver, and asserts the whole observable result: what changed, and that nothing else did.
 *
 * The oracle for "nothing was accepted" is a full inspection snapshot taken before the submission and
 * compared after it, with only the recorded refusal allowed to differ. A plausible broken
 * implementation that acknowledged the batch, installed progress, recorded an Emission or moved the
 * state before refusing would fail that comparison, whichever field it touched.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type ExecutionView, type OutcomeEnvelope } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, refused, type RecordingDriver } from "./harness.ts";

const author = caller("app-a", "tenant-a");
const outsider = caller("app-c", "tenant-c");

interface Started {
  readonly kernel: ExecutionCoordinator;
  readonly driver: RecordingDriver;
  readonly executionId: string;
  readonly initialEventId: string;
}

/** A created Execution, not yet dispatched. */
function created(options: { emissionsPerOutcome?: number } = {}): Started {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver, ...options });
  const result = accepted(kernel.createExecution(author, createRequest()));
  return { kernel, driver, executionId: result.executionId, initialEventId: result.initialEventId };
}

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

const input = (kernel: ExecutionCoordinator, executionId: string, requestKey: string): string =>
  accepted(kernel.submitInput(author, { destination: executionId, requestKey, kind: "application.correction", payload: { key: requestKey } }))
    .eventId;

/**
 * Asserts that a refused submission accepted nothing.
 *
 * Everything the inspection view reports must be identical, except that exactly one refusal was
 * appended - with the expected classification - and nothing else about the refusal list changed.
 */
function assertRefusedWhole(before: ExecutionView, after: ExecutionView, classification: string): void {
  assert.equal(after.refusals.length, before.refusals.length + 1, "exactly one refusal was recorded");
  assert.equal(after.refusals[after.refusals.length - 1]?.classification, classification);
  const { refusals: _afterRefusals, ...afterRest } = after;
  const { refusals: _beforeRefusals, ...beforeRest } = before;
  assert.deepEqual(afterRest, beforeRest, "no acknowledgment, progress, Emission, result, disposition, state, epoch or receipt changed");
}

describe("K1.2-C1 authenticate and scope before any content is read", () => {
  test("a hidden Execution and a missing one refuse identically, with no content read", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const before = view(kernel, executionId);

    let reads = 0;
    const counted = (value: unknown) => ({
      get() {
        reads += 1;
        return value;
      },
      enumerable: true,
    });
    const envelope = Object.defineProperties(
      { executionId },
      {
        activationId: counted(dispatched.activationId),
        writerEpoch: counted(1),
        baseProgressRevision: counted(0),
        progress: counted({ phase: "draft" }),
        next: counted({ step: "continue" }),
      },
    ) as OutcomeEnvelope;

    const hidden = refused(kernel.submitOutcome(outsider, envelope));
    const missing = refused(kernel.submitOutcome(outsider, { ...outcomeFor("execution-404", dispatched) }));
    assert.deepEqual({ ...hidden }, { ...missing });
    assert.equal(hidden.classification, "unknown_destination");
    assert.equal(hidden.position, 0);
    assert.equal(hidden.executionId, null);
    assert.equal(reads, 0, "nothing past executionId was read for a caller that may not see the Execution");
    assert.deepEqual(view(kernel, executionId), before, "and nothing was recorded against the hidden Execution");
  });

  test("the takeover, recovery and protocol-failure controls scope first as well", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const before = view(kernel, executionId);
    const named = { activationId: dispatched.activationId, writerEpoch: 1 };
    const available = { definitionRevisions: [], runtimeContractRevisions: [], progressCodecs: [] };
    const calls: [string, (id: string) => ReturnType<ExecutionCoordinator["inspect"]> | { ok: boolean }][] = [
      ["takeover", (id) => kernel.requestTakeover(outsider, id, named)],
      ["recover", (id) => kernel.recoverExecution(outsider, id, { activationId: dispatched.activationId, available })],
      ["protocol failure", (id) => kernel.reportProtocolFailure(outsider, id, named)],
    ];
    for (const [label, call] of calls) {
      const hidden = refused(call(executionId) as never) as { classification: string; position: number; executionId: string | null };
      const missing = refused(call("execution-404") as never) as typeof hidden;
      assert.deepEqual({ ...hidden }, { ...missing }, `${label}: hidden and missing are indistinguishable`);
      assert.equal(hidden.classification, "unknown_destination", label);
    }
    assert.deepEqual(view(kernel, executionId), before, "none of them changed or recorded anything");
  });

  test("a caller that lost the scope is refused rather than handed the retained decision", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const envelope = outcomeFor(executionId, dispatched);
    accepted(kernel.submitOutcome(author, envelope));

    const revoked = caller("app-a", "tenant-other");
    const refusal = refused(kernel.submitOutcome(revoked, envelope));
    assert.equal(refusal.classification, "unknown_destination");
    assert.equal(refusal.executionId, null);
  });
});

describe("K1.2-C2 an exact duplicate replays; anything else under an accepted identity conflicts", () => {
  test("an exact duplicate returns the original receipt and decision, and changes nothing", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const envelope = outcomeFor(executionId, dispatched, { emissions: [{ emissionKey: "draft", value: { pages: 12 } }] });
    const first = accepted(kernel.submitOutcome(author, envelope));
    assert.equal(first.replayed, false);
    const after = view(kernel, executionId);

    const again = accepted(kernel.submitOutcome(author, envelope));
    assert.equal(again.replayed, true);
    assert.equal(again.receipt, first.receipt, "the same retained receipt object, not a reconstruction");
    const { replayed: _a, ...firstDecision } = first;
    const { replayed: _b, ...againDecision } = again;
    assert.deepEqual(againDecision, firstDecision);
    assert.deepEqual(view(kernel, executionId), after, "no second revision, Emission, receipt or refusal");
  });

  test("a replay is answered even after the next exchange has started, and the new exchange is untouched", () => {
    const { kernel, executionId } = created();
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const envelope = outcomeFor(executionId, first);
    const accepted1 = accepted(kernel.submitOutcome(author, envelope));
    input(kernel, executionId, "c1");
    const second = accepted(kernel.dispatch(author, executionId, { bound: 4 }));
    assert.notEqual(second.activationId, first.activationId);
    const before = view(kernel, executionId);

    const replay = accepted(kernel.submitOutcome(author, envelope));
    assert.equal(replay.receipt, accepted1.receipt);
    assert.deepEqual(view(kernel, executionId), before, "the open exchange kept its batch, epoch, state and dispositions");
  });

  test("changed content under an accepted Activation ID conflicts - including invalid content and a changed epoch", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const envelope = outcomeFor(executionId, dispatched);
    accepted(kernel.submitOutcome(author, envelope));

    const variants: [string, OutcomeEnvelope][] = [
      ["changed progress", { ...envelope, progress: { phase: "other" } }],
      ["changed next step", { ...envelope, next: { step: "fail", error: { code: "x" } } }],
      ["an added Emission", { ...envelope, emissions: [{ emissionKey: "e", value: 1 }] }],
      ["a different epoch", { ...envelope, writerEpoch: 2 }],
      // Content that could not be accepted now cannot equal what was accepted: the lookup precedes
      // validation (OA-2), so this is a conflict, not a malformed envelope.
      ["an invalid value", { ...envelope, progress: Number.NaN }],
      ["a proposed Effect", { ...envelope, effects: [{ operation: "publish_report" }] }],
    ];
    for (const [label, variant] of variants) {
      const before = view(kernel, executionId);
      const refusal = refused(kernel.submitOutcome(author, variant));
      assert.equal(refusal.classification, "duplicate_conflict", label);
      assertRefusedWhole(before, view(kernel, executionId), "duplicate_conflict");
    }
  });

  test("absent and empty Emission and Effect lists are the same content", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const first = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { emissions: [], effects: [] })));
    const again = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched)));
    assert.equal(again.replayed, true);
    assert.equal(again.receipt, first.receipt);
  });
});

describe("K1.2-C3 a new proposal must answer the open exchange, or it is refused whole", () => {
  test("an Activation ID that is not the open exchange is stale, and the exchange stays answerable", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const before = view(kernel, executionId);

    const refusal = refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, activationId: `${dispatched.activationId}-other` })));
    assert.equal(refusal.classification, "stale_exchange");
    assertRefusedWhole(before, view(kernel, executionId), "stale_exchange");

    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched)));
  });

  test("an epoch that was never issued is refused, never taken as authority", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...dispatched, writerEpoch: 2 })));
    assert.equal(refusal.classification, "stale_exchange");
    assert.match(refusal.reason, /has not been issued/);
    assertRefusedWhole(before, view(kernel, executionId), "stale_exchange");
  });

  test("a base progress revision the exchange was not pinned at is stale", () => {
    const { kernel, executionId } = created();
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, first)));
    const second = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    assert.equal(second.baseProgressRevision, 1);
    const before = view(kernel, executionId);

    const refusal = refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...second, baseProgressRevision: 0 })));
    assert.equal(refusal.classification, "stale_exchange");
    assertRefusedWhole(before, view(kernel, executionId), "stale_exchange");
  });

  test("with no exchange open, an Outcome answers nothing", () => {
    const { kernel, executionId } = created();
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, first)));
    const before = view(kernel, executionId);
    assert.equal(before.state, "READY");
    const refusal = refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...first, activationId: `${executionId}/activation-2` })));
    assert.equal(refusal.classification, "stale_exchange");
    assertRefusedWhole(before, view(kernel, executionId), "stale_exchange");
  });

  test("the exchange and attempt are named explicitly, never defaulted from the current one (PLAN-01)", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const omit = (field: keyof OutcomeEnvelope): OutcomeEnvelope => {
      const envelope: Record<string, unknown> = { ...outcomeFor(executionId, dispatched) };
      delete envelope[field];
      return envelope as unknown as OutcomeEnvelope;
    };
    for (const field of ["writerEpoch", "baseProgressRevision", "activationId"] as const) {
      const before = view(kernel, executionId);
      const refusal = refused(kernel.submitOutcome(author, omit(field)));
      assert.equal(refusal.classification, "malformed_envelope", field);
      assert.match(refusal.reason, new RegExp(field));
      assertRefusedWhole(before, view(kernel, executionId), "malformed_envelope");
    }
  });

  test("every content defect refuses the whole proposal and names itself", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const base = outcomeFor(executionId, dispatched);
    const cases: [string, Record<string, unknown>, RegExp][] = [
      ["missing progress", { ...base, progress: undefined }, /progress missing_field/],
      ["a non-boundary progress", { ...base, progress: { when: new Date(0) } }, /progress\.when unsupported_form/],
      ["missing next", { ...base, next: undefined }, /next missing_field/],
      ["an unknown next step", { ...base, next: { step: "pause" } }, /next\.step unsupported_form/],
      ["an extra field on next", { ...base, next: { step: "continue", wait: {} } }, /next\.wait unknown_field/],
      ["an unknown envelope field", { ...base, obligations: [] }, /obligations unknown_field/],
      ["a symbol-keyed envelope field", { ...base, [Symbol("x")]: 1 }, /envelope unknown_field/],
      ["emissions that are not a list", { ...base, emissions: { emissionKey: "a", value: 1 } }, /emissions unsupported_form/],
      ["an Emission that is not a record", { ...base, emissions: ["draft"] }, /emissions\[0\] unsupported_form/],
      ["an Emission with an extra field", { ...base, emissions: [{ emissionKey: "a", value: 1, kind: "x" }] }, /emissions\[0\]\.kind unknown_field/],
      ["a non-text Emission key", { ...base, emissions: [{ emissionKey: 7, value: 1 }] }, /emissions\[0\]\.emissionKey unsupported_form/],
      ["a missing Emission value", { ...base, emissions: [{ emissionKey: "a" }] }, /emissions\[0\]\.value missing_field/],
      ["a duplicate Emission key", { ...base, emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "a", value: 2 }] }, /emissions\[1\]\.emissionKey duplicate_key/],
      ["complete without a result", { ...base, next: { step: "complete" } }, /next\.result missing_field/],
      ["fail without an error", { ...base, next: { step: "fail" } }, /next\.error missing_field/],
      ["a fractional epoch", { ...base, writerEpoch: 1.5 }, /writerEpoch not_a_count/],
      ["a negative base revision", { ...base, baseProgressRevision: -1 }, /baseProgressRevision not_a_count/],
    ];
    for (const [label, envelope, reason] of cases) {
      const before = view(kernel, executionId);
      const refusal = refused(kernel.submitOutcome(author, envelope as unknown as OutcomeEnvelope));
      assert.equal(refusal.classification, "malformed_envelope", label);
      assert.match(refusal.reason, reason, label);
      assertRefusedWhole(before, view(kernel, executionId), "malformed_envelope");
    }
    // Refusing all of those left the exchange open for a corrected proposal from the same attempt.
    accepted(kernel.submitOutcome(author, base));
  });

  test("one refusal names every content issue, not only the first", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const refusal = refused(
      kernel.submitOutcome(author, { ...outcomeFor(executionId, dispatched), progress: Number.POSITIVE_INFINITY, next: { step: "pause" }, extra: 1 } as never),
    );
    assert.match(refusal.reason, /progress non_finite_number/);
    assert.match(refusal.reason, /next\.step unsupported_form/);
    assert.match(refusal.reason, /extra unknown_field/);
  });

  test("more Emissions than the declared limit are refused before commit as a capacity refusal", () => {
    const { kernel, executionId } = created({ emissionsPerOutcome: 2 });
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const three = [1, 2, 3].map((n) => ({ emissionKey: `e${n}`, value: n }));
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { emissions: three })));
    assert.equal(refusal.classification, "capacity_exhausted");
    assert.match(refusal.reason, /3 Emissions, above the declared limit of 2/);
    assertRefusedWhole(before, view(kernel, executionId), "capacity_exhausted");

    const two = accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { emissions: three.slice(0, 2) })));
    assert.equal(two.emissionIds.length, 2, "exactly at the limit is accepted");
  });

  test("an over-limit Emission list is refused without reading any element", () => {
    const { kernel, executionId } = created({ emissionsPerOutcome: 2 });
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    let elementReads = 0;
    const list = new Proxy([{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 2 }, { emissionKey: "c", value: 3 }], {
      get(target, property, receiver) {
        if (typeof property === "string" && /^\d+$/.test(property)) elementReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    assert.equal(refused(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { emissions: list }))).classification, "capacity_exhausted");
    assert.equal(elementReads, 0);
  });

  test("the declared Emission limit is configuration, checked at construction", () => {
    assert.throws(() => new ExecutionCoordinator({ driver: recordingDriver(), emissionsPerOutcome: 0 }), RangeError);
    assert.throws(() => new ExecutionCoordinator({ driver: recordingDriver(), emissionsPerOutcome: 1.5 }), RangeError);
  });

  test("the Kernel never redelivers or retries after refusing an Outcome (OA-5)", () => {
    const { kernel, driver, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const seen = driver.seen.length;
    const deliveries = view(kernel, executionId).activation?.deliveries;
    for (const bad of [
      outcomeFor(executionId, { ...dispatched, writerEpoch: 2 }),
      outcomeFor(executionId, dispatched, { progress: undefined }),
      outcomeFor(executionId, dispatched, { effects: [{ operation: "publish_report" }] }),
    ]) {
      refused(kernel.submitOutcome(author, bad));
    }
    assert.equal(driver.seen.length, seen, "no delivery was made on the Kernel's own initiative");
    assert.deepEqual(view(kernel, executionId).activation?.deliveries, deliveries, "and no delivery attempt was recorded");
  });
});

describe("K1.2-C4 one decision: the whole batch, the progress, the Emissions and the next step", () => {
  test("acceptance acknowledges exactly the reserved batch and installs everything else together", () => {
    const { kernel, executionId, initialEventId } = created();
    const correction = input(kernel, executionId, "c1");
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 2 }));
    assert.deepEqual(dispatched.batch, [initialEventId, correction]);
    const late = input(kernel, executionId, "c2");

    const progress = { phase: "await-editor", draftRef: "draft-1" };
    const answer = accepted(
      kernel.submitOutcome(
        author,
        outcomeFor(executionId, dispatched, {
          progress,
          emissions: [
            { emissionKey: "draft", value: { pages: 12 } },
            { emissionKey: "note", value: "sources checked" },
          ],
        }),
      ),
    );

    assert.equal(answer.receipt.boundary, "outcome_acceptance");
    assert.equal(answer.nextState, "READY");
    assert.equal(answer.progressRevision, 1);
    assert.deepEqual(answer.acknowledged, [initialEventId, correction]);
    assert.equal(answer.resultId, null);
    assert.deepEqual(answer.terminalDispositions, []);

    const after = view(kernel, executionId);
    assert.equal(after.state, "READY");
    assert.equal(after.activation, null, "the exchange is resolved");
    assert.deepEqual(after.acceptedProgress, progress);
    assert.equal(after.progressRevision, 1);
    assert.deepEqual(after.acknowledged, [initialEventId, correction], "the whole batch, not only what the Runtime used");
    assert.deepEqual(after.queued, [late], "an Event outside the batch is untouched");
    assert.deepEqual(
      after.mailbox.map((entry) => entry.disposition),
      [
        { kind: "acknowledged", activationId: dispatched.activationId },
        { kind: "acknowledged", activationId: dispatched.activationId },
        { kind: "queued" },
      ],
    );
    assert.deepEqual(
      after.emissions.map((emission) => [emission.emissionKey, emission.value, emission.activationId, emission.receipt]),
      [
        ["draft", { pages: 12 }, dispatched.activationId, answer.receipt],
        ["note", "sources checked", dispatched.activationId, answer.receipt],
      ],
    );
    assert.deepEqual(after.emissions.map((emission) => emission.emissionId), answer.emissionIds);
    assert.deepEqual(after.exchanges, [
      {
        activationId: dispatched.activationId,
        writerEpoch: 1,
        baseProgressRevision: 0,
        batch: [initialEventId, correction],
        dispatchReceipt: dispatched.receipt,
        outcomeReceipt: answer.receipt,
        deliveries: [{ attempt: 1, status: "delivered", failure: null }],
      },
    ]);
    assert.equal(after.receipts[after.receipts.length - 1], answer.receipt);
  });

  test("acknowledgment never reads progress: what progress says it handled changes nothing (R5-j6-2)", () => {
    const { kernel, executionId, initialEventId } = created();
    const correction = input(kernel, executionId, "c1");
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    assert.deepEqual(dispatched.batch, [initialEventId]);

    // The progress claims to refuse the batch member and to have handled an Event outside the batch.
    // A Kernel that parsed progress for compliance would leave the first unacknowledged or acknowledge
    // the second; whole-batch acknowledgment does neither.
    accepted(
      kernel.submitOutcome(
        author,
        outcomeFor(executionId, dispatched, { progress: { refused: [initialEventId], handled: [correction], acknowledge: [] } }),
      ),
    );
    const after = view(kernel, executionId);
    assert.deepEqual(after.acknowledged, [initialEventId]);
    assert.deepEqual(after.queued, [correction]);
  });

  test("one exchange has one accepted Outcome: a second, different one conflicts", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched)));
    const refusal = refused(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { progress: { phase: "second writer" } })));
    assert.equal(refusal.classification, "duplicate_conflict");
    assert.equal(view(kernel, executionId).progressRevision, 1);
  });

  test("Emission identity is a pure function of accepted identities", () => {
    const run = (): { ids: readonly string[]; other: readonly string[] } => {
      const { kernel, executionId } = created();
      // Unrelated activity on the same coordinator first: it must not shift any identity.
      accepted(kernel.createExecution(author, createRequest({ creationKey: "unrelated" })));
      const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
      const answer = accepted(
        kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 1 }] })),
      );
      return { ids: answer.emissionIds, other: [] };
    };
    const first = run();
    const second = run();
    assert.deepEqual(first.ids, second.ids);
    assert.notEqual(first.ids[0], first.ids[1], "two keys, two identities, even with equal values");
  });
});

describe("K1.2-C4 acceptance interacts with the K1.1 boundaries it completes", () => {
  test("acknowledgment frees declared mailbox capacity; reservation alone never does", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver, mailboxCapacity: 2 });
    const created = accepted(kernel.createExecution(author, createRequest()));
    input(kernel, created.executionId, "c1");
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));
    const full = refused(kernel.submitInput(author, { destination: created.executionId, requestKey: "c2", kind: "k", payload: 2 }));
    assert.equal(full.classification, "capacity_exhausted", "reserved Events still count: reservation is not acknowledgment");

    accepted(kernel.submitOutcome(author, outcomeFor(created.executionId, dispatched)));
    const room = accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "c2", kind: "k", payload: 2 }));
    assert.equal(room.replayed, false, "the acknowledged batch no longer occupies the mailbox's declared capacity");
  });

  test("a synchronous in-process Runtime can answer from inside delivery", () => {
    // The smallest Driver is a function that runs the Runtime and submits its Outcome before
    // `deliver` returns. The intent is recorded before the Driver is called, so the Outcome finds
    // its exchange open; the dispatch answer still describes the exchange it created.
    let answered: ReturnType<ExecutionCoordinator["submitOutcome"]> | undefined;
    const kernel: ExecutionCoordinator = new ExecutionCoordinator({
      driver: {
        driverId: "inline-runtime",
        deliver(activation, settlement) {
          settlement.delivered();
          answered = kernel.submitOutcome(author, {
            executionId: activation.executionId,
            activationId: activation.activationId,
            writerEpoch: activation.writerEpoch,
            baseProgressRevision: activation.baseProgressRevision,
            progress: { seen: activation.events.length },
            next: { step: "complete", result: { report: "week 37" } },
          });
          return undefined;
        },
      },
    });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 4 }));
    const answer = accepted(answered as NonNullable<typeof answered>);
    assert.equal(answer.activationId, dispatched.activationId);
    const after = view(kernel, created.executionId);
    assert.equal(after.state, "COMPLETED");
    assert.deepEqual(after.acceptedProgress, { seen: 1 });
    assert.deepEqual(after.exchanges[0]?.deliveries, [{ attempt: 1, status: "delivered", failure: null }]);
  });
});

describe("K1.2-C5 after `continue`, the next dispatch is a new exchange", () => {
  test("a new Activation ID, a newly selected (possibly empty) batch, the accepted progress unchanged", () => {
    const { kernel, driver, executionId } = created();
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const progress = { phase: "draft", draftRef: "draft-1" };
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, first, { progress })));

    const second = accepted(kernel.dispatch(author, executionId, { bound: 4 }));
    assert.notEqual(second.activationId, first.activationId, "a new exchange, not the old one resent");
    assert.deepEqual(second.batch, [], "`continue` with nothing queued dispatches an empty batch (K1.1-OPEN-4 now reachable)");
    assert.equal(second.baseProgressRevision, 1);
    // The binding's recorded choice (K1.2-DEC-5): each exchange numbers its attempts from 1. This
    // is not architecture - `identity.md` leaves it open - so only this binding is held to it here.
    assert.equal(second.writerEpoch, 1);

    const activation = driver.seen[driver.seen.length - 1];
    assert.ok(activation);
    assert.equal(activation.activationId, second.activationId);
    assert.deepEqual(activation.acceptedProgress, progress, "handed back exactly as accepted");
    assert.equal(activation.acceptedProgress, view(kernel, executionId).acceptedProgress, "the same retained capture, not a re-derived copy");
    assert.ok(Object.isFrozen(activation.acceptedProgress));
    assert.deepEqual(activation.events, []);
  });

  test("Events that arrived meanwhile are selected by the next exchange, in acceptance order", () => {
    const { kernel, executionId } = created();
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const a = input(kernel, executionId, "a");
    const b = input(kernel, executionId, "b");
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, first)));
    const second = accepted(kernel.dispatch(author, executionId, { bound: 4 }));
    assert.deepEqual(second.batch, [a, b]);
  });
});

describe("K1.2-C7 Effects, obligations and waits are refused whole", () => {
  test("an Effect-bearing Outcome is refused at envelope validation and leaves no action record", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const before = view(kernel, executionId);
    const refusal = refused(
      kernel.submitOutcome(
        author,
        outcomeFor(executionId, dispatched, {
          effects: [{ proposalKey: "publish", operation: "publish_report", input: { draftRef: "draft-1" } }],
          emissions: [{ emissionKey: "draft", value: 1 }],
        }),
      ),
    );
    assert.equal(refusal.classification, "malformed_envelope", "an envelope refusal, not a denial");
    assert.match(refusal.reason, /Effect proposals are not supported before K2/);
    const after = view(kernel, executionId);
    assertRefusedWhole(before, after, "malformed_envelope");

    // No Effect ID, denied-action, admission or settlement record exists anywhere in what the Kernel
    // exposes: an E2 attribution reading this Execution finds nothing it could mistake for a denial.
    const keys: string[] = [];
    const walk = (value: unknown): void => {
      if (value === null || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        keys.push(key);
        walk(child);
      }
    };
    walk(after);
    assert.deepEqual(
      keys.filter((key) => /effect|admission|admit|denied|denial|settle|intent|proposal/i.test(key)),
      [],
    );
    assert.notEqual(after.activation, null, "the Activation stays open");
    // A corrected Outcome from the same attempt is then accepted.
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched)));
  });

  test("the Effect list is refused by its length alone; no proposal is read", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    let reads = 0;
    const effects = Object.defineProperty([] as unknown[], "0", {
      get() {
        reads += 1;
        return { operation: "publish_report" };
      },
      enumerable: true,
    });
    assert.equal(refused(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { effects }))).classification, "malformed_envelope");
    assert.equal(reads, 0);
  });

  test("`complete` proposing an obligation is refused whole; with nothing outstanding it completes", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    for (const envelope of [
      outcomeFor(executionId, dispatched, { effects: [{ operation: "publish_report" }], next: { step: "complete", result: { ok: true } } }),
      outcomeFor(executionId, dispatched, { next: { step: "complete", result: { ok: true } }, obligations: [{ child: "c-1" }] }),
      outcomeFor(executionId, dispatched, { next: { step: "complete", result: { ok: true }, transfer: "owner-b" } }),
    ]) {
      const before = view(kernel, executionId);
      assert.equal(refused(kernel.submitOutcome(author, envelope)).classification, "malformed_envelope");
      assertRefusedWhole(before, view(kernel, executionId), "malformed_envelope");
    }
    // Every obligation kind is unsupported before K2.3, so the completion accounting check finds
    // nothing outstanding and a plain `complete` is accepted.
    assert.equal(accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { next: { step: "complete", result: { ok: true } } }))).nextState, "COMPLETED");
  });

  test("`await` is refused naming K1.3, and the wait is never read", () => {
    const { kernel, executionId } = created();
    const dispatched = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    let reads = 0;
    const next = Object.defineProperty({ step: "await" }, "wait", {
      get() {
        reads += 1;
        return { dependencies: [], subscriptions: [{ subscriptionClass: "editor-correction" }] };
      },
      enumerable: true,
    });
    const before = view(kernel, executionId);
    const refusal = refused(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { next })));
    assert.equal(refusal.classification, "malformed_envelope");
    assert.match(refusal.reason, /not supported before K1\.3/);
    assert.equal(reads, 0);
    assertRefusedWhole(before, view(kernel, executionId), "malformed_envelope");
    assert.equal(view(kernel, executionId).state, "RUNNING", "never WAITING");
  });
});

describe("K1.2-C12 Outcome acceptance has its own receipts", () => {
  test("each accepted boundary mints its own receipt at the Execution's next position; refusals mint none", () => {
    const { kernel, executionId } = created();
    const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    const outcome1 = accepted(kernel.submitOutcome(author, outcomeFor(executionId, first)));
    refused(kernel.submitOutcome(author, outcomeFor(executionId, first, { progress: "conflict" })));
    const second = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
    refused(kernel.submitOutcome(author, outcomeFor(executionId, { ...second, writerEpoch: 5 })));
    const outcome2 = accepted(kernel.submitOutcome(author, outcomeFor(executionId, second, { next: { step: "complete", result: 1 } })));

    const receipts = view(kernel, executionId).receipts;
    assert.deepEqual(
      receipts.map((receipt) => [receipt.boundary, receipt.position]),
      [
        ["creation", 1],
        ["dispatch_intent", 2],
        ["outcome_acceptance", 3],
        ["dispatch_intent", 4],
        ["outcome_acceptance", 5],
      ],
    );
    assert.equal(receipts[2], outcome1.receipt);
    assert.equal(receipts[4], outcome2.receipt);
    assert.equal(new Set(receipts.map((receipt) => receipt.token)).size, receipts.length);
    for (const receipt of receipts) assert.ok(Object.isFrozen(receipt));
  });
});
