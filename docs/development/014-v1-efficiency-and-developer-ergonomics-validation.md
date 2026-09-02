# v0.4 → v1.0 Efficiency and Developer-Ergonomics Validation

> **Status: cross-cutting engineering guidance for the v0.4 → v1.0 path. Not canonical architecture.**
>
> This document does not redefine `Execution`, `Activation`, Event/Effect, authority, memory,
> composition, interoperability, or security semantics. Canonical owners remain the documents indexed
> by [`../README.md`](../README.md). The release/slice horizon remains
> [`008-v0.4-to-v1.0-development-roadmap.md`](008-v0.4-to-v1.0-development-roadmap.md).
>
> The purpose of this note is narrower: make sure ArrokothI's semantic richness does not accidentally
> become mandatory physical overhead or mandatory developer-facing complexity. It records what should
> be measured, what should remain optional, which costs are intrinsic to advertised guarantees, and
> what should be validated before v1.0.

---

## 1. Problem statement

ArrokothI deliberately distinguishes concepts that simpler Agent loops often collapse:

```text
Execution / Activation
Event / Effect
PendingOperation / ControllerResumption
Catalog / Effective Authority / Active View / Model Projection
Structured Memory / Derived Semantic Memory / Working Notes / Artifacts
local composition / child Execution / peer communication
kernel semantics / portable interoperability / protocol binding
semantic enforcement / physical containment
```

Those distinctions are useful because they support stronger lifecycle, authority, durability,
security, interoperability, and recovery guarantees. They do **not** imply that every simple program
must physically pay for every mechanism that a fully hosted deployment may eventually use.

The main engineering question is therefore not:

> Is the semantic model richer than a minimal ReAct loop?

It is:

> **Does each workload pay only for the runtime guarantees and product features that it actually
> enables, while preserving the same semantic boundaries?**

This is an engineering target, not yet a canonical guarantee.

A successful v1.0 should make both of these statements true:

```text
simple things are simple

advanced guarantees are available without changing the meaning
of Execution / Event / Effect / authority / memory / composition
```

---

## 2. Semantic complexity and physical cost are different

A semantic distinction may be nearly free in one implementation and expensive in another.

Examples:

```text
Activation
  semantic meaning: one scheduled controller-compute period
  lightweight implementation: a function call + revision + scheduler record

Active Operation View
  semantic meaning: authorized currently exposed operation subset
  lightweight implementation: deterministic set intersection over a small static catalog

Execution
  semantic meaning: independently managed runtime identity
  lightweight implementation: an in-memory record
  durable implementation: persisted record + mailbox + recovery metadata

security profile
  semantic meaning: advertised trust/containment guarantees
  trusted-local implementation: no sandbox required
  hostile-code implementation: real process/container/VM/WASM isolation may be required
```

Do not optimize the architecture by collapsing distinctions merely because one implementation is
initially expensive. First determine whether the cost comes from the semantic guarantee or from the
chosen mechanism.

Conversely, do not hide real costs behind the claim that they are "only abstractions." Durability,
isolation, authorization, correlation, and recovery all have physical costs when enabled.

---

## 3. Working engineering principles

### 3.1 Pay only for enabled guarantees

Use the following as a v1 engineering objective:

> **Pay only for the runtime guarantees you enable.**

Examples:

```text
no durable runtime
  -> no mandatory database transaction per semantic step

trusted-local code
  -> no mandatory sandbox/process boundary

small static operation set
  -> no mandatory search/ranking/indexing pass

no Derived Semantic Memory
  -> no mandatory semantic-memory retrieval/embedding backend

no external protocol binding
  -> no MCP/A2A runtime dependency in core

minimal diagnostics
  -> no mandatory synchronous full-payload trace persistence
```

This must not become "disable correctness." If a feature is enabled, the implementation still has to
preserve its semantic contract.

### 3.2 Correctness before fast paths

Fast paths must be observationally equivalent at the semantic boundary.

Examples:

```text
fast Effect completion
  == slow Effect completion
  with respect to authorization, correlation, consequence semantics, and result meaning

fast model completion in one Activation
  == ControllerResumption path
  with respect to model invocation meaning and controller progression

same-process capability dispatch
  == remote capability dispatch
  with respect to Effect authorization and outcome semantics
```

Do not create a "fast" API that bypasses the Harness merely because the executor happens to be local.

### 3.3 Optimize the mechanism at the owning layer

Examples:

```text
large catalog cost
  -> Active View/discovery implementation

prompt growth
  -> information-context strategy

large tool results
  -> observation projection

persistence write amplification
  -> RuntimeStore/journal transaction design

sandbox startup cost
  -> ExecutionEnvironment/isolation backend

policy lookup cost
  -> policy/authority implementation and caching
```

Do not add new kernel primitives solely to optimize one provider, database, protocol, or model family.

### 3.4 Model cost is a first-class systems cost

Kernel CPU is only one part of total Agent cost. Track at least:

```text
wall-clock latency
CPU time
resident memory
persistence I/O / write amplification
serialization / IPC
model input/output tokens
number of model calls
number of operation calls
external-service latency
sandbox startup / remote-worker latency
```

A design that adds 1 ms of deterministic bookkeeping but removes thousands of unnecessary prompt
Tokens may be a net performance win. A design that saves microseconds while causing one extra model
round trip may be a large regression.

### 3.5 Progressive disclosure applies to the SDK too

The architecture vocabulary must not become mandatory application boilerplate.

A developer writing a simple Agent should not need to manually construct every internal runtime
concept merely because those concepts exist.

Desired shape:

```text
simple authoring facade
  Agent / Workflow / operations / model / memory intent
        ↓
reasonable safe defaults
        ↓
Harness-owned runtime machinery
        ↓
advanced ports and explicit overrides only when needed
```

The kernel may remain semantically explicit internally while the common authoring path stays small.

---

## 4. Where real overhead can appear

### 4.1 Persistence and write amplification

Durability is one of the most likely sources of accidental overhead.

Watch for a semantic step becoming many independent synchronous writes:

```text
Event append
lifecycle update
controller-state write
PendingOperation update
Effect journal append
authority snapshot write
trace write
```

Potential implementation techniques to evaluate:

```text
transactional coalescing of facts that commit together
append-oriented journals where appropriate
batched/non-critical telemetry writes
prepared statements / connection reuse
write-behind only for data that is not semantic recovery truth
passivation of dormant Executions
```

Never batch together records whose atomicity requirements differ merely to improve a benchmark.

Measure **writes and transactions per semantic action**, not only aggregate requests/second.

### 4.2 Tracing, audit, and diagnostics

Separate:

```text
semantic state required for recovery/correctness

audit records required by an advertised profile

debug/evaluation traces

full raw provider payload archives
```

The last two should normally support sampling, asynchronous sinks, payload elision, or disabling when
not required. They must not silently become Events or controller state.

### 4.3 Authority and Active View resolution

For a small static catalog, authority/exposure should be cheap.

At large catalog sizes, avoid naive work such as:

```text
one remote policy round trip per descriptor per model turn
full schema hydration before ranking
embedding every descriptor on every invocation
mandatory LLM routing before every model call
```

Prefer measured implementations such as:

```text
authorized-universe enumeration/filtering
cached stable descriptors
cheap deterministic ranking
lazy full-schema hydration
immutable invocation projection snapshot
final concrete Effect re-authorization
```

Caching may accelerate view construction but must not turn stale exposure state into decisive
authorization.

### 4.4 Context compilation and observation projection

The canonical distinction:

```text
memory != current context
semantic result != model-facing observation representation
```

should be used as an optimization opportunity.

Experiment with:

```text
recent-window context
retrieval
summaries/compaction
fresh-context handoff
bounded Working Notes
Artifact excerpts instead of full materialization
concise vs detailed operation results
pagination / stable references / lazy reads
model-specific packing after semantic selection
```

Prompt/context engineering belongs here. It can reduce token cost, latency, and model confusion, but
it cannot replace runtime authorization, durability, or settlement semantics.

### 4.5 Isolation

A hostile-code profile may require substantial overhead:

```text
sandbox/process startup
filesystem setup
IPC / serialization
network proxying
egress checks
resource accounting
remote-worker scheduling
```

Do not make this overhead mandatory for the trusted-local/embedded profile. At the same time, never
advertise hostile-code containment while silently falling back to trusted in-process execution.

### 4.6 Serialization and process boundaries

Provider-neutral and protocol-neutral contracts often use plain serializable data. Preserve that
property, but avoid unnecessary serialize/deserialize cycles when both ends are safely in-process.

An in-process fast path may pass the same validated semantic value directly while a remote adapter
uses JSON/wire serialization, as long as both preserve the same contract and validation boundary.

---

## 5. What cannot be optimized away without weakening a guarantee

Some costs are intrinsic once the corresponding guarantee is enabled.

Examples:

```text
child authority attenuation
  requires an authority/delegation decision at child creation

exact invocation binding integrity
  requires retaining enough projection identity/binding state

consequential unknown-outcome safety
  requires dispatch/settlement correlation and consequence-aware outcome state

durable WAITING -> restart -> READY
  requires durable execution/controller/waiting state

hostile-code containment
  requires a real isolation boundary appropriate to the threat model

multi-writer shared state correctness
  requires version/conflict/transaction/merge semantics appropriate to the resource
```

The target is not zero overhead. The target is that the overhead is attributable to a real guarantee,
measured, and avoidable when the guarantee is not requested.

---

## 6. Deployment/runtime profiles to validate

These are **engineering test profiles**, not frozen product names or new kernel semantics.

### 6.1 Lightweight embedded profile

Representative configuration:

```text
in-memory or lightweight local store
trusted in-process code
static/small Active View
no hostile-code isolation
minimal trace sink
no Derived Semantic Memory backend unless requested
no distributed scheduler
```

Goal:

> Prove that using Arrokoth as an embedded kernel does not impose hosted-platform machinery on a
> simple application.

### 6.2 Durable profile

Adds the minimum mechanisms required for restart-safe long-lived work:

```text
durable Execution/controller state
durable mailbox/cursors
PendingOperation persistence
ControllerResumption persistence where required
Effect journal/settlement state
projection snapshots required by suspended invocations
restart recovery
```

Goal:

> Quantify the cost of durability separately from ordinary in-memory kernel cost.

### 6.3 Governed profile

Adds richer operational policy where the workload needs it:

```text
child delegation
principal-aware policy inputs
confirmation/audit requirements
larger authorized catalogs / Active View resolution
revocation/change handling
```

Goal:

> Measure policy/exposure cost without confusing it with model-provider or sandbox cost.

### 6.4 Isolated hosted profile

Adds actual hostile-code containment:

```text
ExecutionEnvironment/isolation backend
workspace/filesystem isolation
restricted network/egress
secret isolation
resource limits
controlled Effect bridge
```

Goal:

> Treat isolation cost as an explicit deployment choice and measure startup, steady-state, and
> throughput consequences independently.

Profiles should compose where valid. Do not create separate semantic kernels per profile.

---

## 7. Benchmark families

Performance work should distinguish kernel overhead from real end-to-end Agent behavior.

### 7.1 Benchmark A — kernel-only overhead

Use deterministic fake providers/executors so network/model latency is zero or controlled.

Compare representative operations such as:

```text
plain local function
vs Function Stage/local controller work

plain fake model call
vs LLM Stage / Agent model step

plain function dispatcher
vs UseCapability Effect through Harness

small direct allow-set lookup
vs Catalog -> Effective Authority -> Active View -> Projection
```

Measure:

```text
wall time
CPU time
allocations / memory where practical
scheduler operations
store reads/writes
transactions
serialization count
```

The purpose is to reveal kernel overhead that external latency would otherwise hide.

### 7.2 Benchmark B — end-to-end Agent workload

Use representative real or realistic model/tool workloads.

Measure:

```text
task success
wall time
model calls
operation calls
tokens
external latency
kernel time when instrumentable
persistence writes
cost
```

A change is not a performance improvement if it reduces kernel CPU but worsens task success or causes
extra model/tool calls.

### 7.3 Benchmark C — scale and dormancy

Exercise at least:

```text
many concurrent runnable Executions
many dormant WAITING Executions
high wake-up rate
recursive child trees under structural budgets
large operation catalogs
large mailbox/history populations
```

Suggested scale ladder before final budgets are chosen:

```text
10
100
1,000
10,000
```

Not every backend must reach every level on a laptop. The purpose is to find scaling shape, accidental
O(N) paths, and memory retained per dormant Execution.

### 7.4 Benchmark D — durability/recovery cost

Measure separately:

```text
in-memory run
same workload with durable reference store
crash/restart with pending capability
crash/restart with controller-local model resumption
crash/restart with child call
crash/restart with confirmation/user input when implemented
```

Track write amplification, recovery time, duplicate-dispatch prevention, and correctness after crash.

### 7.5 Benchmark E — optional feature deltas

For the same workload compare controlled toggles such as:

```text
minimal trace vs evaluation trace
static Active View vs progressive discovery
no Derived Memory vs Derived Memory retrieval
trusted-local vs isolated execution environment
in-memory vs durable store
```

This is the concrete evidence for "pay only for enabled guarantees."

### 7.6 Dedicated orchestration-overhead measurement after Slice F (and again after Slice G)

> **Recorded during Slice F.2b (doc [`022`](022-slice-f2b-working-notes-explicit-handoff.md)) from
> the architecture review. This is a planned measurement, not a performance guarantee, and it must
> not block F.2b (or any Slice-F) behaviour. It must survive the future Slice-G new-chat handoff.**

Once Slice F is complete — and again after Slice G if G materially changes the hot path — run a
dedicated orchestration-overhead measurement with **fake/instant external dependencies** so that
external latency cannot hide kernel cost. Use deterministic fake/instant model and capability
providers; the InMemory store, local authority, and minimal trace.

The main question:

```text
For a simple / local workload, is ArrokothI orchestration insignificant relative to ONE model
inference, and do disabled features add approximately zero external round trips / work?
```

Proposed measurement matrix (approximate; refine when the workloads exist):

```text
A. minimal Agent            no operations, no Structured Memory, no Working Notes, no Derived Memory
B. small action surface     ~10 operations exposed / authorized
C. larger action surface    ~100 operations
D. Structured Memory        ~10 declared fields, read ~3, optional write exposure
E. Working Notes            (i) empty  (ii) representative bounded frame  (iii) max/default bounded frame
E2. Derived Semantic Memory (i) no derivedMemory request (verify zero resolver/provider/extractor calls,
      (F.3, doc 023)          byte-identical provider request)
                            (ii) retrieval only, small reference provider (~10 stored claims), ~5 retrieved
                            (iii) extraction pipeline: deterministic fake extractor over ~5 source items
                                  (candidate -> grounded claim -> provider.append) - measured separately,
                                  it is NOT on the Agent hot path
F. combined F workload      operations + Structured Memory read/write exposure + Working Notes + Derived
                            Semantic retrieval
G. suspended invocation     re-entry: verify no re-resolution of invocation snapshots (Structured read,
   re-entry                 write exposure, local controls, AND the Derived Semantic snapshot)
H. after Slice G            repeat representative cases with concurrency/conflict machinery
                            enabled vs disabled
```

For E2, track specifically: `DerivedSemanticMemoryReadResolver` call count, provider `retrieve`
call count, `DerivedMemoryExtractor` call count (must be 0 on any Agent path), optional extra
model-call count (must stay 0 in the reference path), and Derived-block context bytes. Store /
retrieve / extract are three separate concerns and each disabled one must add ~0.

Measure where practical, per representative case:

```text
wall-clock p50 / p95        CPU time                       allocations / GC proxy
store reads                 store writes / transactions    policy / authority calls
view / projection           serialization / hash bytes     external round trips
  construction counts         or counts
```

Also measure one representative **real** LLM invocation separately, so the report can state:

```text
kernel orchestration latency   vs   model / tool latency
```

Record that a future lightweight / local product profile should use the **same kernel semantics
with cheaper mechanisms**:

```text
InMemory / local store         local authority                minimal trace
no Derived Semantic Memory      no distributed scheduler       small / static catalog
  provider unless enabled       no sandbox unless required
```

Do **not** define a separate weakened "light kernel". Mechanism / profile may differ; semantics stay
shared. Prefer a repeatable benchmark command, operation / count metrics, and broad regression
envelopes over brittle CI millisecond thresholds.

---

## 8. v0.4 validation checkpoint

The first v0.4 testing pass should establish a baseline rather than attempt final tuning.

At that checkpoint:

1. run the existing semantic conformance suite;
2. run the behavioral Agent eval baseline;
3. add/execute a small kernel-only benchmark set with fake model/tool latency;
4. record basic wall time, model/tool-call counts, store writes, and major allocations where practical;
5. run at least one live provider/tool scenario to make sure the measured fake path did not optimize
   away real integration behavior;
6. inspect the simple authoring path and list every concept a developer must manually understand;
7. record obvious accidental costs, but avoid broad redesign unless a bottleneck is material.

The v0.4 result should answer:

```text
Is there already an obviously expensive mandatory path?
Does a simple Agent require disproportionate setup?
Are context/tool projections causing unnecessary model tokens?
Does the current store/journal path have obvious write amplification?
Do fast and suspended paths preserve equivalent behavior?
```

Do not set permanent v1 performance budgets from one early benchmark. Keep the baseline so future
slices can detect regressions.

---

## 9. v0.5-v0.7 development discipline

As recursive composition, memory, structured concurrency, interoperability, and hosted security are
added, each slice should answer two extra questions in review:

```text
What new semantic guarantee did this slice add?
What physical work now occurs on the simple path because of it?
```

Prefer:

```text
new feature adds an optional/reference mechanism
```

over:

```text
new feature makes every Execution initialize and pay for that mechanism
```

Examples to watch:

```text
child composition
  should not make no-child workloads traverse child-supervision structures unnecessarily

memory
  should not make every model invocation query every memory form/provider

interoperability
  should not make core load protocol SDKs

hosted security
  should not force embedded trusted-local code through a remote sandbox

progressive discovery
  should not insert a mandatory extra LLM routing call
```

---

## 10. v0.8 feature-complete validation target

v0.8 is the point where major canonical concepts should work together. It should also be the first
serious integrated efficiency/ergonomics review.

In addition to the architecture-complete programs in `008`, v0.8 should have evidence for:

```text
lightweight embedded profile
reference durable profile
reference governed/large-catalog path
experimental isolated hosted profile where available
```

Required cross-cutting checks:

### Runtime efficiency

- no obvious O(all Executions) scheduling/wake-up path for one Execution;
- dormant Executions do not retain model/provider clients or active compute unnecessarily;
- persistence writes/transactions per semantic action are measured and explainable;
- fast paths and suspension/recovery paths remain semantically equivalent;
- large catalogs use bounded exposure/discovery without full schema hydration everywhere;
- debug/eval tracing is not mandatory semantic state.

### Agent efficiency

- context strategy is measured by both task quality and tokens;
- observation/result projection avoids unbounded tool-output injection;
- operation discovery/exposure is benchmarked for recall, latency, and token cost;
- adding runtime safety does not accidentally create extra model turns.

### Developer ergonomics

- at least one minimal Agent example is genuinely minimal;
- at least one minimal Workflow example is genuinely minimal;
- advanced authority/durability/memory/isolation configuration is progressively disclosed;
- common APIs do not require applications to mutate internal controller/runtime state;
- error messages identify the violated boundary without requiring users to read every architecture doc.

v0.8 is allowed to reveal that an API or mechanism is wrong. That is the purpose of the integration
release.

---

## 11. v0.9 stabilization implications

v0.9 should turn v0.8 evidence into simplification and budgets rather than new architecture.

Focus on:

```text
public API naming and progressive disclosure
removal/migration of legacy Session/Flow/AgentHarness surfaces
root-package semantic coherence
stable package/branding identity
performance regression budgets
memory/CPU/write-amplification regression tests
context/token regression tests
load/restart tests
trace/diagnostic usability
```

Prefer deleting accidental complexity to documenting around it.

A concept may remain important internally while disappearing from the common authoring path.

---

## 12. v1.0 release gates from this document

This note proposes the following engineering gates for the first stable release.

### 12.1 Public API coherence

By v1.0:

```text
the current Execution/Agent/Workflow model is the primary/root public mental model
legacy incompatible root surfaces are removed, migrated, or clearly non-default
package names and public prose use one intentional product identity
simple authoring does not require internal runtime mutation APIs
```

### 12.2 Measured optionality

Have at least one benchmark showing the delta between:

```text
lightweight embedded
and
reference durable/governed configuration
```

and, if the isolated profile is advertised as v1 stable, one measured isolated configuration.

The exact numbers may differ by backend. The important property is that optional guarantees have
visible, attributable cost rather than hidden always-on machinery.

### 12.3 No unexplained mandatory heavyweight dependency

The stable core should not require a model SDK, MCP/A2A SDK, vector database, policy engine,
distributed workflow runtime, or sandbox implementation merely to run a simple embedded Agent or
Workflow.

A dependency may still be justified if the stable core contract genuinely needs it, but that choice
must be explicit and measured rather than accidental transitive growth.

### 12.4 Performance regression suite

Keep a small deterministic suite in CI or a repeatable benchmark command that tracks at least:

```text
kernel-only Agent step
UseCapability round trip with fake executor
WAITING/READY wake path
child spawn/call path
Active View/projection at representative catalog sizes
durable reference-store write counts when available
```

Do not make wall-clock thresholds so tight that normal CI noise dominates. Prefer operation counts,
allocations/write counts, complexity checks, and broad regression thresholds where they are more
stable.

### 12.5 Behavioral quality remains separate

A fast Agent that fails the task is not a v1 success.

Keep:

```text
semantic conformance
!= performance benchmark
!= behavioral Agent evaluation
```

All three should exist before the stable release.

---

## 13. Developer-experience target

A useful target is progressive disclosure, not hiding the architecture entirely.

Conceptually:

```text
Level 1: common authoring
  define Agent/Workflow
  choose model
  expose operations
  run/call/send input

Level 2: application control
  authority requests
  memory configuration
  durability
  context/observation strategies
  lifecycle inspection

Level 3: infrastructure integration
  custom policy
  RuntimeStore/scheduler
  ExecutionEnvironment/isolation
  protocol/service adapters
  advanced tracing/recovery
```

Do not freeze this exact API taxonomy before v0.8 evidence. The important requirement is that Level 1
does not force understanding or construction of Level 3 machinery.

---

## 14. Warning signs during future slices

Treat these as review triggers:

```text
a simple Agent causes many synchronous database transactions per model step

every Execution initializes providers, indexes, sandboxes, or protocol clients it never uses

adding one optional feature increases baseline memory for all dormant Executions

an Active View optimization can accidentally authorize something

context compilation and operation exposure become one opaque model-specific function again

trace/debug data becomes required semantic state without a recovery reason

a local fast path bypasses Effect authorization because "it is already in process"

an isolation backend silently falls back to trusted-local execution

an SDK convenience function creates a second authority/operation ontology

performance work changes Event/Effect or memory meaning merely to save serialization

users need to know ControllerResumption/PendingOperation internals for ordinary one-shot use
```

A warning sign is not automatically a defect. It is a reason to measure and inspect the boundary.

---

## 15. Future optimizations that remain evidence-driven

Do not make these mandatory architecture before benchmarks justify them:

```text
specific cache hierarchy for authority/views/projections
BM25 vs embedding vs hybrid descriptor ranking
learned operation selector
universal batching layer
universal internal Suspension record
specific durable runtime such as Temporal/DBOS
specific sandbox backend
specific trace sampling system
specific memory compaction algorithm
specific prompt/context packing strategy
```

The desired pattern remains:

```text
stable semantic boundary
        ↓
replaceable mechanism
        ↓
benchmark + behavioral evidence
        ↓
keep / simplify / replace
```

---

## 16. Suggested evidence artifact before v1.0

Before v1.0, produce one short checked-in report or generated benchmark artifact that answers:

```text
1. What is the baseline cost of the kernel with fake external latency?
2. What is the cost added by durability?
3. What is the cost added by richer policy/discovery?
4. What is the cost added by isolation, if advertised?
5. How many model tokens/calls are saved or added by the default context/exposure strategies?
6. How much memory is retained per dormant Execution at representative scale?
7. What are the dominant writes on a durable Agent/Workflow step?
8. Which common API concepts remain visible to a new developer?
9. Which optimizations were rejected because they weakened semantics or quality?
10. Which features remain Experimental rather than Stable because their cost/ergonomics are not yet proven?
```

The exact benchmark implementation can evolve. The important part is that v1.0 performance and
simplicity claims are backed by evidence rather than inferred from the elegance or complexity of the
architecture.

---

## 17. Summary

ArrokothI should not try to become a minimal Agent loop internally. Its value comes partly from the
runtime distinctions that minimal loops omit.

The v1 goal is instead:

> **Keep semantic complexity inside the kernel, expose it progressively to developers, and make
> physical cost proportional to the guarantees a workload actually enables.**

This means:

```text
semantic richness != mandatory heavyweight deployment

correctness != synchronous work everywhere

durability != every feature always on

security != sandbox every trusted-local call

memory != prompt growth

authority != expose the whole catalog

observability != semantic state

simple SDK != weak kernel semantics
```

Validate that claim at the v0.4 checkpoint, stress it when the architecture is feature-complete at
v0.8, simplify around the evidence in v0.9, and make it part of the engineering maturity bar for
v1.0.
