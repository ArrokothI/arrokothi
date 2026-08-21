# Agent SDK — experimental v0.3

A provider-neutral agent kernel, iterative execution Harnesses, and a small development Studio.

> LLM proposes. Runtime validates and authorizes. Executor acts. ToolResult is truth. Session remembers.

v0.3 evolves v0.2; it does not replace its workflow path. `TwoPassHarness` remains available for
bounded preplanning, while `NativeAgentHarness` adds an iterative observe/delegate/observe loop.
`ClaudeAgentHarness` is an optional package outside core.

## Install and run

Requires Node 22.6+.

```bash
npm install
npm test
npm run typecheck
npm run example:minimal
npm run example:estate
npm run example:native
npm run studio
```

`example:native` is an offline fixture that drives `GeminiProvider` through
`NativeAgentHarness` and local document Knowledge. It spends no quota.

The Studio uses an offline response provider unless `GEMINI_API_KEY` is set. Claude Agent mode is
available when `ANTHROPIC_API_KEY` is configured. An optional provider-neutral web endpoint can be
connected with `STUDIO_WEB_SEARCH_ENDPOINT`; automated tests never require network access.

## Three layers

```text
APPLICATION CONTROL PLANE
  AgentDefinition · Durable Session · Memory · Host Context
  Flow · Instructions/Policies · Knowledge definitions · Tool authority

EXECUTION HARNESS
  TwoPassHarness · NativeAgentHarness · ClaudeAgentHarness

MODELS / CAPABILITIES / INFRASTRUCTURE
  Gemini · Claude Agent SDK · LangChain documents · Web Search · APIs · Tools
```

`AgentHarness` is the stable execution seam. It manages model execution, iterative delegation,
runtime gates, result delivery, limits, cancellation, execution context, and final/blocked states.
The Agent Planner decides what to do next; the Harness safely lets it do that and continue.

### TwoPassHarness

The v0.2 strategy remains the default for compatibility:

```text
PreflightPlan → explicit initial retrieval → response/reactive-tool loop
```

It is useful for deterministic and workflow-oriented agents.

### NativeAgentHarness

The provider-neutral iterative strategy works with the existing `ModelProvider`, including Gemini:

```text
PreflightPlan
  → compile current control context
  → model decides delegation(s) or final text
  → CapabilityGateway validates current Phase, schemas, provenance, limits, and consent
  → executor/provider returns structured observation
  → model decides again
  → final / awaiting confirmation / limit / error / cancellation
```

Safe document, record, and web Knowledge calls from one iteration may run concurrently up to
`maxParallelReadCalls`. Existing read Tools and all actions remain conservative/sequential.

### ClaudeAgentHarness

`providers/claude-agent` imports `@anthropic-ai/claude-agent-sdk`; core never does. It creates a
fresh Claude query for each external user turn, exposes only runtime-scoped custom capabilities,
maps `maxAgentIterations` to Claude `maxTurns`, and bridges `PreToolUse` to the same
`CapabilityGateway`. A confirmation-required request persists our `PendingAction` and defers the
Claude tool. Cross-turn Claude transcript resume is intentionally deferred.

## Preflight versus Agent Planner

`PreflightPlan` is the v0.3 name for the v0.2 `TurnPlan` concept. `TurnPlan` remains a compatibility
alias. Preflight establishes application state before autonomous execution:

- user-fact memory proposals;
- working notes;
- macro routing signals;
- optional initial retrieval requests.

It is not the complete future capability trajectory. The Agent Planner is the model decision made
inside each iterative execution step. It may retrieve new evidence after observing earlier results.

## Capability and authority model

The internal catalog currently has two product categories:

- **Knowledge** — document search, deterministic record query, web search, and read-only Tools;
- **Action** — write and external-side-effect Tools.

Flow is the macro capability envelope; the Agent Planner has micro-autonomy only inside it. The
catalog is rebuilt from the current Phase and the gateway checks scope again on every request.

Tool authority remains centralized. Side-effect arguments require declared typed provenance,
idempotency is runtime-owned, and confirmation binds to one frozen payload. Neither a model nor a
Claude hook can bypass those checks.

## Knowledge

- Documents still use LangChain `RecursiveCharacterTextSplitter` plus local lexical retrieval.
- Record sets still use the SDK's typed deterministic query engine—never SQL generation.
- Web Search uses an injected `WebSearchProvider`; tests use deterministic fakes.
- Company website search is a `web_search` source with fixed `allowedDomains`.

Web Search is product-classified as Knowledge even when a model protocol represents it as a tool.
It does not require Anthropic.

## Host Context observation

`AgentRuntime.observeHostContext({ sessionId, hostContext })` validates, events, projects, and
persists context without a user message, Harness run, or model call. Studio exposes the same
development operation through `POST /api/sessions/:id/context`.

Recommended trust boundary:

```text
browser UI observation → authenticated host backend → Host Context → runtime/compiler
```

Navigation state such as current page or selected item may come from UI observations. Identity,
permissions, subscription, and business authorization should normally come from authenticated
backend state, not a raw browser-provided user ID. Observing context alone never triggers an agent.

## Durable session versus execution context

The durable application session is authoritative: memory, Host Context, Phase, PendingAction,
ledger, ToolResults, and events. Execution context is the temporary model/tool trajectory within a
Harness run. Claude may compact its internal query context, but that transcript never becomes the
sole application truth.

## Repository layout

```text
core/src/capabilities/     provider-neutral catalog + shared runtime gateway
core/src/harness/          TwoPassHarness + NativeAgentHarness
core/src/knowledge/        LangChain documents, record queries, WebSearchProvider seam
core/src/runtime/          turn orchestration + out-of-band Host Context observation
providers/gemini/          provider-neutral ModelProvider adapter
providers/claude-agent/    optional Claude Agent SDK Harness adapter
apps/studio/               SQLite development Studio and trace viewer
examples/                  workflow examples + offline Gemini/native example
docs/                      architecture, migration, and implementation report
```

See [the v0.3 design](docs/core-v0-design.md), [v0.3 migration notes](docs/v0.3-migration.md), and
[the implementation report](docs/final-report.md). The [v0.2 migration guide](docs/v0.2-migration.md)
remains as historical compatibility documentation.
