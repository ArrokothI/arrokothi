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

Read [the overview](../../../mental-model/README.md), then the relevant major
abstraction and [reference index](../../../mental-model/reference.md). Canonical
definitions live in `mental-model/concepts/`; exact interactions in
`mental-model/mechanisms/`. The index and `mental-model/sources.md` identify ownership,
accepted decision coverage and intentionally unselected choices.

For accepted work, use `mental-model/roadmap.md` as expected maintenance scope and inspect
additional affected dependencies. Maintain Layer 3; change Layer 1/2 only for changes to
the whole-system model or major abstractions. Preserve sealed historical evidence under
008. Current code/API names are implementation observations, not target definitions.
Optional reference Runtime concepts are not mandatory Kernel entities or release promises.

## Traverse for the task

Use `reference.md` to find an exact owner and the directory READMEs for a learning
path. Follow the affected prerequisites and interactions; do not load every page
or reconstruct current rules from historical review rounds. Consult provenance
when a rationale or unresolved conflict requires it.

For a prose rewrite, establish the current contract before editing and use
[technical-documentation](../technical-documentation/SKILL.md) for reader experience
and semantic-preservation checks. Explanatory treatment is appropriate; changing
presentation does not authorize changing obligations or resolving open choices.
`mental-model/rewrite-index.md` tracks that editorial project and its open markers;
it is not a general coding prerequisite or a second specification.

For implementation, continue from the owner to the implemented baseline, affected
code, conformance tests, and applicable development process. An editorial rewrite
does not by itself require implementation work or an acceptance packet.

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
