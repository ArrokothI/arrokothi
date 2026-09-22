# ArrokothI

Current repository: [ArrokothI/arrokothi](https://github.com/ArrokothI/arrokothi). Historical
`agent-kernel`/`Agent_SDK` locators and commit identities are preserved; the repository rename does
not change package names, versions or the local checkout directory.

ArrokothI is a provider-neutral **execution kernel** for long-lived Agent and Workflow runs.

The target Kernel manages a logical **Execution**—identity, lifecycle, Events, governed Effects, authority, communication, history, and recovery—while treating the code that performs the work as an opaque **Execution Runtime** behind an asynchronous Activation/Outcome protocol.

An Execution Runtime may be ArrokothI-native or provided by Hermes, OpenClaw, Dify, CrewAI, or another system.

## Architecture

Start with [the mental model](mental-model/README.md). It explains the main interactions
and logical/physical distinction, then leads to Kernel, Runtime, Driver and Deployment.
Use [the reference index](mental-model/reference.md) for precise vocabulary and mechanisms,
and [the roadmap mapping](mental-model/roadmap.md) for expected documentation maintenance.
[Development](docs/development/README.md) records actual implementation and acceptance.

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
| `mental-model` | Progressive architecture, canonical terms and precise mechanisms |
| `docs/development` | Implemented baseline, roadmap/evidence, migration status |
| `tests/fixtures/k0` | Sealed protocol evidence needed by ordinary conformance |
| `tests/archive` | Explicit checks for retrieved historical evidence |

The private `packages/kernel` implements creation, ingress, reservation and asynchronous dispatch;
Outcome acceptance and later boundaries remain unimplemented. The SDK still uses the legacy core.
See the [status ledger](docs/development/007-work-packets.md) for acceptance/release and the
[archive index](docs/development/archive.md) for retired documents and implementation evidence.

The target dependency direction is application/SDK → Kernel + Execution Drivers → Execution Runtimes/providers. Provider-specific concepts should not become Kernel semantics merely because one integration exposes them.
