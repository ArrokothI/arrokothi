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
  terminal-result correlation through PendingOperation/Event. Accepted and included in the merged
  Slice E baseline.

016-slice-e1-interleaving-peer-interaction.md
  the second Slice E checkpoint: controlled Event interleaving between
  serialized Activations with a serializable opt-in and the minimal
  stale-continuation (ControllerResumption invalidation) rule; SendMessage made
  operational as send / ask / reply with a runtime-owned PeerRequestLink;
  observable cross-Execution wait-for diagnostics; and the basic child
  cancellation hook (child.cancelled, PendingOperation outcome "cancelled",
  trusted Harness.cancelExecution). No canonical-doc change. Accepted and included in the merged
  Slice E baseline.

017-slice-e2-human-interaction-composition-surfaces.md
  the final Slice E checkpoint: RequestUserInput made dispatchable through the
  ordinary Effect gateway with a runtime-owned UserInputRequest, a dedicated
  user.input result Event, a trusted Harness.submitUserInput, and a deny-by-default
  user-interaction grant; a separate exact-payload mechanical-confirmation gate
  (ConfirmationPolicy port, ConfirmationRequest bound to the exact proposal +
  canonical digest, trusted Harness.resolveConfirmation approve|decline,
  current-authority re-check on approval, confirmation.declined Event); and Agent
  Stage / Workflow Stage implemented as a child `call` with definition-kind
  integrity, explicit attenuated child authority, and the child arm of the
  Workflow completion barrier. No canonical-doc change. Accepted and merged in the Slice E
  baseline.

018-slice-f0-structured-memory-write-foundation.md
  the Slice F.0 checkpoint: Execution-local schema-bound Structured Memory, runtime-owned
  view/state and revision, operational WriteMemory dispatch with authorization-before-view
  resolution, atomic memory.written settlement, exact-payload confirmation composition, read-only
  application inspection, and Workflow Effect-barrier continuation. The F.0.1 architecture review
  accepted that runtime and removed the reference Agent's direct memoryWrite model exposure, which
  bypassed the canonical Active/Exposed View chain; model-directed memory-operation exposure is
  deferred. No canonical-doc change. Merged to main as b56b631 (PR #9).

019-slice-f1-structured-memory-read-context.md
  the current Slice F.1 checkpoint: the memory *read* path. An authored Agent read request
  (AgentSpec.structuredMemory.read.keys - a request, not authority), intersected with a
  deny-by-default read-authority grant and then the bound view, resolved by the AgentController
  (holding a narrow StructuredMemoryReadViewResolver, like the exposure resolver) for one new model
  invocation and never on re-entry, then rendered into standing model context as explicit
  application data. Reads never become an Effect; read authority is independent of WriteMemory
  authority; ActivationInput is unchanged. §11 records the F.1 architecture-review correction that
  moved resolution off the Harness/ActivationInput. The write-exposure chain 018 §13 sketched is
  F.1.1 and not begun. No canonical-doc change. Not merged; awaiting review.

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
  E.0 / E.0.1   child Execution foundation        accepted
  E.1 / E.1.1   interleaving + peer interaction   accepted
  E.2 / E.2.1   human interaction, mechanical     accepted
                confirmation, Agent & Workflow
                Stage
  Slice E accepted + merged                       main @ e0ba59b
        ↓
Slice F memory
  F.0           Structured Memory + operational   accepted, merged (main @ b56b631)
                WriteMemory foundation
  F.0.1         removed premature reference-Agent  accepted, merged
                memoryWrite model exposure
  F.0.2         projection-narrowing subset        accepted, merged
                invariant enforced by construction
  F.1           Structured Memory read path:       current checkpoint (019);
                authored read request ∩ read       not merged, awaiting review
                authority ∩ bound view, resolved
                by the AgentController per new
                model invocation; review correction
                moved resolution off the Harness
                (019 §11)
  F.1.1         model-directed WriteMemory         deferred (the 018 §13 chain)
                exposure via memory Active View

cross-cutting v1 validation
  efficiency / optional runtime cost /
  developer ergonomics                   tracked in 014 from v0.4 baseline onward
```

The original MCP proof required no semantic core API change. MCP-1.1 later corrected the existing
provider-neutral `ObjectSchema -> JSON Schema` projection so it preserves the same acceptance set;
it added no MCP vocabulary or dependency to core. The deferred second stage — exported
Agent/Workflow service operations, external Task handles, `input_required`, change notifications —
stays after Slice E and Slice G.
