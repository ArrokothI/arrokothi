# Development documentation

This directory is the engineering router for the **ArrokothI agent-kernel 0.8.x development
line**. It records what the repository implements and what framework work comes next; it does not
own architecture semantics.

## Read this first

| Question | Read |
|---|---|
| What is canonical? | [`../README.md`](../README.md), then the canonical concept owner it names. |
| What does the current kernel demonstrably implement? | [`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md) |
| What is the active architecture roadmap? | [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) |
| How should Agent effectiveness/quality work be evaluated? | [`003-agent-effectiveness-guidance.md`](003-agent-effectiveness-guidance.md) |
| What performance and developer-ergonomics constraints apply? | [`004-efficiency-and-developer-ergonomics.md`](004-efficiency-and-developer-ergonomics.md) |
| What MCP baseline exists and what must future protocol work preserve? | [`005-interoperability-baseline-and-next-constraints.md`](005-interoperability-baseline-and-next-constraints.md) |
| What release, brand, and license checks apply? | [`006-ecosystem-integration-brand-and-license-checklist.md`](006-ecosystem-integration-brand-and-license-checklist.md) |
| What friction does an application builder hit on the current kernel? | [`007-application-builder-ergonomics-findings.md`](007-application-builder-ergonomics-findings.md) |
| Where is historical Slice A–G engineering evidence? | [`legacy/`](legacy/README.md) |
| Where is cross-framework benchmark design and execution? | the standalone **`ArrokothI/benchmark`** repository. |

To build an application **on** the kernel rather than change the kernel, start from
[`../guides/agent-workflow-composition/README.md`](../guides/agent-workflow-composition/README.md).

## Routing

```text
canonical architecture            → ../README.md + the canonical owner it names
current implementation evidence   → 002-implemented-kernel-baseline.md
active architecture roadmap       → 001-current-status-and-roadmap.md
Agent effectiveness / evaluation  → 003-agent-effectiveness-guidance.md
performance / developer ergonomics → 004-efficiency-and-developer-ergonomics.md
interoperability baseline         → 005-interoperability-baseline-and-next-constraints.md
ecosystem / brand / license       → 006-ecosystem-integration-brand-and-license-checklist.md
application-builder friction      → 007-application-builder-ergonomics-findings.md
historical Slice A–G evidence     → legacy/
cross-framework benchmark design and execution → ArrokothI/benchmark (separate repository)
```

For ordinary coding or review work:

1. start at [`../README.md`](../README.md) and read the relevant canonical owner;
2. read [`002-implemented-kernel-baseline.md`](002-implemented-kernel-baseline.md) for current
   implementation evidence;
3. read [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md) for current and
   next architecture work;
4. load only the specialized active document (003–007) relevant to the task.

Do **not** load every Slice A–G record into context by default. Those records are historical
engineering evidence under [`legacy/`](legacy/README.md) and are useful only when investigating a
regression, an old review decision, historical rationale, or the origin of a current invariant.

## Benchmark work lives elsewhere

Cross-framework benchmark task/case/evaluator/provider/subject-build policy and execution are owned
by the standalone **`ArrokothI/benchmark`** repository, not by this repository. This repository owns
ArrokothI framework code, examples, and architecture documentation. Benchmark and evaluation
evidence can still inform framework engineering; the framework repository does not generate,
orchestrate, or judge the benchmark.

## Current status

The current package/project development baseline is **ArrokothI agent-kernel 0.8.0**. This version
identifies the pre-1.0 package namespace and development line. It does **not** mean that the old
roadmap's "v0.8 architecture-complete experimental release" gate has been met.

The post-Slice-G verdict is **NO**: portable service contracts, broader interoperability,
progressive heterogeneous discovery, hosted containment/security, durable restart/recovery, and a
whole-architecture integration campaign remain. The dependency-ordered architecture plan (tranches
H–N) is in [`001-current-status-and-roadmap.md`](001-current-status-and-roadmap.md).

## Document roles

These documents are engineering syntheses:

- they summarize evidence in current source and tests;
- they may define scoped implementation plans and release checks;
- they must yield to the canonical owner when wording conflicts;
- they must not silently create permanent kernel semantics.

Historical status, package names, and branch claims are intentionally preserved in
[`legacy/`](legacy/README.md). Current work should cite the active synthesis first and descend into
legacy evidence only when necessary.
