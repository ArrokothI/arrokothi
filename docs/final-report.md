# Agent SDK v0.35 — Execution Consolidation Report

**Date:** 2026-08-22

**Status:** implemented

**Version:** 0.35.0

## Outcome

v0.35 consolidates the architecture around one external-turn coordinator and one canonical
agentic-loop implementation:

```text
AgentRuntime
→ AgentHarness
  → resolve Agent_SDK PendingAction
  → semantic Preflight when structurally required
  → compile authoritative current-state context
  → AgentLoopEngine
      → StrandsLoopEngine
      → model/tool lifecycle + ConversationManager + Interventions
      → every capability request crosses CapabilityGateway
  → persist Agent_SDK events, state, reply, and call metrics
```

Agent_SDK owns control-plane semantics. Strands supplies mature, temporary execution machinery.
Models plan; the runtime authorizes; executors act; ToolResult is truth; Durable Session remembers.

## Implemented architecture

### One primary Harness

`AgentHarness` is the public coordinator for one external user turn. Its `agentic` strategy requires
an injected engine; its `workflow` strategy retains the bounded compatibility behavior. The runtime
default is now the primary Harness in workflow mode rather than direct construction of a legacy
Harness.

Core's `AgentLoopEngine` interface contains only Agent_SDK types: compiled context, current
capability catalog, runtime decision/result callbacks, restricted execution context, limits,
metrics, and neutral lifecycle traces. `ReferenceLoopEngine` supports deterministic tests and
offline examples. `StrandsLoopEngine` is canonical for real agentic execution.

### Strands execution layer

`@agent-sdk/integration-strands` pins `@strands-agents/sdk` 1.14.0 and `@google/genai` 2.6.0. It:

- creates a fresh Strands `Agent` for each external turn;
- keeps one mutable `InvocationState` across that turn's model/tool cycles;
- invokes provider-level models, including Strands' `GoogleModel` for Gemini;
- refreshes the model tool catalog from the current Agent_SDK Phase/capability snapshot;
- maps lifecycle hooks to provider-neutral trace events;
- adapts Proceed/Deny/Guide/Confirm/Transform decisions to Strands Interventions;
- delegates all real Knowledge/Tool execution to Agent_SDK's `CapabilityGateway`;
- uses the actual `SummarizingConversationManager` conservatively, with proactive compression off;
- counts agent-loop, Guide-retry, and conversation-summary model activity.

No Strands tool callback performs an unapproved side effect. The callback returns the authoritative
observation cached after the Gateway decision. Runtime-only Host Context can be read by the adapter
through InvocationState but is never serialized into model messages.

### Narrow Preflight and instruction scopes

Agentic Preflight synchronizes Memory, Working Notes, and coarse Flow signals. It receives no
knowledge source catalog, emits no accepted retrieval requests, and does not prescribe a future
tool trajectory. Evidence acquisition happens in the iterative loop.

Preflight skips only when definition structure proves that no Memory, Working Note, signal, or
compatibility retrieval output is possible. Tests confirm the decision uses no regex, keyword, or
phrase dictionary.

Rules support `planner`, `response`, and `both` scopes. Planner rules are present during semantic
Preflight. Response rules and shared rules are compiled into the one agent-loop system context;
Strands middleware may update the provider call's current tool specification without introducing a
framework type into core.

### Durable authority and confirmation

Agent_SDK still owns Durable Session, ContextCompiler, Memory, Host Context, Flow, Knowledge,
ToolDefinition/ToolExecutor, CapabilityGateway, exact consent, idempotency, and event truth.
InvocationState and Strands conversation history are temporary execution details.

`Confirm` is derived from an Agent_SDK Gateway result after a durable `PendingAction` freezes the
validated payload and hash. Strands interrupts the current loop, but it does not become the pending
action store. A later external turn resolves and executes only the frozen payload. `Transform`
modifies the proposed input before the Gateway, so schema validation, payload hash, authority,
idempotency, and confirmation run again against the transformed value.

### Standalone P01/P02 builds

`examples/p01-craig` and `examples/p02-estate` are fresh AgentDefinitions built from original
requirements and product data. They do not import either reference application's chat route,
prompt, UI state machine, classifier, provider call, or email implementation.

P01 includes structured project memory, authoritative hemp-lime guidance, current-product code
caveats, and deterministic wall-volume calculation. P02 includes the exact six-property and room
data, deterministic record querying, qualification/seller/handoff Flow, and a once-per-session,
confirmation-gated injected handoff executor. Their mains run as standalone Agent_SDK applications
through the primary Harness and offline `ReferenceLoopEngine`.

Historical benchmark definitions/results remain present. The benchmark adapters project to the
standalone builds, but v0.35 does not present a new cross-builder comparison.

### Studio and examples

Studio now defaults to the primary `AgentHarness`, reports Strands vs offline reference engine
status, exposes workflow and explicitly legacy modes, displays model-call breakdowns, and renders
neutral execution lifecycle events without showing InvocationState values.

`examples/strands-gemini` proves AgentDefinition + Durable Session + semantic Preflight +
StrandsLoopEngine + Gemini-compatible model + Agent_SDK Knowledge + CapabilityGateway with a fully
offline scripted Strands model. `--live` switches the same application to Strands `GoogleModel`
when an application-supplied Gemini key exists.

## Compatibility status

- **Canonical:** `AgentHarness` + `StrandsLoopEngine` for agentic execution.
- **Reference/offline:** `ReferenceLoopEngine`.
- **Deprecated compatibility:** `TwoPassHarness`; use primary workflow strategy.
- **Deprecated reference:** `NativeAgentHarness`.
- **Experimental compatibility outside core:** `ClaudeAgentHarness`.

Working code was retained until replacement coverage exists. v0.35 deliberately does not
implement Skills, automatic Skill learning, subagents, teams, MCP, Strands Graph/Workflow/Swarm,
cross-turn Strands resume, a browser SDK, public production Host Context API, semantic LLM rule
judge, crawler, vector database, embeddings, or a large Studio graph editor.

## Verification

The final offline verification passed:

- `npm test`: 158/158 tests in 38 suites;
- `npm run typecheck`;
- all six offline examples (`minimal`, `estate`, `native`, `p01`, `p02`, `strands`);
- Studio JavaScript syntax plus a local HTTP smoke test for status, seed, session creation, and one
  primary-Harness turn;
- `git diff --check`.

Coverage includes structural and semantic Preflight, scoped
instructions, multi-cycle InvocationState mutation, restricted-context non-leakage, dynamic tools,
Guide retries, transformed payload revalidation, PendingAction confirmation, conservative and
forced ConversationManager behavior, dependency containment, standalone P01/P02 behavior, session
replay/snapshots, legacy regressions, and Studio syntax/smoke behavior. No live provider, network,
paid search, or benchmark comparison was used.

## Explicit acceptance answers

1. **What is the one primary Harness concept after v0.35?** `AgentHarness`, the Agent_SDK-owned
   coordinator for one external user turn. It supports primary agentic execution and bounded
   workflow compatibility.

2. **What is an `AgentLoopEngine`?** A narrow provider-neutral core contract for temporary
   model/tool loop mechanics. It consumes authoritative compiled context and capability callbacks
   and returns a reply, stop reason, neutral trace, and metrics; it owns no durable business truth.

3. **Which engine is canonical for agentic execution?** `StrandsLoopEngine` from
   `@agent-sdk/integration-strands`.

4. **Where does `@strands-agents/sdk` appear?** In the Strands integration package (and its tests
   and offline example fixture), plus the lockfile. It does not appear in Agent_SDK core source.

5. **Does any Strands type leak into core public contracts?** No. Core exposes only its own
   `AgentLoop*`, capability, context, decision, metric, and trace types. A static containment test
   checks protected control-plane directories.

6. **Can Gemini run through the Strands engine?** Yes. `createStrandsGeminiEngine` constructs
   Strands' first-party `GoogleModel` from the AgentDefinition model policy plus application wiring.

7. **Are credentials still outside AgentDefinition?** Yes. Keys are supplied to provider/engine
   constructors or read by explicit application-boundary helpers, never serialized in the
   definition, session, prompt, or trace.

8. **What happened to `NativeAgentHarness`?** It is deprecated and retained as an offline/reference
   regression path. It is not the canonical implementation.

9. **What happened to `TwoPassHarness`?** It is deprecated and retained for compatibility. New
   bounded applications use `AgentHarness({ strategy: "workflow" })`.

10. **What happened to `ClaudeAgentHarness`?** It remains an experimental compatibility adapter in
    `providers/claude-agent`, outside core. It is not a second primary architecture.

11. **What does Preflight do now?** It proposes user-established structured Memory changes,
    ephemeral Working Notes, and coarse semantic Flow signals before the loop.

12. **What no longer belongs in Preflight?** Retrieval planning, evidence acquisition, tool-call
    sequencing, complete task decomposition, and the future capability trajectory.

13. **Under what structural conditions is Preflight skipped?** When there are zero Memory fields,
    zero available Flow signals, `extractWorkingNotes` is false, and no enabled compatibility
    retrieval catalog can produce an output. Agentic mode always disables compatibility retrieval.

14. **Does any Preflight skip depend on regex/keywords/phrase dictionaries?** No. It depends only on
    declared definition structure and execution strategy.

15. **How many model calls occur for typical direct/tool paths?** A structurally trivial direct path
    uses one loop call; a semantic-state direct path normally uses one Preflight plus one loop call.
    A one-tool path normally adds one loop call after the observation: two without Preflight, three
    with Preflight. Guide retries and summaries add explicitly reported calls.

16. **What causes Guide retries?** A deterministic/application RuntimeDecision or terminal validator
    returns `guide`, and the configured retry ceiling has not been reached. The feedback is inserted
    into the same Strands loop.

17. **Does Guide itself require an LLM?** No. Producing the decision/feedback can be deterministic.
    Acting on it causes a new model call, which is counted as a Guide retry.

18. **How are planner vs response Instructions represented in a single agent loop?** Rules declare
    `scope: "planner" | "response" | "both"`. Semantic Preflight compiles planner/shared rules;
    the loop compiles response/shared rules plus its execution task instruction.

19. **Can Strands middleware modify model-call context without leaking into core?** Yes. The
    integration refreshes provider tool specs before model invocation through Strands middleware;
    core sees only the neutral capability snapshot and engine contract.

20. **What does InvocationState contain?** Per-turn execution context, request/trace/session IDs,
    current iteration and model/tool/Guide counters, mutation metadata, runtime-context key-read
    metadata, and transient decision/outcome caches. It contains no framework-independent durable
    source of truth and is not persisted wholesale.

21. **Which Host Context fields map to model prompt vs InvocationState?** Fields declared with
    `visibility: "model"` may enter compiled prompt context. `runtime_only` and other withheld fields
    are omitted from model messages and passed out of band in the engine execution context /
    InvocationState for authorized adapters.

22. **Does InvocationState replace Durable Session?** No. It is discarded after the external turn;
    Durable Session remains replayable authoritative state.

23. **Does Strands ConversationManager replace ContextCompiler?** No. ContextCompiler produces the
    initial authoritative application context. ConversationManager only reduces temporary inner-loop
    messages when context pressure requires it.

24. **Does Strands Session Management replace our Durable Session?** No. Cross-turn Strands session
    resume is explicitly deferred, and a fresh Strands agent is created for each turn.

25. **How are our Runtime decisions adapted to Interventions?** `proceed`, `deny`, `guide`,
    `confirm`, and `transform` map respectively to Strands Proceed, Deny, Guide, Confirm/interrupt,
    and Transform actions. Agent_SDK defines their semantics.

26. **How does Confirm interact with PendingAction?** CapabilityGateway first creates the durable
    Agent_SDK PendingAction with validated frozen args/hash. Confirm then pauses Strands and surfaces
    that runtime prompt. The next user turn resolves and executes the frozen action outside the old
    invocation.

27. **Can Transform bypass existing confirmation?** No. Transform changes the proposal before the
    Gateway call; the new value is revalidated, rehashed, re-authorized, and freshly confirmed when
    required.

28. **Is Web Search still provider-neutral and traceable?** Yes. It remains Agent_SDK Knowledge via
    an injected `WebSearchProvider`, Phase scope, Gateway budgets, domain restrictions, and events.

29. **Can Strands built-in Google Search bypass Knowledge policy?** No. The engine exposes only
    capabilities produced by Agent_SDK's current catalog. Built-in Google Search is not enabled;
    search must use the Agent_SDK Knowledge capability and Gateway.

30. **Are P01/P02 AgentDefinitions rebuilt from original requirements?** Yes. The standalone builds
    normalize original requirements/product data into fresh v0.35 definitions and injected
    executors without copying bespoke application runtimes.

31. **Are historical benchmark artifacts preserved?** Yes. Previous benchmark material remains in
    place. v0.35 does not erase history or claim a new cross-building-method comparison.

32. **What is explicitly deferred to v0.4?** Provider-neutral Skills and governed Skill proposals,
    subagents, MCP, Preflight-collapse experiments, long-term/resumable execution context, richer
    Flow evaluation, host/browser integration, rule refinement, and formal-release preparation.
    Teams, Strands Graph/Workflow/Swarm, automatic permanent learning, and cross-turn Strands resume
    are not v0.35 features.

33. **What are the stated formal-release requirements for v1.0?** v1.0 is the first formal/stable
    release. It requires public API/deprecation cleanup, SemVer, stable definition serialization,
    package-boundary documentation, migration guidance, commercial examples, concurrency and
    transaction review, crash/retry/idempotency tests, security review, provider failure semantics,
    observability contracts, formal P01/P02/P03/P04 evidence, deployment guidance, API reference,
    compatibility matrix, and proof that framework-specific types do not leak through core.
