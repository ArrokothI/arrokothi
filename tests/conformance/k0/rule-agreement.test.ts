/**
 * K0.2-C1/C6: the fixture's literal expectations agree with the accepted rules, derived independently.
 *
 * The scenarios state expected observations as literal data, which is auditable but could in principle
 * encode a misreading of the worksheet. So the rules are coded a second time, straight from W-1 and §3,
 * in `protocol-vocabulary.ts`, and this file checks the two derivations agree at the points where a
 * misreading would matter. Two independent derivations that agree is meaningfully stronger evidence
 * than either alone; it is still not proof that both readings of the worksheet are correct.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  boundaryValueDepth,
  checkWaitWellFormed,
  isEligibleUnderWait,
  selectOrdinaryBatch,
  selectWaitEndedBatch,
  VALUE_BOUNDS,
} from "./protocol-vocabulary.ts";
import type { FixtureEvent, WaitRecord } from "./protocol-vocabulary.ts";
import { k0Trace, staleTimerAndLostWake } from "./scenarios.ts";

// Rebuilt here from the worksheet rather than imported from the scenarios, so that agreement between
// the two is an actual finding and not a shared definition.
const X = "exec-x";
const billingOne: FixtureEvent = { eventId: "bq-1", destination: X, kind: "external.input", category: "application_input", subscriptionClass: "billing.question" };
const billingTwo: FixtureEvent = { eventId: "bq-2", destination: X, kind: "external.input", category: "application_input", subscriptionClass: "billing.question" };
const continueInput: FixtureEvent = { eventId: "cont-1", destination: X, kind: "external.input", category: "application_input", subscriptionClass: "continue" };
const resultEvent: FixtureEvent = { eventId: "res-1", destination: X, kind: "effect.result", category: "kernel_event", correlation: "corr-1" };
const timeout: FixtureEvent = { eventId: "to-g1", destination: X, kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: "g1" };

const subscriptionOnly: WaitRecord = { dependencies: [], subscriptions: [{ subscriptionClass: "continue" }], generation: "g1" };
const dependencyOnly: WaitRecord = { dependencies: [{ kinds: ["effect.result"], correlation: "corr-1" }], subscriptions: [], generation: "g1" };

describe("W-1 well-formedness is structural, and nothing more", () => {
  test("case 1: both lists empty is malformed, and a deadline does not rescue it", () => {
    assert.equal(checkWaitWellFormed({ dependencies: [], subscriptions: [], generation: "g" }).wellFormed, false);
    assert.equal(checkWaitWellFormed({ dependencies: [], subscriptions: [], deadline: 1_000, generation: "g" }).wellFormed, false);
  });

  test("case 2: a structurally valid but inert alternative still counts toward non-emptiness", () => {
    const inert: WaitRecord = { dependencies: [{ kinds: ["external.input"] }], subscriptions: [], generation: "g" };
    assert.equal(checkWaitWellFormed(inert).wellFormed, true);
    // ...and is nevertheless unable to make application input eligible.
    assert.equal(isEligibleUnderWait(inert, billingOne), false);
  });

  test("case 4: the subscription-only wait of W-8 is well formed on one subscription alone", () => {
    assert.equal(checkWaitWellFormed(subscriptionOnly).wellFormed, true);
  });

  test("an alternative supplying none of the three selector fields is malformed", () => {
    assert.equal(checkWaitWellFormed({ dependencies: [{}], subscriptions: [], generation: "g" }).wellFormed, false);
  });

  test("an empty supplied kind set is malformed, not a spelling of 'matches nothing'", () => {
    assert.equal(checkWaitWellFormed({ dependencies: [{ kinds: [] }], subscriptions: [], generation: "g" }).wellFormed, false);
  });
});

describe("W-1 eligibility follows source category first", () => {
  test("application input is eligible only through a declared subscription", () => {
    assert.equal(isEligibleUnderWait(subscriptionOnly, continueInput), true);
    assert.equal(isEligibleUnderWait(subscriptionOnly, billingOne), false);
  });

  test("a dependency alternative never makes application input eligible, however it is written", () => {
    const overReaching: WaitRecord = {
      dependencies: [{ kinds: ["external.input"] }, { eventIdentity: "cont-1" }],
      subscriptions: [],
      generation: "g",
    };
    assert.equal(isEligibleUnderWait(overReaching, continueInput), false);
  });

  test("a non-application Kernel Event is eligible only through a dependency alternative", () => {
    assert.equal(isEligibleUnderWait(dependencyOnly, resultEvent), true);
    assert.equal(isEligibleUnderWait(subscriptionOnly, resultEvent), false);
  });

  test("within one alternative the combinator is conjunction", () => {
    const bothFields: WaitRecord = { dependencies: [{ kinds: ["effect.result"], correlation: "corr-OTHER" }], subscriptions: [], generation: "g" };
    assert.equal(isEligibleUnderWait(bothFields, resultEvent), false);
  });

  test("the timeout Event is made eligible by neither list", () => {
    const namingTimeoutKind: WaitRecord = { dependencies: [{ kinds: ["kernel.wait.timeout"] }], subscriptions: [], generation: "g1" };
    assert.equal(isEligibleUnderWait(namingTimeoutKind, timeout), false);
    assert.equal(isEligibleUnderWait({ ...subscriptionOnly }, timeout), false);
  });
});

describe("§3's wait-ended batch rule agrees with the fixture's literal expectations", () => {
  test("W-8 case 4: at bound 1 the wake wins over older ineligible backlog", () => {
    const unacknowledged = [billingOne, billingTwo, continueInput];
    const derived = selectWaitEndedBatch(subscriptionOnly, unacknowledged, 1, "cont-1").map((event) => event.eventId);

    assert.deepEqual(derived, ["cont-1"]);
    // The literal expectation written into the scenario must say the same thing.
    assert.deepEqual(k0Trace.steps[7]?.expect.observation.dispatchedBatch, derived);
  });

  test("ordinary acceptance-order selection would have chosen the backlog, which is the bug being excluded", () => {
    const ordinary = selectOrdinaryBatch([billingOne, billingTwo, continueInput], 1).map((event) => event.eventId);
    assert.deepEqual(ordinary, ["bq-1"]);
    assert.notDeepEqual(ordinary, k0Trace.steps[7]?.expect.observation.dispatchedBatch);
  });

  test("a wait-ended batch is presented in acceptance order regardless of which member was mandatory", () => {
    const timeoutForG2: FixtureEvent = { eventId: "to-g2", destination: X, kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: "g2" };
    const laterResult: FixtureEvent = { eventId: "res-2", destination: X, kind: "effect.result", category: "kernel_event", correlation: "corr-2" };
    const waitOnCorr2: WaitRecord = { dependencies: [{ kinds: ["effect.result"], correlation: "corr-2" }], subscriptions: [], deadline: 2_000, generation: "g2" };

    const derived = selectWaitEndedBatch(waitOnCorr2, [timeoutForG2, laterResult], 4, "to-g2").map((event) => event.eventId);
    assert.deepEqual(derived, ["to-g2", "res-2"]);
    assert.deepEqual(staleTimerAndLostWake.steps[10]?.expect.observation.dispatchedBatch, derived);
  });

  test("B-1: a batch bound below 1 is rejected rather than silently producing an empty batch", () => {
    assert.throws(() => selectWaitEndedBatch(subscriptionOnly, [continueInput], 0, "cont-1"), /at least 1/);
    assert.throws(() => selectOrdinaryBatch([continueInput], 0), /at least 1/);
  });

  test("a mandatory member absent at reservation is an error, never a quietly shortened batch", () => {
    assert.throws(() => selectWaitEndedBatch(subscriptionOnly, [billingOne], 4, "cont-1"), /mandatory batch member/);
  });
});

describe("E-6's bounds are recorded with the accepted numbers", () => {
  test("the four semantic bounds match the accepted worksheet", () => {
    assert.deepEqual(VALUE_BOUNDS, {
      decodedStringLength: 65_536,
      containerEntryCount: 4_096,
      containerDepth: 32,
      canonicalRootBytes: 1_048_576,
    });
  });

  test("total depth counts empty containers and ignores member names", () => {
    assert.equal(boundaryValueDepth(null), 0);
    assert.equal(boundaryValueDepth("x"), 0);
    assert.equal(boundaryValueDepth([]), 1);
    assert.equal(boundaryValueDepth({}), 1);
    assert.equal(boundaryValueDepth({ aVeryLongMemberName: null }), 1);

    // E-6's A(n) construction: A1 = [], A(n+1) = [An].
    let nested: unknown = [];
    for (let level = 1; level < 32; level += 1) nested = [nested];
    assert.equal(boundaryValueDepth(nested), 32, "A32 sits exactly at the accepted bound");
    assert.equal(boundaryValueDepth([nested]), 33, "A33 is one past it");
  });

  test("the at-limit and one-past matrix itself is assigned to K1, not built here", () => {
    // E-6: "a K1 fixture tests exactly at and one past each bound". K0.2's contract assigns that
    // construction to K1.2. Recording the numbers is preparation; exercising every bound is not.
    assert.equal(VALUE_BOUNDS.containerDepth, 32);
  });
});
