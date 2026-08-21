# Agent SDK — experimental v0.2

A small, first-principles agent kernel plus a development Studio for configuring and testing it.

The thesis:

> The LLM proposes and communicates. The runtime validates and authorizes. The executor acts.
> ToolResult says what actually happened. The durable session remembers.

This is an evolution of the original v0 kernel, not a framework rewrite. LangChain is used only
inside document Knowledge; it does not own the agent loop.

## Install and run

Requires Node 22.6+.

```bash
npm install
npm test
npm run typecheck
```

```bash
npm run example:minimal
npm run example:estate
npm run studio            # http://localhost:4321
```

The Studio uses a clearly labelled offline provider without a key. To use Gemini:

```bash
GEMINI_API_KEY=your-key npm run studio
```

Benchmark self-checks do not call a live model or spend quota:

```bash
npm run bench:p01
npm run bench:p02
```

Live runs remain explicitly opt-in:

```bash
GEMINI_API_KEY=your-key node --experimental-strip-types benchmarks/p02-estate/run.ts --live
```

## Runtime model

```text
AgentDefinition
    ↓
Durable Session
    ↓
AgentHarness
    ↓
Interpret + Plan (at most one semantic planner call)
    ├─ memory proposals
    ├─ working notes
    ├─ routing signals
    └─ explicit RetrievalRequest[]
    ↓
runtime validation
    ├─ commit/reject memory with provenance
    ├─ apply pre-response phase transition
    └─ validate source, scope, kind, schema, and limits
    ↓
KnowledgeProvider
    ├─ documents: LangChain splitting/retriever + local lexical ranking
    └─ record sets: deterministic typed query engine
    ↓
ContextCompiler (already-retrieved evidence only)
    ↓
Response model ↔ authorized tool loop
    ↓
final reply + append-only session events
```

The default rich-agent turn has two model calls:

1. `purpose: "plan"` interprets the turn, proposes memory/signals, selects sources, and writes
   standalone retrieval queries.
2. `purpose: "respond"` answers and may request reactive tools.

The planner can use a separately injected provider/model. A trivial agent or deterministic plan can
skip the planner call, and any turn may validly produce zero retrieval requests.

## Knowledge boundary

Documents are ingested as:

```text
DocumentSource.text
  → LangChain Document
  → RecursiveCharacterTextSplitter (default 1000 chars / 200 overlap)
  → local in-memory IDF-weighted lexical index
  → SDK KnowledgeChunk[]
```

Only `@langchain/core` and `@langchain/textsplitters` are runtime dependencies. LangChain imports are
localized to `core/src/knowledge/in-memory.ts`; its `Document` and `BaseRetriever` types do not cross
the SDK boundary.

There are no embeddings, vector stores, hosted retrieval calls, LangGraph, LangChain Agents,
rerankers, or ingestion servers.

Record sets never become documents. A planned `record_query` and the reactive query tool both call
the same SDK-owned deterministic engine. Numeric comparisons, exact filters, sorting, counts, and
limits are computed in code. There is no SQL generation path.

## Authority boundaries

- Structured memory separates write mechanism, origin/provenance, field authority, and confidence.
- Planner-extracted user facts cite the corresponding `UserMessageReceived` event.
- Tool-written facts cite `ToolExecutionSucceeded`; host values cite `HostContextObserved` in state.
- Model inference is advisory unless a field explicitly opts into authoritative inferred values.
- Side-effect arguments use declared source paths such as `memory.contact_name` and exact typed
  equality. Substring coincidence and working notes cannot authorize an action.
- Confirmation grants bind to the frozen PendingAction payload hash. Confirmation never repairs
  missing provenance.
- ToolResult remains authoritative about success or failure.

## Rules and flow

Named global rules are either `invariant` or `default`. A phase may explicitly override a named
default with `overrideRuleIds`; it cannot override an invariant. Invalid or unknown overrides are
definition errors. Legacy string rules remain supported and are treated as invariants.

Flow remains coarse and optional. Phases scope objectives, instructions, knowledge, and tools;
`pre_response` and `action_result` transitions remain deterministic and evented.

## Repository layout

```text
core/
  src/planning/      TurnPlan contracts, schema parsing, deterministic/hybrid seam
  src/knowledge/     LangChain-backed local documents + deterministic record queries
  src/compiler/      separate planner/response context compilation; no retrieval
  src/memory/        structured provenance + unverified working notes
  src/tools/         typed authorization, confirmation, idempotency, injected executors
  src/session/       append-only events, projection, snapshots, stores
  src/flow/          optional phases and closed condition DSL
  src/runtime/       request-scoped load/process/persist orchestration
providers/gemini/    provider adapter outside core authority
apps/studio/         SQLite development Studio and trace viewer
benchmarks/          P01/P02 adapters and offline self-checks
examples/            minimal and estate-like runnable agents
docs/                design, migration notes, and implementation report
```

See [the v0.2 design](docs/core-v0-design.md), [migration notes](docs/v0.2-migration.md), and
[implementation report](docs/final-report.md).
