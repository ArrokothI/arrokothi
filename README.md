# Arrokoth Agent Kernel

A provider-neutral execution kernel for building long-lived Agents and Workflows with bounded authority, explicit memory, durable waiting, and composable communication.

> **Executions receive Events and request Effects. Workflows use system-defined semantic topology; Agents use model-directed open-ended semantic progression.**

## Install and verify

Node 22.9 or newer is required.

```bash
npm install
npm test
npm run typecheck
```

The default tests and examples are offline. Copy [`.env.example`](.env.example) to `.env` only for optional live provider examples.

## Architecture documentation

Start with [`docs/README.md`](docs/README.md). The recommended reading order is:

1. [`docs/mental-model.md`](docs/mental-model.md) — canonical conceptual model.
2. [`docs/composition.md`](docs/composition.md) — composition semantics: local computation vs child Executions, Workflow Stages, Effects, completion boundaries, retrieval, and Adapters.
3. [`docs/runtime-architecture.md`](docs/runtime-architecture.md) — Harness, lifecycle, memory visibility, messaging, pending work, confirmation, and durability.
4. [`docs/implementation-guide.md`](docs/implementation-guide.md) — implementation mapping, conformance scenarios, and coding-plan guidance.
5. [`docs/future-plan.md`](docs/future-plan.md) — open questions and future experiments.

Files under [`docs/legacy/`](docs/legacy/) are historical design material and are not canonical.

## Mental model

The core runtime boundary is:

```text
ExecutionDefinition
├── AgentDefinition
└── WorkflowDefinition
        ↓ instantiate
     Execution
```

An **Execution** is an independently managed runtime entity with identity, lifecycle, authority, memory/runtime state, pending operations, and optional communication endpoints.

Ordinary Function calls and LLM inference are normally lightweight computation inside an Agent or Workflow Execution rather than independent Executions.

> **Composition does not imply an Execution boundary. `call` or `spawn` does.**

```text
Event
  ↓
Execution controller
  ↓
EffectRequest
  ↓
Harness
  ↓
capability, memory, another Execution, or environment
  ↓
Event
```

The Harness authorizes and coordinates Effects and records what actually happened. Controllers own semantic work appropriate to their kind.

### Workflow vs Agent

```text
Workflow
  system/application defines the possible semantic topology

Agent
  model repeatedly chooses the semantic next action
  inside hard runtime limits
```

The distinction does not depend on the number of LLM calls, tool use, loops, or duration. A Workflow Stage may contain multiple predetermined LLM calls and Effects. An Agent is different because the model owns an open-ended continuation space.

### Workflow Stages

A Workflow is composed from Stages:

```text
Stage
├── Function Stage
├── LLM Stage
├── Agent Stage
└── Workflow Stage
```

A Stage is a semantic Workflow boundary, not another Execution. It may hide local functions, LLM calls, Effects, and child Execution calls. Work required for the current Stage's semantic completion settles before the Workflow transitions.

Adapters are lightweight boundary transformations attached inside a Stage or around an Agent model-call boundary; they are not Workflow graph nodes or independent Executions.

### Authority and exposure

```text
Capability/resource universe
        ↓
Authority Envelope
        ↓
Active / Exposed View
```

Authority answers what an Execution may ever do. Exposure answers what subset is currently visible to its controller/model.

```text
Active View ⊆ Authority Envelope
```

### Memory and context

Arrokoth distinguishes retained information from current model context.

```text
Memory
  Structured Memory
  Artifacts / Files
  Working Notes

Context
  selected information compiled for the current computation
```

Important shared information should move explicitly through Structured Memory, Artifacts, terminal/Stage results, or authorized messages.

Working Notes use stack-like ancestry, but **ancestry does not imply visibility**. When a child Execution is created, the runtime derives an explicitly delegated/filtered note view. The child may read only the inherited notes made visible to it and writes only its own local frame; child scratch does not automatically merge back into the parent.

### Ownership vs communication

Ownership and communication are independent graphs.

```text
Ownership
  Workflow W
   ├── Agent A
   ├── Agent B
   └── Workflow C

Communication
  A ↔ B
  B ↔ D
```

Messaging permission does not imply ownership, cancellation rights, or memory access.

## Current implementation

The repository is being migrated toward the architecture documented above. Existing components such as Agent execution, model-provider boundaries, capability gateways, memory, context compilation, durability, and storage should be preserved where their responsibilities still match the target semantics.

Older code may still encode previous assumptions. In particular, historical documents and implementation structures may treat LLM/Function invocations as Executions or use older Flow/Phase/AgentHarness semantics. New work should follow the active documents rather than infer the architecture from legacy class names.

The current primary Agent executor is Strands, while model inference remains behind a provider-neutral boundary.

## Commands

```bash
npm run example:minimal
npm run example:estate
npm run example:strands          # add -- --live for Gemini
npm run example:benchmark:p01 -- --check
npm run example:benchmark:p02 -- --check
npm run canary:gemini            # optional live provider check
npm run studio
```

Cross-framework P01/P02 evaluation and retained historical evidence live in the standalone `ArrokothI/benchmark` repository. This repository owns Arrokoth framework code, examples, and architecture documentation.

## Repository layout

```text
packages/core/                kernel contracts/runtime and reference mechanisms
packages/agents/strands/      primary Strands Agent executor adapter
packages/models/gemini/       Gemini model-provider adapter
packages/storage/sqlite/      SQLite persistence adapter
apps/studio/                  local development/inspection surface
examples/                     focused usage examples
docs/                         active architecture, implementation guidance, roadmap
docs/legacy/                  historical design documents
scripts/                      repository tooling/manual diagnostics
```

The intended dependency direction is:

```text
applications / presets
        ↓
implementation packages
        ↓
@arrokoth/core
```

Concrete Agent frameworks, model SDKs, retrieval frameworks, databases, and tool transports may be first-class supported packages without defining kernel semantics.

## One-minute explanation

Arrokoth treats an Agent or Workflow as a potentially long-lived, addressable **Execution**. The Harness manages many Executions and owns operational concerns such as scheduling, authorization, waiting, routing, and recovery. Events are observations delivered into an Execution; Effects are requests to interact with capabilities, memory, users, or other Executions.

A Workflow uses system-defined semantic topology made from Stages. An Agent uses a model-directed semantic loop. Functions, LLM calls, and Adapters normally remain local computation inside those Executions rather than receiving independent runtime identity.
