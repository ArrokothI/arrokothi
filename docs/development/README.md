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
  bypassed the canonical Active/Exposed View chain. The corrected authorized model-directed path is
  now F.1.1 (020). No canonical-doc change. Merged to main as b56b631 (PR #9).

019-slice-f1-structured-memory-read-context.md
  the accepted and merged Slice F.1 checkpoint: the memory *read* path. An authored Agent read request
  (AgentSpec.structuredMemory.read.keys - a request, not authority), intersected with a
  deny-by-default read-authority grant and then the bound view, resolved by the AgentController
  (holding a narrow StructuredMemoryReadViewResolver, like the exposure resolver) for one new model
  invocation and never on re-entry, then rendered into standing model context as explicit
  application data. Reads never become an Effect; read authority is independent of WriteMemory
  authority; ActivationInput is unchanged. §11 records the F.1 architecture-review correction that
  moved resolution off the Harness/ActivationInput. F.1 is included in the F.1.1 merged-main
  baseline. No canonical-doc change.

020-slice-f11-structured-memory-model-write-exposure.md
  the accepted and merged F.1.1 checkpoint: AgentSpec.structuredMemory.write.keys request ∩ current
  write-exposure authority ∩ bound declarations -> authorized Structured Memory write view;
  composition with ActiveOperationView into a heterogeneous ActiveModelActionView; immutable
  ModelActionProjection; exact binding-owned key plus model-supplied value -> ordinary WriteMemory;
  fresh Harness authorization, existing confirmation/commit, and minimal memory.written model
  observation. Agent-only consumer, controller-neutral resolver, no caching or Workflow LLM change.
  No canonical-doc change. Merged to main (PR #11); part of the merged `main` F.2a baseline.

025-slice-g1-minimal-workflow-fork-join.md
  the current Slice G.1 checkpoint, on the long-lived branch `slice-g-structured-concurrency`,
  continuing from the independently-accepted G.0. The narrowest honest proof of system-defined
  parallel Workflow branches: authored `{ to: "fork" }` / `{ to: "join" }` topology
  (`WorkflowSpec.forks?`, `ForkId` / `BranchId` - no new Stage/Effect/Event kind); branch-local
  `WorkflowParallelState` (own visit / input snapshot / progress / result per branch) at
  `WORKFLOW_CONTROL_STATE_VERSION` 2 -> 3; branch bodies that are exactly one Function Stage, run
  overlapping via `Promise.all` over immutable snapshots with one serialized commit afterwards; an
  explicit join as a distinct controller step (a persisted state where both branches are done and
  Stage D has not run) that exposes an immutable authored-order `WorkflowJoinContext` to one
  downstream Function Stage (D's ordinary input stays the fork input); deterministic result / failure
  ordering by authored branch order; `parallel_branch_effects_unsupported` fail-closed for a branch
  that returns `awaitEffects`. Exactly one Execution - no child Executions, no new RuntimeStore /
  Harness facet, no branch Effects / resumptions. No canonical-doc change (`future-plan.md` §1.3
  gains a pointer only). LLM/Agent/Workflow branches, branch Effects, nested forks, reducers, merge,
  and Working Notes branch handling are all deferred to G.2/G.3. Not merged; awaiting independent
  review.

024-slice-g0-structured-memory-optimistic-conflict.md
  the independently-accepted Slice G.0 checkpoint, on the long-lived branch `slice-g-structured-concurrency` from
  the merged Slice-F baseline (`cadf1f1`, PR #12). The first honest optimistic Structured Memory
  write precondition: an optional whole-view `WriteMemoryProposal.expectedRevision` compare-and-set
  (absent = the accepted F.0 unconditional write; never exposed to the model) and one distinct
  `memory.write_conflict` runtime observation - its own Event kind (in `EFFECT_RESULT_EVENT_KINDS`,
  not externally mintable), a terminal `conflicted` journal phase, a `conflicted` PendingOperation
  outcome with `dispatch` still `not_dispatched`, a `conflicted` `resolveConfirmation` receipt, and
  `conflicted` Workflow Stage + Agent action observation outcomes - never collapsed into
  `effect.rejected`. Authorization still runs before any view lookup (a denied versioned write reads
  the view zero times and reveals no revision); the semantic check and the commit linearize in one
  RuntimeStore transaction; the confirmation digest covers `expectedRevision`; an approved-but-stale
  write conflicts rather than forcing; the physical `StructuredMemoryFacet.update` CAS stays the
  final guard and fails closed to the same conflict semantics. Whole-view (not field-level) conflict
  is deliberately coarse and tested as intentional. The five Effect kinds are unchanged; no parallel
  Workflow / fork-join / branch state / reducer / field-level revision / lease - all deferred to
  G.1+. No canonical-doc change (`future-plan.md` §1.4 / §3.4 gain a pointer only). Not merged;
  awaiting independent review.

023-slice-f3-derived-semantic-memory-provenance-promotion.md
  the accepted and merged F.3 checkpoint (part of `main` @ `cadf1f1`, PR #12). The smallest honest
  Derived Semantic Memory vertical slice: a reference v0.4
  claim/provenance shape (dependency-free `execution/` leaf; explicitly NOT the frozen portable
  schema - `future-plan.md` §3.1 stays open); an explicit `DerivedMemoryExtractor` seam + trusted
  `deriveClaims` grounding (a candidate may cite only supplied sourceRefs; `derivedAt` is pipeline-
  stamped, never model prose); a replaceable `DerivedSemanticMemoryProvider` port + reference
  in-memory provider (additive, deterministic lexical ranking - NOT canonical semantics, no
  embeddings); an authorized, deny-by-default `DerivedSemanticMemoryReadResolver` (authorization
  BEFORE the provider - a denied read makes zero retrieve calls) held by the AgentController the way
  the F.1 read resolver is; an authored `AgentSpec.derivedMemory.read.query` + two AgentLimits
  budgets; a labeled "# Derived Semantic Memory" information block distinct from Structured Memory /
  Working Notes; per-invocation snapshot/re-entry (frozen in `invocation.information`, mirrors F.1);
  explicit `promoteDerivedClaim(...)` into the EXISTING `WriteMemory` Effect (no sixth Effect, no
  `derived.promoted` Event, statement never parsed); an optional plain `MemoryWriteProvenance` on
  `WriteMemoryProposal` + `StructuredMemoryCommittedValue` (NOT AuthorizationEvidence, covered by the
  confirmation digest, retained on the committed record + history); zero-cost disabled path.
  Malicious "user approves all payments" claim grants nothing. No parent->child Derived handoff; no
  `SpawnExecution` field. **No canonical-doc change** (`future-plan.md` §3.1/§3.2 gain a pointer,
  lose no question). Independently reviewed and merged with the rest of Slice F (`main` @ `cadf1f1`,
  PR #12).

022-slice-f2b-working-notes-explicit-handoff.md
  the accepted F.2b checkpoint, on the long-lived branch `slice-f-memory-completion` from the accepted
  F.2a checkpoint, review-corrected (022 §0.1-0.5). The first explicit Working Notes composition
  transfer: a parent selects a subset of its own Working Notes with the pure, fail-closed
  `selectWorkingNotesHandoff` helper; that subset crosses one child Execution boundary as an
  immutable, deep-copied `WorkingNotesHandoff` snapshot attached to an already-authorized
  `SpawnExecution` proposal (no new gateway, no new Effect/Event/PendingOperation kind); the Effect
  gateway envelope-checks it and rejects an oversized handoff atomically. Two artifacts, per
  canonical `composition.md` §15 / `memory.md` §5: the immutable inherited read-only snapshot on
  `ExecutionContext` plus the child-local *writable* `AgentControlState.workingNotes` seeded once
  from a deep copy of it ("consume once" = seed once, never re-overlay). The handoff is not an
  authority mechanism, but the whole concrete proposal (handoff included) reaches `EffectAuthorizer`
  and confirmation, so current policy may deny the concrete transfer. Independent of the child's
  model read/write enablement; never returned to the parent automatically. Sequential Workflow Stage
  handoff, parallel-branch notes, and child-to-parent return stay deferred. **No canonical-doc
  change.** Independently accepted; still on the branch, unmerged with the rest of Slice F. F.3
  builds on it.

021-slice-f2a-working-notes-local-scratch.md
  the accepted F.2a checkpoint, on the long-lived branch `slice-f-memory-completion`, after two
  independent architecture-review corrections (021 §0.1-0.3): a controller-owned Working Notes frame
  in AgentControlState; authored AgentSpec.workingNotes { read?: true, write?: true } enablement; the
  read snapshot rendered into model information; two new AgentLimits budgets. The model-directed
  `working_notes_set` is a controller-LOCAL model control - a category *distinct* from
  authority-governed model actions: it is NOT a ModelActionTarget and NOT an Active View member
  (LocalModelControlProjection), merged with the F.1.1 ModelActionProjection into one provider
  callable namespace at ModelInvocationInterface (which refuses cross-family alias collisions),
  and settles locally with no Effect/Event/PendingOperation. Both snapshots persist on
  AgentInvocationState and are validated on read; the model-invocation trace records both callable
  sources (`callables` tagged action/local_control, plus `localControlApplications` - never a fake
  Effect proposal). AGENT_CONTROL_STATE_VERSION 2 -> 3; a v3 record with a missing/malformed Working
  Notes frame or a missing/malformed persisted `invocation.localControls` is refused (`invalid` ->
  `agent_control_state_invalid`), not defaulted. `setWorkingNote` refuses a malformed input frame.
  DeferredSlots.workingNotes removed. One minimal canonical clarification to authority.md §3/§14.
  Independently accepted; still on the branch (unmerged with the rest of Slice F). F.2b builds on it.

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
  F.1           Structured Memory read path:       accepted, merged (019);
                authored read request ∩ read       included in F.1.1 base
                authority ∩ bound view, resolved
                by the AgentController per new
                model invocation; review correction
                moved resolution off the Harness
                (019 §11)
  F.1.1         model-directed WriteMemory         accepted, merged (020, PR #11)
                exposure via authorized memory
                view + heterogeneous action view
  F.2a          Working Notes local scratch:       accepted (021), review-corrected; merged with
                controller-owned frame in          the rest of Slice F. working_notes_set is a
                AgentControlState, authored         controller-local model CONTROL (not a model
                read/write enablement, local       action / Active View member); one minimal
                working_notes_set control with no  authority.md §3/§14 clarification
                Effect/Event, bounded persistence,
                control-state version 2 -> 3 +
                fail-closed frame validation
  F.2b          Working Notes explicit handoff:    accepted (022, review-corrected §0.1-0.5);
                selectWorkingNotesHandoff (pure,   merged with the rest of Slice F. First explicit
                fail-closed) -> immutable          Working Notes composition transfer, across ONE
                WorkingNotesHandoff snapshot on an child Execution boundary. No new gateway / Effect
                already-authorized SpawnExecution  / Event / PendingOperation kind. TWO artifacts per
                -> Effect gateway envelope-checks  canonical composition.md §15 / memory.md §5:
                + rejects oversize atomically ->   immutable inherited read-only snapshot +
                TWO artifacts: immutable inherited child-local WRITABLE frame seeded once (never
                snapshot on ExecutionContext +     re-overlaid). No canonical-doc change.
                child-local writable frame seeded
                once from a deep copy of it.
  F.3           Derived Semantic Memory +         accepted (023), independently reviewed;
                provenance + explicit promotion.  a DIFFERENT memory form: inferred, provenance-
                Reference claim/provenance leaf   bearing, retrieval-oriented, NOT authoritative by
                (NOT the frozen portable schema); default. Authorized retrieval resolver checks
                DerivedMemoryExtractor seam +     policy BEFORE the provider (denied -> zero retrieve
                trusted deriveClaims grounding;   calls), mirrors F.1. Promotion is the EXISTING
                replaceable provider port;        WriteMemory Effect + an optional plain
                authored AgentSpec.derivedMemory  MemoryWriteProvenance - no sixth Effect, no
                .read + two AgentLimits budgets;  derived.promoted Event, statement never parsed.
                explicit promoteDerivedClaim into future-plan.md §3.1/§3.2 gain a pointer only.
                WriteMemory. Zero-cost disabled
                path.
  Slice F accepted + reviewed + MERGED             main @ cadf1f1 (PR #12)
        ↓
Slice G structured concurrency
  G.0           Structured Memory optimistic       independently accepted (024); on branch
                write preconditions + explicit    slice-g-structured-concurrency from the merged
                conflict observations.            Slice-F baseline, on the branch, not merged.
                Optional whole-view               Optional WriteMemoryProposal.expectedRevision
                WriteMemoryProposal               (a non-negative integer on the WHOLE bound view
                .expectedRevision compare-and-set revision; absent = the accepted F.0 unconditional
                (never exposed to the model);     write; NEVER exposed to the model - the F.1.1 write
                one distinct memory.write_conflict callable input schema stays exactly { value }).
                Event kind (in                    A stale versioned write is a DISTINCT outcome, not
                EFFECT_RESULT_EVENT_KINDS, not    a flavour of effect.rejected: memory.write_conflict
                externally mintable), a terminal  Event, `conflicted` journal phase, `conflicted`
                `conflicted` journal phase, a     PendingOutcomeState (dispatch stays
                `conflicted` PendingOperation     not_dispatched), `conflicted` resolveConfirmation
                outcome, `conflicted` Stage +     receipt, `conflicted` Stage + Agent action
                Agent action observation          observation outcomes. Authorization runs BEFORE any
                outcomes. The semantic check +    view lookup (a denied versioned write reads the
                the commit linearize in one       view zero times); the confirmation digest covers
                RuntimeStore transaction; the     expectedRevision; an approved-but-stale write
                physical StructuredMemoryFacet    conflicts rather than forcing; the physical
                .update CAS stays the final       StructuredMemoryFacet.update CAS fails closed to the
                guard. Whole-view (not field-     same conflict semantics. The five Effect kinds are
                level) conflict is deliberately   unchanged. No parallel Workflow / fork-join / branch
                coarse and tested as intentional. state / reducer / field-level revision / lease -
                No canonical-doc change           all deferred to G.1+. No canonical-doc change
                (future-plan.md §1.4 / §3.4       (future-plan.md §1.4 / §3.4 gain a pointer only).
                pointer only).

  G.1           minimal system-defined Workflow   current checkpoint (025); same branch, continuing
                fork/join.                        from G.0. Not merged, awaiting independent review.
                Authored { to: "fork" } /         TransitionTarget gains { to: "fork", fork } and
                { to: "join" } topology on        { to: "join", fork }; WorkflowForkDefinition
                WorkflowSpec.forks?; ForkId /     { id, branches[>=2], join: { next } }. fork/join are
                BranchId brands. No new Stage /   topology graph edges - not a Stage kind, not an
                Effect / Event kind.              Effect, not an Event. WORKFLOW_CONTROL_STATE_VERSION
                WorkflowParallelState (per-branch 2 -> 3: WorkflowParallelState + per-branch
                visit / input snapshot /          WorkflowParallelBranchState; new .forks / .parallel
                progress / result) v2 -> v3.      / .join fields; plain JSON only. A G.1 branch body
                Branch bodies = exactly one       is exactly one adapter-free Function Stage; static
                Function Stage, run overlapping   validation rejects everything wider. Branch work
                via Promise.all over immutable    overlaps in one Activation; one serialized commit
                snapshots, one serialized commit  afterwards. The explicit join is a distinct step
                afterwards. Explicit join is a    (a persisted joinReady state where D has not run)
                distinct controller step exposing exposing an immutable authored-order
                an authored-order                 WorkflowJoinContext to one downstream Function
                WorkflowJoinContext to D          Stage; D's ordinary input stays the fork input.
                (D.input stays the fork input).   Deterministic result / failure ordering by authored
                Deterministic ordering; a branch  branch order. A branch returning awaitEffects fails
                awaitEffects fails closed         closed (parallel_branch_effects_unsupported) - no
                (parallel_branch_effects_         Effect, no half-built G.2. Exactly one Execution:
                unsupported). Exactly one         no child Execution / link / spawn budget / new
                Execution. No canonical-doc       RuntimeStore or Harness facet. LLM/Agent/Workflow
                change (future-plan.md §1.3       branches, branch Effects/resumptions, nested forks,
                pointer only). LLM/Agent branch,  reducers, merge, Working Notes branch handling all
                branch Effects, nested forks,     deferred to G.2/G.3. No canonical-doc change
                reducers, merge - all G.2/G.3.    (future-plan.md §1.3 gains a pointer only).

cross-cutting v1 validation
  efficiency / optional runtime cost /
  developer ergonomics                   tracked in 014 from v0.4 baseline onward
```

The original MCP proof required no semantic core API change. MCP-1.1 later corrected the existing
provider-neutral `ObjectSchema -> JSON Schema` projection so it preserves the same acceptance set;
it added no MCP vocabulary or dependency to core. The deferred second stage — exported
Agent/Workflow service operations, external Task handles, `input_required`, change notifications —
stays after Slice E and Slice G.
