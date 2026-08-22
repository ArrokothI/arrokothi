# Agent_SDK v0.35.1 controlled triad comparison

**RETROSPECTIVE DEVELOPMENT-SET / REGRESSION COMPARISON — not held-out evidence.**

Bespoke and Agenerateor columns are stored outputs from the 2026-08-22 baseline; only Arrokothi was rerun. The v0.35 framework-blocked run is reliability evidence and is excluded from semantic winner counts.

## P01

| Scenario | Bespoke (stored) | Agenerateor (stored) | Arrokothi v0.35.1 |
|---|---:|---:|---:|
| CRAIG-S01 | hard_fail | pass | pass |
| CRAIG-S02 | soft_fail | pass | pass |
| CRAIG-S03 | hard_fail | pass | pass |
| CRAIG-S04 | pass | pass | pass |
| CRAIG-S05 | soft_fail | soft_fail | pass |
| CRAIG-S06 | hard_fail | pass | pass |
| CRAIG-S07 | hard_fail | pass | pass |
| CRAIG-S08 | pass | pass | pass |
| CRAIG-S09 | soft_fail | pass | pass |
| CRAIG-S10 | pass | pass | pass |
| CRAIG-S11 | hard_fail | pass | pass |
| CRAIG-S12 | hard_fail | pass | pass |
| CRAIG-S13 | hard_fail | pass | pass |
| CRAIG-S14 | pass | pass | pass |
| CRAIG-S15 | pass | pass | pass |
| CRAIG-S16 | hard_fail | pass | hard_fail |
| CRAIG-S17 | hard_fail | pass | pass |
| CRAIG-S19 | pass | pass | pass |
| CRAIG-S20 | soft_fail | pass | pass |
| CRAIG-S21 | pass | pass | pass |
| CRAIG-S22 | pass | pass | pass |

### Counts

```json
{
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
      "pass": 20,
      "soft_fail": 0,
      "hard_fail": 1,
      "inconclusive": 0
    }
  },
  "pairwise": {
    "arrokothi_vs_bespoke": {
      "arrokothi_better": 13,
      "tie": 8
    },
    "arrokothi_vs_agenerateor": {
      "tie": 19,
      "arrokothi_better": 1,
      "agenerateor_better": 1
    },
    "agenerateor_vs_bespoke": {
      "agenerateor_better": 13,
      "tie": 8
    }
  }
}
```

## P02

| Scenario | Bespoke (stored) | Agenerateor (stored) | Arrokothi v0.35.1 |
|---|---:|---:|---:|
| ESTATE-S01 | pass | pass | hard_fail |
| ESTATE-S02 | hard_fail | pass | hard_fail |
| ESTATE-S03 | hard_fail | pass | pass |
| ESTATE-S07 | pass | pass | pass |
| ESTATE-S08 | pass | pass | pass |
| ESTATE-S09 | hard_fail | hard_fail | pass |
| ESTATE-S10 | hard_fail | hard_fail | pass |
| ESTATE-S11 | pass | pass | pass |
| ESTATE-S12 | pass | pass | pass |
| ESTATE-S13 | pass | pass | pass |
| ESTATE-S14 | hard_fail | hard_fail | pass |
| ESTATE-S15 | pass | pass | pass |
| ESTATE-S16 | hard_fail | hard_fail | hard_fail |
| ESTATE-S17 | pass | pass | pass |
| ESTATE-S19 | hard_fail | pass | hard_fail |

### Counts

```json
{
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
      "pass": 11,
      "soft_fail": 0,
      "hard_fail": 4,
      "inconclusive": 0
    }
  },
  "pairwise": {
    "arrokothi_vs_bespoke": {
      "bespoke_better": 1,
      "tie_both_fail": 2,
      "arrokothi_better": 4,
      "tie": 7,
      "mixed": 1
    },
    "arrokothi_vs_agenerateor": {
      "agenerateor_better": 3,
      "tie": 8,
      "arrokothi_better": 4
    },
    "agenerateor_vs_bespoke": {
      "tie": 8,
      "agenerateor_better": 4,
      "mixed": 1,
      "tie_both_fail": 2
    }
  }
}
```

## Interpretation

Semantic pass/soft-fail/hard-fail outcomes above come from the frozen canonical graders. Runtime reliability is a separate axis: this v0.35.1 rerun completed every requested turn without RuntimeError, fallback, or model mismatch. Efficiency is reported in `efficiency.json` and is not folded into semantic outcomes.

