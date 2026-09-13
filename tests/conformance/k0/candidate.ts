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
import { isEligibleUnderWait } from "./protocol-vocabulary.ts";
import type { FixtureEvent } from "./protocol-vocabulary.ts";
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
  /** Predicate-only defects must preserve the independent lifecycle/readiness invariants. */
  readonly isolation?: "selector";
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
  { id: "clauses/r2-f2", scenarioId: "redelivery-acceptance", stepIndex: 3,
    plausibleBug: "The Outcome classifier mistakes ordinary repeated delivery for supersession and takes the ordinary stale rejection branch, retaining the unresolved exchange without committing anything.",
    forbiddenBy: "ID-9 case 1 explicitly evaluates a subsequent Outcome normally; redelivery alone creates no stale writer.",
    mustNameFields: ["state", "progressRevision", "progress", "acknowledged", "queued", "activationId", "dispatchedBatch", "receipt", "rejection"],
    mutate: o => ({ ...o, state: "RUNNING", progressRevision: 0, progress: null, acknowledged: [], queued: ["in-1"], activationId: "act-1", dispatchedBatch: ["in-1"], receipt: "receipt:create:req-x", rejection: { classification: "stale_exchange", reason: "ordinary redelivery incorrectly fenced" } }),
  },
  { id: "clauses/r7-h1", scenarioId: "control-cancel-versus-complete", stepIndex: 4,
    plausibleBug: "The replay path correctly returns the recorded cancellation rejection but runs the proposed progress installer anyway.",
    forbiddenBy: "OA-5/CX-6: replay of a rejected identity never installs progress beside its recorded rejection.",
    mustNameFields: ["progress"], mutate: o => ({ ...o, progress: { leakedReplay: true } }),
  },
  { id: "clauses/r1-i", scenarioId: "cited-decision-edges", stepIndex: 24,
    plausibleBug: "Input deduplication keys by producer/request key and omits destination, so the second destination loses its new input.",
    forbiddenBy: "ID-2 scopes input by producer, destination and producer request key; equal raw keys at different destinations do not collide.",
    mustNameFields: ["queued"], mutate: o => ({ ...o, queued: ["dest-b-initial"] }),
  },
  { id: "clauses/r7-g2", scenarioId: "cited-decision-edges", stepIndex: 20,
    plausibleBug: "Receipt lookup runs after the terminal fence, so an already accepted nonterminal identity is mislabeled as a cancellation loser while its accepted state remains intact.",
    forbiddenBy: "CX-6 final paragraph and OA-2 require replay of an already accepted Outcome before the cancellation fence.", mustNameFields: ["rejection"],
    mutate: (o) => ({ ...o, rejection: { classification: "cancellation_terminal_conflict", reason: "accepted replay incorrectly fenced" } }),
  },
  { id: "clauses/r2-e4", scenarioId: "cited-decision-edges", stepIndex: 16,
    plausibleBug: "The progress installer writes the old-exchange proposal before the duplicate/conflict classifier rejects it, leaving a progress-only leak beside the correct conflict.",
    forbiddenBy: "ID-9 case 4 and OA-2/OA-5: changed content under an already accepted identity conflicts and cannot install progress.", mustNameFields: ["progress"],
    mutate: (o) => ({ ...o, progress: { cursor: 99 } }),
  },
  { id: "clauses/r3-i1", scenarioId: "cited-decision-edges", stepIndex: 13,
    plausibleBug: "The progress installer validates exchange and epoch but writes before checking the base revision, leaving a progress-only leak beside the correct stale-revision rejection.",
    forbiddenBy: "OA-3 checks base progress revision with the current exchange/epoch; OA-5 permits no partial progress under that rejection.", mustNameFields: ["progress"],
    mutate: (o) => ({ ...o, progress: { cursor: 99 } }),
  },
  { id: "clauses/r5-j2", scenarioId: "cited-decision-edges", stepIndex: 12,
    plausibleBug: "After a wait-ended exchange, the ordinary selector reverses retained backlog order and reserves the newer input at bound one.",
    forbiddenBy: "B-2 ordinary readiness and B-4: at bound one the earliest accepted unacknowledged Event wins, including previously ineligible backlog.", mustNameFields: ["dispatchedBatch"],
    mutate: (o) => ({ ...o, dispatchedBatch: ["impostor"] }),
  },
  { id: "clauses/r5-j2b", scenarioId: "control-missing-checkpoint-code", stepIndex: 3,
    plausibleBug: "The dispatcher treats an empty selected list as no work and declines reservation, coherently leaving the Execution READY without an Activation.",
    forbiddenBy: "B-2 explicitly permits ordinary empty batches after continue; no reserved batch is a different fact from an empty reserved batch.", mustNameFields: ["state", "activationId", "dispatchedBatch"],
    mutate: (o) => ({ ...o, state: "READY", activationId: null, dispatchedBatch: null }),
  },
  { id: "clauses/r5-j3", scenarioId: "control-stale-timer-and-lost-wake", stepIndex: 10,
    plausibleBug: "The deadline batch selector keeps only its mandatory timeout and never fills available slots with later eligible results present at reservation.",
    forbiddenBy: "B-2 wait-ended union is evaluated at reservation; W-9 case 3 includes the timeout and later result when the bound has room.", mustNameFields: ["dispatchedBatch"],
    mutate: (o) => ({ ...o, dispatchedBatch: ["to-g2"] }),
  },
  { id: "clauses/r5-j3b", scenarioId: "cited-decision-edges", stepIndex: 6,
    plausibleBug: "The batch presenter reverses acceptance order after selecting the correct union, so all members exist but reach the Runtime in the wrong order.",
    forbiddenBy: "B-2 selects over candidates at reservation and presents the selected batch in acceptance order, never reverse arrival order.", mustNameFields: ["dispatchedBatch"],
    mutate: (o) => ({ ...o, dispatchedBatch: ["late-eligible", "early"] }),
  },
  { id: "clauses/r5-j5", scenarioId: "cited-decision-edges", stepIndex: 6,
    plausibleBug: "The reservation writer prematurely moves an early result from queued to acknowledged when selected, before any Outcome accounts for it.",
    forbiddenBy: "B-1/B-3: reservation pins input; only accepted Outcome acknowledges it, including the early result found during registration.", mustNameFields: ["acknowledged", "queued"],
    mutate: (o) => ({ ...o, acknowledged: ["edge-in", "early"], queued: ["wrong", "late-eligible"] }),
  },
  { id: "clauses/r5-k1", isolation: "selector", scenarioId: "cited-decision-edges", stepIndex: 8,
    plausibleBug: "The eligibility predicate drops exact Event identity while checking kind/correlation; the normal Event-acceptance branch consistently retires the wrong wait and records readiness.",
    forbiddenBy: "W-1 selector conjunction includes exact Event identity: this differently identified Event is not eligible to retire the wait.", mustNameFields: ["state", "liveWaitGeneration", "waitEndedReadiness"],
    mutate: (o) => ({ ...o, state: "READY", liveWaitGeneration: null, waitEndedReadiness: [{ generation: "edge-g2", species: "event" }] }),
  },
  { id: "clauses/r5-k1b", isolation: "selector", scenarioId: "cited-decision-edges", stepIndex: 9,
    plausibleBug: "The eligibility predicate compares only the first allowed kind; the normal ineligible branch consistently retains WAITING and creates no readiness.",
    forbiddenBy: "W-1 finite kind-set membership compares all members by equality, so the matching Event retires its wait.", mustNameFields: ["state", "liveWaitGeneration", "waitEndedReadiness"],
    mutate: (o) => ({ ...o, state: "WAITING", liveWaitGeneration: "edge-g2", waitEndedReadiness: [] }),
  },
  { id: "clauses/r5-k2", isolation: "selector", scenarioId: "cited-decision-edges", stepIndex: 4,
    plausibleBug: "The path-A eligibility predicate scans only the first alternative; the ordinary no-match branch consistently installs WAITING without readiness.",
    forbiddenBy: "W-1 ANY-OF and W-7 case 2: no alternative is privileged by list position; the early match produces B-6 path-A readiness.", mustNameFields: ["state", "liveWaitGeneration", "waitEndedReadiness"],
    mutate: (o) => ({ ...o, state: "WAITING", liveWaitGeneration: "edge-g1", waitEndedReadiness: [] }),
  },
  { id: "clauses/r5-k7", scenarioId: "cited-decision-edges", stepIndex: 19,
    plausibleBug: "The terminal-disposition writer filters out timer-origin Events as scheduler artifacts and loses the accepted timeout while the other cancellation writers finish.",
    forbiddenBy: "W-9 mandatory-delivery terminal exception: cancellation suppresses dispatch and B-5 records the timeout disposition, never silent deletion.", mustNameFields: ["terminalDispositions"],
    mutate: (o) => ({ ...o, terminalDispositions: [] }),
  },
  { id: "clauses/r5-k7b", scenarioId: "cited-decision-edges", stepIndex: 19,
    plausibleBug: "The cancellation readiness cleanup handles live waits but skips a wait already retired by timeout, leaving pending readiness beside correct terminal state/disposition.",
    forbiddenBy: "CX-6 cancellation before reservation suppresses that Activation; B-8 readiness cannot survive terminal cancellation.", mustNameFields: ["waitEndedReadiness"],
    mutate: (o) => ({ ...o, waitEndedReadiness: [{ generation: "edge-g3", species: "deadline" }] }),
  },

  {
    // Self-found in round-16's dependent re-audit of the B-2 neighbourhood (K02-R16-01). B-2 has two
    // selection rules and the *readiness species* is what chooses between them: wait-ended readiness
    // selects by the retired wait's rule, ordinary readiness selects by acceptance order. Clause B-6.4
    // asserted that path B "retires the live registration **and** becomes ready", and its only
    // transcript moved the generation. A wake that retires correctly and then commits ordinary
    // readiness is a coherent state machine — §3 row 5 is exactly that state — and nothing could fail
    // it at the step where the mistake is made.
    id: "k0-trace/path-B-wake-arms-ordinary-readiness",
    scenarioId: "k0-trace",
    plausibleBug:
      "the Event-acceptance wake handler retires the registration and its generation correctly and then simply marks the " +
      "Execution READY, because readiness looked like one flag rather than a record with a species and a retired " +
      "generation — so the next reservation falls through to B-2's ordinary acceptance-order selection",
    forbiddenBy: "B-6 with B-8 and §3 rows 2/5: an eligible wake commits *Event-triggered wait-ended* readiness naming the retired generation, which is what binds the next batch to the retired rule; ordinary READY carries none and is a different selection case",
    stepIndex: 6,
    mustNameFields: ["waitEndedReadiness"],
    mutate: (observation) => ({ ...observation, waitEndedReadiness: [] }),
  },
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
    // Narrowed by round-5 review finding K02-R5-02. It used to clear the recorded rejection *and*
    // install the conflicting progress together, so one transcript stood for two assertions a
    // candidate can fail separately. A plausible partial writer detects and records the duplicate
    // conflict correctly while a progress writer that ran too early leaves the conflicting progress
    // installed (OA-5 exists precisely to prohibit rejected Outcomes leaking partial state). This
    // transcript is now the *merge* half alone: the rejection stays correctly recorded and only
    // accepted state leaks. The *rejection* half has its own transcript below.
    id: "control-duplicate/conflict-merged-into-accepted-state",
    scenarioId: "control-duplicate-conflicting-outcome",
    plausibleBug:
      "the duplicate-conflict check records the rejection but the progress writer ran before it, so the " +
      "conflicting Outcome is correctly recorded as a conflict while its progress is nevertheless patched into accepted state",
    forbiddenBy: "OA-2/OA-5 and §11 row 3: a same-identity, different-content Outcome is never merged or patched, even when its conflict rejection is correctly recorded",
    stepIndex: 4,
    mustNameFields: ["progress", "progressRevision"],
    mutate: (observation) => ({ ...observation, progress: { cursor: 99 }, progressRevision: 2 }),
  },
  {
    // The second half of the split above: the conflict is silently absorbed without any recorded
    // rejection, while accepted state happens to stay. A candidate that deduplicates on identity
    // without comparing content answers every repeat as an idempotent replay.
    id: "control-duplicate/conflict-silently-absorbed-without-rejection",
    scenarioId: "control-duplicate-conflicting-outcome",
    plausibleBug:
      "the create/Outcome path deduplicates on submitted identity without comparing content, so a same-identity " +
      "Outcome with different content is answered as an idempotent replay with nothing recorded to say it was refused",
    forbiddenBy: "OA-2 and §11 row 3: a same-identity, different-content submission is *rejected as a conflict*, which requires a recorded rejection, not silence",
    stepIndex: 4,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({ ...observation, rejection: null }),
  },
  {
    // Round-10 review finding K02-R10-03. The rejected-mints-none half for the duplicate-conflict
    // writer: the conflict is correctly recorded and no conflicting progress is merged (R3-b/b2), but
    // a fresh receipt is minted for the refused request beside the correct rejection. Single
    // receipt-only move, distinct from the rejection half (rejection) and the merge half (progress
    // group) at the same step.
    id: "control-duplicate/conflict-mints-a-fresh-receipt",
    scenarioId: "control-duplicate-conflicting-outcome",
    plausibleBug:
      "the conflict path records the rejection correctly and withholds conflicting progress, but the answer " +
      "writer mints a receipt for every submission it sees, including refused conflicts",
    forbiddenBy: "ID-6 with §11 row 3: a rejected conflict mints no new receipt; the field retains the original accepted receipt beside the recorded rejection",
    stepIndex: 4,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1#conflict" }),
  },
  {
    // Renamed and re-cited by round-13 review finding K02-R13-02. It used to be called
    // `lost-wake-on-empty-dependency-list` and cited W-2 step 2's empty-dependency clause, but
    // `waitOnCorr1` declares a dependency alternative and no subscription: this transcript has always
    // discriminated a candidate that skips the mailbox check *generally*, which is the honest claim.
    // The empty-dependency shortcut is a different line of code and now has its own owner on a
    // schedule that actually has an empty dependency list — see
    // `identity-producer/empty-dependency-list-skips-the-mailbox-check`.
    id: "control-stale-timer/lost-wake-at-registration",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "W-2's mailbox check is skipped, so the wait is persisted as WAITING even though an eligible result had already " +
      "been accepted — the classic lost wake",
    forbiddenBy: "W-2 step 2 with B-6 path A: registering a wait tests every already-accepted, still-unacknowledged Event against it, so an eligible one ends the wait in that same transaction",
    stepIndex: 3,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g1" }),
  },
  {
    // Self-found while re-auditing W-2's clauses under round-13 review finding K02-R13-02. W-2 step 2
    // says "**No timeout Event is created** for that generation", and §3 row 3 is defined as "as row 1,
    // plus exactly one timeout Event" — so a path-A retirement that also mints one has produced row 3
    // where row 5(c) requires row 1. `waitOnCorr1` carries a deadline and is retired at registration by
    // the already-accepted `res-1`, which is exactly the shape that makes the difference visible.
    id: "control-stale-timer/path-A-retirement-mints-a-timeout",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the registration writer mints the generation's timeout Event when it installs the deadline, before the mailbox " +
      "check decides which W-2 branch runs, and the path-A retirement that follows clears the generation without " +
      "retracting the Event already committed — so an otherwise perfect immediate wake leaves a timeout in the mailbox " +
      "for a wait that never timed out",
    forbiddenBy: "W-2 step 2 with §3 row 1: the B-6 path-A transaction creates no timeout Event for the generation it retires; only §3 row 3's already-due deadline branch mints one (W-9)",
    stepIndex: 3,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: [...observation.queued, "to-g1"] }),
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
    stepIndex: 6,
    mustNameFields: ["activationId"],
    mutate: (observation) => ({ ...observation, activationId: "act-2" }),
  },
  {
    // Round-10 review finding K02-R10-02. The third half of ID-3's takeover rule: the takeover keeps
    // the correct Activation ID and advances the epoch correctly, but repins the batch to include
    // mailbox content (in-2) accepted after dispatch. Execution-protocol.md forbids exactly this:
    // "it cannot replace input with new mailbox content under the old Activation ID". Single
    // activation-group field, so no atomicity note is owed; the ID half (R2-c1) and epoch half (R2-c2)
    // at the same step move different fields.
    id: "identity-activation/takeover-repins-the-pinned-batch",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "takeover re-reads the mailbox instead of preserving the pinned exchange input, so the replacement " +
      "attempt pins a new batch covering the late arrival in-2 under the old Activation ID",
    forbiddenBy: "ID-3 with §11 row 2: a takeover preserves the same immutable exchange input; it cannot replace input with new mailbox content under the old Activation ID",
    stepIndex: 6,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["in-1", "in-2"] }),
  },
  {
    // Round-10 review finding K02-R10-02. ID-9 case 1 / ID-3 ordinary redelivery was unrepresentable
    // before `redeliver_dispatch` existed. Each preserved fact gets its own single-field transcript at
    // the redelivery step (index 5), which runs after the late arrival so a wrong repin has content to
    // include. A redelivery that mints a new ID treats the same attempt as a new exchange; one that
    // bumps the epoch treats it as a new attempt; one that repins treats it as new input. All three
    // keep the other two facts correct, so the field sets are distinct and no atomicity note is owed.
    id: "identity-activation/redelivery-mints-a-new-activation-id",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "delivery retry is treated as a fresh exchange and mints a new Activation ID, so an Outcome submitted " +
      "for the original ID would validate against the wrong exchange",
    forbiddenBy: "ID-9 case 1 with ID-3: ordinary Driver redelivery of the same dispatch preserves both the Activation ID and the writer epoch; it is not a new attempt",
    stepIndex: 5,
    mustNameFields: ["activationId"],
    mutate: (observation) => ({ ...observation, activationId: "act-9" }),
  },
  {
    id: "identity-activation/redelivery-advances-the-writer-epoch",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "every delivery is treated as a new attempt and bumps the writer epoch, so the original writer's " +
      "Outcome would validate as stale merely because the network retried",
    forbiddenBy: "ID-4 with ID-9 case 1: the epoch is bumped only by an authenticated takeover decision, never by ordinary retry of the same attempt",
    stepIndex: 5,
    mustNameFields: ["writerEpoch"],
    mutate: (observation) => ({ ...observation, writerEpoch: 2 }),
  },
  {
    id: "identity-activation/redelivery-repins-the-pinned-batch",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "redelivery re-reads the mailbox instead of preserving dispatched input, so the same attempt pins a " +
      "new batch covering the late arrival in-2",
    forbiddenBy: "execution-protocol.md with ID-3: delivery retries preserve dispatched input; a redelivery cannot pick up later mailbox content",
    stepIndex: 5,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["in-1", "in-2"] }),
  },
  {
    id: "identity-activation/new-exchange-reuses-the-resolved-activation-id",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the Activation ID is derived from the Execution alone, so a genuinely new exchange after the prior one resolved " +
      "carries the same ID and a stale Outcome for the old exchange would validate against the new one",
    forbiddenBy: "§11 row 2: two semantically different dispatches never carry the same Activation ID",
    stepIndex: 9,
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
    // Round-9 review finding K02-R9-01. The transcript above is the *acceptance* failure at this step:
    // the malformed wait registers and the rejection disappears. This is the partial under a
    // **correct** refusal, and it is a different candidate entirely — the envelope is refused with the
    // right classification, the Execution stays RUNNING with its Activation and pinned batch intact,
    // no generation is live, and the only thing wrong is that the deadline supplied in the refused
    // envelope was parsed and stored before validation ran. OA-5 names wait/deadline/readiness/
    // next-state among what a rejected Outcome must not create, and a malformed envelope is a rejected
    // Outcome, so the leak is a violation on its own terms rather than a consequence of the refusal
    // failing. R7-a6c is the same fact at the CX-6 cancellation fence, which is a different rejection
    // writer: a candidate that validates the envelope before committing anything but checks
    // terminal-conflict afterwards gets one right and the other wrong.
    id: "envelope/malformed-wait-leaks-its-accepted-deadline",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "the deadline in the submitted wait is parsed and committed while the envelope is still being walked, so " +
      "whole-envelope validation refuses the declaration correctly and nothing else is accepted, but the accepted " +
      "deadline fact from the refused envelope is already stored and is never rolled back",
    forbiddenBy: "OA-5 with §11 row 3: a rejected Outcome — a malformed envelope included — creates no wait, deadline, readiness or next-state transition, so a failure partway through acceptance leaves zero partial state",
    stepIndex: 4,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: 5_000 }),
  },
  {
    // Round-10 review finding K02-R10-01. The wait/lifecycle half at the same whole-envelope-validation
    // writer as R3-c4 above: the malformed future-deadline `await` is correctly refused with
    // `malformed_envelope`, the Activation and pinned batch stay intact, no deadline fact and no
    // readiness leak — but the wait-registration writer ran before validation and parked the Execution
    // on the refused declaration. W-3's definitional link (a live generation exists exactly while
    // WAITING) is preserved by the leak itself, which is what makes it a single lifecycle-group move
    // rather than two independent decisions. The CX-6 writer's wait half (R7-a6b) is a different
    // rejection writer and cannot stand in for this one.
    id: "envelope/malformed-await-installs-a-wait",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "wait registration commits outside the whole-envelope-validation fence, so a malformed `await` " +
      "parks the Execution on its refused declaration while the envelope is otherwise correctly refused " +
      "with no deadline fact and no readiness",
    forbiddenBy: "OA-5 with §11 row 3: a rejected Outcome — a malformed envelope included — creates no wait/deadline/readiness/next-state transition; a malformed `await` registers no wait and moves no lifecycle",
    stepIndex: 4,
    mustNameFields: ["state", "liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-bad" }),
  },
  {
    // Round-10 review finding K02-R10-01. The next-state half at the whole-envelope-validation writer:
    // the duplicate-emission envelope already carries a valid `next: continue`, so a next-state writer
    // outside the fence can move the Execution to READY while the envelope is otherwise correctly
    // refused with no progress, no emissions, no acknowledgment and no Activation resolution. Single
    // field, single lifecycle-group move; the CX-6 writer's next-state half (R7-a6) is a different
    // fence and cannot stand in for this one.
    id: "envelope/rejected-continue-commits-its-next-state",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "the loser's next step is applied because the lifecycle writer runs outside the whole-envelope-validation " +
      "fence, so a correctly refused `continue` envelope with a duplicate emission key nevertheless moves the " +
      "Execution to READY",
    forbiddenBy: "OA-5 with §11 row 3: a rejected Outcome creates no next-state transition; a refused `continue` leaves the Execution RUNNING with its Activation still pinned",
    stepIndex: 2,
    mustNameFields: ["state"],
    mutate: (observation) => ({ ...observation, state: "READY" }),
  },
  {
    // Round-10 review finding K02-R10-01. The readiness-only half at the whole-envelope-validation
    // writer, on the new minimal schedule that submits a *valid* wait inside an envelope malformed for
    // an unrelated reason (duplicate emission key). The envelope is correctly refused, correctly
    // registers no wait, correctly accepts no deadline and correctly stays RUNNING — but a readiness
    // writer prematurely runs W-2 step 2 on accepted cont-1 outside the pinned batch and
    // commits the B-6 path-A readiness before the outer validation rejection.
    // `waitEndedReadiness` is deliberately ungrouped (round 5), so this single-field move needs no
    // atomicity note; bundling it with lifecycle or deadline to avoid another schedule would hide the
    // independence this packet exists to prove. The CX-6 writer's readiness half (R7-a6d) is a
    // different fence and cannot stand in for this one.
    id: "envelope/valid-wait-in-malformed-envelope-arms-readiness",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "a readiness writer outside the whole-envelope-validation fence arms a wait-ended readiness for the " +
      "valid generation after prematurely evaluating W-2 step 2 against accepted cont-1 outside the pinned batch (B-6 path A), while the Execution correctly stays RUNNING with no " +
      "wait registered and no deadline fact",
    forbiddenBy: "OA-5 with §11 row 3: a rejected Outcome creates no readiness; B-8, readiness is created only by a wait ending, never by a refused envelope naming a valid wait",
    stepIndex: 8,
    mustNameFields: ["waitEndedReadiness"],
    mutate: (observation) => ({ ...observation, waitEndedReadiness: [{ generation: "g-good", species: "event" }] }),
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
      "registration persists WAITING with its accepted deadline first and evaluates the deadline afterwards, so a deadline " +
      "that was already due at registration is stored as a live accepted fact and the Execution waits for an expiry that has already passed (B-7 path A)",
    forbiddenBy: "W-2 step 3 and B-7 path A: a past deadline is never persisted as live",
    stepIndex: 6,
    mustNameFields: ["state", "liveWaitGeneration", "queued", "acceptedDeadline"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "gd2", queued: ["bq-1"], waitEndedReadiness: [], acceptedDeadline: 1 }),
  },
  {
    // Round-7 review finding K02-R7-01: the positive persistence half. A future-deadline wait can
    // register durably — WAITING with the right live generation — while the deadline writer is
    // skipped, e.g. by treating the deadline as a scheduler-only hint rather than an accepted fact
    // (the W-9 over-reading in the other direction). Nothing else is wrong.
    id: "subscription-deadline/registered-wait-drops-the-accepted-deadline",
    scenarioId: "control-subscription-wait-deadline",
    plausibleBug:
      "registration persists the wait but skips the deadline write, so a future-deadline wait parks durably " +
      "with the correct live generation and no accepted deadline fact",
    forbiddenBy: "W-2 step 4 and OA-4: an accepted future-deadline wait persists WAITING with its live registration, generation and deadline as one accepted set",
    stepIndex: 3,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: null }),
  },
  {
    // The path-A cleanup half at the same step as R5-c3's ordering swap: retirement itself is
    // correct (READY, timeout minted, readiness committed) but the deadline evaluated-then-committed
    // during the walk leaks. Narrower than the swap transcript, which persists WAITING outright.
    id: "subscription-deadline/path-A-retirement-leaves-the-accepted-deadline",
    scenarioId: "control-subscription-wait-deadline",
    plausibleBug:
      "the already-due deadline is committed during the registration walk before the due-check, and the " +
      "path-A immediate retirement clears generation and readiness bookkeeping but not the deadline fact",
    forbiddenBy: "W-2 step 3 with B-7 path A: an already-due deadline retires immediately with no durable deadline fact",
    stepIndex: 6,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: 1 }),
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
  {
    id: "input-identity/producer-omitted-drops-second-input",
    scenarioId: "identity-producer-scope",
    plausibleBug: "the application ingress dedup index uses (destination, requestKey) and omits producer; prod-b is silently absorbed as prod-a replay, dropping only its mailbox acceptance",
    forbiddenBy: "Distinct producers at the same destination under the same raw request key have distinct input acceptance positions (ID-2).",
    stepIndex: 5,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["in-pa", "input-a"] }),
  },
  {
    id: "input-identity/exact-replay-appends-again",
    scenarioId: "identity-producer-scope",
    plausibleBug: "the application ingress replay path appends the already accepted Event a second time instead of retaining its original position",
    forbiddenBy: "Exact full-identity/content application replay retains one original acceptance position (ID-2, ID-6).",
    stepIndex: 6,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["in-pa", "input-a", "input-b", "input-a"] }),
  },
  {
    id: "input-identity/conflict-silently-replayed",
    scenarioId: "identity-producer-scope",
    plausibleBug: "the input identity lookup skips content comparison and returns a successful replay without recording the conflict",
    forbiddenBy: "Same application input identity with different content records a conflict (ID-2), never a successful replay.",
    stepIndex: 7,
    mustNameFields: ["rejection"],
    mutate: (observation) => ({ ...observation, rejection: null }),
  },
  {
    id: "input-identity/conflict-appends-input",
    scenarioId: "identity-producer-scope",
    plausibleBug: "the ingress mailbox append runs before content-conflict validation, retaining the conflicting input beside the correct rejection",
    forbiddenBy: "A correctly rejected input identity conflict leaves accepted input content and order unchanged (ID-2, ID-6).",
    stepIndex: 7,
    mustNameFields: ["queued"],
    mutate: (observation) => ({ ...observation, queued: ["in-pa", "input-a", "input-b", "input-conflict"] }),
  },
  {
    // Round-10 review finding K02-R10-03. ID-2 scopes input identity by producer namespace +
    // destination + producer request key, not by raw key text. A candidate globally deduplicating raw
    // key text returns the first producer's Execution for the second producer's same-text key. Single
    // executionId-group field; the receipt half below moves a different field at the same step.
    id: "identity-producer/global-dedup-collapses-execution-id",
    scenarioId: "identity-producer-scope",
    plausibleBug:
      "the create path keys its idempotence index on raw request-key text alone, ignoring the authenticated " +
      "producer namespace, so prod-b reusing prod-a's key text is answered with prod-a's Execution instead of a fresh one",
    forbiddenBy: "ID-2 with §11 row 1: input identity is producer namespace + destination + producer request key; two producers reusing one raw key text do not collide",
    stepIndex: 1,
    mustNameFields: ["executionId"],
    mutate: (observation) => ({ ...observation, executionId: "exec-pa" }),
  },
  {
    // The receipt half of the same global-dedup bug: same raw key text reuses the first producer's
    // receipt instead of minting a distinct one for a distinct accepted create. Single answer-group
    // field, distinct set from the ID half above, so no atomicity note is owed and the split is not
    // cosmetic. Preserves K02-R5-01's per-family separation: this collapses two receipts within the
    // receipt family, not a receipt onto an Activation ID.
    id: "identity-producer/global-dedup-collapses-receipt",
    scenarioId: "identity-producer-scope",
    plausibleBug:
      "the same global raw-key index returns the first producer's receipt for the second producer's fresh " +
      "create, so two distinct accepted creates share one receipt",
    forbiddenBy: "ID-6/ID-7 with §11 row 1: distinct accepted creates never collapse onto one receipt; a new acceptance mints a new receipt, and exact replay alone returns the same one",
    stepIndex: 1,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:create:req-shared:prod-a" }),
  },
  {
    // Round-13 review finding K02-R13-02. W-8 case 1 states the empty-dependency clause of W-2 step 2
    // in terms: "W-2's mailbox check applies to a subscription-only wait exactly as it does to a
    // dependency wait, and there is no 'no dependencies, so nothing to check' shortcut." Nothing in
    // the corpus discriminated a candidate that implements that shortcut and is otherwise correct:
    // R5-c2's declared transcript ran against `control-stale-timer-and-lost-wake`, whose wait has a
    // dependency alternative and therefore takes the ordinary branch even in the broken candidate.
    //
    // This step is where the condition genuinely exists. `producerIngressWait` has `dependencies: []`
    // and one `continue` subscription; `input-a` and `input-b` were accepted at steps 4-5 and are
    // still unacknowledged when the registering Outcome arrives; the conforming answer is B-6 path A
    // — READY, the generation retired inside the same transaction, one Event-triggered readiness.
    // The shortcut takes W-2 step 4 instead, so the observable difference is exactly a durable
    // WAITING with a live generation and no readiness.
    id: "identity-producer/empty-dependency-list-skips-the-mailbox-check",
    scenarioId: "identity-producer-scope",
    plausibleBug:
      "the registration writer treats an empty dependency-alternative list as 'nothing to look for' and jumps " +
      "straight to persisting WAITING, so a subscription-only wait never sees the eligible application input " +
      "already sitting unacknowledged in the mailbox — the lost wake W-8's own trace is built from, in the one " +
      "shape a dependency-wait implementation gets right by accident",
    forbiddenBy: "W-2 step 2 with W-8 case 1: the mailbox check 'is not skipped merely because the dependency list is empty', and a subscription-only wait that finds an eligible Event is READY through B-6 path A, never WAITING",
    stepIndex: 8,
    mustNameFields: ["state", "liveWaitGeneration", "waitEndedReadiness"],
    mutate: (observation) => ({ ...observation, state: "WAITING", liveWaitGeneration: "g-input", waitEndedReadiness: [] }),
  },
  {
    // Round-10 review finding K02-R10-03. Different request keys are different requests even for one
    // producer: X (req-x) and Y (req-y) are already distinct accepted creates with distinct receipts in
    // the delayed-Runtime schedule. A candidate keying receipts by Execution alone, or by a global
    // counter that restarts, collapses Y's onto X's while keeping its Execution ID correct. Single
    // receipt-only move at Y's creation step.
    id: "identity-create/different-keys-collapse-onto-one-receipt",
    scenarioId: "delayed-runtime-non-blocking",
    plausibleBug:
      "receipts are keyed by a per-laboratory counter that restarts per scenario half, or by Execution " +
      "short name, so Y's fresh create reuses X's receipt instead of minting a distinct one",
    forbiddenBy: "ID-6/ID-7 with §11 row 1: distinct accepted creates never collapse onto one receipt",
    stepIndex: 1,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:create:req-x" }),
  },
  {
    // The rejected-mints-none half for the create-conflict writer: the conflict is correctly recorded
    // as `duplicate_conflict` with the accepted content unchanged (R1-b1/b2), but a fresh receipt is
    // minted for the refused request beside it. Single receipt-only move, distinct from the rejection
    // half (rejection) and the edit half (queued) at the same step.
    id: "identity-create/conflict-mints-a-fresh-receipt",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the conflict path records the rejection correctly but the answer writer mints a receipt for every " +
      "request it sees, including refused ones, so a rejected create looks accepted to a caller holding the token",
    forbiddenBy: "ID-6 with §11 row 1: a rejected create mints no new receipt; the field retains the original accepted receipt beside the recorded conflict",
    stepIndex: 2,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:create:req-x-2" }),
  },

  // -- Row 2: the batch the Outcome is checked against, and the epoch ---------
  {
    id: "envelope/accepted-outcome-leaves-its-batch-unacknowledged",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "acknowledgment is derived from the Events the Outcome explicitly references rather than from the pinned batch, " +
      "so a reserved Event the Runtime did not mention stays unacknowledged and is re-delivered in the next batch",
    forbiddenBy: "B-3 and §11 row 2: an accepted Outcome acknowledges its *entire* pinned batch, which is what makes the batch checkable exactly",
    stepIndex: 9,
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
    stepIndex: 6,
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
  {
    // Round-10 review finding K02-R10-03. The rejected-mints-none half for the whole-envelope-validation
    // writer (different writer from the conflict check above): the malformed envelope is correctly
    // refused with no progress, no emissions and no acknowledgment (R3-c1/c1b/c2), correctly stays
    // RUNNING with no next-state change (R3-c6), but a fresh receipt is minted beside the correct
    // rejection. Single receipt-only move at step 2, distinct from every other half there.
    id: "envelope/malformed-envelope-mints-a-fresh-receipt",
    scenarioId: "control-whole-envelope-validation",
    plausibleBug:
      "whole-envelope validation records the malformed refusal correctly and withholds every other fact, " +
      "but the answer writer mints a receipt for the refused submission anyway",
    forbiddenBy: "ID-6 with §11 row 3: a rejected malformed envelope mints no new receipt; the field retains the prior accepted receipt beside the recorded rejection",
    stepIndex: 2,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1#malformed" }),
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
      "dependency alternative and no matching subscription never receives its own expiry and its accepted deadline stays live forever",
    forbiddenBy: "W-9 and W-1's category table: the timeout Event is eligible through neither list and reaches the Runtime by construction, as B-7's mandatory member",
    stepIndex: 4,
    mustNameFields: ["state", "queued", "waitEndedReadiness", "acceptedDeadline"],
    mutate: (observation) => ({ ...observation, state: "WAITING", queued: ["bq-1"], liveWaitGeneration: "gd1", waitEndedReadiness: [], acceptedDeadline: 1_000 }),
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
    // Round-7 review finding K02-R7-01: the eligible-wake cleanup half. A deadline-bearing wait
    // retired at registration by an already-accepted Event (W-2 step 2 into B-6 path A) must leave
    // no durable deadline fact; here the walk commits the deadline first and the immediate
    // retirement clears generation and readiness bookkeeping but not the deadline.
    id: "control-stale-timer/immediate-retirement-leaves-the-accepted-deadline",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the registration walk commits the deadline before the mailbox check, and the immediate B-6 " +
      "retirement clears the generation and readiness bookkeeping but not the accepted deadline fact",
    forbiddenBy: "W-2 step 2 with B-6 path A and OA-5: a wait retired at registration by an already-accepted Event leaves no durable deadline fact",
    stepIndex: 3,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: 1_000 }),
  },
  {
    // The current-expiry cleanup half (B-7 path B): timeout minted, generation retired, readiness
    // committed — but the deadline-clearing write missed. Narrower than lazy-retirement, which
    // leaves the generation live outright.
    id: "control-stale-timer/expiry-retirement-leaves-the-accepted-deadline",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the expiry handler mints the timeout Event, retires the generation and creates readiness but " +
      "misses the deadline-clearing write, so the retired wait's deadline fact stays live",
    forbiddenBy: "B-7 path B with OA-5: a current-generation deadline expiry retires the registration, generation and deadline together",
    stepIndex: 7,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: 2_000 }),
  },
  {
    // Round-8 review finding K02-R8-01: B-6's *third* deadline-clearing writer. Path A's cleanup runs
    // inside Outcome acceptance (step 3 above) and expiry's inside the timer handler (step 7); this
    // one runs wherever an Event's own acceptance retires a live wait, and a candidate can get the
    // first two right and this one wrong. Everything else at this step is correct — READY, g3
    // retired, one Event-triggered readiness, res-3 queued and unacknowledged, nothing else moved —
    // and only the retired wait's deadline is left live.
    id: "control-stale-timer/path-B-wake-leaves-the-accepted-deadline",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the Event-acceptance wake handler retires the registration, the generation and the readiness bookkeeping " +
      "but clears no deadline state, because deadline cleanup was written once in the Outcome-acceptance and " +
      "expiry paths and never on the path where an Event ends a durably parked wait with no Outcome in the transaction",
    forbiddenBy: "B-6 path B with W-2 step 4 and §11 row 5(d): any eligible wake retires the registration and its generation, and the accepted deadline persisted beside that registration retires with it",
    stepIndex: 12,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: 3_000 }),
  },
  {
    // Round-16 review finding K02-R16-01, the B-6 species. Every wait-ended reservation the corpus
    // had was either at bound 1 or had no ineligible Event queued, so "the wake is not displaced"
    // and "ineligible backlog is never a candidate" were one observation. This is the construction
    // that separates them: the mandatory member is retained, the bound is not reached, presentation
    // is still acceptance order, and the batch is still wrong.
    id: "control-stale-timer/spare-capacity-admits-ineligible-backlog",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the wait-ended selector retains the mandatory member correctly and then tops the batch up from the mailbox " +
      "in acceptance order without re-applying the retired wait's rule to the filler, on the reasoning that the " +
      "Runtime may as well see everything outstanding while there is room in the bound",
    forbiddenBy: "B-2's wait-ended rule: the batch is the mandatory member together with Events eligible under the retired rule, and ineligible backlog is never a candidate at any bound, however old it is (B-4 keeps it queued instead)",
    stepIndex: 14,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["res-3", "res-off"] }),
  },
  {
    // The same finding's B-7 species, and a different selector branch: here the mandatory member is
    // Kernel-minted and younger than the backlog, so a candidate topping up in acceptance order puts
    // the ineligible Event *first*. R5-e2 owns the bound-1 case where that would displace the timeout;
    // this one has room for both, so nothing is displaced and the batch is still wrong.
    id: "control-stale-timer/deadline-batch-appends-older-ineligible-backlog",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "the deadline-ended selector treats the retired rule as a priority hint rather than a candidacy test: it puts " +
      "the mandatory timeout in, then fills the remaining slots from the whole unacknowledged mailbox in acceptance " +
      "order, so the older off-correlation result is presented ahead of the timeout that actually caused the wake",
    forbiddenBy: "B-2's wait-ended rule with B-7: the deadline species' batch is the generation's timeout together with Events eligible under the retired rule; an ineligible Event is not a candidate however old it is, and B-4 keeps it queued",
    stepIndex: 17,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["res-off", "to-g4"] }),
  },
  {
    // The same finding's third half, on the one schedule in the corpus that offers a wait-ended
    // reservation more eligible candidates than its bound can hold. B-2 fixes truncation: retain the
    // mandatory member first, and for B-6 that member is the *earliest-accepted* eligible Event. A
    // candidate that excludes ineligible backlog perfectly can still pick the wrong eligible member,
    // and at bound 1 there is no presentation order for R5-j3b to catch it with.
    id: "identity-producer/wait-ended-bound-1-takes-the-later-eligible-member",
    scenarioId: "identity-producer-scope",
    plausibleBug:
      "the wait-ended selector collects the eligible candidates correctly and then truncates from the wrong end — " +
      "taking the most recently accepted eligible Event as the one that fits, which reads as 'the freshest input' " +
      "and silently starves the producer that got there first",
    forbiddenBy: "B-2's truncation rule: retain the species' mandatory member first, and at bound 1 a B-6 batch is the earliest-accepted eligible Event; acceptance order is per-Execution and does not restart per producer (B-4, ID-2)",
    stepIndex: 9,
    mustNameFields: ["dispatchedBatch"],
    mutate: (observation) => ({ ...observation, dispatchedBatch: ["input-b"] }),
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
    // Narrowed by round-5 review finding K02-R5-02: this entry bundled "no wait, deadline or
    // next-state change" behind one transcript that moved only the lifecycle state, so the wait and
    // deadline clauses had no discriminating candidate and the deadline clause had no observation
    // that could see it. It is now the *next-state* half alone. The wait, deadline and
    // readiness halves live at the new losing-`await` step below, each with its own transcript.
    id: "control-cancel/losing-outcome-moves-the-execution-off-terminal",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the loser's next step is applied because the lifecycle writer runs outside the fenced transaction, so a rejected " +
      "`continue` reopens a CANCELLED Execution for another Activation",
    forbiddenBy: "CX-6/CX-2 and §11 row 7: a rejected losing Outcome produces no next-state change; terminal states do not reopen",
    stepIndex: 3,
    mustNameFields: ["state"],
    mutate: (observation) => ({ ...observation, state: "READY" }),
  },
  {
    // Round-5 review finding K02-R5-02: the wait half of R7-a6, now exercised by a losing `await`.
    // A wait-registration writer outside the fenced transaction persists the loser's wait while the
    // lifecycle correctly stays CANCELLED and the CX-6 rejection is correctly recorded.
    id: "control-cancel/losing-await-registers-a-wait",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "wait registration commits outside the cancellation fence, so a losing `await` persists its wait generation " +
      "while the Execution correctly stays CANCELLED with the correct CX-6 rejection",
    forbiddenBy: "CX-6/OA-5 and §11 row 7: a rejected losing Outcome creates no wait; W-3, a live generation exists exactly while WAITING",
    stepIndex: 11,
    mustNameFields: ["liveWaitGeneration"],
    mutate: (observation) => ({ ...observation, liveWaitGeneration: "g-lose" }),
  },
  {
    // The sharp leaked-deadline case the reviews name: the Execution stays correctly CANCELLED, the
    // rejection is correctly recorded, live generation stays null — and an accepted deadline fact
    // for the loser's deadline nevertheless leaks. Invisible via terminal state or
    // `liveWaitGeneration` alone; visible only via `acceptedDeadline`. This is a leaked *accepted*
    // fact, not a retained physical timer: W-3 permits a physical timer for a retired generation to
    // arrive later as a stale no-op, and such retention alone is conforming and unobservable here.
    id: "control-cancel/losing-await-accepts-a-deadline",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the wait/deadline commit runs outside the fenced transaction, so a losing `await` carrying a deadline " +
      "leaks an accepted deadline fact while the Execution stays CANCELLED with the correct rejection and no live wait",
    forbiddenBy: "CX-6/OA-5 and §11 row 7: a rejected losing Outcome creates no deadline; OA-4, wait/deadline commit atomically with acceptance, never beside a rejection",
    stepIndex: 11,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: 5_000 }),
  },
  {
    // The readiness half: a readiness committer outside the fence arms a wait-ended readiness for the
    // loser's generation while everything else stays fenced.
    id: "control-cancel/losing-await-arms-a-readiness",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "a readiness writer outside the fenced transaction arms a wait-ended readiness for the losing `await`'s " +
      "generation while the Execution stays CANCELLED with the correct rejection",
    forbiddenBy: "CX-6/OA-5 and §11 row 7: a rejected losing Outcome creates no readiness; B-8, readiness is created only by a wait ending",
    stepIndex: 11,
    mustNameFields: ["waitEndedReadiness"],
    mutate: (observation) => ({ ...observation, waitEndedReadiness: [{ generation: "g-lose", species: "deadline" }] }),
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
    // The fencing counterpart for the deadline fact: wake and retirement correctly fenced, but the
    // stale handler clears deadline state by Execution instead of by generation, wiping the live
    // wait's deadline while retiring nothing.
    id: "control-stale-timer/stale-delivery-clears-the-live-deadline",
    scenarioId: "control-stale-timer-and-lost-wake",
    plausibleBug:
      "stale-delivery fencing covers wake and retirement but clears deadline state by Execution instead of " +
      "by generation, so a fenced delivery for a retired generation wipes the live wait's accepted deadline",
    forbiddenBy: "W-3: a timer naming a superseded generation is a no-op that changes nothing, including the live generation's accepted deadline",
    stepIndex: 6,
    mustNameFields: ["acceptedDeadline"],
    mutate: (observation) => ({ ...observation, acceptedDeadline: null }),
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
    stepIndex: 7,
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

  // == Round-10 additions (review findings K02-R10-01..03) =====================
  //
  // Each exists because a decision-level re-derivation found an independently violable assertion with
  // no candidate-level owner: OA-5's remaining whole-envelope-validation partials (R10-01, already
  // placed near their steps above), ID-9's takeover/redelivery halves (R10-02, likewise above), and
  // ID-6/ID-7's receipt relations beyond same-key replay (R10-03, below). The R10-01/R10-02 transcripts
  // live near the steps they discriminate; the receipt-narrowing transcripts that need no new schedule
  // live here so the row-1/row-2/row-10 sections above stay readable.
  {
    // R3-d1: distinct accepted Outcomes never collapse. The K0 trace accepts act-1 (receipt
    // outcome:act-1 at step 4) and later act-2 (receipt outcome:act-2 at step 8); collapsing the second
    // onto the first keeps every other fact correct. Single receipt-only move, distinct from R8-b's
    // disposition pair and R8-b1b's disposition singleton at the same step.
    id: "k0-trace/second-acceptance-collapses-onto-the-first-receipt",
    scenarioId: "k0-trace",
    plausibleBug:
      "receipts are keyed by Execution alone rather than by accepted boundary, so the second accepted " +
      "Outcome reuses the first acceptance's receipt",
    forbiddenBy: "ID-6/ID-7 with §11 row 3: distinct accepted Outcomes never collapse onto one receipt; exact replay alone returns the same one",
    stepIndex: 8,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1" }),
  },
  {
    // R7-a9: the losing Outcome itself mints none. Correctly stays CANCELLED with the correct CX-6
    // rejection, no progress, no emissions and no acknowledgment (R7-a2/a3/a4), but mints a fresh
    // acceptance receipt beside it. Single receipt-only move at step 3, distinct from every other half
    // there. R7-b owns the same fact for the *retry*; this owns it for the losing submission itself.
    id: "control-cancel/losing-outcome-mints-a-receipt",
    scenarioId: "control-cancel-versus-complete",
    plausibleBug:
      "the fence records the CX-6 rejection correctly and withholds every other fact, but the answer " +
      "writer mints a receipt for the refused losing submission anyway",
    forbiddenBy: "ID-6 with §11 row 7 and CX-6: a rejected losing Outcome mints no acceptance receipt; OA-2's receipt rule does not apply because no Outcome was accepted",
    stepIndex: 3,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1" }),
  },
  {
    // R10-a2: the stale-writer fence mints none. Correctly rejected as `stale_exchange` with no progress
    // (R10-a/R2-c4's shared admission half), but a fresh receipt minted beside the correct rejection.
    // Single receipt-only move at step 7, distinct from R10-a's four-field admission.
    id: "identity-activation/stale-rejection-mints-a-receipt",
    scenarioId: "identity-create-and-activation",
    plausibleBug:
      "the stale-epoch check records the rejection correctly and withholds progress, but the answer writer " +
      "mints a receipt for the refused stale submission beside it",
    forbiddenBy: "ID-6 with ID-9 case 3 and LP-1: a rejected stale-writer Outcome mints no acceptance receipt; the field retains the prior accepted receipt",
    stepIndex: 7,
    mustNameFields: ["receipt"],
    mutate: (observation) => ({ ...observation, receipt: "receipt:outcome:act-1" }),
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

// -- Epoch-policy candidates -------------------------------------------------

/**
 * **A candidate that mints its own Activation IDs and its own writer epochs, under a declared policy.**
 *
 * Added by round-13 review finding K02-R13-01. Scripted transcripts replay the schedule's own
 * expectations, so they can prove the oracle rejects a wrong *observation* but say nothing about the
 * two questions that finding raised: whether the oracle still accepts a candidate whose epochs follow
 * a different — equally conforming — policy, and whether a command reaches such a candidate in a
 * namespace it can act on.
 *
 * These candidates answer both, because they are the first ones in this file that do not simply echo
 * the laboratory. Each mints a private Activation-ID spelling per exchange, issues epochs from its own
 * policy, and **verifies every Outcome it is handed**: the envelope must name an exchange it actually
 * opened, at an epoch it actually issued. A runner that delivered the schedule's own spellings would
 * be caught here rather than silently passing.
 *
 * What the policies deliberately differ on is only what ID-4 leaves open — "whether the counter is
 * reset or continues across a later, genuinely new Activation ID". What they all obey is what ID-4
 * fixes: the epoch changes inside an unresolved exchange only at an authenticated takeover, and then
 * strictly upwards. Two deliberately non-conforming policies are shipped beside them so the oracle is
 * shown to be non-vacuous in this dimension too.
 */
export interface EpochPolicy {
  readonly name: string;
  /**
   * The epoch this candidate issues for the first attempt at a newly opened exchange, given the epoch
   * it last issued anywhere (`null` before the first exchange) and the exchange's zero-based order.
   */
  readonly firstAttempt: (previous: number | null, exchangeIndex: number) => number;
  /** The epoch it issues after an authenticated takeover of a still-unresolved exchange. */
  readonly afterTakeover: (current: number) => number;
  /**
   * What it reports for `writerEpoch` when no exchange is unresolved. ID-4 fixes nothing here, so a
   * policy may answer with a retained value, a zero, or anything else.
   */
  readonly whenNoExchange: (previous: number | null) => number;
}

/** The reset/continue choice ID-4 leaves open, plus an opaque fencing-token shape. All conforming. */
export const CONFORMING_EPOCH_POLICIES: readonly EpochPolicy[] = [
  {
    // ID-4's "reset" option, read literally: each new Activation ID starts the counter again.
    name: "reset-per-exchange",
    firstAttempt: () => 1,
    afterTakeover: (current) => current + 1,
    whenNoExchange: () => 0,
  },
  {
    // ID-4's "continues" option: nothing but a takeover ever moves the counter.
    name: "continue-across-exchanges",
    firstAttempt: (previous) => previous ?? 1,
    afterTakeover: (current) => current + 1,
    whenNoExchange: (previous) => previous ?? 0,
  },
  {
    // The policy the pre-round-13 corpus accidentally made normative in six scenarios, and which
    // `identity-producer-scope` accidentally made impossible in a seventh. It is still permitted.
    name: "advance-per-exchange",
    firstAttempt: (previous) => (previous ?? 0) + 1,
    afterTakeover: (current) => current + 1,
    whenNoExchange: (previous) => previous ?? 0,
  },
  {
    // §2's *Left open* note permits "integer vs. fencing token". An implementation handing out opaque
    // ascending fences satisfies ID-4's "or equivalent total order" and shares no value with the
    // schedule's attempt ordinals, so it also proves the runner adapts submitted epochs at the port.
    name: "opaque-ascending-fence",
    firstAttempt: (_previous, exchangeIndex) => 9_000 + exchangeIndex * 137,
    afterTakeover: (current) => current + 41,
    whenNoExchange: (previous) => previous ?? 7_777,
  },
];

/** Policies that break what ID-4 *does* fix, so the epoch oracle is shown to reject as well as accept. */
export const VIOLATING_EPOCH_POLICIES: readonly EpochPolicy[] = [
  {
    // ID-9 case 2: a takeover that leaves the epoch alone lets the superseded writer keep committing.
    name: "takeover-does-not-advance",
    firstAttempt: () => 1,
    afterTakeover: (current) => current,
    whenNoExchange: () => 0,
  },
  {
    // ID-4 fixes a monotonically increasing order; a takeover that moves backwards inverts authority.
    name: "takeover-moves-backwards",
    firstAttempt: () => 100,
    afterTakeover: (current) => current - 1,
    whenNoExchange: () => 0,
  },
];

export function epochPolicyCandidate(policy: EpochPolicy): K0Candidate {
  return {
    name: `epoch-policy:${policy.name}`,
    begin(scenario: Scenario): CandidateRun {
      // The candidate's own namespaces, derived as the run proceeds exactly as a real one would be.
      const mintedIds = new Map<string, string>();
      const issuedEpochs = new Map<string, Map<number, number>>();
      const issuedByExchange = new Map<string, Set<number>>();
      let previousEpoch: number | null = null;

      const epochFor = (labExchange: string, ordinal: number): number => {
        let scope = issuedEpochs.get(labExchange);
        if (scope === undefined) {
          scope = new Map<number, number>();
          issuedEpochs.set(labExchange, scope);
          const issued = policy.firstAttempt(previousEpoch, issuedEpochs.size - 1);
          scope.set(ordinal, issued);
          previousEpoch = issued;
        }
        const known = scope.get(ordinal);
        if (known !== undefined) return known;
        // A higher ordinal in the same exchange is a takeover: advance once per intervening attempt.
        const highest = Math.max(...scope.keys());
        let issued = scope.get(highest)!;
        for (let attempt = highest; attempt < ordinal; attempt += 1) issued = policy.afterTakeover(issued);
        scope.set(ordinal, issued);
        previousEpoch = issued;
        return issued;
      };

      const observations = scenario.steps.map((step) => {
        const expected = step.expect.observation;
        if (expected.activationId === null) {
          return { ...expected, activationId: null, writerEpoch: policy.whenNoExchange(previousEpoch) };
        }
        let activationId = mintedIds.get(expected.activationId);
        if (activationId === undefined) {
          activationId = `xid-${mintedIds.size + 1}/${policy.name}`;
          mintedIds.set(expected.activationId, activationId);
        }
        const writerEpoch = epochFor(expected.activationId, expected.writerEpoch);
        const issued = issuedByExchange.get(activationId) ?? new Set<number>();
        issued.add(writerEpoch);
        issuedByExchange.set(activationId, issued);
        return { ...expected, activationId, writerEpoch };
      });

      let stepIndex = 0;
      return {
        apply(command: Command): Observation {
          const index = stepIndex++;
          if (command.kind === "submit_outcome" || command.kind === "resubmit_outcome") {
            const { activationId, writerEpoch } = command.outcome;
            if (!issuedByExchange.has(activationId)) {
              throw new Error(
                `${policy.name}: step ${index} submits an Outcome for Activation ${JSON.stringify(activationId)}, which this candidate never minted; the runner delivered a name from another namespace (ID-3)`,
              );
            }
            if (!issuedByExchange.get(activationId)!.has(writerEpoch)) {
              throw new Error(
                `${policy.name}: step ${index} submits an Outcome for ${JSON.stringify(activationId)} at epoch ${writerEpoch}, which this candidate never issued for it; the runner delivered an epoch from another namespace (ID-4)`,
              );
            }
          }
          const observation = observations[index];
          if (observation === undefined) {
            throw new Error(`epoch-policy candidate ${policy.name} has no observation for step ${index} of ${scenario.id}`);
          }
          return observation;
        },
      };
    },
  };
}

// -- The empty-dependency shortcut, as a candidate rather than one transcript -

/**
 * **A candidate that runs W-2 step 2 correctly for dependency waits and skips it only when
 * `dependencies.length === 0`.**
 *
 * Added by round-13 review finding K02-R13-02. A `Violation` is scoped to one scenario, so a
 * transcript can show that the oracle rejects this behaviour where the clause lives but not that the
 * behaviour is invisible everywhere else — which is the whole reason the clause needs an owner of its
 * own. C9 asks for the second half in terms: a counterexample belonging to a neighbouring rule "fails
 * candidates for something else", and R5-c2's declared transcript ran against a wait with a dependency
 * alternative, where this bug simply does not fire.
 *
 * The bug is written once, as a rule over the schedule rather than as a hand-edited observation: at
 * any step whose command registers a wait with an empty dependency-alternative list, where the
 * conforming answer was B-6 path-A readiness, take W-2 step 4 instead and persist `WAITING` with that
 * generation live and no readiness. Every other step is answered conformingly. Running one candidate
 * across the whole corpus is then a statement about the corpus: it must fail at
 * `identity-producer-scope`'s registration and must be accepted everywhere else, including by R5-c2's
 * own scenario.
 */
export const emptyDependencyShortcutCandidate: K0Candidate = scriptedCandidate({
  name: "empty-dependency-list-skips-the-mailbox-check",
  observationsFor: (scenario: Scenario) =>
    scenario.steps.map((step) => {
      const expected = step.expect.observation;
      const command = step.command;
      if (command.kind !== "submit_outcome" && command.kind !== "resubmit_outcome") return expected;
      const next = command.outcome.next;
      if (next.step !== "await" || next.wait.dependencies.length > 0) return expected;
      // Only a registration whose conforming answer was an immediate path-A wake can show the
      // difference. Where the conforming answer was already durable `WAITING` (no eligible Event in
      // the mailbox) or a rejection (the envelope never reached W-2), the shortcut is unobservable —
      // which is exactly why it needs a schedule that supplies the eligible Event.
      const readiness = expected.waitEndedReadiness;
      if (readiness.length !== 1 || readiness[0]!.generation !== next.wait.generation || readiness[0]!.species !== "event") {
        return expected;
      }
      return { ...expected, state: "WAITING" as const, liveWaitGeneration: next.wait.generation, waitEndedReadiness: [] };
    }),
});

// -- Wait-ended selector candidates ------------------------------------------

/**
 * Which Events a wait-ended reservation may choose from, derived from the schedule the way the
 * `emptyDependencyShortcutCandidate` derives its branch: from the retired wait and the mailbox, never
 * from the expectation the candidate is supposed to be judged against.
 */
function waitEndedShape(scenario: Scenario, stepIndex: number) {
  const command = scenario.steps[stepIndex]!.command;
  if (command.kind !== "dispatch") return null;
  const before = scenario.steps[stepIndex - 1]?.expect.observation;
  if (before === undefined || before.executionId !== command.executionId) return null;
  if (before.waitEndedReadiness.length !== 1) return null;
  const readiness = before.waitEndedReadiness[0]!;
  const wait = Object.values(scenario.waits ?? {}).find((entry) => entry.generation === readiness.generation);
  if (wait === undefined) return null;

  const events = new Map<string, FixtureEvent>();
  for (const step of scenario.steps) {
    const issued = step.command;
    if (issued.kind === "accept_event") events.set(issued.event.eventId, issued.event);
    if (issued.kind === "create" || issued.kind === "create_retry") events.set(issued.initialInput.eventId, issued.initialInput);
    if (issued.kind === "deliver_timer") events.set(issued.timeoutEvent.eventId, issued.timeoutEvent);
  }
  const eligible = before.queued.filter((id) => {
    const event = events.get(id);
    return event !== undefined && isEligibleUnderWait(wait, event);
  });
  const mandatory = readiness.species === "deadline"
    ? before.queued.filter((id) => events.get(id)?.waitGeneration === readiness.generation)
    : eligible.slice(0, 1);
  return { bound: command.bound, queued: before.queued, eligible, mandatory, candidates: [...new Set([...mandatory, ...eligible])] };
}

/**
 * **A selector that keeps the mandatory member and then tops the batch up from the whole mailbox.**
 *
 * Round-16 review finding K02-R16-01. B-2 states two rules that a bound-1 schedule cannot tell apart:
 * ineligible backlog can never *displace* the mandatory member, and ineligible backlog is never a
 * *candidate* "at any bound, however old it is". At bound 1 with one candidate the batch is full, so
 * the second rule has nothing to say; the corpus had no wait-ended reservation with slots to spare and
 * an ineligible Event queued, and so nothing could fail this implementation.
 *
 * The bug is written once, as a rule over any schedule: retain whatever the conforming batch retains,
 * then fill the remaining slots from the unacknowledged mailbox in acceptance order, and present the
 * result in acceptance order. Running one candidate across the corpus is a statement about the corpus
 * — it must fail exactly where the rule is observable, and be accepted everywhere the bound is already
 * full, which is precisely why R5-e1/R5-e2's bound-1 schedules cannot own the candidacy clause.
 */
export const waitEndedTopUpCandidate: K0Candidate = scriptedCandidate({
  name: "wait-ended-batch-tops-up-from-the-whole-mailbox",
  observationsFor: (scenario: Scenario) =>
    scenario.steps.map((step, index) => {
      const expected = step.expect.observation;
      const shape = waitEndedShape(scenario, index);
      if (shape === null || expected.dispatchedBatch === null) return expected;
      const selected = new Set(expected.dispatchedBatch);
      for (const id of shape.queued) {
        if (selected.size >= shape.bound) break;
        selected.add(id);
      }
      return { ...expected, dispatchedBatch: shape.queued.filter((id) => selected.has(id)) };
    }),
});

/**
 * **A selector that truncates a wait-ended batch from the wrong end.**
 *
 * The other half of K02-R16-01. B-2's truncation rule says the retained member is the species'
 * mandatory one, and for B-6 that is the *earliest-accepted* eligible Event. A candidate can exclude
 * ineligible backlog perfectly and still keep the freshest eligible Event instead of the first, and at
 * bound 1 the resulting one-member batch carries no presentation order for R5-j3b to catch. This keeps
 * the last candidates rather than the first, which changes nothing wherever the bound already holds
 * every candidate — so, again, only a schedule that genuinely offers a choice can own the clause.
 */
export const waitEndedLateTruncationCandidate: K0Candidate = scriptedCandidate({
  name: "wait-ended-batch-truncates-from-the-wrong-end",
  observationsFor: (scenario: Scenario) =>
    scenario.steps.map((step, index) => {
      const expected = step.expect.observation;
      const shape = waitEndedShape(scenario, index);
      if (shape === null || expected.dispatchedBatch === null) return expected;
      if (shape.candidates.length <= shape.bound) return expected;
      const kept = new Set(shape.candidates.slice(-shape.bound));
      return { ...expected, dispatchedBatch: shape.queued.filter((id) => kept.has(id)) };
    }),
});
