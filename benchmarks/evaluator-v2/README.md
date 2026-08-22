# Evaluator V2

Evaluator-v2 is a framework-neutral measurement system for P01/P02 raw runs. It grades source-backed requirements, not historical regex phrases.

## Neutral Raw Run

The schema in `schema.ts` accepts runs from original bespoke apps, current framework builds, or future implementations. The fundamental unit is:

```text
scenario x implementation x repeat
```

The raw run can include conversation turns, requested/reported model metadata, canonical final/per-turn state, deterministic computations, retrieval/record observations, selected record ids, action requests, confirmation requests, exact payloads, dispatch count, terminal action result, stop reason, runtime errors, timing, token usage, and optional native trace.

Missing optional instrumentation is not automatically a failure. If a requirement cannot be fairly observed, the corresponding assertion may be `not_applicable` or `inconclusive`; subject mistakes remain subject failures.

## Layers

1. Deterministic assertions: typed primitives in `deterministic/assertions.ts`.
2. Semantic LLM judge: prompt construction and structured output parsing in `semantic/judge.ts`.
3. Blinded pairwise judge: deterministic A/B randomization in `pairwise/judge.ts`.
4. Manual audit queue: disagreement, low-confidence, hard-violation, invalid-run, pairwise-contradiction, and random clean-run sampling in `audit/queue.ts`.

## Deterministic Primitives

Supported primitives:

- `state_equals`
- `state_absent`
- `state_one_of`
- `numeric_close`
- `numeric_range`
- `record_ids_exact`
- `record_count`
- `record_field_equals`
- `action_not_requested`
- `action_requested`
- `dispatch_count`
- `action_args_exact`
- `action_args_subset`
- `confirmation_requested`
- `confirmation_payload_exact`
- `action_outcome`
- `stop_reason`
- `runtime_error_absent`
- `contains_source_fact`
- `custom`

Numeric assertions require explicit tolerance or range. Payload assertions compare normalized typed values, not rendered prose.

## Judge Configuration

Live semantic and pairwise judging is explicit. Set:

```text
BENCHMARK_JUDGE_MODEL=gemini-3.5-flash
GEMINI_API_KEY=...
```

The evaluator does not silently fall back to another model. Prompt versions are:

- `semantic-judge-v1`
- `pairwise-judge-v1`

Judge prompts are checked for framework leakage terms such as framework names, historical score labels, and regex-expectation language.

## Commands

With Node on PATH:

```bash
npm run test:evaluator-v2
npm run evaluator:canary
```

In this desktop runtime, equivalent direct commands are:

```bash
/Users/linzhenglin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test --experimental-strip-types benchmarks/evaluator-v2/tests/*.test.ts
/Users/linzhenglin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --env-file-if-exists=.env --experimental-strip-types benchmarks/evaluator-v2/canary.ts
```

Normal unit tests never invoke a live model. The canary reports `skipped` when credentials or `BENCHMARK_JUDGE_MODEL` are missing.

## Outputs

Evaluator-v2 reports separate metrics:

- deterministic hard-requirement pass rate
- deterministic soft-requirement pass rate
- semantic requirement satisfaction
- hard semantic violation count
- pairwise win/tie/loss
- action safety correctness
- grounding correctness
- correction handling
- task completion
- runtime-invalid rate
- model calls
- tokens
- latency
- dispatch count

It intentionally does not compute one weighted master score.
