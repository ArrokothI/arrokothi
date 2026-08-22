# Agent_SDK v0.35 triad benchmark summary

**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**

Run: `triad-v035-2026-08-22T02-34-50-285Z`
Requested model: `gemini-3.5-flash-lite`

## P01

| Scenario | Bespoke | Agenerateor | Arrokothi |
|---|---:|---:|---:|
| CRAIG-S01 | hard_fail | pass | inconclusive |

### Efficiency

```json
{
  "bespoke": {
    "scenarios": 1,
    "turns": 1,
    "outcomes": {
      "pass": 0,
      "soft_fail": 0,
      "hard_fail": 1,
      "inconclusive": 0
    },
    "logicalModelCalls": 1,
    "physicalAttempts": 1,
    "inputTokens": 0,
    "outputTokens": 0,
    "tokenCoverageCalls": 0,
    "meanLogicalCallsPerTurn": 1
  },
  "agenerateor": {
    "scenarios": 1,
    "turns": 1,
    "outcomes": {
      "pass": 1,
      "soft_fail": 0,
      "hard_fail": 0,
      "inconclusive": 0
    },
    "logicalModelCalls": 2,
    "physicalAttempts": 2,
    "inputTokens": 0,
    "outputTokens": 0,
    "tokenCoverageCalls": 0,
    "meanLogicalCallsPerTurn": 2
  },
  "arrokothi": {
    "scenarios": 1,
    "turns": 1,
    "outcomes": {
      "pass": 0,
      "soft_fail": 0,
      "hard_fail": 0,
      "inconclusive": 1
    },
    "logicalModelCalls": 1,
    "physicalAttempts": 0,
    "inputTokens": 0,
    "outputTokens": 0,
    "tokenCoverageCalls": 0,
    "meanLogicalCallsPerTurn": 1
  }
}
```

## Integrity answers

- All requested/observed agent models matched `gemini-3.5-flash-lite`: true.
- Degraded/fallback or infrastructure-inconclusive records: 1.
- Credential values were pairwise distinct: true.
- Efficiency is reported separately and is not folded into semantic outcomes.
- P01/P02 are development-set regression evidence because Agent_SDK was redesigned using lessons from these cases; P03/P04 remain the prospective tests.

### Infrastructure records

```json
[
  {
    "scenario": "CRAIG-S01",
    "system": "arrokothi",
    "error": "infrastructure failure: PROVIDER_AUTH_FAILED: Gemini 403: {\n  \"error\": {\n    \"code\": 403,\n    \"message\": \"Your project has been denied access. Please contact support.\",\n    \"status\": \"PERMISSION_DENIED\"\n  }\n}\n"
  }
]
```
