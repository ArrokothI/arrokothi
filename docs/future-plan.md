# Future Plan

This roadmap describes the architectural direction after adopting [`mental-model-v0.4.md`](mental-model-v0.4.md) and [`mental-model-to-implementation-model.md`](mental-model-to-implementation-model.md).

It intentionally defines only the major goals of v0.4, v0.5, and v0.6. It does **not** prescribe minor-version sequencing such as v0.41/v0.42; those decisions should follow implementation review, benchmarks, and migration cost.

The guiding rule is:

> **Keep current implementation where it matches the new mental model. Replace or migrate abstractions where carrying two incompatible definitions would make future expansion confusing.**

The current v0.37 mental model remains useful documentation of the existing architecture and its original concerns. Other roadmap/design documents should be treated as legacy references once this plan becomes the active direction; do not delete them yet.

---

# v0.4 — Align the core with the new execution model

The goal of v0.4 is architectural alignment, not maximum feature count.

## Core targets

### 1. Introduce the Executable abstraction

Establish one shared execution vocabulary for:

```text
Leaf
├── LLM
├── Tool / Function

Composite
├── Workflow
└── Agent
```

Separate serializable definition from runtime execution identity/state.

The shared runtime should support parent/child relationships even before all recursive features are exposed publicly.

### 2. Separate shared harness/runtime behavior from Agent-specific orchestration

Preserve the good parts of the current `AgentRuntime`, `CapabilityGateway`, durability, context compilation, tracing, and provider boundaries.

Refactor ownership so Agent and Workflow can eventually use the same execution substrate without inheriting from each other's semantic implementation.

### 3. Make authority a per-execution invariant

Define an immutable Authority Envelope for each execution run.

```text
child authority ⊆ parent authority
```

Separate this hard authority from the dynamic Active Capability View presented to an LLM.

The current Phase-based tool/knowledge filtering should no longer be the long-term authority model.

### 4. Preserve and strengthen memory

Keep Structured Memory and Working Notes as first-class features.

Preserve:

- schema validation;
- provenance;
- authoritative vs advisory values;
- correction history;
- runtime-controlled commitment.

Prepare memory interfaces for optional agent-support fields such as `focus`, plan/task state, and future artifact/file memory without forcing every agent to use them.

### 5. Resolve Phase / Flow ownership

Do not continue expanding Phase as an Agent abstraction.

Identify reusable Flow/Phase implementation pieces and migrate their conceptual ownership toward the future Workflow system:

- objective/instructions;
- deterministic condition DSL;
- capability narrowing;
- transition tracing.

Compatibility support may remain at the boundary while applications migrate.

### 6. Make the pure Agent path explicit

The current semantic Preflight exists for historical/model-quality reasons. Under the new architecture it must become explicit rather than silently defining Agent semantics.

Possible outcomes include:

- a pure Agent path with no mandatory semantic Preflight;
- an explicit compatibility/preflight Workflow wrapper;
- opt-in semantic synchronization for applications that demonstrably benefit from it.

Do not assume removal is automatically better; benchmark correctness, conversational quality, and inference cost.

### 7. Keep correctness regressions green

The known context/state/capability coherence invariants must remain enforced during the refactor.

Preserve regression evidence for current state/action correctness and durability behavior.

## v0.4 outcome

At the end of v0.4, the core architecture should speak the new vocabulary even if some advanced composition remains unavailable:

```text
Runtime
  ↓
Executable
  ├── Agent
  └── compatibility / early Workflow path
```

No new feature should need to understand both "Phase as Agent control" and "Executable node control" as competing mental models.

---

# v0.5 — Recursive composition and a real Workflow runtime

The goal of v0.5 is to make the execution tree real.

## Core targets

### 1. Implement the real Workflow composite

Workflow owns predefined semantic topology.

A Workflow Stage should contain roughly:

```text
instructions
requested scope
executor
transitions
```

Executors may be:

```text
LLM
Tool / Function
Agent
Workflow
```

Transitions may be deterministic, LLM-evaluated, or hybrid.

### 2. Support recursive execution

Allow:

```text
Workflow → Agent
Workflow → Workflow
Agent → Workflow
Agent → Agent
```

Every child run receives narrowed authority, explicit input/result contracts, independent lifecycle state, and trace identity.

### 3. Introduce subagents as ordinary child Agent executions

A subagent should not be a special multi-agent framework.
It is an Agent Executable invoked by another composite node.

Support at least:

- parent-provided immutable goal/instructions;
- narrowed Authority Envelope;
- child-specific model policy;
- child memory/context isolation;
- bounded budget;
- cancellation propagation;
- parent-owned acceptance of returned results.

This enables strong-parent / cheap-worker experiments without changing the basic runtime model.

### 4. Add Agent-owned focus / task-state experiments

Experiment with optional structured `focus` and related memory conventions.

Questions to evaluate include:

- require focus only before actions vs every model turn;
- whether explicit focus helps weak/local models;
- whether focus should be structured memory, special working memory, or both;
- whether mutable plan artifacts improve long-running tasks.

Do not elevate plan/focus into mandatory universal control-flow concepts unless evidence supports it.

### 5. Generalize tracing to execution trees

Tracing should make nested runs understandable:

```text
parent run
├── workflow stage
├── agent child
│   ├── model call
│   └── tool call
└── workflow child
```

Preserve provenance and authority explanations across boundaries.

## v0.5 outcome

At the end of v0.5, Agent and Workflow should be fully composable peers over one runtime.
The old Phase system should no longer be required for new application design.

---

# v0.6 — Capability scale, profiles, discovery, and Skills

The goal of v0.6 is to make the architecture scale when tools, knowledge sources, and reusable capabilities become large.

## Core targets

### 1. Capability Profiles

Introduce reusable named profiles that describe semantically related capability/resource sets, for example:

```text
Biomedical Research
Software Development
Financial Analysis
Customer Support
```

Profiles help narrow context and guide delegation but never grant authority.

A node may dynamically switch profiles/Active Views while its Authority Envelope remains immutable.

### 2. Capability discovery

Provide a pluggable discovery mechanism that selects relevant capabilities from the node's existing authority.

Support progressively more expensive strategies where useful:

```text
static/default exposure
→ profile-based filtering
→ metadata / keyword / embedding retrieval
→ optional model-assisted discovery
```

Do not require a separate discovery LLM call for every task.
Use direct exposure when the relevant capability set is already small and obvious.

Benchmark the tradeoff between:

- model-call count / latency;
- prompt size;
- tool-selection quality;
- weak-model reliability;
- missed capabilities;
- irrelevant capability exposure.

### 3. Skills

Add provider-neutral Skills as reusable capability packages.

Conceptually:

```text
Skill
├── instructions
├── resources / references
├── scripts / assets
├── root Executable (Agent or Workflow)
└── recommended Capability Profile / requested scope
```

A Skill is not a separate runtime controller.
Its effective authority is always derived from the invoking parent and runtime policy.

Skills should be able to reuse existing Workflow definitions, Agents, tools, resources, and Capability Profiles rather than duplicate them.

### 4. Artifact / file memory

Explore persistent agent workspace artifacts such as plan/research files where they improve long-running execution.

Keep these as memory/resources rather than allowing them to become hidden alternative control planes.

### 5. Large capability and heterogeneous-model experiments

Evaluate architectures such as:

```text
strong parent model
  ↓ delegates narrow scope
cheap/local child model
```

Study whether profiles/discovery materially improve smaller-model behavior and whether delegation overhead buys enough quality to justify extra calls.

## v0.6 outcome

At the end of v0.6, Agent SDK should support a scalable ecosystem where:

- authority remains mechanically bounded;
- LLM context stays narrow when capability catalogs become large;
- Workflows and Agents compose recursively;
- Skills package reusable procedures/resources without creating another orchestration system;
- applications can choose simple static capability exposure or more advanced discovery based on actual need.

---

# Cross-version principles

These principles apply throughout the roadmap.

### One mental model

Do not preserve old abstractions in the core merely for familiarity if they create a second definition of Agent/Workflow semantics.
Compatibility translation at the boundary is preferable to conceptual duplication inside the runtime.

### Reuse proven implementation

The new model does not imply throwing away working infrastructure.
Preserve and evolve components whose responsibilities remain valid, especially:

- structured memory/provenance;
- Working Notes;
- CapabilityGateway-style validation;
- tool authorization/confirmation;
- durable session/event journal;
- provider-neutral schemas;
- context compilation;
- tracing and execution checkpoints.

### Models propose; runtime grants authority

The model may choose semantic work, request capabilities, propose memory writes, select child scopes, and declare semantic completion.
It never grants itself authority or establishes external truth by assertion.

### Authority is immutable per execution

A node's Authority Envelope is fixed at creation.
Children may receive less authority; they never receive more than the parent possessed.

### Capability exposure is dynamic

The Active Capability View may change freely inside the Authority Envelope.
Do not confuse tool discovery/context narrowing with privilege changes.

### Simplicity is still a goal

Do not require Workflows, subagents, Skills, discovery, or planner calls for tasks that a direct Agent/LLM invocation handles well.
Each layer should justify its latency, complexity, and inference cost with measurable benefit.

---

# Documentation direction

The active conceptual documentation should converge on:

```text
docs/mental-model-v0.4.md
docs/mental-model-to-implementation-model.md
docs/future-plan.md
docs/mental-model-v0.37.md   # current/legacy implementation context and concerns
```

Other existing roadmap/design documents remain available as legacy/history for now. They should not be deleted until migration and implementation work make their historical value clear.
