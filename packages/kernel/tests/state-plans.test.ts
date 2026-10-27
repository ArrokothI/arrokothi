/**
 * COORD-REFACTOR-01 CR1-1 and CR1-2 at run time: every decision reaches accepted state as one frozen,
 * data-only plan, and no view the owner hands out aliases what it holds.
 *
 * - **Plan witness.** `KernelState.prototype.apply` is wrapped in this test process. Each operation
 *   family runs through the public coordinator, and the test checks the exact sequence of plan kinds it
 *   applies, that every plan is frozen and data-only all the way down (no function, no accessor; the
 *   only bytes are a canonical value's owned `bytes`), that its `answer` is data-only and is the very
 *   value the operation returns, and that the state the first plan meets is the state before the
 *   operation: nothing changed before a plan was applied.
 * - **Reader witness.** Every getter and query method of the owner and its readers is called on a
 *   populated Execution. Each must return a primitive, another reader, a deeply frozen value, or a fresh
 *   list of frozen values; never something the owner still holds and could change. A member the witness
 *   has no recipe for fails, so a new reader member must be classified here.
 * - **Inspection witness.** Every container of a returned view is edited, and the next view must equal
 *   the one before the edits.
 * - **Post-state witness** (K1.3, design 03). After every plan the owner accepts in this file, the
 *   owner's full post-state predicate is evaluated again on the record the commit actually left
 *   (`postStateViolation`), so a commit that differed from the successor it admitted would show here.
 *
 * The recording inside `apply` runs inside poison windows when the poisoned-prototype sweep runs this
 * file, so it uses load-time references and own-data writes only; every check runs after the call.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { creationRequestIdKey, inputIdKey, type ExecutionView } from "../src/index.ts";
import type { Plan } from "../src/plan.ts";
import { KernelState } from "../src/state.ts";
import { ExecutionCoordinator } from "./binding-facade.ts";
import { accepted, caller, createRequest, delayedDriver, outcomeFor, recordingDriver, refused, submissionFor, throwingDriver, unsafeDriver } from "./harness.ts";

const ReflectApply = Reflect.apply;
const defineProperty = Object.defineProperty;
const create = Object.create;
const originalApply = KernelState.prototype.apply;
const find = KernelState.prototype.find;
const postStateViolation = KernelState.prototype.postStateViolation;

interface Applied {
  readonly plan: Plan;
  /** The Execution as the plan found it, or `null` for a creation plan. */
  readonly before: ExecutionView | null;
  readonly state: KernelState;
}

const applied: Applied[] = [];
const recordApplied = (entry: Applied): void => {
  const descriptor = create(null) as PropertyDescriptor;
  descriptor.value = entry;
  descriptor.writable = true;
  descriptor.enumerable = true;
  descriptor.configurable = true;
  defineProperty(applied, `${applied.length}`, descriptor);
};

/** What the post-state witness found: one line per accepted plan whose committed record breaks P. */
const witnessed: string[] = [];
let witnessedPlans = 0;
const recordWitnessed = (line: string): void => {
  const descriptor = create(null) as PropertyDescriptor;
  descriptor.value = line;
  descriptor.writable = true;
  descriptor.enumerable = true;
  descriptor.configurable = true;
  defineProperty(witnessed, `${witnessed.length}`, descriptor);
};

KernelState.prototype.apply = function (this: KernelState, plan: Plan): void {
  const reader = plan.kind === "creation" ? null : (ReflectApply(find, this, [plan.executionId]) as ReturnType<KernelState["find"]>);
  recordApplied({ plan, before: reader === null ? null : reader.inspection(), state: this });
  ReflectApply(originalApply, this, [plan]);
  witnessedPlans += 1;
  const violation = ReflectApply(postStateViolation, this, [plan.executionId]) as string | null;
  if (violation !== null) recordWitnessed(`${plan.kind} on ${plan.executionId}: ${violation}`);
};

/** Runs one operation and returns the plans it applied. */
const during = <T>(operation: () => T): { result: T; plans: Applied[] } => {
  applied.length = 0;
  const result = operation();
  return { result, plans: [...applied] };
};

const KINDS = new Set(["creation", "input", "dispatch", "delivery", "settlement", "outcome", "takeover", "control", "refusal", "expiry", "timer_discard", "cancellation", "losing_outcome"]);

/** Everything wrong with `value` as plan data: functions, accessors, foreign bytes, exotic objects and, when `frozen`, anything unfrozen. */
function dataViolations(value: unknown, path: string, frozen: boolean, seen = new Set<object>()): string[] {
  if (typeof value === "function") return [`${path}: a function`];
  if (value === null || typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);
  if (value instanceof Uint8Array) return path.endsWith(".bytes") ? [] : [`${path}: bytes outside a canonical value`];
  const out: string[] = [];
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== null && prototype !== Object.prototype && prototype !== Array.prototype) out.push(`${path}: not plain data`);
  if (frozen && !Object.isFrozen(value)) out.push(`${path}: not frozen`);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!("value" in descriptor)) {
      out.push(`${path}.${String(key)}: an accessor`);
      continue;
    }
    out.push(...dataViolations(descriptor.value, `${path}.${String(key)}`, frozen, seen));
  }
  return out;
}

/** The plan checks every operation shares: closed kind, frozen data, data-only answer, nothing changed before the first plan. */
function checkPlans(plans: readonly Applied[], kinds: readonly string[], before: ExecutionView | null): void {
  assert.deepEqual(plans.map((entry) => entry.plan.kind), kinds, "the operation applied exactly these plans, in order");
  for (const { plan } of plans) {
    assert.ok(KINDS.has(plan.kind), `${plan.kind} is a plan kind`);
    assert.ok(Object.isFrozen(plan), `${plan.kind}: the plan itself is frozen`);
    const fields = Reflect.ownKeys(plan).filter((key) => key !== "answer");
    for (const key of fields) assert.deepEqual(dataViolations((plan as unknown as Record<PropertyKey, unknown>)[key], `${plan.kind}.${String(key)}`, true), [], `${plan.kind}: frozen data all the way down`);
    if ("answer" in plan) assert.deepEqual(dataViolations(plan.answer, `${plan.kind}.answer`, false), [], `${plan.kind}: the answer is data`);
  }
  if (plans.length > 0 && before !== null) assert.deepEqual(plans[0]!.before, before, "nothing changed before the first plan was applied");
}

const author = caller("app-a", "tenant-a");
const AVAILABLE = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };

/** A fresh coordinator with one Execution whose first exchange is open. */
function opened(driver: ReturnType<typeof recordingDriver> | ReturnType<typeof delayedDriver> = recordingDriver()) {
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest()));
  const open = accepted(kernel.dispatch(author, created.executionId, { bound: 4 }));
  return { kernel, driver, executionId: created.executionId, open };
}

const view = (kernel: ExecutionCoordinator, executionId: string): ExecutionView => accepted(kernel.inspect(author, executionId));

/** Runs one operation on an existing Execution, snapshotting it first, and checks the plans it applied. */
const expectPlans = <T>(kernel: ExecutionCoordinator, executionId: string, operation: () => T, kinds: readonly string[]): { result: T; plans: Applied[] } => {
  const before = view(kernel, executionId);
  const run = during(operation);
  checkPlans(run.plans, kinds, before);
  return run;
};

describe("CR1-1: each operation forms frozen, data-only plans before anything changes", () => {
  test("creation: accepted, replayed, conflicting", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const first = during(() => kernel.createExecution(author, createRequest()));
    checkPlans(first.plans, ["creation"], null);
    assert.equal(first.result, (first.plans[0]!.plan as Extract<Plan, { kind: "creation" }>).answer, "the operation returns the plan's answer");
    const executionId = accepted(first.result).executionId;
    checkPlans(during(() => kernel.createExecution(author, createRequest())).plans, [], null);
    const before = view(kernel, executionId);
    const conflict = during(() => kernel.createExecution(author, createRequest({ definitionRevision: "weekly-report@4" })));
    checkPlans(conflict.plans, ["refusal"], before);
    assert.equal(refused(conflict.result), (conflict.plans[0]!.plan as Extract<Plan, { kind: "refusal" }>).refusal);
  });

  test("input: accepted, replayed, conflicting, to a terminal Execution", () => {
    const { kernel, driver, executionId, open } = opened();
    const before = view(kernel, executionId);
    const input = during(() => kernel.submitInput(author, { destination: executionId, requestKey: "k1", kind: "application.note", payload: { n: 1 } }));
    checkPlans(input.plans, ["input"], before);
    assert.equal(input.result, (input.plans[0]!.plan as Extract<Plan, { kind: "input" }>).answer);
    checkPlans(during(() => kernel.submitInput(author, { destination: executionId, requestKey: "k1", kind: "application.note", payload: { n: 1 } })).plans, [], null);
    expectPlans(kernel, executionId, () => kernel.submitInput(author, { destination: executionId, requestKey: "k1", kind: "application.note", payload: { n: 2 } }), ["refusal"]);
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { next: { step: "complete", result: null } }), submissionFor(driver, open.activationId)));
    expectPlans(kernel, executionId, () => kernel.submitInput(author, { destination: executionId, requestKey: "k2", kind: "application.note", payload: { n: 3 } }), ["refusal"]);
  });

  test("dispatch and delivery: reported at once, reported later (also after resolution), thrown", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const before = view(kernel, created.executionId);
    const dispatched = during(() => kernel.dispatch(author, created.executionId, { bound: 1 }));
    checkPlans(dispatched.plans, ["dispatch", "delivery", "settlement"], before);
    assert.equal(dispatched.result, (dispatched.plans[0]!.plan as Extract<Plan, { kind: "dispatch" }>).answer);

    const delayed = delayedDriver();
    const late = new ExecutionCoordinator({ driver: delayed });
    const lateCreated = accepted(late.createExecution(author, createRequest()));
    const lateOpen = during(() => late.dispatch(author, lateCreated.executionId, { bound: 1 }));
    checkPlans(lateOpen.plans, ["dispatch", "delivery"], null);
    const exchange = accepted(lateOpen.result);
    accepted(late.submitOutcome(author, outcomeFor(lateCreated.executionId, exchange), submissionFor(delayed, exchange.activationId)));
    const released = during(() => delayed.release());
    checkPlans(released.plans, ["settlement"], null);
    assert.equal(view(late, lateCreated.executionId).exchanges[0]?.deliveries[0]?.status, "delivered", "the late report settled the resolved exchange's own row");

    const thrown = new ExecutionCoordinator({ driver: throwingDriver() });
    const thrownCreated = accepted(thrown.createExecution(author, createRequest()));
    checkPlans(during(() => thrown.dispatch(author, thrownCreated.executionId, { bound: 1 })).plans, ["dispatch", "delivery", "settlement"], null);
    assert.equal(view(thrown, thrownCreated.executionId).activation?.deliveries[0]?.status, "failed");
  });

  test("redelivery: resent, and refused while held", () => {
    const { kernel, executionId, open } = opened();
    const before = view(kernel, executionId);
    const resent = during(() => kernel.redeliver(author, executionId));
    checkPlans(resent.plans, ["delivery", "settlement"], before);
    assert.equal(accepted(resent.result).writerEpoch, (resent.plans[0]!.plan as Extract<Plan, { kind: "delivery" }>).writerEpoch, "the answer describes the attempt delivered");
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "garbled" }));
    expectPlans(kernel, executionId, () => kernel.redeliver(author, executionId), ["refusal"]);
  });

  test("Outcome: accepted, replayed, stale", () => {
    const { kernel, driver, executionId, open } = opened();
    const before = view(kernel, executionId);
    const envelope = outcomeFor(executionId, open, { emissions: [{ emissionKey: "e1", value: { n: 1 } }], next: { step: "complete", result: { done: true } } });
    const outcome = during(() => kernel.submitOutcome(author, envelope, submissionFor(driver, open.activationId)));
    checkPlans(outcome.plans, ["outcome"], before);
    assert.equal(accepted(outcome.result), (outcome.plans[0]!.plan as Extract<Plan, { kind: "outcome" }>).answer, "the operation returns the plan's answer");
    checkPlans(during(() => kernel.submitOutcome(author, envelope, submissionFor(driver, open.activationId))).plans, [], null);
    expectPlans(kernel, executionId, () => kernel.submitOutcome(author, outcomeFor(executionId, { ...open, activationId: "no-such-activation" }), submissionFor(driver, open.activationId)), ["refusal"]);
  });

  test("takeover: accepted with its delivery, and refused by an unsafe Driver", () => {
    const { kernel, executionId, open } = opened();
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "garbled" }));
    const before = view(kernel, executionId);
    const takeover = during(() => kernel.requestTakeover(author, executionId, { activationId: open.activationId, writerEpoch: 1 }));
    checkPlans(takeover.plans, ["takeover", "delivery", "settlement"], before);
    assert.equal(takeover.result, (takeover.plans[0]!.plan as Extract<Plan, { kind: "takeover" }>).answer);
    const unsafe = new ExecutionCoordinator({ driver: unsafeDriver() });
    const created = accepted(unsafe.createExecution(author, createRequest()));
    const unsafeOpen = accepted(unsafe.dispatch(author, created.executionId, { bound: 1 }));
    expectPlans(unsafe, created.executionId, () => unsafe.requestTakeover(author, created.executionId, { activationId: unsafeOpen.activationId, writerEpoch: 1 }), ["refusal"]);
  });

  test("recovery controls: enter, repeat, clear; protocol failure: enter, repeat", () => {
    const { kernel, executionId, open } = opened();
    const missing = { ...AVAILABLE, definitionRevisions: [] as string[] };
    const before = view(kernel, executionId);
    const entered = during(() => kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: missing }));
    checkPlans(entered.plans, ["control"], before);
    assert.equal(entered.result, (entered.plans[0]!.plan as Extract<Plan, { kind: "control" }>).answer);
    checkPlans(during(() => kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: missing })).plans, [], null);
    expectPlans(kernel, executionId, () => kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: AVAILABLE }), ["control"]);
    expectPlans(kernel, executionId, () => kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1 }), ["control"]);
    checkPlans(during(() => kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1 })).plans, [], null);
  });
});

// -- K1.3: waits, timers and the owner's structural guards --------------------------

describe("K1.3 CR1-1: wait, wake, expiry and fire decisions are frozen, data-only plans", () => {
  const clocked = () => {
    let reading = 0;
    const clock = { now: () => reading, set: (value: number) => void (reading = value) };
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver, clock });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const open = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    return { kernel, driver, clock, executionId: created.executionId, open };
  };
  const awaitOn = (deadline?: number) => ({ step: "await", wait: deadline === undefined ? { subscriptions: [{ subscriptionClass: "s" }] } : { subscriptions: [{ subscriptionClass: "s" }], deadline } });

  test("await: waiting, woken at registration, expired at registration", () => {
    for (const [deadline, reading, eligible, result] of [[10, 0, false, "waiting"], [undefined, 0, true, "woken"], [5, 5, false, "expired"]] as const) {
      const { kernel, driver, clock, executionId, open } = clocked();
      clock.set(reading);
      if (eligible) accepted(kernel.submitInput(author, { destination: executionId, requestKey: "e", kind: "k", payload: 1, subscriptionClass: "s" }));
      const run = expectPlans(kernel, executionId, () => kernel.submitOutcome(author, outcomeFor(executionId, open, { next: awaitOn(deadline) }), submissionFor(driver, open.activationId)), ["outcome"]);
      assert.equal(accepted(run.result).wait?.result, result);
    }
  });

  test("input wake, wait-ended dispatch, and every fire result", () => {
    const { kernel, driver, clock, executionId, open } = clocked();
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, open, { next: awaitOn(10) }), submissionFor(driver, open.activationId)));
    const key = { executionId, kind: "wait_deadline" as const, generation: 1 };
    expectPlans(kernel, executionId, () => kernel.fireTimer(key), ["timer_discard"]);
    clock.set(10);
    const expiry = expectPlans(kernel, executionId, () => kernel.fireTimer(key), ["expiry"]);
    assert.equal(expiry.result, (expiry.plans[0]!.plan as Extract<Plan, { kind: "expiry" }>).answer, "the operation returns the plan's answer");
    expectPlans(kernel, executionId, () => kernel.fireTimer(key), ["timer_discard"]);
    checkPlans(during(() => kernel.fireTimer({ executionId: "none", kind: "wait_deadline", generation: 1 })).plans, [], null);
    const next = expectPlans(kernel, executionId, () => kernel.dispatch(author, executionId, { bound: 2 }), ["dispatch", "delivery", "settlement"]);
    const exchange = accepted(next.result);
    accepted(kernel.submitOutcome(author, outcomeFor(executionId, exchange, { next: awaitOn() }), submissionFor(driver, exchange.activationId)));
    expectPlans(kernel, executionId, () => kernel.submitInput(author, { destination: executionId, requestKey: "wake", kind: "k", payload: 1, subscriptionClass: "s" }), ["input"]);
    expectPlans(kernel, executionId, () => kernel.dispatch(author, executionId, { bound: 2 }), ["dispatch", "delivery", "settlement"]);
  });
});

describe("K1.3 CR1-1: cancellation and losing-proposal decisions are frozen, data-only plans", () => {
  const canceller = { ...author, cancelScopes: ["tenant-a"] };

  test("cancel: accepted, repeated, refused; a losing proposal: recorded, retried, unindexed", () => {
    const { kernel, driver, executionId, open } = opened();
    expectPlans(kernel, executionId, () => kernel.cancelExecution(author, executionId), ["refusal"]);
    const cancelled = expectPlans(kernel, executionId, () => kernel.cancelExecution(canceller, executionId), ["cancellation"]);
    assert.equal(cancelled.result, (cancelled.plans[0]!.plan as Extract<Plan, { kind: "cancellation" }>).answer, "the operation returns the plan's answer");
    checkPlans(during(() => kernel.cancelExecution(canceller, executionId)).plans, [], null);
    const losing = expectPlans(kernel, executionId, () => kernel.submitOutcome(author, outcomeFor(executionId, open), submissionFor(driver, open.activationId)), ["losing_outcome"]);
    assert.equal(refused(losing.result), (losing.plans[0]!.plan as Extract<Plan, { kind: "losing_outcome" }>).refusal);
    checkPlans(during(() => kernel.submitOutcome(author, outcomeFor(executionId, open), submissionFor(driver, open.activationId))).plans, [], null);
    expectPlans(kernel, executionId, () => kernel.submitOutcome(author, outcomeFor(executionId, open, { activationId: 42 }), submissionFor(driver, open.activationId)), ["refusal"]);
  });

  test("the Execution deadline's fire forms the same cancellation plan", () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver, clock: { now: () => 10 } });
    const created = accepted(kernel.createExecution(author, { ...createRequest(), executionDeadline: 5 } as never));
    const fired = expectPlans(kernel, created.executionId, () => kernel.fireTimer({ executionId: created.executionId, kind: "execution_deadline", generation: null }), ["cancellation"]);
    assert.equal(fired.result, (fired.plans[0]!.plan as Extract<Plan, { kind: "cancellation" }>).answer);
    expectPlans(kernel, created.executionId, () => kernel.fireTimer({ executionId: created.executionId, kind: "execution_deadline", generation: null }), ["timer_discard"]);
  });
});

describe("K1.3 the owner's structural guards refuse a plan that breaks them (direct negative controls)", () => {
  const refusedBy = (state: KernelState, plan: Plan, guard: RegExp, executionId: string): void => {
    const reader = ReflectApply(find, state, [executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const before = reader.inspection();
    assert.throws(() => ReflectApply(originalApply, state, [plan]), guard);
    assert.deepEqual(reader.inspection(), before, "the refused plan changed nothing");
  };
  const waitingSetup = () => {
    const driver = recordingDriver();
    const kernel = new ExecutionCoordinator({ driver, clock: { now: () => 0 } });
    const created = accepted(kernel.createExecution(author, createRequest()));
    const open = accepted(kernel.dispatch(author, created.executionId, { bound: 1 }));
    const outcome = during(() => kernel.submitOutcome(author, outcomeFor(created.executionId, open, { next: { step: "await", wait: { subscriptions: [{ subscriptionClass: "s" }], deadline: 10 } } }), submissionFor(driver, open.activationId)));
    return { kernel, driver, executionId: created.executionId, open, outcome: outcome.plans[0]! };
  };

  test("S1: a dispatch on a WAITING Execution, and an input on a terminal one", () => {
    const { kernel, executionId } = waitingSetup();
    // A second Execution on the same owner supplies well-formed templates for the forged plans.
    const other = accepted(kernel.createExecution(author, createRequest({ creationKey: "s1-template" })));
    const dispatchTemplate = during(() => kernel.dispatch(author, other.executionId, { bound: 1 })).plans[0]!;
    const state = dispatchTemplate.state;
    const waiting = ReflectApply(find, state, [executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    refusedBy(state, Object.freeze({ ...(dispatchTemplate.plan as Extract<Plan, { kind: "dispatch" }>), executionId, basis: waiting.version, activationsMinted: 2 }) as Plan, /S1/, executionId);

    const done = opened();
    accepted(done.kernel.submitOutcome(author, outcomeFor(done.executionId, done.open, { next: { step: "complete", result: null } }), submissionFor(done.driver, done.open.activationId)));
    const live = accepted(done.kernel.createExecution(author, createRequest({ creationKey: "s1-live" })));
    const inputTemplate = during(() => done.kernel.submitInput(author, { destination: live.executionId, requestKey: "live", kind: "k", payload: 1 })).plans[0]!;
    const inputPlan = inputTemplate.plan as Extract<Plan, { kind: "input" }>;
    const ended = ReflectApply(find, inputTemplate.state, [done.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const entry = { ...inputPlan.entry, inputId: { ...inputPlan.entry.inputId, destination: done.executionId } };
    refusedBy(inputTemplate.state, Object.freeze({ ...inputPlan, executionId: done.executionId, basis: ended.version, entry }) as Plan, /S1/, done.executionId);
  });

  test("S3: an Outcome plan whose next state and live wait disagree", () => {
    const template = opened();
    const plain = during(() => template.kernel.submitOutcome(author, outcomeFor(template.executionId, template.open), submissionFor(template.driver, template.open.activationId)));
    const outcomePlan = plain.plans[0]!.plan as Extract<Plan, { kind: "outcome" }>;
    const target = opened();
    const recorded = during(() => target.kernel.redeliver(author, target.executionId)).plans[0]!;
    const reader = ReflectApply(find, recorded.state, [target.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const forged = Object.freeze({
      ...outcomePlan,
      executionId: target.executionId,
      basis: reader.version,
      resolved: { ...outcomePlan.resolved, activationId: reader.activation!.activation.activationId },
      nextState: "WAITING",
      liveWait: null,
    }) as Plan;
    refusedBy(recorded.state, forged, /S3/, target.executionId);
  });

  test("S4: an expiry plan for a generation that is not live", () => {
    const { kernel, executionId } = waitingSetup();
    const fireRun = during(() => kernel.fireTimer({ executionId, kind: "wait_deadline", generation: 1 }));
    const recorded = fireRun.plans[0]!;
    const reader = ReflectApply(find, recorded.state, [executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const live = reader.wait!;
    const forged = Object.freeze({
      kind: "expiry",
      executionId,
      basis: reader.version,
      timeout: { eventId: "t-forged", destination: executionId, generation: 2, deadline: 10, acceptancePosition: reader.nextAcceptancePosition },
      retired: { generation: 1, registeredBy: live.registeredBy, declaration: live.declaration, deadline: 10, retiredBy: "deadline", endingEventId: "t-forged" },
      readiness: { species: "deadline", generation: 1, selector: live.declaration, timeoutEventId: "t-forged" },
      fire: { timer: "wait_deadline", generation: 1, observedAt: 10, result: "expired", reason: "forged", timeoutEventId: "t-forged" },
      answer: { result: "expired", reason: "forged", timeoutEventId: "t-forged" },
    }) as unknown as Plan;
    refusedBy(recorded.state, forged, /S4/, executionId);
  });

  test("S1 and S2: a cancellation of a terminal Execution, and one that leaves a queued Event", () => {
    const canceller = { ...author, cancelScopes: ["tenant-a"] };
    const target = opened();
    accepted(target.kernel.submitInput(author, { destination: target.executionId, requestKey: "backlog", kind: "k", payload: 1 }));
    const other = accepted(target.kernel.createExecution(author, createRequest({ creationKey: "s2-template" })));
    const template = during(() => target.kernel.cancelExecution(canceller, other.executionId)).plans[0]!;
    const plan = template.plan as Extract<Plan, { kind: "cancellation" }>;
    const reader = ReflectApply(find, template.state, [target.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const exchange = reader.activation!;
    const record = { ...plan.record, endedExchange: { activationId: exchange.activation.activationId, writerEpoch: 1, baseProgressRevision: 0, batch: exchange.batch, dispatchReceipt: exchange.receipt } };
    // Only the reserved batch's position, not the backlog: a terminal decision that leaves an Event queued.
    refusedBy(template.state, Object.freeze({ ...plan, executionId: target.executionId, basis: reader.version, endAt: [0], record }) as Plan, /S2/, target.executionId);
    const otherReader = ReflectApply(find, template.state, [other.executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    refusedBy(template.state, Object.freeze({ ...plan, basis: otherReader.version }) as Plan, /S1/, other.executionId);
  });

  test("S5: an input wake with no readiness, and readiness over readiness", () => {
    const { kernel, executionId } = waitingSetup();
    const discard = during(() => kernel.fireTimer({ executionId, kind: "wait_deadline", generation: 1 })).plans[0]!;
    const reader = ReflectApply(find, discard.state, [executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const live = reader.wait!;
    const template = during(() => kernel.submitInput(author, { destination: executionId, requestKey: "ineligible", kind: "k", payload: 1 })).plans[0]!;
    const plan = template.plan as Extract<Plan, { kind: "input" }>;
    const after = ReflectApply(find, template.state, [executionId]) as NonNullable<ReturnType<KernelState["find"]>>;
    const woken = { generation: live.generation, registeredBy: live.registeredBy, declaration: live.declaration, deadline: live.deadline, retiredBy: "event", endingEventId: "e-forged" };
    const entry = { ...plan.entry, eventId: "e-forged", inputId: { ...plan.entry.inputId, requestKey: "forged" }, acceptancePosition: after.nextAcceptancePosition, receipt: { ...plan.entry.receipt, position: after.nextAcceptancePosition } };
    refusedBy(template.state, Object.freeze({ ...plan, basis: after.version, entry, woken, readiness: null }) as Plan, /S5/, executionId);
  });
});

// -- Readers and inspection ----------------------------------------------------------

/** A populated Execution: resolved exchange with Emission and history, an open exchange with holds and deliveries, a refusal. */
function populated() {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const created = accepted(kernel.createExecution(author, createRequest()));
  const executionId = created.executionId;
  const first = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
  accepted(kernel.reportProtocolFailure(author, executionId, { activationId: first.activationId, writerEpoch: 1, diagnostic: "garbled" }));
  accepted(kernel.submitOutcome(author, outcomeFor(executionId, first, { emissions: [{ emissionKey: "e1", value: { n: 1 } }] }), submissionFor(driver, first.activationId)));
  accepted(kernel.submitInput(author, { destination: executionId, requestKey: "k1", kind: "application.note", payload: { n: 1 } }));
  accepted(kernel.submitInput(author, { destination: executionId, requestKey: "k2", kind: "application.note", payload: { n: 2 } }));
  const second = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
  accepted(kernel.recoverExecution(author, executionId, { activationId: second.activationId, available: { ...AVAILABLE, progressCodecs: [] } }));
  accepted(kernel.reportProtocolFailure(author, executionId, { activationId: second.activationId, writerEpoch: 1 }));
  refused(kernel.dispatch(author, executionId, { bound: 1 }));
  const { plans } = during(() => kernel.redeliver(author, executionId));
  assert.ok(plans.length > 0);
  // The redelivery is refused while held, so the owner is reached through that refusal's plan.
  return { kernel, executionId, state: plans[0]!.state, first, second };
}

type Value = unknown;

/** Whether `value` is something a reader may return: a primitive, a reader, deeply frozen data, or a fresh list of frozen values. */
function readerValueViolations(name: string, read: () => Value, readers: ReadonlySet<object>): string[] {
  const first = read();
  if (first === null || (typeof first !== "object" && typeof first !== "function")) return [];
  if (typeof first === "function") return [`${name}: returns a function`];
  if (readers.has(Object.getPrototypeOf(first) as object)) return [];
  if (Array.isArray(first) && !Object.isFrozen(first)) {
    const again = read();
    const out = first === again ? [`${name}: returns the same unfrozen list twice (an alias of held state)`] : [];
    first.forEach((element, index) => out.push(...dataViolations(element, `${name}[${index}]`, true)));
    return out;
  }
  return dataViolations(first, name, true);
}

describe("CR1-2: the owner's views alias nothing it holds", () => {
  test("every reader member returns a primitive, a reader, frozen data or a fresh list of frozen values", () => {
    const { executionId, state, first } = populated();
    const execution = state.find(executionId)!;
    const exchange = execution.activation!;
    const entry = execution.entryAt(0);
    const readers = new Set<object>([Object.getPrototypeOf(execution) as object, Object.getPrototypeOf(exchange) as object, Object.getPrototypeOf(entry) as object]);
    const recipes: Record<string, Record<string, () => Value>> = {
      KernelState: {
        find: () => state.find(executionId),
        findCreation: () => state.findCreation(creationRequestIdKey({ producerNamespace: "app-a", scope: "tenant-a", requestKey: "report-17" })),
        visibleExecutionIds: () => state.visibleExecutionIds(author),
        deliveryStatus: () => state.deliveryStatus(executionId, first.activationId, 1),
        executionIds: () => state.executionIds(),
        postStateViolation: () => state.postStateViolation(executionId),
      },
      ExecutionReader: {
        entryAt: () => execution.entryAt(1),
        inputEntry: () => execution.inputEntry(inputIdKey({ producerNamespace: "app-a", destination: executionId, requestKey: "k1" })),
        acceptedOutcome: () => execution.acceptedOutcome(first.activationId),
        queuedEvents: () => execution.queuedEvents(8),
        activationEventAt: () => execution.activationEventAt(1),
        retiredWait: () => execution.retiredWait(1),
        losingRefusal: () => execution.losingRefusal("no-such-key"),
      },
      ExchangeReader: {},
      EntryReader: {},
    };
    const targets: Record<string, object> = { KernelState: state, ExecutionReader: execution, ExchangeReader: exchange, EntryReader: entry };
    const out: string[] = [];
    for (const [className, target] of Object.entries(targets)) {
      const prototype = Object.getPrototypeOf(target) as object;
      for (const key of Object.getOwnPropertyNames(prototype)) {
        if (key === "constructor" || (className === "KernelState" && key === "apply") || (className === "ExecutionReader" && key === "inspection")) continue;
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key)!;
        const read = descriptor.get !== undefined ? () => Reflect.apply(descriptor.get!, target, []) : recipes[className]?.[key];
        if (read === undefined) {
          out.push(`${className}.${key}: a reader member with no witness recipe; classify it here`);
          continue;
        }
        out.push(...readerValueViolations(`${className}.${key}`, read, readers));
      }
    }
    assert.deepEqual(out, []);
  });

  test("editing every container of a returned view changes neither the next view nor the Execution", () => {
    const { kernel, executionId, state } = populated();
    const reader = state.find(executionId)!;
    const snapshot = structuredClone(reader.inspection());
    const vandalize = (value: unknown, seen = new Set<object>()): void => {
      if (value === null || typeof value !== "object" || seen.has(value) || Object.isFrozen(value)) return;
      seen.add(value);
      for (const key of Reflect.ownKeys(value)) vandalize((value as Record<PropertyKey, unknown>)[key], seen);
      if (Array.isArray(value)) value.length = 0;
      else for (const key of Reflect.ownKeys(value)) if (Object.getOwnPropertyDescriptor(value, key)?.writable === true) (value as Record<PropertyKey, unknown>)[key] = "vandalized";
    };
    vandalize(reader.inspection());
    vandalize(accepted(kernel.inspect(author, executionId)));
    assert.deepEqual(structuredClone(reader.inspection()), snapshot, "the owner's projection was fresh");
    assert.deepEqual(structuredClone(accepted(kernel.inspect(author, executionId))), snapshot, "the public view was fresh");
  });

  test("a reader holds its record privately and cannot be borrowed by a forged receiver", () => {
    const { executionId, state } = populated();
    const reader = state.find(executionId)!;
    assert.deepEqual(Reflect.ownKeys(reader), [], "a reader exposes no own property");
    assert.deepEqual(Reflect.ownKeys(state), [], "the owner exposes no own property");
    const getter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(reader), "state")!.get!;
    assert.throws(() => Reflect.apply(getter, { state: "READY" }, []), TypeError, "a forged reader fails the private-field brand");
    assert.throws(() => Reflect.apply(KernelState.prototype.find, {}, [executionId]), TypeError, "a forged owner fails the private-field brand");
    assert.throws(() => {
      (reader as unknown as { state: string }).state = "COMPLETED";
    }, TypeError, "a reader member cannot be written");
  });
});

describe("K1.3 design 03: the post-state witness", () => {
  test("every record an accepted plan in this file left satisfies the post-state predicate", () => {
    assert.ok(witnessedPlans > 100, `the witness ran after ${witnessedPlans} accepted plans`);
    assert.deepEqual(witnessed, []);
  });
});
