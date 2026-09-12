/**
 * K0.2 public fixture — scenario model, candidate port and runner.
 *
 * A scenario is a **schedule**: an ordered list of laboratory commands, each paired with the complete
 * expected observation afterwards. Expectations are complete rather than partial on purpose. 012's
 * deterministic-execution method requires accounting for "the whole result, not only its headline
 * state" and asserting "zero forbidden mutations as well as eventual results", so a forbidden mutation
 * is expressed as a literal unchanged field in the next expected observation, and the `forbids` prose
 * list says which field carries that meaning for a reader.
 *
 * The runner compares observations structurally. It contains no protocol logic of its own: it cannot
 * accidentally excuse a candidate by re-deriving what the candidate should have done.
 */

import { deepStrictEqual } from "node:assert";
import type { ExecutionState, FixtureEvent, OutcomeEnvelope, OutcomeRejection, WaitEndedReadiness, WaitRecord } from "./protocol-vocabulary.ts";
import type { OperationSink, OperationSinkBundle } from "./operation-sink.ts";

/** Versioned public fixture identity. Benchmark E0/E1 pin this string together with a repository revision. */
export const FIXTURE_VERSION = "arrokothi-k0-public-fixture/1";

// -- Commands ----------------------------------------------------------------

export type Command =
  /** Creation/input ingress. `requestKey` is the caller-scoped create key (execution-protocol.md). */
  | { readonly kind: "create"; readonly executionId: string; readonly requestKey: string; readonly initialInput: FixtureEvent; readonly definitionRevision: string }
  /** A retried create under the same caller-scoped request key. */
  | { readonly kind: "create_retry"; readonly executionId: string; readonly requestKey: string; readonly initialInput: FixtureEvent; readonly definitionRevision: string }
  /** Accept an Event into the destination mailbox through its own ingress boundary. */
  | { readonly kind: "accept_event"; readonly event: FixtureEvent }
  /** Reserve a batch and dispatch. `bound` is the implementation-owned batch bound (B-1: at least 1). */
  | { readonly kind: "dispatch"; readonly executionId: string; readonly bound: number }
  /** Submit an Outcome for the current Activation. */
  | { readonly kind: "submit_outcome"; readonly outcome: OutcomeEnvelope }
  /** Authenticated exact resubmission of an identical Outcome identity and content. */
  | { readonly kind: "resubmit_outcome"; readonly outcome: OutcomeEnvelope }
  /** Accept a cancellation request. CX-1: a Kernel control operation, not a mailbox message. */
  | { readonly kind: "accept_cancellation"; readonly executionId: string }
  /** Deliver a timer naming a wait generation. W-3/W-9 decide whether it does anything. */
  | { readonly kind: "deliver_timer"; readonly executionId: string; readonly generation: string; readonly timeoutEvent: FixtureEvent }
  /** Recover an Execution when only these definition revisions have runnable code (PC-4/PC-5). */
  | { readonly kind: "recover"; readonly executionId: string; readonly availableDefinitionRevisions: readonly string[] }
  /**
   * Authorized takeover of a still-unresolved exchange. ID-9 cases 2-3: this advances the writer epoch
   * under the **same** Activation ID rather than minting a new one, because the exchange is the same.
   */
  | { readonly kind: "takeover"; readonly executionId: string }
  /** Read an Execution without changing it. Used to assert that acting on one Execution left another alone. */
  | { readonly kind: "inspect"; readonly executionId: string };

// -- Observations ------------------------------------------------------------

/**
 * The complete Kernel-visible result after one command. Every field is asserted on every step, so a
 * candidate cannot satisfy the headline state while quietly mutating something else.
 */
export interface Observation {
  readonly executionId: string;
  readonly state: ExecutionState;
  /** Accepted progress revision. Never advanced by a rejected Outcome (OA-5). */
  readonly progressRevision: number;
  /** Accepted opaque progress. A rejected Outcome installs none (CX-6, OA-5). */
  readonly progress: unknown;
  /** Accepted emission IDs, in acceptance order. */
  readonly emissions: readonly string[];
  /** Cumulative acknowledged Event IDs. B-3: an accepted Outcome acknowledges its entire pinned batch. */
  readonly acknowledged: readonly string[];
  /** Unacknowledged Events still queued, in per-Execution acceptance order (B-4). */
  readonly queued: readonly string[];
  /** B-5 terminal dispositions, by Event ID. */
  readonly terminalDispositions: readonly string[];
  /** The live wait generation, if the Execution is WAITING. W-3: live exactly while WAITING. */
  readonly liveWaitGeneration: string | null;
  /**
   * Outstanding **wait-ended readiness**, in creation order; empty when there is none.
   *
   * Added for round-3 review finding K02-R3-01. §3's four-row table treats readiness as an accepted,
   * recoverable record with an identity and a species, not as an implementation detail: it is created
   * only by a wait ending (`B-8`), it names the generation that was retired, it is *Event-triggered*
   * (`B-6`) or *deadline-triggered* (`B-7`), and it is consumed when the next batch is **durably
   * reserved**. Ordinary `READY` (§3 row 5) carries none, which is exactly what makes the wait-ended
   * batch rule a different rule from B-2's acceptance-order selection.
   *
   * It is observed as a **list** rather than a nullable single because the failure `B-8` exists to
   * foreclose is "a second readiness arming behind the first and silently re-selecting a batch after
   * reservation". A nullable field would hide that failure by construction; a list of length two
   * shows it. Before this field the rule was prose in a `forbids` list and no candidate could be
   * failed for breaking it.
   */
  readonly waitEndedReadiness: readonly WaitEndedReadiness[];
  /**
   * The accepted deadline committed for the live wait, if the live wait carries one; `null`
   * otherwise — no live wait, a live wait without a deadline, or a retired wait whose logical
   * deadline is no longer live.
   *
   * Added for round-5 review finding K02-R5-02 and redefined for round-6 finding K02-R6-01.
   * CX-6/OA-5 require a rejected Outcome to create "no wait, deadline, readiness or next-state
   * transition", and OA-4 commits "any wait/deadline" as part of the accepted set while W-2 step 4
   * persists `WAITING` "with the live registration, its generation and its deadline". A losing
   * `await` carrying a wait with a deadline could leak an accepted deadline fact while keeping the
   * Execution correctly `CANCELLED`, reporting the correct CX-6 rejection, and leaving
   * `liveWaitGeneration` null — invisible via terminal lifecycle state or live-generation alone.
   * This observes that accepted logical deadline fact, so the leak is a candidate-visible difference
   * rather than an inferred absence.
   *
   * This is Kernel semantic state, not scheduler mechanism. W-3 explicitly permits a timer scheduled
   * for a retired generation to arrive later as a stale no-op, and W-9/§4 leave timer mechanism,
   * storage layout, deadline units/precision and the instant source implementation-owned. A
   * conforming implementation may therefore retain a physical timer registration after the logical
   * wait/deadline has retired and fence its late delivery as stale; this field must be `null` there
   * all the same, because the *accepted deadline* is gone. Retirement never requires physical timer
   * cancellation or removal — only that no accepted deadline fact remains live. The generation key
   * for a non-null value is the sibling `liveWaitGeneration`.
   *
   * It observes *retained accepted* state. A deadline evaluated and discarded inside the same
   * rejected transaction leaves no accepted record and is indistinguishable here — as it is by any
   * other means, since 001's K0 exit asks for an observable acceptance/rejection result and nothing
   * unobservable was committed. Values are fixture-supplied (the `deadline` of a submitted
   * `WaitRecord`), so comparison is literal: deadlines arrive in the schedule's own commands, like
   * Event IDs and wait generations.
   */
  readonly acceptedDeadline: number | null;
  /**
   * The Event batch pinned by the **current unresolved** Activation, in acceptance order; `null` when
   * no Activation is unresolved. Reservation pins it and does not acknowledge it (B-3), which is what
   * makes CX-6's "acknowledges none of that batch" an observable fact rather than a claim.
   */
  readonly dispatchedBatch: readonly string[] | null;
  /**
   * The current unresolved Activation's ID; `null` when none is unresolved. Observed because §11 row 2
   * turns on identity, not only on epochs: semantically different exchanges must never share an
   * Activation ID, while an authorized takeover must keep it (ID-9).
   */
  readonly activationId: string | null;
  /**
   * The Event ID of an ingress the Kernel refused rather than accepting into the mailbox; `null` when
   * the last command refused nothing. execution-protocol.md: "Terminal ingress refuses new ordinary
   * input." A refusal is not a queued Event and not a B-5 disposition; it is a third answer.
   */
  readonly ingressRefused: string | null;
  /** The receipt returned by the most recent accepted Outcome, if any. */
  readonly receipt: string | null;
  /** The rejection recorded by the most recent rejected Outcome, if any. */
  readonly rejection: OutcomeRejection | null;
  /** Writer epoch of the current exchange. A takeover advances it under the same Activation ID (ID-9). */
  readonly writerEpoch: number;
  /** PC-5: an inspectable recovery hold, never a fresh-restored fabrication. */
  readonly recoveryHold: { readonly reason: string } | null;
  /**
   * Accepted Effect intents and bound proposal keys recorded against this Execution, in acceptance
   * order. **At K0/K1 this is empty at every step of every scenario**, and that is the point.
   *
   * Added for round-3 review finding K02-R3-01. §11 row 3 requires that a failure partway through
   * acceptance leaves "no Effect intent", and row 4 requires refusal "before any Effect intent, ID or
   * proposal-key binding ever exists" (EF-2: "no Effect ID is minted, no proposal key is bound").
   * Neither was observable: the candidate-facing observation had no such field, and the independent
   * operation ledger records *physical attempts*, so a candidate could mint and retain an intent,
   * attempt nothing, report the expected refusal, and pass. A field that must always be empty is the
   * smallest observation that turns "never exists" into a checked fact.
   *
   * **Limit, stated rather than glossed.** This observes *retained accepted* intent. A candidate that
   * constructed an intent and discarded it inside the same rejected transaction leaves no accepted
   * record and is indistinguishable here — as it is by any other means, since 001's K0 exit asks for
   * an observable acceptance/rejection result and nothing unobservable was committed.
   */
  readonly effectIntents: readonly string[];
}

export interface StepExpectation {
  /** Short label naming what this step proves. */
  readonly label: string;
  /** The complete expected observation. Compared structurally. */
  readonly observation: Observation;
  /** Prose naming which unchanged fields above carry a forbidden-mutation meaning. For review legibility. */
  readonly forbids?: readonly string[];
  /** Expected independent-sink ledger size after this step, when the step asserts dispatch attribution. */
  readonly ledgerCount?: number;
}

export interface ScenarioStep {
  readonly command: Command;
  readonly expect: StepExpectation;
}

export interface Scenario {
  readonly id: string;
  readonly title: string;
  /** Governing sources this scenario is derived from, for a reviewer to check against. */
  readonly sources: readonly string[];
  /**
   * The §11 rows this scenario is the coverage map's *attributed evidence* for — not every row whose
   * behavior it happens to touch. Several scenarios exercise the same rule incidentally; attribution
   * names the one the map relies on, so `coverage.test.ts` can check the two agree in both directions.
   */
  readonly k0BoundaryRows: readonly number[];
  /** True when this scenario is one of Decision M-1's four unsafe/state-loss controls. */
  readonly isUnsafeControl: boolean;
  /** Wait records this scenario registers, exposed so `rule-agreement.test.ts` can re-derive expectations. */
  readonly waits?: Readonly<Record<string, WaitRecord>>;
  readonly steps: readonly ScenarioStep[];
}

// -- Candidate port ----------------------------------------------------------

export interface CandidateRefusal {
  readonly refused: true;
  readonly reason: string;
}

export interface CandidateRun {
  apply(command: Command): Observation;
}

/**
 * The port a K1 candidate implements to be judged by this fixture. K0.2 ships no implementation of it
 * against the supported entry: the only candidate here that speaks to the real 0.8.x surface is the
 * refusing one, because the target protocol is unimplemented.
 */
export interface K0Candidate {
  readonly name: string;
  begin(scenario: Scenario, sink: OperationSink): CandidateRun | CandidateRefusal;
}

function isRefusal(value: CandidateRun | CandidateRefusal): value is CandidateRefusal {
  return (value as CandidateRefusal).refused === true;
}

// -- Runner ------------------------------------------------------------------

export interface StepFailure {
  readonly stepIndex: number;
  readonly label: string;
  readonly detail: string;
  readonly forbids: readonly string[];
}

export type ScenarioResult =
  | { readonly outcome: "REFUSED"; readonly scenarioId: string; readonly candidate: string; readonly reason: string }
  | { readonly outcome: "PASS"; readonly scenarioId: string; readonly candidate: string; readonly steps: number }
  | { readonly outcome: "FAIL"; readonly scenarioId: string; readonly candidate: string; readonly failures: readonly StepFailure[] };

/**
 * The runner takes the whole sink **bundle**, not a sink plus an optional observer.
 *
 * An earlier revision accepted `{ sink, ledgerCount? }` and skipped a step's `ledgerCount` assertion
 * whenever the observer happened to be absent. That failed *open*: a scenario whose whole point was
 * independent attribution could report PASS because of how the runner was invoked, and the one bad
 * candidate that is catchable only through the ledger would have slipped through. Requiring the
 * bundle makes the observer impossible to omit at the type level, and `assertLedger` below refuses to
 * skip the check at runtime even if a caller casts its way around the type.
 */
export type RunOptions = OperationSinkBundle;

/**
 * Drive one candidate through one scenario.
 *
 * A `REFUSED` result is neither a pass nor a failure: it records that the candidate declined to claim
 * the behavior at all. That is the honest verdict for the current tree and the reason this fixture
 * cannot be mistaken for a K1 result.
 */
export function runScenario(candidate: K0Candidate, scenario: Scenario, options: RunOptions): ScenarioResult {
  const started = candidate.begin(scenario, options.sink);
  if (isRefusal(started)) {
    return { outcome: "REFUSED", scenarioId: scenario.id, candidate: candidate.name, reason: started.reason };
  }

  const failures: StepFailure[] = [];
  // Per-run, one relation per candidate-minted token family, because the relation a candidate must
  // satisfy is within one schedule *and within one family*: the same expected token must name the
  // same observed token throughout, and two different expected tokens must never collapse onto one —
  // but a receipt and an Activation ID are different typed protocol concepts (ID-3/ID-9 constrain
  // Activation IDs relative to other Activation IDs; ID-6/ID-7 constrain receipts relative to other
  // receipts and accepted boundaries) and nothing requires their raw spellings to be disjoint.
  // Round-5 review finding K02-R5-01: a single shared relation treated cross-family reuse as a
  // collision and rejected a conforming implementation for an implementation-owned representation
  // choice. Receipts and Activation IDs therefore get separate bijections.
  const receiptTokens = new TokenRelation();
  const activationTokens = new TokenRelation();
  for (const [stepIndex, step] of scenario.steps.entries()) {
    const forbids = step.expect.forbids ?? [];
    let actual: Observation;
    try {
      actual = started.apply(step.command);
    } catch (error) {
      failures.push({
        stepIndex,
        label: step.expect.label,
        detail: `candidate threw: ${error instanceof Error ? error.message : String(error)}`,
        forbids,
      });
      // A throw leaves the candidate's state unknown, so later steps cannot be judged.
      break;
    }
    for (const detail of compareRepresentations(step.expect.observation, actual, { receiptTokens, activationTokens })) {
      failures.push({ stepIndex, label: step.expect.label, detail, forbids });
    }
    try {
      deepStrictEqual(normalizeRepresentations(actual, step.expect.observation), step.expect.observation);
    } catch {
      failures.push({
        stepIndex,
        label: step.expect.label,
        detail: describeDifference(step.expect.observation, actual),
        forbids,
      });
    }
    if (step.expect.ledgerCount !== undefined) {
      const ledgerFailure = assertLedger(step.expect.ledgerCount, options);
      if (ledgerFailure !== null) {
        failures.push({ stepIndex, label: `${step.expect.label} (independent sink ledger)`, detail: ledgerFailure, forbids });
      }
    }
  }

  if (failures.length > 0) {
    return { outcome: "FAIL", scenarioId: scenario.id, candidate: candidate.name, failures };
  }
  return { outcome: "PASS", scenarioId: scenario.id, candidate: candidate.name, steps: scenario.steps.length };
}

/**
 * Fail closed. A step that declares a ledger expectation is asserting independent attribution, so an
 * unusable observer is a failure of that assertion, never a reason to skip it. Returns `null` when the
 * expectation holds and a failure description otherwise.
 */
function assertLedger(expected: number, options: RunOptions): string | null {
  const count = options?.ledger?.count;
  if (typeof count !== "function") {
    return `this step asserts independent-ledger attribution, but the runner was invoked without a usable ledger observer; the expectation cannot be skipped (expected ${expected})`;
  }
  const observed = count.call(options.ledger);
  if (typeof observed !== "number") {
    return `the independent ledger observer returned ${typeof observed}, not a count (expected ${expected})`;
  }
  return observed === expected ? null : `expected ledger size ${expected}, independent ledger recorded ${observed}`;
}

/**
 * Classifications whose **reason text** an accepted decision fixes verbatim, so the fixture may
 * require it exactly.
 *
 * There is exactly one. CX-6 states it in terms: "Record and return an inspectable rejection
 * classification **cancellation/terminal-conflict**, with reason **cancellation accepted before
 * Outcome acceptance**". Nothing fixes the wording of any other rejection — §11 row 4 asks only for
 * "a recorded, inspectable reason", and W-1 and OA-2/OA-3 name conditions rather than messages.
 *
 * Round-3 correction, found while welding `checkWaitWellFormed`'s rules to the scenario corpus: the
 * fixture's own helper and its scenario expectation described the same malformed wait in two different
 * sentences, which is only possible because both were arbitrary. That is round-2 finding K02-R2-01's
 * defect in a new place — the oracle would have failed a conforming K1 candidate for phrasing a
 * permitted message differently. The classification is canonical and is still compared exactly; the
 * reason is required to exist and to be non-empty, which is what "recorded, inspectable" means, and
 * its text is documentation of one conforming answer rather than a requirement.
 */
const CANONICAL_REASON_CLASSIFICATIONS: ReadonlySet<string> = new Set(["cancellation_terminal_conflict"]);

/** Returns a failure description, or `null` when the observed rejection satisfies what is fixed. */
function compareRejection(expected: OutcomeRejection | null, actual: OutcomeRejection | null): string | null {
  if (expected === null) {
    return actual === null ? null : `expected no recorded rejection, observed ${JSON.stringify(actual)}`;
  }
  if (actual === null) return `expected a recorded rejection classified ${expected.classification}, observed none`;
  if (actual.classification !== expected.classification) {
    return `rejection classification: expected ${expected.classification}, observed ${actual.classification}`;
  }
  if (typeof actual.reason !== "string" || actual.reason.trim().length === 0) {
    return `rejection is classified ${expected.classification} but records no inspectable reason (§11 row 4)`;
  }
  if (CANONICAL_REASON_CLASSIFICATIONS.has(expected.classification) && actual.reason !== expected.reason) {
    return `rejection reason: ${expected.classification} fixes its reason verbatim (CX-6), expected ${JSON.stringify(expected.reason)}, observed ${JSON.stringify(actual.reason)}`;
  }
  return null;
}

/**
 * Replace a non-canonical rejection reason with the expected one before the structural comparison, so
 * that `deepStrictEqual` judges every other field exactly while the reason's wording is left to
 * `compareRejection`. Any real difference in the rejection has already been reported by then.
 */
function normalizeRejection(actual: Observation, expected: Observation): Observation {
  if (actual.rejection === null || expected.rejection === null) return actual;
  if (actual.rejection.classification !== expected.rejection.classification) return actual;
  if (CANONICAL_REASON_CLASSIFICATIONS.has(expected.rejection.classification)) return actual;
  if (typeof actual.rejection.reason !== "string" || actual.rejection.reason.trim().length === 0) return actual;
  return { ...actual, rejection: { ...actual.rejection, reason: expected.rejection.reason } };
}

/**
 * **Candidate-minted tokens, compared by the relations the protocol fixes rather than by spelling.**
 *
 * Round-4 review finding K02-R4-01 rejected an invented rule about how a *declared subscription
 * identity* may be spelled. Sweeping the neighbouring implementation-owned spellings, as that finding
 * requires, turns up the mirror-image problem in this runner. Most tokens a scenario asserts are
 * **fixture-supplied** — Event IDs, emission IDs, wait generations, deadline values and
 * progress values all arrive in the commands the schedule issues, so comparing them literally
 * compares the laboratory's own data. Two are **candidate-minted**, and for those the accepted
 * decisions fix only relations:
 *
 *   - **Receipts.** §2's *Left open* note: "exact receipt serialization (opaque token vs. structured
 *     tuple)" is implementation-owned. What ID-6/OA-2 fix is that a replay returns *the same* receipt,
 *     that a new acceptance returns a *different* one, and that a rejection returns *none*.
 *   - **Activation IDs.** ID-3 and ID-9 are entirely relational: two semantically different dispatches
 *     never carry the same ID, and a takeover keeps the one it has. No decision fixes the spelling.
 *
 * So a conforming K1 candidate that mints `"r/7f3a"` where this fixture writes `"receipt:create:req-x"`
 * was being failed for a choice the protocol left to it. The relation is enforced instead: within one
 * scenario run *and within one token family* the mapping from expected token to observed token must
 * be a **bijection** — the same expected token always names the same observed token, and two expected
 * tokens never collapse onto one. That is exactly "same means same, different means different", and
 * it still rejects every counterexample in the corpus, each of which violates the relation rather
 * than the spelling.
 *
 * The two families use **separate** bijections. ID-3/ID-9 constrain Activation IDs relative to other
 * Activation IDs; ID-6/ID-7 constrain receipts relative to other receipts and accepted boundaries.
 * Nothing says an opaque receipt token's raw representation must be disjoint from the raw
 * representation chosen for an Activation ID — they are different typed protocol concepts. Round-5
 * review finding K02-R5-01: one shared relation rejected a candidate exposing receipt `"opaque-1"`
 * alongside Activation ID `"opaque-1"` while keeping both domains internally correct. Cross-family
 * reuse of one raw spelling therefore passes; collapsing two receipts, or two Activation IDs, onto
 * one spelling still fails within its own family.
 *
 * **`writerEpoch` is deliberately not in here.** §2 leaves "integer vs. fencing token" open, and this
 * fixture models ID-4's first option, which ID-4 permits in terms ("a monotonically increasing integer
 * (or equivalent total order)"). Every assertion made of it is about *advancement and supersession*,
 * which any total order satisfies; a candidate using fencing tokens adapts them to that order at the
 * port. Recorded here rather than left implicit, because an unstated modelling choice is how the
 * subscription defect got in.
 *
 * **Normalization sweep (K02-R5-01).** No other normalization state couples the two families.
 * `normalizeRejection` keys only on rejection classification (canonical CX-6 vs. non-canonical
 * free text); `normalizeRepresentations` rewrites each family's spelling to its own expected token
 * independently and never keys one family's normalization on the other's observed value; the
  * recovery-hold check keys only on presence plus non-empty reason (PC-5); `acceptedDeadline`
  * values are fixture-supplied deadlines compared literally. The only shared mutable normalization
  * state was the single `TokenRelation`, now split.
 */
class TokenRelation {
  private readonly forward = new Map<string, string>();
  private readonly backward = new Map<string, string>();

  /** Returns a failure description, or `null` when the relation still holds. */
  check(field: string, expected: string | null, actual: string | null): string | null {
    if (expected === null) {
      return actual === null ? null : `${field}: expected none, observed ${JSON.stringify(actual)}`;
    }
    if (actual === null) return `${field}: expected one, observed none`;

    const boundActual = this.forward.get(expected);
    if (boundActual !== undefined && boundActual !== actual) {
      return `${field}: ${JSON.stringify(expected)} named ${JSON.stringify(boundActual)} earlier in this run and now names ${JSON.stringify(actual)}; the protocol fixes that these are the same, not how they are spelled`;
    }
    const boundExpected = this.backward.get(actual);
    if (boundExpected !== undefined && boundExpected !== expected) {
      return `${field}: ${JSON.stringify(actual)} already names ${JSON.stringify(boundExpected)}, so reusing it for ${JSON.stringify(expected)} collapses two things the protocol requires to be distinct`;
    }
    this.forward.set(expected, actual);
    this.backward.set(actual, expected);
    return null;
  }

}

/**
 * Everything the fixture requires of a representation it does not own, checked before the structural
 * comparison: the two relational token families, and the recovery hold.
 *
 * The hold is here for the same reason the rejection reason is: PC-5 requires "an inspectable
 * recovery-hold state" and fixes no wording for it, so requiring this fixture's sentence verbatim
 * would fail a conforming candidate that says the same thing differently. That this was missed when
 * the rejection reason was corrected in round 3 is the point of doing the sweep by field rather than
 * by memory.
 */
export interface TokenNamespace {
  readonly receiptTokens: TokenRelation;
  readonly activationTokens: TokenRelation;
}

function compareRepresentations(expected: Observation, actual: Observation, tokens: TokenNamespace): readonly string[] {
  const failures: string[] = [];

  const rejectionFailure = compareRejection(expected.rejection, actual.rejection);
  if (rejectionFailure !== null) failures.push(rejectionFailure);

  const receiptFailure = tokens.receiptTokens.check("receipt", expected.receipt, actual.receipt);
  if (receiptFailure !== null) failures.push(receiptFailure);

  const activationFailure = tokens.activationTokens.check("activationId", expected.activationId, actual.activationId);
  if (activationFailure !== null) failures.push(activationFailure);

  if (expected.recoveryHold === null && actual.recoveryHold !== null) {
    failures.push(`recoveryHold: expected none, observed ${JSON.stringify(actual.recoveryHold)}`);
  } else if (expected.recoveryHold !== null) {
    if (actual.recoveryHold === null) {
      failures.push("recoveryHold: expected an inspectable hold, observed none (PC-5)");
    } else if (typeof actual.recoveryHold.reason !== "string" || actual.recoveryHold.reason.trim().length === 0) {
      failures.push("recoveryHold: a hold is present but records no inspectable reason (PC-5)");
    }
  }

  return failures;
}

/**
 * Rewrite the representations this fixture does not own to the expected spellings, so that
 * `deepStrictEqual` judges every field it *does* own exactly. Anything actually wrong has already been
 * reported by `compareRepresentations`; this only stops a permitted spelling from being reported twice
 * as a structural difference.
 */
function normalizeRepresentations(actual: Observation, expected: Observation): Observation {
  let normalized = normalizeRejection(actual, expected);
  if (expected.receipt !== null && normalized.receipt !== null) normalized = { ...normalized, receipt: expected.receipt };
  if (expected.activationId !== null && normalized.activationId !== null) normalized = { ...normalized, activationId: expected.activationId };
  if (expected.recoveryHold !== null && normalized.recoveryHold !== null) normalized = { ...normalized, recoveryHold: expected.recoveryHold };
  return normalized;
}

/** Field-by-field difference, so a failure names the violated obligation rather than dumping two objects. */
function describeDifference(expected: Observation, actual: Observation): string {
  const differences: string[] = [];
  for (const key of Object.keys(expected) as (keyof Observation)[]) {
    const want = JSON.stringify(expected[key] ?? null);
    const got = JSON.stringify(actual[key] ?? null);
    if (want !== got) differences.push(`${key}: expected ${want}, observed ${got}`);
  }
  return differences.length > 0 ? differences.join("; ") : "observations differ structurally";
}
