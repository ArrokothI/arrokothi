/**
 * K0.2-C1/C6: the fixture's literal expectations agree with the accepted rules, derived independently.
 *
 * The scenarios state expected observations as literal data, which is auditable but could in principle
 * encode a misreading of the worksheet. So the rules are coded a second time, straight from W-1 and §3,
 * in `protocol-vocabulary.ts`, and this file checks the two derivations agree at the points where a
 * misreading would matter. Two independent derivations that agree is meaningfully stronger evidence
 * than either alone; it is still not proof that both readings of the worksheet are correct.
 *
 * **And it is not evidence about a candidate at all.** Round-3 review finding K02-R3-01 made that
 * distinction the whole point: W-1's grammar rules were checked here, against the fixture's own
 * helper, and nowhere else — so a K1 candidate that accepted `{dependencies:[{}]}` or an empty kind
 * set passed every scenario, because no scenario ever submitted one. A helper agreeing with the
 * worksheet says nothing about what the candidate port enforces.
 *
 * The scenario corpus now submits those waits. The last suite in this file keeps the two derivations
 * welded together: each helper rejection reason must be the reason some scenario step actually expects
 * a candidate to record, so the helper's rule and the candidate's obligation cannot drift into being
 * two parallel statements again.
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
import { ALL_SCENARIOS, k0Trace, staleTimerAndLostWake, subscriptionWaitDeadline } from "./scenarios.ts";

// Rebuilt here from the worksheet rather than imported from the scenarios, so that agreement between
// the two is an actual finding and not a shared definition.
const X = "exec-x";
const billingOne: FixtureEvent = { eventId: "bq-1", destination: X, kind: "external.input", category: "application_input", producer: "prod-default", requestKey: "bq-1", subscriptionClass: "billing.question" };
const billingTwo: FixtureEvent = { eventId: "bq-2", destination: X, kind: "external.input", category: "application_input", producer: "prod-default", requestKey: "bq-2", subscriptionClass: "billing.question" };
const continueInput: FixtureEvent = { eventId: "cont-1", destination: X, kind: "external.input", category: "application_input", producer: "prod-default", requestKey: "cont-1", subscriptionClass: "continue" };
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

  test("W-8 case 6: at bound 1 a B-7 batch is exactly the timeout Event, however old the backlog is", () => {
    // The case the round-1 review found missing. The wait has no dependency alternatives at all, so
    // nothing in it could match a timeout; the mandatory member arrives by construction. Derived here
    // independently, then compared against the literal expectation the scenario writes down.
    const subscriptionOnlyWithDeadline: WaitRecord = {
      dependencies: [],
      subscriptions: [{ subscriptionClass: "continue" }],
      deadline: 1_000,
      generation: "gd1",
    };
    const timeoutForGd1: FixtureEvent = { eventId: "to-gd1", destination: X, kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: "gd1" };

    // bq-1 was accepted first and is ineligible; to-gd1 is the mandatory member.
    const derived = selectWaitEndedBatch(subscriptionOnlyWithDeadline, [billingOne, timeoutForGd1], 1, "to-gd1").map((event) => event.eventId);

    assert.deepEqual(derived, ["to-gd1"]);
    assert.equal(isEligibleUnderWait(subscriptionOnlyWithDeadline, timeoutForGd1), false, "the timeout is eligible via neither list");
    assert.deepEqual(subscriptionWaitDeadline.steps[5]?.expect.observation.dispatchedBatch, derived);

    // And the bug the control exists to catch: ordinary selection would have taken the older backlog.
    assert.deepEqual(selectOrdinaryBatch([billingOne, timeoutForGd1], 1).map((e) => e.eventId), ["bq-1"]);
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

describe("the helper's rules are the candidate's obligations, not a parallel statement", () => {
  // Round-3 review finding K02-R3-01. Every well-formedness rule coded above must correspond to a
  // rejection some scenario step requires a candidate to produce, with the same recorded reason. If a
  // rule is ever added here without a scenario submitting a wait that breaks it, this fails — which is
  // exactly the gap the finding identified, made impossible to reintroduce silently.
  const malformedWaits: readonly { readonly rule: string; readonly wait: WaitRecord }[] = [
    { rule: "rule 1: both lists empty", wait: { dependencies: [], subscriptions: [], deadline: 5_000, generation: "g-bad" } },
    { rule: "rule 2: no selector field supplied", wait: { dependencies: [{}], subscriptions: [], generation: "g-bad-2" } },
    { rule: "rule 2: empty supplied kind set", wait: { dependencies: [{ kinds: [] }], subscriptions: [], generation: "g-bad-3" } },
    // W-1's rule 3 is deliberately absent. Round-4 review finding K02-R4-01: the entry that used to
    // sit here submitted `subscriptionClass: ""` and required rejection, which is a spelling decision
    // W-9's *Left open* note assigns to K1.3, not a rule W-1 makes. Within this fixture's `string`
    // representation no submittable value fails the property W-1 states, so there is nothing honest to
    // put here; `coverage.ts` assigns R5-a4 to K1.3 rather than manufacturing a case.
  ];

  /**
   * Every wait a scenario submits, paired with whether that step requires the candidate to reject the
   * envelope. Keyed by the helper's own verdict rather than by message text: the reason wording is a
   * representational convention (see `compareRejection` in `fixture.ts`), so welding on it would pin
   * an arbitrary sentence. What matters is that the *rule* the helper applies is a rule some scenario
   * makes a candidate answer for.
   */
  const submittedWaits = ALL_SCENARIOS.flatMap((scenario) =>
    scenario.steps.flatMap((step) => {
      if (step.command.kind !== "submit_outcome") return [];
      const next = step.command.outcome.next;
      if (next.step !== "await") return [];
      return [{ scenario: scenario.id, wait: next.wait, rejected: step.expect.observation.rejection !== null }];
    }),
  );

  for (const { rule, wait } of malformedWaits) {
    test(`${rule} is rejected by the helper and demanded of a candidate by a scenario`, () => {
      const verdict = checkWaitWellFormed(wait);
      assert.equal(verdict.wellFormed, false, `the helper accepts a wait breaking ${rule}`);
      if (verdict.wellFormed) return;

      const matching = submittedWaits.filter((entry) => {
        const entryVerdict = checkWaitWellFormed(entry.wait);
        return !entryVerdict.wellFormed && entryVerdict.reason === verdict.reason;
      });
      assert.ok(
        matching.length > 0,
        `the helper rejects ${rule}, but no scenario submits a wait breaking it, so no candidate is ever held to it`,
      );
      assert.ok(
        matching.every((entry) => entry.rejected),
        `a scenario submits a wait breaking ${rule} without requiring the candidate to reject the envelope`,
      );
    });
  }

  test("the positive direction too: a valid-but-inert declaration is one a scenario requires a candidate to accept", () => {
    // The other half of K02-R3-01's first blind spot. Refusing a structurally valid wait is as much a
    // violation as registering a malformed one, and it needs a scenario that registers one.
    const inert: WaitRecord = { dependencies: [{ kinds: ["external.input"] }], subscriptions: [], generation: "g" };
    assert.equal(checkWaitWellFormed(inert).wellFormed, true);

    const registersAnInertWait = ALL_SCENARIOS.some((scenario) =>
      Object.values(scenario.waits ?? {}).some(
        (wait) =>
          wait.subscriptions.length === 0 &&
          wait.dependencies.some((alternative) => alternative.kinds?.includes("external.input") === true) &&
          scenario.steps.some((step) => step.expect.observation.liveWaitGeneration === wait.generation),
      ),
    );
    assert.ok(
      registersAnInertWait,
      "no scenario registers a wait whose only application-input alternative is inert, so a candidate auditing satisfiability would pass",
    );
  });
});
