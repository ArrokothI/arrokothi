# Projection 08 — early projected-adoption stop within origin 697

Subsequent owner disposition: [owner choice 10](owner-choice-10.md) authorizes continuing through origin 1,031 despite the adoption projection, retaining the test and measured-runtime stops.

2026-10-29, implementing Codex GPT-6 session. Governing instruction:
[owner choice 09](owner-choice-09.md), answering projection 07 at `8e9a8b8f`.

**Stop: the recent-rate projection is 253 mutation adoptions, above 250.**
Five new-test groups remain within 12; measured added adoption runtime is 250.717
seconds, below 600. This is the requested early stop, not completion of the scheduled
origin-1,031 checkpoint. There are 334 origins from the current origin to that checkpoint.

| Measure | Test groups | Mutation adoptions |
|---|---:|---:|
| Owner-choice-08 baseline, origin 431 | 3 | 11 |
| Current distinct count, origin 697 under reconciliation | **5** | **at least 70** |
| New in the partial 431→697 interval (266 origins) | 2 | at least 59 |
| New per 300, normalized partial-interval rate | 2.26 | at least 66.54 |
| Cumulative projection over 1,518 eligible origins | ceil(5 / 697 × 1,518) = **11** | ceil(70 / 697 × 1,518) = **153** |
| Recent-rate projection over the remaining 821 origins | ceil(5 + 2 / 266 × 821) = **12** | ceil(70 + 59 / 266 × 821) = **253** |
| Owner cap | 12 | 250 |

Current combined distinct count is at least **75** (5 + 70), for context only; the
separate caps govern. The population remains 1,518 eligible origins, excluding 31
already complete. There are 674 retirement readings and 23 extraction-origin plans,
including this incomplete family. No completed 300-origin interval is claimed.

These retain projection 07's formulas and baseline. Source-order families arrive in
bursts, so both projections have low confidence; neither is an upper bound. The
cumulative estimate is below the cap, but the recent-rate estimate exceeds it and
triggers the owner's stop. It was 241 at origin 696 with 67 adoptions. The current
family adds three distinct cases (R7/R8/R10), bringing it to 253; no optimistic
replacement formula or silent merging is used to avoid the stop.

[Group review 13](group-review-13.md) records the three live source decisions and
existing passing leaves, R1–R6's shared variants, and R9's individual absent-anchor
reading. R11–R12/C1–C16 remain to reconcile and may increase the lower bound.

## Measured added registry runtime — every adoption run so far

| Revision | Measured run | Elapsed seconds |
|---|---|---:|
| `9d71834e` | 18 controls refused setup; no mutant run | 5.936 |
| `51d94514` | 18 valid controls and 18 qualified kills | 27.869 |
| `f9e9c540` | 49 valid controls; 51 mutants: 42 killed, 8 observed, 1 probe setup error | 147.634 |
| `b804e986` | Retry of 8 valid controls and 9 qualified kills | 69.278 |
| **All measured runs** | **Failures and retries included** | **250.717 (4 min 10.717 sec)** |

The [ledger](adoption-runtime-09.json) gives every case's elapsed time and outcome,
raw-result path and digest; [results 08](adoption-controls-08.json),
[results 09](adoption-controls-09.json) and [results 10](adoption-controls-10.json)
retain the successful and unsuccessful validation summaries. These are actual serial
measurements, including each case's temporary setup. They exclude clone/npm-ci,
catalog runs, read-only anchor checks and typecheck. No runtime extrapolation is used.

An invocation at `11887628` rejected the first case's invalid output cap before any
child process ran. No elapsed timer was persisted before that exception. The ledger
retains the launcher error/log digest; it is not represented as a zero-duration
measured attempt or as test execution. The limit was corrected to the runner's
existing 1 MiB maximum; no runner policy changed.

All 67 built adoption cases have their 69 currently registered mutants validated
across these revisions; three additional cases and the next family's shared mutation
variants remain planned. Final-C controls and kills for all remain mandatory.

## Owner decision and resume

An owner disposition is needed to continue beyond the 250 projection cap. One concrete
option is to authorize triage through origin 1,031 despite the current projection of
253, retaining the 12-test-group and 600-second measured-runtime stops, and then
re-estimate both counts and all measured runs there. This is only a proposed option;
no cap changes without the owner's instruction.

Resume within `K1.2-correction-01/ablations-07.mjs:1`,
`artifact-d3c77a74ad17db7c908e8b60`, at R11 after the readings through R10. Preserve the
three counted cases and all shared variants. Then continue in source order.

No new extraction or mutant execution occurred after the projection triggered.
P3, self-audit (n=50, seed 20261026), mappings_complete, final fresh-clone verification,
C/CI dispatch without polling, and H remain outstanding. IN_PROGRESS and stopped
for owner disposition; not review-ready or independently accepted.
