# Development

This directory records the implemented baseline, active migration plan and evidence. Architecture
is owned by [Mental model](../mental-model.md), [Kernel](../kernel.md), [Execution](../execution.md)
and [Deployment](../deployment.md).

| Document | Role |
|---|---|
| [Roadmap](001-current-status-and-roadmap.md) | Active K0–K5, R1/R2, D1 and S1 slices, linked evidence gates; K0 is next |
| [Implemented baseline](002-implemented-kernel-baseline.md) | Actual 0.8.x surface and useful source/tests; no target recovery claim |
| [Findings](003-evidence-and-findings.md) | Existing implementation defects, historical results and current disposition |
| [Architecture review](004-architecture-review.md) | 2026-09-08 decisions, inspected prior art, unresolved questions and old-plan disposition |
| [Legacy](legacy/) | Superseded plans; historical evidence, never an additional active sequence |

The target uses asynchronous Activation/Outcome exchange with opaque Runtime progress. Current code
still uses `Harness`, synchronous controller invocation, Agent/Workflow progress kinds and
Kernel-owned `ControllerResumption`. Documentation adoption implements none of that migration.

K1 establishes the new boundary with fakes, K2 closes action acceptance, K3 proves one persistent
profile and K4/K5 establish composition and operability. Runtime probes start after K1 to challenge
the boundary before persistence investment. Benchmark evidence fixtures precede the relevant slices;
construction infrastructure and model campaigns do not block deterministic Kernel diagnosis.

When implementing a slice, update the code, conformance, baseline and guides together for that slice.
Preserve useful behavior, move Runtime machinery out of Kernel semantics, version incompatible
contracts explicitly, and distinguish tests of current code from future acceptance criteria.
