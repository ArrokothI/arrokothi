# Development Documents

This directory contains internal engineering documents used while building, reviewing, and migrating the ArrokothI kernel.

The intended readers include ArrokothI maintainers, Codex, Claude Code, ChatGPT, and future coding or review agents. These documents may record proposals, audits, migration notes, alternatives, and unresolved questions that are useful during implementation work.

Documents here are engineering working documents. They are not automatically approved architecture and must not be treated as canonical merely because they are checked into the repository.

Canonical architectural semantics remain in the main documents under [docs/](../), using the authority and reading order defined by [docs/README.md](../README.md). If a development document conflicts with those documents, the canonical architecture documents take precedence.

## Current planning/review sequence

For the current v0.4 Agent work, use the following documents together:

```text
008-v0.4-to-v1.0-development-roadmap.md
  current release/slice horizon

007-interoperability-decisions-before-agent-slice.md
  accepted Slice-D interoperability/exposure/projection decisions
  where not superseded by 008/canonical docs

009-agent-effectiveness-seams-before-slice-d-review.md
  post-implementation review guidance for preserving ACI/context/eval seams
  without turning model-specific engineering techniques into kernel semantics
```

`009` is intentionally a **review/amendment document**, not a replacement Slice-D coding plan. If Slice D or a D.0 retrofit is already in progress, finish the coherent implementation first, then review the landed result against `009` and apply only concrete additive seams or local retrofits justified by the implementation.
