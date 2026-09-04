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
| What benchmark/stabilization gate must be completed before Slice H becomes the main track? | [`008-post-g-benchmark-rebuild-and-stabilization-gate.md`](008-post-g-benchmark-rebuild-and-stabilization-gate.md) |
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
   next work;
4. if the task touches the current pre-H benchmark/v0.8.1 stabilization campaign, read
   [`008`](008-post-g-benchmark-rebuild-and-stabilization-gate.md);
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

Before Slice H becomes the main architecture track, the project is running a scoped benchmark and
stabilization gate: rebuild the benchmark as standalone P01-P04 tasks, repair benchmark-controlled
effect/judge/provenance defects, add Synthetic provider support, harden/freeze the competitor set,
and build a new immutable comparison campaign without mutating the frozen v0.8.0 corpus. That plan
is in [`008`](008-post-g-benchmark-rebuild-and-stabilization-gate.md).

## Document roles

These documents are engineering syntheses:

- they summarize evidence in current source and tests;
- they may define scoped implementation plans and release checks;
- they must yield to the canonical owner when wording conflicts;
- they must not silently create permanent kernel semantics.

Historical status, package names, and branch claims are intentionally preserved in
[`legacy/`](legacy/README.md). Current work should cite the active synthesis first and descend into
legacy evidence only when necessary.
