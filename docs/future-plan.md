# Future Plan

This roadmap describes the architectural direction after adopting [`mental-model-v0.4.md`](mental-model-v0.4.md) and [`mental-model-to-implementation-model.md`](mental-model-to-implementation-model.md).

It intentionally defines only the major goals of v0.4, v0.5, and v0.6. It does **not** prescribe minor-version sequencing such as v0.41/v0.42; those decisions should follow implementation review, benchmarks, and migration cost.

The guiding rules are:

> **Keep current implementation where it matches the new mental model. Replace or migrate abstractions where carrying two incompatible definitions would make future expansion confusing.**

> **Own the kernel semantics and invariants; keep concrete mechanisms replaceable behind narrow implementation boundaries.**

The current v0.37 mental model remains useful documentation of the existing architecture and its original concerns. Other roadmap/design documents should be treated as legacy references once this plan becomes the active direction; do not delete them yet.

---

# Reference implementation strategy

Arrokoth should have a preferred development stack so the project can move quickly, but the preferred stack must not become the definition of the architecture.

The current reference direction is:

```text
Kernel semantics             Arrokoth-owned
Agent loop                   Strands as primary implementation
Model inference              provider-neutral ModelProvider boundary
Knowledge / RAG              LangChain as initial implementation toolkit
Tools                        native capabilities first; MCP as major ecosystem boundary
Persistence                  in-memory / SQLite for development; Postgres-oriented production path
Tracing                      Arrokoth-native trace semantics with standard exporters later
Sandbox / computer use       external implementations when needed rather than core reinvention
```

This is a development strategy, not a permanent dependency mandate.

A successful kernel should eventually be able to replace one implementation without changing Agent/Workflow semantics, authority, memory contracts, lifecycle rules, or application definitions.

For example:

```text
Agent
  semantic type: Arrokoth Agent
  executor: Strands today
            another compatible executor later

LLM call
  semantic type: LLM leaf
  provider: Gemini today
            hosted API / OpenAI-compatible endpoint / local model later

Knowledge retrieval
  semantic type: KnowledgeRetriever
  implementation: LangChain today
                  direct or specialized retrieval later
```

The project should resist implementing multiple backends merely to prove theoretical flexibility. Add a second implementation when it tests an architectural boundary, removes a real limitation, or demonstrates measurable quality/cost/reliability benefit.

---

# Repository and package architecture

The repository should communicate the same architecture as the code.

The target monorepo convention is:

```text
packages/      supported reusable Arrokoth software
apps/          deployable/reference products built from packages
examples/      focused learning examples
benchmarks/    behavioral, retrieval, cost, and conformance evidence
docs/          architecture, roadmap, guides, and decisions
scripts/       repository tooling and manual diagnostics
```

Inside `packages/`, package location does **not** determine whether something is semantically core. Instead:

> **Everything under `packages/` is first-class supported Arrokoth software; only `packages/core` defines Arrokoth kernel semantics.**

The intended shape is described in [`repository-structure-plan.md`](repository-structure-plan.md), roughly:

```text
packages/
├── core/
├── client/
├── server/
├── presets/
│   └── node/
├── agents/
├── models/
├── knowledge/
├── tools/
├── storage/
├── sandbox/
└── observability/

apps/
├── studio/
└── cloud-api/        # future
```

Concrete implementations such as Strands, Gemini, LangChain, Postgres, MCP, or OpenTelemetry should be first-class packages when supported, but their dependency arrows must point toward the kernel rather than the kernel importing their framework-specific types.

The repository restructure should be mostly mechanical and should not be mixed into the deepest part of the v0.4 semantic refactor. Stabilize conceptual ownership first, then move packages with minimal behavioral change.

A batteries-included preset such as `@arrokoth/node` may later compose the recommended implementations for normal users, while advanced users can assemble `@arrokoth/core` with explicit implementation packages.

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

### 3. Make implementation boundaries explicit without multiplying implementations

Keep semantic contracts in core and concrete framework/provider details outside them.

In particular:

- `AgentLoopEngine` remains the Agent execution mechanism boundary;
- `StrandsLoopEngine` remains the primary production Agent-loop implementation for now;
- `ModelProvider` remains a separate single-inference boundary beneath an Agent loop;
- provider SDK types, credentials, endpoints, and transport behavior stay outside core;
- `KnowledgeRetriever` remains provider-neutral;
- LangChain is treated as a replaceable retrieval implementation detail, not a kernel dependency in the conceptual model;
- storage implementations remain behind session/event store contracts.

Do not add a second Agent executor in v0.4 merely for feature parity. First make the boundary clean enough that a second executor can later be added without changing the kernel.

### 4. Make authority a per-execution invariant

Define an immutable Authority Envelope for each execution run.

```text
child authority ⊆ parent authority
```

Separate this hard authority from the dynamic Active Capability View presented to an LLM.

The current Phase-based tool/knowledge filtering should no longer be the long-term authority model.

### 5. Preserve and strengthen memory

Keep Structured Memory and Working Notes as first-class features.

Preserve:

- schema validation;
- provenance;
- authoritative vs advisory values;
- correction history;
- runtime-controlled commitment.

Prepare memory interfaces for optional agent-support fields such as `focus`, plan/task state, and future artifact/file memory without forcing every agent to use them.

### 6. Resolve Phase / Flow ownership

Do not continue expanding Phase as an Agent abstraction.

Identify reusable Flow/Phase implementation pieces and migrate their conceptual ownership toward the future Workflow system:

- objective/instructions;
- deterministic condition DSL;
- capability narrowing;
- transition tracing.

Compatibility support may remain at the boundary while applications migrate.

### 7. Make the pure Agent path explicit

The current semantic Preflight exists for historical/model-quality reasons. Under the new architecture it must become explicit rather than silently defining Agent semantics.

Possible outcomes include:

- a pure Agent path with no mandatory semantic Preflight;
- an explicit compatibility/preflight Workflow wrapper;
- opt-in semantic synchronization for applications that demonstrably benefit from it.

Do not assume removal is automatically better; benchmark correctness, conversational quality, and inference cost.

### 8. Keep correctness regressions green

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

Agent executor: replaceable contract, Strands reference implementation
Model inference: independent provider-neutral contract
Knowledge retrieval: provider-neutral contract, framework implementation hidden
```

No new feature should need to understand both "Phase as Agent control" and "Executable node control" as competing mental models.
No core semantic rule should depend on a Strands, LangChain, or model-provider-specific type.

The v0.4 architecture should also make the subsequent package move mechanical: code ownership should already be clear enough to know what belongs in `packages/core` versus implementation packages.

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

### 4. Prove Agent executor portability

After recursive semantics are stable, add a second Agent executor primarily as an architectural conformance test.

The target is not feature parity. The target is to demonstrate:

```text
same Agent definition
same Authority Envelope
same memory semantics
same capability gateway
same lifecycle / completion rules
same execution-tree identity
        ↓
run through different Agent-loop implementations
```

Strands should remain the reference production implementation unless benchmarks or maintenance considerations justify changing it.

Candidate second executors may include other TypeScript agent runtimes or foreign-agent adapters. Selection should be based on clean contract mapping, license, maintenance quality, model independence, and measurable behavior rather than popularity alone.

### 5. Expand model-provider freedom, including local models

Keep the Agent executor and Model Provider as independent axes.

A Model Provider performs one normalized model inference; the Agent executor may invoke it repeatedly.

This should make configurations such as the following possible without changing Agent semantics:

```text
Strands Agent loop + Gemini
Strands Agent loop + hosted OpenAI-compatible model
Strands Agent loop + local/self-hosted model
future Agent loop + same model providers
```

Evaluate a broader provider ecosystem or OpenAI-compatible/local adapter where it reduces duplicated provider work, but retain the Arrokoth-owned provider-neutral contract and direct-provider escape hatches.

### 6. Add Agent-owned focus / task-state experiments

Experiment with optional structured `focus` and related memory conventions.

Questions to evaluate include:

- require focus only before actions vs every model turn;
- whether explicit focus helps weak/local models;
- whether focus should be structured memory, special working memory, or both;
- whether mutable plan artifacts improve long-running tasks.

Do not elevate plan/focus into mandatory universal control-flow concepts unless evidence supports it.

### 7. Generalize tracing to execution trees

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

Prepare an exporter boundary so external observability systems can consume traces without defining Arrokoth's trace semantics.

### 8. Strengthen tool ecosystem boundaries

Keep capability authorization and confirmation in Arrokoth while allowing execution mechanisms to vary.

Native function tools remain the simplest path. Add MCP or equivalent standard tool transport where it provides concrete ecosystem value.

The important invariant is:

```text
external tool ecosystem
        ↓
Arrokoth capability definition / mapping
        ↓
CapabilityGateway authorization
        ↓
execution adapter
```

No external tool system should bypass the Authority Envelope or consequential-action rules.

### 9. Establish public package and service surfaces

Once the execution contracts are stable enough, begin exposing the kernel through reusable and remote-facing packages rather than requiring every application to embed internal runtime classes directly.

The intended layers are conceptually:

```text
@arrokoth/core       embedded kernel contracts/runtime
@arrokoth/client     remote API client
@arrokoth/server     reusable runtime service
@arrokoth/node       batteries-included preset (when useful)
```

High-level convenience APIs such as `agents.create()` or `agents.run()` should map onto the more fundamental `ExecutableDefinition` / `ExecutionRun` model rather than becoming a second execution model.

The server/API should treat Runs as first-class resources with status, events, children, result, and cancellation.

## v0.5 outcome

At the end of v0.5, Agent and Workflow should be fully composable peers over one runtime.
The old Phase system should no longer be required for new application design.

The implementation boundaries should also be empirically proven: at least one important backend should be replaceable without changing kernel semantics.

The repository/package structure should make those boundaries visible to users and contributors, with applications consuming the same public surfaces intended for external developers.

---

# v0.6 — Capability scale, context engineering, retrieval optimization, and Skills

The goal of v0.6 is to make the architecture scale when tools, knowledge sources, models, and reusable capabilities become large, while beginning evidence-driven optimization of the replaceable implementation layers.

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

### 2. Capability discovery and context selection

Provide pluggable mechanisms that select relevant capabilities and information from what the node is already authorized to access.

Support progressively more expensive strategies where useful:

```text
static/default exposure
→ profile-based filtering
→ metadata / keyword retrieval
→ embedding retrieval
→ hybrid retrieval
→ optional model-assisted selection
```

Do not require a separate discovery LLM call for every task.
Use direct exposure when the relevant capability set is already small and obvious.

Keep the ownership boundary explicit:

```text
Kernel owns:
- what the node may see
- what authority the node has
- provenance and visibility constraints

Replaceable implementation owns:
- ranking
- selection
- compression
- query rewriting
- summarization
```

Benchmark the tradeoff between:

- model-call count / latency;
- prompt size;
- tool-selection quality;
- weak/local-model reliability;
- missed capabilities;
- irrelevant capability exposure.

### 3. Retrieval / RAG optimization as an evidence-driven implementation layer

Continue using LangChain where it provides productive, well-tested building blocks, but do not assume its default algorithms are optimal for every application.

Keep retrieval decomposable into independently testable choices such as:

```text
ingestion / parsing
chunking
embedding model
lexical retrieval
vector retrieval
metadata filters
hybrid retrieval
query rewriting / expansion
multi-query generation
score normalization / fusion
reranking
LLM-assisted retrieval
context packing
```

Arrokoth should own the retrieval contract, authority/visibility rules, provenance, traces, and benchmarks. A retrieval framework may implement one or more stages without becoming part of the kernel model.

Future options include:

- continuing with LangChain where its components are sufficient;
- evaluating another retrieval-focused framework;
- using direct vector/SQL/search-engine integrations for high-value paths;
- implementing specialized retrieval algorithms where research or benchmark evidence shows a meaningful advantage.

Do not rewrite working retrieval infrastructure simply to reduce dependencies. Replace a framework layer when there is a concrete need for better quality, inspectability, latency, cost, determinism, or application-specific control.

### 4. Skills

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

Prefer compatibility with broadly used skill/tool packaging conventions where they fit rather than creating a proprietary ecosystem prematurely.

### 5. Artifact / file memory

Explore persistent agent workspace artifacts such as plan/research files where they improve long-running execution.

Keep these as memory/resources rather than allowing them to become hidden alternative control planes.

### 6. Large capability and heterogeneous-model experiments

Evaluate architectures such as:

```text
strong parent model
  ↓ delegates narrow scope
cheap/local child model
```

Study whether profiles/discovery materially improve smaller-model behavior and whether delegation overhead buys enough quality to justify extra calls.

Because model serving is below the Agent executor boundary, include locally deployed and self-hosted models in these experiments where practical.

### 7. External execution environments and foreign agents

When applications need browser automation, shell sandboxes, computer use, messaging gateways, or mature foreign-agent environments, prefer adapters to proven external systems over duplicating their product surfaces inside core.

Potential boundaries include:

```text
ExecutionEnvironment
ForeignAgentExecutor
MCP / tool transport
Browser / computer-use capability
Remote sandbox
```

OpenClaw, Hermes, sandbox providers, and future systems may become useful implementations behind these boundaries. They should not become new semantic node types merely because they are powerful products.

## v0.6 outcome

At the end of v0.6, Arrokoth Agent Kernel should support a scalable ecosystem where:

- authority remains mechanically bounded;
- LLM context stays narrow when capability catalogs become large;
- Workflows and Agents compose recursively;
- Skills package reusable procedures/resources without creating another orchestration system;
- applications can choose simple static capability exposure or more advanced discovery based on actual need;
- hosted and local/self-hosted model implementations can sit beneath the same model contract;
- retrieval pipelines can evolve from framework defaults toward specialized implementations without changing application semantics;
- external agent/tool/sandbox ecosystems can extend Arrokoth through adapters rather than forcing kernel duplication.

---

# Cross-version implementation principles

These principles apply throughout the roadmap.

### One mental model

Do not preserve old abstractions in the core merely for familiarity if they create a second definition of Agent/Workflow semantics.
Compatibility translation at the boundary is preferable to conceptual duplication inside the runtime.

### Semantic contracts over implementation brands

Strands, LangChain, a specific model API, a vector database, or an external agent product are implementation choices.

Do not allow their types or lifecycle assumptions to become core semantics unless Arrokoth intentionally adopts the underlying concept itself.

A useful test is:

> If this implementation disappeared tomorrow, could another implementation satisfy the same Arrokoth contract without changing the application's semantic definition?

If not, either the boundary is wrong or the dependency is actually part of the architecture and should be acknowledged explicitly.

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

Use mature external implementations for commodity mechanisms when they fit the contracts. Build custom mechanisms when they are part of Arrokoth's differentiation or when benchmarks show a real advantage.

### First-class packages do not imply core semantics

All supported reusable Arrokoth code should live under `packages/`, including implementation adapters.

This is intentionally different from treating integrations as second-class extras. Strands, LangChain, model adapters, persistence adapters, and similar packages may be recommended and production-supported while remaining replaceable.

Dependency direction and contracts—not folder distance from the root—define the architectural boundary.

### Core should be independently testable, not production-complete by itself

`packages/core` should include enough reference/fake implementations to test kernel contracts and execute deterministic examples, but it should not reimplement every production mechanism merely to prove independence.

For example, a small reference Agent loop can validate the `AgentLoopEngine` contract while Strands remains the recommended production executor.

### Default first, optionality second

Every replaceable layer should have one well-supported reference implementation before accumulating alternatives.

The project should not become a compatibility matrix where every backend receives equal engineering effort.

Prefer:

```text
one primary implementation
+ clean contract
+ conformance tests
+ selected secondary implementations
```

over:

```text
many partially supported implementations
```

A batteries-included preset may select these defaults for normal users without changing the kernel contracts.

### Model provider and Agent executor remain separate

The Agent executor owns the iterative loop mechanism.
The Model Provider owns one model inference.

Do not merge these concepts merely because one framework offers both.

This separation enables provider changes, local/self-hosted deployment, model routing, and heterogeneous parent/child models without redefining Agent execution.

### RAG framework is a toolkit, not a retrieval philosophy

Using LangChain or another framework is primarily an implementation convenience.

Retrieval quality should ultimately be decided by application-specific evidence and benchmarks, not framework defaults.

Preserve enough observability to know which chunker, embedding model, retrieval method, fusion rule, reranker, query transformation, and context-packing policy produced a result when those choices matter.

### Models propose; runtime grants authority

The model may choose semantic work, request capabilities, propose memory writes, select child scopes, and declare semantic completion.
It never grants itself authority or establishes external truth by assertion.

### Authority is immutable per execution

A node's Authority Envelope is fixed at creation.
Children may receive less authority; they never receive more than the parent possessed.

### Capability exposure is dynamic

The Active Capability View may change freely inside the Authority Envelope.
Do not confuse tool discovery/context narrowing with privilege changes.

### Context engineering is broader than prompting

Prompt text is only one input to an inference.

The implementation should treat context construction as a first-class engineering problem involving:

- instructions;
- relevant conversation/history;
- structured memory;
- working notes/artifacts;
- observations;
- knowledge retrieval;
- active capabilities/tools;
- token budgets and compression.

Visibility and authorization remain runtime policy. Selection and compression strategies may evolve through experimentation.

### Simplicity is still a goal

Do not require Workflows, subagents, Skills, discovery, retrieval frameworks, planner calls, or external agent systems for tasks that a direct Agent/LLM invocation handles well.
Each layer should justify its latency, complexity, dependency burden, and inference cost with measurable benefit.

---

# Suggested implementation sequence

This sequence is intentionally conservative.

```text
v0.4
  stabilize kernel vocabulary and invariants
  keep Strands as primary Agent executor
  keep current working model provider(s)
  keep LangChain retrieval behavior working
  establish clean ownership boundaries

post-v0.4 mechanical repo migration
  core/                 → packages/core/
  integrations/strands/ → packages/agents/strands/
  providers/gemini/     → packages/models/gemini/
  keep apps/, examples/, benchmarks/, docs/ conceptually stable
  move diagnostics into scripts/ or tests/ based on purpose
  avoid behavior changes during directory moves

v0.5 early
  implement recursive Agent/Workflow execution
  prove authority, lifecycle, cancellation, budget, and trace propagation
  introduce client/server package surfaces when contracts are stable enough

v0.5 middle
  add one second Agent executor as a conformance test
  broaden model-provider/local-model options where useful
  extract concrete knowledge implementation into packages/knowledge/* when worthwhile

v0.5 late
  add standard tool transport / MCP where useful
  add production-oriented persistence and trace exporters
  add a batteries-included preset if package assembly becomes burdensome

v0.6
  benchmark context-selection strategies
  benchmark retrieval pipelines and framework-vs-direct implementations
  add capability profiles/discovery/Skills
  integrate external sandboxes/foreign agents where applications need them
```

The sequence may change based on implementation review and benchmarks. The key constraint is that ecosystem breadth must not outrun kernel clarity.

---

# Documentation direction

The active conceptual documentation should converge on:

```text
docs/mental-model-v0.4.md
docs/mental-model-to-implementation-model.md
docs/future-plan.md
docs/repository-structure-plan.md
docs/mental-model-v0.37.md   # current/legacy implementation context and concerns
```

Other existing roadmap/design documents remain available as legacy/history for now. They should not be deleted until migration and implementation work make their historical value clear.
