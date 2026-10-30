# Group review 19 — reviewer-03 presentation and N-family routes

2026-10-30, Codex GPT-6; origins 1,129–1,157, historical pin
66bc041175e6fc191c2e7cf88de198111e7d97c9; current reading at 85adabcf.
12 retirement readings / 17 extraction-origin plans: totals 1,021 / 136.
**Eight distinct new-test groups / 132 adoptions**, combined 140 with separate caps.
Two test groups and one adoption added; all remain unbuilt. Cumulative projections
are ceil(8 / 1,157 × 1,518) = 11 tests and ceil(132 / 1,157 × 1,518) = 174 adoptions.
Latest-300 baseline at 857 is five/130: three new tests and two new adoptions give
ceil(8 + 3/300 × 361) = **12** and ceil(132 + 2/300 × 361) = **135**. Both remain
within the caps. All measured adoption runtime remains **250.717 seconds**; no new
execution. 67 cases built / 65 planned, plus retained shared variants.

Read the report/guide contexts, complete N1–N10 runner and every sealed result row.
Current renderer, recovery/Outcome call sites, captureAttempt, both registries and
maintained diagnostic/capture/Outcome tests were inspected. Scope is the supplied
counterexamples, not a universal diagnostic formatting audit.

## New work needed

- **N3, new test:** recovery control still calls explainDiagnosticIssues with false.
  A malformed recovery request must omit issue messages while preserving path/code,
  refusal-only state and later answerability. Existing tests check bounds and positive
  substrings; none forbids the parenthesized message. The whole-result fault oracle
  derives its reference from the same implementation, so it does not specify this
  presentation rule. The still-unique production switch is recorded for a future
  distinguishing mutant. No product behavior changes.
- **N5, new test:** a located issue with root progress and path [0] must render
  progress[0], not progress.[0]. Existing count tests precompose progress[0] without
  a root; dotted-path tests use ordinary member names; consumer regexes allow any
  nonspace suffix. Pin the complete rendering and a dotted-member control. This is
  a different input/operation/result from recovery-message omission.
- **N6, one adoption:** the current explainOutcomeIssues true/false switch affects
  the existing passing Effect-bearing Outcome leaf, whose assertion requires the
  explicit unsupported-Effect message. SDK wrapper message tests call the lower
  helper directly and would not distinguish this call-site mutation. Neither current
  registry edits this switch; retain one new case in the existing registry.

All three current anchors are unique. The operations and DEC-5 message/path distinctions
remain live. Reconfirm at build C, run new tests on unchanged product code, and stop
if they expose a defect. No pass, qualified kill or completed extraction is claimed.

## Other members and individual relocation readings

| Member | Current route |
|---|---|
| N1 | The old issues.length threshold is now additional > 0. Change it to > 1. Same nine-issue/single-suffix result as g1; retain a new variant there. |
| N2 | The old issues.length subtraction is now weighted additional. Substitute counts.length at the current output. Same independently weighted mixed-code result as g3. |
| N4 | Original code-match anchor is unique; merge all codes into one. Retain as another g3 variant. |
| N7 | Original appendRootIssues loop anchor remains. Truncating after eight entries drops the weighted suffix and shares g9's upstream-root evidence result. |
| N8 | Original detail/else span remains. Counting details again changes g1's exact nine-issue result; retain that variant. |
| N9 | The redelivery-held unbounded identity is exactly the already-counted D35 relocation. |
| N10 | Current captureAttempt observes only activationId/writerEpoch, producing at most two issues with fixed bounded paths and no root/occurrences metadata. The two renderers emit the same path/code pairs there. Source-based equivalence remains pending P1 binding; no kill. |

[Applicability 19](family-applicability-19.json) retains each route and replacement.
The five new shared variants live in the existing group records' additional_variants
fields and must be built/validated along with those groups; case counts do not erase
variants. Family closure waits for all required routes. Earlier identity, original
ablation and diagnostic plans remain unchanged; the artifact guide takes its most
demanding mixed disposition.

Only human origin state/triage fields changed in adoption.json, with every other
origin field and derived table compared unchanged. No product/historical edit,
regeneration, P3 completion, self-audit, mappings_complete, final C/H or CI. Resume
origin 1,158 at review-04.md:64, mention-f463c7b45c65bddaa0b1e587.
