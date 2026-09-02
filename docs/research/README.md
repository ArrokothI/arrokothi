# Architecture Research Notes

This directory contains small, focused research directions that sit outside the current
implementation sequence.

These notes are **non-canonical working material**. They may compare external systems, inventory a
protocol surface, record hypotheses, or frame experiments. They do not change ArrokothI semantics,
commit a roadmap item, or authorize implementation. Canonical ownership remains with the documents
listed in [`../README.md`](../README.md); accepted implementation decisions remain under
[`../development/`](../development/).

## Status vocabulary

| Label | Meaning |
|---|---|
| `Implemented proof` | Narrow behavior exists and is backed by the cited implementation record/tests. |
| `Canonical direction` | A canonical document establishes the boundary, but not necessarily an implementation. |
| `TBD` | Research or an explicit architectural/roadmap decision is still required. |
| `Deprecated in source protocol` | Retained only for compatibility analysis; new support is not presumed. |

`TBD` is intentional. A plausible analogy is not an architectural decision.

## Notes

| Note | Scope |
|---|---|
| [`mcp-arrokoth-semantic-mapping.md`](mcp-arrokoth-semantic-mapping.md) | MCP 2026-07-28 protocol-surface inventory and provisional mapping in both import and export directions. |
| [`agent-caching-semantics-and-strategy.md`](agent-caching-semantics-and-strategy.md) | Agent caching survey across OpenClaw, Hermes Agent, Dify, LangGraph, and model providers; distinguishes optional caches, deterministic derived views, and invocation/recovery snapshots, then maps cache candidates and invalidation requirements onto ArrokothI. |

## Promotion rule

If research produces an accepted change:

1. update the canonical concept owner;
2. update code and conformance evidence when semantics change;
3. record slice-specific implementation decisions under `docs/development/`;
4. leave this note as research history or mark the superseding decision explicitly.

