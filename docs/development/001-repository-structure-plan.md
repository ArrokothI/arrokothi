# Repository Structure Plan

> **Status: proposal for discussion.**
>
> This document is an engineering working document, not an approved migration plan and not canonical architecture. The canonical v0.4 semantics remain in the main architecture documents under [docs/](../), with the authority order defined by [docs/README.md](../README.md).
>
> This proposal plans ownership and dependency boundaries only. It does not authorize implementation, package renaming, source movement, or runtime changes.

## 1. Executive summary

The repository does **not** need a full top-level structural rebuild. Its npm workspace and the major top-level areas—<code>apps/</code>, <code>packages/</code>, <code>examples/</code>, <code>scripts/</code>, and <code>docs/</code>—are useful and should remain. The existing separation of the primary core package from Strands, Gemini, SQLite, and Studio is also directionally correct.

The repository does need a meaningful **internal kernel restructuring** because <code>packages/core</code> still expresses the older request-scoped Agent Session/Turn architecture. It has no first-class Workflow Definition or Workflow Execution, no one-Harness/many-Execution runtime, no general Execution lifecycle or mailbox, no normalized EffectRequest vocabulary, no child Execution composition, and no explicit authority or memory-view model. Existing names such as <code>AgentRuntime</code>, <code>AgentHarness</code>, and <code>WorkflowCoordinator</code> currently hide those semantic differences.

The package topology should stay small:

- Keep one primary kernel package at <code>packages/core</code> during the migration.
- Keep provider, Agent-framework, and storage implementations as external workspace packages.
- Add a retrieval implementation package because the current core package directly depends on LangChain implementation libraries.
- Add execution-environment packages only when a real non-reference backend exists; do not create empty packages for hypothetical Docker, VM, or hosted products.
- Make <code>tests/conformance/</code> a first-class repository boundary for cross-package v0.4 scenarios.

The minimum structural change that makes the v0.4 model obvious is:

1. establish explicit internal modules for Definitions, Executions, Events/Effects, Agent and Workflow controllers, authority, composition, memory/context, runtime coordination, and kernel ports;
2. introduce the one logical Harness as the owner of many ExecutionContexts rather than treating a request-scoped Agent runtime as the kernel;
3. keep Stage and Adapter implementation under composition/controller ownership rather than giving either an Execution package or runtime context;
4. separate third-party retrieval implementation from core semantics;
5. distinguish executable conformance scenarios from package unit tests and product/benchmark examples.

This is not a recommendation to move all existing files immediately. The structural target should be reached through the semantic Slices A–I in the implementation guide, with compatibility facades where useful.

### 1.1 Structural consequences of the v0.4 architecture

The target tree must make the following distinctions visible:

~~~text
Definition != Execution
Event != Effect
response/message != terminal result
authority != exposure
memory != current model context
ownership != communication permission
semantic control != operational control
Workflow != Agent
Stage != Execution
Capability != Execution
Execution != process or sandbox
~~~

Those distinctions have concrete structural consequences:

- <strong>Definitions</strong> are immutable authoring/configuration data. They do not own lifecycle, mailboxes, pending work, or runtime stores.
- <strong>Execution</strong> is the independently managed runtime identity. In v0.4 only Agent and Workflow Definitions instantiate that identity.
- <strong>AgentController</strong> and <strong>WorkflowController</strong> are peer semantic controllers. Neither is the Harness.
- <strong>Stages</strong>, functions, LLM inferences, and Adapters normally remain local composition inside an enclosing Execution. Stage progress may be recorded, but it must not be represented by another ExecutionContext.
- <strong>Events</strong> are observations delivered through the Execution boundary. <strong>EffectRequests</strong> are proposals for runtime-mediated action. Audit records about a model call are not automatically runtime Events.
- <strong>One logical Harness</strong> owns scheduling, lifecycle transitions, authorization, pending-operation correlation, routing, persistence/recovery, and operational policy for many Executions.
- <strong>Authority envelopes</strong>, active/exposed views, resource bindings, and memory/context visibility are separate structures. A directory layout must not collapse them into a single generic state object.
- <strong>Ownership</strong> and <strong>messaging</strong> need separate runtime modules and tests because one graph cannot stand in for the other.
- <strong>ExecutionEnvironment</strong> is a port below the semantic runtime. In-process, container, remote-worker, or sandbox implementations do not define Execution semantics.
- Provider, framework, storage, retrieval, and environment implementations must import ArrokothI ports/contracts; core semantics must not import those implementations.

The test for introducing a directory, type, or later package should be architectural responsibility, not conceptual vocabulary alone. For example, Events and Effects deserve an obvious home because they are a cross-cutting runtime protocol. A separate npm package for each does not follow.

## 2. Current repository structure

The repository is a Node 22 / TypeScript ESM npm workspace. The root <code>package.json</code> enumerates four package workspaces (core plus three external implementations), Studio, three standalone example workspaces, and two benchmark subjects. The root TypeScript configuration type-checks packages, apps, examples, and scripts together.

### 2.1 Top-level ownership

| Current area | Current architectural responsibility |
| --- | --- |
| <code>packages/core</code> | Public SDK surface, Agent definition model, session event sourcing, request-scoped runtime, bounded and agentic turn coordination, capability/tool authorization, confirmation, memory, context compilation, knowledge/retrieval contracts plus an in-process implementation, provider ports, and reference/test implementations. |
| <code>packages/agents/strands</code> | Strands-backed implementation of the current <code>AgentLoopEngine</code>, including Strands lifecycle/tool interception and a Gemini/Google convenience constructor. |
| <code>packages/models/gemini</code> | Gemini implementation of the provider-neutral <code>ModelProvider</code>; owns HTTP, provider schemas, credential helper, retry/failure mapping, and structured-output projection. |
| <code>packages/storage/sqlite</code> | SQLite implementations of the current DefinitionStore and SessionStore, including event append, snapshots, and optimistic sequence checks. |
| <code>apps/studio</code> | Local trusted development application: HTTP/UI, environment/configuration wiring, SQLite database, provider/framework selection, definition/session API, trace display, and dry-run action executors. |
| <code>examples/minimal-agent</code> | Offline minimal conversational Agent using structured memory and host context. |
| <code>examples/estate-like</code> | Older full-feature example using phase flow, knowledge, confirmation, idempotency, and a consequential tool. |
| <code>examples/strands-gemini</code> | Composition example for current core, Strands, and Gemini boundaries, with offline and live modes. |
| <code>examples/benchmark/p01</code> and <code>p02</code> | Importable benchmark subjects and protocol/CLI adapters. Their tests verify product-shaped behavior; they are not v0.4 architectural conformance tests. |
| <code>scripts</code> | Manual provider canary/diagnostic code. |
| <code>docs</code> | Canonical v0.4 architecture, implementation guidance, security contract, roadmap, and this non-canonical development area. |

There is no root <code>tests/</code> directory today. Most tests are colocated in package-level <code>tests/</code> directories; the benchmark subjects also contain tests. This is appropriate for unit and adapter contract coverage but does not give the repository a home for cross-package architectural conformance.

### 2.2 Current core ownership

The current core is internally organized around the older Agent Session/Turn model:

| Current core area | Current responsibility |
| --- | --- |
| <code>definition/</code> | One serializable <code>AgentDefinition</code>, validation/versioning, and its in-memory store. It embeds model, planning, knowledge, memory, host context, tools, policies, and optional Flow. |
| <code>session/</code> | Append-only <code>SessionEvent</code> history, pure SessionState projection, snapshots, and SessionStore plus its in-memory implementation. The durable Session is currently the long-lived identity. |
| <code>runtime/</code> | Request-scoped <code>AgentRuntime</code> facade and a TurnJournal/checkpoint mechanism. The runtime is constructed for a definition, runs one external turn, persists, and disappears. |
| <code>harness/</code> | <code>AgentHarness</code> and <code>WorkflowCoordinator</code>. They coordinate one user turn, compile context, plan, invoke model/loop logic, call capabilities, and emit a reply. |
| <code>loop/</code> | Framework-neutral Agent loop interface plus a reference model/tool loop. |
| <code>flow/</code> | Optional Phase/Transition DSL embedded in an AgentDefinition and evaluated around a user turn/action result. |
| <code>planning/</code> | Semantic preflight extraction for memory, notes, signals, and optional retrieval. It is turn strategy, not a general v0.4 planning subsystem. |
| <code>capabilities/</code> | Model-visible capability catalog and the current runtime-owned gateway for knowledge/actions, limits, validation, confirmation delegation, and observations. |
| <code>tools/</code> | Tool definitions/registry, deterministic authorization, exact confirmation, idempotency, execution, and result recording. |
| <code>confirmation/</code> | Conservative user-text confirmation resolver and pending-action types. |
| <code>knowledge/</code> | Provider-neutral document/record/web contracts plus <code>KnowledgeIndex</code>, local record query, document chunking, and LangChain-backed retrieval. |
| <code>memory/</code> | Structured memory validation/provenance and a flat list of session Working Notes. |
| <code>context/</code> and <code>compiler/</code> | Typed host observations/visibility and construction of model/planner context from current SessionState. |
| <code>provider/</code> | Provider-neutral model inference port and model request/response contracts. |
| <code>schema/</code> | Provider-neutral serializable value/schema validation. |
| <code>testing/</code> | Scripted provider and fake/recording executors exported through a testing subpath. |
| <code>util/</code> | IDs, clock, hashing, result utilities. |

Several mechanisms are valuable and should be preserved: immutable/versioned definitions, provider-neutral inference, pure event projection, optimistic event append, exact-payload confirmation, idempotency fences, structured-memory provenance, visibility-aware context compilation, capability authorization, and the Strands/Gemini/SQLite adapter direction. Their current container types are not necessarily the final v0.4 boundaries.

## 3. Structural problems and mismatches

The labels below distinguish semantic gaps from organizational debt. A semantic problem cannot be fixed by moving a file.

| Issue | Classification | Why it matters |
| --- | --- | --- |
| The only definition kind is <code>AgentDefinition</code>; there is no independent <code>WorkflowDefinition</code> or execution-definition union. | semantic architecture problem | v0.4 requires Agent and Workflow to be peer Execution kinds. |
| The durable Session substitutes for Execution identity, while <code>AgentRuntime</code> is request-scoped and disappears after one turn. | semantic architecture problem | A Session does not currently carry the full v0.4 ExecutionContext lifecycle, authority, mailbox, pending operations, ownership, or terminal-result semantics. |
| <code>AgentHarness</code> runs one Agent turn, rather than one logical Harness managing many Executions. | semantic architecture problem | It cannot be the v0.4 operational kernel without a different ownership model. |
| <code>WorkflowCoordinator</code> is a bounded plan/retrieve/respond strategy inside an Agent turn, not a Workflow Execution controller with Stages. | semantic architecture problem | Renaming it to WorkflowController would silently preserve the wrong topology and lifecycle semantics. |
| Current Flow/Phase is embedded in AgentDefinition and gates capability exposure; it is neither clearly Agent-local policy nor the v0.4 Workflow Stage model. | semantic architecture problem | Its disposition requires an explicit semantic decision; Phase must not be mechanically renamed Stage. |
| Assistant reply completion and external-turn stop reasons are the primary completion boundary. | semantic architecture problem | v0.4 requires response/message to remain distinct from terminal Execution completion. |
| Current <code>SessionEvent</code> is mostly an audit/event-sourcing vocabulary about a turn. There is no separate normalized runtime Event vocabulary delivered to mailboxes. | semantic architecture problem | Model-call trace records and durable history entries are not automatically Events that advance an Execution. |
| Capability/tool calls are specialized methods; there is no general <code>EffectRequest</code> union for capability use, memory writes, spawn, messaging, and user input. | semantic architecture problem | Runtime authorization, correlation, pending work, and provenance need a common request boundary. |
| No Execution lifecycle, Activation, scheduler queue, mailbox/router, general pending-operation record, or wake-up mechanism exists. | semantic architecture problem | These are the operational semantics of long-lived Executions, not optional directory cleanup. |
| There is no child <code>spawn</code>/<code>call</code>, peer <code>send</code>/<code>ask</code>, ownership graph, or terminal child-result Event. | semantic architecture problem | Recursive composition and communication cannot be represented by the current single-session turn model. |
| Authority is expressed through bound tools, phases, argument provenance, and limits, but there is no typed authority envelope, active view, spawn/message authority, or delegation calculation. | semantic architecture problem | Current checks are useful but do not cover the v0.4 authority model. |
| Working Notes are a flat array on SessionState with TTL selection, not frames/views with delegated child visibility. | semantic architecture problem | Ancestry, visibility, inherited read-only notes, and child-local writes cannot be enforced structurally. |
| <code>packages/core</code> directly depends on and imports LangChain document/retrieval implementation classes. | dependency-direction problem | A retrieval framework implementation currently points into the same package that owns kernel semantics. The existing package-boundary test forbids known ArrokothI implementation packages but does not catch this third-party dependency. |
| <code>knowledge/</code> combines kernel-facing source/query contracts with concrete local indexing, LangChain chunking, and web-provider aggregation. | package-boundary problem | Contracts should remain stable while retrieval implementation is replaceable. |
| <code>tools/</code>, <code>capabilities/</code>, <code>confirmation/</code>, and parts of <code>harness/</code> share ownership of the current action gateway. | directory/naming problem | The useful behavior should converge under capability contracts and the runtime Effect gateway, without preserving four competing conceptual entry points. |
| <code>provider/</code> is actually a kernel port, while <code>loop/</code> mixes an Agent-executor port and a reference implementation. | directory/naming problem | Ports and reference implementations are hard to identify from the current tree. |
| The generic Strands integration and Gemini/Google-specific convenience wiring share one source module and dependency set. | package-boundary problem | It is contained outside core, but generic Agent-executor ownership and provider-specific composition are blurred. |
| SQLite implements AgentDefinition/SessionStore-shaped persistence only. | technical debt only | The package boundary is correct, but its contracts and schema must evolve when the new Execution/mailbox/pending-operation ports exist. |
| Studio imports sample Agent definitions from example workspaces. | technical debt only | It couples the app to examples, but it does not currently reverse the kernel dependency direction or justify a new package by itself. |
| Core exports a very broad flat index spanning semantics, implementations, compatibility runtime, and testing-adjacent helpers. | technical debt only | Subpath exports may improve ownership later, but reorganizing exports before semantic boundaries stabilize would be cosmetic churn. |
| Package tests are colocated, but cross-package architectural scenarios have no dedicated root. | directory/naming problem | v0.4 conformance should be reviewable and runnable independently of legacy unit/benchmark suites. |

## 4. Proposed target repository tree

The tree below is a target ownership model, not a command to create every directory immediately. In particular, no execution-environment integration package should exist until there is a real backend to put in it.

~~~text
agent-kernel/
├── apps/
│   └── studio/                         # trusted-local authoring/inspection app
│
├── packages/
│   ├── core/                           # one primary semantic kernel package
│   │   ├── src/
│   │   │   ├── definitions/            # Agent/Workflow/Stage definitions
│   │   │   ├── execution/              # identity, lifecycle, context, control, result
│   │   │   ├── interaction/            # Events, EffectRequests, messages, correlation
│   │   │   ├── authority/              # envelopes, views, delegation, resource bindings
│   │   │   ├── composition/            # Stage/Adapter/child-call semantic contracts
│   │   │   ├── controllers/
│   │   │   │   ├── agent/              # model-directed semantic controller
│   │   │   │   └── workflow/           # topology/Stage controller and Stage barrier
│   │   │   ├── memory/                 # structured, artifacts, Working Note frames/views
│   │   │   ├── context/                # eligible-view and model-context compilation
│   │   │   ├── capabilities/           # capability/resource contracts and projections
│   │   │   ├── runtime/                # Harness, scheduler, mailbox, pending work, routing
│   │   │   ├── ports/                  # provider/executor/store/environment/policy ports
│   │   │   ├── reference/              # in-memory/trusted-local reference implementations
│   │   │   ├── schema/                 # serializable schema/value validation
│   │   │   ├── support/                # IDs, clock, hash, Result-like utilities
│   │   │   ├── testing/                # public test fakes/builders
│   │   │   └── index.ts                # deliberately curated public API
│   │   └── tests/
│   │       ├── unit/                    # pure semantic module tests
│   │       └── integration/             # core runtime/reference integration tests
│   │
│   ├── agents/
│   │   └── strands/                    # AgentExecutor implementation; no kernel semantics
│   │
│   ├── models/
│   │   └── gemini/                     # ModelProvider implementation
│   │
│   ├── storage/
│   │   └── sqlite/                     # implementations of kernel persistence ports
│   │
│   ├── retrieval/
│   │   └── local/                      # current local/record/LangChain-backed retrieval
│   │
│   └── environments/                   # create only when a real external backend exists
│       └── <reviewed-backend>/          # ExecutionEnvironment implementation
│
├── examples/
│   ├── minimal-agent/
│   ├── simple-rag-workflow/
│   ├── bounded-multi-llm-workflow/
│   ├── agentic-research/
│   ├── workflow-calls-agent/
│   ├── long-lived-agent/
│   ├── strands-gemini/
│   ├── estate-like/                    # retain while migrating product-shaped behavior
│   └── benchmark/
│       ├── p01/
│       └── p02/
│
├── tests/
│   ├── integration/                    # app + multiple integration packages
│   ├── conformance/                    # canonical v0.4 executable scenarios
│   │   ├── execution/
│   │   ├── events-effects/
│   │   ├── workflow/
│   │   ├── agent/
│   │   ├── composition/
│   │   ├── memory-authority/
│   │   ├── communication/
│   │   ├── security/
│   │   └── durability/
│   └── fixtures/                       # reusable definitions/backends/scenario inputs
│
├── scripts/                            # canaries, diagnostics, release/dev tooling
├── docs/
│   └── development/                    # working documents, no added hierarchy for now
├── package.json
├── package-lock.json
└── tsconfig.json
~~~

### Why this is the smallest useful topology

- Agent, Workflow, Event, Effect, authority, memory, and runtime remain **internal modules of one kernel package** because they jointly define one semantic system and will evolve together through v0.4.
- Existing third-party implementation categories stay in separate packages because they have independent dependencies, release risks, credentials, and replacement boundaries.
- One new retrieval package is justified by an actual current boundary violation, not future scale.
- The trusted in-process reference Harness, scheduler, and stores may remain in <code>core/reference</code> because they have no third-party infrastructure dependency and are needed to make the minimal profile executable.
- A future external sandbox/worker is a package only when its product dependency and security review exist. The ExecutionEnvironment port belongs in core now; hypothetical backends do not.
- Examples remain application-shaped demonstrations. Conformance tests become a separate repository concept because examples and benchmark protocols are not sufficiently precise authority/lifecycle assertions.

## 5. Package strategy

### Recommendation: one primary kernel package

Keep <code>packages/core</code> as the one primary kernel package through the v0.4 migration. Do not create workspace packages such as:

~~~text
@arrokoth/events
@arrokoth/effects
@arrokoth/runtime
@arrokoth/workflow
@arrokoth/agent
@arrokoth/memory
@arrokoth/authority
~~~

Those concepts are semantically distinct but operationally coupled. Separate packages would require premature public APIs across every internal edge, introduce version coordination and cycle pressure, and make vertical Slices A–G harder to evolve atomically. A directory or later subpath export is enough to communicate ownership.

The current path and package identity should remain stable during the semantic migration unless maintainers separately approve a public naming/versioning project. Renaming <code>packages/core</code> to <code>packages/kernel</code>, or changing <code>@agent-sdk/core</code>, does not make the architecture more correct and would mix consumer migration with runtime semantics.

### What should remain separate packages

Separate packages are justified where there is a genuine replaceable implementation or third-party dependency boundary:

- <code>packages/agents/strands</code>: Strands implementation of an ArrokothI AgentExecutor port.
- <code>packages/models/gemini</code>: Gemini implementation of a ModelProvider port.
- <code>packages/storage/sqlite</code>: SQLite implementation of persistence ports.
- <code>packages/retrieval/local</code>: current local/record/document retrieval implementation, including LangChain dependencies unless later replaced.
- <code>packages/environments/&lt;backend&gt;</code>: future reviewed environment/isolation implementation, only when built.

An implementation package may expose several closely related adapters. It should not copy or redefine kernel types. If an implementation needs a provider/framework bridge, prefer an explicit subpath or application-level factory before creating another workspace package.

### Reference implementations

In-memory stores, FIFO scheduling, a trusted in-process ExecutionEnvironment, and deterministic test/reference controllers may stay under <code>packages/core/src/reference</code> if they:

- import and implement kernel ports;
- introduce no provider/framework/database/sandbox dependency;
- are clearly described as reference/minimal-profile mechanisms rather than semantics;
- can be replaced without changing Definitions.

If one later gains a substantial third-party dependency, it should move to an external implementation package then.

## 6. Kernel vs integrations boundary

### 6.1 Semantic kernel ownership

The semantic kernel owns:

- the meaning and validation of AgentDefinition, WorkflowDefinition, StageDefinition, and their references;
- Execution identity, lifecycle, Activation, controller-control data, typed terminal results, ownership metadata, and ExecutionContext shape;
- normalized Event and EffectRequest envelopes, causation/correlation identifiers, and completion-boundary metadata;
- Agent and Workflow controller contracts and the rules distinguishing their semantic progression;
- Stage and Adapter contracts, including Stage completion barriers and Effect-free Adapter restrictions;
- authority requests/envelopes, active/exposed views, child delegation, message/spawn authority, resource bindings, and denial semantics;
- memory forms, memory views, Working Note frame/view semantics, and context-eligibility rules;
- runtime coordination semantics for the Harness, routing, scheduling, mailboxes, pending operations, confirmation, cancellation, and wake-up;
- capability/resource contracts and the provider-neutral request/result shapes crossing the Effect boundary;
- ports that external model, Agent executor, storage, retrieval/resource, trace, policy, clock, and ExecutionEnvironment implementations satisfy;
- the minimal in-memory reference profile.

The kernel does **not** own:

- Gemini HTTP envelopes, credentials, retry classifications, or provider schema quirks;
- Strands classes, hooks, interventions, conversation managers, or model implementations;
- SQLite schema/SQL/transactions;
- LangChain Documents, retrievers, splitters, vector stores, or framework lifecycle;
- browser, MCP, HTTP/OpenAPI, database, web-search, filesystem, or remote-job transports;
- Docker/container/VM/WASM/managed-sandbox APIs or their security configuration;
- Studio HTTP routes, environment variables, UI state, tenant authentication, or domain policy;
- application-specific capability legality such as what counts as an allowed trade or nearby peer.

### 6.2 Desired dependency direction

Imports should point inward:

~~~text
apps / examples / scripts
        |
        +----> integration packages
        |          |
        |          v
        +----> kernel public ports/contracts
                       |
                       v
                 kernel semantics
~~~

More concretely:

~~~text
Strands / Gemini / SQLite / LangChain / sandbox backend
                         |
                         v
                ArrokothI-owned port
                         |
                         v
                ArrokothI semantics
~~~

The kernel may call a supplied port. It must not import the implementation package or allow an implementation type to appear in a semantic Definition or ExecutionContext.

### 6.3 Existing integrations

**Strands.** Preserve the current intervention/gateway work and adapt it to the future AgentExecutor contract. Strands should translate between framework loop observations and ArrokothI controller/Effect contracts. Strands must not define Agent lifecycle, terminal completion, authority, or Event semantics.

**Gemini.** Preserve the provider-neutral <code>ModelProvider</code> implementation and provider-specific schema/error handling. Model inference is normally local controller computation; Gemini output should not become a runtime Event solely because it came from a provider. If model inference is later dispatched as remote pending work, the runtime adapter—not Gemini semantics—decides that its completion is an Event.

**SQLite.** Preserve optimistic append, transaction, and snapshot experience, but implement new ArrokothI store ports as they appear. SQL tables may be consolidated or split internally; database layout must not determine whether Session, Execution, mailbox, or pending operation is a kernel concept.

**LangChain-related functionality.** Move concrete imports from <code>packages/core/src/knowledge/in-memory.ts</code> into an external retrieval implementation package. Keep ArrokothI source/query/result/capability contracts in core. Decide during migration whether the pure record-query evaluator belongs in the external local retrieval package or remains a dependency-free reference capability implementation.

**Future execution environments.** Define a small core port that receives explicit inputs, scoped resource/workspace exposure, limits, and an Effect bridge. A trusted in-process reference implementation may live in core. Docker, managed sandbox, remote worker, or other reviewed implementations live outside core and must not establish new Execution meanings.

### 6.4 Current dependency-direction violations or concerns

The direct <code>@langchain/core</code> and <code>@langchain/textsplitters</code> dependencies in <code>packages/core/package.json</code>, and their imports in <code>knowledge/in-memory.ts</code>, are the clearest violation.

The Strands package's generic engine currently also imports Strands' Google model and exposes <code>createStrandsGeminiEngine</code>. This does not contaminate core, but it mixes Agent-framework and provider-specific wiring. The preferred target is a generic Strands entry point plus an explicit provider bridge/subpath or application-level composition.

The Gemini package test imports the old core preflight plan schema. Provider adapter tests should primarily prove the generic ModelProvider contract; a Gemini + Workflow/preflight path belongs in repository integration coverage. This is test coupling rather than a runtime dependency violation.

## 7. Proposed internal kernel organization

The following table defines ownership more precisely than directory names alone.

| Directory | Responsibility | May depend on | Intended dependents | Must not contain |
| --- | --- | --- | --- | --- |
| <code>definitions/</code> | Serializable Definition base, AgentDefinition, WorkflowDefinition, Workflow Stage definitions, validation/version references, requested authority/memory declarations. | <code>schema</code>, semantic value types, Definition-facing contracts. | Apps, controllers, runtime creation, stores. | Runtime lifecycle, mailboxes, provider clients, controller instances, SQL. |
| <code>execution/</code> | ExecutionId, ExecutionContext, lifecycle, Activation outcome, Agent/Workflow control-state union, owner/root metadata, terminal-result contracts. | Definitions and semantic primitives. | Runtime, controllers, persistence ports, conformance tests. | Stage lifecycle, scheduler implementation, provider/framework state, generic opaque state bags. |
| <code>interaction/</code> | Event and EffectRequest unions/envelopes, message/result observations, correlation/causation, completion-boundary markers. | Execution identifiers, authority/resource references, schemas. | Runtime, controllers, ports, tracing. | Capability implementations, executor transports, automatic claims that a request happened. |
| <code>authority/</code> | Authority request/envelope, required/optional grants, capability/resource/spawn/message categories, delegation/narrowing, active views, access decisions. | Definitions, identifiers, resource/capability descriptors. | Runtime Effect gateway, creation, context compiler, policy ports. | Application domain policy, provider SDK permissions, prompt-only safety rules. |
| <code>composition/</code> | Stage/Adapter contracts, Stage-local computation environment, child call/spawn descriptors, required-work/completion-barrier semantics, result adaptation. | Definitions, interaction contracts, memory/context read views, narrow runtime service ports. | Workflow controller, Agent controller, application authoring. | Independent Stage ExecutionContext, scheduler/mailbox ownership, Effect-capable Adapters. |
| <code>controllers/agent/</code> | Model-directed semantic loop, context/adapters/executor coordination, observation interpretation, semantic completion. | Execution/interaction contracts, context, composition, AgentExecutor/Model ports, narrow Effect requester. | Harness through a controller interface. | Lifecycle transitions, persistence ownership, Strands types, direct tool/database access. |
| <code>controllers/workflow/</code> | System-defined topology, current Stage control, Stage runner dispatch, predefined transitions, Stage barrier, Workflow completion. | Definitions, execution/interaction contracts, composition, context, narrow Effect requester. | Harness through a controller interface. | Agent open-ended loop, independent Stage lifecycle/mailbox, old Phase logic relabeled as Stage. |
| <code>memory/</code> | Structured Memory contracts/provenance/views, Artifact references, Working Note frames, delegated visibility, read/write view rules. | Schema, Execution identifiers, interaction references. | Context compiler, runtime, controllers, memory store ports. | Prompt packing policy, physical database/file implementation, automatic child-to-parent note merge. |
| <code>context/</code> | Selection and compilation from eligible Events/history/memory/notes/artifacts/active capabilities; child/Adapter visibility constraints. | Memory views, authority active view, interaction history, schemas, model request port types. | Agent/Workflow model-call logic, Studio traces. | Durable memory ownership, authority grants, provider-specific tokenizers unless injected. |
| <code>capabilities/</code> | Capability/resource descriptors, catalogs, model-facing projection contracts, authorized request/outcome shapes, bound-resource exposure modes. | Schema, authority, interaction contracts. | Runtime Effect gateway, context compiler, integration implementations. | LangChain, web clients, raw credentials, confirmation lifecycle, direct model loops. |
| <code>runtime/</code> | One logical Harness, Execution registry, scheduler/Activation coordination, mailbox/router, pending operations, Effect gateway, child/peer routing, cancellation, confirmation, recovery orchestration, provenance. | All kernel semantics, controller contracts, and ports. | Public runtime API, apps, conformance tests. | Provider/framework/SQL/sandbox implementations, application domain policy, model-owned lifecycle decisions. |
| <code>ports/</code> | ArrokothI-owned interfaces for model inference, Agent executor, capability/resource executor, Execution/mailbox/pending/effect/memory/artifact stores, scheduler queue, trace sink, policy, and ExecutionEnvironment. | Semantic contracts only. | Runtime/controller code and every external implementation package. | Default implementation behavior, vendor types, credentials, package-specific configuration. |
| <code>reference/</code> | Minimal in-memory stores/mailboxes/scheduler, trusted in-process environment, reference executor/controller helpers. | Ports, runtime contracts, semantic modules. | Tests, examples, Studio's lightweight profile. | Third-party infrastructure dependencies or stronger containment claims. |
| <code>schema/</code> | Serializable schema description, validation, provider-neutral JSON-schema projection support. | Support utilities only. | Definitions, Effects/capabilities, provider ports. | Provider-specific schema workarounds. |
| <code>support/</code> | IDs, time, hashing, Result-like utilities with no domain ownership. | Standard library only. | Any core module. | Runtime semantics or a miscellaneous dumping ground. |
| <code>testing/</code> | Scripted providers/executors, deterministic clock/IDs, builders and scenario fixtures exported for consumers. | Public kernel contracts and reference implementations. | Package and external consumer tests. | Production runtime behavior or hidden alternate semantics. |

### 7.1 Internal import discipline

The runtime should depend on controller contracts, while controller implementations receive narrow runtime services such as an Effect requester. Controllers must not import a concrete Harness to avoid a cycle.

~~~text
runtime
  -> controller contracts
  -> ports
  -> semantic modules

controller implementations
  -> semantic modules
  -> narrow runtime-service ports

reference implementations
  -> ports/runtime contracts

ports
  -> semantic types

semantic modules
  -> schema/support
~~~

The public <code>index.ts</code> should curate supported contracts and facades. Internal modules should not import back through the public barrel.

## 8. Current → target mapping

Actions describe eventual disposition, not work authorized by this document. <code>REWRITE</code> is reserved for a semantic contract that cannot become correct through movement alone.

| Current location | Proposed location | Action | Reason |
| --- | --- | --- | --- |
| <code>packages/core</code> | <code>packages/core</code> | KEEP | One primary package remains the smallest coherent kernel topology. |
| <code>core/src/definition/types.ts</code> | <code>definitions/agent.ts</code> plus shared Definition contracts | SPLIT | Preserve useful Agent fields while introducing a true Agent/Workflow execution-definition boundary. |
| <code>core/src/definition/definition.ts</code> | <code>definitions/agent-validation.ts</code> and shared validation | SPLIT | Current validation is valuable but Agent-only and mixes several older embedded concepts. |
| <code>core/src/definition/store.ts</code> | <code>ports/definition-store.ts</code> and <code>reference/in-memory/definition-store.ts</code> | SPLIT | Separate port from reference implementation; expand to Execution Definitions. |
| <code>core/src/session/events.ts</code> | <code>interaction/events.ts</code> plus <code>runtime/journal/trace-records.ts</code> or compatibility history | SPLIT | Runtime observations and audit/event-sourcing records have different semantics. |
| <code>core/src/session/state.ts</code> | <code>execution/</code>, <code>memory/</code>, controller control state, and compatibility Session projection | SPLIT | Current SessionState is a useful projection but is not the v0.4 ExecutionContext. |
| <code>core/src/session/store.ts</code> | <code>ports/*-store.ts</code> plus <code>reference/in-memory/</code> | SPLIT | New Execution/mailbox/pending stores must not be hidden behind one Agent Session contract. |
| <code>core/src/runtime/runtime.ts</code> | <code>runtime/harness.ts</code>, runtime services, and a temporary compatibility facade | REWRITE | A request-scoped AgentRuntime cannot be moved into the one-Harness/many-Execution role unchanged. |
| <code>core/src/runtime/journal.ts</code> | <code>runtime/journal/</code>, pending/effect journaling, and compatibility journaling | SPLIT | Checkpoint/projection patterns are useful, while identifiers and ownership must become Execution-aware. |
| <code>core/src/harness/agent-harness.ts</code> | <code>controllers/agent/</code> plus <code>runtime/</code> | SPLIT | It currently mixes semantic Agent turn logic with operational gateway/turn ownership. |
| <code>core/src/harness/workflow.ts</code> | Agent preflight strategy under <code>controllers/agent/</code>; new code later under <code>controllers/workflow/</code> | SPLIT | Current class is not the v0.4 Workflow controller and must not be renamed into one. |
| <code>core/src/harness/types.ts</code> | <code>runtime/</code>, <code>controllers/</code>, and <code>ports/</code> contracts | SPLIT | Current Harness service bag combines multiple ownership layers. |
| <code>core/src/loop/types.ts</code> | <code>ports/agent-executor.ts</code> and <code>controllers/agent/</code> | SPLIT | The framework seam is a port; semantic loop decisions remain kernel-owned. |
| <code>core/src/loop/reference.ts</code> | <code>reference/agent-executor/</code> | MOVE | It is a valuable dependency-free reference implementation, not a semantic package. |
| <code>core/src/flow/</code> | Agent policy/strategy compatibility or future Workflow authoring migration | UNCERTAIN | Canonical docs do not decide whether existing Phase semantics survive; Phase is not automatically Stage. |
| <code>core/src/planning/</code> | <code>controllers/agent/strategies/preflight/</code> or application compatibility | MOVE | Preflight is a current Agent-turn strategy, not a universal kernel planning concept. |
| <code>core/src/capabilities/catalog.ts</code> and <code>types.ts</code> | <code>capabilities/</code> | KEEP | Provider-neutral descriptors/projections already approximate the correct responsibility. |
| <code>core/src/capabilities/gateway.ts</code> | <code>runtime/effects/</code> with capability helpers in <code>capabilities/</code> | SPLIT | Authorization/dispatch/correlation belong to the common Effect gateway, while catalog semantics remain capability-owned. |
| <code>core/src/tools/</code> | <code>capabilities/</code>, <code>runtime/effects/</code>, <code>runtime/confirmation/</code>, and integration executors | SPLIT | “Tool” is one model/provider projection of capabilities, not a separate kernel execution/action ontology. |
| <code>core/src/confirmation/</code> | <code>runtime/confirmation/</code> | MOVE | Exact-payload confirmation is useful runtime policy and pending-work behavior. |
| <code>core/src/memory/structured.ts</code> and structured types | <code>memory/structured/</code> | MOVE | Validation and provenance match v0.4 responsibility and can be generalized to views. |
| <code>core/src/memory/working.ts</code> and flat note state | <code>memory/working-notes/</code> | REWRITE | Frames, delegated visibility, read-only inheritance, and per-frame bounds require new semantics. |
| <code>core/src/context/</code> and <code>compiler/</code> | <code>context/</code> | MERGE | Both own eligible-view/context compilation; the compiler must expand to Execution/Stage/Agent boundaries. |
| <code>core/src/knowledge/types.ts</code> | <code>capabilities/</code>, resource contracts, and retrieval-related ports | SPLIT | Retain ArrokothI contracts but make retrieval a capability/resource use, not a kernel subsystem with implementation ownership. |
| <code>core/src/knowledge/in-memory.ts</code> | <code>packages/retrieval/local</code> | MOVE | It contains concrete LangChain implementation dependencies that must point into core ports. |
| <code>core/src/knowledge/record-query.ts</code> | <code>packages/retrieval/local</code> or <code>core/reference</code> | UNCERTAIN | It is dependency-free and useful; final ownership depends on whether record querying is a reference capability or part of the local retrieval package. |
| <code>core/src/provider/types.ts</code> | <code>ports/model-provider.ts</code> | RENAME | It already is a kernel port; the target name should state that role. |
| <code>core/src/schema/</code> | <code>schema/</code> | KEEP | Provider-neutral serializable validation is a stable leaf responsibility. |
| <code>core/src/util/</code> | <code>support/</code> | RENAME | Clarifies deliberate low-level ownership; this is optional cleanup after semantic slices. |
| <code>core/src/testing/</code> | <code>testing/</code> | KEEP | Test fakes/builders are useful through a separate export. |
| <code>core/src/index.ts</code> | curated root and possible stable subpath exports | REWRITE | The public API must expose new semantics while compatibility policy is decided; do not mechanically re-export every internal module. |
| <code>packages/agents/strands</code> | <code>packages/agents/strands</code> | KEEP | Correct replaceable Agent-framework integration boundary. |
| Gemini/Google convenience inside Strands | explicit subpath/bridge or app wiring | SPLIT | Keep the generic AgentExecutor integration distinct from provider-specific composition. |
| <code>packages/models/gemini</code> | <code>packages/models/gemini</code> | KEEP | Correct provider boundary; adapt only to the stabilized model port. |
| <code>packages/storage/sqlite</code> | <code>packages/storage/sqlite</code> | KEEP | Correct implementation boundary; add/replace store implementations slice by slice. |
| no current retrieval package | <code>packages/retrieval/local</code> | MOVE | Receives existing concrete retrieval code; this is extraction of current code, not hypothetical proliferation. |
| no current environment package | future <code>packages/environments/&lt;backend&gt;</code> | UNCERTAIN | Create only when an actual reviewed backend is selected. |
| <code>apps/studio</code> | <code>apps/studio</code> | KEEP | App/wiring/UI remain outside core; later update it to create/manage many Executions. |
| current examples | <code>examples/</code> | KEEP | Preserve working behavior and add v0.4-focused examples rather than replacing everything at once. |
| <code>examples/benchmark</code> | <code>examples/benchmark</code> | KEEP | Product/quality benchmarks remain distinct from architecture conformance. |
| package-level tests | package <code>tests/unit</code> and <code>tests/integration</code> | KEEP | Colocation remains appropriate; reorganize only when touched. |
| scattered architecture-invariant package tests plus new scenarios | <code>tests/conformance</code> | MERGE | Collect canonical cross-package scenarios into a first-class repository concept while retaining package-level unit coverage. |
| root npm workspace/config | root workspace/config | KEEP | Existing workspace mechanics are adequate; extend globs only when approved packages/tests are created. |

No existing useful module is marked DELETE. Deletion decisions should follow the implementation audit and proof that compatibility behavior is covered elsewhere.

## 9. Dependency rules

The repository should eventually enforce these rules:

1. <strong>Applications and examples may import the core public API and any integration package.</strong> They own concrete wiring, credentials, environment selection, and domain policy.
2. <strong>Integration packages may import only public core ports/contracts and dependency-free shared schemas intended for implementers.</strong> They must not import core private runtime internals.
3. <strong>Core semantics may not import apps, examples, scripts, or any integration package.</strong>
4. <strong>Core semantics may not import provider/framework/storage/retrieval/sandbox SDKs.</strong> Third-party implementation dependencies belong outside core.
5. <strong>Ports may depend on semantic types; semantic types must not depend on implementations of those ports.</strong>
6. <strong>Runtime may depend on controller contracts; controllers receive narrow Effect/context services and must not own or import a concrete Harness.</strong>
7. <strong>Agent and Workflow controllers may share semantic contracts and composition helpers but must not import one another's concrete implementation.</strong> Recursive composition occurs through SpawnExecution/call semantics.
8. <strong>Stage and Adapter modules may not import scheduler, mailbox, lifecycle transition, or persistence implementations.</strong> They run under an enclosing Execution.
9. <strong>Adapters may not import the Effect gateway, memory write port, spawn/message API, or capability executors.</strong>
10. <strong>Memory must not import the context compiler.</strong> Context selects from memory views; memory does not decide prompt exposure.
11. <strong>Authority derivation must not import model/provider code.</strong> Model output may supply a request, never a grant.
12. <strong>Capability/resource contracts must not expose raw implementation clients or credentials.</strong>
13. <strong>Storage packages persist kernel-owned records but must not define their semantic meaning.</strong>
14. <strong>ExecutionEnvironment implementations may depend on core ports and backend SDKs; core must not depend on a backend.</strong>
15. <strong>Test helpers may depend inward on public/reference APIs. Production source may not import <code>testing/</code>.</strong>

Forbidden examples:

~~~text
core -> @strands-agents/sdk
core -> @google/* or provider SDK
core -> @langchain/*
core -> node:sqlite or database client
core -> Docker/managed-sandbox SDK
core -> apps/studio

definitions -> scheduler/store implementation
Stage -> ExecutionStore or mailbox
Adapter -> EffectGateway
context compiler -> raw database/provider credential
integration -> core/src/private-file
peer message permission -> memory/cancellation API
~~~

Enforcement can later combine package manifests, export maps, TypeScript project references or path policy, and dependency tests. That enforcement is outside this pass.

## 10. Tests and conformance structure

### 10.1 Unit tests

Keep pure behavior tests next to the owning package:

~~~text
packages/core/tests/unit/
packages/models/gemini/tests/unit/
packages/agents/strands/tests/unit/
packages/storage/sqlite/tests/unit/
packages/retrieval/local/tests/unit/
~~~

Examples include schema validation, lifecycle transition validation, authority intersection, Stage transition resolution, Event projection, provider payload projection, SQL row mapping, and Strands event translation.

Existing package tests do not need to be moved wholesale before their module is migrated. The target subdivision can be adopted incrementally.

### 10.2 Package integration tests

Each package should test its implementation against the public port it claims to implement:

- core runtime with in-memory reference stores/scheduler;
- Strands against AgentExecutor contract fakes;
- Gemini against generic ModelProvider cases;
- SQLite against store contract suites;
- local retrieval against capability/resource query contracts.

Reusable contract-test functions may live in <code>packages/core/src/testing</code> when external implementers need them.

### 10.3 Repository integration tests

Use <code>tests/integration/</code> for wiring across multiple packages or an application boundary:

- core + Strands + Gemini model bridge;
- core + SQLite restart path;
- Studio API + core/reference runtime;
- local retrieval + capability gateway;
- future core + isolated environment backend.

Provider canaries that require credentials remain scripts/manual or opt-in tests and should not be the default offline conformance suite.

### 10.4 Architectural conformance tests

<code>tests/conformance/</code> should become a first-class repository concept. It should encode the scenarios in the implementation guide using reference implementations by default, then allow selected integration backends to run the same suites.

Suggested grouping:

| Conformance area | Scenarios |
| --- | --- |
| <code>execution/</code> | Long-lived WAITING/READY/RUNNING, response != completion, typed terminal result, minimal in-process profile. |
| <code>events-effects/</code> | Fast/slow Effect equivalence, failure Event before terminal failure, correlation, inline wait budget != Effect deadline. |
| <code>workflow/</code> | Simple RAG Workflow, local-corpus RAG, bounded multi-LLM Stage, predefined transition rejection, Stage completion barrier. |
| <code>agent/</code> | Agentic research loop, repeated model-directed actions, bounded Workflow remains Workflow. |
| <code>composition/</code> | Workflow calls Agent, parent with children, recursive Workflow, Stage not Execution, child terminal results. |
| <code>memory-authority/</code> | Structured views/provenance, Working Note delegation, child narrowing, active view subset, prompt injection cannot grant authority. |
| <code>communication/</code> | Peer Agents, ownership != communication, ask correlation, user input, exact-payload confirmation. |
| <code>security/</code> | Trusted-local claim; later hostile Stage, raw-secret/resource denial, control-plane identifier tests per backend/profile. |
| <code>durability/</code> | WAITING restart, mailbox/pending recovery, Effect idempotency and deadline preservation. |

Conformance tests should assert semantic outcomes and forbidden observations, not internal class names. A scenario may be reused against in-memory and SQLite stores or against reference and Strands Agent executors.

### 10.5 Benchmarks and examples

Examples demonstrate authoring and integration ergonomics. Benchmarks measure task/product behavior, latency, or quality. Neither should be the sole proof of lifecycle, authority, or visibility invariants.

Keep P01/P02 under <code>examples/benchmark</code>. Add focused v0.4 examples only when the corresponding slice works. Avoid duplicating an example solely to mirror every conformance test.

## 11. Migration principles

The future migration should follow these principles:

1. <strong>Semantic migration before cosmetic cleanup.</strong> Introduce a real Execution substrate before renaming Session files or reorganizing every test.
2. <strong>Preserve working mechanisms behind corrected interfaces.</strong> Exact confirmation, idempotency, event projection, provider abstraction, Strands interception, SQLite transactions, memory validation, and context visibility are assets.
3. <strong>No giant-bang rewrite.</strong> Build vertical slices with executable checkpoints and keep the existing public turn facade running where practical.
4. <strong>Do not translate names mechanically.</strong> Current WorkflowCoordinator is not the future WorkflowController; current Phase is not automatically Stage; current SessionEvent is not automatically a runtime Event.
5. <strong>Separate movement from behavior change.</strong> When possible, first cover existing behavior, then move a responsibility, then change semantics in a later reviewed step. When a semantic rewrite is unavoidable, say so explicitly.
6. <strong>Keep tests passing through compatibility layers.</strong> New conformance tests should be additive; old tests remain until their behavior is deliberately retained, superseded, or deprecated.
7. <strong>Use vertical slices.</strong> Each slice should cross definition, controller/runtime, storage/reference implementation, and conformance only as far as required for one semantic checkpoint.
8. <strong>Avoid simultaneous provider/framework replacement.</strong> Adapt Strands and Gemini to new ports; do not replace them merely because kernel semantics change.
9. <strong>Preserve git history where practical.</strong> Use file moves for unchanged code and separate commits for semantic edits when implementation begins.
10. <strong>Keep package proliferation behind evidence.</strong> Add the retrieval package to remove an observed violation; add environment backends only for selected implementations.
11. <strong>Preserve the trusted-local profile.</strong> The new architecture must remain lightweight in process and must not pretend that static validation is hostile-code containment.
12. <strong>Keep unresolved architecture visible.</strong> Compatibility code is preferable to silently choosing an ambiguous permanent API.

### Relationship to Slices A–I

**Slice A — Execution substrate.** Add Definitions/Execution/runtime/reference structure inside core alongside the current Session/AgentRuntime facade. Prove lifecycle, Activation, one Harness/many contexts, response != completion, and typed terminal results before broad moves.

**Slice B — Event/Effect gateway.** Introduce normalized runtime Events, EffectRequests, mailbox/pending correlation, and fast/slow paths. Split durable audit records from delivered observations deliberately; do not rename all SessionEvents.

**Slice C — Workflow Stages.** Add a new Workflow controller and composition Stage runner. Do not evolve <code>WorkflowCoordinator</code> by name alone. Reuse local retrieval/capability mechanisms after they cross the new Effect boundary.

**Slice D — Agent Execution.** Adapt the existing Agent loop contract/reference loop and Strands implementation to the AgentExecutor/controller boundary. Preserve model-directed continuation while moving lifecycle ownership to Harness.

**Slice E — Recursive composition.** Add spawn/call, child authority and visibility derivation, ownership records, terminal result Events, Agent Stage, and Workflow Stage.

**Slice F — Memory.** Generalize structured memory to views/provenance, add Artifacts, replace flat Working Notes with frames/views, and preserve context compiler safety.

**Slice G — Communication and human interaction.** Add send/ask and message routing separately from ownership, then move RequestUserInput and confirmation onto pending/Event/Effect semantics.

**Slice H — Security profile and execution environment.** Stabilize the port and trusted in-process reference profile first. Select and review one isolated backend only when hostile code is in scope.

**Slice I — Durability.** Expand SQLite and reference stores for ExecutionContexts, mailboxes, pending operations, effect journal/idempotency, and recovery. Storage structure follows stabilized semantics.

Package extraction and directory cleanup should be attached to the slice that proves the new boundary. For example, move LangChain retrieval when Slice B/C defines the capability port it will implement; do not perform a repository-wide move before that contract exists.

## 12. Decisions requiring human approval

| Decision | Recommended option | Alternative(s) | Why it matters | Risk of choosing incorrectly |
| --- | --- | --- | --- | --- |
| Primary kernel package topology | Keep one <code>packages/core</code> package with internal modules. | Split runtime/events/workflow/agent/memory into workspace packages. | Sets API and dependency granularity for every slice. | Package cycles, versioning churn, or an overly monolithic unreviewable boundary. |
| Package/path naming during migration | Keep <code>packages/core</code> and current package identity until semantics stabilize. | Rename to kernel/Arrokoth-scoped packages immediately. | Separates architecture work from consumer/release migration. | Huge diff and broken consumers obscure semantic regressions. |
| Current Session concept | Keep a temporary application/conversation compatibility facade over Execution runtime; decide its long-term public role later. | Delete Session APIs early; or make Session permanently identical to Execution. | Existing app/examples/storage depend on Session, but the concepts are not equivalent. | Accidental reintroduction of the old model or unnecessary compatibility break. |
| Current Flow/Phase semantics | Treat as Agent-local compatibility/policy until audited; do not call it Workflow Stage. | Translate it into WorkflowDefinition; deprecate/delete it; keep as permanent Agent feature. | Determines whether existing estate/benchmark behavior is Agent policy or Workflow topology. | Freezing the wrong control owner into definitions and migrations. |
| Runtime Event vs audit/journal record | Model them as distinct roles/types even if one durable store can hold both. | Use one broad event union for delivery, audit, trace, and projection. | Events are observations to Executions; history also contains local computation and runtime facts. | Controllers consume trace-only records, or audit fidelity is weakened to fit mailbox semantics. |
| Retrieval extraction | Add <code>packages/retrieval/local</code> and remove LangChain from core. | Vendor-neutral <code>retrieval/langchain</code>; rewrite a dependency-free implementation in core; keep current dependency. | Fixes a current dependency-direction violation while preserving code. | Framework types/behavior continue shaping core, or migration rewrites useful retrieval unnecessarily. |
| Pure record-query ownership | Place it with local retrieval unless a dependency-free reference capability is explicitly desired. | Keep in <code>core/reference</code>. | Affects what core promises versus what an implementation supplies. | Core public surface grows around one application data shape, or useful reference behavior becomes inaccessible. |
| Strands + Gemini convenience | Keep generic Strands root API; move provider-specific factory to an explicit subpath/bridge or app wiring. | Leave mixed; create another workspace bridge package. | Clarifies sibling integration ownership without needless package growth. | Hidden provider coupling or excessive tiny integration packages. |
| Reference implementations | Keep dependency-free in-memory/trusted-local reference implementations in core. | Separate <code>packages/reference-runtime</code>. | Minimal profile and conformance need a canonical executable baseline. | Extra package overhead or confusion between reference behavior and semantics. |
| Root conformance suite | Approve <code>tests/conformance</code> as canonical executable architecture coverage. | Keep all tests package-local or express scenarios only as examples. | Cross-package semantics need a discoverable review boundary. | v0.4 claims remain scattered and implementation-specific. |
| Store port granularity | Begin with explicit conceptual ports, but permit one implementation object to implement several; split physically only as durability requires. | One universal RuntimeStore; many mandatory micro-ports immediately. | Balances separation of truth with implementation simplicity. | Opaque state/store coupling or premature interface proliferation. |
| ExecutionEnvironment package policy | Keep the port in core and trusted in-process reference there; create external backend packages only on selection. | Create empty Docker/sandbox packages now; put backend in core. | Prevents hypothetical structure and preserves dependency direction. | False security signal or core dependency contamination. |
| Public API compatibility/versioning | Stage new APIs alongside a clearly marked compatibility facade, with deprecation/removal decided after conformance. | Immediate breaking replacement; indefinite dual APIs. | Controls migration risk for Studio/examples/consumers. | Long-lived duplicate semantics or an unreviewable breaking release. |
| Studio migration role | Keep Studio as the trusted-local application and migrate it after reference conformance is available. | Rebuild Studio in parallel with core; treat it as architecture source. | Studio should validate/apply the kernel, not define it. | App needs distort kernel ports or slow semantic validation. |

## 13. Open questions

The canonical documents deliberately leave several implementation choices open. The directory plan should not answer them accidentally:

1. Is <code>ExecutionDefinition</code> the final public name, or only the current clearest working name?
2. What is the long-term semantic relationship among an application conversation, a current Session, and one or more Executions?
3. Does the existing Flow/Phase feature remain Agent-local policy, become authoring sugar compiled into a Workflow, or get deprecated after compatibility migration?
4. Should delivered Events and durable audit/history records use separate envelopes and stores, or one storage envelope with explicitly separate roles/views?
5. What exact store-port granularity is needed before SQLite durability work: separate Execution/Mailbox/Pending/Effect stores, an aggregate transaction boundary, or both?
6. Should the dependency-free record-query evaluator be a core reference capability or live entirely in the local retrieval integration?
7. Is <code>packages/retrieval/local</code> the best responsibility-based name, or should the package be explicitly vendor-named <code>langchain</code>?
8. What is the smallest CapabilityExecutor/ResourceAdapter port that handles local materialized resources and live mediated resources without exposing credentials?
9. How should Artifact metadata and physical ArtifactStore responsibilities divide between core and storage implementations?
10. How much provider-specific model construction should the Strands package expose, if any?
11. Which parts of current preflight planning are enduring Agent behavior versus compatibility strategy?
12. What terminal-result schema/version contract should DefinitionStore and ExecutionStore preserve?
13. When and how should existing flat root exports become stable subpath exports?
14. Which backwards-compatibility guarantees apply to current <code>@agent-sdk/core</code> consumers and persisted SQLite data?
15. Should the trusted in-process ExecutionEnvironment be a named implementation or simply the default reference runner behind the same port?
16. How should runtime policy and application policy interfaces compose without moving tenant/domain decisions into core?
17. The canonical open semantics for non-blocking Effects, detached children, note commit/fork, Stage result richness, and additional Adapter points remain open. The tree should accommodate them but must not create packages or APIs for them now.
18. No isolated backend has been selected. Its package name, scope, reuse model, threat model, and conformance matrix remain future decisions.

## 14. Recommended next agent task

After humans approve or revise this repository structure, the next task should be a **repo-wide implementation audit and migration-plan pass**, not coding.

That audit should:

1. inventory every current public export, persisted record, application entry point, and cross-package dependency;
2. map each current module and important behavior to the approved target owner;
3. produce a semantic gap matrix against v0.4 invariants and Slices A–I;
4. identify reusable implementations, compatibility facades, required rewrites, and deletion/deprecation candidates with evidence;
5. define the first executable conformance test for each slice and identify which existing tests protect behavior worth preserving;
6. propose ordered vertical migration tasks with file-level scope, dependency prerequisites, rollback/compatibility strategy, and acceptance criteria;
7. propose the public API and persisted-data transition policy without implementing it;
8. identify package-manifest and dependency-enforcement changes needed at each slice;
9. surface unresolved human decisions rather than embedding them in tasks.

The audit should end with a reviewed, incremental coding plan. It should not begin source movement or implementation until that plan is approved.
