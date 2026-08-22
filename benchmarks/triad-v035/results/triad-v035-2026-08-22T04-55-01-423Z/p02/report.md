# P02 controlled triad report

**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**

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

## Absolute outcomes

```json
{
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
}
```

## Pairwise shared-assertion verdicts

```json
{
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
}
```

Pairwise verdicts use only assertions applicable and judgeable on both sides. Arrokothi's canonical loop failed before a fully judgeable run on most scenarios; those pairwise cells are therefore inconclusive even though its absolute result is a hard framework failure.

## Efficiency

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

Unknown physical-attempt and token fields remain null. Arrokothi token coverage comes from completed Strands model-call events; the final rejected provider request exposes no usage.

## Failure classification

Arrokothi reproduced `FRAMEWORK_GAP` in 15/15 primary scenarios: Gemini returned `INVALID_ARGUMENT` during canonical Strands execution, often after completed model/tool iterations. The provider did not expose the exact rejected request field, so the lower-level request-shape cause remains an inference rather than a proven fact. Earlier successful calls, tool results, replies, and token usage were preserved. The frozen framework was not repaired or tuned during measurement.
