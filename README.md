# Arrokoth Agent Kernel

A provider-neutral execution kernel for building long-lived Agents and Workflows with bounded authority, durable state, explicit memory, and composable communication.

> **Executions receive Events and request Effects. Workflows let the system choose what happens next; Agents let the model choose.**

## Install and verify

Node 22.9 or newer is required.

```bash
npm install
npm test
npm run typecheck
```

The default tests and examples are offline. Copy [`.env.example`](.env.example) to `.env` only for optional live provider examples.

## Mental model

The canonical architecture is documented in:

- [`docs/mental-model-v0.4.md`](docs/mental-model-v0.4.md) — the semantic model;
- [`docs/mental-model-to-implementation-model.md`](docs/mental-model-to-implementation-model.md) — how those semantics map to runtime components;
- [`docs/future-plan.md`](docs/future-plan.md) — migration and roadmap;
- [`docs/repository-structure-plan.md`](docs/repository-structure-plan.md) — package/repository ownership.

The core idea is:

```text
ExecutableDefinition
        │ instantiate
        ▼
Execution
├── lifecycle / Activation
├── mailbox / Events
├── EffectRequests
├── Authority Envelope
├── Active Capability View
├── Memory Bindings
├── ownership
└── communication routes
```

An Execution may be a finite LLM/function call, or a long-lived Agent/Workflow that waits and wakes for future Events.

```text
Event
  ↓
Execution controller
  ↓
EffectRequest
  ↓
Runtime / Harness
  ↓
capability, memory, another Execution, or environment
  ↓
Event
```

The runtime validates authority, persistence, idempotency, lifecycle, and routing. The controller owns semantic work appropriate to its kind.

### Workflow vs Agent

```text
Workflow
  system/application owns the allowed semantic topology

Agent
  model chooses the semantic next action inside hard runtime limits
```

Both use the same execution substrate.

### Ownership vs communication

An Execution may create/own another Execution, but communication is a separate graph.

```text
Ownership
  Workflow W
   ├── Agent A
   ├── Agent B
   └── Agent C

Communication
  A ↔ B ↔ C ↔ A
```

This allows independent-context Agents to discuss, critique, or query each other without sharing their full context or memory.

### Authority and exposure

```text
Capability Catalog
        ↓
Authority Envelope
        ↓
Active Capability View
```

The Authority Envelope is the immutable maximum authority of an Execution. The Active Capability View is the smaller dynamic set currently exposed to its controller/model.

Changing exposure inside existing authority is context engineering, not privilege escalation.

## Current implementation

The repository is in transition from the earlier Agent SDK architecture toward the canonical Execution/Event/Effect model.

Existing implementation pieces such as `AgentRuntime`, `AgentHarness`, `AgentLoopEngine`, `CapabilityGateway`, structured memory, Working Notes, context compilation, durability, and provider boundaries are being preserved where their responsibilities still match the target model.

Some older concepts remain in code for compatibility, especially semantic Preflight, Flow/Phase behavior, and the historical `AgentHarness` workflow strategy. They should not be treated as the long-term semantic definition of Agent or Workflow. See [`docs/future-plan.md`](docs/future-plan.md) for the migration path.

The current primary Agent executor is Strands, while model inference remains behind a separate provider-neutral `ModelProvider` boundary.

## Commands

```bash
npm run example:minimal
npm run example:estate
npm run example:strands          # add -- --live for Gemini
npm run canary:gemini            # optional live provider check
npm run studio
```

Cross-framework P01/P02 evaluation and retained historical evidence live in the standalone `ArrokothI/benchmark` repository. This repository owns Arrokoth framework code, examples, and architecture documentation.

## Repository layout

```text
packages/core/                kernel contracts/runtime and reference mechanisms
packages/agents/strands/      primary Strands Agent executor adapter
packages/models/gemini/       Gemini ModelProvider adapter
packages/storage/sqlite/      SQLite persistence adapter
apps/studio/                  local development/inspection surface
examples/                     focused usage examples
docs/                         mental model, implementation guide, roadmap, structure
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

Arrokoth treats an Agent or Workflow as a potentially long-lived, addressable Execution rather than only as a function call. Each Execution has private state, a mailbox, bounded authority, memory bindings, and a lifecycle. Events come in; Effects go out through a runtime that validates permissions and records what actually happened. Executions can use tools and knowledge, create other Executions, message authorized peers, update memory, finish, or wait and wake indefinitely.

Workflow and Agent are peers over this same substrate. The only fundamental control-flow distinction is who chooses the semantic next step: the system for a Workflow, the model for an Agent.
