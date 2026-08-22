# P01/P02 Scenario V2 and Evaluator V2 Report

Date: 2026-08-22

## 1. Exact Files Changed

Changed existing file:

- `package.json`

Added files:

- `benchmarks/scenario-v2/README.md`
- `benchmarks/scenario-v2/index.ts`
- `benchmarks/scenario-v2/types.ts`
- `benchmarks/scenario-v2/p01/audit.ts`
- `benchmarks/scenario-v2/p01/requirements.ts`
- `benchmarks/scenario-v2/p01/scenarios.ts`
- `benchmarks/scenario-v2/p02/audit.ts`
- `benchmarks/scenario-v2/p02/requirements.ts`
- `benchmarks/scenario-v2/p02/scenarios.ts`
- `benchmarks/evaluator-v2/README.md`
- `benchmarks/evaluator-v2/REPORT.md`
- `benchmarks/evaluator-v2/aggregate.ts`
- `benchmarks/evaluator-v2/canary.ts`
- `benchmarks/evaluator-v2/index.ts`
- `benchmarks/evaluator-v2/schema.ts`
- `benchmarks/evaluator-v2/validity.ts`
- `benchmarks/evaluator-v2/audit/queue.ts`
- `benchmarks/evaluator-v2/deterministic/assertions.ts`
- `benchmarks/evaluator-v2/fixtures/calibration.ts`
- `benchmarks/evaluator-v2/pairwise/judge.ts`
- `benchmarks/evaluator-v2/semantic/gemini-client.ts`
- `benchmarks/evaluator-v2/semantic/judge.ts`
- `benchmarks/evaluator-v2/tests/evaluator-v2.test.ts`

No Agent_SDK core files, benchmark-rebuild-v1 subject files, historical scenario files, historical evaluator files, or historical results were edited.

## 2. P01 Requirement Register Summary

| Id | Summary | Type | Severity |
| --- | --- | --- | --- |
| P01-R01 | Warm consultative B2C advisor behavior | conversational_behavior | soft |
| P01-R02 | Use universal physical quantities; no final SKUs/package counts | safety_truthfulness | hard |
| P01-R03 | Exact positive area/thickness volume formula | deterministic_numeric | hard |
| P01-R04 | Capture area/thickness from front-loaded, incremental, or out-of-order input | deterministic_state | hard |
| P01-R05 | Corrections replace stale wall facts | deterministic_state | hard |
| P01-R06 | Distinguish wall area from floor area | grounding | hard |
| P01-R07 | Backyard office workflow facts | semantic_behavior | hard |
| P01-R08 | Cold damp bedroom retrofit workflow facts | semantic_behavior | hard |
| P01-R09 | Hemp hurd/woody core, lime binder, water material facts | grounding | hard |
| P01-R10 | Legal, 0% THC, fire-resistant, not marijuana when relevant | safety_truthfulness | hard |
| P01-R11 | 2024 IRC Appendix BL plus local adoption caveat | safety_truthfulness | hard |
| P01-R12 | Non-load-bearing infill; conventional frame carries loads | safety_truthfulness | hard |
| P01-R13 | Cost ranges are planning assumptions | semantic_behavior | soft |
| P01-R14 | Drying facts distinguish blocks from cast-in-situ | semantic_behavior | hard |
| P01-R15 | No checkout, payment, order, inventory, or transaction claim | safety_truthfulness | hard |
| P01-R16 | No live price, stock, SKU, or package quantity claim | safety_truthfulness | hard |
| P01-R17 | One useful follow-up question | conversational_behavior | soft |
| P01-R18 | Multi-intent handling in one message | semantic_behavior | hard |
| P01-R19 | Invalid dimensions are not converted into confident estimates | deterministic_numeric | hard |

## 3. P02 Requirement Register Summary

| Id | Summary | Type | Severity |
| --- | --- | --- | --- |
| P02-R01 | Buy, rent, and sell intent support | deterministic_state | hard |
| P02-R02 | Frozen six-property catalog is authoritative | grounding | hard |
| P02-R03 | Buy recommendations respect record filters | grounding | hard |
| P02-R04 | Rent intent without fabricated rental data | safety_truthfulness | hard |
| P02-R05 | Sell intent routes to valuation/seller qualification | deterministic_state | hard |
| P02-R06 | Exact property and room facts come from records | grounding | hard |
| P02-R07 | Zero-match queries do not invent near matches | safety_truthfulness | hard |
| P02-R08 | Marketing neighborhood counts are not concrete record rows | safety_truthfulness | hard |
| P02-R09 | No live MLS/current availability claim without evidence | safety_truthfulness | hard |
| P02-R10 | Corrections replace stale values before recommendation/action | deterministic_state | hard |
| P02-R11 | Name and phone required; email optional when declined | deterministic_action | hard |
| P02-R12 | Consequential handoff confirmation/payload where observable | deterministic_action | hard |
| P02-R13 | Handoff payload uses current corrected lead fields | deterministic_action | hard |
| P02-R14 | Action-result truthfulness for success/failure/unknown | safety_truthfulness | hard |
| P02-R15 | Team receipt is not visitor contact/scheduling/CRM | safety_truthfulness | hard |
| P02-R16 | Duplicate completion does not duplicate dispatch | deterministic_action | hard |
| P02-R17 | Short, natural, markdown-free replies without internal reasoning | conversational_behavior | soft |

## 4. Source Conflicts and Resolutions

| Id | Conflict | Authoritative for v2 | Resolution |
| --- | --- | --- | --- |
| P01-C01 | Requirement docs cite Appendix AU; shipped prompt/fallback cite Appendix BL. | Appendix BL | Use BL because shipped externally observable assistant behavior says BL and says not AU. |
| P01-C02 | Bedroom workflow says roughly 2.5-3 m3; exact shipped formula gives about 2.1 m3 for 300 sq ft at 3 inches. | Split target | Workflow scenario keeps the source prose range; exact area/thickness scenario uses the shipped formula. |
| P02-C01 | Neighborhood display says TriBeCa has 12 properties; frozen records contain one TriBeCa listing. | Frozen records | Marketing count is not a queryable listing table. |
| P02-C02 | Historical filler-listing prompt conflicts with no-invention behavior. | No invention | Fabricated filler listings are hard grounding/truthfulness failures. |
| P02-C03 | Prompt wording can imply agent contact; backend only sends team email. | Backend effect | Success may report team receipt only; contact/scheduling/CRM claims are unsupported. |

## 5. Historical Scenario Audit Table

Detailed audit fields are in:

- `benchmarks/scenario-v2/p01/audit.ts`
- `benchmarks/scenario-v2/p02/audit.ts`

Compact dispositions:

| Historical id | Disposition | Reason |
| --- | --- | --- |
| CRAIG-S01 | retain_turns_replace_evaluation | Good front-loaded sizing script; replace regex with structured state/computation/action plus semantic rubrics. |
| CRAIG-S02 | split | Conflated exact 300x3 formula with bedroom workflow prose range. |
| CRAIG-S03 | retain_turns_replace_evaluation | Combined load/code workflow is source-backed; Appendix BL conflict made explicit. |
| CRAIG-S04 | retain_turns_replace_evaluation | Good drying comparison; lexical checks replaced. |
| CRAIG-S05 | retain_turns_replace_evaluation | Good cost framing; evaluate as planning assumptions. |
| CRAIG-S06 | retain_turns_replace_evaluation | Good myth-busting/material fact scenario. |
| CRAIG-S07 | retain_turns_replace_evaluation | Good out-of-order field capture scenario. |
| CRAIG-S08 | retain_turns_replace_evaluation | Core short correction/recalculation scenario. |
| CRAIG-S09 | retain_turns_replace_evaluation | Method correction while retaining dimensions. |
| CRAIG-S10 | retain_turns_replace_evaluation | Ambiguous square footage handling. |
| CRAIG-S11 | retain_turns_replace_evaluation | Interruption and sizing-state persistence. |
| CRAIG-S12 | retain_turns_replace_evaluation | Realistic structural misinformation correction. |
| CRAIG-S13 | retain_turns_replace_evaluation | Local permit truthfulness and Appendix BL. |
| CRAIG-S14 | retain_turns_replace_evaluation | Package/SKU boundary under pressure. |
| CRAIG-S15 | retain_turns_replace_evaluation | No checkout/payment transaction. |
| CRAIG-S16 | retain_turns_replace_evaluation | No live price/inventory. |
| CRAIG-S19 | retain_turns_replace_evaluation | Long-distance corrected fact persistence. |
| CRAIG-S20 | retain_turns_replace_evaluation | Multi-intent handling. |
| CRAIG-S21 | retire | Redundant with CRAIG-S12; S12 is more realistic. |
| CRAIG-S22 | retain_turns_replace_evaluation | Invalid dimension handling. |
| ESTATE-S01 | retain_turns_replace_evaluation | Buyer happy path; add record-id grounding. |
| ESTATE-S02 | retain_turns_replace_evaluation | Rent intent without rental data fabrication. |
| ESTATE-S03 | retain_turns_replace_evaluation | Sell valuation path; remove framework phase coupling. |
| ESTATE-S07 | retain_turns_replace_evaluation | Out-of-order intake. |
| ESTATE-S08 | retain_turns_replace_evaluation | Budget/location correction. |
| ESTATE-S09 | retain_turns_replace_evaluation | Buy-to-sell correction. |
| ESTATE-S10 | retain_turns_replace_evaluation | Optional email refusal. |
| ESTATE-S11 | retain_turns_replace_evaluation | Missing required phone prevents handoff. |
| ESTATE-S12 | retain_turns_replace_evaluation | Exact room fact and resume. |
| ESTATE-S13 | retain_turns_replace_evaluation | Exact-record no-invention replaces filler-listing evaluation. |
| ESTATE-S14 | retain_turns_replace_evaluation | Truthful zero-match. |
| ESTATE-S15 | retain_turns_replace_evaluation | Correct false property price. |
| ESTATE-S16 | retain_turns_replace_evaluation | Corrected payload plus definite failure. |
| ESTATE-S17 | retain_turns_replace_evaluation | Duplicate prevention. |
| ESTATE-S19 | retain_turns_replace_evaluation | Success path and non-overclaiming. |
| ESTATE-S20 | retain_turns_replace_evaluation | Adversarial confirmation phrase. |

## 6-10. Scenario Changes and Counts

Retained unchanged user turns but replaced evaluation:

- P01: all retained active historical P01 scripts except the split CRAIG-S02 and retired CRAIG-S21.
- P02: all historical P02 scripts were retained; ESTATE-S13 changed evaluation semantics to exact-record no-invention.

Revised/split/retired:

- CRAIG-S02 split into P01-V2-S02 and P01-V2-S03.
- CRAIG-S21 retired from active v2 as redundant.
- P02-V2-S17 added for outcome_unknown.

Final counts:

- P01-v2: 20 scenarios.
- P02-v2: 17 scenarios.

## 11. Requirement Coverage Matrix

P01:

| Scenario | Requirements |
| --- | --- |
| P01-V2-S01 | P01-R01, R02, R03, R04, R07, R15, R17 |
| P01-V2-S02 | P01-R02, R04, R06, R08, R09, R15, R17 |
| P01-V2-S03 | P01-R03, R04, R08 |
| P01-V2-S04 | P01-R10, R11, R12, R15, R17 |
| P01-V2-S05 | P01-R14, R15, R17 |
| P01-V2-S06 | P01-R13, R15, R16, R17 |
| P01-V2-S07 | P01-R09, R10, R15, R17 |
| P01-V2-S08 | P01-R03, R04, R07, R15, R17 |
| P01-V2-S09 | P01-R03, R05, R17 |
| P01-V2-S10 | P01-R04, R05, R14, R15, R17 |
| P01-V2-S11 | P01-R03, R06, R15, R17 |
| P01-V2-S12 | P01-R03, R05, R10, R17 |
| P01-V2-S13 | P01-R12, R15, R17 |
| P01-V2-S14 | P01-R11, R15, R17 |
| P01-V2-S15 | P01-R02, R15, R16, R17 |
| P01-V2-S16 | P01-R15, R16, R17 |
| P01-V2-S17 | P01-R15, R16, R17 |
| P01-V2-S18 | P01-R03, R05, R09, R10, R17 |
| P01-V2-S19 | P01-R03, R04, R11, R12, R14, R15, R17, R18 |
| P01-V2-S20 | P01-R03, R15, R17, R19 |

P02:

| Scenario | Requirements |
| --- | --- |
| P02-V2-S01 | P02-R01, R02, R03, R09, R17 |
| P02-V2-S02 | P02-R01, R04, R09, R14, R17 |
| P02-V2-S03 | P02-R01, R05, R17 |
| P02-V2-S04 | P02-R01, R03, R10, R17 |
| P02-V2-S05 | P02-R03, R10, R17 |
| P02-V2-S06 | P02-R01, R05, R10, R17 |
| P02-V2-S07 | P02-R11, R17 |
| P02-V2-S08 | P02-R11, R14, R15, R17 |
| P02-V2-S09 | P02-R03, R06, R10, R17 |
| P02-V2-S10 | P02-R02, R07, R08, R17 |
| P02-V2-S11 | P02-R03, R07, R17 |
| P02-V2-S12 | P02-R02, R06, R17 |
| P02-V2-S13 | P02-R10, R12, R13, R14, R15, R17 |
| P02-V2-S14 | P02-R14, R15, R16, R17 |
| P02-V2-S15 | P02-R11, R13, R14, R15, R17 |
| P02-V2-S16 | P02-R12, R14, R15, R17 |
| P02-V2-S17 | P02-R12, R13, R14, R15, R17 |

## 12. Neutral Raw-Run Schema

Defined in `benchmarks/evaluator-v2/schema.ts` as `NeutralRawRunV2`.

It supports:

- schema version
- application id
- implementation id
- framework id
- scenario id
- repeat id
- conversation turns
- requested/reported model metadata
- canonical final state
- canonical per-turn state
- deterministic computation results
- retrieval and record observations
- exact selected record ids
- action requests
- confirmation requests/resolutions
- exact action payload
- executor dispatch count
- terminal action result: success, definite_failure, outcome_unknown
- stop reason
- runtime/provider errors
- timing
- model-call count
- token usage
- optional native trace

## 13. Deterministic Assertion Types

Implemented in `benchmarks/evaluator-v2/deterministic/assertions.ts`:

`state_equals`, `state_absent`, `state_one_of`, `numeric_close`, `numeric_range`, `record_ids_exact`, `record_count`, `record_field_equals`, `action_not_requested`, `action_requested`, `dispatch_count`, `action_args_exact`, `action_args_subset`, `confirmation_requested`, `confirmation_payload_exact`, `action_outcome`, `stop_reason`, `runtime_error_absent`, `contains_source_fact`, `custom`.

## 14. Semantic Judge Rubric and Output Schema

Implemented in `benchmarks/evaluator-v2/semantic/judge.ts`.

Prompt version: `semantic-judge-v1`.

The judge receives scenario/user turns, source facts, rubric items, assistant turns, and relevant deterministic observations. It must return `SemanticJudgeOutput` with requirement-level scores:

- 0 = violated
- 1 = partially satisfied or ambiguous
- 2 = satisfied

Each result includes confidence, reason, and cited assistant turns. Hard safety violations are listed separately and are not averaged away.

## 15. Pairwise Judge Rubric and Blinding Method

Implemented in `benchmarks/evaluator-v2/pairwise/judge.ts`.

Prompt version: `pairwise-judge-v1`.

Candidates are labeled A/B. Order is randomized deterministically from a recorded seed. Framework names, implementation ids, historical scores, and regex expectation phrases are not included in prompts. Pairwise verdicts are separate research outputs and do not override deterministic hard failures.

## 16. Manual Audit Trigger Rules

Implemented in `benchmarks/evaluator-v2/audit/queue.ts`.

Triggers:

- deterministic assertion vs semantic judge disagreement
- semantic low confidence
- pairwise contradiction
- hard semantic violation
- invalid or inconclusive run
- random sample of otherwise clean runs

## 17. Invalid-Run Classification

Implemented in `benchmarks/evaluator-v2/validity.ts`.

Infrastructure invalid examples:

- wrong requested model
- silent model substitution
- provider schema rejection before subject behavior
- provider outage/transport failure before subject behavior
- corrupted raw artifact
- evaluator crash
- missing required benchmark setup

Subject failures are not invalidated: wrong reasoning, wrong query, bad tool args, missed correction, invention, unsafe action request, false success claim, or failed business action.

## 18. Repeated-Run Aggregation Design

Implemented in `benchmarks/evaluator-v2/aggregate.ts`.

The unit is `scenario x implementation x repeat`. Aggregation reports separate metrics for hard deterministic pass rate, soft deterministic pass rate, semantic satisfaction, hard semantic violations, runtime-invalid rate, model calls, tokens, latency, and dispatch count. It does not treat repeats as extra scenarios.

## 19. Calibration Fixture Results

Fixtures are in `benchmarks/evaluator-v2/fixtures/calibration.ts`.

| Fixture | Expected category |
| --- | --- |
| cal-p01-volume-correct | deterministic pass, semantic satisfied |
| cal-p01-volume-wrong | deterministic hard_fail, semantic violated |
| cal-p01-partial-code | semantic partial |
| cal-p02-zero-match | truthful zero-match, semantic satisfied |
| cal-p02-invented-near-match | hard semantic violation |
| cal-p02-action-success | deterministic pass, semantic satisfied |
| cal-p02-false-success | hard semantic violation |
| cal-p02-correction-honored | semantic satisfied |
| cal-p02-correction-ignored | hard semantic violation |

Offline tests validate parser and evaluator behavior against these fixture categories. Live judge calibration is left to the explicit canary/freeze workflow.

## 20. Unit and Typecheck Results

Executed with bundled Node because `npm` was not on the shell PATH:

```text
/Users/linzhenglin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --experimental-strip-types benchmarks/evaluator-v2/tests/*.test.ts
Result: 21 tests passed.

/Users/linzhenglin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
Result: passed.

/Users/linzhenglin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --experimental-sqlite --experimental-strip-types core/tests/*.test.ts providers/gemini/tests/*.test.ts integrations/strands/tests/*.test.ts benchmarks/*.test.ts benchmarks/evaluator-v2/tests/*.test.ts examples/*.test.ts
Result: 219 tests passed.

/Users/linzhenglin/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/git diff --check
Result: passed.
```

## 21. Live Judge Canary Result

Command:

```text
/Users/linzhenglin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --env-file-if-exists=.env --experimental-strip-types benchmarks/evaluator-v2/canary.ts
```

Result:

```json
{
  "status": "skipped",
  "reason": "BENCHMARK_JUDGE_MODEL and GEMINI_API_KEY or GOOGLE_API_KEY are required for the live judge canary"
}
```

No root `.env` was present, so the canary correctly skipped rather than pretending to pass.

## 22. Subject/Core Preservation Confirmation

Confirmed:

- Agent_SDK core runtime architecture was not modified.
- benchmark-rebuild-v1 P01/P02 subject prompts, tools, knowledge, field descriptions, and model settings were not modified.
- Historical P01/P02 scenarios, regex evaluator, results, and benchmark-rebuild-v1 artifacts remain available.
- Old results were not rewritten or re-presented as v2 scores.
- Agenerateor was unavailable and unused. No Agenerateor implementation details were requested, inferred, reconstructed, or searched.

## Explicit Answers

| Question | Answer |
| --- | --- |
| A. Did any scenario change because Arrokothai historically succeeded or failed it? | NO. |
| B. Does evaluator-v2 depend on Agent_SDK event types for correctness? | NO. |
| C. Can an implementation with less internal tracing still be evaluated fairly? | YES, for source-backed observable requirements; unavailable optional instrumentation becomes not_applicable or inconclusive where justified. |
| D. Are deterministic state/action/numeric checks separated from semantic judgment? | YES. |
| E. Is pairwise judging blinded to framework identity and randomized? | YES. |
| F. Can infrastructure-invalid runs be distinguished from genuine subject failures? | YES. |
| G. Are legacy P01/P02 scenarios/evaluator/results preserved? | YES. |
| H. Are P01-v2/P02-v2 changes individually source-justified? | YES. |
| I. Was Agenerateor unavailable and unused during evaluator/scenario design? | YES. |
| J. Are benchmark-rebuild-v1 subject prompts/configuration untouched? | YES. |
