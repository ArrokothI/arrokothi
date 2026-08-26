# v2-six-subject-run-1

Canonical retained P01/P02 comparison run.

- [Final report](RESULTS.md)
- [Readable Arrokothai conversations](conversations/arrokothai/README.md)
- [Raw subject evidence](raw/)
- [Deterministic, semantic, and pairwise evaluations](evaluations/)
- [Analysis artifacts](analysis/)
- [Judge plan, responses, metadata, and recovery evidence](judge/)
- [Experiment manifest](manifest.json)
- [Raw corpus checksums](raw-corpus.sha256)

## Experiment contract

The six subjects are `p01-original`, `p01-agenerateor`, `p01-arrokothai`, `p02-original`,
`p02-agenerateor`, and `p02-arrokothai`. They ran 37 scenarios with three repeats by default and
five repeats for consequential scenarios, producing 369 final raw subject traces. The subject model
was `gemini-3.5-flash-lite` at temperature 0.35; the original P02 application did not expose its
temperature. Semantic and pairwise requests were judged by `gemini-3.5-flash` at temperature 0.

Generation commits are frozen in [manifest.json](manifest.json): Agent SDK
`7b580b47ba58aa748d710e9427b4d3208e3f8425`, Agenerateor
`2d9f81ab7e5afee0fb0b00d3d6ca0a9019950be9`, original P01
`0297a5cc43e4fcbc4e8edc7b4d90254cea76a893`, and original P02
`49e33528281ca28c08ac3993778493c3bfaa153c`.

`raw/` contains 369 accepted traces, 388 preserved generation attempts, and 123 Agent SDK native
traces: 880 JSON files total. `raw-corpus.sha256` is the relocation-independent content integrity
ledger. Failed attempts are evidence about generation and are not treated as benchmark outcomes.

`evaluations/deterministic/` contains the accepted corrected deterministic outputs. The correction
summary is [analysis/deterministic-evaluator-correction.json](analysis/deterministic-evaluator-correction.json).
`evaluations/semantic/` and `evaluations/pairwise/` contain 369 materialized outputs each. Their 738
metadata records point to the preserved provider responses selected by
[judge/selection-provenance.json](judge/selection-provenance.json).

All report generation is offline:

```bash
npm run benchmark:evaluate
npm run benchmark:analyze
npm run benchmark:review
npm run benchmark:test
```

Do not overwrite this run when starting a new experiment; pass `--output` to create a new run
directory.
