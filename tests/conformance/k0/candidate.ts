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
