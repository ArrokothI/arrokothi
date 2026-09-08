# AGENTS.md — ArrokothI repository instructions

ArrokothI is a provider-neutral **execution kernel**. The Kernel manages logical Executions; Agent and Workflow implementations are Execution Runtimes behind an asynchronous Activation/Outcome boundary.

## Architecture first

`docs/README.md` is the canonical map. Read [`docs/mental-model.md`](docs/mental-model.md) first.

Current architecture has three detailed owners:

- [`docs/kernel.md`](docs/kernel.md) — Execution identity/lifecycle, Activation/Outcome protocol, Events, Effects, authority, scheduling, communication, history, recovery;
- [`docs/execution.md`](docs/execution.md) — Execution Runtime/Driver, Agent, Workflow, context/native memory/tools, internal async work, provider runtimes;
- [`docs/deployment.md`](docs/deployment.md) — process topology, Kernel Workers, Execution Hosts, trusted vs isolated execution, embedding, CLI/service/MCP placement, observability.

[`docs/detail-design/`](docs/detail-design/) expands current authority/action, memory/state, composition/communication, and interoperability design without creating extra top-level architecture owners. Read the relevant detail page when implementing one of those topics.

`docs/mental-model-legacy/` preserves the previous architecture. Old root architecture files such as `docs/authority.md` and `docs/execution-runtime.md` were removed; use the legacy directory for historical comparison.

`docs/development/` describes current implementation and migration work. It does not override architecture. The current 0.8.x code still contains the previous `Harness`, synchronous `ExecutionController.activate(...)`, and `ControllerResumption` design; do not infer the target architecture from those implementation names.

## Boundary to protect

The central rule is:

> **Kernel owns execution. Execution Runtime owns how the work is done.**

Kernel code should not need to understand model loops, graph nodes, context compaction, native memory, or provider checkpoints. Those belong behind an `Execution Driver` unless Kernel correctness genuinely depends on their contract.

The target protocol is conceptually:

```text
Kernel -> ExecutionActivation -> Execution Runtime
Kernel <- ExecutionOutcome    <- Execution Runtime
```

An Activation is asynchronous. Slow model/provider/local work stays inside the Runtime. `WAITING` means an accepted Outcome declared a Kernel-visible dependency; it does not mean the Runtime happens to be waiting on an internal promise.

One Execution has at most one current Activation authorized to commit progress. Kernel fencing does not by itself prevent stale native-session mutation; Drivers must prove safe takeover or refuse it. Different Executions may compute concurrently.

## Security and trust

Use two execution trust modes:

- **Trusted Execution** — Runtime may intentionally use ambient host filesystem/network/process capabilities. Kernel guarantees apply to Kernel-mediated paths.
- **Isolated Execution** — Runtime is physically contained according to the deployment claim.

Do not claim that Kernel authority prevents ambient native actions. Prevention requires Kernel mediation or isolation. Telemetry/observation is not enforcement.

## Application development

The current SDK/guides/examples describe the implemented 0.8.x surface and remain useful while migration is in progress. Start application work from [`docs/guides/agent-workflow-composition/README.md`](docs/guides/agent-workflow-composition/README.md) and [`@arrokothi/sdk`](packages/sdk/README.md), but distinguish current API behavior from target architecture when discussing Kernel internals.

For provider integrations, prefer a narrow `Execution Driver` that preserves the provider's native runtime. Do not translate an entire Hermes/OpenClaw/Dify/CrewAI runtime into Kernel concepts unless a demonstrated Kernel guarantee requires it.

## Before an architecture change

1. Read `docs/mental-model.md` and the one canonical owner for the concept.
2. If the task involves authority, memory/state, composition, or interoperability, read the corresponding `docs/detail-design/` page.
3. Read `docs/development/002-implemented-kernel-baseline.md` and the development front door to understand current code/migration status.
4. Inspect affected implementation and conformance tests.
5. State whether the change belongs to Kernel, Execution Runtime/Driver, or deployment.
6. Prefer subtraction: if Kernel correctness does not depend on knowing a concept exists, keep it on the Execution side.
7. Keep provider/protocol types out of Kernel semantics unless multiple real consumers prove a portable contract is needed.
8. Update architecture/detail docs, migration notes, code, and tests together when semantics actually move.

## Benchmark attribution

Keep these failure domains separate:

- Kernel correctness;
- Agent Runtime quality;
- Workflow Runtime quality;
- Driver/integration fidelity;
- isolation/containment.

Kernel conformance should use deterministic fake Execution Runtimes where possible. Behavioral Agent/Workflow benchmarks should hold the Kernel fixed.

## Commands

Node 22.9+.

```bash
npm install
npm test
npm run typecheck
npm run test:conformance
npm run test:sdk
npm run check:builder-docs
npm run test:evals
```

Current tests largely exercise the implemented 0.8.x architecture. During migration, preserve useful behavior while replacing tests that pin intentionally retired Kernel concepts such as controller-local resumptions.

## Repository skills

`.agents/skills/` contains coding-agent workflow skills. They are not ArrokothI runtime Skills. Use `arrokothi-architecture` for Kernel/Execution/deployment semantic changes and provider-integration guidance for Driver-only work.
