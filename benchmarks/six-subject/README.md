# Six-subject benchmark implementation

The benchmark compares three implementations for each of two applications: the original
application, Agenerateor, and Arrokothai/Agent SDK. Scenario definitions, subject adapters,
deterministic assertions, semantic judging, pairwise judging, analysis, and conversation rendering
are colocated here.

`src/subjects/` contains only the current Agent SDK subject definitions and runner. The original and
Agenerateor applications are invoked through adapters from sibling repositories when generation is
run. Tests and judge fixtures live beside the implementation.

## Pipeline

```bash
npm run benchmark:generate -- --output=/path/to/new-run
npm run benchmark:evaluate -- --output=/path/to/new-run
npm run benchmark:judge -- --output=/path/to/new-run
npm run benchmark:judge -- --output=/path/to/new-run --submit-batch
npm run benchmark:judge -- --output=/path/to/new-run --collect-batch
npm run benchmark:analyze -- --output=/path/to/new-run
npm run benchmark:review -- --output=/path/to/new-run
```

Generation requires explicit `GEMINI_API_KEY`, `GEMINI_MODEL`, and `--output`. Judging additionally
requires `BENCHMARK_JUDGE_MODEL` and also requires `--output`. These mutating live-call stages
refuse to use the default canonical path. Evaluation, analysis, review rendering, and all benchmark
tests are offline. Offline commands default to the canonical retained run at
`benchmarks/runs/v2-six-subject-run-1`; use a separate `--output` path for new experiments.

Deterministic evaluation consumes only frozen raw traces. Semantic and pairwise judging use a
frozen request plan and preserve provider responses, submission mapping, selection provenance,
normalization metadata, and materialization hashes. Analysis verifies those inputs before writing
the report.

Evaluator corrections made after generation are documented in
[EVALUATOR_CORRECTIONS.md](EVALUATOR_CORRECTIONS.md) and are covered by regression tests.
