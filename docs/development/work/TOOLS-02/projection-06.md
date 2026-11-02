# Projection 06 — early group-cap stop before origin 600

Subsequent owner disposition: [owner choice 08](owner-choice-08.md) separates the test-group and mutation-adoption caps and resumes this stop.

2026-10-29, implementing Codex GPT-6 session. Governing change: [owner choice 07](owner-choice-07.md).

**Stop: at least 14 distinct extraction groups, exceeding the cap of 12.** This is an
early trigger at origin **431**, not the requested completed origin-600 checkpoint.
Continuing to 600 would pass an already established stop. No extraction build began.

| Measure | Observation |
|---|---:|
| Eligible origin population (unchanged from projection 05) | 1,518 |
| Origins read, including the family origin now under reconciliation | 431 |
| Retired origins | 423 |
| Planned extraction origins | 8 |
| Current distinct extraction groups (lower bound) | **14** |
| First 300 origins, current groups after count-gate reconsideration | 3 |
| New groups in origins 301–431 (131 origins, incomplete second 300) | 11 |
| Second 300-origin interval | Not completed: stopped after 131 |
| Observed partial-interval rate, normalized to 300 | 11 / 131 × 300 = 25.19 |
| Cumulative linear projection | ceil(14 / 431 × 1,518) = **50 groups** |

The linear estimate is low-confidence because a single mutation-family artifact introduces
multiple distinct decisions. The stop does not depend on that estimate: the observed lower
bound of 14 already exceeds 12. No rate for a completed second 300 is claimed.

Projection 05 originally counted four groups and 34 extraction origins at 300. Its original
stop remains untouched. Owner choice 07's pre-build recheck removed the obsolete fixed-eleven-file
count gate; group-review-05 preserves the rationale and triage-05 retains its old plans as
reconsideration evidence. Three groups remain from that interval.

[Group review 06](group-review-06.md) records the eleven new live mutation-adoption groups
and why ordinary behavior tests do not alone satisfy design 01 §5.4's family rule. All eleven
edits apply at checked revision `91175053bc28c679155f958b997dc6b590a11a9c`; the fresh-clone
applicability observations are in [family-applicability-06.json](family-applicability-06.json).
No new behavioral gap or product defect is inferred merely from a missing mutation route.

Resume after an owner decision at `K1.2/ablations.mjs:1`,
`artifact-fb7a16748e389543ef6bf980`: reconcile the remaining family routes, then proceed to
`K1.2/blocker-01.md` and subsequent source files in order. Preliminary reads of later files
are not counted or disposed. The origin-600 checkpoint is still outstanding if continuation
is authorized; keep the groups separate unless an actual P1-G equivalence is established.

No final C/H, extraction/P3 completion, self-audit, mappings_complete or CI dispatch is claimed.
The implementer requests an owner disposition of this cap stop. No acceptance is self-certified.
