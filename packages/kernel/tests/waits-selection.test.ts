/**
 * K13-5 — the batch after wait-ended readiness (`waits.md` § Selecting the batch; B-2, B-4, B-6–B-8).
 * Corpus labels K13-A01, K13-A04, K13-A14.
 *
 * The five small distinguishing examples run as five Kernel cases, each checking the exact batch and
 * the exact queue left behind. Three wrong rules are written as test-local selectors over the same
 * mailbox facts: ignoring eligibility, freezing candidates at the wake, and omitting the timeout's
 * membership. Each must fail at least one example. A fourth, sorting the correct union and truncating
 * without explicit mandatory-first priority, is **equivalent on reachable states** (design 01, addendum
 * 01 § A1): W-2 tests the backlog before it mints a timeout and an eligible arrival retires a live wait
 * before any fire, so every eligible candidate beside a real timeout was accepted after it. It passes
 * all five, which this file asserts. One synthetic selector input, which no Kernel history can reach,
 * checks the literal mandatory-first rule of `selectWaitEndedBatch`.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { selectWaitEndedBatch, type AcceptedWait } from "../src/waits.ts";
import type { ExecutionView, MailboxEntryView } from "../src/index.ts";
import { accepted } from "./harness.ts";
import { created, dispatch, input, manualClock, submitAwait, submitNext, view, waitKey, waitOn, type Opened } from "./waits-kit.ts";

/** What a selector sees at reservation, plus the queue as it stood at the wake. */
interface Facts {
  readonly queued: readonly MailboxEntryView[];
  readonly atWake: readonly string[];
  readonly species: "event" | "deadline";
  readonly timeoutEventId: string | null;
  readonly bound: number;
}

type Selector = (facts: Facts) => string[];
const isEligible = (entry: MailboxEntryView): boolean => entry.sourceCategory === "application_input" && entry.subscriptionClass === "s";
const inOrder = (facts: Facts, ids: ReadonlySet<string>): string[] => facts.queued.filter((entry) => ids.has(entry.eventId)).map((entry) => entry.eventId);

const SELECTORS: Record<string, Selector> = {
  /** The owned rule: candidates eligible at reservation; the mandatory member first; acceptance order. */
  owned: (facts) => {
    const candidates = facts.queued.filter(isEligible);
    const mandatory = facts.species === "deadline" ? facts.timeoutEventId! : candidates[0]!.eventId;
    const chosen = new Set([mandatory]);
    for (const entry of candidates) if (chosen.size < facts.bound) chosen.add(entry.eventId);
    return inOrder(facts, chosen);
  },
  /** Wrong: ignores eligibility, so ineligible backlog fills spare capacity. */
  "ignore eligibility": (facts) => {
    const mandatory = facts.species === "deadline" ? facts.timeoutEventId! : facts.queued.find(isEligible)!.eventId;
    const chosen = new Set([mandatory]);
    for (const entry of facts.queued) if (chosen.size < facts.bound) chosen.add(entry.eventId);
    return inOrder(facts, chosen);
  },
  /** Wrong: candidates frozen at the wake, so later eligible arrivals are never candidates. */
  "freeze at wake": (facts) => {
    const frozen = facts.queued.filter((entry) => facts.atWake.includes(entry.eventId) && isEligible(entry));
    const mandatory = facts.species === "deadline" ? facts.timeoutEventId! : frozen[0]!.eventId;
    const chosen = new Set([mandatory]);
    for (const entry of frozen) if (chosen.size < facts.bound) chosen.add(entry.eventId);
    return inOrder(facts, chosen);
  },
  /** Wrong: the timeout is not a member, so only eligible Events travel. */
  "omit timeout membership": (facts) => {
    const candidates = facts.queued.filter(isEligible);
    return inOrder(facts, new Set(candidates.slice(0, facts.bound).map((entry) => entry.eventId)));
  },
  /** Equivalent on reachable states: the correct union, sorted and truncated, with no priority step. */
  "sort union": (facts) => {
    const union = facts.queued.filter((entry) => isEligible(entry) || entry.eventId === facts.timeoutEventId);
    return union.slice(0, facts.bound).map((entry) => entry.eventId);
  },
};

interface Example {
  readonly name: string;
  readonly bound: number;
  /** Builds the situation, returning the facts at reservation and the named Events. */
  readonly build: () => { readonly opened: Opened; readonly atWake: readonly string[]; readonly names: Record<string, string> };
  readonly batch: readonly string[];
  readonly remaining: readonly string[];
}

/** `WAITING` on class `s` (deadline 10 when `withDeadline`), with older ineligible input U queued. */
function waitingWithU(withDeadline: boolean): { opened: Opened; U: string } {
  const opened = created({ clock: manualClock(0) });
  const exchange = dispatch(opened);
  accepted(submitAwait(opened, exchange, waitOn("s", withDeadline ? 10 : undefined)));
  const U = input(opened, "x");
  return { opened, U };
}

const queuedIds = (v: ExecutionView): string[] => v.queued.slice();

const EXAMPLES: readonly Example[] = [
  {
    name: "Event wake, bound 1, U/E1/E2 present",
    bound: 1,
    build: () => {
      const { opened, U } = waitingWithU(false);
      const E1 = input(opened, "s");
      const atWake = queuedIds(view(opened));
      const E2 = input(opened, "s");
      return { opened, atWake: [...atWake, E2], names: { U, E1, E2 } };
    },
    batch: ["E1"],
    remaining: ["U", "E2"],
  },
  {
    name: "Event wake, bound 3, U/E1 present (spare capacity)",
    bound: 3,
    build: () => {
      const { opened, U } = waitingWithU(false);
      const E1 = input(opened, "s");
      return { opened, atWake: queuedIds(view(opened)), names: { U, E1 } };
    },
    batch: ["E1"],
    remaining: ["U"],
  },
  {
    name: "E2 arrives after the wake, before reservation; bound 2",
    bound: 2,
    build: () => {
      const { opened, U } = waitingWithU(false);
      const E1 = input(opened, "s");
      const atWake = queuedIds(view(opened));
      const E2 = input(opened, "s");
      return { opened, atWake, names: { U, E1, E2 } };
    },
    batch: ["E1", "E2"],
    remaining: ["U"],
  },
  {
    name: "expiry T accepted, eligible R follows; bound 1",
    bound: 1,
    build: () => {
      const { opened, U } = waitingWithU(true);
      opened.clock.set(10);
      const T = opened.kernel.fireTimer(waitKey(opened.executionId, 1)).timeoutEventId!;
      const atWake = queuedIds(view(opened));
      const R = input(opened, "s");
      return { opened, atWake, names: { U, T, R } };
    },
    batch: ["T"],
    remaining: ["U", "R"],
  },
  {
    name: "the same expiry; bound 2",
    bound: 2,
    build: () => {
      const { opened, U } = waitingWithU(true);
      opened.clock.set(10);
      const T = opened.kernel.fireTimer(waitKey(opened.executionId, 1)).timeoutEventId!;
      const atWake = queuedIds(view(opened));
      const R = input(opened, "s");
      return { opened, atWake, names: { U, T, R } };
    },
    batch: ["T", "R"],
    remaining: ["U"],
  },
];

/** Runs one example through the Kernel, returning the selectors' facts and the named expectations. */
function run(example: Example) {
  const { opened, atWake, names } = example.build();
  const before = view(opened);
  const readiness = before.waitEndedReadiness!;
  const facts: Facts = {
    queued: before.mailbox.filter((entry) => entry.disposition.kind === "queued"),
    atWake,
    species: readiness.species,
    timeoutEventId: readiness.timeoutEventId,
    bound: example.bound,
  };
  const exchange = dispatch(opened, example.bound);
  const after = view(opened);
  const name = (id: string) => Object.entries(names).find(([, value]) => value === id)?.[0] ?? id;
  return { opened, facts, exchange, after, names, name };
}

describe("K13-A01 the five small distinguishing examples, as Kernel cases", () => {
  for (const example of EXAMPLES) {
    test(example.name, () => {
      const { exchange, after, names, name } = run(example);
      assert.deepEqual(exchange.batch.map(name), example.batch, "the exact batch, in acceptance order");
      assert.deepEqual(after.queued.filter((id) => !exchange.batch.includes(id)).map(name), example.remaining, "the exact queue left behind");
      assert.equal(after.waitEndedReadiness, null, "readiness is consumed by this one reservation");
      for (const id of exchange.batch) assert.equal(after.mailbox.find((entry) => entry.eventId === id)?.disposition.kind, "queued", "reservation acknowledges nothing (B-3)");
      void names;
    });
  }
});

describe("K13-A01 the discrimination: each wrong rule fails an example; sort-union is equivalent", () => {
  const outcomes = EXAMPLES.map((example) => {
    const { facts, exchange } = run(example);
    return { example, facts, kernel: exchange.batch };
  });

  test("the owned selector reproduces every Kernel batch", () => {
    for (const { example, facts, kernel } of outcomes) assert.deepEqual(SELECTORS.owned!(facts), [...kernel], example.name);
  });

  for (const wrong of ["ignore eligibility", "freeze at wake", "omit timeout membership"]) {
    test(`"${wrong}" fails at least one of the five`, () => {
      const failing = outcomes.filter(({ facts, kernel }) => JSON.stringify(SELECTORS[wrong]!(facts)) !== JSON.stringify(kernel)).map(({ example }) => example.name);
      assert.ok(failing.length > 0, `${wrong} passed all five`);
    });
  }

  test("sort-union passes all five: an equivalent mutant on reachable states, recorded under 012", () => {
    for (const { example, facts, kernel } of outcomes) assert.deepEqual(SELECTORS["sort union"]!(facts), [...kernel], example.name);
  });

  test("synthetic selector input (not a reachable Kernel history): eligible R older than T, bound 1, keeps T", () => {
    const selector: AcceptedWait = { dependencies: [], subscriptions: [{ subscriptionClass: "s" }], deadline: 10 };
    const queued = [
      { eventId: "R", sourceCategory: "application_input" as const, subscriptionClass: "s" },
      { eventId: "T", sourceCategory: "kernel_timeout" as const, subscriptionClass: null },
    ];
    assert.deepEqual(selectWaitEndedBatch(queued, { species: "deadline", selector, timeoutEventId: "T" }, 1), [1], "the mandatory timeout first, however old the eligible Event");
    assert.deepEqual(selectWaitEndedBatch(queued, { species: "deadline", selector, timeoutEventId: "T" }, 2), [0, 1], "presented in acceptance order");
    assert.equal(selectWaitEndedBatch(queued, { species: "deadline", selector, timeoutEventId: "missing" }, 1), null, "a mandatory member that is not queued is an invariant violation");
  });
});

describe("K13-A14 membership, order and truncation", () => {
  test("a timeout at bound 3 beside two ineligible backlog entries travels alone", () => {
    const { opened } = waitingWithU(true);
    input(opened, "x");
    opened.clock.set(10);
    const T = opened.kernel.fireTimer(waitKey(opened.executionId, 1)).timeoutEventId!;
    const exchange = dispatch(opened, 3);
    assert.deepEqual(exchange.batch, [T]);
    assert.equal(view(opened).queued.length, 3, "ineligible backlog is never topped up into spare capacity");
  });

  test("eligible candidates beyond the bound after a wake: the earliest fill it, the rest stay queued", () => {
    const { opened } = waitingWithU(false);
    const E1 = input(opened, "s");
    const E2 = input(opened, "s");
    const E3 = input(opened, "s");
    const exchange = dispatch(opened, 2);
    assert.deepEqual(exchange.batch, [E1, E2]);
    assert.ok(view(opened).queued.includes(E3));
  });

  test("the batch after a wait-ended batch is ordinary again, and redelivery keeps the pinned batch", () => {
    const { opened, U } = waitingWithU(false);
    const E1 = input(opened, "s");
    const exchange = dispatch(opened, 2);
    assert.deepEqual(exchange.batch, [E1]);
    const resent = accepted(opened.kernel.redeliver({ namespace: "app-a", scopes: ["tenant-a"] } as never, opened.executionId));
    assert.deepEqual(resent.batch, [E1], "redelivery never re-selects (B-8)");
    accepted(submitNext(opened, exchange));
    assert.deepEqual(dispatch(opened, 2).batch, [U], "after a continue the reservation is ordinary: acceptance order");
  });
});

describe("K13-A04 a new registration owns its own selector", () => {
  for (const [first, second] of [["s", "x"], ["x", "s"]] as const) {
    test(`wait on ${first}, wake, wait on ${second}: ${first} input stays queued, ${second} wakes`, () => {
      const opened = created({ clock: manualClock(0) });
      accepted(submitAwait(opened, dispatch(opened), waitOn(first)));
      input(opened, first);
      accepted(submitAwait(opened, dispatch(opened), waitOn(second)));
      const stale = input(opened, first);
      assert.equal(view(opened).state, "WAITING", "no satisfaction from the earlier selector survives");
      const fresh = input(opened, second);
      assert.equal(view(opened).state, "READY");
      const batch = dispatch(opened, 4).batch;
      assert.deepEqual(batch, [fresh], "the batch excludes the input only the earlier selector matched");
      assert.ok(view(opened).queued.includes(stale));
    });
  }

  test("an alternative naming a kind plus a subscription: input matching the kind's spelling stays queued", () => {
    const opened = created({ clock: manualClock(0) });
    accepted(submitAwait(opened, dispatch(opened), { dependencies: [{ kinds: ["application.note"] }], subscriptions: [{ subscriptionClass: "x" }] }));
    const kindOnly = input(opened);
    assert.equal(view(opened).state, "WAITING", "an input never reaches the dependency alternatives");
    const subscribed = input(opened, "x");
    assert.deepEqual(dispatch(opened, 4).batch, [subscribed]);
    assert.ok(view(opened).queued.includes(kindOnly));
  });
});
