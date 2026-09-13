# Implemented kernel baseline

> **Status:** current implementation map, inspected at `e96e513` on 2026-09-07; SDK implementation at `3bdc4f6`.
> Package `0.8.1` is not an exact experimental identity or a durability/release verdict.
> **Role:** compact engineering map, not canonical architecture. Target ownership reconciled 2026-09-08; the asynchronous protocol is not implemented by this documentation change.

Rechecked for pipeline planning at `f3c0a1b2a3a1cb82b295580939d0284f8d329163`: implementation
and test files under `packages/` and `tests/` are unchanged from `e96e513`; only the SDK README
differs in those trees. Fresh `npm test` passed 965 tests and typecheck passed. This preserves the
baseline's scope, not target acceptance. See [the current assessment](010-pipeline-planning-assessment.md)
for source inspection, process changes and validation limits; historical captures below remain historical.

Structural note, K1.0 (2026-09-13): the package layout below still describes the whole implemented
system, and every path in it is unchanged. K1.0 added one new package, `packages/kernel`
(`@arrokothi/kernel`, `private`), as the enforced landing zone for target Kernel work. It contains
no protocol implementation and no consumer is routed through it. Everything this document maps is
now the explicitly **legacy** zone, retained with its exports, behaviour and regression suite intact;
`tests/conformance/architecture/kernel-boundaries.test.ts` was renamed to `legacy-core-boundaries.test.ts`
with its assertions retained, because the graph it guards is this implementation rather than the
target Kernel. The zones and the deferred extraction owners are recorded in
[K1.0's ownership inventory](work/K1.0/ownership-inventory.md). No behaviour below changed.

This document answers one question: **What does the current ArrokothI kernel demonstrably
implement?** Canonical meaning remains in the documents indexed by [`../README.md`](../README.md).
Paths below are representative rather than exhaustive; the conformance suite is the executable
evidence.

## 1. Execution and Harness

**Implemented capability.** Independent Execution identities; lifecycle transitions; serialized
controller Activations; mailbox and cursor; explicit waits; FIFO reference scheduling; terminal
results; cancellation; transactional runtime-store operations; deterministic test clocks/ids.

**Non-obvious invariant.** Definition, Execution, Workflow, Agent, Stage, and function call are
distinct. Only independent runtime identity creates an Execution boundary. One Execution has one
active controller-state writer even when independent work is in flight.

**Target owner.** [`../kernel.md`](../kernel.md).

**Representative source.** `packages/core/src/execution/context.ts`, `execution/lifecycle.ts`,
`runtime/harness.ts`, `runtime/activation.ts`, `ports/runtime-store.ts`,
`reference/in-memory-runtime-store.ts`, `reference/fifo-scheduler.ts`.

**Representative tests.** `tests/conformance/execution/lifecycle.test.ts`,
`scheduler-exclusion.test.ts`, `wait-wake-resume.test.ts`, `serialization.test.ts`,
`terminal-result.test.ts`, `tests/conformance/contracts/runtime-store.test.ts`.

**Major deferrals.** Production durable store/scheduler, process-crash restart, distributed worker
coordination, hosted isolation.

## 2. Events, Effects, PendingOperations, and ControllerResumptions

**Implemented capability.** Closed Event and five-Effect vocabularies; controller proposals;
Harness authorization/coordination; Effect journal; idempotency; externally delivered input only
through the public ingress; runtime result Events; optional exact-payload confirmation;
PendingOperations; ControllerResumptions for slow controller-local provider work; controlled
interleaving; dependency-set waits over Events plus multiple resumptions.

**Non-obvious invariant.** Event ≠ Effect; request ≠ authorization ≠ dispatch ≠ completion;
PendingOperation ≠ ControllerResumption. A model call does not become an Effect merely because it
is slow. A dependency wait keeps Event and resumption members typed and separate.

**Target owner.** [`../kernel.md`](../kernel.md), with confirmation and
authority consequences in [`../kernel.md`](../kernel.md).

**Representative source.** `interaction/events.ts`, `effects/types.ts`, `effects/pending.ts`,
`effects/journal.ts`, `execution/resumption.ts`, `runtime/effect-processor.ts`,
`runtime/event-router.ts`, `runtime/resumption-processor.ts`.

**Representative tests.** `tests/conformance/effects/effect-gateway.test.ts`,
`pending-operations.test.ts`, `fast-slow-equivalence.test.ts`,
`tests/conformance/execution/controller-resumption.test.ts`, `controlled-interleaving.test.ts`,
`multi-dependency-wait.test.ts`, `tests/conformance/interaction/event-vocabulary.test.ts`.

**Major deferrals.** Durable recovery of in-flight unknown outcomes and production external
dispatch/idempotency guarantees.

## 3. Authority, Active View, and model projection

**Implemented capability.** Capability Catalog; deny-by-default reference Effective Authority;
operation refs and attenuation; active operation resolution; heterogeneous authority-governed
model-action view for capability operations and Structured Memory writes; identity-only narrowing;
immutable persisted projection/bindings; fresh Harness reauthorization before each Effect;
separate controller-local Working Notes controls.

**Non-obvious invariant.** Discovery and exposure do not grant permission:

```text
Model projection ⊆ Active View ⊆ Effective Authority ⊆ Catalog
```

Controller-local model controls do not cross an Execution/runtime boundary and are deliberately
outside this authority-governed action chain; their origin remains explicit when provider callables
are merged.

**Target owner.** [`../kernel.md`](../kernel.md).

**Representative source.** `operations/authority.ts`, `operations/active-view.ts`,
`operations/model-action-view.ts`, `operations/projection.ts`,
`operations/local-model-control.ts`, `operations/model-invocation-interface.ts`,
`reference/operation-authority.ts`, `reference/active-operation-view-resolver.ts`.

**Representative tests.** `tests/conformance/agent/effective-authority.test.ts`,
`active-view.test.ts`, `projection.test.ts`, `action-binding.test.ts`,
`harness-reauthorization.test.ts`, `tests/conformance/architecture/agent-boundaries.test.ts`.

**Major deferrals.** Policy-engine backend, progressive heterogeneous discovery, lazy descriptor
hydration, hosted identity/policy service.

## 4. Provider abstraction

**Implemented capability.** Provider-neutral model requirements, resolver, invocation request,
outcome/error normalization, deterministic scripted/deferred providers, Gemini adapter, and Strands
Agent-executor integration outside core.

**Non-obvious invariant.** Controllers depend on ArrokothI ports and portable features, never a
vendor client. Provider-native tools/errors/caching do not define kernel semantics.

**Target owner.** [`../execution.md`](../execution.md) and
[`../deployment.md`](../deployment.md).

**Representative source.** `packages/core/src/ports/model-provider.ts`, `model-resolver.ts`,
`reference/static-model-resolver.ts`, `packages/models/gemini/src/index.ts`,
`packages/agents/strands/src/agent-executor.ts`.

**Representative tests.** `tests/conformance/models/model-provider.test.ts`,
`model-resolution.test.ts`, `model-portability.test.ts`,
`packages/models/gemini/tests/gemini-model-provider.test.ts`,
`packages/agents/strands/tests/strands-agent-executor.test.ts`.

**Major deferrals.** Additional providers, production registry/service discovery, provider-neutral
cache contract only where evidence requires it.

## 5. Agent

**Implemented capability.** Serializable Agent Definition/spec; controller progress; bounded model
invocations; information compilation; immutable callable interface; action correlation and
observation projection; provider resumption/re-entry; model trace; capability and Structured
Memory actions; local Working Notes control; recursive composition through runtime Effects.

**Non-obvious invariant.** Agent is a controller type, not every Execution and not a privileged
authority source. Information compilation is separate from action exposure. Re-entry uses the
persisted invocation snapshot rather than rebuilding views or context.

**Target owner.** [`../execution.md`](../execution.md), with runtime, authority, and memory
details owned by their respective canonical documents.

**Representative source.** `agent/spec.ts`, `agent/control-state.ts`,
`controllers/agent/controller.ts`, `controllers/agent/information.ts`,
`controllers/agent/model-access.ts`, `ports/agent-executor.ts`, `reference/agent-executor.ts`.

**Representative tests.** `tests/conformance/agent/agent-definition.test.ts`,
`agent-controller.test.ts`, `agent-resumption.test.ts`, `information-compiler.test.ts`,
`model-trace.test.ts`, `observation-projection.test.ts`.

**Major deferrals.** ACI/retrieval strategy optimization, additional reference Agent policies,
behavioral quality tuning, dynamic progressive action discovery.

## 6. Workflow and Stage

**Implemented capability.** Serializable Workflow topology; Function, LLM, Agent, and Workflow
Stages; conditional/labelled transitions; input/output adapters; stage-local progress; effect
barriers; provider resumptions; child calls; terminal results; bounded topology/transition limits.

**Non-obvious invariant.** Workflow ≠ Agent; Stage ≠ Execution. Stage progress and a child
Execution's progress are different artifacts. Effects remain Harness-mediated regardless of Stage
kind.

**Target owner.** [`../execution.md`](../execution.md), with execution mechanics in
[`../kernel.md`](../kernel.md).

**Representative source.** `workflow/spec.ts`, `workflow/control-state.ts`,
`controllers/workflow/controller.ts`, `controllers/workflow/llm-stage.ts`,
`workflow/adapters.ts`, `ports/stage.ts`.

**Representative tests.** `tests/conformance/workflow/workflow-topology.test.ts`,
`stage-semantics.test.ts`, `stage-barrier.test.ts`, `model-resumption.test.ts`, `agent-stage.test.ts`,
`workflow-stage.test.ts`, `adapters.test.ts`.

**Major deferrals.** General multi-Stage branch subgraphs, nested/concurrent forks, branch adapters
or emissions, join reducers/synthesis.

## 7. Recursive child composition

**Implemented capability.** `SpawnExecution` spawn/call modes; child links; parent/child result
correlation; recursive Agent/Workflow graphs; authority attenuation; structural lineage budgets;
child cancellation settlement (without cascading cancellation or configured child-result deadlines);
terminal-dependency abandonment; explicit Working Notes handoff.

**Non-obvious invariant.** A child is a real Execution. Authority and note visibility do not flow
merely from ancestry; the child receives only explicit attenuation/transfer. A Stage remains
same-Execution composition unless it explicitly calls a child.

**Target owner.** [`../execution.md`](../execution.md) and
[`../kernel.md`](../kernel.md).

**Representative source.** `effects/types.ts`, `execution/child-link.ts`,
`execution/structural-budget.ts`, `runtime/effect-processor.ts`,
`execution/working-notes.ts`.

**Representative tests.** `tests/conformance/composition/recursive-composition.test.ts`,
`spawn-vs-call.test.ts`, `authority-attenuation.test.ts`, `structural-budget.test.ts`,
`child-cancellation.test.ts`, `terminal-dependency-abandonment.test.ts`,
`tests/conformance/memory/working-notes-handoff.test.ts`.

**Major deferrals.** General service/protocol projection, durable recovery of child links,
automatic child-note return (intentionally absent).

## 8. Peer and user interaction; mechanical confirmation

**Implemented capability.** `SendMessage` notify/ask/reply semantics; peer request links; user-input
requests with schema validation; exact request correlation; mechanical confirmation policies and
resolution; safe decline/deny/reject settlement across Agent and Workflow controllers.

**Non-obvious invariant.** Communication is not ownership and a message does not grant authority.
Confirmation verifies consent to one exact proposal; it is not authorization and does not widen
authority. User input, peer reply, and child result remain distinct interactions.

**Target owner.** [`../execution.md`](../execution.md),
[`../kernel.md`](../kernel.md), and [`../deployment.md`](../deployment.md).

**Representative source.** `execution/peer-request-link.ts`, `execution/user-input-request.ts`,
`execution/confirmation-request.ts`, `confirmation/resolver.ts`, `runtime/effect-processor.ts`.

**Representative tests.** `tests/conformance/interaction/send-message.test.ts`,
`user-input.test.ts`, `mechanical-confirmation.test.ts`, `confirmation-settlement.test.ts`,
`messaging-authority.test.ts`, `tests/conformance/composition/peer-liveness.test.ts`.

**Major deferrals.** Durable external channels, protocol-specific elicitation mapping, production
identity/authentication and notification delivery.

## 9. Structured Memory

**Implemented capability.** Execution-local schema-bound view; deny-by-default read and write
exposure seams; authorized `WriteMemory`; atomic commit with revision/history/provenance;
model-facing read context and write action; exact-payload confirmation; whole-view optimistic
`expectedRevision`; explicit `memory.write_conflict`; explicit promotion provenance from Derived
Semantic Memory.

**Non-obvious invariant.** Memory ≠ context. Read authority, write exposure, and final write
authorization are independent. Whole-view revision is runtime/concurrency data and is not exposed
to a field-limited model reader. A stale versioned write conflicts; it never silently overwrites.

**Target owner.** [`../execution.md`](../execution.md), with Effect/authorization rules in
[`../kernel.md`](../kernel.md).

**Representative source.** `execution/structured-memory.ts`,
`execution/structured-memory-read.ts`, `execution/structured-memory-write-view.ts`,
`ports/structured-memory-read-view.ts`, `runtime/effect-processor.ts`.

**Representative tests.** `tests/conformance/memory/structured-memory-write.test.ts`,
`structured-memory-read.test.ts`, `structured-memory-model-write.test.ts`,
`structured-memory-optimistic-write.test.ts`.

**Major deferrals.** Field-level versions, multi-key transactions, reducers/CRDTs/locks, general
cross-Execution scope ontology, durable backend.

## 10. Working Notes

**Implemented capability.** Bounded controller-owned Agent scratch frame; separate read/write
enablement; `working_notes_set` controller-local model control; snapshot/re-entry; explicit selected
parent→child handoff; immutable inherited handoff plus independent child-owned writable frame.

**Non-obvious invariant.** Working Notes are temporary epistemic state, not Structured Memory,
authority evidence, or ambient shared memory. Semantic retention of the inherited handoff does not
require it to be rendered or transported on every hot-path step.

**Target owner.** [`../execution.md`](../execution.md).

**Representative source.** `execution/working-notes.ts`, `agent/control-state.ts`,
`operations/local-model-control.ts`, `operations/model-invocation-interface.ts`,
`controllers/agent/controller.ts`.

**Representative tests.** `tests/conformance/memory/working-notes.test.ts`,
`working-notes-handoff.test.ts`, `tests/conformance/architecture/agent-boundaries.test.ts`.

**Major deferrals.** Sequential Stage handoff policy, parallel-branch Working Notes sharing/merge,
retention/redaction policy and evidence-driven hot-path optimization.

## 11. Derived Semantic Memory

**Implemented capability.** Plain provenance-bearing claims and source material; explicit
extraction seam; deterministic reference extractor/provider; deny-before-provider retrieval;
bounded Agent information view; persisted invocation snapshot; explicit promotion through ordinary
`WriteMemory` with provenance.

**Non-obvious invariant.** Derived claims are inferred and may be wrong, stale, or contradictory.
They are not authority evidence and never promote automatically. Reference lexical ranking and the
claim shape are implementation evidence, not universal semantics.

**Target owner.** [`../execution.md`](../execution.md) and
[`../kernel.md`](../kernel.md).

**Representative source.** `execution/derived-semantic-memory.ts`,
`ports/derived-memory-extractor.ts`, `ports/derived-semantic-memory-provider.ts`,
`ports/derived-semantic-memory-read-view.ts`,
`reference/in-memory-derived-semantic-memory.ts`.

**Representative tests.** `tests/conformance/memory/derived-semantic-memory.test.ts`,
`tests/conformance/agent/information-compiler.test.ts`.

**Major deferrals.** Universal claim/entity/time/confidence schema, production vector/graph
provider, automatic extraction/promotion, contradiction resolution.

## 12. Parallel Workflow structured concurrency

**Implemented capability.** System-defined fork topology with two or more one-Stage branches;
branch-local progress/visit/barrier; overlapping Function work; LLM/Agent/Workflow branch
dependencies; branch-qualified Effect and resumption correlation; explicit join in authored order;
dependency-set Event/resumption waits; version-required branch Structured Memory writes with
observable whole-view conflict handling.

**Non-obvious invariant.** Branch ≠ Execution. Controller-state mutation stays serialized while
independent work overlaps. Fork, branch completion, join, and downstream Stage execution are
distinct. An unversioned branch memory write fails before the Harness; a conflict is an observation
for the branch, not an automatic retry or merge.

**Target owner.** [`../execution.md`](../execution.md) with boundary acceptance in [`../kernel.md`](../kernel.md).

**Representative source.** `workflow/control-state.ts`, `workflow/resumption-keys.ts`,
`controllers/workflow/controller.ts`, `runtime/harness.ts`, `runtime/resumption-processor.ts`.

**Representative tests.** `tests/conformance/workflow/parallel-fork-join.test.ts`,
`parallel-branch-effects.test.ts`, `parallel-branch-resumptions.test.ts`,
`parallel-branch-structured-memory.test.ts`,
`tests/conformance/execution/multi-dependency-wait.test.ts`.

**Major deferrals.** Multi-Stage/nested/concurrent forks, branch adapters/emissions, failure-driven
sibling cancellation, join reducers/automatic merge/retry, branch Working Notes semantics.

## 13. Current MCP proof

**Implemented capability.** MCP SDK v2 boundary package; import/list/call of synchronous Tools as
portable/native capability operations; explicit allowlisted export of selected capability
operations as Tools; strict local identity mapping; schema subset translation; any-JSON result
normalization; consequential outcome-certainty protection.

**Non-obvious invariant.** MCP objects do not become kernel semantics. MCP metadata does not grant
authority. Import/export must preserve the accepted input set and honest `success | failure |
unknown` certainty.

**Target owner.** [`../deployment.md`](../deployment.md), with retained proof
constraints in [`005`](legacy/2026-09-baseline/005-interoperability-baseline-and-next-constraints.md).

**Representative source.** `packages/interoperability/mcp/src/import/importer.ts`,
`import/identity.ts`, `import/result.ts`, `schema/from-json-schema.ts`, `export/tools.ts`.

**Representative tests.** `packages/interoperability/mcp/tests/mcp-protocol.test.ts`,
`schema-translation.test.ts`, `tests/conformance/mcp/imported-operation-authority.test.ts`,
`imported-operation-outcome-certainty.test.ts`, `exported-operation.test.ts`.

**Major deferrals.** Resources, Prompts/templates, Tasks/handles, elicitation, notifications,
sessions/auth/hosting, A2A/service projection.

## 14. Reference stores, providers, and retrieval

**Implemented capability.** In-memory Definition/Runtime stores, FIFO scheduler, scripted and
deferred providers/executors, local lexical/resource retrieval, Gemini model provider, and Strands
integration.

**Non-obvious invariant.** Reference implementations demonstrate ports; they do not make their
mechanisms canonical. No durable implementation of the complete Execution-kernel `RuntimeStore`
ships in this repository.

**Target owner.** The port's relevant concept owner through [`../README.md`](../README.md).

**Representative source.** `packages/core/src/reference/`, `packages/retrieval/local/src/`,
`packages/models/gemini/src/`, `packages/agents/strands/src/`.

**Representative tests.** `tests/conformance/contracts/`, package-local tests under
`packages/*/tests/`, and `tests/conformance/models/`.

**Major deferrals.** Full durable RuntimeStore/scheduler, provider/service registry, production
policy and isolation backends.

## 15. Conformance, eval, and benchmark surfaces

**Implemented capability.** Offline semantic conformance across packages and
`tests/conformance/`; package contracts; behavioral Agent evals under `tests/evals/`; opt-in live
canaries. Cross-framework benchmark subjects and their evaluation live in the standalone
`ArrokothI/benchmark` repository, not in this repository.

**Non-obvious invariant.** Semantic conformance ≠ behavioral quality evaluation ≠ performance
measurement ≠ live integration health. A passing category cannot substitute for another.

**Target owner.** No architecture concept is created here; the owning docs define the
invariants being tested. Historical engineering guidance is in [`003`](legacy/2026-09-baseline/003-agent-effectiveness-guidance.md)
and [`004`](legacy/2026-09-baseline/004-efficiency-and-developer-ergonomics.md).

**Representative commands.** `npm test`, `npm run test:conformance`, `npm run test:mcp`,
`npm run test:evals`, `npm run typecheck`.

**Major deferrals.** Orchestration-overhead reporting, durable/hosted benchmarks, and the
whole-architecture release-readiness campaign in [`001`](001-current-status-and-roadmap.md).


## 16. Application SDK above core

**Implemented capability.** `@arrokothi/sdk` creates one shared Harness, stock Agent/Workflow
controllers, reference runtime services, shared model services, store-backed operation/memory views,
implementation registries, idempotent definition registration, preflighted initial creation/input,
and bounded host driving with explicit lifecycle/wait reasons. No authority is inferred from authored
requirements or catalogs. Core remains directly available.

**Evidence.** `packages/sdk/src/`, `packages/sdk/tests/`, the SDK-backed
`examples/execution-kernel-minimal/`, and `scripts/check-builder-docs.ts`.
The [SDK design/findings note](legacy/2026-09-baseline/009-sdk-bootstrap-design-and-findings.md) records defaults, limits,
constructor-validation and operation-index bug repairs, and unresolved architectural concerns.

**Boundaries.** This is application composition, not new kernel semantics. Preflight is advisory for
permissions and dynamic services; runtime remains authoritative. Default stores are in memory;
host waiting limits do not interrupt arbitrary trusted code or supply provider cancellation/durability.

## Current gaps and next work

The [active roadmap](001-current-status-and-roadmap.md) replaces P1–P7/B1–B3. Begin with K0 contract fixtures, then K1 asynchronous acceptance and K2 actions; R1 challenges native fidelity before K3 persistence. [F01–F19](003-evidence-and-findings.md)
record schema enforcement asymmetry, text/literal result limits, live-promise and activation recovery
gaps, scheduler fencing, physical store cost, long-lived state and distribution concerns. They are
not implemented fixes. The benchmark canary predates SDK HEAD and does not establish durability.
