# Projection 10 — request-observation test-group stop

2026-10-30, implementing Codex GPT-6 session. Current reading at 618f06d4;
[Group review 20](group-review-20.md) records the bounded source and coverage search.
At origin 1,171, **at least 13 distinct new-test groups / 135 mutation adoptions**.
Five control-request-getter schedules require new tests. The observed count already
exceeds 12; both test projections below also exceed 12. **Stop for owner disposition.**

[Owner choice 08](owner-choice-08.md) says to stop if either projection exceeds its
cap. [Owner choice 09](owner-choice-09.md) retains the test cap of 12 and sets the
other limits at projected 250 adoptions and 600 measured seconds. Owner choice 10's
bounded continuation ended at origin 1,031; projection 09 completed that checkpoint.
No extension is inferred from the later continue messages.

| Measure | New-test groups | Mutation adoptions |
|---|---:|---:|
| Latest-300 baseline, origin 871 | 5 | 130 |
| Current, within origin 1,171 | **at least 13** | **135** |
| New in latest 300 origins | **at least 8** | **5** |
| Cumulative projection, 1,518 eligible origins | ceil(13 / 1,171 × 1,518) = **17** | ceil(135 / 1,171 × 1,518) = **176** |
| Latest-300 projection, 347 origins after this one | ceil(13 + 8/300 × 347) = **23** | ceil(135 + 5/300 × 347) = **141** |
| Longer-window sensitivity from origin 431 (3 tests / 11 adoptions) | ceil(13 + 10/740 × 347) = **18** | ceil(135 + 124/740 × 347) = **194** |
| Cap | **12** | **250** |

The 1,518 population is unchanged. The current partial origin is included in the
checkpoint denominator, as earlier within-origin stops were; its unresolved P1
reading may add work. Therefore these are lower-bound counts and low-confidence
estimates, not upper bounds. The five new P3 schedules differ in outer operation,
inner decision and required result; do not collapse them because they share a file.

## Every measured adoption run so far

| Revision | Measured run | Seconds |
|---|---|---:|
| 9d71834e | 18 controls refused setup; no mutant run | 5.936 |
| 51d94514 | 18 valid controls and 18 qualified kills | 27.869 |
| f9e9c540 | 49 controls; 51 mutants: 42 killed, eight observed, one setup error | 147.634 |
| b804e986 | Retry of eight controls and nine qualified kills | 69.278 |
| **All measured runs, including failures/retries** | | **250.717** |

The [runtime ledger](adoption-runtime-09.json) remains unchanged. No adoption has
run since b804e986. The earlier pre-execution output-cap refusal at 11887628 has
no persisted elapsed timer and remains separately disclosed, not represented as
zero. These are actual measured runs, not extrapolated runtime. 67 cases are built;
68 cases plus shared variants remain planned and unrun. All future measured attempts
must count toward the 600-second stop, including final-C executions.

There are 1,027 retired-origin records and 144 extraction-origin plans, including
the partial current origin. Resume **within K1.2-correction-01/review-04/README.md:11**,
mention-b521726deecc3636dce692c5: finish the P1 combined protocol-hold/unsafe-Driver
coverage or supersession reading, then README.md:13 and source order. P3's five
new test groups are retained but not built. The X1–X3 existing-leaf adoptions add
three cases; X8–X23 keep their existing routes.

Owner disposition is required before further triage or builds. One bounded option
is to authorize triage through origin 1,331 despite the 12-test-group cap, then
re-estimate there, while retaining the 250-adoption, 600-second runtime and all
product/evidence/defect/audit stops. This option is a proposal, not authorization.
P3 builds, self-audit, mappings_complete, final fresh-clone checks, C/CI dispatch
without polling and H remain required. IN_PROGRESS; no acceptance claim.

Owner disposition: [owner choice 11](owner-choice-11.md) raises the test cap to 25, authorizes triage through 1,518 and defines the runtime cap per complete pass; the original stop above is preserved.
