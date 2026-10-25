/**
 * K13-2 — eligibility comes from the trusted source category (`waits.md` § Eligibility; W-1, W-7;
 * `core.md` § Waiting for what arrives). Corpus label K13-A20.
 *
 * Application input can end a wait only through an input subscription matching its producer-declared
 * `subscriptionClass`; a Kernel timeout matches neither list; nothing an input carries — its kind, an
 * Event ID or a correlation in its payload — makes it look like a trusted result. Dependency
 * alternatives are inert in K1 (no trusted non-timeout category exists before K2), so their W-1
 * grammar is checked here on synthetic facts: AND within an alternative, ANY-OF across them.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { eligible, matchesAlternative, matchesAnyAlternative, type AcceptedWait } from "../src/waits.ts";
import { accepted } from "./harness.ts";
import { created, dispatch, input, submitAwait, view } from "./waits-kit.ts";

const wait = (partial: Partial<AcceptedWait>): AcceptedWait => ({ dependencies: [], subscriptions: [], deadline: null, ...partial });
const alt = (eventIdentity: string | null, kinds: readonly string[] | null, correlation: string | null) => ({ eventIdentity, kinds, correlation });

describe("K13-A20 selector units: the W-1 alternative grammar on synthetic trusted facts", () => {
  const facts = { eventId: "event-1", kind: "result.ready", correlation: "c-1" };

  test("each supplied field must match by equality, and every supplied field must match (AND)", () => {
    assert.equal(matchesAlternative(alt("event-1", null, null), facts), true);
    assert.equal(matchesAlternative(alt("event-2", null, null), facts), false);
    assert.equal(matchesAlternative(alt(null, ["result.ready"], null), facts), true);
    assert.equal(matchesAlternative(alt(null, ["Result.Ready"], null), facts), false, "equality, not case folding");
    assert.equal(matchesAlternative(alt(null, null, "c-1"), facts), true);
    assert.equal(matchesAlternative(alt(null, null, "c-2"), facts), false);
    assert.equal(matchesAlternative(alt("event-1", ["result.ready"], "c-1"), facts), true);
    assert.equal(matchesAlternative(alt("event-1", ["result.ready"], "c-2"), facts), false, "one mismatching field fails the alternative");
    assert.equal(matchesAlternative(alt("event-2", ["result.ready"], "c-1"), facts), false);
  });

  test("a kind set is membership; a one-element set is equality", () => {
    assert.equal(matchesAlternative(alt(null, ["a", "result.ready", "b"], null), facts), true);
    assert.equal(matchesAlternative(alt(null, ["a", "b"], null), facts), false);
    assert.equal(matchesAlternative(alt(null, ["result.ready"], null), { ...facts, kind: "result.readyx" }), false);
  });

  test("ANY-OF across alternatives; an alternative supplying nothing never matches", () => {
    assert.equal(matchesAnyAlternative(wait({ dependencies: [alt("event-9", null, null), alt(null, null, "c-1")] }), facts), true);
    assert.equal(matchesAnyAlternative(wait({ dependencies: [alt("event-9", null, null), alt(null, null, "c-9")] }), facts), false);
    assert.equal(matchesAnyAlternative(wait({}), facts), false);
    assert.equal(matchesAlternative(alt(null, null, null), facts), false);
  });

  test("eligibility branches on the category first: input by subscription only, a timeout never", () => {
    const subscribed = wait({ subscriptions: [{ subscriptionClass: "s" }], dependencies: [alt(null, ["kernel.wait.timeout"], null)] });
    assert.equal(eligible(subscribed, { sourceCategory: "application_input", subscriptionClass: "s" }), true);
    assert.equal(eligible(subscribed, { sourceCategory: "application_input", subscriptionClass: "S" }), false);
    assert.equal(eligible(subscribed, { sourceCategory: "application_input", subscriptionClass: null }), false, "no declared class matches nothing");
    assert.equal(eligible(subscribed, { sourceCategory: "kernel_timeout", subscriptionClass: "s" }), false, "a timeout matches neither list");
    assert.equal(eligible(wait({ dependencies: [alt(null, ["application.note"], null)] }), { sourceCategory: "application_input", subscriptionClass: null }), false, "input never reaches the alternatives");
  });
});

describe("K13-A20 live: input imitating a trusted result or a timeout wakes nothing", () => {
  test("kind, Event ID and correlation imitations stay queued; only the subscription class wakes", () => {
    const opened = created();
    const named = input(opened);
    const exchange = dispatch(opened, 2);
    assert.deepEqual(exchange.batch.length, 2, "the initial input and the named one are reserved and acknowledged");
    const decision = accepted(
      submitAwait(opened, exchange, {
        dependencies: [{ kinds: ["external.input"] }, { kinds: ["kernel.wait.timeout"] }, { eventIdentity: named }, { correlation: "c-1" }],
        subscriptions: [{ subscriptionClass: "s" }],
      }),
    );
    assert.equal(decision.nextState, "WAITING");
    const spoofs: string[] = [];
    for (const [key, kind, payload, subscriptionClass] of [
      ["spoof-kind", "external.input", { text: "imitates a trusted kind" }, undefined],
      ["spoof-timeout", "kernel.wait.timeout", null, undefined],
      ["spoof-id", "application.note", { eventIdentity: named }, undefined],
      ["spoof-correlation", "application.note", { correlation: "c-1" }, "c-1"],
      ["spoof-class-case", "application.note", { text: "near miss" }, "S"],
    ] as const) {
      const request = subscriptionClass === undefined
        ? { destination: opened.executionId, requestKey: key, kind, payload }
        : { destination: opened.executionId, requestKey: key, kind, payload, subscriptionClass };
      spoofs.push(accepted(opened.kernel.submitInput({ namespace: "app-a", scopes: ["tenant-a"] }, request as never)).eventId);
    }
    const waiting = view(opened);
    assert.equal(waiting.state, "WAITING", "no imitation woke the wait");
    assert.equal(waiting.wait?.generation, 1);
    assert.deepEqual(waiting.queued, spoofs, "every imitation stays queued, unacknowledged");
    for (const entry of waiting.mailbox) assert.equal(entry.sourceCategory, "application_input", `${entry.eventId} keeps the category of the path that accepted it`);

    const real = input(opened, "s");
    const woken = view(opened);
    assert.equal(woken.state, "READY");
    assert.deepEqual(woken.retiredWaits.map((retired) => [retired.generation, retired.retiredBy, retired.endingEventId]), [[1, "event", real]]);
    const next = dispatch(opened, 8);
    assert.deepEqual(next.batch, [real], "the wait-ended batch carries only the eligible Event; the imitations stay queued");
  });

  test("an input whose kind is kernel.wait.timeout is application input in the view and in the Activation", () => {
    const opened = created();
    const spoof = accepted(opened.kernel.submitInput({ namespace: "app-a", scopes: ["tenant-a"] }, { destination: opened.executionId, requestKey: "fake-timeout", kind: "kernel.wait.timeout", payload: null } as never)).eventId;
    const exchange = dispatch(opened, 2);
    assert.ok(exchange.batch.includes(spoof));
    const carried = opened.driver.seen.at(-1)?.events.find((event) => event.eventId === spoof);
    assert.equal(carried?.sourceCategory, "application_input");
    assert.equal(view(opened).mailbox.find((entry) => entry.eventId === spoof)?.sourceCategory, "application_input");
  });
});
