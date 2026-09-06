# ArrokothI Architecture Documents

This directory contains the canonical architecture for ArrokothI plus implementation working documents, one cross-repository product-vision document, one retained research dossier, and focused non-canonical research notes.

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
| [`future-plan.md`](future-plan.md) | unresolved/future questions only; not the active roadmap |

Supporting material:

| Path | Role |
|---|---|
| [`product-vision.md`](product-vision.md) | cross-repository ArrokothI product direction: heterogeneous Agent application composition, Studio/Cloud direction, ecosystem/adoption/business posture; **not canonical kernel architecture** |
| [`development/`](development/) | current implementation synthesis, active roadmap, and specialized engineering guidance |
| [`guides/`](guides/README.md) | application/developer guidance for building **on** the kernel — decision procedures for composing Agents and Workflows from application requirements; **not canonical kernel architecture** |
| [`agent-engineering/`](agent-engineering/README.md) | framework-neutral external engineering guidance synthesized from public Anthropic material; a design reference for agent/workflow engineering, **never ArrokothI semantics** |
| [`research/`](research/) | focused, non-canonical protocol/system comparisons and experiment directions outside the active implementation sequence; includes MCP semantic mapping and Agent caching research |

The product vision may guide future repositories and product surfaces, but it does not own kernel semantics. Focused notes under `research/` are intentionally **not** canonical even when they contain useful reasoning. When any supporting research conflicts with a canonical document, the canonical document wins.

---

## Reading paths

### Want the whole system?

```text
README → mental-model
```

### Want the broader product direction across Core / Studio / Cloud / integrations?

```text
product-vision
```

Then return to the canonical concept owner before changing kernel semantics.

### Building an application on ArrokothI?

Start from the [single builder guide](guides/agent-workflow-composition/README.md):

```text
guide home → quick start + current public API → relevant topic → runnable example/tests
```

Read canonical owners when a semantic question arises; source and conformance establish current
implementation coverage. Neither canonical examples nor the roadmap guarantee an available stock
API. `agent-engineering/` is optional framework-neutral background, not prerequisite reading.

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

### Working on caching / derived-view efficiency?

Start from the semantic owner first, then use the focused research note:

```text
Active View / operation exposure
  mental-model → authority

memory read views / context compilation
  mental-model → memory

suspension / invocation recovery
  mental-model → execution-runtime

then:
  research/agent-caching-semantics-and-strategy.md
```

The research note distinguishes optional caches from deterministic derived views and immutable invocation/recovery snapshots. It does not redefine any of those canonical concepts.

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

### Researching an external system outside the active implementation sequence?

```text
research/
```

Research notes frame questions and experiments; return to the canonical concept owner before changing semantics.

### Actually implementing or reviewing the current slice?

```text
development/
```

Development docs may lag the canonical contract. Canonical docs take precedence when they disagree.

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

product-vision.md
  product direction across repositories/surfaces; does not own kernel semantics

development/
  owns implementation work-in-progress, not architecture truth

guides/
  owns application-building decision procedures only, never kernel semantics

agent-engineering/
  external framework-neutral engineering guidance only, never kernel semantics

research/
  focused research observations only, never canonical truth or an implementation commitment
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

Should Studio eventually live in a separate repository?
  → product-vision.md may state the product direction
  → no kernel semantic follows from that repository choice

Is Active View a cache?
  → authority.md owns what Active View means
  → research/agent-caching-semantics-and-strategy.md may discuss caching it as an implementation optimization
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

A trusted-local deployment provides ArrokothI-mediated semantic enforcement but does not contain the owner of the host process. A hostile-code profile additionally requires real filesystem/network/secret/resource isolation.

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
3. Read [`development/002-implemented-kernel-baseline.md`](development/002-implemented-kernel-baseline.md)
   for current evidence and [`development/001-current-status-and-roadmap.md`](development/001-current-status-and-roadmap.md)
   for next work; load specialized evidence only when relevant.
4. Separate semantic changes from package/naming/backend changes.
5. For external standards, decide whether the idea belongs in kernel semantics, portable interoperability semantics, or only an adapter/backend.
6. Test the smallest vertical slice that proves the semantic boundary.
7. Put unresolved questions in [`future-plan.md`](future-plan.md), not into canonical APIs accidentally.

The cross-repository [`product-vision.md`](product-vision.md) can guide product/repository decisions but cannot override the concept owners above.
