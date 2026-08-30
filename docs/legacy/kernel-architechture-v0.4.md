# Agent Kernel Architecture v0.4

> **Status:** working architecture / mental model.  
> v0.4 intentionally favors a small set of composable mechanisms over a large framework surface. Details that are not yet justified by implementation experience remain open.

## Abstract

Agent systems often mix model calls, program logic, tool use, orchestration, persistence, and runtime control into one abstraction. This makes simple programs unnecessarily heavy and makes larger systems difficult to reason about.

v0.4 separates **lightweight computation** from **kernel-managed execution**. A function call or a single LLM call is normally just a local computation. **Agent** and **Workflow** are the two independently managed executable kinds. They become **Executions** only when the runtime needs identity, lifecycle, waiting, authority, durability, communication, or composition.

A single logical **Harness** manages many Executions. Workflows compose lightweight Stage Blocks and Adapter Blocks; Agents use model-directed loops inside runtime boundaries. Executions request external actions through Effects and receive completed results through Events.

The goal is progressive complexity: keep one-shot programs simple, but provide a common runtime when work becomes long-lived, compositional, or operationally consequential.

---

## 1. Introduction

### 1.1 Why an Agent Kernel?

A useful LLM application can be as small as:

```text
prompt → LLM → output
```

or:

```text
input → function → output
```

These cases do not need a lifecycle manager, mailbox, scheduler, or persistence layer.

Complex applications are different. They may need to:

- wait for tools, users, or other Agents;
- survive process restarts;
- maintain memory;
- enforce authority and budgets;
- compose deterministic program steps with open-ended Agent behavior;
- coordinate multiple long-lived units of work.

The kernel exists for this second class of problem.

The design principle is:

> **Do not turn every computation into an Execution. Introduce kernel machinery only when independent runtime management provides value.**

This keeps simple applications simple while allowing more complex systems to grow without changing their basic runtime model.

### 1.2 Put Complexity Where It Helps

More capable models can take on more planning and decision-making. More capable Harnesses can provide stronger guarantees around scheduling, authority, durability, and recovery.

Both have costs.

A larger Harness adds CPU, storage, latency, implementation complexity, and operational burden. A more autonomous Agent gives the model a larger decision space and may be harder to predict or reproduce.

v0.4 therefore uses a progressive ladder:

```text
Function / LLM call
        ↓
Workflow
        ↓
Agent
        ↓
network of Executions
```

Use the lowest level that expresses the application clearly.

### 1.3 Workflow and Agent Are Complementary

A **Workflow** has system-defined semantic topology.

The application defines the available stages and transitions. An LLM may still make decisions inside a stage or choose among predefined branches.

```text
User
 ↓
LLM
 ↓
need retrieval?
 ├── no  → answer
 └── yes → retrieve → LLM → answer
```

This is a Workflow because the possible paths are defined by the application.

An **Agent** has a more open-ended semantic control space.

```text
Event
 ↓
LLM decides next step
 ↓
retrieve / use tool / write memory / call child / ask user
 ↓
observe result
 ↓
LLM decides again
```

The Harness still imposes hard runtime boundaries, but the model chooses the semantic path.

This distinction follows a practical pattern seen in effective agent systems: deterministic orchestration and model-directed autonomy are useful for different parts of the same application. They should compose rather than compete.

### 1.4 From Chatbot to Program

An LLM application is increasingly a program in which model inference is only one kind of computation.

For example:

```text
User
 ↓
translate
 ↓
Agent
 ↓
translate
 ↓
User
```

or:

```text
User
 ↓
validate
 ↓
LLM
 ↓
route
 ├── function
 └── another LLM
```

The architecture therefore needs ordinary program blocks as well as Agents.

The kernel should not make these blocks expensive. It should only manage the Agent or Workflow that contains them.

---

## 2. The Kernel Model

### 2.1 Kernel Definition

The kernel defines the contract between **Execution** and **Harness**.

```text
                         AGENT KERNEL

                    one logical Harness
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Execution A  Execution B  Execution C
              │            │            │
              └──── EffectRequests ─────┘
                           │
                           ▼
                    authorize / dispatch
                    track / persist
                           │
                           ▼
                         Events
```

There are two kernel-managed executable kinds:

```text
ExecutableDefinition
├── AgentDefinition
└── WorkflowDefinition
        ↓
     Execution
```

A function call and a single LLM call are normally **not** Executions.

They are lightweight computations used inside a Workflow or Agent:

```text
Function Call
  input → code → output

LLM Call
  prompt/context → model → output
```

This is the central simplification of v0.4.

### 2.2 The Execution Boundary

Create a new Execution when work benefits from independent:

- identity or addressability;
- lifecycle and waiting;
- authority or budget;
- mailbox and Events;
- durability and recovery;
- cancellation;
- tracing;
- parent/child composition.

Otherwise keep the work inline.

```text
Workflow Execution
  ├── Function Stage       inline
  ├── LLM Stage            inline
  ├── Adapter              inline
  └── call Agent           child Execution
```

The rule is:

> **Composition does not imply an Execution boundary. `call` or `spawn` does.**

Blocks execute inside their parent Execution and use its runtime context. They do not receive separate Harnesses, mailboxes, or lifecycle records.

### 2.3 Execution and Harness

An Execution determines or follows **what work should happen**.

The Harness controls **how that work is carried out and recorded**.

```text
Execution
   │
   │ EffectRequest
   ▼
Harness
   │ authorize
   │ dispatch
   │ track
   │ persist
   ▼
environment
   │
   │ result
   ▼
Harness
   │
   │ Event
   ▼
Execution
```

For example:

```text
Agent decides: "search for this paper"
        ↓
UseCapability Effect
        ↓
Harness
  check authority
  dispatch search
  track pending work
        ↓
search result Event
        ↓
Agent continues
```

### 2.4 Replaceable Mechanisms

Implementation mechanisms remain outside the kernel when replacing them does not change the semantics above.

Examples include:

- model providers;
- Agent-loop frameworks;
- retrieval frameworks;
- MCP and other tool transports;
- databases;
- message brokers;
- sandbox implementations;
- observability backends;
- physical worker and queue implementations.

For example:

```text
Agent Execution
      ↓
Agent Executor
      ↓
Strands / another implementation
```

or:

```text
UseCapability Effect
      ↓
Harness
      ↓
MCP / HTTP / local implementation
```

> **The kernel defines what must remain true. Replaceable implementations decide how to make it true.**

---

## 3. ExecutableDefinition

### 3.1 Specification for Creating Executions

An `ExecutableDefinition` is a reusable specification from which the Harness can create Executions.

```text
ExecutableDefinition
        │
        │ create
        ▼
     Execution
```

For example:

```text
ResearchAgentDefinition
        ↓
ResearchAgent Execution A

ResearchAgentDefinition
        ↓
ResearchAgent Execution B
```

The Executions share a Definition but have different identities, inputs, bindings, authority, and runtime histories.

### 3.2 AgentDefinition and WorkflowDefinition

v0.4 has two Definition kinds.

```text
AgentDefinition
  instructions / prompt
  model configuration
  Agent executor configuration
  memory declarations
  requested authority and resources
  optional adapters

WorkflowDefinition
  Stage Blocks
  transitions
  Adapter attachments
  memory declarations
  requested authority and resources
```

A Definition describes reusable behavior. It does not contain live runtime data.

### 3.3 Creation Parameters and Runtime Policy

Creation combines three inputs:

```text
Definition
+ creation parameters
+ runtime policy
        ↓
resolved Execution
```

Conceptually:

```text
create(
  definition,
  parameters,
  policy
)
```

Parameters provide instance-specific starting information.

Runtime policy provides deployment-specific operational constraints such as:

- deadline;
- cost/token limits;
- maximum child Executions;
- parallelism;
- infrastructure retry limits;
- persistence requirements;
- confirmation requirements;
- allowed authority subset.

Semantic quality requirements should normally remain explicit program logic rather than generic Harness policy. For example, "the report must pass evaluation" is better represented as an evaluator stage in a Workflow.

Instantiation should be reproducible at the configuration level:

> **The same Definition, parameters, policy, and creation authority should resolve to the same initial Execution configuration. Execution outcomes may still differ.**

### 3.4 Required and Optional Authority

A Definition may request authority or resources, but cannot grant them to itself.

```text
ResearchAgentDefinition

required:
  read project papers

optional:
  web search
  spawn CriticAgent
```

Creation resolves these requests:

```text
Definition requirements
        ↓
Harness authorization
        ↓
required denied?
   ├── yes → creation fails
   └── no
        ↓
grant available optional authority
        ↓
create Execution
```

Optional denial therefore produces an Execution with reduced authority rather than a partially created Execution.

### 3.5 Definitions and Skills

`ExecutableDefinition` and Agent Skills are related but distinct.

```text
ExecutableDefinition
  something the kernel can instantiate

Skill
  reusable knowledge, instructions, resources, or behavior
  made available to an Agent
```

Their relationship remains an open research area. v0.4 keeps them separate until implementation experience justifies a stronger abstraction.

---

## 4. Execution, Blocks, and Composition

### 4.1 Execution Context

Each Execution has its own runtime context managed by the Harness.

```text
ExecutionContext
├── metadata
├── lifecycle
├── execution-local/control data
├── effective authority
├── bound resources
├── mailbox
├── memory bindings
├── pending-operation references
└── optional terminal result
```

Metadata identifies the Execution:

```text
id: exec-101
definition: ResearchAgent@0.4
created_at: 2026-08-29
parent: exec-100
```

Execution-local data is different. It changes as the controller progresses.

For example:

```text
Agent
  current working objective
  executor continuation data

Workflow
  current stage
  completed stages
  transition data
```

A lightweight block has no independent `ExecutionContext`.

### 4.2 Lifecycle and Activation

A general Execution lifecycle is:

```text
CREATED
   ↓
READY
   ↓
RUNNING
   ↓
   ├── WAITING
   ├── COMPLETED
   ├── FAILED
   └── CANCELLED
```

`RUNNING` is the state in which the controller actively consumes compute.

An **Activation** is one scheduled period of `RUNNING`.

```text
READY
 ↓
Activation
 ↓
RUNNING
 ↓
WAITING / COMPLETED / FAILED
```

When a relevant Event arrives for a waiting Execution, the Harness puts the Event in its mailbox, marks the Execution `READY`, and schedules another Activation.

Long-lived therefore means persistent identity and resumability, not continuous CPU use.

### 4.3 Input and Output Channels

An Execution interacts with its environment through four main channels.

```text
INPUT

Start Input
  supplied when the Execution is created

Events
  delivered after creation


OUTPUT

Effects
  requests for external/runtime actions

Terminal Result
  optional final value when the Execution completes
```

A Workflow or Agent may use all four.

Blocks inside the Execution consume and produce local values, but do not need separate kernel channels.

### 4.4 Workflow Stage Blocks

A Workflow is a system-defined graph of **Stage Blocks** and transitions.

```text
Stage A
   ↓
Stage B
   ↓
Stage C
```

v0.4 uses four Stage types:

```text
Stage Block
├── Function Stage
├── LLM Stage
├── Agent Stage
└── Workflow Stage
```

#### Function Stage

A Function Stage executes program code once.

```text
input
  ↓
function
  ↓
output
```

Its code may programmatically use the enclosing Workflow Execution's runtime interface:

```text
read / write memory
retrieve knowledge
use capability
call or spawn Agent
call or spawn Workflow
```

These external actions still become Effects of the **Workflow Execution**.

```text
Workflow Execution
      ↓
Function Stage
      ↓ program requests
UseCapability Effect
      ↓
Harness
```

Complex deterministic programming should generally be packaged inside Function Stages instead of making the Workflow graph unnecessarily detailed. A Workflow may contain no LLM at all; in that case it is simply an explicit control-flow/dataflow program built from functions and transitions.

#### LLM Stage

An LLM Stage performs one inference.

```text
input/context
      ↓
     LLM
      ↓
    output
```

It does not autonomously call tools, retrieve knowledge, spawn children, write memory, or run its own Agent loop.

This keeps its semantics obvious.

#### Agent Stage

An Agent Stage calls an `AgentDefinition` and receives the child Agent Execution's terminal result.

```text
Workflow
   ↓
Agent Stage
   ↓ call
Agent Execution
   ↓ result
Workflow continues
```

The Agent itself may perform open-ended multi-step work.

#### Workflow Stage

A Workflow Stage similarly calls another `WorkflowDefinition`.

This supports reusable hierarchical composition without flattening every Workflow into one graph.

#### Roles Are Not Block Types

Terms such as:

```text
gate
router
aggregator
evaluator
classifier
guard
```

describe a role, not necessarily a kernel primitive.

A router may be implemented by a Function Stage or LLM Stage. An evaluator may also be either.

This keeps the Workflow vocabulary small.

### 4.5 Workflow vs Agent: Retrieval Example

A fixed retrieval pipeline is a Workflow:

```text
User
 ↓
LLM Stage
 ↓
Retrieval Function Stage
 ↓
LLM Stage
 ↓
User
```

A predefined conditional retrieval path is still a Workflow:

```text
               ┌── no retrieval ─────→ answer
User → LLM → route
               └── retrieve → LLM ───→ answer
```

Even if the LLM decides which branch to take, the application defines the possible topology.

If the model can decide whether, when, and how many times to retrieve while continuing its own loop, that is an Agent.

```text
model
  ↓
"retrieve"
  ↓
result
  ↓
model
  ↓
"retrieve again"
  ↓
...
```

This distinction is about **who owns the semantic topology**, not whether an LLM makes any decisions.

### 4.6 Adapter Blocks

An **Adapter Block** is a lightweight computation attached to a boundary rather than placed in Workflow control topology.

```text
Stage A
  ↓
[Output Adapter]
  ↓
Stage B
```

or:

```text
[Input Adapter]
      ↓
   Agent Stage
      ↓
[Output Adapter]
```

Stage and Adapter therefore differ by architectural position:

```text
Stage
  participates in control flow

Adapter
  participates in a boundary
```

#### Adapter Implementations

v0.4 supports:

```text
Adapter
├── Function Adapter
└── LLM Adapter
```

A Function Adapter is one local function call.

An LLM Adapter is one LLM inference.

Adapters may:

```text
pass(value)
transform(value)
reject(reason)
```

They do not choose an arbitrary next Workflow stage. If an Adapter rejects a value, the enclosing Agent or Workflow decides how that rejection affects control flow.

#### v0.4 Attachment Points

v0.4 focuses on:

```text
Input Adapter
Output Adapter
```

Adapters may be attached to Stage boundaries and to the model-call boundary inside an Agent loop.

For example, a safety adapter can wrap every internal model call without turning each call into a Workflow stage:

```text
Agent controller
      ↓
Input Adapter
      ↓
     LLM
      ↓
Output Adapter
      ↓
Agent controller
```

#### Adapter Authority

Adapters are deliberately restricted.

For v0.4 they may receive read-only access to an explicitly exposed subset of the enclosing Execution's memory.

```text
Adapter authority

memory read:
  allowed, exposed subset only

memory write:
  none

capability/tool use:
  none

spawn/call:
  none

message:
  none
```

Their scope cannot exceed the enclosing Stage or Execution.

> **Adapter scope ⊆ enclosing scope.**

If the behavior needs tool use, retrieval, spawning, messaging, or memory writes, it should normally become a Function Stage, Agent, or Workflow instead.

#### Structured Memory as Configuration

Adapters can use Structured Memory to make a fixed program adapt without rewriting topology.

```text
Structured Memory
  preferred_language = "ja"
```

Then:

```text
User
 ↓
Input Translation Adapter
 ↓
Agent
 ↓
Output Translation Adapter
   reads preferred_language
 ↓
Japanese output
```

The Agent may update `preferred_language`; the fixed Adapter then changes behavior.

> **Prefer model-driven changes to data over model-driven mutation of Workflow topology.**

Dynamic topology rewriting is outside v0.4.

### 4.7 Context, Memory, and Bound Resources

**Context** is the information available to the controller or model during the current computation.

It may be assembled from:

- Definition instructions;
- Start Input;
- current Events;
- selected history;
- memory;
- retrieved knowledge;
- exposed capabilities.

Context is temporary.

**Memory** is explicitly retained semantic information.

v0.4 distinguishes:

```text
Memory
├── Structured Memory
├── Memory Notes
└── Artifacts / Files
```

Structured Memory uses predefined fields.

Memory Notes are looser persistent notes.

Artifacts and files hold larger working material.

Execution history is not Memory:

```text
History
  Events
  Effects
  lifecycle transitions
  messages
  traces

Memory
  information intentionally retained for later use
```

A **bound resource** identifies a concrete resource available to an Execution:

```text
papers         → knowledge://project-papers
project_memory → memory://project-381
workspace      → workspace://task-91
```

Bindings say *which* resource is attached. Authority says *what may be done with it*.

### 4.8 Authority, Capabilities, and Effects

Authority defines what an Execution may request from the Harness.

```text
Capability Authority
  which capabilities may be invoked

Resource Authority
  which bound resources may be read or written

Spawn Authority
  which Agent/Workflow Definitions may be instantiated

Message Authority
  which peer Agent Executions may receive messages
```

Runtime policy separately constrains how much work may be done.

#### Capabilities

For v0.4, capabilities fall into two broad classes:

```text
Knowledge Retrieval
  acquires information for the controller/model

Tool Usage
  performs an operation through an external tool/service
```

Examples:

```text
Knowledge Retrieval
  web search
  database query
  file read
  vector retrieval

Tool Usage
  execute code
  send email
  modify file
  external action API
```

A retrieval capability may optionally operate on a bound resource.

```text
UseCapability(
  type = knowledge_retrieval,
  capability = knowledge_query,
  resource = papers,
  input = "agent memory"
)
```

A tool may not need a bound resource:

```text
UseCapability(
  type = tool,
  capability = send_email,
  input = ...
)
```

#### Effect Vocabulary

The initial Effect vocabulary is:

```text
EffectRequest
├── UseCapability
├── WriteMemory
├── SpawnExecution
├── SendMessage
└── RequestUserInput
```

An Agent may decide which Effects to request.

A Function Stage may request Effects programmatically.

An LLM Stage and Adapter do not request Effects.

Effects are requests, not claims that an action already happened:

```text
Execution
  ↓ EffectRequest
Harness
  ↓ authorize / dispatch / track
environment
  ↓ result
Harness
  ↓ Event
Execution
```

### 4.9 Call, Spawn, Communication, and Waiting

`SpawnExecution` creates a new Agent or Workflow Execution.

```text
Parent Execution
      ↓
SpawnExecution
      ↓
Child Execution
```

The child has its own ExecutionContext but is normally managed by the same logical Harness.

`call` is a higher-level pattern:

```text
call
=
spawn
+ wait for terminal result
```

A Workflow's Agent Stage or Workflow Stage normally uses `call`.

`spawn` is useful when the parent should continue independently.

#### Communication

A parent usually receives information from a child through a terminal-result Event.

Peer Agent communication uses messages:

```text
Agent A
  ↓ SendMessage
Harness
  ↓
Message Event
  ↓
Agent B mailbox
```

For v0.4, arbitrary peer messaging is primarily an Agent behavior rather than a normal Function Stage pattern.

#### Pending Operations

Some Effects do not finish during the current Activation.

```text
RUNNING
  ↓ request Effect
Harness dispatches
  ↓
Pending Operation
  ↓
WAITING
```

When the work completes:

```text
result
  ↓
Harness resolves operation
  ↓
Event → mailbox
  ↓
READY
```

v0.4 may expose a blocking/`await` style to controllers even though the Harness suspends and resumes the Execution internally.

### 4.10 User Input and Confirmation

Human interaction has two different meanings.

#### Semantic User Input

An Agent or Workflow can request free-form user input:

```text
RequestUserInput(
  prompt = "What should I change before sending?"
)
```

The Harness presents the request and waits.

The user's response becomes a `UserInput` Event.

```text
Execution
  ↓ RequestUserInput
WAITING
  ↓
user response
  ↓
UserInput Event
  ↓
READY
```

The Harness transports the response. The Agent or Workflow interprets its meaning.

#### Mechanical Effect Confirmation

A consequential Effect may require explicit Harness confirmation.

```text
SendEmail Effect
      ↓
Harness confirmation policy
      ↓
[Confirm] [Deny]
```

Confirmation should normally bind to the exact Effect payload.

If the payload changes, the previous confirmation is no longer sufficient.

This allows both policies:

```text
strict:
  modify → show again → confirm → send

conversational:
  user says "modify X, then send"
  → modify → send
```

The difference belongs to runtime policy, not to semantic interpretation inside the Harness.

### 4.11 Failure, Durability, and Provenance

Infrastructure failure and semantic failure are different.

The Harness may retry transient infrastructure errors. If the failure remains relevant to the controller, it becomes an Event.

```text
tool failure
  ↓
Failure Event
  ↓
Agent / Workflow decides what to do
```

Long-lived Executions may require durable records for:

- ExecutionContext;
- mailbox;
- Effects;
- pending operations;
- child relationships;
- memory commits;
- terminal result.

Consequential Effects may require idempotency so restart does not repeat an action that already happened.

Provenance should primarily connect Events and Memory to their sources.

For example:

```text
Event:
  paper retrieval result

capability class:
  knowledge_retrieval

capability:
  knowledge_query

bound resource:
  project-papers

caused by:
  EffectRequest #381
```

A Memory entry can then point back to that Event:

```text
Memory:
  "Paper X was published in 2025"

written by:
  exec-101

source Event:
  event-912
```

### 4.12 Execution in One Picture

```text
                     one logical Harness
                            │
                            │ manages
                            ▼
┌─────────────────────────────────────────────────────┐
│                  ExecutionContext                   │
│                                                     │
│ metadata / lifecycle / authority / bindings         │
│ local-control data / mailbox / memory               │
│                                                     │
│                Agent or Workflow                    │
│                                                     │
│ Workflow may contain inline:                        │
│   Function Stage                                    │
│   LLM Stage                                         │
│   Adapters                                           │
│                                                     │
│ Agent may contain inline:                           │
│   model calls                                       │
│   Adapters around model boundaries                  │
│                                                     │
│                     │                               │
│                     │ Effects                       │
└─────────────────────┼───────────────────────────────┘
                      ▼
                   Harness
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
   capabilities   child Execs    messages/user
        │             │              │
        └─────────────┼──────────────┘
                      ▼
                    Events
                      │
                      ▼
                    mailbox
```

---

## 5. Harness

The **Harness** is the logical runtime that manages a set of Executions.

An Execution does not own a Harness. It owns an `ExecutionContext` managed by the Harness.

Blocks and Adapters do not own either.

```text
                 Harness
          ┌────────┼────────┐
          ▼        ▼        ▼
       exec-1   exec-2   exec-3
```

### 5.1 Execution Registry and Creation

The Harness creates and tracks Executions.

Creation resolves:

```text
Definition
parameters
creator authority
runtime policy
resource availability
        ↓
ExecutionContext
```

The Harness assigns identity, resolves authority and bindings, initializes runtime records, and registers the Execution.

Child creation follows the same mechanism.

No Harness merging is required.

### 5.2 Scheduler and Activation

The scheduler selects READY Executions and gives them compute.

```text
READY
  ↓
scheduler
  ↓
Activation
  ↓
RUNNING
```

A simple local implementation may use an in-process FIFO queue.

Larger deployments may consider priority, deadlines, fairness, parallelism, or worker placement.

These mechanisms change scheduling policy, not Execution semantics.

### 5.3 Effect Gateway

All externally meaningful actions pass through one controlled Harness boundary.

```text
EffectRequest
    ↓
validate
    ↓
resolve implementation
    ↓
dispatch
    ↓
track
```

The gateway performs mechanical checks such as:

- is the request authorized?
- does the resource or target exist?
- is the request structurally valid?
- is budget available?
- is confirmation required?

It should not decide whether an answer is correct or whether a research conclusion is good. Those are semantic decisions for Agent or Workflow logic.

### 5.4 Pending-Operation Manager

When dispatched work does not complete immediately, the Harness records a pending operation.

The record correlates:

```text
requesting Execution
EffectRequest
external operation
timeout/deadline
expected result
```

When the external result arrives, the Harness resolves the correlation and creates an Event for the correct mailbox.

This is what makes controller-facing `await` possible without keeping the Execution continuously RUNNING.

### 5.5 Event Router and Wake-up

The Harness normalizes incoming results into Events and routes them to mailboxes.

```text
source
  ↓
Event Router
  ↓
Event
  ↓
mailbox
```

If a waiting Execution now has work available:

```text
Event arrives
  ↓
mailbox
  ↓
WAITING → READY
  ↓
scheduler
  ↓
Activation
```

Wake-up is therefore a routing/scheduling behavior, not a storage behavior.

### 5.6 Runtime State Store and Recovery

The Runtime State Store persists runtime truth when durability is required.

It may persist:

```text
ExecutionContext
mailboxes
Effect records
pending operations
child relationships
terminal results
```

The physical implementation is replaceable.

The important questions are:

```text
what already happened?
what is still pending?
what may safely run again?
what must not run twice?
```

After restart, the Harness reconstructs Execution contexts and resumes them from recorded runtime truth.

For a simple local deployment, the same interface may be backed only by in-memory state.

### 5.7 Runtime Policy and Confirmation

Runtime policy constrains an Execution without redefining its semantics.

Examples:

- deadline;
- token/cost limits;
- maximum children;
- parallelism;
- retry limits;
- persistence requirements;
- authority narrowing;
- confirmation requirements.

Confirmation is a Harness gate around a particular Effect, ideally bound to the exact Effect payload.

Free-form user dialogue remains an Event flow interpreted by the Execution.

### 5.8 One Logical Harness, Many Physical Workers

v0.4 defines one **logical Harness** managing many Executions.

A deployment may still distribute those Executions:

```text
                logical Harness
                 /           \
                /             \
          worker A          worker B
          exec-1            exec-3
          exec-2            exec-4
```

The runtime may place a child locally or remotely without changing `call`, `spawn`, Event, or Effect semantics.

This avoids introducing Harness-to-Harness merging into the core model.

### 5.9 Keep the Harness Incremental

A Harness is more expensive than a simple Agent loop or function call.

Not every application should enable every mechanism.

Minimal use:

```text
create
  ↓
run
  ↓
result
```

Richer use may add:

```text
durability
waiting
mailboxes
human input
child Executions
Agent messaging
persistent memory
distributed workers
```

The goal is not a maximally capable Harness by default.

> **The goal is a set of narrow runtime mechanisms that can be enabled when the application actually needs them.**

---

## 6. Summary and Open Questions

v0.4 reduces the architecture to a small set of ideas:

```text
Lightweight computation
  Function Call
  LLM Call

Workflow composition
  Stage Blocks
    Function
    LLM
    Agent
    Workflow
  Adapters
    Function
    single LLM

Kernel-managed execution
  Agent Execution
  Workflow Execution

Runtime
  one logical Harness
  many ExecutionContexts

Interaction
  Effects out
  Events in
```

The main boundaries are:

> **Function and LLM calls are computations. Agent and Workflow are independently managed Executions.**

> **Stages participate in control topology. Adapters participate in boundaries.**

> **Workflow topology is system-defined. Agent topology is model-directed.**

> **Blocks run inside an Execution. `call` or `spawn` creates a new Execution.**

> **Effects request external actions. Events report what happened.**

> **The Harness provides runtime guarantees without owning semantic decision-making.**

Several areas remain intentionally open:

- Forking an existing Execution and deciding what should be inherited.
- Non-blocking Effect semantics beyond the v0.4 `await` model.
- Adapter attachment points beyond input/output and Agent model boundaries.
- Dynamic Workflow topology mutation.
- More general peer messaging from Function Stages.
- Distributed scheduling and remote execution.
- The long-term relationship between Skills and ExecutableDefinitions.
- Conformance tests and evaluation methods for the kernel contract.

These should be driven by implementation and experiments rather than added preemptively.

The practical test for future features remains simple:

> **Does this mechanism make a real application easier to express, operate, or reason about? If not, keep it outside the kernel.**

---

## Design Influences

- Anthropic, *Building effective agents* — simple composable workflows and the distinction between predefined workflows and model-directed agents:  
  https://www.anthropic.com/engineering/building-effective-agents

- Anthropic, *Effective harnesses for long-running agents* — persistence, context handoff, and runtime support for long-horizon work:  
  https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

- Anthropic, *Scaling Managed Agents: Decoupling the brain from the hands* — stable runtime interfaces and replaceable harness mechanisms:  
  https://www.anthropic.com/engineering/managed-agents
