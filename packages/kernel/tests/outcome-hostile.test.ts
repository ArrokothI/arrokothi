/**
 * K1.2-C13 - one reading of a caller-owned Outcome envelope, and a decision nothing ambient can steer.
 *
 * The Outcome envelope is the largest caller-owned object the Kernel reads, and it is read inside the
 * one decision K1.1's hardening was built to protect. These cases carry K1.1's rules to it:
 *
 * - own fields only (KC1-DEC-6): a field the envelope inherits reads as missing;
 * - one observation per field (KC1-DEC-3/4), and a field whose observation throws is a located
 *   refusal, never an exception escaping the boundary (K11-R16-ID-01);
 * - from the first caller observation to the last mutation, no live global, prototype method or
 *   ordinary indexed write (K11-R5-STATE-01, K11-R6-STATE-02, K11-R7-STATE-03), so pollution a
 *   getter installs mid-observation cannot drop, add or substitute anything in the accepted decision;
 * - a getter that reenters the Kernel is ordered entirely before this decision's checks
 *   (K1.2-DEC-10).
 *
 * Every case that installs pollution asserts that it was live across the call and restores it in a
 * `finally`, so a green result cannot come from pollution that never took effect.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator, type ExecutionView, type OutcomeEnvelope } from "../src/index.ts";
import {
  accepted,
  caller,
  createRequest,
  descriptorConversionIsHostile,
  inheritedIndexIsLive,
  outcomeFor,
  polluteDescriptorFields,
  recordingDriver,
  refused,
  revokedProxy,
  trapInheritedIndices,
  type DescriptorPollution,
  type InheritedIndexTrap,
} from "./harness.ts";

const author = caller("app-a", "tenant-a");

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

/**
 * `envelope` with `field` turned into an own getter that runs `effect` on its first read.
 *
 * Caller code runs during observation only where the envelope itself holds an accessor: value capture
 * refuses an accessor inside a value rather than invoking it (`values.md`), so a side effect has to be
 * installed at the envelope level to run inside the boundary call at all.
 */
function withSideEffect(envelope: OutcomeEnvelope, field: keyof OutcomeEnvelope, effect: () => void): OutcomeEnvelope {
  const value = envelope[field];
  let ran = false;
  const copy: Record<string, unknown> = { ...envelope };
  Object.defineProperty(copy, field, {
    get() {
      if (!ran) {
        ran = true;
        effect();
      }
      return value;
    },
    enumerable: true,
    configurable: true,
  });
  return copy as unknown as OutcomeEnvelope;
}

/** A dispatched Execution with a two-Event batch and one Event outside it. */
function open() {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const created = accepted(kernel.createExecution(author, createRequest()));
  const second = accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "second", kind: "k", payload: 2 }));
  const dispatched = accepted(kernel.dispatch(author, created.executionId, { bound: 2 }));
  const outside = accepted(kernel.submitInput(author, { destination: created.executionId, requestKey: "outside", kind: "k", payload: 3 }));
  return { kernel, executionId: created.executionId, batch: [created.initialEventId, second.eventId], outside: outside.eventId, dispatched };
}

describe("K1.2-C13 envelope fields are own data, observed once", () => {
  test("a field present only on a prototype reads as missing, never as the caller's", () => {
    const { kernel, executionId, dispatched } = open();
    const own = outcomeFor(executionId, dispatched);
    const { writerEpoch: _omit, ...withoutEpoch } = own;
    const saved = Object.getOwnPropertyDescriptor(Object.prototype, "writerEpoch");
    Object.defineProperty(Object.prototype, "writerEpoch", { value: 1, configurable: true, writable: true });
    try {
      const refusal = refused(kernel.submitOutcome(author, withoutEpoch as OutcomeEnvelope));
      assert.equal(refusal.classification, "malformed_envelope");
      assert.match(refusal.reason, /writerEpoch not_a_count/);
      // An envelope that inherits its whole content from a prototype owns nothing to accept.
      const inherited = Object.create(own) as OutcomeEnvelope;
      assert.equal(refused(kernel.submitOutcome(author, inherited)).classification, "unknown_destination");
    } finally {
      if (saved === undefined) delete (Object.prototype as Record<string, unknown>).writerEpoch;
      else Object.defineProperty(Object.prototype, "writerEpoch", saved);
    }
    assert.equal(view(kernel, executionId).progressRevision, 0);
  });

  test("each field is read exactly once, and the accepted decision is the one reading", () => {
    const { kernel, executionId, dispatched } = open();
    const reads: Record<string, number> = {};
    const envelope: Record<string, unknown> = {};
    const fields: Record<string, unknown> = {
      executionId,
      activationId: dispatched.activationId,
      writerEpoch: 1,
      baseProgressRevision: 0,
      progress: { phase: "first reading" },
      emissions: [{ emissionKey: "e", value: 1 }],
      effects: [],
      next: { step: "continue" },
    };
    for (const [key, value] of Object.entries(fields)) {
      Object.defineProperty(envelope, key, {
        get() {
          reads[key] = (reads[key] ?? 0) + 1;
          // A second reading would see a different value; the one reading is what is accepted.
          return key === "progress" && reads[key] > 1 ? { phase: "second reading" } : value;
        },
        enumerable: true,
      });
    }
    accepted(kernel.submitOutcome(author, envelope as unknown as OutcomeEnvelope));
    assert.deepEqual(reads, { executionId: 1, activationId: 1, writerEpoch: 1, baseProgressRevision: 1, progress: 1, emissions: 1, effects: 1, next: 1 });
    assert.deepEqual(view(kernel, executionId).acceptedProgress, { phase: "first reading" });
  });

  test("a field whose observation throws is a located refusal, not an escaping exception", () => {
    const { kernel, executionId, dispatched } = open();
    const cases: [string, Record<string, unknown>, RegExp][] = [
      ["a throwing progress getter", Object.defineProperty({ ...outcomeFor(executionId, dispatched) }, "progress", { get() { throw new Error("boom"); }, enumerable: true }), /progress unstable_representation/],
      ["a revoked next", { ...outcomeFor(executionId, dispatched), next: revokedProxy() }, /next unsupported_form/],
      ["a revoked Emission list", { ...outcomeFor(executionId, dispatched), emissions: revokedProxy() }, /emissions unsupported_form/],
      ["a revoked progress value", { ...outcomeFor(executionId, dispatched), progress: revokedProxy() }, /progress unstable_representation/],
      [
        "an envelope whose keys cannot be listed",
        new Proxy({ ...outcomeFor(executionId, dispatched) }, { ownKeys() { throw new Error("no keys"); } }),
        /envelope unstable_representation/,
      ],
    ];
    for (const [label, envelope, reason] of cases) {
      let result: ReturnType<ExecutionCoordinator["submitOutcome"]> | undefined;
      assert.doesNotThrow(() => {
        result = kernel.submitOutcome(author, envelope as unknown as OutcomeEnvelope);
      }, label);
      const refusal = refused(result as NonNullable<typeof result>);
      assert.equal(refusal.classification, "malformed_envelope", label);
      assert.match(refusal.reason, reason, label);
    }
    // An envelope whose execution identity cannot be read answers as an unknown destination.
    assert.equal(refused(kernel.submitOutcome(author, revokedProxy() as OutcomeEnvelope)).classification, "unknown_destination");
    assert.equal(refused(kernel.submitOutcome(author, null as unknown as OutcomeEnvelope)).classification, "unknown_destination");
    assert.equal(view(kernel, executionId).progressRevision, 0);
  });
});

describe("K1.2-C13 pollution installed during observation cannot steer the decision", () => {
  test("an inherited indexed accessor on Array.prototype drops nothing from the accepted lists", () => {
    const { kernel, executionId, batch, outside, dispatched } = open();
    let trap: InheritedIndexTrap | undefined;
    let liveAcrossTheCall = false;
    // Positions the acknowledgment list, the Emission-ID list, the Emission records and the
    // mailbox/receipt lists are about to occupy.
    const envelope = withSideEffect(
      outcomeFor(executionId, dispatched, {
        emissions: [
          { emissionKey: "a", value: 1 },
          { emissionKey: "b", value: 2 },
        ],
      }),
      "next",
      () => {
        trap = trapInheritedIndices(["0", "1", "2", "3", "4", "5", "6", "7"]);
      },
    );
    let answer: ReturnType<typeof accepted<{ acknowledged: readonly string[]; emissionIds: readonly string[] }>>;
    let swallowedByTheCall = -1;
    try {
      answer = accepted(kernel.submitOutcome(author, envelope));
      // Counted before the liveness probe, whose own control write the trap swallows by design.
      swallowedByTheCall = trap?.swallowed.length ?? -1;
      liveAcrossTheCall = inheritedIndexIsLive(0);
    } finally {
      trap?.restore();
    }
    assert.equal(liveAcrossTheCall, true, "the trap was live for the whole call");
    assert.equal(swallowedByTheCall, 0, "the Kernel wrote nothing through the inherited setters");
    assert.deepEqual([...answer.acknowledged], batch);
    assert.equal(answer.emissionIds.length, 2);
    const after = view(kernel, executionId);
    assert.deepEqual(after.acknowledged, batch);
    assert.deepEqual(after.queued, [outside]);
    assert.deepEqual(after.emissions.map((emission) => emission.emissionKey), ["a", "b"]);
    assert.equal(after.receipts[after.receipts.length - 1]?.boundary, "outcome_acceptance");
  });

  test("inherited descriptor fields on Object.prototype cannot make the commit throw or run a getter", () => {
    const { kernel, executionId, batch, dispatched } = open();
    let pollution: DescriptorPollution | undefined;
    let hostileAcrossTheCall = false;
    const envelope = withSideEffect(outcomeFor(executionId, dispatched, { emissions: [{ emissionKey: "a", value: 1 }] }), "next", () => {
      pollution = polluteDescriptorFields({ get: 1, set: () => {} });
    });
    let result: ReturnType<ExecutionCoordinator["submitOutcome"]> | undefined;
    try {
      result = kernel.submitOutcome(author, envelope);
      hostileAcrossTheCall = descriptorConversionIsHostile();
    } finally {
      pollution?.restore();
    }
    assert.equal(hostileAcrossTheCall, true, "an ordinary descriptor literal would have thrown");
    accepted(result as NonNullable<typeof result>);
    assert.deepEqual(view(kernel, executionId).acknowledged, batch);
  });

  test("builtins replaced mid-observation are not consulted by the checks or the commit", () => {
    const { kernel, executionId, batch, dispatched } = open();
    const saved = {
      push: Array.prototype.push,
      map: Array.prototype.map,
      mapSet: Map.prototype.set,
      mapGet: Map.prototype.get,
      freeze: Object.freeze,
      isInteger: Number.isInteger,
      isSafeInteger: Number.isSafeInteger,
      ownKeys: Reflect.ownKeys,
    };
    const sabotage = (): never => {
      throw new Error("a live builtin was consulted after observation began");
    };
    let installed = false;
    // `writerEpoch` is observed first inside the capture, so everything after it - every other
    // field, the unknown-field listing, the checks and the commit - runs with the sabotage live.
    const envelope = withSideEffect(outcomeFor(executionId, dispatched, { emissions: [{ emissionKey: "a", value: 1 }] }), "writerEpoch", () => {
      installed = true;
      Array.prototype.push = sabotage;
      Array.prototype.map = sabotage;
      Map.prototype.set = sabotage;
      Map.prototype.get = sabotage;
      Object.freeze = sabotage;
      Number.isInteger = sabotage;
      Number.isSafeInteger = sabotage;
      Reflect.ownKeys = sabotage;
    });
    let result: ReturnType<ExecutionCoordinator["submitOutcome"]> | undefined;
    try {
      result = kernel.submitOutcome(author, envelope);
    } finally {
      Array.prototype.push = saved.push;
      Array.prototype.map = saved.map;
      Map.prototype.set = saved.mapSet;
      Map.prototype.get = saved.mapGet;
      Object.freeze = saved.freeze;
      Number.isInteger = saved.isInteger;
      Number.isSafeInteger = saved.isSafeInteger;
      Reflect.ownKeys = saved.ownKeys;
    }
    assert.equal(installed, true);
    const answer = accepted(result as NonNullable<typeof result>);
    assert.deepEqual([...answer.acknowledged], batch);
    assert.ok(Object.isFrozen(answer.receipt));
    assert.ok(Object.isFrozen(answer.acknowledged));
    // The retained decision is really retained: an exact replay after restoring finds it.
    assert.equal(accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { emissions: [{ emissionKey: "a", value: 1 }] }))).replayed, true);
  });
});

describe("K1.2-C13 a getter that reenters the Kernel is ordered before this decision", () => {
  test("a takeover made from inside observation fences the Outcome being observed", () => {
    const { kernel, executionId, dispatched } = open();
    const envelope = withSideEffect(outcomeFor(executionId, dispatched), "next", () => {
      accepted(kernel.requestTakeover(author, executionId, { activationId: dispatched.activationId, writerEpoch: 1 }));
    });
    const refusal = refused(kernel.submitOutcome(author, envelope));
    assert.equal(refusal.classification, "stale_exchange", "the checks read the state the reentrant takeover left");
    assert.equal(view(kernel, executionId).progressRevision, 0);
  });

  test("an identical Outcome accepted from inside observation makes the outer one a replay", () => {
    const { kernel, executionId, dispatched } = open();
    let inner: ReturnType<ExecutionCoordinator["submitOutcome"]> | undefined;
    const envelope = withSideEffect(outcomeFor(executionId, dispatched), "next", () => {
      inner = kernel.submitOutcome(author, outcomeFor(executionId, dispatched));
    });
    const outer = accepted(kernel.submitOutcome(author, envelope));
    const first = accepted(inner as NonNullable<typeof inner>);
    assert.equal(outer.replayed, true);
    assert.equal(outer.receipt, first.receipt);
    assert.equal(view(kernel, executionId).progressRevision, 1, "one exchange, one accepted Outcome");
  });

  test("a different Outcome accepted from inside observation makes the outer one a conflict", () => {
    const { kernel, executionId, dispatched } = open();
    const envelope = withSideEffect(outcomeFor(executionId, dispatched, { progress: { phase: "outer" } }), "next", () => {
      accepted(kernel.submitOutcome(author, outcomeFor(executionId, dispatched, { progress: { phase: "inner" } })));
    });
    assert.equal(refused(kernel.submitOutcome(author, envelope)).classification, "duplicate_conflict");
    assert.deepEqual(view(kernel, executionId).acceptedProgress, { phase: "inner" });
  });
});
