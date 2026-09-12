/**
 * K0.2-C7(b): the oracle is proven in both directions.
 *
 * 012's deterministic-execution method requires including "a plausible broken behavior that the oracle
 * would reject". A fixture that rejects everything is as useless as one that passes everything, so both
 * are ruled out here: a conforming transcript must PASS, and every violating transcript must FAIL at the
 * exact step, naming the exact observation field whose forbidden mutation it represents.
 *
 * The conforming transcript is derived from the scenarios' own expectations and therefore proves only
 * that the runner can report PASS. The discriminating evidence is entirely on the violating side.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { conformingCandidate, expectedObservations, scriptedCandidate, VIOLATIONS, violatingCandidate } from "./candidate.ts";
import { createOperationSink } from "./operation-sink.ts";
import { runScenario } from "./fixture.ts";
import type { Observation, RunOptions, Scenario } from "./fixture.ts";
import { ALL_SCENARIOS, UNSAFE_CONTROLS } from "./scenarios.ts";

function scenarioById(id: string) {
  const scenario = ALL_SCENARIOS.find((candidate) => candidate.id === id);
  assert.ok(scenario, `violation names unknown scenario ${id}`);
  return scenario;
}

describe("K0 public fixture: the oracle passes a conforming transcript", () => {
  for (const scenario of ALL_SCENARIOS) {
    test(`${scenario.id} passes`, () => {
      const bundle = createOperationSink();
      const result = runScenario(conformingCandidate, scenario, bundle);
      assert.equal(
        result.outcome,
        "PASS",
        result.outcome === "FAIL" ? result.failures.map((failure) => `${failure.label}: ${failure.detail}`).join(" | ") : "",
      );
    });
  }
});

describe("K0 public fixture: the oracle rejects every plausible wrong implementation", () => {
  for (const violation of VIOLATIONS) {
    test(`${violation.id} is caught`, () => {
      const scenario = scenarioById(violation.scenarioId);
      const bundle = createOperationSink();
      const result = runScenario(violatingCandidate(violation), scenario, bundle);

      assert.equal(result.outcome, "FAIL", `the oracle accepted a known-bad trace: ${violation.plausibleBug}`);
      if (result.outcome !== "FAIL") return;

      const atStep = result.failures.filter((failure) => failure.stepIndex === violation.stepIndex);
      assert.ok(
        atStep.length > 0,
        `expected a failure at step ${violation.stepIndex}, got steps ${result.failures.map((failure) => failure.stepIndex).join(",")}`,
      );

      // Failing for an unrelated reason would be an accident, not discrimination.
      const detail = atStep.map((failure) => failure.detail).join(" | ");
      for (const field of violation.mustNameFields) {
        assert.match(detail, new RegExp(field), `failure at step ${violation.stepIndex} did not name ${field}: ${detail}`);
      }
    });
  }

  test("every unsafe/state-loss control has at least one violating transcript", () => {
    for (const control of UNSAFE_CONTROLS) {
      const covering = VIOLATIONS.filter((violation) => violation.scenarioId === control.id);
      assert.ok(covering.length > 0, `unsafe control ${control.id} ships no plausible wrong implementation`);
    }
  });

  test("the variant Decision M-1 names explicitly is present and rejected", () => {
    // "Suppressing only next state while installing losing progress is a failing control, not a
    // conforming variant." The transcript below reports the correct CANCELLED headline state and is
    // wrong about everything underneath it, which is exactly why the headline cannot be the assertion.
    const violation = VIOLATIONS.find((entry) => entry.id === "control-cancel/losing-progress-installed-with-next-state-suppressed");
    assert.ok(violation, "M-1's named failing variant is missing from the violation set");

    const scenario = scenarioById(violation.scenarioId);
    const mutated = violation.mutate(scenario.steps[violation.stepIndex]!.expect.observation);
    assert.equal(mutated.state, "CANCELLED", "the variant must keep the correct headline state, or it proves nothing");

    const bundle = createOperationSink();
    const result = runScenario(violatingCandidate(violation), scenario, bundle);
    assert.equal(result.outcome, "FAIL");
  });

  test("a violation that only the independent ledger can see is still caught", () => {
    // The observation is left conforming; only the sink's own record contradicts the claimed refusal.
    const violation = VIOLATIONS.find((entry) => entry.id === "effect-refusal/refusal-claimed-while-the-sink-was-called");
    assert.ok(violation, "the ledger-attribution violation is missing");
    assert.equal(violation.mustNameFields.length, 0, "this violation must not be catchable from the observation alone");

    const scenario = scenarioById(violation.scenarioId);
    const bundle = createOperationSink();
    const result = runScenario(violatingCandidate(violation), scenario, bundle);

    assert.equal(result.outcome, "FAIL");
    if (result.outcome !== "FAIL") return;
    assert.ok(
      result.failures.some((failure) => /independent sink ledger/.test(failure.label)),
      "the failure must be attributed to the independent ledger, not to the candidate's self-report",
    );
    assert.equal(bundle.ledger.count(), 1, "the ledger must have recorded the attempt the candidate denied making");
  });
});

describe("K0 public fixture: a ledger expectation cannot be skipped by how the runner is invoked", () => {
  // Round-1 review finding K02-R1-03. The earlier runner asserted a step's `ledgerCount` only when an
  // observer happened to be supplied, and silently skipped it otherwise. That failed open: the one bad
  // candidate catchable *only* through the ledger would report PASS purely because of the call shape.
  //
  // The contract is now closed in two independent ways, and both are checked here: the runner takes
  // the whole sink bundle, so omission is a type error, and `assertLedger` treats an unusable observer
  // as a failure of the assertion rather than a reason to skip it. The casts below exist precisely to
  // get around the type-level guard and prove the runtime guard alone still holds.

  const ledgerViolation = VIOLATIONS.find((entry) => entry.id === "effect-refusal/refusal-claimed-while-the-sink-was-called")!;

  function runWith(options: unknown) {
    const scenario = scenarioById(ledgerViolation.scenarioId);
    return runScenario(violatingCandidate(ledgerViolation), scenario, options as RunOptions);
  }

  test("the scenario under test declares ledger expectations, or this suite proves nothing", () => {
    const scenario = scenarioById(ledgerViolation.scenarioId);
    const declaring = scenario.steps.filter((step) => step.expect.ledgerCount !== undefined);
    assert.ok(declaring.length > 0, "the effect-attribution scenario must declare independent-ledger expectations");
  });

  test("the bad candidate cannot pass when the ledger observer is omitted entirely", () => {
    const { sink } = createOperationSink();
    const result = runWith({ sink });

    assert.equal(result.outcome, "FAIL", "omitting the observer must not turn a known-bad candidate into a pass");
    assert.notEqual(result.outcome as string, "PASS");
    if (result.outcome !== "FAIL") return;
    assert.ok(
      result.failures.some((failure) => /cannot be skipped/.test(failure.detail)),
      "the failure must say the expectation could not be evaluated, rather than silently passing it",
    );
  });

  test("the bad candidate cannot pass when the observer is present but unusable", () => {
    const { sink } = createOperationSink();
    const result = runWith({ sink, ledger: {} });

    assert.equal(result.outcome, "FAIL");
    if (result.outcome !== "FAIL") return;
    assert.ok(result.failures.some((failure) => /cannot be skipped/.test(failure.detail)));
  });

  test("the bad candidate cannot pass when the observer returns a non-count", () => {
    const { sink } = createOperationSink();
    const result = runWith({ sink, ledger: { count: () => "zero" } });

    assert.equal(result.outcome, "FAIL");
    if (result.outcome !== "FAIL") return;
    assert.ok(result.failures.some((failure) => /not a count/.test(failure.detail)));
  });

  test("a conforming candidate is also failed by an unusable observer, not quietly passed", () => {
    // Fail-closed has to be symmetric. If only bad candidates failed here, the guard would be
    // discriminating on the candidate rather than on whether the obligation was actually checked.
    const { sink } = createOperationSink();
    const scenario = scenarioById(ledgerViolation.scenarioId);
    const result = runScenario(conformingCandidate, scenario, { sink } as unknown as RunOptions);

    assert.equal(result.outcome, "FAIL", "an unevaluated ledger assertion is a failure regardless of who was running");
  });

  test("with a proper bundle the same conforming candidate passes, so the guard is not simply always-fail", () => {
    const scenario = scenarioById(ledgerViolation.scenarioId);
    const result = runScenario(conformingCandidate, scenario, createOperationSink());
    assert.equal(result.outcome, "PASS");
  });
});

describe("K0.2-C7: the rejection comparison is loosened exactly as far as the decisions allow", () => {
  /**
   * Round-3 correction. The oracle used to require every rejection's *reason text* verbatim. Only one
   * is canonical — CX-6 fixes "cancellation accepted before Outcome acceptance" by name — so for every
   * other classification the fixture was failing conforming candidates for phrasing a permitted
   * message differently, which is round-2 finding K02-R2-01's defect in a second place.
   *
   * Loosening an oracle is where holes get opened, so all five directions are pinned here: the one
   * thing that must now pass, and the four that must still fail.
   */
  const scenarioOf = (id: string) => {
    const found = ALL_SCENARIOS.find((scenario) => scenario.id === id);
    assert.ok(found, `unknown scenario ${id}`);
    return found;
  };
  const nonCanonical = scenarioOf("control-whole-envelope-validation");
  const canonical = scenarioOf("control-cancel-versus-complete");

  const rewrite = (mutate: (rejection: NonNullable<Observation["rejection"]>) => Observation["rejection"]) =>
    (observation: Observation): Observation =>
      observation.rejection === null ? observation : { ...observation, rejection: mutate(observation.rejection) };

  const run = (scenario: Scenario, mutate: (observation: Observation) => Observation) =>
    runScenario(
      scriptedCandidate({ name: "rejection-probe", observationsFor: (target) => expectedObservations(target).map(mutate) }),
      scenario,
      createOperationSink(),
    ).outcome;

  const reworded = rewrite((rejection) => ({ ...rejection, reason: "the wait record is not well formed" }));
  const blank = rewrite((rejection) => ({ ...rejection, reason: "   " }));
  const reclassified = rewrite((rejection) => ({ ...rejection, classification: "stale_exchange" as const }));
  const dropped = rewrite(() => null);

  test("a differently worded non-canonical reason passes: no decision fixes that text", () => {
    assert.equal(run(nonCanonical, reworded), "PASS");
  });

  test("an empty reason still fails: §11 row 4 requires a recorded, inspectable reason", () => {
    assert.equal(run(nonCanonical, blank), "FAIL");
  });

  test("a changed classification still fails: the classification is canonical, not the prose", () => {
    assert.equal(run(nonCanonical, reclassified), "FAIL");
  });

  test("a dropped rejection still fails: refusing silently is not refusing", () => {
    assert.equal(run(nonCanonical, dropped), "FAIL");
  });

  test("CX-6's reason is still required verbatim: the worksheet fixes it by name", () => {
    assert.equal(run(canonical, reworded), "FAIL");
  });
});

describe("K0.2-C7: candidate-minted tokens are judged by relation, not by spelling", () => {
  /**
   * Round-4 correction, from the neighbouring-spelling sweep that finding K02-R4-01 requires. Most
   * tokens a scenario asserts are fixture-supplied, so comparing them literally compares the
   * laboratory's own data. Receipts and Activation IDs are minted by the candidate, and §2's *Left
   * open* note ("exact receipt serialization") and ID-3/ID-9's purely relational wording leave their
   * spelling to the implementation. The recovery hold's reason is the same shape as the rejection
   * reason corrected in round 3 — PC-5 requires an inspectable hold and fixes no wording — and was
   * missed then.
   *
   * Loosening an oracle is where holes open, so both directions are pinned: what must now pass, and
   * what must still fail.
   */
  const scenarioOf2 = (id: string) => {
    const found = ALL_SCENARIOS.find((scenario) => scenario.id === id);
    assert.ok(found, `unknown scenario ${id}`);
    return found;
  };
  const drive = (scenario: Scenario, mutate: (observation: Observation) => Observation) =>
    runScenario(
      scriptedCandidate({ name: "representation-probe", observationsFor: (target) => expectedObservations(target).map(mutate) }),
      scenario,
      createOperationSink(),
    ).outcome;

  const identity = scenarioOf2("identity-create-and-activation");
  const duplicate = scenarioOf2("control-duplicate-conflicting-outcome");
  const checkpoint = scenarioOf2("control-missing-checkpoint-code");

  test("a candidate that spells receipts and Activation IDs its own way passes, as long as the relation holds", () => {
    // An opaque receipt token and a different exchange-ID scheme: exactly what §2 leaves open.
    const respelled = (observation: Observation): Observation => ({
      ...observation,
      receipt: observation.receipt === null ? null : `opaque/${[...observation.receipt].reduce((sum, char) => sum + char.charCodeAt(0), 0)}`,
      activationId: observation.activationId === null ? null : observation.activationId.replace("act-", "xchg#"),
    });
    assert.equal(drive(identity, respelled), "PASS");
  });

  test("but collapsing two Activation IDs onto one still fails: ID-3 fixes that they differ", () => {
    const collapsed = (observation: Observation): Observation => ({
      ...observation,
      activationId: observation.activationId === null ? null : "the-activation",
    });
    assert.equal(drive(identity, collapsed), "FAIL");
  });

  test("and collapsing two receipts onto one still fails: ID-6 fixes that a new acceptance is not the old one", () => {
    const collapsed = (observation: Observation): Observation => ({
      ...observation,
      receipt: observation.receipt === null ? null : "r",
    });
    assert.equal(drive(duplicate, collapsed), "FAIL");
  });

  test("a differently worded recovery hold passes: PC-5 requires an inspectable hold, not a sentence", () => {
    const reworded = (observation: Observation): Observation =>
      observation.recoveryHold === null ? observation : { ...observation, recoveryHold: { reason: "cannot load the pinned build" } };
    assert.equal(drive(checkpoint, reworded), "PASS");
  });

  test("an empty recovery-hold reason still fails: a hold with nothing in it is not inspectable", () => {
    const blank = (observation: Observation): Observation =>
      observation.recoveryHold === null ? observation : { ...observation, recoveryHold: { reason: "" } };
    assert.equal(drive(checkpoint, blank), "FAIL");
  });
});
