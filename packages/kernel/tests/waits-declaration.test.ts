/**
 * K13-1 — the wait grammar and its well-formedness (`waits.md` § Declare; W-1). Corpus label K13-A19.
 *
 * One case per rule of design 01 § 3: the four malformed forms the brief names (both lists empty,
 * even with a deadline; an empty alternative; an empty kind set; an unknown field anywhere), the
 * declared forms of every value, identity text, the clock a deadline needs, and the 256-string bound
 * counted across every list. A refused wait refuses the whole Outcome as `malformed_envelope` and
 * changes nothing but the refusal list. Accepted, deliberately: duplicates, empty-string text and
 * alternatives nothing can match. Well-formedness is structural, never satisfiability.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { accepted, outcomeFor, refused } from "./harness.ts";
import { author, created, dispatch, grantOf, manualClock, submitAwait, view, waitOn, type Opened } from "./waits-kit.ts";

/** A fresh Execution with its first exchange open, and a clock at 5. */
function open(withClock = true): Opened & { readonly exchange: ReturnType<typeof dispatch> } {
  const opened = created({ clock: withClock ? manualClock(5) : null });
  const exchange = dispatch(opened);
  return { ...opened, exchange };
}

const selectors = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => ({ subscriptionClass: `${prefix}${index}` }));

const REFUSED: readonly (readonly [string, unknown, string])[] = [
  ["K13-A19 both lists empty", {}, "empty_wait"],
  ["K13-A19 both lists empty, even with a deadline", { deadline: 50 }, "empty_wait"],
  ["K13-A19 both lists present and empty", { dependencies: [], subscriptions: [] }, "empty_wait"],
  ["K13-A19 an alternative with no field", { dependencies: [{}] }, "empty_alternative"],
  ["K13-A19 an empty kind set", { dependencies: [{ kinds: [] }] }, "empty_kind_set"],
  ["K13-A19 an unknown alternative field", { dependencies: [{ kinds: ["k"], payload: { text: "x" } }] }, "unknown_field"],
  ["K13-A19 an unknown wait field", { subscriptions: [{ subscriptionClass: "a" }], interleave: true }, "unknown_field"],
  ["K13-A19 an unknown subscription field", { subscriptions: [{ subscriptionClass: "a", label: "b" }] }, "unknown_field"],
  ["K13-A19 subscriptions not a list", { subscriptions: "a" }, "unsupported_form"],
  ["K13-A19 dependencies not a list", { dependencies: { kinds: ["k"] } }, "unsupported_form"],
  ["K13-A19 a subscription that is not a record", { subscriptions: [5] }, "unsupported_form"],
  ["K13-A19 an alternative that is not a record", { dependencies: ["k"] }, "unsupported_form"],
  ["K13-A19 a subscription class that is not text", { subscriptions: [{ subscriptionClass: 5 }] }, "unsupported_form"],
  ["K13-A19 a subscription without its class", { subscriptions: [{}] }, "missing_field"],
  ["K13-A19 a kind set that is not a list", { dependencies: [{ kinds: "k" }] }, "unsupported_form"],
  ["K13-A19 a kind that is not text", { dependencies: [{ kinds: [7] }] }, "unsupported_form"],
  ["K13-A19 an event identity that is not text", { dependencies: [{ eventIdentity: 5 }] }, "unsupported_form"],
  ["K13-A19 a correlation that is not text", { dependencies: [{ correlation: null }] }, "unsupported_form"],
  ["K13-A19 a null deadline", { ...waitOn("a"), deadline: null }, "unsupported_form"],
  ["K13-A19 a negative deadline", { ...waitOn("a"), deadline: -1 }, "unsupported_form"],
  ["K13-A19 a fractional deadline", { ...waitOn("a"), deadline: 1.5 }, "unsupported_form"],
  ["K13-A19 a deadline as text", { ...waitOn("a"), deadline: "5" }, "unsupported_form"],
  ["K13-A19 a deadline beyond the safe integers", { ...waitOn("a"), deadline: Number.MAX_SAFE_INTEGER + 1 }, "unsupported_form"],
  ["K13-A19 a lone surrogate subscription class", { subscriptions: [{ subscriptionClass: "\ud800" }] }, "lone_surrogate"],
  ["K13-A19 a lone surrogate kind", { dependencies: [{ kinds: ["\udc00"] }] }, "lone_surrogate"],
  ["K13-A19 an over-long correlation", { dependencies: [{ correlation: "x".repeat(65_537) }] }, "string_too_long"],
  ["K13-A19 257 subscription classes", { subscriptions: selectors(257, "s") }, "too_many_selectors"],
  ["K13-A19 257 strings across every list", { dependencies: [{ eventIdentity: "e", kinds: selectors(100, "k").map((s) => s.subscriptionClass), correlation: "c" }], subscriptions: selectors(155, "s") }, "too_many_selectors"],
  ["K13-A19 257 strings in duplicate-heavy kind sets", { dependencies: [{ kinds: Array(200).fill("k") }, { kinds: Array(57).fill("k") }] }, "too_many_selectors"],
];

describe("K13-1 a malformed wait refuses the whole Outcome and changes nothing", () => {
  for (const [name, wait, code] of REFUSED) {
    test(name, () => {
      const opened = open();
      const before = view(opened);
      const refusal = refused(submitAwait(opened, opened.exchange, wait));
      assert.equal(refusal.classification, "malformed_envelope");
      assert.match(refusal.reason, new RegExp(code));
      const after = view(opened);
      assert.equal(after.refusals.length, before.refusals.length + 1);
      const { refusals: _a, ...restAfter } = after;
      const { refusals: _b, ...restBefore } = before;
      assert.deepEqual(restAfter, restBefore, "no acknowledgment, progress, wait, generation, readiness or state changed");
    });
  }

  test("K13-A19 a deadline on a coordinator without a clock is refused as deadline_unsupported", () => {
    const opened = open(false);
    const refusal = refused(submitAwait(opened, opened.exchange, waitOn("a", 10)));
    assert.equal(refusal.classification, "malformed_envelope");
    assert.match(refusal.reason, /deadline_unsupported/);
    assert.equal(view(opened).state, "RUNNING");
  });

  test("K13-A19 the wait itself is required, a record, and the await step owns nothing else", () => {
    for (const [next, code] of [
      [{ step: "await" }, "missing_field"],
      [{ step: "await", wait: 5 }, "unsupported_form"],
      [{ step: "await", wait: [] }, "unsupported_form"],
      [{ step: "await", wait: waitOn("a"), extra: true }, "unknown_field"],
    ] as const) {
      const opened = open();
      const refusal = refused(opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, opened.exchange, { next }), grantOf(opened.driver, opened.exchange.activationId)));
      assert.equal(refusal.classification, "malformed_envelope");
      assert.match(refusal.reason, new RegExp(code));
    }
  });

  test("K13-A19 a malformed wait from a stale or grant-less proposal discloses no content diagnostic", () => {
    const opened = open();
    const stale = refused(submitAwait(opened, opened.exchange, {}, { writerEpoch: 2 }));
    assert.equal(stale.classification, "stale_exchange");
    assert.doesNotMatch(stale.reason, /empty_wait/);
    const grantless = refused(opened.kernel.submitOutcome(author, outcomeFor(opened.executionId, opened.exchange, { next: { step: "await", wait: {} } }), { ...grantOf(opened.driver, opened.exchange.activationId) }));
    assert.equal(grantless.classification, "unauthorized_submission");
    assert.doesNotMatch(grantless.reason, /empty_wait/);
  });
});

const ACCEPTED: readonly (readonly [string, unknown])[] = [
  ["K13-A19 a subscription-only wait", waitOn("a")],
  ["K13-A19 a dependency-only wait (inert in K1)", { dependencies: [{ kinds: ["result.ready"] }] }],
  ["K13-A19 one kind is a one-element set", { dependencies: [{ kinds: ["result.ready"], correlation: "c-1" }] }],
  ["K13-A19 an alternative nothing can match still counts", { dependencies: [{ eventIdentity: "never-accepted" }], subscriptions: [] }],
  ["K13-A19 duplicate subscriptions", { subscriptions: [{ subscriptionClass: "a" }, { subscriptionClass: "a" }] }],
  ["K13-A19 duplicate alternatives and kinds", { dependencies: [{ kinds: ["k", "k"] }, { kinds: ["k", "k"] }] }],
  ["K13-A19 the empty string as a subscription class and a kind", { dependencies: [{ kinds: [""] }], subscriptions: [{ subscriptionClass: "" }] }],
  ["K13-A19 exactly 256 subscription classes", { subscriptions: selectors(256, "s") }],
  ["K13-A19 exactly 256 strings across every list", { dependencies: [{ eventIdentity: "e", kinds: selectors(100, "k").map((s) => s.subscriptionClass), correlation: "c" }], subscriptions: selectors(154, "s") }],
  ["K13-A19 a future deadline", waitOn("a", 50)],
];

describe("K13-1 a well-formed wait is accepted", () => {
  for (const [name, wait] of ACCEPTED) {
    test(name, () => {
      const opened = open();
      const decision = accepted(submitAwait(opened, opened.exchange, wait));
      assert.equal(decision.nextState, "WAITING");
      assert.deepEqual(decision.wait, { generation: 1, result: "waiting", timeoutEventId: null });
      assert.equal(view(opened).wait?.generation, 1);
    });
  }

  test("K13-A19 the accepted declaration is retained as frozen own data, absent fields as null", () => {
    const opened = open();
    accepted(submitAwait(opened, opened.exchange, { dependencies: [{ kinds: ["k"] }], subscriptions: [{ subscriptionClass: "a" }], deadline: 50 }));
    const declaration = view(opened).wait?.declaration;
    assert.deepEqual(declaration, { dependencies: [{ eventIdentity: null, kinds: ["k"], correlation: null }], subscriptions: [{ subscriptionClass: "a" }], deadline: 50 });
    assert.ok(Object.isFrozen(declaration) && Object.isFrozen(declaration?.dependencies) && Object.isFrozen(declaration?.subscriptions));
  });
});

describe("K13-1 the wait is part of the Outcome's content identity", () => {
  test("an exact retry replays, an absent list equals an empty one, and a changed wait conflicts", () => {
    const opened = open();
    const first = accepted(submitAwait(opened, opened.exchange, waitOn("a", 50)));
    const replay = accepted(submitAwait(opened, opened.exchange, { dependencies: [], subscriptions: [{ subscriptionClass: "a" }], deadline: 50 }));
    assert.equal(replay.replayed, true);
    assert.strictEqual(replay.receipt, first.receipt);
    assert.deepEqual(replay.wait, first.wait);
    for (const changed of [waitOn("a"), waitOn("a", 51), waitOn("b", 50), { ...waitOn("a", 50), dependencies: [{ kinds: ["k"] }] }]) {
      assert.equal(refused(submitAwait(opened, opened.exchange, changed)).classification, "duplicate_conflict");
    }
    assert.equal(view(opened).wait?.generation, 1, "no conflicting retry registered anything");
  });
});
