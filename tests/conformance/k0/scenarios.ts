/**
 * K0.2 public fixture — the versioned scenario set.
 *
 * Fifteen scenarios. Their locally observable assertions reconcile to the accepted K0.1 worksheet's §11
 * "001 K0 boundary → assertion map" — not merely every row number, and not merely every prose grouping
 * inside a row. `coverage.ts` enumerates scenario assertions with discriminating counterexamples,
 * negative corpus invariants and explicit later assignments for facts the port cannot observe.
 *
 * Six of the fifteen are unsafe/state-loss controls: Decision M-1's four named ones, plus W-8 case 6's
 * deadline shape and row 8's completion check, both added after round-1 review finding K02-R1-01.
 *
 * **What round 3 changed.** Review finding K02-R3-01 reopened K02-R1-01: several §11 assertions were
 * counted as covered while the only thing standing behind them was `forbids` prose, a green test of
 * the fixture's own helper, or a counterexample belonging to a neighbouring rule. The corpus now
 * submits the waits whose *grammar* W-1 fixes, registers a valid-but-inert wait to prove structure is
 * not satisfiability, observes wait-ended readiness and Effect-intent absence as facts rather than
 * claims, and exercises a superseded writer epoch so LP-1 has evidence of its own.
 *
 * **How to read an expectation.** `obs(...)` returns a *complete* `Observation`; the call site shows
 * only the fields that differ from the quiescent defaults, and every default it does not override is
 * still asserted. That is deliberate: a forbidden mutation is an unchanged field, so the assertion
 * that catches it has to be present even when nothing interesting happens to it. The `forbids` list
 * names, in prose, which of those fields carries the forbidden-mutation meaning for that step.
 *
 * **How to read `writerEpoch`.** It is written as an **attempt ordinal inside one exchange**, not as
 * an absolute counter: every new Activation ID starts again at 1, and the only value above 1 in the
 * whole corpus is `identity-create-and-activation`'s act-1 after its authenticated takeover. The
 * runner binds these ordinals to whatever epochs a candidate actually reports, per exchange, and
 * relates them only within one exchange (`EpochRelation` in `fixture.ts`). Round-13 review finding
 * K02-R13-01 is why: six scenarios used to advance the epoch at each new Activation ID and one held
 * it fixed across the same transition, so literal comparison silently decided the reset-or-continue
 * question ID-4 leaves to the implementation — and decided it two incompatible ways at once. Writing
 * ordinals keeps the corpus unable to state a cross-exchange epoch claim even by accident;
 * `interactions.test.ts` enforces the shape, and `blind-spot-regression.test.ts` proves four
 * different conforming policies still pass. Where a step shows no unresolved Activation the ordinal
 * is documentation of the exchange that just closed and is asserted nowhere, like a non-canonical
 * rejection reason.
 *
 * Nothing in this file implements a Kernel. These are expectations derived from the accepted
 * worksheet, against which some future K1 candidate is judged.
 */

import type { DependencyAlternative, FixtureEvent, OutcomeEnvelope, WaitRecord } from "./protocol-vocabulary.ts";
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
    waitEndedReadiness: [],
    acceptedDeadline: null,
    dispatchedBatch: null,
    activationId: null,
    ingressRefused: null,
    receipt: null,
    rejection: null,
    writerEpoch: 0,
    recoveryHold: null,
    effectIntents: [],
    ...overrides,
  };
}

function applicationInput(eventId: string, destination: string, subscriptionClass: string, producer = "prod-default", requestKey = eventId): FixtureEvent {
  // W-1's category table: `external.input` is the one kind in the ordinary-application-input category.
  return { eventId, destination, kind: "external.input", category: "application_input", subscriptionClass, producer, requestKey };
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
const initialInput = applicationInput("in-1", X, "initial", "prod-default", "req-x");
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
  // it, but the authoritative row-1 evidence is that scenario's. Row 3's distinct-receipts half (R3-d1)
  // is attributed here because the trace already accepts act-1 and later act-2 with distinct receipts —
  // the honest schedule for ID-6/ID-7 distinctness across Outcome acceptances.
  k0BoundaryRows: [2, 3, 5, 6, 8, 10],
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
          "waitEndedReadiness must stay empty: nothing retired, so B-8 creates nothing",
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
          // §3 row 2: the Event's own acceptance boundary commits the retirement and the readiness,
          // with no Outcome anywhere in the transaction. That readiness is why the next reservation
          // is bound by g1's retired rule rather than by acceptance order.
          waitEndedReadiness: [{ generation: "g1", species: "event" }],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "acknowledged must not grow: a wake is not an acknowledgment, which requires an accepted Outcome (B-3)",
          "progressRevision must not advance: no Outcome was submitted at this boundary",
          "waitEndedReadiness must be exactly one Event-triggered entry for g1: ordinary READY carries none, and the difference decides the next batch",
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
          writerEpoch: 1,
        }),
        forbids: [
          "dispatchedBatch must not contain bq-1 or bq-2: they are ineligible under W₀'s retired rule and are not candidates at any bound",
          "the single slot must go to cont-1, the wait-ended batch's mandatory member, not to the earlier-accepted backlog",
          "waitEndedReadiness must return to empty: reservation consumes it and B-8 forbids re-arming",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-2",
          writerEpoch: 1,
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
          writerEpoch: 1,
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
const yInput = applicationInput("in-y1", Y, "initial", "prod-default", "req-y");

export const delayedRuntimeNonBlocking: Scenario = {
  id: "delayed-runtime-non-blocking",
  title: "one delayed Runtime does not prevent the same coordinator dispatching another Execution",
  sources: [
    "001 K0 deliverable ('delayed fake Runtime')",
    "001 K1 ('One delayed Runtime must not prevent the same coordinator loop dispatching another Execution')",
    "K0.1 worksheet W-4 (Runtime-local work creates no waitingFor record at all)",
    "mental-model.md ('RUNNING means an Activation is unresolved, not that a process is making progress')",
  ],
  // §11 attribution is row 5(g) — W-4's "Runtime-local work creates no waitingFor record" — plus
  // row 1's distinct-requests-never-collapse receipt half (R1-d1): X (req-x) and Y (req-y) are already
  // distinct accepted creates with distinct receipts, which is the honest schedule for ID-6/ID-7
  // distinctness without manufacturing a new scenario. The non-blocking property this scenario also
  // observes comes from 001 K0/K1, not from §11, and is carried by contract criterion C2 and
  // `delayed-runtime.test.ts` rather than by the boundary map.
  k0BoundaryRows: [1, 5],
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
/**
 * Round-8 review finding K02-R8-01. B-6 reaches one state through two entry boundaries, and the
 * corpus proved only one of them for the accepted deadline. Path A is above at step 3: the wait is
 * created and retired inside the **Outcome-acceptance** transaction because an eligible Event was
 * already in the mailbox. Path B is different work by a different writer — the Execution is already
 * durably `WAITING`, and a later eligible Event retires it at **that Event's own acceptance
 * boundary**, with no Outcome in the transaction at all.
 *
 * Before this wait, every deadline-bearing wait in the corpus that reached durable `WAITING` ended
 * through its own deadline (`g2` here, `gd1` in the W-8 case-6 control), and the one path-B wake the
 * corpus had (`k0-trace`) registered a wait with no deadline. So a candidate whose path-B handler
 * retired the lifecycle, the generation and the readiness correctly but never cleared the accepted
 * deadline passed everything. `g3` is the wait that catches it: a future deadline, so it must park
 * durably first, and a correlation only a later result can satisfy.
 */
const finalResult = kernelEvent("res-3", X, "effect.result", "corr-3");
const waitOnCorr3: WaitRecord = { dependencies: [{ kinds: ["effect.result"], correlation: "corr-3" }], subscriptions: [], deadline: 3_000, generation: "g3" };
/**
 * Round-16 review finding K02-R16-01. B-2's wait-ended rule fixes four facts a candidate can fail one
 * at a time, and the corpus proved them only where two of them coincide. Every wait-ended dispatch in
 * the corpus was either at bound 1 with a single candidate — where "retain the mandatory member" and
 * "exclude ineligible backlog" are the same observation — or had no ineligible Event queued at all. So
 * a selector that retained the correct mandatory member and then **appended ineligible backlog into
 * the slots left over** passed everything: nothing was displaced, the batch was still within bound,
 * and presentation order was still acceptance order.
 *
 * `res-off` is the Event that catches it. It is an `effect.result` like the wake itself, so the *only*
 * reason it is not a candidate is the retired wait's selector — W-1's source-category rule is not doing
 * the work here, and R5-b1's application-input arm is not being re-proved. It stays queued across two
 * retirements and is a candidate under neither g4 nor the g3 rule that precedes it, which lets one
 * accepted Event carry the B-6 species at step 14 and the B-7 species at step 17.
 *
 * `waitOnCorr4` then parks durably so the same Event becomes genuinely *older* backlog before the
 * timeout that ends g4 is minted — the worksheet's "however old it is" read in the direction that
 * matters, since a timeout Event can never be older than the mailbox it joins.
 */
const offCorrelationResult = kernelEvent("res-off", X, "effect.result", "corr-9");
const waitOnCorr4: WaitRecord = { dependencies: [{ kinds: ["effect.result"], correlation: "corr-4" }], subscriptions: [], deadline: 4_000, generation: "g4" };
const timeoutForG4 = timeoutEvent("to-g4", X, "g4");

export const staleTimerAndLostWake: Scenario = {
  id: "control-stale-timer-and-lost-wake",
  title: "unsafe control: a result accepted before the wait is not lost, and a stale timer wakes nothing",
  sources: [
    "K0.1 worksheet Decision M-1, control from §11 row 5",
    "K0.1 worksheet W-2 (ordered registration), W-3 (generation fencing scope), W-9 (the timeout Event)",
    "K0.1 worksheet B-6 paths A and B, B-7 path B, B-8, §11 row 5(d)",
    "kernel.md ('stale timers cannot wake a replacement wait'), CL-2",
  ],
  k0BoundaryRows: [5, 6],
  isUnsafeControl: true,
  waits: { waitOnCorr1, waitOnCorr2, waitOnCorr3, waitOnCorr4 },
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
        forbids: [
          "dispatchedBatch must stay ['in-1']: a new arrival cannot join an already-pinned batch",
          "waitEndedReadiness must stay empty: the Execution is RUNNING, so no generation is live and B-8 creates nothing",
        ],
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
          // §3 row 1: g1 is created and retired inside this one transaction, and the readiness it
          // leaves is Event-triggered. This is not ordinary READY — the next reservation is bound by
          // the retired wait's rule, which is why the species and generation are observed.
          waitEndedReadiness: [{ generation: "g1", species: "event" }],
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
        label: "the wait-ended batch carries its mandatory member, and reservation consumes the readiness",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { phase: "awaiting" },
          acknowledged: ["in-1"],
          queued: ["res-1"],
          dispatchedBatch: ["res-1"],
          activationId: "act-2",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "waitEndedReadiness must return to empty: B-8 consumes it at durable reservation and forbids re-arming afterwards",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-2", baseProgressRevision: 1, progress: { phase: "awaiting-2" }, next: { step: "await", wait: waitOnCorr2 } }),
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
          acceptedDeadline: 2_000,
          receipt: "receipt:outcome:act-2",
          writerEpoch: 1,
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
          acceptedDeadline: 2_000,
          receipt: "receipt:outcome:act-2",
          writerEpoch: 1,
        }),
        forbids: [
          "queued must stay empty: a stale timer creates no timeout Event",
          "liveWaitGeneration must stay g2: a stale timer retires nothing",
          "state must stay WAITING: a stale timer cannot wake a replacement wait",
          "waitEndedReadiness must stay empty: retiring nothing creates no readiness (B-8)",
          "acceptedDeadline must stay 2000: a stale delivery neither commits a deadline nor retires the live one",
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
          // §3 row 4: deadline-triggered. The species differs from g1's above, and it decides the next
          // batch's mandatory member — the generation-correlated timeout Event rather than "at least
          // one Event eligible under the retired rule".
          waitEndedReadiness: [{ generation: "g2", species: "deadline" }],
          receipt: "receipt:outcome:act-2",
          writerEpoch: 1,
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
          // Round-3 review finding K02-R3-01: "no second readiness" used to live only in the prose
          // below, where no candidate could be failed for breaking it. The list is still length 1.
          waitEndedReadiness: [{ generation: "g2", species: "deadline" }],
          receipt: "receipt:outcome:act-2",
          writerEpoch: 1,
        }),
        forbids: [
          "queued must stay ['to-g2']: at most one timeout Event exists per generation",
          "waitEndedReadiness must stay exactly one entry: a duplicate timer creates no second readiness and no second logical timeout (W-9, B-8)",
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
          // The sharp B-8 state, and the one round-3 review finding K02-R3-01 named: the Execution is
          // already READY with a readiness outstanding when an eligible-looking result arrives. It is
          // an accepted mailbox fact and nothing more. A second entry here would be the phantom
          // readiness that re-selects a batch after reservation.
          waitEndedReadiness: [{ generation: "g2", species: "deadline" }],
          receipt: "receipt:outcome:act-2",
          writerEpoch: 1,
        }),
        forbids: [
          "res-2 must be accepted and retained: a timeout is never proof the awaited work did not happen (CL-2)",
          "waitEndedReadiness must stay exactly one entry: no wait generation is live, so this arrival creates no readiness behind the first (B-8, §3 row 6)",
        ],
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
          writerEpoch: 1,
        }),
        forbids: [
          "the timeout must not suppress the later result for the same correlation: preserve both facts",
          "waitEndedReadiness must return to empty: reservation consumes it",
        ],
      },
    ),
    // Round-8 review finding K02-R8-01: B-6's *other* entry boundary, on a wait that carries a
    // deadline. Step 3 above is path A — the wait is created and retired inside one Outcome-acceptance
    // transaction. These two steps are path B: the wait parks durably with a live accepted deadline
    // first, and is then ended by a later eligible Event at that Event's own acceptance boundary, with
    // no Outcome in the transaction. The deadline never fires, and the wake must retire it all the
    // same.
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-3", baseProgressRevision: 2, progress: { phase: "awaiting-3" }, next: { step: "await", wait: waitOnCorr3 } }),
      },
      {
        label: "a third wait parks durably under g3 with a future deadline: 3000 is an accepted fact and nothing eligible is queued",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 3,
          progress: { phase: "awaiting-3" },
          acknowledged: ["in-1", "res-1", "to-g2", "res-2"],
          queued: [],
          liveWaitGeneration: "g3",
          acceptedDeadline: 3_000,
          receipt: "receipt:outcome:act-3",
          writerEpoch: 1,
        }),
        forbids: [
          "state must be WAITING: unlike step 3's path A the mailbox holds nothing eligible once this Outcome's own batch is acknowledged, so W-2 reaches step 4 and persists",
          "acceptedDeadline must be 3000: W-2 step 4 persists the live registration with its generation and its deadline as one accepted set (OA-4)",
          "res-2 must not wake it: it was acknowledged by this very Outcome, and W-2 step 1 runs before the mailbox check",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: finalResult },
      {
        label: "B-6 path B: a later eligible Event retires the live deadline-bearing wait at its own acceptance boundary, deadline included",
        observation: obs(X, {
          state: "READY",
          progressRevision: 3,
          progress: { phase: "awaiting-3" },
          acknowledged: ["in-1", "res-1", "to-g2", "res-2"],
          queued: ["res-3"],
          liveWaitGeneration: null,
          // §3 row 2: Event-triggered, not deadline-triggered. g3's deadline never fired and now never
          // will, so the timeout Event B-7 would have minted does not exist and must not be claimed.
          waitEndedReadiness: [{ generation: "g3", species: "event" }],
          // The fact this pair of steps exists for. Retirement here is committed by the
          // Event-acceptance writer — not by Outcome acceptance as in path A at step 3, and not by the
          // expiry handler as at step 7 — and the accepted deadline is part of the registration that
          // writer retires. Nothing is claimed about a physical timer still registered for g3: W-3
          // lets one survive and arrive later as a stale no-op, exactly as g1's did at step 6.
          acceptedDeadline: null,
          receipt: "receipt:outcome:act-3",
          writerEpoch: 1,
        }),
        forbids: [
          "acceptedDeadline must be null: the wake retires the accepted deadline with the registration it belongs to, and a deadline fact outliving its retired generation is what this step exists to catch",
          "liveWaitGeneration must be null: an eligible Event retires the generation here, with no Outcome anywhere in the transaction (B-6 path B)",
          "waitEndedReadiness must be exactly one Event-triggered entry for g3: a deadline species here would claim a timeout Event that was never minted",
          "progressRevision must not advance and acknowledged must not grow: waking is not acknowledging, which requires an accepted Outcome (B-3)",
          "res-3 must stay queued and unacknowledged: the Event that ended the wait is a mailbox fact, not a consumed one",
        ],
      },
    ),
    // Round-16 review finding K02-R16-01. The five steps below consume the path-B readiness step 12
    // created — which the scenario previously left outstanding — and use the two reservations it
    // produces to separate B-2's wait-ended facts where the corpus had them coinciding. Each
    // reservation has **room left over** after its mandatory member, which is the condition under which
    // "ineligible backlog is never a candidate at any bound" stops being the same observation as
    // "nothing displaces the wake".
    step(
      { kind: "accept_event", event: offCorrelationResult },
      {
        label: "an off-correlation result is accepted while READY: a mailbox fact under B-8, and a candidate under nothing",
        observation: obs(X, {
          state: "READY",
          progressRevision: 3,
          progress: { phase: "awaiting-3" },
          acknowledged: ["in-1", "res-1", "to-g2", "res-2"],
          queued: ["res-3", "res-off"],
          liveWaitGeneration: null,
          waitEndedReadiness: [{ generation: "g3", species: "event" }],
          receipt: "receipt:outcome:act-3",
          writerEpoch: 1,
        }),
        forbids: [
          "waitEndedReadiness must stay exactly one entry for g3: no generation is live, so B-8 creates nothing and a second readiness could re-select an already-reserved batch",
          "state must stay READY and liveWaitGeneration null: this Event ends nothing, because nothing is registered to end",
          "res-3 must stay queued: an unrelated arrival neither consumes nor reorders the Event this Execution was woken for",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "B-6 with room to spare: the leftover slots stay empty rather than taking backlog that is not a candidate",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 3,
          progress: { phase: "awaiting-3" },
          acknowledged: ["in-1", "res-1", "to-g2", "res-2"],
          queued: ["res-3", "res-off"],
          dispatchedBatch: ["res-3"],
          activationId: "act-4",
          receipt: "receipt:outcome:act-3",
          writerEpoch: 1,
        }),
        forbids: [
          "dispatchedBatch must be exactly ['res-3']: three of this reservation's four slots are unused, and B-2 leaves them unused rather than filling them with an Event that is not eligible under g3's retired rule",
          "res-off must not join the batch: 'ineligible backlog is never a candidate at any bound' is a rule about candidacy, not about displacement, and nothing here is displaced",
          "res-off must stay queued and unacknowledged: an Event excluded from a batch keeps its own per-entry disposition (B-4)",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({ executionId: X, activationId: "act-4", baseProgressRevision: 3, progress: { phase: "awaiting-4" }, next: { step: "await", wait: waitOnCorr4 } }),
      },
      {
        label: "a fourth wait parks durably under g4, leaving the off-correlation result as backlog older than any timeout",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 4,
          progress: { phase: "awaiting-4" },
          acknowledged: ["in-1", "res-1", "to-g2", "res-2", "res-3"],
          queued: ["res-off"],
          liveWaitGeneration: "g4",
          acceptedDeadline: 4_000,
          receipt: "receipt:outcome:act-4",
          writerEpoch: 1,
        }),
        forbids: [
          "state must be WAITING: W-2 step 2 finds res-off ineligible under g4's rule exactly as it was under g3's, so registration reaches step 4",
          "res-off must stay queued and unacknowledged: W-2 step 1 acknowledges this Outcome's own reserved batch, which was ['res-3'] alone",
          "acceptedDeadline must be 4000: the live registration carries its deadline as one accepted set (OA-4, W-2 step 4)",
        ],
      },
    ),
    step(
      { kind: "deliver_timer", executionId: X, generation: "g4", timeoutEvent: timeoutForG4 },
      {
        label: "g4's own deadline expires, so the mandatory member of the next batch is a Kernel-minted timeout younger than the backlog beside it",
        observation: obs(X, {
          state: "READY",
          progressRevision: 4,
          progress: { phase: "awaiting-4" },
          acknowledged: ["in-1", "res-1", "to-g2", "res-2", "res-3"],
          queued: ["res-off", "to-g4"],
          liveWaitGeneration: null,
          waitEndedReadiness: [{ generation: "g4", species: "deadline" }],
          receipt: "receipt:outcome:act-4",
          writerEpoch: 1,
        }),
        forbids: [
          "acceptedDeadline must be null: the expiry retires the registration and the deadline fact together (B-7 path B)",
          "waitEndedReadiness must be deadline-triggered: the species decides which member the next batch must carry",
          "res-off must keep its acceptance position ahead of to-g4: the timeout joins the mailbox after it, which is what makes the next step's exclusion a statement about older backlog",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 4 },
      {
        label: "B-7 with room to spare: the mandatory timeout is retained and the older ineligible backlog is still not appended",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 4,
          progress: { phase: "awaiting-4" },
          acknowledged: ["in-1", "res-1", "to-g2", "res-2", "res-3"],
          queued: ["res-off", "to-g4"],
          dispatchedBatch: ["to-g4"],
          activationId: "act-5",
          receipt: "receipt:outcome:act-4",
          writerEpoch: 1,
        }),
        forbids: [
          "dispatchedBatch must be exactly ['to-g4']: the deadline species' mandatory member is retained and the three remaining slots stay empty, because g4's retired rule makes res-off a candidate for none of them",
          "res-off must not be appended even though it is older than the timeout and the bound has room: B-2 excludes it on candidacy, and 'however old it is' is the worksheet's own phrase",
          "the batch must not be presented as ['res-off','to-g4']: that is what admitting it in acceptance order would produce, and it is the shape this step exists to reject",
        ],
      },
    ),
  ],
};

// -- Control 3 (M-1 row 7): cancellation versus completion, both orders -----

const losingContinue = outcome({ executionId: X, activationId: "act-1", progress: { cursor: 5 }, emissions: [{ emissionId: "em-late", value: { late: true } }], next: { step: "continue" } });
const losingComplete = outcome({ executionId: X, activationId: "act-1", progress: { cursor: 6 }, next: { step: "complete", result: { status: "too late" } } });
/**
 * Round-5 review finding K02-R5-02: the row-7 schedule submitted losing `continue`/`complete`
 * Outcomes but never a losing `await` carrying a wait with a deadline, so CX-6/OA-5's "no
 * wait/deadline" clause had no schedule exercising it and no observation that could see a leaked
 * accepted deadline fact. This is that schedule: a well-formed subscription-only wait with a
 * deadline under a fresh generation, submitted after cancellation acceptance. Accepted, it would
 * persist WAITING under `g-lose` with its deadline 5000 committed; rejected under CX-6, it must
 * leave `liveWaitGeneration` null, `acceptedDeadline` null, `waitEndedReadiness` empty and the
 * Execution CANCELLED.
 */
const losingAwaitWithDeadline = outcome({
  executionId: X,
  activationId: "act-1",
  progress: { cursor: 7 },
  next: {
    step: "await",
    wait: { dependencies: [], subscriptions: [{ subscriptionClass: "continue" }], deadline: 5_000, generation: "g-lose" },
  },
});
const winningComplete = outcome({ executionId: Y, activationId: "act-y1", progress: { cursor: 1 }, next: { step: "complete", result: { status: "done" } } });

const cancellationRejection = {
  classification: "cancellation_terminal_conflict" as const,
  reason: "cancellation accepted before Outcome acceptance",
};

/** The fenced observation is asserted identically after each losing submission for X. */
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
  // Round-3 review finding K02-R3-01: row 10 was claimed here because R10-a pointed at this
  // scenario's cancellation-atomicity transcript, which demonstrates CX-6/OA-3 and says nothing about
  // LP-1's staleness window. LP-1 now has evidence of its own on the identity scenario, so this claim
  // is withdrawn rather than left as a row this scenario does not actually observe.
  k0BoundaryRows: [7, 8],
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
    step(
      { kind: "submit_outcome", outcome: losingAwaitWithDeadline },
      {
        label: "a later `await` carrying a wait with a deadline loses identically: no wait, deadline, readiness or next-state change",
        observation: fencedObservation,
        forbids: [
          "state must stay CANCELLED: a losing `await` must not persist WAITING under g-lose",
          "liveWaitGeneration must stay null: the loser's wait registers nothing",
          "acceptedDeadline must stay null: the loser's deadline is accepted as no fact at all under CX-6/OA-5",
          "waitEndedReadiness must stay empty: a rejected Outcome creates no readiness",
          "rejection must stay CX-6: the fence does not depend on the loser's next step",
        ],
      },
    ),
  ],
  waits: { losingAwait: { dependencies: [], subscriptions: [{ subscriptionClass: "continue" }], deadline: 5_000, generation: "g-lose" } },
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
  k0BoundaryRows: [5, 9],
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
          writerEpoch: 1,
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
          writerEpoch: 1,
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
          writerEpoch: 1,
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
  k0BoundaryRows: [3, 4],
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
/**
 * Round-10 review finding K02-R10-02. Row 2's takeover rule is not merely "same Activation ID +
 * incremented epoch": the replacement attempt keeps the **same immutable exchange input**, including
 * the pinned Event batch (ID-3: "it does not invent new mailbox content under it"). The prior schedule
 * dispatched and immediately took over with nothing else in the mailbox, so a candidate that kept the
 * ID, advanced the epoch correctly, but repinned the batch could pass — the wrong repin had no
 * deterministic new content to include. `in-2` is that content: accepted after dispatch but before
 * redelivery/takeover, queued but never reserved, so the conforming redelivery and takeover both keep
 * `dispatchedBatch: ["in-1"]` while `queued` grows. ID-9 case 1 (ordinary redelivery, same ID + same
 * epoch + same input, no takeover decided) had no command at all; `redeliver_dispatch` is the smallest
 * vocabulary that can say it.
 */
const lateArrivalForRepin = applicationInput("in-2", X, "initial");

export const createAndActivationIdentity: Scenario = {
  id: "identity-create-and-activation",
  title: "create keys conflict on changed content; exchanges get new Activation IDs, takeovers do not",
  sources: [
    "K0.1 worksheet §11 row 1 (ID-1, ID-2, ID-6, ID-7) and row 2 (ID-3, ID-4, ID-9)",
    "execution-protocol.md, Identities and immutable exchanges",
  ],
  k0BoundaryRows: [1, 2, 10],
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
        initialInput: applicationInput("in-DIFFERENT", X, "initial", "prod-default", "req-x"),
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
      { kind: "accept_event", event: lateArrivalForRepin },
      {
        label: "a late arrival is queued but cannot join the already-pinned batch",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1", "in-2"],
          dispatchedBatch: ["in-1"],
          activationId: "act-1",
          receipt: "receipt:create:req-x",
          writerEpoch: 1,
        }),
        forbids: [
          "dispatchedBatch must stay ['in-1']: a new arrival cannot join an already-pinned batch (B-1, §11 row 6)",
          "state must stay RUNNING and no readiness may arm: no generation is live (B-8, §11 row 6)",
        ],
      },
    ),
    step(
      { kind: "redeliver_dispatch", executionId: X },
      {
        label: "ID-9 case 1: ordinary redelivery is the identical in-flight exchange — same ID, same epoch, same pinned input",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1", "in-2"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          writerEpoch: 1,
        }),
        forbids: [
          "activationId must stay act-1: redelivery is not a new exchange and mints no new ID (ID-3)",
          "writerEpoch must stay 1: only an authenticated takeover advances the epoch, never an ordinary retry (ID-4)",
          "dispatchedBatch must stay ['in-1']: delivery retries preserve dispatched input and cannot pick up in-2",
          "acknowledged must stay empty: redelivery acknowledges nothing",
        ],
      },
    ),
    step(
      { kind: "takeover", executionId: X },
      {
        label: "ID-9: an authorized takeover of a still-unresolved exchange keeps the Activation ID and advances the epoch",
        observation: obs(X, { state: "RUNNING", queued: ["in-1", "in-2"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 2 }),
        forbids: [
          "activationId must stay act-1: a takeover is the same exchange under a new writer, not a new exchange",
          "dispatchedBatch must stay ['in-1']: a takeover cannot replace pinned input with new mailbox content (in-2 stays queued, never reserved)",
          "acknowledged must stay empty: a takeover acknowledges nothing",
        ],
      },
    ),
    // LP-1, given evidence of its own by round-3 review finding K02-R3-01. The map previously pointed
    // row 10 at a cancellation-atomicity transcript, which demonstrates CX-6/OA-3 and says nothing
    // about a stale local read. LP-1's own examples are exactly this check — "is this Execution's
    // current epoch still current", "is this Activation ID still the live one" — and its content is
    // that the check reads **the same store the acceptance algorithm just wrote to**, with no
    // eventual-consistency window. The takeover above is that write; this submission is the read.
    step(
      {
        kind: "submit_outcome",
        // writerEpoch defaults to 1: the epoch the takeover in the previous step superseded.
        outcome: outcome({ executionId: X, activationId: "act-1", progress: { step: 99 }, next: { step: "continue" } }),
      },
      {
        label: "LP-1: the authority check reads the epoch the immediately preceding takeover wrote, with no staleness window",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1", "in-2"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "stale_exchange", reason: "writer epoch 1 was superseded by epoch 2" },
          writerEpoch: 2,
        }),
        forbids: [
          "progressRevision must stay 0 and progress null: a superseded writer commits nothing",
          "writerEpoch must stay 2: a rejected stale submission does not roll the epoch back",
          "there is no window in which the previous epoch is still readable as current: the takeover's write is visible to the very next check",
          "in-2 stays queued and unacknowledged: a stale rejection acknowledges nothing and disposes nothing",
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
          queued: ["in-2"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 2,
        }),
        forbids: [
          "acknowledged must be exactly ['in-1']: only the pinned batch is acknowledged (B-3); in-2 was never reserved",
          "in-2 stays queued for the next exchange: it is neither acknowledged nor disposed here",
        ],
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
          queued: ["in-2"],
          activationId: "act-2",
          dispatchedBatch: ["in-2"],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: ["activationId must not be act-1: two semantically different exchanges never share an Activation ID"],
      },
    ),
  ],
};

// -- Scenario 8b: producer-scoped create identity (§11 row 1, ID-2) --------------

/**
 * Round-10 review finding K02-R10-03. ID-2 scopes input identity by authenticated producer namespace
 * + destination + producer request key — not by raw key text. The prior vocabulary carried no
 * producer/caller dimension, so every create/retry occurred in one implicit scope and a candidate
 * globally deduplicating raw key text passed everything. This is the smallest schedule that can tell
 * the difference: two different producers (`prod-a`, `prod-b`) reuse the same raw request-key text
 * (`req-shared`) for different Executions with different inputs. Conformingly they do not collide —
 * each is a fresh accepted create with its own Execution ID and its own receipt. A third step retries
 * the first producer's create (same producer, same key, same content) and returns the original
 * identity and receipt, proving same-scope replay still works once the scope is explicit.
 */
const producerSharedKey = "req-shared";
const producerAInput = applicationInput("in-pa", "exec-pa", "initial", "prod-a", producerSharedKey);
const producerBInput = applicationInput("in-pb", "exec-pb", "initial", "prod-b", producerSharedKey);

// Subsequent application ingress independently varies producer while destination and key stay fixed.
const producerIngressA = applicationInput("input-a", "exec-pa", "continue", "prod-a", "k");
const producerIngressB = applicationInput("input-b", "exec-pa", "continue", "prod-b", "k");
const producerIngressConflict = applicationInput("input-conflict", "exec-pa", "billing.question", "prod-a", "k");
const producerIngressWait: WaitRecord = { dependencies: [], subscriptions: [{ subscriptionClass: "continue" }], generation: "g-input" };
function producerIngressObservation(later: readonly string[], overrides: Partial<Observation> = {}): Observation {
  return obs("exec-pa", { state: "RUNNING", queued: ["in-pa", ...later], activationId: "act-pa", dispatchedBatch: ["in-pa"], receipt: "receipt:create:req-shared:prod-a", writerEpoch: 1, ...overrides });
}

export const producerScopedCreateIdentity: Scenario = {
  id: "identity-producer-scope",
  title: "producer-scoped create and same-destination input identities, replay and conflict",
  sources: [
    "K0.1 worksheet §11 row 1 (ID-1, ID-2, ID-6, ID-7)",
    "execution-protocol.md, Identities and immutable exchanges (input identity is producer + destination + request key)",
  ],
  // Round-13 review finding K02-R13-02 adds row 5. Step 8 registers a wait whose dependency-alternative
  // list is empty while two eligible subscribed inputs are already accepted and unacknowledged, which
  // is the only place in the corpus where W-2 step 2's empty-dependency clause (W-8 case 1) is
  // observable; `coverage.ts` R5-c2b attributes it here rather than duplicating the schedule.
  k0BoundaryRows: [1, 5],
  isUnsafeControl: false,
  waits: { input: producerIngressWait },
  steps: [
    step(
      { kind: "create", executionId: "exec-pa", requestKey: producerSharedKey, producer: "prod-a", initialInput: producerAInput, definitionRevision: FAKE_RUNTIME_V1 },
      {
        label: "prod-a creates under req-shared",
        observation: obs("exec-pa", { queued: ["in-pa"], receipt: "receipt:create:req-shared:prod-a" }),
      },
    ),
    step(
      { kind: "create", executionId: "exec-pb", requestKey: producerSharedKey, producer: "prod-b", initialInput: producerBInput, definitionRevision: FAKE_RUNTIME_V1 },
      {
        label: "prod-b reuses the same raw key text for a different Execution: no collision",
        observation: obs("exec-pb", { queued: ["in-pb"], receipt: "receipt:create:req-shared:prod-b" }),
        forbids: [
          "executionId must be exec-pb, not exec-pa: different producers reusing one raw key text are different input identities (ID-2)",
          "receipt must differ from prod-a's: distinct accepted creates never collapse onto one receipt (ID-6/ID-7)",
          "in-pb must be queued for exec-pb: the second create is a fresh acceptance, not a replay and not a conflict",
        ],
      },
    ),
    step(
      { kind: "create_retry", executionId: "exec-pa", requestKey: producerSharedKey, producer: "prod-a", initialInput: producerAInput, definitionRevision: FAKE_RUNTIME_V1 },
      {
        label: "same producer, same key, same content: the original Execution and receipt come back",
        observation: obs("exec-pa", { queued: ["in-pa"], receipt: "receipt:create:req-shared:prod-a" }),
        forbids: [
          "executionId must stay exec-pa and receipt must stay the original: same-scope replay is idempotent (ID-2, ID-6)",
          "queued must not gain a second copy of the initial input",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: "exec-pa", bound: 1 },
      { label: "pin only the initial input before later ingress", observation: producerIngressObservation([]) },
    ),
    step(
      { kind: "accept_event", event: producerIngressA },
      { label: "producer A sends to X under raw key k", observation: producerIngressObservation(["input-a"]) },
    ),
    step(
      { kind: "accept_event", event: producerIngressB },
      { label: "producer B sends to the same X under the same raw key k: a distinct acceptance", observation: producerIngressObservation(["input-a", "input-b"]) },
    ),
    step(
      { kind: "accept_event", event: producerIngressA },
      { label: "exact same-producer ingress replay retains its original acceptance position", observation: producerIngressObservation(["input-a", "input-b"]) },
    ),
    step(
      { kind: "accept_event", event: producerIngressConflict },
      { label: "same full ingress identity with different content is a conflict and accepts nothing", observation: producerIngressObservation(["input-a", "input-b"], { rejection: { classification: "duplicate_conflict", reason: "same input identity with different content" } }) },
    ),
    step(
      { kind: "submit_outcome", outcome: outcome({ executionId: "exec-pa", activationId: "act-pa", next: { step: "await", wait: producerIngressWait } }) },
      {
        label: "W-2 step 2 runs for an empty dependency list too, so both accepted producers are found at registration (W-8 case 1, B-6 path A)",
        observation: obs("exec-pa", { progressRevision: 1, acknowledged: ["in-pa"], queued: ["input-a", "input-b"], receipt: "receipt:input-wait", writerEpoch: 1, waitEndedReadiness: [{ generation: "g-input", species: "event" }] }),
        forbids: [
          // Round-13 review finding K02-R13-02 gave row 5's empty-dependency clause its owner here.
          "state must not be WAITING and liveWaitGeneration must not be g-input: `producerIngressWait` declares no dependency alternative at all, and W-8 case 1 forbids the 'no dependencies, so nothing to check' shortcut a dependency-wait implementation never exercises",
          "waitEndedReadiness must be exactly one Event-triggered entry for g-input: the wait is created and retired inside this one transaction (§3 row 1)",
          "acknowledged must be exactly ['in-pa']: W-2 step 1 acknowledges only this Outcome's own reserved batch, which is why input-a and input-b are still candidates in step 2",
          "input-a and input-b stay queued: being found by the mailbox check is a wake, never an acknowledgment (B-3)",
        ],
      },
    ),
    step(
      { kind: "dispatch", executionId: "exec-pa", bound: 1 },
      { label: "B-6 bounded selection keeps first accepted producer first", observation: obs("exec-pa", { state: "RUNNING", progressRevision: 1, acknowledged: ["in-pa"], queued: ["input-a", "input-b"], activationId: "act-pa-2", dispatchedBatch: ["input-a"], receipt: "receipt:input-wait", writerEpoch: 1 }) },
    ),
    step(
      { kind: "submit_outcome", outcome: outcome({ executionId: "exec-pa", activationId: "act-pa-2", baseProgressRevision: 1, next: { step: "complete", result: "done" } }) },
      { label: "terminal acceptance acknowledges selected input and disposes the other producer input", observation: obs("exec-pa", { state: "COMPLETED", progressRevision: 2, acknowledged: ["in-pa", "input-a"], terminalDispositions: ["input-b"], receipt: "receipt:input-complete", writerEpoch: 1 }) },
    ),
    step(
      { kind: "accept_event", event: applicationInput("input-late", "exec-pa", "continue", "prod-b", "late") },
      { label: "new application identity after terminal is refused without an acceptance position", observation: obs("exec-pa", { state: "COMPLETED", progressRevision: 2, acknowledged: ["in-pa", "input-a"], terminalDispositions: ["input-b"], receipt: "receipt:input-complete", writerEpoch: 1, ingressRefused: "input-late" }) },
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
/**
 * Round-10 review finding K02-R10-01. OA-5's zero-partial-state family at the whole-envelope-validation
 * writer was still incomplete: deadline (R3-c4) was owned, but wait/lifecycle, readiness and next-state
 * had no candidate-level owners. The duplicate-emission envelope (step 2) already carries a valid
 * `next: continue`, so it can exercise a correct rejection with a leaked next-state transition; the
 * malformed future-deadline `await` (step 4) can exercise a correct rejection with a leaked
 * wait/lifecycle registration. Readiness is independent of both (deliberately ungrouped since round 5),
 * and no existing rejected schedule in this scenario submits a *valid* wait whose generation could
 * honestly arm a readiness-only leak — every await here is either malformed or absent — so a new
 * minimal step submits a valid subscription-only wait inside an envelope that is malformed for an
 * unrelated reason (duplicate emission key). Its conforming result is a correct `malformed_envelope`
 * refusal with no wait, no deadline, no readiness and no next-state change; the violating transcript
 * arms only readiness for that valid generation. Round 11 adds cont-1 after reservation:
 * W-2 step 2 would find it and B-6 path A would end g-good if the Outcome were accepted.
 */
const validWaitInMalformedEnvelope: WaitRecord = {
  dependencies: [],
  subscriptions: [{ subscriptionClass: "continue" }],
  generation: "g-good",
};

export const wholeEnvelopeValidation: Scenario = {
  id: "control-whole-envelope-validation",
  title: "a failure anywhere in envelope validation accepts nothing, including a valid prefix",
  sources: [
    "K0.1 worksheet §11 row 3 (OA-3, OA-5) and row 5(a) (W-1 well-formedness)",
    "execution-protocol.md, Outcome acceptance algorithm step 3",
    "K0.1 worksheet W-1 well-formedness case 1 (both lists empty, deadline does not rescue it)",
  ],
  k0BoundaryRows: [2, 3, 5],
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
    // Round-4 review finding K02-R4-02: W-1 case 1 has two halves a candidate can get separately
    // right or wrong. The plain empty declaration is the base rule; the same record *with a deadline*
    // is the one worksheet revision 9 answered two ways, and an implementation reading
    // well-formedness as "can this wait end" accepts the second while rejecting the first. C4
    // submitted only the deadline variant, so the base rule was never put to a candidate on its own.
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          progress: { cursor: 1 },
          next: { step: "await", wait: { dependencies: [], subscriptions: [], generation: "g-bad-0" } },
        }),
      },
      {
        label: "W-1 rule 1: a declaration with both lists empty is malformed on its own terms",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "both dependency alternatives and subscriptions are empty" },
          writerEpoch: 1,
        }),
        forbids: [
          "liveWaitGeneration must stay null: g-bad-0 must never register",
          "state must stay RUNNING: a refused wait does not move the Execution",
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
    // W-1 well-formedness rule 2, first half. Round-3 review finding K02-R3-01: the three rules below
    // were enforced only by `checkWaitWellFormed`, which `rule-agreement.test.ts` checks against the
    // worksheet. That proves the fixture's own helper agrees with the worksheet; it proves nothing
    // about a candidate, because no scenario ever submitted a wait that breaks them. The reasons
    // expected here are the helper's exact strings, so the helper's rule and the candidate's
    // obligation are now the same assertion rather than two parallel ones.
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          // An alternative supplying none of the three selector fields matches every Event addressed
          // to the Execution. The grammar calls that invalid, not a shorthand for "anything" — it is
          // the one over-matching spelling W-1 refuses structurally.
          next: { step: "await", wait: { dependencies: [{}], subscriptions: [], generation: "g-bad-2" } },
        }),
      },
      {
        label: "W-1 rule 2: an alternative supplying no selector field is a malformed match-everything, not a shorthand",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "dependency alternative supplies none of the three selector fields" },
          writerEpoch: 1,
        }),
        forbids: [
          "state must stay RUNNING and liveWaitGeneration null: g-bad-2 must never register",
          "the declaration is structurally non-empty under rule 1, so rule 1 alone must not be treated as the whole of well-formedness",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          // An empty supplied kind set is malformed. It is neither "a Kind selector that matches
          // nothing" nor a spelling of "Kind selector absent" — absence is expressed by not supplying
          // the field at all.
          next: { step: "await", wait: { dependencies: [{ kinds: [] }], subscriptions: [], generation: "g-bad-3" } },
        }),
      },
      {
        label: "W-1 rule 2: an empty supplied kind set is malformed, not a selector that matches nothing",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "dependency alternative supplies an empty kind set" },
          writerEpoch: 1,
        }),
        forbids: [
          "an empty kind set must be rejected before any matching is attempted, not treated as an inert-but-valid alternative",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: continueInput },
      { label: "eligible input accepted after reservation remains outside the pinned batch", observation: obs(X, { state: "RUNNING", queued: ["in-1", "cont-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", writerEpoch: 1, rejection: { classification: "malformed_envelope", reason: "dependency alternative supplies an empty kind set" } }) },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-1",
          progress: { cursor: 1 },
          // Malformed for an unrelated reason: the wait itself is valid (subscription-only, well formed
          // under W-1 rule 1), but the emission list reuses its key, so OA-3 refuses the whole envelope.
          // Correct W-2 step 2 finds accepted cont-1 outside the pinned batch and would end g-good.
          // A readiness writer that commits this B-6 path-A result before validation leaks it even though
          // validation correctly refuses and correctly registers no wait, no deadline and no next-state.
          emissions: [
            { emissionId: "em-1", value: { partial: "a" } },
            { emissionId: "em-1", value: { partial: "b" } },
          ],
          next: { step: "await", wait: validWaitInMalformedEnvelope },
        }),
      },
      {
        label: "a valid wait inside a malformed envelope earns nothing: no wait, readiness or next-state transition",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1", "cont-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "duplicate emission key em-1" },
          writerEpoch: 1,
        }),
        forbids: [
          "liveWaitGeneration must stay null: g-good is valid but the envelope carrying it was refused, so no registration exists",
          "waitEndedReadiness must stay empty: a rejected Outcome creates no readiness, even for a valid generation it names",
          "acceptedDeadline must stay null: this wait carries no deadline and the refused envelope accepts none",
          "state must stay RUNNING: a refused await does not move the Execution",
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
          queued: ["cont-1"],
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
          acceptedDeadline: 1_000,
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "bq-1 must not wake it: billing.question is outside the declared subscription",
          "waitEndedReadiness must stay empty: the wait is live, so nothing has retired",
          "acceptedDeadline must be 1000: W-2 step 4 persists the live registration with its generation and its deadline, and that accepted fact is observed rather than inferred",
        ],
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
          waitEndedReadiness: [{ generation: "gd1", species: "deadline" }],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "the wait has no dependency alternatives at all, so the timeout must arrive by construction, not by matching",
          "waitEndedReadiness must be deadline-triggered for gd1: the species is what makes the timeout Event the next batch's mandatory member",
        ],
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
          writerEpoch: 1,
        }),
        forbids: [
          "dispatchedBatch must not be ['bq-1']: bq-1 was accepted first, and ordinary acceptance-order selection would have taken the slot",
          "the timeout Event is the species' mandatory member and is retained before any other candidate",
          "waitEndedReadiness must return to empty: reservation consumes it",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-2",
          writerEpoch: 1,
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
          waitEndedReadiness: [{ generation: "gd2", species: "deadline" }],
          receipt: "receipt:outcome:act-2",
          writerEpoch: 1,
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

// -- Scenario 12: structure is not satisfiability (§11 row 5(a) and 5(b)) ----

/**
 * Round-3 review finding K02-R3-01. §11 row 5 says in terms that "each of these is separately
 * observable", and row 5(a)'s test "proves **structure, never satisfiability**". The fixture observed
 * the malformed half of that — a structurally empty declaration is refused — and none of the
 * positive half: that a **valid but inert** alternative is accepted, counts toward non-emptiness, and
 * then makes nothing eligible. A candidate that quietly audited whether a declared source could in
 * fact wake the Execution, and refused a wait it judged undischargeable, passed every scenario.
 *
 * The wait below is the sharp shape for that, because it is *entirely* dependency alternatives with no
 * subscription anywhere:
 *
 *   - `{ kinds: ["external.input"] }` is grammar-valid and permanently inert — ordinary application
 *     input is eligible only through a declared subscription, and this wait declares none, so the
 *     alternative neither wakes nor acknowledges (W-7 cases 6-7);
 *   - `{ kinds: ["kernel.wait.timeout"] }` is grammar-valid and inert for a different reason, one the
 *     category table gives directly: the timeout Event cannot exist while its own wait is live, so no
 *     Event in that category can ever be tested against this alternative. Its inertness is therefore
 *     **structurally unobservable** rather than merely untested, and it is carried here for the
 *     structural claim — a valid alternative the Kernel does not audit — not for a behavioral one;
 *   - `{ correlation: "c9" }` is the one alternative that can actually end the wait.
 *
 * K0.1 promises no general satisfiability or deadlock prevention, and "the Kernel does **not** audit
 * whether a declared source can in fact wake this Execution". Accepting this record is the observable
 * form of that promise.
 */
const inertInputAlternative: DependencyAlternative = { kinds: ["external.input"] };
const inertTimeoutAlternative: DependencyAlternative = { kinds: ["kernel.wait.timeout"] };
const correlatedAlternative: DependencyAlternative = { correlation: "c9" };
const inertAndCorrelatedWait: WaitRecord = {
  dependencies: [inertInputAlternative, inertTimeoutAlternative, correlatedAlternative],
  subscriptions: [],
  generation: "gi1",
};

const unrelatedKernelEvent = kernelEvent("oth-1", X, "svc.result", "c-other");
const correlatedKernelEvent = kernelEvent("res-9", X, "svc.result", "c9");

export const inertAlternativeEligibility: Scenario = {
  id: "wait-structure-not-satisfiability",
  title: "a structurally valid but inert alternative is accepted, counts, and makes nothing eligible",
  sources: [
    "K0.1 worksheet W-1 well-formedness case 2 (a valid inert alternative; the wait may never be woken)",
    "K0.1 worksheet W-1 selector grammar ('A well-formed alternative can still be inert, and it still counts')",
    "K0.1 worksheet W-1 eligibility category table, W-7 cases 6-7",
    "K0.1 worksheet §11 row 5(a) (structure, never satisfiability) and row 5(b) (the category rule)",
  ],
  k0BoundaryRows: [5],
  isUnsafeControl: false,
  waits: { inertAndCorrelatedWait },
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
        outcome: outcome({ executionId: X, activationId: "act-1", progress: { phase: "declared" }, next: { step: "await", wait: inertAndCorrelatedWait } }),
      },
      {
        label: "W-1 rule 1 is satisfied structurally, so the wait registers even though two of its three alternatives are inert",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 1,
          progress: { phase: "declared" },
          acknowledged: ["in-1"],
          queued: [],
          liveWaitGeneration: "gi1",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "rejection must stay null: refusing this record would be a satisfiability audit, and the Kernel performs none",
          "state must be WAITING: an inert alternative counts toward structural non-emptiness exactly as a live one does",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: billingOne },
      {
        label: "the inert alternative matches this input by kind and still makes it ineligible (W-7 cases 6-7)",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 1,
          progress: { phase: "declared" },
          acknowledged: ["in-1"],
          queued: ["bq-1"],
          liveWaitGeneration: "gi1",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "state must stay WAITING: bq-1's kind is exactly what the first alternative names, and matching it changes nothing",
          "ordinary application input is eligible only through a declared subscription, and this wait declares none",
          "bq-1 must be queued and unacknowledged: an ineligible Event is retained with its own disposition (B-4)",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: unrelatedKernelEvent },
      {
        label: "a Kernel Event matching no alternative is accepted and inert: the category rule is the only path",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 1,
          progress: { phase: "declared" },
          acknowledged: ["in-1"],
          queued: ["bq-1", "oth-1"],
          liveWaitGeneration: "gi1",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "state must stay WAITING: oth-1 shares its kind with the Event that will wake this wait, and kind alone is not the alternative's selector",
          "no declared subscription can make a non-application Kernel Event eligible, and there is none here to try",
        ],
      },
    ),
    step(
      { kind: "accept_event", event: correlatedKernelEvent },
      {
        label: "the one live alternative matches: the wait and its generation retire (B-6 path B)",
        observation: obs(X, {
          state: "READY",
          progressRevision: 1,
          progress: { phase: "declared" },
          acknowledged: ["in-1"],
          queued: ["bq-1", "oth-1", "res-9"],
          liveWaitGeneration: null,
          waitEndedReadiness: [{ generation: "gi1", species: "event" }],
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: ["acknowledged must not grow: waking is not acknowledging (B-3)"],
      },
    ),
    step(
      { kind: "dispatch", executionId: X, bound: 1 },
      {
        label: "at bound 1 the two earlier-accepted ineligible Events are not candidates under the retired rule",
        observation: obs(X, {
          state: "RUNNING",
          progressRevision: 1,
          progress: { phase: "declared" },
          acknowledged: ["in-1"],
          queued: ["bq-1", "oth-1", "res-9"],
          dispatchedBatch: ["res-9"],
          activationId: "act-2",
          receipt: "receipt:outcome:act-1",
          writerEpoch: 1,
        }),
        forbids: [
          "dispatchedBatch must be ['res-9']: bq-1 and oth-1 were accepted first and are still not candidates",
          "waitEndedReadiness must return to empty: reservation consumes it",
        ],
      },
    ),
    step(
      {
        kind: "submit_outcome",
        outcome: outcome({
          executionId: X,
          activationId: "act-2",
          writerEpoch: 1,
          baseProgressRevision: 1,
          progress: { phase: "re-declared" },
          // The same three alternatives, under a new generation. Re-registration is how an outstanding
          // need is carried forward, because the Kernel retains nothing about it.
          next: { step: "await", wait: { dependencies: [inertInputAlternative, inertTimeoutAlternative, correlatedAlternative], subscriptions: [], generation: "gi2" } },
        }),
      },
      {
        label: "re-registering the same dependency waits again: no satisfied flag survived g1's retirement",
        observation: obs(X, {
          state: "WAITING",
          progressRevision: 2,
          progress: { phase: "re-declared" },
          acknowledged: ["in-1", "res-9"],
          queued: ["bq-1", "oth-1"],
          liveWaitGeneration: "gi2",
          receipt: "receipt:outcome:act-2",
          writerEpoch: 1,
        }),
        forbids: [
          "state must be WAITING: `c9` settled once under gi1, and the Kernel keeps no per-alternative satisfied flag that would carry that forward",
          "a wait-ended readiness preserves a selector, never a satisfaction flag; a Runtime that still needs a dependency re-registers it",
          "waitEndedReadiness must stay empty: nothing retired in this transaction",
        ],
      },
    ),
  ],
};

// -- Scenario 11: completion obligations and terminal ingress (§11 rows 8, 6) --

/**
 * Round-1 review finding K02-R1-01: row 8's completion check was not observed at all, and row 6's
 * terminal arm of B-8 was missing. Round-2 finding K02-R2-01 then corrected *what* about it is
 * observable.
 *
 * CX-3 has two clauses. The second — about *previously owned* obligations — cannot arise until
 * Effects exist; CX-3 says so itself ("K1 without Effects satisfies this trivially ... K2 is where the
 * check becomes non-trivial"), and this packet's contract assigns it to K2.4 rather than pretending to
 * observe it. The first clause — "no newly proposed Effects in that same Outcome" — does apply now.
 *
 * **What this control may and may not require.** The observable obligation is that the completing
 * envelope is *not accepted*: the Execution must not reach a terminal state, nothing may be committed,
 * and the refusal must be recorded inspectably. It is **not** that the Kernel expose a
 * completion-specific rejection reason. An earlier revision demanded exactly that, and required the
 * oracle to fail a candidate whose reason said only that Effects are unsupported before K2 — but EF-1
 * and EF-2 already require every K1 Outcome proposing an Effect to be refused as a whole envelope at
 * validation, and §11 row 4 asks for "a recorded, inspectable reason" without saying which. A
 * candidate refusing this envelope on those grounds is conforming, so failing it turned a
 * non-observable internal distinction into a normative requirement and would have rejected a correct
 * K1 implementation. That requirement is withdrawn; the reason recorded here is the same EF-2 refusal
 * the Effect-refusal scenario pins, because that is the answer the protocol actually mandates.
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
        label: "`complete` proposing new owned work is rejected whole, and the Execution does not become COMPLETED",
        observation: obs(X, {
          state: "RUNNING",
          queued: ["in-1"],
          activationId: "act-1",
          dispatchedBatch: ["in-1"],
          receipt: "receipt:create:req-x",
          rejection: { classification: "malformed_envelope", reason: "Effect proposals are not supported before K2" },
          writerEpoch: 1,
        }),
        forbids: [
          "state must stay RUNNING: an Execution must not reach a terminal state carrying unaccounted owned work",
          "progressRevision must stay 0 and progress null: the completing envelope is refused whole, not stripped of its Effect and then accepted",
          "acknowledged must stay empty: a refused completing envelope acknowledges no part of its batch",
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

// Round-14 self-audit: previously unowned, already expressible decision clauses.
export const citedDecisionEdges: Scenario = {
  id: "cited-decision-edges",
  title: "cited clauses: selector equality, ordinary reservation, stale revision/exchange and accepted replay after cancel",
  sources: ["K0.1 §11 rows 2/3/5/7/8: ID-9 case 4, OA-3, W-1/W-7, B-2/B-3, CX-6, W-9"],
  k0BoundaryRows: [1, 2, 3, 5, 7],
  isUnsafeControl: false,
  waits: {early: {dependencies: [{kinds: ["child.result"], correlation: "c1"}, {eventIdentity: "early", kinds: ["alternate.result", "child.result"], correlation: "c2"}], subscriptions: [], generation: "edge-g1"}, exact: {dependencies: [{eventIdentity: "match", kinds: ["kind.a", "kind.b"], correlation: "c3"}], subscriptions: [], generation: "edge-g2"}, deadline: {dependencies: [], subscriptions: [{subscriptionClass: "continue"}], deadline: 1000, generation: "edge-g3"}},
  steps: [
    step(
      {kind: "create", executionId: "exec-clauses", requestKey: "edge-key", producer: "edge-producer", initialInput: {eventId: "edge-in", destination: "exec-clauses", kind: "external.input", category: "application_input", producer: "edge-producer", requestKey: "edge-key", subscriptionClass: "initial"}, definitionRevision: "fake-runtime@1"},
      { label: "Create a new Execution for the clause-edge schedule",
        observation: obs("exec-clauses", {
          queued: ["edge-in"],
          receipt: "receipt:create:edge-key",
        }),
      },
    ),
    step(
      {kind: "dispatch", executionId: "exec-clauses", bound: 1},
      { label: "B-2 reservation pins its exact bounded batch without acknowledgment",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          queued: ["edge-in"],
          dispatchedBatch: ["edge-in"],
          activationId: "edge-a1",
          receipt: "receipt:create:edge-key",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "accept_event", event: {eventId: "wrong", destination: "exec-clauses", kind: "child.result", category: "kernel_event", correlation: "other"}},
      { label: "Unrelated result is accepted before registration",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          queued: ["edge-in", "wrong"],
          dispatchedBatch: ["edge-in"],
          activationId: "edge-a1",
          receipt: "receipt:create:edge-key",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "accept_event", event: {eventId: "early", destination: "exec-clauses", kind: "child.result", category: "kernel_event", correlation: "c2"}},
      { label: "The already-accepted result matches only the second alternative",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          queued: ["edge-in", "wrong", "early"],
          dispatchedBatch: ["edge-in"],
          activationId: "edge-a1",
          receipt: "receipt:create:edge-key",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "submit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a1", writerEpoch: 1, baseProgressRevision: 0, progress: {cursor: 1}, emissions: [], effects: [], next: {step: "await", wait: {dependencies: [{kinds: ["child.result"], correlation: "c1"}, {eventIdentity: "early", kinds: ["alternate.result", "child.result"], correlation: "c2"}], subscriptions: [], generation: "edge-g1"}}}},
      { label: "Accept the whole Outcome under the current exchange/revision",
        observation: obs("exec-clauses", {
          progressRevision: 1,
          progress: {cursor: 1},
          acknowledged: ["edge-in"],
          queued: ["wrong", "early"],
          waitEndedReadiness: [{generation: "edge-g1", species: "event"}],
          receipt: "receipt:outcome:edge-a1",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "accept_event", event: {eventId: "late-eligible", destination: "exec-clauses", kind: "child.result", category: "kernel_event", correlation: "c1"}},
      { label: "B-2 evaluates candidates at reservation, including a later eligible Event",
        observation: obs("exec-clauses", {
          progressRevision: 1,
          progress: {cursor: 1},
          acknowledged: ["edge-in"],
          queued: ["wrong", "early", "late-eligible"],
          waitEndedReadiness: [{generation: "edge-g1", species: "event"}],
          receipt: "receipt:outcome:edge-a1",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "dispatch", executionId: "exec-clauses", bound: 2},
      { label: "B-2 reservation pins its exact bounded batch without acknowledgment",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          progressRevision: 1,
          progress: {cursor: 1},
          acknowledged: ["edge-in"],
          queued: ["wrong", "early", "late-eligible"],
          dispatchedBatch: ["early", "late-eligible"],
          activationId: "edge-a2",
          receipt: "receipt:outcome:edge-a1",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "submit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a2", writerEpoch: 1, baseProgressRevision: 1, progress: {cursor: 2}, emissions: [], effects: [], next: {step: "await", wait: {dependencies: [{eventIdentity: "match", kinds: ["kind.a", "kind.b"], correlation: "c3"}], subscriptions: [], generation: "edge-g2"}}}},
      { label: "Accept the whole Outcome under the current exchange/revision",
        observation: obs("exec-clauses", {
          state: "WAITING",
          progressRevision: 2,
          progress: {cursor: 2},
          acknowledged: ["edge-in", "early", "late-eligible"],
          queued: ["wrong"],
          liveWaitGeneration: "edge-g2",
          receipt: "receipt:outcome:edge-a2",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "accept_event", event: {eventId: "impostor", destination: "exec-clauses", kind: "kind.b", category: "kernel_event", correlation: "c3"}},
      { label: "Exact Event identity mismatch is ineligible even when kind and correlation match",
        observation: obs("exec-clauses", {
          state: "WAITING",
          progressRevision: 2,
          progress: {cursor: 2},
          acknowledged: ["edge-in", "early", "late-eligible"],
          queued: ["wrong", "impostor"],
          liveWaitGeneration: "edge-g2",
          receipt: "receipt:outcome:edge-a2",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "accept_event", event: {eventId: "match", destination: "exec-clauses", kind: "kind.b", category: "kernel_event", correlation: "c3"}},
      { label: "The second kind-set member is a valid equality match",
        observation: obs("exec-clauses", {
          progressRevision: 2,
          progress: {cursor: 2},
          acknowledged: ["edge-in", "early", "late-eligible"],
          queued: ["wrong", "impostor", "match"],
          waitEndedReadiness: [{generation: "edge-g2", species: "event"}],
          receipt: "receipt:outcome:edge-a2",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "dispatch", executionId: "exec-clauses", bound: 1},
      { label: "B-2 reservation pins its exact bounded batch without acknowledgment",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          progressRevision: 2,
          progress: {cursor: 2},
          acknowledged: ["edge-in", "early", "late-eligible"],
          queued: ["wrong", "impostor", "match"],
          dispatchedBatch: ["match"],
          activationId: "edge-a3",
          receipt: "receipt:outcome:edge-a2",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "submit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a3", writerEpoch: 1, baseProgressRevision: 2, progress: {cursor: 3}, emissions: [], effects: [], next: {step: "continue"}}},
      { label: "Accept the whole Outcome under the current exchange/revision",
        observation: obs("exec-clauses", {
          progressRevision: 3,
          progress: {cursor: 3},
          acknowledged: ["edge-in", "early", "late-eligible", "match"],
          queued: ["wrong", "impostor"],
          receipt: "receipt:outcome:edge-a3",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "dispatch", executionId: "exec-clauses", bound: 1},
      { label: "B-2 reservation pins its exact bounded batch without acknowledgment",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          progressRevision: 3,
          progress: {cursor: 3},
          acknowledged: ["edge-in", "early", "late-eligible", "match"],
          queued: ["wrong", "impostor"],
          dispatchedBatch: ["wrong"],
          activationId: "edge-a4",
          receipt: "receipt:outcome:edge-a3",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "submit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a4", writerEpoch: 1, baseProgressRevision: 0, progress: {cursor: 1}, emissions: [], effects: [], next: {step: "continue"}}},
      { label: "OA-3 stale base revision rejects despite a current exchange and epoch",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          progressRevision: 3,
          progress: {cursor: 3},
          acknowledged: ["edge-in", "early", "late-eligible", "match"],
          queued: ["wrong", "impostor"],
          dispatchedBatch: ["wrong"],
          activationId: "edge-a4",
          receipt: "receipt:outcome:edge-a3",
          rejection: {classification: "stale_exchange", reason: "base progress revision does not match current accepted revision"},
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "submit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a4", writerEpoch: 1, baseProgressRevision: 3, progress: {cursor: 4}, emissions: [], effects: [], next: {step: "continue"}}},
      { label: "Accept the whole Outcome under the current exchange/revision",
        observation: obs("exec-clauses", {
          progressRevision: 4,
          progress: {cursor: 4},
          acknowledged: ["edge-in", "early", "late-eligible", "match", "wrong"],
          queued: ["impostor"],
          receipt: "receipt:outcome:edge-a4",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "dispatch", executionId: "exec-clauses", bound: 1},
      { label: "B-2 reservation pins its exact bounded batch without acknowledgment",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          progressRevision: 4,
          progress: {cursor: 4},
          acknowledged: ["edge-in", "early", "late-eligible", "match", "wrong"],
          queued: ["impostor"],
          dispatchedBatch: ["impostor"],
          activationId: "edge-a5",
          receipt: "receipt:outcome:edge-a4",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "submit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a4", writerEpoch: 1, baseProgressRevision: 4, progress: {cursor: 5}, emissions: [], effects: [], next: {step: "continue"}}},
      { label: "ID-9 case 4: changed content for the old accepted exchange conflicts rather than reviving it",
        observation: obs("exec-clauses", {
          state: "RUNNING",
          progressRevision: 4,
          progress: {cursor: 4},
          acknowledged: ["edge-in", "early", "late-eligible", "match", "wrong"],
          queued: ["impostor"],
          dispatchedBatch: ["impostor"],
          activationId: "edge-a5",
          receipt: "receipt:outcome:edge-a4",
          rejection: {classification: "duplicate_conflict", reason: "accepted exchange has different canonical content"},
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "submit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a5", writerEpoch: 1, baseProgressRevision: 4, progress: {cursor: 5}, emissions: [], effects: [], next: {step: "await", wait: {dependencies: [], subscriptions: [{subscriptionClass: "continue"}], deadline: 1000, generation: "edge-g3"}}}},
      { label: "Accept the whole Outcome under the current exchange/revision",
        observation: obs("exec-clauses", {
          state: "WAITING",
          progressRevision: 5,
          progress: {cursor: 5},
          acknowledged: ["edge-in", "early", "late-eligible", "match", "wrong", "impostor"],
          liveWaitGeneration: "edge-g3",
          acceptedDeadline: 1000,
          receipt: "receipt:outcome:edge-a5",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "deliver_timer", executionId: "exec-clauses", generation: "edge-g3", timeoutEvent: {eventId: "edge-timeout", destination: "exec-clauses", kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: "edge-g3"}},
      { label: "W-9 timeout creates mandatory readiness before cancellation",
        observation: obs("exec-clauses", {
          progressRevision: 5,
          progress: {cursor: 5},
          acknowledged: ["edge-in", "early", "late-eligible", "match", "wrong", "impostor"],
          queued: ["edge-timeout"],
          waitEndedReadiness: [{generation: "edge-g3", species: "deadline"}],
          receipt: "receipt:outcome:edge-a5",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "accept_cancellation", executionId: "exec-clauses"},
      { label: "CX-6 terminal before reservation suppresses the Activation and disposes the timeout",
        observation: obs("exec-clauses", {
          state: "CANCELLED",
          progressRevision: 5,
          progress: {cursor: 5},
          acknowledged: ["edge-in", "early", "late-eligible", "match", "wrong", "impostor"],
          terminalDispositions: ["edge-timeout"],
          receipt: "receipt:outcome:edge-a5",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "resubmit_outcome", outcome: {executionId: "exec-clauses", activationId: "edge-a5", writerEpoch: 1, baseProgressRevision: 4, progress: {cursor: 5}, emissions: [], effects: [], next: {step: "await", wait: {dependencies: [], subscriptions: [{subscriptionClass: "continue"}], deadline: 1000, generation: "edge-g3"}}}},
      { label: "CX-6 accepted nonterminal Outcome replays its original receipt after cancellation; it registers no new wait",
        observation: obs("exec-clauses", {
          state: "CANCELLED",
          progressRevision: 5,
          progress: {cursor: 5},
          acknowledged: ["edge-in", "early", "late-eligible", "match", "wrong", "impostor"],
          terminalDispositions: ["edge-timeout"],
          receipt: "receipt:outcome:edge-a5",
          writerEpoch: 1,
        }),
      },
    ),
    step(
      {kind: "create", executionId: "dest-a", requestKey: "dest-a", producer: "destination-producer", initialInput: {eventId: "dest-a-initial", destination: "dest-a", kind: "external.input", category: "application_input", producer: "destination-producer", requestKey: "dest-a", subscriptionClass: "continue"}, definitionRevision: "fake-runtime@1"},
      { label: "Create an independent destination for ID-2 scope comparison",
        observation: obs("dest-a", {
          queued: ["dest-a-initial"],
          receipt: "receipt:create:dest-a",
        }),
      },
    ),
    step(
      {kind: "create", executionId: "dest-b", requestKey: "dest-b", producer: "destination-producer", initialInput: {eventId: "dest-b-initial", destination: "dest-b", kind: "external.input", category: "application_input", producer: "destination-producer", requestKey: "dest-b", subscriptionClass: "continue"}, definitionRevision: "fake-runtime@1"},
      { label: "Create an independent destination for ID-2 scope comparison",
        observation: obs("dest-b", {
          queued: ["dest-b-initial"],
          receipt: "receipt:create:dest-b",
        }),
      },
    ),
    step(
      {kind: "accept_event", event: {eventId: "dest-a-input", destination: "dest-a", kind: "external.input", category: "application_input", producer: "destination-producer", requestKey: "same-input-key", subscriptionClass: "continue"}},
      { label: "Same producer and raw input key, distinct destination: independently accepted input",
        observation: obs("dest-a", {
          queued: ["dest-a-initial", "dest-a-input"],
          receipt: "receipt:create:dest-a",
        }),
      },
    ),
    step(
      {kind: "accept_event", event: {eventId: "dest-b-input", destination: "dest-b", kind: "external.input", category: "application_input", producer: "destination-producer", requestKey: "same-input-key", subscriptionClass: "continue"}},
      { label: "Same producer and raw input key, distinct destination: independently accepted input",
        observation: obs("dest-b", {
          queued: ["dest-b-initial", "dest-b-input"],
          receipt: "receipt:create:dest-b",
        }),
      },
    ),
  ],
};

/** ID-9 case 1: acceptance after ordinary redelivery, with no intervening takeover. */
export const redeliveryAcceptance: Scenario = {
  id: "redelivery-acceptance",
  title: "ordinary redelivery does not make a current Outcome stale",
  sources: ["K0.1 ID-9 case 1; ID-3/ID-4; OA-3"],
  k0BoundaryRows: [2],
  isUnsafeControl: false,
  steps: [
    createAndActivationIdentity.steps[0]!,
    createAndActivationIdentity.steps[3]!,
    step({ kind: "redeliver_dispatch", executionId: X }, {
      label: "ordinary redelivery retains the current exchange without a takeover",
      observation: createAndActivationIdentity.steps[3]!.expect.observation,
    }),
    step({ kind: "submit_outcome", outcome: outcome({ executionId: X, activationId: "act-1", progress: { step: 1 }, next: { step: "continue" } }) }, {
      label: "the still-current Outcome is accepted normally after repeated delivery",
      observation: obs(X, { progressRevision: 1, progress: { step: 1 }, acknowledged: ["in-1"], receipt: "receipt:outcome:act-1", writerEpoch: 1 }),
      forbids: ["ordinary redelivery alone never makes the Outcome stale"],
    }),
  ],
};

// -- The published set -------------------------------------------------------

export const ALL_SCENARIOS: readonly Scenario[] = [
  k0Trace,
  citedDecisionEdges,
  redeliveryAcceptance,
  delayedRuntimeNonBlocking,
  createAndActivationIdentity,
  producerScopedCreateIdentity,
  wholeEnvelopeValidation,
  duplicateAndConflictingOutcome,
  staleTimerAndLostWake,
  subscriptionWaitDeadline,
  inertAlternativeEligibility,
  cancelVersusComplete,
  completionObligations,
  missingCheckpointCode,
  effectRefusalAndSinkAttribution,
];

/** Decision M-1's four named unsafe/state-loss controls, in its own order. */
export const UNSAFE_CONTROLS: readonly Scenario[] = ALL_SCENARIOS.filter((scenario) => scenario.isUnsafeControl);
