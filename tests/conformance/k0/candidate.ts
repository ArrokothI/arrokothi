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
  /**
   * The governing rule this behaviour actually breaks.
   *
   * Round-2 review finding K02-R2-01 landed because nothing forced this claim to be written down: a
   * transcript was required to fail for recording one permitted rejection reason rather than another,
   * which no accepted decision forbids. Naming the rule makes the claim reviewable, and a violation
   * that cannot cite one is not a counterexample — it is a preference.
   */
  readonly forbiddenBy: string;
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
    forbiddenBy: "§3's wait-ended batch rule and B-2: ineligible backlog is not a candidate at any bound",
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
    forbiddenBy: "B-1/B-4 (per-entry disposition, not a monotonic cursor) and B-3 (only the reserved batch is acknowledged)",
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
    forbiddenBy: "OA-2: an exact duplicate returns the original receipt without re-running acceptance",
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
    forbiddenBy: "OA-2: a same-identity, different-content Outcome is a conflict, rejected and never merged",
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
    forbiddenBy: "W-2 step 2: the mailbox check runs even for an empty dependency list, so no wake is lost",
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
    forbiddenBy: "W-3: a timer naming a superseded generation is a no-op; kernel.md 'stale timers cannot wake a replacement wait'",
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
    forbiddenBy: "CX-6: the losing Outcome installs no progress, accepts no emissions and acknowledges none of its batch. Decision M-1 names this exact variant as failing",
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
    forbiddenBy: "CX-6: an exact resubmission returns the recorded rejection; OA-2's receipt rule does not apply because no Outcome was accepted",
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
    forbiddenBy: "PC-5: missing state is reported explicitly, never presented as a restored one; PC-4 forbids a silent start-over",
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
    forbiddenBy: "§11 row 1 and execution-protocol.md: changing content under an accepted request key is a conflict, never an edit",
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
    forbiddenBy: "ID-9 cases 2-3: a takeover advances the writer epoch under the same Activation ID",
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
    forbiddenBy: "§11 row 2: two semantically different dispatches never carry the same Activation ID",
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
    forbiddenBy: "OA-3/OA-5: a failure anywhere in envelope validation accepts nothing; §11 row 3's zero-partial-state clause",
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
    forbiddenBy: "W-1 well-formedness case 1: both lists empty is malformed, and a deadline does not rescue it",
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
    forbiddenBy: "B-7 and §11 row 5(e): the generation-correlated timeout Event is the mandatory member, retained before any other candidate",
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
    forbiddenBy: "W-2 step 3 and B-7 path A: a past deadline is never persisted as live",
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
    forbiddenBy: "CX-3: a completing Outcome may propose no new Effects; EF-1/EF-2 refuse the envelope outright, so it cannot reach a terminal state",
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
    // Replaces an earlier transcript that failed a candidate merely for recording the EF-2 refusal
    // reason rather than a completion-specific one. Round-2 finding K02-R2-01: that behavior is
    // canonically conforming, so demanding otherwise made the oracle reject a correct K1 candidate.
    // What *is* forbidden is accepting part of a refused completing envelope, which this transcript
    // does: it reports the refusal and commits the progress and acknowledgment underneath it.
    id: "completion/refused-envelope-partly-committed",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "the Effect array is validated and refused, but the surrounding envelope has already been applied, so a completing " +
      "Outcome that was reported rejected still installed its progress and acknowledged its batch — OA-3's all-or-nothing " +
      "rule broken on the one envelope where the leftover state is hardest to see",
    forbiddenBy: "OA-3/OA-5: a rejected Outcome commits no progress and acknowledges no Events, on a completing envelope as on any other",
    stepIndex: 2,
    mustNameFields: ["progressRevision", "acknowledged"],
    mutate: (observation) => ({ ...observation, progressRevision: 1, progress: { done: true }, acknowledged: ["in-1"] }),
  },
  {
    id: "terminal-ingress/late-input-queued-on-a-terminal-execution",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "ingress checks the destination but not the lifecycle, so input arriving after the terminal decision is accepted " +
      "into the mailbox of an Execution that can never read it",
    forbiddenBy: "execution-protocol.md: 'Terminal ingress refuses new ordinary input'; B-8/W-3, no readiness where no generation is live",
    stepIndex: 4,
    mustNameFields: ["queued", "ingressRefused"],
    mutate: (observation) => ({ ...observation, queued: ["late-1"], ingressRefused: null }),
  },
  {
    id: "identity-create/retry-mints-a-second-receipt",
    scenarioId: "identity-create-and-activation",
    plausibleBug: "the create path is not idempotent at all: a retransmitted create is treated as a fresh request, so the caller is charged twice and the initial input is queued twice",
    forbiddenBy: "§11 row 1: a replayed create under the same key returns the same Execution ID and receipt, not another charge",
    stepIndex: 1,
    mustNameFields: ["receipt", "queued"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:create:req-x-2", queued: ["in-1", "in-1"] }),
  },
  {
    id: "k0-trace/late-arrival-joins-the-pinned-batch",
    scenarioId: "k0-trace",
    plausibleBug: "the batch is represented as a live mailbox query rather than a set pinned at reservation, so an Event accepted during RUNNING appears in the Activation the Runtime is already working on",
    forbiddenBy: "B-1 and §11 row 6: the batch is pinned at reservation and a later arrival cannot join it",
    stepIndex: 3,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["in-1", "bq-1"] }),
  },
  {
    id: "k0-trace/unsubscribed-input-wakes-the-execution",
    scenarioId: "k0-trace",
    plausibleBug: "eligibility is decided by Event kind rather than by source category plus declared subscription, so every external.input wakes the Execution regardless of its label — the exact over-match the current 0.8.x matcher has",
    forbiddenBy: "W-1's category rule: application input is eligible only through a declared subscription",
    stepIndex: 5,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "READY", liveWaitGeneration: null }),
  },
  {
    id: "k0-trace/wake-leaves-the-generation-live",
    scenarioId: "k0-trace",
    plausibleBug: "the eligible Event sets readiness but the registration is retired lazily at the next dispatch, leaving a live generation a stale timer could still fire against",
    forbiddenBy: "W-1/B-6: any eligible wake retires the registration and its generation in the same transaction",
    stepIndex: 6,
    mustNameFields: ["liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, liveWaitGeneration: "g1" }),
  },
  {
    id: "control-stale-timer/duplicate-timer-mints-a-second-timeout",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug: "the timer transport is at-least-once and the handler is not idempotent, so a redelivered timer for an already-accepted expiry manufactures a repeat timeout for one wait",
    forbiddenBy: "W-9: at most one timeout Event exists per generation, and redelivery is idempotent",
    stepIndex: 8,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["to-g2", "to-g2"] }),
  },
  {
    id: "control-stale-timer/late-result-discarded-as-stale",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug: "generation fencing is over-generalized from timers to every Event, so an authenticated result accepted after its wait retired is discarded as belonging to an obsolete generation",
    forbiddenBy: "W-3: generation fencing applies to wait-created timers, never to authenticated Kernel Events",
    stepIndex: 9,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["to-g2"] }),
  },
  {
    id: "delayed-runtime/unresolved-activation-reported-as-waiting",
    scenarioId: "delayed-runtime-non-blocking",
    plausibleBug: "a slow Activation is modelled as a Kernel-visible wait, so Runtime-local work gets a waitingFor record and WAITING stops meaning 'an accepted Outcome declared a dependency'",
    forbiddenBy: "W-4: Runtime-local work creates no waitingFor record; mental-model.md, RUNNING means an Activation is unresolved",
    stepIndex: 4,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-local" }),
  },
  {
    id: "control-cancel/reserved-batch-acknowledged-instead-of-disposed",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug: "cancellation drains the mailbox by marking the reserved batch handled, which records the Runtime as having accounted for input it never saw",
    forbiddenBy: "B-5 and §11 row 8: unacknowledged Events take an explicit terminal disposition, never an acknowledgment",
    stepIndex: 2,
    mustNameFields: ["acknowledged", "terminalDispositions"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1"], terminalDispositions: [] }),
  },
  {
    id: "control-cancel/late-cancel-reopens-a-completed-execution",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug: "cancellation is applied unconditionally to any Execution that is not already CANCELLED, so it overwrites an accepted completion instead of reporting it",
    forbiddenBy: "CX-2: the first accepted terminal decision wins; kernel.md, terminal states do not reopen",
    stepIndex: 9,
    mustNameFields: ["state"],
    mutate: (observation) => ({ ...observation, state: "CANCELLED" }),
  },
  {
    id: "effect-refusal/rest-of-the-outcome-silently-split",
    scenarioId: "effect-refusal-and-sink-attribution",
    plausibleBug: "the Effect array is stripped and the remainder of the envelope is accepted, so the Outcome is silently split into the part K1 supports and the part it does not",
    forbiddenBy: "EF-2 and §11 row 4: the rest of an Effect-proposing Outcome is rejected too, not silently split",
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
    forbiddenBy: "EF-1/EF-2: the refusal happens at envelope validation, before any Effect intent exists, so nothing may be dispatched",
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
