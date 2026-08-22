# P01 controlled triad report

**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**

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

## Absolute outcomes

```json
{
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
}
```

## Pairwise shared-assertion verdicts

```json
{
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
}
```

Pairwise verdicts use only assertions applicable and judgeable on both sides. Arrokothi's canonical loop failed before a fully judgeable run on most scenarios; those pairwise cells are therefore inconclusive even though its absolute result is a hard framework failure.

## Efficiency

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

Unknown physical-attempt and token fields remain null. Arrokothi token coverage comes from completed Strands model-call events; the final rejected provider request exposes no usage.

## Failure classification

Arrokothi reproduced `FRAMEWORK_GAP` in 21/21 primary scenarios: Gemini returned `INVALID_ARGUMENT` during canonical Strands execution, often after completed model/tool iterations. The provider did not expose the exact rejected request field, so the lower-level request-shape cause remains an inference rather than a proven fact. Earlier successful calls, tool results, replies, and token usage were preserved. The frozen framework was not repaired or tuned during measurement.
