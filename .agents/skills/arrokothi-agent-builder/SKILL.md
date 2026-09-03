---
name: arrokothi-agent-builder
description: >-
  Use when building an application on ArrokothI: turning product requirements or a specification
  into an Agent/Workflow composition, choosing Workflow vs Agent, choosing a Function/LLM/Agent/
  Workflow Stage, deciding what belongs in Structured Memory, Working Notes, Derived Semantic
  Memory, context, or an external store, designing model-facing capabilities and Effects, setting
  authority/exposure/confirmation and budgets for an application, or redesigning an existing
  application composition for effectiveness. Not for changing kernel semantics (use
  arrokothi-architecture), adding or changing a provider/protocol adapter (use
  arrokothi-provider-integration), or implementing/auditing a development slice (use
  arrokothi-slice-audit).
---

# Building an application on ArrokothI

This skill builds **applications on top of** the kernel. It never changes kernel semantics. If the
task turns out to require a new Stage kind, Effect kind, Event kind, memory form, Execution kind, or
any other contract change, stop and switch to `arrokothi-architecture` — do not add it here.

The full decision procedure is
`docs/guides/agent-workflow-composition.md`.
This skill is the entry point and the discipline; the guide is the manual. Do not restate the guide
here.

## Source of truth

```text
canonical concept owner        docs/README.md table → the owning document
what is actually implemented   docs/development/002-implemented-kernel-baseline.md
what is only planned           docs/development/001-current-status-and-roadmap.md
how to decide (this task)      docs/guides/agent-workflow-composition.md
external engineering guidance  docs/agent-engineering/   (framework-neutral; NOT ArrokothI truth)
```

This skill defines workflow, not architecture. The canonical owner overrides stale skill or guide
text. Using this skill does not justify editing it or the guide; update either only when an accepted
change makes it materially false, obsolete, or incomplete.

**Import surface.** Application code for the current kernel imports from `@arrokothi/core/execution`,
`@arrokothi/core/ports`, and `@arrokothi/core/reference`. The package root `@arrokothi/core` still
carries the legacy Session/Flow/`AgentRuntime` API and exports a *different* `defineAgent` and
`AgentDefinition`. Every example under `examples/` currently targets that legacy surface. Never
import `@arrokothi/core/testing` into application code.

## Procedure

1. **Extract observable requirements.** For each requirement in the specification, record what must
   be true, what in the world proves it, who establishes it, and how failure becomes visible. Name
   every requirement that has no observable. Do not begin naming ArrokothI abstractions yet.

2. **Separate hard requirements from qualitative ones.** Classify each requirement (deterministic
   state / calculation / fixed progression / open-ended reasoning / grounded lookup / external side
   effect / human interaction / style / long-horizon state / temporary state / evaluation-only).
   For every hard requirement, name the exact mechanism — field schema, transition, gate, authorizer
   rule, confirmation rule, idempotency scope, budget. **Do not enforce a checkable requirement with
   prompt text.** A giant system prompt built from the specification is the failure mode this step
   exists to prevent.

3. **Identify environmental sources of truth.** List what can report reality rather than assert it:
   record stores, validators, schema validation, committed memory values, capability outcomes,
   tests. These become the stopping conditions and the graders. A model's claim is never evidence.

4. **Establish current repository truth before designing.** Read the canonical owner for each
   concept in play, then `002-implemented-kernel-baseline.md`. Confirm each mechanism you intend to
   use exists today. Progressive heterogeneous action discovery, portable service descriptors,
   expanded MCP/A2A, hosted or isolated security profiles, and durable crash restart are roadmap
   tranches H–N — never design an application that assumes them.

5. **Decide Workflow vs Agent boundaries.** Workflow = system-defined semantic topology; Agent =
   model-directed open-ended progression. The number of LLM calls decides nothing; a model choosing
   among *declared* transition labels is still a Workflow. Prefer the smallest composition that can
   satisfy the requirements, and prefer a Workflow with one Agent Stage over an Agent wrapping a
   knowable process. Justify every additional Execution and every parallel fork explicitly.

6. **Define state and memory ownership.** Run the guide's decision tree per piece of information.
   Preserve `memory ≠ context`, `Working Notes ≠ authority`, `Derived Semantic Memory ≠ asserted
   truth`. Structured Memory is Execution-local and schema-bound; children do not inherit it;
   Working Notes hand off parent→child explicitly and never return automatically. State the child
   return path (terminal result, shared state, or Artifact) explicitly.

7. **Design capabilities and Effects.** Design the model-facing surface as an interface, not as an
   API mirror: distinct purposes, descriptions written as prompts, bounded input schemas,
   high-signal filtered outputs, actionable errors, grounding separated from action. Classify
   consequentiality in the catalog — unclassified is treated as consequential. Anything crossing the
   Execution boundary is an Effect the Harness authorizes, including one a Function Stage decided
   deterministically.

8. **Set authority, exposure, confirmation, and budgets.** For every action answer: may it be
   exposed, may it be authorized, does it need exact-payload confirmation, should it be
   deterministic instead, and does it belong outside model control entirely. Keep exposure the
   narrowest useful request and authority deny-by-default. Attenuate `requestedOperations` per
   child. Set `AgentLimits`, deadlines, and the lineage `structuralSpawnBudget`; budgets are not
   permissions, and exhaustion must be a reported failure.

9. **Design context deliberately.** Aim for the smallest high-signal working set sufficient for the
   next decision. Every context lever is absent by default; add one only when you can say what it
   buys. Prefer reference-then-detail capability pairs over bulk loading. Keep information selection
   and action exposure separate — a context compiler never chooses callables.

10. **Implement the smallest working composition.** Author definitions as portable data (no provider
    ids, clients, or keys). Wire the application side explicitly. Get one end-to-end path working
    against a deterministic scripted provider before adding the second requirement.

11. **Build deterministic tests first.** Cover schema rejection, transitions, gates, exact
    calculations, denial, confirmation decline, memory conflict, unknown outcomes, idempotency, and
    budget exhaustion. These, not the prompt, are what enforce the specification.

12. **Then evaluate behaviour, grading the world.** Keep application evals separate from kernel
    conformance (`npm test` asks whether the runtime kept its contract; `npm run test:evals` asks
    whether a configuration accomplished the task). Own a small deterministic world and grade its
    final state, not the transcript. Record task success, hard-requirement failures, grounding
    failures, state correctness, tool/effect correctness, model calls, tool calls, turns, and
    context/token use. Include denial, decline, failure, unknown, and conflict paths. Keep held-out
    cases.

13. **Classify every failure before adding complexity.** Assign exactly one class — application
    composition, prompt/context, tool/interface, model limitation, framework ergonomics, genuine
    missing kernel contract, or evaluation/grader — and fix at that layer. Resist the two standard
    reflexes: adding an Agent where a Stage would do, and adding instructions where a gate would do.

14. **Escalate gaps; never smuggle them.** A failing eval or benchmark does not justify changing
    kernel semantics. If a genuine missing contract appears, document it as a candidate architecture
    issue against the owning canonical document (see
    `docs/development/007-application-builder-ergonomics-findings.md` for the format) and stop.

## Validation

Match validation to what changed. Application code: the application's own deterministic tests, then
`npm run typecheck`; add `npm test` when anything under `packages/` or `tests/conformance/` was
touched, and `npm run test:evals` when Agent behaviour is in scope. Documentation-only work
validates its own artifacts and links. Local runs are not CI; do not report them as such.
