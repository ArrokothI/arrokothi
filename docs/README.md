# ArrokothI Architecture Documents

This directory contains the canonical architecture for ArrokothI plus implementation working documents and one retained research dossier.

The canonical documents intentionally have **non-overlapping ownership**:

> **A concept is defined once. Other documents reference it; they do not redefine it.**

---

## Canonical document map

| Document | Sole responsibility |
|---|---|
| [`mental-model.md`](mental-model.md) | Whole-system conceptual picture and strongest invariants |
| [`execution-runtime.md`](execution-runtime.md) | Execution, Harness, lifecycle, Activation, Events/Effects, waiting/resumption, scheduling, concurrency, correlation, cancellation, supervision, durability |
| [`composition.md`](composition.md) | Agent/Workflow composition, Stage, local compute, parallel branches, spawn/call/send/ask, Adapter, Skill |
| [`authority.md`](authority.md) | authority, delegation, application principals/policy inputs, Catalog → Effective Authority → Active View → Model Projection, confirmation/evidence |
| [`memory.md`](memory.md) | Structured/Derived/Working/Artifact memory forms, scopes/views, provenance, promotion, retrieval, context compilation |
| [`interoperability.md`](interoperability.md) | portable Operations/Resources/services/Skills/templates/handles and MCP/A2A/Agent Skills/API/protocol bindings |
| [`security-guarantees.md`](security-guarantees.md) | security guarantees, trust assumptions, deployment profiles, control-plane vs runtime authority, containment boundary |
| [`future-plan.md`](future-plan.md) | unresolved or post-v0.4 questions only |

Supporting material:

| Path | Role |
|---|---|
| [`development/`](development/) | current implementation plans, audits, slice decisions, reviews, migration notes |
| [`architecture-research-dossier.md`](architecture-research-dossier.md) | retained non-canonical research/source dossier; useful evidence and external-system survey |

The research dossier is intentionally **not** canonical even when it contains useful reasoning. When it conflicts with a canonical document, the canonical document wins.

---

## Reading paths

### Want the whole system?

```text
README → mental-model
```

### Building/composing Agents and Workflows?

```text
mental-model → composition
```

Then follow links from `composition.md` to:

```text
execution-runtime  for waiting/concurrency/lifecycle
memory             for Working Notes/shared state/context
Authority          for child/peer/resource permissions
interoperability   for Skill/service/protocol projection
security           for trust/containment implications
```

### Working on runtime semantics?

```text
mental-model → execution-runtime
```

Use `composition.md` when the runtime question depends on Stages/Agents/children, `authority.md` for authorization, and `memory.md` for retained state.

### Working on permissions/exposure/policy?

```text
mental-model → authority
```

Then use:

```text
execution-runtime      concrete Effect enforcement and settlement
memory                 memory views/trust/evidence implications
interoperability       descriptor/protocol exposure
security-guarantees    deployment/security claims
```

### Working on memory/context?

```text
mental-model → memory
```

Use `authority.md` for visibility/permission and `composition.md` for Working Note/Stage/child handoff consequences.

### Working on MCP/A2A/Agent Skills/APIs?

```text
mental-model → interoperability
```

Read `authority.md` first when discovery/exposure is involved. Read `execution-runtime.md` when async handles/tasks map to runtime waiting/correlation.

### Working on security guarantees?

```text
mental-model → authority → security-guarantees
```

Also read `memory.md` for inferred-vs-trusted information and `interoperability.md` for protocol/control-plane boundaries.

### Working on something intentionally beyond current semantics?

```text
future-plan
```

### Actually implementing or reviewing the current slice?

```text
development/
```

Development docs may contain historical assumptions. Canonical docs take precedence when they disagree.

---

## Document authority

When documents appear to disagree, resolve by **concept ownership**, not by recency or file length.

```text
mental-model.md
  owns the whole-system conceptual picture

execution-runtime.md
  owns runtime truth

composition.md
  owns composition truth

authority.md
  owns authority/exposure/policy-boundary truth

memory.md
  owns memory/context/provenance truth

interoperability.md
  owns portable interface/protocol mapping truth

security-guarantees.md
  owns security/deployment guarantee claims

future-plan.md
  owns only unresolved/future questions

development/
  owns implementation work-in-progress, not architecture truth

architecture-research-dossier.md
  research evidence only, never canonical truth
```

For example:

```text
What does WAITING mean?
  → execution-runtime.md

Can a child see parent Working Notes?
  → memory.md for visibility semantics
  → composition.md for child-composition consequence

Does an MCP Tool grant permission?
  → authority.md says exposure ≠ authority
  → interoperability.md owns the MCP mapping

Does a sandbox define Execution?
  → execution-runtime.md says no
  → security-guarantees.md owns containment guarantees
```

---

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
      ├── Function/local computation
      ├── bounded LLM inference
      ├── Effects
      ├── structured parallel branches
      ├── call Agent Execution
      └── call Workflow Execution
```

Inside an Agent:

```text
selected context + exposed operations
        ↓
LLM/controller progression
        ↓
Effect / child call / message / response / stop
        ↓
observations and resumptions
        ↓
next progression
```

The central boundary is:

> **An Execution is an independently managed runtime entity. Composition alone does not create an Execution boundary.**

---

## Authority/exposure in one picture

```text
Catalog
  what exists
      ↓
Effective Authority
  what this Execution may legally use/access
      ↓
Active/Exposed View
  authorized subset useful to expose now
      ↓
Model Invocation Projection
  exact names/schemas/bindings for this model call
```

Each layer narrows the previous one.

> **Discovery and exposure never grant authority. The Harness authorizes the concrete Effect.**

Application security principals/on-behalf-of facts may influence policy, but:

```text
Execution identity ≠ application principal identity
```

See [`authority.md`](authority.md).

---

## Memory/context in one picture

```text
Memory / retained information

Structured Memory
  explicit/schema-bound application state

Derived Semantic Memory
  inferred/provenance-bearing knowledge

Working Notes
  temporary scratch state

Artifacts / Files
  large durable work products

source observations/history
  provenance, not automatically semantic memory
```

Then:

```text
authorized memory/resources/events/instructions
                 ↓
          context compilation
                 ↓
        current model context
```

Key rule:

```text
source observation ≠ derived claim ≠ explicit Structured Memory
memory             ≠ current context
```

See [`memory.md`](memory.md).

---

## Interoperability in one picture

```text
1. Kernel Semantic Interface
   Execution / Event / Effect / authority / memory / lifecycle

2. Portable Interoperability Interface
   Operation / Resource / service / Skill / template /
   async handle / input requirement / change signal

3. Protocol/API Bindings
   MCP / A2A / Agent Skills / HTTP+OpenAPI /
   local SDK / UI/message protocols / future standards
```

> **Kernel semantics and interoperability semantics are separate but intentionally mappable.**

Examples:

```text
portable Operation        ↔ MCP Tool / HTTP operation / model tool
portable Resource         ↔ MCP Resource
exported Agent service    ↔ A2A Agent Card / API service
external async handle     ↔ MCP/A2A Task where appropriate
Skill instruction profile ↔ Agent Skills package
```

But:

```text
Execution ≠ A2A/MCP Task
Event     ≠ protocol notification
Effect    ≠ portable Operation
Skill     ≠ Execution
```

See [`interoperability.md`](interoperability.md).

---

## Security in one picture

```text
application/world/platform policy
  decides what should be allowed
        ↓
Harness / kernel
  enforces authority and runtime boundaries
        ↓
execution-isolation substrate
  prevents hostile code from bypassing Harness
        ↓
external resources / host/world state
```

Security profiles differ:

```text
trusted-local / embedded
hosted declarative
isolated hostile-code
```

A trusted-local deployment provides Arrokoth-mediated semantic enforcement but does not contain the owner of the host process. A hostile-code profile additionally requires real filesystem/network/secret/resource isolation.

See [`security-guarantees.md`](security-guarantees.md).

---

## Stable distinctions to protect

```text
Definition              ≠ Execution
Workflow                ≠ Agent
Stage                   ≠ Execution
Event                   ≠ Effect
Event                   ≠ ControllerResumption
PendingOperation        ≠ ControllerResumption
response/message        ≠ terminal result
semantic control        ≠ operational control
authority               ≠ exposure
Execution identity      ≠ application principal identity
memory                  ≠ context
Structured Memory       ≠ Derived Semantic Memory
memory form             ≠ memory scope
ownership               ≠ communication
Skill                   ≠ Execution
portable Operation      ≠ Effect
protocol task/handle    ≠ Execution
protocol notification   ≠ Event
semantic enforcement    ≠ physical containment
```

These distinctions are more important than any particular class name, library, provider, storage engine, policy backend, or protocol implementation.

---

## Using the docs during development

Before changing architecture or implementing a slice:

1. Find the canonical concept owner above.
2. List the invariants the change must preserve.
3. Inspect the relevant files under [`development/`](development/) for current implementation decisions/history.
4. Separate semantic changes from package/naming/backend changes.
5. For external standards, decide whether the idea belongs in kernel semantics, portable interoperability semantics, or only an adapter/backend.
6. Test the smallest vertical slice that proves the semantic boundary.
7. Put unresolved questions in [`future-plan.md`](future-plan.md), not into canonical APIs accidentally.

The retained [`architecture-research-dossier.md`](architecture-research-dossier.md) can be consulted for external references and the reasoning behind several recent distinctions, but it is intentionally broader and less authoritative than the canonical documents.