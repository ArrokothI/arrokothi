# Projection 07 — early adoption-cap stop at origin 696

2026-10-29, implementing Codex GPT-6 session. Governing instruction:
[owner choice 08](owner-choice-08.md), answering projection 06 at `8acfc06e`.

**Stop: at least 61 mutation adoptions, above the observed cap of 60.** Five
new-test groups remain below 12. This is the required early stop, not a claim that
the scheduled origin-731 checkpoint was completed. There are 35 origins to that
checkpoint; continuing now would cross the owner's explicit observed-count stop.

| Measure | Test groups | Mutation adoptions |
|---|---:|---:|
| Owner-choice-08 baseline, origin 431 | 3 | 11 |
| Current distinct count, origin 696 under reconciliation | **5** | **at least 61** |
| New in the partial 431→696 interval (265 origins) | 2 | at least 50 |
| New per 300, normalized partial-interval rate | 2.26 | at least 56.60 |
| Cumulative linear projection over 1,518 eligible origins | ceil(5 / 696 × 1,518) = **11** | ceil(61 / 696 × 1,518) = **134** |
| Recent-rate projection over the remaining 822 origins | ceil(5 + 2 / 265 × 822) = **12** | ceil(61 + 50 / 265 × 822) = **217** |
| Owner cap | 12 | 60 |

Current combined distinct count: at least **66** (5 + 61), reported only as context;
owner choice 08's two caps govern separately. The origin population remains 1,518,
with 31 previously complete origins excluded. At this stop there are 674 retired
origins and 22 extraction-origin plans, including the partially reconciled current
family. Multiple origins may share one adoption. No completed 300-origin interval
or origin-731 rate is claimed.

The projections are low-confidence planning estimates, not upper bounds. Mutation
families arrive in bursts, and source-order intake is not a random sample. The
observed lower bound already fires the stop independently of either projection.
[Group review 09](group-review-09.md) adds nineteen shared base/rebound obligations;
[group review 10](group-review-10.md) adds sixteen coordinate obligations; and
[group review 11](group-review-11.md) establishes six more before the early stop.
No origin is retired just because a mutation anchor moved. Unresolved members of
ablations-06 may increase the count and are not silently treated as covered.

## Added registry runtime

[Measured fresh-clone controls and kills](adoption-controls-08.json) at
`51d945149ceb46fd3a4547ec811313e868f951a8`: eighteen validated adoptions,
**27.869 seconds** total; mean **1.5483 seconds/case**, observed range **1.294–2.396**.
This is controls plus mutants, excluding clone/npm-ci setup and the pre-existing
registry. The same serial-cost assumption gives:

| Adoption count | Added runtime at measured mean | Sensitivity using observed per-case range |
|---|---:|---:|
| Current lower bound 61 | 94.4 seconds | 78.9–146.2 seconds |
| Cumulative projection 134 | 207.5 seconds (3.46 minutes) | 173.4–321.1 seconds |
| Recent-rate projection 217 | 336.0 seconds (5.60 minutes) | 280.8–519.9 seconds |

These are runtime extrapolations, not measured runtimes for the new cases or limits
on CI duration. The 43 newly planned adoptions have not run; target-file size,
structural checks, retries and later family mix may change cost materially. Final-C
controls and qualified kills remain mandatory for every adopted mutant.

## Owner decision and resume

The requested decision is whether to authorize completing triage through origin 731
before setting a revised adoption budget, or to revise the adoption cap now. That
is a proposed next step only. The present cap remains in force until the owner decides.
No change to P1-G, S1–S6, family closure, other stops or audit parameters is proposed.

Resume within `K1.2-correction-01/ablations-06.mjs:1`,
`artifact-89a6c743f27e1e2697eab84d`: reconcile the remaining routes and H17–H22,
retaining the six counted obligations and deduplicating only with an actual P1-G
reading. Then continue at ablations-07 in source order.

No new extraction build or mutation execution occurred after this observed stop.
P3, the n=50/seed=20261026 self-audit, mappings_complete, final fresh-clone verify,
C/CI dispatch and H remain outstanding. IN_PROGRESS; not review-ready or accepted.
