# ArrokothI v0.4 implementation audit and migration plan

> **Status:** implementation audit and coding plan; no implementation authority.
>
> **Audit date:** 2026-08-31.
>
> **Authority:** the normative mental model, composition, runtime architecture, and security guarantees; the implementation guide; accepted decisions in `002-architecture-decisions.md`; and the repository-structure proposal where it does not conflict with those sources.
>
> **Scope:** the complete repository at version `0.37.0`, including packages, Studio, examples, benchmark subjects, tests, dependencies, and the ignored Studio SQLite database.

> **Post-Slice-C audit amendment (2026-08-31):** Slices A-C, the Slice-B
> consequentiality/idempotency correction, and the provider foundation are implemented; the current
> target path passes 441 repository tests at commit `4b2b76e`. The Slice-D-and-later guidance in this
> document has been refined against the canonical interoperability model and the implemented code.
> The amendment does not reopen accepted A-C semantics and does not authorize Slice D implementation.

> **Post-canonical-rewrite conformance amendment (2026-08-31):** a focused audit of the implemented
> A-C path against the rewritten canonical documents found **one** blocking conformance defect, with
> three code surfaces. Controller-local asynchronous work has no runtime seam: `ControllerNext`
> cannot express controller-local suspension, `ExecutionContext.waitingFor` can only express an
> Event dependency, and `WorkflowController` therefore awaits `provider.generate` inside its
> Activation. Everything else in A-C remains conformant or is a later-slice gap with an adequate
> seam. Section 18 now recommends that retrofit, not Slice D.0. See
> [`008-v0.4-to-v1.0-development-roadmap.md`](008-v0.4-to-v1.0-development-roadmap.md) §2.5 and §12.

This document records what exists, what is semantically fit for v0.4, and how to migrate. It does not authorize coding, preserve a legacy API, or freeze illustrative APIs from the authority documents.

## 1. Executive assessment

### Recommendation

Implement v0.4 as a **clean semantic runtime path inside the existing `@agent-sdk/core` package**, starting with a new Execution substrate and conformance suite. Reuse validated leaf mechanisms behind new boundaries, but do not evolve `Session`, `AgentRuntime`, `WorkflowCoordinator`, `Flow`, or the current turn journal into the v0.4 abstractions.

The current implementation is coherent and well tested for its own v0 contract: all 167 package tests, all 8 benchmark-subject tests, and the repository typecheck pass. That health is useful evidence, but it does not make the architecture a partial v0.4 runtime. Its unit of management is a conversational Session and its unit of progress is a request-scoped turn. v0.4 instead requires independently managed Agent and Workflow Executions, one logical Harness, scheduled Activations, mailboxes, pending operations, separate Events and Effects, authority envelopes, typed terminal results, and explicit parent/child composition.

Trying to rename or incrementally generalize the current runtime would preserve the wrong ownership:

- `AgentDefinition` currently owns concrete provider/model selection, embedded knowledge contents, a Flow, tools, memory, and turn policy.
- `AgentRuntime` is constructed around one definition and advances one Session turn.
- `AgentHarness` and `WorkflowCoordinator` mix semantic controller work with operational runtime work.
- `SessionEvent` is an append-only audit/projection vocabulary, not a delivered Event/mailbox protocol.
- `TurnJournal` is a valuable optimistic journaling mechanism, not the Harness, scheduler, mailbox, or pending-operation model.
- Phase is a closed conversational state machine and must be retired, not translated into Workflow Stage.

The safest route is parallel replacement in the same package: add new v0.4 modules with no imports from legacy Session/Flow/runtime modules; migrate integrations and examples through those modules; then delete the old graph at explicit milestones. Because the project is pre-v1 and accepted decisions prioritize clarity over compatibility, compatibility code is justified only when it reduces migration risk for a named repository consumer and has an owner and deletion milestone.

### What is worth preserving

The repository contains strong mechanisms and tests that should inform v0.4:

- immutable, serializable definition validation and exact value-schema validation;
- optimistic append/CAS and snapshot/replay patterns;
- durable-before-dispatch journaling, stable idempotency keys, and ambiguous-outcome fences;
- frozen-payload confirmation and typed consequential-argument authority checks;
- structured-memory validation and provenance;
- explicit model-context visibility filtering;
- deterministic record queries and provider-neutral model request/response shapes;
- Gemini transport normalization and Strands interception/context-refresh patterns;
- deterministic in-memory fakes and failure-focused tests.

These are inputs to new ports, records, and conformance tests. They are not reasons to keep their current Session, Phase, Tool, or Knowledge ownership.

### Baseline evidence

| Check | Result | Audit interpretation |
|---|---:|---|
| `npm test` | 167/167 passing | Strong evidence for current safety mechanisms; not v0.4 conformance. |
| `npm run test:benchmark-subjects` | 8/8 passing | P01/P02 are reliable legacy behavior fixtures and migration acceptance examples. |
| `npm run typecheck` | Passing | The current package graph is internally consistent. |
| Studio database | 2 definitions, 1 Session, 5 Session events | Ignored developer data, not a production migration requirement. |
| Core third-party runtime dependencies | LangChain core and text splitters | Direct violation of the accepted dependency boundary. |

### Top-level disposition

This is a **semantic rewrite with selective mechanism reuse**, not a wholesale repository rewrite and not an in-place refactor. Keep the package names and workspace layout; replace the core ownership model. Gemini is close to reusable behind a refined provider contract. Strands is reusable as an integration technique but needs a new executor boundary. SQLite transaction patterns are reusable, while its Session schema is not. Studio, examples, and benchmarks are consumers to migrate after the new semantic path is proven.

No human decision blocks Slice A. The remaining decisions at the end of this document are intentionally deferred APIs or product/deployment choices and must not be guessed during the substrate work.

## 2. Current implementation architecture

### 2.1 Current execution path

```text
AgentDefinition
  ├── concrete provider/model policy
  ├── Flow/Phase graph
  ├── embedded Knowledge sources/data
  ├── Tool bindings
  └── Session-oriented memory/context/turn policies
          ↓
AgentRuntime (constructed for one definition)
          ↓ runTurn(sessionId)
TurnJournal + SessionStore append/CAS
          ↓
AgentHarness
  ├── optional semantic Preflight
  ├── WorkflowCoordinator / Phase transition logic
  ├── ContextCompiler
  └── ReferenceLoopEngine or StrandsLoopEngine
          ↓
CapabilityGateway
  ├── KnowledgeIndex
  ├── ToolRegistry / authorization / confirmation
  └── SessionEvent audit stream
```

The architecture is request-scoped even when stores are shared across runtime instances. There is no long-lived logical Harness supervising multiple contexts, no scheduler queue, no mailbox, no general pending-operation collection, and no parent/child execution relation.

### 2.2 Repository-wide subsystem inventory

Disposition legend:

- **REUSE** — fit as-is or with naming/documentation changes only.
- **REUSE_BEHIND_NEW_BOUNDARY** — preserve a mechanism or substantial implementation after removing legacy ownership.
- **REWRITE** — replace the semantic abstraction; small algorithms may still be copied deliberately.
- **DELETE** — no v0.4 target role.
- **TEMPORARY_COMPATIBILITY** — isolate only while a named consumer migrates.
- **INVESTIGATE** — resolve with a focused spike before committing to reuse.

Fitness uses **fits**, **partial**, or **wrong** relative to v0.4, not relative to current tests.

| Subsystem / location | Current responsibility and owner | Principal dependencies | Public API | Persistence coupling | Test evidence | v0.4 target owner | Fitness | Disposition |
|---|---|---|---|---|---|---|---|---|
| Definitions — `core/definition` | `AgentDefinition` owns authoring, provider/model, Flow, knowledge data, tools, memory, host context, and policies | Most core authoring types | Broad root exports | `DefinitionStore`; embedded JSON | versioning, validation, serialization | `definitions/` with only Agent/Workflow execution definitions and refs | wrong | **REWRITE** |
| Value schema — `core/schema` | Small JSON-value schema, validation/coercion, JSON Schema projection | none | Root export | embedded in definitions/events | strong unit coverage | shared kernel schema leaf | fits | **REUSE** |
| Definition store — `core/definition/store.ts` | Immutable AgentDefinition versions; in-memory implementation beside port | definition types | Root export | direct | basic immutability | focused `DefinitionStore` port plus reference implementation | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Session events — `core/session/events.ts` | Gapless audit/history vocabulary for turns, plans, tools, memory, phases, messages, errors | all legacy concepts | Root export | canonical Session stream | replay/family assertions | separate delivered `Event`, effect journal, audit history, and trace records | wrong | **REWRITE** |
| Session state — `core/session/state.ts` | Projection with transcript, Phase, memory, notes, one pending confirmation, action ledger | Session events, legacy memory | Root export | snapshot/replay | strong projection tests | `ExecutionContext` plus separately queryable controller/memory/mailbox/pending state | wrong | **REWRITE** |
| Session store — `core/session/store.ts` | create/read/append/snapshot with expected-sequence CAS; in-memory implementation | Session state/events | Root export | direct | concurrency/replay | transactional runtime aggregate with focused store facets | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Runtime — `core/runtime/runtime.ts` | One-definition, one-Session, request-scoped turn coordinator | almost every core subsystem | Root export | direct Session journal | runtime/degradation/concurrency | one logical `Harness` supervising many ExecutionContexts | wrong | **REWRITE** |
| Turn journal — `core/runtime/journal.ts` | Provisional projection, checkpoint, discard, CAS append | Session store/state/events | Root export | direct | durable dispatch and stale-write tests | internal transaction/effect-journal mechanism | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Harness facade — `core/harness/types.ts` | One-turn service bag and harness interface | Session/runtime/capabilities | Root export | through journal | harness tests | controller ports and Harness-owned Activation outcome handling | wrong | **REWRITE** |
| Agent harness — `core/harness/agent-harness.ts` | Preflight, compilation, capability gateway, loop, confirmation, assistant message | nearly all legacy runtime | Root export | Session journal | direct/agentic paths | `AgentController`; Harness remains operational only | wrong | **REWRITE** |
| Workflow coordinator — `core/harness/workflow.ts` | Bounded turn workflow plus Phase transitions | Flow/planning/compiler/tools | Root export | Session projection | Flow transition tests | `WorkflowController` over local Stages and barriers | wrong | **DELETE** after replacement |
| Loop contract — `core/loop/types.ts` | Agent-loop request/result, provider and capability interfaces, Session/turn execution context | provider/capabilities | Root export | indirect | reference and Strands suites | narrow `AgentExecutor` under `AgentController` | partial | **REWRITE** |
| Reference loop — `core/loop/reference.ts` | Provider-neutral model/tool iteration; parallel reads and sequential actions | current gateway/provider | Root export | indirect journal | extensive behavioral coverage | dependency-free reference Agent executor/controller | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Flow / Phase — `core/flow` | Closed state-machine DSL and Phase-scoped tool transitions | Session memory/events | Root export | projected Phase | strong current tests | no target; Workflow Stage is a different concept | wrong | **DELETE** |
| Planning / preflight — `core/planning` | Turn fact extraction, notes, signals, retrieval proposals | provider/schema/Session | Root export | events and memory writes | strong current tests | optional Agent strategy or explicit Stage, never kernel prerequisite | wrong | **DELETE** as subsystem; selectively reuse parsers |
| Capability catalog — `core/capabilities/catalog.ts` | Projects Knowledge and Tool bindings, scoped by current Phase | definitions/Flow/knowledge/tools | Root export | none | loop scoping tests | active exposed view derived independently from authority | wrong | **REWRITE** |
| Capability gateway — `core/capabilities/gateway.ts` | Limits, dispatch, caching, authorization, confirmation, eventing | knowledge/tools/Session journal | Root export | tightly coupled | broad safety/loop tests | Harness effect authorization/dispatch plus generic capability executors | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Tool definitions/registry — `core/tools` | Tool ontology, executors, schema, effects, source policies | schema/memory/journal | Root export | action ledger/events | strong safety/idempotency tests | generic capability descriptors/executors; tool projection may be Agent-only adapter | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Tool authorization/idempotency | Typed argument authority, confirmation, durable-start behavior, keys/outcome fence | Session memory/journal | Root export internals | tight | especially strong failure tests | Effect authorization, confirmation evidence, effect journal | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Confirmation — `core/confirmation` | Frozen `PendingAction` and natural-language resolver | tool types/hash | Root export | one Session slot | adversarial and exact-payload tests | `RequestUserInput` plus confirmation policy/evidence records | partial | **REUSE_BEHIND_NEW_BOUNDARY**; resolver optional |
| Knowledge types — `core/knowledge/types.ts` | Source-specific catalog, embedded records/text, retrieval/web interfaces | schema | Root export | embedded in definitions | retrieval tests | generic capabilities/resources and provenance in core | wrong | **REWRITE** |
| Knowledge local impl — `core/knowledge/in-memory.ts` | lexical documents, record sets, web forwarding | LangChain in core | Root export | in-memory | good functional tests | external `packages/retrieval/local` | partial | **REUSE_BEHIND_NEW_BOUNDARY** after extraction |
| Record query — `core/knowledge/record-query.ts` | deterministic typed filtering/sort/limit | knowledge/schema | Root export | record data in definition | strong unit tests | local retrieval package capability | fits mechanically, wrong owner | **REUSE_BEHIND_NEW_BOUNDARY** |
| Structured memory — `core/memory/structured.ts` | validates writes, authority/provenance, correction | Session events/schema | Root export | Session projection | strong | Execution memory service and `WriteMemory` effect | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Working notes — `core/memory/working.ts` | flat TTL/recency note list | legacy types | Root export | Session projection | limited | frame-aware per-Execution Working Notes with explicit child semantics | wrong | **REWRITE** |
| Artifacts | absent | — | — | — | none | explicit artifact store/view/reference model | wrong | **REWRITE** (new) |
| Host context — `core/context` | lifecycle, visibility, trust for per-turn host values | schema/Session events | Root export | Session state | strong filtering tests | input Adapters, application facts, resource views, runtime policy metadata | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| Context compiler — `core/compiler` | pure prompt assembly from Phase, memory, notes, evidence, transcript | almost all legacy semantics | Root export | reads Session state | strong visibility/audit tests | Agent/LLM context compiler over explicit selected views | partial | **REWRITE** using selection patterns |
| Model provider port — `core/provider/types.ts` | provider-neutral request/response and one injected provider | schema | Root export | traces only | Gemini/reference tests | logical model resolver plus stable provider contract and features | partial | **REUSE_BEHIND_NEW_BOUNDARY** |
| IDs/hash/result utilities — `core/util` | deterministic IDs, FNV canonical hash, result helper | none | Root export | IDs/confirmation | indirect | typed IDs/clock; stronger digest where security binding is claimed | partial | **REUSE** IDs/result; **INVESTIGATE** hash |
| Testing helpers — `core/testing` | scripted provider/executors/fixed IDs and clock | public legacy APIs | `./testing` | in-memory | used everywhere | v0.4 fakes, fixtures, contract-suite runners | partial | **REWRITE** while preserving ergonomics |
| Gemini adapter — `packages/models/gemini` | REST transport, projection/normalization, retries/errors, env helper | core only; global `fetch` | package export | none | structured-output tests | external implementation of stable provider port | partial-to-fit | **REUSE_BEHIND_NEW_BOUNDARY** |
| Strands adapter — `packages/agents/strands` | Agent loop translation/interception; also hard-coded Gemini constructor path | Strands SDK; Google model | package export | through legacy journal | strong loop suite | external `AgentExecutor`; model calls resolved through ArrokothI-owned abstraction | partial | **REUSE_BEHIND_NEW_BOUNDARY** with significant rewrite |
| SQLite adapter — `packages/storage/sqlite` | legacy definitions, Sessions, Session events with transactions | core + `node:sqlite` | package export | entire purpose | only Session CAS adapter test | v0.4 runtime/store implementation with durable outbox | wrong schema, useful mechanics | **REWRITE** using transaction patterns |
| Studio server/UI — `apps/studio` | development UI/API for definitions, Sessions, turns, traces, SQLite | all current packages/examples | app-private | legacy SQLite | no dedicated suite | v0.4 development/test observatory only | wrong | **REWRITE** after core path |
| Minimal/estate examples | demonstrate current AgentRuntime, embedded knowledge, Flow, tools | public root API/testing | workspace packages | in-memory | executable manual fixtures | v0.4 authoring/composition examples | wrong | **REWRITE**; preserve scenarios |
| Strands/Gemini example | proves current Strands path and direct Gemini composition | core, Strands, Gemini | example | in-memory | self-verifying | provider-portable Agent executor example | partial | **REWRITE** |
| P01/P02 benchmark subjects | stable JSON protocols and legacy behavioral scenarios | current public API; Gemini | workspace public subject APIs | in-memory | 8 passing tests | black-box migration acceptance fixtures | partial | **TEMPORARY_COMPATIBILITY**, then rewrite internals |
| Gemini canary — `scripts/gemini-provider-canary.ts` | live structured-output/tool checks plus one legacy preflight/“workflow” Session path | core legacy API + Gemini | root script | in-memory/live provider | manually credentialed | portable provider canary plus separate v0.4 Workflow scenario | partial | **REWRITE** with provider contract migration |

### 2.3 Current package dependency direction

The workspace outline is already close to the accepted repository layout, and `packages/core` does not import application or implementation packages. The important violation is inside core itself:

```text
@agent-sdk/core
  ├── @langchain/core
  └── @langchain/textsplitters

@agent-sdk/integration-strands
  ├── @strands-agents/sdk
  └── provider-specific Google model construction
```

The first puts a retrieval implementation in the semantic kernel. The second is externally located, which is good, but combines Agent execution-framework integration with a provider-specific default and bypasses the generic `ModelProvider` path.

## 3. Semantic gap matrix

Classification legend: **EXISTS_AND_FITS**, **PARTIALLY_REUSABLE**, **WRONG_SEMANTICS**, **MISSING**, and **LEGACY_TO_DELETE**.

| v0.4 concept / invariant | Current evidence | Classification | Required migration |
|---|---|---|---|
| `ExecutionDefinition = AgentDefinition \| WorkflowDefinition` | Only an Agent definition exists; current `execution.harness` selects an implementation strategy | **WRONG_SEMANTICS** | Introduce the two-kind union; remove runtime/harness selection from definition semantics. |
| `AgentDefinition` | Exists, but owns provider/model, Flow, embedded data, tools, and turn policy | **WRONG_SEMANTICS** | Rewrite as a portable Agent Execution definition with logical bindings and no deployment clients/config. |
| `WorkflowDefinition` | Absent; current Flow is nested in AgentDefinition | **MISSING** | Add a first-class Workflow Execution definition with predefined Stage topology. |
| Agent Execution | Agent behavior runs inside a Session turn | **WRONG_SEMANTICS** | Make Agent an independently identified, scheduled, persistent Execution. |
| Workflow Execution | `WorkflowCoordinator` is a turn algorithm over Flow | **WRONG_SEMANTICS** | Add a real Workflow definition/controller and delete the coordinator. |
| Function Stage | No Stage abstraction | **MISSING** | Add local deterministic/code computation under Workflow. |
| LLM Stage | Model calls exist only inside turn/Agent paths | **MISSING** | Add bounded local model computation under Workflow through the provider port. |
| Agent Stage | No child Agent Stage | **MISSING** | Add a local Stage runner that explicitly calls a child Agent Execution in Slice E. |
| Workflow Stage | No child Workflow Stage | **MISSING** | Add a local Stage runner that explicitly calls a child Workflow Execution in Slice E. |
| Durable `ExecutionContext` | Session projection contains some state but lacks core identity/control/authority/mailbox/pending fields | **WRONG_SEMANTICS** | New record with separately queryable identity, lifecycle, controller state, views, pending, policy, and result. |
| Execution identity, `owner`, `rootExecutionId` | Session ID and optional tenant ID only | **MISSING** | Runtime-assigned typed IDs and explicit owner/root relation. |
| Lifecycle `CREATED/READY/RUNNING/WAITING/COMPLETED/FAILED/CANCELLED` | Session status is essentially active/error; turn stop reasons are treated as completion | **WRONG_SEMANTICS** | Runtime-owned transition table and terminal-state rules. |
| Activation as one scheduled period | `runTurn` is a request | **MISSING** | Scheduler creates bounded Activations; controller progress may span many. |
| Response/message is not terminal result | `reply` and stop reason `completed` end every successful turn | **WRONG_SEMANTICS** | Model/user outputs are Events or observations; only explicit controller completion sets terminal result. |
| Typed/schema-bound terminal result | No Execution result envelope | **MISSING** | Definition-declared result schema/version; atomic validation and terminal persistence. |
| One logical Harness, many ExecutionContexts | Runtime constructed for one definition and invoked per Session | **WRONG_SEMANTICS** | Harness registry/scheduler/store supervises many contexts. |
| Operational scheduler | None | **MISSING** | Durable-ready queue abstraction and reference FIFO scheduler. |
| Mailbox and delivered Event | Append-only Session audit stream is read as history | **WRONG_SEMANTICS** | Per-Execution mailbox with delivery/consumption cursors and deduplication. |
| Events are observations | Current events include history, audit, trace, and state proposals | **WRONG_SEMANTICS** | Define a small delivered Event protocol; keep audit/history/trace roles distinct. |
| Effects are proposals | Tools/retrieval/memory actions are method calls through a gateway | **WRONG_SEMANTICS** | Closed v0.4 Effect union: capability, memory, spawn, message, user input. |
| Correlation | Tool/action IDs exist, but no uniform request/result chain | **PARTIALLY_REUSABLE** | Require effect, operation, pending, and result correlation on every external-truth path. |
| Causation | Provenance cites some source events, but runtime changes lack a uniform causal chain | **PARTIALLY_REUSABLE** | Carry causation IDs across requests, observations, writes, child results, and audit. |
| Fast Effect completion | Reads may run inline, without a shared semantic fast/slow contract | **WRONG_SEMANTICS** | Use the same durable authorization/request path and optionally finish within the Activation budget. |
| Slow Effect / WAITING | External actions can checkpoint, but there is no generic pending/wake model | **WRONG_SEMANTICS** | Persist pending operation/deadline, yield, route correlated Event, and wake. |
| Pending operations | One pending confirmation and one unresolved-external fence | **WRONG_SEMANTICS** | Durable collection keyed by operation/correlation, supporting concurrent independent work. |
| Wake-up routing | HTTP/user turn directly calls runtime | **MISSING** | router → mailbox → READY → scheduler; duplicate-safe event delivery. |
| Semantic Agent controller | Split across preflight, harness, compiler, loop | **WRONG_SEMANTICS** | AgentController owns model-directed progression through narrow ports. |
| Semantic Workflow controller | Flow transitions in operational coordinator | **WRONG_SEMANTICS** | WorkflowController owns current Stage, barrier, transitions, and completion. |
| Stage completion barrier | Tool loop has sequencing, not a Stage barrier | **MISSING** | Required local work/effects/child calls settle before transition. |
| Predefined Workflow transitions | Closed Phase DSL exists but is conversational and Session-coupled | **LEGACY_TO_DELETE** | New Stage-result/event transition mechanism; do not translate Phase. |
| Stage local computation | No Stage concept | **MISSING** | Function/LLM/Adapter work stays local unless explicit spawn/call. |
| Input/output Adapters are effect-free | No explicit adapter abstraction | **MISSING** | Read-only selected-view transforms, unable to request Effects. |
| `SpawnExecution` | None | **MISSING** | Effect with narrowed delegated authority and explicit memory visibility. |
| `CallExecution` semantic pattern | No child execution/call protocol | **MISSING** | Compose spawn plus pending/correlation and child terminal-result Event; exact convenience API may remain open. |
| `SendMessage` | Transcript/user messages only | **MISSING** | Authority-checked peer messaging with no ownership powers. |
| Ask/reply interaction | No peer ask/reply correlation outside a turn | **MISSING** | Add scoped pending request/reply on message Event routing without implying ownership. |
| `RequestUserInput` | Confirmation is inferred from a later user turn | **MISSING** | First-class Effect; confirmation is a policy/evidence-bearing specialization. |
| Capability Authority | Tool declaration/scope and authorization approximate it | **WRONG_SEMANTICS** | Explicit grant/delegation envelope enforced by Harness before `UseCapability`. |
| Resource Authority | Knowledge/host visibility exists, but no resource grant envelope | **WRONG_SEMANTICS** | Explicit logical resource grants, operations, and visibility independent of data implementation. |
| Spawn Authority | None | **MISSING** | Explicit delegable child-definition/limit authority, narrowed on creation. |
| Message Authority | None beyond application turn ingress | **MISSING** | Explicit destinations/operations enforced separately from ownership/control. |
| Authority distinct from active/exposed view | Phase-scoped catalog makes availability and permission coincide | **WRONG_SEMANTICS** | Derive active view as a subset; denial remains enforced even if content influences model. |
| Bound resources | Knowledge sources and host context are embedded/Session-bound | **WRONG_SEMANTICS** | Logical resource bindings with visibility/access mode and no raw credentials. |
| Structured memory | Validated fields, provenance, corrections | **PARTIALLY_REUSABLE** | Move behind Execution memory service/Effect; add visibility and child rules. |
| Artifacts | None | **MISSING** | First-class immutable/versioned references and explicit visibility. |
| Working Notes | Flat per-Session TTL list | **WRONG_SEMANTICS** | Per-Execution frames, read-only inheritance, explicit commit/fork policy left narrowly open. |
| Child memory visibility | None | **MISSING** | Explicit inherited read-only views and local writable state; no automatic upward commit. |
| Memory is not context | Compiler reads separate stores but APIs and definition still conflate concerns | **PARTIALLY_REUSABLE** | Explicit selection/projection step; context is ephemeral compiled input. |
| Context compilation | Pure and auditable visibility filtering exists | **PARTIALLY_REUSABLE** | Rebuild over Execution Events, memory/artifact/note views, active capabilities, and Stage/Agent scope. |
| Confirmation evidence | Frozen payload and conservative resolver exist | **PARTIALLY_REUSABLE** | Persist prompt/options/payload digest/decision/actor/event chain; separate resolver strategy. |
| General authorization evidence | Tool decisions and event traces exist, but not as a uniform runtime record | **PARTIALLY_REUSABLE** | Persist policy/authority decision references and causal inputs for consequential Effects. |
| Execution environment port | Tool executors receive context, but no environment boundary | **MISSING** | Core port for trusted/local or isolated execution backend selected by deployment. |
| Honest trusted-local profile | No formal profile; Studio/local code can execute with host process authority | **MISSING** | Declare absence of containment and surface effective environment metadata. |
| Runtime policy vs application policy | `tenantId` leaks into loop context; policies mostly definition limits | **WRONG_SEMANTICS** | Opaque authenticated subject facts plus runtime-policy evaluator; business auth remains application-owned. |
| Durable recovery | Session replay/snapshot and orphan action fences are strong | **PARTIALLY_REUSABLE** | Cover contexts, mailbox cursors, effect requests/results, pending, children, memory, results, confirmations, and outbox. |
| Effect idempotency | Tool-specific once/per-input keys and ambiguous outcome safety | **PARTIALLY_REUSABLE** | General effect journal, stable operation identity, per-effect retry policy. |
| Provenance | Memory and model-call event metadata are explicit | **PARTIALLY_REUSABLE** | Uniform correlation/causation and authority/visibility decisions across all observations and writes. |
| Tracing distinct from context/history | Model calls and compiled contexts are evented in the same broad stream | **WRONG_SEMANTICS** | Keep telemetry/audit/history records separate from mailbox Events and selected model context. |

## 4. Architectural contamination and dependency audit

### 4.1 Boundary violations

| Finding | Consequence | Migration action | Gate |
|---|---|---|---|
| LangChain packages are direct `@agent-sdk/core` dependencies | A retrieval implementation affects kernel install surface and dependency graph | Move lexical document retrieval and record-set support to `packages/retrieval/local`; remove both dependencies from core | Slice C before old Knowledge deletion |
| Current definition contains `providerId`, concrete model name, and generation knobs | One definition is not deployment-portable | Replace with logical model requirements/profile refs resolved by application wiring | Provider foundation in Slice C, exercised in D |
| Strands selects Google by provider ID and offers `createStrandsGeminiEngine` in its main surface | Framework and provider composition bypasses the ArrokothI provider abstraction | Make Strands consume an injected ArrokothI model bridge/resolver; move native provider helpers to explicit optional subpaths or remove them | Slice D |
| Core Knowledge ontology embeds records and document text | Resource contents, implementation, and definition semantics are coupled | Definitions request logical resource bindings; application registers resources/capability executors | Slice C/E |
| Phase scopes tool/catalog exposure and is folded into Session | Authority, exposure, conversational progression, and persistence are coupled | New independent authority envelope and active view; delete Phase | Slice C/E |
| `AgentRuntime` owns concrete provider, tools, knowledge, definition, and harness for one request path | Operational Harness cannot supervise heterogeneous Executions | Registry/ports resolved by definition and deployment; one Harness | Slice A–D |
| `SessionEvent` is used as runtime history, projection input, audit record, and trace carrier | Delivery semantics and audit retention cannot evolve independently | Split mailbox Event, effect journal, state transitions, audit record, and telemetry | Slice B/I |
| Tool gateway directly mutates journal and memory | External truth, authorization, and semantic memory write paths are not general Effects | Route through Harness effect processor and event delivery | Slice B/F/G |
| `tenantId` appears in loop execution context | Application tenancy contaminates kernel semantics | Replace with opaque policy facts/subject ref at the boundary | Slice H |
| Studio imports example packages as sample definitions | Development UI and examples become implicit API anchors | Add v0.4 fixture package or Studio-local fixtures; keep Studio non-authoritative | Slice I cleanup |

### 4.2 Dependency rules for the target graph

The following must become mechanically testable:

```text
apps / examples
      ↓
external implementations
  models/*  agents/*  retrieval/*  storage/*  environments/*
      ↓
@agent-sdk/core ports + public semantic API
      ↓
core definitions / execution / controllers / runtime semantics
```

Rules:

1. Core has no provider SDK, agent-framework SDK, retrieval library, database driver, web framework, or product package dependency.
2. External packages depend only on exported core semantic or port subpaths, never core source files.
3. Adapter code cannot request Effects, mutate memory, or transition lifecycle.
4. Controllers cannot persist directly or set operational lifecycle states.
5. Provider, capability, resource, storage, and environment implementations cannot define kernel semantics.
6. Application authentication and tenancy types do not appear in core.
7. A package-boundary test checks manifests and source imports, not only source imports.

## 5. Public API audit

### 5.1 Current API problem

`packages/core/src/index.ts` exports nearly every implementation detail: Session records and reducers, Flow predicates, planning types, concrete KnowledgeIndex, ToolRegistry internals, TurnJournal, AgentRuntime, AgentHarness, compiler details, and provider types. This makes incidental v0 architecture look contractual and encourages integrations to import the semantic and implementation layers from one flat surface.

The current `./testing` subpath is a good precedent but its helpers encode Session/turn concepts. There are no public port, reference-runtime, definition, or compatibility subpaths.

### 5.2 Target export surface

| Export | Intended contents | Excluded contents |
|---|---|---|
| package root | `defineAgent`, `defineWorkflow`, stable definition refs, `Harness` construction/run entry points, essential IDs/results | store implementations, reducers, controller internals, vendor types |
| `@agent-sdk/core/ports` | model resolver/provider, controller/executor, capability/resource, environment, runtime policy, clock/ID, storage transaction facets | reference classes and application policy types |
| `@agent-sdk/core/reference` | dependency-free in-memory definition/runtime stores, FIFO scheduler, trusted-local environment, reference Agent/Workflow executors where applicable | vendor implementations |
| `@agent-sdk/core/testing` | deterministic fakes, fixtures, assertions, contract-suite factories | production stateful singletons |
| `@agent-sdk/core/compat/v0` | only named legacy facades still needed by an unmigrated repository consumer | Flow presented as Stage, new features implemented through Session |

Optional semantic subpaths such as `/definitions` or `/runtime` should be added only when actual consumer ergonomics require them. Do not mirror the directory tree automatically.

### 5.3 Transition policy

- Slice A adds the new surface without importing legacy types.
- Legacy exports remain temporarily available only to keep current consumers buildable while the new path proves itself.
- After a consumer migrates, move any still-needed legacy facade to `/compat/v0` and mark it with a deletion slice.
- Flow/Phase must not survive as a compatibility translation into Workflow.
- By Slice I, the root exports only target semantics; no long-term Session compatibility is promised.

## 6. Persistence and data audit

### 6.1 Current state

`SessionStore` provides a useful expected-sequence CAS contract and snapshot/replay model. `SqliteSessionStore` correctly uses database transactions for gapless append behavior. `TurnJournal` checkpoints a durable start before an external dispatch and the tests cover crash windows, ambiguous outcomes, definite failures, stale writers, and replay equivalence.

The persisted model is nevertheless the wrong aggregate. SQLite stores three legacy tables:

- `agent_definitions` as JSON AgentDefinition versions;
- `sessions` as Session metadata/snapshots;
- `session_events` as the mixed legacy event stream.

It cannot represent multiple Execution kinds, owner/root relations, lifecycle transitions, mailboxes/cursors, multiple pending operations, child calls, typed terminal results, resource/authority views, or a scheduler outbox.

### 6.2 Target persistence boundaries

Avoid both a universal untyped store and dozens of independently transactional micro-ports. Use focused read/write facets coordinated by one runtime transaction boundary:

```text
RuntimeStore.transact(executionId, transaction => {
  transaction.executions
  transaction.mailboxes
  transaction.pendingOperations
  transaction.effectJournal
  transaction.memory
  transaction.outbox
})

DefinitionStore is separately versioned and immutable.
ArtifactStore may be separate for blob lifecycle, while references are committed transactionally.
```

Required atomic operations include:

- consume mailbox events + update controller state + append Effect requests + create pending records + enqueue outbox work;
- record an Effect completion + close pending + append delivered Event + transition WAITING→READY + enqueue activation;
- validate and persist terminal result + transition to terminal lifecycle + emit child-completion Event/outbox;
- record authorization/confirmation evidence before consequential dispatch;
- claim scheduler work without allowing two active Activations for one Execution.

Use a durable outbox between database truth and scheduler/router delivery. Do not require an atomic transaction across a database and an external queue.

### 6.3 Studio data disposition

The ignored `apps/studio/data/studio.sqlite` currently contains only 2 definitions, 1 Session, and 5 events. It is developer seed/scratch data and has no demonstrated production value. The migration plan should create a new v0.4 schema or database and reseed Studio; it should not build general legacy migration tooling.

Before deleting the legacy SQLite schema, maintainers should make one explicit check for external deployments or user-owned databases. If such data is identified, write a narrow read-only exporter from legacy JSON to a neutral archive format. Do not keep legacy runtime semantics alive to support that export.

### 6.4 Terminal-result persistence

Each execution record must persist:

```text
definitionRef: { id, version, integrity/hash }
terminalResult: {
  schemaId or definition-bound result slot,
  schemaVersion,
  value,
  valueDigest,
  completedByActivationId,
  completedAt
}
```

The Harness validates the result against the definition/interface schema and commits it atomically with the transition to `COMPLETED`. Invalid results fail the Activation and cannot create a completed record. A parent receives a typed child-completion Event referencing the child and result envelope. Workflow Stage result typing remains independently `text | none` for v0.4 unless a later accepted decision expands it.

## 7. Model-provider abstraction audit

### 7.1 Current fitness

The `ModelProvider.generate(ModelRequest)` seam is vendor-neutral enough to preserve as a starting point. Gemini already translates provider-neutral messages, tools, and JSON Schema to REST, normalizes tool/structured results, reports actual provider/model/usage, supports cancellation, and keeps credentials at the application boundary.

The abstraction is not yet portable at the definition/composition level:

- `AgentDefinition.model` fixes `providerId`, model name, and generation configuration.
- `AgentRuntime` receives one provider instance for the definition.
- Strands can construct its own Google model based on provider ID, bypassing `ModelProvider`.
- There is no kernel-owned feature metadata, requirement negotiation, or stable unsupported-feature error.
- Gemini tests import the current preflight schema, coupling the adapter suite to one legacy Agent strategy.
- The live Gemini canary also imports preflight and builds the legacy Session “workflow,” mixing provider health with one obsolete controller strategy.

### 7.2 Target model resolution

Definitions should name a logical model role/profile and portable requirements, not credentials, SDK clients, provider IDs, or necessarily a concrete model:

```text
definition model slot: "primary" / "planner" / application-defined logical ref
        ↓ application/deployment wiring
ModelResolver.resolve(logicalRef, requirements, executionPolicy)
        ↓
ResolvedModel { provider, concreteModel, portableFeatures, limits, deploymentMetadata }
```

Gemini, future Groq, and a future local adapter must run the same Agent/Workflow definitions when they meet the requested portable features. Provider switching should be configuration/wiring, not definition rewriting.

### 7.3 Portable features and unsupported behavior

Start with features the kernel actually consumes, for example:

- text generation;
- tool/capability calls;
- schema-bound structured output;
- cancellation;
- usage and actual-model metadata.

Streaming, image/audio inputs, prompt caching, reasoning controls, or provider-native grounding should not enter the portable contract until a v0.4 semantic consumer requires them. A request distinguishes required from optional features. Resolution fails before an Activation when a required feature is absent. An optional feature may use an explicit kernel-owned fallback, such as text JSON plus validation, only when the fallback is declared and observable. Adapters must never silently change Agent/Workflow semantics.

Define stable error categories such as unsupported feature, invalid request, authentication, rate limit, transient transport, provider rejection, invalid provider output, and cancellation. Raw vendor response data must not be part of semantic state; retain it only in implementation-controlled diagnostic telemetry with redaction policy.

### 7.4 Provider contract tests

Publish one provider suite that every adapter can run against a deterministic transport fixture:

1. basic text request/response normalization;
2. multi-message and system-context preservation;
3. tool/capability declaration and call normalization;
4. structured output schema projection and invalid-output handling;
5. cancellation before and during transport;
6. stable error taxonomy and retry metadata;
7. actual provider/model/usage metadata;
8. required unsupported feature fails explicitly;
9. optional fallback is declared in result metadata;
10. serialized public values contain no SDK classes, clients, credentials, or raw vendor payloads.

Gemini should adopt this suite and keep only provider-specific projection tests alongside it. Groq is a future external adapter against the same suite, including the accepted target `qwen/qwen3.8-27b`; no Groq implementation is part of this plan. The exact local backend remains open and must not be frozen by a fake or Gemini-shaped interface.

### 7.5 Strands composition

`StrandsLoopEngine` contains useful translation, invocation-local state, tool interception, context refresh, cancellation, and summarization integration. In v0.4 it should implement a narrow `AgentExecutor` port and receive model access through ArrokothI-owned resolution. It must not infer a vendor from definition data or construct Google as the default path.

If Strands requires its own `Model` object, the integration package should provide an ArrokothI-`ModelProvider`-to-Strands bridge so requests still cross the stable provider contract. Any optional native Strands provider bridge belongs in an explicit integration subpath and application wiring, with the same portable capability checks and contract outcomes. This is the one area that merits a focused spike in Slice D; it is an acceptance checkpoint for the optional Strands executor, not a blocker for the reference Agent semantics.

## 8. Rewrite, reuse, and delete matrix

This matrix names concrete current units so that “reuse” cannot become accidental semantic carry-over.

| Current unit | Valuable property | Target | Disposition and condition |
|---|---|---|---|
| `defineAgent`, definition validation/versioning | immutable JSON authoring, validation reports | new Agent/Workflow definition builders | **REWRITE** union/ownership; reuse schema/validation techniques |
| `ValueSchema` utilities | dependency-free validation/coercion/JSON Schema | schema leaf used by results/memory/capabilities | **REUSE**; add schema IDs/version ownership outside leaf |
| `InMemoryDefinitionStore` | immutable versions | reference DefinitionStore | **REUSE_BEHIND_NEW_BOUNDARY** after generic ExecutionDefinition support |
| `InMemorySessionStore` expected-sequence algorithm | deterministic CAS and snapshots | reference RuntimeStore transaction/version checks | **REUSE_BEHIND_NEW_BOUNDARY**; no Session types |
| `TurnJournal` | provisional state, checkpoint, stale-writer failure | internal transaction/effect-journal helper | **REUSE_BEHIND_NEW_BOUNDARY**; do not expose or rename to Harness |
| `SessionEvent` union/reducer | exhaustive projection and audit vocabulary | migration test source only | **DELETE** after replacement; design new protocols rather than expand union |
| `SessionState` | reconstructability | no direct target | **DELETE** after consumers move |
| `AgentRuntime` | simple dependency injection | new Harness facade | **REWRITE**; no inheritance/adapter that makes Session an Execution |
| `AgentHarness` | orchestration behavior | AgentController + Harness effect handling | **REWRITE** along ownership boundary |
| `WorkflowCoordinator` | bounded continuation logic | none | **DELETE** |
| `Flow` and condition DSL | deterministic predicates and trace explanations | optional Workflow predicate helpers | **DELETE** public legacy; copy only generic predicate helpers proven useful |
| preflight planner | safe structured extraction and failure behavior | optional Agent controller strategy or authored Stage | **DELETE** subsystem; reuse parsers only behind explicit strategy |
| `ReferenceLoopEngine` | provider-neutral iteration, bounded reads/actions | reference Agent executor/controller | **REUSE_BEHIND_NEW_BOUNDARY** without Session/Phase/gateway types |
| capability cache/budget/serialization logic | bounded, deterministic dispatch | Harness effect processor/reference executors | **REUSE_BEHIND_NEW_BOUNDARY** |
| tool schemas/registry | typed validation and injected executors | capability descriptors/executor registry | **REUSE_BEHIND_NEW_BOUNDARY**; tool view becomes Agent-facing projection |
| tool source authorization | typed structural equality and explicit policies | generic effect authorization/evidence policy | **REUSE_BEHIND_NEW_BOUNDARY** |
| idempotency + ambiguous-outcome fence | strong external-effect safety | general effect journal | **REUSE_BEHIND_NEW_BOUNDARY** and expand concurrency model |
| `PendingAction` frozen payload | exact consent target | confirmation request/evidence | **REUSE_BEHIND_NEW_BOUNDARY** with stronger digest review |
| natural-language confirmation resolver | conservative convenience behavior | optional UI/application resolver | **TEMPORARY_COMPATIBILITY** or optional helper; not kernel truth |
| structured memory validator | typed values, correction, provenance | Execution memory service | **REUSE_BEHIND_NEW_BOUNDARY** |
| flat working-note store | TTL and recency | frame-aware note service | **REWRITE** |
| host-context validation/filtering | explicit visibility and trust labels | input adapter/resource/policy facts | **REUSE_BEHIND_NEW_BOUNDARY**; delete generic host-context ownership |
| current context compiler | pure selection/rendering and withheld audit | information-only Agent/LLM compiler | **REWRITE** inputs/ownership; preserve auditable filtering tests; operation projection is a separate input to provider-request assembly |
| `KnowledgeIndex` | unified convenience implementation | local retrieval package registry | **REWRITE** public ownership; extract algorithms |
| record query evaluator | deterministic typed results | local retrieval capability | **REUSE_BEHIND_NEW_BOUNDARY** |
| LangChain lexical retriever | useful local retrieval behavior | `packages/retrieval/local` | **REUSE_BEHIND_NEW_BOUNDARY**; remove dependency from core |
| `ModelProvider` request/response | useful neutral seam | stable provider port + resolver | **REUSE_BEHIND_NEW_BOUNDARY** with feature/error contract |
| Gemini provider | clean REST boundary and normalization | Gemini implementation package | **REUSE_BEHIND_NEW_BOUNDARY**; adopt conformance suite |
| Strands loop | framework translation/interception, interrupt/resume, and serializable snapshots | Strands AgentExecutor | **REUSE_BEHIND_NEW_BOUNDARY** after model/lifecycle separation; replace native dispatch with Effect-boundary pause/resume |
| SQLite transaction code | `BEGIN IMMEDIATE`, CAS discipline | v0.4 storage adapter | **REUSE_BEHIND_NEW_BOUNDARY**; new schema |
| Studio | useful manual observability surface | development/test-only v0.4 Studio | **REWRITE** after semantics stabilize |
| examples/benchmarks | realistic safety and conversation scenarios | migration acceptance fixtures | **TEMPORARY_COMPATIBILITY**, then rewrite internals and remove legacy facade |

## 9. Target ownership validation

Every new type or operation should have exactly one semantic owner. This table is a review checklist for proposed APIs.

| Concern | Target owner | May call/use | Must not own/do |
|---|---|---|---|
| Definition kind and serializable spec | `definitions/` | schema declarations, logical refs | lifecycle, provider clients, credentials, runtime queues |
| Execution identity/owner/root/lifecycle/result refs | `execution/` | authority/view/control refs | controller algorithms, storage transactions |
| Lifecycle transitions and Activation scheduling | `runtime/Harness` | scheduler/store/controller ports | model reasoning, Workflow topology decisions |
| Agent progression | `controllers/agent` | information compiler, Active Operation View resolver, operation projector, AgentExecutor; reports typed Effect proposals in its Activation outcome | persistence, lifecycle transitions, vendor SDKs, direct dispatch |
| Workflow progression/Stage barrier | `controllers/workflow` | local Stage executors, Effect requester | separate Stage lifecycle/identity, operational scheduling |
| Event delivery/mailbox | `interaction` semantics + Harness operations | router/store/outbox | audit-retention policy, arbitrary state mutation |
| Effect authorization/dispatch/result conversion | `runtime/Harness` | authority, policy, executor/environment ports | controller-specific progression |
| Capability implementation | external executor or dependency-free reference | validated request/resource handles | authority grants, memory mutation, lifecycle |
| Capability operation catalog | `CapabilityCatalog` / portable capability semantics | stable operation identity, reusable description/schema, consequentiality, minimal grouping metadata | caller grants, exposure state, executors, clients, credentials, tenancy |
| Effective operation authority | `runtime/Harness` from application/runtime policy | compact operation/resource grants or refs; current authorization checks | model relevance, aliases, descriptor rendering |
| Active Operation View | context/exposure resolver under runtime policy | Agent exposure request, catalog metadata, effective authority, task scope | enlarging authority, dispatch, provider schemas |
| Model invocation projection | operation projector for one provider call | immutable Active View snapshot, provider limits, model-facing aliases | authority, executor lookup, rebinding against a later view |
| Resource registration/materialization | application + resource ports | opaque implementation handles | raw credentials in definition/context/model |
| Model selection | application/deployment `ModelResolver` | provider implementations | definition-owned provider keys/models |
| Memory semantics | `memory/` | schema, provenance, visibility | prompt rendering |
| Information context selection/rendering | `context/` under Agent/LLM use | read-only Events, memory/artifact/note/resource views and instructions | operation selection/projection, retrieval, capability dispatch, hidden writes |
| Provider-request assembly | controller/executor boundary | compiled information plus the independently produced model-operation projection | authority mutation, operation resolution after the response |
| Runtime policy | core port implemented/configured by deployment | opaque authenticated subject facts | product business authorization or tenancy schema |
| Application auth/tenancy | application | kernel control API and policy inputs | changing kernel authority without explicit grant |
| Environment containment | external `ExecutionEnvironment` | selected resource views/capability runtime | semantic authority or false containment claims |
| Persistence transactions | storage implementation of core ports | durable outbox and aggregate facets | defining lifecycle/effect semantics |
| Audit/history/trace | observability ports/records | semantic IDs and outcomes | serving as the mailbox protocol |

Validation rules:

1. If a controller can set `WAITING`, dispatch a capability directly, or save state, ownership is wrong.
2. If a Harness interprets model text or chooses a Workflow transition, ownership is wrong.
3. If a Stage gets an Execution ID or durable lifecycle, ownership is wrong unless it explicitly spawns/calls an Execution.
4. If a definition contains a client, API key, raw resource, tenant model, scheduler choice, or provider SDK type, ownership is wrong.
5. If an Event grants authority or a message implies ownership, ownership is wrong.
6. If a memory write appears merely because text entered context, ownership is wrong.
7. If an adapter can request an Effect, ownership is wrong.
8. If a context compiler chooses model-callable operations, or an operation projector selects memory/resource snippets, ownership is wrong.
9. If a model-returned name is resolved against the latest view instead of the exact invocation projection, ownership is wrong.

## 10. Answers to audit questions

### AUDIT-Q01 — Where should retrieval live, and what should it be called?

Create `packages/retrieval/local`. Move both the LangChain lexical document implementation and the dependency-free record-query evaluator there. “Local retrieval” accurately names the deployment responsibility without making LangChain or “knowledge” a kernel concept. The package can expose document and record-set capability/resource implementations while keeping its choice of splitter/retriever internal.

Core retains generic capability/resource descriptors, request/outcome envelopes, evidence/provenance metadata, and read-only materialized-view contracts. Definitions bind logical resources; they do not embed record rows or document contents. `KnowledgeIndex`, source-specific retrieval unions, and automatic query-tool generation are not core target APIs. A product can still author a reusable retrieval capability profile outside core.

### AUDIT-Q02 — What is the smallest useful capability/resource port?

Use two small concepts rather than a retrieval-shaped super-interface:

```text
CapabilityExecutor.execute(authorizedRequest, environmentContext)
  -> CapabilityOutcome

ResourceBinding
  { bindingId, resourceType, accessMode, exposedOperations, visibility }
```

`authorizedRequest` carries execution/effect/correlation IDs, capability and operation IDs, already validated input, narrowed authority evidence, logical resource bindings, deadline/cancellation, and idempotency identity. It never carries an application tenant type or raw credential. `CapabilityOutcome` distinguishes success, definite failure, and unknown outcome and returns observations/evidence, not direct memory mutations.

For data that must be local before computation, `ExecutionEnvironment` prepares a read-only `MaterializedResourceView` selected by binding and visibility. Live resources remain mediated through `UseCapability`. Do not add record query, web search, SQL, filesystem, or HTTP methods to the kernel port.

### AUDIT-Q03 — What is the disposition of semantic preflight?

Delete `planning/` as a required kernel subsystem. The current preflight is a Session-turn strategy that combines fact extraction, notes, signals, and retrieval planning. It is neither required by open-ended Agent semantics nor a substitute for predefined Workflow topology.

Preserve structured-output parsing, safe malformed-output behavior, and validated-memory proposal techniques where a new Agent controller strategy proves they are useful. Applications may author preflight as an explicit Function/LLM Stage or select an optional Agent input strategy. No controller, definition, or provider adapter should assume a preflight call exists.

### AUDIT-Q04 — How should Strands and providers compose?

Strands implements `AgentExecutor`; it does not own Execution lifecycle, Effect authorization, provider resolution, or the Gemini default. Application wiring resolves a logical model through the ArrokothI model contract and injects it into the executor. If the Strands SDK requires a framework-native `Model`, the Strands package supplies a bridge backed by `ModelProvider` rather than selecting Google itself.

Keep framework-native provider bridges optional and explicit. Run the same Agent executor contract cases against the reference executor and Strands. Run the same model-provider suite against Gemini and every future Groq/local adapter. Delete `providerId === "gemini"` branching and the main-surface `createStrandsGeminiEngine` default after the replacement example is working.

### AUDIT-Q05 — How should stores and transactions be shaped?

Use a generic immutable `DefinitionStore` and one transactional runtime aggregate composed of focused facets for executions, mailboxes, pending operations, effect journal, memory refs, and durable outbox. This provides a single atomic boundary for runtime invariants without making every subsystem depend on a concrete database or pretending unrelated stores can commit atomically.

Expose the minimum operations required by semantic transactions and conformance tests, not SQL-shaped CRUD. Artifact blobs may use a separate store, but committing their references participates in the runtime transaction. SQLite implements the same port as the in-memory reference. Scheduler delivery uses claim/lease/outbox semantics, not a distributed database/queue transaction.

### AUDIT-Q06 — How should terminal result schema/versioning persist?

The Agent/Workflow definition or declared interface owns the result schema identity and version. The Execution pins an immutable definition ref at creation. On completion, the Harness validates the controller-proposed result, computes a digest, and atomically stores its schema identity/version, value, definition ref, Activation ID, and completion timestamp with the `COMPLETED` transition. Parents observe a typed child-completion Event. A reply, Stage result, message, or model end-turn signal never populates this field implicitly.

### AUDIT-Q07 — What should the public API transition be?

Make the target root semantic and small; publish `/ports`, `/reference`, and `/testing`; use `/compat/v0` only for named unmigrated consumers. Start additive in Slice A, migrate packages/examples, and then remove old root exports. Do not maintain API aliases once all repository consumers have moved, and never expose Flow as a Workflow compatibility layer. See Section 5 for the concrete surface.

### AUDIT-Q08 — Is current SQLite data valuable enough to migrate?

No demonstrated repository data is. The only inspected database is ignored Studio scratch data with 2 definitions, 1 Session, and 5 events. Reset/reseed it into a side-by-side v0.4 schema. Before legacy deletion, ask maintainers once whether external databases exist. If yes, build a narrow read-only archive exporter; do not add live compatibility or dual-write semantics by default.

### AUDIT-Q09 — Where is the runtime/application-policy boundary?

Applications authenticate callers and decide user/domain/tenant legality before invoking the kernel. They pass an opaque authenticated subject reference and policy facts to a narrow `RuntimePolicyEvaluator`. The kernel invokes it at creation/control, delegation, messaging, capability/resource use, visibility, and confirmation boundaries, then enforces the returned constraints together with Execution authority and runtime limits.

The port must not encode tenants, roles, billing plans, or product permissions. Business-specific authorization can also live inside a capability executor, but cannot enlarge Execution authority. Core owns budgets, deadlines, retries, persistence/durability profiles, environment selection, and enforcement of granted authority. Remove `tenantId` from Agent executor context.

### AUDIT-Q10 — What should provider-switch ergonomics look like?

An unchanged definition refers to a logical model role/profile. Application configuration maps that role to Gemini, Groq, or a local provider plus concrete model and credentials. A `ModelResolver` checks portable feature requirements and returns observable resolved metadata. Switching providers is a wiring/config change; unsupported required features fail explicitly before use. Provider-specific features require an explicit extension path and cannot silently affect portable behavior.

The Gemini adapter becomes the first conformance implementation. A future Groq adapter, including `qwen/qwen3.8-27b`, implements the same contract. The exact local backend and any isolated-provider deployment remain open decisions.

## 11. Conformance-test strategy

### 11.1 Test layers

The migration must make architecture executable before it makes APIs convenient.

| Layer | Location | Purpose | May depend on |
|---|---|---|---|
| Semantic unit tests | package-local `tests/` | Pure transition, validation, derivation, and compilation rules | the unit under test only |
| Port contract suites | `tests/conformance/contracts/` with runners exported from `/testing` | One behavior suite applied to in-memory, SQLite, Gemini, Strands, and future implementations | public ports and test fixtures |
| Semantic conformance | `tests/conformance/execution`, `workflow`, `agent`, `composition`, `memory`, `interaction`, `security`, `durability` | Authority-document invariants across real core components | public root, ports, reference implementations |
| Package integration | implementation-package tests | Translation at each external boundary | public core ports plus that implementation |
| Repository scenarios | `tests/integration/` or migrated examples | End-to-end multi-package behavior | public packages only |
| Benchmarks | existing P01/P02 plus future v0.4 benchmarks | Behavioral/performance comparison, never semantic authority | public packages only |
| Architecture checks | `tests/conformance/architecture/` | Imports, manifests, exports, vendor/data/app separation | repository files/manifests |

Every conformance case must be runnable against deterministic reference components. Time, IDs, scheduling decisions, provider output, external-effect completion, and crashes must be controllable without sleeps or network access.

### 11.2 Contract suites to publish

1. **DefinitionStore contract:** immutable versions, pinned refs, serialization, conflict behavior, integrity mismatch.
2. **RuntimeStore contract:** atomic expected-version transactions, no partial mailbox/effect/pending commits, restart-visible state.
3. **Scheduler contract:** at-most-one claimed Activation per Execution, READY eligibility, lease recovery, no terminal scheduling.
4. **Mailbox/router contract:** destination validation, deduplication, cursor/ack behavior, correlation preservation, wake-up enqueue.
5. **CapabilityExecutor contract:** validated request, cancellation/deadline, success/definite failure/unknown outcome, no direct state mutation.
6. **ModelProvider contract:** the portable cases in Section 7.4.
7. **ActiveOperationViewResolver contract:** intersects authored/application exposure requests with effective operation authority, is deterministic for the same inputs, and cannot enlarge authority.
8. **OperationProjection contract:** creates an immutable per-invocation binding snapshot, produces provider-facing specs, and resolves returned names only against that snapshot.
9. **AgentExecutor contract:** consumes compiled information, observations, and a model-operation projection; returns model-directed semantic outcomes without dispatching, authorizing, settling, persisting, or mutating lifecycle/authority.
10. **ExecutionEnvironment contract:** declared profile, selected views only, controlled capability bridge; stronger containment cases only for an actually selected isolated backend.

Each suite should be a factory that an implementation package imports and instantiates. A package-specific test that merely resembles the reference test is not conformance.

### 11.3 Canonical semantic scenarios

| Scenario from the implementation guide | First owning slice | Essential assertions |
|---|---|---|
| Long-lived wait/wake Execution | A | response does not complete; Event wakes same identity; control resumes |
| Fast vs slow Effect | B | same semantic request can complete inline or via WAITING; deadline survives budget yield |
| Simple RAG Workflow | C | LLM → live retrieval Effect → correlated result → next Stage; no child Execution |
| Local-corpus RAG Stage | C/H | exposed read-only local data needs no Effect; cannot access unexposed data |
| Bounded multi-LLM Workflow Stage | C | predefined calls and barrier; remains Workflow behavior |
| Agentic research loop | D | model-directed repeated Effects; authority enforced by Harness |
| Four-layer operation exposure | D | catalog, effective authority, Active View, and per-call projection remain distinct; each narrowing is test-visible |
| Projection snapshot stability | D | a response resolves against the binding snapshot shown to that invocation even after catalog/view refresh; snapshot IDs grant no authority |
| Information/operation separation | D/F | context compilation selects information only; operation projection is independent and they meet only at provider-request assembly |
| Narrow MCP capability round trip | after D | one imported and one exported synchronous Tool use the same portable descriptor/Effect semantics; no MCP type enters core |
| Workflow containing child Agent | E | child identity/result/authority; Stage barrier waits |
| Parent Agent with two child Agents | E | distinct children and correlations; no shared mutable scratch |
| Memory visibility/confidentiality | F | delegated read-only view, local writes, no implicit upward notes |
| Long-lived Agent waiting for user | G | RequestUserInput pending survives and resumes by correlated Event |
| Peer Agents | G | message authority only; no ownership, inspection, memory, or cancellation powers |
| Exact confirmation | G | persisted exact payload/evidence; changed payload invalidates consent |
| MCP composition/interaction proof | after E/G | declared Definition service, external async handle, and input-required mapping preserve Execution/PendingOperation/RequestUserInput distinctions |
| Prompt-injected Agent | D/E/H | model content cannot grant authority or expose unavailable capability/resource |
| Hostile Stage code | H when isolated backend exists | no host secrets/direct resource access; allowed operation only through Harness |
| Hosted control plane | H | app auth precedes kernel; opaque subject policy cannot enlarge authority |
| Minimal runtime profile | A/H | dependency-free in-memory path, explicit trusted-local limitations |
| Restarted WAITING Execution | I | mailbox/pending/deadline/correlation preserved; wake once |
| Consequential Effect crash windows | I | no duplicate dispatch; definite/unknown outcomes handled distinctly |

### 11.4 Existing tests to preserve as evidence

Do not bulk-port the current suite by renaming types. Re-express only the invariant at the new owner.

| Existing test family | Preserve in v0.4 as | Retire |
|---|---|---|
| durability cases 1–9 | effect-journal/store crash matrix and restart conformance | Session/turn assumptions and single unresolved-action slot |
| authority tests | effect authorization/evidence unit tests | tool-specific or Session memory access |
| confirmation tests | RequestUserInput/confirmation exact-payload cases | natural-language resolver as semantic truth |
| context tests | selected-view confidentiality and audit cases | `HostContext`/Phase-shaped compiler inputs |
| memory tests | structured-memory schema/provenance/correction cases | Session projection ownership |
| knowledge/record-query tests | `packages/retrieval/local` package tests | core Knowledge ontology and LangChain dependency |
| reference-loop tests | AgentExecutor contract and repeated Effect scenarios | Phase refresh and turn stop-reason semantics |
| Strands tests | AgentExecutor contract instantiation plus framework-specific mapping | direct Gemini selection and Session journal context |
| Gemini tests | provider contract instantiation plus Gemini projection cases | imports of preflight schema |
| SQLite test | full runtime/definition store contract instantiation | Session-only CAS as sufficient coverage |
| Flow tests | none, except generic predicate helpers copied for a demonstrated Workflow need | Flow/Phase behavioral compatibility |
| P01/P02 tests | black-box legacy comparison until their internals migrate | current types as API requirements |

### 11.5 Test-first migration rule

For every slice:

1. add the conformance test in target terminology;
2. make it fail against a minimal target API, not against a compatibility wrapper;
3. implement through public ports/reference components;
4. instantiate any applicable contract suite in external packages;
5. migrate one real example/scenario;
6. only then delete the superseded legacy code and tests.

No slice is complete if the only proof is a unit test with mocked-away Harness authorization, persistence, routing, or controller boundaries.

## 12. Slice A — detailed coding plan: Execution substrate

### Goal

Create the smallest dependency-free v0.4 path that proves Agent and Workflow are independently managed Executions under one logical Harness. It must support lifecycle, bounded Activation, WAIT/event wake-up, response without completion, and schema-bound terminal completion without importing or wrapping Session/Flow semantics.

### Preconditions

- This audit is accepted as the coding baseline.
- Existing tests remain green before the slice begins.
- No public compatibility duration is promised beyond named repository consumers.
- No decision about distributed scheduling, isolated execution, Working Note commit, or rich Stage results is needed.

### New structures

#### Definitions

- `DefinitionId`, immutable version, integrity digest, and `ExecutionDefinitionRef`.
- `DefinitionBase` with `id`, `version`, optional metadata, and optional terminal-result schema declaration.
- discriminated `AgentDefinition` and `WorkflowDefinition`; these are the only Execution kinds.
- generic serializable `spec` validation sufficient for Slice A test controllers; canonical Agent and Workflow specs are narrowed in Slices C/D.
- generic `DefinitionStore` port and dependency-free in-memory implementation.

Do not add Function or LLM to the ExecutionDefinition union. Do not put provider, API key, Session policy, harness choice, scheduler choice, or resource implementation in the base definition.

#### Execution

- branded `ExecutionId` and `ActivationId`.
- lifecycle enum and a pure allowed-transition function for `CREATED → READY → RUNNING ↔ READY/WAITING` and terminal states.
- `ExecutionContext` with pinned definition ref, `owner`, `rootExecutionId`, lifecycle, tagged controller state, mailbox ref, initially empty authority/active/resource/pending/view refs, effective runtime-policy ref, timestamps/version, and optional terminal-result envelope.
- terminal-result proposal/envelope and validation against the pinned result schema.
- explicit nonterminal output/emission record distinct from completion.

Fields belonging to later slices should have empty reference values or opaque refs, not legacy Session structures. Avoid one `state: unknown` blob: identity, lifecycle, controller progress, and result must remain separately queryable.

#### Runtime and ports

- `ExecutionController` port selected by the definition kind. It receives a read-only context, delivered Event envelopes, Activation metadata/budget/cancellation, and narrow requester services. It returns updated controller progress, nonterminal emissions, optional wake dependencies, and optional terminal completion proposal.
- `Harness` that creates Executions, pins definitions, persists them, enqueues READY work, claims an Activation, invokes the registered controller, validates the outcome, and owns lifecycle changes.
- `RuntimeStore` transaction port sufficient for Execution records and a minimal private/reference inbox in Slice A.
- `Scheduler` port with enqueue/claim/ack/release behavior and at-most-one active Activation per Execution.
- stable Event envelope identity/destination/correlation/causation fields sufficient for the wait/wake checkpoint. Slice B owns the complete Event body taxonomy and delivery guarantees.
- deterministic clock and ID ports.

The controller may report “waiting for an Event matching X”; it cannot set lifecycle to `WAITING`. The Harness derives WAITING only after validating that there is no runnable local work and records the wake dependency.

#### Reference implementation

- in-memory definition/runtime stores with version conflict checks;
- FIFO scheduler with deterministic claim behavior;
- minimal event delivery/inbox used by conformance tests;
- scripted test Agent/Workflow controllers that can emit, wait, resume, complete, fail, or attempt invalid outcomes;
- no network, database, LangChain, Strands, or provider dependency.

### Existing code disposition

- Reuse `ValueSchema`, deterministic clock/ID ergonomics, immutable-definition validation patterns, and CAS ideas deliberately.
- New modules must not import `session/`, `flow/`, `planning/`, current `harness/`, current `runtime/runtime.ts`, `TurnJournal`, `KnowledgeIndex`, or `ToolRegistry`.
- Leave current runtime files behaviorally untouched during the slice. Do not make `AgentRuntime` implement `Harness`, make `SessionState` satisfy `ExecutionContext`, or call a turn an Activation.
- Keep old root exports temporarily so existing tests/examples build; new exports are additive and clearly target-named.

### File-level scope

Proposed additions inside `packages/core/src`:

```text
definitions/
  types.ts
  validation.ts
  store.ts
execution/
  ids.ts
  lifecycle.ts
  context.ts
  terminal-result.ts
interaction/
  event-envelope.ts
runtime/
  activation.ts
  controller-registry.ts
  harness.ts
ports/
  controller.ts
  runtime-store.ts
  scheduler.ts
  clock.ts
reference/
  in-memory-definition-store.ts
  in-memory-runtime-store.ts
  fifo-scheduler.ts
  scripted-controller.ts
```

Proposed tests:

```text
tests/conformance/execution/
  definition-kinds.test.ts
  lifecycle.test.ts
  harness-many-contexts.test.ts
  wait-wake-resume.test.ts
  response-vs-completion.test.ts
  terminal-result.test.ts
  ownership.test.ts
tests/conformance/contracts/
  definition-store.ts
  runtime-store.ts
  scheduler.ts
```

Update `packages/core/package.json` exports and the curated root, `/ports`, `/reference`, and `/testing` entry points only as necessary. Do not move old files in this slice merely to match the final tree.

### Public API impact

Add the target definition/ref types, Harness entry point, and documented subpaths. Keep reference implementation classes under `/reference`, port interfaces under `/ports`, and scripted controllers/contracts under `/testing`. Do not export lifecycle mutation functions to application callers or controller persistence handles.

Legacy public symbols remain temporarily available but are marked in the audit/migration notes as non-target. Formal deprecation annotations may wait until the first real consumer uses the new path, avoiding warnings with no replacement example.

### Persistence impact

In-memory only. Define transactional semantics that SQLite must later implement, but do not alter `packages/storage/sqlite`, create production migrations, dual-write Session and Execution, or read the old SQLite schema. The reference store must serialize/clone records so tests do not pass through shared object mutation.

### Tests first

Write these failing conformance cases in order:

1. Agent and Workflow definitions instantiate only matching controller kinds and pin immutable refs.
2. Invalid lifecycle edges are rejected; terminal states cannot resume.
3. One Harness creates and advances at least two contexts from different definitions without per-definition Harness instances.
4. A controller emission/response leaves the Execution nonterminal and schedulable or waiting.
5. A long-lived Execution waits, receives a destination-checked Event, becomes READY, and resumes under the same identity/control state.
6. A valid typed result commits with `COMPLETED`; an invalid result does not.
7. Owner/root identity is assigned correctly for a root and a test-created owned record; no authority is inferred from knowing the ID.
8. Two workers cannot hold simultaneous Activations for one Execution.
9. A controller cannot directly persist, transition lifecycle, or access mutable store/scheduler handles; enforce by API shape and architecture test.
10. Public records and definition refs survive JSON round trips without implementation objects.

### Acceptance criteria

- All new conformance cases pass against dependency-free reference components.
- Existing 167 package tests, 8 benchmark tests, and typecheck remain green.
- No new v0.4 source module imports a legacy Session/Flow/runtime module.
- A response/emission and terminal completion are different outcome fields and produce different lifecycle behavior.
- WAITING is Harness-derived; an Event routes to the mailbox and causes READY before another Activation.
- Terminal result schema is independent of Stage result semantics.
- One Harness instance manages both Agent and Workflow test Executions.
- No vendor package or application concept enters core.

### Cleanup unlocked

- Establish the target root/subpath pattern and an explicit legacy export inventory.
- Permit later slices to build only on the new substrate.
- Do **not** delete Session, Flow, AgentRuntime, examples, or SQLite yet; no real semantic controller has replaced them.

### Risk

The largest risk is a superficially new API backed by legacy Session machinery. Enforce zero legacy imports and require the wait/wake and response-not-complete tests. The second risk is overdesigning fields for later slices. Keep later concerns as explicit empty refs and narrow extension points, while freezing only identity, lifecycle ownership, definition pinning, controller/Harness separation, and terminal-result semantics.

## 13. Slices B–I migration plans

### Slice B — Event/Effect gateway

**Goal.** Introduce delivered Events, the closed v0.4 Effect union, authorization/dispatch, pending operations, routing, correlation/causation, and semantically equivalent inline/slow completion paths.

**Preconditions.** Slice A lifecycle, controller/Harness boundary, scheduler, store transaction, and event envelope are green. Effect IDs and operation deadlines use deterministic clock/ID ports.

**New structures.** Add Event bodies and `EffectRequest`/result envelopes; `UseCapability`, `WriteMemory`, `SpawnExecution`, `SendMessage`, and `RequestUserInput` discriminants; `PendingOperation`; `CapabilityExecutor`; resource bindings/materialized-view refs; authority check result; router; effect journal; inline wait budget distinct from operation deadline. Only `UseCapability` is fully dispatched here; later Effect kinds may return explicit not-yet-supported errors until their owning slice, never silent no-ops.

**Existing code disposition.** Extract budget/cache/serialization, typed executor outcomes, idempotency keys, durable-start, and unknown-outcome behavior from `CapabilityGateway`/tools behind the new gateway. Do not rename `SessionEvent` to Event or `ToolExecutionStarted` to EffectRequest. Keep old path isolated for legacy consumers.

**File-level scope.** Add `interaction/events.ts`, `effects/{types,journal,pending}.ts`, `authority/{types,evaluate}.ts`, `capabilities/{descriptors,request}.ts`, `runtime/{effect-processor,event-router}.ts`, relevant ports/reference implementations, and `tests/conformance/{effects,interaction}` plus mailbox/capability contracts. Mine behavior from current `packages/core/src/capabilities/{catalog,gateway,types}.ts`, `packages/core/src/tools/`, `packages/core/src/runtime/journal.ts`, and `packages/core/src/session/events.ts`; target code must not import those units. Re-express cases from `architecture-repair.test.ts`, `durability.test.ts`, `reference-loop.test.ts`, and `tools.test.ts`.

**Public API impact.** Export semantic Event/Effect and resource/capability descriptor types at the root only where author/controller users need them; implementation ports stay `/ports`. Tool-shaped model projection is not the public capability contract.

**Persistence impact.** Extend the reference transaction with mailbox cursors, pending operations, effect requests/results, and outbox entries. No SQLite implementation yet; write its contract suite now.

**Tests first.** Same authorized capability completes inline and slow with the same observation; inline budget exhaustion yields WAITING without timing out the operation; correlated result wakes once; duplicate result is idempotent; denial is observable and cannot dispatch; definite failure versus unknown outcome differs; failure Event exists before terminal controller failure; audit history is not read as mailbox input.

**Acceptance criteria.** Controllers only propose Effects; Harness authorizes/dispatches; every result has effect/operation/correlation/causation IDs; pending survives a reference-runtime restart simulation; unavailable effects are absent or explicitly denied; no fast/slow semantic divergence.

**Cleanup unlocked.** New code stops importing current gateway/tool execution internals directly. Tool-specific durable tests may be duplicated in target terminology, but legacy gateway deletion waits for Agent/Workflow migration.

**Risk.** Reusing the mixed Session event stream or making “fast” mean “non-durable.” Durability and authorization records must precede consequential dispatch in both paths.

### Slice C — Workflow Stages

**Goal.** Deliver real Workflow Execution with four local Stage types, `text | none` Stage results, predefined transitions, completion barriers, effect-free Adapters, and both local and live retrieval paths.

**Preconditions.** Slices A/B. Before the first LLM Stage, stabilize the logical model resolver/provider feature foundation from Section 7 and make Gemini pass the portable subset it needs.

**New structures.** `WorkflowSpec`, `FunctionStageDefinition`, `LLMStageDefinition`, `AgentStageDefinition`, `WorkflowStageDefinition`; `WorkflowControlState`; `StageExecutionContext`; Stage result; transition resolver; barrier ledger keyed by required effect/child correlation; local computation environment; read-only input/output Adapter contracts. Agent/Workflow Stage execution initially reports unsupported until Slice E supplies child composition, but their definition/validation and barrier slots are established without treating them as Executions.

**Existing code disposition.** Implement a new `WorkflowController`; do not subclass or rename `WorkflowCoordinator`. Delete no Flow code while P01/P02/current estate examples still depend on it. Extract record/document retrieval to `packages/retrieval/local`, move LangChain dependencies there, and remove them from core. Reuse only generic predicate/trace helpers when a new transition case requires them.

**File-level scope.** Add `controllers/workflow/`, `composition/stages/`, `composition/adapters/`, model resolver/provider refinements, `packages/retrieval/local`, Workflow/retrieval/provider conformance, and one new v0.4 Workflow example. Replace behavior currently owned by `packages/core/src/harness/workflow.ts` and `packages/core/src/flow/`; extract `packages/core/src/knowledge/{in-memory,record-query,types}.ts` and `tools/record-query-tool.ts`; refine `packages/core/src/provider/types.ts` and `packages/models/gemini/`. Split `scripts/gemini-provider-canary.ts` into provider-only checks plus a separately named v0.4 scenario. Migrate applicable `flow.test.ts`, `knowledge.test.ts`, `planning.test.ts`, and Gemini tests into new owners. Do not redesign Studio.

**Public API impact.** Add `defineWorkflow` and stable Stage authoring types. Keep Stage executors/internal controller state non-public except narrow extension ports. Resource content is registered in application wiring, not embedded in the Workflow definition.

**Persistence impact.** Reference Execution control stores current Stage, settled/required barrier entries, and Stage result; mailbox/effect journal remains authoritative for external observations. No new separate Stage record or lifecycle.

**Tests first.** LLM → live RAG Effect → collect → transition; local exposed corpus RAG with no Effect; unexposed corpus denial; bounded two-LLM predetermined Workflow; invalid/undefined transition rejection; Stage cannot transition before required effects settle; response text does not terminate Workflow; adapters cannot request Effects by API shape.

**Acceptance criteria.** Function/LLM Stages run locally; Stage barrier is deterministic; live truth crosses Effect/Event; Stage has no Execution ID/lifecycle; core manifest has no LangChain; Gemini passes portable provider cases; one v0.4 Workflow scenario runs through public API.

**Cleanup unlocked.** Once all current Flow consumers have target replacements, delete `core/flow`, `WorkflowCoordinator`, Phase fields/events, and Flow tests. Until then isolate them under compatibility exports and forbid new use.

**Risk.** Translating Phase to Stage, or implementing every Stage as a child Execution. The conformance cases must prove both distinctions.

### Slice D — Agent Execution

**Goal.** Deliver model-open-ended Agent progression through a narrow executor, portable model
resolution, repeated Effect/Event observations, effect-free Agent-loop Adapters, and the minimum
four-layer operation-exposure boundary required by interoperability.

**Preconditions.** Slices A/B and the Slice C provider foundation. Workflow implementation need not be feature-complete for Agent work, but the provider contract and Effect gateway must be stable.

**New structures.** Add:

```text
AgentSpec
AgentControlState
AgentController
AgentExecutor request/outcome + reference executor
information-only Agent context compiler
minimum enriched CapabilityOperationDescriptor
effective operation-authority record/ref
ActiveOperationViewResolver
ActiveOperationView snapshot
ModelOperationProjection + binding snapshot
model-directed continue/respond/operation-call/stop outcomes
Agent-loop Adapter attachment points required now
```

`AgentSpec` is the smallest portable authored request: logical model request, instructions, bounded
Agent semantic limits, effect-free Adapter declarations when used, and operation-exposure requests
such as explicit operation refs and optional logical groups/tags. It does not contain descriptors,
provider schemas, authority grants, executors, credentials, application principals, or a complete
catalog.

Enrich the existing `CapabilityCatalog` rather than create a second operation ontology. The minimum
reusable descriptor for D is the already-stable `(capability, operation)` identity plus title/name,
description, input schema, existing consequentiality, and only the grouping metadata actually used
by the first deterministic resolver. Output schema, broad versioning, abstract resource
requirements, and richer idempotency metadata remain deferred until a consumer needs them.

The Harness/runtime owns effective operation authority. For a root Execution, application/runtime
policy supplies a compact grant/ref when the Execution is created; Slice E later extends the same
record with child delegation/narrowing. `EffectAuthorizer` continues to answer current invocation
permission and must not become a tool selector. Both exposure derivation and dispatch authorization
must read consistent authority truth, while the dispatch check remains decisive if authority changes
or an exposed view is stale.

The Active Operation View resolver receives only catalog descriptors, the Agent's authored exposure
request, application task/exposure policy, and read-only effective authority. It deterministically
intersects/narrows; it cannot grant. The first implementation needs only explicit refs, one simple
group/tag filter if the example needs it, an optional stable bound, and cached-view reuse. It makes
no mandatory LLM call.

For each provider call, create an immutable `ModelOperationProjection` containing a projection
identity/revision and bindings from model-facing names to stable operation identities. The model
response resolves only against that object, never by re-reading the latest Active View. Projection
and binding identities are correlation/integrity metadata, not bearer authority; the resulting
typed Effect still crosses current Harness authorization. When inference completes inside one
Activation the immutable in-memory object is sufficient; any executor continuation that crosses an
Activation persists the relevant snapshot/binding data as JSON in `AgentControlState`.

The information compiler and operation projector are independent:

```text
eligible information -> context compiler -> instructions/messages/snippets
Active Operation View -> operation projector -> ModelCapabilitySpec[] + bindings
                                             \ /
                                provider-request assembly
```

The executor consumes the compiled information, observations, resolved model, and per-call operation
projection. It returns semantic output or model operation calls. It receives no Effect requester,
`CapabilityExecutor`, `EffectAuthorizer`, Harness, settlement function, store, lifecycle mutator, or
authority grant. The Agent controller resolves calls against the same projection and reports typed
Effect proposals in its ordinary `ActivationOutcome`; only the Harness acts on them.

**Existing code disposition.** Adapt the useful `ReferenceLoopEngine` iteration and bounded-result
mechanisms behind the new step/outcome contract, but remove its direct `requestCapability` callback.
Rewrite current compiler inputs and remove Phase/Session/turn assumptions. Delete semantic-preflight
as a requirement. Preserve Slice-C `ModelCallableDeclaration` as a Workflow-stage declaration; a
future authoring helper may resolve it from the richer catalog, but D does not rewrite Workflow
semantics. Migrate the minimal and Strands examples; P01 is a useful simple Agent comparison fixture.

For Strands, route model calls through an ArrokothI `ModelProvider`-backed Strands `Model`. Build
Strands `FunctionTool`s only from the immutable invocation projection. Their callbacks are
observation adapters only: they must never call `CapabilityExecutor`, MCP, HTTP, or the old
`CapabilityGateway`. At `BeforeToolCall`, capture the tool-use id/name/input and projection binding,
raise an adapter-local interrupt before native execution, and return the model-directed operation
call plus a serializable Strands snapshot/continuation. After the Harness result Event arrives, the
controller resumes the executor with that observation; the observation-only callback returns it to
Strands and the model loop may continue. The Arrokoth binding snapshot is stored alongside the
continuation and remains the resolver of record.

The installed Strands 1.14 surface makes this feasible through `BeforeToolCallEvent.interrupt()` and
JSON snapshots (`takeSnapshot`/`loadSnapshot`). Do not use the experimental `afterModel` checkpoint
as the correctness boundary: its current JavaScript resume path may re-invoke the model and
regenerate the tool call. Begin with a focused spike proving one and multiple tool calls,
interrupt/snapshot JSON round trips, observation resume, cancellation, and context refresh. If
Strands cannot preserve these semantics, limit or omit that executor rather than weaken the core
boundary.

**File-level scope.** Add `controllers/agent/`, `executors/reference/`, `operations/` (or another
narrow capability-operation view/projection area), information-context modules, Agent conformance
tests, the view/projection contract runners, and Strands `AgentExecutor` tests. Extend
`ports/capability-catalog.ts` minimally and replace the `ExecutionContext.slots.authority` /
`activeView` placeholders with typed refs/records sufficient for operation authority and exposure.
Replace `packages/core/src/harness/agent-harness.ts`, `packages/core/src/loop/`,
`packages/core/src/planning/`, and the Agent-owned portions of the legacy context compiler; refine
the provider bridge as needed; substantially rewrite `packages/agents/strands/src/index.ts` and its
tests. Migrate `examples/minimal-agent`, `examples/strands-gemini`, and then P01 internals. Do not add
an MCP dependency to core or redesign Slice-C Workflow/local-resource types.

**Public API impact.** Add the target `defineAgent` spec, operation refs/descriptors, Active View and
projection ports, and Agent executor port under the appropriate curated surfaces; expose the
reference resolver/projector/executor under `/reference`. Concrete framework and MCP types remain in
their external packages. Logical model refs replace provider IDs in target definitions.

**Persistence impact.** Persist only Agent control/progression, the effective-authority ref, and any
projection/binding or executor-continuation snapshot that must cross an Activation. Provider raw
payloads and live framework objects never enter Execution state. A stored projection ID is not an
authorization token and cannot settle or invoke anything.

**Tests first.** Four-layer narrowing; an exposure request outside authority is omitted; an exposed
but newly denied/stale operation is still rejected by the Harness; deterministic explicit-ref/group
selection; no mandatory selector model call; per-invocation alias collision rejection; stale-view
response resolves against its original projection; unknown model names resolve to nothing;
projection IDs grant no authority; information compilation contains no operation-selection
responsibility; repeated retrieval/action loop; stop without completing the Execution unless the
controller explicitly proposes completion; model end-turn emits only a response; prompt injection
cannot enlarge authority or exposure; context refresh after observations; provider switch using an
unchanged definition; unsupported feature error; reference and Strands executor contract parity;
Strands native callbacks cannot dispatch; cancellation and bounded iterations.

**Acceptance criteria.** The same target Agent definition runs with Gemini through reference and
Strands paths where supported; changing deployment model mapping does not edit the definition;
the model sees only an authorized Active Operation View projection; every returned name resolves
through the exact invocation snapshot; the Harness owns every Effect/lifecycle decision and can deny
stale exposure; no Strands/Google/MCP dependency enters core; no preflight or exposure-selector model
call is structurally required.

**Cleanup unlocked.** Delete current loop/harness/planning/compiler code after all current Agent consumers migrate. Remove `createStrandsGeminiEngine` default and provider-ID branch. Retain only explicitly useful compatibility until P01/P02/Studio migration.

**Risk.** Framework leakage, a Strands-native provider/tool-dispatch bypass, authority/exposure
collapse, a second operation ontology, or late binding against the newest view. Run executor,
authority/view, projection-snapshot, and architecture import suites against both paths.

### Interoperability proof 1 — synchronous capability operation (immediately after D)

**Goal.** Prove the portable operation seam while it is still small, before composition, memory,
interaction, security-profile, or durability work can hide a bad boundary.

Implement this in an external MCP adapter package against the current official MCP SDK/spec, never
in core:

```text
MCP Tool -> validated portable capability-operation descriptor + executor binding
         -> effective authority -> Active View -> invocation projection
         -> ModelCapabilityCall -> UseCapability -> Harness

native portable capability operation -> explicit MCP Tool export
```

Scope is exactly one synchronous import and one export, with description/input schema and ordinary
success/failure. Exclude MCP Tasks, Prompts, Resources, MRTR/input-required, subscriptions,
persistent Agent handles, and Definition export. Test that imported descriptions/schemas/results are
untrusted data, discovery does not grant authority, export is explicit, the same stable operation
identity reaches the same Effect semantics from model and MCP paths, and no MCP type crosses the
adapter boundary.

This proof is a post-D architecture gate and may be implemented in parallel with early E work. It
does not change the D-I semantic dependency order and must not grow into a complete MCP product
slice.

### Slice E — Recursive composition

**Goal.** Add owned child spawn/call, authority and visibility derivation, child terminal-result Events, and functioning Agent/Workflow Stages while preserving Stage locality.

**Preconditions.** A–D. Authority envelope categories and Effect correlations exist; Agent and Workflow controllers return typed completion proposals.

**New structures.** `SpawnExecution` handler, creator/owner/root records, delegable authority derivation, child resource/memory/context visibility derivation, parent pending-call correlation, child-completion/failure/cancellation Events, and Agent/Workflow Stage runners that call child Executions and settle barriers. Implement scoped child calls only; detached-child semantics remain open.

**Existing code disposition.** There is no legacy child-execution abstraction to preserve. Do not reinterpret current tool delegation traces or nested model calls as composition. Reuse generic ID/provenance patterns only.

**File-level scope.** Add `composition/{spawn,call,delegation,child-results}.ts`, runtime Effect handler/router changes, Workflow Stage runners, Agent requester integration, and `tests/conformance/composition/`. Extend the target `execution/context.ts`, `runtime/{harness,effect-processor,event-router}.ts`, authority types, store transaction facets, `controllers/workflow/`, and `controllers/agent/`; there is no current legacy composition directory to migrate.

**Public API impact.** Expose authoring declarations and controller requester operations, not mutable child records. Knowing an Execution ID grants no inspection/control API.

**Persistence impact.** Store owner/root edges, delegated envelopes/views, parent pending call, child result refs, and outbox Event atomically with child creation/completion.

**Tests first.** Workflow→Agent→Workflow; two child Agents; child authority subset only; Stage waits for required child result; child failure/cancellation Event; no implicit child note sharing; owner differs from message peer; duplicate completion does not settle twice.

**Acceptance criteria.** Identity and authority remain correct across depth; child cannot exceed creator's delegable envelope; parent observes terminal result by Event; Function/LLM work stays local; Agent/Workflow Stage has no independent Stage lifecycle.

**Cleanup unlocked.** Composition-dependent compatibility workarounds can be removed; target examples can replace any simulated delegation.

**Risk.** Conflating ownership, waiting, and communication, or granting children the parent's entire environment. Derivation must be explicit, monotonic-narrowing, and test-visible.

### Slice F — Memory

**Goal.** Put Structured Memory, Artifacts, Working Note frames, visibility, and context selection under Execution semantics.

**Preconditions.** A/B/E. Child identity/visibility and WriteMemory Effect envelope exist. Resource/evidence provenance is stable.

**New structures.** schema-bound Structured Memory stores/views and WriteMemory handler; immutable/versioned Artifact refs and store port; per-Execution Working Note frames; inherited read-only/local-writable note views; explicit visibility/delegation filters; provenance linking writes to Events/Effects/resources; Agent/Stage context selectors. Implement the canonical no-pass default: sequential Stages do not hand notes to the next Stage automatically, children see only explicitly delegated notes, and child scratch never auto-commits upward.

**Existing code disposition.** Reuse structured-memory validation/correction/provenance behind the new service. Rewrite Working Notes and compiler inputs. Reclassify current host-context mechanisms into input/resource/policy facts rather than a generic Session memory channel.

**File-level scope.** Add/refine `memory/{structured,artifacts,working-notes,views,provenance}.ts`, store facets, context selectors, reference implementations, and `tests/conformance/memory/`. Replace target responsibilities currently in `packages/core/src/memory/{structured,working,types}.ts`, `packages/core/src/context/`, `packages/core/src/compiler/context-compiler.ts`, and memory/host-context fields in `packages/core/src/session/{state,events}.ts`; migrate `memory.test.ts`, `context.test.ts`, and relevant authority tests.

**Public API impact.** Expose declarative memory/artifact bindings and read-only views; mutation occurs through Effects/services with authority. Do not expose raw store writes.

**Persistence impact.** Reference transaction commits memory values/artifact refs and provenance with originating Event/Effect; artifact blobs may use a separate port. Note frames have explicit lifetime/owner.

**Tests first.** child delegated-note read-only behavior; confidential-resource-derived note withheld; parent cannot see child scratch; sequential Stage no-pass; authorized structured write visible; unauthorized write denied; schema failure evented; artifact ref visibility; context omits nonselected memory/history.

**Acceptance criteria.** Memory and context are demonstrably separate; all writes have provenance; visibility is enforced before compilation; no implicit upward/downstream scratch propagation; current strong schema/correction cases survive in target terminology.

**Cleanup unlocked.** Delete legacy memory modules, flat notes, Session host-context storage, and old compiler after remaining consumers migrate.

**Risk.** Treating ownership ancestry as visibility or copying all durable history into model context. Tests must inspect both selected context and persisted truth.

### Slice G — Communication and human interaction

**Goal.** Add authority-checked peer messaging, ask/reply correlation, RequestUserInput, and mechanical confirmation on the common Event/Effect/pending substrate.

**Preconditions.** A/B/E; F for memory/evidence visibility integration. Message/spawn authority categories already exist structurally.

**New structures.** `SendMessage` handling and Message Event; ask/reply correlation as a scoped pending interaction; `RequestUserInput` request/options/deadline; user-input Event routing; confirmation policy/evidence record with frozen canonical payload digest, actor/decision, supersession/invalidation, and audit link. Do not generalize broad nonblocking Effect semantics here.

**Existing code disposition.** Reuse exact-payload/frozen-action behavior and adversarial confirmation cases. Move the language resolver to an optional application/UI helper; it cannot itself constitute kernel authorization. Transcript becomes a selected message history/view, not the mailbox or ownership model.

**File-level scope.** Add `interaction/{messages,ask,user-input,confirmation,evidence}.ts`, handlers/router changes, policy hooks, and `tests/conformance/interaction/`. Replace target responsibilities in `packages/core/src/confirmation/`, the confirmation branches of `packages/core/src/tools/authorize.ts` and `harness/agent-harness.ts`, and transcript/pending fields/events in `packages/core/src/session/`; migrate `confirmation.test.ts` and the confirmation/durability cases.

**Public API impact.** Controller requester exposes send/ask/input proposals; application ingress exposes destination/correlation-safe user input. Runtime inspection/control remains separately authorized.

**Persistence impact.** Persist outgoing request, pending interaction, exact payload/options, evidence/decision, delivered reply/input Event, and wake-up outbox atomically at each boundary.

**Tests first.** peer message grants no ownership/cancel/memory/read; ID knowledge grants no inspection; ask correlates one reply and survives wait; user input survives restart fixture; exact confirmation succeeds once; changed/canonicalized payload rules; decline/expiry/supersession; unauthorized actor; adversarial natural language cannot bypass mechanical evidence.

**Acceptance criteria.** Ownership, messaging, and control APIs are separate; confirmation is tied to exact persisted proposal; RequestUserInput is first-class and not simulated by starting a new turn; all wakes use the router/mailbox/scheduler path.

**Cleanup unlocked.** Delete legacy `PendingAction`, Session transcript-as-input routing, confirmation gate, and resolver from core target exports after examples migrate.

**Risk.** Reintroducing chat Session as the runtime center or equating affirmative text with authorization. Keep application interpretation and kernel evidence separate.

### Interoperability proof 2 — composition and interaction (after E/G)

After recursive composition and human interaction semantics exist, extend the external adapter proof
without changing kernel identities:

```text
declared Agent/Workflow service operation -> create/call Execution
long-running exported call -> external MCP Task/handle around runtime work
input_required / MRTR -> RequestUserInput + correlated resume
selected catalog/resource change -> cache/view invalidation or Event only for a declared dependency
```

This proof may use the in-memory runtime and must state that it is not a restart-durability claim.
After Slice I, rerun the long-running Task/handle scenarios through the durable runtime. Portable
Resource and interaction-template coverage can be added with their owning semantic contracts; do not
turn `LocalResource` into the universal Resource descriptor to make the demo larger.

Protocol authentication remains outside Execution authority; task/Execution/projection IDs are not
bearer credentials; input-required UI is not mechanical Effect authorization; and external results
reach settlement only through authenticated trusted ingress.

### Slice H — Security profile and execution environment

**Goal.** Make the trusted-local threat model explicit, stabilize the ExecutionEnvironment and runtime-policy boundary, and prevent static checks from being described as containment.

**Preconditions.** A for the port/profile shell; B/E/F/G for meaningful authority/resource/message/memory checks. No isolated backend is selected unless a real hostile-code requirement and human decision exist.

**New structures.** `ExecutionEnvironment` port; explicit `trusted-local` reference profile; environment capabilities/limits metadata; scoped resource-view preparation; controlled capability bridge; opaque `RuntimePolicyEvaluator`; security diagnostics and audit records. Add an isolated-backend contract suite but do not claim it passes without an implementation.

**Existing code disposition.** Adapt tool/executor context and host-visibility checks to selected views. Remove `tenantId` and product concepts from core contexts. Studio remains trusted development code and must display that profile honestly.

**File-level scope.** Add `ports/{execution-environment,runtime-policy}.ts`, `reference/trusted-local-environment.ts`, security metadata/diagnostics, `tests/conformance/security/`, and architecture checks. Replace assumptions in `packages/core/src/loop/types.ts`, `packages/core/src/context/`, tool executor contexts, and `apps/studio/src/{server,executors}.ts`; migrate confidentiality/authority cases from `context.test.ts`, `authority.test.ts`, and package-boundary checks. External environment package structure remains undecided.

**Public API impact.** Applications select a profile/environment and supply opaque authenticated policy facts. No API promises that trusted-local contains hostile code.

**Persistence impact.** Persist effective profile ID/version, relevant policy decision refs, and environment metadata needed to explain/recover an Execution. Never persist raw secrets/clients in context.

**Tests first.** trusted-local self-identifies as non-contained; unavailable resource absent; denied capability cannot mutate; policy cannot enlarge authority; secrets not serialized/contextualized; same allowed request crosses controlled bridge. Isolated secret/network/process tests stay skipped/not applicable until a reviewed backend exists, never faked green.

**Acceptance criteria.** Threat-model claims match implementation; core remains application-auth neutral; environment is replaceable; audit can explain denials without leaking secret values.

**Cleanup unlocked.** Remove legacy host-context/executor assumptions and any misleading sandbox language. An external isolated package is unlocked only by a separate accepted backend decision.

**Risk.** Security theater: labeling in-process execution a sandbox or treating import scanning as isolation. Documentation, metadata, and tests must state the actual boundary.

### Slice I — Durability

**Goal.** Implement the stabilized v0.4 runtime/store contracts in SQLite, prove crash/restart recovery and idempotent consequential Effects, migrate Studio, and remove the legacy runtime/persistence graph.

**Preconditions.** Semantic record shapes from A–H are stable and reference conformance passes. Maintainers have answered whether any external legacy SQLite data needs a one-time exporter.

**New structures.** v0.4 SQLite schema/migrations for definitions, executions/control, lifecycle/version, mailbox/events/cursors, pending operations, effect journal, child edges, memory/artifact refs, terminal results, confirmation evidence, scheduler claims, and durable outbox; recovery scanner/reconciler; SQLite instantiations of all store/scheduler contracts.

**Existing code disposition.** Reuse SQLite transaction/CAS patterns, not legacy tables. Use side-by-side v0.4 tables/database and reset/reseed ignored Studio data. Add a read-only legacy exporter only if external data is identified. Migrate Studio routes/UI and remaining examples/benchmarks, then delete SessionStore/SqliteSessionStore old schema and compatibility facades.

**File-level scope.** Rewrite `packages/storage/sqlite/src/index.ts` and expand `packages/storage/sqlite/tests/`; add migrations/schema/recovery and contract tests; migrate `apps/studio/src/{server,samples,executors}.ts`; migrate `examples/estate-like`, P02, and any remaining benchmark internals; remove legacy `packages/core/src/{definition,session,runtime,harness,flow,planning,loop}` units only where replacement milestones are satisfied; curate `packages/core/src/index.ts` and `packages/core/package.json` exports; update root scripts to run conformance and integration suites.

**Public API impact.** SQLite exports target store/scheduler construction only. Root core loses legacy Session/Flow/runtime exports. Studio remains non-product and transport-specific only at the app edge.

**Persistence impact.** This is the persistence implementation slice. All cross-record invariants use transactions/outbox/leases, restart scanning is deterministic, and operation deadline is stored independently of Activation wait budget.

**Tests first.** Instantiate DefinitionStore/RuntimeStore/Scheduler/Mailbox contracts against SQLite; crash after request before dispatch; crash after remote success before local result; duplicate result delivery; restarted WAITING wake; child completion delivery; confirmation persistence; terminal result atomicity; scheduler lease recovery; reference/SQLite trace equivalence at semantic IDs/outcomes.

**Acceptance criteria.** All v0.4 conformance passes in memory and SQLite; consequential Effects do not duplicate across crash windows; pending correlation/deadline survives restart; Studio uses only target APIs; no core vendor deps; no legacy Session/Flow/runtime exports, schema writes, or tests remain; P01/P02 protocols either run on target internals or are explicitly archived outside the target API.

**Cleanup unlocked.** Complete legacy deletion and remove `/compat/v0`. Delete ignored Studio legacy database after reseeding (recoverable/local developer action documented at implementation time). Remove unused dependencies and stale documentation links.

**Risk.** Freezing storage around unstable semantics, dual-writing two models, or treating queue delivery as exactly-once. Delay schema work until contracts stabilize and design for at-least-once delivery plus idempotent handling.

## 14. Ordered dependency graph and critical path

### 14.1 Dependency graph

```text
                 A Execution substrate
                         │
                         ▼
                 B Event/Effect gateway
                    ┌────┴───────────────┐
                    │                    │
                    ▼                    │
 C Workflow + model/provider foundation │
                    │                    ▼
                    └──────────────► D Agent Execution
                                      ├──► Interop proof 1
                                      │      sync MCP capability round trip
                         C ────────────┤
                                      ▼
                             E Recursive composition
                                ┌─────┴─────┐
                                ▼           ▼
                             F Memory   G Interaction
                                             └──► Interop proof 2
                                                  service/task/input mapping
                                └─────┬─────┘
                                      ▼
                         H Security/environment profile
                                      │
                                      ▼
                               I SQLite durability
                                      │
                                      ▼
                         Studio/final legacy deletion
```

The model/provider foundation is delivered at the start of C because LLM Stage needs it; D consumes and completes it for Agent/Strands portability. D can begin reference Agent work after B and the provider foundation, while C finishes Workflow barriers, but E waits for both real controllers.

F and G can proceed in parallel after E if they agree on visibility/provenance and pending-interaction records. The trusted-local environment-port shell may start in A, but H cannot claim complete security-profile conformance until authority, composition, memory, and interaction exist. SQLite implementation waits for semantic records to stabilize; storage contract tests begin earlier.

Interop proof 1 follows D and is an architecture-feedback gate, not a new kernel dependency. Interop
proof 2 follows E/G and its durable long-running cases are rerun after I. Neither proof reorders the
semantic slices or permits MCP types to leak inward.

### 14.2 Critical path

The semantic critical path is:

```text
A → B → provider foundation → C + D → E → F/G → H → I
```

The interoperability validation points are:

```text
D → synchronous capability-operation MCP import/export proof
E/G → Agent/Workflow service + Task/handle + input-required proof
I → durable rerun of long-running protocol cases
```

The following are parallel support tracks, not reasons to reorder semantics:

- contract-suite infrastructure begins in A and grows every slice;
- architecture/import/export checks begin in A/B;
- Gemini provider conformance begins in C and finishes by D;
- retrieval extraction occurs with C after the capability/resource boundary exists;
- the first MCP adapter proof starts only after D has frozen the portable operation/view/projection seam;
- later MCP features wait for the kernel semantics they map to instead of landing as one protocol-shaped batch;
- legacy examples migrate with their owning semantic slice;
- Studio migration waits until I and must not drive core APIs.

### 14.3 Slice completion gates

A slice is complete only when its target conformance is green, applicable external implementations instantiate the same contracts, at least one real scenario uses the public target path, existing unaffected tests remain green, and every superseded legacy unit has either been deleted or assigned a named deletion milestone below.

## 15. Legacy deletion milestones

| Milestone | Delete or isolate | Required proof before deletion |
|---|---|---|
| A complete | inventory old flat exports; optionally isolate them for migration | new path has zero legacy imports and one Harness/many contexts proof |
| B complete | prevent new imports of current gateway/journal for target code | new Effect durability/authorization cases cover reusable invariants |
| C consumers migrated | `flow/`, Phase types/events/state, `WorkflowCoordinator`, Flow tests | target Workflow examples cover intended behavior; P01/P02 no longer require Flow or are isolated compatibility subjects |
| C extraction complete | core `knowledge/in-memory.ts`, record-query tool generation, LangChain deps | local retrieval package tests and capability/resource conformance pass |
| D consumers migrated | current `harness/agent-harness.ts`, `loop/`, `planning/`, old compiler path | target reference+Strands Agent contracts, minimal/Strands examples, provider switch pass |
| E complete | any simulated delegation conventions | real child identity/authority/result tests pass |
| F complete | legacy memory/working-note/host-context projection/compiler modules | target memory/context confidentiality cases pass |
| G complete | `PendingAction`, kernel natural-language confirmation resolver, Session transcript ingress semantics | target RequestUserInput/message/confirmation cases pass |
| I complete | `AgentRuntime`, `SessionState`, `SessionEvent`, `SessionStore`, old SQLite tables/writes, `/compat/v0` | all repository consumers and Studio use target API; restart/crash suites pass |
| final dependency cleanup | unused legacy deps/scripts/exports and stale docs | clean manifest/import checks, typecheck, complete test matrix |

Deletion should happen in the slice that proves the replacement, not in one final mass cleanup. A temporary compatibility module must declare its consumer, owner, removal milestone, and prohibited new use. No compatibility layer may translate Flow into Stage or Session into Execution.

## 16. Risks and failure modes

| Risk | Early signal | Mitigation / test gate |
|---|---|---|
| New names over old Session machinery | target modules import legacy runtime/state; turn equals Activation | zero-legacy-import architecture test; wait/wake and response-not-terminal cases |
| Dual runtime becomes permanent | new consumers still start on old path; compatibility gains features | consumer/milestone ledger; no new feature in compatibility |
| Event/audit/trace remain one union | replay history is fed directly as delivered input | distinct types/stores and conformance that audit records cannot wake Execution |
| Controller owns operational lifecycle | controller returns `WAITING` or calls store/scheduler | narrow port/type architecture test; Harness transition unit tests |
| Response accidentally completes Agent | model end-turn maps to `COMPLETED` | explicit response-vs-completion conformance in A and D |
| Stage becomes child Execution | every LLM/function gets ID/lifecycle/mailbox | local Stage tests and Workflow identity count assertions |
| Phase semantics shape Workflow | transitions depend on Session memory/signals/turn timing | delete Flow rather than adapt; target transition/barrier tests |
| Fast Effect skips durability/auth | inline implementation calls executor first | same pre-dispatch journal/authorization assertions for fast and slow |
| Activation budget becomes operation timeout | yielded Effect reports timeout after inline window | persisted independent deadline and slow-path test |
| Store ports fragment atomic invariants | cross-store partial states after injected failures | runtime transaction aggregate and failure-injection contract suite |
| Exactly-once queue assumption | duplicate delivery corrupts barrier/pending/result | at-least-once delivery and idempotent event/result processing tests |
| Provider portability is cosmetic | Strands/Gemini bypass resolver; definitions carry model names | unchanged-definition provider-switch case and import/serialization checks |
| Feature fallback silently changes semantics | adapter ignores schema/tool requirement | required/optional negotiation and observable fallback metadata |
| Kernel retrieval ontology regrows | source-specific methods/data return to core | smallest capability/resource port and core manifest check |
| Authority equals model exposure | exposed tool automatically executable or hidden grant ignored | active-view subset and Harness denial tests |
| EffectAuthorizer becomes a tool selector | exposure resolver invokes per-request authorization or embeds policy decisions in descriptors | separate read-only effective-authority input; current Harness authorization remains decisive |
| Second operation ontology appears | Agent or MCP registry duplicates capability identity/consequentiality/schema | enrich `CapabilityCatalog` minimally and project from one semantic source |
| Model response is rebound to a new view | an alias is looked up in the current registry after the invocation returns | immutable per-invocation projection/binding snapshot and stale-view conformance |
| Context and operation selection collapse | one `ModelContext` owns memory visibility, authority, tool selection, and provider aliases | separate information compiler and operation projector; meet only at request assembly |
| Strands dispatches natively | `FunctionTool` callback reaches a gateway/executor/MCP/HTTP client | interrupt before native execution; resume only with Harness-produced observations; architecture test imports/calls |
| Projection or task IDs become credentials | lookup by ID alone authorizes invoke/settle/control | IDs are correlation only; application authentication plus current Harness authorization/settlement ingress |
| Ownership implies communication/control | parent or peer reads/cancels by ID | separate authority categories and negative composition/peer tests |
| Memory becomes all context | complete history/secret notes enter prompts | selected-view tests inspect compiled context and withheld reasons |
| Confirmation is natural-language heuristic | affirmative text directly authorizes changed payload | exact persisted evidence and supersession tests |
| Trusted-local mislabeled as sandbox | docs/UI claim containment; hostile tests falsely pass | explicit profile metadata and no isolated claims without backend |
| SQLite schema freezes too early | migrations churn while semantic types change | contract tests early, adapter implementation in I |
| Legacy data drives architecture | dual-write/migration abstractions for 1 ignored Session | reset/reseed; optional narrow exporter only on evidence |
| Studio becomes product authority | HTTP/UI requirements alter kernel ports | migrate last; keep app-specific policy/transport outside core |
| Test count hides semantic gaps | all legacy tests green but no Execution conformance | target conformance required for every slice and deletion |

## 17. Remaining human decisions

### Not blocking Slice D

No unresolved human decision blocks Slice D. The post-Slice-C audit settles the required ownership
direction: enrich the existing catalog minimally; give the Harness/runtime effective operation
authority; derive Active Views through deterministic narrowing; snapshot each invocation projection;
keep information compilation independent; and keep all Strands/native execution behind semantic
outcomes and the Effect gateway. Exact type and package names remain implementation choices.

The following intentionally remain open and must not acquire permanent APIs incidentally:

| Decision | Earliest trigger | Safe default until then |
|---|---|---|
| Broad nonblocking Effect semantics beyond the v0.4 fast/slow model | a concrete controller scenario cannot be represented by pending Effect + Event | do not add; use the canonical pending/WAITING path |
| Detached children | product requirement for children outliving creator/caller scope | scoped owned children only; no detach flag |
| Working Note commit/fork behavior | Slice F scenario requires deliberate propagation beyond views | no automatic commit/fork/upward propagation |
| Richer Stage results | a Workflow case cannot use the canonical text-or-none result plus memory/artifact/effect refs | keep text-or-none; Execution terminal results remain independent |
| Additional Adapter attachment points | a concrete Agent/Workflow integration needs one | only input/output points required by C/D |
| Isolated backend selection | hostile uploaded/arbitrary code enters product scope | trusted-local profile with explicit no-containment claim |
| Exact local model backend | a deployment selects and funds a local target | preserve provider extension contract; choose none |
| Distributed scheduler/runtime topology | a measured deployment needs multi-node operation | local logical scheduler port and durable outbox; no distributed promises |
| Environment backend package structure | an actual backend is selected | keep only core port/reference trusted-local implementation |

### Decisions required before later destructive or product-specific work

1. **Before deleting old SQLite support in Slice I:** confirm whether any external/user-owned legacy databases exist. Current repository evidence says no general migration is warranted.
2. **Before claiming hostile-code containment in Slice H or later:** select a concrete isolated backend and threat model for review. Do not create a placeholder environment package as a substitute.
3. **If the Strands model-provider bridge spike shows the framework cannot honor the stable provider contract without semantic loss:** choose explicitly between limiting Strands to a documented optional native-provider extension or not offering Strands for that provider. Do not weaken the core provider boundary by default.

None of these decisions should delay Slice D reference implementation. The Strands pause/resume
spike is a Slice-D acceptance checkpoint; failure limits the optional Strands executor rather than
blocking the reference Agent semantics.

## 18. Recommended next implementation task

> **Superseded by the post-canonical-rewrite audit (2026-08-31).** Slice D.0 is no longer the next
> task. The next task is **Slice C.1 — controller-local asynchronous resumption**, described
> immediately below. Slice D.0 (§18.2) follows it unchanged.
>
> **Both are now implemented (2026-09-01).** C.1 landed at commit `14d74ab`; D.0 landed on top of it.
> The next task is the narrow synchronous MCP operation proof described under "Interoperability
> proof 1", or Slice E — not anything in §18.

### 18.1 Slice C.1 — controller-local asynchronous resumption

One reviewable change, in `packages/core`, that gives the runtime a controller-local suspension seam
and moves Workflow model invocation onto it. It implements no Agent semantics and no MCP.

**Why it is first.** The Agent controller's central loop is *model call → interpret → act*. With no
controller-local suspension in the substrate, the reference Agent would be written with
`await provider.generate` inside its Activation and would inherit the defect in the exact place v0.4
exists to prove correct. Building D first means rewriting D's loop immediately afterwards.

**The three surfaces of the defect.**

```text
ports/controller.ts
  ControllerNext = continue | await_event | complete | fail
  no way to report "suspended on controller-local work"

execution/context.ts + interaction/event-envelope.ts
  waitingFor: WakeCondition | null      Event-kind + correlationId only
  runtime/event-router.ts is the only WAITING -> READY path, and it requires a mailbox append
  so a controller that wanted to yield could only do so by inventing an Event

controllers/workflow/model-access.ts  ->  llm-stage.ts, adapters.ts
  await provider.generate(...) inside the Activation
  runLLMStage loops over up to maxModelPhases provider round trips in one Activation
  the scheduler claim is held for the whole provider latency
```

**Scope.**

1. Add `ControllerResumption` as its own record type and its own `RuntimeTransaction` facet. It is
   not a `PendingOperation`: it has no `effectId`, no `effectKind`, no idempotency key, no
   `unknown` outcome, and no `resultEventId`. Record the `ExecutionContext.revision` the suspending
   Activation read — a field with no policy attached in v0.4, so v0.5's stale-continuation rule has
   something to check without a record migration.
2. Widen `ExecutionContext.waitingFor` from `WakeCondition | null` to a dependency union covering an
   Event condition or a controller-local resumption. This is the one non-additive type change; the
   rest is additive.
3. Add one `ControllerNext` status for controller-local suspension, and a **separate transient
   controller-local resumption port** through which a controller registers async work and receives
   settled outcomes. The controller supplies an opaque thunk and a stable key; the Harness owns the
   race, the tracking, the record, and the wake, and never interprets the result.

   This must **not** be an `ActivationInput` field. `ActivationInput` is frozen pure data containing
   exactly `activation`, `definition`, `events`, `execution` and no functions at any depth, and the
   controller-boundary suite asserts that structurally. A value that can start work is not pure
   data, so a field would have traded a checkable invariant for one uniform parameter.

   Implemented instead as a second argument to the controller activation boundary:

   ```ts
   activate(
     input: ActivationInput,
     resumptions: ControllerResumptionScope,
   ): Promise<ActivationOutcome> | ActivationOutcome
   ```

   The scope is bound to one Execution and one Activation and exposes exactly one method,
   `run(key, thunk) -> settled | failed | suspended`. It is the only live capability a controller
   receives, and it carries no `RuntimeStore`, `Scheduler`, `Harness`, lifecycle setter, mailbox
   mutation, Effect requester/processor, `EffectAuthorizer`, `CapabilityExecutor`, settlement entry
   point, authority mutator, or `InlineWaitBudget`. Controllers with no slow local work ignore the
   parameter. It is deliberately not a general controller "runtime context".
4. Settle resumptions through a processor that mirrors `EffectProcessor`'s mechanism — the same
   `InlineWaitBudget.race`, the same follow-the-promise `track`/`drain`, the same commit-then-wake
   ordering — while sharing none of its semantics. Settlement writes the record and transitions
   `WAITING -> READY` in one transaction, with **no mailbox append, no Event, and no Effect-journal
   entry**. There must be no public settlement ingress for a resumption; a caller who could settle
   one could fabricate a model result.
5. Move `runLLMStage` and the LLM Adapter path in `runAdapterChain` onto the primitive, keyed by
   coordinates that already exist in control state (stage id, visit, phase / adapter index) so the
   key is stable across Activations. `invokeStageModel` itself stays as written — it becomes the
   thunk body. Its file header, which currently asserts that model inference "returns to the
   controller inside the same Activation", must be corrected.
6. Restrict interleaving deliberately: an Execution suspended on a resumption waits on that
   resumption and nothing else, so no Event can produce a second Activation while the continuation
   is outstanding. This is what makes v0.4 free of stale-continuation risk, and it must be an
   asserted property rather than an accident of the current controller.

**Out of scope.** `ModelProvider` and `ModelResolver` are unchanged. The scheduler is unchanged.
Workflow topology, barriers, transitions, Stage semantics, Adapter effect-freeness, and
`LocalResource` are unchanged. No unified `Suspension` abstraction (see
[`../../future-plan.md`](../../future-plan.md) §1.1). No durable resumption recovery. No stale-merge
machinery. No Agent, no memory, no child composition, no MCP.

**Sharpest risk.** An input-Adapter suspension occurs *during* a Stage transition, when the next
Stage's control state is only half installed. `runAdapterChain` is called from both `enterStage` and
`step`; the resumable form must commit a control state that either Activation can re-enter without
re-running an Adapter that already ran.

**Tests first.**

- Fast/slow equivalence for a Workflow LLM Stage: same definition, same digest, same resolved
  provider/model, same messages, same Stage result, same transition, same terminal result. Only the
  Activation count and whether `WAITING` was entered may differ.
- The same for an LLM Adapter, in both input and output position.
- A slow model completion appends nothing to the mailbox: the Execution's Event list is byte-identical
  to the fast run's, and its Effect journal is unchanged.
- A resumption creates no `PendingOperation` and consults no `EffectAuthorizer`.
- An Execution suspended on a resumption is not woken by an arriving `external.input`; the Event is
  queued and the Execution stays `WAITING` until the resumption settles.
- A provider that rejects settles the resumption as failed and produces a Stage failure, not an
  Execution-level `capability.failed` Event.
- Two Executions, one suspended on a slow model call, the other runnable: the second is activated
  while the first is `WAITING`. This is the property the current code cannot satisfy.
- Architecture: controller modules still reach no `RuntimeStore`, `Scheduler`, `EffectAuthorizer`,
  `CapabilityExecutor`, `settleEffect`, or `ports/inline-wait.ts`.
- The full 441-test suite, the 8 benchmark-subject tests, and typecheck stay green.

**Done when** a Workflow LLM Stage whose provider takes arbitrarily long yields its Activation,
lets another Execution run, resumes the same Stage at the same phase, and produces a result
indistinguishable from the fast path — with no Event, no PendingOperation, and no Effect anywhere in
the record.

### 18.2 Slice D.0 — Agent operation exposure and projection skeleton

> **Implemented (2026-09-01), then retrofitted the same day.** The task below is done; the shapes it
> deliberately left unfrozen are recorded in
> [`010-slice-d0-implementation-decisions.md`](010-slice-d0-implementation-decisions.md), along with
> the D.0.1 review retrofit that followed it. The section is retained as the task specification it
> was, not as outstanding work.
>
> The next task is **not** the MCP proof. The sequence is:
>
> ```text
> Slice D.0 implementation                done
>         ↓
> post-D 009 review / D.0.1 retrofit      done
>         ↓
> Slice D accepted                        pending architecture review
>         ↓
> behavioural Agent baseline              first cases landed, tests/evals/agent/
>         ↓
> narrow synchronous MCP operation proof  next
> ```

Implement this as one reviewable change **after** §18.1, before the open-ended loop is allowed to
dispatch anything. Its model invocation uses the §18.1 primitive.

The task should:

1. replace generic `AgentSpec` with logical model, instructions, bounds, Adapter declarations used now,
   and a compact operation-exposure request that contains refs/groups rather than descriptors or grants;
2. enrich `CapabilityOperationDescriptor` only with stable descriptive/model-projection facts required
   by the first Agent call;
3. replace the operation-authority and Active-View deferred placeholders with a compact read-only
   authority ref/record and deterministic `ActiveOperationViewResolver`;
4. add `ModelOperationProjection` with immutable bindings and a resolver that accepts only that
   projection snapshot;
5. keep information context compilation independent, then assemble both branches into the provider
   request;
6. implement a one-step reference `AgentExecutor` that returns semantic response/operation-call
   outcomes and has no Effect requester or execution backend;
7. make `AgentController` resolve the returned call through its exact projection and return an
   ordinary typed Effect proposal for Harness handling;
8. write failing conformance for authority narrowing, deterministic exposure, stale projection
   stability, unknown aliases, Harness reauthorization, and ID non-authority;
9. add the Strands bridge spike only after the reference boundary passes, proving provider bridging,
   interrupt-before-tool, JSON snapshot/resume, observation-only callbacks, multi-call behavior,
   cancellation, and no native dispatch;
10. run the complete repository test suite, benchmark-subject suite, and typecheck without modifying
    Slice-C Workflow semantics or importing MCP/Strands/provider types into core.

The task is done when a model can select an authorized portable operation through a stable
invocation projection, the controller can propose the corresponding `UseCapability`, and the
Harness can still deny it from current authority. It must not implement MCP, recursive composition,
memory, messaging, human input, sandboxing, durability, large-catalog retrieval, or an LLM-based
operation selector.
