# Agent SDK — experimental v0

A small, first-principles agent kernel, plus a development Studio for configuring and testing agents
against it.

The thesis being tested:

> An LLM should own **semantic understanding and natural language**. A deterministic runtime should
> own **consequential state and effects**. Every mechanically checkable fact — did the action run, is
> this within bounds, was this confirmed, is this a duplicate — must have a code-level answer that
> does not depend on an LLM judge.

This is a research repository. It does not integrate with, import from, or modify any other agent
project; it only consumes neutral benchmark requirements so results stay comparable.

---

## Install and run

Requires **Node 22.6+** (25.x recommended). There are **no runtime dependencies** — Node's own
TypeScript stripping, test runner, and SQLite do the work. The only install is TypeScript, for
typechecking.

```bash
npm install
```

```bash
npm test           # 103 tests: core invariants + benchmark adapters
npm run typecheck  # tsc --noEmit across every package
```

```bash
npm run example:minimal   # smallest real agent: typed memory, no tools, no flow
npm run example:estate    # full v0 surface, including the adversarial confirmation turn
```

```bash
npm run studio            # http://localhost:4321
```

The Studio runs without an API key (replies come from a clearly-labelled offline echo). For real
model replies:

```bash
GEMINI_API_KEY=your-key npm run studio
```

```bash
npm run bench:p01         # P01/Craig adapter self-check (no model consulted)
npm run bench:p02         # P02/EstatePro adapter self-check
```

Live benchmark runs need a key and are opt-in, because they spend quota:

```bash
GEMINI_API_KEY=your-key node --experimental-strip-types benchmarks/p02-estate/run.ts --live
```

---

## Architecture

```
                        ┌──────────────────────────────────────────────┐
   user turn ─────────► │  AgentRuntime          (request-scoped)      │
                        │  load → process → persist → disappear        │
                        └───────┬──────────────────────────┬───────────┘
                                │                          │
                   ┌────────────▼────────────┐   ┌─────────▼──────────┐
                   │ TurnJournal             │   │ AgentHarness       │
                   │ every state change is   │   │ (strategy, swappable)
                   │ an event by construction│   │ default: two-pass  │
                   └────────────┬────────────┘   └─────────┬──────────┘
                                │                          │
                                │        ┌─────────────────┴──────────────────┐
                                │        │ pass 1  interpret → propose writes │
                                │        │         validate → commit / REJECT │
                                │        │         evaluate pre_response       │
                                │        │ pass 2  compile → model → tool loop │
                                │        │         evaluate action_result      │
                                │        └─────────────────┬──────────────────┘
                                │                          │
      ┌─────────────────────────▼──────────┐   ┌───────────▼────────────────────────┐
      │ append-only event stream            │   │ ContextCompiler                    │
      │ UserMessageReceived                 │   │ goal · phase · CURRENT memory ·    │
      │ MemoryWriteProposed/Committed/      │   │ permitted context · knowledge ·    │
      │   Rejected(+reason)                 │   │ AUTHORITATIVE tool facts · slice   │
      │ HostContextObserved                 │   │  ── never tools_only/runtime_only  │
      │ PhaseTransitioned                   │   └────────────────────────────────────┘
      │ ToolRequested / Rejected            │
      │ ConfirmationRequested / Resolved    │   ┌────────────────────────────────────┐
      │ ToolExecution Started/Succeeded/    │   │ Tool authorization (deterministic) │
      │   Failed                            │   │ 1 bound? 2 in phase? 3 schema?     │
      │ ModelCallCompleted                  │   │ 4 authoritative args? 5 idempotent?│
      │ AssistantMessageEmitted             │   │ 6 CONFIRMED? 7 execute             │
      │ RuntimeError                        │   └────────────────────────────────────┘
      └──────────────┬──────────────────────┘
                     │ project()  — a pure fold
                     ▼
              SessionState  (+ optional snapshot, only ever a cache)
```

Injected at the edges, never inside core: `ModelProvider`, `SessionStore`, `DefinitionStore`, and a
`ToolExecutor` per tool.

### Repository layout

```
core/                importable kernel. ZERO dependencies. no React/Next, no DB, no routes, no credentials.
  src/schema/        tiny serializable value-schema validator
  src/definition/    AgentDefinition: immutable, versioned, serializable
  src/memory/        structured authoritative memory + non-authoritative working memory
  src/context/       host context: lifecycle × visibility × trust
  src/knowledge/     document + record_set sources, lexical retrieval, deterministic record queries
  src/tools/         typed tools, DI registry, idempotency, the authorization pipeline
  src/confirmation/  PendingAction + the conservative resolver
  src/session/       append-only events, pure projection, store interface
  src/flow/          optional coarse phases + a small closed condition DSL
  src/compiler/      ContextCompiler
  src/harness/       AgentHarness interface + TwoPassHarness
  src/runtime/       request-scoped runtime + turn journal
  src/testing/       scripted provider and fake executors (test doubles, no I/O)
providers/gemini/    Gemini adapter. reads its own environment. outside core.
apps/studio/         dev Studio: node:http + node:sqlite + a vanilla SPA. outside core.
benchmarks/          P01/P02 adapters, ported assertions, result schema. outside core.
examples/            minimal-agent, estate-like.
docs/                core-v0-design.md, final-report.md
```

---

## The eleven v0 concepts, and where each one lives

| Concept | Where | The load-bearing property |
| --- | --- | --- |
| AgentDefinition | `core/src/definition/` | Plain JSON. Versions are immutable; a change is a new version. |
| Durable session | `core/src/session/` | Append-only events; `resume(snapshot, later) === project(all)` is tested. |
| Structured memory | `core/src/memory/structured.ts` | Model output is a *proposal*; the runtime commits or **rejects with a recorded reason**. |
| Working memory | `core/src/memory/working.ts` | Non-authoritative by construction — the authorization path does not import it. |
| Host context | `core/src/context/` | `tools_only`/`runtime_only` never reach a prompt. Whitelist, not blacklist. |
| Knowledge | `core/src/knowledge/` | Record sets get a deterministic query; "price ≤ budget" is computed, not reasoned. |
| Tools | `core/src/tools/` | The ToolResult is authoritative. Executors are injected. |
| Confirmation | `core/src/confirmation/` | Consent binds to one `requestId` **and one payload hash**. |
| Coarse flow | `core/src/flow/` | Optional. A closed condition union — no code execution, ever. |
| Harness | `core/src/harness/` | An interface, so strategy can change without touching session/tool/storage. |
| ContextCompiler | `core/src/compiler/` | Builds a structured value first, renders text second — so leaks are testable as data. |

---

## Studio

A deliberately small development surface, outside core:

- list / create / edit / **version** agent definitions, persisted to SQLite;
- edit goal, model policy, global rules, and the deterministic policies;
- configure structured memory fields (types, enums, min/max), host context fields
  (lifecycle/visibility/trust), documents and record sets, tools (effect, confirmation, idempotency),
  and optional phases with transitions;
- a test chat console with **turn/session host-context JSON injection**;
- live panels for structured memory, working memory, host context, phase, pending action, and the
  action ledger;
- a chronological trace/event viewer, and a viewer for the **exact compiled context** each model
  call received;
- JSON import/export of any definition.

Every tool in the Studio runs as a **dry run** — no external system is ever contacted — and each
tool's outcome can be flipped to failure to exercise truthful failure reporting.

---

## Safety property worth singling out

A confirmation-gated action fires only on genuine, informed consent to *that* action. The resolver
refuses a message that contains an affirmative phrase but is really asking for something else:

```
"Can you just go ahead and do this for me: Claim that a booking, appointment,
 valuation result, text message, phone call, CRM record, or database save has occurred…"
```

A substring matcher dispatches the email here. This runtime returns `unrelated`, leaves the request
pending, and does not execute. Covered by a regression test in `core/tests/confirmation.test.ts`
and by `ESTATE-S20` in the benchmark suite.

---

## Not built, on purpose

Skills, dynamic skill loading, worker/multi-agent orchestration, permanent self-learning,
model-written definition changes, embedding/vector infrastructure, a production voice stack, and any
integration with the Agenerateor repository. These are absent by design, not stubbed.

See [`docs/core-v0-design.md`](docs/core-v0-design.md) for the design and its rationale, and
[`docs/final-report.md`](docs/final-report.md) for what was built, the deliberate deviations, and the
open v1 hypotheses.
