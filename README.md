# Agent SDK

A provider-neutral agent control plane with one public external-turn coordinator: `AgentHarness`.

> Models propose. The runtime authorizes. Executors act. Durable events are truth.

## Install and verify

Node 22.9 or newer is required.

```bash
npm install
npm test
npm run typecheck
```

The default tests and examples are offline. Copy [`.env.example`](.env.example) to `.env` only for
the optional Gemini canary or live Strands example.

## Current architecture

`AgentDefinition` describes model policy, memory, host context, knowledge, tools, deterministic
policies, and optional phases. `AgentRuntime` binds that definition to injected stores, providers,
executors, and an `AgentHarness`.

`AgentHarness` supports two explicit strategies:

- `agentic`: a semantic preflight followed by an injected `AgentLoopEngine`. The canonical
  production engine is `StrandsLoopEngine`; `ReferenceLoopEngine` is the deterministic offline
  implementation used by tests and local fallback paths.
- `workflow`: a bounded preflight/retrieval/response flow for applications that do not need an
  iterative inner loop.

Every capability request crosses `CapabilityGateway`, where scope, limits, confirmation,
idempotency, and consequential-action durability are enforced. See
[architecture](docs/architecture.md) and [durability](docs/durability.md).

```ts
const runtime = new AgentRuntime({
  definition,
  sessions,
  model,
  tools,
  knowledge,
  harness: new AgentHarness({
    strategy: "agentic",
    engine: createStrandsGeminiEngine({ apiKey: process.env.GEMINI_API_KEY }),
  }),
});
```

## Commands

```bash
npm run example:minimal
npm run example:estate
npm run example:strands          # add -- --live for Gemini
npm run canary:gemini            # optional live provider check
npm run studio
```

Cross-framework P01/P02 evaluation and retained historical evidence now live in the standalone
`ArrokothI/benchmark` repository. This repository owns only ArrokothI framework code and examples.

## Repository layout

```text
packages/core/                control plane, durable runtime, public AgentHarness
packages/agents/strands/      canonical production AgentLoopEngine
packages/models/gemini/       Gemini ModelProvider adapter
packages/storage/sqlite/      SQLite SessionStore / DefinitionStore adapter
apps/studio/                  local development surface
examples/                     minimal, workflow, and Strands examples
docs/                         current architecture and durability contracts
scripts/                      repository tooling and manual diagnostics
```
