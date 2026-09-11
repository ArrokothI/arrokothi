# ArrokothI

Current repository: [ArrokothI/arrokothi](https://github.com/ArrokothI/arrokothi). Historical
`agent-kernel`/`Agent_SDK` locators and commit identities are preserved; the repository rename does
not change package names, versions or the local checkout directory.

ArrokothI is a provider-neutral **execution kernel** for long-lived Agent and Workflow runs.

The target Kernel manages a logical **Execution**—identity, lifecycle, Events, governed Effects, authority, communication, history, and recovery—while treating the code that performs the work as an opaque **Execution Runtime** behind an asynchronous Activation/Outcome protocol.

An Execution Runtime may be ArrokothI-native or provided by Hermes, OpenClaw, Dify, CrewAI, or another system.

## Architecture

Start with [`docs/mental-model.md`](docs/mental-model.md).

| Document | Purpose |
|---|---|
| [`docs/kernel.md`](docs/kernel.md) | Kernel-owned Execution semantics |
| [`docs/execution.md`](docs/execution.md) | Agent/Workflow and provider Runtime/Driver semantics |
| [`docs/deployment.md`](docs/deployment.md) | Embedding, processes, trust/isolation, MCP/protocol placement |
| [`docs/detail-design/`](docs/detail-design/) | Protocol, actions, recovery, Runtime, resource and evidence design |
| [`docs/development/`](docs/development/README.md) | Current implementation and migration evidence |


## Core boundary

```text
Kernel
  │
  │ ExecutionActivation
  ▼
Execution Driver
  ▼
Execution Runtime
  │
  │ ExecutionOutcome
  ▼
Kernel
```

The Runtime owns reasoning, graph traversal, model calls, context, native memory, tools, and internal asynchronous work. The Kernel owns whether an Outcome is accepted and what it means operationally.

One Execution has at most one current Activation authorized to commit progress; different Executions may compute concurrently.

## Trust

There are two primary execution trust modes:

- **Trusted Execution** — Runtime may intentionally use ambient filesystem/network/process capabilities; Kernel guarantees apply to Kernel-mediated paths.
- **Isolated Execution** — Runtime runs behind a physical isolation boundary appropriate to the deployment claim.

Kernel authority does not magically contain arbitrary trusted code. Strong prevention requires Kernel mediation or isolation.

## Current implementation

The repository is migrating from the previous 0.8.x architecture. Current code still uses the concrete name `Harness`, synchronously awaits `ExecutionController.activate(...)`, and uses `ControllerResumption` for slow controller-local work. Those are implemented-baseline facts, not the target Kernel boundary.

The implemented [`@arrokothi/sdk`](packages/sdk/README.md), examples, and conformance tests remain useful while migration proceeds. The [active roadmap](docs/development/001-current-status-and-roadmap.md) begins with deterministic protocol fixtures; no foreign Runtime Driver or production recovery is implied by the target diagram.

From this checkout, with Node 22.9+:

```sh
npm install
npm test
npm run typecheck
npm run test:conformance
npm run test:sdk
```

For implementation guidance, start at the [Kernel, Execution and Deployment guides](docs/guides/README.md). For architecture work, use [`docs/README.md`](docs/README.md) instead.

## Repository layout

| Directory | Role |
|---|---|
| `packages/core` | Current Kernel + legacy Agent/Workflow implementation while migration is in progress |
| `packages/sdk` | Current application bootstrap/control surface |
| `packages/agents/*` | Provider/native Agent integration packages |
| `packages/interoperability/*` | Protocol boundary packages such as MCP |
| `tests/conformance` | Semantic and boundary tests |
| `docs/detail-design` | Current detailed designs below the canonical architecture |
| `docs/development` | Implemented baseline, roadmap/evidence, migration status |
| `docs/architecture-strategy-study` | Comparative architecture diagnosis that informed the redesign |

The [structure/evidence assessment](docs/development/013-structure-and-evidence-sequencing.md)
plans K1.0 boundary preparation after K0.2, before K1.1; no structural migration is implemented or
released by that plan. Current layout above remains the implemented layout.

The target dependency direction is application/SDK → Kernel + Execution Drivers → Execution Runtimes/providers. Provider-specific concepts should not become Kernel semantics merely because one integration exposes them.
