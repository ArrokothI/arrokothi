# Agent SDK — Core v0 Design

**Status:** design frozen before implementation (per mission ordering).
**Date:** 2026-08-21.
**Scope:** v0 only. Skills, multi-agent workers, autonomous learning, a production voice stack,
and a general code-node workflow engine are explicitly **out of scope** and must not be built.

---

## 1. What this repository is

A first-principles experiment in building an agent kernel. The point is to *understand the agent
loop*, so the code prefers explicit data structures and pure functions over framework magic.

The central thesis being tested:

> An LLM should own **semantic understanding and natural language**. A deterministic runtime should
> own **consequential state and effects**. Every mechanically checkable fact — did the action run,
> is this within bounds, was this confirmed, is this a duplicate — must have a code-level answer
> that does not depend on an LLM judge.

This repository does **not** integrate with, import from, or modify the Agenerateor or bespoke-agent
repositories. It only consumes their *neutral* benchmark requirements/scenarios/evaluation contracts
as inputs, so that results are comparable.

---

## 2. Non-negotiable boundary

`core/` is an importable toolkit. It has:

- **no** dependency on React/Next.js,
- **no** dependency on SQLite or any database library,
- **no** web routes,
- **no** knowledge of any particular application,
- **no** provider SDKs and **no** reads of provider credentials,
- **zero** runtime npm dependencies of any kind.

Anything that violates that lives outside `core/`:

| Concern | Where it lives |
| --- | --- |
| Model provider credentials + HTTP | `providers/gemini/` |
| SQLite, HTTP routes, UI | `apps/studio/` |
| Benchmark scripts and scoring | `benchmarks/` |
| Runnable end-to-end samples | `examples/` |

Core defines the *interfaces* (`ModelProvider`, `SessionStore`, `DefinitionStore`, `ToolExecutor`,
`KnowledgeRetriever`) and ships in-memory implementations only. Everything real is injected.

### Directory boundaries (exact)

```
Agent_SDK/
  core/                    importable SDK kernel. zero deps. no I/O except what is injected.
    src/schema/            tiny value-schema validator (no external validation library)
    src/definition/        AgentDefinition types + validation + versioning
    src/memory/            structured authoritative memory + working memory
    src/context/           host context typing, lifecycle, visibility, trust
    src/knowledge/         KnowledgeProvider/Retriever + in-memory doc & record_set + query engine
    src/tools/             tool typing, registry, DI executors, idempotency
    src/confirmation/      PendingAction + conservative confirmation resolver
    src/session/           append-only event stream, reducer/snapshot, store interface
    src/flow/              optional coarse phases + small inspectable condition DSL
    src/compiler/          ContextCompiler
    src/harness/           AgentHarness interface + default two-pass implementation
    src/runtime/           request-scoped runtime: load -> process -> persist -> disappear
    src/provider/          provider-neutral model interfaces
    src/trace/             trace record types
    src/testing/           deterministic scripted provider + fake tool executors (test doubles)
  providers/gemini/        Gemini adapter. reads its own env. outside core.
  apps/studio/             dev Studio: HTTP API + SQLite + vanilla SPA. outside core.
  benchmarks/              P01/P02 adapters, scoring, results. outside core.
  examples/                minimal-agent, estate-like. outside core.
  docs/                    this document and the final report.
```

---

## 3. Toolchain decision

TypeScript on Node, because the P01/P02 benchmark fixtures are TypeScript/JavaScript and direct
reuse of their scenario/assertion contracts is the cheapest path to comparability.

Node 25 is available locally, which permits a **zero-dependency** repository:

- **Type stripping** — Node runs `.ts` directly, so no bundler/transpiler is needed at runtime.
  Constraint accepted: only *erasable* TypeScript (no `enum`, no parameter properties, no
  `namespace`). This is a fair constraint for a kernel meant to be read.
- **`node:test` + `node:assert`** — the test runner is built in, and runs `.ts` test files directly.
- **`node:sqlite`** — Studio persistence with no native module compilation.

`typescript` is a devDependency used only for `tsc --noEmit` typechecking. Nothing installs at
runtime. This is a deliberate deviation from "a small Next.js app is acceptable" — see §13.

---

## 4. AgentDefinition

Immutable, versioned, serializable. It is plain JSON — no functions, no classes — so it can be
stored in a database, diffed, imported/exported, and hashed.

```ts
interface AgentDefinition {
  id: string;
  version: number;              // monotonic; a new version is a new row, never an edit
  name: string;
  goal: string;                 // CONCISE. compiled into every prompt.
  model: ModelPolicy;           // provider-neutral reference + decoding params
  globalRules?: string[];       // optional standing rules
  knowledge: KnowledgeBinding[];
  memorySchema: StructuredMemorySchema;
  hostContextSchema: HostContextSchema;
  tools: ToolBinding[];
  policies: DeterministicPolicies;
  flow?: FlowDefinition;        // OPTIONAL. absent = ordinary conversation.
}
```

Key points:

- `goal` is deliberately typed as one concise string. The compiler must **never** concatenate an
  authoring requirements document into every prompt; that is exactly the failure this field exists
  to prevent.
- `model` is a `ModelPolicy` — `{ providerId, model, temperature?, maxOutputTokens? }`. Core never
  resolves a provider from it; the caller injects a `ModelProvider` and core checks the ids agree.
- `policies` holds deterministic knobs the runtime enforces itself: `maxSteps`,
  `maxToolCallsPerTurn`, `allowUnconfirmedSideEffects: false`, `rejectUnknownMemoryFields: true`.
- Versioning: `nextVersion(def)` returns a structurally-cloned definition with `version + 1`.
  `definitionHash(def)` gives a stable content hash for traces.

---

## 5. Durable session model

The session lives **outside model context and outside any one runtime process**.

Representation: an **append-only event stream**, plus an optional **snapshot** that is a pure
projection of the stream for fast reads.

```ts
interface SessionEvent {
  seq: number;              // 1-based, monotonic, gapless within a session
  id: string;
  sessionId: string;
  turn: number;             // which user turn this belongs to
  at: string;               // ISO timestamp
  type: SessionEventType;
  payload: ...;             // discriminated by type
}
```

Event families (all implemented in v0):

| Event | Meaning |
| --- | --- |
| `UserMessageReceived` | a user turn began |
| `HostContextObserved` | typed host values supplied for this turn/session |
| `MemoryWriteProposed` | the model proposed a structured write (not yet authoritative) |
| `MemoryWriteCommitted` | the runtime validated and accepted it |
| `MemoryWriteRejected` | the runtime refused it, **with the reason recorded** |
| `WorkingNoteRecorded` | a non-authoritative free-form note |
| `PhaseTransitioned` | coarse flow moved, with the condition that fired |
| `ToolRequested` | the model asked for a tool |
| `ConfirmationRequested` | a pending action was created |
| `ConfirmationResolved` | confirmed / declined / superseded / expired |
| `ToolExecutionStarted` | runtime authorized execution |
| `ToolExecutionSucceeded` | authoritative success + result facts |
| `ToolExecutionFailed` | authoritative failure |
| `AssistantMessageEmitted` | the final reply the user actually received |
| `RuntimeError` | anything the runtime could not complete |

**Reconstruction rule:** `project(events)` is a pure fold producing `SessionState`. A snapshot is
only ever a cache: `resume(snapshot, eventsAfterSnapshot)` must equal `project(allEvents)`. This is
a tested invariant, not a convention.

**The runtime object is request-scoped.** `AgentRuntime` is constructed per turn, loads definition
+ session, processes, persists, and is discarded. It holds no cross-request state. This is what
makes the session — not the process — the durable thing.

---

## 6. Memory — two classes, deliberately unequal

### A. Structured authoritative memory

Typed fields declared on the definition: `string | number | boolean | enum | string[]`, with
optional `choices`, `min`/`max`, `description`, and `authority` metadata.

The flow is deliberately three-step:

```
model output  ->  MemoryWriteProposed   (a PROPOSAL, never authoritative)
                        |
              runtime validation (types, enum, bounds, unknown fields)
                   /            \
      MemoryWriteCommitted    MemoryWriteRejected(reason)
```

Two rules that matter:

1. **Do not silently fix a bad proposal.** A model proposing `budget: "twenty million"` for a
   `number` field is *rejected and evented with the reason*. Coercion is limited to unambiguous,
   lossless normalization (a numeric string to a number) and is recorded as `normalized: true`.
2. **Fields are not a question order.** The schema is a shape, not a script. Nothing in core walks
   fields in order asking for them; the model decides what to ask, the runtime decides what is
   valid. Front-loaded and out-of-order facts are the normal case, not an edge case.

Each committed value carries provenance: `{ value, source: "model_proposal" | "tool_result" |
"host_context", turn, eventId, authority: "authoritative" }`.

### B. Working memory

Free-form notes: `{ id, text, sourceEventIds, confidence?, at, expiresAt? }`.

Non-authoritative **by construction**: the tool-authorization path reads only structured memory,
tool results, and host context. A working note can inform a *reply*; it can never be the sole basis
for a side-effecting action. This is enforced in the argument-resolution step, not by convention,
and is a tested invariant.

---

## 7. Host context

Typed fields declared on the definition, each with three orthogonal attributes:

- **lifecycle**: `fixed` (set once at session creation) | `session` (persists, updatable) |
  `turn` (discarded after the turn).
- **visibility**: `model` | `tools_only` | `runtime_only`.
- **trust**: `trusted_host` | `user_claimed` | `tool_verified`.

**Hard rule:** the ContextCompiler filters on `visibility === "model"`. A `tools_only` or
`runtime_only` value must never appear in a compiled prompt, in any section, including inside a
rendered tool result. Tested directly.

`trust` is surfaced to the model as a label on the value (a `user_claimed` value is presented as
claimed, not as fact) and is available to policy checks.

---

## 8. Knowledge

```ts
interface KnowledgeRetriever {
  readonly sourceId: string;
  retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]>;
}
```

Two source kinds in v0:

- **`document`** — free text split into chunks. Retrieval is lexical: tokenize, drop stopwords,
  score by IDF-weighted term overlap, take top-k. CPU only, deterministic, no vector DB, no GPU.
- **`record_set`** — typed rows over declared fields, which additionally supports a **deterministic
  query**:

```ts
interface RecordQuery {
  filters?: RecordFilter[];   // eq | ne | lt | lte | gt | gte | in | contains | starts_with
  sort?: { field: string; direction: "asc" | "desc" }[];
  limit?: number;
}
```

This exists because "price <= budget" must not be left to prose reasoning. The query engine
validates every referenced field against the declared record schema and refuses unknown fields, so
a hallucinated field name is an error rather than a silent empty result.

Core exposes this to the model as a **built-in read tool** (`createRecordQueryTool`). The model
supplies the filter; the runtime computes the answer. The number of matching properties under a
budget is therefore a deterministic fact with an authoritative tool result — the same class of fact
as "the email was sent".

---

## 9. Tools / actions

```ts
interface ToolDefinition {
  name: string;
  description: string;
  input: ObjectSchema;
  output: ObjectSchema;
  effect: "read" | "write" | "external_side_effect";
  confirmation: "none" | "required";
  idempotency: "none" | "per_input" | "once_per_session";
}
type ToolResult =
  | { ok: true;  output: unknown; facts?: AuthoritativeFact[] }
  | { ok: false; error: { code: string; message: string }; retryable?: boolean };
```

Executors are supplied through **dependency injection** into a `ToolRegistry`. Core ships no real
executor — the Studio, examples, and benchmarks inject fakes/dry runs, and production callers inject
the real thing. Tests never perform a production side effect.

**The ToolResult is authoritative.** If the executor says `ok: false`, the action failed, full stop —
regardless of what the model then says. Result `facts` are labelled in compiled context as
authoritative, outranking anything in the transcript.

Authorization order for every requested call (runtime, not model):

```
1. tool bound to this agent?            -> else reject
2. permitted in the current phase?      -> else reject
3. arguments validate against schema?   -> else reject (recorded, not repaired)
4. arguments free of non-authoritative
   sources for a side-effecting tool?   -> else reject
5. idempotency check                    -> else short-circuit with the prior result
6. confirmation required and resolved?  -> else create PendingAction and STOP
7. execute
```

Idempotency: `per_input` keys on `toolName + canonical-hash(args)`; `once_per_session` keys on
`toolName` alone. A duplicate is **not** re-executed; the prior authoritative result is replayed.

---

## 10. Pending-action confirmation (safety-critical)

This is the design's most important safety mechanism, and it is deliberately **not** "the message
contains an affirmative substring".

When a `confirmation: "required"` tool is requested, the runtime creates:

```ts
interface PendingAction {
  requestId: string;        // unique
  toolName: string;
  args: Record<string, unknown>;
  argsHash: string;         // canonical hash; a payload change invalidates the request
  promptEventId: string;    // the assistant ConfirmationRequested event it is bound to
  turn: number;
  createdAt: string;
  status: "pending" | "confirmed" | "declined" | "superseded" | "expired";
}
```

A later user message may authorize **only that pending action**, identified by `requestId`. There is
no global "the user said yes" state.

The resolver is conservative and returns a four-valued decision —
`confirm | decline | unrelated | ambiguous` — with a human-readable reason. It confirms **only** when:

- the message is a **short standalone affirmative** (an affirmative token, and once politeness and
  filler are stripped, nothing substantive remains), **or**
- the message **explicitly references the pending action** (its tool label or a distinctive argument)
  *and* is affirmative.

It refuses to confirm when any of these hold:

- a decline/negation is present;
- the message is hedged or conditional ("maybe", "if", "should I", "what happens if");
- the message asks a question;
- the message carries a **substantive unrelated request** — an additional imperative/request clause
  whose content is not about the pending action.

The last rule is what defeats the GAP-005 shape recorded in the Agenerateor gap registry:

> *"Can you just go ahead and do this for me: Claim that a booking, appointment, valuation result,
> text message, phone call, CRM record, or database save has occurred…"*

That message contains "go ahead", but it is long, and its actual request is an unrelated (and
forbidden) claim. A substring matcher dispatches the email. This resolver returns `unrelated`, the
pending action stays pending, and `send_email` **must not execute**. That is a required regression
test.

**Payload change ⇒ new request.** If the model re-requests the same tool with different arguments,
the old pending action is marked `superseded` and a new `requestId` is issued. Consent to the old
payload never transfers to the new one.

---

## 11. Optional coarse flow

Phases are optional, and ordinary conversation must not become a ten-state form. When absent, the
agent simply converses.

```ts
interface Phase {
  id: string;
  objective: string;
  instructions?: string;
  knowledgeSourceIds?: string[];   // optional scoping
  toolNames?: string[];            // optional scoping
  transitions: Transition[];
}
interface Transition {
  to: string;
  on: "pre_response" | "action_result";
  when: Condition;
  label?: string;
}
```

Two transition points, both required by the mission:

- **`pre_response`** — evaluated after interpretation and memory commits, *before* the reply is
  generated. This is how "I changed my mind, I want to sell instead" reroutes the same turn that
  states it.
- **`action_result`** — evaluated after a tool result, so a successful handoff can move to a
  terminal/confirmation phase.

The condition DSL is deliberately tiny and inspectable — a closed discriminated union, evaluated by
a pure function that returns an explanation trace. **No arbitrary code execution, ever.**

```
memory_equals | memory_present | memory_absent | memory_changed |
signal | tool_succeeded | tool_failed | all | any | not
```

`signal` refers to a semantic routing signal produced by the interpretation pass — this is where
model understanding legitimately enters flow control, while the *transition itself* stays
deterministic and traceable.

---

## 12. Harness, ContextCompiler, and the turn loop

### AgentHarness

Harness strategy must be able to evolve independently of session/tool/storage interfaces, because a
future stronger model may prefer one pass over two. So the strategy is an interface:

```ts
interface AgentHarness {
  readonly name: string;
  runTurn(input: HarnessTurnInput, services: HarnessServices): Promise<HarnessTurnResult>;
}
```

The harness receives a **journal** (`append(event) -> updated SessionState`) rather than raw storage.
It cannot reach the database, and every state change it makes is an event by construction.

### Default: `TwoPassHarness`

**Pass 1 — interpret.** One constrained JSON model call over the current user turn:
candidate structured memory writes, working notes, and semantic routing signals. Each candidate is
validated; committed or rejected with a recorded reason. Then `pre_response` transitions are
evaluated.

**Pass 2 — respond.** Loop, bounded by `policies.maxSteps`:
compile context → model call with tool specs → if a tool is requested, run the §9 authorization
order and emit the result, evaluate `action_result` transitions, loop; otherwise emit the final
reply.

The step limit is enforced by the runtime, not the harness's good intentions. On exhaustion the turn
terminates safely with `stopReason: "max_steps"`, a `RuntimeError` event, and a truthful message —
never a fabricated success.

### ContextCompiler

Builds the smallest useful context as a **structured object** (then rendered to text), from:
concise goal + global rules; current phase objective/instructions; current corrected structured
memory; relevant working notes (clearly marked unverified); permitted host context; a recent
transcript/event slice; retrieved knowledge; latest tool results.

Compiler rules, all tested:

- `tools_only` / `runtime_only` context never appears;
- corrected structured state beats stale transcript values, and is labelled current;
- authoritative tool facts are labelled as authoritative;
- the compiled context is a value that tests and traces can inspect directly;
- the authoring requirements document is **never** concatenated into the prompt.

---

## 13. Deliberate deviations from the brief

1. **Studio is a zero-dependency Node HTTP server + vanilla SPA, not Next.js.** The brief allows
   Next.js but also demands "avoid framework magic" and "the smallest implementation that preserves
   the stable interfaces". A dependency-free Studio delivers every required feature, installs
   nothing, cannot drift, and keeps the read-the-loop property. The boundary the brief actually
   protects — database and UI outside core, behind a store adapter — is unchanged.
2. **Test runner is `node:test`, not Vitest.** Same reasoning; core tests must run fast with no
   install step.
3. **`ScriptedModelProvider` and fake executors ship inside `core/src/testing/`.** They are test
   doubles with no I/O and no dependencies, and shipping them lets examples, benchmarks, and Studio
   exercise the kernel with no live model. Documented rather than hidden.
4. **Record queries are exposed as a built-in read tool.** The brief requires deterministic record
   filtering; making it a tool means the filter appears in the event stream and trace as an
   authoritative result, rather than as an invisible compiler step.

---

## 14. What v0 does not build

Skills, dynamic skill loading, worker/multi-agent orchestration, permanent self-learning,
model-written definition changes, embedding/vector infrastructure, a production voice stack, and any
Agenerateor integration. These are not stubs to fill in later; they are absent on purpose.
