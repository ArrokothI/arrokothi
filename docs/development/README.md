# Development

This directory records the implemented baseline, active migration plan and evidence. Architecture
starts at [the mental model](../../mental-model/README.md); the
[reference index](../../mental-model/reference.md) owns concept/mechanism navigation and
[roadmap mapping](../../mental-model/roadmap.md) guides Layer-3 maintenance. Current hosted repository:
[ArrokothI/arrokothi](https://github.com/ArrokothI/arrokothi); historical names and local checkout
paths remain valid evidence locators and are not mass-renamed.

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
| [Structure and evidence sequencing](013-structure-and-evidence-sequencing.md) | Read-only benchmark interlock, rename handling and planned K1.0 after E1 fixture preparation, before K1.1 |
| [Owner progress summary](014-owner-progress-summary.md) | Human-readable account of accepted milestones, what each establishes and does not, and the next steps; rewritten in place after each acceptance |
| [Implemented baseline](002-implemented-kernel-baseline.md) | Actual 0.8.x surface and useful source/tests; no target recovery claim |
| [Findings](003-evidence-and-findings.md) | Existing implementation defects, historical results and current disposition |
| [Architecture review](004-architecture-review.md) | 2026-09-08 decisions, inspected prior art, unresolved questions and old-plan disposition |
| [Detail-design review](005-detail-design-review.md) | Preserved legacy knowledge, refined contracts, future-question disposition and implementation gates |
| [Structural evidence rules](015-structural-evidence-rules.md) | How the K1.0 ownership inventory is read and compared; what a structural pass does not prove |

Retired development material moved to [`docs/legacy/development/`](../legacy/development/README.md),
alongside the retired architecture pages. The two reviews above cite the four-page architecture that
replaced; their links now reach the preserved copy under [`docs/legacy/`](../legacy/README.md), with
the link target repaired and no historical wording changed.

Sealed packet records under `work/` are left exactly as accepted, including their links. The
[K0.1 worksheet](work/K0.1/protocol-worksheet.md) is checked byte-for-byte by
[cited-decisions.test.ts](../../tests/conformance/k0/cited-decisions.test.ts), so editing it — even
to repair a path — breaks the seal that proves the accepted text has not moved. Where such a record
points at `docs/kernel.md`, `docs/execution.md`, `docs/deployment.md` or `docs/detail-design/`, read
the preserved page at the matching name under
[`docs/legacy/architecture/`](../legacy/README.md#what-is-here). Nothing there is current authority.

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

Resolve current acceptance, correction history and release through [007](007-work-packets.md).
Historical worksheets, reports and reviews describe their candidate at the time. K1.0's
accepted structural preparation is not target execution, E1 acceptance or permission to begin K1.1.
