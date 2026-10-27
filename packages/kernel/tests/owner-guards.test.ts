/**
 * K1.3: the owner's successor check (design 03, revised for design check 03 and owner choice 05), with
 * the reviews' counterexamples under their stable IDs (K13-R01-S2-01, K13-R01-S4-02, K13-R01-CLOCK-03,
 * K13-R02-S2-01, K13-R02-S2-02), the design check's required controls (D03-CHK-02, -03 and -04) and the
 * positive controls that keep every valid plan working.
 *
 * A guard case forms a real plan through the public coordinator and alters it at the owner's one entry,
 * `KernelState.prototype.apply`, as review 01's probe and `state-plans.test.ts` do. The altered plan is
 * internally consistent where the case says so: these are negative controls of structural guarantees,
 * not public-call schedules the coordinator produces. A refused plan must also leave inspection
 * unchanged, because the owner admits every successor before it writes anything. Where a case names the
 * rule (`refusedAt`), the independent reference (`successor-reference.ts`) must name the same one.
 *
 * Every plan the owner accepts in this file is followed by the post-state witness: the owner's full
 * predicate evaluated again on the record the commit left (`postStateViolation`).
 *
 * The recording and rewriting inside `apply` run inside poison windows when the poisoned-prototype sweep
 * runs this file, so they use load-time references and own-data writes only.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";

import type { Plan } from "../src/plan.ts";
import { KernelState } from "../src/state.ts";
import { accepted, createRequest, recordOwn } from "./harness.ts";
import { referenceDecision, referenceRecord, refusalClause } from "./successor-reference.ts";
import { author, created, dispatch, input, keepingDriver, manualClock, submitAwait, submitNext, view, waitKey, waitOn, type Exchange, type Opened } from "./waits-kit.ts";

const ReflectApply = Reflect.apply;
const freeze = Object.freeze;
const originalApply = KernelState.prototype.apply;
const find = KernelState.prototype.find;
const postStateViolation = KernelState.prototype.postStateViolation;

type PlanOf<K extends Plan["kind"]> = Extract<Plan, { kind: K }>;

/** While set, rewrites each plan handed to the owner. */
let rewrite: ((plan: Plan, owner: KernelState) => Plan) | null = null;
/** While `recording`, every plan handed to the owner, as handed. */
const handed: { plan: Plan; state: KernelState }[] = [];
let recording = false;
/** What the post-state witness found after an accepted plan, and how many it checked. */
const witnessed: string[] = [];
let witnessedPlans = 0;

KernelState.prototype.apply = function (this: KernelState, plan: Plan): void {
  const applied = rewrite === null ? plan : rewrite(plan, this);
  if (recording) recordOwn(handed, { plan: applied, state: this });
  ReflectApply(originalApply, this, [applied]);
  witnessedPlans += 1;
  const violation = ReflectApply(postStateViolation, this, [applied.executionId]) as string | null;
  if (violation !== null) recordOwn(witnessed, `${applied.kind}: ${violation}`);
};

const CAPTURED = freeze({ captured: true });

/** Runs `run` with every plan of `kind` replaced by `alter(plan)` at the owner's entry. */
function rewriting<K extends Plan["kind"], T>(kind: K, alter: (plan: PlanOf<K>) => object, run: () => T): T {
  rewrite = (plan: Plan): Plan => (plan.kind === kind ? (freeze(alter(plan as PlanOf<K>)) as Plan) : plan);
  try {
    return run();
  } finally {
    rewrite = null;
  }
}

/**
 * The owner of one opened Execution: the state an input it submits is handed to, captured before the
 * owner is reached. (Every `created()` Execution has the same ID, so an ID alone does not name one.)
 */
const owned = new WeakMap<Opened, KernelState>();
function ownerOf(opened: Opened): KernelState {
  const known = owned.get(opened);
  if (known !== undefined) return known;
  let owner: KernelState | null = null;
  rewrite = (_plan: Plan, state: KernelState): Plan => {
    owner = state;
    throw CAPTURED;
  };
  try {
    opened.kernel.submitInput(author, { destination: opened.executionId, requestKey: "owner-probe", kind: "application.note", payload: 1 });
  } catch (error) {
    if (error !== CAPTURED) throw error;
  } finally {
    rewrite = null;
  }
  assert.ok(owner !== null, "an input reaches the owner");
  owned.set(opened, owner);
  return owner;
}
const readerOf = (opened: Opened) => ReflectApply(find, ownerOf(opened), [opened.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;

/**
 * Asserts that the rewritten operation is refused by the owner naming rule `clause` (`P1`–`P9`,
 * `T1`–`T6`, or `stale`), that the independent reference names the same rule for the plan the owner
 * was handed, and that nothing changed.
 */
function refusedAt<K extends Plan["kind"]>(opened: Opened, clause: string, kind: K, alter: (plan: PlanOf<K>) => object, run: () => unknown): void {
  const before = view(opened);
  const reading = referenceRecord(readerOf(opened));
  handed.length = 0;
  recording = true;
  let thrown: unknown = null;
  try {
    rewriting(kind, alter, run);
  } catch (error) {
    thrown = error;
  } finally {
    recording = false;
  }
  assert.notEqual(thrown, null, "the owner refused the plan");
  assert.equal(refusalClause(thrown), clause, String(thrown));
  const plan = handed.at(-1)!.plan;
  const reference = referenceDecision(reading, plan);
  assert.equal(reference.accepted ? "accepted" : reference.clause, clause, "the independent reference names the same rule");
  assert.deepEqual(view(opened), before, "the refused plan changed nothing");
}

/** Applies `plan` to its Execution's owner directly, at the owner's entry, with the current basis. */
function retargeted(target: Opened, plan: Plan): Plan {
  return freeze({ ...plan, executionId: target.executionId, basis: readerOf(target).version }) as Plan;
}

/** The plans an operation hands the owner, captured without applying them: the owner is never reached. */
function planned<T>(run: () => T): Plan[] {
  const out: Plan[] = [];
  rewrite = (plan: Plan): Plan => {
    recordOwn(out, plan);
    throw CAPTURED;
  };
  try {
    run();
  } catch (error) {
    if (error !== CAPTURED) throw error;
  } finally {
    rewrite = null;
  }
  return out;
}

/** Asserts that the rewritten operation is refused by the owner naming `guard`, and changed nothing. */
function refusedWithoutChange<K extends Plan["kind"]>(opened: Opened, guard: RegExp, kind: K, rewrite: (plan: PlanOf<K>) => object, run: () => unknown): void {
  const before = view(opened);
  assert.throws(() => rewriting(kind, rewrite, run), guard);
  assert.deepEqual(view(opened), before, "the refused plan changed nothing");
}

/** The positions of the entries still queued. */
const queuedAt = (opened: Opened): number[] =>
  view(opened).mailbox.flatMap((entry, position) => (entry.disposition.kind === "queued" ? [position] : []));

const cancel = (opened: Opened) => opened.kernel.cancelExecution(author, opened.executionId);
const executionKey = (executionId: string) => ({ executionId, kind: "execution_deadline" as const, generation: null });

describe("K13-R01-S2-01 a terminal decision's positions are an exact cover of the queued Events", () => {
  test("a cancellation naming one queued position twice is refused, though its length equals the queued count", () => {
    const opened = created();
    input(opened, "s");
    assert.equal(queuedAt(opened).length, 2);
    refusedWithoutChange(opened, /S2/, "cancellation", (plan) => ({ ...plan, endAt: freeze([plan.endAt[0]!, plan.endAt[0]!]) }), () => cancel(opened));
  });

  test("the shared cancellation arm refuses the same plan formed by the Execution deadline's fire", () => {
    const opened = created({ executionDeadline: 5 });
    input(opened, "s");
    opened.clock.set(5);
    refusedWithoutChange(opened, /S2/, "cancellation", (plan) => ({ ...plan, endAt: freeze([plan.endAt[1]!, plan.endAt[1]!]) }), () => opened.kernel.fireTimer(executionKey(opened.executionId)));
  });

  for (const [step, next] of [["complete", { step: "complete", result: true }], ["fail", { step: "fail", error: { reason: "x" } }]] as const) {
    test(`a ${step} Outcome acknowledging and ending the same position is refused (review 01's overlap)`, () => {
      const opened = created();
      input(opened, "s");
      const exchange = dispatch(opened, 1);
      refusedWithoutChange(opened, /S2/, "outcome", (plan) => ({ ...plan, endAt: freeze([plan.acknowledgeAt[0]!]) }), () => submitNext(opened, exchange, next));
    });

    test(`a ${step} Outcome repeating a position within one list is refused`, () => {
      const opened = created();
      input(opened, "s");
      const exchange = dispatch(opened, 1);
      refusedWithoutChange(opened, /S2/, "outcome", (plan) => ({ ...plan, acknowledgeAt: freeze([plan.acknowledgeAt[0]!, plan.acknowledgeAt[0]!]), endAt: freeze([]) }), () => submitNext(opened, exchange, next));
    });
  }

  test("an Outcome naming a position that is not queued is refused, even with the right count", () => {
    const opened = created();
    input(opened, "s");
    const first = dispatch(opened, 1);
    accepted(submitNext(opened, first));
    // Position 0 is acknowledged now; naming it in place of the queued position 1 keeps the count at one.
    const exchange = dispatch(opened, 1);
    refusedWithoutChange(opened, /S2/, "outcome", (plan) => ({ ...plan, acknowledgeAt: freeze([0]) }), () => submitNext(opened, exchange, { step: "complete", result: true }));
  });

  test("positive controls: a valid disjoint partition completes, and a cancellation of two queued Events disposes both", () => {
    const completing = created();
    input(completing, "s");
    const exchange = dispatch(completing, 1);
    accepted(submitNext(completing, exchange, { step: "complete", result: true }));
    const completed = view(completing);
    assert.equal(completed.state, "COMPLETED");
    assert.deepEqual(completed.queued, []);
    assert.deepEqual(completed.mailbox.map((entry) => entry.disposition.kind), ["acknowledged", "terminal"]);

    const cancelling = created();
    input(cancelling, "s");
    accepted(cancel(cancelling));
    assert.deepEqual(view(cancelling).queued, []);
    assert.deepEqual(view(cancelling).mailbox.map((entry) => entry.disposition.kind), ["terminal", "terminal"]);
  });
});

describe("K13-R01-S4-02 every Outcome that creates a registration takes a fresh generation", () => {
  test("review 01's case: a second immediate expiry reusing generation 1 consistently is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    const old = view(opened).mailbox.find((entry) => entry.sourceCategory === "kernel_timeout")!;
    const exchange = dispatch(opened);
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({
      ...plan,
      registrations: 1,
      retired: freeze({ ...plan.retired!, generation: 1, endingEventId: old.eventId }),
      readiness: freeze({ ...plan.readiness!, generation: 1, timeoutEventId: old.eventId }),
      timeout: freeze({ ...plan.timeout!, generation: 1, eventId: old.eventId }),
    }), () => submitAwait(opened, exchange, waitOn("s", 0)));
  });

  test("a live registration reusing the last generation is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    const exchange = dispatch(opened);
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({ ...plan, registrations: 1, liveWait: freeze({ ...plan.liveWait!, generation: 1 }) }), () => submitAwait(opened, exchange, waitOn("s")));
  });

  test("an immediately woken registration reusing the last generation is refused", () => {
    const opened = created();
    const first = dispatch(opened, 1);
    input(opened, "s");
    accepted(submitAwait(opened, first, waitOn("s")));
    const exchange = dispatch(opened, 1);
    input(opened, "s");
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({
      ...plan,
      registrations: 1,
      retired: freeze({ ...plan.retired!, generation: 1 }),
      readiness: freeze({ ...plan.readiness!, generation: 1 }),
    }), () => submitAwait(opened, exchange, waitOn("s")));
  });

  test("a count that does not move under a new registration, or moves without one, is refused", () => {
    const registering = created();
    const exchange = dispatch(registering);
    refusedWithoutChange(registering, /S4/, "outcome", (plan) => ({ ...plan, registrations: 0 }), () => submitAwait(registering, exchange, waitOn("s")));
    const continuing = created();
    const plain = dispatch(continuing);
    refusedWithoutChange(continuing, /S4/, "outcome", (plan) => ({ ...plan, registrations: 1 }), () => submitNext(continuing, plain));
  });

  test("positive controls: successive generations 1, 2 and 3 expire, wake and stay live", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    const second = dispatch(opened, 1);
    input(opened, "s");
    assert.equal(accepted(submitAwait(opened, second, waitOn("s"))).wait?.result, "woken");
    accepted(submitAwait(opened, dispatch(opened, 1), waitOn("s")));
    const after = view(opened);
    assert.deepEqual(after.retiredWaits.map((wait) => [wait.generation, wait.retiredBy]), [[1, "deadline"], [2, "event"]]);
    assert.equal(after.wait?.generation, 3);
    assert.equal(after.state, "WAITING");
  });

  test("positive control: a duplicate host fire stays a recorded duplicate with one timeout", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    opened.clock.set(5);
    const first = opened.kernel.fireTimer(waitKey(opened.executionId, 1));
    const repeat = opened.kernel.fireTimer(waitKey(opened.executionId, 1));
    assert.equal(first.result, "expired");
    assert.deepEqual([repeat.result, repeat.timeoutEventId], ["duplicate", first.timeoutEventId]);
    const after = view(opened);
    assert.equal(after.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout").length, 1);
    assert.deepEqual(after.timerFires.map((fire) => fire.result), ["expired", "duplicate"]);
  });
});

describe("design 02 audit: the S1, S3, S4 and S5 predicates beyond review 01's cases", () => {
  test("S1: a delivery, takeover or control plan on a terminal record is refused by that rule", () => {
    const opened = created();
    const ended = accepted(opened.kernel.createExecution(author, createRequest({ creationKey: "s1-ended" })));
    handed.length = 0;
    recording = true;
    let exchange: Exchange;
    try {
      exchange = dispatch(opened);
      accepted(opened.kernel.reportProtocolFailure(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1, diagnostic: "garbled" }));
      accepted(opened.kernel.requestTakeover(author, opened.executionId, { activationId: exchange.activationId, writerEpoch: 1 }));
    } finally {
      recording = false;
    }
    const recorded = [...handed];
    const target = { ...opened, executionId: ended.executionId };
    const endedExchange = dispatch(target);
    accepted(submitNext(target, endedExchange, { step: "complete", result: null }));
    for (const kind of ["delivery", "control", "takeover"] as const) {
      const sample = recorded.find((row) => row.plan.kind === kind)!;
      const reader = ReflectApply(find, sample.state, [ended.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
      const before = view(target);
      assert.throws(() => ReflectApply(originalApply, sample.state, [freeze({ ...sample.plan, executionId: ended.executionId, basis: reader.version })]), /S1/, kind);
      assert.deepEqual(view(target), before, `the refused ${kind} plan changed nothing`);
    }
  });

  test("T6: an Outcome carrying both a live and a retired wait, with the retirement's readiness, is refused", () => {
    const opened = created();
    input(opened, "s");
    const exchange = dispatch(opened, 1);
    const [woken] = planned(() => submitAwait(opened, exchange, waitOn("s"))) as PlanOf<"outcome">[];
    // The woken template's retirement and readiness, carried beside a live wait registered by the same Outcome.
    refusedAt(opened, "T6", "outcome", (plan) => ({ ...plan, nextState: "WAITING", liveWait: freeze({ generation: woken!.retired!.generation, registeredBy: woken!.retired!.registeredBy, declaration: woken!.retired!.declaration, deadline: woken!.retired!.deadline }), retired: woken!.retired, readiness: woken!.readiness }), () => submitAwait(opened, exchange, waitOn("s")));
  });

  test("S3: a wake, expiry or cancellation that names the live generation but rewrites what it retires is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    for (const rewrite of [{ deadline: 99 }, { retiredBy: "deadline" }, { endingEventId: "event-forged" }, { registeredBy: "activation-forged" }, { declaration: freeze({ dependencies: [], subscriptions: [], deadline: 5 }) }]) {
      refusedWithoutChange(opened, /S3/, "input", (plan) => ({ ...plan, woken: freeze({ ...plan.woken!, ...rewrite }) }), () => input(opened, "s"));
    }
    opened.clock.set(5);
    refusedWithoutChange(opened, /S3/, "expiry", (plan) => ({ ...plan, retired: freeze({ ...plan.retired, endingEventId: "event-forged" }) }), () => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
    refusedWithoutChange(opened, /S3/, "cancellation", (plan) => ({ ...plan, retired: freeze({ ...plan.retired!, retiredBy: "event" }) }), () => cancel(opened));
    assert.equal(opened.kernel.fireTimer(waitKey(opened.executionId, 1)).result, "expired", "the unaltered fire still expires the live generation");
  });

  test("S4: a deadline retirement without its timeout, and a timeout that disagrees with its retirement, are refused", () => {
    const opened = created();
    const exchange = dispatch(opened);
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({ ...plan, timeout: null }), () => submitAwait(opened, exchange, waitOn("s", 0)));
    refusedWithoutChange(opened, /S4/, "outcome", (plan) => ({ ...plan, timeout: freeze({ ...plan.timeout!, deadline: 1 }) }), () => submitAwait(opened, exchange, waitOn("s", 0)));
    const waiting = created();
    accepted(submitAwait(waiting, dispatch(waiting), waitOn("s", 5)));
    waiting.clock.set(5);
    refusedWithoutChange(waiting, /S4/, "expiry", (plan) => ({ ...plan, timeout: freeze({ ...plan.timeout, deadline: 6 }) }), () => waiting.kernel.fireTimer(waitKey(waiting.executionId, 1)));
  });

  test("S5: readiness for another generation, cause, selector or timeout Event is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    for (const rewrite of [{ generation: 2 }, { species: "deadline" }, { selector: freeze({ dependencies: [], subscriptions: [], deadline: 5 }) }, { timeoutEventId: "timeout-forged" }]) {
      refusedWithoutChange(opened, /S5/, "input", (plan) => ({ ...plan, readiness: freeze({ ...plan.readiness!, ...rewrite }) }), () => input(opened, "s"));
    }
    opened.clock.set(5);
    refusedWithoutChange(opened, /S5/, "expiry", (plan) => ({ ...plan, readiness: freeze({ ...plan.readiness, timeoutEventId: null }) }), () => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
    const expiring = created();
    const exchange = dispatch(expiring);
    refusedWithoutChange(expiring, /S5/, "outcome", (plan) => ({ ...plan, readiness: freeze({ ...plan.readiness!, timeoutEventId: null }) }), () => submitAwait(expiring, exchange, waitOn("s", 0)));
  });
});

describe("K13-R01-CLOCK-03 three deadline paths: due at registration, live wait, Execution deadline", () => {
  test("due at registration: the Outcome's own reading expires the wait, with no host fire and no pending timer", () => {
    const opened = created();
    const answer = accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    assert.equal(answer.wait?.result, "expired");
    const after = view(opened);
    assert.deepEqual([after.state, after.timerFires.length, after.waitEndedReadiness?.species], ["READY", 0, "deadline"]);
    assert.deepEqual(opened.kernel.pendingTimers(), []);
  });

  test("live wait: a deadline passed on the clock expires nothing until the host fires it", () => {
    const opened = created();
    assert.equal(accepted(submitAwait(opened, dispatch(opened), waitOn("s", 10))).wait?.result, "waiting");
    opened.clock.set(20);
    assert.equal(view(opened).state, "WAITING", "no instant enforcement");
    assert.deepEqual(opened.kernel.pendingTimers(), [{ executionId: opened.executionId, kind: "wait_deadline", generation: 1, deadline: 10 }]);
    assert.equal(opened.kernel.fireTimer(waitKey(opened.executionId, 1)).result, "expired");
    assert.equal(view(opened).state, "READY");
  });

  test("Execution deadline: fire-only; creation with a past deadline is READY, an earlier Outcome wins, the fire cancels", () => {
    const past = created({ clock: manualClock(10), executionDeadline: 5 });
    assert.equal(view(past).state, "READY", "creation never reads the clock");
    assert.equal(past.clock.reads, 0);
    accepted(submitNext(past, dispatch(past), { step: "complete", result: null }));
    assert.equal(past.kernel.fireTimer(executionKey(past.executionId)).result, "stale", "the Outcome accepted before the fire won");
    assert.equal(view(past).state, "COMPLETED");

    const fired = created({ clock: manualClock(10), executionDeadline: 5 });
    assert.equal(fired.kernel.fireTimer(executionKey(fired.executionId)).result, "cancelled");
    assert.equal(view(fired).state, "CANCELLED");
  });
});

describe("K13-R02-S2-01 and K13-R02-S2-02: review 02's owner counterexamples, as named controls", () => {
  for (const cause of ["explicit", "execution_deadline"] as const) {
    test(`K13-R02-S2-01 a cancellation writing queued over every queued position is refused (${cause})`, () => {
      const opened = created(cause === "explicit" ? {} : { executionDeadline: 5 });
      input(opened, "s");
      opened.clock.set(5);
      const run = () => (cause === "explicit" ? cancel(opened) : opened.kernel.fireTimer(executionKey(opened.executionId)));
      refusedAt(opened, "T2", "cancellation", (plan) => ({ ...plan, ending: freeze({ kind: "queued" }) }), run);
    });
  }

  for (const [step, next] of [["complete", { step: "complete", result: true }], ["fail", { step: "fail", error: { reason: "x" } }]] as const) {
    for (const field of ["acknowledgment", "ending"] as const) {
      test(`K13-R02-S2-01 a ${step} Outcome writing queued as its ${field} over an exact cover is refused`, () => {
        const opened = created();
        input(opened, "s");
        const exchange = dispatch(opened, 1);
        refusedAt(opened, "T2", "outcome", (plan) => ({ ...plan, [field]: freeze({ kind: "queued" }) }), () => submitNext(opened, exchange, next));
      });
    }

    test(`K13-R02-S2-02 a ${step} decision that registers an immediately expired wait, appending its queued timeout and readiness, is refused`, () => {
      const opened = created();
      const exchange = dispatch(opened);
      refusedAt(opened, "P1", "outcome", (plan) => ({ ...plan, nextState: step === "complete" ? "COMPLETED" : "FAILED" }), () => submitAwait(opened, exchange, waitOn("s", 0)));
    });
  }

  test("positive controls: an exact cover with its genuine dispositions completes and fails, and a non-terminal immediate expiry stays", () => {
    for (const next of [{ step: "complete", result: true }, { step: "fail", error: { reason: "x" } }]) {
      const opened = created();
      input(opened, "s");
      accepted(submitNext(opened, dispatch(opened, 1), next));
      assert.deepEqual(view(opened).queued, []);
    }
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
    assert.deepEqual([view(opened).state, view(opened).queued.length], ["READY", 1]);
  });

  test("review 02's generation matrix: only the fresh generation 2 is accepted, for live, immediate wake and immediate expiry", () => {
    const verdicts: string[] = [];
    for (const mode of ["live", "event", "deadline"] as const) {
      for (const generation of [0, 1, 2, 3, 4]) {
        const opened = created();
        accepted(submitAwait(opened, dispatch(opened), waitOn("s", 0)));
        const exchange = dispatch(opened);
        if (mode === "event") input(opened, "s");
        const alter = (plan: PlanOf<"outcome">) => ({
          ...plan,
          registrations: generation,
          liveWait: plan.liveWait === null ? null : freeze({ ...plan.liveWait, generation }),
          retired: plan.retired === null ? null : freeze({ ...plan.retired, generation }),
          readiness: plan.readiness === null ? null : freeze({ ...plan.readiness, generation }),
          timeout: plan.timeout === null ? null : freeze({ ...plan.timeout, generation }),
        });
        const run = () => submitAwait(opened, exchange, waitOn("s", mode === "deadline" ? 0 : 10));
        if (generation === 2) {
          accepted(rewriting("outcome", alter, run));
          verdicts.push(`${mode}/${generation}: accepted`);
        } else {
          refusedAt(opened, "T6", "outcome", alter, run);
          verdicts.push(`${mode}/${generation}: T6`);
        }
      }
    }
    assert.equal(verdicts.filter((verdict) => verdict.endsWith("accepted")).length, 3);
    assert.equal(verdicts.length, 15);
  });
});

describe("D03-CHK-02 every new wait and retirement keeps its declaration's deadline", () => {
  test("a live registration whose deadline is not its declaration's is refused", () => {
    const opened = created();
    const exchange = dispatch(opened);
    refusedAt(opened, "P6", "outcome", (plan) => ({ ...plan, liveWait: freeze({ ...plan.liveWait!, deadline: 6 }) }), () => submitAwait(opened, exchange, waitOn("s", 5)));
  });

  test("an immediate expiry whose retirement and timeout agree with each other but not with the declaration is refused", () => {
    const opened = created();
    const exchange = dispatch(opened);
    refusedAt(opened, "P6", "outcome", (plan) => ({
      ...plan,
      retired: freeze({ ...plan.retired!, deadline: 1 }),
      timeout: freeze({ ...plan.timeout!, deadline: 1 }),
    }), () => submitAwait(opened, exchange, waitOn("s", 0)));
  });

  test("an immediate expiry whose timeout alone moves its deadline is refused", () => {
    const opened = created();
    const exchange = dispatch(opened);
    refusedAt(opened, "P7", "outcome", (plan) => ({ ...plan, timeout: freeze({ ...plan.timeout!, deadline: 1 }) }), () => submitAwait(opened, exchange, waitOn("s", 0)));
  });

  test("an immediate wake whose retirement moves its deadline is refused", () => {
    const opened = created();
    input(opened, "s");
    const exchange = dispatch(opened, 1);
    refusedAt(opened, "P6", "outcome", (plan) => ({ ...plan, retired: freeze({ ...plan.retired!, deadline: 9 }) }), () => submitAwait(opened, exchange, waitOn("s", 5)));
  });

  test("a live wait's expiry whose retirement and timeout move the deadline together is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    opened.clock.set(5);
    refusedAt(opened, "T4", "expiry", (plan) => ({
      ...plan,
      retired: freeze({ ...plan.retired, deadline: 6 }),
      timeout: freeze({ ...plan.timeout, deadline: 6 }),
    }), () => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
  });

  test("positive controls: live, immediately woken and immediately expired registrations keep their declared deadlines", () => {
    const live = created();
    accepted(submitAwait(live, dispatch(live), waitOn("s", 5)));
    assert.deepEqual([view(live).wait?.deadline, view(live).wait?.declaration.deadline], [5, 5]);
    const woken = created();
    input(woken, "s");
    accepted(submitAwait(woken, dispatch(woken, 1), waitOn("s", 5)));
    assert.deepEqual([view(woken).retiredWaits[0]?.deadline, view(woken).retiredWaits[0]?.declaration.deadline], [5, 5]);
    const expired = created();
    accepted(submitAwait(expired, dispatch(expired), waitOn("s", 0)));
    const timeout = view(expired).mailbox.find((entry) => entry.sourceCategory === "kernel_timeout")!;
    assert.deepEqual([view(expired).retiredWaits[0]?.deadline, timeout.sourceCategory === "kernel_timeout" ? timeout.deadline : null], [0, 0]);
  });
});

describe("D03-CHK-03 readiness comes with its retirement and lasts until dispatch or cancellation", () => {
  test("an immediate Event wake without its readiness is refused", () => {
    const opened = created();
    input(opened, "s");
    const exchange = dispatch(opened, 1);
    refusedAt(opened, "T5", "outcome", (plan) => ({ ...plan, readiness: null }), () => submitAwait(opened, exchange, waitOn("s")));
  });

  test("an immediate deadline expiry without its readiness is refused", () => {
    const opened = created();
    const exchange = dispatch(opened);
    refusedAt(opened, "T5", "outcome", (plan) => ({ ...plan, readiness: null }), () => submitAwait(opened, exchange, waitOn("s", 0)));
  });

  test("an input wake without its readiness, and an expiry without its readiness, are refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    refusedAt(opened, "T5", "input", (plan) => ({ ...plan, readiness: null }), () => input(opened, "s"));
    opened.clock.set(5);
    refusedAt(opened, "T5", "expiry", (plan) => ({ ...plan, readiness: null }), () => opened.kernel.fireTimer(waitKey(opened.executionId, 1)));
  });

  test("an input that installs readiness without a wake, or drops the readiness it found, is refused", () => {
    const waiting = created();
    accepted(submitAwait(waiting, dispatch(waiting), waitOn("s", 5)));
    const [wake] = planned(() => input(waiting, "s")) as PlanOf<"input">[];
    refusedAt(waiting, "T5", "input", (plan) => ({ ...plan, readiness: wake!.readiness }), () => input(waiting, "x"));
    input(waiting, "s");
    assert.equal(view(waiting).waitEndedReadiness?.species, "event");
    // READY with Event readiness: a later input keeps it; a plan that drops it is not a way to clear it.
    const [later] = planned(() => input(waiting, "x")) as PlanOf<"input">[];
    assert.equal(later!.readiness, null, "an ordinary input names no readiness");
    accepted(waiting.kernel.submitInput(author, { destination: waiting.executionId, requestKey: "kept", kind: "application.note", payload: 1 }));
    assert.equal(view(waiting).waitEndedReadiness?.species, "event", "an input keeps readiness");
  });

  test("positive controls: readiness lasts from its retirement until dispatch consumes it or cancellation discards it", () => {
    const consumed = created();
    accepted(submitAwait(consumed, dispatch(consumed), waitOn("s", 5)));
    input(consumed, "s");
    assert.equal(view(consumed).waitEndedReadiness?.species, "event");
    input(consumed, "x");
    assert.equal(view(consumed).waitEndedReadiness?.species, "event", "kept across an input");
    dispatch(consumed, 1);
    assert.equal(view(consumed).waitEndedReadiness, null, "consumed by the next reservation");
    const discarded = created();
    accepted(submitAwait(discarded, dispatch(discarded), waitOn("s", 0)));
    assert.equal(view(discarded).waitEndedReadiness?.species, "deadline");
    accepted(cancel(discarded));
    assert.deepEqual([view(discarded).state, view(discarded).waitEndedReadiness], ["CANCELLED", null], "discarded by cancellation");
  });
});

describe("D03-CHK-04 each decision starts from its own states, and only the resolving Outcome acknowledges", () => {
  test("positive control: an input while RUNNING with a reserved batch acknowledges nothing and keeps the exchange", () => {
    const opened = created();
    input(opened, "s");
    const exchange = dispatch(opened, 2);
    assert.equal(exchange.batch.length, 2);
    input(opened, "x");
    const after = view(opened);
    assert.deepEqual([after.state, after.activation?.activationId, after.acknowledged], ["RUNNING", exchange.activationId, []]);
    assert.equal(after.queued.length, 3);
  });

  test("a second dispatch on RUNNING with an empty reserved batch is refused", () => {
    const running = created();
    accepted(submitNext(running, dispatch(running, 1)));
    const empty = dispatch(running, 1);
    assert.deepEqual(empty.batch, [], "an ordinary dispatch with nothing queued reserves an empty batch");
    const donor = created();
    const [template] = planned(() => dispatch(donor, 1));
    const before = view(running);
    const plan = retargeted(running, template!);
    assert.equal(refusalClause(captureThrow(() => ReflectApply(originalApply, ownerOf(running), [plan]))), "T1");
    const reference = referenceDecision(referenceRecord(readerOf(running)), plan);
    assert.equal(reference.accepted ? "accepted" : reference.clause, "T1");
    assert.deepEqual(view(running), before);
  });

  test("an Outcome for another exchange, and one acknowledging by another Activation, are refused", () => {
    const opened = created();
    input(opened, "s");
    const first = dispatch(opened, 1);
    const [stale] = planned(() => submitNext(opened, first)) as PlanOf<"outcome">[];
    accepted(submitNext(opened, first));
    const second = dispatch(opened, 1);
    refusedAt(opened, "stale", "outcome", () => ({ ...stale!, basis: readerOf(opened).version }), () => submitNext(opened, second));
    refusedAt(opened, "T3", "outcome", (plan) => ({ ...plan, acknowledgment: freeze({ kind: "acknowledged", activationId: first.activationId }) }), () => submitNext(opened, second));
  });

  test("an expiry of a generation that is no longer live is refused", () => {
    const opened = created();
    accepted(submitAwait(opened, dispatch(opened), waitOn("s", 5)));
    opened.clock.set(5);
    const [first] = planned(() => opened.kernel.fireTimer(waitKey(opened.executionId, 1))) as PlanOf<"expiry">[];
    opened.clock.set(0);
    input(opened, "s");
    accepted(submitAwait(opened, dispatch(opened, 1), waitOn("s", 9)));
    assert.equal(view(opened).wait?.generation, 2);
    opened.clock.set(9);
    refusedAt(opened, "T4", "expiry", () => ({ ...first!, basis: readerOf(opened).version }), () => opened.kernel.fireTimer(waitKey(opened.executionId, 2)));
  });

  test("terminal controls: input, dispatch, expiry and cancellation never reopen a COMPLETED record; an Outcome finds no exchange", () => {
    const donor = created();
    accepted(submitAwait(donor, dispatch(donor), waitOn("s", 5)));
    const [inputPlan] = planned(() => input(donor, "s"));
    donor.clock.set(5);
    const [expiryPlan] = planned(() => donor.kernel.fireTimer(waitKey(donor.executionId, 1)));
    const [cancellationPlan] = planned(() => cancel(donor));
    const ready = created();
    const [dispatchPlan] = planned(() => dispatch(ready, 1));
    const readyExchange = dispatch(ready, 1);
    const [outcomePlan] = planned(() => submitNext(ready, readyExchange));
    const ended = created();
    accepted(submitNext(ended, dispatch(ended, 1), { step: "complete", result: null }));
    const before = view(ended);
    for (const [plan, clause] of [[inputPlan, "T1"], [dispatchPlan, "T1"], [expiryPlan, "T1"], [cancellationPlan, "T1"], [outcomePlan, "stale"]] as const) {
      const moved = retargeted(ended, plan!);
      assert.equal(refusalClause(captureThrow(() => ReflectApply(originalApply, ownerOf(ended), [moved]))), clause, plan!.kind);
      const reference = referenceDecision(referenceRecord(readerOf(ended)), moved);
      assert.equal(reference.accepted ? "accepted" : reference.clause, clause, `${plan!.kind}: the reference agrees`);
    }
    assert.deepEqual(view(ended), before);
  });

  test("positive controls: settlement, refusals, losing Outcomes and discarded fires still run on terminal records", () => {
    const driver = keepingDriver();
    const completing = created({ driver, executionDeadline: 5 });
    accepted(submitNext(completing, dispatch(completing, 1), { step: "complete", result: null }));
    driver.settlements[0]!.delivered();
    assert.equal(view(completing).exchanges[0]?.deliveries[0]?.status, "delivered", "a late report settles");
    const refused = completing.kernel.submitInput(author, { destination: completing.executionId, requestKey: "late", kind: "application.note", payload: 1 });
    assert.equal(refused.ok, false);
    assert.equal(view(completing).refusals.length, 1, "a refusal is recorded");
    completing.clock.set(5);
    assert.equal(completing.kernel.fireTimer(executionKey(completing.executionId)).result, "stale", "a fire is discarded");
    const cancelling = created();
    const exchange = dispatch(cancelling, 1);
    accepted(cancel(cancelling));
    assert.equal(submitNext(cancelling, exchange).ok, false, "a proposal loses to the cancellation");
    assert.equal(view(cancelling).losingOutcomes.length, 1);
    for (const opened of [completing, cancelling]) assert.equal(ownerOf(opened).postStateViolation(opened.executionId), null);
  });
});

describe("design 03's post-state witness", () => {
  test("every record an accepted plan in this file left satisfies the post-state predicate", () => {
    assert.ok(witnessedPlans > 200, `the witness ran after ${witnessedPlans} accepted plans`);
    assert.deepEqual(witnessed, []);
  });
});

/** The value `run` throws; fails when it returns. */
function captureThrow(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  assert.fail("expected a refusal");
}
