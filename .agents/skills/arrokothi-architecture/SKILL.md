---
name: arrokothi-architecture
description: >-
  Use when a task changes or reasons about ArrokothI Kernel, Execution, Execution Runtime/Driver,
  Activation/Outcome, Event/Effect, authority, lifecycle/recovery, deployment, trust/isolation,
  Agent/Workflow boundaries, composition, memory/state, or provider/runtime integration semantics.
  Not for routine bug fixes.
---

# ArrokothI architecture changes

ArrokothI separates a provider-neutral **Kernel** from opaque **Execution Runtimes**.

## Source of truth

Read [`docs/README.md`](../../../docs/README.md) and [`docs/mental-model.md`](../../../docs/mental-model.md), then the one detailed owner:

- `docs/kernel.md` for Kernel/Execution semantics;
- `docs/execution.md` for Runtime/Driver/Agent/Workflow semantics;
- `docs/deployment.md` for process topology, trust/isolation, embedding, and protocol placement.

Use `docs/detail-design/README.md` for implementation-oriented depth:

- `execution-protocol.md`: identities, receipts, batches, waits/deadlines and terminal obligations;
- `authority-and-actions.md` + `action-lifecycle.md`: principals, consent/revocation, admission, certainty and delivery;
- `recovery-and-compatibility.md`: native/Kernel failure windows, checkpoint pinning and version/refusal;
- `composition-and-communication.md`: children, reply ownership, finite budgets and supervision;
- `runtime-composition.md`, `memory-and-state.md`, `context-and-projections.md`: optional Runtime authoring/state/context;
- `runtime-integration.md` + `interoperability.md`: native fidelity and protocol/schema mappings;
- `resources-and-isolation.md` + `evidence-and-observability.md`: physical lifetime, cleanup, inspection and attribution.

Each detail page expands its canonical owner and labels target/optional status and roadmap gates.
Current design must remain understandable without legacy files. `docs/future-plan.md` preserves
unresolved hypotheses; it is not another implementation sequence.

The legacy mental-model directory was removed; current detail design preserves retained concepts,
and Git history supplies historical comparison. Current implementation still contains legacy names and mechanisms; consult `docs/development/` for migration status rather than promoting implementation observations into architecture.

## Procedure

1. **Classify the concept.** Decide whether Kernel correctness depends on it. If not, prefer keeping it inside the Execution Runtime or deployment/integration layer.
2. **Read the canonical owner.** Do not reconstruct architecture from old `Harness`, controller-resumption, Agent-controller, Workflow-stage, or provider-specific implementation names.
3. **Read the relevant detail contract and counterexamples.** Use the map above; do not reconstruct missing semantics from legacy names. Distinguish required boundary rules from optional Runtime design and research.
4. **Inspect current code and tests.** Identify which behavior is useful Kernel truth and which behavior is migration debt from the previous model.
5. **Protect the boundary.** Kernel owns Execution identity/lifecycle, Events, governed Effects, authority, scheduling, communication, history, and recovery. Runtime owns semantic progression, model/graph/context/native memory/internal async work.
6. **Keep Activation asynchronous.** Slow Runtime work does not need a Kernel resumption concept. `WAITING` is only a Kernel-visible dependency reported in an accepted Outcome.
7. **Preserve single-writer acceptance.** One current Activation is authorized to commit progress. An obsolete host may remain alive; native mutation needs its own exclusion or takeover refusal.
8. **Separate mediation from containment.** Trusted Runtime ambient actions are outside Kernel governance; isolated deployments require physical containment. Telemetry is not enforcement.
9. **Keep providers native when possible.** Prefer an `Execution Driver` for Hermes/OpenClaw/Dify/CrewAI rather than importing native cognition/graphs into Kernel semantics.
10. **Attribute tests correctly.** Separate Kernel, Agent Runtime, Workflow Runtime, Driver, and isolation failures.
11. **Synchronize migration artifacts.** Implementation changes update canonical/detail docs, migration notes, code and conformance together. A documentation-only redesign records the target/implementation gap and assigns acceptance tests to slices without claiming implementation. Keep historical evidence unchanged except explicit routing repairs.

## Boundary and design depth

> If the Kernel can remain correct without knowing a component or operation exists, it should normally stay outside the Kernel contract.

This rule protects model calls, provider retries, graph nodes, context compaction, Working Notes, native memory and Runtime-local async work. It does not mean deleting useful implementation knowledge. Preserve deeper design and introduce richer contracts when a concrete guarantee needs them. Opacity still requires a recovery contract; uncertainty, request disposition and responsibility must not collapse into one status.

Before incorporating provider source or dependencies, follow the third-party code and license review
in `AGENTS.md`; prior-art references are not clearance for commercial reuse.
