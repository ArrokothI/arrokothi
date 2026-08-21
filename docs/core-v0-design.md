# Agent SDK — Core v0.2 Design

**Status:** implemented
**Date:** 2026-08-21
**Scope:** mental model, planning, knowledge, flow, memory provenance, and tool authority

## 1. Thesis and boundary

The SDK keeps semantic work and authority separate:

```text
LLM proposes.
Runtime validates and authorizes.
Executor acts.
ToolResult says what actually happened.
Session remembers.
```

`core/` is an importable kernel. It contains no database, web routes, application credentials,
provider SDK, production integration, or application-specific transport. Stores, model providers,
and tool executors are injected.

The one deliberate dependency change in v0.2 is document Knowledge:

- `@langchain/core` supplies `Document` and `BaseRetriever`;
- `@langchain/textsplitters` supplies `RecursiveCharacterTextSplitter`.

All LangChain imports are localized to `core/src/knowledge/in-memory.ts`. Harness, ContextCompiler,
Session, Flow, Memory, and Tools consume SDK-owned types only. LangChain is not the agent runtime.

## 2. Turn lifecycle

```text
AgentDefinition
    ↓
load durable SessionState from snapshot + later events (or all events)
    ↓
append UserMessageReceived and validated HostContextObserved
    ↓
resolve an existing frozen PendingAction, if any
    ↓
Harness pass 1: Interpret + Plan
    ├─ candidate structured-memory writes
    ├─ working-note proposals
    ├─ semantic routing signals
    └─ explicit document_search / record_query requests
    ↓
runtime commits/rejects memory and applies pre_response Flow
    ↓
runtime validates and executes retrieval requests
    ↓
ContextCompiler receives already-retrieved KnowledgeResult[]
    ↓
Harness pass 2: response model + bounded reactive tool loop
    ↓
append AssistantMessageEmitted and atomically persist the turn
```

A normal rich-agent turn performs one planner call and at least one response call. Tool round trips
may add response calls, bounded by `maxSteps` and `maxToolCallsPerTurn`. A trivial or conclusively
deterministic plan skips the planner model. A valid plan may contain zero retrieval operations.

## 3. AgentDefinition

`AgentDefinition` remains immutable, versioned, serializable JSON. It now includes:

```ts
interface AgentDefinition {
  id: string;
  version: number;
  name: string;
  goal: string;
  model: ModelPolicy;
  planning?: {
    mode?: "llm" | "deterministic" | "hybrid";
    model?: ModelPolicy;
  };
  globalRules?: (string | AgentRule)[];
  knowledge: KnowledgeBinding[];
  memorySchema: StructuredMemorySchema;
  hostContextSchema: HostContextSchema;
  tools: ToolBinding[];
  policies: DeterministicPolicies;
  flow?: FlowDefinition;
}
```

If `planning.model` is omitted, the main model policy is used. `AgentRuntime.planningModel` may inject
a different provider implementation. Model-call events record the provider and model actually used,
not merely the requested policy.

## 4. Durable Session

The append-only event stream remains application state/history, not disposable observability.
`AgentRuntime` is request-scoped and holds no durable cross-request state.

The original event families remain. v0.2 adds:

- `TurnPlanCreated`: strategy, resolution path, and the compact structured plan;
- `RetrievalRequestRejected`: request plus deterministic rejection code/reason;
- `KnowledgeRetrieved`: request, source ID, result IDs, scores/ranks/counts, not source contents.

The reducer projects the current TurnPlan and retrieval trace into `SessionState` for Studio
inspection. Document contents are not duplicated into events.

The correctness invariant is unchanged:

```text
resume(snapshot, eventsAfterSnapshot) === project(allEvents)
```

Snapshots are optional projections/caches. Pending actions, the idempotency ledger, memory,
working notes, phase, transcript, and tool results survive runtime/process replacement.

## 5. Interpret + Plan

Planning is a Harness strategy, not a second runtime.

```ts
interface TurnPlan {
  memoryProposals: MemoryWriteProposal[];
  workingNotes: WorkingNoteProposal[];
  signals: string[];
  retrievalRequests: RetrievalRequest[];
}
```

The LLM planner receives only:

- the latest message and a six-message recent reference slice;
- current corrected structured memory;
- current phase objective/instructions;
- effective global rules;
- model-visible host context;
- known signal vocabulary;
- a concise logical source catalog with record field schemas.

It does not receive document contents, prior retrieval results, tools-only/runtime-only context,
every historical tool result, or an authoring requirements document.

The planner may rewrite a query, resolve a conversational reference, select multiple sources, or
select no source. It does not write final conversational prose and does not plan the entire future
tool trajectory.

### Modes

- `llm` (default for rich agents): one structured planner call.
- `deterministic`: only code-injected, machine-checkable planning; `unknown` safely produces an
  empty plan.
- `hybrid`: try deterministic logic; on `unknown`, make one planner call.

The built-in deterministic strategy is intentionally conservative. It conclusively skips planning
only when no memory fields, routing signals, or knowledge sources exist. It contains no generic
semantic keyword or regex router.

Malformed structured output is rejected as `invalid_turn_plan`; memory writes and retrieval are
skipped, and the response pass continues truthfully.

## 6. Knowledge

### Source catalog

Document entries expose `id`, `title`, `description`, and `type=document`. Record-set entries expose
the same metadata plus field names/types and supported deterministic operators. Raw documents,
records, credentials, URLs, and implementation classes are absent.

### Documents

```text
DocumentSource.text
    ↓
LangChain Document
    ↓
RecursiveCharacterTextSplitter
    ↓
LangChain Document chunks
    ↓
LocalLexicalLangChainRetriever extends BaseRetriever
    ↓ invoke(query)
SDK KnowledgeChunk[]
```

Defaults are `chunkSize: 1000` and `chunkOverlap: 200`, configurable per document source. A small
document naturally produces one chunk. Chunk IDs are stable within the source (`source#0`, etc.).

Ranking tokenizes locally, drops a small stopword set, and sums IDF-weighted query-token overlap.
Results are score-sorted with chunk ID as a deterministic tie-break. Scores are meaningful only
within one retrieval call.

No embedding model, embedding API, vector database, hosted retrieval service, reranker, or network
lookup is used.

`KnowledgeProvider` is the Harness boundary. A future BM25, embedding, vector-store, hybrid, hosted,
or provider-managed implementation can replace document retrieval without changing Harness,
ContextCompiler, Session, Tools, or Flow.

### Record sets

Record sets never pass through LangChain or document similarity:

```text
planner RecordQuery
    ↓
runtime source/kind/scope/limit checks
    ↓
SDK record schema + operator validation
    ↓
deterministic filter/sort/limit/count
```

Numeric comparisons require numeric fields and finite numeric values. Unknown fields and invalid
operators are errors, never misleading empty result sets. There is no arbitrary SQL path.

Planned queries and the optional reactive record-query tool call the same `KnowledgeIndex.queryRecords`
engine.

## 7. ContextCompiler

`compileContext` accepts `retrievedKnowledge?: KnowledgeResult[]`. It has no provider/index parameter,
performs no I/O, and cannot retrieve.

Response context is assembled from:

- concise goal and one effective rule set;
- current phase;
- corrected structured memory and provenance labels;
- model-visible host context;
- explicitly retrieved evidence;
- authoritative current-turn ToolResults;
- live, unverified working notes;
- pending action when relevant;
- a small transcript window.

Document chunks per search, record rows per query, retrieval-request count, and total evidence
characters are bounded by deterministic policies. `tools_only` and `runtime_only` host values remain
outside planner and response context.

## 8. Memory provenance

Structured memory separates four concepts:

```ts
type MemoryWriteMechanism = "planner_proposal" | "runtime_observation";
type MemoryProvenanceKind =
  | "user_claimed"
  | "tool_verified"
  | "host_provided"
  | "model_inferred";

interface MemoryProvenance {
  kind: MemoryProvenanceKind;
  sourceEventIds: string[];
  sourceName?: string;
}
```

Authority is field policy, not a model-selected property and not a synonym for confidence.
Planner-extracted user facts cite the exact `UserMessageReceived` event. Tool facts configured with
`writeToMemory` cite `ToolExecutionSucceeded`. Host values carry the accepting
`HostContextObserved` event ID in projected state.

Model inference is advisory unless a field both permits `model_inferred` writes and explicitly sets
`allowModelInferredAuthority: true`. Normal planner output has no provenance/authority field, so it
cannot self-grant authority. Corrections replace the current value while preserving the previous
value and event trail.

## 9. Rules and Flow

```ts
interface AgentRule {
  id: string;
  text: string;
  kind: "invariant" | "default";
}
```

Legacy string rules are treated as invariants. A phase can list `overrideRuleIds`, but only for
named defaults. Unknown IDs and attempts to override invariants are definition errors. The compiler
removes overridden defaults and emits one effective rule section rather than relying on prompt
ordering to resolve contradictions.

Runtime invariants—schemas, numeric bounds, secret visibility, phase scopes, typed authority,
confirmation, and idempotency—remain mechanical and are never prompt-overridable.

Flow remains optional and coarse. `pre_response` transitions run after memory validation and before
retrieval/response; `action_result` transitions run after authoritative tool results. Ordinary
conversation does not advance phases by itself.

## 10. Tools and confirmation

The injected architecture remains:

```text
ToolDefinition → Runtime authorization → ToolExecutor → authoritative ToolResult
```

For `external_side_effect` tools, every possible argument declares one policy:

```ts
type ToolArgumentPolicy =
  | { kind: "authoritative_value"; sources: ToolArgumentSource[] }
  | { kind: "model_composed" };
```

Sources are explicit paths such as `memory.contact_name`, `host_context.account_id`, or
`tool_fact.customer_id`. Values use typed equality: normalized whole-string equality for strings,
numeric/boolean identity, and structural arrays. Substring coincidence is never authority. Working
notes are not searched. Confirmation cannot turn an unsupported argument into an authoritative one.

PendingAction remains frozen and durable: request ID, validated args, args hash, and prompt. A clear
confirmation grants only that exact payload. Changed arguments require a new confirmation. The
conservative confirmation resolver retains the GAP-005 adversarial regression.

ToolResult remains authoritative. `{ ok: false }` is rendered as failure and never entered into the
successful-effect ledger.

## 11. Resource limits

Core enforces conservative defaults:

| Policy | Default |
| --- | ---: |
| `maxSteps` | 6 |
| `maxToolCallsPerTurn` | 4 |
| `maxRetrievalRequests` | 4 |
| `maxDocumentChunks` | 4 |
| `maxRecordRows` | 20 |
| `maxKnowledgeChars` | 12,000 |

These are approximate safety budgets, not token-perfect accounting.

## 12. Explicitly not in v0.2

Skills, dynamic skills, multi-agent workers, LangGraph, LangChain Agents/Chains, agent
self-modification, permanent learning, embeddings, vector databases, hosted RAG, semantic reranking,
graph RAG, parent-child retrieval, arbitrary workflow code, arbitrary SQL, production auth, billing,
and deployment infrastructure.
