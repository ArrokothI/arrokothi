# ArrokothI Agent Kernel

A provider-neutral execution kernel for building long-lived Agents and Workflows with bounded authority, explicit memory, durable waiting, composable communication, and protocol-neutral service interoperability.

> **Executions receive Events and request Effects. Workflows use system-defined semantic topology; Agents use model-directed open-ended semantic progression.**

## Install and verify

Node 22.9 or newer is required.

```bash
npm install
npm test
npm run typecheck
```

`npm test` is the semantic conformance suite. `npm run test:evals` is the separate behavioural
baseline for the reference Agent, which grades what an Agent configuration accomplished rather than
whether the runtime preserved its boundaries; the two answer different questions and stay separate.

The default tests and examples are offline. Copy [`.env.example`](.env.example) to `.env` only for optional live provider examples.

## Architecture documentation

Start with [`docs/README.md`](docs/README.md), which owns the document map and the ownership rules. The recommended reading order is:

1. [`docs/mental-model.md`](docs/mental-model.md) — canonical conceptual model.
2. [`docs/execution-runtime.md`](docs/execution-runtime.md) — Execution, Harness, lifecycle, Events/Effects, waiting/resumption, scheduling, cancellation, and durability.
3. [`docs/composition.md`](docs/composition.md) — Agent/Workflow composition: local computation vs child Executions, Stages, parallel branches, spawn/call/send/ask, Adapters, and Skills.
4. [`docs/authority.md`](docs/authority.md) — authority, delegation, Catalog → Effective Authority → Active View → Model Projection, confirmation, and evidence.
5. [`docs/memory.md`](docs/memory.md) — memory forms and scopes, provenance, promotion, retrieval, and context compilation.
6. [`docs/interoperability.md`](docs/interoperability.md) — portable service-interface semantics and protocol mappings, with MCP as a first-class interoperability target.
7. [`docs/security-guarantees.md`](docs/security-guarantees.md) — kernel and deployment security guarantees.
8. [`docs/future-plan.md`](docs/future-plan.md) — open questions and future experiments.

Implementation plans, slice decisions, and reviews live under [`docs/development/`](docs/development/); they record work in progress and never override the canonical documents. [`docs/architecture-research-dossier.md`](docs/architecture-research-dossier.md) is retained research evidence and is explicitly not canonical.

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

ArrokothI distinguishes retained information from current model context.

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

### Interoperability

ArrokothI deliberately separates kernel semantics from portable service-interface semantics and protocol bindings:

```text
ArrokothI kernel
  Execution / Event / Effect / authority / memory / lifecycle
        ↓
portable interoperability surface
  operations / resources / interaction templates /
  async handles / input requirements / change signals
        ↓
MCP / HTTP+OpenAPI / local SDK / future protocols
```

MCP is a **first-class compatibility target and design reference**, not the owner of ArrokothI kernel semantics.

This means an ArrokothI capability, Agent, Workflow, resource, or interaction template can eventually be projected into MCP or another service protocol, while an imported MCP service can be adapted into ArrokothI portable descriptors and Effects.

The critical distinction is:

```text
Effect            ≠ protocol operation
Event             ≠ protocol notification
Execution         ≠ external task/job handle
protocol exposure ≠ authority grant
```

The kernel remains protocol-independent so a maturing MCP or future protocol can improve the appropriate ArrokothI abstraction without forcing wire-level concepts into core semantic contracts. See [`docs/interoperability.md`](docs/interoperability.md).

## Current implementation

The merged post-Slice-G kernel implements the execution, authority/exposure, Agent, Workflow,
recursive composition, interaction, three-form memory, optimistic conflict, and structured-parallel
baselines summarized in
[`docs/development/002-implemented-kernel-baseline.md`](docs/development/002-implemented-kernel-baseline.md).
The narrow MCP proof imports and exports synchronous Tools without moving protocol objects into core
semantics.

The current experimental project/package line is **ArrokothI agent-kernel 0.8.0**. This version does
not claim the former “v0.8 architecture-complete” release gate; portable service contracts,
expanded interoperability, progressive discovery, hosted isolation, durable restart, and integrated
release evidence remain. See
[`docs/development/001-current-status-and-roadmap.md`](docs/development/001-current-status-and-roadmap.md).

Older Session/Flow/AgentHarness surfaces remain for compatibility. New work should follow the active
documents rather than infer current architecture from those legacy class names. The current primary
Agent executor is Strands, while model inference remains behind a provider-neutral boundary.

## Commands

```bash
npm run example:minimal
npm run example:estate
npm run example:strands          # add -- --live for Gemini
npm run canary:gemini            # optional live provider check
npm run canary:workflow          # optional live 0.8.x Workflow scenario
npm run canary:mcp:gemini        # optional live Agent -> MCP Tool check
npm run studio
```

Cross-framework P01/P02 evaluation and retained historical evidence live in the standalone `ArrokothI/benchmark` repository. This repository owns ArrokothI framework code, examples, and architecture documentation.

## Repository layout

```text
packages/core/                kernel contracts/runtime and reference mechanisms
packages/agents/strands/      primary Strands Agent executor adapter
packages/models/gemini/       Gemini model-provider adapter
packages/retrieval/local/     local retrieval implementations behind the kernel's ports
packages/interoperability/mcp/  MCP protocol adapter; the only home of MCP SDK/wire types
packages/storage/sqlite/      SQLite persistence adapter
apps/studio/                  local development/inspection surface
examples/                     focused usage examples
docs/                         canonical architecture plus development plans and reviews
scripts/                      repository tooling/manual diagnostics
```

The intended dependency direction is:

```text
applications / presets
        ↓
implementation / protocol-adapter packages
        ↓
@arrokothi/core
```

Concrete Agent frameworks, model SDKs, retrieval frameworks, databases, tool transports, MCP SDKs, HTTP frameworks, and other protocol implementations may be first-class supported packages without defining kernel semantics.

## One-minute explanation

ArrokothI treats an Agent or Workflow as a potentially long-lived, addressable **Execution**. The Harness manages many Executions and owns operational concerns such as scheduling, authorization, waiting, routing, and recovery. Events are observations delivered into an Execution; Effects are requests to interact with capabilities, memory, users, or other Executions.

A Workflow uses system-defined semantic topology made from Stages. An Agent uses a model-directed semantic loop. Functions, LLM calls, and Adapters normally remain local computation inside those Executions rather than receiving independent runtime identity.

Outside the kernel, ArrokothI defines portable service/interface semantics that can be projected into MCP, HTTP/OpenAPI, SDK functions, model tool calling, and future protocols. This lets ArrokothI Agents and Workflows be packaged as services without making those protocols part of the kernel ontology.
