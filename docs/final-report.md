# Agent SDK v0.3 — Implementation Report

**Date:** 2026-08-21

**Status:** implemented

**Version:** 0.3.0

## Outcome

v0.3 preserves the v0.2 workflow path and adds a true iterative execution path:

```text
PreflightPlan
  → current-Phase capability catalog
  → planner/responder model
  → shared runtime CapabilityGateway
  → Knowledge or Tool observation
  → planner/responder model again
  → final / pending confirmation / deterministic stop
```

The architecture now has three execution Harnesses:

- `TwoPassHarness` — v0.2 bounded-preplanning/workflow strategy;
- `NativeAgentHarness` — provider-neutral iterative strategy, including Gemini;
- `ClaudeAgentHarness` — optional Claude Agent SDK adapter in `providers/claude-agent`.

## Core changes

### Iterative native execution

`NativeAgentHarness` performs one PreflightPlan, then repeated model decisions. It can request
document, record, web, and Tool capabilities that were not in the preflight retrieval list. The
same model stream plans and responds during the inner loop.

Document/record/web requests in one iteration execute in concurrent batches bounded by
`maxParallelReadCalls`. Existing read Tools and every Action execute sequentially.

### Shared capability authority

`CapabilityGateway` owns the common path for TwoPass, Native, and Claude requests. It validates
current Phase scope, source kind, schemas, typed authority, confirmation, idempotency, executor
availability, and deterministic budgets. Claude hooks are integration callbacks, not a second
policy system.

### Preflight terminology

The public `PreflightPlan` type describes the old `TurnPlan` shape. `TurnPlan` remains an alias.
Preflight establishes memory, Working Notes, macro signals, and optional initial retrieval; it does
not prescribe the full autonomous trajectory.

### Web Knowledge

`WebSearchProvider` is provider-neutral and injected into `KnowledgeIndex`. `web_search` sources can
fix allowed/blocked domains. Company website search is the same source kind with `allowedDomains`.
Missing search infrastructure rejects explicitly. Tests use fakes and perform no live network call.

The existing LangChain document implementation remains localized to
`core/src/knowledge/in-memory.ts`, still using `RecursiveCharacterTextSplitter` and local lexical
ranking. Record queries remain deterministic and outside LangChain.

### Host Context observation

`AgentRuntime.observeHostContext()` validates and persists `HostContextObserved` without a user
message, Harness execution, or assistant reply. Studio exposes a development context-only endpoint
and control. The next user turn sees the newest permitted context; restricted visibility still does
not leak to models.

### Claude adapter

`providers/claude-agent` depends on `@anthropic-ai/claude-agent-sdk` 0.2.141. It uses the current
`query()`, SDK-MCP tool, hook, `defer`, and `maxTurns` APIs. Each external user turn creates a fresh
query with built-in filesystem/Skill/subagent tools disabled. Custom capability calls pass through
core's gateway.

When confirmation is needed, the gateway first persists `PendingAction`, the PreToolUse bridge
returns `defer`, and the Harness surfaces only the runtime confirmation prompt. The next external
turn resolves and executes the frozen payload before a new Claude query. Claude resume is not used.

## Events and limits

Additive structured trace events are:

- `AgentIterationStarted` / `AgentIterationCompleted`;
- `DelegationRequested` / `DelegationRejected` / `DelegationCompleted`.

They store capability decisions, inputs, compact observations, current Phase, model metadata, and
runtime outcomes. No hidden chain-of-thought is persisted.

New defaults:

| Policy | Default |
| --- | ---: |
| `maxAgentIterations` | 8 |
| `maxKnowledgeCallsPerTurn` | 12 |
| `maxActionRequestsPerTurn` | 4 |
| `maxParallelReadCalls` | 4 |

Claude `maxTurns` is mapped from `maxAgentIterations`, while core counters remain authoritative.

## Studio and example

Studio adds Harness selection, agentic limits, Web Search/company-site source authoring, context-only
observation, and agent/delegation trace rendering. Claude mode is used when configured; web search
can be connected through an injected development endpoint.

`examples/native-agent` is an offline executable proof of
`GeminiProvider + NativeAgentHarness + local Knowledge`. It uses a fake fetch transport and spends
no quota.

## Verification

Automated coverage includes:

- multi-iteration Native execution and evidence absent from PreflightPlan;
- bounded parallel reads and sequential side effects;
- current-Phase Knowledge/Action scope and post-transition catalog rebuilding;
- PendingAction freeze/confirm execution;
- injected web search, company domains, and explicit missing-provider failure;
- Gemini adapter through the Native loop;
- out-of-band Host Context and restricted-value non-leakage;
- mocked Claude capability mapping, defer semantics, and fresh context policy;
- proof that no Claude Agent SDK import occurs in core;
- max-iteration stop and full replay/snapshot invariants;
- all v0.2 regressions.

Final verification was clean: `npm test` passed 142/142 tests in 33 suites; `npm run typecheck`,
all three examples, both benchmark Harness self-checks, Studio JavaScript syntax validation, and
`git diff --check` also passed. A local Studio HTTP smoke test exercised status, seed, session
creation, and the context-only observation endpoint without invoking a model.

## Explicit acceptance answers

1. **Can Gemini still run an agentic loop?** Yes. `GeminiProvider` drives `NativeAgentHarness`; an
   automated test and offline example prove it.
2. **Does Claude Agent SDK appear anywhere inside core?** No. Core contains no import or type from
   `@anthropic-ai/claude-agent-sdk`.
3. **Which Harness uses Claude Agent SDK?** Only `ClaudeAgentHarness` in
   `providers/claude-agent`.
4. **What is now meant by PreflightPlan?** A pre-execution application-state proposal for user
   facts, Working Notes, macro signals, and optional initial retrieval—not the whole autonomous plan.
5. **What is now meant by Agent Planner?** The model's iterative semantic decision about the next
   capability request or final response inside the current Phase.
6. **Can the Agent Planner retrieve new evidence after seeing earlier evidence?** Yes.
7. **Can it make multiple iterative Knowledge calls?** Yes, across multiple model iterations and in
   safe bounded parallel batches within one iteration.
8. **Does Flow restrict every iteration?** Yes. The catalog is rebuilt from current Phase and the
   gateway revalidates every request.
9. **Can a Phase allow Knowledge but prohibit side effects?** Yes, with knowledge scope and an empty
   Action/tool scope.
10. **Can Host Context update without invoking an LLM?** Yes, through
    `AgentRuntime.observeHostContext()`.
11. **Does page/context navigation itself trigger an agent run?** No.
12. **How would a future host application send page context?** Its UI reports observations to an
    authenticated host backend/future Agent API, which calls `observeHostContext`; trusted identity
    should come from backend/auth state.
13. **Is Web Search product-classified as Knowledge?** Yes.
14. **How is company website search represented?** A `web_search` Knowledge source with fixed
    `allowedDomains`.
15. **Does Web Search require Anthropic?** No. It uses injected `WebSearchProvider`.
16. **Can a fake/native search provider be injected?** Yes; all automated web tests use one.
17. **How does Claude WebSearch map to our Knowledge semantics?** v0.3 uses a controlled custom
    capability bridge rather than unrestricted built-in WebSearch, preserving source scope, domains,
    limits, and audit events.
18. **Does PendingAction remain runtime-owned?** Yes, including frozen validated args and hash.
19. **Can Claude permission/hooks bypass our authority?** No. Effective permission is our runtime
    gateway plus Claude execution permission; a hook cannot grant what core rejects.
20. **Can the session still reconstruct from durable events/snapshot?** Yes. Full replay and
    snapshot-plus-later-event equality remain tested, including v0.3 events and observations.
21. **What was explicitly deferred to v0.4?** Skills/SKILL.md, automatic Skill learning, subagents,
    teams/multi-agent orchestration, Skill/subagent Phase scope, cross-turn Claude resume,
    phase-specific Harness switching, visual Flow graph, MCP integration, semantic rule judge,
    proactive context triggers, browser SDK, production public context API, and generic crawling.
