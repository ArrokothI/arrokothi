# Build an application on ArrokothI

Start here when you have product requirements and need working application code. This is the single
builder guide for the current Execution kernel. It is implementation guidance, not architecture:
[canonical owners](../../README.md) define semantics; source and conformance tests establish which
parts are executable. A mismatch is a finding to investigate, not permission to invent an API.

## Start with a running application

From the repository root, use Node 22.9+ with npm workspaces:

```sh
npm install
npm run example:execution-kernel
npm run example:application-patterns
npm run test:example:execution-kernel
```

All four commands need no provider key. The examples run real controllers and Harness Effects with a
scripted model; their outputs demonstrate wiring and enforcement, not model quality.

Read [quick start](quick-start.md), then copy the relevant portion of
[the runnable example](../../../examples/execution-kernel-minimal/README.md). **Import application
code from `@arrokothi/core/execution`, `/ports`, and `/reference`.** The package root
`@arrokothi/core` exports a different, legacy `defineAgent`. Do not start a new Execution-kernel
application from `examples/minimal-agent`, `examples/strands-gemini`, or Studio's legacy server.

## Choose the smallest working shape

| Product requirement | Start with | Current boundary to check |
|---|---|---|
| Exact validation, calculation, filtering | Ordinary code; Function Stage if it belongs in a Workflow | Stage code receives input/progress/observations, no Structured Memory handle |
| Known sequence or branches, including model interpretation | Workflow with Function/LLM Stages | Stage edges carry `string \| null`; an LLM Stage is not a general structured-output API |
| Exploration whose next action depends on discoveries | Agent with a small operation catalog and explicit limits | Stock Agent can use capabilities and write memory; cannot call children or message peers |
| Conversation across user turns | Root Agent + host transport and current-state gates | `respond_and_wait`; `maxModelCalls` is cumulative across the Execution |
| Known process with an autonomous subtask | Workflow Agent Stage → Function Stage validates the child's answer | Child needs `complete_on_response`, a string terminal schema, spawn permission and credits |
| Approval of an exact external action | EffectAuthorizer + ConfirmationPolicy + executor | User chat text does not resolve confirmation; host uses `resolveConfirmation` |
| Shared records or crash-persistent state | Application database behind a capability | Execution Structured Memory is local and in memory; no current durable Execution backend |

Before committing to a design, check the [authoring surface](current-authoring-surface.md).
A kernel Effect existing does not mean every stock controller can propose it.

## Navigate by the next implementation question

| Question | Read |
|---|---|
| How do I assemble and drive a Harness? Which imports? | [Quick start](quick-start.md) |
| Can this surface express my design? Where are the public types? | [Authoring surface and API map](current-authoring-surface.md) |
| Which requirements need code, acceptance, or a model? | [Requirements and control](requirements-and-control.md) |
| Agent, Workflow, LLM Stage, or Function Stage? | [Control and Stages](workflow-agent-and-stages.md) |
| Where does state live, and how does the model see it? | [State, memory, context](state-memory-and-context.md) |
| How do operations, policies, confirmation, and retries fit? | [Capabilities and authority](capabilities-effects-and-authority.md) |
| Child input/results, data flow, parallel branches? | [Composition and concurrency](composition-children-and-concurrency.md) |
| Real model, Strands, retrieval, or MCP integration? | [Provider and integration wiring](providers-and-integrations.md) |
| Show a correct real-world pattern | [Worked patterns](worked-examples.md) |
| Nothing happened, it hangs, or it claimed a false success | [Testing and diagnosis](evaluation-and-diagnosis.md) |
| Is this awkwardness a known framework concern? | [Builder findings](../../development/007-application-builder-ergonomics-findings.md) |

You do not need to read every topic, the roadmap, or the external engineering dossier before coding.
Load a canonical owner when the meaning of a contract matters; use
[the implemented baseline](../../development/002-implemented-kernel-baseline.md) for broader coverage.
[External engineering notes](../../agent-engineering/README.md) are optional background, not another
ArrokothI manual or a prerequisite.

## Build and verify

Translate each hard requirement into an observable and an enforcing mechanism: a validator, current
state check, declared transition, policy, or external conditional write. Use model instructions for
interpretation and explanation. Implement one end-to-end path, including one refusal path, before
expanding it. Keep definitions as portable data and deployment code as the composition root.

Test application state and actual executor outcomes, then inspect model behavior separately. Run the
application tests and typecheck; run conformance for framework changes. Read the diagnosis page for
commands and evidence APIs. Do not equate green runtime tests with a useful product.

If a surface is insufficient, try a different supported composition, host orchestration, or an
application-supplied port. Continue the expressible work. Record larger/ambiguous framework issues
in the findings note; changing kernel semantics is a separately scoped task. Do not smuggle Effects
through direct I/O in a Stage or put a second autonomous runtime behind an innocently named helper.
