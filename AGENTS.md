# AGENTS.md — ArrokothI repository instructions

ArrokothI is a provider-neutral **execution kernel**. The Kernel manages logical Executions; Agent and Workflow implementations are Execution Runtimes behind an asynchronous Activation/Outcome boundary.

## Architecture first

`docs/README.md` is the canonical map. Read [`docs/mental-model.md`](docs/mental-model.md) first.

Current architecture has three detailed owners:

- [`docs/kernel.md`](docs/kernel.md) — Execution identity/lifecycle, Activation/Outcome protocol, Events, Effects, authority, scheduling, communication, history, recovery;
- [`docs/execution.md`](docs/execution.md) — Execution Runtime/Driver, Agent, Workflow, context/native memory/tools, internal async work, provider runtimes;
- [`docs/deployment.md`](docs/deployment.md) — process topology, Kernel Workers, Execution Hosts, trusted vs isolated execution, embedding, CLI/service/MCP placement, observability.

[`docs/detail-design/`](docs/detail-design/) is the implementation-oriented design map beneath those
three owners. It routes protocol, authority/consent, action lifecycle/delivery, recovery/compatibility,
children/communication, Runtime composition, state/memory, context/projections, Driver fidelity,
interoperability, resource lifetime/isolation and evidence. Read the relevant page before implementing
its contract. Optional Runtime designs are not mandatory Kernel types or automatic release commitments.

The legacy mental-model directory has been removed. Use current detail design and the legacy
knowledge disposition in `docs/development/005-detail-design-review.md`; use Git history only for
historical comparison. Do not recreate old architecture aliases or depend on removed files.

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

The current SDK/guides/examples describe the implemented 0.8.x surface and remain useful while migration is in progress. Start application work from [the guide map](docs/guides/README.md) and [`@arrokothi/sdk`](packages/sdk/README.md), but distinguish current API behavior from target architecture when discussing Kernel internals.

For provider integrations, prefer a narrow `Execution Driver` that preserves the provider's native runtime. Do not translate an entire Hermes/OpenClaw/Dify/CrewAI runtime into Kernel concepts unless a demonstrated Kernel guarantee requires it.

## Before an architecture change

1. Read `docs/mental-model.md` and the one canonical owner for the concept.
2. Use `docs/detail-design/README.md` to read the relevant protocol, action, recovery, Runtime, resource or evidence design and its counterexamples.
3. Read `docs/development/002-implemented-kernel-baseline.md` and the development front door to understand current code/migration status.
4. Inspect affected implementation and conformance tests.
5. State whether the change belongs to Kernel, Execution Runtime/Driver, or deployment.
6. Keep ownership precise: if Kernel correctness does not depend on a concept, keep it on the Execution side. Preserve useful deeper design in detail pages; introduce richer contracts when concrete correctness obligations justify them.
7. Keep provider/protocol types out of Kernel semantics unless multiple real consumers prove a portable contract is needed.
8. When implementing semantic changes, update architecture/detail docs, migration notes, code, and tests together. A documentation-only redesign must state the target/implementation gap and assign acceptance tests to roadmap slices; it must not imply that the new behavior shipped.

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

## Third-party code and license review

For every implementation change, distinguish learning from prior art, using a dependency/service,
and copying or adapting source. A documentation reference or reuse recommendation is not license
clearance. Apply this to code, tests, scripts, assets and bundled dependencies from all providers.

Before incorporating third-party material, inspect the exact revision's LICENSE, NOTICE, file/module
headers and applicable dependency or service terms. Check compatibility with ArrokothI's intended
commercial use and distribution, including any non-commercial, source-available, copyleft, hosted-service
or multi-tenant restrictions. Do not infer permission from a public repository or a familiar license
name; different modules may have different terms.

Record the source/version, applicable terms, reuse method and required notices or other obligations
in the implementation/PR notes, and preserve required attribution. If compatibility is unclear or the
intended use is restricted, do not copy, adapt, vendor or add that dependency pending a resolved review
or appropriate license. Continue with an independently implemented contract or a compatible alternative
where possible. A service boundary or superficial rewrite does not automatically remove obligations.
Do not make unsupported legal-clearance claims; identify the specific unresolved terms when review is needed.

These instructions apply to Codex and Claude Code; `CLAUDE.md` imports this file.
