# Projection 11 — source triage complete

2026-10-31, implementing Codex GPT-6, under [owner choice 11](owner-choice-11.md).
Source readings finish at origin 1,518 in [batch 33](triage-batch-33.md).

| Measure | Final count / projection | Owner cap |
|---|---:|---:|
| Distinct P1-G groups requiring new tests | 15 | 25 |
| Mutation adoptions against existing leaves | 152 | 250 |
| One measured full pass of the 67 built cases | 172.750 seconds | 600 seconds |

The reading population is 1,274 retired origins, 216 extraction-origin plans and
28 existing-mapping revalidation plans. Source triage is complete, so the count
projections equal the observed counts. The 67 built adoptions contain 69 mutants.
The remaining 85 adoptions and shared variants still need builds and qualification.
No runtime is extrapolated for them.

The runtime measurement used a fresh `git clone --no-local` at
`577c37b2967743af71e8ce4c4603a9d0b26d6b3e`, followed by `npm ci`, with Node v26.10.0.
All 67 controls passed and all 69 mutants received qualified kills in one pass.
The 172.750 seconds span the complete case loop, including result serialization.
Per-case times total 172.338 seconds. Clone, installation and shared-source loading
precede the timer. Pristine checks passed before and after the actual case pass.
The launcher preflight refusal ran no case and is recorded separately.

[Per-attempt ledger](adoption-runtime-11.json) keeps every case duration and outcome,
with raw-output digests. [The previous ledger](adoption-runtime-09.json) remains
unchanged and retains its failed setups and retries. Its cumulative 250.717 seconds
is historical effort, not the full-pass cap measurement.

All three caps pass. Continue the test/adoption and P3 builds, P1 bindings and
supported regeneration, then the n=50/seed=20261026 self-audit, mappings_complete,
final fresh-clone verification, CI dispatch without polling and subsequent H.
Product, historical-evidence, new-defect and audit stops remain in force. This is
an implementer checkpoint, with TOOLS-02 IN_PROGRESS.
