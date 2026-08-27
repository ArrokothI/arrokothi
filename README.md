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
the optional Gemini canary, live Strands example, benchmark generation, or benchmark judging.

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

npm run benchmark:test
npm run benchmark:evaluate       # offline, existing raw corpus
npm run benchmark:analyze        # offline, existing judged corpus
npm run benchmark:review         # regenerate readable conversations
```

The canonical benchmark report is
[`benchmarks/runs/v2-six-subject-run-1/RESULTS.md`](benchmarks/runs/v2-six-subject-run-1/RESULTS.md).
See [benchmarks](benchmarks/README.md) for generation and judge commands.

## Repository layout

```text
packages/core/                control plane, durable runtime, public AgentHarness
packages/agents/strands/      canonical production AgentLoopEngine
packages/models/gemini/       Gemini ModelProvider adapter
apps/studio/                  local development surface
examples/                     minimal, workflow, and Strands examples
benchmarks/six-subject/       current benchmark implementation
benchmarks/runs/              retained experiment evidence
docs/                         current architecture and durability contracts
scripts/                      repository tooling and manual diagnostics
```
