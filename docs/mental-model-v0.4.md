# Mental Model v0.4: Executions, Events, Effects, Workflows, and Agents

> **Status: canonical v0.4 mental model.**
>
> This document is the primary conceptual explanation of the Arrokoth Agent Kernel. It describes the semantics we want the kernel to preserve; exact TypeScript APIs, class names, storage layouts, and executor implementations may evolve.

The model is intentionally small:

> **An `ExecutableDefinition` describes something Arrokoth can run. Instantiating it creates an addressable `Execution` with bounded authority, private state, a mailbox, and a lifecycle. Executions consume Events and request Effects through the runtime. They may use capabilities, create other Executions, communicate with authorized Executions, and update memory. An Execution may terminate, or it may remain alive indefinitely and wake whenever new Events arrive.**
>
> **Workflow and Agent use the same execution substrate. A Workflow has system-defined semantic control flow. An Agent has model-defined semantic control flow.**

A short way to explain the kernel is:

```text
Execution = long-lived event processor
Event     = something happened to the Execution
Effect    = something the Execution asks the runtime to do

Workflow  = the system chooses the semantic next step
Agent     = the model chooses the semantic next step
```

This keeps the core close to the spirit of Anthropic's distinction between workflows and agents while making recursive execution, durable waiting, peer-to-peer agent communication, memory, tools, and knowledge retrieval fit one model.

---

## 1. The main body of the model

The central runtime loop is:

```text
             Event
               │
               ▼
        ┌─────────────┐
        │  Execution  │
        └──────┬──────┘
               │
          EffectRequest
               │
               ▼
        ┌─────────────┐
        │   Runtime   │
        │ / Harness   │
        └──────┬──────┘
               │
       authorize / validate
       persist / dispatch
       observe / correlate
               │
               ▼
        environment,
        capability, or
        another Execution
               │
               ▼
             Event
```

The runtime owns mechanics and invariants. The Execution's controller owns the semantic work appropriate to its type.

This gives us one substrate for:

- one-shot LLM calls;
- functions and code;
- interactive agents;
- deterministic workflows;
- workflows containing agents;
- agents invoking workflows;
- subagents;
- peer-to-peer agent communication;
- long-lived monitoring processes;
- human-in-the-loop waiting;
- asynchronous tools and retrieval;
- durable resume after process restart.

---

## 2. `ExecutableDefinition` and `Execution` are different concepts

A definition describes **what can be run**.

An Execution records **one actual running instance**.

```text
ExecutableDefinition
        │
        │ instantiate
        ▼
     Execution
```

Definitions are reusable and versionable. Executions have runtime identity and state.

Conceptually:

```text
ExecutableDefinition
├── id / version
├── kind-specific specification
├── interface contract
├── requested authority
└── memory bindings

Execution
├── execution id
├── definition reference
├── owner / creator relation
├── lifecycle state
├── mailbox
├── control state
├── memory bindings
├── Authority Envelope
├── Active Capability View
├── pending operations
├── budget / deadline
└── trace / durable events
```

A definition may **request** authority. It never grants itself authority.

---

## 3. Executable kinds

The kernel has four primary semantic kinds:

```text
ExecutableDefinition
├── Leaf
│   ├── LLM
│   └── Function / Code
│
└── Composite
    ├── Workflow
    └── Agent
```

A Tool is not required to be a separate Executable kind. In the common case, tools, MCP servers, knowledge sources, browsers, external APIs, and sandboxes are **Capabilities** used by an Execution.

A piece of code can be exposed either way depending on the semantics we need:

```text
simple calculator function
→ Capability

separately managed computation with its own run identity,
authority, lifecycle, budget, trace, or messaging
→ Executable
```

The distinction is semantic, not based on implementation technology.

---

## 4. Definitions have kind-specific bodies, not one universal `instructions` field

LLMs, functions, agents, and workflows are different enough that the generic definition should not pretend they all have the same body.

Conceptually:

```ts
type ExecutableDefinition =
  | LLMDefinition
  | FunctionDefinition
  | AgentDefinition
  | WorkflowDefinition
```

A common envelope may contain identity, interface, authority request, and memory bindings, while the `spec` is kind-specific.

For example:

```text
LLM
└── prompt / model-call specification

Function
└── code / implementation reference

Agent
├── prompt
└── agent/model policy

Workflow
├── entry stage
└── stage / transition graph
```

Exact API shape is an implementation decision. The mental rule is:

> **Share execution semantics where they are genuinely shared; keep the executable body type-specific.**

---

## 5. An Execution is not necessarily `input → output`

A one-shot function often looks like:

```text
start input
    ↓
 function
    ↓
terminal result
```

But a conversational Agent may look like:

```text
message
  ↓
respond
  ↓
wait
  ↓
message
  ↓
respond
  ↓
wait
  ↓
...
```

and may live indefinitely.

Therefore an executable interface is better thought of as three possible contracts:

```text
start input      optional data used to create/start the Execution
inbox            Events/messages it may receive while alive
terminal result  optional result produced only if it terminates successfully
```

Conceptually:

```ts
interface ExecutionInterface {
  start?: Schema
  inbox?: Schema
  terminalResult?: Schema
}
```

Typical cases:

```text
Function
  start           required
  inbox           none
  terminalResult  required

LLM call
  start           required
  inbox           none
  terminalResult  required

Interactive Agent
  start           optional
  inbox           yes
  terminalResult  optional

Long-running Workflow
  start           optional
  inbox           yes
  terminalResult  optional
```

A response sent during execution is not automatically a terminal result.

```text
outbound response ≠ Execution completion
```

This distinction is essential for chat agents, monitors, services, and other long-lived processes.

---

## 6. Lifecycle: an Execution may live forever

Lifecycle state is runtime-owned operational state.

A useful conceptual state machine is:

```text
              ┌──────────────────┐
              │                  │
              ▼                  │
CREATED → READY → RUNNING → WAITING
                  │   ▲          │
                  │   └──────────┘
                  │
                  ├──→ COMPLETED
                  ├──→ FAILED
                  └──→ CANCELLED
```

Meanings:

- **CREATED** — execution identity exists but has not begun processing.
- **READY** — runnable work/events are available.
- **RUNNING** — its controller is actively processing.
- **WAITING** — no immediate runnable work; it can be awakened by future Events.
- **COMPLETED** — terminal successful state, optionally with a terminal result.
- **FAILED** — terminal unsuccessful state.
- **CANCELLED** — terminal state caused by cancellation.

`COMPLETED`, `FAILED`, and `CANCELLED` are terminal. An Execution is not required to reach any of them.

For an interactive chat Agent:

```text
WAITING
   ↓ user message
READY
   ↓ scheduler
RUNNING
   ↓ assistant message is sent
WAITING
   ↓ next user message
READY
   ↓
...
```

The Agent may remain in this logical loop for years.

### Activation

An **Activation** is one period in which a long-lived Execution is actively consuming compute.

```text
Execution lifetime
──────────────────────────────────────────────>

   [activation]      [activation]   [activation]
        │                 │              │
      waiting           waiting        waiting
```

This lets an Agent be logically long-lived without continuously spinning a CPU/model loop.

---

## 7. Events come in

An Execution reacts to Events.

Representative Event families include:

```text
Event
├── Start
├── MessageReceived
├── CapabilityResult
├── Timeout / Timer
├── PermissionDecision
├── FailureObservation
└── ControlEvent
```

The exact event catalog may grow, but the important rule is:

> **Something that happened outside the controller re-enters the Execution as an Event/Observation.**

Examples:

```text
tool succeeded           → CapabilityResult
knowledge query returned → CapabilityResult / KnowledgeObservation
peer Agent replied       → MessageReceived
user sent a message      → MessageReceived
approval was granted     → PermissionDecision
remote request timed out → Timeout
search API failed        → FailureObservation
```

A failed capability does not automatically mean the Execution failed. It is normally an observation the Agent or Workflow can react to.

---

## 8. Effects go out

An Execution does not directly make the world true by declaring that something happened. It requests Effects from the runtime.

A small conceptual Effect family is enough for most of the kernel:

```text
EffectRequest
├── UseCapability
├── SpawnExecution
├── SendMessage
└── WriteMemory
```

### `UseCapability`

Covers authorized interaction with external/runtime capabilities such as:

```text
MCP tool
native tool
knowledge retrieval / RAG
browser
search engine
filesystem
sandbox
HTTP / external API
```

Knowledge may keep specialized provenance and retrieval contracts, but it does not need a separate control-flow system.

### `SpawnExecution`

Creates another Execution from an `ExecutableDefinition`.

Examples:

```text
Workflow → Agent
Workflow → Workflow
Agent → Agent
Agent → Workflow
```

A spawned Execution receives its own identity, state, mailbox, authority, memory view, lifecycle, budget, and trace.

### `SendMessage`

Sends a message to an authorized address, especially another existing Execution.

Communication is not restricted to parent/child relationships.

### `WriteMemory`

Proposes a memory mutation. Runtime policy determines whether and how it is validated and committed.

### Waiting is not an Effect

There is no fundamental `WaitForExternalEvent` action.

If an Execution has no immediate runnable work, the runtime moves it to `WAITING` and records the conditions that may wake it, for example:

```text
new mailbox message
capability result
reply with correlation id 42
timer firing
approval event
```

Waiting is therefore a lifecycle condition, not a semantic action the LLM must explicitly emit.

---

## 9. Ownership and communication are two different graphs

This is a core invariant.

Suppose a Workflow creates three Agents:

```text
                    OWNERSHIP TREE

                     Workflow W
                    /     |     \
                   /      |      \
               Agent A Agent B Agent C
```

Ownership answers questions such as:

```text
Who created this Execution?
From whose authority was its authority derived?
Who allocated its budget?
Who may normally cancel it?
Where does its lifecycle/trace belong?
```

But communication may form a different graph:

```text
                 COMMUNICATION GRAPH

               Agent A ←────→ Agent B
                  ↑   \       /   ↑
                  │    \     /    │
                  │     \   /     │
                  └──── Agent C ───┘
```

Communication answers:

```text
Who may send messages to whom?
Who may ask whom a question?
Who may wait for whose reply?
Which group/channel may receive a message?
```

The two graphs must not be conflated.

Important consequences:

```text
can message X   ≠ can cancel X
can message X   ≠ can inspect X's memory
created X       ≠ must be the only entity allowed to talk to X
```

Ownership is primarily about lifecycle, authority derivation, accounting, and trace structure.

Communication is about authorized message routing.

---

## 10. Addressable Executions and communication

A running Execution can be represented by an opaque `ExecutionHandle`.

The handle is an address plus whatever operations the holder is authorized to perform. It does not imply unrestricted access to the target.

For example, a handle may allow:

```text
send message
ask question
```

without allowing:

```text
inspect private memory
cancel target
change target authority
```

Useful high-level communication operations are:

```text
spawn(definition) → create Execution and return a handle
send(handle, message) → fire-and-continue message
ask(handle, message, timeout) → request/reply
call(definition, input) → create a usually finite Execution and wait for terminal result
```

These need not all be separate kernel primitives.

Conceptually:

```text
ask = send
    + correlation id
    + wait for matching reply
    + timeout

call = spawn
     + wait for terminal result
```

The kernel should preserve the semantics even if the developer API provides convenient wrappers.

---

## 11. Communication does not share context

Two Agents talking to each other do not automatically share prompts, memory, context windows, plans, observations, or tool history.

```text
Agent A context ≠ Agent B context
```

Only the explicit message crosses the boundary.

This is important for independent reasoning, specialization, privacy, and context size.

If several Agents intentionally need shared state, that should be explicit:

```text
Agent A ─┐
Agent B ─┼── shared_board memory/resource
Agent C ─┘
```

Therefore:

> **Communication does not imply shared memory. Shared memory is an explicit bound resource.**

---

## 12. Authority and exposure are separate

The kernel should distinguish three layers:

```text
Capability Catalog
        ↓
Authority Envelope
        ↓
Active Capability View
```

### Capability Catalog

Everything known to the runtime/application: tools, knowledge sources, executable definitions, communication routes, memory resources, etc.

### Authority Envelope

The maximum authority granted to one Execution.

It is immutable for the lifetime of that Execution.

For spawned owned Executions:

```text
child authority ⊆ parent authority
```

Conceptually:

```text
child effective authority
=
parent authority
∩ child requested authority
∩ runtime/application policy
```

Authority may include rights such as:

```text
use these tools
query these knowledge sources
spawn these executable definitions
send messages to these Executions/classes/groups
read/write these memory spaces
perform these consequential actions
```

### Active Capability View

The smaller set of capabilities currently exposed to the controller/model.

```text
active view ⊆ authority envelope
```

This solves the large-catalog problem: an Agent may be authorized to interact with thousands or millions of resources without showing all of them to every model call.

Changing the Active View inside existing authority is context engineering, not privilege escalation.

### Missing capability cases

If capability `X` is authorized but not currently exposed:

```text
X ∈ Authority Envelope
X ∉ Active Capability View
```

then discovery/exposure may add it without changing authority.

If:

```text
X ∉ Authority Envelope
```

then the Execution cannot grant itself X. The request must be denied or handled through an explicit higher-authority path.

Do not silently mutate a running Execution's authority just because the model requests more power.

---

## 13. Memory: private by default, explicit when shared

Memory is state available across Activations. It is different from lifecycle/control state.

Useful memory forms are:

```text
Memory
├── Structured Memory
├── Working Notes
└── Artifact / File Memory
```

### Structured Memory

Schema-defined, inspectable state with provenance and validation.

Examples:

```text
customer name
budget
case status
completed task ids
open questions
```

The model may propose a write. Runtime validation decides whether the proposal becomes committed state.

### Working Notes

Free-form, non-authoritative, execution-owned memory for things such as:

```text
hypotheses
partial conclusions
rough plan
research notes
current focus
```

### Artifact / File Memory

Persistent files or workspace artifacts such as:

```text
plan.md
research.md
report draft
code workspace
```

These are memory/storage mechanisms, not alternate control-flow systems.

### Memory bindings

A definition can declare which memory spaces should be attached to its Executions.

A binding may conceptually specify:

```text
name
kind
schema if structured
lifetime
visibility
read/write permissions
commit/validation policy
```

Possible lifetimes include:

```text
activation-local
execution-local
session/workspace
persistent application memory
```

Possible visibility includes:

```text
private to one Execution
explicitly shared resource
```

`plan` and `focus` remain Agent-owned memory conventions, not universal runtime control states.

---

## 14. Control state is not memory

The kernel also needs internal control state.

Examples:

```text
Workflow current stage
pending operation ids
reply correlation ids
retry counters
lifecycle state
```

This is different from semantic memory such as:

```text
Agent's current research hypothesis
user profile data
working notes
```

A useful rule is:

> **Control state tells the runtime/controller where execution is. Memory tells the executable what it knows or wants to remember.**

---

## 15. Context is compiled per activation

An Agent does not need to expose its entire persistent Execution state to every model call.

For each activation/model inference, the runtime compiles an authorized context from eligible information:

```text
Agent prompt
+ incoming Event(s)
+ selected conversation/history
+ selected structured memory
+ selected working notes/artifacts
+ recent observations
+ relevant retrieved knowledge
+ Active Capability View
        ↓
compiled model context
```

The kernel owns visibility and authorization rules.

Ranking, selection, retrieval, compression, summarization, and token packing can be replaceable implementations.

The model's context is therefore a **view of the Execution**, not the Execution itself.

---

## 16. Workflow: the system owns semantic topology

A Workflow is a composite Executable whose allowed semantic control topology is defined by the system/application.

```text
Stage A
   │
   ├── condition X → Stage B
   └── condition Y → Stage C
```

A Stage is best thought of as:

> **A named Workflow control state that may run an Executable and defines system-owned transitions.**

Conceptually:

```text
WorkflowStage
├── id
├── stage-local configuration/input mapping
├── executor: ExecutableRef
└── transitions
```

The stage executor may be:

```text
LLM
Function
Agent
Workflow
```

Transitions may be:

```text
deterministic
LLM-evaluated
hybrid
```

An LLM selecting from predefined transitions does not turn the Workflow into an Agent. The system still owns the allowed topology.

A Workflow may contain loops and may be long-lived forever:

```text
monitor
   ↓ event
analyze
   ↓
notify
   ↓
monitor
   ↓
...
```

There is no requirement for an End stage. A Workflow terminates only when its controller reaches a terminal condition.

A useful summary is:

```text
Workflow: the system is the semantic transition function.
```

---

## 17. Agent: the model owns semantic topology

An Agent is a composite Executable where the model chooses the semantic next action inside runtime-enforced authority.

On an activation, the Agent conceptually receives:

```text
goal/prompt
incoming Events
memory/context
observations
Active Capability View
```

The model may decide to:

```text
respond to a user or peer
use a tool
retrieve knowledge
write memory
change focus
revise a plan
spawn another Agent
invoke a Workflow
message an existing Execution
continue reasoning
propose termination
```

There is no required predefined graph between those semantic steps.

The runtime still validates whether requested Effects are legal and authorized.

```text
model chooses/proposes
        ↓
runtime validates/authorizes
        ↓
executor/environment establishes truth
        ↓
Event/observation returns
        ↓
model chooses again
```

A useful summary is:

```text
Agent: the model is the semantic transition function.
```

---

## 18. Leaf completion is not composite completion

A long-lived Agent may use thousands of LLM calls.

Each LLM call is finite:

```text
prompt
  ↓
LLM inference
  ↓
LLM result
  ↓
LLM Execution COMPLETED
```

But the parent Agent remains alive:

```text
Agent
  ├── LLM #1 completed
  ├── tool result observed
  ├── LLM #2 completed
  ├── peer message observed
  ├── LLM #3 completed
  └── WAITING for future Events
```

Therefore:

> **Leaf completion does not imply composite completion.**

There is no need for intermediate LLM calls to emit a special `yield` signal. They simply finish their own one-shot work.

---

## 19. Completion: semantic proposal vs operational termination

For an Agent, the model may believe the task should terminate.

That is a semantic proposal, not unilateral authority over lifecycle.

```text
Agent proposes terminal result
        ↓
Harness checks hard requirements
        ├── acceptable → COMPLETED
        └── not acceptable → Event/steering → continue
```

A second evaluator model can be added when useful, but is optional policy rather than a fundamental part of every Agent turn.

Interactive Agents often never make this proposal at all.

A message such as an assistant reply is normally just an outbound message, not `COMPLETED`.

---

## 20. Failure, timeout, retry, and cancellation

These concepts should remain mechanically distinct.

### Capability failure

```text
tool/search/API fails
        ↓
FailureObservation Event
        ↓
Agent/Workflow may retry, adapt, or continue
```

This does not automatically set the whole Execution to `FAILED`.

### Execution failure

An Execution becomes `FAILED` only when it cannot validly continue or its controller/runtime declares terminal failure.

### Timeout

Timeout commonly belongs to a pending operation:

```text
Agent A asks Agent B
request timeout = 5s
        ↓
Timeout Event delivered to A
```

B may still be alive.

A whole Execution may also have a deadline.

### Retry ownership

```text
transport/infrastructure retry
≠ semantic retry
```

The runtime may retry transient transport failures according to policy.

An Agent deciding "that search was poor; search differently" is semantic behavior and belongs to the Agent.

### Cancellation

Cancellation authority normally follows ownership/lifecycle relationships, not communication permission.

```text
can message X ≠ can cancel X
```

Cancelling an owner may propagate to owned descendants according to policy.

---

## 21. Budgets and accounting follow ownership

Owned executions should receive bounded resources from their owner/application.

Examples:

```text
model-call limit
token/cost budget
capability-call limit
child-execution limit
wall-clock deadline
parallelism limit
```

Typical invariant:

```text
child allocation ≤ available owner allocation
```

This is separate from the communication graph. Messaging an Execution does not automatically make the sender responsible for the target's full lifetime cost.

---

## 22. Durability: Events are the recoverable truth of execution

A durable implementation should record enough information to reconstruct an Execution after process failure.

Important durable facts include:

```text
Execution creation / ownership
incoming Events
requested Effects
authorization decisions
effect dispatch / completion
message delivery
memory commits
lifecycle transitions
pending correlations / operations
terminal state/results
```

Conceptually:

```text
process crashes
   ↓
runtime restarts
   ↓
Execution reconstructed from durable state/events
   ↓
pending work resumes safely
```

Consequential external actions require idempotency/checkpoint semantics so replay/resume does not accidentally repeat real-world effects.

---

## 23. Concurrency: one logical controller writer by default

Messages and capability results may arrive concurrently, but a simple default is:

> **One Execution has one logical controller activation mutating its control/memory state at a time.**

For example:

```text
A ──→ C
B ──→ C
D ──→ C
```

C's mailbox can serialize or batch the Events:

```text
1. message from A
2. message from D
3. message from B
```

C may still launch multiple independent Effects in parallel.

This keeps memory/control-state races understandable while allowing asynchronous work.

More advanced concurrent-controller semantics can be introduced later if real applications justify them.

---

## 24. Example: ChatGPT-like long-lived Agent

A conversational Agent is created once:

```text
Execution C
```

The user sends:

```text
Message("hello")
```

C wakes:

```text
WAITING
  ↓ MessageReceived
READY
  ↓
RUNNING
  ↓ model inference
SendMessage("Hello! ...")
  ↓
WAITING
```

Later:

```text
Message("continue our discussion")
```

C wakes again using its own memory/context rules.

The assistant reply was not a terminal result. The Execution can continue indefinitely.

This is not an edge case; it is the natural model for interactive Agents.

---

## 25. Example: an Agents meeting

A Workflow wants three independent Agents to discuss a problem without sharing full context.

It creates:

```text
Meeting Workflow W
├── Agent A
├── Agent B
└── Agent C
```

Each Agent has private memory/context:

```text
Context A ≠ Context B ≠ Context C
```

W grants authorized handles so they can communicate:

```text
A ↔ B
A ↔ C
B ↔ C
```

A might send:

```text
"I think hypothesis X is strongest. What evidence contradicts it?"
```

B receives only that message plus B's own context. B reasons independently and replies.

C may challenge both.

The Workflow may define a meeting rule such as:

```text
start meeting
   ↓
allow discussion for N minutes / until quorum
   ↓
collect summaries
   ↓
move to synthesis stage
```

The system owns the meeting's macro-process; the Agents own their local reasoning.

No shared context window or special multi-agent framework is required.

---

## 26. Example: arXiv papers as Agents

Imagine many addressable Paper Agents:

```text
paper-001
paper-002
paper-003
...
paper-N
```

Each Paper Agent owns private state derived from one paper:

```text
paper content
metadata
citations
derived notes
paper-specific interpretation
```

A Search Agent does not load all paper contexts.

Instead it uses a discovery capability:

```text
find relevant paper agents("mechanistic interpretability")
        ↓
[paper-17, paper-91, paper-203]
```

Then it can asynchronously ask:

```text
paper-17  → "What evidence does this paper provide for X?"
paper-91  → "How does this paper define Y?"
paper-203 → "Does this support or contradict paper-17?"
```

Each Paper Agent wakes independently, reasons using its private context, and replies.

The Search Agent observes the replies and synthesizes them.

Semantically these Paper Agents are long-lived addressable Executions. An implementation is free to cold-store them, lazily materialize them, or otherwise optimize resource usage as long as the observable semantics remain the same.

This architecture gives us:

```text
large distributed knowledge
without one giant shared context
```

---

## 27. Example: a complete research Workflow

Suppose a user starts a research Workflow W.

```text
User
 │ StartEvent
 ▼
Research Workflow W
```

W spawns:

```text
W
├── Search Agent S
└── Critic Agent C
```

Ownership:

```text
W owns S
W owns C
```

Communication permission:

```text
S ↔ C
```

S searches knowledge sources and discovers relevant Paper Agents.

```text
S → UseCapability(search)
S ← CapabilityResult

S → UseCapability(find paper agents)
S ← [P17, P91, P203]
```

S sends questions in parallel:

```text
S → P17
S → P91
S → P203
```

The Paper Agents reply independently.

S then asks C to critique its emerging conclusion:

```text
S → C: "Attack this conclusion and identify missing evidence."
```

C replies. S revises its synthesis.

S sends W a stage-level result/message. The Workflow's predefined transition moves from research to synthesis.

W may later terminate with a report, or it may enter a monitoring stage and remain alive indefinitely for future paper updates.

Everything here uses the same kernel concepts:

```text
Executions
Events
Effects
Messages
Authority
Memory
Lifecycle
```

---

## 28. Skills, profiles, and implementations are side branches, not new control systems

Several useful concepts can attach to this model without becoming new orchestration primitives.

### Capability Profile

A reusable grouping that helps construct an Active Capability View.

```text
Biomedical Research
├── PubMed
├── ClinicalTrials
├── paper fetch
└── biomedical Paper-Agent directory
```

A profile does not grant authority.

### Skill

A reusable package that may contain:

```text
instructions/prompts
resources
scripts/assets
root ExecutableDefinition
recommended capability profile
requested authority
```

A Skill is not a third controller beside Agent and Workflow.

### Implementation backend

Kernel semantics are separate from how they are implemented.

```text
Agent semantics       → Strands / reference / future executor
LLM inference         → Gemini / OpenAI-compatible / local model
Knowledge retrieval   → LangChain / LlamaIndex / direct/custom
Tool transport        → native / MCP / HTTP
Persistence           → memory / SQLite / Postgres
Sandbox               → local / Docker / remote provider
```

Changing an implementation should not silently redefine Execution, authority, messaging, memory, lifecycle, Workflow, or Agent semantics.

---

## 29. What the Harness / Runtime owns

The shared runtime exists around every Execution.

Its responsibilities include:

```text
instantiate Executions
assign identity / ownership
compute Authority Envelopes
enforce capability and communication permissions
maintain Active Capability Views
compile model context
route Events and messages
dispatch Effects
correlate requests/replies
persist state/events/checkpoints
commit validated memory writes
enforce budgets / deadlines
propagate cancellation
handle lifecycle transitions
provide idempotency for consequential actions
trace execution and communication
resume durable Executions
```

The runtime should not take semantic control away from the controller that owns it.

For a Workflow, semantic topology belongs to the Workflow definition/controller.

For an Agent, semantic next-step selection belongs to the model/Agent controller.

---

## 30. The kernel invariants

The mental model should make a small set of rules mechanically understandable.

### Authority

```text
an Execution cannot grant itself authority
owned child authority ⊆ owner authority
Active Capability View ⊆ Authority Envelope
```

### Communication

```text
communication requires explicit authority
communication does not imply shared context
communication does not imply lifecycle control
```

### Truth

```text
models propose
runtime authorizes
executors/environment establish what actually happened
observations return as Events
```

### Lifecycle

```text
waiting is not completion
outbound response is not terminal result
leaf completion is not composite completion
an Execution may remain alive indefinitely
```

### Control ownership

```text
Workflow → system owns semantic topology
Agent    → model owns semantic topology
```

### Memory

```text
memory is explicit and provenance-aware
shared memory is explicit
plan/focus are memory conventions, not universal control flow
```

### Durability

```text
important state transitions and consequential Effects must be recoverable/idempotent
```

---

## 31. Vocabulary cheat sheet

| Term | Meaning |
| --- | --- |
| **ExecutableDefinition** | Reusable definition of something Arrokoth can run. |
| **Execution** | One addressable, stateful runtime instance of a definition. May be finite or long-lived. |
| **Event** | Something that happened and is delivered into an Execution. |
| **EffectRequest** | Something an Execution asks the runtime/environment to do. |
| **Activation** | One period where a long-lived Execution is actively consuming compute. |
| **Mailbox** | Durable/logical queue of Events/messages waiting for an Execution. |
| **ExecutionHandle** | Authorized address/reference to an existing Execution. |
| **Owner** | Execution/application relation used for authority derivation, lifecycle, budget, and tracing. |
| **Communication graph** | Independent graph describing which Executions may communicate. |
| **Authority Envelope** | Immutable maximum authority of one Execution. |
| **Active Capability View** | Dynamic subset of authorized capabilities currently exposed to the controller/model. |
| **Capability** | Authorized tool, knowledge source, external system, resource, or other usable runtime facility. |
| **Memory** | Persistent semantic/application state available across Activations. |
| **Control state** | Runtime/controller state such as Workflow stage or pending correlation ids. |
| **Workflow** | Composite Execution where the system defines semantic topology. |
| **Agent** | Composite Execution where the model chooses semantic topology. |
| **Terminal result** | Optional final value produced only if an Execution successfully terminates. |

---

## 32. The one-minute explanation

If explaining Arrokoth to someone new, start here:

> **Arrokoth treats an Agent or Workflow as a potentially long-lived Execution, more like an actor/process than a normal function. Every Execution has private state, a mailbox, bounded authority, and an address. Events come in; Effects go out through a runtime that validates permissions and records what actually happened. Executions can use tools and knowledge, spawn other Executions, send messages to other authorized Executions, and write memory. They can finish, but they can also wait and wake forever.**
>
> **Workflow and Agent are not different runtimes. They use the same substrate. The difference is who chooses the semantic next step: in a Workflow the application defines the topology; in an Agent the model generates it dynamically. Ownership and communication are separate, so a Workflow can create several private-context Agents and let them talk to one another without sharing all of their context.**

Or in one line:

> **Executions receive Events and request Effects; Workflows let the system choose what happens next, Agents let the model choose.**

That is the mental kernel all other Arrokoth features should build on.
