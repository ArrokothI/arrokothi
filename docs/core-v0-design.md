# Agent SDK — Core v0.3 Design

> Historical design record. The current execution architecture is documented in
> [the v0.35 migration guide](v0.35-migration.md) and [implementation report](final-report.md).

**Status:** implemented

**Date:** 2026-08-21

**Scope:** application control plane, iterative execution Harnesses, capability authority, Host Context observation, and web Knowledge

## 1. Thesis

```text
LLM proposes.
Runtime validates and authorizes.
Executor acts.
ToolResult is truth.
Session remembers.
```

v0.3 is an evolution of v0.2. Durable sessions, the pure ContextCompiler, local LangChain document
retrieval, deterministic record queries, Flow, PendingAction, provenance, idempotency, the Gemini
provider, and `TwoPassHarness` remain intact.

## 2. Three-layer architecture

```text
APPLICATION CONTROL PLANE

  AgentDefinition
  Durable Application Session
  Structured Memory / Working Notes
  Host Context
  Flow / Phase
  Instructions and deterministic Policies
  Knowledge definitions
  PendingAction / Action Ledger / Tool authority

                 ↓

EXECUTION HARNESS

  TwoPassHarness
  NativeAgentHarness
  ClaudeAgentHarness

                 ↓

MODELS / CAPABILITIES / INFRASTRUCTURE

  Gemini
  Claude Agent SDK
  LangChain document implementation
  WebSearchProvider
  APIs and Tool executors
```

Core contains the control plane and provider-neutral Harnesses. Gemini remains outside core as a
`ModelProvider`. Claude Agent SDK appears only in `providers/claude-agent`.

## 3. AgentHarness remains the stable seam

Harness means the execution environment around the model/planning/capability lifecycle. It owns:

- model execution and provider event translation;
- iterative delegation and observation delivery;
- runtime gates and limits;
- cancellation and temporary execution context;
- final, awaiting-confirmation, awaiting-user, limited, cancelled, and error outcomes.

The Agent Planner decides, “What should I do next?” The Harness manages, “How can that request be
safely authorized, executed, observed, and continued?”

## 4. Two complementary strategies

### TwoPassHarness

The v0.2 workflow strategy remains supported:

```text
PreflightPlan
  → validated initial retrieval
  → ContextCompiler
  → bounded response/reactive-tool loop
```

It is appropriate when the application wants bounded preplanning and predictable workflow-style
behavior. Existing public behavior and tests remain compatible.

### NativeAgentHarness

The provider-neutral iterative strategy uses the existing `ModelProvider`:

```text
PreflightPlan
  → compile current truth and current-Phase capabilities
  → one model call proposes delegations or final text
  → CapabilityGateway validates and executes
  → structured observations return to the same planner/responder stream
  → repeat
```

The inner loop does not require a separate planning call on every iteration. Gemini can drive this
path because it speaks only the neutral `ModelProvider` request/response contract.

### ClaudeAgentHarness

The optional adapter starts one fresh Claude Agent SDK `query()` per external user turn. It compiles
the current application truth once as starting control context and lets Claude maintain its internal
tool trajectory and compaction during that query.

It exposes only SDK-MCP custom tools backed by the current capability catalog. Built-in filesystem,
shell, Skill, and subagent tools are not enabled. `PreToolUse` calls the same core gateway. Runtime
confirmation produces durable `PendingAction` before returning Claude's `defer` decision. Any
speculative wrap-up text following a deferred call is ignored; the runtime confirmation prompt wins.

v0.3 supports only:

```text
executionContextPolicy = fresh_each_turn
```

Cross-user-turn Claude resume is a v0.4 hypothesis.

## 5. PreflightPlan is not the autonomous plan

The v0.2 `TurnPlan` shape is now documented as `PreflightPlan`; `TurnPlan` remains a type alias for
source compatibility. It may propose:

- facts explicitly established by the latest user message;
- non-authoritative Working Notes;
- macro semantic routing signals;
- optional initial document, record, or web retrieval.

It establishes application state before execution. It does not predict the full future capability
trajectory. The iterative Agent Planner can request evidence not present in PreflightPlan and can
make multiple Knowledge decisions after observing earlier results.

## 6. Capability catalog and shared gateway

The implemented product categories are intentionally small:

```text
Knowledge
  document search
  deterministic record query
  web search
  existing read Tool

Action
  write Tool
  external-side-effect Tool
```

Model protocol details do not dictate product taxonomy. Web search and database/CRM lookups may be
technically represented as tools while remaining product-classified as Knowledge.

`CapabilityGateway` is the reusable authority seam used by TwoPass, Native, and Claude execution.
It validates:

- current Phase and binding scope;
- source existence and kind;
- typed record queries and result limits;
- web implementation availability and fixed domain policy;
- Tool schemas and argument provenance;
- confirmation and frozen payload identity;
- idempotency and executor presence;
- per-turn Knowledge, Action, and Tool budgets.

There is no duplicate Claude authorization policy.

## 7. Flow is the macro capability envelope

Flow remains a small coarse Phase model, not a general graph framework.

```text
Flow / Phase = macro structure and allowed capability envelope
Agent Planner = micro semantic decisions within that envelope
```

The catalog is rebuilt at every Native iteration. The gateway also checks current scope on every
request, so a stale or fabricated capability name cannot bypass a Phase transition. A phase may
allow Knowledge and expose zero Actions.

Pre-response and action-result transitions remain deterministic and evented.

## 8. Parallelism

When one Native iteration requests multiple provider-classified document, record, or web Knowledge
operations, the Harness starts bounded batches concurrently up to `maxParallelReadCalls`.

Existing read Tools are kept sequential in v0.3, as are all write and external-side-effect Tools.
Consequential calls never run concurrently merely because one model response contains several.

## 9. Knowledge

### Documents

The v0.2 implementation is unchanged:

```text
DocumentSource.text
  → LangChain Document
  → RecursiveCharacterTextSplitter
  → LocalLexicalLangChainRetriever
  → SDK KnowledgeChunk[]
```

There are no embeddings or vector database requirements.

### Record sets

Typed filters, numeric comparisons, sorting, limits, and counts remain deterministic. Unknown
fields and invalid operators fail explicitly; no SQL is generated.

### Web Search

`WebSearchProvider.search()` is injected into `KnowledgeIndex`. A configured web source without an
implementation produces the explicit `web_search_unavailable` rejection. Tests use fakes and never
depend on the network.

Company-site Knowledge uses the same source kind:

```ts
{
  id: "company_site",
  kind: "web_search",
  allowedDomains: ["example.com"]
}
```

The model does not supply or widen those domains; source configuration is passed to the provider.
Claude uses the controlled custom-tool bridge, preserving Phase, audit, and domain semantics rather
than exposing unrestricted built-in WebSearch.

## 10. Host Context observation

`AgentRuntime.observeHostContext()`:

1. loads the session;
2. validates the input against `HostContextSchema`;
3. appends `HostContextObserved`;
4. updates the projection/snapshot;
5. persists and returns state/observation/events.

It appends no user or assistant message, does not invoke a Harness, and makes no model call.
Out-of-band turn-lifecycle observations are tagged for the next external user turn, enabling:

```text
host observes selected_product_id=b
  → no model call
later user says "How much is this one?"
  → compiled context sees b
```

Context observation never proactively triggers an agent run.

Recommended product trust boundary:

```text
browser/UI observation
  → authenticated host backend or future Agent API
  → Host Context validation
  → compiler/runtime
```

Page, tab, selection, and form-step observations may originate in the UI. Identity, account,
permissions, subscription, and CRM identifiers should normally come from authenticated backend
state. A raw browser-provided user ID is not authoritative identity merely because it arrived as
Host Context.

## 11. Durable session versus execution context

Durable Application Session is authoritative and reconstructable:

- Structured Memory and Working Notes;
- Host Context;
- Phase;
- PendingAction;
- Action Ledger;
- authoritative ToolResults;
- append-only events.

Execution Context is temporary:

- model messages and capability observations;
- temporary reasoning trajectory;
- provider streaming state;
- within-query compaction.

Claude's transcript or Native model history can assist execution but never becomes the sole source
of application truth. `resume(snapshot, laterEvents) === project(allEvents)` remains required.

## 12. Instructions versus Policies

Instructions are semantic behavior communicated to a model: professionalism, response style, or
source preferences. Policies are mechanically enforceable: Phase scope, schemas, maximum calls,
confirmation, provenance, and idempotency.

Legacy `AgentRule` behavior remains compatible. Invariant/default text is still compiled to model
context. A prompt invariant is not automatically a deterministic runtime invariant. v0.3 adds no
LLM rule judge.

## 13. Events and limits

The agentic trace adds:

- `AgentIterationStarted` / `AgentIterationCompleted`;
- `DelegationRequested` / `DelegationRejected` / `DelegationCompleted`.

Existing Knowledge and Tool events remain authoritative. Events contain structured requests,
results, provider metadata, Phase, and runtime decisions—never hidden chain-of-thought.

New deterministic policies are:

| Policy | Default |
| --- | ---: |
| `maxAgentIterations` | 8 |
| `maxKnowledgeCallsPerTurn` | 12 |
| `maxActionRequestsPerTurn` | 4 |
| `maxParallelReadCalls` | 4 |

Existing `maxSteps`, `maxToolCallsPerTurn`, retrieval, row/chunk, and character budgets remain.

## 14. Explicitly deferred to v0.4

Skills, SKILL.md generation/adapters, automatic Skill learning, subagents, agent teams,
multi-agent orchestration, phase Skill/subagent scope, Claude execution-session resume across
external turns, phase-specific Harness switching, visual Flow graphs, MCP integration, semantic
rule judge, proactive Host Context triggers, browser SDK, production public context API, and
generic website crawling are not implemented in v0.3.
