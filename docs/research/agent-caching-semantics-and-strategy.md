# Agent Caching: Semantics, External Patterns, and ArrokothI Design Guidance

> **Current disposition (2026-09-08):** see [future questions](../future-plan.md) Q6 and the [mental-model reference index](../../mental-model/reference.md). The sketches and captured protocol/provider observations below remain research. Old Harness/resumption/memory ownership and prototype sequences do not override the opaque Runtime target or schedule work.

> **Status: focused non-canonical research note.**
>
> This document compares external caching patterns and derives implementation guidance for ArrokothI. It does **not** redefine current kernel semantics. Canonical ownership remains with [authority detail](../../mental-model/mechanisms/authority.md), [state/memory detail](../../mental-model/mechanisms/state.md), [Kernel](../../mental-model/kernel.md), and the other documents indexed by [`../README.md`](../README.md).
>
> Research date: **2026-09-02**.

## 1. Executive conclusion

The useful question for ArrokothI is not whether an Agent system "has caching." Mature Agent systems use several unrelated mechanisms that are all called cache:

```text
provider prompt/KV cache
application/node result cache
metadata/configuration cache
retrieval/embedding cache
derived-view cache
per-invocation memoization
response cache
```

ArrokothI also has state that can superficially look like cached computation but is semantically different:

```text
Model Invocation Projection snapshot
AgentInformationContext / exact invocation information
controller/runtime checkpoint
PendingOperation / ControllerResumption correlation state
```

The most important distinction is:

```text
Cache
  optimization
  delete it -> semantics stay the same; only cost/latency changes

Derived view
  current semantic value computed from other semantic inputs
  may be cached if identical inputs imply identical output

Invocation snapshot / checkpoint
  historical or recovery truth
  delete/recompute -> behavior may change
  therefore not merely a cache
```

For ArrokothI this leads to a strong default direction:

1. **Do not add a universal kernel-level `Cache` concept.** Cache at the owning mechanism/provider layer.
2. **Treat Active View and authorized memory read views as cacheable derived values**, not durable truth.
3. **Treat the exact projection and information materialized for a model invocation as semantic snapshots once the invocation is dispatched.** Persist them across suspension/re-entry where the controller needs the same invocation identity.
4. **Use provider prompt caching aggressively where safe**, but keep it behind provider/model adapters and make prompt assembly cache-aware without changing semantic ordering merely for cache hits.
5. **Prefer version/content-addressed keys over TTL-only invalidation.** TTL is a freshness/performance tool, not a correctness proof.
6. **Authority and memory-read caches must fail closed on uncertainty.** A stale Active View can leak existence even if final Effect authorization later denies execution; a stale memory view can leak data directly.
7. **Instrument first.** Cache hit rate, saved work, invalidation causes, provider cached tokens, and cold-path cost should justify each cache.

This fits the active 0.8.x efficiency guidance in [`../development/004-efficiency-and-developer-ergonomics.md`](../development/legacy/2026-09-baseline/004-efficiency-and-developer-ergonomics.md): optimize the mechanism at the owning layer, preserve semantic equivalence, and do not collapse architectural distinctions merely because one implementation is expensive.

---

## 2. A caching taxonomy for Agent systems

### 2.1 Provider prompt / KV caching

A model provider reuses computation for an unchanged prompt prefix or an explicitly cached content resource.

Typical properties:

```text
owned by model/provider adapter
provider/model/request-shape specific
usually prefix-sensitive
may have provider TTL / routing requirements
may expose cached-token accounting
must not be relied on for correctness
```

Examples include Anthropic prompt caching, OpenAI prompt caching, and Gemini implicit/explicit context caching.

This is the most immediately useful cache for long Agent sessions because system instructions, tool schemas, stable project context, and conversation prefixes can be large.

### 2.2 Application / node result caching

A framework memoizes the output of a deterministic or acceptably replayable computation.

Examples:

```text
pure transformation node
expensive schema/descriptor compilation
retrieval/ranking result under a stable index revision
read-only operation result with explicit freshness semantics
```

This is higher-risk for LLM invocations and tools because outputs may depend on time, external state, provider configuration, nondeterminism, hidden safety/model changes, or side effects.

### 2.3 Derived-view caching

A semantic view is deterministically derived from current semantic inputs and may be memoized.

ArrokothI examples:

```text
Effective Authority + authored exposure + task scope + catalog
  -> Active View

memory view + read authority + requested fields + memory revision
  -> authorized Structured Memory read view

authorized descriptor universe + query + ranking strategy
  -> discovery result
```

This is the most relevant caching category for the current architecture discussion.

### 2.4 Metadata / resolver caching

Small expensive lookups can be reused within a bounded scope:

```text
provider configuration
credential decryption
model schema hydration
portable schema compilation
descriptor normalization
policy reverse-enumeration helper data
```

These caches often need shorter lifetimes than developers initially expect because credentials, policy, and configuration may change.

### 2.5 Retrieval / embedding caches

Agent memory/search systems frequently cache expensive preprocessing:

```text
chunk embeddings
query embeddings
reranker inputs/results
parsed document chunks
index metadata
```

This is normally provider/storage implementation state, not semantic memory itself.

### 2.6 Per-invocation memoization

One controller progression may call the same resolver more than once while materializing one model invocation. A local memo can guarantee one resolution per materialization.

This can often be simpler and safer than a cross-invocation shared cache.

Conceptually:

```text
begin invocation materialization
  resolve authorized memory view once
  resolve Active View once
  compile information once
  build projection once
end materialization
```

If the provider call suspends and the Execution later re-enters, the already-created **invocation snapshot** should be resumed, not reconstructed from latest state merely to reproduce the same call.

### 2.7 Response caching

Some gateways can return a previously generated model response for an identical request.

This can be useful for explicitly replayable workloads, tests, or batch systems, but should not become the default meaning of an ArrokothI model invocation. A cached response may suppress intended model nondeterminism, ignore changed external dependencies not represented in the key, or turn a logically fresh invocation into replay without the controller/application having chosen replay semantics.

---

## 3. External-system survey

## 3.1 OpenClaw

OpenClaw has one of the clearest public examples of **multiple independent cache layers** rather than one generic Agent cache.

Its prompt-caching documentation describes:

```text
provider prompt caching
  Anthropic cache_control / TTL
  OpenAI prompt_cache_key and retention support
  Gemini cachedContents management

cache-aware context pruning
  prune old tool-result context after the cache TTL expires

heartbeat keep-warm
  optionally keep long-lived prompt caches warm

cache observability
  normalized cacheRead / cacheWrite counters
  dedicated cache tracing
```

More importantly, OpenClaw explicitly separates the system prompt into a **stable prefix** and a **volatile suffix**. Stable project context, tool definitions, and other repeatable content are kept before runtime timestamps and per-turn churn. It also sorts bundled MCP tool catalogs deterministically so incidental enumeration order does not invalidate a provider prefix cache.

This is highly relevant to ArrokothI provider projection. If two model calls have semantically identical stable instructions/tool descriptors, provider-facing serialization should not churn merely because an internal map iterated in another order.

OpenClaw also has memory-specific caches that are separate from prompt caching:

```text
embedding cache
  avoids re-embedding unchanged memory chunks

active-memory query cache
  short TTL reuse for repeated identical memory-recall queries
```

The lesson is not to reproduce OpenClaw's knobs. The lesson is architectural:

> **Cache identity and lifecycle should follow the owner of the repeated work. Prompt caching, embedding caching, recall caching, and persistent session state are separate mechanisms.**

A second useful lesson is observability. OpenClaw exposes cache read/write token counts and has cache-trace diagnostics specifically for cache behavior. ArrokothI should similarly make cache effectiveness measurable rather than invisible.

One caution: prompt/cache tracing can contain full prompt and message material. Any equivalent ArrokothI diagnostics must follow the same security principle as other raw provider traces: disabled or minimized by default where sensitive content may appear.

Sources:

- [OpenClaw prompt caching](https://docs.openclaw.ai/reference/prompt-caching)
- [OpenClaw active memory](https://github.com/openclaw/openclaw/blob/main/docs/concepts/active-memory.md)
- [OpenClaw memory / embedding cache](https://github.com/openclaw/openclaw/blob/main/docs/concepts/memory.md)

### ArrokothI takeaways

```text
adopt conceptually:
  stable provider prefix / volatile suffix
  deterministic descriptor ordering
  cacheRead/cacheWrite observability
  independent cache owners
  cache-aware pruning only as a context strategy

avoid importing as kernel semantics:
  provider-specific TTL vocabulary
  heartbeat merely to preserve a provider cache
  provider cache handles as Execution truth
```

---

## 3.2 Hermes Agent

Hermes Agent makes prompt-cache stability a first-class prompt-assembly concern.

Its prompt assembly separates roughly:

```text
stable system material
  identity / guidance / stable scaffolding

session/project context
  project instructions and similar context files

volatile material
  memory/profile snapshots, timestamp/session/provider information

API-call-only ephemeral additions
  recall/plugin context and other current-turn overlays
```

The system prompt is cached per session and rebuilt only on explicit invalidation paths such as context compression. Mid-session memory writes update disk state but do not silently mutate the already-built system prompt until a rebuild path runs. This is a useful example of the difference between:

```text
current backing state
vs
materialized model-facing snapshot
```

Hermes also places plugin-provided recall/context on the current user turn rather than rewriting the cached system prompt, specifically to preserve stable prompt prefixes.

For Anthropic, Hermes uses rolling cache breakpoints over the system prompt and recent messages. Newer transports also derive prompt cache keys from stable prompt content rather than blindly from a raw session id, which is especially useful for recurring jobs whose per-fire session ids would otherwise force cold caches.

Sources:

- [Hermes prompt assembly](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/prompt-assembly.md)
- [Hermes context compression and caching](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/developer-guide/context-compression-and-caching.md)
- [Hermes prompt caching implementation](https://github.com/NousResearch/hermes-agent/blob/main/agent/prompt_caching.py)
- [Hermes system prompt implementation](https://github.com/NousResearch/hermes-agent/blob/main/agent/system_prompt.py)

### ArrokothI takeaways

Hermes reinforces three useful rules:

1. **Stable prompt construction is an engineering contract of the provider/context layer, not a new semantic state machine.**
2. **Memory changes do not imply that an already-issued model invocation should observe new memory.** Once information has been materialized for a call, the historical input remains the historical input.
3. **Cache-aware prompt assembly benefits from explicit stable/volatile boundaries**, but those boundaries should be derived from ArrokothI's context/projection semantics rather than replacing them.

---

## 3.3 Dify

Dify is useful here less as a single "Agent response cache" design and more as evidence about **bounded cache scope and cache-key correctness** in a large Agent/workflow codebase.

Current Dify `ModelManager` documentation warns that enabling its credential cache and keeping a manager alive too long can return stale credentials after provider settings or API keys change. The source recommends a new manager per request, workflow run, or similarly bounded scope; the credentials cache is disabled by default.

That is directly relevant to ArrokothI authority/configuration caches:

> **A cache that includes security-sensitive configuration should have a scope justified by the freshness contract, not merely by process lifetime.**

Dify also has a lightweight runtime node snapshot cache in its workflow persistence layer while separately persisting workflow/node execution state. That is another instance of the cache-vs-durable-truth distinction: a local cache can help span implementation phases while persistence remains the recovery record.

A recent Dify issue report (#40920, August 2026) is a valuable failure-mode example. The report describes a secret-input parameter cache keyed by workflow/node identity but not by the dynamically rendered secret input. In a loop, later iterations could therefore reuse the first iteration's cached secret. Regardless of the final upstream fix, the failure mode is general:

```text
cache key omits one semantic input
  -> cache hit across non-equivalent requests
  -> stale or cross-iteration data reuse
```

This is exactly the class of bug ArrokothI must avoid with Active View or memory read-view caching. `executionId` alone, or even `executionId + viewId`, is not a sufficient key if authority revision, requested fields, memory revision, task scope, or strategy version can change.

Sources:

- [Dify `ModelManager`](https://github.com/langgenius/dify/blob/main/api/core/model_manager.py)
- [Dify workflow persistence layer](https://github.com/langgenius/dify/blob/main/api/core/app/workflow/layers/persistence.py)
- [Dify issue #40920: secret-input cache across loop iterations](https://github.com/langgenius/dify/issues/40920)

### ArrokothI takeaways

```text
prefer bounded cache scope for mutable security/config data
key by semantic inputs, not convenient object identity
make default-off or fail-closed behavior easy for security-sensitive caches
do not confuse implementation snapshots with durable execution truth
```

---

## 3.4 LangGraph

LangGraph is useful because it exposes an explicit **node cache policy** while also having separate **checkpointer/persistence** concepts.

The public API includes `CachePolicy` for node caching. Separately, LangGraph persistence uses checkpointers for thread graph state and stores for long-term application-defined memory.

That distinction maps cleanly to the ArrokothI taxonomy:

```text
node cache
  memoized computation

checkpoint
  execution/recovery state

store / memory
  retained application information
```

ArrokothI should preserve the same conceptual separation even if its APIs differ substantially.

Sources:

- [LangGraph API reference (`CachePolicy`)](https://langchain-ai.github.io/langgraph/reference/types/)
- [LangGraph persistence](https://langchain-ai.github.io/langgraph/cloud/concepts/threads/)

---

## 3.5 Model-provider caching

Provider caching has converged on a similar systems lesson: **stable prefixes matter**, but providers expose different mechanisms.

### Anthropic

Anthropic supports explicit `cache_control` breakpoints with short and longer TTL choices. The cached prefix covers prompt material through the breakpoint, including tools/system/messages according to request ordering. Tool definitions can also be cache-aware.

Relevant implication:

```text
changing tool definitions/order can invalidate provider cache reuse
```

This makes deterministic Model Invocation Projection serialization valuable even though the projection snapshot itself is not a cache.

Sources:

- [Anthropic prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic tool use with prompt caching](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching)

### OpenAI

Current OpenAI APIs expose prompt-cache accounting and cache-routing/configuration controls such as `prompt_cache_key`; newer Responses API models also expose prompt-cache options/breakpoints. OpenAI model guidance recommends putting stable content first and dynamic user-specific context later when semantically appropriate.

ArrokothI should treat all of this as provider-adapter optimization. The controller should not care whether a provider hit a KV cache.

Sources:

- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI Responses API create reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)

### Gemini

Gemini supports implicit context caching and, on the Generate Content API, explicit cached-content resources with TTL. Explicit cache objects can include large system instructions/files and then be referenced by later calls.

A Gemini `cachedContent` handle is an important example of a provider-owned resource that should not be mistaken for an ArrokothI semantic snapshot. If used, it belongs inside the provider executor/adaptation layer and must be reconstructible or replaceable without changing the model invocation's intended semantic input.

Source:

- [Gemini context caching](https://ai.google.dev/gemini-api/docs/caching)

---

## 4. Mapping the taxonomy onto ArrokothI

The current canonical flow is:

```text
Catalog
  -> Effective Authority
  -> Active/Exposed View
  -> Model Invocation Projection
```

and for model information:

```text
authorized retained information / resources / events / instructions
  -> context compilation
  -> invocation information
```

The caching question should be answered separately at each boundary.

| ArrokothI value | Semantic nature | Cacheable? | Must persist for exact invocation/recovery? |
|---|---|---:|---:|
| Catalog descriptors | Current registered state | Stable descriptor hydration may be cached | Source of truth depends on catalog backend |
| Effective Authority result/enumeration | Current derived authorization state | Yes, only with authority/policy freshness semantics | Not automatically |
| Active View | Deterministic derived exposed subset | **Yes** | Not automatically |
| Discovery/ranking result | Derived view over authorized universe | Yes | No, unless it was materialized into an invocation snapshot that must be reproduced exactly |
| Model Invocation Projection | Invocation-specific binding snapshot | It may be built using caches | **Yes when needed to interpret that invocation's response** |
| Structured Memory backing state | Retained semantic/application state | Store implementation may cache reads | Source of truth is durable/runtime memory state |
| Authorized memory read view | Derived view over current state + read authority | **Yes** | Not automatically before invocation materialization |
| AgentInformationContext / exact invocation information | Historical input to a model call | Not merely a cache | **Yes when suspension/replay/recovery requires the exact input** |
| Working Notes | Retained scratch state under memory semantics | Storage layer may cache | According to its lifecycle contract, not because of caching |
| Provider prompt/KV entry | Provider optimization | Yes/provider-owned | No |
| Controller checkpoint / ControllerResumption | Runtime/recovery truth | No | **Yes when durability requires it** |

The key transition is **invocation materialization**:

```text
recomputable current inputs
        |
        v
cacheable derived views
  Active View
  authorized memory read view
  discovery result
        |
        v
materialize exact invocation
        |
        +--> Model Invocation Projection
        +--> AgentInformationContext
        |
        v
provider call dispatched
        |
        v
historical invocation snapshot
```

Before materialization, a view may be safely dropped and recomputed from identical semantic inputs.

After dispatch, the exact projection/information becomes part of the causality of that invocation. Recomputing from *latest* state is not equivalent.

---

## 5. Recommended cache candidates

## 5.1 Active View cache

An Active View is a strong candidate because the canonical definition already describes it as a deterministic narrowing of authorized possibilities.

A conceptual key should cover every input that can change membership or model-visible selection:

```text
ActiveViewCacheKey = hash(
  execution/policy scope identity,
  effective-authority identity + revision/version,
  catalog identity + revision/version,
  authored exposure request,
  task/progression scope,
  descriptor/tag/group inputs,
  active-view resolver/ranking strategy version,
  relevant packing/search parameters
)
```

Do **not** assume this exact tuple is the future API. The important property is semantic completeness.

Bad keys include:

```text
executionId only
executionId + agentDefinitionId only
catalog version without authority version
TTL-only freshness
```

If the policy backend cannot expose a reliable authority revision/version, a cache may need a smaller scope, explicit invalidation subscription, bounded TTL plus fresh revalidation, or no caching at all.

### Revocation consequence

A stale Active View is not harmless merely because the final Effect is re-authorized:

```text
t0: operation refund is authorized and exposed
t1: refund authority revoked
t2: stale cache still exposes refund to model
t3: model requests refund
t4: Harness correctly denies the Effect
```

There is no privilege escalation at t4, but t2 can still reveal capability existence, schema, resource naming, or application structure that should no longer be visible.

Therefore:

> **Final Effect authorization is necessary but does not make stale exposure acceptable.**

---

## 5.2 Authorized Structured Memory read-view cache

A memory read view is even more security-sensitive because a stale cache can reveal the data itself.

A conceptual key might include:

```text
StructuredMemoryReadViewCacheKey = hash(
  execution/application policy scope,
  memory view identity,
  requested field/key selection,
  read-authority identity + revision/version,
  structured-memory state revision,
  resolver/projection version
)
```

Again, this is a correctness checklist, not a frozen API.

Important questions before implementation:

```text
Can the memory store expose a cheap revision without reading full data?
Is revision per whole view, per record, or per field set?
Can read authority change independently from memory state?
Can policy backend changes be versioned or subscribed to?
Does a field-level cache leak values across principals/views?
```

If discovering `memoryRevision` costs the same as the full read, an application-level read-view cache may provide little benefit. The better optimization may be inside the memory store or metadata index.

---

## 5.3 Authorized discovery cache

Progressive discovery can be expensive at large catalog sizes. A cache may reuse ranking/search results when the authorized universe and query are identical.

Conceptual identity:

```text
authorized-universe revision
+ discovery query
+ ranking/index version
+ filters/task scope
+ top-N/token budget
+ descriptor-summary version
```

Authority filtering still belongs before ranking where feasible. A shared unfiltered search cache must not become a path for returning unauthorized descriptors.

---

## 5.4 Provider prompt-cache optimization

Provider prompt caching should probably be the first cache-related optimization to implement broadly because it can save substantial model input processing without changing ArrokothI semantics.

Provider adapter responsibilities can include:

```text
stable serialization of system instructions
stable ordering of tool/projection descriptors
stable schema formatting
provider-specific cache breakpoints / cache keys
provider TTL/retention configuration
cached-token usage normalization
```

Potential stable prefix:

```text
provider/model-level system guidance
Definition instructions that are stable for the session/invocation family
stable Skill/project context selected by context compiler
stable portion of Model Invocation Projection
```

Potential volatile suffix:

```text
current Event/user message
current retrieved memory/resource excerpts
current timestamp or runtime observations
new tool results
current Working Notes excerpts
```

This is **not** permission to reorder semantically meaningful content arbitrarily. If changing order changes model behavior or instruction precedence, semantic correctness wins over cache efficiency.

The provider adapter may also content-address a cache-routing key from stable request material rather than using an incidental runtime id. Such a key is an optimization hint, not an authorization credential.

---

## 5.5 Descriptor/schema/embedding caches

These are lower-risk implementation caches if their source revisions are explicit:

```text
portable descriptor -> provider schema projection
schema validator compilation
descriptor embeddings
memory chunk embeddings
normalized tool metadata
```

They belong to the descriptor/projection/retrieval implementation that owns the expensive transformation.

Content-addressing is often ideal:

```text
hash(canonical descriptor bytes + projector version + provider schema dialect)
```

If the semantic source content changes, the hash changes naturally.

---

## 5.6 Tool/capability result caching

Do not introduce a generic Harness-level cache for `UseCapability` results.

A capability may be:

```text
pure read
read with freshness requirements
nondeterministic query
remote job
consequential side effect
```

Caching belongs with the Operation/resource owner that can state a correctness contract such as:

```text
cacheable read for 30 seconds
content-addressed immutable resource
ETag/version-backed read
idempotent deterministic compiler
```

Keep these concepts separate:

```text
result cache
  reuse a previous value

idempotency/deduplication
  ensure retry does not duplicate a consequence

settlement journal
  record whether consequential work happened
```

A payment or message send must never become "safe to retry" merely because a generic cache exists.

---

## 5.7 Model response caching

Default recommendation: **do not make response caching a transparent kernel behavior.**

It can be offered by a provider/gateway or application when replay semantics are explicit, but a fresh ArrokothI model invocation should normally mean a fresh provider/controller inference attempt unless the application selected a replay/cache mechanism.

A safe response-cache key would need to capture far more than visible prompt text:

```text
provider/model/version
model parameters/reasoning mode
exact messages/content
exact projection/tool schemas
provider feature configuration
relevant safety/system settings
possibly external retrieval material already embedded in the request
```

Even then, replay may be semantically undesirable if the application expects nondeterministic exploration or provider-side policy/model behavior to update.

---

## 6. Snapshot is not cache

This distinction should be documented and tested because it directly affects suspension/re-entry.

### Cache law

For a real cache:

```text
run with cache
  -> result R

delete cache
run from same semantic inputs
  -> result R
```

Only performance/telemetry should change.

### Invocation snapshot law

For an invocation snapshot:

```text
model call N received information I12 and projection P17

backing memory/catalog/authority changes

model response for call N arrives
  -> interpret against I12 / P17 context
  -> not against newly derived I13 / P18
```

Dropping the snapshot and recomputing from latest state can change causality and meaning.

Canonical `authority.md` already states the projection half of this rule: a model-returned operation name resolves against the exact projection/binding snapshot shown to that invocation.

The same principle applies to information context when the runtime/controller needs the exact input across suspension:

> **"What the model actually saw" is historical invocation state, not an optimization entry.**

---

## 7. Suspension, re-entry, and one-time resolution

A common accidental cost is resolving the same view once per `Activation` instead of once per new model invocation.

Desired shape:

```text
Activation A1
  decide to start model invocation N
  resolve authorized memory read view
  resolve Active View
  compile AgentInformationContext
  materialize Model Invocation Projection
  persist invocation state needed for resumption
  dispatch provider request
  suspend

Activation A2
  provider result for invocation N is ready
  resume invocation N
  reuse its persisted information/projection
  zero fresh read-view resolution merely because an Activation restarted
```

A later **new** model invocation may intentionally see new memory/authority/catalog state. That is a new materialization boundary, not a re-entry cache miss.

This avoids conflating:

```text
Activation lifetime
model invocation lifetime
derived-view cache lifetime
semantic snapshot lifetime
```

---

## 8. Invalidation: versions before timers

### 8.1 Versioned keys are preferable

When source owners expose monotonic revisions or immutable identities, cache correctness becomes easier to reason about:

```text
same key -> same semantic source versions
changed source -> changed key -> miss
```

Useful version candidates include:

```text
authority/grant/policy revision
catalog revision
descriptor content hash
memory view/state revision
discovery index version
resolver/projector version
provider/model configuration identity
```

### 8.2 TTL is not enough

A five-second TTL does not prove that authority remained valid for five seconds.

TTL can be useful for:

```text
bounding stale metadata when exact invalidation is unavailable
limiting memory usage
provider cache retention
freshness contracts explicitly defined in time
```

But security-sensitive caches should miss or revalidate immediately when a known revocation/change event occurs.

### 8.3 Prefer miss over uncertain reuse

For authority/memory visibility:

```text
cannot verify cache identity/freshness
  -> miss and recompute
```

This is especially important after:

```text
revocation
principal/on-behalf-of change
child delegation change
memory view rebinding
catalog hot reload
policy backend revision change
Execution recovery on another worker when cache provenance is unknown
```

### 8.4 Negative caches also need authority-aware keys

Caching "not allowed" or "not found" can reduce expensive lookups, but a later grant/catalog update may make the answer valid. Negative caches therefore need the same revision discipline as positive caches.

---

## 9. Cache scope and ownership

A useful ownership table is:

| Repeated work | Owning layer | Likely cache scope |
|---|---|---|
| Provider prompt prefix | model provider adapter | provider/model/account/session-or-content lineage |
| Provider schema projection | provider/projector adapter | descriptor content hash + provider dialect/version |
| Active View | authority/exposure implementation | Execution/policy scope + semantic input revisions |
| Authorized memory read view | memory view/provider implementation | Execution/read-authority scope + memory revision |
| Discovery result | discovery implementation | authorized-universe revision + query/strategy |
| Chunk embeddings | memory/retrieval backend | content hash + embedding model/version |
| Credential/model config | provider/config manager | deliberately bounded request/workflow/config revision scope |
| Pure node computation | Workflow/application implementation | explicit input content + implementation version |
| Invocation projection/information snapshot | controller/runtime persistence | **not cache scope; invocation identity** |

This preserves the current ArrokothI principle:

> **Optimize the mechanism at the owning layer.**

A central generic cache service may still be used as infrastructure (in-memory LRU, Redis, database table), but the semantic key and invalidation contract remain owned by the feature using it.

---

## 10. Security and privacy requirements

Caching can create new information-retention paths even when it does not create new authority.

Requirements to validate:

```text
tenant/application/principal isolation in keys and storage
no cross-principal reuse of memory read views
no cross-authority reuse of Active Views
cache data encrypted/protected according to the source's sensitivity
cache eviction is not treated as authorization revocation
revocation prevents future reads even if bytes remain in cache storage
raw secrets should not be copied into cache keys/logs
cache diagnostics should redact/minimize prompt and memory payloads
provider cache/privacy behavior should be surfaced by adapter/deployment documentation
```

A hash is not automatically safe if the hashed value comes from a low-entropy secret. Prefer keyed hashing or opaque stable identifiers where needed.

Provider prompt caches also have their own retention/privacy semantics. ArrokothI should not promise that deleting an Execution automatically deletes a provider's internal prompt cache unless the provider API actually provides and the adapter invokes such deletion.

---

## 11. Observability before optimization

Before adding shared caches, add measurements that can answer whether repeated work is material.

Suggested counters/timers:

```text
active_view.resolve.count
active_view.resolve.duration
active_view.cache.hit / miss
active_view.cache.miss_reason
active_view.input.authority_revision
active_view.input.catalog_revision

memory_read_view.resolve.count
memory_read_view.resolve.duration
memory_read_view.cache.hit / miss
memory_read_view.input.memory_revision
memory_read_view.input.read_authority_revision

projection.build.duration
projection.descriptor_count
projection.serialized_bytes/tokens

provider.prompt_cache.read_tokens
provider.prompt_cache.write_tokens
provider.prompt_cache.hit_ratio
provider.prompt_cache.cold_input_tokens
provider.prompt_cache.key/fingerprint lineage (non-secret)

retrieval.embedding_cache.hit / miss
retrieval.rank.duration
```

Useful miss reasons include:

```text
cold
source-revision-changed
authority-revision-changed
memory-revision-changed
strategy-version-changed
principal-scope-changed
provider/model-changed
expired
explicitly-invalidated
unknown-freshness
```

The goal is to distinguish:

```text
cache misses because workload is naturally unique
vs
cache misses because serialization/order is accidentally unstable
vs
cache misses correctly caused by semantic change
```

---

## 12. Validation matrix

Any derived-view cache should pass tests equivalent to the following.

### 12.1 Equivalence

```text
cache disabled -> output X
cache enabled cold -> output X
cache enabled warm -> output X
```

### 12.2 Authority revocation

```text
warm Active View contains op A
revoke A / increment authority revision
next resolution must not return cached A
final Effect authorization remains fresh independently
```

### 12.3 Catalog replacement

```text
projection/display name previously resolves to operation ref op-42
catalog changes mapping
new invocation may build new projection
old invocation response still resolves through its old snapshot
```

### 12.4 Memory update

```text
warm read view sees profile.name = Ada at revision 12
write name = Bob -> revision 13
new invocation must not receive cached revision 12 if it requests current value
old suspended invocation remains bound to its already-materialized information snapshot
```

### 12.5 Read-authority revocation

```text
warm memory view contains salary
salary read grant revoked
next materialization must not expose cached salary
```

### 12.6 Cross-principal isolation

```text
same requested keys / same backing record
principal A authorized
principal B not authorized
cache must not cross the policy scope boundary
```

### 12.7 Resolver version change

```text
same data versions
new selection/ranking/projector implementation version
cache key changes or explicit invalidation occurs
```

### 12.8 Suspension/re-entry

```text
new invocation -> one read/view resolution
provider suspends
Activation re-enters -> zero repeated resolution for the same invocation
provider result uses persisted invocation projection/information
```

### 12.9 Cache deletion

```text
delete every optional cache
same semantic test suite still passes
```

This final test is the best practical guard against accidentally turning cache state into semantic truth.

---

## 13. Phased recommendation for ArrokothI

### Phase 0 — preserve correct invocation semantics

Before shared caching:

```text
resolve derived information/views once per new model invocation
persist exact invocation information/projection needed across suspension
reuse them on re-entry
never resolve latest state merely because an Activation restarted
```

This eliminates the largest accidental repeated work without inventing a cache subsystem.

### Phase 1 — instrument the cold path

Measure:

```text
Active View resolution cost
memory read-view resolution cost
context compilation cost
projection build/serialization cost
provider cached-token behavior
```

Add no shared cache if the measured cost is negligible.

### Phase 2 — provider prompt-cache hygiene

Provider adapters should implement cache-aware request shaping where supported:

```text
deterministic stable prefix
stable tool/schema ordering
provider cache keys/breakpoints/TTL configuration
cache token telemetry
```

This can deliver large savings while leaving kernel semantics unchanged.

### Phase 3 — targeted revision-keyed derived-view caches

Add only where measurement shows benefit:

```text
Active View
Structured Memory read view
authorized discovery
schema/descriptor projection
retrieval embeddings
```

Each cache must document:

```text
semantic input identity
source revision/freshness mechanism
principal/authority scope
invalidations
maximum scope/lifetime
security classification
observability
cache-disabled equivalence test
```

### Phase 4 — shared/distributed cache only with scale evidence

Redis/distributed cache machinery should wait until multi-worker/durable workloads justify it.

Distributed caches add their own problems:

```text
serialization cost
cache stampede
cross-tenant isolation
invalidation fan-out
partial failure
version skew between workers
operational complexity
```

A local per-Execution/per-worker memo may be the correct v0.x implementation for many paths.

---

## 14. Decisions this research supports, but does not make canonical

Strong research recommendations:

```text
Active View is not a cache.
Active View is a deterministic semantic view that may be cached.

Authorized memory read view is not backing memory.
It is a derived view that may be cached under read-authority + memory revisions.

Model Invocation Projection is not merely a cache.
Once issued, it is the historical binding snapshot for that invocation.

Exact AgentInformationContext is not merely a cache.
Once sent to the model, it records what that invocation actually saw.

Provider prompt/KV cache is an adapter optimization.
Provider cache handles/TTL do not become kernel semantics.

Result/idempotency/settlement caching are different problems.
Do not solve side-effect safety with a generic result cache.
```

Questions that remain evidence-driven:

```text
Which derived-view cache has enough repeated work to justify implementation first?
Can authority/policy backends expose reliable revisions or change signals?
What is the cheapest memory revision metadata path?
Should cache infrastructure be local-first or expose a pluggable backend port?
Which provider prompt-cache metrics can be normalized without hiding provider differences?
What cache budget/eviction strategy is appropriate per deployment profile?
```

These belong in implementation validation / [`../future-plan.md`](../future-plan.md) if they become active roadmap questions; they should not be frozen into canonical APIs by this research note alone.

---

## 15. Practical mental model

```text
                current semantic sources
        authority / catalog / memory / task state
                         |
                         v
                +------------------+
                |  Derived Views   |
                |                  |
                | Active View      |
                | Memory Read View |
                | Discovery result |
                +--------+---------+
                         |
                   may be cached
                         |
                         v
              invocation materialization
                         |
              +----------+----------+
              v                     v
     Model Invocation          AgentInformation
        Projection                Context
              |                     |
              +----------+----------+
                         v
                   model invocation
                         |
                         v
               immutable historical
                 invocation snapshot

provider prompt/KV cache sits below/around the provider call as an optimization;
it does not replace any box above.
```

The shortest rule is:

> **If deleting it can change the meaning of an already-issued invocation, it was not merely a cache.**

> **If identical semantic inputs can reconstruct it exactly, it is a derived value and may be cached at its owning layer.**
