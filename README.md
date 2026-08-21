# Agent SDK v0.35

A provider-neutral agent control plane with one primary external-turn Harness and a canonical
Strands execution engine.

> Models plan. Runtime authorizes. Executors act. ToolResult is truth. Durable Session remembers.

Agent_SDK owns the meaning of the agent: `AgentDefinition`, Durable Session, Structured Memory,
Host Context, Flow, Knowledge, Tools, confirmation, idempotency, and audit events. A narrow
`AgentLoopEngine` seam delegates temporary inner-loop mechanics. The canonical agentic engine is
`StrandsLoopEngine` in `@agent-sdk/integration-strands`; no Strands type appears in core's public
contracts.

## Install and verify

Node 22.6 or newer is required.

```bash
npm install
npm test
npm run typecheck
npm run example:strands
npm run example:p01
npm run example:p02
npm run studio
```

All default examples and tests are offline. The optional live Strands/Gemini example reads a key at
the application boundary:

```bash
GEMINI_API_KEY=... npm run example:strands -- --live
```

Credentials and provider objects are never serialized into `AgentDefinition`.

## Architecture

```text
APPLICATION CONTROL PLANE
  AgentDefinition · Durable Session · Memory · Host Context · Flow
  Knowledge · CapabilityGateway · Tool authority · PendingAction

PRIMARY EXTERNAL-TURN COORDINATOR
  AgentHarness
    semantic Preflight when structurally needed
    current-state context compilation
    pending-confirmation resolution
    metrics and durable trace projection

INNER-LOOP EXECUTION
  AgentLoopEngine (provider-neutral core contract)
    StrandsLoopEngine (canonical agentic implementation)
    ReferenceLoopEngine (small deterministic/offline implementation)

MODELS / INFRASTRUCTURE
  Strands GoogleModel / Gemini · other adapters · stores · executors
```

Construct the primary path explicitly:

```ts
const runtime = new AgentRuntime({
  definition,
  sessions,
  model: preflightModel,
  tools,
  knowledge,
  harness: new AgentHarness({
    engine: createStrandsGeminiEngine({ apiKey: process.env.GEMINI_API_KEY }),
  }),
});
```

`AgentRuntime` defaults to `new AgentHarness({ strategy: "workflow" })` for bounded compatibility.
Use `strategy: "agentic"` plus an engine for the consolidated agent loop.

## Preflight and the loop

Preflight is semantic state synchronization only: user-established Memory proposals, ephemeral
Working Notes, and coarse Flow signals. It does not pre-plan retrieval, tools, or the future
capability trajectory in agentic mode. It is skipped only when definition structure proves that no
memory, note, signal, or compatibility-retrieval output is possible; no keyword or regex heuristic
is used.

The inner loop receives a compiled, current-state context and a dynamic capability catalog. Every
capability request still passes through `CapabilityGateway`. Strands interventions adapt
Agent_SDK's provider-neutral decisions—Proceed, Deny, Guide, Confirm, and Transform—without owning
business authority. A Transform is revalidated and, when consequential, reconfirmed against the
new frozen payload.

Strands `InvocationState` is ephemeral per external turn. It may carry request IDs, counters,
restricted runtime context, and adapter caches out of band; it never replaces Durable Session or
becomes model-visible. `SummarizingConversationManager` reduces only the temporary loop history,
while `ContextCompiler` remains responsible for authoritative application context.

## Standalone P01 and P02 builds

- `examples/p01-craig` is a fresh Craig Hempcrete Agent_SDK build with structured project memory,
  authoritative product/code Knowledge, and deterministic wall-volume calculation.
- `examples/p02-estate` is a fresh EstatePro Agent_SDK build with the exact property/room catalog,
  deterministic record queries, coarse Flow, and one frozen-payload confirmation-gated handoff.

They use only Agent_SDK concepts and injected executors; no bespoke runtime code from either
reference application is imported. Benchmark history remains in `benchmarks/`, but v0.35 does not
claim or perform a new cross-builder comparison.

## Compatibility paths

`TwoPassHarness`, `NativeAgentHarness`, and `ClaudeAgentHarness` remain temporarily available for
regression/reference use. They are not the canonical v0.35 architecture. New applications should
use `AgentHarness`; agentic applications should inject `StrandsLoopEngine`.

## Repository layout

```text
core/                         Agent_SDK control plane and engine-neutral contracts
integrations/strands/         canonical Strands loop implementation
providers/gemini/             legacy/provider-neutral ModelProvider adapter
providers/claude-agent/       retained experimental compatibility adapter
apps/studio/                  minimal development Studio
examples/strands-gemini/      offline proof and optional live Gemini command
examples/p01-craig/           standalone P01 build
examples/p02-estate/          standalone P02 build
benchmarks/                   preserved historical self-checks/results
docs/                         migration, roadmap, and architecture report
```

See [v0.35 migration](docs/v0.35-migration.md), [the implementation report](docs/final-report.md),
and [the v0.4 roadmap](docs/v0.4-roadmap.md). Earlier v0.2/v0.3 documents remain historical.
