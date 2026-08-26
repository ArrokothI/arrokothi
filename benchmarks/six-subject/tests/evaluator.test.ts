import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  P01_REQUIREMENTS,
  P01_SCENARIOS,
  P02_REQUIREMENTS,
  P02_SCENARIOS,
} from "../src/scenarios/index.ts";
import {
  aggregatePairwiseOutcomes,
  aggregateRepeatedRuns,
  assertPromptBlindness,
  buildPairwiseJudgePrompt,
  buildSemanticJudgePrompt,
  classifyRunValidity,
  deterministicPairOrder,
  evaluateDeterministic,
  evaluateDeterministicAssertion,
  PAIRWISE_CRITERIA,
  parsePairwiseJudgeOutput,
  parseSemanticJudgeOutput,
} from "../src/evaluator/index.ts";
import { CALIBRATION_FIXTURES } from "../src/evaluator/fixtures/calibration.ts";
import type {
  DeterministicAssertionSpec,
  DeterministicEvaluation,
  NeutralRawRunV2,
  PairwiseJudgeOutput,
  SemanticJudgeOutput,
} from "../src/evaluator/schema.ts";

const judge = { provider: "offline", requestedModel: "judge", temperature: 0, timestamp: "2026-08-22T00:00:00.000Z" };
const semanticValidation = (expectedRequirementIds: string[], hardRequirementIds: string[] = expectedRequirementIds) => ({
  expectedRequirementIds,
  hardRequirementIds,
});

const baseRun = (overrides: Partial<NeutralRawRunV2> = {}): NeutralRawRunV2 => ({
  schemaVersion: "neutral-raw-run-v2",
  applicationId: "p02",
  scenarioId: "S",
  repeatId: "r1",
  implementationId: "impl",
  frameworkId: "framework",
  conversation: [{ turn: 1, user: "hello", assistant: "hi" }],
  ...overrides,
});

describe("deterministic evaluator assertions", () => {
  test("deterministic exact state success and failure", () => {
    const assertion: DeterministicAssertionSpec = {
      id: "intent_buy",
      requirementId: "P02-R01",
      type: "state_equals",
      severity: "hard",
      description: "intent captured",
      key: "intent",
      expected: "buy",
    };
    assert.equal(evaluateDeterministicAssertion(assertion, baseRun({ canonicalFinalState: { intent: "buy" } })).outcome, "pass");
    assert.equal(evaluateDeterministicAssertion(assertion, baseRun({ canonicalFinalState: { intent: "sell" } })).outcome, "hard_fail");
  });

  test("numeric tolerance boundaries", () => {
    const assertion: DeterministicAssertionSpec = {
      id: "volume",
      requirementId: "P01-R03",
      type: "numeric_close",
      severity: "hard",
      description: "volume close",
      source: "computation",
      key: "wall_volume_m3",
      expected: 10,
      tolerance: 0.1,
    };
    assert.equal(evaluateDeterministicAssertion(assertion, baseRun({ deterministicComputations: { wall_volume_m3: 10.1 } })).outcome, "pass");
    assert.equal(evaluateDeterministicAssertion(assertion, baseRun({ deterministicComputations: { wall_volume_m3: 10.101 } })).outcome, "hard_fail");
  });

  test("canonical record exact-match evaluation", () => {
    const ids: DeterministicAssertionSpec = {
      id: "records",
      requirementId: "P02-R03",
      type: "record_ids_exact",
      severity: "hard",
      description: "ids",
      expectedIds: ["2", "4"],
    };
    const field: DeterministicAssertionSpec = {
      id: "price",
      requirementId: "P02-R06",
      type: "record_field_equals",
      severity: "hard",
      description: "price",
      recordId: "6",
      field: "price",
      expected: "$32,000,000",
    };
    const run = baseRun({
      exactSelectedRecordIds: ["4", "2"],
      recordObservations: [{ rows: { "6": { price: "$32,000,000" } } }],
    });
    assert.equal(evaluateDeterministicAssertion(ids, run).outcome, "pass");
    assert.equal(evaluateDeterministicAssertion(field, run).outcome, "pass");
  });

  test("zero-match evaluation", () => {
    const count: DeterministicAssertionSpec = {
      id: "count",
      requirementId: "P02-R07",
      type: "record_count",
      severity: "hard",
      description: "zero",
      expected: 0,
    };
    const ids: DeterministicAssertionSpec = {
      id: "ids",
      requirementId: "P02-R07",
      type: "record_ids_exact",
      severity: "hard",
      description: "empty",
      expectedIds: [],
    };
    const run = baseRun({ exactSelectedRecordIds: [], recordObservations: [{ resultCount: 0, selectedIds: [], zeroMatch: true }] });
    assert.equal(evaluateDeterministicAssertion(count, run).outcome, "pass");
    assert.equal(evaluateDeterministicAssertion(ids, run).outcome, "pass");
  });

  test("exact action payload and subset payload evaluation", () => {
    const exact: DeterministicAssertionSpec = {
      id: "exact_payload",
      requirementId: "P02-R13",
      type: "action_args_exact",
      severity: "hard",
      description: "exact",
      expected: { contact_name: "Taylor Kim", phone: "555-0133" },
    };
    const subset: DeterministicAssertionSpec = {
      id: "subset_payload",
      requirementId: "P02-R13",
      type: "action_args_subset",
      severity: "hard",
      description: "subset",
      expectedSubset: { phone: "555-0133" },
    };
    const run = baseRun({ exactActionPayload: { contact_name: "Taylor Kim", phone: "555-0133" } });
    assert.equal(evaluateDeterministicAssertion(exact, run).outcome, "pass");
    assert.equal(evaluateDeterministicAssertion(subset, run).outcome, "pass");
  });

  test("duplicate dispatch detection", () => {
    const assertion: DeterministicAssertionSpec = {
      id: "dispatch",
      requirementId: "P02-R16",
      type: "dispatch_count",
      severity: "hard",
      description: "one dispatch",
      expected: 1,
    };
    assert.equal(evaluateDeterministicAssertion(assertion, baseRun({ executorDispatchCount: 1 })).outcome, "pass");
    assert.equal(evaluateDeterministicAssertion(assertion, baseRun({ executorDispatchCount: 2 })).outcome, "hard_fail");
  });

  test("success vs definite_failure vs outcome_unknown", () => {
    for (const expected of ["success", "definite_failure", "outcome_unknown"] as const) {
      const assertion: DeterministicAssertionSpec = {
        id: expected,
        requirementId: "P02-R14",
        type: "action_outcome",
        severity: "hard",
        description: expected,
        expected,
      };
      assert.equal(evaluateDeterministicAssertion(assertion, baseRun({ terminalActionResult: expected })).outcome, "pass");
    }
  });

  test("confirmation payload matching", () => {
    const assertion: DeterministicAssertionSpec = {
      id: "confirmation",
      requirementId: "P02-R12",
      type: "confirmation_payload_exact",
      severity: "hard",
      description: "confirmation",
      expected: { contact_name: "Jordan Lee", phone: "555-0111" },
    };
    const run = baseRun({
      confirmationRequests: [{ actionName: "send_email", payload: { contact_name: "Jordan Lee", phone: "555-0111" } }],
    });
    assert.equal(evaluateDeterministicAssertion(assertion, run).outcome, "pass");
  });

  test("absent confirmation trace follows onMissing instead of proving no confirmation happened", () => {
    const noConfirmationExpected: DeterministicAssertionSpec = {
      id: "no_confirmation",
      requirementId: "P02-R12",
      type: "confirmation_requested",
      severity: "hard",
      description: "confirmation should not be requested",
      expected: false,
    };
    const unavailableAllowed: DeterministicAssertionSpec = {
      ...noConfirmationExpected,
      id: "maybe_no_confirmation",
      onMissing: "not_applicable",
    };
    assert.equal(evaluateDeterministicAssertion(noConfirmationExpected, baseRun()).outcome, "inconclusive");
    assert.equal(evaluateDeterministicAssertion(unavailableAllowed, baseRun()).outcome, "not_applicable");
    assert.equal(evaluateDeterministicAssertion(noConfirmationExpected, baseRun({ confirmationRequests: [] })).outcome, "pass");
  });

  test("N/A handling and inconclusive missing instrumentation", () => {
    const nA: DeterministicAssertionSpec = {
      id: "maybe_confirmation",
      requirementId: "P02-R12",
      type: "confirmation_payload_exact",
      severity: "hard",
      description: "confirmation may be absent for original apps",
      expected: { phone: "555" },
      onMissing: "not_applicable",
    };
    const inconclusive: DeterministicAssertionSpec = {
      id: "missing_state",
      requirementId: "P02-R01",
      type: "state_equals",
      severity: "hard",
      description: "missing state",
      key: "intent",
      expected: "buy",
    };
    assert.equal(evaluateDeterministicAssertion(nA, baseRun()).outcome, "not_applicable");
    assert.equal(evaluateDeterministicAssertion(inconclusive, baseRun()).outcome, "inconclusive");
  });
});

describe("run validity and aggregation", () => {
  test("inconclusive/invalid handling", () => {
    const run = baseRun({ invalidReason: "wrong_requested_model" });
    const evaluation = evaluateDeterministic("S", [], run);
    assert.equal(evaluation.invalid, true);
    assert.equal(evaluation.invalidReason, "wrong_requested_model");
  });

  test("subject failure is not infrastructure invalidation", () => {
    const valid = classifyRunValidity(
      baseRun({
        requestedModel: { requested: "gemini-3.5-flash" },
        terminalActionResult: "definite_failure",
        runtimeErrors: [{ code: "tool_error", message: "handoff rejected", beforeSubjectBehavior: false }],
      }),
      { expectedRequestedModel: "gemini-3.5-flash" },
    );
    assert.equal(valid.valid, true);

    const invalid = classifyRunValidity(
      baseRun({ requestedModel: { requested: "gemini-2.5" } }),
      { expectedRequestedModel: "gemini-3.5-flash" },
    );
    assert.equal(invalid.valid, false);
    assert.equal(invalid.reason, "wrong_requested_model");
  });

  test("repeated-run aggregation keeps repeats separate from scenarios", () => {
    const hardPass: DeterministicEvaluation = {
      schemaVersion: "deterministic-evaluation-v2",
      scenarioId: "S",
      repeatId: "r1",
      invalid: false,
      results: [
        { id: "a", requirementId: "R", type: "state_equals", severity: "hard", outcome: "pass", passed: true, detail: "ok" },
      ],
      hardFailures: 0,
      softFailures: 0,
    };
    const aggregates = aggregateRepeatedRuns([
      {
        scenarioId: "S",
        implementationId: "I",
        repeatId: "r1",
        rawRun: baseRun({ scenarioId: "S", repeatId: "r1", implementationId: "I", modelCallCount: 3, executorDispatchCount: 1 }),
        deterministic: hardPass,
      },
      {
        scenarioId: "S",
        implementationId: "I",
        repeatId: "r2",
        rawRun: baseRun({ scenarioId: "S", repeatId: "r2", implementationId: "I", invalidReason: "provider_outage_or_transport_failure" }),
      },
    ]);
    assert.equal(aggregates.length, 1);
    assert.equal(aggregates[0]?.repeats, 2);
    assert.equal(aggregates[0]?.runtimeInvalidRate, 0.5);
    assert.equal(aggregates[0]?.deterministicHardRequirementPassRate, 1);
    assert.equal(aggregates[0]?.meanModelCalls, 3);
    assert.equal(aggregates[0]?.meanDispatchCount, 1);
  });

  test("deterministic aggregation is requirement-weighted, not assertion-count weighted", () => {
    const evaluation: DeterministicEvaluation = {
      schemaVersion: "deterministic-evaluation-v2",
      scenarioId: "S",
      repeatId: "r1",
      invalid: false,
      results: [
        { id: "r1-a", requirementId: "R1", type: "state_equals", severity: "hard", outcome: "pass", passed: true, detail: "ok" },
        { id: "r1-b", requirementId: "R1", type: "state_equals", severity: "hard", outcome: "pass", passed: true, detail: "ok" },
        { id: "r2-a", requirementId: "R2", type: "state_equals", severity: "hard", outcome: "hard_fail", passed: false, detail: "bad" },
      ],
      hardFailures: 1,
      softFailures: 0,
    };
    const aggregates = aggregateRepeatedRuns([
      {
        scenarioId: "S",
        implementationId: "I",
        repeatId: "r1",
        rawRun: baseRun({ scenarioId: "S", repeatId: "r1", implementationId: "I" }),
        deterministic: evaluation,
      },
    ]);
    assert.equal(aggregates[0]?.deterministicHardRequirementPassRate, 0.5);
  });
});

describe("judge layers", () => {
  test("pairwise order randomization and reversal are deterministic", () => {
    let leftSeed = "";
    let rightSeed = "";
    for (let i = 0; i < 50; i += 1) {
      const seed = `seed-${i}`;
      if (deterministicPairOrder(seed) === "left_first") leftSeed = seed;
      if (deterministicPairOrder(seed) === "right_first") rightSeed = seed;
    }
    assert.ok(leftSeed);
    assert.ok(rightSeed);
    assert.equal(deterministicPairOrder(leftSeed), "left_first");
    assert.equal(deterministicPairOrder(rightSeed), "right_first");
  });

  test("framework-name stripping from judge prompts", () => {
    const run = baseRun({ implementationId: "hidden-impl", frameworkId: "hidden-fw" });
    const prompt = buildSemanticJudgePrompt({
      scenarioId: "S",
      title: "Grounded answer",
      userTurns: ["What is the price?"],
      authoritativeFacts: ["The property price is $32,000,000."],
      rubric: [{ requirementId: "P02-R06", criterion: "Correct price." }],
      run,
    });
    assert.doesNotThrow(() => assertPromptBlindness(prompt, ["hidden-impl", "hidden-fw"]));
    assert.throws(() => assertPromptBlindness(`${prompt}\nAgent_SDK`, ["hidden-impl"]));

    const pairwise = buildPairwiseJudgePrompt({
      scenarioId: "S",
      title: "Pairwise",
      userTurns: ["Hi"],
      authoritativeFacts: ["Fact."],
      sourceDerivedCriteria: ["Correctness"],
      left: run,
      right: baseRun({ implementationId: "other-impl", frameworkId: "other-fw" }),
      seed: "seed-1",
    });
    assert.doesNotMatch(pairwise.prompt, /hidden-impl|hidden-fw|other-impl|other-fw/);
  });

  test("judge structured-output parse validation", () => {
    const output = parseSemanticJudgeOutput(
      JSON.stringify({
        schemaVersion: "semantic-judge-output-v1",
        promptVersion: "semantic-judge-v1",
        requirementResults: [{ requirementId: "P02-R07", score: 2, confidence: 0.9, reason: "No invention.", citedTurns: [1] }],
        hardSemanticViolations: [],
      }),
      judge,
      semanticValidation(["P02-R07"]),
    );
    assert.equal(output.requirementResults[0]?.score, 2);

    const pairwise = parsePairwiseJudgeOutput(
      JSON.stringify({
        schemaVersion: "pairwise-judge-output-v1",
        promptVersion: "pairwise-judge-v1",
        verdict: "A",
        criteria: PAIRWISE_CRITERIA.map((criterion) => ({ criterion, preference: "A", reason: `${criterion} is better.` })),
        reason: "A is better.",
      }),
      { ...judge, randomizationSeed: "s" },
      "S",
      { A: "left", B: "right" },
      PAIRWISE_CRITERIA,
      { A: "impl-a", B: "impl-b" },
    );
    assert.equal(pairwise.verdict, "A");
    assert.equal(pairwise.implementationAssignment?.A, "impl-a");
  });

  test("semantic judge output must cover expected requirements exactly once", () => {
    const validEnvelope = {
      schemaVersion: "semantic-judge-output-v1",
      promptVersion: "semantic-judge-v1",
      hardSemanticViolations: [],
    };
    assert.throws(() =>
      parseSemanticJudgeOutput(
        JSON.stringify({
          ...validEnvelope,
          requirementResults: [{ requirementId: "P02-R07", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] }],
        }),
        judge,
        semanticValidation(["P02-R07", "P02-R08"]),
      ),
    );
    assert.throws(() =>
      parseSemanticJudgeOutput(
        JSON.stringify({
          ...validEnvelope,
          requirementResults: [
            { requirementId: "P02-R07", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] },
            { requirementId: "P02-R07", score: 1, confidence: 0.9, reason: "dupe", citedTurns: [1] },
          ],
        }),
        judge,
        semanticValidation(["P02-R07"]),
      ),
    );
    assert.throws(() =>
      parseSemanticJudgeOutput(
        JSON.stringify({
          ...validEnvelope,
          requirementResults: [
            { requirementId: "P02-R07", score: 2, confidence: 0.9, reason: "ok", citedTurns: [1] },
            { requirementId: "P02-R99", score: 2, confidence: 0.9, reason: "unknown", citedTurns: [1] },
          ],
        }),
        judge,
        semanticValidation(["P02-R07"]),
      ),
    );
    assert.throws(() =>
      parseSemanticJudgeOutput(
        JSON.stringify({
          ...validEnvelope,
          requirementResults: [{ requirementId: "P02-R07", score: 0, confidence: 0.9, reason: "bad", citedTurns: [1] }],
          hardSemanticViolations: ["P02-R08"],
        }),
        judge,
        semanticValidation(["P02-R07"], ["P02-R07"]),
      ),
    );
  });

  test("pairwise judge output must cover criteria exactly once", () => {
    const envelope = { schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "A", reason: "A" };
    const expected = ["correctness", "truthfulness"] as const;
    assert.throws(() =>
      parsePairwiseJudgeOutput(
        JSON.stringify({ ...envelope, criteria: [{ criterion: "correctness", preference: "A", reason: "ok" }] }),
        { ...judge, randomizationSeed: "s" },
        "S",
        { A: "left", B: "right" },
        expected,
      ),
    );
    assert.throws(() =>
      parsePairwiseJudgeOutput(
        JSON.stringify({
          ...envelope,
          criteria: [
            { criterion: "correctness", preference: "A", reason: "ok" },
            { criterion: "correctness", preference: "A", reason: "dupe" },
            { criterion: "truthfulness", preference: "A", reason: "ok" },
          ],
        }),
        { ...judge, randomizationSeed: "s" },
        "S",
        { A: "left", B: "right" },
        expected,
      ),
    );
    assert.throws(() =>
      parsePairwiseJudgeOutput(
        JSON.stringify({
          ...envelope,
          criteria: [
            { criterion: "correctness", preference: "A", reason: "ok" },
            { criterion: "grounding", preference: "A", reason: "unknown for this comparison" },
            { criterion: "truthfulness", preference: "A", reason: "ok" },
          ],
        }),
        { ...judge, randomizationSeed: "s" },
        "S",
        { A: "left", B: "right" },
        expected,
      ),
    );
  });

  test("pairwise win/tie/loss aggregation uses stored implementation mapping", () => {
    const outputs: PairwiseJudgeOutput[] = [
      {
        schemaVersion: "pairwise-judge-output-v1",
        promptVersion: "pairwise-judge-v1",
        judge: { ...judge, randomizationSeed: "s1" },
        scenarioId: "S",
        assignment: { A: "left", B: "right" },
        implementationAssignment: { A: "impl-a", B: "impl-b" },
        verdict: "A",
        criteria: PAIRWISE_CRITERIA.map((criterion) => ({ criterion, preference: "A" as const, reason: "A" })),
        reason: "A",
      },
      {
        schemaVersion: "pairwise-judge-output-v1",
        promptVersion: "pairwise-judge-v1",
        judge: { ...judge, randomizationSeed: "s2" },
        scenarioId: "S",
        assignment: { A: "right", B: "left" },
        implementationAssignment: { A: "impl-b", B: "impl-a" },
        verdict: "tie",
        criteria: PAIRWISE_CRITERIA.map((criterion) => ({ criterion, preference: "tie" as const, reason: "tie" })),
        reason: "tie",
      },
    ];
    const aggregates = aggregatePairwiseOutcomes(outputs);
    assert.deepEqual(aggregates.find((item) => item.implementationId === "impl-a"), {
      implementationId: "impl-a",
      wins: 1,
      ties: 1,
      losses: 0,
      bothBad: 0,
    });
    assert.deepEqual(aggregates.find((item) => item.implementationId === "impl-b"), {
      implementationId: "impl-b",
      wins: 0,
      ties: 1,
      losses: 1,
      bothBad: 0,
    });
  });

  test("malformed judge output handling", () => {
    assert.throws(() =>
      parseSemanticJudgeOutput("not-json", {
        provider: "offline",
        requestedModel: "judge",
        temperature: 0,
        timestamp: "2026-08-22T00:00:00.000Z",
      }, semanticValidation(["P02-R07"])),
    );
    assert.throws(() =>
      parsePairwiseJudgeOutput(
        JSON.stringify({ schemaVersion: "pairwise-judge-output-v1", promptVersion: "pairwise-judge-v1", verdict: "C", criteria: [], reason: "" }),
        { ...judge, randomizationSeed: "s" },
        "S",
        { A: "left", B: "right" },
        PAIRWISE_CRITERIA,
      ),
    );
  });

});

describe("scenario assets", () => {
  test("requirement registers have source provenance and scenario coverage", () => {
    for (const [requirements, scenarios] of [
      [P01_REQUIREMENTS, P01_SCENARIOS],
      [P02_REQUIREMENTS, P02_SCENARIOS],
    ] as const) {
      const requirementIds = new Set(requirements.map((requirement) => requirement.id));
      for (const requirement of requirements) {
        assert.ok(requirement.sourceProvenance.length > 0, `${requirement.id} missing source provenance`);
        for (const provenance of requirement.sourceProvenance) {
          assert.ok(provenance.repository.name, `${requirement.id} missing source repository name`);
          assert.match(provenance.repository.commit, /^[0-9a-f]{40}$|^frozen-user-request-2026-08-22$/, `${requirement.id} missing frozen commit`);
          assert.ok(provenance.path.length > 0, `${requirement.id} missing source path`);
          assert.doesNotMatch(provenance.path, /^(Craig-Hempcrete-DemoSitee|EstatePro)\//, `${requirement.id} path should be repository-relative`);
        }
        assert.ok(requirement.sourceEvidence.length > 0, `${requirement.id} missing source evidence`);
      }
      for (const scenario of scenarios) {
        assert.ok(scenario.sourceProvenance.length > 0, `${scenario.id} missing source provenance`);
        for (const provenance of scenario.sourceProvenance) {
          assert.ok(provenance.repository.name, `${scenario.id} missing source repository name`);
          assert.match(provenance.repository.commit, /^[0-9a-f]{40}$/, `${scenario.id} missing frozen commit`);
          assert.ok(provenance.path.length > 0, `${scenario.id} missing source path`);
          assert.doesNotMatch(provenance.path, /^(Craig-Hempcrete-DemoSitee|EstatePro)\//, `${scenario.id} path should be repository-relative`);
        }
        assert.ok(scenario.expectedDeterministicAssertions.length > 0, `${scenario.id} missing deterministic assertions`);
        assert.ok(scenario.semanticRubric.length > 0, `${scenario.id} missing semantic rubric`);
        for (const requirementId of scenario.requirementIds) assert.ok(requirementIds.has(requirementId), `${scenario.id} references unknown ${requirementId}`);
        for (const assertion of scenario.expectedDeterministicAssertions) assert.ok(requirementIds.has(assertion.requirementId), `${scenario.id}/${assertion.id} references unknown ${assertion.requirementId}`);
        const scenarioRequirementIds = new Set(scenario.requirementIds);
        for (const assertion of scenario.expectedDeterministicAssertions) {
          if (assertion.type !== "runtime_error_absent") {
            assert.ok(scenarioRequirementIds.has(assertion.requirementId), `${scenario.id}/${assertion.id} missing from scenario requirementIds`);
          }
        }
        for (const item of scenario.semanticRubric) {
          assert.ok(scenarioRequirementIds.has(item.requirementId), `${scenario.id}/${item.id} missing from scenario requirementIds`);
        }
        for (const requirementId of [...scenario.severity.hard, ...scenario.severity.soft]) {
          assert.ok(scenarioRequirementIds.has(requirementId), `${scenario.id}/severity ${requirementId} missing from scenario requirementIds`);
        }
      }
    }
  });

  test("every requirement intended for evaluation has scenario coverage or an explicit conflict note", () => {
    const p01Covered = new Set(P01_SCENARIOS.flatMap((scenario) => scenario.requirementIds));
    const p02Covered = new Set(P02_SCENARIOS.flatMap((scenario) => scenario.requirementIds));
    assert.deepEqual(P01_REQUIREMENTS.filter((requirement) => !p01Covered.has(requirement.id)).map((requirement) => requirement.id), []);
    assert.deepEqual(P02_REQUIREMENTS.filter((requirement) => !p02Covered.has(requirement.id)).map((requirement) => requirement.id), []);
  });

  test("calibration fixtures reference the intended requirement ids", () => {
    const requirementIds = new Set([...P01_REQUIREMENTS, ...P02_REQUIREMENTS].map((requirement) => requirement.id));
    for (const fixture of CALIBRATION_FIXTURES) {
      for (const requirementId of fixture.requirementIds) assert.ok(requirementIds.has(requirementId), `${fixture.id} references unknown ${requirementId}`);
    }
    assert.deepEqual(
      CALIBRATION_FIXTURES.filter((fixture) => fixture.label === "correction_honored" || fixture.label === "correction_ignored").map((fixture) => fixture.requirementIds),
      [["P02-R10"], ["P02-R10"]],
    );
  });

});
