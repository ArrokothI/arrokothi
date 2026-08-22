# Protocol

- Dataset role: retrospective development-set / regression evidence.
- P01 and P02 AgentDefinitions are frozen. Their SHA-256 hashes are recorded in
  every subject manifest.
- Canonical scenario and grader files are byte-identical to the sources used by
  the 2026-08-22 baseline; their hashes are recorded in the manifests.
- The baseline directory reuses stored bespoke and Agenerateor outputs from
  `triad-v035-2026-08-22T04-55-01-423Z`. Those systems are not rerun.
- The repair directory reruns only Arrokothi against every exact canonical P01
  and P02 scenario.
- All accepted model calls must report `gemini-3.5-flash-lite`; mismatches,
  fallbacks, runtime errors, and provider errors abort the run.
- Email/handoff execution is always the injected `emailDryRun` transport,
  including controlled success and failure cases. No external side effect is
  performed.
- Logical calls, observable token usage, and observable latency are reported as
  a separate efficiency axis. Unknown physical transport attempts remain null.
- Semantic outcomes use the frozen canonical graders. Reliability and semantic
  quality are reported separately; the systematic v0.35 provider failure is
  never converted into a semantic loss.
