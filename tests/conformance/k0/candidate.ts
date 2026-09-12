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
    forbiddenBy: "B-5 and §11 row 8: an unacknowledged Event at a terminal state is never *treated as processed*; B-3, only the reserved batch is acknowledged",
    // Round-4 review finding K02-R4-02 named R8-b: "rather than deleting it or treating it as
    // processed" is two forbidden alternatives, and this transcript only ever exercised the second.
    // It stays the treated-as-processed half; silent deletion has its own transcript below.
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
    forbiddenBy: "OA-2: an exact duplicate re-runs no part of acceptance, so the accepted progress revision does not advance",
    // Narrowed by round-4 review finding K02-R4-02: it used to mutate the revision *and* the emission
    // list, so one transcript stood for two assertions a candidate can fail separately. The progress
    // writer and the emission publisher are different writers, exactly as row 7 already recognises.
    stepIndex: 3,
    mustNameFields: ["progressRevision"],
    mutate: (observation) => ({ ...observation, progressRevision: 2 }),
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
    forbiddenBy: "W-3: a timer naming a superseded generation cannot wake a replacement wait; kernel.md says so directly",
    // Narrowed twice. Round 3 separated the timeout-Event half. Round-4 review finding K02-R4-02 named
    // this entry again: "retires nothing" and "wakes nothing" are still two assertions, and the
    // transcript changed both fields at once. A timer handler can wake while leaving the generation
    // live, or retire the generation without producing readiness; they are different lines of code.
    // This transcript is now the *wake* half alone.
    stepIndex: 6,
    mustNameFields: ["state"],
    mutate: (observation) => ({ ...observation, state: "READY" }),
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
    forbiddenBy: "CX-6: OA-2's receipt rule does not apply to a rejected Outcome, because no Outcome was accepted, so no acceptance receipt may be manufactured by replay",
    // Narrowed by round-4 review finding K02-R4-02's sweep: manufacturing a receipt and losing the
    // recorded rejection are separate failures. A candidate can return the rejection correctly and
    // still fill in a receipt field beside it.
    stepIndex: 4,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1" }),
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
    forbiddenBy: "§11 row 1 and execution-protocol.md: changing content under an accepted request key is never an edit",
    // Narrowed in round 3: this transcript is the *edit* half. Failing to record the conflict at all is
    // a different bug with its own transcript below.
    stepIndex: 2,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["in-DIFFERENT"] }),
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
    stepIndex: 7,
    mustNameFields: ["activationId"],
    mutate: (observation) => ({ ...observation, activationId: "act-1" }),
  },
  {
    id: "envelope/valid-prefix-kept-when-a-later-member-is-malformed",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "emissions are recorded as they are walked and validation stops at the first bad one, so the valid first emission " +
      "and the progress in the same envelope are committed while the envelope is reported rejected",
    forbiddenBy: "OA-3/OA-5 and §11 row 3: a failure anywhere in envelope validation installs no progress",
    // Narrowed by round-4 review finding K02-R4-02, which named this entry: it committed progress and
    // an emission together, so a candidate leaking only one of the two was covered by nothing specific.
    stepIndex: 2,
    mustNameFields: ["progressRevision"],
    mutate: (observation) => ({ ...observation, progressRevision: 1, progress: { cursor: 1 } }),
  },
  {
    id: "envelope/structurally-empty-wait-registered-because-it-has-a-deadline",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "well-formedness is read as 'the wait must be able to end', so a declaration with both lists empty is accepted " +
      "whenever it carries a deadline, and the Execution is parked on a wait W-1 calls malformed",
    forbiddenBy: "W-1 well-formedness case 1: a deadline does not rescue a declaration with both lists empty; the deadline bounds a wait rather than being the thing waited for",
    stepIndex: 4,
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
    forbiddenBy: "OA-3/OA-5: a rejected Outcome commits no progress, on a completing envelope as on any other",
    // Narrowed by round-4 review finding K02-R4-02, which named R8-a as still bundled: this
    // transcript is now the progress half alone, and the acknowledgment half has its own below.
    stepIndex: 2,
    mustNameFields: ["progressRevision"],
    mutate: (observation) => ({ ...observation, progressRevision: 1, progress: { done: true } }),
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
    forbiddenBy: "§11 row 1: a replayed create under the same key returns the same receipt, not another charge",
    // Round-3 review finding K02-R3-01 narrowed this. It used to mutate the receipt *and* re-queue the
    // input, so one transcript stood in for three separate row-1 assertions and a candidate that got
    // two of them right was still failed by the same evidence. Each now has its own transcript.
    stepIndex: 1,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:create:req-x-2" }),
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
    forbiddenBy: "W-4 and mental-model.md: WAITING means an accepted Outcome declared a Kernel-visible dependency, which Runtime-local work is not",
    // Narrowed by round-4 review finding K02-R4-02's sweep: the lifecycle claim and the record's
    // existence are separately violable — an implementation can create the record for its own
    // bookkeeping while still reporting RUNNING. This transcript is now the lifecycle half.
    stepIndex: 4,
    mustNameFields: ["state"],
    mutate: (observation) => ({ ...observation, state: "WAITING" }),
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

  // == Round-3 additions (review finding K02-R3-01) ==========================
  //
  // Each of these exists because a §11 assertion was counted as covered while nothing here could fail
  // a candidate for breaking it. Grouped by the row they discriminate.

  // -- Row 1: the remaining create-identity assertions ------------------------
  {
    id: "identity-create/retry-mints-a-second-execution-id",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the request-key index is written after the Execution record rather than in the same transaction, so a retry that " +
      "arrives before the index is visible mints a second Execution and answers with its ID",
    forbiddenBy: "§11 row 1 (ID-1, ID-2): a replayed create under the same key returns the *same Execution ID*",
    stepIndex: 1,
    mustNameFields: ["executionId"],
    mutate: (observation) => ({ ...observation, executionId: "exec-x-2" }),
  },
  {
    id: "identity-create/retry-queues-the-initial-input-twice",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "create idempotence is implemented over the Execution record only, so a retry correctly returns the original " +
      "identity and receipt while its copy of the initial input is ingested a second time",
    forbiddenBy: "ID-2/§11 row 1: a replayed create is one accepted create, not one identity with two ingested inputs",
    stepIndex: 1,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["in-1", "in-1"] }),
  },
  {
    id: "identity-create/same-key-different-content-silently-treated-as-a-replay",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the create path deduplicates on the request key without comparing content and answers every repeat as an " +
      "idempotent replay, so the caller's changed request is dropped with nothing recorded to say it was refused",
    forbiddenBy: "§11 row 1: a same-key/different-content create is *rejected as a conflict*, which requires a recorded conflict, not silence",
    stepIndex: 2,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({ ...observation, rejection: null }),
  },

  // -- Row 2: the batch the Outcome is checked against, and the epoch ---------
  {
    id: "envelope/accepted-outcome-leaves-its-batch-unacknowledged",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "acknowledgment is derived from the Events the Outcome explicitly references rather than from the pinned batch, " +
      "so a reserved Event the Runtime did not mention stays unacknowledged and is re-delivered in the next batch",
    forbiddenBy: "B-3 and §11 row 2: an accepted Outcome acknowledges its *entire* pinned batch, which is what makes the batch checkable exactly",
    stepIndex: 7,
    mustNameFields: ["acknowledged"],
    mutate: (observation) => ({ ...observation, acknowledged: [] }),
  },
  {
    id: "identity-activation/takeover-leaves-the-writer-epoch-unchanged",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "takeover re-sends the pinned Activation without advancing the epoch, so the superseded writer's Outcome still " +
      "validates and two writers can commit progress for one exchange",
    forbiddenBy: "ID-9 cases 2-3: a takeover advances the writer epoch under the same Activation ID; keeping the ID is only half the rule",
    stepIndex: 4,
    mustNameFields: ["writerEpoch"],
    mutate: (observation) => ({ ...observation, writerEpoch: 1 }),
  },

  // -- Row 3: the duplicate receipt, and zero partial state -------------------
  {
    id: "control-duplicate/replay-returns-a-fresh-receipt",
    scenarioId: "control-duplicate-conflicting-outcome",
    plausibleBug:
      "the duplicate is correctly detected and nothing is re-committed, but the receipt is minted per submission, so a " +
      "caller retrying after a lost response cannot tell the two answers name the same accepted Outcome",
    forbiddenBy: "OA-2/ID-6: an exact duplicate returns *the original receipt*, not a fresh one for the same accepted Outcome",
    stepIndex: 3,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1#retry" }),
  },
  {
    id: "envelope/rejected-envelope-acknowledges-its-batch",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "the batch is acknowledged when the Activation resolves rather than when an Outcome is accepted, so a rejected " +
      "envelope still consumes its input and the Runtime is recorded as having accounted for Events it must now re-see",
    forbiddenBy: "§11 row 3 and B-3: a failure partway through acceptance leaves no acknowledgment; only an accepted Outcome acknowledges",
    stepIndex: 2,
    mustNameFields: ["acknowledged"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1"] }),
  },

  // -- Row 4: the Effect-intent assertions, now observable --------------------
  {
    id: "effect-refusal/intent-and-proposal-key-bound-before-refusal",
    scenarioId: "effect-refusal-and-sink-attribution",
    plausibleBug:
      "the envelope is walked into domain objects before it is validated, so an Effect ID is minted and its proposal key " +
      "bound while the record is being built; the envelope is then refused and the intent is left behind, reserving a " +
      "proposal key and creating an action record K1 says cannot exist",
    forbiddenBy: "EF-2: 'no Effect ID is minted, no proposal key is bound'; §11 row 4 refuses *before* any intent, ID or proposal-key binding exists; EF-4 — no action record exists at all",
    stepIndex: 2,
    mustNameFields: ["effectIntents"],
    mutate: (observation) => ({ ...observation, effectIntents: ["ef-1", "proposal-key:pk-1"] }),
  },
  {
    id: "effect-refusal/refused-without-a-recorded-reason",
    scenarioId: "effect-refusal-and-sink-attribution",
    plausibleBug:
      "validation returns a boolean and the caller simply declines to commit, so the Effect proposal is dropped with " +
      "nothing inspectable recording that it was refused or why — indistinguishable, to the Runtime, from being ignored",
    forbiddenBy: "§11 row 4: rejection carries 'a recorded, inspectable reason'; EF-1 forbids silently accepted-and-ignored as well as silently stripped",
    stepIndex: 2,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({ ...observation, rejection: null }),
  },

  // -- Row 5(a): the selector grammar, submitted by a candidate at last -------
  {
    id: "envelope/match-everything-alternative-registered",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "well-formedness is implemented as rule 1 alone — count the two lists — so an alternative supplying no selector " +
      "field passes, and a wait meaning 'any application input labelled continue' is registered as 'any Event at all'",
    forbiddenBy: "W-1 well-formedness rule 2 and the selector grammar: an alternative supplying none of the three fields is invalid, not a shorthand for anything",
    stepIndex: 5,
    mustNameFields: ["state", "liveWaitGeneration", "rejection"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-bad-2", dispatchedBatch: null, activationId: null, rejection: null }),
  },
  {
    id: "envelope/empty-kind-set-treated-as-matches-nothing",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "the kind selector is applied with a set-membership test that an empty set satisfies vacuously, so `kinds: []` is " +
      "read as a selector matching nothing and registered as a valid-but-inert alternative",
    forbiddenBy: "W-1's grammar: an empty supplied kind set is rejected before any matching is attempted; absence is expressed by not supplying the field",
    stepIndex: 6,
    mustNameFields: ["state", "liveWaitGeneration", "rejection"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-bad-3", dispatchedBatch: null, activationId: null, rejection: null }),
  },
  {
    id: "wait-structure/inert-alternative-refused-as-unsatisfiable",
    scenarioId: "wait-structure-not-satisfiability",
    plausibleBug:
      "well-formedness is implemented as the withdrawn revision-9 rule — the wait must name at least one source that " +
      "*can end it* — so a declaration whose alternatives the Kernel judges unable to wake it is refused at registration",
    forbiddenBy: "W-1: well-formedness is structural and proves 'structure, never satisfiability'; the Kernel does not audit whether a declared source can wake the Execution",
    stepIndex: 2,
    mustNameFields: ["state", "rejection", "liveWaitGeneration"],
    mutate: (observation) => ({
      ...observation,
      state: "RUNNING",
      progressRevision: 0,
      progress: null,
      acknowledged: [],
      queued: ["in-1"],
      liveWaitGeneration: null,
      dispatchedBatch: ["in-1"],
      activationId: "act-1",
      receipt: "receipt:create:req-x",
      rejection: { classification: "malformed_envelope", reason: "wait declares no source that can end it" },
    }),
  },
  {
    id: "k0-trace/subscription-only-wait-refused-for-an-empty-dependency-list",
    scenarioId: "k0-trace",
    plausibleBug:
      "the dependency list is treated as the wait, and the subscription list as an optional extra, so a wait with no " +
      "dependency alternatives is refused as empty — which makes 001's own K0 trace unrepresentable",
    forbiddenBy: "W-1 rule 1 and W-8: either list may be empty; a subscription-only input wait is first-class, and §11 row 5(a) says so",
    stepIndex: 4,
    mustNameFields: ["state", "liveWaitGeneration", "rejection"],
    mutate: (observation) => ({
      ...observation,
      state: "RUNNING",
      progressRevision: 0,
      progress: null,
      emissions: [],
      acknowledged: [],
      queued: ["in-1", "bq-1"],
      liveWaitGeneration: null,
      dispatchedBatch: ["in-1"],
      activationId: "act-1",
      receipt: "receipt:create:req-x",
      rejection: { classification: "malformed_envelope", reason: "wait declares no dependency alternatives" },
    }),
  },

  // -- Row 5(b): the eligibility category rule, both negative arms ------------
  {
    id: "wait-structure/inert-alternative-wakes-matching-input",
    scenarioId: "wait-structure-not-satisfiability",
    plausibleBug:
      "eligibility is decided by running every Event through the selector grammar before consulting its source category, " +
      "so application input whose kind a dependency alternative happens to name wakes a wait that declared no subscription",
    forbiddenBy: "W-1's category table and W-7 cases 6-7: for application input a matching dependency alternative is inert; only a declared subscription makes it eligible",
    stepIndex: 3,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "READY", liveWaitGeneration: null, waitEndedReadiness: [{ generation: "gi1", species: "event" }] }),
  },
  {
    id: "wait-structure/unmatched-kernel-event-wakes-the-wait",
    scenarioId: "wait-structure-not-satisfiability",
    plausibleBug:
      "a non-application Kernel Event is treated as eligible on arrival because the Execution is waiting and the Event " +
      "is 'the kind of thing it waits for', with the alternative's correlation never compared",
    forbiddenBy: "W-1's category table: every other ordinary Kernel Event is eligible only through a dependency alternative it actually matches under the grammar",
    stepIndex: 4,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "READY", liveWaitGeneration: null, waitEndedReadiness: [{ generation: "gi1", species: "event" }] }),
  },
  {
    id: "subscription-deadline/timeout-withheld-because-nothing-declared-it",
    scenarioId: "control-subscription-wait-deadline",
    plausibleBug:
      "the timeout Event is routed through the same eligibility test as every other Event, so a wait that declares no " +
      "dependency alternative and no matching subscription never receives its own expiry and waits forever",
    forbiddenBy: "W-9 and W-1's category table: the timeout Event is eligible through neither list and reaches the Runtime by construction, as B-7's mandatory member",
    stepIndex: 4,
    mustNameFields: ["state", "queued", "waitEndedReadiness"],
    mutate: (observation) => ({ ...observation, state: "WAITING", queued: ["bq-1"], liveWaitGeneration: "gd1", waitEndedReadiness: [] }),
  },

  // -- Row 5(c): W-2's ordered registration -----------------------------------
  {
    id: "k0-trace/wait-woken-by-its-own-acknowledged-batch",
    scenarioId: "k0-trace",
    plausibleBug:
      "W-2's mailbox check runs before the Outcome's own batch is acknowledged, so the wait is immediately satisfied by " +
      "the very input the Outcome just accounted for and the Execution re-wakes on its own input forever",
    forbiddenBy: "W-2 step 1: this Outcome's own reserved batch is acknowledged *first* and is therefore not a candidate in step 2",
    stepIndex: 4,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "READY", liveWaitGeneration: null, waitEndedReadiness: [{ generation: "g1", species: "event" }] }),
  },

  // -- Row 5(d): retirement, and the flag the Kernel does not keep ------------
  {
    id: "subscription-deadline/deadline-expiry-leaves-the-generation-live",
    scenarioId: "control-subscription-wait-deadline",
    plausibleBug:
      "the expiry handler mints the timeout Event and sets READY but retires the registration lazily at the next " +
      "dispatch, leaving a live generation that a redelivered timer can fire against a second time",
    forbiddenBy: "W-1(d)/B-7: a current-generation deadline expiry retires the registration and its generation in the same transaction that mints the timeout",
    stepIndex: 4,
    mustNameFields: ["liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, liveWaitGeneration: "gd1" }),
  },
  {
    id: "wait-structure/re-registered-dependency-treated-as-already-satisfied",
    scenarioId: "wait-structure-not-satisfiability",
    plausibleBug:
      "retirement records which alternative settled, so re-registering a dependency the Kernel has seen settle once is " +
      "immediately ready — a satisfaction flag carried across generations instead of a selector",
    forbiddenBy: "W-1(d)/B-6: the Kernel keeps no per-alternative satisfied flag; a wait-ended readiness preserves a selector, and a Runtime that still needs a dependency re-registers it",
    stepIndex: 7,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "READY", liveWaitGeneration: null, waitEndedReadiness: [{ generation: "gi2", species: "event" }] }),
  },

  // -- Row 5(f) and row 6: readiness, now a fact rather than prose ------------
  {
    id: "control-stale-timer/stale-timer-mints-a-timeout-for-a-retired-generation",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the timer handler checks the generation before waking but mints the timeout Event unconditionally, so a retired " +
      "generation's expiry is delivered into the mailbox of the wait that replaced it",
    forbiddenBy: "W-3/W-9: a timer naming a superseded generation creates no timeout Event at all, not merely no wake",
    stepIndex: 6,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["to-g1"] }),
  },
  {
    id: "control-stale-timer/duplicate-timer-arms-a-second-readiness",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "timeout Event creation is made idempotent by keying on the generation, but the readiness commit beside it is not, " +
      "so a redelivered timer leaves a second readiness outstanding behind the first with no second Event to show for it",
    forbiddenBy: "W-9 and B-8: a duplicate timer for an already-accepted expiry creates no second timeout Event, readiness or logical timeout",
    stepIndex: 8,
    mustNameFields: ["waitEndedReadiness"],
    mutate: (observation) => ({
      ...observation,
      waitEndedReadiness: [
        { generation: "g2", species: "deadline" },
        { generation: "g2", species: "deadline" },
      ],
    }),
  },
  {
    id: "control-stale-timer/late-result-arms-a-second-readiness",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the ingress path arms readiness whenever an arriving Event matches the most recently retired wait's rule, without " +
      "first checking that a generation is live. The Execution is already READY, so nothing visible changes now — the " +
      "phantom readiness survives the next reservation and re-selects a batch afterwards",
    forbiddenBy: "B-8 and §3 row 6: an Event accepted while READY, RUNNING or terminal creates no readiness, so a second readiness can never arm behind the first",
    stepIndex: 9,
    mustNameFields: ["waitEndedReadiness"],
    mutate: (observation) => ({
      ...observation,
      waitEndedReadiness: [
        { generation: "g2", species: "deadline" },
        { generation: "g2", species: "event" },
      ],
    }),
  },
  {
    id: "control-stale-timer/event-accepted-while-running-arms-a-readiness",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "an arriving result is treated as a wake for whatever the Execution is doing, so an Event accepted while an " +
      "Activation is in flight arms a readiness for a wait that does not exist yet",
    forbiddenBy: "B-8 and §3 row 6: while RUNNING no generation is live (W-3), so an accepted Event is a mailbox fact and nothing more",
    stepIndex: 2,
    mustNameFields: ["waitEndedReadiness"],
    mutate: (observation) => ({ ...observation, waitEndedReadiness: [{ generation: "g0", species: "event" }] }),
  },
  {
    id: "k0-trace/late-arrival-dropped-instead-of-queued",
    scenarioId: "k0-trace",
    plausibleBug:
      "an Event that cannot join the pinned batch is discarded rather than retained, so input arriving during RUNNING is " +
      "lost instead of becoming a later candidate",
    forbiddenBy: "B-4 and §11 row 6: an Event accepted during an in-flight Activation remains queued for later B-2 selection or B-5 disposition; it is never silently dropped",
    stepIndex: 3,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["in-1"] }),
  },

  // -- Row 7: the CX-6 fence, one assertion at a time -------------------------
  {
    id: "control-cancel/cancellation-leaves-the-execution-running",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "cancellation is recorded as a request and applied only when the in-flight Activation reports back, so the control " +
      "path never reaches a terminal state on its own and a Runtime that never answers is never cancelled",
    forbiddenBy: "CX-1/CX-2 and §11 row 7: cancellation request acceptance is itself the fence, and the cancellation control path reaches CANCELLED",
    stepIndex: 2,
    mustNameFields: ["state", "terminalDispositions"],
    mutate: (observation) => ({ ...observation, state: "RUNNING", terminalDispositions: [], dispatchedBatch: ["in-1"], activationId: "act-1" }),
  },
  {
    id: "control-cancel/losing-outcome-rejected-with-the-wrong-classification",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the fence is implemented as a generic 'the Activation is no longer current' check, so the loser is reported as a " +
      "stale exchange and a caller cannot tell an authority failure from a terminal-decision race it should not retry",
    forbiddenBy: "CX-6, which the accepted worksheet fixes by name: the losing Outcome is rejected with the cancellation/terminal-conflict classification. §11 row 7 states it explicitly",
    stepIndex: 3,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({ ...observation, rejection: { classification: "stale_exchange", reason: "activation act-1 is no longer current" } }),
  },
  {
    id: "control-cancel/losing-emissions-published",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "emissions are published as the envelope is walked, before the fence is consulted, so a losing Outcome's output " +
      "reaches subscribers even though the Outcome is rejected and its progress correctly discarded",
    forbiddenBy: "CX-6 and §11 row 7: the losing Outcome accepts zero emissions, separately from installing zero progress",
    stepIndex: 3,
    mustNameFields: ["emissions"],
    mutate: (observation) => ({ ...observation, emissions: ["em-late"] }),
  },
  {
    id: "control-cancel/losing-outcome-acknowledges-its-batch",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the reserved batch is acknowledged when the Activation resolves in any way, so the loser's rejection still records " +
      "the Runtime as having accounted for input it never produced an accepted Outcome for",
    forbiddenBy: "CX-6/B-3/B-5: a rejected losing Outcome acknowledges none of that batch, which instead takes a terminal disposition",
    stepIndex: 3,
    mustNameFields: ["acknowledged", "terminalDispositions"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1"], terminalDispositions: [] }),
  },
  {
    id: "control-cancel/losing-outcome-moves-the-execution-off-terminal",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the loser's next step is applied because the lifecycle writer runs outside the fenced transaction, so a rejected " +
      "`continue` reopens a CANCELLED Execution for another Activation",
    forbiddenBy: "CX-6 and §11 row 7: the losing Outcome produces no wait, deadline or next-state change; CX-2, terminal states do not reopen",
    stepIndex: 3,
    mustNameFields: ["state"],
    mutate: (observation) => ({ ...observation, state: "READY" }),
  },
  {
    id: "control-cancel/losing-outcome-mints-an-effect-intent",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "intents are constructed during envelope walking and committed by a separate writer that the cancellation fence " +
      "does not cover, so a rejected losing Outcome still leaves an accepted intent behind",
    forbiddenBy: "CX-6 and §11 row 7: the losing Outcome creates zero Effect intents; EF-1/EF-2 mean none may exist at K1 in the first place",
    stepIndex: 3,
    mustNameFields: ["effectIntents"],
    mutate: (observation) => ({ ...observation, effectIntents: ["ef-late"] }),
  },

  {
    id: "control-cancel/complete-loser-escapes-the-fence",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the fence is applied where `continue` is handled, because that is the path that would obviously reopen a " +
      "cancelled Execution, while `complete` is handled by a terminal-decision writer that checks only 'is this " +
      "Execution already terminal in the way I am about to make it'",
    forbiddenBy: "Decision M-1, which requires the control to assert CX-6's full rejection for *both* `continue` and `complete`; CX-2, the first accepted terminal decision wins",
    stepIndex: 5,
    mustNameFields: ["state", "progressRevision"],
    mutate: (observation) => ({
      ...observation,
      state: "COMPLETED",
      progressRevision: 1,
      progress: { cursor: 6 },
      receipt: "receipt:outcome:act-1",
      rejection: null,
    }),
  },

  // == Round-4 additions (review finding K02-R4-02) ==========================
  //
  // Each of these is the second half of an entry that was still bundling two independently violable
  // assertions after round 3 — the systemic half of K02-R3-01 that C4's reconstruction pass did not
  // reach, because it applied the split rule to entries it was adding and not to entries it inherited.

  {
    id: "k0-trace/acknowledgment-runs-past-the-pinned-batch",
    scenarioId: "k0-trace",
    plausibleBug:
      "acknowledgment is driven by a mailbox position rather than by batch membership, so accepting an " +
      "Outcome marks everything accepted up to that point — including input that was never reserved and " +
      "which the Runtime has not seen",
    forbiddenBy: "B-3 and §11 row 2: an accepted Outcome acknowledges its entire pinned batch and nothing beyond it, which is what makes the batch checkable exactly",
    stepIndex: 4,
    mustNameFields: ["acknowledged", "queued"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1", "bq-1"], queued: [] }),
  },
  {
    id: "control-duplicate/replay-republishes-the-emission",
    scenarioId: "control-duplicate-conflicting-outcome",
    plausibleBug:
      "the duplicate check guards the progress transaction but the emission publisher sits outside it, " +
      "so a retransmitted Outcome correctly declines to advance the revision and still emits a second time",
    forbiddenBy: "OA-2: an exact duplicate returns the original receipt without re-running acceptance, and an accepted emission is published once",
    stepIndex: 3,
    mustNameFields: ["emissions"],
    mutate: (observation) => ({ ...observation, emissions: ["em-1", "em-1"] }),
  },
  {
    id: "envelope/valid-prefix-emission-kept-when-a-later-member-is-malformed",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "emissions are published as the list is walked and validation stops at the first bad one, so the " +
      "valid first emission has already left the building when the envelope is refused — while the " +
      "progress commit, guarded by the transaction, correctly rolls back",
    forbiddenBy: "OA-3/OA-5 and §11 row 3: a failure anywhere in envelope validation accepts no emissions either, not only no progress",
    stepIndex: 2,
    mustNameFields: ["emissions"],
    mutate: (observation) => ({ ...observation, emissions: ["em-1"] }),
  },
  {
    id: "envelope/bare-empty-wait-registered",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "well-formedness is not checked at all for the two lists, so any `await` registers whatever it was " +
      "handed and an Execution parks on a wait that names nothing",
    forbiddenBy: "W-1 well-formedness rule 1: dependency alternatives + declared subscriptions must be at least 1; both empty is malformed",
    stepIndex: 3,
    mustNameFields: ["state", "liveWaitGeneration", "rejection"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-bad-0", dispatchedBatch: null, activationId: null, rejection: null }),
  },
  {
    id: "wait-structure/inert-alternative-acknowledges-matching-input",
    scenarioId: "wait-structure-not-satisfiability",
    plausibleBug:
      "an Event that matched *something* in the wait record is marked handled on arrival, so an input the " +
      "alternative matched by kind is acknowledged even though it was never eligible, never woke anything " +
      "and was never delivered to the Runtime",
    forbiddenBy: "W-7 cases 6-7: a dependency alternative matching application input is inert — it neither wakes *nor acknowledges*; B-3, only an accepted Outcome acknowledges",
    stepIndex: 3,
    mustNameFields: ["acknowledged", "queued"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1", "bq-1"], queued: [] }),
  },
  {
    id: "control-stale-timer/stale-generation-retires-the-live-registration",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the stale timer is correctly prevented from waking anything, but the handler clears the " +
      "registration before checking the generation, so the live wait is retired and the Execution is left " +
      "waiting on a registration that no longer exists — no readiness will ever come",
    forbiddenBy: "W-3: a timer naming a superseded generation is a no-op that *retires nothing*, which is separable from its not waking anything",
    stepIndex: 6,
    mustNameFields: ["liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, liveWaitGeneration: null }),
  },
  {
    id: "delayed-runtime/runtime-local-work-gets-a-waitingFor-record",
    scenarioId: "delayed-runtime-non-blocking",
    plausibleBug:
      "the scheduler records a waitingFor entry for Runtime-local work so an operator can see what a slow " +
      "Activation is doing, while the lifecycle correctly stays RUNNING — a Kernel-visible wait record " +
      "that no accepted Outcome ever declared",
    forbiddenBy: "W-4: an Activation with only Runtime-local work outstanding creates *no* waitingFor record at all, separately from staying RUNNING",
    stepIndex: 4,
    mustNameFields: ["liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, liveWaitGeneration: "g-local" }),
  },
  {
    id: "control-cancel/exact-retry-loses-the-recorded-rejection",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the rejection is recorded but not durably bound to the submitted identity/content, so an exact " +
      "resubmission finds nothing and answers as though the Outcome had never been seen — no receipt " +
      "manufactured, but the recorded decision is gone",
    forbiddenBy: "CX-6: an authenticated exact resubmission returns the *same recorded rejection classification and reason*",
    stepIndex: 4,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({ ...observation, rejection: null }),
  },
  {
    id: "completion/refused-without-a-recorded-reason",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "the completing envelope is correctly refused whole and nothing is committed, but the refusal is a " +
      "dropped return value rather than a recorded decision, so nothing inspectable says the Execution " +
      "declined to complete or why",
    forbiddenBy: "§11 row 8 with row 4 and OA-5: the refusal is recorded with an inspectable reason, never silently dropped",
    stepIndex: 2,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({ ...observation, rejection: null }),
  },
  {
    id: "completion/refused-envelope-acknowledges-its-batch",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "the batch is acknowledged when the Activation resolves in any way, so a refused completing envelope " +
      "still consumes its reserved input while correctly committing no progress",
    forbiddenBy: "OA-3/OA-5 and B-3: a rejected Outcome acknowledges no part of its batch, which is separable from whether it installed progress",
    stepIndex: 2,
    mustNameFields: ["acknowledged"],
    mutate: (observation) => ({ ...observation, acknowledged: ["in-1"] }),
  },
  {
    id: "completion/refused-envelope-leaves-an-effect-intent",
    scenarioId: "control-completion-obligations",
    plausibleBug:
      "the completing envelope's Effect is walked into an intent before the completion path refuses the " +
      "envelope, so the refusal is reported, nothing else is committed, and an accepted intent with a " +
      "bound proposal key is left behind on an Execution that never completed",
    forbiddenBy: "EF-2: 'no Effect ID is minted, no proposal key is bound'; §11 row 8's 'nothing in it is committed' covers intents as much as progress",
    stepIndex: 2,
    mustNameFields: ["effectIntents"],
    mutate: (observation) => ({ ...observation, effectIntents: ["ef-c1", "proposal-key:p1"] }),
  },
  {
    id: "k0-trace/unacknowledged-event-deleted-without-a-disposition",
    scenarioId: "k0-trace",
    plausibleBug:
      "terminal cleanup drops the mailbox rather than writing a disposition for each entry, so unconsumed " +
      "input simply disappears — not acknowledged, which the cursor bug would do, but gone with no record " +
      "that it was ever accepted",
    forbiddenBy: "B-5 and §11 row 8: each unacknowledged Event gets an *explicit recorded* terminal disposition 'rather than being deleted without record', which is a different failure from being treated as processed",
    stepIndex: 8,
    mustNameFields: ["terminalDispositions"],
    mutate: (observation) => ({ ...observation, terminalDispositions: [] }),
  },

  {
    id: "control-cancel/losing-progress-installed",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the progress writer runs before the cancellation fence is consulted, so a losing Outcome's progress is committed while " +
      "its emissions and batch acknowledgment are correctly withheld — the narrow version of the variant M-1 names",
    forbiddenBy: "CX-6 and §11 row 7: the losing Outcome installs no Runtime progress or progress revision",
    stepIndex: 3,
    mustNameFields: ["progressRevision", "progress"],
    mutate: (observation) => ({ ...observation, progressRevision: 1, progress: { cursor: 5 } }),
  },

  // -- Row 9: the hold has to be inspectable, not merely non-fabricated -------
  {
    id: "control-missing-checkpoint/refused-without-an-inspectable-hold",
    scenarioId: "control-missing-checkpoint-code",
    plausibleBug:
      "recovery refuses by throwing out of the resume path, so the Execution is correctly not restarted and correctly " +
      "not fabricated, but nothing durable records that it is held or why; an operator sees only a failed job",
    forbiddenBy: "PC-5 and §11 row 9: the result is an *explicit* hold/refusal, which requires an inspectable record and not merely the absence of a fabrication",
    stepIndex: 4,
    mustNameFields: ["recoveryHold"],
    mutate: (observation) => ({ ...observation, recoveryHold: null }),
  },

  // -- Row 10: LP-1 and LP-3, with evidence of their own ----------------------
  {
    id: "identity-activation/superseded-writer-epoch-accepted-from-a-stale-read",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the authority check reads the exchange through a cache refreshed outside the acceptance transaction, so the " +
      "epoch the takeover just superseded is still readable as current and the old writer's Outcome commits",
    forbiddenBy: "LP-1: a policy check against local, already-accepted state ('is this Activation ID still the live one') reads the last accepted write with no eventual-consistency window",
    stepIndex: 5,
    mustNameFields: ["progressRevision", "rejection"],
    mutate: (observation) => ({
      ...observation,
      progressRevision: 1,
      progress: { step: 99 },
      receipt: "receipt:outcome:act-1",
      rejection: null,
    }),
  },
  {
    id: "k0-trace/late-input-retracts-accepted-progress",
    scenarioId: "k0-trace",
    plausibleBug:
      "arriving input is treated as superseding whatever the Runtime last said, so a new message rolls back the accepted " +
      "Outcome that preceded it — 'the user corrected us, so what we committed no longer counts'",
    forbiddenBy: "LP-3: ordinary corrective input never itself withdraws or invalidates an already-accepted Outcome; explicit withdrawal is a separate K2-scoped mechanism",
    stepIndex: 5,
    mustNameFields: ["progressRevision", "emissions"],
    mutate: (observation) => ({ ...observation, progressRevision: 0, progress: null, emissions: [] }),
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
