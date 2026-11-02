# Projection 09 — origin 1,031 checkpoint

2026-10-30, implementing Codex GPT-6 session, under [owner choice 10](owner-choice-10.md).
This is the scheduled re-estimation after that bounded continuation. Projection 08's
original stop and the owner's answer remain preserved.

**Five distinct new-test groups / 131 mutation-adoption cases**, combined count 136.
The separate caps govern: 12 tests, projected 250 adoptions, and 600 seconds of
measured added registry runtime. All projections below remain within their caps;
continue in source order under owner choice 09's stops. This does not extend the
bounded waiver or change any cap.

| Measure | Test groups | Mutation adoptions |
|---|---:|---:|
| Origin 431 baseline | 3 | 11 |
| Origin 731 source-order count | 5 | 129 |
| Origin 1,031 current count | **5** | **131** |
| New in the latest 300 origins (731→1,031) | **0** | **2** |
| New in the previous 300 (431→731) | 2 | 118 |
| Cumulative projection over 1,518 eligible origins | ceil(5 / 1,031 × 1,518) = **8** | ceil(131 / 1,031 × 1,518) = **193** |
| Latest-300 projection over 487 remaining origins | ceil(5 + 0 / 300 × 487) = **5** | ceil(131 + 2 / 300 × 487) = **135** |
| 600-origin sensitivity from the prior baseline | ceil(5 + 2 / 600 × 487) = **7** | ceil(131 + 120 / 600 × 487) = **229** |
| Cap | 12 | 250 |

The origin-731 count is reconstructed from the source-order readings: the base
family completed at origin 698 with five/129, and no new group was added through
801. T4 at origin 819 and the inspection read in the round-8 report are the two new
adoptions in the latest interval. There are 950 retired origins and 81 extraction
origin plans. The population remains 1,518 (1,541 inventory origins plus eight
additions minus 31 already complete). Families arrive in bursts; these estimates
have low confidence and are not upper bounds. We retain the longer-window sensitivity
rather than treating the small latest interval as proof that future families are small.

## Every measured adoption run so far

| Revision | Measured run | Elapsed seconds |
|---|---|---:|
| 9d71834e | 18 controls refused setup; no mutant run | 5.936 |
| 51d94514 | 18 valid controls and 18 qualified kills | 27.869 |
| f9e9c540 | 49 valid controls; 51 mutants: 42 killed, eight observed, one setup error | 147.634 |
| b804e986 | Retry of eight valid controls and nine qualified kills | 69.278 |
| **All measured runs, including failures/retries** | | **250.717 (4 min 10.717 sec)** |

The [runtime ledger](adoption-runtime-09.json) retains per-case observations and raw
result digests; [results 08](adoption-controls-08.json), [09](adoption-controls-09.json)
and [10](adoption-controls-10.json) retain the validation summaries. These are actual
serial case setup/control/mutant measurements, not an extrapolation. Clone/npm ci,
catalogs, read-only anchor checks and typecheck are outside those measurements.
The pre-execution output-cap refusal at 11887628 has no persisted elapsed timer;
it remains separately disclosed in the ledger, not falsely represented as zero time.
No adoption has run since b804e986.

67 built cases have 69 validated mutants across recorded revisions. **64 cases and
additional shared round-7 variants remain unbuilt/unrun**; the time table makes no
claim about their future cost. Every newly measured attempt contributes to the
600-second stop, and final-C controls/kills remain required. New test groups also
remain to build after current-C applicability/coverage/supersession checks.

Resume origin 1,032 at K1.2-correction-01/implementation-09.md:671,
mention-1823bbfefa0fb77e82e38e74. Continue source order and batch progress. Stop early
if test groups exceed 12, projected adoptions exceed 250, measured added runtime
exceeds 600 seconds, or another unchanged product/evidence/defect/audit stop fires.
P3, n=50/seed=20261026 self-audit, mappings_complete, fresh-clone final verification,
C/CI dispatch without polling and H remain outstanding. IN_PROGRESS; no review-ready
or independent acceptance claim.
