# Historical development material

Use the [active roadmap](../001-current-status-and-roadmap.md) for work and the
[findings register](../003-evidence-and-findings.md) for unresolved issues. Archived status/next-step
language is checkpoint history, not current authority.

## Pre-redesign roadmap

[2026-09 P1–P7/B1–B3](2026-09-pre-redesign-roadmap.md) preserves the plan preceding the asynchronous Kernel review. Its [disposition](../004-architecture-review.md#previous-roadmap-disposition) maps requirements to the current sequence.

## September 2026 baseline

[2026-09-baseline](2026-09-baseline/README.md) preserves the previous front door and these retired
planning/review documents. Content is retained with historical banners and repaired relative links.

| Historical document | Current disposition |
|---|---|
| [001 H–N roadmap](2026-09-baseline/001-current-status-and-roadmap.md) | Superseded by the current Kernel/Runtime/evidence roadmap; no architecture-completeness gate. |
| [003 Agent effectiveness](2026-09-baseline/003-agent-effectiveness-guidance.md) | Useful evaluation method; current obligations in R2/K5/E5 and later strategy experiments. |
| [004 efficiency/DX](2026-09-baseline/004-efficiency-and-developer-ergonomics.md) | Measurements retained; K3/K5/S1 own active limits and validation. |
| [005 interoperability](2026-09-baseline/005-interoperability-baseline-and-next-constraints.md) | Detailed synchronous MCP proof/constraints; expansion is demand-gated. |
| [006 ecosystem/license](2026-09-baseline/006-ecosystem-integration-brand-and-license-checklist.md) | Release reference, consumed by S1 and any future hosting decision. |
| [007 builder review](2026-09-baseline/007-application-builder-ergonomics-findings.md) | Completed guidance/fixes retained; remaining issues mapped to F01–F19. |
| [008 external gates](2026-09-baseline/008-external-validation-gates.md) | Superseded by actual v3 canary status and E0–E6. |
| [009 SDK design/review](2026-09-baseline/009-sdk-bootstrap-design-and-findings.md) | Completed SDK rationale and regression evidence; open items carried into the live register. |

The implemented baseline (002) stays active and is updated as capabilities ship. The architecture
strategy study stays in its research directory; only broken routing links are repaired by this task.

## Earlier history is in Git

The earlier `docs/development/legacy/` was removed by commit `4cc89416753f208a79edd4aa56e909d4f72b6fcf`.
It was absent from this task's starting checkout. This task reuses that location; it does not restore
obsolete runtime code or present old implementation claims as current.

To inspect its 001–027 reviews (including 022a) and index:

```bash
git ls-tree -r --name-only 4cc8941^ docs/development/legacy
git show 4cc8941^:docs/development/legacy/README.md
git show 4cc8941^:docs/development/legacy/022a-f2b-working-notes-retention-hot-path-followup.md
```

Those records cover the old migration, A–G implementation and review corrections. Still-relevant
retention/performance/projection/memory findings were reconciled into the live register; completed
repairs remain regression obligations. Older Session-based runtime migration is historical, not
unfinished work on the current Execution kernel.
