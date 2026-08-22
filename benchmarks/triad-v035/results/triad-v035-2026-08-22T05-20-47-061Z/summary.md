# Agent_SDK v0.35 triad benchmark summary

**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**

Run: `triad-v035-2026-08-22T05-20-47-061Z`
Requested model: `gemini-3.5-flash-lite`

## P02

| Scenario | Bespoke | Agenerateor | Arrokothi |
|---|---:|---:|---:|
| ESTATE-S17 | pass | pass | hard_fail |

### Efficiency

```json
{
  "bespoke": {
    "scenarios": 1,
    "turns": 5,
    "outcomes": {
      "pass": 1,
      "soft_fail": 0,
      "hard_fail": 0,
      "inconclusive": 0
    },
    "logicalModelCalls": 6,
    "physicalAttemptsKnown": 6,
    "physicalAttemptsUnknownScenarios": 0,
    "inputTokens": 0,
    "outputTokens": 0,
    "tokenCoverageCalls": 0,
    "physicalAttempts": 6,
    "meanLogicalCallsPerTurn": 1.2
  },
  "agenerateor": {
    "scenarios": 1,
    "turns": 5,
    "outcomes": {
      "pass": 1,
      "soft_fail": 0,
      "hard_fail": 0,
      "inconclusive": 0
    },
    "logicalModelCalls": 10,
    "physicalAttemptsKnown": 10,
    "physicalAttemptsUnknownScenarios": 0,
    "inputTokens": 0,
    "outputTokens": 0,
    "tokenCoverageCalls": 0,
    "physicalAttempts": 10,
    "meanLogicalCallsPerTurn": 2
  },
  "arrokothi": {
    "scenarios": 1,
    "turns": 5,
    "outcomes": {
      "pass": 0,
      "soft_fail": 0,
      "hard_fail": 1,
      "inconclusive": 0
    },
    "logicalModelCalls": 4,
    "physicalAttemptsKnown": 0,
    "physicalAttemptsUnknownScenarios": 1,
    "inputTokens": 6761,
    "outputTokens": 225,
    "tokenCoverageCalls": 3,
    "physicalAttempts": null,
    "meanLogicalCallsPerTurn": 0.8
  }
}
```

## Integrity answers

- All requested/observed agent models matched `gemini-3.5-flash-lite`: true.
- Degraded/fallback or infrastructure-inconclusive records: 0.
- Credential values were pairwise distinct: true.
- Efficiency is reported separately and is not folded into semantic outcomes.
- P01/P02 are development-set regression evidence because Agent_SDK was redesigned using lessons from these cases; P03/P04 remain the prospective tests.
