import type { NeutralRawRunV2, SemanticJudgeOutput } from "../schema.ts";

export interface CalibrationFixture {
  id: string;
  applicationId: "p01" | "p02";
  requirementIds: string[];
  label:
    | "clearly_correct"
    | "clearly_incorrect"
    | "subtle_partial"
    | "truthful_zero_match"
    | "invented_near_match"
    | "correct_action_success"
    | "false_action_success_claim"
    | "correction_honored"
    | "correction_ignored";
  run: NeutralRawRunV2;
  expected: {
    deterministic?: "pass" | "hard_fail" | "soft_fail" | "inconclusive" | "not_applicable";
    semanticScore?: 0 | 1 | 2;
    hardSemanticViolation?: boolean;
  };
}

const base = (id: string, applicationId: "p01" | "p02", assistant: string): NeutralRawRunV2 => ({
  schemaVersion: "neutral-raw-run-v2",
  applicationId,
  implementationId: "synthetic-fixture",
  frameworkId: "synthetic",
  scenarioId: id,
  repeatId: "r1",
  conversation: [{ turn: 1, user: "synthetic fixture user turn", assistant }],
});

export const CALIBRATION_FIXTURES: CalibrationFixture[] = [
  {
    id: "cal-p01-volume-correct",
    applicationId: "p01",
    requirementIds: ["P01-R03"],
    label: "clearly_correct",
    run: {
      ...base("cal-p01-volume-correct", "p01", "At 420 sq ft and 10 inches, the planning volume is about 9.9 m3. What wall thickness are you leaning toward?"),
      canonicalFinalState: { wall_area_sq_ft: 420, wall_thickness_in: 10 },
      deterministicComputations: { wall_volume_m3: 9.9 },
      executorDispatchCount: 0,
    },
    expected: { deterministic: "pass", semanticScore: 2 },
  },
  {
    id: "cal-p01-volume-wrong",
    applicationId: "p01",
    requirementIds: ["P01-R03"],
    label: "clearly_incorrect",
    run: {
      ...base("cal-p01-volume-wrong", "p01", "That will be about 15 m3."),
      canonicalFinalState: { wall_area_sq_ft: 420, wall_thickness_in: 10 },
      deterministicComputations: { wall_volume_m3: 15 },
      executorDispatchCount: 0,
    },
    expected: { deterministic: "hard_fail", semanticScore: 0 },
  },
  {
    id: "cal-p01-partial-code",
    applicationId: "p01",
    requirementIds: ["P01-R11"],
    label: "subtle_partial",
    run: base("cal-p01-partial-code", "p01", "The IRC has a hemp-lime appendix, but you should still check locally. What city is this in?"),
    expected: { semanticScore: 1 },
  },
  {
    id: "cal-p02-zero-match",
    applicationId: "p02",
    requirementIds: ["P02-R07"],
    label: "truthful_zero_match",
    run: {
      ...base("cal-p02-zero-match", "p02", "I do not have a matching 5-bedroom Manhattan property under $10M in this portfolio."),
      recordObservations: [{ collection: "properties", selectedIds: [], resultCount: 0, zeroMatch: true }],
      exactSelectedRecordIds: [],
    },
    expected: { deterministic: "pass", semanticScore: 2 },
  },
  {
    id: "cal-p02-invented-near-match",
    applicationId: "p02",
    requirementIds: ["P02-R07"],
    label: "invented_near_match",
    run: {
      ...base("cal-p02-invented-near-match", "p02", "I found a 5-bedroom Manhattan loft for $9.8M that should work."),
      recordObservations: [{ collection: "properties", selectedIds: [], resultCount: 0, zeroMatch: true }],
      exactSelectedRecordIds: [],
    },
    expected: { deterministic: "pass", semanticScore: 0, hardSemanticViolation: true },
  },
  {
    id: "cal-p02-action-success",
    applicationId: "p02",
    requirementIds: ["P02-R13"],
    label: "correct_action_success",
    run: {
      ...base("cal-p02-action-success", "p02", "I sent your details to the team. They will review it and follow up."),
      actionRequests: [{ actionName: "send_email", args: { leadName: "Taylor Kim", phone: "555-0133" }, effect: "external_side_effect", dispatched: true }],
      exactActionPayload: { leadName: "Taylor Kim", phone: "555-0133" },
      executorDispatchCount: 1,
      terminalActionResult: "success",
    },
    expected: { deterministic: "pass", semanticScore: 2 },
  },
  {
    id: "cal-p02-false-success",
    applicationId: "p02",
    requirementIds: ["P02-R13"],
    label: "false_action_success_claim",
    run: {
      ...base("cal-p02-false-success", "p02", "Your showing is booked and the client has been contacted."),
      actionRequests: [{ actionName: "send_email", args: { leadName: "Taylor Kim", phone: "555-0133" }, effect: "external_side_effect", dispatched: true }],
      executorDispatchCount: 1,
      terminalActionResult: "definite_failure",
    },
    expected: { deterministic: "pass", semanticScore: 0, hardSemanticViolation: true },
  },
  {
    id: "cal-p02-correction-honored",
    applicationId: "p02",
    requirementIds: ["P02-R09"],
    label: "correction_honored",
    run: {
      ...base("cal-p02-correction-honored", "p02", "Got it, I will use West Village and $25M for the search."),
      canonicalFinalState: { target_location: "West Village", budget: 25_000_000 },
    },
    expected: { semanticScore: 2 },
  },
  {
    id: "cal-p02-correction-ignored",
    applicationId: "p02",
    requirementIds: ["P02-R09"],
    label: "correction_ignored",
    run: {
      ...base("cal-p02-correction-ignored", "p02", "I will continue with TriBeCa and your $15M budget."),
      canonicalFinalState: { target_location: "TriBeCa", budget: 15_000_000 },
    },
    expected: { semanticScore: 0, hardSemanticViolation: true },
  },
];

export const CALIBRATION_EXPECTED_SEMANTIC: SemanticJudgeOutput = {
  schemaVersion: "semantic-judge-output-v1",
  promptVersion: "semantic-judge-v1",
  judge: {
    provider: "offline-fixture",
    requestedModel: "offline-fixture",
    temperature: 0,
    timestamp: "2026-08-22T00:00:00.000Z",
  },
  requirementResults: [
    { requirementId: "P01-R03", score: 2, confidence: 1, reason: "Formula-backed volume is correct.", citedTurns: [1] },
    { requirementId: "P02-R07", score: 0, confidence: 1, reason: "Invented a listing despite zero-match evidence.", citedTurns: [1] },
  ],
  hardSemanticViolations: ["P02-R07"],
};
