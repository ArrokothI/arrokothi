# Architecture Research Notes

This directory contains small, focused research directions that sit outside the current
implementation sequence.

These notes are **non-canonical working material**. They may compare external systems, inventory a
protocol surface, record hypotheses, or frame experiments. They do not change ArrokothI semantics,
commit a roadmap item, or authorize implementation. Canonical ownership remains with the documents
listed in the [reference index](../../mental-model/reference.md); accepted implementation decisions remain under
[`../development/`](../development/).

## Status vocabulary

| Label | Meaning |
|---|---|
| `Implemented proof` | Narrow behavior exists and is backed by the cited implementation record/tests. |
| `Canonical direction` | A canonical document establishes the boundary, but not necessarily an implementation. |
| `TBD` | Research or an explicit architectural/roadmap decision is still required. |
| `Deprecated in source protocol` | Retained only for compatibility analysis; new support is not presumed. |

`TBD` is intentional. A plausible analogy is not an architectural decision.

The [active roadmap](../development/001-current-status-and-roadmap.md) owns horizon placement.
The [future questions](../future-plan.md) select current hypotheses and negative gates; the
[mental-model reference index](../../mental-model/reference.md) holds accepted boundary rules and optional Runtime designs.
Machine/ABI and JIT prototype sequences remain hypotheses; a 2.0 Machine is not committed.
The [strategy study](https://github.com/ArrokothI/arrokothi/blob/9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49/docs/architecture-strategy-study/README.md) independently reviews these directions.

## Notes

| Note | Scope |
|---|---|
| [`mcp-arrokothi-semantic-mapping.md`](mcp-arrokothi-semantic-mapping.md) | MCP 2026-07-28 protocol-surface inventory and provisional mapping in both import and export directions. |
| [`agent-caching-semantics-and-strategy.md`](agent-caching-semantics-and-strategy.md) | Agent caching survey across OpenClaw, Hermes Agent, Dify, LangGraph, and model providers; distinguishes optional caches, deterministic derived views, and invocation/recovery snapshots, then maps cache candidates and invalidation requirements onto ArrokothI. |
| [`jit-capability-namespace-and-context-scouts.md`](jit-capability-namespace-and-context-scouts.md) | Research direction for hierarchical JIT discovery over authorized capabilities/knowledge/resources, progressive materialization, and read-only Context Scouts that use cheaper models to assemble provenance-preserving context for stronger primary Agents. |
| [`arrokothi-machine-abi-and-program-model.md`](arrokothi-machine-abi-and-program-model.md) | Conditional research sketch (no scheduled 2.0 target): present Agents with a logical ArrokothI machine, progressive manuals and workspace views, system-call-like operations, model-authored suspendable programs, and a possible shared Program/ABI substrate for Agents and Workflows while explicitly seeking simplification rather than adapter layering. |

## Promotion rule

If research produces an accepted change:

1. update the canonical concept owner;
2. update code and conformance evidence when semantics change;
3. record slice-specific implementation decisions under `docs/development/`;
4. leave this note as research history or mark the superseding decision explicitly.
