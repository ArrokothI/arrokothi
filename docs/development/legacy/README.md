# Legacy development records

These documents are historical engineering evidence.

They may contain:

- old branch names;
- old package/version conventions;
- pre-merge status statements;
- superseded forward plans;
- review corrections that are now embodied in code/tests.

They are **not** the default reading set for current development. They are **not** canonical
architecture.

Read them only when investigating:

- historical rationale;
- a regression;
- an old review decision;
- why a current invariant exists.

Canonical semantics remain under [`docs/`](../../README.md). Current implementation status and
forward work remain in [`docs/development/`](../README.md).

Historical filenames are preserved so old references, commit archaeology, and review evidence
remain understandable. Links inside these records may intentionally lead to other files in this
directory or back to canonical documentation; historical status and version statements have not
been rewritten to look current.

## Inventory

### Superseded repository and roadmap plans

- [`001-repository-structure-plan.md`](001-repository-structure-plan.md)
- [`002-architecture-decisions.md`](002-architecture-decisions.md)
- [`003-implementation-audit-and-migration-plan.md`](003-implementation-audit-and-migration-plan.md)
- [`008-v0.4-to-v1.0-development-roadmap.md`](008-v0.4-to-v1.0-development-roadmap.md)

### Historical foundation, review, and interoperability checkpoints

- [`004-slice-a1-review.md`](004-slice-a1-review.md)
- [`005-slice-b-decisions.md`](005-slice-b-decisions.md)
- [`006-provider-foundation-decisions.md`](006-provider-foundation-decisions.md)
- [`007-interoperability-decisions-before-agent-slice.md`](007-interoperability-decisions-before-agent-slice.md)
- [`009-agent-effectiveness-seams-before-slice-d-review.md`](009-agent-effectiveness-seams-before-slice-d-review.md)
- [`010-slice-d0-implementation-decisions.md`](010-slice-d0-implementation-decisions.md)
- [`011-mcp-synchronous-operation-proof.md`](011-mcp-synchronous-operation-proof.md)
- [`012-mcp-post-proof-semantic-corrections.md`](012-mcp-post-proof-semantic-corrections.md)

### Historical composition checkpoints

- [`013-slice-e0-child-execution-foundation.md`](013-slice-e0-child-execution-foundation.md)
- [`016-slice-e1-interleaving-peer-interaction.md`](016-slice-e1-interleaving-peer-interaction.md)
- [`017-slice-e2-human-interaction-composition-surfaces.md`](017-slice-e2-human-interaction-composition-surfaces.md)

### Historical memory checkpoints

- [`018-slice-f0-structured-memory-write-foundation.md`](018-slice-f0-structured-memory-write-foundation.md)
- [`019-slice-f1-structured-memory-read-context.md`](019-slice-f1-structured-memory-read-context.md)
- [`020-slice-f11-structured-memory-model-write-exposure.md`](020-slice-f11-structured-memory-model-write-exposure.md)
- [`021-slice-f2a-working-notes-local-scratch.md`](021-slice-f2a-working-notes-local-scratch.md)
- [`022-slice-f2b-working-notes-explicit-handoff.md`](022-slice-f2b-working-notes-explicit-handoff.md)
- [`022a-f2b-working-notes-retention-hot-path-followup.md`](022a-f2b-working-notes-retention-hot-path-followup.md)
- [`023-slice-f3-derived-semantic-memory-provenance-promotion.md`](023-slice-f3-derived-semantic-memory-provenance-promotion.md)

### Historical structured-concurrency checkpoints

- [`024-slice-g0-structured-memory-optimistic-conflict.md`](024-slice-g0-structured-memory-optimistic-conflict.md)
- [`025-slice-g1-minimal-workflow-fork-join.md`](025-slice-g1-minimal-workflow-fork-join.md)
- [`026-slice-g2-parallel-branch-dependencies.md`](026-slice-g2-parallel-branch-dependencies.md)
- [`027-slice-g3-parallel-structured-memory-conflicts.md`](027-slice-g3-parallel-structured-memory-conflicts.md)

### Cross-cutting historical checklists

- [`014-v1-efficiency-and-developer-ergonomics-validation.md`](014-v1-efficiency-and-developer-ergonomics-validation.md)
- [`015-ecosystem-integration-brand-and-license-checklist.md`](015-ecosystem-integration-brand-and-license-checklist.md)
