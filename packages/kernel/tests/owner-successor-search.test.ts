/**
 * K1.3 design 03's declared bounded search of the owner's successor check (Q6, revised for D03-CHK-05).
 *
 * **Seam.** Each seed is reached by public calls. Each family's base plan is a genuine plan the public
 * coordinator forms on that seed, captured before the owner is reached (`planned`); its variants are
 * applied straight to the owner's one entry, `KernelState.prototype.apply`, with the seed's current
 * basis. A refused variant changes nothing (asserted), so the seed is reused; an accepted one rebuilds
 * the seed and recaptures its plans.
 *
 * **Oracle.** For every variant the independent reference (`successor-reference.ts`) applies the plan to
 * a reading of the seed and judges it. The owner must accept exactly when the reference does. A refusal
 * must name the reference's first broken rule and change nothing. An acceptance must leave the governed
 * fields the reference computed, a record both the owner's post-state witness and the reference's P find
 * clean, and every guard `preservationViolations` restates from design 02. Each seed itself must satisfy
 * both P's before any variant runs.
 *
 * **Templates.** A field the base plan leaves `null` takes its non-null values from a genuine plan of
 * the same seed (the live, woken and expired registrations of `await`), or, for a wake or a cancellation
 * retirement on a seed with no live wait, from the same plan formed on the `W` seed.
 *
 * **Domain.** Exactly the families below. Their sizes and the verdicts by rule are frozen in
 * `owner-successor-search.json`; a change to a domain or to the owner shows as a difference there. No
 * claim reaches other seeds, other values, or plans the coordinator's types cannot carry.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import type { MailboxDisposition } from "../src/index.ts";
import type { ExecutionState } from "../src/lifecycle.ts";
import type { Plan } from "../src/plan.ts";
import { KernelState } from "../src/state.ts";
import { accepted, recordOwn } from "./harness.ts";
import { governedDifferences, postStateRule, preservationViolations, referenceDecision, referenceRecord, refusalClause } from "./successor-reference.ts";
import { author, created, dispatch, input, submitAwait, submitNext, waitKey, waitOn, type Exchange, type Opened } from "./waits-kit.ts";

const ReflectApply = Reflect.apply;
const freeze = Object.freeze;
const originalApply = KernelState.prototype.apply;
const find = KernelState.prototype.find;
const postStateViolation = KernelState.prototype.postStateViolation;

type PlanOf<K extends Plan["kind"]> = Extract<Plan, { kind: K }>;

// -- Capturing plans and owners --------------------------------------------------------------------

let capture: ((plan: Plan, owner: KernelState) => void) | null = null;
const CAPTURED = freeze({ captured: true });
KernelState.prototype.apply = function (this: KernelState, plan: Plan): void {
  if (capture !== null) {
    capture(plan, this);
    throw CAPTURED;
  }
  ReflectApply(originalApply, this, [plan]);
};

/** The first plan `run` hands the owner, and the owner, without reaching it. */
function planned(run: () => unknown): { plan: Plan; owner: KernelState } {
  const found: { plan: Plan; owner: KernelState }[] = [];
  capture = (plan, owner) => recordOwn(found, { plan, owner });
  try {
    run();
  } catch (error) {
    if (error !== CAPTURED) throw error;
  } finally {
    capture = null;
  }
  assert.equal(found.length, 1, "the operation hands the owner a plan");
  return found[0]!;
}

// -- Seeds and their base plans --------------------------------------------------------------------

interface Seed {
  readonly opened: Opened;
  readonly exchange: Exchange | null;
}

const cancel = (opened: Opened) => opened.kernel.cancelExecution(author, opened.executionId);
const executionKey = (executionId: string) => ({ executionId, kind: "execution_deadline" as const, generation: null });

const waiting = (): Seed => {
  const opened = created();
  const exchange = dispatch(opened, 1);
  input(opened, "x");
  accepted(submitAwait(opened, exchange, waitOn("s", 5)));
  return { opened, exchange: null };
};

/** Each seed, built by public calls only. Every mailbox holds two or three entries. */
const SEEDS: Readonly<Record<string, () => Seed>> = {
  /** READY, two queued entries. */
  R0: () => {
    const opened = created();
    input(opened, "s");
    return { opened, exchange: null };
  },
  /** READY, two queued entries, Execution deadline 5 due. */
  R0d: () => {
    const opened = created({ executionDeadline: 5 });
    input(opened, "s");
    opened.clock.set(5);
    return { opened, exchange: null };
  },
  /** RUNNING, batch [e0], an eligible `s` entry queued behind it. */
  R1: () => {
    const opened = created();
    input(opened, "s");
    return { opened, exchange: dispatch(opened, 1) };
  },
  /** RUNNING with an empty reserved batch: nothing was queued when it was dispatched. */
  R1e: () => {
    const opened = created();
    accepted(submitNext(opened, dispatch(opened, 1)));
    return { opened, exchange: dispatch(opened, 1) };
  },
  /** RUNNING after a prior retirement: g1 expired at registration, batch [T1], an eligible `s` entry queued. */
  R2: () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened, 1), waitOn("x", 0)));
    input(opened, "s");
    return { opened, exchange: dispatch(opened, 1) };
  },
  /** WAITING on g1 with deadline 5, one ineligible entry queued. */
  W: waiting,
  /** READY with Event readiness. */
  RE: () => {
    const seed = waiting();
    input(seed.opened, "s");
    return seed;
  },
  /** READY with deadline readiness, T1 queued. */
  RD: () => {
    const seed = waiting();
    seed.opened.clock.set(5);
    assert.equal(seed.opened.kernel.fireTimer(waitKey(seed.opened.executionId, 1)).result, "expired");
    return seed;
  },
  /** COMPLETED. */
  XC: () => {
    const opened = created();
    accepted(submitNext(opened, dispatch(opened, 4), { step: "complete", result: null }));
    return { opened, exchange: null };
  },
  /** CANCELLED. */
  XK: () => {
    const opened = created();
    accepted(cancel(opened));
    return { opened, exchange: null };
  },
};

/** The genuine operations a family's base plan comes from. */
const BASES: Readonly<Record<string, (seed: Seed) => unknown>> = {
  dispatch: ({ opened }) => dispatch(opened, 1),
  inputS: ({ opened }) => input(opened, "s"),
  inputX: ({ opened }) => input(opened, "x"),
  cancel: ({ opened }) => cancel(opened),
  fire: ({ opened }) => opened.kernel.fireTimer(executionKey(opened.executionId)),
  expiry: ({ opened }) => {
    opened.clock.set(5);
    return opened.kernel.fireTimer(waitKey(opened.executionId, 1));
  },
  continue: ({ opened, exchange }) => submitNext(opened, exchange!),
  live: ({ opened, exchange }) => submitAwait(opened, exchange!, waitOn("x")),
  woken: ({ opened, exchange }) => submitAwait(opened, exchange!, waitOn("s")),
  expired: ({ opened, exchange }) => submitAwait(opened, exchange!, waitOn("x", 0)),
  complete: ({ opened, exchange }) => submitNext(opened, exchange!, { step: "complete", result: true }),
  fail: ({ opened, exchange }) => submitNext(opened, exchange!, { step: "fail", error: { reason: "x" } }),
};

/** One built seed: its owner, and its base plans as captured. */
interface Context {
  readonly seed: Seed;
  readonly owner: KernelState;
  readonly plans: Map<string, Plan>;
}

function context(seedName: string): Context {
  const seed = SEEDS[seedName]!();
  const owner = planned(() => seed.opened.kernel.submitInput(author, { destination: seed.opened.executionId, requestKey: "owner-probe", kind: "application.note", payload: 1 })).owner;
  return { seed, owner, plans: new Map() };
}

function basePlan(at: Context, base: string): Plan {
  const known = at.plans.get(base);
  if (known !== undefined) return known;
  const { plan } = planned(() => BASES[base]!(at.seed));
  at.plans.set(base, plan);
  return plan;
}

// -- Value domains ---------------------------------------------------------------------------------

const STATES: readonly ExecutionState[] = ["READY", "RUNNING", "WAITING", "COMPLETED", "FAILED", "CANCELLED"];
const OTHER_SELECTOR = freeze({ dependencies: freeze([]), subscriptions: freeze([]), deadline: null });
const with_ = <T extends object>(value: T, changes: Partial<T>): T => freeze({ ...value, ...changes });

/** Every word of length 0–3 over `alphabet`, at every split between the two position lists. */
function positionWords(alphabet: readonly number[]): (readonly [readonly number[], readonly number[]])[] {
  const out: (readonly [readonly number[], readonly number[]])[] = [];
  const grow = (word: number[]): void => {
    for (let split = 0; split <= word.length; split += 1) out.push([freeze(word.slice(0, split)), freeze(word.slice(split))]);
    if (word.length < 3) for (const value of alphabet) grow([...word, value]);
  };
  grow([]);
  return out;
}

/** The product of `dimensions`, in order, each element a list of the chosen values. */
function product<T>(dimensions: readonly (readonly T[])[]): T[][] {
  return dimensions.reduce<T[][]>((rows, values) => rows.flatMap((row) => values.map((value) => [...row, value])), [[]]);
}

// -- Families --------------------------------------------------------------------------------------

/** One family: a seed, a base plan and a finite, ordered list of variants of it. */
interface Family {
  readonly name: string;
  readonly seed: string;
  /** What each variant varies, as frozen in the manifest. */
  readonly dimensions: Readonly<Record<string, readonly string[]>>;
  /** How many variants; `variant` is defined for each index below it. */
  readonly size: (at: Context) => number;
  readonly variant: (at: Context, index: number) => Plan;
}

/** The registration templates of an Outcome seed: its genuine live, woken and expired `await` plans. */
const templates = (at: Context) => ({
  live: basePlan(at, "live") as PlanOf<"outcome">,
  woken: basePlan(at, "woken") as PlanOf<"outcome">,
  expired: basePlan(at, "expired") as PlanOf<"outcome">,
});

const MODES = ["none", "live", "woken", "expired", "both"] as const;
type Mode = (typeof MODES)[number];
const DEADLINES: Readonly<Record<Mode, readonly string[]>> = { none: ["genuine"], live: ["genuine", "all+1"], woken: ["genuine", "all+1"], both: ["genuine", "all+1"], expired: ["genuine", "all+1", "timeout+1"] };

/**
 * OA: an Outcome's registration, as one correlated shape. The mode picks the templates; the generation
 * (the fresh one, one before, one after) and the deadline shift are applied to every field of that mode
 * together; the count and the next state vary on their own. On a seed with a prior retirement the
 * reused generation can also reuse that retirement's timeout Event (review 01's coordinated case).
 */
function registrationFamily(seed: string, base: string): Family {
  const rows = (at: Context): (readonly [Mode, number, number, string, ExecutionState, boolean])[] => {
    const old = (basePlan(at, base) as PlanOf<"outcome">).registrations;
    const counts = [old - 1, old, old + 1, old + 2].filter((count) => count >= 0);
    const out: (readonly [Mode, number, number, string, ExecutionState, boolean])[] = [];
    for (const mode of MODES) {
      const generations = mode === "none" ? [old + 1] : [old, old + 1, old + 2];
      for (const generation of generations) {
        const reuse = mode === "expired" && generation === old && old >= 1 ? [false, true] : [false];
        for (const reused of reuse) for (const count of counts) for (const deadline of DEADLINES[mode]) for (const state of STATES) out.push([mode, generation, count, deadline, state, reused]);
      }
    }
    return out;
  };
  return {
    name: `OA ${seed}/${base}`,
    seed,
    dimensions: {
      mode: [...MODES],
      generation: ["registrations", "registrations + 1", "registrations + 2", "(none: registrations + 1 only)"],
      count: ["registrations - 1 (when not negative)", "registrations", "registrations + 1", "registrations + 2"],
      deadline: ["genuine", "all+1 (wait, retirement and timeout together)", "timeout+1 (expired only)"],
      nextState: [...STATES],
      reusedTimeoutEvent: ["false", "true (expired, generation = registrations ≥ 1)"],
    },
    size: (at) => rows(at).length,
    variant: (at, index) => {
      const [mode, generation, count, deadline, state, reused] = rows(at)[index]!;
      const plan = basePlan(at, base) as PlanOf<"outcome">;
      const t = templates(at);
      const shift = deadline === "all+1" ? 1 : 0;
      const wait = mode === "live" || mode === "both" ? with_(t.live.liveWait!, { generation, deadline: (t.live.liveWait!.deadline ?? 0) + shift }) : null;
      const source = mode === "woken" || mode === "both" ? t.woken : mode === "expired" ? t.expired : null;
      const priorTimeout = reused ? referenceRecord(ReflectApply(find, at.owner, [at.seed.opened.executionId]) as never).mailbox.find((entry) => entry.sourceCategory === "kernel_timeout")!.eventId : null;
      const retired = source === null ? null : with_(source.retired!, { generation, deadline: source.retired!.deadline === null ? null : source.retired!.deadline + shift, ...(priorTimeout === null ? {} : { endingEventId: priorTimeout }) });
      const readiness = source === null ? null : with_(source.readiness!, { generation, ...(priorTimeout === null ? {} : { timeoutEventId: priorTimeout }) });
      const timeout = mode !== "expired" ? null : with_(t.expired.timeout!, { generation, deadline: t.expired.timeout!.deadline + shift + (deadline === "timeout+1" ? 1 : 0), ...(priorTimeout === null ? {} : { eventId: priorTimeout }) });
      return with_(plan, { registrations: count, liveWait: wait, retired, readiness, timeout, nextState: state }) as Plan;
    },
  };
}

/** OB: one field off from a genuine registration, everything else as the coordinator formed it. */
function deviationFamily(seed: string, base: "live" | "woken" | "expired"): Family {
  const forged = "forged-id";
  const deviations: Readonly<Record<string, (plan: PlanOf<"outcome">, at: Context) => PlanOf<"outcome">>> = {
    ...(base === "live"
      ? {
          "liveWait.registeredBy forged": (plan) => with_(plan, { liveWait: with_(plan.liveWait!, { registeredBy: forged }) }),
          "liveWait.generation + 1": (plan) => with_(plan, { liveWait: with_(plan.liveWait!, { generation: plan.liveWait!.generation + 1 }) }),
          "liveWait.deadline + 1": (plan) => with_(plan, { liveWait: with_(plan.liveWait!, { deadline: 6 }) }),
          "liveWait.declaration another object (semantic)": (plan) => with_(plan, { liveWait: with_(plan.liveWait!, { declaration: with_(plan.liveWait!.declaration, {}) }) }),
          "readiness added (the woken template's)": (plan, at) => with_(plan, { readiness: templates(at).woken.readiness }),
          "nextState READY": (plan) => with_(plan, { nextState: "READY" }),
          "registrations unchanged": (plan) => with_(plan, { registrations: plan.registrations - 1 }),
        }
      : {
          "readiness null": (plan) => with_(plan, { readiness: null }),
          "readiness.generation + 1": (plan) => with_(plan, { readiness: with_(plan.readiness!, { generation: plan.readiness!.generation + 1 }) }),
          "readiness.species swapped": (plan) => with_(plan, { readiness: with_(plan.readiness!, { species: plan.readiness!.species === "event" ? "deadline" : "event" }) }),
          "readiness.selector another": (plan) => with_(plan, { readiness: with_(plan.readiness!, { selector: OTHER_SELECTOR }) }),
          "readiness.timeoutEventId forged": (plan) => with_(plan, { readiness: with_(plan.readiness!, { timeoutEventId: forged }) }),
          "retired.registeredBy forged": (plan) => with_(plan, { retired: with_(plan.retired!, { registeredBy: forged }) }),
          "retired.retiredBy cancellation": (plan) => with_(plan, { retired: with_(plan.retired!, { retiredBy: "cancellation" }) }),
          "retired.retiredBy swapped": (plan) => with_(plan, { retired: with_(plan.retired!, { retiredBy: plan.retired!.retiredBy === "event" ? "deadline" : "event" }) }),
          "retired.endingEventId forged": (plan) => with_(plan, { retired: with_(plan.retired!, { endingEventId: forged }) }),
          "retired.endingEventId the acknowledged batch entry": (plan, at) => with_(plan, { retired: with_(plan.retired!, { endingEventId: at.seed.exchange!.batch[0]! }) }),
          "retired.declaration another object": (plan) => with_(plan, { retired: with_(plan.retired!, { declaration: with_(plan.retired!.declaration, {}) }) }),
          "retired.deadline + 1": (plan) => with_(plan, { retired: with_(plan.retired!, { deadline: (plan.retired!.deadline ?? 0) + 1 }) }),
          "nextState WAITING": (plan) => with_(plan, { nextState: "WAITING" }),
          "registrations + 1": (plan) => with_(plan, { registrations: plan.registrations + 1 }),
          ...(base === "woken"
            ? { "timeout added (the expired template's)": (plan: PlanOf<"outcome">, at: Context) => with_(plan, { timeout: templates(at).expired.timeout }) }
            : {
                "timeout null": (plan: PlanOf<"outcome">) => with_(plan, { timeout: null }),
                "timeout.generation + 1": (plan: PlanOf<"outcome">) => with_(plan, { timeout: with_(plan.timeout!, { generation: plan.timeout!.generation + 1 }) }),
                "timeout.eventId forged": (plan: PlanOf<"outcome">) => with_(plan, { timeout: with_(plan.timeout!, { eventId: forged }) }),
                "timeout.deadline + 1": (plan: PlanOf<"outcome">) => with_(plan, { timeout: with_(plan.timeout!, { deadline: plan.timeout!.deadline + 1 }) }),
                "timeout.acceptancePosition + 1 (semantic)": (plan: PlanOf<"outcome">) => with_(plan, { timeout: with_(plan.timeout!, { acceptancePosition: plan.timeout!.acceptancePosition + 1 }) }),
              }),
        }),
  };
  const names = Object.keys(deviations);
  return {
    name: `OB ${seed}/${base}`,
    seed,
    dimensions: { deviation: names },
    size: () => names.length,
    variant: (at, index) => deviations[names[index]!]!(basePlan(at, base) as PlanOf<"outcome">, at) as Plan,
  };
}

/** OD: the two dispositions an Outcome writes, against every next state, positions as formed. */
function dispositionFamily(seed: string, base: string): Family {
  const names = ["queued", "acknowledged by the resolving Activation", "acknowledged by another Activation", "terminal (genuine)"];
  const values = (at: Context): MailboxDisposition[] => {
    const plan = basePlan(at, base) as PlanOf<"outcome">;
    return [freeze({ kind: "queued" }), freeze({ kind: "acknowledged", activationId: at.seed.exchange!.activationId }), freeze({ kind: "acknowledged", activationId: "activation-other" }), (basePlan(at, "complete") as PlanOf<"outcome">).ending ?? plan.ending];
  };
  const rows = product([[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3, 4, 5]]);
  return {
    name: `OD ${seed}/${base}`,
    seed,
    dimensions: { acknowledgment: names, ending: names, nextState: [...STATES] },
    size: () => rows.length,
    variant: (at, index) => {
      const [acknowledgment, ending, state] = rows[index]!;
      const disposition = values(at);
      return with_(basePlan(at, base) as PlanOf<"outcome">, { acknowledgment: disposition[acknowledgment!]!, ending: disposition[ending!]!, nextState: STATES[state!]! }) as Plan;
    },
  };
}

/** OP: an Outcome's two position lists: every word of length 0–3 over `alphabet`, at every split. */
function positionFamily(name: string, seed: string, base: string, alphabet: readonly number[], spelled: readonly string[]): Family {
  const words = positionWords(alphabet);
  return {
    name: `${name} ${seed}/${base}`,
    seed,
    dimensions: { alphabet: [...spelled], lengths: ["0", "1", "2", "3"], split: ["every split between acknowledgeAt and endAt"] },
    size: () => words.length,
    variant: (at, index) => {
      const [acknowledgeAt, endAt] = words[index]!;
      return with_(basePlan(at, base) as PlanOf<"outcome">, { acknowledgeAt, endAt }) as Plan;
    },
  };
}

/** A wake and its readiness from the `W` seed, for seeds whose base plan has none. */
const donors = (() => {
  let memo: { woken: PlanOf<"input">; cancellation: PlanOf<"cancellation"> } | null = null;
  return () => {
    if (memo === null) {
      const at = context("W");
      memo = { woken: basePlan(at, "inputS") as PlanOf<"input">, cancellation: basePlan(at, "cancel") as PlanOf<"cancellation"> };
    }
    return memo;
  };
})();

/** IN: an input's wake against its readiness. */
function inputFamily(seed: string, base: string): Family {
  const wakes = ["genuine", "the other (null, or the W seed's wake)", "generation + 1", "retiredBy deadline", "retiredBy cancellation", "endingEventId forged", "registeredBy forged", "deadline + 1", "declaration another object"];
  const readinesses = ["genuine", "the other (null, or the W seed's readiness)", "generation + 1", "species deadline", "selector another", "timeoutEventId forged"];
  const rows = product([wakes.map((_, index) => index), readinesses.map((_, index) => index)]);
  return {
    name: `IN ${seed}/${base}`,
    seed,
    dimensions: { woken: wakes, readiness: readinesses },
    size: () => rows.length,
    variant: (at, index) => {
      const plan = basePlan(at, base) as PlanOf<"input">;
      const donor = donors().woken;
      const [w, r] = rows[index]!;
      const wake = plan.woken ?? donor.woken!;
      const ready = plan.readiness ?? donor.readiness!;
      const woken = [plan.woken, plan.woken === null ? donor.woken : null, with_(wake, { generation: wake.generation + 1 }), with_(wake, { retiredBy: "deadline" }), with_(wake, { retiredBy: "cancellation" }), with_(wake, { endingEventId: "forged-id" }), with_(wake, { registeredBy: "forged-id" }), with_(wake, { deadline: (wake.deadline ?? 0) + 1 }), with_(wake, { declaration: with_(wake.declaration, {}) })][w!]!;
      const readiness = [plan.readiness, plan.readiness === null ? donor.readiness : null, with_(ready, { generation: ready.generation + 1 }), with_(ready, { species: "deadline" }), with_(ready, { selector: OTHER_SELECTOR }), with_(ready, { timeoutEventId: "forged-id" })][r!]!;
      return with_(plan, { woken, readiness }) as Plan;
    },
  };
}

/** EX: an expiry's retirement, readiness and timeout, as a product. */
function expiryFamily(seed: string): Family {
  const retirements = ["genuine", "generation + 1", "generation - 1", "retiredBy event", "retiredBy cancellation", "endingEventId forged", "registeredBy forged", "deadline + 1", "declaration another object"];
  const readinesses = ["genuine", "null", "generation + 1", "species event", "selector another", "timeoutEventId null"];
  const timeouts = ["genuine", "generation + 1", "eventId forged", "deadline + 1"];
  const rows = product([retirements.map((_, index) => index), readinesses.map((_, index) => index), timeouts.map((_, index) => index)]);
  return {
    name: `EX ${seed}/expiry`,
    seed,
    dimensions: { retired: retirements, readiness: readinesses, timeout: timeouts },
    size: () => rows.length,
    variant: (at, index) => {
      const plan = basePlan(at, "expiry") as PlanOf<"expiry">;
      const [a, b, c] = rows[index]!;
      const r = plan.retired;
      const retired = [r, with_(r, { generation: r.generation + 1 }), with_(r, { generation: r.generation - 1 }), with_(r, { retiredBy: "event" }), with_(r, { retiredBy: "cancellation" }), with_(r, { endingEventId: "forged-id" }), with_(r, { registeredBy: "forged-id" }), with_(r, { deadline: (r.deadline ?? 0) + 1 }), with_(r, { declaration: with_(r.declaration, {}) })][a!]!;
      const d = plan.readiness;
      const readiness = [d, null, with_(d, { generation: d.generation + 1 }), with_(d, { species: "event" }), with_(d, { selector: OTHER_SELECTOR }), with_(d, { timeoutEventId: null })][b!]!;
      const t = plan.timeout;
      const timeout = [t, with_(t, { generation: t.generation + 1 }), with_(t, { eventId: "forged-id" }), with_(t, { deadline: t.deadline + 1 })][c!]!;
      return with_(plan, { retired, readiness: readiness as never, timeout }) as Plan;
    },
  };
}

/** CA: a cancellation's positions, ending and retirement, as a product. */
function cancellationFamily(seed: string, base: string): Family {
  const positions = ["genuine", "the last dropped", "the first repeated", "the first as -0 beside 0", "one past the mailbox added", "none"];
  const endings = ["genuine", "queued", "acknowledged by another Activation"];
  const retirements = ["genuine", "the other (null, or the W seed's cancellation retirement)", "retiredBy event", "generation + 1", "endingEventId forged"];
  const rows = product([positions.map((_, index) => index), endings.map((_, index) => index), retirements.map((_, index) => index)]);
  return {
    name: `CA ${seed}/${base}`,
    seed,
    dimensions: { endAt: positions, ending: endings, retired: retirements },
    size: () => rows.length,
    variant: (at, index) => {
      const plan = basePlan(at, base) as PlanOf<"cancellation">;
      const [p, e, r] = rows[index]!;
      const ends = plan.endAt;
      const length = (ReflectApply(find, at.owner, [at.seed.opened.executionId]) as { mailboxLength: number }).mailboxLength;
      const endAt = [ends, ends.slice(0, -1), [...ends, ends[0]!], [...ends, -0], [...ends, length], []][p!]!;
      const ending = [plan.ending, freeze({ kind: "queued" }), freeze({ kind: "acknowledged", activationId: "activation-other" })][e!]!;
      const base_ = plan.retired ?? donors().cancellation.retired!;
      const retired = [plan.retired, plan.retired === null ? donors().cancellation.retired : null, with_(base_, { retiredBy: "event" }), with_(base_, { generation: base_.generation + 1 }), with_(base_, { endingEventId: "forged-id" })][r!]!;
      return with_(plan, { endAt: freeze(endAt), ending: ending as MailboxDisposition, retired }) as Plan;
    },
  };
}

/** RT: genuine plans of every successor kind, retargeted to every seed with that seed's current basis. */
const RETARGET_TEMPLATES: readonly (readonly [string, string])[] = [
  ["R0", "inputS"],
  ["R0", "dispatch"],
  ["R0", "cancel"],
  ["R1", "continue"],
  ["R1", "complete"],
  ["W", "expiry"],
];
const retargetTemplates = (() => {
  let memo: Plan[] | null = null;
  return (): Plan[] => (memo ??= RETARGET_TEMPLATES.map(([seed, base]) => basePlan(context(seed), base)));
})();

function retargetFamily(seed: string): Family {
  return {
    name: `RT ${seed}`,
    seed,
    dimensions: { template: RETARGET_TEMPLATES.map(([from, base]) => `${from}/${base}`) },
    size: () => RETARGET_TEMPLATES.length,
    variant: (at, index) => freeze({ ...retargetTemplates()[index]!, executionId: at.seed.opened.executionId, basis: versionOf(at) }) as Plan,
  };
}

const versionOf = (at: Context): number => (ReflectApply(find, at.owner, [at.seed.opened.executionId]) as { version: number }).version;

const DESIGN_ALPHABET = (m: number): readonly number[] => [-1, -0, 0, 1, 2, m, NaN, 0.5, Infinity];
const REVIEW_02_ALPHABET: readonly number[] = [-1, -0, 0, 1, 2, NaN, Infinity, 0.5];

const FAMILIES: readonly Family[] = [
  registrationFamily("R1", "continue"),
  registrationFamily("R1", "complete"),
  registrationFamily("R2", "continue"),
  deviationFamily("R1", "live"),
  deviationFamily("R1", "woken"),
  deviationFamily("R1", "expired"),
  deviationFamily("R2", "woken"),
  deviationFamily("R2", "expired"),
  dispositionFamily("R1", "continue"),
  dispositionFamily("R1", "complete"),
  dispositionFamily("R1", "fail"),
  dispositionFamily("R1e", "complete"),
  positionFamily("OP", "R1", "complete", DESIGN_ALPHABET(2), ["-1", "-0", "0", "1", "2", "m (the mailbox length, 2: not deduplicated)", "NaN", "0.5", "Infinity"]),
  positionFamily("OP", "R1", "fail", DESIGN_ALPHABET(2), ["-1", "-0", "0", "1", "2", "m (the mailbox length, 2: not deduplicated)", "NaN", "0.5", "Infinity"]),
  positionFamily("R02 position matrix", "R1", "complete", REVIEW_02_ALPHABET, ["-1", "-0", "0", "1", "2", "NaN", "Infinity", "0.5"]),
  inputFamily("R0", "inputS"),
  inputFamily("R1", "inputX"),
  inputFamily("W", "inputX"),
  inputFamily("W", "inputS"),
  inputFamily("RE", "inputX"),
  inputFamily("RD", "inputX"),
  expiryFamily("W"),
  cancellationFamily("R0", "cancel"),
  cancellationFamily("R0d", "fire"),
  cancellationFamily("R1", "cancel"),
  cancellationFamily("W", "cancel"),
  cancellationFamily("RE", "cancel"),
  cancellationFamily("RD", "cancel"),
  ...Object.keys(SEEDS).map(retargetFamily),
];

// -- The run ---------------------------------------------------------------------------------------

interface Tally {
  size: number;
  readonly verdicts: Record<string, number>;
}

function search(): { tallies: Record<string, Tally>; mismatches: string[]; seedProblems: string[]; milliseconds: number } {
  const started = performance.now();
  const tallies: Record<string, Tally> = {};
  const mismatches: string[] = [];
  const seedProblems: string[] = [];
  const note = (line: string): void => void (mismatches.length < 20 && mismatches.push(line));
  for (const seedName of Object.keys(SEEDS)) {
    const at = context(seedName);
    const reader = ReflectApply(find, at.owner, [at.seed.opened.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const owner = ReflectApply(postStateViolation, at.owner, [at.seed.opened.executionId]);
    const reference = postStateRule(referenceRecord(reader));
    if (owner !== null || reference !== null) seedProblems.push(`${seedName}: owner ${owner}, reference ${reference}`);
  }
  for (const family of FAMILIES) {
    let at = context(family.seed);
    const tally: Tally = { size: family.size(at), verdicts: {} };
    tallies[family.name] = tally;
    const readerOf = (current: Context) => ReflectApply(find, current.owner, [current.seed.opened.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    let reading = referenceRecord(readerOf(at));
    let before = readerOf(at).inspection();
    for (let index = 0; index < tally.size; index += 1) {
      const plan = family.variant(at, index);
      const expected = referenceDecision(reading, plan);
      let clause: string | null = null;
      try {
        ReflectApply(originalApply, at.owner, [plan]);
      } catch (error) {
        clause = refusalClause(error);
      }
      const verdict = clause ?? "accepted";
      tally.verdicts[verdict] = (tally.verdicts[verdict] ?? 0) + 1;
      const where = `${family.name} #${index}`;
      if (clause !== null) {
        if (expected.accepted || expected.clause !== clause) note(`${where}: the owner refused (${clause}); the reference ${expected.accepted ? "accepts" : `names ${expected.clause}`}`);
        if (!isDeepStrictEqual(readerOf(at).inspection(), before)) note(`${where}: a refused plan changed the record`);
        continue;
      }
      const after = referenceRecord(readerOf(at));
      if (!expected.accepted) note(`${where}: the owner accepted; the reference names ${expected.clause}`);
      else {
        const differences = governedDifferences(after, expected.next);
        if (differences.length > 0) note(`${where}: the committed record differs from the reference's in ${differences.join(", ")}`);
      }
      const witness = ReflectApply(postStateViolation, at.owner, [at.seed.opened.executionId]);
      if (witness !== null) note(`${where}: the post-state witness finds ${witness}`);
      const post = postStateRule(after);
      if (post !== null) note(`${where}: the reference's P finds ${post} on the committed record`);
      const preserved = preservationViolations(reading, plan, after);
      if (preserved.length > 0) note(`${where}: accepted against ${preserved.join("; ")}`);
      at = context(family.seed);
      reading = referenceRecord(readerOf(at));
      before = readerOf(at).inspection();
    }
  }
  return { tallies, mismatches, seedProblems, milliseconds: performance.now() - started };
}


const MANIFEST = JSON.parse(readFileSync(new URL("./owner-successor-search.json", import.meta.url), "utf8")) as {
  readonly families: Readonly<Record<string, { readonly seed: string; readonly dimensions: Readonly<Record<string, readonly string[]>>; readonly size: number; readonly verdicts: Readonly<Record<string, number>> }>>;
  readonly total: number;
};

describe("K1.3 design 03 Q6: the declared bounded search of the owner's successor check", () => {
  test("the owner agrees with the independent reference on every variant of the declared domain, which is the frozen one", () => {
    const { tallies, mismatches, seedProblems, milliseconds } = search();
    const observed = Object.fromEntries(FAMILIES.map((family) => [family.name, { seed: family.seed, dimensions: family.dimensions, size: tallies[family.name]!.size, verdicts: Object.fromEntries(Object.entries(tallies[family.name]!.verdicts).sort()) }]));
    const total = Object.values(tallies).reduce((sum, tally) => sum + tally.size, 0);
    console.log(JSON.stringify({ variants: total, milliseconds: Math.round(milliseconds), accepted: Object.values(tallies).reduce((sum, tally) => sum + (tally.verdicts.accepted ?? 0), 0) }));
    assert.deepEqual(seedProblems, [], "every seed satisfies the post-state predicate, by the owner and by the reference");
    assert.deepEqual(mismatches, []);
    // On a deliberate change, the message carries the observed families for review against the manifest.
    assert.deepEqual(observed, MANIFEST.families, `the generators and the verdicts are the frozen manifest's; observed: ${JSON.stringify(observed)}`);
    assert.equal(total, MANIFEST.total);
  });
});
