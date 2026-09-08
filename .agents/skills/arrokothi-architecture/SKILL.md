---
name: arrokothi-architecture
description: >-
  Use when a task changes or reasons about ArrokothI Kernel, Execution, Execution Runtime/Driver,
  Activation/Outcome, Event/Effect, authority, lifecycle/recovery, deployment, trust/isolation,
  Agent/Workflow boundaries, or provider/runtime integration semantics. Not for routine bug fixes.
---

# ArrokothI architecture changes

ArrokothI separates a provider-neutral **Kernel** from opaque **Execution Runtimes**.

## Source of truth

Read [`docs/README.md`](../../../docs/README.md) and [`docs/mental-model.md`](../../../docs/mental-model.md), then the one detailed owner:

- `docs/kernel.md` for Kernel/Execution semantics;
- `docs/execution.md` for Runtime/Driver/Agent/Workflow semantics;
- `docs/deployment.md` for process topology, trust/isolation, embedding, and protocol placement.

`docs/mental-model-legacy/` is historical. Current implementation still contains legacy names and mechanisms; consult `docs/development/` for migration status rather than promoting implementation observations into architecture.

## Procedure

1. **Classify the concept.** Decide whether Kernel correctness depends on it. If not, prefer keeping it inside the Execution Runtime or deployment/integration layer.
2. **Read the canonical owner.** Do not reconstruct architecture from old `Harness`, controller-resumption, Agent-controller, Workflow-stage, or provider-specific implementation names.
3. **Inspect current code and tests.** Identify which behavior is useful Kernel truth and which behavior is migration debt from the previous model.
4. **Protect the boundary.** Kernel owns Execution identity/lifecycle, Events, governed Effects, authority, scheduling, communication, history, and recovery. Runtime owns semantic progression, model/graph/context/native memory/internal async work.
5. **Keep Activation asynchronous.** Slow Runtime work does not need a Kernel resumption concept. `WAITING` is only a Kernel-visible dependency reported in an accepted Outcome.
6. **Preserve single-writer semantics per Execution.** One accepted progress-writing Activation at a time; unrelated Executions may compute concurrently.
7. **Separate mediation from containment.** Trusted Runtime ambient actions are outside Kernel governance; isolated deployments require physical containment. Telemetry is not enforcement.
8. **Keep providers native when possible.** Prefer an `Execution Driver` for Hermes/OpenClaw/Dify/CrewAI rather than importing native cognition/graphs into Kernel semantics.
9. **Attribute tests correctly.** Separate Kernel, Agent Runtime, Workflow Runtime, Driver, and isolation failures.
10. **Synchronize migration artifacts.** Semantic changes should update canonical docs, development migration notes, implementation, and conformance tests together.

## Subtraction rule

> If the Kernel can remain correct without knowing a component or operation exists, it should normally stay outside the Kernel contract.

This rule is especially important for model calls, provider retries, graph nodes, context compaction, working notes, native memory, and runtime-local asynchronous work.
