# v0.4 Architecture Decisions for Migration

> **Status: accepted human decisions and audit constraints.**
>
> This document records maintainer decisions made after reviewing [`001-repository-structure-plan.md`](001-repository-structure-plan.md). It is intended to constrain the upcoming repo-wide implementation audit and migration-plan pass.
>
> This document does **not** override the canonical architecture semantics in the main `docs/` documents. When the canonical documents intentionally leave an implementation or migration choice open, the decisions here govern the current migration. If this document conflicts with a canonical semantic invariant, the canonical architecture wins.
>
> For migration planning, this document is authoritative over recommendations or unresolved alternatives in `001-repository-structure-plan.md`.

## 1. Primary migration principle

The primary goal is to make the v0.4 ArrokothI mental model true, obvious, and testable in the implementation.

**Existing-code reuse is not a governing rule.**

Reuse code when it already expresses the correct responsibility and doing so keeps the architecture clear. Rewrite or delete code when preserving it would distort the v0.4 mental model, prolong obsolete abstractions, or make the kernel harder to reason about.

A complete rewrite of a subsystem is acceptable when it is the clearest and safest path to the target semantics.

Therefore the future audit must classify existing code by architectural fit, not by how expensive it would be to replace:

```text
correct responsibility and reusable
useful mechanism behind wrong boundary
legacy compatibility only
semantic mismatch requiring rewrite
obsolete and deletable
```

The migration plan should optimize for architectural clarity and conformance first, then implementation reuse where compatible with that goal.

---

## 2. Accepted decisions

### DEC-001 — Keep one primary kernel package

**Status:** Accepted

Keep one primary semantic kernel package at:

```text
packages/core
```

through the v0.4/v1 migration.

Agent, Workflow, Execution, Event, Effect, authority, memory, composition, controllers, and runtime are distinct semantic responsibilities, but they do not need separate npm/workspace packages at this stage.

Avoid premature package proliferation.

---

### DEC-002 — Keep the current core path/name during semantic migration

**Status:** Accepted

Do not make renaming `packages/core` or its package identity part of the semantic migration unless a later explicit decision changes this.

Package branding/public naming can be addressed separately from the architecture rewrite.

---

### DEC-003 — Agent and Workflow are the independently managed Execution kinds

**Status:** Accepted

The target kernel follows the canonical v0.4 model:

```text
Execution
├── Agent Execution
└── Workflow Execution
```

Function calls, LLM inference, Workflow Stages, Adapters, local retrieval, and similar local computation are not independent Executions unless they independently satisfy the Execution-boundary criteria in the canonical architecture.

In particular:

```text
Stage != Execution
```

---

### DEC-004 — Retire the current Flow/Phase architecture

**Status:** Accepted

The existing Flow/Phase feature is legacy architecture.

It must **not** be renamed or mechanically translated into the new Workflow/Stage model.

Target disposition:

```text
current Flow / Phase
        ↓
legacy behavior inspected during audit as needed
        ↓
deprecate / remove
```

The new WorkflowDefinition, WorkflowController, Stage model, transition semantics, and Stage completion behavior should be designed from the canonical v0.4 architecture.

Existing Flow/Phase code may be temporarily retained only when needed to protect or understand behavior during migration. It has no presumption of survival in the target kernel.

---

### DEC-005 — Session is not a target kernel semantic

**Status:** Accepted

The current `Session` abstraction is legacy architecture and must not become synonymous with `Execution`.

Application concepts such as:

```text
conversation
chat thread
user session
workspace
project
UI session
```

belong to the consuming application unless a future canonical architecture decision says otherwise.

A consuming application may associate one application-level conversation/session with one or many ArrokothI Executions.

During migration, a temporary Session compatibility facade is allowed if it materially reduces migration risk, but it is not part of the target mental model and should not constrain the new Execution architecture.

---

### DEC-006 — One logical Harness manages many ExecutionContexts

**Status:** Accepted

The target runtime follows the canonical one-Harness/many-Execution model.

A request-scoped Agent runtime or per-Agent Harness must not define the target operational architecture.

The Harness owns operational concerns such as lifecycle scheduling, Effect authorization/dispatch, pending operations, Event routing, wake-up, ownership, messaging enforcement, and recovery coordination for many Executions.

---

### DEC-007 — Runtime Events and audit/history/trace records are distinct roles

**Status:** Accepted

A runtime Event is an observation delivered through an Execution boundary and capable of advancing an Execution.

Audit, journal, trace, event-sourcing, and local-computation records may contain additional information that should not automatically become controller-visible runtime Events.

They may later share physical persistence infrastructure, but their semantic roles/types must remain distinguishable.

---

### DEC-008 — Third-party implementations stay outside kernel semantics

**Status:** Accepted

Kernel semantics must not depend on provider/framework/storage/retrieval/sandbox implementation libraries.

Dependency direction is:

```text
provider/framework/storage/retrieval/environment implementation
                         ↓
                  kernel-owned port
                         ↓
                  kernel semantics
```

Concrete vendor/framework types must not leak into semantic Definitions, ExecutionContext, authority, Event/Effect, Workflow, Agent, or memory contracts.

The current LangChain implementation dependency in core must therefore be removed from kernel semantics during the migration.

The exact destination/package shape should be chosen as part of the implementation plan after the relevant port is defined.

---

### DEC-009 — Model selection is a deployment concern behind one kernel interface

**Status:** Accepted

Agent/Workflow semantics must remain portable across supported LLM deployments.

The deployment/application chooses the concrete model provider and model configuration. Each implementation satisfies the same ArrokothI-owned model-provider contract used by the kernel.

Conceptually:

```text
Agent / Workflow controller
          ↓
ArrokothI ModelProvider interface
          ↓
deployment-selected implementation
          ├── Google AI Studio / Gemini API
          ├── GroqCloud
          └── local LLM adapter(s)
```

Initial first-class integration targets include at least:

- Google AI Studio for the Gemini API;
- GroqCloud, initially including `qwen/qwen3.8-27b` as a target model configuration;
- local LLM deployments through one or more compatible adapters when selected.

Exact provider model identifiers are deployment configuration and may change without changing kernel semantics.

Definitions must not contain raw API keys, provider SDK objects, infrastructure clients, or other deployment secrets.

The implementation should make provider switching straightforward enough that a programmer can configure the same Agent/Workflow against different LLM providers without rewriting kernel logic.

Provider-specific capabilities may be represented through portable kernel-owned contracts or capability metadata where needed, but provider-specific behavior must not redefine Agent/Workflow semantics.

---

### DEC-010 — `apps/studio` is a development/test surface only

**Status:** Accepted

`apps/studio` exists to exercise, inspect, debug, and validate the kernel during development.

It is not the canonical ArrokothI product application and must not define kernel architecture, public product UX, tenancy, or application semantics.

The kernel should not be distorted to match Studio-specific routes, state, UI, or test conveniences.

---

### DEC-011 — The real ArrokothI web application lives outside this repository

**Status:** Accepted

The production ArrokothI web application is a separate repository that consumes `agent-kernel` as its runtime heart.

The web application may consume the kernel in either deployment style:

```text
embedded application
    ↓ import SDK
agent-kernel
```

or:

```text
application
    ↓ HTTP/RPC/API
runtime service
    ↓ uses agent-kernel SDK
agent-kernel
```

Other applications should be able to consume `agent-kernel` in the same way.

---

### DEC-012 — `agent-kernel` is SDK-first and transport-agnostic

**Status:** Accepted

The primary v1 contract of this repository is the reusable kernel/runtime SDK and its semantic interfaces.

HTTP, WebSocket, RPC, or other remote APIs are deployment/integration layers around the kernel. They must not define the meaning of Execution, Event, Effect, Agent, Workflow, authority, memory, or lifecycle.

A hosted runtime service may be added later in this repository or another repository, but the semantic SDK must remain independently usable as an embedded subsystem.

---

### DEC-013 — Product authentication/tenancy is separate from Execution authority

**Status:** Accepted

Consuming applications/platforms own concerns such as:

```text
user authentication
tenancy
project/workspace membership
API access control
which caller may inspect or control which Execution
```

The kernel owns Execution-level authority such as:

```text
capability authority
resource authority
spawn authority
message authority
memory/context visibility
```

Knowing an `ExecutionId`, session identifier, mailbox reference, or resource handle is not authorization by itself.

The application authorizes the caller to invoke/control the kernel; the kernel then enforces what the resulting Execution is allowed to do.

---

### DEC-014 — `tests/conformance/` is first-class architecture verification

**Status:** Accepted

Create a repository-level conformance suite as the executable proof of the canonical architecture.

Conformance tests should assert semantic outcomes and forbidden behavior rather than internal class names or incidental implementation structure.

They should be suitable for reuse against reference implementations and selected external implementations where relevant.

Unit tests, package integration tests, product examples, and benchmarks remain separate concerns.

---

### DEC-015 — Dependency-free reference implementations may live in core

**Status:** Accepted

Minimal/reference mechanisms needed to execute and test the kernel may live under a clearly identified reference area inside core when they:

- implement kernel-owned ports;
- introduce no substantial provider/framework/database/sandbox dependency;
- are replaceable without changing semantic Definitions;
- make no stronger security claim than the trusted-local profile permits.

Examples may include in-memory stores, FIFO scheduling, deterministic test helpers, and a trusted in-process execution environment.

Reference behavior must not silently become the semantic definition merely because it is colocated with core.

---

### DEC-016 — ExecutionEnvironment is a core port; external backends require a real selected implementation

**Status:** Accepted

Keep the `ExecutionEnvironment`/sandbox abstraction kernel-owned and replaceable.

Do not create empty Docker/container/VM/managed-sandbox packages merely to reserve names.

A real external environment package should be created only when an actual backend is selected, reviewed, and implemented.

The trusted-local profile remains valid for developers who trust the host process.

---

### DEC-017 — Pre-v1 backwards compatibility is not a primary architecture constraint

**Status:** Accepted

The migration does not guarantee backwards compatibility with current pre-v1 public APIs, Session/Flow concepts, or development persistence formats.

Compatibility should be preserved only when it is valuable and does not distort the target architecture.

Temporary compatibility facades are permitted as migration tools, but they have no presumption of becoming permanent v1 APIs.

Persisted SQLite migration strategy should be chosen after the audit identifies actual data/behavior worth preserving and the cost of migration.

---

### DEC-018 — Architectural clarity outranks implementation reuse

**Status:** Accepted

When choosing between:

```text
A. reuse substantial existing code but retain confusing/wrong ownership
B. rewrite the subsystem around the canonical mental model
```

prefer **B**.

The audit should still identify reusable mechanisms, but reuse is a secondary optimization.

The implementation plan must be willing to recommend a clean rewrite of a module, package, subsystem, or large portion of the kernel when that makes the semantic boundaries more direct and testable.

Do not design compatibility layers solely to avoid deleting code.

---

## 3. Questions the repo-wide audit must investigate before later decisions

The following are intentionally **not** frozen yet. The audit should gather implementation evidence and make a recommendation without coding.

### AUDIT-Q01 — Retrieval implementation ownership and naming

Determine the cleanest external package boundary after kernel capability/resource ports are defined.

Questions include:

- should the extracted package be responsibility-named (`retrieval/local`) or vendor-named (`retrieval/langchain`)?
- should the existing dependency-free record-query evaluator live with that integration or as a core reference capability?
- which existing knowledge/retrieval contracts belong in core versus the external implementation?

The invariant is already fixed: third-party retrieval framework implementation code does not belong in kernel semantics.

### AUDIT-Q02 — Smallest capability/resource execution port

Recommend the smallest stable ArrokothI-owned interface that supports both:

- local computation over deliberately exposed/materialized read-only resources;
- live runtime-mediated access to external resources.

It must not expose raw provider/database credentials to semantic kernel code or untrusted execution.

### AUDIT-Q03 — Current preflight/planning disposition

Determine which current planning/preflight behavior expresses enduring Agent-controller logic, which is reusable strategy code, and which exists only because of the old Session/Turn architecture.

There is no requirement to preserve it.

### AUDIT-Q04 — Strands/provider composition

Determine how much provider-specific construction, if any, belongs in the Strands integration versus application wiring or explicit bridge/subpath APIs.

The invariant is fixed: Strands does not define model-provider semantics, Agent lifecycle, authority, or terminal-completion semantics.

### AUDIT-Q05 — Store transaction/port shape

Recommend the conceptual store boundaries needed by the new runtime while preserving useful transaction guarantees.

Do not assume either one universal store or mandatory micro-ports before examining the actual atomicity/recovery requirements.

### AUDIT-Q06 — Terminal-result schema/version persistence

Determine what Definition/Execution persistence contracts are required for typed/schema-bound terminal results and definition-version references.

### AUDIT-Q07 — Public API transition shape

Inventory current exports and recommend the clean target public API/subpath strategy.

Do not preserve old exports merely because they exist.

### AUDIT-Q08 — Existing SQLite data value

Determine whether any currently persisted development data has enough compatibility value to justify migration tooling.

There is no default requirement to retain the old schema.

### AUDIT-Q09 — Runtime policy vs application policy port boundary

Recommend a minimal interface that keeps tenant/domain/business authorization outside core while allowing the Harness to enforce application-supplied runtime constraints.

### AUDIT-Q10 — Provider-switch ergonomics

Inspect the current model-provider abstraction and recommend how the target architecture should make deployment-level switching among Gemini, Groq, and future local providers straightforward.

The audit should identify any provider-specific concepts currently leaking into core contracts and propose their removal.

---

## 4. Explicitly deferred questions

The following should remain open unless an earlier implementation slice proves they are required.

Do not invent permanent APIs for them during the migration audit:

- broad non-blocking Effect semantics;
- detached-child semantics;
- Working Note commit/fork behavior;
- richer Workflow Stage-result semantics beyond the current canonical v0.4 hypothesis;
- additional Adapter attachment points;
- isolated/sandbox backend selection;
- exact local-LLM backend selection (for example Ollama, vLLM, llama.cpp, LM Studio, or another transport);
- distributed scheduling/runtime topology;
- package structure for hypothetical environment backends.

The target tree and ports should leave room for later evolution without pretending these questions are already solved.

---

## 5. Implications for the upcoming audit

The next repo-wide audit must treat the following as constraints, not suggestions:

1. The canonical v0.4 architecture is the source of semantic truth.
2. This decision document governs migration choices where canonical docs intentionally leave room.
3. `001-repository-structure-plan.md` is a proposal; where it conflicts with this document, this document wins.
4. Existing code is evidence, not architecture authority.
5. Reuse is optional. Rewrite/delete is acceptable and should be recommended when it improves the mental model.
6. The old Flow/Phase architecture has no target role and should not shape Workflow/Stage design.
7. Session has no target role as a fundamental kernel semantic.
8. Studio is only a development/test consumer.
9. The real product application is external to this repository.
10. The SDK must support embedded use and remain transport-agnostic.
11. The target model-provider boundary must support deployment-level switching, with Gemini and Groq as initial first-class integrations and local LLMs remaining a supported extension direction.
12. The audit must finish with an incremental migration/coding plan, but it must not begin implementation.

---

## 6. Decision review rule

A later decision may change this document when implementation evidence justifies it.

When that happens, update this file explicitly rather than allowing implementation drift to become an undocumented architectural decision.

The intended development sequence is:

```text
canonical architecture docs
        ↓
001 repository-structure proposal
        ↓
002 accepted architecture/migration decisions
        ↓
repo-wide implementation audit
        ↓
human review
        ↓
approved migration/coding plan
        ↓
implementation slices + conformance
```
