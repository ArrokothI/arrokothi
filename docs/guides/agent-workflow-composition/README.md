# Agent and Workflow composition guide

> **Status:** application/developer guidance for building applications **on** ArrokothI 0.8.x.
> **Role:** a decision procedure and a router. **Not canonical kernel architecture.**
>
> This guide owns no ArrokothI concept. When it and a canonical document disagree, the canonical
> document wins and this guide is the thing that is wrong. Resolve every semantic question through
> the ownership table in [`../../README.md`](../../README.md), and establish what the runtime
> actually implements from
> [`../../development/002-implemented-kernel-baseline.md`](../../development/002-implemented-kernel-baseline.md).
>
> Framework-neutral external engineering guidance — deliberately not ArrokothI truth — is in
> [`../../agent-engineering/`](../../agent-engineering/README.md). This guide translates it into
> ArrokothI composition choices; it does not import it as architecture.
>
> **This precedence rule is stated once, here.** The topic pages name only their own canonical
> owner.

---

## What this guide is for

You have an application specification. You need an Agent/Workflow composition that satisfies it.

```text
application / product requirements
        ↓  extract observable requirements
agent/workflow engineering reasoning
        ↓  control ownership and determinism
ArrokothI composition choices
        ↓  memory, context, capabilities, Effects, authority
implementation
        ↓  deterministic tests, then behavioural evaluation
evaluation
```

Three rules govern everything in these pages.

> **Build the smallest composition that can satisfy the observable requirements, then let evidence
> justify each increment.**

> **Enforce a hard requirement in code, state, schema, or a gate. A prompt sentence is a
> preference, not an enforcement mechanism.**

> **Design against the surface you chose, not against the kernel's vocabulary.** The kernel
> understands more than any stock Agent or Stage can emit. Read
> [current authoring surface](current-authoring-surface.md) before sketching a composition — it is
> what decides whether a design is buildable at all.

---

## Where to go next

Load only the page for the decision you are making.

| What am I deciding? | Read |
|---|---|
| What are the real requirements, and which are deterministic? | [requirements-and-control.md](requirements-and-control.md) |
| Workflow or Agent? Which Stage kind? | [workflow-agent-and-stages.md](workflow-agent-and-stages.md) |
| **Can my chosen surface actually emit this today?** | [current-authoring-surface.md](current-authoring-surface.md) |
| Where should this state live? What goes in the model's context? | [state-memory-and-context.md](state-memory-and-context.md) |
| How do I design this operation? Does it need authority or confirmation? | [capabilities-effects-and-authority.md](capabilities-effects-and-authority.md) |
| Do I need a child Execution? How does its result come back? Parallel branches? | [composition-children-and-concurrency.md](composition-children-and-concurrency.md) |
| How do I test this? My eval failed — what now? | [evaluation-and-diagnosis.md](evaluation-and-diagnosis.md) |
| Show me a concrete composition. | [worked-examples.md](worked-examples.md) |

Frequent specific questions and their destination:

```text
"Can an LLM Stage write Structured Memory?"        current-authoring-surface.md
"Can a Workflow hold a conversation?"              current-authoring-surface.md
"Which import path do I use?"                      current-authoring-surface.md
"Is Artifact/File available?"                      state-memory-and-context.md
"Can a Function Stage read committed memory?"      state-memory-and-context.md
"Does this action need confirmation?"              capabilities-effects-and-authority.md
"Does this Effect have a deadline?"                capabilities-effects-and-authority.md
"How does a child Agent return its result?"        composition-children-and-concurrency.md
"What must a fork's join Stage be?"                composition-children-and-concurrency.md
"Should a failing eval change the kernel?"         evaluation-and-diagnosis.md
```

---

## Requirements → ArrokothI mapping

A compact reference; follow the linked page for the conditions. **Check
[current authoring surface](current-authoring-surface.md) before committing to a row** — the surface
you pick decides whether the mechanism named here is authorable from it.

| Requirement shape | ArrokothI choice | Page |
|---|---|---|
| Known semantic progression | **Workflow** definition (`defineWorkflow`) with declared Stages and transitions | [workflow](workflow-agent-and-stages.md) |
| Unpredictable semantic progression | **Agent** definition (`defineAgent`) with explicit `limits` | [workflow](workflow-agent-and-stages.md) |
| Exact deterministic transform | **Function Stage** (`implementationRef` → application code), or host logic | [requirements](requirements-and-control.md) |
| Known language task in a fixed topology | **LLM Stage** with `maxModelPhases` and declared `callables` | [workflow](workflow-agent-and-stages.md) |
| Choice among known outcomes | LLM or Function Stage + **labelled transitions** | [workflow](workflow-agent-and-stages.md) |
| Specialized, independently progressing autonomous sub-task | **Agent Stage** → child Agent `call` | [composition](composition-children-and-concurrency.md) |
| Reusable sub-process with its own topology | **Workflow Stage** → child Workflow `call` | [composition](composition-children-and-concurrency.md) |
| Independent concurrent work inside one Workflow | **system-defined fork/join**: ≥2 single-Stage adapter-free branches, join successor is **exactly one Function Stage** | [composition](composition-children-and-concurrency.md) |
| Explicit authoritative application fact | **Structured Memory** field (schema-bound; written via `WriteMemory` from an Agent or a Function Stage — never an LLM Stage) | [state](state-memory-and-context.md) |
| Temporary controller/model scratch | **Working Notes** (`spec.workingNotes`, `working_notes_set`) | [state](state-memory-and-context.md) |
| Inferred or retrieved semantic claim | **Derived Semantic Memory** claim with provenance | [state](state-memory-and-context.md) |
| Accepting an inferred claim as fact | explicit **promotion** (`promoteDerivedClaim` → `WriteMemory` with provenance) | [state](state-memory-and-context.md) |
| A model-interpreted value that must be factually right | an explicit acceptance step — deterministic parsing, source-of-record lookup, user confirmation, or host policy. Schema validation alone checks shape only | [requirements](requirements-and-control.md) |
| Grounded record lookup | read-only **capability operation** (`UseCapability`), filtered deterministically | [capabilities](capabilities-effects-and-authority.md) |
| Large optional context universe | bounded retrieval + reference-then-detail operations; small Active View | [state](state-memory-and-context.md) |
| Consequential external action | **Effect** through the Harness + authorization + declared consequentiality | [capabilities](capabilities-effects-and-authority.md) |
| Approval of one exact payload | **`ConfirmationPolicy`** (mechanical confirmation) | [capabilities](capabilities-effects-and-authority.md) |
| A value only a person can supply | **`RequestUserInput`** — not emittable by a stock Agent or Stage | [surface](current-authoring-surface.md) |
| Talking to an existing Execution | **`SendMessage`** — not emittable by a stock Agent or Stage | [surface](current-authoring-surface.md) |
| Multi-turn conversation | **Agent** Execution. A stock Workflow consumes `external.input` only once | [surface](current-authoring-surface.md) |
| Reading committed facts in code | **host code** via `Harness.structuredMemoryOf`. Neither Stage code nor a `CapabilityExecutor` can read memory | [state](state-memory-and-context.md) |
| Getting work back from a child | the child's **terminal result**, or an application-defined external mechanism | [composition](composition-children-and-concurrency.md) |
| Large durable work product | **application-owned storage** reached through a capability. `Artifact/File` is canonical vocabulary with **no** 0.8.x mechanism | [state](state-memory-and-context.md) |
| Must survive context resets | Structured Memory / application-owned durable store — never only the transcript | [state](state-memory-and-context.md) |
| "This must never happen" | withhold authority **and** exposure; add a gate. Not an instruction | [capabilities](capabilities-effects-and-authority.md) |
| Bounding autonomous work | `AgentLimits`, the `UseCapability` operation deadline, lineage `structuralSpawnBudget`. Child/peer/user-input waits have **no** configured deadline | [capabilities](capabilities-effects-and-authority.md) |
| Safe retry of a consequential external action | `EffectIdempotencyScope` on `UseCapability` **plus** external idempotency you design | [capabilities](capabilities-effects-and-authority.md) |
| Concurrent writers to one memory view | `expectedRevision` + explicit conflict handling | [state](state-memory-and-context.md) |
| Style / tone / format | instructions **plus** an eval rubric | [evaluation](evaluation-and-diagnosis.md) |
| "How do we know it works?" | eval case grading the world, not the transcript | [evaluation](evaluation-and-diagnosis.md) |

---

## End-to-end builder procedure

Follow these in order. Steps 1–5 are where composition quality is actually decided; do not skip
ahead to implementation. This procedure exists **only here** — the topic pages hold the detail each
step needs.

1. **Extract observable requirements.** For each requirement: what must be true, what in the world
   proves it, who establishes it, how failure becomes visible. Name every requirement with no
   observable. → [requirements-and-control.md](requirements-and-control.md)

2. **Separate hard requirements from qualitative ones.** For each hard requirement write the exact
   mechanism — field + schema, transition, gate, authorizer rule, confirmation rule, idempotency
   scope, budget. Anything left in prose is a known, deliberate risk.
   → [requirements-and-control.md](requirements-and-control.md)

3. **Identify environmental sources of truth.** What can *report* reality rather than assert it.
   These become your stopping conditions and your graders.
   → [requirements-and-control.md](requirements-and-control.md)

4. **Decide Workflow vs Agent boundaries.** Produce a topology sketch naming, for each node, its
   Stage kind or its Execution kind. Default to the smallest shape.
   → [workflow-agent-and-stages.md](workflow-agent-and-stages.md)

5. **Check the chosen surface can emit what the design needs.** If it cannot, work down the
   escalation ladder — another composition, host orchestration, an application-supplied port, and
   only then a custom controller. → [current-authoring-surface.md](current-authoring-surface.md)

6. **Define state and memory ownership.** Run the classification tree over every piece of
   information, and state the child return path explicitly.
   → [state-memory-and-context.md](state-memory-and-context.md)

7. **Design capabilities and Effects.** Name, description, bounded input schema, output shape,
   error text, consequentiality classification, and — for `UseCapability` — idempotency scope and
   deadline. → [capabilities-effects-and-authority.md](capabilities-effects-and-authority.md)

8. **Define authority, exposure, and confirmation.** The operation grant, the narrowest exposure
   request, which payloads need a human decision, child attenuation, the lineage spawn budget, and
   what is deliberately absent. → [capabilities-effects-and-authority.md](capabilities-effects-and-authority.md)

9. **Design context and retrieval.** The smallest set of levers, each justified by what it buys.
   Prefer reference-then-detail over bulk loading.
   → [state-memory-and-context.md](state-memory-and-context.md)

10. **Define budgets and stopping rules.** Per Agent, per Workflow, per `UseCapability`, per wait
    with no configured deadline, per lineage. Make exhaustion a reported failure.
    → [capabilities-effects-and-authority.md](capabilities-effects-and-authority.md)

11. **Implement the smallest working composition.** Author definitions as portable data, wire the
    application side, and get one end-to-end path working against a deterministic offline provider
    before adding a second requirement. → [current-authoring-surface.md](current-authoring-surface.md)

12. **Build deterministic tests first, then evaluate behaviour.** Deterministic tests are what
    actually enforce the specification; evals grade the world, not the transcript.
    → [evaluation-and-diagnosis.md](evaluation-and-diagnosis.md)

13. **Diagnose failures before increasing complexity.** Classify each failure and fix at that layer.
    Resist adding an Agent where a Stage would do, and instructions where a gate would do.
    → [evaluation-and-diagnosis.md](evaluation-and-diagnosis.md)

---

## Import surface, and a runnable reference

**Application code imports from `@arrokothi/core/execution`, `@arrokothi/core/ports`, and
`@arrokothi/core/reference`.** The package root `@arrokothi/core` still carries the legacy
Session/Flow/`AgentRuntime` API and exports a *different* `defineAgent` and `AgentDefinition` — the
most common wrong turn available here.

[`examples/execution-kernel-minimal/`](../../../examples/execution-kernel-minimal/README.md) is a
deterministic, offline, key-free application assembled from those surfaces, with one authorized path
and one deny-by-default path:

```bash
npm run example:execution-kernel
npm run test:example:execution-kernel
```

Full details, the legacy-collision warning, and the `@arrokothi/core/testing` policy are in
[current-authoring-surface.md](current-authoring-surface.md).

---

## Known friction, and what this guide does not decide

Building on the current kernel has real rough edges, and most of them are deliberate scope decisions
rather than gaps. They are recorded and classified in
[`../../development/007-application-builder-ergonomics-findings.md`](../../development/007-application-builder-ergonomics-findings.md);
SDK-level questions they raise are tracked in [`../../future-plan.md`](../../future-plan.md) §14.
Read those before concluding that a clumsy-feeling composition is your design's fault, and before
proposing a kernel change.

This guide does not decide:

- **Kernel semantics.** Every concept used here is owned elsewhere. If this guide seems to grant a
  semantic, it does not.
- **Anything on the roadmap.** Portable service descriptors, expanded MCP, A2A, progressive
  heterogeneous discovery, hosted/isolated profiles, and durable restart are tranches H–N in
  [`../../development/001-current-status-and-roadmap.md`](../../development/001-current-status-and-roadmap.md).
  Do not design an application that assumes them.
- **Canonical concepts that are not implemented.** Some vocabulary is architecturally defined
  without an executable 0.8.x mechanism — `Artifact/File` is the clearest case, and memory *scope*
  beyond Execution-local is another. Ideas to think with, not APIs to call.
- **New vocabulary.** No new Stage kind, Effect kind, Event kind, memory form, or Execution kind
  follows from an application need.
- **Benchmark answers.** This guide generalises deliberately.

### Escalation

If a requirement genuinely cannot be expressed, that is a **candidate architecture issue**, not
something to build. Record it in
[`../../development/007-application-builder-ergonomics-findings.md`](../../development/007-application-builder-ergonomics-findings.md)
at the correct classification — documentation, ergonomics/API, effectiveness strategy, or possible
semantic gap — and stop. Changing a kernel contract is separate, separately authorized work against
the owning canonical document.

### Vocabulary used without redefining

`Execution`, `Definition`, `Harness`, `Activation`, `Event`, `Effect`, `Agent`, `Workflow`, `Stage`,
`Adapter`, `Structured Memory`, `Derived Semantic Memory`, `Working Notes`, `Artifact/File`,
`Catalog`, `Effective Authority`, `Active View`, `Model Invocation Projection`, `PendingOperation`,
`ControllerResumption`, `Skill`. Each has exactly one canonical owner. To learn what one *means*, go
to the owner, not to these pages.

Before your first design, read
[`../../agent-engineering/01-agent-vs-workflow.md`](../../agent-engineering/01-agent-vs-workflow.md)
and [`02-context-tools-and-skills.md`](../../agent-engineering/02-context-tools-and-skills.md); they
carry the general engineering reasoning this guide assumes.
