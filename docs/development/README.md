# Development

Read the [mental model](../../mental-model/README.md) for architecture and the
[guide map](../guides/README.md) for the supported 0.8.x SDK. This directory owns current
implementation facts, migration scope, review policy and status.

| Document | Role |
|---|---|
| [Implemented baseline](002-implemented-kernel-baseline.md) | What the code currently provides |
| [Roadmap](001-current-status-and-roadmap.md) | K0–K5, R1/R2, D1 and S1 obligations and gates |
| [Work packets and status](007-work-packets.md) | Packet scope, current acceptance, integration and release |
| [Owner summary](014-owner-progress-summary.md) | A short account of what works and what comes next |
| [Findings](003-evidence-and-findings.md) | Known gaps and their dispositions |
| [Development process](006-development-process.md) | Actor permissions, review and handoff |
| [Report template](008-implementation-report.md) | Candidate, review and integration record fields |
| [Role launchers](009-universal-prompts.md) | Coding, independent-review and cleanup entry points |
| [Review methods](012-review-methods.md) | Coverage and semantic correction closure |
| [Structure and evidence sequencing](013-structure-and-evidence-sequencing.md) | Retained benchmark interlock and extraction constraints; its old status is historical |
| [Kernel ownership](kernel-ownership.md) | Live machine-checked source/export/dependency inventory |
| [Structural evidence rules](015-structural-evidence-rules.md) | How that inventory is read and compared |
| [Historical evidence and retention](archive.md) | Pinned history, cloud-upload archive, verification and retirement rules |

`work/` contains active maintenance/implementation records. Closed K0/K1.0/K1.1 packet rounds and
retired design studies are in the archive; links to them pin the pre-cleanup Git revision. The two
sealed K0 decision/specification inputs remain under `tests/fixtures/k0/`. Current specification never
requires reconstructing a rule from an old review. Preserve sealed bytes when archiving.

The target uses asynchronous Activation/Outcome exchange with opaque Runtime progress. The supported
SDK still uses the legacy core; the private target package currently supplies creation, ingress,
reservation and dispatch only. Resolve all current acceptance and release through 007.

When implementing a packet, maintain its code, conformance, baseline and affected guides together.
Retire replaced legacy material only when its consumers have migrated or its support is explicitly
withdrawn; identify remaining retirement owners instead of keeping obsolete material indefinitely.
