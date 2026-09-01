# Development Documents

This directory contains internal engineering documents used while building, reviewing, and migrating the ArrokothI kernel.

The intended readers include ArrokothI maintainers, Codex, Claude Code, ChatGPT, and future coding or review agents. These documents may record proposals, audits, migration notes, alternatives, and unresolved questions that are useful during implementation work.

Documents here are engineering working documents. They are not automatically approved architecture and must not be treated as canonical merely because they are checked into the repository.

Canonical architectural semantics remain in the main documents under [docs/](../), using the authority and reading order defined by [docs/README.md](../README.md). If a development document conflicts with those documents, the canonical architecture documents take precedence.

## Current planning/review sequence

For the current v0.4 Agent work and the cross-cutting path toward v1.0, use the following documents together:

```text
008-v0.4-to-v1.0-development-roadmap.md
  current release/slice horizon

007-interoperability-decisions-before-agent-slice.md
  accepted Slice-D interoperability/exposure/projection decisions
  where not superseded by 008/canonical docs

009-agent-effectiveness-seams-before-slice-d-review.md
  post-implementation review guidance for preserving ACI/context/eval seams
  without turning model-specific engineering techniques into kernel semantics

010-slice-d0-implementation-decisions.md
  what Slice D.0 became in code, plus the D.0.1 review retrofit that closed the
  effective-authority dispatch defect and added the four replaceable seams

011-mcp-synchronous-operation-proof.md
  the narrow synchronous MCP Tool import/export proof: package/dependency
  boundary, local identity, schema subset, result semantics, export boundary,
  and the seam feedback it produced

012-mcp-post-proof-semantic-corrections.md
  the independent post-proof correction for outcome certainty, JSON-valued
  structured results, and JSON Schema additionalProperties semantic fidelity

013-slice-e0-child-execution-foundation.md
  the first Slice E checkpoint: SpawnExecution made operational through the
  Effect gateway - recursive child identity/lineage, lineage-scoped structural
  spawn budget, current-authority attenuation, spawn vs call, and child
  terminal-result correlation through PendingOperation/Event. Not merged.

014-v1-efficiency-and-developer-ergonomics-validation.md
  cross-cutting v0.4 -> v1.0 validation guidance: keep semantic richness from
  becoming mandatory physical/developer overhead; define kernel/end-to-end/
  scale/durability/feature-delta benchmarks; use v0.4 as a baseline checkpoint,
  v0.8 for integrated validation, v0.9 for simplification/budgets, and v1.0 for
  measured efficiency and public-API maturity gates
```

`009` is intentionally a **review/amendment document**, not a replacement Slice-D coding plan. If Slice D or a D.0 retrofit is already in progress, finish the coherent implementation first, then review the landed result against `009` and apply only concrete additive seams or local retrofits justified by the implementation.

`014` is similarly **cross-cutting engineering guidance**, not a new implementation slice and not a canonical performance contract. Individual slices should use it to identify accidental always-on cost, but should not interrupt coherent semantic work merely to optimize an unmeasured path. It deliberately keeps backend choices, cache strategies, context techniques, and numeric performance budgets evidence-driven until the relevant workloads exist.

Two documents share the number `009` in spirit only: `009-agent-effectiveness-seams-before-slice-d-review.md` is the review guidance written *before* the post-D audit, and the Slice-D.0 implementation record was renumbered to `010` so the sequence reads in the order the work actually happened.

## Where the work stands

```text
Slice D.0 implementation                 done
        ↓
post-D 009 review / D.0.1 retrofit       done
        ↓
Slice D accepted                         done
        ↓
behavioural Agent baseline               landed (tests/evals/agent/)
        ↓
narrow synchronous MCP operation proof   done, recorded in 011
        ↓
MCP-1.1 post-proof semantic correction   done, recorded in 012
        ↓
MCP operation proof                      accepted
        ↓
Slice E composition
  E.0 child Execution foundation         current checkpoint (013), not merged
  E.1 safe interleaving + messaging      next
  E.2 user interaction + surfaces        later

cross-cutting v1 validation
  efficiency / optional runtime cost /
  developer ergonomics                   tracked in 014 from v0.4 baseline onward
```

The original MCP proof required no semantic core API change. MCP-1.1 later corrected the existing
provider-neutral `ObjectSchema -> JSON Schema` projection so it preserves the same acceptance set;
it added no MCP vocabulary or dependency to core. The deferred second stage — exported
Agent/Workflow service operations, external Task handles, `input_required`, change notifications —
stays after Slice E and Slice G.
