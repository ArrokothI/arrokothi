# Development

This directory records the implemented baseline, active migration plan and evidence. Architecture
is owned by [Mental model](../mental-model.md), [Kernel](../kernel.md), [Execution](../execution.md)
and [Deployment](../deployment.md).

| Document | Role |
|---|---|
| [Roadmap](001-current-status-and-roadmap.md) | K0–K5, R1/R2, D1 and S1 milestone obligations and evidence gates |
| [Development process](006-development-process.md) | Actor permissions, review states, Git/evidence handoff and owner discussion |
| [Work packets and status](007-work-packets.md) | Bounded sub-slices, dependencies and authoritative status ledger and successor release holds |
| [Implementation report](008-implementation-report.md) | Standard candidate report and review record requirements |
| [Role launchers](009-universal-prompts.md) | Short coding, independent-review and administrative entry points |
| [Pipeline planning assessment](010-pipeline-planning-assessment.md) | Historical pre-K0.1 planning assessment and validation limits |
| [K0.1 process retrospective](011-k0.1-process-retrospective.md) | Twelve-round evidence, workflow diagnosis and redesign rationale |
| [Review methods](012-review-methods.md) | Claim-specific coverage and semantic correction closure |
| [K0.1 integration receipt](work/K0.1/integration-01.md) | Verified main integration, owner closure and K0.2 hold |
| [Implemented baseline](002-implemented-kernel-baseline.md) | Actual 0.8.x surface and useful source/tests; no target recovery claim |
| [Findings](003-evidence-and-findings.md) | Existing implementation defects, historical results and current disposition |
| [Architecture review](004-architecture-review.md) | 2026-09-08 decisions, inspected prior art, unresolved questions and old-plan disposition |
| [Detail-design review](005-detail-design-review.md) | Preserved legacy knowledge, refined contracts, future-question disposition and implementation gates |
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

K0.1 is accepted and integrated. K0.2 remains unimplemented and unreleased; the owner requested
this process review before considering its release. Historical K0.1 worksheet/report/review status
statements describe their candidate at the time; 007 and the separate integration receipt own current
status. The process redesign is a candidate for owner inspection, not its author's independent ACCEPT.
