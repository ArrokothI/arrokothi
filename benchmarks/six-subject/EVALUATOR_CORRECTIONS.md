# Deterministic evaluator corrections

The canonical run was generated once, then evaluated with four rounds of deterministic evaluator
corrections on 2026-08-23. No subject was rerun, no raw trace was edited, and the semantic rubric was
kept frozen. The accepted evaluator identity is `evaluator-v2-hotfix.4`.

The machine-readable correction record is
[`../runs/v2-six-subject-run-1/analysis/deterministic-evaluator-correction.json`](../runs/v2-six-subject-run-1/analysis/deterministic-evaluator-correction.json).

## Corrections

1. Canonical P02 action names and payload fields replaced stale aliases. Generation health counts
   were relabeled so operational terminal signals were not described as benchmark performance.
2. Confirmation checks compare the frozen confirmation payload to the dispatched action payload,
   rather than to scenario expectations. Free-form contact time is normalized before comparison.
3. Representation defects were fixed without expanding the rubric: missing confirmation/dispatch
   evidence stays explicit, prices are resolved across supported record shapes, and causal claims
   unsupported by the traces were removed.
4. Computed values are resolved from canonical runtime evidence with an explicit numeric fallback.
   A contamination gate prevents known-false deterministic observations from entering semantic
   judge prompts.

Regression tests cover every correction in `tests/hotfix-2026-08-23*.test.ts`. The final offline
evaluation processed all 369 accepted units, produced zero invalid units, and found no requested or
provider-reported subject-model provenance mismatches.

## Frozen provenance

- generation scenario tree: `3f15e2ad5c35bd66e4d24a5d19b961858e187034f2b473aaa4bd9940f3d2e4e7`
- generation evaluator tree: `20166c554085c0d62b23703baa37ae799821c3bc56edc49478e885a96748ffa9`
- corrected scenario tree: `35a570cf4a7d9f8b44e746d09b826c43368852445c44e864f28a752698d87491`
- corrected evaluator tree: `f42808721ec970b8d062f245c754dcdf0a2c0b2f963df62fc3b13e69903f9197`

These hashes identify the historical generation/evaluation boundary. The current implementation was
relocated into `benchmarks/six-subject/`; the hashes are not expected to describe the cleanup tree.
