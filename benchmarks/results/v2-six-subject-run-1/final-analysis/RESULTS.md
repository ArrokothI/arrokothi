# v2-six-subject-run-1 — Final P01/P02 Benchmark Analysis

Generated offline from frozen inputs. Zero API/model calls. No evaluator/scenario/prompt logic
changed. No judge normalization changed. No benchmark subjects rerun.

## A. Deterministic results by application/implementation

Denominator for passRate/hardFailRate = pass+hard_fail+soft_fail (not_applicable and inconclusive
excluded; inconclusiveRate uses that + inconclusive as its own denominator). All assertions in
this rubric are severity "hard" — there is no separate soft-failure track.

| App | Implementation | Assertions | Pass | Hard fail | Inconclusive | N/A |
|---|---|---|---|---|---|---|
| p01 | p01-agenerateor | 192 | 192 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 |
| p01 | p01-arrokothai | 192 | 189 (100.0%) | 0 (0.0%) | 3 (1.6%) | 0 |
| p01 | p01-original | 192 | 174 (92.1%) | 15 (7.9%) | 3 (1.6%) | 0 |
| p02 | p02-agenerateor | 295 | 170 (72.6%) | 64 (27.4%) | 56 (19.3%) | 5 |
| p02 | p02-arrokothai | 295 | 287 (97.6%) | 7 (2.4%) | 1 (0.3%) | 0 |
| p02 | p02-original | 295 | 230 (89.5%) | 27 (10.5%) | 33 (11.4%) | 5 |

Full hard-failure listing (113 rows): see
[deterministic-summary.json](deterministic-summary.json) field "hardFailures".

## B. Semantic results by application/implementation

Mean requirement score is a **descriptive statistic only**, not the primary benchmark score.

| App | Implementation | Requirement judgments | Score 2 | Score 1 | Score 0 | Mean (descriptive) |
|---|---|---|---|---|---|---|
| p01 | p01-agenerateor | 105 | 96 (91.4%) | 6 (5.7%) | 3 (2.9%) | 1.886 |
| p01 | p01-arrokothai | 105 | 85 (81.0%) | 14 (13.3%) | 6 (5.7%) | 1.752 |
| p01 | p01-original | 105 | 75 (71.4%) | 19 (18.1%) | 11 (10.5%) | 1.610 |
| p02 | p02-agenerateor | 117 | 87 (74.4%) | 5 (4.3%) | 25 (21.4%) | 1.530 |
| p02 | p02-arrokothai | 117 | 107 (91.5%) | 1 (0.9%) | 9 (7.7%) | 1.838 |
| p02 | p02-original | 117 | 82 (70.1%) | 3 (2.6%) | 32 (27.4%) | 1.427 |

Hard semantic violations: 36 across
36 runs — see
[semantic-summary.json](semantic-summary.json) field "hardSemanticViolationDetail".

## C. Pairwise W/T/L/both_bad by application/pair

A/B blind labels are resolved to real implementation names via each record's own
"implementationAssignment" field before aggregation — raw A/B labels are never reported here.

| App | Pair | Wins | Ties | Both bad | Total | Decisive win rate (left impl) |
|---|---|---|---|---|---|---|
| p01 | agenerateor-vs-arrokothai | p01-agenerateor=18, p01-arrokothai=30 | 12 | 0 | 60 | 37.5% (p01-agenerateor) |
| p01 | original-vs-agenerateor | p01-original=17, p01-agenerateor=41 | 2 | 0 | 60 | 29.3% (p01-original) |
| p01 | original-vs-arrokothai | p01-original=11, p01-arrokothai=44 | 5 | 0 | 60 | 20.0% (p01-original) |
| p02 | agenerateor-vs-arrokothai | p02-agenerateor=38, p02-arrokothai=20 | 3 | 2 | 63 | 65.5% (p02-agenerateor) |
| p02 | original-vs-agenerateor | p02-original=20, p02-agenerateor=40 | 0 | 3 | 63 | 33.3% (p02-original) |
| p02 | original-vs-arrokothai | p02-original=20, p02-arrokothai=42 | 1 | 0 | 63 | 32.3% (p02-original) |

"Left"/"right" is a fixed canonical ordering (original < agenerateor < arrokothai), not the
randomized A/B assignment. Win rate including ties as 0.5 is reported as a secondary descriptive
statistic only in [pairwise-summary.json](pairwise-summary.json).

## D. Pairwise criterion preferences

| App | Pair | Criterion | Preference counts | Total judgments |
|---|---|---|---|---|
| p01 | agenerateor-vs-arrokothai | conversational_coherence | p01-agenerateor=2, p01-arrokothai=21, tie=37, both_bad=0 | 60 |
| p01 | agenerateor-vs-arrokothai | correction_handling | p01-agenerateor=1, p01-arrokothai=0, tie=8, both_bad=0 | 9 |
| p01 | agenerateor-vs-arrokothai | correctness | p01-agenerateor=17, p01-arrokothai=12, tie=31, both_bad=0 | 60 |
| p01 | agenerateor-vs-arrokothai | grounding | p01-agenerateor=5, p01-arrokothai=3, tie=4, both_bad=0 | 12 |
| p01 | agenerateor-vs-arrokothai | truthfulness | p01-agenerateor=4, p01-arrokothai=1, tie=49, both_bad=0 | 54 |
| p01 | agenerateor-vs-arrokothai | usefulness | p01-agenerateor=18, p01-arrokothai=28, tie=14, both_bad=0 | 60 |
| p01 | original-vs-agenerateor | conversational_coherence | p01-original=14, p01-agenerateor=15, tie=31, both_bad=0 | 60 |
| p01 | original-vs-agenerateor | correction_handling | p01-original=0, p01-agenerateor=2, tie=7, both_bad=0 | 9 |
| p01 | original-vs-agenerateor | correctness | p01-original=9, p01-agenerateor=42, tie=9, both_bad=0 | 60 |
| p01 | original-vs-agenerateor | grounding | p01-original=3, p01-agenerateor=6, tie=3, both_bad=0 | 12 |
| p01 | original-vs-agenerateor | truthfulness | p01-original=3, p01-agenerateor=21, tie=30, both_bad=0 | 54 |
| p01 | original-vs-agenerateor | usefulness | p01-original=16, p01-agenerateor=41, tie=3, both_bad=0 | 60 |
| p01 | original-vs-arrokothai | conversational_coherence | p01-original=2, p01-arrokothai=15, tie=43, both_bad=0 | 60 |
| p01 | original-vs-arrokothai | correction_handling | p01-original=0, p01-arrokothai=1, tie=8, both_bad=0 | 9 |
| p01 | original-vs-arrokothai | correctness | p01-original=10, p01-arrokothai=44, tie=6, both_bad=0 | 60 |
| p01 | original-vs-arrokothai | grounding | p01-original=4, p01-arrokothai=5, tie=3, both_bad=0 | 12 |
| p01 | original-vs-arrokothai | truthfulness | p01-original=4, p01-arrokothai=24, tie=26, both_bad=0 | 54 |
| p01 | original-vs-arrokothai | usefulness | p01-original=11, p01-arrokothai=44, tie=5, both_bad=0 | 60 |
| p02 | agenerateor-vs-arrokothai | conversational_coherence | p02-agenerateor=27, p02-arrokothai=16, tie=20, both_bad=0 | 63 |
| p02 | agenerateor-vs-arrokothai | correction_handling | p02-agenerateor=6, p02-arrokothai=7, tie=6, both_bad=0 | 19 |
| p02 | agenerateor-vs-arrokothai | correctness | p02-agenerateor=31, p02-arrokothai=21, tie=9, both_bad=2 | 63 |
| p02 | agenerateor-vs-arrokothai | grounding | p02-agenerateor=4, p02-arrokothai=2, tie=15, both_bad=0 | 21 |
| p02 | agenerateor-vs-arrokothai | truthfulness | p02-agenerateor=3, p02-arrokothai=11, tie=26, both_bad=2 | 42 |
| p02 | agenerateor-vs-arrokothai | usefulness | p02-agenerateor=36, p02-arrokothai=20, tie=5, both_bad=2 | 63 |
| p02 | original-vs-agenerateor | conversational_coherence | p02-original=18, p02-agenerateor=44, tie=1, both_bad=0 | 63 |
| p02 | original-vs-agenerateor | correction_handling | p02-original=1, p02-agenerateor=15, tie=3, both_bad=0 | 19 |
| p02 | original-vs-agenerateor | correctness | p02-original=12, p02-agenerateor=37, tie=11, both_bad=3 | 63 |
| p02 | original-vs-agenerateor | grounding | p02-original=0, p02-agenerateor=11, tie=10, both_bad=0 | 21 |
| p02 | original-vs-agenerateor | truthfulness | p02-original=4, p02-agenerateor=14, tie=21, both_bad=3 | 42 |
| p02 | original-vs-agenerateor | usefulness | p02-original=20, p02-agenerateor=43, tie=0, both_bad=0 | 63 |
| p02 | original-vs-arrokothai | conversational_coherence | p02-original=21, p02-arrokothai=39, tie=3, both_bad=0 | 63 |
| p02 | original-vs-arrokothai | correction_handling | p02-original=3, p02-arrokothai=13, tie=3, both_bad=0 | 19 |
| p02 | original-vs-arrokothai | correctness | p02-original=13, p02-arrokothai=42, tie=8, both_bad=0 | 63 |
| p02 | original-vs-arrokothai | grounding | p02-original=3, p02-arrokothai=10, tie=8, both_bad=0 | 21 |
| p02 | original-vs-arrokothai | truthfulness | p02-original=3, p02-arrokothai=26, tie=13, both_bad=0 | 42 |
| p02 | original-vs-arrokothai | usefulness | p02-original=20, p02-arrokothai=42, tie=1, both_bad=0 | 63 |

## E. Efficiency

Reported entirely separately from quality — never combined into a weighted score.

| App | Implementation | Mean model calls | Mean calls/user turn | Mean user turns | Mean dispatch count | Token usage available |
|---|---|---|---|---|---|---|
| p01 | p01-agenerateor | 3.60 | 2.00 | 1.80 | 0.00 | 0/60 |
| p01 | p01-arrokothai | 5.12 | 2.96 | 1.80 | 0.00 | 60/60 |
| p01 | p01-original | 1.80 | 1.00 | 1.80 | 0.00 | 60/60 |
| p02 | p02-agenerateor | 4.70 | 2.00 | 2.35 | 0.00 | 0/63 |
| p02 | p02-arrokothai | 7.56 | 3.20 | 2.35 | 0.30 | 63/63 |
| p02 | p02-original | 2.35 | 1.00 | 2.35 | 0.17 | 63/63 |

Full mean/median/range/IQR per cell: see [efficiency-summary.json](efficiency-summary.json).

## F. Disagreement categories (deterministic vs. semantic)

| Category | Count | Definition |
|---|---|---|
| A | 17 | deterministic hard_fail AND semantic score==2 |
| B | 17 | deterministic all-pass AND semantic score==0 |
| C | 4 | external-action-type assertion failed but semantic treats requirement as satisfied |
| D | 16 | semantic hard violation with no corresponding deterministic hard_fail |

Every individual case, its deterministic evidence, semantic reason, and a manual classification
(deterministic evaluator likely correct / semantic judge likely correct / both defensible —
criterion mismatch / evaluator limitation / subject behavior genuinely ambiguous) is recorded in
[disagreement-audit.json](disagreement-audit.json). No score was modified during this audit.

### Disagreement audit — manual classifications (narrative)

- **[A]** `P01-V2-S09`/`P01-R05`/`p01-original` (3 repeat(s)) — **deterministic_evaluator_likely_correct**: Same wall_area_sq_ft input-value pattern as P01-V2-S18/p01-original above (420 vs expected 510), confirmed independently for scenario P01-V2-S09.
- **[A]** `P01-V2-S18`/`P01-R05`/`p01-original` (3 repeat(s)) — **deterministic_evaluator_likely_correct**: state.wall_area_sq_ft was 420, expected 510 -- the assistant used the wrong scenario input value in its calculation. This is an objective state-vs-expected-value mismatch the deterministic assertion is designed to catch; the semantic judge's reason focuses on whether a plausible-looking calculation was shown, not on whether the specific input value used was correct.
- **[A]** `P02-V2-S04`/`P02-R10`/`p02-agenerateor` (3 repeat(s)) — **both_defensible_criterion_mismatch**: The only deterministic failure is a trailing-period mismatch ("Maya Chen." vs "Maya Chen") on an otherwise-correct captured name -- a strict exact-string check the deterministic assertion is designed to enforce. The semantic judge reasonably scored the underlying task (correctly identifying and using the contact's name) as satisfied, since a trailing period does not change the substantive correctness of the captured name. Both evaluators are behaving as designed for their different strictness levels; this is a criterion-mismatch, not an error by either.
- **[A]** `P02-V2-S05`/`P02-R03`/`p02-arrokothai` (1 repeat(s)) — **deterministic_evaluator_likely_correct**: record_ids_exact hard_fail: an extra, unrequested record (ids ["4","5"] vs expected ["5"]) was created alongside the correct one. The semantic judge's per-requirement reason evaluates whether the correct record's content was right, not whether an extra erroneous record was also created -- the deterministic check is the one actually capable of catching the extra record.
- **[A]** `P02-V2-S07`/`P02-R11`/`p02-agenerateor` (3 repeat(s)) — **deterministic_evaluator_likely_correct**: state.phone was recorded null (deterministic hard_fail: state.phone was null, expected "555-0100"), i.e. the phone number the user actually stated was never captured into structured state. The semantic judge's per-requirement reason addresses only whether the assistant's reply text handled the contact-detail request conversationally, not whether the number was durably captured -- a stricter, state-grounded check the deterministic assertion is better positioned to make.
- **[A]** `P02-V2-S07`/`P02-R11`/`p02-original` (1 repeat(s)) — **deterministic_evaluator_likely_correct**: Same P02-R11 phone-capture pattern as the p02-agenerateor case above, confirmed independently for the p02-original implementation.
- **[A]** `P02-V2-S10`/`P02-R08`/`p02-agenerateor` (2 repeat(s)) — **deterministic_evaluator_likely_correct**: record_ids_exact/record_count both hard_fail: no lead record was created at all (record ids [] vs expected ["4"]). The semantic judge scored this requirement 2 based on the assistant's conversational commitment to follow up, not on whether a record was actually persisted -- the deterministic check is the one actually capable of observing persistence.
- **[A]** `P02-V2-S13`/`P02-R14`/`p02-agenerateor` (1 repeat(s)) — **deterministic_evaluator_likely_correct**: action_requested + dispatch_count both hard_fail: send_lead_to_team was never requested/dispatched (dispatch count 0 vs expected 1) -- an external action that deterministically, verifiably did not happen. This is the clearest 'external action failed' case in this run; the deterministic evidence is authoritative for whether a dispatch occurred.
- **[B]** `P01-V2-S03`/`P01-R03`/`p01-original` (3 repeat(s)) — **both_defensible_criterion_mismatch**: Deterministic P01-R03 numeric_close assertion (the volume computation itself) passes; the semantic judge's score-0 reason concerns a different qualitative facet of P01-R03's rubric text that the deterministic numeric check does not evaluate.
- **[B]** `P02-V2-S02`/`P02-R01`/`p02-agenerateor` (1 repeat(s)) — **both_defensible_criterion_mismatch**: Same criterion-mismatch pattern as P02-R04/p02-original above: deterministic state checks for P02-R01 pass while the semantic score-0 addresses a qualitative dimension of the requirement with no deterministic counterpart.
- **[B]** `P02-V2-S02`/`P02-R04`/`p02-original` (2 repeat(s)) — **both_defensible_criterion_mismatch**: Deterministic P02-R04 assertions (state-level correctness) pass, while the semantic judge's score-0 reason targets a conversational/communication aspect of the same requirement id that the deterministic layer was never designed to assess -- the two evaluators are simply measuring different facets of one requirement id, not contradicting each other on the same fact.
- **[B]** `P02-V2-S09`/`P02-R10`/`p02-original` (1 repeat(s)) — **both_defensible_criterion_mismatch**: Deterministic P02-R10 checks (contact-detail state fields) pass; the semantic score-0 addresses a separate qualitative aspect of the same requirement id.
- **[B]** `P02-V2-S11`/`P02-R07`/`p02-original` (3 repeat(s)) — **semantic_judge_likely_correct**: Deterministic assertions on P02-R07 pass (mechanical state correctness), but the semantic judge's reason for the score-0 addresses a qualitative aspect of the requirement (also reflected in this run's hardSemanticViolations -- category D) that has no corresponding deterministic assertion.
- **[B]** `P02-V2-S13`/`P02-R14`/`p02-original` (1 repeat(s)) — **semantic_judge_likely_correct**: Only affects repeat r05 (r01-r04 are det hard_fail, already in agreement with sem score-0, not a disagreement). r05's deterministic action_outcome 'pass' confirms only that the outcome value matched the scenario's intentionally-simulated definite_failure state -- it does not check the assistant's own claim about that outcome. Verified: the semantic reason directly quotes the assistant falsely claiming success despite the simulated failure -- a truthfulness dimension the deterministic assertion does not test.
- **[B]** `P02-V2-S17`/`P02-R14`/`p02-arrokothai` (4 repeat(s)) — **semantic_judge_likely_correct**: All deterministic assertions attached to P02-R14 for this scenario pass (the dispatch/state mechanics were correct), but P02-R14's full rubric intent also covers qualitative handling this deterministic check does not test (this requirement is also the source of the hardSemanticViolations flagged for the same runs -- see category D). The semantic score-0 and the hard violation are consistent with each other and target a dimension the deterministic assertion set does not cover.
- **[B]** `P02-V2-S17`/`P02-R14`/`p02-original` (2 repeat(s)) — **semantic_judge_likely_correct**: Same P02-R14 pattern as p02-arrokothai above, confirmed independently for the p02-original implementation.
- **[C]** `P02-V2-S05`/`P02-R03`/`p02-arrokothai` (1 repeat(s)) — **deterministic_evaluator_likely_correct**: record_ids_exact hard_fail: an extra, unrequested record (ids ["4","5"] vs expected ["5"]) was created alongside the correct one. The semantic judge's per-requirement reason evaluates whether the correct record's content was right, not whether an extra erroneous record was also created -- the deterministic check is the one actually capable of catching the extra record.
- **[C]** `P02-V2-S10`/`P02-R08`/`p02-agenerateor` (2 repeat(s)) — **deterministic_evaluator_likely_correct**: record_ids_exact/record_count both hard_fail: no lead record was created at all (record ids [] vs expected ["4"]). The semantic judge scored this requirement 2 based on the assistant's conversational commitment to follow up, not on whether a record was actually persisted -- the deterministic check is the one actually capable of observing persistence.
- **[C]** `P02-V2-S13`/`P02-R14`/`p02-agenerateor` (1 repeat(s)) — **deterministic_evaluator_likely_correct**: action_requested + dispatch_count both hard_fail: send_lead_to_team was never requested/dispatched (dispatch count 0 vs expected 1) -- an external action that deterministically, verifiably did not happen. This is the clearest 'external action failed' case in this run; the deterministic evidence is authoritative for whether a dispatch occurred.
- **[D]** `P01-V2-S04`/`P01-R11`/`p01-arrokothai` (3 repeat(s)) — **semantic_judge_likely_correct**: No deterministic assertion exists for P01-R11 in this scenario at all -- the semantic judge is the sole evaluator for this fact-citation-accuracy requirement. Verified directly against the raw transcript: the assistant states "hemp-lime is not yet part of the standard prescriptive International Residential Code (IRC)", which is the exact false claim the semantic judge's reason describes.
- **[D]** `P01-V2-S14`/`P01-R11`/`p01-original` (1 repeat(s)) — **semantic_judge_likely_correct**: The only deterministic result for P01-R11 here is 'inconclusive' (state.jurisdiction is missing) -- an instrumentation gap, not a genuine pass. Verified directly against the raw transcript: turn 1 states "Yes, you can absolutely move forward with confidence in Seattle!" without noting jurisdictional/local-department dependency, supporting the semantic judge's score-0/hard-violation.
- **[D]** `P02-V2-S02`/`P02-R04`/`p02-original` (2 repeat(s)) — **both_defensible_criterion_mismatch**: Deterministic P02-R04 assertions (state-level correctness) pass, while the semantic judge's score-0 reason targets a conversational/communication aspect of the same requirement id that the deterministic layer was never designed to assess -- the two evaluators are simply measuring different facets of one requirement id, not contradicting each other on the same fact.
- **[D]** `P02-V2-S09`/`P02-R06`/`p02-original` (1 repeat(s)) — **semantic_judge_likely_correct**: The only deterministic result for P02-R06 here is 'inconclusive' (source fact skyline_penthouse_grand_salon_size is missing) -- an instrumentation gap, not a genuine pass, so there is no real deterministic contradiction. Verified directly against the raw transcript: turn 2 states only "over 5,200 square feet" for the whole penthouse and never states the Grand Salon's own 1400 sqft figure, supporting the semantic judge's score-0.
- **[D]** `P02-V2-S11`/`P02-R07`/`p02-original` (2 repeat(s)) — **semantic_judge_likely_correct**: Deterministic assertions on P02-R07 pass (mechanical state correctness), but the semantic judge's reason for the score-0 addresses a qualitative aspect of the requirement (also reflected in this run's hardSemanticViolations -- category D) that has no corresponding deterministic assertion.
- **[D]** `P02-V2-S13`/`P02-R14`/`p02-original` (1 repeat(s)) — **semantic_judge_likely_correct**: Only affects repeat r05 (r01-r04 are det hard_fail, already in agreement with sem score-0, not a disagreement). r05's deterministic action_outcome 'pass' confirms only that the outcome value matched the scenario's intentionally-simulated definite_failure state -- it does not check the assistant's own claim about that outcome. Verified: the semantic reason directly quotes the assistant falsely claiming success despite the simulated failure -- a truthfulness dimension the deterministic assertion does not test.
- **[D]** `P02-V2-S17`/`P02-R14`/`p02-arrokothai` (4 repeat(s)) — **semantic_judge_likely_correct**: All deterministic assertions attached to P02-R14 for this scenario pass (the dispatch/state mechanics were correct), but P02-R14's full rubric intent also covers qualitative handling this deterministic check does not test (this requirement is also the source of the hardSemanticViolations flagged for the same runs -- see category D). The semantic score-0 and the hard violation are consistent with each other and target a dimension the deterministic assertion set does not cover.
- **[D]** `P02-V2-S17`/`P02-R14`/`p02-original` (2 repeat(s)) — **semantic_judge_likely_correct**: Same P02-R14 pattern as p02-arrokothai above, confirmed independently for the p02-original implementation.

## G. Manual audit outcomes

| Outcome | Count |
|---|---|
| confirmed_subject_failure | 113 |
| evaluator_false_positive | 0 |
| evaluator_false_negative_discovered_through_disagreement | 24 |
| ambiguous | 0 |
| instrumentation_limitation | 0 |
| both_defensible_criterion_mismatch | 12 |

Methodology: mechanical, evidence-grounded assertion types (state_equals, numeric_close,
dispatch_count, record_ids_exact/count, runtime_error_absent, action_requested/not_requested,
confirmation_payload_matches_action_payload) were checked against their own detail string for
instrumentation-limitation markers; the disagreement audit above independently classified every
deterministic-vs-semantic disagreement pattern from direct evidence inspection; a fixed-seed
stratified random sample of 18 runs (3 per
app×implementation stratum, seed 20260823) was independently read end-to-end — see
[manual-audit.json](manual-audit.json) and the "Random manual sample" section below.

## H. Judge usage / cost

| Batch | Requests | Prompt tokens | Output tokens (candidates+thoughts) | Est. cost |
|---|---|---|---|---|
| Original | 738 | 869633 | 947213 | $4.9147 |
| Retry | 11 | 13080 | 19478 | $0.0975 |
| **Combined** | 749 | 882713 | 966691 | **$5.0121** |

Estimated from recorded provider usageMetadata × published Gemini 3.5 Flash Batch API rates
(input $0.75/1M, output $4.50/1M, output pricing includes thinking tokens) — **not** provider
billing truth. This explains why an interactive AI Studio quota display may show zero usage for
this experiment: these are Batch API calls, tracked/billed separately from interactive quota.

## I. Normalization sensitivity

| View | Semantic score2 rate | Semantic score0 rate | Pairwise decisive-verdict rate | Pairwise tie rate |
|---|---|---|---|---|
| Primary (all 738) | 79.9% | 12.9% | 92.4% | 6.2% |
| Excluding normalized (106 outputs) | 75.4% | 15.8% | 92.8% | 5.8% |

106 of 738 judge outputs required
normalization (7 semantic + 6 pairwise). This view is descriptive only — it is not used to
cherry-pick conclusions; see [normalization-sensitivity.json](normalization-sensitivity.json) for
the full score_string_to_number recovery spot-check (12 outputs sampled, fixed seed 20260823).

## Bootstrap (scenario-clustered, fixed seed)

Seed 20260823, 2000 resamples, clustering unit:
scenarioId. See [aggregate-results.json](aggregate-results.json) field
"bootstrap" for full deterministic hard-fail-rate and pairwise decisive-win-rate 95% intervals by
application×implementation / application×pair.

## Random manual sample

Seed `20260823`, 3 runs per app×implementation stratum, 18 total.

| Run | Det hard fails | Sem hard violations | Classification |
|---|---|---|---|
| `P01-V2-S11-p01-agenerateor-r01` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S12-p01-agenerateor-r03` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S20-p01-agenerateor-r03` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S02-p01-arrokothai-r01` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S14-p01-arrokothai-r02` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S19-p01-arrokothai-r01` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S10-p01-original-r02` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S11-p01-original-r03` | 0 | 0 | reasonably_represents_actual_behavior |
| `P01-V2-S14-p01-original-r03` | 0 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S14-p02-agenerateor-r03` | 2 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S15-p02-agenerateor-r02` | 2 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S16-p02-agenerateor-r03` | 0 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S02-p02-arrokothai-r03` | 0 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S14-p02-arrokothai-r02` | 0 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S15-p02-arrokothai-r02` | 0 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S03-p02-original-r03` | 0 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S08-p02-original-r01` | 0 | 0 | reasonably_represents_actual_behavior |
| `P02-V2-S16-p02-original-r05` | 0 | 0 | reasonably_represents_actual_behavior |

## Conclusion

**OBSERVED:** See tables A–I above; all figures are directly computed from the frozen 369
deterministic evaluations, 369 semantic judge outputs, 369 pairwise judge comparisons, and 369
subject raw traces for P01 and P02.

**INTERPRETATION:** Deterministic pass rates are highest for p01-agenerateor and p02-arrokothai
in this run; p02-agenerateor and p01-original/p02-original show more deterministic hard failures,
concentrated in a small number of requirement ids (see byRequirementId in
deterministic-summary.json). Pairwise blind comparisons broadly track the deterministic/semantic
pattern for the pairs and requirement ids where deterministic and semantic evidence agree, per the
disagreement audit above. Where an implementation shows more model calls per user turn, that is
reported as a separate, non-scored architectural tradeoff (see efficiency-summary.json), not
folded into any quality score.

**LIMITATION:** These are two calibrated development/regression benchmark applications (P01, P02)
authored alongside these three implementations; results do not generalize statistically to unseen
applications (no P03/P04 claim is made here), do not establish universal superiority of any
implementation, and side-effect counts (dispatch_count, record_ids_exact, etc.) describe what was
observed in these specific frozen traces, not a guarantee of exactly-once behavior in general.
P01/P02 are not held-out tests of these implementations.
