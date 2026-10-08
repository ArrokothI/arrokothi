# TOOLS-01 — execution-profile clarification

Recorded 2026-10-02 by the Codex coding-agent session (GPT-6 per session instructions; serving
variant unavailable), from the owner's answer to design 02 D02-Q1 in this conversation.

The question identified the audit inventory's credentialed/paid provider canaries and approximately
0.5 GiB string/timing experiments, and proposed keeping them in separately executed profiles while
running the deterministic corpus by default. The owner selected, verbatim:

> 分開 profile；全部保留來源與未執行狀態（建議）

Therefore the default verification requires the deterministic tooling/corpus, registered mutations,
ordinary repository tests and standalone fault/poison sweeps. Live-provider and large-memory/timing
experiments retain their source mappings and commands in separate profiles, and the default summary
must explicitly report them as not run. This does not shrink the source inventory, claim their
execution, release any Kernel hold, approve a dependency or authorize paid execution. P1/P2 remain
mandatory; independent acceptance is still the owner's separate review step.
