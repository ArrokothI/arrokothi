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

For concrete current designs below those owners, use `docs/detail-design/`:

- authority/actions;
- memory/state/context;
- composition/communication;
- interoperability/protocol mapping.

These detail pages expand the canonical owner; they do not override it or recreate the previous architecture.

`docs/mental-model-legacy/` is historical. Current implementation still contains legacy names and mechanisms; consult `docs/development/` for migration status rather than promoting implementation observations into architecture.

## Procedure

1. **Classify the concept.** Decide whether Kernel correctness depends on it. If not, prefer keeping it inside the Execution Runtime or deployment/integration layer.
2. **Read the canonical owner.** Do not reconstruct architecture from old `Harness`, controller-resumption, Agent-controller, Workflow-stage, or provider-specific implementation names.
3. **Read detail design when relevant.** Authority, memory, composition, and interoperability have curated current detail under `docs/detail-design/`; legacy files are historical comparison only.
4. **Inspect current code and tests.** Identify which behavior is useful Kernel truth and which behavior is migration debt from the previous model.
5. **Protect the boundary.** Kernel owns Execution identity/lifecycle, Events, governed Effects, authority, scheduling, communication, history, and recovery. Runtime owns semantic progression, model/graph/context/native memory/internal async work.
6. **Keep Activation asynchronous.** Slow Runtime work does not need a Kernel resumption concept. `WAITING` is only a Kernel-visible dependency reported in an accepted Outcome.
7. **Preserve single-writer semantics per Execution.** One accepted progress-writing Activation at a time; unrelated Executions may compute concurrently.
8. **Separate mediation from containment.** Trusted Runtime ambient actions are outside Kernel governance; isolated deployments require physical containment. Telemetry is not enforcement.
9. **Keep providers native when possible.** Prefer an `Execution Driver` for Hermes/OpenClaw/Dify/CrewAI rather than importing native cognition/graphs into Kernel semantics.
10. **Attribute tests correctly.** Separate Kernel, Agent Runtime, Workflow Runtime, Driver, and isolation failures.
11. **Synchronize migration artifacts.** Semantic changes should update canonical/detail docs, development migration notes, implementation, and conformance tests together.

## Subtraction rule

> If the Kernel can remain correct without knowing a component or operation exists, it should normally stay outside the Kernel contract.

This rule is especially important for model calls, provider retries, graph nodes, context compaction, Working Notes, native memory, and Runtime-local asynchronous work.
