/**
 * K0.2 public fixture — candidates.
 *
 * Two kinds live here, and the difference between them is the whole point of this packet.
 *
 * 1. `refusingCandidate` is the only candidate that speaks for the **actual repository**. The target
 *    asynchronous protocol is unimplemented (`docs/development/002-implemented-kernel-baseline.md`:
 *    the current tree still has the 0.8.x `Harness`, synchronous controller invocation and
 *    `ControllerResumption`), so it refuses every scenario. Refusal is a third verdict, not a pass and
 *    not a failure. This is what stops a prepared fixture from being mistaken for a K1 result.
 *
 * 2. Scripted transcript candidates exist only to **validate the oracle**, never to claim behavior.
 *    A transcript is a hand-authored trace of what some Kernel would have been observed doing. The
 *    conforming one checks that the runner can report PASS at all; the violating ones — each a
 *    plausible wrong implementation — check that it reports FAIL at the right step for the right
 *    reason. An oracle that passes everything and an oracle that fails everything are equally
 *    worthless, and only running both directions rules both out.
 */

import type { Command, K0Candidate, Observation, Scenario, CandidateRun, CandidateRefusal } from "./fixture.ts";
import type { OperationSink } from "./operation-sink.ts";

// -- The refusing candidate --------------------------------------------------

/**
 * Scaffolding must explicitly refuse unsupported APIs (007's packet preamble). This refuses all of
 * them, naming why, rather than returning a plausible-looking empty observation.
 */
export const refusingCandidate: K0Candidate = {
  name: "unimplemented-target-protocol",
  begin(scenario: Scenario): CandidateRefusal {
    return {
      refused: true,
      reason:
        `scenario ${scenario.id} requires the target Activation/Outcome protocol, which no packet has implemented yet; ` +
        `K1.1–K1.3 own create/dispatch, Outcome acceptance and wait/cancellation races`,
    };
  },
};

// -- Scripted transcript candidates -----------------------------------------

export interface ScriptedCandidateOptions {
  readonly name: string;
  /** The trace this candidate claims, one observation per scenario step, in order. */
  readonly observationsFor: (scenario: Scenario) => readonly Observation[];
  /** Optional side effects against the independent sink, used to exercise ledger attribution. */
  readonly onCommand?: (command: Command, sink: OperationSink, stepIndex: number) => void;
}

export function scriptedCandidate(options: ScriptedCandidateOptions): K0Candidate {
  return {
    name: options.name,
    begin(scenario: Scenario, sink: OperationSink): CandidateRun {
      const observations = options.observationsFor(scenario);
      let stepIndex = 0;
      return {
        apply(command: Command): Observation {
          const index = stepIndex++;
          options.onCommand?.(command, sink, index);
          const observation = observations[index];
          if (observation === undefined) {
            throw new Error(`scripted candidate ${options.name} has no observation for step ${index} of ${scenario.id}`);
          }
          return observation;
        },
      };
    },
  };
}

/**
 * The scenario's own expected observations.
 *
 * Using these as a "conforming" transcript is deliberately circular, and the circularity is the
 * limit of what the conforming case proves: that the runner reports PASS when observations match,
 * and nothing at all about any implementation. The discriminating evidence is on the violating side.
 */
export function expectedObservations(scenario: Scenario): readonly Observation[] {
  return scenario.steps.map((step) => step.expect.observation);
}

export const conformingCandidate: K0Candidate = scriptedCandidate({
  name: "conforming-transcript",
  observationsFor: expectedObservations,
});

// -- Violating transcripts ---------------------------------------------------

/** One plausible wrong implementation, expressed as a mutation of the expected trace. */
export interface Violation {
  readonly id: string;
  /** The scenario it is run against. */
  readonly scenarioId: string;
  /** What a real implementation would plausibly have got wrong to produce this. */
  readonly plausibleBug: string;
  /** The step index the oracle must fail at. */
  readonly stepIndex: number;
  /** Observation fields whose names must appear in the failure detail, proving the oracle caught *this*. */
  readonly mustNameFields: readonly string[];
  readonly mutate: (observation: Observation) => Observation;
  /** Optional sink side effect, for violations about attribution rather than state. */
  readonly onCommand?: (command: Command, sink: OperationSink, stepIndex: number) => void;
}

export const VIOLATIONS: readonly Violation[] = [
  {
    id: "k0-trace/backlog-displaces-the-wake",
    scenarioId: "k0-trace",
    plausibleBug:
      "wait-ended readiness is dropped and the dispatch falls through to B-2's ordinary acceptance-order selection, " +
      "so at bound 1 the single slot goes to the earliest-accepted Event instead of the Event that caused the wake",
    stepIndex: 7,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["bq-1"] }),
  },
  {
    id: "k0-trace/global-cursor-acknowledges-unmatched-input",
    scenarioId: "k0-trace",
    plausibleBug:
      "the mailbox is consumed by advancing one monotonic cursor, so completing acknowledges every Event before the " +
      "cursor — including input that was never eligible and never reserved (the F20 defect B-1 exists to forbid)",
    stepIndex: 8,
    mustNameFields: ["acknowledged", "terminalDispositions"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1", "cont-1", "bq-1", "bq-2"], terminalDispositions: [] }),
  },
  {
    id: "control-duplicate/replay-re-runs-acceptance",
    scenarioId: "control-duplicate-conflicting-outcome",
    plausibleBug:
      "the accepted-duplicate check is placed after envelope validation instead of before it, so an exact retransmission " +
      "is validated and committed a second time, advancing the revision and re-publishing the emission",
    stepIndex: 3,
    mustNameFields: ["progressRevision", "emissions"],
    mutate: (observation) => ({ ...observation, progressRevision: 2, emissions: ["em-1", "em-1"] }),
  },
  {
    id: "control-duplicate/conflict-merged-into-accepted-state",
    scenarioId: "control-duplicate-conflicting-outcome",
    plausibleBug:
      "a same-identity Outcome with different content is treated as an update and patched into accepted state instead " +
      "of being rejected as a conflict",
    stepIndex: 4,
    mustNameFields: ["progress", "rejection"],
    mutate: (observation) => ({ ...observation, progress: { cursor: 99 }, progressRevision: 2, rejection: null }),
  },
  {
    id: "control-stale-timer/lost-wake-on-empty-dependency-list",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "W-2's mailbox check is skipped, so the wait is persisted as WAITING even though an eligible result had already " +
      "been accepted — the classic lost wake",
    stepIndex: 3,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g1" }),
  },
  {
    id: "control-stale-timer/stale-generation-wakes-the-replacement-wait",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the timer handler matches on Execution ID alone and ignores the wait generation, so a timer scheduled for a " +
      "retired wait wakes the wait that replaced it",
    stepIndex: 6,
    mustNameFields: ["state", "liveWaitGeneration", "queued"],
    mutate: (observation) => ({ ...observation, state: "READY", liveWaitGeneration: null, queued: ["to-g1"] }),
  },
  {
    id: "control-cancel/losing-progress-installed-with-next-state-suppressed",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "cancellation is implemented as 'ignore the loser's next step' rather than as a whole-envelope fence, so the " +
      "losing Outcome's progress, emissions and batch acknowledgment are all committed while the lifecycle looks correct. " +
      "Decision M-1 names this variant explicitly as a failing control rather than a conforming one",
    stepIndex: 3,
    mustNameFields: ["progress", "progressRevision", "emissions", "acknowledged"],
    mutate: (observation) => ({
      ...observation,
      progressRevision: 1,
      progress: { cursor: 5 },
      emissions: ["em-late"],
      acknowledged: ["in-1"],
      terminalDispositions: [],
    }),
  },
  {
    id: "control-cancel/exact-retry-manufactures-a-receipt",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the retry path reads only 'have I seen this Outcome identity before?' and returns an acceptance receipt for a " +
      "submission that was recorded as rejected, never accepted",
    stepIndex: 4,
    mustNameFields: ["receipt", "rejection"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1", rejection: null }),
  },
  {
    id: "control-missing-checkpoint/fresh-state-presented-as-restored",
    scenarioId: "control-missing-checkpoint-code",
    plausibleBug:
      "recovery cannot load the pinned definition revision and silently starts the Runtime over, presenting empty " +
      "progress as the restored state instead of holding",
    stepIndex: 4,
    mustNameFields: ["recoveryHold", "progress", "progressRevision"],
    mutate: (observation) => ({ ...observation, recoveryHold: null, progress: null, progressRevision: 0 }),
  },
  {
    id: "identity-create/same-key-different-content-applied-as-an-edit",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the create path deduplicates on the request key alone without comparing content, so a second create under an " +
      "accepted key is treated as an idempotent replay and the changed input silently replaces or joins the accepted one",
    stepIndex: 2,
    mustNameFields: ["rejection", "queued"],
    mutate: (observation) => ({ ...observation, rejection: null, queued: ["in-DIFFERENT"] }),
  },
  {
    id: "identity-activation/takeover-mints-a-new-activation-id",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "recovery treats a takeover as a fresh exchange and mints a new Activation ID, which breaks the retransmission " +
      "identity a later Outcome is checked against (ID-9 cases 2-3)",
    stepIndex: 4,
    mustNameFields: ["activationId"],
    mutate: (observation) => ({ ...observation, activationId: "act-2" }),
  },
  {
    id: "identity-activation/new-exchange-reuses-the-resolved-activation-id",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the Activation ID is derived from the Execution alone, so a genuinely new exchange after the prior one resolved " +
      "carries the same ID and a stale Outcome for the old exchange would validate against the new one",
    stepIndex: 6,
    mustNameFields: ["activationId"],
    mutate: (observation) => ({ ...observation, activationId: "act-1" }),
  },
  {
    id: "envelope/valid-prefix-kept-when-a-later-member-is-malformed",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "emissions are recorded as they are walked and validation stops at the first bad one, so the valid first emission " +
      "and the progress in the same envelope are committed while the envelope is reported rejected",
    stepIndex: 2,
    mustNameFields: ["emissions", "progressRevision"],
    mutate: (observation) => ({ ...observation, emissions: ["em-1"], progressRevision: 1, progress: { cursor: 1 } }),
  },
  {
    id: "envelope/structurally-empty-wait-registered-because-it-has-a-deadline",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "well-formedness is read as 'the wait must be able to end', so a declaration with both lists empty is accepted " +
      "whenever it carries a deadline, and the Execution is parked on a wait W-1 calls malformed",
    stepIndex: 3,
    mustNameFields: ["state", "liveWaitGeneration", "rejection"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-bad", dispatchedBatch: null, activationId: null, rejection: null }),
  },
  {
    id: "subscription-deadline/backlog-takes-the-slot-from-the-timeout",
    scenarioId: "control-subscription-wait-deadline",
    plausibleBug:
      "the wait-ended batch is built by filtering the mailbox through the retired wait's rule, and the timeout is " +
      "expected to match a dependency alternative. This wait has none, so the mandatory member is filtered out and the " +
      "earlier ineligible backlog takes the single slot — the exact inconsistency worksheet revision 8 could not resolve",
    stepIndex: 5,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["bq-1"] }),
  },
  {
    id: "subscription-deadline/past-deadline-persisted-as-a-live-wait",
    scenarioId: "control-subscription-wait-deadline",
    plausibleBug:
      "registration persists WAITING first and schedules the timer afterwards, so a deadline that was already due at " +
      "registration is stored as live and the Execution waits for an expiry that has already passed (B-7 path A)",
    stepIndex: 6,
    mustNameFields: ["state", "liveWaitGeneration", "queued"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "gd2", queued: ["bq-1"] }),
  },
  {
    id: "completion/owned-work-proposed-in-the-completing-outcome-is-accepted",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "the completion check runs as a later cleanup pass rather than at Outcome acceptance, so `complete` commits and " +
      "the Execution reaches COMPLETED with owned work that was never accounted for",
    stepIndex: 2,
    mustNameFields: ["state", "rejection"],
    mutate: (observation) => ({
      ...observation,
      state: "COMPLETED",
      progressRevision: 1,
      progress: { done: true },
      acknowledged: ["in-1"],
      dispatchedBatch: null,
      activationId: null,
      receipt: "receipt:outcome:act-1",
      rejection: null,
    }),
  },
  {
    id: "completion/rejected-for-the-wrong-reason",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "`complete` is refused only because the envelope carries Effects at all, which is the right answer to a different " +
      "question. The completion obligation is never checked, so the same candidate would accept a completion whose owned " +
      "work is unaccounted for once K2 makes Effects legal",
    stepIndex: 2,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({
      ...observation,
      rejection: { classification: "malformed_envelope", reason: "Effect proposals are not supported before K2" },
    }),
  },
  {
    id: "terminal-ingress/late-input-queued-on-a-terminal-execution",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "ingress checks the destination but not the lifecycle, so input arriving after the terminal decision is accepted " +
      "into the mailbox of an Execution that can never read it",
    stepIndex: 4,
    mustNameFields: ["queued", "ingressRefused"],
    mutate: (observation) => ({ ...observation, queued: ["late-1"], ingressRefused: null }),
  },
  {
    id: "identity-create/retry-mints-a-second-receipt",
    scenarioId: "identity-create-and-activation",
    plausibleBug: "the create path is not idempotent at all: a retransmitted create is treated as a fresh request, so the caller is charged twice and the initial input is queued twice",
    stepIndex: 1,
    mustNameFields: ["receipt", "queued"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:create:req-x-2", queued: ["in-1", "in-1"] }),
  },
  {
    id: "k0-trace/late-arrival-joins-the-pinned-batch",
    scenarioId: "k0-trace",
    plausibleBug: "the batch is represented as a live mailbox query rather than a set pinned at reservation, so an Event accepted during RUNNING appears in the Activation the Runtime is already working on",
    stepIndex: 3,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["in-1", "bq-1"] }),
  },
  {
    id: "k0-trace/unsubscribed-input-wakes-the-execution",
    scenarioId: "k0-trace",
    plausibleBug: "eligibility is decided by Event kind rather than by source category plus declared subscription, so every external.input wakes the Execution regardless of its label — the exact over-match the current 0.8.x matcher has",
    stepIndex: 5,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "READY", liveWaitGeneration: null }),
  },
  {
    id: "k0-trace/wake-leaves-the-generation-live",
    scenarioId: "k0-trace",
    plausibleBug: "the eligible Event sets readiness but the registration is retired lazily at the next dispatch, leaving a live generation a stale timer could still fire against",
    stepIndex: 6,
    mustNameFields: ["liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, liveWaitGeneration: "g1" }),
  },
  {
    id: "control-stale-timer/duplicate-timer-mints-a-second-timeout",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug: "the timer transport is at-least-once and the handler is not idempotent, so a redelivered timer for an already-accepted expiry manufactures a repeat timeout for one wait",
    stepIndex: 8,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["to-g2", "to-g2"] }),
  },
  {
    id: "control-stale-timer/late-result-discarded-as-stale",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug: "generation fencing is over-generalized from timers to every Event, so an authenticated result accepted after its wait retired is discarded as belonging to an obsolete generation",
    stepIndex: 9,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["to-g2"] }),
  },
  {
    id: "delayed-runtime/unresolved-activation-reported-as-waiting",
    scenarioId: "delayed-runtime-non-blocking",
    plausibleBug: "a slow Activation is modelled as a Kernel-visible wait, so Runtime-local work gets a waitingFor record and WAITING stops meaning 'an accepted Outcome declared a dependency'",
    stepIndex: 4,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-local" }),
  },
  {
    id: "control-cancel/reserved-batch-acknowledged-instead-of-disposed",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug: "cancellation drains the mailbox by marking the reserved batch handled, which records the Runtime as having accounted for input it never saw",
    stepIndex: 2,
    mustNameFields: ["acknowledged", "terminalDispositions"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1"], terminalDispositions: [] }),
  },
  {
    id: "control-cancel/late-cancel-reopens-a-completed-execution",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug: "cancellation is applied unconditionally to any Execution that is not already CANCELLED, so it overwrites an accepted completion instead of reporting it",
    stepIndex: 9,
    mustNameFields: ["state"],
    mutate: (observation) => ({ ...observation, state: "CANCELLED" }),
  },
  {
    id: "effect-refusal/rest-of-the-outcome-silently-split",
    scenarioId: "effect-refusal-and-sink-attribution",
    plausibleBug: "the Effect array is stripped and the remainder of the envelope is accepted, so the Outcome is silently split into the part K1 supports and the part it does not",
    stepIndex: 2,
    mustNameFields: ["emissions", "progressRevision"],
    mutate: (observation) => ({ ...observation, emissions: ["em-1"], progressRevision: 1, progress: { cursor: 1 } }),
  },
  {
    id: "effect-refusal/refusal-claimed-while-the-sink-was-called",
    scenarioId: "effect-refusal-and-sink-attribution",
    plausibleBug:
      "Effects are dispatched in a step separate from — and before — the transaction that commits progress (the current " +
      "0.8.x `applyOutcome` ordering), so the envelope is reported rejected after the operation has already been attempted",
    stepIndex: 2,
    mustNameFields: [],
    // The observation is left conforming on purpose: only the independent ledger can catch this one.
    mutate: (observation) => observation,
    onCommand: (command, sink, stepIndex) => {
      if (stepIndex !== 2) return;
      sink.attempt({ operationId: "op-1", executionId: "exec-x", operation: "artifact.publish", input: { artifact: "draft-1" } });
    },
  },
];

export function violatingCandidate(violation: Violation): K0Candidate {
  return scriptedCandidate({
    name: `violating:${violation.id}`,
    observationsFor: (scenario) =>
      expectedObservations(scenario).map((observation, index) => (index === violation.stepIndex ? violation.mutate(observation) : observation)),
    ...(violation.onCommand ? { onCommand: violation.onCommand } : {}),
  });
}
