# Evidence and reproduction

[Study home](../README.md). Captured on 2026-09-07 on local macOS/arm64 with Node v25.2.1. Exact source revisions and host details: [manifest](source-manifest.json).

## Executed checks

Commands ran from the `agent-kernel` repository root. Output is preserved verbatim except for filenames used to retain it.

| Command | Output | Exit/result |
|---|---|---|
| `npm test` | [kernel-tests.txt](kernel-tests.txt) | 0; 965 tests passed. |
| `npm run test:evals` | [agent-evals.txt](agent-evals.txt) | 0; 12 tests passed. |
| `npm run typecheck` before setup repair | [typecheck-initial.txt](typecheck-initial.txt) | Nonzero; unresolved `@arrokothi/sdk` and resulting inference errors. |
| `npm run test:example:execution-kernel` before repair | [examples-initial.txt](examples-initial.txt) | Nonzero; unresolved SDK package. |
| `npm run typecheck` after repair | [typecheck.txt](typecheck.txt) | 0. |
| `npm run test:example:execution-kernel` after repair | [examples.txt](examples.txt) | 0; 18 tests passed. |
| `npm run check:builder-docs` after repair | [builder-docs.txt](builder-docs.txt) | 0. |
| `node --experimental-strip-types docs/architecture-strategy-study/evidence/store-copy-probe.mjs` | [store-copy-results.json](store-copy-results.json) | 0; reference-store diagnostic. |

### Local setup repair

The repository declared `packages/sdk` as a workspace, but `node_modules/@arrokothi/sdk` did not exist. Attempting `npm install --offline --ignore-scripts --package-lock=false` failed with `ETARGET`, resolving `@aws-sdk/credential-provider-env@^3.972.70` from the available offline metadata. No conclusion about online package availability follows from that failure.

A local symlink was then created with `ln -s ../../packages/sdk node_modules/@arrokothi/sdk`. This restored the declared workspace relationship; no package source or lockfile was changed. The subsequent checks passed. A clean online installation, publish/install consumer test, and supported Node-version matrix were not run. Do not convert this evidence into a claim that release packaging was fully verified.

### Probe interpretation

[The probe source](store-copy-probe.mjs) imports the actual reference store, seeds retained emission records in one transaction, warms it three times, and measures twenty no-op transactions per population. Each retained emission contains 8,192 text characters; the count varies from zero to 5,000. Records are a storage fixture, not full runnable applications. The no-op callback touches no facets, isolating mandatory transaction snapshot work.

The result supports the source observation that `InMemoryRuntimeStore.transact` clones the entire store, making an unrelated transaction more expensive as retained state grows. The run overlapped other validation processes, has no GC isolation or repeated independent trials, and supplies neither stable tail percentiles nor real application throughput. The field named `p95Ms` is the sample's selected order statistic, not a reliable production p95 estimate. Its useful conclusion is the cost mechanism and direction, not the precise latency ratio.

## What was not executed

No upstream repository test suites, paid/live model canaries, sealed comparative benchmark campaign, operating-system isolation campaign, or actual kernel process-death recovery experiment was run. Upstream test references in the reports are source-inspection evidence. R1–R3 recovery findings are code-grounded risks and design gaps, not fabricated crash results. Proposed E0–E7 experiments remain future work.

Only the study directory and ignored local dependency setup were changed. Kernel implementation, canonical documents, current roadmap, benchmark source, and competitor source were left unchanged. Raw test output can contain historical test-description wording; the reports do not treat every test label as an independently established product guarantee.

## Study integrity check

[verify-study.py](verify-study.py) checks local Markdown targets, trailing whitespace, exact source HEADs, and unchanged peer repositories. [The recorded result](verification.json) is PASS. It does not mechanically prove that every source supports its associated interpretation; those claims were reviewed against the cited mechanisms.
