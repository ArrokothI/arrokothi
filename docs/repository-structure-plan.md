# Repository Structure Rebuild Plan

This document describes how the `agent-kernel` repository should be organized as the project evolves from a historical Agent SDK layout into a reusable agent execution kernel with first-class implementation packages, deployable applications, benchmarks, and public developer surfaces.

The repository structure should make the architecture understandable before a reader studies the implementation details.

The central rule is:

> **Everything under `packages/` is first-class supported Arrokoth software; only `packages/core` defines Arrokoth kernel semantics.**

A second rule follows:

> **Applications consume the kernel and packages. They do not invent alternative runtime semantics.**

---

## 1. What this repository is expected to become

`agent-kernel` should support three related uses:

```text
1. Embedded kernel
   another Node/TypeScript application imports Arrokoth directly

2. Runtime service
   applications call an Arrokoth server/API remotely

3. Reference product / development environment
   Studio and other Arrokoth applications exercise the same public surfaces
```

The repository should therefore contain more than a single library, but it should remain clear which parts define the architecture and which parts are implementations or products.

Conceptually:

```text
                         APPLICATIONS
┌──────────────────────────────────────────────────────────┐
│ Studio │ Cloud API │ Generator UI │ examples │ products │
└────────────────────────────┬─────────────────────────────┘
                             │
                       public packages
                             │
┌────────────────────────────▼─────────────────────────────┐
│                   IMPLEMENTATION PACKAGES                │
│ Strands │ model adapters │ LangChain │ MCP │ storage ... │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│                       ARROKOTH CORE                      │
│ Executable │ Runtime │ Authority │ Memory │ Context ... │
└──────────────────────────────────────────────────────────┘
```

Dependency direction should primarily point downward toward `@arrokoth/core`.

---

## 2. Target top-level structure

The target repository should remain easy to scan:

```text
agent-kernel/
├── packages/        # reusable/publishable Arrokoth software
├── apps/            # deployable/reference products
├── examples/        # focused learning examples
├── benchmarks/      # evidence, regression, and conformance suites
├── tests/           # cross-package/system tests when needed
├── docs/            # architecture, plans, guides, ADRs
├── scripts/         # repository tooling/manual diagnostics
│
├── README.md
├── package.json
└── workspace config
```

The root should avoid accumulating implementation-specific directories such as `providers/`, `integrations/`, or `diagnostics/` once those responsibilities have clear homes.

---

## 3. `packages/`: all supported reusable software

`packages/` contains code that may be consumed by another package or application.

A package may be required, recommended, or optional for a particular deployment. Its presence under `packages/` means it is part of the supported Arrokoth ecosystem, **not** that it defines core semantics.

Target shape:

```text
packages/
├── core/
├── client/
├── server/
├── presets/
│   └── node/
│
├── agents/
│   ├── strands/
│   ├── reference/
│   └── future-adapters/
│
├── models/
│   ├── gemini/
│   ├── ai-sdk/
│   └── openai-compatible/
│
├── knowledge/
│   ├── langchain/
│   ├── llamaindex/
│   └── pgvector/
│
├── tools/
│   └── mcp/
│
├── storage/
│   ├── sqlite/
│   └── postgres/
│
├── sandbox/
│   ├── docker/
│   └── e2b/
│
└── observability/
    └── opentelemetry/
```

Only directories that actually contain supported implementations should exist. Do not create empty directories solely to advertise hypothetical future integrations.

---

## 4. `packages/core`: the kernel boundary

`packages/core` is the architectural center.

It should contain Arrokoth-owned concepts such as:

```text
packages/core/
├── executable/
│   ├── definition
│   ├── run
│   └── result
│
├── runtime/
│   ├── harness
│   ├── runner
│   ├── lifecycle
│   ├── budget
│   └── cancellation
│
├── authority/
│   ├── envelope
│   ├── scope
│   └── policy
│
├── agent/
│   └── executor contracts
│
├── workflow/
│   ├── definition
│   ├── stage
│   └── transition
│
├── capability/
│   ├── definition
│   ├── gateway
│   ├── profile
│   └── active view
│
├── context/
│   ├── compiler
│   ├── visibility rules
│   └── selection contracts
│
├── memory/
│   ├── structured memory
│   ├── working notes
│   ├── provenance
│   └── artifact contracts
│
├── session/
│   ├── events
│   ├── store contracts
│   └── snapshots
│
└── tracing/
    ├── trace events
    └── exporter contracts
```

The exact folders may evolve. The important rule is dependency ownership.

### Core dependency rule

`packages/core` should not import framework-specific production SDKs for replaceable mechanisms.

Examples of dependencies that should generally remain outside core:

```text
Strands
LangChain
Gemini SDK
OpenAI SDK
MCP SDK
Postgres client
E2B
Langfuse
```

Core may use small general-purpose dependencies where justified, but no external agent/RAG/provider implementation should become the definition of an Arrokoth concept accidentally.

### Core does not need to be production-complete alone

Core should be independently testable and usable for deterministic/reference execution, but this does not mean Arrokoth must reimplement every production mechanism.

For example:

```text
AgentLoopEngine contract
├── ReferenceLoopEngine     small deterministic/reference implementation
└── StrandsLoopEngine       recommended production implementation
```

The reference implementation proves the contract and supports tests. It does not need to compete with Strands in features.

---

## 5. Implementation package categories

### `packages/agents/`

Implement Agent execution mechanisms.

Examples:

```text
@arrokoth/agent-strands
@arrokoth/agent-reference
```

An Agent executor controls the iterative mechanism around repeated model/tool interaction but must respect Arrokoth authority, memory, lifecycle, cancellation, and tracing contracts.

### `packages/models/`

Implement one-inference model boundaries.

Examples:

```text
@arrokoth/model-gemini
@arrokoth/model-ai-sdk
@arrokoth/model-openai-compatible
```

This layer enables model-provider independence and local/self-hosted model support without changing Agent semantics.

### `packages/knowledge/`

Implement retrieval pipelines or retrieval-framework adapters.

Examples:

```text
@arrokoth/knowledge-langchain
@arrokoth/knowledge-llamaindex
@arrokoth/knowledge-pgvector
```

Arrokoth owns the `KnowledgeRetriever` contract and authorization/provenance behavior. These packages may own chunking, embeddings, query transformations, ranking, fusion, reranking, and storage integration.

### `packages/tools/`

Implement tool transports or reusable capability bridges.

Example:

```text
@arrokoth/tool-mcp
```

External transports still pass through `CapabilityGateway` and cannot grant authority.

### `packages/storage/`

Implement durable store contracts.

Examples:

```text
@arrokoth/storage-sqlite
@arrokoth/storage-postgres
```

Arrokoth defines event ordering/concurrency semantics; storage packages implement those semantics using concrete databases.

### `packages/sandbox/`

Implement execution environments.

Examples:

```text
@arrokoth/sandbox-docker
@arrokoth/sandbox-e2b
```

Arrokoth policy defines what execution may do. Sandbox packages implement the technical mechanism.

### `packages/observability/`

Export Arrokoth-native execution traces into external systems.

Example:

```text
@arrokoth/otel
```

Arrokoth trace events remain the source semantics; external formats are projections/export targets.

---

## 6. Public developer surface packages

### `packages/client/`

A remote API client for applications that do not embed the runtime.

Conceptual API:

```ts
const arrokoth = new Arrokoth({ apiKey })

const agent = await arrokoth.agents.create({...})
const run = await agent.run({ input })

for await (const event of run.events()) {
  // render progress
}
```

High-level convenience methods should map to the kernel resource model:

```text
Agent / Workflow convenience API
              ↓
ExecutableDefinition
              ↓
ExecutionRun
```

### `packages/server/`

Reusable network-facing runtime service.

Likely responsibilities include:

```text
definition/version APIs
run creation
run status/results
run event streaming
cancellation
authentication/tenant boundary hooks
credential resolution
runtime composition
```

The server should not introduce a second execution model.

### `packages/presets/node/`

A batteries-included developer preset may be introduced once assembling individual packages becomes burdensome.

Conceptually:

```text
@arrokoth/node
├── @arrokoth/core
├── primary Agent executor
├── recommended model integration
├── default retrieval implementation
└── convenient development storage
```

Normal users get a quick-start experience; advanced users can compose packages explicitly.

The preset chooses defaults. It does not define semantics.

---

## 7. `apps/`: products built on the same public surfaces

Applications should demonstrate real usage of Arrokoth rather than serving as hidden homes for core behavior.

### `apps/studio/`

Studio should become the reference development/runtime-inspection application.

Expected roles include:

```text
create/edit definitions
run Agents and Workflows
inspect ExecutionRun trees
inspect Authority Envelopes
inspect memory/provenance
inspect tool authorization
view trace/events
compare implementation backends
```

Studio must render runtime decisions rather than making those decisions itself.

Bad boundary:

```text
Studio decides whether tool X is allowed
```

Correct boundary:

```text
Arrokoth runtime decides
Studio displays the result
```

### `apps/cloud-api/` (future)

If Arrokoth operates a hosted service, the actual deployment can live as an application that composes `@arrokoth/server` with production packages.

For example:

```text
apps/cloud-api
├── @arrokoth/server
├── @arrokoth/storage-postgres
├── production auth/tenant configuration
├── secrets/credential services
└── deployment-specific infrastructure
```

This keeps the reusable server independent from the hosted product.

---

## 8. `examples/`

Examples should answer one question each.

Potential future examples:

```text
examples/
├── minimal-agent/
├── workflow/
├── agent-calls-workflow/
├── recursive-agent/
├── rag/
├── local-model/
├── mcp-tool/
└── remote-client/
```

Avoid turning examples into miniature frameworks or long-lived product code.

---

## 9. `benchmarks/`

Benchmarks are important architectural evidence, not incidental tooling.

Suggested categories over time:

```text
benchmarks/
├── agent-quality/
├── executor-conformance/
├── authority/
├── durability/
├── context/
├── retrieval/
└── cost-latency/
```

### Executor conformance

A major future benchmark/test target is proving that multiple Agent executors satisfy the same kernel semantics.

For example:

```text
same Agent test suite
       │
       ├── ReferenceLoopEngine
       ├── StrandsLoopEngine
       └── future executor

must preserve:
- authority
- cancellation
- capability interception
- memory proposals/commit semantics
- lifecycle/completion
- event ordering
- budgets
```

This turns backend replaceability from an architectural claim into evidence.

---

## 10. `tests/`

Package-local unit/integration tests should usually stay with their package.

A root `tests/` directory is useful only for cross-package/system-level behavior, such as:

```text
client
  ↓
server
  ↓
runtime
  ↓
Agent executor
  ↓
tool
  ↓
event store
  ↓
restart / resume
```

Do not create a large root test hierarchy if package-local testing is clearer.

---

## 11. `docs/`

The documentation should eventually separate active architecture, contributor guidance, user guidance, and history.

Possible long-term structure:

```text
docs/
├── architecture/
│   ├── mental-model.md
│   ├── execution.md
│   ├── authority.md
│   ├── context.md
│   └── memory.md
│
├── guides/
│   ├── create-agent.md
│   ├── create-workflow.md
│   ├── custom-agent-executor.md
│   ├── custom-model-provider.md
│   └── custom-retriever.md
│
├── adr/
│   ├── 001-executable-model.md
│   ├── 002-authority-envelope.md
│   └── ...
│
└── history/
    └── older mental models/roadmaps
```

Do not reorganize documentation merely for aesthetics while the active architecture is still moving quickly.

Architecture Decision Records (ADRs) are especially useful for decisions that future contributors might otherwise accidentally reverse, for example:

```text
Agent and Workflow are peers
Authority Envelope is immutable per run
Agent executor != Model Provider
Strands is an implementation package, not the Agent definition
LangChain is a retrieval implementation, not the retrieval contract
```

---

## 12. Migration from the current repository

The repository should not perform a semantic refactor and a giant path rewrite simultaneously.

Recommended sequence:

### Phase A — stabilize conceptual ownership

Finish enough of the v0.4 refactor that ownership is clear:

```text
kernel concept?
implementation adapter?
application?
benchmark/tooling?
```

Do not move code whose long-term ownership is still unclear merely to fit a target tree.

### Phase B — mechanical package move

Initial moves should preserve behavior as much as possible:

```text
core/
→ packages/core/

integrations/strands/
→ packages/agents/strands/

providers/gemini/
→ packages/models/gemini/

apps/studio/
→ apps/studio/          # already conceptually correct

examples/
→ examples/             # already correct

benchmarks/
→ benchmarks/           # already correct

docs/
→ docs/                 # already correct
```

`diagnostics/` should be classified by actual purpose:

```text
manual developer/maintenance commands → scripts/
automated integration checks         → package tests or tests/
behavior/performance evaluation      → benchmarks/
```

### Phase C — extract hidden implementations

After the move, remove replaceable implementation dependencies from core when the boundary is ready.

Important example:

```text
packages/core
  owns KnowledgeRetriever contract

packages/knowledge/langchain
  owns LangChain chunking/retrieval implementation
```

Do this because the architectural boundary is useful, not solely to make dependency graphs look pure.

### Phase D — add public surfaces when real

Only create packages when their role is implemented:

```text
packages/client
packages/server
packages/presets/node
packages/tools/mcp
packages/storage/postgres
...
```

Avoid empty future-facing package directories.

---

## 13. Package dependency expectations

A healthy dependency shape should look approximately like:

```text
                        apps/*
                          │
                ┌─────────┼─────────┐
                ▼         ▼         ▼
             client     server    preset
                          │          │
                   implementation packages
                ┌─────────┼──────────────┐
                ▼         ▼              ▼
             strands    langchain      postgres
                \         |             /
                 \        |            /
                  └───────▼───────────┘
                    @arrokoth/core
```

Forbidden or suspicious dependency directions include:

```text
core → Strands
core → LangChain implementation
core → Gemini SDK
core → Postgres implementation
core → Studio

implementation package → app
```

Cycles between implementation packages should also be treated with suspicion.

---

## 14. What a new reader should understand quickly

The root README should eventually make repository navigation explicit:

```text
Understand the kernel       → packages/core
Use a production Agent loop → packages/agents/strands
Use models                  → packages/models
Use retrieval               → packages/knowledge
Use Arrokoth remotely       → packages/client
Run an Arrokoth service     → packages/server
Inspect executions          → apps/studio
Try the system              → examples
See evidence                → benchmarks
Read the architecture       → docs
```

A contributor should not need to infer whether Strands is core, optional, deprecated, or an example based on historical folder names.

---

## 15. Repository design principles

### Architecture should be visible

Directory layout should reinforce the conceptual model rather than contradict it.

### Supported does not mean semantic core

A first-class supported Strands or LangChain package can be the recommended default while still remaining replaceable.

### Dependency direction matters more than folder naming

The strongest architectural boundary is what may import what.

### One strong default

Do not implement many providers merely because the package hierarchy makes space for them.

Maintain one well-supported reference path and add alternatives based on evidence or user need.

### Applications should dogfood public interfaces

Where practical, Studio and future Arrokoth products should use the same public APIs/packages intended for external users. Internal shortcuts should be minimized because they hide missing developer-facing abstractions.

### Mechanical migrations should remain mechanical

Do not use a directory move as an opportunity for unrelated behavioral rewrites.

### The kernel stays compact

The purpose of modular packages is not to turn `agent-kernel` into a huge framework collection. The kernel should remain small enough that its semantics can be understood, tested, and reasoned about independently of the ecosystem around it.

---

## 16. Target developer experience

The repository structure should eventually support two styles cleanly.

### Quick start

```ts
import { createArrokoth } from "@arrokoth/node"

const arrokoth = createArrokoth({...})
const agent = arrokoth.agent({...})
const result = await agent.run("Hello")
```

### Explicit composition

```ts
import { ArrokothRuntime } from "@arrokoth/core"
import { StrandsLoopEngine } from "@arrokoth/agent-strands"
import { PostgresSessionStore } from "@arrokoth/storage-postgres"

const runtime = new ArrokothRuntime({
  agentExecutor: new StrandsLoopEngine(...),
  sessionStore: new PostgresSessionStore(...),
  ...
})
```

The first path should be easy. The second path should make the architecture visible and replaceable.

That is the repository structure `agent-kernel` should grow toward.
