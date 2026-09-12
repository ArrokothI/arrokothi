/**
 * K0.2 public fixture — the versioned scenario set.
 *
 * Eleven scenarios. Between them they observe every *obligation* in the accepted K0.1 worksheet's §11
 * "001 K0 boundary → assertion map" — not merely every row number. `coverage.ts` enumerates those
 * obligations individually and requires each to carry a distinguishing counterexample.
 *
 * Six of the eleven are unsafe/state-loss controls: Decision M-1's four named ones, plus W-8 case 6's
 * deadline shape and row 8's completion check, both added after round-1 review finding K02-R1-01.
 *
 * **How to read an expectation.** `obs(...)` returns a *complete* `Observation`; the call site shows
 * only the fields that differ from the quiescent defaults, and every default it does not override is
 * still asserted. That is deliberate: a forbidden mutation is an unchanged field, so the assertion
 * that catches it has to be present even when nothing interesting happens to it. The `forbids` list
 * names, in prose, which of those fields carries the forbidden-mutation meaning for that step.
 *
 * Nothing in this file implements a Kernel. These are expectations derived from the accepted
 * worksheet, against which some future K1 candidate is judged.
 */

import type { FixtureEvent, OutcomeEnvelope, WaitRecord } from "./protocol-vocabulary.ts";
import type { Observation, Scenario, ScenarioStep } from "./fixture.ts";

// -- Small builders ----------------------------------------------------------

/** Quiescent defaults, overridden per step. Every unoverridden field is still asserted. */
function obs(executionId: string, overrides: Partial<Observation> = {}): Observation {
  return {
    executionId,
    state: "READY",
    progressRevision: 0,
    progress: null,
    emissions: [],
    acknowledged: [],
    queued: [],
    terminalDispositions: [],
    liveWaitGeneration: null,
    dispatchedBatch: null,
    activationId: null,
    ingressRefused: null,
    receipt: null,
    rejection: null,
    writerEpoch: 0,
    recoveryHold: null,
    ...overrides,
  };
}

function applicationInput(eventId: string, destination: string, subscriptionClass: string): FixtureEvent {
  // W-1's category table: `external.input` is the one kind in the ordinary-application-input category.
  return { eventId, destination, kind: "external.input", category: "application_input", subscriptionClass };
}

function kernelEvent(eventId: string, destination: string, kind: string, correlation: string): FixtureEvent {
  return { eventId, destination, kind, category: "kernel_event", correlation };
}

function timeoutEvent(eventId: string, destination: string, generation: string): FixtureEvent {
  // W-9: a Kernel-minted Event with a semantic timeout class and exact wait-generation correlation.
  return { eventId, destination, kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: generation };
}

function outcome(overrides: Partial<OutcomeEnvelope> & Pick<OutcomeEnvelope, "executionId" | "activationId" | "next">): OutcomeEnvelope {
  return {
    writerEpoch: 1,
    baseProgressRevision: 0,
    progress: null,
    emissions: [],
    effects: [],
    ...overrides,
  };
}

function step(command: ScenarioStep["command"], expect: ScenarioStep["expect"]): ScenarioStep {
  return { command, expect };
}

const FAKE_RUNTIME_V1 = "fake-runtime@1";
const FAKE_RUNTIME_V2 = "fake-runtime@2";

// -- Scenario 1: 001's K0 trace ---------------------------------------------

const X = "exec-x";
const initialInput = applicationInput("in-1", X, "initial");
const billingOne = applicationInput("bq-1", X, "billing.question");
const billingTwo = applicationInput("bq-2", X, "billing.question");
const continueInput = applicationInput("cont-1", X, "continue");

/**
 * W-8's wait: dependency alternatives empty, one declared subscription. Well formed under W-1 rule 1
 * because the declaration is structurally non-empty; the subscription carries the whole wait.
 */
const subscriptionOnlyWait: WaitRecord = { dependencies: [], subscriptions: [{ subscriptionClass: "continue" }], generation: "g1" };

export const k0Trace: Scenario = {
  id: "k0-trace",
  title: "accept input → delayed fake Runtime → typed output → input wait → completion",
  sources: [
    "001 K0 deliverable (the trace itself)",
    "K0.1 worksheet W-8 (the subscription-only input wait, cases 1–5)",
    "K0.1 worksheet B-1..B-5 (batch, acknowledgment, retention, terminal disposition)",
    "execution-protocol.md, Identities and immutable exchanges (retried create)",
  ],
  // Row 1's create-identity obligations moved to `identity-create-and-activation` when round-1 review
  // finding K02-R1-01 split them out; the retry step below stays because the trace reads better with
  // it, but the authoritative row-1 evidence is that scenario's.
  k0BoundaryRows: [2, 5, 6, 8],
  isUnsafeControl: false,
  waits: { subscriptionOnlyWait },
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      {
        label: "creation binds the Execution and its initial input atomically, and X is READY",
        observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }),
        forbids: ["no externally visible CREATED phase: state is READY, not a pre-READY placeholder"],
      },
    ),
    step(
      { kind: "create_retry", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      {
        label: "a retried create under the same caller-scoped key returns the original Execution and receipt",
        observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }),
        forbids: [
          "queued must not gain a second copy of the initial input",
          "receipt must be the original, not a newly minted one",
          "progressRevision must not advance: a retry is not a second charge",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "dispatch pins a finite enumerable batch and the Execution is RUNNING",
        observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
        forbids: ["acknowledged stays empty: reservation is not acknowledgment (B-3)"],
      },
    ),
    step(
      { kind: "accept_event", event: billingOne },
      {
        label: "an Event accepted while the Activation is in flight does not alter the pinned batch",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1", "bq-1"],
          dispatchedBatch: ["in-1"],
          activationId: "act-1",
          receipt: "receipt:create:req-x",
          writerEpoch: 1,
        }),
        forbids: [
          "dispatchedBatch must stay ['in-1']: a new arrival cannot join an already-pinned batch",
          "state must stay RUNNING and no readiness may arm behind the current one (B-8, §3 row 6)",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          progress: { asked: true },
          emissions: [{ emissionId: "em-1", value: { answer: "typed output" } }],
          next: { step: "await", wait: subscriptionOnlyWait },
        }),
      },
      {
        label: "typed output plus a subscription-only input wait; W-2 finds nothing eligible, so X is WAITING",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 1,
          progress: { asked: true },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          queued: ["bq-1"],
          liveWaitGeneration: "g1",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "bq-1 must not be acknowledged: it was never in the reserved batch (B-3)",
          "W-2 step 2 must actually run for an empty dependency list: there is no 'no dependencies, so nothing to check' shortcut",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: billingTwo },
      {
        label: "W-8 case 2: application input outside every declared subscription is accepted but inert",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 1,
          progress: { asked: true },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          queued: ["bq-1", "bq-2"],
          liveWaitGeneration: "g1",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "state must stay WAITING: waking here would wake for every external.input regardless of label",
          "liveWaitGeneration must stay g1: an ineligible Event retires nothing",
          "bq-2 must appear in queued: an ineligible Event is retained, not dropped",
          "acknowledged must not grow: an ineligible Event is not acknowledged",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: continueInput },
      {
        label: "W-8 case 3: the subscribed input is eligible, so the wait and its generation retire (B-6 path B)",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { asked: true },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          queued: ["bq-1", "bq-2", "cont-1"],
          liveWaitGeneration: null,
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "acknowledged must not grow: a wake is not an acknowledgment, which requires an accepted Outcome (B-3)",
          "progressRevision must not advance: no Outcome was submitted at this boundary",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 1 },
      {
        label: "W-8 case 4: at batch bound 1 the older ineligible backlog cannot displace the wake",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { asked: true },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          queued: ["bq-1", "bq-2", "cont-1"],
          dispatchedBatch: ["cont-1"],
          activationId: "act-2",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
        }),
        forbids: [
          "dispatchedBatch must not contain bq-1 or bq-2: they are ineligible under W₀'s retired rule and are not candidates at any bound",
          "the single slot must go to cont-1, the wait-ended batch's mandatory member, not to the earlier-accepted backlog",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-2",
          writerEpoch: 2,
          baseProgressRevision: 1,
          progress: { asked: true, answered: true },
          next: { step: "complete", result: { status: "done" } },
        }),
      },
      {
        label: "W-8 case 5: completion is permitted, and the unconsumed backlog gets B-5 terminal disposition",
        observation: obs(X, {
          state: "COMPLETED",
          progressRevision: 2,
          progress: { asked: true, answered: true },
          emissions: ["em-1"],
          acknowledged: ["in-1", "cont-1"],
          queued: [],
          terminalDispositions: ["bq-1", "bq-2"],
          receipt: "receipt:outcome:act-2",
          writerEpoch: 2,
        }),
        forbids: [
          "bq-1 and bq-2 must not be acknowledged: completion acknowledges only the reserved batch (B-3)",
          "bq-1 and bq-2 must not vanish: B-5 requires an explicit recorded terminal disposition, not deletion",
        ],
      },
    ),
  ],
};

// -- Scenario 2: a delayed Runtime does not block a second Execution ---------

const Y = "exec-y";
const yInput = applicationInput("in-y1", Y, "initial");

export const delayedRuntimeNonBlocking: Scenario = {
  id: "delayed-runtime-non-blocking",
  title: "one delayed Runtime does not prevent the same coordinator dispatching another Execution",
  sources: [
    "001 K0 deliverable ('delayed fake Runtime')",
    "001 K1 ('One delayed Runtime must not prevent the same coordinator loop dispatching another Execution')",
    "K0.1 worksheet W-4 (Runtime-local work creates no waitingFor record at all)",
    "mental-model.md ('RUNNING means an Activation is unresolved, not that a process is making progress')",
  ],
  // §11 attribution is row 5(g) — W-4's "Runtime-local work creates no waitingFor record". The
  // non-blocking property this scenario also observes comes from 001 K0/K1, not from §11, and is
  // carried by contract criterion C2 and `delayed-runtime.test.ts` rather than by the boundary map.
  k0BoundaryRows: [5],
  isUnsafeControl: false,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "create", executionId: Y, requestKey: "req-y", initialInput: yInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "Y created", observation: obs(Y, { queued: ["in-y1"], receipt: "receipt:create:req-y" }) },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "X is dispatched and its Runtime delays: the Activation stays unresolved",
        observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-x1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
      },
    ),
    step(
      { kind: "dispatch", executionId: Y, bound: 4 },
      {
        label: "Y is dispatched while X's Activation is still unresolved",
        observation: obs(Y, { state: "RUNNING", queued: ["in-y1"], activationId: "act-y1", dispatchedBatch: ["in-y1"], receipt: "receipt:create:req-y", writerEpoch: 1 }),
        forbids: ["Y must reach RUNNING: a delayed X may not hold the coordinator's dispatch loop"],
      },
    ),
    step(
      { kind: "inspect", executionId: X },
      {
        label: "the delayed X is still RUNNING with no Kernel-visible wait (W-4)",
        observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-x1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
        forbids: [
          "liveWaitGeneration must stay null: Runtime-local work creates no waitingFor record at all",
          "state must not be reported as WAITING: a slow Activation is unresolved, not a Kernel-visible dependency",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: Y, activationId: "act-y1", progress: { done: true }, next: { step: "complete", result: { ok: true } } }),
      },
      {
        label: "Y completes independently while X is still unresolved",
        observation: obs(Y, {
          state: "COMPLETED",
          progressRevision: 1,
          progress: { done: true },
          acknowledged: ["in-y1"],
          receipt: "receipt:outcome:act-y1",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      { kind: "inspect", executionId: X },
      {
        label: "Y's completion changed nothing about X",
        observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-x1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
        forbids: ["every X field must be unchanged: unrelated Executions compute independently"],
      },
    ),
  ],
};

// -- Control 1 (M-1 row 3): duplicate and conflicting Outcome ---------------

const acceptedOutcome = outcome({
  executionId: X,
  activationId: "act-1",
  progress: { cursor: 1 },
  emissions: [{ emissionId: "em-1", value: { partial: "a" } }],
  next: { step: "continue" },
});

/** Same submitted identity, different content. OA-2: a conflict, rejected, never merged or patched. */
const conflictingOutcome = outcome({
  executionId: X,
  activationId: "act-1",
  progress: { cursor: 99 },
  emissions: [{ emissionId: "em-1", value: { partial: "DIFFERENT" } }],
  next: { step: "continue" },
});

export const duplicateAndConflictingOutcome: Scenario = {
  id: "control-duplicate-conflicting-outcome",
  title: "unsafe control: exact duplicate replays its receipt; a conflicting duplicate is rejected inert",
  sources: [
    "K0.1 worksheet Decision M-1, control from §11 row 3",
    "K0.1 worksheet OA-2 (idempotent replay before validation), OA-5 (rejection is inert)",
    "execution-protocol.md, Outcome acceptance algorithm steps 2–3",
  ],
  k0BoundaryRows: [3],
  isUnsafeControl: true,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      { label: "X dispatched", observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }) },
    ),
    step(
      { kind: "submit_outcome", outcome: acceptedOutcome },
      {
        label: "the Outcome is accepted once: one revision, one emission, whole batch acknowledged",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { cursor: 1 },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      { kind: "resubmit_outcome", outcome: acceptedOutcome },
      {
        label: "an exact duplicate returns the original receipt without re-running acceptance",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { cursor: 1 },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "progressRevision must stay 1: duplicate delivery is permitted, duplicate progress acceptance is not",
          "emissions must stay ['em-1']: replay must not re-publish an accepted emission",
          "rejection must stay null: an exact duplicate is not an error",
        ],
      },
    ),
    step(
      { kind: "submit_outcome", outcome: conflictingOutcome },
      {
        label: "a same-identity, different-content submission is a conflict, rejected with zero mutation",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { cursor: 1 },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          receipt: "receipt:outcome:act-1",
          rejection: { classification: "duplicate_conflict", reason: "accepted Outcome for this identity has different content" },
          writerEpoch: 1,
        }),
        forbids: [
          "progress must stay {cursor:1}: a conflict is never merged or patched into accepted state",
          "emissions must stay ['em-1']: the conflicting emission body must not be recorded",
          "receipt must stay the original: a rejection mints no receipt",
        ],
      },
    ),
  ],
};

// -- Control 2 (M-1 row 5): stale timer and lost wake ------------------------

const earlyResult = kernelEvent("res-1", X, "effect.result", "corr-1");
const laterResult = kernelEvent("res-2", X, "effect.result", "corr-2");

const waitOnCorr1: WaitRecord = { dependencies: [{ kinds: ["effect.result"], correlation: "corr-1" }], subscriptions: [], deadline: 1_000, generation: "g1" };
const waitOnCorr2: WaitRecord = { dependencies: [{ kinds: ["effect.result"], correlation: "corr-2" }], subscriptions: [], deadline: 2_000, generation: "g2" };
const timeoutForG2 = timeoutEvent("to-g2", X, "g2");

export const staleTimerAndLostWake: Scenario = {
  id: "control-stale-timer-and-lost-wake",
  title: "unsafe control: a result accepted before the wait is not lost, and a stale timer wakes nothing",
  sources: [
    "K0.1 worksheet Decision M-1, control from §11 row 5",
    "K0.1 worksheet W-2 (ordered registration), W-3 (generation fencing scope), W-9 (the timeout Event)",
    "K0.1 worksheet B-6 path A, B-7 path B, B-8",
    "kernel.md ('stale timers cannot wake a replacement wait'), CL-2",
  ],
  k0BoundaryRows: [5],
  isUnsafeControl: true,
  waits: { waitOnCorr1, waitOnCorr2 },
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      { label: "X dispatched", observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }) },
    ),
    step(
      { kind: "accept_event", event: earlyResult },
      {
        label: "the result arrives before the wait exists; no wait is live so no readiness is created (B-8)",
        observation: obs(X, { state: "RUNNING", queued: ["in-1", "res-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
        forbids: ["dispatchedBatch must stay ['in-1']: a new arrival cannot join an already-pinned batch"],
      },
    ),
    step(
      { kind: "submit_outcome", outcome: outcome({ executionId: X, activationId: "act-1", progress: { phase: "awaiting" }, next: { step: "await", wait: waitOnCorr1 } }) },
      {
        label: "W-2 step 2 finds the already-accepted eligible result, so X is READY immediately (B-6 path A)",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { phase: "awaiting" },
          acknowledged: ["in-1"],
          queued: ["res-1"],
          liveWaitGeneration: null,
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "state must not be WAITING: registering and then never checking the mailbox is exactly the lost wake this control exists to catch",
          "liveWaitGeneration must be null: g1 is created and retired inside the same transaction",
          "res-1 must stay queued and unacknowledged: waking is not acknowledging",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "the wait-ended batch carries its mandatory member",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { phase: "awaiting" },
          acknowledged: ["in-1"],
          queued: ["res-1"],
          dispatchedBatch: ["res-1"],
          activationId: "act-2",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
        }),
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-2", writerEpoch: 2, baseProgressRevision: 1, progress: { phase: "awaiting-2" }, next: { step: "await", wait: waitOnCorr2 } }),
      },
      {
        label: "a second wait registers under a new generation g2, and X is WAITING",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 2,
          progress: { phase: "awaiting-2" },
          acknowledged: ["in-1", "res-1"],
          queued: [],
          liveWaitGeneration: "g2",
          receipt: "receipt:outcome:act-2",
          writerEpoch: 2,
        }),
      },
    ),
    step(
      { kind: "deliver_timer", executionId: X, generation: "g1", timeoutEvent: timeoutEvent("to-g1", X, "g1") },
      {
        label: "a timer naming the superseded generation g1 is a no-op",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 2,
          progress: { phase: "awaiting-2" },
          acknowledged: ["in-1", "res-1"],
          queued: [],
          liveWaitGeneration: "g2",
          receipt: "receipt:outcome:act-2",
          writerEpoch: 2,
        }),
        forbids: [
          "queued must stay empty: a stale timer creates no timeout Event",
          "liveWaitGeneration must stay g2: a stale timer retires nothing",
          "state must stay WAITING: a stale timer cannot wake a replacement wait",
        ],
      },
    ),
    step(
      { kind: "deliver_timer", executionId: X, generation: "g2", timeoutEvent: timeoutForG2 },
      {
        label: "the current generation's deadline expires: exactly one timeout Event, and X is READY (B-7 path B)",
        observation: obs(X, {
          state: "READY",
          progressRevision: 2,
          progress: { phase: "awaiting-2" },
          acknowledged: ["in-1", "res-1"],
          queued: ["to-g2"],
          liveWaitGeneration: null,
          receipt: "receipt:outcome:act-2",
          writerEpoch: 2,
        }),
      },
    ),
    step(
      { kind: "deliver_timer", executionId: X, generation: "g2", timeoutEvent: timeoutForG2 },
      {
        label: "a re-delivered timer for an already-accepted expiry is idempotent (W-9)",
        observation: obs(X, {
          state: "READY",
          progressRevision: 2,
          progress: { phase: "awaiting-2" },
          acknowledged: ["in-1", "res-1"],
          queued: ["to-g2"],
          liveWaitGeneration: null,
          receipt: "receipt:outcome:act-2",
          writerEpoch: 2,
        }),
        forbids: [
          "queued must stay ['to-g2']: at most one timeout Event exists per generation",
          "no second readiness and no second logical timeout may be created",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: laterResult },
      {
        label: "W-3's other half: an authenticated result is never generation-fenced and survives the timeout",
        observation: obs(X, {
          state: "READY",
          progressRevision: 2,
          progress: { phase: "awaiting-2" },
          acknowledged: ["in-1", "res-1"],
          queued: ["to-g2", "res-2"],
          liveWaitGeneration: null,
          receipt: "receipt:outcome:act-2",
          writerEpoch: 2,
        }),
        forbids: ["res-2 must be accepted and retained: a timeout is never proof the awaited work did not happen (CL-2)"],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "timeout and result are both accepted facts, delivered in acceptance order for the Runtime to interpret",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 2,
          progress: { phase: "awaiting-2" },
          acknowledged: ["in-1", "res-1"],
          queued: ["to-g2", "res-2"],
          dispatchedBatch: ["to-g2", "res-2"],
          activationId: "act-3",
          receipt: "receipt:outcome:act-2",
          writerEpoch: 3,
        }),
        forbids: ["the timeout must not suppress the later result for the same correlation: preserve both facts"],
      },
    ),
  ],
};

// -- Control 3 (M-1 row 7): cancellation versus completion, both orders -----

const losingContinue = outcome({ executionId: X, activationId: "act-1", progress: { cursor: 5 }, emissions: [{ emissionId: "em-late", value: { late: true } }], next: { step: "continue" } });
const losingComplete = outcome({ executionId: X, activationId: "act-1", progress: { cursor: 6 }, next: { step: "complete", result: { status: "too late" } } });
const winningComplete = outcome({ executionId: Y, activationId: "act-y1", progress: { cursor: 1 }, next: { step: "complete", result: { status: "done" } } });

const cancellationRejection = {
  classification: "cancellation_terminal_conflict" as const,
  reason: "cancellation accepted before Outcome acceptance",
};

/** The fenced observation is asserted identically after four separate submissions. */
const fencedObservation: Observation = obs(X, {
  state: "CANCELLED",
  progressRevision: 0,
  progress: null,
  emissions: [],
  acknowledged: [],
  queued: [],
  terminalDispositions: ["in-1"],
  dispatchedBatch: null,
  receipt: "receipt:create:req-x",
  rejection: cancellationRejection,
  writerEpoch: 1,
});

export const cancelVersusComplete: Scenario = {
  id: "control-cancel-versus-complete",
  title: "unsafe control: the first accepted terminal decision wins, in both orders",
  sources: [
    "K0.1 worksheet Decision M-1, control from §11 row 7, including its named assertions",
    "K0.1 worksheet CX-1, CX-2, CX-6 (cancellation-fenced rejection and exact retry)",
    "K0.1 worksheet OA-2 (accepted receipt replay), OA-5 (rejection is inert), B-5",
    "kernel.md, Recovery and cancellation",
  ],
  k0BoundaryRows: [7, 8, 10],
  isUnsafeControl: true,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      { label: "X dispatched; the batch is reserved but unacknowledged", observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }) },
    ),
    step(
      { kind: "accept_cancellation", executionId: X },
      {
        label: "cancellation request acceptance is the semantic fence and the control path reaches CANCELLED",
        observation: obs(X, {
          state: "CANCELLED",
          terminalDispositions: ["in-1"],
          dispatchedBatch: null,
          receipt: "receipt:create:req-x",
          writerEpoch: 1,
        }),
        forbids: [
          "acknowledged must stay empty: the reserved batch is disposed under B-5, never acknowledged",
          "no extra lifecycle state may appear: a pending/applied marker cannot defer the semantic fence",
        ],
      },
    ),
    step(
      { kind: "submit_outcome", outcome: losingContinue },
      {
        label: "a later `continue` loses entirely under CX-6",
        observation: fencedObservation,
        forbids: [
          "progress must stay null: installing the loser's progress is the failure M-1 names explicitly",
          "progressRevision must stay 0",
          "emissions must stay empty: em-late must not be accepted",
          "acknowledged must stay empty: the losing Outcome acknowledges none of its reserved batch",
          "liveWaitGeneration must stay null and no readiness or next-state transition may be created",
        ],
      },
    ),
    step(
      { kind: "resubmit_outcome", outcome: losingContinue },
      {
        label: "an exact retry returns the same recorded rejection, not a manufactured receipt",
        observation: fencedObservation,
        forbids: [
          "rejection must be byte-identical to the recorded one: OA-2's accepted-receipt rule does not apply because no Outcome was accepted",
          "state must stay CANCELLED: retry cannot change the cancellation winner",
          "terminalDispositions must stay ['in-1']: retry cannot change the Event dispositions either",
        ],
      },
    ),
    step(
      { kind: "submit_outcome", outcome: losingComplete },
      {
        label: "a later `complete` loses identically: the fence does not depend on the next step",
        observation: fencedObservation,
        forbids: [
          "state must stay CANCELLED: a losing `complete` must not reach COMPLETED",
          "progress must stay null: suppressing only the next state while installing losing progress is a failing control, not a conforming variant",
        ],
      },
    ),
    step(
      { kind: "create", executionId: Y, requestKey: "req-y", initialInput: yInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "the reverse order begins: Y created", observation: obs(Y, { queued: ["in-y1"], receipt: "receipt:create:req-y" }) },
    ),
    step(
      { kind: "dispatch", executionId: Y, bound: 4 },
      { label: "Y dispatched", observation: obs(Y, { state: "RUNNING", queued: ["in-y1"], activationId: "act-y1", dispatchedBatch: ["in-y1"], receipt: "receipt:create:req-y", writerEpoch: 1 }) },
    ),
    step(
      { kind: "submit_outcome", outcome: winningComplete },
      {
        label: "Y's completion is accepted first",
        observation: obs(Y, {
          state: "COMPLETED",
          progressRevision: 1,
          progress: { cursor: 1 },
          acknowledged: ["in-y1"],
          receipt: "receipt:outcome:act-y1",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      { kind: "accept_cancellation", executionId: Y },
      {
        label: "a later cancellation reports the terminal result without reopening it",
        observation: obs(Y, {
          state: "COMPLETED",
          progressRevision: 1,
          progress: { cursor: 1 },
          acknowledged: ["in-y1"],
          receipt: "receipt:outcome:act-y1",
          writerEpoch: 1,
        }),
        forbids: [
          "state must stay COMPLETED: terminal states do not reopen",
          "terminalDispositions must stay empty: the batch was acknowledged, so there is nothing to dispose",
          "rejection must stay null: cancelling a completed Execution is not an Outcome rejection",
        ],
      },
    ),
    step(
      { kind: "resubmit_outcome", outcome: winningComplete },
      {
        label: "an exact retry of the Outcome that was accepted first still returns its original receipt",
        observation: obs(Y, {
          state: "COMPLETED",
          progressRevision: 1,
          progress: { cursor: 1 },
          acknowledged: ["in-y1"],
          receipt: "receipt:outcome:act-y1",
          writerEpoch: 1,
        }),
        forbids: [
          "progressRevision must stay 1: replay after a later cancellation introduces no new mutations",
          "rejection must stay null: this identity was accepted, so OA-2 applies rather than CX-6",
        ],
      },
    ),
  ],
};

// -- Control 4 (M-1 row 9): missing checkpoint or compatible code -----------

export const missingCheckpointCode: Scenario = {
  id: "control-missing-checkpoint-code",
  title: "unsafe control: unavailable compatible code yields an explicit hold, never a fresh-restored fabrication",
  sources: [
    "K0.1 worksheet Decision M-1, control from §11 row 9",
    "K0.1 worksheet PC-4 (codec/version pinned, not inferred), PC-5 (missing state is truthful)",
    "kernel.md, Recovery and cancellation ('Checkpoint/code/resource unavailable')",
    "mental-model.md ('keep the Execution semantically RUNNING ... but expose an operational recovery-held condition')",
  ],
  k0BoundaryRows: [9],
  isUnsafeControl: true,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X is created pinned to fake-runtime@1", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      { label: "X dispatched", observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }) },
    ),
    step(
      { kind: "submit_outcome", outcome: outcome({ executionId: X, activationId: "act-1", progress: { cursor: 7 }, next: { step: "continue" } }) },
      {
        label: "accepted progress exists at revision 1",
        observation: obs(X, { state: "READY", progressRevision: 1, progress: { cursor: 7 }, acknowledged: ["in-1"], receipt: "receipt:outcome:act-1", writerEpoch: 1 }),
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "READY after a `continue` with an empty mailbox dispatches an empty batch, which is correct",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { cursor: 7 },
          acknowledged: ["in-1"],
          dispatchedBatch: [],
          activationId: "act-2",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
        }),
        forbids: ["dispatchedBatch must be [] and not null: the Runtime was asked to continue, not to read something"],
      },
    ),
    step(
      { kind: "recover", executionId: X, availableDefinitionRevisions: [FAKE_RUNTIME_V2] },
      {
        label: "the pinned revision's code is unavailable: an explicit, inspectable recovery hold",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { cursor: 7 },
          acknowledged: ["in-1"],
          dispatchedBatch: [],
          activationId: "act-2",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
          recoveryHold: { reason: "pinned definition revision fake-runtime@1 is unavailable" },
        }),
        forbids: [
          "progress must stay {cursor:7}: an empty or fresh Runtime state must never be presented as the restored one",
          "progressRevision must stay 1: recovery must not discard accepted progress or silently start over",
          "state must stay RUNNING: the Activation is still unresolved, and no semantic wait may be invented for it",
        ],
      },
    ),
    step(
      { kind: "recover", executionId: X, availableDefinitionRevisions: [FAKE_RUNTIME_V1, FAKE_RUNTIME_V2] },
      {
        label: "with compatible code available the hold clears and accepted progress is intact",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { cursor: 7 },
          acknowledged: ["in-1"],
          dispatchedBatch: [],
          activationId: "act-2",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
        }),
        forbids: ["the accepted progress and revision must survive the held period unchanged"],
      },
    ),
  ],
};

// -- Scenario 7: Effect refusal, observed through the independent ledger ----

const effectProposingOutcome = outcome({
  executionId: X,
  activationId: "act-1",
  progress: { cursor: 1 },
  emissions: [{ emissionId: "em-1", value: { partial: "a" } }],
  effects: [{ proposalKey: "p1", operation: "artifact.publish", input: { artifact: "draft-1" } }],
  next: { step: "continue" },
});

export const effectRefusalAndSinkAttribution: Scenario = {
  id: "effect-refusal-and-sink-attribution",
  title: "an Outcome proposing an Effect is refused at envelope validation, with zero independent-ledger dispatch",
  sources: [
    "K0.1 worksheet EF-1, EF-2 (K1 refuses Effects at whole-envelope validation)",
    "K0.1 worksheet §11 row 4, OA-3 (whole-envelope validation, all-or-nothing), OA-5",
    "001 K0 deliverable (the fake operation sink with an independent ledger)",
  ],
  k0BoundaryRows: [4],
  isUnsafeControl: false,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }), ledgerCount: 0 },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      { label: "X dispatched", observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }), ledgerCount: 0 },
    ),
    step(
      { kind: "submit_outcome", outcome: effectProposingOutcome },
      {
        label: "the whole envelope is rejected before any Effect intent, ID or proposal-key binding exists",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          dispatchedBatch: ["in-1"],
          activationId: "act-1",
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "Effect proposals are not supported before K2" },
          writerEpoch: 1,
        }),
        forbids: [
          "progressRevision must stay 0 and progress null: the rest of the Outcome is rejected too, not silently split",
          "emissions must stay empty: em-1 rides in the same rejected envelope",
          "acknowledged must stay empty: a rejected Outcome acknowledges nothing",
          "the independent ledger must record zero attempts: refusal with no independent observation would be an unsupported claim",
        ],
        ledgerCount: 0,
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-1", progress: { cursor: 1 }, emissions: [{ emissionId: "em-1", value: { partial: "a" } }], next: { step: "continue" } }),
      },
      {
        label: "the same Activation still accepts a well-formed Outcome: the refusal did not wedge the exchange",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { cursor: 1 },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: ["rejection must clear to null: a recorded rejection is not a permanent protocol failure"],
        ledgerCount: 0,
      },
    ),
  ],
};

// -- Scenario 8: create identity and Activation identity (§11 rows 1, 2) ----

/**
 * Round-1 review finding K02-R1-01: row 1's *conflict* half and row 2's *identity* half were both
 * unobserved. Row 1 turns on a create under the same key with different content being rejected rather
 * than silently applied as an edit; row 2 turns on Activation IDs, not on epochs — a new exchange must
 * never reuse an ID, while an authorized takeover of a still-unresolved exchange must keep it (ID-9).
 */
export const createAndActivationIdentity: Scenario = {
  id: "identity-create-and-activation",
  title: "create keys conflict on changed content; exchanges get new Activation IDs, takeovers do not",
  sources: [
    "K0.1 worksheet §11 row 1 (ID-1, ID-2, ID-6, ID-7) and row 2 (ID-3, ID-4, ID-9)",
    "execution-protocol.md, Identities and immutable exchanges",
  ],
  k0BoundaryRows: [1, 2],
  isUnsafeControl: false,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "create_retry", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      {
        label: "same key, same content: the original Execution and receipt come back",
        observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }),
        forbids: ["no second Execution, no second queued input, no new receipt"],
      },
    ),
    step(
      {
        kind: "create_retry",
        executionId: X,
        requestKey: "req-x",
        initialInput: applicationInput("in-DIFFERENT", X, "initial"),
        definitionRevision: FAKE_RUNTIME_V1,
      },
      {
        label: "same key, different content: a conflict, never a silent edit",
        observation: obs(X, {
          queued: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "duplicate_conflict", reason: "create request key req-x was accepted with different content" },
        }),
        forbids: [
          "queued must stay ['in-1']: the conflicting input must not replace or join the accepted one",
          "receipt must stay the original: a conflict mints no receipt",
          "a fresh intentional run needs a fresh key; reusing one must not be a way to edit an accepted create",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "the first exchange opens as act-1",
        observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
      },
    ),
    step(
      { kind: "takeover", executionId: X },
      {
        label: "ID-9: an authorized takeover of a still-unresolved exchange keeps the Activation ID and advances the epoch",
        observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 2 }),
        forbids: [
          "activationId must stay act-1: a takeover is the same exchange under a new writer, not a new exchange",
          "dispatchedBatch must stay ['in-1']: a takeover cannot replace pinned input with new mailbox content",
          "acknowledged must stay empty: a takeover acknowledges nothing",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-1", writerEpoch: 2, progress: { step: 1 }, next: { step: "continue" } }),
      },
      {
        label: "the taken-over exchange resolves under the advanced epoch",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { step: 1 },
          acknowledged: ["in-1"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
        }),
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "a semantically different dispatch after the prior exchange resolved gets a new Activation ID",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { step: 1 },
          acknowledged: ["in-1"],
          activationId: "act-2",
          dispatchedBatch: [],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 3,
        }),
        forbids: ["activationId must not be act-1: two semantically different exchanges never share an Activation ID"],
      },
    ),
  ],
};

// -- Scenario 9: whole-envelope validation is all-or-nothing (§11 rows 3, 5a) --

/**
 * Round-1 review finding K02-R1-01: row 3's "a failure partway through acceptance leaves zero partial
 * state" and row 5(a)'s structural well-formedness were asserted only as predicates, never as an
 * observable rejection of a submitted Outcome. Both are envelope validation (OA-3), so both belong on
 * the same scenario: the point is that a valid-looking prefix earns nothing.
 */
export const wholeEnvelopeValidation: Scenario = {
  id: "control-whole-envelope-validation",
  title: "a failure anywhere in envelope validation accepts nothing, including a valid prefix",
  sources: [
    "K0.1 worksheet §11 row 3 (OA-3, OA-5) and row 5(a) (W-1 well-formedness)",
    "execution-protocol.md, Outcome acceptance algorithm step 3",
    "K0.1 worksheet W-1 well-formedness case 1 (both lists empty, deadline does not rescue it)",
  ],
  k0BoundaryRows: [3, 5],
  isUnsafeControl: false,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      { label: "X dispatched", observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }) },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          progress: { cursor: 1 },
          // Emission 1 is perfectly valid. Emission 2 reuses its key, which step 3 of the acceptance
          // algorithm rejects ("unique proposal/emission keys"). The prefix earns nothing.
          emissions: [
            { emissionId: "em-1", value: { partial: "a" } },
            { emissionId: "em-1", value: { partial: "b" } },
          ],
          next: { step: "continue" },
        }),
      },
      {
        label: "a duplicate emission key rejects the whole envelope, and the valid first emission is not kept",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "duplicate emission key em-1" },
          writerEpoch: 1,
        }),
        forbids: [
          "emissions must stay empty: accepting em-1 and rejecting em-2 would be exactly the partial state row 3 forbids",
          "progressRevision must stay 0 and progress null: the valid progress in the same envelope is rejected with it",
          "acknowledged must stay empty: a rejected Outcome acknowledges no part of its batch",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          progress: { cursor: 1 },
          // W-1 well-formedness case 1: both lists empty. The deadline does not rescue it.
          next: { step: "await", wait: { dependencies: [], subscriptions: [], deadline: 5_000, generation: "g-bad" } },
        }),
      },
      {
        label: "a structurally empty wait declaration is refused at envelope validation, deadline notwithstanding",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "wait declaration is structurally empty" },
          writerEpoch: 1,
        }),
        forbids: [
          "liveWaitGeneration must stay null: no registration exists for a refused wait, and g-bad must never appear",
          "state must stay RUNNING: a refused wait does not move the Execution",
          "a deadline must not make a malformed declaration acceptable",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-1", progress: { cursor: 1 }, emissions: [{ emissionId: "em-1", value: { partial: "a" } }], next: { step: "continue" } }),
      },
      {
        label: "a well-formed envelope is still accepted afterwards: rejection is inert, not a wedge",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { cursor: 1 },
          emissions: ["em-1"],
          acknowledged: ["in-1"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
      },
    ),
  ],
};

// -- Scenario 10: W-8 case 6 — a subscription-only wait with a deadline ------

/**
 * Round-1 review finding K02-R1-01: W-8 case 6 was missing, and a dependency-only deadline scenario is
 * not a substitute for it. The case is sharp precisely because the wait has **no dependency
 * alternatives at all**, so nothing in it could ever "match" a timeout — the timeout Event is B-7's
 * mandatory batch member by construction rather than by matching, and it must still win the single
 * slot at bound 1 over an ineligible Event accepted earlier. Revision 8 of the worksheet could not
 * answer this shape consistently; the fixture has to.
 */
const subscriptionWaitWithDeadline: WaitRecord = {
  dependencies: [],
  subscriptions: [{ subscriptionClass: "continue" }],
  deadline: 1_000,
  generation: "gd1",
};
const alreadyDueWait: WaitRecord = {
  dependencies: [],
  subscriptions: [{ subscriptionClass: "continue" }],
  deadline: 1,
  generation: "gd2",
};
const timeoutForGd1 = timeoutEvent("to-gd1", X, "gd1");

export const subscriptionWaitDeadline: Scenario = {
  id: "control-subscription-wait-deadline",
  title: "unsafe control: W-8 case 6 — a subscription-only wait's deadline, and B-7's mandatory timeout member",
  sources: [
    "K0.1 worksheet W-8 case 6 (the deadline case a subscription-only wait makes sharp)",
    "K0.1 worksheet B-7 paths A and B, W-9 (the timeout Event), §11 row 5(c) and 5(e)",
    "K0.1 worksheet W-1 well-formedness case 3 (a deadline bounds a wait it cannot otherwise end)",
  ],
  k0BoundaryRows: [5],
  isUnsafeControl: true,
  waits: { subscriptionWaitWithDeadline, alreadyDueWait },
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }) },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      { label: "X dispatched", observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }) },
    ),
    step(
      { kind: "accept_event", event: billingOne },
      {
        label: "an ineligible input is accepted earlier than everything that follows",
        observation: obs(X, { state: "RUNNING", queued: ["in-1", "bq-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-1", progress: { phase: "waiting" }, next: { step: "await", wait: subscriptionWaitWithDeadline } }),
      },
      {
        label: "the subscription-only wait with a deadline registers durably: nothing eligible is queued",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 1,
          progress: { phase: "waiting" },
          acknowledged: ["in-1"],
          queued: ["bq-1"],
          liveWaitGeneration: "gd1",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: ["bq-1 must not wake it: billing.question is outside the declared subscription"],
      },
    ),
    step(
      { kind: "deliver_timer", executionId: X, generation: "gd1", timeoutEvent: timeoutForGd1 },
      {
        label: "B-7 path B: the current generation's deadline expires and mints exactly one timeout Event",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { phase: "waiting" },
          acknowledged: ["in-1"],
          queued: ["bq-1", "to-gd1"],
          liveWaitGeneration: null,
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: ["the wait has no dependency alternatives at all, so the timeout must arrive by construction, not by matching"],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 1 },
      {
        label: "W-8 case 6 at bound 1: the batch is exactly the timeout Event, not the earlier ineligible backlog",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { phase: "waiting" },
          acknowledged: ["in-1"],
          queued: ["bq-1", "to-gd1"],
          activationId: "act-2",
          dispatchedBatch: ["to-gd1"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
        }),
        forbids: [
          "dispatchedBatch must not be ['bq-1']: bq-1 was accepted first, and ordinary acceptance-order selection would have taken the slot",
          "the timeout Event is the species' mandatory member and is retained before any other candidate",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-2",
          writerEpoch: 2,
          baseProgressRevision: 1,
          progress: { phase: "re-waiting" },
          next: { step: "await", wait: alreadyDueWait },
        }),
      },
      {
        label: "B-7 path A: a deadline already due at registration yields READY with a timeout Event, never a durable WAITING",
        observation: obs(X, {
          state: "READY",
          progressRevision: 2,
          progress: { phase: "re-waiting" },
          acknowledged: ["in-1", "to-gd1"],
          queued: ["bq-1", "to-gd2"],
          liveWaitGeneration: null,
          receipt: "receipt:outcome:act-2",
          writerEpoch: 2,
        }),
        forbids: [
          "state must not be WAITING: W-2 step 3 evaluates an already-due deadline before persisting, and a past deadline is never persisted as live",
          "liveWaitGeneration must be null: gd2 is created and retired inside the one acceptance transaction",
          "bq-1 must still be queued and unacknowledged after two wait generations came and went",
        ],
      },
    ),
  ],
};

// -- Scenario 11: completion obligations and terminal ingress (§11 rows 8, 6) --

/**
 * Round-1 review finding K02-R1-01: row 8's completion check was not observed at all, and row 6's
 * terminal arm of B-8 was missing.
 *
 * CX-3 has two clauses. The first — "no newly proposed Effects in that same Outcome" — is observable
 * now, and is the only form "unresolved owned work" can take while K1 refuses Effects outright: work
 * proposed in the completing Outcome is by construction unaccounted for. The second clause, about
 * *previously owned* obligations, cannot arise until Effects exist; CX-3 says so itself ("K1 without
 * Effects satisfies this trivially ... K2 is where the check becomes non-trivial"), and this packet's
 * contract assigns it to K2.4 rather than pretending to observe it.
 *
 * The rejection reason is distinct from the plain Effect refusal on purpose: a candidate that rejects
 * `complete` merely because Effects are unsupported has not demonstrated the completion check, and the
 * oracle must be able to tell those two answers apart.
 */
export const completionObligations: Scenario = {
  id: "control-completion-obligations",
  title: "unsafe control: completion with unaccounted owned work is rejected, and terminal ingress is refused",
  sources: [
    "K0.1 worksheet §11 row 8 (CX-3, CX-4, B-3, B-5) and row 6 (B-8's terminal arm)",
    "execution-protocol.md, Completion check",
    "execution-protocol.md, Input reservation ('Terminal ingress refuses new ordinary input')",
  ],
  k0BoundaryRows: [6, 8],
  isUnsafeControl: true,
  steps: [
    step(
      { kind: "create", executionId: X, requestKey: "req-x", initialInput, definitionRevision: FAKE_RUNTIME_V1 },
      { label: "X created", observation: obs(X, { queued: ["in-1"], receipt: "receipt:create:req-x" }), ledgerCount: 0 },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "X dispatched",
        observation: obs(X, { state: "RUNNING", queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1 }),
        ledgerCount: 0,
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          progress: { done: true },
          effects: [{ proposalKey: "p1", operation: "artifact.publish", input: { artifact: "draft-1" } }],
          next: { step: "complete", result: { status: "done" } },
        }),
      },
      {
        label: "`complete` proposing new owned work is rejected outright, and the Execution does not become COMPLETED",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "completion proposes owned work that is not accounted for" },
          writerEpoch: 1,
        }),
        forbids: [
          "state must stay RUNNING: an Execution must not reach COMPLETED with unaccounted owned work",
          "the reason must name the completion obligation, not merely that Effects are unsupported: rejecting for the wrong reason does not demonstrate the check",
          "the independent ledger must stay empty: nothing was dispatched on the way to this rejection",
        ],
        ledgerCount: 0,
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-1", progress: { done: true }, next: { step: "complete", result: { status: "done" } } }),
      },
      {
        label: "with nothing owned outstanding, the same completion is accepted",
        observation: obs(X, {
          state: "COMPLETED",
          progressRevision: 1,
          progress: { done: true },
          acknowledged: ["in-1"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        ledgerCount: 0,
      },
    ),
    step(
      { kind: "accept_event", event: applicationInput("late-1", X, "continue") },
      {
        label: "terminal ingress refuses new ordinary input rather than queueing it",
        observation: obs(X, {
          state: "COMPLETED",
          progressRevision: 1,
          progress: { done: true },
          acknowledged: ["in-1"],
          queued: [],
          ingressRefused: "late-1",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "queued must stay empty: a refused ingress is not an accepted mailbox fact",
          "terminalDispositions must stay empty: B-5 disposes input that was accepted before the terminal decision, not input refused after it",
          "no readiness may be created: no wait generation is live in a terminal state (B-8, W-3)",
        ],
        ledgerCount: 0,
      },
    ),
  ],
};

// -- The published set -------------------------------------------------------

export const ALL_SCENARIOS: readonly Scenario[] = [
  k0Trace,
  delayedRuntimeNonBlocking,
  createAndActivationIdentity,
  wholeEnvelopeValidation,
  duplicateAndConflictingOutcome,
  staleTimerAndLostWake,
  subscriptionWaitDeadline,
  cancelVersusComplete,
  completionObligations,
  missingCheckpointCode,
  effectRefusalAndSinkAttribution,
];

/** Decision M-1's four named unsafe/state-loss controls, in its own order. */
export const UNSAFE_CONTROLS: readonly Scenario[] = ALL_SCENARIOS.filter((scenario) => scenario.isUnsafeControl);
