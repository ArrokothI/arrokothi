# Development documentation

This directory is the engineering router for the **ArrokothI agent-kernel 0.8.x development
line**. It records what the repository implements and what work comes next; it does not own
architecture semantics.

## Read this first

| Question | Read |
|---|---|
| What is canonical? | [`../README.md`](../README.md), then the canonical concept owner it names. |
| What does the current kernel demonstrably implement? | [`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md) |
| What is the current status and next roadmap? | [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) |
| What is the **current** benchmark/stabilization checkpoint before Slice H? | [`013-benchmark-subject-build-isolation-and-runtime-boundaries.md`](013-benchmark-subject-build-isolation-and-runtime-boundaries.md) |
| What fixed-corpus / interactive-user policy led into the current checkpoint? | [`011-post-corpus-review-and-interactive-user-evaluation-lane.md`](011-post-corpus-review-and-interactive-user-evaluation-lane.md) |
| What evaluator ownership/hybrid-scoring rule applies when matrices/evaluators are materialized? | [`012-benchmark-evaluator-ownership-and-hybrid-scoring.md`](012-benchmark-evaluator-ownership-and-hybrid-scoring.md) |
| What was the post-reconciliation case-authoring checkpoint that led here? | [`010-post-reconciliation-benchmark-case-authoring-gate.md`](010-post-reconciliation-benchmark-case-authoring-gate.md) |
| What was the original post-G benchmark/stabilization rationale and campaign plan? | [`008-post-g-benchmark-rebuild-and-stabilization-gate.md`](008-post-g-benchmark-rebuild-and-stabilization-gate.md) |
| What provider/quota/source-audit corrections apply to that plan? | [`009-benchmark-provider-and-source-audit-corrections.md`](009-benchmark-provider-and-source-audit-corrections.md) |
| How should Agent quality work be evaluated? | [`003-agent-effectiveness-guidance.md`](003-agent-effectiveness-guidance.md) |
| What efficiency and authoring constraints apply? | [`004-efficiency-and-developer-ergonomics.md`](004-efficiency-and-developer-ergonomics.md) |
| What MCP baseline exists and what must future protocol work preserve? | [`005-interoperability-baseline-and-next-constraints.md`](005-interoperability-baseline-and-next-constraints.md) |
| What release, brand, license, and partnership checks apply? | [`006-ecosystem-integration-brand-and-license-checklist.md`](006-ecosystem-integration-brand-and-license-checklist.md) |
| What friction does an application builder hit on the current kernel? | [`007-application-builder-ergonomics-findings.md`](007-application-builder-ergonomics-findings.md) |

To build an application **on** the kernel rather than change the kernel, start from
[`../guides/agent-workflow-composition/README.md`](../guides/agent-workflow-composition/README.md).

For ordinary coding or review work:

1. start at [`../README.md`](../README.md) and read the relevant canonical owner;
2. read [`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md) for current
   implementation evidence;
3. read [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) for current and
   next architecture work;
4. if the task touches the current pre-H benchmark/runtime/subject-build campaign, read
   [`013`](013-benchmark-subject-build-isolation-and-runtime-boundaries.md) **first**; then load
   [`011`](011-post-corpus-review-and-interactive-user-evaluation-lane.md) for fixed-corpus and interactive-lane policy;
   when the work touches coverage matrices, evaluator mappings, judge prompts, sentinels, or result aggregation,
   also read [`012`](012-benchmark-evaluator-ownership-and-hybrid-scoring.md); then load
   [`010`](010-post-reconciliation-benchmark-case-authoring-gate.md) for the preceding case-authoring gate,
   [`009`](009-benchmark-provider-and-source-audit-corrections.md) for provider/quota/source-audit policy,
   and [`008`](008-post-g-benchmark-rebuild-and-stabilization-gate.md) for the original forensic rationale
   only when needed;
5. load only the specialized active document relevant to the task.

Do **not** load every Slice A–G record into context by default. Those records are historical
engineering evidence under [`legacy/`](legacy/README.md) and are useful only when investigating a
regression, an old review decision, historical rationale, or the origin of a current invariant.

## Current status

The current package/project development baseline is **ArrokothI agent-kernel 0.8.0**. This version
identifies the new pre-1.0 package namespace and development line. It does **not** mean that the old
roadmap's “v0.8 architecture-complete experimental release” gate has been met.

The post-Slice-G verdict is **NO**: portable service contracts, broader interoperability,
progressive heterogeneous discovery, hosted containment/security, durable restart/recovery, and a
whole-architecture integration campaign remain. The dependency-ordered architecture plan is in
[`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md).

Before Slice H becomes the main architecture track, the project is finishing a scoped benchmark and
stabilization gate. P01-P04 have 112 scored cases, frozen coverage/evaluator mappings, and a provider-neutral
controlled-effect + normalized-evidence harness, while generation readiness remains deliberately blocked.
The current checkpoint is [`013`](013-benchmark-subject-build-isolation-and-runtime-boundaries.md): implement
the provider-neutral/OpenAI-compatible runtime, quota/429 handling, per-generation-unit resumability, and the
builder/runtime isolation boundary before framework freeze and subject generation. The canonical subject-build
experiment should resemble normal client development: a strong coding agent receives public product requirements
plus the complete frozen framework checkout and its public docs/manuals, but never receives the benchmark repo root,
hidden cases, evaluator mappings, judge prompts, prior scores, or evaluation-specific hints. Frozen runnable subject
applications live in the benchmark repository; framework implementations remain in their own pinned repositories or
packages. Evaluator materialization follows [`012`](012-benchmark-evaluator-ownership-and-hybrid-scoring.md), and
[`011`](011-post-corpus-review-and-interactive-user-evaluation-lane.md) continues to own the non-blocking interactive-user lane.
The original rationale and campaign principles remain in [`008`](008-post-g-benchmark-rebuild-and-stabilization-gate.md),
with provider/quota corrections in [`009`](009-benchmark-provider-and-source-audit-corrections.md) and the preceding
case-authoring checkpoint in [`010`](010-post-reconciliation-benchmark-case-authoring-gate.md).

## Document roles

These documents are engineering syntheses:

- they summarize evidence in current source and tests;
- they may define scoped implementation plans and release checks;
- they must yield to the canonical owner when wording conflicts;
- they must not silently create permanent kernel semantics.

Historical status, package names, and branch claims are intentionally preserved in
[`legacy/`](legacy/README.md). Current work should cite the active synthesis first and descend into
legacy evidence only when necessary.
