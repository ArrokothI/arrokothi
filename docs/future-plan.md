# Future Plan

This roadmap describes how the repository should move from the current implementation toward the canonical model in [`mental-model-v0.4.md`](mental-model-v0.4.md), using [`mental-model-to-implementation-model.md`](mental-model-to-implementation-model.md) as the implementation translation.

The roadmap should answer **what remains to be built or migrated**, not redefine the architecture.

The guiding rules are:

> **One mental model in core. Compatibility may exist at boundaries, but new features should not depend on competing definitions of Agent, Workflow, lifecycle, or authority.**

> **Preserve working implementation where its responsibility still matches the target model. Replace abstractions where they encode the wrong semantics.**

> **Own kernel semantics and invariants; keep concrete mechanisms replaceable behind narrow ports.**

---

# 1. Target state

The target kernel vocabulary is:

```text
ExecutableDefinition
        ↓ instantiate
Execution
├── lifecycle / Activation
├── mailbox / Events
├── EffectRequests
├── ownership
├── communication handles/routes
├── Authority Envelope
├── Active Capability View
├── control state
├── Memory Bindings
├── pending operations
└── trace / durability

Workflow → system-owned semantic topology
Agent    → model-owned semantic topology
```

The implementation stack remains modular:

```text
Kernel semantics             Arrokoth-owned
Agent execution              Strands as primary implementation initially
Model inference              provider-neutral ModelProvider
Knowledge / RAG              provider-neutral contract; LangChain initially useful
Tools                        native capabilities; MCP as a major transport boundary
Persistence                  in-memory / SQLite initially; production adapters later
Messaging                    kernel semantics; storage/broker mechanism replaceable
Tracing                      Arrokoth-native semantics; standard exporters later
Sandbox / computer use       external implementations behind capability boundaries
```

A backend may change without changing what an Execution, Agent, Workflow, Event, Effect, memory write, or authority boundary means.

---

# 2. Current implementation reality

The current code already contains several valuable pieces:

```text
AgentRuntime
AgentHarness
AgentLoopEngine
StrandsLoopEngine
ReferenceLoopEngine
ModelProvider
CapabilityGateway
KnowledgeRetriever
Structured Memory
Working Notes
ContextCompiler
Flow / Phase
WorkflowCoordinator
Session journal / durability
confirmation / idempotency
```

The problem is not that all of this is wrong. The problem is that some pieces still encode the older mental model:

```text
Agent-centric external-turn coordinator
semantic Preflight as implicit Agent behavior
Phase as Agent-control structure
workflow strategy that is not the target Workflow abstraction
run/result assumptions that are too terminal-turn oriented
parent/child execution without arbitrary communication semantics
```

Migration should preserve behavior where possible while moving conceptual ownership.

---

# 3. v0.4 — Establish the execution substrate

The goal of v0.4 is to make core speak the new vocabulary even if advanced composition is still incomplete.

## 3.1 Definition / Execution split

Introduce or normalize:

```text
ExecutableDefinition
ExecutionRecord
ExecutionId
owner relation
LifecycleState
```

Definitions should become a discriminated union:

```text
LLM
Function
Agent
Workflow
```

Remove the conceptual dependency on one universal `instructions` / `input → output` shape.

Support:

```text
start schema
inbox schema
optional terminal-result schema
```

for the kinds that need them.

## 3.2 Lifecycle and Activation

Make long-lived Executions first-class:

```text
CREATED → READY → RUNNING ↔ WAITING
                  ↓
      COMPLETED / FAILED / CANCELLED
```

Add Activation semantics so an Agent can live indefinitely without continuously consuming compute.

The runtime must support:

```text
wake from new Event
resume from durable state
ordinary response without completion
terminal result as optional
```

## 3.3 Normalize Events and Effects

Establish one inbound Event envelope and one outbound Effect model.

Initial Effect set:

```text
UseCapability
SpawnExecution
SendMessage
WriteMemory
```

Do not add a fundamental Wait Effect. Waiting is scheduler/lifecycle state.

Initial Event support should cover at least:

```text
start
message received
capability success/failure
timeout/timer
permission decision
control/cancellation
```

## 3.4 Generalize authority

Keep an immutable Authority Envelope per Execution.

Authority should expand beyond tool lists to cover:

```text
capabilities / knowledge
memory access
spawnable definitions
communication routes
consequential actions
```

Preserve:

```text
owned child authority ⊆ owner authority
Active Capability View ⊆ Authority Envelope
```

Capability discovery must remain exposure/context selection, not privilege escalation.

## 3.5 Memory Bindings

Replace broad implicit memory-policy assumptions with explicit binding semantics:

```text
structured
notes
artifact
```

with lifetime, visibility, access, and commit policy.

Preserve existing structured-memory provenance/correction behavior and Working Notes.

Keep control state separate from semantic memory.

## 3.6 Agent path cleanup

Keep `AgentLoopEngine` / `StrandsLoopEngine` as implementation boundaries, but align them to Activation/Event/Effect semantics.

The current semantic Preflight must become explicit:

- remove it from the pure Agent path when it is only scaffolding; or
- represent it as explicit compatibility/controller behavior when intentionally desired.

Do not let Preflight remain the hidden semantic definition of Agent.

## 3.7 Phase / Flow ownership

Stop expanding Phase as an Agent abstraction.

Retain useful implementation pieces for future Workflow:

```text
condition DSL
transition tracing
stage configuration/objective
capability-view narrowing hints
```

## v0.4 outcome

At the end of v0.4, the code should be able to explain itself in these terms:

```text
Definition → Execution
Execution consumes Events
Execution emits Effects
Runtime owns lifecycle/authority/durability
Agent controller is model-driven
```

Even if real Workflow and peer messaging are still partial, no new core feature should depend on the older AgentHarness/Phase mental model.

---

# 4. v0.5 — Workflow, recursive execution, and addressable communication

The goal of v0.5 is to make the composite model real.

## 4.1 Implement the real Workflow controller

Workflow owns predefined semantic topology.

A Stage should roughly contain:

```text
id
executor reference
input mapping
optional requested authority / view hints
predefined transitions
```

The Workflow may:

```text
run LLM leaves
run functions
spawn/call Agents
spawn/call Workflows
wait for Events
loop indefinitely
terminate optionally
```

Do not require an End stage.

## 4.2 Recursive execution

Support:

```text
Workflow → Agent
Workflow → Workflow
Agent → Workflow
Agent → Agent
```

Every spawned Execution receives:

```text
independent identity
narrowed authority
private control state
explicit Memory Bindings
budget/deadline
lifecycle
mailbox
trace identity
```

A subagent remains an ordinary child Agent Execution, not a special framework concept.

## 4.3 Pending operations and durable waiting

Introduce first-class pending-operation records for:

```text
async capability call
knowledge retrieval
child terminal result
peer reply
timer
approval
remote job
```

Ensure WAITING/READY transitions and restart recovery work without model-specific assumptions.

## 4.4 Addressable `ExecutionHandle`

Add a safe handle/routing abstraction for existing Executions.

Support high-level semantics such as:

```text
spawn
send
ask
call
```

with:

```text
ask  = send + correlation + timeout
call = spawn + wait for terminal result
```

## 4.5 Separate ownership tree from communication graph

Implement arbitrary authorized peer communication.

Required invariants:

```text
can message X ≠ owns X
can message X ≠ can cancel X
can message X ≠ can inspect X memory
```

This should support:

```text
Agents meetings
peer critique
cooperating specialists
Paper-Agent knowledge network
long-lived service-style Agents
```

without sharing full context.

## 4.6 Messaging router / mailbox durability

Add routing semantics for:

```text
message validation
authorization
correlation / causation ids
durable delivery
wake-up
ordering/dedup policy
communication tracing
```

The physical mechanism may initially use the existing persistence stack rather than requiring a distributed broker.

## 4.7 Cancellation / budgets / supervision

Make ownership the default supervision relation.

Support:

```text
budget allocation to children
execution deadlines
operation timeouts
cancellation propagation
independent peer communication rights
```

## 4.8 Trace graph

Tracing must expand beyond a pure execution tree.

Represent both:

```text
ownership edges
communication/effect causation edges
```

so an Agents meeting remains understandable without pretending every message is a parent-child call.

## 4.9 Public Execution resources

Once semantics stabilize, begin exposing public surfaces around:

```text
Definitions
Executions
Events
messages
cancellation
results where terminal
```

High-level Agent APIs must map onto these resources rather than define a parallel runtime.

## v0.5 outcome

At the end of v0.5:

- Agents and Workflows are fully composable peers;
- Executions may be long-lived and addressable;
- ownership and communication are separate;
- peer Agents can communicate without context sharing;
- durable waiting is generic;
- the old Phase system is not required for new designs.

---

# 5. v0.6 — Scale: capability discovery, large agent populations, retrieval, Skills

The goal of v0.6 is to make the same semantics work at large scale.

## 5.1 Capability Profiles

Introduce reusable named groupings such as:

```text
Biomedical Research
Software Development
Financial Analysis
Customer Support
```

Profiles select/expose capabilities from existing authority. They never grant authority.

## 5.2 Capability discovery and Active View selection

Support progressively more powerful selection mechanisms:

```text
static/default view
→ profiles
→ metadata / keyword retrieval
→ embedding retrieval
→ hybrid retrieval
→ optional model-assisted selection
```

This mechanism should work not only for tools/knowledge, but also for large populations of addressable Executions where appropriate.

Example:

```text
Search Agent
  authority: query large Paper-Agent population
  active view: only P17, P91, P203 for this activation
```

## 5.3 Large Execution populations

Explore efficient implementation for many dormant addressable Agents:

```text
cold storage
lazy rehydration
indexed discovery
eviction/caching
sharded persistence
```

Semantics must remain:

```text
addressable Execution
private state/context
message-driven wake-up
```

regardless of whether the process is resident in memory.

## 5.4 Retrieval / RAG optimization

Keep retrieval decomposable and benchmark-driven:

```text
ingestion / parsing
chunking
embedding
lexical / vector / hybrid search
metadata filtering
query rewrite / expansion
fusion
reranking
context packing
```

Arrokoth owns authorization, provenance, result contracts, visibility, and tracing. Frameworks implement algorithms behind those contracts.

## 5.5 Skills

Add provider-neutral Skills as packaging:

```text
Skill
├── prompts/instructions
├── resources/references
├── scripts/assets
├── root ExecutableDefinition
└── recommended Capability Profile / requested authority
```

A Skill is not another controller.

## 5.6 Artifact/file memory

Add persistent workspace artifacts where useful for long-running Agents and Workflows.

Keep files/resources as memory, not hidden control flow.

## 5.7 Heterogeneous Agents

Evaluate structures such as:

```text
strong coordinator Agent
   ├── cheap/local worker Agents
   ├── specialist Paper Agents
   └── critique Agent
```

Because AgentExecutor and ModelProvider are separate, parent and peers may use different models without changing kernel semantics.

## v0.6 outcome

The same kernel should scale from:

```text
one simple Agent
```

to:

```text
large populations of dormant/addressable Agents
+ narrow Active Views
+ retrieval/discovery
+ peer messaging
+ long-lived Workflows
```

without introducing a second orchestration model.

---

# 6. Implementation-package strategy

The repository should continue toward:

```text
packages/
├── core/
├── client/
├── server/
├── presets/
├── agents/
├── models/
├── knowledge/
├── tools/
├── storage/
├── sandbox/
└── observability/
```

Only `packages/core` defines kernel semantics.

Concrete packages may be first-class supported software while remaining replaceable.

Examples:

```text
@arrokoth/agent-strands
@arrokoth/model-gemini
@arrokoth/knowledge-langchain
@arrokoth/tool-mcp
@arrokoth/storage-sqlite
```

Do not create alternate implementations merely to prove theoretical flexibility. Add them when they prove a boundary, remove a limitation, or improve measured quality/cost/reliability.

---

# 7. Evidence and benchmarks

Architecture should be justified with conformance and behavioral evidence.

Important benchmark/test areas:

```text
Agent task quality
Workflow correctness
Authority enforcement
message authorization/isolation
durable waiting/resume
idempotency
memory provenance
context selection
retrieval quality
executor conformance
cost / latency
large dormant-Execution populations
```

Particularly important conformance invariants include:

```text
unauthorized message rejected
peer message does not expose private context
communication permission does not imply lifecycle control
ordinary Agent response does not terminate the Execution
leaf completion does not terminate owner
WAITING Execution wakes correctly after restart
owned child authority never exceeds owner authority
Active View never exceeds authority
Workflow never takes an undefined semantic transition
```

---

# 8. Migration principle

The implementation migration should be conservative:

```text
1. stabilize vocabulary/contracts
2. adapt existing working behavior to those contracts
3. add missing substrate semantics
4. remove compatibility abstractions only after replacement is proven
5. expand integrations after the kernel boundary is clear
```

Do not combine the deepest semantic refactor with unrelated package movement or provider churn.

Compatibility adapters at system boundaries are preferable to duplicate semantics in core.

---

# 9. Documentation roles

The active documents should have distinct jobs:

```text
mental-model-v0.4.md
  → what Arrokoth means

mental-model-to-implementation-model.md
  → how those semantics map to runtime components/contracts

future-plan.md
  → what to build/migrate next

repository-structure-plan.md
  → where supported code should live

mental-model-v0.37.md
  → historical/current-implementation context
```

New architecture decisions that should not be casually reversed can later move into ADRs.

---

# 10. Roadmap summary

```text
v0.4
  Definition / Execution
  lifecycle + Activation
  Event / Effect normalization
  authority + Active View
  Memory Bindings
  Agent-path cleanup
  Phase migration

v0.5
  real Workflow
  recursive execution
  generic pending operations
  addressable ExecutionHandle
  arbitrary authorized messaging
  ownership vs communication graph
  durable mailboxes
  supervision + trace graph

v0.6
  capability/Execution discovery at scale
  large dormant Agent populations
  retrieval optimization
  Skills
  artifact memory
  heterogeneous Agent populations
```

The target is not maximum architectural machinery. It is the smallest kernel that preserves clear authority, durable state, independent context, composable control flow, and useful model autonomy.
