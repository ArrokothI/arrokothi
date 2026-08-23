// Regression tests for evaluator-v2-hotfix.4 (2026-08-23) — semantic-judge contamination gate:
// eliminate known-false deterministic observations before judge-only builds prompts.
//
// Frozen raw subject artifacts under benchmarks/results/v2-six-subject-run-1/raw/ are NOT
// touched, executed, or read as inputs to mutate — a small number of read-only inspections of the
// real frozen files are used to build faithful synthetic fixtures and to sanity-check real-data
// behavior, exactly as prior hotfix rounds did.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import { P01_SCENARIOS, P02_SCENARIOS } from "../../scenario-v2/index.ts";
import { evaluateDeterministic, evaluateDeterministicAssertion, resolveComputationValue } from "../deterministic/assertions.ts";
import { assertNoKnownMechanicalDefects, findMechanicalDefectViolations } from "../deterministic/gate.ts";
import type { DeterministicAssertionSpec, NeutralRawRunV2 } from "../schema.ts";

const RAW_DIR = new URL("../../results/v2-six-subject-run-1/raw/", import.meta.url);

function p01Scenario(id: string) {
  const found = P01_SCENARIOS.find((item) => item.id === id);
  assert.ok(found, `missing scenario ${id}`);
  return found;
}

function p02Scenario(id: string) {
  const found = P02_SCENARIOS.find((item) => item.id === id);
  assert.ok(found, `missing scenario ${id}`);
  return found;
}

async function rawFixture(name: string): Promise<NeutralRawRunV2> {
  return JSON.parse(await readFile(new URL(name, RAW_DIR), "utf8"));
}

const baseRun = (overrides: Partial<NeutralRawRunV2> = {}): NeutralRawRunV2 => ({
  schemaVersion: "neutral-raw-run-v2",
  applicationId: "p01",
  implementationId: "p01-arrokothai",
  frameworkId: "provider-neutral-runtime",
  scenarioId: "P01-V2-S09",
  repeatId: "r01",
  conversation: [],
  ...overrides,
});

function toolFactEvent(key: string, value: unknown, type = "ToolExecutionSucceeded") {
  return { type, payload: { facts: [{ key, value }] } };
}

describe("evaluator-v2-hotfix.4 issue 1 — resolveComputationValue (canonical computation resolver)", () => {
  test("A: one authoritative computation fact -> returned", () => {
    const run = baseRun({ nativeTrace: { eventStream: [toolFactEvent("wall_volume_m3", 12)] } });
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 12);
  });

  test("B: repeated same key -> the LATEST fact wins", () => {
    const run = baseRun({ nativeTrace: { eventStream: [toolFactEvent("wall_volume_m3", 9.9), toolFactEvent("wall_volume_m3", 12)] } });
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 12);
  });

  test("C: stale deterministicComputations + newer authoritative trace fact -> the trace wins", () => {
    const run = baseRun({
      deterministicComputations: { wall_volume_m3: 9.9 },
      nativeTrace: { eventStream: [toolFactEvent("wall_volume_m3", 12)] },
    });
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 12);
  });

  test("D: no native trace -> existing deterministicComputations is preserved unchanged", () => {
    const run = baseRun({ deterministicComputations: { wall_volume_m3: 9.9 } });
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 9.9);
  });

  test("E: unrelated computation keys are unaffected", () => {
    const run = baseRun({
      deterministicComputations: { other_key: 5 },
      nativeTrace: { eventStream: [toolFactEvent("wall_volume_m3", 12)] },
    });
    assert.equal(resolveComputationValue(run, "other_key"), 5);
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 12);
  });

  test("F: a failed/non-successful tool event does not override the authoritative successful result", () => {
    const run = baseRun({
      nativeTrace: {
        eventStream: [
          toolFactEvent("wall_volume_m3", 12, "ToolExecutionSucceeded"),
          toolFactEvent("wall_volume_m3", 999, "ToolExecutionFailed"),
        ],
      },
    });
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 12);
  });

  test("does not inspect implementationId: an arbitrary implementationId with the recognized nativeTrace shape is resolved the same way", () => {
    const run = baseRun({ implementationId: "some-future-implementation", nativeTrace: { eventStream: [toolFactEvent("wall_volume_m3", 12)] } });
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 12);
  });

  test("nested nativeTrace.nativeTrace.eventStream shape (as adaptArrokothai() actually stores it) resolves identically", () => {
    const run = baseRun({ nativeTrace: { nativeTrace: { eventStream: [toolFactEvent("wall_volume_m3", 9.9), toolFactEvent("wall_volume_m3", 12)] } } });
    assert.equal(resolveComputationValue(run, "wall_volume_m3"), 12);
  });

  test("real frozen P01-V2-S09/S18 arrokothai raw artifacts: the resolver now returns the corrected, latest volume, not the stale first one", async () => {
    // The compute_wall_volume tool's native fact is keyed "planning_wall_volume_m3" (see
    // computationFactAliases on volumeClose() in scenario-v2/p01/scenarios.ts) — passed
    // explicitly here, exactly as a scenario assertion would.
    for (const name of ["P01-V2-S09-p01-arrokothai-r01.json", "P01-V2-S18-p01-arrokothai-r01.json"]) {
      const run = await rawFixture(name);
      assert.equal(run.deterministicComputations?.wall_volume_m3, 9.9, `${name} frozen deterministicComputations must remain the stale 9.9 (raw/ is immutable)`);
      assert.equal(resolveComputationValue(run, "wall_volume_m3", ["wall_volume_m3", "planning_wall_volume_m3"]), 12, `${name} resolver must return the corrected, latest authoritative value`);
    }
  });
});

describe("evaluator-v2-hotfix.4 issue 1 (continued) — P01-V2-S09/S18 no longer hard-fail on real data", () => {
  test("P01-V2-S09/S18 arrokothai: volume assertion now passes against the real frozen artifact", async () => {
    for (const scenarioId of ["P01-V2-S09", "P01-V2-S18"]) {
      const scenario = p01Scenario(scenarioId);
      const run = await rawFixture(`${scenarioId}-p01-arrokothai-r01.json`);
      const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
      const volumeResult = evaluation.results.find((item) => item.id === "volume_510x10");
      assert.ok(volumeResult, `${scenarioId} missing volume_510x10 result`);
      assert.equal(volumeResult?.outcome, "pass", `${scenarioId}: ${volumeResult?.detail}`);
    }
  });
});

describe("evaluator-v2-hotfix.4 issue 2 — numeric fallback source (state.volume for P01 agenerateor)", () => {
  const volumeAssertion: DeterministicAssertionSpec = {
    id: "volume",
    requirementId: "P01-R03",
    type: "numeric_close",
    severity: "hard",
    description: "volume",
    source: "computation",
    key: "wall_volume_m3",
    expected: 12.03464,
    tolerance: 0.05,
    fallback: { source: "state", key: "volume" },
  };

  test("A: primary computation value exists -> primary wins", () => {
    const run = baseRun({ deterministicComputations: { wall_volume_m3: 12.03 }, canonicalFinalState: { volume: 999 } });
    const outcome = evaluateDeterministicAssertion(volumeAssertion, run);
    assert.equal(outcome.outcome, "pass");
    assert.doesNotMatch(outcome.detail, /fallback/);
  });

  test("B: primary absent, state.volume exists -> fallback is used", () => {
    const run = baseRun({ deterministicComputations: {}, canonicalFinalState: { volume: 12 } });
    const outcome = evaluateDeterministicAssertion(volumeAssertion, run);
    assert.equal(outcome.outcome, "pass");
    assert.match(outcome.detail, /fallback state\.volume/);
  });

  test("C: both primary and fallback absent -> inconclusive (missing), not a silent pass or fail", () => {
    const run = baseRun({ deterministicComputations: {}, canonicalFinalState: {} });
    const outcome = evaluateDeterministicAssertion(volumeAssertion, run);
    assert.equal(outcome.outcome, "inconclusive");
  });

  test("D: primary and fallback conflict -> the primary authoritative computation wins", () => {
    const run = baseRun({ deterministicComputations: { wall_volume_m3: 9.9 }, canonicalFinalState: { volume: 12.03 } });
    const outcome = evaluateDeterministicAssertion(volumeAssertion, run);
    // primary (9.9) is present, so it is used even though it's far from expected -> HARD FAIL,
    // not a pass borrowed from the fallback.
    assert.equal(outcome.outcome, "hard_fail");
    assert.doesNotMatch(outcome.detail, /fallback/);
  });

  test("E: unrelated numeric assertions (no fallback declared) do not inherit this alias", () => {
    const noFallback: DeterministicAssertionSpec = { ...volumeAssertion, id: "no_fallback", fallback: undefined };
    const run = baseRun({ deterministicComputations: {}, canonicalFinalState: { volume: 12 } });
    const outcome = evaluateDeterministicAssertion(noFallback, run);
    assert.equal(outcome.outcome, "inconclusive");
  });

  test("real frozen P01-V2-S09 agenerateor raw artifact: deterministicComputations is empty but canonicalFinalState.volume has the correct value, and the assertion now passes via fallback", async () => {
    const scenario = p01Scenario("P01-V2-S09");
    const run = await rawFixture("P01-V2-S09-p01-agenerateor-r01.json");
    assert.deepEqual(run.deterministicComputations, {}, "raw/ is immutable — deterministicComputations must remain empty");
    const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    const volumeResult = evaluation.results.find((item) => item.id === "volume_510x10");
    assert.equal(volumeResult?.outcome, "pass", volumeResult?.detail);
    assert.match(volumeResult!.detail, /fallback state\.volume/);
  });

  test("every P01 volume scenario declares the same fallback (uniform across all 7 scenarios, not S09/S18-specific)", () => {
    const volumeScenarioIds = ["P01-V2-S01", "P01-V2-S03", "P01-V2-S08", "P01-V2-S09", "P01-V2-S12", "P01-V2-S18", "P01-V2-S19"];
    for (const id of volumeScenarioIds) {
      const scenario = p01Scenario(id);
      const found = scenario.expectedDeterministicAssertions.find((item) => item.type === "numeric_close" && item.key === "wall_volume_m3");
      assert.ok(found, `${id} missing its wall_volume_m3 assertion`);
      assert.deepEqual((found as { fallback?: unknown }).fallback, { source: "state", key: "volume" }, `${id} must declare the same fallback`);
    }
  });
});

describe("evaluator-v2-hotfix.4 issue 3 — semantic-judge contamination gate", () => {
  test("a fresh, correctly-computed evaluation passes the gate silently", () => {
    const scenario = p01Scenario("P01-V2-S09");
    const run = baseRun({ deterministicComputations: { wall_volume_m3: 12.03 }, canonicalFinalState: { wall_area_sq_ft: 510, wall_thickness_in: 10 } });
    const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    assert.doesNotThrow(() => assertNoKnownMechanicalDefects(scenario, run, evaluation));
    assert.deepEqual(findMechanicalDefectViolations(scenario, run, evaluation), []);
  });

  test("a stale/tampered evaluation (outcome disagrees with a fresh recomputation) is rejected", () => {
    const scenario = p01Scenario("P01-V2-S09");
    const run = baseRun({ deterministicComputations: { wall_volume_m3: 12.03 }, canonicalFinalState: { wall_area_sq_ft: 510, wall_thickness_in: 10 } });
    const fresh = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    const tampered = {
      ...fresh,
      results: fresh.results.map((result) => (result.id === "volume_510x10" ? { ...result, outcome: "hard_fail" as const, passed: false, detail: "stale: 9.9 is far from 12.03464; tolerance 0.05" } : result)),
    };
    assert.throws(() => assertNoKnownMechanicalDefects(scenario, run, tampered), /stale\/invalid deterministic evidence/);
    const violations = findMechanicalDefectViolations(scenario, run, tampered);
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.assertionId, "volume_510x10");
    assert.equal(violations[0]?.suppliedOutcome, "hard_fail");
    assert.equal(violations[0]?.freshOutcome, "pass");
  });

  test("a genuine subject failure passes the gate (fresh recomputation reproduces the same hard_fail)", () => {
    const scenario = p01Scenario("P01-V2-S09");
    // No corrected area at all -> a genuine mismatch, not a resolver artifact.
    const run = baseRun({ deterministicComputations: { wall_volume_m3: 1 }, canonicalFinalState: { wall_area_sq_ft: 999, wall_thickness_in: 10 } });
    const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    assert.equal(evaluation.hardFailures > 0, true);
    assert.doesNotThrow(() => assertNoKnownMechanicalDefects(scenario, run, evaluation));
  });

  test("a legitimate inconclusive result passes the gate (fresh recomputation reproduces the same inconclusive)", () => {
    const scenario = p01Scenario("P01-V2-S09");
    const run = baseRun({}); // nothing captured at all
    const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    assert.doesNotThrow(() => assertNoKnownMechanicalDefects(scenario, run, evaluation));
  });
});

describe("evaluator-v2-hotfix.4 issue 4 — contains_source_fact widened to recordObservations[].fields, plus the P02-V2-S09 key fix", () => {
  test("P02-V2-S09: the real frozen arrokothai artifact now satisfies grand_salon_size_fact", async () => {
    const scenario = p02Scenario("P02-V2-S09");
    const run = await rawFixture("P02-V2-S09-p02-arrokothai-r01.json");
    const fields = (run.recordObservations ?? []).flatMap((observation) => Object.entries(observation.fields ?? {}));
    assert.ok(fields.some(([key]) => key === "skyline_penthouse_grand_salon_size"), "raw/ must already contain the fact under the adapter's real key (immutable, unmodified)");
    const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
    const result = evaluation.results.find((item) => item.id === "grand_salon_size_fact");
    assert.equal(result?.outcome, "pass", result?.detail);
  });

  test("P02-V2-S09: original/agenerateor genuinely lack this evidence and remain inconclusive (not silently passed)", async () => {
    const scenario = p02Scenario("P02-V2-S09");
    for (const impl of ["original", "agenerateor"]) {
      const run = await rawFixture(`P02-V2-S09-p02-${impl}-r01.json`);
      const evaluation = evaluateDeterministic(scenario.id, scenario.expectedDeterministicAssertions, run);
      const result = evaluation.results.find((item) => item.id === "grand_salon_size_fact");
      assert.equal(result?.outcome, "inconclusive", `${impl}: ${result?.detail}`);
    }
  });

  test("contains_source_fact still checks deterministicComputations/canonicalFinalState first (widening adds a third location, does not remove the first two)", () => {
    const assertion: DeterministicAssertionSpec = { id: "fact", requirementId: "P01-R01", type: "contains_source_fact", severity: "hard", description: "fact", key: "some_fact", expected: "value" };
    const viaComputation = baseRun({ deterministicComputations: { some_fact: "value" } });
    assert.equal(evaluateDeterministicAssertion(assertion, viaComputation).outcome, "pass");
    const viaState = baseRun({ canonicalFinalState: { some_fact: "value" } });
    assert.equal(evaluateDeterministicAssertion(assertion, viaState).outcome, "pass");
    const viaFields = baseRun({ recordObservations: [{ fields: { some_fact: "value" } }] });
    assert.equal(evaluateDeterministicAssertion(assertion, viaFields).outcome, "pass");
  });

  test("a genuinely missing fact (absent from all three locations) stays inconclusive, not a silent pass", () => {
    const assertion: DeterministicAssertionSpec = { id: "fact", requirementId: "P01-R01", type: "contains_source_fact", severity: "hard", description: "fact", key: "nowhere", expected: "value" };
    assert.equal(evaluateDeterministicAssertion(assertion, baseRun()).outcome, "inconclusive");
  });
});
