# Mental Model → Implementation Model

> **Status: implementation guide for the canonical v0.4 mental model.**
>
> Read [`mental-model-v0.4.md`](mental-model-v0.4.md) first. That document defines the semantics. This document does **not** redefine them; it translates them into implementation boundaries, runtime records, ports, and invariants.

The mental model can be summarized as:

```text
ExecutableDefinition → Execution
Execution + Event → EffectRequest(s)
EffectRequest → Runtime → Event

Workflow: system owns semantic topology
Agent:    model owns semantic topology
```

The implementation goal is therefore not to build separate runtimes for Agents, Workflows, tools, messaging, and durable waiting. It is to build one execution substrate with type-specific controllers.

A second rule remains fundamental:

> **Arrokoth owns kernel semantics and invariants. Concrete model, agent-loop, retrieval, tool transport, storage, sandbox, and observability mechanisms remain replaceable behind explicit ports.**

---

## 1. Target runtime shape

A useful target architecture is:

```text
                         ARROKOTH KERNEL
┌─────────────────────────────────────────────────────────────────────┐
│ Definitions / Executions / Handles                                │
│ Lifecycle / Scheduler / Activations                               │
│ Event + Effect semantics                                           │
│ Ownership + communication routing                                  │
│ Authority Envelope + Active Capability View                        │
│ CapabilityGateway                                                  │
│ Memory bindings + provenance                                       │
│ Workflow controller                                                │
│ Agent executor contract                                            │
│ Context visibility rules                                           │
│ Durability / idempotency / tracing                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                     replaceable implementation ports
                               │
       ┌───────────────────────┼───────────────────────────────┐
       ▼                       ▼                               ▼
 Agent executor          Model provider                  Knowledge
 Strands                 Gemini / compatible            LangChain
 reference               local/self-hosted              direct/custom
 future adapters         future providers               other frameworks

       ▼                       ▼                               ▼
 Tool transport          Persistence                    Sandbox
 Native / MCP            memory / SQLite                local / Docker
 HTTP / OpenAPI          Postgres / future              remote providers

                               ▼
                         Observability
                       OTel / external sinks
```

The dependency direction matters more than class names:

```text
implementation packages → @arrokoth/core
@arrokoth/core           -X→ framework-specific production SDKs
```

---

## 2. Definitions: use a discriminated union

The mental model intentionally removed a universal `instructions` field. The implementation should reflect that.

A common definition envelope should contain only genuinely shared concerns:

```ts
interface DefinitionBase {
  id: string
  version: string
  kind: "llm" | "function" | "agent" | "workflow"
  interface: ExecutionInterface
  requestedAuthority?: AuthorityRequest
  memoryBindings?: MemoryBindingDefinition[]
  metadata?: Record<string, unknown>
}
```

Then use kind-specific bodies:

```ts
interface LLMDefinition extends DefinitionBase {
  kind: "llm"
  spec: {
    prompt: PromptTemplate
    modelPolicy?: ModelPolicy
  }
}

interface FunctionDefinition extends DefinitionBase {
  kind: "function"
  spec: {
    implementation: FunctionRef
  }
}

interface AgentDefinition extends DefinitionBase {
  kind: "agent"
  spec: {
    prompt: PromptTemplate
    modelPolicy?: ModelPolicy
    agentPolicy?: AgentPolicy
  }
}

interface WorkflowDefinition extends DefinitionBase {
  kind: "workflow"
  spec: {
    entry: StageId
    stages: WorkflowStageDefinition[]
  }
}
```

This is illustrative rather than a frozen API. The important implementation rule is:

> **Shared envelope, kind-specific executable body.**

### Execution interface

Do not model every executable as `inputSchema → outputSchema`.

Use the three semantic channels from the mental model:

```ts
interface ExecutionInterface {
  start?: Schema
  inbox?: Schema
  terminalResult?: Schema
}
```

Typical defaults:

```text
LLM / Function
  start           yes
  inbox           no
  terminalResult  yes

Agent / Workflow
  start           optional
  inbox           optional/yes
  terminalResult  optional
```

A developer-facing convenience API may still expose `run(input)`, but it should compile down to these semantics rather than define a second model.

---

## 3. Execution is the durable runtime identity

The previous `ExecutionRun` concept should evolve into the canonical `Execution` runtime record.

Conceptually:

```ts
interface ExecutionRecord {
  id: ExecutionId
  definition: ExecutableDefinitionRef

  owner?: ExecutionId
  rootExecutionId: ExecutionId

  lifecycle: LifecycleState
  authority: AuthorityEnvelope
  activeView: ActiveCapabilityView

  controlState: unknown
  memoryBindings: BoundMemoryRef[]

  mailboxCursor?: EventCursor
  pendingOperations: PendingOperationRef[]

  budget: EffectiveBudget
  deadline?: Timestamp

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

A definition is reusable. An Execution is addressable, stateful, and durable.

The runtime should be able to answer independently:

```text
What definition is this?
What Execution instance is this?
Who owns it?
Who may communicate with it?
What authority does it have?
What is it waiting for?
What memory is attached?
What happened to it?
```

---

## 4. Activation is a scheduler concept, not a persistent Agent loop thread

A long-lived Execution does not continuously consume compute.

The scheduler creates an **Activation** whenever runnable Events are available.

Conceptually:

```ts
interface Activation {
  executionId: ExecutionId
  activationId: string
  inputEvents: EventRef[]
  startedAt: Timestamp
  budgetSlice?: BudgetSlice
}
```

Lifecycle transitions commonly look like:

```text
WAITING --event arrives--> READY
READY   --scheduled-----> RUNNING
RUNNING --no runnable work/pending dependency--> WAITING
RUNNING --terminal success--> COMPLETED
RUNNING --terminal failure--> FAILED
*       --cancel--------> CANCELLED
```

The scheduler, not the LLM, owns these operational transitions.

### One logical writer by default

One Execution should normally have only one controller Activation mutating its control state/memory at a time.

Multiple messages/results may arrive concurrently, but the mailbox can serialize or batch them for the next Activation.

Parallelism belongs primarily in Effects, child Executions, and external operations unless a future explicit concurrent-controller model is introduced.

---

## 5. Events: normalize observations into one inbound contract

All asynchronous input should re-enter an Execution through a normalized Event envelope.

Conceptually:

```ts
interface EventEnvelope<T = unknown> {
  id: EventId
  executionId: ExecutionId
  type: string
  payload: T

  source?: EventSource
  correlationId?: string
  causationId?: string

  createdAt: Timestamp
  provenance?: Provenance
}
```

Representative event types:

```text
execution.started
message.received
capability.succeeded
capability.failed
execution.spawned
execution.completed
execution.failed
operation.timeout
permission.decided
timer.fired
control.cancel_requested
```

Do not force every event type into the model context verbatim. The Event log is runtime truth; the ContextCompiler decides which observations are eligible and how they are represented to a model.

### Failure is usually an Event first

A tool/API/knowledge failure should normally produce a failure Event/Observation, not directly transition the containing Agent to `FAILED`.

The controller may retry, choose another capability, ask a peer, or surface the issue.

---

## 6. Effects: one gateway from controller intent to reality

Controllers should return normalized Effect requests rather than directly mutating external systems.

A compact semantic union is:

```ts
type EffectRequest =
  | UseCapabilityEffect
  | SpawnExecutionEffect
  | SendMessageEffect
  | WriteMemoryEffect
```

Every Effect receives identity/correlation metadata so it can be traced and made idempotent where necessary.

### `UseCapability`

```ts
interface UseCapabilityEffect {
  type: "use_capability"
  capability: CapabilityRef
  input: unknown
  idempotencyKey?: string
}
```

This passes through `CapabilityGateway`.

It covers native tools, MCP, knowledge retrieval, external APIs, sandboxes, browsers, etc.

Knowledge remains semantically distinguishable through capability metadata and result/provenance types; it does not require a separate orchestration path.

### `SpawnExecution`

```ts
interface SpawnExecutionEffect {
  type: "spawn_execution"
  definition: ExecutableDefinitionRef
  start?: unknown
  requestedAuthority?: AuthorityRequest
  budget?: BudgetRequest
  deadline?: Timestamp
}
```

The runtime creates a new addressable Execution and records ownership.

### `SendMessage`

```ts
interface SendMessageEffect {
  type: "send_message"
  target: ExecutionHandle
  message: unknown
  correlationId?: string
}
```

The router validates communication authority and writes a `message.received` Event to the target mailbox.

### `WriteMemory`

```ts
interface WriteMemoryEffect {
  type: "write_memory"
  binding: MemoryBindingRef
  operation: MemoryOperation
}
```

The runtime validates access, schema, provenance, and commit policy before durable mutation.

### No `Wait` Effect

Waiting should be derived from scheduler state. If the controller finishes an Activation with unresolved operations or no runnable work, the Execution becomes `WAITING`.

---

## 7. Pending operations unify async capability calls, replies, timers, and child results

The runtime needs a first-class pending-operation record.

```ts
interface PendingOperation {
  id: OperationId
  executionId: ExecutionId
  kind: "capability" | "reply" | "child_result" | "timer" | "permission"
  correlationId?: string
  deadline?: Timestamp
  status: "pending" | "resolved" | "timed_out" | "cancelled"
}
```

This gives one scheduler mechanism for:

```text
async tool call
knowledge retrieval
waiting for another Agent's reply
waiting for a child terminal result
human approval
sleep/timer
remote job
```

The result arrives as an Event. The scheduler marks the operation resolved and wakes the Execution when appropriate.

---

## 8. Ownership tree and communication graph must be stored separately

The kernel should explicitly represent two relations.

### Ownership

Created by `SpawnExecution` / `call` semantics.

Used for:

```text
authority derivation
budget allocation
cancellation propagation
lifecycle supervision
trace hierarchy
resource accounting
```

Minimal representation:

```text
execution.owner_id
```

plus optional richer supervision metadata later.

### Communication

Communication authority is not inferred only from ownership.

A runtime should be able to authorize:

```text
A may message B
B may reply to A
C may query a class/group of Paper Agents
```

without implying:

```text
A owns B
A may cancel B
A may inspect B memory
```

An `ExecutionHandle` is a useful capability-style representation:

```ts
interface ExecutionHandle {
  executionId: ExecutionId
  operations: ("send" | "ask")[]
  protocol?: SchemaRef
}
```

The exact authorization representation may use handles, ACLs, capability tokens, route policies, or a combination. The semantic invariant is what matters.

### `send`, `ask`, `spawn`, `call`

High-level APIs may provide:

```text
spawn(definition) → handle
send(handle, message)
ask(handle, message, timeout)
call(definition, input) → terminal result
```

But kernel semantics can reduce these to:

```text
ask  = send + correlation + pending reply + timeout
call = spawn + pending child terminal result
```

This avoids inventing separate distributed-agent machinery.

---

## 9. Authority: expand it beyond tools

The Authority Envelope is an immutable per-Execution set of maximum permissions.

It should cover at least:

```text
capability/tool use
knowledge access
memory read/write
which definitions may be spawned
which Executions/classes/groups may be messaged
consequential external actions
possibly model/provider restrictions
```

For an owned child:

```text
child authority
=
owner authority
∩ child requested authority
∩ application/runtime policy
```

and therefore:

```text
child authority ⊆ owner authority
```

### Do not mutate authority for discovery

Keep the existing Active Capability View concept:

```text
Active Capability View ⊆ Authority Envelope
```

If a capability is authorized but currently hidden, the discovery/context layer may expose it.

If it is outside the Authority Envelope, the current Execution cannot self-grant it. A higher-authority workflow/application/user may choose a new execution/delegation path.

### Capability discovery

Discovery is therefore an implementation over the authorized catalog, not a special lifecycle signal.

Possible selectors:

```text
static view
profile
metadata/keyword search
embedding retrieval
hybrid retrieval
model-assisted fallback
```

---

## 10. `CapabilityGateway` remains a central kernel boundary

The existing gateway idea should be generalized, not discarded.

Every capability request should pass a narrow mechanical path:

```text
UseCapability Effect
        ↓
CapabilityGateway
        ├── capability exists?
        ├── authorized by Envelope?
        ├── arguments valid?
        ├── confirmation required?
        ├── limits/budget valid?
        ├── idempotency/checkpoint valid?
        └── dispatch
              ↓
        implementation adapter
              ↓
        authoritative result/failure
              ↓
             Event
```

The controller may propose. The gateway authorizes. The executor/environment establishes what actually happened.

The same principle applies to `SpawnExecution`, `SendMessage`, and `WriteMemory`: they need equivalent kernel validation even if they are not literally routed through the same class.

---

## 11. Memory implementation: bindings, stores, provenance

The previous broad `MemoryPolicy` concept should become explicit **Memory Bindings**.

A binding attaches a named memory resource/view to an Execution.

Conceptually:

```ts
interface MemoryBindingDefinition {
  name: string
  kind: "structured" | "notes" | "artifact"
  schema?: Schema
  lifetime: "activation" | "execution" | "session" | "persistent"
  visibility: "private" | "shared"
  access: ("read" | "write" | "append")[]
  commitPolicy?: MemoryCommitPolicy
}
```

Implementations may map bindings onto different stores.

### Structured memory

Needs:

```text
schema validation
provenance
correction history where applicable
authoritative vs advisory semantics
runtime-controlled commit
```

### Working notes

May use simpler append/replace semantics, but should remain inspectable and distinct from hidden chain-of-thought.

### Artifacts

Use file/object/workspace storage contracts. They are memory resources, not Workflow stages or alternate controllers.

### Shared memory

Two Executions share memory only when the same authorized resource is explicitly bound to both.

Messaging never implicitly shares memory.

---

## 12. Control state should have a separate store/schema path

Runtime/controller state should not be mixed into semantic memory merely because both need persistence.

Examples of control state:

```text
Workflow current stage
pending transition evaluation
Agent executor checkpoint
mailbox/event cursor
pending operation ids
correlation ids
retry counters
```

It may live in the same physical database, but should have separate semantic contracts.

A useful persistence split is:

```text
ExecutionRecord / control snapshot
Event journal
Memory resources
Artifacts
Effect/idempotency checkpoints
```

---

## 13. ContextCompiler becomes activation-scoped

The ContextCompiler should compile a model-facing view for one Activation, not serialize an entire Execution.

Kernel-owned eligibility rules determine:

```text
which incoming Events may be shown
which conversation/history is visible
which memories are visible
which peer messages are visible
which capabilities are authorized
which Active View is allowed
provenance/visibility constraints
```

Replaceable implementations determine:

```text
ranking
retrieval
selection
compression
summarization
token counting
context packing
model used for summarization
```

Pipeline:

```text
authorized + eligible execution state
             ↓
selection / retrieval / compression
             ↓
activation model context
             ↓
model inference
```

A better selector may change what eligible information is shown. It must never make unauthorized information eligible.

---

## 14. Workflow implementation

A Workflow is a controller over shared Execution/Event/Effect infrastructure.

Conceptually:

```ts
interface WorkflowStageDefinition {
  id: StageId
  executor?: ExecutableDefinitionRef
  inputMapping?: MappingExpression
  requestedAuthority?: AuthorityRequest
  activeViewHint?: CapabilityViewHint
  transitions: TransitionDefinition[]
}
```

A Stage is **control state plus scheduling configuration**, not `Executable + its own harness`.

The Workflow runner should roughly:

```text
1. read current stage/control state
2. consume relevant Events
3. decide whether to start/resume stage work
4. spawn/call/invoke the configured executable as needed
5. observe its Events/terminal result
6. evaluate only predefined transitions
7. update Workflow control state
8. emit Effects or become WAITING/terminal
```

Transitions may be deterministic, LLM-evaluated, or hybrid. If a model chooses among predefined edges, the system still owns the topology.

A Workflow can remain in cycles indefinitely. The runner must not require an End stage or terminal result.

### Existing Phase / Flow

Useful pieces can migrate into Workflow implementation:

```text
condition DSL
transition tracing
stage objectives/configuration
capability narrowing hints
```

But `Phase` should not remain a second Agent-control abstraction.

---

## 15. Agent implementation

An Agent is another controller over the same Execution/Event/Effect substrate.

The Agent executor contract should receive an Activation-oriented runtime view, not own persistence/authority independently.

Conceptually:

```ts
interface AgentExecutor {
  activate(input: AgentActivationInput): Promise<AgentActivationOutput>
}
```

Where input contains normalized, authorized information such as:

```text
Agent definition/prompt
incoming Events/observations
compiled context
memory view
Active Capability View
budget/deadline slice
```

and output contains semantic proposals such as:

```text
EffectRequest[]
outbound model content/messages
memory proposals
optional focus/plan updates
optional terminal proposal
```

The Agent executor may internally perform multiple model inferences and tool-style iterations if its adapter architecture requires it, but all externally consequential operations still need to map back onto Arrokoth Effect semantics.

### Agent executor vs ModelProvider

Keep these separate:

```text
AgentExecutor
  owns iterative Agent mechanism / adaptation

ModelProvider
  owns one normalized model inference
```

A Strands adapter may implement the AgentExecutor while calling one or more ModelProviders.

### No mandatory `YIELD`

When the Activation has no more immediate work, the runtime moves the Execution to `WAITING`.

A model may propose terminal completion, but ordinary conversational responses do not terminate the Agent.

---

## 16. Leaf execution implementation

LLM and Function definitions are normally finite child Executions.

### LLM leaf

```text
start input / compiled prompt
        ↓
ModelProvider
        ↓
validated model result
        ↓
COMPLETED
```

### Function leaf

```text
start input
   ↓
function executor
   ↓
validated result
   ↓
COMPLETED
```

Leaf completion does not imply owner/composite completion.

Implementation may optimize away heavyweight persistence for trivial internal leaves when semantics/tracing allow it, but conceptual execution identity should remain reconstructable where needed for conformance and observation.

---

## 17. Messaging router and mailbox

Long-lived peer communication requires a runtime-owned router.

Responsibilities:

```text
validate target handle/route
validate sender communication authority
validate message schema/protocol when declared
persist message before/with delivery
assign correlation/causation ids
append MessageReceived Event to target mailbox
wake target Execution if needed
prevent duplicate delivery where required
trace sender → receiver edge
```

A mailbox may be physically implemented as an Event stream, queue table, actor mailbox, or durable broker abstraction.

The kernel contract should care about ordering/deduplication semantics, not the storage brand.

### Addressability does not require always-resident processes

A dormant Execution may be rehydrated on demand.

For example, millions of Paper-Agent identities can be represented durably while only queried Agents are activated in compute resources.

This is an implementation optimization behind the same addressable Execution semantics.

---

## 18. Lifecycle supervision, budgets, deadlines, and cancellation

Ownership should drive default supervision.

### Budgets

Track at least the dimensions applications actually care about:

```text
model calls
tokens/cost
capability calls
spawned Executions
parallel operations
wall-clock / deadline
```

Child allocations must fit within owner/application policy.

### Deadlines and operation timeouts

Distinguish:

```text
Execution deadline
pending operation timeout
```

A timed-out `ask` should deliver a timeout Event to the requester; it does not automatically kill the target.

### Cancellation

Owner/application cancellation may propagate through owned descendants according to supervision policy.

Communication permission alone never grants cancellation authority.

### Retry

Keep infrastructure retry policy separate from semantic retry chosen by an Agent/Workflow.

---

## 19. Durability and event truth

The durable runtime should journal enough to recover semantics, not merely logs for debugging.

At minimum preserve or reconstruct:

```text
Execution creation/ownership
lifecycle transitions
incoming Events
requested Effects
authorization decisions
external dispatch checkpoints
Effect results/failures
message deliveries
memory commits
pending operations/correlations
terminal outcomes
```

Consequential side effects require idempotency/checkpoint design:

```text
Effect proposed
   ↓
durable intent/checkpoint
   ↓
dispatch
   ↓
durable result
```

so restart/replay cannot silently send/pay/delete twice.

Event records are runtime truth about what Arrokoth observed and authorized; provider/model assertions are not authoritative merely because they were generated.

---

## 20. Public resource/API model

A future embedded or remote API should expose the same kernel resources rather than inventing Agent-only concepts.

Conceptually:

```text
Definitions
Executions
Events
Messages
Memory resources
Cancellation
```

Example convenience surface:

```ts
const agent = await arrokoth.definitions.createAgent({...})
const execution = await arrokoth.executions.spawn(agent, { start })

await execution.send(message)
for await (const event of execution.events()) { ... }
```

For finite tasks:

```ts
const result = await arrokoth.executions.call(workflow, { start })
```

The convenience methods map to `ExecutableDefinition` / `Execution` semantics.

---

## 21. Implementation ports

Semantic type and implementation backend remain independent axes.

```text
Kernel semantic                 Replaceable implementation
-----------------------------   -----------------------------------
Agent controller                Strands / reference / future adapter
LLM leaf inference              ModelProvider implementations
Workflow scheduling             native/durable workflow runner
Capability execution            native / MCP / HTTP / sandbox
Knowledge capability            LangChain / LlamaIndex / direct
Persistence                     memory / SQLite / Postgres
Message/event storage           DB / broker-backed implementation
Artifacts                       local/object/workspace storage
Observability                   OTel / Langfuse / other exporter
```

### Knowledge boundary

Arrokoth owns:

```text
authorization
query/result contract
provenance
visibility
trace semantics
context eligibility
```

A retrieval implementation may own:

```text
chunking
embeddings
lexical/vector/hybrid search
query rewrite
fusion
reranking
context packing helpers
```

### Skills

A Skill remains packaging:

```text
Skill
├── prompt/instructions/resources
├── scripts/assets
├── root ExecutableDefinition
└── recommended profile/requested authority
```

It is not a third controller/runtime.

---

## 22. Mapping from the current codebase

The current repository already contains valuable implementation that should be preserved where semantics match.

```text
Current concept                  Target role
------------------------------   --------------------------------------------------
AgentRuntime                     evolve into shared ExecutionRuntime/session facade
AgentHarness                     split shared runtime mechanics from Agent controller
AgentLoopEngine                  AgentExecutor implementation contract
StrandsLoopEngine                primary AgentExecutor adapter
ReferenceLoopEngine              deterministic/reference AgentExecutor
ModelProvider                    preserve single-inference provider boundary
CapabilityGateway                preserve/generalize capability authorization path
KnowledgeRetriever               knowledge-capability implementation contract
Structured Memory               preserve behind explicit MemoryBindings
Working Notes                    preserve as notes memory
ContextCompiler                  activation-scoped context compiler
Flow / Phase                     migrate useful pieces into Workflow controller
WorkflowCoordinator              compatibility behavior, not final Workflow semantics
Session journal                  evolve into durable Execution/Event semantics
confirmation/idempotency         preserve and integrate with Effect handling
```

New target concepts that need explicit implementation homes include:

```text
ExecutableDefinition discriminated union
ExecutionRecord
Lifecycle scheduler / Activation
Event envelope + mailbox
EffectRequest union
PendingOperation
ExecutionHandle / messaging router
ownership vs communication authorization
Workflow controller
memory binding abstraction
execution-tree + communication tracing
```

### Semantic Preflight

Preflight must become explicit:

- remove it from a pure Agent path when it is only historical scaffolding; or
- represent it as an explicit compatibility Workflow/controller layer when the decomposition is intentionally desired.

It must not silently redefine what an Agent means.

---

## 23. Migration order

The safest implementation sequence is semantic before expansive.

```text
1. Introduce Definition/Execution vocabulary and lifecycle records
2. Normalize Agent execution around Events/Effects without changing behavior
3. Separate memory bindings and Active Capability View from legacy Phase semantics
4. Establish durable pending operations / waiting
5. Implement real Workflow controller
6. Implement recursive spawn/call semantics
7. Add addressable messaging + ExecutionHandle
8. Generalize tracing from tree-only to tree + communication edges
9. Scale capability discovery/context selection
10. Add more implementation adapters only where they prove a boundary or solve a need
```

Compatibility adapters are preferable to preserving two mental models inside core.

---

## 24. Conformance invariants

Tests and alternate implementations should verify kernel semantics rather than implementation-specific traces.

At minimum:

```text
Definition does not grant itself authority
Execution authority is immutable
owned child authority is narrowed
Active View never exceeds authority
unauthorized messaging is rejected
messaging does not share private memory/context
message permission does not imply cancellation permission
waiting Execution can resume from durable Events
ordinary reply does not complete long-lived Agent
leaf completion does not complete owner
capability failure returns an observation before terminal failure
consequential Effects are idempotent across restart
Workflow never follows an undefined semantic transition
Agent semantic next step is model-owned inside hard runtime limits
```

Executor conformance should eventually allow the same Agent definition and kernel policies to run through different AgentExecutor implementations without changing these rules.

---

## 25. Implementation summary

The implementation model can be explained in one diagram:

```text
ExecutableDefinition
        │ instantiate
        ▼
┌─────────────────────────────────────────┐
│ Execution                               │
│ identity / owner / lifecycle            │
│ mailbox / control state / memory        │
│ authority / active view / pending ops   │
└───────────────────┬─────────────────────┘
                    │ Activation consumes Events
                    ▼
              Controller
          ┌─────────┴─────────┐
          │                   │
      Workflow             Agent
   predefined topology   model topology
          │                   │
          └─────────┬─────────┘
                    │ EffectRequest(s)
                    ▼
          Runtime validation/gateway
                    │
        ┌───────────┼────────────┐
        ▼           ▼            ▼
   capability   new Execution   message/memory
        │           │            │
        └───────────┴────────────┘
                    │
                  Event
                    │
                    └──────────────→ Execution mailbox
```

That is the implementation substrate. Everything else should either be a controller policy, a bound resource, or a replaceable implementation behind it.
