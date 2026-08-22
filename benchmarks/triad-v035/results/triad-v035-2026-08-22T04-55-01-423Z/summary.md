# Agent_SDK v0.35 triad benchmark summary

**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**

## Executive result

All accepted agent-side requests used `gemini-3.5-flash-lite`; no fallback/degraded turn was graded as semantic evidence and no primary scenario was infrastructure-inconclusive. The primary comparison completed 21 P01 and 15 P02 scenarios.

Arrokothi did not complete a canonical v0.35 scenario cleanly: all 36 primary scenarios ended in the same `FRAMEWORK_GAP` (`Gemini 400 INVALID_ARGUMENT`) during the Strands loop. This is a systematic regression, not a quota event. Because the framework failed before most canonical assertions were fully judgeable, most Arrokothi pairwise verdicts are correctly inconclusive even though its absolute outcome is hard failure. The exact rejected request field is not exposed by the provider response and remains unresolved.

## P01 matrix

| Scenario | Bespoke | Agenerateor | Arrokothi |
|---|---:|---:|---:|
| CRAIG-S01 | hard_fail | pass | hard_fail |
| CRAIG-S02 | soft_fail | pass | hard_fail |
| CRAIG-S03 | hard_fail | pass | hard_fail |
| CRAIG-S04 | pass | pass | hard_fail |
| CRAIG-S05 | soft_fail | soft_fail | hard_fail |
| CRAIG-S06 | hard_fail | pass | hard_fail |
| CRAIG-S07 | hard_fail | pass | hard_fail |
| CRAIG-S08 | pass | pass | hard_fail |
| CRAIG-S09 | soft_fail | pass | hard_fail |
| CRAIG-S10 | pass | pass | hard_fail |
| CRAIG-S11 | hard_fail | pass | hard_fail |
| CRAIG-S12 | hard_fail | pass | hard_fail |
| CRAIG-S13 | hard_fail | pass | hard_fail |
| CRAIG-S14 | pass | pass | hard_fail |
| CRAIG-S15 | pass | pass | hard_fail |
| CRAIG-S16 | hard_fail | pass | hard_fail |
| CRAIG-S17 | hard_fail | pass | hard_fail |
| CRAIG-S19 | pass | pass | hard_fail |
| CRAIG-S20 | soft_fail | pass | hard_fail |
| CRAIG-S21 | pass | pass | hard_fail |
| CRAIG-S22 | pass | pass | hard_fail |

### P01 counts

```json
{
  "project": "p01",
  "absolute": {
    "bespoke": {
      "pass": 8,
      "soft_fail": 4,
      "hard_fail": 9,
      "inconclusive": 0
    },
    "agenerateor": {
      "pass": 20,
      "soft_fail": 1,
      "hard_fail": 0,
      "inconclusive": 0
    },
    "arrokothi": {
      "pass": 0,
      "soft_fail": 0,
      "hard_fail": 21,
      "inconclusive": 0
    }
  },
  "pairwise": {
    "arrokothi_vs_bespoke": {
      "inconclusive": 20,
      "arrokothi_better": 1
    },
    "arrokothi_vs_agenerateor": {
      "inconclusive": 20,
      "agenerateor_better": 1
    },
    "agenerateor_vs_bespoke": {
      "agenerateor_better": 13,
      "tie": 8
    }
  },
  "frameworkFailures": [
    {
      "scenarioId": "CRAIG-S01",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S02",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S03",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S04",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S05",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S06",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S07",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S08",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S09",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S10",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S11",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S12",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S13",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S14",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S15",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S16",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S17",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S19",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S20",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S21",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "CRAIG-S22",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    }
  ]
}
```

## P02 matrix

| Scenario | Bespoke | Agenerateor | Arrokothi |
|---|---:|---:|---:|
| ESTATE-S01 | pass | pass | hard_fail |
| ESTATE-S02 | hard_fail | pass | hard_fail |
| ESTATE-S03 | hard_fail | pass | hard_fail |
| ESTATE-S07 | pass | pass | hard_fail |
| ESTATE-S08 | pass | pass | hard_fail |
| ESTATE-S09 | hard_fail | hard_fail | hard_fail |
| ESTATE-S10 | hard_fail | hard_fail | hard_fail |
| ESTATE-S11 | pass | pass | hard_fail |
| ESTATE-S12 | pass | pass | hard_fail |
| ESTATE-S13 | pass | pass | hard_fail |
| ESTATE-S14 | hard_fail | hard_fail | hard_fail |
| ESTATE-S15 | pass | pass | hard_fail |
| ESTATE-S16 | hard_fail | hard_fail | hard_fail |
| ESTATE-S17 | pass | pass | hard_fail |
| ESTATE-S19 | hard_fail | pass | hard_fail |

### P02 counts

```json
{
  "project": "p02",
  "absolute": {
    "bespoke": {
      "pass": 8,
      "soft_fail": 0,
      "hard_fail": 7,
      "inconclusive": 0
    },
    "agenerateor": {
      "pass": 11,
      "soft_fail": 0,
      "hard_fail": 4,
      "inconclusive": 0
    },
    "arrokothi": {
      "pass": 0,
      "soft_fail": 0,
      "hard_fail": 15,
      "inconclusive": 0
    }
  },
  "pairwise": {
    "arrokothi_vs_bespoke": {
      "inconclusive": 15
    },
    "arrokothi_vs_agenerateor": {
      "inconclusive": 15
    },
    "agenerateor_vs_bespoke": {
      "tie": 8,
      "agenerateor_better": 4,
      "mixed": 1,
      "tie_both_fail": 2
    }
  },
  "frameworkFailures": [
    {
      "scenarioId": "ESTATE-S01",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S02",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S03",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S07",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S08",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S09",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S10",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S11",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S12",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S13",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S14",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S15",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S16",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S17",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    },
    {
      "scenarioId": "ESTATE-S19",
      "code": "PROVIDER_HTTP_400",
      "message": "Gemini 400: {\n  \"error\": {\n    \"code\": 400,\n    \"message\": \"Request contains an invalid argument.\",\n    \"status\": \"INVALID_ARGUMENT\"\n  }\n}\n",
      "turnIndex": 0,
      "classification": "FRAMEWORK_GAP"
    }
  ]
}
```

## Efficiency

### P01

```json
{
  "bespoke": {
    "attemptedUserTurns": 37,
    "totalLogicalModelCalls": 37,
    "meanLogicalCallsPerAttemptedTurn": 1,
    "medianLogicalCallsPerAttemptedTurn": 1,
    "minLogicalCallsPerAttemptedTurn": 1,
    "maxLogicalCallsPerAttemptedTurn": 1,
    "callsPerTurnHistogram": {
      "1": 37,
      "2": 0,
      "3": 0,
      "4+": 0
    },
    "physicalAttempts": 37,
    "physicalAttemptCoverage": "complete",
    "totalInputTokens": null,
    "totalOutputTokens": null,
    "tokenCoverageCalls": 0,
    "p50ObservedTurnLatencyMs": 1236,
    "p95ObservedTurnLatencyMs": 1822,
    "latencyCoverageTurns": 37
  },
  "agenerateor": {
    "attemptedUserTurns": 37,
    "totalLogicalModelCalls": 75,
    "meanLogicalCallsPerAttemptedTurn": 2.027027027027027,
    "medianLogicalCallsPerAttemptedTurn": 2,
    "minLogicalCallsPerAttemptedTurn": 2,
    "maxLogicalCallsPerAttemptedTurn": 3,
    "callsPerTurnHistogram": {
      "1": 0,
      "2": 36,
      "3": 1,
      "4+": 0
    },
    "physicalAttempts": 75,
    "physicalAttemptCoverage": "complete",
    "totalInputTokens": null,
    "totalOutputTokens": null,
    "tokenCoverageCalls": 0,
    "p50ObservedTurnLatencyMs": 2262,
    "p95ObservedTurnLatencyMs": 3300,
    "latencyCoverageTurns": 37
  },
  "arrokothi": {
    "attemptedUserTurns": 21,
    "totalLogicalModelCalls": 68,
    "meanLogicalCallsPerAttemptedTurn": 3.238095238095238,
    "medianLogicalCallsPerAttemptedTurn": 3,
    "minLogicalCallsPerAttemptedTurn": 2,
    "maxLogicalCallsPerAttemptedTurn": 5,
    "callsPerTurnHistogram": {
      "1": 0,
      "2": 5,
      "3": 10,
      "4+": 6
    },
    "physicalAttempts": null,
    "physicalAttemptCoverage": "unknown for 21 scenario(s)",
    "totalInputTokens": 38966,
    "totalOutputTokens": 5643,
    "tokenCoverageCalls": 47,
    "p50ObservedTurnLatencyMs": null,
    "p95ObservedTurnLatencyMs": null,
    "latencyCoverageTurns": 0
  }
}
```

### P02

```json
{
  "bespoke": {
    "attemptedUserTurns": 31,
    "totalLogicalModelCalls": 33,
    "meanLogicalCallsPerAttemptedTurn": 1.064516129032258,
    "medianLogicalCallsPerAttemptedTurn": 1,
    "minLogicalCallsPerAttemptedTurn": 1,
    "maxLogicalCallsPerAttemptedTurn": 2,
    "callsPerTurnHistogram": {
      "1": 29,
      "2": 2,
      "3": 0,
      "4+": 0
    },
    "physicalAttempts": 33,
    "physicalAttemptCoverage": "complete",
    "totalInputTokens": null,
    "totalOutputTokens": null,
    "tokenCoverageCalls": 0,
    "p50ObservedTurnLatencyMs": 2075,
    "p95ObservedTurnLatencyMs": 6562,
    "latencyCoverageTurns": 15
  },
  "agenerateor": {
    "attemptedUserTurns": 31,
    "totalLogicalModelCalls": 63,
    "meanLogicalCallsPerAttemptedTurn": 2.032258064516129,
    "medianLogicalCallsPerAttemptedTurn": 2,
    "minLogicalCallsPerAttemptedTurn": 2,
    "maxLogicalCallsPerAttemptedTurn": 3,
    "callsPerTurnHistogram": {
      "1": 0,
      "2": 30,
      "3": 1,
      "4+": 0
    },
    "physicalAttempts": 63,
    "physicalAttemptCoverage": "complete",
    "totalInputTokens": null,
    "totalOutputTokens": null,
    "tokenCoverageCalls": 0,
    "p50ObservedTurnLatencyMs": 2369,
    "p95ObservedTurnLatencyMs": 2994,
    "latencyCoverageTurns": 31
  },
  "arrokothi": {
    "attemptedUserTurns": 15,
    "totalLogicalModelCalls": 51,
    "meanLogicalCallsPerAttemptedTurn": 3.4,
    "medianLogicalCallsPerAttemptedTurn": 3,
    "minLogicalCallsPerAttemptedTurn": 3,
    "maxLogicalCallsPerAttemptedTurn": 5,
    "callsPerTurnHistogram": {
      "1": 0,
      "2": 0,
      "3": 12,
      "4+": 3
    },
    "physicalAttempts": null,
    "physicalAttemptCoverage": "unknown for 15 scenario(s)",
    "totalInputTokens": 80895,
    "totalOutputTokens": 2538,
    "tokenCoverageCalls": 36,
    "p50ObservedTurnLatencyMs": null,
    "p95ObservedTurnLatencyMs": null,
    "latencyCoverageTurns": 0
  }
}
```

Efficiency is a separate axis and is not folded into a winner score. Latency percentiles cover only turns for which the native boundary exposed timing. Physical attempts remain null where Strands does not expose transport retries.

## Stability

| Project | Scenario | Bespoke | Agenerateor | Arrokothi |
|---|---|---:|---:|---:|
| P01 | CRAIG-S01 | hard_fail | pass | hard_fail |
| P01 | CRAIG-S01 | hard_fail | pass | hard_fail |
| P02 | ESTATE-S16 | hard_fail | pass | hard_fail |
| P02 | ESTATE-S16 | hard_fail | pass | hard_fail |
| P02 | ESTATE-S17 | hard_fail | pass | hard_fail |
| P02 | ESTATE-S17 | pass | pass | hard_fail |
| P02 | ESTATE-S19 | hard_fail | pass | hard_fail |
| P02 | ESTATE-S19 | hard_fail | pass | hard_fail |

The two extra CRAIG-S01 samples reproduced the primary outcome exactly. Arrokothi reproduced the framework failure in every stability sample. Estate handoff samples showed model variance: Agenerateor's ESTATE-S16 primary hard failure became pass in both repeats; bespoke ESTATE-S17 varied between pass and hard fail. ESTATE-S19 reproduced bespoke hard fail / Agenerateor pass / Arrokothi hard fail.

## Required interpretation

1. **Controlled model:** yes—every requested and observed model was `gemini-3.5-flash-lite`; no mismatch was recorded.
2. **Fallback/degradation:** no fallback turn was accepted or semantically graded.
3. **Infrastructure:** no primary result was made inconclusive by 429, DNS, timeout, or 5xx. The Arrokothi 400 is a framework/configuration failure, not infrastructure.
4. **P01:** bespoke {"pass":8,"soft_fail":4,"hard_fail":9,"inconclusive":0}; Agenerateor {"pass":20,"soft_fail":1,"hard_fail":0,"inconclusive":0}; Arrokothi {"pass":0,"soft_fail":0,"hard_fail":21,"inconclusive":0}.
5. **P02:** bespoke {"pass":8,"soft_fail":0,"hard_fail":7,"inconclusive":0}; Agenerateor {"pass":11,"soft_fail":0,"hard_fail":4,"inconclusive":0}; Arrokothi {"pass":0,"soft_fail":0,"hard_fail":15,"inconclusive":0}.
6. **Arrokothi vs Agenerateor:** P01 {"inconclusive":20,"agenerateor_better":1}; P02 {"inconclusive":15}. Most cells are inconclusive because the Arrokothi framework failure prevents shared assertion judgment.
7. **Arrokothi vs bespoke:** P01 {"inconclusive":20,"arrokothi_better":1}; P02 {"inconclusive":15}; same observability limitation.
8. **Agenerateor vs bespoke:** P01 {"agenerateor_better":13,"tie":8}; P02 {"tie":8,"agenerateor_better":4,"mixed":1,"tie_both_fail":2}.
9. **Architecture vs stochasticity:** the 36/36 primary plus 8/8 stability Arrokothi invalid-request pattern is systematic framework behavior. Estate handoff outcome changes across repetitions are model stochasticity interacting with prompt/stage extraction. The likely lower-level Strands/Gemini request-history incompatibility is an inference, not proven by the generic provider error.
10. **Calls per turn:** exact mean/median/histograms are in each project's `efficiency.json`; Arrokothi uses more calls before failure on many turns.
11. **Tokens/latency:** available Strands tokens and partial native latency are reported; unavailable values are null rather than fabricated.
12. **Known gaps fixed:** none can be established for Arrokothi from this run because no canonical scenario completed without the framework failure, even where a pre-failure reply looked semantically useful.
13. **Regressions:** canonical Strands execution is unable to complete these Gemini tool/function-history turns cleanly, producing a hard regression across P01/P02.
14. **Unresolved:** the exact incompatible request field/history representation inside the frozen Strands/Google boundary remains unresolved by design; repairing it would require a new benchmark after a subject version change.
15. **Dataset role:** Agent_SDK was redesigned using lessons from P01/P02, so these results are retrospective development-set regression evidence. P03/P04 remain the prospective held-out tests.
