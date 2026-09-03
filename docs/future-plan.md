# Future Plan

> **Status: unresolved and post-v0.4 work only. Not canonical current semantics.**
>
> Read the canonical documents first: [`mental-model.md`](mental-model.md), [`execution-runtime.md`](execution-runtime.md), [`composition.md`](composition.md), [`authority.md`](authority.md), [`memory.md`](memory.md), [`interoperability.md`](interoperability.md), and [`security-guarantees.md`](security-guarantees.md).
>
> Current implementation/slice decisions belong under [`development/`](development/). The research basis and external-system survey remain in [`architecture-research-dossier.md`](architecture-research-dossier.md).

This file records questions that are deliberately **not frozen** into the current architecture.

It now tracks two different kinds of future work:

```text
architecture questions
  unresolved semantic/runtime/API choices that may eventually change
  canonical contracts after implementation evidence

engineering hypotheses
  replaceable strategies for making Agents/Workflows more effective,
  efficient, legible, and reliable without changing kernel semantics
```

Do not promote an engineering technique into canonical architecture merely because it improves one model family, benchmark, or application.

---

## 1. Runtime and concurrency

### 1.1 `ControllerResumption` vs a more general suspension record

Current v0.4 semantics keep:

```text
PendingOperation
  runtime-mediated semantic dependency
  settlement normally produces/delivers an Event

ControllerResumption
  controller-local asynchronous dependency
  settlement makes controller work runnable
```

Implementations may share lower-level correlation/storage/scheduler machinery.

Questions to validate:

```text
Does the semantic distinction remain useful in durable implementations?

Should there eventually be one internal Suspension/WaitingRecord
with typed projections such as PendingOperation and ControllerResumption?

Can such unification remain invisible to application semantics
without turning every async completion into an Event?

How should cancellation, deadline, deduplication, crash recovery,
and unknown outcome work for controller-local model/provider calls?
```

Do not generalize only for implementation uniformity.

### 1.2 Interleaving and stale continuations

Single-writer Activations prevent physical data races but not logical races across suspension points.

```text
A1 computes from controller revision N
A1 suspends
A2 handles another Event → revision N+1
A1 result returns
```

Open questions:

```text
controller/context revision binding
re-evaluate vs reject stale model result
which continuations permit interleaving
obsolete in-flight call cancellation
binding model input + operation projection + controller revision
```

### 1.3 Parallel Workflow branches

Parallel Workflow topology should use structured concurrency rather than concurrent free mutation.

Open questions:

```text
branch snapshot semantics
branch-local delta representation
join/reducer API
ordering guarantees
conflict handling
failure/cancellation propagation
parallel branch Working Notes
when branch complexity should become child Execution
```

Invariant to preserve:

> **Ambiguous shared-state writes must not silently become timing-dependent last-write-wins.**

Slice G.1 (`development/025-slice-g1-minimal-workflow-fork-join.md`) implemented the narrowest honest
proof of the first three items: authored `{ to: "fork" }` / `{ to: "join" }` topology, one
branch-local `WorkflowParallelState` record per branch (its own visit, input snapshot, progress, and
result), an explicit join as a distinct controller step that exposes an immutable authored-order
`WorkflowJoinContext` to one downstream Function Stage, deterministic result/failure ordering, and a
`parallel_branch_effects_unsupported` fail-closed for a branch that returns `awaitEffects`. It is
reference-implementation evidence, not a frozen API: a G.1 branch body is exactly one Function Stage,
and branch Effects/resumptions, multi-Stage branches, nested forks, branch loops, reducers, merge,
cancellation propagation, and branch Working Notes all remain open (G.2/G.3).

### 1.4 Shared mutable resources

Concrete resource/memory APIs may need:

```text
optimistic versions / preconditions
commutative/reducer updates
transactions
conflict Events/failures
leases / semaphores / permits
fencing tokens
provider-defined conflict semantics
```

Prefer the weakest mechanism that preserves the resource's correctness contract. Do not impose a universal global mutex.

Slice G.0 (`development/024-slice-g0-structured-memory-optimistic-conflict.md`) implemented one narrow
reference primitive: an optional whole-view `WriteMemoryProposal.expectedRevision` compare-and-set on
Structured Memory and a distinct `memory.write_conflict` runtime observation (its own Event kind, a
`conflicted` journal phase, a `conflicted` PendingOperation outcome). It is reference-implementation
evidence for the "optimistic versions / preconditions" line above, not an answer to it: commutative
/ reducer updates, transactions, leases/permits, fencing tokens, provider-defined conflict semantics,
and field-level (rather than whole-view) preconditions all remain open, and G.0 deliberately does not
freeze the API.

### 1.5 Recursive expansion, supervision, and deadlock diagnostics

Still to validate:

```text
lineage/root-scoped spawn budgets
spawn depth / active-descendant limits
restart intensity / retry budgets
explicit child supervision policies
wait-for graph diagnostics
resource-wait edges
deadlock-candidate detection
configured timeout/cancellation recovery
```

Keep:

```text
Definition cycle ≠ runtime error
wait cycle       ≠ automatic deadlock
```

### 1.6 Broad non-blocking work

Current semantics are intentionally conservative for detached/background work.

Questions:

```text
which work blocks Stage completion
which work blocks Agent progression/terminal completion
how late observations enter later context
ordering/correlation
cancellation
Execution completion with work still in flight
```

### 1.7 `reply_and_ask()` as a compound peer interaction

Slice E.1 intentionally keeps the first `reply` contract conservative: answering an existing `ask`
should not claim that the reply itself also opened a new reply dependency unless the runtime actually
records that second dependency. A richer compound interaction remains worth evaluating after the basic
send / ask / reply path has implementation evidence.

A possible future convenience API is:

```text
reply_and_ask(
  inReplyToMessageId = M1,
  to = original requester,
  body = ...
)
```

with semantics conceptually equivalent to:

```text
close the open request identified by M1
  +
deliver one new peer.message that is itself an ask
  +
create a new runtime-owned PeerRequestLink for that new message
  +
keep the replier's new SendMessage PendingOperation pending until the new ask is answered
```

This should remain the same `SendMessage` Effect family rather than introducing a sixth Effect merely
for conversational convenience. The helper/API name is also not frozen; `reply_and_ask()` is a useful
working name for the behavior to preserve.

Questions to validate before implementing it:

```text
Can closing the old PeerRequestLink, settling the old asker's exact PendingOperation,
delivering the new message, and opening the new PeerRequestLink commit atomically?

Should one peer.message carry both:
  inReplyToMessageId = old request id
  expectsReply = true for its own newly minted message id?

How should the replier's SendMessage PendingOperation and correlation be represented
so the new ask remains distinct from the request that was just answered?

How should destination-scoped messaging policy authorize the concrete reply target
before request-link resolution without creating an existence oracle?

Can duplicate delivery/retry avoid both double-settling the old ask and opening
duplicate new asks?

Does the primitive materially simplify real Agent-to-Agent clarification loops,
or are two explicit operations (`reply` followed by `ask`) clearer enough?

Can the helper remain a compound interaction convenience without introducing a
kernel-level conversation/session ontology?
```

Invariant to preserve:

> **`expectsReply = true` must correspond to a real runtime-owned open reply dependency; a message
> must never advertise that a reply is expected when no `PeerRequestLink` exists for it.**

---

## 2. Authority and policy evolution

Current authority semantics are canonical in [`authority.md`](authority.md). Future work concerns richer mechanisms and scale.

### 2.1 Grant/evidence representation

Validate whether a concrete grant/evidence record needs first-class:

```text
issuer/delegator
holder/subject
scope
constraints
delegable flag
validity/expiry
provenance
revocation/consumption state
exact payload binding where applicable
receipt/outcome reference
```

Do not freeze a universal token format prematurely.

### 2.2 Policy backend capability

The conceptual policy seam supports:

```text
check
optional filterAllowed
optional enumerateAllowed
```

Evaluate Cedar, OpenFGA, and application-native implementations only after concrete policy workloads exist. Backend entity models must not redefine Arrokoth authority.

### 2.3 Progressive descriptor discovery mechanics

The semantic principle is already canonical: authority filtering precedes discovery/exposure.

Open implementation questions:

```text
BM25 vs embedding vs hybrid ranking
cache/invalidations
lazy schema hydration
per-domain tiering
provider-aware top-N packing
model-visible discover/search operation
search→describe→call without extra model turns
quality/recall/latency/token benchmarks
```

Discovery should remain heterogeneous and typed:

```text
Operation
Resource
Agent/Workflow service
memory interface
Skill
interaction template
```

---

## 3. Memory evolution

The four memory forms and provenance rules are canonical in [`memory.md`](memory.md). Future work is about exact APIs/backends.

### 3.1 Derived Semantic Memory provider contract

Still to settle:

```text
portable claim representation
minimal provenance requirements
confidence/quality metadata
derivation model/version metadata
correction/supersession links
temporal validity / reference-time support
source indexing/materialization
```

Do not require a graph representation in the kernel.

Slice F.3 (`development/023-slice-f3-derived-semantic-memory-provenance-promotion.md`) implemented a
**reference** `DerivedSemanticClaim` shape (`{ claimId, statement, provenance { sourceRefs≥1 unique,
derivedAt ISO-8601, derivation { method, version? } } }`), a replaceable `DerivedSemanticMemoryProvider`
port, and an explicit `DerivedMemoryExtractor` seam, sufficient to make the vertical slice executable.
That is reference-implementation evidence, **not** an answer to any question above: F.3 deliberately
omitted confidence, temporal validity, subjects/entities, and supersession links, and the reference
lexical ranking is explicitly not canonical retrieval semantics. Every question in this list remains
open for a portable-schema slice.

### 3.2 Promotion and trust policy

Need concrete application patterns for:

```text
when inferred claim can become Structured Memory
human vs deterministic verification
source trust classes
multi-source agreement
promotion provenance
revocation/correction of promoted state
```

Derived Semantic Memory remains non-authoritative by default.

Slice F.3 implemented one narrow reference path: `promoteDerivedClaim(...)` builds an ordinary
`WriteMemory` proposal carrying an optional plain `MemoryWriteProvenance { sourceRefs?,
derivedClaimIds? }` that is persisted with the committed record and its history and is **not**
authorization evidence. Promotion trust policy (verification classes, multi-source agreement,
revocation/correction of promoted state) is still application-specific and unmodelled.

### 3.3 Memory scope/view implementation

Validate how application-defined scopes are represented across:

```text
storage namespaces
policy relations
MemoryView resolution
cross-Execution delegation
shared organization/world memory
```

Scope must not become an authorization shortcut.

### 3.4 Memory concurrency

Test:

```text
Structured Memory compare-and-set
field-level conflict/merge
transactional writes
provenance-preserving merge
Derived Memory concurrent extraction/dedup/supersession
Working Note branch handoff/commit
```

Slice G.0 (`development/024-slice-g0-structured-memory-optimistic-conflict.md`) implemented the first
item as a reference primitive - an optional whole-view `WriteMemoryProposal.expectedRevision`
compare-and-set with a distinct `memory.write_conflict` observation and a tested lost-update proof.
It is evidence, not the frozen API: field-level conflict/merge, transactional multi-field writes,
provenance-preserving merge, and the Derived/Working-Note items all remain open, and G.0's whole-view
granularity is deliberately coarse.

### 3.5 Memory backends

Evaluate simple native storage first, then optional adapters such as Mem0/Graphiti or application-specific systems.

A backend must not redefine:

```text
Structured vs Derived epistemic status
memory visibility/authority
Working Note semantics
Event/Effect/runtime semantics
```

---

## 4. Interoperability evolution

Current portable concepts and MCP/A2A/Agent Skills mappings are canonical in [`interoperability.md`](interoperability.md).

Future work includes implementing and testing actual bindings.

### 4.1 MCP

Build import/export vertical slices for:

```text
Tools / Operations
Resources
Prompts/templates
long-running Tasks
elicitation/input requirements
change notifications/subscriptions
```

The goal is semantic round-trip compatibility, not merely wire compatibility.

### 4.2 A2A

Implement client/server adapters when exported Agent services become concrete.

Validate:

```text
Agent Card projection
Task ↔ external async handle
Message/Artifact mapping
input-required/auth-required continuation handling
persistent interaction/context grouping
cancellation/progress
```

Do not replace internal `call/spawn/send/ask` semantics with A2A.

### 4.3 Agent Skills and native Skill packaging

Composition owns the native Skill concept; interoperability owns the Agent Skills profile.

Open packaging questions:

```text
input/default binding format
one root Definition vs richer package roots
instruction-only vs composition-backed manifest
resource/reference packaging
requested authority/resource metadata
lossy export of composition-backed Skills
registry/versioning/distribution
```

### 4.4 Portable schema maturity

Evaluate when JSON Schema 2020-12 becomes the concrete portable service-schema contract rather than only the architectural direction.

Provider-facing schemas may remain constrained projections.

The MCP-1.1 post-proof audit added concrete evidence for that future work:

```text
input schemas need acceptance-set fidelity across differing defaults
portable output schemas need to describe every JSON top-level result kind
rich protocol results need portable Artifact/Resource representation rather than block leakage
```

The current narrow MCP adapter continues to refuse unrepresentable constraints and rich blocks. The
evidence supports the owning portable-schema/resource slice; it does not pull full JSON Schema,
output-schema redesign, or protocol content types into core early.

### 4.5 Optional client/projection protocols

Watch/build only when product surfaces require them:

```text
AG-UI
A2UI
MCP Apps
ACP
AsyncAPI
CloudEvents
other UI/message protocols
```

These remain projections, not kernel semantics.

---

## 5. Durability and scaling

After in-memory semantics are well tested, define durable ports/conformance for:

```text
Execution state
controller state
mailbox/Event cursors
PendingOperations
ControllerResumptions
Effect journal/idempotency
wait-for dependencies
structural/runtime budgets
projection snapshots/correlation
restart recovery
```

Candidate implementation families include:

```text
native database-backed runtime
DBOS
Temporal
other durable service/workflow runtimes
```

The selection criterion is Arrokoth semantic conformance, not feature count.

### Distributed Harness

A distributed implementation may later add:

```text
persistent scheduler queues
remote workers
large dormant Execution populations
worker affinity/placement
load/fairness controls
```

but must preserve one logical Harness and the same Execution/Event/Effect model.

---

## 6. Security evolution

Current guarantees/profiles live in [`security-guarantees.md`](security-guarantees.md).

### 6.1 Isolated hostile-code backend

Before claiming arbitrary-code containment, implement and review at least one backend satisfying the advertised profile:

```text
deny-by-default ambient access
scoped filesystem/workspace
network/egress restrictions
no raw production secrets
CPU/memory/time/process/output bounds
controlled Effect bridge
cross-principal isolation
fail-closed behavior
```

Candidate/reference mechanisms may include containers, gVisor, microVMs, WASM/isolate systems, Dify-Sandbox-like services, or managed sandbox providers.

### 6.2 Network/SSRF and filesystem hardening

Concrete hosted implementations still need APIs/policies for:

```text
private/metadata destination blocking
DNS/redirect validation
HTTP proxy/broker
path canonicalization
symlink/traversal protection
mount policy
workspace ownership
runtime-socket protection
```

### 6.3 Multi-tenant principal/control-plane model

Applications need concrete authenticated identities for:

```text
human/user
application/world
tenant/organization
Agent/service principal
resource owner
publisher
```

Validate how authenticated facts enter the authority policy seam without putting product tenancy semantics into the kernel.

### 6.4 Distributed/federated trust

When one logical system crosses administrative boundaries, evaluate:

```text
mTLS/workload identity
SPIFFE/SPIRE-like mechanisms
OAuth/OIDC service flows
signed/MACed delegated capabilities
UCAN-like attenuation proofs
remote worker attestation where useful
```

Do not add per-Execution keypairs merely for local conceptual purity.

### 6.5 Information-flow controls

Future high-security deployments may need:

```text
confidentiality labels
taint/provenance propagation
explicit declassification
message/result policy checks
resource-derived trust labels
```

This is beyond v0.4's explicit view/authority guarantees.

---

## 7. Public Skill/plugin ecosystem

A public distribution ecosystem will eventually need a supply-chain model separate from runtime authority:

```text
publisher identity
content addressing/hashes
signatures
version pinning/lockfiles
requested-authority manifests
sandbox-profile requirements
malware/static scanning
revocation/blocklists
provenance/audit
```

Keep:

```text
package provenance/integrity ≠ Effect authority
```

Recheck licenses/security posture for any reused implementation at the exact version selected.

---

## 8. Provider, telemetry, and backend reuse

Potential implementation reuse identified in research includes:

```text
ModelProvider
  native providers / Vercel AI SDK-like adapter

Policy
  Cedar / OpenFGA / application backend

Derived Semantic Memory
  Mem0 / Graphiti / application backend

Durability
  native DB / DBOS / Temporal / other

Isolation
  container/gVisor/microVM/WASM/managed backend

Telemetry
  OpenTelemetry GenAI projection
```

These are mechanisms behind Arrokoth-owned ports.

No backend should define Agent/Workflow progression, authority, memory epistemic status, Event/Effect meaning, or lifecycle semantics.

---

## 9. Conformance/evidence before abstraction

Future architecture changes should be justified by executable scenarios and measurements.

Important unresolved tests include:

```text
slow model invocation yields and resumes durably
ControllerResumption survives restart
stale model result after interleaving is detected
parallel Workflow branches merge deterministically
parallel Executions conflict safely on shared memory/resource
recursive spawn cannot exceed lineage structural budget
wait/deadlock candidates are diagnosable
lease expiry/fencing prevents stale holder mutation
Derived Memory preserves provenance/supersession
policy reverse enumeration scales Active View construction
progressive discovery improves token/latency without unacceptable recall loss
MCP/A2A round trips preserve authority/lifecycle distinctions
hostile-code profile blocks ambient filesystem/network/secret access
control-plane IDs are not bearer authorization
```

> **Add runtime machinery only when it makes real applications easier to express, operate, secure, or reason about.**

> **Prefer semantic evidence over architectural uniformity.**

---

## 10. Agent effectiveness and engineering experiments

The canonical architecture primarily answers:

```text
What is an Agent/Workflow/Execution?
Who owns semantic progression?
How does work cross the runtime boundary?
What is authorized?
How is state retained and observed?
How can the system wait, resume, recover, compose, and remain contained?
```

A separate engineering question is:

> **Given those safe and coherent semantics, how should an Agent be scaffolded so it performs useful work well?**

These concerns should normally remain replaceable strategies evaluated against representative workloads.

### 10.1 Behavioral Agent evals

Begin behavioral evaluation with the first reference Agent rather than waiting for architecture stabilization.

Keep the distinction:

```text
conformance tests
  prove semantic/runtime/security invariants

behavioral Agent evals
  measure whether a concrete Agent + model + strategy succeeds at tasks
```

A useful eval model distinguishes:

```text
Task
Trial
Trajectory / transcript
Environment outcome
Grader
Agent configuration
Model/deployment
```

Questions to test:

```text
How often does the Agent actually accomplish the task?
Does it select the right operation?
Are arguments semantically correct?
Does it recover from operation failure or authority denial?
How many unnecessary operations/model calls occur?
What are token, latency, and cost distributions?
Does success remain stable across repeated stochastic trials?
Does the environment confirm success independently of the Agent's claim?
```

Do not make the behavioral eval harness part of Execution semantics merely because it observes the Agent closely.

### 10.2 Agent-computer interface (ACI) and operation design

The model-facing interface is broader than the raw backend API.

Evaluate:

```text
operation naming and namespace
semantic operation granularity
operation overlap/confusability
description length and structure
when-to-use / when-not-to-use guidance
input-schema design and mistake-proofing
enums vs free-form strings
few-shot operation-call examples
output schema usefulness
result verbosity / pagination / truncation
error categories plus model-actionable explanation
stable logical references in results
concise vs detailed result modes
```

The portable Operation descriptor should contain durable semantic facts. Model-specific ACI wording, examples, result shaping, and ranking can remain projection/strategy concerns unless evidence shows a more durable contract is needed.

### 10.3 Model-facing observation/result projection

Keep the semantic result separate from the representation placed back into the model context.

Experiments should compare:

```text
raw structured result
vs concise semantic result
vs summarized result
vs references + lazy follow-up reads

full error payload
vs normalized category + actionable explanation

large result in one turn
vs pagination / bounded excerpts
```

The same semantic Event/result should be usable under multiple projection strategies without modifying the executor, authority decision, or Event meaning.

### 10.4 Context strategy and context budgeting

The canonical rule remains:

```text
memory / retained information != invocation context
```

Evaluate policies such as:

```text
full recent history
sliding window
summary/compaction
retrieval over older history
structured Working Notes
Artifact references/excerpts
fresh-context handoff
importance/recency selection
model-specific token budgeting
operation-result compaction
context caching
```

Measure both task quality and context efficiency. Larger context is not automatically better context.

### 10.5 Long-horizon progress protocols

Long-running work may need explicit externalized continuity rather than assuming one model context persists forever.

Experiments may use:

```text
progress/state files
feature/task ledgers
Working Notes
Artifacts
git history/checkpoints
structured next-step records
initializer passes
fresh-context workers
periodic compaction
restart/reconstruction prompts
```

Questions:

```text
What minimum state lets a fresh context resume correctly?
Which state should be Structured Memory, Working Notes, Artifact, or ordinary application state?
When is continuous context superior to fresh-context handoff?
How does model capability change the optimal scaffolding?
```

Do not create a new Execution kind or Effect merely to encode one long-horizon coding pattern.

### 10.6 Verification and backpressure

For tasks with external ground truth, test explicit feedback mechanisms:

```text
tests
compiler/type checker
linter/static analysis
browser/UI inspection
simulator
query/result validation
policy checker
independent evaluator
human review
```

Questions:

```text
Which feedback should be mandatory before completion?
Which feedback can be requested opportunistically by an Agent?
When should generation and evaluation use separate Agents/Workflows?
How do we prevent self-evaluation from becoming unsupported self-approval?
```

Prefer environment-grounded outcome checks when available.

### 10.7 Planner / generator / evaluator compositions

Test whether explicit role separation improves specific workloads:

```text
planner → generator → evaluator
orchestrator → parallel workers → synthesis
generator → verifier → revision loop
```

These should normally be expressed through existing Agent/Workflow/child composition semantics.

Do not add `PlannerExecution`, `EvaluatorExecution`, or similar kernel kinds unless a genuinely new independent runtime identity requirement emerges.

### 10.8 Subagent strategy

Existing `SpawnExecution`/`call` semantics can support many multi-Agent strategies. Evaluate:

```text
when delegation improves quality or latency
how much context to delegate
how to describe child responsibilities
parallel vs sequential children
specialized vs homogeneous children
result aggregation/synthesis
child token and structural budgets
failure/cancellation strategy
```

Separate the effectiveness question "should I spawn a child?" from the runtime question "is this spawn authorized, bounded, and correctly supervised?"

### 10.9 Large-catalog operation discovery

Continue the progressive-discovery work in §2.3 with behavioral measurements.

Compare:

```text
static explicit Active View
BM25/lexical ranking
embedding retrieval
hybrid ranking
provider-native tool search
model-visible discover/search operation
search → describe → invoke
lazy schema hydration
cached view expansion/contraction
```

Metrics should include:

```text
task success
tool recall
wrong-tool rate
selection latency
extra model turns
input tokens
schema hydration cost
```

Do not make an LLM selector mandatory without evidence that it improves the full task-level tradeoff.

### 10.10 Programmatic/code-mediated operation use

For operation-heavy tasks, evaluate whether the model should sometimes write bounded code that performs several ordinary API/portable Operation calls rather than invoking every operation as a separate model turn.

Potential benefits to measure:

```text
fewer model turns
less intermediate context pollution
better loops/filtering/aggregation
more natural manipulation of large structured results
```

Potential risks to measure:

```text
larger execution/containment surface
loss of per-step model oversight
error handling complexity
authority mediation bypass if designed incorrectly
```

Any code-mediated path must preserve the relevant authority/security boundary; ordinary trusted Workflow/function code may call ordinary APIs directly where the application intentionally owns that authority, while untrusted/model-generated code requires an appropriate mediated/isolated design.

### 10.11 Prompt and model-specific Agent strategies

Evaluate model-specific choices without leaking them into semantic Definitions unnecessarily:

```text
system instruction variants
reasoning/effort settings
operation-call examples
recovery instructions
planning instructions
context packing
result verbosity
stop/completion guidance
```

The same Agent/Workflow semantic Definition should remain portable where possible, with deployment/reference strategy selecting model-specific behavior.

### 10.12 Harness/scaffold simplification as models improve

External literature often calls the whole model scaffold an "agent harness"; Arrokoth's canonical `Harness` is narrower and should not absorb every scaffold strategy.

Actively test whether previously useful scaffolding can be removed when newer models improve.

Examples:

```text
mandatory planning passes
forced context resets
extra evaluator turns
verbose tool guidance
manual decomposition rules
special-case retry loops
```

Optimization includes deleting machinery that no longer earns its complexity.

---

## 11. Evaluation-grade model invocation observability

Behavioral optimization requires inspecting what the model actually saw and did. Preserve a non-semantic trace/observer seam capable of reconstructing or referencing, according to deployment/privacy policy:

```text
Execution / Activation / controller revision
resolved model/deployment
information-context selection identity/digest
operation projection identity and bindings
model request metadata
semantic model output / operation calls
usage / latency / finish reason
normalized provider diagnostics/failure
resulting controller decision
causation/correlation identifiers
```

Keep:

```text
model invocation trace != Event
trace record != durable memory
trace identifier != authority credential
```

Raw prompts/provider payloads do not need mandatory production persistence. Evaluation/debug deployments should nevertheless be able to capture enough information to compare ACI/context/AgentExecutor strategies and inspect failure trajectories.

Open questions:

```text
portable trace schema vs OpenTelemetry-only projection
privacy/redaction defaults
prompt/result sampling
content-addressed large payload storage
how much rendered context must be retained for reproducibility
model/provider/version fingerprinting
linkage from outcome grader back to invocation trajectory
```

---

## 12. Evidence loop for Agent engineering

Use a repeated experimental loop:

```text
hypothesis
  ↓
representative tasks
  ↓
multiple trials
  ↓
trajectory + environment outcome
  ↓
metrics / grader / human inspection
  ↓
change one strategy or interface
  ↓
repeat
```

Prefer promoting outcomes into one of these categories:

```text
application pattern
reference strategy
optional adapter/provider feature
recommended descriptor guidance
conformance invariant (only if truly semantic)
canonical architecture change (rare; requires strong evidence)
```

A successful experiment should **not** default to creating a new kernel primitive.

The long-term goal is:

> **Stable semantics underneath; aggressively replaceable Agent engineering above; evidence connecting the two.**

---

## 13. Pre-v1 terminology and model-facing vocabulary review

The current canonical documents freeze **semantic distinctions**, not a claim that every English/API term is already optimal for v1.

Names matter for two different audiences:

```text
human developers/readers
  must form the intended mental model quickly and distinguish neighboring concepts

models/Agents
  may receive selected names/descriptions through prompts, schemas, diagnostics,
  operation projections, or generated documentation
```

A term can therefore be semantically correct yet still be a poor public or model-facing name.

Before the v1 public API/documentation freeze, perform an explicit terminology review across at least:

```text
Execution
Activation
Harness
Agent
Workflow
Stage
Event
Effect
PendingOperation
ControllerResumption
Operation
Capability
Resource
Active/Exposed View
Model Invocation Projection
Memory / Structured Memory / Derived Semantic Memory / Working Notes / Artifact
Skill
spawn / call / send / ask
```

Questions to evaluate for each term:

```text
Does the name accurately imply the canonical semantic boundary?
Does common software/AI usage give the same term a materially different meaning?
Is it easy to distinguish from neighboring Arrokoth concepts?
Can a new developer predict its role before reading several pages of qualification?
Does it produce misleading expectations in generated docs, prompts, or model reasoning?
Is a more explicit name worth the additional verbosity?
Would a rename reduce or increase ambiguity in MCP/A2A/API mappings?
What migration cost would the rename create in public APIs, persisted records, examples, and docs?
```

Do not optimize terminology by popularity alone. For example, external literature may use `agent harness` for a much broader scaffold than Arrokoth's current `Harness`; replacing the name with `Runtime` may or may not improve things because `Runtime` also has several established meanings.

### 13.1 Separate four naming layers

Do not assume one word must serve every layer:

```text
canonical concept name
  the architecture term used to state invariants

public API/type name
  the programmer-facing representation

model-facing ACI vocabulary
  names/descriptions selected for model comprehension and action choice

protocol/UI projection
  MCP/A2A/HTTP/Studio/product terminology
```

These may intentionally differ when translation is explicit and stable.

For example, keeping an internal/runtime concept named `Effect` does not imply that a model should see a tool called `UseCapability` or `SendMessage`. The model-facing ACI should normally expose domain-meaningful operations, and those operations may compile to Effects internally.

Likewise, protocol terms such as MCP `Tool`, A2A `Task`, or another ecosystem's `Session` should not rename stronger Arrokoth concepts merely to avoid adapters having vocabulary mappings.

### 13.2 Review method

Use evidence instead of a one-pass global search-and-replace:

```text
1. build a glossary of current terms and one-sentence boundaries
2. identify terms with external semantic collisions or repeated reader confusion
3. generate a small candidate set for each problematic term
4. test candidate terminology in architecture excerpts and public API examples
5. test model-facing candidates on representative selection/reasoning tasks where relevant
6. compare comprehension errors, wrong-operation choices, ambiguity, and verbosity
7. decide concept name, API name, and model-facing vocabulary separately when useful
8. perform any accepted repo-wide rename before v1 compatibility commitments
```

Useful evidence may include:

```text
maintainer/new-contributor comprehension reviews
LLM explanation/selection tests using otherwise identical context
API ergonomics examples
searchability and collision with industry/framework terminology
protocol mapping clarity
migration scope generated from code/docs search
```

### 13.3 Timing

Do not interrupt v0.4 merely to rename coherent concepts.

Target the broad review after enough of the architecture has been exercised together to expose real confusion, but before v1 API stabilization—ideally during the v0.8 integration / v0.9 stabilization period.

If a term is discovered earlier to be actively causing implementation mistakes or forcing the wrong semantic ownership, fix it earlier. Otherwise prefer collecting evidence and making coordinated terminology changes once, rather than repeatedly renaming the architecture as external vocabulary evolves.

> **Semantic clarity comes first; terminology should then make that clarity obvious to both humans and models.**