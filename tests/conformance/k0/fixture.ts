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
import type { ExecutionState, FixtureEvent, OutcomeEnvelope, OutcomeRejection, WaitRecord } from "./protocol-vocabulary.ts";
import type { OperationSink } from "./operation-sink.ts";

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
   * The Event batch pinned by the **current unresolved** Activation, in acceptance order; `null` when
   * no Activation is unresolved. Reservation pins it and does not acknowledge it (B-3), which is what
   * makes CX-6's "acknowledges none of that batch" an observable fact rather than a claim.
   */
  readonly dispatchedBatch: readonly string[] | null;
  /** The receipt returned by the most recent accepted Outcome, if any. */
  readonly receipt: string | null;
  /** The rejection recorded by the most recent rejected Outcome, if any. */
  readonly rejection: OutcomeRejection | null;
  /** Writer epoch of the current exchange. A takeover advances it under the same Activation ID (ID-9). */
  readonly writerEpoch: number;
  /** PC-5: an inspectable recovery hold, never a fresh-restored fabrication. */
  readonly recoveryHold: { readonly reason: string } | null;
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
  /** The §11 boundary rows of the accepted K0.1 worksheet this scenario observes. */
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

export interface RunOptions {
  readonly sink: OperationSink;
  /** Independent ledger size reader, used only when a step declares `ledgerCount`. */
  readonly ledgerCount?: () => number;
}

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
    try {
      deepStrictEqual(actual, step.expect.observation);
    } catch {
      failures.push({
        stepIndex,
        label: step.expect.label,
        detail: describeDifference(step.expect.observation, actual),
        forbids,
      });
    }
    if (step.expect.ledgerCount !== undefined && options.ledgerCount !== undefined) {
      const observedLedger = options.ledgerCount();
      if (observedLedger !== step.expect.ledgerCount) {
        failures.push({
          stepIndex,
          label: `${step.expect.label} (independent sink ledger)`,
          detail: `expected ledger size ${step.expect.ledgerCount}, independent ledger recorded ${observedLedger}`,
          forbids,
        });
      }
    }
  }

  if (failures.length > 0) {
    return { outcome: "FAIL", scenarioId: scenario.id, candidate: candidate.name, failures };
  }
  return { outcome: "PASS", scenarioId: scenario.id, candidate: candidate.name, steps: scenario.steps.length };
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
