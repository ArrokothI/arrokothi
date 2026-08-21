# Agent SDK v0.2 — Implementation Report

**Date:** 2026-08-21
**Status:** implemented and verified
**Version:** all workspace packages `0.2.0`

## Outcome

v0.2 evolves the existing kernel around one explicit turn pipeline:

```text
Durable Session
  -> Interpret + Plan
  -> runtime validates memory/signals
  -> pre-response Flow transition
  -> runtime validates and executes explicit retrieval
  -> ContextCompiler receives KnowledgeResult[]
  -> response model + bounded reactive tool loop
  -> runtime authorization
  -> injected executor
  -> authoritative ToolResult
  -> append-only session events
```

The authority split is unchanged and sharper:

```text
LLM proposes.
Runtime validates and authorizes.
Executor acts.
ToolResult says what actually happened.
Session remembers.
```

This is an evolution, not a runtime replacement. Durable sessions, request-scoped runtime,
confirmation, idempotency, coarse Flow, dependency-injected executors, and provider-neutral model
interfaces remain intact.

## Architecture changes

### Interpret + Plan

Harness pass 1 now emits a structured `TurnPlan` containing:

- candidate memory writes;
- working-note proposals;
- closed-vocabulary routing signals;
- zero or more discriminated `RetrievalRequest`s.

Planning remains a Harness strategy, not an independent planner runtime. Supported modes are:

- `llm`: the default for rich agents; one structured planner call;
- `deterministic`: use only injected, machine-checkable planning; `unknown` becomes a safe empty plan;
- `hybrid`: use deterministic logic when conclusive, otherwise make one planner call.

The built-in deterministic strategy is deliberately conservative. It skips the planner only when
there are no memory fields, routing signals, or knowledge sources. It does not classify semantic
intent through generic regexes, keywords, or substring lists.

Planner context is separate from response context. It contains corrected memory, the current phase,
effective rules, a small transcript slice, permitted model-visible host context, signal vocabulary,
and a concise source catalog. It excludes raw documents, record rows, retrieved evidence, restricted
host values, and historical tool-result bulk.

Malformed structured output records `invalid_turn_plan`, commits no proposed memory, performs no
retrieval, records a safe empty plan, and continues to the response pass.

### Planned Knowledge

The Harness sees only the SDK-owned `KnowledgeProvider` contract:

```ts
interface KnowledgeProvider {
  catalog(...): KnowledgeSourceCatalogEntry[];
  retrieve(request: DocumentSearchRequest): Promise<KnowledgeChunk[]>;
  queryRecords(request: RecordQueryRequest): Result<RecordQueryResult, RecordQueryError>;
}
```

The planner selects a logical source and writes a standalone document query. Runtime checks request
shape, source existence, source kind, phase/binding scope, query text, record fields/operators/value
types, and resource limits before executing it.

`KnowledgeRetrieved` events store request and compact metadata—source, IDs, scores, and counts—not
raw document contents. Invalid requests produce `RetrievalRequestRejected`.

### ContextCompiler

Hidden compiler retrieval was removed. `compileWithRetrieval` no longer exists.

`compileContext` is synchronous, receives `retrievedKnowledge`, performs no I/O, and has no provider
or index parameter. It renders one contradiction-free effective rule set and the smallest useful
response context from state, explicit evidence, current-turn ToolResults, working notes, pending
action, and a transcript window.

The deterministic evidence budget is enforced through:

- `maxRetrievalRequests` (default 4);
- `maxDocumentChunks` per search (default 4);
- `maxRecordRows` per query (default 20);
- `maxKnowledgeChars` across compiled evidence (default 12,000).

### Durable Session and provenance

New trace events are:

- `TurnPlanCreated`;
- `RetrievalRequestRejected`;
- `KnowledgeRetrieved`.

Session projection exposes the current turn plan and retrieval trace for Studio. The core invariant
still holds:

```text
resume(snapshot, laterEvents) === project(allEvents)
```

Structured memory now separates:

- write mechanism: `planner_proposal` or `runtime_observation`;
- provenance: `user_claimed`, `tool_verified`, `host_provided`, or `model_inferred`;
- authority: `authoritative` or `advisory`;
- confidence: optional metadata that never grants authority.

Planner-extracted user facts cite the exact `UserMessageReceived` event. Tool facts configured with
`writeToMemory` cite `ToolExecutionSucceeded`. Accepted host values carry their
`HostContextObserved` event ID. Model inference is advisory unless the field explicitly opts into
authoritative inferred values. Corrections still replace the current value while retaining the
prior value in the trace.

### Rules and Flow

Global rules may now be named `invariant` or `default` rules. Legacy strings remain supported and
are normalized to non-overridable invariants.

A phase may explicitly suppress a named default using `overrideRuleIds`. Definition validation
rejects an unknown rule ID or any attempt to override an invariant. Runtime invariants—schema,
visibility, phase permissions, confirmation, provenance, limits, and idempotency—remain mechanical
and are never subject to prompt precedence.

Flow remains coarse and optional. Pre-response transitions run after plan memory/signal handling and
before retrieval, so the new phase controls knowledge and tool scope on the same turn.

### Tool authorization

External-side-effect arguments now require explicit per-argument policies:

- `authoritative_value` names allowed `memory.*`, `host_context.*`, or `tool_fact.*` paths;
- `model_composed` explicitly permits the response model to compose that argument.

Authoritative matching uses normalized whole-string equality, exact number/boolean equality, and
structural array equality. The old general substring heuristic is gone. Working notes are not read
by authorization, and confirmation cannot repair missing provenance.

The rest of the authorization order remains deterministic: binding, phase scope, schema, authority,
idempotency, confirmation, executor presence, execution. The executor's `ToolResult` remains the
authoritative success/failure record.

## LangChain dependency decision

Two runtime dependencies were added to `@agent-sdk/core`:

| Package | Version | Exact reason |
| --- | --- | --- |
| `@langchain/core` | `^1.2.9` | Internal `Document` representation and `BaseRetriever` invocation seam. |
| `@langchain/textsplitters` | `^1.0.1` | Maintained `RecursiveCharacterTextSplitter` document preprocessing. |

All three LangChain imports live in `core/src/knowledge/in-memory.ts`. No LangChain type appears in
Harness, ContextCompiler, Session, Runtime, Flow, Memory, Tools, Confirmation, or public Knowledge
contracts.

Document processing is:

```text
DocumentSource.text
  -> LangChain Document
  -> RecursiveCharacterTextSplitter
  -> LocalLexicalLangChainRetriever extends BaseRetriever
  -> retriever.invoke(query)
  -> SDK KnowledgeChunk[]
```

Default `chunkSize` is 1000 characters and default `chunkOverlap` is 200 characters, configurable
per document source. Small documents naturally remain one chunk.

Local ranking tokenizes lower-cased alphanumeric terms, removes a small stopword set, and sums
IDF-weighted overlap for query tokens found in each chunk. Positive-scoring chunks are sorted by
score descending, with stable chunk ID as the tie-break. Retrieval is CPU-local and source-local.

No embeddings, embedding API, vector database, hosted RAG, ingestion service, reranker, network
retrieval, LangGraph, LangChain Agent, or automatic multi-query RAG was introduced.

Record sets remain outside LangChain. Planned record queries and the reactive record-query tool use
the same SDK engine for schema validation, numeric comparison, AND filters, sorting, limiting, and
pre-limit counts. Unknown fields and invalid operators are errors; arbitrary SQL is impossible.

## Studio, examples, and benchmarks

Studio now exposes:

- planner mode and optional planner provider/model;
- source descriptions and document chunk size/overlap;
- named rule syntax and phase default-rule overrides;
- phase knowledge scope;
- external-tool argument policy JSON;
- all four retrieval limits;
- `TurnPlan`, retrieval requests, retrieved IDs/scores/counts, effective rules, and memory provenance.

A local browser pass verified the updated definition panels and planning trace with no console
errors. It also caught and corrected a stale `experimental v0` banner to `experimental v0.2`.

The minimal and estate-like examples both run offline. Estate behavior still demonstrates a budget
correction, deterministic filtering, frozen-payload confirmation, adversarial confirmation refusal,
exactly-once dispatch, and event replay.

P01/P02 adapters remain compatible. Each scenario result now includes:

- planner model calls;
- response model calls;
- total model calls;
- retrieval-request count;
- selected logical sources;
- retrieved document chunks;
- tool calls.

Only offline adapter self-checks were run; no live model quota was spent and no external email was
sent. P01 executed all assertions for 20 scenarios; P02 did the same for 16. Their outcomes remain
correctly `inconclusive` because a self-check is not an agent-quality measurement.

## Tests added or expanded

The v0.2 coverage includes:

- structured plans and turns with zero retrieval;
- conversational-reference query rewriting;
- multi-source document plus record retrieval;
- unknown source, wrong kind, malformed discriminated request, and invalid record field rejection;
- planner-context catalog visibility and restricted-data exclusion;
- separate planner model/provider configuration and trace metadata;
- malformed structured-output degradation;
- deterministic `unknown` and hybrid fallback;
- proof that ContextCompiler cannot retrieve;
- LangChain default/configured splitting, overlap, stable SDK output shape, and record/RAG separation;
- named-rule precedence and invariant protection;
- exact user/tool event provenance and advisory model inference;
- typed side-effect source matching, array equality, substring refusal, and required policies;
- all pre-existing memory, context, confirmation, tool, flow, replay, definition, and benchmark tests.

Verification completed:

```text
npm test                  127 passed, 0 failed (30 suites)
npm run typecheck         clean
node --check app.js       clean
npm run example:minimal   passed
npm run example:estate    passed
npm run bench:p01         20/20 scenarios: every assertion executable
npm run bench:p02         16/16 scenarios: every assertion executable
Studio HTTP/API smoke     200 OK
Studio browser QA         no console errors
git diff --check          clean
```

## Files changed

The implementation is concentrated in:

- `core/src/planning/` — plan contracts, schema/parser, deterministic seam;
- `core/src/harness/` and `core/src/runtime/` — plan/retrieve/respond orchestration;
- `core/src/knowledge/` — provider-neutral contracts, LangChain-backed documents, deterministic records;
- `core/src/compiler/` — separate planner/response compilation with explicit evidence;
- `core/src/memory/`, `core/src/context/`, and `core/src/session/` — provenance and event projection;
- `core/src/definition/` and `core/src/flow/` — planner policy, resource limits, named rules, validation;
- `core/src/tools/` — typed argument-source policy and tool-fact memory writes;
- `core/tests/` — planning, Knowledge, provenance, rule, and authorization regression coverage;
- `apps/studio/` — v0.2 definition controls and trace inspection;
- `examples/` — v0.2 scripted planning and side-effect policies;
- `benchmarks/` — v0.2 Harness compatibility and metrics;
- `README.md`, `docs/core-v0-design.md`, and `docs/v0.2-migration.md` — architecture and migration guidance;
- workspace manifests and `package-lock.json` — v0.2 versions and narrow dependencies.

## Explicit answers

1. **Does a normal rich-agent turn currently perform two LLM calls?** Yes: normally one planner
   call and one response call. Reactive tool round trips may add response calls; a conclusively
   trivial/deterministic plan can skip the planner call.
2. **Which call is planner vs response?** `purpose: "plan"` is Interpret + Plan;
   `purpose: "respond"` writes the reply or requests reactive tools.
3. **Can the planner use a cheaper model?** Yes. `planning.model` may differ, and
   `AgentRuntime.planningModel` may inject a separate provider.
4. **Can a turn produce zero retrieval operations?** Yes. An empty retrieval list is normal.
5. **Does any generic semantic routing depend on regex/keyword matching?** No. Semantic routing is
   model planning or an injected genuinely deterministic strategy. The narrow confirmation resolver
   remains deterministic, but it is not a generic semantic router.
6. **Who decides which knowledge source to search?** The planner proposes the logical source; the
   runtime validates source existence, kind, scope, and limits.
7. **Who generates the document search query?** The planner, using permitted recent context to make
   a standalone query.
8. **Who performs document chunking?** LangChain's `RecursiveCharacterTextSplitter`, inside the
   default Knowledge implementation.
9. **Is document retrieval local in v0?** Yes, entirely in-memory and CPU-local.
10. **Are embeddings used anywhere?** No.
11. **Is a vector database required?** No.
12. **Does LangChain appear outside the Knowledge implementation boundary?** No. Imports are
    localized to `core/src/knowledge/in-memory.ts`, and public contracts are SDK-owned.
13. **Can LangChain retrieval later be replaced without changing Harness?** Yes. Replace the
    `KnowledgeProvider`/`KnowledgeRetriever` implementation.
14. **Are record-set numeric filters still deterministic?** Yes, and invalid field/operator/value
    combinations fail explicitly.
15. **Can ContextCompiler retrieve knowledge by itself?** No.
16. **Can a phase override a global invariant?** No. It may override only a named global default;
    invalid overrides fail definition validation.
17. **Can substring coincidence authorize a side-effect argument?** No.
18. **Is ToolResult still authoritative?** Yes, for both success and failure.
19. **Can a pending action survive runtime restart?** Yes. It is projected from durable events and
    includes the frozen payload and argument hash.
20. **Can the session still reconstruct from events + snapshot?** Yes; full replay and snapshot plus
    later-event resumption are both tested.

## Remaining v1 hypotheses

The replaceable Knowledge boundary permits future experiments with BM25, embeddings, vector stores,
hybrid retrieval, hosted/provider-managed file search, reranking, and richer split strategies. Those
remain hypotheses, not v0.2 dependencies.

Other intentionally deferred areas are model-assisted author-time rule linting, production stores
and auth, deployment/billing, retention policy, Skills, multi-agent workers, self-modification,
permanent learning, arbitrary workflow code, graph RAG, and arbitrary SQL.
