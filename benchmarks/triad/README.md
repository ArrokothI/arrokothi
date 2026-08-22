# P01/P02 controlled triad benchmark

This directory is the consolidated home for the retrospective P01/P02
development-set benchmark. Canonical scenarios and graders live under
`canonical/`; `runner/` contains the Arrokothi-only compatibility runner; and
`results/` separates stored third-party baselines, the compact v0.35 framework
failure, and the v0.35.1 repair run.

The v0.35 semantic result is **framework-blocked / inconclusive**. Its 36/36
primary and 8/8 stability failures are runtime-reliability evidence, not 44
semantic losses. The v0.35.1 directory is a fresh Arrokothi-only run. Stored
bespoke and Agenerateor outputs were not rerun.

The legacy `benchmarks/triad-v035` tree is pending deletion: its unique evidence
has been migrated and verified here, but the repository cleanup command was
blocked by the execution safety reviewer. It remains Git-recoverable and should
not be treated as an additional canonical source.

Run the repaired subject with:

```sh
npm run bench:triad-arrokothi
```

The runner requires Agent_SDK's root `.env`, enforces
`gemini-3.5-flash-lite`, uses only injected dry-run side-effect transports, and
stops on any runtime/provider failure or model mismatch.
