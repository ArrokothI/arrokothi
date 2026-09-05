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
| What is the **current** benchmark/stabilization checkpoint before Slice H? | [`011-post-corpus-review-and-interactive-user-evaluation-lane.md`](011-post-corpus-review-and-interactive-user-evaluation-lane.md) |
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
4. if the task touches the current pre-H benchmark/v0.8.1 stabilization campaign, read
   [`011`](011-post-corpus-review-and-interactive-user-evaluation-lane.md) **first**, then load
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
stabilization gate. P01-P04 now have all 112 scored cases concretely authored (8 public, 104 evaluation),
while canonical coverage matrices/evaluator mappings and generation readiness remain deliberately blocked.
The current checkpoint is the full-corpus review and fixed-benchmark freeze path in
[`011`](011-post-corpus-review-and-interactive-user-evaluation-lane.md). That note also records a separate,
non-blocking interactive-user realism lane: fixed cases remain canonical, while a deterministic user director
plus LLM surface realizer may be piloted diagnostically after the shared evidence/runtime contracts stabilize.
The original rationale and campaign principles remain in [`008`](008-post-g-benchmark-rebuild-and-stabilization-gate.md),
with provider/quota corrections in [`009`](009-benchmark-provider-and-source-audit-corrections.md) and the
preceding case-authoring checkpoint in [`010`](010-post-reconciliation-benchmark-case-authoring-gate.md).

## Document roles

These documents are engineering syntheses:

- they summarize evidence in current source and tests;
- they may define scoped implementation plans and release checks;
- they must yield to the canonical owner when wording conflicts;
- they must not silently create permanent kernel semantics.

Historical status, package names, and branch claims are intentionally preserved in
[`legacy/`](legacy/README.md). Current work should cite the active synthesis first and descend into
legacy evidence only when necessary.
