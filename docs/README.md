# Arrokoth Architecture Documents

These documents describe the current design target for Arrokoth. They are separated by abstraction level so the conceptual model stays small while composition/runtime mechanics can evolve independently.

## Recommended reading order

1. [`mental-model.md`](mental-model.md) — canonical conceptual model: Execution, Workflow vs Agent, Event/Effect, authority/exposure, memory/context, ownership/communication, and the core invariants.
2. [`composition.md`](composition.md) — composition semantics shared across Agents and Workflows: local computation vs child Executions, Workflow Stages, Effects, pending work, completion boundaries, retrieval patterns, and Adapters.
3. [`runtime-architecture.md`](runtime-architecture.md) — Harness/runtime semantics: ExecutionContext, lifecycle, scheduling, pending operations, messaging, authority, memory visibility, Working Notes, confirmation, durability, and provenance.
4. [`implementation-guide.md`](implementation-guide.md) — non-normative implementation mapping, suggested contracts, conformance scenarios, and a practical way to derive a coding plan.
5. [`future-plan.md`](future-plan.md) — unresolved questions, experiments, and likely future work.

For a new engineer or coding agent, reading the first four in order should be enough to understand the target architecture before inspecting the codebase.

## Document authority

When documents appear to disagree, use this priority:

```text
mental-model.md
    ↓ conceptual truth
composition.md / runtime-architecture.md
    ↓ domain refinements
implementation-guide.md
    ↓ implementation proposal
future-plan.md
    ↓ open questions / experiments
legacy/*
    ↓ historical context only
```

Files under [`legacy/`](legacy/) are design history. They may describe older models, including the earlier idea that every LLM or Function invocation was itself an Execution.

## Architecture in one picture

```text
                         one logical Harness
                                │
                       manages Executions
                                │
                  ┌─────────────┴─────────────┐
                  ▼                           ▼
          Workflow Execution            Agent Execution
                  │                           │
       system-defined semantic       model-directed semantic
              topology                    progression
                  │                           │
                  └──────── Effects ──────────┘
                                │
                             Harness
                                │
                              Events
```

Inside a Workflow:

```text
Workflow Execution
  └── Stage
      ├── Function computation
      ├── LLM inference
      ├── Effects
      ├── call Agent Execution
      └── call Workflow Execution
```

Inside an Agent:

```text
context
  ↓
LLM
  ↓
model chooses next semantic action
  ↓
Effects / child calls / messages
  ↓
Events and observations
  ↓
next agentic step
```

The central boundary is:

> **An Execution is an independently managed runtime entity. Composition alone does not create an Execution boundary.**

In v0.4, Agent and Workflow are the Execution kinds we need. Function calls, LLM inference, Stages, and Adapters normally run inside an enclosing Execution.

A useful practical test is: if a unit does not need independently meaningful identity/addressability, lifecycle/waiting, authority/budget, mailbox/Events, cancellation/supervision, durability/recovery, or child ownership, it normally should not become another Execution.

## Stable invariants vs current hypotheses

### Stable target invariants

- Definition and Execution are different concepts.
- Agent and Workflow are the primary independently managed Execution kinds in v0.4.
- Workflow means system-defined semantic topology.
- Agent means model-directed open-ended semantic progression.
- Events are observations; Effects are requests to the runtime.
- The runtime/executor/environment establishes what actually happened.
- Authority is different from what the model currently sees.
- Memory is different from current model context.
- Ownership is different from communication permission.
- A response/message is different from a terminal result.
- Execution terminal-result typing is independent from Workflow Stage-result typing.
- One logical Harness manages many Executions.
- A Stage is not another Execution and does not own Effects.
- Adapters are attached transformations, not independent controllers.
- Cross-Execution memory/context visibility is explicitly delegated; ancestry alone grants no visibility.

### Current v0.4 hypotheses to test

- Stage transitions carry only `text | none`; larger structured shared information goes through Structured Memory or Artifacts.
- Work designated as required for the current Stage settles before a Stage transition.
- Working Notes use stack-like ancestry plus a visibility/delegation filter: a child may receive selected parent notes read-only and writes only its own frame.
- Sequential Stage note handoff is opt-in and defaults to no handoff.
- Adapters are Effect-free in v0.4.
- Broad non-blocking and detached-child semantics remain intentionally conservative until tested.
- Dynamic model-driven mutation of Workflow topology is out of scope; prefer model-driven changes to data.

## Using these docs to make a coding plan

Before mapping files to tasks:

1. read the four architecture documents;
2. list the invariants the feature or migration must preserve;
3. inspect the current code and identify components that already satisfy those responsibilities;
4. separate semantic gaps from naming/package cleanup;
5. implement the smallest slice that can be validated by a conformance scenario;
6. leave unresolved questions explicit instead of freezing them accidentally in an API.

See [`implementation-guide.md`](implementation-guide.md) for suggested implementation slices and conformance tests.
